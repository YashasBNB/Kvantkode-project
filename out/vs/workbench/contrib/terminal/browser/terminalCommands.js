/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ITerminalGroupService } from './terminal.js';
export function setupTerminalCommands() {
    registerOpenTerminalAtIndexCommands();
}
function registerOpenTerminalAtIndexCommands() {
    for (let i = 0; i < 9; i++) {
        const terminalIndex = i;
        const visibleIndex = i + 1;
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: `workbench.action.terminal.focusAtIndex${visibleIndex}`,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: undefined,
            primary: 0,
            handler: (accessor) => {
                accessor.get(ITerminalGroupService).setActiveInstanceByIndex(terminalIndex);
                return accessor.get(ITerminalGroupService).showPanel(true);
            },
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBRXJELE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsbUNBQW1DLEVBQUUsQ0FBQTtBQUN0QyxDQUFDO0FBRUQsU0FBUyxtQ0FBbUM7SUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVCLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUN2QixNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRTFCLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1lBQ3BELEVBQUUsRUFBRSx5Q0FBeUMsWUFBWSxFQUFFO1lBQzNELE1BQU0sNkNBQW1DO1lBQ3pDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLENBQUM7WUFDVixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDckIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUMzRSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDM0QsQ0FBQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7QUFDRixDQUFDIn0=