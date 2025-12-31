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
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { createWebWorker } from '../../../../../base/browser/webWorkerFactory.js';
import { CellUri, NotebookCellsChangeType, } from '../../common/notebookCommon.js';
import { INotebookService } from '../../common/notebookService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { FileAccess, Schemas } from '../../../../../base/common/network.js';
import { isEqual } from '../../../../../base/common/resources.js';
let NotebookEditorWorkerServiceImpl = class NotebookEditorWorkerServiceImpl extends Disposable {
    constructor(notebookService, modelService) {
        super();
        this._workerManager = this._register(new WorkerManager(notebookService, modelService));
    }
    canComputeDiff(original, modified) {
        throw new Error('Method not implemented.');
    }
    computeDiff(original, modified) {
        return this._workerManager.withWorker().then((client) => {
            return client.computeDiff(original, modified);
        });
    }
    canPromptRecommendation(model) {
        return this._workerManager.withWorker().then((client) => {
            return client.canPromptRecommendation(model);
        });
    }
};
NotebookEditorWorkerServiceImpl = __decorate([
    __param(0, INotebookService),
    __param(1, IModelService)
], NotebookEditorWorkerServiceImpl);
export { NotebookEditorWorkerServiceImpl };
class WorkerManager extends Disposable {
    // private _lastWorkerUsedTime: number;
    constructor(_notebookService, _modelService) {
        super();
        this._notebookService = _notebookService;
        this._modelService = _modelService;
        this._editorWorkerClient = null;
        // this._lastWorkerUsedTime = (new Date()).getTime();
    }
    withWorker() {
        // this._lastWorkerUsedTime = (new Date()).getTime();
        if (!this._editorWorkerClient) {
            this._editorWorkerClient = new NotebookWorkerClient(this._notebookService, this._modelService);
            this._register(this._editorWorkerClient);
        }
        return Promise.resolve(this._editorWorkerClient);
    }
}
class NotebookEditorModelManager extends Disposable {
    constructor(_proxy, _notebookService, _modelService) {
        super();
        this._proxy = _proxy;
        this._notebookService = _notebookService;
        this._modelService = _modelService;
        this._syncedModels = Object.create(null);
        this._syncedModelsLastUsedTime = Object.create(null);
    }
    ensureSyncedResources(resources) {
        for (const resource of resources) {
            const resourceStr = resource.toString();
            if (!this._syncedModels[resourceStr]) {
                this._beginModelSync(resource);
            }
            if (this._syncedModels[resourceStr]) {
                this._syncedModelsLastUsedTime[resourceStr] = new Date().getTime();
            }
        }
    }
    _beginModelSync(resource) {
        const model = this._notebookService
            .listNotebookDocuments()
            .find((document) => document.uri.toString() === resource.toString());
        if (!model) {
            return;
        }
        const modelUrl = resource.toString();
        this._proxy.$acceptNewModel(model.uri.toString(), model.metadata, model.transientOptions.transientDocumentMetadata, model.cells.map((cell) => ({
            handle: cell.handle,
            url: cell.uri.toString(),
            source: cell.textBuffer.getLinesContent(),
            eol: cell.textBuffer.getEOL(),
            versionId: cell.textModel?.getVersionId() ?? 0,
            language: cell.language,
            mime: cell.mime,
            cellKind: cell.cellKind,
            outputs: cell.outputs.map((op) => ({ outputId: op.outputId, outputs: op.outputs })),
            metadata: cell.metadata,
            internalMetadata: cell.internalMetadata,
        })));
        const toDispose = new DisposableStore();
        const cellToDto = (cell) => {
            return {
                handle: cell.handle,
                url: cell.uri.toString(),
                source: cell.textBuffer.getLinesContent(),
                eol: cell.textBuffer.getEOL(),
                versionId: 0,
                language: cell.language,
                cellKind: cell.cellKind,
                outputs: cell.outputs.map((op) => ({ outputId: op.outputId, outputs: op.outputs })),
                metadata: cell.metadata,
                internalMetadata: cell.internalMetadata,
            };
        };
        const cellHandlers = new Set();
        const addCellContentChangeHandler = (cell) => {
            cellHandlers.add(cell);
            toDispose.add(cell.onDidChangeContent((e) => {
                if (typeof e === 'object' && e.type === 'model') {
                    this._proxy.$acceptCellModelChanged(modelUrl, cell.handle, e.event);
                }
            }));
        };
        model.cells.forEach((cell) => addCellContentChangeHandler(cell));
        // Possible some of the models have not yet been loaded.
        // If all have been loaded, for all cells, then no need to listen to model add events.
        if (model.cells.length !== cellHandlers.size) {
            toDispose.add(this._modelService.onModelAdded((textModel) => {
                if (textModel.uri.scheme !== Schemas.vscodeNotebookCell ||
                    !(textModel instanceof TextModel)) {
                    return;
                }
                const cellUri = CellUri.parse(textModel.uri);
                if (!cellUri || !isEqual(cellUri.notebook, model.uri)) {
                    return;
                }
                const cell = model.cells.find((cell) => cell.handle === cellUri.handle);
                if (cell) {
                    addCellContentChangeHandler(cell);
                }
            }));
        }
        toDispose.add(model.onDidChangeContent((event) => {
            const dto = [];
            event.rawEvents.forEach((e) => {
                switch (e.kind) {
                    case NotebookCellsChangeType.ModelChange:
                    case NotebookCellsChangeType.Initialize: {
                        dto.push({
                            kind: e.kind,
                            changes: e.changes.map((diff) => [
                                diff[0],
                                diff[1],
                                diff[2].map((cell) => cellToDto(cell)),
                            ]),
                        });
                        for (const change of e.changes) {
                            for (const cell of change[2]) {
                                addCellContentChangeHandler(cell);
                            }
                        }
                        break;
                    }
                    case NotebookCellsChangeType.Move: {
                        dto.push({
                            kind: NotebookCellsChangeType.Move,
                            index: e.index,
                            length: e.length,
                            newIdx: e.newIdx,
                            cells: e.cells.map((cell) => cellToDto(cell)),
                        });
                        break;
                    }
                    case NotebookCellsChangeType.ChangeCellContent:
                        // Changes to cell content are handled by the cell model change listener.
                        break;
                    case NotebookCellsChangeType.ChangeDocumentMetadata:
                        dto.push({
                            kind: e.kind,
                            metadata: e.metadata,
                        });
                    default:
                        dto.push(e);
                }
            });
            this._proxy.$acceptModelChanged(modelUrl.toString(), {
                rawEvents: dto,
                versionId: event.versionId,
            });
        }));
        toDispose.add(model.onWillDispose(() => {
            this._stopModelSync(modelUrl);
        }));
        toDispose.add(toDisposable(() => {
            this._proxy.$acceptRemovedModel(modelUrl);
        }));
        this._syncedModels[modelUrl] = toDispose;
    }
    _stopModelSync(modelUrl) {
        const toDispose = this._syncedModels[modelUrl];
        delete this._syncedModels[modelUrl];
        delete this._syncedModelsLastUsedTime[modelUrl];
        dispose(toDispose);
    }
}
class NotebookWorkerClient extends Disposable {
    constructor(_notebookService, _modelService) {
        super();
        this._notebookService = _notebookService;
        this._modelService = _modelService;
        this._worker = null;
        this._modelManager = null;
    }
    computeDiff(original, modified) {
        const proxy = this._ensureSyncedResources([original, modified]);
        return proxy.$computeDiff(original.toString(), modified.toString());
    }
    canPromptRecommendation(modelUri) {
        const proxy = this._ensureSyncedResources([modelUri]);
        return proxy.$canPromptRecommendation(modelUri.toString());
    }
    _getOrCreateModelManager(proxy) {
        if (!this._modelManager) {
            this._modelManager = this._register(new NotebookEditorModelManager(proxy, this._notebookService, this._modelService));
        }
        return this._modelManager;
    }
    _ensureSyncedResources(resources) {
        const proxy = this._getOrCreateWorker().proxy;
        this._getOrCreateModelManager(proxy).ensureSyncedResources(resources);
        return proxy;
    }
    _getOrCreateWorker() {
        if (!this._worker) {
            try {
                this._worker = this._register(createWebWorker(FileAccess.asBrowserUri('vs/workbench/contrib/notebook/common/services/notebookWebWorkerMain.js'), 'NotebookEditorWorker'));
            }
            catch (err) {
                throw err;
            }
        }
        return this._worker;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXb3JrZXJTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tXb3JrZXJTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEVBRVAsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFHaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRWpGLE9BQU8sRUFDTixPQUFPLEVBR1AsdUJBQXVCLEdBRXZCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUxRCxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUNaLFNBQVEsVUFBVTtJQU9sQixZQUNtQixlQUFpQyxFQUNwQyxZQUEyQjtRQUUxQyxLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBQ0QsY0FBYyxDQUFDLFFBQWEsRUFBRSxRQUFhO1FBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMs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