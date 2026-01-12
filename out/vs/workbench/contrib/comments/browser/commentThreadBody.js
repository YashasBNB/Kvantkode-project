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
import * as nls from '../../../../nls.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as languages from '../../../../editor/common/languages.js';
import { Emitter } from '../../../../base/common/event.js';
import { ICommentService } from './commentService.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { CommentNode } from './commentNode.js';
import { MarkdownRenderer, } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
let CommentThreadBody = class CommentThreadBody extends Disposable {
    get length() {
        return this._commentThread.comments ? this._commentThread.comments.length : 0;
    }
    get activeComment() {
        return this._commentElements.filter((node) => node.isEditing)[0];
    }
    constructor(_parentEditor, owner, parentResourceUri, container, _options, _commentThread, _pendingEdits, _scopedInstatiationService, _parentCommentThreadWidget, commentService, openerService, languageService) {
        super();
        this._parentEditor = _parentEditor;
        this.owner = owner;
        this.parentResourceUri = parentResourceUri;
        this.container = container;
        this._options = _options;
        this._commentThread = _commentThread;
        this._pendingEdits = _pendingEdits;
        this._scopedInstatiationService = _scopedInstatiationService;
        this._parentCommentThreadWidget = _parentCommentThreadWidget;
        this.commentService = commentService;
        this.openerService = openerService;
        this.languageService = languageService;
        this._commentElements = [];
        this._focusedComment = undefined;
        this._onDidResize = new Emitter();
        this.onDidResize = this._onDidResize.event;
        this._commentDisposable = new DisposableMap();
        this._register(dom.addDisposableListener(container, dom.EventType.FOCUS_IN, (e) => {
            // TODO @rebornix, limit T to IRange | ICellRange
            this.commentService.setActiveEditingCommentThread(this._commentThread);
        }));
        this._markdownRenderer = new MarkdownRenderer(this._options, this.languageService, this.openerService);
    }
    focus(commentUniqueId) {
        if (commentUniqueId !== undefined) {
            const comment = this._commentElements.find((commentNode) => commentNode.comment.uniqueIdInThread === commentUniqueId);
            if (comment) {
                comment.focus();
                return;
            }
        }
        this._commentsElement.focus();
    }
    hasCommentsInEditMode() {
        return this._commentElements.some((commentNode) => commentNode.isEditing);
    }
    ensureFocusIntoNewEditingComment() {
        if (this._commentElements.length === 1 && this._commentElements[0].isEditing) {
            this._commentElements[0].setFocus(true);
        }
    }
    async display() {
        this._commentsElement = dom.append(this.container, dom.$('div.comments-container'));
        this._commentsElement.setAttribute('role', 'presentation');
        this._commentsElement.tabIndex = 0;
        this._updateAriaLabel();
        this._register(dom.addDisposableListener(this._commentsElement, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if ((event.equals(16 /* KeyCode.UpArrow */) || event.equals(18 /* KeyCode.DownArrow */)) &&
                (!this._focusedComment || !this._commentElements[this._focusedComment].isEditing)) {
                const moveFocusWithinBounds = (change) => {
                    if (this._focusedComment === undefined && change >= 0) {
                        return 0;
                    }
                    if (this._focusedComment === undefined && change < 0) {
                        return this._commentElements.length - 1;
                    }
                    const newIndex = this._focusedComment + change;
                    return Math.min(Math.max(0, newIndex), this._commentElements.length - 1);
                };
                this._setFocusedComment(event.equals(16 /* KeyCode.UpArrow */) ? moveFocusWithinBounds(-1) : moveFocusWithinBounds(1));
            }
        }));
        this._commentDisposable.clearAndDisposeAll();
        this._commentElements = [];
        if (this._commentThread.comments) {
            for (const comment of this._commentThread.comments) {
                const newCommentNode = this.createNewCommentNode(comment);
                this._commentElements.push(newCommentNode);
                this._commentsElement.appendChild(newCommentNode.domNode);
                if (comment.mode === languages.CommentMode.Editing) {
                    await newCommentNode.switchToEditMode();
                }
            }
        }
        this._resizeObserver = new MutationObserver(this._refresh.bind(this));
        this._resizeObserver.observe(this.container, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true,
        });
    }
    _refresh() {
        const dimensions = dom.getClientArea(this.container);
        this._onDidResize.fire(dimensions);
    }
    getDimensions() {
        return dom.getClientArea(this.container);
    }
    layout(widthInPixel) {
        this._commentElements.forEach((element) => {
            element.layout(widthInPixel);
        });
    }
    getPendingEdits() {
        const pendingEdits = {};
        this._commentElements.forEach((element) => {
            if (element.isEditing) {
                const pendingEdit = element.getPendingEdit();
                if (pendingEdit) {
                    pendingEdits[element.comment.uniqueIdInThread] = pendingEdit;
                }
            }
        });
        return pendingEdits;
    }
    getCommentCoords(commentUniqueId) {
        const matchedNode = this._commentElements.filter((commentNode) => commentNode.comment.uniqueIdInThread === commentUniqueId);
        if (matchedNode && matchedNode.length) {
            const commentThreadCoords = dom.getDomNodePagePosition(this._commentElements[0].domNode);
            const commentCoords = dom.getDomNodePagePosition(matchedNode[0].domNode);
            return {
                thread: commentThreadCoords,
                comment: commentCoords,
            };
        }
        return;
    }
    async updateCommentThread(commentThread, preserveFocus) {
        const oldCommentsLen = this._commentElements.length;
        const newCommentsLen = commentThread.comments ? commentThread.comments.length : 0;
        const commentElementsToDel = [];
        const commentElementsToDelIndex = [];
        for (let i = 0; i < oldCommentsLen; i++) {
            const comment = this._commentElements[i].comment;
            const newComment = commentThread.comments
                ? commentThread.comments.filter((c) => c.uniqueIdInThread === comment.uniqueIdInThread)
                : [];
            if (newComment.length) {
                this._commentElements[i].update(newComment[0]);
            }
            else {
                commentElementsToDelIndex.push(i);
                commentElementsToDel.push(this._commentElements[i]);
            }
        }
        // del removed elements
        for (let i = commentElementsToDel.length - 1; i >= 0; i--) {
            const commentToDelete = commentElementsToDel[i];
            this._commentDisposable.deleteAndDispose(commentToDelete);
            this._commentElements.splice(commentElementsToDelIndex[i], 1);
            commentToDelete.domNode.remove();
        }
        let lastCommentElement = null;
        const newCommentNodeList = [];
        const newCommentsInEditMode = [];
        const startEditing = [];
        for (let i = newCommentsLen - 1; i >= 0; i--) {
            const currentComment = commentThread.comments[i];
            const oldCommentNode = this._commentElements.filter((commentNode) => commentNode.comment.uniqueIdInThread === currentComment.uniqueIdInThread);
            if (oldCommentNode.length) {
                lastCommentElement = oldCommentNode[0].domNode;
                newCommentNodeList.unshift(oldCommentNode[0]);
            }
            else {
                const newElement = this.createNewCommentNode(currentComment);
                newCommentNodeList.unshift(newElement);
                if (lastCommentElement) {
                    this._commentsElement.insertBefore(newElement.domNode, lastCommentElement);
                    lastCommentElement = newElement.domNode;
                }
                else {
                    this._commentsElement.appendChild(newElement.domNode);
                    lastCommentElement = newElement.domNode;
                }
                if (currentComment.mode === languages.CommentMode.Editing) {
                    startEditing.push(newElement.switchToEditMode());
                    newCommentsInEditMode.push(newElement);
                }
            }
        }
        this._commentThread = commentThread;
        this._commentElements = newCommentNodeList;
        // Start editing *after* updating the thread and elements to avoid a sequencing issue https://github.com/microsoft/vscode/issues/239191
        await Promise.all(startEditing);
        if (newCommentsInEditMode.length) {
            const lastIndex = this._commentElements.indexOf(newCommentsInEditMode[newCommentsInEditMode.length - 1]);
            this._focusedComment = lastIndex;
        }
        this._updateAriaLabel();
        if (!preserveFocus) {
            this._setFocusedComment(this._focusedComment);
        }
    }
    _updateAriaLabel() {
        if (this._commentThread.isDocumentCommentThread()) {
            if (this._commentThread.range) {
                this._commentsElement.ariaLabel = nls.localize('commentThreadAria.withRange', 'Comment thread with {0} comments on lines {1} through {2}. {3}.', this._commentThread.comments?.length, this._commentThread.range.startLineNumber, this._commentThread.range.endLineNumber, this._commentThread.label);
            }
            else {
                this._commentsElement.ariaLabel = nls.localize('commentThreadAria.document', 'Comment thread with {0} comments on the entire document. {1}.', this._commentThread.comments?.length, this._commentThread.label);
            }
        }
        else {
            this._commentsElement.ariaLabel = nls.localize('commentThreadAria', 'Comment thread with {0} comments. {1}.', this._commentThread.comments?.length, this._commentThread.label);
        }
    }
    _setFocusedComment(value) {
        if (this._focusedComment !== undefined) {
            this._commentElements[this._focusedComment]?.setFocus(false);
        }
        if (this._commentElements.length === 0 || value === undefined) {
            this._focusedComment = undefined;
        }
        else {
            this._focusedComment = Math.min(value, this._commentElements.length - 1);
            this._commentElements[this._focusedComment].setFocus(true);
        }
    }
    createNewCommentNode(comment) {
        const newCommentNode = this._scopedInstatiationService.createInstance(CommentNode, this._parentEditor, this._commentThread, comment, this._pendingEdits ? this._pendingEdits[comment.uniqueIdInThread] : undefined, this.owner, this.parentResourceUri, this._parentCommentThreadWidget, this._markdownRenderer);
        const disposables = new DisposableStore();
        disposables.add(newCommentNode.onDidClick((clickedNode) => this._setFocusedComment(this._commentElements.findIndex((commentNode) => commentNode.comment.uniqueIdInThread === clickedNode.comment.uniqueIdInThread))));
        disposables.add(newCommentNode);
        this._commentDisposable.set(newCommentNode, disposables);
        return newCommentNode;
    }
    dispose() {
        super.dispose();
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        this._commentDisposable.dispose();
    }
};
CommentThreadBody = __decorate([
    __param(9, ICommentService),
    __param(10, IOpenerService),
    __param(11, ILanguageService)
], CommentThreadBody);
export { CommentThreadBody };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZEJvZHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudFRocmVhZEJvZHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFJOUMsT0FBTyxFQUVOLGdCQUFnQixHQUNoQixNQUFNLGdGQUFnRixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUszRSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUEwRCxTQUFRLFVBQVU7SUFXeEYsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDOUUsQ0FBQztJQUVE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