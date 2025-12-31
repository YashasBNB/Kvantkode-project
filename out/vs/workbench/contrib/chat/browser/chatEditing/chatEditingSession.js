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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nU2Vzc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxJQUFJLFdBQVcsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRixPQUFPLEVBQ04sZUFBZSxFQUVmLFNBQVMsRUFDVCxjQUFjLEVBQ2QsT0FBTyxHQUNQLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLE9BQU8sRUFDUCxXQUFXLEVBQ1gsZ0JBQWdCLEVBSWhCLGlCQUFpQixFQUNqQixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7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