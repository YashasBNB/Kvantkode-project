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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9sYXlvdXQvbGF5b3V0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDcEQsT0FBTyxFQUNOLE9BQU8sRUFDUCxNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFeEcsT0FBTyxFQUEwQix5QkFBeUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVuRSxNQUFNLDRCQUE0QixHQUFHLG9DQUFvQyxDQUFBO0FBRXpFLE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxPQUFPO0lBQzNEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRCQUE0QjtZQUNoQyxLQUFLLEVBQUUsU0FBUyxDQUFDLG9DQUFvQyxFQUFFLDhCQUE4QixDQUFDO1lBQ3RGLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtvQkFDNUIsS0FBSyxFQUFFLE1BQU07b0JBQ2IsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtZQUNELFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsRUFBRSxFQUFFLEtBQUs7U0FDVCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE9BQVk7UUFDakQsTUFBTSxNQUFNLEdBQ1gsT0FBTyxJQUFJLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFFLE9BQWtDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDdkYsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDakMsZUFBZTtZQUNmLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFBO1lBQzFDLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sZUFBZSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FDcEQsZUFBZSxDQUFDLG1CQUFtQixDQUNuQyxDQUFBO1lBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDaEUsTUFBTSxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZGLENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUNiLFFBQWdCLEVBQ2hCLGVBQW1EO1FBRW5ELElBQUksT0FBTyxlQUFlLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekMsU0FBUztZQUNULElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDL0QsaUJBQWlCO2dCQUNqQixNQUFNLFlBQVksR0FBRyxlQUFlLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtnQkFDbkUsTUFBTSxNQUFNLEdBQThCO29CQUN6QyxPQUFPLEVBQUUsZUFBZTtpQkFDeEIsQ0FBQTtnQkFDRCxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsWUFBWSxDQUFBO2dCQUMvQixPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxtQkFBbUI7Z0JBQ25CLE1BQU0sTUFBTSxHQUE4QjtvQkFDekMsT0FBTyxFQUFFLE9BQU87aUJBQ2hCLENBQUE7Z0JBQ0QsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sQ0FBQTtnQkFDekIsT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQTtZQUNuRixNQUFNLFlBQVksR0FBRyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtZQUM1RCxNQUFNLFNBQVMsR0FBRztnQkFDakIsR0FBRyxlQUFlO2FBQ2xCLENBQUE7WUFDRCxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsWUFBWSxDQUFBO1lBQ2xDLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFDRCxlQUFlLENBQUMsK0JBQStCLENBQUMsQ0FBQSJ9