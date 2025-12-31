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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { registerWorkbenchContribution2, } from '../../../../../common/contributions.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { CellEditState, getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { RedoCommand, UndoCommand } from '../../../../../../editor/browser/editorExtensions.js';
let NotebookUndoRedoContribution = class NotebookUndoRedoContribution extends Disposable {
    static { this.ID = 'workbench.contrib.notebookUndoRedo'; }
    constructor(_editorService) {
        super();
        this._editorService = _editorService;
        const PRIORITY = 105;
        this._register(UndoCommand.addImplementation(PRIORITY, 'notebook-undo-redo', () => {
            const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
            const viewModel = editor?.getViewModel();
            if (editor && editor.hasModel() && viewModel) {
                return viewModel.undo().then((cellResources) => {
                    if (cellResources?.length) {
                        for (let i = 0; i < editor.getLength(); i++) {
                            const cell = editor.cellAt(i);
                            if (cell.cellKind === CellKind.Markup &&
                                cellResources.find((resource) => resource.fragment === cell.model.uri.fragment)) {
                                cell.updateEditState(CellEditState.Editing, 'undo');
                            }
                        }
                        editor?.setOptions({
                            cellOptions: { resource: cellResources[0] },
                            preserveFocus: true,
                        });
                    }
                });
            }
            return false;
        }));
        this._register(RedoCommand.addImplementation(PRIORITY, 'notebook-undo-redo', () => {
            const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
            const viewModel = editor?.getViewModel();
            if (editor && editor.hasModel() && viewModel) {
                return viewModel.redo().then((cellResources) => {
                    if (cellResources?.length) {
                        for (let i = 0; i < editor.getLength(); i++) {
                            const cell = editor.cellAt(i);
                            if (cell.cellKind === CellKind.Markup &&
                                cellResources.find((resource) => resource.fragment === cell.model.uri.fragment)) {
                                cell.updateEditState(CellEditState.Editing, 'redo');
                            }
                        }
                        editor?.setOptions({
                            cellOptions: { resource: cellResources[0] },
                            preserveFocus: true,
                        });
                    }
                });
            }
            return false;
        }));
    }
};
NotebookUndoRedoContribution = __decorate([
    __param(0, IEditorService)
], NotebookUndoRedoContribution);
registerWorkbenchContribution2(NotebookUndoRedoContribution.ID, NotebookUndoRedoContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tVbmRvUmVkby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi91bmRvUmVkby9ub3RlYm9va1VuZG9SZWRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBRU4sOEJBQThCLEdBQzlCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUcvRixJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFDcEMsT0FBRSxHQUFHLG9DQUFvQyxBQUF2QyxDQUF1QztJQUV6RCxZQUE2QyxjQUE4QjtRQUMxRSxLQUFLLEVBQUUsQ0FBQTtRQURxQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFHMUUsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ3BCLElBQUksQ0FBQyxTQUFTLENBQ2IsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7WUFDbEUsTUFBTSxNQUFNLEdBQUcsK0JBQStCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3BGLE1BQU0sU0FBUyxHQUFHLE1BQU0sRUFBRSxZQUFZLEVBQW1DLENBQUE7WUFD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