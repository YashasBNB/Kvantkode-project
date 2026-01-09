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
import { IURLService } from '../../../../platform/url/common/url.js';
import { URI } from '../../../../base/common/uri.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { URLHandlerChannel } from '../../../../platform/url/common/urlIpc.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { matchesScheme } from '../../../../base/common/network.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { NativeURLService } from '../../../../platform/url/common/urlService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let RelayURLService = class RelayURLService extends NativeURLService {
    constructor(mainProcessService, openerService, nativeHostService, productService, logService) {
        super(productService);
        this.nativeHostService = nativeHostService;
        this.logService = logService;
        this.urlService = ProxyChannel.toService(mainProcessService.getChannel('url'));
        mainProcessService.registerChannel('urlHandler', new URLHandlerChannel(this));
        openerService.registerOpener(this);
    }
    create(options) {
        const uri = super.create(options);
        let query = uri.query;
        if (!query) {
            query = `windowId=${encodeURIComponent(this.nativeHostService.windowId)}`;
        }
        else {
            query += `&windowId=${encodeURIComponent(this.nativeHostService.windowId)}`;
        }
        return uri.with({ query });
    }
    async open(resource, options) {
        if (!matchesScheme(resource, this.productService.urlProtocol)) {
            return false;
        }
        if (typeof resource === 'string') {
            resource = URI.parse(resource);
        }
        return await this.urlService.open(resource, options);
    }
    async handleURL(uri, options) {
        const result = await super.open(uri, options);
        if (result) {
            this.logService.trace('URLService#handleURL(): handled', uri.toString(true));
            await this.nativeHostService.focusWindow({
                force: true /* Application may not be active */,
                targetWindowId: this.nativeHostService.windowId,
            });
        }
        else {
            this.logService.trace('URLService#handleURL(): not handled', uri.toString(true));
        }
        return result;
    }
};
RelayURLService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IOpenerService),
    __param(2, INativeHostService),
    __param(3, IProductService),
    __param(4, ILogService)
], RelayURLService);
export { RelayURLService };
registerSingleton(IURLService, RelayURLService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VybC9lbGVjdHJvbi1zYW5kYm94L3VybFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBZ0MsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQVcsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBTzdELElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEsZ0JBQWdCO0lBR3BELFlBQ3NCLGtCQUF1QyxFQUM1QyxhQUE2QixFQUNSLGlCQUFxQyxFQUN6RCxjQUErQixFQUNsQixVQUF1QjtRQUVyRCxLQUFLLENBQUMsY0FBYyxD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