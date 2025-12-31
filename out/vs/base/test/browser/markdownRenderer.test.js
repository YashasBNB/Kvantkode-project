/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { fillInIncompleteTokens, renderMarkdown, renderMarkdownAsPlaintext, } from '../../browser/markdownRenderer.js';
import { MarkdownString } from '../../common/htmlContent.js';
import * as marked from '../../common/marked/marked.js';
import { parse } from '../../common/marshalling.js';
import { isWeb } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
function strToNode(str) {
    return new DOMParser().parseFromString(str, 'text/html').body.firstChild;
}
function assertNodeEquals(actualNode, expectedHtml) {
    const expectedNode = strToNode(expectedHtml);
    assert.ok(actualNode.isEqualNode(expectedNode), `Expected: ${expectedNode.outerHTML}\nActual: ${actualNode.outerHTML}`);
}
suite('MarkdownRenderer', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('Sanitization', () => {
        test('Should not render images with unknown schemes', () => {
            const markdown = { value: `![image](no-such://example.com/cat.gif)` };
            const result = store.add(renderMarkdown(markdown)).element;
            assert.strictEqual(result.innerHTML, '<p><img alt="image"></p>');
        });
    });
    suite('Images', () => {
        test('image rendering conforms to default', () => {
            const markdown = { value: `![image](http://example.com/cat.gif 'caption')` };
            const result = store.add(renderMarkdown(markdown)).element;
            assertNodeEquals(result, '<div><p><img title="caption" alt="image" src="http://example.com/cat.gif"></p></div>');
        });
        test('image rendering conforms to default without title', () => {
            const markdown = { value: `![image](http://example.com/cat.gif)` };
            const result = store.add(renderMarkdown(markdown)).element;
            assertNodeEquals(result, '<div><p><img alt="image" src="http://example.com/cat.gif"></p></div>');
        });
        test('image width from title params', () => {
            const result = store.add(renderMarkdown({ value: `![image](http://example.com/cat.gif|width=100px 'caption')` })).element;
            assertNodeEquals(result, `<div><p><img width="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image height from title params', () => {
            const result = store.add(renderMarkdown({ value: `![image](http://example.com/cat.gif|height=100 'caption')` })).element;
            assertNodeEquals(result, `<div><p><img height="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image width and height from title params', () => {
            const result = store.add(renderMarkdown({
                value: `![image](http://example.com/cat.gif|height=200,width=100 'caption')`,
            })).element;
            assertNodeEquals(result, `<div><p><img height="200" width="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image with file uri should render as same origin uri', () => {
            if (isWeb) {
                return;
            }
            const result = store.add(renderMarkdown({ value: `![image](file:///images/cat.gif)` })).element;
            assertNodeEquals(result, '<div><p><img src="vscode-file://vscode-app/images/cat.gif" alt="image"></p></div>');
        });
    });
    suite('Code block renderer', () => {
        const simpleCodeBlockRenderer = (lang, code) => {
            const element = document.createElement('code');
            element.textContent = code;
            return Promise.resolve(element);
        };
        test('asyncRenderCallback should be invoked for code blocks', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise((resolve) => {
                store.add(renderMarkdown(markdown, {
                    asyncRenderCallback: resolve,
                    codeBlockRenderer: simpleCodeBlockRenderer,
                }));
            });
        });
        test('asyncRenderCallback should not be invoked if result is immediately disposed', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise((resolve, reject) => {
                const result = renderMarkdown(markdown, {
                    asyncRenderCallback: reject,
                    codeBlockRenderer: simpleCodeBlockRenderer,
                });
                result.dispose();
                setTimeout(resolve, 10);
            });
        });
        test('asyncRenderCallback should not be invoked if dispose is called before code block is rendered', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise((resolve, reject) => {
                let resolveCodeBlockRendering;
                const result = renderMarkdown(markdown, {
                    asyncRenderCallback: reject,
                    codeBlockRenderer: () => {
                        return new Promise((resolve) => {
                            resolveCodeBlockRendering = resolve;
                        });
                    },
                });
                setTimeout(() => {
                    result.dispose();
                    resolveCodeBlockRendering(document.createElement('code'));
                    setTimeout(resolve, 10);
                }, 10);
            });
        });
        test('Code blocks should use leading language id (#157793)', async () => {
            const markdown = { value: '```js some other stuff\n1 + 1;\n```' };
            const lang = await new Promise((resolve) => {
                store.add(renderMarkdown(markdown, {
                    codeBlockRenderer: async (lang, value) => {
                        resolve(lang);
                        return simpleCodeBlockRenderer(lang, value);
                    },
                }));
            });
            assert.strictEqual(lang, 'js');
        });
    });
    suite('ThemeIcons Support On', () => {
        test('render appendText', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendText('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap)&nbsp;$(not&nbsp;a&nbsp;theme&nbsp;icon)&nbsp;$(add)</p>`);
        });
        test('render appendMarkdown', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><span class="codicon codicon-zap"></span> $(not a theme icon) <span class="codicon codicon-add"></span></p>`);
        });
        test('render appendMarkdown with escaped icon', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap) $(not a theme icon) <span class="codicon codicon-add"></span></p>`);
        });
        test('render icon in link', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown(`[$(zap)-link](#link)`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><a data-href="#link" href="" title="#link" draggable="false"><span class="codicon codicon-zap"></span>-link</a></p>`);
        });
        test('render icon in table', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown(`
| text   | text                 |
|--------|----------------------|
| $(zap) | [$(zap)-link](#link) |`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<table>
<thead>
<tr>
<th>text</th>
<th>text</th>
</tr>
</thead>
<tbody><tr>
<td><span class="codicon codicon-zap"></span></td>
<td><a data-href="#link" href="" title="#link" draggable="false"><span class="codicon codicon-zap"></span>-link</a></td>
</tr>
</tbody></table>
`);
        });
        test('render icon in <a> without href (#152170)', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true, supportHtml: true });
            mds.appendMarkdown(`<a>$(sync)</a>`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><span class="codicon codicon-sync"></span></p>`);
        });
    });
    suite('ThemeIcons Support Off', () => {
        test('render appendText', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: false });
            mds.appendText('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap)&nbsp;$(not&nbsp;a&nbsp;theme&nbsp;icon)&nbsp;$(add)</p>`);
        });
        test('render appendMarkdown with escaped icon', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: false });
            mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap) $(not a theme icon) $(add)</p>`);
        });
    });
    test('npm Hover Run Script not working #90855', function () {
        const md = JSON.parse('{"value":"[Run Script](command:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22fsPath%22%3A%22c%3A%5C%5CUsers%5C%5Cjrieken%5C%5CCode%5C%5C_sample%5C%5Cfoo%5C%5Cpackage.json%22%2C%22_sep%22%3A1%2C%22external%22%3A%22file%3A%2F%2F%2Fc%253A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22path%22%3A%22%2Fc%3A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22echo%22%7D \\"Run the script as a task\\")","supportThemeIcons":false,"isTrusted":true,"uris":{"__uri_e49443":{"$mid":1,"fsPath":"c:\\\\Users\\\\jrieken\\\\Code\\\\_sample\\\\foo\\\\package.json","_sep":1,"external":"file:///c%3A/Users/jrieken/Code/_sample/foo/package.json","path":"/c:/Users/jrieken/Code/_sample/foo/package.json","scheme":"file"},"command:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22fsPath%22%3A%22c%3A%5C%5CUsers%5C%5Cjrieken%5C%5CCode%5C%5C_sample%5C%5Cfoo%5C%5Cpackage.json%22%2C%22_sep%22%3A1%2C%22external%22%3A%22file%3A%2F%2F%2Fc%253A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22path%22%3A%22%2Fc%3A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22echo%22%7D":{"$mid":1,"path":"npm.runScriptFromHover","scheme":"command","query":"{\\"documentUri\\":\\"__uri_e49443\\",\\"script\\":\\"echo\\"}"}}}');
        const element = store.add(renderMarkdown(md)).element;
        const anchor = element.querySelector('a');
        assert.ok(anchor);
        assert.ok(anchor.dataset['href']);
        const uri = URI.parse(anchor.dataset['href']);
        const data = parse(decodeURIComponent(uri.query));
        assert.ok(data);
        assert.strictEqual(data.script, 'echo');
        assert.ok(data.documentUri.toString().startsWith('file:///c%3A/'));
    });
    test('Should not render command links by default', () => {
        const md = new MarkdownString(`[command1](command:doFoo) <a href="command:doFoo">command2</a>`, {
            supportHtml: true,
        });
        const result = store.add(renderMarkdown(md)).element;
        assert.strictEqual(result.innerHTML, `<p>command1 command2</p>`);
    });
    test('Should render command links in trusted strings', () => {
        const md = new MarkdownString(`[command1](command:doFoo) <a href="command:doFoo">command2</a>`, {
            isTrusted: true,
            supportHtml: true,
        });
        const result = store.add(renderMarkdown(md)).element;
        assert.strictEqual(result.innerHTML, `<p><a data-href="command:doFoo" href="" title="command:doFoo" draggable="false">command1</a> <a data-href="command:doFoo" href="">command2</a></p>`);
    });
    suite('PlaintextMarkdownRender', () => {
        test('test code, blockquote, heading, list, listitem, paragraph, table, tablerow, tablecell, strong, em, br, del, text are rendered plaintext', () => {
            const markdown = {
                value: '`code`\n>quote\n# heading\n- list\n\ntable | table2\n--- | --- \none | two\n\n\nbo**ld**\n_italic_\n~~del~~\nsome text',
            };
            const expected = 'code\nquote\nheading\nlist\n\ntable table2\none two\nbold\nitalic\ndel\nsome text';
            const result = renderMarkdownAsPlaintext(markdown);
            assert.strictEqual(result, expected);
        });
        test('test html, hr, image, link are rendered plaintext', () => {
            const markdown = { value: '<div>html</div>\n\n---\n![image](imageLink)\n[text](textLink)' };
            const expected = 'text';
            const result = renderMarkdownAsPlaintext(markdown);
            assert.strictEqual(result, expected);
        });
        test(`Should not remove html inside of code blocks`, () => {
            const markdown = {
                value: ['```html', '<form>html</form>', '```'].join('\n'),
            };
            const expected = ['```', '<form>html</form>', '```'].join('\n');
            const result = renderMarkdownAsPlaintext(markdown, true);
            assert.strictEqual(result, expected);
        });
    });
    suite('supportHtml', () => {
        test('supportHtml is disabled by default', () => {
            const mds = new MarkdownString(undefined, {});
            mds.appendMarkdown('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>abc</p>`);
        });
        test('Renders html when supportHtml=true', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a<b>b</b>c</p>`);
        });
        test('Should not include scripts even when supportHtml=true', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown('a<b onclick="alert(1)">b</b><script>alert(2)</script>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a<b>b</b>c</p>`);
        });
        test('Should not render html appended as text', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendText('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a&lt;b&gt;b&lt;/b&gt;c</p>`);
        });
        test('Should render html images', () => {
            if (isWeb) {
                return;
            }
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown(`<img src="http://example.com/cat.gif">`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<img src="http://example.com/cat.gif">`);
        });
        test('Should render html images with file uri as same origin uri', () => {
            if (isWeb) {
                return;
            }
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown(`<img src="file:///images/cat.gif">`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<img src="vscode-file://vscode-app/images/cat.gif">`);
        });
    });
    suite('fillInIncompleteTokens', () => {
        function ignoreRaw(...tokenLists) {
            tokenLists.forEach((tokens) => {
                tokens.forEach((t) => (t.raw = ''));
            });
        }
        const completeTable = '| a | b |\n| --- | --- |';
        suite('table', () => {
            test('complete table', () => {
                const tokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.equal(newTokens, tokens);
            });
            test('full header only', () => {
                const incompleteTable = '| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header only with trailing space', () => {
                const incompleteTable = '| a | b | ';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('incomplete header', () => {
                const incompleteTable = '| a | b';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('incomplete header one column', () => {
                const incompleteTable = '| a ';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '|\n| --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with extras', () => {
                const incompleteTable = '| a **bold** | b _italics_ |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with leading text', () => {
                // Parsing this gives one token and one 'text' subtoken
                const incompleteTable = 'here is a table\n| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with leading other stuff', () => {
                // Parsing this gives one token and one 'text' subtoken
                const incompleteTable = '```js\nconst xyz = 123;\n```\n| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator', () => {
                const incompleteTable = '| a | b |\n| ---';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator 2', () => {
                const incompleteTable = '| a | b |\n| --- |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator 3', () => {
                const incompleteTable = '| a | b |\n|';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('not a table', () => {
                const incompleteTable = '| a | b |\nsome text';
                const tokens = marked.marked.lexer(incompleteTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('not a table 2', () => {
                const incompleteTable = '| a | b |\n| --- |\nsome text';
                const tokens = marked.marked.lexer(incompleteTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        function simpleMarkdownTestSuite(name, delimiter) {
            test(`incomplete ${name}`, () => {
                const incomplete = `${delimiter}code`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`complete ${name}`, () => {
                const text = `leading text ${delimiter}code${delimiter} trailing text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test(`${name} with leading text`, () => {
                const incomplete = `some text and ${delimiter}some code`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`single loose "${delimiter}"`, () => {
                const text = `some text and ${delimiter}by itself\nmore text here`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test(`incomplete ${name} after newline`, () => {
                const text = `some text\nmore text here and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete after complete ${name}`, () => {
                const text = `leading text ${delimiter}code${delimiter} trailing text and ${delimiter}another`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in list`, () => {
                const text = `- list item one\n- list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in asterisk list`, () => {
                const text = `* list item one\n* list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in numbered list`, () => {
                const text = `1. list item one\n2. list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        }
        suite('list', () => {
            test('list with complete codeblock', () => {
                const list = `-
	\`\`\`js
	let x = 1;
	\`\`\`
- list item two
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test.skip('list with incomplete codeblock', () => {
                const incomplete = `- list item one

	\`\`\`js
	let x = 1;`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\n	```');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with subitems', () => {
                const list = `- hello
	- sub item
- text
	newline for some reason
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('ordered list with subitems', () => {
                const list = `1. hello
	- sub item
2. text
	newline for some reason
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('list with stuff', () => {
                const list = `- list item one \`codespan\` **bold** [link](http://microsoft.com) more text`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('list with incomplete link text', () => {
                const incomplete = `- list item one
- item two [link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete link target', () => {
                const incomplete = `- list item one
- item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with incomplete link target', () => {
                const incomplete = `1. list item one
2. item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with extra whitespace', () => {
                const incomplete = `1. list item one
2. item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with extra whitespace', () => {
                const incomplete = `- list item one
- item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete link with other stuff', () => {
                const incomplete = `- list item one
- item two [\`link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with incomplete link with other stuff', () => {
                const incomplete = `1. list item one
1. item two [\`link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete subitem', () => {
                const incomplete = `1. list item one
	- `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '&nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete nested subitem', () => {
                const incomplete = `1. list item one
	- item 2
		- `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '&nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('codespan', () => {
            simpleMarkdownTestSuite('codespan', '`');
            test(`backtick between letters`, () => {
                const text = 'a`b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeCodespanTokens = marked.marked.lexer(text + '`');
                assert.deepStrictEqual(newTokens, completeCodespanTokens);
            });
            test(`nested pattern`, () => {
                const text = 'sldkfjsd `abc __def__ ghi';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '`');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('star', () => {
            simpleMarkdownTestSuite('star', '*');
            test(`star between letters`, () => {
                const text = 'sldkfjsd a*b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '*');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`nested pattern`, () => {
                const text = 'sldkfjsd *abc __def__ ghi';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '*');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('double star', () => {
            simpleMarkdownTestSuite('double star', '**');
            test(`double star between letters`, () => {
                const text = 'a**b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '**');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('underscore', () => {
            simpleMarkdownTestSuite('underscore', '_');
            test(`underscore between letters`, () => {
                const text = `this_not_italics`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        suite('double underscore', () => {
            simpleMarkdownTestSuite('double underscore', '__');
            test(`double underscore between letters`, () => {
                const text = `this__not__bold`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        suite('link', () => {
            test('incomplete link text', () => {
                const incomplete = 'abc [text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target', () => {
                const incomplete = 'foo [text](http://microsoft';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target 2', () => {
                const incomplete = 'foo [text](http://microsoft.com';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with extra stuff', () => {
                const incomplete = '[before `text` after](http://microsoft.com';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with extra stuff and incomplete arg', () => {
                const incomplete = '[before `text` after](http://microsoft.com "more text ';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with incomplete arg', () => {
                const incomplete = 'foo [text](http://microsoft.com "more text here ';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with incomplete arg 2', () => {
                const incomplete = '[text](command:vscode.openRelativePath "arg';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with complete arg', () => {
                const incomplete = 'foo [text](http://microsoft.com "more text here"';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('link text with incomplete codespan', () => {
                const incomplete = `text [\`codespan`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('link text with incomplete stuff', () => {
                const incomplete = `text [more text \`codespan\` text **bold`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '**](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test("Looks like incomplete link target but isn't", () => {
                const complete = '**bold** `codespan` text](';
                const tokens = marked.marked.lexer(complete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(complete);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test.skip('incomplete link in list', () => {
                const incomplete = '- [text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('square brace between letters', () => {
                const incomplete = 'a[b';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('square brace on previous line', () => {
                const incomplete = 'text[\nmore text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('complete link', () => {
                const incomplete = 'text [link](http://microsoft.com)';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvbWFya2Rvd25SZW5kZXJlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGNBQWMsRUFDZCx5QkFBeUIsR0FDekIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzdFLE9BQU8sS0FBSyxNQUFNLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDekMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFNUUsU0FBUyxTQUFTLENBQUMsR0FBVztJQUM3QixPQUFPLElBQUksU0FBUyxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBeUIsQ0FBQTtBQUN4RixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxVQUF1QixFQUFFLFlBQW9CO0lBQ3RFLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM1QyxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEVBQ3BDLGFBQWEsWUFBWSxDQUFDLFNBQVMsYUFBYSxVQUFVLENBQUMsU0FBUyxFQUFFLENBQ3RFLENBQUE7QUFDRixDQUFDO0FB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