/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { PieceTreeTextBufferBuilder } from '../../../../editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder.js';
import { SearchParams } from '../../../../editor/common/model/textModelSearch.js';
export class CellSearchModel extends Disposable {
    constructor(_source, _inputTextBuffer, _outputs) {
        super();
        this._source = _source;
        this._inputTextBuffer = _inputTextBuffer;
        this._outputs = _outputs;
        this._outputTextBuffers = undefined;
    }
    _getFullModelRange(buffer) {
        const lineCount = buffer.getLineCount();
        return new Range(1, 1, lineCount, this._getLineMaxColumn(buffer, lineCount));
    }
    _getLineMaxColumn(buffer, lineNumber) {
        if (lineNumber < 1 || lineNumber > buffer.getLineCount()) {
            throw new Error('Illegal value for lineNumber');
        }
        return buffer.getLineLength(lineNumber) + 1;
    }
    get inputTextBuffer() {
        if (!this._inputTextBuffer) {
            const builder = new PieceTreeTextBufferBuilder();
            builder.acceptChunk(this._source);
            const bufferFactory = builder.finish(true);
            const { textBuffer, disposable } = bufferFactory.create(1 /* DefaultEndOfLine.LF */);
            this._inputTextBuffer = textBuffer;
            this._register(disposable);
        }
        return this._inputTextBuffer;
    }
    get outputTextBuffers() {
        if (!this._outputTextBuffers) {
            this._outputTextBuffers = this._outputs.map((output) => {
                const builder = new PieceTreeTextBufferBuilder();
                builder.acceptChunk(output);
                const bufferFactory = builder.finish(true);
                const { textBuffer, disposable } = bufferFactory.create(1 /* DefaultEndOfLine.LF */);
                this._register(disposable);
                return textBuffer;
            });
        }
        return this._outputTextBuffers;
    }
    findInInputs(target) {
        const searchParams = new SearchParams(target, false, false, null);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        const fullInputRange = this._getFullModelRange(this.inputTextBuffer);
        return this.inputTextBuffer.findMatchesLineByLine(fullInputRange, searchData, true, 5000);
    }
    findInOutputs(target) {
        const searchParams = new SearchParams(target, false, false, null);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        return this.outputTextBuffers
            .map((buffer) => {
            const matches = buffer.findMatchesLineByLine(this._getFullModelRange(buffer), searchData, true, 5000);
            if (matches.length === 0) {
                return undefined;
            }
            return {
                textBuffer: buffer,
                matches,
            };
        })
            .filter((item) => !!item);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFNlYXJjaE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvY29tbW9uL2NlbGxTZWFyY2hNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBTS9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1GQUFtRixDQUFBO0FBQzlILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQU9qRixNQUFNLE9BQU8sZUFBZ0IsU0FBUSxVQUFVO0lBRTlDLFlBQ1UsT0FBZSxFQUNoQixnQkFBaUQsRUFDakQsUUFBa0I7UUFFMUIsS0FBSyxFQUFFLENBQUE7UUFKRSxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2hCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBaUM7UUFDakQsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUpuQix1QkFBa0IsR0FBc0MsU0FBUyxDQUFBO0lBT3pFLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxNQUEyQjtRQUNyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDdkMsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE1BQTJCLEVBQUUsVUFBa0I7UUFDeEUsSUFBSSxVQUFVLEdBQUcsQ0FBQyxJQUFJLFVBQVUsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUMx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