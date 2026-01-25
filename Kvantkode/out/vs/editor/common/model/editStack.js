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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFN0YWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2VkaXRTdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQWVoRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFVBQVUsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2xGLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUE7QUFFeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzVELFNBQVMsbUJBQW1CLENBQUMsUUFBYTtJQUN6QyxPQUFPLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtBQUMzQixDQUFDO0FBRUQsTUFBTSxPQUFPLHdCQUF3QjtJQUM3QixNQUFNLENBQUMsTUFBTSxDQUNuQixLQUFpQixFQUNqQixpQkFBcUM7UUFFckMsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUM1RCxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUIsT0FBTyxJQUFJLHdCQUF3QixDQUNsQyxvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLEdBQUcsRUFDSCxHQUFHLEVBQ0gsaUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQixFQUFFLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxZQUNpQixlQUF1QixFQUNoQyxjQUFzQixFQUNiLFNBQTRCLEVBQ3JDLFFBQTJCLEVBQ2xCLGlCQUFxQyxFQUM5QyxnQkFBb0MsRUFDcEMsT0FBcUI7UUFOWixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUNoQyxtQkFBYyxHQUFkLGNBQWMsQ0FBUTtRQUNiLGNBQVMsR0FBVCxTQUFTLENBQW1CO1FBQ3JDLGFBQVEsR0FBUixRQUFRLENBQW1CO1FBQ2xCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDOUMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFvQjtRQUNwQyxZQUFPLEdBQVAsT0FBTyxDQUFjO0lBQzFCLENBQUM7SUFFRyxNQUFNLENBQ1osS0FBaUIsRUFDakIsV0FBeUIsRUFDekIsUUFBMkIsRUFDM0IsY0FBc0IsRUFDdEIsZ0JBQW9DO1FBRXBDLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLDhCQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDekUsQ0FBQztRQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQTtJQUN6QyxDQUFDO0lBRU8sTUFBTSxDQUFDLG9CQUFvQixDQUFDLFVBQThCO1FBQ2pFLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFTyxNQUFNLENBQUMsZ0JBQWdCLENBQzlCLENBQWEsRUFDYixVQUE4QixFQUM5QixNQUFjO1FBRWQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbkUsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUNYLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUNuRSxNQUFNLElBQUksQ0FBQyxDQUFBO2dCQUNYLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDL0QsTUFBTSxJQUFJLENBQUMsQ0FBQTtnQkFDWCxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQzdELE1BQU0sSUFBSSxDQUFDLENBQUE7Z0JBQ1gsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDekQsTUFBTSxJQUFJLENBQUMsQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFhLEVBQUUsTUFBYyxFQUFFLElBQWlCO1FBQzlFLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLE1BQU0sSUFBSSxDQUFDLENBQUE7UUFDWCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEMsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMvRCxNQUFNLElBQUksQ0FBQyxDQUFBO1lBQ1gsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMzRCxNQUFNLElBQUksQ0FBQyxDQUFBO1lBQ1gsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN6RCxNQUFNLElBQUksQ0FBQyxDQUFBO1lBQ1gsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDckQsTUFBTSxJQUFJLENBQUMsQ0FBQTtZQUNYLElBQUksQ0FBQyxJQUFJLENBQ1IsSUFBSSxTQUFTLENBQ1osd0JBQXdCLEVBQ3hCLG9CQUFvQixFQUNwQixrQkFBa0IsRUFDbEIsY0FBYyxDQUNkLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTSxTQUFTO1FBQ2YsSUFBSSxhQUFhLEdBQ2hCLENBQUMsQ0FBQyxHQUFHLGtCQUFrQjtZQUN2QixDQUFDLEdBQUcsaUJBQWlCO1lBQ3JCLENBQUMsR0FBRyxZQUFZO1lBQ2hCLENBQUMsR0FBRyxXQUFXO1lBQ2Ysd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3JFLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUNwRSxDQUFDLENBQUEsQ0FBQyxlQUFlO1FBQ2xCLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLGFBQWEsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDcEMsQ0FBQztRQUVELE1BQU0sQ0FBQyxHQUFHLElBQUksVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3ZDLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNkLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUNYLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDcEQsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUNYLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUMsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUNYLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDM0MsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUNYLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3BELE1BQU0sSUFBSSxDQUFDLENBQUE7UUFDWCxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDakMsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtJQUNoQixDQUFDO0lBRU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFtQjtRQUM1QyxNQUFNLENBQUMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoQyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDZCxNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0RCxNQUFNLElBQUksQ0FBQyxDQUFBO1FBQ1gsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUNYLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdDLE1BQU0sSUFBSSxDQUFDLENBQUE7UUFDWCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM1QyxNQUFNLElBQUksQ0FBQyxDQUFBO1FBQ1gsTUFBTSxpQkFBaUIsR0FBZ0IsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sZ0JBQWdCLEdBQWdCLEVBQUUsQ0FBQTtRQUN4QyxNQUFNLEdBQUcsd0JBQXdCLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUM5RSxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsRCxNQUFNLElBQUksQ0FBQyxDQUFBO1FBQ1gsTUFBTSxPQUFPLEdBQWlCLEVBQUUsQ0FBQTtRQUNoQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLHdCQUF3QixDQUNsQyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFNBQVMsRUFDVCxRQUFRLEVBQ1IsaUJBQWlCLEVBQ2pCLGdCQUFnQixFQUNoQixPQUFPLENBQ1AsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQU1ELE1BQU0sT0FBTywyQkFBMkI7SUFJdkMsSUFBVyxJQUFJO1FBQ2QsNENBQW1DO0lBQ3BDLENBQUM7SUFFRCxJQUFXLFFBQVE7UUFDbEIsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUNsQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQTtJQUN0QixDQUFDO0lBRUQsWUFDaUIsS0FBYSxFQUNiLElBQVksRUFDNUIsS0FBaUIsRUFDakIsaUJBQXFDO1FBSHJCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixTQUFJLEdBQUosSUFBSSxDQUFRO1FBSTVCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxLQUFLLEdBQUcsd0JBQXdCLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFTSxRQUFRO1FBQ2QsTUFBTSxJQUFJLEdBQ1QsSUFBSSxDQUFDLEtBQUssWUFBWSx3QkFBd0I7WUFDN0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQ1osQ0FBQyxDQUFDLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDcEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFTSxlQUFlLENBQUMsUUFBYTtRQUNuQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUE7UUFDL0QsT0FBTyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQzlDLENBQUM7SUFFTSxRQUFRLENBQUMsS0FBdUI7UUFDdEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7SUFDbkIsQ0FBQztJQUVNLFNBQVMsQ0FBQyxLQUFpQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLFlBQVksd0JBQXdCLENBQUE7SUFDOUUsQ0FBQztJQUVNLE1BQU0sQ0FDWixLQUFpQixFQUNqQixXQUF5QixFQUN6QixRQUEyQixFQUMzQixjQUFzQixFQUN0QixnQkFBb0M7UUFFcEMsSUFBSSxJQUFJLENBQUMsS0FBSyxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDbEYsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxJQUFJLENBQUMsS0FBSyxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDO0lBRU0sSUFBSTtRQUNWLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksd0JBQXdCLENBQUMsRUFBRSxDQUFDO1lBQ3ZELElBQUksQ0FBQyxLQUFLLEdBQUcsd0JBQXdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM5RCxDQUFDO0lBQ0YsQ0FBQztJQUVNLElBQUk7UUFDVixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IscUJBQXFCO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsS0FBSyxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3BDLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUNwQixJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxTQUFTLEVBQ2QsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFBO0lBQ0YsQ0FBQztJQUVNLElBQUk7UUFDVixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IscUJBQXFCO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsS0FBSyxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3BDLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFFTSxRQUFRO1FBQ2QsSUFBSSxJQUFJLENBQUMsS0FBSyxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3BDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQSxDQUFDLGlCQUFpQjtJQUNyRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMEJBQTBCO0lBU3RDLElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUVELFlBQ2lCLEtBQWEsRUFDYixJQUFZLEVBQzVCLGlCQUFnRDtRQUZoQyxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsU0FBSSxHQUFKLElBQUksQ0FBUTtRQWRiLFNBQUkseUNBQWdDO1FBaUJuRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtRQUNuQixJQUFJLENBQUMscUJBQXFCLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBdUMsQ0FBQTtRQUMzRSxLQUFLLE1BQU0sZ0JBQWdCLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDM0QsTUFBTSxHQUFHLEdBQUcsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7SUFDdEIsQ0FBQztJQUVNLFdBQVcsQ0FBQyxRQUEyQjtRQUM3QyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtJQUMxQixDQUFDO0lBRU0sZUFBZTtRQUNyQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQTtRQUN4QixLQUFLLE1BQU0sZ0JBQWdCLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDM0QsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDcEMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTSxlQUFlLENBQUMsUUFBYTtRQUNuQyxNQUFNLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6QyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUF1QjtRQUN0QyxNQUFNLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNyRSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVNLFNBQVMsQ0FBQyxLQUFpQjtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE1BQU0sR0FBRyxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMxQyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUE7WUFDN0QsT0FBTyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekMsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLE1BQU0sQ0FDWixLQUFpQixFQUNqQixXQUF5QixFQUN6QixRQUEyQixFQUMzQixjQUFzQixFQUN0QixnQkFBb0M7UUFFcEMsTUFBTSxHQUFHLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQTtRQUM3RCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDeEYsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtJQUNyQixDQUFDO0lBRU0sSUFBSTtRQUNWLGdCQUFnQjtJQUNqQixDQUFDO0lBRU0sSUFBSTtRQUNWLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO1FBRXBCLEtBQUssTUFBTSxnQkFBZ0IsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUMzRCxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVNLElBQUk7UUFDVixLQUFLLE1BQU0sZ0JBQWdCLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDM0QsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFFTSxRQUFRLENBQUMsUUFBYTtRQUM1QixNQUFNLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6QyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUE7WUFDN0QsT0FBTyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNuQyxDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBRU0sS0FBSztRQUNYLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFBO0lBQ2xDLENBQUM7SUFFTSxRQUFRO1FBQ2QsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBQzNCLEtBQUssTUFBTSxnQkFBZ0IsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUMzRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtRQUMzRSxDQUFDO1FBQ0QsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNoQyxDQUFDO0NBQ0Q7QUFJRCxTQUFTLFdBQVcsQ0FBQyxLQUFpQjtJQUNyQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDMUIsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDbEIsb0NBQTJCO0lBQzVCLENBQUM7U0FBTSxDQUFDO1FBQ1Asc0NBQTZCO0lBQzlCLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUNqQyxPQUFvRTtJQUVwRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxPQUFPLENBQ04sT0FBTyxZQUFZLDJCQUEyQixJQUFJLE9BQU8sWUFBWSwwQkFBMEIsQ0FDL0YsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUlyQixZQUFZLEtBQWdCLEVBQUUsZUFBaUM7UUFDOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQTtJQUN4QyxDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN6RSxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDckMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU0sZUFBZTtRQUNyQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDekUsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3JDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVPLDRCQUE0QixDQUNuQyxpQkFBcUMsRUFDckMsS0FBZ0M7UUFFaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pFLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMzRSxPQUFPLFdBQVcsQ0FBQTtRQUNuQixDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSwyQkFBMkIsQ0FDakQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLEVBQzlCLHlCQUF5QixFQUN6QixJQUFJLENBQUMsTUFBTSxFQUNYLGlCQUFpQixDQUNqQixDQUFBO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsT0FBTyxVQUFVLENBQUE7SUFDbEIsQ0FBQztJQUVNLE9BQU8sQ0FBQyxHQUFzQjtRQUNwQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDM0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdkIsZ0JBQWdCLENBQUMsTUFBTSxDQUN0QixJQUFJLENBQUMsTUFBTSxFQUNYLEVBQUUsRUFDRixXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLEVBQ3JDLElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQztJQUVNLGlCQUFpQixDQUN2QixpQkFBcUMsRUFDckMsY0FBc0MsRUFDdEMsbUJBQWdELEVBQ2hELEtBQXFCO1FBRXJCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFFLE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLG1CQUFtQixDQUNyRCxtQkFBbUIsRUFDbkIscUJBQXFCLENBQ3JCLENBQUE7UUFDRCxNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdELEtBQUssRUFBRSxLQUFLO1lBQ1osVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVO1NBQ3pCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6QixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzNELE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO1lBQ3pCLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFBO1FBQzNELENBQUMsQ0FBQyxDQUFBO1FBQ0YsZ0JBQWdCLENBQUMsTUFBTSxDQUN0QixJQUFJLENBQUMsTUFBTSxFQUNYLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFDdEMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxFQUNyQyxnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUNELE9BQU8sZ0JBQWdCLENBQUE7SUFDeEIsQ0FBQztJQUVPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDakMsbUJBQWdELEVBQ2hELHFCQUE0QztRQUU1QyxJQUFJLENBQUM7WUFDSixPQUFPLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDL0UsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==