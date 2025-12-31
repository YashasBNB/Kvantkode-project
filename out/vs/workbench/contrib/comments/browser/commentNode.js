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
import * as dom from '../../../../base/browser/dom.js';
import * as languages from '../../../../editor/common/languages.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action, Separator, ActionRunner } from '../../../../base/common/actions.js';
import { Disposable, DisposableStore, MutableDisposable, dispose, } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommentService } from './commentService.js';
import { MIN_EDITOR_HEIGHT, SimpleCommentEditor, calculateEditorHeight, } from './simpleCommentEditor.js';
import { Emitter } from '../../../../base/common/event.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ToggleReactionsAction, ReactionAction, ReactionActionViewItem } from './reactionsAction.js';
import { MenuItemAction, SubmenuItemAction, MenuId, } from '../../../../platform/actions/common/actions.js';
import { MenuEntryActionViewItem, SubmenuEntryActionViewItem, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { CommentFormActions } from './commentFormActions.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { ActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { TimestampWidget } from './timestamp.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Scrollable } from '../../../../base/common/scrollable.js';
import { SmoothScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { Position } from '../../../../editor/common/core/position.js';
class CommentsActionRunner extends ActionRunner {
    async runAction(action, context) {
        await action.run(...context);
    }
}
let CommentNode = class CommentNode extends Disposable {
    get domNode() {
        return this._domNode;
    }
    constructor(parentEditor, commentThread, comment, pendingEdit, owner, resource, parentThread, markdownRenderer, instantiationService, commentService, notificationService, contextMenuService, contextKeyService, configurationService, hoverService, accessibilityService, keybindingService, textModelService) {
        super();
        this.parentEditor = parentEditor;
        this.commentThread = commentThread;
        this.comment = comment;
        this.pendingEdit = pendingEdit;
        this.owner = owner;
        this.resource = resource;
        this.parentThread = parentThread;
        this.markdownRenderer = markdownRenderer;
        this.instantiationService = instantiationService;
        this.commentService = commentService;
        this.notificationService = notificationService;
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.accessibilityService = accessibilityService;
        this.keybindingService = keybindingService;
        this.textModelService = textModelService;
        this._md = this._register(new MutableDisposable());
        this._editAction = null;
        this._commentEditContainer = null;
        this._reactionsActionBar = this._register(new MutableDisposable());
        this._reactionActions = this._register(new DisposableStore());
        this._commentEditor = null;
        this._commentEditorDisposables = [];
        this._commentEditorModel = null;
        this._editorHeight = MIN_EDITOR_HEIGHT;
        this._actionRunner = this._register(new CommentsActionRunner());
        this.toolbar = this._register(new MutableDisposable());
        this._commentFormActions = null;
        this._commentEditorActions = null;
        this._onDidClick = new Emitter();
        this.isEditing = false;
        this._domNode = dom.$('div.review-comment');
        this._contextKeyService = this._register(contextKeyService.createScoped(this._domNode));
        this._commentContextValue = CommentContextKeys.commentContext.bindTo(this._contextKeyService);
        if (this.comment.contextValue) {
            this._commentContextValue.set(this.comment.contextValue);
        }
        this._commentMenus = this.commentService.getCommentMenus(this.owner);
        this._domNode.tabIndex = -1;
        this._avatar = dom.append(this._domNode, dom.$('div.avatar-container'));
        this.updateCommentUserIcon(this.comment.userIconPath);
        this._commentDetailsContainer = dom.append(this._domNode, dom.$('.review-comment-contents'));
        this.createHeader(this._commentDetailsContainer);
        this._body = document.createElement(`div`);
        this._body.classList.add('comment-body', MOUSE_CURSOR_TEXT_CSS_CLASS_NAME);
        if (configurationService.getValue(COMMENTS_SECTION)
            ?.maxHeight !== false) {
            this._body.classList.add('comment-body-max-height');
        }
        this.createScroll(this._commentDetailsContainer, this._body);
        this.updateCommentBody(this.comment.body);
        this.createReactionsContainer(this._commentDetailsContainer);
        this._domNode.setAttribute('aria-label', `${comment.userName}, ${this.commentBodyValue}`);
        this._domNode.setAttribute('role', 'treeitem');
        this._clearTimeout = null;
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.CLICK, () => this.isEditing || this._onDidClick.fire(this)));
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.CONTEXT_MENU, (e) => {
            return this.onContextMenu(e);
        }));
        if (pendingEdit) {
            this.switchToEditMode();
        }
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => {
            this.toggleToolbarHidden(true);
        }));
        this.activeCommentListeners();
    }
    activeCommentListeners() {
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.FOCUS_IN, () => {
            this.commentService.setActiveCommentAndThread(this.owner, {
                thread: this.commentThread,
                comment: this.comment,
            });
        }, true));
    }
    createScroll(container, body) {
        this._scrollable = this._register(new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration: 125,
            scheduleAtNextAnimationFrame: (cb) => dom.scheduleAtNextAnimationFrame(dom.getWindow(container), cb),
        }));
        this._scrollableElement = this._register(new SmoothScrollableElement(body, {
            horizontal: 3 /* ScrollbarVisibility.Visible */,
            vertical: 3 /* ScrollbarVisibility.Visible */,
        }, this._scrollable));
        this._register(this._scrollableElement.onScroll((e) => {
            if (e.scrollLeftChanged) {
                body.scrollLeft = e.scrollLeft;
            }
            if (e.scrollTopChanged) {
                body.scrollTop = e.scrollTop;
            }
        }));
        const onDidScrollViewContainer = this._register(new DomEmitter(body, 'scroll')).event;
        this._register(onDidScrollViewContainer((_) => {
            const position = this._scrollableElement.getScrollPosition();
            const scrollLeft = Math.abs(body.scrollLeft - position.scrollLeft) <= 1 ? undefined : body.scrollLeft;
            const scrollTop = Math.abs(body.scrollTop - position.scrollTop) <= 1 ? undefined : body.scrollTop;
            if (scrollLeft !== undefined || scrollTop !== undefined) {
                this._scrollableElement.setScrollPosition({ scrollLeft, scrollTop });
            }
        }));
        container.appendChild(this._scrollableElement.getDomNode());
    }
    updateCommentBody(body) {
        this._body.innerText = '';
        this._md.clear();
        this._plainText = undefined;
        if (typeof body === 'string') {
            this._plainText = dom.append(this._body, dom.$('.comment-body-plainstring'));
            this._plainText.innerText = body;
        }
        else {
            this._md.value = this.markdownRenderer.render(body);
            this._body.appendChild(this._md.value.element);
        }
    }
    updateCommentUserIcon(userIconPath) {
        this._avatar.textContent = '';
        if (userIconPath) {
            const img = dom.append(this._avatar, dom.$('img.avatar'));
            img.src = FileAccess.uriToBrowserUri(URI.revive(userIconPath)).toString(true);
            img.onerror = (_) => img.remove();
        }
    }
    get onDidClick() {
        return this._onDidClick.event;
    }
    createTimestamp(container) {
        this._timestamp = dom.append(container, dom.$('span.timestamp-container'));
        this.updateTimestamp(this.comment.timestamp);
    }
    updateTimestamp(raw) {
        if (!this._timestamp) {
            return;
        }
        const timestamp = raw !== undefined ? new Date(raw) : undefined;
        if (!timestamp) {
            this._timestampWidget?.dispose();
        }
        else {
            if (!this._timestampWidget) {
                this._timestampWidget = new TimestampWidget(this.configurationService, this.hoverService, this._timestamp, timestamp);
                this._register(this._timestampWidget);
            }
            else {
                this._timestampWidget.setTimestamp(timestamp);
            }
        }
    }
    createHeader(commentDetailsContainer) {
        const header = dom.append(commentDetailsContainer, dom.$(`div.comment-title.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`));
        const infoContainer = dom.append(header, dom.$('comment-header-info'));
        const author = dom.append(infoContainer, dom.$('strong.author'));
        author.innerText = this.comment.userName;
        this.createTimestamp(infoContainer);
        this._isPendingLabel = dom.append(infoContainer, dom.$('span.isPending'));
        if (this.comment.label) {
            this._isPendingLabel.innerText = this.comment.label;
        }
        else {
            this._isPendingLabel.innerText = '';
        }
        this._actionsToolbarContainer = dom.append(header, dom.$('.comment-actions'));
        this.toggleToolbarHidden(true);
        this.createActionsToolbar();
    }
    toggleToolbarHidden(hidden) {
        if (hidden && !this.accessibilityService.isScreenReaderOptimized()) {
            this._actionsToolbarContainer.classList.add('hidden');
        }
        else {
            this._actionsToolbarContainer.classList.remove('hidden');
        }
    }
    getToolbarActions(menu) {
        const contributedActions = menu.getActions({ shouldForwardArgs: true });
        const primary = [];
        const secondary = [];
        const result = { primary, secondary };
        fillInActions(contributedActions, result, false, (g) => /^inline/.test(g));
        return result;
    }
    get commentNodeContext() {
        return [
            {
                thread: this.commentThread,
                commentUniqueId: this.comment.uniqueIdInThread,
                $mid: 10 /* MarshalledId.CommentNode */,
            },
            {
                commentControlHandle: this.commentThread.controllerHandle,
                commentThreadHandle: this.commentThread.commentThreadHandle,
                $mid: 7 /* MarshalledId.CommentThread */,
            },
        ];
    }
    createToolbar() {
        this.toolbar.value = new ToolBar(this._actionsToolbarContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === ToggleReactionsAction.ID) {
                    return new DropdownMenuActionViewItem(action, action.menuActions, this.contextMenuService, {
                        ...options,
                        actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
                        classNames: [
                            'toolbar-toggle-pickReactions',
                            ...ThemeIcon.asClassNameArray(Codicon.reactions),
                        ],
                        anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
                    });
                }
                return this.actionViewItemProvider(action, options);
            },
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
        });
        this.toolbar.value.context = this.commentNodeContext;
        this.toolbar.value.actionRunner = this._actionRunner;
        this.registerActionBarListeners(this._actionsToolbarContainer);
    }
    createActionsToolbar() {
        const actions = [];
        const hasReactionHandler = this.commentService.hasReactionHandler(this.owner);
        const toggleReactionAction = hasReactionHandler
            ? this.createReactionPicker(this.comment.commentReactions || [])
            : undefined;
        if (toggleReactionAction) {
            actions.push(toggleReactionAction);
        }
        const menu = this._commentMenus.getCommentTitleActions(this.comment, this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange((e) => {
            const { primary, secondary } = this.getToolbarActions(menu);
            if (!this.toolbar && (primary.length || secondary.length)) {
                this.createToolbar();
            }
            if (toggleReactionAction) {
                primary.unshift(toggleReactionAction);
            }
            this.toolbar.value.setActions(primary, secondary);
        }));
        const { primary, secondary } = this.getToolbarActions(menu);
        actions.push(...primary);
        if (actions.length || secondary.length) {
            this.createToolbar();
            this.toolbar.value.setActions(actions, secondary);
        }
    }
    actionViewItemProvider(action, options) {
        if (action.id === ToggleReactionsAction.ID) {
            options = { label: false, icon: true };
        }
        else {
            options = { label: false, icon: true };
        }
        if (action.id === ReactionAction.ID) {
            const item = new ReactionActionViewItem(action);
            return item;
        }
        else if (action instanceof MenuItemAction) {
            return this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                hoverDelegate: options.hoverDelegate,
            });
        }
        else if (action instanceof SubmenuItemAction) {
            return this.instantiationService.createInstance(SubmenuEntryActionViewItem, action, options);
        }
        else {
            const item = new ActionViewItem({}, action, options);
            return item;
        }
    }
    async submitComment() {
        if (this._commentEditor && this._commentFormActions) {
            await this._commentFormActions.triggerDefaultAction();
            this.pendingEdit = undefined;
        }
    }
    createReactionPicker(reactionGroup) {
        const toggleReactionAction = this._reactionActions.add(new ToggleReactionsAction(() => {
            toggleReactionActionViewItem?.show();
        }, nls.localize('commentToggleReaction', 'Toggle Reaction')));
        let reactionMenuActions = [];
        if (reactionGroup && reactionGroup.length) {
            reactionMenuActions = reactionGroup.map((reaction) => {
                return this._reactionActions.add(new Action(`reaction.command.${reaction.label}`, `${reaction.label}`, '', true, async () => {
                    try {
                        await this.commentService.toggleReaction(this.owner, this.resource, this.commentThread, this.comment, reaction);
                    }
                    catch (e) {
                        const error = e.message
                            ? nls.localize('commentToggleReactionError', 'Toggling the comment reaction failed: {0}.', e.message)
                            : nls.localize('commentToggleReactionDefaultError', 'Toggling the comment reaction failed');
                        this.notificationService.error(error);
                    }
                }));
            });
        }
        toggleReactionAction.menuActions = reactionMenuActions;
        const toggleReactionActionViewItem = this._reactionActions.add(new DropdownMenuActionViewItem(toggleReactionAction, toggleReactionAction.menuActions, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === ToggleReactionsAction.ID) {
                    return toggleReactionActionViewItem;
                }
                return this.actionViewItemProvider(action, options);
            },
            classNames: 'toolbar-toggle-pickReactions',
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
        }));
        return toggleReactionAction;
    }
    createReactionsContainer(commentDetailsContainer) {
        this._reactionActionsContainer?.remove();
        this._reactionsActionBar.clear();
        this._reactionActions.clear();
        this._reactionActionsContainer = dom.append(commentDetailsContainer, dom.$('div.comment-reactions'));
        this._reactionsActionBar.value = new ActionBar(this._reactionActionsContainer, {
            actionViewItemProvider: (action, options) => {
                if (action.id === ToggleReactionsAction.ID) {
                    return new DropdownMenuActionViewItem(action, action.menuActions, this.contextMenuService, {
                        actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
                        classNames: [
                            'toolbar-toggle-pickReactions',
                            ...ThemeIcon.asClassNameArray(Codicon.reactions),
                        ],
                        anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
                    });
                }
                return this.actionViewItemProvider(action, options);
            },
        });
        const hasReactionHandler = this.commentService.hasReactionHandler(this.owner);
        this.comment.commentReactions
            ?.filter((reaction) => !!reaction.count)
            .map((reaction) => {
            const action = this._reactionActions.add(new ReactionAction(`reaction.${reaction.label}`, `${reaction.label}`, reaction.hasReacted && (reaction.canEdit || hasReactionHandler) ? 'active' : '', reaction.canEdit || hasReactionHandler, async () => {
                try {
                    await this.commentService.toggleReaction(this.owner, this.resource, this.commentThread, this.comment, reaction);
                }
                catch (e) {
                    let error;
                    if (reaction.hasReacted) {
                        error = e.message
                            ? nls.localize('commentDeleteReactionError', 'Deleting the comment reaction failed: {0}.', e.message)
                            : nls.localize('commentDeleteReactionDefaultError', 'Deleting the comment reaction failed');
                    }
                    else {
                        error = e.message
                            ? nls.localize('commentAddReactionError', 'Deleting the comment reaction failed: {0}.', e.message)
                            : nls.localize('commentAddReactionDefaultError', 'Deleting the comment reaction failed');
                    }
                    this.notificationService.error(error);
                }
            }, reaction.reactors, reaction.iconPath, reaction.count));
            this._reactionsActionBar.value?.push(action, { label: true, icon: true });
        });
        if (hasReactionHandler) {
            const toggleReactionAction = this.createReactionPicker(this.comment.commentReactions || []);
            this._reactionsActionBar.value?.push(toggleReactionAction, { label: false, icon: true });
        }
    }
    get commentBodyValue() {
        return typeof this.comment.body === 'string' ? this.comment.body : this.comment.body.value;
    }
    async createCommentEditor(editContainer) {
        const container = dom.append(editContainer, dom.$('.edit-textarea'));
        this._commentEditor = this.instantiationService.createInstance(SimpleCommentEditor, container, SimpleCommentEditor.getEditorOptions(this.configurationService), this._contextKeyService, this.parentThread);
        const resource = URI.from({
            scheme: Schemas.commentsInput,
            path: `/commentinput-${this.comment.uniqueIdInThread}-${Date.now()}.md`,
        });
        const modelRef = await this.textModelService.createModelReference(resource);
        this._commentEditorModel = modelRef;
        this._commentEditor.setModel(this._commentEditorModel.object.textEditorModel);
        this._commentEditor.setValue(this.pendingEdit?.body ?? this.commentBodyValue);
        if (this.pendingEdit) {
            this._commentEditor.setPosition(this.pendingEdit.cursor);
        }
        else {
            const lastLine = this._commentEditorModel.object.textEditorModel.getLineCount();
            const lastColumn = this._commentEditorModel.object.textEditorModel.getLineLength(lastLine) + 1;
            this._commentEditor.setPosition(new Position(lastLine, lastColumn));
        }
        this.pendingEdit = undefined;
        this._commentEditor.layout({ width: container.clientWidth - 14, height: this._editorHeight });
        this._commentEditor.focus();
        dom.scheduleAtNextAnimationFrame(dom.getWindow(editContainer), () => {
            this._commentEditor.layout({ width: container.clientWidth - 14, height: this._editorHeight });
            this._commentEditor.focus();
        });
        const commentThread = this.commentThread;
        commentThread.input = {
            uri: this._commentEditor.getModel().uri,
            value: this.commentBodyValue,
        };
        this.commentService.setActiveEditingCommentThread(commentThread);
        this.commentService.setActiveCommentAndThread(this.owner, {
            thread: commentThread,
            comment: this.comment,
        });
        this._commentEditorDisposables.push(this._commentEditor.onDidFocusEditorWidget(() => {
            commentThread.input = {
                uri: this._commentEditor.getModel().uri,
                value: this.commentBodyValue,
            };
            this.commentService.setActiveEditingCommentThread(commentThread);
            this.commentService.setActiveCommentAndThread(this.owner, {
                thread: commentThread,
                comment: this.comment,
            });
        }));
        this._commentEditorDisposables.push(this._commentEditor.onDidChangeModelContent((e) => {
            if (commentThread.input &&
                this._commentEditor &&
                this._commentEditor.getModel().uri === commentThread.input.uri) {
                const newVal = this._commentEditor.getValue();
                if (newVal !== commentThread.input.value) {
                    const input = commentThread.input;
                    input.value = newVal;
                    commentThread.input = input;
                    this.commentService.setActiveEditingCommentThread(commentThread);
                    this.commentService.setActiveCommentAndThread(this.owner, {
                        thread: commentThread,
                        comment: this.comment,
                    });
                }
            }
        }));
        this.calculateEditorHeight();
        this._register(this._commentEditorModel.object.textEditorModel.onDidChangeContent(() => {
            if (this._commentEditor && this.calculateEditorHeight()) {
                this._commentEditor.layout({
                    height: this._editorHeight,
                    width: this._commentEditor.getLayoutInfo().width,
                });
                this._commentEditor.render(true);
            }
        }));
        this._register(this._commentEditor);
        this._register(this._commentEditorModel);
    }
    calculateEditorHeight() {
        if (this._commentEditor) {
            const newEditorHeight = calculateEditorHeight(this.parentEditor, this._commentEditor, this._editorHeight);
            if (newEditorHeight !== this._editorHeight) {
                this._editorHeight = newEditorHeight;
                return true;
            }
        }
        return false;
    }
    getPendingEdit() {
        const model = this._commentEditor?.getModel();
        if (this._commentEditor && model && model.getValueLength() > 0) {
            return { body: model.getValue(), cursor: this._commentEditor.getPosition() };
        }
        return undefined;
    }
    removeCommentEditor() {
        this.isEditing = false;
        if (this._editAction) {
            this._editAction.enabled = true;
        }
        this._body.classList.remove('hidden');
        this._commentEditorModel?.dispose();
        dispose(this._commentEditorDisposables);
        this._commentEditorDisposables = [];
        this._commentEditor?.dispose();
        this._commentEditor = null;
        this._commentEditContainer.remove();
    }
    layout(widthInPixel) {
        const editorWidth = widthInPixel !== undefined
            ? widthInPixel - 72 /* - margin and scrollbar*/
            : (this._commentEditor?.getLayoutInfo().width ?? 0);
        this._commentEditor?.layout({ width: editorWidth, height: this._editorHeight });
        const scrollWidth = this._body.scrollWidth;
        const width = dom.getContentWidth(this._body);
        const scrollHeight = this._body.scrollHeight;
        const height = dom.getContentHeight(this._body) + 4;
        this._scrollableElement.setScrollDimensions({ width, scrollWidth, height, scrollHeight });
    }
    async switchToEditMode() {
        if (this.isEditing) {
            return;
        }
        this.isEditing = true;
        this._body.classList.add('hidden');
        this._commentEditContainer = dom.append(this._commentDetailsContainer, dom.$('.edit-container'));
        await this.createCommentEditor(this._commentEditContainer);
        const formActions = dom.append(this._commentEditContainer, dom.$('.form-actions'));
        const otherActions = dom.append(formActions, dom.$('.other-actions'));
        this.createCommentWidgetFormActions(otherActions);
        const editorActions = dom.append(formActions, dom.$('.editor-actions'));
        this.createCommentWidgetEditorActions(editorActions);
    }
    createCommentWidgetFormActions(container) {
        const menus = this.commentService.getCommentMenus(this.owner);
        const menu = menus.getCommentActions(this.comment, this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(() => {
            this._commentFormActions?.setActions(menu);
        }));
        this._commentFormActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, (action) => {
            const text = this._commentEditor.getValue();
            action.run({
                thread: this.commentThread,
                commentUniqueId: this.comment.uniqueIdInThread,
                text: text,
                $mid: 11 /* MarshalledId.CommentThreadNode */,
            });
            this.removeCommentEditor();
        });
        this._register(this._commentFormActions);
        this._commentFormActions.setActions(menu);
    }
    createCommentWidgetEditorActions(container) {
        const menus = this.commentService.getCommentMenus(this.owner);
        const menu = menus.getCommentEditorActions(this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(() => {
            this._commentEditorActions?.setActions(menu, true);
        }));
        this._commentEditorActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, (action) => {
            const text = this._commentEditor.getValue();
            action.run({
                thread: this.commentThread,
                commentUniqueId: this.comment.uniqueIdInThread,
                text: text,
                $mid: 11 /* MarshalledId.CommentThreadNode */,
            });
            this._commentEditor?.focus();
        });
        this._register(this._commentEditorActions);
        this._commentEditorActions.setActions(menu, true);
    }
    setFocus(focused, visible = false) {
        if (focused) {
            this._domNode.focus();
            this.toggleToolbarHidden(false);
            this._actionsToolbarContainer.classList.add('tabfocused');
            this._domNode.tabIndex = 0;
            if (this.comment.mode === languages.CommentMode.Editing) {
                this._commentEditor?.focus();
            }
        }
        else {
            if (this._actionsToolbarContainer.classList.contains('tabfocused') &&
                !this._actionsToolbarContainer.classList.contains('mouseover')) {
                this.toggleToolbarHidden(true);
                this._domNode.tabIndex = -1;
            }
            this._actionsToolbarContainer.classList.remove('tabfocused');
        }
    }
    registerActionBarListeners(actionsContainer) {
        this._register(dom.addDisposableListener(this._domNode, 'mouseenter', () => {
            this.toggleToolbarHidden(false);
            actionsContainer.classList.add('mouseover');
        }));
        this._register(dom.addDisposableListener(this._domNode, 'mouseleave', () => {
            if (actionsContainer.classList.contains('mouseover') &&
                !actionsContainer.classList.contains('tabfocused')) {
                this.toggleToolbarHidden(true);
            }
            actionsContainer.classList.remove('mouseover');
        }));
    }
    async update(newComment) {
        if (newComment.body !== this.comment.body) {
            this.updateCommentBody(newComment.body);
        }
        if (this.comment.userIconPath &&
            newComment.userIconPath &&
            URI.from(this.comment.userIconPath).toString() !==
                URI.from(newComment.userIconPath).toString()) {
            this.updateCommentUserIcon(newComment.userIconPath);
        }
        const isChangingMode = newComment.mode !== undefined && newComment.mode !== this.comment.mode;
        this.comment = newComment;
        if (isChangingMode) {
            if (newComment.mode === languages.CommentMode.Editing) {
                await this.switchToEditMode();
            }
            else {
                this.removeCommentEditor();
            }
        }
        if (newComment.label) {
            this._isPendingLabel.innerText = newComment.label;
        }
        else {
            this._isPendingLabel.innerText = '';
        }
        // update comment reactions
        this.createReactionsContainer(this._commentDetailsContainer);
        if (this.comment.contextValue) {
            this._commentContextValue.set(this.comment.contextValue);
        }
        else {
            this._commentContextValue.reset();
        }
        if (this.comment.timestamp) {
            this.updateTimestamp(this.comment.timestamp);
        }
    }
    onContextMenu(e) {
        const event = new StandardMouseEvent(dom.getWindow(this._domNode), e);
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            menuId: MenuId.CommentThreadCommentContext,
            menuActionOptions: { shouldForwardArgs: true },
            contextKeyService: this._contextKeyService,
            actionRunner: this._actionRunner,
            getActionsContext: () => {
                return this.commentNodeContext;
            },
        });
    }
    focus() {
        this.domNode.focus();
        if (!this._clearTimeout) {
            this.domNode.classList.add('focus');
            this._clearTimeout = setTimeout(() => {
                this.domNode.classList.remove('focus');
            }, 3000);
        }
    }
    dispose() {
        super.dispose();
        dispose(this._commentEditorDisposables);
    }
};
CommentNode = __decorate([
    __param(8, IInstantiationService),
    __param(9, ICommentService),
    __param(10, INotificationService),
    __param(11, IContextMenuService),
    __param(12, IContextKeyService),
    __param(13, IConfigurationService),
    __param(14, IHoverService),
    __param(15, IAccessibilityService),
    __param(16, IKeybindingService),
    __param(17, ITextModelService)
], CommentNode);
export { CommentNode };
function fillInActions(groups, target, useAlternativeActions, isPrimaryGroup = (group) => group === 'navigation') {
    for (const tuple of groups) {
        let [group, actions] = tuple;
        if (useAlternativeActions) {
            actions = actions.map((a) => (a instanceof MenuItemAction && !!a.alt ? a.alt : a));
        }
        if (isPrimaryGroup(group)) {
            const to = Array.isArray(target) ? target : target.primary;
            to.unshift(...actions);
        }
        else {
            const to = Array.isArray(target) ? target : target.secondary;
            if (to.length > 0) {
                to.push(new Separator());
            }
            to.push(...actions);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudE5vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnROb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssU0FBUyxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sRUFBc0IsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbEcsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0YsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBR2YsaUJBQWlCLEVBQ2pCLE9BQU8sR0FDUCxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFLbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3JELE9BQU8sRUFFTixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLHFCQUFxQixHQUNyQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFN0YsT0FBTyxF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