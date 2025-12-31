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
import { AbstractGotoLineQuickAccessProvider } from '../../../contrib/quickAccess/browser/gotoLineQuickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { GoToLineNLS } from '../../../common/standaloneStrings.js';
import { Event } from '../../../../base/common/event.js';
import { EditorAction, registerEditorAction, } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
let StandaloneGotoLineQuickAccessProvider = class StandaloneGotoLineQuickAccessProvider extends AbstractGotoLineQuickAccessProvider {
    constructor(editorService) {
        super();
        this.editorService = editorService;
        this.onDidActiveTextEditorControlChange = Event.None;
    }
    get activeTextEditorControl() {
        return this.editorService.getFocusedCodeEditor() ?? undefined;
    }
};
StandaloneGotoLineQuickAccessProvider = __decorate([
    __param(0, ICodeEditorService)
], StandaloneGotoLineQuickAccessProvider);
export { StandaloneGotoLineQuickAccessProvider };
export class GotoLineAction extends EditorAction {
    static { this.ID = 'editor.action.gotoLine'; }
    constructor() {
        super({
            id: GotoLineAction.ID,
            label: GoToLineNLS.gotoLineActionLabel,
            alias: 'Go to Line/Column...',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 37 /* KeyCode.KeyG */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(StandaloneGotoLineQuickAccessProvider.PREFIX);
    }
}
registerEditorAction(GotoLineAction);
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: StandaloneGotoLineQuickAccessProvider,
    prefix: StandaloneGotoLineQuickAccessProvider.PREFIX,
    helpEntries: [{ description: GoToLineNLS.gotoLineActionLabel, commandId: GotoLineAction.ID }],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUdvdG9MaW5lUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3F1aWNrQWNjZXNzL3N0YW5kYWxvbmVHb3RvTGluZVF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2pILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxHQUNWLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sWUFBWSxFQUNaLG9CQUFvQixHQUVwQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRWxGLElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQXNDLFNBQVEsbUNBQW1DO0lBRzdGLFlBQWdDLGFBQWtEO1FBQ2pGLEtBQUssRUFBRSxDQUFBO1FBRHlDLGtCQUFhLEdBQWIsYUFBYSxDQUFvQjtRQUYvRCx1Q0FBa0MsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBSWxFLENBQUM7SUFFRCxJQUFjLHVCQUF1QjtRQUNwQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxTQUFTLENBQUE7SUFDOUQsQ0FBQztDQUNELENBQUE7QUFWWSxxQ0FBcUM7SUFHcEMsV0FBQSxrQkFBa0IsQ0FBQTtHQUhuQixxQ0FBcUMsQ0FVakQ7O0FBRUQsTUFBTSxPQUFPLGNBQWUsU0FBUSxZQUFZO2FBQy9CLE9BQUUsR0FBRyx3QkFBd0IsQ0FBQTtJQUU3QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxjQUFjLENBQUMsRUFBRTtZQUNyQixLQUFLLEVBQUUsV0FBVyxDQUFDLG1CQUFtQjtZQUN0QyxLQUFLLEVBQUUsc0JBQXNCO1lBQzdCLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLE1BQU0sRUFBRTtnQkFDUCxNQUFNLEVBQUUsaUJBQWlCLENBQUMsS0FBSztnQkFDL0IsT0FBTyxFQUFFLGlEQUE2QjtnQkFDdEMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGdEQUE2QixFQUFFO2dCQUMvQyxNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDaEcsQ0FBQzs7QUFHRixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtBQUVwQyxRQUFRLENBQUMsRUFBRSxDQUF1QixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsMkJBQTJCLENBQUM7SUFDckYsSUFBSSxFQUFFLHFDQUFxQztJQUMzQyxNQUFNLEVBQUUscUNBQXFDLENBQUMsTUFBTTtJQUNwRCxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztDQUM3RixDQUFDLENBQUEifQ==