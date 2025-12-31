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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2libGVWaWV3QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUVOLFlBQVksR0FFWixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHckYsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixnQ0FBZ0MsRUFDaEMsK0JBQStCLEVBQy9CLGlDQUFpQyxFQUNqQyxvQ0FBb0MsRUFDcEMsc0NBQXNDLEVBQ3RDLHFCQUFxQixFQUNyQixnQ0FBZ0MsRUFDaEMsOEJBQThCLEdBQzlCLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdHQUFnRyxDQUFBO0FBRTVJLE1BQU0sa0JBQWtCLEdBQUc7SUFDMUIsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO0lBQ3pCLEtBQUssRUFBRSxZQUFZO0lBQ25CLElBQUksRUFBRSxxQkFBcUI7Q0FDM0IsQ0FBQTtBQUNELE1BQU0sY0FBYyxHQUFHO0lBQ3RCLEVBQUUsRUFBRSxNQUFNLENB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