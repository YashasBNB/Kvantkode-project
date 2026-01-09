/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { chat_userMessageContent, isABuiltinToolName } from '../common/prompt/prompts.js';
import { getErrorMessage, } from '../common/sendLLMMessageTypes.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { approvalTypeOfBuiltinToolName, } from '../common/toolsServiceTypes.js';
import { IToolsService } from './toolsService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { Position } from '../../../../editor/common/core/position.js';
import { IMetricsService } from '../common/metricsService.js';
import { shorten } from '../../../../base/common/labels.js';
import { IVoidModelService } from '../common/voidModelService.js';
import { findLast, findLastIdx } from '../../../../base/common/arraysFind.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { truncate } from '../../../../base/common/strings.js';
import { THREAD_STORAGE_KEY } from '../common/storageKeys.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { timeout } from '../../../../base/common/async.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IDirectoryStrService } from '../common/directoryStrService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IMCPService } from '../common/mcpService.js';
import { IContinueChatClient } from './continueChatClient.js';
// related to retrying when LLM message has error
const CHAT_RETRIES = 3;
const RETRY_DELAY = 2500;
const findStagingSelectionIndex = (currentSelections, newSelection) => {
    if (!currentSelections)
        return null;
    for (let i = 0; i < currentSelections.length; i += 1) {
        const s = currentSelections[i];
        if (s.uri.fsPath !== newSelection.uri.fsPath)
            continue;
        if (s.type === 'File' && newSelection.type === 'File') {
            return i;
        }
        if (s.type === 'CodeSelection' && newSelection.type === 'CodeSelection') {
            if (s.uri.fsPath !== newSelection.uri.fsPath)
                continue;
            // if there's any collision return true
            const [oldStart, oldEnd] = s.range;
            const [newStart, newEnd] = newSelection.range;
            if (oldStart !== newStart || oldEnd !== newEnd)
                continue;
            return i;
        }
        if (s.type === 'Folder' && newSelection.type === 'Folder') {
            return i;
        }
    }
    return null;
};
const defaultMessageState = {
    stagingSelections: [],
    isBeingEdited: false,
};
const newThreadObject = () => {
    const now = new Date().toISOString();
    return {
        id: generateUuid(),
        createdAt: now,
        lastModified: now,
        messages: [],
        state: {
            currCheckpointIdx: null,
            stagingSelections: [],
            focusedMessageIdx: undefined,
            linksOfMessageIdx: {},
        },
        filesWithUserChanges: new Set(),
    };
};
export const IChatThreadService = createDecorator('voidChatThreadService');
let ChatThreadService = class ChatThreadService extends Disposable {
    // used in checkpointing
    // private readonly _userModifiedFilesToCheckInCheckpoints = new LRUCache<string, null>(50)
    constructor(_storageService, _voidModelService, _llmMessageService, _toolsService, _settingsService, _languageFeaturesService, _metricsService, _editCodeService, _notificationService, _convertToLLMMessagesService, _workspaceContextService, _directoryStringService, _fileService, _mcpService, _commandService, _continueChatClient) {
        super();
        this._storageService = _storageService;
        this._voidModelService = _voidModelService;
        this._llmMessageService = _llmMessageService;
        this._toolsService = _toolsService;
        this._settingsService = _settingsService;
        this._languageFeaturesService = _languageFeaturesService;
        this._metricsService = _metricsService;
        this._editCodeService = _editCodeService;
        this._notificationService = _notificationService;
        this._convertToLLMMessagesService = _convertToLLMMessagesService;
        this._workspaceContextService = _workspaceContextService;
        this._directoryStringService = _directoryStringService;
        this._fileService = _fileService;
        this._mcpService = _mcpService;
        this._commandService = _commandService;
        this._continueChatClient = _continueChatClient;
        // this fires when the current thread changes at all (a switch of currentThread, or a message added to it, etc)
        this._onDidChangeCurrentThread = new Emitter();
        this.onDidChangeCurrentThread = this._onDidChangeCurrentThread.event;
        this._onDidChangeStreamState = new Emitter();
        this.onDidChangeStreamState = this._onDidChangeStreamState.event;
        this.streamState = {};
        this.dangerousSetState = (newState) => {
            this.state = newState;
            this._onDidChangeCurrentThread.fire();
        };
        this.resetState = () => {
            this.state = { allThreads: {}, currentThreadId: null }; // see constructor
            this.openNewThread();
            this._onDidChangeCurrentThread.fire();
        };
        // ---------- streaming ----------
        this._currentModelSelectionProps = () => {
            // these settings should not change throughout the loop (eg anthropic breaks if you change its thinking mode and it's using tools)
            const featureName = 'Chat';
            const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
            const modelSelectionOptions = modelSelection
                ? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]
                : undefined;
            return { modelSelection, modelSelectionOptions };
        };
        this._swapOutLatestStreamingToolWithResult = (threadId, tool) => {
            const messages = this.state.allThreads[threadId]?.messages;
            if (!messages)
                return false;
            const lastMsg = messages[messages.length - 1];
            if (!lastMsg)
                return false;
            if (lastMsg.role === 'tool' && lastMsg.type !== 'invalid_params') {
                this._editMessageInThread(threadId, messages.length - 1, tool);
                return true;
            }
            return false;
        };
        this._updateLatestTool = (threadId, tool) => {
            const swapped = this._swapOutLatestStreamingToolWithResult(threadId, tool);
            if (swapped)
                return;
            this._addMessageToThread(threadId, tool);
        };
        this._computeMCPServerOfToolName = (toolName) => {
            return this._mcpService.getMCPTools()?.find((t) => t.name === toolName)?.mcpServerName;
        };
        this.toolErrMsgs = {
            rejected: 'Tool call was rejected by the user.',
            interrupted: 'Tool call was interrupted by the user.',
            errWhenStringifying: (error) => `Tool call succeeded, but there was an error stringifying the output.\n${getErrorMessage(error)}`,
        };
        // private readonly _currentlyRunningToolInterruptor: { [threadId: string]: (() => void) | undefined } = {}
        // returns true when the tool call is waiting for user approval
        this._runToolCall = async (threadId, toolName, toolId, mcpServerName, opts) => {
            // compute these below
            let toolParams;
            let toolResult;
            let toolResultStr;
            // Check if it's a built-in tool
            const isBuiltInTool = isABuiltinToolName(toolName);
            if (!opts.preapproved) {
                // skip this if pre-approved
                // 1. validate tool params
                try {
                    if (isBuiltInTool) {
                        const params = this._toolsService.validateParams[toolName](opts.unvalidatedToolParams);
                        toolParams = params;
                    }
                    else {
                        toolParams = opts.unvalidatedToolParams;
                    }
                }
                catch (error) {
                    const errorMessage = getErrorMessage(error);
                    // Validation-stage fallback: if edit_file is missing search/replace blocks, try rewrite_file with latest assistant code block
                    const looksLikeMissingSR = toolName === 'edit_file' &&
                        /searchReplaceBlocks\s+must\s+be\s+a\s+string|No\s+Search\/?Replace\s+blocks/i.test(errorMessage);
                    if (looksLikeMissingSR) {
                        const messages = this.state.allThreads[threadId]?.messages ?? [];
                        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
                        const extractFirstCodeBlock = (md) => {
                            const regex = /```[\w+-]*\n([\s\S]*?)```/m;
                            const m = regex.exec(md || '');
                            if (!m)
                                return null;
                            const code = m[1] ?? '';
                            return code.trim() ? code : null;
                        };
                        const newContent = extractFirstCodeBlock(lastAssistant?.displayContent || '');
                        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                        const sels = (lastUser?.selections ?? []).filter((s) => s.type === 'File' || s.type === 'CodeSelection');
                        const uniqueFs = Array.from(new Set(sels.map((s) => s.uri.fsPath)));
                        if (newContent && uniqueFs.length === 1) {
                            const uri = sels.find((s) => s.uri.fsPath === uniqueFs[0]).uri;
                            const syntheticToolId = generateUuid();
                            return await this._runToolCall(threadId, 'rewrite_file', syntheticToolId, undefined, {
                                preapproved: false,
                                unvalidatedToolParams: { uri: uri.fsPath, new_content: newContent },
                            });
                        }
                    }
                    this._addMessageToThread(threadId, {
                        role: 'tool',
                        type: 'invalid_params',
                        rawParams: opts.unvalidatedToolParams,
                        result: null,
                        name: toolName,
                        content: errorMessage,
                        id: toolId,
                        mcpServerName,
                    });
                    return {};
                }
                // once validated, add checkpoint for edit
                if (toolName === 'edit_file') {
                    this._addToolEditCheckpoint({
                        threadId,
                        uri: toolParams.uri,
                    });
                }
                if (toolName === 'rewrite_file') {
                    this._addToolEditCheckpoint({
                        threadId,
                        uri: toolParams.uri,
                    });
                }
                // 2. if tool requires approval, break from the loop, awaiting approval
                const approvalType = isBuiltInTool ? approvalTypeOfBuiltinToolName[toolName] : 'MCP tools';
                if (approvalType) {
                    const autoApprove = this._settingsService.state.globalSettings.autoApprove[approvalType];
                    // add a tool_request because we use it for UI if a tool is loading (this should be improved in the future)
                    this._addMessageToThread(threadId, {
                        role: 'tool',
                        type: 'tool_request',
                        content: '(Awaiting user permission...)',
                        result: null,
                        name: toolName,
                        params: toolParams,
                        id: toolId,
                        rawParams: opts.unvalidatedToolParams,
                        mcpServerName,
                    });
                    if (!autoApprove) {
                        return { awaitingUserApproval: true };
                    }
                }
            }
            else {
                toolParams = opts.validatedParams;
            }
            // unified raw params for logging/tool message fields
            const rawParamsForLog = !opts.preapproved
                ? opts.unvalidatedToolParams
                : toolParams;
            // 3. call the tool
            // this._setStreamState(threadId, { isRunning: 'tool' }, 'merge')
            const runningTool = {
                role: 'tool',
                type: 'running_now',
                name: toolName,
                params: toolParams,
                content: '(value not received yet...)',
                result: null,
                id: toolId,
                rawParams: rawParamsForLog,
                mcpServerName,
            };
            this._updateLatestTool(threadId, runningTool);
            let interrupted = false;
            let resolveInterruptor = () => { };
            const interruptorPromise = new Promise((res) => {
                resolveInterruptor = res;
            });
            try {
                // set stream state
                this._setStreamState(threadId, {
                    isRunning: 'tool',
                    interrupt: interruptorPromise,
                    toolInfo: {
                        toolName,
                        toolParams,
                        id: toolId,
                        content: 'interrupted...',
                        rawParams: rawParamsForLog,
                        mcpServerName,
                    },
                });
                if (isBuiltInTool) {
                    const { result, interruptTool } = await this._toolsService.callTool[toolName](toolParams);
                    const interruptor = () => {
                        interrupted = true;
                        interruptTool?.();
                    };
                    resolveInterruptor(interruptor);
                    toolResult = await result;
                }
                else {
                    const mcpTools = this._mcpService.getMCPTools();
                    const mcpTool = mcpTools?.find((t) => t.name === toolName);
                    if (!mcpTool) {
                        throw new Error(`MCP tool ${toolName} not found`);
                    }
                    resolveInterruptor(() => { });
                    toolResult = (await this._mcpService.callMCPTool({
                        serverName: mcpTool.mcpServerName ?? 'unknown_mcp_server',
                        toolName: toolName,
                        params: toolParams,
                    })).result;
                }
                if (interrupted) {
                    return { interrupted: true };
                } // the tool result is added where we interrupt, not here
            }
            catch (error) {
                resolveInterruptor(() => { }); // resolve for the sake of it
                if (interrupted) {
                    return { interrupted: true };
                } // the tool result is added where we interrupt, not here
                const errorMessage = getErrorMessage(error);
                // Fallback: if edit_file received no search/replace blocks, try rewrite_file using latest assistant code block
                const looksLikeNoSRBlocks = toolName === 'edit_file' && /No\s+Search\/?Replace blocks were received/i.test(errorMessage);
                if (looksLikeNoSRBlocks) {
                    // extract latest assistant code block
                    const messages = this.state.allThreads[threadId]?.messages ?? [];
                    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
                    const extractFirstCodeBlock = (md) => {
                        const regex = /```[\w+-]*\n([\s\S]*?)```/m;
                        const m = regex.exec(md || '');
                        if (!m)
                            return null;
                        const code = m[1] ?? '';
                        return code.trim() ? code : null;
                    };
                    const newContent = extractFirstCodeBlock(lastAssistant?.displayContent || '');
                    // pick a single unique file from latest user message selections
                    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                    const sels = (lastUser?.selections ?? []).filter((s) => s.type === 'File' || s.type === 'CodeSelection');
                    const uniqueFs = Array.from(new Set(sels.map((s) => s.uri.fsPath)));
                    if (newContent && uniqueFs.length === 1) {
                        const uri = sels.find((s) => s.uri.fsPath === uniqueFs[0]).uri;
                        // Replace the failed edit with a rewrite_file call
                        const syntheticToolId = generateUuid();
                        return await this._runToolCall(threadId, 'rewrite_file', syntheticToolId, undefined, {
                            preapproved: false,
                            unvalidatedToolParams: { uri: uri.fsPath, new_content: newContent },
                        });
                    }
                }
                this._updateLatestTool(threadId, {
                    role: 'tool',
                    type: 'tool_error',
                    params: toolParams,
                    result: errorMessage,
                    name: toolName,
                    content: errorMessage,
                    id: toolId,
                    rawParams: rawParamsForLog,
                    mcpServerName,
                });
                return {};
            }
            // 4. stringify the result to give to the LLM
            try {
                if (isBuiltInTool) {
                    toolResultStr = this._toolsService.stringOfResult[toolName](toolParams, toolResult);
                }
                // For MCP tools, handle the result based on its type
                else {
                    toolResultStr = this._mcpService.stringifyResult(toolResult);
                }
            }
            catch (error) {
                const errorMessage = this.toolErrMsgs.errWhenStringifying(error);
                this._updateLatestTool(threadId, {
                    role: 'tool',
                    type: 'tool_error',
                    params: toolParams,
                    result: errorMessage,
                    name: toolName,
                    content: errorMessage,
                    id: toolId,
                    rawParams: rawParamsForLog,
                    mcpServerName,
                });
                return {};
            }
            // 5. add to history and keep going
            this._updateLatestTool(threadId, {
                role: 'tool',
                type: 'success',
                params: toolParams,
                result: toolResult,
                name: toolName,
                content: toolResultStr,
                id: toolId,
                rawParams: rawParamsForLog,
                mcpServerName,
            });
            // Auto-open edited file in editor for edit_file / rewrite_file
            try {
                if (isBuiltInTool && (toolName === 'edit_file' || toolName === 'rewrite_file')) {
                    const uri = toolParams.uri;
                    if (uri) {
                        await this._commandService.executeCommand('vscode.open', uri);
                    }
                }
            }
            catch { }
            return {};
        };
        this._getCheckpointInfo = (checkpointMessage, fsPath, opts) => {
            const voidFileSnapshot = checkpointMessage.voidFileSnapshotOfURI
                ? (checkpointMessage.voidFileSnapshotOfURI[fsPath] ?? null)
                : null;
            if (!opts.includeUserModifiedChanges) {
                return { voidFileSnapshot };
            }
            const userModifiedVoidFileSnapshot = fsPath in checkpointMessage.userModifications.voidFileSnapshotOfURI
                ? (checkpointMessage.userModifications.voidFileSnapshotOfURI[fsPath] ?? null)
                : null;
            return { voidFileSnapshot: userModifiedVoidFileSnapshot ?? voidFileSnapshot };
        };
        this._getCheckpointBeforeMessage = ({ threadId, messageIdx, }) => {
            const thread = this.state.allThreads[threadId];
            if (!thread)
                return undefined;
            for (let i = messageIdx; i >= 0; i--) {
                const message = thread.messages[i];
                if (message.role === 'checkpoint') {
                    return [message, i];
                }
            }
            return undefined;
        };
        this.editUserMessageAndStreamResponse = async ({ userMessage, messageIdx, threadId }) => {
            const thread = this.state.allThreads[threadId];
            if (!thread)
                return; // should never happen
            if (thread.messages?.[messageIdx]?.role !== 'user') {
                throw new Error(`Error: editing a message with role !=='user'`);
            }
            // get prev and curr selections before clearing the message
            const currSelns = thread.messages[messageIdx].state.stagingSelections || []; // staging selections for the edited message
            // clear messages up to the index
            const slicedMessages = thread.messages.slice(0, messageIdx);
            this._setState({
                allThreads: {
                    ...this.state.allThreads,
                    [thread.id]: {
                        ...thread,
                        messages: slicedMessages,
                    },
                },
            });
            // re-add the message and stream it
            this._addUserMessageAndStreamResponse({ userMessage, _chatSelections: currSelns, threadId });
        };
        this.getRelativeStr = (uri) => {
            const isInside = this._workspaceContextService.isInsideWorkspace(uri);
            if (isInside) {
                const f = this._workspaceContextService
                    .getWorkspace()
                    .folders.find((f) => uri.fsPath.startsWith(f.uri.fsPath));
                if (f) {
                    return uri.fsPath.replace(f.uri.fsPath, '');
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        };
        // gets the location of codespan link so the user can click on it
        this.generateCodespanLink = async ({ codespanStr: _codespanStr, threadId, }) => {
            // process codespan to understand what we are searching for
            // TODO account for more complicated patterns eg `ITextEditorService.openEditor()`
            const functionOrMethodPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/; // `fUnCt10n_name`
            const functionParensPattern = /^([^\s(]+)\([^)]*\)$/; // `functionName( args )`
            let target = _codespanStr; // the string to search for
            let codespanType;
            if (target.includes('.') || target.includes('/')) {
                codespanType = 'file-or-folder';
                target = _codespanStr;
            }
            else if (functionOrMethodPattern.test(target)) {
                codespanType = 'function-or-class';
                target = _codespanStr;
            }
            else if (functionParensPattern.test(target)) {
                const match = target.match(functionParensPattern);
                if (match && match[1]) {
                    codespanType = 'function-or-class';
                    target = match[1];
                }
                else {
                    return null;
                }
            }
            else {
                return null;
            }
            // get history of all AI and user added files in conversation + store in reverse order (MRU)
            const prevUris = this._getAllSeenFileURIs(threadId).reverse();
            if (codespanType === 'file-or-folder') {
                const doesUriMatchTarget = (uri) => uri.path.includes(target);
                // check if any prevFiles are the `target`
                for (const [idx, uri] of prevUris.entries()) {
                    if (doesUriMatchTarget(uri)) {
                        // shorten it
                        // TODO make this logic more general
                        const prevUriStrs = prevUris.map((uri) => uri.fsPath);
                        const shortenedUriStrs = shorten(prevUriStrs);
                        let displayText = shortenedUriStrs[idx];
                        const ellipsisIdx = displayText.lastIndexOf('…/');
                        if (ellipsisIdx >= 0) {
                            displayText = displayText.slice(ellipsisIdx + 2);
                        }
                        return { uri, displayText };
                    }
                }
                // else search codebase for `target`
                let uris = [];
                try {
                    const { result } = await this._toolsService.callTool['search_pathnames_only']({
                        query: target,
                        includePattern: null,
                        pageNumber: 0,
                    });
                    const { uris: uris_ } = await result;
                    uris = uris_;
                }
                catch (e) {
                    return null;
                }
                for (const [idx, uri] of uris.entries()) {
                    if (doesUriMatchTarget(uri)) {
                        // TODO make this logic more general
                        const prevUriStrs = prevUris.map((uri) => uri.fsPath);
                        const shortenedUriStrs = shorten(prevUriStrs);
                        let displayText = shortenedUriStrs[idx];
                        const ellipsisIdx = displayText.lastIndexOf('…/');
                        if (ellipsisIdx >= 0) {
                            displayText = displayText.slice(ellipsisIdx + 2);
                        }
                        return { uri, displayText };
                    }
                }
            }
            if (codespanType === 'function-or-class') {
                // check all prevUris for the target
                for (const uri of prevUris) {
                    const modelRef = await this._voidModelService.getModelSafe(uri);
                    const { model } = modelRef;
                    if (!model)
                        continue;
                    const matches = model.findMatches(target, false, // searchOnlyEditableRange
                    false, // isRegex
                    true, // matchCase
                    null, //' ',   // wordSeparators
                    true);
                    const firstThree = matches.slice(0, 3);
                    // take first 3 occurences, attempt to goto definition on them
                    for (const match of firstThree) {
                        const position = new Position(match.range.startLineNumber, match.range.startColumn);
                        const definitionProviders = this._languageFeaturesService.definitionProvider.ordered(model);
                        for (const provider of definitionProviders) {
                            const _definitions = await provider.provideDefinition(model, position, CancellationToken.None);
                            if (!_definitions)
                                continue;
                            const definitions = Array.isArray(_definitions) ? _definitions : [_definitions];
                            for (const definition of definitions) {
                                return {
                                    uri: definition.uri,
                                    selection: {
                                        startLineNumber: definition.range.startLineNumber,
                                        startColumn: definition.range.startColumn,
                                        endLineNumber: definition.range.endLineNumber,
                                        endColumn: definition.range.endColumn,
                                    },
                                    displayText: _codespanStr,
                                };
                                // const defModelRef = await this._textModelService.createModelReference(definition.uri);
                                // const defModel = defModelRef.object.textEditorModel;
                                // try {
                                // 	const symbolProviders = this._languageFeaturesService.documentSymbolProvider.ordered(defModel);
                                // 	for (const symbolProvider of symbolProviders) {
                                // 		const symbols = await symbolProvider.provideDocumentSymbols(
                                // 			defModel,
                                // 			CancellationToken.None
                                // 		);
                                // 		if (symbols) {
                                // 			const symbol = symbols.find(s => {
                                // 				const symbolRange = s.range;
                                // 				return symbolRange.startLineNumber <= definition.range.startLineNumber &&
                                // 					symbolRange.endLineNumber >= definition.range.endLineNumber &&
                                // 					(symbolRange.startLineNumber !== definition.range.startLineNumber || symbolRange.startColumn <= definition.range.startColumn) &&
                                // 					(symbolRange.endLineNumber !== definition.range.endLineNumber || symbolRange.endColumn >= definition.range.endColumn);
                                // 			});
                                // 			// if we got to a class/function get the full range and return
                                // 			if (symbol?.kind === SymbolKind.Function || symbol?.kind === SymbolKind.Method || symbol?.kind === SymbolKind.Class) {
                                // 				return {
                                // 					uri: definition.uri,
                                // 					selection: {
                                // 						startLineNumber: definition.range.startLineNumber,
                                // 						startColumn: definition.range.startColumn,
                                // 						endLineNumber: definition.range.endLineNumber,
                                // 						endColumn: definition.range.endColumn,
                                // 					}
                                // 				};
                                // 			}
                                // 		}
                                // 	}
                                // } finally {
                                // 	defModelRef.dispose();
                                // }
                            }
                        }
                    }
                }
                // unlike above do not search codebase (doesnt make sense)
            }
            return null;
        };
        // closeCurrentStagingSelectionsInThread = () => {
        // 	const currThread = this.getCurrentThreadState()
        // 	// close all stagingSelections
        // 	const closedStagingSelections = currThread.stagingSelections.map(s => ({ ...s, state: { ...s.state, isOpened: false } }))
        // 	const newThread = currThread
        // 	newThread.stagingSelections = closedStagingSelections
        // 	this.setCurrentThreadState(newThread)
        // }
        // closeCurrentStagingSelectionsInMessage: IChatThreadService['closeCurrentStagingSelectionsInMessage'] = ({ messageIdx }) => {
        // 	const currMessage = this.getCurrentMessageState(messageIdx)
        // 	// close all stagingSelections
        // 	const closedStagingSelections = currMessage.stagingSelections.map(s => ({ ...s, state: { ...s.state, isOpened: false } }))
        // 	const newMessage = currMessage
        // 	newMessage.stagingSelections = closedStagingSelections
        // 	this.setCurrentMessageState(messageIdx, newMessage)
        // }
        this.getCurrentThreadState = () => {
            const currentThread = this.getCurrentThread();
            return currentThread.state;
        };
        this.setCurrentThreadState = (newState) => {
            this._setThreadState(this.state.currentThreadId, newState);
        };
        this.state = { allThreads: {}, currentThreadId: null }; // default state
        const readThreads = this._readAllThreads() || {};
        const allThreads = readThreads;
        this.state = {
            allThreads: allThreads,
            currentThreadId: null, // gets set in startNewThread()
        };
        // always be in a thread
        this.openNewThread();
        // keep track of user-modified files
        // const disposablesOfModelId: { [modelId: string]: IDisposable[] } = {}
        // this._register(
        // 	this._modelService.onModelAdded(e => {
        // 		if (!(e.id in disposablesOfModelId)) disposablesOfModelId[e.id] = []
        // 		disposablesOfModelId[e.id].push(
        // 			e.onDidChangeContent(() => { this._userModifiedFilesToCheckInCheckpoints.set(e.uri.fsPath, null) })
        // 		)
        // 	})
        // )
        // this._register(this._modelService.onModelRemoved(e => {
        // 	if (!(e.id in disposablesOfModelId)) return
        // 	disposablesOfModelId[e.id].forEach(d => d.dispose())
        // }))
    }
    async focusCurrentChat() {
        const threadId = this.state.currentThreadId;
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const s = await thread.state.mountedInfo?.whenMounted;
        if (!this.isCurrentlyFocusingMessage()) {
            s?.textAreaRef.current?.focus();
        }
    }
    async blurCurrentChat() {
        const threadId = this.state.currentThreadId;
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const s = await thread.state.mountedInfo?.whenMounted;
        if (!this.isCurrentlyFocusingMessage()) {
            s?.textAreaRef.current?.blur();
        }
    }
    // !!! this is important for properly restoring URIs from storage
    // should probably re-use code from void/src/vs/base/common/marshalling.ts instead. but this is simple enough
    _convertThreadDataFromStorage(threadsStr) {
        return JSON.parse(threadsStr, (key, value) => {
            if (value && typeof value === 'object' && value.$mid === 1) {
                // $mid is the MarshalledId. $mid === 1 means it is a URI
                return URI.from(value); // TODO URI.revive instead of this?
            }
            return value;
        });
    }
    _readAllThreads() {
        const threadsStr = this._storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (!threadsStr) {
            return null;
        }
        const threads = this._convertThreadDataFromStorage(threadsStr);
        return threads;
    }
    _storeAllThreads(threads) {
        const serializedThreads = JSON.stringify(threads);
        this._storageService.store(THREAD_STORAGE_KEY, serializedThreads, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    // this should be the only place this.state = ... appears besides constructor
    _setState(state, doNotRefreshMountInfo) {
        const newState = {
            ...this.state,
            ...state,
        };
        this.state = newState;
        this._onDidChangeCurrentThread.fire();
        // if we just switched to a thread, update its current stream state if it's not streaming to possibly streaming
        const threadId = newState.currentThreadId;
        const streamState = this.streamState[threadId];
        if (streamState?.isRunning === undefined && !streamState?.error) {
            // set streamState
            const messages = newState.allThreads[threadId]?.messages;
            const lastMessage = messages && messages[messages.length - 1];
            // if awaiting user but stream state doesn't indicate it (happens if restart Void)
            if (lastMessage && lastMessage.role === 'tool' && lastMessage.type === 'tool_request')
                this._setStreamState(threadId, { isRunning: 'awaiting_user' });
            // if running now but stream state doesn't indicate it (happens if restart Void), cancel that last tool
            if (lastMessage && lastMessage.role === 'tool' && lastMessage.type === 'running_now') {
                this._updateLatestTool(threadId, {
                    role: 'tool',
                    type: 'rejected',
                    content: lastMessage.content,
                    id: lastMessage.id,
                    rawParams: lastMessage.rawParams,
                    result: null,
                    name: lastMessage.name,
                    params: lastMessage.params,
                    mcpServerName: lastMessage.mcpServerName,
                });
            }
        }
        // if we did not just set the state to true, set mount info
        if (doNotRefreshMountInfo)
            return;
        let whenMountedResolver;
        const whenMountedPromise = new Promise((res) => (whenMountedResolver = res));
        this._setThreadState(threadId, {
            mountedInfo: {
                whenMounted: whenMountedPromise,
                mountedIsResolvedRef: { current: false },
                _whenMountedResolver: (w) => {
                    whenMountedResolver(w);
                    const mountInfo = this.state.allThreads[threadId]?.state.mountedInfo;
                    if (mountInfo)
                        mountInfo.mountedIsResolvedRef.current = true;
                },
            },
        }, true); // do not trigger an update
    }
    _setStreamState(threadId, state) {
        this.streamState[threadId] = state;
        this._onDidChangeStreamState.fire({ threadId });
    }
    approveLatestToolRequest(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return; // should never happen
        const lastMsg = thread.messages[thread.messages.length - 1];
        if (!(lastMsg.role === 'tool' && lastMsg.type === 'tool_request'))
            return; // should never happen
        const callThisToolFirst = lastMsg;
        this._wrapRunAgentToNotify(this._runChatAgent({ callThisToolFirst, threadId, ...this._currentModelSelectionProps() }), threadId);
    }
    rejectLatestToolRequest(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return; // should never happen
        const lastMsg = thread.messages[thread.messages.length - 1];
        let params;
        if (lastMsg.role === 'tool' && lastMsg.type !== 'invalid_params') {
            params = lastMsg.params;
        }
        else
            return;
        const { name, id, rawParams, mcpServerName } = lastMsg;
        const errorMessage = this.toolErrMsgs.rejected;
        this._updateLatestTool(threadId, {
            role: 'tool',
            type: 'rejected',
            params: params,
            name: name,
            content: errorMessage,
            result: null,
            id,
            rawParams,
            mcpServerName,
        });
        this._setStreamState(threadId, undefined);
    }
    async abortRunning(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return; // should never happen
        // add assistant message
        if (this.streamState[threadId]?.isRunning === 'LLM') {
            const { displayContentSoFar, reasoningSoFar, toolCallSoFar } = this.streamState[threadId].llmInfo;
            this._addMessageToThread(threadId, {
                role: 'assistant',
                displayContent: displayContentSoFar,
                reasoning: reasoningSoFar,
                anthropicReasoning: null,
            });
            if (toolCallSoFar)
                this._addMessageToThread(threadId, {
                    role: 'interrupted_streaming_tool',
                    name: toolCallSoFar.name,
                    mcpServerName: this._computeMCPServerOfToolName(toolCallSoFar.name),
                });
        }
        // add tool that's running
        else if (this.streamState[threadId]?.isRunning === 'tool') {
            const { toolName, toolParams, id, content: content_, rawParams, mcpServerName, } = this.streamState[threadId].toolInfo;
            const content = content_ || this.toolErrMsgs.interrupted;
            this._updateLatestTool(threadId, {
                role: 'tool',
                name: toolName,
                params: toolParams,
                id,
                content,
                rawParams,
                type: 'rejected',
                result: null,
                mcpServerName,
            });
        }
        // reject the tool for the user if relevant
        else if (this.streamState[threadId]?.isRunning === 'awaiting_user') {
            this.rejectLatestToolRequest(threadId);
        }
        else if (this.streamState[threadId]?.isRunning === 'idle') {
            // do nothing
        }
        this._addUserCheckpoint({ threadId });
        // interrupt any effects
        const interrupt = await this.streamState[threadId]?.interrupt;
        if (typeof interrupt === 'function')
            interrupt();
        this._setStreamState(threadId, undefined);
    }
    async _runChatAgent({ threadId, modelSelection, modelSelectionOptions, callThisToolFirst, }) {
        let interruptedWhenIdle = false;
        const idleInterruptor = Promise.resolve(() => {
            interruptedWhenIdle = true;
        });
        // _runToolCall does not need setStreamState({idle}) before it, but it needs it after it. (handles its own setStreamState)
        // above just defines helpers, below starts the actual function
        const { chatMode } = this._settingsService.state.globalSettings; // should not change as we loop even if user changes it, so it goes here
        const { overridesOfModel } = this._settingsService.state;
        let nMessagesSent = 0;
        let shouldSendAnotherMessage = true;
        let isRunningWhenEnd = undefined;
        // before enter loop, call tool
        if (callThisToolFirst) {
            const { interrupted } = await this._runToolCall(threadId, callThisToolFirst.name, callThisToolFirst.id, callThisToolFirst.mcpServerName, {
                preapproved: true,
                unvalidatedToolParams: callThisToolFirst.rawParams,
                validatedParams: callThisToolFirst.params,
            });
            if (interrupted) {
                this._setStreamState(threadId, undefined);
                this._addUserCheckpoint({ threadId });
            }
        }
        this._setStreamState(threadId, { isRunning: 'idle', interrupt: 'not_needed' }); // just decorative, for clarity
        // tool use loop
        while (shouldSendAnotherMessage) {
            // false by default each iteration
            shouldSendAnotherMessage = false;
            isRunningWhenEnd = undefined;
            nMessagesSent += 1;
            this._setStreamState(threadId, { isRunning: 'idle', interrupt: idleInterruptor });
            const chatMessages = this.state.allThreads[threadId]?.messages ?? [];
            const { messages, separateSystemMessage } = await this._convertToLLMMessagesService.prepareLLMChatMessages({
                chatMessages,
                modelSelection,
                chatMode,
            });
            if (interruptedWhenIdle) {
                this._setStreamState(threadId, undefined);
                return;
            }
            let shouldRetryLLM = true;
            let nAttempts = 0;
            while (shouldRetryLLM) {
                shouldRetryLLM = false;
                nAttempts += 1;
                let resMessageIsDonePromise; // resolves when user approves this tool use (or if tool doesn't require approval)
                const messageIsDonePromise = new Promise((res, rej) => {
                    resMessageIsDonePromise = res;
                });
                const llmCancelToken = this._llmMessageService.sendLLMMessage({
                    messagesType: 'chatMessages',
                    chatMode,
                    messages: messages,
                    modelSelection,
                    modelSelectionOptions,
                    overridesOfModel,
                    logging: {
                        loggingName: `Chat - ${chatMode}`,
                        loggingExtras: { threadId, nMessagesSent, chatMode },
                    },
                    separateSystemMessage: separateSystemMessage,
                    onText: ({ fullText, fullReasoning, toolCall }) => {
                        this._setStreamState(threadId, {
                            isRunning: 'LLM',
                            llmInfo: {
                                displayContentSoFar: fullText,
                                reasoningSoFar: fullReasoning,
                                toolCallSoFar: toolCall ?? null,
                            },
                            interrupt: Promise.resolve(() => {
                                if (llmCancelToken)
                                    this._llmMessageService.abort(llmCancelToken);
                            }),
                        });
                    },
                    onFinalMessage: async ({ fullText, fullReasoning, toolCall, anthropicReasoning }) => {
                        resMessageIsDonePromise({
                            type: 'llmDone',
                            toolCall,
                            info: { fullText, fullReasoning, anthropicReasoning },
                        }); // resolve with tool calls
                    },
                    onError: async (error) => {
                        resMessageIsDonePromise({ type: 'llmError', error: error });
                    },
                    onAbort: () => {
                        // stop the loop to free up the promise, but don't modify state (already handled by whatever stopped it)
                        resMessageIsDonePromise({ type: 'llmAborted' });
                        this._metricsService.capture('Agent Loop Done (Aborted)', { nMessagesSent, chatMode });
                    },
                });
                // mark as streaming
                if (!llmCancelToken) {
                    this._setStreamState(threadId, {
                        isRunning: undefined,
                        error: {
                            message: 'There was an unexpected error when sending your chat message.',
                            fullError: null,
                        },
                    });
                    break;
                }
                this._setStreamState(threadId, {
                    isRunning: 'LLM',
                    llmInfo: { displayContentSoFar: '', reasoningSoFar: '', toolCallSoFar: null },
                    interrupt: Promise.resolve(() => this._llmMessageService.abort(llmCancelToken)),
                });
                const llmRes = await messageIsDonePromise; // wait for message to complete
                // if something else started running in the meantime
                if (this.streamState[threadId]?.isRunning !== 'LLM') {
                    // console.log('Chat thread interrupted by a newer chat thread', this.streamState[threadId]?.isRunning)
                    return;
                }
                // llm res aborted
                if (llmRes.type === 'llmAborted') {
                    this._setStreamState(threadId, undefined);
                    return;
                }
                // llm res error
                else if (llmRes.type === 'llmError') {
                    // error, should retry
                    if (nAttempts < CHAT_RETRIES) {
                        shouldRetryLLM = true;
                        this._setStreamState(threadId, { isRunning: 'idle', interrupt: idleInterruptor });
                        await timeout(RETRY_DELAY);
                        if (interruptedWhenIdle) {
                            this._setStreamState(threadId, undefined);
                            return;
                        }
                        else
                            continue; // retry
                    }
                    // error, but too many attempts
                    else {
                        const { error } = llmRes;
                        const { displayContentSoFar, reasoningSoFar, toolCallSoFar } = this.streamState[threadId].llmInfo;
                        this._addMessageToThread(threadId, {
                            role: 'assistant',
                            displayContent: displayContentSoFar,
                            reasoning: reasoningSoFar,
                            anthropicReasoning: null,
                        });
                        if (toolCallSoFar)
                            this._addMessageToThread(threadId, {
                                role: 'interrupted_streaming_tool',
                                name: toolCallSoFar.name,
                                mcpServerName: this._computeMCPServerOfToolName(toolCallSoFar.name),
                            });
                        this._setStreamState(threadId, { isRunning: undefined, error });
                        this._addUserCheckpoint({ threadId });
                        return;
                    }
                }
                // llm res success
                const { toolCall, info } = llmRes;
                this._addMessageToThread(threadId, {
                    role: 'assistant',
                    displayContent: info.fullText,
                    reasoning: info.fullReasoning,
                    anthropicReasoning: info.anthropicReasoning,
                });
                this._setStreamState(threadId, { isRunning: 'idle', interrupt: 'not_needed' }); // just decorative for clarity
                // call tool if there is one
                if (toolCall) {
                    const mcpTools = this._mcpService.getMCPTools();
                    const mcpTool = mcpTools?.find((t) => t.name === toolCall.name);
                    const { awaitingUserApproval, interrupted } = await this._runToolCall(threadId, toolCall.name, toolCall.id, mcpTool?.mcpServerName, { preapproved: false, unvalidatedToolParams: toolCall.rawParams });
                    if (interrupted) {
                        this._setStreamState(threadId, undefined);
                        return;
                    }
                    if (awaitingUserApproval) {
                        isRunningWhenEnd = 'awaiting_user';
                    }
                    else {
                        shouldSendAnotherMessage = true;
                    }
                    this._setStreamState(threadId, { isRunning: 'idle', interrupt: 'not_needed' }); // just decorative, for clarity
                }
                // Fallback: if there is NO tool call but the assistant returned a code block,
                // and the latest user message has exactly one staged File selection, automatically
                // convert the code block into a rewrite_file tool call.
                else {
                    // helper to extract first code block
                    const extractFirstCodeBlock = (md) => {
                        const regex = /```[\w+-]*\n([\s\S]*?)```/m;
                        const m = regex.exec(md);
                        if (!m)
                            return null;
                        const code = m[1] ?? '';
                        return code.trim() ? code : null;
                    };
                    const codeBlock = extractFirstCodeBlock(info.fullText || '');
                    if (codeBlock) {
                        const thread = this.state.allThreads[threadId];
                        const lastUserMsg = thread?.messages
                            .slice()
                            .reverse()
                            .find((m) => m.role === 'user');
                        const sels = (lastUserMsg?.selections ?? []).filter((s) => s.type === 'File');
                        if (sels.length === 1) {
                            const uri = sels[0].uri;
                            // synthesize a rewrite_file tool call
                            const syntheticToolId = generateUuid();
                            const rawParams = { uri: uri.fsPath, new_content: codeBlock };
                            const { awaitingUserApproval, interrupted } = await this._runToolCall(threadId, 'rewrite_file', syntheticToolId, undefined, { preapproved: false, unvalidatedToolParams: rawParams });
                            if (interrupted) {
                                this._setStreamState(threadId, undefined);
                                return;
                            }
                            if (awaitingUserApproval) {
                                isRunningWhenEnd = 'awaiting_user';
                            }
                            else {
                                shouldSendAnotherMessage = true;
                            }
                            this._setStreamState(threadId, { isRunning: 'idle', interrupt: 'not_needed' });
                        }
                    }
                }
            } // end while (attempts)
        } // end while (send message)
        // if awaiting user approval, keep isRunning true, else end isRunning
        this._setStreamState(threadId, { isRunning: isRunningWhenEnd });
        // add checkpoint before the next user message
        if (!isRunningWhenEnd)
            this._addUserCheckpoint({ threadId });
        // capture number of messages sent
        this._metricsService.capture('Agent Loop Done', { nMessagesSent, chatMode });
    }
    _addCheckpoint(threadId, checkpoint) {
        this._addMessageToThread(threadId, checkpoint);
        // // update latest checkpoint idx to the one we just added
        // const newThread = this.state.allThreads[threadId]
        // if (!newThread) return // should never happen
        // const currCheckpointIdx = newThread.messages.length - 1
        // this._setThreadState(threadId, { currCheckpointIdx: currCheckpointIdx })
    }
    _editMessageInThread(threadId, messageIdx, newMessage) {
        const { allThreads } = this.state;
        const oldThread = allThreads[threadId];
        if (!oldThread)
            return; // should never happen
        // update state and store it
        const newThreads = {
            ...allThreads,
            [oldThread.id]: {
                ...oldThread,
                lastModified: new Date().toISOString(),
                messages: [
                    ...oldThread.messages.slice(0, messageIdx),
                    newMessage,
                    ...oldThread.messages.slice(messageIdx + 1, Infinity),
                ],
            },
        };
        this._storeAllThreads(newThreads);
        this._setState({ allThreads: newThreads }); // the current thread just changed (it had a message added to it)
    }
    _computeNewCheckpointInfo({ threadId }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const lastCheckpointIdx = findLastIdx(thread.messages, (m) => m.role === 'checkpoint') ?? -1;
        if (lastCheckpointIdx === -1)
            return;
        const voidFileSnapshotOfURI = {};
        // add a change for all the URIs in the checkpoint history
        const { lastIdxOfURI } = this._getCheckpointsBetween({ threadId, loIdx: 0, hiIdx: lastCheckpointIdx }) ?? {};
        for (const fsPath in lastIdxOfURI ?? {}) {
            const { model } = this._voidModelService.getModelFromFsPath(fsPath);
            if (!model)
                continue;
            const checkpoint2 = thread.messages[lastIdxOfURI[fsPath]] || null;
            if (!checkpoint2)
                continue;
            if (checkpoint2.role !== 'checkpoint')
                continue;
            const res = this._getCheckpointInfo(checkpoint2, fsPath, {
                includeUserModifiedChanges: false,
            });
            if (!res)
                continue;
            const { voidFileSnapshot: oldVoidFileSnapshot } = res;
            // if there was any change to the str or diffAreaSnapshot, update. rough approximation of equality, oldDiffAreasSnapshot === diffAreasSnapshot is not perfect
            const voidFileSnapshot = this._editCodeService.getVoidFileSnapshot(URI.file(fsPath));
            if (oldVoidFileSnapshot === voidFileSnapshot)
                continue;
            voidFileSnapshotOfURI[fsPath] = voidFileSnapshot;
        }
        // // add a change for all user-edited files (that aren't in the history)
        // for (const fsPath of this._userModifiedFilesToCheckInCheckpoints.keys()) {
        // 	if (fsPath in lastIdxOfURI) continue // if already visisted, don't visit again
        // 	const { model } = this._voidModelService.getModelFromFsPath(fsPath)
        // 	if (!model) continue
        // 	currStrOfFsPath[fsPath] = model.getValue(EndOfLinePreference.LF)
        // }
        return { voidFileSnapshotOfURI };
    }
    _addUserCheckpoint({ threadId }) {
        const { voidFileSnapshotOfURI } = this._computeNewCheckpointInfo({ threadId }) ?? {};
        this._addCheckpoint(threadId, {
            role: 'checkpoint',
            type: 'user_edit',
            voidFileSnapshotOfURI: voidFileSnapshotOfURI ?? {},
            userModifications: { voidFileSnapshotOfURI: {} },
        });
    }
    // call this right after LLM edits a file
    _addToolEditCheckpoint({ threadId, uri }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return; // should never happen
        const diffAreasSnapshot = this._editCodeService.getVoidFileSnapshot(uri);
        this._addCheckpoint(threadId, {
            role: 'checkpoint',
            type: 'tool_edit',
            voidFileSnapshotOfURI: { [uri.fsPath]: diffAreasSnapshot },
            userModifications: { voidFileSnapshotOfURI: {} },
        });
    }
    _getCheckpointsBetween({ threadId, loIdx, hiIdx, }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return { lastIdxOfURI: {} }; // should never happen
        const lastIdxOfURI = {};
        for (let i = loIdx; i <= hiIdx; i += 1) {
            const message = thread.messages[i];
            if (message?.role !== 'checkpoint')
                continue;
            for (const fsPath in message.voidFileSnapshotOfURI) {
                // do not include userModified.beforeStrOfURI here, jumping should not include those changes
                lastIdxOfURI[fsPath] = i;
            }
        }
        return { lastIdxOfURI };
    }
    _readCurrentCheckpoint(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const { currCheckpointIdx } = thread.state;
        if (currCheckpointIdx === null)
            return;
        const checkpoint = thread.messages[currCheckpointIdx];
        if (!checkpoint)
            return;
        if (checkpoint.role !== 'checkpoint')
            return;
        return [checkpoint, currCheckpointIdx];
    }
    _addUserModificationsToCurrCheckpoint({ threadId }) {
        const { voidFileSnapshotOfURI } = this._computeNewCheckpointInfo({ threadId }) ?? {};
        const res = this._readCurrentCheckpoint(threadId);
        if (!res)
            return;
        const [checkpoint, checkpointIdx] = res;
        this._editMessageInThread(threadId, checkpointIdx, {
            ...checkpoint,
            userModifications: { voidFileSnapshotOfURI: voidFileSnapshotOfURI ?? {} },
        });
    }
    _makeUsStandOnCheckpoint({ threadId }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        if (thread.state.currCheckpointIdx === null) {
            const lastMsg = thread.messages[thread.messages.length - 1];
            if (lastMsg?.role !== 'checkpoint')
                this._addUserCheckpoint({ threadId });
            this._setThreadState(threadId, { currCheckpointIdx: thread.messages.length - 1 });
        }
    }
    jumpToCheckpointBeforeMessageIdx({ threadId, messageIdx, jumpToUserModified, }) {
        // if null, add a new temp checkpoint so user can jump forward again
        this._makeUsStandOnCheckpoint({ threadId });
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        if (this.streamState[threadId]?.isRunning)
            return;
        const c = this._getCheckpointBeforeMessage({ threadId, messageIdx });
        if (c === undefined)
            return; // should never happen
        const fromIdx = thread.state.currCheckpointIdx;
        if (fromIdx === null)
            return; // should never happen
        const [_, toIdx] = c;
        if (toIdx === fromIdx)
            return;
        // console.log(`going from ${fromIdx} to ${toIdx}`)
        // update the user's checkpoint
        this._addUserModificationsToCurrCheckpoint({ threadId });
        /*
if undoing

A,B,C are all files.
x means a checkpoint where the file changed.

A B C D E F G H I
  x x x x x   x           <-- you can't always go up to find the "before" version; sometimes you need to go down
  | | | | |   | x
--x-|-|-|-x---x-|-----     <-- to
    | | | | x   x
    | | x x |
    | |   | |
----x-|---x-x-------     <-- from
      x

We need to revert anything that happened between to+1 and from.
**We do this by finding the last x from 0...`to` for each file and applying those contents.**
We only need to do it for files that were edited since `to`, ie files between to+1...from.
*/
        if (toIdx < fromIdx) {
            const { lastIdxOfURI } = this._getCheckpointsBetween({
                threadId,
                loIdx: toIdx + 1,
                hiIdx: fromIdx,
            });
            const idxes = function* () {
                for (let k = toIdx; k >= 0; k -= 1) {
                    // first go up
                    yield k;
                }
                for (let k = toIdx + 1; k < thread.messages.length; k += 1) {
                    // then go down
                    yield k;
                }
            };
            for (const fsPath in lastIdxOfURI) {
                // find the first instance of this file starting at toIdx (go up to latest file; if there is none, go down)
                for (const k of idxes()) {
                    const message = thread.messages[k];
                    if (message.role !== 'checkpoint')
                        continue;
                    const res = this._getCheckpointInfo(message, fsPath, {
                        includeUserModifiedChanges: jumpToUserModified,
                    });
                    if (!res)
                        continue;
                    const { voidFileSnapshot } = res;
                    if (!voidFileSnapshot)
                        continue;
                    this._editCodeService.restoreVoidFileSnapshot(URI.file(fsPath), voidFileSnapshot);
                    break;
                }
            }
        }
        /*
if redoing

A B C D E F G H I J
  x x x x x   x     x
  | | | | |   | x x x
--x-|-|-|-x---x-|-|---     <-- from
    | | | | x   x
    | | x x |
    | |   | |
----x-|---x-x-----|---     <-- to
      x           x


We need to apply latest change for anything that happened between from+1 and to.
We only need to do it for files that were edited since `from`, ie files between from+1...to.
*/
        if (toIdx > fromIdx) {
            const { lastIdxOfURI } = this._getCheckpointsBetween({
                threadId,
                loIdx: fromIdx + 1,
                hiIdx: toIdx,
            });
            for (const fsPath in lastIdxOfURI) {
                // apply lowest down content for each uri
                for (let k = toIdx; k >= fromIdx + 1; k -= 1) {
                    const message = thread.messages[k];
                    if (message.role !== 'checkpoint')
                        continue;
                    const res = this._getCheckpointInfo(message, fsPath, {
                        includeUserModifiedChanges: jumpToUserModified,
                    });
                    if (!res)
                        continue;
                    const { voidFileSnapshot } = res;
                    if (!voidFileSnapshot)
                        continue;
                    this._editCodeService.restoreVoidFileSnapshot(URI.file(fsPath), voidFileSnapshot);
                    break;
                }
            }
        }
        this._setThreadState(threadId, { currCheckpointIdx: toIdx });
    }
    _wrapRunAgentToNotify(p, threadId) {
        const notify = ({ error }) => {
            const thread = this.state.allThreads[threadId];
            if (!thread)
                return;
            const userMsg = findLast(thread.messages, (m) => m.role === 'user');
            if (!userMsg)
                return;
            if (userMsg.role !== 'user')
                return;
            const messageContent = truncate(userMsg.displayContent, 50, '...');
            this._notificationService.notify({
                severity: error ? Severity.Warning : Severity.Info,
                message: error ? `Error: ${error} ` : `A new Chat result is ready.`,
                source: messageContent,
                sticky: true,
                actions: {
                    primary: [
                        {
                            id: 'void.goToChat',
                            enabled: true,
                            label: `Jump to Chat`,
                            tooltip: '',
                            class: undefined,
                            run: () => {
                                this.switchToThread(threadId);
                                // scroll to bottom
                                this.state.allThreads[threadId]?.state.mountedInfo?.whenMounted.then((m) => {
                                    m.scrollToBottom();
                                });
                            },
                        },
                    ],
                },
            });
        };
        p.then(() => {
            if (threadId !== this.state.currentThreadId)
                notify({ error: null });
        }).catch((e) => {
            if (threadId !== this.state.currentThreadId)
                notify({ error: getErrorMessage(e) });
            throw e;
        });
    }
    dismissStreamError(threadId) {
        this._setStreamState(threadId, undefined);
    }
    async _addUserMessageAndStreamResponse({ userMessage, _chatSelections, threadId, }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return; // should never happen
        // interrupt existing stream
        if (this.streamState[threadId]?.isRunning) {
            await this.abortRunning(threadId);
        }
        // add dummy before this message to keep checkpoint before user message idea consistent
        if (thread.messages.length === 0) {
            this._addUserCheckpoint({ threadId });
        }
        // add user's message to chat history
        const instructions = userMessage;
        const currSelns = _chatSelections ?? thread.state.stagingSelections;
        const userMessageContent = await chat_userMessageContent(instructions, currSelns, {
            directoryStrService: this._directoryStringService,
            fileService: this._fileService,
        }); // user message + names of files (NOT content)
        const userHistoryElt = {
            role: 'user',
            content: userMessageContent,
            displayContent: instructions,
            selections: currSelns,
            state: defaultMessageState,
        };
        this._addMessageToThread(threadId, userHistoryElt);
        this._setThreadState(threadId, { currCheckpointIdx: null }); // no longer at a checkpoint because started streaming
        const assistantMessage = {
            role: 'assistant',
            displayContent: '',
            reasoning: '',
            anthropicReasoning: null,
        };
        this._addMessageToThread(threadId, assistantMessage);
        const threadAfterAdd = this.state.allThreads[threadId];
        const assistantIdx = (threadAfterAdd?.messages.length ?? 1) - 1;
        this._setStreamState(threadId, {
            isRunning: 'LLM',
            llmInfo: {
                displayContentSoFar: '',
                reasoningSoFar: '',
                toolCallSoFar: null,
            },
            interrupt: Promise.resolve(() => { }),
        });
        const { abort } = this._continueChatClient.streamResponse({
            messages: this.state.allThreads[threadId]?.messages ?? [],
            onChunk: ({ content, reasoning }) => {
                const stream = this.streamState[threadId];
                if (!stream || stream.isRunning !== 'LLM' || !stream.llmInfo)
                    return;
                if (content) {
                    stream.llmInfo.displayContentSoFar += content;
                }
                if (reasoning) {
                    stream.llmInfo.reasoningSoFar += reasoning;
                }
                const currThread = this.state.allThreads[threadId];
                const currMessages = currThread?.messages;
                if (!currThread || !currMessages || !currMessages[assistantIdx])
                    return;
                const updatedAssistant = {
                    ...currMessages[assistantIdx],
                    displayContent: stream.llmInfo.displayContentSoFar,
                    reasoning: stream.llmInfo.reasoningSoFar,
                };
                this._editMessageInThread(threadId, assistantIdx, updatedAssistant);
            },
            onDone: ({ content, reasoning }) => {
                const stream = this.streamState[threadId];
                if (!stream || !stream.llmInfo)
                    return;
                stream.llmInfo.displayContentSoFar = content;
                stream.llmInfo.reasoningSoFar = reasoning ?? '';
                const currThread = this.state.allThreads[threadId];
                const currMessages = currThread?.messages;
                if (!currThread || !currMessages || !currMessages[assistantIdx])
                    return;
                const finalAssistant = {
                    ...currMessages[assistantIdx],
                    displayContent: content,
                    reasoning: reasoning ?? '',
                };
                this._editMessageInThread(threadId, assistantIdx, finalAssistant);
                this._setStreamState(threadId, {
                    isRunning: 'idle',
                    interrupt: 'not_needed',
                });
            },
            onError: (error) => {
                this._setStreamState(threadId, {
                    isRunning: undefined,
                    error: {
                        message: error.message,
                        fullError: error,
                    },
                });
            },
        });
        const currentStream = this.streamState[threadId];
        if (currentStream && currentStream.isRunning === 'LLM') {
            currentStream.interrupt = Promise.resolve(() => {
                abort();
            });
        }
        // scroll to bottom
        this.state.allThreads[threadId]?.state.mountedInfo?.whenMounted.then((m) => {
            m.scrollToBottom();
        });
    }
    async addUserMessageAndStreamResponse({ userMessage, _chatSelections, threadId, }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        // if there's a current checkpoint, delete all messages after it
        if (thread.state.currCheckpointIdx !== null) {
            const checkpointIdx = thread.state.currCheckpointIdx;
            const newMessages = thread.messages.slice(0, checkpointIdx + 1);
            // Update the thread with truncated messages
            const newThreads = {
                ...this.state.allThreads,
                [threadId]: {
                    ...thread,
                    lastModified: new Date().toISOString(),
                    messages: newMessages,
                },
            };
            this._storeAllThreads(newThreads);
            this._setState({ allThreads: newThreads });
        }
        // Now call the original method to add the user message and stream the response
        await this._addUserMessageAndStreamResponse({ userMessage, _chatSelections, threadId });
    }
    // ---------- the rest ----------
    _getAllSeenFileURIs(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return [];
        const fsPathsSet = new Set();
        const uris = [];
        const addURI = (uri) => {
            if (!fsPathsSet.has(uri.fsPath))
                uris.push(uri);
            fsPathsSet.add(uri.fsPath);
            uris.push(uri);
        };
        for (const m of thread.messages) {
            // URIs of user selections
            if (m.role === 'user') {
                for (const sel of m.selections ?? []) {
                    addURI(sel.uri);
                }
            }
            // URIs of files that have been read
            else if (m.role === 'tool' && m.type === 'success' && m.name === 'read_file') {
                const params = m.params;
                addURI(params.uri);
            }
        }
        return uris;
    }
    getCodespanLink({ codespanStr, messageIdx, threadId, }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return undefined;
        const links = thread.state.linksOfMessageIdx?.[messageIdx];
        if (!links)
            return undefined;
        const link = links[codespanStr];
        return link;
    }
    async addCodespanLink({ newLinkText, newLinkLocation, messageIdx, threadId, }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setState({
            allThreads: {
                ...this.state.allThreads,
                [threadId]: {
                    ...thread,
                    state: {
                        ...thread.state,
                        linksOfMessageIdx: {
                            ...thread.state.linksOfMessageIdx,
                            [messageIdx]: {
                                ...thread.state.linksOfMessageIdx?.[messageIdx],
                                [newLinkText]: newLinkLocation,
                            },
                        },
                    },
                },
            },
        });
    }
    getCurrentThread() {
        const state = this.state;
        const thread = state.allThreads[state.currentThreadId];
        if (!thread)
            throw new Error(`Current thread should never be undefined`);
        return thread;
    }
    getCurrentFocusedMessageIdx() {
        const thread = this.getCurrentThread();
        // get the focusedMessageIdx
        const focusedMessageIdx = thread.state.focusedMessageIdx;
        if (focusedMessageIdx === undefined)
            return;
        // check that the message is actually being edited
        const focusedMessage = thread.messages[focusedMessageIdx];
        if (focusedMessage.role !== 'user')
            return;
        if (!focusedMessage.state)
            return;
        return focusedMessageIdx;
    }
    isCurrentlyFocusingMessage() {
        return this.getCurrentFocusedMessageIdx() !== undefined;
    }
    switchToThread(threadId) {
        this._setState({ currentThreadId: threadId });
    }
    openNewThread() {
        // if a thread with 0 messages already exists, switch to it
        const { allThreads: currentThreads } = this.state;
        for (const threadId in currentThreads) {
            if (currentThreads[threadId].messages.length === 0) {
                // switch to the existing empty thread and exit
                this.switchToThread(threadId);
                return;
            }
        }
        // otherwise, start a new thread
        const newThread = newThreadObject();
        // update state
        const newThreads = {
            ...currentThreads,
            [newThread.id]: newThread,
        };
        this._storeAllThreads(newThreads);
        this._setState({ allThreads: newThreads, currentThreadId: newThread.id });
    }
    deleteThread(threadId) {
        const { allThreads: currentThreads } = this.state;
        // delete the thread
        const newThreads = { ...currentThreads };
        delete newThreads[threadId];
        // store the updated threads
        this._storeAllThreads(newThreads);
        this._setState({ ...this.state, allThreads: newThreads });
    }
    duplicateThread(threadId) {
        const { allThreads: currentThreads } = this.state;
        const threadToDuplicate = currentThreads[threadId];
        if (!threadToDuplicate)
            return;
        const newThread = {
            ...deepClone(threadToDuplicate),
            id: generateUuid(),
        };
        const newThreads = {
            ...currentThreads,
            [newThread.id]: newThread,
        };
        this._storeAllThreads(newThreads);
        this._setState({ allThreads: newThreads });
    }
    _addMessageToThread(threadId, message) {
        const { allThreads } = this.state;
        const oldThread = allThreads[threadId];
        if (!oldThread)
            return; // should never happen
        // update state and store it
        const newThreads = {
            ...allThreads,
            [oldThread.id]: {
                ...oldThread,
                lastModified: new Date().toISOString(),
                messages: [...oldThread.messages, message],
            },
        };
        this._storeAllThreads(newThreads);
        this._setState({ allThreads: newThreads }); // the current thread just changed (it had a message added to it)
    }
    // sets the currently selected message (must be undefined if no message is selected)
    setCurrentlyFocusedMessageIdx(messageIdx) {
        const threadId = this.state.currentThreadId;
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setState({
            allThreads: {
                ...this.state.allThreads,
                [threadId]: {
                    ...thread,
                    state: {
                        ...thread.state,
                        focusedMessageIdx: messageIdx,
                    },
                },
            },
        });
        // // when change focused message idx, jump - do not jump back when click edit, too confusing.
        // if (messageIdx !== undefined)
        // 	this.jumpToCheckpointBeforeMessageIdx({ threadId, messageIdx, jumpToUserModified: true })
    }
    addNewStagingSelection(newSelection) {
        const focusedMessageIdx = this.getCurrentFocusedMessageIdx();
        // set the selections to the proper value
        let selections = [];
        let setSelections = (s) => { };
        if (focusedMessageIdx === undefined) {
            selections = this.getCurrentThreadState().stagingSelections;
            setSelections = (s) => this.setCurrentThreadState({ stagingSelections: s });
        }
        else {
            selections = this.getCurrentMessageState(focusedMessageIdx).stagingSelections;
            setSelections = (s) => this.setCurrentMessageState(focusedMessageIdx, { stagingSelections: s });
        }
        // if matches with existing selection, overwrite (since text may change)
        const idx = findStagingSelectionIndex(selections, newSelection);
        if (idx !== null && idx !== -1) {
            setSelections([
                ...selections.slice(0, idx),
                newSelection,
                ...selections.slice(idx + 1, Infinity),
            ]);
        }
        // if no match, add it
        else {
            setSelections([...(selections ?? []), newSelection]);
        }
    }
    // Pops the staging selections from the current thread's state
    popStagingSelections(numPops) {
        numPops = numPops ?? 1;
        const focusedMessageIdx = this.getCurrentFocusedMessageIdx();
        // set the selections to the proper value
        let selections = [];
        let setSelections = (s) => { };
        if (focusedMessageIdx === undefined) {
            selections = this.getCurrentThreadState().stagingSelections;
            setSelections = (s) => this.setCurrentThreadState({ stagingSelections: s });
        }
        else {
            selections = this.getCurrentMessageState(focusedMessageIdx).stagingSelections;
            setSelections = (s) => this.setCurrentMessageState(focusedMessageIdx, { stagingSelections: s });
        }
        setSelections([...selections.slice(0, selections.length - numPops)]);
    }
    // set message.state
    _setCurrentMessageState(state, messageIdx) {
        const threadId = this.state.currentThreadId;
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setState({
            allThreads: {
                ...this.state.allThreads,
                [threadId]: {
                    ...thread,
                    messages: thread.messages.map((m, i) => i === messageIdx && m.role === 'user'
                        ? {
                            ...m,
                            state: {
                                ...m.state,
                                ...state,
                            },
                        }
                        : m),
                },
            },
        });
    }
    // set thread.state
    _setThreadState(threadId, state, doNotRefreshMountInfo) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setState({
            allThreads: {
                ...this.state.allThreads,
                [thread.id]: {
                    ...thread,
                    state: {
                        ...thread.state,
                        ...state,
                    },
                },
            },
        }, doNotRefreshMountInfo);
    }
    // gets `staging` and `setStaging` of the currently focused element, given the index of the currently selected message (or undefined if no message is selected)
    getCurrentMessageState(messageIdx) {
        const currMessage = this.getCurrentThread()?.messages?.[messageIdx];
        if (!currMessage || currMessage.role !== 'user')
            return defaultMessageState;
        return currMessage.state;
    }
    setCurrentMessageState(messageIdx, newState) {
        const currMessage = this.getCurrentThread()?.messages?.[messageIdx];
        if (!currMessage || currMessage.role !== 'user')
            return;
        this._setCurrentMessageState(newState, messageIdx);
    }
};
ChatThreadService = __decorate([
    __param(0, IStorageService),
    __param(1, IVoidModelService),
    __param(2, ILLMMessageService),
    __param(3, IToolsService),
    __param(4, IVoidSettingsService),
    __param(5, ILanguageFeaturesService),
    __param(6, IMetricsService),
    __param(7, IEditCodeService),
    __param(8, INotificationService),
    __param(9, IConvertToLLMMessageService),
    __param(10, IWorkspaceContextService),
    __param(11, IDirectoryStrService),
    __param(12, IFileService),
    __param(13, IMCPService),
    __param(14, ICommandService),
    __param(15, IContinueChatClient)
], ChatThreadService);
registerSingleton(IChatThreadService, ChatThreadService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRocmVhZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2t2YW50a29kZS9icm93c2VyL2NoYXRUaHJlYWRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pGLE9BQU8sRUFFTixlQUFlLEdBR2YsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUNOLDZCQUE2QixHQUs3QixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVB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