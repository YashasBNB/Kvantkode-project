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
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../base/common/lifecycle.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { assertType } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { INotebookCellStatusBarService } from '../../contrib/notebook/common/notebookCellStatusBarService.js';
import { INotebookService, SimpleNotebookProviderInfo, } from '../../contrib/notebook/common/notebookService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { revive } from '../../../base/common/marshalling.js';
import { coalesce } from '../../../base/common/arrays.js';
let MainThreadNotebooks = class MainThreadNotebooks {
    constructor(extHostContext, _notebookService, _cellStatusBarService, _logService) {
        this._notebookService = _notebookService;
        this._cellStatusBarService = _cellStatusBarService;
        this._logService = _logService;
        this._disposables = new DisposableStore();
        this._notebookSerializer = new Map();
        this._notebookCellStatusBarRegistrations = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebook);
    }
    dispose() {
        this._disposables.dispose();
        dispose(this._notebookSerializer.values());
    }
    $registerNotebookSerializer(handle, extension, viewType, options, data) {
        const disposables = new DisposableStore();
        disposables.add(this._notebookService.registerNotebookSerializer(viewType, extension, {
            options,
            dataToNotebook: async (data) => {
                const sw = new StopWatch();
                let result;
                if (data.byteLength === 0 && viewType === 'interactive') {
                    // we don't want any starting cells for an empty interactive window.
                    result = NotebookDto.fromNotebookDataDto({ cells: [], metadata: {} });
                }
                else {
                    const dto = await this._proxy.$dataToNotebook(handle, data, CancellationToken.None);
                    result = NotebookDto.fromNotebookDataDto(dto.value);
                }
                this._logService.trace(`[NotebookSerializer] dataToNotebook DONE after ${sw.elapsed()}ms`, {
                    viewType,
                    extensionId: extension.id.value,
                });
                return result;
            },
            notebookToData: (data) => {
                const sw = new StopWatch();
                const result = this._proxy.$notebookToData(handle, new SerializableObjectWithBuffers(NotebookDto.toNotebookDataDto(data)), CancellationToken.None);
                this._logService.trace(`[NotebookSerializer] notebookToData DONE after ${sw.elapsed()}`, {
                    viewType,
                    extensionId: extension.id.value,
                });
                return result;
            },
            save: async (uri, versionId, options, token) => {
                const stat = await this._proxy.$saveNotebook(handle, uri, versionId, options, token);
                return {
                    ...stat,
                    children: undefined,
                    resource: uri,
                };
            },
            searchInNotebooks: async (textQuery, token, allPriorityInfo) => {
                const contributedType = this._notebookService.getContributedNotebookType(viewType);
                if (!contributedType) {
                    return { results: [], limitHit: false };
                }
                const fileNames = contributedType.selectors;
                const includes = fileNames.map((selector) => {
                    const globPattern = selector.include ||
                        selector;
                    return globPattern.toString();
                });
                if (!includes.length) {
                    return {
                        results: [],
                        limitHit: false,
                    };
                }
                const thisPriorityInfo = coalesce([
                    { isFromSettings: false, filenamePatterns: includes },
                    ...(allPriorityInfo.get(viewType) ?? []),
                ]);
                const otherEditorsPriorityInfo = Array.from(allPriorityInfo.keys()).flatMap((key) => {
                    if (key !== viewType) {
                        return allPriorityInfo.get(key) ?? [];
                    }
                    return [];
                });
                const searchComplete = await this._proxy.$searchInNotebooks(handle, textQuery, thisPriorityInfo, otherEditorsPriorityInfo, token);
                const revivedResults = searchComplete.results.map((result) => {
                    const resource = URI.revive(result.resource);
                    return {
                        resource,
                        cellResults: result.cellResults.map((e) => revive(e)),
                    };
                });
                return { results: revivedResults, limitHit: searchComplete.limitHit };
            },
        }));
        if (data) {
            disposables.add(this._notebookService.registerContributedNotebookType(viewType, data));
        }
        this._notebookSerializer.set(handle, disposables);
        this._logService.trace('[NotebookSerializer] registered notebook serializer', {
            viewType,
            extensionId: extension.id.value,
        });
    }
    $unregisterNotebookSerializer(handle) {
        this._notebookSerializer.get(handle)?.dispose();
        this._notebookSerializer.delete(handle);
    }
    $emitCellStatusBarEvent(eventHandle) {
        const emitter = this._notebookCellStatusBarRegistrations.get(eventHandle);
        if (emitter instanceof Emitter) {
            emitter.fire(undefined);
        }
    }
    async $registerNotebookCellStatusBarItemProvider(handle, eventHandle, viewType) {
        const that = this;
        const provider = {
            async provideCellStatusBarItems(uri, index, token) {
                const result = await that._proxy.$provideNotebookCellStatusBarItems(handle, uri, index, token);
                return {
                    items: result?.items ?? [],
                    dispose() {
                        if (result) {
                            that._proxy.$releaseNotebookCellStatusBarItems(result.cacheId);
                        }
                    },
                };
            },
            viewType,
        };
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._notebookCellStatusBarRegistrations.set(eventHandle, emitter);
            provider.onDidChangeStatusBarItems = emitter.event;
        }
        const disposable = this._cellStatusBarService.registerCellStatusBarItemProvider(provider);
        this._notebookCellStatusBarRegistrations.set(handle, disposable);
    }
    async $unregisterNotebookCellStatusBarItemProvider(handle, eventHandle) {
        const unregisterThing = (handle) => {
            const entry = this._notebookCellStatusBarRegistrations.get(handle);
            if (entry) {
                this._notebookCellStatusBarRegistrations.get(handle)?.dispose();
                this._notebookCellStatusBarRegistrations.delete(handle);
            }
        };
        unregisterThing(handle);
        if (typeof eventHandle === 'number') {
            unregisterThing(eventHandle);
        }
    }
};
MainThreadNotebooks = __decorate([
    extHostNamedCustomer(MainContext.MainThreadNotebook),
    __param(1, INotebookService),
    __param(2, INotebookCellStatusBarService),
    __param(3, ILogService)
], MainThreadNotebooks);
export { MainThreadNotebooks };
CommandsRegistry.registerCommand('_executeDataToNotebook', async (accessor, ...args) => {
    const [notebookType, bytes] = args;
    assertType(typeof notebookType === 'string', 'string');
    assertType(bytes instanceof VSBuffer, 'VSBuffer');
    const notebookService = accessor.get(INotebookService);
    const info = await notebookService.withNotebookDataProvider(notebookType);
    if (!(info instanceof SimpleNotebookProviderInfo)) {
        return;
    }
    const dto = await info.serializer.dataToNotebook(bytes);
    return new SerializableObjectWithBuffers(NotebookDto.toNotebookDataDto(dto));
});
CommandsRegistry.registerCommand('_executeNotebookToData', async (accessor, ...args) => {
    const [notebookType, dto] = args;
    assertType(typeof notebookType === 'string', 'string');
    assertType(typeof dto === 'object');
    const notebookService = accessor.get(INotebookService);
    const info = await notebookService.withNotebookDataProvider(notebookType);
    if (!(info instanceof SimpleNotebookProviderInfo)) {
        return;
    }
    const data = NotebookDto.fromNotebookDataDto(dto.value);
    const bytes = await info.serializer.notebookToData(data);
    return bytes;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWROb3RlYm9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDekYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQVM3RyxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLDBCQUEwQixHQUMxQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNuRyxPQUFPLEVBQ04sY0FBYyxFQUVkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixD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