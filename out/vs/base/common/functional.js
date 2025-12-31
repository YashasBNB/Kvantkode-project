/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Given a function, returns a function that is only calling that function once.
 */
export function createSingleCallFunction(fn, fnDidRunCallback) {
    const _this = this;
    let didCall = false;
    let result;
    return function () {
        if (didCall) {
            return result;
        }
        didCall = true;
        if (fnDidRunCallback) {
            try {
                result = fn.apply(_this, arguments);
            }
            finally {
                fnDidRunCallback();
            }
        }
        else {
            result = fn.apply(_this, arguments);
        }
        return result;
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2Z1bmN0aW9uYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxNQUFNLFVBQVUsd0JBQXdCLENBRXZDLEVBQUssRUFDTCxnQkFBNkI7SUFFN0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFBO0lBQ2xCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtJQUNuQixJQUFJLE1BQWUsQ0FBQTtJQUVuQixPQUFPO1FBQ04sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztRQUVELE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDZCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNwQyxDQUFDO29CQUFTLENBQUM7Z0JBQ1YsZ0JBQWdCLEVBQUUsQ0FBQTtZQUNuQixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBaUIsQ0FBQTtBQUNsQixDQUFDIn0=