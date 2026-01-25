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
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { MenuRegistry, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize } from '../../../../nls.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { Action } from '../../../../base/common/actions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Promises } from '../../../../base/common/async.js';
let ExtensionDependencyChecker = class ExtensionDependencyChecker extends Disposable {
    constructor(extensionService, extensionsWorkbenchService, notificationService, hostService) {
        super();
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.notificationService = notificationService;
        this.hostService = hostService;
        CommandsRegistry.registerCommand('workbench.extensions.installMissingDependencies', () => this.installMissingDependencies());
        MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: {
                id: 'workbench.extensions.installMissingDependencies',
                category: localize('extensions', 'Extensions'),
                title: localize('auto install missing deps', 'Install Missing Dependencies'),
            },
        });
    }
    async getUninstalledMissingDependencies() {
        const allMissingDependencies = await this.getAllMissingDependencies();
        const localExtensions = await this.extensionsWorkbenchService.queryLocal();
        return allMissingDependencies.filter((id) => localExtensions.every((l) => !areSameExtensions(l.identifier, { id })));
    }
    async getAllMissingDependencies() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const runningExtensionsIds = this.extensionService.extensions.reduce((result, r) => {
            result.add(r.identifier.value.toLowerCase());
            return result;
        }, new Set());
        const missingDependencies = new Set();
        for (const extension of this.extensionService.extensions) {
            if (extension.extensionDependencies) {
                extension.extensionDependencies.forEach((dep) => {
                    if (!runningExtensionsIds.has(dep.toLowerCase())) {
                        missingDependencies.add(dep);
                    }
                });
            }
        }
        return [...missingDependencies.values()];
    }
    async installMissingDependencies() {
        const missingDependencies = await this.getUninstalledMissingDependencies();
        if (missingDependencies.length) {
            const extensions = await this.extensionsWorkbenchService.getExtensions(missingDependencies.map((id) => ({ id })), CancellationToken.None);
            if (extensions.length) {
                await Promises.settled(extensions.map((extension) => this.extensionsWorkbenchService.install(extension)));
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: localize('finished installing missing deps', 'Finished installing missing dependencies. Please reload the window now.'),
                    actions: {
                        primary: [
                            new Action('realod', localize('reload', 'Reload Window'), '', true, () => this.hostService.reload()),
                        ],
                    },
                });
            }
        }
        else {
            this.notificationService.info(localize('no missing deps', 'There are no missing dependencies to install.'));
        }
    }
};
ExtensionDependencyChecker = __decorate([
    __param(0, IExtensionService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, INotificationService),
    __param(3, IHostService)
], ExtensionDependencyChecker);
export { ExtensionDependencyChecker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0RlcGVuZGVuY3lDaGVja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc0RlcGVuZGVuY3lDaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXJFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQzlHLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXBELElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUN6RCxZQUNxQyxnQkFBbUMsRUFFdEQsMEJBQXVELEVBQ2pDLG1CQUF5QyxFQUNqRCxXQUF5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