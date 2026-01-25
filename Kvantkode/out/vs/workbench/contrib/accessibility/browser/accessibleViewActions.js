/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { MultiCommand, } from '../../../../editor/browser/editorExtensions.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { accessibilityHelpIsShown, accessibleViewContainsCodeBlocks, accessibleViewCurrentProviderId, accessibleViewGoToSymbolSupported, accessibleViewHasAssignedKeybindings, accessibleViewHasUnassignedKeybindings, accessibleViewIsShown, accessibleViewSupportsNavigation, accessibleViewVerbosityEnabled, } from './accessibilityConfiguration.js';
import { IAccessibleViewService, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
const accessibleViewMenu = {
    id: MenuId.AccessibleView,
    group: 'navigation',
    when: accessibleViewIsShown,
};
const commandPalette = {
    id: MenuId.CommandPalette,
    group: '',
    order: 1,
};
class AccessibleViewNextAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewNext" /* AccessibilityCommandId.ShowNext */,
            precondition: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewSupportsNavigation),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                commandPalette,
                {
                    ...accessibleViewMenu,
                    when: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewSupportsNavigation),
                },
            ],
            icon: Codicon.arrowDown,
            title: localize('editor.action.accessibleViewNext', 'Show Next in Accessible View'),
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).next();
    }
}
registerAction2(AccessibleViewNextAction);
class AccessibleViewNextCodeBlockAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewNextCodeBlock" /* AccessibilityCommandId.NextCodeBlock */,
            precondition: ContextKeyExpr.and(accessibleViewContainsCodeBlocks, ContextKeyExpr.or(ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "panelChat" /* AccessibleViewProviderId.PanelChat */), ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "inlineChat" /* AccessibleViewProviderId.InlineChat */), ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "quickChat" /* AccessibleViewProviderId.QuickChat */))),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: Codicon.arrowRight,
            menu: {
                ...accessibleViewMenu,
                when: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewContainsCodeBlocks),
            },
            title: localize('editor.action.accessibleViewNextCodeBlock', 'Accessible View: Next Code Block'),
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).navigateToCodeBlock('next');
    }
}
registerAction2(AccessibleViewNextCodeBlockAction);
class AccessibleViewPreviousCodeBlockAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewPreviousCodeBlock" /* AccessibilityCommandId.PreviousCodeBlock */,
            precondition: ContextKeyExpr.and(accessibleViewContainsCodeBlocks, ContextKeyExpr.or(ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "panelChat" /* AccessibleViewProviderId.PanelChat */), ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "inlineChat" /* AccessibleViewProviderId.InlineChat */), ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "quickChat" /* AccessibleViewProviderId.QuickChat */))),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: Codicon.arrowLeft,
            menu: {
                ...accessibleViewMenu,
                when: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewContainsCodeBlocks),
            },
            title: localize('editor.action.accessibleViewPreviousCodeBlock', 'Accessible View: Previous Code Block'),
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).navigateToCodeBlock('previous');
    }
}
registerAction2(AccessibleViewPreviousCodeBlockAction);
class AccessibleViewPreviousAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewPrevious" /* AccessibilityCommandId.ShowPrevious */,
            precondition: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewSupportsNavigation),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: Codicon.arrowUp,
            menu: [
                commandPalette,
                {
                    ...accessibleViewMenu,
                    when: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewSupportsNavigation),
                },
            ],
            title: localize('editor.action.accessibleViewPrevious', 'Show Previous in Accessible View'),
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).previous();
    }
}
registerAction2(AccessibleViewPreviousAction);
class AccessibleViewGoToSymbolAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewGoToSymbol" /* AccessibilityCommandId.GoToSymbol */,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(accessibleViewIsShown, accessibilityHelpIsShown), accessibleViewGoToSymbolSupported),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */],
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
            },
            icon: Codicon.symbolMisc,
            menu: [
                commandPalette,
                {
                    ...accessibleViewMenu,
                    when: ContextKeyExpr.and(ContextKeyExpr.or(accessibleViewIsShown, accessibilityHelpIsShown), accessibleViewGoToSymbolSupported),
                },
            ],
            title: localize('editor.action.accessibleViewGoToSymbol', 'Go To Symbol in Accessible View'),
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).goToSymbol();
    }
}
registerAction2(AccessibleViewGoToSymbolAction);
function registerCommand(command) {
    command.register();
    return command;
}
export const AccessibilityHelpAction = registerCommand(new MultiCommand({
    id: "editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */,
    precondition: undefined,
    kbOpts: {
        primary: 512 /* KeyMod.Alt */ | 59 /* KeyCode.F1 */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        linux: {
            primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 59 /* KeyCode.F1 */,
            secondary: [512 /* KeyMod.Alt */ | 59 /* KeyCode.F1 */],
        },
        kbExpr: accessibilityHelpIsShown.toNegated(),
    },
    menuOpts: [
        {
            menuId: MenuId.CommandPalette,
            group: '',
            title: localize('editor.action.accessibilityHelp', 'Open Accessibility Help'),
            order: 1,
        },
    ],
}));
export const AccessibleViewAction = registerCommand(new MultiCommand({
    id: "editor.action.accessibleView" /* AccessibilityCommandId.OpenAccessibleView */,
    precondition: undefined,
    kbOpts: {
        primary: 512 /* KeyMod.Alt */ | 60 /* KeyCode.F2 */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        linux: {
            primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 60 /* KeyCode.F2 */,
            secondary: [512 /* KeyMod.Alt */ | 60 /* KeyCode.F2 */],
        },
    },
    menuOpts: [
        {
            menuId: MenuId.CommandPalette,
            group: '',
            title: localize('editor.action.accessibleView', 'Open Accessible View'),
            order: 1,
        },
    ],
}));
class AccessibleViewDisableHintAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewDisableHint" /* AccessibilityCommandId.DisableVerbosityHint */,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(accessibleViewIsShown, accessibilityHelpIsShown), accessibleViewVerbosityEnabled),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 64 /* KeyCode.F6 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: Codicon.bellSlash,
            menu: [
                commandPalette,
                {
                    id: MenuId.AccessibleView,
                    group: 'navigation',
                    when: ContextKeyExpr.and(ContextKeyExpr.or(accessibleViewIsShown, accessibilityHelpIsShown), accessibleViewVerbosityEnabled),
                },
            ],
            title: localize('editor.action.accessibleViewDisableHint', 'Disable Accessible View Hint'),
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).disableHint();
    }
}
registerAction2(AccessibleViewDisableHintAction);
class AccessibilityHelpConfigureKeybindingsAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibilityHelpConfigureKeybindings" /* AccessibilityCommandId.AccessibilityHelpConfigureKeybindings */,
            precondition: ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewHasUnassignedKeybindings),
            icon: Codicon.recordKeys,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 41 /* KeyCode.KeyK */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                {
                    id: MenuId.AccessibleView,
                    group: 'navigation',
                    order: 3,
                    when: accessibleViewHasUnassignedKeybindings,
                },
            ],
            title: localize('editor.action.accessibilityHelpConfigureUnassignedKeybindings', 'Accessibility Help Configure Unassigned Keybindings'),
        });
    }
    async run(accessor) {
        await accessor.get(IAccessibleViewService).configureKeybindings(true);
    }
}
registerAction2(AccessibilityHelpConfigureKeybindingsAction);
class AccessibilityHelpConfigureAssignedKeybindingsAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibilityHelpConfigureAssignedKeybindings" /* AccessibilityCommandId.AccessibilityHelpConfigureAssignedKeybindings */,
            precondition: ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewHasAssignedKeybindings),
            icon: Codicon.recordKeys,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                {
                    id: MenuId.AccessibleView,
                    group: 'navigation',
                    order: 4,
                    when: accessibleViewHasAssignedKeybindings,
                },
            ],
            title: localize('editor.action.accessibilityHelpConfigureAssignedKeybindings', 'Accessibility Help Configure Assigned Keybindings'),
        });
    }
    async run(accessor) {
        await accessor.get(IAccessibleViewService).configureKeybindings(false);
    }
}
registerAction2(AccessibilityHelpConfigureAssignedKeybindingsAction);
class AccessibilityHelpOpenHelpLinkAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibilityHelpOpenHelpLink" /* AccessibilityCommandId.AccessibilityHelpOpenHelpLink */,
            precondition: ContextKeyExpr.and(accessibilityHelpIsShown),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 38 /* KeyCode.KeyH */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            title: localize('editor.action.accessibilityHelpOpenHelpLink', 'Accessibility Help Open Help Link'),
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).openHelpLink();
    }
}
registerAction2(AccessibilityHelpOpenHelpLinkAction);
class AccessibleViewAcceptInlineCompletionAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewAcceptInlineCompletion" /* AccessibilityCommandId.AccessibleViewAcceptInlineCompletion */,
            precondition: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "inlineCompletions" /* AccessibleViewProviderId.InlineCompletions */)),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 90 /* KeyCode.Slash */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: Codicon.check,
            menu: [
                commandPalette,
                {
                    id: MenuId.AccessibleView,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "inlineCompletions" /* AccessibleViewProviderId.InlineCompletions */)),
                },
            ],
            title: localize('editor.action.accessibleViewAcceptInlineCompletionAction', 'Accept Inline Completion'),
        });
    }
    async run(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!editor) {
            return;
        }
        const model = InlineCompletionsController.get(editor)?.model.get();
        const state = model?.state.get();
        if (!model || !state) {
            return;
        }
        await model.accept(editor);
        model.stop();
        editor.focus();
    }
}
registerAction2(AccessibleViewAcceptInlineCompletionAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJsZVZpZXdBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBRU4sWUFBWSxHQUVaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUdyRixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGdDQUFnQyxFQUNoQywrQkFBK0IsRUFDL0IsaUNBQWlDLEVBQ2pDLG9DQUFvQyxFQUNwQyxzQ0FBc0MsRUFDdEMscUJBQXFCLEVBQ3JCLGdDQUFnQyxFQUNoQyw4QkFBOEIsR0FDOUIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0dBQWdHLENBQUE7QUFFNUksTUFBTSxrQkFBa0IsR0FBRztJQUMxQixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7SUFDekIsS0FBSyxFQUFFLFlBQVk7SUFDbkIsSUFBSSxFQUFFLHFCQUFxQjtDQUMzQixDQUFBO0FBQ0QsTUFBTSxjQUFjLEdBQUc7SUFDdEIsRUFBRSxFQUFFLE1B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