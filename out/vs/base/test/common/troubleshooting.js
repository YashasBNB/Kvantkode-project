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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJvdWJsZXNob290aW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi90cm91Ymxlc2hvb3RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFtQyxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRWpHLE1BQU0saUJBQWlCO0lBQXZCO1FBQ0MsbUJBQWMsR0FBNEIsRUFBRSxDQUFBO0lBdUI3QyxDQUFDO0lBdEJBLGVBQWUsQ0FBQyxDQUFjO1FBQzdCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBQ0QsU0FBUyxDQUFDLEtBQWtCLEVBQUUsTUFBbUI7UUFDaEQsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDM0QsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xDLE9BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxjQUFjLENBQUMsQ0FBYztRQUM1QixLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUMzRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEMsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELGVBQWUsQ0FBQyxVQUF1QjtRQUN0QyxPQUFPO0lBQ1IsQ0FBQztDQUNEO0FBRUQsSUFBSSxjQUFjLEdBQTZCLElBQUksQ0FBQTtBQUVuRCxNQUFNLFVBQVUsd0JBQXdCO0lBQ3ZDLGNBQWMsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7SUFDeEMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDckMsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0I7SUFDckMsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNwQixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLGNBQWMsR0FBRyxJQUFJLENBQUE7SUFDdEIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLGFBQXNCLEtBQUs7SUFDekQsQ0FBQztJQUFNLElBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtBQUMxQyxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVk7SUFDM0IsQ0FBQztJQUFNLElBQUssQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFBO0FBQzlCLENBQUMifQ==