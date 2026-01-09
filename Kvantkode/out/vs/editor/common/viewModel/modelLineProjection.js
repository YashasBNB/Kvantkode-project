/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineTokens } from '../tokens/lineTokens.js';
import { Position } from '../core/position.js';
import { LineInjectedText } from '../textModelEvents.js';
import { SingleLineInlineDecoration, ViewLineData } from '../viewModel.js';
export function createModelLineProjection(lineBreakData, isVisible) {
    if (lineBreakData === null) {
        // No mapping needed
        if (isVisible) {
            return IdentityModelLineProjection.INSTANCE;
        }
        return HiddenModelLineProjection.INSTANCE;
    }
    else {
        return new ModelLineProjection(lineBreakData, isVisible);
    }
}
/**
 * This projection is used to
 * * wrap model lines
 * * inject text
 */
class ModelLineProjection {
    constructor(lineBreakData, isVisible) {
        this._projectionData = lineBreakData;
        this._isVisible = isVisible;
    }
    isVisible() {
        return this._isVisible;
    }
    setVisible(isVisible) {
        this._isVisible = isVisible;
        return this;
    }
    getProjectionData() {
        return this._projectionData;
    }
    getViewLineCount() {
        if (!this._isVisible) {
            return 0;
        }
        return this._projectionData.getOutputLineCount();
    }
    getViewLineContent(model, modelLineNumber, outputLineIndex) {
        this._assertVisible();
        const startOffsetInInputWithInjections = outputLineIndex > 0 ? this._projectionData.breakOffsets[outputLineIndex - 1] : 0;
        const endOffsetInInputWithInjections = this._projectionData.breakOffsets[outputLineIndex];
        let r;
        if (this._projectionData.injectionOffsets !== null) {
            const injectedTexts = this._projectionData.injectionOffsets.map((offset, idx) => new LineInjectedText(0, 0, offset + 1, this._projectionData.injectionOptions[idx], 0));
            const lineWithInjections = LineInjectedText.applyInjectedText(model.getLineContent(modelLineNumber), injectedTexts);
            r = lineWithInjections.substring(startOffsetInInputWithInjections, endOffsetInInputWithInjections);
        }
        else {
            r = model.getValueInRange({
                startLineNumber: modelLineNumber,
                startColumn: startOffsetInInputWithInjections + 1,
                endLineNumber: modelLineNumber,
                endColumn: endOffsetInInputWithInjections + 1,
            });
        }
        if (outputLineIndex > 0) {
            r = spaces(this._projectionData.wrappedTextIndentLength) + r;
        }
        return r;
    }
    getViewLineLength(model, modelLineNumber, outputLineIndex) {
        this._assertVisible();
        return this._projectionData.getLineLength(outputLineIndex);
    }
    getViewLineMinColumn(_model, _modelLineNumber, outputLineIndex) {
        this._assertVisible();
        return this._projectionData.getMinOutputOffset(outputLineIndex) + 1;
    }
    getViewLineMaxColumn(model, modelLineNumber, outputLineIndex) {
        this._assertVisible();
        return this._projectionData.getMaxOutputOffset(outputLineIndex) + 1;
    }
    /**
     * Try using {@link getViewLinesData} instead.
     */
    getViewLineData(model, modelLineNumber, outputLineIndex) {
        const arr = new Array();
        this.getViewLinesData(model, modelLineNumber, outputLineIndex, 1, 0, [true], arr);
        return arr[0];
    }
    getViewLinesData(model, modelLineNumber, outputLineIdx, lineCount, globalStartIndex, needed, result) {
        this._assertVisible();
        const lineBreakData = this._projectionData;
        const injectionOffsets = lineBreakData.injectionOffsets;
        const injectionOptions = lineBreakData.injectionOptions;
        let inlineDecorationsPerOutputLine = null;
        if (injectionOffsets) {
            inlineDecorationsPerOutputLine = [];
            let totalInjectedTextLengthBefore = 0;
            let currentInjectedOffset = 0;
            for (let outputLineIndex = 0; outputLineIndex < lineBreakData.getOutputLineCount(); outputLineIndex++) {
                const inlineDecorations = new Array();
                inlineDecorationsPerOutputLine[outputLineIndex] = inlineDecorations;
                const lineStartOffsetInInputWithInjections = outputLineIndex > 0 ? lineBreakData.breakOffsets[outputLineIndex - 1] : 0;
                const lineEndOffsetInInputWithInjections = lineBreakData.breakOffsets[outputLineIndex];
                while (currentInjectedOffset < injectionOffsets.length) {
                    const length = injectionOptions[currentInjectedOffset].content.length;
                    const injectedTextStartOffsetInInputWithInjections = injectionOffsets[currentInjectedOffset] + totalInjectedTextLengthBefore;
                    const injectedTextEndOffsetInInputWithInjections = injectedTextStartOffsetInInputWithInjections + length;
                    if (injectedTextStartOffsetInInputWithInjections > lineEndOffsetInInputWithInjections) {
                        // Injected text only starts in later wrapped lines.
                        break;
                    }
                    if (lineStartOffsetInInputWithInjections < injectedTextEndOffsetInInputWithInjections) {
                        // Injected text ends after or in this line (but also starts in or before this line).
                        const options = injectionOptions[currentInjectedOffset];
                        if (options.inlineClassName) {
                            const offset = outputLineIndex > 0 ? lineBreakData.wrappedTextIndentLength : 0;
                            const start = offset +
                                Math.max(injectedTextStartOffsetInInputWithInjections -
                                    lineStartOffsetInInputWithInjections, 0);
                            const end = offset +
                                Math.min(injectedTextEndOffsetInInputWithInjections - lineStartOffsetInInputWithInjections, lineEndOffsetInInputWithInjections - lineStartOffsetInInputWithInjections);
                            if (start !== end) {
                                inlineDecorations.push(new SingleLineInlineDecoration(start, end, options.inlineClassName, options.inlineClassNameAffectsLetterSpacing));
                            }
                        }
                    }
                    if (injectedTextEndOffsetInInputWithInjections <= lineEndOffsetInInputWithInjections) {
                        totalInjectedTextLengthBefore += length;
                        currentInjectedOffset++;
                    }
                    else {
                        // injected text breaks into next line, process it again
                        break;
                    }
                }
            }
        }
        let lineWithInjections;
        if (injectionOffsets) {
            const tokensToInsert = [];
            for (let idx = 0; idx < injectionOffsets.length; idx++) {
                const offset = injectionOffsets[idx];
                const tokens = injectionOptions[idx].tokens;
                if (tokens) {
                    tokens.forEach((range, info) => {
                        tokensToInsert.push({
                            offset,
                            text: range.substring(injectionOptions[idx].content),
                            tokenMetadata: info.metadata,
                        });
                    });
                }
                else {
                    tokensToInsert.push({
                        offset,
                        text: injectionOptions[idx].content,
                        tokenMetadata: LineTokens.defaultTokenMetadata,
                    });
                }
            }
            lineWithInjections = model.tokenization
                .getLineTokens(modelLineNumber)
                .withInserted(tokensToInsert);
        }
        else {
            lineWithInjections = model.tokenization.getLineTokens(modelLineNumber);
        }
        for (let outputLineIndex = outputLineIdx; outputLineIndex < outputLineIdx + lineCount; outputLineIndex++) {
            const globalIndex = globalStartIndex + outputLineIndex - outputLineIdx;
            if (!needed[globalIndex]) {
                result[globalIndex] = null;
                continue;
            }
            result[globalIndex] = this._getViewLineData(lineWithInjections, inlineDecorationsPerOutputLine ? inlineDecorationsPerOutputLine[outputLineIndex] : null, outputLineIndex);
        }
    }
    _getViewLineData(lineWithInjections, inlineDecorations, outputLineIndex) {
        this._assertVisible();
        const lineBreakData = this._projectionData;
        const deltaStartIndex = outputLineIndex > 0 ? lineBreakData.wrappedTextIndentLength : 0;
        const lineStartOffsetInInputWithInjections = outputLineIndex > 0 ? lineBreakData.breakOffsets[outputLineIndex - 1] : 0;
        const lineEndOffsetInInputWithInjections = lineBreakData.breakOffsets[outputLineIndex];
        const tokens = lineWithInjections.sliceAndInflate(lineStartOffsetInInputWithInjections, lineEndOffsetInInputWithInjections, deltaStartIndex);
        let lineContent = tokens.getLineContent();
        if (outputLineIndex > 0) {
            lineContent = spaces(lineBreakData.wrappedTextIndentLength) + lineContent;
        }
        const minColumn = this._projectionData.getMinOutputOffset(outputLineIndex) + 1;
        const maxColumn = lineContent.length + 1;
        const continuesWithWrappedLine = outputLineIndex + 1 < this.getViewLineCount();
        const startVisibleColumn = outputLineIndex === 0 ? 0 : lineBreakData.breakOffsetsVisibleColumn[outputLineIndex - 1];
        return new ViewLineData(lineContent, continuesWithWrappedLine, minColumn, maxColumn, startVisibleColumn, tokens, inlineDecorations);
    }
    getModelColumnOfViewPosition(outputLineIndex, outputColumn) {
        this._assertVisible();
        return this._projectionData.translateToInputOffset(outputLineIndex, outputColumn - 1) + 1;
    }
    getViewPositionOfModelPosition(deltaLineNumber, inputColumn, affinity = 2 /* PositionAffinity.None */) {
        this._assertVisible();
        const r = this._projectionData.translateToOutputPosition(inputColumn - 1, affinity);
        return r.toPosition(deltaLineNumber);
    }
    getViewLineNumberOfModelPosition(deltaLineNumber, inputColumn) {
        this._assertVisible();
        const r = this._projectionData.translateToOutputPosition(inputColumn - 1);
        return deltaLineNumber + r.outputLineIndex;
    }
    normalizePosition(outputLineIndex, outputPosition, affinity) {
        const baseViewLineNumber = outputPosition.lineNumber - outputLineIndex;
        const normalizedOutputPosition = this._projectionData.normalizeOutputPosition(outputLineIndex, outputPosition.column - 1, affinity);
        const result = normalizedOutputPosition.toPosition(baseViewLineNumber);
        return result;
    }
    getInjectedTextAt(outputLineIndex, outputColumn) {
        return this._projectionData.getInjectedText(outputLineIndex, outputColumn - 1);
    }
    _assertVisible() {
        if (!this._isVisible) {
            throw new Error('Not supported');
        }
    }
}
/**
 * This projection does not change the model line.
 */
