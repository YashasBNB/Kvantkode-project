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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IAuthenticationService } from '../../authentication/common/authentication.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { localize } from '../../../../nls.js';
import { Barrier } from '../../../../base/common/async.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
var DefaultAccountStatus;
(function (DefaultAccountStatus) {
    DefaultAccountStatus["Uninitialized"] = "uninitialized";
    DefaultAccountStatus["Unavailable"] = "unavailable";
    DefaultAccountStatus["Available"] = "available";
})(DefaultAccountStatus || (DefaultAccountStatus = {}));
const CONTEXT_DEFAULT_ACCOUNT_STATE = new RawContextKey('defaultAccountStatus', "uninitialized" /* DefaultAccountStatus.Uninitialized */);
export const IDefaultAccountService = createDecorator('defaultAccountService');
export class DefaultAccountService extends Disposable {
    constructor() {
        super(...arguments);
        this._defaultAccount = undefined;
        this.initBarrier = new Barrier();
        this._onDidChangeDefaultAccount = this._register(new Emitter());
        this.onDidChangeDefaultAccount = this._onDidChangeDefaultAccount.event;
    }
    get defaultAccount() {
        return this._defaultAccount ?? null;
    }
    async getDefaultAccount() {
        await this.initBarrier.wait();
        return this.defaultAccount;
    }
    setDefaultAccount(account) {
        const oldAccount = this._defaultAccount;
        this._defaultAccount = account;
        if (oldAccount !== this._defaultAccount) {
            this._onDidChangeDefaultAccount.fire(this._defaultAccount);
        }
        this.initBarrier.open();
    }
}
export class NullDefaultAccountService extends Disposable {
    constructor() {
        super(...arguments);
        this.onDidChangeDefaultAccount = Event.None;
    }
    async getDefaultAccount() {
        return null;
    }
    setDefaultAccount(account) {
        // noop
    }
}
let DefaultAccountManagementContribution = class DefaultAccountManagementContribution extends Disposable {
    static { this.ID = 'workbench.contributions.defaultAccountManagement'; }
    constructor(defaultAccountService, configurationService, authenticationService, extensionService, productService, requestService, logService, contextKeyService) {
        super();
        this.defaultAccountService = defaultAccountService;
        this.configurationService = configurationService;
        this.authenticationService = authenticationService;
        this.extensionService = extensionService;
        this.productService = productService;
        this.requestService = requestService;
        this.logService = logService;
        this.defaultAccount = null;
        this.accountStatusContext = CONTEXT_DEFAULT_ACCOUNT_STATE.bindTo(contextKeyService);
        this.initialize();
    }
    async initialize() {
        if (!this.productService.defaultAccount) {
            return;
        }
        const { authenticationProvider, tokenEntitlementUrl, chatEntitlementUrl } = this.productService.defaultAccount;
        await this.extensionService.whenInstalledExtensionsRegistered();
        const declaredProvider = this.authenticationService.declaredProviders.find((provider) => provider.id === authenticationProvider.id);
        if (!declaredProvider) {
            this.logService.info(`Default account authentication provider ${authenticationProvider} is not declared.`);
            return;
        }
        this.registerSignInAction(authenticationProvider.id, declaredProvider.label, authenticationProvider.enterpriseProviderId, authenticationProvider.enterpriseProviderConfig, authenticationProvider.scopes);
        this.setDefaultAccount(await this.getDefaultAccountFromAuthenticatedSessions(authenticationProvider.id, authenticationProvider.enterpriseProviderId, authenticationProvider.enterpriseProviderConfig, authenticationProvider.scopes, tokenEntitlementUrl, chatEntitlementUrl));
        this._register(this.authenticationService.onDidChangeSessions(async (e) => {
            if (e.providerId !== authenticationProvider.id &&
                e.providerId !== authenticationProvider.enterpriseProviderId) {
                return;
            }
            if (this.defaultAccount &&
                e.event.removed?.some((session) => session.id === this.defaultAccount?.sessionId)) {
                this.setDefaultAccount(null);
                return;
            }
            this.setDefaultAccount(await this.getDefaultAccountFromAuthenticatedSessions(authenticationProvider.id, authenticationProvider.enterpriseProviderId, authenticationProvider.enterpriseProviderConfig, authenticationProvider.scopes, tokenEntitlementUrl, chatEntitlementUrl));
        }));
    }
    setDefaultAccount(account) {
        this.defaultAccount = account;
        this.defaultAccountService.setDefaultAccount(this.defaultAccount);
        if (this.defaultAccount) {
            this.accountStatusContext.set("available" /* DefaultAccountStatus.Available */);
        }
        else {
            this.accountStatusContext.set("unavailable" /* DefaultAccountStatus.Unavailable */);
        }
    }
    extractFromToken(token, key) {
        const result = new Map();
        const firstPart = token?.split(':')[0];
        const fields = firstPart?.split(';');
        for (const field of fields) {
            const [key, value] = field.split('=');
            result.set(key, value);
        }
        return result.get(key);
    }
    async getDefaultAccountFromAuthenticatedSessions(authProviderId, enterpriseAuthProviderId, enterpriseAuthProviderConfig, scopes, tokenEntitlementUrl, chatEntitlementUrl) {
        const id = this.configurationService.getValue(enterpriseAuthProviderConfig)
            ? enterpriseAuthProviderId
            : authProviderId;
        const sessions = await this.authenticationService.getSessions(id, undefined, undefined, true);
        const session = sessions.find((s) => this.scopesMatch(s.scopes, scopes));
        if (!session) {
            return null;
        }
        const [chatEntitlements, tokenEntitlements] = await Promise.all([
            this.getChatEntitlements(session.accessToken, chatEntitlementUrl),
            this.getTokenEntitlements(session.accessToken, tokenEntitlementUrl),
        ]);
        return {
            sessionId: session.id,
            enterprise: id === enterpriseAuthProviderId || session.account.label.includes('_'),
            ...chatEntitlements,
            ...tokenEntitlements,
        };
    }
    scopesMatch(scopes, expectedScopes) {
        return (scopes.length === expectedScopes.length &&
            expectedScopes.every((scope) => scopes.includes(scope)));
    }
    async getTokenEntitlements(accessToken, tokenEntitlementsUrl) {
        if (!tokenEntitlementsUrl) {
            return {};
        }
        try {
            const chatContext = await this.requestService.request({
                type: 'GET',
                url: tokenEntitlementsUrl,
                disableCache: true,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }, CancellationToken.None);
            const chatData = await asJson(chatContext);
            if (chatData) {
                return {
                    // Editor preview features are disabled if the flag is present and set to 0
                    chat_preview_features_enabled: this.extractFromToken(chatData.token, 'editor_preview_features') !== '0',
                };
            }
            this.logService.error('Failed to fetch token entitlements', 'No data returned');
        }
        catch (error) {
            this.logService.error('Failed to fetch token entitlements', getErrorMessage(error));
        }
        return {};
    }
    async getChatEntitlements(accessToken, chatEntitlementsUrl) {
        if (!chatEntitlementsUrl) {
            return {};
        }
        try {
            const context = await this.requestService.request({
                type: 'GET',
                url: chatEntitlementsUrl,
                disableCache: true,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }, CancellationToken.None);
            const data = await asJson(context);
            if (data) {
                return data;
            }
            this.logService.error('Failed to fetch entitlements', 'No data returned');
        }
        catch (error) {
            this.logService.error('Failed to fetch entitlements', getErrorMessage(error));
        }
        return {};
    }
    registerSignInAction(authProviderId, authProviderLabel, enterpriseAuthProviderId, enterpriseAuthProviderConfig, scopes) {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.accounts.actions.signin',
                    title: localize('sign in', 'Sign in to {0}', authProviderLabel),
                    menu: {
                        id: MenuId.AccountsContext,
                        when: ContextKeyExpr.and(CONTEXT_DEFAULT_ACCOUNT_STATE.isEqualTo("unavailable" /* DefaultAccountStatus.Unavailable */), ContextKeyExpr.has('config.extensions.gallery.serviceUrl')),
                        group: '0_signin',
                    },
                });
            }
            run() {
                const id = that.configurationService.getValue(enterpriseAuthProviderConfig)
                    ? enterpriseAuthProviderId
                    : authProviderId;
                return that.authenticationService.createSession(id, scopes);
            }
        }));
    }
};
DefaultAccountManagementContribution = __decorate([
    __param(0, IDefaultAccountService),
    __param(1, IConfigurationService),
    __param(2, IAuthenticationService),
    __param(3, IExtensionService),
    __param(4, IProductService),
    __param(5, IRequestService),
    __param(6, ILogService),
    __param(7, IContextKeyService)
], DefaultAccountManagementContribution);
export { DefaultAccountManagementContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdEFjY291bnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWNjb3VudHMvY29tbW9uL2RlZmF1bHRBY2NvdW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDdEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFP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