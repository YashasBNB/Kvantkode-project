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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudE1lbnVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50TWVudXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUlOLFlBQVksRUFDWixNQUFNLEdBR04sTUFBTSxnREFBZ0QsQ0FBQTtBQUdoRCxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFZO0lBQ3hCLFlBQTJDLFdBQXlCO1FBQXpCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQUcsQ0FBQztJQUV4RSw0QkFBNEIsQ0FBQyxpQkFBcUM7UUFDakUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxpQkFBcUM7UUFDNUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxpQkFBcUM7UUFDNUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFRCxpQ0FBaUMsQ0FBQyxpQkFBcUM7UUFDdEUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRSxpQkFBaUIsRUFBRTtZQUM3RSwyQkFBMkIsRUFBRSxJQUFJO1NBQ2pDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxPQUFnQixFQUFFLGlCQUFxQztRQUM3RSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxPQUFnQixFQUFFLGlCQUFxQztRQUN4RSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFRCxtQ0FBbUMsQ0FBQyxpQkFBcUM7UUFDeEUsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxpQkFBaUIsRUFBRTtZQUMzRSxpQkFBaUIsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxPQUFPLENBQ2QsTUFBYyxFQUNkLGlCQUFxQyxFQUNyQyxPQUE0QjtRQUU1QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRU8sVUFBVSxDQUNqQixNQUFjLEVBQ2QsaUJBQXFDLEVBQ3JDLE9BQTRCO1FBRTVCLE9BQU8sSUFBSSxDQUFDLFdBQVc7YUFDckIsY0FBYyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUM7YUFDbEQsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDeEIsSUFBSSxFQUFFLENBQUE7SUFDVCxDQUFDO0lBRUQsT0FBTyxLQUFVLENBQUM7Q0FDbEIsQ0FBQTtBQXZEWSxZQUFZO0lBQ1gsV0FBQSxZQUFZLENBQUE7R0FEYixZQUFZLENBdUR4QiJ9