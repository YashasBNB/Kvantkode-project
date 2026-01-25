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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdEFjY291bnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hY2NvdW50cy9jb21tb24vZGVmYXVsdEFjY291bnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xH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