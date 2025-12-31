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
import { combinedDisposable, DisposableStore, DisposableMap, } from '../../../base/common/lifecycle.js';
import { isCodeEditor, isDiffEditor, } from '../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { shouldSynchronizeModel } from '../../../editor/common/model.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { extHostCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { MainThreadDocuments } from './mainThreadDocuments.js';
import { MainThreadTextEditor } from './mainThreadEditor.js';
import { MainThreadTextEditors } from './mainThreadEditors.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { AbstractTextEditor } from '../../browser/parts/editor/textEditor.js';
import { editorGroupToColumn, } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IWorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { diffSets, diffMaps } from '../../../base/common/collections.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IQuickDiffModelService } from '../../contrib/scm/browser/quickDiffModel.js';
class TextEditorSnapshot {
    constructor(editor) {
        this.editor = editor;
        this.id = `${editor.getId()},${editor.getModel().id}`;
    }
}
class DocumentAndEditorStateDelta {
    constructor(removedDocuments, addedDocuments, removedEditors, addedEditors, oldActiveEditor, newActiveEditor) {
        this.removedDocuments = removedDocuments;
        this.addedDocuments = addedDocuments;
        this.removedEditors = removedEditors;
        this.addedEditors = addedEditors;
        this.oldActiveEditor = oldActiveEditor;
        this.newActiveEditor = newActiveEditor;
        this.isEmpty =
            this.removedDocuments.length === 0 &&
                this.addedDocuments.length === 0 &&
                this.removedEditors.length === 0 &&
                this.addedEditors.length === 0 &&
                oldActiveEditor === newActiveEditor;
    }
    toString() {
        let ret = 'DocumentAndEditorStateDelta\n';
        ret += `\tRemoved Documents: [${this.removedDocuments.map((d) => d.uri.toString(true)).join(', ')}]\n`;
        ret += `\tAdded Documents: [${this.addedDocuments.map((d) => d.uri.toString(true)).join(', ')}]\n`;
        ret += `\tRemoved Editors: [${this.removedEditors.map((e) => e.id).join(', ')}]\n`;
        ret += `\tAdded Editors: [${this.addedEditors.map((e) => e.id).join(', ')}]\n`;
        ret += `\tNew Active Editor: ${this.newActiveEditor}\n`;
        return ret;
    }
}
class DocumentAndEditorState {
    static compute(before, after) {
        if (!before) {
            return new DocumentAndEditorStateDelta([], [...after.documents.values()], [], [...after.textEditors.values()], undefined, after.activeEditor);
        }
        const documentDelta = diffSets(before.documents, after.documents);
        const editorDelta = diffMaps(before.textEditors, after.textEditors);
        const oldActiveEditor = before.activeEditor !== after.activeEditor ? before.activeEditor : undefined;
        const newActiveEditor = before.activeEditor !== after.activeEditor ? after.activeEditor : undefined;
        return new DocumentAndEditorStateDelta(documentDelta.removed, documentDelta.added, editorDelta.removed, editorDelta.added, oldActiveEditor, newActiveEditor);
    }
    constructor(documents, textEditors, activeEditor) {
        this.documents = documents;
        this.textEditors = textEditors;
        this.activeEditor = activeEditor;
        //
    }
}
var ActiveEditorOrder;
(function (ActiveEditorOrder) {
    ActiveEditorOrder[ActiveEditorOrder["Editor"] = 0] = "Editor";
    ActiveEditorOrder[ActiveEditorOrder["Panel"] = 1] = "Panel";
})(ActiveEditorOrder || (ActiveEditorOrder = {}));
let MainThreadDocumentAndEditorStateComputer = class MainThreadDocumentAndEditorStateComputer {
    constructor(_onDidChangeState, _modelService, _codeEditorService, _editorService, _paneCompositeService) {
        this._onDidChangeState = _onDidChangeState;
        this._modelService = _modelService;
        this._codeEditorService = _codeEditorService;
        this._editorService = _editorService;
        this._paneCompositeService = _paneCompositeService;
        this._toDispose = new DisposableStore();
        this._toDisposeOnEditorRemove = new DisposableMap();
        this._activeEditorOrder = 0 /* ActiveEditorOrder.Editor */;
        this._modelService.onModelAdded(this._updateStateOnModelAdd, this, this._toDispose);
        this._modelService.onModelRemoved((_) => this._updateState(), this, this._toDispose);
        this._editorService.onDidActiveEditorChange((_) => this._updateState(), this, this._toDispose);
        this._codeEditorService.onCodeEditorAdd(this._onDidAddEditor, this, this._toDispose);
        this._codeEditorService.onCodeEditorRemove(this._onDidRemoveEditor, this, this._toDispose);
        this._codeEditorService.listCodeEditors().forEach(this._onDidAddEditor, this);
        Event.filter(this._paneCompositeService.onDidPaneCompositeOpen, (event) => event.viewContainerLocation === 1 /* ViewContainerLocation.Panel */)((_) => (this._activeEditorOrder = 1 /* ActiveEditorOrder.Panel */), undefined, this._toDispose);
        Event.filter(this._paneCompositeService.onDidPaneCompositeClose, (event) => event.viewContainerLocation === 1 /* ViewContainerLocation.Panel */)((_) => (this._activeEditorOrder = 0 /* ActiveEditorOrder.Editor */), undefined, this._toDispose);
        this._editorService.onDidVisibleEditorsChange((_) => (this._activeEditorOrder = 0 /* ActiveEditorOrder.Editor */), undefined, this._toDispose);
        this._updateState();
    }
    dispose() {
        this._toDispose.dispose();
        this._toDisposeOnEditorRemove.dispose();
    }
    _onDidAddEditor(e) {
        this._toDisposeOnEditorRemove.set(e.getId(), combinedDisposable(e.onDidChangeModel(() => this._updateState()), e.onDidFocusEditorText(() => this._updateState()), e.onDidFocusEditorWidget(() => this._updateState(e))));
        this._updateState();
    }
    _onDidRemoveEditor(e) {
        const id = e.getId();
        if (this._toDisposeOnEditorRemove.has(id)) {
            this._toDisposeOnEditorRemove.deleteAndDispose(id);
            this._updateState();
        }
    }
    _updateStateOnModelAdd(model) {
        if (!shouldSynchronizeModel(model)) {
            // ignore
            return;
        }
        if (!this._currentState) {
            // too early
            this._updateState();
            return;
        }
        // small (fast) delta
        this._currentState = new DocumentAndEditorState(this._currentState.documents.add(model), this._currentState.textEditors, this._currentState.activeEditor);
        this._onDidChangeState(new DocumentAndEditorStateDelta([], [model], [], [], undefined, undefined));
    }
    _updateState(widgetFocusCandidate) {
        // models: ignore too large models
        const models = new Set();
        for (const model of this._modelService.getModels()) {
            if (shouldSynchronizeModel(model)) {
                models.add(model);
            }
        }
        // editor: only take those that have a not too large model
        const editors = new Map();
        let activeEditor = null; // Strict null work. This doesn't like being undefined!
        for (const editor of this._codeEditorService.listCodeEditors()) {
            if (editor.isSimpleWidget) {
                continue;
            }
            const model = editor.getModel();
            if (editor.hasModel() &&
                model &&
                shouldSynchronizeModel(model) &&
                !model.isDisposed() && // model disposed
                Boolean(this._modelService.getModel(model.uri)) // model disposing, the flag didn't flip yet but the model service already removed it
            ) {
                const apiEditor = new TextEditorSnapshot(editor);
                editors.set(apiEditor.id, apiEditor);
                if (editor.hasTextFocus() || (widgetFocusCandidate === editor && editor.hasWidgetFocus())) {
                    // text focus has priority, widget focus is tricky because multiple
                    // editors might claim widget focus at the same time. therefore we use a
                    // candidate (which is the editor that has raised an widget focus event)
                    // in addition to the widget focus check
                    activeEditor = apiEditor.id;
                }
            }
        }
        // active editor: if none of the previous editors had focus we try
        // to match output panels or the active workbench editor with
        // one of editor we have just computed
        if (!activeEditor) {
            let candidate;
            if (this._activeEditorOrder === 0 /* ActiveEditorOrder.Editor */) {
                candidate = this._getActiveEditorFromEditorPart() || this._getActiveEditorFromPanel();
            }
            else {
                candidate = this._getActiveEditorFromPanel() || this._getActiveEditorFromEditorPart();
            }
            if (candidate) {
                for (const snapshot of editors.values()) {
                    if (candidate === snapshot.editor) {
                        activeEditor = snapshot.id;
                    }
                }
            }
        }
        // compute new state and compare against old
        const newState = new DocumentAndEditorState(models, editors, activeEditor);
        const delta = DocumentAndEditorState.compute(this._currentState, newState);
        if (!delta.isEmpty) {
            this._currentState = newState;
            this._onDidChangeState(delta);
        }
    }
    _getActiveEditorFromPanel() {
        const panel = this._paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if (panel instanceof AbstractTextEditor) {
            const control = panel.getControl();
            if (isCodeEditor(control)) {
                return control;
            }
        }
        return undefined;
    }
    _getActiveEditorFromEditorPart() {
        let activeTextEditorControl = this._editorService.activeTextEditorControl;
        if (isDiffEditor(activeTextEditorControl)) {
            activeTextEditorControl = activeTextEditorControl.getModifiedEditor();
        }
        return activeTextEditorControl;
    }
};
MainThreadDocumentAndEditorStateComputer = __decorate([
    __param(1, IModelService),
    __param(2, ICodeEditorService),
    __param(3, IEditorService),
    __param(4, IPaneCompositePartService)
], MainThreadDocumentAndEditorStateComputer);
let MainThreadDocumentsAndEditors = class MainThreadDocumentsAndEditors {
    constructor(extHostContext, _modelService, _textFileService, _editorService, codeEditorService, fileService, textModelResolverService, _editorGroupService, paneCompositeService, environmentService, workingCopyFileService, uriIdentityService, _clipboardService, pathService, configurationService, quickDiffModelService) {
        this._modelService = _modelService;
        this._textFileService = _textFileService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._clipboardService = _clipboardService;
        this._toDispose = new DisposableStore();
        this._textEditors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentsAndEditors);
        this._mainThreadDocuments = this._toDispose.add(new MainThreadDocuments(extHostContext, this._modelService, this._textFileService, fileService, textModelResolverService, environmentService, uriIdentityService, workingCopyFileService, pathService));
        extHostContext.set(MainContext.MainThreadDocuments, this._mainThreadDocuments);
        this._mainThreadEditors = this._toDispose.add(new MainThreadTextEditors(this, extHostContext, codeEditorService, this._editorService, this._editorGroupService, configurationService, quickDiffModelService, uriIdentityService));
        extHostContext.set(MainContext.MainThreadTextEditors, this._mainThreadEditors);
        // It is expected that the ctor of the state computer calls our `_onDelta`.
        this._toDispose.add(new MainThreadDocumentAndEditorStateComputer((delta) => this._onDelta(delta), _modelService, codeEditorService, this._editorService, paneCompositeService));
    }
    dispose() {
        this._toDispose.dispose();
    }
    _onDelta(delta) {
        const removedEditors = [];
        const addedEditors = [];
        // removed models
        const removedDocuments = delta.removedDocuments.map((m) => m.uri);
        // added editors
        for (const apiEditor of delta.addedEditors) {
            const mainThreadEditor = new MainThreadTextEditor(apiEditor.id, apiEditor.editor.getModel(), apiEditor.editor, { onGainedFocus() { }, onLostFocus() { } }, this._mainThreadDocuments, this._modelService, this._clipboardService);
            this._textEditors.set(apiEditor.id, mainThreadEditor);
            addedEditors.push(mainThreadEditor);
        }
        // removed editors
        for (const { id } of delta.removedEditors) {
            const mainThreadEditor = this._textEditors.get(id);
            if (mainThreadEditor) {
                mainThreadEditor.dispose();
                this._textEditors.delete(id);
                removedEditors.push(id);
            }
        }
        const extHostDelta = Object.create(null);
        let empty = true;
        if (delta.newActiveEditor !== undefined) {
            empty = false;
            extHostDelta.newActiveEditor = delta.newActiveEditor;
        }
        if (removedDocuments.length > 0) {
            empty = false;
            extHostDelta.removedDocuments = removedDocuments;
        }
        if (removedEditors.length > 0) {
            empty = false;
            extHostDelta.removedEditors = removedEditors;
        }
        if (delta.addedDocuments.length > 0) {
            empty = false;
            extHostDelta.addedDocuments = delta.addedDocuments.map((m) => this._toModelAddData(m));
        }
        if (delta.addedEditors.length > 0) {
            empty = false;
            extHostDelta.addedEditors = addedEditors.map((e) => this._toTextEditorAddData(e));
        }
        if (!empty) {
            // first update ext host
            this._proxy.$acceptDocumentsAndEditorsDelta(extHostDelta);
            // second update dependent document/editor states
            removedDocuments.forEach(this._mainThreadDocuments.handleModelRemoved, this._mainThreadDocuments);
            delta.addedDocuments.forEach(this._mainThreadDocuments.handleModelAdded, this._mainThreadDocuments);
            removedEditors.forEach(this._mainThreadEditors.handleTextEditorRemoved, this._mainThreadEditors);
            addedEditors.forEach(this._mainThreadEditors.handleTextEditorAdded, this._mainThreadEditors);
        }
    }
    _toModelAddData(model) {
        return {
            uri: model.uri,
            versionId: model.getVersionId(),
            lines: model.getLinesContent(),
            EOL: model.getEOL(),
            languageId: model.getLanguageId(),
            isDirty: this._textFileService.isDirty(model.uri),
            encoding: this._textFileService.getEncoding(model.uri),
        };
    }
    _toTextEditorAddData(textEditor) {
        const props = textEditor.getProperties();
        return {
            id: textEditor.getId(),
            documentUri: textEditor.getModel().uri,
            options: props.options,
            selections: props.selections,
            visibleRanges: props.visibleRanges,
            editorPosition: this._findEditorPosition(textEditor),
        };
    }
    _findEditorPosition(editor) {
        for (const editorPane of this._editorService.visibleEditorPanes) {
            if (editor.matches(editorPane)) {
                return editorGroupToColumn(this._editorGroupService, editorPane.group);
            }
        }
        return undefined;
    }
    findTextEditorIdFor(editorPane) {
        for (const [id, editor] of this._textEditors) {
            if (editor.matches(editorPane)) {
                return id;
            }
        }
        return undefined;
    }
    getIdOfCodeEditor(codeEditor) {
        for (const [id, editor] of this._textEditors) {
            if (editor.getCodeEditor() === codeEditor) {
                return id;
            }
        }
        return undefined;
    }
    getEditor(id) {
        return this._textEditors.get(id);
    }
};
MainThreadDocumentsAndEditors = __decorate([
    extHostCustomer,
    __param(1, IModelService),
    __param(2, ITextFileService),
    __param(3, IEditorService),
    __param(4, ICodeEditorService),
    __param(5, IFileService),
    __param(6, ITextModelService),
    __param(7, IEditorGroupsService),
    __param(8, IPaneCompositePartService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IWorkingCopyFileService),
    __param(11, IUriIdentityService),
    __param(12, IClipboardService),
    __param(13, IPathService),
    __param(14, IConfigurationService),
    __param(15, IQuickDiffModelService)
], MainThreadDocumentsAndEditors);
export { MainThreadDocumentsAndEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50c0FuZEVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZERvY3VtZW50c0FuZEVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZUFBZSxFQUNmLGFBQWEsR0FDYixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFFTixZQUFZLEVBQ1osWUFBWSxHQUVaLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFMUYsT0FBTyxFQUFjLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUQsT0FBTyxFQUNOLGNBQWMsRUFLZCxXQUFXLEdBQ1gsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUU3RSxP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