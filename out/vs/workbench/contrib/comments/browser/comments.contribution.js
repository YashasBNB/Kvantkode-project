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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50cy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQWlDLE1BQU0scUJBQXFCLENBQUE7QUFDcEcsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FDckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixVQUFVLEdBR1YsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixrQ0FBa0MsR0FFbEMsTUFBTSxtQkFBbUIsQ0FBQTtB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