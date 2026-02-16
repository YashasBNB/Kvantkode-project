/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createScanner } from './json.js';
export function format(documentText, range, options) {
    let initialIndentLevel;
    let formatText;
    let formatTextStart;
    let rangeStart;
    let rangeEnd;
    if (range) {
        rangeStart = range.offset;
        rangeEnd = rangeStart + range.length;
        formatTextStart = rangeStart;
        while (formatTextStart > 0 && !isEOL(documentText, formatTextStart - 1)) {
            formatTextStart--;
        }
        let endOffset = rangeEnd;
        while (endOffset < documentText.length && !isEOL(documentText, endOffset)) {
            endOffset++;
        }
        formatText = documentText.substring(formatTextStart, endOffset);
        initialIndentLevel = computeIndentLevel(formatText, options);
    }
    else {
        formatText = documentText;
        initialIndentLevel = 0;
        formatTextStart = 0;
        rangeStart = 0;
        rangeEnd = documentText.length;
    }
    const eol = getEOL(options, documentText);
    let lineBreak = false;
    let indentLevel = 0;
    let indentValue;
    if (options.insertSpaces) {
        indentValue = repeat(' ', options.tabSize || 4);
    }
    else {
        indentValue = '\t';
    }
    const scanner = createScanner(formatText, false);
    let hasError = false;
    function newLineAndIndent() {
        return eol + repeat(indentValue, initialIndentLevel + indentLevel);
    }
    function scanNext() {
        let token = scanner.scan();
        lineBreak = false;
        while (token === 15 /* SyntaxKind.Trivia */ || token === 14 /* SyntaxKind.LineBreakTrivia */) {
            lineBreak = lineBreak || token === 14 /* SyntaxKind.LineBreakTrivia */;
            token = scanner.scan();
        }
        hasError = token === 16 /* SyntaxKind.Unknown */ || scanner.getTokenError() !== 0 /* ScanError.None */;
        return token;
    }
    const editOperations = [];
    function addEdit(text, startOffset, endOffset) {
        if (!hasError &&
            startOffset < rangeEnd &&
            endOffset > rangeStart &&
            documentText.substring(startOffset, endOffset) !== text) {
            editOperations.push({ offset: startOffset, length: endOffset - startOffset, content: text });
        }
    }
    let firstToken = scanNext();
    if (firstToken !== 17 /* SyntaxKind.EOF */) {
        const firstTokenStart = scanner.getTokenOffset() + formatTextStart;
        const initialIndent = repeat(indentValue, initialIndentLevel);
        addEdit(initialIndent, formatTextStart, firstTokenStart);
    }
    while (firstToken !== 17 /* SyntaxKind.EOF */) {
        let firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
        let secondToken = scanNext();
        let replaceContent = '';
        while (!lineBreak &&
            (secondToken === 12 /* SyntaxKind.LineCommentTrivia */ ||
                secondToken === 13 /* SyntaxKind.BlockCommentTrivia */)) {
            // comments on the same line: keep them on the same line, but ignore them otherwise
            const commentTokenStart = scanner.getTokenOffset() + formatTextStart;
            addEdit(' ', firstTokenEnd, commentTokenStart);
            firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
            replaceContent = secondToken === 12 /* SyntaxKind.LineCommentTrivia */ ? newLineAndIndent() : '';
            secondToken = scanNext();
        }
        if (secondToken === 2 /* SyntaxKind.CloseBraceToken */) {
            if (firstToken !== 1 /* SyntaxKind.OpenBraceToken */) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else if (secondToken === 4 /* SyntaxKind.CloseBracketToken */) {
            if (firstToken !== 3 /* SyntaxKind.OpenBracketToken */) {
                indentLevel--;
                replaceContent = newLineAndIndent();
            }
        }
        else {
            switch (firstToken) {
                case 3 /* SyntaxKind.OpenBracketToken */:
                case 1 /* SyntaxKind.OpenBraceToken */:
                    indentLevel++;
                    replaceContent = newLineAndIndent();
                    break;
                case 5 /* SyntaxKind.CommaToken */:
                case 12 /* SyntaxKind.LineCommentTrivia */:
                    replaceContent = newLineAndIndent();
                    break;
                case 13 /* SyntaxKind.BlockCommentTrivia */:
                    if (lineBreak) {
                        replaceContent = newLineAndIndent();
                    }
                    else {
                        // symbol following comment on the same line: keep on same line, separate with ' '
                        replaceContent = ' ';
                    }
                    break;
                case 6 /* SyntaxKind.ColonToken */:
                    replaceContent = ' ';
                    break;
                case 10 /* SyntaxKind.StringLiteral */:
                    if (secondToken === 6 /* SyntaxKind.ColonToken */) {
                        replaceContent = '';
                        break;
                    }
                // fall through
                case 7 /* SyntaxKind.NullKeyword */:
                case 8 /* SyntaxKind.TrueKeyword */:
                case 9 /* SyntaxKind.FalseKeyword */:
                case 11 /* SyntaxKind.NumericLiteral */:
                case 2 /* SyntaxKind.CloseBraceToken */:
                case 4 /* SyntaxKind.CloseBracketToken */:
                    if (secondToken === 12 /* SyntaxKind.LineCommentTrivia */ ||
                        secondToken === 13 /* SyntaxKind.BlockCommentTrivia */) {
                        replaceContent = ' ';
                    }
                    else if (secondToken !== 5 /* SyntaxKind.CommaToken */ && secondToken !== 17 /* SyntaxKind.EOF */) {
                        hasError = true;
                    }
                    break;
                case 16 /* SyntaxKind.Unknown */:
                    hasError = true;
                    break;
            }
            if (lineBreak &&
                (secondToken === 12 /* SyntaxKind.LineCommentTrivia */ ||
                    secondToken === 13 /* SyntaxKind.BlockCommentTrivia */)) {
                replaceContent = newLineAndIndent();
            }
        }
        const secondTokenStart = scanner.getTokenOffset() + formatTextStart;
        addEdit(replaceContent, firstTokenEnd, secondTokenStart);
        firstToken = secondToken;
    }
    return editOperations;
}
/**
 * Creates a formatted string out of the object passed as argument, using the given formatting options
 * @param any The object to stringify and format
 * @param options The formatting options to use
 */
export function toFormattedString(obj, options) {
    const content = JSON.stringify(obj, undefined, options.insertSpaces ? options.tabSize || 4 : '\t');
    if (options.eol !== undefined) {
        return content.replace(/\r\n|\r|\n/g, options.eol);
    }
    return content;
}
function repeat(s, count) {
    let result = '';
    for (let i = 0; i < count; i++) {
        result += s;
    }
    return result;
}
function computeIndentLevel(content, options) {
    let i = 0;
    let nChars = 0;
    const tabSize = options.tabSize || 4;
    while (i < content.length) {
        const ch = content.charAt(i);
        if (ch === ' ') {
            nChars++;
        }
        else if (ch === '\t') {
            nChars += tabSize;
        }
        else {
            break;
        }
        i++;
    }
    return Math.floor(nChars / tabSize);
}
export function getEOL(options, text) {
    for (let i = 0; i < text.length; i++) {
        const ch = text.charAt(i);
        if (ch === '\r') {
            if (i + 1 < text.length && text.charAt(i + 1) === '\n') {
                return '\r\n';
            }
            return '\r';
        }
        else if (ch === '\n') {
            return '\n';
        }
    }
    return (options && options.eol) || '\n';
}
export function isEOL(text, offset) {
    return '\r\n'.indexOf(text.charAt(offset)) !== -1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkZvcm1hdHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vanNvbkZvcm1hdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUF5QixNQUFNLFdBQVcsQ0FBQTtBQWlEaEUsTUFBTSxVQUFVLE1BQU0sQ0FDckIsWUFBb0IsRUFDcEIsS0FBd0IsRUFDeEIsT0FBMEI7SUFFMUIsSUFBSSxrQkFBMEIsQ0FBQTtJQUM5QixJQUFJLFVBQWtCLENBQUE7SUFDdEIsSUFBSSxlQUF1QixDQUFBO0lBQzNCLElBQUksVUFBa0IsQ0FBQTtJQUN0QixJQUFJLFFBQWdCLENBQUE7SUFDcEIsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFBO1FBQ3pCLFFBQVEsR0FBRyxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQTtRQUVwQyxlQUFlLEdBQUcsVUFBVSxDQUFBO1FBQzVCLE9BQU8sZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsZUFBZSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDekUsZUFBZSxFQUFFLENBQUE7UUFDbEIsQ0FBQztRQUNELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUN4QixPQUFPLFNBQVMsR0FBRyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzNFLFNBQVMsRUFBRSxDQUFBO1FBQ1osQ0FBQztRQUNELFVBQVUsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvRCxrQkFBa0IsR0FBRyxrQkFBa0Is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