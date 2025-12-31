/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { ContextKeyExpr } from '../../contextkey/common/contextkey.js';
import { InputFocusedContext } from '../../contextkey/common/contextkeys.js';
import { KeybindingsRegistry, } from '../../keybinding/common/keybindingsRegistry.js';
import { endOfQuickInputBoxContext, inQuickInputContext, quickInputTypeContextKeyValue, } from './quickInput.js';
import { IQuickInputService, QuickPickFocus, } from '../common/quickInput.js';
const defaultCommandAndKeybindingRule = {
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(quickInputTypeContextKeyValue, "quickPick" /* QuickInputType.QuickPick */), inQuickInputContext),
    metadata: {
        description: localize('quickPick', 'Used while in the context of the quick pick. If you change one keybinding for this command, you should change all of the other keybindings (modifier variants) of this command as well.'),
    },
};
function registerQuickPickCommandAndKeybindingRule(rule, options = {}) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        ...defaultCommandAndKeybindingRule,
        ...rule,
        secondary: getSecondary(rule.primary, rule.secondary ?? [], options),
    });
}
const ctrlKeyMod = isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */;
// This function will generate all the combinations of keybindings for the given primary keybinding
function getSecondary(primary, secondary, options = {}) {
    if (options.withAltMod) {
        secondary.push(512 /* KeyMod.Alt */ + primary);
    }
    if (options.withCtrlMod) {
        secondary.push(ctrlKeyMod + primary);
        if (options.withAltMod) {
            secondary.push(512 /* KeyMod.Alt */ + ctrlKeyMod + primary);
        }
    }
    if (options.withCmdMod && isMacintosh) {
        secondary.push(2048 /* KeyMod.CtrlCmd */ + primary);
        if (options.withCtrlMod) {
            secondary.push(2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + primary);
        }
        if (options.withAltMod) {
            secondary.push(2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + primary);
            if (options.withCtrlMod) {
                secondary.push(2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 256 /* KeyMod.WinCtrl */ + primary);
            }
        }
    }
    return secondary;
}
//#region Navigation
function focusHandler(focus, focusOnQuickNatigate) {
    return (accessor) => {
        // Assuming this is a quick pick due to above when clause
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        if (!currentQuickPick) {
            return;
        }
        if (focusOnQuickNatigate && currentQuickPick.quickNavigate) {
            return currentQuickPick.focus(focusOnQuickNatigate);
        }
        return currentQuickPick.focus(focus);
    };
}
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.pageNext',
    primary: 12 /* KeyCode.PageDown */,
    handler: focusHandler(QuickPickFocus.NextPage),
}, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.pagePrevious',
    primary: 11 /* KeyCode.PageUp */,
    handler: focusHandler(QuickPickFocus.PreviousPage),
}, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.first',
    primary: ctrlKeyMod + 14 /* KeyCode.Home */,
    handler: focusHandler(QuickPickFocus.First),
}, { withAltMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.last',
    primary: ctrlKeyMod + 13 /* KeyCode.End */,
    handler: focusHandler(QuickPickFocus.Last),
}, { withAltMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.next', primary: 18 /* KeyCode.DownArrow */, handler: focusHandler(QuickPickFocus.Next) }, { withCtrlMod: true });
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.previous',
    primary: 16 /* KeyCode.UpArrow */,
    handler: focusHandler(QuickPickFocus.Previous),
}, { withCtrlMod: true });
// The next & previous separator commands are interesting because if we are in quick access mode, we are already holding a modifier key down.
// In this case, we want that modifier key+up/down to navigate to the next/previous item, not the next/previous separator.
// To handle this, we have a separate command for navigating to the next/previous separator when we are not in quick access mode.
// If, however, we are in quick access mode, and you hold down an additional modifier key, we will navigate to the next/previous separator.
const nextSeparatorFallbackDesc = localize('quickInput.nextSeparatorWithQuickAccessFallback', "If we're in quick access mode, this will navigate to the next item. If we are not in quick access mode, this will navigate to the next separator.");
const prevSeparatorFallbackDesc = localize('quickInput.previousSeparatorWithQuickAccessFallback', "If we're in quick access mode, this will navigate to the previous item. If we are not in quick access mode, this will navigate to the previous separator.");
if (isMacintosh) {
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparatorWithQuickAccessFallback',
        primary: 2048 /* KeyMod.CtrlCmd */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator, QuickPickFocus.Next),
        metadata: { description: nextSeparatorFallbackDesc },
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        // Since macOS has the cmd key as the primary modifier, we need to add this additional
        // keybinding to capture cmd+ctrl+upArrow
        secondary: [2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 18 /* KeyCode.DownArrow */],
        handler: focusHandler(QuickPickFocus.NextSeparator),
    }, { withCtrlMod: true });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparatorWithQuickAccessFallback',
        primary: 2048 /* KeyMod.CtrlCmd */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator, QuickPickFocus.Previous),
        metadata: { description: prevSeparatorFallbackDesc },
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        // Since macOS has the cmd key as the primary modifier, we need to add this additional
        // keybinding to capture cmd+ctrl+upArrow
        secondary: [2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 16 /* KeyCode.UpArrow */],
        handler: focusHandler(QuickPickFocus.PreviousSeparator),
    }, { withCtrlMod: true });
}
else {
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparatorWithQuickAccessFallback',
        primary: 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator, QuickPickFocus.Next),
        metadata: { description: nextSeparatorFallbackDesc },
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator),
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparatorWithQuickAccessFallback',
        primary: 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator, QuickPickFocus.Previous),
        metadata: { description: prevSeparatorFallbackDesc },
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator),
    });
}
//#endregion
//#region Accept
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.acceptInBackground',
    // If we are in the quick pick but the input box is not focused or our cursor is at the end of the input box
    when: ContextKeyExpr.and(defaultCommandAndKeybindingRule.when, ContextKeyExpr.or(InputFocusedContext.negate(), endOfQuickInputBoxContext)),
    primary: 17 /* KeyCode.RightArrow */,
    // Need a little extra weight to ensure this keybinding is preferred over the default cmd+alt+right arrow keybinding
    // https://github.com/microsoft/vscode/blob/1451e4fbbbf074a4355cc537c35b547b80ce1c52/src/vs/workbench/browser/parts/editor/editorActions.ts#L1178-L1195
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: (accessor) => {
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        currentQuickPick?.accept(true);
    },
}, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
//#region Toggle Hover
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.toggleHover',
    primary: ctrlKeyMod | 10 /* KeyCode.Space */,
    handler: (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.toggleHover();
    },
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDNUUsT0FBTyxFQUdOLG1CQUFtQixHQUNuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTix5QkFBeUIsRUFDekIsbUJBQW1CLEVBQ25CLDZCQUE2QixHQUM3QixNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsY0FBYyxHQUNkLE1BQU0seUJBQXlCLENBQUE7QUFFaEMsTUFBTSwrQkFBK0IsR0FBRztJQUN2QyxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsNkNBQTJCLEVBQzlFLG1CQUFtQixDQUNuQjtJQUNELFFBQVEsRUFBRTtRQUNULFdBQVcsRUFBRSxRQUFRLENBQ3BCLFdBQVcsRUFDWCx5TEFBeUwsQ0FDekw7S0FDRDtDQUNELENBQUE7QUFDRCxTQUFTLHlDQUF5QyxDQUNqRCxJQUFnRSxFQUNoRSxVQUFpRixFQUFFO0lBRW5GLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1FBQ3BELEdBQUcsK0JBQStCO1FBQ2xDLEdBQUcsSUFBSTtRQUNQLFNBQVMsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUM7S0FDckUsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLDBCQUFnQixDQUFDLDBCQUFlLENBQUE7QUFFaEUsbUdBQW1HO0FBQ25HLFNBQVMsWUFBWSxDQUNwQixPQUFlLEVBQ2YsU0FBbUIsRUFDbkIsVUFBaUYsRUFBRTtJQUVuRixJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUN4QixTQUFTLENBQUMsSUFBSSxDQUFDLHVCQUFhLE9BQU8sQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN6QixTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsQ0FBQTtRQUNwQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN4QixTQUFTLENBQUMsSUFBSSxDQUFDLHVCQUFhLFVBQVUsR0FBRyxPQUFPLENBQUMsQ0FBQTtRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUN2QyxTQUFTLENBQUMsSUFBSSxDQUFDLDRCQUFpQixPQUFPLENBQUMsQ0FBQTtRQUN4QyxJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN6QixTQUFTLENBQUMsSUFBSSxDQUFDLG9EQUErQixHQUFHLE9BQU8sQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN4QixTQUFTLENBQUMsSUFBSSxDQUFDLGdEQUEyQixHQUFHLE9BQU8sQ0FBQyxDQUFBO1lBQ3JELElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6QixTQUFTLENBQUMsSUFBSSxDQUFDLGdEQUEyQiwyQkFBaUIsR0FBRyxPQUFPLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsb0JBQW9CO0FBRXBCLFNBQVMsWUFBWSxDQUNwQixLQUFxQixFQUNyQixvQkFBcUM7SUFFckMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ25CLHlEQUF5RDtRQUN6RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxpQkFFOUMsQ0FBQTtRQUNaLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxvQkFBb0IsSUFBSSxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM1RCxPQUFPLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFDRCxPQUFPLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNyQyxDQUFDLENBQUE7QUFDRixDQUFDO0FBRUQseUNBQXlDLENBQ3hDO0lBQ0MsRUFBRSxFQUFFLHFCQUFxQjtJQUN6QixPQUFPLDJCQUFrQjtJQUN6QixPQUFPLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7Q0FDOUMsRUFDRCxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQ3pELENBQUE7QUFDRCx5Q0FBeUMsQ0FDeEM7SUFDQyxFQUFFLEVBQUUseUJBQXlCO0lBQzdCLE9BQU8seUJBQWdCO0lBQ3ZCLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQztDQUNsRCxFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDekQsQ0FBQTtBQUNELHlDQUF5QyxDQUN4QztJQUNDLEVBQUUsRUFBRSxrQkFBa0I7SUFDdEIsT0FBTyxFQUFFLFVBQVUsd0JBQWU7SUFDbEMsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO0NBQzNDLEVBQ0QsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDdEMsQ0FBQTtBQUNELHlDQUF5QyxDQUN4QztJQUNDLEVBQUUsRUFBRSxpQkFBaUI7SUFDckIsT0FBTyxFQUFFLFVBQVUsdUJBQWM7SUFDakMsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO0NBQzFDLEVBQ0QsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDdEMsQ0FBQTtBQUNELHlDQUF5QyxDQUN4QyxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLDRCQUFtQixFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQ2pHLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFBO0FBQ0QseUNBQXlDLENBQ3hDO0lBQ0MsRUFBRSxFQUFFLHFCQUFxQjtJQUN6QixPQUFPLDBCQUFpQjtJQUN4QixPQUFPLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7Q0FDOUMsRUFDRCxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FDckIsQ0FBQTtBQUVELDZJQUE2STtBQUM3SSwwSEFBMEg7QUFDMUgsaUlBQWlJO0FBQ2pJLDJJQUEySTtBQUUzSSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FDekMsaURBQWlELEVBQ2pELG1KQUFtSixDQUNuSixDQUFBO0FBQ0QsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQ3pDLHFEQUFxRCxFQUNyRCwySkFBMkosQ0FDM0osQ0FBQTtBQUNELElBQUksV0FBVyxFQUFFLENBQUM7SUFDakIseUNBQXlDLENBQUM7UUFDekMsRUFBRSxFQUFFLGlEQUFpRDtRQUNyRCxPQUFPLEVBQUUsc0RBQWtDO1FBQzNDLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDO1FBQ3hFLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSx5QkFBeUIsRUFBRTtLQUNwRCxDQUFDLENBQUE7SUFDRix5Q0FBeUMsQ0FDeEM7UUFDQyxFQUFFLEVBQUUsMEJBQTBCO1FBQzlCLE9BQU8sRUFBRSxnREFBMkIsNkJBQW9CO1FBQ3hELHNGQUFzRjtRQUN0Rix5Q0FBeUM7UUFDekMsU0FBUyxFQUFFLENBQUMsb0RBQStCLDZCQUFvQixDQUFDO1FBQ2hFLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQztLQUNuRCxFQUNELEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFBO0lBRUQseUNBQXlDLENBQUM7UUFDekMsRUFBRSxFQUFFLHFEQUFxRDtRQUN6RCxPQUFPLEVBQUUsb0RBQWdDO1FBQ3pDLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUM7UUFDaEYsUUFBUSxFQUFFLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFFO0tBQ3BELENBQUMsQ0FBQTtJQUNGLHlDQUF5QyxDQUN4QztRQUNDLEVBQUUsRUFBRSw4QkFBOEI7UUFDbEMsT0FBTyxFQUFFLGdEQUEyQiwyQkFBa0I7UUFDdEQsc0ZBQXNGO1FBQ3RGLHlDQUF5QztRQUN6QyxTQUFTLEVBQUUsQ0FBQyxvREFBK0IsMkJBQWtCLENBQUM7UUFDOUQsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUM7S0FDdkQsRUFDRCxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FDckIsQ0FBQTtBQUNGLENBQUM7S0FBTSxDQUFDO0lBQ1AseUNBQXlDLENBQUM7UUFDekMsRUFBRSxFQUFFLGlEQUFpRDtRQUNyRCxPQUFPLEVBQUUsaURBQThCO1FBQ3ZDLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDO1FBQ3hFLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSx5QkFBeUIsRUFBRTtLQUNwRCxDQUFDLENBQUE7SUFDRix5Q0FBeUMsQ0FBQztRQUN6QyxFQUFFLEVBQUUsMEJBQTBCO1FBQzlCLE9BQU8sRUFBRSxnREFBMkIsNkJBQW9CO1FBQ3hELE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQztLQUNuRCxDQUFDLENBQUE7SUFFRix5Q0FBeUMsQ0FBQztRQUN6QyxFQUFFLEVBQUUscURBQXFEO1FBQ3pELE9BQU8sRUFBRSwrQ0FBNEI7UUFDckMsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQztRQUNoRixRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUseUJBQXlCLEVBQUU7S0FDcEQsQ0FBQyxDQUFBO0lBQ0YseUNBQXlDLENBQUM7UUFDekMsRUFBRSxFQUFFLDhCQUE4QjtRQUNsQyxPQUFPLEVBQUUsZ0RBQTJCLDJCQUFrQjtRQUN0RCxPQUFPLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQztLQUN2RCxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsWUFBWTtBQUVaLGdCQUFnQjtBQUVoQix5Q0FBeUMsQ0FDeEM7SUFDQyxFQUFFLEVBQUUsK0JBQStCO0lBQ25DLDRHQUE0RztJQUM1RyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsK0JBQStCLENBQUMsSUFBSSxFQUNwQyxjQUFjLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxFQUFFLHlCQUF5QixDQUFDLENBQzFFO0lBQ0QsT0FBTyw2QkFBb0I7SUFDM0Isb0hBQW9IO0lBQ3BILHVKQUF1SjtJQUN2SixNQUFNLEVBQUUsOENBQW9DLEVBQUU7SUFDOUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDckIsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsaUJBQW9DLENBQUE7UUFDOUYsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQy9CLENBQUM7Q0FDRCxFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDekQsQ0FBQTtBQUVELHNCQUFzQjtBQUV0Qix5Q0FBeUMsQ0FBQztJQUN6QyxFQUFFLEVBQUUsd0JBQXdCO0lBQzVCLE9BQU8sRUFBRSxVQUFVLHlCQUFnQjtJQUNuQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUNyQixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsWUFBWSJ9