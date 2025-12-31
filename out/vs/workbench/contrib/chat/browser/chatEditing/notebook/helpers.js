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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9ub3RlYm9vay9oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFNTix1QkFBdUIsR0FJdkIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQWlCLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXpFLE1BQU0sVUFBVSxvQ0FBb0MsQ0FDbkQsaUJBQXlCLEVBQ3pCLFlBQTZCLEVBQzdCLFVBQXlEO0lBRXpELDBDQUEwQztJQUMxQyxNQUFNLElBQUksR0FBcUI7UUFDOUIsS0FBSyxFQUFFLEVBQUU7UUFDVCxLQUFLLEVBQUUsQ0FBQztRQUNSLFFBQVEsOEJBQXNCO1FBQzlCLEtBQUssRUFBRSxpQkFBaUI7S0FDeEIsQ0FBQTtJQUNELFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNyRSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsWUFBWSxDQUFDO1NBQ3pDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxpQkFBaUIsS0FBSyxpQkFBaUIsQ0FBQyxDQUFDO1NBQ2xGLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2IsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztZQUMxRSxPQUFPO2dCQUNOLEdBQUcsSUFBSTtnQkFD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