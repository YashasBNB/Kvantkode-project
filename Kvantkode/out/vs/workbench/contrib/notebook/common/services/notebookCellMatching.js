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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTWF0Y2hpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9zZXJ2aWNlcy9ub3RlYm9va0NlbGxNYXRjaGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQW9CcEY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F5Qkc7QUFDSCxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLGFBQXNCLEVBQ3RCLGFBQXNCO0lBRXRCLE1BQU0sS0FBSyxHQUF1QjtRQUNqQyxrQkFBa0IsRUFBRSxJQUFJLEdBQUcsRUFBK0Q7UUFDMUYsa0JBQWtCLEVBQUUsSUFBSSxHQUFHLEVBQStEO0tBQzFGLENBQUE7SUFDRCxNQUFNLE9BQU8sR0FNUCxFQUFFLENBQUE7SUFDUixNQUFNLGdDQUFnQyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0lBQ2xFLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtJQUMvQyxNQUFNLDBCQUEwQixHQUFHLElBQUksR0FBRyxFQUFtRCxDQUFBO0lBQzdGLE1BQU0sdUNBQXVDLEdBQUcsQ0FDL0MsYUFBcUIsRUFDckIsS0FBK0IsRUFDOUIsRUFBRTtRQUNILElBQUksZ0NBQWdDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDekQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQ2xCLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLElBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFBO1FBQy9FLE9BQU8sS0FBSyxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUE7SUFDdkMs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