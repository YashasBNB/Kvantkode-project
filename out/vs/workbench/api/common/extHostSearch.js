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
import { toDisposable } from '../../../base/common/lifecycle.js';
import { MainContext } from './extHost.protocol.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { FileSearchManager } from '../../services/search/common/fileSearchManager.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IURITransformerService } from './extHostUriTransformerService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { URI } from '../../../base/common/uri.js';
import { TextSearchManager } from '../../services/search/common/textSearchManager.js';
import { revive } from '../../../base/common/marshalling.js';
import { OldFileSearchProviderConverter, OldTextSearchProviderConverter, } from '../../services/search/common/searchExtConversionTypes.js';
export const IExtHostSearch = createDecorator('IExtHostSearch');
let ExtHostSearch = class ExtHostSearch {
    constructor(extHostRpc, _uriTransformer, _logService) {
        this.extHostRpc = extHostRpc;
        this._uriTransformer = _uriTransformer;
        this._logService = _logService;
        this._proxy = this.extHostRpc.getProxy(MainContext.MainThreadSearch);
        this._handlePool = 0;
        this._textSearchProvider = new Map();
        this._textSearchUsedSchemes = new Set();
        this._aiTextSearchProvider = new Map();
        this._aiTextSearchUsedSchemes = new Set();
        this._fileSearchProvider = new Map();
        this._fileSearchUsedSchemes = new Set();
        this._fileSearchManager = new FileSearchManager();
    }
    _transformScheme(scheme) {
        return this._uriTransformer.transformOutgoingScheme(scheme);
    }
    registerTextSearchProviderOld(scheme, provider) {
        if (this._textSearchUsedSchemes.has(scheme)) {
            throw new Error(`a text search provider for the scheme '${scheme}' is already registered`);
        }
        this._textSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._textSearchProvider.set(handle, new OldTextSearchProviderConverter(provider));
        this._proxy.$registerTextSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._textSearchUsedSchemes.delete(scheme);
            this._textSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    registerTextSearchProvider(scheme, provider) {
        if (this._textSearchUsedSchemes.has(scheme)) {
            throw new Error(`a text search provider for the scheme '${scheme}' is already registered`);
        }
        this._textSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._textSearchProvider.set(handle, provider);
        this._proxy.$registerTextSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._textSearchUsedSchemes.delete(scheme);
            this._textSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    registerAITextSearchProvider(scheme, provider) {
        if (this._aiTextSearchUsedSchemes.has(scheme)) {
            throw new Error(`an AI text search provider for the scheme '${scheme}'is already registered`);
        }
        this._aiTextSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._aiTextSearchProvider.set(handle, provider);
        this._proxy.$registerAITextSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._aiTextSearchUsedSchemes.delete(scheme);
            this._aiTextSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    registerFileSearchProviderOld(scheme, provider) {
        if (this._fileSearchUsedSchemes.has(scheme)) {
            throw new Error(`a file search provider for the scheme '${scheme}' is already registered`);
        }
        this._fileSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._fileSearchProvider.set(handle, new OldFileSearchProviderConverter(provider));
        this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._fileSearchUsedSchemes.delete(scheme);
            this._fileSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    registerFileSearchProvider(scheme, provider) {
        if (this._fileSearchUsedSchemes.has(scheme)) {
            throw new Error(`a file search provider for the scheme '${scheme}' is already registered`);
        }
        this._fileSearchUsedSchemes.add(scheme);
        const handle = this._handlePool++;
        this._fileSearchProvider.set(handle, provider);
        this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
        return toDisposable(() => {
            this._fileSearchUsedSchemes.delete(scheme);
            this._fileSearchProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    $provideFileSearchResults(handle, session, rawQuery, token) {
        const query = reviveQuery(rawQuery);
        const provider = this._fileSearchProvider.get(handle);
        if (provider) {
            return this._fileSearchManager.fileSearch(query, provider, (batch) => {
                this._proxy.$handleFileMatch(handle, session, batch.map((p) => p.resource));
            }, token);
        }
        else {
            throw new Error('unknown provider: ' + handle);
        }
    }
    async doInternalFileSearchWithCustomCallback(query, token, handleFileMatch) {
        return { messages: [] };
    }
    $clearCache(cacheKey) {
        this._fileSearchManager.clearCache(cacheKey);
        return Promise.resolve(undefined);
    }
    $provideTextSearchResults(handle, session, rawQuery, token) {
        const provider = this._textSearchProvider.get(handle);
        if (!provider || !provider.provideTextSearchResults) {
            throw new Error(`Unknown Text Search Provider ${handle}`);
        }
        const query = reviveQuery(rawQuery);
        const engine = this.createTextSearchManager(query, provider);
        return engine.search((progress) => this._proxy.$handleTextMatch(handle, session, progress), token);
    }
    $provideAITextSearchResults(handle, session, rawQuery, token) {
        const provider = this._aiTextSearchProvider.get(handle);
        if (!provider || !provider.provideAITextSearchResults) {
            throw new Error(`Unknown AI Text Search Provider ${handle}`);
        }
        const query = reviveQuery(rawQuery);
        const engine = this.createAITextSearchManager(query, provider);
        return engine.search((progress) => this._proxy.$handleTextMatch(handle, session, progress), token);
    }
    $enableExtensionHostSearch() { }
    async $getAIName(handle) {
        const provider = this._aiTextSearchProvider.get(handle);
        if (!provider || !provider.provideAITextSearchResults) {
            return undefined;
        }
        // if the provider is defined, but has no name, use default name
        return provider.name ?? 'AI';
    }
    createTextSearchManager(query, provider) {
        return new TextSearchManager({ query, provider }, {
            readdir: (resource) => Promise.resolve([]),
            toCanonicalName: (encoding) => encoding,
        }, 'textSearchProvider');
    }
    createAITextSearchManager(query, provider) {
        return new TextSearchManager({ query, provider }, {
            readdir: (resource) => Promise.resolve([]),
            toCanonicalName: (encoding) => encoding,
        }, 'aiTextSearchProvider');
    }
};
ExtHostSearch = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IURITransformerService),
    __param(2, ILogService)
], ExtHostSearch);
export { ExtHostSearch };
export function reviveQuery(rawQuery) {
    return {
        ...rawQuery, // TODO@rob ???
        ...{
            folderQueries: rawQuery.folderQueries && rawQuery.folderQueries.map(reviveFolderQuery),
            extraFileResources: rawQuery.extraFileResources &&
                rawQuery.extraFileResources.map((components) => URI.revive(components)),
        },
    };
}
function reviveFolderQuery(rawFolderQuery) {
    return revive(rawFolderQuery);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdFLE9BQU8sRUFBNkMsV0FBVyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVlqRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLDhCQUE4QixHQUM5QixNQUFNLDBEQUEwRCxDQUFBO0FBZWpFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQWlCLGdCQUFnQixDQUFDLENBQUE7QUFFeEUsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYTtJQWlCekIsWUFDcUIsVUFBc0MsRUFDbEMsZUFBaUQsRUFDNUQsV0FBa0M7UUFGbkIsZUFBVSxHQUFWLFVBQVUsQ0FBb0I7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQXdCO1FBQ2xELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBbkI3QixXQUFNLEdBQTBCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUMxRSxXQUFXLENBQUMsZ0JBQWdCLENBQzVCLENBQUE7UUFDUyxnQkFBVyxHQUFXLENBQUMsQ0FBQTtRQUVoQix3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQTtRQUNuRSwyQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBRTFDLDBCQUFxQixHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFBO1FBQ3RFLDZCQUF3QixHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFFNUMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUE7UUFDbkUsMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUUxQyx1QkFBa0IsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7SUFNMUQsQ0FBQztJQUVNLGdCQUFnQixDQUFDLE1BQWM7UUFDeEMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxNQUFjLEVBQUUsUUFBbUM7UUFDaEYsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsTUFBTSx5QkFBeUIsQ0FBQyxDQUFBO1FBQzNGLENBQUM7UUFFRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDbEYsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDOUUsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELDBCQUEwQixDQUFDLE1BQWMsRUFBRSxRQUFvQztRQUM5RSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxNQUFNLHlCQUF5QixDQUFDLENBQUE7UUFDM0YsQ0FBQztRQUVELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzlFLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxNQUFjLEVBQUUsUUFBcUM7UUFDakYsSUFBSSxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDL0MsTUFBTSxJQUFJLEtBQUssQ0FBQyw4Q0FBOEMsTUFBTSx3QkFBd0IsQ0FBQyxDQUFBO1FBQzlGLENBQUM7UUFFRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNoRixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM1QyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3pDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsNkJBQTZCLENBQUMsTUFBYyxFQUFFLFFBQW1DO1FBQ2hGLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLE1BQU0seUJBQXlCLENBQUMsQ0FBQTtRQUMzRixDQUFDO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDakMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzlFLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxNQUFjLEVBQUUsUUFBb0M7UUFDOUUsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsTUFBTSx5QkFBeUIsQ0FBQyxDQUFBO1FBQzNGLENBQUM7UUFFRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM5RSxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQseUJBQXlCLENBQ3hCLE1BQWMsRUFDZCxPQUFlLEVBQ2YsUUFBdUIsRUFDdkIsS0FBK0I7UUFFL0IsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FDeEMsS0FBSyxFQUNMLFFBQVEsRUFDUixDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNULElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQzNCLE1BQU0sRUFDTixPQUFPLEVBQ1AsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUM1QixDQUFBO1lBQ0YsQ0FBQyxFQUNELEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxDQUFBO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLHNDQUFzQyxDQUMzQyxLQUFpQixFQUNqQixLQUF3QixFQUN4QixlQUFzQztRQUV0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBZ0I7UUFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU1QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELHlCQUF5QixDQUN4QixNQUFjLEVBQ2QsT0FBZSxFQUNmLFFBQXVCLEVBQ3ZCLEtBQStCO1FBRS9CLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ3JELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzVELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FDbkIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsRUFDckUsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDO0lBRUQsMkJBQTJCLENBQzFCLE1BQWMsRUFDZCxPQUFlLEVBQ2YsUUFBeUIsRUFDekIsS0FBK0I7UUFFL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDdkQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDOUQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUNuQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUNyRSxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUM7SUFFRCwwQkFBMEIsS0FBVSxDQUFDO0lBRXJDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBYztRQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUN2RCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsZ0VBQWdFO1FBQ2hFLE9BQU8sUUFBUSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUE7SUFDN0IsQ0FBQztJQUVTLHVCQUF1QixDQUNoQyxLQUFpQixFQUNqQixRQUFvQztRQUVwQyxPQUFPLElBQUksaUJBQWlCLENBQzNCLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUNuQjtZQUNDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDMUMsZUFBZSxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRO1NBQ3ZDLEVBQ0Qsb0JBQW9CLENBQ3BCLENBQUE7SUFDRixDQUFDO0lBRVMseUJBQXlCLENBQ2xDLEtBQW1CLEVBQ25CLFFBQXFDO1FBRXJDLE9BQU8sSUFBSSxpQkFBaUIsQ0FDM0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQ25CO1lBQ0MsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxlQUFlLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVE7U0FDdkMsRUFDRCxzQkFBc0IsQ0FDdEIsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBaE9ZLGFBQWE7SUFrQnZCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLFdBQVcsQ0FBQTtHQXBCRCxhQUFhLENBZ096Qjs7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUMxQixRQUFXO0lBRVgsT0FBTztRQUNOLEdBQVMsUUFBUyxFQUFFLGVBQWU7UUFDbkMsR0FBRztZQUNGLGFBQWEsRUFBRSxRQUFRLENBQUMsYUFBYSxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO1lBQ3RGLGtCQUFrQixFQUNqQixRQUFRLENBQUMsa0JBQWtCO2dCQUMzQixRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3hFO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLGNBQTJDO0lBQ3JFLE9BQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQzlCLENBQUMifQ==