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
import { dispose } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { IShareService } from '../../contrib/share/common/share.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadShare = class MainThreadShare {
    constructor(extHostContext, shareService) {
        this.shareService = shareService;
        this.providers = new Map();
        this.providerDisposables = new Map();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostShare);
    }
    $registerShareProvider(handle, selector, id, label, priority) {
        const provider = {
            id,
            label,
            selector,
            priority,
            provideShare: async (item) => {
                const result = await this.proxy.$provideShare(handle, item, CancellationToken.None);
                return typeof result === 'string' ? result : URI.revive(result);
            },
        };
        this.providers.set(handle, provider);
        const disposable = this.shareService.registerShareProvider(provider);
        this.providerDisposables.set(handle, disposable);
    }
    $unregisterShareProvider(handle) {
        if (this.providers.has(handle)) {
            this.providers.delete(handle);
        }
        if (this.providerDisposables.has(handle)) {
            this.providerDisposables.delete(handle);
        }
    }
    dispose() {
        this.providers.clear();
        dispose(this.providerDisposables.values());
        this.providerDisposables.clear();
    }
};
MainThreadShare = __decorate([
    extHostNamedCustomer(MainContext.MainThreadShare),
    __param(1, IShareService)
], MainThreadShare);
export { MainThreadShare };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNoYXJlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRTaGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFDTixjQUFjLEVBR2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFrQixhQUFhLEVBQWtCLE1BQU0scUNBQXFDLENBQUE7QUFDbkcsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHNEQUFzRCxDQUFBO0FBR3RELElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7SUFLM0IsWUFDQyxjQUErQixFQUNoQixZQUE0QztRQUEzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUxwRCxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUE7UUFDN0Msd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUE7UUFNM0QsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0lBRUQsc0JBQXNCLENBQ3JCLE1BQWMsRUFDZCxRQUE4QixFQUM5QixFQUFVLEVBQ1YsS0FBYSxFQUNiLFFBQWdCO1FBRWhCLE1BQU0sUUFBUSxHQUFtQjtZQUNoQyxFQUFFO1lBQ0YsS0FBSztZQUNMLFFBQVE7WUFDUixRQUFRO1lBQ1IsWUFBWSxFQUFFLEtBQUssRUFBRSxJQUFvQixFQUFFLEVBQUU7Z0JBQzVDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDbkYsT0FBTyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoRSxDQUFDO1NBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNwQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxNQUFjO1FBQ3RDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5QixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QyxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3RCLE9BQU8sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDakMsQ0FBQztDQUNELENBQUE7QUFoRFksZUFBZTtJQUQzQixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDO0lBUS9DLFdBQUEsYUFBYSxDQUFBO0dBUEgsZUFBZSxDQWdEM0IifQ==