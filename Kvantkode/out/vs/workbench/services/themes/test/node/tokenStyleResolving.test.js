/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ColorThemeData } from '../../common/colorThemeData.js';
import assert from 'assert';
import { TokenStyle, getTokenClassificationRegistry, } from '../../../../../platform/theme/common/tokenClassificationRegistry.js';
import { Color } from '../../../../../base/common/color.js';
import { isString } from '../../../../../base/common/types.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
import { FileAccess, Schemas } from '../../../../../base/common/network.js';
import { ExtensionResourceLoaderService } from '../../../../../platform/extensionResourceLoader/common/extensionResourceLoaderService.js';
import { mock, TestProductService } from '../../../../test/common/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ExtensionGalleryManifestService } from '../../../../../platform/extensionManagement/common/extensionGalleryManifestService.js';
const undefinedStyle = { bold: undefined, underline: undefined, italic: undefined };
const unsetStyle = { bold: false, underline: false, italic: false };
function ts(foreground, styleFlags) {
    const foregroundColor = isString(foreground) ? Color.fromHex(foreground) : undefined;
    return new TokenStyle(foregroundColor, styleFlags?.bold, styleFlags?.underline, styleFlags?.strikethrough, styleFlags?.italic);
}
function tokenStyleAsString(ts) {
    if (!ts) {
        return 'tokenstyle-undefined';
    }
    let str = ts.foreground ? ts.foreground.toString() : 'no-foreground';
    if (ts.bold !== undefined) {
        str += ts.bold ? '+B' : '-B';
    }
    if (ts.underline !== undefined) {
        str += ts.underline ? '+U' : '-U';
    }
    if (ts.italic !== undefined) {
        str += ts.italic ? '+I' : '-I';
    }
    return str;
}
function assertTokenStyle(actual, expected, message) {
    assert.strictEqual(tokenStyleAsString(actual), tokenStyleAsString(expected), message);
}
function assertTokenStyleMetaData(colorIndex, actual, expected, message = '') {
    if (expected === undefined || expected === null || actual === undefined) {
        assert.strictEqual(actual, expected, message);
        return;
    }
    assert.strictEqual(actual.bold, expected.bold, 'bold ' + message);
    assert.strictEqual(actual.italic, expected.italic, 'italic ' + message);
    assert.strictEqual(actual.underline, expected.underline, 'underline ' + message);
    const actualForegroundIndex = actual.foreground;
    if (actualForegroundIndex && expected.foreground) {
        assert.strictEqual(colorIndex[actualForegroundIndex], Color.Format.CSS.formatHexA(expected.foreground, true).toUpperCase(), 'foreground ' + message);
    }
    else {
        assert.strictEqual(actualForegroundIndex, expected.foreground || 0, 'foreground ' + message);
    }
}
function assertTokenStyles(themeData, expected, language = 'typescript') {
    const colorIndex = themeData.tokenColorMap;
    for (const qualifiedClassifier in expected) {
        const [type, ...modifiers] = qualifiedClassifier.split('.');
        const expectedTokenStyle = expected[qualifiedClassifier];
        const tokenStyleMetaData = themeData.getTokenStyleMetadata(type, modifiers, language);
        assertTokenStyleMetaData(colorIndex, tokenStyleMetaData, expectedTokenStyle, qualifiedClassifier);
    }
}
suite('Themes - TokenStyleResolving', () => {
    const fileService = new FileService(new NullLogService());
    const requestService = new (mock())();
    const storageService = new (mock())();
    const environmentService = new (mock())();
    const configurationService = new (mock())();
    const extensionResourceLoaderService = new ExtensionResourceLoaderService(fileService, storageService, TestProductService, environmentService, configurationService, new ExtensionGalleryManifestService(TestProductService), requestService, new NullLogService());
    const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
    fileService.registerProvider(Schemas.file, diskFileSystemProvider);
    teardown(() => {
        diskFileSystemProvider.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('color defaults', async () => {
        const themeData = ColorThemeData.createUnloadedTheme('foo');
        themeData.location = FileAccess.asFileUri('vs/workbench/services/themes/test/node/color-theme.json');
        await themeData.ensureLoaded(extensionResourceLoaderService);
        assert.strictEqual(themeData.isLoaded, true);
        assertTokenStyles(themeData, {
            comment: ts('#000000', undefinedStyle),
            variable: ts('#111111', unsetStyle),
            type: ts('#333333', { bold: false, underline: true, italic: false }),
            function: ts('#333333', unsetStyle),
            string: ts('#444444', undefinedStyle),
            number: ts('#555555', undefinedStyle),
            keyword: ts('#666666', undefinedStyle),
        });
    });
    test('resolveScopes', async () => {
        const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
        const customTokenColors = {
            textMateRules: [
                {
                    scope: 'variable',
                    settings: {
                        fontStyle: '',
                        foreground: '#F8F8F2',
                    },
                },
                {
                    scope: 'keyword.operator',
                    settings: {
                        fontStyle: 'italic bold underline',
                        foreground: '#F92672',
                    },
                },
                {
                    scope: 'storage',
                    settings: {
                        fontStyle: 'italic',
                        foreground: '#F92672',
                    },
                },
                {
                    scope: ['storage.type', 'meta.structure.dictionary.json string.quoted.double.json'],
                    settings: {
                        foreground: '#66D9EF',
                    },
                },
                {
                    scope: 'entity.name.type, entity.name.class, entity.name.namespace, entity.name.scope-resolution',
                    settings: {
                        fontStyle: 'underline',
                        foreground: '#A6E22E',
                    },
                },
            ],
        };
        themeData.setCustomTokenColors(customTokenColors);
        let tokenStyle;
        const defaultTokenStyle = undefined;
        tokenStyle = themeData.resolveScopes([['variable']]);
        assertTokenStyle(tokenStyle, ts('#F8F8F2', unsetStyle), 'variable');
        tokenStyle = themeData.resolveScopes([['keyword.operator']]);
        assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, bold: true, underline: true }), 'keyword');
        tokenStyle = themeData.resolveScopes([['keyword']]);
        assertTokenStyle(tokenStyle, defaultTokenStyle, 'keyword');
        tokenStyle = themeData.resolveScopes([['keyword.operator']]);
        assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, bold: true, underline: true }), 'keyword.operator');
        tokenStyle = themeData.resolveScopes([['keyword.operators']]);
        assertTokenStyle(tokenStyle, defaultTokenStyle, 'keyword.operators');
        tokenStyle = themeData.resolveScopes([['storage']]);
        assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, bold: false, underline: false }), 'storage');
        tokenStyle = themeData.resolveScopes([['storage.type']]);
        assertTokenStyle(tokenStyle, ts('#66D9EF', { italic: true, bold: false, underline: false }), 'storage.type');
        tokenStyle = themeData.resolveScopes([['entity.name.class']]);
        assertTokenStyle(tokenStyle, ts('#A6E22E', { italic: false, bold: false, underline: true }), 'entity.name.class');
        tokenStyle = themeData.resolveScopes([
            ['meta.structure.dictionary.json', 'string.quoted.double.json'],
        ]);
        assertTokenStyle(tokenStyle, ts('#66D9EF', undefined), 'json property');
        tokenStyle = themeData.resolveScopes([
            ['source.json', 'meta.structure.dictionary.json', 'string.quoted.double.json'],
        ]);
        assertTokenStyle(tokenStyle, ts('#66D9EF', undefined), 'json property');
        tokenStyle = themeData.resolveScopes([['keyword'], ['storage.type'], ['entity.name.class']]);
        assertTokenStyle(tokenStyle, ts('#66D9EF', { italic: true, bold: false, underline: false }), 'storage.type');
    });
    test('resolveScopes - match most specific', async () => {
        const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
        const customTokenColors = {
            textMateRules: [
                {
                    scope: 'entity.name.type',
                    settings: {
                        fontStyle: 'underline',
                        foreground: '#A6E22E',
                    },
                },
                {
                    scope: 'entity.name.type.class',
                    settings: {
                        foreground: '#FF00FF',
                    },
                },
                {
                    scope: 'entity.name',
                    settings: {
                        foreground: '#FFFFFF',
                    },
                },
            ],
        };
        themeData.setCustomTokenColors(customTokenColors);
        const tokenStyle = themeData.resolveScopes([['entity.name.type.class']]);
        assertTokenStyle(tokenStyle, ts('#FF00FF', { italic: false, bold: false, underline: true }), 'entity.name.type.class');
    });
    test('rule matching', async () => {
        const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
        themeData.setCustomColors({ 'editor.foreground': '#000000' });
        themeData.setCustomSemanticTokenColors({
            enabled: true,
            rules: {
                type: '#ff0000',
                class: { foreground: '#0000ff', italic: true },
                '*.static': { bold: true },
                '*.declaration': { italic: true },
                '*.async.static': { italic: true, underline: true },
                '*.async': { foreground: '#000fff', underline: true },
            },
        });
        assertTokenStyles(themeData, {
            type: ts('#ff0000', undefinedStyle),
            'type.static': ts('#ff0000', { bold: true }),
            'type.static.declaration': ts('#ff0000', { bold: true, italic: true }),
            class: ts('#0000ff', { italic: true }),
            'class.static.declaration': ts('#0000ff', { bold: true, italic: true }),
            'class.declaration': ts('#0000ff', { italic: true }),
            'class.declaration.async': ts('#000fff', { underline: true, italic: true }),
            'class.declaration.async.static': ts('#000fff', {
                italic: true,
                underline: true,
                bold: true,
            }),
        });
    });
    test('super type', async () => {
        const registry = getTokenClassificationRegistry();
        registry.registerTokenType('myTestInterface', 'A type just for testing', 'interface');
        registry.registerTokenType('myTestSubInterface', 'A type just for testing', 'myTestInterface');
        try {
            const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
            themeData.setCustomColors({ 'editor.foreground': '#000000' });
            themeData.setCustomSemanticTokenColors({
                enabled: true,
                rules: {
                    interface: '#ff0000',
                    myTestInterface: { italic: true },
                    'interface.static': { bold: true },
                },
            });
            assertTokenStyles(themeData, { myTestSubInterface: ts('#ff0000', { italic: true }) });
            assertTokenStyles(themeData, {
                'myTestSubInterface.static': ts('#ff0000', { italic: true, bold: true }),
            });
            themeData.setCustomSemanticTokenColors({
                enabled: true,
                rules: {
                    interface: '#ff0000',
                    myTestInterface: { foreground: '#ff00ff', italic: true },
                },
            });
            assertTokenStyles(themeData, { myTestSubInterface: ts('#ff00ff', { italic: true }) });
        }
        finally {
            registry.deregisterTokenType('myTestInterface');
            registry.deregisterTokenType('myTestSubInterface');
        }
    });
    test('language', async () => {
        try {
            const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
            themeData.setCustomColors({ 'editor.foreground': '#000000' });
            themeData.setCustomSemanticTokenColors({
                enabled: true,
                rules: {
                    interface: '#fff000',
                    'interface:java': '#ff0000',
                    'interface.static': { bold: true },
                    'interface.static:typescript': { italic: true },
                },
            });
            assertTokenStyles(themeData, { interface: ts('#ff0000', undefined) }, 'java');
            assertTokenStyles(themeData, { interface: ts('#fff000', undefined) }, 'typescript');
            assertTokenStyles(themeData, { 'interface.static': ts('#ff0000', { bold: true }) }, 'java');
            assertTokenStyles(themeData, { 'interface.static': ts('#fff000', { bold: true, italic: true }) }, 'typescript');
        }
        finally {
        }
    });
    test('language - scope resolving', async () => {
        const registry = getTokenClassificationRegistry();
        const numberOfDefaultRules = registry.getTokenStylingDefaultRules().length;
        registry.registerTokenStyleDefault(registry.parseTokenSelector('type', 'typescript1'), {
            scopesToProbe: [['entity.name.type.ts1']],
        });
        registry.registerTokenStyleDefault(registry.parseTokenSelector('type:javascript1'), {
            scopesToProbe: [['entity.name.type.js1']],
        });
        try {
            const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
            themeData.setCustomColors({ 'editor.foreground': '#000000' });
            themeData.setCustomTokenColors({
                textMateRules: [
                    {
                        scope: 'entity.name.type',
                        settings: { foreground: '#aa0000' },
                    },
                    {
                        scope: 'entity.name.type.ts1',
                        settings: { foreground: '#bb0000' },
                    },
                ],
            });
            assertTokenStyles(themeData, { type: ts('#aa0000', undefined) }, 'javascript1');
            assertTokenStyles(themeData, { type: ts('#bb0000', undefined) }, 'typescript1');
        }
        finally {
            registry.deregisterTokenStyleDefault(registry.parseTokenSelector('type', 'typescript1'));
            registry.deregisterTokenStyleDefault(registry.parseTokenSelector('type:javascript1'));
            assert.strictEqual(registry.getTokenStylingDefaultRules().length, numberOfDefaultRules);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TdHlsZVJlc29sdmluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL3Rlc3Qvbm9kZS90b2tlblN0eWxlUmVzb2x2aW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQy9ELE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQ04sVUFBVSxFQUNWLDhCQUE4QixHQUM5QixNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBGQUEwRixDQUFBO0FBRXpJLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUszRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1RkFBdUYsQ0FBQTtBQUV2SSxNQUFNLGNBQWMsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNB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