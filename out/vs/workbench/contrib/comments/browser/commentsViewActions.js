/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../base/common/event.js';
import { CommentsViewFilterFocusContextKey } from './comments.js';
import { MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { COMMENTS_VIEW_ID } from './commentsTreeViewer.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { viewFilterSubmenu } from '../../../browser/parts/views/viewFilter.js';
import { Codicon } from '../../../../base/common/codicons.js';
export var CommentsSortOrder;
(function (CommentsSortOrder) {
    CommentsSortOrder["ResourceAscending"] = "resourceAscending";
    CommentsSortOrder["UpdatedAtDescending"] = "updatedAtDescending";
})(CommentsSortOrder || (CommentsSortOrder = {}));
const CONTEXT_KEY_SHOW_RESOLVED = new RawContextKey('commentsView.showResolvedFilter', true);
const CONTEXT_KEY_SHOW_UNRESOLVED = new RawContextKey('commentsView.showUnResolvedFilter', true);
const CONTEXT_KEY_SORT_BY = new RawContextKey('commentsView.sortBy', "resourceAscending" /* CommentsSortOrder.ResourceAscending */);
export class CommentsFilters extends Disposable {
    constructor(options, contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._showUnresolved = CONTEXT_KEY_SHOW_UNRESOLVED.bindTo(this.contextKeyService);
        this._showResolved = CONTEXT_KEY_SHOW_RESOLVED.bindTo(this.contextKeyService);
        this._sortBy = CONTEXT_KEY_SORT_BY.bindTo(this.contextKeyService);
        this._showResolved.set(options.showResolved);
        this._showUnresolved.set(options.showUnresolved);
        this._sortBy.set(options.sortBy);
    }
    get showUnresolved() {
        return !!this._showUnresolved.get();
    }
    set showUnresolved(showUnresolved) {
        if (this._showUnresolved.get() !== showUnresolved) {
            this._showUnresolved.set(showUnresolved);
            this._onDidChange.fire({ showUnresolved: true });
        }
    }
    get showResolved() {
        return !!this._showResolved.get();
    }
    set showResolved(showResolved) {
        if (this._showResolved.get() !== showResolved) {
            this._showResolved.set(showResolved);
            this._onDidChange.fire({ showResolved: true });
        }
    }
    get sortBy() {
        return this._sortBy.get() ?? "resourceAscending" /* CommentsSortOrder.ResourceAscending */;
    }
    set sortBy(sortBy) {
        if (this._sortBy.get() !== sortBy) {
            this._sortBy.set(sortBy);
            this._onDidChange.fire({ sortBy });
        }
    }
}
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'commentsFocusViewFromFilter',
            title: localize('focusCommentsList', 'Focus Comments view'),
            keybinding: {
                when: CommentsViewFilterFocusContextKey,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            },
            viewId: COMMENTS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, commentsView) {
        commentsView.focus();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'commentsClearFilterText',
            title: localize('commentsClearFilterText', 'Clear filter text'),
            keybinding: {
                when: CommentsViewFilterFocusContextKey,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 9 /* KeyCode.Escape */,
            },
            viewId: COMMENTS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, commentsView) {
        commentsView.clearFilterText();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'commentsFocusFilter',
            title: localize('focusCommentsFilter', 'Focus comments filter'),
            keybinding: {
                when: FocusedViewContext.isEqualTo(COMMENTS_VIEW_ID),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
            },
            viewId: COMMENTS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, commentsView) {
        commentsView.focusFilter();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${COMMENTS_VIEW_ID}.toggleUnResolvedComments`,
            title: localize('toggle unresolved', 'Show Unresolved'),
            category: localize('comments', 'Comments'),
            toggled: {
                condition: CONTEXT_KEY_SHOW_UNRESOLVED,
                title: localize('unresolved', 'Show Unresolved'),
            },
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', COMMENTS_VIEW_ID),
                order: 1,
            },
            viewId: COMMENTS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showUnresolved = !view.filters.showUnresolved;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${COMMENTS_VIEW_ID}.toggleResolvedComments`,
            title: localize('toggle resolved', 'Show Resolved'),
            category: localize('comments', 'Comments'),
            toggled: {
                condition: CONTEXT_KEY_SHOW_RESOLVED,
                title: localize('resolved', 'Show Resolved'),
            },
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', COMMENTS_VIEW_ID),
                order: 1,
            },
            viewId: COMMENTS_VIEW_ID,
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showResolved = !view.filters.showResolved;
    }
});
const commentSortSubmenu = new MenuId('submenu.filter.commentSort');
MenuRegistry.appendMenuItem(viewFilterSubmenu, {
    submenu: commentSortSubmenu,
    title: localize('comment sorts', 'Sort By'),
    group: '2_sort',
    icon: Codicon.history,
    when: ContextKeyExpr.equals('view', COMMENTS_VIEW_ID),
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${COMMENTS_VIEW_ID}.toggleSortByUpdatedAt`,
            title: localize('toggle sorting by updated at', 'Updated Time'),
            category: localize('comments', 'Comments'),
            icon: Codicon.history,
            viewId: COMMENTS_VIEW_ID,
            toggled: {
                condition: ContextKeyExpr.equals(CONTEXT_KEY_SORT_BY.key, "updatedAtDescending" /* CommentsSortOrder.UpdatedAtDescending */),
                title: localize('sorting by updated at', 'Updated Time'),
            },
            menu: {
                id: commentSortSubmenu,
                group: 'navigation',
                order: 1,
                isHiddenByDefault: false,
            },
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.sortBy = "updatedAtDescending" /* CommentsSortOrder.UpdatedAtDescending */;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${COMMENTS_VIEW_ID}.toggleSortByResource`,
            title: localize('toggle sorting by resource', 'Position in File'),
            category: localize('comments', 'Comments'),
            icon: Codicon.history,
            viewId: COMMENTS_VIEW_ID,
            toggled: {
                condition: ContextKeyExpr.equals(CONTEXT_KEY_SORT_BY.key, "resourceAscending" /* CommentsSortOrder.ResourceAscending */),
                title: localize('sorting by position in file', 'Position in File'),
            },
            menu: {
                id: commentSortSubmenu,
                group: 'navigation',
                order: 0,
                isHiddenByDefault: false,
            },
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.sortBy = "resourceAscending" /* CommentsSortOrder.ResourceAscending */;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNWaWV3QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudHNWaWV3QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFDTixjQUFjLEVBR2QsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBaUIsTUFBTSxlQUFlLENBQUE7QUFDaEYsT0FBTyxFQUNOLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzFELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxNQUFNLENBQU4sSUFBa0IsaUJBR2pCO0FBSEQsV0FBa0IsaUJBQWlCO0lBQ2xDLDREQUF1QyxDQUFBO0lBQ3ZDLGdFQUEyQyxDQUFBO0FBQzVDLENBQUMsRUFIaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUdsQztBQUVELE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQ2xELGlDQUFpQyxF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