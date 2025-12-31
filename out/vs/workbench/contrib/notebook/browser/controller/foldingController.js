/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, } from '../../common/notebookContextKeys.js';
import { getNotebookEditorFromEditorPane, } from '../notebookBrowser.js';
import { FoldingModel } from '../viewModel/foldingModel.js';
import { CellKind } from '../../common/notebookCommon.js';
import { registerNotebookContribution } from '../notebookEditorExtensions.js';
import { registerAction2, Action2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContextKey } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from './coreActions.js';
import { localize, localize2 } from '../../../../../nls.js';
export class FoldingController extends Disposable {
    static { this.id = 'workbench.notebook.foldingController'; }
    constructor(_notebookEditor) {
        super();
        this._notebookEditor = _notebookEditor;
        this._foldingModel = null;
        this._localStore = this._register(new DisposableStore());
        this._register(this._notebookEditor.onMouseUp((e) => {
            this.onMouseUp(e);
        }));
        this._register(this._notebookEditor.onDidChangeModel(() => {
            this._localStore.clear();
            if (!this._notebookEditor.hasModel()) {
                return;
            }
            this._localStore.add(this._notebookEditor.onDidChangeCellState((e) => {
                if (e.source.editStateChanged && e.cell.cellKind === CellKind.Markup) {
                    this._foldingModel?.recompute();
                }
            }));
            this._foldingModel = new FoldingModel();
            this._localStore.add(this._foldingModel);
            this._foldingModel.attachViewModel(this._notebookEditor.getViewModel());
            this._localStore.add(this._foldingModel.onDidFoldingRegionChanged(() => {
                this._updateEditorFoldingRanges();
            }));
        }));
    }
    saveViewState() {
        return this._foldingModel?.getMemento() || [];
    }
    restoreViewState(state) {
        this._foldingModel?.applyMemento(state || []);
        this._updateEditorFoldingRanges();
    }
    setFoldingStateDown(index, state, levels) {
        const doCollapse = state === 2 /* CellFoldingState.Collapsed */;
        const region = this._foldingModel.getRegionAtLine(index + 1);
        const regions = [];
        if (region) {
            if (region.isCollapsed !== doCollapse) {
                regions.push(region);
            }
            if (levels > 1) {
                const regionsInside = this._foldingModel.getRegionsInside(region, (r, level) => r.isCollapsed !== doCollapse && level < levels);
                regions.push(...regionsInside);
            }
        }
        regions.forEach((r) => this._foldingModel.setCollapsed(r.regionIndex, state === 2 /* CellFoldingState.Collapsed */));
        this._updateEditorFoldingRanges();
    }
    setFoldingStateUp(index, state, levels) {
        if (!this._foldingModel) {
            return;
        }
        const regions = this._foldingModel.getAllRegionsAtLine(index + 1, (region, level) => region.isCollapsed !== (state === 2 /* CellFoldingState.Collapsed */) && level <= levels);
        regions.forEach((r) => this._foldingModel.setCollapsed(r.regionIndex, state === 2 /* CellFoldingState.Collapsed */));
        this._updateEditorFoldingRanges();
    }
    _updateEditorFoldingRanges() {
        if (!this._foldingModel) {
            return;
        }
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const vm = this._notebookEditor.getViewModel();
        vm.updateFoldingRanges(this._foldingModel.regions);
        const hiddenRanges = vm.getHiddenRanges();
        this._notebookEditor.setHiddenAreas(hiddenRanges);
    }
    onMouseUp(e) {
        if (!e.event.target) {
            return;
        }
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const viewModel = this._notebookEditor.getViewModel();
        const target = e.event.target;
        if (target.classList.contains('codicon-notebook-collapsed') ||
            target.classList.contains('codicon-notebook-expanded')) {
            const parent = target.parentElement;
            if (!parent.classList.contains('notebook-folding-indicator')) {
                return;
            }
            // folding icon
            const cellViewModel = e.target;
            const modelIndex = viewModel.getCellIndex(cellViewModel);
            const state = viewModel.getFoldingState(modelIndex);
            if (state === 0 /* CellFoldingState.None */) {
                return;
            }
            this.setFoldingStateUp(modelIndex, state === 2 /* CellFoldingState.Collapsed */
                ? 1 /* CellFoldingState.Expanded */
                : 2 /* CellFoldingState.Collapsed */, 1);
            this._notebookEditor.focusElement(cellViewModel);
        }
        return;
    }
    recompute() {
        this._foldingModel?.recompute();
    }
}
registerNotebookContribution(FoldingController.id, FoldingController);
const NOTEBOOK_FOLD_COMMAND_LABEL = localize('fold.cell', 'Fold Cell');
const NOTEBOOK_UNFOLD_COMMAND_LABEL = localize2('unfold.cell', 'Unfold Cell');
const FOLDING_COMMAND_ARGS = {
    args: [
        {
            isOptional: true,
            name: 'index',
            description: 'The cell index',
            schema: {
                type: 'object',
                required: ['index', 'direction'],
                properties: {
                    index: {
                        type: 'number',
                    },
                    direction: {
                        type: 'string',
                        enum: ['up', 'down'],
                        default: 'down',
                    },
                    levels: {
                        type: 'number',
                        default: 1,
                    },
                },
            },
        },
    ],
};
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.fold',
            title: localize2('fold.cell', 'Fold Cell'),
            category: NOTEBOOK_ACTIONS_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
                    secondary: [15 /* KeyCode.LeftArrow */],
                },
                secondary: [15 /* KeyCode.LeftArrow */],
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            metadata: {
                description: NOTEBOOK_FOLD_COMMAND_LABEL,
                args: FOLDING_COMMAND_ARGS.args,
            },
            precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
            f1: true,
        });
    }
    async run(accessor, args) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        if (!editor.hasModel()) {
            return;
        }
        const levels = (args && args.levels) || 1;
        const direction = args && args.direction === 'up' ? 'up' : 'down';
        let index = undefined;
        if (args) {
            index = args.index;
        }
        else {
            const activeCell = editor.getActiveCell();
            if (!activeCell) {
                return;
            }
            index = editor.getCellIndex(activeCell);
        }
        const controller = editor.getContribution(FoldingController.id);
        if (index !== undefined) {
            const targetCell = index < 0 || index >= editor.getLength() ? undefined : editor.cellAt(index);
            if (targetCell?.cellKind === CellKind.Code && direction === 'down') {
                return;
            }
            if (direction === 'up') {
                controller.setFoldingStateUp(index, 2 /* CellFoldingState.Collapsed */, levels);
            }
            else {
                controller.setFoldingStateDown(index, 2 /* CellFoldingState.Collapsed */, levels);
            }
            const viewIndex = editor.getViewModel().getNearestVisibleCellIndexUpwards(index);
            editor.focusElement(editor.cellAt(viewIndex));
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.unfold',
            title: NOTEBOOK_UNFOLD_COMMAND_LABEL,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
                    secondary: [17 /* KeyCode.RightArrow */],
                },
                secondary: [17 /* KeyCode.RightArrow */],
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            metadata: {
                description: NOTEBOOK_UNFOLD_COMMAND_LABEL,
                args: FOLDING_COMMAND_ARGS.args,
            },
            precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
            f1: true,
        });
    }
    async run(accessor, args) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const levels = (args && args.levels) || 1;
        const direction = args && args.direction === 'up' ? 'up' : 'down';
        let index = undefined;
        if (args) {
            index = args.index;
        }
        else {
            const activeCell = editor.getActiveCell();
            if (!activeCell) {
                return;
            }
            index = editor.getCellIndex(activeCell);
        }
        const controller = editor.getContribution(FoldingController.id);
        if (index !== undefined) {
            if (direction === 'up') {
                controller.setFoldingStateUp(index, 1 /* CellFoldingState.Expanded */, levels);
            }
            else {
                controller.setFoldingStateDown(index, 1 /* CellFoldingState.Expanded */, levels);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvZm9sZGluZ0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHlCQUF5QixHQUN6QixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFJTiwrQkFBK0IsR0FFL0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBSWpHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBSzNELE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxVQUFVO2FBQ3pDLE9BQUUsR0FBVyxzQ0FBc0MsQUFBakQsQ0FBaUQ7SUFLMUQsWUFBNkIsZUFBZ0M7UUFDNUQsS0FBSyxFQUFFLENB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