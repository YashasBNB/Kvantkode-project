/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { StandardAutoClosingPairConditional } from '../../../../common/languages/languageConfiguration.js';
import { CharacterPairSupport } from '../../../../common/languages/supports/characterPair.js';
import { createFakeScopedLineTokens } from '../../modesTestUtils.js';
suite('CharacterPairSupport', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('only autoClosingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({
            autoClosingPairs: [{ open: 'a', close: 'b' }],
        });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), [
            new StandardAutoClosingPairConditional({ open: 'a', close: 'b' }),
        ]);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), [
            new StandardAutoClosingPairConditional({ open: 'a', close: 'b' }),
        ]);
    });
    test('only empty autoClosingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({ autoClosingPairs: [] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), []);
    });
    test('only brackets', () => {
        const characaterPairSupport = new CharacterPairSupport({ brackets: [['a', 'b']] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), [
            new StandardAutoClosingPairConditional({ open: 'a', close: 'b' }),
        ]);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), [
            new StandardAutoClosingPairConditional({ open: 'a', close: 'b' }),
        ]);
    });
    test('only empty brackets', () => {
        const characaterPairSupport = new CharacterPairSupport({ brackets: [] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), []);
    });
    test('only surroundingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({
            surroundingPairs: [{ open: 'a', close: 'b' }],
        });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), [{ open: 'a', close: 'b' }]);
    });
    test('only empty surroundingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({ surroundingPairs: [] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), []);
    });
    test('brackets is ignored when having autoClosingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({
            autoClosingPairs: [],
            brackets: [['a', 'b']],
        });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), []);
    });
    function testShouldAutoClose(characterPairSupport, line, column) {
        const autoClosingPair = characterPairSupport.getAutoClosingPairs()[0];
        return autoClosingPair.shouldAutoClose(createFakeScopedLineTokens(line), column);
    }
    test('shouldAutoClosePair in empty line', () => {
        const sup = new CharacterPairSupport({
            autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }],
        });
        const tokenText = [];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 1), true);
    });
    test('shouldAutoClosePair in not interesting line 1', () => {
        const sup = new CharacterPairSupport({
            autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }],
        });
        const tokenText = [{ text: 'do', type: 0 /* StandardTokenType.Other */ }];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), true);
    });
    test('shouldAutoClosePair in not interesting line 2', () => {
        const sup = new CharacterPairSupport({ autoClosingPairs: [{ open: '{', close: '}' }] });
        const tokenText = [{ text: 'do', type: 2 /* StandardTokenType.String */ }];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), true);
    });
    test('shouldAutoClosePair in interesting line 1', () => {
        const sup = new CharacterPairSupport({
            autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }],
        });
        const tokenText = [{ text: '"a"', type: 2 /* StandardTokenType.String */ }];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 1), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 2), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 4), false);
    });
    test('shouldAutoClosePair in interesting line 2', () => {
        const sup = new CharacterPairSupport({
            autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }],
        });
        const tokenText = [
            { text: 'x=', type: 0 /* StandardTokenType.Other */ },
            { text: '"a"', type: 2 /* StandardTokenType.String */ },
            { text: ';', type: 0 /* StandardTokenType.Other */ },
        ];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 1), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 2), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 4), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 5), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 6), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 7), true);
    });
    test('shouldAutoClosePair in interesting line 3', () => {
        const sup = new CharacterPairSupport({
            autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }],
        });
        const tokenText = [
            { text: ' ', type: 0 /* StandardTokenType.Other */ },
            { text: '//a', type: 1 /* StandardTokenType.Comment */ },
        ];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 1), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 2), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 4), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 5), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyUGFpci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL3N1cHBvcnRzL2NoYXJhY3RlclBhaXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDMUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDN0YsT0FBTyxFQUFhLDBCQUEwQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFL0UsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3RELGdCQUFnQixFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQztTQUM3QyxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLEVBQUU7WUFDbkUsSUFBSSxrQ0FBa0MsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDO1NBQ2pFLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLEVBQUUsRUFBRTtZQUNuRSxJQUFJLGtDQUFrQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxL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