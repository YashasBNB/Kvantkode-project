/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Token } from '../../../common/languages.js';
import { TokenTheme } from '../../../common/languages/supports/tokenization.js';
import { LanguageService } from '../../../common/services/languageService.js';
import { TokenizationSupportAdapter, } from '../../browser/standaloneLanguages.js';
import { UnthemedProductIconTheme } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
suite('TokenizationSupport2Adapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const languageId = 'tttt';
    // const tokenMetadata = (LanguageId.PlainText << MetadataConsts.LANGUAGEID_OFFSET);
    class MockTokenTheme extends TokenTheme {
        constructor() {
            super(null, null);
            this.counter = 0;
        }
        match(languageId, token) {
            return (((this.counter++ << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                (languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)) >>>
                0);
        }
    }
    class MockThemeService {
        constructor() {
            this._builtInProductIconTheme = new UnthemedProductIconTheme();
            this.onDidColorThemeChange = new Emitter().event;
            this.onDidFileIconThemeChange = new Emitter().event;
            this.onDidProductIconThemeChange = new Emitter().event;
        }
        setTheme(themeName) {
            throw new Error('Not implemented');
        }
        setAutoDetectHighContrast(autoDetectHighContrast) {
            throw new Error('Not implemented');
        }
        defineTheme(themeName, themeData) {
            throw new Error('Not implemented');
        }
        getColorTheme() {
            return {
                label: 'mock',
                tokenTheme: new MockTokenTheme(),
                themeName: ColorScheme.LIGHT,
                type: ColorScheme.LIGHT,
                getColor: (color, useDefault) => {
                    throw new Error('Not implemented');
                },
                defines: (color) => {
                    throw new Error('Not implemented');
                },
                getTokenStyleMetadata: (type, modifiers, modelLanguage) => {
                    return undefined;
                },
                semanticHighlighting: false,
                tokenColorMap: [],
            };
        }
        setColorMapOverride(colorMapOverride) { }
        getFileIconTheme() {
            return {
                hasFileIcons: false,
                hasFolderIcons: false,
                hidesExplorerArrows: false,
            };
        }
        getProductIconTheme() {
            return this._builtInProductIconTheme;
        }
    }
    class MockState {
        static { this.INSTANCE = new MockState(); }
        constructor() { }
        clone() {
            return this;
        }
        equals(other) {
            return this === other;
        }
    }
    function testBadTokensProvider(providerTokens, expectedClassicTokens, expectedModernTokens) {
        class BadTokensProvider {
            getInitialState() {
                return MockState.INSTANCE;
            }
            tokenize(line, state) {
                return {
                    tokens: providerTokens,
                    endState: MockState.INSTANCE,
                };
            }
        }
        const disposables = new DisposableStore();
        const languageService = disposables.add(new LanguageService());
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const adapter = new TokenizationSupportAdapter(languageId, new BadTokensProvider(), languageService, new MockThemeService());
        const actualClassicTokens = adapter.tokenize('whatever', true, MockState.INSTANCE);
        assert.deepStrictEqual(actualClassicTokens.tokens, expectedClassicTokens);
        const actualModernTokens = adapter.tokenizeEncoded('whatever', true, MockState.INSTANCE);
        const modernTokens = [];
        for (let i = 0; i < actualModernTokens.tokens.length; i++) {
            modernTokens[i] = actualModernTokens.tokens[i];
        }
        // Add the encoded language id to the expected tokens
        const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
        const tokenLanguageMetadata = encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */;
        for (let i = 1; i < expectedModernTokens.length; i += 2) {
            expectedModernTokens[i] |= tokenLanguageMetadata;
        }
        assert.deepStrictEqual(modernTokens, expectedModernTokens);
        disposables.dispose();
    }
    test('tokens always start at index 0', () => {
        testBadTokensProvider([
            { startIndex: 7, scopes: 'foo' },
            { startIndex: 0, scopes: 'bar' },
        ], [new Token(0, 'foo', languageId), new Token(0, 'bar', languageId)], [
            0,
            (0 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            0,
            (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
        ]);
    });
    test('tokens always start after each other', () => {
        testBadTokensProvider([
            { startIndex: 0, scopes: 'foo' },
            { startIndex: 5, scopes: 'bar' },
            { startIndex: 3, scopes: 'foo' },
        ], [
            new Token(0, 'foo', languageId),
            new Token(5, 'bar', languageId),
            new Token(5, 'foo', languageId),
        ], [
            0,
            (0 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            5,
            (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            5,
            (2 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvdGVzdC9icm93c2VyL3N0YW5kYWxvbmVMYW5ndWFnZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBR04sMEJBQTBCLEdBRTFCLE1BQU0sc0NBQXNDLENBQUE7QUFNN0MsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBUXhFLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUE7SUFDekIsb0ZBQW9GO0lBRXBGLE1BQU0sY0FBZSxTQUFRLFVBQVU7UUFFdEM7WUFDQyxLQUFLLENBQUMsSUFBSyxFQUFFLElBQUssQ0FBQyxDQUFBO1lBRlosWUFBTyxHQUFHLENBQUMsQ0FBQTtRQUduQixDQUFDO1FBQ2UsS0FBSyxDQUFDLFVBQXNCLEVBQUUsS0FBYTtZQUMxRCxP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