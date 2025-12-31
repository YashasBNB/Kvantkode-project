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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmljaEVkaXRCcmFja2V0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL3N1cHBvcnRzL3JpY2hFZGl0QnJhY2tldHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRXpGLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLHNCQUFzQixDQUM5QixvQkFBNEIsRUFDNUIsUUFBZ0IsRUFDaEIsaUJBQXlCLEVBQ3pCLGVBQXVCO1FBRXZCLE9BQU8sYUFBYSxDQUFDLHNCQUFzQixDQUMxQyxvQkFBb0IsRUFDcEIsQ0FBQyxFQUNELFFBQVEsRUFDUixpQkFBaUIsRUFDakIsZUFBZSxDQUNmLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyxzQkFBc0IsQ0FDOUIsbUJBQTJCLEVBQzNCLFFBQWdCLEVBQ2hCLGlCQUF5QixFQUN6QixlQUF1QjtRQUV2QixPQUFPLGFBQWEsQ0FBQyxzQkFBc0IsQ0FDMUMsbUJBQW1CLEVBQ25CLENBQUMsRUFDRCxRQUFRLEVBQ1IsaUJBQWlCLEVBQ2pCLGVBQWUsQ0FDZixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsWUFBWSxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7UUFDckQsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1FBQy9ELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLGlDQUFpQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=