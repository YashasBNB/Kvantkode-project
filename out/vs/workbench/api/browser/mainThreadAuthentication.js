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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRBdXRoZW50aWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFLTixzQkFBc0IsRUFDdEIsZ0NBQWdDLEVBQ2hDLDZCQUE2QixJQUFJLG1DQUFtQyxHQUdwRSxNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFFTixjQUFjLEVBQ2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGNBQWMsRUFBaUIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRixPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM1RixPQUFPLEVBQWtCLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ2pILE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3pILE9BQU8s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