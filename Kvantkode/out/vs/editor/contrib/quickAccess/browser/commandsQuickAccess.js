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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcXVpY2tBY2Nlc3MvYnJvd3Nlci9jb21tYW5kc1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUdsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUtoRixPQUFPLEVBQ04sbUNBQW1DLEdBR25DLE1BQU0sZ0VBQWdFLENBQUE7QUFHdkUsTUFBTSxPQUFnQix5Q0FBMEMsU0FBUSxtQ0FBbUM7SUFDMUcsWUFDQyxPQUFvQyxFQUNwQyxvQkFBMkMsRUFDM0MsaUJBQXFDLEVBQ3JDLGNBQStCLEVBQy9CLGdCQUFtQyxFQUNuQyxhQUE2QjtRQUU3QixLQUFLLENBQ0osT0FBTyxFQUNQLG9CQUFvQixFQUNwQixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLGdCQUFnQixFQUNoQixhQUFhLENBQ2IsQ0FBQTtJQUNGLENBQUM7SUFPUyx5QkFBeUI7UUFDbEMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUE7UUFDNUQsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDOUIsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBd0IsRUFBRSxDQUFBO1FBQ2xELEtBQUssTUFBTSxZQUFZLElBQUksdUJBQXVCLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO1lBQzFFLElBQUksa0JBQWdELENBQUE7WUFDcEQsSUFBSSxZQUFZLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDMUQsa0JBQWtCLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUE7Z0JBQ3ZELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxrQkFBa0IsR0FBRzt3QkFDcEIsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVzt3QkFDM0MsS0FBSyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVztxQkFDeEMsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELGtCQUFrQixDQUFDLElBQUksQ0FBQztnQkFDdkIsU0FBUyxFQUFFLFlBQVksQ0FBQyxFQUFFO2dCQUMxQixZQUFZLEVBQUUsWUFBWSxDQUFDLEtBQUs7Z0JBQ2hDLGtCQUFrQjtnQkFDbEIsS0FBSyxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksWUFBWSxDQUFDLEVBQUU7YUFDeEQsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE9BQU8sa0JBQWtCLENBQUE7SUFDMUIsQ0FBQztDQUNEIn0=