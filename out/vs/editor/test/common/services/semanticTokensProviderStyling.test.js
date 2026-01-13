/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { SparseMultilineTokens } from '../../../common/tokens/sparseMultilineTokens.js';
import { SemanticTokensProviderStyling, toMultilineTokens2, } from '../../../common/services/semanticTokensProviderStyling.js';
import { createModelServices } from '../testTextModel.js';
import { IThemeService, } from '../../../../platform/theme/common/themeService.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ModelService', () => {
    let disposables;
    let instantiationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
        languageService = instantiationService.get(ILanguageService);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #134973: invalid semantic tokens should be handled better', () => {
        const languageId = 'java';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const legend = {
            tokenTypes: ['st0', 'st1', 'st2', 'st3', 'st4', 'st5', 'st6', 'st7', 'st8', 'st9', 'st10'],
            tokenModifiers: [],
        };
        instantiationService.stub(IThemeService, {
            getColorTheme() {
                return {
                    getTokenStyleMetadata: (tokenType, tokenModifiers, languageId) => {
                        return {
                            foreground: parseInt(tokenType.substr(2), 10),
                            bold: undefined,
                            underline: undefined,
                            strikethrough: undefined,
                            italic: undefined,
                        };
                    },
                };
            },
        });
        const styling = instantiationService.createInstance(SemanticTokensProviderStyling, legend);
        const badTokens = {
            data: new Uint32Array([
                0, 13, 16, 1, 0, 1, 2, 6, 2, 0, 0, 7, 6, 3, 0, 0, 15, 8, 4, 0, 0, 17, 1, 5, 0, 0, 7, 5, 6,
                0, 1, 12, 8, 7, 0, 0, 19, 5, 8, 0, 0, 7, 1, 9, 0, 0, 4294967294, 5, 10, 0,
            ]),
        };
        const result = toMultilineTokens2(badTokens, styling, languageId);
        const expected = SparseMultilineTokens.create(1, new Uint32Array([
            0,
            13,
            29,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            1,
            2,
            8,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (2 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            1,
            9,
            15,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (3 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            1,
            24,
            32,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (4 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            1,
            41,
            42,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (5 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            1,
            48,
            53,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (6 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            2,
            12,
            20,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (7 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            2,
            31,
            36,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (8 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            2,
            38,
            39,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (9 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
        ]));
        assert.deepStrictEqual(result.toString(), expected.toString());
    });
    test('issue #148651: VSCode UI process can hang if a semantic token with negative values is returned by language service', () => {
        const languageId = 'dockerfile';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const legend = {
            tokenTypes: ['st0', 'st1', 'st2', 'st3', 'st4', 'st5', 'st6', 'st7', 'st8', 'st9'],
            tokenModifiers: ['stm0', 'stm1', 'stm2'],
        };
        instantiationService.stub(IThemeService, {
            getColorTheme() {
                return {
                    getTokenStyleMetadata: (tokenType, tokenModifiers, languageId) => {
                        return {
                            foreground: parseInt(tokenType.substr(2), 10),
                            bold: undefined,
                            underline: undefined,
                            strikethrough: undefined,
                            italic: undefined,
                        };
                    },
                };
            },
        });
        const styling = instantiationService.createInstance(SemanticTokensProviderStyling, legend);
        const badTokens = {
            data: new Uint32Array([
                0, 0, 3, 0, 0, 0, 4, 2, 2, 0, 0, 2, 3, 8, 0, 0, 3, 1, 9, 0, 0, 1, 1, 10, 0, 0, 1, 4, 8, 0,
                0, 4, 4294967292, 2, 0, 0, 4294967292, 4294967294, 8, 0, 0, 4294967294, 1, 9, 0, 0, 1, 1,
                10, 0, 0, 1, 3, 8, 0, 0, 3, 4294967291, 8, 0, 0, 4294967291, 1, 9, 0, 0, 1, 1, 10, 0, 0, 1,
                4, 8, 0,
            ]),
        };
        const result = toMultilineTokens2(badTokens, styling, languageId);
        const expected = SparseMultilineTokens.create(1, new Uint32Array([
            0,
            4,
            6,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            0,
            6,
            9,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (2 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            0,
            9,
            10,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (3 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            0,
            11,
            15,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (4 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
        ]));
        assert.deepStrictEqual(result.toString(), expected.toString());
    });
    test('issue #149130: vscode freezes because of Bracket Pair Colorization', () => {
        const languageId = 'q';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const legend = {
            tokenTypes: ['st0', 'st1', 'st2', 'st3', 'st4', 'st5'],
            tokenModifiers: ['stm0', 'stm1', 'stm2'],
        };
        instantiationService.stub(IThemeService, {
            getColorTheme() {
                return {
                    getTokenStyleMetadata: (tokenType, tokenModifiers, languageId) => {
                        return {
                            foreground: parseInt(tokenType.substr(2), 10),
                            bold: undefined,
                            underline: undefined,
                            strikethrough: undefined,
                            italic: undefined,
                        };
                    },
                };
            },
        });
        const styling = instantiationService.createInstance(SemanticTokensProviderStyling, legend);
        const badTokens = {
            data: new Uint32Array([0, 11, 1, 1, 0, 0, 4, 1, 1, 0, 0, 4294967289, 1, 1, 0]),
        };
        const result = toMultilineTokens2(badTokens, styling, languageId);
        const expected = SparseMultilineTokens.create(1, new Uint32Array([
            0,
            11,
            12,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
            0,
            15,
            16,
            16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */ | (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */),
        ]));
        assert.deepStrictEqual(result.toString(), expected.toString());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNQcm92aWRlclN0eWxpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL3NlbWFudGljVG9rZW5zUHJvdmlkZXJTdHlsaW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUV2RixPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLGtCQUFrQixHQUNsQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXpELE9BQU8sRUFFTixhQUFhLEdBRWIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQixJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJQUFJLGVBQWlDLENBQUE7SUFFckMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ25DLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZELGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMs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