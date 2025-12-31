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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Tm90ZWJvb2tEb2N1bWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBSWpELE9BQU8sS0FBSyxxQkFBcUIsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDakQsT0FBTyxLQUFLLGNBQWMsTUFBTSxpREFBaUQsQ0FBQTtBQUdqRixNQUFNLHFCQUFxQjtJQUMxQixZQUNVLEtBQWEsRUFDYixZQUFvQixFQUNwQixZQUFtQyxFQUNuQyxLQUFvQjtRQUhwQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsaUJBQVksR0FBWixZQUFZLENBQXVCO1FBQ25DLFVBQUssR0FBTCxLQUFLLENBQWU7SUFDM0IsQ0FBQztJQUVKLFVBQVU7UUFDVCxPQUFPO1lBQ04sS0FBSyxFQUFFLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3BFLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNsRCxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7U0FDL0IsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLE1BQU0sQ0FBQyxj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