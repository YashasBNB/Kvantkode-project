/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Hash } from './tokens/hash.js';
import { Dash } from './tokens/dash.js';
import { Colon } from './tokens/colon.js';
import { FormFeed } from './tokens/formFeed.js';
import { Tab } from './tokens/tab.js';
import { Word } from './tokens/word.js';
import { VerticalTab } from './tokens/verticalTab.js';
import { Space } from './tokens/space.js';
import { NewLine } from '../linesCodec/tokens/newLine.js';
import { ExclamationMark } from './tokens/exclamationMark.js';
import { CarriageReturn } from '../linesCodec/tokens/carriageReturn.js';
import { LinesDecoder } from '../linesCodec/linesDecoder.js';
import { LeftBracket, RightBracket } from './tokens/brackets.js';
import { BaseDecoder } from '../../../../base/common/codecs/baseDecoder.js';
import { LeftParenthesis, RightParenthesis } from './tokens/parentheses.js';
import { LeftAngleBracket, RightAngleBracket } from './tokens/angleBrackets.js';
/**
 * List of well-known distinct tokens that this decoder emits (excluding
 * the word stop characters defined below). Everything else is considered
 * an arbitrary "text" sequence and is emitted as a single `Word` token.
 */
const WELL_KNOWN_TOKENS = Object.freeze([
    Space,
    Tab,
    VerticalTab,
    FormFeed,
    LeftBracket,
    RightBracket,
    LeftAngleBracket,
    RightAngleBracket,
    LeftParenthesis,
    RightParenthesis,
    Colon,
    Hash,
    Dash,
    ExclamationMark,
]);
/**
 * Characters that stop a "word" sequence.
 * Note! the `\r` and `\n` are excluded from the list because this decoder based on `LinesDecoder` which
 * 	     already handles the `carriagereturn`/`newline` cases and emits lines that don't contain them.
 */
const WORD_STOP_CHARACTERS = Object.freeze([
    Space.symbol,
    Tab.symbol,
    VerticalTab.symbol,
    FormFeed.symbol,
    LeftBracket.symbol,
    RightBracket.symbol,
    LeftAngleBracket.symbol,
    RightAngleBracket.symbol,
    LeftParenthesis.symbol,
    RightParenthesis.symbol,
    Colon.symbol,
    Hash.symbol,
    Dash.symbol,
    ExclamationMark.symbol,
]);
/**
 * A decoder that can decode a stream of `Line`s into a stream
 * of simple token, - `Word`, `Space`, `Tab`, `NewLine`, etc.
 */
export class SimpleDecoder extends BaseDecoder {
    constructor(stream) {
        super(new LinesDecoder(stream));
    }
    onStreamData(token) {
        // re-emit new line tokens immediately
        if (token instanceof CarriageReturn || token instanceof NewLine) {
            this._onData.fire(token);
            return;
        }
        // loop through the text separating it into `Word` and `Space` tokens
        let i = 0;
        while (i < token.text.length) {
            // index is 0-based, but column numbers are 1-based
            const columnNumber = i + 1;
            // check if the current character is a well-known token
            const tokenConstructor = WELL_KNOWN_TOKENS.find((wellKnownToken) => {
                return wellKnownToken.symbol === token.text[i];
            });
            // if it is a well-known token, emit it and continue to the next one
            if (tokenConstructor) {
                this._onData.fire(tokenConstructor.newOnLine(token, columnNumber));
                i++;
                continue;
            }
            // otherwise, it is an arbitrary "text" sequence of characters,
            // that needs to be collected into a single `Word` token, hence
            // read all the characters until a stop character is encountered
            let word = '';
            while (i < token.text.length && !WORD_STOP_CHARACTERS.includes(token.text[i])) {
                word += token.text[i];
                i++;
            }
            // emit a "text" sequence of characters as a single `Word` token
            this._onData.fire(Word.newOnLine(word, token, columnNumber));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3Mvc2ltcGxlQ29kZWMvc2ltcGxlRGVjb2Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDdkMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDL0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxZQUFZLEVBQWMsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBWSxNQUFNLHNCQUFzQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFnQixNQUFNLHlCQUF5QixDQUFBO0FBQ3pG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