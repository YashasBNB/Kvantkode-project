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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9nbG9iLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxJQUFJLE1BQU0sc0JBQXNCLENBQUE7QUFDNUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7SUFDbEIsdUJBQXVCO0lBRXZCLG9CQUFvQjtJQUNwQixnREFBZ0Q7SUFDaEQsc0NBQXNDO0lBQ3RDLHNFQUFzRTtJQUN0RSxlQUFlO0lBQ2YsMEJBQTBCO0lBQzFCLGdDQUFnQztJQUNoQyxvREFBb0Q7SUFDcEQscURBQXFEO0lBQ3JELDBCQUEwQjtJQUMxQixrQkFBa0I7SUFDbEIsa0JBQWtCO0lBQ2xCLGtCQUFrQjtJQUNsQixrQkFBa0I7SUFDbEIsaUJBQWlCO0lBQ2pCLGlCQUFpQjtJQUNqQixpQkFBaUI7SUFDakIsNEJBQTRCO0lBQzVCLGlDQUFpQztJQUNqQyxpQkFBaUI7SUFDakIsaUJBQWlCO0lBQ2pCLGdCQUFnQjtJQUNoQixNQUFNO0lBRU4saUJBQWlCO0lBQ2pCLGlDQUFpQztJQUNqQywwQ0FBMEM7SUFDMUMsa0JBQWtCO0lBQ2xCLHFCQUFxQjtJQUNyQix5QkFBeUI7SUFDekIsbUJBQW1CO0lBQ25CLCtCQUErQjtJQUMvQixNQUFNO0lB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QUUsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0RBQWdELEVBQUU7UUFDdEQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBRXZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXBELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXJELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXJELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXRELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDcEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUU7UUFDbEMsTUFBTSxJQUFJLEdBQUcsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFFekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNyRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRTtRQUN6QyxNQUFNLElBQUksR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQVMsQ0FBQTtRQUVwQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9DQUFvQyxFQUFFO1FBQzFDLE1BQU0sSUFBSSxHQUFHO1lBQ1osUUFBUSxFQUFFLElBQUk7WUFDZCxRQUFRLEVBQUUsSUFBSTtTQUNkLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDdEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOERBQThELEVBQUU7UUFDcEUsTUFBTSxJQUFJLEdBQUc7WUFDWixRQUFRLEVBQUUsSUFBSTtZQUNkLFFBQVEsRUFBRSxJQUFJO1lBQ2QsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1NBQ3JDLENBQUE7UUFFRCxNQUFNLFFBQVEsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBRWxFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3JFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixvREFBb0Q7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2pFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFO1FBQzlDLE1BQU0sSUFBSSxHQUFHO1lBQ1osUUFBUSxFQUFFLElBQUk7WUFDZCxpQkFBaUIsRUFBRSxJQUFJO1NBQ3ZCLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNsRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNqRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxJQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsV0FBVyxD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