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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9zZWN0aW9uQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sYUFBYSxHQUliLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxLQUFLLEtBQUssTUFBTSxxQkFBcUIsQ0FBQTtBQUU1QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsT0FBTyxFQUFFLHdCQUF3QixFQUFvQixNQUFNLGtCQUFrQixDQUFBO0FBQzdFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBWTdELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxPQUFPO0lBQzFEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQztZQUNwQyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztnQkFDbkMsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDeEQsWUFBWSxDQUNaO2FBQ0Q7WUFDRCxVQUFVLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7WUFDM0MsSUFBSSxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQ3ZCLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLHlCQUF5QjtvQkFDcEMsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUN4RCxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLG1DQUEyQixFQUNoRixzQkFBc0IsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLEVBQ2xELHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FDaEQ7aUJBQ0Q7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQTJCLEVBQUUsT0FBWTtRQUMzRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxPQUFNO1FBQ1AsQ0FBQztRQUVELE9BQU8sQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLE9BQU87SUFDckQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMkJBQTJCO1lBQy9CLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxzQkFBc0IsQ0FBQztnQkFDekQsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUscUJBQXFCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNsRSx3QkFBd0IsQ0FDeEI7YUFDRDtZQUNELFVBQVUsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsc0JBQXNCLENBQUM7WUFDakUsSUFBSSxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsbURBQW1EO1lBQzVFLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDJCQUEyQjtvQkFDdEMsS0FBSyxFQUFFLG1CQUFtQjtvQkFDMUIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx5QkFBeUI7b0JBQ3BDLEtBQUssRUFBRSxRQUFRO29CQUNmLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixzQkFBc0IsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFDMUQsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxtQ0FBMkIsRUFDaEYsc0JBQXNCLENBQUMsZUFBZSxFQUN0QyxzQkFBc0IsQ0FBQyxhQUFhLENBQ3BDO2lCQUNEO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsaUJBQWlCO29CQUM1QixLQUFLLHFDQUE2QjtvQkFDbEMsS0FBSyxFQUFFLHdCQUF3QjtvQkFDL0IsSUFBSSxFQUFFLHVCQUF1QjtpQkFDN0I7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQTJCLEVBQUUsT0FBWTtRQUMzRCxJQUFJLElBQW9CLENBQUE7UUFDeEIsSUFBSSx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLElBQUksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQTtRQUNqQyxDQUFDO2FBQU0sSUFBSSx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzlDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQ3BCLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkQsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FDL0QsaUJBQWlCLENBQUMsRUFBRSxDQUNwQixDQUFBO1lBQ0QsaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDOUIsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pFLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzNCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2RixJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLEVBQUUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2pGLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUM7WUFDcEQsS0FBSyxFQUFFLFVBQVU7WUFDakIsR0FBRyxFQUFFLFVBQVUsR0FBRyxNQUFNLEdBQUcsQ0FBQztTQUM1QixDQUFDLENBQUE7UUFDRixPQUFPLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ25ELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxPQUFPO0lBQy9DO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDhCQUE4QjtZQUNsQyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQztnQkFDM0MsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDNUQsZ0JBQWdCLENBQ2hCO2FBQ0Q7WUFDRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUM7WUFDbkQsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMseUJBQXlCO29CQUNwQyxLQUFLLEVBQUUsaUJBQWlCO29CQUN4QixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsc0JBQXNCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQzFELHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLFNBQVMsbUNBQTJCLEVBQ2hGLHNCQUFzQixDQUFDLGVBQWUsRUFDdEMsc0JBQXNCLENBQUMsYUFBYSxFQUNwQyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLG1DQUEyQixDQUM1RTtpQkFDRDthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBMkIsRUFBRSxPQUFZO1FBQzNELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRU8sZUFBZSxDQUFDLEtBQW1CLEVBQUUsY0FBK0I7UUFDM0UsTUFBTSxpQkFBaUIsR0FBRyxjQUFjLENBQUMsZUFBZSxDQUN2RCxpQkFBaUIsQ0FBQyxFQUFFLENBQ3BCLENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFBO1FBQ3pCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUE7UUFDL0IsTUFBTSxlQUFlLHFDQUE2QixDQUFBO1FBRWxELGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDM0UsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLE9BQU87SUFDakQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsZ0NBQWdDO1lBQ3BDLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQy9DLGFBQWEsRUFBRSxRQUFRLENBQ3RCLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDOUQsa0JBQWtCLENBQ2xCO2FBQ0Q7WUFDRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQztZQUN2RCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyx5QkFBeUI7b0JBQ3BDLEtBQUssRUFBRSxpQkFBaUI7b0JBQ3hCLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixzQkFBc0IsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFDMUQsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxtQ0FBMkIsRUFDaEYsc0JBQXNCLENBQUMsZUFBZSxFQUN0QyxzQkFBc0IsQ0FBQyxhQUFhLEVBQ3BDLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLFNBQVMsb0NBQTRCLENBQzdFO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUEyQixFQUFFLE9BQVk7UUFDM0QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDeEMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFTyxlQUFlLENBQUMsS0FBbUIsRUFBRSxjQUErQjtRQUMzRSxNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQ3ZELGlCQUFpQixDQUFDLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUE7UUFDekIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQTtRQUMvQixNQUFNLGVBQWUsb0NBQTRCLENBQUE7UUFFakQsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0NBQ0Q7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFTLHdCQUF3QixDQUFDLE9BQVk7SUFDN0MsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLGNBQWMsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDckUsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQVMsd0JBQXdCLENBQUMsT0FBWTtJQUM3QyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsY0FBYyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUM3RCxDQUFDO0FBRUQsZUFBZSxDQUFDLDhCQUE4QixDQUFDLENBQUE7QUFDL0MsZUFBZSxDQUFDLHlCQUF5QixDQUFDLENBQUE7QUFDMUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUE7QUFDcEMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLENBQUEifQ==