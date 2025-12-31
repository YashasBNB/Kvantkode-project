/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
class TaskQueue extends Disposable {
    constructor() {
        super();
        this._tasks = [];
        this._i = 0;
        this._register(toDisposable(() => this.clear()));
    }
    enqueue(task) {
        this._tasks.push(task);
        this._start();
    }
    flush() {
        while (this._i < this._tasks.length) {
            if (!this._tasks[this._i]()) {
                this._i++;
            }
        }
        this.clear();
    }
    clear() {
        if (this._idleCallback) {
            this._cancelCallback(this._idleCallback);
            this._idleCallback = undefined;
        }
        this._i = 0;
        this._tasks.length = 0;
    }
    _start() {
        if (!this._idleCallback) {
            this._idleCallback = this._requestCallback(this._process.bind(this));
        }
    }
    _process(deadline) {
        this._idleCallback = undefined;
        let taskDuration = 0;
        let longestTask = 0;
        let lastDeadlineRemaining = deadline.timeRemaining();
        let deadlineRemaining = 0;
        while (this._i < this._tasks.length) {
            taskDuration = Date.now();
            if (!this._tasks[this._i]()) {
                this._i++;
            }
            // other than performance.now, Date.now might not be stable (changes on wall clock changes),
            // this is not an issue here as a clock change during a short running task is very unlikely
            // in case it still happened and leads to negative duration, simply assume 1 msec
            taskDuration = Math.max(1, Date.now() - taskDuration);
            longestTask = Math.max(taskDuration, longestTask);
            // Guess the following task will take a similar time to the longest task in this batch, allow
            // additional room to try avoid exceeding the deadline
            deadlineRemaining = deadline.timeRemaining();
            if (longestTask * 1.5 > deadlineRemaining) {
                // Warn when the time exceeding the deadline is over 20ms, if this happens in practice the
                // task should be split into sub-tasks to ensure the UI remains responsive.
                if (lastDeadlineRemaining - taskDuration < -20) {
                    console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(lastDeadlineRemaining - taskDuration))}ms`);
                }
                this._start();
                return;
            }
            lastDeadlineRemaining = deadlineRemaining;
        }
        this.clear();
    }
}
/**
 * A queue of that runs tasks over several tasks via setTimeout, trying to maintain above 60 frames
 * per second. The tasks will run in the order they are enqueued, but they will run some time later,
 * and care should be taken to ensure they're non-urgent and will not introduce race conditions.
 */
export class PriorityTaskQueue extends TaskQueue {
    _requestCallback(callback) {
        return getActiveWindow().setTimeout(() => callback(this._createDeadline(16)));
    }
    _cancelCallback(identifier) {
        getActiveWindow().clearTimeout(identifier);
    }
    _createDeadline(duration) {
        const end = Date.now() + duration;
        return {
            timeRemaining: () => Math.max(0, end - Date.now()),
        };
    }
}
class IdleTaskQueueInternal extends TaskQueue {
    _requestCallback(callback) {
        return getActiveWindow().requestIdleCallback(callback);
    }
    _cancelCallback(identifier) {
        getActiveWindow().cancelIdleCallback(identifier);
    }
}
/**
 * A queue of that runs tasks over several idle callbacks, trying to respect the idle callback's
 * deadline given by the environment. The tasks will run in the order they are enqueued, but they
 * will run some time later, and care should be taken to ensure they're non-urgent and will not
 * introduce race conditions.
 *
 * This reverts to a {@link PriorityTaskQueue} if the environment does not support idle callbacks.
 */
export const IdleTaskQueue = 'requestIdleCallback' in getActiveWindow() ? IdleTaskQueueInternal : PriorityTaskQueue;
/**
 * An object that tracks a single debounced task that will run on the next idle frame. When called
 * multiple times, only the last set task will run.
 */
export class DebouncedIdleTask {
    constructor() {
        this._queue = new IdleTaskQueue();
    }
    set(task) {
        this._queue.clear();
        this._queue.enqueue(task);
    }
    flush() {
        this._queue.flush();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1F1ZXVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L3Rhc2tRdWV1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQW9CLE1BQU0sbUNBQW1DLENBQUE7QUFnQzlGLE1BQWUsU0FBVSxTQUFRLFVBQVU7SUFLMUM7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUxBLFdBQU0sR0FBNkIsRUFBRSxDQUFBO1FBRXJDLE9BQUUsR0FBRyxDQUFDLENBQUE7UUFJYixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFLTSxPQUFPLENBQUMsSUFBMEI7UUFDeEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2QsQ0FBQztJQUVNLEtBQUs7UUFDWCxPQUFPLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsRUFBRSxFQUFFLENBQUE7WUFDVixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNiLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGVBQWUsQ0FB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