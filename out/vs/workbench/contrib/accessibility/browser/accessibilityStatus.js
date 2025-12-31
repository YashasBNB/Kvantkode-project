/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, NotificationPriority, } from '../../../../platform/notification/common/notification.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
let AccessibilityStatus = class AccessibilityStatus extends Disposable {
    static { this.ID = 'workbench.contrib.accessibilityStatus'; }
    constructor(configurationService, notificationService, accessibilityService, statusbarService, openerService) {
        super();
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.accessibilityService = accessibilityService;
        this.statusbarService = statusbarService;
        this.openerService = openerService;
        this.screenReaderNotification = null;
        this.promptedScreenReader = false;
        this.screenReaderModeElement = this._register(new MutableDisposable());
        this._register(CommandsRegistry.registerCommand({
            id: 'showEditorScreenReaderNotification',
            handler: () => this.showScreenReaderNotification(),
        }));
        this.updateScreenReaderModeElement(this.accessibilityService.isScreenReaderOptimized());
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this.onScreenReaderModeChange()));
        this._register(this.configurationService.onDidChangeConfiguration((c) => {
            if (c.affectsConfiguration('editor.accessibilitySupport')) {
                this.onScreenReaderModeChange();
            }
        }));
    }
    showScreenReaderNotification() {
        this.screenReaderNotification = this.notificationService.prompt(Severity.Info, localize('screenReaderDetectedExplanation.question', 'Screen reader usage detected. Do you want to enable {0} to optimize the editor for screen reader usage?', 'editor.accessibilitySupport'), [
            {
                label: localize('screenReaderDetectedExplanation.answerYes', 'Yes'),
                run: () => {
                    this.configurationService.updateValue('editor.accessibilitySupport', 'on', 2 /* ConfigurationTarget.USER */);
                },
            },
            {
                label: localize('screenReaderDetectedExplanation.answerNo', 'No'),
                run: () => {
                    this.configurationService.updateValue('editor.accessibilitySupport', 'off', 2 /* ConfigurationTarget.USER */);
                },
            },
            {
                label: localize('screenReaderDetectedExplanation.answerLearnMore', 'Learn More'),
                run: () => {
                    this.openerService.open('https://code.visualstudio.com/docs/editor/accessibility#_screen-readers');
                },
            },
        ], {
            sticky: true,
            priority: NotificationPriority.URGENT,
        });
        Event.once(this.screenReaderNotification.onDidClose)(() => (this.screenReaderNotification = null));
    }
    updateScreenReaderModeElement(visible) {
        if (visible) {
            if (!this.screenReaderModeElement.value) {
                const text = localize('screenReaderDetected', 'Screen Reader Optimized');
                this.screenReaderModeElement.value = this.statusbarService.addEntry({
                    name: localize('status.editor.screenReaderMode', 'Screen Reader Mode'),
                    text,
                    ariaLabel: text,
                    command: 'showEditorScreenReaderNotification',
                    kind: 'prominent',
                    showInAllWindows: true,
                }, 'status.editor.screenReaderMode', 1 /* StatusbarAlignment.RIGHT */, 100.6);
            }
        }
        else {
            this.screenReaderModeElement.clear();
        }
    }
    onScreenReaderModeChange() {
        // We only support text based editors
        const screenReaderDetected = this.accessibilityService.isScreenReaderOptimized();
        if (screenReaderDetected) {
            const screenReaderConfiguration = this.configurationService.getValue('editor.accessibilitySupport');
            if (screenReaderConfiguration === 'auto') {
                if (!this.promptedScreenReader) {
                    this.promptedScreenReader = true;
                    setTimeout(() => this.showScreenReaderNotification(), 100);
                }
            }
        }
        if (this.screenReaderNotification) {
            this.screenReaderNotification.close();
        }
        this.updateScreenReaderModeElement(this.accessibilityService.isScreenReaderOptimized());
    }
};
AccessibilityStatus = __decorate([
    __param(0, IConfigurationService),
    __param(1, INotificationService),
    __param(2, IAccessibilityService),
    __param(3, IStatusbarService),
    __param(4, IOpenerService)
], AccessibilityStatus);
export { AccessibilityStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmlsaXR5U3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLG9CQUFvQixHQUNwQixNQUFNLDBEQUEwRCxDQUFBO0FBRWpFLE9BQU8sRUFFTixpQkFBaUIsR0FFakIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFdEUsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO2FBQ2xDLE9BQUUsR0FBRyx1Q0FBdUMsQUFBMUMsQ0FBMEM7SUFRNUQsWUFDd0Isb0JBQTRELEVBQzdELG1CQUEwRCxFQUN6RCxvQkFBNEQsRUFDaEUsZ0JBQW9ELEVBQ3ZELGFBQThDO1FBRTlELEtBQUssRUFBRSxDQUFBO1FBTmlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDNUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN4Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQy9DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDdEMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBWHZELDZCQUF3QixHQUErQixJQUFJLENBQUE7UUFDM0QseUJBQW9CLEdBQVksS0FBSyxDQUFBO1FBQzVCLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hELElBQUksaUJBQWlCLEVBQTJCLENBQ2hELENBQUE7UUFXQSxJQUFJLENBQUMsU0FBUyxDQUNiLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztZQUNoQyxFQUFFLEVBQUUsb0NBQW9DO1lBQ3hDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUU7U0FDbEQsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtRQUV2RixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdDQUFnQyxDQUFDLEdBQUcsRUFBRSxDQUMvRCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FDL0IsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN4RCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLENBQUM7Z0JBQzNELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLDRCQUE0QjtRQUNuQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FDOUQsUUFBUSxDQUFDLElBQUksRUFDYixRQUFRLENBQ1AsMENBQTBDLEVBQzFDLHlHQUF5RyxFQUN6Ryw2QkFBNkIsQ0FDN0IsRUFDRDtZQUNDO2dCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxDQUFDO2dCQUNuRSxHQUFHLEVBQUUsR0FBRyxFQUFFO29CQUNULElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQ3BDLDZCQUE2QixFQUM3QixJQUFJLG1DQUVKLENBQUE7Z0JBQ0YsQ0FBQzthQUNEO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxJQUFJLENBQUM7Z0JBQ2pFLEdBQUcsRUFBRSxHQUFHLEVBQUU7b0JBQ1QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FDcEMsNkJBQTZCLEVBQzdCLEtBQUssbUNBRUwsQ0FBQTtnQkFDRixDQUFDO2FBQ0Q7WUFDRDtnQkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGlEQUFpRCxFQUFFLFlBQVksQ0FBQztnQkFDaEYsR0FBRyxFQUFFLEdBQUcsRUFBRTtvQkFDVCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FDdEIseUVBQXlFLENBQ3pFLENBQUE7Z0JBQ0YsQ0FBQzthQUNEO1NBQ0QsRUFDRDtZQUNDLE1BQU0sRUFBRSxJQUFJO1lBQ1osUUFBUSxFQUFFLG9CQUFvQixDQUFDLE1BQU07U0FDckMsQ0FDRCxDQUFBO1FBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLENBQ25ELEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxDQUM1QyxDQUFBO0lBQ0YsQ0FBQztJQUNPLDZCQUE2QixDQUFDLE9BQWdCO1FBQ3JELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN6QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtnQkFDeEUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUNsRTtvQkFDQyxJQUFJLEVBQUUsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLG9CQUFvQixDQUFDO29CQUN0RSxJQUFJO29CQUNKLFNBQVMsRUFBRSxJQUFJO29CQUNmLE9BQU8sRUFBRSxvQ0FBb0M7b0JBQzdDLElBQUksRUFBRSxXQUFXO29CQUNqQixnQkFBZ0IsRUFBRSxJQUFJO2lCQUN0QixFQUNELGdDQUFnQyxvQ0FFaEMsS0FBSyxDQUNMLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IscUNBQXFDO1FBQ3JDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDaEYsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDbkUsNkJBQTZCLENBQzdCLENBQUE7WUFDRCxJQUFJLHlCQUF5QixLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUE7b0JBQ2hDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDM0QsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDdEMsQ0FBQztRQUNELElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO0lBQ3hGLENBQUM7O0FBeElXLG1CQUFtQjtJQVU3QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsY0FBYyxDQUFBO0dBZEosbUJBQW1CLENBeUkvQiJ9