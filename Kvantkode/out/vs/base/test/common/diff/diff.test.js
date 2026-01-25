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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2RpZmYvZGlmZi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQWUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRXJFLFNBQVMsV0FBVyxDQUFJLE1BQWMsRUFBRSxLQUFRO0lBQy9DLE1BQU0sQ0FBQyxHQUFRLEVBQUUsQ0FBQTtJQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQTtBQUNULENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEdBQVcsRUFBRSxJQUFlO0lBQ3ZELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNWLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNiLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxDQUFDLENBQUE7QUFDVCxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQ3BCLFdBQW1CLEVBQ25CLFdBQW1CLEVBQ25CLE9BQXNCLEVBQ3RCLFNBQWlC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