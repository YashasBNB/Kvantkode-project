/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class BasicInplaceReplace {
    constructor() {
        this._defaultValueSet = [
            ['true', 'false'],
            ['True', 'False'],
            ['Private', 'Public', 'Friend', 'ReadOnly', 'Partial', 'Protected', 'WriteOnly'],
            ['public', 'protected', 'private'],
        ];
    }
    static { this.INSTANCE = new BasicInplaceReplace(); }
    navigateValueSet(range1, text1, range2, text2, up) {
        if (range1 && text1) {
            const result = this.doNavigateValueSet(text1, up);
            if (result) {
                return {
                    range: range1,
                    value: result,
                };
            }
        }
        if (range2 && text2) {
            const result = this.doNavigateValueSet(text2, up);
            if (result) {
                return {
                    range: range2,
                    value: result,
                };
            }
        }
        return null;
    }
    doNavigateValueSet(text, up) {
        const numberResult = this.numberReplace(text, up);
        if (numberResult !== null) {
            return numberResult;
        }
        return this.textReplace(text, up);
    }
    numberReplace(value, up) {
        const precision = Math.pow(10, value.length - (value.lastIndexOf('.') + 1));
        let n1 = Number(value);
        const n2 = parseFloat(value);
        if (!isNaN(n1) && !isNaN(n2) && n1 === n2) {
            if (n1 === 0 && !up) {
                return null; // don't do negative
                //			} else if(n1 === 9 && up) {
                //				return null; // don't insert 10 into a number
            }
            else {
                n1 = Math.floor(n1 * precision);
                n1 += up ? precision : -precision;
                return String(n1 / precision);
            }
        }
        return null;
    }
    textReplace(value, up) {
        return this.valueSetsReplace(this._defaultValueSet, value, up);
    }
    valueSetsReplace(valueSets, value, up) {
        let result = null;
        for (let i = 0, len = valueSets.length; result === null && i < len; i++) {
            result = this.valueSetReplace(valueSets[i], value, up);
        }
        return result;
    }
    valueSetReplace(valueSet, value, up) {
        let idx = valueSet.indexOf(value);
        if (idx >= 0) {
            idx += up ? +1 : -1;
            if (idx < 0) {
                idx = valueSet.length - 1;
            }
            else {
                idx %= valueSet.length;
            }
            return valueSet[idx];
        }
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wbGFjZVJlcGxhY2VTdXBwb3J0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9zdXBwb3J0cy9pbnBsYWNlUmVwbGFjZVN1cHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsTUFBTSxPQUFPLG1CQUFtQjtJQUFoQztRQTZEa0IscUJBQWdCLEdBQWU7WUFDL0MsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO1lBQ2pCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztZQUNqQixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQztZQUNoRixDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDO1NBQ2xDLENBQUE7SUEyQkYsQ0FBQzthQTVGdUIsYUFBUSxHQUFHLElBQUksbUJBQW1CLEVBQUUsQUFBNUIsQ0FBNEI7SUFFcEQsZ0JBQWdCLENBQ3RCLE1BQWMsRUFDZCxLQUFhLEVBQ2IsTUFBYyxFQUNkLEtBQW9CLEVBQ3BCLEVBQVc7UUFFWCxJQUFJLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNyQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ2pELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osT0FBTztvQkFDTixLQUFLLEVBQUUsTUFBTTtvQkFDYixLQUFLLEVBQUUsTUFBTTtpQkFDYixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNyQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FB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