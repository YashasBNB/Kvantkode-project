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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wbGFjZVJlcGxhY2VTdXBwb3J0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvc3VwcG9ydHMvaW5wbGFjZVJlcGxhY2VTdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sT0FBTyxtQkFBbUI7SUFBaEM7UUE2RGtCLHFCQUFnQixHQUFlO1lBQy9DLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztZQUNqQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7WUFDakIsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUM7WUFDaEYsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQztTQUNsQyxDQUFBO0lBMkJGLENBQUM7YUE1RnVCLGFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLEFBQTVCLENBQTRCO0lBRXBELGdCQUFnQixDQUN0QixNQUFjLEVBQ2QsS0FBYSxFQUNiLE1BQWMsRUFDZCxLQUFvQixFQUNwQixFQUFXO1FBRVgsSUFBSSxNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7WUFDckIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNqRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE9BQU87b0JBQ04sS0FBSyxFQUFFLE1BQU07b0JBQ2IsS0FBSyxFQUFFLE1BQU07aUJBQ2IsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7WUFDckIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNqRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE9BQU87b0JBQ04sS0FBSyxFQUFFLE1BQU07b0JBQ2IsS0FBSyxFQUFFLE1BQU07aUJBQ2IsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sa0JBQWtCLENBQUMsSUFBWSxFQUFFLEVBQVc7UUFDbkQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDakQsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0IsT0FBTyxZQUFZLENBQUE7UUFDcEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVPLGFBQWEsQ0FBQyxLQUFhLEVBQUUsRUFBVztRQUMvQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNFLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QixNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFNUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDM0MsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3JCLE9BQU8sSUFBSSxDQUFBLENBQUMsb0JBQW9CO2dCQUNoQyxnQ0FBZ0M7Z0JBQ2hDLG1EQUFtRDtZQUNwRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFBO2dCQUMvQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUNqQyxPQUFPLE1BQU0sQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFTTyxXQUFXLENBQUMsS0FBYSxFQUFFLEVBQVc7UUFDN0MsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsU0FBcUIsRUFBRSxLQUFhLEVBQUUsRUFBVztRQUN6RSxJQUFJLE1BQU0sR0FBa0IsSUFBSSxDQUFBO1FBQ2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pFLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLGVBQWUsQ0FBQyxRQUFrQixFQUFFLEtBQWEsRUFBRSxFQUFXO1FBQ3JFLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDakMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDZCxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbkIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsR0FBRyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQzFCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQTtZQUN2QixDQUFDO1lBQ0QsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDckIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQyJ9