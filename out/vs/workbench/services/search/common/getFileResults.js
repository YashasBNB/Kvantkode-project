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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0RmlsZVJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9nZXRGaWxlUmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFL0QsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLENBQzdCLEtBQWlCLEVBQ2pCLE9BQWUsRUFDZixPQUlDLEVBQ3FCLEVBQUU7SUFDeEIsSUFBSSxJQUFZLENBQUE7SUFDaEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM1QyxJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pELENBQUM7U0FBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ25ELElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakQsQ0FBQztTQUFNLENBQUM7UUFDUCxJQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNqRSxPQUFPLEVBQUUsQ0FB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