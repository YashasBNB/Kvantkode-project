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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlVGFiRm9jdXNNb2RlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi90b2dnbGVUYWJGb2N1c01vZGUvYnJvd3Nlci90b2dnbGVUYWJGb2N1c01vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHekYsTUFBTSxPQUFPLHdCQUF5QixTQUFRLE9BQU87YUFDN0IsT0FBRSxHQUFHLGtDQUFrQyxDQUFBO0lBRTlEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdCQUF3QixDQUFDLEVBQUU7WUFDL0IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQ25CO2dCQUNDLEdBQUcsRUFBRSxzQkFBc0I7Z0JBQzNCLE9BQU8sRUFBRSxDQUFDLDREQUE0RCxDQUFDO2FBQ3ZFLEVBQ0QsNEJBQTRCLENBQzVCO1lBQ0QsWUFBWSxFQUFFLFNBQVM7WUFDdkIsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxpREFBNkI7Z0JBQ3RDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxrREFBNkIsd0JBQWUsRUFBRTtnQkFDOUQsTUFBTSwwQ0FBZ0M7YUFDdEM7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQ3pCLDJCQUEyQixFQUMzQiwwTEFBMEwsQ0FDMUw7YUFDRDtZQUNELEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLEdBQUc7UUFDVCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDM0MsTUFBTSxRQUFRLEdBQUcsQ0FBQyxRQUFRLENBQUE7UUFDMUIsUUFBUSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsS0FBSyxDQUNKLEdBQUcsQ0FBQyxRQUFRLENBQ1gseUJBQXlCLEVBQ3pCLGdFQUFnRSxDQUNoRSxDQUNELENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssQ0FDSixHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGdEQUFnRCxDQUFDLENBQzFGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQzs7QUFHRixlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQSJ9