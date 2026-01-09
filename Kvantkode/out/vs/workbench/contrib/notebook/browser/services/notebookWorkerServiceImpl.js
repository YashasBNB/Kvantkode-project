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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXb3JrZXJTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va1dvcmtlclNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLE9BQU8sRUFFUCxZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQUdoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFakYsT0FBTyxFQUNOLE9BQU8sRUFHUCx1QkFBdUIsR0FFdkIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUdsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTFELElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQ1osU0FBUSxVQUFVO0lBT2xCLFlBQ21CLGVBQWlDLEVBQ3BDLFlBQTJCO1FBRTFDLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFDRCxjQUFjLENBQUMsUUFBYSxFQUFFLFFBQWE7UUFD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