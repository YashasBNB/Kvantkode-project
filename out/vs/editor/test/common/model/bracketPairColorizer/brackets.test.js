/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageAgnosticBracketTokens } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/brackets.js';
import { SmallImmutableSet, DenseKeyProvider, } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/smallImmutableSet.js';
import { TestLanguageConfigurationService } from '../../modes/testLanguageConfigurationService.js';
suite('Bracket Pair Colorizer - Brackets', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Basic', () => {
        const languageId = 'testMode1';
        const denseKeyProvider = new DenseKeyProvider();
        const getImmutableSet = (elements) => {
            let newSet = SmallImmutableSet.getEmpty();
            elements.forEach((x) => (newSet = newSet.add(`${languageId}:::${x}`, denseKeyProvider)));
            return newSet;
        };
        const getKey = (value) => {
            return denseKeyProvider.getKey(`${languageId}:::${value}`);
        };
        const disposableStore = new DisposableStore();
        const languageConfigService = disposableStore.add(new TestLanguageConfigurationService());
        disposableStore.add(languageConfigService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
                ['begin', 'end'],
                ['case', 'endcase'],
                ['casez', 'endcase'], // Verilog
                ['\\left(', '\\right)'],
                ['\\left(', '\\right.'],
                ['\\left.', '\\right)'], // LaTeX Parentheses
                ['\\left[', '\\right]'],
                ['\\left[', '\\right.'],
                ['\\left.', '\\right]'], // LaTeX Brackets
            ],
        }));
        const brackets = new LanguageAgnosticBracketTokens(denseKeyProvider, (l) => languageConfigService.getLanguageConfiguration(l));
        const bracketsExpected = [
            {
                text: '{',
                length: 1,
                kind: 'OpeningBracket',
                bracketId: getKey('{'),
                bracketIds: getImmutableSet(['{']),
            },
            {
                text: '[',
                length: 1,
                kind: 'OpeningBracket',
                bracketId: getKey('['),
                bracketIds: getImmutableSet(['[']),
            },
            {
                text: '(',
                length: 1,
                kind: 'OpeningBracket',
                bracketId: getKey('('),
                bracketIds: getImmutableSet(['(']),
            },
            {
                text: 'begin',
                length: 5,
                kind: 'OpeningBracket',
                bracketId: getKey('begin'),
                bracketIds: getImmutableSet(['begin']),
            },
            {
                text: 'case',
                length: 4,
                kind: 'OpeningBracket',
                bracketId: getKey('case'),
                bracketIds: getImmutableSet(['case']),
            },
            {
                text: 'casez',
                length: 5,
                kind: 'OpeningBracket',
                bracketId: getKey('casez'),
                bracketIds: getImmutableSet(['casez']),
            },
            {
                text: '\\left(',
                length: 6,
                kind: 'OpeningBracket',
                bracketId: getKey('\\left('),
                bracketIds: getImmutableSet(['\\left(']),
            },
            {
                text: '\\left.',
                length: 6,
                kind: 'OpeningBracket',
                bracketId: getKey('\\left.'),
                bracketIds: getImmutableSet(['\\left.']),
            },
            {
                text: '\\left[',
                length: 6,
                kind: 'OpeningBracket',
                bracketId: getKey('\\left['),
                bracketIds: getImmutableSet(['\\left[']),
            },
            {
                text: '}',
                length: 1,
                kind: 'ClosingBracket',
                bracketId: getKey('{'),
                bracketIds: getImmutableSet(['{']),
            },
            {
                text: ']',
                length: 1,
                kind: 'ClosingBracket',
                bracketId: getKey('['),
                bracketIds: getImmutableSet(['[']),
            },
            {
                text: ')',
                length: 1,
                kind: 'ClosingBracket',
                bracketId: getKey('('),
                bracketIds: getImmutableSet(['(']),
            },
            {
                text: 'end',
                length: 3,
                kind: 'ClosingBracket',
                bracketId: getKey('begin'),
                bracketIds: getImmutableSet(['begin']),
            },
            {
                text: 'endcase',
                length: 7,
                kind: 'ClosingBracket',
                bracketId: getKey('case'),
                bracketIds: getImmutableSet(['case', 'casez']),
            },
            {
                text: '\\right)',
                length: 7,
                kind: 'ClosingBracket',
                bracketId: getKey('\\left('),
                bracketIds: getImmutableSet(['\\left(', '\\left.']),
            },
            {
                text: '\\right.',
                length: 7,
                kind: 'ClosingBracket',
                bracketId: getKey('\\left('),
                bracketIds: getImmutableSet(['\\left(', '\\left[']),
            },
            {
                text: '\\right]',
                length: 7,
                kind: 'ClosingBracket',
                bracketId: getKey('\\left['),
                bracketIds: getImmutableSet(['\\left[', '\\left.']),
            },
        ];
        const bracketsActual = bracketsExpected.map((x) => tokenToObject(brackets.getToken(x.text, languageId), x.text));
        assert.deepStrictEqual(bracketsActual, bracketsExpected);
        disposableStore.dispose();
    });
});
function tokenToObject(token, text) {
    if (token === undefined) {
        return undefined;
    }
    return {
        text: text,
        length: token.length,
        bracketId: token.bracketId,
        bracketIds: token.bracketIds,
        kind: {
            [2 /* TokenKind.ClosingBracket */]: 'ClosingBracket',
            [1 /* TokenKind.OpeningBracket */]: 'OpeningBracket',
            [0 /* TokenKind.Text */]: 'Text',
        }[token.kind],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9icmFja2V0UGFpckNvbG9yaXplci9icmFja2V0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0saUZBQWlGLENBQUE7QUFDL0gsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixnQkFBZ0IsR0FDaEIsTUFBTSwwRkFBMEYsQ0FBQTtBQUtqRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVsRyxLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBQy9DLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbEIsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFBO1FBQzlCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBVSxDQUFBO1FBQ3ZELE1BQU0sZUFBZSxHQUFHLENBQUMsUUFBa0IsRUFBRSxFQUFFO1lBQzlDLElBQUksTUFBTSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ3pDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLE1BQU0sQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEYsT0FB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