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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1F1ZXVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvdGFza1F1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBb0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQWdDOUYsTUFBZSxTQUFVLFNBQVEsVUFBVTtJQUsxQztRQUNDLEtBQUssRUFBRSxDQUFBO1FBTEEsV0FBTSxHQUE2QixFQUFFLENBQUE7UUFFckMsT0FBRSxHQUFHLENBQUMsQ0FBQTtRQUliLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUtNLE9BQU8sQ0FBQyxJQUEwQjtRQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDZCxDQUFDO0lBRU0sS0FBSztRQUNYLE9BQU8sSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQTtZQUNWLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2IsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsZUFB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