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
var InlineChatController_1, InlineChatController1_1, InlineChatController2_1;
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Barrier, DeferredPromise, Queue, raceCancellation } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { MovingAverage } from '../../../../base/common/numbers.js';
import { autorun, autorunWithStore, derived, observableFromEvent, observableSignalFromEvent, observableValue, transaction, waitForState, } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { assertType } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { observableCodeEditor } from '../../../../editor/browser/observableCodeEditor.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection, } from '../../../../editor/common/core/selection.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { DefaultModelSHA1Computer } from '../../../../editor/common/services/modelService.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { showChatView } from '../../chat/browser/chat.js';
import { IChatService } from '../../chat/common/chatService.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { CTX_INLINE_CHAT_EDITING, CTX_INLINE_CHAT_HAS_AGENT2, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, CTX_INLINE_CHAT_RESPONSE_TYPE, CTX_INLINE_CHAT_VISIBLE, INLINE_CHAT_ID, } from '../common/inlineChat.js';
import { Session } from './inlineChatSession.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { InlineChatError } from './inlineChatSessionServiceImpl.js';
import { LiveStrategy, } from './inlineChatStrategies.js';
import { InlineChatZoneWidget } from './inlineChatZoneWidget.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { IChatEditingService } from '../../chat/common/chatEditingService.js';
export var State;
(function (State) {
    State["CREATE_SESSION"] = "CREATE_SESSION";
    State["INIT_UI"] = "INIT_UI";
    State["WAIT_FOR_INPUT"] = "WAIT_FOR_INPUT";
    State["SHOW_REQUEST"] = "SHOW_REQUEST";
    State["PAUSE"] = "PAUSE";
    State["CANCEL"] = "CANCEL";
    State["ACCEPT"] = "DONE";
})(State || (State = {}));
var Message;
(function (Message) {
    Message[Message["NONE"] = 0] = "NONE";
    Message[Message["ACCEPT_SESSION"] = 1] = "ACCEPT_SESSION";
    Message[Message["CANCEL_SESSION"] = 2] = "CANCEL_SESSION";
    Message[Message["PAUSE_SESSION"] = 4] = "PAUSE_SESSION";
    Message[Message["CANCEL_REQUEST"] = 8] = "CANCEL_REQUEST";
    Message[Message["CANCEL_INPUT"] = 16] = "CANCEL_INPUT";
    Message[Message["ACCEPT_INPUT"] = 32] = "ACCEPT_INPUT";
})(Message || (Message = {}));
export class InlineChatRunOptions {
    static isInlineChatRunOptions(options) {
        const { initialSelection, initialRange, message, autoSend, position, existingSession } = options;
        if ((typeof message !== 'undefined' && typeof message !== 'string') ||
            (typeof autoSend !== 'undefined' && typeof autoSend !== 'boolean') ||
            (typeof initialRange !== 'undefined' && !Range.isIRange(initialRange)) ||
            (typeof initialSelection !== 'undefined' && !Selection.isISelection(initialSelection)) ||
            (typeof position !== 'undefined' && !Position.isIPosition(position)) ||
            (typeof existingSession !== 'undefined' && !(existingSession instanceof Session))) {
            return false;
        }
        return true;
    }
}
let InlineChatController = class InlineChatController {
    static { InlineChatController_1 = this; }
    static { this.ID = 'editor.contrib.inlineChatController'; }
    static get(editor) {
        return editor.getContribution(InlineChatController_1.ID);
    }
    constructor(editor, contextKeyService) {
        const inlineChat2 = observableFromEvent(this, Event.filter(contextKeyService.onDidChangeContext, (e) => e.affectsSome(new Set(CTX_INLINE_CHAT_HAS_AGENT2.keys()))), () => contextKeyService.contextMatchesRules(CTX_INLINE_CHAT_HAS_AGENT2));
        this._delegate = derived((r) => {
            if (inlineChat2.read(r)) {
                return InlineChatController2.get(editor);
            }
            else {
                return InlineChatController1.get(editor);
            }
        });
    }
    dispose() { }
    get isActive() {
        return this._delegate.get().isActive;
    }
    async run(arg) {
        return this._delegate.get().run(arg);
    }
    focus() {
        return this._delegate.get().focus();
    }
    get widget() {
        return this._delegate.get().widget;
    }
    getWidgetPosition() {
        return this._delegate.get().getWidgetPosition();
    }
    acceptSession() {
        return this._delegate.get().acceptSession();
    }
};
InlineChatController = InlineChatController_1 = __decorate([
    __param(1, IContextKeyService)
], InlineChatController);
export { InlineChatController };
/**
 * @deprecated
 */
