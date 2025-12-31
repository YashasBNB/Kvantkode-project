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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { COMMENTS_VIEW_ID, CommentsMenus } from './commentsTreeViewer.js';
import { CONTEXT_KEY_COMMENT_FOCUSED } from './commentsView.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ICommentService } from './commentService.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { moveToNextCommentInThread as findNextCommentInThread, revealCommentThread, } from './commentsController.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { URI } from '../../../../base/common/uri.js';
export class CommentsAccessibleView extends Disposable {
    getProvider(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        const viewsService = accessor.get(IViewsService);
        const menuService = accessor.get(IMenuService);
        const commentsView = viewsService.getActiveViewWithId(COMMENTS_VIEW_ID);
        const focusedCommentNode = commentsView?.focusedCommentNode;
        if (!commentsView || !focusedCommentNode) {
            return;
        }
        const menus = this._register(new CommentsMenus(menuService));
        menus.setContextKeyService(contextKeyService);
        return new CommentsAccessibleContentProvider(commentsView, focusedCommentNode, menus);
    }
    constructor() {
        super();
        this.priority = 90;
        this.name = 'comment';
        this.when = CONTEXT_KEY_COMMENT_FOCUSED;
        this.type = "view" /* AccessibleViewType.View */;
    }
}
export class CommentThreadAccessibleView extends Disposable {
    getProvider(accessor) {
        const commentService = accessor.get(ICommentService);
        const editorService = accessor.get(IEditorService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const threads = commentService.commentsModel.hasCommentThreads();
        if (!threads) {
            return;
        }
        return new CommentsThreadWidgetAccessibleContentProvider(commentService, editorService, uriIdentityService);
    }
    constructor() {
        super();
        this.priority = 85;
        this.name = 'commentThread';
        this.when = CommentContextKeys.commentFocused;
        this.type = "view" /* AccessibleViewType.View */;
    }
}
class CommentsAccessibleContentProvider extends Disposable {
    constructor(_commentsView, _focusedCommentNode, _menus) {
        super();
        this._commentsView = _commentsView;
        this._focusedCommentNode = _focusedCommentNode;
        this._menus = _menus;
        this.id = "comments" /* AccessibleViewProviderId.Comments */;
        this.verbositySettingKey = "accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this.actions = [...this._menus.getResourceContextActions(this._focusedCommentNode)]
            .filter((i) => i.enabled)
            .map((action) => {
            return {
                ...action,
                run: () => {
                    this._commentsView.focus();
                    action.run({
                        thread: this._focusedCommentNode.thread,
                        $mid: 7 /* MarshalledId.CommentThread */,
                        commentControlHandle: this._focusedCommentNode.controllerHandle,
                        commentThreadHandle: this._focusedCommentNode.threadHandle,
                    });
                },
            };
        });
    }
    provideContent() {
        const commentNode = this._commentsView.focusedCommentNode;
        const content = this._commentsView.focusedCommentInfo?.toString();
        if (!commentNode || !content) {
            throw new Error('Comment tree is focused but no comment is selected');
        }
        return content;
    }
    onClose() {
        this._commentsView.focus();
    }
    provideNextContent() {
        this._commentsView.focusNextNode();
        return this.provideContent();
    }
    providePreviousContent() {
        this._commentsView.focusPreviousNode();
        return this.provideContent();
    }
}
let CommentsThreadWidgetAccessibleContentProvider = class CommentsThreadWidgetAccessibleContentProvider extends Disposable {
    constructor(_commentService, _editorService, _uriIdentityService) {
        super();
        this._commentService = _commentService;
        this._editorService = _editorService;
        this._uriIdentityService = _uriIdentityService;
        this.id = "commentThread" /* AccessibleViewProviderId.CommentThread */;
        this.verbositySettingKey = "accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
    }
    get activeCommentInfo() {
        if (!this._activeCommentInfo && this._commentService.lastActiveCommentcontroller) {
            this._activeCommentInfo = this._commentService.lastActiveCommentcontroller.activeComment;
        }
        return this._activeCommentInfo;
    }
    provideContent() {
        if (!this.activeCommentInfo) {
            throw new Error('No current comment thread');
        }
        const comment = this.activeCommentInfo.comment?.body;
        const commentLabel = typeof comment === 'string' ? comment : (comment?.value ?? '');
        const resource = this.activeCommentInfo.thread.resource;
        const range = this.activeCommentInfo.thread.range;
        let contentLabel = '';
        if (resource && range) {
            const editor = this._editorService.findEditors(URI.parse(resource)) || [];
            const codeEditor = this._editorService.activeEditorPane?.getControl();
            if (editor?.length && isCodeEditor(codeEditor)) {
                const content = codeEditor.getModel()?.getValueInRange(range);
                if (content) {
                    contentLabel = '\nCorresponding code: \n' + content;
                }
            }
        }
        return commentLabel + contentLabel;
    }
    onClose() {
        const lastComment = this._activeCommentInfo;
        this._activeCommentInfo = undefined;
        if (lastComment) {
            revealCommentThread(this._commentService, this._editorService, this._uriIdentityService, lastComment.thread, lastComment.comment);
        }
    }
    provideNextContent() {
        const newCommentInfo = findNextCommentInThread(this._activeCommentInfo, 'next');
        if (newCommentInfo) {
            this._activeCommentInfo = newCommentInfo;
            return this.provideContent();
        }
        return undefined;
    }
    providePreviousContent() {
        const newCommentInfo = findNextCommentInThread(this._activeCommentInfo, 'previous');
        if (newCommentInfo) {
            this._activeCommentInfo = newCommentInfo;
            return this.provideContent();
        }
        return undefined;
    }
};
CommentsThreadWidgetAccessibleContentProvider = __decorate([
    __param(0, ICommentService),
    __param(1, IEditorService),
    __param(2, IUriIdentityService)
], CommentsThreadWidgetAccessibleContentProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudHNBY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFTakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN6RSxPQUFPLEVBQWlCLDJCQUEyQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04seUJBQXlCLElBQUksdUJBQXVCLEVBQ3BELG1CQUFtQixHQUNuQixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBS3BELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO0lBS3JELFdBQVcsQ0FBQyxRQUEwQjtRQUNy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