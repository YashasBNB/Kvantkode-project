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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFByb2ZpbGVDb250ZW50SGFuZGxlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkUHJvZmlsZUNvbnRlbnRIYW5kbGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1RCxPQUFPLEVBQ04sY0FBYyxFQUVkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4sbUNBQW1DLEdBQ25DLE1BQU0sMERBQTBELENBQUE7QUFHMUQsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FDWixTQUFRLFVBQVU7SUFPbEIsWUFDQyxPQUF3QixFQUV4QixrQ0FBd0Y7UUFFeEYsS0FBSyxFQUFFLENBQUE7UUFGVSx1Q0FBa0MsR0FBbEMsa0NBQWtDLENBQXFDO1FBTHhFLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQXVCLENBQUMsQ0FBQTtRQVE3RixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLDZCQUE2QixDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUVELEtBQUssQ0FBQyw4QkFBOEIsQ0FDbkMsRUFBVSxFQUNWLElBQVksRUFDWixXQUErQixFQUMvQixXQUFtQjtRQUVuQixJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUMxQixFQUFFLEVBQ0YsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBRTtZQUN6RSxJQUFJO1lBQ0osV0FBVztZQUNYLFdBQVc7WUFDWCxXQUFXLEVBQUUsS0FBSyxFQUFFLElBQVksRUFBRSxPQUFlLEVBQUUsS0FBd0IsRUFBRSxFQUFFO2dCQUM5RSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUN0RSxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFxQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQzFELENBQUM7WUFDRCxXQUFXLEVBQUUsS0FBSyxFQUFFLEdBQVEsRUFBRSxLQUF3QixFQUFFLEVBQUU7Z0JBQ3pELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1NBQ0QsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLEVBQVU7UUFDaEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzdDLENBQUM7Q0FDRCxDQUFBO0FBM0NZLGdDQUFnQztJQUQ1QyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsZ0NBQWdDLENBQUM7SUFXaEUsV0FBQSxtQ0FBbUMsQ0FBQTtHQVZ6QixnQ0FBZ0MsQ0EyQzVDIn0=