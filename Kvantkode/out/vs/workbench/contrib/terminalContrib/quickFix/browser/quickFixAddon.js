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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tGaXhBZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3F1aWNrRml4L2Jyb3dzZXIvcXVpY2tGaXhBZGRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBRWpCLE1BQU0seUNBQXlDLENBQUE7QUFNaEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNoRixPQUFPLEVBRU4sWUFBWSxHQUNaLE1BQU0scURBQXFELENBQUE7QUFFNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxtRkFBbUYsQ0FBQTtBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQTtBQUV2SCxPQUFPLEVBQUUs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