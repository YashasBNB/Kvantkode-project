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
import { mainWindow } from '../../../base/browser/window.js';
import { DeferredPromise } from '../../../base/common/async.js';
import * as errors from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { RemoteAuthorities } from '../../../base/common/network.js';
import * as performance from '../../../base/common/performance.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { WebSocketRemoteConnection, getRemoteAuthorityPrefix, } from '../common/remoteAuthorityResolver.js';
import { parseAuthorityWithOptionalPort } from '../common/remoteHosts.js';
let RemoteAuthorityResolverService = class RemoteAuthorityResolverService extends Disposable {
    constructor(isWorkbenchOptionsBasedResolution, connectionToken, resourceUriProvider, serverBasePath, productService, _logService) {
        super();
        this._logService = _logService;
        this._onDidChangeConnectionData = this._register(new Emitter());
        this.onDidChangeConnectionData = this._onDidChangeConnectionData.event;
        this._resolveAuthorityRequests = new Map();
        this._cache = new Map();
        this._connectionToken = connectionToken;
        this._connectionTokens = new Map();
        this._isWorkbenchOptionsBasedResolution = isWorkbenchOptionsBasedResolution;
        if (resourceUriProvider) {
            RemoteAuthorities.setDelegate(resourceUriProvider);
        }
        RemoteAuthorities.setServerRootPath(productService, serverBasePath);
    }
    async resolveAuthority(authority) {
        let result = this._resolveAuthorityRequests.get(authority);
        if (!result) {
            result = new DeferredPromise();
            this._resolveAuthorityRequests.set(authority, result);
            if (this._isWorkbenchOptionsBasedResolution) {
                this._doResolveAuthority(authority).then((v) => result.complete(v), (err) => result.error(err));
            }
        }
        return result.p;
    }
    async getCanonicalURI(uri) {
        // todo@connor4312 make this work for web
        return uri;
    }
    getConnectionData(authority) {
        if (!this._cache.has(authority)) {
            return null;
        }
        const resolverResult = this._cache.get(authority);
        const connectionToken = this._connectionTokens.get(authority) || resolverResult.authority.connectionToken;
        return {
            connectTo: resolverResult.authority.connectTo,
            connectionToken: connectionToken,
        };
    }
    async _doResolveAuthority(authority) {
        const authorityPrefix = getRemoteAuthorityPrefix(authority);
        const sw = StopWatch.create(false);
        this._logService.info(`Resolving connection token (${authorityPrefix})...`);
        performance.mark(`code/willResolveConnectionToken/${authorityPrefix}`);
        const connectionToken = await Promise.resolve(this._connectionTokens.get(authority) || this._connectionToken);
        performance.mark(`code/didResolveConnectionToken/${authorityPrefix}`);
        this._logService.info(`Resolved connection token (${authorityPrefix}) after ${sw.elapsed()} ms`);
        const defaultPort = /^https:/.test(mainWindow.location.href) ? 443 : 80;
        const { host, port } = parseAuthorityWithOptionalPort(authority, defaultPort);
        const result = {
            authority: {
                authority,
                connectTo: new WebSocketRemoteConnection(host, port),
                connectionToken,
            },
        };
        RemoteAuthorities.set(authority, host, port);
        this._cache.set(authority, result);
        this._onDidChangeConnectionData.fire();
        return result;
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
            // For non-websocket types, it's expected the embedder passes a `remoteResourceProvider`
            // which is wrapped to a `IResourceUriProvider` and is not handled here.
            if (resolvedAuthority.connectTo.type === 0 /* RemoteConnectionType.WebSocket */) {
                RemoteAuthorities.set(resolvedAuthority.authority, resolvedAuthority.connectTo.host, resolvedAuthority.connectTo.port);
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
    _setCanonicalURIProvider(provider) { }
};
RemoteAuthorityResolverService = __decorate([
    __param(4, IProductService),
    __param(5, ILogService)
], RemoteAuthorityResolverService);
export { RemoteAuthorityResolverService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvYnJvd3Nlci9yZW1vdGVBdXRob3JpdHlSZXNvbHZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkUsT0FBTyxLQUFLLFdBQVcsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBT04seUJBQXlCLEVBQ3pCLHdCQUF3QixHQUN4QixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRWxFLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQ1osU0FBUSxVQUFVO0lBY2xCLFlBQ0MsaUNBQTBDLEVBQzFDLGVBQXFELEVBQ3JELG1CQUFvRCxFQUNwRCxjQUFrQyxFQUNqQixjQUErQixFQUNuQyxXQUF5QztRQUV0RCxLQUFLLEVBQUUsQ0FBQTtRQUZ1QixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQWZ0QywrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNqRSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBRWhFLDhCQUF5QixHQUFHLElBQUksR0FBRyxFQUEyQyxDQUFBO1FBQzlFLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQTtRQWMxRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUNsRCxJQUFJLENBQUMsa0NBQWtDLEdBQUcsaUNBQWlDLENBQUE7UUFDM0UsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFDRCxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFpQjtRQUN2QyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sR0FBRyxJQUFJLGVBQWUsRUFBa0IsQ0FBQTtZQUM5QyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNyRCxJQUFJLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUN2QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFDMUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQzNCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxHQUFRO1FBQzdCLHlDQUF5QztRQUN6QyxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxTQUFpQjtRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUUsQ0FBQTtRQUNsRCxNQUFNLGVBQWUsR0FDcEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxjQUFjLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQTtRQUNsRixPQUFPO1lBQ04sU0FBUyxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsU0FBUztZQUM3QyxlQUFlLEVBQUUsZUFBZTtTQUNoQyxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxTQUFpQjtRQUNsRCxNQUFNLGVBQWUsR0FBRyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMzRCxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLCtCQUErQixlQUFlLE1BQU0sQ0FBQyxDQUFBO1FBQzNFLFdBQVcsQ0FBQyxJQUFJLENBQUMsbUNBQW1DLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFDdEUsTUFBTSxlQUFlLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUM1QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FDOUQsQ0FBQTtRQUNELFdBQVcsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFDckUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsOEJBQThCLGVBQWUsV0FBVyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDdkUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyw4QkFBOEIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDN0UsTUFBTSxNQUFNLEdBQW1CO1lBQzlCLFNBQVMsRUFBRTtnQkFDVixTQUFTO2dCQUNULFNBQVMsRUFBRSxJQUFJLHlCQUF5QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7Z0JBQ3BELGVBQWU7YUFDZjtTQUNELENBQUE7UUFDRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3RDLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELHVCQUF1QixDQUFDLFNBQWlCO1FBQ3hDLElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ25ELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFFLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDdkQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqRCxDQUFDO0lBQ0YsQ0FBQztJQUVELHFCQUFxQixDQUFDLGlCQUFvQyxFQUFFLE9BQXlCO1FBQ3BGLElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFFLENBQUE7WUFDaEYsd0ZBQXdGO1lBQ3hGLHdFQUF3RTtZQUN4RSxJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLDJDQUFtQyxFQUFFLENBQUM7Z0JBQ3pFLGlCQUFpQixDQUFDLEdBQUcsQ0FDcEIsaUJBQWlCLENBQUMsU0FBUyxFQUMzQixpQkFBaUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUNoQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNoQyxDQUFBO1lBQ0YsQ0FBQztZQUNELElBQUksaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZDLGlCQUFpQixDQUFDLGtCQUFrQixDQUNuQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQzNCLGlCQUFpQixDQUFDLGVBQWUsQ0FDakMsQ0FBQTtZQUNGLENBQUM7WUFDRCxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDM0QsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRUQsMEJBQTBCLENBQUMsU0FBaUIsRUFBRSxHQUFRO1FBQ3JELElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFFLENBQUE7WUFDOUQsOENBQThDO1lBQzlDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3RELENBQUM7SUFDRixDQUFDO0lBRUQsNEJBQTRCLENBQUMsU0FBaUIsRUFBRSxlQUF1QjtRQUN0RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN0RCxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDaEUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3ZDLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxRQUFvQyxJQUFTLENBQUM7Q0FDdkUsQ0FBQTtBQXpJWSw4QkFBOEI7SUFvQnhDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7R0FyQkQsOEJBQThCLENBeUkxQyJ9