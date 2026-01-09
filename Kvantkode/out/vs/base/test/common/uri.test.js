/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isWindows } from '../../common/platform.js';
import { URI, isUriComponents } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('URI', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('file#toString', () => {
        assert.strictEqual(URI.file('c:/win/path').toString(), 'file:///c%3A/win/path');
        assert.strictEqual(URI.file('C:/win/path').toString(), 'file:///c%3A/win/path');
        assert.strictEqual(URI.file('c:/win/path/').toString(), 'file:///c%3A/win/path/');
        assert.strictEqual(URI.file('/c:/win/path').toString(), 'file:///c%3A/win/path');
    });
    test('URI.file (win-special)', () => {
        if (isWindows) {
            assert.strictEqual(URI.file('c:\\win\\path').toString(), 'file:///c%3A/win/path');
            assert.strictEqual(URI.file('c:\\win/path').toString(), 'file:///c%3A/win/path');
        }
        else {
            assert.strictEqual(URI.file('c:\\win\\path').toString(), 'file:///c%3A%5Cwin%5Cpath');
            assert.strictEqual(URI.file('c:\\win/path').toString(), 'file:///c%3A%5Cwin/path');
        }
    });
    test('file#fsPath (win-special)', () => {
        if (isWindows) {
            assert.strictEqual(URI.file('c:\\win\\path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('c:\\win/path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('c:/win/path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('c:/win/path/').fsPath, 'c:\\win\\path\\');
            assert.strictEqual(URI.file('C:/win/path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('/c:/win/path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('./c/win/path').fsPath, '\\.\\c\\win\\path');
        }
        else {
            assert.strictEqual(URI.file('c:/win/path').fsPath, 'c:/win/path');
            assert.strictEqual(URI.file('c:/win/path/').fsPath, 'c:/win/path/');
            assert.strictEqual(URI.file('C:/win/path').fsPath, 'c:/win/path');
            assert.strictEqual(URI.file('/c:/win/path').fsPath, 'c:/win/path');
            assert.strictEqual(URI.file('./c/win/path').fsPath, '/./c/win/path');
        }
    });
    test('URI#fsPath - no `fsPath` when no `path`', () => {
        const value = URI.parse('file://%2Fhome%2Fticino%2Fdesktop%2Fcpluscplus%2Ftest.cpp');
        assert.strictEqual(value.authority, '/home/ticino/desktop/cpluscplus/test.cpp');
        assert.strictEqual(value.path, '/');
        if (isWindows) {
            assert.strictEqual(value.fsPath, '\\');
        }
        else {
            assert.strictEqual(value.fsPath, '/');
        }
    });
    test('http#toString', () => {
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'www.example.com', path: '/my/path' }).toString(), 'http://www.example.com/my/path');
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'www.example.com', path: '/my/path' }).toString(), 'http://www.example.com/my/path');
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'www.EXAMPLE.com', path: '/my/path' }).toString(), 'http://www.example.com/my/path');
        assert.strictEqual(URI.from({ scheme: 'http', authority: '', path: 'my/path' }).toString(), 'http:/my/path');
        assert.strictEqual(URI.from({ scheme: 'http', authority: '', path: '/my/path' }).toString(), 'http:/my/path');
        //http://example.com/#test=true
        assert.strictEqual(URI.from({
            scheme: 'http',
            authority: 'example.com',
            path: '/',
            query: 'test=true',
        }).toString(), 'http://example.com/?test%3Dtrue');
        assert.strictEqual(URI.from({
            scheme: 'http',
            authority: 'example.com',
            path: '/',
            query: '',
            fragment: 'test=true',
        }).toString(), 'http://example.com/#test%3Dtrue');
    });
    test('http#toString, encode=FALSE', () => {
        assert.strictEqual(URI.from({
            scheme: 'http',
            authority: 'example.com',
            path: '/',
            query: 'test=true',
        }).toString(true), 'http://example.com/?test=true');
        assert.strictEqual(URI.from({
            scheme: 'http',
            authority: 'example.com',
            path: '/',
            query: '',
            fragment: 'test=true',
        }).toString(true), 'http://example.com/#test=true');
        assert.strictEqual(URI.from({ scheme: 'http', path: '/api/files/test.me', query: 't=1234' }).toString(true), 'http:/api/files/test.me?t=1234');
        const value = URI.parse('file://shares/pröjects/c%23/#l12');
        assert.strictEqual(value.authority, 'shares');
        assert.strictEqual(value.path, '/pröjects/c#/');
        assert.strictEqual(value.fragment, 'l12');
        assert.strictEqual(value.toString(), 'file://shares/pr%C3%B6jects/c%23/#l12');
        assert.strictEqual(value.toString(true), 'file://shares/pröjects/c%23/#l12');
        const uri2 = URI.parse(value.toString(true));
        const uri3 = URI.parse(value.toString());
        assert.strictEqual(uri2.authority, uri3.authority);
        assert.strictEqual(uri2.path, uri3.path);
        assert.strictEqual(uri2.query, uri3.query);
        assert.strictEqual(uri2.fragment, uri3.fragment);
    });
    test('with, identity', () => {
        const uri = URI.parse('foo:bar/path');
        let uri2 = uri.with(null);
        assert.ok(uri === uri2);
        uri2 = uri.with(undefined);
        assert.ok(uri === uri2);
        uri2 = uri.with({});
        assert.ok(uri === uri2);
        uri2 = uri.with({ scheme: 'foo', path: 'bar/path' });
        assert.ok(uri === uri2);
    });
    test('with, changes', () => {
        assert.strictEqual(URI.parse('before:some/file/path').with({ scheme: 'after' }).toString(), 'after:some/file/path');
        assert.strictEqual(URI.from({ scheme: 's' })
            .with({ scheme: 'http', path: '/api/files/test.me', query: 't=1234' })
            .toString(), 'http:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' })
            .with({
            scheme: 'http',
            authority: '',
            path: '/api/files/test.me',
            query: 't=1234',
            fragment: '',
        })
            .toString(), 'http:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' })
            .with({
            scheme: 'https',
            authority: '',
            path: '/api/files/test.me',
            query: 't=1234',
            fragment: '',
        })
            .toString(), 'https:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' })
            .with({
            scheme: 'HTTP',
            authority: '',
            path: '/api/files/test.me',
            query: 't=1234',
            fragment: '',
        })
            .toString(), 'HTTP:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' })
            .with({
            scheme: 'HTTPS',
            authority: '',
            path: '/api/files/test.me',
            query: 't=1234',
            fragment: '',
        })
            .toString(), 'HTTPS:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' })
            .with({
            scheme: 'boo',
            authority: '',
            path: '/api/files/test.me',
            query: 't=1234',
            fragment: '',
        })
            .toString(), 'boo:/api/files/test.me?t%3D1234');
    });
    test('with, remove components #8465', () => {
        assert.strictEqual(URI.parse('scheme://authority/path').with({ authority: '' }).toString(), 'scheme:/path');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: 'authority' }).with({ authority: '' }).toString(), 'scheme:/path');
        assert.strictEqual(URI.parse('scheme:/path')
            .with({ authority: 'authority' })
            .with({ authority: null })
            .toString(), 'scheme:/path');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: 'authority' }).with({ path: '' }).toString(), 'scheme://authority');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: 'authority' }).with({ path: null }).toString(), 'scheme://authority');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: '' }).toString(), 'scheme:/path');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: null }).toString(), 'scheme:/path');
    });
    test('with, validation', () => {
        const uri = URI.parse('foo:bar/path');
        assert.throws(() => uri.with({ scheme: 'fai:l' }));
        assert.throws(() => uri.with({ scheme: 'fäil' }));
        assert.throws(() => uri.with({ authority: 'fail' }));
        assert.throws(() => uri.with({ path: '//fail' }));
    });
    test('parse', () => {
        let value = URI.parse('http:/api/files/test.me?t=1234');
        assert.strictEqual(value.scheme, 'http');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/api/files/test.me');
        assert.strictEqual(value.query, 't=1234');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('http://api/files/test.me?t=1234');
        assert.strictEqual(value.scheme, 'http');
        assert.strictEqual(value.authority, 'api');
        assert.strictEqual(value.path, '/files/test.me');
        assert.strictEqual(value.query, 't=1234');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('file:///c:/test/me');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/c:/test/me');
        assert.strictEqual(value.fragment, '');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fsPath, isWindows ? 'c:\\test\\me' : 'c:/test/me');
        value = URI.parse('file://shares/files/c%23/p.cs');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, 'shares');
        assert.strictEqual(value.path, '/files/c#/p.cs');
        assert.strictEqual(value.fragment, '');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fsPath, isWindows ? '\\\\shares\\files\\c#\\p.cs' : '//shares/files/c#/p.cs');
        value = URI.parse('file:///c:/Source/Z%C3%BCrich%20or%20Zurich%20(%CB%88zj%CA%8A%C9%99r%C9%AAk,/Code/resources/app/plugins/c%23/plugin.json');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/c:/Source/Zürich or Zurich (ˈzjʊərɪk,/Code/resources/app/plugins/c#/plugin.json');
        assert.strictEqual(value.fragment, '');
        assert.strictEqual(value.query, '');
        value = URI.parse('file:///c:/test %25/path');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/c:/test %/path');
        assert.strictEqual(value.fragment, '');
        assert.strictEqual(value.query, '');
        value = URI.parse('inmemory:');
        assert.strictEqual(value.scheme, 'inmemory');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('foo:api/files/test');
        assert.strictEqual(value.scheme, 'foo');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, 'api/files/test');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('file:?q');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/');
        assert.strictEqual(value.query, 'q');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('file:#d');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, 'd');
        value = URI.parse('f3ile:#d');
        assert.strictEqual(value.scheme, 'f3ile');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, 'd');
        value = URI.parse('foo+bar:path');
        assert.strictEqual(value.scheme, 'foo+bar');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, 'path');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('foo-bar:path');
        assert.strictEqual(value.scheme, 'foo-bar');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, 'path');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('foo.bar:path');
        assert.strictEqual(value.scheme, 'foo.bar');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, 'path');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
    });
    test('parse, disallow //path when no authority', () => {
        assert.throws(() => URI.parse('file:////shares/files/p.cs'));
    });
    test('URI#file, win-speciale', () => {
        if (isWindows) {
            let value = URI.file('c:\\test\\drive');
            assert.strictEqual(value.path, '/c:/test/drive');
            assert.strictEqual(value.toString(), 'file:///c%3A/test/drive');
            value = URI.file('\\\\shäres\\path\\c#\\plugin.json');
            assert.strictEqual(value.scheme, 'file');
            assert.strictEqual(value.authority, 'shäres');
            assert.strictEqual(value.path, '/path/c#/plugin.json');
            assert.strictEqual(value.fragment, '');
            assert.strictEqual(value.query, '');
            assert.strictEqual(value.toString(), 'file://sh%C3%A4res/path/c%23/plugin.json');
            value = URI.file('\\\\localhost\\c$\\GitDevelopment\\express');
            assert.strictEqual(value.scheme, 'file');
            assert.strictEqual(value.path, '/c$/GitDevelopment/express');
            assert.strictEqual(value.fsPath, '\\\\localhost\\c$\\GitDevelopment\\express');
            assert.strictEqual(value.query, '');
            assert.strictEqual(value.fragment, '');
            assert.strictEqual(value.toString(), 'file://localhost/c%24/GitDevelopment/express');
            value = URI.file('c:\\test with %\\path');
            assert.strictEqual(value.path, '/c:/test with %/path');
            assert.strictEqual(value.toString(), 'file:///c%3A/test%20with%20%25/path');
            value = URI.file('c:\\test with %25\\path');
            assert.strictEqual(value.path, '/c:/test with %25/path');
            assert.strictEqual(value.toString(), 'file:///c%3A/test%20with%20%2525/path');
            value = URI.file('c:\\test with %25\\c#code');
            assert.strictEqual(value.path, '/c:/test with %25/c#code');
            assert.strictEqual(value.toString(), 'file:///c%3A/test%20with%20%2525/c%23code');
            value = URI.file('\\\\shares');
            assert.strictEqual(value.scheme, 'file');
            assert.strictEqual(value.authority, 'shares');
            assert.strictEqual(value.path, '/'); // slash is always there
            value = URI.file('\\\\shares\\');
            assert.strictEqual(value.scheme, 'file');
            assert.strictEqual(value.authority, 'shares');
            assert.strictEqual(value.path, '/');
        }
    });
    test("VSCode URI module's driveLetterPath regex is incorrect, #32961", function () {
        const uri = URI.parse('file:///_:/path');
        assert.strictEqual(uri.fsPath, isWindows ? '\\_:\\path' : '/_:/path');
    });
    test('URI#file, no path-is-uri check', () => {
        // we don't complain here
        const value = URI.file('file://path/to/file');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/file://path/to/file');
    });
    test('URI#file, always slash', () => {
        let value = URI.file('a.file');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/a.file');
        assert.strictEqual(value.toString(), 'file:///a.file');
        value = URI.parse(value.toString());
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/a.file');
        assert.strictEqual(value.toString(), 'file:///a.file');
    });
    test('URI.toString, only scheme and query', () => {
        const value = URI.parse('stuff:?qüery');
        assert.strictEqual(value.toString(), 'stuff:?q%C3%BCery');
    });
    test('URI#toString, upper-case percent espaces', () => {
        const value = URI.parse('file://sh%c3%a4res/path');
        assert.strictEqual(value.toString(), 'file://sh%C3%A4res/path');
    });
    test('URI#toString, lower-case windows drive letter', () => {
        assert.strictEqual(URI.parse('untitled:c:/Users/jrieken/Code/abc.txt').toString(), 'untitled:c%3A/Users/jrieken/Code/abc.txt');
        assert.strictEqual(URI.parse('untitled:C:/Users/jrieken/Code/abc.txt').toString(), 'untitled:c%3A/Users/jrieken/Code/abc.txt');
    });
    test('URI#toString, escape all the bits', () => {
        const value = URI.file('/Users/jrieken/Code/_samples/18500/Mödel + Other Thîngß/model.js');
        assert.strictEqual(value.toString(), 'file:///Users/jrieken/Code/_samples/18500/M%C3%B6del%20%2B%20Other%20Th%C3%AEng%C3%9F/model.js');
    });
    test("URI#toString, don't encode port", () => {
        let value = URI.parse('http://localhost:8080/far');
        assert.strictEqual(value.toString(), 'http://localhost:8080/far');
        value = URI.from({
            scheme: 'http',
            authority: 'löcalhost:8080',
            path: '/far',
            query: undefined,
            fragment: undefined,
        });
        assert.strictEqual(value.toString(), 'http://l%C3%B6calhost:8080/far');
    });
    test('URI#toString, user information in authority', () => {
        let value = URI.parse('http://foo:bar@localhost/far');
        assert.strictEqual(value.toString(), 'http://foo:bar@localhost/far');
        value = URI.parse('http://foo@localhost/far');
        assert.strictEqual(value.toString(), 'http://foo@localhost/far');
        value = URI.parse('http://foo:bAr@localhost:8080/far');
        assert.strictEqual(value.toString(), 'http://foo:bAr@localhost:8080/far');
        value = URI.parse('http://foo@localhost:8080/far');
        assert.strictEqual(value.toString(), 'http://foo@localhost:8080/far');
        value = URI.from({
            scheme: 'http',
            authority: 'föö:bör@löcalhost:8080',
            path: '/far',
            query: undefined,
            fragment: undefined,
        });
        assert.strictEqual(value.toString(), 'http://f%C3%B6%C3%B6:b%C3%B6r@l%C3%B6calhost:8080/far');
    });
    test('correctFileUriToFilePath2', () => {
        const test = (input, expected) => {
            const value = URI.parse(input);
            assert.strictEqual(value.fsPath, expected, 'Result for ' + input);
            const value2 = URI.file(value.fsPath);
            assert.strictEqual(value2.fsPath, expected, 'Result for ' + input);
            assert.strictEqual(value.toString(), value2.toString());
        };
        test('file:///c:/alex.txt', isWindows ? 'c:\\alex.txt' : 'c:/alex.txt');
        test('file:///c:/Source/Z%C3%BCrich%20or%20Zurich%20(%CB%88zj%CA%8A%C9%99r%C9%AAk,/Code/resources/app/plugins', isWindows
            ? 'c:\\Source\\Zürich or Zurich (ˈzjʊərɪk,\\Code\\resources\\app\\plugins'
            : 'c:/Source/Zürich or Zurich (ˈzjʊərɪk,/Code/resources/app/plugins');
        test('file://monacotools/folder/isi.txt', isWindows ? '\\\\monacotools\\folder\\isi.txt' : '//monacotools/folder/isi.txt');
        test('file://monacotools1/certificates/SSL/', isWindows ? '\\\\monacotools1\\certificates\\SSL\\' : '//monacotools1/certificates/SSL/');
    });
    test('URI - http, query & toString', function () {
        let uri = URI.parse('https://go.microsoft.com/fwlink/?LinkId=518008');
        assert.strictEqual(uri.query, 'LinkId=518008');
        assert.strictEqual(uri.toString(true), 'https://go.microsoft.com/fwlink/?LinkId=518008');
        assert.strictEqual(uri.toString(), 'https://go.microsoft.com/fwlink/?LinkId%3D518008');
        let uri2 = URI.parse(uri.toString());
        assert.strictEqual(uri2.query, 'LinkId=518008');
        assert.strictEqual(uri2.query, uri.query);
        uri = URI.parse('https://go.microsoft.com/fwlink/?LinkId=518008&foö&ké¥=üü');
        assert.strictEqual(uri.query, 'LinkId=518008&foö&ké¥=üü');
        assert.strictEqual(uri.toString(true), 'https://go.microsoft.com/fwlink/?LinkId=518008&foö&ké¥=üü');
        assert.strictEqual(uri.toString(), 'https://go.microsoft.com/fwlink/?LinkId%3D518008%26fo%C3%B6%26k%C3%A9%C2%A5%3D%C3%BC%C3%BC');
        uri2 = URI.parse(uri.toString());
        assert.strictEqual(uri2.query, 'LinkId=518008&foö&ké¥=üü');
        assert.strictEqual(uri2.query, uri.query);
        // #24849
        uri = URI.parse('https://twitter.com/search?src=typd&q=%23tag');
        assert.strictEqual(uri.toString(true), 'https://twitter.com/search?src=typd&q=%23tag');
    });
    test('class URI cannot represent relative file paths #34449', function () {
        let path = '/foo/bar';
        assert.strictEqual(URI.file(path).path, path);
        path = 'foo/bar';
        assert.strictEqual(URI.file(path).path, '/foo/bar');
        path = './foo/bar';
        assert.strictEqual(URI.file(path).path, '/./foo/bar'); // missing normalization
        const fileUri1 = URI.parse(`file:foo/bar`);
        assert.strictEqual(fileUri1.path, '/foo/bar');
        assert.strictEqual(fileUri1.authority, '');
        const uri = fileUri1.toString();
        assert.strictEqual(uri, 'file:///foo/bar');
        const fileUri2 = URI.parse(uri);
        assert.strictEqual(fileUri2.path, '/foo/bar');
        assert.strictEqual(fileUri2.authority, '');
    });
    test('Ctrl click to follow hash query param url gets urlencoded #49628', function () {
        let input = 'http://localhost:3000/#/foo?bar=baz';
        let uri = URI.parse(input);
        assert.strictEqual(uri.toString(true), input);
        input = 'http://localhost:3000/foo?bar=baz';
        uri = URI.parse(input);
        assert.strictEqual(uri.toString(true), input);
    });
    test("Unable to open '%A0.txt': URI malformed #76506", function () {
        let uri = URI.file('/foo/%A0.txt');
        let uri2 = URI.parse(uri.toString());
        assert.strictEqual(uri.scheme, uri2.scheme);
        assert.strictEqual(uri.path, uri2.path);
        uri = URI.file('/foo/%2e.txt');
        uri2 = URI.parse(uri.toString());
        assert.strictEqual(uri.scheme, uri2.scheme);
        assert.strictEqual(uri.path, uri2.path);
    });
    test('Bug in URI.isUri() that fails `thing` type comparison #114971', function () {
        const uri = URI.file('/foo/bazz.txt');
        assert.strictEqual(URI.isUri(uri), true);
        assert.strictEqual(URI.isUri(uri.toJSON()), false);
        // fsPath -> getter
        assert.strictEqual(URI.isUri({
            scheme: 'file',
            authority: '',
            path: '/foo/bazz.txt',
            get fsPath() {
                return '/foo/bazz.txt';
            },
            query: '',
            fragment: '',
            with() {
                return this;
            },
            toString() {
                return '';
            },
        }), true);
        // fsPath -> property
        assert.strictEqual(URI.isUri({
            scheme: 'file',
            authority: '',
            path: '/foo/bazz.txt',
            fsPath: '/foo/bazz.txt',
            query: '',
            fragment: '',
            with() {
                return this;
            },
            toString() {
                return '';
            },
        }), true);
    });
    test('isUriComponents', function () {
        assert.ok(isUriComponents(URI.file('a')));
        assert.ok(isUriComponents(URI.file('a').toJSON()));
        assert.ok(isUriComponents(URI.file('')));
        assert.ok(isUriComponents(URI.file('').toJSON()));
        assert.strictEqual(isUriComponents(1), false);
        assert.strictEqual(isUriComponents(true), false);
        assert.strictEqual(isUriComponents('true'), false);
        assert.strictEqual(isUriComponents({}), false);
        assert.strictEqual(isUriComponents({ scheme: '' }), true); // valid components but INVALID uri
        assert.strictEqual(isUriComponents({ scheme: 'fo' }), true);
        assert.strictEqual(isUriComponents({ scheme: 'fo', path: '/p' }), true);
        assert.strictEqual(isUriComponents({ path: '/p' }), false);
    });
    test('from, from(strict), revive', function () {
        assert.throws(() => URI.from({ scheme: '' }, true));
        assert.strictEqual(URI.from({ scheme: '' }).scheme, 'file');
        assert.strictEqual(URI.revive({ scheme: '' }).scheme, '');
    });
    test("Unable to open '%A0.txt': URI malformed #76506, part 2", function () {
        assert.strictEqual(URI.parse('file://some/%.txt').toString(), 'file://some/%25.txt');
        assert.strictEqual(URI.parse('file://some/%A0.txt').toString(), 'file://some/%25A0.txt');
    });
    test.skip('Links in markdown are broken if url contains encoded parameters #79474', function () {
        const strIn = 'https://myhost.com/Redirect?url=http%3A%2F%2Fwww.bing.com%3Fsearch%3Dtom';
        const uri1 = URI.parse(strIn);
        const strOut = uri1.toString();
        const uri2 = URI.parse(strOut);
        assert.strictEqual(uri1.scheme, uri2.scheme);
        assert.strictEqual(uri1.authority, uri2.authority);
        assert.strictEqual(uri1.path, uri2.path);
        assert.strictEqual(uri1.query, uri2.query);
        assert.strictEqual(uri1.fragment, uri2.fragment);
        assert.strictEqual(strIn, strOut); // fails here!!
    });
    test.skip('Uri#parse can break path-component #45515', function () {
        const strIn = 'https://firebasestorage.googleapis.com/v0/b/brewlangerie.appspot.com/o/products%2FzVNZkudXJyq8bPGTXUxx%2FBetterave-Sesame.jpg?alt=media&token=0b2310c4-3ea6-4207-bbde-9c3710ba0437';
        const uri1 = URI.parse(strIn);
        const strOut = uri1.toString();
        const uri2 = URI.parse(strOut);
        assert.strictEqual(uri1.scheme, uri2.scheme);
        assert.strictEqual(uri1.authority, uri2.authority);
        assert.strictEqual(uri1.path, uri2.path);
        assert.strictEqual(uri1.query, uri2.query);
        assert.strictEqual(uri1.fragment, uri2.fragment);
        assert.strictEqual(strIn, strOut); // fails here!!
    });
    test('URI - (de)serialize', function () {
        const values = [
            URI.parse('http://localhost:8080/far'),
            URI.file('c:\\test with %25\\c#code'),
            URI.file('\\\\shäres\\path\\c#\\plugin.json'),
            URI.parse('http://api/files/test.me?t=1234'),
            URI.parse('http://api/files/test.me?t=1234#fff'),
            URI.parse('http://api/files/test.me#fff'),
        ];
        // console.profile();
        // let c = 100000;
        // while (c-- > 0) {
        for (const value of values) {
            const data = value.toJSON();
            const clone = URI.revive(data);
            assert.strictEqual(clone.scheme, value.scheme);
            assert.strictEqual(clone.authority, value.authority);
            assert.strictEqual(clone.path, value.path);
            assert.strictEqual(clone.query, value.query);
            assert.strictEqual(clone.fragment, value.fragment);
            assert.strictEqual(clone.fsPath, value.fsPath);
            assert.strictEqual(clone.toString(), value.toString());
        }
        // }
        // console.profileEnd();
    });
    function assertJoined(base, fragment, expected, checkWithUrl = true) {
        const baseUri = URI.parse(base);
        const newUri = URI.joinPath(baseUri, fragment);
        const actual = newUri.toString(true);
        assert.strictEqual(actual, expected);
        if (checkWithUrl) {
            const actualUrl = new URL(fragment, base).href;
            assert.strictEqual(actualUrl, expected, 'DIFFERENT from URL');
        }
    }
    test('URI#joinPath', function () {
        assertJoined('file:///foo/', '../../bazz', 'file:///bazz');
        assertJoined('file:///foo', '../../bazz', 'file:///bazz');
        assertJoined('file:///foo', '../../bazz', 'file:///bazz');
        assertJoined('file:///foo/bar/', './bazz', 'file:///foo/bar/bazz');
        assertJoined('file:///foo/bar', './bazz', 'file:///foo/bar/bazz', false);
        assertJoined('file:///foo/bar', 'bazz', 'file:///foo/bar/bazz', false);
        // "auto-path" scheme
        assertJoined('file:', 'bazz', 'file:///bazz');
        assertJoined('http://domain', 'bazz', 'http://domain/bazz');
        assertJoined('https://domain', 'bazz', 'https://domain/bazz');
        assertJoined('http:', 'bazz', 'http:/bazz', false);
        assertJoined('https:', 'bazz', 'https:/bazz', false);
        // no "auto-path" scheme with and w/o paths
        assertJoined('foo:/', 'bazz', 'foo:/bazz');
        assertJoined('foo://bar/', 'bazz', 'foo://bar/bazz');
        // no "auto-path" + no path -> error
        assert.throws(() => assertJoined('foo:', 'bazz', ''));
        assert.throws(() => new URL('bazz', 'foo:'));
        assert.throws(() => assertJoined('foo://bar', 'bazz', ''));
        // assert.throws(() => new URL('bazz', 'foo://bar')); Edge, Chrome => THROW, Firefox, Safari => foo://bar/bazz
    });
    test('URI#joinPath (posix)', function () {
        if (isWindows) {
            this.skip();
        }
        assertJoined('file:///c:/foo/', '../../bazz', 'file:///bazz', false);
        assertJoined('file://server/share/c:/', '../../bazz', 'file://server/bazz', false);
        assertJoined('file://server/share/c:', '../../bazz', 'file://server/bazz', false);
        assertJoined('file://ser/foo/', '../../bazz', 'file://ser/bazz', false); // Firefox -> Different, Edge, Chrome, Safar -> OK
        assertJoined('file://ser/foo', '../../bazz', 'file://ser/bazz', false); // Firefox -> Different, Edge, Chrome, Safar -> OK
    });
    test('URI#joinPath (windows)', function () {
        if (!isWindows) {
            this.skip();
        }
        assertJoined('file:///c:/foo/', '../../bazz', 'file:///c:/bazz', false);
        assertJoined('file://server/share/c:/', '../../bazz', 'file://server/share/bazz', false);
        assertJoined('file://server/share/c:', '../../bazz', 'file://server/share/bazz', false);
        assertJoined('file://ser/foo/', '../../bazz', 'file://ser/foo/bazz', false);
        assertJoined('file://ser/foo', '../../bazz', 'file://ser/foo/bazz', false);
        //https://github.com/microsoft/vscode/issues/93831
        assertJoined('file:///c:/foo/bar', './other/foo.img', 'file:///c:/foo/bar/other/foo.img', false);
    });
    test('vscode-uri: URI.toString() wrongly encode IPv6 literals #154048', function () {
        assert.strictEqual(URI.parse('http://[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html').toString(), 'http://[fedc:ba98:7654:3210:fedc:ba98:7654:3210]:80/index.html');
        assert.strictEqual(URI.parse('http://user@[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html').toString(), 'http://user@[fedc:ba98:7654:3210:fedc:ba98:7654:3210]:80/index.html');
        assert.strictEqual(URI.parse('http://us[er@[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html').toString(), 'http://us%5Ber@[fedc:ba98:7654:3210:fedc:ba98:7654:3210]:80/index.html');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdXJpLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7SUFDakIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtJQUNqRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFD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