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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVycm9yTWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2pzb25FcnJvck1lc3NhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOztHQUVHO0FBQ0gsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUd2QyxNQUFNLFVBQVUsb0JBQW9CLENBQUMsU0FBeUI7SUFDN0QsUUFBUSxTQUFTLEVBQUUsQ0FBQztRQUNuQjtZQUNDLE9BQU8sUUFBUSxDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDekQ7WUFDQyxPQUFPLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3RFO1lBQ0MsT0FBTyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtRQUN4RTtZQUNDLE9BQU8sUUFBUSxDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDekQ7WUFDQyxPQUFPLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3pEO1lBQ0MsT0FBTyxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUN6RDtZQUNDLE9BQU8sUUFBUSxDQUFDLDBCQUEwQixFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFDdEU7WUFDQyxPQUFPLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQzFFO1lBQ0MsT0FBTyxRQUFRLENBQUMseUJBQXlCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtRQUNuRTtZQUNDLE9BQU8sRUFBRSxDQUFBO0lBQ1gsQ0FBQztBQUNGLENBQUMifQ==