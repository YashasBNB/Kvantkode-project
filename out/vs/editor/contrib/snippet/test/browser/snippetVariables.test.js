/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { sep } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { SnippetParser } from '../../browser/snippetParser.js';
import { ClipboardBasedVariableResolver, CompositeSnippetVariableResolver, ModelBasedVariableResolver, SelectionBasedVariableResolver, TimeBasedVariableResolver, WorkspaceBasedVariableResolver, } from '../../browser/snippetVariables.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { toWorkspaceFolder, } from '../../../../../platform/workspace/common/workspace.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { toWorkspaceFolders } from '../../../../../platform/workspaces/common/workspaces.js';
suite('Snippet Variables Resolver', function () {
    const labelService = new (class extends mock() {
        getUriLabel(uri) {
            return uri.fsPath;
        }
    })();
    let model;
    let resolver;
    setup(function () {
        model = createTextModel(['this is line one', 'this is line two', '    this is line three'].join('\n'), undefined, undefined, URI.parse('file:///foo/files/text.txt'));
        resolver = new CompositeSnippetVariableResolver([
            new ModelBasedVariableResolver(labelService, model),
            new SelectionBasedVariableResolver(model, new Selection(1, 1, 1, 1), 0, undefined),
        ]);
    });
    teardown(function () {
        model.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertVariableResolve(resolver, varName, expected) {
        const snippet = new SnippetParser().parse(`$${varName}`);
        const variable = snippet.children[0];
        variable.resolve(resolver);
        if (variable.children.length === 0) {
            assert.strictEqual(undefined, expected);
        }
        else {
            assert.strictEqual(variable.toString(), expected);
        }
    }
    test('editor variables, basics', function () {
        assertVariableResolve(resolver, 'TM_FILENAME', 'text.txt');
        assertVariableResolve(resolver, 'something', undefined);
    });
    test('editor variables, file/dir', function () {
        const disposables = new DisposableStore();
        assertVariableResolve(resolver, 'TM_FILENAME', 'text.txt');
        if (!isWindows) {
            assertVariableResolve(resolver, 'TM_DIRECTORY', '/foo/files');
            assertVariableResolve(resolver, 'TM_FILEPATH', '/foo/files/text.txt');
        }
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('http://www.pb.o/abc/def/ghi'))));
        assertVariableResolve(resolver, 'TM_FILENAME', 'ghi');
        if (!isWindows) {
            assertVariableResolve(resolver, 'TM_DIRECTORY', '/abc/def');
            assertVariableResolve(resolver, 'TM_FILEPATH', '/abc/def/ghi');
        }
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('mem:fff.ts'))));
        assertVariableResolve(resolver, 'TM_DIRECTORY', '');
        assertVariableResolve(resolver, 'TM_FILEPATH', 'fff.ts');
        disposables.dispose();
    });
    test("Path delimiters in code snippet variables aren't specific to remote OS #76840", function () {
        const labelService = new (class extends mock() {
            getUriLabel(uri) {
                return uri.fsPath.replace(/\/|\\/g, '|');
            }
        })();
        const model = createTextModel([].join('\n'), undefined, undefined, URI.parse('foo:///foo/files/text.txt'));
        const resolver = new CompositeSnippetVariableResolver([
            new ModelBasedVariableResolver(labelService, model),
        ]);
        assertVariableResolve(resolver, 'TM_FILEPATH', '|foo|files|text.txt');
        model.dispose();
    });
    test('editor variables, selection', function () {
        resolver = new SelectionBasedVariableResolver(model, new Selection(1, 2, 2, 3), 0, undefined);
        assertVariableResolve(resolver, 'TM_SELECTED_TEXT', 'his is line one\nth');
        assertVariableResolve(resolver, 'TM_CURRENT_LINE', 'this is line two');
        assertVariableResolve(resolver, 'TM_LINE_INDEX', '1');
        assertVariableResolve(resolver, 'TM_LINE_NUMBER', '2');
        assertVariableResolve(resolver, 'CURSOR_INDEX', '0');
        assertVariableResolve(resolver, 'CURSOR_NUMBER', '1');
        resolver = new SelectionBasedVariableResolver(model, new Selection(1, 2, 2, 3), 4, undefined);
        assertVariableResolve(resolver, 'CURSOR_INDEX', '4');
        assertVariableResolve(resolver, 'CURSOR_NUMBER', '5');
        resolver = new SelectionBasedVariableResolver(model, new Selection(2, 3, 1, 2), 0, undefined);
        assertVariableResolve(resolver, 'TM_SELECTED_TEXT', 'his is line one\nth');
        assertVariableResolve(resolver, 'TM_CURRENT_LINE', 'this is line one');
        assertVariableResolve(resolver, 'TM_LINE_INDEX', '0');
        assertVariableResolve(resolver, 'TM_LINE_NUMBER', '1');
        resolver = new SelectionBasedVariableResolver(model, new Selection(1, 2, 1, 2), 0, undefined);
        assertVariableResolve(resolver, 'TM_SELECTED_TEXT', undefined);
        assertVariableResolve(resolver, 'TM_CURRENT_WORD', 'this');
        resolver = new SelectionBasedVariableResolver(model, new Selection(3, 1, 3, 1), 0, undefined);
        assertVariableResolve(resolver, 'TM_CURRENT_WORD', undefined);
    });
    test('TextmateSnippet, resolve variable', function () {
        const snippet = new SnippetParser().parse('"$TM_CURRENT_WORD"', true);
        assert.strictEqual(snippet.toString(), '""');
        snippet.resolveVariables(resolver);
        assert.strictEqual(snippet.toString(), '"this"');
    });
    test('TextmateSnippet, resolve variable with default', function () {
        const snippet = new SnippetParser().parse('"${TM_CURRENT_WORD:foo}"', true);
        assert.strictEqual(snippet.toString(), '"foo"');
        snippet.resolveVariables(resolver);
        assert.strictEqual(snippet.toString(), '"this"');
    });
    test('More useful environment variables for snippets, #32737', function () {
        const disposables = new DisposableStore();
        assertVariableResolve(resolver, 'TM_FILENAME_BASE', 'text');
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('http://www.pb.o/abc/def/ghi'))));
        assertVariableResolve(resolver, 'TM_FILENAME_BASE', 'ghi');
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('mem:.git'))));
        assertVariableResolve(resolver, 'TM_FILENAME_BASE', '.git');
        resolver = new ModelBasedVariableResolver(labelService, disposables.add(createTextModel('', undefined, undefined, URI.parse('mem:foo.'))));
        assertVariableResolve(resolver, 'TM_FILENAME_BASE', 'foo');
        disposables.dispose();
    });
    function assertVariableResolve2(input, expected, varValue) {
        const snippet = new SnippetParser().parse(input).resolveVariables({
            resolve(variable) {
                return varValue || variable.name;
            },
        });
        const actual = snippet.toString();
        assert.strictEqual(actual, expected);
    }
    test('Variable Snippet Transform', function () {
        const snippet = new SnippetParser().parse('name=${TM_FILENAME/(.*)\\..+$/$1/}', true);
        snippet.resolveVariables(resolver);
        assert.strictEqual(snippet.toString(), 'name=text');
        assertVariableResolve2('${ThisIsAVar/([A-Z]).*(Var)/$2/}', 'Var');
        assertVariableResolve2('${ThisIsAVar/([A-Z]).*(Var)/$2-${1:/downcase}/}', 'Var-t');
        assertVariableResolve2('${Foo/(.*)/${1:+Bar}/img}', 'Bar');
        //https://github.com/microsoft/vscode/issues/33162
        assertVariableResolve2('export default class ${TM_FILENAME/(\\w+)\\.js/$1/g}', 'export default class FooFile', 'FooFile.js');
        assertVariableResolve2('${foobarfoobar/(foo)/${1:+FAR}/g}', 'FARbarFARbar'); // global
        assertVariableResolve2('${foobarfoobar/(foo)/${1:+FAR}/}', 'FARbarfoobar'); // first match
        assertVariableResolve2('${foobarfoobar/(bazz)/${1:+FAR}/g}', 'foobarfoobar'); // no match, no else
        // assertVariableResolve2('${foobarfoobar/(bazz)/${1:+FAR}/g}', ''); // no match
        assertVariableResolve2('${foobarfoobar/(foo)/${2:+FAR}/g}', 'barbar'); // bad group reference
    });
    test('Snippet transforms do not handle regex with alternatives or optional matches, #36089', function () {
        assertVariableResolve2('${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}', 'MyClass', 'my-class.js');
        // no hyphens
        assertVariableResolve2('${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}', 'Myclass', 'myclass.js');
        // none matching suffix
        assertVariableResolve2('${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}', 'Myclass.foo', 'myclass.foo');
        // more than one hyphen
        assertVariableResolve2('${TM_FILENAME/^(.)|(?:-(.))|(\\.js)/${1:/upcase}${2:/upcase}/g}', 'ThisIsAFile', 'this-is-a-file.js');
        // KEBAB CASE
        assertVariableResolve2('${TM_FILENAME_BASE/([A-Z][a-z]+)([A-Z][a-z]+$)?/${1:/downcase}-${2:/downcase}/g}', 'capital-case', 'CapitalCase');
        assertVariableResolve2('${TM_FILENAME_BASE/([A-Z][a-z]+)([A-Z][a-z]+$)?/${1:/downcase}-${2:/downcase}/g}', 'capital-case-more', 'CapitalCaseMore');
    });
    test('Add variable to insert value from clipboard to a snippet #40153', function () {
        assertVariableResolve(new ClipboardBasedVariableResolver(() => undefined, 1, 0, true), 'CLIPBOARD', undefined);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => null, 1, 0, true), 'CLIPBOARD', undefined);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => '', 1, 0, true), 'CLIPBOARD', undefined);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'foo', 1, 0, true), 'CLIPBOARD', 'foo');
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'foo', 1, 0, true), 'foo', undefined);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'foo', 1, 0, true), 'cLIPBOARD', undefined);
    });
    test('Add variable to insert value from clipboard to a snippet #40153, 2', function () {
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1', 1, 2, true), 'CLIPBOARD', 'line1');
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1\nline2\nline3', 1, 2, true), 'CLIPBOARD', 'line1\nline2\nline3');
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1\nline2', 1, 2, true), 'CLIPBOARD', 'line2');
        resolver = new ClipboardBasedVariableResolver(() => 'line1\nline2', 0, 2, true);
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1\nline2', 0, 2, true), 'CLIPBOARD', 'line1');
        assertVariableResolve(new ClipboardBasedVariableResolver(() => 'line1\nline2', 0, 2, false), 'CLIPBOARD', 'line1\nline2');
    });
    function assertVariableResolve3(resolver, varName) {
        const snippet = new SnippetParser().parse(`$${varName}`);
        const variable = snippet.children[0];
        assert.strictEqual(variable.resolve(resolver), true, `${varName} failed to resolve`);
    }
    test('Add time variables for snippets #41631, #43140', function () {
        const resolver = new TimeBasedVariableResolver();
        assertVariableResolve3(resolver, 'CURRENT_YEAR');
        assertVariableResolve3(resolver, 'CURRENT_YEAR_SHORT');
        assertVariableResolve3(resolver, 'CURRENT_MONTH');
        assertVariableResolve3(resolver, 'CURRENT_DATE');
        assertVariableResolve3(resolver, 'CURRENT_HOUR');
        assertVariableResolve3(resolver, 'CURRENT_MINUTE');
        assertVariableResolve3(resolver, 'CURRENT_SECOND');
        assertVariableResolve3(resolver, 'CURRENT_DAY_NAME');
        assertVariableResolve3(resolver, 'CURRENT_DAY_NAME_SHORT');
        assertVariableResolve3(resolver, 'CURRENT_MONTH_NAME');
        assertVariableResolve3(resolver, 'CURRENT_MONTH_NAME_SHORT');
        assertVariableResolve3(resolver, 'CURRENT_SECONDS_UNIX');
        assertVariableResolve3(resolver, 'CURRENT_TIMEZONE_OFFSET');
    });
    test('Time-based snippet variables resolve to the same values even as time progresses', async function () {
        const snippetText = `
			$CURRENT_YEAR
			$CURRENT_YEAR_SHORT
			$CURRENT_MONTH
			$CURRENT_DATE
			$CURRENT_HOUR
			$CURRENT_MINUTE
			$CURRENT_SECOND
			$CURRENT_DAY_NAME
			$CURRENT_DAY_NAME_SHORT
			$CURRENT_MONTH_NAME
			$CURRENT_MONTH_NAME_SHORT
			$CURRENT_SECONDS_UNIX
			$CURRENT_TIMEZONE_OFFSET
		`;
        const clock = sinon.useFakeTimers();
        try {
            const resolver = new TimeBasedVariableResolver();
            const firstResolve = new SnippetParser().parse(snippetText).resolveVariables(resolver);
            clock.tick(365 * 24 * 3600 * 1000 + 24 * 3600 * 1000 + 3661 * 1000); // 1 year + 1 day + 1 hour + 1 minute + 1 second
            const secondResolve = new SnippetParser().parse(snippetText).resolveVariables(resolver);
            assert.strictEqual(firstResolve.toString(), secondResolve.toString(), `Time-based snippet variables resolved differently`);
        }
        finally {
            clock.restore();
        }
    });
    test("creating snippet - format-condition doesn't work #53617", function () {
        const snippet = new SnippetParser().parse('${TM_LINE_NUMBER/(10)/${1:?It is:It is not}/} line 10', true);
        snippet.resolveVariables({
            resolve() {
                return '10';
            },
        });
        assert.strictEqual(snippet.toString(), 'It is line 10');
        snippet.resolveVariables({
            resolve() {
                return '11';
            },
        });
        assert.strictEqual(snippet.toString(), 'It is not line 10');
    });
    test('Add workspace name and folder variables for snippets #68261', function () {
        let workspace;
        const workspaceService = new (class {
            constructor() {
                this._throw = () => {
                    throw new Error();
                };
                this.onDidChangeWorkbenchState = this._throw;
                this.onDidChangeWorkspaceName = this._throw;
                this.onWillChangeWorkspaceFolders = this._throw;
                this.onDidChangeWorkspaceFolders = this._throw;
                this.getCompleteWorkspace = this._throw;
                this.getWorkbenchState = this._throw;
                this.getWorkspaceFolder = this._throw;
                this.isCurrentWorkspace = this._throw;
                this.isInsideWorkspace = this._throw;
            }
            getWorkspace() {
                return workspace;
            }
        })();
        const resolver = new WorkspaceBasedVariableResolver(workspaceService);
        // empty workspace
        workspace = new Workspace('');
        assertVariableResolve(resolver, 'WORKSPACE_NAME', undefined);
        assertVariableResolve(resolver, 'WORKSPACE_FOLDER', undefined);
        // single folder workspace without config
        workspace = new Workspace('', [toWorkspaceFolder(URI.file('/folderName'))]);
        assertVariableResolve(resolver, 'WORKSPACE_NAME', 'folderName');
        if (!isWindows) {
            assertVariableResolve(resolver, 'WORKSPACE_FOLDER', '/folderName');
        }
        // workspace with config
        const workspaceConfigPath = URI.file('testWorkspace.code-workspace');
        workspace = new Workspace('', toWorkspaceFolders([{ path: 'folderName' }], workspaceConfigPath, extUriBiasedIgnorePathCase), workspaceConfigPath);
        assertVariableResolve(resolver, 'WORKSPACE_NAME', 'testWorkspace');
        if (!isWindows) {
            assertVariableResolve(resolver, 'WORKSPACE_FOLDER', '/');
        }
    });
    test('Add RELATIVE_FILEPATH snippet variable #114208', function () {
        let resolver;
        // Mock a label service (only coded for file uris)
        const workspaceLabelService = (rootPath) => {
            const labelService = new (class extends mock() {
                getUriLabel(uri, options = {}) {
                    const rootFsPath = URI.file(rootPath).fsPath + sep;
                    const fsPath = uri.fsPath;
                    if (options.relative && rootPath && fsPath.startsWith(rootFsPath)) {
                        return fsPath.substring(rootFsPath.length);
                    }
                    return fsPath;
                }
            })();
            return labelService;
        };
        const model = createTextModel('', undefined, undefined, URI.parse('file:///foo/files/text.txt'));
        // empty workspace
        resolver = new ModelBasedVariableResolver(workspaceLabelService(''), model);
        if (!isWindows) {
            assertVariableResolve(resolver, 'RELATIVE_FILEPATH', '/foo/files/text.txt');
        }
        else {
            assertVariableResolve(resolver, 'RELATIVE_FILEPATH', '\\foo\\files\\text.txt');
        }
        // single folder workspace
        resolver = new ModelBasedVariableResolver(workspaceLabelService('/foo'), model);
        if (!isWindows) {
            assertVariableResolve(resolver, 'RELATIVE_FILEPATH', 'files/text.txt');
        }
        else {
            assertVariableResolve(resolver, 'RELATIVE_FILEPATH', 'files\\text.txt');
        }
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFZhcmlhYmxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC90ZXN0L2Jyb3dzZXIvc25pcHBldFZhcmlhYmxlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsYUFBYSxFQUE4QixNQUFNLGdDQUFnQyxDQUFBO0FBQzFGLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsZ0NBQWdDLEVBQ2hDLDBCQUEwQixFQUMxQiw4QkFBOEIsRUFDOUIseUJBQXlCLEVBQ3pCLDhCQUE4QixHQUM5QixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUxRSxPQUFPLEVBR04saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFNB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