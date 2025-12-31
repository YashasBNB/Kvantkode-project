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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0NlbGxFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9ub3RlYm9vay9jaGF0RWRpdGluZ05vdGVib29rQ2VsbEVudHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RSxPQUFPLEVBQW1CLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFGLE9BQU8sRUFHTixlQUFlLEVBQ2YsT0FBTyxFQUNQLFdBQVcsR0FDWCxNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTdFLE9BQU8sRUFDTixhQUFhLEdBRWIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3JFLE9BQU8sRUFFTixnQkFBZ0IsR0FDaEIsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkUsT0FBTyxFQUlOLGlCQUFpQixHQUNqQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FB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