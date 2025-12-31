/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { normalizeIndentation } from '../../../common/core/indentation.js';
import { Selection } from '../../../common/core/selection.js';
import { ProcessedIndentRulesSupport } from '../../../common/languages/supports/indentationLineProcessor.js';
export function getReindentEditOperations(model, languageConfigurationService, startLineNumber, endLineNumber) {
    if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
        // Model is empty
        return [];
    }
    const indentationRulesSupport = languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).indentRulesSupport;
    if (!indentationRulesSupport) {
        return [];
    }
    const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentationRulesSupport, languageConfigurationService);
    endLineNumber = Math.min(endLineNumber, model.getLineCount());
    // Skip `unIndentedLinePattern` lines
    while (startLineNumber <= endLineNumber) {
        if (!processedIndentRulesSupport.shouldIgnore(startLineNumber)) {
            break;
        }
        startLineNumber++;
    }
    if (startLineNumber > endLineNumber - 1) {
        return [];
    }
    const { tabSize, indentSize, insertSpaces } = model.getOptions();
    const shiftIndent = (indentation, count) => {
        count = count || 1;
        return ShiftCommand.shiftIndent(indentation, indentation.length + count, tabSize, indentSize, insertSpaces);
    };
    const unshiftIndent = (indentation, count) => {
        count = count || 1;
        return ShiftCommand.unshiftIndent(indentation, indentation.length + count, tabSize, indentSize, insertSpaces);
    };
    const indentEdits = [];
    // indentation being passed to lines below
    // Calculate indentation for the first line
    // If there is no passed-in indentation, we use the indentation of the first line as base.
    const currentLineText = model.getLineContent(startLineNumber);
    let globalIndent = strings.getLeadingWhitespace(currentLineText);
    // idealIndentForNextLine doesn't equal globalIndent when there is a line matching `indentNextLinePattern`.
    let idealIndentForNextLine = globalIndent;
    if (processedIndentRulesSupport.shouldIncrease(startLineNumber)) {
        idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
        globalIndent = shiftIndent(globalIndent);
    }
    else if (processedIndentRulesSupport.shouldIndentNextLine(startLineNumber)) {
        idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
    }
    startLineNumber++;
    // Calculate indentation adjustment for all following lines
    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
        if (doesLineStartWithString(model, lineNumber)) {
            continue;
        }
        const text = model.getLineContent(lineNumber);
        const oldIndentation = strings.getLeadingWhitespace(text);
        const currentIdealIndent = idealIndentForNextLine;
        if (processedIndentRulesSupport.shouldDecrease(lineNumber, currentIdealIndent)) {
            idealIndentForNextLine = unshiftIndent(idealIndentForNextLine);
            globalIndent = unshiftIndent(globalIndent);
        }
        if (oldIndentation !== idealIndentForNextLine) {
            indentEdits.push(EditOperation.replaceMove(new Selection(lineNumber, 1, lineNumber, oldIndentation.length + 1), normalizeIndentation(idealIndentForNextLine, indentSize, insertSpaces)));
        }
        // calculate idealIndentForNextLine
        if (processedIndentRulesSupport.shouldIgnore(lineNumber)) {
            // In reindent phase, if the line matches `unIndentedLinePattern` we inherit indentation from above lines
            // but don't change globalIndent and idealIndentForNextLine.
            continue;
        }
        else if (processedIndentRulesSupport.shouldIncrease(lineNumber, currentIdealIndent)) {
            globalIndent = shiftIndent(globalIndent);
            idealIndentForNextLine = globalIndent;
        }
        else if (processedIndentRulesSupport.shouldIndentNextLine(lineNumber, currentIdealIndent)) {
            idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
        }
        else {
            idealIndentForNextLine = globalIndent;
        }
    }
    return indentEdits;
}
function doesLineStartWithString(model, lineNumber) {
    if (!model.tokenization.isCheapToTokenize(lineNumber)) {
        return false;
    }
    const lineTokens = model.tokenization.getLineTokens(lineNumber);
    return lineTokens.getStandardTokenType(0) === 2 /* StandardTokenType.String */;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmRlbnRhdGlvbi9jb21tb24vaW5kZW50YXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHN0QsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFHNUcsTUFBTSxVQUFVLHlCQUF5QixDQUN4QyxLQUFpQixFQUNqQiw0QkFBMkQsRUFDM0QsZUFBdUIsRUFDdkIsYUFBcUI7SUFFckIsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNuRSxpQkFBaUI7UUFDakIsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsTUFBTSx1QkFBdUIsR0FBRyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FDcEYsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUNyQixDQUFDLGtCQUFrQixDQUFBO0lBQ3BCLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzlCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSwyQkFBMkIsQ0FDbEUsS0FBSyxFQUNMLHVCQUF1QixFQUN2Qiw0QkFBNEIsQ0FD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