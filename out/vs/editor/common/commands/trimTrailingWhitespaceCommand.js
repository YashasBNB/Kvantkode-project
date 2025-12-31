/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { EditOperation } from '../core/editOperation.js';
import { Range } from '../core/range.js';
export class TrimTrailingWhitespaceCommand {
    constructor(selection, cursors, trimInRegexesAndStrings) {
        this._selection = selection;
        this._cursors = cursors;
        this._selectionId = null;
        this._trimInRegexesAndStrings = trimInRegexesAndStrings;
    }
    getEditOperations(model, builder) {
        const ops = trimTrailingWhitespace(model, this._cursors, this._trimInRegexesAndStrings);
        for (let i = 0, len = ops.length; i < len; i++) {
            const op = ops[i];
            builder.addEditOperation(op.range, op.text);
        }
        this._selectionId = builder.trackSelection(this._selection);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._selectionId);
    }
}
/**
 * Generate commands for trimming trailing whitespace on a model and ignore lines on which cursors are sitting.
 */
export function trimTrailingWhitespace(model, cursors, trimInRegexesAndStrings) {
    // Sort cursors ascending
    cursors.sort((a, b) => {
        if (a.lineNumber === b.lineNumber) {
            return a.column - b.column;
        }
        return a.lineNumber - b.lineNumber;
    });
    // Reduce multiple cursors on the same line and only keep the last one on the line
    for (let i = cursors.length - 2; i >= 0; i--) {
        if (cursors[i].lineNumber === cursors[i + 1].lineNumber) {
            // Remove cursor at `i`
            cursors.splice(i, 1);
        }
    }
    const r = [];
    let rLen = 0;
    let cursorIndex = 0;
    const cursorLen = cursors.length;
    for (let lineNumber = 1, lineCount = model.getLineCount(); lineNumber <= lineCount; lineNumber++) {
        const lineContent = model.getLineContent(lineNumber);
        const maxLineColumn = lineContent.length + 1;
        let minEditColumn = 0;
        if (cursorIndex < cursorLen && cursors[cursorIndex].lineNumber === lineNumber) {
            minEditColumn = cursors[cursorIndex].column;
            cursorIndex++;
            if (minEditColumn === maxLineColumn) {
                // The cursor is at the end of the line => no edits for sure on this line
                continue;
            }
        }
        if (lineContent.length === 0) {
            continue;
        }
        const lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);
        let fromColumn = 0;
        if (lastNonWhitespaceIndex === -1) {
            // Entire line is whitespace
            fromColumn = 1;
        }
        else if (lastNonWhitespaceIndex !== lineContent.length - 1) {
            // There is trailing whitespace
            fromColumn = lastNonWhitespaceIndex + 2;
        }
        else {
            // There is no trailing whitespace
            continue;
        }
        if (!trimInRegexesAndStrings) {
            if (!model.tokenization.hasAccurateTokensForLine(lineNumber)) {
                // We don't want to force line tokenization, as that can be expensive, but we also don't want to trim
                // trailing whitespace in lines that are not tokenized yet, as that can be wrong and trim whitespace from
                // lines that the user requested we don't. So we bail out if the tokens are not accurate for this line.
                continue;
            }
            const lineTokens = model.tokenization.getLineTokens(lineNumber);
            const fromColumnType = lineTokens.getStandardTokenType(lineTokens.findTokenIndexAtOffset(fromColumn));
            if (fromColumnType === 2 /* StandardTokenType.String */ ||
                fromColumnType === 3 /* StandardTokenType.RegEx */) {
                continue;
            }
        }
        fromColumn = Math.max(minEditColumn, fromColumn);
        r[rLen++] = EditOperation.delete(new Range(lineNumber, fromColumn, lineNumber, maxLineColumn));
    }
    return r;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpbVRyYWlsaW5nV2hpdGVzcGFjZUNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvbW1hbmRzL3RyaW1UcmFpbGluZ1doaXRlc3BhY2VDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFNeEMsTUFBTSxPQUFPLDZCQUE2QjtJQU16QyxZQUFZLFNBQW9CLEVBQUUsT0FBbUIsRUFBRSx1QkFBZ0M7UUFDdEYsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLHdCQUF3QixHQUFHLHVCQUF1QixDQUFBO0lBQ3hELENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFpQixFQUFFLE9BQThCO1FBQ3pFLE1BQU0sR0FBRyxHQUFHLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3ZGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoRCxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFakIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFB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