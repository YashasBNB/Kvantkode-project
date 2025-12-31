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
import { Disposable } from '../../../base/common/lifecycle.js';
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IDownloadService } from '../../../platform/download/common/download.js';
import { URI } from '../../../base/common/uri.js';
let MainThreadDownloadService = class MainThreadDownloadService extends Disposable {
    constructor(extHostContext, downloadService) {
        super();
        this.downloadService = downloadService;
    }
    $download(uri, to) {
        return this.downloadService.download(URI.revive(uri), URI.revive(to));
    }
};
MainThreadDownloadService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDownloadService),
    __param(1, IDownloadService)
], MainThreadDownloadService);
export { MainThreadDownloadService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvd25sb2FkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRG93bmxvYWRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFrQyxNQUFNLCtCQUErQixDQUFBO0FBQzNGLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNoRixPQUFPLEVBQWlCLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBR3pELElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQ1osU0FBUSxVQUFVO0lBR2xCLFlBQ0MsY0FBK0IsRUFDSSxlQUFpQztRQUVwRSxLQUFLLEVBQUUsQ0FBQTtRQUY0QixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7SUFHckUsQ0FBQztJQUVELFNBQVMsQ0FBQyxHQUFrQixFQUFFLEVBQWlCO1FBQzlDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdEUsQ0FBQztDQUNELENBQUE7QUFkWSx5QkFBeUI7SUFEckMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDO0lBT3pELFdBQUEsZ0JBQWdCLENBQUE7R0FOTix5QkFBeUIsQ0FjckMifQ==