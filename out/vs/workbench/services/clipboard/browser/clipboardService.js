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
import { localize } from '../../../../nls.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { BrowserClipboardService as BaseBrowserClipboardService } from '../../../../platform/clipboard/browser/clipboardService.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
let BrowserClipboardService = class BrowserClipboardService extends BaseBrowserClipboardService {
    constructor(notificationService, openerService, environmentService, logService, layoutService) {
        super(layoutService, logService);
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.environmentService = environmentService;
    }
    async writeText(text, type) {
        if (!!this.environmentService.extensionTestsLocationURI && typeof type !== 'string') {
            type = 'vscode-tests'; // force in-memory clipboard for tests to avoid permission issues
        }
        return super.writeText(text, type);
    }
    async readText(type) {
        if (!!this.environmentService.extensionTestsLocationURI && typeof type !== 'string') {
            type = 'vscode-tests'; // force in-memory clipboard for tests to avoid permission issues
        }
        if (type) {
            return super.readText(type);
        }
        try {
            return await getActiveWindow().navigator.clipboard.readText();
        }
        catch (error) {
            return new Promise((resolve) => {
                // Inform user about permissions problem (https://github.com/microsoft/vscode/issues/112089)
                const listener = new DisposableStore();
                const handle = this.notificationService.prompt(Severity.Error, localize('clipboardError', "Unable to read from the browser's clipboard. Please make sure you have granted access for this website to read from the clipboard."), [
                    {
                        label: localize('retry', 'Retry'),
                        run: async () => {
                            listener.dispose();
                            resolve(await this.readText(type));
                        },
                    },
                    {
                        label: localize('learnMore', 'Learn More'),
                        run: () => this.openerService.open('https://go.microsoft.com/fwlink/?linkid=2151362'),
                    },
                ], {
                    sticky: true,
                });
                // Always resolve the promise once the notification closes
                listener.add(Event.once(handle.onDidClose)(() => resolve('')));
            });
        }
    }
};
BrowserClipboardService = __decorate([
    __param(0, INotificationService),
    __param(1, IOpenerService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ILogService),
    __param(4, ILayoutService)
], BrowserClipboardService);
export { BrowserClipboardService };
registerSingleton(IClipboardService, BrowserClipboardService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jbGlwYm9hcmQvYnJvd3Nlci9jbGlwYm9hcmRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixJQUFJLDJCQUEyQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbkksT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLDJCQUEyQjtJQUN2RSxZQUN3QyxtQkFBeUMsRUFDL0MsYUFBNkIsRUFDZixrQkFBZ0QsRUFDbEYsVUFBdUIsRUFDcEIsYUFBNkI7UUFFN0MsS0FBSyxD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