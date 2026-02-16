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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUdvdG9TeW1ib2xRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9xdWlja0FjY2Vzcy9zdGFuZGFsb25lR290b1N5bWJvbFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sdURBQXVELENBQUEsQ0FBQyxnRUFBZ0U7QUFDL0gsT0FBTyxxREFBcUQsQ0FBQSxDQUFDLDhFQUE4RTtBQUMzSSxPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsR0FDVixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSXhFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFaEYsSUFBTSx1Q0FBdUMsR0FBN0MsTUFBTSx1Q0FBd0MsU0FBUSxxQ0FBcUM7SUFHakcsWUFDcUIsYUFBa0QsRUFDNUMsdUJBQWlELEVBQ3JELG1CQUF5QztRQUUvRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUpkLGtCQUFhLEdBQWIsYUFBYSxDQUFvQjtRQUhwRCx1Q0FBa0MsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBUWxFLENBQUM7SUFFRCxJQUFjLHVCQUF1QjtRQUNwQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxTQUFTLENBQUE7SUFDOUQsQ0FBQztDQUNELENBQUE7QUFkWSx1Q0FBdUM7SUFJakQsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsb0JBQW9CLENBQUE7R0FOVix1Q0FBdUMsQ0FjbkQ7O0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFlBQVk7YUFDakMsT0FBRSxHQUFHLDRCQUE0QixDQUFBO0lBRWpEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdCQUFnQixDQUFDLEVBQUU7WUFDdkIsS0FBSyxFQUFFLGVBQWUsQ0FBQyx1QkFBdUI7WUFDOUMsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixZQUFZLEVBQUUsaUJBQWlCLENBQUMseUJBQXlCO1lBQ3pELE1BQU0sRUFBRTtnQkFDUCxNQUFNLEVBQUUsaUJBQWlCLENBQUMsS0FBSztnQkFDL0IsT0FBTyxFQUFFLG1EQUE2Qix3QkFBZTtnQkFDckQsTUFBTSwwQ0FBZ0M7YUFDdEM7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixRQUFRO2FBQ04sR0FBRyxDQUFDLGtCQUFrQixDQUFDO2FBQ3ZCLFdBQVcsQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsTUFBTSxFQUFFO1lBQy9ELGNBQWMsRUFBRSxjQUFjLENBQUMsSUFBSTtTQUNuQyxDQUFDLENBQUE7SUFDSixDQUFDOztBQUdGLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUE7QUFFdEMsUUFBUSxDQUFDLEVBQUUsQ0FBdUIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO0lBQ3JGLElBQUksRUFBRSx1Q0FBdUM7SUFDN0MsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLE1BQU07SUFDcEQsV0FBVyxFQUFFO1FBQ1o7WUFDQyxXQUFXLEVBQUUsZUFBZSxDQUFDLHVCQUF1QjtZQUNwRCxNQUFNLEVBQUUscUNBQXFDLENBQUMsTUFBTTtZQUNwRCxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsRUFBRTtTQUM5QjtRQUNEO1lBQ0MsV0FBVyxFQUFFLGVBQWUsQ0FBQyxpQ0FBaUM7WUFDOUQsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLGtCQUFrQjtTQUNoRTtLQUNEO0NBQ0QsQ0FBQyxDQUFBIn0=