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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, isDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IAuthenticationAccessService } from './authenticationAccessService.js';
import { IAuthenticationService, } from '../common/authentication.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
export function getAuthenticationProviderActivationEvent(id) {
    return `onAuthenticationRequest:${id}`;
}
export async function getCurrentAuthenticationSessionInfo(secretStorageService, productService) {
    const authenticationSessionValue = await secretStorageService.get(`${productService.urlProtocol}.loginAccount`);
    if (authenticationSessionValue) {
        try {
            const authenticationSessionInfo = JSON.parse(authenticationSessionValue);
            if (authenticationSessionInfo &&
                isString(authenticationSessionInfo.id) &&
                isString(authenticationSessionInfo.accessToken) &&
                isString(authenticationSessionInfo.providerId)) {
                return authenticationSessionInfo;
            }
        }
        catch (e) {
            // This is a best effort operation.
            console.error(`Failed parsing current auth session value: ${e}`);
        }
    }
    return undefined;
}
const authenticationDefinitionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        id: {
            type: 'string',
            description: localize('authentication.id', 'The id of the authentication provider.'),
        },
        label: {
            type: 'string',
            description: localize('authentication.label', 'The human readable name of the authentication provider.'),
        },
    },
};
const authenticationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'authentication',
    jsonSchema: {
        description: localize({ key: 'authenticationExtensionPoint', comment: [`'Contributes' means adds here`] }, 'Contributes authentication'),
        type: 'array',
        items: authenticationDefinitionSchema,
    },
    activationEventsGenerator: (authenticationProviders, result) => {
        for (const authenticationProvider of authenticationProviders) {
            if (authenticationProvider.id) {
                result.push(`onAuthenticationRequest:${authenticationProvider.id}`);
            }
        }
    },
});
let AuthenticationService = class AuthenticationService extends Disposable {
    constructor(_extensionService, authenticationAccessService, _environmentService, _logService) {
        super();
        this._extensionService = _extensionService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._onDidRegisterAuthenticationProvider = this._register(new Emitter());
        this.onDidRegisterAuthenticationProvider = this._onDidRegisterAuthenticationProvider.event;
        this._onDidUnregisterAuthenticationProvider = this._register(new Emitter());
        this.onDidUnregisterAuthenticationProvider = this._onDidUnregisterAuthenticationProvider.event;
        this._onDidChangeSessions = this._register(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._onDidChangeDeclaredProviders = this._register(new Emitter());
        this.onDidChangeDeclaredProviders = this._onDidChangeDeclaredProviders.event;
        this._authenticationProviders = new Map();
        this._authenticationProviderDisposables = this._register(new DisposableMap());
        this._declaredProviders = [];
        this._register(authenticationAccessService.onDidChangeExtensionSessionAccess((e) => {
            // The access has changed, not the actual session itself but extensions depend on this event firing
            // when they have gained access to an account so this fires that event.
            this._onDidChangeSessions.fire({
                providerId: e.providerId,
                label: e.accountName,
                event: {
                    added: [],
                    changed: [],
                    removed: [],
                },
            });
        }));
        this._registerEnvContributedAuthenticationProviders();
        this._registerAuthenticationExtentionPointHandler();
    }
    get declaredProviders() {
        return this._declaredProviders;
    }
    _registerEnvContributedAuthenticationProviders() {
        if (!this._environmentService.options?.authenticationProviders?.length) {
            return;
        }
        for (const provider of this._environmentService.options.authenticationProviders) {
            this.registerDeclaredAuthenticationProvider(provider);
            this.registerAuthenticationProvider(provider.id, provider);
        }
    }
    _registerAuthenticationExtentionPointHandler() {
        this._register(authenticationExtPoint.setHandler((_extensions, { added, removed }) => {
            this._logService.debug(`Found authentication providers. added: ${added.length}, removed: ${removed.length}`);
            added.forEach((point) => {
                for (const provider of point.value) {
                    if (isFalsyOrWhitespace(provider.id)) {
                        point.collector.error(localize('authentication.missingId', 'An authentication contribution must specify an id.'));
                        continue;
                    }
                    if (isFalsyOrWhitespace(provider.label)) {
                        point.collector.error(localize('authentication.missingLabel', 'An authentication contribution must specify a label.'));
                        continue;
                    }
                    if (!this.declaredProviders.some((p) => p.id === provider.id)) {
                        this.registerDeclaredAuthenticationProvider(provider);
                        this._logService.debug(`Declared authentication provider: ${provider.id}`);
                    }
                    else {
                        point.collector.error(localize('authentication.idConflict', "This authentication id '{0}' has already been registered", provider.id));
                    }
                }
            });
            const removedExtPoints = removed.flatMap((r) => r.value);
            removedExtPoints.forEach((point) => {
                const provider = this.declaredProviders.find((provider) => provider.id === point.id);
                if (provider) {
                    this.unregisterDeclaredAuthenticationProvider(provider.id);
                    this._logService.debug(`Undeclared authentication provider: ${provider.id}`);
                }
            });
        }));
    }
    registerDeclaredAuthenticationProvider(provider) {
        if (isFalsyOrWhitespace(provider.id)) {
            throw new Error(localize('authentication.missingId', 'An authentication contribution must specify an id.'));
        }
        if (isFalsyOrWhitespace(provider.label)) {
            throw new Error(localize('authentication.missingLabel', 'An authentication contribution must specify a label.'));
        }
        if (this.declaredProviders.some((p) => p.id === provider.id)) {
            throw new Error(localize('authentication.idConflict', "This authentication id '{0}' has already been registered", provider.id));
        }
        this._declaredProviders.push(provider);
        this._onDidChangeDeclaredProviders.fire();
    }
    unregisterDeclaredAuthenticationProvider(id) {
        const index = this.declaredProviders.findIndex((provider) => provider.id === id);
        if (index > -1) {
            this.declaredProviders.splice(index, 1);
        }
        this._onDidChangeDeclaredProviders.fire();
    }
    isAuthenticationProviderRegistered(id) {
        return this._authenticationProviders.has(id);
    }
    registerAuthenticationProvider(id, authenticationProvider) {
        this._authenticationProviders.set(id, authenticationProvider);
        const disposableStore = new DisposableStore();
        disposableStore.add(authenticationProvider.onDidChangeSessions((e) => this._onDidChangeSessions.fire({
            providerId: id,
            label: authenticationProvider.label,
            event: e,
        })));
        if (isDisposable(authenticationProvider)) {
            disposableStore.add(authenticationProvider);
        }
        this._authenticationProviderDisposables.set(id, disposableStore);
        this._onDidRegisterAuthenticationProvider.fire({ id, label: authenticationProvider.label });
    }
    unregisterAuthenticationProvider(id) {
        const provider = this._authenticationProviders.get(id);
        if (provider) {
            this._authenticationProviders.delete(id);
            this._onDidUnregisterAuthenticationProvider.fire({ id, label: provider.label });
        }
        this._authenticationProviderDisposables.deleteAndDispose(id);
    }
    getProviderIds() {
        const providerIds = [];
        this._authenticationProviders.forEach((provider) => {
            providerIds.push(provider.id);
        });
        return providerIds;
    }
    getProvider(id) {
        if (this._authenticationProviders.has(id)) {
            return this._authenticationProviders.get(id);
        }
        throw new Error(`No authentication provider '${id}' is currently registered.`);
    }
    async getAccounts(id) {
        // TODO: Cache this
        const sessions = await this.getSessions(id);
        const accounts = new Array();
        const seenAccounts = new Set();
        for (const session of sessions) {
            if (!seenAccounts.has(session.account.label)) {
                seenAccounts.add(session.account.label);
                accounts.push(session.account);
            }
        }
        return accounts;
    }
    async getSessions(id, scopes, account, activateImmediate = false) {
        const authProvider = this._authenticationProviders.get(id) ||
            (await this.tryActivateProvider(id, activateImmediate));
        if (authProvider) {
            return await authProvider.getSessions(scopes, { account });
        }
        else {
            throw new Error(`No authentication provider '${id}' is currently registered.`);
        }
    }
    async createSession(id, scopes, options) {
        const authProvider = this._authenticationProviders.get(id) ||
            (await this.tryActivateProvider(id, !!options?.activateImmediate));
        if (authProvider) {
            return await authProvider.createSession(scopes, {
                account: options?.account,
            });
        }
        else {
            throw new Error(`No authentication provider '${id}' is currently registered.`);
        }
    }
    async removeSession(id, sessionId) {
        const authProvider = this._authenticationProviders.get(id);
        if (authProvider) {
            return authProvider.removeSession(sessionId);
        }
        else {
            throw new Error(`No authentication provider '${id}' is currently registered.`);
        }
    }
    async tryActivateProvider(providerId, activateImmediate) {
        await this._extensionService.activateByEvent(getAuthenticationProviderActivationEvent(providerId), activateImmediate ? 1 /* ActivationKind.Immediate */ : 0 /* ActivationKind.Normal */);
        let provider = this._authenticationProviders.get(providerId);
        if (provider) {
            return provider;
        }
        const store = new DisposableStore();
        // When activate has completed, the extension has made the call to `registerAuthenticationProvider`.
        // However, activate cannot block on this, so the renderer may not have gotten the event yet.
        const didRegister = new Promise((resolve, _) => {
            store.add(Event.once(this.onDidRegisterAuthenticationProvider)((e) => {
                if (e.id === providerId) {
                    provider = this._authenticationProviders.get(providerId);
                    if (provider) {
                        resolve(provider);
                    }
                    else {
                        throw new Error(`No authentication provider '${providerId}' is currently registered.`);
                    }
                }
            }));
        });
        const didTimeout = new Promise((_, reject) => {
            const handle = setTimeout(() => {
                reject('Timed out waiting for authentication provider to register');
            }, 5000);
            store.add(toDisposable(() => clearTimeout(handle)));
        });
        return Promise.race([didRegister, didTimeout]).finally(() => store.dispose());
    }
};
AuthenticationService = __decorate([
    __param(0, IExtensionService),
    __param(1, IAuthenticationAccessService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, ILogService)
], AuthenticationService);
export { AuthenticationService };
registerSingleton(IAuthenticationService, AuthenticationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2F1dGhlbnRpY2F0aW9uL2Jyb3dzZXIvYXV0aGVudGljYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxFQUVmLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRSxPQUFPLEVBT04sc0JBQXNCLEdBQ3RCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDckcsT0FBTyxFQUFrQixpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVsRixNQUFNLFVBQVUsd0NBQXdDLENBQUMsRUFBVTtJQUNsRSxPQUFPLDJCQUEyQixFQUFFLEVBQUUsQ0FBQTtBQUN2QyxDQUFDO0FB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