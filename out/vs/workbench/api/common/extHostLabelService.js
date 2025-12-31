/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../base/common/lifecycle.js';
import { MainContext, } from './extHost.protocol.js';
export class ExtHostLabelService {
    constructor(mainContext) {
        this._handlePool = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadLabelService);
    }
    $registerResourceLabelFormatter(formatter) {
        const handle = this._handlePool++;
        this._proxy.$registerResourceLabelFormatter(handle, formatter);
        return toDisposable(() => {
            this._proxy.$unregisterResourceLabelFormatter(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhYmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RMYWJlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFHTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixNQUFNLE9BQU8sbUJBQW1CO0lBSS9CLFlBQVksV0FBeUI7UUFGN0IsZ0JBQVcsR0FBVyxDQUFDLENBQUE7UUFHOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFRCwrQkFBK0IsQ0FBQyxTQUFpQztRQUNoRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFOUQsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QifQ==