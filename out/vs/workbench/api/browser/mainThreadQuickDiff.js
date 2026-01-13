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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { IQuickDiffService } from '../../contrib/scm/common/quickDiff.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadQuickDiff = class MainThreadQuickDiff {
    constructor(extHostContext, quickDiffService) {
        this.quickDiffService = quickDiffService;
        this.providerDisposables = new DisposableMap();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostQuickDiff);
    }
    async $registerQuickDiffProvider(handle, selector, label, rootUri, visible) {
        const provider = {
            label,
            rootUri: URI.revive(rootUri),
            selector,
            isSCM: false,
            visible,
            getOriginalResource: async (uri) => {
                return URI.revive(await this.proxy.$provideOriginalResource(handle, uri, CancellationToken.None));
            },
        };
        const disposable = this.quickDiffService.addQuickDiffProvider(provider);
        this.providerDisposables.set(handle, disposable);
    }
    async $unregisterQuickDiffProvider(handle) {
        if (this.providerDisposables.has(handle)) {
            this.providerDisposables.deleteAndDispose(handle);
        }
    }
    dispose() {
        this.providerDisposables.dispose();
    }
};
MainThreadQuickDiff = __decorate([
    extHostNamedCustomer(MainContext.MainThreadQuickDiff),
    __param(1, IQuickDiffService)
], MainThreadQuickDiff);
export { MainThreadQuickDiff };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFF1aWNrRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRRdWlja0RpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUNOLGNBQWMsRUFHZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0sdUNBQXVDLENBQUE7QUFDNUYsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBR3RELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBSS9CLFlBQ0MsY0FBK0IsRUFDWixnQkFBb0Q7UUFBbkMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUpoRSx3QkFBbUIsR0FBRyxJQUFJLGFBQWEsRUFBdUIsQ0FBQTtRQU1yRSxJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELEtBQUssQ0FBQywwQkFBMEIsQ0FDL0IsTUFBYyxFQUNkLFFBQThCLEVBQzlCLEtBQWEsRUFDYixPQUFrQyxFQUNsQyxPQUFnQjtRQUVoQixNQUFNLFFBQVEsR0FBc0I7WUFDbkMsS0FBSztZQUNMLE9BQU8sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUM1QixRQUFRO1lBQ1IsS0FBSyxFQUFFLEtBQUs7WUFDWixPQUFPO1lBQ1AsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO2dCQUN2QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQ2hCLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUM5RSxDQUFBO1lBQ0YsQ0FBQztTQUNELENBQUE7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVELEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxNQUFjO1FBQ2hELElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbkMsQ0FBQztDQUNELENBQUE7QUEzQ1ksbUJBQW1CO0lBRC9CLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQztJQU9uRCxXQUFBLGlCQUFpQixDQUFBO0dBTlAsbUJBQW1CLENBMkMvQiJ9