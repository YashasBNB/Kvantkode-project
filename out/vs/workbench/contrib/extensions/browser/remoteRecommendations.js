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
import { ExtensionRecommendations, } from './extensionRecommendations.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { PlatformToString, platform } from '../../../../base/common/platform.js';
let RemoteRecommendations = class RemoteRecommendations extends ExtensionRecommendations {
    get recommendations() {
        return this._recommendations;
    }
    constructor(productService) {
        super();
        this.productService = productService;
        this._recommendations = [];
    }
    async doActivate() {
        const extensionTips = {
            ...this.productService.remoteExtensionTips,
            ...this.productService.virtualWorkspaceExtensionTips,
        };
        const currentPlatform = PlatformToString(platform);
        this._recommendations = Object.values(extensionTips)
            .filter(({ supportedPlatforms }) => !supportedPlatforms || supportedPlatforms.includes(currentPlatform))
            .map((extension) => ({
            extension: extension.extensionId.toLowerCase(),
            reason: {
                reasonId: 6 /* ExtensionRecommendationReason.Application */,
                reasonText: '',
            },
        }));
    }
};
RemoteRecommendations = __decorate([
    __param(0, IProductService)
], RemoteRecommendations);
export { RemoteRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL3JlbW90ZVJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV6RSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLHdCQUF3QjtJQUVsRSxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVELFlBQTZCLGNBQWdEO1FBQzVFLEtBQUssRUFBRSxDQUFBO1FBRHNDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUxyRSxxQkFBZ0IsR0FBcUMsRUFBRSxDQUFBO0lBTy9ELENBQUM7SUFFUyxLQUFLLENBQUMsVUFBVTtRQUN6QixNQUFNLGFBQWEsR0FBRztZQUNyQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CO1lBQzFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyw2QkFBNkI7U0FDcEQsQ0FBQTtRQUNELE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQzthQUNsRCxNQUFNLENBQ04sQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUMxQixDQUFDLGtCQUFrQixJQUFJLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FDcEU7YUFDQSxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFO1lBQzlDLE1BQU0sRUFBRTtnQkFDUCxRQUFRLG1EQUEyQztnQkFDbkQsVUFBVSxFQUFFLEVBQUU7YUFDZDtTQUNELENBQUMsQ0FBQyxDQUFBO0lBQ0wsQ0FBQztDQUNELENBQUE7QUE3QlkscUJBQXFCO0lBTXBCLFdBQUEsZUFBZSxDQUFBO0dBTmhCLHFCQUFxQixDQTZCakMifQ==