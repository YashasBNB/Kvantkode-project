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
import { revive } from '../../../base/common/marshalling.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IUserDataProfileImportExportService, } from '../../services/userDataProfile/common/userDataProfile.js';
let MainThreadProfileContentHandlers = class MainThreadProfileContentHandlers extends Disposable {
    constructor(context, userDataProfileImportExportService) {
        super();
        this.userDataProfileImportExportService = userDataProfileImportExportService;
        this.registeredHandlers = this._register(new DisposableMap());
        this.proxy = context.getProxy(ExtHostContext.ExtHostProfileContentHandlers);
    }
    async $registerProfileContentHandler(id, name, description, extensionId) {
        this.registeredHandlers.set(id, this.userDataProfileImportExportService.registerProfileContentHandler(id, {
            name,
            description,
            extensionId,
            saveProfile: async (name, content, token) => {
                const result = await this.proxy.$saveProfile(id, name, content, token);
                return result ? revive(result) : null;
            },
            readProfile: async (uri, token) => {
                return this.proxy.$readProfile(id, uri, token);
            },
        }));
    }
    async $unregisterProfileContentHandler(id) {
        this.registeredHandlers.deleteAndDispose(id);
    }
};
MainThreadProfileContentHandlers = __decorate([
    extHostNamedCustomer(MainContext.MainThreadProfileContentHandlers),
    __param(1, IUserDataProfileImportExportService)
], MainThreadProfileContentHandlers);
export { MainThreadProfileContentHandlers };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFByb2ZpbGVDb250ZW50SGFuZGxlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFByb2ZpbGVDb250ZW50SGFuZGxlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFNUQsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLG1DQUFtQyxHQUNuQyxNQUFNLDBEQUEwRCxDQUFBO0FBRzFELElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQ1osU0FBUSxVQUFVO0lBT2xCLFlBQ0MsT0FBd0IsRUFFeEIsa0NBQXdGO1FBRXhGLEtBQUssRUFBRSxDQUFBO1FBRlUsdUNBQWtDLEdBQWxDLGtDQUFrQyxDQUFxQztRQUx4RSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUF1QixDQUFDLENBQUE7UUFRN0YsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCxLQUFLLENBQUMsOEJBQThCLENBQ25DLEVBQVUsRUFDVixJQUFZLEVBQ1osV0FBK0IsRUFDL0IsV0FBbUI7UUFFbkIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FDMUIsRUFBRSxFQUNGLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLEVBQUU7WUFDekUsSUFBSTtZQUNKLFdBQVc7WUFDWCxXQUFXO1lBQ1gsV0FBVyxFQUFFLEtBQUssRUFBRSxJQUFZLEVBQUUsT0FBZSxFQUFFLEtBQXdCLEVBQUUsRUFBRTtnQkFDOUUsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDdEUsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBcUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUMxRCxDQUFDO1lBQ0QsV0FBVyxFQUFFLEtBQUssRUFBRSxHQUFRLEVBQUUsS0FBd0IsRUFBRSxFQUFFO2dCQUN6RCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDL0MsQ0FBQztTQUNELENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFVO1FBQ2hELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0NBQ0QsQ0FBQTtBQTNDWSxnQ0FBZ0M7SUFENUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLGdDQUFnQyxDQUFDO0lBV2hFLFdBQUEsbUNBQW1DLENBQUE7R0FWekIsZ0NBQWdDLENBMkM1QyJ9