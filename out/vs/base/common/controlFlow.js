/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from './errors.js';
/*
 * This file contains helper classes to manage control flow.
 */
/**
 * Prevents code from being re-entrant.
 */
export class ReentrancyBarrier {
    constructor() {
        this._isOccupied = false;
    }
    /**
     * Calls `runner` if the barrier is not occupied.
     * During the call, the barrier becomes occupied.
     */
    runExclusivelyOrSkip(runner) {
        if (this._isOccupied) {
            return;
        }
        this._isOccupied = true;
        try {
            runner();
        }
        finally {
            this._isOccupied = false;
        }
    }
    /**
     * Calls `runner`. If the barrier is occupied, throws an error.
     * During the call, the barrier becomes active.
     */
    runExclusivelyOrThrow(runner) {
        if (this._isOccupied) {
            throw new BugIndicatingError(`ReentrancyBarrier: reentrant call detected!`);
        }
        this._isOccupied = true;
        try {
            runner();
        }
        finally {
            this._isOccupied = false;
        }
    }
    /**
     * Indicates if some runner occupies this barrier.
     */
    get isOccupied() {
        return this._isOccupied;
    }
    makeExclusiveOrSkip(fn) {
        return ((...args) => {
            if (this._isOccupied) {
                return;
            }
            this._isOccupied = true;
            try {
                return fn(...args);
            }
            finally {
                this._isOccupied = false;
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbEZsb3cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jb250cm9sRmxvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFFaEQ7O0dBRUc7QUFFSDs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFBOUI7UUFDUyxnQkFBVyxHQUFHLEtBQUssQ0FBQTtJQXNENUIsQ0FBQztJQXBEQTs7O09BR0c7SUFDSSxvQkFBb0IsQ0FBQyxNQUFrQjtRQUM3QyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLElBQUksQ0FBQztZQUNKLE1BQU0sRUFBRSxDQUFBO1FBQ1QsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSSxxQkFBcUIsQ0FBQyxNQUFrQjtRQUM5QyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksa0JBQWtCLENBQUMsNkNBQTZDLENBQUMsQ0FBQTtRQUM1RSxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFDdkIsSUFBSSxDQUFDO1lBQ0osTUFBTSxFQUFFLENBQUE7UUFDVCxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRU0sbUJBQW1CLENBQTZCLEVBQWE7UUFDbkUsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtZQUMxQixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdEIsT0FBTTtZQUNQLENBQUM7WUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtZQUN2QixJQUFJLENBQUM7Z0JBQ0osT0FBTyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNuQixDQUFDO29CQUFTLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBUSxDQUFBO0lBQ1YsQ0FBQztDQUNEIn0=