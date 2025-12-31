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
import { DeferredPromise } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { memoize } from '../../../../base/common/decorators.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IChatAgentService, } from './chatAgents.js';
import { ChatModel, ChatRequestModel, normalizeSerializableChatData, toChatHistoryContent, updateRanges, } from './chatModel.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestSlashCommandPart, chatAgentLeader, chatSubcommandLeader, getPromptText, } from './chatParserTypes.js';
import { ChatRequestParser } from './chatRequestParser.js';
import { ChatServiceTelemetry } from './chatServiceTelemetry.js';
import { ChatSessionStore } from './chatSessionStore.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatVariablesService } from './chatVariables.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode } from './constants.js';
import { ILanguageModelToolsService } from './languageModelToolsService.js';
const serializedChatKey = 'interactive.sessions';
const globalChatKey = 'chat.workspaceTransfer';
const SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS = 1000 * 60;
const maxPersistedSessions = 25;
let CancellableRequest = class CancellableRequest {
    constructor(cancellationTokenSource, requestId, toolsService) {
        this.cancellationTokenSource = cancellationTokenSource;
        this.requestId = requestId;
        this.toolsService = toolsService;
    }
    dispose() {
        this.cancellationTokenSource.dispose();
    }
    cancel() {
        if (this.requestId) {
            this.toolsService.cancelToolCallsForRequest(this.requestId);
        }
        this.cancellationTokenSource.cancel();
    }
};
CancellableRequest = __decorate([
    __param(2, ILanguageModelToolsService)
], CancellableRequest);
let ChatService = class ChatService extends Disposable {
    get transferredSessionData() {
        return this._transferredSessionData;
    }
    get unifiedViewEnabled() {
        return !!this.configurationService.getValue(ChatConfiguration.UnifiedChatView);
    }
    get useFileStorage() {
        return this.configurationService.getValue(ChatConfiguration.UseFileStorage);
    }
    get isEmptyWindow() {
        const workspace = this.workspaceContextService.getWorkspace();
        return !workspace.configuration && workspace.folders.length === 0;
    }
    constructor(storageService, logService, extensionService, instantiationService, telemetryService, workspaceContextService, chatSlashCommandService, chatVariablesService, chatAgentService, configurationService, experimentService) {
        super();
        this.storageService = storageService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.workspaceContextService = workspaceContextService;
        this.chatSlashCommandService = chatSlashCommandService;
        this.chatVariablesService = chatVariablesService;
        this.chatAgentService = chatAgentService;
        this.configurationService = configurationService;
        this.experimentService = experimentService;
        this._sessionModels = this._register(new DisposableMap());
        this._pendingRequests = this._register(new DisposableMap());
        /** Just for empty windows, need to enforce that a chat was deleted, even though other windows still have it */
        this._deletedChatIds = new Set();
        this._onDidSubmitRequest = this._register(new Emitter());
        this.onDidSubmitRequest = this._onDidSubmitRequest.event;
        this._onDidPerformUserAction = this._register(new Emitter());
        this.onDidPerformUserAction = this._onDidPerformUserAction.event;
        this._onDidDisposeSession = this._register(new Emitter());
        this.onDidDisposeSession = this._onDidDisposeSession.event;
        this._sessionFollowupCancelTokens = this._register(new DisposableMap());
        this._chatServiceTelemetry = this.instantiationService.createInstance(ChatServiceTelemetry);
        const sessionData = storageService.get(serializedChatKey, this.isEmptyWindow ? -1 /* StorageScope.APPLICATION */ : 1 /* StorageScope.WORKSPACE */, '');
        if (sessionData) {
            this._persistedSessions = this.deserializeChats(sessionData);
            const countsForLog = Object.keys(this._persistedSessions).length;
            if (countsForLog > 0) {
                this.trace('constructor', `Restored ${countsForLog} persisted sessions`);
            }
        }
        else {
            this._persistedSessions = {};
        }
        const transferredData = this.getTransferredSessionData();
        const transferredChat = transferredData?.chat;
        if (transferredChat) {
            this.trace('constructor', `Transferred session ${transferredChat.sessionId}`);
            this._persistedSessions[transferredChat.sessionId] = transferredChat;
            this._transferredSessionData = {
                sessionId: transferredChat.sessionId,
                inputValue: transferredData.inputValue,
                location: transferredData.location,
                mode: transferredData.mode,
            };
        }
        this._chatSessionStore = this._register(this.instantiationService.createInstance(ChatSessionStore));
        if (this.useFileStorage) {
            this._chatSessionStore.migrateDataIfNeeded(() => this._persistedSessions);
        }
        this._register(storageService.onWillSaveState(() => this.saveState()));
    }
    isEnabled(location) {
        return this.chatAgentService.getContributedDefaultAgent(location) !== undefined;
    }
    saveState() {
        const liveChats = Array.from(this._sessionModels.values()).filter((session) => session.initialLocation === ChatAgentLocation.Panel ||
            session.initialLocation === ChatAgentLocation.EditingSession);
        if (this.useFileStorage) {
            this._chatSessionStore.storeSessions(liveChats);
        }
        else {
            if (this.isEmptyWindow) {
                this.syncEmptyWindowChats(liveChats);
            }
            else {
                let allSessions = liveChats;
                allSessions = allSessions.concat(Object.values(this._persistedSessions)
                    .filter((session) => !this._sessionModels.has(session.sessionId))
                    .filter((session) => session.requests.length));
                allSessions.sort((a, b) => (b.creationDate ?? 0) - (a.creationDate ?? 0));
                // Only keep one persisted edit session, the latest one. This would be the current one if it's live.
                // No way to know whether it's currently live or if it has been cleared and there is no current session.
                // But ensure that we don't store multiple edit sessions.
                let hasPersistedEditSession = false;
                allSessions = allSessions.filter((s) => {
                    if (s.initialLocation === ChatAgentLocation.EditingSession) {
                        if (hasPersistedEditSession) {
                            return false;
                        }
                        else {
                            hasPersistedEditSession = true;
                            return true;
                        }
                    }
                    return true;
                });
                allSessions = allSessions.slice(0, maxPersistedSessions);
                if (allSessions.length) {
                    this.trace('onWillSaveState', `Persisting ${allSessions.length} sessions`);
                }
                const serialized = JSON.stringify(allSessions);
                if (allSessions.length) {
                    this.trace('onWillSaveState', `Persisting ${serialized.length} chars`);
                }
                this.storageService.store(serializedChatKey, serialized, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }
        this._deletedChatIds.clear();
    }
    syncEmptyWindowChats(thisWindowChats) {
        // Note- an unavoidable race condition exists here. If there are multiple empty windows open, and the user quits the application, then the focused
        // window may lose active chats, because all windows are reading and writing to storageService at the same time. This can't be fixed without some
        // kind of locking, but in reality, the focused window will likely have run `saveState` at some point, like on a window focus change, and it will
        // generally be fine.
        const sessionData = this.storageService.get(serializedChatKey, -1 /* StorageScope.APPLICATION */, '');
        const originalPersistedSessions = this._persistedSessions;
        let persistedSessions;
        if (sessionData) {
            persistedSessions = this.deserializeChats(sessionData);
            const countsForLog = Object.keys(persistedSessions).length;
            if (countsForLog > 0) {
                this.trace('constructor', `Restored ${countsForLog} persisted sessions`);
            }
        }
        else {
            persistedSessions = {};
        }
        this._deletedChatIds.forEach((id) => delete persistedSessions[id]);
        // Has the chat in this window been updated, and then closed? Overwrite the old persisted chats.
        Object.values(originalPersistedSessions).forEach((session) => {
            const persistedSession = persistedSessions[session.sessionId];
            if (persistedSession && session.requests.length > persistedSession.requests.length) {
                // We will add a 'modified date' at some point, but comparing the number of requests is good enough
                persistedSessions[session.sessionId] = session;
            }
            else if (!persistedSession && session.isNew) {
                // This session was created in this window, and hasn't been persisted yet
                session.isNew = false;
                persistedSessions[session.sessionId] = session;
            }
        });
        this._persistedSessions = persistedSessions;
        // Add this window's active chat models to the set to persist.
        // Having the same session open in two empty windows at the same time can lead to data loss, this is acceptable
        const allSessions = {
            ...this._persistedSessions,
        };
        for (const chat of thisWindowChats) {
            allSessions[chat.sessionId] = chat;
        }
        let sessionsList = Object.values(allSessions);
        sessionsList.sort((a, b) => (b.creationDate ?? 0) - (a.creationDate ?? 0));
        sessionsList = sessionsList.slice(0, maxPersistedSessions);
        const data = JSON.stringify(sessionsList);
        this.storageService.store(serializedChatKey, data, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    notifyUserAction(action) {
        this._chatServiceTelemetry.notifyUserAction(action);
        this._onDidPerformUserAction.fire(action);
    }
    async setChatSessionTitle(sessionId, title) {
        const model = this._sessionModels.get(sessionId);
        if (model) {
            model.setCustomTitle(title);
            return;
        }
        if (this.useFileStorage) {
            await this._chatSessionStore.setSessionTitle(sessionId, title);
            return;
        }
        const session = this._persistedSessions[sessionId];
        if (session) {
            session.customTitle = title;
        }
    }
    trace(method, message) {
        if (message) {
            this.logService.trace(`ChatService#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatService#${method}`);
        }
    }
    error(method, message) {
        this.logService.error(`ChatService#${method} ${message}`);
    }
    deserializeChats(sessionData) {
        try {
            const arrayOfSessions = revive(JSON.parse(sessionData)); // Revive serialized URIs in session data
            if (!Array.isArray(arrayOfSessions)) {
                throw new Error('Expected array');
            }
            const sessions = arrayOfSessions.reduce((acc, session) => {
                // Revive serialized markdown strings in response data
                for (const request of session.requests) {
                    if (Array.isArray(request.response)) {
                        request.response = request.response.map((response) => {
                            if (typeof response === 'string') {
                                return new MarkdownString(response);
                            }
                            return response;
                        });
                    }
                    else if (typeof request.response === 'string') {
                        request.response = [new MarkdownString(request.response)];
                    }
                }
                acc[session.sessionId] = normalizeSerializableChatData(session);
                return acc;
            }, {});
            return sessions;
        }
        catch (err) {
            this.error('deserializeChats', `Malformed session data: ${err}. [${sessionData.substring(0, 20)}${sessionData.length > 20 ? '...' : ''}]`);
            return {};
        }
    }
    getTransferredSessionData() {
        const data = this.storageService.getObject(globalChatKey, 0 /* StorageScope.PROFILE */, []);
        const workspaceUri = this.workspaceContextService.getWorkspace().folders[0]?.uri;
        if (!workspaceUri) {
            return;
        }
        const thisWorkspace = workspaceUri.toString();
        const currentTime = Date.now();
        // Only use transferred data if it was created recently
        const transferred = data.find((item) => URI.revive(item.toWorkspace).toString() === thisWorkspace &&
            currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS);
        // Keep data that isn't for the current workspace and that hasn't expired yet
        const filtered = data.filter((item) => URI.revive(item.toWorkspace).toString() !== thisWorkspace &&
            currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS);
        this.storageService.store(globalChatKey, JSON.stringify(filtered), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return transferred;
    }
    /**
     * Returns an array of chat details for all persisted chat sessions that have at least one request.
     * Chat sessions that have already been loaded into the chat view are excluded from the result.
     * Imported chat sessions are also excluded from the result.
     */
    async getHistory() {
        if (this.useFileStorage) {
            const liveSessionItems = Array.from(this._sessionModels.values())
                .filter((session) => !session.isImported &&
                (session.initialLocation !== ChatAgentLocation.EditingSession ||
                    this.unifiedViewEnabled))
                .map((session) => {
                const title = session.title || localize('newChat', 'New Chat');
                return {
                    sessionId: session.sessionId,
                    title,
                    lastMessageDate: session.lastMessageDate,
                    isActive: true,
                };
            });
            const index = await this._chatSessionStore.getIndex();
            const entries = Object.values(index)
                .filter((entry) => !this._sessionModels.has(entry.sessionId) && !entry.isImported && !entry.isEmpty)
                .map((entry) => ({
                ...entry,
                isActive: this._sessionModels.has(entry.sessionId),
            }));
            return [...liveSessionItems, ...entries];
        }
        const persistedSessions = Object.values(this._persistedSessions)
            .filter((session) => session.requests.length > 0)
            .filter((session) => !this._sessionModels.has(session.sessionId));
        const persistedSessionItems = persistedSessions
            .filter((session) => !session.isImported && session.initialLocation !== ChatAgentLocation.EditingSession)
            .map((session) => {
            const title = session.customTitle ?? ChatModel.getDefaultTitle(session.requests);
            return {
                sessionId: session.sessionId,
                title,
                lastMessageDate: session.lastMessageDate,
                isActive: false,
            };
        });
        const liveSessionItems = Array.from(this._sessionModels.values())
            .filter((session) => !session.isImported && session.initialLocation !== ChatAgentLocation.EditingSession)
            .map((session) => {
            const title = session.title || localize('newChat', 'New Chat');
            return {
                sessionId: session.sessionId,
                title,
                lastMessageDate: session.lastMessageDate,
                isActive: true,
            };
        });
        return [...liveSessionItems, ...persistedSessionItems];
    }
    async removeHistoryEntry(sessionId) {
        if (this.useFileStorage) {
            await this._chatSessionStore.deleteSession(sessionId);
            return;
        }
        if (this._persistedSessions[sessionId]) {
            this._deletedChatIds.add(sessionId);
            delete this._persistedSessions[sessionId];
            this.saveState();
        }
    }
    async clearAllHistoryEntries() {
        if (this.useFileStorage) {
            await this._chatSessionStore.clearAllSessions();
            return;
        }
        Object.values(this._persistedSessions).forEach((session) => this._deletedChatIds.add(session.sessionId));
        this._persistedSessions = {};
        this.saveState();
    }
    startSession(location, token, isGlobalEditingSession = true) {
        this.trace('startSession');
        return this._startSession(undefined, location, isGlobalEditingSession, token);
    }
    _startSession(someSessionHistory, location, isGlobalEditingSession, token) {
        const model = this.instantiationService.createInstance(ChatModel, someSessionHistory, location);
        if (location === ChatAgentLocation.EditingSession ||
            (this.unifiedViewEnabled && location === ChatAgentLocation.Panel)) {
            model.startEditingSession(isGlobalEditingSession);
        }
        this._sessionModels.set(model.sessionId, model);
        this.initializeSession(model, token);
        return model;
    }
    async initializeSession(model, token) {
        try {
            this.trace('initializeSession', `Initialize session ${model.sessionId}`);
            model.startInitialize();
            await this.extensionService.whenInstalledExtensionsRegistered();
            const defaultAgentData = this.chatAgentService.getContributedDefaultAgent(model.initialLocation) ??
                this.chatAgentService.getContributedDefaultAgent(ChatAgentLocation.Panel);
            if (!defaultAgentData) {
                throw new ErrorNoTelemetry('No default agent contributed');
            }
            if (this.configurationService.getValue('chat.setupFromDialog')) {
                // Activate the default extension provided agent but do not wait
                // for it to be ready so that the session can be used immediately
                // without having to wait for the agent to be ready.
                this.extensionService.activateByEvent(`onChatParticipant:${defaultAgentData.id}`);
            }
            else {
                // No setup participant to fall back on- wait for extension activation
                await this.extensionService.activateByEvent(`onChatParticipant:${defaultAgentData.id}`);
                const defaultAgent = this.chatAgentService
                    .getActivatedAgents()
                    .find((agent) => agent.id === defaultAgentData.id);
                if (!defaultAgent) {
                    throw new ErrorNoTelemetry('No default agent registered');
                }
            }
            model.initialize();
        }
        catch (err) {
            this.trace('startSession', `initializeSession failed: ${err}`);
            model.setInitializationError(err);
            this._sessionModels.deleteAndDispose(model.sessionId);
            this._onDidDisposeSession.fire({ sessionId: model.sessionId, reason: 'initializationFailed' });
        }
    }
    getSession(sessionId) {
        return this._sessionModels.get(sessionId);
    }
    async getOrRestoreSession(sessionId) {
        this.trace('getOrRestoreSession', `sessionId: ${sessionId}`);
        const model = this._sessionModels.get(sessionId);
        if (model) {
            return model;
        }
        let sessionData;
        if (this.useFileStorage) {
            sessionData = revive(await this._chatSessionStore.readSession(sessionId));
        }
        else {
            sessionData = revive(this._persistedSessions[sessionId]);
        }
        if (!sessionData) {
            return undefined;
        }
        const session = this._startSession(sessionData, sessionData.initialLocation ?? ChatAgentLocation.Panel, true, CancellationToken.None);
        const isTransferred = this.transferredSessionData?.sessionId === sessionId;
        if (isTransferred) {
            // TODO
            // this.chatAgentService.toggleToolsAgentMode(this.transferredSessionData.toolsAgentModeEnabled);
            this._transferredSessionData = undefined;
        }
        return session;
    }
    /**
     * This is really just for migrating data from the edit session location to the panel.
     */
    isPersistedSessionEmpty(sessionId) {
        const session = this._persistedSessions[sessionId];
        if (session) {
            return session.requests.length === 0;
        }
        return this._chatSessionStore.isSessionEmpty(sessionId);
    }
    loadSessionFromContent(data) {
        return this._startSession(data, data.initialLocation ?? ChatAgentLocation.Panel, true, CancellationToken.None);
    }
    async resendRequest(request, options) {
        const model = this._sessionModels.get(request.session.sessionId);
        if (!model && model !== request.session) {
            throw new Error(`Unknown session: ${request.session.sessionId}`);
        }
        await model.waitForInitialization();
        const cts = this._pendingRequests.get(request.session.sessionId);
        if (cts) {
            this.trace('resendRequest', `Session ${request.session.sessionId} already has a pending request, cancelling...`);
            cts.cancel();
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const enableCommandDetection = !options?.noCommandDetection;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.mode);
        model.removeRequest(request.id, 1 /* ChatRequestRemovalReason.Resend */);
        const resendOptions = {
            ...options,
            locationData: request.locationData,
            attachedContext: request.attachedContext,
            hasInstructionAttachments: options?.hasInstructionAttachments ?? false,
        };
        await this._sendRequestAsync(model, model.sessionId, request.message, attempt, enableCommandDetection, defaultAgent, location, resendOptions).responseCompletePromise;
    }
    async sendRequest(sessionId, request, options) {
        this.trace('sendRequest', `sessionId: ${sessionId}, message: ${request.substring(0, 20)}${request.length > 20 ? '[...]' : ''}}`);
        // if text is not provided, but chat input has `prompt instructions`
        // attached, use the default prompt text to avoid empty messages
        if (!request.trim() && options?.hasInstructionAttachments) {
            request = 'Follow these instructions.';
        }
        if (!request.trim() &&
            !options?.slashCommand &&
            !options?.agentId &&
            !options?.hasInstructionAttachments) {
            this.trace('sendRequest', 'Rejected empty message');
            return;
        }
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        await model.waitForInitialization();
        if (this._pendingRequests.has(sessionId)) {
            this.trace('sendRequest', `Session ${sessionId} already has a pending request`);
            return;
        }
        const requests = model.getRequests();
        for (let i = requests.length - 1; i >= 0; i -= 1) {
            const request = requests[i];
            if (request.shouldBeRemovedOnSend) {
                if (request.shouldBeRemovedOnSend.afterUndoStop) {
                    request.response?.finalizeUndoState();
                }
                else {
                    this.removeRequest(sessionId, request.id);
                }
            }
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.mode);
        const parsedRequest = this.parseChatRequest(sessionId, request, location, options);
        const agent = parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart)
            ?.agent ?? defaultAgent;
        const agentSlashCommandPart = parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        // This method is only returning whether the request was accepted - don't block on the actual request
        return {
            ...this._sendRequestAsync(model, sessionId, parsedRequest, attempt, !options?.noCommandDetection, defaultAgent, location, options),
            agent,
            slashCommand: agentSlashCommandPart?.command,
        };
    }
    parseChatRequest(sessionId, request, location, options) {
        let parserContext = options?.parserContext;
        if (options?.agentId) {
            const agent = this.chatAgentService.getAgent(options.agentId);
            if (!agent) {
                throw new Error(`Unknown agent: ${options.agentId}`);
            }
            parserContext = { selectedAgent: agent, mode: options.mode };
            const commandPart = options.slashCommand
                ? ` ${chatSubcommandLeader}${options.slashCommand}`
                : '';
            request = `${chatAgentLeader}${agent.name}${commandPart} ${request}`;
        }
        const parsedRequest = this.instantiationService
            .createInstance(ChatRequestParser)
            .parseChatRequest(sessionId, request, location, parserContext);
        return parsedRequest;
    }
    refreshFollowupsCancellationToken(sessionId) {
        this._sessionFollowupCancelTokens.get(sessionId)?.cancel();
        const newTokenSource = new CancellationTokenSource();
        this._sessionFollowupCancelTokens.set(sessionId, newTokenSource);
        return newTokenSource.token;
    }
    _sendRequestAsync(model, sessionId, parsedRequest, attempt, enableCommandDetection, defaultAgent, location, options) {
        const followupsCancelToken = this.refreshFollowupsCancellationToken(sessionId);
        let request;
        const agentPart = 'kind' in parsedRequest
            ? undefined
            : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart);
        const agentSlashCommandPart = 'kind' in parsedRequest
            ? undefined
            : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        const commandPart = 'kind' in parsedRequest
            ? undefined
            : parsedRequest.parts.find((r) => r instanceof ChatRequestSlashCommandPart);
        const requests = [...model.getRequests()];
        let gotProgress = false;
        const requestType = commandPart ? 'slashCommand' : 'string';
        const responseCreated = new DeferredPromise();
        let responseCreatedComplete = false;
        function completeResponseCreated() {
            if (!responseCreatedComplete && request?.response) {
                responseCreated.complete(request.response);
                responseCreatedComplete = true;
            }
        }
        const source = new CancellationTokenSource();
        const token = source.token;
        const sendRequestInternal = async () => {
            const progressCallback = (progress) => {
                if (token.isCancellationRequested) {
                    return;
                }
                gotProgress = true;
                if (progress.kind === 'markdownContent') {
                    this.trace('sendRequest', `Provider returned progress for session ${model.sessionId}, ${progress.content.value.length} chars`);
                }
                else {
                    this.trace('sendRequest', `Provider returned progress: ${JSON.stringify(progress)}`);
                }
                model.acceptResponseProgress(request, progress);
                completeResponseCreated();
            };
            let detectedAgent;
            let detectedCommand;
            const stopWatch = new StopWatch(false);
            const listener = token.onCancellationRequested(() => {
                this.trace('sendRequest', `Request for session ${model.sessionId} was cancelled`);
                this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                    timeToFirstProgress: undefined,
                    // Normally timings happen inside the EH around the actual provider. For cancellation we can measure how long the user waited before cancelling
                    totalTime: stopWatch.elapsed(),
                    result: 'cancelled',
                    requestType,
                    agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                    agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                    slashCommand: agentSlashCommandPart
                        ? agentSlashCommandPart.command.name
                        : commandPart?.slashCommand.command,
                    chatSessionId: model.sessionId,
                    location,
                    citations: request?.response?.codeCitations.length ?? 0,
                    numCodeBlocks: getCodeBlocks(request.response?.response.toString() ?? '').length,
                    isParticipantDetected: !!detectedAgent,
                    enableCommandDetection,
                    attachmentKinds: this.attachmentKindsForTelemetry(request.variableData),
                });
                model.cancelRequest(request);
            });
            try {
                let rawResult;
                let agentOrCommandFollowups = undefined;
                let chatTitlePromise;
                if (agentPart || (defaultAgent && !commandPart)) {
                    const prepareChatAgentRequest = async (agent, command, enableCommandDetection, chatRequest, isParticipantDetected) => {
                        const initVariableData = { variables: [] };
                        request =
                            chatRequest ??
                                model.addRequest(parsedRequest, initVariableData, attempt, agent, command, options?.confirmation, options?.locationData, options?.attachedContext, undefined, options?.userSelectedModelId);
                        let variableData;
                        let message;
                        if (chatRequest) {
                            variableData = chatRequest.variableData;
                            message = getPromptText(request.message).message;
                        }
                        else {
                            variableData = this.chatVariablesService.resolveVariables(parsedRequest, request.attachedContext);
                            model.updateRequest(request, variableData);
                            const promptTextResult = getPromptText(request.message);
                            variableData = updateRanges(variableData, promptTextResult.diff); // TODO bit of a hack
                            message = promptTextResult.message;
                        }
                        return {
                            sessionId,
                            requestId: request.id,
                            agentId: agent.id,
                            message,
                            command: command?.name,
                            variables: variableData,
                            enableCommandDetection,
                            isParticipantDetected,
                            attempt,
                            location,
                            locationData: request.locationData,
                            acceptedConfirmationData: options?.acceptedConfirmationData,
                            rejectedConfirmationData: options?.rejectedConfirmationData,
                            userSelectedModelId: options?.userSelectedModelId,
                            userSelectedTools: options?.userSelectedTools,
                        };
                    };
                    if (this.configurationService.getValue('chat.detectParticipant.enabled') !== false &&
                        this.chatAgentService.hasChatParticipantDetectionProviders() &&
                        !agentPart &&
                        !commandPart &&
                        !agentSlashCommandPart &&
                        enableCommandDetection &&
                        options?.mode !== ChatMode.Agent &&
                        options?.mode !== ChatMode.Edit) {
                        // We have no agent or command to scope history with, pass the full history to the participant detection provider
                        const defaultAgentHistory = this.getHistoryEntriesFromModel(requests, model.sessionId, location, defaultAgent.id);
                        // Prepare the request object that we will send to the participant detection provider
                        const chatAgentRequest = await prepareChatAgentRequest(defaultAgent, undefined, enableCommandDetection, undefined, false);
                        const result = await this.chatAgentService.detectAgentOrCommand(chatAgentRequest, defaultAgentHistory, { location }, token);
                        if (result &&
                            this.chatAgentService.getAgent(result.agent.id)?.locations?.includes(location)) {
                            // Update the response in the ChatModel to reflect the detected agent and command
                            request.response?.setAgent(result.agent, result.command);
                            detectedAgent = result.agent;
                            detectedCommand = result.command;
                        }
                    }
                    const agent = (detectedAgent ?? agentPart?.agent ?? defaultAgent);
                    const command = detectedCommand ?? agentSlashCommandPart?.command;
                    await this.extensionService.activateByEvent(`onChatParticipant:${agent.id}`);
                    await this.checkAgentAllowed(agent);
                    // Recompute history in case the agent or command changed
                    const history = this.getHistoryEntriesFromModel(requests, model.sessionId, location, agent.id);
                    const requestProps = await prepareChatAgentRequest(agent, command, enableCommandDetection, request /* Reuse the request object if we already created it for participant detection */, !!detectedAgent);
                    const pendingRequest = this._pendingRequests.get(sessionId);
                    if (pendingRequest && !pendingRequest.requestId) {
                        pendingRequest.requestId = requestProps.requestId;
                    }
                    completeResponseCreated();
                    const agentResult = await this.chatAgentService.invokeAgent(agent.id, requestProps, progressCallback, history, token);
                    rawResult = agentResult;
                    agentOrCommandFollowups = this.chatAgentService.getFollowups(agent.id, requestProps, agentResult, history, followupsCancelToken);
                    chatTitlePromise =
                        model.getRequests().length === 1 && !model.customTitle
                            ? this.chatAgentService.getChatTitle(defaultAgent.id, this.getHistoryEntriesFromModel(model.getRequests(), model.sessionId, location, agent.id), CancellationToken.None)
                            : undefined;
                }
                else if (commandPart &&
                    this.chatSlashCommandService.hasCommand(commandPart.slashCommand.command)) {
                    request = model.addRequest(parsedRequest, { variables: [] }, attempt);
                    completeResponseCreated();
                    // contributed slash commands
                    // TODO: spell this out in the UI
                    const history = [];
                    for (const request of model.getRequests()) {
                        if (!request.response) {
                            continue;
                        }
                        history.push({
                            role: 1 /* ChatMessageRole.User */,
                            content: [{ type: 'text', value: request.message.text }],
                        });
                        history.push({
                            role: 2 /* ChatMessageRole.Assistant */,
                            content: [{ type: 'text', value: request.response.response.toString() }],
                        });
                    }
                    const message = parsedRequest.text;
                    const commandResult = await this.chatSlashCommandService.executeCommand(commandPart.slashCommand.command, message.substring(commandPart.slashCommand.command.length + 1).trimStart(), new Progress((p) => {
                        progressCallback(p);
                    }), history, location, token);
                    agentOrCommandFollowups = Promise.resolve(commandResult?.followUp);
                    rawResult = {};
                }
                else {
                    throw new Error(`Cannot handle request`);
                }
                if (token.isCancellationRequested) {
                    return;
                }
                else {
                    if (!rawResult) {
                        this.trace('sendRequest', `Provider returned no response for session ${model.sessionId}`);
                        rawResult = {
                            errorDetails: {
                                message: localize('emptyResponse', 'Provider returned null response'),
                            },
                        };
                    }
                    const result = rawResult.errorDetails?.responseIsFiltered
                        ? 'filtered'
                        : rawResult.errorDetails && gotProgress
                            ? 'errorWithOutput'
                            : rawResult.errorDetails
                                ? 'error'
                                : 'success';
                    const commandForTelemetry = agentSlashCommandPart
                        ? agentSlashCommandPart.command.name
                        : commandPart?.slashCommand.command;
                    this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                        timeToFirstProgress: rawResult.timings?.firstProgress,
                        totalTime: rawResult.timings?.totalElapsed,
                        result,
                        requestType,
                        agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                        agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                        slashCommand: commandForTelemetry,
                        chatSessionId: model.sessionId,
                        enableCommandDetection,
                        isParticipantDetected: !!detectedAgent,
                        location,
                        citations: request.response?.codeCitations.length ?? 0,
                        numCodeBlocks: getCodeBlocks(request.response?.response.toString() ?? '').length,
                        attachmentKinds: this.attachmentKindsForTelemetry(request.variableData),
                    });
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    this.trace('sendRequest', `Provider returned response for session ${model.sessionId}`);
                    model.completeResponse(request);
                    if (agentOrCommandFollowups) {
                        agentOrCommandFollowups.then((followups) => {
                            model.setFollowups(request, followups);
                            this._chatServiceTelemetry.retrievedFollowups(agentPart?.agent.id ?? '', commandForTelemetry, followups?.length ?? 0);
                        });
                    }
                    chatTitlePromise?.then((title) => {
                        if (title) {
                            model.setCustomTitle(title);
                        }
                    });
                }
            }
            catch (err) {
                const result = 'error';
                this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                    timeToFirstProgress: undefined,
                    totalTime: undefined,
                    result,
                    requestType,
                    agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                    agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                    slashCommand: agentSlashCommandPart
                        ? agentSlashCommandPart.command.name
                        : commandPart?.slashCommand.command,
                    chatSessionId: model.sessionId,
                    location,
                    citations: 0,
                    numCodeBlocks: 0,
                    enableCommandDetection,
                    isParticipantDetected: !!detectedAgent,
                    attachmentKinds: this.attachmentKindsForTelemetry(request.variableData),
                });
                this.logService.error(`Error while handling chat request: ${toErrorMessage(err, true)}`);
                if (request) {
                    const rawResult = { errorDetails: { message: err.message } };
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    model.completeResponse(request);
                }
            }
            finally {
                listener.dispose();
            }
        };
        const rawResponsePromise = sendRequestInternal();
        // Note- requestId is not known at this point, assigned later
        this._pendingRequests.set(model.sessionId, this.instantiationService.createInstance(CancellableRequest, source, undefined));
        rawResponsePromise.finally(() => {
            this._pendingRequests.deleteAndDispose(model.sessionId);
        });
        this._onDidSubmitRequest.fire({ chatSessionId: model.sessionId });
        return {
            responseCreatedPromise: responseCreated.p,
            responseCompletePromise: rawResponsePromise,
        };
    }
    async checkAgentAllowed(agent) {
        if (agent.isToolsAgent) {
            const enabled = await this.experimentService.getTreatment('chatAgentEnabled');
            if (enabled === false) {
                throw new Error('Agent is currently disabled');
            }
        }
    }
    attachmentKindsForTelemetry(variableData) {
        // TODO this shows why attachments still have to be cleaned up somewhat
        return variableData.variables.map((v) => {
            if (v.kind === 'implicit') {
                return 'implicit';
            }
            else if (v.range) {
                // 'range' is range within the prompt text
                if (v.isTool) {
                    return 'toolInPrompt';
                }
                else {
                    return 'fileInPrompt';
                }
            }
            else if (v.kind === 'command') {
                return 'command';
            }
            else if (v.kind === 'symbol') {
                return 'symbol';
            }
            else if (v.isImage) {
                return 'image';
            }
            else if (v.isDirectory) {
                return 'directory';
            }
            else if (v.isTool) {
                return 'tool';
            }
            else {
                if (URI.isUri(v.value)) {
                    return 'file';
                }
                else if (isLocation(v.value)) {
                    return 'location';
                }
                else {
                    return 'otherAttachment';
                }
            }
        });
    }
    getHistoryEntriesFromModel(requests, sessionId, location, forAgentId) {
        const history = [];
        const agent = this.chatAgentService.getAgent(forAgentId);
        for (const request of requests) {
            if (!request.response) {
                continue;
            }
            if (forAgentId !== request.response.agent?.id && !agent?.isDefault) {
                // An agent only gets to see requests that were sent to this agent.
                // The default agent (the undefined case) gets to see all of them.
                continue;
            }
            const promptTextResult = getPromptText(request.message);
            const historyRequest = {
                sessionId: sessionId,
                requestId: request.id,
                agentId: request.response.agent?.id ?? '',
                message: promptTextResult.message,
                command: request.response.slashCommand?.name,
                variables: updateRanges(request.variableData, promptTextResult.diff), // TODO bit of a hack
                location: ChatAgentLocation.Panel,
            };
            history.push({
                request: historyRequest,
                response: toChatHistoryContent(request.response.response.value),
                result: request.response.result ?? {},
            });
        }
        return history;
    }
    async removeRequest(sessionId, requestId) {
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        await model.waitForInitialization();
        const pendingRequest = this._pendingRequests.get(sessionId);
        if (pendingRequest?.requestId === requestId) {
            pendingRequest.cancel();
            this._pendingRequests.deleteAndDispose(sessionId);
        }
        model.removeRequest(requestId);
    }
    async adoptRequest(sessionId, request) {
        if (!(request instanceof ChatRequestModel)) {
            throw new TypeError('Can only adopt requests of type ChatRequestModel');
        }
        const target = this._sessionModels.get(sessionId);
        if (!target) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        await target.waitForInitialization();
        const oldOwner = request.session;
        target.adoptRequest(request);
        if (request.response && !request.response.isComplete) {
            const cts = this._pendingRequests.deleteAndLeak(oldOwner.sessionId);
            if (cts) {
                cts.requestId = request.id;
                this._pendingRequests.set(target.sessionId, cts);
            }
        }
    }
    async addCompleteRequest(sessionId, message, variableData, attempt, response) {
        this.trace('addCompleteRequest', `message: ${message}`);
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        await model.waitForInitialization();
        const parsedRequest = typeof message === 'string'
            ? this.instantiationService
                .createInstance(ChatRequestParser)
                .parseChatRequest(sessionId, message)
            : message;
        const request = model.addRequest(parsedRequest, variableData || { variables: [] }, attempt ?? 0, undefined, undefined, undefined, undefined, undefined, true);
        if (typeof response.message === 'string') {
            // TODO is this possible?
            model.acceptResponseProgress(request, {
                content: new MarkdownString(response.message),
                kind: 'markdownContent',
            });
        }
        else {
            for (const part of response.message) {
                model.acceptResponseProgress(request, part, true);
            }
        }
        model.setResponse(request, response.result || {});
        if (response.followups !== undefined) {
            model.setFollowups(request, response.followups);
        }
        model.completeResponse(request);
    }
    cancelCurrentRequestForSession(sessionId) {
        this.trace('cancelCurrentRequestForSession', `sessionId: ${sessionId}`);
        this._pendingRequests.get(sessionId)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionId);
    }
    async clearSession(sessionId) {
        this.trace('clearSession', `sessionId: ${sessionId}`);
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        if (model.initialLocation === ChatAgentLocation.Panel) {
            if (this.useFileStorage) {
                if (model.getRequests().length === 0) {
                    await this._chatSessionStore.deleteSession(sessionId);
                }
                else {
                    await this._chatSessionStore.storeSessions([model]);
                }
            }
            else {
                if (model.getRequests().length === 0) {
                    delete this._persistedSessions[sessionId];
                }
                else {
                    // Turn all the real objects into actual JSON, otherwise, calling 'revive' may fail when it tries to
                    // assign values to properties that are getters- microsoft/vscode-copilot-release#1233
                    const sessionData = JSON.parse(JSON.stringify(model));
                    sessionData.isNew = true;
                    this._persistedSessions[sessionId] = sessionData;
                }
            }
        }
        this._sessionModels.deleteAndDispose(sessionId);
        this._pendingRequests.get(sessionId)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionId);
        this._onDidDisposeSession.fire({ sessionId, reason: 'cleared' });
    }
    hasSessions() {
        if (this.useFileStorage) {
            return this._chatSessionStore.hasSessions();
        }
        else {
            return Object.values(this._persistedSessions).length > 0;
        }
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        const model = Iterable.find(this._sessionModels.values(), (model) => model.sessionId === transferredSessionData.sessionId);
        if (!model) {
            throw new Error(`Failed to transfer session. Unknown session ID: ${transferredSessionData.sessionId}`);
        }
        const existingRaw = this.storageService.getObject(globalChatKey, 0 /* StorageScope.PROFILE */, []);
        existingRaw.push({
            chat: model.toJSON(),
            timestampInMilliseconds: Date.now(),
            toWorkspace: toWorkspace,
            inputValue: transferredSessionData.inputValue,
            location: transferredSessionData.location,
            mode: transferredSessionData.mode,
        });
        this.storageService.store(globalChatKey, JSON.stringify(existingRaw), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.trace('transferChatSession', `Transferred session ${model.sessionId} to workspace ${toWorkspace.toString()}`);
    }
    isEditingLocation(location) {
        return location === ChatAgentLocation.EditingSession || this.unifiedViewEnabled;
    }
    getChatStorageFolder() {
        return this._chatSessionStore.getChatStorageFolder();
    }
    logChatIndex() {
        this._chatSessionStore.logIndex();
    }
};
__decorate([
    memoize
], ChatService.prototype, "unifiedViewEnabled", null);
__decorate([
    memoize
], ChatService.prototype, "useFileStorage", null);
ChatService = __decorate([
    __param(0, IStorageService),
    __param(1, ILogService),
    __param(2, IExtensionService),
    __param(3, IInstantiationService),
    __param(4, ITelemetryService),
    __param(5, IWorkspaceContextService),
    __param(6, IChatSlashCommandService),
    __param(7, IChatVariablesService),
    __param(8, IChatAgentService),
    __param(9, IConfigurationService),
    __param(10, IWorkbenchAssignmentService)
], ChatService);
export { ChatService };
function getCodeBlocks(text) {
    const lines = text.split('\n');
    const codeBlockLanguages = [];
    let codeBlockState;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (codeBlockState) {
            if (new RegExp(`^\\s*${codeBlockState.delimiter}\\s*$`).test(line)) {
                codeBlockLanguages.push(codeBlockState.languageId);
                codeBlockState = undefined;
            }
        }
        else {
            const match = line.match(/^(\s*)(`{3,}|~{3,})(\w*)/);
            if (match) {
                codeBlockState = { delimiter: match[2], languageId: match[3] };
            }
        }
    }
    return codeBlockLanguages;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDN0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVB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