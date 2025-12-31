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
import * as dom from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { CommentFormActions } from './commentFormActions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
let CommentThreadAdditionalActions = class CommentThreadAdditionalActions extends Disposable {
    constructor(container, _commentThread, _contextKeyService, _commentMenus, _actionRunDelegate, _keybindingService, _contextMenuService) {
        super();
        this._commentThread = _commentThread;
        this._contextKeyService = _contextKeyService;
        this._commentMenus = _commentMenus;
        this._actionRunDelegate = _actionRunDelegate;
        this._keybindingService = _keybindingService;
        this._contextMenuService = _contextMenuService;
        this._container = dom.append(container, dom.$('.comment-additional-actions'));
        dom.append(this._container, dom.$('.section-separator'));
        this._buttonBar = dom.append(this._container, dom.$('.button-bar'));
        this._createAdditionalActions(this._buttonBar);
    }
    _showMenu() {
        this._container?.classList.remove('hidden');
    }
    _hideMenu() {
        this._container?.classList.add('hidden');
    }
    _enableDisableMenu(menu) {
        const groups = menu.getActions({ shouldForwardArgs: true });
        // Show the menu if at least one action is enabled.
        for (const group of groups) {
            const [, actions] = group;
            for (const action of actions) {
                if (action.enabled) {
                    this._showMenu();
                    return;
                }
                for (const subAction of action.actions ?? []) {
                    if (subAction.enabled) {
                        this._showMenu();
                        return;
                    }
                }
            }
        }
        this._hideMenu();
    }
    _createAdditionalActions(container) {
        const menu = this._commentMenus.getCommentThreadAdditionalActions(this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(() => {
            this._commentFormActions.setActions(menu, /*hasOnlySecondaryActions*/ true);
            this._enableDisableMenu(menu);
        }));
        this._commentFormActions = new CommentFormActions(this._keybindingService, this._contextKeyService, this._contextMenuService, container, async (action) => {
            this._actionRunDelegate?.();
            action.run({
                thread: this._commentThread,
                $mid: 8 /* MarshalledId.CommentThreadInstance */,
            });
        }, 4, true);
        this._register(this._commentFormActions);
        this._commentFormActions.setActions(menu, /*hasOnlySecondaryActions*/ true);
        this._enableDisableMenu(menu);
    }
};
CommentThreadAdditionalActions = __decorate([
    __param(5, IKeybindingService),
    __param(6, IContextMenuService)
], CommentThreadAdditionalActions);
export { CommentThreadAdditionalActions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZEFkZGl0aW9uYWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50VGhyZWFkQWRkaXRpb25hbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUl0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFLakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFHNUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFdEYsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEQsU0FBUSxVQUFVO0lBSzVGLFlBQ0MsU0FBc0IsRUFDZCxjQUEwQyxFQUMxQyxrQkFBc0MsRUFDdEMsYUFBMkIsRUFDM0Isa0JBQXVDLEVBQ25CLGtCQUFzQyxFQUNyQyxtQkFBd0M7UUFFckUsS0FBSyxFQUFFLENBQUE7UUFQQyxtQkFBYyxHQUFkLGNBQWMsQ0FBNEI7UUFDMUMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN0QyxrQkFBYSxHQUFiLGFBQWEsQ0FBYztRQUMzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ25CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDckMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUlyRSxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxD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