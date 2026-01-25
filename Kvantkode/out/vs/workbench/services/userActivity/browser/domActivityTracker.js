/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
/**
 * This uses a time interval and checks whether there's any activity in that
 * interval. A naive approach might be to use a debounce whenever an event
 * happens, but this has some scheduling overhead. Instead, the tracker counts
 * how many intervals have elapsed since any activity happened.
 *
 * If there's more than `MIN_INTERVALS_WITHOUT_ACTIVITY`, then say the user is
 * inactive. Therefore the maximum time before an inactive user is detected
 * is `CHECK_INTERVAL * (MIN_INTERVALS_WITHOUT_ACTIVITY + 1)`.
 */
const CHECK_INTERVAL = 30_000;
/** See {@link CHECK_INTERVAL} */
const MIN_INTERVALS_WITHOUT_ACTIVITY = 2;
const eventListenerOptions = {
    passive: true /** does not preventDefault() */,
    capture: true /** should dispatch first (before anyone stopPropagation()) */,
};
export class DomActivityTracker extends Disposable {
    constructor(userActivityService) {
        super();
        let intervalsWithoutActivity = MIN_INTERVALS_WITHOUT_ACTIVITY;
        const intervalTimer = this._register(new dom.WindowIntervalTimer());
        const activeMutex = this._register(new MutableDisposable());
        activeMutex.value = userActivityService.markActive();
        const onInterval = () => {
            if (++intervalsWithoutActivity === MIN_INTERVALS_WITHOUT_ACTIVITY) {
                activeMutex.clear();
                intervalTimer.cancel();
            }
        };
        const onActivity = (targetWindow) => {
            // if was inactive, they've now returned
            if (intervalsWithoutActivity === MIN_INTERVALS_WITHOUT_ACTIVITY) {
                activeMutex.value = userActivityService.markActive();
                intervalTimer.cancelAndSet(onInterval, CHECK_INTERVAL, targetWindow);
            }
            intervalsWithoutActivity = 0;
        };
        this._register(Event.runAndSubscribe(dom.onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(dom.addDisposableListener(window.document, 'touchstart', () => onActivity(window), eventListenerOptions));
            disposables.add(dom.addDisposableListener(window.document, 'mousedown', () => onActivity(window), eventListenerOptions));
            disposables.add(dom.addDisposableListener(window.document, 'keydown', () => onActivity(window), eventListenerOptions));
        }, { window: mainWindow, disposables: this._store }));
        onActivity(mainWindow);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tQWN0aXZpdHlUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckFjdGl2aXR5L2Jyb3dzZXIvZG9tQWN0aXZpdHlUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHcEY7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFBO0FBRTdCLGlDQUFpQztBQUNqQyxNQUFNLDhCQUE4QixHQUFHLENBQUMsQ0FBQTtBQUV4QyxNQUFNLG9CQUFvQixHQUE0QjtJQUNyRCxPQUFPLEVBQUUsSUFBSSxDQUFDLGdDQUFnQztJQUM5QyxPQUFPLEVBQUUsSUFBSSxDQUFDLDhEQUE4RDtDQUM1RSxDQUFBO0FBRUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFDakQsWUFBWSxtQkFBeUM7UUFDcEQsS0FBSyxFQUFFLENBQUE7UUFFUCxJQUFJLHdCQUF3QixHQUFHLDhCQUE4QixDQUFBO1FBQzdELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFDM0QsV0FBVyxDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUVwRCxNQUFNLFVBQVUsR0FBRyxHQUFHLEVBQUU7WUFDdkIsSUFBSSxFQUFFLHdCQUF3QixLQUFLLDhCQUE4QixFQUFFLENBQUM7Z0JBQ25FLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDbkIsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxDQUFDLFlBQXdDLEVBQUUsRUFBRTtZQUMvRCx3Q0FBd0M7WUFDeEMsSUFBSSx3QkFBd0IsS0FBSyw4QkFBOEIsRUFBRSxDQUFDO2dCQUNqRSxXQUFXLENBQUMsS0FBSyxHQUFHLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxDQUFBO2dCQUNwRCxhQUFhLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDckUsQ0FBQztZQUVELHdCQUF3QixHQUFHLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxlQUFlLENBQ3BCLEdBQUcsQ0FBQyxtQkFBbUIsRUFDdkIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFO1lBQzNCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsR0FBRyxDQUFDLHFCQUFxQixDQUN4QixNQUFNLENBQUMsUUFBUSxFQUNmLFlBQVksRUFDWixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQ3hCLG9CQUFvQixDQUNwQixDQUNELENBQUE7WUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLEdBQUcsQ0FBQyxxQkFBcUIsQ0FDeEIsTUFBTSxDQUFDLFFBQVEsRUFDZixXQUFXLEVBQ1gsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUN4QixvQkFBb0IsQ0FDcEIsQ0FDRCxDQUFBO1lBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxHQUFHLENBQUMscUJBQXFCLENBQ3hCLE1BQU0sQ0FBQyxRQUFRLEVBQ2YsU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFDeEIsb0JBQW9CLENBQ3BCLENBQ0QsQ0FBQTtRQUNGLENBQUMsRUFDRCxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FDaEQsQ0FDRCxDQUFBO1FBRUQsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZCLENBQUM7Q0FDRCJ9