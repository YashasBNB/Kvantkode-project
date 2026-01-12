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
var ChatEditingNotebookCellEntry_1;
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { observableValue, autorun, transaction, } from '../../../../../../base/common/observable.js';
import { ObservableDisposable } from '../../../../../../base/common/observableDisposable.js';
import { themeColorFromId } from '../../../../../../base/common/themables.js';
import { EditOperation, } from '../../../../../../editor/common/core/editOperation.js';
import { OffsetEdit } from '../../../../../../editor/common/core/offsetEdit.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { nullDocumentDiff, } from '../../../../../../editor/common/diff/documentDiffProvider.js';
import { TextEdit } from '../../../../../../editor/common/languages.js';
import { OverviewRulerLane, } from '../../../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../../../editor/common/model/textModel.js';
import { OffsetEdits } from '../../../../../../editor/common/model/textModelOffsetEdit.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { observableConfigValue } from '../../../../../../platform/observable/common/platformObservableUtils.js';
import { editorSelectionBackground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { CellEditState } from '../../../../notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../../../notebook/browser/services/notebookEditorService.js';
import { pendingRewriteMinimap } from '../chatEditingModifiedFileEntry.js';
/**
 * This is very closely similar to the ChatEditingModifiedDocumentEntry class.
 * Most of the code has been borrowed from there, as a cell is effectively a document.
 * Hence most of the same functionality applies.
 */
let ChatEditingNotebookCellEntry = class ChatEditingNotebookCellEntry extends ObservableDisposable {
    static { ChatEditingNotebookCellEntry_1 = this; }
    static { this._lastEditDecorationOptions = ModelDecorationOptions.register({
        isWholeLine: true,
        description: 'chat-last-edit',
        className: 'chat-editing-last-edit-line',
        marginClassName: 'chat-editing-last-edit',
        overviewRuler: {
            position: OverviewRulerLane.Full,
            color: themeColorFromId(editorSelectionBackground),
        },
    }); }
    static { this._pendingEditDecorationOptions = ModelDecorationOptions.register({
        isWholeLine: true,
        description: 'chat-pending-edit',
        className: 'chat-editing-pending-edit',
        minimap: {
            position: 1 /* MinimapPosition.Inline */,
            color: themeColorFromId(pendingRewriteMinimap),
        },
    }); }
    get isEditFromUs() {
        return this._isEditFromUs;
    }
    get allEditsAreFromUs() {
        return this._allEditsAreFromUs;
    }
    get diffInfo() {
        return this._diffInfo;
    }
    constructor(notebookUri, cell, modifiedModel, originalModel, disposables, configService, _editorWorkerService, notebookEditorService) {
        super();
        this.notebookUri = notebookUri;
        this.cell = cell;
        this.modifiedModel = modifiedModel;
        this.originalModel = originalModel;
        this._editorWorkerService = _editorWorkerService;
        this.notebookEditorService = notebookEditorService;
        this._edit = OffsetEdit.empty;
        this._isEditFromUs = false;
        this._allEditsAreFromUs = true;
        this._diffOperationIds = 0;
        this._diffInfo = observableValue(this, nullDocumentDiff);
        this._maxModifiedLineNumber = observableValue(this, 0);
        this.maxModifiedLineNumber = this._maxModifiedLineNumber;
        this._editDecorationClear = this._register(new RunOnceScheduler(() => {
            this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, []);
        }, 500));
        this._editDecorations = [];
        this._stateObs = observableValue(this, 0 /* WorkingSetEntryState.Modified */);
        this.state = this._stateObs;
        this._isCurrentlyBeingModifiedByObs = observableValue(this, undefined);
        this.isCurrentlyBeingModifiedBy = this._isCurrentlyBeingModifiedByObs;
        this.initialContent = this.originalModel.getValue();
        this._register(disposables);
        this._register(this.modifiedModel.onDidChangeContent((e) => {
            this._mirrorEdits(e);
        }));
        this._register(toDisposable(() => {
            this.clearCurrentEditLineDecoration();
        }));
        this._diffTrimWhitespace = observableConfigValue('diffEditor.ignoreTrimWhitespace', true, configService);
        this._register(autorun((r) => {
            this._diffTrimWhitespace.read(r);
            this._updateDiffInfoSeq();
        }));
    }
    clearCurrentEditLineDecoration() {
        if (this.modifiedModel.isDisposed()) {
            return;
        }
        this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, []);
    }
    _mirrorEdits(event) {
        const edit = OffsetEdits.fromContentChanges(event.changes);
        if (this._isEditFromUs) {
            const e_sum = this._edit;
            const e_ai = edit;
            this._edit = e_sum.compose(e_ai);
        }
        else {
            //           e_ai
            //   d0 ---------------> s0
            //   |                   |
            //   |                   |
            //   | e_user_r          | e_user
            //   |                   |
            //   |                   |
            //   v       e_ai_r      v
            ///  d1 ---------------> s1
            //
            // d0 - document snapshot
            // s0 - document
            // e_ai - ai edits
            // e_user - user edits
            //
            const e_ai = this._edit;
            const e_user = edit;
            const e_user_r = e_user.tryRebase(e_ai.inverse(this.originalModel.getValue()), true);
            if (e_user_r === undefined) {
                // user edits overlaps/conflicts with AI edits
                this._edit = e_ai.compose(e_user);
            }
            else {
                const edits = OffsetEdits.asEditOperations(e_user_r, this.originalModel);
                this.originalModel.applyEdits(edits);
                this._edit = e_ai.tryRebase(e_user_r);
            }
            this._allEditsAreFromUs = false;
            this._updateDiffInfoSeq();
            const didResetToOriginalContent = this.modifiedModel.getValue() === this.initialContent;
            const currentState = this._stateObs.get();
            switch (currentState) {
                case 0 /* WorkingSetEntryState.Modified */:
                    if (didResetToOriginalContent) {
                        this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
                        break;
                    }
            }
        }
    }
    acceptAgentEdits(textEdits, isLastEdits, responseModel) {
        const notebookEditor = this.notebookEditorService.retrieveExistingWidgetFromURI(this.notebookUri)?.value;
        if (notebookEditor) {
            const vm = notebookEditor.getCellByHandle(this.cell.handle);
            vm?.updateEditState(CellEditState.Editing, 'chatEdit');
        }
        const ops = textEdits.map(TextEdit.asEditOperation);
        const undoEdits = this._applyEdits(ops);
        const maxLineNumber = undoEdits.reduce((max, op) => Math.max(max, op.range.startLineNumber), 0);
        const newDecorations = [
            // decorate pending edit (region)
            {
                options: ChatEditingNotebookCellEntry_1._pendingEditDecorationOptions,
                range: new Range(maxLineNumber + 1, 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
            },
        ];
        if (maxLineNumber > 0) {
            // decorate last edit
            newDecorations.push({
                options: ChatEditingNotebookCellEntry_1._lastEditDecorationOptions,
                range: new Range(maxLineNumber, 1, maxLineNumber, Number.MAX_SAFE_INTEGER),
            });
        }
        this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, newDecorations);
        transaction((tx) => {
            if (!isLastEdits) {
                this._stateObs.set(0 /* WorkingSetEntryState.Modified */, tx);
                this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
                this._maxModifiedLineNumber.set(maxLineNumber, tx);
            }
            else {
                this._resetEditsState(tx);
                this._updateDiffInfoSeq();
                this._maxModifiedLineNumber.set(0, tx);
                this._editDecorationClear.schedule();
            }
        });
    }
    scheduleEditDecorations() {
        this._editDecorationClear.schedule();
    }
    _resetEditsState(tx) {
        this._isCurrentlyBeingModifiedByObs.set(undefined, tx);
        this._maxModifiedLineNumber.set(0, tx);
    }
    async keep(change) {
        return this._acceptHunk(change);
    }
    async _acceptHunk(change) {
        this._isEditFromUs = true;
        try {
            if (!this._diffInfo.get().changes.includes(change)) {
                // diffInfo should have model version ids and check them (instead of the caller doing that)
                return false;
            }
            const edits = [];
            for (const edit of change.innerChanges ?? []) {
                const newText = this.modifiedModel.getValueInRange(edit.modifiedRange);
                edits.push(EditOperation.replace(edit.originalRange, newText));
            }
            this.originalModel.pushEditOperations(null, edits, (_) => null);
        }
        finally {
            this._isEditFromUs = false;
        }
        await this._updateDiffInfoSeq();
        if (this._diffInfo.get().identical) {
            this._stateObs.set(1 /* WorkingSetEntryState.Accepted */, undefined);
        }
        return true;
    }
    async undo(change) {
        return this._rejectHunk(change);
    }
    async _rejectHunk(change) {
        this._isEditFromUs = true;
        try {
            if (!this._diffInfo.get().changes.includes(change)) {
                return false;
            }
            const edits = [];
            for (const edit of change.innerChanges ?? []) {
                const newText = this.originalModel.getValueInRange(edit.originalRange);
                edits.push(EditOperation.replace(edit.modifiedRange, newText));
            }
            this.modifiedModel.pushEditOperations(null, edits, (_) => null);
        }
        finally {
            this._isEditFromUs = false;
        }
        await this._updateDiffInfoSeq();
        if (this._diffInfo.get().identical) {
            this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
        }
        return true;
    }
    _applyEdits(edits) {
        // make the actual edit
        this._isEditFromUs = true;
        try {
            let result = [];
            this.modifiedModel.pushEditOperations(null, edits, (undoEdits) => {
                result = undoEdits;
                return null;
            });
            return result;
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    async _updateDiffInfoSeq() {
        const myDiffOperationId = ++this._diffOperationIds;
        await Promise.resolve(this._diffOperation);
        if (this._diffOperationIds === myDiffOperationId) {
            const thisDiffOperation = this._updateDiffInfo();
            this._diffOperation = thisDiffOperation;
            await thisDiffOperation;
        }
    }
    async _updateDiffInfo() {
        if (this.originalModel.isDisposed() || this.modifiedModel.isDisposed()) {
            return;
        }
        const docVersionNow = this.modifiedModel.getVersionId();
        const snapshotVersionNow = this.originalModel.getVersionId();
        const ignoreTrimWhitespace = this._diffTrimWhitespace.get();
        const diff = await this._editorWorkerService.computeDiff(this.originalModel.uri, this.modifiedModel.uri, { ignoreTrimWhitespace, computeMoves: false, maxComputationTimeMs: 3000 }, 'advanced');
        if (this.originalModel.isDisposed() || this.modifiedModel.isDisposed()) {
            return;
        }
        // only update the diff if the documents didn't change in the meantime
        if (this.modifiedModel.getVersionId() === docVersionNow &&
            this.originalModel.getVersionId() === snapshotVersionNow) {
            const diff2 = diff ?? nullDocumentDiff;
            this._diffInfo.set(diff2, undefined);
            this._edit = OffsetEdits.fromLineRangeMapping(this.originalModel, this.modifiedModel, diff2.changes);
        }
    }
};
ChatEditingNotebookCellEntry = ChatEditingNotebookCellEntry_1 = __decorate([
    __param(5, IConfigurationService),
    __param(6, IEditorWorkerService),
    __param(7, INotebookEditorService)
], ChatEditingNotebookCellEntry);
export { ChatEditingNotebookCellEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0NlbGxFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTm90ZWJvb2tDZWxsRW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3pFLE9BQU8sRUFBbUIsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUYsT0FBTyxFQUdOLGVBQWUsRUFDZixPQUFPLEVBQ1AsV0FBVyxHQUNYLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFN0UsT0FBTyxFQUNOLGFBQWEsR0FFYixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDckUsT0FBTyxFQUVOLGdCQUFnQixHQUNoQixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RSxPQUFPLEVBSU4saUJBQWlCLEdBQ2pCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDM0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEw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