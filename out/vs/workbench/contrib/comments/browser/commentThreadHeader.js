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
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action, ActionRunner } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import * as nls from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
const collapseIcon = registerIcon('review-comment-collapse', Codicon.chevronUp, nls.localize('collapseIcon', 'Icon to collapse a review comment.'));
const COLLAPSE_ACTION_CLASS = 'expand-review-action ' + ThemeIcon.asClassName(collapseIcon);
const DELETE_ACTION_CLASS = 'expand-review-action ' + ThemeIcon.asClassName(Codicon.trashcan);
function threadHasComments(comments) {
    return !!comments && comments.length > 0;
}
let CommentThreadHeader = class CommentThreadHeader extends Disposable {
    constructor(container, _delegate, _commentMenus, _commentThread, _contextKeyService, _instantiationService, _contextMenuService) {
        super();
        this._delegate = _delegate;
        this._commentMenus = _commentMenus;
        this._commentThread = _commentThread;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._headElement = dom.$('.head');
        container.appendChild(this._headElement);
        this._register(toDisposable(() => this._headElement.remove()));
        this._fillHead();
    }
    _fillHead() {
        const titleElement = dom.append(this._headElement, dom.$('.review-title'));
        this._headingLabel = dom.append(titleElement, dom.$('span.filename'));
        this.createThreadLabel();
        const actionsContainer = dom.append(this._headElement, dom.$('.review-actions'));
        this._actionbarWidget = new ActionBar(actionsContainer, {
            actionViewItemProvider: createActionViewItem.bind(undefined, this._instantiationService),
        });
        this._register(this._actionbarWidget);
        const collapseClass = threadHasComments(this._commentThread.comments)
            ? COLLAPSE_ACTION_CLASS
            : DELETE_ACTION_CLASS;
        this._collapseAction = new Action("workbench.action.hideComment" /* CommentCommandId.Hide */, nls.localize('label.collapse', 'Collapse'), collapseClass, true, () => this._delegate.collapse());
        if (!threadHasComments(this._commentThread.comments)) {
            const commentsChanged = this._register(new MutableDisposable());
            commentsChanged.value = this._commentThread.onDidChangeComments(() => {
                if (threadHasComments(this._commentThread.comments)) {
                    this._collapseAction.class = COLLAPSE_ACTION_CLASS;
                    commentsChanged.clear();
                }
            });
        }
        const menu = this._commentMenus.getCommentThreadTitleActions(this._contextKeyService);
        this._register(menu);
        this.setActionBarActions(menu);
        this._register(menu);
        this._register(menu.onDidChange((e) => {
            this.setActionBarActions(menu);
        }));
        this._register(dom.addDisposableListener(this._headElement, dom.EventType.CONTEXT_MENU, (e) => {
            return this.onContextMenu(e);
        }));
        this._actionbarWidget.context = this._commentThread;
    }
    setActionBarActions(menu) {
        const groups = menu
            .getActions({ shouldForwardArgs: true })
            .reduce((r, [, actions]) => [...r, ...actions], []);
        this._actionbarWidget.clear();
        this._actionbarWidget.push([...groups, this._collapseAction], { label: false, icon: true });
    }
    updateCommentThread(commentThread) {
        this._commentThread = commentThread;
        this._actionbarWidget.context = this._commentThread;
        this.createThreadLabel();
    }
    createThreadLabel() {
        let label;
        label = this._commentThread.label;
        if (label === undefined) {
            if (!(this._commentThread.comments && this._commentThread.comments.length)) {
                label = nls.localize('startThread', 'Start discussion');
            }
        }
        if (label) {
            this._headingLabel.textContent = strings.escape(label);
            this._headingLabel.setAttribute('aria-label', label);
        }
    }
    updateHeight(headHeight) {
        this._headElement.style.height = `${headHeight}px`;
        this._headElement.style.lineHeight = this._headElement.style.height;
    }
    onContextMenu(e) {
        const actions = this._commentMenus.getCommentThreadTitleContextActions(this._contextKeyService);
        if (!actions.length) {
            return;
        }
        const event = new StandardMouseEvent(dom.getWindow(this._headElement), e);
        if (!this._contextMenuActionRunner) {
            this._contextMenuActionRunner = this._register(new ActionRunner());
        }
        this._contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => actions,
            actionRunner: this._contextMenuActionRunner,
            getActionsContext: () => {
                return {
                    commentControlHandle: this._commentThread.controllerHandle,
                    commentThreadHandle: this._commentThread.commentThreadHandle,
                    $mid: 7 /* MarshalledId.CommentThread */,
                };
            },
        });
    }
};
CommentThreadHeader = __decorate([
    __param(4, IContextKeyService),
    __param(5, IInstantiationService),
    __param(6, IContextMenuService)
], CommentThreadHeader);
export { CommentThreadHeader };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZEhlYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudFRocmVhZEhlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sVUFBVSxFQUVWLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRzdELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFNdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUkzRSxNQUFNLFlBQVksR0FBRyxZQUFZLENBQ2hDLHlCQUF5QixFQUN6QixPQUFPLENBQUMsU0FBUyxFQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUNsRSxDQUFBO0FBQ0QsTUFBTSxxQkFBcUIsR0FBRyx1QkFBdUIsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQzNGLE1BQU0sbUJBQW1CLEdBQUcsdUJBQXVCLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7QUFFN0YsU0FBUyxpQkFBaUIsQ0FDekIsUUFBc0Q7SUFFdEQsT0FBTyxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3pDLENBQUM7QUFFTSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFnQyxTQUFRLFVBQVU7SUFPOUQsWUFDQyxTQUFzQixFQUNkLFNBQW1DLEVBQ25DLGFBQTJCLEVBQzNCLGNBQTBDLEVBQ2Isa0JBQXNDLEVBQ25DLHFCQUE0QyxFQUM5QyxtQkFBd0M7UUFFOUUsS0FBSyxFQUFFLENBQUE7UUFQQyxjQUFTLEdBQVQsU0FBUyxDQUEwQjtRQUNuQyxrQkFBYSxHQUFiLGFBQWEsQ0FBYztRQUMzQixtQkFBYyxHQUFkLGNBQWMsQ0FBNEI7UUFDYix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ25DLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDOUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUc5RSxJQUFJLENBQUMsWUFBWSxHQUFtQixHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2xELFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0lBRVMsU0FBUztRQUNsQixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBRTFFLElBQUksQ0FBQyxhQUFhLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRXhCLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtZQUN2RCxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztTQUN4RixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXJDLE1BQU0sYUFBYSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDO1lBQ3BFLENBQUMsQ0FBQyxxQkFBcUI7WUFDdkIsQ0FBQyxDQUFDLG1CQUFtQixDQUFBO1FBQ3RCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxNQUFNLDZEQUVoQyxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxFQUMxQyxhQUFhLEVBQ2IsSUFBSSxFQUNKLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQy9CLENBQUE7UUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sZUFBZSxHQUFtQyxJQUFJLENBQUMsU0FBUyxDQUNyRSxJQUFJLGlCQUFpQixFQUFFLENBQ3ZCLENBQUE7WUFDRCxlQUFlLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFO2dCQUNwRSxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDckQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEdBQUcscUJBQXFCLENBQUE7b0JBQ2xELGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDeEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDckYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0QixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM5RSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUNwRCxDQUFDO0lBRU8sbUJBQW1CLENBQUMsSUFBVztRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJO2FBQ2pCLFVBQVUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDO2FBQ3ZDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBMEMsRUFBRSxDQUFDLENBQUE7UUFDNUYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzVGLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxhQUF5QztRQUM1RCxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQTtRQUVuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUE7UUFDbkQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixJQUFJLEtBQXlCLENBQUE7UUFDN0IsS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO1FBRWpDLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzVFLEtBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3hELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JELENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWSxDQUFDLFVBQWtCO1FBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLFVBQVUsSUFBSSxDQUFBO1FBQ2xELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUE7SUFDcEUsQ0FBQztJQUVPLGFBQWEsQ0FBQyxDQUFhO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsbUNBQW1DLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDL0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQztZQUN4QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztZQUN0QixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTztZQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLHdCQUF3QjtZQUMzQyxpQkFBaUIsRUFBRSxHQUE0QixFQUFFO2dCQUNoRCxPQUFPO29CQUNOLG9CQUFvQixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO29CQUMxRCxtQkFBbUIsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQjtvQkFDNUQsSUFBSSxvQ0FBNEI7aUJBQ2hDLENBQUE7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUE7QUF4SVksbUJBQW1CO0lBWTdCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0dBZFQsbUJBQW1CLENBd0kvQiJ9