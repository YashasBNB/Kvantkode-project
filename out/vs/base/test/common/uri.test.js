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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3VyaS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO0lBQ2pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUE7SUFDakYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLElBQUksU0FBUyxFQUFFLENBQUM7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LENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBLENBQUMsbUNBQW1DO1FBQzdGLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDM0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUU7UUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFD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