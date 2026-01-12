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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbEZsb3cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NvbnRyb2xGbG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUVoRDs7R0FFRztBQUVIOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUE5QjtRQUNTLGdCQUFXLEdBQUcsS0FBSyxDQUFBO0lBc0Q1QixDQUFDO0lBcERBOzs7T0FHRztJQUNJLG9CQUFvQixDQUFDLE1BQWtCO1FBQzdDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFDdkIsSUFBSSxDQUFDO1lBQ0osTUFBTSxFQUFFLENBQUE7UUFDVCxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7T0FHRztJQUNJLHFCQUFxQixDQUFDLE1BQWtCO1FBQzlDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFBO1FBQzVFLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtRQUN2QixJQUFJLENBQUM7WUFDSixNQUFNLEVBQUUsQ0FBQTtRQUNULENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFTSxtQkFBbUIsQ0FBNkIsRUFBYTtRQUNuRSxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQVcsRUFBRSxFQUFFO1lBQzFCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1lBQ3ZCLElBQUksQ0FBQztnQkFDSixPQUFPLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQ25CLENBQUM7b0JBQVMsQ0FBQztnQkFDVixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtZQUN6QixDQUFDO1FBQ0YsQ0FBQyxDQUFRLENBQUE7SUFDVixDQUFDO0NBQ0QifQ==