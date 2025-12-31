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
import '../../../../base/browser/ui/codicons/codiconStyles.js'; // The codicon symbol styles are defined here and must be loaded
import '../../../contrib/symbolIcons/browser/symbolIcons.js'; // The codicon symbol colors are defined here and must be loaded to get colors
import { AbstractGotoSymbolQuickAccessProvider } from '../../../contrib/quickAccess/browser/gotoSymbolQuickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { QuickOutlineNLS } from '../../../common/standaloneStrings.js';
import { Event } from '../../../../base/common/event.js';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IQuickInputService, ItemActivation, } from '../../../../platform/quickinput/common/quickInput.js';
import { IOutlineModelService } from '../../../contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
let StandaloneGotoSymbolQuickAccessProvider = class StandaloneGotoSymbolQuickAccessProvider extends AbstractGotoSymbolQuickAccessProvider {
    constructor(editorService, languageFeaturesService, outlineModelService) {
        super(languageFeaturesService, outlineModelService);
        this.editorService = editorService;
        this.onDidActiveTextEditorControlChange = Event.None;
    }
    get activeTextEditorControl() {
        return this.editorService.getFocusedCodeEditor() ?? undefined;
    }
};
StandaloneGotoSymbolQuickAccessProvider = __decorate([
    __param(0, ICodeEditorService),
    __param(1, ILanguageFeaturesService),
    __param(2, IOutlineModelService)
], StandaloneGotoSymbolQuickAccessProvider);
export { StandaloneGotoSymbolQuickAccessProvider };
export class GotoSymbolAction extends EditorAction {
    static { this.ID = 'editor.action.quickOutline'; }
    constructor() {
        super({
            id: GotoSymbolAction.ID,
            label: QuickOutlineNLS.quickOutlineActionLabel,
            alias: 'Go to Symbol...',
            precondition: EditorContextKeys.hasDocumentSymbolProvider,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            contextMenuOpts: {
                group: 'navigation',
                order: 3,
            },
        });
    }
    run(accessor) {
        accessor
            .get(IQuickInputService)
            .quickAccess.show(AbstractGotoSymbolQuickAccessProvider.PREFIX, {
            itemActivation: ItemActivation.NONE,
        });
    }
}
registerEditorAction(GotoSymbolAction);
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: StandaloneGotoSymbolQuickAccessProvider,
    prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX,
    helpEntries: [
        {
            description: QuickOutlineNLS.quickOutlineActionLabel,
            prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX,
            commandId: GotoSymbolAction.ID,
        },
        {
            description: QuickOutlineNLS.quickOutlineByCategoryActionLabel,
            prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX_BY_CATEGORY,
        },
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUdvdG9TeW1ib2xRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvcXVpY2tBY2Nlc3Mvc3RhbmRhbG9uZUdvdG9TeW1ib2xRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVEQUF1RCxDQUFBLENBQUMsZ0VBQWdFO0FBQy9ILE9BQU8scURBQXFELENBQUEsQ0FBQyw4RUFBOEU7QUFDM0ksT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFFTixVQUFVLEdBQ1YsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUl4RSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRWhGLElBQU0sdUNBQXVDLEdBQTdDLE1BQU0sdUNBQXdDLFNBQVEscUNBQXFDO0lBR2pHLFlBQ3FCLGFBQWtELEVBQzVDLHVCQUFpRCxFQUNyRCxtQkFBeUM7UUFFL0QsS0FBSyxDQUFDLHVCQUF1QixFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFKZCxrQkFBYSxHQUFiLGFBQWEsQ0FBb0I7UUFIcEQsdUNBQWtDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQVFsRSxDQUFDO0lBRUQsSUFBYyx1QkFBdUI7UUFDcEMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQixFQUFFLElBQUksU0FBUyxDQUFBO0lBQzlELENBQUM7Q0FDRCxDQUFBO0FBZFksdUNBQXVDO0lBSWpELFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLG9CQUFvQixDQUFBO0dBTlYsdUNBQXVDLENBY25EOztBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxZQUFZO2FBQ2pDLE9BQUUsR0FBRyw0QkFBNEIsQ0FBQTtJQUVqRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ3ZCLEtBQUssRUFBRSxlQUFlLENBQUMsdUJBQXVCO1lBQzlDLEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsWUFBWSxFQUFFLGlCQUFpQixDQUFDLHlCQUF5QjtZQUN6RCxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLEtBQUs7Z0JBQy9CLE9BQU8sRUFBRSxtREFBNkIsd0JBQWU7Z0JBQ3JELE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0QsZUFBZSxFQUFFO2dCQUNoQixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsUUFBUTthQUNOLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQzthQUN2QixXQUFXLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLE1BQU0sRUFBRTtZQUMvRCxjQUFjLEVBQUUsY0FBYyxDQUFDLElBQUk7U0FDbkMsQ0FBQyxDQUFBO0lBQ0osQ0FBQzs7QUFHRixvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0FBRXRDLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztJQUNyRixJQUFJLEVBQUUsdUNBQXVDO0lBQzdDLE1BQU0sRUFBRSxxQ0FBcUMsQ0FBQyxNQUFNO0lBQ3BELFdBQVcsRUFBRTtRQUNaO1lBQ0MsV0FBVyxFQUFFLGVBQWUsQ0FBQyx1QkFBdUI7WUFDcEQsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLE1BQU07WUFDcEQsU0FBUyxFQUFFLGdCQUFnQixDQUFDLEVBQUU7U0FDOUI7UUFDRDtZQUNDLFdBQVcsRUFBRSxlQUFlLENBQUMsaUNBQWlDO1lBQzlELE1BQU0sRUFBRSxxQ0FBcUMsQ0FBQyxrQkFBa0I7U0FDaEU7S0FDRDtDQUNELENBQUMsQ0FBQSJ9