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
import { WindowIdleValue } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService, createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { TRUSTED_DOMAINS_STORAGE_KEY, readStaticTrustedDomains } from './trustedDomains.js';
import { isURLDomainTrusted } from '../common/trustedDomains.js';
import { Emitter } from '../../../../base/common/event.js';
export const ITrustedDomainService = createDecorator('ITrustedDomainService');
let TrustedDomainService = class TrustedDomainService extends Disposable {
    constructor(_instantiationService, _storageService) {
        super();
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._onDidChangeTrustedDomains = this._register(new Emitter());
        this.onDidChangeTrustedDomains = this._onDidChangeTrustedDomains.event;
        const initStaticDomainsResult = () => {
            return new WindowIdleValue(mainWindow, () => {
                const { defaultTrustedDomains, trustedDomains } = this._instantiationService.invokeFunction(readStaticTrustedDomains);
                return [...defaultTrustedDomains, ...trustedDomains];
            });
        };
        this._staticTrustedDomainsResult = initStaticDomainsResult();
        this._register(this._storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, TRUSTED_DOMAINS_STORAGE_KEY, this._store)(() => {
            this._staticTrustedDomainsResult?.dispose();
            this._staticTrustedDomainsResult = initStaticDomainsResult();
            this._onDidChangeTrustedDomains.fire();
        }));
    }
    isValid(resource) {
        const { defaultTrustedDomains, trustedDomains } = this._instantiationService.invokeFunction(readStaticTrustedDomains);
        const allTrustedDomains = [...defaultTrustedDomains, ...trustedDomains];
        return isURLDomainTrusted(resource, allTrustedDomains);
    }
};
TrustedDomainService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IStorageService)
], TrustedDomainService);
export { TrustedDomainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvYnJvd3Nlci90cnVzdGVkRG9tYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLGVBQWUsR0FDZixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLHdCQUF3QixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0IsdUJBQXVCLENBQUMsQ0FBQTtBQVE3RixJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFRbkQsWUFDd0IscUJBQTZELEVBQ25FLGVBQWlEO1FBRWxFLEtBQUssRUFBRSxDQUFBO1FBSGlDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDbEQsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBTDNELCtCQUEwQixHQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN2Riw4QkFBeUIsR0FBZ0IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtRQVE3RSxNQUFNLHVCQUF1QixHQUFHLEdBQUcsRUFBRTtZQUNwQyxPQUFPLElBQUksZUFBZSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQzNDLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsR0FDOUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO2dCQUNwRSxPQUFPLENBQUMsR0FBRyxxQkFBcUIsRUFBRSxHQUFHLGNBQWMsQ0FBQyxDQUFBO1lBQ3JELENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLDJCQUEyQixHQUFHLHVCQUF1QixFQUFFLENBQUE7UUFDNUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixvQ0FFcEMsMkJBQTJCLEVBQzNCLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQyxHQUFHLEVBQUU7WUFDTixJQUFJLENBQUMsMkJBQTJCLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDM0MsSUFBSSxDQUFDLDJCQUEyQixHQUFHLHVCQUF1QixFQUFFLENBQUE7WUFDNUQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3ZDLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQWE7UUFDcEIsTUFBTSxFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxHQUM5QyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDcEUsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLEdBQUcscUJBQXFCLEVBQUUsR0FBRyxjQUFjLENBQUMsQ0FBQTtRQUV2RSxPQUFPLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7Q0FDRCxDQUFBO0FBMUNZLG9CQUFvQjtJQVM5QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0dBVkwsb0JBQW9CLENBMENoQyJ9