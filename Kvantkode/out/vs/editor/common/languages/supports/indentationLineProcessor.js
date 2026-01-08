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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25MaW5lUHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9zdXBwb3J0cy9pbmRlbnRhdGlvbkxpbmVQcm9jZXNzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUk3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQW9CLE1BQU0sZ0JBQWdCLENBQUE7QUFFekUsT0FBTyxFQUFtQixVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUt4RTs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLDJCQUEyQjtJQUl2QyxZQUNDLEtBQW9CLEVBQ3BCLGtCQUFzQyxFQUN0Qyw0QkFBMkQ7UUFFM0QsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFBO1FBQzdDLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLHdCQUF3QixDQUM1RCxLQUFLLEVBQ0wsNEJBQTRCLENBQzVCLENBQUE7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjLENBQUMsVUFBa0IsRUFBRSxjQUF1QjtRQUNoRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQ3BFLFVBQVUsRUFDVixjQUFjLENBQ2QsQ0FBQTtRQUNELE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUM5RCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjLENBQUMsVUFBa0IsRUFBRSxjQUF1QjtRQUNoRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQ3BFLFVBQVUsRUFDVixjQUFjLENBQ2QsQ0FBQTtRQUNELE9BQU8sSUFBSSxDQUFDLG1C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