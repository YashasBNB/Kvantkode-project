/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { TabFocus } from '../../../browser/config/tabFocus.js';
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
export class ToggleTabFocusModeAction extends Action2 {
    static { this.ID = 'editor.action.toggleTabFocusMode'; }
    constructor() {
        super({
            id: ToggleTabFocusModeAction.ID,
            title: nls.localize2({
                key: 'toggle.tabMovesFocus',
                comment: ['Turn on/off use of tab key for moving focus around VS Code'],
            }, 'Toggle Tab Key Moves Focus'),
            precondition: undefined,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 43 /* KeyCode.KeyM */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 43 /* KeyCode.KeyM */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('tabMovesFocusDescriptions', 'Determines whether the tab key moves focus around the workbench or inserts the tab character in the current editor. This is also called tab trapping, tab navigation, or tab focus mode.'),
            },
            f1: true,
        });
    }
    run() {
        const oldValue = TabFocus.getTabFocusMode();
        const newValue = !oldValue;
        TabFocus.setTabFocusMode(newValue);
        if (newValue) {
            alert(nls.localize('toggle.tabMovesFocus.on', 'Pressing Tab will now move focus to the next focusable element'));
        }
        else {
            alert(nls.localize('toggle.tabMovesFocus.off', 'Pressing Tab will now insert the tab character'));
        }
    }
}
registerAction2(ToggleTabFocusModeAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlVGFiRm9jdXNNb2RlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvdG9nZ2xlVGFiRm9jdXNNb2RlL2Jyb3dzZXIvdG9nZ2xlVGFiRm9jdXNNb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBR3pGLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxPQUFPO2FBQzdCLE9BQUUsR0FBRyxrQ0FBa0MsQ0FBQTtJQUU5RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3QkFBd0IsQ0FBQyxFQUFFO1lBQy9CLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUNuQjtnQkFDQyxHQUFHLEVBQUUsc0JBQXNCO2dCQUMzQixPQUFPLEVBQUUsQ0FBQyw0REFBNEQsQ0FBQzthQUN2RSxFQUNELDRCQUE0QixDQUM1QjtZQUNELFlBQVksRUFBRSxTQUFTO1lBQ3ZCLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsaURBQTZCO2dCQUN0QyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsa0RBQTZCLHdCQUFlLEVBQUU7Z0JBQzlELE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0QsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUN6QiwyQkFBMkIsRUFDM0IsMExBQTBMLENBQzFMO2FBQ0Q7WUFDRCxFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxHQUFHO1FBQ1QsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNDLE1BQU0sUUFBUSxHQUFHLENBQUMsUUFBUSxDQUFBO1FBQzFCLFFBQVEsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbEMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLEtBQUssQ0FDSixHQUFHLENBQUMsUUFBUSxDQUNYLHlCQUF5QixFQUN6QixnRUFBZ0UsQ0FDaEUsQ0FDRCxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLENBQ0osR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxnREFBZ0QsQ0FBQyxDQUMxRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7O0FBR0YsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUEifQ==