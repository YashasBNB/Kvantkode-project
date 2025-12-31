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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { inputPlaceholderForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { chatSlashCommandBackground, chatSlashCommandForeground } from '../../common/chatColors.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestSlashCommandPart, ChatRequestTextPart, ChatRequestToolPart, chatAgentLeader, chatSubcommandLeader, } from '../../common/chatParserTypes.js';
import { ChatRequestParser } from '../../common/chatRequestParser.js';
import { ChatWidget } from '../chatWidget.js';
import { dynamicVariableDecorationType } from './chatDynamicVariables.js';
const decorationDescription = 'chat';
const placeholderDecorationType = 'chat-session-detail';
const slashCommandTextDecorationType = 'chat-session-text';
const variableTextDecorationType = 'chat-variable-text';
function agentAndCommandToKey(agent, subcommand) {
    return subcommand ? `${agent.id}__${subcommand}` : agent.id;
}
let InputEditorDecorations = class InputEditorDecorations extends Disposable {
    constructor(widget, codeEditorService, themeService, chatAgentService) {
        super();
        this.widget = widget;
        this.codeEditorService = codeEditorService;
        this.themeService = themeService;
        this.chatAgentService = chatAgentService;
        this.id = 'inputEditorDecorations';
        this.previouslyUsedAgents = new Set();
        this.viewModelDisposables = this._register(new MutableDisposable());
        this.codeEditorService.registerDecorationType(decorationDescription, placeholderDecorationType, {});
        this._register(this.themeService.onDidColorThemeChange(() => this.updateRegisteredDecorationTypes()));
        this.updateRegisteredDecorationTypes();
        this.updateInputEditorDecorations();
        this._register(this.widget.inputEditor.onDidChangeModelContent(() => this.updateInputEditorDecorations()));
        this._register(this.widget.onDidChangeParsedInput(() => this.updateInputEditorDecorations()));
        this._register(this.widget.onDidChangeViewModel(() => {
            this.registerViewModelListeners();
            this.previouslyUsedAgents.clear();
            this.updateInputEditorDecorations();
        }));
        this._register(this.widget.onDidSubmitAgent((e) => {
            this.previouslyUsedAgents.add(agentAndCommandToKey(e.agent, e.slashCommand?.name));
        }));
        this._register(this.chatAgentService.onDidChangeAgents(() => this.updateInputEditorDecorations()));
        this.registerViewModelListeners();
    }
    registerViewModelListeners() {
        this.viewModelDisposables.value = this.widget.viewModel?.onDidChange((e) => {
            if (e?.kind === 'changePlaceholder' || e?.kind === 'initialize') {
                this.updateInputEditorDecorations();
            }
        });
    }
    updateRegisteredDecorationTypes() {
        this.codeEditorService.removeDecorationType(variableTextDecorationType);
        this.codeEditorService.removeDecorationType(dynamicVariableDecorationType);
        this.codeEditorService.removeDecorationType(slashCommandTextDecorationType);
        const theme = this.themeService.getColorTheme();
        this.codeEditorService.registerDecorationType(decorationDescription, slashCommandTextDecorationType, {
            color: theme.getColor(chatSlashCommandForeground)?.toString(),
            backgroundColor: theme.getColor(chatSlashCommandBackground)?.toString(),
            borderRadius: '3px',
        });
        this.codeEditorService.registerDecorationType(decorationDescription, variableTextDecorationType, {
            color: theme.getColor(chatSlashCommandForeground)?.toString(),
            backgroundColor: theme.getColor(chatSlashCommandBackground)?.toString(),
            borderRadius: '3px',
        });
        this.codeEditorService.registerDecorationType(decorationDescription, dynamicVariableDecorationType, {
            color: theme.getColor(chatSlashCommandForeground)?.toString(),
            backgroundColor: theme.getColor(chatSlashCommandBackground)?.toString(),
            borderRadius: '3px',
        });
        this.updateInputEditorDecorations();
    }
    getPlaceholderColor() {
        const theme = this.themeService.getColorTheme();
        const transparentForeground = theme.getColor(inputPlaceholderForeground);
        return transparentForeground?.toString();
    }
    async updateInputEditorDecorations() {
        const inputValue = this.widget.inputEditor.getValue();
        const viewModel = this.widget.viewModel;
        if (!viewModel) {
            return;
        }
        if (!inputValue) {
            const defaultAgent = this.chatAgentService.getDefaultAgent(this.widget.location, this.widget.input.currentMode);
            const decoration = [
                {
                    range: {
                        startLineNumber: 1,
                        endLineNumber: 1,
                        startColumn: 1,
                        endColumn: 1000,
                    },
                    renderOptions: {
                        after: {
                            contentText: viewModel.inputPlaceholder || (defaultAgent?.description ?? ''),
                            color: this.getPlaceholderColor(),
                        },
                    },
                },
            ];
            this.widget.inputEditor.setDecorationsByType(decorationDescription, placeholderDecorationType, decoration);
            return;
        }
        const parsedRequest = this.widget.parsedInput.parts;
        let placeholderDecoration;
        const agentPart = parsedRequest.find((p) => p instanceof ChatRequestAgentPart);
        const agentSubcommandPart = parsedRequest.find((p) => p instanceof ChatRequestAgentSubcommandPart);
        const slashCommandPart = parsedRequest.find((p) => p instanceof ChatRequestSlashCommandPart);
        const exactlyOneSpaceAfterPart = (part) => {
            const partIdx = parsedRequest.indexOf(part);
            if (parsedRequest.length > partIdx + 2) {
                return false;
            }
            const nextPart = parsedRequest[partIdx + 1];
            return nextPart && nextPart instanceof ChatRequestTextPart && nextPart.text === ' ';
        };
        const getRangeForPlaceholder = (part) => ({
            startLineNumber: part.editorRange.startLineNumber,
            endLineNumber: part.editorRange.endLineNumber,
            startColumn: part.editorRange.endColumn + 1,
            endColumn: 1000,
        });
        const onlyAgentAndWhitespace = agentPart &&
            parsedRequest.every((p) => (p instanceof ChatRequestTextPart && !p.text.trim().length) ||
                p instanceof ChatRequestAgentPart);
        if (onlyAgentAndWhitespace) {
            // Agent reference with no other text - show the placeholder
            const isFollowupSlashCommand = this.previouslyUsedAgents.has(agentAndCommandToKey(agentPart.agent, undefined));
            const shouldRenderFollowupPlaceholder = isFollowupSlashCommand && agentPart.agent.metadata.followupPlaceholder;
            if (agentPart.agent.description && exactlyOneSpaceAfterPart(agentPart)) {
                placeholderDecoration = [
                    {
                        range: getRangeForPlaceholder(agentPart),
                        renderOptions: {
                            after: {
                                contentText: shouldRenderFollowupPlaceholder
                                    ? agentPart.agent.metadata.followupPlaceholder
                                    : agentPart.agent.description,
                                color: this.getPlaceholderColor(),
                            },
                        },
                    },
                ];
            }
        }
        const onlyAgentAndAgentCommandAndWhitespace = agentPart &&
            agentSubcommandPart &&
            parsedRequest.every((p) => (p instanceof ChatRequestTextPart && !p.text.trim().length) ||
                p instanceof ChatRequestAgentPart ||
                p instanceof ChatRequestAgentSubcommandPart);
        if (onlyAgentAndAgentCommandAndWhitespace) {
            // Agent reference and subcommand with no other text - show the placeholder
            const isFollowupSlashCommand = this.previouslyUsedAgents.has(agentAndCommandToKey(agentPart.agent, agentSubcommandPart.command.name));
            const shouldRenderFollowupPlaceholder = isFollowupSlashCommand && agentSubcommandPart.command.followupPlaceholder;
            if (agentSubcommandPart?.command.description &&
                exactlyOneSpaceAfterPart(agentSubcommandPart)) {
                placeholderDecoration = [
                    {
                        range: getRangeForPlaceholder(agentSubcommandPart),
                        renderOptions: {
                            after: {
                                contentText: shouldRenderFollowupPlaceholder
                                    ? agentSubcommandPart.command.followupPlaceholder
                                    : agentSubcommandPart.command.description,
                                color: this.getPlaceholderColor(),
                            },
                        },
                    },
                ];
            }
        }
        const onlyAgentCommandAndWhitespace = agentSubcommandPart &&
            parsedRequest.every((p) => (p instanceof ChatRequestTextPart && !p.text.trim().length) ||
                p instanceof ChatRequestAgentSubcommandPart);
        if (onlyAgentCommandAndWhitespace) {
            // Agent subcommand with no other text - show the placeholder
            if (agentSubcommandPart?.command.description &&
                exactlyOneSpaceAfterPart(agentSubcommandPart)) {
                placeholderDecoration = [
                    {
                        range: getRangeForPlaceholder(agentSubcommandPart),
                        renderOptions: {
                            after: {
                                contentText: agentSubcommandPart.command.description,
                                color: this.getPlaceholderColor(),
                            },
                        },
                    },
                ];
            }
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, placeholderDecorationType, placeholderDecoration ?? []);
        const textDecorations = [];
        if (agentPart) {
            textDecorations.push({ range: agentPart.editorRange });
        }
        if (agentSubcommandPart) {
            textDecorations.push({
                range: agentSubcommandPart.editorRange,
                hoverMessage: new MarkdownString(agentSubcommandPart.command.description),
            });
        }
        if (slashCommandPart) {
            textDecorations.push({ range: slashCommandPart.editorRange });
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, slashCommandTextDecorationType, textDecorations);
        const varDecorations = [];
        const toolParts = parsedRequest.filter((p) => p instanceof ChatRequestToolPart);
        for (const tool of toolParts) {
            varDecorations.push({ range: tool.editorRange });
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, variableTextDecorationType, varDecorations);
    }
};
InputEditorDecorations = __decorate([
    __param(1, ICodeEditorService),
    __param(2, IThemeService),
    __param(3, IChatAgentService)
], InputEditorDecorations);
class InputEditorSlashCommandMode extends Disposable {
    constructor(widget) {
        super();
        this.widget = widget;
        this.id = 'InputEditorSlashCommandMode';
        this._register(this.widget.onDidChangeAgent((e) => {
            if ((e.slashCommand && e.slashCommand.isSticky) ||
                (!e.slashCommand && e.agent.metadata.isSticky)) {
                this.repopulateAgentCommand(e.agent, e.slashCommand);
            }
        }));
        this._register(this.widget.onDidSubmitAgent((e) => {
            this.repopulateAgentCommand(e.agent, e.slashCommand);
        }));
    }
    async repopulateAgentCommand(agent, slashCommand) {
        // Make sure we don't repopulate if the user already has something in the input
        if (this.widget.inputEditor.getValue().trim()) {
            return;
        }
        let value;
        if (slashCommand && slashCommand.isSticky) {
            value = `${chatAgentLeader}${agent.name} ${chatSubcommandLeader}${slashCommand.name} `;
        }
        else if (agent.metadata.isSticky) {
            value = `${chatAgentLeader}${agent.name} `;
        }
        if (value) {
            this.widget.inputEditor.setValue(value);
            this.widget.inputEditor.setPosition({ lineNumber: 1, column: value.length + 1 });
        }
    }
}
ChatWidget.CONTRIBS.push(InputEditorDecorations, InputEditorSlashCommandMode);
let ChatTokenDeleter = class ChatTokenDeleter extends Disposable {
    constructor(widget, instantiationService) {
        super();
        this.widget = widget;
        this.instantiationService = instantiationService;
        this.id = 'chatTokenDeleter';
        const parser = this.instantiationService.createInstance(ChatRequestParser);
        const inputValue = this.widget.inputEditor.getValue();
        let previousInputValue;
        let previousSelectedAgent;
        // A simple heuristic to delete the previous token when the user presses backspace.
        // The sophisticated way to do this would be to have a parse tree that can be updated incrementally.
        this._register(this.widget.inputEditor.onDidChangeModelContent((e) => {
            if (!previousInputValue) {
                previousInputValue = inputValue;
                previousSelectedAgent = this.widget.lastSelectedAgent;
            }
            // Don't try to handle multicursor edits right now
            const change = e.changes[0];
            // If this was a simple delete, try to find out whether it was inside a token
            if (!change.text && this.widget.viewModel) {
                const previousParsedValue = parser.parseChatRequest(this.widget.viewModel.sessionId, previousInputValue, widget.location, { selectedAgent: previousSelectedAgent, mode: this.widget.input.currentMode });
                // For dynamic variables, this has to happen in ChatDynamicVariableModel with the other bookkeeping
                const deletableTokens = previousParsedValue.parts.filter((p) => p instanceof ChatRequestAgentPart ||
                    p instanceof ChatRequestAgentSubcommandPart ||
                    p instanceof ChatRequestSlashCommandPart ||
                    p instanceof ChatRequestToolPart);
                deletableTokens.forEach((token) => {
                    const deletedRangeOfToken = Range.intersectRanges(token.editorRange, change.range);
                    // Part of this token was deleted, or the space after it was deleted, and the deletion range doesn't go off the front of the token, for simpler math
                    if (deletedRangeOfToken &&
                        Range.compareRangesUsingStarts(token.editorRange, change.range) < 0) {
                        // Assume single line tokens
                        const length = deletedRangeOfToken.endColumn - deletedRangeOfToken.startColumn;
                        const rangeToDelete = new Range(token.editorRange.startLineNumber, token.editorRange.startColumn, token.editorRange.endLineNumber, token.editorRange.endColumn - length);
                        this.widget.inputEditor.executeEdits(this.id, [
                            {
                                range: rangeToDelete,
                                text: '',
                            },
                        ]);
                        this.widget.refreshParsedInput();
                    }
                });
            }
            previousInputValue = this.widget.inputEditor.getValue();
            previousSelectedAgent = this.widget.lastSelectedAgent;
        }));
    }
};
ChatTokenDeleter = __decorate([
    __param(1, IInstantiationService)
], ChatTokenDeleter);
ChatWidget.CONTRIBS.push(ChatTokenDeleter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0RWRpdG9yQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2NoYXRJbnB1dEVkaXRvckNvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBcUMsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLDhCQUE4QixFQUM5QiwyQkFBMkIsRUFDM0IsbUJBQW1CLEVBQ25CLG1CQUFtQixFQUVuQixlQUFlLEVBQ2Ysb0JBQW9CLEdBQ3BCLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzdDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFN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