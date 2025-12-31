/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Hash } from './tokens/hash.js';
import { Dash } from './tokens/dash.js';
import { Colon } from './tokens/colon.js';
import { FormFeed } from './tokens/formFeed.js';
import { Tab } from '../simpleCodec/tokens/tab.js';
import { Word } from '../simpleCodec/tokens/word.js';
import { VerticalTab } from './tokens/verticalTab.js';
import { Space } from '../simpleCodec/tokens/space.js';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL3NpbXBsZUNvZGVjL3NpbXBsZURlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQy9DLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRTdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFjLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQVksTUFBTSxzQkFBc0IsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBZ0IsTUFBTSx5QkFBeUIsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUs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