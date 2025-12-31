/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { NotebookOutlineContext } from '../contrib/outline/notebookOutline.js';
import { FoldingController } from './foldingController.js';
import { CellEditState, } from '../notebookBrowser.js';
import * as icons from '../notebookIcons.js';
import { CellKind } from '../../common/notebookCommon.js';
import { CELL_TITLE_CELL_GROUP_ID } from './coreActions.js';
import { executeSectionCondition } from './executeActions.js';
export class NotebookRunSingleCellInSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.runSingleCell',
            title: {
                ...localize2('runCell', 'Run Cell'),
                mnemonicTitle: localize({ key: 'mirunCell', comment: ['&& denotes a mnemonic'] }, '&&Run Cell'),
            },
            shortTitle: localize('runCell', 'Run Cell'),
            icon: icons.executeIcon,
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'inline',
                    order: 1,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Code), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren.toNegated(), NotebookOutlineContext.CellHasHeader.toNegated()),
                },
            ],
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        context.notebookEditor.executeNotebookCells([context.outlineEntry.cell]);
    }
}
export class NotebookRunCellsInSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.runCells',
            title: {
                ...localize2('runCellsInSection', 'Run Cells In Section'),
                mnemonicTitle: localize({ key: 'mirunCellsInSection', comment: ['&& denotes a mnemonic'] }, '&&Run Cells In Section'),
            },
            shortTitle: localize('runCellsInSection', 'Run Cells In Section'),
            icon: icons.executeIcon, // TODO @Yoyokrazy replace this with new icon later
            menu: [
                {
                    id: MenuId.NotebookStickyScrollContext,
                    group: 'notebookExecution',
                    order: 1,
                },
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'inline',
                    order: 1,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader),
                },
                {
                    id: MenuId.NotebookCellTitle,
                    order: 0 /* CellToolbarOrder.RunSection */,
                    group: CELL_TITLE_CELL_GROUP_ID,
                    when: executeSectionCondition,
                },
            ],
        });
    }
    async run(_accessor, context) {
        let cell;
        if (checkOutlineEntryContext(context)) {
            cell = context.outlineEntry.cell;
        }
        else if (checkNotebookCellContext(context)) {
            cell = context.cell;
        }
        else {
            return;
        }
        if (cell.getEditState() === CellEditState.Editing) {
            const foldingController = context.notebookEditor.getContribution(FoldingController.id);
            foldingController.recompute();
        }
        const cellIdx = context.notebookEditor.getViewModel()?.getCellIndex(cell);
        if (cellIdx === undefined) {
            return;
        }
        const sectionIdx = context.notebookEditor.getViewModel()?.getFoldingStartIndex(cellIdx);
        if (sectionIdx === undefined) {
            return;
        }
        const length = context.notebookEditor.getViewModel()?.getFoldedLength(sectionIdx);
        if (length === undefined) {
            return;
        }
        const cells = context.notebookEditor.getCellsInRange({
            start: sectionIdx,
            end: sectionIdx + length + 1,
        });
        context.notebookEditor.executeNotebookCells(cells);
    }
}
export class NotebookFoldSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.foldSection',
            title: {
                ...localize2('foldSection', 'Fold Section'),
                mnemonicTitle: localize({ key: 'mifoldSection', comment: ['&& denotes a mnemonic'] }, '&&Fold Section'),
            },
            shortTitle: localize('foldSection', 'Fold Section'),
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'notebookFolding',
                    order: 2,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader, NotebookOutlineContext.CellFoldingState.isEqualTo(1 /* CellFoldingState.Expanded */)),
                },
            ],
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        this.toggleFoldRange(context.outlineEntry, context.notebookEditor);
    }
    toggleFoldRange(entry, notebookEditor) {
        const foldingController = notebookEditor.getContribution(FoldingController.id);
        const index = entry.index;
        const headerLevel = entry.level;
        const newFoldingState = 2 /* CellFoldingState.Collapsed */;
        foldingController.setFoldingStateDown(index, newFoldingState, headerLevel);
    }
}
export class NotebookExpandSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.expandSection',
            title: {
                ...localize2('expandSection', 'Expand Section'),
                mnemonicTitle: localize({ key: 'miexpandSection', comment: ['&& denotes a mnemonic'] }, '&&Expand Section'),
            },
            shortTitle: localize('expandSection', 'Expand Section'),
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'notebookFolding',
                    order: 2,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader, NotebookOutlineContext.CellFoldingState.isEqualTo(2 /* CellFoldingState.Collapsed */)),
                },
            ],
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        this.toggleFoldRange(context.outlineEntry, context.notebookEditor);
    }
    toggleFoldRange(entry, notebookEditor) {
        const foldingController = notebookEditor.getContribution(FoldingController.id);
        const index = entry.index;
        const headerLevel = entry.level;
        const newFoldingState = 1 /* CellFoldingState.Expanded */;
        foldingController.setFoldingStateDown(index, newFoldingState, headerLevel);
    }
}
/**
 * Take in context args and check if they exist. True if action is run from notebook sticky scroll context menu or
 * notebook outline context menu.
 *
 * @param context - Notebook Outline Context containing a notebook editor and outline entry
 * @returns true if context is valid, false otherwise
 */
function checkOutlineEntryContext(context) {
    return !!(context && context.notebookEditor && context.outlineEntry);
}
/**
 * Take in context args and check if they exist. True if action is run from a cell toolbar menu (potentially from the
 * notebook cell container or cell editor context menus, but not tested or implemented atm)
 *
 * @param context - Notebook Outline Context containing a notebook editor and outline entry
 * @returns true if context is valid, false otherwise
 */
function checkNotebookCellContext(context) {
    return !!(context && context.notebookEditor && context.cell);
}
registerAction2(NotebookRunSingleCellInSection);
registerAction2(NotebookRunCellsInSection);
registerAction2(NotebookFoldSection);
registerAction2(NotebookExpandSection);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvc2VjdGlvbkFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUNOLGFBQWEsR0FJYixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sS0FBSyxLQUFLLE1BQU0scUJBQXFCLENBQUE7QUFFNUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE9BQU8sRUFBRSx3QkFBd0IsRUFBb0IsTUFBTSxrQkFBa0IsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQVk3RCxNQUFNLE9BQU8sOEJBQStCLFNBQVEsT0FBTztJQUMxRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnQ0FBZ0M7WUFDcEMsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7Z0JBQ25DLGFBQWEsRUFBRSxRQUFRLENBQ3RCLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFF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