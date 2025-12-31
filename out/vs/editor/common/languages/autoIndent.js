/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { IndentAction } from './languageConfiguration.js';
import { IndentationContextProcessor, isLanguageDifferentFromLineStart, ProcessedIndentRulesSupport, } from './supports/indentationLineProcessor.js';
/**
 * Get nearest preceding line which doesn't match unIndentPattern or contains all whitespace.
 * Result:
 * -1: run into the boundary of embedded languages
 * 0: every line above are invalid
 * else: nearest preceding line of the same language
 */
function getPrecedingValidLine(model, lineNumber, processedIndentRulesSupport) {
    const languageId = model.tokenization.getLanguageIdAtPosition(lineNumber, 0);
    if (lineNumber > 1) {
        let lastLineNumber;
        let resultLineNumber = -1;
        for (lastLineNumber = lineNumber - 1; lastLineNumber >= 1; lastLineNumber--) {
            if (model.tokenization.getLanguageIdAtPosition(lastLineNumber, 0) !== languageId) {
                return resultLineNumber;
            }
            const text = model.getLineContent(lastLineNumber);
            if (processedIndentRulesSupport.shouldIgnore(lastLineNumber) ||
                /^\s+$/.test(text) ||
                text === '') {
                resultLineNumber = lastLineNumber;
                continue;
            }
            return lastLineNumber;
        }
    }
    return -1;
}
/**
 * Get inherited indentation from above lines.
 * 1. Find the nearest preceding line which doesn't match unIndentedLinePattern.
 * 2. If this line matches indentNextLinePattern or increaseIndentPattern, it means that the indent level of `lineNumber` should be 1 greater than this line.
 * 3. If this line doesn't match any indent rules
 *   a. check whether the line above it matches indentNextLinePattern
 *   b. If not, the indent level of this line is the result
 *   c. If so, it means the indent of this line is *temporary*, go upward utill we find a line whose indent is not temporary (the same workflow a -> b -> c).
 * 4. Otherwise, we fail to get an inherited indent from aboves. Return null and we should not touch the indent of `lineNumber`
 *
 * This function only return the inherited indent based on above lines, it doesn't check whether current line should decrease or not.
 */
export function getInheritIndentForLine(autoIndent, model, lineNumber, honorIntentialIndent = true, languageConfigurationService) {
    if (autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
        return null;
    }
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(model.tokenization.getLanguageId()).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentRulesSupport, languageConfigurationService);
    if (lineNumber <= 1) {
        return {
            indentation: '',
            action: null,
        };
    }
    // Use no indent if this is the first non-blank line
    for (let priorLineNumber = lineNumber - 1; priorLineNumber > 0; priorLineNumber--) {
        if (model.getLineContent(priorLineNumber) !== '') {
            break;
        }
        if (priorLineNumber === 1) {
            return {
                indentation: '',
                action: null,
            };
        }
    }
    const precedingUnIgnoredLine = getPrecedingValidLine(model, lineNumber, processedIndentRulesSupport);
    if (precedingUnIgnoredLine < 0) {
        return null;
    }
    else if (precedingUnIgnoredLine < 1) {
        return {
            indentation: '',
            action: null,
        };
    }
    if (processedIndentRulesSupport.shouldIncrease(precedingUnIgnoredLine) ||
        processedIndentRulesSupport.shouldIndentNextLine(precedingUnIgnoredLine)) {
        const precedingUnIgnoredLineContent = model.getLineContent(precedingUnIgnoredLine);
        return {
            indentation: strings.getLeadingWhitespace(precedingUnIgnoredLineContent),
            action: IndentAction.Indent,
            line: precedingUnIgnoredLine,
        };
    }
    else if (processedIndentRulesSupport.shouldDecrease(precedingUnIgnoredLine)) {
        const precedingUnIgnoredLineContent = model.getLineContent(precedingUnIgnoredLine);
        return {
            indentation: strings.getLeadingWhitespace(precedingUnIgnoredLineContent),
            action: null,
            line: precedingUnIgnoredLine,
        };
    }
    else {
        // precedingUnIgnoredLine can not be ignored.
        // it doesn't increase indent of following lines
        // it doesn't increase just next line
        // so current line is not affect by precedingUnIgnoredLine
        // and then we should get a correct inheritted indentation from above lines
        if (precedingUnIgnoredLine === 1) {
            return {
                indentation: strings.getLeadingWhitespace(model.getLineContent(precedingUnIgnoredLine)),
                action: null,
                line: precedingUnIgnoredLine,
            };
        }
        const previousLine = precedingUnIgnoredLine - 1;
        const previousLineIndentMetadata = indentRulesSupport.getIndentMetadata(model.getLineContent(previousLine));
        if (!(previousLineIndentMetadata & (1 /* IndentConsts.INCREASE_MASK */ | 2 /* IndentConsts.DECREASE_MASK */)) &&
            previousLineIndentMetadata & 4 /* IndentConsts.INDENT_NEXTLINE_MASK */) {
            let stopLine = 0;
            for (let i = previousLine - 1; i > 0; i--) {
                if (processedIndentRulesSupport.shouldIndentNextLine(i)) {
                    continue;
                }
                stopLine = i;
                break;
            }
            return {
                indentation: strings.getLeadingWhitespace(model.getLineContent(stopLine + 1)),
                action: null,
                line: stopLine + 1,
            };
        }
        if (honorIntentialIndent) {
            return {
                indentation: strings.getLeadingWhitespace(model.getLineContent(precedingUnIgnoredLine)),
                action: null,
                line: precedingUnIgnoredLine,
            };
        }
        else {
            // search from precedingUnIgnoredLine until we find one whose indent is not temporary
            for (let i = precedingUnIgnoredLine; i > 0; i--) {
                if (processedIndentRulesSupport.shouldIncrease(i)) {
                    return {
                        indentation: strings.getLeadingWhitespace(model.getLineContent(i)),
                        action: IndentAction.Indent,
                        line: i,
                    };
                }
                else if (processedIndentRulesSupport.shouldIndentNextLine(i)) {
                    let stopLine = 0;
                    for (let j = i - 1; j > 0; j--) {
                        if (processedIndentRulesSupport.shouldIndentNextLine(i)) {
                            continue;
                        }
                        stopLine = j;
                        break;
                    }
                    return {
                        indentation: strings.getLeadingWhitespace(model.getLineContent(stopLine + 1)),
                        action: null,
                        line: stopLine + 1,
                    };
                }
                else if (processedIndentRulesSupport.shouldDecrease(i)) {
                    return {
                        indentation: strings.getLeadingWhitespace(model.getLineContent(i)),
                        action: null,
                        line: i,
                    };
                }
            }
            return {
                indentation: strings.getLeadingWhitespace(model.getLineContent(1)),
                action: null,
                line: 1,
            };
        }
    }
}
export function getGoodIndentForLine(autoIndent, virtualModel, languageId, lineNumber, indentConverter, languageConfigurationService) {
    if (autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
        return null;
    }
    const richEditSupport = languageConfigurationService.getLanguageConfiguration(languageId);
    if (!richEditSupport) {
        return null;
    }
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    const processedIndentRulesSupport = new ProcessedIndentRulesSupport(virtualModel, indentRulesSupport, languageConfigurationService);
    const indent = getInheritIndentForLine(autoIndent, virtualModel, lineNumber, undefined, languageConfigurationService);
    if (indent) {
        const inheritLine = indent.line;
        if (inheritLine !== undefined) {
            // Apply enter action as long as there are only whitespace lines between inherited line and this line.
            let shouldApplyEnterRules = true;
            for (let inBetweenLine = inheritLine; inBetweenLine < lineNumber - 1; inBetweenLine++) {
                if (!/^\s*$/.test(virtualModel.getLineContent(inBetweenLine))) {
                    shouldApplyEnterRules = false;
                    break;
                }
            }
            if (shouldApplyEnterRules) {
                const enterResult = richEditSupport.onEnter(autoIndent, '', virtualModel.getLineContent(inheritLine), '');
                if (enterResult) {
                    let indentation = strings.getLeadingWhitespace(virtualModel.getLineContent(inheritLine));
                    if (enterResult.removeText) {
                        indentation = indentation.substring(0, indentation.length - enterResult.removeText);
                    }
                    if (enterResult.indentAction === IndentAction.Indent ||
                        enterResult.indentAction === IndentAction.IndentOutdent) {
                        indentation = indentConverter.shiftIndent(indentation);
                    }
                    else if (enterResult.indentAction === IndentAction.Outdent) {
                        indentation = indentConverter.unshiftIndent(indentation);
                    }
                    if (processedIndentRulesSupport.shouldDecrease(lineNumber)) {
                        indentation = indentConverter.unshiftIndent(indentation);
                    }
                    if (enterResult.appendText) {
                        indentation += enterResult.appendText;
                    }
                    return strings.getLeadingWhitespace(indentation);
                }
            }
        }
        if (processedIndentRulesSupport.shouldDecrease(lineNumber)) {
            if (indent.action === IndentAction.Indent) {
                return indent.indentation;
            }
            else {
                return indentConverter.unshiftIndent(indent.indentation);
            }
        }
        else {
            if (indent.action === IndentAction.Indent) {
                return indentConverter.shiftIndent(indent.indentation);
            }
            else {
                return indent.indentation;
            }
        }
    }
    return null;
}
export function getIndentForEnter(autoIndent, model, range, indentConverter, languageConfigurationService) {
    if (autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
        return null;
    }
    const languageId = model.getLanguageIdAtPosition(range.startLineNumber, range.startColumn);
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    model.tokenization.forceTokenization(range.startLineNumber);
    const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
    const processedContextTokens = indentationContextProcessor.getProcessedTokenContextAroundRange(range);
    const afterEnterProcessedTokens = processedContextTokens.afterRangeProcessedTokens;
    const beforeEnterProcessedTokens = processedContextTokens.beforeRangeProcessedTokens;
    const beforeEnterIndent = strings.getLeadingWhitespace(beforeEnterProcessedTokens.getLineContent());
    const virtualModel = createVirtualModelWithModifiedTokensAtLine(model, range.startLineNumber, beforeEnterProcessedTokens);
    const languageIsDifferentFromLineStart = isLanguageDifferentFromLineStart(model, range.getStartPosition());
    const currentLine = model.getLineContent(range.startLineNumber);
    const currentLineIndent = strings.getLeadingWhitespace(currentLine);
    const afterEnterAction = getInheritIndentForLine(autoIndent, virtualModel, range.startLineNumber + 1, undefined, languageConfigurationService);
    if (!afterEnterAction) {
        const beforeEnter = languageIsDifferentFromLineStart ? currentLineIndent : beforeEnterIndent;
        return {
            beforeEnter: beforeEnter,
            afterEnter: beforeEnter,
        };
    }
    let afterEnterIndent = languageIsDifferentFromLineStart
        ? currentLineIndent
        : afterEnterAction.indentation;
    if (afterEnterAction.action === IndentAction.Indent) {
        afterEnterIndent = indentConverter.shiftIndent(afterEnterIndent);
    }
    if (indentRulesSupport.shouldDecrease(afterEnterProcessedTokens.getLineContent())) {
        afterEnterIndent = indentConverter.unshiftIndent(afterEnterIndent);
    }
    return {
        beforeEnter: languageIsDifferentFromLineStart ? currentLineIndent : beforeEnterIndent,
        afterEnter: afterEnterIndent,
    };
}
/**
 * We should always allow intentional indentation. It means, if users change the indentation of `lineNumber` and the content of
 * this line doesn't match decreaseIndentPattern, we should not adjust the indentation.
 */
export function getIndentActionForType(cursorConfig, model, range, ch, indentConverter, languageConfigurationService) {
    const autoIndent = cursorConfig.autoIndent;
    if (autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
        return null;
    }
    const languageIsDifferentFromLineStart = isLanguageDifferentFromLineStart(model, range.getStartPosition());
    if (languageIsDifferentFromLineStart) {
        // this line has mixed languages and indentation rules will not work
        return null;
    }
    const languageId = model.getLanguageIdAtPosition(range.startLineNumber, range.startColumn);
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
    const processedContextTokens = indentationContextProcessor.getProcessedTokenContextAroundRange(range);
    const beforeRangeText = processedContextTokens.beforeRangeProcessedTokens.getLineContent();
    const afterRangeText = processedContextTokens.afterRangeProcessedTokens.getLineContent();
    const textAroundRange = beforeRangeText + afterRangeText;
    const textAroundRangeWithCharacter = beforeRangeText + ch + afterRangeText;
    // If previous content already matches decreaseIndentPattern, it means indentation of this line should already be adjusted
    // Users might change the indentation by purpose and we should honor that instead of readjusting.
    if (!indentRulesSupport.shouldDecrease(textAroundRange) &&
        indentRulesSupport.shouldDecrease(textAroundRangeWithCharacter)) {
        // after typing `ch`, the content matches decreaseIndentPattern, we should adjust the indent to a good manner.
        // 1. Get inherited indent action
        const r = getInheritIndentForLine(autoIndent, model, range.startLineNumber, false, languageConfigurationService);
        if (!r) {
            return null;
        }
        let indentation = r.indentation;
        if (r.action !== IndentAction.Indent) {
            indentation = indentConverter.unshiftIndent(indentation);
        }
        return indentation;
    }
    const previousLineNumber = range.startLineNumber - 1;
    if (previousLineNumber > 0) {
        const previousLine = model.getLineContent(previousLineNumber);
        if (indentRulesSupport.shouldIndentNextLine(previousLine) &&
            indentRulesSupport.shouldIncrease(textAroundRangeWithCharacter)) {
            const inheritedIndentationData = getInheritIndentForLine(autoIndent, model, range.startLineNumber, false, languageConfigurationService);
            const inheritedIndentation = inheritedIndentationData?.indentation;
            if (inheritedIndentation !== undefined) {
                const currentLine = model.getLineContent(range.startLineNumber);
                const actualCurrentIndentation = strings.getLeadingWhitespace(currentLine);
                const inferredCurrentIndentation = indentConverter.shiftIndent(inheritedIndentation);
                // If the inferred current indentation is not equal to the actual current indentation, then the indentation has been intentionally changed, in that case keep it
                const inferredIndentationEqualsActual = inferredCurrentIndentation === actualCurrentIndentation;
                const textAroundRangeContainsOnlyWhitespace = /^\s*$/.test(textAroundRange);
                const autoClosingPairs = cursorConfig.autoClosingPairs.autoClosingPairsOpenByEnd.get(ch);
                const autoClosingPairExists = autoClosingPairs && autoClosingPairs.length > 0;
                const isChFirstNonWhitespaceCharacterAndInAutoClosingPair = autoClosingPairExists && textAroundRangeContainsOnlyWhitespace;
                if (inferredIndentationEqualsActual &&
                    isChFirstNonWhitespaceCharacterAndInAutoClosingPair) {
                    return inheritedIndentation;
                }
            }
        }
    }
    return null;
}
export function getIndentMetadata(model, lineNumber, languageConfigurationService) {
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    if (lineNumber < 1 || lineNumber > model.getLineCount()) {
        return null;
    }
    return indentRulesSupport.getIndentMetadata(model.getLineContent(lineNumber));
}
function createVirtualModelWithModifiedTokensAtLine(model, modifiedLineNumber, modifiedTokens) {
    const virtualModel = {
        tokenization: {
            getLineTokens: (lineNumber) => {
                if (lineNumber === modifiedLineNumber) {
                    return modifiedTokens;
                }
                else {
                    return model.tokenization.getLineTokens(lineNumber);
                }
            },
            getLanguageId: () => {
                return model.getLanguageId();
            },
            getLanguageIdAtPosition: (lineNumber, column) => {
                return model.getLanguageIdAtPosition(lineNumber, column);
            },
        },
        getLineContent: (lineNumber) => {
            if (lineNumber === modifiedLineNumber) {
                return modifiedTokens.getLineContent();
            }
            else {
                return model.getLineContent(lineNumber);
            }
        },
    };
    return virtualModel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0luZGVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL2F1dG9JbmRlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFLekQsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixnQ0FBZ0MsRUFDaEMsMkJBQTJCLEdBQzNCLE1BQU0sd0NBQXdDLENBQUE7QUFtQi9DOzs7Ozs7R0FNRztBQUNILFNBQVMscUJBQXFCLENBQzdCLEtBQW9CLEVBQ3BCLFVBQWtCLEVBQ2xCLDJCQUF3RDtJQUV4RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM1RSxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNwQixJQUFJLGNBQXNCLENBQUE7UUFDMUIsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUV6QixLQUFLLGNBQWMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxFQUFFLGNBQWMsSUFBSSxDQUFDLEVBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBQztZQUM3RSxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNsRixPQUFPLGdCQUFnQixDQUFBO1lBQ3hCLENBQUM7WUFDRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ2pELElBQ0MsMkJBQTJCLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQztnQkFDeEQsT0FBTyxDQUFD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