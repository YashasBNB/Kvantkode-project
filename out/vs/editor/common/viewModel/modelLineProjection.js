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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL21vZGVsTGluZVByb2plY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUc5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFrRTFFLE1BQU0sVUFBVSx5QkFBeUIsQ0FDeEMsYUFBNkMsRUFDN0MsU0FBa0I7SUFFbEIsSUFBSSxhQUFhLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDNUIsb0JBQW9CO1FBQ3BCLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLDJCQUEyQixDQUFDLFFBQVEsQ0FBQTtRQUM1QyxDQUFDO1FBQ0QsT0FBTyx5QkFBeUIsQ0FBQyxRQUFRLENBQUE7SUFDMUMsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLElBQUksbUJBQW1CLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3pELENBQUM7QUFDRixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sbUJBQW1CO0lBSXhCLFlBQVksYUFBc0MsRUFBRSxTQUFrQjtRQUNyRSxJQUFJLENBQUMsZUFBZSxHQUFHLGFBQWEsQ0FBQTtRQUNwQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtJQUM1QixDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDO0lBRU0sVUFBVSxDQUFDLFNBQWtCO1FB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