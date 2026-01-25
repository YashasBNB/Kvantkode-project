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
var ChatEntitlementRequests_1, ChatEntitlementContext_1;
import product from '../../../../platform/product/common/product.js';
import { Barrier } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asText, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService, } from '../../../../platform/telemetry/common/telemetry.js';
import { IAuthenticationExtensionsService, IAuthenticationService, } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { ChatContextKeys } from './chatContextKeys.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import Severity from '../../../../base/common/severity.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
export const IChatEntitlementService = createDecorator('chatEntitlementService');
export var ChatEntitlement;
(function (ChatEntitlement) {
    /** Signed out */
    ChatEntitlement[ChatEntitlement["Unknown"] = 1] = "Unknown";
    /** Signed in but not yet resolved */
    ChatEntitlement[ChatEntitlement["Unresolved"] = 2] = "Unresolved";
    /** Signed in and entitled to Limited */
    ChatEntitlement[ChatEntitlement["Available"] = 3] = "Available";
    /** Signed in but not entitled to Limited */
    ChatEntitlement[ChatEntitlement["Unavailable"] = 4] = "Unavailable";
    /** Signed-up to Limited */
    ChatEntitlement[ChatEntitlement["Limited"] = 5] = "Limited";
    /** Signed-up to Pro */
    ChatEntitlement[ChatEntitlement["Pro"] = 6] = "Pro";
})(ChatEntitlement || (ChatEntitlement = {}));
export var ChatSentiment;
(function (ChatSentiment) {
    /** Out of the box value */
    ChatSentiment[ChatSentiment["Standard"] = 1] = "Standard";
    /** Explicitly disabled/hidden by user */
    ChatSentiment[ChatSentiment["Disabled"] = 2] = "Disabled";
    /** Extensions installed */
    ChatSentiment[ChatSentiment["Installed"] = 3] = "Installed";
})(ChatSentiment || (ChatSentiment = {}));
//#region Service Implementation
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    providerId: product.defaultChatAgent?.providerId ?? '',
    enterpriseProviderId: product.defaultChatAgent?.enterpriseProviderId ?? '',
    providerScopes: product.defaultChatAgent?.providerScopes ?? [[]],
    entitlementUrl: product.defaultChatAgent?.entitlementUrl ?? '',
    entitlementSignupLimitedUrl: product.defaultChatAgent?.entitlementSignupLimitedUrl ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    chatQuotaExceededContext: product.defaultChatAgent?.chatQuotaExceededContext ?? '',
    completionsQuotaExceededContext: product.defaultChatAgent?.completionsQuotaExceededContext ?? '',
};
let ChatEntitlementService = class ChatEntitlementService extends Disposable {
    constructor(instantiationService, productService, environmentService, contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        //#endregion
        //#region --- Quotas
        this._onDidChangeQuotaExceeded = this._register(new Emitter());
        this.onDidChangeQuotaExceeded = this._onDidChangeQuotaExceeded.event;
        this._onDidChangeQuotaRemaining = this._register(new Emitter());
        this.onDidChangeQuotaRemaining = this._onDidChangeQuotaRemaining.event;
        this._quotas = {
            chatQuotaExceeded: false,
            completionsQuotaExceeded: false,
            quotaResetDate: undefined,
        };
        this.ExtensionQuotaContextKeys = {
            chatQuotaExceeded: defaultChat.chatQuotaExceededContext,
            completionsQuotaExceeded: defaultChat.completionsQuotaExceededContext,
        };
        //#endregion
        //#region --- Sentiment
        this._onDidChangeSentiment = this._register(new Emitter());
        this.onDidChangeSentiment = this._onDidChangeSentiment.event;
        this.chatQuotaExceededContextKey = ChatContextKeys.chatQuotaExceeded.bindTo(this.contextKeyService);
        this.completionsQuotaExceededContextKey = ChatContextKeys.completionsQuotaExceeded.bindTo(this.contextKeyService);
        this.onDidChangeEntitlement = Event.map(Event.filter(this.contextKeyService.onDidChangeContext, (e) => e.affectsSome(new Set([
            ChatContextKeys.Entitlement.pro.key,
            ChatContextKeys.Entitlement.limited.key,
            ChatContextKeys.Entitlement.canSignUp.key,
            ChatContextKeys.Entitlement.signedOut.key,
        ])), this._store), () => { }, this._store);
        this.onDidChangeSentiment = Event.map(Event.filter(this.contextKeyService.onDidChangeContext, (e) => e.affectsSome(new Set([ChatContextKeys.Setup.hidden.key, ChatContextKeys.Setup.installed.key])), this._store), () => { }, this._store);
        if (!productService.defaultChatAgent || // needs product config
            (isWeb && !environmentService.remoteAuthority) // only enabled locally or a remote backend
        ) {
            ChatContextKeys.Setup.hidden.bindTo(this.contextKeyService).set(true); // hide copilot UI
            return;
        }
        const context = (this.context = new Lazy(() => this._register(instantiationService.createInstance(ChatEntitlementContext))));
        this.requests = new Lazy(() => this._register(instantiationService.createInstance(ChatEntitlementRequests, context.value, {
            clearQuotas: () => this.clearQuotas(),
            acceptQuotas: (quotas) => this.acceptQuotas(quotas),
        })));
        this.registerListeners();
    }
    get entitlement() {
        if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.pro.key) ===
            true) {
            return ChatEntitlement.Pro;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.limited.key) === true) {
            return ChatEntitlement.Limited;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.canSignUp.key) === true) {
            return ChatEntitlement.Available;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.signedOut.key) === true) {
            return ChatEntitlement.Unknown;
        }
        return ChatEntitlement.Unresolved;
    }
    get quotas() {
        return this._quotas;
    }
    registerListeners() {
        const chatQuotaExceededSet = new Set([this.ExtensionQuotaContextKeys.chatQuotaExceeded]);
        const completionsQuotaExceededSet = new Set([
            this.ExtensionQuotaContextKeys.completionsQuotaExceeded,
        ]);
        this._register(this.contextKeyService.onDidChangeContext((e) => {
            let changed = false;
            if (e.affectsSome(chatQuotaExceededSet)) {
                const newChatQuotaExceeded = this.contextKeyService.getContextKeyValue(this.ExtensionQuotaContextKeys.chatQuotaExceeded);
                if (typeof newChatQuotaExceeded === 'boolean' &&
                    newChatQuotaExceeded !== this._quotas.chatQuotaExceeded) {
                    this._quotas = {
                        ...this._quotas,
                        chatQuotaExceeded: newChatQuotaExceeded,
                    };
                    changed = true;
                }
            }
            if (e.affectsSome(completionsQuotaExceededSet)) {
                const newCompletionsQuotaExceeded = this.contextKeyService.getContextKeyValue(this.ExtensionQuotaContextKeys.completionsQuotaExceeded);
                if (typeof newCompletionsQuotaExceeded === 'boolean' &&
                    newCompletionsQuotaExceeded !== this._quotas.completionsQuotaExceeded) {
                    this._quotas = {
                        ...this._quotas,
                        completionsQuotaExceeded: newCompletionsQuotaExceeded,
                    };
                    changed = true;
                }
            }
            if (changed) {
                this.updateContextKeys();
                this._onDidChangeQuotaExceeded.fire();
            }
        }));
    }
    acceptQuotas(quotas) {
        const oldQuota = this._quotas;
        this._quotas = quotas;
        this.updateContextKeys();
        if (oldQuota.chatQuotaExceeded !== this._quotas.chatQuotaExceeded ||
            oldQuota.completionsQuotaExceeded !== this._quotas.completionsQuotaExceeded) {
            this._onDidChangeQuotaExceeded.fire();
        }
        if (oldQuota.chatRemaining !== this._quotas.chatRemaining ||
            oldQuota.completionsRemaining !== this._quotas.completionsRemaining) {
            this._onDidChangeQuotaRemaining.fire();
        }
    }
    clearQuotas() {
        if (this.quotas.chatQuotaExceeded || this.quotas.completionsQuotaExceeded) {
            this.acceptQuotas({
                chatQuotaExceeded: false,
                completionsQuotaExceeded: false,
                quotaResetDate: undefined,
            });
        }
    }
    updateContextKeys() {
        this.chatQuotaExceededContextKey.set(this._quotas.chatQuotaExceeded);
        this.completionsQuotaExceededContextKey.set(this._quotas.completionsQuotaExceeded);
    }
    get sentiment() {
        if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.installed.key) ===
            true) {
            return ChatSentiment.Installed;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.hidden.key) === true) {
            return ChatSentiment.Disabled;
        }
        return ChatSentiment.Standard;
    }
    //#endregion
    async update(token) {
        await this.requests?.value.forceResolveEntitlement(undefined, token);
    }
};
ChatEntitlementService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IProductService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IContextKeyService)
], ChatEntitlementService);
export { ChatEntitlementService };
let ChatEntitlementRequests = ChatEntitlementRequests_1 = class ChatEntitlementRequests extends Disposable {
    static providerId(configurationService) {
        if (configurationService.getValue(`${defaultChat.completionsAdvancedSetting}.authProvider`) === defaultChat.enterpriseProviderId) {
            return defaultChat.enterpriseProviderId;
        }
        return defaultChat.providerId;
    }
    constructor(context, chatQuotasAccessor, telemetryService, authenticationService, logService, requestService, dialogService, openerService, configurationService, authenticationExtensionsService, lifecycleService) {
        super();
        this.context = context;
        this.chatQuotasAccessor = chatQuotasAccessor;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this.logService = logService;
        this.requestService = requestService;
        this.dialogService = dialogService;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.authenticationExtensionsService = authenticationExtensionsService;
        this.lifecycleService = lifecycleService;
        this.pendingResolveCts = new CancellationTokenSource();
        this.didResolveEntitlements = false;
        this.state = { entitlement: this.context.state.entitlement };
        this.registerListeners();
        this.resolve();
    }
    registerListeners() {
        this._register(this.authenticationService.onDidChangeDeclaredProviders(() => this.resolve()));
        this._register(this.authenticationService.onDidChangeSessions((e) => {
            if (e.providerId === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.authenticationService.onDidRegisterAuthenticationProvider((e) => {
            if (e.id === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.authenticationService.onDidUnregisterAuthenticationProvider((e) => {
            if (e.id === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.context.onDidChange(() => {
            if (!this.context.state.installed ||
                this.context.state.entitlement === ChatEntitlement.Unknown) {
                // When the extension is not installed or the user is not entitled
                // make sure to clear quotas so that any indicators are also gone
                this.state = { entitlement: this.state.entitlement, quotas: undefined };
                this.chatQuotasAccessor.clearQuotas();
            }
        }));
    }
    async resolve() {
        this.pendingResolveCts.dispose(true);
        const cts = (this.pendingResolveCts = new CancellationTokenSource());
        const session = await this.findMatchingProviderSession(cts.token);
        if (cts.token.isCancellationRequested) {
            return;
        }
        // Immediately signal whether we have a session or not
        let state = undefined;
        if (session) {
            // Do not overwrite any state we have already
            if (this.state.entitlement === ChatEntitlement.Unknown) {
                state = { entitlement: ChatEntitlement.Unresolved };
            }
        }
        else {
            this.didResolveEntitlements = false; // reset so that we resolve entitlements fresh when signed in again
            state = { entitlement: ChatEntitlement.Unknown };
        }
        if (state) {
            this.update(state);
        }
        if (session && !this.didResolveEntitlements) {
            // Afterwards resolve entitlement with a network request
            // but only unless it was not already resolved before.
            await this.resolveEntitlement(session, cts.token);
        }
    }
    async findMatchingProviderSession(token) {
        const sessions = await this.doGetSessions(ChatEntitlementRequests_1.providerId(this.configurationService));
        if (token.isCancellationRequested) {
            return undefined;
        }
        for (const session of sessions) {
            for (const scopes of defaultChat.providerScopes) {
                if (this.scopesMatch(session.scopes, scopes)) {
                    return session;
                }
            }
        }
        return undefined;
    }
    async doGetSessions(providerId) {
        try {
            return await this.authenticationService.getSessions(providerId);
        }
        catch (error) {
            // ignore - errors can throw if a provider is not registered
        }
        return [];
    }
    scopesMatch(scopes, expectedScopes) {
        return (scopes.length === expectedScopes.length &&
            expectedScopes.every((scope) => scopes.includes(scope)));
    }
    async resolveEntitlement(session, token) {
        const entitlements = await this.doResolveEntitlement(session, token);
        if (typeof entitlements?.entitlement === 'number' && !token.isCancellationRequested) {
            this.didResolveEntitlements = true;
            this.update(entitlements);
        }
        return entitlements;
    }
    async doResolveEntitlement(session, token) {
        if (ChatEntitlementRequests_1.providerId(this.configurationService) ===
            defaultChat.enterpriseProviderId) {
            this.logService.trace('[chat entitlement]: enterprise provider, assuming Pro');
            return { entitlement: ChatEntitlement.Pro };
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        const response = await this.request(defaultChat.entitlementUrl, 'GET', undefined, session, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        if (!response) {
            this.logService.trace('[chat entitlement]: no response');
            return { entitlement: ChatEntitlement.Unresolved };
        }
        if (response.res.statusCode && response.res.statusCode !== 200) {
            this.logService.trace(`[chat entitlement]: unexpected status code ${response.res.statusCode}`);
            return response.res.statusCode === 401 ||
                response.res.statusCode === 403 ||
                response.res.statusCode === 404
                ? { entitlement: ChatEntitlement.Unknown /* treat as signed out */ }
                : { entitlement: ChatEntitlement.Unresolved };
        }
        let responseText = null;
        try {
            responseText = await asText(response);
        }
        catch (error) {
            // ignore - handled below
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        if (!responseText) {
            this.logService.trace('[chat entitlement]: response has no content');
            return { entitlement: ChatEntitlement.Unresolved };
        }
        let entitlementsResponse;
        try {
            entitlementsResponse = JSON.parse(responseText);
            this.logService.trace(`[chat entitlement]: parsed result is ${JSON.stringify(entitlementsResponse)}`);
        }
        catch (err) {
            this.logService.trace(`[chat entitlement]: error parsing response (${err})`);
            return { entitlement: ChatEntitlement.Unresolved };
        }
        let entitlement;
        if (entitlementsResponse.access_type_sku === 'free_limited_copilot') {
            entitlement = ChatEntitlement.Limited;
        }
        else if (entitlementsResponse.can_signup_for_limited) {
            entitlement = ChatEntitlement.Available;
        }
        else if (entitlementsResponse.chat_enabled) {
            entitlement = ChatEntitlement.Pro;
        }
        else {
            entitlement = ChatEntitlement.Unavailable;
        }
        const chatRemaining = entitlementsResponse.limited_user_quotas?.chat;
        const completionsRemaining = entitlementsResponse.limited_user_quotas?.completions;
        const entitlements = {
            entitlement,
            quotas: {
                chatTotal: entitlementsResponse.monthly_quotas?.chat,
                completionsTotal: entitlementsResponse.monthly_quotas?.completions,
                chatRemaining: typeof chatRemaining === 'number' ? Math.max(0, chatRemaining) : undefined,
                completionsRemaining: typeof completionsRemaining === 'number' ? Math.max(0, completionsRemaining) : undefined,
                resetDate: entitlementsResponse.limited_user_reset_date,
            },
        };
        this.logService.trace(`[chat entitlement]: resolved to ${entitlements.entitlement}, quotas: ${JSON.stringify(entitlements.quotas)}`);
        this.telemetryService.publicLog2('chatInstallEntitlement', {
            entitlement: entitlements.entitlement,
            tid: entitlementsResponse.analytics_tracking_id,
            quotaChat: entitlementsResponse.limited_user_quotas?.chat,
            quotaCompletions: entitlementsResponse.limited_user_quotas?.completions,
            quotaResetDate: entitlementsResponse.limited_user_reset_date,
        });
        return entitlements;
    }
    async request(url, type, body, session, token) {
        try {
            return await this.requestService.request({
                type,
                url,
                data: type === 'POST' ? JSON.stringify(body) : undefined,
                disableCache: true,
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            }, token);
        }
        catch (error) {
            if (!token.isCancellationRequested) {
                this.logService.error(`[chat entitlement] request: error ${error}`);
            }
            return undefined;
        }
    }
    update(state) {
        this.state = state;
        this.context.update({ entitlement: this.state.entitlement });
        if (state.quotas) {
            this.chatQuotasAccessor.acceptQuotas({
                chatQuotaExceeded: typeof state.quotas.chatRemaining === 'number' ? state.quotas.chatRemaining <= 0 : false,
                completionsQuotaExceeded: typeof state.quotas.completionsRemaining === 'number'
                    ? state.quotas.completionsRemaining <= 0
                    : false,
                quotaResetDate: state.quotas.resetDate ? new Date(state.quotas.resetDate) : undefined,
                chatTotal: state.quotas.chatTotal,
                completionsTotal: state.quotas.completionsTotal,
                chatRemaining: state.quotas.chatRemaining,
                completionsRemaining: state.quotas.completionsRemaining,
            });
        }
    }
    async forceResolveEntitlement(session, token = CancellationToken.None) {
        if (!session) {
            session = await this.findMatchingProviderSession(token);
        }
        if (!session) {
            return undefined;
        }
        return this.resolveEntitlement(session, token);
    }
    async signUpLimited(session) {
        const body = {
            restricted_telemetry: this.telemetryService.telemetryLevel === 0 /* TelemetryLevel.NONE */ ? 'disabled' : 'enabled',
            public_code_suggestions: 'enabled',
        };
        const response = await this.request(defaultChat.entitlementSignupLimitedUrl, 'POST', body, session, CancellationToken.None);
        if (!response) {
            const retry = await this.onUnknownSignUpError(localize('signUpNoResponseError', 'No response received.'), '[chat entitlement] sign-up: no response');
            return retry ? this.signUpLimited(session) : { errorCode: 1 };
        }
        if (response.res.statusCode && response.res.statusCode !== 200) {
            if (response.res.statusCode === 422) {
                try {
                    const responseText = await asText(response);
                    if (responseText) {
                        const responseError = JSON.parse(responseText);
                        if (typeof responseError.message === 'string' && responseError.message) {
                            this.onUnprocessableSignUpError(`[chat entitlement] sign-up: unprocessable entity (${responseError.message})`, responseError.message);
                            return { errorCode: response.res.statusCode };
                        }
                    }
                }
                catch (error) {
                    // ignore - handled below
                }
            }
            const retry = await this.onUnknownSignUpError(localize('signUpUnexpectedStatusError', 'Unexpected status code {0}.', response.res.statusCode), `[chat entitlement] sign-up: unexpected status code ${response.res.statusCode}`);
            return retry ? this.signUpLimited(session) : { errorCode: response.res.statusCode };
        }
        let responseText = null;
        try {
            responseText = await asText(response);
        }
        catch (error) {
            // ignore - handled below
        }
        if (!responseText) {
            const retry = await this.onUnknownSignUpError(localize('signUpNoResponseContentsError', 'Response has no contents.'), '[chat entitlement] sign-up: response has no content');
            return retry ? this.signUpLimited(session) : { errorCode: 2 };
        }
        let parsedResult = undefined;
        try {
            parsedResult = JSON.parse(responseText);
            this.logService.trace(`[chat entitlement] sign-up: response is ${responseText}`);
        }
        catch (err) {
            const retry = await this.onUnknownSignUpError(localize('signUpInvalidResponseError', 'Invalid response contents.'), `[chat entitlement] sign-up: error parsing response (${err})`);
            return retry ? this.signUpLimited(session) : { errorCode: 3 };
        }
        // We have made it this far, so the user either did sign-up or was signed-up already.
        // That is, because the endpoint throws in all other case according to Patrick.
        this.update({ entitlement: ChatEntitlement.Limited });
        return Boolean(parsedResult?.subscribed);
    }
    async onUnknownSignUpError(detail, logMessage) {
        this.logService.error(logMessage);
        if (!this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSignUpError', 'An error occurred while signing up for the Copilot Free plan. Would you like to try again?'),
                detail,
                primaryButton: localize('retry', 'Retry'),
            });
            return confirmed;
        }
        return false;
    }
    onUnprocessableSignUpError(logMessage, logDetails) {
        this.logService.error(logMessage);
        if (!this.lifecycleService.willShutdown) {
            this.dialogService.prompt({
                type: Severity.Error,
                message: localize('unprocessableSignUpError', 'An error occurred while signing up for the Copilot Free plan.'),
                detail: logDetails,
                buttons: [
                    {
                        label: localize('ok', 'OK'),
                        run: () => {
                            /* noop */
                        },
                    },
                    {
                        label: localize('learnMore', 'Learn More'),
                        run: () => this.openerService.open(URI.parse(defaultChat.upgradePlanUrl)),
                    },
                ],
            });
        }
    }
    async signIn() {
        const providerId = ChatEntitlementRequests_1.providerId(this.configurationService);
        const session = await this.authenticationService.createSession(providerId, defaultChat.providerScopes[0]);
        this.authenticationExtensionsService.updateAccountPreference(defaultChat.extensionId, providerId, session.account);
        this.authenticationExtensionsService.updateAccountPreference(defaultChat.chatExtensionId, providerId, session.account);
        const entitlements = await this.forceResolveEntitlement(session);
        return { session, entitlements };
    }
    dispose() {
        this.pendingResolveCts.dispose(true);
        super.dispose();
    }
};
ChatEntitlementRequests = ChatEntitlementRequests_1 = __decorate([
    __param(2, ITelemetryService),
    __param(3, IAuthenticationService),
    __param(4, ILogService),
    __param(5, IRequestService),
    __param(6, IDialogService),
    __param(7, IOpenerService),
    __param(8, IConfigurationService),
    __param(9, IAuthenticationExtensionsService),
    __param(10, ILifecycleService)
], ChatEntitlementRequests);
export { ChatEntitlementRequests };
let ChatEntitlementContext = class ChatEntitlementContext extends Disposable {
    static { ChatEntitlementContext_1 = this; }
    static { this.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY = 'chat.setupContext'; }
    get state() {
        return this.suspendedState ?? this._state;
    }
    constructor(contextKeyService, storageService, extensionEnablementService, logService, extensionsWorkbenchService) {
        super();
        this.storageService = storageService;
        this.extensionEnablementService = extensionEnablementService;
        this.logService = logService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.suspendedState = undefined;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.updateBarrier = undefined;
        this.canSignUpContextKey = ChatContextKeys.Entitlement.canSignUp.bindTo(contextKeyService);
        this.signedOutContextKey = ChatContextKeys.Entitlement.signedOut.bindTo(contextKeyService);
        this.limitedContextKey = ChatContextKeys.Entitlement.limited.bindTo(contextKeyService);
        this.proContextKey = ChatContextKeys.Entitlement.pro.bindTo(contextKeyService);
        this.hiddenContext = ChatContextKeys.Setup.hidden.bindTo(contextKeyService);
        this.installedContext = ChatContextKeys.Setup.installed.bindTo(contextKeyService);
        this._state = this.storageService.getObject(ChatEntitlementContext_1.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY, 0 /* StorageScope.PROFILE */) ?? { entitlement: ChatEntitlement.Unknown };
        this.checkExtensionInstallation();
        this.updateContextSync();
    }
    async checkExtensionInstallation() {
        // Await extensions to be ready to be queried
        await this.extensionsWorkbenchService.queryLocal();
        // Listen to change and process extensions once
        this._register(Event.runAndSubscribe(this.extensionsWorkbenchService.onChange, (e) => {
            if (e && !ExtensionIdentifier.equals(e.identifier.id, defaultChat.extensionId)) {
                return; // unrelated event
            }
            const defaultChatExtension = this.extensionsWorkbenchService.local.find((value) => ExtensionIdentifier.equals(value.identifier.id, defaultChat.extensionId));
            this.update({
                installed: !!defaultChatExtension?.local &&
                    this.extensionEnablementService.isEnabled(defaultChatExtension.local),
            });
        }));
    }
    update(context) {
        this.logService.trace(`[chat entitlement context] update(): ${JSON.stringify(context)}`);
        if (typeof context.installed === 'boolean') {
            this._state.installed = context.installed;
            if (context.installed) {
                context.hidden = false; // allows to fallback if the extension is uninstalled
            }
        }
        if (typeof context.hidden === 'boolean') {
            this._state.hidden = context.hidden;
        }
        if (typeof context.entitlement === 'number') {
            this._state.entitlement = context.entitlement;
            if (this._state.entitlement === ChatEntitlement.Limited ||
                this._state.entitlement === ChatEntitlement.Pro) {
                this._state.registered = true;
            }
            else if (this._state.entitlement === ChatEntitlement.Available) {
                this._state.registered = false; // only reset when signed-in user can sign-up for limited
            }
        }
        this.storageService.store(ChatEntitlementContext_1.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY, this._state, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return this.updateContext();
    }
    async updateContext() {
        await this.updateBarrier?.wait();
        this.updateContextSync();
    }
    updateContextSync() {
        this.logService.trace(`[chat entitlement context] updateContext(): ${JSON.stringify(this._state)}`);
        this.signedOutContextKey.set(this._state.entitlement === ChatEntitlement.Unknown);
        this.canSignUpContextKey.set(this._state.entitlement === ChatEntitlement.Available);
        this.limitedContextKey.set(this._state.entitlement === ChatEntitlement.Limited);
        this.proContextKey.set(this._state.entitlement === ChatEntitlement.Pro);
        this.hiddenContext.set(!!this._state.hidden);
        this.installedContext.set(!!this._state.installed);
        this._onDidChange.fire();
    }
    suspend() {
        this.suspendedState = { ...this._state };
        this.updateBarrier = new Barrier();
    }
    resume() {
        this.suspendedState = undefined;
        this.updateBarrier?.open();
        this.updateBarrier = undefined;
    }
};
ChatEntitlementContext = ChatEntitlementContext_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IStorageService),
    __param(2, IWorkbenchExtensionEnablementService),
    __param(3, ILogService),
    __param(4, IExtensionsWorkbenchService)
], ChatEntitlementContext);
export { ChatEntitlementContext };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVudGl0bGVtZW50U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdEVudGl0bGVtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxPQUFPLE1BQU0sZ0RBQWdELENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQ04sZUFBZSxFQUNmLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFl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