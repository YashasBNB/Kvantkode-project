/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as glob from '../../common/glob.js';
import { sep } from '../../common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Glob', () => {
    // test('perf', () => {
    // 	let patterns = [
    // 		'{**/*.cs,**/*.json,**/*.csproj,**/*.sln}',
    // 		'{**/*.cs,**/*.csproj,**/*.sln}',
    // 		'{**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.es6,**/*.mjs,**/*.cjs}',
    // 		'**/*.go',
    // 		'{**/*.ps,**/*.ps1}',
    // 		'{**/*.c,**/*.cpp,**/*.h}',
    // 		'{**/*.fsx,**/*.fsi,**/*.fs,**/*.ml,**/*.mli}',
    // 		'{**/*.js,**/*.jsx,**/*.es6,**/*.mjs,**/*.cjs}',
    // 		'{**/*.ts,**/*.tsx}',
    // 		'{**/*.php}',
    // 		'{**/*.php}',
    // 		'{**/*.php}',
    // 		'{**/*.php}',
    // 		'{**/*.py}',
    // 		'{**/*.py}',
    // 		'{**/*.py}',
    // 		'{**/*.rs,**/*.rslib}',
    // 		'{**/*.cpp,**/*.cc,**/*.h}',
    // 		'{**/*.md}',
    // 		'{**/*.md}',
    // 		'{**/*.md}'
    // 	];
    // 	let paths = [
    // 		'/DNXConsoleApp/Program.cs',
    // 		'C:\\DNXConsoleApp\\foo\\Program.cs',
    // 		'test/qunit',
    // 		'test/test.txt',
    // 		'test/node_modules',
    // 		'.hidden.txt',
    // 		'/node_module/test/foo.js'
    // 	];
    // 	let results = 0;
    // 	let c = 1000;
    // 	console.profile('glob.match');
    // 	while (c-- > 0) {
    // 		for (let path of paths) {
    // 			for (let pattern of patterns) {
    // 				let r = glob.match(pattern, path);
    // 				if (r) {
    // 					results += 42;
    // 				}
    // 			}
    // 		}
    // 	}
    // 	console.profileEnd();
    // });
    function assertGlobMatch(pattern, input) {
        assert(glob.match(pattern, input), `${JSON.stringify(pattern)} should match ${input}`);
        assert(glob.match(pattern, nativeSep(input)), `${pattern} should match ${nativeSep(input)}`);
    }
    function assertNoGlobMatch(pattern, input) {
        assert(!glob.match(pattern, input), `${pattern} should not match ${input}`);
        assert(!glob.match(pattern, nativeSep(input)), `${pattern} should not match ${nativeSep(input)}`);
    }
    test('simple', () => {
        let p = 'node_modules';
        assertGlobMatch(p, 'node_modules');
        assertNoGlobMatch(p, 'node_module');
        assertNoGlobMatch(p, '/node_modules');
        assertNoGlobMatch(p, 'test/node_modules');
        p = 'test.txt';
        assertGlobMatch(p, 'test.txt');
        assertNoGlobMatch(p, 'test?txt');
        assertNoGlobMatch(p, '/text.txt');
        assertNoGlobMatch(p, 'test/test.txt');
        p = 'test(.txt';
        assertGlobMatch(p, 'test(.txt');
        assertNoGlobMatch(p, 'test?txt');
        p = 'qunit';
        assertGlobMatch(p, 'qunit');
        assertNoGlobMatch(p, 'qunit.css');
        assertNoGlobMatch(p, 'test/qunit');
        // Absolute
        p = '/DNXConsoleApp/**/*.cs';
        assertGlobMatch(p, '/DNXConsoleApp/Program.cs');
        assertGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
        p = 'C:/DNXConsoleApp/**/*.cs';
        assertGlobMatch(p, 'C:\\DNXConsoleApp\\Program.cs');
        assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
        p = '*';
        assertGlobMatch(p, '');
    });
    test('dot hidden', function () {
        let p = '.*';
        assertGlobMatch(p, '.git');
        assertGlobMatch(p, '.hidden.txt');
        assertNoGlobMatch(p, 'git');
        assertNoGlobMatch(p, 'hidden.txt');
        assertNoGlobMatch(p, 'path/.git');
        assertNoGlobMatch(p, 'path/.hidden.txt');
        p = '**/.*';
        assertGlobMatch(p, '.git');
        assertGlobMatch(p, '/.git');
        assertGlobMatch(p, '.hidden.txt');
        assertNoGlobMatch(p, 'git');
        assertNoGlobMatch(p, 'hidden.txt');
        assertGlobMatch(p, 'path/.git');
        assertGlobMatch(p, 'path/.hidden.txt');
        assertGlobMatch(p, '/path/.git');
        assertGlobMatch(p, '/path/.hidden.txt');
        assertNoGlobMatch(p, 'path/git');
        assertNoGlobMatch(p, 'pat.h/hidden.txt');
        p = '._*';
        assertGlobMatch(p, '._git');
        assertGlobMatch(p, '._hidden.txt');
        assertNoGlobMatch(p, 'git');
        assertNoGlobMatch(p, 'hidden.txt');
        assertNoGlobMatch(p, 'path/._git');
        assertNoGlobMatch(p, 'path/._hidden.txt');
        p = '**/._*';
        assertGlobMatch(p, '._git');
        assertGlobMatch(p, '._hidden.txt');
        assertNoGlobMatch(p, 'git');
        assertNoGlobMatch(p, 'hidden._txt');
        assertGlobMatch(p, 'path/._git');
        assertGlobMatch(p, 'path/._hidden.txt');
        assertGlobMatch(p, '/path/._git');
        assertGlobMatch(p, '/path/._hidden.txt');
        assertNoGlobMatch(p, 'path/git');
        assertNoGlobMatch(p, 'pat.h/hidden._txt');
    });
    test('file pattern', function () {
        let p = '*.js';
        assertGlobMatch(p, 'foo.js');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = 'html.*';
        assertGlobMatch(p, 'html.js');
        assertGlobMatch(p, 'html.txt');
        assertNoGlobMatch(p, 'htm.txt');
        p = '*.*';
        assertGlobMatch(p, 'html.js');
        assertGlobMatch(p, 'html.txt');
        assertGlobMatch(p, 'htm.txt');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
        p = 'node_modules/test/*.js';
        assertGlobMatch(p, 'node_modules/test/foo.js');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_module/test/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
    });
    test('star', () => {
        let p = 'node*modules';
        assertGlobMatch(p, 'node_modules');
        assertGlobMatch(p, 'node_super_modules');
        assertNoGlobMatch(p, 'node_module');
        assertNoGlobMatch(p, '/node_modules');
        assertNoGlobMatch(p, 'test/node_modules');
        p = '*';
        assertGlobMatch(p, 'html.js');
        assertGlobMatch(p, 'html.txt');
        assertGlobMatch(p, 'htm.txt');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
    });
    test('file / folder match', function () {
        const p = '**/node_modules/**';
        assertGlobMatch(p, 'node_modules');
        assertGlobMatch(p, 'node_modules/');
        assertGlobMatch(p, 'a/node_modules');
        assertGlobMatch(p, 'a/node_modules/');
        assertGlobMatch(p, 'node_modules/foo');
        assertGlobMatch(p, 'foo/node_modules/foo/bar');
        assertGlobMatch(p, '/node_modules');
        assertGlobMatch(p, '/node_modules/');
        assertGlobMatch(p, '/a/node_modules');
        assertGlobMatch(p, '/a/node_modules/');
        assertGlobMatch(p, '/node_modules/foo');
        assertGlobMatch(p, '/foo/node_modules/foo/bar');
    });
    test('questionmark', () => {
        let p = 'node?modules';
        assertGlobMatch(p, 'node_modules');
        assertNoGlobMatch(p, 'node_super_modules');
        assertNoGlobMatch(p, 'node_module');
        assertNoGlobMatch(p, '/node_modules');
        assertNoGlobMatch(p, 'test/node_modules');
        p = '?';
        assertGlobMatch(p, 'h');
        assertNoGlobMatch(p, 'html.txt');
        assertNoGlobMatch(p, 'htm.txt');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
    });
    test('globstar', () => {
        let p = '**/*.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, '/foo.js');
        assertGlobMatch(p, 'folder/foo.js');
        assertGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        assertNoGlobMatch(p, '/some.js/test');
        assertNoGlobMatch(p, '\\some.js\\test');
        p = '**/project.json';
        assertGlobMatch(p, 'project.json');
        assertGlobMatch(p, '/project.json');
        assertGlobMatch(p, 'some/folder/project.json');
        assertGlobMatch(p, '/some/folder/project.json');
        assertNoGlobMatch(p, 'some/folder/file_project.json');
        assertNoGlobMatch(p, 'some/folder/fileproject.json');
        assertNoGlobMatch(p, 'some/rrproject.json');
        assertNoGlobMatch(p, 'some\\rrproject.json');
        p = 'test/**';
        assertGlobMatch(p, 'test');
        assertGlobMatch(p, 'test/foo');
        assertGlobMatch(p, 'test/foo/');
        assertGlobMatch(p, 'test/foo.js');
        assertGlobMatch(p, 'test/other/foo.js');
        assertNoGlobMatch(p, 'est/other/foo.js');
        p = '**';
        assertGlobMatch(p, '/');
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'folder/foo.js');
        assertGlobMatch(p, 'folder/foo/');
        assertGlobMatch(p, '/node_modules/foo.js');
        assertGlobMatch(p, 'foo.jss');
        assertGlobMatch(p, 'some.js/test');
        p = 'test/**/*.js';
        assertGlobMatch(p, 'test/foo.js');
        assertGlobMatch(p, 'test/other/foo.js');
        assertGlobMatch(p, 'test/other/more/foo.js');
        assertNoGlobMatch(p, 'test/foo.ts');
        assertNoGlobMatch(p, 'test/other/foo.ts');
        assertNoGlobMatch(p, 'test/other/more/foo.ts');
        p = '**/**/*.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, '/foo.js');
        assertGlobMatch(p, 'folder/foo.js');
        assertGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = '**/node_modules/**/*.js';
        assertNoGlobMatch(p, 'foo.js');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertGlobMatch(p, 'node_modules/foo.js');
        assertGlobMatch(p, '/node_modules/foo.js');
        assertGlobMatch(p, 'node_modules/some/folder/foo.js');
        assertGlobMatch(p, '/node_modules/some/folder/foo.js');
        assertNoGlobMatch(p, 'node_modules/some/folder/foo.ts');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = '{**/node_modules/**,**/.git/**,**/bower_components/**}';
        assertGlobMatch(p, 'node_modules');
        assertGlobMatch(p, '/node_modules');
        assertGlobMatch(p, '/node_modules/more');
        assertGlobMatch(p, 'some/test/node_modules');
        assertGlobMatch(p, 'some\\test\\node_modules');
        assertGlobMatch(p, '/some/test/node_modules');
        assertGlobMatch(p, '\\some\\test\\node_modules');
        assertGlobMatch(p, 'C:\\\\some\\test\\node_modules');
        assertGlobMatch(p, 'C:\\\\some\\test\\node_modules\\more');
        assertGlobMatch(p, 'bower_components');
        assertGlobMatch(p, 'bower_components/more');
        assertGlobMatch(p, '/bower_components');
        assertGlobMatch(p, 'some/test/bower_components');
        assertGlobMatch(p, 'some\\test\\bower_components');
        assertGlobMatch(p, '/some/test/bower_components');
        assertGlobMatch(p, '\\some\\test\\bower_components');
        assertGlobMatch(p, 'C:\\\\some\\test\\bower_components');
        assertGlobMatch(p, 'C:\\\\some\\test\\bower_components\\more');
        assertGlobMatch(p, '.git');
        assertGlobMatch(p, '/.git');
        assertGlobMatch(p, 'some/test/.git');
        assertGlobMatch(p, 'some\\test\\.git');
        assertGlobMatch(p, '/some/test/.git');
        assertGlobMatch(p, '\\some\\test\\.git');
        assertGlobMatch(p, 'C:\\\\some\\test\\.git');
        assertNoGlobMatch(p, 'tempting');
        assertNoGlobMatch(p, '/tempting');
        assertNoGlobMatch(p, 'some/test/tempting');
        assertNoGlobMatch(p, 'some\\test\\tempting');
        assertNoGlobMatch(p, '/some/test/tempting');
        assertNoGlobMatch(p, '\\some\\test\\tempting');
        assertNoGlobMatch(p, 'C:\\\\some\\test\\tempting');
        p = '{**/package.json,**/project.json}';
        assertGlobMatch(p, 'package.json');
        assertGlobMatch(p, '/package.json');
        assertNoGlobMatch(p, 'xpackage.json');
        assertNoGlobMatch(p, '/xpackage.json');
    });
    test('issue 41724', function () {
        let p = 'some/**/*.js';
        assertGlobMatch(p, 'some/foo.js');
        assertGlobMatch(p, 'some/folder/foo.js');
        assertNoGlobMatch(p, 'something/foo.js');
        assertNoGlobMatch(p, 'something/folder/foo.js');
        p = 'some/**/*';
        assertGlobMatch(p, 'some/foo.js');
        assertGlobMatch(p, 'some/folder/foo.js');
        assertNoGlobMatch(p, 'something/foo.js');
        assertNoGlobMatch(p, 'something/folder/foo.js');
    });
    test('brace expansion', function () {
        let p = '*.{html,js}';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'foo.html');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = '*.{html}';
        assertGlobMatch(p, 'foo.html');
        assertNoGlobMatch(p, 'foo.js');
        assertNoGlobMatch(p, 'folder/foo.js');
        assertNoGlobMatch(p, '/node_modules/foo.js');
        assertNoGlobMatch(p, 'foo.jss');
        assertNoGlobMatch(p, 'some.js/test');
        p = '{node_modules,testing}';
        assertGlobMatch(p, 'node_modules');
        assertGlobMatch(p, 'testing');
        assertNoGlobMatch(p, 'node_module');
        assertNoGlobMatch(p, 'dtesting');
        p = '**/{foo,bar}';
        assertGlobMatch(p, 'foo');
        assertGlobMatch(p, 'bar');
        assertGlobMatch(p, 'test/foo');
        assertGlobMatch(p, 'test/bar');
        assertGlobMatch(p, 'other/more/foo');
        assertGlobMatch(p, 'other/more/bar');
        assertGlobMatch(p, '/foo');
        assertGlobMatch(p, '/bar');
        assertGlobMatch(p, '/test/foo');
        assertGlobMatch(p, '/test/bar');
        assertGlobMatch(p, '/other/more/foo');
        assertGlobMatch(p, '/other/more/bar');
        p = '{foo,bar}/**';
        assertGlobMatch(p, 'foo');
        assertGlobMatch(p, 'bar');
        assertGlobMatch(p, 'bar/');
        assertGlobMatch(p, 'foo/test');
        assertGlobMatch(p, 'bar/test');
        assertGlobMatch(p, 'bar/test/');
        assertGlobMatch(p, 'foo/other/more');
        assertGlobMatch(p, 'bar/other/more');
        assertGlobMatch(p, 'bar/other/more/');
        p = '{**/*.d.ts,**/*.js}';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        assertGlobMatch(p, 'foo.d.ts');
        assertGlobMatch(p, 'testing/foo.d.ts');
        assertGlobMatch(p, 'testing\\foo.d.ts');
        assertGlobMatch(p, '/testing/foo.d.ts');
        assertGlobMatch(p, '\\testing\\foo.d.ts');
        assertGlobMatch(p, 'C:\\testing\\foo.d.ts');
        assertNoGlobMatch(p, 'foo.d');
        assertNoGlobMatch(p, 'testing/foo.d');
        assertNoGlobMatch(p, 'testing\\foo.d');
        assertNoGlobMatch(p, '/testing/foo.d');
        assertNoGlobMatch(p, '\\testing\\foo.d');
        assertNoGlobMatch(p, 'C:\\testing\\foo.d');
        p = '{**/*.d.ts,**/*.js,path/simple.jgs}';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, 'path/simple.jgs');
        assertNoGlobMatch(p, '/path/simple.jgs');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        p = '{**/*.d.ts,**/*.js,foo.[0-9]}';
        assertGlobMatch(p, 'foo.5');
        assertGlobMatch(p, 'foo.8');
        assertNoGlobMatch(p, 'bar.5');
        assertNoGlobMatch(p, 'foo.f');
        assertGlobMatch(p, 'foo.js');
        p = 'prefix/{**/*.d.ts,**/*.js,foo.[0-9]}';
        assertGlobMatch(p, 'prefix/foo.5');
        assertGlobMatch(p, 'prefix/foo.8');
        assertNoGlobMatch(p, 'prefix/bar.5');
        assertNoGlobMatch(p, 'prefix/foo.f');
        assertGlobMatch(p, 'prefix/foo.js');
    });
    test('expression support (single)', function () {
        const siblings = ['test.html', 'test.txt', 'test.ts', 'test.js'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        // { "**/*.js": { "when": "$(basename).ts" } }
        let expression = {
            '**/*.js': {
                when: '$(basename).ts',
            },
        };
        assert.strictEqual('**/*.js', glob.match(expression, 'test.js', hasSibling));
        assert.strictEqual(glob.match(expression, 'test.js', () => false), null);
        assert.strictEqual(glob.match(expression, 'test.js', (name) => name === 'te.ts'), null);
        assert.strictEqual(glob.match(expression, 'test.js'), null);
        expression = {
            '**/*.js': {
                when: '',
            },
        };
        assert.strictEqual(glob.match(expression, 'test.js', hasSibling), null);
        expression = {
            '**/*.js': {},
        };
        assert.strictEqual('**/*.js', glob.match(expression, 'test.js', hasSibling));
        expression = {};
        assert.strictEqual(glob.match(expression, 'test.js', hasSibling), null);
    });
    test('expression support (multiple)', function () {
        const siblings = ['test.html', 'test.txt', 'test.ts', 'test.js'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        // { "**/*.js": { "when": "$(basename).ts" } }
        const expression = {
            '**/*.js': { when: '$(basename).ts' },
            '**/*.as': true,
            '**/*.foo': false,
            '**/*.bananas': { bananas: true },
        };
        assert.strictEqual('**/*.js', glob.match(expression, 'test.js', hasSibling));
        assert.strictEqual('**/*.as', glob.match(expression, 'test.as', hasSibling));
        assert.strictEqual('**/*.bananas', glob.match(expression, 'test.bananas', hasSibling));
        assert.strictEqual('**/*.bananas', glob.match(expression, 'test.bananas'));
        assert.strictEqual(glob.match(expression, 'test.foo', hasSibling), null);
    });
    test('brackets', () => {
        let p = 'foo.[0-9]';
        assertGlobMatch(p, 'foo.5');
        assertGlobMatch(p, 'foo.8');
        assertNoGlobMatch(p, 'bar.5');
        assertNoGlobMatch(p, 'foo.f');
        p = 'foo.[^0-9]';
        assertNoGlobMatch(p, 'foo.5');
        assertNoGlobMatch(p, 'foo.8');
        assertNoGlobMatch(p, 'bar.5');
        assertGlobMatch(p, 'foo.f');
        p = 'foo.[!0-9]';
        assertNoGlobMatch(p, 'foo.5');
        assertNoGlobMatch(p, 'foo.8');
        assertNoGlobMatch(p, 'bar.5');
        assertGlobMatch(p, 'foo.f');
        p = 'foo.[0!^*?]';
        assertNoGlobMatch(p, 'foo.5');
        assertNoGlobMatch(p, 'foo.8');
        assertGlobMatch(p, 'foo.0');
        assertGlobMatch(p, 'foo.!');
        assertGlobMatch(p, 'foo.^');
        assertGlobMatch(p, 'foo.*');
        assertGlobMatch(p, 'foo.?');
        p = 'foo[/]bar';
        assertNoGlobMatch(p, 'foo/bar');
        p = 'foo.[[]';
        assertGlobMatch(p, 'foo.[');
        p = 'foo.[]]';
        assertGlobMatch(p, 'foo.]');
        p = 'foo.[][!]';
        assertGlobMatch(p, 'foo.]');
        assertGlobMatch(p, 'foo.[');
        assertGlobMatch(p, 'foo.!');
        p = 'foo.[]-]';
        assertGlobMatch(p, 'foo.]');
        assertGlobMatch(p, 'foo.-');
    });
    test('full path', function () {
        assertGlobMatch('testing/this/foo.txt', 'testing/this/foo.txt');
    });
    test('ending path', function () {
        assertGlobMatch('**/testing/this/foo.txt', 'some/path/testing/this/foo.txt');
    });
    test('prefix agnostic', function () {
        let p = '**/*.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, '/foo.js');
        assertGlobMatch(p, '\\foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        assertNoGlobMatch(p, 'foo.ts');
        assertNoGlobMatch(p, 'testing/foo.ts');
        assertNoGlobMatch(p, 'testing\\foo.ts');
        assertNoGlobMatch(p, '/testing/foo.ts');
        assertNoGlobMatch(p, '\\testing\\foo.ts');
        assertNoGlobMatch(p, 'C:\\testing\\foo.ts');
        assertNoGlobMatch(p, 'foo.js.txt');
        assertNoGlobMatch(p, 'testing/foo.js.txt');
        assertNoGlobMatch(p, 'testing\\foo.js.txt');
        assertNoGlobMatch(p, '/testing/foo.js.txt');
        assertNoGlobMatch(p, '\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'C:\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'testing.js/foo');
        assertNoGlobMatch(p, 'testing.js\\foo');
        assertNoGlobMatch(p, '/testing.js/foo');
        assertNoGlobMatch(p, '\\testing.js\\foo');
        assertNoGlobMatch(p, 'C:\\testing.js\\foo');
        p = '**/foo.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, '/foo.js');
        assertGlobMatch(p, '\\foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
    });
    test('cached properly', function () {
        const p = '**/*.js';
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        assertNoGlobMatch(p, 'foo.ts');
        assertNoGlobMatch(p, 'testing/foo.ts');
        assertNoGlobMatch(p, 'testing\\foo.ts');
        assertNoGlobMatch(p, '/testing/foo.ts');
        assertNoGlobMatch(p, '\\testing\\foo.ts');
        assertNoGlobMatch(p, 'C:\\testing\\foo.ts');
        assertNoGlobMatch(p, 'foo.js.txt');
        assertNoGlobMatch(p, 'testing/foo.js.txt');
        assertNoGlobMatch(p, 'testing\\foo.js.txt');
        assertNoGlobMatch(p, '/testing/foo.js.txt');
        assertNoGlobMatch(p, '\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'C:\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'testing.js/foo');
        assertNoGlobMatch(p, 'testing.js\\foo');
        assertNoGlobMatch(p, '/testing.js/foo');
        assertNoGlobMatch(p, '\\testing.js\\foo');
        assertNoGlobMatch(p, 'C:\\testing.js\\foo');
        // Run again and make sure the regex are properly reused
        assertGlobMatch(p, 'foo.js');
        assertGlobMatch(p, 'testing/foo.js');
        assertGlobMatch(p, 'testing\\foo.js');
        assertGlobMatch(p, '/testing/foo.js');
        assertGlobMatch(p, '\\testing\\foo.js');
        assertGlobMatch(p, 'C:\\testing\\foo.js');
        assertNoGlobMatch(p, 'foo.ts');
        assertNoGlobMatch(p, 'testing/foo.ts');
        assertNoGlobMatch(p, 'testing\\foo.ts');
        assertNoGlobMatch(p, '/testing/foo.ts');
        assertNoGlobMatch(p, '\\testing\\foo.ts');
        assertNoGlobMatch(p, 'C:\\testing\\foo.ts');
        assertNoGlobMatch(p, 'foo.js.txt');
        assertNoGlobMatch(p, 'testing/foo.js.txt');
        assertNoGlobMatch(p, 'testing\\foo.js.txt');
        assertNoGlobMatch(p, '/testing/foo.js.txt');
        assertNoGlobMatch(p, '\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'C:\\testing\\foo.js.txt');
        assertNoGlobMatch(p, 'testing.js/foo');
        assertNoGlobMatch(p, 'testing.js\\foo');
        assertNoGlobMatch(p, '/testing.js/foo');
        assertNoGlobMatch(p, '\\testing.js\\foo');
        assertNoGlobMatch(p, 'C:\\testing.js\\foo');
    });
    test('invalid glob', function () {
        const p = '**/*(.js';
        assertNoGlobMatch(p, 'foo.js');
    });
    test('split glob aware', function () {
        assert.deepStrictEqual(glob.splitGlobAware('foo,bar', ','), ['foo', 'bar']);
        assert.deepStrictEqual(glob.splitGlobAware('foo', ','), ['foo']);
        assert.deepStrictEqual(glob.splitGlobAware('{foo,bar}', ','), ['{foo,bar}']);
        assert.deepStrictEqual(glob.splitGlobAware('foo,bar,{foo,bar}', ','), [
            'foo',
            'bar',
            '{foo,bar}',
        ]);
        assert.deepStrictEqual(glob.splitGlobAware('{foo,bar},foo,bar,{foo,bar}', ','), [
            '{foo,bar}',
            'foo',
            'bar',
            '{foo,bar}',
        ]);
        assert.deepStrictEqual(glob.splitGlobAware('[foo,bar]', ','), ['[foo,bar]']);
        assert.deepStrictEqual(glob.splitGlobAware('foo,bar,[foo,bar]', ','), [
            'foo',
            'bar',
            '[foo,bar]',
        ]);
        assert.deepStrictEqual(glob.splitGlobAware('[foo,bar],foo,bar,[foo,bar]', ','), [
            '[foo,bar]',
            'foo',
            'bar',
            '[foo,bar]',
        ]);
    });
    test('expression with disabled glob', function () {
        const expr = { '**/*.js': false };
        assert.strictEqual(glob.match(expr, 'foo.js'), null);
    });
    test('expression with two non-trivia globs', function () {
        const expr = {
            '**/*.j?': true,
            '**/*.t?': true,
        };
        assert.strictEqual(glob.match(expr, 'foo.js'), '**/*.j?');
        assert.strictEqual(glob.match(expr, 'foo.as'), null);
    });
    test('expression with non-trivia glob (issue 144458)', function () {
        const pattern = '**/p*';
        assert.strictEqual(glob.match(pattern, 'foo/barp'), false);
        assert.strictEqual(glob.match(pattern, 'foo/bar/ap'), false);
        assert.strictEqual(glob.match(pattern, 'ap'), false);
        assert.strictEqual(glob.match(pattern, 'foo/barp1'), false);
        assert.strictEqual(glob.match(pattern, 'foo/bar/ap1'), false);
        assert.strictEqual(glob.match(pattern, 'ap1'), false);
        assert.strictEqual(glob.match(pattern, '/foo/barp'), false);
        assert.strictEqual(glob.match(pattern, '/foo/bar/ap'), false);
        assert.strictEqual(glob.match(pattern, '/ap'), false);
        assert.strictEqual(glob.match(pattern, '/foo/barp1'), false);
        assert.strictEqual(glob.match(pattern, '/foo/bar/ap1'), false);
        assert.strictEqual(glob.match(pattern, '/ap1'), false);
        assert.strictEqual(glob.match(pattern, 'foo/pbar'), true);
        assert.strictEqual(glob.match(pattern, '/foo/pbar'), true);
        assert.strictEqual(glob.match(pattern, 'foo/bar/pa'), true);
        assert.strictEqual(glob.match(pattern, '/p'), true);
    });
    test('expression with empty glob', function () {
        const expr = { '': true };
        assert.strictEqual(glob.match(expr, 'foo.js'), null);
    });
    test('expression with other falsy value', function () {
        const expr = { '**/*.js': 0 };
        assert.strictEqual(glob.match(expr, 'foo.js'), '**/*.js');
    });
    test('expression with two basename globs', function () {
        const expr = {
            '**/bar': true,
            '**/baz': true,
        };
        assert.strictEqual(glob.match(expr, 'bar'), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo'), null);
        assert.strictEqual(glob.match(expr, 'foo/bar'), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo\\bar'), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo/foo'), null);
    });
    test('expression with two basename globs and a siblings expression', function () {
        const expr = {
            '**/bar': true,
            '**/baz': true,
            '**/*.js': { when: '$(basename).ts' },
        };
        const siblings = ['foo.ts', 'foo.js', 'foo', 'bar'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        assert.strictEqual(glob.match(expr, 'bar', hasSibling), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo', hasSibling), null);
        assert.strictEqual(glob.match(expr, 'foo/bar', hasSibling), '**/bar');
        if (isWindows) {
            // backslash is a valid file name character on posix
            assert.strictEqual(glob.match(expr, 'foo\\bar', hasSibling), '**/bar');
        }
        assert.strictEqual(glob.match(expr, 'foo/foo', hasSibling), null);
        assert.strictEqual(glob.match(expr, 'foo.js', hasSibling), '**/*.js');
        assert.strictEqual(glob.match(expr, 'bar.js', hasSibling), null);
    });
    test('expression with multipe basename globs', function () {
        const expr = {
            '**/bar': true,
            '{**/baz,**/foo}': true,
        };
        assert.strictEqual(glob.match(expr, 'bar'), '**/bar');
        assert.strictEqual(glob.match(expr, 'foo'), '{**/baz,**/foo}');
        assert.strictEqual(glob.match(expr, 'baz'), '{**/baz,**/foo}');
        assert.strictEqual(glob.match(expr, 'abc'), null);
    });
    test('falsy expression/pattern', function () {
        assert.strictEqual(glob.match(null, 'foo'), false);
        assert.strictEqual(glob.match('', 'foo'), false);
        assert.strictEqual(glob.parse(null)('foo'), false);
        assert.strictEqual(glob.parse('')('foo'), false);
    });
    test('falsy path', function () {
        assert.strictEqual(glob.parse('foo')(null), false);
        assert.strictEqual(glob.parse('foo')(''), false);
        assert.strictEqual(glob.parse('**/*.j?')(null), false);
        assert.strictEqual(glob.parse('**/*.j?')(''), false);
        assert.strictEqual(glob.parse('**/*.foo')(null), false);
        assert.strictEqual(glob.parse('**/*.foo')(''), false);
        assert.strictEqual(glob.parse('**/foo')(null), false);
        assert.strictEqual(glob.parse('**/foo')(''), false);
        assert.strictEqual(glob.parse('{**/baz,**/foo}')(null), false);
        assert.strictEqual(glob.parse('{**/baz,**/foo}')(''), false);
        assert.strictEqual(glob.parse('{**/*.baz,**/*.foo}')(null), false);
        assert.strictEqual(glob.parse('{**/*.baz,**/*.foo}')(''), false);
    });
    test('expression/pattern basename', function () {
        assert.strictEqual(glob.parse('**/foo')('bar/baz', 'baz'), false);
        assert.strictEqual(glob.parse('**/foo')('bar/foo', 'foo'), true);
        assert.strictEqual(glob.parse('{**/baz,**/foo}')('baz/bar', 'bar'), false);
        assert.strictEqual(glob.parse('{**/baz,**/foo}')('baz/foo', 'foo'), true);
        const expr = { '**/*.js': { when: '$(basename).ts' } };
        const siblings = ['foo.ts', 'foo.js'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        assert.strictEqual(glob.parse(expr)('bar/baz.js', 'baz.js', hasSibling), null);
        assert.strictEqual(glob.parse(expr)('bar/foo.js', 'foo.js', hasSibling), '**/*.js');
    });
    test('expression/pattern basename terms', function () {
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/*.foo')), []);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/foo')), ['foo']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/foo/')), ['foo']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('{**/baz,**/foo}')), ['baz', 'foo']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('{**/baz/,**/foo/}')), ['baz', 'foo']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse({
            '**/foo': true,
            '{**/bar,**/baz}': true,
            '{**/bar2/,**/baz2/}': true,
            '**/bulb': false,
        })), ['foo', 'bar', 'baz', 'bar2', 'baz2']);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse({
            '**/foo': { when: '$(basename).zip' },
            '**/bar': true,
        })), ['bar']);
    });
    test('expression/pattern optimization for basenames', function () {
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/foo/**')), []);
        assert.deepStrictEqual(glob.getBasenameTerms(glob.parse('**/foo/**', { trimForExclusions: true })), ['foo']);
        testOptimizationForBasenames('**/*.foo/**', [], [['baz/bar.foo/bar/baz', true]]);
        testOptimizationForBasenames('**/foo/**', ['foo'], [
            ['bar/foo', true],
            ['bar/foo/baz', false],
        ]);
        testOptimizationForBasenames('{**/baz/**,**/foo/**}', ['baz', 'foo'], [
            ['bar/baz', true],
            ['bar/foo', true],
        ]);
        testOptimizationForBasenames({
            '**/foo/**': true,
            '{**/bar/**,**/baz/**}': true,
            '**/bulb/**': false,
        }, ['foo', 'bar', 'baz'], [
            ['bar/foo', '**/foo/**'],
            ['foo/bar', '{**/bar/**,**/baz/**}'],
            ['bar/nope', null],
        ]);
        const siblings = ['baz', 'baz.zip', 'nope'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        testOptimizationForBasenames({
            '**/foo/**': { when: '$(basename).zip' },
            '**/bar/**': true,
        }, ['bar'], [
            ['bar/foo', null],
            ['bar/foo/baz', null],
            ['bar/foo/nope', null],
            ['foo/bar', '**/bar/**'],
        ], [null, hasSibling, hasSibling]);
    });
    function testOptimizationForBasenames(pattern, basenameTerms, matches, siblingsFns = []) {
        const parsed = glob.parse(pattern, { trimForExclusions: true });
        assert.deepStrictEqual(glob.getBasenameTerms(parsed), basenameTerms);
        matches.forEach(([text, result], i) => {
            assert.strictEqual(parsed(text, null, siblingsFns[i]), result);
        });
    }
    test('trailing slash', function () {
        // Testing existing (more or less intuitive) behavior
        assert.strictEqual(glob.parse('**/foo/')('bar/baz', 'baz'), false);
        assert.strictEqual(glob.parse('**/foo/')('bar/foo', 'foo'), true);
        assert.strictEqual(glob.parse('**/*.foo/')('bar/file.baz', 'file.baz'), false);
        assert.strictEqual(glob.parse('**/*.foo/')('bar/file.foo', 'file.foo'), true);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}')('bar/baz', 'baz'), false);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}')('bar/foo', 'foo'), true);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}')('bar/abc', 'abc'), true);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}', { trimForExclusions: true })('bar/baz', 'baz'), false);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}', { trimForExclusions: true })('bar/foo', 'foo'), true);
        assert.strictEqual(glob.parse('{**/foo/,**/abc/}', { trimForExclusions: true })('bar/abc', 'abc'), true);
    });
    test('expression/pattern path', function () {
        assert.strictEqual(glob.parse('**/foo/bar')(nativeSep('foo/baz'), 'baz'), false);
        assert.strictEqual(glob.parse('**/foo/bar')(nativeSep('foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('**/foo/bar')(nativeSep('bar/foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('**/foo/bar/**')(nativeSep('bar/foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('**/foo/bar/**')(nativeSep('bar/foo/bar/baz'), 'baz'), true);
        assert.strictEqual(glob.parse('**/foo/bar/**', { trimForExclusions: true })(nativeSep('bar/foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('**/foo/bar/**', { trimForExclusions: true })(nativeSep('bar/foo/bar/baz'), 'baz'), false);
        assert.strictEqual(glob.parse('foo/bar')(nativeSep('foo/baz'), 'baz'), false);
        assert.strictEqual(glob.parse('foo/bar')(nativeSep('foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('foo/bar/baz')(nativeSep('foo/bar/baz'), 'baz'), true); // #15424
        assert.strictEqual(glob.parse('foo/bar')(nativeSep('bar/foo/bar'), 'bar'), false);
        assert.strictEqual(glob.parse('foo/bar/**')(nativeSep('foo/bar/baz'), 'baz'), true);
        assert.strictEqual(glob.parse('foo/bar/**', { trimForExclusions: true })(nativeSep('foo/bar'), 'bar'), true);
        assert.strictEqual(glob.parse('foo/bar/**', { trimForExclusions: true })(nativeSep('foo/bar/baz'), 'baz'), false);
    });
    test('expression/pattern paths', function () {
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/*.foo')), []);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo')), []);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo/bar')), ['*/foo/bar']);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo/bar/')), ['*/foo/bar']);
        // Not supported
        // assert.deepStrictEqual(glob.getPathTerms(glob.parse('{**/baz/bar,**/foo/bar,**/bar}')), ['*/baz/bar', '*/foo/bar']);
        // assert.deepStrictEqual(glob.getPathTerms(glob.parse('{**/baz/bar/,**/foo/bar/,**/bar/}')), ['*/baz/bar', '*/foo/bar']);
        const parsed = glob.parse({
            '**/foo/bar': true,
            '**/foo2/bar2': true,
            // Not supported
            // '{**/bar/foo,**/baz/foo}': true,
            // '{**/bar2/foo/,**/baz2/foo/}': true,
            '**/bulb': true,
            '**/bulb2': true,
            '**/bulb/foo': false,
        });
        assert.deepStrictEqual(glob.getPathTerms(parsed), ['*/foo/bar', '*/foo2/bar2']);
        assert.deepStrictEqual(glob.getBasenameTerms(parsed), ['bulb', 'bulb2']);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse({
            '**/foo/bar': { when: '$(basename).zip' },
            '**/bar/foo': true,
            '**/bar2/foo2': true,
        })), ['*/bar/foo', '*/bar2/foo2']);
    });
    test('expression/pattern optimization for paths', function () {
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo/bar/**')), []);
        assert.deepStrictEqual(glob.getPathTerms(glob.parse('**/foo/bar/**', { trimForExclusions: true })), ['*/foo/bar']);
        testOptimizationForPaths('**/*.foo/bar/**', [], [[nativeSep('baz/bar.foo/bar/baz'), true]]);
        testOptimizationForPaths('**/foo/bar/**', ['*/foo/bar'], [
            [nativeSep('bar/foo/bar'), true],
            [nativeSep('bar/foo/bar/baz'), false],
        ]);
        // Not supported
        // testOptimizationForPaths('{**/baz/bar/**,**/foo/bar/**}', ['*/baz/bar', '*/foo/bar'], [[nativeSep('bar/baz/bar'), true], [nativeSep('bar/foo/bar'), true]]);
        testOptimizationForPaths({
            '**/foo/bar/**': true,
            // Not supported
            // '{**/bar/bar/**,**/baz/bar/**}': true,
            '**/bulb/bar/**': false,
        }, ['*/foo/bar'], [
            [nativeSep('bar/foo/bar'), '**/foo/bar/**'],
            // Not supported
            // [nativeSep('foo/bar/bar'), '{**/bar/bar/**,**/baz/bar/**}'],
            [nativeSep('/foo/bar/nope'), null],
        ]);
        const siblings = ['baz', 'baz.zip', 'nope'];
        const hasSibling = (name) => siblings.indexOf(name) !== -1;
        testOptimizationForPaths({
            '**/foo/123/**': { when: '$(basename).zip' },
            '**/bar/123/**': true,
        }, ['*/bar/123'], [
            [nativeSep('bar/foo/123'), null],
            [nativeSep('bar/foo/123/baz'), null],
            [nativeSep('bar/foo/123/nope'), null],
            [nativeSep('foo/bar/123'), '**/bar/123/**'],
        ], [null, hasSibling, hasSibling]);
    });
    function testOptimizationForPaths(pattern, pathTerms, matches, siblingsFns = []) {
        const parsed = glob.parse(pattern, { trimForExclusions: true });
        assert.deepStrictEqual(glob.getPathTerms(parsed), pathTerms);
        matches.forEach(([text, result], i) => {
            assert.strictEqual(parsed(text, null, siblingsFns[i]), result);
        });
    }
    function nativeSep(slashPath) {
        return slashPath.replace(/\//g, sep);
    }
    test('relative pattern - glob star', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: '**/*.cs' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\bar\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.ts');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\Program.cs');
            assertNoGlobMatch(p, 'C:\\other\\DNXConsoleApp\\foo\\Program.ts');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo', pattern: '**/*.cs' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
            assertGlobMatch(p, '/DNXConsoleApp/foo/bar/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.ts');
            assertNoGlobMatch(p, '/DNXConsoleApp/Program.cs');
            assertNoGlobMatch(p, '/other/DNXConsoleApp/foo/Program.ts');
        }
    });
    test('relative pattern - single star', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: '*.cs' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\bar\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.ts');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\Program.cs');
            assertNoGlobMatch(p, 'C:\\other\\DNXConsoleApp\\foo\\Program.ts');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo', pattern: '*.cs' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/bar/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.ts');
            assertNoGlobMatch(p, '/DNXConsoleApp/Program.cs');
            assertNoGlobMatch(p, '/other/DNXConsoleApp/foo/Program.ts');
        }
    });
    test('relative pattern - single star with path', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: 'something/*.cs' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\something\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo', pattern: 'something/*.cs' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/something/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
        }
    });
    test('relative pattern - single star alone', function () {
        if (isWindows) {
            const p = {
                base: 'C:\\DNXConsoleApp\\foo\\something\\Program.cs',
                pattern: '*',
            };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\something\\Program.cs');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
        }
        else {
            const p = {
                base: '/DNXConsoleApp/foo/something/Program.cs',
                pattern: '*',
            };
            assertGlobMatch(p, '/DNXConsoleApp/foo/something/Program.cs');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
        }
    });
    test('relative pattern - ignores case on macOS/Windows', function () {
        if (isWindows) {
            const p = { base: 'C:\\DNXConsoleApp\\foo', pattern: 'something/*.cs' };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\something\\Program.cs'.toLowerCase());
        }
        else if (isMacintosh) {
            const p = { base: '/DNXConsoleApp/foo', pattern: 'something/*.cs' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/something/Program.cs'.toLowerCase());
        }
        else if (isLinux) {
            const p = { base: '/DNXConsoleApp/foo', pattern: 'something/*.cs' };
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/something/Program.cs'.toLowerCase());
        }
    });
    test('relative pattern - trailing slash / backslash (#162498)', function () {
        if (isWindows) {
            let p = { base: 'C:\\', pattern: 'foo.cs' };
            assertGlobMatch(p, 'C:\\foo.cs');
            p = { base: 'C:\\bar\\', pattern: 'foo.cs' };
            assertGlobMatch(p, 'C:\\bar\\foo.cs');
        }
        else {
            let p = { base: '/', pattern: 'foo.cs' };
            assertGlobMatch(p, '/foo.cs');
            p = { base: '/bar/', pattern: 'foo.cs' };
            assertGlobMatch(p, '/bar/foo.cs');
        }
    });
    test('pattern with "base" does not explode - #36081', function () {
        assert.ok(glob.match({ base: true }, 'base'));
    });
    test('relative pattern - #57475', function () {
        if (isWindows) {
            const p = {
                base: 'C:\\DNXConsoleApp\\foo',
                pattern: 'styles/style.css',
            };
            assertGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\styles\\style.css');
            assertNoGlobMatch(p, 'C:\\DNXConsoleApp\\foo\\Program.cs');
        }
        else {
            const p = { base: '/DNXConsoleApp/foo', pattern: 'styles/style.css' };
            assertGlobMatch(p, '/DNXConsoleApp/foo/styles/style.css');
            assertNoGlobMatch(p, '/DNXConsoleApp/foo/Program.cs');
        }
    });
    test('URI match', () => {
        const p = 'scheme:/**/*.md';
        assertGlobMatch(p, URI.file('super/duper/long/some/file.md').with({ scheme: 'scheme' }).toString());
    });
    test('expression fails when siblings use promises (https://github.com/microsoft/vscode/issues/146294)', async function () {
        const siblings = ['test.html', 'test.txt', 'test.ts'];
        const hasSibling = (name) => Promise.resolve(siblings.indexOf(name) !== -1);
        // { "**/*.js": { "when": "$(basename).ts" } }
        const expression = {
            '**/test.js': { when: '$(basename).js' },
            '**/*.js': { when: '$(basename).ts' },
        };
        const parsedExpression = glob.parse(expression);
        assert.strictEqual('**/*.js', await parsedExpression('test.js', undefined, hasSibling));
    });
    test('patternsEquals', () => {
        assert.ok(glob.patternsEquals(['a'], ['a']));
        assert.ok(!glob.patternsEquals(['a'], ['b']));
        assert.ok(glob.patternsEquals(['a', 'b', 'c'], ['a', 'b', 'c']));
        assert.ok(!glob.patternsEquals(['1', '2'], ['1', '3']));
        assert.ok(glob.patternsEquals([{ base: 'a', pattern: '*' }, 'b', 'c'], [{ base: 'a', pattern: '*' }, 'b', 'c']));
        assert.ok(glob.patternsEquals(undefined, undefined));
        assert.ok(!glob.patternsEquals(undefined, ['b']));
        assert.ok(!glob.patternsEquals(['a'], undefined));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2dsb2IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLElBQUksTUFBTSxzQkFBc0IsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUNsQix1QkFBdUI7SUFFdkIsb0JBQW9CO0lBQ3BCLGdEQUFnRDtJQUNoRCxzQ0FBc0M7SUFDdEMsc0VBQXNFO0lBQ3RFLGVBQWU7SUFDZiwwQkFBMEI7SUFDMUIsZ0NBQWdDO0lBQ2hDLG9EQUFvRDtJQUNwRCxxREFBcUQ7SUFDckQsMEJBQTBCO0lBQzFCLGtCQUFrQjtJQUNsQixrQkFBa0I7SUFDbEIsa0JBQWtCO0lBQ2xCLGtCQUFrQjtJQUNsQixpQkFBaUI7SUFDakIsaUJBQWlCO0lBQ2pCLGlCQUFpQjtJQUNqQiw0QkFBNEI7SUFDNUIsaUNBQWlDO0lBQ2pDLGlCQUFpQjtJQUNqQixpQkFBaUI7SUFDakIsZ0JBQWdCO0lBQ2hCLE1BQU07SUFFTixpQkFBaUI7SUFDakIsaUNBQWlDO0lBQ2pDLDBDQUEwQztJQUMxQyxrQkFBa0I7SUFDbEIscUJBQXFCO0lBQ3JCLHlCQUF5QjtJQUN6QixtQkFBbUI7SUFDbkIsK0JBQStCO0lBQy9CLE1B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QUksRUFBRSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNyRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRTtRQUN0RCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFFdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFckQsTUFB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QUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLElBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxX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