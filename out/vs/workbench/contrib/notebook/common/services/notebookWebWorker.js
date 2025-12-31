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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXZWJXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vc2VydmljZXMvbm90ZWJvb2tXZWJXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUEwQixPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0ZBQXNGLENBQUE7QUFDakksT0FBTyxFQUNOLFFBQVEsRUFPUix1QkFBdUIsR0FJdkIsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUd2RyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDdkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFaEQsTUFBTSxtQ0FBbUMsR0FBRyx1QkFBdUIsQ0FBQTtBQUVuRSxNQUFNLFVBQVU7SUFHZixJQUFXLEdBQUc7UUFDYixPQUFPLElBQUks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