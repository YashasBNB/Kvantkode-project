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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50VGhyZWFkV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssY0FBYyxNQUFNLDRDQUE0QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sVUFBVSxFQUNWLE9BQU8sRUFFUCxZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEtBQUssU0FBUyxNQUFNLHdDQUF3QyxDQUFBO0FBUW5FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHcEUsT0FBTyxFQUNOLGNBQWMsRUFDZCxXQUFXLEVBQ1gsOEJBQThCLEVBQzlCLDBCQUEwQixFQUMxQiw4QkFBOEIsRUFDOUIsd0JBQXdCLEVBQ3hCLG9CQUFvQixFQUNwQix3QkFBd0IsRUFDeEIsa0JBQWtCLEdBQ2xCLE1BQU0sb0RBQW9ELENB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