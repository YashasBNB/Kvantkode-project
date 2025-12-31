/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMultilineRegexSource } from '../model/textModelSearch.js';
const trimDashesRegex = /^-+|-+$/g;
const CHUNK_SIZE = 100;
const MAX_SECTION_LINES = 5;
/**
 * Find section headers in the model.
 *
 * @param model the text model to search in
 * @param options options to search with
 * @returns an array of section headers
 */
export function findSectionHeaders(model, options) {
    let headers = [];
    if (options.findRegionSectionHeaders && options.foldingRules?.markers) {
        const regionHeaders = collectRegionHeaders(model, options);
        headers = headers.concat(regionHeaders);
    }
    if (options.findMarkSectionHeaders) {
        const markHeaders = collectMarkHeaders(model, options);
        headers = headers.concat(markHeaders);
    }
    return headers;
}
function collectRegionHeaders(model, options) {
    const regionHeaders = [];
    const endLineNumber = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= endLineNumber; lineNumber++) {
        const lineContent = model.getLineContent(lineNumber);
        const match = lineContent.match(options.foldingRules.markers.start);
        if (match) {
            const range = {
                startLineNumber: lineNumber,
                startColumn: match[0].length + 1,
                endLineNumber: lineNumber,
                endColumn: lineContent.length + 1,
            };
            if (range.endColumn > range.startColumn) {
                const sectionHeader = {
                    range,
                    ...getHeaderText(lineContent.substring(match[0].length)),
                    shouldBeInComments: false,
                };
                if (sectionHeader.text || sectionHeader.hasSeparatorLine) {
                    regionHeaders.push(sectionHeader);
                }
            }
        }
    }
    return regionHeaders;
}
export function collectMarkHeaders(model, options) {
    const markHeaders = [];
    const endLineNumber = model.getLineCount();
    // Create regex with flags for:
    // - 'd' for indices to get proper match positions
    // - 'm' for multi-line mode so ^ and $ match line starts/ends
    // - 's' for dot-all mode so . matches newlines
    const multiline = isMultilineRegexSource(options.markSectionHeaderRegex);
    const regex = new RegExp(options.markSectionHeaderRegex, `gdm${multiline ? 's' : ''}`);
    // Process text in overlapping chunks for better performance
    for (let startLine = 1; startLine <= endLineNumber; startLine += CHUNK_SIZE - MAX_SECTION_LINES) {
        const endLine = Math.min(startLine + CHUNK_SIZE - 1, endLineNumber);
        const lines = [];
        // Collect lines for the current chunk
        for (let i = startLine; i <= endLine; i++) {
            lines.push(model.getLineContent(i));
        }
        const text = lines.join('\n');
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            // Calculate which line this match starts on by counting newlines before it
            const precedingText = text.substring(0, match.index);
            const lineOffset = (precedingText.match(/\n/g) || []).length;
            const lineNumber = startLine + lineOffset;
            // Calculate match height to check overlap properly
            const matchLines = match[0].split('\n');
            const matchHeight = matchLines.length;
            const matchEndLine = lineNumber + matchHeight - 1;
            // Calculate start column - need to find the start of the line containing the match
            const lineStartIndex = precedingText.lastIndexOf('\n') + 1;
            const startColumn = match.index - lineStartIndex + 1;
            // Calculate end column - need to handle multi-line matches
            const lastMatchLine = matchLines[matchLines.length - 1];
            const endColumn = matchHeight === 1 ? startColumn + match[0].length : lastMatchLine.length + 1;
            const range = {
                startLineNumber: lineNumber,
                startColumn,
                endLineNumber: matchEndLine,
                endColumn,
            };
            const text2 = (match.groups ?? {})['label'] ?? '';
            const hasSeparatorLine = ((match.groups ?? {})['separator'] ?? '') !== '';
            const sectionHeader = {
                range,
                text: text2,
                hasSeparatorLine,
                shouldBeInComments: true,
            };
            if (sectionHeader.text || sectionHeader.hasSeparatorLine) {
                // only push if the previous one doesn't have this same linbe
                if (markHeaders.length === 0 ||
                    markHeaders[markHeaders.length - 1].range.endLineNumber <
                        sectionHeader.range.startLineNumber) {
                    markHeaders.push(sectionHeader);
                }
            }
            // Move lastIndex past the current match to avoid infinite loop
            regex.lastIndex = match.index + match[0].length;
        }
    }
    return markHeaders;
}
function getHeaderText(text) {
    text = text.trim();
    const hasSeparatorLine = text.startsWith('-');
    text = text.replace(trimDashesRegex, '');
    return { text, hasSeparatorLine };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFNlY3Rpb25IZWFkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9maW5kU2VjdGlvbkhlYWRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFpQ3BFLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQTtBQUVsQyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUE7QUFDdEIsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUE7QUFFM0I7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUNqQyxLQUFpQyxFQUNqQyxPQUFpQztJQUVqQyxJQUFJLE9BQU8sR0FBb0IsRUFBRSxDQUFBO0lBQ2pDLElBQUksT0FBTyxDQUFDLHdCQUF3QixJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDdkUsTUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzFELE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN0RCxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBQ0QsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FDNUIsS0FBaUMsRUFDakMsT0FBaUM7SUFFakMsTUFBTSxhQUFhLEdBQW9CLEVBQUUsQ0FBQTtJQUN6QyxNQUFNLGFB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