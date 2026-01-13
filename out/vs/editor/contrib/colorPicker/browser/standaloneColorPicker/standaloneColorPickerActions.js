/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, EditorAction2, } from '../../../../browser/editorExtensions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { StandaloneColorPickerController } from './standaloneColorPickerController.js';
export class ShowOrFocusStandaloneColorPicker extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.showOrFocusStandaloneColorPicker',
            title: {
                ...localize2('showOrFocusStandaloneColorPicker', 'Show or Focus Standalone Color Picker'),
                mnemonicTitle: localize({ key: 'mishowOrFocusStandaloneColorPicker', comment: ['&& denotes a mnemonic'] }, '&&Show or Focus Standalone Color Picker'),
            },
            precondition: undefined,
            menu: [{ id: MenuId.CommandPalette }],
            metadata: {
                description: localize2('showOrFocusStandaloneColorPickerDescription', 'Show or focus a standalone color picker which uses the default color provider. It displays hex/rgb/hsl colors.'),
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        StandaloneColorPickerController.get(editor)?.showOrFocus();
    }
}
export class HideStandaloneColorPicker extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.hideColorPicker',
            label: localize2({
                key: 'hideColorPicker',
                comment: ['Action that hides the color picker'],
            }, 'Hide the Color Picker'),
            precondition: EditorContextKeys.standaloneColorPickerVisible.isEqualTo(true),
            kbOpts: {
                primary: 9 /* KeyCode.Escape */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: localize2('hideColorPickerDescription', 'Hide the standalone color picker.'),
            },
        });
    }
    run(_accessor, editor) {
        StandaloneColorPickerController.get(editor)?.hide();
    }
}
export class InsertColorWithStandaloneColorPicker extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertColorWithStandaloneColorPicker',
            label: localize2({
                key: 'insertColorWithStandaloneColorPicker',
                comment: ['Action that inserts color with standalone color picker'],
            }, 'Insert Color with Standalone Color Picker'),
            precondition: EditorContextKeys.standaloneColorPickerFocused.isEqualTo(true),
            kbOpts: {
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: localize2('insertColorWithStandaloneColorPickerDescription', 'Insert hex/rgb/hsl colors with the focused standalone color picker.'),
            },
        });
    }
    run(_accessor, editor) {
        StandaloneColorPickerController.get(editor)?.insertColor();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9zdGFuZGFsb25lQ29sb3JQaWNrZXIvc3RhbmRhbG9uZUNvbG9yUGlja2VyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQ04sWUFBWSxFQUNaLGFBQWEsR0FFYixNQUFNLHlDQUF5QyxDQUFBO0FBRWhELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRGLE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxhQUFhO0lBQ2xFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdEQUFnRDtZQUNwRCxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsa0NBQWtDLEVBQUUsdUNBQXVDLENBQUM7Z0JBQ3pGLGFBQWEsRUFBRSxRQUFRLENBQ3RCLEVBQUUsR0FBRyxFQUFFLG9DQUFvQyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDakYseUNBQXlDLENBQ3pDO2FBQ0Q7WUFDRCxZQUFZLEVBQUUsU0FBUztZQUN2QixJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckMsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxTQUFTLENBQ3JCLDZDQUE2QyxFQUM3QyxnSEFBZ0gsQ0FDaEg7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxnQkFBZ0IsQ0FBQyxTQUEyQixFQUFFLE1BQW1CO1FBQ2hFLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQTtJQUMzRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsWUFBWTtJQUMxRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwrQkFBK0I7WUFDbkMsS0FBSyxFQUFFLFNBQVMsQ0FDZjtnQkFDQyxHQUFHLEVBQUUsaUJBQWlCO2dCQUN0QixPQUFPLEVBQUUsQ0FBQyxvQ0FBb0MsQ0FBQzthQUMvQyxFQUNELHVCQUF1QixDQUN2QjtZQUNELFlBQVksRUFBRSxpQkFBaUIsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQzVFLE1BQU0sRUFBRTtnQkFDUCxPQUFPLHdCQUFnQjtnQkFDdkIsTUFBTSwwQ0FBZ0M7YUFDdEM7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxtQ0FBbUMsQ0FBQzthQUN6RjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDTSxHQUFHLENBQUMsU0FBMkIsRUFBRSxNQUFtQjtRQUMxRCwrQkFBK0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDcEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9DQUFxQyxTQUFRLFlBQVk7SUFDckU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0RBQW9EO1lBQ3hELEtBQUssRUFBRSxTQUFTLENBQ2Y7Z0JBQ0MsR0FBRyxFQUFFLHNDQUFzQztnQkFDM0MsT0FBTyxFQUFFLENBQUMsd0RBQXdELENBQUM7YUFDbkUsRUFDRCwyQ0FBMkMsQ0FDM0M7WUFDRCxZQUFZLEVBQUUsaUJBQWlCLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztZQUM1RSxNQUFNLEVBQUU7Z0JBQ1AsT0FBTyx1QkFBZTtnQkFDdEIsTUFBTSwwQ0FBZ0M7YUFDdEM7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FDckIsaURBQWlELEVBQ2pELHFFQUFxRSxDQUNyRTthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNNLEdBQUcsQ0FBQyxTQUEyQixFQUFFLE1BQW1CO1FBQzFELCtCQUErQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQTtJQUMzRCxDQUFDO0NBQ0QifQ==