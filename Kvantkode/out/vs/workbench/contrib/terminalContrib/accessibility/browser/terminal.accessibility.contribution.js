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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYWNjZXNzaWJpbGl0eS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvdGVybWluYWwuYWNjZXNzaWJpbGl0eS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBRU4sc0JBQXNCLEdBRXRCLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbEgsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxtRkFBbUYsQ0FBQTtBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLCtEQUErRCxDQUFBO0FBUXRFLE9B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