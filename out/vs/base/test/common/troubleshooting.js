/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { setDisposableTracker } from '../../common/lifecycle.js';
class DisposableTracker {
    constructor() {
        this.allDisposables = [];
    }
    trackDisposable(x) {
        this.allDisposables.push([x, new Error().stack]);
    }
    setParent(child, parent) {
        for (let idx = 0; idx < this.allDisposables.length; idx++) {
            if (this.allDisposables[idx][0] === child) {
                this.allDisposables.splice(idx, 1);
                return;
            }
        }
    }
    markAsDisposed(x) {
        for (let idx = 0; idx < this.allDisposables.length; idx++) {
            if (this.allDisposables[idx][0] === x) {
                this.allDisposables.splice(idx, 1);
                return;
            }
        }
    }
    markAsSingleton(disposable) {
        // noop
    }
}
let currentTracker = null;
export function beginTrackingDisposables() {
    currentTracker = new DisposableTracker();
    setDisposableTracker(currentTracker);
}
export function endTrackingDisposables() {
    if (currentTracker) {
        setDisposableTracker(null);
        console.log(currentTracker.allDisposables.map((e) => `${e[0]}\n${e[1]}`).join('\n\n'));
        currentTracker = null;
    }
}
export function beginLoggingFS(withStacks = false) {
    ;
    self.beginLoggingFS?.(withStacks);
}
export function endLoggingFS() {
    ;
    self.endLoggingFS?.();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJvdWJsZXNob290aW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3Ryb3VibGVzaG9vdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW1DLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFakcsTUFBTSxpQkFBaUI7SUFBdkI7UUFDQyxtQkFBYyxHQUE0QixFQUFFLENBQUE7SUF1QjdDLENBQUM7SUF0QkEsZUFBZSxDQUFDLENBQWM7UUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFDRCxTQUFTLENBQUMsS0FBa0IsRUFBRSxNQUFtQjtRQUNoRCxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUMzRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEMsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELGNBQWMsQ0FBQyxDQUFjO1FBQzVCLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsQyxPQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsZUFBZSxDQUFDLFVBQXVCO1FBQ3RDLE9BQU87SUFDUixDQUFDO0NBQ0Q7QUFFRCxJQUFJLGNBQWMsR0FBNkIsSUFBSSxDQUFBO0FBRW5ELE1BQU0sVUFBVSx3QkFBd0I7SUFDdkMsY0FBYyxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtJQUN4QyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtBQUNyQyxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQjtJQUNyQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDdEYsY0FBYyxHQUFHLElBQUksQ0FBQTtJQUN0QixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsYUFBc0IsS0FBSztJQUN6RCxDQUFDO0lBQU0sSUFBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQzFDLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWTtJQUMzQixDQUFDO0lBQU0sSUFBSyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUE7QUFDOUIsQ0FBQyJ9