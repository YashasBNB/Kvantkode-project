/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import * as extHostTypeConverters from './extHostTypeConverters.js';
import { NotebookRange } from './extHostTypes.js';
import * as notebookCommon from '../../contrib/notebook/common/notebookCommon.js';
class RawContentChangeEvent {
    constructor(start, deletedCount, deletedItems, items) {
        this.start = start;
        this.deletedCount = deletedCount;
        this.deletedItems = deletedItems;
        this.items = items;
    }
    asApiEvent() {
        return {
            range: new NotebookRange(this.start, this.start + this.deletedCount),
            addedCells: this.items.map((cell) => cell.apiCell),
            removedCells: this.deletedItems,
        };
    }
}
export class ExtHostCell {
    static asModelAddData(cell) {
        return {
            EOL: cell.eol,
            lines: cell.source,
            languageId: cell.language,
            uri: cell.uri,
            isDirty: false,
            versionId: 1,
            encoding: 'utf8',
        };
    }
    constructor(notebook, _extHostDocument, _cellData) {
        this.notebook = notebook;
        this._extHostDocument = _extHostDocument;
        this._cellData = _cellData;
        this.handle = _cellData.handle;
        this.uri = URI.revive(_cellData.uri);
        this.cellKind = _cellData.cellKind;
        this._outputs = _cellData.outputs.map(extHostTypeConverters.NotebookCellOutput.to);
        this._internalMetadata = _cellData.internalMetadata ?? {};
        this._metadata = Object.freeze(_cellData.metadata ?? {});
        this._previousResult = Object.freeze(extHostTypeConverters.NotebookCellExecutionSummary.to(_cellData.internalMetadata ?? {}));
    }
    get internalMetadata() {
        return this._internalMetadata;
    }
    get apiCell() {
        if (!this._apiCell) {
            const that = this;
            const data = this._extHostDocument.getDocument(this.uri);
            if (!data) {
                throw new Error(`MISSING extHostDocument for notebook cell: ${this.uri}`);
            }
            const apiCell = {
                get index() {
                    return that.notebook.getCellIndex(that);
                },
                notebook: that.notebook.apiNotebook,
                kind: extHostTypeConverters.NotebookCellKind.to(this._cellData.cellKind),
                document: data.document,
                get mime() {
                    return that._mime;
                },
                set mime(value) {
                    that._mime = value;
                },
                get outputs() {
                    return that._outputs.slice(0);
                },
                get metadata() {
                    return that._metadata;
                },
                get executionSummary() {
                    return that._previousResult;
                },
            };
            this._apiCell = Object.freeze(apiCell);
        }
        return this._apiCell;
    }
    setOutputs(newOutputs) {
        this._outputs = newOutputs.map(extHostTypeConverters.NotebookCellOutput.to);
    }
    setOutputItems(outputId, append, newOutputItems) {
        const newItems = newOutputItems.map(extHostTypeConverters.NotebookCellOutputItem.to);
        const output = this._outputs.find((op) => op.id === outputId);
        if (output) {
            if (!append) {
                output.items.length = 0;
            }
            output.items.push(...newItems);
            if (output.items.length > 1 &&
                output.items.every((item) => notebookCommon.isTextStreamMime(item.mime))) {
                // Look for the mimes in the items, and keep track of their order.
                // Merge the streams into one output item, per mime type.
                const mimeOutputs = new Map();
                const mimeTypes = [];
                output.items.forEach((item) => {
                    let items;
                    if (mimeOutputs.has(item.mime)) {
                        items = mimeOutputs.get(item.mime);
                    }
                    else {
                        items = [];
                        mimeOutputs.set(item.mime, items);
                        mimeTypes.push(item.mime);
                    }
                    items.push(item.data);
                });
                output.items.length = 0;
                mimeTypes.forEach((mime) => {
                    const compressed = notebookCommon.compressOutputItemStreams(mimeOutputs.get(mime));
                    output.items.push({
                        mime,
                        data: compressed.data.buffer,
                    });
                });
            }
        }
    }
    setMetadata(newMetadata) {
        this._metadata = Object.freeze(newMetadata);
    }
    setInternalMetadata(newInternalMetadata) {
        this._internalMetadata = newInternalMetadata;
        this._previousResult = Object.freeze(extHostTypeConverters.NotebookCellExecutionSummary.to(newInternalMetadata));
    }
    setMime(newMime) { }
}
export class ExtHostNotebookDocument {
    static { this._handlePool = 0; }
    constructor(_proxy, _textDocumentsAndEditors, _textDocuments, uri, data) {
        this._proxy = _proxy;
        this._textDocumentsAndEditors = _textDocumentsAndEditors;
        this._textDocuments = _textDocuments;
        this.uri = uri;
        this.handle = ExtHostNotebookDocument._handlePool++;
        this._cells = [];
        this._versionId = 0;
        this._isDirty = false;
        this._disposed = false;
        this._notebookType = data.viewType;
        this._metadata = Object.freeze(data.metadata ?? Object.create(null));
        this._spliceNotebookCells([[0, 0, data.cells]], true /* init -> no event*/, undefined);
        this._versionId = data.versionId;
    }
    dispose() {
        this._disposed = true;
    }
    get versionId() {
        return this._versionId;
    }
    get apiNotebook() {
        if (!this._notebook) {
            const that = this;
            const apiObject = {
                get uri() {
                    return that.uri;
                },
                get version() {
                    return that._versionId;
                },
                get notebookType() {
                    return that._notebookType;
                },
                get isDirty() {
                    return that._isDirty;
                },
                get isUntitled() {
                    return that.uri.scheme === Schemas.untitled;
                },
                get isClosed() {
                    return that._disposed;
                },
                get metadata() {
                    return that._metadata;
                },
                get cellCount() {
                    return that._cells.length;
                },
                cellAt(index) {
                    index = that._validateIndex(index);
                    return that._cells[index].apiCell;
                },
                getCells(range) {
                    const cells = range ? that._getCells(range) : that._cells;
                    return cells.map((cell) => cell.apiCell);
                },
                save() {
                    return that._save();
                },
                [Symbol.for('debug.description')]() {
                    return `NotebookDocument(${this.uri.toString()})`;
                },
            };
            this._notebook = Object.freeze(apiObject);
        }
        return this._notebook;
    }
    acceptDocumentPropertiesChanged(data) {
        if (data.metadata) {
            this._metadata = Object.freeze({ ...this._metadata, ...data.metadata });
        }
    }
    acceptDirty(isDirty) {
        this._isDirty = isDirty;
    }
    acceptModelChanged(event, isDirty, newMetadata) {
        this._versionId = event.versionId;
        this._isDirty = isDirty;
        this.acceptDocumentPropertiesChanged({ metadata: newMetadata });
        const result = {
            notebook: this.apiNotebook,
            metadata: newMetadata,
            cellChanges: [],
            contentChanges: [],
        };
        const relaxedCellChanges = [];
        // -- apply change and populate content changes
        for (const rawEvent of event.rawEvents) {
            if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ModelChange) {
                this._spliceNotebookCells(rawEvent.changes, false, result.contentChanges);
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.Move) {
                this._moveCells(rawEvent.index, rawEvent.length, rawEvent.newIdx, result.contentChanges);
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.Output) {
                this._setCellOutputs(rawEvent.index, rawEvent.outputs);
                relaxedCellChanges.push({
                    cell: this._cells[rawEvent.index].apiCell,
                    outputs: this._cells[rawEvent.index].apiCell.outputs,
                });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.OutputItem) {
                this._setCellOutputItems(rawEvent.index, rawEvent.outputId, rawEvent.append, rawEvent.outputItems);
                relaxedCellChanges.push({
                    cell: this._cells[rawEvent.index].apiCell,
                    outputs: this._cells[rawEvent.index].apiCell.outputs,
                });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellLanguage) {
                this._changeCellLanguage(rawEvent.index, rawEvent.language);
                relaxedCellChanges.push({
                    cell: this._cells[rawEvent.index].apiCell,
                    document: this._cells[rawEvent.index].apiCell.document,
                });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellContent) {
                relaxedCellChanges.push({
                    cell: this._cells[rawEvent.index].apiCell,
                    document: this._cells[rawEvent.index].apiCell.document,
                });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellMime) {
                this._changeCellMime(rawEvent.index, rawEvent.mime);
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellMetadata) {
                this._changeCellMetadata(rawEvent.index, rawEvent.metadata);
                relaxedCellChanges.push({
                    cell: this._cells[rawEvent.index].apiCell,
                    metadata: this._cells[rawEvent.index].apiCell.metadata,
                });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellInternalMetadata) {
                this._changeCellInternalMetadata(rawEvent.index, rawEvent.internalMetadata);
                relaxedCellChanges.push({
                    cell: this._cells[rawEvent.index].apiCell,
                    executionSummary: this._cells[rawEvent.index].apiCell.executionSummary,
                });
            }
        }
        // -- compact cellChanges
        const map = new Map();
        for (let i = 0; i < relaxedCellChanges.length; i++) {
            const relaxedCellChange = relaxedCellChanges[i];
            const existing = map.get(relaxedCellChange.cell);
            if (existing === undefined) {
                const newLen = result.cellChanges.push({
                    document: undefined,
                    executionSummary: undefined,
                    metadata: undefined,
                    outputs: undefined,
                    ...relaxedCellChange,
                });
                map.set(relaxedCellChange.cell, newLen - 1);
            }
            else {
                result.cellChanges[existing] = {
                    ...result.cellChanges[existing],
                    ...relaxedCellChange,
                };
            }
        }
        // Freeze event properties so handlers cannot accidentally modify them
        Object.freeze(result);
        Object.freeze(result.cellChanges);
        Object.freeze(result.contentChanges);
        return result;
    }
    _validateIndex(index) {
        index = index | 0;
        if (index < 0) {
            return 0;
        }
        else if (index >= this._cells.length) {
            return this._cells.length - 1;
        }
        else {
            return index;
        }
    }
    _validateRange(range) {
        let start = range.start | 0;
        let end = range.end | 0;
        if (start < 0) {
            start = 0;
        }
        if (end > this._cells.length) {
            end = this._cells.length;
        }
        return range.with({ start, end });
    }
    _getCells(range) {
        range = this._validateRange(range);
        const result = [];
        for (let i = range.start; i < range.end; i++) {
            result.push(this._cells[i]);
        }
        return result;
    }
    async _save() {
        if (this._disposed) {
            return Promise.reject(new Error('Notebook has been closed'));
        }
        return this._proxy.$trySaveNotebook(this.uri);
    }
    _spliceNotebookCells(splices, initialization, bucket) {
        if (this._disposed) {
            return;
        }
        const contentChangeEvents = [];
        const addedCellDocuments = [];
        const removedCellDocuments = [];
        splices.reverse().forEach((splice) => {
            const cellDtos = splice[2];
            const newCells = cellDtos.map((cell) => {
                const extCell = new ExtHostCell(this, this._textDocumentsAndEditors, cell);
                if (!initialization) {
                    addedCellDocuments.push(ExtHostCell.asModelAddData(cell));
                }
                return extCell;
            });
            const changeEvent = new RawContentChangeEvent(splice[0], splice[1], [], newCells);
            const deletedItems = this._cells.splice(splice[0], splice[1], ...newCells);
            for (const cell of deletedItems) {
                removedCellDocuments.push(cell.uri);
                changeEvent.deletedItems.push(cell.apiCell);
            }
            contentChangeEvents.push(changeEvent);
        });
        this._textDocumentsAndEditors.acceptDocumentsAndEditorsDelta({
            addedDocuments: addedCellDocuments,
            removedDocuments: removedCellDocuments,
        });
        if (bucket) {
            for (const changeEvent of contentChangeEvents) {
                bucket.push(changeEvent.asApiEvent());
            }
        }
    }
    _moveCells(index, length, newIdx, bucket) {
        const cells = this._cells.splice(index, length);
        this._cells.splice(newIdx, 0, ...cells);
        const changes = [
            new RawContentChangeEvent(index, length, cells.map((c) => c.apiCell), []),
            new RawContentChangeEvent(newIdx, 0, [], cells),
        ];
        for (const change of changes) {
            bucket.push(change.asApiEvent());
        }
    }
    _setCellOutputs(index, outputs) {
        const cell = this._cells[index];
        cell.setOutputs(outputs);
    }
    _setCellOutputItems(index, outputId, append, outputItems) {
        const cell = this._cells[index];
        cell.setOutputItems(outputId, append, outputItems);
    }
    _changeCellLanguage(index, newLanguageId) {
        const cell = this._cells[index];
        if (cell.apiCell.document.languageId !== newLanguageId) {
            this._textDocuments.$acceptModelLanguageChanged(cell.uri, newLanguageId);
        }
    }
    _changeCellMime(index, newMime) {
        const cell = this._cells[index];
        cell.apiCell.mime = newMime;
    }
    _changeCellMetadata(index, newMetadata) {
        const cell = this._cells[index];
        cell.setMetadata(newMetadata);
    }
    _changeCellInternalMetadata(index, newInternalMetadata) {
        const cell = this._cells[index];
        cell.setInternalMetadata(newInternalMetadata);
    }
    getCellFromApiCell(apiCell) {
        return this._cells.find((cell) => cell.apiCell === apiCell);
    }
    getCellFromIndex(index) {
        return this._cells[index];
    }
    getCell(cellHandle) {
        return this._cells.find((cell) => cell.handle === cellHandle);
    }
    getCellIndex(cell) {
        return this._cells.indexOf(cell);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3ROb3RlYm9va0RvY3VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFJakQsT0FBTyxLQUFLLHFCQUFxQixNQUFNLDRCQUE0QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNqRCxPQUFPLEtBQUssY0FBYyxNQUFNLGlEQUFpRCxDQUFBO0FBR2pGLE1BQU0scUJBQXFCO0lBQzFCLFlBQ1UsS0FBYSxFQUNiLFlBQW9CLEVBQ3BCLFlBQW1DLEVBQ25DLEtBQW9CO1FBSHBCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQixpQkFBWSxHQUFaLFlBQVksQ0FBdUI7UUFDbkMsVUFBSyxHQUFMLEtBQUssQ0FBZTtJQUMzQixDQUFDO0lBRUosVUFBVTtRQUNULE9BQU87WUFDTixLQUFLLEVBQUUsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDcEUsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ2xELFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUMvQixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFDdkIsTUFBTSxD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