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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3VpZGVzVGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9ndWlkZXNUZXh0TW9kZWxQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFeEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUsvQyxPQUFPLEVBRU4scUJBQXFCLEVBR3JCLFdBQVcsRUFDWCx5QkFBeUIsR0FDekIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsYUFBYTtJQUNyRCxZQUNrQixTQUFvQixFQUNwQiw0QkFBMkQ7UUFFNUUsS0FBSyxFQUFFLENBQUE7UUFIVSxjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQ3BCLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7SUFHN0UsQ0FBQztJQUVPLHdCQUF3QixDQUFDLFVBQWtCO1FBQ2xELE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzlFLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxTQUFpQjtRQUM1QyxPQUFPLGtCQUFrQixDQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUNuQyxDQUFBO0lBQ0YsQ0FBQztJQUVNLG9CQUFvQixDQUMxQixVQUFrQixFQUNsQixhQUFxQixFQUNyQixhQUFxQjtRQUVyQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRS9DLElBQUksVUFBVSxHQUFHLENBQUMsSUFBSSxVQUFVLEdBQUcsU0FBUyxFQUFFLENBQUM7WUFDOUMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFBO1FBQy9GLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRTdELElBQUksd0JBQXdCLEdBQUcsQ0FBQyxDQUFDLENBQUEsQ0FBQywrQ0FBK0M7UUFDakYsSUFBSSx5QkFBeUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsQyxJQUFJLHdCQUF3QixHQUFHLENBQUMsQ0FBQyxDQUFBLENBQUMsK0NBQStDO1FBQ2pGLElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDbEMsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLFVBQWtCLEVBQUUsRUFBRTtZQUNoRCxJQUNDLHdCQUF3QixLQUFLLENBQUMsQ0FBQztnQkFDL0IsQ0FBQyx3QkFBd0IsS0FBSyxDQUFDLENBQUMsSUFBSSx3QkFBd0IsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQzdFLENBQUM7Z0JBQ0Ysd0JBQXdCLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQzdCLHlCQUF5QixHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUU5Qix1Q0FBdUM7Z0JBQ3ZDLEtBQUssSUFBSSxTQUFTLEdBQUcsVUFBVSxHQUFHLENBQUMsRUFBRSxTQUFTLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUM7b0JBQ2xFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDbEQsSUFBSSxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ2pCLHdCQUF3QixHQUFHLFNBQVMsQ0FBQTt3QkFDcEMseUJBQXlCLEdBQUcsTUFBTSxDQUFBO3dCQUNsQyxNQUFLO29CQUNOLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLHdCQUF3QixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLHdCQUF3QixHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUM3Qix5QkFBeUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFFOUIsbUNBQW1DO2dCQUNuQyxLQUFLLElBQUksU0FBUyxHQUFHLFVBQVUsRUFBRSxTQUFTLEdBQUcsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUM7b0JBQ3JFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDbEQsSUFBSSxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ2pCLHdCQUF3QixHQUFHLFNBQVMsQ0FBQTt3QkFDcEMseUJBQXlCLEdBQUcsTUFBTSxDQUFBO3dCQUNsQyxNQUFLO29CQUNOLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxJQUFJLDBCQUEwQixHQUFHLENBQUMsQ0FBQyxDQUFBLENBQUMsK0NBQStDO1FBQ25GLElBQUksMkJBQTJCLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDcEMsSUFBSSwwQkFBMEIsR0FBRyxDQUFDLENBQUMsQ0FBQSxDQUFDLCtDQUErQztRQUNuRixJQUFJLDJCQUEyQixHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxVQUFrQixFQUFFLEVBQUU7WUFDbEQsSUFBSSwwQkFBMEIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN2QywwQkFBMEIsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDL0IsMkJBQTJCLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBRWhDLHVDQUF1QztnQkFDdkMsS0FBSyxJQUFJLFNBQVMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxFQUFFLFNBQVMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQztvQkFDbEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUNsRCxJQUFJLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDakIsMEJBQTBCLEdBQUcsU0FBUyxDQUFBO3dCQUN0QywyQkFBMkIsR0FBRyxNQUFNLENBQUE7d0JBQ3BDLE1BQUs7b0JBQ04sQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQ0MsMEJBQTBCLEtBQUssQ0FBQyxDQUFDO2dCQUNqQyxDQUFDLDBCQUEwQixLQUFLLENBQUMsQ0FBQyxJQUFJLDBCQUEwQixHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFDakYsQ0FBQztnQkFDRiwwQkFBMEIsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDL0IsMkJBQTJCLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBRWhDLG1DQUFtQztnQkFDbkMsS0FBSyxJQUFJLFNBQVMsR0FBRyxVQUFVLEVBQUUsU0FBUyxHQUFHLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDO29CQUNyRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ2xELElBQUksTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUNqQiwwQkFBMEIsR0FBRyxTQUFTLENBQUE7d0JBQ3RDLDJCQUEyQixHQUFHLE1BQU0sQ0FBQTt3QkFDcEMsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNmLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUNyQixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBRWQsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBRXJCLEtBQUssSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLElBQUksSUFBSSxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLFlBQVksR0FBRyxVQUFVLEdBQUcsUUFBUSxDQUFBO1lBQzFDLE1BQU0sY0FBYyxHQUFHLFVBQVUsR0FBRyxRQUFRLENBQUE7WUFFNUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsSUFBSSxZQUFZLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDeEUsSUFBSSxHQUFHLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxJQUFJLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxJQUFJLGNBQWMsR0FBRyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUNwRixNQUFNLEdBQUcsS0FBSyxDQUFBO1lBQ2YsQ0FBQztZQUNELElBQUksUUFBUSxHQUFHLEtBQUssRUFBRSxDQUFDO2dCQUN0QixrQkFBa0I7Z0JBQ2xCLElBQUksR0FBRyxLQUFLLENBQUE7Z0JBQ1osTUFBTSxHQUFHLEtBQUssQ0FBQTtZQUNmLENBQUM7WUFFRCxJQUFJLGlCQUFpQixHQUFXLENBQUMsQ0FBQyxDQUFBO1lBQ2xDLElBQUksSUFBSSxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsZ0NBQWdDO2dCQUNoQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUNoRSxJQUFJLGFBQWEsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsNkNBQTZDO29CQUM3Qyx3QkFBd0I7b0JBQ3hCLHdCQUF3QixHQUFHLFlBQVksR0FBRyxDQUFDLENBQUE7b0JBQzNDLHlCQUF5QixHQUFHLGFBQWEsQ0FBQTtvQkFDekMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDdEYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUMvQixpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQ3hELE9BQU8sRUFDUCx5QkFBeUIsRUFDekIseUJBQXlCLENBQ3pCLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzVCLElBQUksTUFBTSxJQUFJLGNBQWMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDM0Msa0NBQWtDO2dCQUNsQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUNsRSxJQUFJLGFBQWEsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsNkNBQTZDO29CQUM3Qyx3QkFBd0I7b0JBQ3hCLDBCQUEwQixHQUFHLGNBQWMsR0FBRyxDQUFDLENBQUE7b0JBQy9DLDJCQUEyQixHQUFHLGFBQWEsQ0FBQTtvQkFDM0MsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDeEYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxDQUFBO29CQUNuQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQzFELE9BQU8sRUFDUCwyQkFBMkIsRUFDM0IsMkJBQTJCLENBQzNCLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDcEIsYUFBYSxHQUFHLGlCQUFpQixDQUFBO2dCQUNqQyxTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwQixJQUNDLGNBQWMsSUFBSSxTQUFTO29CQUMzQixtQkFBbUIsSUFBSSxDQUFDO29CQUN4QixhQUFhLEdBQUcsQ0FBQyxLQUFLLG1CQUFtQixFQUN4QyxDQUFDO29CQUNGLHFGQUFxRjtvQkFDckYsd0RBQXdEO29CQUN4RCxJQUFJLEdBQUcsS0FBSyxDQUFBO29CQUNaLGVBQWUsR0FBRyxjQUFjLENBQUE7b0JBQ2hDLGFBQWEsR0FBRyxjQUFjLENBQUE7b0JBQzlCLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQTtvQkFDNUIsU0FBUTtnQkFDVCxDQUFDO2dCQUVELElBQ0MsWUFBWSxJQUFJLENBQUM7b0JBQ2pCLGlCQUFpQixJQUFJLENBQUM7b0JBQ3RCLGlCQUFpQixHQUFHLENBQUMsS0FBSyxhQUFhLEVBQ3RDLENBQUM7b0JBQ0YsOENBQThDO29CQUM5QyxNQUFNLEdBQUcsS0FBSyxDQUFBO29CQUNkLGVBQWUsR0FBRyxZQUFZLENBQUE7b0JBQzlCLGFBQWEsR0FBRyxZQUFZLENBQUE7b0JBQzVCLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQTtvQkFDMUIsU0FBUTtnQkFDVCxDQUFDO2dCQUVELGVBQWUsR0FBRyxVQUFVLENBQUE7Z0JBQzVCLGFBQWEsR0FBRyxVQUFVLENBQUE7Z0JBQzFCLE1BQU0sR0FBRyxhQUFhLENBQUE7Z0JBQ3RCLElBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNsQixzQkFBc0I7b0JBQ3RCLE9BQU8sRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxDQUFBO2dCQUNsRCxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxpQkFBaUIsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDakMsZUFBZSxHQUFHLFlBQVksQ0FBQTtnQkFDL0IsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksR0FBRyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLElBQUksbUJBQW1CLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ25DLGFBQWEsR0FBRyxjQUFjLENBQUE7Z0JBQy9CLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLEdBQUcsS0FBSyxDQUFBO2dCQUNmLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxDQUFBO0lBQ2xELENBQUM7SUFFTSxxQkFBcUIsQ0FDM0IsZUFBdUIsRUFDdkIsYUFBcUIsRUFDckIsY0FBZ0MsRUFDaEMsT0FBNEI7UUFFNUIsTUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQTtRQUNsQyxLQUFLLElBQUksVUFBVSxHQUFHLGVBQWUsRUFBRSxVQUFVLElBQUksYUFBYSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDbEYsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNoQixDQUFDO1FBRUQsaURBQWlEO1FBQ2pELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFBO1FBRW5DLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWTthQUM5Qyx3Q0FBd0MsQ0FDeEMsSUFBSSxLQUFLLENBQ1IsZUFBZSxFQUNmLENBQUMsRUFDRCxhQUFhLEVBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FDOUMsQ0FDRDthQUNBLE9BQU8sRUFBRSxDQUFBO1FBRVgsSUFBSSxzQkFBc0IsR0FBc0IsU0FBUyxDQUFBO1FBQ3pELElBQUksY0FBYyxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0MsTUFBTSxnQ0FBZ0MsR0FBRyxDQUN4QyxlQUFlLElBQUksY0FBYyxDQUFDLFVBQVUsSUFBSSxjQUFjLENBQUMsVUFBVSxJQUFJLGFBQWE7Z0JBQ3pGLENBQUMsQ0FBQyw2RUFBNkU7b0JBQzlFLFlBQVk7Z0JBQ2IsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWTtxQkFDMUIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztxQkFDM0QsT0FBTyxFQUFFLENBQ2IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUE7WUFFeEUsc0JBQXNCLEdBQUcsUUFBUSxDQUNoQyxnQ0FBZ0MsRUFDaEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLHNCQUFzQixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUNsRixFQUFFLEtBQUssQ0FBQTtRQUNULENBQUM7UUFFRCxNQUFNLGtDQUFrQyxHQUN2QyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLDhCQUE4QixDQUFDLGtDQUFrQyxDQUFBO1FBQzlGLE1BQU0sYUFBYSxHQUFHLElBQUksMkJBQTJCLEVBQUUsQ0FBQTtRQUV2RCxLQUFLLE1BQU0sSUFBSSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2pDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2NBeUJFO1lBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMvQixTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLHNCQUFzQixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLENBQUE7WUFFekYsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDM0MsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLFNBQVMsR0FDZCxhQUFhLENBQUMsa0JBQWtCLENBQy9CLElBQUksQ0FBQyxZQUFZLEVBQ2pCLElBQUksQ0FBQyw4QkFBOEIsRUFDbkMsa0NBQWtDLENBQ2xDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRXJGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3pELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBRXZELE1BQU0sZ0JBQWdCLEdBQ3JCLE9BQU8sQ0FBQyxnQkFBZ0IsS0FBSyxxQkFBcUIsQ0FBQyxPQUFPO2dCQUMxRCxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsS0FBSyxxQkFBcUIsQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLENBQUMsQ0FBQTtZQUVsRixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQzdELElBQUksc0JBQXNCLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztvQkFDaEQsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FDeEQsSUFBSSxXQUFXLENBQ2QsQ0FBQyxDQUFDLEVBQ0YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sRUFDaEQsU0FBUyxFQUNULElBQUkseUJBQXlCLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFDaEQsQ0FBQyxDQUFDLEVBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FDRCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMvRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FDM0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixFQUFFLENBQzNDLENBQUE7WUFDRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQ2xDLGtCQUFrQixFQUNsQixnQkFBZ0IsRUFDaEIsSUFBSSxDQUFDLDJCQUEyQixHQUFHLENBQUMsQ0FDcEMsQ0FBQTtZQUVELElBQUksa0NBQWtDLEdBQUcsS0FBSyxDQUFBO1lBRTlDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxDQUN2RSxDQUFBO1lBQ0QsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUE7WUFDOUYsSUFBSSwyQkFBMkIsRUFBRSxDQUFDO2dCQUNqQyxrQ0FBa0MsR0FBRyxJQUFJLENBQUE7WUFDMUMsQ0FBQztZQUVELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQy9FLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBRXpFLE1BQU0sTUFBTSxHQUFHLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV6RCxLQUFLLElBQUksQ0FBQyxHQUFHLDJCQUEyQixFQUFFLENBQUMsR0FBRyx5QkFBeUIsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkYsTUFBTSxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQy9CLElBQUksV0FBVyxDQUNkLGtCQUFrQixFQUNsQixDQUFDLENBQUMsRUFDRixTQUFTLEVBQ1QsSUFBSSxFQUNKLENBQUMsS0FBSyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDMUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUN0QyxDQUNELENBQUE7WUFDRixDQUFDO1lBRUQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksZUFBZSxJQUFJLGtCQUFrQixHQUFHLGtCQUFrQixFQUFFLENBQUM7b0JBQ3BGLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FDOUMsSUFBSSxXQUFXLENBQ2Qsa0JBQWtCLEVBQ2xCLENBQUMsQ0FBQyxFQUNGLFNBQVMsRUFDVCxJQUFJLHlCQUF5QixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQ2xELENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxDQUNGLENBQ0QsQ0FBQTtnQkFDRixDQUFDO2dCQUVELElBQUksR0FBRyxDQUFDLFVBQVUsSUFBSSxhQUFhLElBQUksZ0JBQWdCLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztvQkFDOUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUM1QyxJQUFJLFdBQVcsQ0FDZCxrQkFBa0IsRUFDbEIsQ0FBQyxDQUFDLEVBQ0YsU0FBUyxFQUNULElBQUkseUJBQXlCLENBQUMsQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQzlFLENBQUMsQ0FBQyxFQUNGLENBQUMsQ0FBQyxDQUNGLENBQ0QsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sNEJBQTRCLENBQUMsUUFBa0I7UUFDdEQsT0FBTyxDQUNOLGFBQWEsQ0FBQyx1QkFBdUIsQ0FDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUNsRCxRQUFRLENBQUMsTUFBTSxFQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUNuQyxHQUFHLENBQUMsQ0FDTCxDQUFBO0lBQ0YsQ0FBQztJQUVNLG9CQUFvQixDQUFDLGVBQXVCLEVBQUUsYUFBcUI7UUFDekUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUUvQyxJQUFJLGVBQWUsR0FBRyxDQUFDLElBQUksZUFBZSxHQUFHLFNBQVMsRUFBRSxDQUFDO1lBQ3hELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtRQUNyRCxDQUFDO1FBQ0QsSUFBSSxhQUFhLEdBQUcsQ0FBQyxJQUFJLGFBQWEsR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDM0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUE7UUFDL0YsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFN0QsTUFBTSxNQUFNLEdBQWEsSUFBSSxLQUFLLENBQVMsYUFBYSxHQUFHLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUvRSxJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxDQUFBLENBQUMsK0NBQStDO1FBQzlFLElBQUksc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFL0IsSUFBSSxxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQSxDQUFDLCtDQUErQztRQUM5RSxJQUFJLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRS9CLEtBQUssSUFBSSxVQUFVLEdBQUcsZUFBZSxFQUFFLFVBQVUsSUFBSSxhQUFhLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNsRixNQUFNLFdBQVcsR0FBRyxVQUFVLEdBQUcsZUFBZSxDQUFBO1lBRWhELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDOUQsSUFBSSxhQUFhLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3hCLDZDQUE2QztnQkFDN0Msd0JBQXdCO2dCQUN4QixxQkFBcUIsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFBO2dCQUN0QyxzQkFBc0IsR0FBRyxhQUFhLENBQUE7Z0JBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ25FLFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFBSSxxQkFBcUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDMUIsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBRTNCLHVDQUF1QztnQkFDdkMsS0FBSyxJQUFJLFNBQVMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxFQUFFLFNBQVMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQztvQkFDbEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUNsRCxJQUFJLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDakIscUJBQXFCLEdBQUcsU0FBUyxDQUFBO3dCQUNqQyxzQkFBc0IsR0FBRyxNQUFNLENBQUE7d0JBQy9CLE1BQUs7b0JBQ04sQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQ0MscUJBQXFCLEtBQUssQ0FBQyxDQUFDO2dCQUM1QixDQUFDLHFCQUFxQixLQUFLLENBQUMsQ0FBQyxJQUFJLHFCQUFxQixHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFDdkUsQ0FBQztnQkFDRixxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDMUIsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBRTNCLG1DQUFtQztnQkFDbkMsS0FBSyxJQUFJLFNBQVMsR0FBRyxVQUFVLEVBQUUsU0FBUyxHQUFHLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDO29CQUNyRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ2xELElBQUksTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUNqQixxQkFBcUIsR0FBRyxTQUFTLENBQUE7d0JBQ2pDLHNCQUFzQixHQUFHLE1BQU0sQ0FBQTt3QkFDL0IsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FDMUQsT0FBTyxFQUNQLHNCQUFzQixFQUN0QixzQkFBc0IsQ0FDdEIsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxnQ0FBZ0MsQ0FDdkMsT0FBZ0IsRUFDaEIsc0JBQThCLEVBQzlCLHNCQUE4QjtRQUU5QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBRTNDLElBQUksc0JBQXNCLEtBQUssQ0FBQyxDQUFDLElBQUksc0JBQXNCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNwRSxtQ0FBbUM7WUFDbkMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO2FBQU0sSUFBSSxzQkFBc0IsR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1lBQzVELGlDQUFpQztZQUNqQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuRSxDQUFDO2FBQU0sSUFBSSxzQkFBc0IsS0FBSyxzQkFBc0IsRUFBRSxDQUFDO1lBQzlELGdDQUFnQztZQUNoQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYiw2QkFBNkI7Z0JBQzdCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLDJDQUEyQztnQkFDM0MsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDbkUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMkJBQTJCO0lBQXhDO1FBQ2lCLG9CQUFlLEdBQUcsZUFBZSxDQUFBO0lBaUJsRCxDQUFDO0lBZkEsa0JBQWtCLENBQ2pCLFlBQW9CLEVBQ3BCLDhCQUFzQyxFQUN0QyxrQ0FBMkM7UUFFM0MsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQ3BDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUNsRixDQUFBO0lBQ0YsQ0FBQztJQUVELHlCQUF5QixDQUFDLEtBQWE7UUFDdEMsd0RBQXdEO1FBQ3hELDREQUE0RDtRQUM1RCxPQUFPLDRCQUE0QixLQUFLLEdBQUcsRUFBRSxFQUFFLENBQUE7SUFDaEQsQ0FBQztDQUNEIn0=