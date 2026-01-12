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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbENvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFckQsTUFBTSxVQUFVLHFCQUFxQjtJQUNwQyxtQ0FBbUMsRUFBRSxDQUFBO0FBQ3RDLENBQUM7QUFFRCxTQUFTLG1DQUFtQztJQUMzQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDNUIsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFMUIsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7WUFDcEQsRUFBRSxFQUFFLHlDQUF5QyxZQUFZLEVBQUU7WUFDM0QsTUFBTSw2Q0FBbUM7WUFDekMsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsQ0FBQztZQUNWLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNyQixRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQzNFLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzRCxDQUFDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztBQUNGLENBQUMifQ==