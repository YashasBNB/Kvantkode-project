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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25HdWVzc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9pbmRlbnRhdGlvbkd1ZXNzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxnQkFBZ0I7SUFBdEI7UUFDUSxlQUFVLEdBQVcsQ0FBQyxDQUFBO1FBQ3RCLHVCQUFrQixHQUFZLEtBQUssQ0FBQTtJQUMzQyxDQUFDO0NBQUE7QUFFRDs7R0FFRztBQUNILFNBQVMsVUFBVSxDQUNsQixDQUFTLEVBQ1QsT0FBZSxFQUNmLENBQVMsRUFDVCxPQUFlLEVBQ2YsTUFBd0I7SUFFeEIsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUE7SUFDckIsTUFBTSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtJQUVqQyxnQ0FBZ0M7SUFDaEMsYUFBYTtJQUNiLGlCQUFpQjtJQUNqQiwyQ0FBMkM7SUFFM0MsSUFBSSxDQUFTLENBQUE7SUFFYixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sSUFBSSxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDN0MsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWpDLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzdCLE1BQUs7UUFDTixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksVUFBVSxHQUFHLENBQUMsRUFDakIsVUFBVSxHQUFHLENBQUMsQ0FBQTtJQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLEVBQUUsQ0FBQyxFQUFF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