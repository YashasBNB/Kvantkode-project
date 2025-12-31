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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbW1hbmRzUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3F1aWNrQWNjZXNzL3N0YW5kYWxvbmVDb21tYW5kc1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxHQUNWLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBRXZILE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUd4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVsRixJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUFzQyxTQUFRLHlDQUF5QztJQUNuRyxJQUFjLHVCQUF1QjtRQUNwQyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLFNBQVMsQ0FBQTtJQUNsRSxDQUFDO0lBRUQsWUFDd0Isb0JBQTJDLEVBQzdCLGlCQUFxQyxFQUN0RCxpQkFBcUMsRUFDeEMsY0FBK0IsRUFDN0IsZ0JBQW1DLEVBQ3RDLGFBQTZCO1FBRTdDLEtBQUssQ0FDSixFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsRUFDcEIsb0JBQW9CLEVBQ3BCLGlCQUFpQixFQUNqQixjQUFjLEVBQ2QsZ0JBQWdCLEVBQ2hCLGFBQWEsQ0FDYixDQUFBO1FBYm9DLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7SUFjM0UsQ0FBQztJQUVTLEtBQUssQ0FBQyxlQUFlO1FBQzlCLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7SUFDeEMsQ0FBQztJQUVTLHlCQUF5QjtRQUNsQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFUyxLQUFLLENBQUMseUJBQXlCO1FBQ3hDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNELENBQUE7QUFsQ1kscUNBQXFDO0lBTS9DLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGNBQWMsQ0FBQTtHQVhKLHFDQUFxQyxDQWtDakQ7O0FBRUQsTUFBTSxPQUFPLGNBQWUsU0FBUSxZQUFZO2FBQy9CLE9BQUUsR0FBRyw0QkFBNEIsQ0FBQTtJQUVqRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxjQUFjLENBQUMsRUFBRTtZQUNyQixLQUFLLEVBQUUsZUFBZSxDQUFDLHVCQUF1QjtZQUM5QyxLQUFLLEVBQUUsaUJBQWlCO1lBQ3hCLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLE1BQU0sRUFBRTtnQkFDUCxNQUFNLEVBQUUsaUJBQWlCLENBQUMsS0FBSztnQkFDL0IsT0FBTyxxQkFBWTtnQkFDbkIsTUFBTSwwQ0FBZ0M7YUFDdEM7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoRyxDQUFDOztBQUdGLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBRXBDLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztJQUNyRixJQUFJLEVBQUUscUNBQXFDO0lBQzNDLE1BQU0sRUFBRSxxQ0FBcUMsQ0FBQyxNQUFNO0lBQ3BELFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsRUFBRSxDQUFDO0NBQzlGLENBQUMsQ0FBQSJ9