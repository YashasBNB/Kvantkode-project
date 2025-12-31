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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TdHJpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbWFya2Rvd25TdHJpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXpDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsMkJBQTJCLEVBQUU7UUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUNoQyxHQUFHLENBQUMsVUFBVSxDQUFDLDZCQUE2QixDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FDakIsR0FBRyxDQUFDLEtBQUssRUFDVCxrRUFBa0UsQ0FDbEUsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdEQUF3RCxFQUFFO1FBQzlELE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDaEMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE1BQU0sR0FBRyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDaEMsR0FBRyxD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