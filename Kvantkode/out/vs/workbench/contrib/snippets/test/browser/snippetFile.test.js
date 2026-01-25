/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { SnippetFile, Snippet } from '../../browser/snippetsFile.js';
import { URI } from '../../../../../base/common/uri.js';
import { SnippetParser } from '../../../../../editor/contrib/snippet/browser/snippetParser.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Snippets', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    class TestSnippetFile extends SnippetFile {
        constructor(filepath, snippets) {
            super(3 /* SnippetSource.Extension */, filepath, undefined, undefined, undefined, undefined);
            this.data.push(...snippets);
        }
    }
    test('SnippetFile#select', () => {
        let file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), []);
        let bucket = [];
        file.select('', bucket);
        assert.strictEqual(bucket.length, 0);
        file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), [
            new Snippet(false, ['foo'], 'FooSnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['foo'], 'FooSnippet2', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['bar'], 'BarSnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['bar.comment'], 'BarSnippet2', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['bar.strings'], 'BarSnippet2', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['bazz', 'bazz'], 'BazzSnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        bucket = [];
        file.select('foo', bucket);
        assert.strictEqual(bucket.length, 2);
        bucket = [];
        file.select('fo', bucket);
        assert.strictEqual(bucket.length, 0);
        bucket = [];
        file.select('bar', bucket);
        assert.strictEqual(bucket.length, 1);
        bucket = [];
        file.select('bar.comment', bucket);
        assert.strictEqual(bucket.length, 2);
        bucket = [];
        file.select('bazz', bucket);
        assert.strictEqual(bucket.length, 1);
    });
    test('SnippetFile#select - any scope', function () {
        const file = new TestSnippetFile(URI.file('somepath/foo.code-snippets'), [
            new Snippet(false, [], 'AnySnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['foo'], 'FooSnippet1', 'foo', '', 'snippet', 'test', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const bucket = [];
        file.select('foo', bucket);
        assert.strictEqual(bucket.length, 2);
    });
    test('Snippet#needsClipboard', function () {
        function assertNeedsClipboard(body, expected) {
            const snippet = new Snippet(false, ['foo'], 'FooSnippet1', 'foo', '', body, 'test', 1 /* SnippetSource.User */, generateUuid());
            assert.strictEqual(snippet.needsClipboard, expected);
            assert.strictEqual(SnippetParser.guessNeedsClipboard(body), expected);
        }
        assertNeedsClipboard('foo$CLIPBOARD', true);
        assertNeedsClipboard('${CLIPBOARD}', true);
        assertNeedsClipboard('foo${CLIPBOARD}bar', true);
        assertNeedsClipboard('foo$clipboard', false);
        assertNeedsClipboard('foo${clipboard}', false);
        assertNeedsClipboard('baba', false);
    });
    test('Snippet#isTrivial', function () {
        function assertIsTrivial(body, expected) {
            const snippet = new Snippet(false, ['foo'], 'FooSnippet1', 'foo', '', body, 'test', 1 /* SnippetSource.User */, generateUuid());
            assert.strictEqual(snippet.isTrivial, expected);
        }
        assertIsTrivial('foo', true);
        assertIsTrivial('foo$0', true);
        assertIsTrivial('foo$0bar', false);
        assertIsTrivial('foo$1', false);
        assertIsTrivial('foo$1$0', false);
        assertIsTrivial('${1:foo}', false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldEZpbGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvdGVzdC9icm93c2VyL3NuaXBwZXRGaWxlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFpQixNQUFNLCtCQUErQixDQUFBO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyxVQUFVLEVBQUU7SUFDakIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLGVBQWdCLFNBQVEsV0FBVztRQUN4QyxZQUFZLFFBQWEsRUFBRSxRQUFtQjtZQUM3QyxLQUFLLGtDQUEwQixRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFVLEVBQUUsU0FBVSxDQUFDLENBQUE7WUFDdEYsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQTtRQUM1QixDQUFDO0tBQ0Q7SUFFRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLElBQUksSUFBSSxHQUFHLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxRSxJQUFJLE1BQU0sR0FBYyxFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFD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