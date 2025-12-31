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
import { ResourceMap } from '../../../../../../base/common/map.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../../../common/contributions.js';
import { IDebugService } from '../../../../debug/common/debug.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { CellUri, NotebookCellsChangeType } from '../../../common/notebookCommon.js';
import { INotebookService } from '../../../common/notebookService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
let NotebookBreakpoints = class NotebookBreakpoints extends Disposable {
    constructor(_debugService, _notebookService, _editorService) {
        super();
        this._debugService = _debugService;
        this._editorService = _editorService;
        const listeners = new ResourceMap();
        this._register(_notebookService.onWillAddNotebookDocument((model) => {
            listeners.set(model.uri, model.onWillAddRemoveCells((e) => {
                // When deleting a cell, remove its breakpoints
                const debugModel = this._debugService.getModel();
                if (!debugModel.getBreakpoints().length) {
                    return;
                }
                if (e.rawEvent.kind !== NotebookCellsChangeType.ModelChange) {
                    return;
                }
                for (const change of e.rawEvent.changes) {
                    const [start, deleteCount] = change;
                    if (deleteCount > 0) {
                        const deleted = model.cells.slice(start, start + deleteCount);
                        for (const deletedCell of deleted) {
                            const cellBps = debugModel.getBreakpoints({ uri: deletedCell.uri });
                            cellBps.forEach((cellBp) => this._debugService.removeBreakpoints(cellBp.getId()));
                        }
                    }
                }
            }));
        }));
        this._register(_notebookService.onWillRemoveNotebookDocument((model) => {
            this.updateBreakpoints(model);
            listeners.get(model.uri)?.dispose();
            listeners.delete(model.uri);
        }));
        this._register(this._debugService.getModel().onDidChangeBreakpoints((e) => {
            const newCellBp = e?.added?.find((bp) => 'uri' in bp && bp.uri.scheme === Schemas.vscodeNotebookCell);
            if (newCellBp) {
                const parsed = CellUri.parse(newCellBp.uri);
                if (!parsed) {
                    return;
                }
                const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
                if (!editor ||
                    !editor.hasModel() ||
                    editor.textModel.uri.toString() !== parsed.notebook.toString()) {
                    return;
                }
                const cell = editor.getCellByHandle(parsed.handle);
                if (!cell) {
                    return;
                }
                editor.focusElement(cell);
            }
        }));
    }
    updateBreakpoints(model) {
        const bps = this._debugService.getModel().getBreakpoints();
        if (!bps.length || !model.cells.length) {
            return;
        }
        const idxMap = new ResourceMap();
        model.cells.forEach((cell, i) => {
            idxMap.set(cell.uri, i);
        });
        bps.forEach((bp) => {
            const idx = idxMap.get(bp.uri);
            if (typeof idx !== 'number') {
                return;
            }
            const notebook = CellUri.parse(bp.uri)?.notebook;
            if (!notebook) {
                return;
            }
            const newUri = CellUri.generate(notebook, idx);
            if (isEqual(newUri, bp.uri)) {
                return;
            }
            this._debugService.removeBreakpoints(bp.getId());
            this._debugService.addBreakpoints(newUri, [
                {
                    column: bp.column,
                    condition: bp.condition,
                    enabled: bp.enabled,
                    hitCondition: bp.hitCondition,
                    logMessage: bp.logMessage,
                    lineNumber: bp.lineNumber,
                },
            ]);
        });
    }
};
NotebookBreakpoints = __decorate([
    __param(0, IDebugService),
    __param(1, INotebookService),
    __param(2, IEditorService)
], NotebookBreakpoints);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookBreakpoints, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tCcmVha3BvaW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9kZWJ1Zy9ub3RlYm9va0JyZWFrcG9pbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakYsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsR0FHakMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUd2RixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFDM0MsWUFDaUMsYUFBNEIsRUFDMUMsZ0JBQWtDLEVBQ25CLGNBQThCO1FBRS9ELEtBQUssRUFBRSxDQUFBO1FBSnlCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBRTNCLG1CQUFjLEdBQWQsY0FB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