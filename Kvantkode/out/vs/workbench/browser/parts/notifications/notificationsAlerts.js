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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0FsZXJ0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zQWxlcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFRN0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsVUFBVTtJQUNsRCxZQUE2QixLQUEwQjtRQUN0RCxLQUFLLEVBQUUsQ0FBQTtRQURxQixVQUFLLEdBQUwsS0FBSyxDQUFxQjtRQUd0RCxxQ0FBcUM7UUFDckMsS0FBSyxNQUFNLFlBQVksSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3BDLENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FB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