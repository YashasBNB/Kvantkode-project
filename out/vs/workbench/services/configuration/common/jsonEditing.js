/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IJSONEditingService = createDecorator('jsonEditingService');
export var JSONEditingErrorCode;
(function (JSONEditingErrorCode) {
    /**
     * Error when trying to write to a file that contains JSON errors.
     */
    JSONEditingErrorCode[JSONEditingErrorCode["ERROR_INVALID_FILE"] = 0] = "ERROR_INVALID_FILE";
})(JSONEditingErrorCode || (JSONEditingErrorCode = {}));
export class JSONEditingError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi9jb21tb24vanNvbkVkaXRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRzVGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQTtBQUU3RixNQUFNLENBQU4sSUFBa0Isb0JBS2pCO0FBTEQsV0FBa0Isb0JBQW9CO0lBQ3JDOztPQUVHO0lBQ0gsMkZBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQUxpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBS3JDO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLEtBQUs7SUFDMUMsWUFDQyxPQUFlLEVBQ1IsSUFBMEI7UUFFakMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRlAsU0FBSSxHQUFKLElBQUksQ0FBc0I7SUFHbEMsQ0FBQztDQUNEIn0=