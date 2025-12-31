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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hcnRTbmlwcGV0SW5zZXJ0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9jb21tb24vc21hcnRTbmlwcGV0SW5zZXJ0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLGFBQWEsSUFBSSxpQkFBaUIsR0FFbEMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBUy9ELE1BQU0sT0FBTyxvQkFBb0I7SUFDeEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFvQjtRQUMvQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0NBQXVCLEVBQUUsQ0FBQztZQUM5QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7WUFFL0IsSUFBSSxJQUFJLDBDQUFrQyxFQUFFLENBQUM7Z0JBQzVDLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsS0FBaUIsRUFBRSxNQUFjO1FBQ2hFLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFBO1FBQ3hCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUE7UUFDdkMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3RDLEtBQUssSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFLFVBQVUsSUFBSSxTQUFTLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNoRSxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxHQUFHLFNBQVMsQ0FBQTtZQUNuRSxNQUFNLGVBQWUsR0FBRyxnQkFBZ0IsR0FBRyxlQUFlLENBQUE7WUFFMUQsSUFBSSxlQUFlLEdBQUcsTUFBTSxFQUFFLENBQUM7Z0JBQzlCLE9BQU8sSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sR0FBRyxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvRCxDQUFDO1lBQ0QsZ0JBQWdCLEdBQUcsZUFBZSxDQUFBO1FBQ25DLENBQUM7UUFDRCxPQUFPLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0lBRUQsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFpQixFQUFFLFNBQW1CO1FBQzFELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FDbEQsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FDdkQsQ0FBQTtRQUVELHFIQUFxSDtRQUNySCxJQUFLLEtBSUo7UUFKRCxXQUFLLEtBQUs7WUFDVCx1Q0FBVyxDQUFBO1lBQ1gsaURBQWdCLENBQUE7WUFDaEIsbURBQWlCLENBQUE7UUFDbEIsQ0FBQyxFQUpJLEtBQUssS0FBTCxLQUFLLFFBSVQ7UUFDRCxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFBO1FBQ2hDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUE7UUFFbEMsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDbkQsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFBO1FBQ2xCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQTtRQUVoQixNQUFNLGdCQUFnQixHQUFHLENBQUMsR0FBVyxFQUFFLEtBQVksRUFBRSxFQUFFO1lBQ3RELElBQUksS0FBSyxLQUFLLEtBQUssQ0FBQyxPQUFPLElBQUksVUFBVSxLQUFLLENBQUMsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25FLFlBQVksR0FBRyxLQUFLLENBQUE7Z0JBQ3BCLFlBQVksR0FBRyxHQUFHLENBQUE7Z0JBQ2xCLGNBQWMsR0FBRyxLQUFLLENBQUE7WUFDdkIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksWUFBWSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDcEMsWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUE7b0JBQzVCLFlBQVksR0FBRyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQ3hDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsT0FBTyxPQUFPLENBQUMsSUFBSSxFQUFFLGdDQUF1QixFQUFFLENBQUM7WUFDOUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUUvQixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUE7WUFDcEIsUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFDZDtvQkFDQyxRQUFRLEdBQUcsSUFBSSxDQUFBO29CQUNmLFVBQVUsRUFBRSxDQUFBO29CQUNaLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7b0JBQ2pELE1BQUs7Z0JBQ047b0JBQ0MsUUFBUSxHQUFHLElBQUksQ0FBQTtvQkFDZixVQUFVLEVBQUUsQ0FBQTtvQkFDWixnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUMzQyxNQUFLO2dCQUNOO29CQUNDLFFBQVEsR0FBRyxJQUFJLENBQUE7b0JBQ2YsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtvQkFDakQsTUFBSztnQkFDTjtvQkFDQyxRQUFRLEdBQUcsSUFBSSxDQUFBO29CQUNmLFFBQVEsRUFBRSxDQUFBO29CQUNWLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQzNDLE1BQUs7Z0JBQ047b0JBQ0MsUUFBUSxHQUFHLElBQUksQ0FBQTtvQkFDZixRQUFRLEVBQUUsQ0FBQTtvQkFDVixnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUNoRCxNQUFLO2dCQUNOLG9DQUEyQjtnQkFDM0I7b0JBQ0MsUUFBUSxHQUFHLElBQUksQ0FBQTtZQUNqQixDQUFDO1lBRUQsSUFDQyxVQUFVLElBQUksZUFBZTtnQkFDN0IsQ0FBQyxZQUFZLEtBQUssS0FBSyxDQUFDLE9BQU8sSUFBSSxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFDdEQsQ0FBQztnQkFDRixJQUFJLGNBQXNCLENBQUE7Z0JBQzFCLElBQUksV0FBa0IsQ0FBQTtnQkFFdEIsSUFBSSxZQUFZLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNwQyxjQUFjLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQTtvQkFDakUsV0FBVyxHQUFHLFlBQVksQ0FBQTtnQkFDM0IsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGNBQWMsR0FBRyxZQUFZLENBQUE7b0JBQzdCLFdBQVcsR0FBRyxjQUFjLENBQUE7Z0JBQzdCLENBQUM7Z0JBRUQsSUFBSyxXQUFxQixLQUFLLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDbkQsT0FBTzt3QkFDTixRQUFRLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxjQUFjLENBQUM7d0JBQ3RELE9BQU8sRUFBRSxHQUFHO3dCQUNaLE1BQU0sRUFBRSxFQUFFO3FCQUNWLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUE7b0JBQ25DLE9BQU87d0JBQ04sUUFBUSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDO3dCQUN0RCxPQUFPLEVBQUUsRUFBRTt3QkFDWCxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO3FCQUM3QyxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELDJCQUEyQjtRQUMzQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsT0FBTztZQUNOLFFBQVEsRUFBRSxJQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzlFLE9BQU8sRUFBRSxLQUFLO1lBQ2QsTUFBTSxFQUFFLEdBQUc7U0FDWCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=