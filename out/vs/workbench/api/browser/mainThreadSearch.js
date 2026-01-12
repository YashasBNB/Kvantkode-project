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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ25GLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBU04sY0FBYyxHQUlkLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxLQUFLLFNBQVMsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUcvRSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQUk1QixZQUNDLGNBQStCLEVBQ2YsY0FBK0MsRUFDNUMsaUJBQXFELEVBQ2pELHFCQUE0QyxFQUMvQyxpQkFBK0M7UUFIbEMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQzNCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFFMUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQVBuRCxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFBO1FBU3pFLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsRUFBRSxDQUFBO0lBQ3pDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3hELElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDN0IsQ0FBQztJQUVELDJCQUEyQixDQUFDLE1BQWMsRUFBRSxNQUFjO1FBQ3pELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixNQUFNLEVBQ04sSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxDQUFDLGNBQWMsbUNBRW5CLE1BQU0sRUFDTixNQUFNLEVBQ04sSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsNkJBQTZCLENBQUMsTUFBYyxFQUFFLE1BQWM7UUFDM0QsU0FBUyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BGLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixNQUFNLEVBQ04sSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxDQUFDLGNBQWMscUNBRW5CLE1BQU0sRUFDTixNQUFNLEVBQ04sSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsMkJBQTJCLENBQUMsTUFBYyxFQUFFLE1BQWM7UUFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQ3ZCLE1BQU0sRUFDTixJQUFJLG9CQUFvQixDQUN2QixJQUFJLENBQUMsY0FBYyxtQ0FFbkIsTUFBTSxFQUNOLE1BQU0sRUFDTixJQUFJLENBQUMsTUFBTSxDQUNYLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxNQUFjO1FBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxNQUFjLEVBQUUsT0FBZSxFQUFFLElBQXFCO1FBQ3RFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBRUQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVELGdCQUFnQixDQUFDLE1BQWMsRUFBRSxPQUFlLEVBQUUsSUFBc0I7UUFDdkUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFFRCxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsU0FBaUIsRUFBRSxJQUFTO1FBQzVDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xELENBQUM7Q0FDRCxDQUFBO0FBckZZLGdCQUFnQjtJQUQ1QixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUM7SUFPaEQsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtHQVRSLGdCQUFnQixDQXFGNUI7O0FBRUQsTUFBTSxlQUFlO2FBQ0wsWUFBTyxHQUFHLENBQUMsQ0FBQTtJQUUxQixZQUNVLFFBQXFDLEVBQ3JDLEtBQWEsRUFBRSxlQUFlLENBQUMsT0FBTyxFQUN0QyxVQUFVLElBQUksR0FBRyxFQUFzQjtRQUZ2QyxhQUFRLEdBQVIsUUFBUSxDQUE2QjtRQUNyQyxPQUFFLEdBQUYsRUFBRSxDQUFvQztRQUN0QyxZQUFPLEdBQVAsT0FBTyxDQUFnQztRQUVoRCxFQUFFO0lBQ0gsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFpQjtRQUN6QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDakUsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQiwyQ0FBMkM7WUFDM0MsNEVBQTRFO1lBQzVFLDBDQUEwQztZQUMxQyxJQUFJLGFBQWEsQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM1QyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM3QyxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkIsQ0FBQzs7QUFHRixNQUFNLG9CQUFvQjtJQUt6QixZQUNDLGFBQTZCLEVBQzdCLElBQXdCLEVBQ1AsT0FBZSxFQUNmLE9BQWUsRUFDZixNQUEwQjtRQUYxQixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLFdBQU0sR0FBTixNQUFNLENBQW9CO1FBVDNCLG1CQUFjLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN0QyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTJCLENBQUE7UUFVOUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDOUYsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTO1FBQ2QsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVELFVBQVUsQ0FDVCxLQUFpQixFQUNqQixRQUEyQixpQkFBaUIsQ0FBQyxJQUFJO1FBRWpELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxVQUFVLENBQ1QsS0FBaUIsRUFDakIsVUFBNkMsRUFDN0MsUUFBMkIsaUJBQWlCLENBQUMsSUFBSTtRQUVqRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsUUFBUSxDQUNQLEtBQW1CLEVBQ25CLFVBQTZDLEVBQzdDLFFBQTJCLGlCQUFpQixDQUFDLElBQUk7UUFFakQsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXJDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVuRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUNuQyxDQUFDLE1BQTRCLEVBQUUsRUFBRTtZQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDaEMsT0FBTztnQkFDTixPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM1QyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7Z0JBQ25CLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtnQkFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO2FBQ3pCLENBQUE7UUFDRixDQUFDLEVBQ0QsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNoQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0IsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsVUFBVSxDQUFDLFFBQWdCO1FBQzFCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxlQUFlLENBQUMsT0FBZSxFQUFFLFNBQWdEO1FBQ2hGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRTVDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLFlBQVk7WUFDWixPQUFNO1FBQ1AsQ0FBQztRQUVELFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUM1QixJQUFxQixNQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFpQixNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ2xELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLENBQUMsUUFBUSxDQUFDO29CQUNqQixRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBZ0IsTUFBTSxDQUFDO2lCQUMzQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8scUJBQXFCLENBQzVCLEtBQW1CLEVBQ25CLE9BQWUsRUFDZixLQUF3QjtRQUV4QixRQUFRLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQjtnQkFDQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2xGO2dCQUNDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbEY7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=