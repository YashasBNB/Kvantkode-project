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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
import { IExtensionManagementService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, NeverShowAgainScope, Severity, } from '../../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { registerWorkbenchContribution2, } from '../../../../common/contributions.js';
import { InstallRecommendedExtensionAction } from '../../../extensions/browser/extensionsActions.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
let TerminalWslRecommendationContribution = class TerminalWslRecommendationContribution extends Disposable {
    static { this.ID = 'terminalWslRecommendation'; }
    constructor(extensionManagementService, instantiationService, notificationService, productService, terminalService) {
        super();
        if (!isWindows) {
            return;
        }
        const exeBasedExtensionTips = productService.exeBasedExtensionTips;
        if (!exeBasedExtensionTips || !exeBasedExtensionTips.wsl) {
            return;
        }
        let listener = terminalService.onDidCreateInstance(async (instance) => {
            async function isExtensionInstalled(id) {
                const extensions = await extensionManagementService.getInstalled();
                return extensions.some((e) => e.identifier.id === id);
            }
            if (!instance.shellLaunchConfig.executable ||
                basename(instance.shellLaunchConfig.executable).toLowerCase() !== 'wsl.exe') {
                return;
            }
            listener?.dispose();
            listener = undefined;
            const extId = Object.keys(exeBasedExtensionTips.wsl.recommendations).find((extId) => exeBasedExtensionTips.wsl.recommendations[extId].important);
            if (!extId || (await isExtensionInstalled(extId))) {
                return;
            }
            notificationService.prompt(Severity.Info, localize('useWslExtension.title', "The '{0}' extension is recommended for opening a terminal in WSL.", exeBasedExtensionTips.wsl.friendlyName), [
                {
                    label: localize('install', 'Install'),
                    run: () => {
                        instantiationService.createInstance(InstallRecommendedExtensionAction, extId).run();
                    },
                },
            ], {
                sticky: true,
                neverShowAgain: {
                    id: 'terminalConfigHelper/launchRecommendationsIgnore',
                    scope: NeverShowAgainScope.APPLICATION,
                },
                onCancel: () => { },
            });
        });
    }
};
TerminalWslRecommendationContribution = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IProductService),
    __param(4, ITerminalService)
], TerminalWslRecommendationContribution);
export { TerminalWslRecommendationContribution };
registerWorkbenchContribution2(TerminalWslRecommendationContribution.ID, TerminalWslRecommendationContribution, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwud3NsUmVjb21tZW5kYXRpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3dzbFJlY29tbWVuZGF0aW9uL2Jyb3dzZXIvdGVybWluYWwud3NsUmVjb21tZW5kYXRpb24uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQW9CLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkVBQTJFLENBQUE7QUFDdkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixtQkFBbUIsRUFDbkIsUUFBUSxHQUNSLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFDTiw4QkFBOEIsR0FHOUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVqRSxJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUNaLFNBQVEsVUFBVTthQUdYLE9BQUUsR0FBRywyQkFBMkIsQUFBOUIsQ0FBOEI7SUFFdkMsWUFDOEIsMEJBQXVE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