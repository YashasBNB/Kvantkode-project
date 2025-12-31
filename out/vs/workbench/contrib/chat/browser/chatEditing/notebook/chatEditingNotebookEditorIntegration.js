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
import { Disposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent, observableValue, } from '../../../../../../base/common/observable.js';
import { debouncedObservable } from '../../../../../../base/common/observableInternal/utils.js';
import { basename } from '../../../../../../base/common/resources.js';
import { assertType } from '../../../../../../base/common/types.js';
import { LineRange } from '../../../../../../editor/common/core/lineRange.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../../editor/common/diff/documentDiffProvider.js';
import { localize } from '../../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { NotebookDeletedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookDeletedCellDecorator.js';
import { NotebookInsertedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookInsertedCellDecorator.js';
import { NotebookModifiedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookModifiedCellDecorator.js';
import { getNotebookEditorFromEditorPane, } from '../../../../notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../../../notebook/browser/services/notebookEditorService.js';
import { CellKind } from '../../../../notebook/common/notebookCommon.js';
import { IChatAgentService } from '../../../common/chatAgents.js';
import { ChatAgentLocation } from '../../../common/constants.js';
import { ChatEditingCodeEditorIntegration, } from '../chatEditingCodeEditorIntegration.js';
import { countChanges, sortCellChanges } from './notebookCellChanges.js';
let ChatEditingNotebookEditorIntegration = class ChatEditingNotebookEditorIntegration extends Disposable {
    constructor(_entry, editor, notebookModel, originalModel, cellChanges, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        const notebookEditor = getNotebookEditorFromEditorPane(editor);
        assertType(notebookEditor);
        this.notebookEditor = notebookEditor;
        this.integration = this.instantiationService.createInstance(ChatEditingNotebookEditorWidgetIntegration, _entry, notebookEditor, notebookModel, originalModel, cellChanges);
        this._register(editor.onDidChangeControl(() => {
            const notebookEditor = getNotebookEditorFromEditorPane(editor);
            if (notebookEditor && notebookEditor !== this.notebookEditor) {
                this.notebookEditor = notebookEditor;
                this.integration.dispose();
                this.integration = this.instantiationService.createInstance(ChatEditingNotebookEditorWidgetIntegration, _entry, notebookEditor, notebookModel, originalModel, cellChanges);
            }
        }));
    }
    get currentIndex() {
        return this.integration.currentIndex;
    }
    reveal(firstOrLast) {
        return this.integration.reveal(firstOrLast);
    }
    next(wrap) {
        return this.integration.next(wrap);
    }
    previous(wrap) {
        return this.integration.previous(wrap);
    }
    enableAccessibleDiffView() {
        this.integration.enableAccessibleDiffView();
    }
    acceptNearestChange(change) {
        this.integration.acceptNearestChange(change);
    }
    rejectNearestChange(change) {
        this.integration.rejectNearestChange(change);
    }
    toggleDiff(change) {
        return this.integration.toggleDiff(change);
    }
    dispose() {
        this.integration.dispose();
        super.dispose();
    }
};
ChatEditingNotebookEditorIntegration = __decorate([
    __param(5, IInstantiationService)
], ChatEditingNotebookEditorIntegration);
export { ChatEditingNotebookEditorIntegration };
let ChatEditingNotebookEditorWidgetIntegration = class ChatEditingNotebookEditorWidgetIntegration extends Disposable {
    constructor(_entry, notebookEditor, notebookModel, originalModel, cellChanges, instantiationService, _editorService, _chatAgentService, notebookEditorService, accessibilitySignalService) {
        super();
        this._entry = _entry;
        this.notebookEditor = notebookEditor;
        this.notebookModel = notebookModel;
        this.cellChanges = cellChanges;
        this.instantiationService = instantiationService;
        this._editorService = _editorService;
        this._chatAgentService = _chatAgentService;
        this.accessibilitySignalService = accessibilitySignalService;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this._currentChange = observableValue(this, undefined);
        this.currentChange = this._currentChange;
        this.cellEditorIntegrations = new Map();
        this.mdCellEditorAttached = observableValue(this, -1);
        this.markupCellListeners = new Map();
        const onDidChangeVisibleRanges = debouncedObservable(observableFromEvent(notebookEditor.onDidChangeVisibleRanges, () => notebookEditor.visibleRanges), 50);
        this._register(toDisposable(() => {
            this.markupCellListeners.forEach((v) => v.dispose());
        }));
        let originalReadonly = undefined;
        const shouldBeReadonly = _entry.isCurrentlyBeingModifiedBy.map((value) => !!value);
        this._register(autorun((r) => {
            const isReadOnly = shouldBeReadonly.read(r);
            const notebookEditor = notebookEditorService.retrieveExistingWidgetFromURI(_entry.modifiedURI)?.value;
            if (!notebookEditor) {
                return;
            }
            originalReadonly ??= notebookEditor.isReadOnly;
            if (isReadOnly) {
                notebookEditor.setOptions({ isReadOnly: true });
            }
            else if (originalReadonly === false) {
                notebookEditor.setOptions({ isReadOnly: false });
                // Ensure all cells area editable.
                // We make use of chatEditingCodeEditorIntegration to handle cell diffing and navigation.
                // However that also makes the cell read-only. We need to ensure that the cell is editable.
                // E.g. first we make notebook readonly (in here), then cells end up being readonly because notebook is readonly.
                // Then chatEditingCodeEditorIntegration makes cells readonly and keeps track of the original readonly state.
                // However the cell is already readonly because the notebook is readonly.
                // So when we restore the notebook to editable (in here), the cell is made editable again.
                // But when chatEditingCodeEditorIntegration attempts to restore, it will restore the original readonly state.
                // & from the perpspective of chatEditingCodeEditorIntegration, the cell was readonly & should continue to be readonly.
                // To get around this, we wait for a few ms before restoring the original readonly state for each cell.
                const timeout = setTimeout(() => {
                    notebookEditor.setOptions({ isReadOnly: true });
                    notebookEditor.setOptions({ isReadOnly: false });
                    disposable.dispose();
                }, 100);
                const disposable = toDisposable(() => clearTimeout(timeout));
                this._register(disposable);
            }
        }));
        // INIT when not streaming nor diffing the response anymore, once per request, and when having changes
        let lastModifyingRequestId;
        this._store.add(autorun((r) => {
            if (!_entry.isCurrentlyBeingModifiedBy.read(r) &&
                !_entry.isProcessingResponse.read(r) &&
                lastModifyingRequestId !== _entry.lastModifyingRequestId &&
                cellChanges.read(r).some((c) => c.type !== 'unchanged' && !c.diff.read(r).identical)) {
                lastModifyingRequestId = _entry.lastModifyingRequestId;
                this.reveal(true);
            }
        }));
        // Build cell integrations (responsible for navigating changes within a cell and decorating cell text changes)
        this._register(autorun((r) => {
            if (this.notebookEditor.textModel !== this.notebookModel) {
                return;
            }
            const sortedCellChanges = sortCellChanges(cellChanges.read(r));
            const changes = sortedCellChanges.filter((c) => c.type !== 'delete');
            onDidChangeVisibleRanges.read(r);
            if (!changes.length) {
                this.cellEditorIntegrations.forEach(({ diff }) => {
                    diff.set({ ...diff.get(), ...nullDocumentDiff }, undefined);
                });
                return;
            }
            this.mdCellEditorAttached.read(r);
            const validCells = new Set();
            changes.forEach((change) => {
                if (change.modifiedCellIndex === undefined ||
                    change.modifiedCellIndex >= notebookModel.cells.length) {
                    return;
                }
                const cell = notebookModel.cells[change.modifiedCellIndex];
                const editor = notebookEditor.codeEditors.find(([vm]) => vm.handle === notebookModel.cells[change.modifiedCellIndex].handle)?.[1];
                const modifiedModel = change.modifiedModel.promiseResult.read(r)?.data;
                const originalModel = change.originalModel.promiseResult.read(r)?.data;
                if (!cell || !originalModel || !modifiedModel) {
                    return;
                }
                if (!editor) {
                    if (!this.markupCellListeners.has(cell.handle) && cell.cellKind === CellKind.Markup) {
                        const cellModel = this.notebookEditor
                            .getViewModel()
                            ?.viewCells.find((c) => c.handle === cell.handle);
                        if (cellModel) {
                            const listener = cellModel.onDidChangeEditorAttachState(() => {
                                if (cellModel.editorAttached) {
                                    this.mdCellEditorAttached.set(cell.handle, undefined);
                                    listener.dispose();
                                    this.markupCellListeners.delete(cell.handle);
                                }
                            });
                            this.markupCellListeners.set(cell.handle, listener);
                        }
                    }
                    return;
                }
                const diff = {
                    ...change.diff.read(r),
                    modifiedModel,
                    originalModel,
                    keep: change.keep,
                    undo: change.undo,
                };
                validCells.add(cell);
                const currentDiff = this.cellEditorIntegrations.get(cell);
                if (currentDiff) {
                    // Do not unnecessarily trigger a change event
                    if (!areDocumentDiff2Equal(currentDiff.diff.get(), diff)) {
                        currentDiff.diff.set(diff, undefined);
                    }
                }
                else {
                    const diff2 = observableValue(`diff${cell.handle}`, diff);
                    const integration = this.instantiationService.createInstance(ChatEditingCodeEditorIntegration, _entry, editor, diff2);
                    this.cellEditorIntegrations.set(cell, { integration, diff: diff2 });
                    this._register(integration);
                    this._register(editor.onDidDispose(() => {
                        this.cellEditorIntegrations.get(cell)?.integration.dispose();
                        this.cellEditorIntegrations.delete(cell);
                    }));
                    this._register(editor.onDidChangeModel(() => {
                        if (editor.getModel() !== cell.textModel) {
                            this.cellEditorIntegrations.get(cell)?.integration.dispose();
                            this.cellEditorIntegrations.delete(cell);
                        }
                    }));
                }
            });
            // Dispose old integrations as the editors are no longer valid.
            this.cellEditorIntegrations.forEach((v, cell) => {
                if (!validCells.has(cell)) {
                    v.integration.dispose();
                    this.cellEditorIntegrations.delete(cell);
                }
            });
        }));
        this._register(autorun((r) => {
            const currentChange = this.currentChange.read(r);
            if (!currentChange) {
                this._currentIndex.set(-1, undefined);
                return;
            }
            let index = 0;
            const sortedCellChanges = sortCellChanges(cellChanges.read(r));
            for (const change of sortedCellChanges) {
                if (currentChange && currentChange.change === change) {
                    if (change.type === 'modified') {
                        index += currentChange.index;
                    }
                    break;
                }
                if (change.type === 'insert' || change.type === 'delete') {
                    index++;
                }
                else if (change.type === 'modified') {
                    index += change.diff.read(r).changes.length;
                }
            }
            this._currentIndex.set(index, undefined);
        }));
        const cellsAreVisible = onDidChangeVisibleRanges.map((v) => v.length > 0);
        const debouncedChanges = debouncedObservable(cellChanges, 10);
        this._register(autorun((r) => {
            if (this.notebookEditor.textModel !== this.notebookModel ||
                !cellsAreVisible.read(r) ||
                !this.notebookEditor.getViewModel()) {
                return;
            }
            // We can have inserted cells that have been accepted, in those cases we do not want any decorators on them.
            const changes = debouncedChanges
                .read(r)
                .filter((c) => (c.type === 'insert' ? !c.diff.read(r).identical : true));
            const modifiedChanges = changes.filter((c) => c.type === 'modified');
            this.createDecorators();
            this.insertedCellDecorator?.apply(changes);
            this.modifiedCellDecorator?.apply(modifiedChanges);
            this.deletedCellDecorator?.apply(changes, originalModel);
        }));
    }
    createDecorators() {
        const cellChanges = this.cellChanges.get();
        const accessibilitySignalService = this.accessibilitySignalService;
        this.insertedCellDecorator ??= this._register(this.instantiationService.createInstance(NotebookInsertedCellDecorator, this.notebookEditor));
        this.modifiedCellDecorator ??= this._register(this.instantiationService.createInstance(NotebookModifiedCellDecorator, this.notebookEditor));
        if (this.deletedCellDecorator) {
            this._store.delete(this.deletedCellDecorator);
            this.deletedCellDecorator.dispose();
        }
        this.deletedCellDecorator = this._register(this.instantiationService.createInstance(NotebookDeletedCellDecorator, this.notebookEditor, {
            className: 'chat-diff-change-content-widget',
            telemetrySource: 'chatEditingNotebookHunk',
            menuId: MenuId.ChatEditingEditorHunk,
            argFactory: (deletedCellIndex) => {
                return {
                    accept() {
                        const entry = cellChanges.find((c) => c.type === 'delete' && c.originalCellIndex === deletedCellIndex);
                        if (entry) {
                            return entry.keep(entry.diff.get().changes[0]);
                        }
                        accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, {
                            allowManyInParallel: true,
                        });
                        return Promise.resolve(true);
                    },
                    reject() {
                        const entry = cellChanges.find((c) => c.type === 'delete' && c.originalCellIndex === deletedCellIndex);
                        if (entry) {
                            return entry.undo(entry.diff.get().changes[0]);
                        }
                        accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, {
                            allowManyInParallel: true,
                        });
                        return Promise.resolve(true);
                    },
                };
            },
        }));
    }
    getCell(modifiedCellIndex) {
        const cell = this.notebookModel.cells[modifiedCellIndex];
        const integration = this.cellEditorIntegrations.get(cell)?.integration;
        return integration;
    }
    reveal(firstOrLast) {
        const changes = sortCellChanges(this.cellChanges.get().filter((c) => c.type !== 'unchanged'));
        if (!changes.length) {
            return undefined;
        }
        const change = firstOrLast ? changes[0] : changes[changes.length - 1];
        this._revealFirstOrLast(change, firstOrLast);
    }
    _revealFirstOrLast(change, firstOrLast = true) {
        switch (change.type) {
            case 'insert':
            case 'modified': {
                const index = firstOrLast || change.type === 'insert' ? 0 : change.diff.get().changes.length - 1;
                const cellIntegration = this.getCell(change.modifiedCellIndex);
                if (cellIntegration) {
                    cellIntegration.reveal(firstOrLast);
                    this._currentChange.set({ change: change, index }, undefined);
                    return true;
                }
                else {
                    return this._revealChange(change, index);
                }
            }
            case 'delete':
                // reveal the deleted cell decorator
                this.deletedCellDecorator?.reveal(change.originalCellIndex);
                this._currentChange.set({ change: change, index: 0 }, undefined);
                return true;
            default:
                break;
        }
        return false;
    }
    _revealChange(change, indexInCell) {
        switch (change.type) {
            case 'insert':
            case 'modified': {
                const textChange = change.diff.get().changes[indexInCell];
                const cellViewModel = this.getCellViewModel(change);
                if (cellViewModel) {
                    this.revealChangeInView(cellViewModel, textChange?.modified);
                    this._currentChange.set({ change: change, index: indexInCell }, undefined);
                }
                return true;
            }
            case 'delete':
                // reveal the deleted cell decorator
                this.deletedCellDecorator?.reveal(change.originalCellIndex);
                this._currentChange.set({ change: change, index: 0 }, undefined);
                return true;
            default:
                break;
        }
        return false;
    }
    getCellViewModel(change) {
        if (change.type === 'delete' || change.modifiedCellIndex === undefined) {
            return undefined;
        }
        const cell = this.notebookModel.cells[change.modifiedCellIndex];
        const cellViewModel = this.notebookEditor
            .getViewModel()
            ?.viewCells.find((c) => c.handle === cell.handle);
        return cellViewModel;
    }
    async revealChangeInView(cell, lines) {
        const targetLines = lines ?? new LineRange(0, 0);
        await this.notebookEditor.focusNotebookCell(cell, 'container', {
            focusEditorLine: targetLines.startLineNumber,
        });
        await this.notebookEditor.revealRangeInCenterAsync(cell, new Range(targetLines.startLineNumber, 0, targetLines.endLineNumberExclusive, 0));
    }
    next(wrap) {
        const changes = sortCellChanges(this.cellChanges.get().filter((c) => c.type !== 'unchanged'));
        const currentChange = this.currentChange.get();
        if (!currentChange) {
            const firstChange = changes[0];
            if (firstChange) {
                return this._revealFirstOrLast(firstChange);
            }
            return false;
        }
        // go to next
        // first check if we are at the end of the current change
        switch (currentChange.change.type) {
            case 'modified':
                {
                    const cellIntegration = this.getCell(currentChange.change.modifiedCellIndex);
                    if (cellIntegration) {
                        if (cellIntegration.next(false)) {
                            this._currentChange.set({ change: currentChange.change, index: cellIntegration.currentIndex.get() }, undefined);
                            return true;
                        }
                    }
                    const isLastChangeInCell = currentChange.index === lastChangeIndex(currentChange.change);
                    const index = isLastChangeInCell ? 0 : currentChange.index + 1;
                    const change = isLastChangeInCell
                        ? changes[changes.indexOf(currentChange.change) + 1]
                        : currentChange.change;
                    if (change) {
                        return this._revealChange(change, index);
                    }
                }
                break;
            case 'insert':
            case 'delete':
                {
                    // go to next change directly
                    const nextChange = changes[changes.indexOf(currentChange.change) + 1];
                    if (nextChange) {
                        return this._revealFirstOrLast(nextChange, true);
                    }
                }
                break;
            default:
                break;
        }
        if (wrap) {
            return this.next(false);
        }
        return false;
    }
    previous(wrap) {
        const changes = sortCellChanges(this.cellChanges.get().filter((c) => c.type !== 'unchanged'));
        const currentChange = this.currentChange.get();
        if (!currentChange) {
            const lastChange = changes[changes.length - 1];
            if (lastChange) {
                return this._revealFirstOrLast(lastChange, false);
            }
            return false;
        }
        // go to previous
        // first check if we are at the start of the current change
        switch (currentChange.change.type) {
            case 'modified':
                {
                    const cellIntegration = this.getCell(currentChange.change.modifiedCellIndex);
                    if (cellIntegration) {
                        if (cellIntegration.previous(false)) {
                            this._currentChange.set({ change: currentChange.change, index: cellIntegration.currentIndex.get() }, undefined);
                            return true;
                        }
                    }
                    const isFirstChangeInCell = currentChange.index === 0;
                    const change = isFirstChangeInCell
                        ? changes[changes.indexOf(currentChange.change) - 1]
                        : currentChange.change;
                    if (change) {
                        const index = isFirstChangeInCell ? lastChangeIndex(change) : currentChange.index - 1;
                        return this._revealChange(change, index);
                    }
                }
                break;
            case 'insert':
            case 'delete':
                {
                    // go to previous change directly
                    const prevChange = changes[changes.indexOf(currentChange.change) - 1];
                    if (prevChange) {
                        return this._revealFirstOrLast(prevChange, false);
                    }
                }
                break;
            default:
                break;
        }
        if (wrap) {
            const lastChange = changes[changes.length - 1];
            if (lastChange) {
                return this._revealFirstOrLast(lastChange, false);
            }
        }
        return false;
    }
    enableAccessibleDiffView() {
        const cell = this.notebookEditor.getActiveCell()?.model;
        if (cell) {
            const integration = this.cellEditorIntegrations.get(cell)?.integration;
            integration?.enableAccessibleDiffView();
        }
    }
    acceptNearestChange(change) {
        change.accept();
        this.next(true);
    }
    rejectNearestChange(change) {
        change.reject();
        this.next(true);
    }
    async toggleDiff(_change) {
        const defaultAgentName = this._chatAgentService.getDefaultAgent(ChatAgentLocation.EditingSession)?.fullName;
        const diffInput = {
            original: { resource: this._entry.originalURI, options: { selection: undefined } },
            modified: { resource: this._entry.modifiedURI, options: { selection: undefined } },
            label: defaultAgentName
                ? localize('diff.agent', '{0} (changes from {1})', basename(this._entry.modifiedURI), defaultAgentName)
                : localize('diff.generic', '{0} (changes from chat)', basename(this._entry.modifiedURI)),
        };
        await this._editorService.openEditor(diffInput);
    }
};
ChatEditingNotebookEditorWidgetIntegration = __decorate([
    __param(5, IInstantiationService),
    __param(6, IEditorService),
    __param(7, IChatAgentService),
    __param(8, INotebookEditorService),
    __param(9, IAccessibilitySignalService)
], ChatEditingNotebookEditorWidgetIntegration);
export class ChatEditingNotebookDiffEditorIntegration extends Disposable {
    constructor(notebookDiffEditor, cellChanges) {
        super();
        this.notebookDiffEditor = notebookDiffEditor;
        this.cellChanges = cellChanges;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this._store.add(autorun((r) => {
            const index = notebookDiffEditor.currentChangedIndex.read(r);
            const numberOfCellChanges = cellChanges.read(r).filter((c) => !c.diff.read(r).identical);
            if (numberOfCellChanges.length && index >= 0 && index < numberOfCellChanges.length) {
                // Notebook Diff editor only supports navigating through changes to cells.
                // However in chat we take changes to lines in the cells into account.
                // So if we're on the second cell and first cell has 3 changes, then we're on the 4th change.
                const changesSoFar = countChanges(numberOfCellChanges.slice(0, index + 1));
                this._currentIndex.set(changesSoFar - 1, undefined);
            }
            else {
                this._currentIndex.set(-1, undefined);
            }
        }));
    }
    reveal(firstOrLast) {
        const changes = sortCellChanges(this.cellChanges.get().filter((c) => c.type !== 'unchanged'));
        if (!changes.length) {
            return undefined;
        }
        if (firstOrLast) {
            this.notebookDiffEditor.firstChange();
        }
        else {
            this.notebookDiffEditor.lastChange();
        }
    }
    next(_wrap) {
        const changes = this.cellChanges.get().filter((c) => !c.diff.get().identical).length;
        if (this.notebookDiffEditor.currentChangedIndex.get() === changes - 1) {
            return false;
        }
        this.notebookDiffEditor.nextChange();
        return true;
    }
    previous(_wrap) {
        const changes = this.cellChanges.get().filter((c) => !c.diff.get().identical).length;
        if (this.notebookDiffEditor.currentChangedIndex.get() === changes - 1) {
            return false;
        }
        this.notebookDiffEditor.nextChange();
        return true;
    }
    enableAccessibleDiffView() {
        //
    }
    acceptNearestChange(change) {
        change.accept();
        this.next(true);
    }
    rejectNearestChange(change) {
        change.reject();
        this.next(true);
    }
    async toggleDiff(_change) {
        //
    }
}
function areDocumentDiff2Equal(diff1, diff2) {
    if (diff1.changes !== diff2.changes) {
        return false;
    }
    if (diff1.identical !== diff2.identical) {
        return false;
    }
    if (diff1.moves !== diff2.moves) {
        return false;
    }
    if (diff1.originalModel !== diff2.originalModel) {
        return false;
    }
    if (diff1.modifiedModel !== diff2.modifiedModel) {
        return false;
    }
    if (diff1.keep !== diff2.keep) {
        return false;
    }
    if (diff1.undo !== diff2.undo) {
        return false;
    }
    if (diff1.quitEarly !== diff2.quitEarly) {
        return false;
    }
    return true;
}
function lastChangeIndex(change) {
    if (change.type === 'modified') {
        return change.diff.get().changes.length - 1;
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0VkaXRvckludGVncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTm90ZWJvb2tFZGl0b3JJbnRlZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xHLE9BQU8sRUFDTixPQUFPLEVBR1AsbUJBQW1CLEVBQ25CLGVBQWUsR0FDZixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxzRkFBc0YsQ0FBQTtBQUM3RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFeEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3ZGLE9B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