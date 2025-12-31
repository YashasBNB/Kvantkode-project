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
import { DisposableStore, dispose } from '../../../base/common/lifecycle.js';
import { equals } from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../platform/editor/common/editor.js';
import { getNotebookEditorFromEditorPane, } from '../../contrib/notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../contrib/notebook/browser/services/notebookEditorService.js';
import { columnToEditorGroup, editorGroupToColumn, } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ExtHostContext, NotebookEditorRevealType, } from '../common/extHost.protocol.js';
class MainThreadNotebook {
    constructor(editor, disposables) {
        this.editor = editor;
        this.disposables = disposables;
    }
    dispose() {
        this.disposables.dispose();
    }
}
let MainThreadNotebookEditors = class MainThreadNotebookEditors {
    constructor(extHostContext, _editorService, _notebookEditorService, _editorGroupService, _configurationService) {
        this._editorService = _editorService;
        this._notebookEditorService = _notebookEditorService;
        this._editorGroupService = _editorGroupService;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this._mainThreadEditors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookEditors);
        this._editorService.onDidActiveEditorChange(() => this._updateEditorViewColumns(), this, this._disposables);
        this._editorGroupService.onDidRemoveGroup(() => this._updateEditorViewColumns(), this, this._disposables);
        this._editorGroupService.onDidMoveGroup(() => this._updateEditorViewColumns(), this, this._disposables);
    }
    dispose() {
        this._disposables.dispose();
        dispose(this._mainThreadEditors.values());
    }
    handleEditorsAdded(editors) {
        for (const editor of editors) {
            const editorDisposables = new DisposableStore();
            editorDisposables.add(editor.onDidChangeVisibleRanges(() => {
                this._proxy.$acceptEditorPropertiesChanged(editor.getId(), {
                    visibleRanges: { ranges: editor.visibleRanges },
                });
            }));
            editorDisposables.add(editor.onDidChangeSelection(() => {
                this._proxy.$acceptEditorPropertiesChanged(editor.getId(), {
                    selections: { selections: editor.getSelections() },
                });
            }));
            const wrapper = new MainThreadNotebook(editor, editorDisposables);
            this._mainThreadEditors.set(editor.getId(), wrapper);
        }
    }
    handleEditorsRemoved(editorIds) {
        for (const id of editorIds) {
            this._mainThreadEditors.get(id)?.dispose();
            this._mainThreadEditors.delete(id);
        }
    }
    _updateEditorViewColumns() {
        const result = Object.create(null);
        for (const editorPane of this._editorService.visibleEditorPanes) {
            const candidate = getNotebookEditorFromEditorPane(editorPane);
            if (candidate && this._mainThreadEditors.has(candidate.getId())) {
                result[candidate.getId()] = editorGroupToColumn(this._editorGroupService, editorPane.group);
            }
        }
        if (!equals(result, this._currentViewColumnInfo)) {
            this._currentViewColumnInfo = result;
            this._proxy.$acceptEditorViewColumns(result);
        }
    }
    async $tryShowNotebookDocument(resource, viewType, options) {
        const editorOptions = {
            cellSelections: options.selections,
            preserveFocus: options.preserveFocus,
            pinned: options.pinned,
            // selection: options.selection,
            // preserve pre 1.38 behaviour to not make group active when preserveFocus: true
            // but make sure to restore the editor to fix https://github.com/microsoft/vscode/issues/79633
            activation: options.preserveFocus ? EditorActivation.RESTORE : undefined,
            label: options.label,
            override: viewType,
        };
        const editorPane = await this._editorService.openEditor({ resource: URI.revive(resource), options: editorOptions }, columnToEditorGroup(this._editorGroupService, this._configurationService, options.position));
        const notebookEditor = getNotebookEditorFromEditorPane(editorPane);
        if (notebookEditor) {
            return notebookEditor.getId();
        }
        else {
            throw new Error(`Notebook Editor creation failure for document ${JSON.stringify(resource)}`);
        }
    }
    async $tryRevealRange(id, range, revealType) {
        const editor = this._notebookEditorService.getNotebookEditor(id);
        if (!editor) {
            return;
        }
        const notebookEditor = editor;
        if (!notebookEditor.hasModel()) {
            return;
        }
        if (range.start >= notebookEditor.getLength()) {
            return;
        }
        const cell = notebookEditor.cellAt(range.start);
        switch (revealType) {
            case NotebookEditorRevealType.Default:
                return notebookEditor.revealCellRangeInView(range);
            case NotebookEditorRevealType.InCenter:
                return notebookEditor.revealInCenter(cell);
            case NotebookEditorRevealType.InCenterIfOutsideViewport:
                return notebookEditor.revealInCenterIfOutsideViewport(cell);
            case NotebookEditorRevealType.AtTop:
                return notebookEditor.revealInViewAtTop(cell);
        }
    }
    $trySetSelections(id, ranges) {
        const editor = this._notebookEditorService.getNotebookEditor(id);
        if (!editor) {
            return;
        }
        editor.setSelections(ranges);
        if (ranges.length) {
            editor.setFocus({ start: ranges[0].start, end: ranges[0].start + 1 });
        }
    }
};
MainThreadNotebookEditors = __decorate([
    __param(1, IEditorService),
    __param(2, INotebookEditorService),
    __param(3, IEditorGroupsService),
    __param(4, IConfigurationService)
], MainThreadNotebookEditors);
export { MainThreadNotebookEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTm90ZWJvb2tFZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDNUUsT0FBTyxFQUNOLCtCQUErQixHQUcvQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRXpHLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBQ25CLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRTlFLE9BQU8sRUFDTixjQUFjLEVBS2Qsd0JBQXdCLEdBQ3hCLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsTUFBTSxrQkFBa0I7SUFDdkIsWUFDVSxNQUF1QixFQUN2QixXQUE0QjtRQUQ1QixXQUFNLEdBQU4sTUFBTSxDQUFpQjtRQUN2QixnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7SUFDbkMsQ0FBQztJQUVKLE9BQU87UUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLE9B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