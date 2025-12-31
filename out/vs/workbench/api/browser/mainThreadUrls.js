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
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IURLService } from '../../../platform/url/common/url.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IExtensionUrlHandler, } from '../../services/extensions/browser/extensionUrlHandler.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { ITrustedDomainService } from '../../contrib/url/browser/trustedDomainService.js';
class ExtensionUrlHandler {
    constructor(proxy, handle, extensionId, extensionDisplayName) {
        this.proxy = proxy;
        this.handle = handle;
        this.extensionId = extensionId;
        this.extensionDisplayName = extensionDisplayName;
    }
    async handleURL(uri, options) {
        if (!ExtensionIdentifier.equals(this.extensionId, uri.authority)) {
            return false;
        }
        await this.proxy.$handleExternalUri(this.handle, uri);
        return true;
    }
}
let MainThreadUrls = class MainThreadUrls extends Disposable {
    constructor(context, trustedDomainService, urlService, extensionUrlHandler) {
        super();
        this.urlService = urlService;
        this.extensionUrlHandler = extensionUrlHandler;
        this.handlers = new Map();
        this.proxy = context.getProxy(ExtHostContext.ExtHostUrls);
    }
    async $registerUriHandler(handle, extensionId, extensionDisplayName) {
        const handler = new ExtensionUrlHandler(this.proxy, handle, extensionId, extensionDisplayName);
        const disposable = this.urlService.registerHandler(handler);
        this.handlers.set(handle, { extensionId, disposable });
        this.extensionUrlHandler.registerExtensionHandler(extensionId, handler);
        return undefined;
    }
    async $unregisterUriHandler(handle) {
        const tuple = this.handlers.get(handle);
        if (!tuple) {
            return undefined;
        }
        const { extensionId, disposable } = tuple;
        this.extensionUrlHandler.unregisterExtensionHandler(extensionId);
        this.handlers.delete(handle);
        disposable.dispose();
        return undefined;
    }
    async $createAppUri(uri) {
        return this.urlService.create(uri);
    }
    dispose() {
        super.dispose();
        this.handlers.forEach(({ disposable }) => disposable.dispose());
        this.handlers.clear();
    }
};
MainThreadUrls = __decorate([
    extHostNamedCustomer(MainContext.MainThreadUrls),
    __param(1, ITrustedDomainService),
    __param(2, IURLService),
    __param(3, IExtensionUrlHandler)
], MainThreadUrls);
export { MainThreadUrls };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFVybHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFVybHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGNBQWMsRUFDZCxXQUFXLEdBR1gsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVsRixPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXpGLE1BQU0sbUJBQW1CO0lBQ3hCLFlBQ2tCLEtBQXVCLEVBQ3ZCLE1BQWMsRUFDdEIsV0FBZ0MsRUFDaEMsb0JBQTRCO1FBSHBCLFVBQUssR0FBTCxLQUFLLENBQWtCO1FBQ3ZCLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDdEIsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBQ2hDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBUTtJQUNuQyxDQUFDO0lBRUosS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFRLEVBQUUsT0FBeUI7UUFDbEQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2xFLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFD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