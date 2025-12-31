/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { isLocalizedString } from '../../../../platform/action/common/action.js';
import { AbstractCommandsQuickAccessProvider, } from '../../../../platform/quickinput/browser/commandsQuickAccess.js';
export class AbstractEditorCommandsQuickAccessProvider extends AbstractCommandsQuickAccessProvider {
    constructor(options, instantiationService, keybindingService, commandService, telemetryService, dialogService) {
        super(options, instantiationService, keybindingService, commandService, telemetryService, dialogService);
    }
    getCodeEditorCommandPicks() {
        const activeTextEditorControl = this.activeTextEditorControl;
        if (!activeTextEditorControl) {
            return [];
        }
        const editorCommandPicks = [];
        for (const editorAction of activeTextEditorControl.getSupportedActions()) {
            let commandDescription;
            if (editorAction.metadata?.description) {
                if (isLocalizedString(editorAction.metadata.description)) {
                    commandDescription = editorAction.metadata.description;
                }
                else {
                    commandDescription = {
                        original: editorAction.metadata.description,
                        value: editorAction.metadata.description,
                    };
                }
            }
            editorCommandPicks.push({
                commandId: editorAction.id,
                commandAlias: editorAction.alias,
                commandDescription,
                label: stripIcons(editorAction.label) || editorAction.id,
            });
        }
        return editorCommandPicks;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3F1aWNrQWNjZXNzL2Jyb3dzZXIvY29tbWFuZHNRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFLaEYsT0FBTyxFQUNOLG1DQUFtQyxHQUduQyxNQUFNLGdFQUFnRSxDQUFBO0FBR3ZFLE1BQU0sT0FBZ0IseUNBQTBDLFNBQVEsbUNBQW1DO0lBQzFHLFlBQ0MsT0FBb0MsRUFDcEMsb0JBQTJDLEVBQzNDLGlCQUFxQyxFQUNyQyxjQUErQixFQUMvQixnQkFBbUMsRUFDbkMsYUFBNkI7UUFFN0IsS0FBSyxDQUNKLE9BQU8sRUFDUCxvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsYUFBYSxDQUNiLENBQUE7SUFDRixDQUFDO0lBT1MseUJBQXlCO1FBQ2xDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFBO1FBQzVELElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQzlCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sa0JBQWtCLEdBQXdCLEVBQUUsQ0FBQTtRQUNsRCxLQUFLLE1BQU0sWUFBWSxJQUFJLHVCQUF1QixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztZQUMxRSxJQUFJLGtCQUFnRCxDQUFBO1lBQ3BELElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQzFELGtCQUFrQixHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFBO2dCQUN2RCxDQUFDO3FCQUFNLENBQUM7b0JBQ1Asa0JBQWtCLEdBQUc7d0JBQ3BCLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVc7d0JBQzNDLEtBQUssRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVc7cUJBQ3hDLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZCLFNBQVMsRUFBRSxZQUFZLENBQUMsRUFBRTtnQkFDMUIsWUFBWSxFQUFFLFlBQVksQ0FBQyxLQUFLO2dCQUNoQyxrQkFBa0I7Z0JBQ2xCLEtBQUssRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxFQUFFO2FBQ3hELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLGtCQUFrQixDQUFBO0lBQzFCLENBQUM7Q0FDRCJ9