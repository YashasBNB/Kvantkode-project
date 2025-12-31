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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { DisposableStore, dispose } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ISearchService, } from '../../services/search/common/search.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { revive } from '../../../base/common/marshalling.js';
import * as Constants from '../../contrib/search/common/constants.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
let MainThreadSearch = class MainThreadSearch {
    constructor(extHostContext, _searchService, _telemetryService, _configurationService, contextKeyService) {
        this._searchService = _searchService;
        this._telemetryService = _telemetryService;
        this.contextKeyService = contextKeyService;
        this._searchProvider = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostSearch);
        this._proxy.$enableExtensionHostSearch();
    }
    dispose() {
        this._searchProvider.forEach((value) => value.dispose());
        this._searchProvider.clear();
    }
    $registerTextSearchProvider(handle, scheme) {
        this._searchProvider.set(handle, new RemoteSearchProvider(this._searchService, 1 /* SearchProviderType.text */, scheme, handle, this._proxy));
    }
    $registerAITextSearchProvider(handle, scheme) {
        Constants.SearchContext.hasAIResultProvider.bindTo(this.contextKeyService).set(true);
        this._searchProvider.set(handle, new RemoteSearchProvider(this._searchService, 2 /* SearchProviderType.aiText */, scheme, handle, this._proxy));
    }
    $registerFileSearchProvider(handle, scheme) {
        this._searchProvider.set(handle, new RemoteSearchProvider(this._searchService, 0 /* SearchProviderType.file */, scheme, handle, this._proxy));
    }
    $unregisterProvider(handle) {
        dispose(this._searchProvider.get(handle));
        this._searchProvider.delete(handle);
    }
    $handleFileMatch(handle, session, data) {
        const provider = this._searchProvider.get(handle);
        if (!provider) {
            throw new Error('Got result for unknown provider');
        }
        provider.handleFindMatch(session, data);
    }
    $handleTextMatch(handle, session, data) {
        const provider = this._searchProvider.get(handle);
        if (!provider) {
            throw new Error('Got result for unknown provider');
        }
        provider.handleFindMatch(session, data);
    }
    $handleTelemetry(eventName, data) {
        this._telemetryService.publicLog(eventName, data);
    }
};
MainThreadSearch = __decorate([
    extHostNamedCustomer(MainContext.MainThreadSearch),
    __param(1, ISearchService),
    __param(2, ITelemetryService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService)
], MainThreadSearch);
export { MainThreadSearch };
class SearchOperation {
    static { this._idPool = 0; }
    constructor(progress, id = ++SearchOperation._idPool, matches = new Map()) {
        this.progress = progress;
        this.id = id;
        this.matches = matches;
        //
    }
    addMatch(match) {
        const existingMatch = this.matches.get(match.resource.toString());
        if (existingMatch) {
            // TODO@rob clean up text/file result types
            // If a file search returns the same file twice, we would enter this branch.
            // It's possible that could happen, #90813
            if (existingMatch.results && match.results) {
                existingMatch.results.push(...match.results);
            }
        }
        else {
            this.matches.set(match.resource.toString(), match);
        }
        this.progress?.(match);
    }
}
class RemoteSearchProvider {
    constructor(searchService, type, _scheme, _handle, _proxy) {
        this._scheme = _scheme;
        this._handle = _handle;
        this._proxy = _proxy;
        this._registrations = new DisposableStore();
        this._searches = new Map();
        this._registrations.add(searchService.registerSearchResultProvider(this._scheme, type, this));
    }
    async getAIName() {
        if (this.cachedAIName === undefined) {
            this.cachedAIName = await this._proxy.$getAIName(this._handle);
        }
        return this.cachedAIName;
    }
    dispose() {
        this._registrations.dispose();
    }
    fileSearch(query, token = CancellationToken.None) {
        return this.doSearch(query, undefined, token);
    }
    textSearch(query, onProgress, token = CancellationToken.None) {
        return this.doSearch(query, onProgress, token);
    }
    doSearch(query, onProgress, token = CancellationToken.None) {
        if (!query.folderQueries.length) {
            throw new Error('Empty folderQueries');
        }
        const search = new SearchOperation(onProgress);
        this._searches.set(search.id, search);
        const searchP = this._provideSearchResults(query, search.id, token);
        return Promise.resolve(searchP).then((result) => {
            this._searches.delete(search.id);
            return {
                results: Array.from(search.matches.values()),
                stats: result.stats,
                limitHit: result.limitHit,
                messages: result.messages,
            };
        }, (err) => {
            this._searches.delete(search.id);
            return Promise.reject(err);
        });
    }
    clearCache(cacheKey) {
        return Promise.resolve(this._proxy.$clearCache(cacheKey));
    }
    handleFindMatch(session, dataOrUri) {
        const searchOp = this._searches.get(session);
        if (!searchOp) {
            // ignore...
            return;
        }
        dataOrUri.forEach((result) => {
            if (result.results) {
                searchOp.addMatch(revive(result));
            }
            else {
                searchOp.addMatch({
                    resource: URI.revive(result),
                });
            }
        });
    }
    _provideSearchResults(query, session, token) {
        switch (query.type) {
            case 1 /* QueryType.File */:
                return this._proxy.$provideFileSearchResults(this._handle, session, query, token);
            case 2 /* QueryType.Text */:
                return this._proxy.$provideTextSearchResults(this._handle, session, query, token);
            default:
                return this._proxy.$provideAITextSearchResults(this._handle, session, query, token);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDekYsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQVNOLGNBQWMsR0FJZCxNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFDTixjQUFjLEVBRWQsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxTQUFTLE1BQU0sMENBQTBDLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHL0UsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7SUFJNUIsWUFDQyxjQUErQixFQUNmLGNBQStDLEVBQzVDLGlCQUFxRCxFQUNqRCxxQkFBNEMsRUFDL0MsaUJBQStDO1FBSGxDLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUMzQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBRTFDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FB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