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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZEJvZHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRUaHJlYWRCb2R5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEtBQUssU0FBUyxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFakYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBSTlDLE9BQU8sRUFFTixnQkFBZ0IsR0FDaEIsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFLM0UsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBMEQsU0FBUSxVQUFVO0lBV3hGLElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzlFLENBQUM7SUFFRCxJQUFJ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