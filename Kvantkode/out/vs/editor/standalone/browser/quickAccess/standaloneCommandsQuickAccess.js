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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { QuickCommandNLS } from '../../../common/standaloneStrings.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { AbstractEditorCommandsQuickAccessProvider } from '../../../contrib/quickAccess/browser/commandsQuickAccess.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
let StandaloneCommandsQuickAccessProvider = class StandaloneCommandsQuickAccessProvider extends AbstractEditorCommandsQuickAccessProvider {
    get activeTextEditorControl() {
        return this.codeEditorService.getFocusedCodeEditor() ?? undefined;
    }
    constructor(instantiationService, codeEditorService, keybindingService, commandService, telemetryService, dialogService) {
        super({ showAlias: false }, instantiationService, keybindingService, commandService, telemetryService, dialogService);
        this.codeEditorService = codeEditorService;
    }
    async getCommandPicks() {
        return this.getCodeEditorCommandPicks();
    }
    hasAdditionalCommandPicks() {
        return false;
    }
    async getAdditionalCommandPicks() {
        return [];
    }
};
StandaloneCommandsQuickAccessProvider = __decorate([
    __param(0, IInstantiationService),
    __param(1, ICodeEditorService),
    __param(2, IKeybindingService),
    __param(3, ICommandService),
    __param(4, ITelemetryService),
    __param(5, IDialogService)
], StandaloneCommandsQuickAccessProvider);
export { StandaloneCommandsQuickAccessProvider };
export class GotoLineAction extends EditorAction {
    static { this.ID = 'editor.action.quickCommand'; }
    constructor() {
        super({
            id: GotoLineAction.ID,
            label: QuickCommandNLS.quickCommandActionLabel,
            alias: 'Command Palette',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 59 /* KeyCode.F1 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            contextMenuOpts: {
                group: 'z_commands',
                order: 1,
            },
        });
    }
    run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(StandaloneCommandsQuickAccessProvider.PREFIX);
    }
}
registerEditorAction(GotoLineAction);
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: StandaloneCommandsQuickAccessProvider,
    prefix: StandaloneCommandsQuickAccessProvider.PREFIX,
    helpEntries: [{ description: QuickCommandNLS.quickCommandHelp, commandId: GotoLineAction.ID }],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbW1hbmRzUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvcXVpY2tBY2Nlc3Mvc3RhbmRhbG9uZUNvbW1hbmRzUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFFTixVQUFVLEdBQ1YsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLHlDQUF5QyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFFdkgsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRWxGLElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQXNDLFNBQVEseUNBQXlDO0lBQ25HLElBQWMsdUJBQXVCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLElBQUksU0FBUyxDQUFBO0lBQ2xFLENBQUM7SUFFRCxZQUN3QixvQkFBMkMsRUFDN0IsaUJBQXFDLEVBQ3RELGlCQUFxQyxFQUN4QyxjQUErQixFQUM3QixnQkFBbUMsRUFDdEMsYUFBNkI7UUFFN0MsS0FBSyxDQUNKLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUNwQixvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsYUFBYSxDQUNiLENBQUE7UUFib0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQWMzRSxDQUFDO0lBRVMsS0FBSyxDQUFDLGVBQWU7UUFDOUIsT0FBTyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtJQUN4QyxDQUFDO0lBRVMseUJBQXlCO1FBQ2xDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVTLEtBQUssQ0FBQyx5QkFBeUI7UUFDeEMsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0NBQ0QsQ0FBQTtBQWxDWSxxQ0FBcUM7SUFNL0MsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsY0FBYyxDQUFBO0dBWEoscUNBQXFDLENBa0NqRDs7QUFFRCxNQUFNLE9BQU8sY0FBZSxTQUFRLFlBQVk7YUFDL0IsT0FBRSxHQUFHLDRCQUE0QixDQUFBO0lBRWpEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGNBQWMsQ0FBQyxFQUFFO1lBQ3JCLEtBQUssRUFBRSxlQUFlLENBQUMsdUJBQXVCO1lBQzlDLEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsWUFBWSxFQUFFLFNBQVM7WUFDdkIsTUFBTSxFQUFFO2dCQUNQLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxLQUFLO2dCQUMvQixPQUFPLHFCQUFZO2dCQUNuQixNQUFNLDBDQUFnQzthQUN0QztZQUNELGVBQWUsRUFBRTtnQkFDaEIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2hHLENBQUM7O0FBR0Ysb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7QUFFcEMsUUFBUSxDQUFDLEVBQUUsQ0FBdUIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO0lBQ3JGLElBQUksRUFBRSxxQ0FBcUM7SUFDM0MsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLE1BQU07SUFDcEQsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRSxFQUFFLENBQUM7Q0FDOUYsQ0FBQyxDQUFBIn0=