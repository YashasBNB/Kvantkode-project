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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUE7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbEYsT0FBTyxFQUtOLHFCQUFxQixHQUVyQixNQUFNLHdDQUF3QyxDQUFBO0FBRS9DLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDaEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFH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