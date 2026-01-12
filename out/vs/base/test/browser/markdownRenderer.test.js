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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci9tYXJrZG93blJlbmRlcmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsY0FBYyxFQUNkLHlCQUF5QixHQUN6QixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDN0UsT0FBTyxLQUFLLE1BQU0sTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1RSxTQUFTLFNBQVMsQ0FBQyxHQUFXO0lBQzdCLE9BQU8sSUFBSSxTQUFTLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUF5QixDQUFBO0FBQ3hGLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLFVBQXVCLEVBQUUsWUFBb0I7SUFDdEUsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQ1IsVUFBVSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFDcEMsYUFBYSxZQUFZLENBQUMsU0FBUyxhQUFhLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FDdEUsQ0FBQTtBQUNGLENB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