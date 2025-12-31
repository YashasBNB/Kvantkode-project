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
import { Disposable, DisposableStore, dispose, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Severity } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IActivityService, NumberBadge } from '../../activity/common/activity.js';
import { IAuthenticationAccessService } from './authenticationAccessService.js';
import { IAuthenticationUsageService } from './authenticationUsageService.js';
import { IAuthenticationService, IAuthenticationExtensionsService, } from '../common/authentication.js';
import { Emitter } from '../../../../base/common/event.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
// OAuth2 spec prohibits space in a scope, so use that to join them.
const SCOPESLIST_SEPARATOR = ' ';
// TODO@TylerLeonhardt: This should all go in MainThreadAuthentication
let AuthenticationExtensionsService = class AuthenticationExtensionsService extends Disposable {
    constructor(activityService, storageService, dialogService, quickInputService, _productService, _authenticationService, _authenticationUsageService, _authenticationAccessService) {
        super();
        this.activityService = activityService;
        this.storageService = storageService;
        this.dialogService = dialogService;
        this.quickInputService = quickInputService;
        this._productService = _productService;
        this._authenticationService = _authenticationService;
        this._authenticationUsageService = _authenticationUsageService;
        this._authenticationAccessService = _authenticationAccessService;
        this._signInRequestItems = new Map();
        this._sessionAccessRequestItems = new Map();
        this._accountBadgeDisposable = this._register(new MutableDisposable());
        this._onDidAccountPreferenceChange = this._register(new Emitter());
        this.onDidChangeAccountPreference = this._onDidAccountPreferenceChange.event;
        this._inheritAuthAccountPreferenceParentToChildren =
            this._productService.inheritAuthAccountPreference || {};
        this._inheritAuthAccountPreferenceChildToParent = Object.entries(this._inheritAuthAccountPreferenceParentToChildren).reduce((acc, [parent, children]) => {
            children.forEach((child) => {
                acc[child] = parent;
            });
            return acc;
        }, {});
        this.registerListeners();
    }
    registerListeners() {
        this._register(this._authenticationService.onDidChangeSessions(async (e) => {
            if (e.event.added?.length) {
                await this.updateNewSessionRequests(e.providerId, e.event.added);
            }
            if (e.event.removed?.length) {
                await this.updateAccessRequests(e.providerId, e.event.removed);
            }
            this.updateBadgeCount();
        }));
        this._register(this._authenticationService.onDidUnregisterAuthenticationProvider((e) => {
            const accessRequests = this._sessionAccessRequestItems.get(e.id) || {};
            Object.keys(accessRequests).forEach((extensionId) => {
                this.removeAccessRequest(e.id, extensionId);
            });
        }));
    }
    async updateNewSessionRequests(providerId, addedSessions) {
        const existingRequestsForProvider = this._signInRequestItems.get(providerId);
        if (!existingRequestsForProvider) {
            return;
        }
        Object.keys(existingRequestsForProvider).forEach((requestedScopes) => {
            if (addedSessions.some((session) => session.scopes.slice().join(SCOPESLIST_SEPARATOR) === requestedScopes)) {
                const sessionRequest = existingRequestsForProvider[requestedScopes];
                sessionRequest?.disposables.forEach((item) => item.dispose());
                delete existingRequestsForProvider[requestedScopes];
                if (Object.keys(existingRequestsForProvider).length === 0) {
                    this._signInRequestItems.delete(providerId);
                }
                else {
                    this._signInRequestItems.set(providerId, existingRequestsForProvider);
                }
            }
        });
    }
    async updateAccessRequests(providerId, removedSessions) {
        const providerRequests = this._sessionAccessRequestItems.get(providerId);
        if (providerRequests) {
            Object.keys(providerRequests).forEach((extensionId) => {
                removedSessions.forEach((removed) => {
                    const indexOfSession = providerRequests[extensionId].possibleSessions.findIndex((session) => session.id === removed.id);
                    if (indexOfSession) {
                        providerRequests[extensionId].possibleSessions.splice(indexOfSession, 1);
                    }
                });
                if (!providerRequests[extensionId].possibleSessions.length) {
                    this.removeAccessRequest(providerId, extensionId);
                }
            });
        }
    }
    updateBadgeCount() {
        this._accountBadgeDisposable.clear();
        let numberOfRequests = 0;
        this._signInRequestItems.forEach((providerRequests) => {
            Object.keys(providerRequests).forEach((request) => {
                numberOfRequests += providerRequests[request].requestingExtensionIds.length;
            });
        });
        this._sessionAccessRequestItems.forEach((accessRequest) => {
            numberOfRequests += Object.keys(accessRequest).length;
        });
        if (numberOfRequests > 0) {
            const badge = new NumberBadge(numberOfRequests, () => nls.localize('sign in', 'Sign in requested'));
            this._accountBadgeDisposable.value = this.activityService.showAccountsActivity({ badge });
        }
    }
    removeAccessRequest(providerId, extensionId) {
        const providerRequests = this._sessionAccessRequestItems.get(providerId) || {};
        if (providerRequests[extensionId]) {
            dispose(providerRequests[extensionId].disposables);
            delete providerRequests[extensionId];
            this.updateBadgeCount();
        }
    }
    //#region Account/Session Preference
    updateAccountPreference(extensionId, providerId, account) {
        const realExtensionId = ExtensionIdentifier.toKey(extensionId);
        const parentExtensionId = this._inheritAuthAccountPreferenceChildToParent[realExtensionId] ?? realExtensionId;
        const key = this._getKey(parentExtensionId, providerId);
        // Store the preference in the workspace and application storage. This allows new workspaces to
        // have a preference set already to limit the number of prompts that are shown... but also allows
        // a specific workspace to override the global preference.
        this.storageService.store(key, account.label, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this.storageService.store(key, account.label, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const childrenExtensions = this._inheritAuthAccountPreferenceParentToChildren[parentExtensionId];
        const extensionIds = childrenExtensions
            ? [parentExtensionId, ...childrenExtensions]
            : [parentExtensionId];
        this._onDidAccountPreferenceChange.fire({ extensionIds, providerId });
    }
    getAccountPreference(extensionId, providerId) {
        const realExtensionId = ExtensionIdentifier.toKey(extensionId);
        const key = this._getKey(this._inheritAuthAccountPreferenceChildToParent[realExtensionId] ?? realExtensionId, providerId);
        // If a preference is set in the workspace, use that. Otherwise, use the global preference.
        return (this.storageService.get(key, 1 /* StorageScope.WORKSPACE */) ??
            this.storageService.get(key, -1 /* StorageScope.APPLICATION */));
    }
    removeAccountPreference(extensionId, providerId) {
        const realExtensionId = ExtensionIdentifier.toKey(extensionId);
        const key = this._getKey(this._inheritAuthAccountPreferenceChildToParent[realExtensionId] ?? realExtensionId, providerId);
        // This won't affect any other workspaces that have a preference set, but it will remove the preference
        // for this workspace and the global preference. This is only paired with a call to updateSessionPreference...
        // so we really don't _need_ to remove them as they are about to be overridden anyway... but it's more correct
        // to remove them first... and in case this gets called from somewhere else in the future.
        this.storageService.remove(key, 1 /* StorageScope.WORKSPACE */);
        this.storageService.remove(key, -1 /* StorageScope.APPLICATION */);
    }
    _getKey(extensionId, providerId) {
        return `${extensionId}-${providerId}`;
    }
    // TODO@TylerLeonhardt: Remove all of this after a couple iterations
    updateSessionPreference(providerId, extensionId, session) {
        const realExtensionId = ExtensionIdentifier.toKey(extensionId);
        // The 3 parts of this key are important:
        // * Extension id: The extension that has a preference
        // * Provider id: The provider that the preference is for
        // * The scopes: The subset of sessions that the preference applies to
        const key = `${realExtensionId}-${providerId}-${session.scopes.join(SCOPESLIST_SEPARATOR)}`;
        // Store the preference in the workspace and application storage. This allows new workspaces to
        // have a preference set already to limit the number of prompts that are shown... but also allows
        // a specific workspace to override the global preference.
        this.storageService.store(key, session.id, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this.storageService.store(key, session.id, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getSessionPreference(providerId, extensionId, scopes) {
        const realExtensionId = ExtensionIdentifier.toKey(extensionId);
        // The 3 parts of this key are important:
        // * Extension id: The extension that has a preference
        // * Provider id: The provider that the preference is for
        // * The scopes: The subset of sessions that the preference applies to
        const key = `${realExtensionId}-${providerId}-${scopes.join(SCOPESLIST_SEPARATOR)}`;
        // If a preference is set in the workspace, use that. Otherwise, use the global preference.
        return (this.storageService.get(key, 1 /* StorageScope.WORKSPACE */) ??
            this.storageService.get(key, -1 /* StorageScope.APPLICATION */));
    }
    removeSessionPreference(providerId, extensionId, scopes) {
        const realExtensionId = ExtensionIdentifier.toKey(extensionId);
        // The 3 parts of this key are important:
        // * Extension id: The extension that has a preference
        // * Provider id: The provider that the preference is for
        // * The scopes: The subset of sessions that the preference applies to
        const key = `${realExtensionId}-${providerId}-${scopes.join(SCOPESLIST_SEPARATOR)}`;
        // This won't affect any other workspaces that have a preference set, but it will remove the preference
        // for this workspace and the global preference. This is only paired with a call to updateSessionPreference...
        // so we really don't _need_ to remove them as they are about to be overridden anyway... but it's more correct
        // to remove them first... and in case this gets called from somewhere else in the future.
        this.storageService.remove(key, 1 /* StorageScope.WORKSPACE */);
        this.storageService.remove(key, -1 /* StorageScope.APPLICATION */);
    }
    _updateAccountAndSessionPreferences(providerId, extensionId, session) {
        this.updateAccountPreference(extensionId, providerId, session.account);
        this.updateSessionPreference(providerId, extensionId, session);
    }
    //#endregion
    async showGetSessionPrompt(provider, accountName, extensionId, extensionName) {
        let SessionPromptChoice;
        (function (SessionPromptChoice) {
            SessionPromptChoice[SessionPromptChoice["Allow"] = 0] = "Allow";
            SessionPromptChoice[SessionPromptChoice["Deny"] = 1] = "Deny";
            SessionPromptChoice[SessionPromptChoice["Cancel"] = 2] = "Cancel";
        })(SessionPromptChoice || (SessionPromptChoice = {}));
        const { result } = await this.dialogService.prompt({
            type: Severity.Info,
            message: nls.localize('confirmAuthenticationAccess', "The extension '{0}' wants to access the {1} account '{2}'.", extensionName, provider.label, accountName),
            buttons: [
                {
                    label: nls.localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, '&&Allow'),
                    run: () => SessionPromptChoice.Allow,
                },
                {
                    label: nls.localize({ key: 'deny', comment: ['&& denotes a mnemonic'] }, '&&Deny'),
                    run: () => SessionPromptChoice.Deny,
                },
            ],
            cancelButton: {
                run: () => SessionPromptChoice.Cancel,
            },
        });
        if (result !== SessionPromptChoice.Cancel) {
            this._authenticationAccessService.updateAllowedExtensions(provider.id, accountName, [
                { id: extensionId, name: extensionName, allowed: result === SessionPromptChoice.Allow },
            ]);
            this.removeAccessRequest(provider.id, extensionId);
        }
        return result === SessionPromptChoice.Allow;
    }
    /**
     * This function should be used only when there are sessions to disambiguate.
     */
    async selectSession(providerId, extensionId, extensionName, scopes, availableSessions) {
        const allAccounts = await this._authenticationService.getAccounts(providerId);
        if (!allAccounts.length) {
            throw new Error('No accounts available');
        }
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick());
        quickPick.ignoreFocusOut = true;
        const accountsWithSessions = new Set();
        const items = availableSessions
            // Only grab the first account
            .filter((session) => !accountsWithSessions.has(session.account.label) &&
            accountsWithSessions.add(session.account.label))
            .map((session) => {
            return {
                label: session.account.label,
                session: session,
            };
        });
        // Add the additional accounts that have been logged into the provider but are
        // don't have a session yet.
        allAccounts.forEach((account) => {
            if (!accountsWithSessions.has(account.label)) {
                items.push({ label: account.label, account });
            }
        });
        items.push({ label: nls.localize('useOtherAccount', 'Sign in to another account') });
        quickPick.items = items;
        quickPick.title = nls.localize({
            key: 'selectAccount',
            comment: [
                'The placeholder {0} is the name of an extension. {1} is the name of the type of account, such as Microsoft or GitHub.',
            ],
        }, "The extension '{0}' wants to access a {1} account", extensionName, this._authenticationService.getProvider(providerId).label);
        quickPick.placeholder = nls.localize('getSessionPlateholder', "Select an account for '{0}' to use or Esc to cancel", extensionName);
        return await new Promise((resolve, reject) => {
            disposables.add(quickPick.onDidAccept(async (_) => {
                quickPick.dispose();
                let session = quickPick.selectedItems[0].session;
                if (!session) {
                    const account = quickPick.selectedItems[0].account;
                    try {
                        session = await this._authenticationService.createSession(providerId, scopes, {
                            account,
                        });
                    }
                    catch (e) {
                        reject(e);
                        return;
                    }
                }
                const accountName = session.account.label;
                this._authenticationAccessService.updateAllowedExtensions(providerId, accountName, [
                    { id: extensionId, name: extensionName, allowed: true },
                ]);
                this._updateAccountAndSessionPreferences(providerId, extensionId, session);
                this.removeAccessRequest(providerId, extensionId);
                resolve(session);
            }));
            disposables.add(quickPick.onDidHide((_) => {
                if (!quickPick.selectedItems[0]) {
                    reject('User did not consent to account access');
                }
                disposables.dispose();
            }));
            quickPick.show();
        });
    }
    async completeSessionAccessRequest(provider, extensionId, extensionName, scopes) {
        const providerRequests = this._sessionAccessRequestItems.get(provider.id) || {};
        const existingRequest = providerRequests[extensionId];
        if (!existingRequest) {
            return;
        }
        if (!provider) {
            return;
        }
        const possibleSessions = existingRequest.possibleSessions;
        let session;
        if (provider.supportsMultipleAccounts) {
            try {
                session = await this.selectSession(provider.id, extensionId, extensionName, scopes, possibleSessions);
            }
            catch (_) {
                // ignore cancel
            }
        }
        else {
            const approved = await this.showGetSessionPrompt(provider, possibleSessions[0].account.label, extensionId, extensionName);
            if (approved) {
                session = possibleSessions[0];
            }
        }
        if (session) {
            this._authenticationUsageService.addAccountUsage(provider.id, session.account.label, session.scopes, extensionId, extensionName);
        }
    }
    requestSessionAccess(providerId, extensionId, extensionName, scopes, possibleSessions) {
        const providerRequests = this._sessionAccessRequestItems.get(providerId) || {};
        const hasExistingRequest = providerRequests[extensionId];
        if (hasExistingRequest) {
            return;
        }
        const provider = this._authenticationService.getProvider(providerId);
        const menuItem = MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
            group: '3_accessRequests',
            command: {
                id: `${providerId}${extensionId}Access`,
                title: nls.localize({
                    key: 'accessRequest',
                    comment: [
                        `The placeholder {0} will be replaced with an authentication provider''s label. {1} will be replaced with an extension name. (1) is to indicate that this menu item contributes to a badge count`,
                    ],
                }, 'Grant access to {0} for {1}... (1)', provider.label, extensionName),
            },
        });
        const accessCommand = CommandsRegistry.registerCommand({
            id: `${providerId}${extensionId}Access`,
            handler: async (accessor) => {
                this.completeSessionAccessRequest(provider, extensionId, extensionName, scopes);
            },
        });
        providerRequests[extensionId] = { possibleSessions, disposables: [menuItem, accessCommand] };
        this._sessionAccessRequestItems.set(providerId, providerRequests);
        this.updateBadgeCount();
    }
    async requestNewSession(providerId, scopes, extensionId, extensionName) {
        if (!this._authenticationService.isAuthenticationProviderRegistered(providerId)) {
            // Activate has already been called for the authentication provider, but it cannot block on registering itself
            // since this is sync and returns a disposable. So, wait for registration event to fire that indicates the
            // provider is now in the map.
            await new Promise((resolve, _) => {
                const dispose = this._authenticationService.onDidRegisterAuthenticationProvider((e) => {
                    if (e.id === providerId) {
                        dispose.dispose();
                        resolve();
                    }
                });
            });
        }
        let provider;
        try {
            provider = this._authenticationService.getProvider(providerId);
        }
        catch (_e) {
            return;
        }
        const providerRequests = this._signInRequestItems.get(providerId);
        const scopesList = scopes.join(SCOPESLIST_SEPARATOR);
        const extensionHasExistingRequest = providerRequests &&
            providerRequests[scopesList] &&
            providerRequests[scopesList].requestingExtensionIds.includes(extensionId);
        if (extensionHasExistingRequest) {
            return;
        }
        // Construct a commandId that won't clash with others generated here, nor likely with an extension's command
        const commandId = `${providerId}:${extensionId}:signIn${Object.keys(providerRequests || []).length}`;
        const menuItem = MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
            group: '2_signInRequests',
            command: {
                id: commandId,
                title: nls.localize({
                    key: 'signInRequest',
                    comment: [
                        `The placeholder {0} will be replaced with an authentication provider's label. {1} will be replaced with an extension name. (1) is to indicate that this menu item contributes to a badge count.`,
                    ],
                }, 'Sign in with {0} to use {1} (1)', provider.label, extensionName),
            },
        });
        const signInCommand = CommandsRegistry.registerCommand({
            id: commandId,
            handler: async (accessor) => {
                const authenticationService = accessor.get(IAuthenticationService);
                const session = await authenticationService.createSession(providerId, scopes);
                this._authenticationAccessService.updateAllowedExtensions(providerId, session.account.label, [{ id: extensionId, name: extensionName, allowed: true }]);
                this._updateAccountAndSessionPreferences(providerId, extensionId, session);
            },
        });
        if (providerRequests) {
            const existingRequest = providerRequests[scopesList] || {
                disposables: [],
                requestingExtensionIds: [],
            };
            providerRequests[scopesList] = {
                disposables: [...existingRequest.disposables, menuItem, signInCommand],
                requestingExtensionIds: [...existingRequest.requestingExtensionIds, extensionId],
            };
            this._signInRequestItems.set(providerId, providerRequests);
        }
        else {
            this._signInRequestItems.set(providerId, {
                [scopesList]: {
                    disposables: [menuItem, signInCommand],
                    requestingExtensionIds: [extensionId],
                },
            });
        }
        this.updateBadgeCount();
    }
};
AuthenticationExtensionsService = __decorate([
    __param(0, IActivityService),
    __param(1, IStorageService),
    __param(2, IDialogService),
    __param(3, IQuickInputService),
    __param(4, IProductService),
    __param(5, IAuthenticationService),
    __param(6, IAuthenticationUsageService),
    __param(7, IAuthenticationAccessService)
], AuthenticationExtensionsService);
export { AuthenticationExtensionsService };
registerSingleton(IAuthenticationExtensionsService, AuthenticationExtensionsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25FeHRlbnNpb25zU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi9icm93c2VyL2F1dGhlbnRpY2F0aW9uRXh0ZW5zaW9uc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsT0FBTyxFQUVQLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdFLE9BQU8sRUFHTixzQkFBc0IsRUFDdEIsZ0NBQWdDLEdBRWhDLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMs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