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
import * as nls from '../../../../nls.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import './commentsEditorContribution.js';
import { ICommentService, CommentService } from './commentService.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions, } from '../../../common/contributions.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { COMMENTS_VIEW_ID } from './commentsTreeViewer.js';
import { CommentThreadState } from '../../../../editor/common/languages.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CONTEXT_KEY_HAS_COMMENTS, CONTEXT_KEY_SOME_COMMENTS_EXPANDED, } from './commentsView.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { revealCommentThread } from './commentsController.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown, } from '../../accessibility/browser/accessibilityConfiguration.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { CommentsAccessibleView, CommentThreadAccessibleView } from './commentsAccessibleView.js';
import { CommentsAccessibilityHelp } from './commentsAccessibility.js';
registerAction2(class Collapse extends ViewAction {
    constructor() {
        super({
            viewId: COMMENTS_VIEW_ID,
            id: 'comments.collapse',
            title: nls.localize('collapseAll', 'Collapse All'),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.and(ContextKeyExpr.equals('view', COMMENTS_VIEW_ID), CONTEXT_KEY_HAS_COMMENTS), CONTEXT_KEY_SOME_COMMENTS_EXPANDED),
                order: 100,
            },
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
registerAction2(class Expand extends ViewAction {
    constructor() {
        super({
            viewId: COMMENTS_VIEW_ID,
            id: 'comments.expand',
            title: nls.localize('expandAll', 'Expand All'),
            f1: false,
            icon: Codicon.expandAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.and(ContextKeyExpr.equals('view', COMMENTS_VIEW_ID), CONTEXT_KEY_HAS_COMMENTS), ContextKeyExpr.not(CONTEXT_KEY_SOME_COMMENTS_EXPANDED.key)),
                order: 100,
            },
        });
    }
    runInView(_accessor, view) {
        view.expandAll();
    }
});
registerAction2(class Reply extends Action2 {
    constructor() {
        super({
            id: 'comments.reply',
            title: nls.localize('reply', 'Reply'),
            icon: Codicon.reply,
            precondition: ContextKeyExpr.equals('canReply', true),
            menu: [
                {
                    id: MenuId.CommentsViewThreadActions,
                    order: 100,
                },
                {
                    id: MenuId.AccessibleView,
                    when: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "comments" /* AccessibleViewProviderId.Comments */)),
                },
            ],
        });
    }
    run(accessor, marshalledCommentThread) {
        const commentService = accessor.get(ICommentService);
        const editorService = accessor.get(IEditorService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        revealCommentThread(commentService, editorService, uriIdentityService, marshalledCommentThread.thread, marshalledCommentThread.thread.comments[marshalledCommentThread.thread.comments.length - 1], true);
    }
});
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'comments',
    order: 20,
    title: nls.localize('commentsConfigurationTitle', 'Comments'),
    type: 'object',
    properties: {
        'comments.openPanel': {
            enum: ['neverOpen', 'openOnSessionStart', 'openOnSessionStartWithComments'],
            default: 'openOnSessionStartWithComments',
            description: nls.localize('openComments', 'Controls when the comments panel should open.'),
            restricted: false,
            markdownDeprecationMessage: nls.localize('comments.openPanel.deprecated', 'This setting is deprecated in favor of `comments.openView`.'),
        },
        'comments.openView': {
            enum: ['never', 'file', 'firstFile', 'firstFileUnresolved'],
            enumDescriptions: [
                nls.localize('comments.openView.never', 'The comments view will never be opened.'),
                nls.localize('comments.openView.file', 'The comments view will open when a file with comments is active.'),
                nls.localize('comments.openView.firstFile', 'If the comments view has not been opened yet during this session it will open the first time during a session that a file with comments is active.'),
                nls.localize('comments.openView.firstFileUnresolved', 'If the comments view has not been opened yet during this session and the comment is not resolved, it will open the first time during a session that a file with comments is active.'),
            ],
            default: 'firstFile',
            description: nls.localize('comments.openView', 'Controls when the comments view should open.'),
            restricted: false,
        },
        'comments.useRelativeTime': {
            type: 'boolean',
            default: true,
            description: nls.localize('useRelativeTime', "Determines if relative time will be used in comment timestamps (ex. '1 day ago')."),
        },
        'comments.visible': {
            type: 'boolean',
            default: true,
            description: nls.localize('comments.visible', 'Controls the visibility of the comments bar and comment threads in editors that have commenting ranges and comments. Comments are still accessible via the Comments view and will cause commenting to be toggled on in the same way running the command "Comments: Toggle Editor Commenting" toggles comments.'),
        },
        'comments.maxHeight': {
            type: 'boolean',
            default: true,
            description: nls.localize('comments.maxHeight', 'Controls whether the comments widget scrolls or expands.'),
        },
        'comments.collapseOnResolve': {
            type: 'boolean',
            default: true,
            description: nls.localize('collapseOnResolve', 'Controls whether the comment thread should collapse when the thread is resolved.'),
        },
        'comments.thread.confirmOnCollapse': {
            type: 'string',
            enum: ['whenHasUnsubmittedComments', 'never'],
            enumDescriptions: [
                nls.localize('confirmOnCollapse.whenHasUnsubmittedComments', 'Show a confirmation dialog when collapsing a comment thread with unsubmitted comments.'),
                nls.localize('confirmOnCollapse.never', 'Never show a confirmation dialog when collapsing a comment thread.'),
            ],
            default: 'whenHasUnsubmittedComments',
            description: nls.localize('confirmOnCollapse', 'Controls whether a confirmation dialog is shown when collapsing a comment thread.'),
        },
    },
});
registerSingleton(ICommentService, CommentService, 1 /* InstantiationType.Delayed */);
let UnresolvedCommentsBadge = class UnresolvedCommentsBadge extends Disposable {
    constructor(_commentService, activityService) {
        super();
        this._commentService = _commentService;
        this.activityService = activityService;
        this.activity = this._register(new MutableDisposable());
        this.totalUnresolved = 0;
        this._register(this._commentService.onDidSetAllCommentThreads(this.onAllCommentsChanged, this));
        this._register(this._commentService.onDidUpdateCommentThreads(this.onCommentsUpdated, this));
    }
    onAllCommentsChanged(e) {
        let unresolved = 0;
        for (const thread of e.commentThreads) {
            if (thread.state === CommentThreadState.Unresolved) {
                unresolved++;
            }
        }
        this.updateBadge(unresolved);
    }
    onCommentsUpdated() {
        let unresolved = 0;
        for (const resource of this._commentService.commentsModel.resourceCommentThreads) {
            for (const thread of resource.commentThreads) {
                if (thread.threadState === CommentThreadState.Unresolved) {
                    unresolved++;
                }
            }
        }
        this.updateBadge(unresolved);
    }
    updateBadge(unresolved) {
        if (unresolved === this.totalUnresolved) {
            return;
        }
        this.totalUnresolved = unresolved;
        const message = nls.localize('totalUnresolvedComments', '{0} Unresolved Comments', this.totalUnresolved);
        this.activity.value = this.activityService.showViewActivity(COMMENTS_VIEW_ID, {
            badge: new NumberBadge(this.totalUnresolved, () => message),
        });
    }
};
UnresolvedCommentsBadge = __decorate([
    __param(0, ICommentService),
    __param(1, IActivityService)
], UnresolvedCommentsBadge);
export { UnresolvedCommentsBadge };
Registry.as(Extensions.Workbench).registerWorkbenchContribution(UnresolvedCommentsBadge, 4 /* LifecyclePhase.Eventually */);
AccessibleViewRegistry.register(new CommentsAccessibleView());
AccessibleViewRegistry.register(new CommentThreadAccessibleView());
AccessibleViewRegistry.register(new CommentsAccessibilityHelp());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBaUMsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRyxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUNyQyxNQUFNLG9FQUFvRSxDQUFBO0FBRTNFLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLFVBQVUsR0FHVixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGtDQUFrQyxHQUVsQyxNQUFNLG1CQUFtQixD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