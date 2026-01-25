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
        console.log('🤖 _runChatAgent started:', {
            threadId,
            chatMode: this._settingsService.state.globalSettings.chatMode,
            hasCallThisToolFirst: !!callThisToolFirst
        });
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
                console.log('🤖 Agent LLM Response:', {
                    threadId,
                    hasToolCall: !!toolCall,
                    responseLength: info.fullText?.length || 0,
                    first200Chars: info.fullText?.substring(0, 200) + '...'
                });
                this._addMessageToThread(threadId, {
                    role: 'assistant',
                    displayContent: info.fullText,
                    reasoning: info.fullReasoning,
                    anthropicReasoning: info.anthropicReasoning,
                });
                this._setStreamState(threadId, { isRunning: 'idle', interrupt: 'not_needed' }); // just decorative for clarity
                // call tool if there is one
                if (toolCall) {
                    console.log('🔧 Agent Tool Call:', {
                        threadId,
                        toolName: toolCall.name,
                        toolId: toolCall.id,
                        hasRawParams: !!toolCall.rawParams
                    });
                    const mcpTools = this._mcpService.getMCPTools();
                    const mcpTool = mcpTools?.find((t) => t.name === toolCall.name);
                    const { awaitingUserApproval, interrupted } = await this._runToolCall(threadId, toolCall.name, toolCall.id, mcpTool?.mcpServerName, { preapproved: false, unvalidatedToolParams: toolCall.rawParams });
                    console.log('🔧 Agent Tool Result:', {
                        threadId,
                        toolName: toolCall.name,
                        awaitingUserApproval,
                        interrupted
                    });
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
                    console.log('🤖 Agent Fallback - No tool call, checking for code block:', {
                        threadId,
                        responseLength: info.fullText?.length || 0,
                        hasCodeBlock: /```/.test(info.fullText || '')
                    });
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
        // Get the thread after adding user message
        const threadAfterUserAdd = this.state.allThreads[threadId];
        const assistantIdx = threadAfterUserAdd?.messages.length ?? 0; // This will be the index where assistant message will be added
        this._setStreamState(threadId, {
            isRunning: 'LLM',
            llmInfo: {
                displayContentSoFar: '',
                reasoningSoFar: '',
                toolCallSoFar: null,
            },
            interrupt: Promise.resolve(() => { }),
        });
        // Validate thread exists and get updated messages after adding user/assistant messages
        const currentThread = this.state.allThreads[threadId];
        if (!currentThread) {
            console.error('Thread does not exist:', threadId);
            return;
        }
        const threadMessages = currentThread.messages ?? [];
        if (threadMessages.length === 0) {
            console.error('Thread has no messages after adding user/assistant messages:', threadId);
            return;
        }
        const { abort } = await this._continueChatClient.streamResponse({
            messages: threadMessages,
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
                // Create assistant message on first chunk if it doesn't exist
                if (currThread && currMessages && currMessages.length <= assistantIdx) {
                    const assistantMessage = {
                        role: 'assistant',
                        displayContent: stream.llmInfo.displayContentSoFar,
                        reasoning: stream.llmInfo.reasoningSoFar,
                        anthropicReasoning: null,
                    };
                    this._addMessageToThread(threadId, assistantMessage);
                }
                else if (currThread && currMessages && currMessages[assistantIdx]) {
                    // Update existing assistant message
                    const updatedAssistant = {
                        ...currMessages[assistantIdx],
                        displayContent: stream.llmInfo.displayContentSoFar,
                        reasoning: stream.llmInfo.reasoningSoFar,
                    };
                    this._editMessageInThread(threadId, assistantIdx, updatedAssistant);
                }
            },
            onDone: ({ content, reasoning }) => {
                const stream = this.streamState[threadId];
                if (!stream || !stream.llmInfo)
                    return;
                stream.llmInfo.displayContentSoFar = content;
                stream.llmInfo.reasoningSoFar = reasoning ?? '';
                const currThread = this.state.allThreads[threadId];
                const currMessages = currThread?.messages;
                // Create assistant message if it doesn't exist, otherwise update it
                if (currThread && currMessages && currMessages.length <= assistantIdx) {
                    const finalAssistant = {
                        role: 'assistant',
                        displayContent: content,
                        reasoning: reasoning ?? '',
                        anthropicReasoning: null,
                    };
                    this._addMessageToThread(threadId, finalAssistant);
                }
                else if (currThread && currMessages && currMessages[assistantIdx]) {
                    const finalAssistant = {
                        ...currMessages[assistantIdx],
                        displayContent: content,
                        reasoning: reasoning ?? '',
                    };
                    this._editMessageInThread(threadId, assistantIdx, finalAssistant);
                }
                this._setStreamState(threadId, {
                    isRunning: 'idle-has-changes',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRocmVhZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9jaGF0VGhyZWFkU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RixPQUFPLEVBRU4sZUFBZSxHQUdmLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTiw2QkFBNkIsR0FLN0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDakQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFR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