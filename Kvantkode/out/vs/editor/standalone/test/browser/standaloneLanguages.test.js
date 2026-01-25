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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS90ZXN0L2Jyb3dzZXIvc3RhbmRhbG9uZUxhbmd1YWdlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFHTiwwQkFBMEIsR0FFMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQU03QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFReEUsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQTtJQUN6QixvRkFBb0Y7SUFFcEYsTUFBTSxjQUFlLFNBQVEsVUFBVTtRQUV0QztZQUNDLEtBQUssQ0FBQyxJQUFLLEVBQUUsSUFBSyxDQUFDLENBQUE7WUFGWixZQUFPLEdBQUcsQ0FBQyxDQUFBO1FBR25CLENBQUM7UUFDZSxLQUFLLENBQUMsVUFBc0IsRUFBRSxLQUFhO1lB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