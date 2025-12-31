var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor, isCompositeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IChatService } from '../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import { CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_HAS_AGENT2, CTX_INLINE_CHAT_POSSIBLE, } from '../common/inlineChat.js';
import { HunkData, Session, SessionWholeRange, StashedSession, } from './inlineChatSession.js';
export class InlineChatError extends Error {
    static { this.code = 'InlineChatError'; }
    constructor(message) {
        super(message);
        this.name = InlineChatError.code;
    }
}
let InlineChatSessionServiceImpl = class InlineChatSessionServiceImpl {
    constructor(_telemetryService, _modelService, _textModelService, _editorWorkerService, _logService, _instaService, _editorService, _textFileService, _languageService, _chatService, _chatAgentService, _chatWidgetService) {
        this._telemetryService = _telemetryService;
        this._modelService = _modelService;
        this._textModelService = _textModelService;
        this._editorWorkerService = _editorWorkerService;
        this._logService = _logService;
        this._instaService = _instaService;
        this._editorService = _editorService;
        this._textFileService = _textFileService;
        this._languageService = _languageService;
        this._chatService = _chatService;
        this._chatAgentService = _chatAgentService;
        this._chatWidgetService = _chatWidgetService;
        this._store = new DisposableStore();
        this._onWillStartSession = this._store.add(new Emitter());
        this.onWillStartSession = this._onWillStartSession.event;
        this._onDidMoveSession = this._store.add(new Emitter());
        this.onDidMoveSession = this._onDidMoveSession.event;
        this._onDidEndSession = this._store.add(new Emitter());
        this.onDidEndSession = this._onDidEndSession.event;
        this._onDidStashSession = this._store.add(new Emitter());
        this.onDidStashSession = this._onDidStashSession.event;
        this._sessions = new Map();
        this._keyComputers = new Map();
        // ---- NEW
        this._sessions2 = new ResourceMap();
        this._onDidChangeSessions = this._store.add(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
    }
    dispose() {
        this._store.dispose();
        this._sessions.forEach((x) => x.store.dispose());
        this._sessions.clear();
    }
    async createSession(editor, options, token) {
        const agent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Editor);
        if (!agent) {
            this._logService.trace('[IE] NO agent found');
            return undefined;
        }
        this._onWillStartSession.fire(editor);
        const textModel = editor.getModel();
        const selection = editor.getSelection();
        const store = new DisposableStore();
        this._logService.trace(`[IE] creating NEW session for ${editor.getId()}, ${agent.extensionId}`);
        const chatModel = options.session?.chatModel ?? this._chatService.startSession(ChatAgentLocation.Editor, token);
        if (!chatModel) {
            this._logService.trace('[IE] NO chatModel found');
            return undefined;
        }
        store.add(toDisposable(() => {
            const doesOtherSessionUseChatModel = [...this._sessions.values()].some((data) => data.session !== session && data.session.chatModel === chatModel);
            if (!doesOtherSessionUseChatModel) {
                this._chatService.clearSession(chatModel.sessionId);
                chatModel.dispose();
            }
        }));
        const lastResponseListener = store.add(new MutableDisposable());
        store.add(chatModel.onDidChange((e) => {
            if (e.kind !== 'addRequest' || !e.request.response) {
                return;
            }
            const { response } = e.request;
            session.markModelVersion(e.request);
            lastResponseListener.value = response.onDidChange(() => {
                if (!response.isComplete) {
                    return;
                }
                lastResponseListener.clear(); // ONCE
                // special handling for untitled files
                for (const part of response.response.value) {
                    if (part.kind !== 'textEditGroup' ||
                        part.uri.scheme !== Schemas.untitled ||
                        isEqual(part.uri, session.textModelN.uri)) {
                        continue;
                    }
                    const langSelection = this._languageService.createByFilepathOrFirstLine(part.uri, undefined);
                    const untitledTextModel = this._textFileService.untitled.create({
                        associatedResource: part.uri,
                        languageId: langSelection.languageId,
                    });
                    untitledTextModel.resolve();
                    this._textModelService.createModelReference(part.uri).then((ref) => {
                        store.add(ref);
                    });
                }
            });
        }));
        store.add(this._chatAgentService.onDidChangeAgents((e) => {
            if (e === undefined &&
                (!this._chatAgentService.getAgent(agent.id) ||
                    !this._chatAgentService
                        .getActivatedAgents()
                        .map((agent) => agent.id)
                        .includes(agent.id))) {
                this._logService.trace(`[IE] provider GONE for ${editor.getId()}, ${agent.extensionId}`);
                this._releaseSession(session, true);
            }
        }));
        const id = generateUuid();
        const targetUri = textModel.uri;
        // AI edits happen in the actual model, keep a reference but make no copy
        store.add(await this._textModelService.createModelReference(textModel.uri));
        const textModelN = textModel;
        // create: keep a snapshot of the "actual" model
        const textModel0 = store.add(this._modelService.createModel(createTextBufferFactoryFromSnapshot(textModel.createSnapshot()), { languageId: textModel.getLanguageId(), onDidChange: Event.None }, targetUri.with({
            scheme: Schemas.vscode,
            authority: 'inline-chat',
            path: '',
            query: new URLSearchParams({ id, textModel0: '' }).toString(),
        }), true));
        // untitled documents are special and we are releasing their session when their last editor closes
        if (targetUri.scheme === Schemas.untitled) {
            store.add(this._editorService.onDidCloseEditor(() => {
                if (!this._editorService.isOpened({
                    resource: targetUri,
                    typeId: UntitledTextEditorInput.ID,
                    editorId: DEFAULT_EDITOR_ASSOCIATION.id,
                })) {
                    this._releaseSession(session, true);
                }
            }));
        }
        let wholeRange = options.wholeRange;
        if (!wholeRange) {
            wholeRange = new Range(selection.selectionStartLineNumber, selection.selectionStartColumn, selection.positionLineNumber, selection.positionColumn);
        }
        if (token.isCancellationRequested) {
            store.dispose();
            return undefined;
        }
        const session = new Session(options.headless ?? false, targetUri, textModel0, textModelN, agent, store.add(new SessionWholeRange(textModelN, wholeRange)), store.add(new HunkData(this._editorWorkerService, textModel0, textModelN)), chatModel, options.session?.versionsByRequest);
        // store: key -> session
        const key = this._key(editor, session.targetUri);
        if (this._sessions.has(key)) {
            store.dispose();
            throw new Error(`Session already stored for ${key}`);
        }
        this._sessions.set(key, { session, editor, store });
        return session;
    }
    moveSession(session, target) {
        const newKey = this._key(target, session.targetUri);
        const existing = this._sessions.get(newKey);
        if (existing) {
            if (existing.session !== session) {
                throw new Error(`Cannot move session because the target editor already/still has one`);
            }
            else {
                // noop
                return;
            }
        }
        let found = false;
        for (const [oldKey, data] of this._sessions) {
            if (data.session === session) {
                found = true;
                this._sessions.delete(oldKey);
                this._sessions.set(newKey, { ...data, editor: target });
                this._logService.trace(`[IE] did MOVE session for ${data.editor.getId()} to NEW EDITOR ${target.getId()}, ${session.agent.extensionId}`);
                this._onDidMoveSession.fire({ session, editor: target });
                break;
            }
        }
        if (!found) {
            throw new Error(`Cannot move session because it is not stored`);
        }
    }
    releaseSession(session) {
        this._releaseSession(session, false);
    }
    _releaseSession(session, byServer) {
        let tuple;
        // cleanup
        for (const candidate of this._sessions) {
            if (candidate[1].session === session) {
                // if (value.session === session) {
                tuple = candidate;
                break;
            }
        }
        if (!tuple) {
            // double remove
            return;
        }
        this._telemetryService.publicLog2('interactiveEditor/session', session.asTelemetryData());
        const [key, value] = tuple;
        this._sessions.delete(key);
        this._logService.trace(`[IE] did RELEASED session for ${value.editor.getId()}, ${session.agent.extensionId}`);
        this._onDidEndSession.fire({ editor: value.editor, session, endedByExternalCause: byServer });
        value.store.dispose();
    }
    stashSession(session, editor, undoCancelEdits) {
        const result = this._instaService.createInstance(StashedSession, editor, session, undoCancelEdits);
        this._onDidStashSession.fire({ editor, session });
        this._logService.trace(`[IE] did STASH session for ${editor.getId()}, ${session.agent.extensionId}`);
        return result;
    }
    getCodeEditor(session) {
        for (const [, data] of this._sessions) {
            if (data.session === session) {
                return data.editor;
            }
        }
        throw new Error('session not found');
    }
    getSession(editor, uri) {
        const key = this._key(editor, uri);
        return this._sessions.get(key)?.session;
    }
    _key(editor, uri) {
        const item = this._keyComputers.get(uri.scheme);
        return item ? item.getComparisonKey(editor, uri) : `${editor.getId()}@${uri.toString()}`;
    }
    registerSessionKeyComputer(scheme, value) {
        this._keyComputers.set(scheme, value);
        return toDisposable(() => this._keyComputers.delete(scheme));
    }
    async createSession2(editor, uri, token) {
        assertType(editor.hasModel());
        if (this._sessions2.has(uri)) {
            throw new Error('Session already exists');
        }
        this._onWillStartSession.fire(editor);
        const chatModel = this._chatService.startSession(ChatAgentLocation.EditingSession, token, false);
        const editingSession = await chatModel.editingSessionObs?.promise;
        const widget = this._chatWidgetService.getWidgetBySessionId(chatModel.sessionId);
        await widget?.attachmentModel.addFile(uri);
        const store = new DisposableStore();
        store.add(toDisposable(() => {
            this._chatService.cancelCurrentRequestForSession(chatModel.sessionId);
            editingSession.reject();
            this._sessions2.delete(uri);
            this._onDidChangeSessions.fire(this);
        }));
        store.add(chatModel);
        store.add(autorun((r) => {
            const entries = editingSession.entries.read(r);
            if (entries.length === 0) {
                return;
            }
            const allSettled = entries.every((entry) => {
                const state = entry.state.read(r);
                return ((state === 1 /* WorkingSetEntryState.Accepted */ || state === 2 /* WorkingSetEntryState.Rejected */) &&
                    !entry.isCurrentlyBeingModifiedBy.read(r));
            });
            if (allSettled && !chatModel.requestInProgress) {
                // self terminate
                store.dispose();
            }
        }));
        const result = {
            uri,
            initialPosition: editor.getPosition().delta(-1),
            chatModel,
            editingSession,
            dispose: store.dispose.bind(store),
        };
        this._sessions2.set(uri, result);
        this._onDidChangeSessions.fire(this);
        return result;
    }
    getSession2(uri) {
        let result = this._sessions2.get(uri);
        if (!result) {
            // no direct session, try to find an editing session which has a file entry for the uri
            for (const [_, candidate] of this._sessions2) {
                const entry = candidate.editingSession.getEntry(uri);
                if (entry) {
                    result = candidate;
                    break;
                }
            }
        }
        return result;
    }
};
InlineChatSessionServiceImpl = __decorate([
    __param(0, ITelemetryService),
    __param(1, IModelService),
    __param(2, ITextModelService),
    __param(3, IEditorWorkerService),
    __param(4, ILogService),
    __param(5, IInstantiationService),
    __param(6, IEditorService),
    __param(7, ITextFileService),
    __param(8, ILanguageService),
    __param(9, IChatService),
    __param(10, IChatAgentService),
    __param(11, IChatWidgetService)
], InlineChatSessionServiceImpl);
export { InlineChatSessionServiceImpl };
let InlineChatEnabler = class InlineChatEnabler {
    static { this.Id = 'inlineChat.enabler'; }
    constructor(contextKeyService, chatAgentService, editorService) {
        this._store = new DisposableStore();
        this._ctxHasProvider = CTX_INLINE_CHAT_HAS_AGENT.bindTo(contextKeyService);
        this._ctxHasProvider2 = CTX_INLINE_CHAT_HAS_AGENT2.bindTo(contextKeyService);
        this._ctxPossible = CTX_INLINE_CHAT_POSSIBLE.bindTo(contextKeyService);
        const updateAgent = () => {
            const agent = chatAgentService.getDefaultAgent(ChatAgentLocation.Editor);
            if (agent?.id === 'github.copilot.editor' || agent?.id === 'setup.editor') {
                this._ctxHasProvider.set(true);
                this._ctxHasProvider2.reset();
            }
            else if (agent?.id === 'github.copilot.editingSessionEditor') {
                this._ctxHasProvider.reset();
                this._ctxHasProvider2.set(true);
            }
            else {
                this._ctxHasProvider.reset();
                this._ctxHasProvider2.reset();
            }
        };
        this._store.add(chatAgentService.onDidChangeAgents(updateAgent));
        updateAgent();
        const updateEditor = () => {
            const ctrl = editorService.activeEditorPane?.getControl();
            const isCodeEditorLike = isCodeEditor(ctrl) || isDiffEditor(ctrl) || isCompositeEditor(ctrl);
            this._ctxPossible.set(isCodeEditorLike);
        };
        this._store.add(editorService.onDidActiveEditorChange(updateEditor));
        updateEditor();
    }
    dispose() {
        this._ctxPossible.reset();
        this._ctxHasProvider.reset();
        this._store.dispose();
    }
};
InlineChatEnabler = __decorate([
    __param(0, IContextKeyService),
    __param(1, IChatAgentService),
    __param(2, IEditorService)
], InlineChatEnabler);
export { InlineChatEnabler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb25TZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0U2Vzc2lvblNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUtBLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUdOLFlBQVksRUFDWixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMz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