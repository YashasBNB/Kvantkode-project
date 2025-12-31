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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLHNCQUFzQixDQUFBO0FBQzdCLE9BQU8sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixVQUFVLElBQUkscUJBQXFCLEdBR25DLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLG1CQUFtQixHQUVuQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFB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