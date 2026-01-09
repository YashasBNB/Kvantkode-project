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
import { equals as arraysEqual, binarySearch2 } from '../../../../../base/common/arrays.js';
import { DeferredPromise, Sequencer, SequencerByKey, timeout, } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { StringSHA1 } from '../../../../../base/common/hash.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, dispose } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { asyncTransaction, autorun, derived, derivedOpts, derivedWithStore, ObservablePromise, observableValue, transaction, } from '../../../../../base/common/observable.js';
import { isEqual, joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { OffsetEdit, } from '../../../../../editor/common/core/offsetEdit.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { getMultiDiffSourceUri, } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { AbstractChatEditingModifiedFileEntry, } from './chatEditingModifiedFileEntry.js';
import { ChatEditingModifiedDocumentEntry } from './chatEditingModifiedDocumentEntry.js';
import { ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { ChatEditingModifiedNotebookEntry } from './chatEditingModifiedNotebookEntry.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ChatEditingModifiedNotebookDiff } from './notebook/chatEditingModifiedNotebookDiff.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
const STORAGE_CONTENTS_FOLDER = 'contents';
const STORAGE_STATE_FILE = 'state.json';
const POST_EDIT_STOP_ID = 'd19944f6-f46c-4e17-911b-79a8e843c7c0'; // randomly generated
class ThrottledSequencer extends Sequencer {
    constructor(_minDuration, _maxOverallDelay) {
        super();
        this._minDuration = _minDuration;
        this._maxOverallDelay = _maxOverallDelay;
        this._size = 0;
    }
    queue(promiseTask) {
        this._size += 1;
        const noDelay = this._size * this._minDuration > this._maxOverallDelay;
        return super.queue(async () => {
            try {
                const p1 = promiseTask();
                const p2 = noDelay
                    ? Promise.resolve(undefined)
                    : timeout(this._minDuration, CancellationToken.None);
                const [result] = await Promise.all([p1, p2]);
                return result;
            }
            finally {
                this._size -= 1;
            }
        });
    }
}
function getMaxHistoryIndex(history) {
    const lastHistory = history.at(-1);
    return lastHistory ? lastHistory.startIndex + lastHistory.stops.length : 0;
}
function snapshotsEqualForDiff(a, b) {
    if (!a || !b) {
        return a === b;
    }
    return isEqual(a.snapshotUri, b.snapshotUri) && a.current === b.current;
}
function getCurrentAndNextStop(requestId, stopId, history) {
    const snapshotIndex = history.findIndex((s) => s.requestId === requestId);
    if (snapshotIndex === -1) {
        return undefined;
    }
    const snapshot = history[snapshotIndex];
    const stopIndex = snapshot.stops.findIndex((s) => s.stopId === stopId);
    if (stopIndex === -1) {
        return undefined;
    }
    const current = snapshot.stops[stopIndex].entries;
    const next = stopIndex < snapshot.stops.length - 1
        ? snapshot.stops[stopIndex + 1].entries
        : snapshot.postEdit || history[snapshotIndex + 1]?.stops[0].entries;
    if (!next) {
        return undefined;
    }
    return { current, next };
}
let ChatEditingSession = class ChatEditingSession extends Disposable {
    get entries() {
        this._assertNotDisposed();
        return this._entriesObs;
    }
    get state() {
        return this._state;
    }
    get onDidChange() {
        this._assertNotDisposed();
        return this._onDidChange.event;
    }
    get onDidDispose() {
        this._assertNotDisposed();
        return this._onDidDispose.event;
    }
    constructor(chatSessionId, isGlobalEditingSession, _lookupExternalEntry, _instantiationService, _modelService, _languageService, _textModelService, _bulkEditService, _editorGroupsService, _editorService, _chatService, _notebookService, _editorWorkerService, _configurationService, _accessibilitySignalService) {
        super();
        this.chatSessionId = chatSessionId;
        this.isGlobalEditingSession = isGlobalEditingSession;
        this._lookupExternalEntry = _lookupExternalEntry;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._textModelService = _textModelService;
        this._bulkEditService = _bulkEditService;
        this._editorGroupsService = _editorGroupsService;
        this._editorService = _editorService;
        this._chatService = _chatService;
        this._notebookService = _notebookService;
        this._editorWorkerService = _editorWorkerService;
        this._configurationService = _configurationService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._state = observableValue(this, 0 /* ChatEditingSessionState.Initial */);
        this._linearHistory = observableValue(this, []);
        this._linearHistoryIndex = observableValue(this, 0);
        /**
         * Contains the contents of a file when the AI first began doing edits to it.
         */
        this._initialFileContents = new ResourceMap();
        this._entriesObs = observableValue(this, []);
        this._workingSet = new ResourceMap();
        this.canUndo = derived((r) => {
            if (this.state.read(r) !== 2 /* ChatEditingSessionState.Idle */) {
                return false;
            }
            const linearHistoryIndex = this._linearHistoryIndex.read(r);
            return linearHistoryIndex > 0;
        });
        this.canRedo = derived((r) => {
            if (this.state.read(r) !== 2 /* ChatEditingSessionState.Idle */) {
                return false;
            }
            const linearHistoryIndex = this._linearHistoryIndex.read(r);
            return linearHistoryIndex < getMaxHistoryIndex(this._linearHistory.read(r));
        });
        // public hiddenRequestIds = derived<string[]>((r) => {
        // 	const linearHistory = this._linearHistory.read(r);
        // 	const linearHistoryIndex = this._linearHistoryIndex.read(r);
        // 	return linearHistory.slice(linearHistoryIndex).map(s => s.requestId).filter((r): r is string => !!r);
        // });
        this._onDidChange = this._register(new Emitter());
        this._onDidDispose = new Emitter();
        this._diffsBetweenStops = new Map();
        this._ignoreTrimWhitespaceObservable = observableConfigValue('diffEditor.ignoreTrimWhitespace', true, this._configurationService);
        this._streamingEditLocks = new SequencerByKey();
    }
    async init() {
        const restoredSessionState = await this._instantiationService
            .createInstance(ChatEditingSessionStorage, this.chatSessionId)
            .restoreState();
        if (restoredSessionState) {
            for (const [uri, content] of restoredSessionState.initialFileContents) {
                this._initialFileContents.set(uri, content);
            }
            await asyncTransaction(async (tx) => {
                this._pendingSnapshot = restoredSessionState.pendingSnapshot;
                await this._restoreSnapshot(restoredSessionState.recentSnapshot, tx, false);
                this._linearHistory.set(restoredSessionState.linearHistory, tx);
                this._linearHistoryIndex.set(restoredSessionState.linearHistoryIndex, tx);
                this._state.set(2 /* ChatEditingSessionState.Idle */, tx);
            });
        }
        else {
            this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
        }
        this._register(autorun((reader) => {
            const entries = this.entries.read(reader);
            entries.forEach((entry) => {
                entry.state.read(reader);
            });
            this._onDidChange.fire(0 /* ChatEditingSessionChangeType.WorkingSet */);
        }));
    }
    _getEntry(uri) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.get().find((e) => isEqual(e.modifiedURI, uri));
    }
    getEntry(uri) {
        return this._getEntry(uri);
    }
    readEntry(uri, reader) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.read(reader).find((e) => isEqual(e.modifiedURI, uri));
    }
    storeState() {
        const storage = this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionId);
        const state = {
            initialFileContents: this._initialFileContents,
            pendingSnapshot: this._pendingSnapshot,
            recentSnapshot: this._createSnapshot(undefined, undefined),
            linearHistoryIndex: this._linearHistoryIndex.get(),
            linearHistory: this._linearHistory.get(),
        };
        return storage.storeState(state);
    }
    _findSnapshot(requestId) {
        return this._linearHistory.get().find((s) => s.requestId === requestId);
    }
    _findEditStop(requestId, undoStop) {
        const snapshot = this._findSnapshot(requestId);
        if (!snapshot) {
            return undefined;
        }
        const idx = snapshot.stops.findIndex((s) => s.stopId === undoStop);
        return idx === -1
            ? undefined
            : { stop: snapshot.stops[idx], snapshot, historyIndex: snapshot.startIndex + idx };
    }
    _ensurePendingSnapshot() {
        this._pendingSnapshot ??= this._createSnapshot(undefined, undefined);
    }
    /**
     * Gets diff for text entries between stops.
     * @param entriesContent Observable that observes either snapshot entry
     * @param modelUrisObservable Observable that observes only the snapshot URIs.
     */
    _entryDiffBetweenTextStops(entriesContent, modelUrisObservable) {
        const modelRefsPromise = derivedWithStore(this, (reader, store) => {
            const modelUris = modelUrisObservable.read(reader);
            if (!modelUris) {
                return undefined;
            }
            const promise = Promise.all(modelUris.map((u) => this._textModelService.createModelReference(u))).then((refs) => {
                if (store.isDisposed) {
                    refs.forEach((r) => r.dispose());
                }
                else {
                    refs.forEach((r) => store.add(r));
                }
                return refs;
            });
            return new ObservablePromise(promise);
        });
        return derived((reader) => {
            const refs = modelRefsPromise.read(reader)?.promiseResult.read(reader)?.data;
            if (!refs) {
                return;
            }
            const entries = entriesContent.read(reader); // trigger re-diffing when contents change
            if (entries?.before && ChatEditingModifiedNotebookEntry.canHandleSnapshot(entries.before)) {
                const diffService = this._instantiationService.createInstance(ChatEditingModifiedNotebookDiff, entries.before, entries.after);
                return new ObservablePromise(diffService.computeDiff());
            }
            const ignoreTrimWhitespace = this._ignoreTrimWhitespaceObservable.read(reader);
            const promise = this._editorWorkerService
                .computeDiff(refs[0].object.textEditorModel.uri, refs[1].object.textEditorModel.uri, { ignoreTrimWhitespace, computeMoves: false, maxComputationTimeMs: 3000 }, 'advanced')
                .then((diff) => {
                const entryDiff = {
                    originalURI: refs[0].object.textEditorModel.uri,
                    modifiedURI: refs[1].object.textEditorModel.uri,
                    identical: !!diff?.identical,
                    quitEarly: !diff || diff.quitEarly,
                    added: 0,
                    removed: 0,
                };
                if (diff) {
                    for (const change of diff.changes) {
                        entryDiff.removed +=
                            change.original.endLineNumberExclusive - change.original.startLineNumber;
                        entryDiff.added +=
                            change.modified.endLineNumberExclusive - change.modified.startLineNumber;
                    }
                }
                return entryDiff;
            });
            return new ObservablePromise(promise);
        });
    }
    _createDiffBetweenStopsObservable(uri, requestId, stopId) {
        const entries = derivedOpts({
            equalsFn: (a, b) => snapshotsEqualForDiff(a?.before, b?.before) && snapshotsEqualForDiff(a?.after, b?.after),
        }, (reader) => {
            const stops = getCurrentAndNextStop(requestId, stopId, this._linearHistory.read(reader));
            if (!stops) {
                return undefined;
            }
            const before = stops.current.get(uri);
            const after = stops.next.get(uri);
            if (!before || !after) {
                return undefined;
            }
            return { before, after };
        });
        // Separate observable for model refs to avoid unnecessary disposal
        const modelUrisObservable = derivedOpts({ equalsFn: (a, b) => arraysEqual(a, b, isEqual) }, (reader) => {
            const entriesValue = entries.read(reader);
            if (!entriesValue) {
                return undefined;
            }
            return [entriesValue.before.snapshotUri, entriesValue.after.snapshotUri];
        });
        const diff = this._entryDiffBetweenTextStops(entries, modelUrisObservable);
        return derived((reader) => {
            return diff.read(reader)?.promiseResult.read(reader)?.data || undefined;
        });
    }
    getEntryDiffBetweenStops(uri, requestId, stopId) {
        const key = `${uri}\0${requestId}\0${stopId}`;
        let observable = this._diffsBetweenStops.get(key);
        if (!observable) {
            observable = this._createDiffBetweenStopsObservable(uri, requestId, stopId);
            this._diffsBetweenStops.set(key, observable);
        }
        return observable;
    }
    createSnapshot(requestId, undoStop) {
        const snapshot = this._createSnapshot(requestId, undoStop);
        for (const [uri, _] of this._workingSet) {
            this._workingSet.set(uri, { state: 5 /* WorkingSetEntryState.Sent */ });
        }
        const linearHistoryPtr = this._linearHistoryIndex.get();
        const newLinearHistory = [];
        for (const entry of this._linearHistory.get()) {
            if (linearHistoryPtr - entry.startIndex < entry.stops.length) {
                newLinearHistory.push({
                    requestId: entry.requestId,
                    stops: entry.stops.slice(0, linearHistoryPtr - entry.startIndex),
                    startIndex: entry.startIndex,
                    postEdit: undefined,
                });
            }
            else {
                newLinearHistory.push(entry);
            }
        }
        const lastEntry = newLinearHistory.at(-1);
        if (requestId && lastEntry?.requestId === requestId) {
            newLinearHistory[newLinearHistory.length - 1] = {
                ...lastEntry,
                stops: [...lastEntry.stops, snapshot],
                postEdit: undefined,
            };
        }
        else {
            newLinearHistory.push({
                requestId,
                startIndex: lastEntry ? lastEntry.startIndex + lastEntry.stops.length : 0,
                stops: [snapshot],
                postEdit: undefined,
            });
        }
        transaction((tx) => {
            const last = newLinearHistory[newLinearHistory.length - 1];
            this._linearHistory.set(newLinearHistory, tx);
            this._linearHistoryIndex.set(last.startIndex + last.stops.length, tx);
        });
    }
    _createSnapshot(requestId, undoStop) {
        const workingSet = new ResourceMap(this._workingSet);
        const entries = new ResourceMap();
        for (const entry of this._entriesObs.get()) {
            entries.set(entry.modifiedURI, entry.createSnapshot(requestId, undoStop));
        }
        return {
            stopId: undoStop,
            workingSet,
            entries,
        };
    }
    getSnapshot(requestId, undoStop, snapshotUri) {
        const entries = undoStop === POST_EDIT_STOP_ID
            ? this._findSnapshot(requestId)?.postEdit
            : this._findEditStop(requestId, undoStop)?.stop.entries;
        return entries && [...entries.values()].find((e) => isEqual(e.snapshotUri, snapshotUri));
    }
    async getSnapshotModel(requestId, undoStop, snapshotUri) {
        const snapshotEntry = this.getSnapshot(requestId, undoStop, snapshotUri);
        if (!snapshotEntry) {
            return null;
        }
        return this._modelService.createModel(snapshotEntry.current, this._languageService.createById(snapshotEntry.languageId), snapshotUri, false);
    }
    getSnapshotUri(requestId, uri, stopId) {
        const stops = getCurrentAndNextStop(requestId, stopId, this._linearHistory.get());
        return stops?.next.get(uri)?.snapshotUri;
    }
    async restoreSnapshot(requestId, stopId) {
        if (requestId !== undefined) {
            const stopRef = this._findEditStop(requestId, stopId);
            if (stopRef) {
                this._ensurePendingSnapshot();
                await asyncTransaction(async (tx) => {
                    this._linearHistoryIndex.set(stopRef.historyIndex, tx);
                    await this._restoreSnapshot(stopRef.stop, tx);
                });
                this._updateRequestHiddenState();
            }
        }
        else {
            const pendingSnapshot = this._pendingSnapshot;
            if (!pendingSnapshot) {
                return; // We don't have a pending snapshot that we can restore
            }
            this._pendingSnapshot = undefined;
            await this._restoreSnapshot(pendingSnapshot, undefined);
        }
    }
    async _restoreSnapshot({ workingSet, entries }, tx, restoreResolvedToDisk = true) {
        this._workingSet = new ResourceMap(workingSet);
        // Reset all the files which are modified in this session state
        // but which are not found in the snapshot
        for (const entry of this._entriesObs.get()) {
            const snapshotEntry = entries.get(entry.modifiedURI);
            if (!snapshotEntry) {
                entry.resetToInitialContent();
                entry.dispose();
            }
        }
        const entriesArr = [];
        // Restore all entries from the snapshot
        for (const snapshotEntry of entries.values()) {
            const entry = await this._getOrCreateModifiedFileEntry(snapshotEntry.resource, snapshotEntry.telemetryInfo);
            const restoreToDisk = snapshotEntry.state === 0 /* WorkingSetEntryState.Modified */ || restoreResolvedToDisk;
            entry.restoreFromSnapshot(snapshotEntry, restoreToDisk);
            entriesArr.push(entry);
        }
        this._entriesObs.set(entriesArr, tx);
    }
    remove(reason, ...uris) {
        this._assertNotDisposed();
        let didRemoveUris = false;
        for (const uri of uris) {
            const entry = this._entriesObs.get().find((e) => isEqual(e.modifiedURI, uri));
            if (entry) {
                entry.dispose();
                const newEntries = this._entriesObs.get().filter((e) => !isEqual(e.modifiedURI, uri));
                this._entriesObs.set(newEntries, undefined);
                didRemoveUris = true;
            }
            const state = this._workingSet.get(uri);
            if (state !== undefined) {
                didRemoveUris = this._workingSet.delete(uri) || didRemoveUris;
            }
        }
        if (!didRemoveUris) {
            return; // noop
        }
        this._onDidChange.fire(0 /* ChatEditingSessionChangeType.WorkingSet */);
    }
    _assertNotDisposed() {
        if (this._state.get() === 3 /* ChatEditingSessionState.Disposed */) {
            throw new BugIndicatingError(`Cannot access a disposed editing session`);
        }
    }
    async accept(...uris) {
        this._assertNotDisposed();
        await asyncTransaction(async (tx) => {
            if (uris.length === 0) {
                await Promise.all(this._entriesObs.get().map((entry) => entry.accept(tx)));
            }
            for (const uri of uris) {
                const entry = this._entriesObs.get().find((e) => isEqual(e.modifiedURI, uri));
                if (entry) {
                    await entry.accept(tx);
                }
            }
        });
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, {
            allowManyInParallel: true,
        });
        this._onDidChange.fire(1 /* ChatEditingSessionChangeType.Other */);
    }
    async reject(...uris) {
        this._assertNotDisposed();
        await asyncTransaction(async (tx) => {
            if (uris.length === 0) {
                await Promise.all(this._entriesObs.get().map((entry) => entry.reject(tx)));
            }
            for (const uri of uris) {
                const entry = this._entriesObs.get().find((e) => isEqual(e.modifiedURI, uri));
                if (entry) {
                    await entry.reject(tx);
                }
            }
        });
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, {
            allowManyInParallel: true,
        });
        this._onDidChange.fire(1 /* ChatEditingSessionChangeType.Other */);
    }
    async show() {
        this._assertNotDisposed();
        if (this._editorPane) {
            if (this._editorPane.isVisible()) {
                return;
            }
            else if (this._editorPane.input) {
                await this._editorGroupsService.activeGroup.openEditor(this._editorPane.input, {
                    pinned: true,
                    activation: EditorActivation.ACTIVATE,
                });
                return;
            }
        }
        const input = MultiDiffEditorInput.fromResourceMultiDiffEditorInput({
            multiDiffSource: getMultiDiffSourceUri(this),
            label: localize('multiDiffEditorInput.name', 'Suggested Edits'),
        }, this._instantiationService);
        this._editorPane = (await this._editorGroupsService.activeGroup.openEditor(input, {
            pinned: true,
            activation: EditorActivation.ACTIVATE,
        }));
    }
    async stop(clearState = false) {
        this._stopPromise ??= Promise.allSettled([this._performStop(), this.storeState()]).then(() => { });
        await this._stopPromise;
        if (clearState) {
            await this._instantiationService
                .createInstance(ChatEditingSessionStorage, this.chatSessionId)
                .clearState();
        }
    }
    async _performStop() {
        // Close out all open files
        const schemes = [
            AbstractChatEditingModifiedFileEntry.scheme,
            ChatEditingTextModelContentProvider.scheme,
        ];
        await Promise.allSettled(this._editorGroupsService.groups.flatMap(async (g) => {
            return g.editors.map(async (e) => {
                if ((e instanceof MultiDiffEditorInput &&
                    e.initialResources?.some((r) => r.originalUri && schemes.indexOf(r.originalUri.scheme) !== -1)) ||
                    (e instanceof DiffEditorInput &&
                        e.original.resource &&
                        schemes.indexOf(e.original.resource.scheme) !== -1)) {
                    await g.closeEditor(e);
                }
            });
        }));
    }
    dispose() {
        this._assertNotDisposed();
        this._chatService.cancelCurrentRequestForSession(this.chatSessionId);
        dispose(this._entriesObs.get());
        super.dispose();
        this._state.set(3 /* ChatEditingSessionState.Disposed */, undefined);
        this._onDidDispose.fire();
        this._onDidDispose.dispose();
    }
    get isDisposed() {
        return this._state.get() === 3 /* ChatEditingSessionState.Disposed */;
    }
    startStreamingEdits(resource, responseModel, inUndoStop) {
        const completePromise = new DeferredPromise();
        const startPromise = new DeferredPromise();
        // Sequence all edits made this this resource in this streaming edits instance,
        // and also sequence the resource overall in the rare (currently invalid?) case
        // that edits are made in parallel to the same resource,
        const sequencer = new ThrottledSequencer(15, 1000);
        sequencer.queue(() => startPromise.p);
        this._streamingEditLocks.queue(resource.toString(), async () => {
            if (!this.isDisposed) {
                await this._acceptStreamingEditsStart(responseModel, inUndoStop, resource);
            }
            startPromise.complete();
            return completePromise.p;
        });
        let didComplete = false;
        return {
            pushText: (edits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, false, responseModel);
                    }
                });
            },
            pushNotebookCellText: (cell, edits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(cell, edits, false, responseModel);
                    }
                });
            },
            pushNotebook: (edits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, false, responseModel);
                    }
                });
            },
            complete: () => {
                if (didComplete) {
                    return;
                }
                didComplete = true;
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, [], true, responseModel);
                        await this._resolve(responseModel.requestId, inUndoStop, resource);
                        completePromise.complete();
                    }
                });
            },
        };
    }
    _getHistoryEntryByLinearIndex(index) {
        const history = this._linearHistory.get();
        const searchedIndex = binarySearch2(history.length, (e) => history[e].startIndex - index);
        const entry = history[searchedIndex < 0 ? ~searchedIndex - 1 : searchedIndex];
        if (!entry || index - entry.startIndex >= entry.stops.length) {
            return undefined;
        }
        return {
            entry,
            stop: entry.stops[index - entry.startIndex],
        };
    }
    async undoInteraction() {
        const newIndex = this._linearHistoryIndex.get() - 1;
        const previousSnapshot = this._getHistoryEntryByLinearIndex(newIndex);
        if (!previousSnapshot) {
            return;
        }
        this._ensurePendingSnapshot();
        await asyncTransaction(async (tx) => {
            await this._restoreSnapshot(previousSnapshot.stop, tx);
            this._linearHistoryIndex.set(newIndex, tx);
        });
        this._updateRequestHiddenState();
    }
    async redoInteraction() {
        const maxIndex = getMaxHistoryIndex(this._linearHistory.get());
        const newIndex = this._linearHistoryIndex.get() + 1;
        if (newIndex > maxIndex) {
            return;
        }
        const nextSnapshot = newIndex === maxIndex
            ? this._pendingSnapshot
            : this._getHistoryEntryByLinearIndex(newIndex)?.stop;
        if (!nextSnapshot) {
            return;
        }
        await asyncTransaction(async (tx) => {
            await this._restoreSnapshot(nextSnapshot, tx);
            this._linearHistoryIndex.set(newIndex, tx);
        });
        this._updateRequestHiddenState();
    }
    _updateRequestHiddenState() {
        const history = this._linearHistory.get();
        const index = this._linearHistoryIndex.get();
        const undoRequests = [];
        for (const entry of history) {
            if (!entry.requestId) {
                // ignored
            }
            else if (entry.startIndex >= index) {
                undoRequests.push({ requestId: entry.requestId });
            }
            else if (entry.startIndex + entry.stops.length > index) {
                undoRequests.push({
                    requestId: entry.requestId,
                    afterUndoStop: entry.stops[index - entry.startIndex].stopId,
                });
            }
        }
        this._chatService.getSession(this.chatSessionId)?.setDisabledRequests(undoRequests);
    }
    async _acceptStreamingEditsStart(responseModel, undoStop, resource) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, this._getTelemetryInfoForModel(responseModel));
        transaction((tx) => {
            this._state.set(1 /* ChatEditingSessionState.StreamingEdits */, tx);
            entry.acceptStreamingEditsStart(responseModel, tx);
            this.ensureEditInUndoStopMatches(responseModel.requestId, undoStop, entry, false, tx);
        });
    }
    /**
     * Ensures the state of the file in the given snapshot matches the current
     * state of the {@param entry}. This is used to handle concurrent file edits.
     *
     * Given the case of two different edits, we will place and undo stop right
     * before we `textEditGroup` in the underlying markdown stream, but at the
     * time those are added the edits haven't been made yet, so both files will
     * simply have the unmodified state.
     *
     * This method is called after each edit, so after the first file finishes
     * being edits, it will update its content in the second undo snapshot such
     * that it can be undone successfully.
     *
     * We ensure that the same file is not concurrently edited via the
     * {@link _streamingEditLocks}, avoiding race conditions.
     *
     * @param next If true, this will edit the snapshot _after_ the undo stop
     */
    ensureEditInUndoStopMatches(requestId, undoStop, entry, next, tx) {
        const history = this._linearHistory.get();
        const snapIndex = history.findIndex((s) => s.requestId === requestId);
        if (snapIndex === -1) {
            return;
        }
        const snap = history[snapIndex];
        let stopIndex = snap.stops.findIndex((s) => s.stopId === undoStop);
        if (stopIndex === -1) {
            return;
        }
        // special case: put the last change in the pendingSnapshot as needed
        if (next) {
            if (stopIndex === snap.stops.length - 1) {
                const postEdit = new ResourceMap(snap.postEdit || this._createSnapshot(undefined, undefined).entries);
                if (!snap.postEdit || !entry.equalsSnapshot(postEdit.get(entry.modifiedURI))) {
                    postEdit.set(entry.modifiedURI, entry.createSnapshot(requestId, POST_EDIT_STOP_ID));
                    const newHistory = history.slice();
                    newHistory[snapIndex] = { ...snap, postEdit };
                    this._linearHistory.set(newHistory, tx);
                }
                return;
            }
            stopIndex++;
        }
        const stop = snap.stops[stopIndex];
        if (entry.equalsSnapshot(stop.entries.get(entry.modifiedURI))) {
            return;
        }
        const newMap = new ResourceMap(stop.entries);
        newMap.set(entry.modifiedURI, entry.createSnapshot(requestId, stop.stopId));
        const newStop = snap.stops.slice();
        newStop[stopIndex] = { ...stop, entries: newMap };
        const newHistory = history.slice();
        newHistory[snapIndex] = { ...snap, stops: newStop };
        this._linearHistory.set(newHistory, tx);
    }
    async _acceptEdits(resource, textEdits, isLastEdits, responseModel) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, this._getTelemetryInfoForModel(responseModel));
        await entry.acceptAgentEdits(resource, textEdits, isLastEdits, responseModel);
    }
    _getTelemetryInfoForModel(responseModel) {
        // Make these getters because the response result is not available when the file first starts to be edited
        return new (class {
            get agentId() {
                return responseModel.agent?.id;
            }
            get command() {
                return responseModel.slashCommand?.name;
            }
            get sessionId() {
                return responseModel.session.sessionId;
            }
            get requestId() {
                return responseModel.requestId;
            }
            get result() {
                return responseModel.result;
            }
        })();
    }
    async _resolve(requestId, undoStop, resource) {
        await asyncTransaction(async (tx) => {
            const hasOtherTasks = Iterable.some(this._streamingEditLocks.keys(), (k) => k !== resource.toString());
            if (!hasOtherTasks) {
                this._state.set(2 /* ChatEditingSessionState.Idle */, tx);
            }
            const entry = this._getEntry(resource);
            if (!entry) {
                return;
            }
            this.ensureEditInUndoStopMatches(requestId, undoStop, entry, /* next= */ true, tx);
            return entry.acceptStreamingEditsEnd(tx);
        });
        this._onDidChange.fire(1 /* ChatEditingSessionChangeType.Other */);
    }
    /**
     * Retrieves or creates a modified file entry.
     *
     * @returns The modified file entry.
     */
    async _getOrCreateModifiedFileEntry(resource, telemetryInfo) {
        resource = CellUri.parse(resource)?.notebook ?? resource;
        const existingEntry = this._entriesObs.get().find((e) => isEqual(e.modifiedURI, resource));
        if (existingEntry) {
            if (telemetryInfo.requestId !== existingEntry.telemetryInfo.requestId) {
                existingEntry.updateTelemetryInfo(telemetryInfo);
            }
            return existingEntry;
        }
        let entry;
        const existingExternalEntry = this._lookupExternalEntry(resource);
        if (existingExternalEntry) {
            entry = existingExternalEntry;
        }
        else {
            const initialContent = this._initialFileContents.get(resource);
            // This gets manually disposed in .dispose() or in .restoreSnapshot()
            entry = await this._createModifiedFileEntry(resource, telemetryInfo, false, initialContent);
            if (!initialContent) {
                this._initialFileContents.set(resource, entry.initialContent);
            }
        }
        // If an entry is deleted e.g. reverting a created file,
        // remove it from the entries and don't show it in the working set anymore
        // so that it can be recreated e.g. through retry
        const listener = entry.onDidDelete(() => {
            const newEntries = this._entriesObs
                .get()
                .filter((e) => !isEqual(e.modifiedURI, entry.modifiedURI));
            this._entriesObs.set(newEntries, undefined);
            this._workingSet.delete(entry.modifiedURI);
            this._editorService.closeEditors(this._editorService.findEditors(entry.modifiedURI));
            if (!existingExternalEntry) {
                // don't dispose entries that are not yours!
                entry.dispose();
            }
            this._store.delete(listener);
            this._onDidChange.fire(0 /* ChatEditingSessionChangeType.WorkingSet */);
        });
        this._store.add(listener);
        const entriesArr = [...this._entriesObs.get(), entry];
        this._entriesObs.set(entriesArr, undefined);
        this._onDidChange.fire(0 /* ChatEditingSessionChangeType.WorkingSet */);
        return entry;
    }
    async _createModifiedFileEntry(resource, telemetryInfo, mustExist = false, initialContent) {
        const multiDiffEntryDelegate = {
            collapse: (transaction) => this._collapse(resource, transaction),
        };
        const chatKind = mustExist ? 0 /* ChatEditKind.Created */ : 1 /* ChatEditKind.Modified */;
        const notebookUri = CellUri.parse(resource)?.notebook || resource;
        try {
            // If a notebook isn't open, then use the old synchronization approach.
            if (this._notebookService.hasSupportedNotebooks(notebookUri) &&
                (this._notebookService.getNotebookTextModel(notebookUri) ||
                    ChatEditingModifiedNotebookEntry.canHandleSnapshotContent(initialContent))) {
                return await ChatEditingModifiedNotebookEntry.create(notebookUri, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent, this._instantiationService);
            }
            else {
                const ref = await this._textModelService.createModelReference(resource);
                return this._instantiationService.createInstance(ChatEditingModifiedDocumentEntry, ref, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent);
            }
        }
        catch (err) {
            if (mustExist) {
                throw err;
            }
            // this file does not exist yet, create it and try again
            await this._bulkEditService.apply({ edits: [{ newResource: resource }] });
            this._editorService.openEditor({
                resource,
                options: { inactive: true, preserveFocus: true, pinned: true },
            });
            if (this._notebookService.hasSupportedNotebooks(notebookUri)) {
                return await ChatEditingModifiedNotebookEntry.create(resource, multiDiffEntryDelegate, telemetryInfo, 0 /* ChatEditKind.Created */, initialContent, this._instantiationService);
            }
            else {
                return this._createModifiedFileEntry(resource, telemetryInfo, true, initialContent);
            }
        }
    }
    _collapse(resource, transaction) {
        const multiDiffItem = this._editorPane?.findDocumentDiffItem(resource);
        if (multiDiffItem) {
            this._editorPane?.viewModel?.items
                .get()
                .find((documentDiffItem) => isEqual(documentDiffItem.originalUri, multiDiffItem.originalUri) &&
                isEqual(documentDiffItem.modifiedUri, multiDiffItem.modifiedUri))
                ?.collapsed.set(true, transaction);
        }
    }
};
ChatEditingSession = __decorate([
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, ILanguageService),
    __param(6, ITextModelService),
    __param(7, IBulkEditService),
    __param(8, IEditorGroupsService),
    __param(9, IEditorService),
    __param(10, IChatService),
    __param(11, INotebookService),
    __param(12, IEditorWorkerService),
    __param(13, IConfigurationService),
    __param(14, IAccessibilitySignalService)
], ChatEditingSession);
export { ChatEditingSession };
let ChatEditingSessionStorage = class ChatEditingSessionStorage {
    constructor(chatSessionId, _fileService, _environmentService, _logService, _workspaceContextService) {
        this.chatSessionId = chatSessionId;
        this._fileService = _fileService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._workspaceContextService = _workspaceContextService;
    }
    _getStorageLocation() {
        const workspaceId = this._workspaceContextService.getWorkspace().id;
        return joinPath(this._environmentService.workspaceStorageHome, workspaceId, 'chatEditingSessions', this.chatSessionId);
    }
    async restoreState() {
        const storageLocation = this._getStorageLocation();
        const fileContents = new Map();
        const getFileContent = (hash) => {
            let readPromise = fileContents.get(hash);
            if (!readPromise) {
                readPromise = this._fileService
                    .readFile(joinPath(storageLocation, STORAGE_CONTENTS_FOLDER, hash))
                    .then((content) => content.value.toString());
                fileContents.set(hash, readPromise);
            }
            return readPromise;
        };
        const deserializeResourceMap = (resourceMap, deserialize, result) => {
            resourceMap.forEach(([resourceURI, value]) => {
                result.set(URI.parse(resourceURI), deserialize(value));
            });
            return result;
        };
        const deserializeSnapshotEntriesDTO = async (dtoEntries) => {
            const entries = new ResourceMap();
            for (const entryDTO of dtoEntries) {
                const entry = await deserializeSnapshotEntry(entryDTO);
                entries.set(entry.resource, entry);
            }
            return entries;
        };
        const deserializeChatEditingStopDTO = async (stopDTO) => {
            const entries = await deserializeSnapshotEntriesDTO(stopDTO.entries);
            const workingSet = deserializeResourceMap(stopDTO.workingSet, (value) => value, new ResourceMap());
            return { stopId: 'stopId' in stopDTO ? stopDTO.stopId : undefined, workingSet, entries };
        };
        const normalizeSnapshotDtos = (snapshot) => {
            if ('stops' in snapshot) {
                return snapshot;
            }
            return {
                requestId: snapshot.requestId,
                stops: [{ stopId: undefined, entries: snapshot.entries, workingSet: snapshot.workingSet }],
                postEdit: undefined,
            };
        };
        const deserializeChatEditingSessionSnapshot = async (startIndex, snapshot) => {
            const stops = await Promise.all(snapshot.stops.map(deserializeChatEditingStopDTO));
            return {
                startIndex,
                requestId: snapshot.requestId,
                stops,
                postEdit: snapshot.postEdit && (await deserializeSnapshotEntriesDTO(snapshot.postEdit)),
            };
        };
        const deserializeSnapshotEntry = async (entry) => {
            return {
                resource: URI.parse(entry.resource),
                languageId: entry.languageId,
                original: await getFileContent(entry.originalHash),
                current: await getFileContent(entry.currentHash),
                originalToCurrentEdit: OffsetEdit.fromJson(entry.originalToCurrentEdit),
                state: entry.state,
                snapshotUri: URI.parse(entry.snapshotUri),
                telemetryInfo: {
                    requestId: entry.telemetryInfo.requestId,
                    agentId: entry.telemetryInfo.agentId,
                    command: entry.telemetryInfo.command,
                    sessionId: this.chatSessionId,
                    result: undefined,
                },
            };
        };
        try {
            const stateFilePath = joinPath(storageLocation, STORAGE_STATE_FILE);
            if (!(await this._fileService.exists(stateFilePath))) {
                this._logService.debug(`chatEditingSession: No editing session state found at ${stateFilePath.toString()}`);
                return undefined;
            }
            this._logService.debug(`chatEditingSession: Restoring editing session at ${stateFilePath.toString()}`);
            const stateFileContent = await this._fileService.readFile(stateFilePath);
            const data = JSON.parse(stateFileContent.value.toString());
            if (!COMPATIBLE_STORAGE_VERSIONS.includes(data.version)) {
                return undefined;
            }
            let linearHistoryIndex = 0;
            const linearHistory = await Promise.all(data.linearHistory.map((snapshot) => {
                const norm = normalizeSnapshotDtos(snapshot);
                const result = deserializeChatEditingSessionSnapshot(linearHistoryIndex, norm);
                linearHistoryIndex += norm.stops.length;
                return result;
            }));
            const initialFileContents = new ResourceMap();
            for (const fileContentDTO of data.initialFileContents) {
                initialFileContents.set(URI.parse(fileContentDTO[0]), await getFileContent(fileContentDTO[1]));
            }
            const pendingSnapshot = data.pendingSnapshot
                ? await deserializeChatEditingStopDTO(data.pendingSnapshot)
                : undefined;
            const recentSnapshot = await deserializeChatEditingStopDTO(data.recentSnapshot);
            return {
                initialFileContents,
                pendingSnapshot,
                recentSnapshot,
                linearHistoryIndex: data.linearHistoryIndex,
                linearHistory,
            };
        }
        catch (e) {
            this._logService.error(`Error restoring chat editing session from ${storageLocation.toString()}`, e);
        }
        return undefined;
    }
    async storeState(state) {
        const storageFolder = this._getStorageLocation();
        const contentsFolder = URI.joinPath(storageFolder, STORAGE_CONTENTS_FOLDER);
        // prepare the content folder
        const existingContents = new Set();
        try {
            const stat = await this._fileService.resolve(contentsFolder);
            stat.children?.forEach((child) => {
                if (child.isFile) {
                    existingContents.add(child.name);
                }
            });
        }
        catch (e) {
            try {
                // does not exist, create
                await this._fileService.createFolder(contentsFolder);
            }
            catch (e) {
                this._logService.error(`Error creating chat editing session content folder ${contentsFolder.toString()}`, e);
                return;
            }
        }
        const fileContents = new Map();
        const addFileContent = (content) => {
            const shaComputer = new StringSHA1();
            shaComputer.update(content);
            const sha = shaComputer.digest().substring(0, 7);
            fileContents.set(sha, content);
            return sha;
        };
        const serializeResourceMap = (resourceMap, serialize) => {
            return Array.from(resourceMap.entries()).map(([resourceURI, value]) => [
                resourceURI.toString(),
                serialize(value),
            ]);
        };
        const serializeChatEditingSessionStop = (stop) => {
            return {
                stopId: stop.stopId,
                workingSet: serializeResourceMap(stop.workingSet, (value) => value),
                entries: Array.from(stop.entries.values()).map(serializeSnapshotEntry),
            };
        };
        const serializeChatEditingSessionSnapshot = (snapshot) => {
            return {
                requestId: snapshot.requestId,
                stops: snapshot.stops.map(serializeChatEditingSessionStop),
                postEdit: snapshot.postEdit
                    ? Array.from(snapshot.postEdit.values()).map(serializeSnapshotEntry)
                    : undefined,
            };
        };
        const serializeSnapshotEntry = (entry) => {
            return {
                resource: entry.resource.toString(),
                languageId: entry.languageId,
                originalHash: addFileContent(entry.original),
                currentHash: addFileContent(entry.current),
                originalToCurrentEdit: entry.originalToCurrentEdit.edits.map((edit) => ({
                    pos: edit.replaceRange.start,
                    len: edit.replaceRange.length,
                    txt: edit.newText,
                })),
                state: entry.state,
                snapshotUri: entry.snapshotUri.toString(),
                telemetryInfo: {
                    requestId: entry.telemetryInfo.requestId,
                    agentId: entry.telemetryInfo.agentId,
                    command: entry.telemetryInfo.command,
                },
            };
        };
        try {
            const data = {
                version: STORAGE_VERSION,
                sessionId: this.chatSessionId,
                linearHistory: state.linearHistory.map(serializeChatEditingSessionSnapshot),
                linearHistoryIndex: state.linearHistoryIndex,
                initialFileContents: serializeResourceMap(state.initialFileContents, (value) => addFileContent(value)),
                pendingSnapshot: state.pendingSnapshot
                    ? serializeChatEditingSessionStop(state.pendingSnapshot)
                    : undefined,
                recentSnapshot: serializeChatEditingSessionStop(state.recentSnapshot),
            };
            this._logService.debug(`chatEditingSession: Storing editing session at ${storageFolder.toString()}: ${fileContents.size} files`);
            for (const [hash, content] of fileContents) {
                if (!existingContents.has(hash)) {
                    await this._fileService.writeFile(joinPath(contentsFolder, hash), VSBuffer.fromString(content));
                }
            }
            await this._fileService.writeFile(joinPath(storageFolder, STORAGE_STATE_FILE), VSBuffer.fromString(JSON.stringify(data, undefined, 2)));
        }
        catch (e) {
            this._logService.debug(`Error storing chat editing session to ${storageFolder.toString()}`, e);
        }
    }
    async clearState() {
        const storageFolder = this._getStorageLocation();
        if (await this._fileService.exists(storageFolder)) {
            this._logService.debug(`chatEditingSession: Clearing editing session at ${storageFolder.toString()}`);
            try {
                await this._fileService.del(storageFolder, { recursive: true });
            }
            catch (e) {
                this._logService.debug(`Error clearing chat editing session from ${storageFolder.toString()}`, e);
            }
        }
    }
};
ChatEditingSessionStorage = __decorate([
    __param(1, IFileService),
    __param(2, IEnvironmentService),
    __param(3, ILogService),
    __param(4, IWorkspaceContextService)
], ChatEditingSessionStorage);
const COMPATIBLE_STORAGE_VERSIONS = [1, 2];
const STORAGE_VERSION = 2;
