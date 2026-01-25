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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFNlY3Rpb25IZWFkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL2ZpbmRTZWN0aW9uSGVhZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQWlDcEUsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFBO0FBRWxDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQTtBQUN0QixNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtBQUUzQjs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQ2pDLEtBQWlDLEVBQ2pDLE9BQWlDO0lBRWpDLElBQUksT0FBTyxHQUFvQixFQUFFLENBQUE7SUFDakMsSUFBSSxPQUFPLENBQUMsd0JBQXdCLElBQUksT0FBTyxDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN2RSxNQUFNLGFBQWEsR0FBRyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDMUQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDcEMsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3RELE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFDRCxPQUFPLE9BQU8sQ0FBQTtBQUNmLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUM1QixLQUFpQyxFQUNqQyxPQUFpQztJQUVqQyxNQUFNLGFBQWEsR0FBb0IsRUFBRSxDQUFBO0lBQ3pDLE1B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