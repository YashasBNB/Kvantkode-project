/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { parseLinkedText } from '../../common/linkedText.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('LinkedText', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parses correctly', () => {
        assert.deepStrictEqual(parseLinkedText('').nodes, []);
        assert.deepStrictEqual(parseLinkedText('hello').nodes, ['hello']);
        assert.deepStrictEqual(parseLinkedText('hello there').nodes, ['hello there']);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href).').nodes, ['Some message with ', { label: 'link text', href: 'http://link.href' }, '.']);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href "and a title").').nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href', title: 'and a title' },
            '.',
        ]);
        assert.deepStrictEqual(parseLinkedText("Some message with [link text](http://link.href 'and a title').").nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href', title: 'and a title' },
            '.',
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href "and a \'title\'").').nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href', title: "and a 'title'" },
            '.',
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](http://link.href \'and a "title"\').').nodes, [
            'Some message with ',
            { label: 'link text', href: 'http://link.href', title: 'and a "title"' },
            '.',
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [link text](random stuff).').nodes, [
            'Some message with [link text](random stuff).',
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [https link](https://link.href).').nodes, ['Some message with ', { label: 'https link', href: 'https://link.href' }, '.']);
        assert.deepStrictEqual(parseLinkedText('Some message with [https link](https:).').nodes, [
            'Some message with [https link](https:).',
        ]);
        assert.deepStrictEqual(parseLinkedText('Some message with [a command](command:foobar).').nodes, ['Some message with ', { label: 'a command', href: 'command:foobar' }, '.']);
        assert.deepStrictEqual(parseLinkedText('Some message with [a command](command:).').nodes, [
            'Some message with [a command](command:).',
        ]);
        assert.deepStrictEqual(parseLinkedText('link [one](command:foo "nice") and link [two](http://foo)...').nodes, [
            'link ',
            { label: 'one', href: 'command:foo', title: 'nice' },
            ' and link ',
            { label: 'two', href: 'http://foo' },
            '...',
        ]);
        assert.deepStrictEqual(parseLinkedText('link\n[one](command:foo "nice")\nand link [two](http://foo)...').nodes, [
            'link\n',
            { label: 'one', href: 'command:foo', title: 'nice' },
            '\nand link ',
            { label: 'two', href: 'http://foo' },
            '...',
        ]);
    });
    test('Should match non-greedily', () => {
        assert.deepStrictEqual(parseLinkedText('a [link text 1](http://link.href "title1") b [link text 2](http://link.href "title2") c').nodes, [
            'a ',
            { label: 'link text 1', href: 'http://link.href', title: 'title1' },
            ' b ',
            { label: 'link text 2', href: 'http://link.href', title: 'title2' },
            ' c',
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkVGV4dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2xpbmtlZFRleHQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsZUFBZSxDQUNyQixlQUFlLENBQUMsa0RBQWtELENBQUMsQ0FBQyxLQUFLLEVBQ3pFLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUM3RSxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZUFBZSxDQUFDLGdFQUFnRSxDQUFDLENBQUMsS0FBSyxFQUN2RjtZQUNDLG9CQUFvQjtZQUNwQixFQUFF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