/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLast } from '../../../base/common/arraysFind.js';
import * as strings from '../../../base/common/strings.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { Range } from '../core/range.js';
import { TextModelPart } from './textModelPart.js';
import { computeIndentLevel } from './utils.js';
import { HorizontalGuidesState, IndentGuide, IndentGuideHorizontalLine, } from '../textModelGuides.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
export class GuidesTextModelPart extends TextModelPart {
    constructor(textModel, languageConfigurationService) {
        super();
        this.textModel = textModel;
        this.languageConfigurationService = languageConfigurationService;
    }
    getLanguageConfiguration(languageId) {
        return this.languageConfigurationService.getLanguageConfiguration(languageId);
    }
    _computeIndentLevel(lineIndex) {
        return computeIndentLevel(this.textModel.getLineContent(lineIndex + 1), this.textModel.getOptions().tabSize);
    }
    getActiveIndentGuide(lineNumber, minLineNumber, maxLineNumber) {
        this.assertNotDisposed();
        const lineCount = this.textModel.getLineCount();
        if (lineNumber < 1 || lineNumber > lineCount) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        const foldingRules = this.getLanguageConfiguration(this.textModel.getLanguageId()).foldingRules;
        const offSide = Boolean(foldingRules && foldingRules.offSide);
        let up_aboveContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let up_aboveContentLineIndent = -1;
        let up_belowContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let up_belowContentLineIndent = -1;
        const up_resolveIndents = (lineNumber) => {
            if (up_aboveContentLineIndex !== -1 &&
                (up_aboveContentLineIndex === -2 || up_aboveContentLineIndex > lineNumber - 1)) {
                up_aboveContentLineIndex = -1;
                up_aboveContentLineIndent = -1;
                // must find previous line with content
                for (let lineIndex = lineNumber - 2; lineIndex >= 0; lineIndex--) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        up_aboveContentLineIndex = lineIndex;
                        up_aboveContentLineIndent = indent;
                        break;
                    }
                }
            }
            if (up_belowContentLineIndex === -2) {
                up_belowContentLineIndex = -1;
                up_belowContentLineIndent = -1;
                // must find next line with content
                for (let lineIndex = lineNumber; lineIndex < lineCount; lineIndex++) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        up_belowContentLineIndex = lineIndex;
                        up_belowContentLineIndent = indent;
                        break;
                    }
                }
            }
        };
        let down_aboveContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let down_aboveContentLineIndent = -1;
        let down_belowContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let down_belowContentLineIndent = -1;
        const down_resolveIndents = (lineNumber) => {
            if (down_aboveContentLineIndex === -2) {
                down_aboveContentLineIndex = -1;
                down_aboveContentLineIndent = -1;
                // must find previous line with content
                for (let lineIndex = lineNumber - 2; lineIndex >= 0; lineIndex--) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        down_aboveContentLineIndex = lineIndex;
                        down_aboveContentLineIndent = indent;
                        break;
                    }
                }
            }
            if (down_belowContentLineIndex !== -1 &&
                (down_belowContentLineIndex === -2 || down_belowContentLineIndex < lineNumber - 1)) {
                down_belowContentLineIndex = -1;
                down_belowContentLineIndent = -1;
                // must find next line with content
                for (let lineIndex = lineNumber; lineIndex < lineCount; lineIndex++) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        down_belowContentLineIndex = lineIndex;
                        down_belowContentLineIndent = indent;
                        break;
                    }
                }
            }
        };
        let startLineNumber = 0;
        let goUp = true;
        let endLineNumber = 0;
        let goDown = true;
        let indent = 0;
        let initialIndent = 0;
        for (let distance = 0; goUp || goDown; distance++) {
            const upLineNumber = lineNumber - distance;
            const downLineNumber = lineNumber + distance;
            if (distance > 1 && (upLineNumber < 1 || upLineNumber < minLineNumber)) {
                goUp = false;
            }
            if (distance > 1 && (downLineNumber > lineCount || downLineNumber > maxLineNumber)) {
                goDown = false;
            }
            if (distance > 50000) {
                // stop processing
                goUp = false;
                goDown = false;
            }
            let upLineIndentLevel = -1;
            if (goUp && upLineNumber >= 1) {
                // compute indent level going up
                const currentIndent = this._computeIndentLevel(upLineNumber - 1);
                if (currentIndent >= 0) {
                    // This line has content (besides whitespace)
                    // Use the line's indent
                    up_belowContentLineIndex = upLineNumber - 1;
                    up_belowContentLineIndent = currentIndent;
                    upLineIndentLevel = Math.ceil(currentIndent / this.textModel.getOptions().indentSize);
                }
                else {
                    up_resolveIndents(upLineNumber);
                    upLineIndentLevel = this._getIndentLevelForWhitespaceLine(offSide, up_aboveContentLineIndent, up_belowContentLineIndent);
                }
            }
            let downLineIndentLevel = -1;
            if (goDown && downLineNumber <= lineCount) {
                // compute indent level going down
                const currentIndent = this._computeIndentLevel(downLineNumber - 1);
                if (currentIndent >= 0) {
                    // This line has content (besides whitespace)
                    // Use the line's indent
                    down_aboveContentLineIndex = downLineNumber - 1;
                    down_aboveContentLineIndent = currentIndent;
                    downLineIndentLevel = Math.ceil(currentIndent / this.textModel.getOptions().indentSize);
                }
                else {
                    down_resolveIndents(downLineNumber);
                    downLineIndentLevel = this._getIndentLevelForWhitespaceLine(offSide, down_aboveContentLineIndent, down_belowContentLineIndent);
                }
            }
            if (distance === 0) {
                initialIndent = upLineIndentLevel;
                continue;
            }
            if (distance === 1) {
                if (downLineNumber <= lineCount &&
                    downLineIndentLevel >= 0 &&
                    initialIndent + 1 === downLineIndentLevel) {
                    // This is the beginning of a scope, we have special handling here, since we want the
                    // child scope indent to be active, not the parent scope
                    goUp = false;
                    startLineNumber = downLineNumber;
                    endLineNumber = downLineNumber;
                    indent = downLineIndentLevel;
                    continue;
                }
                if (upLineNumber >= 1 &&
                    upLineIndentLevel >= 0 &&
                    upLineIndentLevel - 1 === initialIndent) {
                    // This is the end of a scope, just like above
                    goDown = false;
                    startLineNumber = upLineNumber;
                    endLineNumber = upLineNumber;
                    indent = upLineIndentLevel;
                    continue;
                }
                startLineNumber = lineNumber;
                endLineNumber = lineNumber;
                indent = initialIndent;
                if (indent === 0) {
                    // No need to continue
                    return { startLineNumber, endLineNumber, indent };
                }
            }
            if (goUp) {
                if (upLineIndentLevel >= indent) {
                    startLineNumber = upLineNumber;
                }
                else {
                    goUp = false;
                }
            }
            if (goDown) {
                if (downLineIndentLevel >= indent) {
                    endLineNumber = downLineNumber;
                }
                else {
                    goDown = false;
                }
            }
        }
        return { startLineNumber, endLineNumber, indent };
    }
    getLinesBracketGuides(startLineNumber, endLineNumber, activePosition, options) {
        const result = [];
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            result.push([]);
        }
        // If requested, this could be made configurable.
        const includeSingleLinePairs = true;
        const bracketPairs = this.textModel.bracketPairs
            .getBracketPairsInRangeWithMinIndentation(new Range(startLineNumber, 1, endLineNumber, this.textModel.getLineMaxColumn(endLineNumber)))
            .toArray();
        let activeBracketPairRange = undefined;
        if (activePosition && bracketPairs.length > 0) {
            const bracketsContainingActivePosition = (startLineNumber <= activePosition.lineNumber && activePosition.lineNumber <= endLineNumber
                ? // We don't need to query the brackets again if the cursor is in the viewport
                    bracketPairs
                : this.textModel.bracketPairs
                    .getBracketPairsInRange(Range.fromPositions(activePosition))
                    .toArray()).filter((bp) => Range.strictContainsPosition(bp.range, activePosition));
            activeBracketPairRange = findLast(bracketsContainingActivePosition, (i) => includeSingleLinePairs || i.range.startLineNumber !== i.range.endLineNumber)?.range;
        }
        const independentColorPoolPerBracketType = this.textModel.getOptions().bracketPairColorizationOptions.independentColorPoolPerBracketType;
        const colorProvider = new BracketPairGuidesClassNames();
        for (const pair of bracketPairs) {
            /*


                    {
                    |
                    }

                    {
                    |
                    ----}

                ____{
                |test
                ----}

                renderHorizontalEndLineAtTheBottom:
                    {
                    |
                    |x}
                    --
                renderHorizontalEndLineAtTheBottom:
                ____{
                |test
                | x }
                ----
            */
            if (!pair.closingBracketRange) {
                continue;
            }
            const isActive = activeBracketPairRange && pair.range.equalsRange(activeBracketPairRange);
            if (!isActive && !options.includeInactive) {
                continue;
            }
            const className = colorProvider.getInlineClassName(pair.nestingLevel, pair.nestingLevelOfEqualBracketType, independentColorPoolPerBracketType) + (options.highlightActive && isActive ? ' ' + colorProvider.activeClassName : '');
            const start = pair.openingBracketRange.getStartPosition();
            const end = pair.closingBracketRange.getStartPosition();
            const horizontalGuides = options.horizontalGuides === HorizontalGuidesState.Enabled ||
                (options.horizontalGuides === HorizontalGuidesState.EnabledForActive && isActive);
            if (pair.range.startLineNumber === pair.range.endLineNumber) {
                if (includeSingleLinePairs && horizontalGuides) {
                    result[pair.range.startLineNumber - startLineNumber].push(new IndentGuide(-1, pair.openingBracketRange.getEndPosition().column, className, new IndentGuideHorizontalLine(false, end.column), -1, -1));
                }
                continue;
            }
            const endVisibleColumn = this.getVisibleColumnFromPosition(end);
            const startVisibleColumn = this.getVisibleColumnFromPosition(pair.openingBracketRange.getStartPosition());
            const guideVisibleColumn = Math.min(startVisibleColumn, endVisibleColumn, pair.minVisibleColumnIndentation + 1);
            let renderHorizontalEndLineAtTheBottom = false;
            const firstNonWsIndex = strings.firstNonWhitespaceIndex(this.textModel.getLineContent(pair.closingBracketRange.startLineNumber));
            const hasTextBeforeClosingBracket = firstNonWsIndex < pair.closingBracketRange.startColumn - 1;
            if (hasTextBeforeClosingBracket) {
                renderHorizontalEndLineAtTheBottom = true;
            }
            const visibleGuideStartLineNumber = Math.max(start.lineNumber, startLineNumber);
            const visibleGuideEndLineNumber = Math.min(end.lineNumber, endLineNumber);
            const offset = renderHorizontalEndLineAtTheBottom ? 1 : 0;
            for (let l = visibleGuideStartLineNumber; l < visibleGuideEndLineNumber + offset; l++) {
                result[l - startLineNumber].push(new IndentGuide(guideVisibleColumn, -1, className, null, l === start.lineNumber ? start.column : -1, l === end.lineNumber ? end.column : -1));
            }
            if (horizontalGuides) {
                if (start.lineNumber >= startLineNumber && startVisibleColumn > guideVisibleColumn) {
                    result[start.lineNumber - startLineNumber].push(new IndentGuide(guideVisibleColumn, -1, className, new IndentGuideHorizontalLine(false, start.column), -1, -1));
                }
                if (end.lineNumber <= endLineNumber && endVisibleColumn > guideVisibleColumn) {
                    result[end.lineNumber - startLineNumber].push(new IndentGuide(guideVisibleColumn, -1, className, new IndentGuideHorizontalLine(!renderHorizontalEndLineAtTheBottom, end.column), -1, -1));
                }
            }
        }
        for (const guides of result) {
            guides.sort((a, b) => a.visibleColumn - b.visibleColumn);
        }
        return result;
    }
    getVisibleColumnFromPosition(position) {
        return (CursorColumns.visibleColumnFromColumn(this.textModel.getLineContent(position.lineNumber), position.column, this.textModel.getOptions().tabSize) + 1);
    }
    getLinesIndentGuides(startLineNumber, endLineNumber) {
        this.assertNotDisposed();
        const lineCount = this.textModel.getLineCount();
        if (startLineNumber < 1 || startLineNumber > lineCount) {
            throw new Error('Illegal value for startLineNumber');
        }
        if (endLineNumber < 1 || endLineNumber > lineCount) {
            throw new Error('Illegal value for endLineNumber');
        }
        const options = this.textModel.getOptions();
        const foldingRules = this.getLanguageConfiguration(this.textModel.getLanguageId()).foldingRules;
        const offSide = Boolean(foldingRules && foldingRules.offSide);
        const result = new Array(endLineNumber - startLineNumber + 1);
        let aboveContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let aboveContentLineIndent = -1;
        let belowContentLineIndex = -2; /* -2 is a marker for not having computed it */
        let belowContentLineIndent = -1;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const resultIndex = lineNumber - startLineNumber;
            const currentIndent = this._computeIndentLevel(lineNumber - 1);
            if (currentIndent >= 0) {
                // This line has content (besides whitespace)
                // Use the line's indent
                aboveContentLineIndex = lineNumber - 1;
                aboveContentLineIndent = currentIndent;
                result[resultIndex] = Math.ceil(currentIndent / options.indentSize);
                continue;
            }
            if (aboveContentLineIndex === -2) {
                aboveContentLineIndex = -1;
                aboveContentLineIndent = -1;
                // must find previous line with content
                for (let lineIndex = lineNumber - 2; lineIndex >= 0; lineIndex--) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        aboveContentLineIndex = lineIndex;
                        aboveContentLineIndent = indent;
                        break;
                    }
                }
            }
            if (belowContentLineIndex !== -1 &&
                (belowContentLineIndex === -2 || belowContentLineIndex < lineNumber - 1)) {
                belowContentLineIndex = -1;
                belowContentLineIndent = -1;
                // must find next line with content
                for (let lineIndex = lineNumber; lineIndex < lineCount; lineIndex++) {
                    const indent = this._computeIndentLevel(lineIndex);
                    if (indent >= 0) {
                        belowContentLineIndex = lineIndex;
                        belowContentLineIndent = indent;
                        break;
                    }
                }
            }
            result[resultIndex] = this._getIndentLevelForWhitespaceLine(offSide, aboveContentLineIndent, belowContentLineIndent);
        }
        return result;
    }
    _getIndentLevelForWhitespaceLine(offSide, aboveContentLineIndent, belowContentLineIndent) {
        const options = this.textModel.getOptions();
        if (aboveContentLineIndent === -1 || belowContentLineIndent === -1) {
            // At the top or bottom of the file
            return 0;
        }
        else if (aboveContentLineIndent < belowContentLineIndent) {
            // we are inside the region above
            return 1 + Math.floor(aboveContentLineIndent / options.indentSize);
        }
        else if (aboveContentLineIndent === belowContentLineIndent) {
            // we are in between two regions
            return Math.ceil(belowContentLineIndent / options.indentSize);
        }
        else {
            if (offSide) {
                // same level as region below
                return Math.ceil(belowContentLineIndent / options.indentSize);
            }
            else {
                // we are inside the region that ends below
                return 1 + Math.floor(belowContentLineIndent / options.indentSize);
            }
        }
    }
}
export class BracketPairGuidesClassNames {
    constructor() {
        this.activeClassName = 'indent-active';
    }
    getInlineClassName(nestingLevel, nestingLevelOfEqualBracketType, independentColorPoolPerBracketType) {
        return this.getInlineClassNameOfLevel(independentColorPoolPerBracketType ? nestingLevelOfEqualBracketType : nestingLevel);
    }
    getInlineClassNameOfLevel(level) {
        // To support a dynamic amount of colors up to 6 colors,
        // we use a number that is a lcm of all numbers from 1 to 6.
        return `bracket-indent-guide lvl-${level % 30}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3VpZGVzVGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvZ3VpZGVzVGV4dE1vZGVsUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXhDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFLL0MsT0FBTyxFQUVOLHFCQUFxQixFQUdyQixXQUFXLEVBQ1gseUJBQXlCLEdBQ3pCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFbkUsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGFBQWE7SUFDckQsWUFDa0IsU0FBb0IsRUFDcEIsNEJBQTJEO1FBRTVFLEtBQUssRUFBRSxDQUFBO1FBSFUsY0FBUyxHQUFULFNBQVMsQ0FBVztRQUNwQixpQ0FBNEIsR0FBNUIsNEJBQTRCLENBQStCO0lBRzdFLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxVQUFrQjtRQUNsRCxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0lBRU8sbUJBQW1CLENBQUMsU0FBaUI7UUFDNUMsT0FBTyxrQkFBa0IsQ0FDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsU0FBUyxH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