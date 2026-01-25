/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { compressOutputItemStreams, isTextStreamMime, } from '../notebookCommon.js';
export class NotebookCellOutputTextModel extends Disposable {
    get outputs() {
        return this._rawOutput.outputs || [];
    }
    get metadata() {
        return this._rawOutput.metadata;
    }
    get outputId() {
        return this._rawOutput.outputId;
    }
    get alternativeOutputId() {
        return this._alternativeOutputId;
    }
    get versionId() {
        return this._versionId;
    }
    constructor(_rawOutput) {
        super();
        this._rawOutput = _rawOutput;
        this._onDidChangeData = this._register(new Emitter());
        this.onDidChangeData = this._onDidChangeData.event;
        this._versionId = 0;
        // mime: versionId: buffer length
        this.versionedBufferLengths = {};
        this._alternativeOutputId = this._rawOutput.outputId;
    }
    replaceData(rawData) {
        this.versionedBufferLengths = {};
        this._rawOutput = rawData;
        this.optimizeOutputItems();
        this._versionId = this._versionId + 1;
        this._onDidChangeData.fire();
    }
    appendData(items) {
        this.trackBufferLengths();
        this._rawOutput.outputs.push(...items);
        this.optimizeOutputItems();
        this._versionId = this._versionId + 1;
        this._onDidChangeData.fire();
    }
    trackBufferLengths() {
        this.outputs.forEach((output) => {
            if (isTextStreamMime(output.mime)) {
                if (!this.versionedBufferLengths[output.mime]) {
                    this.versionedBufferLengths[output.mime] = {};
                }
                this.versionedBufferLengths[output.mime][this.versionId] = output.data.byteLength;
            }
        });
    }
    appendedSinceVersion(versionId, mime) {
        const bufferLength = this.versionedBufferLengths[mime]?.[versionId];
        const output = this.outputs.find((output) => output.mime === mime);
        if (bufferLength && output) {
            return output.data.slice(bufferLength);
        }
        return undefined;
    }
    optimizeOutputItems() {
        if (this.outputs.length > 1 && this.outputs.every((item) => isTextStreamMime(item.mime))) {
            // Look for the mimes in the items, and keep track of their order.
            // Merge the streams into one output item, per mime type.
            const mimeOutputs = new Map();
            const mimeTypes = [];
            this.outputs.forEach((item) => {
                let items;
                if (mimeOutputs.has(item.mime)) {
                    items = mimeOutputs.get(item.mime);
                }
                else {
                    items = [];
                    mimeOutputs.set(item.mime, items);
                    mimeTypes.push(item.mime);
                }
                items.push(item.data.buffer);
            });
            this.outputs.length = 0;
            mimeTypes.forEach((mime) => {
                const compressionResult = compressOutputItemStreams(mimeOutputs.get(mime));
                this.outputs.push({
                    mime,
                    data: compressionResult.data,
                });
                if (compressionResult.didCompression) {
                    // we can't rely on knowing buffer lengths if we've erased previous lines
                    this.versionedBufferLengths = {};
                }
            });
        }
    }
    asDto() {
        return {
            // data: this._data,
            metadata: this._rawOutput.metadata,
            outputs: this._rawOutput.outputs,
            outputId: this._rawOutput.outputId,
        };
    }
    bumpVersion() {
        this._versionId = this._versionId + 1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsT3V0cHV0VGV4dE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbW9kZWwvbm90ZWJvb2tDZWxsT3V0cHV0VGV4dE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUlOLHlCQUF5QixFQUN6QixnQkFBZ0IsR0FDaEIsTUFBTSxzQkFBc0IsQ0FBQTtBQUU3QixNQUFNLE9BQU8sMkJBQTRCLFNBQVEsVUFBVTtJQUkxRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQTtJQUNoQyxDQUFDO0lBT0QsSUFBSSxtQkFBbUI7UUFDdEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUE7SUFDakMsQ0FBQztJQUlELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsWUFBb0IsVUFBc0I7UUFDekMsS0FBSyxFQUFFLENBQUE7UUFEWSxlQUFVLEdBQVYsVUFBVSxDQUFZO1FBOUJsQyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUM5RCxvQkFBZSxHQUFHLElBQUksQ0FB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