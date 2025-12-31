/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorCommand, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { DefaultDropProvidersFeature } from './defaultProviders.js';
import { DropIntoEditorController, changeDropTypeCommandId, dropWidgetVisibleCtx, } from './dropIntoEditorController.js';
registerEditorContribution(DropIntoEditorController.ID, DropIntoEditorController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorFeature(DefaultDropProvidersFeature);
registerEditorCommand(new (class extends EditorCommand {
    constructor() {
        super({
            id: changeDropTypeCommandId,
            precondition: dropWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
            },
        });
    }
    runEditorCommand(_accessor, editor, _args) {
        DropIntoEditorController.get(editor)?.changeDropType();
    }
})());
registerEditorCommand(new (class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.hideDropWidget',
            precondition: dropWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            },
        });
    }
    runEditorCommand(_accessor, editor, _args) {
        DropIntoEditorController.get(editor)?.clearWidgets();
    }
})());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcEludG9FZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9kcm9wSW50b0VkaXRvckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQ04sYUFBYSxFQUdiLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FDMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHVCQUF1QixFQUN2QixvQkFBb0IsR0FDcEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QywwQkFBMEIsQ0FDekIsd0JBQXdCLENBQUMsRUFBRSxFQUMzQix3QkFBd0IsaUVBRXhCLENBQUE7QUFDRCxxQkFBcUIsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO0FBRWxELHFCQUFxQixDQUNwQixJQUFJLENBQUMsS0FBTSxTQUFRLGFBQWE7SUFDL0I7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsdUJBQXVCO1lBQzNCLFlBQVksRUFBRSxvQkFBb0I7WUFDbEMsTUFBTSxFQUFFO2dCQUNQLE1BQU0sMENBQWdDO2dCQUN0QyxPQUFPLEVBQUUsbURBQStCO2FBQ3hDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVlLGdCQUFnQixDQUMvQixTQUFrQyxFQUNsQyxNQUFtQixFQUNuQixLQUFVO1FBRVYsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLGNBQWMsRUFBRSxDQUFBO0lBQ3ZELENBQUM7Q0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO0FBRUQscUJBQXFCLENBQ3BCLElBQUksQ0FBQyxLQUFNLFNBQVEsYUFBYTtJQUMvQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUI7WUFDM0IsWUFBWSxFQUFFLG9CQUFvQjtZQUNsQyxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSwwQ0FBZ0M7Z0JBQ3RDLE9BQU8sd0JBQWdCO2FBQ3ZCO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVlLGdCQUFnQixDQUMvQixTQUFrQyxFQUNsQyxNQUFtQixFQUNuQixLQUFVO1FBRVYsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFBO0lBQ3JELENBQUM7Q0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBIn0=