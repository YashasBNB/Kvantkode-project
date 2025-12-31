/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { LcsDiff, StringDiffSequence } from '../../../common/diff/diff.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../utils.js';
function createArray(length, value) {
    const r = [];
    for (let i = 0; i < length; i++) {
        r[i] = value;
    }
    return r;
}
function maskBasedSubstring(str, mask) {
    let r = '';
    for (let i = 0; i < str.length; i++) {
        if (mask[i]) {
            r += str.charAt(i);
        }
    }
    return r;
}
function assertAnswer(originalStr, modifiedStr, changes, answerStr, onlyLength = false) {
    const originalMask = createArray(originalStr.length, true);
    const modifiedMask = createArray(modifiedStr.length, true);
    let i, j, change;
    for (i = 0; i < changes.length; i++) {
        change = changes[i];
        if (change.originalLength) {
            for (j = 0; j < change.originalLength; j++) {
                originalMask[change.originalStart + j] = false;
            }
        }
        if (change.modifiedLength) {
            for (j = 0; j < change.modifiedLength; j++) {
                modifiedMask[change.modifiedStart + j] = false;
            }
        }
    }
    const originalAnswer = maskBasedSubstring(originalStr, originalMask);
    const modifiedAnswer = maskBasedSubstring(modifiedStr, modifiedMask);
    if (onlyLength) {
        assert.strictEqual(originalAnswer.length, answerStr.length);
        assert.strictEqual(modifiedAnswer.length, answerStr.length);
    }
    else {
        assert.strictEqual(originalAnswer, answerStr);
        assert.strictEqual(modifiedAnswer, answerStr);
    }
}
function lcsInnerTest(originalStr, modifiedStr, answerStr, onlyLength = false) {
    const diff = new LcsDiff(new StringDiffSequence(originalStr), new StringDiffSequence(modifiedStr));
    const changes = diff.ComputeDiff(false).changes;
    assertAnswer(originalStr, modifiedStr, changes, answerStr, onlyLength);
}
function stringPower(str, power) {
    let r = str;
    for (let i = 0; i < power; i++) {
        r += r;
    }
    return r;
}
function lcsTest(originalStr, modifiedStr, answerStr) {
    lcsInnerTest(originalStr, modifiedStr, answerStr);
    for (let i = 2; i <= 5; i++) {
        lcsInnerTest(stringPower(originalStr, i), stringPower(modifiedStr, i), stringPower(answerStr, i), true);
    }
}
suite('Diff', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('LcsDiff - different strings tests', function () {
        this.timeout(10000);
        lcsTest('heLLo world', 'hello orlando', 'heo orld');
        lcsTest('abcde', 'acd', 'acd'); // simple
        lcsTest('abcdbce', 'bcede', 'bcde'); // skip
        lcsTest('abcdefgabcdefg', 'bcehafg', 'bceafg'); // long
        lcsTest('abcde', 'fgh', ''); // no match
        lcsTest('abcfabc', 'fabc', 'fabc');
        lcsTest('0azby0', '9axbzby9', 'azby');
        lcsTest('0abc00000', '9a1b2c399999', 'abc');
        lcsTest('fooBar', 'myfooBar', 'fooBar'); // all insertions
        lcsTest('fooBar', 'fooMyBar', 'fooBar'); // all insertions
        lcsTest('fooBar', 'fooBar', 'fooBar'); // identical sequences
    });
});
suite('Diff - Ported from VS', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('using continue processing predicate to quit early', function () {
        const left = 'abcdef';
        const right = 'abxxcyyydzzzzezzzzzzzzzzzzzzzzzzzzf';
        // We use a long non-matching portion at the end of the right-side string, so the backwards tracking logic
        // doesn't get there first.
        let predicateCallCount = 0;
        let diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert.strictEqual(predicateCallCount, 0);
            predicateCallCount++;
            assert.strictEqual(leftIndex, 1);
            // cancel processing
            return false;
        });
        let changes = diff.ComputeDiff(true).changes;
        assert.strictEqual(predicateCallCount, 1);
        // Doesn't include 'c', 'd', or 'e', since we quit on the first request
        assertAnswer(left, right, changes, 'abf');
        // Cancel after the first match ('c')
        diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert(longestMatchSoFar <= 1); // We never see a match of length > 1
            // Continue processing as long as there hasn't been a match made.
            return longestMatchSoFar < 1;
        });
        changes = diff.ComputeDiff(true).changes;
        assertAnswer(left, right, changes, 'abcf');
        // Cancel after the second match ('d')
        diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert(longestMatchSoFar <= 2); // We never see a match of length > 2
            // Continue processing as long as there hasn't been a match made.
            return longestMatchSoFar < 2;
        });
        changes = diff.ComputeDiff(true).changes;
        assertAnswer(left, right, changes, 'abcdf');
        // Cancel *one iteration* after the second match ('d')
        let hitSecondMatch = false;
        diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert(longestMatchSoFar <= 2); // We never see a match of length > 2
            const hitYet = hitSecondMatch;
            hitSecondMatch = longestMatchSoFar > 1;
            // Continue processing as long as there hasn't been a match made.
            return !hitYet;
        });
        changes = diff.ComputeDiff(true).changes;
        assertAnswer(left, right, changes, 'abcdf');
        // Cancel after the third and final match ('e')
        diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert(longestMatchSoFar <= 3); // We never see a match of length > 3
            // Continue processing as long as there hasn't been a match made.
            return longestMatchSoFar < 3;
        });
        changes = diff.ComputeDiff(true).changes;
        assertAnswer(left, right, changes, 'abcdef');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9kaWZmL2RpZmYudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFlLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUVyRSxTQUFTLFdBQVcsQ0FBSSxNQUFjLEVBQUUsS0FBUTtJQUMvQyxNQUFNLENBQUMsR0FBUSxFQUFFLENBQUE7SUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTyxDQUFDLENBQUE7QUFDVCxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFXLEVBQUUsSUFBZTtJQUN2RCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDVixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3JDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDYixDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sQ0FBQyxDQUFBO0FBQ1QsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUNwQixXQUFtQixFQUNuQixXQUFtQixFQUNuQixPQUFzQixFQUN0QixTQUFpQixFQUNq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