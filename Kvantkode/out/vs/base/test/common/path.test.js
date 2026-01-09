/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// NOTE: VSCode's copy of nodejs path library to be usable in common (non-node) namespace
// Copied from: https://github.com/nodejs/node/tree/43dd49c9782848c25e5b03448c8a0f923f13c158
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
import assert from 'assert';
import * as path from '../../common/path.js';
import { isWeb, isWindows } from '../../common/platform.js';
import * as process from '../../common/process.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Paths (Node Implementation)', () => {
    const __filename = 'path.test.js';
    ensureNoDisposablesAreLeakedInTestSuite();
    test('join', () => {
        const failures = [];
        const backslashRE = /\\/g;
        const joinTests = [
            [
                [path.posix.join, path.win32.join],
                // arguments                     result
                [
                    [['.', 'x/b', '..', '/b/c.js'], 'x/b/c.js'],
                    [[], '.'],
                    [['/.', 'x/b', '..', '/b/c.js'], '/x/b/c.js'],
                    [['/foo', '../../../bar'], '/bar'],
                    [['foo', '../../../bar'], '../../bar'],
                    [['foo/', '../../../bar'], '../../bar'],
                    [['foo/x', '../../../bar'], '../bar'],
                    [['foo/x', './bar'], 'foo/x/bar'],
                    [['foo/x/', './bar'], 'foo/x/bar'],
                    [['foo/x/', '.', 'bar'], 'foo/x/bar'],
                    [['./'], './'],
                    [['.', './'], './'],
                    [['.', '.', '.'], '.'],
                    [['.', './', '.'], '.'],
                    [['.', '/./', '.'], '.'],
                    [['.', '/////./', '.'], '.'],
                    [['.'], '.'],
                    [['', '.'], '.'],
                    [['', 'foo'], 'foo'],
                    [['foo', '/bar'], 'foo/bar'],
                    [['', '/foo'], '/foo'],
                    [['', '', '/foo'], '/foo'],
                    [['', '', 'foo'], 'foo'],
                    [['foo', ''], 'foo'],
                    [['foo/', ''], 'foo/'],
                    [['foo', '', '/bar'], 'foo/bar'],
                    [['./', '..', '/foo'], '../foo'],
                    [['./', '..', '..', '/foo'], '../../foo'],
                    [['.', '..', '..', '/foo'], '../../foo'],
                    [['', '..', '..', '/foo'], '../../foo'],
                    [['/'], '/'],
                    [['/', '.'], '/'],
                    [['/', '..'], '/'],
                    [['/', '..', '..'], '/'],
                    [[''], '.'],
                    [['', ''], '.'],
                    [[' /foo'], ' /foo'],
                    [[' ', 'foo'], ' /foo'],
                    [[' ', '.'], ' '],
                    [[' ', '/'], ' /'],
                    [[' ', ''], ' '],
                    [['/', 'foo'], '/foo'],
                    [['/', '/foo'], '/foo'],
                    [['/', '//foo'], '/foo'],
                    [['/', '', '/foo'], '/foo'],
                    [['', '/', 'foo'], '/foo'],
                    [['', '/', '/foo'], '/foo'],
                ],
            ],
        ];
        // Windows-specific join tests
        joinTests.push([
            path.win32.join,
            joinTests[0][1].slice(0).concat([
                // arguments                     result
                // UNC path expected
                [['//foo/bar'], '\\\\foo\\bar\\'],
                [['\\/foo/bar'], '\\\\foo\\bar\\'],
                [['\\\\foo/bar'], '\\\\foo\\bar\\'],
                // UNC path expected - server and share separate
                [['//foo', 'bar'], '\\\\foo\\bar\\'],
                [['//foo/', 'bar'], '\\\\foo\\bar\\'],
                [['//foo', '/bar'], '\\\\foo\\bar\\'],
                // UNC path expected - questionable
                [['//foo', '', 'bar'], '\\\\foo\\bar\\'],
                [['//foo/', '', 'bar'], '\\\\foo\\bar\\'],
                [['//foo/', '', '/bar'], '\\\\foo\\bar\\'],
                // UNC path expected - even more questionable
                [['', '//foo', 'bar'], '\\\\foo\\bar\\'],
                [['', '//foo/', 'bar'], '\\\\foo\\bar\\'],
                [['', '//foo/', '/bar'], '\\\\foo\\bar\\'],
                // No UNC path expected (no double slash in first component)
                [['\\', 'foo/bar'], '\\foo\\bar'],
                [['\\', '/foo/bar'], '\\foo\\bar'],
                [['', '/', '/foo/bar'], '\\foo\\bar'],
                // No UNC path expected (no non-slashes in first component -
                // questionable)
                [['//', 'foo/bar'], '\\foo\\bar'],
                [['//', '/foo/bar'], '\\foo\\bar'],
                [['\\\\', '/', '/foo/bar'], '\\foo\\bar'],
                [['//'], '\\'],
                // No UNC path expected (share name missing - questionable).
                [['//foo'], '\\foo'],
                [['//foo/'], '\\foo\\'],
                [['//foo', '/'], '\\foo\\'],
                [['//foo', '', '/'], '\\foo\\'],
                // No UNC path expected (too many leading slashes - questionable)
                [['///foo/bar'], '\\foo\\bar'],
                [['////foo', 'bar'], '\\foo\\bar'],
                [['\\\\\\/foo/bar'], '\\foo\\bar'],
                // Drive-relative vs drive-absolute paths. This merely describes the
                // status quo, rather than being obviously right
                [['c:'], 'c:.'],
                [['c:.'], 'c:.'],
                [['c:', ''], 'c:.'],
                [['', 'c:'], 'c:.'],
                [['c:.', '/'], 'c:.\\'],
                [['c:.', 'file'], 'c:file'],
                [['c:', '/'], 'c:\\'],
                [['c:', 'file'], 'c:\\file'],
            ]),
        ]);
        joinTests.forEach((test) => {
            if (!Array.isArray(test[0])) {
                test[0] = [test[0]];
            }
            test[0].forEach((join) => {
                test[1].forEach((test) => {
                    const actual = join.apply(null, test[0]);
                    const expected = test[1];
                    // For non-Windows specific tests with the Windows join(), we need to try
                    // replacing the slashes since the non-Windows specific tests' `expected`
                    // use forward slashes
                    let actualAlt;
                    let os;
                    if (join === path.win32.join) {
                        actualAlt = actual.replace(backslashRE, '/');
                        os = 'win32';
                    }
                    else {
                        os = 'posix';
                    }
                    const message = `path.${os}.join(${test[0].map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                    if (actual !== expected && actualAlt !== expected) {
                        failures.push(`\n${message}`);
                    }
                });
            });
        });
        assert.strictEqual(failures.length, 0, failures.join(''));
    });
    test('dirname', () => {
        assert.strictEqual(path.posix.dirname('/a/b/'), '/a');
        assert.strictEqual(path.posix.dirname('/a/b'), '/a');
        assert.strictEqual(path.posix.dirname('/a'), '/');
        assert.strictEqual(path.posix.dirname(''), '.');
        assert.strictEqual(path.posix.dirname('/'), '/');
        assert.strictEqual(path.posix.dirname('////'), '/');
        assert.strictEqual(path.posix.dirname('//a'), '//');
        assert.strictEqual(path.posix.dirname('foo'), '.');
        assert.strictEqual(path.win32.dirname('c:\\'), 'c:\\');
        assert.strictEqual(path.win32.dirname('c:\\foo'), 'c:\\');
        assert.strictEqual(path.win32.dirname('c:\\foo\\'), 'c:\\');
        assert.strictEqual(path.win32.dirname('c:\\foo\\bar'), 'c:\\foo');
        assert.strictEqual(path.win32.dirname('c:\\foo\\bar\\'), 'c:\\foo');
        assert.strictEqual(path.win32.dirname('c:\\foo\\bar\\baz'), 'c:\\foo\\bar');
        assert.strictEqual(path.win32.dirname('\\'), '\\');
        assert.strictEqual(path.win32.dirname('\\foo'), '\\');
        assert.strictEqual(path.win32.dirname('\\foo\\'), '\\');
        assert.strictEqual(path.win32.dirname('\\foo\\bar'), '\\foo');
        assert.strictEqual(path.win32.dirname('\\foo\\bar\\'), '\\foo');
        assert.strictEqual(path.win32.dirname('\\foo\\bar\\baz'), '\\foo\\bar');
        assert.strictEqual(path.win32.dirname('c:'), 'c:');
        assert.strictEqual(path.win32.dirname('c:foo'), 'c:');
        assert.strictEqual(path.win32.dirname('c:foo\\'), 'c:');
        assert.strictEqual(path.win32.dirname('c:foo\\bar'), 'c:foo');
        assert.strictEqual(path.win32.dirname('c:foo\\bar\\'), 'c:foo');
        assert.strictEqual(path.win32.dirname('c:foo\\bar\\baz'), 'c:foo\\bar');
        assert.strictEqual(path.win32.dirname('file:stream'), '.');
        assert.strictEqual(path.win32.dirname('dir\\file:stream'), 'dir');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share'), '\\\\unc\\share');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo'), '\\\\unc\\share\\');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\'), '\\\\unc\\share\\');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar'), '\\\\unc\\share\\foo');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar\\'), '\\\\unc\\share\\foo');
        assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar\\baz'), '\\\\unc\\share\\foo\\bar');
        assert.strictEqual(path.win32.dirname('/a/b/'), '/a');
        assert.strictEqual(path.win32.dirname('/a/b'), '/a');
        assert.strictEqual(path.win32.dirname('/a'), '/');
        assert.strictEqual(path.win32.dirname(''), '.');
        assert.strictEqual(path.win32.dirname('/'), '/');
        assert.strictEqual(path.win32.dirname('////'), '/');
        assert.strictEqual(path.win32.dirname('foo'), '.');
        // Tests from VSCode
        function assertDirname(p, expected, win = false) {
            const actual = win ? path.win32.dirname(p) : path.posix.dirname(p);
            if (actual !== expected) {
                assert.fail(`${p}: expected: ${expected}, ours: ${actual}`);
            }
        }
        assertDirname('foo/bar', 'foo');
        assertDirname('foo\\bar', 'foo', true);
        assertDirname('/foo/bar', '/foo');
        assertDirname('\\foo\\bar', '\\foo', true);
        assertDirname('/foo', '/');
        assertDirname('\\foo', '\\', true);
        assertDirname('/', '/');
        assertDirname('\\', '\\', true);
        assertDirname('foo', '.');
        assertDirname('f', '.');
        assertDirname('f/', '.');
        assertDirname('/folder/', '/');
        assertDirname('c:\\some\\file.txt', 'c:\\some', true);
        assertDirname('c:\\some', 'c:\\', true);
        assertDirname('c:\\', 'c:\\', true);
        assertDirname('c:', 'c:', true);
        assertDirname('\\\\server\\share\\some\\path', '\\\\server\\share\\some', true);
        assertDirname('\\\\server\\share\\some', '\\\\server\\share\\', true);
        assertDirname('\\\\server\\share\\', '\\\\server\\share\\', true);
    });
    test('extname', () => {
        const failures = [];
        const slashRE = /\//g;
        [
            [__filename, '.js'],
            ['', ''],
            ['/path/to/file', ''],
            ['/path/to/file.ext', '.ext'],
            ['/path.to/file.ext', '.ext'],
            ['/path.to/file', ''],
            ['/path.to/.file', ''],
            ['/path.to/.file.ext', '.ext'],
            ['/path/to/f.ext', '.ext'],
            ['/path/to/..ext', '.ext'],
            ['/path/to/..', ''],
            ['file', ''],
            ['file.ext', '.ext'],
            ['.file', ''],
            ['.file.ext', '.ext'],
            ['/file', ''],
            ['/file.ext', '.ext'],
            ['/.file', ''],
            ['/.file.ext', '.ext'],
            ['.path/file.ext', '.ext'],
            ['file.ext.ext', '.ext'],
            ['file.', '.'],
            ['.', ''],
            ['./', ''],
            ['.file.ext', '.ext'],
            ['.file', ''],
            ['.file.', '.'],
            ['.file..', '.'],
            ['..', ''],
            ['../', ''],
            ['..file.ext', '.ext'],
            ['..file', '.file'],
            ['..file.', '.'],
            ['..file..', '.'],
            ['...', '.'],
            ['...ext', '.ext'],
            ['....', '.'],
            ['file.ext/', '.ext'],
            ['file.ext//', '.ext'],
            ['file/', ''],
            ['file//', ''],
            ['file./', '.'],
            ['file.//', '.'],
        ].forEach((test) => {
            const expected = test[1];
            [path.posix.extname, path.win32.extname].forEach((extname) => {
                let input = test[0];
                let os;
                if (extname === path.win32.extname) {
                    input = input.replace(slashRE, '\\');
                    os = 'win32';
                }
                else {
                    os = 'posix';
                }
                const actual = extname(input);
                const message = `path.${os}.extname(${JSON.stringify(input)})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                if (actual !== expected) {
                    failures.push(`\n${message}`);
                }
            });
            {
                const input = `C:${test[0].replace(slashRE, '\\')}`;
                const actual = path.win32.extname(input);
                const message = `path.win32.extname(${JSON.stringify(input)})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                if (actual !== expected) {
                    failures.push(`\n${message}`);
                }
            }
        });
        assert.strictEqual(failures.length, 0, failures.join(''));
        // On Windows, backslash is a path separator.
        assert.strictEqual(path.win32.extname('.\\'), '');
        assert.strictEqual(path.win32.extname('..\\'), '');
        assert.strictEqual(path.win32.extname('file.ext\\'), '.ext');
        assert.strictEqual(path.win32.extname('file.ext\\\\'), '.ext');
        assert.strictEqual(path.win32.extname('file\\'), '');
        assert.strictEqual(path.win32.extname('file\\\\'), '');
        assert.strictEqual(path.win32.extname('file.\\'), '.');
        assert.strictEqual(path.win32.extname('file.\\\\'), '.');
        // On *nix, backslash is a valid name component like any other character.
        assert.strictEqual(path.posix.extname('.\\'), '');
        assert.strictEqual(path.posix.extname('..\\'), '.\\');
        assert.strictEqual(path.posix.extname('file.ext\\'), '.ext\\');
        assert.strictEqual(path.posix.extname('file.ext\\\\'), '.ext\\\\');
        assert.strictEqual(path.posix.extname('file\\'), '');
        assert.strictEqual(path.posix.extname('file\\\\'), '');
        assert.strictEqual(path.posix.extname('file.\\'), '.\\');
        assert.strictEqual(path.posix.extname('file.\\\\'), '.\\\\');
        // Tests from VSCode
        assert.strictEqual(path.extname('far.boo'), '.boo');
        assert.strictEqual(path.extname('far.b'), '.b');
        assert.strictEqual(path.extname('far.'), '.');
        assert.strictEqual(path.extname('far.boo/boo.far'), '.far');
        assert.strictEqual(path.extname('far.boo/boo'), '');
    });
    test('resolve', () => {
        const failures = [];
        const slashRE = /\//g;
        const backslashRE = /\\/g;
        const resolveTests = [
            [
                path.win32.resolve,
                // arguments                               result
                [
                    [['c:/blah\\blah', 'd:/games', 'c:../a'], 'c:\\blah\\a'],
                    [['c:/ignore', 'd:\\a/b\\c/d', '\\e.exe'], 'd:\\e.exe'],
                    [['c:/ignore', 'c:/some/file'], 'c:\\some\\file'],
                    [['d:/ignore', 'd:some/dir//'], 'd:\\ignore\\some\\dir'],
                    [['//server/share', '..', 'relative\\'], '\\\\server\\share\\relative'],
                    [['c:/', '//'], 'c:\\'],
                    [['c:/', '//dir'], 'c:\\dir'],
                    [['c:/', '//server/share'], '\\\\server\\share\\'],
                    [['c:/', '//server//share'], '\\\\server\\share\\'],
                    [['c:/', '///some//dir'], 'c:\\some\\dir'],
                    [['C:\\foo\\tmp.3\\', '..\\tmp.3\\cycles\\root.js'], 'C:\\foo\\tmp.3\\cycles\\root.js'],
                ],
            ],
            [
                path.posix.resolve,
                // arguments                    result
                [
                    [['/var/lib', '../', 'file/'], '/var/file'],
                    [['/var/lib', '/../', 'file/'], '/file'],
                    [['/some/dir', '.', '/absolute/'], '/absolute'],
                    [['/foo/tmp.3/', '../tmp.3/cycles/root.js'], '/foo/tmp.3/cycles/root.js'],
                ],
            ],
            [
                isWeb ? path.posix.resolve : path.resolve,
                // arguments						result
                [
                    [['.'], process.cwd()],
                    [['a/b/c', '../../..'], process.cwd()],
                ],
            ],
        ];
        resolveTests.forEach((test) => {
            const resolve = test[0];
            //@ts-expect-error
            test[1].forEach((test) => {
                //@ts-expect-error
                const actual = resolve.apply(null, test[0]);
                let actualAlt;
                const os = resolve === path.win32.resolve ? 'win32' : 'posix';
                if (resolve === path.win32.resolve && !isWindows) {
                    actualAlt = actual.replace(backslashRE, '/');
                }
                else if (resolve !== path.win32.resolve && isWindows) {
                    actualAlt = actual.replace(slashRE, '\\');
                }
                const expected = test[1];
                const message = `path.${os}.resolve(${test[0].map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                if (actual !== expected && actualAlt !== expected) {
                    failures.push(`\n${message}`);
                }
            });
        });
        assert.strictEqual(failures.length, 0, failures.join(''));
        // if (isWindows) {
        // 	// Test resolving the current Windows drive letter from a spawned process.
        // 	// See https://github.com/nodejs/node/issues/7215
        // 	const currentDriveLetter = path.parse(process.cwd()).root.substring(0, 2);
        // 	const resolveFixture = fixtures.path('path-resolve.js');
        // 	const spawnResult = child.spawnSync(
        // 		process.argv[0], [resolveFixture, currentDriveLetter]);
        // 	const resolvedPath = spawnResult.stdout.toString().trim();
        // 	assert.strictEqual(resolvedPath.toLowerCase(), process.cwd().toLowerCase());
        // }
    });
    test('basename', () => {
        assert.strictEqual(path.basename(__filename), 'path.test.js');
        assert.strictEqual(path.basename(__filename, '.js'), 'path.test');
        assert.strictEqual(path.basename('.js', '.js'), '');
        assert.strictEqual(path.basename(''), '');
        assert.strictEqual(path.basename('/dir/basename.ext'), 'basename.ext');
        assert.strictEqual(path.basename('/basename.ext'), 'basename.ext');
        assert.strictEqual(path.basename('basename.ext'), 'basename.ext');
        assert.strictEqual(path.basename('basename.ext/'), 'basename.ext');
        assert.strictEqual(path.basename('basename.ext//'), 'basename.ext');
        assert.strictEqual(path.basename('aaa/bbb', '/bbb'), 'bbb');
        assert.strictEqual(path.basename('aaa/bbb', 'a/bbb'), 'bbb');
        assert.strictEqual(path.basename('aaa/bbb', 'bbb'), 'bbb');
        assert.strictEqual(path.basename('aaa/bbb//', 'bbb'), 'bbb');
        assert.strictEqual(path.basename('aaa/bbb', 'bb'), 'b');
        assert.strictEqual(path.basename('aaa/bbb', 'b'), 'bb');
        assert.strictEqual(path.basename('/aaa/bbb', '/bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/bbb', 'a/bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/bbb', 'bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/bbb//', 'bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/bbb', 'bb'), 'b');
        assert.strictEqual(path.basename('/aaa/bbb', 'b'), 'bb');
        assert.strictEqual(path.basename('/aaa/bbb'), 'bbb');
        assert.strictEqual(path.basename('/aaa/'), 'aaa');
        assert.strictEqual(path.basename('/aaa/b'), 'b');
        assert.strictEqual(path.basename('/a/b'), 'b');
        assert.strictEqual(path.basename('//a'), 'a');
        assert.strictEqual(path.basename('a', 'a'), '');
        // On Windows a backslash acts as a path separator.
        assert.strictEqual(path.win32.basename('\\dir\\basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('\\basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('basename.ext\\'), 'basename.ext');
        assert.strictEqual(path.win32.basename('basename.ext\\\\'), 'basename.ext');
        assert.strictEqual(path.win32.basename('foo'), 'foo');
        assert.strictEqual(path.win32.basename('aaa\\bbb', '\\bbb'), 'bbb');
        assert.strictEqual(path.win32.basename('aaa\\bbb', 'a\\bbb'), 'bbb');
        assert.strictEqual(path.win32.basename('aaa\\bbb', 'bbb'), 'bbb');
        assert.strictEqual(path.win32.basename('aaa\\bbb\\\\\\\\', 'bbb'), 'bbb');
        assert.strictEqual(path.win32.basename('aaa\\bbb', 'bb'), 'b');
        assert.strictEqual(path.win32.basename('aaa\\bbb', 'b'), 'bb');
        assert.strictEqual(path.win32.basename('C:'), '');
        assert.strictEqual(path.win32.basename('C:.'), '.');
        assert.strictEqual(path.win32.basename('C:\\'), '');
        assert.strictEqual(path.win32.basename('C:\\dir\\base.ext'), 'base.ext');
        assert.strictEqual(path.win32.basename('C:\\basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('C:basename.ext'), 'basename.ext');
        assert.strictEqual(path.win32.basename('C:basename.ext\\'), 'basename.ext');
        assert.strictEqual(path.win32.basename('C:basename.ext\\\\'), 'basename.ext');
        assert.strictEqual(path.win32.basename('C:foo'), 'foo');
        assert.strictEqual(path.win32.basename('file:stream'), 'file:stream');
        assert.strictEqual(path.win32.basename('a', 'a'), '');
        // On unix a backslash is just treated as any other character.
        assert.strictEqual(path.posix.basename('\\dir\\basename.ext'), '\\dir\\basename.ext');
        assert.strictEqual(path.posix.basename('\\basename.ext'), '\\basename.ext');
        assert.strictEqual(path.posix.basename('basename.ext'), 'basename.ext');
        assert.strictEqual(path.posix.basename('basename.ext\\'), 'basename.ext\\');
        assert.strictEqual(path.posix.basename('basename.ext\\\\'), 'basename.ext\\\\');
        assert.strictEqual(path.posix.basename('foo'), 'foo');
        // POSIX filenames may include control characters
        // c.f. http://www.dwheeler.com/essays/fixing-unix-linux-filenames.html
        const controlCharFilename = `Icon${String.fromCharCode(13)}`;
        assert.strictEqual(path.posix.basename(`/a/b/${controlCharFilename}`), controlCharFilename);
        // Tests from VSCode
        assert.strictEqual(path.basename('foo/bar'), 'bar');
        assert.strictEqual(path.posix.basename('foo\\bar'), 'foo\\bar');
        assert.strictEqual(path.win32.basename('foo\\bar'), 'bar');
        assert.strictEqual(path.basename('/foo/bar'), 'bar');
        assert.strictEqual(path.posix.basename('\\foo\\bar'), '\\foo\\bar');
        assert.strictEqual(path.win32.basename('\\foo\\bar'), 'bar');
        assert.strictEqual(path.basename('./bar'), 'bar');
        assert.strictEqual(path.posix.basename('.\\bar'), '.\\bar');
        assert.strictEqual(path.win32.basename('.\\bar'), 'bar');
        assert.strictEqual(path.basename('/bar'), 'bar');
        assert.strictEqual(path.posix.basename('\\bar'), '\\bar');
        assert.strictEqual(path.win32.basename('\\bar'), 'bar');
        assert.strictEqual(path.basename('bar/'), 'bar');
        assert.strictEqual(path.posix.basename('bar\\'), 'bar\\');
        assert.strictEqual(path.win32.basename('bar\\'), 'bar');
        assert.strictEqual(path.basename('bar'), 'bar');
        assert.strictEqual(path.basename('////////'), '');
        assert.strictEqual(path.posix.basename('\\\\\\\\'), '\\\\\\\\');
        assert.strictEqual(path.win32.basename('\\\\\\\\'), '');
    });
    test('relative', () => {
        const failures = [];
        const relativeTests = [
            [
                path.win32.relative,
                // arguments                     result
                [
                    ['c:/blah\\blah', 'd:/games', 'd:\\games'],
                    ['c:/aaaa/bbbb', 'c:/aaaa', '..'],
                    ['c:/aaaa/bbbb', 'c:/cccc', '..\\..\\cccc'],
                    ['c:/aaaa/bbbb', 'c:/aaaa/bbbb', ''],
                    ['c:/aaaa/bbbb', 'c:/aaaa/cccc', '..\\cccc'],
                    ['c:/aaaa/', 'c:/aaaa/cccc', 'cccc'],
                    ['c:/', 'c:\\aaaa\\bbbb', 'aaaa\\bbbb'],
                    ['c:/aaaa/bbbb', 'd:\\', 'd:\\'],
                    ['c:/AaAa/bbbb', 'c:/aaaa/bbbb', ''],
                    ['c:/aaaaa/', 'c:/aaaa/cccc', '..\\aaaa\\cccc'],
                    ['C:\\foo\\bar\\baz\\quux', 'C:\\', '..\\..\\..\\..'],
                    ['C:\\foo\\test', 'C:\\foo\\test\\bar\\package.json', 'bar\\package.json'],
                    ['C:\\foo\\bar\\baz-quux', 'C:\\foo\\bar\\baz', '..\\baz'],
                    ['C:\\foo\\bar\\baz', 'C:\\foo\\bar\\baz-quux', '..\\baz-quux'],
                    ['\\\\foo\\bar', '\\\\foo\\bar\\baz', 'baz'],
                    ['\\\\foo\\bar\\baz', '\\\\foo\\bar', '..'],
                    ['\\\\foo\\bar\\baz-quux', '\\\\foo\\bar\\baz', '..\\baz'],
                    ['\\\\foo\\bar\\baz', '\\\\foo\\bar\\baz-quux', '..\\baz-quux'],
                    ['C:\\baz-quux', 'C:\\baz', '..\\baz'],
                    ['C:\\baz', 'C:\\baz-quux', '..\\baz-quux'],
                    ['\\\\foo\\baz-quux', '\\\\foo\\baz', '..\\baz'],
                    ['\\\\foo\\baz', '\\\\foo\\baz-quux', '..\\baz-quux'],
                    ['C:\\baz', '\\\\foo\\bar\\baz', '\\\\foo\\bar\\baz'],
                    ['\\\\foo\\bar\\baz', 'C:\\baz', 'C:\\baz'],
                ],
            ],
            [
                path.posix.relative,
                // arguments          result
                [
                    ['/var/lib', '/var', '..'],
                    ['/var/lib', '/bin', '../../bin'],
                    ['/var/lib', '/var/lib', ''],
                    ['/var/lib', '/var/apache', '../apache'],
                    ['/var/', '/var/lib', 'lib'],
                    ['/', '/var/lib', 'var/lib'],
                    ['/foo/test', '/foo/test/bar/package.json', 'bar/package.json'],
                    ['/Users/a/web/b/test/mails', '/Users/a/web/b', '../..'],
                    ['/foo/bar/baz-quux', '/foo/bar/baz', '../baz'],
                    ['/foo/bar/baz', '/foo/bar/baz-quux', '../baz-quux'],
                    ['/baz-quux', '/baz', '../baz'],
                    ['/baz', '/baz-quux', '../baz-quux'],
                ],
            ],
        ];
        relativeTests.forEach((test) => {
            const relative = test[0];
            //@ts-expect-error
            test[1].forEach((test) => {
                //@ts-expect-error
                const actual = relative(test[0], test[1]);
                const expected = test[2];
                const os = relative === path.win32.relative ? 'win32' : 'posix';
                const message = `path.${os}.relative(${test.slice(0, 2).map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
                if (actual !== expected) {
                    failures.push(`\n${message}`);
                }
            });
        });
        assert.strictEqual(failures.length, 0, failures.join(''));
    });
    test('normalize', () => {
        assert.strictEqual(path.win32.normalize('./fixtures///b/../b/c.js'), 'fixtures\\b\\c.js');
        assert.strictEqual(path.win32.normalize('/foo/../../../bar'), '\\bar');
        assert.strictEqual(path.win32.normalize('a//b//../b'), 'a\\b');
        assert.strictEqual(path.win32.normalize('a//b//./c'), 'a\\b\\c');
        assert.strictEqual(path.win32.normalize('a//b//.'), 'a\\b');
        assert.strictEqual(path.win32.normalize('//server/share/dir/file.ext'), '\\\\server\\share\\dir\\file.ext');
        assert.strictEqual(path.win32.normalize('/a/b/c/../../../x/y/z'), '\\x\\y\\z');
        assert.strictEqual(path.win32.normalize('C:'), 'C:.');
        assert.strictEqual(path.win32.normalize('C:..\\abc'), 'C:..\\abc');
        assert.strictEqual(path.win32.normalize('C:..\\..\\abc\\..\\def'), 'C:..\\..\\def');
        assert.strictEqual(path.win32.normalize('C:\\.'), 'C:\\');
        assert.strictEqual(path.win32.normalize('file:stream'), 'file:stream');
        assert.strictEqual(path.win32.normalize('bar\\foo..\\..\\'), 'bar\\');
        assert.strictEqual(path.win32.normalize('bar\\foo..\\..'), 'bar');
        assert.strictEqual(path.win32.normalize('bar\\foo..\\..\\baz'), 'bar\\baz');
        assert.strictEqual(path.win32.normalize('bar\\foo..\\'), 'bar\\foo..\\');
        assert.strictEqual(path.win32.normalize('bar\\foo..'), 'bar\\foo..');
        assert.strictEqual(path.win32.normalize('..\\foo..\\..\\..\\bar'), '..\\..\\bar');
        assert.strictEqual(path.win32.normalize('..\\...\\..\\.\\...\\..\\..\\bar'), '..\\..\\bar');
        assert.strictEqual(path.win32.normalize('../../../foo/../../../bar'), '..\\..\\..\\..\\..\\bar');
        assert.strictEqual(path.win32.normalize('../../../foo/../../../bar/../../'), '..\\..\\..\\..\\..\\..\\');
        assert.strictEqual(path.win32.normalize('../foobar/barfoo/foo/../../../bar/../../'), '..\\..\\');
        assert.strictEqual(path.win32.normalize('../.../../foobar/../../../bar/../../baz'), '..\\..\\..\\..\\baz');
        assert.strictEqual(path.win32.normalize('foo/bar\\baz'), 'foo\\bar\\baz');
        assert.strictEqual(path.posix.normalize('./fixtures///b/../b/c.js'), 'fixtures/b/c.js');
        assert.strictEqual(path.posix.normalize('/foo/../../../bar'), '/bar');
        assert.strictEqual(path.posix.normalize('a//b//../b'), 'a/b');
        assert.strictEqual(path.posix.normalize('a//b//./c'), 'a/b/c');
        assert.strictEqual(path.posix.normalize('a//b//.'), 'a/b');
        assert.strictEqual(path.posix.normalize('/a/b/c/../../../x/y/z'), '/x/y/z');
        assert.strictEqual(path.posix.normalize('///..//./foo/.//bar'), '/foo/bar');
        assert.strictEqual(path.posix.normalize('bar/foo../../'), 'bar/');
        assert.strictEqual(path.posix.normalize('bar/foo../..'), 'bar');
        assert.strictEqual(path.posix.normalize('bar/foo../../baz'), 'bar/baz');
        assert.strictEqual(path.posix.normalize('bar/foo../'), 'bar/foo../');
        assert.strictEqual(path.posix.normalize('bar/foo..'), 'bar/foo..');
        assert.strictEqual(path.posix.normalize('../foo../../../bar'), '../../bar');
        assert.strictEqual(path.posix.normalize('../.../.././.../../../bar'), '../../bar');
        assert.strictEqual(path.posix.normalize('../../../foo/../../../bar'), '../../../../../bar');
        assert.strictEqual(path.posix.normalize('../../../foo/../../../bar/../../'), '../../../../../../');
        assert.strictEqual(path.posix.normalize('../foobar/barfoo/foo/../../../bar/../../'), '../../');
        assert.strictEqual(path.posix.normalize('../.../../foobar/../../../bar/../../baz'), '../../../../baz');
        assert.strictEqual(path.posix.normalize('foo/bar\\baz'), 'foo/bar\\baz');
    });
    test('isAbsolute', () => {
        assert.strictEqual(path.win32.isAbsolute('/'), true);
        assert.strictEqual(path.win32.isAbsolute('//'), true);
        assert.strictEqual(path.win32.isAbsolute('//server'), true);
        assert.strictEqual(path.win32.isAbsolute('//server/file'), true);
        assert.strictEqual(path.win32.isAbsolute('\\\\server\\file'), true);
        assert.strictEqual(path.win32.isAbsolute('\\\\server'), true);
        assert.strictEqual(path.win32.isAbsolute('\\\\'), true);
        assert.strictEqual(path.win32.isAbsolute('c'), false);
        assert.strictEqual(path.win32.isAbsolute('c:'), false);
        assert.strictEqual(path.win32.isAbsolute('c:\\'), true);
        assert.strictEqual(path.win32.isAbsolute('c:/'), true);
        assert.strictEqual(path.win32.isAbsolute('c://'), true);
        assert.strictEqual(path.win32.isAbsolute('C:/Users/'), true);
        assert.strictEqual(path.win32.isAbsolute('C:\\Users\\'), true);
        assert.strictEqual(path.win32.isAbsolute('C:cwd/another'), false);
        assert.strictEqual(path.win32.isAbsolute('C:cwd\\another'), false);
        assert.strictEqual(path.win32.isAbsolute('directory/directory'), false);
        assert.strictEqual(path.win32.isAbsolute('directory\\directory'), false);
        assert.strictEqual(path.posix.isAbsolute('/home/foo'), true);
        assert.strictEqual(path.posix.isAbsolute('/home/foo/..'), true);
        assert.strictEqual(path.posix.isAbsolute('bar/'), false);
        assert.strictEqual(path.posix.isAbsolute('./baz'), false);
        [
            'C:/',
            'C:\\',
            'C:/foo',
            'C:\\foo',
            'z:/foo/bar.txt',
            'z:\\foo\\bar.txt',
            '\\\\localhost\\c$\\foo',
            '/',
            '/foo',
        ].forEach((absolutePath) => {
            assert.ok(path.win32.isAbsolute(absolutePath), absolutePath);
        });
        ['/', '/foo', '/foo/bar.txt'].forEach((absolutePath) => {
            assert.ok(path.posix.isAbsolute(absolutePath), absolutePath);
        });
        ['', 'foo', 'foo/bar', './foo', 'http://foo.com/bar'].forEach((nonAbsolutePath) => {
            assert.ok(!path.win32.isAbsolute(nonAbsolutePath), nonAbsolutePath);
        });
        ['', 'foo', 'foo/bar', './foo', 'http://foo.com/bar', 'z:/foo/bar.txt'].forEach((nonAbsolutePath) => {
            assert.ok(!path.posix.isAbsolute(nonAbsolutePath), nonAbsolutePath);
        });
    });
    test('path', () => {
        // path.sep tests
        // windows
        assert.strictEqual(path.win32.sep, '\\');
        // posix
        assert.strictEqual(path.posix.sep, '/');
        // path.delimiter tests
        // windows
        assert.strictEqual(path.win32.delimiter, ';');
        // posix
        assert.strictEqual(path.posix.delimiter, ':');
        // if (isWindows) {
        // 	assert.strictEqual(path, path.win32);
        // } else {
        // 	assert.strictEqual(path, path.posix);
        // }
    });
    // test('perf', () => {
    // 	const folderNames = [
    // 		'abc',
    // 		'Users',
    // 		'reallylongfoldername',
    // 		's',
    // 		'reallyreallyreallylongfoldername',
    // 		'home'
    // 	];
    // 	const basePaths = [
    // 		'C:',
    // 		'',
    // 	];
    // 	const separators = [
    // 		'\\',
    // 		'/'
    // 	];
    // 	function randomInt(ciel: number): number {
    // 		return Math.floor(Math.random() * ciel);
    // 	}
    // 	let pathsToNormalize = [];
    // 	let pathsToJoin = [];
    // 	let i;
    // 	for (i = 0; i < 1000000; i++) {
    // 		const basePath = basePaths[randomInt(basePaths.length)];
    // 		let lengthOfPath = randomInt(10) + 2;
    // 		let pathToNormalize = basePath + separators[randomInt(separators.length)];
    // 		while (lengthOfPath-- > 0) {
    // 			pathToNormalize = pathToNormalize + folderNames[randomInt(folderNames.length)] + separators[randomInt(separators.length)];
    // 		}
    // 		pathsToNormalize.push(pathToNormalize);
    // 		let pathToJoin = '';
    // 		lengthOfPath = randomInt(10) + 2;
    // 		while (lengthOfPath-- > 0) {
    // 			pathToJoin = pathToJoin + folderNames[randomInt(folderNames.length)] + separators[randomInt(separators.length)];
    // 		}
    // 		pathsToJoin.push(pathToJoin + '.ts');
    // 	}
    // 	let newTime = 0;
    // 	let j;
    // 	for(j = 0; j < pathsToJoin.length; j++) {
    // 		const path1 = pathsToNormalize[j];
    // 		const path2 = pathsToNormalize[j];
    // 		const newStart = performance.now();
    // 		path.join(path1, path2);
    // 		newTime += performance.now() - newStart;
    // 	}
    // 	assert.ok(false, `Time: ${newTime}ms.`);
    // });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3BhdGgudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyx5RkFBeUY7QUFDekYsNEZBQTRGO0FBRTVGLHNEQUFzRDtBQUN0RCxFQUFFO0FBQ0YsMEVBQTBFO0FBQzFFLGdFQUFnRTtBQUNoRSxzRUFBc0U7QUFDdEUsc0VBQXNFO0FBQ3RFLDRFQUE0RTtBQUM1RSxxRUFBcUU7QUFDckUsd0JBQXdCO0FBQ3hCLEVBQUU7QUFDRiwwRUFBMEU7QUFDMUUseURBQXlEO0FBQ3pELEVBQUU7QUFDRiwwRUFBMEU7QUFDMUUsNkRBQTZEO0FBQzdELDRFQUE0RTtBQUM1RSwyRUFBMkU7QUFDM0Usd0VBQXdFO0FBQ3hFLDRFQUE0RTtBQUM1RSx5Q0FBeUM7QUFFekMsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxJQUFJLE1BQU0sc0JBQXNCLENBQUE7QUFDNUMsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMzRCxPQUFPLEtBQUssT0FBTyxNQUFNLHlCQUF5QixDQUFBO0FBQ2xELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQTtJQUNqQyx1Q0FBdUMsRUFBRSxDQUFBO0lBQ3pDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sUUFBUSxHQUFHLEVBQWMsQ0FBQTtRQUMvQixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFFekIsTUFBTSxTQUFTLEdBQVE7WUFDdEI7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QUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUss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QUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN4RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLE1BQU0sUUFBUSxHQUFHLEVBQWMsQ0FBQTtRQUUvQixNQUFNLGFBQWEsR0FBRztZQUNyQjtnQkFDQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVE7Z0JBQ25CLHVDQUF1QztnQkFDdkM7b0JBQ0MsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQztvQkFDMUMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQztvQkFDakMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQztvQkFDM0MsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBQztvQkFDcEMsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQztvQkFDNUMsQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQztvQkFDcEMsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDO29CQUN2QyxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDO29CQUNoQyxDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQUUsRUFBRSxDQUFDO29CQUNwQyxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLENBQUM7b0JBQy9DLENBQUMseUJBQXlCLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDO29CQUNyRCxDQUFDLGVBQWUsRUFBRSxrQ0FBa0MsRUFBRSxtQkFBbUIsQ0FBQztvQkFDMUUsQ0FBQyx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSxTQUFTLENBQUM7b0JBQzFELENBQUMsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUsY0FBYyxDQUFDO29CQUMvRCxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLENBQUM7b0JBQzVDLENBQUMsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQztvQkFDM0MsQ0FBQyx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSxTQUFTLENBQUM7b0JBQzFELENBQUMsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUsY0FBYyxDQUFDO29CQUMvRCxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDO29CQUN0QyxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDO29CQUMzQyxDQUFDLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxTQUFTLENBQUM7b0JBQ2hELENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsQ0FBQztvQkFDckQsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUM7b0JBQ3JELENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQztpQkFDM0M7YUFDRDtZQUNEO2dCQUNDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUTtnQkFDbkIsNEJBQTRCO2dCQUM1QjtvQkFDQyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDO29CQUMxQixDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDO29CQUNqQyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDO29CQUM1QixDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDO29CQUN4QyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDO29CQUM1QixDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDO29CQUM1QixDQUFDLFdBQVcsRUFBRSw0QkFBNEIsRUFBRSxrQkFBa0IsQ0FBQztvQkFDL0QsQ0FBQywyQkFBMkIsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLENBQUM7b0JBQ3hELENBQUMsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQztvQkFDL0MsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsYUFBYSxDQUFDO29CQUNwRCxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDO29CQUMvQixDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsYUFBYSxDQUFDO2lCQUNwQzthQUNEO1NBQ0QsQ0FBQTtRQUNELGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEIsa0JBQWtCO1lBQ2xCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDeEIsa0JBQWtCO2dCQUNsQixNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN6QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hCLE1BQU0sRUFBRSxHQUFHLFFBQVEsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7Z0JBQy9ELE1BQU0sT0FBTyxHQUFHLFFBQVEsRUFBRSxhQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGNBQWMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFBO2dCQUNsSyxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLE9BQU8sRUFBRSxDQUFDLENBQUE7Z0JBQzlCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUN6RixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUMsRUFDbkQsa0NBQWtDLENBQ2xDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDM0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLHlCQUF5QixDQUFDLENBQUE7UUFDaEcsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUMsRUFDeEQsMEJBQTBCLENBQzFCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEcsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMseUNBQXlDLENBQUMsRUFDL0QscUJBQXFCLENBQ3JCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBRXpFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDM0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUMsRUFDeEQsb0JBQW9CLENBQ3BCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDOUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMseUNBQXlDLENBQUMsRUFDL0QsaUJBQWlCLENBQ2pCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ3pFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJ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