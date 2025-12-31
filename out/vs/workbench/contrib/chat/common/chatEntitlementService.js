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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVudGl0bGVtZW50U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRFbnRpdGxlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDMUYsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBRU4sZ0NBQWdDLEVBQ2hDLHNCQUFzQixHQUN0QixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzFILE9BQU8sRUFBYywyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVuRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FDbkMsZUFBZSxDQUEwQix3QkFBd0IsQ0FBQyxDQUFBO0FBRW5FLE1BQU0sQ0FBTixJQUFZLGVBYVg7QUFiRCxXQUFZLGVBQWU7SUFDMUIsaUJBQWlCO0lBQ2pCLDJEQUFXLENBQUE7SUFDWCxxQ0FBcUM7SUFDckMsaUVBQVUsQ0FBQTtJQUNWLHdDQUF3QztJQUN4QywrREFBUyxDQUFBO0lBQ1QsNENBQTRDO0lBQzVDLG1FQUFXLENBQUE7SUFDWCwyQkFBMkI7SUFDM0IsMkRBQU8sQ0FBQTtJQUNQLHVCQUF1QjtJQUN2QixtREFBRyxDQUFBO0FBQ0osQ0FBQyxFQWJXLGVBQWUsS0FBZixlQUFlLFFBYTFCO0FBRUQsTUFBTSxDQUFOLElBQVksYUFPWDtBQVBELFdBQVksYUFBYTtJQUN4QiwyQkFBMkI7SUFDM0IseURBQVksQ0FBQTtJQUNaLHlDQUF5QztJQUN6Qyx5REFBWSxDQUFBO0lBQ1osMkJBQTJCO0lBQzNCLDJEQUFhLENBQUE7QUFDZCxDQUFDLEVBUFcsYUFBYSxLQUFiLGFBQWEsUUFPeEI7QUFpQ0QsZ0NBQWdDO0FBRWhDLE1BQU0sV0FBVyxHQUFHO0lBQ25CLFdBQVcsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxJQUFJLEVBQUU7SUFDeEQsZUFBZSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLElBQUksRUFBRTtJQUNoRSxjQUFjLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsSUFBSSxFQUFFO0lBQzlELFVBQVUsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxJQUFJLEVBQUU7SUFDdEQsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixJQUFJLEVBQUU7SUFDMUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDaEUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLElBQUksRUFBRTtJQUM5RCwyQkFBMkIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsMkJBQTJCLElBQUksRUFBRTtJQUN4RiwwQkFBMEIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsMEJBQTBCLElBQUksRUFBRTtJQUN0Rix3QkFBd0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsd0JBQXdCLElBQUksRUFBRTtJQUNsRiwrQkFBK0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsK0JBQStCLElBQUksRUFBRTtDQUNoRyxDQUFBO0FBT00sSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBTXJELFlBQ3dCLG9CQUEyQyxFQUNqRCxjQUErQixFQUNsQixrQkFBZ0QsRUFDMUQsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFBO1FBRjhCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFrRzNFLFlBQVk7UUFFWixvQkFBb0I7UUFFSCw4QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN2RSw2QkFBd0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFBO1FBRXZELCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3hFLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUE7UUFFbEUsWUFBTyxHQUFnQjtZQUM5QixpQkFBaUIsRUFBRSxLQUFLO1lBQ3hCLHdCQUF3QixFQUFFLEtBQUs7WUFDL0IsY0FBYyxFQUFFLFNBQVM7U0FDekIsQ0FBQTtRQVFPLDhCQUF5QixHQUFHO1lBQ25DLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyx3QkFBd0I7WUFDdkQsd0JBQXdCLEVBQUUsV0FBVyxDQUFDLCtCQUErQjtTQUNyRSxDQUFBO1FBc0ZELFlBQVk7UUFFWix1QkFBdUI7UUFFTiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNuRSx5QkFBb0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO1FBbE4vRCxJQUFJLENBQUMsMkJBQTJCLEdBQUcsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FDMUUsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFBO1FBQ0QsSUFBSSxDQUFDLGtDQUFrQyxHQUFHLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQ3hGLElBQUksQ0FBQyxpQkFBaUIsQ0FDdEIsQ0FBQTtRQUVELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUN0QyxLQUFLLENBQUMsTUFBTSxDQUNYLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFDekMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxXQUFXLENBQ1osSUFBSSxHQUFHLENBQUM7WUFDUCxlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ25DLGVBQWUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUc7WUFDdkMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRztZQUN6QyxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHO1NBQ3pDLENBQUMsQ0FDRixFQUNGLElBQUksQ0FBQyxNQUFNLENBQ1gsRUFDRCxHQUFHLEVBQUUsR0FBRSxDQUFDLEVBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFBO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ3BDLEtBQUssQ0FBQyxNQUFNLENBQ1gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixFQUN6QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLFdBQVcsQ0FDWixJQUFJLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUNoRixFQUNGLElBQUksQ0FBQyxNQUFNLENBQ1gsRUFDRCxHQUFHLEVBQUUsR0FBRSxDQUFDLEVBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFBO1FBRUQsSUFDQyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsSUFBSSx1QkFBdUI7WUFDM0QsQ0FBQyxLQUFLLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQywyQ0FBMkM7VUFDekYsQ0FBQztZQUNGLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQyxrQkFBa0I7WUFDeEYsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FDM0UsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FDN0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRTtZQUMzRSxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNyQyxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO1NBQ25ELENBQUMsQ0FDRixDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBTUQsSUFBSSxXQUFXO1FBQ2QsSUFDQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQVUsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3ZGLElBQUksRUFDSCxDQUFDO1lBQ0YsT0FBTyxlQUFlLENBQUMsR0FBRyxDQUFBO1FBQzNCLENBQUM7YUFBTSxJQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDeEMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUN2QyxLQUFLLElBQUksRUFDVCxDQUFDO1lBQ0YsT0FBTyxlQUFlLENBQUMsT0FBTyxDQUFBO1FBQy9CLENBQUM7YUFBTSxJQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDeEMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUN6QyxLQUFLLElBQUksRUFDVCxDQUFDO1lBQ0YsT0FBTyxlQUFlLENBQUMsU0FBUyxDQUFBO1FBQ2pDLENBQUM7YUFBTSxJQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDeEMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUN6QyxLQUFLLElBQUksRUFDVCxDQUFDO1lBQ0YsT0FBTyxlQUFlLENBQUMsT0FBTyxDQUFBO1FBQy9CLENBQUM7UUFFRCxPQUFPLGVBQWUsQ0FBQyxVQUFVLENBQUE7SUFDbEMsQ0FBQztJQWlCRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQVVPLGlCQUFpQjtRQUN4QixNQUFNLG9CQUFvQixHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtRQUN4RixNQUFNLDJCQUEyQixHQUFHLElBQUksR0FBRyxDQUFDO1lBQzNDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyx3QkFBd0I7U0FDdkQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMvQyxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7WUFDbkIsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQ3JFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxpQkFBaUIsQ0FDaEQsQ0FBQTtnQkFDRCxJQUNDLE9BQU8sb0JBQW9CLEtBQUssU0FBUztvQkFDekMsb0JBQW9CLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFDdEQsQ0FBQztvQkFDRixJQUFJLENBQUMsT0FBTyxHQUFHO3dCQUNkLEdBQUcsSUFBSSxDQUFDLE9BQU87d0JBQ2YsaUJBQWlCLEVBQUUsb0JBQW9CO3FCQUN2QyxDQUFBO29CQUNELE9BQU8sR0FBRyxJQUFJLENBQUE7Z0JBQ2YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDO2dCQUNoRCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDNUUsSUFBSSxDQUFDLHlCQUF5QixDQUFDLHdCQUF3QixDQUN2RCxDQUFBO2dCQUNELElBQ0MsT0FBTywyQkFBMkIsS0FBSyxTQUFTO29CQUNoRCwyQkFBMkIsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUNwRSxDQUFDO29CQUNGLElBQUksQ0FBQyxPQUFPLEdBQUc7d0JBQ2QsR0FBRyxJQUFJLENBQUMsT0FBTzt3QkFDZix3QkFBd0IsRUFBRSwyQkFBMkI7cUJBQ3JELENBQUE7b0JBQ0QsT0FBTyxHQUFHLElBQUksQ0FBQTtnQkFDZixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7Z0JBQ3hCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN0QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsTUFBbUI7UUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUV4QixJQUNDLFFBQVEsQ0FBQyxpQkFBaUIsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQjtZQUM3RCxRQUFRLENBQUMsd0JBQXdCLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFDMUUsQ0FBQztZQUNGLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsSUFDQyxRQUFRLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYTtZQUNyRCxRQUFRLENBQUMsb0JBQW9CLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFDbEUsQ0FBQztZQUNGLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN2QyxDQUFDO0lBQ0YsQ0FBQztJQUVELFdBQVc7UUFDVixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQzNFLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ2pCLGlCQUFpQixFQUFFLEtBQUs7Z0JBQ3hCLHdCQUF3QixFQUFFLEtBQUs7Z0JBQy9CLGNBQWMsRUFBRSxTQUFTO2FBQ3pCLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQ25GLENBQUM7SUFTRCxJQUFJLFNBQVM7UUFDWixJQUNDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBVSxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7WUFDdkYsSUFBSSxFQUNILENBQUM7WUFDRixPQUFPLGFBQWEsQ0FBQyxTQUFTLENBQUE7UUFDL0IsQ0FBQzthQUFNLElBQ04sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFVLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFDNUYsQ0FBQztZQUNGLE9BQU8sYUFBYSxDQUFDLFFBQVEsQ0FBQTtRQUM5QixDQUFDO1FBRUQsT0FBTyxhQUFhLENBQUMsUUFBUSxDQUFBO0lBQzlCLENBQUM7SUFFRCxZQUFZO0lBRVosS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUF3QjtRQUNwQyxNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0NBQ0QsQ0FBQTtBQXRQWSxzQkFBc0I7SUFPaEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxrQkFBa0IsQ0FBQTtHQVZSLHNCQUFzQixDQXNQbEM7O0FBNkVNLElBQU0sdUJBQXVCLCtCQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFDdEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxvQkFBMkM7UUFDNUQsSUFDQyxvQkFBb0IsQ0FBQyxRQUFRLENBQzVCLEdBQUcsV0FBVyxDQUFDLDBCQUEwQixlQUFlLENBQ3hELEtBQUssV0FBVyxDQUFDLG9CQUFvQixFQUNyQyxDQUFDO1lBQ0YsT0FBTyxXQUFXLENBQUMsb0JBQW9CLENBQUE7UUFDeEMsQ0FBQztRQUVELE9BQU8sV0FBVyxDQUFDLFVBQVUsQ0FBQTtJQUM5QixDQUFDO0lBT0QsWUFDa0IsT0FBK0IsRUFDL0Isa0JBQXVDLEVBQ3JDLGdCQUFvRCxFQUMvQyxxQkFBOEQsRUFDekUsVUFBd0MsRUFDcEMsY0FBZ0QsRUFDakQsYUFBOEMsRUFDOUMsYUFBOEMsRUFDdkMsb0JBQTRELEVBRW5GLCtCQUFrRixFQUMvRCxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUE7UUFiVSxZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3BCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDOUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUN4RCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ25CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNoQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDN0Isa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3RCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFbEUsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQUM5QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBZmhFLHNCQUFpQixHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUNqRCwyQkFBc0IsR0FBRyxLQUFLLENBQUE7UUFrQnJDLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUE7UUFFNUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFFeEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdGLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEQsSUFBSSxDQUFDLENBQUMsVUFBVSxLQUFLLHlCQUF1QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUNwRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEUsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLHlCQUF1QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUM1RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEUsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLHlCQUF1QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUM1RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQzdCLElBQ0MsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLE9BQU8sRUFDekQsQ0FBQztnQkFDRixrRUFBa0U7Z0JBQ2xFLGlFQUFpRTtnQkFDakUsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUE7Z0JBQ3ZFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUN0QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsT0FBTztRQUNwQixJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO1FBRXBFLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUN2QyxPQUFNO1FBQ1AsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxJQUFJLEtBQUssR0FBOEIsU0FBUyxDQUFBO1FBQ2hELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYiw2Q0FBNkM7WUFDN0MsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3hELEtBQUssR0FBRyxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDcEQsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQSxDQUFDLG1FQUFtRTtZQUN2RyxLQUFLLEdBQUcsRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2pELENBQUM7UUFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQixDQUFDO1FBRUQsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM3Qyx3REFBd0Q7WUFDeEQsc0RBQXNEO1lBQ3RELE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsMkJBQTJCLENBQ3hDLEtBQXdCO1FBRXhCLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FDeEMseUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUM3RCxDQUFBO1FBQ0QsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNoQyxLQUFLLE1BQU0sTUFBTSxJQUFJLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDakQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDOUMsT0FBTyxPQUFPLENBQUE7Z0JBQ2YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQUMsVUFBa0I7UUFDN0MsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsNERBQTREO1FBQzdELENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFTyxXQUFXLENBQUMsTUFBNkIsRUFBRSxjQUF3QjtRQUMxRSxPQUFPLENBQ04sTUFBTSxDQUFDLE1BQU0sS0FBSyxjQUFjLENBQUMsTUFBTTtZQUN2QyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQ3ZELENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUMvQixPQUE4QixFQUM5QixLQUF3QjtRQUV4QixNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEUsSUFBSSxPQUFPLFlBQVksRUFBRSxXQUFXLEtBQUssUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDckYsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQTtZQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzFCLENBQUM7UUFFRCxPQUFPLFlBQVksQ0FBQTtJQUNwQixDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUNqQyxPQUE4QixFQUM5QixLQUF3QjtRQUV4QixJQUNDLHlCQUF1QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUM7WUFDN0QsV0FBVyxDQUFDLG9CQUFvQixFQUMvQixDQUFDO1lBQ0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQTtZQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUM1QyxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUNsQyxXQUFXLENBQUMsY0FBYyxFQUMxQixLQUFLLEVBQ0wsU0FBUyxFQUNULE9BQU8sRUFDUCxLQUFLLENBQ0wsQ0FBQTtRQUNELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7WUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbkQsQ0FBQztRQUVELElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDaEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsOENBQThDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtZQUM5RixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEdBQUc7Z0JBQ3JDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEdBQUc7Z0JBQy9CLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEdBQUc7Z0JBQy9CLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFFO2dCQUNwRSxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQy9DLENBQUM7UUFFRCxJQUFJLFlBQVksR0FBa0IsSUFBSSxDQUFBO1FBQ3RDLElBQUksQ0FBQztZQUNKLFlBQVksR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQix5QkFBeUI7UUFDMUIsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFBO1lBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ25ELENBQUM7UUFFRCxJQUFJLG9CQUEyQyxDQUFBO1FBQy9DLElBQUksQ0FBQztZQUNKLG9CQUFvQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDL0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLHdDQUF3QyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FDOUUsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsK0NBQStDLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbkQsQ0FBQztRQUVELElBQUksV0FBNEIsQ0FBQTtRQUNoQyxJQUFJLG9CQUFvQixDQUFDLGVBQWUsS0FBSyxzQkFBc0IsRUFBRSxDQUFDO1lBQ3JFLFdBQVcsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFBO1FBQ3RDLENBQUM7YUFBTSxJQUFJLG9CQUFvQixDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDeEQsV0FBVyxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUE7UUFDeEMsQ0FBQzthQUFNLElBQUksb0JBQW9CLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDOUMsV0FBVyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUE7UUFDbEMsQ0FBQzthQUFNLENBQUM7WUFDUCxXQUFXLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQTtRQUMxQyxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFBO1FBQ3BFLE1BQU0sb0JBQW9CLEdBQUcsb0JBQW9CLENBQUMsbUJBQW1CLEVBQUUsV0FBVyxDQUFBO1FBRWxGLE1BQU0sWUFBWSxHQUFrQjtZQUNuQyxXQUFXO1lBQ1gsTUFBTSxFQUFFO2dCQUNQLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxjQUFjLEVBQUUsSUFBSTtnQkFDcEQsZ0JBQWdCLEVBQUUsb0JBQW9CLENBQUMsY0FBYyxFQUFFLFdBQVc7Z0JBQ2xFLGFBQWEsRUFBRSxPQUFPLGFBQWEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUN6RixvQkFBb0IsRUFDbkIsT0FBTyxvQkFBb0IsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQ3pGLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyx1QkFBdUI7YUFDdkQ7U0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLG1DQUFtQyxZQUFZLENBQUMsV0FBVyxhQUFhLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQzdHLENBQUE7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUMvQix3QkFBd0IsRUFDeEI7WUFDQyxXQUFXLEVBQUUsWUFBWSxDQUFDLFdBQVc7WUFDckMsR0FBRyxFQUFFLG9CQUFvQixDQUFDLHFCQUFxQjtZQUMvQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsbUJBQW1CLEVBQUUsSUFBSTtZQUN6RCxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxtQkFBbUIsRUFBRSxXQUFXO1lBQ3ZFLGNBQWMsRUFBRSxvQkFBb0IsQ0FBQyx1QkFBdUI7U0FDNUQsQ0FDRCxDQUFBO1FBRUQsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQWdCTyxLQUFLLENBQUMsT0FBTyxDQUNwQixHQUFXLEVBQ1gsSUFBb0IsRUFDcEIsSUFBd0IsRUFDeEIsT0FBOEIsRUFDOUIsS0FBd0I7UUFFeEIsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUN2QztnQkFDQyxJQUFJO2dCQUNKLEdBQUc7Z0JBQ0gsSUFBSSxFQUFFLElBQUksS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQ3hELFlBQVksRUFBRSxJQUFJO2dCQUNsQixPQUFPLEVBQUU7b0JBQ1IsYUFBYSxFQUFFLFVBQVUsT0FBTyxDQUFDLFdBQVcsRUFBRTtpQkFDOUM7YUFDRCxFQUNELEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUNwRSxDQUFDO1lBRUQsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFTyxNQUFNLENBQUMsS0FBb0I7UUFDbEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFFbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBRTVELElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7Z0JBQ3BDLGlCQUFpQixFQUNoQixPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO2dCQUN6Rix3QkFBd0IsRUFDdkIsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFvQixLQUFLLFFBQVE7b0JBQ3BELENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFvQixJQUFJLENBQUM7b0JBQ3hDLENBQUMsQ0FBQyxLQUFLO2dCQUNULGNBQWMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDckYsU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUztnQkFDakMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQy9DLGFBQWEsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLGFBQWE7Z0JBQ3pDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CO2FBQ3ZELENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUM1QixPQUEwQyxFQUMxQyxLQUFLLEdBQUcsaUJBQWlCLENBQUMsSUFBSTtRQUU5QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDeEQsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQ2xCLE9BQThCO1FBSTlCLE1BQU0sSUFBSSxHQUFHO1lBQ1osb0JBQW9CLEVBQ25CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLGdDQUF3QixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDdEYsdUJBQXVCLEVBQUUsU0FBUztTQUNsQyxDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUNsQyxXQUFXLENBQUMsMkJBQTJCLEVBQ3ZDLE1BQU0sRUFDTixJQUFJLEVBQ0osT0FBTyxFQUNQLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtRQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUM1QyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUMsRUFDMUQseUNBQXlDLENBQ3pDLENBQUE7WUFDRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUE7UUFDOUQsQ0FBQztRQUVELElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDaEUsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDO29CQUNKLE1BQU0sWUFBWSxHQUFHLE1BQU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUMzQyxJQUFJLFlBQVksRUFBRSxDQUFDO3dCQUNsQixNQUFNLGFBQWEsR0FBd0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTt3QkFDbkUsSUFBSSxPQUFPLGFBQWEsQ0FBQyxPQUFPLEtBQUssUUFBUSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQzs0QkFDeEUsSUFBSSxDQUFDLDBCQUEwQixDQUM5QixxREFBcUQsYUFBYSxDQUFDLE9BQU8sR0FBRyxFQUM3RSxhQUFhLENBQUMsT0FBTyxDQUNyQixDQUFBOzRCQUNELE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQTt3QkFDOUMsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIseUJBQXlCO2dCQUMxQixDQUFDO1lBQ0YsQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUM1QyxRQUFRLENBQ1AsNkJBQTZCLEVBQzdCLDZCQUE2QixFQUM3QixRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FDdkIsRUFDRCxzREFBc0QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FDL0UsQ0FBQTtZQUNELE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3BGLENBQUM7UUFFRCxJQUFJLFlBQVksR0FBa0IsSUFBSSxDQUFBO1FBQ3RDLElBQUksQ0FBQztZQUNKLFlBQVksR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQix5QkFBeUI7UUFDMUIsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FDNUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLDJCQUEyQixDQUFDLEVBQ3RFLHFEQUFxRCxDQUNyRCxDQUFBO1lBQ0QsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFBO1FBQzlELENBQUM7UUFFRCxJQUFJLFlBQVksR0FBd0MsU0FBUyxDQUFBO1FBQ2pFLElBQUksQ0FBQztZQUNKLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQzVDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSw0QkFBNEIsQ0FBQyxFQUNwRSx1REFBdUQsR0FBRyxHQUFHLENBQzdELENBQUE7WUFDRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUE7UUFDOUQsQ0FBQztRQUVELHFGQUFxRjtRQUNyRiwrRUFBK0U7UUFDL0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUVyRCxPQUFPLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFjLEVBQUUsVUFBa0I7UUFDcEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFakMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN6QyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDdEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUNwQixPQUFPLEVBQUUsUUFBUSxDQUNoQixvQkFBb0IsRUFDcEIsNEZBQTRGLENBQzVGO2dCQUNELE1BQU07Z0JBQ04sYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO2FBQ3pDLENBQUMsQ0FBQTtZQUVGLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxVQUFrQixFQUFFLFVBQWtCO1FBQ3hFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRWpDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7Z0JBQ3pCLElBQUksRUFBRSxRQUFRLENBQUMsS0FBSztnQkFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsMEJBQTBCLEVBQzFCLCtEQUErRCxDQUMvRDtnQkFDRCxNQUFNLEVBQUUsVUFBVTtnQkFDbEIsT0FBTyxFQUFFO29CQUNSO3dCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQzt3QkFDM0IsR0FBRyxFQUFFLEdBQUcsRUFBRTs0QkFDVCxVQUFVO3dCQUNYLENBQUM7cUJBQ0Q7b0JBQ0Q7d0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDO3dCQUMxQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7cUJBQ3pFO2lCQUNEO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTTtRQUNYLE1BQU0sVUFBVSxHQUFHLHlCQUF1QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUNoRixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQzdELFVBQVUsRUFDVixXQUFXLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUM3QixDQUFBO1FBRUQsSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUMzRCxXQUFXLENBQUMsV0FBVyxFQUN2QixVQUFVLEVBQ1YsT0FBTyxDQUFDLE9BQU8sQ0FDZixDQUFBO1FBQ0QsSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUMzRCxXQUFXLENBQUMsZUFBZSxFQUMzQixVQUFVLEVBQ1YsT0FBTyxDQUFDLE9BQU8sQ0FDZixDQUFBO1FBRUQsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFcEMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCxDQUFBO0FBdmdCWSx1QkFBdUI7SUFxQmpDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxZQUFBLGlCQUFpQixDQUFBO0dBOUJQLHVCQUF1QixDQXVnQm5DOztBQWFNLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTs7YUFDN0IseUNBQW9DLEdBQUcsbUJBQW1CLEFBQXRCLENBQXNCO0lBV2xGLElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQzFDLENBQUM7SUFPRCxZQUNxQixpQkFBcUMsRUFDeEMsY0FBZ0QsRUFFakUsMEJBQWlGLEVBQ3BFLFVBQXdDLEVBRXJELDBCQUF3RTtRQUV4RSxLQUFLLEVBQUUsQ0FBQTtRQVAyQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFFaEQsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFzQztRQUNuRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRXBDLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7UUFqQmpFLG1CQUFjLEdBQTZDLFNBQVMsQ0FBQTtRQUszRCxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzFELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFFdEMsa0JBQWEsR0FBd0IsU0FBUyxDQUFBO1FBYXJELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUMxRixJQUFJLENBQUMsbUJBQW1CLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3RGLElBQUksQ0FBQyxhQUFhLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDOUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUMzRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFakYsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FDMUMsd0JBQXNCLENBQUMsb0NBQW9DLCtCQUUzRCxJQUFJLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUU3QyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8sS0FBSyxDQUFDLDBCQUEwQjtRQUN2Qyw2Q0FBNkM7UUFDN0MsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxFQUFFLENBQUE7UUFFbEQsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLGVBQWUsQ0FDcEIsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFDeEMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNoRixPQUFNLENBQUMsa0JBQWtCO1lBQzFCLENBQUM7WUFFRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDakYsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FDeEUsQ0FBQTtZQUNELElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ1gsU0FBUyxFQUNSLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLO29CQUM3QixJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQzthQUN0RSxDQUFDLENBQUE7UUFDSCxDQUFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUtELE1BQU0sQ0FBQyxPQUlOO1FBQ0EsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsd0NBQXdDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXhGLElBQUksT0FBTyxPQUFPLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUE7WUFFekMsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBLENBQUMscURBQXFEO1lBQzdFLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUNwQyxDQUFDO1FBRUQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQTtZQUU3QyxJQUNDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxPQUFPO2dCQUNuRCxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsR0FBRyxFQUM5QyxDQUFDO2dCQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtZQUM5QixDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNsRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUEsQ0FBQyx5REFBeUQ7WUFDekYsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsd0JBQXNCLENBQUMsb0NBQW9DLEVBQzNELElBQUksQ0FBQyxNQUFNLDhEQUdYLENBQUE7UUFFRCxPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRU8sS0FBSyxDQUFDLGFBQWE7UUFDMUIsTUFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFBO1FBRWhDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLCtDQUErQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUM1RSxDQUFBO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakYsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFbEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUN4QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7SUFDbkMsQ0FBQztJQUVELE1BQU07UUFDTCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQTtRQUMvQixJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFBO1FBQzFCLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFBO0lBQy9CLENBQUM7O0FBckpXLHNCQUFzQjtJQXNCaEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsb0NBQW9DLENBQUE7SUFFcEMsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLDJCQUEyQixDQUFBO0dBM0JqQixzQkFBc0IsQ0FzSmxDOztBQUVELFlBQVkifQ==