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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFNlYXJjaE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2NvbW1vbi9jZWxsU2VhcmNoTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQU0vRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQTtBQUM5SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFPakYsTUFBTSxPQUFPLGVBQWdCLFNBQVEsVUFBVTtJQUU5QyxZQUNVLE9BQWUsRUFDaEIsZ0JBQWlELEVBQ2pELFFBQWtCO1FBRTFCLEtBQUssRUFBRSxDQUFBO1FBSkUsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNoQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWlDO1FBQ2pELGFBQVEsR0FBUixRQUFRLENBQVU7UUFKbkIsdUJBQWtCLEdBQXNDLFNBQVMsQ0FBQTtJQU96RSxDQUFDO0lBRU8sa0JBQWtCLENBQUMsTUFBMkI7UUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3ZDLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxNQUEyQixFQUFFLFVBQWtCO1FBQ3hFLElBQUksVUFBVSxHQUFHLENBQUMsSUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDMUQsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUksMEJBQTBCLEVBQUUsQ0FBQTtZQUNoRCxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNqQyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEdBQUcsYUFBYSxDQUFDLE1BQU0sNkJBQXFCLENBQUE7WUFDNUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFVBQVUsQ0FBQTtZQUNsQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRUQsSUFBSSxpQkFBaUI7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUN0RCxNQUFNLE9BQU8sR0FBRyxJQUFJLDBCQUEwQixFQUFFLENBQUE7Z0JBQ2hELE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzNCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEdBQUcsYUFBYSxDQUFDLE1BQU0sNkJBQXFCLENBQUE7Z0JBQzVFLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQzFCLE9BQU8sVUFBVSxDQUFBO1lBQ2xCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFBO0lBQy9CLENBQUM7SUFFRCxZQUFZLENBQUMsTUFBYztRQUMxQixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqRSxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUNwRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDMUYsQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFjO1FBQzNCLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQ3BELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxpQkFBaUI7YUFDM0IsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDZixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQzNDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFDL0IsVUFBVSxFQUNWLElBQUksRUFDSixJQUFJLENBQ0osQ0FBQTtZQUNELElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELE9BQU87Z0JBQ04sVUFBVSxFQUFFLE1BQU07Z0JBQ2xCLE9BQU87YUFDUCxDQUFBO1FBQ0YsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUE4QixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3ZELENBQUM7Q0FDRCJ9