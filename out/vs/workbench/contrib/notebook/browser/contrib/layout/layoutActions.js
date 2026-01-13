/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../../nls.js';
import { Action2, MenuId, registerAction2, } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from '../../controller/coreActions.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
const TOGGLE_CELL_TOOLBAR_POSITION = 'notebook.toggleCellToolbarPosition';
export class ToggleCellToolbarPositionAction extends Action2 {
    constructor() {
        super({
            id: TOGGLE_CELL_TOOLBAR_POSITION,
            title: localize2('notebook.toggleCellToolbarPosition', 'Toggle Cell Toolbar Position'),
            menu: [
                {
                    id: MenuId.NotebookCellTitle,
                    group: 'View',
                    order: 1,
                },
            ],
            category: NOTEBOOK_ACTIONS_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, context) {
        const editor = context && context.ui ? context.notebookEditor : undefined;
        if (editor && editor.hasModel()) {
            // from toolbar
            const viewType = editor.textModel.viewType;
            const configurationService = accessor.get(IConfigurationService);
            const toolbarPosition = configurationService.getValue(NotebookSetting.cellToolbarLocation);
            const newConfig = this.togglePosition(viewType, toolbarPosition);
            await configurationService.updateValue(NotebookSetting.cellToolbarLocation, newConfig);
        }
    }
    togglePosition(viewType, toolbarPosition) {
        if (typeof toolbarPosition === 'string') {
            // legacy
            if (['left', 'right', 'hidden'].indexOf(toolbarPosition) >= 0) {
                // valid position
                const newViewValue = toolbarPosition === 'right' ? 'left' : 'right';
                const config = {
                    default: toolbarPosition,
                };
                config[viewType] = newViewValue;
                return config;
            }
            else {
                // invalid position
                const config = {
                    default: 'right',
                };
                config[viewType] = 'left';
                return config;
            }
        }
        else {
            const oldValue = toolbarPosition[viewType] ?? toolbarPosition['default'] ?? 'right';
            const newViewValue = oldValue === 'right' ? 'left' : 'right';
            const newConfig = {
                ...toolbarPosition,
            };
            newConfig[viewType] = newViewValue;
            return newConfig;
        }
    }
}
registerAction2(ToggleCellToolbarPositionAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2xheW91dC9sYXlvdXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixlQUFlLEdBQ2YsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUV4RyxPQUFPLEVBQTBCLHlCQUF5QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRW5FLE1BQU0sNEJBQTRCLEdBQUcsb0NBQW9DLENBQUE7QUFFekUsTUFBTSxPQUFPLCtCQUFnQyxTQUFRLE9BQU87SUFDM0Q7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNEJBQTRCO1lBQ2hDLEtBQUssRUFBRSxTQUFTLENBQUMsb0NBQW9DLEVBQUUsOEJBQThCLENBQUM7WUFDdEYsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsaUJBQWlCO29CQUM1QixLQUFLLEVBQUUsTUFBTTtvQkFDYixLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1lBQ0QsUUFBUSxFQUFFLHlCQUF5QjtZQUNuQyxFQUFFLEVBQUUsS0FBSztTQUNULENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsT0FBWTtRQUNqRCxNQUFNLE1BQU0sR0FDWCxPQUFPLElBQUksT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUUsT0FBa0MsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUN2RixJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNqQyxlQUFlO1lBQ2YsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUE7WUFDMUMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7WUFDaEUsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUNwRCxlQUFlLENBQUMsbUJBQW1CLENBQ25DLENBQUE7WUFDRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUNoRSxNQUFNLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkYsQ0FBQztJQUNGLENBQUM7SUFFRCxjQUFjLENBQ2IsUUFBZ0IsRUFDaEIsZUFBbUQ7UUFFbkQsSUFBSSxPQUFPLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxTQUFTO1lBQ1QsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMvRCxpQkFBaUI7Z0JBQ2pCLE1BQU0sWUFBWSxHQUFHLGVBQWUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO2dCQUNuRSxNQUFNLE1BQU0sR0FBOEI7b0JBQ3pDLE9BQU8sRUFBRSxlQUFlO2lCQUN4QixDQUFBO2dCQUNELE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxZQUFZLENBQUE7Z0JBQy9CLE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG1CQUFtQjtnQkFDbkIsTUFBTSxNQUFNLEdBQThCO29CQUN6QyxPQUFPLEVBQUUsT0FBTztpQkFDaEIsQ0FBQTtnQkFDRCxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFBO2dCQUN6QixPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFBO1lBQ25GLE1BQU0sWUFBWSxHQUFHLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO1lBQzVELE1BQU0sU0FBUyxHQUFHO2dCQUNqQixHQUFHLGVBQWU7YUFDbEIsQ0FBQTtZQUNELFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxZQUFZLENBQUE7WUFDbEMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUNELGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBIn0=