let InlineChatController1 = InlineChatController1_1 = class InlineChatController1 {
    static get(editor) {
        return editor.getContribution(INLINE_CHAT_ID);
    }
    get chatWidget() {
        return this._ui.value.widget.chatWidget;
    }
    constructor(_editor, _instaService, _inlineChatSessionService, _editorWorkerService, _logService, _configurationService, _dialogService, contextKeyService, _chatService, _editorService, notebookEditorService) {
        this._editor = _editor;
        this._instaService = _instaService;
        this._inlineChatSessionService = _inlineChatSessionService;
        this._editorWorkerService = _editorWorkerService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._dialogService = _dialogService;
        this._chatService = _chatService;
        this._editorService = _editorService;
        this._isDisposed = false;
        this._store = new DisposableStore();
        this._messages = this._store.add(new Emitter());
        this._onDidEnterState = this._store.add(new Emitter());
        this._sessionStore = this._store.add(new DisposableStore());
        this._stashedSession = this._store.add(new MutableDisposable());
        this._ctxVisible = CTX_INLINE_CHAT_VISIBLE.bindTo(contextKeyService);
        this._ctxEditing = CTX_INLINE_CHAT_EDITING.bindTo(contextKeyService);
        this._ctxResponseType = CTX_INLINE_CHAT_RESPONSE_TYPE.bindTo(contextKeyService);
        this._ctxRequestInProgress = CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.bindTo(contextKeyService);
        this._ctxResponse = ChatContextKeys.isResponse.bindTo(contextKeyService);
        ChatContextKeys.responseHasError.bindTo(contextKeyService);
        this._ui = new Lazy(() => {
            const location = {
                location: ChatAgentLocation.Editor,
                resolveData: () => {
                    assertType(this._editor.hasModel());
                    assertType(this._session);
                    return {
                        type: ChatAgentLocation.Editor,
                        selection: this._editor.getSelection(),
                        document: this._session.textModelN.uri,
                        wholeRange: this._session?.wholeRange.trackedInitialRange,
                    };
                },
            };
            // inline chat in notebooks
            // check if this editor is part of a notebook editor
            // and iff so, use the notebook location but keep the resolveData
            // talk about editor data
            for (const notebookEditor of notebookEditorService.listNotebookEditors()) {
                for (const [, codeEditor] of notebookEditor.codeEditors) {
                    if (codeEditor === this._editor) {
                        location.location = ChatAgentLocation.Notebook;
                        break;
                    }
                }
            }
            const zone = _instaService.createInstance(InlineChatZoneWidget, location, undefined, this._editor);
            this._store.add(zone);
            this._store.add(zone.widget.chatWidget.onDidClear(async () => {
                const r = this.joinCurrentRun();
                this.cancelSession();
                await r;
                this.run();
            }));
            return zone;
        });
        this._store.add(this._editor.onDidChangeModel(async (e) => {
            if (this._session || !e.newModelUrl) {
                return;
            }
            const existingSession = this._inlineChatSessionService.getSession(this._editor, e.newModelUrl);
            if (!existingSession) {
                return;
            }
            this._log('session RESUMING after model change', e);
            await this.run({ existingSession });
        }));
        this._store.add(this._inlineChatSessionService.onDidEndSession((e) => {
            if (e.session === this._session && e.endedByExternalCause) {
                this._log('session ENDED by external cause');
                this.acceptSession();
            }
        }));
        this._store.add(this._inlineChatSessionService.onDidMoveSession(async (e) => {
            if (e.editor === this._editor) {
                this._log('session RESUMING after move', e);
                await this.run({ existingSession: e.session });
            }
        }));
        this._log(`NEW controller`);
    }
    dispose() {
        if (this._currentRun) {
            this._messages.fire(this._session?.chatModel.hasRequests ? 4 /* Message.PAUSE_SESSION */ : 2 /* Message.CANCEL_SESSION */);
        }
        this._store.dispose();
        this._isDisposed = true;
        this._log('DISPOSED controller');
    }
    _log(message, ...more) {
        if (message instanceof Error) {
            this._logService.error(message, ...more);
        }
        else {
            this._logService.trace(`[IE] (editor:${this._editor.getId()}) ${message}`, ...more);
        }
    }
    get widget() {
        return this._ui.value.widget;
    }
    getId() {
        return INLINE_CHAT_ID;
    }
    getWidgetPosition() {
        return this._ui.value.position;
    }
    async run(options = {}) {
        let lastState;
        const d = this._onDidEnterState.event((e) => (lastState = e));
        try {
            this.acceptSession();
            if (this._currentRun) {
                await this._currentRun;
            }
            if (options.initialSelection) {
                this._editor.setSelection(options.initialSelection);
            }
            this._stashedSession.clear();
            this._currentRun = this._nextState("CREATE_SESSION" /* State.CREATE_SESSION */, options);
            await this._currentRun;
        }
        catch (error) {
            // this should not happen but when it does make sure to tear down the UI and everything
            this._log('error during run', error);
            onUnexpectedError(error);
            if (this._session) {
                this._inlineChatSessionService.releaseSession(this._session);
            }
            this["PAUSE" /* State.PAUSE */]();
        }
        finally {
            this._currentRun = undefined;
            d.dispose();
        }
        return lastState !== "CANCEL" /* State.CANCEL */;
    }
    // ---- state machine
    async _nextState(state, options) {
        let nextState = state;
        while (nextState && !this._isDisposed) {
            this._log('setState to ', nextState);
            const p = this[nextState](options);
            this._onDidEnterState.fire(nextState);
            nextState = await p;
        }
    }
    async ["CREATE_SESSION" /* State.CREATE_SESSION */](options) {
        assertType(this._session === undefined);
        assertType(this._editor.hasModel());
        let session = options.existingSession;
        let initPosition;
        if (options.position) {
            initPosition = Position.lift(options.position).delta(-1);
            delete options.position;
        }
        const widgetPosition = this._showWidget(session?.headless, true, initPosition);
        // this._updatePlaceholder();
        let errorMessage = localize('create.fail', 'Failed to start editor chat');
        if (!session) {
            const createSessionCts = new CancellationTokenSource();
            const msgListener = Event.once(this._messages.event)((m) => {
                this._log('state=_createSession) message received', m);
                if (m === 32 /* Message.ACCEPT_INPUT */) {
                    // user accepted the input before having a session
                    options.autoSend = true;
                    this._ui.value.widget.updateInfo(localize('welcome.2', 'Getting ready...'));
                }
                else {
                    createSessionCts.cancel();
                }
            });
            try {
                session = await this._inlineChatSessionService.createSession(this._editor, { wholeRange: options.initialRange }, createSessionCts.token);
            }
            catch (error) {
                // Inline chat errors are from the provider and have their error messages shown to the user
                if (error instanceof InlineChatError || error?.name === InlineChatError.code) {
                    errorMessage = error.message;
                }
            }
            createSessionCts.dispose();
            msgListener.dispose();
            if (createSessionCts.token.isCancellationRequested) {
                if (session) {
                    this._inlineChatSessionService.releaseSession(session);
                }
                return "CANCEL" /* State.CANCEL */;
            }
        }
        delete options.initialRange;
        delete options.existingSession;
        if (!session) {
            MessageController.get(this._editor)?.showMessage(errorMessage, widgetPosition);
            this._log('Failed to start editor chat');
            return "CANCEL" /* State.CANCEL */;
        }
        await session.chatModel.waitForInitialization();
        // create a new strategy
        this._strategy = this._instaService.createInstance(LiveStrategy, session, this._editor, this._ui.value, session.headless);
        this._session = session;
        return "INIT_UI" /* State.INIT_UI */;
    }
    async ["INIT_UI" /* State.INIT_UI */](options) {
        assertType(this._session);
        assertType(this._strategy);
        // hide/cancel inline completions when invoking IE
        InlineCompletionsController.get(this._editor)?.reject();
        this._sessionStore.clear();
        const wholeRangeDecoration = this._editor.createDecorationsCollection();
        const handleWholeRangeChange = () => {
            const newDecorations = this._strategy?.getWholeRangeDecoration() ?? [];
            wholeRangeDecoration.set(newDecorations);
            this._ctxEditing.set(!this._session?.wholeRange.trackedInitialRange.isEmpty());
        };
        this._sessionStore.add(toDisposable(() => {
            wholeRangeDecoration.clear();
            this._ctxEditing.reset();
        }));
        this._sessionStore.add(this._session.wholeRange.onDidChange(handleWholeRangeChange));
        handleWholeRangeChange();
        this._ui.value.widget.setChatModel(this._session.chatModel);
        this._updatePlaceholder();
        const isModelEmpty = !this._session.chatModel.hasRequests;
        this._ui.value.widget.updateToolbar(true);
        this._ui.value.widget.toggleStatus(!isModelEmpty);
        this._showWidget(this._session.headless, isModelEmpty);
        this._sessionStore.add(this._editor.onDidChangeModel((e) => {
            const msg = this._session?.chatModel.hasRequests
                ? 4 /* Message.PAUSE_SESSION */
                : 2 /* Message.CANCEL_SESSION */;
            this._log('model changed, pause or cancel session', msg, e);
            this._messages.fire(msg);
        }));
        this._sessionStore.add(this._editor.onDidChangeModelContent((e) => {
            if (this._session?.hunkData.ignoreTextModelNChanges || this._ui.value.widget.hasFocus()) {
                return;
            }
            const wholeRange = this._session.wholeRange;
            let shouldFinishSession = false;
            if (this._configurationService.getValue("inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */)) {
                for (const { range } of e.changes) {
                    shouldFinishSession = !Range.areIntersectingOrTouching(range, wholeRange.value);
                }
            }
            this._session.recordExternalEditOccurred(shouldFinishSession);
            if (shouldFinishSession) {
                this._log('text changed outside of whole range, FINISH session');
                this.acceptSession();
            }
        }));
        this._sessionStore.add(this._session.chatModel.onDidChange(async (e) => {
            if (e.kind === 'removeRequest') {
                // TODO@jrieken there is still some work left for when a request "in the middle"
                // is removed. We will undo all changes till that point but not remove those
                // later request
                await this._session.undoChangesUntil(e.requestId);
            }
        }));
        // apply edits from completed requests that haven't been applied yet
        const editState = this._createChatTextEditGroupState();
        let didEdit = false;
        for (const request of this._session.chatModel.getRequests()) {
            if (!request.response || request.response.result?.errorDetails) {
                // done when seeing the first request that is still pending (no response).
                break;
            }
            for (const part of request.response.response.value) {
                if (part.kind !== 'textEditGroup' || !isEqual(part.uri, this._session.textModelN.uri)) {
                    continue;
                }
                if (part.state?.applied) {
                    continue;
                }
                for (const edit of part.edits) {
                    this._makeChanges(edit, undefined, !didEdit);
                    didEdit = true;
                }
                part.state ??= editState;
            }
        }
        if (didEdit) {
            const diff = await this._editorWorkerService.computeDiff(this._session.textModel0.uri, this._session.textModelN.uri, {
                computeMoves: false,
                maxComputationTimeMs: Number.MAX_SAFE_INTEGER,
                ignoreTrimWhitespace: false,
            }, 'advanced');
            this._session.wholeRange.fixup(diff?.changes ?? []);
            await this._session.hunkData.recompute(editState, diff);
            this._updateCtxResponseType();
        }
        options.position = await this._strategy.renderChanges();
        if (this._session.chatModel.requestInProgress) {
            return "SHOW_REQUEST" /* State.SHOW_REQUEST */;
        }
        else {
            return "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */;
        }
    }
    async ["WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */](options) {
        assertType(this._session);
        assertType(this._strategy);
        this._updatePlaceholder();
        if (options.message) {
            this._updateInput(options.message);
            aria.alert(options.message);
            delete options.message;
            this._showWidget(this._session.headless, false);
        }
        let message = 0 /* Message.NONE */;
        let request;
        const barrier = new Barrier();
        const store = new DisposableStore();
        store.add(this._session.chatModel.onDidChange((e) => {
            if (e.kind === 'addRequest') {
                request = e.request;
                message = 32 /* Message.ACCEPT_INPUT */;
                barrier.open();
            }
        }));
        store.add(this._strategy.onDidAccept(() => this.acceptSession()));
        store.add(this._strategy.onDidDiscard(() => this.cancelSession()));
        store.add(Event.once(this._messages.event)((m) => {
            this._log('state=_waitForInput) message received', m);
            message = m;
            barrier.open();
        }));
        if (options.autoSend) {
            delete options.autoSend;
            this._showWidget(this._session.headless, false);
            this._ui.value.widget.chatWidget.acceptInput();
        }
        await barrier.wait();
        store.dispose();
        if (message & (16 /* Message.CANCEL_INPUT */ | 2 /* Message.CANCEL_SESSION */)) {
            return "CANCEL" /* State.CANCEL */;
        }
        if (message & 4 /* Message.PAUSE_SESSION */) {
            return "PAUSE" /* State.PAUSE */;
        }
        if (message & 1 /* Message.ACCEPT_SESSION */) {
            this._ui.value.widget.selectAll();
            return "DONE" /* State.ACCEPT */;
        }
        if (!request?.message.text) {
            return "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */;
        }
        return "SHOW_REQUEST" /* State.SHOW_REQUEST */;
    }
    async ["SHOW_REQUEST" /* State.SHOW_REQUEST */](options) {
        assertType(this._session);
        assertType(this._strategy);
        assertType(this._session.chatModel.requestInProgress);
        this._ctxRequestInProgress.set(true);
        const { chatModel } = this._session;
        const request = chatModel.lastRequest;
        assertType(request);
        assertType(request.response);
        this._showWidget(this._session.headless, false);
        this._ui.value.widget.selectAll();
        this._ui.value.widget.updateInfo('');
        this._ui.value.widget.toggleStatus(true);
        const { response } = request;
        const responsePromise = new DeferredPromise();
        const store = new DisposableStore();
        const progressiveEditsCts = store.add(new CancellationTokenSource());
        const progressiveEditsAvgDuration = new MovingAverage();
        const progressiveEditsClock = StopWatch.create();
        const progressiveEditsQueue = new Queue();
        // disable typing and squiggles while streaming a reply
        const origDeco = this._editor.getOption(103 /* EditorOption.renderValidationDecorations */);
        this._editor.updateOptions({
            renderValidationDecorations: 'off',
        });
        store.add(toDisposable(() => {
            this._editor.updateOptions({
                renderValidationDecorations: origDeco,
            });
        }));
        let next = "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */;
        store.add(Event.once(this._messages.event)((message) => {
            this._log('state=_makeRequest) message received', message);
            this._chatService.cancelCurrentRequestForSession(chatModel.sessionId);
            if (message & 2 /* Message.CANCEL_SESSION */) {
                next = "CANCEL" /* State.CANCEL */;
            }
            else if (message & 4 /* Message.PAUSE_SESSION */) {
                next = "PAUSE" /* State.PAUSE */;
            }
            else if (message & 1 /* Message.ACCEPT_SESSION */) {
                next = "DONE" /* State.ACCEPT */;
            }
        }));
        store.add(chatModel.onDidChange(async (e) => {
            if (e.kind === 'removeRequest' && e.requestId === request.id) {
                progressiveEditsCts.cancel();
                responsePromise.complete();
                if (e.reason === 1 /* ChatRequestRemovalReason.Resend */) {
                    next = "SHOW_REQUEST" /* State.SHOW_REQUEST */;
                }
                else {
                    next = "CANCEL" /* State.CANCEL */;
                }
                return;
            }
            if (e.kind === 'move') {
                assertType(this._session);
                const log = (msg, ...args) => this._log('state=_showRequest) moving inline chat', msg, ...args);
                log('move was requested', e.target, e.range);
                // if there's already a tab open for targetUri, show it and move inline chat to that tab
                // otherwise, open the tab to the side
                const initialSelection = Selection.fromRange(Range.lift(e.range), 0 /* SelectionDirection.LTR */);
                const editorPane = await this._editorService.openEditor({ resource: e.target, options: { selection: initialSelection } }, SIDE_GROUP);
                if (!editorPane) {
                    log('opening editor failed');
                    return;
                }
                const newEditor = editorPane.getControl();
                if (!isCodeEditor(newEditor) || !newEditor.hasModel()) {
                    log('new editor is either missing or not a code editor or does not have a model');
                    return;
                }
                if (this._inlineChatSessionService.getSession(newEditor, e.target)) {
                    log('new editor ALREADY has a session');
                    return;
                }
                const newSession = await this._inlineChatSessionService.createSession(newEditor, {
                    session: this._session,
                }, CancellationToken.None); // TODO@ulugbekna: add proper cancellation?
                InlineChatController1_1.get(newEditor)?.run({ existingSession: newSession });
                next = "CANCEL" /* State.CANCEL */;
                responsePromise.complete();
                return;
            }
        }));
        // cancel the request when the user types
        store.add(this._ui.value.widget.chatWidget.inputEditor.onDidChangeModelContent(() => {
            this._chatService.cancelCurrentRequestForSession(chatModel.sessionId);
        }));
        let lastLength = 0;
        let isFirstChange = true;
        const editState = this._createChatTextEditGroupState();
        let localEditGroup;
        // apply edits
        const handleResponse = () => {
            this._updateCtxResponseType();
            if (!localEditGroup) {
                localEditGroup = (response.response.value.find((part) => part.kind === 'textEditGroup' && isEqual(part.uri, this._session?.textModelN.uri)));
            }
            if (localEditGroup) {
                localEditGroup.state ??= editState;
                const edits = localEditGroup.edits;
                const newEdits = edits.slice(lastLength);
                if (newEdits.length > 0) {
                    this._log(`${this._session?.textModelN.uri.toString()} received ${newEdits.length} edits`);
                    // NEW changes
                    lastLength = edits.length;
                    progressiveEditsAvgDuration.update(progressiveEditsClock.elapsed());
                    progressiveEditsClock.reset();
                    progressiveEditsQueue.queue(async () => {
                        const startThen = this._session.wholeRange.value.getStartPosition();
                        // making changes goes into a queue because otherwise the async-progress time will
                        // influence the time it takes to receive the changes and progressive typing will
                        // become infinitely fast
                        for (const edits of newEdits) {
                            await this._makeChanges(edits, {
                                duration: progressiveEditsAvgDuration.value,
                                token: progressiveEditsCts.token,
                            }, isFirstChange);
                            isFirstChange = false;
                        }
                        // reshow the widget if the start position changed or shows at the wrong position
                        const startNow = this._session.wholeRange.value.getStartPosition();
                        if (!startNow.equals(startThen) || !this._ui.value.position?.equals(startNow)) {
                            this._showWidget(this._session.headless, false, startNow.delta(-1));
                        }
                    });
                }
            }
            if (response.isCanceled) {
                progressiveEditsCts.cancel();
                responsePromise.complete();
            }
            else if (response.isComplete) {
                responsePromise.complete();
            }
        };
        store.add(response.onDidChange(handleResponse));
        handleResponse();
        // (1) we must wait for the request to finish
        // (2) we must wait for all edits that came in via progress to complete
        await responsePromise.p;
        await progressiveEditsQueue.whenIdle();
        if (response.result?.errorDetails && !response.result.errorDetails.responseIsFiltered) {
            await this._session.undoChangesUntil(response.requestId);
        }
        store.dispose();
        const diff = await this._editorWorkerService.computeDiff(this._session.textModel0.uri, this._session.textModelN.uri, {
            computeMoves: false,
            maxComputationTimeMs: Number.MAX_SAFE_INTEGER,
            ignoreTrimWhitespace: false,
        }, 'advanced');
        this._session.wholeRange.fixup(diff?.changes ?? []);
        await this._session.hunkData.recompute(editState, diff);
        this._ctxRequestInProgress.set(false);
        let newPosition;
        if (response.result?.errorDetails) {
            // error -> no message, errors are shown with the request
        }
        else if (response.response.value.length === 0) {
            // empty -> show message
            const status = localize('empty', 'No results, please refine your input and try again');
            this._ui.value.widget.updateStatus(status, { classes: ['warn'] });
        }
        else {
            // real response -> no message
            this._ui.value.widget.updateStatus('');
        }
        const position = await this._strategy.renderChanges();
        if (position) {
            // if the selection doesn't start far off we keep the widget at its current position
            // because it makes reading this nicer
            const selection = this._editor.getSelection();
            if (selection?.containsPosition(position)) {
                if (position.lineNumber - selection.startLineNumber > 8) {
                    newPosition = position;
                }
            }
            else {
                newPosition = position;
            }
        }
        this._showWidget(this._session.headless, false, newPosition);
        return next;
    }
    async ["PAUSE" /* State.PAUSE */]() {
        this._resetWidget();
        this._strategy?.dispose?.();
        this._session = undefined;
    }
    async ["DONE" /* State.ACCEPT */]() {
        assertType(this._session);
        assertType(this._strategy);
        this._sessionStore.clear();
        try {
            await this._strategy.apply();
        }
        catch (err) {
            this._dialogService.error(localize('err.apply', 'Failed to apply changes.', toErrorMessage(err)));
            this._log('FAILED to apply changes');
            this._log(err);
        }
        this._resetWidget();
        this._inlineChatSessionService.releaseSession(this._session);
        this._strategy?.dispose();
        this._strategy = undefined;
        this._session = undefined;
    }
    async ["CANCEL" /* State.CANCEL */]() {
        this._resetWidget();
        if (this._session) {
            // assertType(this._session);
            assertType(this._strategy);
            this._sessionStore.clear();
            // only stash sessions that were not unstashed, not "empty", and not interacted with
            const shouldStash = !this._session.isUnstashed &&
                this._session.chatModel.hasRequests &&
                this._session.hunkData.size === this._session.hunkData.pending;
            let undoCancelEdits = [];
            try {
                undoCancelEdits = this._strategy.cancel();
            }
            catch (err) {
                this._dialogService.error(localize('err.discard', 'Failed to discard changes.', toErrorMessage(err)));
                this._log('FAILED to discard changes');
                this._log(err);
            }
            this._stashedSession.clear();
            if (shouldStash) {
                this._stashedSession.value = this._inlineChatSessionService.stashSession(this._session, this._editor, undoCancelEdits);
            }
            else {
                this._inlineChatSessionService.releaseSession(this._session);
            }
        }
        this._strategy?.dispose();
        this._strategy = undefined;
        this._session = undefined;
    }
    // ----
    _showWidget(headless = false, initialRender = false, position) {
        assertType(this._editor.hasModel());
        this._ctxVisible.set(true);
        let widgetPosition;
        if (position) {
            // explicit position wins
            widgetPosition = position;
        }
        else if (this._ui.rawValue?.position) {
            // already showing - special case of line 1
            if (this._ui.rawValue?.position.lineNumber === 1) {
                widgetPosition = this._ui.rawValue?.position.delta(-1);
            }
            else {
                widgetPosition = this._ui.rawValue?.position;
            }
        }
        else {
            // default to ABOVE the selection
            widgetPosition = this._editor.getSelection().getStartPosition().delta(-1);
        }
        if (this._session &&
            !position &&
            (this._session.hasChangedText || this._session.chatModel.hasRequests)) {
            widgetPosition = this._session.wholeRange.trackedInitialRange.getStartPosition().delta(-1);
        }
        if (initialRender && this._editor.getOption(120 /* EditorOption.stickyScroll */).enabled) {
            this._editor.revealLine(widgetPosition.lineNumber); // do NOT substract `this._editor.getOption(EditorOption.stickyScroll).maxLineCount` because the editor already does that
        }
        if (!headless) {
            if (this._ui.rawValue?.position) {
                this._ui.value.updatePositionAndHeight(widgetPosition);
            }
            else {
                this._ui.value.show(widgetPosition);
            }
        }
        return widgetPosition;
    }
    _resetWidget() {
        this._sessionStore.clear();
        this._ctxVisible.reset();
        this._ui.rawValue?.hide();
        // Return focus to the editor only if the current focus is within the editor widget
        if (this._editor.hasWidgetFocus()) {
            this._editor.focus();
        }
    }
    _updateCtxResponseType() {
        if (!this._session) {
            this._ctxResponseType.set("none" /* InlineChatResponseType.None */);
            return;
        }
        const hasLocalEdit = (response) => {
            return response.value.some((part) => part.kind === 'textEditGroup' && isEqual(part.uri, this._session?.textModelN.uri));
        };
        let responseType = "none" /* InlineChatResponseType.None */;
        for (const request of this._session.chatModel.getRequests()) {
            if (!request.response) {
                continue;
            }
            responseType = "messages" /* InlineChatResponseType.Messages */;
            if (hasLocalEdit(request.response.response)) {
                responseType = "messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */;
                break; // no need to check further
            }
        }
        this._ctxResponseType.set(responseType);
        this._ctxResponse.set(responseType !== "none" /* InlineChatResponseType.None */);
    }
    _createChatTextEditGroupState() {
        assertType(this._session);
        const sha1 = new DefaultModelSHA1Computer();
        const textModel0Sha1 = sha1.canComputeSHA1(this._session.textModel0)
            ? sha1.computeSHA1(this._session.textModel0)
            : generateUuid();
        return {
            sha1: textModel0Sha1,
            applied: 0,
        };
    }
    async _makeChanges(edits, opts, undoStopBefore) {
        assertType(this._session);
        assertType(this._strategy);
        const moreMinimalEdits = await this._editorWorkerService.computeMoreMinimalEdits(this._session.textModelN.uri, edits);
        this._log('edits from PROVIDER and after making them MORE MINIMAL', this._session.agent.extensionId, edits, moreMinimalEdits);
        if (moreMinimalEdits?.length === 0) {
            // nothing left to do
            return;
        }
        const actualEdits = !opts && moreMinimalEdits ? moreMinimalEdits : edits;
        const editOperations = actualEdits.map(TextEdit.asEditOperation);
        const editsObserver = {
            start: () => (this._session.hunkData.ignoreTextModelNChanges = true),
            stop: () => (this._session.hunkData.ignoreTextModelNChanges = false),
        };
        if (opts) {
            await this._strategy.makeProgressiveChanges(editOperations, editsObserver, opts, undoStopBefore);
        }
        else {
            await this._strategy.makeChanges(editOperations, editsObserver, undoStopBefore);
        }
    }
    _updatePlaceholder() {
        this._ui.value.widget.placeholder = this._session?.agent.description ?? '';
    }
    _updateInput(text, selectAll = true) {
        this._ui.value.widget.chatWidget.setInput(text);
        if (selectAll) {
            const newSelection = new Selection(1, 1, Number.MAX_SAFE_INTEGER, 1);
            this._ui.value.widget.chatWidget.inputEditor.setSelection(newSelection);
        }
    }
    // ---- controller API
    arrowOut(up) {
        if (this._ui.value.position && this._editor.hasModel()) {
            const { column } = this._editor.getPosition();
            const { lineNumber } = this._ui.value.position;
            const newLine = up ? lineNumber : lineNumber + 1;
            this._editor.setPosition({ lineNumber: newLine, column });
            this._editor.focus();
        }
    }
    focus() {
        this._ui.value.widget.focus();
    }
    async viewInChat() {
        if (!this._strategy || !this._session) {
            return;
        }
        let someApplied = false;
        let lastEdit;
        const uri = this._editor.getModel()?.uri;
        const requests = this._session.chatModel.getRequests();
        for (const request of requests) {
            if (!request.response) {
                continue;
            }
            for (const part of request.response.response.value) {
                if (part.kind === 'textEditGroup' && isEqual(part.uri, uri)) {
                    // fully or partially applied edits
                    someApplied = someApplied || Boolean(part.state?.applied);
                    lastEdit = part;
                }
            }
        }
        const doEdits = this._strategy.cancel();
        if (someApplied) {
            assertType(lastEdit);
            lastEdit.edits = [doEdits];
            lastEdit.state.applied = 0;
        }
        await this._instaService.invokeFunction(moveToPanelChat, this._session?.chatModel);
        this.cancelSession();
    }
    acceptSession() {
        const response = this._session?.chatModel.getRequests().at(-1)?.response;
        if (response) {
            this._chatService.notifyUserAction({
                sessionId: response.session.sessionId,
                requestId: response.requestId,
                agentId: response.agent?.id,
                command: response.slashCommand?.name,
                result: response.result,
                action: {
                    kind: 'inlineChat',
                    action: 'accepted',
                },
            });
        }
        this._messages.fire(1 /* Message.ACCEPT_SESSION */);
    }
    acceptHunk(hunkInfo) {
        return this._strategy?.performHunkAction(hunkInfo, 0 /* HunkAction.Accept */);
    }
    discardHunk(hunkInfo) {
        return this._strategy?.performHunkAction(hunkInfo, 1 /* HunkAction.Discard */);
    }
    toggleDiff(hunkInfo) {
        return this._strategy?.performHunkAction(hunkInfo, 4 /* HunkAction.ToggleDiff */);
    }
    moveHunk(next) {
        this.focus();
        this._strategy?.performHunkAction(undefined, next ? 2 /* HunkAction.MoveNext */ : 3 /* HunkAction.MovePrev */);
    }
    async cancelSession() {
        const response = this._session?.chatModel.lastRequest?.response;
        if (response) {
            this._chatService.notifyUserAction({
                sessionId: response.session.sessionId,
                requestId: response.requestId,
                agentId: response.agent?.id,
                command: response.slashCommand?.name,
                result: response.result,
                action: {
                    kind: 'inlineChat',
                    action: 'discarded',
                },
            });
        }
        this._messages.fire(2 /* Message.CANCEL_SESSION */);
    }
    reportIssue() {
        const response = this._session?.chatModel.lastRequest?.response;
        if (response) {
            this._chatService.notifyUserAction({
                sessionId: response.session.sessionId,
                requestId: response.requestId,
                agentId: response.agent?.id,
                command: response.slashCommand?.name,
                result: response.result,
                action: { kind: 'bug' },
            });
        }
    }
    unstashLastSession() {
        const result = this._stashedSession.value?.unstash();
        return result;
    }
    joinCurrentRun() {
        return this._currentRun;
    }
    get isActive() {
        return Boolean(this._currentRun);
    }
};
InlineChatController1 = InlineChatController1_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IInlineChatSessionService),
    __param(3, IEditorWorkerService),
    __param(4, ILogService),
    __param(5, IConfigurationService),
    __param(6, IDialogService),
    __param(7, IContextKeyService),
    __param(8, IChatService),
    __param(9, IEditorService),
    __param(10, INotebookEditorService)
], InlineChatController1);
export { InlineChatController1 };
let InlineChatController2 = class InlineChatController2 {
    static { InlineChatController2_1 = this; }
    static { this.ID = 'editor.contrib.inlineChatController2'; }
    static get(editor) {
        return editor.getContribution(InlineChatController2_1.ID) ?? undefined;
    }
    get widget() {
        return this._zone.value.widget;
    }
    get isActive() {
        return Boolean(this._currentSession.get());
    }
    constructor(_editor, _instaService, _notebookEditorService, _inlineChatSessions, codeEditorService, contextKeyService) {
        this._editor = _editor;
        this._instaService = _instaService;
        this._notebookEditorService = _notebookEditorService;
        this._inlineChatSessions = _inlineChatSessions;
        this._store = new DisposableStore();
        this._showWidgetOverrideObs = observableValue(this, false);
        this._isActiveController = observableValue(this, false);
        const ctxInlineChatVisible = CTX_INLINE_CHAT_VISIBLE.bindTo(contextKeyService);
        this._zone = new Lazy(() => {
            const location = {
                location: ChatAgentLocation.Editor,
                resolveData: () => {
                    assertType(this._editor.hasModel());
                    return {
                        type: ChatAgentLocation.Editor,
                        selection: this._editor.getSelection(),
                        document: this._editor.getModel().uri,
                        wholeRange: this._editor.getSelection(),
                    };
                },
            };
            // inline chat in notebooks
            // check if this editor is part of a notebook editor
            // and iff so, use the notebook location but keep the resolveData
            // talk about editor data
            for (const notebookEditor of this._notebookEditorService.listNotebookEditors()) {
                for (const [, codeEditor] of notebookEditor.codeEditors) {
                    if (codeEditor === this._editor) {
                        location.location = ChatAgentLocation.Notebook;
                        break;
                    }
                }
            }
            const result = this._instaService.createInstance(InlineChatZoneWidget, location, {
                enableWorkingSet: 'implicit',
                rendererOptions: {
                    renderTextEditsAsSummary: (_uri) => true,
                },
            }, this._editor);
            result.domNode.classList.add('inline-chat-2');
            return result;
        });
        const editorObs = observableCodeEditor(_editor);
        const sessionsSignal = observableSignalFromEvent(this, _inlineChatSessions.onDidChangeSessions);
        this._currentSession = derived((r) => {
            sessionsSignal.read(r);
            const model = editorObs.model.read(r);
            const value = model && _inlineChatSessions.getSession2(model.uri);
            return value ?? undefined;
        });
        this._store.add(autorun((r) => {
            const session = this._currentSession.read(r);
            if (!session) {
                this._isActiveController.set(false, undefined);
                return;
            }
            let foundOne = false;
            for (const editor of codeEditorService.listCodeEditors()) {
                if (Boolean(InlineChatController2_1.get(editor)?._isActiveController.get())) {
                    foundOne = true;
                    break;
                }
            }
            if (!foundOne && _editor.hasWidgetFocus()) {
                this._isActiveController.set(true, undefined);
            }
        }));
        const visibleSessionObs = observableValue(this, undefined);
        this._store.add(autorunWithStore((r, store) => {
            const model = editorObs.model.read(r);
            const session = this._currentSession.read(r);
            const isActive = this._isActiveController.read(r);
            if (!session || !isActive || !model) {
                visibleSessionObs.set(undefined, undefined);
                return;
            }
            const { chatModel } = session;
            const showShowUntil = this._showWidgetOverrideObs.read(r);
            const hasNoRequests = chatModel.getRequests().length === 0;
            const responseListener = store.add(new MutableDisposable());
            store.add(chatModel.onDidChange((e) => {
                if (e.kind === 'addRequest') {
                    transaction((tx) => {
                        this._showWidgetOverrideObs.set(false, tx);
                        visibleSessionObs.set(undefined, tx);
                    });
                    const { response } = e.request;
                    if (!response) {
                        return;
                    }
                    responseListener.value = response.onDidChange(async (e) => {
                        if (!response.isComplete) {
                            return;
                        }
                        const shouldShow = response.isCanceled || // cancelled
                            response.result?.errorDetails || // errors
                            !response.response.value.find((part) => part.kind === 'textEditGroup' &&
                                part.edits.length > 0 &&
                                isEqual(part.uri, model.uri)); // NO edits for file
                        if (shouldShow) {
                            visibleSessionObs.set(session, undefined);
                        }
                    });
                }
            }));
            if (showShowUntil || hasNoRequests) {
                visibleSessionObs.set(session, undefined);
            }
            else {
                visibleSessionObs.set(undefined, undefined);
            }
        }));
        this._store.add(autorun((r) => {
            const session = visibleSessionObs.read(r);
            if (!session) {
                this._zone.rawValue?.hide();
                _editor.focus();
                ctxInlineChatVisible.reset();
            }
            else {
                ctxInlineChatVisible.set(true);
                this._zone.value.widget.setChatModel(session.chatModel);
                if (!this._zone.value.position) {
                    this._zone.value.show(session.initialPosition);
                }
                this._zone.value.reveal(this._zone.value.position);
                this._zone.value.widget.focus();
                session.editingSession.getEntry(session.uri)?.autoAcceptController.get()?.cancel();
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
    toggleWidgetUntilNextRequest() {
        const value = this._showWidgetOverrideObs.get();
        this._showWidgetOverrideObs.set(!value, undefined);
    }
    getWidgetPosition() {
        return this._zone.rawValue?.position;
    }
    focus() {
        this._zone.rawValue?.widget.focus();
    }
    markActiveController() {
        this._isActiveController.set(true, undefined);
    }
    async run(arg) {
        assertType(this._editor.hasModel());
        this.markActiveController();
        const uri = this._editor.getModel().uri;
        const session = this._inlineChatSessions.getSession2(uri) ??
            (await this._inlineChatSessions.createSession2(this._editor, uri, CancellationToken.None));
        if (arg && InlineChatRunOptions.isInlineChatRunOptions(arg)) {
            if (arg.initialRange) {
                this._editor.revealRange(arg.initialRange);
            }
            if (arg.initialSelection) {
                this._editor.setSelection(arg.initialSelection);
            }
            if (arg.message) {
                this._zone.value.widget.chatWidget.setInput(arg.message);
                if (arg.autoSend) {
                    await this._zone.value.widget.chatWidget.acceptInput();
                }
            }
        }
        await Event.toPromise(session.editingSession.onDidDispose);
        const rejected = session.editingSession.getEntry(uri)?.state.get() === 2 /* WorkingSetEntryState.Rejected */;
        return !rejected;
    }
    acceptSession() {
        const value = this._currentSession.get();
        value?.editingSession.accept();
    }
};
InlineChatController2 = InlineChatController2_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, INotebookEditorService),
    __param(3, IInlineChatSessionService),
    __param(4, ICodeEditorService),
    __param(5, IContextKeyService)
], InlineChatController2);
export { InlineChatController2 };
export async function reviewEdits(accessor, editor, stream, token) {
    if (!editor.hasModel()) {
        return false;
    }
    const chatService = accessor.get(IChatService);
    const chatEditingService = accessor.get(IChatEditingService);
    const uri = editor.getModel().uri;
    const chatModel = chatService.startSession(ChatAgentLocation.Editor, token, false);
    const editSession = await chatEditingService.createEditingSession(chatModel);
    const store = new DisposableStore();
    store.add(chatModel);
    store.add(editSession);
    // STREAM
    const chatRequest = chatModel?.addRequest({ text: '', parts: [] }, { variables: [] }, 0);
    assertType(chatRequest.response);
    chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: false });
    for await (const chunk of stream) {
        if (token.isCancellationRequested) {
            chatRequest.response.cancel();
            break;
        }
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: chunk, done: false });
    }
    chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: true });
    if (!token.isCancellationRequested) {
        chatRequest.response.complete();
    }
    const isSettled = derived((r) => {
        const entry = editSession.readEntry(uri, r);
        if (!entry) {
            return false;
        }
        const state = entry.state.read(r);
        return state === 1 /* WorkingSetEntryState.Accepted */ || state === 2 /* WorkingSetEntryState.Rejected */;
    });
    const whenDecided = waitForState(isSettled, Boolean);
    await raceCancellation(whenDecided, token);
    store.dispose();
    return true;
}
async function moveToPanelChat(accessor, model) {
    const viewsService = accessor.get(IViewsService);
    const chatService = accessor.get(IChatService);
    const widget = await showChatView(viewsService);
    if (widget && widget.viewModel && model) {
        for (const request of model.getRequests().slice()) {
            await chatService.adoptRequest(widget.viewModel.model.sessionId, request);
        }
        widget.focusLastMessage();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBRVAsbUJBQW1CLEVBQ25CLHlCQUF5QixFQUN6QixlQUFlLEVBQ2YsV0FBVyxFQUNYLFlBQVksR0FDWixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENB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