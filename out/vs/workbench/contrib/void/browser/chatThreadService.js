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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRocmVhZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY2hhdFRocmVhZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDekYsT0FBTyxFQUVOLGVBQWUsR0FHZixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sNkJBQTZCLEdBSzdCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBUWpHLE9B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