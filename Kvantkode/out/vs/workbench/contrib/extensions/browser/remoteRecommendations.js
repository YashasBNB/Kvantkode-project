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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvcmVtb3RlUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXpFLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsd0JBQXdCO0lBRWxFLElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRUQsWUFBNkIsY0FBZ0Q7UUFDNUUsS0FBSyxFQUFFLENBQUE7UUFEc0MsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBTHJFLHFCQUFnQixHQUFxQyxFQUFFLENBQUE7SUFPL0QsQ0FBQztJQUVTLEtBQUssQ0FBQyxVQUFVO1FBQ3pCLE1BQU0sYUFBYSxHQUFHO1lBQ3JCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUI7WUFDMUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLDZCQUE2QjtTQUNwRCxDQUFBO1FBQ0QsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO2FBQ2xELE1BQU0sQ0FDTixDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLENBQzFCLENBQUMsa0JBQWtCLElBQUksa0JBQWtCLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUNwRTthQUNBLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNwQixTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUU7WUFDOUMsTUFBTSxFQUFFO2dCQUNQLFFBQVEsbURBQTJDO2dCQUNuRCxVQUFVLEVBQUUsRUFBRTthQUNkO1NBQ0QsQ0FBQyxDQUFDLENBQUE7SUFDTCxDQUFDO0NBQ0QsQ0FBQTtBQTdCWSxxQkFBcUI7SUFNcEIsV0FBQSxlQUFlLENBQUE7R0FOaEIscUJBQXFCLENBNkJqQyJ9