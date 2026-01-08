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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFZhcmlhYmxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbmlwcGV0L3Rlc3QvYnJvd3Nlci9zbmlwcGV0VmFyaWFibGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxhQUFhLEVBQThCLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUYsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixnQ0FBZ0MsRUFDaEMsMEJBQTBCLEVBQzFCLDhCQUE4QixFQUM5Qix5QkFBeUIsRUFDekIsOEJBQThCLEdBQzlCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTFFLE9BQU8sRUFHTixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVB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