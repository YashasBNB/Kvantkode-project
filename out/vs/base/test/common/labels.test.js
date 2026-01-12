/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as labels from '../../common/labels.js';
import { isMacintosh, isWindows } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Labels', () => {
    ;
    (!isWindows ? test.skip : test)('shorten - windows', () => {
        // nothing to shorten
        assert.deepStrictEqual(labels.shorten(['a']), ['a']);
        assert.deepStrictEqual(labels.shorten(['a', 'b']), ['a', 'b']);
        assert.deepStrictEqual(labels.shorten(['a', 'b', 'c']), ['a', 'b', 'c']);
        assert.deepStrictEqual(labels.shorten(['\\\\x\\a', '\\\\x\\a']), ['\\\\x\\a', '\\\\x\\a']);
        assert.deepStrictEqual(labels.shorten(['C:\\a', 'C:\\b']), ['C:\\a', 'C:\\b']);
        // completely different paths
        assert.deepStrictEqual(labels.shorten(['a\\b', 'c\\d', 'e\\f']), ['…\\b', '…\\d', '…\\f']);
        // same beginning
        assert.deepStrictEqual(labels.shorten(['a', 'a\\b']), ['a', '…\\b']);
        assert.deepStrictEqual(labels.shorten(['a\\b', 'a\\b\\c']), ['…\\b', '…\\c']);
        assert.deepStrictEqual(labels.shorten(['a', 'a\\b', 'a\\b\\c']), ['a', '…\\b', '…\\c']);
        assert.deepStrictEqual(labels.shorten(['x:\\a\\b', 'x:\\a\\c']), ['x:\\…\\b', 'x:\\…\\c']);
        assert.deepStrictEqual(labels.shorten(['\\\\a\\b', '\\\\a\\c']), ['\\\\a\\b', '\\\\a\\c']);
        // same ending
        assert.deepStrictEqual(labels.shorten(['a', 'b\\a']), ['a', 'b\\…']);
        assert.deepStrictEqual(labels.shorten(['a\\b\\c', 'd\\b\\c']), ['a\\…', 'd\\…']);
        assert.deepStrictEqual(labels.shorten(['a\\b\\c\\d', 'f\\b\\c\\d']), ['a\\…', 'f\\…']);
        assert.deepStrictEqual(labels.shorten(['d\\e\\a\\b\\c', 'd\\b\\c']), ['…\\a\\…', 'd\\b\\…']);
        assert.deepStrictEqual(labels.shorten(['a\\b\\c\\d', 'a\\f\\b\\c\\d']), ['a\\b\\…', '…\\f\\…']);
        assert.deepStrictEqual(labels.shorten(['a\\b\\a', 'b\\b\\a']), ['a\\b\\…', 'b\\b\\…']);
        assert.deepStrictEqual(labels.shorten(['d\\f\\a\\b\\c', 'h\\d\\b\\c']), ['…\\a\\…', 'h\\…']);
        assert.deepStrictEqual(labels.shorten(['a\\b\\c', 'x:\\0\\a\\b\\c']), ['a\\b\\c', 'x:\\0\\…']);
        assert.deepStrictEqual(labels.shorten(['x:\\a\\b\\c', 'x:\\0\\a\\b\\c']), [
            'x:\\a\\…',
            'x:\\0\\…',
        ]);
        assert.deepStrictEqual(labels.shorten(['x:\\a\\b', 'y:\\a\\b']), ['x:\\…', 'y:\\…']);
        assert.deepStrictEqual(labels.shorten(['x:\\a', 'x:\\c']), ['x:\\a', 'x:\\c']);
        assert.deepStrictEqual(labels.shorten(['x:\\a\\b', 'y:\\x\\a\\b']), ['x:\\…', 'y:\\…']);
        assert.deepStrictEqual(labels.shorten(['\\\\x\\b', '\\\\y\\b']), ['\\\\x\\…', '\\\\y\\…']);
        assert.deepStrictEqual(labels.shorten(['\\\\x\\a', '\\\\x\\b']), ['\\\\x\\a', '\\\\x\\b']);
        // same name ending
        assert.deepStrictEqual(labels.shorten(['a\\b', 'a\\c', 'a\\e-b']), ['…\\b', '…\\c', '…\\e-b']);
        // same in the middle
        assert.deepStrictEqual(labels.shorten(['a\\b\\c', 'd\\b\\e']), ['…\\c', '…\\e']);
        // case-sensetive
        assert.deepStrictEqual(labels.shorten(['a\\b\\c', 'd\\b\\C']), ['…\\c', '…\\C']);
        // empty or null
        assert.deepStrictEqual(labels.shorten(['', null]), ['.\\', null]);
        assert.deepStrictEqual(labels.shorten(['a', 'a\\b', 'a\\b\\c', 'd\\b\\c', 'd\\b']), [
            'a',
            'a\\b',
            'a\\b\\c',
            'd\\b\\c',
            'd\\b',
        ]);
        assert.deepStrictEqual(labels.shorten(['a', 'a\\b', 'b']), ['a', 'a\\b', 'b']);
        assert.deepStrictEqual(labels.shorten(['', 'a', 'b', 'b\\c', 'a\\c']), [
            '.\\',
            'a',
            'b',
            'b\\c',
            'a\\c',
        ]);
        assert.deepStrictEqual(labels.shorten([
            'src\\vs\\workbench\\parts\\execution\\electron-sandbox',
            'src\\vs\\workbench\\parts\\execution\\electron-sandbox\\something',
            'src\\vs\\workbench\\parts\\terminal\\electron-sandbox',
        ]), ['…\\execution\\electron-sandbox', '…\\something', '…\\terminal\\…']);
    });
    (isWindows ? test.skip : test)('shorten - not windows', () => {
        // nothing to shorten
        assert.deepStrictEqual(labels.shorten(['a']), ['a']);
        assert.deepStrictEqual(labels.shorten(['a', 'b']), ['a', 'b']);
        assert.deepStrictEqual(labels.shorten(['/a', '/b']), ['/a', '/b']);
        assert.deepStrictEqual(labels.shorten(['~/a/b/c', '~/a/b/c']), ['~/a/b/c', '~/a/b/c']);
        assert.deepStrictEqual(labels.shorten(['a', 'b', 'c']), ['a', 'b', 'c']);
        // completely different paths
        assert.deepStrictEqual(labels.shorten(['a/b', 'c/d', 'e/f']), ['…/b', '…/d', '…/f']);
        // same beginning
        assert.deepStrictEqual(labels.shorten(['a', 'a/b']), ['a', '…/b']);
        assert.deepStrictEqual(labels.shorten(['a/b', 'a/b/c']), ['…/b', '…/c']);
        assert.deepStrictEqual(labels.shorten(['a', 'a/b', 'a/b/c']), ['a', '…/b', '…/c']);
        assert.deepStrictEqual(labels.shorten(['/a/b', '/a/c']), ['/a/b', '/a/c']);
        // same ending
        assert.deepStrictEqual(labels.shorten(['a', 'b/a']), ['a', 'b/…']);
        assert.deepStrictEqual(labels.shorten(['a/b/c', 'd/b/c']), ['a/…', 'd/…']);
        assert.deepStrictEqual(labels.shorten(['a/b/c/d', 'f/b/c/d']), ['a/…', 'f/…']);
        assert.deepStrictEqual(labels.shorten(['d/e/a/b/c', 'd/b/c']), ['…/a/…', 'd/b/…']);
        assert.deepStrictEqual(labels.shorten(['a/b/c/d', 'a/f/b/c/d']), ['a/b/…', '…/f/…']);
        assert.deepStrictEqual(labels.shorten(['a/b/a', 'b/b/a']), ['a/b/…', 'b/b/…']);
        assert.deepStrictEqual(labels.shorten(['d/f/a/b/c', 'h/d/b/c']), ['…/a/…', 'h/…']);
        assert.deepStrictEqual(labels.shorten(['/x/b', '/y/b']), ['/x/…', '/y/…']);
        // same name ending
        assert.deepStrictEqual(labels.shorten(['a/b', 'a/c', 'a/e-b']), ['…/b', '…/c', '…/e-b']);
        // same in the middle
        assert.deepStrictEqual(labels.shorten(['a/b/c', 'd/b/e']), ['…/c', '…/e']);
        // case-sensitive
        assert.deepStrictEqual(labels.shorten(['a/b/c', 'd/b/C']), ['…/c', '…/C']);
        // empty or null
        assert.deepStrictEqual(labels.shorten(['', null]), ['./', null]);
        assert.deepStrictEqual(labels.shorten(['a', 'a/b', 'a/b/c', 'd/b/c', 'd/b']), [
            'a',
            'a/b',
            'a/b/c',
            'd/b/c',
            'd/b',
        ]);
        assert.deepStrictEqual(labels.shorten(['a', 'a/b', 'b']), ['a', 'a/b', 'b']);
        assert.deepStrictEqual(labels.shorten(['', 'a', 'b', 'b/c', 'a/c']), [
            './',
            'a',
            'b',
            'b/c',
            'a/c',
        ]);
    });
    test('template', () => {
        // simple
        assert.strictEqual(labels.template('Foo Bar'), 'Foo Bar');
        assert.strictEqual(labels.template('Foo${}Bar'), 'FooBar');
        assert.strictEqual(labels.template('$FooBar'), '');
        assert.strictEqual(labels.template('}FooBar'), '}FooBar');
        assert.strictEqual(labels.template('Foo ${one} Bar', { one: 'value' }), 'Foo value Bar');
        assert.strictEqual(labels.template('Foo ${one} Bar ${two}', { one: 'value', two: 'other value' }), 'Foo value Bar other value');
        // conditional separator
        assert.strictEqual(labels.template('Foo${separator}Bar'), 'FooBar');
        assert.strictEqual(labels.template('Foo${separator}Bar', { separator: { label: ' - ' } }), 'Foo - Bar');
        assert.strictEqual(labels.template('${separator}Foo${separator}Bar', {
            value: 'something',
            separator: { label: ' - ' },
        }), 'Foo - Bar');
        assert.strictEqual(labels.template('${value} Foo${separator}Bar', {
            value: 'something',
            separator: { label: ' - ' },
        }), 'something Foo - Bar');
        // real world example (macOS)
        let t = '${activeEditorShort}${separator}${rootName}';
        assert.strictEqual(labels.template(t, { activeEditorShort: '', rootName: '', separator: { label: ' - ' } }), '');
        assert.strictEqual(labels.template(t, { activeEditorShort: '', rootName: 'root', separator: { label: ' - ' } }), 'root');
        assert.strictEqual(labels.template(t, {
            activeEditorShort: 'markdown.txt',
            rootName: 'root',
            separator: { label: ' - ' },
        }), 'markdown.txt - root');
        // real world example (other)
        t = '${dirty}${activeEditorShort}${separator}${rootName}${separator}${appName}';
        assert.strictEqual(labels.template(t, {
            dirty: '',
            activeEditorShort: '',
            rootName: '',
            appName: '',
            separator: { label: ' - ' },
        }), '');
        assert.strictEqual(labels.template(t, {
            dirty: '',
            activeEditorShort: '',
            rootName: '',
            appName: 'Visual Studio Code',
            separator: { label: ' - ' },
        }), 'Visual Studio Code');
        assert.strictEqual(labels.template(t, {
            dirty: '',
            activeEditorShort: 'Untitled-1',
            rootName: '',
            appName: 'Visual Studio Code',
            separator: { label: ' - ' },
        }), 'Untitled-1 - Visual Studio Code');
        assert.strictEqual(labels.template(t, {
            dirty: '',
            activeEditorShort: '',
            rootName: 'monaco',
            appName: 'Visual Studio Code',
            separator: { label: ' - ' },
        }), 'monaco - Visual Studio Code');
        assert.strictEqual(labels.template(t, {
            dirty: '',
            activeEditorShort: 'somefile.txt',
            rootName: 'monaco',
            appName: 'Visual Studio Code',
            separator: { label: ' - ' },
        }), 'somefile.txt - monaco - Visual Studio Code');
        assert.strictEqual(labels.template(t, {
            dirty: '* ',
            activeEditorShort: 'somefile.txt',
            rootName: 'monaco',
            appName: 'Visual Studio Code',
            separator: { label: ' - ' },
        }), '* somefile.txt - monaco - Visual Studio Code');
        // real world example (other)
        t = '${dirty}${activeEditorShort}${separator}${rootNameShort}${separator}${appName}';
        assert.strictEqual(labels.template(t, {
            dirty: '',
            activeEditorShort: '',
            rootName: 'monaco (Workspace)',
            rootNameShort: 'monaco',
            appName: 'Visual Studio Code',
            separator: { label: ' - ' },
        }), 'monaco - Visual Studio Code');
    });
    test('mnemonicButtonLabel', () => {
        assert.strictEqual(labels.mnemonicButtonLabel('Hello World').withMnemonic, 'Hello World');
        assert.strictEqual(labels.mnemonicButtonLabel('').withMnemonic, '');
        if (isWindows) {
            assert.strictEqual(labels.mnemonicButtonLabel('Hello & World').withMnemonic, 'Hello && World');
            assert.strictEqual(labels.mnemonicButtonLabel('Do &&not Save & Continue').withMnemonic, 'Do &not Save && Continue');
        }
        else if (isMacintosh) {
            assert.strictEqual(labels.mnemonicButtonLabel('Hello & World').withMnemonic, 'Hello & World');
            assert.strictEqual(labels.mnemonicButtonLabel('Do &&not Save & Continue').withMnemonic, 'Do not Save & Continue');
        }
        else {
            assert.strictEqual(labels.mnemonicButtonLabel('Hello & World').withMnemonic, 'Hello & World');
            assert.strictEqual(labels.mnemonicButtonLabel('Do &&not Save & Continue').withMnemonic, 'Do _not Save & Continue');
        }
    });
    test('getPathLabel', () => {
        const winFileUri = URI.file('c:/some/folder/file.txt');
        const nixFileUri = URI.file('/some/folder/file.txt');
        const nixBadFileUri = URI.revive({
            scheme: 'vscode',
            authority: 'file',
            path: '//some/folder/file.txt',
        });
        const uncFileUri = URI.file('c:/some/folder/file.txt').with({ authority: 'auth' });
        const remoteFileUri = URI.file('/some/folder/file.txt').with({
            scheme: 'vscode-test',
            authority: 'auth',
        });
        // Basics
        assert.strictEqual(labels.getPathLabel(winFileUri, { os: 1 /* OperatingSystem.Windows */ }), 'C:\\some\\folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(winFileUri, { os: 2 /* OperatingSystem.Macintosh */ }), 'c:/some/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(winFileUri, { os: 3 /* OperatingSystem.Linux */ }), 'c:/some/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, { os: 1 /* OperatingSystem.Windows */ }), '\\some\\folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, { os: 2 /* OperatingSystem.Macintosh */ }), '/some/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, { os: 3 /* OperatingSystem.Linux */ }), '/some/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(uncFileUri, { os: 1 /* OperatingSystem.Windows */ }), '\\\\auth\\c:\\some\\folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(uncFileUri, { os: 2 /* OperatingSystem.Macintosh */ }), '/auth/c:/some/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(uncFileUri, { os: 3 /* OperatingSystem.Linux */ }), '/auth/c:/some/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(remoteFileUri, { os: 1 /* OperatingSystem.Windows */ }), '\\some\\folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(remoteFileUri, { os: 2 /* OperatingSystem.Macintosh */ }), '/some/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(remoteFileUri, { os: 3 /* OperatingSystem.Linux */ }), '/some/folder/file.txt');
        // Tildify
        const nixUserHome = URI.file('/some');
        const remoteUserHome = URI.file('/some').with({ scheme: 'vscode-test', authority: 'auth' });
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 1 /* OperatingSystem.Windows */,
            tildify: { userHome: nixUserHome },
        }), '\\some\\folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 2 /* OperatingSystem.Macintosh */,
            tildify: { userHome: nixUserHome },
        }), '~/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixBadFileUri, {
            os: 2 /* OperatingSystem.Macintosh */,
            tildify: { userHome: nixUserHome },
        }), '/some/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 3 /* OperatingSystem.Linux */,
            tildify: { userHome: nixUserHome },
        }), '~/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 1 /* OperatingSystem.Windows */,
            tildify: { userHome: remoteUserHome },
        }), '\\some\\folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 2 /* OperatingSystem.Macintosh */,
            tildify: { userHome: remoteUserHome },
        }), '~/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 3 /* OperatingSystem.Linux */,
            tildify: { userHome: remoteUserHome },
        }), '~/folder/file.txt');
        const nixUntitledUri = URI.file('/some/folder/file.txt').with({ scheme: 'untitled' });
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 1 /* OperatingSystem.Windows */,
            tildify: { userHome: nixUserHome },
        }), '\\some\\folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 2 /* OperatingSystem.Macintosh */,
            tildify: { userHome: nixUserHome },
        }), '~/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 3 /* OperatingSystem.Linux */,
            tildify: { userHome: nixUserHome },
        }), '~/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 1 /* OperatingSystem.Windows */,
            tildify: { userHome: remoteUserHome },
        }), '\\some\\folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 2 /* OperatingSystem.Macintosh */,
            tildify: { userHome: remoteUserHome },
        }), '~/folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 3 /* OperatingSystem.Linux */,
            tildify: { userHome: remoteUserHome },
        }), '~/folder/file.txt');
        // Relative
        const winFolder = URI.file('c:/some');
        const winRelativePathProvider = {
            getWorkspace() {
                return { folders: [{ uri: winFolder }] };
            },
            getWorkspaceFolder(resource) {
                return { uri: winFolder };
            },
        };
        assert.strictEqual(labels.getPathLabel(winFileUri, {
            os: 1 /* OperatingSystem.Windows */,
            relative: winRelativePathProvider,
        }), 'folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(winFileUri, {
            os: 2 /* OperatingSystem.Macintosh */,
            relative: winRelativePathProvider,
        }), 'folder/file.txt');
        assert.strictEqual(labels.getPathLabel(winFileUri, {
            os: 3 /* OperatingSystem.Linux */,
            relative: winRelativePathProvider,
        }), 'folder/file.txt');
        const nixFolder = URI.file('/some');
        const nixRelativePathProvider = {
            getWorkspace() {
                return { folders: [{ uri: nixFolder }] };
            },
            getWorkspaceFolder(resource) {
                return { uri: nixFolder };
            },
        };
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 1 /* OperatingSystem.Windows */,
            relative: nixRelativePathProvider,
        }), 'folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 2 /* OperatingSystem.Macintosh */,
            relative: nixRelativePathProvider,
        }), 'folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixFileUri, {
            os: 3 /* OperatingSystem.Linux */,
            relative: nixRelativePathProvider,
        }), 'folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 1 /* OperatingSystem.Windows */,
            relative: nixRelativePathProvider,
        }), 'folder\\file.txt');
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 2 /* OperatingSystem.Macintosh */,
            relative: nixRelativePathProvider,
        }), 'folder/file.txt');
        assert.strictEqual(labels.getPathLabel(nixUntitledUri, {
            os: 3 /* OperatingSystem.Linux */,
            relative: nixRelativePathProvider,
        }), 'folder/file.txt');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbGFiZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxNQUFNLE1BQU0sd0JBQXdCLENBQUE7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQW1CLE1BQU0sMEJBQTBCLENBQUE7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUNwQixDQUFDO0lBQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzFELHFCQUFxQjtRQUNyQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFFOUUsNkJBQTZCO1FBQzdCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUUxRixpQkFBaUI7UUFDakIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN2RixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFFMUYsY0FBYztRQUNkLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDNUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUMvRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxF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QUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRTFFLG1CQUFtQjtRQUNuQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFFeEYscUJBQXFCO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFB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