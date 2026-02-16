/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LcsDiff } from '../../../../../base/common/diff/diff.js';
import { doHash, hash, numberHash } from '../../../../../base/common/hash.js';
import { URI } from '../../../../../base/common/uri.js';
import { PieceTreeTextBufferBuilder } from '../../../../../editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder.js';
import { CellKind, NotebookCellsChangeType, } from '../notebookCommon.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { SearchParams } from '../../../../../editor/common/model/textModelSearch.js';
import { MirrorModel } from '../../../../../editor/common/services/textModelSync/textModelSync.impl.js';
import { filter } from '../../../../../base/common/objects.js';
import { matchCellBasedOnSimilarties } from './notebookCellMatching.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { DiffChange } from '../../../../../base/common/diff/diffChange.js';
import { computeDiff } from '../notebookDiff.js';
const PREFIX_FOR_UNMATCHED_ORIGINAL_CELLS = `unmatchedOriginalCell`;
class MirrorCell {
    get eol() {
        return this._eol === '\r\n' ? 2 /* DefaultEndOfLine.CRLF */ : 1 /* DefaultEndOfLine.LF */;
    }
    constructor(handle, uri, source, _eol, versionId, language, cellKind, outputs, metadata, internalMetadata) {
        this.handle = handle;
        this._eol = _eol;
        this.language = language;
        this.cellKind = cellKind;
        this.outputs = outputs;
        this.metadata = metadata;
        this.internalMetadata = internalMetadata;
        this.textModel = new MirrorModel(uri, source, _eol, versionId);
    }
    onEvents(e) {
        this.textModel.onEvents(e);
        this._hash = undefined;
    }
    getValue() {
        return this.textModel.getValue();
    }
    getLinesContent() {
        return this.textModel.getLinesContent();
    }
    getComparisonValue() {
        return (this._hash ??= this._getHash());
    }
    _getHash() {
        let hashValue = numberHash(104579, 0);
        hashValue = doHash(this.language, hashValue);
        hashValue = doHash(this.getValue(), hashValue);
        hashValue = doHash(this.metadata, hashValue);
        // For purpose of diffing only cellId matters, rest do not
        hashValue = doHash(this.internalMetadata?.internalId || '', hashValue);
        for (const op of this.outputs) {
            hashValue = doHash(op.metadata, hashValue);
            for (const output of op.outputs) {
                hashValue = doHash(output.mime, hashValue);
            }
        }
        const digests = this.outputs.flatMap((op) => op.outputs.map((o) => hash(Array.from(o.data.buffer))));
        for (const digest of digests) {
            hashValue = numberHash(digest, hashValue);
        }
        return hashValue;
    }
}
class MirrorNotebookDocument {
    constructor(uri, cells, metadata, transientDocumentMetadata) {
        this.uri = uri;
        this.cells = cells;
        this.metadata = metadata;
        this.transientDocumentMetadata = transientDocumentMetadata;
    }
    acceptModelChanged(event) {
        // note that the cell content change is not applied to the MirrorCell
        // but it's fine as if a cell content is modified after the first diff, its position will not change any more
        // TODO@rebornix, but it might lead to interesting bugs in the future.
        event.rawEvents.forEach((e) => {
            if (e.kind === NotebookCellsChangeType.ModelChange) {
                this._spliceNotebookCells(e.changes);
            }
            else if (e.kind === NotebookCellsChangeType.Move) {
                const cells = this.cells.splice(e.index, 1);
                this.cells.splice(e.newIdx, 0, ...cells);
            }
            else if (e.kind === NotebookCellsChangeType.Output) {
                const cell = this.cells[e.index];
                cell.outputs = e.outputs;
            }
            else if (e.kind === NotebookCellsChangeType.ChangeCellLanguage) {
                this._assertIndex(e.index);
                const cell = this.cells[e.index];
                cell.language = e.language;
            }
            else if (e.kind === NotebookCellsChangeType.ChangeCellMetadata) {
                this._assertIndex(e.index);
                const cell = this.cells[e.index];
                cell.metadata = e.metadata;
            }
            else if (e.kind === NotebookCellsChangeType.ChangeCellInternalMetadata) {
                this._assertIndex(e.index);
                const cell = this.cells[e.index];
                cell.internalMetadata = e.internalMetadata;
            }
            else if (e.kind === NotebookCellsChangeType.ChangeDocumentMetadata) {
                this.metadata = e.metadata;
            }
        });
    }
    _assertIndex(index) {
        if (index < 0 || index >= this.cells.length) {
            throw new Error(`Illegal index ${index}. Cells length: ${this.cells.length}`);
        }
    }
    _spliceNotebookCells(splices) {
        splices.reverse().forEach((splice) => {
            const cellDtos = splice[2];
            const newCells = cellDtos.map((cell) => {
                return new MirrorCell(cell.handle, URI.parse(cell.url), cell.source, cell.eol, cell.versionId, cell.language, cell.cellKind, cell.outputs, cell.metadata);
            });
            this.cells.splice(splice[0], splice[1], ...newCells);
        });
    }
}
class CellSequence {
    static create(textModel) {
        const hashValue = textModel.cells.map((c) => c.getComparisonValue());
        return new CellSequence(hashValue);
    }
    static createWithCellId(cells, includeCellContents) {
        const hashValue = cells.map((c) => {
            if (includeCellContents) {
                return `${doHash(c.internalMetadata?.internalId, numberHash(104579, 0))}#${c.getComparisonValue()}`;
            }
            else {
                return `${doHash(c.internalMetadata?.internalId, numberHash(104579, 0))}}`;
            }
        });
        return new CellSequence(hashValue);
    }
    constructor(hashValue) {
        this.hashValue = hashValue;
    }
    getElements() {
        return this.hashValue;
    }
}
export class NotebookWorker {
    constructor() {
        this._models = Object.create(null);
    }
    dispose() { }
    $acceptNewModel(uri, metadata, transientDocumentMetadata, cells) {
        this._models[uri] = new MirrorNotebookDocument(URI.parse(uri), cells.map((dto) => new MirrorCell(dto.handle, URI.parse(dto.url), dto.source, dto.eol, dto.versionId, dto.language, dto.cellKind, dto.outputs, dto.metadata, dto.internalMetadata)), metadata, transientDocumentMetadata);
    }
    $acceptModelChanged(strURL, event) {
        const model = this._models[strURL];
        model?.acceptModelChanged(event);
    }
    $acceptCellModelChanged(strURL, handle, event) {
        const model = this._models[strURL];
        model.cells.find((cell) => cell.handle === handle)?.onEvents(event);
    }
    $acceptRemovedModel(strURL) {
        if (!this._models[strURL]) {
            return;
        }
        delete this._models[strURL];
    }
    async $computeDiff(originalUrl, modifiedUrl) {
        const original = this._getModel(originalUrl);
        const modified = this._getModel(modifiedUrl);
        const originalModel = new NotebookTextModelFacade(original);
        const modifiedModel = new NotebookTextModelFacade(modified);
        const originalMetadata = filter(original.metadata, (key) => !original.transientDocumentMetadata[key]);
        const modifiedMetadata = filter(modified.metadata, (key) => !modified.transientDocumentMetadata[key]);
        const metadataChanged = JSON.stringify(originalMetadata) !== JSON.stringify(modifiedMetadata);
        // TODO@DonJayamanne
        // In the future we might want to avoid computing LCS of outputs
        // That will make this faster.
        const originalDiff = new LcsDiff(CellSequence.create(original), CellSequence.create(modified)).ComputeDiff(false);
        if (originalDiff.changes.length === 0) {
            return {
                metadataChanged,
                cellsDiff: originalDiff,
            };
        }
        // This will return the mapping of the cells and what cells were inserted/deleted.
        // We do not care much about accuracy of the diff, but care about the mapping of unmodified cells.
        // That can be used as anchor points to find the cells that have changed.
        // And on cells that have changed, we can use similarity algorithms to find the mapping.
        // Eg as mentioned earlier, its possible after similarity algorithms we find that cells weren't inserted/deleted but were just modified.
        const cellMapping = computeDiff(originalModel, modifiedModel, {
            cellsDiff: { changes: originalDiff.changes, quitEarly: false },
            metadataChanged: false,
        }).cellDiffInfo;
        // If we have no insertions/deletions, then this is a good diffing.
        if (cellMapping.every((c) => c.type === 'modified')) {
            return {
                metadataChanged,
                cellsDiff: originalDiff,
            };
        }
        let diffUsingCellIds = this.canComputeDiffWithCellIds(original, modified);
        if (!diffUsingCellIds) {
            /**
             * Assume we have cells as follows
             * Original   Modified
             * A	  		A
             * B			B
             * C			e
             * D			F
             * E
             * F
             *
             * Using LCS we know easily that A, B cells match.
             * Using LCS it would look like C changed to e
             * Using LCS D & E were removed.
             *
             * A human would be able to tell that cell C, D were removed.
             * A human can tell that E changed to e because the code in the cells are very similar.
             * Note the words `similar`, humans try to match cells based on certain heuristics.
             * & the most obvious one is the similarity of the code in the cells.
             *
             * LCS has no notion of similarity, it only knows about equality.
             * We can use other algorithms to find similarity.
             * So if we eliminate A, B, we are left with C, D, E, F and we need to find what they map to in `e, F` in modifed document.
             * We can use a similarity algorithm to find that.
             *
             * The purpose of using LCS first is to find the cells that have not changed.
             * This avoids the need to use similarity algorithms on all cells.
             *
             * At the end of the day what we need is as follows
             * A <=> A
             * B <=> B
             * C => Deleted
             * D => Deleted
             * E => e
             * F => F
             */
            // Note, if cells are swapped, then this compilicates things
            // Trying to solve diff manually is not easy.
            // Lets instead use LCS find the cells that haven't changed,
            // & the cells that have.
            // For the range of cells that have change, lets see if we can get better results using similarity algorithms.
            // Assume we have
            // Code Cell = print("Hello World")
            // Code Cell = print("Foo Bar")
            // We now change this to
            // MD Cell = # Description
            // Code Cell = print("Hello WorldZ")
            // Code Cell = print("Foo BarZ")
            // LCS will tell us that everything changed.
            // But using similarity algorithms we can tell that the first cell is new and last 2 changed.
            // Lets try the similarity algorithms on all cells.
            // We might fare better.
            const result = matchCellBasedOnSimilarties(modified.cells, original.cells);
            // If we have at least one match, then great.
            if (result.some((c) => c.original !== -1)) {
                // We have managed to find similarities between cells.
                // Now we can definitely find what cell is new/removed.
                this.updateCellIdsBasedOnMappings(result, original.cells, modified.cells);
                diffUsingCellIds = true;
            }
        }
        if (!diffUsingCellIds) {
            return {
                metadataChanged,
                cellsDiff: originalDiff,
            };
        }
        // At this stage we can use internalMetadata.cellId for tracking changes.
        // I.e. we compute LCS diff and the hashes of some cells from original will be equal to that in modified as we're using cellId.
        // Thus we can find what cells are new/deleted.
        // After that we can find whether the contents of the cells changed.
        const cellsInsertedOrDeletedDiff = new LcsDiff(CellSequence.createWithCellId(original.cells), CellSequence.createWithCellId(modified.cells)).ComputeDiff(false);
        const cellDiffInfo = computeDiff(originalModel, modifiedModel, {
            cellsDiff: { changes: cellsInsertedOrDeletedDiff.changes, quitEarly: false },
            metadataChanged: false,
        }).cellDiffInfo;
        let processedIndex = 0;
        const changes = [];
        cellsInsertedOrDeletedDiff.changes.forEach((change) => {
            if (!change.originalLength && change.modifiedLength) {
                // Inserted.
                // Find all modified cells before this.
                const changeIndex = cellDiffInfo.findIndex((c) => c.type === 'insert' && c.modifiedCellIndex === change.modifiedStart);
                cellDiffInfo.slice(processedIndex, changeIndex).forEach((c) => {
                    if (c.type === 'unchanged' || c.type === 'modified') {
                        const originalCell = original.cells[c.originalCellIndex];
                        const modifiedCell = modified.cells[c.modifiedCellIndex];
                        const changed = c.type === 'modified' ||
                            originalCell.getComparisonValue() !== modifiedCell.getComparisonValue();
                        if (changed) {
                            changes.push(new DiffChange(c.originalCellIndex, 1, c.modifiedCellIndex, 1));
                        }
                    }
                });
                changes.push(change);
                processedIndex = changeIndex + 1;
            }
            else if (change.originalLength && !change.modifiedLength) {
                // Deleted.
                // Find all modified cells before this.
                const changeIndex = cellDiffInfo.findIndex((c) => c.type === 'delete' && c.originalCellIndex === change.originalStart);
                cellDiffInfo.slice(processedIndex, changeIndex).forEach((c) => {
                    if (c.type === 'unchanged' || c.type === 'modified') {
                        const originalCell = original.cells[c.originalCellIndex];
                        const modifiedCell = modified.cells[c.modifiedCellIndex];
                        const changed = c.type === 'modified' ||
                            originalCell.getComparisonValue() !== modifiedCell.getComparisonValue();
                        if (changed) {
                            changes.push(new DiffChange(c.originalCellIndex, 1, c.modifiedCellIndex, 1));
                        }
                    }
                });
                changes.push(change);
                processedIndex = changeIndex + 1;
            }
            else {
                // This could be a situation where a cell has been deleted on left and inserted on the right.
                // E.g. markdown cell deleted and code cell inserted.
                // But LCS shows them as a modification.
                const changeIndex = cellDiffInfo.findIndex((c) => (c.type === 'delete' && c.originalCellIndex === change.originalStart) ||
                    (c.type === 'insert' && c.modifiedCellIndex === change.modifiedStart));
                cellDiffInfo.slice(processedIndex, changeIndex).forEach((c) => {
                    if (c.type === 'unchanged' || c.type === 'modified') {
                        const originalCell = original.cells[c.originalCellIndex];
                        const modifiedCell = modified.cells[c.modifiedCellIndex];
                        const changed = c.type === 'modified' ||
                            originalCell.getComparisonValue() !== modifiedCell.getComparisonValue();
                        if (changed) {
                            changes.push(new DiffChange(c.originalCellIndex, 1, c.modifiedCellIndex, 1));
                        }
                    }
                });
                changes.push(change);
                processedIndex = changeIndex + 1;
            }
        });
        cellDiffInfo.slice(processedIndex).forEach((c) => {
            if (c.type === 'unchanged' || c.type === 'modified') {
                const originalCell = original.cells[c.originalCellIndex];
                const modifiedCell = modified.cells[c.modifiedCellIndex];
                const changed = c.type === 'modified' ||
                    originalCell.getComparisonValue() !== modifiedCell.getComparisonValue();
                if (changed) {
                    changes.push(new DiffChange(c.originalCellIndex, 1, c.modifiedCellIndex, 1));
                }
            }
        });
        return {
            metadataChanged,
            cellsDiff: {
                changes,
                quitEarly: false,
            },
        };
    }
    canComputeDiffWithCellIds(original, modified) {
        return (this.canComputeDiffWithCellInternalIds(original, modified) ||
            this.canComputeDiffWithCellMetadataIds(original, modified));
    }
    canComputeDiffWithCellInternalIds(original, modified) {
        const originalCellIndexIds = original.cells.map((cell, index) => ({
            index,
            id: (cell.internalMetadata?.internalId || ''),
        }));
        const modifiedCellIndexIds = modified.cells.map((cell, index) => ({
            index,
            id: (cell.internalMetadata?.internalId || ''),
        }));
        // If we have a cell without an id, do not use metadata.id for diffing.
        if (originalCellIndexIds.some((c) => !c.id) || modifiedCellIndexIds.some((c) => !c.id)) {
            return false;
        }
        // If none of the ids in original can be found in modified, then we can't use metadata.id for diffing.
        // I.e. everything is new, no point trying.
        return originalCellIndexIds.some((c) => modifiedCellIndexIds.find((m) => m.id === c.id));
    }
    canComputeDiffWithCellMetadataIds(original, modified) {
        const originalCellIndexIds = original.cells.map((cell, index) => ({
            index,
            id: (cell.metadata?.id || ''),
        }));
        const modifiedCellIndexIds = modified.cells.map((cell, index) => ({
            index,
            id: (cell.metadata?.id || ''),
        }));
        // If we have a cell without an id, do not use metadata.id for diffing.
        if (originalCellIndexIds.some((c) => !c.id) || modifiedCellIndexIds.some((c) => !c.id)) {
            return false;
        }
        // If none of the ids in original can be found in modified, then we can't use metadata.id for diffing.
        // I.e. everything is new, no point trying.
        if (originalCellIndexIds.every((c) => !modifiedCellIndexIds.find((m) => m.id === c.id))) {
            return false;
        }
        // Internally we use internalMetadata.cellId for diffing, hence update the internalMetadata.cellId
        original.cells.map((cell, index) => {
            cell.internalMetadata = cell.internalMetadata || {};
            cell.internalMetadata.internalId = cell.metadata?.id || '';
        });
        modified.cells.map((cell, index) => {
            cell.internalMetadata = cell.internalMetadata || {};
            cell.internalMetadata.internalId = cell.metadata?.id || '';
        });
        return true;
    }
    isOriginalCellMatchedWithModifiedCell(originalCell) {
        return (originalCell.internalMetadata?.internalId || '').startsWith(PREFIX_FOR_UNMATCHED_ORIGINAL_CELLS);
    }
    updateCellIdsBasedOnMappings(mappings, originalCells, modifiedCells) {
        const uuids = new Map();
        originalCells.map((cell, index) => {
            cell.internalMetadata = cell.internalMetadata || { internalId: '' };
            cell.internalMetadata.internalId = `${PREFIX_FOR_UNMATCHED_ORIGINAL_CELLS}${generateUuid()}`;
            const found = mappings.find((r) => r.original === index);
            if (found) {
                // Do not use the indexes as ids.
                // If we do, then the hashes will be very similar except for last digit.
                cell.internalMetadata.internalId = generateUuid();
                uuids.set(found.modified, cell.internalMetadata.internalId);
            }
        });
        modifiedCells.map((cell, index) => {
            cell.internalMetadata = cell.internalMetadata || { internalId: '' };
            cell.internalMetadata.internalId = uuids.get(index) ?? generateUuid();
        });
        return true;
    }
    $canPromptRecommendation(modelUrl) {
        const model = this._getModel(modelUrl);
        const cells = model.cells;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (cell.cellKind === CellKind.Markup) {
                continue;
            }
            if (cell.language !== 'python') {
                continue;
            }
            const searchParams = new SearchParams('import\\s*pandas|from\\s*pandas', true, false, null);
            const searchData = searchParams.parseSearchRequest();
            if (!searchData) {
                continue;
            }
            const builder = new PieceTreeTextBufferBuilder();
            builder.acceptChunk(cell.getValue());
            const bufferFactory = builder.finish(true);
            const textBuffer = bufferFactory.create(cell.eol).textBuffer;
            const lineCount = textBuffer.getLineCount();
            const maxLineCount = Math.min(lineCount, 20);
            const range = new Range(1, 1, maxLineCount, textBuffer.getLineLength(maxLineCount) + 1);
            const cellMatches = textBuffer.findMatchesLineByLine(range, searchData, true, 1);
            if (cellMatches.length > 0) {
                return true;
            }
        }
        return false;
    }
    _getModel(uri) {
        return this._models[uri];
    }
}
export function create() {
    return new NotebookWorker();
}
class NotebookTextModelFacade {
    constructor(notebook) {
        this.notebook = notebook;
        this.cells = notebook.cells.map((cell) => new NotebookCellTextModelFacade(cell));
    }
}
class NotebookCellTextModelFacade {
    get cellKind() {
        return this.cell.cellKind;
    }
    constructor(cell) {
        this.cell = cell;
    }
    getHashValue() {
        return this.cell.getComparisonValue();
    }
    equal(cell) {
        if (cell.cellKind !== this.cellKind) {
            return false;
        }
        return this.getHashValue() === cell.getHashValue();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXZWJXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9zZXJ2aWNlcy9ub3RlYm9va1dlYldvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQTBCLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzRkFBc0YsQ0FBQTtBQUNqSSxPQUFPLEVBQ04sUUFBUSxFQU9SLHVCQUF1QixHQUl2QixNQUFNLHNCQUFzQixDQUFBO0FBQzdCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDcEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBR3ZHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUVoRCxNQUFNLG1DQUFtQyxHQUFHLHVCQUF1QixDQUFBO0FBRW5FLE1BQU0sVUFBVTtJQUdmLElB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