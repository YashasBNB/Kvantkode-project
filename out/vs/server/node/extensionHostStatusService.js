/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../platform/instantiation/common/instantiation.js';
export const IExtensionHostStatusService = createDecorator('extensionHostStatusService');
export class ExtensionHostStatusService {
    constructor() {
        this._exitInfo = new Map();
    }
    setExitInfo(reconnectionToken, info) {
        this._exitInfo.set(reconnectionToken, info);
    }
    getExitInfo(reconnectionToken) {
        return this._exitInfo.get(reconnectionToken) || null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFN0YXR1c1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9leHRlbnNpb25Ib3N0U3RhdHVzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHdEYsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUN6RCw0QkFBNEIsQ0FDNUIsQ0FBQTtBQVNELE1BQU0sT0FBTywwQkFBMEI7SUFBdkM7UUFHa0IsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFBO0lBU3ZFLENBQUM7SUFQQSxXQUFXLENBQUMsaUJBQXlCLEVBQUUsSUFBNEI7UUFDbEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELFdBQVcsQ0FBQyxpQkFBeUI7UUFDcEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLElBQUksQ0FBQTtJQUNyRCxDQUFDO0NBQ0QifQ==