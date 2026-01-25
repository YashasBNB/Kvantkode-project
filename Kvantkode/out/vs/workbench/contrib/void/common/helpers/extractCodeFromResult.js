/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { DIVIDER, FINAL, ORIGINAL } from '../prompt/prompts.js';
export class SurroundingsRemover {
    // string is s[i...j]
    constructor(s) {
        // returns whether it removed the whole prefix
        this.removePrefix = (prefix) => {
            let offset = 0;
            // console.log('prefix', prefix, Math.min(this.j, prefix.length - 1))
            while (this.i <= this.j && offset <= prefix.length - 1) {
                if (this.originalS.charAt(this.i) !== prefix.charAt(offset))
                    break;
                offset += 1;
                this.i += 1;
            }
            return offset === prefix.length;
        };
        // // removes suffix from right to left
        this.removeSuffix = (suffix) => {
            // e.g. suffix = <PRE/>, the string is <PRE>hi<P
            const s = this.value();
            // for every possible prefix of `suffix`, check if string ends with it
            for (let len = Math.min(s.length, suffix.length); len >= 1; len -= 1) {
                if (s.endsWith(suffix.substring(0, len))) {
                    // the end of the string equals a prefix
                    this.j -= len;
                    return len === suffix.length;
                }
            }
            return false;
        };
        // removeSuffix = (suffix: string): boolean => {
        // 	let offset = 0
        // 	while (this.j >= Math.max(this.i, 0)) {
        // 		if (this.originalS.charAt(this.j) !== suffix.charAt(suffix.length - 1 - offset))
        // 			break
        // 		offset += 1
        // 		this.j -= 1
        // 	}
        // 	return offset === suffix.length
        // }
        // either removes all or nothing
        this.removeFromStartUntilFullMatch = (until, alsoRemoveUntilStr) => {
            const index = this.originalS.indexOf(until, this.i);
            if (index === -1) {
                // this.i = this.j + 1
                return false;
            }
            // console.log('index', index, until.length)
            if (alsoRemoveUntilStr)
                this.i = index + until.length;
            else
                this.i = index;
            return true;
        };
        this.removeCodeBlock = () => {
            // Match either:
            // 1. ```language\n<code>\n```\n?
            // 2. ```<code>\n```\n?
            const pm = this;
            const foundCodeBlock = pm.removePrefix('```');
            if (!foundCodeBlock)
                return false;
            pm.removeFromStartUntilFullMatch('\n', true); // language
            const j = pm.j;
            let foundCodeBlockEnd = pm.removeSuffix('```');
            if (pm.j === j)
                foundCodeBlockEnd = pm.removeSuffix('```\n'); // if no change, try again with \n after ```
            if (!foundCodeBlockEnd)
                return false;
            pm.removeSuffix('\n'); // remove the newline before ```
            return true;
        };
        this.deltaInfo = (recentlyAddedTextLen) => {
            // aaaaaatextaaaaaa{recentlyAdded}
            //                  ^   i    j    len
            //                  |
            //            recentyAddedIdx
            const recentlyAddedIdx = this.originalS.length - recentlyAddedTextLen;
            const actualDelta = this.originalS.substring(Math.max(this.i, recentlyAddedIdx), this.j + 1);
            const ignoredSuffix = this.originalS.substring(Math.max(this.j + 1, recentlyAddedIdx), Infinity);
            return [actualDelta, ignoredSuffix];
        };
        this.originalS = s;
        this.i = 0;
        this.j = s.length - 1;
    }
    value() {
        return this.originalS.substring(this.i, this.j + 1);
    }
}
export const extractCodeFromRegular = ({ text, recentlyAddedTextLen, }) => {
    const pm = new SurroundingsRemover(text);
    pm.removeCodeBlock();
    const s = pm.value();
    const [delta, ignoredSuffix] = pm.deltaInfo(recentlyAddedTextLen);
    return [s, delta, ignoredSuffix];
};
// Ollama has its own FIM, we should not use this if we use that
export const extractCodeFromFIM = ({ text, recentlyAddedTextLen, midTag, }) => {
    /* ------------- summary of the regex -------------
        [optional ` | `` | ```]
        (match optional_language_name)
        [optional strings here]
        [required <MID> tag]
        (match the stuff between mid tags)
        [optional <MID/> tag]
        [optional ` | `` | ```]
    */
    const pm = new SurroundingsRemover(text);
    pm.removeCodeBlock();
    const foundMid = pm.removePrefix(`<${midTag}>`);
    if (foundMid) {
        pm.removeSuffix(`\n`); // sometimes outputs \n
        pm.removeSuffix(`</${midTag}>`);
    }
    const s = pm.value();
    const [delta, ignoredSuffix] = pm.deltaInfo(recentlyAddedTextLen);
    return [s, delta, ignoredSuffix];
};
// JS substring swaps indices, so "ab".substr(1,0) will NOT be '', it will be 'a'!
const voidSubstr = (str, start, end) => end < start ? '' : str.substring(start, end);
export const endsWithAnyPrefixOf = (str, anyPrefix) => {
    // for each prefix
    for (let i = anyPrefix.length; i >= 1; i--) {
        // i >= 1 because must not be empty string
        const prefix = anyPrefix.slice(0, i);
        if (str.endsWith(prefix))
            return prefix;
    }
    return null;
};
// guarantees if you keep adding text, array length will strictly grow and state will progress without going back
export const extractSearchReplaceBlocks = (str) => {
    const ORIGINAL_ = ORIGINAL + `\n`;
    const DIVIDER_ = '\n' + DIVIDER + `\n`;
    // logic for FINAL_ is slightly more complicated - should be '\n' + FINAL, but that ignores if the final output is empty
    const blocks = [];
    let i = 0; // search i and beyond (this is done by plain index, not by line number. much simpler this way)
    while (true) {
        let origStart = str.indexOf(ORIGINAL_, i);
        if (origStart === -1) {
            return blocks;
        }
        origStart += ORIGINAL_.length;
        i = origStart;
        // wrote <<<< ORIGINAL\n
        let dividerStart = str.indexOf(DIVIDER_, i);
        if (dividerStart === -1) {
            // if didnt find DIVIDER_, either writing originalStr or DIVIDER_ right now
            const writingDIVIDERlen = endsWithAnyPrefixOf(str, DIVIDER_)?.length ?? 0;
            blocks.push({
                orig: voidSubstr(str, origStart, str.length - writingDIVIDERlen),
                final: '',
                state: 'writingOriginal',
            });
            return blocks;
        }
        const origStrDone = voidSubstr(str, origStart, dividerStart);
        dividerStart += DIVIDER_.length;
        i = dividerStart;
        // wrote \n=====\n
        const fullFINALStart = str.indexOf(FINAL, i);
        const fullFINALStart_ = str.indexOf('\n' + FINAL, i); // go with B if possible, else fallback to A, it's more permissive
        const matchedFullFINAL_ = fullFINALStart_ !== -1 && fullFINALStart === fullFINALStart_ + 1; // this logic is really important, otherwise we might look for FINAL_ at a much later part of the string
        let finalStart = matchedFullFINAL_ ? fullFINALStart_ : fullFINALStart;
        if (finalStart === -1) {
            // if didnt find FINAL_, either writing finalStr or FINAL or FINAL_ right now
            const writingFINALlen = endsWithAnyPrefixOf(str, FINAL)?.length ?? 0;
            const writingFINALlen_ = endsWithAnyPrefixOf(str, '\n' + FINAL)?.length ?? 0; // this gets priority
            const usingWritingFINALlen = Math.max(writingFINALlen, writingFINALlen_);
            blocks.push({
                orig: origStrDone,
                final: voidSubstr(str, dividerStart, str.length - usingWritingFINALlen),
                state: 'writingFinal',
            });
            return blocks;
        }
        const usingFINAL = matchedFullFINAL_ ? '\n' + FINAL : FINAL;
        const finalStrDone = voidSubstr(str, dividerStart, finalStart);
        finalStart += usingFINAL.length;
        i = finalStart;
        // wrote >>>>> FINAL
        blocks.push({
            orig: origStrDone,
            final: finalStrDone,
            state: 'done',
        });
    }
};
// const tests: [string, { shape: Partial<ExtractedSearchReplaceBlock>[] }][] = [[
// 	`\
// \`\`\`
// <<<<<<< ORIGINA`, { shape: [] }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL`, { shape: [], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A`, { shape: [{ state: 'writingOriginal', orig: 'A' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B`, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// `, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// ===`, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// ======`, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======`, { shape: [{ state: 'writingOriginal', orig: 'A\nB' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// `, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: '' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// >>>>>>> UPDAT`, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: '' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// >>>>>>> UPDATED`, { shape: [{ state: 'done', orig: 'A\nB', final: '' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// >>>>>>> UPDATED
// \`\`\``, { shape: [{ state: 'done', orig: 'A\nB', final: '' }], }
// ],
// // alternatively
// [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X`, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: 'X' }], }
// ],
// [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y`, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: 'X\nY' }], }
// ],
// [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y
// `, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: 'X\nY' }], }
// ],
// [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y
// >>>>>>> UPDAT`, { shape: [{ state: 'writingFinal', orig: 'A\nB', final: 'X\nY' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y
// >>>>>>> UPDATED`, { shape: [{ state: 'done', orig: 'A\nB', final: 'X\nY' }], }
// ], [
// 	`\
// \`\`\`
// <<<<<<< ORIGINAL
// A
// B
// =======
// X
// Y
// >>>>>>> UPDATED
// \`\`\``, { shape: [{ state: 'done', orig: 'A\nB', final: 'X\nY' }], }
// ]]
// function runTests() {
// 	let passedTests = 0;
// 	let failedTests = 0;
// 	for (let i = 0; i < tests.length; i++) {
// 		const [input, expected] = tests[i];
// 		const result = extractSearchReplaceBlocks(input);
// 		// Compare result with expected shape
// 		let passed = true;
// 		if (result.length !== expected.shape.length) {
// 			passed = false;
// 		} else {
// 			for (let j = 0; j < result.length; j++) { // block
// 				const expectedItem = expected.shape[j];
// 				const resultItem = result[j];
// 				if ((expectedItem.state !== undefined) && (expectedItem.state !== resultItem.state) ||
// 					(expectedItem.orig !== undefined) && (expectedItem.orig !== resultItem.orig) ||
// 					(expectedItem.final !== undefined) && (expectedItem.final !== resultItem.final)) {
// 					passed = false;
// 					break;
// 				}
// 			}
// 		}
// 		if (passed) {
// 			passedTests++;
// 			console.log(`Test ${i + 1} passed`);
// 		} else {
// 			failedTests++;
// 			console.log(`Test ${i + 1} failed`);
// 			console.log('Input:', input)
// 			console.log(`Expected:`, expected.shape);
// 			console.log(`Got:`, result);
// 		}
// 	}
// 	console.log(`Total: ${tests.length}, Passed: ${passedTests}, Failed: ${failedTests}`);
// 	return failedTests === 0;
// }
// runTests()
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdENvZGVGcm9tUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9oZWxwZXJzL2V4dHJhY3RDb2RlRnJvbVJlc3VsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMvRCxNQUFNLE9BQU8sbUJBQW1CO0lBSy9CLHFCQUFxQjtJQUVyQixZQUFZLENBQVM7UUFTckIsOENBQThDO1FBQzlDLGlCQUFZLEdBQUcsQ0FBQyxNQUFjLEVBQVcsRUFBRTtZQUMxQyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDZCxxRUFBcUU7WUFDckUsT0FBTyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO29CQUFFLE1BQUs7Z0JBQ2xFLE1BQU0sSUFBSSxDQUFDLENBQUE7Z0JBQ1gsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDWixDQUFDO1lBQ0QsT0FBTyxNQUFNLEtBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQTtRQUNoQyxDQUFDLENBQUE7UUFFRCx1Q0FBdUM7UUFDdkMsaUJBQVksR0FBRyxDQUFDLE1BQWMsRUFBVyxFQUFFO1lBQzFDLGdEQUFnRDtZQUNoRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDdEIsc0VBQXNFO1lBQ3RFLEtB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