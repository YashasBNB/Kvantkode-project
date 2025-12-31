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
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { CommentFormActions } from './commentFormActions.js';
import { ICommentService } from './commentService.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { MIN_EDITOR_HEIGHT, SimpleCommentEditor, calculateEditorHeight, } from './simpleCommentEditor.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { Position } from '../../../../editor/common/core/position.js';
let INMEM_MODEL_ID = 0;
export const COMMENTEDITOR_DECORATION_KEY = 'commenteditordecoration';
let CommentReply = class CommentReply extends Disposable {
    constructor(owner, container, _parentEditor, _commentThread, _scopedInstatiationService, _contextKeyService, _commentMenus, _commentOptions, _pendingComment, _parentThread, focus, _actionRunDelegate, commentService, configurationService, keybindingService, contextMenuService, hoverService, textModelService) {
        super();
        this.owner = owner;
        this._parentEditor = _parentEditor;
        this._commentThread = _commentThread;
        this._scopedInstatiationService = _scopedInstatiationService;
        this._contextKeyService = _contextKeyService;
        this._commentMenus = _commentMenus;
        this._commentOptions = _commentOptions;
        this._pendingComment = _pendingComment;
        this._parentThread = _parentThread;
        this._actionRunDelegate = _actionRunDelegate;
        this.commentService = commentService;
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.textModelService = textModelService;
        this._commentThreadDisposables = [];
        this._editorHeight = MIN_EDITOR_HEIGHT;
        this.form = dom.append(container, dom.$('.comment-form'));
        this.commentEditor = this._register(this._scopedInstatiationService.createInstance(SimpleCommentEditor, this.form, SimpleCommentEditor.getEditorOptions(configurationService), _contextKeyService, this._parentThread));
        this.commentEditorIsEmpty = CommentContextKeys.commentIsEmpty.bindTo(this._contextKeyService);
        this.commentEditorIsEmpty.set(!this._pendingComment);
        this.initialize(focus);
    }
    async initialize(focus) {
        const hasExistingComments = this._commentThread.comments && this._commentThread.comments.length > 0;
        const modeId = generateUuid() + '-' + (hasExistingComments ? this._commentThread.threadId : ++INMEM_MODEL_ID);
        const params = JSON.stringify({
            extensionId: this._commentThread.extensionId,
            commentThreadId: this._commentThread.threadId,
        });
        let resource = URI.from({
            scheme: Schemas.commentsInput,
            path: `/${this._commentThread.extensionId}/commentinput-${modeId}.md?${params}`, // TODO. Remove params once extensions adopt authority.
        });
        const commentController = this.commentService.getCommentController(this.owner);
        if (commentController) {
            resource = resource.with({ authority: commentController.id });
        }
        const model = await this.textModelService.createModelReference(resource);
        model.object.textEditorModel.setValue(this._pendingComment?.body || '');
        this._register(model);
        this.commentEditor.setModel(model.object.textEditorModel);
        if (this._pendingComment) {
            this.commentEditor.setPosition(this._pendingComment.cursor);
        }
        this.calculateEditorHeight();
        this._register(model.object.textEditorModel.onDidChangeContent(() => {
            this.setCommentEditorDecorations();
            this.commentEditorIsEmpty?.set(!this.commentEditor.getValue());
            if (this.calculateEditorHeight()) {
                this.commentEditor.layout({
                    height: this._editorHeight,
                    width: this.commentEditor.getLayoutInfo().width,
                });
                this.commentEditor.render(true);
            }
        }));
        this.createTextModelListener(this.commentEditor, this.form);
        this.setCommentEditorDecorations();
        // Only add the additional step of clicking a reply button to expand the textarea when there are existing comments
        if (this._pendingComment) {
            this.expandReplyArea();
        }
        else if (hasExistingComments) {
            this.createReplyButton(this.commentEditor, this.form);
        }
        else if (focus && this._commentThread.comments && this._commentThread.comments.length === 0) {
            this.expandReplyArea();
        }
        this._error = dom.append(this.form, dom.$('.validation-error.hidden'));
        const formActions = dom.append(this.form, dom.$('.form-actions'));
        this._formActions = dom.append(formActions, dom.$('.other-actions'));
        this.createCommentWidgetFormActions(this._formActions, model.object.textEditorModel);
        this._editorActions = dom.append(formActions, dom.$('.editor-actions'));
        this.createCommentWidgetEditorActions(this._editorActions, model.object.textEditorModel);
    }
    calculateEditorHeight() {
        const newEditorHeight = calculateEditorHeight(this._parentEditor, this.commentEditor, this._editorHeight);
        if (newEditorHeight !== this._editorHeight) {
            this._editorHeight = newEditorHeight;
            return true;
        }
        return false;
    }
    updateCommentThread(commentThread) {
        const isReplying = this.commentEditor.hasTextFocus();
        const oldAndNewBothEmpty = !this._commentThread.comments?.length && !commentThread.comments?.length;
        if (!this._reviewThreadReplyButton) {
            this.createReplyButton(this.commentEditor, this.form);
        }
        if (this._commentThread.comments &&
            this._commentThread.comments.length === 0 &&
            !oldAndNewBothEmpty) {
            this.expandReplyArea();
        }
        if (isReplying) {
            this.commentEditor.focus();
        }
    }
    getPendingComment() {
        const model = this.commentEditor.getModel();
        if (model && model.getValueLength() > 0) {
            // checking length is cheap
            return {
                body: model.getValue(),
                cursor: this.commentEditor.getPosition() ?? new Position(1, 1),
            };
        }
        return undefined;
    }
    setPendingComment(pending) {
        this._pendingComment = pending;
        this.expandReplyArea();
        this.commentEditor.setValue(pending.body);
        this.commentEditor.setPosition(pending.cursor);
    }
    layout(widthInPixel) {
        this.commentEditor.layout({
            height: this._editorHeight,
            width: widthInPixel - 54 /* margin 20px * 10 + scrollbar 14px*/,
        });
    }
    focusIfNeeded() {
        if (!this._commentThread.comments || !this._commentThread.comments.length) {
            this.commentEditor.focus();
        }
        else if ((this.commentEditor.getModel()?.getValueLength() ?? 0) > 0) {
            this.expandReplyArea();
        }
    }
    focusCommentEditor() {
        this.commentEditor.focus();
    }
    expandReplyAreaAndFocusCommentEditor() {
        this.expandReplyArea();
        this.commentEditor.focus();
    }
    isCommentEditorFocused() {
        return this.commentEditor.hasWidgetFocus();
    }
    updateCanReply() {
        if (!this._commentThread.canReply) {
            this.form.style.display = 'none';
        }
        else {
            this.form.style.display = 'block';
        }
    }
    async submitComment() {
        await this._commentFormActions?.triggerDefaultAction();
        this._pendingComment = undefined;
    }
    setCommentEditorDecorations() {
        const hasExistingComments = this._commentThread.comments && this._commentThread.comments.length > 0;
        const placeholder = hasExistingComments
            ? this._commentOptions?.placeHolder || nls.localize('reply', 'Reply...')
            : this._commentOptions?.placeHolder || nls.localize('newComment', 'Type a new comment');
        this.commentEditor.updateOptions({ placeholder });
    }
    createTextModelListener(commentEditor, commentForm) {
        this._commentThreadDisposables.push(commentEditor.onDidFocusEditorWidget(() => {
            this._commentThread.input = {
                uri: commentEditor.getModel().uri,
                value: commentEditor.getValue(),
            };
            this.commentService.setActiveEditingCommentThread(this._commentThread);
            this.commentService.setActiveCommentAndThread(this.owner, { thread: this._commentThread });
        }));
        this._commentThreadDisposables.push(commentEditor.getModel().onDidChangeContent(() => {
            const modelContent = commentEditor.getValue();
            if (this._commentThread.input &&
                this._commentThread.input.uri === commentEditor.getModel().uri &&
                this._commentThread.input.value !== modelContent) {
                const newInput = this._commentThread.input;
                newInput.value = modelContent;
                this._commentThread.input = newInput;
            }
            this.commentService.setActiveEditingCommentThread(this._commentThread);
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeInput((input) => {
            const thread = this._commentThread;
            const model = commentEditor.getModel();
            if (thread.input && model && thread.input.uri !== model.uri) {
                return;
            }
            if (!input) {
                return;
            }
            if (commentEditor.getValue() !== input.value) {
                commentEditor.setValue(input.value);
                if (input.value === '') {
                    this._pendingComment = { body: '', cursor: new Position(1, 1) };
                    commentForm.classList.remove('expand');
                    commentEditor.getDomNode().style.outline = '';
                    this._error.textContent = '';
                    this._error.classList.add('hidden');
                }
            }
        }));
    }
    /**
     * Command based actions.
     */
    createCommentWidgetFormActions(container, model) {
        const menu = this._commentMenus.getCommentThreadActions(this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(() => {
            this._commentFormActions.setActions(menu);
        }));
        this._commentFormActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, async (action) => {
            await this._actionRunDelegate?.();
            await action.run({
                thread: this._commentThread,
                text: this.commentEditor.getValue(),
                $mid: 9 /* MarshalledId.CommentThreadReply */,
            });
            this.hideReplyArea();
        });
        this._register(this._commentFormActions);
        this._commentFormActions.setActions(menu);
    }
    createCommentWidgetEditorActions(container, model) {
        const editorMenu = this._commentMenus.getCommentEditorActions(this._contextKeyService);
        this._register(editorMenu);
        this._register(editorMenu.onDidChange(() => {
            this._commentEditorActions.setActions(editorMenu, true);
        }));
        this._commentEditorActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, async (action) => {
            this._actionRunDelegate?.();
            action.run({
                thread: this._commentThread,
                text: this.commentEditor.getValue(),
                $mid: 9 /* MarshalledId.CommentThreadReply */,
            });
            this.focusCommentEditor();
        });
        this._register(this._commentEditorActions);
        this._commentEditorActions.setActions(editorMenu, true);
    }
    get isReplyExpanded() {
        return this.form.classList.contains('expand');
    }
    expandReplyArea() {
        if (!this.isReplyExpanded) {
            this.form.classList.add('expand');
            this.commentEditor.focus();
            this.commentEditor.layout();
        }
    }
    clearAndExpandReplyArea() {
        if (!this.isReplyExpanded) {
            this.commentEditor.setValue('');
            this.expandReplyArea();
        }
    }
    hideReplyArea() {
        const domNode = this.commentEditor.getDomNode();
        if (domNode) {
            domNode.style.outline = '';
        }
        this.commentEditor.setValue('');
        this._pendingComment = { body: '', cursor: new Position(1, 1) };
        this.form.classList.remove('expand');
        this._error.textContent = '';
        this._error.classList.add('hidden');
    }
    createReplyButton(commentEditor, commentForm) {
        this._reviewThreadReplyButton = (dom.append(commentForm, dom.$(`button.review-thread-reply-button.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`)));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this._reviewThreadReplyButton, this._commentOptions?.prompt || nls.localize('reply', 'Reply...')));
        this._reviewThreadReplyButton.textContent =
            this._commentOptions?.prompt || nls.localize('reply', 'Reply...');
        // bind click/escape actions for reviewThreadReplyButton and textArea
        this._register(dom.addDisposableListener(this._reviewThreadReplyButton, 'click', (_) => this.clearAndExpandReplyArea()));
        this._register(dom.addDisposableListener(this._reviewThreadReplyButton, 'focus', (_) => this.clearAndExpandReplyArea()));
        this._register(commentEditor.onDidBlurEditorWidget(() => {
            if (commentEditor.getModel().getValueLength() === 0 &&
                commentForm.classList.contains('expand')) {
                commentForm.classList.remove('expand');
            }
        }));
    }
    dispose() {
        super.dispose();
        dispose(this._commentThreadDisposables);
    }
};
CommentReply = __decorate([
    __param(12, ICommentService),
    __param(13, IConfigurationService),
    __param(14, IKeybindingService),
    __param(15, IContextMenuService),
    __param(16, IHoverService),
    __param(17, ITextModelService)
], CommentReply);
export { CommentReply };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFJlcGx5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50UmVwbHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUV6RyxPQUFPLEVBQUUsVUFBVSxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBSzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFNbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3BFLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLHFCQUFxQixHQUNyQixNQUFNLDBCQUEwQixDQUFB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