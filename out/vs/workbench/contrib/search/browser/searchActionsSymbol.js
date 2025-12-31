/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
//#region Actions
registerAction2(class ShowAllSymbolsAction extends Action2 {
    static { this.ID = 'workbench.action.showAllSymbols'; }
    static { this.LABEL = nls.localize('showTriggerActions', 'Go to Symbol in Workspace...'); }
    static { this.ALL_SYMBOLS_PREFIX = '#'; }
    constructor() {
        super({
            id: "workbench.action.showAllSymbols" /* Constants.SearchCommandIds.ShowAllSymbolsActionId */,
            title: {
                ...nls.localize2('showTriggerActions', 'Go to Symbol in Workspace...'),
                mnemonicTitle: nls.localize({ key: 'miGotoSymbolInWorkspace', comment: ['&& denotes a mnemonic'] }, 'Go to Symbol in &&Workspace...'),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 50 /* KeyCode.KeyT */,
            },
            menu: {
                id: MenuId.MenubarGoMenu,
                group: '3_global_nav',
                order: 2,
            },
        });
    }
    async run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(ShowAllSymbolsAction.ALL_SYMBOLS_PREFIX);
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaEFjdGlvbnNTeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUdqRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixpQkFBaUI7QUFDakIsZUFBZSxDQUNkLE1BQU0sb0JBQXFCLFNBQVEsT0FBTzthQUN6QixPQUFFLEdBQUcsaUNBQWlDLENBQUE7YUFDdEMsVUFBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsOEJBQThCLENBQUMsQ0FBQTthQUMxRSx1QkFBa0IsR0FBRyxHQUFHLENBQUE7SUFFeEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLDJGQUFtRDtZQUNyRCxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLDhCQUE4QixDQUFDO2dCQUN0RSxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUN0RSxnQ0FBZ0MsQ0FDaEM7YUFDRDtZQUNELEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLE1BQU0sNkNBQW1DO2dCQUN6QyxPQUFPLEVBQUUsaURBQTZCO2FBQ3RDO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsYUFBYTtnQkFDeEIsS0FBSyxFQUFFLGNBQWM7Z0JBQ3JCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUM1QyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQzNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxZQUFZIn0=