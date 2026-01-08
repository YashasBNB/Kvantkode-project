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
import { Event } from '../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { BoundModelReferenceCollection } from './mainThreadDocuments.js';
import { NotebookCellsChangeType } from '../../contrib/notebook/common/notebookCommon.js';
import { INotebookEditorModelResolverService } from '../../contrib/notebook/common/notebookEditorModelResolverService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { ExtHostContext, } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
let MainThreadNotebookDocuments = class MainThreadNotebookDocuments {
    constructor(extHostContext, _notebookEditorModelResolverService, _uriIdentityService) {
        this._notebookEditorModelResolverService = _notebookEditorModelResolverService;
        this._uriIdentityService = _uriIdentityService;
        this._disposables = new DisposableStore();
        this._documentEventListenersMapping = new ResourceMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookDocuments);
        this._modelReferenceCollection = new BoundModelReferenceCollection(this._uriIdentityService.extUri);
        // forward dirty and save events
        this._disposables.add(this._notebookEditorModelResolverService.onDidChangeDirty((model) => this._proxy.$acceptDirtyStateChanged(model.resource, model.isDirty())));
        this._disposables.add(this._notebookEditorModelResolverService.onDidSaveNotebook((e) => this._proxy.$acceptModelSaved(e)));
        // when a conflict is going to happen RELEASE references that are held by extensions
        this._disposables.add(_notebookEditorModelResolverService.onWillFailWithConflict((e) => {
            this._modelReferenceCollection.remove(e.resource);
        }));
    }
    dispose() {
        this._disposables.dispose();
        this._modelReferenceCollection.dispose();
        dispose(this._documentEventListenersMapping.values());
    }
    handleNotebooksAdded(notebooks) {
        for (const textModel of notebooks) {
            const disposableStore = new DisposableStore();
            disposableStore.add(textModel.onDidChangeContent((event) => {
                const eventDto = {
                    versionId: event.versionId,
                    rawEvents: [],
                };
                for (const e of event.rawEvents) {
                    switch (e.kind) {
                        case NotebookCellsChangeType.ModelChange:
                            eventDto.rawEvents.push({
                                kind: e.kind,
                                changes: e.changes.map((diff) => [
                                    diff[0],
                                    diff[1],
                                    diff[2].map((cell) => NotebookDto.toNotebookCellDto(cell)),
                                ]),
                            });
                            break;
                        case NotebookCellsChangeType.Move:
                            eventDto.rawEvents.push({
                                kind: e.kind,
                                index: e.index,
                                length: e.length,
                                newIdx: e.newIdx,
                            });
                            break;
                        case NotebookCellsChangeType.Output:
                            eventDto.rawEvents.push({
                                kind: e.kind,
                                index: e.index,
                                outputs: e.outputs.map(NotebookDto.toNotebookOutputDto),
                            });
                            break;
                        case NotebookCellsChangeType.OutputItem:
                            eventDto.rawEvents.push({
                                kind: e.kind,
                                index: e.index,
                                outputId: e.outputId,
                                outputItems: e.outputItems.map(NotebookDto.toNotebookOutputItemDto),
                                append: e.append,
                            });
                            break;
                        case NotebookCellsChangeType.ChangeCellLanguage:
                        case NotebookCellsChangeType.ChangeCellContent:
                        case NotebookCellsChangeType.ChangeCellMetadata:
                        case NotebookCellsChangeType.ChangeCellInternalMetadata:
                            eventDto.rawEvents.push(e);
                            break;
                    }
                }
                const hasDocumentMetadataChangeEvent = event.rawEvents.find((e) => e.kind === NotebookCellsChangeType.ChangeDocumentMetadata);
                // using the model resolver service to know if the model is dirty or not.
                // assuming this is the first listener it can mean that at first the model
                // is marked as dirty and that another event is fired
                this._proxy.$acceptModelChanged(textModel.uri, new SerializableObjectWithBuffers(eventDto), this._notebookEditorModelResolverService.isDirty(textModel.uri), hasDocumentMetadataChangeEvent ? textModel.metadata : undefined);
            }));
            this._documentEventListenersMapping.set(textModel.uri, disposableStore);
        }
    }
    handleNotebooksRemoved(uris) {
        for (const uri of uris) {
            this._documentEventListenersMapping.get(uri)?.dispose();
            this._documentEventListenersMapping.delete(uri);
        }
    }
    async $tryCreateNotebook(options) {
        if (options.content) {
            const ref = await this._notebookEditorModelResolverService.resolve({ untitledResource: undefined }, options.viewType);
            // untitled notebooks are disposed when they get saved. we should not hold a reference
            // to such a disposed notebook and therefore dispose the reference as well
            Event.once(ref.object.notebook.onWillDispose)(() => {
                ref.dispose();
            });
            // untitled notebooks with content are dirty by default
            this._proxy.$acceptDirtyStateChanged(ref.object.resource, true);
            // apply content changes... slightly HACKY -> this triggers a change event
            if (options.content) {
                const data = NotebookDto.fromNotebookDataDto(options.content);
                ref.object.notebook.reset(data.cells, data.metadata, ref.object.notebook.transientOptions);
            }
            return ref.object.notebook.uri;
        }
        else {
            // If we aren't adding content, we don't need to resolve the full editor model yet.
            // This will allow us to adjust settings when the editor is opened, e.g. scratchpad
            const notebook = await this._notebookEditorModelResolverService.createUntitledNotebookTextModel(options.viewType);
            return notebook.uri;
        }
    }
    async $tryOpenNotebook(uriComponents) {
        const uri = URI.revive(uriComponents);
        const ref = await this._notebookEditorModelResolverService.resolve(uri, undefined);
        if (uriComponents.scheme === 'untitled') {
            // untitled notebooks are disposed when they get saved. we should not hold a reference
            // to such a disposed notebook and therefore dispose the reference as well
            ref.object.notebook.onWillDispose(() => {
                ref.dispose();
            });
        }
        this._modelReferenceCollection.add(uri, ref);
        return uri;
    }
    async $trySaveNotebook(uriComponents) {
        const uri = URI.revive(uriComponents);
        const ref = await this._notebookEditorModelResolverService.resolve(uri);
        const saveResult = await ref.object.save();
        ref.dispose();
        return saveResult;
    }
};
MainThreadNotebookDocuments = __decorate([
    __param(1, INotebookEditorModelResolverService),
    __param(2, IUriIdentityService)
], MainThreadNotebookDocuments);
export { MainThreadNotebookDocuments };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRG9jdW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE5vdGVib29rRG9jdW1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXhFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3pILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixjQUFjLEdBTWQsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDeEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFHNUYsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBMkI7SUFPdkMsWUFDQyxjQUErQixFQUUvQixtQ0FBeUYsRUFDcEUsbUJBQXlEO1FBRDdELHdDQUFtQyxHQUFuQyxtQ0FBbUMsQ0FBcUM7UUFDbkQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQVY5RCxpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFHcEMsbUNBQThCLEdBQUcsSUFBSSxXQUFXLEVBQW1CLENBQUE7UUFTbkYsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQzlFLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLDZCQUE2QixDQUNqRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUMvQixDQUFBO1FBRUQsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixJQUFJLENBQUMsbUNBQW1DLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNuRSxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQ3JFLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixJQUFJLENBQUMsbUNBQW1DLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNoRSxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUNoQyxDQUNELENBQUE7UUFFRCxvRkFBb0Y7UUFDcEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ3BCLG1DQUFtQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEUsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbEQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQixJQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDeEMsT0FBTyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxTQUF1QztRQUMzRCxLQUFLLE1BQU0sU0FBUyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7WUFDN0MsZUFBZSxDQUFDLEdBQUcsQ0FDbEIsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3RDLE1BQU0sUUFBUSxHQUFpQztvQkFDOUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO29CQUMxQixTQUFTLEVBQUUsRUFBRTtpQkFDYixDQUFBO2dCQUVELEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNqQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDaEIsS0FBSyx1QkFBdUIsQ0FBQyxXQUFXOzRCQUN2QyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztnQ0FDdkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dDQUNaLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FDckIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNSO29DQUNDLElBQUksQ0FBQyxDQUFDLENBQUM7b0NBQ1AsSUFBSSxDQUFDLENBQUMsQ0FBQztvQ0FDUCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7aUNBQ25CLENBQ3pDOzZCQUNELENBQUMsQ0FBQTs0QkFDRixNQUFLO3dCQUNOLEtBQUssdUJBQXVCLENBQUMsSUFBSTs0QkFDaEMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7Z0NBQ3ZCLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtnQ0FDWixLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7Z0NBQ2QsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNO2dDQUNoQixNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU07NkJBQ2hCLENBQUMsQ0FBQTs0QkFDRixNQUFLO3dCQUNOLEtBQUssdUJBQXVCLENBQUMsTUFBTTs0QkFDbEMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7Z0NBQ3ZCLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtnQ0FDWixLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7Z0NBQ2QsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQzs2QkFDdkQsQ0FBQyxDQUFBOzRCQUNGLE1BQUs7d0JBQ04sS0FBSyx1QkFBdUIsQ0FBQyxVQUFVOzRCQUN0QyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztnQ0FDdkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dDQUNaLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztnQ0FDZCxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVE7Z0NBQ3BCLFdBQVcsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUM7Z0NBQ25FLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTTs2QkFDaEIsQ0FBQyxDQUFBOzRCQUNGLE1BQUs7d0JBQ04sS0FBSyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQzt3QkFDaEQsS0FBSyx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FBQzt3QkFDL0MsS0FBSyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQzt3QkFDaEQsS0FBSyx1QkFBdUIsQ0FBQywwQkFBMEI7NEJBQ3RELFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBOzRCQUMxQixNQUFLO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFNLDhCQUE4QixHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUMxRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxzQkFBc0IsQ0FDaEUsQ0FBQTtnQkFFRCx5RUFBeUU7Z0JBQ3pFLDBFQUEwRTtnQkFDMUUscURBQXFEO2dCQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUM5QixTQUFTLENBQUMsR0FBRyxFQUNiLElBQUksNkJBQTZCLENBQUMsUUFBUSxDQUFDLEVBQzNDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUMvRCw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUMvRCxDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN4RSxDQUFDO0lBQ0YsQ0FBQztJQUVELHNCQUFzQixDQUFDLElBQVc7UUFDakMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsOEJBQThCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ3ZELElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEQsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FHeEI7UUFDQSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxPQUFPLENBQ2pFLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQy9CLE9BQU8sQ0FBQyxRQUFRLENBQ2hCLENBQUE7WUFFRCxzRkFBc0Y7WUFDdEYsMEVBQTBFO1lBQzFFLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxFQUFFO2dCQUNsRCxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZCxDQUFDLENBQUMsQ0FBQTtZQUVGLHVEQUF1RDtZQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRS9ELDBFQUEwRTtZQUMxRSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDN0QsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQzNGLENBQUM7WUFDRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQTtRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLG1GQUFtRjtZQUNuRixtRkFBbUY7WUFDbkYsTUFBTSxRQUFRLEdBQ2IsTUFBTSxJQUFJLENBQUMsbUNBQW1DLENBQUMsK0JBQStCLENBQzdFLE9BQU8sQ0FBQyxRQUFRLENBQ2hCLENBQUE7WUFDRixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUE7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsYUFBNEI7UUFDbEQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRWxGLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUN6QyxzRkFBc0Y7WUFDdEYsMEVBQTBFO1lBQzFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3RDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNkLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVDLE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUVELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxhQUE0QjtRQUNsRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRXJDLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLG1DQUFtQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN2RSxNQUFNLFVBQVUsR0FBRyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDMUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2IsT0FBTyxVQUFVLENBQUE7SUFDbEIsQ0FBQztDQUNELENBQUE7QUE3TFksMkJBQTJCO0lBU3JDLFdBQUEsbUNBQW1DLENBQUE7SUFFbkMsV0FBQSxtQkFBbUIsQ0FBQTtHQVhULDJCQUEyQixDQTZMdkMifQ==