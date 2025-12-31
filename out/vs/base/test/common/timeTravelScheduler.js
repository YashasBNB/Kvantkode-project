/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator, tieBreakComparators } from '../../common/arrays.js';
import { Emitter, Event } from '../../common/event.js';
import { Disposable } from '../../common/lifecycle.js';
import { setTimeout0, setTimeout0IsFaster } from '../../common/platform.js';
const scheduledTaskComparator = tieBreakComparators(compareBy((i) => i.time, numberComparator), compareBy((i) => i.id, numberComparator));
export class TimeTravelScheduler {
    constructor() {
        this.taskCounter = 0;
        this._now = 0;
        this.queue = new SimplePriorityQueue([], scheduledTaskComparator);
        this.taskScheduledEmitter = new Emitter();
        this.onTaskScheduled = this.taskScheduledEmitter.event;
    }
    schedule(task) {
        if (task.time < this._now) {
            throw new Error(`Scheduled time (${task.time}) must be equal to or greater than the current time (${this._now}).`);
        }
        const extendedTask = { ...task, id: this.taskCounter++ };
        this.queue.add(extendedTask);
        this.taskScheduledEmitter.fire({ task });
        return { dispose: () => this.queue.remove(extendedTask) };
    }
    get now() {
        return this._now;
    }
    get hasScheduledTasks() {
        return this.queue.length > 0;
    }
    getScheduledTasks() {
        return this.queue.toSortedArray();
    }
    runNext() {
        const task = this.queue.removeMin();
        if (task) {
            this._now = task.time;
            task.run();
        }
        return task;
    }
    installGlobally() {
        return overwriteGlobals(this);
    }
}
export class AsyncSchedulerProcessor extends Disposable {
    get history() {
        return this._history;
    }
    constructor(scheduler, options) {
        super();
        this.scheduler = scheduler;
        this.isProcessing = false;
        this._history = new Array();
        this.queueEmptyEmitter = new Emitter();
        this.onTaskQueueEmpty = this.queueEmptyEmitter.event;
        this.maxTaskCount = options && options.maxTaskCount ? options.maxTaskCount : 100;
        this.useSetImmediate = options && options.useSetImmediate ? options.useSetImmediate : false;
        this._register(scheduler.onTaskScheduled(() => {
            if (this.isProcessing) {
                return;
            }
            else {
                this.isProcessing = true;
                this.schedule();
            }
        }));
    }
    schedule() {
        // This allows promises created by a previous task to settle and schedule tasks before the next task is run.
        // Tasks scheduled in those promises might have to run before the current next task.
        Promise.resolve().then(() => {
            if (this.useSetImmediate) {
                originalGlobalValues.setImmediate(() => this.process());
            }
            else if (setTimeout0IsFaster) {
                setTimeout0(() => this.process());
            }
            else {
                originalGlobalValues.setTimeout(() => this.process());
            }
        });
    }
    process() {
        const executedTask = this.scheduler.runNext();
        if (executedTask) {
            this._history.push(executedTask);
            if (this.history.length >= this.maxTaskCount && this.scheduler.hasScheduledTasks) {
                const lastTasks = this._history
                    .slice(Math.max(0, this.history.length - 10))
                    .map((h) => `${h.source.toString()}: ${h.source.stackTrace}`);
                const e = new Error(`Queue did not get empty after processing ${this.history.length} items. These are the last ${lastTasks.length} scheduled tasks:\n${lastTasks.join('\n\n\n')}`);
                this.lastError = e;
                throw e;
            }
        }
        if (this.scheduler.hasScheduledTasks) {
            this.schedule();
        }
        else {
            this.isProcessing = false;
            this.queueEmptyEmitter.fire();
        }
    }
    waitForEmptyQueue() {
        if (this.lastError) {
            const error = this.lastError;
            this.lastError = undefined;
            throw error;
        }
        if (!this.isProcessing) {
            return Promise.resolve();
        }
        else {
            return Event.toPromise(this.onTaskQueueEmpty).then(() => {
                if (this.lastError) {
                    throw this.lastError;
                }
            });
        }
    }
}
export async function runWithFakedTimers(options, fn) {
    const useFakeTimers = options.useFakeTimers === undefined ? true : options.useFakeTimers;
    if (!useFakeTimers) {
        return fn();
    }
    const scheduler = new TimeTravelScheduler();
    const schedulerProcessor = new AsyncSchedulerProcessor(scheduler, {
        useSetImmediate: options.useSetImmediate,
        maxTaskCount: options.maxTaskCount,
    });
    const globalInstallDisposable = scheduler.installGlobally();
    let result;
    try {
        result = await fn();
    }
    finally {
        globalInstallDisposable.dispose();
        try {
            // We process the remaining scheduled tasks.
            // The global override is no longer active, so during this, no more tasks will be scheduled.
            await schedulerProcessor.waitForEmptyQueue();
        }
        finally {
            schedulerProcessor.dispose();
        }
    }
    return result;
}
export const originalGlobalValues = {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setImmediate: globalThis.setImmediate?.bind(globalThis),
    clearImmediate: globalThis.clearImmediate?.bind(globalThis),
    requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
    cancelAnimationFrame: globalThis.cancelAnimationFrame?.bind(globalThis),
    Date: globalThis.Date,
};
function setTimeout(scheduler, handler, timeout = 0) {
    if (typeof handler === 'string') {
        throw new Error('String handler args should not be used and are not supported');
    }
    return scheduler.schedule({
        time: scheduler.now + timeout,
        run: () => {
            handler();
        },
        source: {
            toString() {
                return 'setTimeout';
            },
            stackTrace: new Error().stack,
        },
    });
}
function setInterval(scheduler, handler, interval) {
    if (typeof handler === 'string') {
        throw new Error('String handler args should not be used and are not supported');
    }
    const validatedHandler = handler;
    let iterCount = 0;
    const stackTrace = new Error().stack;
    let disposed = false;
    let lastDisposable;
    function schedule() {
        iterCount++;
        const curIter = iterCount;
        lastDisposable = scheduler.schedule({
            time: scheduler.now + interval,
            run() {
                if (!disposed) {
                    schedule();
                    validatedHandler();
                }
            },
            source: {
                toString() {
                    return `setInterval (iteration ${curIter})`;
                },
                stackTrace,
            },
        });
    }
    schedule();
    return {
        dispose: () => {
            if (disposed) {
                return;
            }
            disposed = true;
            lastDisposable.dispose();
        },
    };
}
function overwriteGlobals(scheduler) {
    globalThis.setTimeout = ((handler, timeout) => setTimeout(scheduler, handler, timeout));
    globalThis.clearTimeout = (timeoutId) => {
        if (typeof timeoutId === 'object' && timeoutId && 'dispose' in timeoutId) {
            timeoutId.dispose();
        }
        else {
            originalGlobalValues.clearTimeout(timeoutId);
        }
    };
    globalThis.setInterval = ((handler, timeout) => setInterval(scheduler, handler, timeout));
    globalThis.clearInterval = (timeoutId) => {
        if (typeof timeoutId === 'object' && timeoutId && 'dispose' in timeoutId) {
            timeoutId.dispose();
        }
        else {
            originalGlobalValues.clearInterval(timeoutId);
        }
    };
    globalThis.Date = createDateClass(scheduler);
    return {
        dispose: () => {
            Object.assign(globalThis, originalGlobalValues);
        },
    };
}
function createDateClass(scheduler) {
    const OriginalDate = originalGlobalValues.Date;
    function SchedulerDate(...args) {
        // the Date constructor called as a function, ref Ecma-262 Edition 5.1, section 15.9.2.
        // This remains so in the 10th edition of 2019 as well.
        if (!(this instanceof SchedulerDate)) {
            return new OriginalDate(scheduler.now).toString();
        }
        // if Date is called as a constructor with 'new' keyword
        if (args.length === 0) {
            return new OriginalDate(scheduler.now);
        }
        return new OriginalDate(...args);
    }
    for (const prop in OriginalDate) {
        if (OriginalDate.hasOwnProperty(prop)) {
            ;
            SchedulerDate[prop] = OriginalDate[prop];
        }
    }
    SchedulerDate.now = function now() {
        return scheduler.now;
    };
    SchedulerDate.toString = function toString() {
        return OriginalDate.toString();
    };
    SchedulerDate.prototype = OriginalDate.prototype;
    SchedulerDate.parse = OriginalDate.parse;
    SchedulerDate.UTC = OriginalDate.UTC;
    SchedulerDate.prototype.toUTCString = OriginalDate.prototype.toUTCString;
    return SchedulerDate;
}
class SimplePriorityQueue {
    constructor(items, compare) {
        this.compare = compare;
        this.isSorted = false;
        this.items = items;
    }
    get length() {
        return this.items.length;
    }
    add(value) {
        this.items.push(value);
        this.isSorted = false;
    }
    remove(value) {
        this.items.splice(this.items.indexOf(value), 1);
        this.isSorted = false;
    }
    removeMin() {
        this.ensureSorted();
        return this.items.shift();
    }
    getMin() {
        this.ensureSorted();
        return this.items[0];
    }
    toSortedArray() {
        this.ensureSorted();
        return [...this.items];
    }
    ensureSorted() {
        if (!this.isSorted) {
            this.items.sort(this.compare);
            this.isSorted = true;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZVRyYXZlbFNjaGVkdWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdGltZVRyYXZlbFNjaGVkdWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sMkJBQTJCLENBQUE7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBeUIzRSxNQUFNLHVCQUF1QixHQUFHLG1CQUFtQixDQUNsRCxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsRUFDMUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQ3hDLENBQUE7QUFFRCxNQUFNLE9BQU8sbUJBQW1CO0lBQWhDO1FBQ1MsZ0JBQVcsR0FBRyxDQUFDLENBQUE7UUFDZixTQUFJLEdBQWUsQ0FBQyxDQUFBO1FBQ1gsVUFBSyxHQUNyQixJQUFJLG1CQUFtQixDQUF3QixFQUFFLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUUzRCx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBMkIsQ0FBQTtRQUM5RCxvQkFBZSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7SUF1Q2xFLENBQUM7SUFyQ0EsUUFBUSxDQUFDLElBQW1CO1FBQzNCLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxJ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