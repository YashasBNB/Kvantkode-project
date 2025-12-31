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
import { DeferredPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { URI } from '../../../base/common/uri.js';
import { Range } from '../../../editor/common/core/range.js';
import { getWordAtText } from '../../../editor/common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IChatWidgetService } from '../../contrib/chat/browser/chat.js';
import { ChatInputPart } from '../../contrib/chat/browser/chatInputPart.js';
import { AddDynamicVariableAction, } from '../../contrib/chat/browser/contrib/chatDynamicVariables.js';
import { IChatAgentService, } from '../../contrib/chat/common/chatAgents.js';
import { IChatEditingService, } from '../../contrib/chat/common/chatEditingService.js';
import { ChatRequestAgentPart } from '../../contrib/chat/common/chatParserTypes.js';
import { ChatRequestParser } from '../../contrib/chat/common/chatRequestParser.js';
import { IChatService, } from '../../contrib/chat/common/chatService.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
export class MainThreadChatTask {
    get onDidAddProgress() {
        return this._onDidAddProgress.event;
    }
    constructor(content) {
        this.content = content;
        this.kind = 'progressTask';
        this.deferred = new DeferredPromise();
        this._onDidAddProgress = new Emitter();
        this.progress = [];
    }
    task() {
        return this.deferred.p;
    }
    isSettled() {
        return this.deferred.isSettled;
    }
    complete(v) {
        this.deferred.complete(v);
    }
    add(progress) {
        this.progress.push(progress);
        this._onDidAddProgress.fire(progress);
    }
}
let MainThreadChatAgents2 = class MainThreadChatAgents2 extends Disposable {
    constructor(extHostContext, _chatAgentService, _chatService, _chatEditingService, _languageFeaturesService, _chatWidgetService, _instantiationService, _logService, _extensionService) {
        super();
        this._chatAgentService = _chatAgentService;
        this._chatService = _chatService;
        this._chatEditingService = _chatEditingService;
        this._languageFeaturesService = _languageFeaturesService;
        this._chatWidgetService = _chatWidgetService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._extensionService = _extensionService;
        this._agents = this._register(new DisposableMap());
        this._agentCompletionProviders = this._register(new DisposableMap());
        this._agentIdsToCompletionProviders = this._register(new DisposableMap());
        this._chatParticipantDetectionProviders = this._register(new DisposableMap());
        this._chatRelatedFilesProviders = this._register(new DisposableMap());
        this._pendingProgress = new Map();
        this._responsePartHandlePool = 0;
        this._activeTasks = new Map();
        this._unresolvedAnchors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatAgents2);
        this._register(this._chatService.onDidDisposeSession((e) => {
            this._proxy.$releaseSession(e.sessionId);
        }));
        this._register(this._chatService.onDidPerformUserAction((e) => {
            if (typeof e.agentId === 'string') {
                for (const [handle, agent] of this._agents) {
                    if (agent.id === e.agentId) {
                        if (e.action.kind === 'vote') {
                            this._proxy.$acceptFeedback(handle, e.result ?? {}, e.action);
                        }
                        else {
                            this._proxy.$acceptAction(handle, e.result || {}, e);
                        }
                        break;
                    }
                }
            }
        }));
    }
    $unregisterAgent(handle) {
        this._agents.deleteAndDispose(handle);
    }
    $transferActiveChatSession(toWorkspace) {
        const widget = this._chatWidgetService.lastFocusedWidget;
        const sessionId = widget?.viewModel?.model.sessionId;
        if (!sessionId) {
            this._logService.error(`MainThreadChat#$transferActiveChatSession: No active chat session found`);
            return;
        }
        const inputValue = widget?.inputEditor.getValue() ?? '';
        const location = widget.location;
        const mode = widget.input.currentMode;
        this._chatService.transferChatSession({ sessionId, inputValue, location, mode }, URI.revive(toWorkspace));
    }
    async $registerAgent(handle, extension, id, metadata, dynamicProps) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const staticAgentRegistration = this._chatAgentService.getAgent(id, true);
        if (!staticAgentRegistration && !dynamicProps) {
            if (this._chatAgentService.getAgentsByName(id).length) {
                // Likely some extension authors will not adopt the new ID, so give a hint if they register a
                // participant by name instead of ID.
                throw new Error(`chatParticipant must be declared with an ID in package.json. The "id" property may be missing! "${id}"`);
            }
            throw new Error(`chatParticipant must be declared in package.json: ${id}`);
        }
        const impl = {
            invoke: async (request, progress, history, token) => {
                this._pendingProgress.set(request.requestId, progress);
                try {
                    return (await this._proxy.$invokeAgent(handle, request, { history }, token)) ?? {};
                }
                finally {
                    this._pendingProgress.delete(request.requestId);
                }
            },
            setRequestPaused: (requestId, isPaused) => {
                this._proxy.$setRequestPaused(handle, requestId, isPaused);
            },
            provideFollowups: async (request, result, history, token) => {
                if (!this._agents.get(handle)?.hasFollowups) {
                    return [];
                }
                return this._proxy.$provideFollowups(request, handle, result, { history }, token);
            },
            provideChatTitle: (history, token) => {
                return this._proxy.$provideChatTitle(handle, history, token);
            },
            provideSampleQuestions: (location, token) => {
                return this._proxy.$provideSampleQuestions(handle, location, token);
            },
        };
        let disposable;
        if (!staticAgentRegistration && dynamicProps) {
            const extensionDescription = this._extensionService.extensions.find((e) => ExtensionIdentifier.equals(e.identifier, extension));
            disposable = this._chatAgentService.registerDynamicAgent({
                id,
                name: dynamicProps.name,
                description: dynamicProps.description,
                extensionId: extension,
                extensionDisplayName: extensionDescription?.displayName ?? extension.value,
                extensionPublisherId: extensionDescription?.publisher ?? '',
                publisherDisplayName: dynamicProps.publisherName,
                fullName: dynamicProps.fullName,
                metadata: revive(metadata),
                slashCommands: [],
                disambiguation: [],
                locations: [ChatAgentLocation.Panel], // TODO all dynamic participants are panel only?
            }, impl);
        }
        else {
            disposable = this._chatAgentService.registerAgentImplementation(id, impl);
        }
        this._agents.set(handle, {
            id: id,
            extensionId: extension,
            dispose: disposable.dispose,
            hasFollowups: metadata.hasFollowups,
        });
    }
    async $updateAgent(handle, metadataUpdate) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const data = this._agents.get(handle);
        if (!data) {
            this._logService.error(`MainThreadChatAgents2#$updateAgent: No agent with handle ${handle} registered`);
            return;
        }
        data.hasFollowups = metadataUpdate.hasFollowups;
        this._chatAgentService.updateAgent(data.id, revive(metadataUpdate));
    }
    async $handleProgressChunk(requestId, progress, responsePartHandle) {
        const revivedProgress = progress.kind === 'notebookEdit'
            ? ChatNotebookEdit.fromChatEdit(revive(progress))
            : revive(progress);
        if (revivedProgress.kind === 'progressTask') {
            const handle = ++this._responsePartHandlePool;
            const responsePartId = `${requestId}_${handle}`;
            const task = new MainThreadChatTask(revivedProgress.content);
            this._activeTasks.set(responsePartId, task);
            this._pendingProgress.get(requestId)?.(task);
            return handle;
        }
        else if (responsePartHandle !== undefined) {
            const responsePartId = `${requestId}_${responsePartHandle}`;
            const task = this._activeTasks.get(responsePartId);
            switch (revivedProgress.kind) {
                case 'progressTaskResult':
                    if (task && revivedProgress.content) {
                        task.complete(revivedProgress.content.value);
                        this._activeTasks.delete(responsePartId);
                    }
                    else {
                        task?.complete(undefined);
                    }
                    return responsePartHandle;
                case 'warning':
                case 'reference':
                    task?.add(revivedProgress);
                    return;
            }
        }
        if (revivedProgress.kind === 'inlineReference' && revivedProgress.resolveId) {
            if (!this._unresolvedAnchors.has(requestId)) {
                this._unresolvedAnchors.set(requestId, new Map());
            }
            this._unresolvedAnchors.get(requestId)?.set(revivedProgress.resolveId, revivedProgress);
        }
        this._pendingProgress.get(requestId)?.(revivedProgress);
    }
    $handleAnchorResolve(requestId, handle, resolveAnchor) {
        const anchor = this._unresolvedAnchors.get(requestId)?.get(handle);
        if (!anchor) {
            return;
        }
        this._unresolvedAnchors.get(requestId)?.delete(handle);
        if (resolveAnchor) {
            const revivedAnchor = revive(resolveAnchor);
            anchor.inlineReference = revivedAnchor.inlineReference;
        }
    }
    $registerAgentCompletionsProvider(handle, id, triggerCharacters) {
        const provide = async (query, token) => {
            const completions = await this._proxy.$invokeCompletionProvider(handle, query, token);
            return completions.map((c) => ({ ...c, icon: c.icon ? ThemeIcon.fromId(c.icon) : undefined }));
        };
        this._agentIdsToCompletionProviders.set(id, this._chatAgentService.registerAgentCompletionProvider(id, provide));
        this._agentCompletionProviders.set(handle, this._languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentCompletions:' + handle,
            triggerCharacters,
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this._chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return;
                }
                const triggerCharsPart = triggerCharacters
                    .map((c) => escapeRegExpCharacters(c))
                    .join('');
                const wordRegex = new RegExp(`[${triggerCharsPart}]\\S*`, 'g');
                const query = getWordAtText(position.column, wordRegex, model.getLineContent(position.lineNumber), 0)?.word ?? '';
                if (query && !triggerCharacters.some((c) => query.startsWith(c))) {
                    return;
                }
                const parsedRequest = this._instantiationService
                    .createInstance(ChatRequestParser)
                    .parseChatRequest(widget.viewModel.sessionId, model.getValue()).parts;
                const agentPart = parsedRequest.find((part) => part instanceof ChatRequestAgentPart);
                const thisAgentId = this._agents.get(handle)?.id;
                if (agentPart?.agent.id !== thisAgentId) {
                    return;
                }
                const range = computeCompletionRanges(model, position, wordRegex);
                if (!range) {
                    return null;
                }
                const result = await provide(query, token);
                const variableItems = result.map((v) => {
                    const insertText = v.insertText ?? (typeof v.label === 'string' ? v.label : v.label.label);
                    const rangeAfterInsert = new Range(range.insert.startLineNumber, range.insert.startColumn, range.insert.endLineNumber, range.insert.startColumn + insertText.length);
                    return {
                        label: v.label,
                        range,
                        insertText: insertText + ' ',
                        kind: 18 /* CompletionItemKind.Text */,
                        detail: v.detail,
                        documentation: v.documentation,
                        command: {
                            id: AddDynamicVariableAction.ID,
                            title: '',
                            arguments: [
                                {
                                    id: v.id,
                                    widget,
                                    range: rangeAfterInsert,
                                    variableData: revive(v.value),
                                    command: v.command,
                                },
                            ],
                        },
                    };
                });
                return {
                    suggestions: variableItems,
                };
            },
        }));
    }
    $unregisterAgentCompletionsProvider(handle, id) {
        this._agentCompletionProviders.deleteAndDispose(handle);
        this._agentIdsToCompletionProviders.deleteAndDispose(id);
    }
    $registerChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.set(handle, this._chatAgentService.registerChatParticipantDetectionProvider(handle, {
            provideParticipantDetection: async (request, history, options, token) => {
                return await this._proxy.$detectChatParticipant(handle, request, { history }, options, token);
            },
        }));
    }
    $unregisterChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.deleteAndDispose(handle);
    }
    $registerRelatedFilesProvider(handle, metadata) {
        this._chatRelatedFilesProviders.set(handle, this._chatEditingService.registerRelatedFilesProvider(handle, {
            description: metadata.description,
            provideRelatedFiles: async (request, token) => {
                return ((await this._proxy.$provideRelatedFiles(handle, request, token))?.map((v) => ({
                    uri: URI.from(v.uri),
                    description: v.description,
                })) ?? []);
            },
        }));
    }
    $unregisterRelatedFilesProvider(handle) {
        this._chatRelatedFilesProviders.deleteAndDispose(handle);
    }
};
MainThreadChatAgents2 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatAgents2),
    __param(1, IChatAgentService),
    __param(2, IChatService),
    __param(3, IChatEditingService),
    __param(4, ILanguageFeaturesService),
    __param(5, IChatWidgetService),
    __param(6, IInstantiationService),
    __param(7, ILogService),
    __param(8, IExtensionService)
], MainThreadChatAgents2);
export { MainThreadChatAgents2 };
function computeCompletionRanges(model, position, reg) {
    const varWord = getWordAtText(position.column, reg, model.getLineContent(position.lineNumber), 0);
    if (!varWord && model.getWordUntilPosition(position).word) {
        // inside a "normal" word
        return;
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
    return { insert, replace };
}
var ChatNotebookEdit;
(function (ChatNotebookEdit) {
    function fromChatEdit(part) {
        return {
            kind: 'notebookEdit',
            uri: part.uri,
            done: part.done,
            edits: part.edits.map(NotebookDto.fromCellEditOperationDto),
        };
    }
    ChatNotebookEdit.fromChatEdit = fromChatEdit;
})(ChatNotebookEdit || (ChatNotebookEdit = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRBZ2VudHMyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDaGF0QWdlbnRzMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFL0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDMUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBRWhFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFRekUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQ04s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