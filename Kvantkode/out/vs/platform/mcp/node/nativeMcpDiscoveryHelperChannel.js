/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { transformOutgoingURIs } from '../../../base/common/uriIpc.js';
import { INativeMcpDiscoveryHelperService } from '../common/nativeMcpDiscoveryHelper.js';
let NativeMcpDiscoveryHelperChannel = class NativeMcpDiscoveryHelperChannel {
    constructor(getUriTransformer, nativeMcpDiscoveryHelperService) {
        this.getUriTransformer = getUriTransformer;
        this.nativeMcpDiscoveryHelperService = nativeMcpDiscoveryHelperService;
    }
    listen(context, event) {
        throw new Error('Invalid listen');
    }
    async call(context, command, args) {
        const uriTransformer = this.getUriTransformer?.(context);
        switch (command) {
            case 'load': {
                const result = await this.nativeMcpDiscoveryHelperService.load();
                return uriTransformer ? transformOutgoingURIs(result, uriTransformer) : result;
            }
        }
        throw new Error('Invalid call');
    }
};
NativeMcpDiscoveryHelperChannel = __decorate([
    __param(1, INativeMcpDiscoveryHelperService)
], NativeMcpDiscoveryHelperChannel);
export { NativeMcpDiscoveryHelperChannel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5SGVscGVyQ2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWNwL25vZGUvbmF0aXZlTWNwRGlzY292ZXJ5SGVscGVyQ2hhbm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQW1CLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFakYsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBK0I7SUFDM0MsWUFDUyxpQkFBeUUsRUFFekUsK0JBQWlFO1FBRmpFLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBd0Q7UUFFekUsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztJQUN2RSxDQUFDO0lBRUosTUFBTSxDQUFDLE9BQVksRUFBRSxLQUFhO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFZLEVBQUUsT0FBZSxFQUFFLElBQVU7UUFDbkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDeEQsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ2hFLE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtZQUMvRSxDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUNELENBQUE7QUFyQlksK0JBQStCO0lBR3pDLFdBQUEsZ0NBQWdDLENBQUE7R0FIdEIsK0JBQStCLENBcUIzQyJ9