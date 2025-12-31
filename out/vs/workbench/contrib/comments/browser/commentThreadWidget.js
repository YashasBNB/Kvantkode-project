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
import './media/review.css';
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import * as languages from '../../../../editor/common/languages.js';
import { CommentReply } from './commentReply.js';
import { ICommentService } from './commentService.js';
import { CommentThreadBody } from './commentThreadBody.js';
import { CommentThreadHeader } from './commentThreadHeader.js';
import { CommentThreadAdditionalActions } from './commentThreadAdditionalActions.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { contrastBorder, focusBorder, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, textBlockQuoteBackground, textBlockQuoteBorder, textLinkActiveForeground, textLinkForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { PANEL_BORDER } from '../../../common/theme.js';
import { Range } from '../../../../editor/common/core/range.js';
import { commentThreadStateBackgroundColorVar, commentThreadStateColorVar, } from './commentColors.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
import { localize } from '../../../../nls.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
export const COMMENTEDITOR_DECORATION_KEY = 'commenteditordecoration';
let CommentThreadWidget = class CommentThreadWidget extends Disposable {
    get commentThread() {
        return this._commentThread;
    }
    constructor(container, _parentEditor, _owner, _parentResourceUri, _contextKeyService, _scopedInstantiationService, _commentThread, _pendingComment, _pendingEdits, _markdownOptions, _commentOptions, _containerDelegate, commentService, configurationService, _keybindingService) {
        super();
        this.container = container;
        this._parentEditor = _parentEditor;
        this._owner = _owner;
        this._parentResourceUri = _parentResourceUri;
        this._contextKeyService = _contextKeyService;
        this._scopedInstantiationService = _scopedInstantiationService;
        this._commentThread = _commentThread;
        this._pendingComment = _pendingComment;
        this._pendingEdits = _pendingEdits;
        this._markdownOptions = _markdownOptions;
        this._commentOptions = _commentOptions;
        this._containerDelegate = _containerDelegate;
        this.commentService = commentService;
        this.configurationService = configurationService;
        this._keybindingService = _keybindingService;
        this._commentThreadDisposables = [];
        this._onDidResize = new Emitter();
        this.onDidResize = this._onDidResize.event;
        this._threadIsEmpty = CommentContextKeys.commentThreadIsEmpty.bindTo(this._contextKeyService);
        this._threadIsEmpty.set(!_commentThread.comments || !_commentThread.comments.length);
        this._focusedContextKey = CommentContextKeys.commentFocused.bindTo(this._contextKeyService);
        this._commentMenus = this.commentService.getCommentMenus(this._owner);
        this._register((this._header = this._scopedInstantiationService.createInstance(CommentThreadHeader, container, {
            collapse: this._containerDelegate.collapse.bind(this),
        }, this._commentMenus, this._commentThread)));
        this._header.updateCommentThread(this._commentThread);
        const bodyElement = dom.$('.body');
        container.appendChild(bodyElement);
        this._register(toDisposable(() => bodyElement.remove()));
        const tracker = this._register(dom.trackFocus(bodyElement));
        this._register(registerNavigableContainer({
            name: 'commentThreadWidget',
            focusNotifiers: [tracker],
            focusNextWidget: () => {
                if (!this._commentReply?.isCommentEditorFocused()) {
                    this._commentReply?.expandReplyAreaAndFocusCommentEditor();
                }
            },
            focusPreviousWidget: () => {
                if (this._commentReply?.isCommentEditorFocused() &&
                    this._commentThread.comments?.length) {
                    this._body.focus();
                }
            },
        }));
        this._register(tracker.onDidFocus(() => this._focusedContextKey.set(true)));
        this._register(tracker.onDidBlur(() => this._focusedContextKey.reset()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */)) {
                this._setAriaLabel();
            }
        }));
        this._body = this._scopedInstantiationService.createInstance(CommentThreadBody, this._parentEditor, this._owner, this._parentResourceUri, bodyElement, this._markdownOptions, this._commentThread, this._pendingEdits, this._scopedInstantiationService, this);
        this._register(this._body);
        this._setAriaLabel();
        this._styleElement = domStylesheets.createStyleSheet(this.container);
        this._commentThreadContextValue = CommentContextKeys.commentThreadContext.bindTo(this._contextKeyService);
        this._commentThreadContextValue.set(_commentThread.contextValue);
        const commentControllerKey = CommentContextKeys.commentControllerContext.bindTo(this._contextKeyService);
        const controller = this.commentService.getCommentController(this._owner);
        if (controller?.contextValue) {
            commentControllerKey.set(controller.contextValue);
        }
        this.currentThreadListeners();
    }
    get hasUnsubmittedComments() {
        return !!this._commentReply?.commentEditor.getValue() || this._body.hasCommentsInEditMode();
    }
    _setAriaLabel() {
        let ariaLabel = localize('commentLabel', 'Comment');
        let keybinding;
        const verbose = this.configurationService.getValue("accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */);
        if (verbose) {
            keybinding =
                this._keybindingService
                    .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */, this._contextKeyService)
                    ?.getLabel() ?? undefined;
        }
        if (keybinding) {
            ariaLabel = localize('commentLabelWithKeybinding', '{0}, use ({1}) for accessibility help', ariaLabel, keybinding);
        }
        else if (verbose) {
            ariaLabel = localize('commentLabelWithKeybindingNoKeybinding', '{0}, run the command Open Accessibility Help which is currently not triggerable via keybinding.', ariaLabel);
        }
        this._body.container.ariaLabel = ariaLabel;
    }
    updateCurrentThread(hasMouse, hasFocus) {
        if (hasMouse || hasFocus) {
            this.commentService.setCurrentCommentThread(this.commentThread);
        }
        else {
            this.commentService.setCurrentCommentThread(undefined);
        }
    }
    currentThreadListeners() {
        let hasMouse = false;
        let hasFocus = false;
        this._register(dom.addDisposableListener(this.container, dom.EventType.MOUSE_ENTER, (e) => {
            if (e.toElement === this.container) {
                hasMouse = true;
                this.updateCurrentThread(hasMouse, hasFocus);
            }
        }, true));
        this._register(dom.addDisposableListener(this.container, dom.EventType.MOUSE_LEAVE, (e) => {
            if (e.fromElement === this.container) {
                hasMouse = false;
                this.updateCurrentThread(hasMouse, hasFocus);
            }
        }, true));
        this._register(dom.addDisposableListener(this.container, dom.EventType.FOCUS_IN, () => {
            hasFocus = true;
            this.updateCurrentThread(hasMouse, hasFocus);
        }, true));
        this._register(dom.addDisposableListener(this.container, dom.EventType.FOCUS_OUT, () => {
            hasFocus = false;
            this.updateCurrentThread(hasMouse, hasFocus);
        }, true));
    }
    async updateCommentThread(commentThread) {
        const shouldCollapse = this._commentThread.collapsibleState === languages.CommentThreadCollapsibleState.Expanded &&
            this._commentThreadState === languages.CommentThreadState.Unresolved &&
            commentThread.state === languages.CommentThreadState.Resolved;
        this._commentThreadState = commentThread.state;
        this._commentThread = commentThread;
        dispose(this._commentThreadDisposables);
        this._commentThreadDisposables = [];
        this._bindCommentThreadListeners();
        await this._body.updateCommentThread(commentThread, this._commentReply?.isCommentEditorFocused() ?? false);
        this._threadIsEmpty.set(!this._body.length);
        this._header.updateCommentThread(commentThread);
        this._commentReply?.updateCommentThread(commentThread);
        if (this._commentThread.contextValue) {
            this._commentThreadContextValue.set(this._commentThread.contextValue);
        }
        else {
            this._commentThreadContextValue.reset();
        }
        if (shouldCollapse &&
            this.configurationService.getValue(COMMENTS_SECTION).collapseOnResolve) {
            this.collapse();
        }
    }
    async display(lineHeight, focus) {
        const headHeight = Math.max(23, Math.ceil(lineHeight * 1.2)); // 23 is the value of `Math.ceil(lineHeight * 1.2)` with the default editor font size
        this._header.updateHeight(headHeight);
        await this._body.display();
        // create comment thread only when it supports reply
        if (this._commentThread.canReply) {
            this._createCommentForm(focus);
        }
        this._createAdditionalActions();
        this._register(this._body.onDidResize((dimension) => {
            this._refresh(dimension);
        }));
        // If there are no existing comments, place focus on the text area. This must be done after show, which also moves focus.
        // if this._commentThread.comments is undefined, it doesn't finish initialization yet, so we don't focus the editor immediately.
        if (this._commentThread.canReply && this._commentReply) {
            this._commentReply.focusIfNeeded();
        }
        this._bindCommentThreadListeners();
    }
    _refresh(dimension) {
        this._body.layout();
        this._onDidResize.fire(dimension);
    }
    dispose() {
        super.dispose();
        dispose(this._commentThreadDisposables);
        this.updateCurrentThread(false, false);
    }
    _bindCommentThreadListeners() {
        this._commentThreadDisposables.push(this._commentThread.onDidChangeCanReply(() => {
            if (this._commentReply) {
                this._commentReply.updateCanReply();
            }
            else {
                if (this._commentThread.canReply) {
                    this._createCommentForm(false);
                }
            }
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeComments(async (_) => {
            await this.updateCommentThread(this._commentThread);
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeLabel((_) => {
            this._header.createThreadLabel();
        }));
    }
    _createCommentForm(focus) {
        this._commentReply = this._scopedInstantiationService.createInstance(CommentReply, this._owner, this._body.container, this._parentEditor, this._commentThread, this._scopedInstantiationService, this._contextKeyService, this._commentMenus, this._commentOptions, this._pendingComment, this, focus, this._containerDelegate.actionRunner);
        this._register(this._commentReply);
    }
    _createAdditionalActions() {
        this._additionalActions = this._scopedInstantiationService.createInstance(CommentThreadAdditionalActions, this._body.container, this._commentThread, this._contextKeyService, this._commentMenus, this._containerDelegate.actionRunner);
        this._register(this._additionalActions);
    }
    getCommentCoords(commentUniqueId) {
        return this._body.getCommentCoords(commentUniqueId);
    }
    getPendingEdits() {
        return this._body.getPendingEdits();
    }
    getPendingComment() {
        if (this._commentReply) {
            return this._commentReply.getPendingComment();
        }
        return undefined;
    }
    setPendingComment(pending) {
        this._pendingComment = pending;
        this._commentReply?.setPendingComment(pending);
    }
    getDimensions() {
        return this._body.getDimensions();
    }
    layout(widthInPixel) {
        this._body.layout(widthInPixel);
        if (widthInPixel !== undefined) {
            this._commentReply?.layout(widthInPixel);
        }
    }
    ensureFocusIntoNewEditingComment() {
        this._body.ensureFocusIntoNewEditingComment();
    }
    focusCommentEditor() {
        this._commentReply?.expandReplyAreaAndFocusCommentEditor();
    }
    focus(commentUniqueId) {
        this._body.focus(commentUniqueId);
    }
    async submitComment() {
        const activeComment = this._body.activeComment;
        if (activeComment) {
            return activeComment.submitComment();
        }
        else if ((this._commentReply?.getPendingComment()?.body.length ?? 0) > 0) {
            return this._commentReply?.submitComment();
        }
    }
    async collapse() {
        if ((await this._containerDelegate.collapse()) &&
            Range.isIRange(this.commentThread.range) &&
            isCodeEditor(this._parentEditor)) {
            this._parentEditor.setSelection(this.commentThread.range);
        }
    }
    applyTheme(theme, fontInfo) {
        const content = [];
        content.push(`.monaco-editor .review-widget > .body { border-top: 1px solid var(${commentThreadStateColorVar}) }`);
        content.push(`.monaco-editor .review-widget > .head { background-color: var(${commentThreadStateBackgroundColorVar}) }`);
        const linkColor = theme.getColor(textLinkForeground);
        if (linkColor) {
            content.push(`.review-widget .body .comment-body a { color: ${linkColor} }`);
        }
        const linkActiveColor = theme.getColor(textLinkActiveForeground);
        if (linkActiveColor) {
            content.push(`.review-widget .body .comment-body a:hover, a:active { color: ${linkActiveColor} }`);
        }
        const focusColor = theme.getColor(focusBorder);
        if (focusColor) {
            content.push(`.review-widget .body .comment-body a:focus { outline: 1px solid ${focusColor}; }`);
            content.push(`.review-widget .body .monaco-editor.focused { outline: 1px solid ${focusColor}; }`);
        }
        const blockQuoteBackground = theme.getColor(textBlockQuoteBackground);
        if (blockQuoteBackground) {
            content.push(`.review-widget .body .review-comment blockquote { background: ${blockQuoteBackground}; }`);
        }
        const blockQuoteBOrder = theme.getColor(textBlockQuoteBorder);
        if (blockQuoteBOrder) {
            content.push(`.review-widget .body .review-comment blockquote { border-color: ${blockQuoteBOrder}; }`);
        }
        const border = theme.getColor(PANEL_BORDER);
        if (border) {
            content.push(`.review-widget .body .review-comment .review-comment-contents .comment-reactions .action-item a.action-label { border-color: ${border}; }`);
        }
        const hcBorder = theme.getColor(contrastBorder);
        if (hcBorder) {
            content.push(`.review-widget .body .comment-form .review-thread-reply-button { outline-color: ${hcBorder}; }`);
            content.push(`.review-widget .body .monaco-editor { outline: 1px solid ${hcBorder}; }`);
        }
        const errorBorder = theme.getColor(inputValidationErrorBorder);
        if (errorBorder) {
            content.push(`.review-widget .validation-error { border: 1px solid ${errorBorder}; }`);
        }
        const errorBackground = theme.getColor(inputValidationErrorBackground);
        if (errorBackground) {
            content.push(`.review-widget .validation-error { background: ${errorBackground}; }`);
        }
        const errorForeground = theme.getColor(inputValidationErrorForeground);
        if (errorForeground) {
            content.push(`.review-widget .body .comment-form .validation-error { color: ${errorForeground}; }`);
        }
        const fontFamilyVar = '--comment-thread-editor-font-family';
        const fontSizeVar = '--comment-thread-editor-font-size';
        const fontWeightVar = '--comment-thread-editor-font-weight';
        this.container?.style.setProperty(fontFamilyVar, fontInfo.fontFamily);
        this.container?.style.setProperty(fontSizeVar, `${fontInfo.fontSize}px`);
        this.container?.style.setProperty(fontWeightVar, fontInfo.fontWeight);
        content.push(`.review-widget .body code {
			font-family: var(${fontFamilyVar});
			font-weight: var(${fontWeightVar});
		}`);
        this._styleElement.textContent = content.join('\n');
        this._commentReply?.setCommentEditorDecorations();
    }
};
CommentThreadWidget = __decorate([
    __param(12, ICommentService),
    __param(13, IConfigurationService),
    __param(14, IKeybindingService)
], CommentThreadWidget);
export { CommentThreadWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudFRocmVhZFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLGNBQWMsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUNOLFVBQVUsRUFDVixPQUFPLEVBRVAsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxLQUFLLFNBQVMsTUFBTSx3Q0FBd0MsQ0FBQTtBQVFuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3BFLE9BQU8sRUFDTixjQUFjLEVBQ2QsV0FBVyxFQUNYLDhCQUE4QixFQUM5QiwwQkFBMEIsRUFDMUIsOEJBQThCLEVBQzlCLHdCQUF3QixFQUN4QixvQkFBb0IsRUFDcEIsd0JBQXdCLEVBQ3hCLGtCQUFrQixHQUNsQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZ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