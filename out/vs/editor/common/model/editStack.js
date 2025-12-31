/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Selection } from '../core/selection.js';
import { URI } from '../../../base/common/uri.js';
import { TextChange, compressConsecutiveTextChanges } from '../core/textChange.js';
import * as buffer from '../../../base/common/buffer.js';
import { basename } from '../../../base/common/resources.js';
function uriGetComparisonKey(resource) {
    return resource.toString();
}
export class SingleModelEditStackData {
    static create(model, beforeCursorState) {
        const alternativeVersionId = model.getAlternativeVersionId();
        const eol = getModelEOL(model);
        return new SingleModelEditStackData(alternativeVersionId, alternativeVersionId, eol, eol, beforeCursorState, beforeCursorState, []);
    }
    constructor(beforeVersionId, afterVersionId, beforeEOL, afterEOL, beforeCursorState, afterCursorState, changes) {
        this.beforeVersionId = beforeVersionId;
        this.afterVersionId = afterVersionId;
        this.beforeEOL = beforeEOL;
        this.afterEOL = afterEOL;
        this.beforeCursorState = beforeCursorState;
        this.afterCursorState = afterCursorState;
        this.changes = changes;
    }
    append(model, textChanges, afterEOL, afterVersionId, afterCursorState) {
        if (textChanges.length > 0) {
            this.changes = compressConsecutiveTextChanges(this.changes, textChanges);
        }
        this.afterEOL = afterEOL;
        this.afterVersionId = afterVersionId;
        this.afterCursorState = afterCursorState;
    }
    static _writeSelectionsSize(selections) {
        return 4 + 4 * 4 * (selections ? selections.length : 0);
    }
    static _writeSelections(b, selections, offset) {
        buffer.writeUInt32BE(b, selections ? selections.length : 0, offset);
        offset += 4;
        if (selections) {
            for (const selection of selections) {
                buffer.writeUInt32BE(b, selection.selectionStartLineNumber, offset);
                offset += 4;
                buffer.writeUInt32BE(b, selection.selectionStartColumn, offset);
                offset += 4;
                buffer.writeUInt32BE(b, selection.positionLineNumber, offset);
                offset += 4;
                buffer.writeUInt32BE(b, selection.positionColumn, offset);
                offset += 4;
            }
        }
        return offset;
    }
    static _readSelections(b, offset, dest) {
        const count = buffer.readUInt32BE(b, offset);
        offset += 4;
        for (let i = 0; i < count; i++) {
            const selectionStartLineNumber = buffer.readUInt32BE(b, offset);
            offset += 4;
            const selectionStartColumn = buffer.readUInt32BE(b, offset);
            offset += 4;
            const positionLineNumber = buffer.readUInt32BE(b, offset);
            offset += 4;
            const positionColumn = buffer.readUInt32BE(b, offset);
            offset += 4;
            dest.push(new Selection(selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn));
        }
        return offset;
    }
    serialize() {
        let necessarySize = +4 + // beforeVersionId
            4 + // afterVersionId
            1 + // beforeEOL
            1 + // afterEOL
            SingleModelEditStackData._writeSelectionsSize(this.beforeCursorState) +
            SingleModelEditStackData._writeSelectionsSize(this.afterCursorState) +
            4; // change count
        for (const change of this.changes) {
            necessarySize += change.writeSize();
        }
        const b = new Uint8Array(necessarySize);
        let offset = 0;
        buffer.writeUInt32BE(b, this.beforeVersionId, offset);
        offset += 4;
        buffer.writeUInt32BE(b, this.afterVersionId, offset);
        offset += 4;
        buffer.writeUInt8(b, this.beforeEOL, offset);
        offset += 1;
        buffer.writeUInt8(b, this.afterEOL, offset);
        offset += 1;
        offset = SingleModelEditStackData._writeSelections(b, this.beforeCursorState, offset);
        offset = SingleModelEditStackData._writeSelections(b, this.afterCursorState, offset);
        buffer.writeUInt32BE(b, this.changes.length, offset);
        offset += 4;
        for (const change of this.changes) {
            offset = change.write(b, offset);
        }
        return b.buffer;
    }
    static deserialize(source) {
        const b = new Uint8Array(source);
        let offset = 0;
        const beforeVersionId = buffer.readUInt32BE(b, offset);
        offset += 4;
        const afterVersionId = buffer.readUInt32BE(b, offset);
        offset += 4;
        const beforeEOL = buffer.readUInt8(b, offset);
        offset += 1;
        const afterEOL = buffer.readUInt8(b, offset);
        offset += 1;
        const beforeCursorState = [];
        offset = SingleModelEditStackData._readSelections(b, offset, beforeCursorState);
        const afterCursorState = [];
        offset = SingleModelEditStackData._readSelections(b, offset, afterCursorState);
        const changeCount = buffer.readUInt32BE(b, offset);
        offset += 4;
        const changes = [];
        for (let i = 0; i < changeCount; i++) {
            offset = TextChange.read(b, offset, changes);
        }
        return new SingleModelEditStackData(beforeVersionId, afterVersionId, beforeEOL, afterEOL, beforeCursorState, afterCursorState, changes);
    }
}
export class SingleModelEditStackElement {
    get type() {
        return 0 /* UndoRedoElementType.Resource */;
    }
    get resource() {
        if (URI.isUri(this.model)) {
            return this.model;
        }
        return this.model.uri;
    }
    constructor(label, code, model, beforeCursorState) {
        this.label = label;
        this.code = code;
        this.model = model;
        this._data = SingleModelEditStackData.create(model, beforeCursorState);
    }
    toString() {
        const data = this._data instanceof SingleModelEditStackData
            ? this._data
            : SingleModelEditStackData.deserialize(this._data);
        return data.changes.map((change) => change.toString()).join(', ');
    }
    matchesResource(resource) {
        const uri = URI.isUri(this.model) ? this.model : this.model.uri;
        return uri.toString() === resource.toString();
    }
    setModel(model) {
        this.model = model;
    }
    canAppend(model) {
        return this.model === model && this._data instanceof SingleModelEditStackData;
    }
    append(model, textChanges, afterEOL, afterVersionId, afterCursorState) {
        if (this._data instanceof SingleModelEditStackData) {
            this._data.append(model, textChanges, afterEOL, afterVersionId, afterCursorState);
        }
    }
    close() {
        if (this._data instanceof SingleModelEditStackData) {
            this._data = this._data.serialize();
        }
    }
    open() {
        if (!(this._data instanceof SingleModelEditStackData)) {
            this._data = SingleModelEditStackData.deserialize(this._data);
        }
    }
    undo() {
        if (URI.isUri(this.model)) {
            // don't have a model
            throw new Error(`Invalid SingleModelEditStackElement`);
        }
        if (this._data instanceof SingleModelEditStackData) {
            this._data = this._data.serialize();
        }
        const data = SingleModelEditStackData.deserialize(this._data);
        this.model._applyUndo(data.changes, data.beforeEOL, data.beforeVersionId, data.beforeCursorState);
    }
    redo() {
        if (URI.isUri(this.model)) {
            // don't have a model
            throw new Error(`Invalid SingleModelEditStackElement`);
        }
        if (this._data instanceof SingleModelEditStackData) {
            this._data = this._data.serialize();
        }
        const data = SingleModelEditStackData.deserialize(this._data);
        this.model._applyRedo(data.changes, data.afterEOL, data.afterVersionId, data.afterCursorState);
    }
    heapSize() {
        if (this._data instanceof SingleModelEditStackData) {
            this._data = this._data.serialize();
        }
        return this._data.byteLength + 168; /*heap overhead*/
    }
}
export class MultiModelEditStackElement {
    get resources() {
        return this._editStackElementsArr.map((editStackElement) => editStackElement.resource);
    }
    constructor(label, code, editStackElements) {
        this.label = label;
        this.code = code;
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this._isOpen = true;
        this._editStackElementsArr = editStackElements.slice(0);
        this._editStackElementsMap = new Map();
        for (const editStackElement of this._editStackElementsArr) {
            const key = uriGetComparisonKey(editStackElement.resource);
            this._editStackElementsMap.set(key, editStackElement);
        }
        this._delegate = null;
    }
    setDelegate(delegate) {
        this._delegate = delegate;
    }
    prepareUndoRedo() {
        if (this._delegate) {
            return this._delegate.prepareUndoRedo(this);
        }
    }
    getMissingModels() {
        const result = [];
        for (const editStackElement of this._editStackElementsArr) {
            if (URI.isUri(editStackElement.model)) {
                result.push(editStackElement.model);
            }
        }
        return result;
    }
    matchesResource(resource) {
        const key = uriGetComparisonKey(resource);
        return this._editStackElementsMap.has(key);
    }
    setModel(model) {
        const key = uriGetComparisonKey(URI.isUri(model) ? model : model.uri);
        if (this._editStackElementsMap.has(key)) {
            this._editStackElementsMap.get(key).setModel(model);
        }
    }
    canAppend(model) {
        if (!this._isOpen) {
            return false;
        }
        const key = uriGetComparisonKey(model.uri);
        if (this._editStackElementsMap.has(key)) {
            const editStackElement = this._editStackElementsMap.get(key);
            return editStackElement.canAppend(model);
        }
        return false;
    }
    append(model, textChanges, afterEOL, afterVersionId, afterCursorState) {
        const key = uriGetComparisonKey(model.uri);
        const editStackElement = this._editStackElementsMap.get(key);
        editStackElement.append(model, textChanges, afterEOL, afterVersionId, afterCursorState);
    }
    close() {
        this._isOpen = false;
    }
    open() {
        // cannot reopen
    }
    undo() {
        this._isOpen = false;
        for (const editStackElement of this._editStackElementsArr) {
            editStackElement.undo();
        }
    }
    redo() {
        for (const editStackElement of this._editStackElementsArr) {
            editStackElement.redo();
        }
    }
    heapSize(resource) {
        const key = uriGetComparisonKey(resource);
        if (this._editStackElementsMap.has(key)) {
            const editStackElement = this._editStackElementsMap.get(key);
            return editStackElement.heapSize();
        }
        return 0;
    }
    split() {
        return this._editStackElementsArr;
    }
    toString() {
        const result = [];
        for (const editStackElement of this._editStackElementsArr) {
            result.push(`${basename(editStackElement.resource)}: ${editStackElement}`);
        }
        return `{${result.join(', ')}}`;
    }
}
function getModelEOL(model) {
    const eol = model.getEOL();
    if (eol === '\n') {
        return 0 /* EndOfLineSequence.LF */;
    }
    else {
        return 1 /* EndOfLineSequence.CRLF */;
    }
}
export function isEditStackElement(element) {
    if (!element) {
        return false;
    }
    return (element instanceof SingleModelEditStackElement || element instanceof MultiModelEditStackElement);
}
export class EditStack {
    constructor(model, undoRedoService) {
        this._model = model;
        this._undoRedoService = undoRedoService;
    }
    pushStackElement() {
        const lastElement = this._undoRedoService.getLastElement(this._model.uri);
        if (isEditStackElement(lastElement)) {
            lastElement.close();
        }
    }
    popStackElement() {
        const lastElement = this._undoRedoService.getLastElement(this._model.uri);
        if (isEditStackElement(lastElement)) {
            lastElement.open();
        }
    }
    clear() {
        this._undoRedoService.removeElements(this._model.uri);
    }
    _getOrCreateEditStackElement(beforeCursorState, group) {
        const lastElement = this._undoRedoService.getLastElement(this._model.uri);
        if (isEditStackElement(lastElement) && lastElement.canAppend(this._model)) {
            return lastElement;
        }
        const newElement = new SingleModelEditStackElement(nls.localize('edit', 'Typing'), 'undoredo.textBufferEdit', this._model, beforeCursorState);
        this._undoRedoService.pushElement(newElement, group);
        return newElement;
    }
    pushEOL(eol) {
        const editStackElement = this._getOrCreateEditStackElement(null, undefined);
        this._model.setEOL(eol);
        editStackElement.append(this._model, [], getModelEOL(this._model), this._model.getAlternativeVersionId(), null);
    }
    pushEditOperation(beforeCursorState, editOperations, cursorStateComputer, group) {
        const editStackElement = this._getOrCreateEditStackElement(beforeCursorState, group);
        const inverseEditOperations = this._model.applyEdits(editOperations, true);
        const afterCursorState = EditStack._computeCursorState(cursorStateComputer, inverseEditOperations);
        const textChanges = inverseEditOperations.map((op, index) => ({
            index: index,
            textChange: op.textChange,
        }));
        textChanges.sort((a, b) => {
            if (a.textChange.oldPosition === b.textChange.oldPosition) {
                return a.index - b.index;
            }
            return a.textChange.oldPosition - b.textChange.oldPosition;
        });
        editStackElement.append(this._model, textChanges.map((op) => op.textChange), getModelEOL(this._model), this._model.getAlternativeVersionId(), afterCursorState);
        return afterCursorState;
    }
    static _computeCursorState(cursorStateComputer, inverseEditOperations) {
        try {
            return cursorStateComputer ? cursorStateComputer(inverseEditOperations) : null;
        }
        catch (e) {
            onUnexpectedError(e);
            return null;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFN0YWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9lZGl0U3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFlaEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNsRixPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc1RCxTQUFTLG1CQUFtQixDQUFDLFFBQWE7SUFDekMsT0FBTyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7QUFDM0IsQ0FBQztBQUVELE1BQU0sT0FBTyx3QkFBd0I7SUFDN0IsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsS0FBaUIsRUFDakIsaUJBQXFDO1FBRXJDLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDNUQsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlCLE9BQU8sSUFBSSx3QkFBd0IsQ0FDbEMsb0JBQW9CLEVBQ3BCLG9CQUFvQixFQUNwQixHQUFHLEVBQ0gsR0FBRyxFQUNILGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIsRUFBRSxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsWUFDaUIsZUFBdUIsRUFDaEMsY0FBc0IsRUFDYixTQUE0QixFQUNyQyxR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