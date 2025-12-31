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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tQWN0aXZpdHlUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJBY3Rpdml0eS9icm93c2VyL2RvbUFjdGl2aXR5VHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3BGOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQTtBQUU3QixpQ0FBaUM7QUFDakMsTUFBTSw4QkFBOEIsR0FBRyxDQUFDLENBQUE7QUFFeEMsTUFBTSxvQkFBb0IsR0FBNEI7SUFDckQsT0FBTyxFQUFFLElBQUksQ0FBQyxnQ0FBZ0M7SUFDOUMsT0FBTyxFQUFFLElBQUksQ0FBQyw4REFBOEQ7Q0FDNUUsQ0FBQTtBQUVELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBQ2pELFlBQVksbUJBQXlDO1FBQ3BELEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSx3QkFBd0IsR0FBRyw4QkFBOEIsQ0FBQTtRQUM3RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQTtRQUNuRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBQzNELFdBQVcsQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxFQUFFLENBQUE7UUFFcEQsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFO1lBQ3ZCLElBQUksRUFBRSx3QkFBd0IsS0FBSyw4QkFBOEIsRUFBRSxDQUFDO2dCQUNuRSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ25CLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxZQUF3QyxFQUFFLEVBQUU7WUFDL0Qsd0NBQXdDO1lBQ3hDLElBQUksd0JBQXdCLEtBQUssOEJBQThCLEVBQUUsQ0FBQztnQkFDakUsV0FBVyxDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtnQkFDcEQsYUFBYSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3JFLENBQUM7WUFFRCx3QkFBd0IsR0FBRyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsZUFBZSxDQUNwQixHQUFHLENBQUMsbUJBQW1CLEVBQ3ZCLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRTtZQUMzQixXQUFXLENBQUMsR0FBRyxDQUNkLEdBQUcsQ0FBQyxxQkFBcUIsQ0FDeEIsTUFBTSxDQUFDLFFBQVEsRUFDZixZQUFZLEVBQ1osR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUN4QixvQkFBb0IsQ0FDcEIsQ0FDRCxDQUFBO1lBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxHQUFHLENBQUMscUJBQXFCLENBQ3hCLE1BQU0sQ0FBQyxRQUFRLEVBQ2YsV0FBVyxFQUNYLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFDeEIsb0JBQW9CLENBQ3BCLENBQ0QsQ0FBQTtZQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsR0FBRyxDQUFDLHFCQUFxQixDQUN4QixNQUFNLENBQUMsUUFBUSxFQUNmLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQ3hCLG9CQUFvQixDQUNwQixDQUNELENBQUE7UUFDRixDQUFDLEVBQ0QsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQ2hELENBQ0QsQ0FBQTtRQUVELFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN2QixDQUFDO0NBQ0QifQ==