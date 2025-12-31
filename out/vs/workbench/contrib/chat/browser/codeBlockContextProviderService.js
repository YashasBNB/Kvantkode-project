/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
export class ChatCodeBlockContextProviderService {
    constructor() {
        this._providers = new Map();
    }
    get providers() {
        return [...this._providers.values()];
    }
    registerProvider(provider, id) {
        this._providers.set(id, provider);
        return toDisposable(() => this._providers.delete(id));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrQ29udGV4dFByb3ZpZGVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb2RlQmxvY2tDb250ZXh0UHJvdmlkZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdoRixNQUFNLE9BQU8sbUNBQW1DO0lBQWhEO1FBRWtCLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBMkMsQ0FBQTtJQVNqRixDQUFDO0lBUEEsSUFBSSxTQUFTO1FBQ1osT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFDRCxnQkFBZ0IsQ0FBQyxRQUF5QyxFQUFFLEVBQVU7UUFDckUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdEQsQ0FBQztDQUNEIn0=