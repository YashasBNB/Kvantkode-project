/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { LanguageAgnosticBracketTokens } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/brackets.js';
import { lengthAdd, lengthsToRange, lengthZero, } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/length.js';
import { DenseKeyProvider } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/smallImmutableSet.js';
import { TextBufferTokenizer, } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/tokenizer.js';
import { createModelServices, instantiateTextModel } from '../../testTextModel.js';
suite('Bracket Pair Colorizer - Tokenizer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Basic', () => {
        const mode1 = 'testMode1';
        const disposableStore = new DisposableStore();
        const instantiationService = createModelServices(disposableStore);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposableStore.add(languageService.registerLanguage({ id: mode1 }));
        const encodedMode1 = languageService.languageIdCodec.encodeLanguageId(mode1);
        const denseKeyProvider = new DenseKeyProvider();
        const tStandard = (text) => new TokenInfo(text, encodedMode1, 0 /* StandardTokenType.Other */, true);
        const tComment = (text) => new TokenInfo(text, encodedMode1, 1 /* StandardTokenType.Comment */, true);
        const document = new TokenizedDocument([
            tStandard(' { } '),
            tStandard('be'),
            tStandard('gin end'),
            tStandard('\n'),
            tStandard('hello'),
            tComment('{'),
            tStandard('}'),
        ]);
        disposableStore.add(TokenizationRegistry.register(mode1, document.getTokenizationSupport()));
        disposableStore.add(languageConfigurationService.register(mode1, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
                ['begin', 'end'],
            ],
        }));
        const model = disposableStore.add(instantiateTextModel(instantiationService, document.getText(), mode1));
        model.tokenization.forceTokenization(model.getLineCount());
        const brackets = new LanguageAgnosticBracketTokens(denseKeyProvider, (l) => languageConfigurationService.getLanguageConfiguration(l));
        const tokens = readAllTokens(new TextBufferTokenizer(model, brackets));
        assert.deepStrictEqual(toArr(tokens, model, denseKeyProvider), [
            { text: ' ', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: '{',
                bracketId: 'testMode1:::{',
                bracketIds: ['testMode1:::{'],
                kind: 'OpeningBracket',
            },
            { text: ' ', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: '}',
                bracketId: 'testMode1:::{',
                bracketIds: ['testMode1:::{'],
                kind: 'ClosingBracket',
            },
            { text: ' ', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: 'begin',
                bracketId: 'testMode1:::begin',
                bracketIds: ['testMode1:::begin'],
                kind: 'OpeningBracket',
            },
            { text: ' ', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: 'end',
                bracketId: 'testMode1:::begin',
                bracketIds: ['testMode1:::begin'],
                kind: 'ClosingBracket',
            },
            { text: '\nhello{', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: '}',
                bracketId: 'testMode1:::{',
                bracketIds: ['testMode1:::{'],
                kind: 'ClosingBracket',
            },
        ]);
        disposableStore.dispose();
    });
});
function readAllTokens(tokenizer) {
    const tokens = new Array();
    while (true) {
        const token = tokenizer.read();
        if (!token) {
            break;
        }
        tokens.push(token);
    }
    return tokens;
}
function toArr(tokens, model, keyProvider) {
    const result = new Array();
    let offset = lengthZero;
    for (const token of tokens) {
        result.push(tokenToObj(token, offset, model, keyProvider));
        offset = lengthAdd(offset, token.length);
    }
    return result;
}
function tokenToObj(token, offset, model, keyProvider) {
    return {
        text: model.getValueInRange(lengthsToRange(offset, lengthAdd(offset, token.length))),
        bracketId: keyProvider.reverseLookup(token.bracketId) || null,
        bracketIds: keyProvider.reverseLookupSet(token.bracketIds),
        kind: {
            [2 /* TokenKind.ClosingBracket */]: 'ClosingBracket',
            [1 /* TokenKind.OpeningBracket */]: 'OpeningBracket',
            [0 /* TokenKind.Text */]: 'Text',
        }[token.kind],
    };
}
export class TokenizedDocument {
    constructor(tokens) {
        const tokensByLine = new Array();
        let curLine = new Array();
        for (const token of tokens) {
            const lines = token.text.split('\n');
            let first = true;
            while (lines.length > 0) {
                if (!first) {
                    tokensByLine.push(curLine);
                    curLine = new Array();
                }
                else {
                    first = false;
                }
                if (lines[0].length > 0) {
                    curLine.push(token.withText(lines[0]));
                }
                lines.pop();
            }
        }
        tokensByLine.push(curLine);
        this.tokensByLine = tokensByLine;
    }
    getText() {
        return this.tokensByLine.map((t) => t.map((t) => t.text).join('')).join('\n');
    }
    getTokenizationSupport() {
        class State {
            constructor(lineNumber) {
                this.lineNumber = lineNumber;
            }
            clone() {
                return new State(this.lineNumber);
            }
            equals(other) {
                return this.lineNumber === other.lineNumber;
            }
        }
        return {
            getInitialState: () => new State(0),
            tokenize: () => {
                throw new Error('Method not implemented.');
            },
            tokenizeEncoded: (line, hasEOL, state) => {
                const state2 = state;
                const tokens = this.tokensByLine[state2.lineNumber];
                const arr = new Array();
                let offset = 0;
                for (const t of tokens) {
                    arr.push(offset, t.getMetadata());
                    offset += t.text.length;
                }
                return new EncodedTokenizationResult(new Uint32Array(arr), new State(state2.lineNumber + 1));
            },
        };
    }
}
export class TokenInfo {
    constructor(text, languageId, tokenType, hasBalancedBrackets) {
        this.text = text;
        this.languageId = languageId;
        this.tokenType = tokenType;
        this.hasBalancedBrackets = hasBalancedBrackets;
    }
    getMetadata() {
        return ((((this.languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (this.tokenType << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>>
            0) |
            (this.hasBalancedBrackets ? 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */ : 0));
    }
    withText(text) {
        return new TokenInfo(text, this.languageId, this.tokenType, this.hasBalancedBrackets);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9icmFja2V0UGFpckNvbG9yaXplci90b2tlbml6ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBTWxHLE9BQU8sRUFDTix5QkFBeUIsRUFHekIsb0JBQW9CLEdBQ3BCLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDN0csT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0saUZBQWlGLENBQUE7QUFDL0gsT0FBTyxFQUVOLFNBQVMsRUFDVCxjQUFjLEVBQ2QsVUFBVSxHQUNWLE1BQU0sK0VBQStFLENBQUE7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEZBQTBGLENBQUE7QUFDM0gsT0FBTyxFQUNOLG1CQUFtQixHQUluQixNQUFNLGtGQUFrRixDQUFBO0FBRXpGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRWxGLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDaEQsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUE7UUFDekIsTUFBTSxlQUFlLEdBQUcsSUFB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