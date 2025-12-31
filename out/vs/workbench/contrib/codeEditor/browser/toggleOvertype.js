/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { InputMode } from '../../../../editor/common/inputMode.js';
export class ToggleOvertypeInsertMode extends Action2 {
    constructor() {
        super({
            id: 'editor.action.toggleOvertypeInsertMode',
            title: {
                ...localize2('toggleOvertypeInsertMode', 'Toggle Overtype/Insert Mode'),
                mnemonicTitle: localize({ key: 'mitoggleOvertypeInsertMode', comment: ['&& denotes a mnemonic'] }, '&&Toggle Overtype/Insert Mode'),
            },
            metadata: {
                description: localize2('toggleOvertypeMode.description', 'Toggle between overtype and insert mode'),
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 19 /* KeyCode.Insert */,
                mac: { primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */ },
            },
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const oldInputMode = InputMode.getInputMode();
        const newInputMode = oldInputMode === 'insert' ? 'overtype' : 'insert';
        InputMode.setInputMode(newInputMode);
    }
}
registerAction2(ToggleOvertypeInsertMode);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlT3ZlcnR5cGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvdG9nZ2xlT3ZlcnR5cGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUl6RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFbEUsTUFBTSxPQUFPLHdCQUF5QixTQUFRLE9BQU87SUFDcEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsd0NBQXdDO1lBQzVDLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSw2QkFBNkIsQ0FBQztnQkFDdkUsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsNEJBQTRCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUN6RSwrQkFBK0IsQ0FDL0I7YUFDRDtZQUNELFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsU0FBUyxDQUNyQixnQ0FBZ0MsRUFDaEMseUNBQXlDLENBQ3pDO2FBQ0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLE9BQU8seUJBQWdCO2dCQUN2QixHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsZ0RBQTJCLHdCQUFlLEVBQUU7YUFDNUQ7WUFDRCxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUM1QyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDN0MsTUFBTSxZQUFZLEdBQUcsWUFBWSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUE7UUFDdEUsU0FBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0NBQ0Q7QUFFRCxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQSJ9