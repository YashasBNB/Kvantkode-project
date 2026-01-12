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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0luZGVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvYXV0b0luZGVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBRzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUt6RCxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLGdDQUFnQyxFQUNoQywyQkFBMkIsR0FDM0IsTUFBTSx3Q0FBd0MsQ0FBQTtBQW1CL0M7Ozs7OztHQU1HO0FBQ0gsU0FBUyxxQkFBcUIsQ0FDN0IsS0FBb0IsRUFDcEIsVUFBa0IsRUFDbEIsMkJBQXdEO0lBRXhELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzVFLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3BCLElBQUksY0FBc0IsQ0FBQTtRQUMxQixJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRXpCLEtBQUssY0FBYyxHQUFHLFVBQVUsR0FBRyxDQUFDLEVBQUUsY0FBYyxJQUFJLENBQUMsRUFBRSxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQzdFLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ2xGLE9BQU8sZ0JBQWdCLENBQUE7WUFDeEIsQ0FBQztZQUNELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDakQsSUFDQywyQkFBMkIsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDO2dCQUN4RCxPQUFP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