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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNQcm92aWRlclN0eWxpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy9zZW1hbnRpY1Rva2Vuc1Byb3ZpZGVyU3R5bGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFdkYsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixrQkFBa0IsR0FDbEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUV6RCxPQUFPLEVBRU4sYUFBYSxHQUViLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSxlQUFpQyxDQUFBO0lBRXJDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN2RCxlQUFlLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FB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