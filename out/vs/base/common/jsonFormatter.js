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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkZvcm1hdHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2pzb25Gb3JtYXR0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBeUIsTUFBTSxXQUFXLENBQUE7QUFpRGhFLE1BQU0sVUFBVSxNQUFNLENBQ3JCLFlBQW9CLEVBQ3BCLEtBQXdCLEVBQ3hCLE9BQTBCO0lBRTFCLElBQUksa0JBQTBCLENBQUE7SUFDOUIsSUFBSSxVQUFrQixDQUFBO0lBQ3RCLElBQUksZUFBdUIsQ0FBQTtJQUMzQixJQUFJLFVBQWtCLENBQUE7SUFDdEIsSUFBSSxRQUFnQixDQUFBO0lBQ3BCLElBQUksS0FBSyxFQUFFLENBQUM7UUFDWCxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQTtRQUN6QixRQUFRLEdBQUcsVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7UUFFcEMsZUFBZSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixPQUFPLGVBQWUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLGVBQWUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3pFLGVBQWUsRUFBRSxDQUFBO1FBQ2xCLENBQUM7UUFDRCxJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUE7UUFDeEIsT0FBTyxTQUFTLEdBQUcsWUFBWSxDQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMzRSxTQUFTLEVBQUUsQ0FBQTtRQUNaLENBQUM7UUFDRCxVQUFVLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0Qsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FB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