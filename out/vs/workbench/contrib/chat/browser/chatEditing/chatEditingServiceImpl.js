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
import { coalesce, compareBy, delta } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ErrorNoTelemetry } from '../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../../base/common/linkedList.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { derived, observableValueOpts, runOnChange, ValueWithChangeEventFromObservable, } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { compare } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IDecorationsService, } from '../../../../services/decorations/common/decorations.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem, } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME, chatEditingAgentSupportsReadonlyReferencesContextKey, chatEditingResourceContextKey, chatEditingSnapshotScheme, inChatEditingSessionContextKey, } from '../../common/chatEditingService.js';
import { isCellTextEditOperation } from '../../common/chatModel.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingSession } from './chatEditingSession.js';
import { ChatEditingSnapshotTextModelContentProvider, ChatEditingTextModelContentProvider, } from './chatEditingTextModelContentProviders.js';
let ChatEditingService = class ChatEditingService extends Disposable {
    constructor(_instantiationService, multiDiffSourceResolverService, textModelService, contextKeyService, _chatService, _editorService, decorationsService, _fileService, lifecycleService, storageService, logService, extensionService, productService, notebookService) {
        super();
        this._instantiationService = _instantiationService;
        this._chatService = _chatService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this.lifecycleService = lifecycleService;
        this.notebookService = notebookService;
        this._sessionsObs = observableValueOpts({ equalsFn: (a, b) => false }, new LinkedList());
        this.editingSessionsObs = derived((r) => {
            const result = Array.from(this._sessionsObs.read(r));
            return result;
        });
        this._chatRelatedFilesProviders = new Map();
        this._register(decorationsService.registerDecorationsProvider(_instantiationService.createInstance(ChatDecorationsProvider, this.editingSessionsObs)));
        this._register(multiDiffSourceResolverService.registerResolver(_instantiationService.createInstance(ChatEditingMultiDiffSourceResolver, this.editingSessionsObs)));
        // TODO@jrieken
        // some ugly casting so that this service can pass itself as argument instad as service dependeny
        this._register(textModelService.registerTextModelContentProvider(ChatEditingTextModelContentProvider.scheme, _instantiationService.createInstance(ChatEditingTextModelContentProvider, this)));
        this._register(textModelService.registerTextModelContentProvider(chatEditingSnapshotScheme, _instantiationService.createInstance(ChatEditingSnapshotTextModelContentProvider, this)));
        this._register(this._chatService.onDidDisposeSession((e) => {
            if (e.reason === 'cleared') {
                this.getEditingSession(e.sessionId)?.stop();
            }
        }));
        // todo@connor4312: temporary until chatReadonlyPromptReference proposal is finalized
        const readonlyEnabledContextKey = chatEditingAgentSupportsReadonlyReferencesContextKey.bindTo(contextKeyService);
        const setReadonlyFilesEnabled = () => {
            const enabled = productService.quality !== 'stable' &&
                extensionService.extensions.some((e) => e.enabledApiProposals?.includes('chatReadonlyPromptReference'));
            readonlyEnabledContextKey.set(enabled);
        };
        setReadonlyFilesEnabled();
        this._register(extensionService.onDidRegisterExtensions(setReadonlyFilesEnabled));
        this._register(extensionService.onDidChangeExtensions(setReadonlyFilesEnabled));
        let storageTask;
        this._register(storageService.onWillSaveState(() => {
            const tasks = [];
            for (const session of this.editingSessionsObs.get()) {
                if (!session.isGlobalEditingSession) {
                    continue;
                }
                tasks.push(session.storeState());
            }
            storageTask = Promise.resolve(storageTask)
                .then(() => Promise.all(tasks))
                .finally(() => (storageTask = undefined));
        }));
        this._register(this.lifecycleService.onWillShutdown((e) => {
            if (!storageTask) {
                return;
            }
            e.join(storageTask, {
                id: 'join.chatEditingSession',
                label: localize('join.chatEditingSession', 'Saving chat edits history'),
            });
        }));
    }
    dispose() {
        dispose(this._sessionsObs.get());
        super.dispose();
    }
    async startOrContinueGlobalEditingSession(chatModel, waitForRestore = true) {
        if (waitForRestore) {
            await this._restoringEditingSession;
        }
        const session = this.getEditingSession(chatModel.sessionId);
        if (session) {
            return session;
        }
        const result = await this.createEditingSession(chatModel, true);
        return result;
    }
    _lookupEntry(uri) {
        for (const item of Iterable.concat(this.editingSessionsObs.get())) {
            const candidate = item.getEntry(uri);
            if (candidate instanceof AbstractChatEditingModifiedFileEntry) {
                // make sure to ref-count this object
                return candidate.acquire();
            }
        }
        return undefined;
    }
    getEditingSession(chatSessionId) {
        return this.editingSessionsObs
            .get()
            .find((candidate) => candidate.chatSessionId === chatSessionId);
    }
    async createEditingSession(chatModel, global = false) {
        assertType(this.getEditingSession(chatModel.sessionId) === undefined, 'CANNOT have more than one editing session per chat session');
        const session = this._instantiationService.createInstance(ChatEditingSession, chatModel.sessionId, global, this._lookupEntry.bind(this));
        await session.init();
        const list = this._sessionsObs.get();
        const removeSession = list.unshift(session);
        const store = new DisposableStore();
        this._store.add(store);
        store.add(this.installAutoApplyObserver(session, chatModel));
        store.add(session.onDidDispose((e) => {
            removeSession();
            this._sessionsObs.set(list, undefined);
            this._store.delete(store);
        }));
        this._sessionsObs.set(list, undefined);
        return session;
    }
    installAutoApplyObserver(session, chatModel) {
        if (!chatModel) {
            throw new ErrorNoTelemetry(`Edit session was created for a non-existing chat session: ${session.chatSessionId}`);
        }
        const observerDisposables = new DisposableStore();
        observerDisposables.add(chatModel.onDidChange(async (e) => {
            if (e.kind !== 'addRequest') {
                return;
            }
            session.createSnapshot(e.request.id, undefined);
            const responseModel = e.request.response;
            if (responseModel) {
                this.observerEditsInResponse(e.request.id, responseModel, session, observerDisposables);
            }
        }));
        observerDisposables.add(chatModel.onDidDispose(() => observerDisposables.dispose()));
        return observerDisposables;
    }
    observerEditsInResponse(requestId, responseModel, session, observerDisposables) {
        // Sparse array: the indicies are indexes of `responseModel.response.value`
        // that are edit groups, and then this tracks the edit application for
        // each of them. Note that text edit groups can be updated
        // multiple times during the process of response streaming.
        const editsSeen = [];
        const editedFilesExist = new ResourceMap();
        const ensureEditorOpen = (partUri) => {
            const uri = CellUri.parse(partUri)?.notebook ?? partUri;
            if (editedFilesExist.has(uri)) {
                return;
            }
            const fileExists = this.notebookService.getNotebookTextModel(uri)
                ? Promise.resolve(true)
                : this._fileService.exists(uri);
            editedFilesExist.set(uri, fileExists.then((e) => {
                if (!e) {
                    return;
                }
                const activeUri = this._editorService.activeEditorPane?.input.resource;
                const inactive = (this._editorService.activeEditorPane?.input instanceof ChatEditorInput &&
                    this._editorService.activeEditorPane.input.sessionId === session.chatSessionId) ||
                    Boolean(activeUri &&
                        session.entries.get().find((entry) => isEqual(activeUri, entry.modifiedURI)));
                this._editorService.openEditor({
                    resource: uri,
                    options: { inactive, preserveFocus: true, pinned: true },
                });
            }));
        };
        const onResponseComplete = () => {
            for (const remaining of editsSeen) {
                remaining?.streaming.complete();
            }
            if (responseModel.result?.errorDetails &&
                !responseModel.result.errorDetails.responseIsIncomplete) {
                // Roll back everything
                session.restoreSnapshot(responseModel.requestId, undefined);
            }
            editsSeen.length = 0;
            editedFilesExist.clear();
        };
        const handleResponseParts = async () => {
            if (responseModel.isCanceled) {
                return;
            }
            let undoStop;
            for (let i = 0; i < responseModel.response.value.length; i++) {
                const part = responseModel.response.value[i];
                if (part.kind === 'undoStop') {
                    undoStop = part.id;
                    continue;
                }
                if (part.kind !== 'textEditGroup' && part.kind !== 'notebookEditGroup') {
                    continue;
                }
                ensureEditorOpen(part.uri);
                // get new edits and start editing session
                let entry = editsSeen[i];
                if (!entry) {
                    entry = {
                        seen: 0,
                        streaming: session.startStreamingEdits(CellUri.parse(part.uri)?.notebook ?? part.uri, responseModel, undoStop),
                    };
                    editsSeen[i] = entry;
                }
                const isFirst = entry.seen === 0;
                const newEdits = part.edits.slice(entry.seen).flat();
                entry.seen = part.edits.length;
                if (newEdits.length > 0 || isFirst) {
                    if (part.kind === 'notebookEditGroup') {
                        newEdits.forEach((edit) => {
                            if (TextEdit.isTextEdit(edit)) {
                                // Not possible, as Notebooks would have a different type.
                                return;
                            }
                            else if (isCellTextEditOperation(edit)) {
                                entry.streaming.pushNotebookCellText(edit.uri, [edit.edit]);
                            }
                            else {
                                entry.streaming.pushNotebook([edit]);
                            }
                        });
                    }
                    else if (part.kind === 'textEditGroup') {
                        entry.streaming.pushText(newEdits);
                    }
                }
                if (part.done) {
                    entry.streaming.complete();
                }
            }
        };
        if (responseModel.isComplete) {
            handleResponseParts().then(() => {
                onResponseComplete();
            });
        }
        else {
            const disposable = observerDisposables.add(responseModel.onDidChange((e2) => {
                if (e2.reason === 'undoStop') {
                    session.createSnapshot(requestId, e2.id);
                }
                else {
                    handleResponseParts().then(() => {
                        if (responseModel.isComplete) {
                            onResponseComplete();
                            observerDisposables.delete(disposable);
                        }
                    });
                }
            }));
        }
    }
    hasRelatedFilesProviders() {
        return this._chatRelatedFilesProviders.size > 0;
    }
    registerRelatedFilesProvider(handle, provider) {
        this._chatRelatedFilesProviders.set(handle, provider);
        return toDisposable(() => {
            this._chatRelatedFilesProviders.delete(handle);
        });
    }
    async getRelatedFiles(chatSessionId, prompt, files, token) {
        const providers = Array.from(this._chatRelatedFilesProviders.values());
        const result = await Promise.all(providers.map(async (provider) => {
            try {
                const relatedFiles = await provider.provideRelatedFiles({ prompt, files }, token);
                if (relatedFiles?.length) {
                    return { group: provider.description, files: relatedFiles };
                }
                return undefined;
            }
            catch (e) {
                return undefined;
            }
        }));
        return coalesce(result);
    }
};
ChatEditingService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMultiDiffSourceResolverService),
    __param(2, ITextModelService),
    __param(3, IContextKeyService),
    __param(4, IChatService),
    __param(5, IEditorService),
    __param(6, IDecorationsService),
    __param(7, IFileService),
    __param(8, ILifecycleService),
    __param(9, IStorageService),
    __param(10, ILogService),
    __param(11, IExtensionService),
    __param(12, IProductService),
    __param(13, INotebookService)
], ChatEditingService);
export { ChatEditingService };
/**
 * Emits an event containing the added or removed elements of the observable.
 */
