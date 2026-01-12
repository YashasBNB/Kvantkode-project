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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwud3NsUmVjb21tZW5kYXRpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvd3NsUmVjb21tZW5kYXRpb24vYnJvd3Nlci90ZXJtaW5hbC53c2xSZWNvbW1lbmRhdGlvbi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBb0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixRQUFRLEdBQ1IsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUNOLDhCQUE4QixHQUc5QixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWpFLElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQ1osU0FBUSxVQUFVO2FBR1gsT0FBRSxHQUFHLDJCQUEyQixBQUE5QixDQUE4QjtJQUV2QyxZQUM4Qiww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