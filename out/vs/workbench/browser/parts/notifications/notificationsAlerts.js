/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { localize } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { Event } from '../../../../base/common/event.js';
export class NotificationsAlerts extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        // Alert initial notifications if any
        for (const notification of model.notifications) {
            this.triggerAriaAlert(notification);
        }
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.model.onDidChangeNotification((e) => this.onDidChangeNotification(e)));
    }
    onDidChangeNotification(e) {
        if (e.kind === 0 /* NotificationChangeType.ADD */) {
            // ARIA alert for screen readers
            this.triggerAriaAlert(e.item);
            // Always log errors to console with full details
            if (e.item.severity === Severity.Error) {
                if (e.item.message.original instanceof Error) {
                    console.error(e.item.message.original);
                }
                else {
                    console.error(toErrorMessage(e.item.message.linkedText.toString(), true));
                }
            }
        }
    }
    triggerAriaAlert(notification) {
        if (notification.priority === NotificationPriority.SILENT) {
            return;
        }
        // Trigger the alert again whenever the message changes
        const listener = notification.onDidChangeContent((e) => {
            if (e.kind === 1 /* NotificationViewItemContentChangeKind.MESSAGE */) {
                this.doTriggerAriaAlert(notification);
            }
        });
        Event.once(notification.onDidClose)(() => listener.dispose());
        this.doTriggerAriaAlert(notification);
    }
    doTriggerAriaAlert(notification) {
        let alertText;
        if (notification.severity === Severity.Error) {
            alertText = localize('alertErrorMessage', 'Error: {0}', notification.message.linkedText.toString());
        }
        else if (notification.severity === Severity.Warning) {
            alertText = localize('alertWarningMessage', 'Warning: {0}', notification.message.linkedText.toString());
        }
        else {
            alertText = localize('alertInfoMessage', 'Info: {0}', notification.message.linkedText.toString());
        }
        alert(alertText);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0FsZXJ0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc0FsZXJ0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBUTdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFVBQVU7SUFDbEQsWUFBNkIsS0FBMEI7UUFDdEQsS0FBSyxFQUFFLENBQUE7UUFEcUIsVUFBSyxHQUFMLEtBQUssQ0FBcUI7UUFHdEQscUNBQXFDO1FBQ3JDLEtBQUssTUFBTSxZQUFZLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0Ys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