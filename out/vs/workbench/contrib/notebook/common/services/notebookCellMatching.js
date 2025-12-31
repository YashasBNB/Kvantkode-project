/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { computeLevenshteinDistance } from '../../../../../base/common/diff/diff.js';
/**
 * Given a set of modified cells and original cells, this function will attempt to match the modified cells with the original cells.
 * E.g. Assume you have (original on left and modified on right):
 * =================
 * Cell A  | Cell a
 * Cell B  | Cell b
 * Cell C  | Cell d
 * Cell D  | Cell e
 * =================
 * Here we know that `Cell C` has been removed and `Cell e` has been added.
 * The mapping from modified to original will be as follows:
 * Cell a => Cell A
 * Cell b => Cell B
 * Cell d => Cell D
 * Cell e => <Does not match anything in original, hence a new Cell>
 * Cell C in original was not matched, hence it was deleted.
 *
 * Thus the return value is as follows:
 * [
 * { modified: 0, original: 0 },
 * { modified: 1, original: 1 },
 * { modified: 2, original: 3 },
 * { modified: 3, original: -1 },
 * ]
 * @returns
 */
export function matchCellBasedOnSimilarties(modifiedCells, originalCells) {
    const cache = {
        modifiedToOriginal: new Map(),
        originalToModified: new Map(),
    };
    const results = [];
    const mappedOriginalCellToModifiedCell = new Map();
    const mappedModifiedIndexes = new Set();
    const originalIndexWithMostEdits = new Map();
    const canOriginalIndexBeMappedToModifiedIndex = (originalIndex, value) => {
        if (mappedOriginalCellToModifiedCell.has(originalIndex)) {
            return false;
        }
        const existingEdits = originalIndexWithMostEdits.get(originalIndex)?.dist ?? Number.MAX_SAFE_INTEGER;
        return value.editCount < existingEdits;
    };
    const trackMappedIndexes = (modifiedIndex, originalIndex) => {
        mappedOriginalCellToModifiedCell.set(originalIndex, modifiedIndex);
        mappedModifiedIndexes.add(modifiedIndex);
    };
    for (let i = 0; i < modifiedCells.length; i++) {
        const modifiedCell = modifiedCells[i];
        const { index, editCount: dist, percentage, } = computeClosestCell({ cell: modifiedCell, index: i }, originalCells, true, cache, canOriginalIndexBeMappedToModifiedIndex);
        if (index >= 0 && dist === 0) {
            trackMappedIndexes(i, index);
            results.push({ modified: i, original: index, dist, percentage, possibleOriginal: index });
        }
        else {
            originalIndexWithMostEdits.set(index, { dist: dist, modifiedIndex: i });
            results.push({ modified: i, original: -1, dist: dist, percentage, possibleOriginal: index });
        }
    }
    results.forEach((result, i) => {
        if (result.original >= 0) {
            return;
        }
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B b <not matched>
         * C c <not matched>
         * D d (these two have been matched)
         * e e
         * f f
         * =================
         * Just match A => a, B => b, C => c
         */
        // Find the next cell that has been matched.
        const previousMatchedCell = i > 0
            ? results
                .slice(0, i)
                .reverse()
                .find((r) => r.original >= 0)
            : undefined;
        const previousMatchedOriginalIndex = previousMatchedCell?.original ?? -1;
        const previousMatchedModifiedIndex = previousMatchedCell?.modified ?? -1;
        const matchedCell = results.slice(i + 1).find((r) => r.original >= 0);
        const unavailableIndexes = new Set();
        const nextMatchedModifiedIndex = results.findIndex((item, idx) => idx > i && item.original >= 0);
        const nextMatchedOriginalIndex = nextMatchedModifiedIndex >= 0 ? results[nextMatchedModifiedIndex].original : -1;
        // Find the available indexes that we can match with.
        // We are only interested in b and c (anything after d is of no use).
        originalCells.forEach((_, i) => {
            if (mappedOriginalCellToModifiedCell.has(i)) {
                unavailableIndexes.add(i);
                return;
            }
            if (matchedCell && i >= matchedCell.original) {
                unavailableIndexes.add(i);
            }
            if (nextMatchedOriginalIndex >= 0 && i > nextMatchedOriginalIndex) {
                unavailableIndexes.add(i);
            }
        });
        const modifiedCell = modifiedCells[i];
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B b <not matched because the % of change is too high, but we do have a probable match>
         * C c <not matched>
         * D d (these two have been matched)
         * e e
         * f f
         * =================
         * Given that we have a probable match for B => b, we can match it.
         */
        if (result.original === -1 &&
            result.possibleOriginal >= 0 &&
            !unavailableIndexes.has(result.possibleOriginal) &&
            canOriginalIndexBeMappedToModifiedIndex(result.possibleOriginal, { editCount: result.dist })) {
            trackMappedIndexes(i, result.possibleOriginal);
            result.original = result.possibleOriginal;
            return;
        }
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B b <not matched>
         * C c <not matched>
         * D d (these two have been matched)
         * =================
         * Its possible that B matches better with c and C matches better with b.
         * However given the fact that we have matched A => a and D => d.
         * & if the indexes are an exact match.
         * I.e. index of D in Modified === index of d in Original, and index of A in Modified === index of a in Original.
         * Then this means there are absolutely no modifications.
         * Hence we can just assign the indexes as is.
         *
         * NOTE: For this, we must ensure we have exactly the same number of items on either side.
         * I.e. we have B, C remaining in Modified, and b, c remaining in Original.
         * Thats 2 Modified items === 2 Original Items.
         * If its not the same, then this means something has been deleted/inserted, and we cannot blindly map the indexes.
         */
        if (previousMatchedOriginalIndex > 0 &&
            previousMatchedModifiedIndex > 0 &&
            previousMatchedOriginalIndex === previousMatchedModifiedIndex) {
            if ((nextMatchedModifiedIndex >= 0 ? nextMatchedModifiedIndex : modifiedCells.length - 1) ===
                (nextMatchedOriginalIndex >= 0 ? nextMatchedOriginalIndex : originalCells.length - 1) &&
                !unavailableIndexes.has(i) &&
                i < originalCells.length) {
                const remainingModifiedItems = (nextMatchedModifiedIndex >= 0 ? nextMatchedModifiedIndex : modifiedCells.length) -
                    previousMatchedModifiedIndex;
                const remainingOriginalItems = (nextMatchedOriginalIndex >= 0 ? nextMatchedOriginalIndex : originalCells.length) -
                    previousMatchedOriginalIndex;
                if (remainingModifiedItems === remainingOriginalItems &&
                    modifiedCell.cellKind === originalCells[i].cellKind) {
                    trackMappedIndexes(i, i);
                    result.original = i;
                    return;
                }
            }
        }
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B b <not matched>
         * C c <not matched>
         * D d (these two have been matched)
         * e e
         * f f
         * =================
         * We can now try to match B with b and c and figure out which is best.
         * RULE 1. Its possible that B will match best with c, howevber C matches better with c, meaning we should match B with b.
         * To do this, we need to see if c has a better match with something else.
         */
        // RULE 1
        // Try to find the next best match, but exclucde items that have a better match.
        const { index, percentage } = computeClosestCell({ cell: modifiedCell, index: i }, originalCells, false, cache, (originalIndex, originalValue) => {
            if (unavailableIndexes.has(originalIndex)) {
                return false;
            }
            if (nextMatchedModifiedIndex > 0 || previousMatchedOriginalIndex > 0) {
                // See if we have a beter match for this.
                const matchesForThisOriginalIndex = cache.originalToModified.get(originalIndex);
                if (matchesForThisOriginalIndex && previousMatchedOriginalIndex < originalIndex) {
                    const betterMatch = Array.from(matchesForThisOriginalIndex).find(([modifiedIndex, value]) => {
                        if (modifiedIndex === i) {
                            // This is the same modifeid entry.
                            return false;
                        }
                        if (modifiedIndex >= nextMatchedModifiedIndex) {
                            // We're only interested in matches that are before the next matched index.
                            return false;
                        }
                        if (mappedModifiedIndexes.has(i)) {
                            // This has already been matched.
                            return false;
                        }
                        return value.editCount < originalValue.editCount;
                    });
                    if (betterMatch) {
                        // We do have a better match for this, hence do not use this.
                        return false;
                    }
                }
            }
            return !unavailableIndexes.has(originalIndex);
        });
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B bbbbbbbbbbbbbb <not matched>
         * C cccccccccccccc <not matched>
         * D d (these two have been matched)
         * e e
         * f f
         * =================
         * RULE 1 . Now when attempting to match `bbbbbbbbbbbb` with B, the number of edits is very high and the percentage is also very high.
         * Basically majority of the text needs to be changed.
         * However if the indexes line up perfectly well, and this is the best match, then use it.
         *
         * Similarly its possible we're trying to match b with `BBBBBBBBBBBB` and the number of edits is very high, but the indexes line up perfectly well.
         *
         * RULE 2. However it is also possible that there's a better match with another cell
         * Assume we have
         * =================
         * AAAA     a (this has been matched)
         * bbbbbbbb b <not matched>
         * bbbb     c <not matched>
         * dddd     d (these two have been matched)
         * =================
         * In this case if we use the algorithm of (1) above, we'll end up matching bbbb with b, and bbbbbbbb with c.
         * But we're not really sure if this is the best match.
         * In such cases try to match with the same cell index.
         *
         */
        // RULE 1 (got a match and the indexes line up perfectly well, use it regardless of the number of edits).
        if (index >= 0 && i > 0 && results[i - 1].original === index - 1) {
            trackMappedIndexes(i, index);
            results[i].original = index;
            return;
        }
        // RULE 2
        // Here we know that `AAAA => a`
        // Check if the previous cell has been matched.
        // And if the next modified and next original cells are a match.
        const nextOriginalCell = i > 0 && originalCells.length > results[i - 1].original ? results[i - 1].original + 1 : -1;
        const nextOriginalCellValue = i > 0 && nextOriginalCell >= 0 && nextOriginalCell < originalCells.length
            ? originalCells[nextOriginalCell].getValue()
            : undefined;
        if (index >= 0 &&
            i > 0 &&
            typeof nextOriginalCellValue === 'string' &&
            !mappedOriginalCellToModifiedCell.has(nextOriginalCell)) {
            if (modifiedCell.getValue().includes(nextOriginalCellValue) ||
                nextOriginalCellValue.includes(modifiedCell.getValue())) {
                trackMappedIndexes(i, nextOriginalCell);
                results[i].original = nextOriginalCell;
                return;
            }
        }
        if (percentage < 90 || (i === 0 && results.length === 1)) {
            trackMappedIndexes(i, index);
            results[i].original = index;
            return;
        }
    });
    return results;
}
function computeClosestCell({ cell, index: cellIndex }, arr, ignoreEmptyCells, cache, canOriginalIndexBeMappedToModifiedIndex) {
    let min_edits = Infinity;
    let min_index = -1;
    // Always give preference to internal Cell Id if found.
    const internalId = cell.internalMetadata?.internalId;
    if (internalId) {
        const internalIdIndex = arr.findIndex((cell) => cell.internalMetadata?.internalId === internalId);
        if (internalIdIndex >= 0) {
            return { index: internalIdIndex, editCount: 0, percentage: Number.MAX_SAFE_INTEGER };
        }
    }
    for (let i = 0; i < arr.length; i++) {
        // Skip cells that are not of the same kind.
        if (arr[i].cellKind !== cell.cellKind) {
            continue;
        }
        const str = arr[i].getValue();
        const cacheEntry = cache.modifiedToOriginal.get(cellIndex) ?? new Map();
        const value = cacheEntry.get(i) ?? { editCount: computeNumberOfEdits(cell, arr[i]) };
        cacheEntry.set(i, value);
        cache.modifiedToOriginal.set(cellIndex, cacheEntry);
        const originalCacheEntry = cache.originalToModified.get(i) ?? new Map();
        originalCacheEntry.set(cellIndex, value);
        cache.originalToModified.set(i, originalCacheEntry);
        if (!canOriginalIndexBeMappedToModifiedIndex(i, value)) {
            continue;
        }
        if (str.length === 0 && ignoreEmptyCells) {
            continue;
        }
        if (str === cell.getValue() && cell.getValue().length > 0) {
            return { index: i, editCount: 0, percentage: 0 };
        }
        if (value.editCount < min_edits) {
            min_edits = value.editCount;
            min_index = i;
        }
    }
    if (min_index === -1) {
        return { index: -1, editCount: Number.MAX_SAFE_INTEGER, percentage: Number.MAX_SAFE_INTEGER };
    }
    const percentage = !cell.getValue().length && !arr[min_index].getValue().length
        ? 0
        : cell.getValue().length
            ? (min_edits * 100) / cell.getValue().length
            : Number.MAX_SAFE_INTEGER;
    return { index: min_index, editCount: min_edits, percentage };
}
function computeNumberOfEdits(modified, original) {
    if (modified.getValue() === original.getValue()) {
        return 0;
    }
    return computeLevenshteinDistance(modified.getValue(), original.getValue());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTWF0Y2hpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vc2VydmljZXMvbm90ZWJvb2tDZWxsTWF0Y2hpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFvQnBGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHO0FBQ0gsTUFBTSxVQUFVLDJCQUEyQixDQUMxQyxhQUFzQixFQUN0QixhQUFzQjtJQUV0QixNQUFNLEtBQUssR0FBdUI7UUFDakMsa0JBQWtCLEVBQUUsSUFBSSxHQUFHLEVBQStEO1FBQzFGLGtCQUFrQixFQUFFLElBQUksR0FBRyxFQUErRDtLQUMxRixDQUFBO0lBQ0QsTUFBTSxPQUFPLEdBTVAsRUFBRSxDQUFBO0lBQ1IsTUFBTSxnQ0FBZ0MsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtJQUNsRSxNQUFNLHFCQUFxQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFDL0MsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLEdBQUcsRUFBbUQsQ0FBQTtJQUM3RixNQUFNLHVDQUF1QyxHQUFHLENBQy9DLGFBQXFCLEVBQ3JCLEtBQStCLEVBQzlCLEVBQUU7UUFDSCxJQUFJLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ3pELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE1BQU0sYUFBYSxHQUNsQiwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUMvRSxPQUFPLEtBQUssQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFBO0lBQ3ZDLENBQUMs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