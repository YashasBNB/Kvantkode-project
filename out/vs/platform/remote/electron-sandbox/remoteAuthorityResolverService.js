var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//
import { DeferredPromise } from '../../../base/common/async.js';
import * as errors from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { RemoteAuthorities } from '../../../base/common/network.js';
import { IProductService } from '../../product/common/productService.js';
let RemoteAuthorityResolverService = class RemoteAuthorityResolverService extends Disposable {
    constructor(productService, remoteResourceLoader) {
        super();
        this.remoteResourceLoader = remoteResourceLoader;
        this._onDidChangeConnectionData = this._register(new Emitter());
        this.onDidChangeConnectionData = this._onDidChangeConnectionData.event;
        this._resolveAuthorityRequests = new Map();
        this._connectionTokens = new Map();
        this._canonicalURIRequests = new Map();
        this._canonicalURIProvider = null;
        RemoteAuthorities.setServerRootPath(productService, undefined); // on the desktop we don't support custom server base paths
    }
    resolveAuthority(authority) {
        if (!this._resolveAuthorityRequests.has(authority)) {
            this._resolveAuthorityRequests.set(authority, new DeferredPromise());
        }
        return this._resolveAuthorityRequests.get(authority).p;
    }
    async getCanonicalURI(uri) {
        const key = uri.toString();
        const existing = this._canonicalURIRequests.get(key);
        if (existing) {
            return existing.result.p;
        }
        const result = new DeferredPromise();
        this._canonicalURIProvider?.(uri).then((uri) => result.complete(uri), (err) => result.error(err));
        this._canonicalURIRequests.set(key, { input: uri, result });
        return result.p;
    }
    getConnectionData(authority) {
        if (!this._resolveAuthorityRequests.has(authority)) {
            return null;
        }
        const request = this._resolveAuthorityRequests.get(authority);
        if (!request.isResolved) {
            return null;
        }
        const connectionToken = this._connectionTokens.get(authority);
        return {
            connectTo: request.value.authority.connectTo,
            connectionToken: connectionToken,
        };
    }
    _clearResolvedAuthority(authority) {
        if (this._resolveAuthorityRequests.has(authority)) {
            this._resolveAuthorityRequests.get(authority).cancel();
            this._resolveAuthorityRequests.delete(authority);
        }
    }
    _setResolvedAuthority(resolvedAuthority, options) {
        if (this._resolveAuthorityRequests.has(resolvedAuthority.authority)) {
            const request = this._resolveAuthorityRequests.get(resolvedAuthority.authority);
            if (resolvedAuthority.connectTo.type === 0 /* RemoteConnectionType.WebSocket */) {
                RemoteAuthorities.set(resolvedAuthority.authority, resolvedAuthority.connectTo.host, resolvedAuthority.connectTo.port);
            }
            else {
                RemoteAuthorities.setDelegate(this.remoteResourceLoader.getResourceUriProvider());
            }
            if (resolvedAuthority.connectionToken) {
                RemoteAuthorities.setConnectionToken(resolvedAuthority.authority, resolvedAuthority.connectionToken);
            }
            request.complete({ authority: resolvedAuthority, options });
            this._onDidChangeConnectionData.fire();
        }
    }
    _setResolvedAuthorityError(authority, err) {
        if (this._resolveAuthorityRequests.has(authority)) {
            const request = this._resolveAuthorityRequests.get(authority);
            // Avoid that this error makes it to telemetry
            request.error(errors.ErrorNoTelemetry.fromError(err));
        }
    }
    _setAuthorityConnectionToken(authority, connectionToken) {
        this._connectionTokens.set(authority, connectionToken);
        RemoteAuthorities.setConnectionToken(authority, connectionToken);
        this._onDidChangeConnectionData.fire();
    }
    _setCanonicalURIProvider(provider) {
        this._canonicalURIProvider = provider;
        this._canonicalURIRequests.forEach(({ result, input }) => {
            this._canonicalURIProvider(input).then((uri) => result.complete(uri), (err) => result.error(err));
        });
    }
};
RemoteAuthorityResolverService = __decorate([
    __param(0, IProductService)
], RemoteAuthorityResolverService);
export { RemoteAuthorityResolverService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2VsZWN0cm9uLXNhbmRib3gvcmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLEVBQUU7QUFDRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQVdqRSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUNaLFNBQVEsVUFBVTtJQWFsQixZQUNrQixjQUErQixFQUMvQixvQkFBa0Q7UUFFbkUsS0FBSyxFQUFFLENBQUE7UUFGVSx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQThCO1FBVm5ELCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ2pFLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUE7UUFZaEYsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksR0FBRyxFQUEyQyxDQUFBO1FBQ25GLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUNsRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtR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