class IdentityModelLineProjection {
    static { this.INSTANCE = new IdentityModelLineProjection(); }
    constructor() { }
    isVisible() {
        return true;
    }
    setVisible(isVisible) {
        if (isVisible) {
            return this;
        }
        return HiddenModelLineProjection.INSTANCE;
    }
    getProjectionData() {
        return null;
    }
    getViewLineCount() {
        return 1;
    }
    getViewLineContent(model, modelLineNumber, _outputLineIndex) {
        return model.getLineContent(modelLineNumber);
    }
    getViewLineLength(model, modelLineNumber, _outputLineIndex) {
        return model.getLineLength(modelLineNumber);
    }
    getViewLineMinColumn(model, modelLineNumber, _outputLineIndex) {
        return model.getLineMinColumn(modelLineNumber);
    }
    getViewLineMaxColumn(model, modelLineNumber, _outputLineIndex) {
        return model.getLineMaxColumn(modelLineNumber);
    }
    getViewLineData(model, modelLineNumber, _outputLineIndex) {
        const lineTokens = model.tokenization.getLineTokens(modelLineNumber);
        const lineContent = lineTokens.getLineContent();
        return new ViewLineData(lineContent, false, 1, lineContent.length + 1, 0, lineTokens.inflate(), null);
    }
    getViewLinesData(model, modelLineNumber, _fromOuputLineIndex, _toOutputLineIndex, globalStartIndex, needed, result) {
        if (!needed[globalStartIndex]) {
            result[globalStartIndex] = null;
            return;
        }
        result[globalStartIndex] = this.getViewLineData(model, modelLineNumber, 0);
    }
    getModelColumnOfViewPosition(_outputLineIndex, outputColumn) {
        return outputColumn;
    }
    getViewPositionOfModelPosition(deltaLineNumber, inputColumn) {
        return new Position(deltaLineNumber, inputColumn);
    }
    getViewLineNumberOfModelPosition(deltaLineNumber, _inputColumn) {
        return deltaLineNumber;
    }
    normalizePosition(outputLineIndex, outputPosition, affinity) {
        return outputPosition;
    }
    getInjectedTextAt(_outputLineIndex, _outputColumn) {
        return null;
    }
}
/**
 * This projection hides the model line.
 */
