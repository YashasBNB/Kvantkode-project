/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class SpacesDiffResult {
    constructor() {
        this.spacesDiff = 0;
        this.looksLikeAlignment = false;
    }
}
/**
 * Compute the diff in spaces between two line's indentation.
 */
function spacesDiff(a, aLength, b, bLength, result) {
    result.spacesDiff = 0;
    result.looksLikeAlignment = false;
    // This can go both ways (e.g.):
    //  - a: "\t"
    //  - b: "\t    "
    //  => This should count 1 tab and 4 spaces
    let i;
    for (i = 0; i < aLength && i < bLength; i++) {
        const aCharCode = a.charCodeAt(i);
        const bCharCode = b.charCodeAt(i);
        if (aCharCode !== bCharCode) {
            break;
        }
    }
    let aSpacesCnt = 0, aTabsCount = 0;
    for (let j = i; j < aLength; j++) {
        const aCharCode = a.charCodeAt(j);
        if (aCharCode === 32 /* CharCode.Space */) {
            aSpacesCnt++;
        }
        else {
            aTabsCount++;
        }
    }
    let bSpacesCnt = 0, bTabsCount = 0;
    for (let j = i; j < bLength; j++) {
        const bCharCode = b.charCodeAt(j);
        if (bCharCode === 32 /* CharCode.Space */) {
            bSpacesCnt++;
        }
        else {
            bTabsCount++;
        }
    }
    if (aSpacesCnt > 0 && aTabsCount > 0) {
        return;
    }
    if (bSpacesCnt > 0 && bTabsCount > 0) {
        return;
    }
    const tabsDiff = Math.abs(aTabsCount - bTabsCount);
    const spacesDiff = Math.abs(aSpacesCnt - bSpacesCnt);
    if (tabsDiff === 0) {
        // check if the indentation difference might be caused by alignment reasons
        // sometime folks like to align their code, but this should not be used as a hint
        result.spacesDiff = spacesDiff;
        if (spacesDiff > 0 &&
            0 <= bSpacesCnt - 1 &&
            bSpacesCnt - 1 < a.length &&
            bSpacesCnt < b.length) {
            if (b.charCodeAt(bSpacesCnt) !== 32 /* CharCode.Space */ &&
                a.charCodeAt(bSpacesCnt - 1) === 32 /* CharCode.Space */) {
                if (a.charCodeAt(a.length - 1) === 44 /* CharCode.Comma */) {
                    // This looks like an alignment desire: e.g.
                    // const a = b + c,
                    //       d = b - c;
                    result.looksLikeAlignment = true;
                }
            }
        }
        return;
    }
    if (spacesDiff % tabsDiff === 0) {
        result.spacesDiff = spacesDiff / tabsDiff;
        return;
    }
}
export function guessIndentation(source, defaultTabSize, defaultInsertSpaces) {
    // Look at most at the first 10k lines
    const linesCount = Math.min(source.getLineCount(), 10000);
    let linesIndentedWithTabsCount = 0; // number of lines that contain at least one tab in indentation
    let linesIndentedWithSpacesCount = 0; // number of lines that contain only spaces in indentation
    let previousLineText = ''; // content of latest line that contained non-whitespace chars
    let previousLineIndentation = 0; // index at which latest line contained the first non-whitespace char
    const ALLOWED_TAB_SIZE_GUESSES = [2, 4, 6, 8, 3, 5, 7]; // prefer even guesses for `tabSize`, limit to [2, 8].
    const MAX_ALLOWED_TAB_SIZE_GUESS = 8; // max(ALLOWED_TAB_SIZE_GUESSES) = 8
    const spacesDiffCount = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // `tabSize` scores
    const tmp = new SpacesDiffResult();
    for (let lineNumber = 1; lineNumber <= linesCount; lineNumber++) {
        const currentLineLength = source.getLineLength(lineNumber);
        const currentLineText = source.getLineContent(lineNumber);
        // if the text buffer is chunk based, so long lines are cons-string, v8 will flattern the string when we check charCode.
        // checking charCode on chunks directly is cheaper.
        const useCurrentLineText = currentLineLength <= 65536;
        let currentLineHasContent = false; // does `currentLineText` contain non-whitespace chars
        let currentLineIndentation = 0; // index at which `currentLineText` contains the first non-whitespace char
        let currentLineSpacesCount = 0; // count of spaces found in `currentLineText` indentation
        let currentLineTabsCount = 0; // count of tabs found in `currentLineText` indentation
        for (let j = 0, lenJ = currentLineLength; j < lenJ; j++) {
            const charCode = useCurrentLineText
                ? currentLineText.charCodeAt(j)
                : source.getLineCharCode(lineNumber, j);
            if (charCode === 9 /* CharCode.Tab */) {
                currentLineTabsCount++;
            }
            else if (charCode === 32 /* CharCode.Space */) {
                currentLineSpacesCount++;
            }
            else {
                // Hit non whitespace character on this line
                currentLineHasContent = true;
                currentLineIndentation = j;
                break;
            }
        }
        // Ignore empty or only whitespace lines
        if (!currentLineHasContent) {
            continue;
        }
        if (currentLineTabsCount > 0) {
            linesIndentedWithTabsCount++;
        }
        else if (currentLineSpacesCount > 1) {
            linesIndentedWithSpacesCount++;
        }
        spacesDiff(previousLineText, previousLineIndentation, currentLineText, currentLineIndentation, tmp);
        if (tmp.looksLikeAlignment) {
            // if defaultInsertSpaces === true && the spaces count == tabSize, we may want to count it as valid indentation
            //
            // - item1
            //   - item2
            //
            // otherwise skip this line entirely
            //
            // const a = 1,
            //       b = 2;
            if (!(defaultInsertSpaces && defaultTabSize === tmp.spacesDiff)) {
                continue;
            }
        }
        const currentSpacesDiff = tmp.spacesDiff;
        if (currentSpacesDiff <= MAX_ALLOWED_TAB_SIZE_GUESS) {
            spacesDiffCount[currentSpacesDiff]++;
        }
        previousLineText = currentLineText;
        previousLineIndentation = currentLineIndentation;
    }
    let insertSpaces = defaultInsertSpaces;
    if (linesIndentedWithTabsCount !== linesIndentedWithSpacesCount) {
        insertSpaces = linesIndentedWithTabsCount < linesIndentedWithSpacesCount;
    }
    let tabSize = defaultTabSize;
    // Guess tabSize only if inserting spaces...
    if (insertSpaces) {
        let tabSizeScore = insertSpaces ? 0 : 0.1 * linesCount;
        // console.log("score threshold: " + tabSizeScore);
        ALLOWED_TAB_SIZE_GUESSES.forEach((possibleTabSize) => {
            const possibleTabSizeScore = spacesDiffCount[possibleTabSize];
            if (possibleTabSizeScore > tabSizeScore) {
                tabSizeScore = possibleTabSizeScore;
                tabSize = possibleTabSize;
            }
        });
        // Let a tabSize of 2 win even if it is not the maximum
        // (only in case 4 was guessed)
        if (tabSize === 4 &&
            spacesDiffCount[4] > 0 &&
            spacesDiffCount[2] > 0 &&
            spacesDiffCount[2] >= spacesDiffCount[4] / 2) {
            tabSize = 2;
        }
    }
    // console.log('--------------------------');
    // console.log('linesIndentedWithTabsCount: ' + linesIndentedWithTabsCount + ', linesIndentedWithSpacesCount: ' + linesIndentedWithSpacesCount);
    // console.log('spacesDiffCount: ' + spacesDiffCount);
    // console.log('tabSize: ' + tabSize + ', tabSizeScore: ' + tabSizeScore);
    return {
        insertSpaces: insertSpaces,
        tabSize: tabSize,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25HdWVzc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2luZGVudGF0aW9uR3Vlc3Nlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLGdCQUFnQjtJQUF0QjtRQUNRLGVBQVUsR0FBVyxDQUFDLENBQUE7UUFDdEIsdUJBQWtCLEdBQVksS0FBSyxDQUFBO0lBQzNDLENBQUM7Q0FBQTtBQUVEOztHQUVHO0FBQ0gsU0FBUyxVQUFVLENBQ2xCLENBQVMsRUFDVCxPQUFlLEVBQ2YsQ0FBUyxFQUNULE9BQWUsRUFDZixNQUF3QjtJQUV4QixNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtJQUNyQixNQUFNLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO0lBRWpDLGdDQUFnQztJQUNoQyxhQUFhO0lBQ2IsaUJBQWlCO0lBQ2pCLDJDQUEyQztJQUUzQyxJQUFJLENBQVMsQ0FBQTtJQUViLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxJQUFJLENBQUMsR0FBRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM3QyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakMsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDN0IsTUFBSztRQUNOLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUNqQixVQUFVLEdBQUcsQ0FBQyxDQUFBO0lBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakMsSUFBSSxTQUFTLDRCQUFtQixFQUFFLENBQUM7WUFDbEMsVUFBVSxFQUFFLENBQUE7UUFDYixDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVUsRUFBRSxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQ2pCLFVBQVUsR0FBRyxDQUFDLENBQUE7SUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbEMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxJQUFJLFNBQVMsNEJBQW1CLEVBQUUsQ0FBQztZQUNsQyxVQUFVLEVBQUUsQ0FBQTtRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ1AsVUFBVSxFQUFFLENBQUE7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksVUFBVSxHQUFHLENBQUMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDdEMsT0FBTTtJQUNQLENBQUM7SUFDRCxJQUFJLFVBQVUsR0FBRyxDQUFDLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3RDLE9BQU07SUFDUCxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUE7SUFDbEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUE7SUFFcEQsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDcEIsMkVBQTJFO1FBQzNFLGlGQUFpRjtRQUNqRixNQUFNLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUU5QixJQUNDLFVBQVUsR0FBRyxDQUFDO1lBQ2QsQ0FBQyxJQUFJLFVBQVUsR0FBRyxDQUFDO1lBQ25CLFVBQVUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU07WUFDekIsVUFBVSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQ3BCLENBQUM7WUFDRixJQUNDLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLDRCQUFtQjtnQkFDM0MsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLDRCQUFtQixFQUM5QyxDQUFDO2dCQUNGLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyw0QkFBbUIsRUFBRSxDQUFDO29CQUNuRCw0Q0FBNEM7b0JBQzVDLG1CQUFtQjtvQkFDbkIsbUJBQW1CO29CQUNuQixNQUFNLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO2dCQUNqQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFNO0lBQ1AsQ0FBQztJQUNELElBQUksVUFBVSxHQUFHLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxNQUFNLENBQUMsVUFBVSxHQUFHLFVBQVUsR0FBRyxRQUFRLENBQUE7UUFDekMsT0FBTTtJQUNQLENBQUM7QUFDRixDQUFDO0FBZ0JELE1BQU0sVUFBVSxnQkFBZ0IsQ0FDL0IsTUFBbUIsRUFDbkIsY0FBc0IsRUFDdEIsbUJBQTRCO0lBRTVCLHNDQUFzQztJQUN0QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUV6RCxJQUFJLDBCQUEwQixHQUFHLENBQUMsQ0FBQSxDQUFDLCtEQUErRDtJQUNsRyxJQUFJLDRCQUE0QixHQUFHLENBQUMsQ0FBQSxDQUFDLDBEQUEwRDtJQUUvRixJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQSxDQUFDLDZEQUE2RDtJQUN2RixJQUFJLHVCQUF1QixHQUFHLENBQUMsQ0FBQSxDQUFDLHFFQUFxRTtJQUVyRyxNQUFNLHdCQUF3QixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxzREFBc0Q7SUFDN0csTUFBTSwwQkFBMEIsR0FBRyxDQUFDLENBQUEsQ0FBQyxvQ0FBb0M7SUFFekUsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsbUJBQW1CO0lBQ3ZFLE1BQU0sR0FBRyxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtJQUVsQyxLQUFLLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxVQUFVLElBQUksVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUM7UUFDakUsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFELE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFekQsd0hBQXdIO1FBQ3hILG1EQUFtRDtRQUNuRCxNQUFNLGtCQUFrQixHQUFHLGlCQUFpQixJQUFJLEtBQUssQ0FBQTtRQUVyRCxJQUFJLHFCQUFxQixHQUFHLEtBQUssQ0FBQSxDQUFDLHNEQUFzRDtRQUN4RixJQUFJLHNCQUFzQixHQUFHLENBQUMsQ0FBQSxDQUFDLDBFQUEwRTtRQUN6RyxJQUFJLHNCQUFzQixHQUFHLENBQUMsQ0FBQSxDQUFDLHlEQUF5RDtRQUN4RixJQUFJLG9CQUFvQixHQUFHLENBQUMsQ0FBQSxDQUFDLHVEQUF1RDtRQUNwRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pELE1BQU0sUUFBUSxHQUFHLGtCQUFrQjtnQkFDbEMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFeEMsSUFBSSxRQUFRLHlCQUFpQixFQUFFLENBQUM7Z0JBQy9CLG9CQUFvQixFQUFFLENBQUE7WUFDdkIsQ0FBQztpQkFBTSxJQUFJLFFBQVEsNEJBQW1CLEVBQUUsQ0FBQztnQkFDeEMsc0JBQXNCLEVBQUUsQ0FBQTtZQUN6QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsNENBQTRDO2dCQUM1QyxxQkFBcUIsR0FBRyxJQUFJLENBQUE7Z0JBQzVCLHNCQUFzQixHQUFHLENBQUMsQ0FBQTtnQkFDMUIsTUFBSztZQUNOLENBQUM7UUFDRixDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQzVCLFNBQVE7UUFDVCxDQUFDO1FBRUQsSUFBSSxvQkFBb0IsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5QiwwQkFBMEIsRUFBRSxDQUFBO1FBQzdCLENBQUM7YUFBTSxJQUFJLHNCQUFzQixHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLDRCQUE0QixFQUFFLENBQUE7UUFDL0IsQ0FBQztRQUVELFVBQVUsQ0FDVCxnQkFBZ0IsRUFDaEIsdUJBQXVCLEVBQ3ZCLGVBQWUsRUFDZixzQkFBc0IsRUFDdEIsR0FBRyxDQUNILENBQUE7UUFFRCxJQUFJLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzVCLCtHQUErRztZQUMvRyxFQUFFO1lBQ0YsVUFBVTtZQUNWLFlBQVk7WUFDWixFQUFFO1lBQ0Ysb0NBQW9DO1lBQ3BDLEVBQUU7WUFDRixlQUFlO1lBQ2YsZUFBZTtZQUVmLElBQUksQ0FBQyxDQUFDLG1CQUFtQixJQUFJLGNBQWMsS0FBSyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDakUsU0FBUTtZQUNULENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFBO1FBQ3hDLElBQUksaUJBQWlCLElBQUksMEJBQTBCLEVBQUUsQ0FBQztZQUNyRCxlQUFlLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFBO1FBQ3JDLENBQUM7UUFFRCxnQkFBZ0IsR0FBRyxlQUFlLENBQUE7UUFDbEMsdUJBQXVCLEdBQUcsc0JBQXNCLENBQUE7SUFDakQsQ0FBQztJQUVELElBQUksWUFBWSxHQUFHLG1CQUFtQixDQUFBO0lBQ3RDLElBQUksMEJBQTBCLEtBQUssNEJBQTRCLEVBQUUsQ0FBQztRQUNqRSxZQUFZLEdBQUcsMEJBQTBCLEdBQUcsNEJBQTRCLENBQUE7SUFDekUsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLGNBQWMsQ0FBQTtJQUU1Qiw0Q0FBNEM7SUFDNUMsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQixJQUFJLFlBQVksR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQTtRQUV0RCxtREFBbUQ7UUFFbkQsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUMsZUFBZSxFQUFFLEVBQUU7WUFDcEQsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDN0QsSUFBSSxvQkFBb0IsR0FBRyxZQUFZLEVBQUUsQ0FBQztnQkFDekMsWUFBWSxHQUFHLG9CQUFvQixDQUFBO2dCQUNuQyxPQUFPLEdBQUcsZUFBZSxDQUFBO1lBQzFCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLHVEQUF1RDtRQUN2RCwrQkFBK0I7UUFDL0IsSUFDQyxPQUFPLEtBQUssQ0FBQztZQUNiLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3RCLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3RCLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUMzQyxDQUFDO1lBQ0YsT0FBTyxHQUFHLENBQUMsQ0FBQTtRQUNaLENBQUM7SUFDRixDQUFDO0lBRUQsNkNBQTZDO0lBQzdDLGdKQUFnSjtJQUNoSixzREFBc0Q7SUFDdEQsMEVBQTBFO0lBRTFFLE9BQU87UUFDTixZQUFZLEVBQUUsWUFBWTtRQUMxQixPQUFPLEVBQUUsT0FBTztLQUNoQixDQUFBO0FBQ0YsQ0FBQyJ9