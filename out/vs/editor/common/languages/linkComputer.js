/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CharacterClassifier } from '../core/characterClassifier.js';
export var State;
(function (State) {
    State[State["Invalid"] = 0] = "Invalid";
    State[State["Start"] = 1] = "Start";
    State[State["H"] = 2] = "H";
    State[State["HT"] = 3] = "HT";
    State[State["HTT"] = 4] = "HTT";
    State[State["HTTP"] = 5] = "HTTP";
    State[State["F"] = 6] = "F";
    State[State["FI"] = 7] = "FI";
    State[State["FIL"] = 8] = "FIL";
    State[State["BeforeColon"] = 9] = "BeforeColon";
    State[State["AfterColon"] = 10] = "AfterColon";
    State[State["AlmostThere"] = 11] = "AlmostThere";
    State[State["End"] = 12] = "End";
    State[State["Accept"] = 13] = "Accept";
    State[State["LastKnownState"] = 14] = "LastKnownState";
})(State || (State = {}));
class Uint8Matrix {
    constructor(rows, cols, defaultValue) {
        const data = new Uint8Array(rows * cols);
        for (let i = 0, len = rows * cols; i < len; i++) {
            data[i] = defaultValue;
        }
        this._data = data;
        this.rows = rows;
        this.cols = cols;
    }
    get(row, col) {
        return this._data[row * this.cols + col];
    }
    set(row, col, value) {
        this._data[row * this.cols + col] = value;
    }
}
export class StateMachine {
    constructor(edges) {
        let maxCharCode = 0;
        let maxState = 0 /* State.Invalid */;
        for (let i = 0, len = edges.length; i < len; i++) {
            const [from, chCode, to] = edges[i];
            if (chCode > maxCharCode) {
                maxCharCode = chCode;
            }
            if (from > maxState) {
                maxState = from;
            }
            if (to > maxState) {
                maxState = to;
            }
        }
        maxCharCode++;
        maxState++;
        const states = new Uint8Matrix(maxState, maxCharCode, 0 /* State.Invalid */);
        for (let i = 0, len = edges.length; i < len; i++) {
            const [from, chCode, to] = edges[i];
            states.set(from, chCode, to);
        }
        this._states = states;
        this._maxCharCode = maxCharCode;
    }
    nextState(currentState, chCode) {
        if (chCode < 0 || chCode >= this._maxCharCode) {
            return 0 /* State.Invalid */;
        }
        return this._states.get(currentState, chCode);
    }
}
// State machine for http:// or https:// or file://
let _stateMachine = null;
function getStateMachine() {
    if (_stateMachine === null) {
        _stateMachine = new StateMachine([
            [1 /* State.Start */, 104 /* CharCode.h */, 2 /* State.H */],
            [1 /* State.Start */, 72 /* CharCode.H */, 2 /* State.H */],
            [1 /* State.Start */, 102 /* CharCode.f */, 6 /* State.F */],
            [1 /* State.Start */, 70 /* CharCode.F */, 6 /* State.F */],
            [2 /* State.H */, 116 /* CharCode.t */, 3 /* State.HT */],
            [2 /* State.H */, 84 /* CharCode.T */, 3 /* State.HT */],
            [3 /* State.HT */, 116 /* CharCode.t */, 4 /* State.HTT */],
            [3 /* State.HT */, 84 /* CharCode.T */, 4 /* State.HTT */],
            [4 /* State.HTT */, 112 /* CharCode.p */, 5 /* State.HTTP */],
            [4 /* State.HTT */, 80 /* CharCode.P */, 5 /* State.HTTP */],
            [5 /* State.HTTP */, 115 /* CharCode.s */, 9 /* State.BeforeColon */],
            [5 /* State.HTTP */, 83 /* CharCode.S */, 9 /* State.BeforeColon */],
            [5 /* State.HTTP */, 58 /* CharCode.Colon */, 10 /* State.AfterColon */],
            [6 /* State.F */, 105 /* CharCode.i */, 7 /* State.FI */],
            [6 /* State.F */, 73 /* CharCode.I */, 7 /* State.FI */],
            [7 /* State.FI */, 108 /* CharCode.l */, 8 /* State.FIL */],
            [7 /* State.FI */, 76 /* CharCode.L */, 8 /* State.FIL */],
            [8 /* State.FIL */, 101 /* CharCode.e */, 9 /* State.BeforeColon */],
            [8 /* State.FIL */, 69 /* CharCode.E */, 9 /* State.BeforeColon */],
            [9 /* State.BeforeColon */, 58 /* CharCode.Colon */, 10 /* State.AfterColon */],
            [10 /* State.AfterColon */, 47 /* CharCode.Slash */, 11 /* State.AlmostThere */],
            [11 /* State.AlmostThere */, 47 /* CharCode.Slash */, 12 /* State.End */],
        ]);
    }
    return _stateMachine;
}
var CharacterClass;
(function (CharacterClass) {
    CharacterClass[CharacterClass["None"] = 0] = "None";
    CharacterClass[CharacterClass["ForceTermination"] = 1] = "ForceTermination";
    CharacterClass[CharacterClass["CannotEndIn"] = 2] = "CannotEndIn";
})(CharacterClass || (CharacterClass = {}));
let _classifier = null;
function getClassifier() {
    if (_classifier === null) {
        _classifier = new CharacterClassifier(0 /* CharacterClass.None */);
        // allow-any-unicode-next-line
        const FORCE_TERMINATION_CHARACTERS = ' \t<>\'\"、。｡､，．：；‘〈「『〔（［｛｢｣｝］）〕』」〉’｀～…';
        for (let i = 0; i < FORCE_TERMINATION_CHARACTERS.length; i++) {
            _classifier.set(FORCE_TERMINATION_CHARACTERS.charCodeAt(i), 1 /* CharacterClass.ForceTermination */);
        }
        const CANNOT_END_WITH_CHARACTERS = '.,;:';
        for (let i = 0; i < CANNOT_END_WITH_CHARACTERS.length; i++) {
            _classifier.set(CANNOT_END_WITH_CHARACTERS.charCodeAt(i), 2 /* CharacterClass.CannotEndIn */);
        }
    }
    return _classifier;
}
export class LinkComputer {
    static _createLink(classifier, line, lineNumber, linkBeginIndex, linkEndIndex) {
        // Do not allow to end link in certain characters...
        let lastIncludedCharIndex = linkEndIndex - 1;
        do {
            const chCode = line.charCodeAt(lastIncludedCharIndex);
            const chClass = classifier.get(chCode);
            if (chClass !== 2 /* CharacterClass.CannotEndIn */) {
                break;
            }
            lastIncludedCharIndex--;
        } while (lastIncludedCharIndex > linkBeginIndex);
        // Handle links enclosed in parens, square brackets and curlys.
        if (linkBeginIndex > 0) {
            const charCodeBeforeLink = line.charCodeAt(linkBeginIndex - 1);
            const lastCharCodeInLink = line.charCodeAt(lastIncludedCharIndex);
            if ((charCodeBeforeLink === 40 /* CharCode.OpenParen */ && lastCharCodeInLink === 41 /* CharCode.CloseParen */) ||
                (charCodeBeforeLink === 91 /* CharCode.OpenSquareBracket */ &&
                    lastCharCodeInLink === 93 /* CharCode.CloseSquareBracket */) ||
                (charCodeBeforeLink === 123 /* CharCode.OpenCurlyBrace */ &&
                    lastCharCodeInLink === 125 /* CharCode.CloseCurlyBrace */)) {
                // Do not end in ) if ( is before the link start
                // Do not end in ] if [ is before the link start
                // Do not end in } if { is before the link start
                lastIncludedCharIndex--;
            }
        }
        return {
            range: {
                startLineNumber: lineNumber,
                startColumn: linkBeginIndex + 1,
                endLineNumber: lineNumber,
                endColumn: lastIncludedCharIndex + 2,
            },
            url: line.substring(linkBeginIndex, lastIncludedCharIndex + 1),
        };
    }
    static computeLinks(model, stateMachine = getStateMachine()) {
        const classifier = getClassifier();
        const result = [];
        for (let i = 1, lineCount = model.getLineCount(); i <= lineCount; i++) {
            const line = model.getLineContent(i);
            const len = line.length;
            let j = 0;
            let linkBeginIndex = 0;
            let linkBeginChCode = 0;
            let state = 1 /* State.Start */;
            let hasOpenParens = false;
            let hasOpenSquareBracket = false;
            let inSquareBrackets = false;
            let hasOpenCurlyBracket = false;
            while (j < len) {
                let resetStateMachine = false;
                const chCode = line.charCodeAt(j);
                if (state === 13 /* State.Accept */) {
                    let chClass;
                    switch (chCode) {
                        case 40 /* CharCode.OpenParen */:
                            hasOpenParens = true;
                            chClass = 0 /* CharacterClass.None */;
                            break;
                        case 41 /* CharCode.CloseParen */:
                            chClass = hasOpenParens ? 0 /* CharacterClass.None */ : 1 /* CharacterClass.ForceTermination */;
                            break;
                        case 91 /* CharCode.OpenSquareBracket */:
                            inSquareBrackets = true;
                            hasOpenSquareBracket = true;
                            chClass = 0 /* CharacterClass.None */;
                            break;
                        case 93 /* CharCode.CloseSquareBracket */:
                            inSquareBrackets = false;
                            chClass = hasOpenSquareBracket ? 0 /* CharacterClass.None */ : 1 /* CharacterClass.ForceTermination */;
                            break;
                        case 123 /* CharCode.OpenCurlyBrace */:
                            hasOpenCurlyBracket = true;
                            chClass = 0 /* CharacterClass.None */;
                            break;
                        case 125 /* CharCode.CloseCurlyBrace */:
                            chClass = hasOpenCurlyBracket ? 0 /* CharacterClass.None */ : 1 /* CharacterClass.ForceTermination */;
                            break;
                        // The following three rules make it that ' or " or ` are allowed inside links
                        // only if the link is wrapped by some other quote character
                        case 39 /* CharCode.SingleQuote */:
                        case 34 /* CharCode.DoubleQuote */:
                        case 96 /* CharCode.BackTick */:
                            if (linkBeginChCode === chCode) {
                                chClass = 1 /* CharacterClass.ForceTermination */;
                            }
                            else if (linkBeginChCode === 39 /* CharCode.SingleQuote */ ||
                                linkBeginChCode === 34 /* CharCode.DoubleQuote */ ||
                                linkBeginChCode === 96 /* CharCode.BackTick */) {
                                chClass = 0 /* CharacterClass.None */;
                            }
                            else {
                                chClass = 1 /* CharacterClass.ForceTermination */;
                            }
                            break;
                        case 42 /* CharCode.Asterisk */:
                            // `*` terminates a link if the link began with `*`
                            chClass =
                                linkBeginChCode === 42 /* CharCode.Asterisk */
                                    ? 1 /* CharacterClass.ForceTermination */
                                    : 0 /* CharacterClass.None */;
                            break;
                        case 124 /* CharCode.Pipe */:
                            // `|` terminates a link if the link began with `|`
                            chClass =
                                linkBeginChCode === 124 /* CharCode.Pipe */
                                    ? 1 /* CharacterClass.ForceTermination */
                                    : 0 /* CharacterClass.None */;
                            break;
                        case 32 /* CharCode.Space */:
                            // ` ` allow space in between [ and ]
                            chClass = inSquareBrackets ? 0 /* CharacterClass.None */ : 1 /* CharacterClass.ForceTermination */;
                            break;
                        default:
                            chClass = classifier.get(chCode);
                    }
                    // Check if character terminates link
                    if (chClass === 1 /* CharacterClass.ForceTermination */) {
                        result.push(LinkComputer._createLink(classifier, line, i, linkBeginIndex, j));
                        resetStateMachine = true;
                    }
                }
                else if (state === 12 /* State.End */) {
                    let chClass;
                    if (chCode === 91 /* CharCode.OpenSquareBracket */) {
                        // Allow for the authority part to contain ipv6 addresses which contain [ and ]
                        hasOpenSquareBracket = true;
                        chClass = 0 /* CharacterClass.None */;
                    }
                    else {
                        chClass = classifier.get(chCode);
                    }
                    // Check if character terminates link
                    if (chClass === 1 /* CharacterClass.ForceTermination */) {
                        resetStateMachine = true;
                    }
                    else {
                        state = 13 /* State.Accept */;
                    }
                }
                else {
                    state = stateMachine.nextState(state, chCode);
                    if (state === 0 /* State.Invalid */) {
                        resetStateMachine = true;
                    }
                }
                if (resetStateMachine) {
                    state = 1 /* State.Start */;
                    hasOpenParens = false;
                    hasOpenSquareBracket = false;
                    hasOpenCurlyBracket = false;
                    // Record where the link started
                    linkBeginIndex = j + 1;
                    linkBeginChCode = chCode;
                }
                j++;
            }
            if (state === 13 /* State.Accept */) {
                result.push(LinkComputer._createLink(classifier, line, i, linkBeginIndex, len));
            }
        }
        return result;
    }
}
/**
 * Returns an array of all links contains in the provided
 * document. *Note* that this operation is computational
 * expensive and should not run in the UI thread.
 */
