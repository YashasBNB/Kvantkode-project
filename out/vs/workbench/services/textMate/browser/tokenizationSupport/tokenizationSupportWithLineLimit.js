/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nullTokenizeEncoded } from '../../../../../editor/common/languages/nullTokenize.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { keepObserved } from '../../../../../base/common/observable.js';
export class TokenizationSupportWithLineLimit extends Disposable {
    get backgroundTokenizerShouldOnlyVerifyTokens() {
        return this._actual.backgroundTokenizerShouldOnlyVerifyTokens;
    }
    constructor(_encodedLanguageId, _actual, disposable, _maxTokenizationLineLength) {
        super();
        this._encodedLanguageId = _encodedLanguageId;
        this._actual = _actual;
        this._maxTokenizationLineLength = _maxTokenizationLineLength;
        this._register(keepObserved(this._maxTokenizationLineLength));
        this._register(disposable);
    }
    getInitialState() {
        return this._actual.getInitialState();
    }
    tokenize(line, hasEOL, state) {
        throw new Error('Not supported!');
    }
    tokenizeEncoded(line, hasEOL, state) {
        // Do not attempt to tokenize if a line is too long
        if (line.length >= this._maxTokenizationLineLength.get()) {
            return nullTokenizeEncoded(this._encodedLanguageId, state);
        }
        return this._actual.tokenizeEncoded(line, hasEOL, state);
    }
    createBackgroundTokenizer(textModel, store) {
        if (this._actual.createBackgroundTokenizer) {
            return this._actual.createBackgroundTokenizer(textModel, store);
        }
        else {
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uU3VwcG9ydFdpdGhMaW5lTGltaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci90b2tlbml6YXRpb25TdXBwb3J0L3Rva2VuaXphdGlvblN1cHBvcnRXaXRoTGluZUxpbWl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFcEYsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLFVBQVU7SUFDL0QsSUFBSSx5Q0FBeUM7UUFDNUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHlDQUF5QyxDQUFBO0lBQzlELENBQUM7SUFFRCxZQUNrQixrQkFBOEIsRUFDOUIsT0FBNkIsRUFDOUMsVUFBdUIsRUFDTiwwQkFBK0M7UUFFaEUsS0FBSyxFQUFFLENBQUE7UUFMVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVk7UUFDOUIsWUFBTyxHQUFQLE9BQU8sQ0FBc0I7UUFFN0IsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFxQjtRQUloRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDdEMsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFZLEVBQUUsTUFBZSxFQUFFLEtBQWE7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxlQUFlLENBQUMsSUFBWSxFQUFFLE1BQWUsRUFBRSxLQUFhO1FBQzNELG1EQUFtRDtRQUNuRCxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDMUQsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQseUJBQXlCLENBQ3hCLFNBQXFCLEVBQ3JCLEtBQW1DO1FBRW5DLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQzVDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=