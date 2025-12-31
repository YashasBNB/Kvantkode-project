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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0Q29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0SW5wdXRDb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFtQixhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNoRyxPQUFPLEVBVU4sV0FBVyxHQUNYLE1BQU0sMkNBQTJDLENBQUE7QUFFbEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDcEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDNUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYs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