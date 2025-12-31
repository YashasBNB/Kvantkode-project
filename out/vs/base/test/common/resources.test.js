/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { toSlashes } from '../../common/extpath.js';
import { posix, win32 } from '../../common/path.js';
import { isWindows } from '../../common/platform.js';
import { addTrailingPathSeparator, basename, dirname, distinctParents, extUri, extUriIgnorePathCase, hasTrailingPathSeparator, isAbsolutePath, joinPath, normalizePath, relativePath, removeTrailingPathSeparator, resolvePath, } from '../../common/resources.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Resources', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('distinctParents', () => {
        // Basic
        let resources = [
            URI.file('/some/folderA/file.txt'),
            URI.file('/some/folderB/file.txt'),
            URI.file('/some/folderC/file.txt'),
        ];
        let distinct = distinctParents(resources, (r) => r);
        assert.strictEqual(distinct.length, 3);
        assert.strictEqual(distinct[0].toString(), resources[0].toString());
        assert.strictEqual(distinct[1].toString(), resources[1].toString());
        assert.strictEqual(distinct[2].toString(), resources[2].toString());
        // Parent / Child
        resources = [
            URI.file('/some/folderA'),
            URI.file('/some/folderA/file.txt'),
            URI.file('/some/folderA/child/file.txt'),
            URI.file('/some/folderA2/file.txt'),
            URI.file('/some/file.txt'),
        ];
        distinct = distinctParents(resources, (r) => r);
        assert.strictEqual(distinct.length, 3);
        assert.strictEqual(distinct[0].toString(), resources[0].toString());
        assert.strictEqual(distinct[1].toString(), resources[3].toString());
        assert.strictEqual(distinct[2].toString(), resources[4].toString());
    });
    test('dirname', () => {
        if (isWindows) {
            assert.strictEqual(dirname(URI.file('c:\\some\\file\\test.txt')).toString(), 'file:///c%3A/some/file');
            assert.strictEqual(dirname(URI.file('c:\\some\\file')).toString(), 'file:///c%3A/some');
            assert.strictEqual(dirname(URI.file('c:\\some\\file\\')).toString(), 'file:///c%3A/some');
            assert.strictEqual(dirname(URI.file('c:\\some')).toString(), 'file:///c%3A/');
            assert.strictEqual(dirname(URI.file('C:\\some')).toString(), 'file:///c%3A/');
            assert.strictEqual(dirname(URI.file('c:\\')).toString(), 'file:///c%3A/');
        }
        else {
            assert.strictEqual(dirname(URI.file('/some/file/test.txt')).toString(), 'file:///some/file');
            assert.strictEqual(dirname(URI.file('/some/file/')).toString(), 'file:///some');
            assert.strictEqual(dirname(URI.file('/some/file')).toString(), 'file:///some');
        }
        assert.strictEqual(dirname(URI.parse('foo://a/some/file/test.txt')).toString(), 'foo://a/some/file');
        assert.strictEqual(dirname(URI.parse('foo://a/some/file/')).toString(), 'foo://a/some');
        assert.strictEqual(dirname(URI.parse('foo://a/some/file')).toString(), 'foo://a/some');
        assert.strictEqual(dirname(URI.parse('foo://a/some')).toString(), 'foo://a/');
        assert.strictEqual(dirname(URI.parse('foo://a/')).toString(), 'foo://a/');
        assert.strictEqual(dirname(URI.parse('foo://a')).toString(), 'foo://a');
        // does not explode (https://github.com/microsoft/vscode/issues/41987)
        dirname(URI.from({ scheme: 'file', authority: '/users/someone/portal.h' }));
        assert.strictEqual(dirname(URI.parse('foo://a/b/c?q')).toString(), 'foo://a/b?q');
    });
    test('basename', () => {
        if (isWindows) {
            assert.strictEqual(basename(URI.file('c:\\some\\file\\test.txt')), 'test.txt');
            assert.strictEqual(basename(URI.file('c:\\some\\file')), 'file');
            assert.strictEqual(basename(URI.file('c:\\some\\file\\')), 'file');
            assert.strictEqual(basename(URI.file('C:\\some\\file\\')), 'file');
        }
        else {
            assert.strictEqual(basename(URI.file('/some/file/test.txt')), 'test.txt');
            assert.strictEqual(basename(URI.file('/some/file/')), 'file');
            assert.strictEqual(basename(URI.file('/some/file')), 'file');
            assert.strictEqual(basename(URI.file('/some')), 'some');
        }
        assert.strictEqual(basename(URI.parse('foo://a/some/file/test.txt')), 'test.txt');
        assert.strictEqual(basename(URI.parse('foo://a/some/file/')), 'file');
        assert.strictEqual(basename(URI.parse('foo://a/some/file')), 'file');
        assert.strictEqual(basename(URI.parse('foo://a/some')), 'some');
        assert.strictEqual(basename(URI.parse('foo://a/')), '');
        assert.strictEqual(basename(URI.parse('foo://a')), '');
    });
    test('joinPath', () => {
        if (isWindows) {
            assert.strictEqual(joinPath(URI.file('c:\\foo\\bar'), '/file.js').toString(), 'file:///c%3A/foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\foo\\bar\\'), 'file.js').toString(), 'file:///c%3A/foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\foo\\bar\\'), '/file.js').toString(), 'file:///c%3A/foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\'), '/file.js').toString(), 'file:///c%3A/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\'), 'bar/file.js').toString(), 'file:///c%3A/bar/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\foo'), './file.js').toString(), 'file:///c%3A/foo/file.js');
            assert.strictEqual(joinPath(URI.file('c:\\foo'), '/./file.js').toString(), 'file:///c%3A/foo/file.js');
            assert.strictEqual(joinPath(URI.file('C:\\foo'), '../file.js').toString(), 'file:///c%3A/file.js');
            assert.strictEqual(joinPath(URI.file('C:\\foo\\.'), '../file.js').toString(), 'file:///c%3A/file.js');
        }
        else {
            assert.strictEqual(joinPath(URI.file('/foo/bar'), '/file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar'), 'file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar/'), '/file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/'), '/file.js').toString(), 'file:///file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar'), './file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar'), '/./file.js').toString(), 'file:///foo/bar/file.js');
            assert.strictEqual(joinPath(URI.file('/foo/bar'), '../file.js').toString(), 'file:///foo/file.js');
        }
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar')).toString(), 'foo://a/foo/bar');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar'), '/file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar'), 'file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar/'), '/file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/'), '/file.js').toString(), 'foo://a/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar/'), './file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar/'), '/./file.js').toString(), 'foo://a/foo/bar/file.js');
        assert.strictEqual(joinPath(URI.parse('foo://a/foo/bar/'), '../file.js').toString(), 'foo://a/foo/file.js');
        assert.strictEqual(joinPath(URI.from({
            scheme: 'myScheme',
            authority: 'authority',
            path: '/path',
            query: 'query',
            fragment: 'fragment',
        }), '/file.js').toString(), 'myScheme://authority/path/file.js?query#fragment');
    });
    test('normalizePath', () => {
        if (isWindows) {
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\.\\bar')).toString(), 'file:///c%3A/foo/bar');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\.')).toString(), 'file:///c%3A/foo');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\.\\')).toString(), 'file:///c%3A/foo/');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\..')).toString(), 'file:///c%3A/');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\..\\bar')).toString(), 'file:///c%3A/bar');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\..\\..\\bar')).toString(), 'file:///c%3A/bar');
            assert.strictEqual(normalizePath(URI.file('c:\\foo\\foo\\..\\..\\bar')).toString(), 'file:///c%3A/bar');
            assert.strictEqual(normalizePath(URI.file('C:\\foo\\foo\\.\\..\\..\\bar')).toString(), 'file:///c%3A/bar');
            assert.strictEqual(normalizePath(URI.file('C:\\foo\\foo\\.\\..\\some\\..\\bar')).toString(), 'file:///c%3A/foo/bar');
        }
        else {
            assert.strictEqual(normalizePath(URI.file('/foo/./bar')).toString(), 'file:///foo/bar');
            assert.strictEqual(normalizePath(URI.file('/foo/.')).toString(), 'file:///foo');
            assert.strictEqual(normalizePath(URI.file('/foo/./')).toString(), 'file:///foo/');
            assert.strictEqual(normalizePath(URI.file('/foo/..')).toString(), 'file:///');
            assert.strictEqual(normalizePath(URI.file('/foo/../bar')).toString(), 'file:///bar');
            assert.strictEqual(normalizePath(URI.file('/foo/../../bar')).toString(), 'file:///bar');
            assert.strictEqual(normalizePath(URI.file('/foo/foo/../../bar')).toString(), 'file:///bar');
            assert.strictEqual(normalizePath(URI.file('/foo/foo/./../../bar')).toString(), 'file:///bar');
            assert.strictEqual(normalizePath(URI.file('/foo/foo/./../some/../bar')).toString(), 'file:///foo/bar');
            assert.strictEqual(normalizePath(URI.file('/f')).toString(), 'file:///f');
        }
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/./bar')).toString(), 'foo://a/foo/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/.')).toString(), 'foo://a/foo');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/./')).toString(), 'foo://a/foo/');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/..')).toString(), 'foo://a/');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/../bar')).toString(), 'foo://a/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/../../bar')).toString(), 'foo://a/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/foo/../../bar')).toString(), 'foo://a/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/foo/./../../bar')).toString(), 'foo://a/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/foo/./../some/../bar')).toString(), 'foo://a/foo/bar');
        assert.strictEqual(normalizePath(URI.parse('foo://a')).toString(), 'foo://a');
        assert.strictEqual(normalizePath(URI.parse('foo://a/')).toString(), 'foo://a/');
        assert.strictEqual(normalizePath(URI.parse('foo://a/foo/./bar?q=1')).toString(), URI.parse('foo://a/foo/bar?q%3D1').toString());
    });
    test('isAbsolute', () => {
        if (isWindows) {
            assert.strictEqual(isAbsolutePath(URI.file('c:\\foo\\')), true);
            assert.strictEqual(isAbsolutePath(URI.file('C:\\foo\\')), true);
            assert.strictEqual(isAbsolutePath(URI.file('bar')), true); // URI normalizes all file URIs to be absolute
        }
        else {
            assert.strictEqual(isAbsolutePath(URI.file('/foo/bar')), true);
            assert.strictEqual(isAbsolutePath(URI.file('bar')), true); // URI normalizes all file URIs to be absolute
        }
        assert.strictEqual(isAbsolutePath(URI.parse('foo:foo')), false);
        assert.strictEqual(isAbsolutePath(URI.parse('foo://a/foo/.')), true);
    });
    function assertTrailingSeparator(u1, expected) {
        assert.strictEqual(hasTrailingPathSeparator(u1), expected, u1.toString());
    }
    function assertRemoveTrailingSeparator(u1, expected) {
        assertEqualURI(removeTrailingPathSeparator(u1), expected, u1.toString());
    }
    function assertAddTrailingSeparator(u1, expected) {
        assertEqualURI(addTrailingPathSeparator(u1), expected, u1.toString());
    }
    test('trailingPathSeparator', () => {
        assertTrailingSeparator(URI.parse('foo://a/foo'), false);
        assertTrailingSeparator(URI.parse('foo://a/foo/'), true);
        assertTrailingSeparator(URI.parse('foo://a/'), false);
        assertTrailingSeparator(URI.parse('foo://a'), false);
        assertRemoveTrailingSeparator(URI.parse('foo://a/foo'), URI.parse('foo://a/foo'));
        assertRemoveTrailingSeparator(URI.parse('foo://a/foo/'), URI.parse('foo://a/foo'));
        assertRemoveTrailingSeparator(URI.parse('foo://a/'), URI.parse('foo://a/'));
        assertRemoveTrailingSeparator(URI.parse('foo://a'), URI.parse('foo://a'));
        assertAddTrailingSeparator(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/'));
        assertAddTrailingSeparator(URI.parse('foo://a/foo/'), URI.parse('foo://a/foo/'));
        assertAddTrailingSeparator(URI.parse('foo://a/'), URI.parse('foo://a/'));
        assertAddTrailingSeparator(URI.parse('foo://a'), URI.parse('foo://a/'));
        if (isWindows) {
            assertTrailingSeparator(URI.file('c:\\a\\foo'), false);
            assertTrailingSeparator(URI.file('c:\\a\\foo\\'), true);
            assertTrailingSeparator(URI.file('c:\\'), false);
            assertTrailingSeparator(URI.file('\\\\server\\share\\some\\'), true);
            assertTrailingSeparator(URI.file('\\\\server\\share\\'), false);
            assertRemoveTrailingSeparator(URI.file('c:\\a\\foo'), URI.file('c:\\a\\foo'));
            assertRemoveTrailingSeparator(URI.file('c:\\a\\foo\\'), URI.file('c:\\a\\foo'));
            assertRemoveTrailingSeparator(URI.file('c:\\'), URI.file('c:\\'));
            assertRemoveTrailingSeparator(URI.file('\\\\server\\share\\some\\'), URI.file('\\\\server\\share\\some'));
            assertRemoveTrailingSeparator(URI.file('\\\\server\\share\\'), URI.file('\\\\server\\share\\'));
            assertAddTrailingSeparator(URI.file('c:\\a\\foo'), URI.file('c:\\a\\foo\\'));
            assertAddTrailingSeparator(URI.file('c:\\a\\foo\\'), URI.file('c:\\a\\foo\\'));
            assertAddTrailingSeparator(URI.file('c:\\'), URI.file('c:\\'));
            assertAddTrailingSeparator(URI.file('\\\\server\\share\\some'), URI.file('\\\\server\\share\\some\\'));
            assertAddTrailingSeparator(URI.file('\\\\server\\share\\some\\'), URI.file('\\\\server\\share\\some\\'));
        }
        else {
            assertTrailingSeparator(URI.file('/foo/bar'), false);
            assertTrailingSeparator(URI.file('/foo/bar/'), true);
            assertTrailingSeparator(URI.file('/'), false);
            assertRemoveTrailingSeparator(URI.file('/foo/bar'), URI.file('/foo/bar'));
            assertRemoveTrailingSeparator(URI.file('/foo/bar/'), URI.file('/foo/bar'));
            assertRemoveTrailingSeparator(URI.file('/'), URI.file('/'));
            assertAddTrailingSeparator(URI.file('/foo/bar'), URI.file('/foo/bar/'));
            assertAddTrailingSeparator(URI.file('/foo/bar/'), URI.file('/foo/bar/'));
            assertAddTrailingSeparator(URI.file('/'), URI.file('/'));
        }
    });
    function assertEqualURI(actual, expected, message, ignoreCase) {
        const util = ignoreCase ? extUriIgnorePathCase : extUri;
        if (!util.isEqual(expected, actual)) {
            assert.strictEqual(actual.toString(), expected.toString(), message);
        }
    }
    function assertRelativePath(u1, u2, expectedPath, ignoreJoin, ignoreCase) {
        const util = ignoreCase ? extUriIgnorePathCase : extUri;
        assert.strictEqual(util.relativePath(u1, u2), expectedPath, `from ${u1.toString()} to ${u2.toString()}`);
        if (expectedPath !== undefined && !ignoreJoin) {
            assertEqualURI(removeTrailingPathSeparator(joinPath(u1, expectedPath)), removeTrailingPathSeparator(u2), 'joinPath on relativePath should be equal', ignoreCase);
        }
    }
    test('relativePath', () => {
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/bar'), 'bar');
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/bar/'), 'bar');
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/bar/goo'), 'bar/goo');
        assertRelativePath(URI.parse('foo://a/'), URI.parse('foo://a/foo/bar/goo'), 'foo/bar/goo');
        assertRelativePath(URI.parse('foo://a/foo/xoo'), URI.parse('foo://a/foo/bar'), '../bar');
        assertRelativePath(URI.parse('foo://a/foo/xoo/yoo'), URI.parse('foo://a'), '../../..', true);
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo/'), '');
        assertRelativePath(URI.parse('foo://a/foo/'), URI.parse('foo://a/foo'), '');
        assertRelativePath(URI.parse('foo://a/foo/'), URI.parse('foo://a/foo/'), '');
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://a/foo'), '');
        assertRelativePath(URI.parse('foo://a'), URI.parse('foo://a'), '', true);
        assertRelativePath(URI.parse('foo://a/'), URI.parse('foo://a/'), '');
        assertRelativePath(URI.parse('foo://a/'), URI.parse('foo://a'), '', true);
        assertRelativePath(URI.parse('foo://a/foo?q'), URI.parse('foo://a/foo/bar#h'), 'bar', true);
        assertRelativePath(URI.parse('foo://'), URI.parse('foo://a/b'), undefined);
        assertRelativePath(URI.parse('foo://a2/b'), URI.parse('foo://a/b'), undefined);
        assertRelativePath(URI.parse('goo://a/b'), URI.parse('foo://a/b'), undefined);
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://A/FOO/bar/goo'), 'bar/goo', false, true);
        assertRelativePath(URI.parse('foo://a/foo'), URI.parse('foo://A/FOO/BAR/GOO'), 'BAR/GOO', false, true);
        assertRelativePath(URI.parse('foo://a/foo/xoo'), URI.parse('foo://A/FOO/BAR/GOO'), '../BAR/GOO', false, true);
        assertRelativePath(URI.parse('foo:///c:/a/foo'), URI.parse('foo:///C:/a/foo/xoo/'), 'xoo', false, true);
        if (isWindows) {
            assertRelativePath(URI.file('c:\\foo\\bar'), URI.file('c:\\foo\\bar'), '');
            assertRelativePath(URI.file('c:\\foo\\bar\\huu'), URI.file('c:\\foo\\bar'), '..');
            assertRelativePath(URI.file('c:\\foo\\bar\\a1\\a2'), URI.file('c:\\foo\\bar'), '../..');
            assertRelativePath(URI.file('c:\\foo\\bar\\'), URI.file('c:\\foo\\bar\\a1\\a2'), 'a1/a2');
            assertRelativePath(URI.file('c:\\foo\\bar\\'), URI.file('c:\\foo\\bar\\a1\\a2\\'), 'a1/a2');
            assertRelativePath(URI.file('c:\\'), URI.file('c:\\foo\\bar'), 'foo/bar');
            assertRelativePath(URI.file('\\\\server\\share\\some\\'), URI.file('\\\\server\\share\\some\\path'), 'path');
            assertRelativePath(URI.file('\\\\server\\share\\some\\'), URI.file('\\\\server\\share2\\some\\path'), '../../share2/some/path', true); // ignore joinPath assert: path.join is not root aware
        }
        else {
            assertRelativePath(URI.file('/a/foo'), URI.file('/a/foo/bar'), 'bar');
            assertRelativePath(URI.file('/a/foo'), URI.file('/a/foo/bar/'), 'bar');
            assertRelativePath(URI.file('/a/foo'), URI.file('/a/foo/bar/goo'), 'bar/goo');
            assertRelativePath(URI.file('/a/'), URI.file('/a/foo/bar/goo'), 'foo/bar/goo');
            assertRelativePath(URI.file('/'), URI.file('/a/foo/bar/goo'), 'a/foo/bar/goo');
            assertRelativePath(URI.file('/a/foo/xoo'), URI.file('/a/foo/bar'), '../bar');
            assertRelativePath(URI.file('/a/foo/xoo/yoo'), URI.file('/a'), '../../..');
            assertRelativePath(URI.file('/a/foo'), URI.file('/a/foo/'), '');
            assertRelativePath(URI.file('/a/foo'), URI.file('/b/foo/'), '../../b/foo');
        }
    });
    function assertResolve(u1, path, expected) {
        const actual = resolvePath(u1, path);
        assertEqualURI(actual, expected, `from ${u1.toString()} and ${path}`);
        const p = path.indexOf('/') !== -1 ? posix : win32;
        if (!p.isAbsolute(path)) {
            let expectedPath = isWindows ? toSlashes(path) : path;
            expectedPath = expectedPath.startsWith('./') ? expectedPath.substr(2) : expectedPath;
            assert.strictEqual(relativePath(u1, actual), expectedPath, `relativePath (${u1.toString()}) on actual (${actual.toString()}) should be to path (${expectedPath})`);
        }
    }
    test('resolve', () => {
        if (isWindows) {
            assertResolve(URI.file('c:\\foo\\bar'), 'file.js', URI.file('c:\\foo\\bar\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), 't\\file.js', URI.file('c:\\foo\\bar\\t\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), '.\\t\\file.js', URI.file('c:\\foo\\bar\\t\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), 'a1/file.js', URI.file('c:\\foo\\bar\\a1\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), './a1/file.js', URI.file('c:\\foo\\bar\\a1\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), '\\b1\\file.js', URI.file('c:\\b1\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar'), '/b1/file.js', URI.file('c:\\b1\\file.js'));
            assertResolve(URI.file('c:\\foo\\bar\\'), 'file.js', URI.file('c:\\foo\\bar\\file.js'));
            assertResolve(URI.file('c:\\'), 'file.js', URI.file('c:\\file.js'));
            assertResolve(URI.file('c:\\'), '\\b1\\file.js', URI.file('c:\\b1\\file.js'));
            assertResolve(URI.file('c:\\'), '/b1/file.js', URI.file('c:\\b1\\file.js'));
            assertResolve(URI.file('c:\\'), 'd:\\foo\\bar.txt', URI.file('d:\\foo\\bar.txt'));
            assertResolve(URI.file('\\\\server\\share\\some\\'), 'b1\\file.js', URI.file('\\\\server\\share\\some\\b1\\file.js'));
            assertResolve(URI.file('\\\\server\\share\\some\\'), '\\file.js', URI.file('\\\\server\\share\\file.js'));
            assertResolve(URI.file('c:\\'), '\\\\server\\share\\some\\', URI.file('\\\\server\\share\\some'));
            assertResolve(URI.file('\\\\server\\share\\some\\'), 'c:\\', URI.file('c:\\'));
        }
        else {
            assertResolve(URI.file('/foo/bar'), 'file.js', URI.file('/foo/bar/file.js'));
            assertResolve(URI.file('/foo/bar'), './file.js', URI.file('/foo/bar/file.js'));
            assertResolve(URI.file('/foo/bar'), '/file.js', URI.file('/file.js'));
            assertResolve(URI.file('/foo/bar/'), 'file.js', URI.file('/foo/bar/file.js'));
            assertResolve(URI.file('/'), 'file.js', URI.file('/file.js'));
            assertResolve(URI.file(''), './file.js', URI.file('/file.js'));
            assertResolve(URI.file(''), '/file.js', URI.file('/file.js'));
        }
        assertResolve(URI.parse('foo://server/foo/bar'), 'file.js', URI.parse('foo://server/foo/bar/file.js'));
        assertResolve(URI.parse('foo://server/foo/bar'), './file.js', URI.parse('foo://server/foo/bar/file.js'));
        assertResolve(URI.parse('foo://server/foo/bar'), './file.js', URI.parse('foo://server/foo/bar/file.js'));
        assertResolve(URI.parse('foo://server/foo/bar'), 'c:\\a1\\b1', URI.parse('foo://server/c:/a1/b1'));
        assertResolve(URI.parse('foo://server/foo/bar'), 'c:\\', URI.parse('foo://server/c:'));
    });
    function assertIsEqual(u1, u2, ignoreCase, expected) {
        const util = ignoreCase ? extUriIgnorePathCase : extUri;
        assert.strictEqual(util.isEqual(u1, u2), expected, `${u1.toString()}${expected ? '===' : '!=='}${u2.toString()}`);
        assert.strictEqual(util.compare(u1, u2) === 0, expected);
        assert.strictEqual(util.getComparisonKey(u1) === util.getComparisonKey(u2), expected, `comparison keys ${u1.toString()}, ${u2.toString()}`);
        assert.strictEqual(util.isEqualOrParent(u1, u2), expected, `isEqualOrParent ${u1.toString()}, ${u2.toString()}`);
        if (!ignoreCase) {
            assert.strictEqual(u1.toString() === u2.toString(), expected);
        }
    }
    test('isEqual', () => {
        const fileURI = isWindows ? URI.file('c:\\foo\\bar') : URI.file('/foo/bar');
        const fileURI2 = isWindows ? URI.file('C:\\foo\\Bar') : URI.file('/foo/Bar');
        assertIsEqual(fileURI, fileURI, true, true);
        assertIsEqual(fileURI, fileURI, false, true);
        assertIsEqual(fileURI, fileURI, undefined, true);
        assertIsEqual(fileURI, fileURI2, true, true);
        assertIsEqual(fileURI, fileURI2, false, false);
        const fileURI3 = URI.parse('foo://server:453/foo/bar');
        const fileURI4 = URI.parse('foo://server:453/foo/Bar');
        assertIsEqual(fileURI3, fileURI3, true, true);
        assertIsEqual(fileURI3, fileURI3, false, true);
        assertIsEqual(fileURI3, fileURI3, undefined, true);
        assertIsEqual(fileURI3, fileURI4, true, true);
        assertIsEqual(fileURI3, fileURI4, false, false);
        assertIsEqual(fileURI, fileURI3, true, false);
        assertIsEqual(URI.parse('file://server'), URI.parse('file://server/'), true, true);
        assertIsEqual(URI.parse('http://server'), URI.parse('http://server/'), true, true);
        assertIsEqual(URI.parse('foo://server'), URI.parse('foo://server/'), true, false); // only selected scheme have / as the default path
        assertIsEqual(URI.parse('foo://server/foo'), URI.parse('foo://server/foo/'), true, false);
        assertIsEqual(URI.parse('foo://server/foo'), URI.parse('foo://server/foo?'), true, true);
        const fileURI5 = URI.parse('foo://server:453/foo/bar?q=1');
        const fileURI6 = URI.parse('foo://server:453/foo/bar#xy');
        assertIsEqual(fileURI5, fileURI5, true, true);
        assertIsEqual(fileURI5, fileURI3, true, false);
        assertIsEqual(fileURI6, fileURI6, true, true);
        assertIsEqual(fileURI6, fileURI5, true, false);
        assertIsEqual(fileURI6, fileURI3, true, false);
    });
    test('isEqualOrParent', () => {
        const fileURI = isWindows ? URI.file('c:\\foo\\bar') : URI.file('/foo/bar');
        const fileURI2 = isWindows ? URI.file('c:\\foo') : URI.file('/foo');
        const fileURI2b = isWindows ? URI.file('C:\\Foo\\') : URI.file('/Foo/');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI, fileURI), true, '1');
        assert.strictEqual(extUri.isEqualOrParent(fileURI, fileURI), true, '2');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI, fileURI2), true, '3');
        assert.strictEqual(extUri.isEqualOrParent(fileURI, fileURI2), true, '4');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI, fileURI2b), true, '5');
        assert.strictEqual(extUri.isEqualOrParent(fileURI, fileURI2b), false, '6');
        assert.strictEqual(extUri.isEqualOrParent(fileURI2, fileURI), false, '7');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI2b, fileURI2), true, '8');
        const fileURI3 = URI.parse('foo://server:453/foo/bar/goo');
        const fileURI4 = URI.parse('foo://server:453/foo/');
        const fileURI5 = URI.parse('foo://server:453/foo');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI3, fileURI3, true), true, '11');
        assert.strictEqual(extUri.isEqualOrParent(fileURI3, fileURI3), true, '12');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI3, fileURI4, true), true, '13');
        assert.strictEqual(extUri.isEqualOrParent(fileURI3, fileURI4), true, '14');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI3, fileURI, true), false, '15');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI5, fileURI5, true), true, '16');
        const fileURI6 = URI.parse('foo://server:453/foo?q=1');
        const fileURI7 = URI.parse('foo://server:453/foo/bar?q=1');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI6, fileURI5), false, '17');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI6, fileURI6), true, '18');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI7, fileURI6), true, '19');
        assert.strictEqual(extUriIgnorePathCase.isEqualOrParent(fileURI7, fileURI5), false, '20');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3Jlc291cmNlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDcEQsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixRQUFRLEVBQ1IsT0FBTyxFQUNQLGVBQWUsRUFDZixNQUFNLEVBQ04sb0JBQW9CLEVBQ3BCLHdCQUF3QixFQUN4QixjQUFjLEVBQ2QsUUFBUSxFQUNSLGFBQWEsRUFDYixZQUFZLEVBQ1osMkJBQTJCLEVBQzNCLFdBQVcsR0FDWCxNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFFBQVE7UUFDUixJQUFJLFNBQVMsR0FBRztZQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUM7WUFDbEMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQztZQUNsQyxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDO1NBQ2xDLENBQUE7UUFFRCxJQUFJLFFBQVEsR0FBRyxlQUFlLENB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