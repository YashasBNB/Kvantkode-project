/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { isURLDomainTrusted } from '../../common/trustedDomains.js';
export class MockTrustedDomainService {
    constructor(_trustedDomains = []) {
        this._trustedDomains = _trustedDomains;
        this.onDidChangeTrustedDomains = Event.None;
    }
    isValid(resource) {
        return isURLDomainTrusted(resource, this._trustedDomains);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1RydXN0ZWREb21haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvdGVzdC9icm93c2VyL21vY2tUcnVzdGVkRG9tYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFbkUsTUFBTSxPQUFPLHdCQUF3QjtJQUdwQyxZQUE2QixrQkFBNEIsRUFBRTtRQUE5QixvQkFBZSxHQUFmLGVBQWUsQ0FBZTtRQUUzRCw4QkFBeUIsR0FBZ0IsS0FBSyxDQUFDLElBQUksQ0FBQTtJQUZXLENBQUM7SUFJL0QsT0FBTyxDQUFDLFFBQWE7UUFDcEIsT0FBTyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQzFELENBQUM7Q0FDRCJ9