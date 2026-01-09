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
var BuiltinDynamicCompletions_1, ToolCompletions_1;
import { coalesce } from '../../../../../base/common/arrays.js';
import { raceTimeout } from '../../../../../base/common/async.js';
import { isPatternInWord } from '../../../../../base/common/filters.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { dirname } from '../../../../../base/common/resources.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { isCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { getWordAtText } from '../../../../../editor/common/core/wordHelper.js';
import { SymbolKinds, } from '../../../../../editor/common/languages.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IOutlineModelService } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { localize } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IMarkerService } from '../../../../../platform/markers/common/markers.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { Extensions as WorkbenchExtensions, } from '../../../../common/contributions.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHistoryService } from '../../../../services/history/common/history.js';
import { QueryBuilder } from '../../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../../services/search/common/search.js';
import { IChatAgentNameService, IChatAgentService, getFullyQualifiedId, } from '../../common/chatAgents.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestTextPart, ChatRequestToolPart, chatAgentLeader, chatSubcommandLeader, chatVariableLeader, } from '../../common/chatParserTypes.js';
import { IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { ChatEditingSessionSubmitAction, ChatSubmitAction } from '../actions/chatExecuteActions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatInputPart } from '../chatInputPart.js';
import { ChatDynamicVariableModel, SelectAndInsertFileAction, SelectAndInsertFolderAction, SelectAndInsertProblemAction, SelectAndInsertSymAction, getTopLevelFolders, searchFolders, } from './chatDynamicVariables.js';
let SlashCommandCompletions = class SlashCommandCompletions extends Disposable {
    constructor(languageFeaturesService, chatWidgetService, chatSlashCommandService) {
        super();
        this.languageFeaturesService = languageFeaturesService;
        this.chatWidgetService = chatWidgetService;
        this.chatSlashCommandService = chatSlashCommandService;
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'globalSlashCommands',
            triggerCharacters: ['/'],
            provideCompletionItems: async (model, position, _context, _token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return null;
                }
                const range = computeCompletionRanges(model, position, /\/\w*/g);
                if (!range) {
                    return null;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const parsedRequest = widget.parsedInput.parts;
                const usedAgent = parsedRequest.find((p) => p instanceof ChatRequestAgentPart);
                if (usedAgent) {
                    // No (classic) global slash commands when an agent is used
                    return;
                }
                const slashCommands = this.chatSlashCommandService.getCommands(widget.location, widget.input.currentMode);
                if (!slashCommands) {
                    return null;
                }
                return {
                    suggestions: slashCommands.map((c, i) => {
                        const withSlash = `/${c.command}`;
                        return {
                            label: withSlash,
                            insertText: c.executeImmediately ? '' : `${withSlash} `,
                            documentation: c.detail,
                            range,
                            sortText: c.sortText ?? 'a'.repeat(i + 1),
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway,
                            command: c.executeImmediately
                                ? {
                                    id: widget.location === ChatAgentLocation.EditingSession
                                        ? ChatEditingSessionSubmitAction.ID
                                        : ChatSubmitAction.ID,
                                    title: withSlash,
                                    arguments: [{ widget, inputValue: `${withSlash} ` }],
                                }
                                : undefined,
                        };
                    }),
                };
            },
        }));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'globalSlashCommandsAt',
            triggerCharacters: [chatAgentLeader],
            provideCompletionItems: async (model, position, _context, _token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return null;
                }
                const range = computeCompletionRanges(model, position, /@\w*/g);
                if (!range) {
                    return null;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const slashCommands = this.chatSlashCommandService.getCommands(widget.location, widget.input.currentMode);
                if (!slashCommands) {
                    return null;
                }
                return {
                    suggestions: slashCommands.map((c, i) => {
                        const withSlash = `${chatSubcommandLeader}${c.command}`;
                        return {
                            label: withSlash,
                            insertText: c.executeImmediately ? '' : `${withSlash} `,
                            documentation: c.detail,
                            range,
                            filterText: `${chatAgentLeader}${c.command}`,
                            sortText: c.sortText ?? 'z'.repeat(i + 1),
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway,
                            command: c.executeImmediately
                                ? {
                                    id: widget.location === ChatAgentLocation.EditingSession
                                        ? ChatEditingSessionSubmitAction.ID
                                        : ChatSubmitAction.ID,
                                    title: withSlash,
                                    arguments: [{ widget, inputValue: `${withSlash} ` }],
                                }
                                : undefined,
                        };
                    }),
                };
            },
        }));
    }
};
SlashCommandCompletions = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IChatWidgetService),
    __param(2, IChatSlashCommandService)
], SlashCommandCompletions);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(SlashCommandCompletions, 4 /* LifecyclePhase.Eventually */);
let AgentCompletions = class AgentCompletions extends Disposable {
    constructor(languageFeaturesService, chatWidgetService, chatAgentService, chatAgentNameService) {
        super();
        this.languageFeaturesService = languageFeaturesService;
        this.chatWidgetService = chatWidgetService;
        this.chatAgentService = chatAgentService;
        this.chatAgentNameService = chatAgentNameService;
        const subCommandProvider = {
            _debugDisplayName: 'chatAgentSubcommand',
            triggerCharacters: ['/'],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return;
                }
                const range = computeCompletionRanges(model, position, /\/\w*/g);
                if (!range) {
                    return null;
                }
                const parsedRequest = widget.parsedInput.parts;
                const usedAgentIdx = parsedRequest.findIndex((p) => p instanceof ChatRequestAgentPart);
                if (usedAgentIdx < 0) {
                    return;
                }
                const usedSubcommand = parsedRequest.find((p) => p instanceof ChatRequestAgentSubcommandPart);
                if (usedSubcommand) {
                    // Only one allowed
                    return;
                }
                for (const partAfterAgent of parsedRequest.slice(usedAgentIdx + 1)) {
                    // Could allow text after 'position'
                    if (!(partAfterAgent instanceof ChatRequestTextPart) ||
                        !partAfterAgent.text.trim().match(/^(\/\w*)?$/)) {
                        // No text allowed between agent and subcommand
                        return;
                    }
                }
                const usedAgent = parsedRequest[usedAgentIdx];
                return {
                    suggestions: usedAgent.agent.slashCommands.map((c, i) => {
                        const withSlash = `/${c.name}`;
                        return {
                            label: withSlash,
                            insertText: `${withSlash} `,
                            documentation: c.description,
                            range,
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway
                        };
                    }),
                };
            },
        };
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, subCommandProvider));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentAndSubcommand',
            triggerCharacters: [chatAgentLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                const viewModel = widget?.viewModel;
                if (!widget || !viewModel || widget.input.currentMode !== ChatMode.Ask) {
                    return;
                }
                const range = computeCompletionRanges(model, position, /(@|\/)\w*/g);
                if (!range) {
                    return null;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const agents = this.chatAgentService
                    .getAgents()
                    .filter((a) => a.locations.includes(widget.location));
                // When the input is only `/`, items are sorted by sortText.
                // When typing, filterText is used to score and sort.
                // The same list is refiltered/ranked while typing.
                const getFilterText = (agent, command) => {
                    // This is hacking the filter algorithm to make @terminal /explain match worse than @workspace /explain by making its match index later in the string.
                    // When I type `/exp`, the workspace one should be sorted over the terminal one.
                    const dummyPrefix = agent.id === 'github.copilot.terminalPanel' ? `0000` : ``;
                    return `${chatAgentLeader}${dummyPrefix}${agent.name}.${command}`;
                };
                const justAgents = agents
                    .filter((a) => !a.isDefault)
                    .map((agent) => {
                    const { label: agentLabel, isDupe } = this.getAgentCompletionDetails(agent);
                    const detail = agent.description;
                    return {
                        label: isDupe
                            ? {
                                label: agentLabel,
                                description: agent.description,
                                detail: ` (${agent.publisherDisplayName})`,
                            }
                            : agentLabel,
                        documentation: detail,
                        filterText: `${chatAgentLeader}${agent.name}`,
                        insertText: `${agentLabel} `,
                        range,
                        kind: 18 /* CompletionItemKind.Text */,
                        sortText: `${chatAgentLeader}${agent.name}`,
                        command: {
                            id: AssignSelectedAgentAction.ID,
                            title: AssignSelectedAgentAction.ID,
                            arguments: [{ agent, widget }],
                        },
                    };
                });
                return {
                    suggestions: justAgents.concat(coalesce(agents.flatMap((agent) => agent.slashCommands.map((c, i) => {
                        if (agent.isDefault &&
                            this.chatAgentService.getDefaultAgent(widget.location, widget.input.currentMode)?.id !== agent.id) {
                            return;
                        }
                        const { label: agentLabel, isDupe } = this.getAgentCompletionDetails(agent);
                        const label = `${agentLabel} ${chatSubcommandLeader}${c.name}`;
                        const item = {
                            label: isDupe
                                ? {
                                    label,
                                    description: c.description,
                                    detail: isDupe ? ` (${agent.publisherDisplayName})` : undefined,
                                }
                                : label,
                            documentation: c.description,
                            filterText: getFilterText(agent, c.name),
                            commitCharacters: [' '],
                            insertText: label + ' ',
                            range,
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway
                            sortText: `x${chatAgentLeader}${agent.name}${c.name}`,
                            command: {
                                id: AssignSelectedAgentAction.ID,
                                title: AssignSelectedAgentAction.ID,
                                arguments: [{ agent, widget }],
                            },
                        };
                        if (agent.isDefault) {
                            // default agent isn't mentioned nor inserted
                            const label = `${chatSubcommandLeader}${c.name}`;
                            item.label = label;
                            item.insertText = `${label} `;
                            item.documentation = c.description;
                        }
                        return item;
                    })))),
                };
            },
        }));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentAndSubcommand',
            triggerCharacters: [chatSubcommandLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                const viewModel = widget?.viewModel;
                if (!widget || !viewModel || widget.input.currentMode !== ChatMode.Ask) {
                    return;
                }
                const range = computeCompletionRanges(model, position, /(@|\/)\w*/g);
                if (!range) {
                    return null;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const agents = this.chatAgentService
                    .getAgents()
                    .filter((a) => a.locations.includes(widget.location));
                return {
                    suggestions: coalesce(agents.flatMap((agent) => agent.slashCommands.map((c, i) => {
                        if (agent.isDefault &&
                            this.chatAgentService.getDefaultAgent(widget.location, widget.input.currentMode)?.id !== agent.id) {
                            return;
                        }
                        const { label: agentLabel, isDupe } = this.getAgentCompletionDetails(agent);
                        const withSlash = `${chatSubcommandLeader}${c.name}`;
                        const extraSortText = agent.id === 'github.copilot.terminalPanel' ? `z` : ``;
                        const sortText = `${chatSubcommandLeader}${extraSortText}${agent.name}${c.name}`;
                        const item = {
                            label: {
                                label: withSlash,
                                description: agentLabel,
                                detail: isDupe ? ` (${agent.publisherDisplayName})` : undefined,
                            },
                            commitCharacters: [' '],
                            insertText: `${agentLabel} ${withSlash} `,
                            documentation: `(${agentLabel}) ${c.description ?? ''}`,
                            range,
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway
                            sortText,
                            command: {
                                id: AssignSelectedAgentAction.ID,
                                title: AssignSelectedAgentAction.ID,
                                arguments: [{ agent, widget }],
                            },
                        };
                        if (agent.isDefault) {
                            // default agent isn't mentioned nor inserted
                            const label = `${chatSubcommandLeader}${c.name}`;
                            item.label = label;
                            item.insertText = `${label} `;
                            item.documentation = c.description;
                        }
                        return item;
                    }))),
                };
            },
        }));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'installChatExtensions',
            triggerCharacters: [chatAgentLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                if (!model.getLineContent(1).startsWith(chatAgentLeader)) {
                    return;
                }
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (widget?.location !== ChatAgentLocation.Panel ||
                    widget.input.currentMode !== ChatMode.Ask) {
                    return;
                }
                const range = computeCompletionRanges(model, position, /(@|\/)\w*/g);
                if (!range) {
                    return;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const label = localize('installLabel', 'Install Chat Extensions...');
                const item = {
                    label,
                    insertText: '',
                    range,
                    kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway
                    command: {
                        id: 'workbench.extensions.search',
                        title: '',
                        arguments: ['@tag:chat-participant'],
                    },
                    filterText: chatAgentLeader + label,
                    sortText: 'zzz',
                };
                return {
                    suggestions: [item],
                };
            },
        }));
    }
    getAgentCompletionDetails(agent) {
        const isAllowed = this.chatAgentNameService.getAgentNameRestriction(agent);
        const agentLabel = `${chatAgentLeader}${isAllowed ? agent.name : getFullyQualifiedId(agent)}`;
        const isDupe = isAllowed && this.chatAgentService.agentHasDupeName(agent.id);
        return { label: agentLabel, isDupe };
    }
};
AgentCompletions = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IChatWidgetService),
    __param(2, IChatAgentService),
    __param(3, IChatAgentNameService)
], AgentCompletions);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(AgentCompletions, 4 /* LifecyclePhase.Eventually */);
class AssignSelectedAgentAction extends Action2 {
    static { this.ID = 'workbench.action.chat.assignSelectedAgent'; }
    constructor() {
        super({
            id: AssignSelectedAgentAction.ID,
            title: '', // not displayed
        });
    }
    async run(accessor, ...args) {
        const arg = args[0];
        if (!arg || !arg.widget || !arg.agent) {
            return;
        }
        arg.widget.lastSelectedAgent = arg.agent;
    }
}
registerAction2(AssignSelectedAgentAction);
class ReferenceArgument {
    constructor(widget, variable) {
        this.widget = widget;
        this.variable = variable;
    }
}
let BuiltinDynamicCompletions = class BuiltinDynamicCompletions extends Disposable {
    static { BuiltinDynamicCompletions_1 = this; }
    static { this.addReferenceCommand = '_addReferenceCmd'; }
    static { this.VariableNameDef = new RegExp(`${chatVariableLeader}[\\w:]*`, 'g'); } // MUST be using `g`-flag
    constructor(historyService, workspaceContextService, searchService, labelService, languageFeaturesService, chatWidgetService, _chatEditingService, instantiationService, outlineService, editorService, configurationService, fileService, markerService) {
        super();
        this.historyService = historyService;
        this.workspaceContextService = workspaceContextService;
        this.searchService = searchService;
        this.labelService = labelService;
        this.languageFeaturesService = languageFeaturesService;
        this.chatWidgetService = chatWidgetService;
        this._chatEditingService = _chatEditingService;
        this.instantiationService = instantiationService;
        this.outlineService = outlineService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        // File completions
        this.registerVariableCompletions('file', async ({ widget, range, position, model }, token) => {
            if (!widget.supportsFileReferences) {
                return null;
            }
            const result = { suggestions: [] };
            const afterRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + '#file:'.length);
            result.suggestions.push({
                label: `${chatVariableLeader}file`,
                insertText: `${chatVariableLeader}file:`,
                documentation: localize('pickFileLabel', 'Pick a file'),
                range,
                kind: 18 /* CompletionItemKind.Text */,
                command: {
                    id: SelectAndInsertFileAction.ID,
                    title: SelectAndInsertFileAction.ID,
                    arguments: [{ widget, range: afterRange }],
                },
                sortText: 'z',
            });
            const range2 = computeCompletionRanges(model, position, new RegExp(`${chatVariableLeader}[^\\s]*`, 'g'), true);
            if (range2) {
                await this.addFileEntries(widget, result, range2, token);
            }
            return result;
        });
        // Folder completions
        this.registerVariableCompletions('folder', async ({ widget, range, position, model }, token) => {
            if (!widget.supportsFileReferences) {
                return null;
            }
            const result = { suggestions: [] };
            const afterRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + '#folder:'.length);
            result.suggestions.push({
                label: `${chatVariableLeader}folder`,
                insertText: `${chatVariableLeader}folder:`,
                documentation: localize('pickFolderLabel', 'Pick a folder'),
                range,
                kind: 18 /* CompletionItemKind.Text */,
                command: {
                    id: SelectAndInsertFolderAction.ID,
                    title: SelectAndInsertFolderAction.ID,
                    arguments: [{ widget, range: afterRange }],
                },
                sortText: 'z',
            });
            const range2 = computeCompletionRanges(model, position, new RegExp(`${chatVariableLeader}[^\\s]*`, 'g'), true);
            if (range2) {
                await this.addFolderEntries(widget, result, range2, token);
            }
            return result;
        });
        // Selection completion
        this.registerVariableCompletions('selection', ({ widget, range }, token) => {
            if (!widget.supportsFileReferences) {
                return;
            }
            if (widget.location === ChatAgentLocation.Editor) {
                return;
            }
            const active = this.editorService.activeTextEditorControl;
            if (!isCodeEditor(active)) {
                return;
            }
            const currentResource = active.getModel()?.uri;
            const currentSelection = active.getSelection();
            if (!currentSelection || !currentResource || currentSelection.isEmpty()) {
                return;
            }
            const basename = this.labelService.getUriBasenameLabel(currentResource);
            const text = `${chatVariableLeader}file:${basename}:${currentSelection.startLineNumber}-${currentSelection.endLineNumber}`;
            const fullRangeText = `:${currentSelection.startLineNumber}:${currentSelection.startColumn}-${currentSelection.endLineNumber}:${currentSelection.endColumn}`;
            const description = this.labelService.getUriLabel(currentResource, { relative: true }) + fullRangeText;
            const result = { suggestions: [] };
            result.suggestions.push({
                label: { label: `${chatVariableLeader}selection`, description },
                filterText: `${chatVariableLeader}selection`,
                insertText: range.varWord?.endColumn === range.replace.endColumn ? `${text} ` : text,
                range,
                kind: 18 /* CompletionItemKind.Text */,
                sortText: 'z',
                command: {
                    id: BuiltinDynamicCompletions_1.addReferenceCommand,
                    title: '',
                    arguments: [
                        new ReferenceArgument(widget, {
                            id: 'vscode.selection',
                            prefix: 'file',
                            isFile: true,
                            range: {
                                startLineNumber: range.replace.startLineNumber,
                                startColumn: range.replace.startColumn,
                                endLineNumber: range.replace.endLineNumber,
                                endColumn: range.replace.startColumn + text.length,
                            },
                            data: { range: currentSelection, uri: currentResource },
                        }),
                    ],
                },
            });
            return result;
        });
        // Symbol completions
        this.registerVariableCompletions('symbol', ({ widget, range, position, model }, token) => {
            if (!widget.supportsFileReferences) {
                return null;
            }
            const result = { suggestions: [] };
            const afterRangeSym = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + '#sym:'.length);
            result.suggestions.push({
                label: `${chatVariableLeader}sym`,
                insertText: `${chatVariableLeader}sym:`,
                documentation: localize('pickSymbolLabel', 'Pick a symbol'),
                range,
                kind: 18 /* CompletionItemKind.Text */,
                command: {
                    id: SelectAndInsertSymAction.ID,
                    title: SelectAndInsertSymAction.ID,
                    arguments: [{ widget, range: afterRangeSym }],
                },
                sortText: 'z',
            });
            const range2 = computeCompletionRanges(model, position, new RegExp(`${chatVariableLeader}[^\\s]*`, 'g'), true);
            if (range2) {
                this.addSymbolEntries(widget, result, range2, token);
            }
            return result;
        });
        // Problems completions, we just attach all problems in this case
        this.registerVariableCompletions(SelectAndInsertProblemAction.Name, ({ widget, range, position, model }, token) => {
            const stats = markerService.getStatistics();
            if (!stats.errors && !stats.warnings) {
                return null;
            }
            const result = { suggestions: [] };
            const completedText = `${chatVariableLeader}${SelectAndInsertProblemAction.Name}:`;
            const afterTextRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + completedText.length);
            result.suggestions.push({
                label: `${chatVariableLeader}${SelectAndInsertProblemAction.Name}`,
                insertText: completedText,
                documentation: localize('pickProblemsLabel', 'Problems in your workspace'),
                range,
                kind: 18 /* CompletionItemKind.Text */,
                command: {
                    id: SelectAndInsertProblemAction.ID,
                    title: SelectAndInsertProblemAction.ID,
                    arguments: [{ widget, range: afterTextRange }],
                },
                sortText: 'z',
            });
            return result;
        });
        this._register(CommandsRegistry.registerCommand(BuiltinDynamicCompletions_1.addReferenceCommand, (_services, arg) => this.cmdAddReference(arg)));
        this.queryBuilder = this.instantiationService.createInstance(QueryBuilder);
    }
    registerVariableCompletions(debugName, provider) {
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: `chatVarCompletions-${debugName}`,
            triggerCharacters: [chatVariableLeader],
            provideCompletionItems: async (model, position, context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget) {
                    return;
                }
                const range = computeCompletionRanges(model, position, BuiltinDynamicCompletions_1.VariableNameDef, true);
                if (range) {
                    return provider({ model, position, widget, range, context }, token);
                }
                return;
            },
        }));
    }
    async addFileEntries(widget, result, info, token) {
        const makeFileCompletionItem = (resource, description) => {
            const basename = this.labelService.getUriBasenameLabel(resource);
            const text = `${chatVariableLeader}file:${basename}`;
            const uriLabel = this.labelService.getUriLabel(resource, { relative: true });
            const labelDescription = description
                ? localize('fileEntryDescription', '{0} ({1})', uriLabel, description)
                : uriLabel;
            const sortText = description ? 'z' : '{'; // after `z`
            return {
                label: { label: basename, description: labelDescription },
                filterText: `${chatVariableLeader}${basename}`,
                insertText: info.varWord?.endColumn === info.replace.endColumn ? `${text} ` : text,
                range: info,
                kind: 20 /* CompletionItemKind.File */,
                sortText,
                command: {
                    id: BuiltinDynamicCompletions_1.addReferenceCommand,
                    title: '',
                    arguments: [
                        new ReferenceArgument(widget, {
                            id: 'vscode.file',
                            prefix: 'file',
                            isFile: true,
                            range: {
                                startLineNumber: info.replace.startLineNumber,
                                startColumn: info.replace.startColumn,
                                endLineNumber: info.replace.endLineNumber,
                                endColumn: info.replace.startColumn + text.length,
                            },
                            data: resource,
                        }),
                    ],
                },
            };
        };
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(chatVariableLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(1); // remove leading #
        }
        const seen = new ResourceSet();
        const len = result.suggestions.length;
        // RELATED FILES
        if (widget.input.currentMode !== ChatMode.Ask &&
            widget.viewModel &&
            widget.viewModel.model.editingSession) {
            const relatedFiles = (await raceTimeout(this._chatEditingService.getRelatedFiles(widget.viewModel.sessionId, widget.getInput(), widget.attachmentModel.fileAttachments, token), 200)) ?? [];
            for (const relatedFileGroup of relatedFiles) {
                for (const relatedFile of relatedFileGroup.files) {
                    if (seen.has(relatedFile.uri)) {
                        continue;
                    }
                    seen.add(relatedFile.uri);
                    result.suggestions.push(makeFileCompletionItem(relatedFile.uri, relatedFile.description));
                }
            }
        }
        // HISTORY
        // always take the last N items
        for (const item of this.historyService.getHistory()) {
            if (!item.resource || !this.workspaceContextService.getWorkspaceFolder(item.resource)) {
                // ignore "forgein" editors
                continue;
            }
            if (pattern) {
                // use pattern if available
                const basename = this.labelService.getUriBasenameLabel(item.resource).toLowerCase();
                if (!isPatternInWord(pattern, 0, pattern.length, basename, 0, basename.length)) {
                    continue;
                }
            }
            seen.add(item.resource);
            const newLen = result.suggestions.push(makeFileCompletionItem(item.resource));
            if (newLen - len >= 5) {
                break;
            }
        }
        // SEARCH
        // use file search when having a pattern
        if (pattern) {
            const cacheKey = this.updateCacheKey();
            const query = this.queryBuilder.file(this.workspaceContextService.getWorkspace().folders, {
                filePattern: pattern,
                sortByScore: true,
                maxResults: 250,
                cacheKey: cacheKey.key,
            });
            const data = await this.searchService.fileSearch(query, token);
            for (const match of data.results) {
                if (seen.has(match.resource)) {
                    // already included via history
                    continue;
                }
                result.suggestions.push(makeFileCompletionItem(match.resource));
            }
        }
        // mark results as incomplete because further typing might yield
        // in more search results
        result.incomplete = true;
    }
    async addFolderEntries(widget, result, info, token) {
        const folderLeader = `${chatVariableLeader}folder:`;
        const makeFolderCompletionItem = (resource, description) => {
            const basename = this.labelService.getUriBasenameLabel(resource);
            const text = `${folderLeader}${basename}`;
            const uriLabel = this.labelService.getUriLabel(dirname(resource), { relative: true });
            const labelDescription = description
                ? localize('folderEntryDescription', '{0} ({1})', uriLabel, description)
                : uriLabel;
            const sortText = description ? 'z' : '{'; // after `z`
            return {
                label: { label: basename, description: labelDescription },
                filterText: `${folderLeader}${basename}`,
                insertText: info.varWord?.endColumn === info.replace.endColumn ? `${text} ` : text,
                range: info,
                kind: 23 /* CompletionItemKind.Folder */,
                sortText,
                command: {
                    id: BuiltinDynamicCompletions_1.addReferenceCommand,
                    title: '',
                    arguments: [
                        new ReferenceArgument(widget, {
                            id: 'vscode.folder',
                            prefix: 'folder',
                            isFile: false,
                            isDirectory: true,
                            range: {
                                startLineNumber: info.replace.startLineNumber,
                                startColumn: info.replace.startColumn,
                                endLineNumber: info.replace.endLineNumber,
                                endColumn: info.replace.startColumn + text.length,
                            },
                            data: resource,
                        }),
                    ],
                },
            };
        };
        const seen = new ResourceSet();
        const workspaces = this.workspaceContextService
            .getWorkspace()
            .folders.map((folder) => folder.uri);
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(folderLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(folderLeader.length);
            for (const folder of await getTopLevelFolders(workspaces, this.fileService)) {
                result.suggestions.push(makeFolderCompletionItem(folder));
                seen.add(folder);
            }
        }
        // SEARCH
        // use folder search when having a pattern
        if (pattern) {
            const cacheKey = this.updateCacheKey();
            const folders = await Promise.all(workspaces.map((workspace) => searchFolders(workspace, pattern, true, token, cacheKey.key, this.configurationService, this.searchService)));
            for (const resource of folders.flat()) {
                if (seen.has(resource)) {
                    // already included via history
                    continue;
                }
                seen.add(resource);
                result.suggestions.push(makeFolderCompletionItem(resource));
            }
        }
        // mark results as incomplete because further typing might yield
        // in more search results
        result.incomplete = true;
    }
    addSymbolEntries(widget, result, info, token) {
        const makeSymbolCompletionItem = (symbolItem, pattern) => {
            const text = `${chatVariableLeader}sym:${symbolItem.name}`;
            const resource = symbolItem.location.uri;
            const uriLabel = this.labelService.getUriLabel(resource, { relative: true });
            const sortText = pattern ? '{' /* after z */ : '|'; /* after { */
            return {
                label: { label: symbolItem.name, description: uriLabel },
                filterText: `${chatVariableLeader}${symbolItem.name}`,
                insertText: info.varWord?.endColumn === info.replace.endColumn ? `${text} ` : text,
                range: info,
                kind: SymbolKinds.toCompletionKind(symbolItem.kind),
                sortText,
                command: {
                    id: BuiltinDynamicCompletions_1.addReferenceCommand,
                    title: '',
                    arguments: [
                        new ReferenceArgument(widget, {
                            id: 'vscode.symbol',
                            prefix: 'sym',
                            fullName: symbolItem.name,
                            range: {
                                startLineNumber: info.replace.startLineNumber,
                                startColumn: info.replace.startColumn,
                                endLineNumber: info.replace.endLineNumber,
                                endColumn: info.replace.startColumn + text.length,
                            },
                            data: symbolItem.location,
                        }),
                    ],
                },
            };
        };
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(chatVariableLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(1); // remove leading #
        }
        const symbolsToAdd = [];
        for (const outlineModel of this.outlineService.getCachedModels()) {
            if (pattern) {
                symbolsToAdd.push(...outlineModel
                    .asListOfDocumentSymbols()
                    .map((symbol) => ({ symbol, uri: outlineModel.uri })));
            }
            else {
                symbolsToAdd.push(...outlineModel.getTopLevelSymbols().map((symbol) => ({ symbol, uri: outlineModel.uri })));
            }
        }
        const symbolsToAddFiltered = symbolsToAdd.filter((fileSymbol) => {
            switch (fileSymbol.symbol.kind) {
                case 9 /* SymbolKind.Enum */:
                case 4 /* SymbolKind.Class */:
                case 5 /* SymbolKind.Method */:
                case 11 /* SymbolKind.Function */:
                case 2 /* SymbolKind.Namespace */:
                case 1 /* SymbolKind.Module */:
                case 10 /* SymbolKind.Interface */:
                    return true;
                default:
                    return false;
            }
        });
        for (const symbol of symbolsToAddFiltered) {
            result.suggestions.push(makeSymbolCompletionItem({ ...symbol.symbol, location: { uri: symbol.uri, range: symbol.symbol.range } }, pattern ?? ''));
        }
        result.incomplete = !!pattern;
    }
    updateCacheKey() {
        if (this.cacheKey && Date.now() - this.cacheKey.time > 60000) {
            this.searchService.clearCache(this.cacheKey.key);
            this.cacheKey = undefined;
        }
        if (!this.cacheKey) {
            this.cacheKey = {
                key: generateUuid(),
                time: Date.now(),
            };
        }
        this.cacheKey.time = Date.now();
        return this.cacheKey;
    }
    cmdAddReference(arg) {
        // invoked via the completion command
        arg.widget
            .getContrib(ChatDynamicVariableModel.ID)
            ?.addReference(arg.variable);
    }
};
BuiltinDynamicCompletions = BuiltinDynamicCompletions_1 = __decorate([
    __param(0, IHistoryService),
    __param(1, IWorkspaceContextService),
    __param(2, ISearchService),
    __param(3, ILabelService),
    __param(4, ILanguageFeaturesService),
    __param(5, IChatWidgetService),
    __param(6, IChatEditingService),
    __param(7, IInstantiationService),
    __param(8, IOutlineModelService),
    __param(9, IEditorService),
    __param(10, IConfigurationService),
    __param(11, IFileService),
    __param(12, IMarkerService)
], BuiltinDynamicCompletions);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BuiltinDynamicCompletions, 4 /* LifecyclePhase.Eventually */);
export function computeCompletionRanges(model, position, reg, onlyOnWordStart = false) {
    const varWord = getWordAtText(position.column, reg, model.getLineContent(position.lineNumber), 0);
    if (!varWord && model.getWordUntilPosition(position).word) {
        // inside a "normal" word
        return;
    }
    if (!varWord && position.column > 1) {
        const textBefore = model.getValueInRange(new Range(position.lineNumber, position.column - 1, position.lineNumber, position.column));
        if (textBefore !== ' ') {
            return;
        }
    }
    if (varWord && onlyOnWordStart) {
        const wordBefore = model.getWordUntilPosition({
            lineNumber: position.lineNumber,
            column: varWord.startColumn,
        });
        if (wordBefore.word) {
            // inside a word
            return;
        }
    }
    let insert;
    let replace;
    if (!varWord) {
        insert = replace = Range.fromPositions(position);
    }
    else {
        insert = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, position.column);
        replace = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, varWord.endColumn);
    }
    return { insert, replace, varWord };
}
function isEmptyUpToCompletionWord(model, rangeResult) {
    const startToCompletionWordStart = new Range(1, 1, rangeResult.replace.startLineNumber, rangeResult.replace.startColumn);
    return !!model.getValueInRange(startToCompletionWordStart).match(/^\s*$/);
}
let ToolCompletions = class ToolCompletions extends Disposable {
    static { ToolCompletions_1 = this; }
    static { this.VariableNameDef = new RegExp(`(?<=^|\\s)${chatVariableLeader}\\w*`, 'g'); } // MUST be using `g`-flag
    constructor(languageFeaturesService, chatWidgetService, toolsService) {
        super();
        this.languageFeaturesService = languageFeaturesService;
        this.chatWidgetService = chatWidgetService;
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatVariables',
            triggerCharacters: [chatVariableLeader],
            provideCompletionItems: async (model, position, _context, _token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget) {
                    return null;
                }
                const range = computeCompletionRanges(model, position, ToolCompletions_1.VariableNameDef, true);
                if (!range) {
                    return null;
                }
                const usedTools = widget.parsedInput.parts.filter((p) => p instanceof ChatRequestToolPart);
                const usedToolNames = new Set(usedTools.map((v) => v.toolName));
                const toolItems = [];
                toolItems.push(...Array.from(toolsService.getTools())
                    .filter((t) => t.canBeReferencedInPrompt)
                    .filter((t) => !usedToolNames.has(t.toolReferenceName ?? ''))
                    .map((t) => {
                    const withLeader = `${chatVariableLeader}${t.toolReferenceName}`;
                    return {
                        label: withLeader,
                        range,
                        insertText: withLeader + ' ',
                        documentation: t.userDescription,
                        kind: 18 /* CompletionItemKind.Text */,
                        sortText: 'z',
                    };
                }));
                return {
                    suggestions: toolItems,
                };
            },
        }));
    }
};
ToolCompletions = ToolCompletions_1 = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IChatWidgetService),
    __param(2, ILanguageModelToolsService)
], ToolCompletions);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ToolCompletions, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0Q29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2NoYXRJbnB1dENvbXBsZXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQW1CLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2hHLE9BQU8sRUFVTixXQUFXLEdBQ1gsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVsRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQTtBQUM1RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUs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