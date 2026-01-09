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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlT3ZlcnR5cGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci90b2dnbGVPdmVydHlwZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBSXpGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVsRSxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsT0FBTztJQUNwRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3Q0FBd0M7WUFDNUMsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLDBCQUEwQixFQUFFLDZCQUE2QixDQUFDO2dCQUN2RSxhQUFhLEVBQUUsUUFBUSxDQUN0QixFQUFFLEdBQUcsRUFBRSw0QkFBNEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ3pFLCtCQUErQixDQUMvQjthQUNEO1lBQ0QsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxTQUFTLENBQ3JCLGdDQUFnQyxFQUNoQyx5Q0FBeUMsQ0FDekM7YUFDRDtZQUNELFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsT0FBTyx5QkFBZ0I7Z0JBQ3ZCLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxnREFBMkIsd0JBQWUsRUFBRTthQUM1RDtZQUNELEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1NBQ3pCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQzVDLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUM3QyxNQUFNLFlBQVksR0FBRyxZQUFZLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUN0RSxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3JDLENBQUM7Q0FDRDtBQUVELGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBIn0=