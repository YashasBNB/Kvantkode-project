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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyUGFpci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3N1cHBvcnRzL2NoYXJhY3RlclBhaXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLGtDQUFrQyxHQUVsQyxNQUFNLDZCQUE2QixDQUFBO0FBRXBDLE1BQU0sT0FBTyxvQkFBb0I7YUFDaEIscURBQWdELEdBQUcsZ0JBQWdCLENBQUE7YUFDbkUsdURBQWtELEdBQUcsb0JBQW9CLENBQUE7YUFDekUsd0NBQW1DLEdBQUcsT0FBTyxDQUFBO0lBTzdELFlBQVksTUFBNkI7UUFDeEMsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FDbkQsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksa0NBQWtDLENBQUMsRUFBRSxDQUFDLENBQ2xELENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUMzQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxrQ0FBa0MsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQzFFLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUE7UUFDNUIsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLDBCQUEwQixJQUFJLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN2RixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFBO1lBQy9ELGtEQUFrRDtZQUNsRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUMxQixJQUFJLGtDQUFrQyxDQUFDO2dCQUN0QyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3JCLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSyxJQUFJLEVBQUU7YUFDN0IsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLHlCQUF5QjtZQUM3QixPQUFPLE1BQU0sQ0FBQyxlQUFlLEtBQUssUUFBUTtnQkFDekMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlO2dCQUN4QixDQUFDLENBQUMsb0JBQW9CLENBQUMsZ0RBQWdELENBQUE7UUFDekUsSUFBSSxDQUFDLDJCQUEyQjtZQUMvQixPQUFPLE1BQU0sQ0FBQyxlQUFlLEtBQUssUUFBUTtnQkFDekMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlO2dCQUN4QixDQUFDLENBQUMsb0JBQW9CLENBQUMsa0RBQWtELENBQUE7UUFFM0UsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDM0UsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBRU0scUJBQXFCLENBQUMsU0FBa0I7UUFDOUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFBO0lBQ3JGLENBQUM7SUFFTSxtQkFBbUI7UUFDekIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQyJ9