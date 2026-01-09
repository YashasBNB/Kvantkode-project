/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NotebookCellsChangeType, } from '../../../../notebook/common/notebookCommon.js';
import { sortCellChanges } from './notebookCellChanges.js';
export function adjustCellDiffForKeepingADeletedCell(originalCellIndex, cellDiffInfo, applyEdits) {
    // Delete this cell from original as well.
    const edit = {
        cells: [],
        count: 1,
        editType: 1 /* CellEditType.Replace */,
        index: originalCellIndex,
    };
    applyEdits([edit], true, undefined, () => undefined, undefined, true);
    const diffs = sortCellChanges(cellDiffInfo)
        .filter((d) => !(d.type === 'delete' && d.originalCellIndex === originalCellIndex))
        .map((diff) => {
        if (diff.type !== 'insert' && diff.originalCellIndex > originalCellIndex) {
            return {
                ...diff,
                originalCellIndex: diff.originalCellIndex - 1,
            };
        }
        return diff;
    });
    return diffs;
}
export function adjustCellDiffForRevertingADeletedCell(originalCellIndex, cellDiffInfo, cellToInsert, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    const indexOfEntry = cellDiffInfo.findIndex((d) => d.originalCellIndex === originalCellIndex);
    if (indexOfEntry === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    let modifiedCellIndex = -1;
    for (let i = 0; i < cellDiffInfo.length; i++) {
        const diff = cellDiffInfo[i];
        if (i < indexOfEntry) {
            modifiedCellIndex = Math.max(modifiedCellIndex, diff.modifiedCellIndex ?? modifiedCellIndex);
            continue;
        }
        if (i === indexOfEntry) {
            const edit = {
                cells: [cellToInsert],
                count: 0,
                editType: 1 /* CellEditType.Replace */,
                index: modifiedCellIndex + 1,
            };
            applyEdits([edit], true, undefined, () => undefined, undefined, true);
            cellDiffInfo[i] = createModifiedCellDiffInfo(modifiedCellIndex + 1, originalCellIndex);
            continue;
        }
        else {
            // Increase the original index for all entries after this.
            if (typeof diff.modifiedCellIndex === 'number') {
                diff.modifiedCellIndex++;
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    return cellDiffInfo;
}
export function adjustCellDiffForRevertingAnInsertedCell(modifiedCellIndex, cellDiffInfo, applyEdits) {
    if (modifiedCellIndex === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    cellDiffInfo = sortCellChanges(cellDiffInfo)
        .filter((d) => !(d.type === 'insert' && d.modifiedCellIndex === modifiedCellIndex))
        .map((d) => {
        if (d.type === 'insert' && d.modifiedCellIndex === modifiedCellIndex) {
            return d;
        }
        if (d.type !== 'delete' && d.modifiedCellIndex > modifiedCellIndex) {
            return {
                ...d,
                modifiedCellIndex: d.modifiedCellIndex - 1,
            };
        }
        return d;
    });
    const edit = {
        cells: [],
        count: 1,
        editType: 1 /* CellEditType.Replace */,
        index: modifiedCellIndex,
    };
    applyEdits([edit], true, undefined, () => undefined, undefined, true);
    return cellDiffInfo;
}
export function adjustCellDiffForKeepingAnInsertedCell(modifiedCellIndex, cellDiffInfo, cellToInsert, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    if (modifiedCellIndex === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    const indexOfEntry = cellDiffInfo.findIndex((d) => d.modifiedCellIndex === modifiedCellIndex);
    if (indexOfEntry === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    let originalCellIndex = -1;
    for (let i = 0; i < cellDiffInfo.length; i++) {
        const diff = cellDiffInfo[i];
        if (i < indexOfEntry) {
            originalCellIndex = Math.max(originalCellIndex, diff.originalCellIndex ?? originalCellIndex);
            continue;
        }
        if (i === indexOfEntry) {
            const edit = {
                cells: [cellToInsert],
                count: 0,
                editType: 1 /* CellEditType.Replace */,
                index: originalCellIndex + 1,
            };
            applyEdits([edit], true, undefined, () => undefined, undefined, true);
            cellDiffInfo[i] = createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex + 1);
            continue;
        }
        else {
            // Increase the original index for all entries after this.
            if (typeof diff.originalCellIndex === 'number') {
                diff.originalCellIndex++;
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    return cellDiffInfo;
}
export function adjustCellDiffAndOriginalModelBasedOnCellAddDelete(change, cellDiffInfo, modifiedModelCellCount, originalModelCellCount, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    const numberOfCellsInserted = change[2].length;
    const numberOfCellsDeleted = change[1];
    const cells = change[2].map((cell) => {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            metadata: cell.metadata,
            outputs: cell.outputs,
            source: cell.getValue(),
            mime: undefined,
            internalMetadata: cell.internalMetadata,
        };
    });
    let diffEntryIndex = -1;
    let indexToInsertInOriginalModel = undefined;
    if (cells.length) {
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (typeof diff.modifiedCellIndex === 'number' && diff.modifiedCellIndex === change[0]) {
                diffEntryIndex = i;
                if (typeof diff.originalCellIndex === 'number') {
                    indexToInsertInOriginalModel = diff.originalCellIndex;
                }
                break;
            }
            if (typeof diff.originalCellIndex === 'number') {
                indexToInsertInOriginalModel = diff.originalCellIndex + 1;
            }
        }
        const edit = {
            editType: 1 /* CellEditType.Replace */,
            cells,
            index: indexToInsertInOriginalModel ?? 0,
            count: change[1],
        };
        applyEdits([edit], true, undefined, () => undefined, undefined, true);
    }
    // If cells were deleted we handled that with this.disposeDeletedCellEntries();
    if (numberOfCellsDeleted) {
        // Adjust the indexes.
        let numberOfOriginalCellsRemovedSoFar = 0;
        let numberOfModifiedCellsRemovedSoFar = 0;
        const modifiedIndexesToRemove = new Set();
        for (let i = 0; i < numberOfCellsDeleted; i++) {
            modifiedIndexesToRemove.add(change[0] + i);
        }
        const itemsToRemove = new Set();
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (i < diffEntryIndex) {
                continue;
            }
            let changed = false;
            if (typeof diff.modifiedCellIndex === 'number' &&
                modifiedIndexesToRemove.has(diff.modifiedCellIndex)) {
                // This will be removed.
                numberOfModifiedCellsRemovedSoFar++;
                if (typeof diff.originalCellIndex === 'number') {
                    numberOfOriginalCellsRemovedSoFar++;
                }
                itemsToRemove.add(diff);
                continue;
            }
            if (typeof diff.modifiedCellIndex === 'number' && numberOfModifiedCellsRemovedSoFar) {
                diff.modifiedCellIndex -= numberOfModifiedCellsRemovedSoFar;
                changed = true;
            }
            if (typeof diff.originalCellIndex === 'number' && numberOfOriginalCellsRemovedSoFar) {
                diff.originalCellIndex -= numberOfOriginalCellsRemovedSoFar;
                changed = true;
            }
            if (changed) {
                cellDiffInfo[i] = { ...diff };
            }
        }
        if (itemsToRemove.size) {
            Array.from(itemsToRemove)
                .filter((diff) => typeof diff.originalCellIndex === 'number')
                .forEach((diff) => {
                const edit = {
                    editType: 1 /* CellEditType.Replace */,
                    cells: [],
                    index: diff.originalCellIndex,
                    count: 1,
                };
                applyEdits([edit], true, undefined, () => undefined, undefined, true);
            });
        }
        cellDiffInfo = cellDiffInfo.filter((d) => !itemsToRemove.has(d));
    }
    if (numberOfCellsInserted && diffEntryIndex >= 0) {
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (i < diffEntryIndex) {
                continue;
            }
            let changed = false;
            if (typeof diff.modifiedCellIndex === 'number') {
                diff.modifiedCellIndex += numberOfCellsInserted;
                changed = true;
            }
            if (typeof diff.originalCellIndex === 'number') {
                diff.originalCellIndex += numberOfCellsInserted;
                changed = true;
            }
            if (changed) {
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    // For inserted cells, we need to ensure that we create a corresponding CellEntry.
    // So that any edits to the inserted cell is handled and mirrored over to the corresponding cell in original model.
    cells.forEach((_, i) => {
        const originalCellIndex = i + (indexToInsertInOriginalModel ?? 0);
        const modifiedCellIndex = change[0] + i;
        const unchangedCell = createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex);
        cellDiffInfo.splice((diffEntryIndex === -1 ? cellDiffInfo.length : diffEntryIndex) + i, 0, unchangedCell);
    });
    return cellDiffInfo;
}
/**
 * Given the movements of cells in modified notebook, adjust the ICellDiffInfo[] array
 * and generate edits for the old notebook (if required).
 * TODO@DonJayamanne Handle bulk moves (movements of more than 1 cell).
 */
export function adjustCellDiffAndOriginalModelBasedOnCellMovements(event, cellDiffInfo) {
    const minimumIndex = Math.min(event.index, event.newIdx);
    const maximumIndex = Math.max(event.index, event.newIdx);
    const cellDiffs = cellDiffInfo.slice();
    const indexOfEntry = cellDiffs.findIndex((d) => d.modifiedCellIndex === event.index);
    const indexOfEntryToPlaceBelow = cellDiffs.findIndex((d) => d.modifiedCellIndex === event.newIdx);
    if (indexOfEntry === -1 || indexOfEntryToPlaceBelow === -1) {
        return undefined;
    }
    // Create a new object so that the observable value is triggered.
    // Besides we'll be updating the values of this object in place.
    const entryToBeMoved = { ...cellDiffs[indexOfEntry] };
    const moveDirection = event.newIdx > event.index ? 'down' : 'up';
    const startIndex = cellDiffs.findIndex((d) => d.modifiedCellIndex === minimumIndex);
    const endIndex = cellDiffs.findIndex((d) => d.modifiedCellIndex === maximumIndex);
    const movingExistingCell = typeof entryToBeMoved.originalCellIndex === 'number';
    let originalCellsWereEffected = false;
    for (let i = 0; i < cellDiffs.length; i++) {
        const diff = cellDiffs[i];
        let changed = false;
        if (moveDirection === 'down') {
            if (i > startIndex && i <= endIndex) {
                if (typeof diff.modifiedCellIndex === 'number') {
                    changed = true;
                    diff.modifiedCellIndex = diff.modifiedCellIndex - 1;
                }
                if (typeof diff.originalCellIndex === 'number' && movingExistingCell) {
                    diff.originalCellIndex = diff.originalCellIndex - 1;
                    originalCellsWereEffected = true;
                    changed = true;
                }
            }
        }
        else {
            if (i >= startIndex && i < endIndex) {
                if (typeof diff.modifiedCellIndex === 'number') {
                    changed = true;
                    diff.modifiedCellIndex = diff.modifiedCellIndex + 1;
                }
                if (typeof diff.originalCellIndex === 'number' && movingExistingCell) {
                    diff.originalCellIndex = diff.originalCellIndex + 1;
                    originalCellsWereEffected = true;
                    changed = true;
                }
            }
        }
        // Create a new object so that the observable value is triggered.
        // Do only if there's a change.
        if (changed) {
            cellDiffs[i] = { ...diff };
        }
    }
    entryToBeMoved.modifiedCellIndex = event.newIdx;
    const originalCellIndex = entryToBeMoved.originalCellIndex;
    if (moveDirection === 'down') {
        cellDiffs.splice(endIndex + 1, 0, entryToBeMoved);
        cellDiffs.splice(startIndex, 1);
        // If we're moving a new cell up/down, then we need just adjust just the modified indexes of the cells in between.
        // If we're moving an existing up/down, then we need to adjust the original indexes as well.
        if (typeof entryToBeMoved.originalCellIndex === 'number') {
            entryToBeMoved.originalCellIndex =
                cellDiffs
                    .slice(0, endIndex)
                    .reduce((lastOriginalIndex, diff) => typeof diff.originalCellIndex === 'number'
                    ? Math.max(lastOriginalIndex, diff.originalCellIndex)
                    : lastOriginalIndex, -1) + 1;
        }
    }
    else {
        cellDiffs.splice(endIndex, 1);
        cellDiffs.splice(startIndex, 0, entryToBeMoved);
        // If we're moving a new cell up/down, then we need just adjust just the modified indexes of the cells in between.
        // If we're moving an existing up/down, then we need to adjust the original indexes as well.
        if (typeof entryToBeMoved.originalCellIndex === 'number') {
            entryToBeMoved.originalCellIndex =
                cellDiffs
                    .slice(0, startIndex)
                    .reduce((lastOriginalIndex, diff) => typeof diff.originalCellIndex === 'number'
                    ? Math.max(lastOriginalIndex, diff.originalCellIndex)
                    : lastOriginalIndex, -1) + 1;
        }
    }
    // If this is a new cell that we're moving, and there are no existing cells in between, then we can just move the new cell.
    // I.e. no need to update the original notebook model.
    if (typeof entryToBeMoved.originalCellIndex === 'number' &&
        originalCellsWereEffected &&
        typeof originalCellIndex === 'number' &&
        entryToBeMoved.originalCellIndex !== originalCellIndex) {
        const edit = {
            editType: 6 /* CellEditType.Move */,
            index: originalCellIndex,
            length: event.length,
            newIdx: entryToBeMoved.originalCellIndex,
        };
        return [cellDiffs, [edit]];
    }
    return [cellDiffs, []];
}
export function getCorrespondingOriginalCellIndex(modifiedCellIndex, cellDiffInfo) {
    const entry = cellDiffInfo.find((d) => d.modifiedCellIndex === modifiedCellIndex);
    return entry?.originalCellIndex;
}
/**
 *
 * This isn't great, but necessary.
 * ipynb extension updates metadata when new cells are inserted (to ensure the metadata is correct)
 * Details of why thats required is in ipynb extension, but its necessary.
 * However as a result of this, those edits appear here and are assumed to be user edits.
 * As a result `_allEditsAreFromUs` is set to false.
 */
export function isTransientIPyNbExtensionEvent(notebookKind, e) {
    if (notebookKind !== 'jupyter-notebook') {
        return false;
    }
    if (e.rawEvents.every((event) => {
        if (event.kind !== NotebookCellsChangeType.ChangeCellMetadata) {
            return false;
        }
        if (JSON.stringify(event.metadata || {}) ===
            JSON.stringify({ execution_count: null, metadata: {} })) {
            return true;
        }
        return true;
    })) {
        return true;
    }
    return false;
}
export function calculateNotebookRewriteRatio(cellsDiff, originalModel, modifiedModel) {
    const totalNumberOfUpdatedLines = cellsDiff.reduce((totalUpdatedLines, value) => {
        const getUpadtedLineCount = () => {
            if (value.type === 'unchanged') {
                return 0;
            }
            if (value.type === 'delete') {
                return originalModel.cells[value.originalCellIndex].textModel?.getLineCount() ?? 0;
            }
            if (value.type === 'insert') {
                return modifiedModel.cells[value.modifiedCellIndex].textModel?.getLineCount() ?? 0;
            }
            return value.diff.get().changes.reduce((maxLineNumber, change) => {
                return Math.max(maxLineNumber, change.modified.endLineNumberExclusive);
            }, 0);
        };
        return totalUpdatedLines + getUpadtedLineCount();
    }, 0);
    const totalNumberOfLines = modifiedModel.cells.reduce((totalLines, cell) => totalLines + (cell.textModel?.getLineCount() ?? 0), 0);
    return totalNumberOfLines === 0 ? 0 : Math.min(1, totalNumberOfUpdatedLines / totalNumberOfLines);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQU1OLHVCQUF1QixHQUl2QixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBaUIsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFekUsTUFBTSxVQUFVLG9DQUFvQyxDQUNuRCxpQkFBeUIsRUFDekIsWUFBNkIsRUFDN0IsVUFBeUQ7SUFFekQsMENBQTBDO0lBQzFDLE1BQU0sSUFBSSxHQUFxQjtRQUM5QixLQUFLLEVBQUUsRUFBRTtRQUNULEtBQUssRUFBRSxDQUFDO1FBQ1IsUUFBUSw4QkFBc0I7UUFDOUIsS0FBSyxFQUFFLGlCQUFpQjtLQUN4QixDQUFBO0lBQ0QsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3JFLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxZQUFZLENBQUM7U0FDekMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLGlCQUFpQixLQUFLLGlCQUFpQixDQUFDLENBQUM7U0FDbEYsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDYixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO1lBQzFFLE9B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