function observeArrayChanges(obs, compare, store) {
    const emitter = store.add(new Emitter());
    store.add(runOnChange(obs, (newArr, oldArr) => {
        const change = delta(oldArr || [], newArr, compare);
        const changedElements = [].concat(change.added).concat(change.removed);
        emitter.fire(changedElements);
    }));
    return emitter.event;
}
let ChatDecorationsProvider = class ChatDecorationsProvider extends Disposable {
    constructor(_sessions, _chatAgentService) {
        super();
        this._sessions = _sessions;
        this._chatAgentService = _chatAgentService;
        this.label = localize('chat', 'Chat Editing');
        this._currentEntries = derived(this, (r) => {
            const sessions = this._sessions.read(r);
            if (!sessions) {
                return [];
            }
            const result = [];
            for (const session of sessions) {
                if (session.state.read(r) !== 3 /* ChatEditingSessionState.Disposed */) {
                    const entries = session.entries.read(r);
                    result.push(...entries);
                }
            }
            return result;
        });
        this._currentlyEditingUris = derived(this, (r) => {
            const uri = this._currentEntries.read(r);
            return uri
                .filter((entry) => entry.isCurrentlyBeingModifiedBy.read(r))
                .map((entry) => entry.modifiedURI);
        });
        this._modifiedUris = derived(this, (r) => {
            const uri = this._currentEntries.read(r);
            return uri
                .filter((entry) => !entry.isCurrentlyBeingModifiedBy.read(r) &&
                entry.state.read(r) === 0 /* WorkingSetEntryState.Modified */)
                .map((entry) => entry.modifiedURI);
        });
        this.onDidChange = Event.any(observeArrayChanges(this._currentlyEditingUris, compareBy((uri) => uri.toString(), compare), this._store), observeArrayChanges(this._modifiedUris, compareBy((uri) => uri.toString(), compare), this._store));
    }
    provideDecorations(uri, _token) {
        const isCurrentlyBeingModified = this._currentlyEditingUris
            .get()
            .some((e) => e.toString() === uri.toString());
        if (isCurrentlyBeingModified) {
            return {
                weight: 1000,
                letter: ThemeIcon.modify(Codicon.loading, 'spin'),
                bubble: false,
            };
        }
        const isModified = this._modifiedUris.get().some((e) => e.toString() === uri.toString());
        if (isModified) {
            const defaultAgentName = this._chatAgentService.getDefaultAgent(ChatAgentLocation.EditingSession)?.fullName;
            return {
                weight: 1000,
                letter: Codicon.diffModified,
                tooltip: defaultAgentName
                    ? localize('chatEditing.modified', 'Pending changes from {0}', defaultAgentName)
                    : localize('chatEditing.modified2', 'Pending changes from chat'),
                bubble: true,
            };
        }
        return undefined;
    }
};
ChatDecorationsProvider = __decorate([
    __param(1, IChatAgentService)
], ChatDecorationsProvider);
let ChatEditingMultiDiffSourceResolver = class ChatEditingMultiDiffSourceResolver {
    constructor(_editingSessionsObs, _instantiationService) {
        this._editingSessionsObs = _editingSessionsObs;
        this._instantiationService = _instantiationService;
    }
    canHandleUri(uri) {
        return uri.scheme === CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME;
    }
    async resolveDiffSource(uri) {
        const thisSession = derived(this, (r) => {
            return this._editingSessionsObs
                .read(r)
                .find((candidate) => candidate.chatSessionId === uri.authority);
        });
        return this._instantiationService.createInstance(ChatEditingMultiDiffSource, thisSession);
    }
};
ChatEditingMultiDiffSourceResolver = __decorate([
    __param(1, IInstantiationService)
], ChatEditingMultiDiffSourceResolver);
export { ChatEditingMultiDiffSourceResolver };
class ChatEditingMultiDiffSource {
    constructor(_currentSession) {
        this._currentSession = _currentSession;
        this._resources = derived(this, (reader) => {
            const currentSession = this._currentSession.read(reader);
            if (!currentSession) {
                return [];
            }
            const entries = currentSession.entries.read(reader);
            return entries.map((entry) => {
                return new MultiDiffEditorItem(entry.originalURI, entry.modifiedURI, undefined, {
                    [chatEditingResourceContextKey.key]: entry.entryId,
                    // [inChatEditingSessionContextKey.key]: true
                });
            });
        });
        this.resources = new ValueWithChangeEventFromObservable(this._resources);
        this.contextKeys = {
            [inChatEditingSessionContextKey.key]: true,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ1NlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEVBRVAsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sT0FBTyxFQUVQLG1CQUFtQixFQUNuQixXQUFXLEVBQ1gsa0NBQWtDLEdBQ2xDLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FB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