/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
export class ActiveWindowManager extends Disposable {
    constructor({ onDidOpenMainWindow, onDidFocusMainWindow, getActiveWindowId, }) {
        super();
        this.disposables = this._register(new DisposableStore());
        // remember last active window id upon events
        const onActiveWindowChange = Event.latch(Event.any(onDidOpenMainWindow, onDidFocusMainWindow));
        onActiveWindowChange(this.setActiveWindow, this, this.disposables);
        // resolve current active window
        this.firstActiveWindowIdPromise = createCancelablePromise(() => getActiveWindowId());
        (async () => {
            try {
                const windowId = await this.firstActiveWindowIdPromise;
                this.activeWindowId =
                    typeof this.activeWindowId === 'number' ? this.activeWindowId : windowId;
            }
            catch (error) {
                // ignore
            }
            finally {
                this.firstActiveWindowIdPromise = undefined;
            }
        })();
    }
    setActiveWindow(windowId) {
        if (this.firstActiveWindowIdPromise) {
            this.firstActiveWindowIdPromise.cancel();
            this.firstActiveWindowIdPromise = undefined;
        }
        this.activeWindowId = windowId;
    }
    async getActiveClientId() {
        const id = this.firstActiveWindowIdPromise
            ? await this.firstActiveWindowIdPromise
            : this.activeWindowId;
        return `window:${id}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93VHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3Mvbm9kZS93aW5kb3dUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMxRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUvRSxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsVUFBVTtJQU1sRCxZQUFZLEVBQ1gsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixpQkFBaUIsR0FLakI7UUFDQSxLQUFLLEVBQUUsQ0FBQTtRQWRTLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFnQm5FLDZDQUE2QztRQUM3QyxNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUE7UUFDOUYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRWxFLGdDQUFnQztRQUNoQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUNuRjtRQUFBLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDWixJQUFJLENBQUM7Z0JBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUE7Z0JBQ3RELElBQUksQ0FBQyxjQUFjO29CQUNsQixPQUFPLElBQUksQ0FBQyxjQUFjLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUE7WUFDMUUsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLFNBQVM7WUFDVixDQUFDO29CQUFTLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLDBCQUEwQixHQUFHLFNBQVMsQ0FBQTtZQUM1QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNMLENBQUM7SUFFTyxlQUFlLENBQUMsUUFBNEI7UUFDbkQsSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDeEMsSUFBSSxDQUFDLDBCQUEwQixHQUFHLFNBQVMsQ0FBQTtRQUM1QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUE7SUFDL0IsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUI7UUFDdEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLDBCQUEwQjtZQUN6QyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCO1lBQ3ZDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFBO1FBRXRCLE9BQU8sVUFBVSxFQUFFLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0NBQ0QifQ==