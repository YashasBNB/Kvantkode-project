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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import * as dom from '../../../../../base/browser/dom.js';
import { asArray } from '../../../../../base/common/arrays.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { updateLayout, } from '../../../terminal/browser/xterm/decorationStyles.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { getLinesForCommand } from '../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { Schemas } from '../../../../../base/common/network.js';
import { ITerminalQuickFixService, TerminalQuickFixType, } from './quickFix.js';
import { CodeActionKind } from '../../../../../editor/contrib/codeAction/common/types.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
var QuickFixDecorationSelector;
(function (QuickFixDecorationSelector) {
    QuickFixDecorationSelector["QuickFix"] = "quick-fix";
})(QuickFixDecorationSelector || (QuickFixDecorationSelector = {}));
const quickFixClasses = [
    "quick-fix" /* QuickFixDecorationSelector.QuickFix */,
    "codicon" /* DecorationSelector.Codicon */,
    "terminal-command-decoration" /* DecorationSelector.CommandDecoration */,
    "xterm-decoration" /* DecorationSelector.XtermDecoration */,
];
let TerminalQuickFixAddon = class TerminalQuickFixAddon extends Disposable {
    constructor(_aliases, _capabilities, _accessibilitySignalService, _actionWidgetService, _commandService, _configurationService, _extensionService, _labelService, _openerService, _telemetryService, _quickFixService) {
        super();
        this._aliases = _aliases;
        this._capabilities = _capabilities;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._actionWidgetService = _actionWidgetService;
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._extensionService = _extensionService;
        this._labelService = _labelService;
        this._openerService = _openerService;
        this._telemetryService = _telemetryService;
        this._quickFixService = _quickFixService;
        this._commandListeners = new Map();
        this._decoration = this._register(new MutableDisposable());
        this._decorationDisposables = this._register(new MutableDisposable());
        this._registeredSelectors = new Set();
        this._didRun = false;
        this._onDidRequestRerunCommand = new Emitter();
        this.onDidRequestRerunCommand = this._onDidRequestRerunCommand.event;
        this._onDidUpdateQuickFixes = new Emitter();
        this.onDidUpdateQuickFixes = this._onDidUpdateQuickFixes.event;
        const commandDetectionCapability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (commandDetectionCapability) {
            this._registerCommandHandlers();
        }
        else {
            this._register(this._capabilities.onDidAddCapabilityType((c) => {
                if (c === 2 /* TerminalCapability.CommandDetection */) {
                    this._registerCommandHandlers();
                }
            }));
        }
        this._register(this._quickFixService.onDidRegisterProvider((result) => this.registerCommandFinishedListener(convertToQuickFixOptions(result))));
        this._quickFixService.extensionQuickFixes.then((quickFixSelectors) => {
            for (const selector of quickFixSelectors) {
                this.registerCommandSelector(selector);
            }
        });
        this._register(this._quickFixService.onDidRegisterCommandSelector((selector) => this.registerCommandSelector(selector)));
        this._register(this._quickFixService.onDidUnregisterProvider((id) => this._commandListeners.delete(id)));
    }
    activate(terminal) {
        this._terminal = terminal;
    }
    showMenu() {
        if (!this._currentRenderContext) {
            return;
        }
        const actions = this._currentRenderContext.quickFixes.map((f) => new TerminalQuickFixItem(f, f.type, f.source, f.label, f.kind));
        const actionSet = {
            allActions: actions,
            hasAutoFix: false,
            hasAIFix: false,
            allAIFixes: false,
            validActions: actions,
            dispose: () => { },
        };
        const delegate = {
            onSelect: async (fix) => {
                fix.action?.run();
                this._actionWidgetService.hide();
            },
            onHide: () => {
                this._terminal?.focus();
            },
        };
        this._actionWidgetService.show('quickFixWidget', false, toActionWidgetItems(actionSet.validActions, true), delegate, this._currentRenderContext.anchor, this._currentRenderContext.parentElement);
    }
    registerCommandSelector(selector) {
        if (this._registeredSelectors.has(selector.id)) {
            return;
        }
        const matcherKey = selector.commandLineMatcher.toString();
        const currentOptions = this._commandListeners.get(matcherKey) || [];
        currentOptions.push({
            id: selector.id,
            type: 'unresolved',
            commandLineMatcher: selector.commandLineMatcher,
            outputMatcher: selector.outputMatcher,
            commandExitResult: selector.commandExitResult,
            kind: selector.kind,
        });
        this._registeredSelectors.add(selector.id);
        this._commandListeners.set(matcherKey, currentOptions);
    }
    registerCommandFinishedListener(options) {
        const matcherKey = options.commandLineMatcher.toString();
        let currentOptions = this._commandListeners.get(matcherKey) || [];
        // removes the unresolved options
        currentOptions = currentOptions.filter((o) => o.id !== options.id);
        currentOptions.push(options);
        this._commandListeners.set(matcherKey, currentOptions);
    }
    _registerCommandHandlers() {
        const terminal = this._terminal;
        const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!terminal || !commandDetection) {
            return;
        }
        this._register(commandDetection.onCommandFinished(async (command) => await this._resolveQuickFixes(command, this._aliases)));
    }
    /**
     * Resolves quick fixes, if any, based on the
     * @param command & its output
     */
    async _resolveQuickFixes(command, aliases) {
        const terminal = this._terminal;
        if (!terminal || command.wasReplayed) {
            return;
        }
        if (command.command !== '' && this._lastQuickFixId) {
            this._disposeQuickFix(command, this._lastQuickFixId);
        }
        const resolver = async (selector, lines) => {
            if (lines === undefined) {
                return undefined;
            }
            const id = selector.id;
            await this._extensionService.activateByEvent(`onTerminalQuickFixRequest:${id}`);
            return this._quickFixService.providers.get(id)?.provideTerminalQuickFixes(command, lines, {
                type: 'resolved',
                commandLineMatcher: selector.commandLineMatcher,
                outputMatcher: selector.outputMatcher,
                commandExitResult: selector.commandExitResult,
                kind: selector.kind,
                id: selector.id,
            }, new CancellationTokenSource().token);
        };
        const result = await getQuickFixesForCommand(aliases, terminal, command, this._commandListeners, this._commandService, this._openerService, this._labelService, this._onDidRequestRerunCommand, resolver);
        if (!result) {
            return;
        }
        this._quickFixes = result;
        this._lastQuickFixId = this._quickFixes[0].id;
        this._registerQuickFixDecoration();
        this._onDidUpdateQuickFixes.fire({ command, actions: this._quickFixes });
        this._quickFixes = undefined;
    }
    _disposeQuickFix(command, id) {
        this._telemetryService?.publicLog2('terminal/quick-fix', {
            quickFixId: id,
            ranQuickFix: this._didRun,
        });
        this._decoration.clear();
        this._decorationDisposables.clear();
        this._onDidUpdateQuickFixes.fire({ command, actions: this._quickFixes });
        this._quickFixes = undefined;
        this._lastQuickFixId = undefined;
        this._didRun = false;
    }
    /**
     * Registers a decoration with the quick fixes
     */
    _registerQuickFixDecoration() {
        if (!this._terminal) {
            return;
        }
        this._decoration.clear();
        this._decorationDisposables.clear();
        const quickFixes = this._quickFixes;
        if (!quickFixes || quickFixes.length === 0) {
            return;
        }
        const marker = this._terminal.registerMarker();
        if (!marker) {
            return;
        }
        const decoration = (this._decoration.value = this._terminal.registerDecoration({
            marker,
            width: 2,
            layer: 'top',
        }));
        if (!decoration) {
            return;
        }
        const store = (this._decorationDisposables.value = new DisposableStore());
        store.add(decoration.onRender((e) => {
            const rect = e.getBoundingClientRect();
            const anchor = {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
            };
            if (e.classList.contains("quick-fix" /* QuickFixDecorationSelector.QuickFix */)) {
                if (this._currentRenderContext) {
                    this._currentRenderContext.anchor = anchor;
                }
                return;
            }
            e.classList.add(...quickFixClasses);
            const isExplainOnly = quickFixes.every((e) => e.kind === 'explain');
            if (isExplainOnly) {
                e.classList.add('explainOnly');
            }
            e.classList.add(...ThemeIcon.asClassNameArray(isExplainOnly ? Codicon.sparkle : Codicon.lightBulb));
            updateLayout(this._configurationService, e);
            this._accessibilitySignalService.playSignal(AccessibilitySignal.terminalQuickFix);
            const parentElement = e.closest('.xterm')?.parentElement;
            if (!parentElement) {
                return;
            }
            this._currentRenderContext = { quickFixes, anchor, parentElement };
            this._register(dom.addDisposableListener(e, dom.EventType.CLICK, () => this.showMenu()));
        }));
        store.add(decoration.onDispose(() => (this._currentRenderContext = undefined)));
    }
};
TerminalQuickFixAddon = __decorate([
    __param(2, IAccessibilitySignalService),
    __param(3, IActionWidgetService),
    __param(4, ICommandService),
    __param(5, IConfigurationService),
    __param(6, IExtensionService),
    __param(7, ILabelService),
    __param(8, IOpenerService),
    __param(9, ITelemetryService),
    __param(10, ITerminalQuickFixService)
], TerminalQuickFixAddon);
export { TerminalQuickFixAddon };
export async function getQuickFixesForCommand(aliases, terminal, terminalCommand, quickFixOptions, commandService, openerService, labelService, onDidRequestRerunCommand, getResolvedFixes) {
    // Prevent duplicates by tracking added entries
    const commandQuickFixSet = new Set();
    const openQuickFixSet = new Set();
    const fixes = [];
    const newCommand = terminalCommand.command;
    for (const options of quickFixOptions.values()) {
        for (const option of options) {
            if ((option.commandExitResult === 'success' && terminalCommand.exitCode !== 0) ||
                (option.commandExitResult === 'error' && terminalCommand.exitCode === 0)) {
                continue;
            }
            let quickFixes;
            if (option.type === 'resolved') {
                quickFixes = await option.getQuickFixes(terminalCommand, getLinesForCommand(terminal.buffer.active, terminalCommand, terminal.cols, option.outputMatcher), option, new CancellationTokenSource().token);
            }
            else if (option.type === 'unresolved') {
                if (!getResolvedFixes) {
                    throw new Error('No resolved fix provider');
                }
                quickFixes = await getResolvedFixes(option, option.outputMatcher
                    ? getLinesForCommand(terminal.buffer.active, terminalCommand, terminal.cols, option.outputMatcher)
                    : undefined);
            }
            else if (option.type === 'internal') {
                const commandLineMatch = newCommand.match(option.commandLineMatcher);
                if (!commandLineMatch) {
                    continue;
                }
                const outputMatcher = option.outputMatcher;
                let outputMatch;
                if (outputMatcher) {
                    outputMatch = terminalCommand.getOutputMatch(outputMatcher);
                }
                if (!outputMatch) {
                    continue;
                }
                const matchResult = { commandLineMatch, outputMatch, commandLine: terminalCommand.command };
                quickFixes = option.getQuickFixes(matchResult);
            }
            if (quickFixes) {
                for (const quickFix of asArray(quickFixes)) {
                    let action;
                    if ('type' in quickFix) {
                        switch (quickFix.type) {
                            case TerminalQuickFixType.TerminalCommand: {
                                const fix = quickFix;
                                if (commandQuickFixSet.has(fix.terminalCommand)) {
                                    continue;
                                }
                                commandQuickFixSet.add(fix.terminalCommand);
                                const label = localize('quickFix.command', 'Run: {0}', fix.terminalCommand);
                                action = {
                                    type: TerminalQuickFixType.TerminalCommand,
                                    kind: option.kind,
                                    class: undefined,
                                    source: quickFix.source,
                                    id: quickFix.id,
                                    label,
                                    enabled: true,
                                    run: () => {
                                        onDidRequestRerunCommand?.fire({
                                            command: fix.terminalCommand,
                                            shouldExecute: fix.shouldExecute ?? true,
                                        });
                                    },
                                    tooltip: label,
                                    command: fix.terminalCommand,
                                    shouldExecute: fix.shouldExecute,
                                };
                                break;
                            }
                            case TerminalQuickFixType.Opener: {
                                const fix = quickFix;
                                if (!fix.uri) {
                                    return;
                                }
                                if (openQuickFixSet.has(fix.uri.toString())) {
                                    continue;
                                }
                                openQuickFixSet.add(fix.uri.toString());
                                const isUrl = fix.uri.scheme === Schemas.http || fix.uri.scheme === Schemas.https;
                                const uriLabel = isUrl
                                    ? encodeURI(fix.uri.toString(true))
                                    : labelService.getUriLabel(fix.uri);
                                const label = localize('quickFix.opener', 'Open: {0}', uriLabel);
                                action = {
                                    source: quickFix.source,
                                    id: quickFix.id,
                                    label,
                                    type: TerminalQuickFixType.Opener,
                                    kind: option.kind,
                                    class: undefined,
                                    enabled: true,
                                    run: () => openerService.open(fix.uri),
                                    tooltip: label,
                                    uri: fix.uri,
                                };
                                break;
                            }
                            case TerminalQuickFixType.Port: {
                                const fix = quickFix;
                                action = {
                                    source: 'builtin',
                                    type: fix.type,
                                    kind: option.kind,
                                    id: fix.id,
                                    label: fix.label,
                                    class: fix.class,
                                    enabled: fix.enabled,
                                    run: () => {
                                        fix.run();
                                    },
                                    tooltip: fix.tooltip,
                                };
                                break;
                            }
                            case TerminalQuickFixType.VscodeCommand: {
                                const fix = quickFix;
                                action = {
                                    source: quickFix.source,
                                    type: fix.type,
                                    kind: option.kind,
                                    id: fix.id,
                                    label: fix.title,
                                    class: undefined,
                                    enabled: true,
                                    run: () => commandService.executeCommand(fix.id),
                                    tooltip: fix.title,
                                };
                                break;
                            }
                        }
                        if (action) {
                            fixes.push(action);
                        }
                    }
                }
            }
        }
    }
    return fixes.length > 0 ? fixes : undefined;
}
function convertToQuickFixOptions(selectorProvider) {
    return {
        id: selectorProvider.selector.id,
        type: 'resolved',
        commandLineMatcher: selectorProvider.selector.commandLineMatcher,
        outputMatcher: selectorProvider.selector.outputMatcher,
        commandExitResult: selectorProvider.selector.commandExitResult,
        kind: selectorProvider.selector.kind,
        getQuickFixes: selectorProvider.provider.provideTerminalQuickFixes,
    };
}
class TerminalQuickFixItem {
    constructor(action, type, source, title, kind = 'fix') {
        this.action = action;
        this.type = type;
        this.source = source;
        this.title = title;
        this.kind = kind;
        this.disabled = false;
    }
}
function toActionWidgetItems(inputQuickFixes, showHeaders) {
    const menuItems = [];
    menuItems.push({
        kind: "header" /* ActionListItemKind.Header */,
        group: {
            kind: CodeActionKind.QuickFix,
            title: localize('codeAction.widget.id.quickfix', 'Quick Fix'),
        },
    });
    for (const quickFix of showHeaders
        ? inputQuickFixes
        : inputQuickFixes.filter((i) => !!i.action)) {
        if (!quickFix.disabled && quickFix.action) {
            menuItems.push({
                kind: "action" /* ActionListItemKind.Action */,
                item: quickFix,
                group: {
                    kind: CodeActionKind.QuickFix,
                    icon: getQuickFixIcon(quickFix),
                    title: quickFix.action.label,
                },
                disabled: false,
                label: quickFix.title,
            });
        }
    }
    return menuItems;
}
function getQuickFixIcon(quickFix) {
    if (quickFix.kind === 'explain') {
        return Codicon.sparkle;
    }
    switch (quickFix.type) {
        case TerminalQuickFixType.Opener:
            if ('uri' in quickFix.action && quickFix.action.uri) {
                const isUrl = quickFix.action.uri.scheme === Schemas.http ||
                    quickFix.action.uri.scheme === Schemas.https;
                return isUrl ? Codicon.linkExternal : Codicon.goToFile;
            }
        case TerminalQuickFixType.TerminalCommand:
            return Codicon.run;
        case TerminalQuickFixType.Port:
            return Codicon.debugDisconnect;
        case TerminalQuickFixType.VscodeCommand:
            return Codicon.lightbulb;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tGaXhBZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0ZpeC9icm93c2VyL3F1aWNrRml4QWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixHQUVqQixNQUFNLHlDQUF5QyxDQUFBO0FBTWhELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUVOLFlBQVksR0FDWixNQUFNLHFEQUFxRCxDQUFBO0FBRTVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3hGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sbUZBQW1GLENBQUE7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFFbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0ZBQW9GLENBQUE7QUFFdkgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRCxPQUFPLEVBUU4sd0JBQXdCLEVBRXhCLG9CQUFvQixHQUVwQixNQUFNLGVBQWUsQ0FBQTtBQU10QixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFckYsSUFBVywwQkFFVjtBQUZELFdBQVcsMEJBQTBCO0lBQ3BDLG9EQUFzQixDQUFBO0FBQ3ZCLENBQUMsRUFGVSwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBRXBDO0FBRUQsTUFBTSxlQUFlLEdBQUc7Ozs7O0NBS3ZCLENBQUE7QUFnQk0sSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFDWixTQUFRLFVBQVU7SUE0Q2xCLFlBQ2tCLFFBQWdDLEVBQ2hDLGFBQXVDLEVBRXhELDJCQUF5RSxFQUNuRCxvQkFBMkQsRUFDaEUsZUFBaUQsRUFDM0MscUJBQTZELEVBQ2pFLGlCQUFxRCxFQUN6RCxhQUE2QyxFQUM1QyxjQUErQyxFQUM1QyxpQkFBcUQsRUFDOUMsZ0JBQTJEO1FBRXJGLEtBQUssRUFBRSxDQUFBO1FBYlUsYUFBUSxHQUFSLFFBQVEsQ0FBd0I7UUFDaEMsa0JBQWEsR0FBYixhQUFhLENBQTBCO1FBRXZDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUMvQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDMUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNoRCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3hDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQzNCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUMzQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQzdCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBMEI7UUFuRDlFLHNCQUFpQixHQU9yQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBSUksZ0JBQVcsR0FBbUMsSUFBSSxDQUFDLFNBQVMsQ0FDNUUsSUFBSSxpQkFBaUIsRUFBRSxDQUN2QixDQUFBO1FBQ2dCLDJCQUFzQixHQUFtQyxJQUFJLENBQUMsU0FBUyxDQUN2RixJQUFJLGlCQUFpQixFQUFFLENBQ3ZCLENBQUE7UUFRZ0IseUJBQW9CLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFdEQsWUFBTyxHQUFZLEtBQUssQ0FBQTtRQUVmLDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUdwRCxDQUFBO1FBQ0ssNkJBQXdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtRQUN2RCwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFHakQsQ0FBQTtRQUNLLDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFpQmpFLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLDZDQUFxQyxDQUFBO1FBQzlGLElBQUksMEJBQTBCLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMvQyxJQUFJLENBQUMsZ0RBQXdDLEVBQUUsQ0FBQztvQkFDL0MsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7Z0JBQ2hDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDdEQsSUFBSSxDQUFDLCtCQUErQixDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ3RFLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFO1lBQ3BFLEtBQUssTUFBTSxRQUFRLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDRCQUE0QixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDL0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUN0QyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN4RixDQUFBO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxRQUFrQjtRQUMxQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNqQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUN4RCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUNyRSxDQUFBO1FBQ0QsTUFBTSxTQUFTLEdBQUc7WUFDakIsVUFBVSxFQUFFLE9BQU87WUFDbkIsVUFBVSxFQUFFLEtBQUs7WUFDakIsUUFBUSxFQUFFLEtBQUs7WUFDZixVQUFVLEVBQUUsS0FBSztZQUNqQixZQUFZLEVBQUUsT0FBTztZQUNyQixPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztTQUN5QixDQUFBO1FBQzNDLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBeUIsRUFBRSxFQUFFO2dCQUM3QyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFBO2dCQUNqQixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDakMsQ0FBQztZQUNELE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQ1osSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUN4QixDQUFDO1NBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQzdCLGdCQUFnQixFQUNoQixLQUFLLEVBQ0wsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsRUFDakQsUUFBUSxFQUNSLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQ2pDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQ3hDLENBQUE7SUFDRixDQUFDO0lBRUQsdUJBQXVCLENBQUMsUUFBa0M7UUFDekQsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ2hELE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3pELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ25FLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbkIsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQ2YsSUFBSSxFQUFFLFlBQVk7WUFDbEIsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLGtCQUFrQjtZQUMvQyxhQUFhLEVBQUUsUUFBUSxDQUFDLGFBQWE7WUFDckMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLGlCQUFpQjtZQUM3QyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7U0FDbkIsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELCtCQUErQixDQUM5QixPQUE2RTtRQUU3RSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDeEQsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDakUsaUNBQWlDO1FBQ2pDLGNBQWMsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNsRSxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUMvQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyw2Q0FBcUMsQ0FBQTtRQUNwRixJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNwQyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsZ0JBQWdCLENBQUMsaUJBQWlCLENBQ2pDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ3hFLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBeUIsRUFBRSxPQUFvQjtRQUMvRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBO1FBQy9CLElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDckQsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRSxRQUFrQyxFQUFFLEtBQWdCLEVBQUUsRUFBRTtZQUMvRSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDekIsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUE7WUFDdEIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLDZCQUE2QixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9FLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUseUJBQXlCLENBQ3hFLE9BQU8sRUFDUCxLQUFLLEVBQ0w7Z0JBQ0MsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxrQkFBa0I7Z0JBQy9DLGFBQWEsRUFBRSxRQUFRLENBQUMsYUFBYTtnQkFDckMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLGlCQUFpQjtnQkFDN0MsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO2dCQUNuQixFQUFFLEVBQUUsUUFBUSxDQUFDLEVBQUU7YUFDZixFQUNELElBQUksdUJBQXVCLEVBQUUsQ0FBQyxLQUFLLENBQ25DLENBQUE7UUFDRixDQUFDLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLHVCQUF1QixDQUMzQyxPQUFPLEVBQ1AsUUFBUSxFQUNSLE9BQU8sRUFDUCxJQUFJLENBQUMsaUJBQWlCLEVBQ3RCLElBQUksQ0FBQyxlQUFlLEVBQ3BCLElBQUksQ0FBQyxjQUFjLEVBQ25CLElBQUksQ0FBQyxhQUFhLEVBQ2xCLElBQUksQ0FBQyx5QkFBeUIsRUFDOUIsUUFBUSxDQUNSLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDN0MsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDbEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7SUFDN0IsQ0FBQztJQUVPLGdCQUFnQixDQUFDLE9BQXlCLEVBQUUsRUFBVTtRQW1CN0QsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FDakMsb0JBQW9CLEVBQ3BCO1lBQ0MsVUFBVSxFQUFFLEVBQUU7WUFDZCxXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDekIsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7UUFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssMkJBQTJCO1FBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ25DLElBQUksQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDOUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUM7WUFDOUUsTUFBTTtZQUNOLEtBQUssRUFBRSxDQUFDO1lBQ1IsS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUMsQ0FBQTtRQUNILElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFDekUsS0FBSyxDQUFDLEdBQUcsQ0FDUixVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDekIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFDdEMsTUFBTSxNQUFNLEdBQUc7Z0JBQ2QsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNULENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDVCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTthQUNuQixDQUFBO1lBRUQsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsdURBQXFDLEVBQUUsQ0FBQztnQkFDL0QsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztvQkFDaEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7Z0JBQzNDLENBQUM7Z0JBRUQsT0FBTTtZQUNQLENBQUM7WUFFRCxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxDQUFBO1lBQ25DLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUE7WUFDbkUsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDL0IsQ0FBQztZQUNELENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUNkLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUNsRixDQUFBO1lBRUQsWUFBWSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFFakYsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxhQUFhLENBQUE7WUFDeEQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNwQixPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLENBQUE7WUFDbEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekYsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEYsQ0FBQztDQUNELENBQUE7QUExVVkscUJBQXFCO0lBZ0QvQixXQUFBLDJCQUEyQixDQUFBO0lBRTNCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSx3QkFBd0IsQ0FBQTtHQXpEZCxxQkFBcUIsQ0EwVWpDOztBQVdELE1BQU0sQ0FBQyxLQUFLLFVBQVUsdUJBQXVCLENBQzVDLE9BQStCLEVBQy9CLFFBQWtCLEVBQ2xCLGVBQWlDLEVBQ2pDLGVBQXdELEVBQ3hELGNBQStCLEVBQy9CLGFBQTZCLEVBQzdCLFlBQTJCLEVBQzNCLHdCQUFnRixFQUNoRixnQkFHaUU7SUFFakUsK0NBQStDO0lBQy9DLE1BQU0sa0JBQWtCLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUE7SUFDakQsTUFBTSxlQUFlLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUE7SUFFOUMsTUFBTSxLQUFLLEdBQXNCLEVBQUUsQ0FBQTtJQUNuQyxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFBO0lBQzFDLEtBQUssTUFBTSxPQUFPLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7UUFDaEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUNDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixLQUFLLFNBQVMsSUFBSSxlQUFlLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQztnQkFDMUUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEtBQUssT0FBTyxJQUFJLGVBQWUsQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQ3ZFLENBQUM7Z0JBQ0YsU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLFVBQVUsQ0FBQTtZQUNkLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDaEMsVUFBVSxHQUFHLE1BQU8sTUFBb0QsQ0FBQyxhQUFhLENBQ3JGLGVBQWUsRUFDZixrQkFBa0IsQ0FDakIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQ3RCLGVBQWUsRUFDZixRQUFRLENBQUMsSUFBSSxFQUNiLE1BQU0sQ0FBQyxhQUFhLENBQ3BCLEVBQ0QsTUFBTSxFQUNOLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxLQUFLLENBQ25DLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQztnQkFDRCxVQUFVLEdBQUcsTUFBTSxnQkFBZ0IsQ0FDbEMsTUFBTSxFQUNOLE1BQU0sQ0FBQyxhQUFhO29CQUNuQixDQUFDLENBQUMsa0JBQWtCLENBQ2xCLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUN0QixlQUFlLEVBQ2YsUUFBUSxDQUFDLElBQUksRUFDYixNQUFNLENBQUMsYUFBYSxDQUNwQjtvQkFDRixDQUFDLENBQUMsU0FBUyxDQUNaLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO2dCQUNwRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdkIsU0FBUTtnQkFDVCxDQUFDO2dCQUNELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUE7Z0JBQzFDLElBQUksV0FBVyxDQUFBO2dCQUNmLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ25CLFdBQVcsR0FBRyxlQUFlLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUM1RCxDQUFDO2dCQUNELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbEIsU0FBUTtnQkFDVCxDQUFDO2dCQUNELE1BQU0sV0FBVyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQzNGLFVBQVUsR0FBSSxNQUEyQyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNyRixDQUFDO1lBRUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsS0FBSyxNQUFNLFFBQVEsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDNUMsSUFBSSxNQUFtQyxDQUFBO29CQUN2QyxJQUFJLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQzt3QkFDeEIsUUFBUSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7NEJBQ3ZCLEtBQUssb0JBQW9CLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQ0FDM0MsTUFBTSxHQUFHLEdBQUcsUUFBa0QsQ0FBQTtnQ0FDOUQsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7b0NBQ2pELFNBQVE7Z0NBQ1QsQ0FBQztnQ0FDRCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dDQUMzQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQ0FDM0UsTUFBTSxHQUFHO29DQUNSLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxlQUFlO29DQUMxQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7b0NBQ2pCLEtBQUssRUFBRSxTQUFTO29DQUNoQixNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU07b0NBQ3ZCLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRTtvQ0FDZixLQUFLO29DQUNMLE9BQU8sRUFBRSxJQUFJO29DQUNiLEdBQUcsRUFBRSxHQUFHLEVBQUU7d0NBQ1Qsd0JBQXdCLEVBQUUsSUFBSSxDQUFDOzRDQUM5QixPQUFPLEVBQUUsR0FBRyxDQUFDLGVBQWU7NENBQzVCLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxJQUFJLElBQUk7eUNBQ3hDLENBQUMsQ0FBQTtvQ0FDSCxDQUFDO29DQUNELE9BQU8sRUFBRSxLQUFLO29DQUNkLE9BQU8sRUFBRSxHQUFHLENBQUMsZUFBZTtvQ0FDNUIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhO2lDQUNoQyxDQUFBO2dDQUNELE1BQUs7NEJBQ04sQ0FBQzs0QkFDRCxLQUFLLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0NBQ2xDLE1BQU0sR0FBRyxHQUFHLFFBQXlDLENBQUE7Z0NBQ3JELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7b0NBQ2QsT0FBTTtnQ0FDUCxDQUFDO2dDQUNELElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQ0FDN0MsU0FBUTtnQ0FDVCxDQUFDO2dDQUNELGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dDQUN2QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxLQUFLLENBQUE7Z0NBQ2pGLE1BQU0sUUFBUSxHQUFHLEtBQUs7b0NBQ3JCLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7b0NBQ25DLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQ0FDcEMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtnQ0FDaEUsTUFBTSxHQUFHO29DQUNSLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtvQ0FDdkIsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO29DQUNmLEtBQUs7b0NBQ0wsSUFBSSxFQUFFLG9CQUFvQixDQUFDLE1BQU07b0NBQ2pDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtvQ0FDakIsS0FBSyxFQUFFLFNBQVM7b0NBQ2hCLE9BQU8sRUFBRSxJQUFJO29DQUNiLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7b0NBQ3RDLE9BQU8sRUFBRSxLQUFLO29DQUNkLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRztpQ0FDWixDQUFBO2dDQUNELE1BQUs7NEJBQ04sQ0FBQzs0QkFDRCxLQUFLLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0NBQ2hDLE1BQU0sR0FBRyxHQUFHLFFBQTJCLENBQUE7Z0NBQ3ZDLE1BQU0sR0FBRztvQ0FDUixNQUFNLEVBQUUsU0FBUztvQ0FDakIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO29DQUNkLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtvQ0FDakIsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFO29DQUNWLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSztvQ0FDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLO29DQUNoQixPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU87b0NBQ3BCLEdBQUcsRUFBRSxHQUFHLEVBQUU7d0NBQ1QsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBO29DQUNWLENBQUM7b0NBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO2lDQUNwQixDQUFBO2dDQUNELE1BQUs7NEJBQ04sQ0FBQzs0QkFDRCxLQUFLLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0NBQ3pDLE1BQU0sR0FBRyxHQUFHLFFBQTBDLENBQUE7Z0NBQ3RELE1BQU0sR0FBRztvQ0FDUixNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU07b0NBQ3ZCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtvQ0FDZCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7b0NBQ2pCLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRTtvQ0FDVixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7b0NBQ2hCLEtBQUssRUFBRSxTQUFTO29DQUNoQixPQUFPLEVBQUUsSUFBSTtvQ0FDYixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29DQUNoRCxPQUFPLEVBQUUsR0FBRyxDQUFDLEtBQUs7aUNBQ2xCLENBQUE7Z0NBQ0QsTUFBSzs0QkFDTixDQUFDO3dCQUNGLENBQUM7d0JBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQzs0QkFDWixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO3dCQUNuQixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0FBQzVDLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUNoQyxnQkFBbUQ7SUFFbkQsT0FBTztRQUNOLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNoQyxJQUFJLEVBQUUsVUFBVTtRQUNoQixrQkFBa0IsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsa0JBQWtCO1FBQ2hFLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsYUFBYTtRQUN0RCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsaUJBQWlCO1FBQzlELElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSTtRQUNwQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLHlCQUF5QjtLQUNsRSxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sb0JBQW9CO0lBRXpCLFlBQ1UsTUFBdUIsRUFDdkIsSUFBMEIsRUFDMUIsTUFBYyxFQUNkLEtBQXlCLEVBQ3pCLE9BQTBCLEtBQUs7UUFKL0IsV0FBTSxHQUFOLE1BQU0sQ0FBaUI7UUFDdkIsU0FBSSxHQUFKLElBQUksQ0FBc0I7UUFDMUIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFVBQUssR0FBTCxLQUFLLENBQW9CO1FBQ3pCLFNBQUksR0FBSixJQUFJLENBQTJCO1FBTmhDLGFBQVEsR0FBRyxLQUFLLENBQUE7SUFPdEIsQ0FBQztDQUNKO0FBRUQsU0FBUyxtQkFBbUIsQ0FDM0IsZUFBZ0QsRUFDaEQsV0FBb0I7SUFFcEIsTUFBTSxTQUFTLEdBQTRDLEVBQUUsQ0FBQTtJQUM3RCxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ2QsSUFBSSwwQ0FBMkI7UUFDL0IsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLGNBQWMsQ0FBQyxRQUFRO1lBQzdCLEtBQUssRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsV0FBVyxDQUFDO1NBQzdEO0tBQ0QsQ0FBQyxDQUFBO0lBQ0YsS0FBSyxNQUFNLFFBQVEsSUFBSSxXQUFXO1FBQ2pDLENBQUMsQ0FBQyxlQUFlO1FBQ2pCLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNDLFNBQVMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2QsSUFBSSwwQ0FBMkI7Z0JBQy9CLElBQUksRUFBRSxRQUFRO2dCQUNkLEtBQUssRUFBRTtvQkFDTixJQUFJLEVBQUUsY0FBYyxDQUFDLFFBQVE7b0JBQzdCLElBQUksRUFBRSxlQUFlLENBQUMsUUFBUSxDQUFDO29CQUMvQixLQUFLLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLO2lCQUM1QjtnQkFDRCxRQUFRLEVBQUUsS0FBSztnQkFDZixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7YUFDckIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsUUFBOEI7SUFDdEQsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ2pDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQTtJQUN2QixDQUFDO0lBQ0QsUUFBUSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkIsS0FBSyxvQkFBb0IsQ0FBQyxNQUFNO1lBQy9CLElBQUksS0FBSyxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckQsTUFBTSxLQUFLLEdBQ1YsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO29CQUMzQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLEtBQUssQ0FBQTtnQkFDN0MsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUE7WUFDdkQsQ0FBQztRQUNGLEtBQUssb0JBQW9CLENBQUMsZUFBZTtZQUN4QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUE7UUFDbkIsS0FBSyxvQkFBb0IsQ0FBQyxJQUFJO1lBQzdCLE9BQU8sT0FBTyxDQUFDLGVBQWUsQ0FBQTtRQUMvQixLQUFLLG9CQUFvQixDQUFDLGFBQWE7WUFDdEMsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFBO0lBQzFCLENBQUM7QUFDRixDQUFDIn0=