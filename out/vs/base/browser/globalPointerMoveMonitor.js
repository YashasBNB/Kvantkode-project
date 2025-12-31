/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from './dom.js';
import { DisposableStore, toDisposable } from '../common/lifecycle.js';
export class GlobalPointerMoveMonitor {
    constructor() {
        this._hooks = new DisposableStore();
        this._pointerMoveCallback = null;
        this._onStopCallback = null;
    }
    dispose() {
        this.stopMonitoring(false);
        this._hooks.dispose();
    }
    stopMonitoring(invokeStopCallback, browserEvent) {
        if (!this.isMonitoring()) {
            // Not monitoring
            return;
        }
        // Unhook
        this._hooks.clear();
        this._pointerMoveCallback = null;
        const onStopCallback = this._onStopCallback;
        this._onStopCallback = null;
        if (invokeStopCallback && onStopCallback) {
            onStopCallback(browserEvent);
        }
    }
    isMonitoring() {
        return !!this._pointerMoveCallback;
    }
    startMonitoring(initialElement, pointerId, initialButtons, pointerMoveCallback, onStopCallback) {
        if (this.isMonitoring()) {
            this.stopMonitoring(false);
        }
        this._pointerMoveCallback = pointerMoveCallback;
        this._onStopCallback = onStopCallback;
        let eventSource = initialElement;
        try {
            initialElement.setPointerCapture(pointerId);
            this._hooks.add(toDisposable(() => {
                try {
                    initialElement.releasePointerCapture(pointerId);
                }
                catch (err) {
                    // See https://github.com/microsoft/vscode/issues/161731
                    //
                    // `releasePointerCapture` sometimes fails when being invoked with the exception:
                    //     DOMException: Failed to execute 'releasePointerCapture' on 'Element':
                    //     No active pointer with the given id is found.
                    //
                    // There's no need to do anything in case of failure
                }
            }));
        }
        catch (err) {
            // See https://github.com/microsoft/vscode/issues/144584
            // See https://github.com/microsoft/vscode/issues/146947
            // `setPointerCapture` sometimes fails when being invoked
            // from a `mousedown` listener on macOS and Windows
            // and it always fails on Linux with the exception:
            //     DOMException: Failed to execute 'setPointerCapture' on 'Element':
            //     No active pointer with the given id is found.
            // In case of failure, we bind the listeners on the window
            eventSource = dom.getWindow(initialElement);
        }
        this._hooks.add(dom.addDisposableListener(eventSource, dom.EventType.POINTER_MOVE, (e) => {
            if (e.buttons !== initialButtons) {
                // Buttons state has changed in the meantime
                this.stopMonitoring(true);
                return;
            }
            e.preventDefault();
            this._pointerMoveCallback(e);
        }));
        this._hooks.add(dom.addDisposableListener(eventSource, dom.EventType.POINTER_UP, (e) => this.stopMonitoring(true)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsUG9pbnRlck1vdmVNb25pdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2dsb2JhbFBvaW50ZXJNb3ZlTW9uaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUMvQixPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBVW5GLE1BQU0sT0FBTyx3QkFBd0I7SUFBckM7UUFDa0IsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDdkMseUJBQW9CLEdBQWdDLElBQUksQ0FBQTtRQUN4RCxvQkFBZSxHQUEyQixJQUFJLENBQUE7SUE4RnZELENBQUM7SUE1Rk8sT0FBTztRQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRU0sY0FBYyxDQUNwQixrQkFBMkIsRUFDM0IsWUFBMkM7UUFFM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBQzFCLGlCQUFpQjtZQUNqQixPQUFNO1FBQ1AsQ0FBQztRQUVELFNBQVM7UUFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUE7UUFDaEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTtRQUMzQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtRQUUzQixJQUFJLGtCQUFrQixJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQzFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ25DLENBQUM7SUFFTSxlQUFlLENBQ3JCLGNBQXVCLEVBQ3ZCLFNBQWlCLEVBQ2pCLGNBQXNCLEVBQ3RCLG1CQUF5QyxFQUN6QyxjQUErQjtRQUUvQixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQTtRQUMvQyxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQTtRQUVyQyxJQUFJLFdBQVcsR0FBcUIsY0FBYyxDQUFBO1FBRWxELElBQUksQ0FBQztZQUNKLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxZQUFZLENBQUMsR0FBRyxFQUFFO2dCQUNqQixJQUFJLENBQUM7b0JBQ0osY0FBYyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNoRCxDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2Qsd0RBQXdEO29CQUN4RCxFQUFFO29CQUNGLGlGQUFpRjtvQkFDakYsNEVBQTRFO29CQUM1RSxvREFBb0Q7b0JBQ3BELEVBQUU7b0JBQ0Ysb0RBQW9EO2dCQUNyRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2Qsd0RBQXdEO1lBQ3hELHdEQUF3RDtZQUN4RCx5REFBeUQ7WUFDekQsbURBQW1EO1lBQ25ELG1EQUFtRDtZQUNuRCx3RUFBd0U7WUFDeEUsb0RBQW9EO1lBQ3BELDBEQUEwRDtZQUMxRCxXQUFXLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUM1QyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2QsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hFLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDbEMsNENBQTRDO2dCQUM1QyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN6QixPQUFNO1lBQ1AsQ0FBQztZQUVELENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUNsQixJQUFJLENBQUMsb0JBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNkLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFlLEVBQUUsRUFBRSxDQUNwRixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUN6QixDQUNELENBQUE7SUFDRixDQUFDO0NBQ0QifQ==