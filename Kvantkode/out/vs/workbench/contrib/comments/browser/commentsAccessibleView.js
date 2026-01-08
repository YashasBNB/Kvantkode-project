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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c0FjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3pFLE9BQU8sRUFBaUIsMkJBQTJCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BFLE9BQU8sRUFDTix5QkFBeUIsSUFBSSx1QkFBdUIsRUFDcEQsbUJBQW1CLEdBQ25CLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFLcEQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7SUFLckQsV0FBVyxDQUFDLFFBQTBC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