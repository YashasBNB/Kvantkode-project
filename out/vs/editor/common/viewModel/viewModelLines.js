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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC92aWV3TW9kZWxMaW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBSXhELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFeEMsT0FBTyxFQUdOLFdBQVcsRUFDWCx5QkFBeUIsR0FDekIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEtBQUssVUFBVSxNQUFNLGtCQUFrQixDQUFBO0FBQzlDLE9BQU8sRUFBRSx5QkFBeUIsRUFBd0IsTUFBTSwwQkFBMEIsQ0FBQTtBQU8xRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM3RSxPQUFPLEVBQXlCLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBbUZyRSxNQUFNLE9BQU8sZ0NBQWdDO0lBd0I1QyxZQUNDLFFBQWdCLEVBQ2hCLEtBQWlCLEVBQ2pCLDRCQUF3RCxFQUN4RCxrQ0FBOEQsRUFDOUQsUUFBa0IsRUFDbEIsT0FBZSxFQUNmLGdCQUF1QyxFQUN2QyxjQUFzQixFQUN0QixjQUE4QixFQUM5QixTQUErQjtRQUUvQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUN6QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxDQUFD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