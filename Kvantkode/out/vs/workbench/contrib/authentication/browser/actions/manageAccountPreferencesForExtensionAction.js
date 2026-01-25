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
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IAuthenticationUsageService, } from '../../../../services/authentication/browser/authenticationUsageService.js';
import { IAuthenticationExtensionsService, IAuthenticationService, INTERNAL_AUTH_PROVIDER_PREFIX, } from '../../../../services/authentication/common/authentication.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
export class ManageAccountPreferencesForExtensionAction extends Action2 {
    constructor() {
        super({
            id: '_manageAccountPreferencesForExtension',
            title: localize2('manageAccountPreferenceForExtension', 'Manage Extension Account Preferences'),
            category: localize2('accounts', 'Accounts'),
            f1: false,
        });
    }
    run(accessor, extensionId, providerId) {
        return accessor
            .get(IInstantiationService)
            .createInstance(ManageAccountPreferenceForExtensionActionImpl)
            .run(extensionId, providerId);
    }
}
let ManageAccountPreferenceForExtensionActionImpl = class ManageAccountPreferenceForExtensionActionImpl {
    constructor(_authenticationService, _quickInputService, _dialogService, _authenticationUsageService, _authenticationExtensionsService, _extensionService, _logService) {
        this._authenticationService = _authenticationService;
        this._quickInputService = _quickInputService;
        this._dialogService = _dialogService;
        this._authenticationUsageService = _authenticationUsageService;
        this._authenticationExtensionsService = _authenticationExtensionsService;
        this._extensionService = _extensionService;
        this._logService = _logService;
    }
    async run(extensionId, providerId) {
        if (!extensionId) {
            return;
        }
        const extension = await this._extensionService.getExtension(extensionId);
        if (!extension) {
            throw new Error(`No extension with id ${extensionId}`);
        }
        const providerIds = new Array();
        const providerIdToAccounts = new Map();
        if (providerId) {
            providerIds.push(providerId);
            providerIdToAccounts.set(providerId, await this._authenticationService.getAccounts(providerId));
        }
        else {
            for (const providerId of this._authenticationService.getProviderIds()) {
                if (providerId.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
                    // Don't show internal providers
                    continue;
                }
                const accounts = await this._authenticationService.getAccounts(providerId);
                for (const account of accounts) {
                    const usage = this._authenticationUsageService
                        .readAccountUsages(providerId, account.label)
                        .find((u) => ExtensionIdentifier.equals(u.extensionId, extensionId));
                    if (usage) {
                        providerIds.push(providerId);
                        providerIdToAccounts.set(providerId, accounts);
                        break;
                    }
                }
            }
        }
        let chosenProviderId = providerIds[0];
        if (providerIds.length > 1) {
            const result = await this._quickInputService.pick(providerIds.map((providerId) => ({
                label: this._authenticationService.getProvider(providerId).label,
                id: providerId,
            })), {
                placeHolder: localize('selectProvider', 'Select an authentication provider to manage account preferences for'),
                title: localize('pickAProviderTitle', 'Manage Extension Account Preferences'),
            });
            chosenProviderId = result?.id;
        }
        if (!chosenProviderId) {
            await this._dialogService.info(localize('noAccountUsage', 'This extension has not used any accounts yet.'));
            return;
        }
        const currentAccountNamePreference = this._authenticationExtensionsService.getAccountPreference(extensionId, chosenProviderId);
        const accounts = providerIdToAccounts.get(chosenProviderId);
        const items = this._getItems(accounts, chosenProviderId, currentAccountNamePreference);
        // If the provider supports multiple accounts, add an option to use a new account
        const provider = this._authenticationService.getProvider(chosenProviderId);
        if (provider.supportsMultipleAccounts) {
            // Get the last used scopes for the last used account. This will be used to pre-fill the scopes when adding a new account.
            // If there's no scopes, then don't add this option.
            const lastUsedScopes = accounts
                .flatMap((account) => this._authenticationUsageService
                .readAccountUsages(chosenProviderId, account.label)
                .find((u) => ExtensionIdentifier.equals(u.extensionId, extensionId)))
                .filter((usage) => !!usage)
                .sort((a, b) => b.lastUsed - a.lastUsed)?.[0]?.scopes;
            if (lastUsedScopes) {
                items.push({ type: 'separator' });
                items.push({
                    providerId: chosenProviderId,
                    scopes: lastUsedScopes,
                    label: localize('use new account', 'Use a new account...'),
                });
            }
        }
        const disposables = new DisposableStore();
        const picker = this._createQuickPick(disposables, extensionId, extension.displayName ?? extension.name, provider.label);
        if (items.length === 0) {
            // We would only get here if we went through the Command Palette
            disposables.add(this._handleNoAccounts(picker));
            return;
        }
        picker.items = items;
        picker.show();
    }
    _createQuickPick(disposableStore, extensionId, extensionLabel, providerLabel) {
        const picker = disposableStore.add(this._quickInputService.createQuickPick({
            useSeparators: true,
        }));
        disposableStore.add(picker.onDidHide(() => {
            disposableStore.dispose();
        }));
        picker.placeholder = localize('placeholder v2', "Manage '{0}' account preferences for {1}...", extensionLabel, providerLabel);
        picker.title = localize('title', "'{0}' Account Preferences For This Workspace", extensionLabel);
        picker.sortByLabel = false;
        disposableStore.add(picker.onDidAccept(async () => {
            picker.hide();
            await this._accept(extensionId, picker.selectedItems);
        }));
        return picker;
    }
    _getItems(accounts, providerId, currentAccountNamePreference) {
        return accounts.map((a) => currentAccountNamePreference === a.label
            ? {
                label: a.label,
                account: a,
                providerId,
                description: localize('currentAccount', 'Current account'),
                picked: true,
            }
            : {
                label: a.label,
                account: a,
                providerId,
            });
    }
    _handleNoAccounts(picker) {
        picker.validationMessage = localize('noAccounts', 'No accounts are currently used by this extension.');
        picker.buttons = [this._quickInputService.backButton];
        picker.show();
        return Event.filter(picker.onDidTriggerButton, (e) => e === this._quickInputService.backButton)(() => this.run());
    }
    async _accept(extensionId, selectedItems) {
        for (const item of selectedItems) {
            let account;
            if (!item.account) {
                try {
                    const session = await this._authenticationService.createSession(item.providerId, item.scopes);
                    account = session.account;
                }
                catch (e) {
                    this._logService.error(e);
                    continue;
                }
            }
            else {
                account = item.account;
            }
            const providerId = item.providerId;
            const currentAccountName = this._authenticationExtensionsService.getAccountPreference(extensionId, providerId);
            if (currentAccountName === account.label) {
                // This account is already the preferred account
                continue;
            }
            this._authenticationExtensionsService.updateAccountPreference(extensionId, providerId, account);
        }
    }
};
ManageAccountPreferenceForExtensionActionImpl = __decorate([
    __param(0, IAuthenticationService),
    __param(1, IQuickInputService),
    __param(2, IDialogService),
    __param(3, IAuthenticationUsageService),
    __param(4, IAuthenticationExtensionsService),
    __param(5, IExtensionService),
    __param(6, ILogService)
], ManageAccountPreferenceForExtensionActionImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlQWNjb3VudFByZWZlcmVuY2VzRm9yRXh0ZW5zaW9uQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hdXRoZW50aWNhdGlvbi9icm93c2VyL2FjdGlvbnMvbWFuYWdlQWNjb3VudFByZWZlcmVuY2VzRm9yRXh0ZW5zaW9uQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkUsT0FBTyxFQUNOLGtCQUFrQixHQUlsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFFTiwyQkFBMkIsR0FDM0IsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBRU4sZ0NBQWdDLEVBQ2hDLHNCQUFzQixFQUN0Qiw2QkFBNkIsR0FDN0IsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV4RixNQUFNLE9BQU8sMENBQTJDLFNBQVEsT0FBTztJQUN0RTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1Q0FBdUM7WUFDM0MsS0FBSyxFQUFFLFNBQVMsQ0FDZixxQ0FBcUMsRUFDckMsc0NBQXNDLENBQ3RDO1lBQ0QsUUFBUSxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO1lBQzNDLEVBQUUsRUFBRSxLQUFLO1NBQ1QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEdBQUcsQ0FDWCxRQUEwQixFQUMxQixXQUFvQixFQUNwQixVQUFtQjtRQUVuQixPQUFPLFFBQVE7YUFDYixHQUFHLENBQUMscUJBQXFCLENBQUM7YUFDMUIsY0FBYyxDQUFDLDZDQUE2QyxDQUFDO2FBQzdELEdBQUcsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDL0IsQ0FBQztDQUNEO0FBZ0JELElBQU0sNkNBQTZDLEdBQW5ELE1BQU0sNkNBQTZDO0lBQ2xELFlBQzBDLHNCQUE4QyxFQUNsRCxrQkFBc0MsRUFDMUMsY0FBOEIsRUFFOUMsMkJBQXdELEVBRXhELGdDQUFrRSxFQUMvQyxpQkFBb0MsRUFDMUMsV0FBd0I7UUFSYiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQ2xELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDMUMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBRTlDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFFeEQscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFrQztRQUMvQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQzFDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO0lBQ3BELENBQUM7SUFFSixLQUFLLENBQUMsR0FBRyxDQUFDLFdBQW9CLEVBQUUsVUFBbUI7UUFDbEQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssRUFBVSxDQUFBO1FBQ3ZDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxHQUFHLEVBR2pDLENBQUE7UUFDSCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDNUIsb0JBQW9CLENBQUMsR0FBRyxDQUN2QixVQUFVLEVBQ1YsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUN6RCxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO2dCQUN2RSxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsRUFBRSxDQUFDO29CQUMxRCxnQ0FBZ0M7b0JBQ2hDLFNBQVE7Z0JBQ1QsQ0FBQztnQkFDRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQzFFLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQywyQkFBMkI7eUJBQzVDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDO3lCQUM1QyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7b0JBQ3JFLElBQUksS0FBSyxFQUFFLENBQUM7d0JBQ1gsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTt3QkFDNUIsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTt3QkFDOUMsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksZ0JBQWdCLEdBQXVCLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUNoRCxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNoQyxLQUFLLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLO2dCQUNoRSxFQUFFLEVBQUUsVUFBVTthQUNkLENBQUMsQ0FBQyxFQUNIO2dCQUNDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGdCQUFnQixFQUNoQixxRUFBcUUsQ0FDckU7Z0JBQ0QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxzQ0FBc0MsQ0FBQzthQUM3RSxDQUNELENBQUE7WUFDRCxnQkFBZ0IsR0FBRyxNQUFNLEVBQUUsRUFBRSxDQUFBO1FBQzlCLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QixNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUM3QixRQUFRLENBQUMsZ0JBQWdCLEVBQUUsK0NBQStDLENBQUMsQ0FDM0UsQ0FBQTtZQUNELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsb0JBQW9CLENBQzlGLFdBQVcsRUFDWCxnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFBO1FBQzVELE1BQU0sS0FBSyxHQUEwRCxJQUFJLENBQUMsU0FBUyxDQUNsRixRQUFRLEVBQ1IsZ0JBQWdCLEVBQ2hCLDRCQUE0QixDQUM1QixDQUFBO1FBRUQsaUZBQWlGO1FBQ2pGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUMxRSxJQUFJLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ3ZDLDBIQUEwSDtZQUMxSCxvREFBb0Q7WUFDcEQsTUFBTSxjQUFjLEdBQUcsUUFBUTtpQkFDN0IsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDcEIsSUFBSSxDQUFDLDJCQUEyQjtpQkFDOUIsaUJBQWlCLENBQUMsZ0JBQWlCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQztpQkFDbkQsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUNyRTtpQkFDQSxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO2lCQUNsRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQTtZQUN0RCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUE7Z0JBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ1YsVUFBVSxFQUFFLGdCQUFnQjtvQkFDNUIsTUFBTSxFQUFFLGNBQWM7b0JBQ3RCLEtBQUssRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsc0JBQXNCLENBQUM7aUJBQzFELENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQ25DLFdBQVcsRUFDWCxXQUFXLEVBQ1gsU0FBUyxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUN2QyxRQUFRLENBQUMsS0FBSyxDQUNkLENBQUE7UUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEIsZ0VBQWdFO1lBQ2hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDL0MsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNwQixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDZCxDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLGVBQWdDLEVBQ2hDLFdBQW1CLEVBQ25CLGNBQXNCLEVBQ3RCLGFBQXFCO1FBRXJCLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQ2pDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQWlDO1lBQ3ZFLGFBQWEsRUFBRSxJQUFJO1NBQ25CLENBQUMsQ0FDRixDQUFBO1FBQ0QsZUFBZSxDQUFDLEdBQUcsQ0FDbEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDckIsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzFCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FDNUIsZ0JBQWdCLEVBQ2hCLDZDQUE2QyxFQUM3QyxjQUFjLEVBQ2QsYUFBYSxDQUNiLENBQUE7UUFDRCxNQUFNLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsOENBQThDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDaEcsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDMUIsZUFBZSxDQUFDLEdBQUcsQ0FDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM3QixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDYixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN0RCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sU0FBUyxDQUNoQixRQUFxRCxFQUNyRCxVQUFrQixFQUNsQiw0QkFBZ0Q7UUFFaEQsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFpRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3pFLDRCQUE0QixLQUFLLENBQUMsQ0FBQyxLQUFLO1lBQ3ZDLENBQUMsQ0FBQztnQkFDQSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsVUFBVTtnQkFDVixXQUFXLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGlCQUFpQixDQUFDO2dCQUMxRCxNQUFNLEVBQUUsSUFBSTthQUNaO1lBQ0YsQ0FBQyxDQUFDO2dCQUNBLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztnQkFDZCxPQUFPLEVBQUUsQ0FBQztnQkFDVixVQUFVO2FBQ1YsQ0FDSCxDQUFBO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQixDQUN4QixNQUEyRDtRQUUzRCxNQUFNLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUNsQyxZQUFZLEVBQ1osbURBQW1ELENBQ25ELENBQUE7UUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNiLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FDbEIsTUFBTSxDQUFDLGtCQUFrQixFQUN6QixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQy9DLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUE7SUFDcEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPLENBQ3BCLFdBQW1CLEVBQ25CLGFBQTREO1FBRTVELEtBQUssTUFBTSxJQUFJLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbEMsSUFBSSxPQUFxQyxDQUFBO1lBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQztvQkFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQzlELElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFBO29CQUNELE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO2dCQUMxQixDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3pCLFNBQVE7Z0JBQ1QsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtZQUN2QixDQUFDO1lBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtZQUNsQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxvQkFBb0IsQ0FDcEYsV0FBVyxFQUNYLFVBQVUsQ0FDVixDQUFBO1lBQ0QsSUFBSSxrQkFBa0IsS0FBSyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzFDLGdEQUFnRDtnQkFDaEQsU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsdUJBQXVCLENBQzVELFdBQVcsRUFDWCxVQUFVLEVBQ1YsT0FBTyxDQUNQLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUExT0ssNkNBQTZDO0lBRWhELFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsMkJBQTJCLENBQUE7SUFFM0IsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsV0FBVyxDQUFBO0dBVlIsNkNBQTZDLENBME9sRCJ9