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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0lucHV0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM1RSxPQUFPLEVBR04sbUJBQW1CLEdBQ25CLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixtQkFBbUIsRUFDbkIsNkJBQTZCLEdBQzdCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUNOLGtCQUFrQixFQUdsQixjQUFjLEdBQ2QsTUFBTSx5QkFBeUIsQ0FBQTtBQUVoQyxNQUFNLCtCQUErQixHQUFHO0lBQ3ZDLE1BQU0sNkNBQW1DO0lBQ3pDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsTUFBTSxDQUFDLDZCQUE2Qiw2Q0FBMkIsRUFDOUUsbUJBQW1CLENBQ25CO0lBQ0QsUUFBUSxFQUFFO1FBQ1QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsV0FBVyxFQUNYLHlMQUF5TCxDQUN6TDtLQUNEO0NBQ0QsQ0FBQTtBQUNELFNBQVMseUNBQXlDLENBQ2pELElBQWdFLEVBQ2hFLFVBQWlGLEVBQUU7SUFFbkYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsR0FBRywrQkFBK0I7UUFDbEMsR0FBRyxJQUFJO1FBQ1AsU0FBUyxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBUSxFQUFFLElBQUksQ0FBQyxTQUFTLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQztLQUNyRSxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsMEJBQWdCLENBQUMsMEJBQWUsQ0FBQTtBQUVoRSxtR0FBbUc7QUFDbkcsU0FBUyxZQUFZLENBQ3BCLE9BQWUsRUFDZixTQUFtQixFQUNuQixVQUFpRixFQUFFO0lBRW5GLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3hCLFNBQVMsQ0FBQyxJQUFJLENBQUMsdUJBQWEsT0FBTyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFBO1FBQ3BDLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3hCLFNBQVMsQ0FBQyxJQUFJLENBQUMsdUJBQWEsVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFBO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ3ZDLFNBQVMsQ0FBQyxJQUFJLENBQUMsNEJBQWlCLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0RBQStCLEdBQUcsT0FBTyxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3hCLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0RBQTJCLEdBQUcsT0FBTyxDQUFDLENBQUE7WUFDckQsSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0RBQTJCLDJCQUFpQixHQUFHLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxvQkFBb0I7QUFFcEIsU0FBUyxZQUFZLENBQ3BCLEtBQXFCLEVBQ3JCLG9CQUFxQztJQUVyQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDbkIseURBQXlEO1FBQ3pELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLGlCQUU5QyxDQUFBO1FBQ1osSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLG9CQUFvQixJQUFJLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzVELE9BQU8sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUNELE9BQU8sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3JDLENBQUMsQ0FBQTtBQUNGLENBQUM7QUFFRCx5Q0FBeUMsQ0FDeEM7SUFDQyxFQUFFLEVBQUUscUJBQXFCO0lBQ3pCLE9BQU8sMkJBQWtCO0lBQ3pCLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztDQUM5QyxFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDekQsQ0FBQTtBQUNELHlDQUF5QyxDQUN4QztJQUNDLEVBQUUsRUFBRSx5QkFBeUI7SUFDN0IsT0FBTyx5QkFBZ0I7SUFDdkIsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDO0NBQ2xELEVBQ0QsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUN6RCxDQUFBO0FBQ0QseUNBQXlDLENBQ3hDO0lBQ0MsRUFBRSxFQUFFLGtCQUFrQjtJQUN0QixPQUFPLEVBQUUsVUFBVSx3QkFBZTtJQUNsQyxPQUFPLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7Q0FDM0MsRUFDRCxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUN0QyxDQUFBO0FBQ0QseUNBQXlDLENBQ3hDO0lBQ0MsRUFBRSxFQUFFLGlCQUFpQjtJQUNyQixPQUFPLEVBQUUsVUFBVSx1QkFBYztJQUNqQyxPQUFPLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7Q0FDMUMsRUFDRCxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUN0QyxDQUFBO0FBQ0QseUNBQXlDLENBQ3hDLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sNEJBQW1CLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFDakcsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQ3JCLENBQUE7QUFDRCx5Q0FBeUMsQ0FDeEM7SUFDQyxFQUFFLEVBQUUscUJBQXFCO0lBQ3pCLE9BQU8sMEJBQWlCO0lBQ3hCLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztDQUM5QyxFQUNELEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFBO0FBRUQsNklBQTZJO0FBQzdJLDBIQUEwSDtBQUMxSCxpSUFBaUk7QUFDakksMklBQTJJO0FBRTNJLE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUN6QyxpREFBaUQsRUFDakQsbUpBQW1KLENBQ25KLENBQUE7QUFDRCxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FDekMscURBQXFELEVBQ3JELDJKQUEySixDQUMzSixDQUFBO0FBQ0QsSUFBSSxXQUFXLEVBQUUsQ0FBQztJQUNqQix5Q0FBeUMsQ0FBQztRQUN6QyxFQUFFLEVBQUUsaURBQWlEO1FBQ3JELE9BQU8sRUFBRSxzREFBa0M7UUFDM0MsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDeEUsUUFBUSxFQUFFLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFFO0tBQ3BELENBQUMsQ0FBQTtJQUNGLHlDQUF5QyxDQUN4QztRQUNDLEVBQUUsRUFBRSwwQkFBMEI7UUFDOUIsT0FBTyxFQUFFLGdEQUEyQiw2QkFBb0I7UUFDeEQsc0ZBQXNGO1FBQ3RGLHlDQUF5QztRQUN6QyxTQUFTLEVBQUUsQ0FBQyxvREFBK0IsNkJBQW9CLENBQUM7UUFDaEUsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDO0tBQ25ELEVBQ0QsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQ3JCLENBQUE7SUFFRCx5Q0FBeUMsQ0FBQztRQUN6QyxFQUFFLEVBQUUscURBQXFEO1FBQ3pELE9BQU8sRUFBRSxvREFBZ0M7UUFDekMsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQztRQUNoRixRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUseUJBQXlCLEVBQUU7S0FDcEQsQ0FBQyxDQUFBO0lBQ0YseUNBQXlDLENBQ3hDO1FBQ0MsRUFBRSxFQUFFLDhCQUE4QjtRQUNsQyxPQUFPLEVBQUUsZ0RBQTJCLDJCQUFrQjtRQUN0RCxzRkFBc0Y7UUFDdEYseUNBQXlDO1FBQ3pDLFNBQVMsRUFBRSxDQUFDLG9EQUErQiwyQkFBa0IsQ0FBQztRQUM5RCxPQUFPLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQztLQUN2RCxFQUNELEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFBO0FBQ0YsQ0FBQztLQUFNLENBQUM7SUFDUCx5Q0FBeUMsQ0FBQztRQUN6QyxFQUFFLEVBQUUsaURBQWlEO1FBQ3JELE9BQU8sRUFBRSxpREFBOEI7UUFDdkMsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDeEUsUUFBUSxFQUFFLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFFO0tBQ3BELENBQUMsQ0FBQTtJQUNGLHlDQUF5QyxDQUFDO1FBQ3pDLEVBQUUsRUFBRSwwQkFBMEI7UUFDOUIsT0FBTyxFQUFFLGdEQUEyQiw2QkFBb0I7UUFDeEQsT0FBTyxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDO0tBQ25ELENBQUMsQ0FBQTtJQUVGLHlDQUF5QyxDQUFDO1FBQ3pDLEVBQUUsRUFBRSxxREFBcUQ7UUFDekQsT0FBTyxFQUFFLCtDQUE0QjtRQUNyQyxPQUFPLEVBQUUsWUFBWSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsUUFBUSxDQUFDO1FBQ2hGLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSx5QkFBeUIsRUFBRTtLQUNwRCxDQUFDLENBQUE7SUFDRix5Q0FBeUMsQ0FBQztRQUN6QyxFQUFFLEVBQUUsOEJBQThCO1FBQ2xDLE9BQU8sRUFBRSxnREFBMkIsMkJBQWtCO1FBQ3RELE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDO0tBQ3ZELENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxZQUFZO0FBRVosZ0JBQWdCO0FBRWhCLHlDQUF5QyxDQUN4QztJQUNDLEVBQUUsRUFBRSwrQkFBK0I7SUFDbkMsNEdBQTRHO0lBQzVHLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QiwrQkFBK0IsQ0FBQyxJQUFJLEVBQ3BDLGNBQWMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLEVBQUUseUJBQXlCLENBQUMsQ0FDMUU7SUFDRCxPQUFPLDZCQUFvQjtJQUMzQixvSEFBb0g7SUFDcEgsdUpBQXVKO0lBQ3ZKLE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtJQUM5QyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUNyQixNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxpQkFBb0MsQ0FBQTtRQUM5RixnQkFBZ0IsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDL0IsQ0FBQztDQUNELEVBQ0QsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUN6RCxDQUFBO0FBRUQsc0JBQXNCO0FBRXRCLHlDQUF5QyxDQUFDO0lBQ3pDLEVBQUUsRUFBRSx3QkFBd0I7SUFDNUIsT0FBTyxFQUFFLFVBQVUseUJBQWdCO0lBQ25DLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3JCLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELGlCQUFpQixDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ2hDLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixZQUFZIn0=