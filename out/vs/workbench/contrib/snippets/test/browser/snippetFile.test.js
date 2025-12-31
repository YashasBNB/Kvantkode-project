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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldEZpbGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL3Rlc3QvYnJvd3Nlci9zbmlwcGV0RmlsZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBaUIsTUFBTSwrQkFBK0IsQ0FBQTtBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQzlGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsVUFBVSxFQUFFO0lBQ2pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxlQUFnQixTQUFRLFdBQVc7UUFDeEMsWUFBWSxRQUFhLEVBQUUsUUFBbUI7WUFDN0MsS0FBSyxrQ0FBMEIsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBVSxFQUFFLFNBQVUsQ0FBQyxDQUFBO1lBQ3RGLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUE7UUFDNUIsQ0FBQztLQUNEO0lBRUQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixJQUFJLElBQUksR0FBRyxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDMUUsSUFBSSxNQUFNLEdBQWMsRUFBRSxDQUFBO1FBQzFCLElBQUksQ0FBQyxNQUFN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