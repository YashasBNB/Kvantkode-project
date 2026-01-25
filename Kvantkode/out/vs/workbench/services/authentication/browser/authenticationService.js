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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hdXRoZW50aWNhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEVBRWYsWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBR2hFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQy9FLE9BQU8sRUFPTixzQkFBc0IsR0FDdEIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNyRyxPQUFPLEVBQWtCLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRWxGLE1BQU0sVUFBVSx3Q0FBd0MsQ0FBQyxFQUFVO0lBQ2xFLE9BQU8sMkJBQTJCLEVBQUUsRUFBRSxDQUFBO0FBQ3ZDLENB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