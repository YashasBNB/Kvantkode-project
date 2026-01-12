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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0U2Vzc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQVNqRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM3RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUNOLGFBQWEsR0FFYixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTix3QkFBd0IsR0FHeEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVuRixPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBTXBFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBOEUxRixNQUFNLE9BQU8saUJBQWlCO2FBQ0wsYUFBUSxHQUE0QixzQkFBc0IsQ0FBQyxRQUFRLENBQUM7UUFDM0YsV0FBVyxFQUFFLCtCQUErQjtLQUM1QyxDQUFDLEFBRjhCLENBRTlCO0lBT0YsWUFDa0IsVUFBc0IsRUFDdkMsVUFBa0I7UUFERCxlQUFVLEdBQVYsVUFBVSxDQUFZO1FBTnZCLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUMxQyxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUVuRCxtQkFBYyxHQUFhLEVBQUUsQ0FBQTtRQU1wQyxJQUFJLENBQUMsY0FBYyxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FDaEQsRUFBRSxFQUNGLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUM1RCxDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFELENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQTRDO1FBQ2pELE1BQU0sT0FBTyxHQUE0QixFQUFFLENBQUE7UUFDM0MsS0FBSyxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDcEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQ2xELFFBQVEsQ0FBQyxPQUFPO2dCQUNmLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FDVCxRQUFRLENBQUMsZUFBZSxFQUN4QixDQUFDLEVBQ0QsUUFBUSxDQUFDLGVBQWUsRUFDeEIsTUFBTSxDQUFDLGdCQUFnQixDQUN2QjtnQkFDRixDQUFDLENBQUMsSUFBSSxLQUFLLENBQ1QsUUFBUSxDQUFDLGVBQWUsRUFDeEIsQ0FBQyxFQUNELFFBQVEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLEVBQ25DLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDdkIsQ0FDSCxDQUFBO1lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDNUUsQ0FBQztRQUNELE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFBLENBQUMsb0NBQW9DO1FBQ2pGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzlELElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVELElBQUksbUJBQW1CO1FBQ3RCLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFBO1FBQ25DLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsSUFBSSxNQUF5QixDQUFBO1FBQzdCLEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDcEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2IsTUFBTSxHQUFHLEtBQUssQ0FBQTtnQkFDZixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUN4QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU8sQ0FBQTtJQUNmLENBQUM7O0FBR0YsTUFBTSxPQUFPLE9BQU87SUFPbkIsWUFDVSxRQUFpQjtJQUMxQjs7T0FFRztJQUNNLFNBQWM7SUFDdkI7O09BRUc7SUFDTSxVQUFzQjtJQUMvQjs7T0FFRztJQUNNLFVBQXNCLEVBQ3RCLEtBQWlCLEVBQ2pCLFVBQTZCLEVBQzdCLFFBQWtCLEVBQ2xCLFNBQW9CLEVBQzdCLGlCQUFzQztRQWpCN0IsYUFBUSxHQUFSLFFBQVEsQ0FBUztRQUlqQixjQUFTLEdBQVQsU0FBUyxDQUFLO1FBSWQsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUl0QixlQUFVLEdBQVYsVUFBVSxDQUFZO1FBQ3RCLFVBQUssR0FBTCxLQUFLLENBQVk7UUFDakIsZUFBVSxHQUFWLFVBQVUsQ0FBbUI7UUFDN0IsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNsQixjQUFTLEdBQVQsU0FBUyxDQUFXO1FBdkJ0QixpQkFBWSxHQUFZLEtBQUssQ0FBQTtRQUNwQixlQUFVLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQTtRQUd2QixzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQXNCN0QsSUFBSSxDQUFDLFFBQVEsR0FBRztZQUNmLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztZQUN2RCxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUU7WUFDeEMsT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFO1lBQ3RDLEtBQUssRUFBRSxDQUFDO1lBQ1IsY0FBYyxFQUFFLEtBQUs7WUFDckIsTUFBTSxFQUFFLEVBQUU7WUFDVixLQUFLLEVBQUUsRUFBRTtZQUNULFNBQVMsRUFBRSxDQUFDO1lBQ1osYUFBYSxFQUFFLENBQUM7WUFDaEIsY0FBYyxFQUFFLENBQUM7WUFDakIsYUFBYSxFQUFFLEVBQUU7U0FDakIsQ0FBQTtRQUNELElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBRUQsYUFBYTtRQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBVSxJQUFJLENBQUMsQ0FBQTtRQUM3QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTtJQUN6QixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsT0FBMEI7UUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFpQjtRQUN2QyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDOUQsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUE7UUFDNUMsSUFBSSxDQUFDO1lBQ0osT0FDQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLHVCQUF1QixFQUFFO2dCQUM1RCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUN4QixDQUFDO2dCQUNGLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsR0FBRyxLQUFLLENBQUE7UUFDOUMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUFvQztRQUNqRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUE7UUFDaEMsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQTtRQUM5QixLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ2hFLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDM0YsQ0FBQztJQUVELDBCQUEwQixDQUFDLFNBQWtCO1FBQzVDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUE7SUFDekMsQ0FBQztJQUVELGVBQWU7UUFDZCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUM1QyxRQUFRLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUN6QjtvQkFDQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUE7b0JBQ2hDLE1BQUs7Z0JBQ047b0JBQ0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLElBQUksQ0FBQyxDQUFBO29CQUNqQyxNQUFLO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2hELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0NBQ0Q7QUFFTSxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFjO0lBSzFCLFlBQ0MsTUFBbUIsRUFDbkIsT0FBZ0IsRUFDQyxnQkFBdUMsRUFDcEMsaUJBQXFDLEVBQ2IsZUFBMEMsRUFDeEQsV0FBd0I7UUFIckMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF1QjtRQUVaLG9CQUFlLEdBQWYsZUFBZSxDQUEyQjtRQUN4RCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUV0RCxJQUFJLENBQUMscUJBQXFCLEdBQUcsbUNBQW1DLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFMUYsb0dBQW9HO1FBQ3BHLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUMxQixLQUFLLENBQUMsR0FBRyxDQUNSLE1BQU0sQ0FBQywwQkFBMEIsRUFDakMsTUFBTSxDQUFDLHVCQUF1QixFQUM5QixNQUFNLENBQUMsZ0JBQWdCLEVBQ3ZCLE1BQU0sQ0FBQyxxQkFBcUIsQ0FDNUIsQ0FDRCxDQUFDLEdBQUcsRUFBRTtZQUNOLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzVDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbEMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25ELENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQTtRQUM1QixNQUFNLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDdEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUE7UUFDOUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFBO1FBQy9DLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDaEQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0QsQ0FBQTtBQXREWSxjQUFjO0lBU3hCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLFdBQVcsQ0FBQTtHQVhELGNBQWMsQ0FzRDFCOztBQUVELE1BQU07QUFFTixTQUFTLGdCQUFnQixDQUFDLFNBQW9CLEVBQUUsS0FBaUI7SUFDaEUsT0FBTyxTQUFTLENBQUMsT0FBTztRQUN2QixDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDN0YsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUNULFNBQVMsQ0FBQyxlQUFlLEVBQ3pCLENBQUMsRUFDRCxTQUFTLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxFQUNwQyxNQUFNLENBQUMsZ0JBQWdCLENBQ3ZCLENBQUE7QUFDSixDQUFDO0FBRU0sSUFBTSxRQUFRLEdBQWQsTUFBTSxRQUFROzthQUNJLHdCQUFtQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUM3RSxXQUFXLEVBQUUsZ0NBQWdDO1FBQzdDLFVBQVUsNkRBQXFEO0tBQy9ELENBQUMsQUFIeUMsQ0FHekM7YUFFc0Isb0JBQWUsR0FBRyxDQUFDLEFBQUosQ0FBSTtJQU0zQyxZQUN1QixvQkFBMkQsRUFDaEUsV0FBdUIsRUFDdkIsV0FBdUI7UUFGRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQ2hFLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBQ3ZCLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBUHhCLFdBQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzlCLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQTtRQUNoRCxtQkFBYyxHQUFZLEtBQUssQ0FBQTtRQU90QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDL0MsS0FBSyxNQUFNLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7b0JBQzdELHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ25FLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDL0MsS0FBSyxNQUFNLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7b0JBQzdELHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ25FLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVELElBQUksdUJBQXVCLENBQUMsS0FBYztRQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQTtJQUM1QixDQUFDO0lBRUQsSUFBSSx1QkFBdUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQzNCLENBQUM7SUFFTyxjQUFjLENBQUMsS0FBZ0M7UUFDdEQsaUVBQWlFO1FBQ2pFLHNCQUFzQjtRQUd0QixNQUFNLFVBQVUsR0FBb0IsRUFBRSxDQUFBO1FBRXRDLE1BQU0sT0FBTyxHQUFZLEVBQUUsQ0FBQTtRQUUzQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUN6QyxJQUFJLEtBQUssQ0FBQyxLQUFLLDhCQUFzQixFQUFFLENBQUM7Z0JBQ3ZDLHVEQUF1RDtnQkFDdkQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDN0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDbEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDbEYsSUFBSSxNQUFNLElBQUksTUFBTSxFQUFFLENBQUM7d0JBQ3RCLFVBQVUsQ0FBQyxJQUFJLENBQUM7NEJBQ2YsTUFBTTs0QkFDTixNQUFNOzRCQUNOLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLDZCQUFxQixDQUFDO3lCQUN0RCxDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxLQUFLLCtCQUF1QixFQUFFLENBQUM7Z0JBQy9DLDJEQUEyRDtnQkFDM0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDN0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDakYsSUFBSSxLQUFLLEVBQUUsQ0FBQzt3QkFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUNwQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sS0FBSyxHQUFxQyxFQUFFLENBQUE7UUFFbEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEMsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFBO1lBRXpCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO1lBRXpCLEtBQUssTUFBTSxLQUFLLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ2xGLGdGQUFnRjtvQkFDaEYsa0ZBQWtGO29CQUNsRixvRkFBb0Y7b0JBQ3BGLHNCQUFzQjtvQkFDdEIsaUJBQWlCLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ3pFLGlCQUFpQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUMxRSxDQUFDO3FCQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3hFLG1FQUFtRTtvQkFDbkUsNkVBQTZFO29CQUM3RSw2REFBNkQ7b0JBQzdELEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtvQkFDcEIsYUFBYSxHQUFHLElBQUksQ0FBQTtvQkFDcEIsTUFBSztnQkFDTixDQUFDO3FCQUFNLENBQUM7b0JBQ1AseUNBQXlDO29CQUN6QyxNQUFLO2dCQUNOLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbkIseUJBQXlCO2dCQUN6QixTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUE7WUFDdEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFdEQsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUE7WUFDMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzdDLGdGQUFnRjtvQkFDaEYsc0JBQXNCO29CQUN0QixrQkFBa0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNwRSxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxrQkFBa0IsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDN0YsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBa0MsRUFBRSxJQUEyQjtRQUM5RSxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUNuRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFDcEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQ3BCO1lBQ0Msb0JBQW9CLEVBQUUsS0FBSztZQUMzQixvQkFBb0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO1lBQzdDLFlBQVksRUFBRSxLQUFLO1NBQ25CLEVBQ0QsVUFBVSxDQUNWLENBQUE7UUFFRCxJQUFJLGFBQWEsR0FBK0IsRUFBRSxDQUFBO1FBRWxELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JDLG9DQUFvQztZQUNwQyxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDakMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUMxRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNsQyxJQUNDLFVBQVUsQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsc0JBQXNCO29CQUNoRixVQUFRLENBQUMsZUFBZSxFQUN2QixDQUFDO29CQUNGLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksd0JBQXdCLENBQ3JFLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFDN0MsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUM3QyxDQUFDLFVBQVUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLENBQ3JFLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQzlCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FDcEYsQ0FBQTtRQUVELFNBQVMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQTtRQUVoQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO2dCQUNoRCwyQkFBMkI7Z0JBQzNCLEtBQUssTUFBTSxFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO29CQUNwRixxQkFBcUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFBO29CQUNwRSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUNyRSxDQUFDO2dCQUVELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBRWxCLHNCQUFzQjtnQkFDdEIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDMUIsTUFBTSxxQkFBcUIsR0FBYSxFQUFFLENBQUE7b0JBQzFDLE1BQU0scUJBQXFCLEdBQWEsRUFBRSxDQUFBO29CQUUxQyxxQkFBcUIsQ0FBQyxJQUFJLENBQ3pCLFNBQVMsQ0FBQyxhQUFhLENBQ3RCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUNqRCxVQUFRLENBQUMsbUJBQW1CLENBQzVCLENBQ0QsQ0FBQTtvQkFDRCxxQkFBcUIsQ0FBQyxJQUFJLENBQ3pCLFNBQVMsQ0FBQyxhQUFhLENBQ3RCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUNqRCxVQUFRLENBQUMsbUJBQW1CLENBQzVCLENBQ0QsQ0FBQTtvQkFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDbkMscUJBQXFCLENBQUMsSUFBSSxDQUN6QixTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsVUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQzNFLENBQUE7d0JBQ0QscUJBQXFCLENBQUMsSUFBSSxDQUN6QixTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsVUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQzNFLENBQUE7b0JBQ0YsQ0FBQztvQkFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7d0JBQ3BCLFNBQVM7d0JBQ1QscUJBQXFCO3dCQUNyQixxQkFBcUI7d0JBQ3JCLEtBQUssMkJBQW1CO3FCQUN4QixDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUNuQixDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLDhCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMzRCxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxhQUFhLENBQUMsSUFBcUI7UUFDMUMsTUFBTSxLQUFLLEdBQTJCLEVBQUUsQ0FBQTtRQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDakMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWhDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xFLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsVUFBVTtRQUNULE1BQU0sS0FBSyxHQUE2QixFQUFFLENBQUE7UUFDMUMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUNuQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsOEJBQXNCLEVBQUUsQ0FBQztnQkFDM0MsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBNEIsRUFBRSxDQUFBO1FBQzdDLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3RFLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDMUIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxPQUFPO1FBQ04sTUFBTSxNQUFNLEdBQXNCLEVBQUUsQ0FBQTtRQUVwQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2pELE1BQU0sSUFBSSxHQUFvQjtnQkFDN0IsUUFBUSxFQUFFLEdBQUcsRUFBRTtvQkFDZCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7Z0JBQ2xCLENBQUM7Z0JBQ0QsV0FBVyxFQUFFLEdBQUcsRUFBRTtvQkFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQTtnQkFDN0IsQ0FBQztnQkFDRCxVQUFVLEVBQUUsR0FBRyxFQUFFO29CQUNoQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FDcEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FDdkMsQ0FBQTtvQkFDRCxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ3ZCLE9BQU8sTUFBTSxDQUFBO2dCQUNkLENBQUM7Z0JBQ0QsVUFBVSxFQUFFLEdBQUcsRUFBRTtvQkFDaEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ3BELElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQ3ZDLENBQUE7b0JBQ0QsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUN2QixPQUFPLE1BQU0sQ0FBQTtnQkFDZCxDQUFDO2dCQUNELGNBQWMsRUFBRSxHQUFHLEVBQUU7b0JBQ3BCLHlHQUF5RztvQkFDekcsOEVBQThFO29CQUM5RSxJQUFJLElBQUksQ0FBQyxLQUFLLDhCQUFzQixFQUFFLENBQUM7d0JBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQ3RDLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDNUQsSUFBSSxDQUFDLEtBQUssNkJBQXFCLENBQUE7d0JBQy9CLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQTt3QkFDNUIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsYUFBYSxFQUFFLEdBQUcsRUFBRTtvQkFDbkIseUdBQXlHO29CQUN6RyxvRUFBb0U7b0JBQ3BFLElBQUksSUFBSSxDQUFDLEtBQUssOEJBQXNCLEVBQUUsQ0FBQzt3QkFDdEMsTUFBTSxLQUFLLEdBQTJCLEVBQUUsQ0FBQTt3QkFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO3dCQUNqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7d0JBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQ3pDLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTs0QkFDaEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7NEJBQ2xFLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQTt3QkFDaEUsQ0FBQzt3QkFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQzVELElBQUksQ0FBQyxLQUFLLDZCQUFxQixDQUFBO29CQUNoQyxDQUFDO2dCQUNGLENBQUM7YUFDRCxDQUFBO1lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsQixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDOztBQTFVVyxRQUFRO0lBYWxCLFdBQUEsb0JBQW9CLENBQUE7R0FiVixRQUFRLENBMlVwQjs7QUFFRCxNQUFNLE9BQU87SUFDWixZQUNVLFFBQW1CLEVBQ25CLFFBQW1CLEVBQ25CLE9BQXVCO1FBRnZCLGFBQVEsR0FBUixRQUFRLENBQVc7UUFDbkIsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUNuQixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUM5QixDQUFDO0NBQ0o7QUFTRCxNQUFNLENBQU4sSUFBa0IsU0FJakI7QUFKRCxXQUFrQixTQUFTO0lBQzFCLCtDQUFXLENBQUE7SUFDWCxpREFBWSxDQUFBO0lBQ1osaURBQVksQ0FBQTtBQUNiLENBQUMsRUFKaUIsU0FBUyxLQUFULFNBQVMsUUFJMUIifQ==