/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IntervalTimer } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { asProgressiveEdit } from '../../browser/utils.js';
import assert from 'assert';
suite('AsyncEdit', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('asProgressiveEdit', async () => {
        const interval = new IntervalTimer();
        const edit = {
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
            text: 'Hello, world!',
        };
        const cts = new CancellationTokenSource();
        const result = asProgressiveEdit(interval, edit, 5, cts.token);
        // Verify the range
        assert.deepStrictEqual(result.range, edit.range);
        const iter = result.newText[Symbol.asyncIterator]();
        // Verify the newText
        const a = await iter.next();
        assert.strictEqual(a.value, 'Hello,');
        assert.strictEqual(a.done, false);
        // Verify the next word
        const b = await iter.next();
        assert.strictEqual(b.value, ' world!');
        assert.strictEqual(b.done, false);
        const c = await iter.next();
        assert.strictEqual(c.value, undefined);
        assert.strictEqual(c.done, true);
        cts.dispose();
    });
    test('asProgressiveEdit - cancellation', async () => {
        const interval = new IntervalTimer();
        const edit = {
            range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
            text: 'Hello, world!',
        };
        const cts = new CancellationTokenSource();
        const result = asProgressiveEdit(interval, edit, 5, cts.token);
        // Verify the range
        assert.deepStrictEqual(result.range, edit.range);
        const iter = result.newText[Symbol.asyncIterator]();
        // Verify the newText
        const a = await iter.next();
        assert.strictEqual(a.value, 'Hello,');
        assert.strictEqual(a.done, false);
        cts.dispose(true);
        const c = await iter.next();
        assert.strictEqual(c.value, undefined);
        assert.strictEqual(c.done, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFN0cmF0ZWdpZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvdGVzdC9icm93c2VyL2lubGluZUNoYXRTdHJhdGVnaWVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUN2Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFBO1FBQ3BDLE1BQU0sSUFBSSxHQUFHO1lBQ1osS0FBSyxFQUFFLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRTtZQUM3RSxJQUFJLEVBQUUsZUFBZTtTQUNyQixDQUFBO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUU5RCxtQkFBbUI7UUFDbkIsTUFBTSxDQUFD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