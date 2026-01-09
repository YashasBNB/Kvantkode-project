/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MarkdownString } from '../../common/htmlContent.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { URI } from '../../common/uri.js';
suite('MarkdownString', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Escape leading whitespace', function () {
        const mds = new MarkdownString();
        mds.appendText('Hello\n    Not a code block');
        assert.strictEqual(mds.value, 'Hello\n\n&nbsp;&nbsp;&nbsp;&nbsp;Not&nbsp;a&nbsp;code&nbsp;block');
    });
    test("MarkdownString.appendText doesn't escape quote #109040", function () {
        const mds = new MarkdownString();
        mds.appendText('> Text\n>More');
        assert.strictEqual(mds.value, '\\>&nbsp;Text\n\n\\>More');
    });
    test('appendText', () => {
        const mds = new MarkdownString();
        mds.appendText('# foo\n*bar*');
        assert.strictEqual(mds.value, '\\#&nbsp;foo\n\n\\*bar\\*');
    });
    test('appendLink', function () {
        function assertLink(target, label, title, expected) {
            const mds = new MarkdownString();
            mds.appendLink(target, label, title);
            assert.strictEqual(mds.value, expected);
        }
        assertLink('https://example.com\\()![](file:///Users/jrieken/Code/_samples/devfest/foo/img.png)', 'hello', undefined, '[hello](https://example.com\\(\\)![](file:///Users/jrieken/Code/_samples/devfest/foo/img.png\\))');
        assertLink('https://example.com', 'hello', 'title', '[hello](https://example.com "title")');
        assertLink('foo)', 'hello]', undefined, '[hello\\]](foo\\))');
        assertLink('foo\\)', 'hello]', undefined, '[hello\\]](foo\\))');
        assertLink('fo)o', 'hell]o', undefined, '[hell\\]o](fo\\)o)');
        assertLink('foo)', 'hello]', 'title"', '[hello\\]](foo\\) "title\\"")');
    });
    test('lift', () => {
        const dto = {
            value: 'hello',
            baseUri: URI.file('/foo/bar'),
            supportThemeIcons: true,
            isTrusted: true,
            supportHtml: true,
            uris: {
                [URI.file('/foo/bar2').toString()]: URI.file('/foo/bar2'),
                [URI.file('/foo/bar3').toString()]: URI.file('/foo/bar3'),
            },
        };
        const mds = MarkdownString.lift(dto);
        assert.strictEqual(mds.value, dto.value);
        assert.strictEqual(mds.baseUri?.toString(), dto.baseUri?.toString());
        assert.strictEqual(mds.supportThemeIcons, dto.supportThemeIcons);
        assert.strictEqual(mds.isTrusted, dto.isTrusted);
        assert.strictEqual(mds.supportHtml, dto.supportHtml);
        assert.deepStrictEqual(mds.uris, dto.uris);
    });
    test('lift returns new instance', () => {
        const instance = new MarkdownString('hello');
        const mds2 = MarkdownString.lift(instance).appendText('world');
        assert.strictEqual(mds2.value, 'helloworld');
        assert.strictEqual(instance.value, 'hello');
    });
    suite('appendCodeBlock', () => {
        function assertCodeBlock(lang, code, result) {
            const mds = new MarkdownString();
            mds.appendCodeblock(lang, code);
            assert.strictEqual(mds.value, result);
        }
        test('common cases', () => {
            // no backticks
            assertCodeBlock('ts', 'const a = 1;', `\n${['```ts', 'const a = 1;', '```'].join('\n')}\n`);
            // backticks
            assertCodeBlock('ts', 'const a = `1`;', `\n${['```ts', 'const a = `1`;', '```'].join('\n')}\n`);
        });
        // @see https://github.com/microsoft/vscode/issues/193746
        test('escape fence', () => {
            // fence in the first line
            assertCodeBlock('md', '```\n```', `\n${['````md', '```\n```', '````'].join('\n')}\n`);
            // fence in the middle of code
            assertCodeBlock('md', '\n\n```\n```', `\n${['````md', '\n\n```\n```', '````'].join('\n')}\n`);
            // longer fence at the end of code
            assertCodeBlock('md', '```\n```\n````\n````', `\n${['`````md', '```\n```\n````\n````', '`````'].join('\n')}\n`);
        });
    });
    suite('ThemeIcons', () => {
        suite('Support On', () => {
            test('appendText', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: true });
                mds.appendText('$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '\\\\$\\(zap\\)&nbsp;$\\(not&nbsp;a&nbsp;theme&nbsp;icon\\)&nbsp;\\\\$\\(add\\)');
            });
            test('appendMarkdown', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: true });
                mds.appendMarkdown('$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '$(zap) $(not a theme icon) $(add)');
            });
            test('appendMarkdown with escaped icon', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: true });
                mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '\\$(zap) $(not a theme icon) $(add)');
            });
        });
        suite('Support Off', () => {
            test('appendText', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: false });
                mds.appendText('$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '$\\(zap\\)&nbsp;$\\(not&nbsp;a&nbsp;theme&nbsp;icon\\)&nbsp;$\\(add\\)');
            });
            test('appendMarkdown', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: false });
                mds.appendMarkdown('$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '$(zap) $(not a theme icon) $(add)');
            });
            test('appendMarkdown with escaped icon', () => {
                const mds = new MarkdownString(undefined, { supportThemeIcons: true });
                mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
                assert.strictEqual(mds.value, '\\$(zap) $(not a theme icon) $(add)');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TdHJpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9tYXJrZG93blN0cmluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFekMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM1Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQywyQkFBMkIsRUFBRTtRQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBQ2hDLEdBQUcsQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUNqQixHQUFHLENBQUMsS0FBSyxFQUNULGtFQUFrRSxDQUNsRSxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0RBQXdELEVBQUU7UUFDOUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUNoQyxHQUFHLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxjQUFj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