/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { KERNEL_HAS_VARIABLE_PROVIDER } from '../../common/notebookContextKeys.js';
import { NOTEBOOK_VARIABLE_VIEW_ENABLED } from '../contrib/notebookVariables/notebookVariableContextKeys.js';
import * as icons from '../notebookIcons.js';
import { NotebookAction } from './coreActions.js';
const OPEN_VARIABLES_VIEW_COMMAND_ID = 'notebook.openVariablesView';
registerAction2(class OpenVariablesViewAction extends NotebookAction {
    constructor() {
        super({
            id: OPEN_VARIABLES_VIEW_COMMAND_ID,
            title: localize2('notebookActions.openVariablesView', 'Variables'),
            icon: icons.variablesViewIcon,
            menu: [
                {
                    id: MenuId.InteractiveToolbar,
                    group: 'navigation',
                    when: ContextKeyExpr.and(KERNEL_HAS_VARIABLE_PROVIDER, 
                    // jupyter extension currently contributes their own goto variables button
                    ContextKeyExpr.notEquals('jupyter.kernel.isjupyter', true), NOTEBOOK_VARIABLE_VIEW_ENABLED),
                },
                {
                    id: MenuId.EditorTitle,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(KERNEL_HAS_VARIABLE_PROVIDER, 
                    // jupyter extension currently contributes their own goto variables button
                    ContextKeyExpr.notEquals('jupyter.kernel.isjupyter', true), ContextKeyExpr.notEquals('config.notebook.globalToolbar', true), NOTEBOOK_VARIABLE_VIEW_ENABLED),
                },
                {
                    id: MenuId.NotebookToolbar,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(KERNEL_HAS_VARIABLE_PROVIDER, 
                    // jupyter extension currently contributes their own goto variables button
                    ContextKeyExpr.notEquals('jupyter.kernel.isjupyter', true), ContextKeyExpr.equals('config.notebook.globalToolbar', true), NOTEBOOK_VARIABLE_VIEW_ENABLED),
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        const variableViewId = 'workbench.notebook.variables';
        accessor.get(IViewsService).openView(variableViewId, true);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci92YXJpYWJsZXNBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDbEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUcsT0FBTyxLQUFLLEtBQUssTUFBTSxxQkFBcUIsQ0FBQTtBQUU1QyxPQUFPLEVBQTBCLGNBQWMsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXpFLE1BQU0sOEJBQThCLEdBQUcsNEJBQTRCLENBQUE7QUFFbkUsZUFBZSxDQUNkLE1BQU0sdUJBQXdCLFNBQVEsY0FBYztJQUNuRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw4QkFBOEI7WUFDbEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxtQ0FBbUMsRUFBRSxXQUFXLENBQUM7WUFDbEUsSUFBSSxFQUFFLEtBQUssQ0FBQyxpQkFBaUI7WUFDN0IsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLDRCQUE0QjtvQkFDNUIsMEVBQTBFO29CQUMxRSxjQUFjLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxFQUMxRCw4QkFBOEIsQ0FDOUI7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixLQUFLLEVBQUUsQ0FBQyxDQUFDO29CQUNULEtBQUssRUFBRSxZQUFZO29CQUNuQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsNEJBQTRCO29CQUM1QiwwRUFBMEU7b0JBQzFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLEVBQzFELGNBQWMsQ0FBQyxTQUFTLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLEVBQy9ELDhCQUE4QixDQUM5QjtpQkFDRDtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGVBQWU7b0JBQzFCLEtBQUssRUFBRSxDQUFDLENBQUM7b0JBQ1QsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qiw0QkFBNEI7b0JBQzVCLDBFQUEwRTtvQkFDMUUsY0FBYyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsRUFDMUQsY0FBYyxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsRUFBRSxJQUFJLENBQUMsRUFDNUQsOEJBQThCLENBQzlCO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQStCO1FBQ3hGLE1BQU0sY0FBYyxHQUFHLDhCQUE4QixDQUFBO1FBQ3JELFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0NBQ0QsQ0FDRCxDQUFBIn0=