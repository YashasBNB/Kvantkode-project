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
let KeymapRecommendations = class KeymapRecommendations extends ExtensionRecommendations {
    get recommendations() {
        return this._recommendations;
    }
    constructor(productService) {
        super();
        this.productService = productService;
        this._recommendations = [];
    }
    async doActivate() {
        if (this.productService.keymapExtensionTips) {
            this._recommendations = this.productService.keymapExtensionTips.map((extensionId) => ({
                extension: extensionId.toLowerCase(),
                reason: {
                    reasonId: 6 /* ExtensionRecommendationReason.Application */,
                    reasonText: '',
                },
            }));
        }
    }
};
KeymapRecommendations = __decorate([
    __param(0, IProductService)
], KeymapRecommendations);
export { KeymapRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5bWFwUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIva2V5bWFwUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBMkIsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFHaEYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSx3QkFBd0I7SUFFbEUsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzdCLENBQUM7SUFFRCxZQUE2QixjQUFnRDtRQUM1RSxLQUFLLEVBQUUsQ0FBQTtRQURzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFMckUscUJBQWdCLEdBQThCLEVBQUUsQ0FBQTtJQU94RCxDQUFDO0lBRVMsS0FBSyxDQUFDLFVBQVU7UUFDekIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNyRixTQUFTLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRTtnQkFDcEMsTUFBTSxFQUFFO29CQUNQLFFBQVEsbURBQTJDO29CQUNuRCxVQUFVLEVBQUUsRUFBRTtpQkFDZDthQUNELENBQUMsQ0FBQyxDQUFBO1FBQ0osQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBckJZLHFCQUFxQjtJQU1wQixXQUFBLGVBQWUsQ0FBQTtHQU5oQixxQkFBcUIsQ0FxQmpDIn0=