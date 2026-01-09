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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZEhlYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50VGhyZWFkSGVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFDTixVQUFVLEVBRVYsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFHN0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQU10RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBSTNFLE1BQU0sWUFBWSxHQUFH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