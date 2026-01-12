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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZVRyYXZlbFNjaGVkdWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi90aW1lVHJhdmVsU2NoZWR1bGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUF5QjNFLE1BQU0sdUJBQXVCLEdBQUcsbUJBQW1CLENBQ2xELFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUMxQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsQ0FDeEMsQ0FBQTtBQUVELE1BQU0sT0FBTyxtQkFBbUI7SUFBaEM7UUFDUyxnQkFBVyxHQUFHLENBQUMsQ0FBQTtRQUNmLFNBQUksR0FBZSxDQUFDLENBQUE7UUFDWCxVQUFLLEdBQ3JCLElBQUksbUJBQW1CLENBQXdCLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBRTNELHlCQUFvQixHQUFHLElBQUksT0FBTyxFQUEyQixDQUFBO1FBQzlELG9CQUFlLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtJQXVDbEUsQ0FBQztJQXJDQSxRQUFRLENBQUMsSUFBbUI7UUFDM0IsSUFBSSxJQUFJLENBQUMsSUFBSSxH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