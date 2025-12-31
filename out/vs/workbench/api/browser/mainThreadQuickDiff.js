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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFF1aWNrRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkUXVpY2tEaWZmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFDTixjQUFjLEVBR2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHVDQUF1QyxDQUFBO0FBQzVGLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUd0RCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQUkvQixZQUNDLGNBQStCLEVBQ1osZ0JBQW9EO1FBQW5DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFKaEUsd0JBQW1CLEdBQUcsSUFBSSxhQUFhLEVBQXVCLENBQUE7UUFNckUsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxLQUFLLENBQUMsMEJBQTBCLENBQy9CLE1BQWMsRUFDZCxRQUE4QixFQUM5QixLQUFhLEVBQ2IsT0FBa0MsRUFDbEMsT0FBZ0I7UUFFaEIsTUFBTSxRQUFRLEdBQXNCO1lBQ25DLEtBQUs7WUFDTCxPQUFPLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDNUIsUUFBUTtZQUNSLEtBQUssRUFBRSxLQUFLO1lBQ1osT0FBTztZQUNQLG1CQUFtQixFQUFFLEtBQUssRUFBRSxHQUFRLEVBQUUsRUFBRTtnQkFDdkMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUNoQixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FDOUUsQ0FBQTtZQUNGLENBQUM7U0FDRCxDQUFBO1FBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRCxLQUFLLENBQUMsNEJBQTRCLENBQUMsTUFBYztRQUNoRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ25DLENBQUM7Q0FDRCxDQUFBO0FBM0NZLG1CQUFtQjtJQUQvQixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUM7SUFPbkQsV0FBQSxpQkFBaUIsQ0FBQTtHQU5QLG1CQUFtQixDQTJDL0IifQ==