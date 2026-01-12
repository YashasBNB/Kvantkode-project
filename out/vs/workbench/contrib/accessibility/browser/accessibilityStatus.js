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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2liaWxpdHlTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBQ3BCLE1BQU0sMERBQTBELENBQUE7QUFFakUsT0FBTyxFQUVOLGlCQUFpQixHQUVqQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV0RSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7YUFDbEMsT0FBRSxHQUFHLHVDQUF1QyxBQUExQyxDQUEwQztJQVE1RCxZQUN3QixvQkFBNEQsRUFDN0QsbUJBQTBELEVBQ3pELG9CQUE0RCxFQUNoRSxnQkFBb0QsRUFDdkQsYUFBOEM7UUFFOUQsS0FBSyxFQUFFLENBQUE7UUFOaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtR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