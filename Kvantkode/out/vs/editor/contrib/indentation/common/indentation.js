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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2luZGVudGF0aW9uL2NvbW1vbi9pbmRlbnRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHVDQUF1QyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUc1RyxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLEtBQWlCLEVBQ2pCLDRCQUEyRCxFQUMzRCxlQUF1QixFQUN2QixhQUFxQjtJQUVyQixJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ25FLGlCQUFpQjtRQUNqQixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxNQUFNLHVCQUF1QixHQUFHLDRCQUE0QixDQUFDLHdCQUF3QixDQUNwRixLQUFLLENBQUMsYUFBYSxFQUFFLENBQ3JCLENBQUMsa0JBQWtCLENBQUE7SUFDcEIsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDOUIsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLDJCQUEyQixDQUNsRSxLQUFLLEVBQ0wsdUJBQXVCLEVBQ3ZCLDRCQUE0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