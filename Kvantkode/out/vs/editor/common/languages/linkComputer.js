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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9saW5rQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFRcEUsTUFBTSxDQUFOLElBQWtCLEtBZ0JqQjtBQWhCRCxXQUFrQixLQUFLO0lBQ3RCLHVDQUFXLENBQUE7SUFDWCxtQ0FBUyxDQUFBO0lBQ1QsMkJBQUssQ0FBQTtJQUNMLDZCQUFNLENBQUE7SUFDTiwrQkFBTyxDQUFBO0lBQ1AsaUNBQVEsQ0FBQTtJQUNSLDJCQUFLLENBQUE7SUFDTCw2QkFBTSxDQUFBO0lBQ04sK0JBQU8sQ0FBQTtJQUNQLCtDQUFlLENBQUE7SUFDZiw4Q0FBZSxDQUFBO0lBQ2YsZ0RBQWdCLENBQUE7SUFDaEIsZ0NBQVEsQ0FBQTtJQUNSLHNDQUFXLENBQUE7SUFDWCxzREFBbUIsQ0FBQTtBQUNwQixDQUFDLEVBaEJpQixLQUFLLEtBQUwsS0FBSyxRQWdCdEI7QUFJRCxNQUFNLFdBQVc7SUFLaEIsWUFBWSxJQUFZLEVBQUUsSUFBWSxFQUFFLFlBQW9CO1FBQzNELE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUN4QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQTtRQUN2QixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFD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