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
import { Emitter, Event } from '../../../base/common/event.js';
import { MainContext, } from './extHost.protocol.js';
import { Disposable } from './extHostTypes.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
export const IExtHostAuthentication = createDecorator('IExtHostAuthentication');
let ExtHostAuthentication = class ExtHostAuthentication {
    constructor(extHostRpc) {
        this._authenticationProviders = new Map();
        this._onDidChangeSessions = new Emitter();
        this._getSessionTaskSingler = new TaskSingler();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadAuthentication);
    }
    /**
     * This sets up an event that will fire when the auth sessions change with a built-in filter for the extensionId
     * if a session change only affects a specific extension.
     * @param extensionId The extension that is interested in the event.
     * @returns An event with a built-in filter for the extensionId
     */
    getExtensionScopedSessionsEvent(extensionId) {
        const normalizedExtensionId = extensionId.toLowerCase();
        return Event.chain(this._onDidChangeSessions.event, ($) => $.filter((e) => !e.extensionIdFilter || e.extensionIdFilter.includes(normalizedExtensionId)).map((e) => ({ provider: e.provider })));
    }
    async getSession(requestingExtension, providerId, scopes, options = {}) {
        const extensionId = ExtensionIdentifier.toKey(requestingExtension.identifier);
        const sortedScopes = [...scopes].sort().join(' ');
        const keys = Object.keys(options);
        const optionsStr = keys
            .sort()
            .map((key) => `${key}:${!!options[key]}`)
            .join(', ');
        return await this._getSessionTaskSingler.getOrCreate(`${extensionId} ${providerId} ${sortedScopes} ${optionsStr}`, async () => {
            await this._proxy.$ensureProvider(providerId);
            const extensionName = requestingExtension.displayName || requestingExtension.name;
            return this._proxy.$getSession(providerId, scopes, extensionId, extensionName, options);
        });
    }
    async getAccounts(providerId) {
        await this._proxy.$ensureProvider(providerId);
        return await this._proxy.$getAccounts(providerId);
    }
    async removeSession(providerId, sessionId) {
        const providerData = this._authenticationProviders.get(providerId);
        if (!providerData) {
            return this._proxy.$removeSession(providerId, sessionId);
        }
        return providerData.provider.removeSession(sessionId);
    }
    registerAuthenticationProvider(id, label, provider, options) {
        if (this._authenticationProviders.get(id)) {
            throw new Error(`An authentication provider with id '${id}' is already registered.`);
        }
        this._authenticationProviders.set(id, {
            label,
            provider,
            options: options ?? { supportsMultipleAccounts: false },
        });
        const listener = provider.onDidChangeSessions((e) => this._proxy.$sendDidChangeSessions(id, e));
        this._proxy.$registerAuthenticationProvider(id, label, options?.supportsMultipleAccounts ?? false);
        return new Disposable(() => {
            listener.dispose();
            this._authenticationProviders.delete(id);
            this._proxy.$unregisterAuthenticationProvider(id);
        });
    }
    async $createSession(providerId, scopes, options) {
        const providerData = this._authenticationProviders.get(providerId);
        if (providerData) {
            return await providerData.provider.createSession(scopes, options);
        }
        throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
    }
    async $removeSession(providerId, sessionId) {
        const providerData = this._authenticationProviders.get(providerId);
        if (providerData) {
            return await providerData.provider.removeSession(sessionId);
        }
        throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
    }
    async $getSessions(providerId, scopes, options) {
        const providerData = this._authenticationProviders.get(providerId);
        if (providerData) {
            return await providerData.provider.getSessions(scopes, options);
        }
        throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
    }
    $onDidChangeAuthenticationSessions(id, label, extensionIdFilter) {
        // Don't fire events for the internal auth providers
        if (!id.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
            this._onDidChangeSessions.fire({ provider: { id, label }, extensionIdFilter });
        }
        return Promise.resolve();
    }
};
ExtHostAuthentication = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostAuthentication);
export { ExtHostAuthentication };
class TaskSingler {
    constructor() {
        this._inFlightPromises = new Map();
    }
    getOrCreate(key, promiseFactory) {
        const inFlight = this._inFlightPromises.get(key);
        if (inFlight) {
            return inFlight;
        }
        const promise = promiseFactory().finally(() => this._inFlightPromises.delete(key));
        this._inFlightPromises.set(key, promise);
        return promise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEF1dGhlbnRpY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUNOLFdBQVcsR0FHWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUM5QyxPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRzNELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUE7QUFRM0QsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFjakMsWUFBZ0MsVUFBOEI7UUFWdEQsNkJBQXdCLEdBQXNDLElBQUksR0FBRyxFQUcxRSxDQUFBO1FBRUsseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBRXZDLENBQUE7UUFDSywyQkFBc0IsR0FBRyxJQUFJLFdBQVcsRUFBNEMsQ0FBQTtRQUczRixJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsK0JBQStCLENBQzlCLFdBQW1CO1FBRW5CLE1BQU0s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