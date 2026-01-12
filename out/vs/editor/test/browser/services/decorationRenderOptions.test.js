/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestCodeEditorService } from '../editorTestServices.js';
import { TestColorTheme, TestThemeService, } from '../../../../platform/theme/test/common/testThemeService.js';
suite('Decoration Render Options', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const themeServiceMock = new TestThemeService();
    const options = {
        gutterIconPath: URI.parse('https://github.com/microsoft/vscode/blob/main/resources/linux/code.png'),
        gutterIconSize: 'contain',
        backgroundColor: 'red',
        borderColor: 'yellow',
    };
    test('register and resolve decoration type', () => {
        const s = store.add(new TestCodeEditorService(themeServiceMock));
        store.add(s.registerDecorationType('test', 'example', options));
        assert.notStrictEqual(s.resolveDecorationOptions('example', false), undefined);
    });
    test('remove decoration type', () => {
        const s = store.add(new TestCodeEditorService(themeServiceMock));
        s.registerDecorationType('test', 'example', options);
        assert.notStrictEqual(s.resolveDecorationOptions('example', false), undefined);
        s.removeDecorationType('example');
        assert.throws(() => s.resolveDecorationOptions('example', false));
    });
    function readStyleSheet(styleSheet) {
        return styleSheet.read();
    }
    test('css properties', () => {
        const s = store.add(new TestCodeEditorService(themeServiceMock));
        const styleSheet = s.globalStyleSheet;
        store.add(s.registerDecorationType('test', 'example', options));
        const sheet = readStyleSheet(styleSheet);
        assert(sheet.indexOf(`{background:url('${CSS.escape('https://github.com/microsoft/vscode/blob/main/resources/linux/code.png')}') center center no-repeat;background-size:contain;}`) >= 0);
        assert(sheet.indexOf(`{background-color:red;border-color:yellow;box-sizing: border-box;}`) >= 0);
    });
    test('theme color', () => {
        const options = {
            backgroundColor: { id: 'editorBackground' },
            borderColor: { id: 'editorBorder' },
        };
        const themeService = new TestThemeService(new TestColorTheme({
            editorBackground: '#FF0000',
        }));
        const s = store.add(new TestCodeEditorService(themeService));
        const styleSheet = s.globalStyleSheet;
        s.registerDecorationType('test', 'example', options);
        assert.strictEqual(readStyleSheet(styleSheet), '.monaco-editor .ced-example-0 {background-color:#ff0000;border-color:transparent;box-sizing: border-box;}');
        themeService.setTheme(new TestColorTheme({
            editorBackground: '#EE0000',
            editorBorder: '#00FFFF',
        }));
        assert.strictEqual(readStyleSheet(styleSheet), '.monaco-editor .ced-example-0 {background-color:#ee0000;border-color:#00ffff;box-sizing: border-box;}');
        s.removeDecorationType('example');
        assert.strictEqual(readStyleSheet(styleSheet), '');
    });
    test('theme overrides', () => {
        const options = {
            color: { id: 'editorBackground' },
            light: {
                color: '#FF00FF',
            },
            dark: {
                color: '#000000',
                after: {
                    color: { id: 'infoForeground' },
                },
            },
        };
        const themeService = new TestThemeService(new TestColorTheme({
            editorBackground: '#FF0000',
            infoForeground: '#444444',
        }));
        const s = store.add(new TestCodeEditorService(themeService));
        const styleSheet = s.globalStyleSheet;
        s.registerDecorationType('test', 'example', options);
        const expected = [
            '.vs-dark.monaco-editor .ced-example-4::after, .hc-black.monaco-editor .ced-example-4::after {color:#444444 !important;}',
            '.vs-dark.monaco-editor .ced-example-1, .hc-black.monaco-editor .ced-example-1 {color:#000000 !important;}',
            '.vs.monaco-editor .ced-example-1, .hc-light.monaco-editor .ced-example-1 {color:#FF00FF !important;}',
            '.monaco-editor .ced-example-1 {color:#ff0000 !important;}',
        ].join('\n');
        assert.strictEqual(readStyleSheet(styleSheet), expected);
        s.removeDecorationType('example');
        assert.strictEqual(readStyleSheet(styleSheet), '');
    });
    test('css properties, gutterIconPaths', () => {
        const s = store.add(new TestCodeEditorService(themeServiceMock));
        const styleSheet = s.globalStyleSheet;
        // URI, only minimal encoding
        s.registerDecorationType('test', 'example', {
            gutterIconPath: URI.parse('data:image/svg+xml;base64,PHN2ZyB4b+'),
        });
        assert(readStyleSheet(styleSheet).indexOf(`{background:url('${CSS.escape('data:image/svg+xml;base64,PHN2ZyB4b+')}') center center no-repeat;}`) > 0);
        s.removeDecorationType('example');
        function assertBackground(url1, url2) {
            const actual = readStyleSheet(styleSheet);
            assert(actual.indexOf(`{background:url('${url1}') center center no-repeat;}`) > 0 ||
                actual.indexOf(`{background:url('${url2}') center center no-repeat;}`) > 0);
        }
        if (platform.isWindows) {
            // windows file path (used as string)
            s.registerDecorationType('test', 'example', {
                gutterIconPath: URI.file('c:\\files\\miles\\more.png'),
            });
            assertBackground(CSS.escape('file:///c:/files/miles/more.png'), CSS.escape('vscode-file://vscode-app/c:/files/miles/more.png'));
            s.removeDecorationType('example');
            // single quote must always be escaped/encoded
            s.registerDecorationType('test', 'example', {
                gutterIconPath: URI.file("c:\\files\\foo\\b'ar.png"),
            });
            assertBackground(CSS.escape("file:///c:/files/foo/b'ar.png"), CSS.escape("vscode-file://vscode-app/c:/files/foo/b'ar.png"));
            s.removeDecorationType('example');
        }
        else {
            // unix file path (used as string)
            s.registerDecorationType('test', 'example', {
                gutterIconPath: URI.file('/Users/foo/bar.png'),
            });
            assertBackground(CSS.escape('file:///Users/foo/bar.png'), CSS.escape('vscode-file://vscode-app/Users/foo/bar.png'));
            s.removeDecorationType('example');
            // single quote must always be escaped/encoded
            s.registerDecorationType('test', 'example', {
                gutterIconPath: URI.file("/Users/foo/b'ar.png"),
            });
            assertBackground(CSS.escape("file:///Users/foo/b'ar.png"), CSS.escape("vscode-file://vscode-app/Users/foo/b'ar.png"));
            s.removeDecorationType('example');
        }
        s.registerDecorationType('test', 'example', { gutterIconPath: URI.parse("http://test/pa'th") });
        assert(readStyleSheet(styleSheet).indexOf(`{background:url('${CSS.escape("http://test/pa'th")}') center center no-repeat;}`) > 0);
        s.removeDecorationType('example');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblJlbmRlck9wdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9zZXJ2aWNlcy9kZWNvcmF0aW9uUmVuZGVyT3B0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUscUJBQXFCLEVBQXdCLE1BQU0sMEJBQTBCLENBQUE7QUFDdEYsT0FBTyxFQUNOLGNBQWMsRUFDZCxnQkFBZ0IsR0FDaEIsTUFBTSw0REFBNEQsQ0FBQTtBQUVuRSxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUE7SUFFL0MsTUFBTSxPQUFPLEdBQTZCO1FBQ3pDLGNBQWMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUN4Qix3RUFBd0UsQ0FDeEU7UUFDRCxjQUFjLEVBQUUsU0FBUztRQUN6QixlQUFlLEVBQUUsS0FBSztRQUN0QixXQUFXLEVBQUUsUUFBUTtLQUNyQixDQUFBO0lBQ0QsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLEtBQUssQ0FBQyxHQUFHLENB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