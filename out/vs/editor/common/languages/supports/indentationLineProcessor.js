/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { createScopedLineTokens } from '../supports.js';
import { LineTokens } from '../../tokens/lineTokens.js';
/**
 * This class is a wrapper class around {@link IndentRulesSupport}.
 * It processes the lines by removing the language configuration brackets from the regex, string and comment tokens.
 * It then calls into the {@link IndentRulesSupport} to validate the indentation conditions.
 */
export class ProcessedIndentRulesSupport {
    constructor(model, indentRulesSupport, languageConfigurationService) {
        this._indentRulesSupport = indentRulesSupport;
        this._indentationLineProcessor = new IndentationLineProcessor(model, languageConfigurationService);
    }
    /**
     * Apply the new indentation and return whether the indentation level should be increased after the given line number
     */
    shouldIncrease(lineNumber, newIndentation) {
        const processedLine = this._indentationLineProcessor.getProcessedLine(lineNumber, newIndentation);
        return this._indentRulesSupport.shouldIncrease(processedLine);
    }
    /**
     * Apply the new indentation and return whether the indentation level should be decreased after the given line number
     */
    shouldDecrease(lineNumber, newIndentation) {
        const processedLine = this._indentationLineProcessor.getProcessedLine(lineNumber, newIndentation);
        return this._indentRulesSupport.shouldDecrease(processedLine);
    }
    /**
     * Apply the new indentation and return whether the indentation level should remain unchanged at the given line number
     */
    shouldIgnore(lineNumber, newIndentation) {
        const processedLine = this._indentationLineProcessor.getProcessedLine(lineNumber, newIndentation);
        return this._indentRulesSupport.shouldIgnore(processedLine);
    }
    /**
     * Apply the new indentation and return whether the indentation level should increase on the line after the given line number
     */
    shouldIndentNextLine(lineNumber, newIndentation) {
        const processedLine = this._indentationLineProcessor.getProcessedLine(lineNumber, newIndentation);
        return this._indentRulesSupport.shouldIndentNextLine(processedLine);
    }
}
/**
 * This class fetches the processed text around a range which can be used for indentation evaluation.
 * It returns:
 * - The processed text before the given range and on the same start line
 * - The processed text after the given range and on the same end line
 * - The processed text on the previous line
 */
export class IndentationContextProcessor {
    constructor(model, languageConfigurationService) {
        this.model = model;
        this.indentationLineProcessor = new IndentationLineProcessor(model, languageConfigurationService);
    }
    /**
     * Returns the processed text, stripped from the language configuration brackets within the string, comment and regex tokens, around the given range
     */
    getProcessedTokenContextAroundRange(range) {
        const beforeRangeProcessedTokens = this._getProcessedTokensBeforeRange(range);
        const afterRangeProcessedTokens = this._getProcessedTokensAfterRange(range);
        const previousLineProcessedTokens = this._getProcessedPreviousLineTokens(range);
        return { beforeRangeProcessedTokens, afterRangeProcessedTokens, previousLineProcessedTokens };
    }
    _getProcessedTokensBeforeRange(range) {
        this.model.tokenization.forceTokenization(range.startLineNumber);
        const lineTokens = this.model.tokenization.getLineTokens(range.startLineNumber);
        const scopedLineTokens = createScopedLineTokens(lineTokens, range.startColumn - 1);
        let slicedTokens;
        if (isLanguageDifferentFromLineStart(this.model, range.getStartPosition())) {
            const columnIndexWithinScope = range.startColumn - 1 - scopedLineTokens.firstCharOffset;
            const firstCharacterOffset = scopedLineTokens.firstCharOffset;
            const lastCharacterOffset = firstCharacterOffset + columnIndexWithinScope;
            slicedTokens = lineTokens.sliceAndInflate(firstCharacterOffset, lastCharacterOffset, 0);
        }
        else {
            const columnWithinLine = range.startColumn - 1;
            slicedTokens = lineTokens.sliceAndInflate(0, columnWithinLine, 0);
        }
        const processedTokens = this.indentationLineProcessor.getProcessedTokens(slicedTokens);
        return processedTokens;
    }
    _getProcessedTokensAfterRange(range) {
        const position = range.isEmpty() ? range.getStartPosition() : range.getEndPosition();
        this.model.tokenization.forceTokenization(position.lineNumber);
        const lineTokens = this.model.tokenization.getLineTokens(position.lineNumber);
        const scopedLineTokens = createScopedLineTokens(lineTokens, position.column - 1);
        const columnIndexWithinScope = position.column - 1 - scopedLineTokens.firstCharOffset;
        const firstCharacterOffset = scopedLineTokens.firstCharOffset + columnIndexWithinScope;
        const lastCharacterOffset = scopedLineTokens.firstCharOffset + scopedLineTokens.getLineLength();
        const slicedTokens = lineTokens.sliceAndInflate(firstCharacterOffset, lastCharacterOffset, 0);
        const processedTokens = this.indentationLineProcessor.getProcessedTokens(slicedTokens);
        return processedTokens;
    }
    _getProcessedPreviousLineTokens(range) {
        const getScopedLineTokensAtEndColumnOfLine = (lineNumber) => {
            this.model.tokenization.forceTokenization(lineNumber);
            const lineTokens = this.model.tokenization.getLineTokens(lineNumber);
            const endColumnOfLine = this.model.getLineMaxColumn(lineNumber) - 1;
            const scopedLineTokensAtEndColumn = createScopedLineTokens(lineTokens, endColumnOfLine);
            return scopedLineTokensAtEndColumn;
        };
        this.model.tokenization.forceTokenization(range.startLineNumber);
        const lineTokens = this.model.tokenization.getLineTokens(range.startLineNumber);
        const scopedLineTokens = createScopedLineTokens(lineTokens, range.startColumn - 1);
        const emptyTokens = LineTokens.createEmpty('', scopedLineTokens.languageIdCodec);
        const previousLineNumber = range.startLineNumber - 1;
        const isFirstLine = previousLineNumber === 0;
        if (isFirstLine) {
            return emptyTokens;
        }
        const canScopeExtendOnPreviousLine = scopedLineTokens.firstCharOffset === 0;
        if (!canScopeExtendOnPreviousLine) {
            return emptyTokens;
        }
        const scopedLineTokensAtEndColumnOfPreviousLine = getScopedLineTokensAtEndColumnOfLine(previousLineNumber);
        const doesLanguageContinueOnPreviousLine = scopedLineTokens.languageId === scopedLineTokensAtEndColumnOfPreviousLine.languageId;
        if (!doesLanguageContinueOnPreviousLine) {
            return emptyTokens;
        }
        const previousSlicedLineTokens = scopedLineTokensAtEndColumnOfPreviousLine.toIViewLineTokens();
        const processedTokens = this.indentationLineProcessor.getProcessedTokens(previousSlicedLineTokens);
        return processedTokens;
    }
}
/**
 * This class performs the actual processing of the indentation lines.
 * The brackets of the language configuration are removed from the regex, string and comment tokens.
 */
