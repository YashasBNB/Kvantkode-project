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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL3dlYlJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQTJCLE1BQU0sK0JBQStCLENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUVoSCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLHdCQUF3QjtJQUUvRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVELFlBQ2tCLGNBQWdELEVBRWpFLGdDQUFvRjtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUoyQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFFaEQscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztRQVI3RSxxQkFBZ0IsR0FBOEIsRUFBRSxDQUFBO0lBV3hELENBQUM7SUFFUyxLQUFLLENBQUMsVUFBVTtRQUN6QixNQUFNLFNBQVMsR0FDZCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCO1lBQ2xFLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDhCQUE4QjtZQUNyRSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQywrQkFBK0IsQ0FBQTtRQUN2RSxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FDL0QsQ0FBQyxXQUFXLEVBQTJCLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQyxTQUFTLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRTtnQkFDcEMsTUFBTSxFQUFFO29CQUNQLFFBQVEsbURBQTJDO29CQUNuRCxVQUFVLEVBQUUsUUFBUSxDQUNuQixRQUFRLEVBQ1IsbURBQW1ELEVBQ25ELElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUM1QjtpQkFDRDthQUNELENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBbkNZLGtCQUFrQjtJQU81QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUNBQWlDLENBQUE7R0FSdkIsa0JBQWtCLENBbUM5QiJ9