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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvc3RhbmRhbG9uZUNvbG9yUGlja2VyL3N0YW5kYWxvbmVDb2xvclBpY2tlckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLFlBQVksRUFDWixhQUFhLEdBRWIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRTNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV0RixNQUFNLE9BQU8sZ0NBQWlDLFNBQVEsYUFBYTtJQUNsRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnREFBZ0Q7WUFDcEQsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLGtDQUFrQyxFQUFFLHVDQUF1QyxDQUFDO2dCQUN6RixhQUFhLEVBQUUsUUFBUSxDQUN0QixFQUFFLEdBQUcsRUFBRSxvQ0FBb0MsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ2pGLHlDQUF5QyxDQUN6QzthQUNEO1lBQ0QsWUFBWSxFQUFFLFNBQVM7WUFDdkIsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JDLFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsU0FBUyxDQUNyQiw2Q0FBNkMsRUFDN0MsZ0hBQWdILENBQ2hIO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsU0FBMkIsRUFBRSxNQUFtQjtRQUNoRSwrQkFBK0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUE7SUFDM0QsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFlBQVk7SUFDMUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCO1lBQ25DLEtBQUssRUFBRSxTQUFTLENBQ2Y7Z0JBQ0MsR0FBRyxFQUFFLGlCQUFpQjtnQkFDdEIsT0FBTyxFQUFFLENBQUMsb0NBQW9DLENBQUM7YUFDL0MsRUFDRCx1QkFBdUIsQ0FDdkI7WUFDRCxZQUFZLEVBQUUsaUJBQWlCLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztZQUM1RSxNQUFNLEVBQUU7Z0JBQ1AsT0FBTyx3QkFBZ0I7Z0JBQ3ZCLE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0QsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxTQUFTLENBQUMsNEJBQTRCLEVBQUUsbUNBQW1DLENBQUM7YUFDekY7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ00sR0FBRyxDQUFDLFNBQTJCLEVBQUUsTUFBbUI7UUFDMUQsK0JBQStCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFBO0lBQ3BELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxvQ0FBcUMsU0FBUSxZQUFZO0lBQ3JFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9EQUFvRDtZQUN4RCxLQUFLLEVBQUUsU0FBUyxDQUNmO2dCQUNDLEdBQUcsRUFBRSxzQ0FBc0M7Z0JBQzNDLE9BQU8sRUFBRSxDQUFDLHdEQUF3RCxDQUFDO2FBQ25FLEVBQ0QsMkNBQTJDLENBQzNDO1lBQ0QsWUFBWSxFQUFFLGlCQUFpQixDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDNUUsTUFBTSxFQUFFO2dCQUNQLE9BQU8sdUJBQWU7Z0JBQ3RCLE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0QsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxTQUFTLENBQ3JCLGlEQUFpRCxFQUNqRCxxRUFBcUUsQ0FDckU7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDTSxHQUFHLENBQUMsU0FBMkIsRUFBRSxNQUFtQjtRQUMxRCwrQkFBK0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUE7SUFDM0QsQ0FBQztDQUNEIn0=