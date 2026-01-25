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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyQ29sb3JpemVyL2JyYWNrZXRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQTtBQUMvSCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGdCQUFnQixHQUNoQixNQUFNLDBGQUEwRixDQUFBO0FBS2pHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRWxHLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQixNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUE7UUFDOUIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixFQUFVLENBQUE7UUFDdkQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxRQUFrQixFQUFFLEVBQUU7WUFDOUMsSUFBSSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDekMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsTUFBTSxDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4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