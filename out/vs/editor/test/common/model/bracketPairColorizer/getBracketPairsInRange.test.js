/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { disposeOnReturn } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { TokenizationRegistry } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { TokenInfo, TokenizedDocument } from './tokenizer.test.js';
import { createModelServices, instantiateTextModel } from '../../testTextModel.js';
suite('Bracket Pair Colorizer - getBracketPairsInRange', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function createTextModelWithColorizedBracketPairs(store, text) {
        const languageId = 'testLanguage';
        const instantiationService = createModelServices(store);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        store.add(languageService.registerLanguage({
            id: languageId,
        }));
        const encodedMode1 = languageService.languageIdCodec.encodeLanguageId(languageId);
        const document = new TokenizedDocument([
            new TokenInfo(text, encodedMode1, 0 /* StandardTokenType.Other */, true),
        ]);
        store.add(TokenizationRegistry.register(languageId, document.getTokenizationSupport()));
        store.add(languageConfigurationService.register(languageId, {
            brackets: [['<', '>']],
            colorizedBracketPairs: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
        const textModel = store.add(instantiateTextModel(instantiationService, text, languageId));
        return textModel;
    }
    test('Basic 1', () => {
        disposeOnReturn((store) => {
            const doc = new AnnotatedDocument(`{ ( [] ¹ ) [ ² { } ] () } []`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            model.tokenization.getLineTokens(1).getLanguageId(0);
            assert.deepStrictEqual(model.bracketPairs.getBracketPairsInRange(doc.range(1, 2)).map(bracketPairToJSON).toArray(), [
                {
                    level: 0,
                    range: '[1,1 -> 1,2]',
                    openRange: '[1,1 -> 1,2]',
                    closeRange: '[1,23 -> 1,24]',
                },
                {
                    level: 1,
                    range: '[1,3 -> 1,4]',
                    openRange: '[1,3 -> 1,4]',
                    closeRange: '[1,9 -> 1,10]',
                },
                {
                    level: 1,
                    range: '[1,11 -> 1,12]',
                    openRange: '[1,11 -> 1,12]',
                    closeRange: '[1,18 -> 1,19]',
                },
            ]);
        });
    });
    test('Basic 2', () => {
        disposeOnReturn((store) => {
            const doc = new AnnotatedDocument(`{ ( [] ¹ ²) [  { } ] () } []`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs.getBracketPairsInRange(doc.range(1, 2)).map(bracketPairToJSON).toArray(), [
                {
                    level: 0,
                    range: '[1,1 -> 1,2]',
                    openRange: '[1,1 -> 1,2]',
                    closeRange: '[1,23 -> 1,24]',
                },
                {
                    level: 1,
                    range: '[1,3 -> 1,4]',
                    openRange: '[1,3 -> 1,4]',
                    closeRange: '[1,9 -> 1,10]',
                },
            ]);
        });
    });
    test('Basic Empty', () => {
        disposeOnReturn((store) => {
            const doc = new AnnotatedDocument(`¹ ² { ( [] ) [  { } ] () } []`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs.getBracketPairsInRange(doc.range(1, 2)).map(bracketPairToJSON).toArray(), []);
        });
    });
    test('Basic All', () => {
        disposeOnReturn((store) => {
            const doc = new AnnotatedDocument(`¹ { ( [] ) [  { } ] () } [] ²`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs.getBracketPairsInRange(doc.range(1, 2)).map(bracketPairToJSON).toArray(), [
                {
                    level: 0,
                    range: '[1,2 -> 1,3]',
                    openRange: '[1,2 -> 1,3]',
                    closeRange: '[1,23 -> 1,24]',
                },
                {
                    level: 1,
                    range: '[1,4 -> 1,5]',
                    openRange: '[1,4 -> 1,5]',
                    closeRange: '[1,9 -> 1,10]',
                },
                {
                    level: 2,
                    range: '[1,6 -> 1,7]',
                    openRange: '[1,6 -> 1,7]',
                    closeRange: '[1,7 -> 1,8]',
                },
                {
                    level: 1,
                    range: '[1,11 -> 1,12]',
                    openRange: '[1,11 -> 1,12]',
                    closeRange: '[1,18 -> 1,19]',
                },
                {
                    level: 2,
                    range: '[1,14 -> 1,15]',
                    openRange: '[1,14 -> 1,15]',
                    closeRange: '[1,16 -> 1,17]',
                },
                {
                    level: 1,
                    range: '[1,20 -> 1,21]',
                    openRange: '[1,20 -> 1,21]',
                    closeRange: '[1,21 -> 1,22]',
                },
                {
                    level: 0,
                    range: '[1,25 -> 1,26]',
                    openRange: '[1,25 -> 1,26]',
                    closeRange: '[1,26 -> 1,27]',
                },
            ]);
        });
    });
    test('getBracketsInRange', () => {
        disposeOnReturn((store) => {
            const doc = new AnnotatedDocument(`¹ { [ ( [ [ (  ) ] ] ) ] } { } ²`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketsInRange(doc.range(1, 2))
                .map((b) => ({
                level: b.nestingLevel,
                levelEqualBracketType: b.nestingLevelOfEqualBracketType,
                range: b.range.toString(),
            }))
                .toArray(), [
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,2 -> 1,3]',
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: '[1,4 -> 1,5]',
                },
                {
                    level: 2,
                    levelEqualBracketType: 0,
                    range: '[1,6 -> 1,7]',
                },
                {
                    level: 3,
                    levelEqualBracketType: 1,
                    range: '[1,8 -> 1,9]',
                },
                {
                    level: 4,
                    levelEqualBracketType: 2,
                    range: '[1,10 -> 1,11]',
                },
                {
                    level: 5,
                    levelEqualBracketType: 1,
                    range: '[1,12 -> 1,13]',
                },
                {
                    level: 5,
                    levelEqualBracketType: 1,
                    range: '[1,15 -> 1,16]',
                },
                {
                    level: 4,
                    levelEqualBracketType: 2,
                    range: '[1,17 -> 1,18]',
                },
                {
                    level: 3,
                    levelEqualBracketType: 1,
                    range: '[1,19 -> 1,20]',
                },
                {
                    level: 2,
                    levelEqualBracketType: 0,
                    range: '[1,21 -> 1,22]',
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: '[1,23 -> 1,24]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,25 -> 1,26]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,27 -> 1,28]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,29 -> 1,30]',
                },
            ]);
        });
    });
    test('Test Error Brackets', () => {
        disposeOnReturn((store) => {
            const doc = new AnnotatedDocument(`¹ { () ] ² `);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketsInRange(doc.range(1, 2))
                .map((b) => ({
                level: b.nestingLevel,
                range: b.range.toString(),
                isInvalid: b.isInvalid,
            }))
                .toArray(), [
                {
                    level: 0,
                    isInvalid: true,
                    range: '[1,2 -> 1,3]',
                },
                {
                    level: 1,
                    isInvalid: false,
                    range: '[1,4 -> 1,5]',
                },
                {
                    level: 1,
                    isInvalid: false,
                    range: '[1,5 -> 1,6]',
                },
                {
                    level: 0,
                    isInvalid: true,
                    range: '[1,7 -> 1,8]',
                },
            ]);
        });
    });
    test('colorizedBracketsVSBrackets', () => {
        disposeOnReturn((store) => {
            const doc = new AnnotatedDocument(`¹ {} [<()>] <{>} ²`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketsInRange(doc.range(1, 2), true)
                .map((b) => ({
                level: b.nestingLevel,
                levelEqualBracketType: b.nestingLevelOfEqualBracketType,
                range: b.range.toString(),
            }))
                .toArray(), [
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,2 -> 1,3]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,3 -> 1,4]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,5 -> 1,6]',
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: '[1,7 -> 1,8]',
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: '[1,8 -> 1,9]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,10 -> 1,11]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,13 -> 1,14]',
                },
                {
                    level: -1,
                    levelEqualBracketType: 0,
                    range: '[1,15 -> 1,16]',
                },
            ]);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketsInRange(doc.range(1, 2), false)
                .map((b) => ({
                level: b.nestingLevel,
                levelEqualBracketType: b.nestingLevelOfEqualBracketType,
                range: b.range.toString(),
            }))
                .toArray(), [
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,2 -> 1,3]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,3 -> 1,4]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,5 -> 1,6]',
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: '[1,6 -> 1,7]',
                },
                {
                    level: 2,
                    levelEqualBracketType: 0,
                    range: '[1,7 -> 1,8]',
                },
                {
                    level: 2,
                    levelEqualBracketType: 0,
                    range: '[1,8 -> 1,9]',
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: '[1,9 -> 1,10]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,10 -> 1,11]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,12 -> 1,13]',
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: '[1,13 -> 1,14]',
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: '[1,14 -> 1,15]',
                },
                {
                    level: -1,
                    levelEqualBracketType: 0,
                    range: '[1,15 -> 1,16]',
                },
            ]);
        });
    });
});
function bracketPairToJSON(pair) {
    return {
        level: pair.nestingLevel,
        range: pair.openingBracketRange.toString(),
        openRange: pair.openingBracketRange.toString(),
        closeRange: pair.closingBracketRange?.toString() || null,
    };
}
class PositionOffsetTransformer {
    constructor(text) {
        this.lineStartOffsetByLineIdx = [];
        this.lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < text.length; i++) {
            if (text.charAt(i) === '\n') {
                this.lineStartOffsetByLineIdx.push(i + 1);
            }
        }
    }
    getOffset(position) {
        return this.lineStartOffsetByLineIdx[position.lineNumber - 1] + position.column - 1;
    }
    getPosition(offset) {
        const lineNumber = this.lineStartOffsetByLineIdx.findIndex((lineStartOffset) => lineStartOffset <= offset);
        return new Position(lineNumber + 1, offset - this.lineStartOffsetByLineIdx[lineNumber] + 1);
    }
}
class AnnotatedDocument {
    constructor(src) {
        const numbers = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
        let text = '';
        const offsetPositions = new Map();
        let offset = 0;
        for (let i = 0; i < src.length; i++) {
            const idx = numbers.indexOf(src[i]);
            if (idx >= 0) {
                offsetPositions.set(idx, offset);
            }
            else {
                text += src[i];
                offset++;
            }
        }
        this.text = text;
        const mapper = new PositionOffsetTransformer(this.text);
        const positions = new Map();
        for (const [idx, offset] of offsetPositions.entries()) {
            positions.set(idx, mapper.getPosition(offset));
        }
        this.positions = positions;
    }
    range(start, end) {
        return Range.fromPositions(this.positions.get(start), this.positions.get(end));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0QnJhY2tldFBhaXJzSW5SYW5nZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyQ29sb3JpemVyL2dldEJyYWNrZXRQYWlyc0luUmFuZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFtQixlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRzdHLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUVsRixLQUFLLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO0lBQzdELHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyx3Q0FBd0MsQ0FDaEQsS0FBc0IsRUFDdEIsSUFBWTtRQUVaLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQTtRQUNqQyxNQUFNLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sNEJBQTRCLEdB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