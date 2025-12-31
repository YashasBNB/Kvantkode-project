/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toFormattedString } from '../../../../../base/common/jsonFormatter.js';
import { NotebookCellsChangeType, NotebookMetadataUri, } from '../notebookCommon.js';
import { StringSHA1 } from '../../../../../base/common/hash.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { createTextBuffer } from '../../../../../editor/common/model/textModel.js';
export function getFormattedNotebookMetadataJSON(transientMetadata, metadata) {
    let filteredMetadata = {};
    if (transientMetadata) {
        const keys = new Set([...Object.keys(metadata)]);
        for (const key of keys) {
            if (!transientMetadata[key]) {
                filteredMetadata[key] = metadata[key];
            }
        }
    }
    else {
        filteredMetadata = metadata;
    }
    const metadataSource = toFormattedString(filteredMetadata, {});
    return metadataSource;
}
export class NotebookDocumentMetadataTextModel extends Disposable {
    get metadata() {
        return this.notebookModel.metadata;
    }
    get textBuffer() {
        if (this._textBuffer) {
            return this._textBuffer;
        }
        const source = getFormattedNotebookMetadataJSON(this.notebookModel.transientOptions.transientDocumentMetadata, this.metadata);
        this._textBuffer = this._register(createTextBuffer(source, 1 /* DefaultEndOfLine.LF */).textBuffer);
        this._register(this._textBuffer.onDidChangeContent(() => {
            this._onDidChange.fire();
        }));
        return this._textBuffer;
    }
    constructor(notebookModel) {
        super();
        this.notebookModel = notebookModel;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._textBufferHash = null;
        this.uri = NotebookMetadataUri.generate(this.notebookModel.uri);
        this._register(this.notebookModel.onDidChangeContent((e) => {
            if (e.rawEvents.some((event) => event.kind === NotebookCellsChangeType.ChangeDocumentMetadata ||
                event.kind === NotebookCellsChangeType.ModelChange)) {
                this._textBuffer?.dispose();
                this._textBuffer = undefined;
                this._textBufferHash = null;
                this._onDidChange.fire();
            }
        }));
    }
    getHash() {
        if (this._textBufferHash !== null) {
            return this._textBufferHash;
        }
        const shaComputer = new StringSHA1();
        const snapshot = this.textBuffer.createSnapshot(false);
        let text;
        while ((text = snapshot.read())) {
            shaComputer.update(text);
        }
        this._textBufferHash = shaComputer.digest();
        return this._textBufferHash;
    }
    getValue() {
        const fullRange = this.getFullModelRange();
        const eol = this.textBuffer.getEOL();
        if (eol === '\n') {
            return this.textBuffer.getValueInRange(fullRange, 1 /* EndOfLinePreference.LF */);
        }
        else {
            return this.textBuffer.getValueInRange(fullRange, 2 /* EndOfLinePreference.CRLF */);
        }
    }
    getFullModelRange() {
        const lineCount = this.textBuffer.getLineCount();
        return new Range(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNZXRhZGF0YVRleHRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9tb2RlbC9ub3RlYm9va01ldGFkYXRhVGV4dE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQy9FLE9BQU8sRUFJTix1QkFBdUIsRUFFdkIsbUJBQW1CLEdBRW5CLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQU9wRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRWxGLE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsaUJBQXdELEVBQ3hELFFBQWtDO0lBRWxDLElBQUksZ0JBQWdCLEdBQTJCLEVBQUUsQ0FBQTtJQUVqRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQWlDLENBQUMsRUFBRSxDQUFDO2dCQUMzRCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBaUMsQ0FB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