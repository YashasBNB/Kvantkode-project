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
var ChatListItemRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { DropdownMenuActionViewItem, } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { coalesce, distinct } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, thenIfNotDisposed, toDisposable, } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { FileAccess } from '../../../../base/common/network.js';
import { clamp } from '../../../../base/common/numbers.js';
import { autorun } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { createActionViewItem, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkbenchIssueService } from '../../issue/common/issue.js';
import { annotateSpecialMarkdownContent } from '../common/annotations.js';
import { checkModeOption } from '../common/chat.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { chatSubcommandLeader } from '../common/chatParserTypes.js';
import { ChatAgentVoteDirection, ChatAgentVoteDownReason, ChatErrorLevel, IChatService, } from '../common/chatService.js';
import { isRequestVM, isResponseVM, } from '../common/chatViewModel.js';
import { getNWords } from '../common/chatWordCounter.js';
import { CodeBlockModelCollection } from '../common/codeBlockModelCollection.js';
import { MarkUnhelpfulActionId } from './actions/chatTitleActions.js';
import { IChatWidgetService, } from './chat.js';
import { ChatAgentHover, getChatAgentHoverOptions } from './chatAgentHover.js';
import { ChatAgentCommandContentPart } from './chatContentParts/chatAgentCommandContentPart.js';
import { ChatAttachmentsContentPart } from './chatContentParts/chatAttachmentsContentPart.js';
import { ChatCodeCitationContentPart } from './chatContentParts/chatCodeCitationContentPart.js';
import { ChatCommandButtonContentPart } from './chatContentParts/chatCommandContentPart.js';
import { ChatConfirmationContentPart } from './chatContentParts/chatConfirmationContentPart.js';
import { ChatMarkdownContentPart, EditorPool } from './chatContentParts/chatMarkdownContentPart.js';
import { ChatProgressContentPart, ChatWorkingProgressContentPart, } from './chatContentParts/chatProgressContentPart.js';
import { ChatQuotaExceededPart } from './chatContentParts/chatQuotaExceededPart.js';
import { ChatUsedReferencesListContentPart, CollapsibleListPool, } from './chatContentParts/chatReferencesContentPart.js';
import { ChatTaskContentPart } from './chatContentParts/chatTaskContentPart.js';
import { ChatTextEditContentPart, DiffEditorPool, } from './chatContentParts/chatTextEditContentPart.js';
import { ChatToolInvocationPart } from './chatContentParts/chatToolInvocationPart.js';
import { ChatTreeContentPart, TreePool } from './chatContentParts/chatTreeContentPart.js';
import { ChatWarningContentPart } from './chatContentParts/chatWarningContentPart.js';
import { ChatMarkdownDecorationsRenderer } from './chatMarkdownDecorationsRenderer.js';
import { ChatMarkdownRenderer } from './chatMarkdownRenderer.js';
import { ChatCodeBlockContentProvider } from './codeBlockPart.js';
const $ = dom.$;
const forceVerboseLayoutTracing = false;
const mostRecentResponseClassName = 'chat-most-recent-response';
let ChatListItemRenderer = class ChatListItemRenderer extends Disposable {
    static { ChatListItemRenderer_1 = this; }
    static { this.ID = 'item'; }
    constructor(editorOptions, rendererOptions, delegate, codeBlockModelCollection, overflowWidgetsDomNode, instantiationService, configService, logService, contextKeyService, themeService, commandService, hoverService, chatWidgetService, chatService) {
        super();
        this.rendererOptions = rendererOptions;
        this.delegate = delegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.themeService = themeService;
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.chatWidgetService = chatWidgetService;
        this.chatService = chatService;
        this.codeBlocksByResponseId = new Map();
        this.codeBlocksByEditorUri = new ResourceMap();
        this.fileTreesByResponseId = new Map();
        this.focusedFileTreesByResponseId = new Map();
        this._onDidClickFollowup = this._register(new Emitter());
        this.onDidClickFollowup = this._onDidClickFollowup.event;
        this._onDidClickRerunWithAgentOrCommandDetection = new Emitter();
        this.onDidClickRerunWithAgentOrCommandDetection = this._onDidClickRerunWithAgentOrCommandDetection.event;
        this._onDidChangeItemHeight = this._register(new Emitter());
        this.onDidChangeItemHeight = this._onDidChangeItemHeight.event;
        this._currentLayoutWidth = 0;
        this._isVisible = true;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.renderer = this.instantiationService.createInstance(ChatMarkdownRenderer, undefined);
        this.markdownDecorationsRenderer = this.instantiationService.createInstance(ChatMarkdownDecorationsRenderer);
        this._editorPool = this._register(this.instantiationService.createInstance(EditorPool, editorOptions, delegate, overflowWidgetsDomNode));
        this._toolEditorPool = this._register(this.instantiationService.createInstance(EditorPool, editorOptions, delegate, overflowWidgetsDomNode));
        this._diffEditorPool = this._register(this.instantiationService.createInstance(DiffEditorPool, editorOptions, delegate, overflowWidgetsDomNode));
        this._treePool = this._register(this.instantiationService.createInstance(TreePool, this._onDidChangeVisibility.event));
        this._contentReferencesListPool = this._register(this.instantiationService.createInstance(CollapsibleListPool, this._onDidChangeVisibility.event, undefined));
        this._register(this.instantiationService.createInstance(ChatCodeBlockContentProvider));
        this._toolInvocationCodeBlockCollection = this._register(this.instantiationService.createInstance(CodeBlockModelCollection, 'tools'));
    }
    get templateId() {
        return ChatListItemRenderer_1.ID;
    }
    editorsInUse() {
        return Iterable.concat(this._editorPool.inUse(), this._toolEditorPool.inUse());
    }
    traceLayout(method, message) {
        if (forceVerboseLayoutTracing) {
            this.logService.info(`ChatListItemRenderer#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatListItemRenderer#${method}: ${message}`);
        }
    }
    /**
     * Compute a rate to render at in words/s.
     */
    getProgressiveRenderRate(element) {
        let Rate;
        (function (Rate) {
            Rate[Rate["Min"] = 5] = "Min";
            Rate[Rate["Max"] = 80] = "Max";
        })(Rate || (Rate = {}));
        if (element.isComplete || element.isPaused.get()) {
            return 80 /* Rate.Max */;
        }
        if (element.contentUpdateTimings && element.contentUpdateTimings.impliedWordLoadRate) {
            const rate = element.contentUpdateTimings.impliedWordLoadRate;
            return clamp(rate, 5 /* Rate.Min */, 80 /* Rate.Max */);
        }
        return 8;
    }
    getCodeBlockInfosForResponse(response) {
        const codeBlocks = this.codeBlocksByResponseId.get(response.id);
        return codeBlocks ?? [];
    }
    getCodeBlockInfoForEditor(uri) {
        return this.codeBlocksByEditorUri.get(uri);
    }
    getFileTreeInfosForResponse(response) {
        const fileTrees = this.fileTreesByResponseId.get(response.id);
        return fileTrees ?? [];
    }
    getLastFocusedFileTreeForResponse(response) {
        const fileTrees = this.fileTreesByResponseId.get(response.id);
        const lastFocusedFileTreeIndex = this.focusedFileTreesByResponseId.get(response.id);
        if (fileTrees?.length &&
            lastFocusedFileTreeIndex !== undefined &&
            lastFocusedFileTreeIndex < fileTrees.length) {
            return fileTrees[lastFocusedFileTreeIndex];
        }
        return undefined;
    }
    setVisible(visible) {
        this._isVisible = visible;
        this._onDidChangeVisibility.fire(visible);
    }
    layout(width) {
        const newWidth = width - 40; // padding
        if (newWidth !== this._currentLayoutWidth) {
            this._currentLayoutWidth = newWidth;
            for (const editor of this._editorPool.inUse()) {
                editor.layout(this._currentLayoutWidth);
            }
            for (const toolEditor of this._toolEditorPool.inUse()) {
                toolEditor.layout(this._currentLayoutWidth);
            }
            for (const diffEditor of this._diffEditorPool.inUse()) {
                diffEditor.layout(this._currentLayoutWidth);
            }
        }
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const rowContainer = dom.append(container, $('.interactive-item-container'));
        if (this.rendererOptions.renderStyle === 'compact') {
            rowContainer.classList.add('interactive-item-compact');
        }
        let headerParent = rowContainer;
        let valueParent = rowContainer;
        let detailContainerParent;
        let toolbarParent;
        if (this.rendererOptions.renderStyle === 'minimal') {
            rowContainer.classList.add('interactive-item-compact');
            rowContainer.classList.add('minimal');
            // -----------------------------------------------------
            //  icon | details
            //       | references
            //       | value
            // -----------------------------------------------------
            const lhsContainer = dom.append(rowContainer, $('.column.left'));
            const rhsContainer = dom.append(rowContainer, $('.column.right'));
            headerParent = lhsContainer;
            detailContainerParent = rhsContainer;
            valueParent = rhsContainer;
            toolbarParent = dom.append(rowContainer, $('.header'));
        }
        const header = dom.append(headerParent, $('.header'));
        const user = dom.append(header, $('.user'));
        const avatarContainer = dom.append(user, $('.avatar-container'));
        const username = dom.append(user, $('h3.username'));
        username.tabIndex = 0;
        const detailContainer = dom.append(detailContainerParent ?? user, $('span.detail-container'));
        const detail = dom.append(detailContainer, $('span.detail'));
        dom.append(detailContainer, $('span.chat-animated-ellipsis'));
        const value = dom.append(valueParent, $('.value'));
        const elementDisposables = new DisposableStore();
        const contextKeyService = templateDisposables.add(this.contextKeyService.createScoped(rowContainer));
        const scopedInstantiationService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        let titleToolbar;
        if (this.rendererOptions.noHeader) {
            header.classList.add('hidden');
        }
        else {
            titleToolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, toolbarParent ?? header, MenuId.ChatMessageTitle, {
                menuOptions: {
                    shouldForwardArgs: true,
                },
                toolbarOptions: {
                    shouldInlineSubmenu: (submenu) => submenu.actions.length <= 1,
                },
            }));
        }
        const footerToolbarContainer = dom.append(rowContainer, $('.chat-footer-toolbar'));
        const footerToolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, footerToolbarContainer, MenuId.ChatMessageFooter, {
            eventDebounceDelay: 0,
            menuOptions: { shouldForwardArgs: true, renderShortTitle: true },
            toolbarOptions: { shouldInlineSubmenu: (submenu) => submenu.actions.length <= 1 },
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction && action.item.id === MarkUnhelpfulActionId) {
                    return scopedInstantiationService.createInstance(ChatVoteDownButton, action, options);
                }
                return createActionViewItem(scopedInstantiationService, action, options);
            },
        }));
        const agentHover = templateDisposables.add(this.instantiationService.createInstance(ChatAgentHover));
        const hoverContent = () => {
            if (isResponseVM(template.currentElement) &&
                template.currentElement.agent &&
                !template.currentElement.agent.isDefault) {
                agentHover.setAgent(template.currentElement.agent.id);
                return agentHover.domNode;
            }
            return undefined;
        };
        const hoverOptions = getChatAgentHoverOptions(() => (isResponseVM(template.currentElement) ? template.currentElement.agent : undefined), this.commandService);
        templateDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), user, hoverContent, hoverOptions));
        templateDisposables.add(dom.addDisposableListener(user, dom.EventType.KEY_DOWN, (e) => {
            const ev = new StandardKeyboardEvent(e);
            if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                const content = hoverContent();
                if (content) {
                    this.hoverService.showInstantHover({ content, target: user, trapFocus: true, actions: hoverOptions.actions }, true);
                }
            }
            else if (ev.equals(9 /* KeyCode.Escape */)) {
                this.hoverService.hideHover();
            }
        }));
        const template = {
            avatarContainer,
            username,
            detail,
            value,
            rowContainer,
            elementDisposables,
            templateDisposables,
            contextKeyService,
            instantiationService: scopedInstantiationService,
            agentHover,
            titleToolbar,
            footerToolbar,
        };
        return template;
    }
    renderElement(node, index, templateData) {
        this.renderChatTreeItem(node.element, index, templateData);
    }
    clearRenderedParts(templateData) {
        if (templateData.renderedParts) {
            dispose(coalesce(templateData.renderedParts));
            templateData.renderedParts = undefined;
            dom.clearNode(templateData.value);
        }
    }
    renderChatTreeItem(element, index, templateData) {
        if (templateData.currentElement && templateData.currentElement.id !== element.id) {
            this.traceLayout('renderChatTreeItem', `Rendering a different element into the template, index=${index}`);
            this.clearRenderedParts(templateData);
        }
        templateData.currentElement = element;
        const kind = isRequestVM(element) ? 'request' : isResponseVM(element) ? 'response' : 'welcome';
        this.traceLayout('renderElement', `${kind}, index=${index}`);
        ChatContextKeys.isResponse.bindTo(templateData.contextKeyService).set(isResponseVM(element));
        ChatContextKeys.itemId.bindTo(templateData.contextKeyService).set(element.id);
        ChatContextKeys.isRequest.bindTo(templateData.contextKeyService).set(isRequestVM(element));
        ChatContextKeys.responseDetectedAgentCommand
            .bindTo(templateData.contextKeyService)
            .set(isResponseVM(element) && element.agentOrSlashCommandDetected);
        if (isResponseVM(element)) {
            ChatContextKeys.responseSupportsIssueReporting
                .bindTo(templateData.contextKeyService)
                .set(!!element.agent?.metadata.supportIssueReporting);
            ChatContextKeys.responseVote
                .bindTo(templateData.contextKeyService)
                .set(element.vote === ChatAgentVoteDirection.Up
                ? 'up'
                : element.vote === ChatAgentVoteDirection.Down
                    ? 'down'
                    : '');
        }
        else {
            ChatContextKeys.responseVote.bindTo(templateData.contextKeyService).set('');
        }
        if (templateData.titleToolbar) {
            templateData.titleToolbar.context = element;
        }
        templateData.footerToolbar.context = element;
        ChatContextKeys.responseHasError
            .bindTo(templateData.contextKeyService)
            .set(isResponseVM(element) && !!element.errorDetails);
        const isFiltered = !!(isResponseVM(element) && element.errorDetails?.responseIsFiltered);
        ChatContextKeys.responseIsFiltered.bindTo(templateData.contextKeyService).set(isFiltered);
        const location = this.chatWidgetService.getWidgetBySessionId(element.sessionId)?.location;
        templateData.rowContainer.classList.toggle('editing-session', location && this.chatService.isEditingLocation(location));
        templateData.rowContainer.classList.toggle('interactive-request', isRequestVM(element));
        templateData.rowContainer.classList.toggle('interactive-response', isResponseVM(element));
        const progressMessageAtBottomOfResponse = checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse);
        templateData.rowContainer.classList.toggle('show-detail-progress', isResponseVM(element) &&
            !element.isComplete &&
            !element.progressMessages.length &&
            !element.model.isPaused.get() &&
            !progressMessageAtBottomOfResponse);
        templateData.username.textContent = element.username;
        if (!this.rendererOptions.noHeader) {
            this.renderAvatar(element, templateData);
        }
        dom.clearNode(templateData.detail);
        if (isResponseVM(element)) {
            this.renderDetail(element, templateData);
        }
        templateData.rowContainer.classList.toggle(mostRecentResponseClassName, index === this.delegate.getListLength() - 1);
        if (isRequestVM(element) && element.confirmation) {
            this.renderConfirmationAction(element, templateData);
        }
        // Do a progressive render if
        // - This the last response in the list
        // - And it has some content
        // - And the response is not complete
        //   - Or, we previously started a progressive rendering of this element (if the element is complete, we will finish progressive rendering with a very fast rate)
        if (isResponseVM(element) &&
            index === this.delegate.getListLength() - 1 &&
            (!element.isComplete || element.renderData)) {
            this.traceLayout('renderElement', `start progressive render, index=${index}`);
            const timer = templateData.elementDisposables.add(new dom.WindowIntervalTimer());
            const runProgressiveRender = (initial) => {
                try {
                    if (this.doNextProgressiveRender(element, index, templateData, !!initial)) {
                        timer.cancel();
                    }
                }
                catch (err) {
                    // Kill the timer if anything went wrong, avoid getting stuck in a nasty rendering loop.
                    timer.cancel();
                    this.logService.error(err);
                }
            };
            timer.cancelAndSet(runProgressiveRender, 50, dom.getWindow(templateData.rowContainer));
            runProgressiveRender(true);
        }
        else {
            if (isResponseVM(element)) {
                this.basicRenderElement(element, index, templateData);
            }
            else if (isRequestVM(element)) {
                this.basicRenderElement(element, index, templateData);
            }
        }
    }
    renderDetail(element, templateData) {
        templateData.elementDisposables.add(autorun((reader) => {
            this._renderDetail(element, templateData);
        }));
    }
    _renderDetail(element, templateData) {
        dom.clearNode(templateData.detail);
        if (element.agentOrSlashCommandDetected) {
            const msg = element.slashCommand
                ? localize('usedAgentSlashCommand', 'used {0} [[(rerun without)]]', `${chatSubcommandLeader}${element.slashCommand.name}`)
                : localize('usedAgent', '[[(rerun without)]]');
            dom.reset(templateData.detail, renderFormattedText(msg, {
                className: 'agentOrSlashCommandDetected',
                inline: true,
                actionHandler: {
                    disposables: templateData.elementDisposables,
                    callback: (content) => {
                        this._onDidClickRerunWithAgentOrCommandDetection.fire(element);
                    },
                },
            }));
        }
        else if (this.rendererOptions.renderStyle !== 'minimal' &&
            !element.isComplete &&
            !checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse)) {
            if (element.model.isPaused.get()) {
                templateData.detail.textContent = localize('paused', 'Paused');
            }
            else {
                templateData.detail.textContent = localize('working', 'Working');
            }
        }
    }
    renderConfirmationAction(element, templateData) {
        dom.clearNode(templateData.detail);
        if (element.confirmation) {
            templateData.detail.textContent = localize('chatConfirmationAction', 'selected "{0}"', element.confirmation);
        }
    }
    renderAvatar(element, templateData) {
        const icon = isResponseVM(element)
            ? this.getAgentIcon(element.agent?.metadata)
            : (element.avatarIcon ?? Codicon.account);
        if (icon instanceof URI) {
            const avatarIcon = dom.$('img.icon');
            avatarIcon.src = FileAccess.uriToBrowserUri(icon).toString(true);
            templateData.avatarContainer.replaceChildren(dom.$('.avatar', undefined, avatarIcon));
        }
        else {
            const avatarIcon = dom.$(ThemeIcon.asCSSSelector(icon));
            templateData.avatarContainer.replaceChildren(dom.$('.avatar.codicon-avatar', undefined, avatarIcon));
        }
    }
    getAgentIcon(agent) {
        if (agent?.themeIcon) {
            return agent.themeIcon;
        }
        else if (agent?.iconDark && this.themeService.getColorTheme().type === ColorScheme.DARK) {
            return agent.iconDark;
        }
        else if (agent?.icon) {
            return agent.icon;
        }
        else {
            return Codicon.copilot;
        }
    }
    basicRenderElement(element, index, templateData) {
        templateData.rowContainer.classList.toggle('chat-response-loading', isResponseVM(element) && !element.isComplete);
        let value = [];
        if (isRequestVM(element) && !element.confirmation) {
            const markdown = 'message' in element.message
                ? element.message.message
                : this.markdownDecorationsRenderer.convertParsedRequestToMarkdown(element.message);
            value = [{ content: new MarkdownString(markdown), kind: 'markdownContent' }];
            if (this.rendererOptions.renderStyle === 'minimal' && !element.isComplete) {
                templateData.value.classList.add('inline-progress');
                templateData.elementDisposables.add(toDisposable(() => templateData.value.classList.remove('inline-progress')));
                value.push({
                    content: new MarkdownString('<span></span>', { supportHtml: true }),
                    kind: 'markdownContent',
                });
            }
            else {
                templateData.value.classList.remove('inline-progress');
            }
        }
        else if (isResponseVM(element)) {
            if (element.contentReferences.length) {
                value.push({ kind: 'references', references: element.contentReferences });
            }
            value.push(...annotateSpecialMarkdownContent(element.response.value));
            if (element.codeCitations.length) {
                value.push({ kind: 'codeCitations', citations: element.codeCitations });
            }
        }
        dom.clearNode(templateData.value);
        if (isResponseVM(element)) {
            this.renderDetail(element, templateData);
        }
        const isFiltered = !!(isResponseVM(element) && element.errorDetails?.responseIsFiltered);
        const parts = [];
        if (!isFiltered) {
            let inlineSlashCommandRendered = false;
            value.forEach((data, index) => {
                const context = {
                    element,
                    contentIndex: index,
                    content: value,
                    preceedingContentParts: parts,
                };
                const newPart = this.renderChatContentPart(data, templateData, context);
                if (newPart) {
                    if (this.rendererOptions.renderDetectedCommandsWithRequest &&
                        !inlineSlashCommandRendered &&
                        isRequestVM(element) &&
                        element.agentOrSlashCommandDetected &&
                        element.slashCommand &&
                        data.kind === 'markdownContent' // TODO this is fishy but I didn't find a better way to render on the same inline as the MD request part
                    ) {
                        if (newPart.domNode) {
                            newPart.domNode.style.display = 'inline-flex';
                        }
                        const cmdPart = this.instantiationService.createInstance(ChatAgentCommandContentPart, element.slashCommand, () => this._onDidClickRerunWithAgentOrCommandDetection.fire({
                            sessionId: element.sessionId,
                            requestId: element.id,
                        }));
                        templateData.value.appendChild(cmdPart.domNode);
                        parts.push(cmdPart);
                        inlineSlashCommandRendered = true;
                    }
                    if (newPart.domNode) {
                        templateData.value.appendChild(newPart.domNode);
                    }
                    parts.push(newPart);
                }
            });
        }
        if (templateData.renderedParts) {
            dispose(templateData.renderedParts);
        }
        templateData.renderedParts = parts;
        if (!isFiltered) {
            if (isRequestVM(element) && element.variables.length) {
                const newPart = this.renderAttachments(element.variables, element.contentReferences, templateData);
                if (newPart) {
                    if (newPart.domNode) {
                        // p has a :last-child rule for margin
                        templateData.value.appendChild(newPart.domNode);
                    }
                    templateData.elementDisposables.add(newPart);
                }
            }
        }
        if (isResponseVM(element) && element.errorDetails?.message) {
            if (element.errorDetails.isQuotaExceeded) {
                const renderedError = this.instantiationService.createInstance(ChatQuotaExceededPart, element, this.renderer);
                templateData.elementDisposables.add(renderedError);
                templateData.value.appendChild(renderedError.domNode);
                templateData.elementDisposables.add(renderedError.onDidChangeHeight(() => this.updateItemHeight(templateData)));
            }
            else {
                const level = element.errorDetails.level ??
                    (element.errorDetails.responseIsFiltered ? ChatErrorLevel.Info : ChatErrorLevel.Error);
                const renderedError = this.instantiationService.createInstance(ChatWarningContentPart, level, new MarkdownString(element.errorDetails.message), this.renderer);
                templateData.elementDisposables.add(renderedError);
                templateData.value.appendChild(renderedError.domNode);
            }
        }
        const newHeight = templateData.rowContainer.offsetHeight;
        const fireEvent = !element.currentRenderedHeight || element.currentRenderedHeight !== newHeight;
        element.currentRenderedHeight = newHeight;
        if (fireEvent) {
            const disposable = templateData.elementDisposables.add(dom.scheduleAtNextAnimationFrame(dom.getWindow(templateData.value), () => {
                // Have to recompute the height here because codeblock rendering is currently async and it may have changed.
                // If it becomes properly sync, then this could be removed.
                element.currentRenderedHeight = templateData.rowContainer.offsetHeight;
                disposable.dispose();
                this._onDidChangeItemHeight.fire({ element, height: element.currentRenderedHeight });
            }));
        }
    }
    updateItemHeight(templateData) {
        if (!templateData.currentElement) {
            return;
        }
        const newHeight = Math.max(templateData.rowContainer.offsetHeight, 1);
        templateData.currentElement.currentRenderedHeight = newHeight;
        this._onDidChangeItemHeight.fire({ element: templateData.currentElement, height: newHeight });
    }
    /**
     *	@returns true if progressive rendering should be considered complete- the element's data is fully rendered or the view is not visible
     */
    doNextProgressiveRender(element, index, templateData, isInRenderElement) {
        if (!this._isVisible) {
            return true;
        }
        if (element.isCanceled) {
            this.traceLayout('doNextProgressiveRender', `canceled, index=${index}`);
            element.renderData = undefined;
            this.basicRenderElement(element, index, templateData);
            return true;
        }
        templateData.rowContainer.classList.toggle('chat-response-loading', true);
        this.traceLayout('doNextProgressiveRender', `START progressive render, index=${index}, renderData=${JSON.stringify(element.renderData)}`);
        const contentForThisTurn = this.getNextProgressiveRenderContent(element);
        const partsToRender = this.diff(templateData.renderedParts ?? [], contentForThisTurn.content, element);
        const contentIsAlreadyRendered = partsToRender.every((part) => part === null);
        if (contentIsAlreadyRendered) {
            if (contentForThisTurn.moreContentAvailable) {
                // The content that we want to render in this turn is already rendered, but there is more content to render on the next tick
                this.traceLayout('doNextProgressiveRender', 'not rendering any new content this tick, but more available');
                return false;
            }
            else if (element.isComplete) {
                // All content is rendered, and response is done, so do a normal render
                this.traceLayout('doNextProgressiveRender', `END progressive render, index=${index} and clearing renderData, response is complete`);
                element.renderData = undefined;
                this.basicRenderElement(element, index, templateData);
                return true;
            }
            else {
                // Nothing new to render, stop rendering until next model update
                this.traceLayout('doNextProgressiveRender', 'caught up with the stream- no new content to render');
                if (!templateData.renderedParts) {
                    // First render? Initialize currentRenderedHeight. https://github.com/microsoft/vscode/issues/232096
                    const height = templateData.rowContainer.offsetHeight;
                    element.currentRenderedHeight = height;
                }
                return true;
            }
        }
        // Do an actual progressive render
        this.traceLayout('doNextProgressiveRender', `doing progressive render, ${partsToRender.length} parts to render`);
        this.renderChatContentDiff(partsToRender, contentForThisTurn.content, element, templateData);
        const height = templateData.rowContainer.offsetHeight;
        element.currentRenderedHeight = height;
        if (!isInRenderElement) {
            this._onDidChangeItemHeight.fire({ element, height });
        }
        return false;
    }
    renderChatContentDiff(partsToRender, contentForThisTurn, element, templateData) {
        const renderedParts = templateData.renderedParts ?? [];
        templateData.renderedParts = renderedParts;
        partsToRender.forEach((partToRender, index) => {
            if (!partToRender) {
                // null=no change
                return;
            }
            const alreadyRenderedPart = templateData.renderedParts?.[index];
            if (alreadyRenderedPart) {
                alreadyRenderedPart.dispose();
            }
            const preceedingContentParts = renderedParts.slice(0, index);
            const context = {
                element,
                content: contentForThisTurn,
                preceedingContentParts,
                contentIndex: index,
            };
            const newPart = this.renderChatContentPart(partToRender, templateData, context);
            if (newPart) {
                renderedParts[index] = newPart;
                // Maybe the part can't be rendered in this context, but this shouldn't really happen
                try {
                    if (alreadyRenderedPart?.domNode) {
                        if (newPart.domNode) {
                            // This method can throw HierarchyRequestError
                            alreadyRenderedPart.domNode.replaceWith(newPart.domNode);
                        }
                        else {
                            alreadyRenderedPart.domNode.remove();
                        }
                    }
                    else if (newPart.domNode) {
                        templateData.value.appendChild(newPart.domNode);
                    }
                }
                catch (err) {
                    this.logService.error('ChatListItemRenderer#renderChatContentDiff: error replacing part', err);
                }
            }
            else {
                alreadyRenderedPart?.domNode?.remove();
            }
        });
    }
    /**
     * Returns all content parts that should be rendered, and trimmed markdown content. We will diff this with the current rendered set.
     */
    getNextProgressiveRenderContent(element) {
        const data = this.getDataForProgressiveRender(element);
        const renderableResponse = annotateSpecialMarkdownContent(element.response.value);
        this.traceLayout('getNextProgressiveRenderContent', `Want to render ${data.numWordsToRender} at ${data.rate} words/s, counting...`);
        let numNeededWords = data.numWordsToRender;
        const partsToRender = [];
        // Always add the references to avoid shifting the content parts when a reference is added, and having to re-diff all the content.
        // The part will hide itself if the list is empty.
        partsToRender.push({ kind: 'references', references: element.contentReferences });
        let moreContentAvailable = false;
        for (let i = 0; i < renderableResponse.length; i++) {
            const part = renderableResponse[i];
            if (part.kind === 'markdownContent') {
                const wordCountResult = getNWords(part.content.value, numNeededWords);
                this.traceLayout('getNextProgressiveRenderContent', `  Chunk ${i}: Want to render ${numNeededWords} words and found ${wordCountResult.returnedWordCount} words. Total words in chunk: ${wordCountResult.totalWordCount}`);
                numNeededWords -= wordCountResult.returnedWordCount;
                if (wordCountResult.isFullString) {
                    partsToRender.push(part);
                    // Consumed full markdown chunk- need to ensure that all following non-markdown parts are rendered
                    for (const nextPart of renderableResponse.slice(i + 1)) {
                        if (nextPart.kind !== 'markdownContent') {
                            i++;
                            partsToRender.push(nextPart);
                        }
                        else {
                            break;
                        }
                    }
                }
                else {
                    // Only taking part of this markdown part
                    moreContentAvailable = true;
                    partsToRender.push({
                        ...part,
                        content: new MarkdownString(wordCountResult.value, part.content),
                    });
                }
                if (numNeededWords <= 0) {
                    // Collected all words and following non-markdown parts if needed, done
                    if (renderableResponse.slice(i + 1).some((part) => part.kind === 'markdownContent')) {
                        moreContentAvailable = true;
                    }
                    break;
                }
            }
            else {
                partsToRender.push(part);
            }
        }
        const lastWordCount = element.contentUpdateTimings?.lastWordCount ?? 0;
        const newRenderedWordCount = data.numWordsToRender - numNeededWords;
        const bufferWords = lastWordCount - newRenderedWordCount;
        this.traceLayout('getNextProgressiveRenderContent', `Want to render ${data.numWordsToRender} words. Rendering ${newRenderedWordCount} words. Buffer: ${bufferWords} words`);
        if (newRenderedWordCount > 0 &&
            newRenderedWordCount !== element.renderData?.renderedWordCount) {
            // Only update lastRenderTime when we actually render new content
            element.renderData = {
                lastRenderTime: Date.now(),
                renderedWordCount: newRenderedWordCount,
                renderedParts: partsToRender,
            };
        }
        if (this.shouldShowWorkingProgress(element, partsToRender)) {
            const isPaused = element.model.isPaused.get();
            partsToRender.push({ kind: 'working', isPaused });
        }
        return { content: partsToRender, moreContentAvailable };
    }
    shouldShowWorkingProgress(element, partsToRender) {
        if (element.agentOrSlashCommandDetected ||
            this.rendererOptions.renderStyle === 'minimal' ||
            element.isComplete ||
            !checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse)) {
            return false;
        }
        if (element.model.isPaused.get()) {
            return true;
        }
        // Show if no content, only "used references", ends with a complete tool call, or ends with complete text edits and there is no incomplete tool call (edits are still being applied some time after they are all generated)
        const lastPart = partsToRender.at(-1);
        if (!lastPart ||
            lastPart.kind === 'references' ||
            (lastPart.kind === 'toolInvocation' &&
                (lastPart.isComplete || lastPart.presentation === 'hidden')) ||
            ((lastPart.kind === 'textEditGroup' || lastPart.kind === 'notebookEditGroup') &&
                lastPart.done &&
                !partsToRender.some((part) => part.kind === 'toolInvocation' && !part.isComplete))) {
            return true;
        }
        return false;
    }
    getDataForProgressiveRender(element) {
        const renderData = element.renderData ?? { lastRenderTime: 0, renderedWordCount: 0 };
        const rate = this.getProgressiveRenderRate(element);
        const numWordsToRender = renderData.lastRenderTime === 0
            ? 1
            : renderData.renderedWordCount +
                // Additional words to render beyond what's already rendered
                Math.floor(((Date.now() - renderData.lastRenderTime) / 1000) * rate);
        return {
            numWordsToRender,
            rate,
        };
    }
    diff(renderedParts, contentToRender, element) {
        const diff = [];
        for (let i = 0; i < contentToRender.length; i++) {
            const content = contentToRender[i];
            const renderedPart = renderedParts[i];
            if (!renderedPart ||
                !renderedPart.hasSameContent(content, contentToRender.slice(i + 1), element)) {
                diff.push(content);
            }
            else {
                // null -> no change
                diff.push(null);
            }
        }
        return diff;
    }
    renderChatContentPart(content, templateData, context) {
        if (content.kind === 'treeData') {
            return this.renderTreeData(content, templateData, context);
        }
        else if (content.kind === 'progressMessage') {
            return this.instantiationService.createInstance(ChatProgressContentPart, content, this.renderer, context, undefined, undefined, undefined);
        }
        else if (content.kind === 'progressTask') {
            return this.renderProgressTask(content, templateData, context);
        }
        else if (content.kind === 'command') {
            return this.instantiationService.createInstance(ChatCommandButtonContentPart, content, context);
        }
        else if (content.kind === 'textEditGroup') {
            return this.renderTextEdit(context, content, templateData);
        }
        else if (content.kind === 'confirmation') {
            return this.renderConfirmation(context, content, templateData);
        }
        else if (content.kind === 'warning') {
            return this.instantiationService.createInstance(ChatWarningContentPart, ChatErrorLevel.Warning, content.content, this.renderer);
        }
        else if (content.kind === 'markdownContent') {
            return this.renderMarkdown(content, templateData, context);
        }
        else if (content.kind === 'references') {
            return this.renderContentReferencesListData(content, undefined, context, templateData);
        }
        else if (content.kind === 'codeCitations') {
            return this.renderCodeCitations(content, context, templateData);
        }
        else if (content.kind === 'toolInvocation' || content.kind === 'toolInvocationSerialized') {
            return this.renderToolInvocation(content, context, templateData);
        }
        else if (content.kind === 'working') {
            return this.renderWorkingProgress(content, context);
        }
        else if (content.kind === 'undoStop') {
            return this.renderUndoStop(content);
        }
        return this.renderNoContent((other) => content.kind === other.kind);
    }
    renderUndoStop(content) {
        return this.renderNoContent((other) => other.kind === content.kind && other.id === content.id);
    }
    renderNoContent(equals) {
        return {
            dispose: () => { },
            domNode: undefined,
            hasSameContent: equals,
        };
    }
    renderTreeData(content, templateData, context) {
        const data = content.treeData;
        const treeDataIndex = context.preceedingContentParts.filter((part) => part instanceof ChatTreeContentPart).length;
        const treePart = this.instantiationService.createInstance(ChatTreeContentPart, data, context.element, this._treePool, treeDataIndex);
        treePart.addDisposable(treePart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        if (isResponseVM(context.element)) {
            const fileTreeFocusInfo = {
                treeDataId: data.uri.toString(),
                treeIndex: treeDataIndex,
                focus() {
                    treePart.domFocus();
                },
            };
            // TODO@roblourens there's got to be a better way to navigate trees
            treePart.addDisposable(treePart.onDidFocus(() => {
                this.focusedFileTreesByResponseId.set(context.element.id, fileTreeFocusInfo.treeIndex);
            }));
            const fileTrees = this.fileTreesByResponseId.get(context.element.id) ?? [];
            fileTrees.push(fileTreeFocusInfo);
            this.fileTreesByResponseId.set(context.element.id, distinct(fileTrees, (v) => v.treeDataId));
            treePart.addDisposable(toDisposable(() => this.fileTreesByResponseId.set(context.element.id, fileTrees.filter((v) => v.treeDataId !== data.uri.toString()))));
        }
        return treePart;
    }
    renderContentReferencesListData(references, labelOverride, context, templateData) {
        const referencesPart = this.instantiationService.createInstance(ChatUsedReferencesListContentPart, references.references, labelOverride, context, this._contentReferencesListPool, {
            expandedWhenEmptyResponse: checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.referencesExpandedWhenEmptyResponse),
        });
        referencesPart.addDisposable(referencesPart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        return referencesPart;
    }
    renderCodeCitations(citations, context, templateData) {
        const citationsPart = this.instantiationService.createInstance(ChatCodeCitationContentPart, citations, context);
        return citationsPart;
    }
    getCodeBlockStartIndex(context) {
        return context.preceedingContentParts.reduce((acc, part) => acc + (part.codeblocks?.length ?? 0), 0);
    }
    handleRenderedCodeblocks(element, part, codeBlockStartIndex) {
        if (!part.addDisposable || part.codeblocksPartId === undefined) {
            return;
        }
        const codeBlocksByResponseId = this.codeBlocksByResponseId.get(element.id) ?? [];
        this.codeBlocksByResponseId.set(element.id, codeBlocksByResponseId);
        part.addDisposable(toDisposable(() => {
            const codeBlocksByResponseId = this.codeBlocksByResponseId.get(element.id);
            if (codeBlocksByResponseId) {
                // Only delete if this is my code block
                part.codeblocks?.forEach((info, i) => {
                    const codeblock = codeBlocksByResponseId[codeBlockStartIndex + i];
                    if (codeblock?.ownerMarkdownPartId === part.codeblocksPartId) {
                        delete codeBlocksByResponseId[codeBlockStartIndex + i];
                    }
                });
            }
        }));
        part.codeblocks?.forEach((info, i) => {
            codeBlocksByResponseId[codeBlockStartIndex + i] = info;
            part.addDisposable(thenIfNotDisposed(info.uriPromise, (uri) => {
                if (!uri) {
                    return;
                }
                this.codeBlocksByEditorUri.set(uri, info);
                part.addDisposable(toDisposable(() => {
                    const codeblock = this.codeBlocksByEditorUri.get(uri);
                    if (codeblock?.ownerMarkdownPartId === part.codeblocksPartId) {
                        this.codeBlocksByEditorUri.delete(uri);
                    }
                }));
            }));
        });
    }
    renderToolInvocation(toolInvocation, context, templateData) {
        const codeBlockStartIndex = this.getCodeBlockStartIndex(context);
        const part = this.instantiationService.createInstance(ChatToolInvocationPart, toolInvocation, context, this.renderer, this._contentReferencesListPool, this._toolEditorPool, () => this._currentLayoutWidth, this._toolInvocationCodeBlockCollection, codeBlockStartIndex);
        part.addDisposable(part.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        this.handleRenderedCodeblocks(context.element, part, codeBlockStartIndex);
        return part;
    }
    renderProgressTask(task, templateData, context) {
        if (!isResponseVM(context.element)) {
            return;
        }
        const taskPart = this.instantiationService.createInstance(ChatTaskContentPart, task, this._contentReferencesListPool, this.renderer, context);
        taskPart.addDisposable(taskPart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        return taskPart;
    }
    renderWorkingProgress(workingProgress, context) {
        return this.instantiationService.createInstance(ChatWorkingProgressContentPart, workingProgress, this.renderer, context);
    }
    renderConfirmation(context, confirmation, templateData) {
        const part = this.instantiationService.createInstance(ChatConfirmationContentPart, confirmation, context);
        part.addDisposable(part.onDidChangeHeight(() => this.updateItemHeight(templateData)));
        return part;
    }
    renderAttachments(variables, contentReferences, templateData) {
        return this.instantiationService.createInstance(ChatAttachmentsContentPart, variables, contentReferences, undefined);
    }
    renderTextEdit(context, chatTextEdit, templateData) {
        const textEditPart = this.instantiationService.createInstance(ChatTextEditContentPart, chatTextEdit, context, this.rendererOptions, this._diffEditorPool, this._currentLayoutWidth);
        textEditPart.addDisposable(textEditPart.onDidChangeHeight(() => {
            textEditPart.layout(this._currentLayoutWidth);
            this.updateItemHeight(templateData);
        }));
        return textEditPart;
    }
    renderMarkdown(markdown, templateData, context) {
        const element = context.element;
        const fillInIncompleteTokens = isResponseVM(element) &&
            (!element.isComplete ||
                element.isCanceled ||
                element.errorDetails?.responseIsFiltered ||
                element.errorDetails?.responseIsIncomplete ||
                !!element.renderData);
        const codeBlockStartIndex = this.getCodeBlockStartIndex(context);
        const markdownPart = templateData.instantiationService.createInstance(ChatMarkdownContentPart, markdown, context, this._editorPool, fillInIncompleteTokens, codeBlockStartIndex, this.renderer, this._currentLayoutWidth, this.codeBlockModelCollection, {});
        markdownPart.addDisposable(markdownPart.onDidChangeHeight(() => {
            markdownPart.layout(this._currentLayoutWidth);
            this.updateItemHeight(templateData);
        }));
        this.handleRenderedCodeblocks(element, markdownPart, codeBlockStartIndex);
        return markdownPart;
    }
    disposeElement(node, index, templateData) {
        this.traceLayout('disposeElement', `Disposing element, index=${index}`);
        templateData.elementDisposables.clear();
        // Don't retain the toolbar context which includes chat viewmodels
        if (templateData.titleToolbar) {
            templateData.titleToolbar.context = undefined;
        }
        templateData.footerToolbar.context = undefined;
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
ChatListItemRenderer = ChatListItemRenderer_1 = __decorate([
    __param(5, IInstantiationService),
    __param(6, IConfigurationService),
    __param(7, ILogService),
    __param(8, IContextKeyService),
    __param(9, IThemeService),
    __param(10, ICommandService),
    __param(11, IHoverService),
    __param(12, IChatWidgetService),
    __param(13, IChatService)
], ChatListItemRenderer);
export { ChatListItemRenderer };
let ChatListDelegate = class ChatListDelegate {
    constructor(defaultElementHeight, logService) {
        this.defaultElementHeight = defaultElementHeight;
        this.logService = logService;
    }
    _traceLayout(method, message) {
        if (forceVerboseLayoutTracing) {
            this.logService.info(`ChatListDelegate#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatListDelegate#${method}: ${message}`);
        }
    }
    getHeight(element) {
        const kind = isRequestVM(element) ? 'request' : 'response';
        const height = ('currentRenderedHeight' in element ? element.currentRenderedHeight : undefined) ??
            this.defaultElementHeight;
        this._traceLayout('getHeight', `${kind}, height=${height}`);
        return height;
    }
    getTemplateId(element) {
        return ChatListItemRenderer.ID;
    }
    hasDynamicHeight(element) {
        return true;
    }
};
ChatListDelegate = __decorate([
    __param(1, ILogService)
], ChatListDelegate);
export { ChatListDelegate };
const voteDownDetailLabels = {
    [ChatAgentVoteDownReason.IncorrectCode]: localize('incorrectCode', 'Suggested incorrect code'),
    [ChatAgentVoteDownReason.DidNotFollowInstructions]: localize('didNotFollowInstructions', "Didn't follow instructions"),
    [ChatAgentVoteDownReason.MissingContext]: localize('missingContext', 'Missing context'),
    [ChatAgentVoteDownReason.OffensiveOrUnsafe]: localize('offensiveOrUnsafe', 'Offensive or unsafe'),
    [ChatAgentVoteDownReason.PoorlyWrittenOrFormatted]: localize('poorlyWrittenOrFormatted', 'Poorly written or formatted'),
    [ChatAgentVoteDownReason.RefusedAValidRequest]: localize('refusedAValidRequest', 'Refused a valid request'),
    [ChatAgentVoteDownReason.IncompleteCode]: localize('incompleteCode', 'Incomplete code'),
    [ChatAgentVoteDownReason.WillReportIssue]: localize('reportIssue', 'Report an issue'),
    [ChatAgentVoteDownReason.Other]: localize('other', 'Other'),
};
let ChatVoteDownButton = class ChatVoteDownButton extends DropdownMenuActionViewItem {
    constructor(action, options, commandService, issueService, logService, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            classNames: ThemeIcon.asClassNameArray(Codicon.thumbsdown),
        });
        this.commandService = commandService;
        this.issueService = issueService;
        this.logService = logService;
    }
    getActions() {
        return [
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.IncorrectCode),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.DidNotFollowInstructions),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.IncompleteCode),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.MissingContext),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.PoorlyWrittenOrFormatted),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.RefusedAValidRequest),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.OffensiveOrUnsafe),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.Other),
            {
                id: 'reportIssue',
                label: voteDownDetailLabels[ChatAgentVoteDownReason.WillReportIssue],
                tooltip: '',
                enabled: true,
                class: undefined,
                run: async (context) => {
                    if (!isResponseVM(context)) {
                        this.logService.error('ChatVoteDownButton#run: invalid context');
                        return;
                    }
                    await this.commandService.executeCommand(MarkUnhelpfulActionId, context, ChatAgentVoteDownReason.WillReportIssue);
                    await this.issueService.openReporter({ extensionId: context.agent?.extensionId.value });
                },
            },
        ];
    }
    render(container) {
        super.render(container);
        this.element?.classList.toggle('checked', this.action.checked);
    }
    getVoteDownDetailAction(reason) {
        const label = voteDownDetailLabels[reason];
        return {
            id: MarkUnhelpfulActionId,
            label,
            tooltip: '',
            enabled: true,
            checked: this._context.voteDownReason === reason,
            class: undefined,
            run: async (context) => {
                if (!isResponseVM(context)) {
                    this.logService.error('ChatVoteDownButton#getVoteDownDetailAction: invalid context');
                    return;
                }
                await this.commandService.executeCommand(MarkUnhelpfulActionId, context, reason);
            },
        };
    }
};
ChatVoteDownButton = __decorate([
    __param(2, ICommandService),
    __param(3, IWorkbenchIssueService),
    __param(4, ILogService),
    __param(5, IContextMenuService)
], ChatVoteDownButton);
export { ChatVoteDownButton };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdExpc3RSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0TGlzdFJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRWpGLE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUluRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVB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