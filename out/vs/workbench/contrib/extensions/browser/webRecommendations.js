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
import { ExtensionRecommendations } from './extensionRecommendations.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { localize } from '../../../../nls.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
let WebRecommendations = class WebRecommendations extends ExtensionRecommendations {
    get recommendations() {
        return this._recommendations;
    }
    constructor(productService, extensionManagementServerService) {
        super();
        this.productService = productService;
        this.extensionManagementServerService = extensionManagementServerService;
        this._recommendations = [];
    }
    async doActivate() {
        const isOnlyWeb = this.extensionManagementServerService.webExtensionManagementServer &&
            !this.extensionManagementServerService.localExtensionManagementServer &&
            !this.extensionManagementServerService.remoteExtensionManagementServer;
        if (isOnlyWeb && Array.isArray(this.productService.webExtensionTips)) {
            this._recommendations = this.productService.webExtensionTips.map((extensionId) => ({
                extension: extensionId.toLowerCase(),
                reason: {
                    reasonId: 6 /* ExtensionRecommendationReason.Application */,
                    reasonText: localize('reason', 'This extension is recommended for {0} for the Web', this.productService.nameLong),
                },
            }));
        }
    }
};
WebRecommendations = __decorate([
    __param(0, IProductService),
    __param(1, IExtensionManagementServerService)
], WebRecommendations);
export { WebRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvd2ViUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBMkIsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBRWhILElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsd0JBQXdCO0lBRS9ELElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRUQsWUFDa0IsY0FBZ0QsRUFFakUsZ0NBQW9GO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBSjJCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUVoRCxxQ0FBZ0MsR0FBaEMsZ0NBQWdDLENBQW1DO1FBUjdFLHFCQUFnQixHQUE4QixFQUFFLENBQUE7SUFXeEQsQ0FBQztJQUVTLEtBQUssQ0FBQyxVQUFVO1FBQ3pCLE1BQU0sU0FBUyxHQUNkLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEI7WUFDbEUsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCO1lBQ3JFLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLCtCQUErQixDQUFBO1FBQ3ZFLElBQUksU0FBUyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDdEUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUMvRCxDQUFDLFdBQVcsRUFBMkIsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLFNBQVMsRUFBRSxXQUFXLENBQUMsV0FBVyxFQUFFO2dCQUNwQyxNQUFNLEVBQUU7b0JBQ1AsUUFBUSxtREFBMkM7b0JBQ25ELFVBQVUsRUFBRSxRQUFRLENBQ25CLFFBQVEsRUFDUixtREFBbUQsRUFDbkQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQzVCO2lCQUNEO2FBQ0QsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFuQ1ksa0JBQWtCO0lBTzVCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQ0FBaUMsQ0FBQTtHQVJ2QixrQkFBa0IsQ0FtQzlCIn0=