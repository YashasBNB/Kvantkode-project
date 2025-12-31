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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9wYXRoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcseUZBQXlGO0FBQ3pGLDRGQUE0RjtBQUU1RixzREFBc0Q7QUFDdEQsRUFBRTtBQUNGLDBFQUEwRTtBQUMxRSxnRUFBZ0U7QUFDaEUsc0VBQXNFO0FBQ3RFLHNFQUFzRTtBQUN0RSw0RUFBNEU7QUFDNUUscUVBQXFFO0FBQ3JFLHdCQUF3QjtBQUN4QixFQUFFO0FBQ0YsMEVBQTBFO0FBQzFFLHlEQUF5RDtBQUN6RCxFQUFFO0FBQ0YsMEVBQTBFO0FBQzFFLDZEQUE2RDtBQUM3RCw0RUFBNEU7QUFDNUUsMkVBQTJFO0FBQzNFLHdFQUF3RTtBQUN4RSw0RUFBNEU7QUFDNUUseUNBQXlDO0FBRXpDLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssSUFBSSxNQUFNLHNCQUFzQixDQUFBO0FBQzVDLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0QsT0FBTyxLQUFLLE9BQU8sTUFBTSx5QkFBeUIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUE7SUFDakMsdUNBQXVDLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUNqQixNQUFNLFFBQVEsR0FBRyxFQUFjLENBQUE7UUFDL0IsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBRXpCLE1BQU0sU0FBUyxHQUFRO1lBQ3RCO2dCQUNDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ2xDLHVDQUF1QztnQkFDdkM7b0JBQ0MsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLFVBQVUsQ0FBQztvQkFDM0MsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO29CQUNULENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxXQUFXLENBQUM7b0JBQzdDLENBQUMsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUNsQyxDQUFDLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxFQUFFLFdBQVcsQ0FBQztvQkFDdEMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsRUFBRSxXQUFXLENBQUM7b0JBQ3ZDLENBQUMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLEVBQUUsUUFBUSxDQUFDO29CQUNyQyxDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFLFdBQVcsQ0FBQztvQkFDakMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxXQUFXLENBQUM7b0JBQ2xDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLFdBQVcsQ0FBQztvQkFDckMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQztvQkFDZCxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQztvQkFDbkIsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDO29CQUN0QixDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUM7b0JBQ3ZCLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQztvQkFDeEIsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDO29CQUM1QixDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDO29CQUNaLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDO29CQUNoQixDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQztvQkFDcEIsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUM7b0JBQzVCLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUN0QixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUM7b0JBQzFCLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQztvQkFDeEIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUM7b0JBQ3BCLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUN0QixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUM7b0JBQ2hDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQztvQkFDaEMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQztvQkFDekMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQztvQkFDeEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQztvQkFDdkMsQ0FBQyxDQUFDLEdBQUcsQ0FB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QixDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRS9DLG1EQUFtRDtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFckQsOERBQThEO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVyRCxpREFBaUQ7UUFDakQsdUVBQXVFO1FBQ3ZFLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLG1CQUFtQixFQUFFLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRTNGLG9CQUFvQjtRQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDeEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLFFBQVEsR0FBRyxFQUFjLENBQUE7UUFFL0IsTUFBTSxhQUFhLEdBQUc7WUFDckI7Z0JBQ0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRO2dCQUNuQix1Q0FBdUM7Z0JBQ3ZDO29CQUNDLENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUM7b0JBQzFDLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUM7b0JBQ2pDLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUM7b0JBQzNDLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSxFQUFFLENBQUM7b0JBQ3BDLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUM7b0JBQzVDLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUM7b0JBQ3BDLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFLFlBQVksQ0FBQztvQkFDdkMsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztvQkFDaEMsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBQztvQkFDcEMsQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDO29CQUMvQyxDQUFDLHlCQUF5QixFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQztvQkFDckQsQ0FBQyxlQUFlLEVBQUUsa0NBQWtDLEVBQUUsbUJBQW1CLENBQUM7b0JBQzFFLENBQUMsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxDQUFDO29CQUMxRCxDQUFDLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLGNBQWMsQ0FBQztvQkFDL0QsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxDQUFDO29CQUM1QyxDQUFDLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUM7b0JBQzNDLENBQUMsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxDQUFDO29CQUMxRCxDQUFDLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLGNBQWMsQ0FBQztvQkFDL0QsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQztvQkFDdEMsQ0FBQyxTQUFTLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQztvQkFDM0MsQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDO29CQUNoRCxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxjQUFjLENBQUM7b0JBQ3JELENBQUMsU0FBUyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDO29CQUNyRCxDQUFDLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUM7aUJBQzNDO2FBQ0Q7WUFDRDtnQkFDQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVE7Z0JBQ25CLDRCQUE0QjtnQkFDNUI7b0JBQ0MsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQztvQkFDMUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQztvQkFDakMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztvQkFDNUIsQ0FBQyxVQUFVLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQztvQkFDeEMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQztvQkFDNUIsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQztvQkFDNUIsQ0FBQyxXQUFXLEVBQUUsNEJBQTRCLEVBQUUsa0JBQWtCLENBQUM7b0JBQy9ELENBQUMsMkJBQTJCLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDO29CQUN4RCxDQUFDLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxRQUFRLENBQUM7b0JBQy9DLENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLGFBQWEsQ0FBQztvQkFDcEQsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQztvQkFDL0IsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQztpQkFDcEM7YUFDRDtTQUNELENBQUE7UUFDRCxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLGtCQUFrQjtZQUNsQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ3hCLGtCQUFrQjtnQkFDbEIsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDekMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN4QixNQUFNLEVBQUUsR0FBRyxRQUFRLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO2dCQUMvRCxNQUFNLE9BQU8sR0FBRyxRQUFRLEVBQUUsYUFBYSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFjLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtnQkFDbEssSUFBSSxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFBO2dCQUM5QixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLDZCQUE2QixDQUFDLEVBQ25ELGtDQUFrQyxDQUNsQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLEVBQ3hELDBCQUEwQixDQUMxQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHlDQUF5QyxDQUFDLEVBQy9ELHFCQUFxQixDQUNyQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUV6RSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQzNGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLEVBQ3hELG9CQUFvQixDQUNwQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHlDQUF5QyxDQUFDLEVBQy9ELGlCQUFpQixDQUNqQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUN6RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENB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