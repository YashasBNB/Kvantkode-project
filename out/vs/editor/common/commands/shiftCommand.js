/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ShiftCommand_1;
import * as strings from '../../../base/common/strings.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { getEnterAction } from '../languages/enterAction.js';
import { ILanguageConfigurationService } from '../languages/languageConfigurationRegistry.js';
const repeatCache = Object.create(null);
function cachedStringRepeat(str, count) {
    if (count <= 0) {
        return '';
    }
    if (!repeatCache[str]) {
        repeatCache[str] = ['', str];
    }
    const cache = repeatCache[str];
    for (let i = cache.length; i <= count; i++) {
        cache[i] = cache[i - 1] + str;
    }
    return cache[count];
}
let ShiftCommand = ShiftCommand_1 = class ShiftCommand {
    static unshiftIndent(line, column, tabSize, indentSize, insertSpaces) {
        // Determine the visible column where the content starts
        const contentStartVisibleColumn = CursorColumns.visibleColumnFromColumn(line, column, tabSize);
        if (insertSpaces) {
            const indent = cachedStringRepeat(' ', indentSize);
            const desiredTabStop = CursorColumns.prevIndentTabStop(contentStartVisibleColumn, indentSize);
            const indentCount = desiredTabStop / indentSize; // will be an integer
            return cachedStringRepeat(indent, indentCount);
        }
        else {
            const indent = '\t';
            const desiredTabStop = CursorColumns.prevRenderTabStop(contentStartVisibleColumn, tabSize);
            const indentCount = desiredTabStop / tabSize; // will be an integer
            return cachedStringRepeat(indent, indentCount);
        }
    }
    static shiftIndent(line, column, tabSize, indentSize, insertSpaces) {
        // Determine the visible column where the content starts
        const contentStartVisibleColumn = CursorColumns.visibleColumnFromColumn(line, column, tabSize);
        if (insertSpaces) {
            const indent = cachedStringRepeat(' ', indentSize);
            const desiredTabStop = CursorColumns.nextIndentTabStop(contentStartVisibleColumn, indentSize);
            const indentCount = desiredTabStop / indentSize; // will be an integer
            return cachedStringRepeat(indent, indentCount);
        }
        else {
            const indent = '\t';
            const desiredTabStop = CursorColumns.nextRenderTabStop(contentStartVisibleColumn, tabSize);
            const indentCount = desiredTabStop / tabSize; // will be an integer
            return cachedStringRepeat(indent, indentCount);
        }
    }
    constructor(range, opts, _languageConfigurationService) {
        this._languageConfigurationService = _languageConfigurationService;
        this._opts = opts;
        this._selection = range;
        this._selectionId = null;
        this._useLastEditRangeForCursorEndPosition = false;
        this._selectionStartColumnStaysPut = false;
    }
    _addEditOperation(builder, range, text) {
        if (this._useLastEditRangeForCursorEndPosition) {
            builder.addTrackedEditOperation(range, text);
        }
        else {
            builder.addEditOperation(range, text);
        }
    }
    getEditOperations(model, builder) {
        const startLine = this._selection.startLineNumber;
        let endLine = this._selection.endLineNumber;
        if (this._selection.endColumn === 1 && startLine !== endLine) {
            endLine = endLine - 1;
        }
        const { tabSize, indentSize, insertSpaces } = this._opts;
        const shouldIndentEmptyLines = startLine === endLine;
        if (this._opts.useTabStops) {
            // if indenting or outdenting on a whitespace only line
            if (this._selection.isEmpty()) {
                if (/^\s*$/.test(model.getLineContent(startLine))) {
                    this._useLastEditRangeForCursorEndPosition = true;
                }
            }
            // keep track of previous line's "miss-alignment"
            let previousLineExtraSpaces = 0, extraSpaces = 0;
            for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++, previousLineExtraSpaces = extraSpaces) {
                extraSpaces = 0;
                const lineText = model.getLineContent(lineNumber);
                let indentationEndIndex = strings.firstNonWhitespaceIndex(lineText);
                if (this._opts.isUnshift && (lineText.length === 0 || indentationEndIndex === 0)) {
                    // empty line or line with no leading whitespace => nothing to do
                    continue;
                }
                if (!shouldIndentEmptyLines && !this._opts.isUnshift && lineText.length === 0) {
                    // do not indent empty lines => nothing to do
                    continue;
                }
                if (indentationEndIndex === -1) {
                    // the entire line is whitespace
                    indentationEndIndex = lineText.length;
                }
                if (lineNumber > 1) {
                    const contentStartVisibleColumn = CursorColumns.visibleColumnFromColumn(lineText, indentationEndIndex + 1, tabSize);
                    if (contentStartVisibleColumn % indentSize !== 0) {
                        // The current line is "miss-aligned", so let's see if this is expected...
                        // This can only happen when it has trailing commas in the indent
                        if (model.tokenization.isCheapToTokenize(lineNumber - 1)) {
                            const enterAction = getEnterAction(this._opts.autoIndent, model, new Range(lineNumber - 1, model.getLineMaxColumn(lineNumber - 1), lineNumber - 1, model.getLineMaxColumn(lineNumber - 1)), this._languageConfigurationService);
                            if (enterAction) {
                                extraSpaces = previousLineExtraSpaces;
                                if (enterAction.appendText) {
                                    for (let j = 0, lenJ = enterAction.appendText.length; j < lenJ && extraSpaces < indentSize; j++) {
                                        if (enterAction.appendText.charCodeAt(j) === 32 /* CharCode.Space */) {
                                            extraSpaces++;
                                        }
                                        else {
                                            break;
                                        }
                                    }
                                }
                                if (enterAction.removeText) {
                                    extraSpaces = Math.max(0, extraSpaces - enterAction.removeText);
                                }
                                // Act as if `prefixSpaces` is not part of the indentation
                                for (let j = 0; j < extraSpaces; j++) {
                                    if (indentationEndIndex === 0 ||
                                        lineText.charCodeAt(indentationEndIndex - 1) !== 32 /* CharCode.Space */) {
                                        break;
                                    }
                                    indentationEndIndex--;
                                }
                            }
                        }
                    }
                }
                if (this._opts.isUnshift && indentationEndIndex === 0) {
                    // line with no leading whitespace => nothing to do
                    continue;
                }
                let desiredIndent;
                if (this._opts.isUnshift) {
                    desiredIndent = ShiftCommand_1.unshiftIndent(lineText, indentationEndIndex + 1, tabSize, indentSize, insertSpaces);
                }
                else {
                    desiredIndent = ShiftCommand_1.shiftIndent(lineText, indentationEndIndex + 1, tabSize, indentSize, insertSpaces);
                }
                this._addEditOperation(builder, new Range(lineNumber, 1, lineNumber, indentationEndIndex + 1), desiredIndent);
                if (lineNumber === startLine && !this._selection.isEmpty()) {
                    // Force the startColumn to stay put because we're inserting after it
                    this._selectionStartColumnStaysPut =
                        this._selection.startColumn <= indentationEndIndex + 1;
                }
            }
        }
        else {
            // if indenting or outdenting on a whitespace only line
            if (!this._opts.isUnshift &&
                this._selection.isEmpty() &&
                model.getLineLength(startLine) === 0) {
                this._useLastEditRangeForCursorEndPosition = true;
            }
            const oneIndent = insertSpaces ? cachedStringRepeat(' ', indentSize) : '\t';
            for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
                const lineText = model.getLineContent(lineNumber);
                let indentationEndIndex = strings.firstNonWhitespaceIndex(lineText);
                if (this._opts.isUnshift && (lineText.length === 0 || indentationEndIndex === 0)) {
                    // empty line or line with no leading whitespace => nothing to do
                    continue;
                }
                if (!shouldIndentEmptyLines && !this._opts.isUnshift && lineText.length === 0) {
                    // do not indent empty lines => nothing to do
                    continue;
                }
                if (indentationEndIndex === -1) {
                    // the entire line is whitespace
                    indentationEndIndex = lineText.length;
                }
                if (this._opts.isUnshift && indentationEndIndex === 0) {
                    // line with no leading whitespace => nothing to do
                    continue;
                }
                if (this._opts.isUnshift) {
                    indentationEndIndex = Math.min(indentationEndIndex, indentSize);
                    for (let i = 0; i < indentationEndIndex; i++) {
                        const chr = lineText.charCodeAt(i);
                        if (chr === 9 /* CharCode.Tab */) {
                            indentationEndIndex = i + 1;
                            break;
                        }
                    }
                    this._addEditOperation(builder, new Range(lineNumber, 1, lineNumber, indentationEndIndex + 1), '');
                }
                else {
                    this._addEditOperation(builder, new Range(lineNumber, 1, lineNumber, 1), oneIndent);
                    if (lineNumber === startLine && !this._selection.isEmpty()) {
                        // Force the startColumn to stay put because we're inserting after it
                        this._selectionStartColumnStaysPut = this._selection.startColumn === 1;
                    }
                }
            }
        }
        this._selectionId = builder.trackSelection(this._selection);
    }
    computeCursorState(model, helper) {
        if (this._useLastEditRangeForCursorEndPosition) {
            const lastOp = helper.getInverseEditOperations()[0];
            return new Selection(lastOp.range.endLineNumber, lastOp.range.endColumn, lastOp.range.endLineNumber, lastOp.range.endColumn);
        }
        const result = helper.getTrackedSelection(this._selectionId);
        if (this._selectionStartColumnStaysPut) {
            // The selection start should not move
            const initialStartColumn = this._selection.startColumn;
            const resultStartColumn = result.startColumn;
            if (resultStartColumn <= initialStartColumn) {
                return result;
            }
            if (result.getDirection() === 0 /* SelectionDirection.LTR */) {
                return new Selection(result.startLineNumber, initialStartColumn, result.endLineNumber, result.endColumn);
            }
            return new Selection(result.endLineNumber, result.endColumn, result.startLineNumber, initialStartColumn);
        }
        return result;
    }
};
ShiftCommand = ShiftCommand_1 = __decorate([
    __param(2, ILanguageConfigurationService)
], ShiftCommand);
export { ShiftCommand };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnRDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb21tYW5kcy9zaGlmdENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsU0FBUyxFQUFzQixNQUFNLHNCQUFzQixDQUFBO0FBSXBFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQVc3RixNQUFNLFdBQVcsR0FBZ0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNwRSxTQUFTLGtCQUFrQixDQUFDLEdBQVcsRUFBRSxLQUFhO0lBQ3JELElBQUksS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN2QixXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDcEIsQ0FBQztBQUVNLElBQU0sWUFBWSxvQkFBbEIsTUFBTSxZQUFZO0lBQ2pCLE1BQU0sQ0FBQyxhQUFhLENBQzFCLElBQVksRUFDWixNQUFjLEVBQ2QsT0FBZSxFQUNmLFVBQWtCLEVBQ2xCLFlBQXFCO1FBRXJCLHdEQUF3RDtRQUN4RCxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRTlGLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUM3RixNQUFNLFdBQVcsR0FBRyxjQUFjLEdBQUcsVUFBVSxDQUFBLENBQUMscUJBQXFCO1lBQ3JFLE9BQU8sa0JBQWtCLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQy9DLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFBO1lBQ25CLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUMxRixNQUFNLFdBQVcsR0FBRyxjQUFjLEdBQUcsT0FBTyxDQUFBLENBQUMscUJBQXFCO1lBQ2xFLE9BQU8sa0JBQWtCLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFdBQVcsQ0FDeEIsSUFBWSxFQUNaLE1BQWMsRUFDZCxPQUFlLEVBQ2YsVUFBa0IsRUFDbEIsWUFBcUI7UUFFckIsd0RBQXdEO1FBQ3hELE1BQU0seUJBQXlCLEdBQUcsYUFBYSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFOUYsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDbEQsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzdGLE1BQU0sV0FBVyxHQUFHLGNBQWMsR0FBRyxVQUFVLENBQUEsQ0FBQyxxQkFBcUI7WUFDckUsT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDL0MsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUE7WUFDbkIsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQzFGLE1BQU0sV0FBVyxHQUFHLGNBQWMsR0FBRyxPQUFPLENBQUEsQ0FBQyxxQkFBcUI7WUFDbEUsT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNGLENBQUM7SUFRRCxZQUNDLEtBQWdCLEVBQ2hCLElBQXVCLEVBRU4sNkJBQTREO1FBQTVELGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBK0I7UUFFN0UsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7UUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLHFDQUFxQyxHQUFHLEtBQUssQ0FBQTtRQUNsRCxJQUFJLENBQUMsNkJBQTZCLEdBQUcsS0FBSyxDQUFBO0lBQzNDLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxPQUE4QixFQUFFLEtBQVksRUFBRSxJQUFZO1FBQ25GLElBQUksSUFBSSxDQUFDLHFDQUFxQyxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFpQixFQUFFLE9BQThCO1FBQ3pFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFBO1FBRWpELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFBO1FBQzNDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEtBQUssQ0FBQyxJQUFJLFNBQVMsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUM5RCxPQUFPLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQTtRQUN0QixDQUFDO1FBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUN4RCxNQUFNLHNCQUFzQixHQUFHLFNBQVMsS0FBSyxPQUFPLENBQUE7UUFFcEQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzVCLHVEQUF1RDtZQUN2RCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNuRCxJQUFJLENBQUMscUNBQXFDLEdBQUcsSUFBSSxDQUFBO2dCQUNsRCxDQUFDO1lBQ0YsQ0FBQztZQUVELGlEQUFpRDtZQUNqRCxJQUFJLHVCQUF1QixHQUFHLENBQUMsRUFDOUIsV0FBVyxHQUFHLENBQUMsQ0FBQTtZQUNoQixLQUNDLElBQUksVUFBVSxHQUFHLFNBQVMsRUFDMUIsVUFBVSxJQUFJLE9BQU8sRUFDckIsVUFBVSxFQUFFLEVBQUUsdUJBQXVCLEdBQUcsV0FBVyxFQUNsRCxDQUFDO2dCQUNGLFdBQVcsR0FBRyxDQUFDLENBQUE7Z0JBQ2YsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDakQsSUFBSSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBRW5FLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxtQkFBbUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsRixpRUFBaUU7b0JBQ2pFLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxJQUFJLENBQUMsc0JBQXNCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUMvRSw2Q0FBNkM7b0JBQzdDLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxJQUFJLG1CQUFtQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ2hDLGdDQUFnQztvQkFDaEMsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQTtnQkFDdEMsQ0FBQztnQkFFRCxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDcEIsTUFBTSx5QkFBeUIsR0FBRyxhQUFhLENBQUMsdUJBQXVCLENBQ3RFLFFBQVEsRUFDUixtQkFBbUIsR0FBRyxDQUFDLEVBQ3ZCLE9BQU8sQ0FDUCxDQUFBO29CQUNELElBQUkseUJBQXlCLEdBQUcsVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNsRCwwRUFBMEU7d0JBQzFFLGlFQUFpRTt3QkFDakUsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDOzRCQUMxRCxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUNyQixLQUFLLEVBQ0wsSUFBSSxLQUFLLENBQ1IsVUFBVSxHQUFHLENBQUMsRUFDZCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUN0QyxVQUFVLEdBQUcsQ0FBQyxFQUNkLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQ3RDLEVBQ0QsSUFBSSxDQUFDLDZCQUE2QixDQUNsQyxDQUFBOzRCQUNELElBQUksV0FBVyxFQUFFLENBQUM7Z0NBQ2pCLFdBQVcsR0FBRyx1QkFBdUIsQ0FBQTtnQ0FDckMsSUFBSSxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUM7b0NBQzVCLEtBQ0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFDL0MsQ0FBQyxHQUFHLElBQUksSUFBSSxXQUFXLEdBQUcsVUFBVSxFQUNwQyxDQUFDLEVBQUUsRUFDRixDQUFDO3dDQUNGLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLDRCQUFtQixFQUFFLENBQUM7NENBQzdELFdBQVcsRUFBRSxDQUFBO3dDQUNkLENBQUM7NkNBQU0sQ0FBQzs0Q0FDUCxNQUFLO3dDQUNOLENBQUM7b0NBQ0YsQ0FBQztnQ0FDRixDQUFDO2dDQUNELElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDO29DQUM1QixXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQ0FDaEUsQ0FBQztnQ0FFRCwwREFBMEQ7Z0NBQzFELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQ0FDdEMsSUFDQyxtQkFBbUIsS0FBSyxDQUFDO3dDQUN6QixRQUFRLENBQUMsVUFBVSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyw0QkFBbUIsRUFDOUQsQ0FBQzt3Q0FDRixNQUFLO29DQUNOLENBQUM7b0NBQ0QsbUJBQW1CLEVBQUUsQ0FBQTtnQ0FDdEIsQ0FBQzs0QkFDRixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksbUJBQW1CLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3ZELG1EQUFtRDtvQkFDbkQsU0FBUTtnQkFDVCxDQUFDO2dCQUVELElBQUksYUFBcUIsQ0FBQTtnQkFDekIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUMxQixhQUFhLEdBQUcsY0FBWSxDQUFDLGFBQWEsQ0FDekMsUUFBUSxFQUNSLG1CQUFtQixHQUFHLENBQUMsRUFDdkIsT0FBTyxFQUNQLFVBQVUsRUFDVixZQUFZLENBQ1osQ0FBQTtnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsYUFBYSxHQUFHLGNBQVksQ0FBQyxXQUFXLENBQ3ZDLFFBQVEsRUFDUixtQkFBbUIsR0FBRyxDQUFDLEVBQ3ZCLE9BQU8sRUFDUCxVQUFVLEVBQ1YsWUFBWSxDQUNaLENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMsaUJBQWlCLENBQ3JCLE9BQU8sRUFDUCxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsRUFDN0QsYUFBYSxDQUNiLENBQUE7Z0JBQ0QsSUFBSSxVQUFVLEtBQUssU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO29CQUM1RCxxRUFBcUU7b0JBQ3JFLElBQUksQ0FBQyw2QkFBNkI7d0JBQ2pDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtnQkFDeEQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLHVEQUF1RDtZQUN2RCxJQUNDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDekIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQ25DLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLHFDQUFxQyxHQUFHLElBQUksQ0FBQTtZQUNsRCxDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUUzRSxLQUFLLElBQUksVUFBVSxHQUFHLFNBQVMsRUFBRSxVQUFVLElBQUksT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQ3RFLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ2pELElBQUksbUJBQW1CLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUVuRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksbUJBQW1CLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbEYsaUVBQWlFO29CQUNqRSxTQUFRO2dCQUNULENBQUM7Z0JBRUQsSUFBSSxDQUFDLHNCQUFzQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDL0UsNkNBQTZDO29CQUM3QyxTQUFRO2dCQUNULENBQUM7Z0JBRUQsSUFBSSxtQkFBbUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNoQyxnQ0FBZ0M7b0JBQ2hDLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUE7Z0JBQ3RDLENBQUM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxtQkFBbUIsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdkQsbURBQW1EO29CQUNuRCxTQUFRO2dCQUNULENBQUM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUMxQixtQkFBbUIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxDQUFBO29CQUMvRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3QkFDOUMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDbEMsSUFBSSxHQUFHLHlCQUFpQixFQUFFLENBQUM7NEJBQzFCLG1CQUFtQixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7NEJBQzNCLE1BQUs7d0JBQ04sQ0FBQztvQkFDRixDQUFDO29CQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FDckIsT0FBTyxFQUNQLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxFQUM3RCxFQUFFLENBQ0YsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtvQkFDbkYsSUFBSSxVQUFVLEtBQUssU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO3dCQUM1RCxxRUFBcUU7d0JBQ3JFLElBQUksQ0FBQyw2QkFBNkIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUE7b0JBQ3ZFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRU0sa0JBQWtCLENBQUMsS0FBaUIsRUFBRSxNQUFnQztRQUM1RSxJQUFJLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ25ELE9BQU8sSUFBSSxTQUFTLENBQ25CLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUMxQixNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFDdEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQzFCLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUN0QixDQUFBO1FBQ0YsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsWUFBYSxDQUFDLENBQUE7UUFFN0QsSUFBSSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztZQUN4QyxzQ0FBc0M7WUFDdEMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQTtZQUN0RCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUE7WUFDNUMsSUFBSSxpQkFBaUIsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUM3QyxPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7WUFFRCxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsbUNBQTJCLEVBQUUsQ0FBQztnQkFDdEQsT0FBTyxJQUFJLFNBQVMsQ0FDbkIsTUFBTSxDQUFDLGVBQWUsRUFDdEIsa0JBQWtCLEVBQ2xCLE1BQU0sQ0FBQyxhQUFhLEVBQ3BCLE1BQU0sQ0FBQyxTQUFTLENBQ2hCLENBQUE7WUFDRixDQUFDO1lBQ0QsT0FBTyxJQUFJLFNBQVMsQ0FDbkIsTUFBTSxDQUFDLGFBQWEsRUFDcEIsTUFBTSxDQUFDLFNBQVMsRUFDaEIsTUFBTSxDQUFDLGVBQWUsRUFDdEIsa0JBQWtCLENBQ2xCLENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0QsQ0FBQTtBQXhUWSxZQUFZO0lBd0R0QixXQUFBLDZCQUE2QixDQUFBO0dBeERuQixZQUFZLENBd1R4QiJ9