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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwcmVjYXRlZEV4dGVuc2lvbk1pZ3JhdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVwcmVjYXRlZEV4dGVuc2lvbk1pZ3JhdG9yL2Jyb3dzZXIvZGVwcmVjYXRlZEV4dGVuc2lvbk1pZ3JhdG9yLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBSW5GLElBQU0sdUNBQXVDLEdBQTdDLE1BQU0sdUNBQXVDO0lBQzVDLFlBQ3dCLG9CQUE0RCxFQUVuRiwwQkFBd0UsRUFDdkQsY0FBZ0QsRUFDM0MsbUJBQTBELEVBQ2hFLGFB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