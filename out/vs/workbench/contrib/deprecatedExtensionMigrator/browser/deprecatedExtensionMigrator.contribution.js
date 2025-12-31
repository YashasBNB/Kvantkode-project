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
import { Action } from '../../../../base/common/actions.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
let DeprecatedExtensionMigratorContribution = class DeprecatedExtensionMigratorContribution {
    constructor(configurationService, extensionsWorkbenchService, storageService, notificationService, openerService) {
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.storageKey = 'deprecatedExtensionMigrator.state';
        this.init().catch(onUnexpectedError);
    }
    async init() {
        const bracketPairColorizerId = 'coenraads.bracket-pair-colorizer';
        await this.extensionsWorkbenchService.queryLocal();
        const extension = this.extensionsWorkbenchService.installed.find((e) => e.identifier.id === bracketPairColorizerId);
        if (!extension ||
            (extension.enablementState !== 11 /* EnablementState.EnabledGlobally */ &&
                extension.enablementState !== 12 /* EnablementState.EnabledWorkspace */)) {
            return;
        }
        const state = await this.getState();
        const disablementLogEntry = state.disablementLog.some((d) => d.extensionId === bracketPairColorizerId);
        if (disablementLogEntry) {
            return;
        }
        state.disablementLog.push({
            extensionId: bracketPairColorizerId,
            disablementDateTime: new Date().getTime(),
        });
        await this.setState(state);
        await this.extensionsWorkbenchService.setEnablement(extension, 9 /* EnablementState.DisabledGlobally */);
        const nativeBracketPairColorizationEnabledKey = 'editor.bracketPairColorization.enabled';
        const bracketPairColorizationEnabled = !!this.configurationService.inspect(nativeBracketPairColorizationEnabledKey).user;
        this.notificationService.notify({
            message: localize('bracketPairColorizer.notification', "The extension 'Bracket pair Colorizer' got disabled because it was deprecated."),
            severity: Severity.Info,
            actions: {
                primary: [
                    new Action('', localize('bracketPairColorizer.notification.action.uninstall', 'Uninstall Extension'), undefined, undefined, () => {
                        this.extensionsWorkbenchService.uninstall(extension);
                    }),
                ],
                secondary: [
                    !bracketPairColorizationEnabled
                        ? new Action('', localize('bracketPairColorizer.notification.action.enableNative', 'Enable Native Bracket Pair Colorization'), undefined, undefined, () => {
                            this.configurationService.updateValue(nativeBracketPairColorizationEnabledKey, true, 2 /* ConfigurationTarget.USER */);
                        })
                        : undefined,
                    new Action('', localize('bracketPairColorizer.notification.action.showMoreInfo', 'More Info'), undefined, undefined, () => {
                        this.openerService.open('https://github.com/microsoft/vscode/issues/155179');
                    }),
                ].filter(isDefined),
            },
        });
    }
    async getState() {
        const jsonStr = await this.storageService.get(this.storageKey, -1 /* StorageScope.APPLICATION */, '');
        if (jsonStr === '') {
            return { disablementLog: [] };
        }
        return JSON.parse(jsonStr);
    }
    async setState(state) {
        const json = JSON.stringify(state);
        await this.storageService.store(this.storageKey, json, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
};
DeprecatedExtensionMigratorContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IStorageService),
    __param(3, INotificationService),
    __param(4, IOpenerService)
], DeprecatedExtensionMigratorContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DeprecatedExtensionMigratorContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwcmVjYXRlZEV4dGVuc2lvbk1pZ3JhdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlcHJlY2F0ZWRFeHRlbnNpb25NaWdyYXRvci9icm93c2VyL2RlcHJlY2F0ZWRFeHRlbnNpb25NaWdyYXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUluRixJQUFNLHVDQUF1QyxHQUE3QyxNQUFNLHVDQUF1QztJQUM1QyxZQUN3QixvQkFBNEQsRUFFbkYsMEJBQXdFLEVBQ3ZELGNBQWdELEVBQzNDLG1CQUEwRCxFQUNoRSxhQUE4QztR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