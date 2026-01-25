/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createScanner as createJSONScanner, } from '../../../../base/common/json.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
export class SmartSnippetInserter {
    static hasOpenBrace(scanner) {
        while (scanner.scan() !== 17 /* JSONSyntaxKind.EOF */) {
            const kind = scanner.getToken();
            if (kind === 1 /* JSONSyntaxKind.OpenBraceToken */) {
                return true;
            }
        }
        return false;
    }
    static offsetToPosition(model, offset) {
        let offsetBeforeLine = 0;
        const eolLength = model.getEOL().length;
        const lineCount = model.getLineCount();
        for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
            const lineTotalLength = model.getLineLength(lineNumber) + eolLength;
            const offsetAfterLine = offsetBeforeLine + lineTotalLength;
            if (offsetAfterLine > offset) {
                return new Position(lineNumber, offset - offsetBeforeLine + 1);
            }
            offsetBeforeLine = offsetAfterLine;
        }
        return new Position(lineCount, model.getLineMaxColumn(lineCount));
    }
    static insertSnippet(model, _position) {
        const desiredPosition = model.getValueLengthInRange(new Range(1, 1, _position.lineNumber, _position.column));
        // <INVALID> [ <BEFORE_OBJECT> { <INVALID> } <AFTER_OBJECT>, <BEFORE_OBJECT> { <INVALID> } <AFTER_OBJECT> ] <INVALID>
        let State;
        (function (State) {
            State[State["INVALID"] = 0] = "INVALID";
            State[State["AFTER_OBJECT"] = 1] = "AFTER_OBJECT";
            State[State["BEFORE_OBJECT"] = 2] = "BEFORE_OBJECT";
        })(State || (State = {}));
        let currentState = State.INVALID;
        let lastValidPos = -1;
        let lastValidState = State.INVALID;
        const scanner = createJSONScanner(model.getValue());
        let arrayLevel = 0;
        let objLevel = 0;
        const checkRangeStatus = (pos, state) => {
            if (state !== State.INVALID && arrayLevel === 1 && objLevel === 0) {
                currentState = state;
                lastValidPos = pos;
                lastValidState = state;
            }
            else {
                if (currentState !== State.INVALID) {
                    currentState = State.INVALID;
                    lastValidPos = scanner.getTokenOffset();
                }
            }
        };
        while (scanner.scan() !== 17 /* JSONSyntaxKind.EOF */) {
            const currentPos = scanner.getPosition();
            const kind = scanner.getToken();
            let goodKind = false;
            switch (kind) {
                case 3 /* JSONSyntaxKind.OpenBracketToken */:
                    goodKind = true;
                    arrayLevel++;
                    checkRangeStatus(currentPos, State.BEFORE_OBJECT);
                    break;
                case 4 /* JSONSyntaxKind.CloseBracketToken */:
                    goodKind = true;
                    arrayLevel--;
                    checkRangeStatus(currentPos, State.INVALID);
                    break;
                case 5 /* JSONSyntaxKind.CommaToken */:
                    goodKind = true;
                    checkRangeStatus(currentPos, State.BEFORE_OBJECT);
                    break;
                case 1 /* JSONSyntaxKind.OpenBraceToken */:
                    goodKind = true;
                    objLevel++;
                    checkRangeStatus(currentPos, State.INVALID);
                    break;
                case 2 /* JSONSyntaxKind.CloseBraceToken */:
                    goodKind = true;
                    objLevel--;
                    checkRangeStatus(currentPos, State.AFTER_OBJECT);
                    break;
                case 15 /* JSONSyntaxKind.Trivia */:
                case 14 /* JSONSyntaxKind.LineBreakTrivia */:
                    goodKind = true;
            }
            if (currentPos >= desiredPosition &&
                (currentState !== State.INVALID || lastValidPos !== -1)) {
                let acceptPosition;
                let acceptState;
                if (currentState !== State.INVALID) {
                    acceptPosition = goodKind ? currentPos : scanner.getTokenOffset();
                    acceptState = currentState;
                }
                else {
                    acceptPosition = lastValidPos;
                    acceptState = lastValidState;
                }
                if (acceptState === State.AFTER_OBJECT) {
                    return {
                        position: this.offsetToPosition(model, acceptPosition),
                        prepend: ',',
                        append: '',
                    };
                }
                else {
                    scanner.setPosition(acceptPosition);
                    return {
                        position: this.offsetToPosition(model, acceptPosition),
                        prepend: '',
                        append: this.hasOpenBrace(scanner) ? ',' : '',
                    };
                }
            }
        }
        // no valid position found!
        const modelLineCount = model.getLineCount();
        return {
            position: new Position(modelLineCount, model.getLineMaxColumn(modelLineCount)),
            prepend: '\n[',
            append: ']',
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hcnRTbmlwcGV0SW5zZXJ0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2NvbW1vbi9zbWFydFNuaXBwZXRJbnNlcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sYUFBYSxJQUFJLGlCQUFpQixHQUVsQyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFTL0QsTUFBTSxPQUFPLG9CQUFvQjtJQUN4QixNQUFNLENBQUMsWUFBWSxDQUFDLE9BQW9CO1FBQy9DLE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxnQ0FBdUIsRUFBRSxDQUFDO1lBQzlDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUUvQixJQUFJLElBQUksMENBQWtDLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFpQixFQUFFLE1BQWM7UUFDaEUsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUE7UUFDeEIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQTtRQUN2QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDdEMsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsVUFBVSxJQUFJLFNBQVMsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sZUFBZSxHQUFHLEtB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