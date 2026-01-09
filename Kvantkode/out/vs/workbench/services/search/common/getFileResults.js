/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../editor/common/core/range.js';
export const getFileResults = (bytes, pattern, options) => {
    let text;
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        text = new TextDecoder('utf-16le').decode(bytes);
    }
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        text = new TextDecoder('utf-16be').decode(bytes);
    }
    else {
        text = new TextDecoder('utf8').decode(bytes);
        if (text.slice(0, 1000).includes('\uFFFD') && bytes.includes(0)) {
            return [];
        }
    }
    const results = [];
    const patternIndecies = [];
    let patternMatch = null;
    let remainingResultQuota = options.remainingResultQuota;
    while (remainingResultQuota >= 0 && (patternMatch = pattern.exec(text))) {
        patternIndecies.push({ matchStartIndex: patternMatch.index, matchedText: patternMatch[0] });
        remainingResultQuota--;
    }
    if (patternIndecies.length) {
        const contextLinesNeeded = new Set();
        const resultLines = new Set();
        const lineRanges = [];
        const readLine = (lineNumber) => text.slice(lineRanges[lineNumber].start, lineRanges[lineNumber].end);
        let prevLineEnd = 0;
        let lineEndingMatch = null;
        const lineEndRegex = /\r?\n/g;
        while ((lineEndingMatch = lineEndRegex.exec(text))) {
            lineRanges.push({ start: prevLineEnd, end: lineEndingMatch.index });
            prevLineEnd = lineEndingMatch.index + lineEndingMatch[0].length;
        }
        if (prevLineEnd < text.length) {
            lineRanges.push({ start: prevLineEnd, end: text.length });
        }
        let startLine = 0;
        for (const { matchStartIndex, matchedText } of patternIndecies) {
            if (remainingResultQuota < 0) {
                break;
            }
            while (Boolean(lineRanges[startLine + 1]) && matchStartIndex > lineRanges[startLine].end) {
                startLine++;
            }
            let endLine = startLine;
            while (Boolean(lineRanges[endLine + 1]) &&
                matchStartIndex + matchedText.length > lineRanges[endLine].end) {
                endLine++;
            }
            if (options.surroundingContext) {
                for (let contextLine = Math.max(0, startLine - options.surroundingContext); contextLine < startLine; contextLine++) {
                    contextLinesNeeded.add(contextLine);
                }
            }
            let previewText = '';
            let offset = 0;
            for (let matchLine = startLine; matchLine <= endLine; matchLine++) {
                let previewLine = readLine(matchLine);
                if (options.previewOptions?.charsPerLine &&
                    previewLine.length > options.previewOptions.charsPerLine) {
                    offset = Math.max(matchStartIndex - lineRanges[startLine].start - 20, 0);
                    previewLine = previewLine.substr(offset, options.previewOptions.charsPerLine);
                }
                previewText += `${previewLine}\n`;
                resultLines.add(matchLine);
            }
            const fileRange = new Range(startLine, matchStartIndex - lineRanges[startLine].start, endLine, matchStartIndex + matchedText.length - lineRanges[endLine].start);
            const previewRange = new Range(0, matchStartIndex - lineRanges[startLine].start - offset, endLine - startLine, matchStartIndex +
                matchedText.length -
                lineRanges[endLine].start -
                (endLine === startLine ? offset : 0));
            const match = {
                rangeLocations: [
                    {
                        source: fileRange,
                        preview: previewRange,
                    },
                ],
                previewText: previewText,
            };
            results.push(match);
            if (options.surroundingContext) {
                for (let contextLine = endLine + 1; contextLine <= Math.min(endLine + options.surroundingContext, lineRanges.length - 1); contextLine++) {
                    contextLinesNeeded.add(contextLine);
                }
            }
        }
        for (const contextLine of contextLinesNeeded) {
            if (!resultLines.has(contextLine)) {
                results.push({
                    text: readLine(contextLine),
                    lineNumber: contextLine + 1,
                });
            }
        }
    }
    return results;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0RmlsZVJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL2dldEZpbGVSZXN1bHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUvRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FDN0IsS0FBaUIsRUFDakIsT0FBZSxFQUNmLE9BSUMsRUFDcUIsRUFBRTtJQUN4QixJQUFJLElBQVksQ0FBQTtJQUNoQixJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQzVDLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakQsQ0FBQztTQUFNLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDbkQsSUFBSSxHQUFHLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqRCxDQUFDO1NBQU0sQ0FBQztRQUNQLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxD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