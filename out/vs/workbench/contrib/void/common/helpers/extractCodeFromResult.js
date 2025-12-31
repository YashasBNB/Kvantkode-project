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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdENvZGVGcm9tUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vaGVscGVycy9leHRyYWN0Q29kZUZyb21SZXN1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFFMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDL0QsTUFBTSxPQUFPLG1CQUFtQjtJQUsvQixxQkFBcUI7SUFFckIsWUFBWSxDQUFTO1FBU3JCLDhDQUE4QztRQUM5QyxpQkFBWSxHQUFHLENBQUMsTUFBYyxFQUFXLEVBQUU7WUFDMUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ2QscUVBQXFFO1lBQ3JFLE9BQU8sSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN4RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztvQkFBRSxNQUFLO2dCQUNsRSxNQUFNLElBQUksQ0FBQyxDQUFBO2dCQUNYLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ1osQ0FBQztZQUNELE9BQU8sTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUE7UUFDaEMsQ0FBQyxDQUFBO1FBRUQsdUNBQXVDO1FBQ3ZDLGlCQUFZLEdBQUcsQ0FBQyxNQUFjLEVBQVcsRUFBRTtZQUMxQyxnREFBZ0Q7WUFDaEQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3RCLHNFQUFzRTtZQUN0RSxLQUFLLElB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