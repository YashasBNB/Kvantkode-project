/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { NoOpNotification, NotificationsFilter, Severity, } from '../../common/notification.js';
export class TestNotificationService {
    constructor() {
        this.onDidAddNotification = Event.None;
        this.onDidRemoveNotification = Event.None;
        this.onDidChangeFilter = Event.None;
    }
    static { this.NO_OP = new NoOpNotification(); }
    info(message) {
        return this.notify({ severity: Severity.Info, message });
    }
    warn(message) {
        return this.notify({ severity: Severity.Warning, message });
    }
    error(error) {
        return this.notify({ severity: Severity.Error, message: error });
    }
    notify(notification) {
        return TestNotificationService.NO_OP;
    }
    prompt(severity, message, choices, options) {
        return TestNotificationService.NO_OP;
    }
    status(message, options) {
        return Disposable.None;
    }
    setFilter() { }
    getFilter(source) {
        return NotificationsFilter.OFF;
    }
    getFilters() {
        return [];
    }
    removeFilter(sourceId) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE5vdGlmaWNhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL25vdGlmaWNhdGlvbi90ZXN0L2NvbW1vbi90ZXN0Tm90aWZpY2F0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFTTixnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLFFBQVEsR0FDUixNQUFNLDhCQUE4QixDQUFBO0FBRXJDLE1BQU0sT0FBTyx1QkFBdUI7SUFBcEM7UUFDVSx5QkFBb0IsR0FBeUIsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUV2RCw0QkFBdUIsR0FBeUIsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUUxRCxzQkFBaUIsR0FBZ0IsS0FBSyxDQUFDLElBQUksQ0FBQTtJQThDckQsQ0FBQzthQTFDd0IsVUFBSyxHQUF3QixJQUFJLGdCQUFnQixFQUFFLEFBQTlDLENBQThDO0lBRTNFLElBQUksQ0FBQyxPQUFlO1FBQ25CLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlO1FBQ25CLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFxQjtRQUMxQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQsTUFBTSxDQUFDLFlBQTJCO1FBQ2pDLE9BQU8sdUJBQXVCLENBQUMsS0FBSyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxNQUFNLENBQ0wsUUFBa0IsRUFDbEIsT0FBZSxFQUNmLE9BQXdCLEVBQ3hCLE9BQXdCO1FBRXhCLE9BQU8sdUJBQXVCLENBQUMsS0FBSyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBdUIsRUFBRSxPQUErQjtRQUM5RCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUVELFNBQVMsS0FBVSxDQUFDO0lBRXBCLFNBQVMsQ0FBQyxNQUF3QztRQUNqRCxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQTtJQUMvQixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFnQixJQUFTLENBQUMifQ==