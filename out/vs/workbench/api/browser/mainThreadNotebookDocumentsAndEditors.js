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
var MainThreadNotebooksAndEditors_1;
import { diffMaps, diffSets } from '../../../base/common/collections.js';
import { combinedDisposable, DisposableStore, DisposableMap, } from '../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainThreadNotebookDocuments } from './mainThreadNotebookDocuments.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { MainThreadNotebookEditors } from './mainThreadNotebookEditors.js';
import { extHostCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { getNotebookEditorFromEditorPane, } from '../../contrib/notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../contrib/notebook/browser/services/notebookEditorService.js';
import { INotebookService } from '../../contrib/notebook/common/notebookService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
class NotebookAndEditorState {
    static delta(before, after) {
        if (!before) {
            return {
                addedDocuments: [...after.documents],
                removedDocuments: [],
                addedEditors: [...after.textEditors.values()],
                removedEditors: [],
                visibleEditors: [...after.visibleEditors].map((editor) => editor[0]),
            };
        }
        const documentDelta = diffSets(before.documents, after.documents);
        const editorDelta = diffMaps(before.textEditors, after.textEditors);
        const newActiveEditor = before.activeEditor !== after.activeEditor ? after.activeEditor : undefined;
        const visibleEditorDelta = diffMaps(before.visibleEditors, after.visibleEditors);
        return {
            addedDocuments: documentDelta.added,
            removedDocuments: documentDelta.removed.map((e) => e.uri),
            addedEditors: editorDelta.added,
            removedEditors: editorDelta.removed.map((removed) => removed.getId()),
            newActiveEditor: newActiveEditor,
            visibleEditors: visibleEditorDelta.added.length === 0 && visibleEditorDelta.removed.length === 0
                ? undefined
                : [...after.visibleEditors].map((editor) => editor[0]),
        };
    }
    constructor(documents, textEditors, activeEditor, visibleEditors) {
        this.documents = documents;
        this.textEditors = textEditors;
        this.activeEditor = activeEditor;
        this.visibleEditors = visibleEditors;
        //
    }
}
let MainThreadNotebooksAndEditors = MainThreadNotebooksAndEditors_1 = class MainThreadNotebooksAndEditors {
    constructor(extHostContext, instantiationService, _notebookService, _notebookEditorService, _editorService, _editorGroupService, _logService) {
        this._notebookService = _notebookService;
        this._notebookEditorService = _notebookEditorService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._logService = _logService;
        this._disposables = new DisposableStore();
        this._editorListeners = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebook);
        this._mainThreadNotebooks = instantiationService.createInstance(MainThreadNotebookDocuments, extHostContext);
        this._mainThreadEditors = instantiationService.createInstance(MainThreadNotebookEditors, extHostContext);
        extHostContext.set(MainContext.MainThreadNotebookDocuments, this._mainThreadNotebooks);
        extHostContext.set(MainContext.MainThreadNotebookEditors, this._mainThreadEditors);
        this._notebookService.onWillAddNotebookDocument(() => this._updateState(), this, this._disposables);
        this._notebookService.onDidRemoveNotebookDocument(() => this._updateState(), this, this._disposables);
        this._editorService.onDidActiveEditorChange(() => this._updateState(), this, this._disposables);
        this._editorService.onDidVisibleEditorsChange(() => this._updateState(), this, this._disposables);
        this._notebookEditorService.onDidAddNotebookEditor(this._handleEditorAdd, this, this._disposables);
        this._notebookEditorService.onDidRemoveNotebookEditor(this._handleEditorRemove, this, this._disposables);
        this._updateState();
    }
    dispose() {
        this._mainThreadNotebooks.dispose();
        this._mainThreadEditors.dispose();
        this._disposables.dispose();
        this._editorListeners.dispose();
    }
    _handleEditorAdd(editor) {
        this._editorListeners.set(editor.getId(), combinedDisposable(editor.onDidChangeModel(() => this._updateState()), editor.onDidFocusWidget(() => this._updateState(editor))));
        this._updateState();
    }
    _handleEditorRemove(editor) {
        this._editorListeners.deleteAndDispose(editor.getId());
        this._updateState();
    }
    _updateState(focusedEditor) {
        const editors = new Map();
        const visibleEditorsMap = new Map();
        for (const editor of this._notebookEditorService.listNotebookEditors()) {
            if (editor.hasModel()) {
                editors.set(editor.getId(), editor);
            }
        }
        const activeNotebookEditor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        let activeEditor = null;
        if (activeNotebookEditor) {
            activeEditor = activeNotebookEditor.getId();
        }
        else if (focusedEditor?.textModel) {
            activeEditor = focusedEditor.getId();
        }
        if (activeEditor && !editors.has(activeEditor)) {
            this._logService.trace('MainThreadNotebooksAndEditors#_updateState: active editor is not in editors list', activeEditor, editors.keys());
            activeEditor = null;
        }
        for (const editorPane of this._editorService.visibleEditorPanes) {
            const notebookEditor = getNotebookEditorFromEditorPane(editorPane);
            if (notebookEditor?.hasModel() && editors.has(notebookEditor.getId())) {
                visibleEditorsMap.set(notebookEditor.getId(), notebookEditor);
            }
        }
        const newState = new NotebookAndEditorState(new Set(this._notebookService.listNotebookDocuments()), editors, activeEditor, visibleEditorsMap);
        this._onDelta(NotebookAndEditorState.delta(this._currentState, newState));
        this._currentState = newState;
    }
    _onDelta(delta) {
        if (MainThreadNotebooksAndEditors_1._isDeltaEmpty(delta)) {
            return;
        }
        const dto = {
            removedDocuments: delta.removedDocuments,
            removedEditors: delta.removedEditors,
            newActiveEditor: delta.newActiveEditor,
            visibleEditors: delta.visibleEditors,
            addedDocuments: delta.addedDocuments.map(MainThreadNotebooksAndEditors_1._asModelAddData),
            addedEditors: delta.addedEditors.map(this._asEditorAddData, this),
        };
        // send to extension FIRST
        this._proxy.$acceptDocumentAndEditorsDelta(new SerializableObjectWithBuffers(dto));
        // handle internally
        this._mainThreadEditors.handleEditorsRemoved(delta.removedEditors);
        this._mainThreadNotebooks.handleNotebooksRemoved(delta.removedDocuments);
        this._mainThreadNotebooks.handleNotebooksAdded(delta.addedDocuments);
        this._mainThreadEditors.handleEditorsAdded(delta.addedEditors);
    }
    static _isDeltaEmpty(delta) {
        if (delta.addedDocuments !== undefined && delta.addedDocuments.length > 0) {
            return false;
        }
        if (delta.removedDocuments !== undefined && delta.removedDocuments.length > 0) {
            return false;
        }
        if (delta.addedEditors !== undefined && delta.addedEditors.length > 0) {
            return false;
        }
        if (delta.removedEditors !== undefined && delta.removedEditors.length > 0) {
            return false;
        }
        if (delta.visibleEditors !== undefined && delta.visibleEditors.length > 0) {
            return false;
        }
        if (delta.newActiveEditor !== undefined) {
            return false;
        }
        return true;
    }
    static _asModelAddData(e) {
        return {
            viewType: e.viewType,
            uri: e.uri,
            metadata: e.metadata,
            versionId: e.versionId,
            cells: e.cells.map(NotebookDto.toNotebookCellDto),
        };
    }
    _asEditorAddData(add) {
        const pane = this._editorService.visibleEditorPanes.find((pane) => getNotebookEditorFromEditorPane(pane) === add);
        return {
            id: add.getId(),
            documentUri: add.textModel.uri,
            selections: add.getSelections(),
            visibleRanges: add.visibleRanges,
            viewColumn: pane && editorGroupToColumn(this._editorGroupService, pane.group),
            viewType: add.getViewModel().viewType,
        };
    }
};
MainThreadNotebooksAndEditors = MainThreadNotebooksAndEditors_1 = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService),
    __param(2, INotebookService),
    __param(3, INotebookEditorService),
    __param(4, IEditorService),
    __param(5, IEditorGroupsService),
    __param(6, ILogService)
], MainThreadNotebooksAndEditors);
export { MainThreadNotebooksAndEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRG9jdW1lbnRzQW5kRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTm90ZWJvb2tEb2N1bWVudHNBbmRFZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZUFBZSxFQUNmLGFBQWEsR0FDYixNQUFNLG1DQUFtQyxDQUFBO0FBRTFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDeEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUNOLGVBQWUsR0FFZixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTiwrQkFBK0IsR0FHL0IsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUV6RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENB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