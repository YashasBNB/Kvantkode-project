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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJDb2xvcml6ZXIvdG9rZW5pemVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQU1sRyxPQUFPLEVBQ04seUJBQXlCLEVBR3pCLG9CQUFvQixHQUNwQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGlGQUFpRixDQUFBO0FBQy9ILE9BQU8sRUFFTixTQUFTLEVBQ1QsY0FBYyxFQUNkLFVBQVUsR0FDVixNQUFNLCtFQUErRSxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBGQUEwRixDQUFBO0FBQzNILE9BQU8sRUFDTixtQkFBbUIsR0FJbkIsTUFBTSxrRkFBa0YsQ0FBQTtBQUV6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUVsRixLQUFLLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO0lBQ2hELHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbEIsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFBO1FBQ3pCLE1BQU0sZUFBZSxHQUFHLElBQUksZUFB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