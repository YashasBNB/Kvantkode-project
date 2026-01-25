/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { IndentGuide, IndentGuideHorizontalLine, } from '../textModelGuides.js';
import { ModelDecorationOptions } from '../model/textModel.js';
import { LineInjectedText } from '../textModelEvents.js';
import * as viewEvents from '../viewEvents.js';
import { createModelLineProjection } from './modelLineProjection.js';
import { ConstantTimePrefixSumComputer } from '../model/prefixSumComputer.js';
import { ViewLineData } from '../viewModel.js';
export class ViewModelLinesFromProjectedModel {
    constructor(editorId, model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, fontInfo, tabSize, wrappingStrategy, wrappingColumn, wrappingIndent, wordBreak) {
        this._editorId = editorId;
        this.model = model;
        this._validModelVersionId = -1;
        this._domLineBreaksComputerFactory = domLineBreaksComputerFactory;
        this._monospaceLineBreaksComputerFactory = monospaceLineBreaksComputerFactory;
        this.fontInfo = fontInfo;
        this.tabSize = tabSize;
        this.wrappingStrategy = wrappingStrategy;
        this.wrappingColumn = wrappingColumn;
        this.wrappingIndent = wrappingIndent;
        this.wordBreak = wordBreak;
        this._constructLines(/*resetHiddenAreas*/ true, null);
    }
    dispose() {
        this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, []);
    }
    createCoordinatesConverter() {
        return new CoordinatesConverter(this);
    }
    _constructLines(resetHiddenAreas, previousLineBreaks) {
        this.modelLineProjections = [];
        if (resetHiddenAreas) {
            this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, []);
        }
        const linesContent = this.model.getLinesContent();
        const injectedTextDecorations = this.model.getInjectedTextDecorations(this._editorId);
        const lineCount = linesContent.length;
        const lineBreaksComputer = this.createLineBreaksComputer();
        const injectedTextQueue = new arrays.ArrayQueue(LineInjectedText.fromDecorations(injectedTextDecorations));
        for (let i = 0; i < lineCount; i++) {
            const lineInjectedText = injectedTextQueue.takeWhile((t) => t.lineNumber === i + 1);
            lineBreaksComputer.addRequest(linesContent[i], lineInjectedText, previousLineBreaks ? previousLineBreaks[i] : null);
        }
        const linesBreaks = lineBreaksComputer.finalize();
        const values = [];
        const hiddenAreas = this.hiddenAreasDecorationIds
            .map((areaId) => this.model.getDecorationRange(areaId))
            .sort(Range.compareRangesUsingStarts);
        let hiddenAreaStart = 1, hiddenAreaEnd = 0;
        let hiddenAreaIdx = -1;
        let nextLineNumberToUpdateHiddenArea = hiddenAreaIdx + 1 < hiddenAreas.length ? hiddenAreaEnd + 1 : lineCount + 2;
        for (let i = 0; i < lineCount; i++) {
            const lineNumber = i + 1;
            if (lineNumber === nextLineNumberToUpdateHiddenArea) {
                hiddenAreaIdx++;
                hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumber;
                hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumber;
                nextLineNumberToUpdateHiddenArea =
                    hiddenAreaIdx + 1 < hiddenAreas.length ? hiddenAreaEnd + 1 : lineCount + 2;
            }
            const isInHiddenArea = lineNumber >= hiddenAreaStart && lineNumber <= hiddenAreaEnd;
            const line = createModelLineProjection(linesBreaks[i], !isInHiddenArea);
            values[i] = line.getViewLineCount();
            this.modelLineProjections[i] = line;
        }
        this._validModelVersionId = this.model.getVersionId();
        this.projectedModelLineLineCounts = new ConstantTimePrefixSumComputer(values);
    }
    getHiddenAreas() {
        return this.hiddenAreasDecorationIds.map((decId) => this.model.getDecorationRange(decId));
    }
    setHiddenAreas(_ranges) {
        const validatedRanges = _ranges.map((r) => this.model.validateRange(r));
        const newRanges = normalizeLineRanges(validatedRanges);
        // TODO@Martin: Please stop calling this method on each model change!
        // This checks if there really was a change
        const oldRanges = this.hiddenAreasDecorationIds
            .map((areaId) => this.model.getDecorationRange(areaId))
            .sort(Range.compareRangesUsingStarts);
        if (newRanges.length === oldRanges.length) {
            let hasDifference = false;
            for (let i = 0; i < newRanges.length; i++) {
                if (!newRanges[i].equalsRange(oldRanges[i])) {
                    hasDifference = true;
                    break;
                }
            }
            if (!hasDifference) {
                return false;
            }
        }
        const newDecorations = newRanges.map((r) => ({
            range: r,
            options: ModelDecorationOptions.EMPTY,
        }));
        this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, newDecorations);
        const hiddenAreas = newRanges;
        let hiddenAreaStart = 1, hiddenAreaEnd = 0;
        let hiddenAreaIdx = -1;
        let nextLineNumberToUpdateHiddenArea = hiddenAreaIdx + 1 < hiddenAreas.length
            ? hiddenAreaEnd + 1
            : this.modelLineProjections.length + 2;
        let hasVisibleLine = false;
        for (let i = 0; i < this.modelLineProjections.length; i++) {
            const lineNumber = i + 1;
            if (lineNumber === nextLineNumberToUpdateHiddenArea) {
                hiddenAreaIdx++;
                hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumber;
                hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumber;
                nextLineNumberToUpdateHiddenArea =
                    hiddenAreaIdx + 1 < hiddenAreas.length
                        ? hiddenAreaEnd + 1
                        : this.modelLineProjections.length + 2;
            }
            let lineChanged = false;
            if (lineNumber >= hiddenAreaStart && lineNumber <= hiddenAreaEnd) {
                // Line should be hidden
                if (this.modelLineProjections[i].isVisible()) {
                    this.modelLineProjections[i] = this.modelLineProjections[i].setVisible(false);
                    lineChanged = true;
                }
            }
            else {
                hasVisibleLine = true;
                // Line should be visible
                if (!this.modelLineProjections[i].isVisible()) {
                    this.modelLineProjections[i] = this.modelLineProjections[i].setVisible(true);
                    lineChanged = true;
                }
            }
            if (lineChanged) {
                const newOutputLineCount = this.modelLineProjections[i].getViewLineCount();
                this.projectedModelLineLineCounts.setValue(i, newOutputLineCount);
            }
        }
        if (!hasVisibleLine) {
            // Cannot have everything be hidden => reveal everything!
            this.setHiddenAreas([]);
        }
        return true;
    }
    modelPositionIsVisible(modelLineNumber, _modelColumn) {
        if (modelLineNumber < 1 || modelLineNumber > this.modelLineProjections.length) {
            // invalid arguments
            return false;
        }
        return this.modelLineProjections[modelLineNumber - 1].isVisible();
    }
    getModelLineViewLineCount(modelLineNumber) {
        if (modelLineNumber < 1 || modelLineNumber > this.modelLineProjections.length) {
            // invalid arguments
            return 1;
        }
        return this.modelLineProjections[modelLineNumber - 1].getViewLineCount();
    }
    setTabSize(newTabSize) {
        if (this.tabSize === newTabSize) {
            return false;
        }
        this.tabSize = newTabSize;
        this._constructLines(/*resetHiddenAreas*/ false, null);
        return true;
    }
    setWrappingSettings(fontInfo, wrappingStrategy, wrappingColumn, wrappingIndent, wordBreak) {
        const equalFontInfo = this.fontInfo.equals(fontInfo);
        const equalWrappingStrategy = this.wrappingStrategy === wrappingStrategy;
        const equalWrappingColumn = this.wrappingColumn === wrappingColumn;
        const equalWrappingIndent = this.wrappingIndent === wrappingIndent;
        const equalWordBreak = this.wordBreak === wordBreak;
        if (equalFontInfo &&
            equalWrappingStrategy &&
            equalWrappingColumn &&
            equalWrappingIndent &&
            equalWordBreak) {
            return false;
        }
        const onlyWrappingColumnChanged = equalFontInfo &&
            equalWrappingStrategy &&
            !equalWrappingColumn &&
            equalWrappingIndent &&
            equalWordBreak;
        this.fontInfo = fontInfo;
        this.wrappingStrategy = wrappingStrategy;
        this.wrappingColumn = wrappingColumn;
        this.wrappingIndent = wrappingIndent;
        this.wordBreak = wordBreak;
        let previousLineBreaks = null;
        if (onlyWrappingColumnChanged) {
            previousLineBreaks = [];
            for (let i = 0, len = this.modelLineProjections.length; i < len; i++) {
                previousLineBreaks[i] = this.modelLineProjections[i].getProjectionData();
            }
        }
        this._constructLines(/*resetHiddenAreas*/ false, previousLineBreaks);
        return true;
    }
    createLineBreaksComputer() {
        const lineBreaksComputerFactory = this.wrappingStrategy === 'advanced'
            ? this._domLineBreaksComputerFactory
            : this._monospaceLineBreaksComputerFactory;
        return lineBreaksComputerFactory.createLineBreaksComputer(this.fontInfo, this.tabSize, this.wrappingColumn, this.wrappingIndent, this.wordBreak);
    }
    onModelFlushed() {
        this._constructLines(/*resetHiddenAreas*/ true, null);
    }
    onModelLinesDeleted(versionId, fromLineNumber, toLineNumber) {
        if (!versionId || versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return null;
        }
        const outputFromLineNumber = fromLineNumber === 1
            ? 1
            : this.projectedModelLineLineCounts.getPrefixSum(fromLineNumber - 1) + 1;
        const outputToLineNumber = this.projectedModelLineLineCounts.getPrefixSum(toLineNumber);
        this.modelLineProjections.splice(fromLineNumber - 1, toLineNumber - fromLineNumber + 1);
        this.projectedModelLineLineCounts.removeValues(fromLineNumber - 1, toLineNumber - fromLineNumber + 1);
        return new viewEvents.ViewLinesDeletedEvent(outputFromLineNumber, outputToLineNumber);
    }
    onModelLinesInserted(versionId, fromLineNumber, _toLineNumber, lineBreaks) {
        if (!versionId || versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return null;
        }
        // cannot use this.getHiddenAreas() because those decorations have already seen the effect of this model change
        const isInHiddenArea = fromLineNumber > 2 && !this.modelLineProjections[fromLineNumber - 2].isVisible();
        const outputFromLineNumber = fromLineNumber === 1
            ? 1
            : this.projectedModelLineLineCounts.getPrefixSum(fromLineNumber - 1) + 1;
        let totalOutputLineCount = 0;
        const insertLines = [];
        const insertPrefixSumValues = [];
        for (let i = 0, len = lineBreaks.length; i < len; i++) {
            const line = createModelLineProjection(lineBreaks[i], !isInHiddenArea);
            insertLines.push(line);
            const outputLineCount = line.getViewLineCount();
            totalOutputLineCount += outputLineCount;
            insertPrefixSumValues[i] = outputLineCount;
        }
        // TODO@Alex: use arrays.arrayInsert
        this.modelLineProjections = this.modelLineProjections
            .slice(0, fromLineNumber - 1)
            .concat(insertLines)
            .concat(this.modelLineProjections.slice(fromLineNumber - 1));
        this.projectedModelLineLineCounts.insertValues(fromLineNumber - 1, insertPrefixSumValues);
        return new viewEvents.ViewLinesInsertedEvent(outputFromLineNumber, outputFromLineNumber + totalOutputLineCount - 1);
    }
    onModelLineChanged(versionId, lineNumber, lineBreakData) {
        if (versionId !== null && versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return [false, null, null, null];
        }
        const lineIndex = lineNumber - 1;
        const oldOutputLineCount = this.modelLineProjections[lineIndex].getViewLineCount();
        const isVisible = this.modelLineProjections[lineIndex].isVisible();
        const line = createModelLineProjection(lineBreakData, isVisible);
        this.modelLineProjections[lineIndex] = line;
        const newOutputLineCount = this.modelLineProjections[lineIndex].getViewLineCount();
        let lineMappingChanged = false;
        let changeFrom = 0;
        let changeTo = -1;
        let insertFrom = 0;
        let insertTo = -1;
        let deleteFrom = 0;
        let deleteTo = -1;
        if (oldOutputLineCount > newOutputLineCount) {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + newOutputLineCount - 1;
            deleteFrom = changeTo + 1;
            deleteTo = deleteFrom + (oldOutputLineCount - newOutputLineCount) - 1;
            lineMappingChanged = true;
        }
        else if (oldOutputLineCount < newOutputLineCount) {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + oldOutputLineCount - 1;
            insertFrom = changeTo + 1;
            insertTo = insertFrom + (newOutputLineCount - oldOutputLineCount) - 1;
            lineMappingChanged = true;
        }
        else {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + newOutputLineCount - 1;
        }
        this.projectedModelLineLineCounts.setValue(lineIndex, newOutputLineCount);
        const viewLinesChangedEvent = changeFrom <= changeTo
            ? new viewEvents.ViewLinesChangedEvent(changeFrom, changeTo - changeFrom + 1)
            : null;
        const viewLinesInsertedEvent = insertFrom <= insertTo ? new viewEvents.ViewLinesInsertedEvent(insertFrom, insertTo) : null;
        const viewLinesDeletedEvent = deleteFrom <= deleteTo ? new viewEvents.ViewLinesDeletedEvent(deleteFrom, deleteTo) : null;
        return [
            lineMappingChanged,
            viewLinesChangedEvent,
            viewLinesInsertedEvent,
            viewLinesDeletedEvent,
        ];
    }
    acceptVersionId(versionId) {
        this._validModelVersionId = versionId;
        if (this.modelLineProjections.length === 1 && !this.modelLineProjections[0].isVisible()) {
            // At least one line must be visible => reset hidden areas
            this.setHiddenAreas([]);
        }
    }
    getViewLineCount() {
        return this.projectedModelLineLineCounts.getTotalSum();
    }
    _toValidViewLineNumber(viewLineNumber) {
        if (viewLineNumber < 1) {
            return 1;
        }
        const viewLineCount = this.getViewLineCount();
        if (viewLineNumber > viewLineCount) {
            return viewLineCount;
        }
        return viewLineNumber | 0;
    }
    getActiveIndentGuide(viewLineNumber, minLineNumber, maxLineNumber) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        minLineNumber = this._toValidViewLineNumber(minLineNumber);
        maxLineNumber = this._toValidViewLineNumber(maxLineNumber);
        const modelPosition = this.convertViewPositionToModelPosition(viewLineNumber, this.getViewLineMinColumn(viewLineNumber));
        const modelMinPosition = this.convertViewPositionToModelPosition(minLineNumber, this.getViewLineMinColumn(minLineNumber));
        const modelMaxPosition = this.convertViewPositionToModelPosition(maxLineNumber, this.getViewLineMinColumn(maxLineNumber));
        const result = this.model.guides.getActiveIndentGuide(modelPosition.lineNumber, modelMinPosition.lineNumber, modelMaxPosition.lineNumber);
        const viewStartPosition = this.convertModelPositionToViewPosition(result.startLineNumber, 1);
        const viewEndPosition = this.convertModelPositionToViewPosition(result.endLineNumber, this.model.getLineMaxColumn(result.endLineNumber));
        return {
            startLineNumber: viewStartPosition.lineNumber,
            endLineNumber: viewEndPosition.lineNumber,
            indent: result.indent,
        };
    }
    // #region ViewLineInfo
    getViewLineInfo(viewLineNumber) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        const r = this.projectedModelLineLineCounts.getIndexOf(viewLineNumber - 1);
        const lineIndex = r.index;
        const remainder = r.remainder;
        return new ViewLineInfo(lineIndex + 1, remainder);
    }
    getMinColumnOfViewLine(viewLineInfo) {
        return this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewLineMinColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
    }
    getMaxColumnOfViewLine(viewLineInfo) {
        return this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewLineMaxColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
    }
    getModelStartPositionOfViewLine(viewLineInfo) {
        const line = this.modelLineProjections[viewLineInfo.modelLineNumber - 1];
        const minViewColumn = line.getViewLineMinColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
        const column = line.getModelColumnOfViewPosition(viewLineInfo.modelLineWrappedLineIdx, minViewColumn);
        return new Position(viewLineInfo.modelLineNumber, column);
    }
    getModelEndPositionOfViewLine(viewLineInfo) {
        const line = this.modelLineProjections[viewLineInfo.modelLineNumber - 1];
        const maxViewColumn = line.getViewLineMaxColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
        const column = line.getModelColumnOfViewPosition(viewLineInfo.modelLineWrappedLineIdx, maxViewColumn);
        return new Position(viewLineInfo.modelLineNumber, column);
    }
    getViewLineInfosGroupedByModelRanges(viewStartLineNumber, viewEndLineNumber) {
        const startViewLine = this.getViewLineInfo(viewStartLineNumber);
        const endViewLine = this.getViewLineInfo(viewEndLineNumber);
        const result = new Array();
        let lastVisibleModelPos = this.getModelStartPositionOfViewLine(startViewLine);
        let viewLines = new Array();
        for (let curModelLine = startViewLine.modelLineNumber; curModelLine <= endViewLine.modelLineNumber; curModelLine++) {
            const line = this.modelLineProjections[curModelLine - 1];
            if (line.isVisible()) {
                const startOffset = curModelLine === startViewLine.modelLineNumber ? startViewLine.modelLineWrappedLineIdx : 0;
                const endOffset = curModelLine === endViewLine.modelLineNumber
                    ? endViewLine.modelLineWrappedLineIdx + 1
                    : line.getViewLineCount();
                for (let i = startOffset; i < endOffset; i++) {
                    viewLines.push(new ViewLineInfo(curModelLine, i));
                }
            }
            if (!line.isVisible() && lastVisibleModelPos) {
                const lastVisibleModelPos2 = new Position(curModelLine - 1, this.model.getLineMaxColumn(curModelLine - 1) + 1);
                const modelRange = Range.fromPositions(lastVisibleModelPos, lastVisibleModelPos2);
                result.push(new ViewLineInfoGroupedByModelRange(modelRange, viewLines));
                viewLines = [];
                lastVisibleModelPos = null;
            }
            else if (line.isVisible() && !lastVisibleModelPos) {
                lastVisibleModelPos = new Position(curModelLine, 1);
            }
        }
        if (lastVisibleModelPos) {
            const modelRange = Range.fromPositions(lastVisibleModelPos, this.getModelEndPositionOfViewLine(endViewLine));
            result.push(new ViewLineInfoGroupedByModelRange(modelRange, viewLines));
        }
        return result;
    }
    // #endregion
    getViewLinesBracketGuides(viewStartLineNumber, viewEndLineNumber, activeViewPosition, options) {
        const modelActivePosition = activeViewPosition
            ? this.convertViewPositionToModelPosition(activeViewPosition.lineNumber, activeViewPosition.column)
            : null;
        const resultPerViewLine = [];
        for (const group of this.getViewLineInfosGroupedByModelRanges(viewStartLineNumber, viewEndLineNumber)) {
            const modelRangeStartLineNumber = group.modelRange.startLineNumber;
            const bracketGuidesPerModelLine = this.model.guides.getLinesBracketGuides(modelRangeStartLineNumber, group.modelRange.endLineNumber, modelActivePosition, options);
            for (const viewLineInfo of group.viewLines) {
                const bracketGuides = bracketGuidesPerModelLine[viewLineInfo.modelLineNumber - modelRangeStartLineNumber];
                // visibleColumns stay as they are (this is a bug and needs to be fixed, but it is not a regression)
                // model-columns must be converted to view-model columns.
                const result = bracketGuides.map((g) => {
                    if (g.forWrappedLinesAfterColumn !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.forWrappedLinesAfterColumn);
                        if (p.lineNumber >= viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    if (g.forWrappedLinesBeforeOrAtColumn !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.forWrappedLinesBeforeOrAtColumn);
                        if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    if (!g.horizontalLine) {
                        return g;
                    }
                    let column = -1;
                    if (g.column !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.column);
                        if (p.lineNumber === viewLineInfo.modelLineWrappedLineIdx) {
                            column = p.column;
                        }
                        else if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                            column = this.getMinColumnOfViewLine(viewLineInfo);
                        }
                        else if (p.lineNumber > viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    const viewPosition = this.convertModelPositionToViewPosition(viewLineInfo.modelLineNumber, g.horizontalLine.endColumn);
                    const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.horizontalLine.endColumn);
                    if (p.lineNumber === viewLineInfo.modelLineWrappedLineIdx) {
                        return new IndentGuide(g.visibleColumn, column, g.className, new IndentGuideHorizontalLine(g.horizontalLine.top, viewPosition.column), -1, -1);
                    }
                    else if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                        return undefined;
                    }
                    else {
                        if (g.visibleColumn !== -1) {
                            // Don't repeat horizontal lines that use visibleColumn for unrelated lines.
                            return undefined;
                        }
                        return new IndentGuide(g.visibleColumn, column, g.className, new IndentGuideHorizontalLine(g.horizontalLine.top, this.getMaxColumnOfViewLine(viewLineInfo)), -1, -1);
                    }
                });
                resultPerViewLine.push(result.filter((r) => !!r));
            }
        }
        return resultPerViewLine;
    }
    getViewLinesIndentGuides(viewStartLineNumber, viewEndLineNumber) {
        // TODO: Use the same code as in `getViewLinesBracketGuides`.
        // Future TODO: Merge with `getViewLinesBracketGuides`.
        // However, this requires more refactoring of indent guides.
        viewStartLineNumber = this._toValidViewLineNumber(viewStartLineNumber);
        viewEndLineNumber = this._toValidViewLineNumber(viewEndLineNumber);
        const modelStart = this.convertViewPositionToModelPosition(viewStartLineNumber, this.getViewLineMinColumn(viewStartLineNumber));
        const modelEnd = this.convertViewPositionToModelPosition(viewEndLineNumber, this.getViewLineMaxColumn(viewEndLineNumber));
        let result = [];
        const resultRepeatCount = [];
        const resultRepeatOption = [];
        const modelStartLineIndex = modelStart.lineNumber - 1;
        const modelEndLineIndex = modelEnd.lineNumber - 1;
        let reqStart = null;
        for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (line.isVisible()) {
                const viewLineStartIndex = line.getViewLineNumberOfModelPosition(0, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
                const viewLineEndIndex = line.getViewLineNumberOfModelPosition(0, this.model.getLineMaxColumn(modelLineIndex + 1));
                const count = viewLineEndIndex - viewLineStartIndex + 1;
                let option = 0 /* IndentGuideRepeatOption.BlockNone */;
                if (count > 1 &&
                    line.getViewLineMinColumn(this.model, modelLineIndex + 1, viewLineEndIndex) === 1) {
                    // wrapped lines should block indent guides
                    option =
                        viewLineStartIndex === 0
                            ? 1 /* IndentGuideRepeatOption.BlockSubsequent */
                            : 2 /* IndentGuideRepeatOption.BlockAll */;
                }
                resultRepeatCount.push(count);
                resultRepeatOption.push(option);
                // merge into previous request
                if (reqStart === null) {
                    reqStart = new Position(modelLineIndex + 1, 0);
                }
            }
            else {
                // hit invisible line => flush request
                if (reqStart !== null) {
                    result = result.concat(this.model.guides.getLinesIndentGuides(reqStart.lineNumber, modelLineIndex));
                    reqStart = null;
                }
            }
        }
        if (reqStart !== null) {
            result = result.concat(this.model.guides.getLinesIndentGuides(reqStart.lineNumber, modelEnd.lineNumber));
            reqStart = null;
        }
        const viewLineCount = viewEndLineNumber - viewStartLineNumber + 1;
        const viewIndents = new Array(viewLineCount);
        let currIndex = 0;
        for (let i = 0, len = result.length; i < len; i++) {
            let value = result[i];
            const count = Math.min(viewLineCount - currIndex, resultRepeatCount[i]);
            const option = resultRepeatOption[i];
            let blockAtIndex;
            if (option === 2 /* IndentGuideRepeatOption.BlockAll */) {
                blockAtIndex = 0;
            }
            else if (option === 1 /* IndentGuideRepeatOption.BlockSubsequent */) {
                blockAtIndex = 1;
            }
            else {
                blockAtIndex = count;
            }
            for (let j = 0; j < count; j++) {
                if (j === blockAtIndex) {
                    value = 0;
                }
                viewIndents[currIndex++] = value;
            }
        }
        return viewIndents;
    }
    getViewLineContent(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineContent(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineLength(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineLength(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineMinColumn(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineMinColumn(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineMaxColumn(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineMaxColumn(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineData(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineData(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLinesData(viewStartLineNumber, viewEndLineNumber, needed) {
        viewStartLineNumber = this._toValidViewLineNumber(viewStartLineNumber);
        viewEndLineNumber = this._toValidViewLineNumber(viewEndLineNumber);
        const start = this.projectedModelLineLineCounts.getIndexOf(viewStartLineNumber - 1);
        let viewLineNumber = viewStartLineNumber;
        const startModelLineIndex = start.index;
        const startRemainder = start.remainder;
        const result = [];
        for (let modelLineIndex = startModelLineIndex, len = this.model.getLineCount(); modelLineIndex < len; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (!line.isVisible()) {
                continue;
            }
            const fromViewLineIndex = modelLineIndex === startModelLineIndex ? startRemainder : 0;
            let remainingViewLineCount = line.getViewLineCount() - fromViewLineIndex;
            let lastLine = false;
            if (viewLineNumber + remainingViewLineCount > viewEndLineNumber) {
                lastLine = true;
                remainingViewLineCount = viewEndLineNumber - viewLineNumber + 1;
            }
            line.getViewLinesData(this.model, modelLineIndex + 1, fromViewLineIndex, remainingViewLineCount, viewLineNumber - viewStartLineNumber, needed, result);
            viewLineNumber += remainingViewLineCount;
            if (lastLine) {
                break;
            }
        }
        return result;
    }
    validateViewPosition(viewLineNumber, viewColumn, expectedModelPosition) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        const r = this.projectedModelLineLineCounts.getIndexOf(viewLineNumber - 1);
        const lineIndex = r.index;
        const remainder = r.remainder;
        const line = this.modelLineProjections[lineIndex];
        const minColumn = line.getViewLineMinColumn(this.model, lineIndex + 1, remainder);
        const maxColumn = line.getViewLineMaxColumn(this.model, lineIndex + 1, remainder);
        if (viewColumn < minColumn) {
            viewColumn = minColumn;
        }
        if (viewColumn > maxColumn) {
            viewColumn = maxColumn;
        }
        const computedModelColumn = line.getModelColumnOfViewPosition(remainder, viewColumn);
        const computedModelPosition = this.model.validatePosition(new Position(lineIndex + 1, computedModelColumn));
        if (computedModelPosition.equals(expectedModelPosition)) {
            return new Position(viewLineNumber, viewColumn);
        }
        return this.convertModelPositionToViewPosition(expectedModelPosition.lineNumber, expectedModelPosition.column);
    }
    validateViewRange(viewRange, expectedModelRange) {
        const validViewStart = this.validateViewPosition(viewRange.startLineNumber, viewRange.startColumn, expectedModelRange.getStartPosition());
        const validViewEnd = this.validateViewPosition(viewRange.endLineNumber, viewRange.endColumn, expectedModelRange.getEndPosition());
        return new Range(validViewStart.lineNumber, validViewStart.column, validViewEnd.lineNumber, validViewEnd.column);
    }
    convertViewPositionToModelPosition(viewLineNumber, viewColumn) {
        const info = this.getViewLineInfo(viewLineNumber);
        const inputColumn = this.modelLineProjections[info.modelLineNumber - 1].getModelColumnOfViewPosition(info.modelLineWrappedLineIdx, viewColumn);
        // console.log('out -> in ' + viewLineNumber + ',' + viewColumn + ' ===> ' + (lineIndex+1) + ',' + inputColumn);
        return this.model.validatePosition(new Position(info.modelLineNumber, inputColumn));
    }
    convertViewRangeToModelRange(viewRange) {
        const start = this.convertViewPositionToModelPosition(viewRange.startLineNumber, viewRange.startColumn);
        const end = this.convertViewPositionToModelPosition(viewRange.endLineNumber, viewRange.endColumn);
        return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
    }
    convertModelPositionToViewPosition(_modelLineNumber, _modelColumn, affinity = 2 /* PositionAffinity.None */, allowZeroLineNumber = false, belowHiddenRanges = false) {
        const validPosition = this.model.validatePosition(new Position(_modelLineNumber, _modelColumn));
        const inputLineNumber = validPosition.lineNumber;
        const inputColumn = validPosition.column;
        let lineIndex = inputLineNumber - 1, lineIndexChanged = false;
        if (belowHiddenRanges) {
            while (lineIndex < this.modelLineProjections.length &&
                !this.modelLineProjections[lineIndex].isVisible()) {
                lineIndex++;
                lineIndexChanged = true;
            }
        }
        else {
            while (lineIndex > 0 && !this.modelLineProjections[lineIndex].isVisible()) {
                lineIndex--;
                lineIndexChanged = true;
            }
        }
        if (lineIndex === 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            // Could not reach a real line
            // console.log('in -> out ' + inputLineNumber + ',' + inputColumn + ' ===> ' + 1 + ',' + 1);
            // TODO@alexdima@hediet this isn't soo pretty
            return new Position(allowZeroLineNumber ? 0 : 1, 1);
        }
        const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
        let r;
        if (lineIndexChanged) {
            if (belowHiddenRanges) {
                r = this.modelLineProjections[lineIndex].getViewPositionOfModelPosition(deltaLineNumber, 1, affinity);
            }
            else {
                r = this.modelLineProjections[lineIndex].getViewPositionOfModelPosition(deltaLineNumber, this.model.getLineMaxColumn(lineIndex + 1), affinity);
            }
        }
        else {
            r = this.modelLineProjections[inputLineNumber - 1].getViewPositionOfModelPosition(deltaLineNumber, inputColumn, affinity);
        }
        // console.log('in -> out ' + inputLineNumber + ',' + inputColumn + ' ===> ' + r.lineNumber + ',' + r);
        return r;
    }
    /**
     * @param affinity The affinity in case of an empty range. Has no effect for non-empty ranges.
     */
    convertModelRangeToViewRange(modelRange, affinity = 0 /* PositionAffinity.Left */) {
        if (modelRange.isEmpty()) {
            const start = this.convertModelPositionToViewPosition(modelRange.startLineNumber, modelRange.startColumn, affinity);
            return Range.fromPositions(start);
        }
        else {
            const start = this.convertModelPositionToViewPosition(modelRange.startLineNumber, modelRange.startColumn, 1 /* PositionAffinity.Right */);
            const end = this.convertModelPositionToViewPosition(modelRange.endLineNumber, modelRange.endColumn, 0 /* PositionAffinity.Left */);
            return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
        }
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        let lineIndex = modelLineNumber - 1;
        if (this.modelLineProjections[lineIndex].isVisible()) {
            // this model line is visible
            const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
            return this.modelLineProjections[lineIndex].getViewLineNumberOfModelPosition(deltaLineNumber, modelColumn);
        }
        // this model line is not visible
        while (lineIndex > 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            lineIndex--;
        }
        if (lineIndex === 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            // Could not reach a real line
            return 1;
        }
        const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
        return this.modelLineProjections[lineIndex].getViewLineNumberOfModelPosition(deltaLineNumber, this.model.getLineMaxColumn(lineIndex + 1));
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations, onlyMarginDecorations) {
        const modelStart = this.convertViewPositionToModelPosition(range.startLineNumber, range.startColumn);
        const modelEnd = this.convertViewPositionToModelPosition(range.endLineNumber, range.endColumn);
        if (modelEnd.lineNumber - modelStart.lineNumber <=
            range.endLineNumber - range.startLineNumber) {
            // most likely there are no hidden lines => fast path
            // fetch decorations from column 1 to cover the case of wrapped lines that have whole line decorations at column 1
            return this.model.getDecorationsInRange(new Range(modelStart.lineNumber, 1, modelEnd.lineNumber, modelEnd.column), ownerId, filterOutValidation, onlyMinimapDecorations, onlyMarginDecorations);
        }
        let result = [];
        const modelStartLineIndex = modelStart.lineNumber - 1;
        const modelEndLineIndex = modelEnd.lineNumber - 1;
        let reqStart = null;
        for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (line.isVisible()) {
                // merge into previous request
                if (reqStart === null) {
                    reqStart = new Position(modelLineIndex + 1, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
                }
            }
            else {
                // hit invisible line => flush request
                if (reqStart !== null) {
                    const maxLineColumn = this.model.getLineMaxColumn(modelLineIndex);
                    result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumber, reqStart.column, modelLineIndex, maxLineColumn), ownerId, filterOutValidation, onlyMinimapDecorations));
                    reqStart = null;
                }
            }
        }
        if (reqStart !== null) {
            result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumber, reqStart.column, modelEnd.lineNumber, modelEnd.column), ownerId, filterOutValidation, onlyMinimapDecorations));
            reqStart = null;
        }
        result.sort((a, b) => {
            const res = Range.compareRangesUsingStarts(a.range, b.range);
            if (res === 0) {
                if (a.id < b.id) {
                    return -1;
                }
                if (a.id > b.id) {
                    return 1;
                }
                return 0;
            }
            return res;
        });
        // Eliminate duplicate decorations that might have intersected our visible ranges multiple times
        const finalResult = [];
        let finalResultLen = 0;
        let prevDecId = null;
        for (const dec of result) {
            const decId = dec.id;
            if (prevDecId === decId) {
                // skip
                continue;
            }
            prevDecId = decId;
            finalResult[finalResultLen++] = dec;
        }
        return finalResult;
    }
    getInjectedTextAt(position) {
        const info = this.getViewLineInfo(position.lineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getInjectedTextAt(info.modelLineWrappedLineIdx, position.column);
    }
    normalizePosition(position, affinity) {
        const info = this.getViewLineInfo(position.lineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].normalizePosition(info.modelLineWrappedLineIdx, position, affinity);
    }
    getLineIndentColumn(lineNumber) {
        const info = this.getViewLineInfo(lineNumber);
        if (info.modelLineWrappedLineIdx === 0) {
            return this.model.getLineIndentColumn(info.modelLineNumber);
        }
        // wrapped lines have no indentation.
        // We deliberately don't handle the case that indentation is wrapped
        // to avoid two view lines reporting indentation for the very same model line.
        return 0;
    }
}
/**
 * Overlapping unsorted ranges:
 * [   )      [ )       [  )
 *    [    )      [       )
 * ->
 * Non overlapping sorted ranges:
 * [       )  [ ) [        )
 *
 * Note: This function only considers line information! Columns are ignored.
 */
function normalizeLineRanges(ranges) {
    if (ranges.length === 0) {
        return [];
    }
    const sortedRanges = ranges.slice();
    sortedRanges.sort(Range.compareRangesUsingStarts);
    const result = [];
    let currentRangeStart = sortedRanges[0].startLineNumber;
    let currentRangeEnd = sortedRanges[0].endLineNumber;
    for (let i = 1, len = sortedRanges.length; i < len; i++) {
        const range = sortedRanges[i];
        if (range.startLineNumber > currentRangeEnd + 1) {
            result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
            currentRangeStart = range.startLineNumber;
            currentRangeEnd = range.endLineNumber;
        }
        else if (range.endLineNumber > currentRangeEnd) {
            currentRangeEnd = range.endLineNumber;
        }
    }
    result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
    return result;
}
/**
 * Represents a view line. Can be used to efficiently query more information about it.
 */
class ViewLineInfo {
    get isWrappedLineContinuation() {
        return this.modelLineWrappedLineIdx > 0;
    }
    constructor(modelLineNumber, modelLineWrappedLineIdx) {
        this.modelLineNumber = modelLineNumber;
        this.modelLineWrappedLineIdx = modelLineWrappedLineIdx;
    }
}
/**
 * A list of view lines that have a contiguous span in the model.
 */
class ViewLineInfoGroupedByModelRange {
    constructor(modelRange, viewLines) {
        this.modelRange = modelRange;
        this.viewLines = viewLines;
    }
}
class CoordinatesConverter {
    constructor(lines) {
        this._lines = lines;
    }
    // View -> Model conversion and related methods
    convertViewPositionToModelPosition(viewPosition) {
        return this._lines.convertViewPositionToModelPosition(viewPosition.lineNumber, viewPosition.column);
    }
    convertViewRangeToModelRange(viewRange) {
        return this._lines.convertViewRangeToModelRange(viewRange);
    }
    validateViewPosition(viewPosition, expectedModelPosition) {
        return this._lines.validateViewPosition(viewPosition.lineNumber, viewPosition.column, expectedModelPosition);
    }
    validateViewRange(viewRange, expectedModelRange) {
        return this._lines.validateViewRange(viewRange, expectedModelRange);
    }
    // Model -> View conversion and related methods
    convertModelPositionToViewPosition(modelPosition, affinity, allowZero, belowHiddenRanges) {
        return this._lines.convertModelPositionToViewPosition(modelPosition.lineNumber, modelPosition.column, affinity, allowZero, belowHiddenRanges);
    }
    convertModelRangeToViewRange(modelRange, affinity) {
        return this._lines.convertModelRangeToViewRange(modelRange, affinity);
    }
    modelPositionIsVisible(modelPosition) {
        return this._lines.modelPositionIsVisible(modelPosition.lineNumber, modelPosition.column);
    }
    getModelLineViewLineCount(modelLineNumber) {
        return this._lines.getModelLineViewLineCount(modelLineNumber);
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        return this._lines.getViewLineNumberOfModelPosition(modelLineNumber, modelColumn);
    }
}
var IndentGuideRepeatOption;
(function (IndentGuideRepeatOption) {
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockNone"] = 0] = "BlockNone";
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockSubsequent"] = 1] = "BlockSubsequent";
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockAll"] = 2] = "BlockAll";
})(IndentGuideRepeatOption || (IndentGuideRepeatOption = {}));
export class ViewModelLinesFromModelAsIs {
    constructor(model) {
        this.model = model;
    }
    dispose() { }
    createCoordinatesConverter() {
        return new IdentityCoordinatesConverter(this);
    }
    getHiddenAreas() {
        return [];
    }
    setHiddenAreas(_ranges) {
        return false;
    }
    setTabSize(_newTabSize) {
        return false;
    }
    setWrappingSettings(_fontInfo, _wrappingStrategy, _wrappingColumn, _wrappingIndent) {
        return false;
    }
    createLineBreaksComputer() {
        const result = [];
        return {
            addRequest: (lineText, injectedText, previousLineBreakData) => {
                result.push(null);
            },
            finalize: () => {
                return result;
            },
        };
    }
    onModelFlushed() { }
    onModelLinesDeleted(_versionId, fromLineNumber, toLineNumber) {
        return new viewEvents.ViewLinesDeletedEvent(fromLineNumber, toLineNumber);
    }
    onModelLinesInserted(_versionId, fromLineNumber, toLineNumber, lineBreaks) {
        return new viewEvents.ViewLinesInsertedEvent(fromLineNumber, toLineNumber);
    }
    onModelLineChanged(_versionId, lineNumber, lineBreakData) {
        return [false, new viewEvents.ViewLinesChangedEvent(lineNumber, 1), null, null];
    }
    acceptVersionId(_versionId) { }
    getViewLineCount() {
        return this.model.getLineCount();
    }
    getActiveIndentGuide(viewLineNumber, _minLineNumber, _maxLineNumber) {
        return {
            startLineNumber: viewLineNumber,
            endLineNumber: viewLineNumber,
            indent: 0,
        };
    }
    getViewLinesBracketGuides(startLineNumber, endLineNumber, activePosition) {
        return new Array(endLineNumber - startLineNumber + 1).fill([]);
    }
    getViewLinesIndentGuides(viewStartLineNumber, viewEndLineNumber) {
        const viewLineCount = viewEndLineNumber - viewStartLineNumber + 1;
        const result = new Array(viewLineCount);
        for (let i = 0; i < viewLineCount; i++) {
            result[i] = 0;
        }
        return result;
    }
    getViewLineContent(viewLineNumber) {
        return this.model.getLineContent(viewLineNumber);
    }
    getViewLineLength(viewLineNumber) {
        return this.model.getLineLength(viewLineNumber);
    }
    getViewLineMinColumn(viewLineNumber) {
        return this.model.getLineMinColumn(viewLineNumber);
    }
    getViewLineMaxColumn(viewLineNumber) {
        return this.model.getLineMaxColumn(viewLineNumber);
    }
    getViewLineData(viewLineNumber) {
        const lineTokens = this.model.tokenization.getLineTokens(viewLineNumber);
        const lineContent = lineTokens.getLineContent();
        return new ViewLineData(lineContent, false, 1, lineContent.length + 1, 0, lineTokens.inflate(), null);
    }
    getViewLinesData(viewStartLineNumber, viewEndLineNumber, needed) {
        const lineCount = this.model.getLineCount();
        viewStartLineNumber = Math.min(Math.max(1, viewStartLineNumber), lineCount);
        viewEndLineNumber = Math.min(Math.max(1, viewEndLineNumber), lineCount);
        const result = [];
        for (let lineNumber = viewStartLineNumber; lineNumber <= viewEndLineNumber; lineNumber++) {
            const idx = lineNumber - viewStartLineNumber;
            result[idx] = needed[idx] ? this.getViewLineData(lineNumber) : null;
        }
        return result;
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations, onlyMarginDecorations) {
        return this.model.getDecorationsInRange(range, ownerId, filterOutValidation, onlyMinimapDecorations, onlyMarginDecorations);
    }
    normalizePosition(position, affinity) {
        return this.model.normalizePosition(position, affinity);
    }
    getLineIndentColumn(lineNumber) {
        return this.model.getLineIndentColumn(lineNumber);
    }
    getInjectedTextAt(position) {
        // Identity lines collection does not support injected text.
        return null;
    }
}
class IdentityCoordinatesConverter {
    constructor(lines) {
        this._lines = lines;
    }
    _validPosition(pos) {
        return this._lines.model.validatePosition(pos);
    }
    _validRange(range) {
        return this._lines.model.validateRange(range);
    }
    // View -> Model conversion and related methods
    convertViewPositionToModelPosition(viewPosition) {
        return this._validPosition(viewPosition);
    }
    convertViewRangeToModelRange(viewRange) {
        return this._validRange(viewRange);
    }
    validateViewPosition(_viewPosition, expectedModelPosition) {
        return this._validPosition(expectedModelPosition);
    }
    validateViewRange(_viewRange, expectedModelRange) {
        return this._validRange(expectedModelRange);
    }
    // Model -> View conversion and related methods
    convertModelPositionToViewPosition(modelPosition) {
        return this._validPosition(modelPosition);
    }
    convertModelRangeToViewRange(modelRange) {
        return this._validRange(modelRange);
    }
    modelPositionIsVisible(modelPosition) {
        const lineCount = this._lines.model.getLineCount();
        if (modelPosition.lineNumber < 1 || modelPosition.lineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        return true;
    }
    modelRangeIsVisible(modelRange) {
        const lineCount = this._lines.model.getLineCount();
        if (modelRange.startLineNumber < 1 || modelRange.startLineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        if (modelRange.endLineNumber < 1 || modelRange.endLineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        return true;
    }
    getModelLineViewLineCount(modelLineNumber) {
        return 1;
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        return modelLineNumber;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL3ZpZXdNb2RlbExpbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUE7QUFJeEQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUV4QyxPQUFPLEVBR04sV0FBVyxFQUNYLHlCQUF5QixHQUN6QixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sS0FBSyxVQUFVLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLHlCQUF5QixFQUF3QixNQUFNLDBCQUEwQixDQUFBO0FBTzFGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzdFLE9BQU8sRUFBeUIsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFtRnJFLE1BQU0sT0FBTyxnQ0FBZ0M7SUF3QjVDLFlBQ0MsUUFBZ0IsRUFDaEIsS0FBaUIsRUFDakIsNEJBQXdELEVBQ3hELGtDQUE4RCxFQUM5RCxRQUFrQixFQUNsQixPQUFlLEVBQ2YsZ0JBQXVDLEVBQ3ZDLGNBQXNCLEVBQ3RCLGNBQThCLEVBQzlCLFNBQStCO1FBRS9CLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxDQUFD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