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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkVGV4dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9saW5rZWRUZXh0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFDeEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDN0UsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZUFBZSxDQUFDLGtEQUFrRCxDQUFDLENBQUMsS0FBSyxFQUN6RSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FDN0UsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGVBQWUsQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDLEtBQUssRUFDdkY7WUFDQyxvQkFBb0I7WUFDcEIsRUFBRSxLQUFL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