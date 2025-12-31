/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { migrateOptions } from '../../../browser/config/migrateOptions.js';
import { EditorZoom } from '../../../common/config/editorZoom.js';
import { TestConfiguration } from './testConfiguration.js';
suite('Common Editor Config', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Zoom Level', () => {
        //Zoom levels are defined to go between -5, 20 inclusive
        const zoom = EditorZoom;
        zoom.setZoomLevel(0);
        assert.strictEqual(zoom.getZoomLevel(), 0);
        zoom.setZoomLevel(-0);
        assert.strictEqual(zoom.getZoomLevel(), 0);
        zoom.setZoomLevel(5);
        assert.strictEqual(zoom.getZoomLevel(), 5);
        zoom.setZoomLevel(-1);
        assert.strictEqual(zoom.getZoomLevel(), -1);
        zoom.setZoomLevel(9);
        assert.strictEqual(zoom.getZoomLevel(), 9);
        zoom.setZoomLevel(-9);
        assert.strictEqual(zoom.getZoomLevel(), -5);
        zoom.setZoomLevel(20);
        assert.strictEqual(zoom.getZoomLevel(), 20);
        zoom.setZoomLevel(-10);
        assert.strictEqual(zoom.getZoomLevel(), -5);
        zoom.setZoomLevel(9.1);
        assert.strictEqual(zoom.getZoomLevel(), 9.1);
        zoom.setZoomLevel(-9.1);
        assert.strictEqual(zoom.getZoomLevel(), -5);
        zoom.setZoomLevel(Infinity);
        assert.strictEqual(zoom.getZoomLevel(), 20);
        zoom.setZoomLevel(Number.NEGATIVE_INFINITY);
        assert.strictEqual(zoom.getZoomLevel(), -5);
    });
    class TestWrappingConfiguration extends TestConfiguration {
        _readEnvConfiguration() {
            return {
                extraEditorClassName: '',
                outerWidth: 1000,
                outerHeight: 100,
                emptySelectionClipboard: true,
                pixelRatio: 1,
                accessibilitySupport: 0 /* AccessibilitySupport.Unknown */,
            };
        }
    }
    function assertWrapping(config, isViewportWrapping, wrappingColumn) {
        const options = config.options;
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        assert.strictEqual(wrappingInfo.isViewportWrapping, isViewportWrapping);
        assert.strictEqual(wrappingInfo.wrappingColumn, wrappingColumn);
    }
    test('wordWrap default', () => {
        const config = new TestWrappingConfiguration({});
        assertWrapping(config, false, -1);
        config.dispose();
    });
    test('wordWrap compat false', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: false,
        });
        assertWrapping(config, false, -1);
        config.dispose();
    });
    test('wordWrap compat true', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: true,
        });
        assertWrapping(config, true, 80);
        config.dispose();
    });
    test('wordWrap on', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'on',
        });
        assertWrapping(config, true, 80);
        config.dispose();
    });
    test('wordWrap on without minimap', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'on',
            minimap: {
                enabled: false,
            },
        });
        assertWrapping(config, true, 88);
        config.dispose();
    });
    test('wordWrap on does not use wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'on',
            wordWrapColumn: 10,
        });
        assertWrapping(config, true, 80);
        config.dispose();
    });
    test('wordWrap off', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'off',
        });
        assertWrapping(config, false, -1);
        config.dispose();
    });
    test('wordWrap off does not use wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'off',
            wordWrapColumn: 10,
        });
        assertWrapping(config, false, -1);
        config.dispose();
    });
    test('wordWrap wordWrapColumn uses default wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'wordWrapColumn',
        });
        assertWrapping(config, false, 80);
        config.dispose();
    });
    test('wordWrap wordWrapColumn uses wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 100,
        });
        assertWrapping(config, false, 100);
        config.dispose();
    });
    test('wordWrap wordWrapColumn validates wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: -1,
        });
        assertWrapping(config, false, 1);
        config.dispose();
    });
    test('wordWrap bounded uses default wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'bounded',
        });
        assertWrapping(config, true, 80);
        config.dispose();
    });
    test('wordWrap bounded uses wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'bounded',
            wordWrapColumn: 40,
        });
        assertWrapping(config, true, 40);
        config.dispose();
    });
    test('wordWrap bounded validates wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'bounded',
            wordWrapColumn: -1,
        });
        assertWrapping(config, true, 1);
        config.dispose();
    });
    test("issue #53152: Cannot assign to read only property 'enabled' of object", () => {
        const hoverOptions = {};
        Object.defineProperty(hoverOptions, 'enabled', {
            writable: false,
            value: true,
        });
        const config = new TestConfiguration({ hover: hoverOptions });
        assert.strictEqual(config.options.get(62 /* EditorOption.hover */).enabled, true);
        config.updateOptions({ hover: { enabled: false } });
        assert.strictEqual(config.options.get(62 /* EditorOption.hover */).enabled, false);
        config.dispose();
    });
    test('does not emit event when nothing changes', () => {
        const config = new TestConfiguration({ glyphMargin: true, roundedSelection: false });
        let event = null;
        const disposable = config.onDidChange((e) => (event = e));
        assert.strictEqual(config.options.get(59 /* EditorOption.glyphMargin */), true);
        config.updateOptions({ glyphMargin: true });
        config.updateOptions({ roundedSelection: false });
        assert.strictEqual(event, null);
        config.dispose();
        disposable.dispose();
    });
    test('issue #94931: Unable to open source file', () => {
        const config = new TestConfiguration({ quickSuggestions: null });
        const actual = (config.options.get(94 /* EditorOption.quickSuggestions */));
        assert.deepStrictEqual(actual, {
            other: 'on',
            comments: 'off',
            strings: 'off',
        });
        config.dispose();
    });
    test("issue #102920: Can't snap or split view with JSON files", () => {
        const config = new TestConfiguration({ quickSuggestions: null });
        config.updateOptions({ quickSuggestions: { strings: true } });
        const actual = (config.options.get(94 /* EditorOption.quickSuggestions */));
        assert.deepStrictEqual(actual, {
            other: 'on',
            comments: 'off',
            strings: 'on',
        });
        config.dispose();
    });
    test('issue #151926: Untyped editor options apply', () => {
        const config = new TestConfiguration({});
        config.updateOptions({ unicodeHighlight: { allowedCharacters: { x: true } } });
        const actual = config.options.get(130 /* EditorOption.unicodeHighlighting */);
        assert.deepStrictEqual(actual, {
            nonBasicASCII: 'inUntrustedWorkspace',
            invisibleCharacters: true,
            ambiguousCharacters: true,
            includeComments: 'inUntrustedWorkspace',
            includeStrings: 'inUntrustedWorkspace',
            allowedCharacters: { x: true },
            allowedLocales: { _os: true, _vscode: true },
        });
        config.dispose();
    });
});
suite('migrateOptions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function migrate(options) {
        migrateOptions(options);
        return options;
    }
    test('wordWrap', () => {
        assert.deepStrictEqual(migrate({ wordWrap: true }), { wordWrap: 'on' });
        assert.deepStrictEqual(migrate({ wordWrap: false }), { wordWrap: 'off' });
    });
    test('lineNumbers', () => {
        assert.deepStrictEqual(migrate({ lineNumbers: true }), { lineNumbers: 'on' });
        assert.deepStrictEqual(migrate({ lineNumbers: false }), { lineNumbers: 'off' });
    });
    test('autoClosingBrackets', () => {
        assert.deepStrictEqual(migrate({ autoClosingBrackets: false }), {
            autoClosingBrackets: 'never',
            autoClosingQuotes: 'never',
            autoSurround: 'never',
        });
    });
    test('cursorBlinking', () => {
        assert.deepStrictEqual(migrate({ cursorBlinking: 'visible' }), { cursorBlinking: 'solid' });
    });
    test('renderWhitespace', () => {
        assert.deepStrictEqual(migrate({ renderWhitespace: true }), { renderWhitespace: 'boundary' });
        assert.deepStrictEqual(migrate({ renderWhitespace: false }), { renderWhitespace: 'none' });
    });
    test('renderLineHighlight', () => {
        assert.deepStrictEqual(migrate({ renderLineHighlight: true }), { renderLineHighlight: 'line' });
        assert.deepStrictEqual(migrate({ renderLineHighlight: false }), { renderLineHighlight: 'none' });
    });
    test('acceptSuggestionOnEnter', () => {
        assert.deepStrictEqual(migrate({ acceptSuggestionOnEnter: true }), {
            acceptSuggestionOnEnter: 'on',
        });
        assert.deepStrictEqual(migrate({ acceptSuggestionOnEnter: false }), {
            acceptSuggestionOnEnter: 'off',
        });
    });
    test('tabCompletion', () => {
        assert.deepStrictEqual(migrate({ tabCompletion: true }), { tabCompletion: 'onlySnippets' });
        assert.deepStrictEqual(migrate({ tabCompletion: false }), { tabCompletion: 'off' });
    });
    test('suggest.filteredTypes', () => {
        assert.deepStrictEqual(migrate({
            suggest: {
                filteredTypes: {
                    method: false,
                    function: false,
                    constructor: false,
                    deprecated: false,
                    field: false,
                    variable: false,
                    class: false,
                    struct: false,
                    interface: false,
                    module: false,
                    property: false,
                    event: false,
                    operator: false,
                    unit: false,
                    value: false,
                    constant: false,
                    enum: false,
                    enumMember: false,
                    keyword: false,
                    text: false,
                    color: false,
                    file: false,
                    reference: false,
                    folder: false,
                    typeParameter: false,
                    snippet: false,
                },
            },
        }), {
            suggest: {
                filteredTypes: undefined,
                showMethods: false,
                showFunctions: false,
                showConstructors: false,
                showDeprecated: false,
                showFields: false,
                showVariables: false,
                showClasses: false,
                showStructs: false,
                showInterfaces: false,
                showModules: false,
                showProperties: false,
                showEvents: false,
                showOperators: false,
                showUnits: false,
                showValues: false,
                showConstants: false,
                showEnums: false,
                showEnumMembers: false,
                showKeywords: false,
                showWords: false,
                showColors: false,
                showFiles: false,
                showReferences: false,
                showFolders: false,
                showTypeParameters: false,
                showSnippets: false,
            },
        });
    });
    test('quickSuggestions', () => {
        assert.deepStrictEqual(migrate({ quickSuggestions: true }), {
            quickSuggestions: { comments: 'on', strings: 'on', other: 'on' },
        });
        assert.deepStrictEqual(migrate({ quickSuggestions: false }), {
            quickSuggestions: { comments: 'off', strings: 'off', other: 'off' },
        });
        assert.deepStrictEqual(migrate({ quickSuggestions: { comments: 'on', strings: 'off' } }), {
            quickSuggestions: { comments: 'on', strings: 'off' },
        });
    });
    test('hover', () => {
        assert.deepStrictEqual(migrate({ hover: true }), { hover: { enabled: true } });
        assert.deepStrictEqual(migrate({ hover: false }), { hover: { enabled: false } });
    });
    test('parameterHints', () => {
        assert.deepStrictEqual(migrate({ parameterHints: true }), { parameterHints: { enabled: true } });
        assert.deepStrictEqual(migrate({ parameterHints: false }), {
            parameterHints: { enabled: false },
        });
    });
    test('autoIndent', () => {
        assert.deepStrictEqual(migrate({ autoIndent: true }), { autoIndent: 'full' });
        assert.deepStrictEqual(migrate({ autoIndent: false }), { autoIndent: 'advanced' });
    });
    test('matchBrackets', () => {
        assert.deepStrictEqual(migrate({ matchBrackets: true }), { matchBrackets: 'always' });
        assert.deepStrictEqual(migrate({ matchBrackets: false }), { matchBrackets: 'never' });
    });
    test('renderIndentGuides, highlightActiveIndentGuide', () => {
        assert.deepStrictEqual(migrate({ renderIndentGuides: true }), {
            renderIndentGuides: undefined,
            guides: { indentation: true },
        });
        assert.deepStrictEqual(migrate({ renderIndentGuides: false }), {
            renderIndentGuides: undefined,
            guides: { indentation: false },
        });
        assert.deepStrictEqual(migrate({ highlightActiveIndentGuide: true }), {
            highlightActiveIndentGuide: undefined,
            guides: { highlightActiveIndentation: true },
        });
        assert.deepStrictEqual(migrate({ highlightActiveIndentGuide: false }), {
            highlightActiveIndentGuide: undefined,
            guides: { highlightActiveIndentation: false },
        });
    });
    test('migration does not overwrite new setting', () => {
        assert.deepStrictEqual(migrate({ renderIndentGuides: true, guides: { indentation: false } }), {
            renderIndentGuides: undefined,
            guides: { indentation: false },
        });
        assert.deepStrictEqual(migrate({ highlightActiveIndentGuide: true, guides: { highlightActiveIndentation: false } }), { highlightActiveIndentGuide: undefined, guides: { highlightActiveIndentation: false } });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jb25maWcvZWRpdG9yQ29uZmlndXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFPMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRzFELEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2Qix3REFBd0Q7UUFDeEQsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFBO1FBRXZCLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUzQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTNDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTNDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUUzQyxJQUFJ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