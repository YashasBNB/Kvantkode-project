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
var HunkData_1;
import { Emitter, Event } from '../../../../base/common/event.js';
import { CTX_INLINE_CHAT_HAS_STASHED_SESSION } from '../common/inlineChat.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { EditOperation, } from '../../../../editor/common/core/editOperation.js';
import { DetailedLineRangeMapping, } from '../../../../editor/common/diff/rangeMapping.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { coalesceInPlace } from '../../../../base/common/arrays.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
export class SessionWholeRange {
    static { this._options = ModelDecorationOptions.register({
        description: 'inlineChat/session/wholeRange',
    }); }
    constructor(_textModel, wholeRange) {
        this._textModel = _textModel;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._decorationIds = [];
        this._decorationIds = _textModel.deltaDecorations([], [{ range: wholeRange, options: SessionWholeRange._options }]);
    }
    dispose() {
        this._onDidChange.dispose();
        if (!this._textModel.isDisposed()) {
            this._textModel.deltaDecorations(this._decorationIds, []);
        }
    }
    fixup(changes) {
        const newDeco = [];
        for (const { modified } of changes) {
            const modifiedRange = this._textModel.validateRange(modified.isEmpty
                ? new Range(modified.startLineNumber, 1, modified.startLineNumber, Number.MAX_SAFE_INTEGER)
                : new Range(modified.startLineNumber, 1, modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER));
            newDeco.push({ range: modifiedRange, options: SessionWholeRange._options });
        }
        const [first, ...rest] = this._decorationIds; // first is the original whole range
        const newIds = this._textModel.deltaDecorations(rest, newDeco);
        this._decorationIds = [first].concat(newIds);
        this._onDidChange.fire(this);
    }
    get trackedInitialRange() {
        const [first] = this._decorationIds;
        return this._textModel.getDecorationRange(first) ?? new Range(1, 1, 1, 1);
    }
    get value() {
        let result;
        for (const id of this._decorationIds) {
            const range = this._textModel.getDecorationRange(id);
            if (range) {
                if (!result) {
                    result = range;
                }
                else {
                    result = Range.plusRange(result, range);
                }
            }
        }
        return result;
    }
}
export class Session {
    constructor(headless, 
    /**
     * The URI of the document which is being EditorEdit
     */
    targetUri, 
    /**
     * A copy of the document at the time the session was started
     */
    textModel0, 
    /**
     * The model of the editor
     */
    textModelN, agent, wholeRange, hunkData, chatModel, versionsByRequest) {
        this.headless = headless;
        this.targetUri = targetUri;
        this.textModel0 = textModel0;
        this.textModelN = textModelN;
        this.agent = agent;
        this.wholeRange = wholeRange;
        this.hunkData = hunkData;
        this.chatModel = chatModel;
        this._isUnstashed = false;
        this._startTime = new Date();
        this._versionByRequest = new Map();
        this._teldata = {
            extension: ExtensionIdentifier.toKey(agent.extensionId),
            startTime: this._startTime.toISOString(),
            endTime: this._startTime.toISOString(),
            edits: 0,
            finishedByEdit: false,
            rounds: '',
            undos: '',
            unstashed: 0,
            acceptedHunks: 0,
            discardedHunks: 0,
            responseTypes: '',
        };
        if (versionsByRequest) {
            this._versionByRequest = new Map(versionsByRequest);
        }
    }
    get isUnstashed() {
        return this._isUnstashed;
    }
    markUnstashed() {
        this._teldata.unstashed += 1;
        this._isUnstashed = true;
    }
    markModelVersion(request) {
        this._versionByRequest.set(request.id, this.textModelN.getAlternativeVersionId());
    }
    get versionsByRequest() {
        return Array.from(this._versionByRequest);
    }
    async undoChangesUntil(requestId) {
        const targetAltVersion = this._versionByRequest.get(requestId);
        if (targetAltVersion === undefined) {
            return false;
        }
        // undo till this point
        this.hunkData.ignoreTextModelNChanges = true;
        try {
            while (targetAltVersion < this.textModelN.getAlternativeVersionId() &&
                this.textModelN.canUndo()) {
                await this.textModelN.undo();
            }
        }
        finally {
            this.hunkData.ignoreTextModelNChanges = false;
        }
        return true;
    }
    get hasChangedText() {
        return !this.textModel0.equalsTextBuffer(this.textModelN.getTextBuffer());
    }
    asChangedText(changes) {
        if (changes.length === 0) {
            return undefined;
        }
        let startLine = Number.MAX_VALUE;
        let endLine = Number.MIN_VALUE;
        for (const change of changes) {
            startLine = Math.min(startLine, change.modified.startLineNumber);
            endLine = Math.max(endLine, change.modified.endLineNumberExclusive);
        }
        return this.textModelN.getValueInRange(new Range(startLine, 1, endLine, Number.MAX_VALUE));
    }
    recordExternalEditOccurred(didFinish) {
        this._teldata.edits += 1;
        this._teldata.finishedByEdit = didFinish;
    }
    asTelemetryData() {
        for (const item of this.hunkData.getInfo()) {
            switch (item.getState()) {
                case 1 /* HunkState.Accepted */:
                    this._teldata.acceptedHunks += 1;
                    break;
                case 2 /* HunkState.Rejected */:
                    this._teldata.discardedHunks += 1;
                    break;
            }
        }
        this._teldata.endTime = new Date().toISOString();
        return this._teldata;
    }
}
let StashedSession = class StashedSession {
    constructor(editor, session, _undoCancelEdits, contextKeyService, _sessionService, _logService) {
        this._undoCancelEdits = _undoCancelEdits;
        this._sessionService = _sessionService;
        this._logService = _logService;
        this._ctxHasStashedSession = CTX_INLINE_CHAT_HAS_STASHED_SESSION.bindTo(contextKeyService);
        // keep session for a little bit, only release when user continues to work (type, move cursor, etc.)
        this._session = session;
        this._ctxHasStashedSession.set(true);
        this._listener = Event.once(Event.any(editor.onDidChangeCursorSelection, editor.onDidChangeModelContent, editor.onDidChangeModel, editor.onDidBlurEditorWidget))(() => {
            this._session = undefined;
            this._sessionService.releaseSession(session);
            this._ctxHasStashedSession.reset();
        });
    }
    dispose() {
        this._listener.dispose();
        this._ctxHasStashedSession.reset();
        if (this._session) {
            this._sessionService.releaseSession(this._session);
        }
    }
    unstash() {
        if (!this._session) {
            return undefined;
        }
        this._listener.dispose();
        const result = this._session;
        result.markUnstashed();
        result.hunkData.ignoreTextModelNChanges = true;
        result.textModelN.pushEditOperations(null, this._undoCancelEdits, () => null);
        result.hunkData.ignoreTextModelNChanges = false;
        this._session = undefined;
        this._logService.debug('[IE] Unstashed session');
        return result;
    }
};
StashedSession = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInlineChatSessionService),
    __param(5, ILogService)
], StashedSession);
export { StashedSession };
// ---
function lineRangeAsRange(lineRange, model) {
    return lineRange.isEmpty
        ? new Range(lineRange.startLineNumber, 1, lineRange.startLineNumber, Number.MAX_SAFE_INTEGER)
        : new Range(lineRange.startLineNumber, 1, lineRange.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER);
}
let HunkData = class HunkData {
    static { HunkData_1 = this; }
    static { this._HUNK_TRACKED_RANGE = ModelDecorationOptions.register({
        description: 'inline-chat-hunk-tracked-range',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
    }); }
    static { this._HUNK_THRESHOLD = 8; }
    constructor(_editorWorkerService, _textModel0, _textModelN) {
        this._editorWorkerService = _editorWorkerService;
        this._textModel0 = _textModel0;
        this._textModelN = _textModelN;
        this._store = new DisposableStore();
        this._data = new Map();
        this._ignoreChanges = false;
        this._store.add(_textModelN.onDidChangeContent((e) => {
            if (!this._ignoreChanges) {
                this._mirrorChanges(e);
            }
        }));
    }
    dispose() {
        if (!this._textModelN.isDisposed()) {
            this._textModelN.changeDecorations((accessor) => {
                for (const { textModelNDecorations } of this._data.values()) {
                    textModelNDecorations.forEach(accessor.removeDecoration, accessor);
                }
            });
        }
        if (!this._textModel0.isDisposed()) {
            this._textModel0.changeDecorations((accessor) => {
                for (const { textModel0Decorations } of this._data.values()) {
                    textModel0Decorations.forEach(accessor.removeDecoration, accessor);
                }
            });
        }
        this._data.clear();
        this._store.dispose();
    }
    set ignoreTextModelNChanges(value) {
        this._ignoreChanges = value;
    }
    get ignoreTextModelNChanges() {
        return this._ignoreChanges;
    }
    _mirrorChanges(event) {
        // mirror textModelN changes to textModel0 execept for those that
        // overlap with a hunk
        const hunkRanges = [];
        const ranges0 = [];
        for (const entry of this._data.values()) {
            if (entry.state === 0 /* HunkState.Pending */) {
                // pending means the hunk's changes aren't "sync'd" yet
                for (let i = 1; i < entry.textModelNDecorations.length; i++) {
                    const rangeN = this._textModelN.getDecorationRange(entry.textModelNDecorations[i]);
                    const range0 = this._textModel0.getDecorationRange(entry.textModel0Decorations[i]);
                    if (rangeN && range0) {
                        hunkRanges.push({
                            rangeN,
                            range0,
                            markAccepted: () => (entry.state = 1 /* HunkState.Accepted */),
                        });
                    }
                }
            }
            else if (entry.state === 1 /* HunkState.Accepted */) {
                // accepted means the hunk's changes are also in textModel0
                for (let i = 1; i < entry.textModel0Decorations.length; i++) {
                    const range = this._textModel0.getDecorationRange(entry.textModel0Decorations[i]);
                    if (range) {
                        ranges0.push(range);
                    }
                }
            }
        }
        hunkRanges.sort((a, b) => Range.compareRangesUsingStarts(a.rangeN, b.rangeN));
        ranges0.sort(Range.compareRangesUsingStarts);
        const edits = [];
        for (const change of event.changes) {
            let isOverlapping = false;
            let pendingChangesLen = 0;
            for (const entry of hunkRanges) {
                if (entry.rangeN.getEndPosition().isBefore(Range.getStartPosition(change.range))) {
                    // pending hunk _before_ this change. When projecting into textModel0 we need to
                    // subtract that. Because diffing is relaxed it might include changes that are not
                    // actual insertions/deletions. Therefore we need to take the length of the original
                    // range into account.
                    pendingChangesLen += this._textModelN.getValueLengthInRange(entry.rangeN);
                    pendingChangesLen -= this._textModel0.getValueLengthInRange(entry.range0);
                }
                else if (Range.areIntersectingOrTouching(entry.rangeN, change.range)) {
                    // an edit overlaps with a (pending) hunk. We take this as a signal
                    // to mark the hunk as accepted and to ignore the edit. The range of the hunk
                    // will be up-to-date because of decorations created for them
                    entry.markAccepted();
                    isOverlapping = true;
                    break;
                }
                else {
                    // hunks past this change aren't relevant
                    break;
                }
            }
            if (isOverlapping) {
                // hunk overlaps, it grew
                continue;
            }
            const offset0 = change.rangeOffset - pendingChangesLen;
            const start0 = this._textModel0.getPositionAt(offset0);
            let acceptedChangesLen = 0;
            for (const range of ranges0) {
                if (range.getEndPosition().isBefore(start0)) {
                    // accepted hunk _before_ this projected change. When projecting into textModel0
                    // we need to add that
                    acceptedChangesLen += this._textModel0.getValueLengthInRange(range);
                }
            }
            const start = this._textModel0.getPositionAt(offset0 + acceptedChangesLen);
            const end = this._textModel0.getPositionAt(offset0 + acceptedChangesLen + change.rangeLength);
            edits.push(EditOperation.replace(Range.fromPositions(start, end), change.text));
        }
        this._textModel0.pushEditOperations(null, edits, () => null);
    }
    async recompute(editState, diff) {
        diff ??= await this._editorWorkerService.computeDiff(this._textModel0.uri, this._textModelN.uri, {
            ignoreTrimWhitespace: false,
            maxComputationTimeMs: Number.MAX_SAFE_INTEGER,
            computeMoves: false,
        }, 'advanced');
        let mergedChanges = [];
        if (diff && diff.changes.length > 0) {
            // merge changes neighboring changes
            mergedChanges = [diff.changes[0]];
            for (let i = 1; i < diff.changes.length; i++) {
                const lastChange = mergedChanges[mergedChanges.length - 1];
                const thisChange = diff.changes[i];
                if (thisChange.modified.startLineNumber - lastChange.modified.endLineNumberExclusive <=
                    HunkData_1._HUNK_THRESHOLD) {
                    mergedChanges[mergedChanges.length - 1] = new DetailedLineRangeMapping(lastChange.original.join(thisChange.original), lastChange.modified.join(thisChange.modified), (lastChange.innerChanges ?? []).concat(thisChange.innerChanges ?? []));
                }
                else {
                    mergedChanges.push(thisChange);
                }
            }
        }
        const hunks = mergedChanges.map((change) => new RawHunk(change.original, change.modified, change.innerChanges ?? []));
        editState.applied = hunks.length;
        this._textModelN.changeDecorations((accessorN) => {
            this._textModel0.changeDecorations((accessor0) => {
                // clean up old decorations
                for (const { textModelNDecorations, textModel0Decorations } of this._data.values()) {
                    textModelNDecorations.forEach(accessorN.removeDecoration, accessorN);
                    textModel0Decorations.forEach(accessor0.removeDecoration, accessor0);
                }
                this._data.clear();
                // add new decorations
                for (const hunk of hunks) {
                    const textModelNDecorations = [];
                    const textModel0Decorations = [];
                    textModelNDecorations.push(accessorN.addDecoration(lineRangeAsRange(hunk.modified, this._textModelN), HunkData_1._HUNK_TRACKED_RANGE));
                    textModel0Decorations.push(accessor0.addDecoration(lineRangeAsRange(hunk.original, this._textModel0), HunkData_1._HUNK_TRACKED_RANGE));
                    for (const change of hunk.changes) {
                        textModelNDecorations.push(accessorN.addDecoration(change.modifiedRange, HunkData_1._HUNK_TRACKED_RANGE));
                        textModel0Decorations.push(accessor0.addDecoration(change.originalRange, HunkData_1._HUNK_TRACKED_RANGE));
                    }
                    this._data.set(hunk, {
                        editState,
                        textModelNDecorations,
                        textModel0Decorations,
                        state: 0 /* HunkState.Pending */,
                    });
                }
            });
        });
    }
    get size() {
        return this._data.size;
    }
    get pending() {
        return Iterable.reduce(this._data.values(), (r, { state }) => r + (state === 0 /* HunkState.Pending */ ? 1 : 0), 0);
    }
    _discardEdits(item) {
        const edits = [];
        const rangesN = item.getRangesN();
        const ranges0 = item.getRanges0();
        for (let i = 1; i < rangesN.length; i++) {
            const modifiedRange = rangesN[i];
            const originalValue = this._textModel0.getValueInRange(ranges0[i]);
            edits.push(EditOperation.replace(modifiedRange, originalValue));
        }
        return edits;
    }
    discardAll() {
        const edits = [];
        for (const item of this.getInfo()) {
            if (item.getState() === 0 /* HunkState.Pending */) {
                edits.push(this._discardEdits(item));
            }
        }
        const undoEdits = [];
        this._textModelN.pushEditOperations(null, edits.flat(), (_undoEdits) => {
            undoEdits.push(_undoEdits);
            return null;
        });
        return undoEdits.flat();
    }
    getInfo() {
        const result = [];
        for (const [hunk, data] of this._data.entries()) {
            const item = {
                getState: () => {
                    return data.state;
                },
                isInsertion: () => {
                    return hunk.original.isEmpty;
                },
                getRangesN: () => {
                    const ranges = data.textModelNDecorations.map((id) => this._textModelN.getDecorationRange(id));
                    coalesceInPlace(ranges);
                    return ranges;
                },
                getRanges0: () => {
                    const ranges = data.textModel0Decorations.map((id) => this._textModel0.getDecorationRange(id));
                    coalesceInPlace(ranges);
                    return ranges;
                },
                discardChanges: () => {
                    // DISCARD: replace modified range with original value. The modified range is retrieved from a decoration
                    // which was created above so that typing in the editor keeps discard working.
                    if (data.state === 0 /* HunkState.Pending */) {
                        const edits = this._discardEdits(item);
                        this._textModelN.pushEditOperations(null, edits, () => null);
                        data.state = 2 /* HunkState.Rejected */;
                        if (data.editState.applied > 0) {
                            data.editState.applied -= 1;
                        }
                    }
                },
                acceptChanges: () => {
                    // ACCEPT: replace original range with modified value. The modified value is retrieved from the model via
                    // its decoration and the original range is retrieved from the hunk.
                    if (data.state === 0 /* HunkState.Pending */) {
                        const edits = [];
                        const rangesN = item.getRangesN();
                        const ranges0 = item.getRanges0();
                        for (let i = 1; i < ranges0.length; i++) {
                            const originalRange = ranges0[i];
                            const modifiedValue = this._textModelN.getValueInRange(rangesN[i]);
                            edits.push(EditOperation.replace(originalRange, modifiedValue));
                        }
                        this._textModel0.pushEditOperations(null, edits, () => null);
                        data.state = 1 /* HunkState.Accepted */;
                    }
                },
            };
            result.push(item);
        }
        return result;
    }
};
HunkData = HunkData_1 = __decorate([
    __param(0, IEditorWorkerService)
], HunkData);
export { HunkData };
class RawHunk {
    constructor(original, modified, changes) {
        this.original = original;
        this.modified = modified;
        this.changes = changes;
    }
}
export var HunkState;
(function (HunkState) {
    HunkState[HunkState["Pending"] = 0] = "Pending";
    HunkState[HunkState["Accepted"] = 1] = "Accepted";
    HunkState[HunkState["Rejected"] = 2] = "Rejected";
})(HunkState || (HunkState = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdFNlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFTakUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0UsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JGLE9BQU8sRUFDTixhQUFhLEdBRWIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sd0JBQXdCLEdBR3hCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFFbkYsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQU1wRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQThFMUYsTUFBTSxPQUFPLGlCQUFpQjthQUNMLGFBQVEsR0FBNEIsc0JBQXNC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