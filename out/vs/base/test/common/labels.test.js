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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2xhYmVscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssTUFBTSxNQUFNLHdCQUF3QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFtQixNQUFNLDBCQUEwQixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsQ0FBQztJQUFBLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUMxRCxxQkFBcUI7UUFDckIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMxRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBRTlFLDZCQUE2QjtRQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFMUYsaUJBQWlCO1FBQ2pCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDdkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMxRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRTFGLGNBQWM7UUFDZCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQzVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDL0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxN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