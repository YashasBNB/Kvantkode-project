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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnRDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvbW1hbmRzL3NoaWZ0Q29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxTQUFTLEVBQXNCLE1BQU0sc0JBQXNCLENBQUE7QUFJcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzVELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBVzdGLE1BQU0sV0FBVyxHQUFnQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3BFLFNBQVMsa0JBQWtCLENBQUMsR0FBVyxFQUFFLEtBQWE7SUFDckQsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDaEIsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBQ0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDNUMsS0FB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