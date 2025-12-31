/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TextAreaSyncContribution_1, TerminalAccessibleViewContribution_1;
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { localize2 } from '../../../../../nls.js';
import { IAccessibleViewService, } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown, } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { AccessibilityHelpAction, AccessibleViewAction, } from '../../../accessibility/browser/accessibleViewActions.js';
import { ITerminalService, } from '../../../terminal/browser/terminal.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { BufferContentTracker } from './bufferContentTracker.js';
import { TerminalAccessibilityHelpProvider } from './terminalAccessibilityHelp.js';
import { TerminalAccessibleBufferProvider, } from './terminalAccessibleBufferProvider.js';
import { TextAreaSyncAddon } from './textAreaSyncAddon.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
// #region Terminal Contributions
let TextAreaSyncContribution = class TextAreaSyncContribution extends DisposableStore {
    static { TextAreaSyncContribution_1 = this; }
    static { this.ID = 'terminal.textAreaSync'; }
    static get(instance) {
        return instance.getContribution(TextAreaSyncContribution_1.ID);
    }
    constructor(_ctx, _instantiationService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
    }
    layout(xterm) {
        if (this._addon) {
            return;
        }
        this._addon = this.add(this._instantiationService.createInstance(TextAreaSyncAddon, this._ctx.instance.capabilities));
        xterm.raw.loadAddon(this._addon);
        this._addon.activate(xterm.raw);
    }
};
TextAreaSyncContribution = TextAreaSyncContribution_1 = __decorate([
    __param(1, IInstantiationService)
], TextAreaSyncContribution);
registerTerminalContribution(TextAreaSyncContribution.ID, TextAreaSyncContribution);
let TerminalAccessibleViewContribution = class TerminalAccessibleViewContribution extends Disposable {
    static { TerminalAccessibleViewContribution_1 = this; }
    static { this.ID = 'terminal.accessibleBufferProvider'; }
    static get(instance) {
        return instance.getContribution(TerminalAccessibleViewContribution_1.ID);
    }
    constructor(_ctx, _accessibilitySignalService, _accessibleViewService, _configurationService, _contextKeyService, _instantiationService, _terminalService) {
        super();
        this._ctx = _ctx;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._accessibleViewService = _accessibleViewService;
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._terminalService = _terminalService;
        this._onDidRunCommand = this._register(new MutableDisposable());
        this._register(AccessibleViewAction.addImplementation(90, 'terminal', () => {
            if (this._terminalService.activeInstance !== this._ctx.instance) {
                return false;
            }
            this.show();
            return true;
        }, TerminalContextKeys.focus));
        this._register(this._ctx.instance.onDidExecuteText(() => {
            const focusAfterRun = _configurationService.getValue("terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */);
            if (focusAfterRun === 'terminal') {
                this._ctx.instance.focus(true);
            }
            else if (focusAfterRun === 'accessible-buffer') {
                this.show();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */)) {
                this._updateCommandExecutedListener();
            }
        }));
        this._register(this._ctx.instance.capabilities.onDidAddCapability((e) => {
            if (e.capability.type === 2 /* TerminalCapability.CommandDetection */) {
                this._updateCommandExecutedListener();
            }
        }));
    }
    xtermReady(xterm) {
        const addon = this._instantiationService.createInstance(TextAreaSyncAddon, this._ctx.instance.capabilities);
        xterm.raw.loadAddon(addon);
        addon.activate(xterm.raw);
        this._xterm = xterm;
        this._register(this._xterm.raw.onWriteParsed(async () => {
            if (this._terminalService.activeInstance !== this._ctx.instance) {
                return;
            }
            if (this._isTerminalAccessibleViewOpen() && this._xterm.raw.buffer.active.baseY === 0) {
                this.show();
            }
        }));
        const onRequestUpdateEditor = Event.latch(this._xterm.raw.onScroll);
        this._register(onRequestUpdateEditor(() => {
            if (this._terminalService.activeInstance !== this._ctx.instance) {
                return;
            }
            if (this._isTerminalAccessibleViewOpen()) {
                this.show();
            }
        }));
    }
    _updateCommandExecutedListener() {
        if (!this._ctx.instance.capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            return;
        }
        if (!this._configurationService.getValue("terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */)) {
            this._onDidRunCommand.clear();
            return;
        }
        else if (this._onDidRunCommand.value) {
            return;
        }
        const capability = this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        this._onDidRunCommand.value = capability.onCommandExecuted(() => {
            if (this._ctx.instance.hasFocus) {
                this.show();
            }
        });
    }
    _isTerminalAccessibleViewOpen() {
        return (accessibleViewCurrentProviderId.getValue(this._contextKeyService) ===
            "terminal" /* AccessibleViewProviderId.Terminal */);
    }
    show() {
        if (!this._xterm) {
            return;
        }
        if (!this._bufferTracker) {
            this._bufferTracker = this._register(this._instantiationService.createInstance(BufferContentTracker, this._xterm));
        }
        if (!this._bufferProvider) {
            this._bufferProvider = this._register(this._instantiationService.createInstance(TerminalAccessibleBufferProvider, this._ctx.instance, this._bufferTracker, () => {
                return this._register(this._instantiationService.createInstance(TerminalAccessibilityHelpProvider, this._ctx.instance, this._xterm)).provideContent();
            }));
        }
        const position = this._configurationService.getValue("terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */)
            ? this._accessibleViewService.getPosition("terminal" /* AccessibleViewProviderId.Terminal */)
            : undefined;
        this._accessibleViewService.show(this._bufferProvider, position);
    }
    navigateToCommand(type) {
        const currentLine = this._accessibleViewService.getPosition("terminal" /* AccessibleViewProviderId.Terminal */)?.lineNumber;
        const commands = this._getCommandsWithEditorLine();
        if (!commands?.length || !currentLine) {
            return;
        }
        const filteredCommands = type === "previous" /* NavigationType.Previous */
            ? commands
                .filter((c) => c.lineNumber < currentLine)
                .sort((a, b) => b.lineNumber - a.lineNumber)
            : commands
                .filter((c) => c.lineNumber > currentLine)
                .sort((a, b) => a.lineNumber - b.lineNumber);
        if (!filteredCommands.length) {
            return;
        }
        const command = filteredCommands[0];
        const commandLine = command.command.command;
        if (!isWindows && commandLine) {
            this._accessibleViewService.setPosition(new Position(command.lineNumber, 1), true);
            alert(commandLine);
        }
        else {
            this._accessibleViewService.setPosition(new Position(command.lineNumber, 1), true, true);
        }
        if (command.exitCode) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalCommandFailed);
        }
        else {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalCommandSucceeded);
        }
    }
    _getCommandsWithEditorLine() {
        const capability = this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = capability?.commands;
        const currentCommand = capability?.currentCommand;
        if (!commands?.length) {
            return;
        }
        const result = [];
        for (const command of commands) {
            const lineNumber = this._getEditorLineForCommand(command);
            if (!lineNumber) {
                continue;
            }
            result.push({ command, lineNumber, exitCode: command.exitCode });
        }
        if (currentCommand) {
            const lineNumber = this._getEditorLineForCommand(currentCommand);
            if (!!lineNumber) {
                result.push({ command: currentCommand, lineNumber });
            }
        }
        return result;
    }
    _getEditorLineForCommand(command) {
        if (!this._bufferTracker) {
            return;
        }
        let line;
        if ('marker' in command) {
            line = command.marker?.line;
        }
        else if ('commandStartMarker' in command) {
            line = command.commandStartMarker?.line;
        }
        if (line === undefined || line < 0) {
            return;
        }
        line = this._bufferTracker.bufferToEditorLineMapping.get(line);
        if (line === undefined) {
            return;
        }
        return line + 1;
    }
};
TerminalAccessibleViewContribution = TerminalAccessibleViewContribution_1 = __decorate([
    __param(1, IAccessibilitySignalService),
    __param(2, IAccessibleViewService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IInstantiationService),
    __param(6, ITerminalService)
], TerminalAccessibleViewContribution);
export { TerminalAccessibleViewContribution };
registerTerminalContribution(TerminalAccessibleViewContribution.ID, TerminalAccessibleViewContribution);
export class TerminalAccessibilityHelpContribution extends Disposable {
    constructor() {
        super();
        this._register(AccessibilityHelpAction.addImplementation(105, 'terminal', async (accessor) => {
            const instantiationService = accessor.get(IInstantiationService);
            const terminalService = accessor.get(ITerminalService);
            const accessibleViewService = accessor.get(IAccessibleViewService);
            const instance = await terminalService.getActiveOrCreateInstance();
            await terminalService.revealActiveTerminal();
            const terminal = instance?.xterm;
            if (!terminal) {
                return;
            }
            accessibleViewService.show(instantiationService.createInstance(TerminalAccessibilityHelpProvider, instance, terminal));
        }, ContextKeyExpr.or(TerminalContextKeys.focus, ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */)))));
    }
}
registerTerminalContribution(TerminalAccessibilityHelpContribution.ID, TerminalAccessibilityHelpContribution);
// #endregion
// #region Actions
class FocusAccessibleBufferAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */,
            title: localize2('workbench.action.terminal.focusAccessibleBuffer', 'Focus Accessible Terminal View'),
            precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
            keybinding: [
                {
                    primary: 512 /* KeyMod.Alt */ | 60 /* KeyCode.F2 */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
                    linux: {
                        primary: 512 /* KeyMod.Alt */ | 60 /* KeyCode.F2 */ | 1024 /* KeyMod.Shift */,
                        secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
                    },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, TerminalContextKeys.focus),
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const terminalService = accessor.get(ITerminalService);
        const terminal = await terminalService.getActiveOrCreateInstance();
        if (!terminal?.xterm) {
            return;
        }
        TerminalAccessibleViewContribution.get(terminal)?.show();
    }
}
registerAction2(FocusAccessibleBufferAction);
registerTerminalAction({
    id: "workbench.action.terminal.accessibleBufferGoToNextCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToNextCommand */,
    title: localize2('workbench.action.terminal.accessibleBufferGoToNextCommand', 'Accessible Buffer Go to Next Command'),
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated, ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
    keybinding: [
        {
            primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
            when: ContextKeyExpr.and(ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2,
        },
    ],
    run: async (c) => {
        const instance = c.service.activeInstance;
        if (!instance) {
            return;
        }
        TerminalAccessibleViewContribution.get(instance)?.navigateToCommand("next" /* NavigationType.Next */);
    },
});
registerTerminalAction({
    id: "workbench.action.terminal.accessibleBufferGoToPreviousCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToPreviousCommand */,
    title: localize2('workbench.action.terminal.accessibleBufferGoToPreviousCommand', 'Accessible Buffer Go to Previous Command'),
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
    keybinding: [
        {
            primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
            when: ContextKeyExpr.and(ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2,
        },
    ],
    run: async (c) => {
        const instance = c.service.activeInstance;
        if (!instance) {
            return;
        }
        TerminalAccessibleViewContribution.get(instance)?.navigateToCommand("previous" /* NavigationType.Previous */);
    },
});
registerTerminalAction({
    id: "workbench.action.terminal.scrollToBottomAccessibleView" /* TerminalAccessibilityCommandId.ScrollToBottomAccessibleView */,
    title: localize2('workbench.action.terminal.scrollToBottomAccessibleView', 'Scroll to Accessible View Bottom'),
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
        linux: { primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */ },
        when: accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    run: (c, accessor) => {
        const accessibleViewService = accessor.get(IAccessibleViewService);
        const lastPosition = accessibleViewService.getLastPosition();
        if (!lastPosition) {
            return;
        }
        accessibleViewService.setPosition(lastPosition, true);
    },
});
registerTerminalAction({
    id: "workbench.action.terminal.scrollToTopAccessibleView" /* TerminalAccessibilityCommandId.ScrollToTopAccessibleView */,
    title: localize2('workbench.action.terminal.scrollToTopAccessibleView', 'Scroll to Accessible View Top'),
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
        linux: { primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */ },
        when: accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    run: (c, accessor) => accessor.get(IAccessibleViewService)?.setPosition(new Position(1, 1), true),
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYWNjZXNzaWJpbGl0eS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL3Rlcm1pbmFsLmFjY2Vzc2liaWxpdHkuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUVOLHNCQUFzQixHQUV0QixNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2xILE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sbUZBQW1GLENBQUE7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQVF0RSxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLHFC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