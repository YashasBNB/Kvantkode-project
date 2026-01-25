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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadLabelService = class MainThreadLabelService extends Disposable {
    constructor(_, _labelService) {
        super();
        this._labelService = _labelService;
        this._resourceLabelFormatters = this._register(new DisposableMap());
    }
    $registerResourceLabelFormatter(handle, formatter) {
        // Dynamicily registered formatters should have priority over those contributed via package.json
        formatter.priority = true;
        const disposable = this._labelService.registerCachedFormatter(formatter);
        this._resourceLabelFormatters.set(handle, disposable);
    }
    $unregisterResourceLabelFormatter(handle) {
        this._resourceLabelFormatters.deleteAndDispose(handle);
    }
};
MainThreadLabelService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLabelService),
    __param(1, ILabelService)
], MainThreadLabelService);
export { MainThreadLabelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhYmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRMYWJlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsYUFBYSxFQUEwQixNQUFNLHlDQUF5QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQStCLE1BQU0sK0JBQStCLENBQUE7QUFDeEYsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBR3RELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQUdyRCxZQUNDLENBQWtCLEVBQ0gsYUFBNkM7UUFFNUQsS0FBSyxFQUFFLENBQUE7UUFGeUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFKNUMsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBVSxDQUFDLENBQUE7SUFPdkYsQ0FBQztJQUVELCtCQUErQixDQUFDLE1BQWMsRUFBRSxTQUFpQztRQUNoRixnR0FBZ0c7UUFDaEcsU0FBUyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7UUFDekIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN4RSxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRUQsaUNBQWlDLENBQUMsTUFBYztRQUMvQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdkQsQ0FBQztDQUNELENBQUE7QUFwQlksc0JBQXNCO0lBRGxDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQztJQU10RCxXQUFBLGFBQWEsQ0FBQTtHQUxILHNCQUFzQixDQW9CbEMifQ==