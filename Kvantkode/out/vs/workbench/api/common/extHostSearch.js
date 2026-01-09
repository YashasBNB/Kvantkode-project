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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFNlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0UsT0FBTyxFQUE2QyxXQUFXLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBWWpFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFckYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsOEJBQThCLEdBQzlCLE1BQU0sMERBQTBELENBQUE7QUFlakUsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsZ0JBQWdCLENBQUMsQ0FBQTtBQUV4RSxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFhO0lBaUJ6QixZQUNxQixVQUFzQyxFQUNsQyxlQUFpRCxFQUM1RCxXQUFrQztRQUZuQixlQUFVLEdBQVYsVUFBVSxDQUFvQjtRQUN4QixvQkFBZSxHQUFm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