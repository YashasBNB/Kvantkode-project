/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalSendSequenceCommand } from './terminalActions.js';
export function registerSendSequenceKeybinding(text, rule) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: "workbench.action.terminal.sendSequence" /* TerminalCommandId.SendSequence */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: rule.when || TerminalContextKeys.focus,
        primary: rule.primary,
        mac: rule.mac,
        linux: rule.linux,
        win: rule.win,
        handler: terminalSendSequenceCommand,
        args: { text },
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxLZXliaW5kaW5ncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxLZXliaW5kaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBR04sbUJBQW1CLEdBQ25CLE1BQU0sK0RBQStELENBQUE7QUFFdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFbEUsTUFBTSxVQUFVLDhCQUE4QixDQUM3QyxJQUFZLEVBQ1osSUFBb0Q7SUFFcEQsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSwrRUFBZ0M7UUFDbEMsTUFBTSw2Q0FBbUM7UUFDekMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksbUJBQW1CLENBQUMsS0FBSztRQUM1QyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87UUFDckIsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQ2IsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1FBQ2pCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztRQUNiLE9BQU8sRUFBRSwyQkFBMkI7UUFDcEMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFO0tBQ2QsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9