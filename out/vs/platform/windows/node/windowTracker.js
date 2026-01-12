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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93VHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy9ub2RlL3dpbmRvd1RyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzFGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRS9FLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUFVO0lBTWxELFlBQVksRUFDWCxtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLGlCQUFpQixHQUtqQjtRQUNBLEtBQUssRUFBRSxDQUFBO1FBZFMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQWdCbkUsNkNBQTZDO1FBQzdDLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtRQUM5RixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFbEUsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQywwQkFBMEIsR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQ25GO1FBQUEsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNaLElBQUksQ0FBQztnQkFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQTtnQkFDdEQsSUFBSSxDQUFDLGNBQWM7b0JBQ2xCLE9BQU8sSUFBSSxDQUFDLGNBQWMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtZQUMxRSxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsU0FBUztZQUNWLENBQUM7b0JBQVMsQ0FBQztnQkFDVixJQUFJLENBQUMsMEJBQTBCLEdBQUcsU0FBUyxDQUFBO1lBQzVDLENBQUM7UUFDRixDQUFDLENBQUMsRUFBRSxDQUFBO0lBQ0wsQ0FBQztJQUVPLGVBQWUsQ0FBQyxRQUE0QjtRQUNuRCxJQUFJLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUN4QyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsU0FBUyxDQUFBO1FBQzVDLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQTtJQUMvQixDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQjtRQUN0QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsMEJBQTBCO1lBQ3pDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQywwQkFBMEI7WUFDdkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUE7UUFFdEIsT0FBTyxVQUFVLEVBQUUsRUFBRSxDQUFBO0lBQ3RCLENBQUM7Q0FDRCJ9