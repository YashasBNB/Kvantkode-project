/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as resources from '../../../../../base/common/resources.js';
import assert from 'assert';
import { TestEnvironmentService, TestLifecycleService, TestPathService, TestRemoteAgentService, } from '../../../../test/browser/workbenchTestServices.js';
import { URI } from '../../../../../base/common/uri.js';
import { LabelService } from '../../common/labelService.js';
import { TestContextService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { TestWorkspace, Workspace, } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { Memento } from '../../../../common/memento.js';
import { sep } from '../../../../../base/common/path.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('URI Label', () => {
    let labelService;
    let storageService;
    setup(() => {
        storageService = new TestStorageService();
        labelService = new LabelService(TestEnvironmentService, new TestContextService(), new TestPathService(URI.file('/foobar')), new TestRemoteAgentService(), storageService, new TestLifecycleService());
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('custom scheme', function () {
        labelService.registerFormatter({
            scheme: 'vscode',
            formatting: {
                label: 'LABEL/${path}/${authority}/END',
                separator: '/',
                tildify: true,
                normalizeDriveLetter: true,
            },
        });
        const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), 'LABEL//1/2/3/4/5/microsoft.com/END');
        assert.strictEqual(labelService.getUriBasenameLabel(uri1), 'END');
    });
    test('file scheme', function () {
        labelService.registerFormatter({
            scheme: 'file',
            formatting: {
                label: '${path}',
                separator: sep,
                tildify: !isWindows,
                normalizeDriveLetter: isWindows,
            },
        });
        const uri1 = TestWorkspace.folders[0].uri.with({
            path: TestWorkspace.folders[0].uri.path.concat('/a/b/c/d'),
        });
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: true }), isWindows ? 'a\\b\\c\\d' : 'a/b/c/d');
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), isWindows ? 'C:\\testWorkspace\\a\\b\\c\\d' : '/testWorkspace/a/b/c/d');
        assert.strictEqual(labelService.getUriBasenameLabel(uri1), 'd');
        const uri2 = URI.file('c:\\1/2/3');
        assert.strictEqual(labelService.getUriLabel(uri2, { relative: false }), isWindows ? 'C:\\1\\2\\3' : '/c:\\1/2/3');
        assert.strictEqual(labelService.getUriBasenameLabel(uri2), '3');
    });
    test('separator', function () {
        labelService.registerFormatter({
            scheme: 'vscode',
            formatting: {
                label: 'LABEL\\${path}\\${authority}\\END',
                separator: '\\',
                tildify: true,
                normalizeDriveLetter: true,
            },
        });
        const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), 'LABEL\\\\1\\2\\3\\4\\5\\microsoft.com\\END');
        assert.strictEqual(labelService.getUriBasenameLabel(uri1), 'END');
    });
    test('custom authority', function () {
        labelService.registerFormatter({
            scheme: 'vscode',
            authority: 'micro*',
            formatting: {
                label: 'LABEL/${path}/${authority}/END',
                separator: '/',
            },
        });
        const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), 'LABEL//1/2/3/4/5/microsoft.com/END');
        assert.strictEqual(labelService.getUriBasenameLabel(uri1), 'END');
    });
    test('mulitple authority', function () {
        labelService.registerFormatter({
            scheme: 'vscode',
            authority: 'not_matching_but_long',
            formatting: {
                label: 'first',
                separator: '/',
            },
        });
        labelService.registerFormatter({
            scheme: 'vscode',
            authority: 'microsof*',
            formatting: {
                label: 'second',
                separator: '/',
            },
        });
        labelService.registerFormatter({
            scheme: 'vscode',
            authority: 'mi*',
            formatting: {
                label: 'third',
                separator: '/',
            },
        });
        // Make sure the most specific authority is picked
        const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), 'second');
        assert.strictEqual(labelService.getUriBasenameLabel(uri1), 'second');
    });
    test('custom query', function () {
        labelService.registerFormatter({
            scheme: 'vscode',
            formatting: {
                label: 'LABEL${query.prefix}: ${query.path}/END',
                separator: '/',
                tildify: true,
                normalizeDriveLetter: true,
            },
        });
        const uri1 = URI.parse(`vscode://microsoft.com/1/2/3/4/5?${encodeURIComponent(JSON.stringify({ prefix: 'prefix', path: 'path' }))}`);
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), 'LABELprefix: path/END');
    });
    test('custom query without value', function () {
        labelService.registerFormatter({
            scheme: 'vscode',
            formatting: {
                label: 'LABEL${query.prefix}: ${query.path}/END',
                separator: '/',
                tildify: true,
                normalizeDriveLetter: true,
            },
        });
        const uri1 = URI.parse(`vscode://microsoft.com/1/2/3/4/5?${encodeURIComponent(JSON.stringify({ path: 'path' }))}`);
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), 'LABEL: path/END');
    });
    test('custom query without query json', function () {
        labelService.registerFormatter({
            scheme: 'vscode',
            formatting: {
                label: 'LABEL${query.prefix}: ${query.path}/END',
                separator: '/',
                tildify: true,
                normalizeDriveLetter: true,
            },
        });
        const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5?path=foo');
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), 'LABEL: /END');
    });
    test('custom query without query', function () {
        labelService.registerFormatter({
            scheme: 'vscode',
            formatting: {
                label: 'LABEL${query.prefix}: ${query.path}/END',
                separator: '/',
                tildify: true,
                normalizeDriveLetter: true,
            },
        });
        const uri1 = URI.parse('vscode://microsoft.com/1/2/3/4/5');
        assert.strictEqual(labelService.getUriLabel(uri1, { relative: false }), 'LABEL: /END');
    });
    test('label caching', () => {
        const m = new Memento('cachedResourceLabelFormatters2', storageService).getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        const makeFormatter = (scheme) => ({
            formatting: { label: `\${path} (${scheme})`, separator: '/' },
            scheme,
        });
        assert.deepStrictEqual(m, {});
        // registers a new formatter:
        labelService.registerCachedFormatter(makeFormatter('a'));
        assert.deepStrictEqual(m, { formatters: [makeFormatter('a')] });
        // registers a 2nd formatter:
        labelService.registerCachedFormatter(makeFormatter('b'));
        assert.deepStrictEqual(m, { formatters: [makeFormatter('b'), makeFormatter('a')] });
        // promotes a formatter on re-register:
        labelService.registerCachedFormatter(makeFormatter('a'));
        assert.deepStrictEqual(m, { formatters: [makeFormatter('a'), makeFormatter('b')] });
        // no-ops if already in first place:
        labelService.registerCachedFormatter(makeFormatter('a'));
        assert.deepStrictEqual(m, { formatters: [makeFormatter('a'), makeFormatter('b')] });
        // limits the cache:
        for (let i = 0; i < 100; i++) {
            labelService.registerCachedFormatter(makeFormatter(`i${i}`));
        }
        const expected = [];
        for (let i = 50; i < 100; i++) {
            expected.unshift(makeFormatter(`i${i}`));
        }
        assert.deepStrictEqual(m, { formatters: expected });
        delete m.formatters;
    });
});
suite('multi-root workspace', () => {
    let labelService;
    const disposables = new DisposableStore();
    setup(() => {
        const sources = URI.file('folder1/src');
        const tests = URI.file('folder1/test');
        const other = URI.file('folder2');
        labelService = disposables.add(new LabelService(TestEnvironmentService, new TestContextService(new Workspace('test-workspace', [
            new WorkspaceFolder({ uri: sources, index: 0, name: 'Sources' }),
            new WorkspaceFolder({ uri: tests, index: 1, name: 'Tests' }),
            new WorkspaceFolder({ uri: other, index: 2, name: resources.basename(other) }),
        ])), new TestPathService(), new TestRemoteAgentService(), disposables.add(new TestStorageService()), disposables.add(new TestLifecycleService())));
    });
    teardown(() => {
        disposables.clear();
    });
    test('labels of files in multiroot workspaces are the foldername followed by offset from the folder', () => {
        labelService.registerFormatter({
            scheme: 'file',
            formatting: {
                label: '${authority}${path}',
                separator: '/',
                tildify: false,
                normalizeDriveLetter: false,
                authorityPrefix: '//',
                workspaceSuffix: '',
            },
        });
        const tests = {
            'folder1/src/file': 'Sources • file',
            'folder1/src/folder/file': 'Sources • folder/file',
            'folder1/src': 'Sources',
            'folder1/other': '/folder1/other',
            'folder2/other': 'folder2 • other',
        };
        Object.entries(tests).forEach(([path, label]) => {
            const generated = labelService.getUriLabel(URI.file(path), { relative: true });
            assert.strictEqual(generated, label);
        });
    });
    test('labels with context after path', () => {
        labelService.registerFormatter({
            scheme: 'file',
            formatting: {
                label: '${path} (${scheme})',
                separator: '/',
            },
        });
        const tests = {
            'folder1/src/file': 'Sources • file (file)',
            'folder1/src/folder/file': 'Sources • folder/file (file)',
            'folder1/src': 'Sources',
            'folder1/other': '/folder1/other (file)',
            'folder2/other': 'folder2 • other (file)',
        };
        Object.entries(tests).forEach(([path, label]) => {
            const generated = labelService.getUriLabel(URI.file(path), { relative: true });
            assert.strictEqual(generated, label, path);
        });
    });
    test('stripPathStartingSeparator', () => {
        labelService.registerFormatter({
            scheme: 'file',
            formatting: {
                label: '${path}',
                separator: '/',
                stripPathStartingSeparator: true,
            },
        });
        const tests = {
            'folder1/src/file': 'Sources • file',
            'other/blah': 'other/blah',
        };
        Object.entries(tests).forEach(([path, label]) => {
            const generated = labelService.getUriLabel(URI.file(path), { relative: true });
            assert.strictEqual(generated, label, path);
        });
    });
    test('relative label without formatter', () => {
        const rootFolder = URI.parse('myscheme://myauthority/');
        labelService = disposables.add(new LabelService(TestEnvironmentService, new TestContextService(new Workspace('test-workspace', [
            new WorkspaceFolder({ uri: rootFolder, index: 0, name: 'FSProotFolder' }),
        ])), new TestPathService(undefined, rootFolder.scheme), new TestRemoteAgentService(), disposables.add(new TestStorageService()), disposables.add(new TestLifecycleService())));
        const generated = labelService.getUriLabel(URI.parse('myscheme://myauthority/some/folder/test.txt'), { relative: true });
        if (isWindows) {
            assert.strictEqual(generated, 'some\\folder\\test.txt');
        }
        else {
            assert.strictEqual(generated, 'some/folder/test.txt');
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('workspace at FSP root', () => {
    let labelService;
    setup(() => {
        const rootFolder = URI.parse('myscheme://myauthority/');
        labelService = new LabelService(TestEnvironmentService, new TestContextService(new Workspace('test-workspace', [
            new WorkspaceFolder({ uri: rootFolder, index: 0, name: 'FSProotFolder' }),
        ])), new TestPathService(), new TestRemoteAgentService(), new TestStorageService(), new TestLifecycleService());
        labelService.registerFormatter({
            scheme: 'myscheme',
            formatting: {
                label: '${scheme}://${authority}${path}',
                separator: '/',
                tildify: false,
                normalizeDriveLetter: false,
                workspaceSuffix: '',
                authorityPrefix: '',
                stripPathStartingSeparator: false,
            },
        });
    });
    test('non-relative label', () => {
        const tests = {
            'myscheme://myauthority/myFile1.txt': 'myscheme://myauthority/myFile1.txt',
            'myscheme://myauthority/folder/myFile2.txt': 'myscheme://myauthority/folder/myFile2.txt',
        };
        Object.entries(tests).forEach(([uriString, label]) => {
            const generated = labelService.getUriLabel(URI.parse(uriString), { relative: false });
            assert.strictEqual(generated, label);
        });
    });
    test('relative label', () => {
        const tests = {
            'myscheme://myauthority/myFile1.txt': 'myFile1.txt',
            'myscheme://myauthority/folder/myFile2.txt': 'folder/myFile2.txt',
        };
        Object.entries(tests).forEach(([uriString, label]) => {
            const generated = labelService.getUriLabel(URI.parse(uriString), { relative: true });
            assert.strictEqual(generated, label);
        });
    });
    test('relative label with explicit path separator', () => {
        let generated = labelService.getUriLabel(URI.parse('myscheme://myauthority/some/folder/test.txt'), { relative: true, separator: '/' });
        assert.strictEqual(generated, 'some/folder/test.txt');
        generated = labelService.getUriLabel(URI.parse('myscheme://myauthority/some/folder/test.txt'), {
            relative: true,
            separator: '\\',
        });
        assert.strictEqual(generated, 'some\\folder\\test.txt');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xhYmVsL3Rlc3QvYnJvd3Nlci9sYWJlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxTQUFTLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixzQkFBc0IsR0FDdEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsa0JBQWtCLEdBQ2xCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixhQUFhLEVBQ2IsU0FBUyxHQUNULE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLElBQUksWUFBMEIsQ0FBQTtJQUM5QixJQUFJLGNBQWtDLENBQUE7SUFF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