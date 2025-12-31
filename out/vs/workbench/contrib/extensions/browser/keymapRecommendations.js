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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5bWFwUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2tleW1hcFJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQTJCLE1BQU0sK0JBQStCLENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBR2hGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsd0JBQXdCO0lBRWxFLElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRUQsWUFBNkIsY0FBZ0Q7UUFDNUUsS0FBSyxFQUFFLENBQUE7UUFEc0MsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBTHJFLHFCQUFnQixHQUE4QixFQUFFLENBQUE7SUFPeEQsQ0FBQztJQUVTLEtBQUssQ0FBQyxVQUFVO1FBQ3pCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDckYsU0FBUyxFQUFFLFdBQVcsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3BDLE1BQU0sRUFBRTtvQkFDUCxRQUFRLG1EQUEyQztvQkFDbkQsVUFBVSxFQUFFLEVBQUU7aUJBQ2Q7YUFDRCxDQUFDLENBQUMsQ0FBQTtRQUNKLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXJCWSxxQkFBcUI7SUFNcEIsV0FBQSxlQUFlLENBQUE7R0FOaEIscUJBQXFCLENBcUJqQyJ9