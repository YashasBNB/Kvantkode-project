/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const r = String.raw;
/**
 * Matches `[text](link title?)` or `[text](<link> title?)`
 *
 * Taken from vscode-markdown-languageservice
 */
const linkPattern = r `(?<!\\)` + // Must not start with escape
    // text
    r `(!?\[` + // open prefix match -->
    /**/ r `(?:` +
    /*****/ r `[^\[\]\\]|` + // Non-bracket chars, or...
    /*****/ r `\\.|` + // Escaped char, or...
    /*****/ r `\[[^\[\]]*\]` + // Matched bracket pair
    /**/ r `)*` +
    r `\])` + // <-- close prefix match
    // Destination
    r `(\(\s*)` + // Pre href
    /**/ r `(` +
    /*****/ r `[^\s\(\)<](?:[^\s\(\)]|\([^\s\(\)]*?\))*|` + // Link without whitespace, or...
    /*****/ r `<(?:\\[<>]|[^<>])+>` + // In angle brackets
    /**/ r `)` +
    // Title
    /**/ r `\s*(?:"[^"]*"|'[^']*'|\([^\(\)]*\))?\s*` +
    r `\)`;
export function getNWords(str, numWordsToCount) {
    // This regex matches each word and skips over whitespace and separators. A word is:
    // A markdown link
    // One chinese character
    // One or more + - =, handled so that code like "a=1+2-3" is broken up better
    // One or more characters that aren't whitepace or any of the above
    const allWordMatches = Array.from(str.matchAll(new RegExp(linkPattern + r `|\p{sc=Han}|=+|\++|-+|[^\s\|\p{sc=Han}|=|\+|\-]+`, 'gu')));
    const targetWords = allWordMatches.slice(0, numWordsToCount);
    const endIndex = numWordsToCount >= allWordMatches.length
        ? str.length // Reached end of string
        : targetWords.length
            ? targetWords.at(-1).index + targetWords.at(-1)[0].length
            : 0;
    const value = str.substring(0, endIndex);
    return {
        value,
        returnedWordCount: targetWords.length === 0 ? (value.length ? 1 : 0) : targetWords.length,
        isFullString: endIndex >= str.length,
        totalWordCount: allWordMatches.length,
    };
}
export function countWords(str) {
    const result = getNWords(str, Number.MAX_SAFE_INTEGER);
    return result.returnedWordCount;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0V29yZENvdW50ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQTtBQUVwQjs7OztHQUlHO0FBQ0gsTUFBTSxXQUFXLEdBQ2hCLENBQUMsQ0FBQSxTQUFTLEdBQUcsNkJBQTZCO0lBQzFDLE9BQU87SUFDUCxDQUFDLENBQUEsT0FBTyxHQUFHLHdCQUF3QjtJQUNuQyxJQUFJLENBQUMsQ0FBQyxDQUFBLEtBQUs7SUFDWCxPQUFPLENBQUMsQ0FBQyxDQUFBLFlBQVksR0FBRywyQkFBMkI7SUFDbkQsT0FBTyxDQUFDLENBQUMsQ0FBQSxNQUFNLEdBQUcsc0JBQXNCO0lBQ3hDLE9BQU8sQ0FBQyxDQUFDLENBQUEsY0FBYyxHQUFHLHVCQUF1QjtJQUNqRCxJQUFJLENBQUMsQ0FBQyxDQUFBLElBQUk7SUFDVixDQUFDLENBQUEsS0FBSyxHQUFHLHlCQUF5QjtJQUNsQyxjQUFjO0lBQ2QsQ0FBQyxDQUFBLFNBQVMsR0FBRyxXQUFXO0lBQ3hCLElBQUksQ0FBQyxDQUFDLENBQUEsR0FBRztJQUNULE9BQU8sQ0FBQyxDQUFDLENBQUEsMkNBQTJDLEdBQUcsaUNBQWlDO0lBQ3hGLE9BQU8sQ0FBQyxDQUFDLENBQUEscUJBQXFCLEdBQUcsb0JBQW9CO0lBQ3JELElBQUksQ0FBQyxDQUFDLENBQUEsR0FBRztJQUNULFFBQVE7SUFDUixJQUFJLENBQUMsQ0FBQyxDQUFBLHlDQUF5QztJQUMvQyxDQUFDLENBQUEsSUFBSSxDQUFBO0FBRU4sTUFBTSxVQUFVLFNBQVMsQ0FBQyxHQUFXLEVBQUUsZUFBdUI7SUFDN0Qsb0ZBQW9GO0lBQ3BGLGtCQUFrQjtJQUNsQix3QkFBd0I7SUFDeEIsNkVBQTZFO0lBQzdFLG1FQUFtRTtJQUNuRSxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUNoQyxHQUFHLENBQUMsUUFBUSxDQUNYLElBQUksTUFBTSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUEsa0RBQWtELEVBQUUsSUFBSSxDQUFDLENBQ25GLENBQ0QsQ0FBQTtJQUVELE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBRTVELE1BQU0sUUFBUSxHQUNiLGVBQWUsSUFBSSxjQUFjLENBQUMsTUFBTTtRQUN2QyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0I7UUFDckMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNO1lBQ25CLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO1lBQzNELENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFTixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN4QyxPQUFPO1FBQ04sS0FBSztRQUNMLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNO1FBQ3pGLFlBQVksRUFBRSxRQUFRLElBQUksR0FBRyxDQUFDLE1BQU07UUFDcEMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxNQUFNO0tBQ3JDLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxHQUFXO0lBQ3JDLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDdEQsT0FBTyxNQUFNLENBQUMsaUJBQWlCLENBQUE7QUFDaEMsQ0FBQyJ9