class HiddenModelLineProjection {
    static { this.INSTANCE = new HiddenModelLineProjection(); }
    constructor() { }
    isVisible() {
        return false;
    }
    setVisible(isVisible) {
        if (!isVisible) {
            return this;
        }
        return IdentityModelLineProjection.INSTANCE;
    }
    getProjectionData() {
        return null;
    }
    getViewLineCount() {
        return 0;
    }
    getViewLineContent(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLineLength(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLineMinColumn(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLineMaxColumn(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLineData(_model, _modelLineNumber, _outputLineIndex) {
        throw new Error('Not supported');
    }
    getViewLinesData(_model, _modelLineNumber, _fromOuputLineIndex, _toOutputLineIndex, _globalStartIndex, _needed, _result) {
        throw new Error('Not supported');
    }
    getModelColumnOfViewPosition(_outputLineIndex, _outputColumn) {
        throw new Error('Not supported');
    }
    getViewPositionOfModelPosition(_deltaLineNumber, _inputColumn) {
        throw new Error('Not supported');
    }
    getViewLineNumberOfModelPosition(_deltaLineNumber, _inputColumn) {
        throw new Error('Not supported');
    }
    normalizePosition(outputLineIndex, outputPosition, affinity) {
        throw new Error('Not supported');
    }
    getInjectedTextAt(_outputLineIndex, _outputColumn) {
        throw new Error('Not supported');
    }
}
const _spaces = [''];
function spaces(count) {
    if (count >= _spaces.length) {
        for (let i = 1; i <= count; i++) {
            _spaces[i] = _makeSpaces(i);
        }
    }
    return _spaces[count];
}
function _makeSpaces(count) {
    return new Array(count + 1).join(' ');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwvbW9kZWxMaW5lUHJvamVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRzlDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRXhELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQWtFMUUsTUFBTSxVQUFVLHlCQUF5QixDQUN4QyxhQUE2QyxFQUM3QyxTQUFrQjtJQUVsQixJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM1QixvQkFBb0I7UUFDcEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU8sMkJBQTJCLENBQUMsUUFBUSxDQUFBO1FBQzVDLENBQUM7UUFDRCxPQUFPLHlCQUF5QixDQUFDLFFBQVEsQ0FBQTtJQUMxQyxDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDekQsQ0FBQztBQUNGLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxtQkFBbUI7SUFJeEIsWUFBWSxhQUFzQyxFQUFFLFNBQWtCO1FBQ3JFLElBQUksQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0lBQzVCLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxVQUFVLENBQUMsU0FBa0I7UUFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDM0IsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLENBQUE7SUFDakQsQ0FBQztJQUVNLGtCQUFrQixDQUN4QixLQUFtQixFQUNuQixlQUF1QixFQUN2QixlQUF1QjtRQUV2QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFFckIsTUFBTSxnQ0FBZ0MsR0FDckMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUV6RixJQUFJLENBQVMsQ0FBQTtRQUNiLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNwRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FDOUQsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FDZixJQUFJLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN2RixDQUFBO1lBQ0QsTUFBTSxrQkFBa0IsR0FBRyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FDNUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsRUFDckMsYUFBYSxDQUNiLENBQUE7WUFDRCxDQUFDLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUMvQixnQ0FBZ0MsRUFDaEMsOEJBQThCLENBQzlCLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLENBQUMsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDO2dCQUN6QixlQUFlLEVBQUUsZUFBZTtnQkFDaEMsV0FBVyxFQUFFLGdDQUFnQyxHQUFHLENBQUM7Z0JBQ2pELGFBQWEsRUFBRSxlQUFlO2dCQUM5QixTQUFTLEVBQUUsOEJBQThCLEdBQUcsQ0FBQzthQUM3QyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFFRCxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFTSxpQkFBaUIsQ0FDdkIsS0FBbUIsRUFDbkIsZUFBdUIsRUFDdkIsZUFBdUI7UUFFdkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVNLG9CQUFvQixDQUMxQixNQUFrQixFQUNsQixnQkFBd0IsRUFDeEIsZUFBdUI7UUFFdkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVNLG9CQUFvQixDQUMxQixLQUFtQixFQUNuQixlQUF1QixFQUN2QixlQUF1QjtRQUV2QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDckIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQ7O09BRUc7SUFDSSxlQUFlLENBQ3JCLEtBQW1CLEVBQ25CLGVBQXVCLEVBQ3ZCLGVBQXVCO1FBRXZCLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxFQUFnQixDQUFBO1FBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDakYsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDZCxDQUFDO0lBRU0sZ0JBQWdCLENBQ3RCLEtBQW1CLEVBQ25CLGVBQXVCLEVBQ3ZCLGFBQXFCLEVBQ3JCLFNBQWlCLEVBQ2pCLGdCQUF3QixFQUN4QixNQUFpQixFQUNqQixNQUFrQztRQUVsQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFFckIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTtRQUUxQyxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUN2RCxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUV2RCxJQUFJLDhCQUE4QixHQUEwQyxJQUFJLENBQUE7UUFFaEYsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLDhCQUE4QixHQUFHLEVBQUUsQ0FBQTtZQUNuQyxJQUFJLDZCQUE2QixHQUFHLENBQUMsQ0FBQTtZQUNyQyxJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQTtZQUU3QixLQUNDLElBQUksZUFBZSxHQUFHLENBQUMsRUFDdkIsZUFBZSxHQUFHLGFBQWEsQ0FBQyxrQkFBa0IsRUFBRSxFQUNwRCxlQUFlLEVBQUUsRUFDaEIsQ0FBQztnQkFDRixNQUFNLGlCQUFpQixHQUFHLElBQUksS0FBSyxFQUE4QixDQUFBO2dCQUNqRSw4QkFBOEIsQ0FBQyxlQUFlLENBQUMsR0FBRyxpQkFBaUIsQ0FBQTtnQkFFbkUsTUFBTSxvQ0FBb0MsR0FDekMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDMUUsTUFBTSxrQ0FBa0MsR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUV0RixPQUFPLHFCQUFxQixHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN4RCxNQUFNLE1BQU0sR0FBRyxnQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7b0JBQ3RFLE1BQU0sNENBQTRDLEdBQ2pELGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLEdBQUcsNkJBQTZCLENBQUE7b0JBQ3hFLE1BQU0sMENBQTBDLEdBQy9DLDRDQUE0QyxHQUFHLE1BQU0sQ0FBQTtvQkFFdEQsSUFBSSw0Q0FBNEMsR0FBRyxrQ0FBa0MsRUFBRSxDQUFDO3dCQUN2RixvREFBb0Q7d0JBQ3BELE1BQUs7b0JBQ04sQ0FBQztvQkFFRCxJQUFJLG9DQUFvQyxHQUFHLDBDQUEwQyxFQUFFLENBQUM7d0JBQ3ZGLHFGQUFxRjt3QkFDckYsTUFBTSxPQUFPLEdBQUcsZ0JBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQTt3QkFDeEQsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7NEJBQzdCLE1BQU0sTUFBTSxHQUFHLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBOzRCQUM5RSxNQUFNLEtBQUssR0FDVixNQUFNO2dDQUNOLElBQUksQ0FBQyxHQUFHLENBQ1AsNENBQTRDO29DQUMzQyxvQ0FBb0MsRUFDckMsQ0FBQyxDQUNELENBQUE7NEJBQ0YsTUFBTSxHQUFHLEdBQ1IsTUFBTTtnQ0FDTixJQUFJLENBQUMsR0FBRyxDQUNQLDBDQUEwQyxHQUFHLG9DQUFvQyxFQUNqRixrQ0FBa0MsR0FBRyxvQ0FBb0MsQ0FDekUsQ0FBQTs0QkFDRixJQUFJLEtBQUssS0FBSyxHQUFHLEVBQUUsQ0FBQztnQ0FDbkIsaUJBQWlCLENBQUMsSUFBSSxDQUNyQixJQUFJLDBCQUEwQixDQUM3QixLQUFLLEVBQ0wsR0FBRyxFQUNILE9BQU8sQ0FBQyxlQUFlLEVBQ3ZCLE9BQU8sQ0FBQyxtQ0FBb0MsQ0FDNUMsQ0FDRCxDQUFBOzRCQUNGLENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO29CQUVELElBQUksMENBQTBDLElBQUksa0NBQWtDLEVBQUUsQ0FBQzt3QkFDdEYsNkJBQTZCLElBQUksTUFBTSxDQUFBO3dCQUN2QyxxQkFBcUIsRUFBRSxDQUFBO29CQUN4QixDQUFDO3lCQUFNLENBQUM7d0JBQ1Asd0RBQXdEO3dCQUN4RCxNQUFLO29CQUNOLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxrQkFBOEIsQ0FBQTtRQUNsQyxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsTUFBTSxjQUFjLEdBQThELEVBQUUsQ0FBQTtZQUVwRixLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQ3hELE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNwQyxNQUFNLE1BQU0sR0FBRyxnQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7Z0JBQzVDLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTt3QkFDOUIsY0FBYyxDQUFDLElBQUksQ0FBQzs0QkFDbkIsTUFBTTs0QkFDTixJQUFJLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxnQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7NEJBQ3JELGFBQWEsRUFBRSxJQUFJLENBQUMsUUFBUTt5QkFDNUIsQ0FBQyxDQUFBO29CQUNILENBQUMsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sQ0FBQztvQkFDUCxjQUFjLENBQUMsSUFBSSxDQUFDO3dCQUNuQixNQUFNO3dCQUNOLElBQUksRUFBRSxnQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPO3dCQUNwQyxhQUFhLEVBQUUsVUFBVSxDQUFDLG9CQUFvQjtxQkFDOUMsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1lBRUQsa0JBQWtCLEdBQUcsS0FBSyxDQUFDLFlBQVk7aUJBQ3JDLGFBQWEsQ0FBQyxlQUFlLENBQUM7aUJBQzlCLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7UUFFRCxLQUNDLElBQUksZUFBZSxHQUFHLGFBQWEsRUFDbkMsZUFBZSxHQUFHLGFBQWEsR0FBRyxTQUFTLEVBQzNDLGVBQWUsRUFBRSxFQUNoQixDQUFDO1lBQ0YsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLEdBQUcsZUFBZSxHQUFHLGFBQWEsQ0FBQTtZQUN0RSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUE7Z0JBQzFCLFNBQVE7WUFDVCxDQUFDO1lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FDMUMsa0JBQWtCLEVBQ2xCLDhCQUE4QixDQUFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUN2RixlQUFlLENBQ2YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLGtCQUE4QixFQUM5QixpQkFBc0QsRUFDdEQsZUFBdUI7UUFFdkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3JCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7UUFDMUMsTUFBTSxlQUFlLEdBQUcsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdkYsTUFBTSxvQ0FBb0MsR0FDekMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLGtDQUFrQyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDdEYsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsZUFBZSxDQUNoRCxvQ0FBb0MsRUFDcEMsa0NBQWtDLEVBQ2xDLGVBQWUsQ0FDZixDQUFBO1FBRUQsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3pDLElBQUksZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLFdBQVcsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsV0FBVyxDQUFBO1FBQzFFLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5RSxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUN4QyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDOUUsTUFBTSxrQkFBa0IsR0FDdkIsZUFBZSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMseUJBQXlCLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRXpGLE9BQU8sSUFBSSxZQUFZLENBQ3RCLFdBQVcsRUFDWCx3QkFBd0IsRUFDeEIsU0FBUyxFQUNULFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIsTUFBTSxFQUNOLGlCQUFpQixDQUNqQixDQUFBO0lBQ0YsQ0FBQztJQUVNLDRCQUE0QixDQUFDLGVBQXVCLEVBQUUsWUFBb0I7UUFDaEYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLEVBQUUsWUFBWSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBRU0sOEJBQThCLENBQ3BDLGVBQXVCLEVBQ3ZCLFdBQW1CLEVBQ25CLHdDQUFrRDtRQUVsRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDckIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ25GLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRU0sZ0NBQWdDLENBQUMsZUFBdUIsRUFBRSxXQUFtQjtRQUNuRixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDckIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDekUsT0FBTyxlQUFlLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQTtJQUMzQyxDQUFDO0lBRU0saUJBQWlCLENBQ3ZCLGVBQXVCLEVBQ3ZCLGNBQXdCLEVBQ3hCLFFBQTBCO1FBRTFCLE1BQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLFVBQVUsR0FBRyxlQUFlLENBQUE7UUFDdEUsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUM1RSxlQUFlLEVBQ2YsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ3pCLFFBQVEsQ0FDUixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsd0JBQXdCLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDdEUsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0saUJBQWlCLENBQUMsZUFBdUIsRUFBRSxZQUFvQjtRQUNyRSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sMkJBQTJCO2FBQ1QsYUFBUSxHQUFHLElBQUksMkJBQTJCLEVBQUUsQ0FBQTtJQUVuRSxnQkFBdUIsQ0FBQztJQUVqQixTQUFTO1FBQ2YsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sVUFBVSxDQUFDLFNBQWtCO1FBQ25DLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLHlCQUF5QixDQUFDLFFBQVEsQ0FBQTtJQUMxQyxDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLGdCQUFnQjtRQUN0QixPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFTSxrQkFBa0IsQ0FDeEIsS0FBbUIsRUFDbkIsZUFBdUIsRUFDdkIsZ0JBQXdCO1FBRXhCLE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRU0saUJBQWlCLENBQ3ZCLEtBQW1CLEVBQ25CLGVBQXVCLEVBQ3ZCLGdCQUF3QjtRQUV4QixPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVNLG9CQUFvQixDQUMxQixLQUFtQixFQUNuQixlQUF1QixFQUN2QixnQkFBd0I7UUFFeEIsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVNLG9CQUFvQixDQUMxQixLQUFtQixFQUNuQixlQUF1QixFQUN2QixnQkFBd0I7UUFFeEIsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVNLGVBQWUsQ0FDckIsS0FBbUIsRUFDbkIsZUFBdUIsRUFDdkIsZ0JBQXdCO1FBRXhCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUMvQyxPQUFPLElBQUksWUFBWSxDQUN0QixXQUFXLEVBQ1gsS0FBSyxFQUNMLENBQUMsRUFDRCxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDdEIsQ0FBQyxFQUNELFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFDcEIsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDO0lBRU0sZ0JBQWdCLENBQ3RCLEtBQW1CLEVBQ25CLGVBQXVCLEVBQ3ZCLG1CQUEyQixFQUMzQixrQkFBMEIsRUFDMUIsZ0JBQXdCLEVBQ3hCLE1BQWlCLEVBQ2pCLE1BQWtDO1FBRWxDLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQTtZQUMvQixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRU0sNEJBQTRCLENBQUMsZ0JBQXdCLEVBQUUsWUFBb0I7UUFDakYsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQUVNLDhCQUE4QixDQUFDLGVBQXVCLEVBQUUsV0FBbUI7UUFDakYsT0FBTyxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVNLGdDQUFnQyxDQUFDLGVBQXVCLEVBQUUsWUFBb0I7UUFDcEYsT0FBTyxlQUFlLENBQUE7SUFDdkIsQ0FBQztJQUVNLGlCQUFpQixDQUN2QixlQUF1QixFQUN2QixjQUF3QixFQUN4QixRQUEwQjtRQUUxQixPQUFPLGNBQWMsQ0FBQTtJQUN0QixDQUFDO0lBRU0saUJBQWlCLENBQUMsZ0JBQXdCLEVBQUUsYUFBcUI7UUFDdkUsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSx5QkFBeUI7YUFDUCxhQUFRLEdBQUcsSUFBSSx5QkFBeUIsRUFBRSxDQUFBO0lBRWpFLGdCQUF1QixDQUFDO0lBRWpCLFNBQVM7UUFDZixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxVQUFVLENBQUMsU0FBa0I7UUFDbkMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sMkJBQTJCLENBQUMsUUFBUSxDQUFBO0lBQzVDLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUVNLGtCQUFrQixDQUN4QixNQUFvQixFQUNwQixnQkFBd0IsRUFDeEIsZ0JBQXdCO1FBRXhCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLGlCQUFpQixDQUN2QixNQUFvQixFQUNwQixnQkFBd0IsRUFDeEIsZ0JBQXdCO1FBRXhCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLG9CQUFvQixDQUMxQixNQUFvQixFQUNwQixnQkFBd0IsRUFDeEIsZ0JBQXdCO1FBRXhCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLG9CQUFvQixDQUMxQixNQUFvQixFQUNwQixnQkFBd0IsRUFDeEIsZ0JBQXdCO1FBRXhCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLGVBQWUsQ0FDckIsTUFBb0IsRUFDcEIsZ0JBQXdCLEVBQ3hCLGdCQUF3QjtRQUV4QixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFTSxnQkFBZ0IsQ0FDdEIsTUFBb0IsRUFDcEIsZ0JBQXdCLEVBQ3hCLG1CQUEyQixFQUMzQixrQkFBMEIsRUFDMUIsaUJBQXlCLEVBQ3pCLE9BQWtCLEVBQ2xCLE9BQXVCO1FBRXZCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLDRCQUE0QixDQUFDLGdCQUF3QixFQUFFLGFBQXFCO1FBQ2xGLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLDhCQUE4QixDQUFDLGdCQUF3QixFQUFFLFlBQW9CO1FBQ25GLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLGdDQUFnQyxDQUFDLGdCQUF3QixFQUFFLFlBQW9CO1FBQ3JGLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLGlCQUFpQixDQUN2QixlQUF1QixFQUN2QixjQUF3QixFQUN4QixRQUEwQjtRQUUxQixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxnQkFBd0IsRUFBRSxhQUFxQjtRQUN2RSxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7O0FBR0YsTUFBTSxPQUFPLEdBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUM5QixTQUFTLE1BQU0sQ0FBQyxLQUFhO0lBQzVCLElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1QixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ3RCLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFhO0lBQ2pDLE9BQU8sSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUN0QyxDQUFDIn0=