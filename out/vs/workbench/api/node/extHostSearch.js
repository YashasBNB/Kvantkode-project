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
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import * as pfs from '../../../base/node/pfs.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostConfiguration } from '../common/extHostConfiguration.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { ExtHostSearch, reviveQuery } from '../common/extHostSearch.js';
import { IURITransformerService } from '../common/extHostUriTransformerService.js';
import { isSerializedFileMatch, } from '../../services/search/common/search.js';
import { SearchService } from '../../services/search/node/rawSearchService.js';
import { RipgrepSearchProvider } from '../../services/search/node/ripgrepSearchProvider.js';
import { OutputChannel } from '../../services/search/node/ripgrepSearchUtils.js';
import { NativeTextSearchManager } from '../../services/search/node/textSearchManager.js';
let NativeExtHostSearch = class NativeExtHostSearch extends ExtHostSearch {
    constructor(extHostRpc, initData, _uriTransformer, configurationService, _logService) {
        super(extHostRpc, _uriTransformer, _logService);
        this.configurationService = configurationService;
        this._pfs = pfs; // allow extending for tests
        this._internalFileSearchHandle = -1;
        this._internalFileSearchProvider = null;
        this._registeredEHSearchProvider = false;
        this._disposables = new DisposableStore();
        this.isDisposed = false;
        this.getNumThreads = this.getNumThreads.bind(this);
        this.getNumThreadsCached = this.getNumThreadsCached.bind(this);
        this.handleConfigurationChanged = this.handleConfigurationChanged.bind(this);
        const outputChannel = new OutputChannel('RipgrepSearchUD', this._logService);
        this._disposables.add(this.registerTextSearchProvider(Schemas.vscodeUserData, new RipgrepSearchProvider(outputChannel, this.getNumThreadsCached)));
        if (initData.remote.isRemote && initData.remote.authority) {
            this._registerEHSearchProviders();
        }
        configurationService.getConfigProvider().then((provider) => {
            if (this.isDisposed) {
                return;
            }
            this._disposables.add(provider.onDidChangeConfiguration(this.handleConfigurationChanged));
        });
    }
    handleConfigurationChanged(event) {
        if (!event.affectsConfiguration('search')) {
            return;
        }
        this._numThreadsPromise = undefined;
    }
    async getNumThreads() {
        const configProvider = await this.configurationService.getConfigProvider();
        const numThreads = configProvider.getConfiguration('search').get('ripgrep.maxThreads');
        return numThreads;
    }
    async getNumThreadsCached() {
        if (!this._numThreadsPromise) {
            this._numThreadsPromise = this.getNumThreads();
        }
        return this._numThreadsPromise;
    }
    dispose() {
        this.isDisposed = true;
        this._disposables.dispose();
    }
    $enableExtensionHostSearch() {
        this._registerEHSearchProviders();
    }
    _registerEHSearchProviders() {
        if (this._registeredEHSearchProvider) {
            return;
        }
        this._registeredEHSearchProvider = true;
        const outputChannel = new OutputChannel('RipgrepSearchEH', this._logService);
        this._disposables.add(this.registerTextSearchProvider(Schemas.file, new RipgrepSearchProvider(outputChannel, this.getNumThreadsCached)));
        this._disposables.add(this.registerInternalFileSearchProvider(Schemas.file, new SearchService('fileSearchProvider', this.getNumThreadsCached)));
    }
    registerInternalFileSearchProvider(scheme, provider) {
        const handle = this._handlePool++;
        this._internalFileSearchProvider = provider;
        this._internalFileSearchHandle = handle;
        this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._internalFileSearchProvider = null;
            this._proxy.$unregisterProvider(handle);
        });
    }
    $provideFileSearchResults(handle, session, rawQuery, token) {
        const query = reviveQuery(rawQuery);
        if (handle === this._internalFileSearchHandle) {
            const start = Date.now();
            return this.doInternalFileSearch(handle, session, query, token).then((result) => {
                const elapsed = Date.now() - start;
                this._logService.debug(`Ext host file search time: ${elapsed}ms`);
                return result;
            });
        }
        return super.$provideFileSearchResults(handle, session, rawQuery, token);
    }
    async doInternalFileSearchWithCustomCallback(rawQuery, token, handleFileMatch) {
        const onResult = (ev) => {
            if (isSerializedFileMatch(ev)) {
                ev = [ev];
            }
            if (Array.isArray(ev)) {
                handleFileMatch(ev.map((m) => URI.file(m.path)));
                return;
            }
            if (ev.message) {
                this._logService.debug('ExtHostSearch', ev.message);
            }
        };
        if (!this._internalFileSearchProvider) {
            throw new Error('No internal file search handler');
        }
        const numThreads = await this.getNumThreadsCached();
        return (this._internalFileSearchProvider.doFileSearch(rawQuery, numThreads, onResult, token));
    }
    async doInternalFileSearch(handle, session, rawQuery, token) {
        return this.doInternalFileSearchWithCustomCallback(rawQuery, token, (data) => {
            this._proxy.$handleFileMatch(handle, session, data);
        });
    }
    $clearCache(cacheKey) {
        this._internalFileSearchProvider?.clearCache(cacheKey);
        return super.$clearCache(cacheKey);
    }
    createTextSearchManager(query, provider) {
        return new NativeTextSearchManager(query, provider, undefined, 'textSearchProvider');
    }
};
NativeExtHostSearch = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IURITransformerService),
    __param(3, IExtHostConfiguration),
    __param(4, ILogService)
], NativeExtHostSearch);
export { NativeExtHostSearch };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0U2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEtBQUssR0FBRyxNQUFNLDJCQUEyQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2xGLE9BQU8sRUFLTixxQkFBcUIsR0FFckIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUvQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDM0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBR2xGLElBQU0sbUJBQW1CLEdBQXpCLE1B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