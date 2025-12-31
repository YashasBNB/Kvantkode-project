/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { buffer, ExtractError } from '../../../base/node/zip.js';
import { localize } from '../../../nls.js';
import { toExtensionManagementError } from '../common/abstractExtensionManagementService.js';
import { ExtensionManagementError, } from '../common/extensionManagement.js';
export function fromExtractError(e) {
    let errorCode = "Extract" /* ExtensionManagementErrorCode.Extract */;
    if (e instanceof ExtractError) {
        if (e.type === 'CorruptZip') {
            errorCode = "CorruptZip" /* ExtensionManagementErrorCode.CorruptZip */;
        }
        else if (e.type === 'Incomplete') {
            errorCode = "IncompleteZip" /* ExtensionManagementErrorCode.IncompleteZip */;
        }
    }
    return toExtensionManagementError(e, errorCode);
}
export async function getManifest(vsixPath) {
    let data;
    try {
        data = await buffer(vsixPath, 'extension/package.json');
    }
    catch (e) {
        throw fromExtractError(e);
    }
    try {
        return JSON.parse(data.toString('utf8'));
    }
    catch (err) {
        throw new ExtensionManagementError(localize('invalidManifest', 'VSIX invalid: package.json is not a JSON file.'), "Invalid" /* ExtensionManagementErrorCode.Invalid */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L25vZGUvZXh0ZW5zaW9uTWFuYWdlbWVudFV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUYsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLGtDQUFrQyxDQUFBO0FBR3pDLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxDQUFRO0lBQ3hDLElBQUksU0FBUyx1REFBdUMsQ0FBQTtJQUNwRCxJQUFJLENBQUMsWUFBWSxZQUFZLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDN0IsU0FBUyw2REFBMEMsQ0FBQTtRQUNwRCxDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFlBQVksRUFBRSxDQUFDO1lBQ3BDLFNBQVMsbUVBQTZDLENBQUE7UUFDdkQsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLDBCQUEwQixDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtBQUNoRCxDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxXQUFXLENBQUMsUUFBZ0I7SUFDakQsSUFBSSxJQUFJLENBQUE7SUFDUixJQUFJLENBQUM7UUFDSixJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDWixNQUFNLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsTUFBTSxJQUFJLHdCQUF3QixDQUNqQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsZ0RBQWdELENBQUMsdURBRTdFLENBQUE7SUFDRixDQUFDO0FBQ0YsQ0FBQyJ9