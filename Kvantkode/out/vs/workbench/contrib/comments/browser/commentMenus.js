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
import { IMenuService, MenuId, } from '../../../../platform/actions/common/actions.js';
let CommentMenus = class CommentMenus {
    constructor(menuService) {
        this.menuService = menuService;
    }
    getCommentThreadTitleActions(contextKeyService) {
        return this.getMenu(MenuId.CommentThreadTitle, contextKeyService);
    }
    getCommentThreadActions(contextKeyService) {
        return this.getMenu(MenuId.CommentThreadActions, contextKeyService);
    }
    getCommentEditorActions(contextKeyService) {
        return this.getMenu(MenuId.CommentEditorActions, contextKeyService);
    }
    getCommentThreadAdditionalActions(contextKeyService) {
        return this.getMenu(MenuId.CommentThreadAdditionalActions, contextKeyService, {
            emitEventsForSubmenuChanges: true,
        });
    }
    getCommentTitleActions(comment, contextKeyService) {
        return this.getMenu(MenuId.CommentTitle, contextKeyService);
    }
    getCommentActions(comment, contextKeyService) {
        return this.getMenu(MenuId.CommentActions, contextKeyService);
    }
    getCommentThreadTitleContextActions(contextKeyService) {
        return this.getActions(MenuId.CommentThreadTitleContext, contextKeyService, {
            shouldForwardArgs: true,
        });
    }
    getMenu(menuId, contextKeyService, options) {
        return this.menuService.createMenu(menuId, contextKeyService, options);
    }
    getActions(menuId, contextKeyService, options) {
        return this.menuService
            .getMenuActions(menuId, contextKeyService, options)
            .map((value) => value[1])
            .flat();
    }
    dispose() { }
};
CommentMenus = __decorate([
    __param(0, IMenuService)
], CommentMenus);
export { CommentMenus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudE1lbnVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRNZW51cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBSU4sWUFBWSxFQUNaLE1BQU0sR0FHTixNQUFNLGdEQUFnRCxDQUFBO0FBR2hELElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQVk7SUFDeEIsWUFBMkMsV0FBeUI7UUFBekIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7SUFBRyxDQUFDO0lBRXhFLDRCQUE0QixDQUFDLGlCQUFxQztRQUNqRSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVELHVCQUF1QixDQUFDLGlCQUFxQztRQUM1RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELHVCQUF1QixDQUFDLGlCQUFxQztRQUM1RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELGlDQUFpQyxDQUFDLGlCQUFxQztRQUN0RSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLDhCQUE4QixFQUFFLGlCQUFpQixFQUFFO1lBQzdFLDJCQUEyQixFQUFFLElBQUk7U0FDakMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELHNCQUFzQixDQUFDLE9BQWdCLEVBQUUsaUJBQXFDO1FBQzdFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELGlCQUFpQixDQUFDLE9BQWdCLEVBQUUsaUJBQXFDO1FBQ3hFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVELG1DQUFtQyxDQUFDLGlCQUFxQztRQUN4RSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFFLGlCQUFpQixFQUFFO1lBQzNFLGlCQUFpQixFQUFFLElBQUk7U0FDdkIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLE9BQU8sQ0FDZCxNQUFjLEVBQ2QsaUJBQXFDLEVBQ3JDLE9BQTRCO1FBRTVCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFTyxVQUFVLENBQ2pCLE1BQWMsRUFDZCxpQkFBcUMsRUFDckMsT0FBNEI7UUFFNUIsT0FBTyxJQUFJLENBQUMsV0FBVzthQUNyQixjQUFjLENBQUMsTUFBTSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sQ0FBQzthQUNsRCxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN4QixJQUFJLEVBQUUsQ0FBQTtJQUNULENBQUM7SUFFRCxPQUFPLEtBQVUsQ0FBQztDQUNsQixDQUFBO0FBdkRZLFlBQVk7SUFDWCxXQUFBLFlBQVksQ0FBQTtHQURiLFlBQVksQ0F1RHhCIn0=