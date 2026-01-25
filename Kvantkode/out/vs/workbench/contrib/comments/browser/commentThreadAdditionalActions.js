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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZEFkZGl0aW9uYWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRUaHJlYWRBZGRpdGlvbmFsQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBSXRELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUtqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUc1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV0RixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUE4RCxTQUFRLFVBQVU7SUFLNUYsWUFDQyxTQUFzQixFQUNkLGNBQTBDLEVBQzFDLGtCQUFzQyxFQUN0QyxhQUEyQixFQUMzQixrQkFBdUMsRUFDbkIsa0JBQXNDLEVBQ3JDLG1CQUF3QztRQUVyRSxLQUFLLEVBQUUsQ0FBQTtRQVBDLG1CQUFjLEdBQWQsY0FBYyxDQUE0QjtRQUMxQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3RDLGtCQUFhLEdBQWIsYUFBYSxDQUFjO1FBQzNCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNyQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBSXJFLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxD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