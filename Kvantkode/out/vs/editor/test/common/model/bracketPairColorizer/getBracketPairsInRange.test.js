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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0QnJhY2tldFBhaXJzSW5SYW5nZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJDb2xvcml6ZXIvZ2V0QnJhY2tldFBhaXJzSW5SYW5nZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQW1CLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFHN0csT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRWxGLEtBQUssQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7SUFDN0QsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLHdDQUF3QyxDQUNoRCxLQUFzQixFQUN0QixJQUFZO1FBRVosTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFBO1FBQ2pDLE1BQU0sb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkQsTUFBTSw0QkFB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