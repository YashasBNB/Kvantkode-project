/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardAutoClosingPairConditional, } from '../languageConfiguration.js';
export class CharacterPairSupport {
    static { this.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED_QUOTES = ';:.,=}])> \n\t'; }
    static { this.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED_BRACKETS = '\'"`;:.,=}])> \n\t'; }
    static { this.DEFAULT_AUTOCLOSE_BEFORE_WHITESPACE = ' \n\t'; }
    constructor(config) {
        if (config.autoClosingPairs) {
            this._autoClosingPairs = config.autoClosingPairs.map((el) => new StandardAutoClosingPairConditional(el));
        }
        else if (config.brackets) {
            this._autoClosingPairs = config.brackets.map((b) => new StandardAutoClosingPairConditional({ open: b[0], close: b[1] }));
        }
        else {
            this._autoClosingPairs = [];
        }
        if (config.__electricCharacterSupport && config.__electricCharacterSupport.docComment) {
            const docComment = config.__electricCharacterSupport.docComment;
            // IDocComment is legacy, only partially supported
            this._autoClosingPairs.push(new StandardAutoClosingPairConditional({
                open: docComment.open,
                close: docComment.close || '',
            }));
        }
        this._autoCloseBeforeForQuotes =
            typeof config.autoCloseBefore === 'string'
                ? config.autoCloseBefore
                : CharacterPairSupport.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED_QUOTES;
        this._autoCloseBeforeForBrackets =
            typeof config.autoCloseBefore === 'string'
                ? config.autoCloseBefore
                : CharacterPairSupport.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED_BRACKETS;
        this._surroundingPairs = config.surroundingPairs || this._autoClosingPairs;
    }
    getAutoClosingPairs() {
        return this._autoClosingPairs;
    }
    getAutoCloseBeforeSet(forQuotes) {
        return forQuotes ? this._autoCloseBeforeForQuotes : this._autoCloseBeforeForBrackets;
    }
    getSurroundingPairs() {
        return this._surroundingPairs;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyUGFpci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvc3VwcG9ydHMvY2hhcmFjdGVyUGFpci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sa0NBQWtDLEdBRWxDLE1BQU0sNkJBQTZCLENBQUE7QUFFcEMsTUFBTSxPQUFPLG9CQUFvQjthQUNoQixxREFBZ0QsR0FBRyxnQkFBZ0IsQ0FBQTthQUNuRSx1REFBa0QsR0FBRyxvQkFBb0IsQ0FBQTthQUN6RSx3Q0FBbUMsR0FBRyxPQUFPLENBQUE7SUFPN0QsWUFBWSxNQUE2QjtRQUN4QyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUNuRCxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxrQ0FBa0MsQ0FBQyxFQUFFLENBQUMsQ0FDbEQsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQzNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGtDQUFrQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FDMUUsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQTtRQUM1QixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsMEJBQTBCLElBQUksTUFBTSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3ZGLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUE7WUFDL0Qsa0RBQWtEO1lBQ2xELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQzFCLElBQUksa0NBQWtDLENBQUM7Z0JBQ3RDLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDckIsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTthQUM3QixDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMseUJBQXlCO1lBQzdCLE9BQU8sTUFBTSxDQUFDLGVBQWUsS0FBSyxRQUFRO2dCQUN6QyxDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWU7Z0JBQ3hCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxnREFBZ0QsQ0FBQTtRQUN6RSxJQUFJLENBQUMsMkJBQTJCO1lBQy9CLE9BQU8sTUFBTSxDQUFDLGVBQWUsS0FBSyxRQUFRO2dCQUN6QyxDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWU7Z0JBQ3hCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxrREFBa0QsQ0FBQTtRQUUzRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUMzRSxDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFTSxxQkFBcUIsQ0FBQyxTQUFrQjtRQUM5QyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUE7SUFDckYsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDIn0=