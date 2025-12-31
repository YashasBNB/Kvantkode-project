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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE5vdGlmaWNhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9ub3RpZmljYXRpb24vdGVzdC9jb21tb24vdGVzdE5vdGlmaWNhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBU04sZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixRQUFRLEdBQ1IsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBQ1UseUJBQW9CLEdBQXlCLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFFdkQsNEJBQXVCLEdBQXlCLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFFMUQsc0JBQWlCLEdBQWdCLEtBQUssQ0FBQyxJQUFJLENBQUE7SUE4Q3JELENBQUM7YUExQ3dCLFVBQUssR0FBd0IsSUFBSSxnQkFBZ0IsRUFBRSxBQUE5QyxDQUE4QztJQUUzRSxJQUFJLENBQUMsT0FBZTtRQUNuQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZTtRQUNuQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCxLQUFLLENBQUMsS0FBcUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVELE1BQU0sQ0FBQyxZQUEyQjtRQUNqQyxPQUFPLHVCQUF1QixDQUFDLEtBQUssQ0FBQTtJQUNyQyxDQUFDO0lBRUQsTUFBTSxDQUNMLFFBQWtCLEVBQ2xCLE9BQWUsRUFDZixPQUF3QixFQUN4QixPQUF3QjtRQUV4QixPQUFPLHVCQUF1QixDQUFDLEtBQUssQ0FBQTtJQUNyQyxDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQXVCLEVBQUUsT0FBK0I7UUFDOUQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxTQUFTLEtBQVUsQ0FBQztJQUVwQixTQUFTLENBQUMsTUFBd0M7UUFDakQsT0FBTyxtQkFBbUIsQ0FBQyxHQUFHLENBQUE7SUFDL0IsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxZQUFZLENBQUMsUUFBZ0IsSUFBUyxDQUFDIn0=