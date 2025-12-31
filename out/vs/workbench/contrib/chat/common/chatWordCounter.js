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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFdvcmRDb3VudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUE7QUFFcEI7Ozs7R0FJRztBQUNILE1BQU0sV0FBVyxHQUNoQixDQUFDLENBQUEsU0FBUyxHQUFHLDZCQUE2QjtJQUMxQyxPQUFPO0lBQ1AsQ0FBQyxDQUFBLE9BQU8sR0FBRyx3QkFBd0I7SUFDbkMsSUFBSSxDQUFDLENBQUMsQ0FBQSxLQUFLO0lBQ1gsT0FBTyxDQUFDLENBQUMsQ0FBQSxZQUFZLEdBQUcsMkJBQTJCO0lBQ25ELE9BQU8sQ0FBQyxDQUFDLENBQUEsTUFBTSxHQUFHLHNCQUFzQjtJQUN4QyxPQUFPLENBQUMsQ0FBQyxDQUFBLGNBQWMsR0FBRyx1QkFBdUI7SUFDakQsSUFBSSxDQUFDLENBQUMsQ0FBQSxJQUFJO0lBQ1YsQ0FBQyxDQUFBLEtBQUssR0FBRyx5QkFBeUI7SUFDbEMsY0FBYztJQUNkLENBQUMsQ0FBQSxTQUFTLEdBQUcsV0FBVztJQUN4QixJQUFJLENBQUMsQ0FBQyxDQUFBLEdBQUc7SUFDVCxPQUFPLENBQUMsQ0FBQyxDQUFBLDJDQUEyQyxHQUFHLGlDQUFpQztJQUN4RixPQUFPLENBQUMsQ0FBQyxDQUFBLHFCQUFxQixHQUFHLG9CQUFvQjtJQUNyRCxJQUFJLENBQUMsQ0FBQyxDQUFBLEdBQUc7SUFDVCxRQUFRO0lBQ1IsSUFBSSxDQUFDLENBQUMsQ0FBQSx5Q0FBeUM7SUFDL0MsQ0FBQyxDQUFBLElBQUksQ0FBQTtBQUVOLE1BQU0sVUFBVSxTQUFTLENBQUMsR0FBVyxFQUFFLGVBQXVCO0lBQzdELG9GQUFvRjtJQUNwRixrQkFBa0I7SUFDbEIsd0JBQXdCO0lBQ3hCLDZFQUE2RTtJQUM3RSxtRUFBbUU7SUFDbkUsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FDaEMsR0FBRyxDQUFDLFFBQVEsQ0FDWCxJQUFJLE1BQU0sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFBLGtEQUFrRCxFQUFFLElBQUksQ0FBQyxDQUNuRixDQUNELENBQUE7SUFFRCxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUU1RCxNQUFNLFFBQVEsR0FDYixlQUFlLElBQUksY0FBYyxDQUFDLE1BQU07UUFDdkMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsd0JBQXdCO1FBQ3JDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTTtZQUNuQixDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtZQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRU4sTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDeEMsT0FBTztRQUNOLEtBQUs7UUFDTCxpQkFBaUIsRUFBRSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUN6RixZQUFZLEVBQUUsUUFBUSxJQUFJLEdBQUcsQ0FBQyxNQUFNO1FBQ3BDLGNBQWMsRUFBRSxjQUFjLENBQUMsTUFBTTtLQUNyQyxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsR0FBVztJQUNyQyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3RELE9BQU8sTUFBTSxDQUFDLGlCQUFpQixDQUFBO0FBQ2hDLENBQUMifQ==