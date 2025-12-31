/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Describes what to do with the indentation when pressing Enter.
 */
export var IndentAction;
(function (IndentAction) {
    /**
     * Insert new line and copy the previous line's indentation.
     */
    IndentAction[IndentAction["None"] = 0] = "None";
    /**
     * Insert new line and indent once (relative to the previous line's indentation).
     */
    IndentAction[IndentAction["Indent"] = 1] = "Indent";
    /**
     * Insert two new lines:
     *  - the first one indented which will hold the cursor
     *  - the second one at the same indentation level
     */
    IndentAction[IndentAction["IndentOutdent"] = 2] = "IndentOutdent";
    /**
     * Insert new line and outdent once (relative to the previous line's indentation).
     */
    IndentAction[IndentAction["Outdent"] = 3] = "Outdent";
})(IndentAction || (IndentAction = {}));
/**
 * @internal
 */
export class StandardAutoClosingPairConditional {
    constructor(source) {
        this._neutralCharacter = null;
        this._neutralCharacterSearched = false;
        this.open = source.open;
        this.close = source.close;
        // initially allowed in all tokens
        this._inString = true;
        this._inComment = true;
        this._inRegEx = true;
        if (Array.isArray(source.notIn)) {
            for (let i = 0, len = source.notIn.length; i < len; i++) {
                const notIn = source.notIn[i];
                switch (notIn) {
                    case 'string':
                        this._inString = false;
                        break;
                    case 'comment':
                        this._inComment = false;
                        break;
                    case 'regex':
                        this._inRegEx = false;
                        break;
                }
            }
        }
    }
    isOK(standardToken) {
        switch (standardToken) {
            case 0 /* StandardTokenType.Other */:
                return true;
            case 1 /* StandardTokenType.Comment */:
                return this._inComment;
            case 2 /* StandardTokenType.String */:
                return this._inString;
            case 3 /* StandardTokenType.RegEx */:
                return this._inRegEx;
        }
    }
    shouldAutoClose(context, column) {
        // Always complete on empty line
        if (context.getTokenCount() === 0) {
            return true;
        }
        const tokenIndex = context.findTokenIndexAtOffset(column - 2);
        const standardTokenType = context.getStandardTokenType(tokenIndex);
        return this.isOK(standardTokenType);
    }
    _findNeutralCharacterInRange(fromCharCode, toCharCode) {
        for (let charCode = fromCharCode; charCode <= toCharCode; charCode++) {
            const character = String.fromCharCode(charCode);
            if (!this.open.includes(character) && !this.close.includes(character)) {
                return character;
            }
        }
        return null;
    }
    /**
     * Find a character in the range [0-9a-zA-Z] that does not appear in the open or close
     */
    findNeutralCharacter() {
        if (!this._neutralCharacterSearched) {
            this._neutralCharacterSearched = true;
            if (!this._neutralCharacter) {
                this._neutralCharacter = this._findNeutralCharacterInRange(48 /* CharCode.Digit0 */, 57 /* CharCode.Digit9 */);
            }
            if (!this._neutralCharacter) {
                this._neutralCharacter = this._findNeutralCharacterInRange(97 /* CharCode.a */, 122 /* CharCode.z */);
            }
            if (!this._neutralCharacter) {
                this._neutralCharacter = this._findNeutralCharacterInRange(65 /* CharCode.A */, 90 /* CharCode.Z */);
            }
        }
        return this._neutralCharacter;
    }
}
/**
 * @internal
 */
export class AutoClosingPairs {
    constructor(autoClosingPairs) {
        this.autoClosingPairsOpenByStart = new Map();
        this.autoClosingPairsOpenByEnd = new Map();
        this.autoClosingPairsCloseByStart = new Map();
        this.autoClosingPairsCloseByEnd = new Map();
        this.autoClosingPairsCloseSingleChar = new Map();
        for (const pair of autoClosingPairs) {
            appendEntry(this.autoClosingPairsOpenByStart, pair.open.charAt(0), pair);
            appendEntry(this.autoClosingPairsOpenByEnd, pair.open.charAt(pair.open.length - 1), pair);
            appendEntry(this.autoClosingPairsCloseByStart, pair.close.charAt(0), pair);
            appendEntry(this.autoClosingPairsCloseByEnd, pair.close.charAt(pair.close.length - 1), pair);
            if (pair.close.length === 1 && pair.open.length === 1) {
                appendEntry(this.autoClosingPairsCloseSingleChar, pair.close, pair);
            }
        }
    }
}
function appendEntry(target, key, value) {
    if (target.has(key)) {
        target.get(key).push(value);
    }
    else {
        target.set(key, [value]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvbGFuZ3VhZ2VDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBd01oRzs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFlBbUJYO0FBbkJELFdBQVksWUFBWTtJQUN2Qjs7T0FFRztJQUNILCtDQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILG1EQUFVLENBQUE7SUFDVjs7OztPQUlHO0lBQ0gsaUVBQWlCLENBQUE7SUFDakI7O09BRUc7SUFDSCxxREFBVyxDQUFBO0FBQ1osQ0FBQyxFQW5CVyxZQUFZLEtBQVosWUFBWSxRQW1CdkI7QUEwQ0Q7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0NBQWtDO0lBUzlDLFlBQVksTUFBbUM7UUFIdkMsc0JBQWlCLEdBQWtCLElBQUksQ0FBQTtRQUN2Qyw4QkFBeUIsR0FBWSxLQUFLLENBQUE7UUFHakQsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQTtRQUV6QixrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7UUFFcEIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMs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