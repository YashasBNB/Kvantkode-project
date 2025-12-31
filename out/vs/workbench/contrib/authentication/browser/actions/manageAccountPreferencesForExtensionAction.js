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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlQWNjb3VudFByZWZlcmVuY2VzRm9yRXh0ZW5zaW9uQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hY3Rpb25zL21hbmFnZUFjY291bnRQcmVmZXJlbmNlc0ZvckV4dGVuc2lvbkFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixrQkFBa0IsR0FJbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBRU4sMkJBQTJCLEdBQzNCLE1BQU0sMkVBQTJFLENBQUE7QUFDbEYsT0FBTyxFQUVOLGdDQUFnQyxFQUNoQyxzQkFBc0IsRUFDdEIsNkJBQTZCLEdBQzdCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFeEYsTUFBTSxPQUFPLDBDQUEyQyxTQUFRLE9BQU87SUFDdEU7UUFDQyxL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