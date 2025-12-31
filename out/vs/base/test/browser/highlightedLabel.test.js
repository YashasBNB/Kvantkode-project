/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { HighlightedLabel } from '../../browser/ui/highlightedlabel/highlightedLabel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('HighlightedLabel', () => {
    let label;
    setup(() => {
        label = new HighlightedLabel(document.createElement('div'), { supportIcons: true });
    });
    test('empty label', function () {
        assert.strictEqual(label.element.innerHTML, '');
    });
    test('no decorations', function () {
        label.set('hello');
        assert.strictEqual(label.element.innerHTML, 'hello');
    });
    test('escape html', function () {
        label.set('hel<lo');
        assert.strictEqual(label.element.innerHTML, 'hel&lt;lo');
    });
    test('everything highlighted', function () {
        label.set('hello', [{ start: 0, end: 5 }]);
        assert.strictEqual(label.element.innerHTML, '<span class="highlight">hello</span>');
    });
    test('beginning highlighted', function () {
        label.set('hellothere', [{ start: 0, end: 5 }]);
        assert.strictEqual(label.element.innerHTML, '<span class="highlight">hello</span>there');
    });
    test('ending highlighted', function () {
        label.set('goodbye', [{ start: 4, end: 7 }]);
        assert.strictEqual(label.element.innerHTML, 'good<span class="highlight">bye</span>');
    });
    test('middle highlighted', function () {
        label.set('foobarfoo', [{ start: 3, end: 6 }]);
        assert.strictEqual(label.element.innerHTML, 'foo<span class="highlight">bar</span>foo');
    });
    test('escapeNewLines', () => {
        let highlights = [
            { start: 0, end: 5 },
            { start: 7, end: 9 },
            { start: 11, end: 12 },
        ]; // before,after,after
        let escaped = HighlightedLabel.escapeNewLines('ACTION\r\n_TYPE2', highlights);
        assert.strictEqual(escaped, 'ACTION\u23CE_TYPE2');
        assert.deepStrictEqual(highlights, [
            { start: 0, end: 5 },
            { start: 6, end: 8 },
            { start: 10, end: 11 },
        ]);
        highlights = [
            { start: 5, end: 9 },
            { start: 11, end: 12 },
        ]; //overlap,after
        escaped = HighlightedLabel.escapeNewLines('ACTION\r\n_TYPE2', highlights);
        assert.strictEqual(escaped, 'ACTION\u23CE_TYPE2');
        assert.deepStrictEqual(highlights, [
            { start: 5, end: 8 },
            { start: 10, end: 11 },
        ]);
    });
    teardown(() => {
        label.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlnaGxpZ2h0ZWRMYWJlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvaGlnaGxpZ2h0ZWRMYWJlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1RSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLElBQUksS0FBdUIsQ0FBQTtJQUUzQixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsS0FBSyxHQUFHLElBQUksZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3BGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ2hELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1FBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNyRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxhQUFhLEVBQUU7UUFDbkIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3pELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1FBQzlCLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFBO0lBQ3BGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVCQUF1QixFQUFFO1FBQzdCLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFBO0lBQ3pGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1FBQzFCLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1FBQzFCLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSwwQ0FBMEMsQ0FBQyxDQUFBO0lBQ3hGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixJQUFJLFVBQVUsR0FBRztZQUNoQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtZQUNwQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtZQUNwQixFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtTQUN0QixDQUFBLENBQUMscUJBQXFCO1FBQ3ZCLElBQUksT0FBTyxHQUFHLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFO1lBQ2xDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO1NBQ3RCLENBQUMsQ0FBQTtRQUVGLFVBQVUsR0FBRztZQUNaLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO1NBQ3RCLENBQUEsQ0FBQyxlQUFlO1FBQ2pCLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRTtZQUNsQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtZQUNwQixFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtTQUN0QixDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=