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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import * as nls from '../../../nls.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IAuthenticationService, IAuthenticationExtensionsService, INTERNAL_AUTH_PROVIDER_PREFIX as INTERNAL_MODEL_AUTH_PROVIDER_PREFIX, } from '../../services/authentication/common/authentication.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../base/common/severity.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { Emitter } from '../../../base/common/event.js';
import { IAuthenticationAccessService } from '../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../services/authentication/browser/authenticationUsageService.js';
import { getAuthenticationProviderActivationEvent } from '../../services/authentication/browser/authenticationService.js';
import { URI } from '../../../base/common/uri.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { CancellationError } from '../../../base/common/errors.js';
import { ILogService } from '../../../platform/log/common/log.js';
export class MainThreadAuthenticationProvider extends Disposable {
    constructor(_proxy, id, label, supportsMultipleAccounts, notificationService, onDidChangeSessionsEmitter) {
        super();
        this._proxy = _proxy;
        this.id = id;
        this.label = label;
        this.supportsMultipleAccounts = supportsMultipleAccounts;
        this.notificationService = notificationService;
        this.onDidChangeSessions = onDidChangeSessionsEmitter.event;
    }
    async getSessions(scopes, options) {
        return this._proxy.$getSessions(this.id, scopes, options);
    }
    createSession(scopes, options) {
        return this._proxy.$createSession(this.id, scopes, options);
    }
    async removeSession(sessionId) {
        await this._proxy.$removeSession(this.id, sessionId);
        this.notificationService.info(nls.localize('signedOut', 'Successfully signed out.'));
    }
}
let MainThreadAuthentication = class MainThreadAuthentication extends Disposable {
    constructor(extHostContext, authenticationService, authenticationExtensionsService, authenticationAccessService, authenticationUsageService, dialogService, notificationService, extensionService, telemetryService, openerService, logService) {
        super();
        this.authenticationService = authenticationService;
        this.authenticationExtensionsService = authenticationExtensionsService;
        this.authenticationAccessService = authenticationAccessService;
        this.authenticationUsageService = authenticationUsageService;
        this.dialogService = dialogService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.telemetryService = telemetryService;
        this.openerService = openerService;
        this.logService = logService;
        this._registrations = this._register(new DisposableMap());
        this._sentProviderUsageEvents = new Set();
        // TODO@TylerLeonhardt this is a temporary addition to telemetry to understand what extensions are overriding the client id.
        // We can use this telemetry to reach out to these extension authors and let them know that they many need configuration changes
        // due to the adoption of the Microsoft broker.
        // Remove this in a few iterations.
        this._sentClientIdUsageEvents = new Set();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostAuthentication);
        this._register(this.authenticationService.onDidChangeSessions((e) => {
            this._proxy.$onDidChangeAuthenticationSessions(e.providerId, e.label);
        }));
        this._register(this.authenticationExtensionsService.onDidChangeAccountPreference((e) => {
            const providerInfo = this.authenticationService.getProvider(e.providerId);
            this._proxy.$onDidChangeAuthenticationSessions(providerInfo.id, providerInfo.label, e.extensionIds);
        }));
    }
    async $registerAuthenticationProvider(id, label, supportsMultipleAccounts) {
        if (!this.authenticationService.declaredProviders.find((p) => p.id === id)) {
            // If telemetry shows that this is not happening much, we can instead throw an error here.
            this.logService.warn(`Authentication provider ${id} was not declared in the Extension Manifest.`);
            this.telemetryService.publicLog2('authentication.providerNotDeclared', { id });
        }
        const emitter = new Emitter();
        this._registrations.set(id, emitter);
        const provider = new MainThreadAuthenticationProvider(this._proxy, id, label, supportsMultipleAccounts, this.notificationService, emitter);
        this.authenticationService.registerAuthenticationProvider(id, provider);
    }
    $unregisterAuthenticationProvider(id) {
        this._registrations.deleteAndDispose(id);
        this.authenticationService.unregisterAuthenticationProvider(id);
    }
    async $ensureProvider(id) {
        if (!this.authenticationService.isAuthenticationProviderRegistered(id)) {
            return await this.extensionService.activateByEvent(getAuthenticationProviderActivationEvent(id), 1 /* ActivationKind.Immediate */);
        }
    }
    $sendDidChangeSessions(providerId, event) {
        const obj = this._registrations.get(providerId);
        if (obj instanceof Emitter) {
            obj.fire(event);
        }
    }
    $removeSession(providerId, sessionId) {
        return this.authenticationService.removeSession(providerId, sessionId);
    }
    async loginPrompt(provider, extensionName, recreatingSession, options) {
        let message;
        // An internal provider is a special case which is for model access only.
        if (provider.id.startsWith(INTERNAL_MODEL_AUTH_PROVIDER_PREFIX)) {
            message = nls.localize('confirmModelAccess', "The extension '{0}' wants to access the language models provided by {1}.", extensionName, provider.label);
        }
        else {
            message = recreatingSession
                ? nls.localize('confirmRelogin', "The extension '{0}' wants you to sign in again using {1}.", extensionName, provider.label)
                : nls.localize('confirmLogin', "The extension '{0}' wants to sign in using {1}.", extensionName, provider.label);
        }
        const buttons = [
            {
                label: nls.localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, '&&Allow'),
                run() {
                    return true;
                },
            },
        ];
        if (options?.learnMore) {
            buttons.push({
                label: nls.localize('learnMore', 'Learn more'),
                run: async () => {
                    const result = this.loginPrompt(provider, extensionName, recreatingSession, options);
                    await this.openerService.open(URI.revive(options.learnMore), { allowCommands: true });
                    return await result;
                },
            });
        }
        const { result } = await this.dialogService.prompt({
            type: Severity.Info,
            message,
            buttons,
            detail: options?.detail,
            cancelButton: true,
        });
        return result ?? false;
    }
    async continueWithIncorrectAccountPrompt(chosenAccountLabel, requestedAccountLabel) {
        const result = await this.dialogService.prompt({
            message: nls.localize('incorrectAccount', 'Incorrect account detected'),
            detail: nls.localize('incorrectAccountDetail', 'The chosen account, {0}, does not match the requested account, {1}.', chosenAccountLabel, requestedAccountLabel),
            type: Severity.Warning,
            cancelButton: true,
            buttons: [
                {
                    label: nls.localize('keep', 'Keep {0}', chosenAccountLabel),
                    run: () => chosenAccountLabel,
                },
                {
                    label: nls.localize('loginWith', 'Login with {0}', requestedAccountLabel),
                    run: () => requestedAccountLabel,
                },
            ],
        });
        if (!result.result) {
            throw new CancellationError();
        }
        return result.result === chosenAccountLabel;
    }
    async doGetSession(providerId, scopes, extensionId, extensionName, options) {
        const sessions = await this.authenticationService.getSessions(providerId, scopes, options.account, true);
        const provider = this.authenticationService.getProvider(providerId);
        // Error cases
        if (options.forceNewSession && options.createIfNone) {
            throw new Error('Invalid combination of options. Please remove one of the following: forceNewSession, createIfNone');
        }
        if (options.forceNewSession && options.silent) {
            throw new Error('Invalid combination of options. Please remove one of the following: forceNewSession, silent');
        }
        if (options.createIfNone && options.silent) {
            throw new Error('Invalid combination of options. Please remove one of the following: createIfNone, silent');
        }
        if (options.clearSessionPreference) {
            // Clearing the session preference is usually paired with createIfNone, so just remove the preference and
            // defer to the rest of the logic in this function to choose the session.
            this._removeAccountPreference(extensionId, providerId, scopes);
        }
        const matchingAccountPreferenceSession = 
        // If an account was passed in, that takes precedence over the account preference
        options.account
            ? // We only support one session per account per set of scopes so grab the first one here
                sessions[0]
            : this._getAccountPreference(extensionId, providerId, scopes, sessions);
        // Check if the sessions we have are valid
        if (!options.forceNewSession && sessions.length) {
            // If we have an existing session preference, use that. If not, we'll return any valid session at the end of this function.
            if (matchingAccountPreferenceSession &&
                this.authenticationAccessService.isAccessAllowed(providerId, matchingAccountPreferenceSession.account.label, extensionId)) {
                return matchingAccountPreferenceSession;
            }
            // If we only have one account for a single auth provider, lets just check if it's allowed and return it if it is.
            if (!provider.supportsMultipleAccounts &&
                this.authenticationAccessService.isAccessAllowed(providerId, sessions[0].account.label, extensionId)) {
                return sessions[0];
            }
        }
        // We may need to prompt because we don't have a valid session
        // modal flows
        if (options.createIfNone || options.forceNewSession) {
            let uiOptions;
            if (typeof options.forceNewSession === 'object') {
                uiOptions = options.forceNewSession;
            }
            else if (typeof options.createIfNone === 'object') {
                uiOptions = options.createIfNone;
            }
            // We only want to show the "recreating session" prompt if we are using forceNewSession & there are sessions
            // that we will be "forcing through".
            const recreatingSession = !!(options.forceNewSession && sessions.length);
            const isAllowed = await this.loginPrompt(provider, extensionName, recreatingSession, uiOptions);
            if (!isAllowed) {
                throw new Error('User did not consent to login.');
            }
            let session;
            if (sessions?.length && !options.forceNewSession) {
                session =
                    provider.supportsMultipleAccounts && !options.account
                        ? await this.authenticationExtensionsService.selectSession(providerId, extensionId, extensionName, scopes, sessions)
                        : sessions[0];
            }
            else {
                const accountToCreate = options.account ?? matchingAccountPreferenceSession?.account;
                do {
                    session = await this.authenticationService.createSession(providerId, scopes, {
                        activateImmediate: true,
                        account: accountToCreate,
                    });
                } while (accountToCreate &&
                    accountToCreate.label !== session.account.label &&
                    !(await this.continueWithIncorrectAccountPrompt(session.account.label, accountToCreate.label)));
            }
            this.authenticationAccessService.updateAllowedExtensions(providerId, session.account.label, [
                { id: extensionId, name: extensionName, allowed: true },
            ]);
            this._updateAccountPreference(extensionId, providerId, session);
            return session;
        }
        // For the silent flows, if we have a session but we don't have a session preference, we'll return the first one that is valid.
        if (!matchingAccountPreferenceSession &&
            !this.authenticationExtensionsService.getAccountPreference(extensionId, providerId)) {
            const validSession = sessions.find((session) => this.authenticationAccessService.isAccessAllowed(providerId, session.account.label, extensionId));
            if (validSession) {
                return validSession;
            }
        }
        // passive flows (silent or default)
        if (!options.silent) {
            // If there is a potential session, but the extension doesn't have access to it, use the "grant access" flow,
            // otherwise request a new one.
            sessions.length
                ? this.authenticationExtensionsService.requestSessionAccess(providerId, extensionId, extensionName, scopes, sessions)
                : await this.authenticationExtensionsService.requestNewSession(providerId, scopes, extensionId, extensionName);
        }
        return undefined;
    }
    async $getSession(providerId, scopes, extensionId, extensionName, options) {
        this.sendClientIdUsageTelemetry(extensionId, providerId, scopes);
        const session = await this.doGetSession(providerId, scopes, extensionId, extensionName, options);
        if (session) {
            this.sendProviderUsageTelemetry(extensionId, providerId);
            this.authenticationUsageService.addAccountUsage(providerId, session.account.label, scopes, extensionId, extensionName);
        }
        return session;
    }
    async $getAccounts(providerId) {
        const accounts = await this.authenticationService.getAccounts(providerId);
        return accounts;
    }
    sendClientIdUsageTelemetry(extensionId, providerId, scopes) {
        const containsVSCodeClientIdScope = scopes.some((scope) => scope.startsWith('VSCODE_CLIENT_ID:'));
        const key = `${extensionId}|${providerId}|${containsVSCodeClientIdScope}`;
        if (this._sentClientIdUsageEvents.has(key)) {
            return;
        }
        this._sentClientIdUsageEvents.add(key);
        if (containsVSCodeClientIdScope) {
            this.telemetryService.publicLog2('authentication.clientIdUsage', { extensionId });
        }
    }
    sendProviderUsageTelemetry(extensionId, providerId) {
        const key = `${extensionId}|${providerId}`;
        if (this._sentProviderUsageEvents.has(key)) {
            return;
        }
        this._sentProviderUsageEvents.add(key);
        this.telemetryService.publicLog2('authentication.providerUsage', { providerId, extensionId });
    }
    //#region Account Preferences
    // TODO@TylerLeonhardt: Update this after a few iterations to no longer fallback to the session preference
    _getAccountPreference(extensionId, providerId, scopes, sessions) {
        if (sessions.length === 0) {
            return undefined;
        }
        const accountNamePreference = this.authenticationExtensionsService.getAccountPreference(extensionId, providerId);
        if (accountNamePreference) {
            const session = sessions.find((session) => session.account.label === accountNamePreference);
            return session;
        }
        const sessionIdPreference = this.authenticationExtensionsService.getSessionPreference(providerId, extensionId, scopes);
        if (sessionIdPreference) {
            const session = sessions.find((session) => session.id === sessionIdPreference);
            if (session) {
                // Migrate the session preference to the account preference
                this.authenticationExtensionsService.updateAccountPreference(extensionId, providerId, session.account);
                return session;
            }
        }
        return undefined;
    }
    _updateAccountPreference(extensionId, providerId, session) {
        this.authenticationExtensionsService.updateAccountPreference(extensionId, providerId, session.account);
        this.authenticationExtensionsService.updateSessionPreference(providerId, extensionId, session);
    }
    _removeAccountPreference(extensionId, providerId, scopes) {
        this.authenticationExtensionsService.removeAccountPreference(extensionId, providerId);
        this.authenticationExtensionsService.removeSessionPreference(providerId, extensionId, scopes);
    }
};
MainThreadAuthentication = __decorate([
    extHostNamedCustomer(MainContext.MainThreadAuthentication),
    __param(1, IAuthenticationService),
    __param(2, IAuthenticationExtensionsService),
    __param(3, IAuthenticationAccessService),
    __param(4, IAuthenticationUsageService),
    __param(5, IDialogService),
    __param(6, INotificationService),
    __param(7, IExtensionService),
    __param(8, ITelemetryService),
    __param(9, IOpenerService),
    __param(10, ILogService)
], MainThreadAuthentication);
export { MainThreadAuthentication };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEF1dGhlbnRpY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUtOLHNCQUFzQixFQUN0QixnQ0FBZ0MsRUFDaEMsNkJBQTZCLElBQUksbUNBQW1DLEdBR3BFLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUVOLGNBQWMsRUFDZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsY0FBYyxFQUFpQixNQUFNLDZDQUE2QyxDQUFBO0FBQzNGLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBa0IsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDbkgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDakgsT0FBTyxFQUFFLHdDQUF3QyxFQUFFLE1BQU0s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