class IndentationLineProcessor {
    constructor(model, languageConfigurationService) {
        this.model = model;
        this.languageConfigurationService = languageConfigurationService;
    }
    /**
     * Get the processed line for the given line number and potentially adjust the indentation level.
     * Remove the language configuration brackets from the regex, string and comment tokens.
     */
    getProcessedLine(lineNumber, newIndentation) {
        const replaceIndentation = (line, newIndentation) => {
            const currentIndentation = strings.getLeadingWhitespace(line);
            const adjustedLine = newIndentation + line.substring(currentIndentation.length);
            return adjustedLine;
        };
        this.model.tokenization.forceTokenization?.(lineNumber);
        const tokens = this.model.tokenization.getLineTokens(lineNumber);
        let processedLine = this.getProcessedTokens(tokens).getLineContent();
        if (newIndentation !== undefined) {
            processedLine = replaceIndentation(processedLine, newIndentation);
        }
        return processedLine;
    }
    /**
     * Process the line with the given tokens, remove the language configuration brackets from the regex, string and comment tokens.
     */
    getProcessedTokens(tokens) {
        const shouldRemoveBracketsFromTokenType = (tokenType) => {
            return (tokenType === 2 /* StandardTokenType.String */ ||
                tokenType === 3 /* StandardTokenType.RegEx */ ||
                tokenType === 1 /* StandardTokenType.Comment */);
        };
        const languageId = tokens.getLanguageId(0);
        const bracketsConfiguration = this.languageConfigurationService.getLanguageConfiguration(languageId).bracketsNew;
        const bracketsRegExp = bracketsConfiguration.getBracketRegExp({ global: true });
        const textAndMetadata = [];
        tokens.forEach((tokenIndex) => {
            const tokenType = tokens.getStandardTokenType(tokenIndex);
            let text = tokens.getTokenText(tokenIndex);
            if (shouldRemoveBracketsFromTokenType(tokenType)) {
                text = text.replace(bracketsRegExp, '');
            }
            const metadata = tokens.getMetadata(tokenIndex);
            textAndMetadata.push({ text, metadata });
        });
        const processedLineTokens = LineTokens.createFromTextAndMetadata(textAndMetadata, tokens.languageIdCodec);
        return processedLineTokens;
    }
}
export function isLanguageDifferentFromLineStart(model, position) {
    model.tokenization.forceTokenization(position.lineNumber);
    const lineTokens = model.tokenization.getLineTokens(position.lineNumber);
    const scopedLineTokens = createScopedLineTokens(lineTokens, position.column - 1);
    const doesScopeStartAtOffsetZero = scopedLineTokens.firstCharOffset === 0;
    const isScopedLanguageEqualToFirstLanguageOnLine = lineTokens.getLanguageId(0) === scopedLineTokens.languageId;
    const languageIsDifferentFromLineStart = !doesScopeStartAtOffsetZero && !isScopedLanguageEqualToFirstLanguageOnLine;
    return languageIsDifferentFromLineStart;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25MaW5lUHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvc3VwcG9ydHMvaW5kZW50YXRpb25MaW5lUHJvY2Vzc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFJN0QsT0FBTyxFQUFFLHNCQUFzQixFQUFvQixNQUFNLGdCQUFnQixDQUFBO0FBRXpFLE9BQU8sRUFBbUIsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFLeEU7Ozs7R0FJRztBQUNILE1BQU0sT0FBTywyQkFBMkI7SUFJdkMsWUFDQyxLQUFvQixFQUNwQixrQkFBc0MsRUFDdEMsNEJBQTJEO1FBRTNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQTtRQUM3QyxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSx3QkFBd0IsQ0FDNUQsS0FBSyxFQUNMLDRCQUE0QixDQUM1QixDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYyxDQUFDLFVBQWtCLEVBQUUsY0FBdUI7UUFDaEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUNwRSxVQUFVLEVBQ1YsY0FBYyxDQUNkLENBQUE7UUFDRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYyxDQUFDLFVBQWtCLEVBQUUsY0FBdUI7UUFDaEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUNwRSxVQUFVLEVBQ1YsY0FBYyxDQUNkLENBQUE7UUFDRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIs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