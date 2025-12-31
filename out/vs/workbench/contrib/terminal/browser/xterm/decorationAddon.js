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
import * as dom from '../../../../../base/browser/dom.js';
import { Separator } from '../../../../../base/common/actions.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, dispose, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { INotificationService, Severity, } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { terminalDecorationError, terminalDecorationIncomplete, terminalDecorationMark, terminalDecorationSuccess, } from '../terminalIcons.js';
import { getTerminalDecorationHoverContent, updateLayout, } from './decorationStyles.js';
import { TERMINAL_COMMAND_DECORATION_DEFAULT_BACKGROUND_COLOR, TERMINAL_COMMAND_DECORATION_ERROR_BACKGROUND_COLOR, TERMINAL_COMMAND_DECORATION_SUCCESS_BACKGROUND_COLOR, } from '../../common/terminalColorRegistry.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
let DecorationAddon = class DecorationAddon extends Disposable {
    constructor(_capabilities, _clipboardService, _contextMenuService, _configurationService, _themeService, _openerService, _quickInputService, lifecycleService, _commandService, _accessibilitySignalService, _notificationService, _hoverService) {
        super();
        this._capabilities = _capabilities;
        this._clipboardService = _clipboardService;
        this._contextMenuService = _contextMenuService;
        this._configurationService = _configurationService;
        this._themeService = _themeService;
        this._openerService = _openerService;
        this._quickInputService = _quickInputService;
        this._commandService = _commandService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._notificationService = _notificationService;
        this._hoverService = _hoverService;
        this._capabilityDisposables = this._register(new DisposableMap());
        this._decorations = new Map();
        this._registeredMenuItems = new Map();
        this._onDidRequestRunCommand = this._register(new Emitter());
        this.onDidRequestRunCommand = this._onDidRequestRunCommand.event;
        this._onDidRequestCopyAsHtml = this._register(new Emitter());
        this.onDidRequestCopyAsHtml = this._onDidRequestCopyAsHtml.event;
        this._register(toDisposable(() => this._dispose()));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */) ||
                e.affectsConfiguration("terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */)) {
                this.refreshLayouts();
            }
            else if (e.affectsConfiguration('workbench.colorCustomizations')) {
                this._refreshStyles(true);
            }
            else if (e.affectsConfiguration("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */)) {
                this._removeCapabilityDisposables(2 /* TerminalCapability.CommandDetection */);
                this._updateDecorationVisibility();
            }
        }));
        this._register(this._themeService.onDidColorThemeChange(() => this._refreshStyles(true)));
        this._updateDecorationVisibility();
        this._register(this._capabilities.onDidAddCapabilityType((c) => this._createCapabilityDisposables(c)));
        this._register(this._capabilities.onDidRemoveCapabilityType((c) => this._removeCapabilityDisposables(c)));
        this._register(lifecycleService.onWillShutdown(() => this._disposeAllDecorations()));
    }
    _createCapabilityDisposables(c) {
        const store = new DisposableStore();
        const capability = this._capabilities.get(c);
        if (!capability || this._capabilityDisposables.has(c)) {
            return;
        }
        switch (capability.type) {
            case 4 /* TerminalCapability.BufferMarkDetection */:
                store.add(capability.onMarkAdded((mark) => this.registerMarkDecoration(mark)));
                break;
            case 2 /* TerminalCapability.CommandDetection */: {
                const disposables = this._getCommandDetectionListeners(capability);
                for (const d of disposables) {
                    store.add(d);
                }
                break;
            }
        }
        this._capabilityDisposables.set(c, store);
    }
    _removeCapabilityDisposables(c) {
        this._capabilityDisposables.deleteAndDispose(c);
    }
    registerMarkDecoration(mark) {
        if (!this._terminal || (!this._showGutterDecorations && !this._showOverviewRulerDecorations)) {
            return undefined;
        }
        if (mark.hidden) {
            return undefined;
        }
        return this.registerCommandDecoration(undefined, undefined, mark);
    }
    _updateDecorationVisibility() {
        const showDecorations = this._configurationService.getValue("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */);
        this._showGutterDecorations = showDecorations === 'both' || showDecorations === 'gutter';
        this._showOverviewRulerDecorations =
            showDecorations === 'both' || showDecorations === 'overviewRuler';
        this._disposeAllDecorations();
        if (this._showGutterDecorations || this._showOverviewRulerDecorations) {
            this._attachToCommandCapability();
            this._updateGutterDecorationVisibility();
        }
        const currentCommand = this._capabilities.get(2 /* TerminalCapability.CommandDetection */)?.executingCommandObject;
        if (currentCommand) {
            this.registerCommandDecoration(currentCommand, true);
        }
    }
    _disposeAllDecorations() {
        this._placeholderDecoration?.dispose();
        for (const value of this._decorations.values()) {
            value.decoration.dispose();
            dispose(value.disposables);
        }
    }
    _updateGutterDecorationVisibility() {
        const commandDecorationElements = this._terminal?.element?.querySelectorAll("terminal-command-decoration" /* DecorationSelector.CommandDecoration */);
        if (commandDecorationElements) {
            for (const commandDecorationElement of commandDecorationElements) {
                this._updateCommandDecorationVisibility(commandDecorationElement);
            }
        }
    }
    _updateCommandDecorationVisibility(commandDecorationElement) {
        if (this._showGutterDecorations) {
            commandDecorationElement.classList.remove("hide" /* DecorationSelector.Hide */);
        }
        else {
            commandDecorationElement.classList.add("hide" /* DecorationSelector.Hide */);
        }
    }
    refreshLayouts() {
        updateLayout(this._configurationService, this._placeholderDecoration?.element);
        for (const decoration of this._decorations) {
            updateLayout(this._configurationService, decoration[1].decoration.element);
        }
    }
    _refreshStyles(refreshOverviewRulerColors) {
        if (refreshOverviewRulerColors) {
            for (const decoration of this._decorations.values()) {
                const color = this._getDecorationCssColor(decoration)?.toString() ?? '';
                if (decoration.decoration.options?.overviewRulerOptions) {
                    decoration.decoration.options.overviewRulerOptions.color = color;
                }
                else if (decoration.decoration.options) {
                    decoration.decoration.options.overviewRulerOptions = { color };
                }
            }
        }
        this._updateClasses(this._placeholderDecoration?.element);
        for (const decoration of this._decorations.values()) {
            this._updateClasses(decoration.decoration.element, decoration.exitCode, decoration.markProperties);
        }
    }
    _dispose() {
        for (const disposable of this._capabilityDisposables.values()) {
            dispose(disposable);
        }
        this.clearDecorations();
    }
    _clearPlaceholder() {
        this._placeholderDecoration?.dispose();
        this._placeholderDecoration = undefined;
    }
    clearDecorations() {
        this._placeholderDecoration?.marker.dispose();
        this._clearPlaceholder();
        this._disposeAllDecorations();
        this._decorations.clear();
    }
    _attachToCommandCapability() {
        if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            const capability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
            const disposables = this._getCommandDetectionListeners(capability);
            const store = new DisposableStore();
            for (const d of disposables) {
                store.add(d);
            }
            this._capabilityDisposables.set(2 /* TerminalCapability.CommandDetection */, store);
        }
    }
    _getCommandDetectionListeners(capability) {
        this._removeCapabilityDisposables(2 /* TerminalCapability.CommandDetection */);
        const commandDetectionListeners = [];
        // Command started
        if (capability.executingCommandObject?.marker) {
            this.registerCommandDecoration(capability.executingCommandObject, true);
        }
        commandDetectionListeners.push(capability.onCommandStarted((command) => this.registerCommandDecoration(command, true)));
        // Command finished
        for (const command of capability.commands) {
            this.registerCommandDecoration(command);
        }
        commandDetectionListeners.push(capability.onCommandFinished((command) => {
            this.registerCommandDecoration(command);
            if (command.exitCode) {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalCommandFailed);
            }
            else {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalCommandSucceeded);
            }
        }));
        // Command invalidated
        commandDetectionListeners.push(capability.onCommandInvalidated((commands) => {
            for (const command of commands) {
                const id = command.marker?.id;
                if (id) {
                    const match = this._decorations.get(id);
                    if (match) {
                        match.decoration.dispose();
                        dispose(match.disposables);
                    }
                }
            }
        }));
        // Current command invalidated
        commandDetectionListeners.push(capability.onCurrentCommandInvalidated((request) => {
            if (request.reason === "noProblemsReported" /* CommandInvalidationReason.NoProblemsReported */) {
                const lastDecoration = Array.from(this._decorations.entries())[this._decorations.size - 1];
                lastDecoration?.[1].decoration.dispose();
            }
            else if (request.reason === "windows" /* CommandInvalidationReason.Windows */) {
                this._clearPlaceholder();
            }
        }));
        return commandDetectionListeners;
    }
    activate(terminal) {
        this._terminal = terminal;
        this._attachToCommandCapability();
    }
    registerCommandDecoration(command, beforeCommandExecution, markProperties) {
        if (!this._terminal ||
            (beforeCommandExecution && !command) ||
            (!this._showGutterDecorations && !this._showOverviewRulerDecorations)) {
            return undefined;
        }
        const marker = command?.marker || markProperties?.marker;
        if (!marker) {
            throw new Error(`cannot add a decoration for a command ${JSON.stringify(command)} with no marker`);
        }
        this._clearPlaceholder();
        const color = this._getDecorationCssColor(command)?.toString() ?? '';
        const decoration = this._terminal.registerDecoration({
            marker,
            overviewRulerOptions: this._showOverviewRulerDecorations
                ? beforeCommandExecution
                    ? { color, position: 'left' }
                    : { color, position: command?.exitCode ? 'right' : 'left' }
                : undefined,
        });
        if (!decoration) {
            return undefined;
        }
        if (beforeCommandExecution) {
            this._placeholderDecoration = decoration;
        }
        decoration.onRender((element) => {
            if (element.classList.contains(".xterm-decoration-overview-ruler" /* DecorationSelector.OverviewRuler */)) {
                return;
            }
            if (!this._decorations.get(decoration.marker.id)) {
                decoration.onDispose(() => this._decorations.delete(decoration.marker.id));
                this._decorations.set(decoration.marker.id, {
                    decoration,
                    disposables: this._createDisposables(element, command, markProperties),
                    exitCode: command?.exitCode,
                    markProperties: command?.markProperties,
                });
            }
            if (!element.classList.contains("codicon" /* DecorationSelector.Codicon */) || command?.marker?.line === 0) {
                // first render or buffer was cleared
                updateLayout(this._configurationService, element);
                this._updateClasses(element, command?.exitCode, command?.markProperties || markProperties);
            }
        });
        return decoration;
    }
    registerMenuItems(command, items) {
        const existingItems = this._registeredMenuItems.get(command);
        if (existingItems) {
            existingItems.push(...items);
        }
        else {
            this._registeredMenuItems.set(command, [...items]);
        }
        return toDisposable(() => {
            const commandItems = this._registeredMenuItems.get(command);
            if (commandItems) {
                for (const item of items.values()) {
                    const index = commandItems.indexOf(item);
                    if (index !== -1) {
                        commandItems.splice(index, 1);
                    }
                }
            }
        });
    }
    _createDisposables(element, command, markProperties) {
        if (command?.exitCode === undefined && !command?.markProperties) {
            return [];
        }
        else if (command?.markProperties || markProperties) {
            return [this._createHover(element, command || markProperties, markProperties?.hoverMessage)];
        }
        return [...this._createContextMenu(element, command), this._createHover(element, command)];
    }
    _createHover(element, command, hoverMessage) {
        return this._hoverService.setupDelayedHover(element, () => ({
            content: new MarkdownString(getTerminalDecorationHoverContent(command, hoverMessage)),
        }));
    }
    _updateClasses(element, exitCode, markProperties) {
        if (!element) {
            return;
        }
        for (const classes of element.classList) {
            element.classList.remove(classes);
        }
        element.classList.add("terminal-command-decoration" /* DecorationSelector.CommandDecoration */, "codicon" /* DecorationSelector.Codicon */, "xterm-decoration" /* DecorationSelector.XtermDecoration */);
        if (markProperties) {
            element.classList.add("default-color" /* DecorationSelector.DefaultColor */, ...ThemeIcon.asClassNameArray(terminalDecorationMark));
            if (!markProperties.hoverMessage) {
                //disable the mouse pointer
                element.classList.add("default" /* DecorationSelector.Default */);
            }
        }
        else {
            // command decoration
            this._updateCommandDecorationVisibility(element);
            if (exitCode === undefined) {
                element.classList.add("default-color" /* DecorationSelector.DefaultColor */, "default" /* DecorationSelector.Default */);
                element.classList.add(...ThemeIcon.asClassNameArray(terminalDecorationIncomplete));
            }
            else if (exitCode) {
                element.classList.add("error" /* DecorationSelector.ErrorColor */);
                element.classList.add(...ThemeIcon.asClassNameArray(terminalDecorationError));
            }
            else {
                element.classList.add(...ThemeIcon.asClassNameArray(terminalDecorationSuccess));
            }
        }
    }
    _createContextMenu(element, command) {
        // When the xterm Decoration gets disposed of, its element gets removed from the dom
        // along with its listeners
        return [
            dom.addDisposableListener(element, dom.EventType.MOUSE_DOWN, async (e) => {
                e.stopImmediatePropagation();
            }),
            dom.addDisposableListener(element, dom.EventType.CLICK, async (e) => {
                e.stopImmediatePropagation();
                const actions = await this._getCommandActions(command);
                this._contextMenuService.showContextMenu({
                    getAnchor: () => element,
                    getActions: () => actions,
                });
            }),
            dom.addDisposableListener(element, dom.EventType.CONTEXT_MENU, async (e) => {
                e.stopImmediatePropagation();
                const actions = this._getContextMenuActions();
                this._contextMenuService.showContextMenu({
                    getAnchor: () => element,
                    getActions: () => actions,
                });
            }),
        ];
    }
    _getContextMenuActions() {
        const label = localize('workbench.action.terminal.toggleVisibility', 'Toggle Visibility');
        return [
            {
                class: undefined,
                tooltip: label,
                id: 'terminal.toggleVisibility',
                label,
                enabled: true,
                run: async () => {
                    this._showToggleVisibilityQuickPick();
                },
            },
        ];
    }
    async _getCommandActions(command) {
        const actions = [];
        const registeredMenuItems = this._registeredMenuItems.get(command);
        if (registeredMenuItems?.length) {
            actions.push(...registeredMenuItems, new Separator());
        }
        if (command.command !== '') {
            const labelRun = localize('terminal.rerunCommand', 'Rerun Command');
            actions.push({
                class: undefined,
                tooltip: labelRun,
                id: 'terminal.rerunCommand',
                label: labelRun,
                enabled: true,
                run: async () => {
                    if (command.command === '') {
                        return;
                    }
                    if (!command.isTrusted) {
                        const shouldRun = await new Promise((r) => {
                            this._notificationService.prompt(Severity.Info, localize('rerun', 'Do you want to run the command: {0}', command.command), [
                                {
                                    label: localize('yes', 'Yes'),
                                    run: () => r(true),
                                },
                                {
                                    label: localize('no', 'No'),
                                    run: () => r(false),
                                },
                            ]);
                        });
                        if (!shouldRun) {
                            return;
                        }
                    }
                    this._onDidRequestRunCommand.fire({ command });
                },
            });
            // The second section is the clipboard section
            actions.push(new Separator());
            const labelCopy = localize('terminal.copyCommand', 'Copy Command');
            actions.push({
                class: undefined,
                tooltip: labelCopy,
                id: 'terminal.copyCommand',
                label: labelCopy,
                enabled: true,
                run: () => this._clipboardService.writeText(command.command),
            });
        }
        if (command.hasOutput()) {
            const labelCopyCommandAndOutput = localize('terminal.copyCommandAndOutput', 'Copy Command and Output');
            actions.push({
                class: undefined,
                tooltip: labelCopyCommandAndOutput,
                id: 'terminal.copyCommandAndOutput',
                label: labelCopyCommandAndOutput,
                enabled: true,
                run: () => {
                    const output = command.getOutput();
                    if (typeof output === 'string') {
                        this._clipboardService.writeText(`${command.command !== '' ? command.command + '\n' : ''}${output}`);
                    }
                },
            });
            const labelText = localize('terminal.copyOutput', 'Copy Output');
            actions.push({
                class: undefined,
                tooltip: labelText,
                id: 'terminal.copyOutput',
                label: labelText,
                enabled: true,
                run: () => {
                    const text = command.getOutput();
                    if (typeof text === 'string') {
                        this._clipboardService.writeText(text);
                    }
                },
            });
            const labelHtml = localize('terminal.copyOutputAsHtml', 'Copy Output as HTML');
            actions.push({
                class: undefined,
                tooltip: labelHtml,
                id: 'terminal.copyOutputAsHtml',
                label: labelHtml,
                enabled: true,
                run: () => this._onDidRequestCopyAsHtml.fire({ command }),
            });
        }
        if (actions.length > 0) {
            actions.push(new Separator());
        }
        const labelRunRecent = localize('workbench.action.terminal.runRecentCommand', 'Run Recent Command');
        actions.push({
            class: undefined,
            tooltip: labelRunRecent,
            id: 'workbench.action.terminal.runRecentCommand',
            label: labelRunRecent,
            enabled: true,
            run: () => this._commandService.executeCommand('workbench.action.terminal.runRecentCommand'),
        });
        const labelGoToRecent = localize('workbench.action.terminal.goToRecentDirectory', 'Go To Recent Directory');
        actions.push({
            class: undefined,
            tooltip: labelRunRecent,
            id: 'workbench.action.terminal.goToRecentDirectory',
            label: labelGoToRecent,
            enabled: true,
            run: () => this._commandService.executeCommand('workbench.action.terminal.goToRecentDirectory'),
        });
        actions.push(new Separator());
        const labelAbout = localize('terminal.learnShellIntegration', 'Learn About Shell Integration');
        actions.push({
            class: undefined,
            tooltip: labelAbout,
            id: 'terminal.learnShellIntegration',
            label: labelAbout,
            enabled: true,
            run: () => this._openerService.open('https://code.visualstudio.com/docs/terminal/shell-integration'),
        });
        return actions;
    }
    _showToggleVisibilityQuickPick() {
        const quickPick = this._register(this._quickInputService.createQuickPick());
        quickPick.hideInput = true;
        quickPick.hideCheckAll = true;
        quickPick.canSelectMany = true;
        quickPick.title = localize('toggleVisibility', 'Toggle visibility');
        const configValue = this._configurationService.getValue("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */);
        const gutterIcon = {
            label: localize('gutter', 'Gutter command decorations'),
            picked: configValue !== 'never' && configValue !== 'overviewRuler',
        };
        const overviewRulerIcon = {
            label: localize('overviewRuler', 'Overview ruler command decorations'),
            picked: configValue !== 'never' && configValue !== 'gutter',
        };
        quickPick.items = [gutterIcon, overviewRulerIcon];
        const selectedItems = [];
        if (configValue !== 'never') {
            if (configValue !== 'gutter') {
                selectedItems.push(gutterIcon);
            }
            if (configValue !== 'overviewRuler') {
                selectedItems.push(overviewRulerIcon);
            }
        }
        quickPick.selectedItems = selectedItems;
        this._register(quickPick.onDidChangeSelection(async (e) => {
            let newValue = 'never';
            if (e.includes(gutterIcon)) {
                if (e.includes(overviewRulerIcon)) {
                    newValue = 'both';
                }
                else {
                    newValue = 'gutter';
                }
            }
            else if (e.includes(overviewRulerIcon)) {
                newValue = 'overviewRuler';
            }
            await this._configurationService.updateValue("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */, newValue);
        }));
        quickPick.ok = false;
        quickPick.show();
    }
    _getDecorationCssColor(decorationOrCommand) {
        let colorId;
        if (decorationOrCommand?.exitCode === undefined) {
            colorId = TERMINAL_COMMAND_DECORATION_DEFAULT_BACKGROUND_COLOR;
        }
        else {
            colorId = decorationOrCommand.exitCode
                ? TERMINAL_COMMAND_DECORATION_ERROR_BACKGROUND_COLOR
                : TERMINAL_COMMAND_DECORATION_SUCCESS_BACKGROUND_COLOR;
        }
        return this._themeService.getColorTheme().getColor(colorId)?.toString();
    }
};
DecorationAddon = __decorate([
    __param(1, IClipboardService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IThemeService),
    __param(5, IOpenerService),
    __param(6, IQuickInputService),
    __param(7, ILifecycleService),
    __param(8, ICommandService),
    __param(9, IAccessibilitySignalService),
    __param(10, INotificationService),
    __param(11, IHoverService)
], DecorationAddon);
export { DecorationAddon };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci94dGVybS9kZWNvcmF0aW9uQWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQVcsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFFZixPQUFPLEVBQ1AsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLG1GQUFtRixDQUFBO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNoRixPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0seURBQXlELENBQUE7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