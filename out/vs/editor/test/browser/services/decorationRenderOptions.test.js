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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblJlbmRlck9wdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvc2VydmljZXMvZGVjb3JhdGlvblJlbmRlck9wdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUFFLHFCQUFxQixFQUF3QixNQUFNLDBCQUEwQixDQUFBO0FBQ3RGLE9BQU8sRUFDTixjQUFjLEVBQ2QsZ0JBQWdCLEdBQ2hCLE1BQU0sNERBQTRELENBQUE7QUFFbkUsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUN2QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFBO0lBRS9DLE1BQU0sT0FBTyxHQUE2QjtRQUN6QyxjQUFjLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FDeEIsd0VBQXdFLENBQ3hFO1FBQ0QsY0FBYyxFQUFFLFNBQVM7UUFDekIsZUFBZSxFQUFFLEtBQUs7UUFDdEIsV0FBVyxFQUFFLFFBQVE7S0FDckIsQ0FBQTtJQUNELElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDakQsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUNoRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQy9FLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM5RSxDQUFDLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDbEUsQ0FBQyxDQUFDLENBQUE7SUFFRixTQUFTLGNBQWMsQ0FBQyxVQUFnQztRQUN2RCxPQUFPLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNyQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDL0QsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FDTCxLQUFLLENBQUMsT0FBTyxDQUNaLG9CQUFvQixHQUFHLENBQUMsTUFBTSxDQUFDLHdFQUF3RSxDQUFDLHNEQUFzRCxDQUM5SixJQUFJLENBQUMsQ0FDTixDQUFBO1FBQ0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsb0VBQW9FLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNqRyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sT0FBTyxHQUE2QjtZQUN6QyxlQUFlLEVBQUUsRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUU7WUFDM0MsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRTtTQUNuQyxDQUFBO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDeEMsSUFBSSxjQUFjLENBQUM7WUFDbEIsZ0JBQWdCLEVBQUUsU0FBUztTQUMzQixDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNyQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUNqQixjQUFjLENBQUMsVUFBVSxDQUFDLEVBQzFCLDJHQUEyRyxDQUMzRyxDQUFBO1FBRUQsWUFBWSxDQUFDLFFBQVEsQ0FDcEIsSUFBSSxjQUFjLENBQUM7WUFDbEIsZ0JBQWdCLEVBQUUsU0FBUztZQUMzQixZQUFZLEVBQUUsU0FBUztTQUN2QixDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFDMUIsdUdBQXVHLENBQ3ZHLENBQUE7UUFFRCxDQUFDLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLE1BQU0sT0FBTyxHQUE2QjtZQUN6QyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUU7WUFDakMsS0FBSyxFQUFFO2dCQUNOLEtBQUssRUFBRSxTQUFTO2FBQ2hCO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEtBQUssRUFBRSxTQUFTO2dCQUNoQixLQUFLLEVBQUU7b0JBQ04sS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLGdCQUFnQixFQUFFO2lCQUMvQjthQUNEO1NBQ0QsQ0FBQTtRQUVELE1BQU0sWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQ3hDLElBQUksY0FBYyxDQUFDO1lBQ2xCLGdCQUFnQixFQUFFLFNBQVM7WUFDM0IsY0FBYyxFQUFFLFNBQVM7U0FDekIsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLENBQUE7UUFDckMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDcEQsTUFBTSxRQUFRLEdBQUc7WUFDaEIseUhBQXlIO1lBQ3pILDJHQUEyRztZQUMzRyxzR0FBc0c7WUFDdEcsMkRBQTJEO1NBQzNELENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ1osTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFeEQsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUVyQyw2QkFBNkI7UUFDN0IsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUU7WUFDM0MsY0FBYyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUM7U0FDakUsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUNMLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQ2pDLG9CQUFvQixHQUFHLENBQUMsTUFBTSxDQUFDLHNDQUFzQyxDQUFDLDhCQUE4QixDQUNwRyxHQUFHLENBQUMsQ0FDTCxDQUFBO1FBQ0QsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWpDLFNBQVMsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLElBQVk7WUFDbkQsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3pDLE1BQU0sQ0FDTCxNQUFNLENBQUMsT0FBTyxDQUFDLG9CQUFvQixJQUFJLDhCQUE4QixDQUFDLEdBQUcsQ0FBQztnQkFDekUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsSUFBSSw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsQ0FDM0UsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QixxQ0FBcUM7WUFDckMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUU7Z0JBQzNDLGNBQWMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDO2FBQ3RELENBQUMsQ0FBQTtZQUNGLGdCQUFnQixDQUNmLEdBQUcsQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsRUFDN0MsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrREFBa0QsQ0FBQyxDQUM5RCxDQUFBO1lBQ0QsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRWpDLDhDQUE4QztZQUM5QyxDQUFDLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRTtnQkFDM0MsY0FBYyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUM7YUFDcEQsQ0FBQyxDQUFBO1lBQ0YsZ0JBQWdCLENBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQyxFQUMzQyxHQUFHLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxDQUFDLENBQzVELENBQUE7WUFDRCxDQUFDLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEMsQ0FBQzthQUFNLENBQUM7WUFDUCxrQ0FBa0M7WUFDbEMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUU7Z0JBQzNDLGNBQWMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO2FBQzlDLENBQUMsQ0FBQTtZQUNGLGdCQUFnQixDQUNmLEdBQUcsQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsRUFDdkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyw0Q0FBNEMsQ0FBQyxDQUN4RCxDQUFBO1lBQ0QsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRWpDLDhDQUE4QztZQUM5QyxDQUFDLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRTtnQkFDM0MsY0FBYyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUM7YUFDL0MsQ0FBQyxDQUFBO1lBQ0YsZ0JBQWdCLENBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxFQUN4QyxHQUFHLENBQUMsTUFBTSxDQUFDLDZDQUE2QyxDQUFDLENBQ3pELENBQUE7WUFDRCxDQUFDLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUVELENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDL0YsTUFBTSxDQUNMLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQ2pDLG9CQUFvQixHQUFHLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLDhCQUE4QixDQUNqRixHQUFHLENBQUMsQ0FDTCxDQUFBO1FBQ0QsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==