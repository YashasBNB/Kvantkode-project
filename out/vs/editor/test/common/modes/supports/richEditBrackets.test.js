/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { BracketsUtils } from '../../../../common/languages/supports/richEditBrackets.js';
suite('richEditBrackets', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function findPrevBracketInRange(reversedBracketRegex, lineText, currentTokenStart, currentTokenEnd) {
        return BracketsUtils.findPrevBracketInRange(reversedBracketRegex, 1, lineText, currentTokenStart, currentTokenEnd);
    }
    function findNextBracketInRange(forwardBracketRegex, lineText, currentTokenStart, currentTokenEnd) {
        return BracketsUtils.findNextBracketInRange(forwardBracketRegex, 1, lineText, currentTokenStart, currentTokenEnd);
    }
    test('findPrevBracketInToken one char 1', () => {
        const result = findPrevBracketInRange(/(\{)|(\})/i, '{', 0, 1);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 2);
    });
    test('findPrevBracketInToken one char 2', () => {
        const result = findPrevBracketInRange(/(\{)|(\})/i, '{{', 0, 1);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 2);
    });
    test('findPrevBracketInToken one char 3', () => {
        const result = findPrevBracketInRange(/(\{)|(\})/i, '{hello world!', 0, 13);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 2);
    });
    test('findPrevBracketInToken more chars 1', () => {
        const result = findPrevBracketInRange(/(olleh)/i, 'hello world!', 0, 12);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 6);
    });
    test('findPrevBracketInToken more chars 2', () => {
        const result = findPrevBracketInRange(/(olleh)/i, 'hello world!', 0, 5);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 6);
    });
    test('findPrevBracketInToken more chars 3', () => {
        const result = findPrevBracketInRange(/(olleh)/i, ' hello world!', 0, 6);
        assert.strictEqual(result.startColumn, 2);
        assert.strictEqual(result.endColumn, 7);
    });
    test('findNextBracketInToken one char', () => {
        const result = findNextBracketInRange(/(\{)|(\})/i, '{', 0, 1);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 2);
    });
    test('findNextBracketInToken more chars', () => {
        const result = findNextBracketInRange(/(world)/i, 'hello world!', 0, 12);
        assert.strictEqual(result.startColumn, 7);
        assert.strictEqual(result.endColumn, 12);
    });
    test('findNextBracketInToken with emoty result', () => {
        const result = findNextBracketInRange(/(\{)|(\})/i, '', 0, 0);
        assert.strictEqual(result, null);
    });
    test('issue #3894: [Handlebars] Curly braces edit issues', () => {
        const result = findPrevBracketInRange(/(\-\-!<)|(>\-\-)|(\{\{)|(\}\})/i, '{{asd}}', 0, 2);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 3);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmljaEVkaXRCcmFja2V0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvc3VwcG9ydHMvcmljaEVkaXRCcmFja2V0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFekYsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsc0JBQXNCLENBQzlCLG9CQUE0QixFQUM1QixRQUFnQixFQUNoQixpQkFBeUIsRUFDekIsZUFBdUI7UUFFdkIsT0FBTyxhQUFhLENBQUMsc0JBQXNCLENBQzFDLG9CQUFvQixFQUNwQixDQUFDLEVBQ0QsUUFBUSxFQUNSLGlCQUFpQixFQUNqQixlQUFlLENBQ2YsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLHNCQUFzQixDQUM5QixtQkFBMkIsRUFDM0IsUUFBZ0IsRUFDaEIsaUJBQXlCLEVBQ3pCLGVBQXVCO1FBRXZCLE9BQU8sYUFBYSxDQUFDLHNCQUFzQixDQUMxQyxtQkFBbUIsRUFDbkIsQ0FBQyxFQUNELFFBQVEsRUFDUixpQkFBaUIsRUFDakIsZUFBZSxDQUNmLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUM5QyxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FB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