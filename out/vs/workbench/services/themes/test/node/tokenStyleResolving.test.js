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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TdHlsZVJlc29sdmluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy90ZXN0L25vZGUvdG9rZW5TdHlsZVJlc29sdmluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRCxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUNOLFVBQVUsRUFDViw4QkFBOEIsR0FDOUIsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDckcsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwRkFBMEYsQ0FBQTtBQUV6SSxPQUFPLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFLM0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sdUZBQXVGLENBQUE7QUFFdkksTUFBTSxjQUFjLEdBQUcsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMs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