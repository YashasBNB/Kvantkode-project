/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Extracted from json.ts to keep json nls free.
 */
import { localize } from '../../nls.js';
export function getParseErrorMessage(errorCode) {
    switch (errorCode) {
        case 1 /* ParseErrorCode.InvalidSymbol */:
            return localize('error.invalidSymbol', 'Invalid symbol');
        case 2 /* ParseErrorCode.InvalidNumberFormat */:
            return localize('error.invalidNumberFormat', 'Invalid number format');
        case 3 /* ParseErrorCode.PropertyNameExpected */:
            return localize('error.propertyNameExpected', 'Property name expected');
        case 4 /* ParseErrorCode.ValueExpected */:
            return localize('error.valueExpected', 'Value expected');
        case 5 /* ParseErrorCode.ColonExpected */:
            return localize('error.colonExpected', 'Colon expected');
        case 6 /* ParseErrorCode.CommaExpected */:
            return localize('error.commaExpected', 'Comma expected');
        case 7 /* ParseErrorCode.CloseBraceExpected */:
            return localize('error.closeBraceExpected', 'Closing brace expected');
        case 8 /* ParseErrorCode.CloseBracketExpected */:
            return localize('error.closeBracketExpected', 'Closing bracket expected');
        case 9 /* ParseErrorCode.EndOfFileExpected */:
            return localize('error.endOfFileExpected', 'End of file expected');
        default:
            return '';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVycm9yTWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9qc29uRXJyb3JNZXNzYWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7R0FFRztBQUNILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFHdkMsTUFBTSxVQUFVLG9CQUFvQixDQUFDLFNBQXlCO0lBQzdELFFBQVEsU0FBUyxFQUFFLENBQUM7UUFDbkI7WUFDQyxPQUFPLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3pEO1lBQ0MsT0FBTyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN0RTtZQUNDLE9BQU8sUUFBUSxDQUFDLDRCQUE0QixFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFDeEU7WUFDQyxPQUFPLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3pEO1lBQ0MsT0FBTyxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUN6RDtZQUNDLE9BQU8sUUFBUSxDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDekQ7WUFDQyxPQUFPLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3RFO1lBQ0MsT0FBTyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUMxRTtZQUNDLE9BQU8sUUFBUSxDQUFDLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFDbkU7WUFDQyxPQUFPLEVBQUUsQ0FBQTtJQUNYLENBQUM7QUFDRixDQUFDIn0=