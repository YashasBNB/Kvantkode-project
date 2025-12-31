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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2Jyb3dzZXIvcmVtb3RlQXV0aG9yaXR5UmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25FLE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQU9OLHlCQUF5QixFQUN6Qix3QkFBd0IsR0FDeEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVsRSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUNaLFNBQVEsVUFBVTtJQWNsQixZQUNDLGlDQUEwQyxFQUMxQyxlQUFxRCxFQUNyRCxtQkFBb0QsRUFDcEQsY0FBa0MsRUFDakIsY0FBK0IsRUFDbkMsV0FBeUM7UUFFdEQsS0FBSyxFQUFFLENBQUE7UUFGdUIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFmdEMsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDakUsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtRQUVoRSw4QkFBeUIsR0FBRyxJQUFJLEdBQUcsRUFBMkMsQ0FBQTtRQUM5RSxXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUE7UUFjMUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQTtRQUN2QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7UUFDbEQsSUFBSSxDQUFDLGtDQUFrQyxHQUFHLGlDQUFpQyxDQUFBO1FBQzNFLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixpQkFBaUIsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBQ0QsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBaUI7UUFDdkMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsSUFBSSxlQUFlLEVBQWtCLENBQUE7WUFDOUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDckQsSUFBSSxJQUFJLENBQUMsa0NBQWtDLEVBQUUsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FDdkMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQzFCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxNQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUMzQixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDaEIsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQUMsR0FBUTtRQUM3Qix5Q0FBeUM7UUFDekMsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsU0FBaUI7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFFLENBQUE7UUFDbEQsTUFBTSxlQUFlLEdBQ3BCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksY0FBYyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUE7UUFDbEYsT0FBTztZQUNOLFNBQVMsRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFDLFNBQVM7WUFDN0MsZUFBZSxFQUFFLGVBQWU7U0FDaEMsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CLENBQUMsU0FBaUI7UUFDbEQsTUFBTSxlQUFlLEdBQUcsd0JBQXdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0QsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQywrQkFBK0IsZUFBZSxNQUFNLENBQUMsQ0FBQTtRQUMzRSxXQUFXLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sZUFBZSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FDNUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQzlELENBQUE7UUFDRCxXQUFXLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLDhCQUE4QixlQUFlLFdBQVcsRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRyxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ3ZFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsOEJBQThCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sTUFBTSxHQUFtQjtZQUM5QixTQUFTLEVBQUU7Z0JBQ1YsU0FBUztnQkFDVCxTQUFTLEVBQUUsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO2dCQUNwRCxlQUFlO2FBQ2Y7U0FDRCxDQUFBO1FBQ0QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN0QyxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxTQUFpQjtRQUN4QyxJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3ZELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxpQkFBb0MsRUFBRSxPQUF5QjtRQUNwRixJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNyRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBRSxDQUFBO1lBQ2hGLHdGQUF3RjtZQUN4Rix3RUFBd0U7WUFDeEUsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsSUFBSSwyQ0FBbUMsRUFBRSxDQUFDO2dCQUN6RSxpQkFBaUIsQ0FBQyxHQUFHLENBQ3BCLGlCQUFpQixDQUFDLFNBQVMsRUFDM0IsaUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksRUFDaEMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDaEMsQ0FBQTtZQUNGLENBQUM7WUFDRCxJQUFJLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN2QyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDbkMsaUJBQWlCLENBQUMsU0FBUyxFQUMzQixpQkFBaUIsQ0FBQyxlQUFlLENBQ2pDLENBQUE7WUFDRixDQUFDO1lBQ0QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQzNELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN2QyxDQUFDO0lBQ0YsQ0FBQztJQUVELDBCQUEwQixDQUFDLFNBQWlCLEVBQUUsR0FBUTtRQUNyRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNuRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFBO1lBQzlELDhDQUE4QztZQUM5QyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxDQUFDO0lBQ0YsQ0FBQztJQUVELDRCQUE0QixDQUFDLFNBQWlCLEVBQUUsZUFBdUI7UUFDdEUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDdEQsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ2hFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsd0JBQXdCLENBQUMsUUFBb0MsSUFBUyxDQUFDO0NBQ3ZFLENBQUE7QUF6SVksOEJBQThCO0lBb0J4QyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsV0FBVyxDQUFBO0dBckJELDhCQUE4QixDQXlJMUMifQ==