export function computeLinks(model) {
    if (!model ||
        typeof model.getLineCount !== 'function' ||
        typeof model.getLineContent !== 'function') {
        // Unknown caller!
        return [];
    }
    return LinkComputer.computeLinks(model);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvbGlua0NvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBUXBFLE1BQU0sQ0FBTixJQUFrQixLQWdCakI7QUFoQkQsV0FBa0IsS0FBSztJQUN0Qix1Q0FBVyxDQUFBO0lBQ1gsbUNBQVMsQ0FBQTtJQUNULDJCQUFLLENBQUE7SUFDTCw2QkFBTSxDQUFBO0lBQ04sK0JBQU8sQ0FBQTtJQUNQLGlDQUFRLENBQUE7SUFDUiwyQkFBSyxDQUFBO0lBQ0wsNkJBQU0sQ0FBQTtJQUNOLCtCQUFPLENBQUE7SUFDUCwrQ0FBZSxDQUFBO0lBQ2YsOENBQWUsQ0FBQTtJQUNmLGdEQUFnQixDQUFBO0lBQ2hCLGdDQUFRLENBQUE7SUFDUixzQ0FBVyxDQUFBO0lBQ1gsc0RBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQWhCaUIsS0FBSyxLQUFMLEtBQUssUUFnQnRCO0FBSUQsTUFBTSxXQUFXO0lBS2hCLFlBQVksSUFBWSxFQUFFLElBQVksRUFBRSxZQUFvQjtRQUMzRCxNQUFNLElBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDeEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pELElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUE7UUFDdkIsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcs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