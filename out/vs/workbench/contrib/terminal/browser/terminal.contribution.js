/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getFontSnippets } from '../../../../base/browser/fonts.js';
import { Schemas } from '../../../../base/common/network.js';
import { isIOS, isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import './media/terminal.css';
import './media/terminalVoice.css';
import './media/widgets.css';
import './media/xterm.css';
import * as nls from '../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions as DragAndDropExtensions, } from '../../../../platform/dnd/browser/dnd.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITerminalLogService, } from '../../../../platform/terminal/common/terminal.js';
import { TerminalLogService } from '../../../../platform/terminal/common/terminalLogService.js';
import { registerTerminalPlatformConfiguration } from '../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { Extensions as ViewContainerExtensions, } from '../../../common/views.js';
import { RemoteTerminalBackendContribution } from './remoteTerminalBackend.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, ITerminalService, terminalEditorId, } from './terminal.js';
import { registerTerminalActions } from './terminalActions.js';
import { setupTerminalCommands } from './terminalCommands.js';
import { TerminalConfigurationService } from './terminalConfigurationService.js';
import { TerminalEditor } from './terminalEditor.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { TerminalInputSerializer } from './terminalEditorSerializer.js';
import { TerminalEditorService } from './terminalEditorService.js';
import { TerminalGroupService } from './terminalGroupService.js';
import { terminalViewIcon } from './terminalIcons.js';
import { TerminalInstanceService } from './terminalInstanceService.js';
import { TerminalMainContribution } from './terminalMainContribution.js';
import { setupTerminalMenus } from './terminalMenus.js';
import { TerminalProfileService } from './terminalProfileService.js';
import { TerminalService } from './terminalService.js';
import { TerminalViewPane } from './terminalView.js';
import { ITerminalProfileService, TERMINAL_VIEW_ID } from '../common/terminal.js';
import { registerColors } from '../common/terminalColorRegistry.js';
import { registerTerminalConfiguration } from '../common/terminalConfiguration.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { registerSendSequenceKeybinding } from './terminalKeybindings.js';
import { TerminalTelemetryContribution } from './terminalTelemetry.js';
// Register services
registerSingleton(ITerminalLogService, TerminalLogService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITerminalConfigurationService, TerminalConfigurationService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITerminalService, TerminalService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITerminalEditorService, TerminalEditorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITerminalGroupService, TerminalGroupService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITerminalInstanceService, TerminalInstanceService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITerminalProfileService, TerminalProfileService, 1 /* InstantiationType.Delayed */);
// Register workbench contributions
// This contribution blocks startup as it's critical to enable the web embedder window.createTerminal API
registerWorkbenchContribution2(TerminalMainContribution.ID, TerminalMainContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(RemoteTerminalBackendContribution.ID, RemoteTerminalBackendContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(TerminalTelemetryContribution.ID, TerminalTelemetryContribution, 3 /* WorkbenchPhase.AfterRestored */);
// Register configurations
registerTerminalPlatformConfiguration();
registerTerminalConfiguration(getFontSnippets);
// Register editor/dnd contributions
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(TerminalEditorInput.ID, TerminalInputSerializer);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TerminalEditor, terminalEditorId, terminalStrings.terminal), [new SyncDescriptor(TerminalEditorInput)]);
Registry.as(DragAndDropExtensions.DragAndDropContribution).register({
    dataFormatKey: "Terminals" /* TerminalDataTransfers.Terminals */,
    getEditorInputs(data) {
        const editors = [];
        try {
            const terminalEditors = JSON.parse(data);
            for (const terminalEditor of terminalEditors) {
                editors.push({ resource: URI.parse(terminalEditor) });
            }
        }
        catch (error) {
            // Invalid transfer
        }
        return editors;
    },
    setData(resources, event) {
        const terminalResources = resources.filter(({ resource }) => resource.scheme === Schemas.vscodeTerminal);
        if (terminalResources.length) {
            event.dataTransfer?.setData("Terminals" /* TerminalDataTransfers.Terminals */, JSON.stringify(terminalResources.map(({ resource }) => resource.toString())));
        }
    },
});
// Register views
const VIEW_CONTAINER = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: TERMINAL_VIEW_ID,
    title: nls.localize2('terminal', 'Terminal'),
    icon: terminalViewIcon,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
        TERMINAL_VIEW_ID,
        { mergeViewWithContainerWhenSingleView: true },
    ]),
    storageId: TERMINAL_VIEW_ID,
    hideIfEmpty: true,
    order: 3,
}, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true, isDefault: true });
Registry.as(ViewContainerExtensions.ViewsRegistry).registerViews([
    {
        id: TERMINAL_VIEW_ID,
        name: nls.localize2('terminal', 'Terminal'),
        containerIcon: terminalViewIcon,
        canToggleVisibility: true,
        canMoveView: true,
        ctorDescriptor: new SyncDescriptor(TerminalViewPane),
        openCommandActionDescriptor: {
            id: "workbench.action.terminal.toggleTerminal" /* TerminalCommandId.Toggle */,
            mnemonicTitle: nls.localize({ key: 'miToggleIntegratedTerminal', comment: ['&& denotes a mnemonic'] }, '&&Terminal'),
            keybindings: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 91 /* KeyCode.Backquote */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 91 /* KeyCode.Backquote */ },
            },
            order: 3,
        },
    },
], VIEW_CONTAINER);
// Register actions
registerTerminalActions();
var Constants;
(function (Constants) {
    /** The text representation of `^<letter>` is `'A'.charCodeAt(0) + 1`. */
    Constants[Constants["CtrlLetterOffset"] = 64] = "CtrlLetterOffset";
})(Constants || (Constants = {}));
// An extra Windows-only ctrl+v keybinding is used for pwsh that sends ctrl+v directly to the
// shell, this gets handled by PSReadLine which properly handles multi-line pastes. This is
// disabled in accessibility mode as PowerShell does not run PSReadLine when it detects a screen
// reader. This works even when clipboard.readText is not supported.
if (isWindows) {
    registerSendSequenceKeybinding(String.fromCharCode('V'.charCodeAt(0) - 64 /* Constants.CtrlLetterOffset */), {
        // ctrl+v
        when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
        primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
    });
}
// Map certain keybindings in pwsh to unused keys which get handled by PSReadLine handlers in the
// shell integration script. This allows keystrokes that cannot be sent via VT sequences to work.
// See https://github.com/microsoft/terminal/issues/879#issuecomment-497775007
registerSendSequenceKeybinding('\x1b[24~a', {
    // F12,a -> ctrl+space (MenuComplete)
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), TerminalContextKeys.terminalShellIntegrationEnabled, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */ },
});
registerSendSequenceKeybinding('\x1b[24~b', {
    // F12,b -> alt+space (SetMark)
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), TerminalContextKeys.terminalShellIntegrationEnabled, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
    primary: 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */,
});
registerSendSequenceKeybinding('\x1b[24~c', {
    // F12,c -> shift+enter (AddLine)
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), TerminalContextKeys.terminalShellIntegrationEnabled, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
});
registerSendSequenceKeybinding('\x1b[24~d', {
    // F12,d -> shift+end (SelectLine) - HACK: \x1b[1;2F is supposed to work but it doesn't
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), TerminalContextKeys.terminalShellIntegrationEnabled, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
    mac: { primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */ },
});
// Always on pwsh keybindings
registerSendSequenceKeybinding('\x1b[1;2H', {
    // Shift+home
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */)),
    mac: { primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */ },
});
// Map ctrl+alt+r -> ctrl+r when in accessibility mode due to default run recent command keybinding
registerSendSequenceKeybinding('\x12', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */ },
});
// Map ctrl+alt+g -> ctrl+g due to default go to recent directory keybinding
registerSendSequenceKeybinding('\x07', {
    when: TerminalContextKeys.focus,
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 37 /* KeyCode.KeyG */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 37 /* KeyCode.KeyG */ },
});
// send ctrl+c to the iPad when the terminal is focused and ctrl+c is pressed to kill the process (work around for #114009)
if (isIOS) {
    registerSendSequenceKeybinding(String.fromCharCode('C'.charCodeAt(0) - 64 /* Constants.CtrlLetterOffset */), {
        // ctrl+c
        when: ContextKeyExpr.and(TerminalContextKeys.focus),
        primary: 256 /* KeyMod.WinCtrl */ | 33 /* KeyCode.KeyC */,
    });
}
// Delete word left: ctrl+w
registerSendSequenceKeybinding(String.fromCharCode('W'.charCodeAt(0) - 64 /* Constants.CtrlLetterOffset */), {
    primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
    mac: { primary: 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
});
if (isWindows) {
    // Delete word left: ctrl+h
    // Windows cmd.exe requires ^H to delete full word left
    registerSendSequenceKeybinding(String.fromCharCode('H'.charCodeAt(0) - 64 /* Constants.CtrlLetterOffset */), {
        when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "cmd" /* WindowsShellType.CommandPrompt */)),
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
    });
}
// Delete word right: alt+d [27, 100]
registerSendSequenceKeybinding('\u001bd', {
    primary: 2048 /* KeyMod.CtrlCmd */ | 20 /* KeyCode.Delete */,
    mac: { primary: 512 /* KeyMod.Alt */ | 20 /* KeyCode.Delete */ },
});
// Delete to line start: ctrl+u
registerSendSequenceKeybinding('\u0015', {
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ },
});
// Move to line start: ctrl+A
registerSendSequenceKeybinding(String.fromCharCode('A'.charCodeAt(0) - 64), {
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */ },
});
// Move to line end: ctrl+E
registerSendSequenceKeybinding(String.fromCharCode('E'.charCodeAt(0) - 64), {
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */ },
});
// NUL: ctrl+shift+2
registerSendSequenceKeybinding('\u0000', {
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 23 /* KeyCode.Digit2 */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 23 /* KeyCode.Digit2 */ },
});
// RS: ctrl+shift+6
registerSendSequenceKeybinding('\u001e', {
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 27 /* KeyCode.Digit6 */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 27 /* KeyCode.Digit6 */ },
});
// US (Undo): ctrl+/
registerSendSequenceKeybinding('\u001f', {
    primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 90 /* KeyCode.Slash */ },
});
setupTerminalCommands();
setupTerminalMenus();
registerColors();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sc0JBQXNCLENBQUE7QUFDN0IsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLFVBQVUsSUFBSSxxQkFBcUIsR0FHbkMsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sbUJBQW1CLEdBRW5CLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGtCQUFr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