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
import { IModelService } from '../../../../editor/common/services/model.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ISearchService, TextSearchCompleteMessageType, } from '../common/search.js';
import { SearchService } from '../common/searchService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { logOnceWebWorkerWarning, } from '../../../../base/common/worker/webWorker.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { createWebWorker } from '../../../../base/browser/webWorkerFactory.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { LocalFileSearchWorkerHost, } from '../common/localFileSearchWorkerTypes.js';
import { memoize } from '../../../../base/common/decorators.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { WebFileSystemAccess } from '../../../../platform/files/browser/webFileSystemAccess.js';
import { revive } from '../../../../base/common/marshalling.js';
let RemoteSearchService = class RemoteSearchService extends SearchService {
    constructor(modelService, editorService, telemetryService, logService, extensionService, fileService, instantiationService, uriIdentityService) {
        super(modelService, editorService, telemetryService, logService, extensionService, fileService, uriIdentityService);
        this.instantiationService = instantiationService;
        const searchProvider = this.instantiationService.createInstance(LocalFileSearchWorkerClient);
        this.registerSearchResultProvider(Schemas.file, 0 /* SearchProviderType.file */, searchProvider);
        this.registerSearchResultProvider(Schemas.file, 1 /* SearchProviderType.text */, searchProvider);
    }
};
RemoteSearchService = __decorate([
    __param(0, IModelService),
    __param(1, IEditorService),
    __param(2, ITelemetryService),
    __param(3, ILogService),
    __param(4, IExtensionService),
    __param(5, IFileService),
    __param(6, IInstantiationService),
    __param(7, IUriIdentityService)
], RemoteSearchService);
export { RemoteSearchService };
let LocalFileSearchWorkerClient = class LocalFileSearchWorkerClient extends Disposable {
    constructor(fileService, uriIdentityService) {
        super();
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this._onDidReceiveTextSearchMatch = new Emitter();
        this.onDidReceiveTextSearchMatch = this._onDidReceiveTextSearchMatch.event;
        this.queryId = 0;
        this._worker = null;
    }
    async getAIName() {
        return undefined;
    }
    sendTextSearchMatch(match, queryId) {
        this._onDidReceiveTextSearchMatch.fire({ match, queryId });
    }
    get fileSystemProvider() {
        return this.fileService.getProvider(Schemas.file);
    }
    async cancelQuery(queryId) {
        const proxy = this._getOrCreateWorker().proxy;
        proxy.$cancelQuery(queryId);
    }
    async textSearch(query, onProgress, token) {
        try {
            const queryDisposables = new DisposableStore();
            const proxy = this._getOrCreateWorker().proxy;
            const results = [];
            let limitHit = false;
            await Promise.all(query.folderQueries.map(async (fq) => {
                const queryId = this.queryId++;
                queryDisposables.add(token?.onCancellationRequested((e) => this.cancelQuery(queryId)) || Disposable.None);
                const handle = await this.fileSystemProvider.getHandle(fq.folder);
                if (!handle || !WebFileSystemAccess.isFileSystemDirectoryHandle(handle)) {
                    console.error('Could not get directory handle for ', fq);
                    return;
                }
                // force resource to revive using URI.revive.
                // TODO @andrea see why we can't just use `revive()` below. For some reason, (<MarshalledObject>obj).$mid was undefined for result.resource
                const reviveMatch = (result) => ({
                    resource: URI.revive(result.resource),
                    results: revive(result.results),
                });
                queryDisposables.add(this.onDidReceiveTextSearchMatch((e) => {
                    if (e.queryId === queryId) {
                        onProgress?.(reviveMatch(e.match));
                    }
                }));
                const ignorePathCasing = this.uriIdentityService.extUri.ignorePathCasing(fq.folder);
                const folderResults = await proxy.$searchDirectory(handle, query, fq, ignorePathCasing, queryId);
                for (const folderResult of folderResults.results) {
                    results.push(revive(folderResult));
                }
                if (folderResults.limitHit) {
                    limitHit = true;
                }
            }));
            queryDisposables.dispose();
            const result = { messages: [], results, limitHit };
            return result;
        }
        catch (e) {
            console.error('Error performing web worker text search', e);
            return {
                results: [],
                messages: [
                    {
                        text: localize('errorSearchText', 'Unable to search with Web Worker text searcher'),
                        type: TextSearchCompleteMessageType.Warning,
                    },
                ],
            };
        }
    }
    async fileSearch(query, token) {
        try {
            const queryDisposables = new DisposableStore();
            let limitHit = false;
            const proxy = this._getOrCreateWorker().proxy;
            const results = [];
            await Promise.all(query.folderQueries.map(async (fq) => {
                const queryId = this.queryId++;
                queryDisposables.add(token?.onCancellationRequested((e) => this.cancelQuery(queryId)) || Disposable.None);
                const handle = await this.fileSystemProvider.getHandle(fq.folder);
                if (!handle || !WebFileSystemAccess.isFileSystemDirectoryHandle(handle)) {
                    console.error('Could not get directory handle for ', fq);
                    return;
                }
                const caseSensitive = this.uriIdentityService.extUri.ignorePathCasing(fq.folder);
                const folderResults = await proxy.$listDirectory(handle, query, fq, caseSensitive, queryId);
                for (const folderResult of folderResults.results) {
                    results.push({ resource: URI.joinPath(fq.folder, folderResult) });
                }
                if (folderResults.limitHit) {
                    limitHit = true;
                }
            }));
            queryDisposables.dispose();
            const result = { messages: [], results, limitHit };
            return result;
        }
        catch (e) {
            console.error('Error performing web worker file search', e);
            return {
                results: [],
                messages: [
                    {
                        text: localize('errorSearchFile', 'Unable to search with Web Worker file searcher'),
                        type: TextSearchCompleteMessageType.Warning,
                    },
                ],
            };
        }
    }
    async clearCache(cacheKey) {
        if (this.cache?.key === cacheKey) {
            this.cache = undefined;
        }
    }
    _getOrCreateWorker() {
        if (!this._worker) {
            try {
                this._worker = this._register(createWebWorker(FileAccess.asBrowserUri('vs/workbench/services/search/worker/localFileSearchMain.js'), 'LocalFileSearchWorker'));
                LocalFileSearchWorkerHost.setChannel(this._worker, {
                    $sendTextSearchMatch: (match, queryId) => {
                        return this.sendTextSearchMatch(match, queryId);
                    },
                });
            }
            catch (err) {
                logOnceWebWorkerWarning(err);
                throw err;
            }
        }
        return this._worker;
    }
};
__decorate([
    memoize
], LocalFileSearchWorkerClient.prototype, "fileSystemProvider", null);
LocalFileSearchWorkerClient = __decorate([
    __param(0, IFileService),
    __param(1, IUriIdentityService)
], LocalFileSearchWorkerClient);
export { LocalFileSearchWorkerClient };
registerSingleton(ISearchService, RemoteSearchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvYnJvd3Nlci9zZWFyY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBTU4sY0FBYyxFQUdkLDZCQUE2QixHQUM3QixNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSx5Q0FBeUMsQ0FBQTtB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