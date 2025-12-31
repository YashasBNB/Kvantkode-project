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
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { CommentNode, ResourceWithCommentThreads } from '../common/commentModel.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IListService, WorkbenchObjectTree, } from '../../../../platform/list/browser/listService.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TimestampWidget } from './timestamp.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { commentViewThreadStateColorVar, getCommentThreadStateIconColor } from './commentColors.js';
import { CommentThreadApplicability, CommentThreadState, } from '../../../../editor/common/languages.js';
import { FilterOptions } from './commentsFilterOptions.js';
import { basename } from '../../../../base/common/resources.js';
import { openLinkFromMarkdown } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { CommentsModel } from './commentsModel.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { ActionBar, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { createActionViewItem, getContextMenuActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
export const COMMENTS_VIEW_ID = 'workbench.panel.comments';
export const COMMENTS_VIEW_STORAGE_ID = 'Comments';
export const COMMENTS_VIEW_TITLE = nls.localize2('comments.view.title', 'Comments');
class CommentsModelVirtualDelegate {
    static { this.RESOURCE_ID = 'resource-with-comments'; }
    static { this.COMMENT_ID = 'comment-node'; }
    getHeight(element) {
        if (element instanceof CommentNode && element.hasReply()) {
            return 44;
        }
        return 22;
    }
    getTemplateId(element) {
        if (element instanceof ResourceWithCommentThreads) {
            return CommentsModelVirtualDelegate.RESOURCE_ID;
        }
        if (element instanceof CommentNode) {
            return CommentsModelVirtualDelegate.COMMENT_ID;
        }
        return '';
    }
}
export class ResourceWithCommentsRenderer {
    constructor(labels) {
        this.labels = labels;
        this.templateId = 'resource-with-comments';
    }
    renderTemplate(container) {
        const labelContainer = dom.append(container, dom.$('.resource-container'));
        const resourceLabel = this.labels.create(labelContainer);
        const separator = dom.append(labelContainer, dom.$('.separator'));
        const owner = labelContainer.appendChild(dom.$('.owner'));
        return { resourceLabel, owner, separator };
    }
    renderElement(node, index, templateData, height) {
        templateData.resourceLabel.setFile(node.element.resource);
        templateData.separator.innerText = '\u00b7';
        if (node.element.ownerLabel) {
            templateData.owner.innerText = node.element.ownerLabel;
            templateData.separator.style.display = 'inline';
        }
        else {
            templateData.owner.innerText = '';
            templateData.separator.style.display = 'none';
        }
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
    }
}
let CommentsMenus = class CommentsMenus {
    constructor(menuService) {
        this.menuService = menuService;
    }
    getResourceActions(element) {
        const actions = this.getActions(MenuId.CommentsViewThreadActions, element);
        return { actions: actions.primary };
    }
    getResourceContextActions(element) {
        return this.getActions(MenuId.CommentsViewThreadActions, element).secondary;
    }
    setContextKeyService(service) {
        this.contextKeyService = service;
    }
    getActions(menuId, element) {
        if (!this.contextKeyService) {
            return { primary: [], secondary: [] };
        }
        const overlay = [
            ['commentController', element.owner],
            ['resourceScheme', element.resource.scheme],
            ['commentThread', element.contextValue],
            ['canReply', element.thread.canReply],
        ];
        const contextKeyService = this.contextKeyService.createOverlay(overlay);
        const menu = this.menuService.getMenuActions(menuId, contextKeyService, {
            shouldForwardArgs: true,
        });
        return getContextMenuActions(menu, 'inline');
    }
    dispose() {
        this.contextKeyService = undefined;
    }
};
CommentsMenus = __decorate([
    __param(0, IMenuService)
], CommentsMenus);
export { CommentsMenus };
let CommentNodeRenderer = class CommentNodeRenderer {
    constructor(actionViewItemProvider, menus, openerService, configurationService, hoverService, themeService) {
        this.actionViewItemProvider = actionViewItemProvider;
        this.menus = menus;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.themeService = themeService;
        this.templateId = 'comment-node';
    }
    renderTemplate(container) {
        const threadContainer = dom.append(container, dom.$('.comment-thread-container'));
        const metadataContainer = dom.append(threadContainer, dom.$('.comment-metadata-container'));
        const metadata = dom.append(metadataContainer, dom.$('.comment-metadata'));
        const icon = dom.append(metadata, dom.$('.icon'));
        const userNames = dom.append(metadata, dom.$('.user'));
        const timestamp = new TimestampWidget(this.configurationService, this.hoverService, dom.append(metadata, dom.$('.timestamp-container')));
        const relevance = dom.append(metadata, dom.$('.relevance'));
        const separator = dom.append(metadata, dom.$('.separator'));
        const commentPreview = dom.append(metadata, dom.$('.text'));
        const rangeContainer = dom.append(metadata, dom.$('.range'));
        const range = dom.$('p');
        rangeContainer.appendChild(range);
        const threadMetadata = {
            icon,
            userNames,
            timestamp,
            relevance,
            separator,
            commentPreview,
            range,
        };
        threadMetadata.separator.innerText = '\u00b7';
        const actionsContainer = dom.append(metadataContainer, dom.$('.actions'));
        const actionBar = new ActionBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider,
        });
        const snippetContainer = dom.append(threadContainer, dom.$('.comment-snippet-container'));
        const repliesMetadata = {
            container: snippetContainer,
            icon: dom.append(snippetContainer, dom.$('.icon')),
            count: dom.append(snippetContainer, dom.$('.count')),
            lastReplyDetail: dom.append(snippetContainer, dom.$('.reply-detail')),
            separator: dom.append(snippetContainer, dom.$('.separator')),
            timestamp: new TimestampWidget(this.configurationService, this.hoverService, dom.append(snippetContainer, dom.$('.timestamp-container'))),
        };
        repliesMetadata.separator.innerText = '\u00b7';
        repliesMetadata.icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.indent));
        const disposables = [threadMetadata.timestamp, repliesMetadata.timestamp];
        return { threadMetadata, repliesMetadata, actionBar, disposables };
    }
    getCountString(commentCount) {
        if (commentCount > 2) {
            return nls.localize('commentsCountReplies', '{0} replies', commentCount - 1);
        }
        else if (commentCount === 2) {
            return nls.localize('commentsCountReply', '1 reply');
        }
        else {
            return nls.localize('commentCount', '1 comment');
        }
    }
    getRenderedComment(commentBody, disposables) {
        const renderedComment = renderMarkdown(commentBody, {
            inline: true,
            actionHandler: {
                callback: (link) => openLinkFromMarkdown(this.openerService, link, commentBody.isTrusted),
                disposables: disposables,
            },
        });
        const images = renderedComment.element.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const textDescription = dom.$('');
            textDescription.textContent = image.alt
                ? nls.localize('imageWithLabel', 'Image: {0}', image.alt)
                : nls.localize('image', 'Image');
            image.parentNode.replaceChild(textDescription, image);
        }
        const headings = [
            ...renderedComment.element.getElementsByTagName('h1'),
            ...renderedComment.element.getElementsByTagName('h2'),
            ...renderedComment.element.getElementsByTagName('h3'),
            ...renderedComment.element.getElementsByTagName('h4'),
            ...renderedComment.element.getElementsByTagName('h5'),
            ...renderedComment.element.getElementsByTagName('h6'),
        ];
        for (const heading of headings) {
            const textNode = document.createTextNode(heading.textContent || '');
            heading.parentNode.replaceChild(textNode, heading);
        }
        while (renderedComment.element.children.length > 1 &&
            renderedComment.element.firstElementChild?.tagName === 'HR') {
            renderedComment.element.removeChild(renderedComment.element.firstElementChild);
        }
        return renderedComment;
    }
    getIcon(threadState) {
        if (threadState === CommentThreadState.Unresolved) {
            return Codicon.commentUnresolved;
        }
        else {
            return Codicon.comment;
        }
    }
    renderElement(node, index, templateData, height) {
        templateData.actionBar.clear();
        const commentCount = node.element.replies.length + 1;
        if (node.element.threadRelevance === CommentThreadApplicability.Outdated) {
            templateData.threadMetadata.relevance.style.display = '';
            templateData.threadMetadata.relevance.innerText = nls.localize('outdated', 'Outdated');
            templateData.threadMetadata.separator.style.display = 'none';
        }
        else {
            templateData.threadMetadata.relevance.innerText = '';
            templateData.threadMetadata.relevance.style.display = 'none';
            templateData.threadMetadata.separator.style.display = '';
        }
        templateData.threadMetadata.icon.classList.remove(...Array.from(templateData.threadMetadata.icon.classList.values()).filter((value) => value.startsWith('codicon')));
        templateData.threadMetadata.icon.classList.add(...ThemeIcon.asClassNameArray(this.getIcon(node.element.threadState)));
        if (node.element.threadState !== undefined) {
            const color = this.getCommentThreadWidgetStateColor(node.element.threadState, this.themeService.getColorTheme());
            templateData.threadMetadata.icon.style.setProperty(commentViewThreadStateColorVar, `${color}`);
            templateData.threadMetadata.icon.style.color = `var(${commentViewThreadStateColorVar})`;
        }
        templateData.threadMetadata.userNames.textContent = node.element.comment.userName;
        templateData.threadMetadata.timestamp.setTimestamp(node.element.comment.timestamp ? new Date(node.element.comment.timestamp) : undefined);
        const originalComment = node.element;
        templateData.threadMetadata.commentPreview.innerText = '';
        templateData.threadMetadata.commentPreview.style.height = '22px';
        if (typeof originalComment.comment.body === 'string') {
            templateData.threadMetadata.commentPreview.innerText = originalComment.comment.body;
        }
        else {
            const disposables = new DisposableStore();
            templateData.disposables.push(disposables);
            const renderedComment = this.getRenderedComment(originalComment.comment.body, disposables);
            templateData.disposables.push(renderedComment);
            for (let i = renderedComment.element.children.length - 1; i >= 1; i--) {
                renderedComment.element.removeChild(renderedComment.element.children[i]);
            }
            templateData.threadMetadata.commentPreview.appendChild(renderedComment.element);
            templateData.disposables.push(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.threadMetadata.commentPreview, renderedComment.element.textContent ?? ''));
        }
        if (node.element.range) {
            if (node.element.range.startLineNumber === node.element.range.endLineNumber) {
                templateData.threadMetadata.range.textContent = nls.localize('commentLine', '[Ln {0}]', node.element.range.startLineNumber);
            }
            else {
                templateData.threadMetadata.range.textContent = nls.localize('commentRange', '[Ln {0}-{1}]', node.element.range.startLineNumber, node.element.range.endLineNumber);
            }
        }
        const menuActions = this.menus.getResourceActions(node.element);
        templateData.actionBar.push(menuActions.actions, { icon: true, label: false });
        templateData.actionBar.context = {
            commentControlHandle: node.element.controllerHandle,
            commentThreadHandle: node.element.threadHandle,
            $mid: 7 /* MarshalledId.CommentThread */,
        };
        if (!node.element.hasReply()) {
            templateData.repliesMetadata.container.style.display = 'none';
            return;
        }
        templateData.repliesMetadata.container.style.display = '';
        templateData.repliesMetadata.count.textContent = this.getCountString(commentCount);
        const lastComment = node.element.replies[node.element.replies.length - 1].comment;
        templateData.repliesMetadata.lastReplyDetail.textContent = nls.localize('lastReplyFrom', 'Last reply from {0}', lastComment.userName);
        templateData.repliesMetadata.timestamp.setTimestamp(lastComment.timestamp ? new Date(lastComment.timestamp) : undefined);
    }
    getCommentThreadWidgetStateColor(state, theme) {
        return state !== undefined ? getCommentThreadStateIconColor(state, theme) : undefined;
    }
    disposeTemplate(templateData) {
        templateData.disposables.forEach((disposeable) => disposeable.dispose());
        templateData.actionBar.dispose();
    }
};
CommentNodeRenderer = __decorate([
    __param(2, IOpenerService),
    __param(3, IConfigurationService),
    __param(4, IHoverService),
    __param(5, IThemeService)
], CommentNodeRenderer);
export { CommentNodeRenderer };
var FilterDataType;
(function (FilterDataType) {
    FilterDataType[FilterDataType["Resource"] = 0] = "Resource";
    FilterDataType[FilterDataType["Comment"] = 1] = "Comment";
})(FilterDataType || (FilterDataType = {}));
export class Filter {
    constructor(options) {
        this.options = options;
    }
    filter(element, parentVisibility) {
        if (this.options.filter === '' && this.options.showResolved && this.options.showUnresolved) {
            return 1 /* TreeVisibility.Visible */;
        }
        if (element instanceof ResourceWithCommentThreads) {
            return this.filterResourceMarkers(element);
        }
        else {
            return this.filterCommentNode(element, parentVisibility);
        }
    }
    filterResourceMarkers(resourceMarkers) {
        // Filter by text. Do not apply negated filters on resources instead use exclude patterns
        if (this.options.textFilter.text && !this.options.textFilter.negate) {
            const uriMatches = FilterOptions._filter(this.options.textFilter.text, basename(resourceMarkers.resource));
            if (uriMatches) {
                return {
                    visibility: true,
                    data: { type: 0 /* FilterDataType.Resource */, uriMatches: uriMatches || [] },
                };
            }
        }
        return 2 /* TreeVisibility.Recurse */;
    }
    filterCommentNode(comment, parentVisibility) {
        const matchesResolvedState = comment.threadState === undefined ||
            (this.options.showResolved && CommentThreadState.Resolved === comment.threadState) ||
            (this.options.showUnresolved && CommentThreadState.Unresolved === comment.threadState);
        if (!matchesResolvedState) {
            return false;
        }
        if (!this.options.textFilter.text) {
            return true;
        }
        const textMatches = 
        // Check body of comment for value
        FilterOptions._messageFilter(this.options.textFilter.text, typeof comment.comment.body === 'string'
            ? comment.comment.body
            : comment.comment.body.value) ||
            // Check first user for value
            FilterOptions._messageFilter(this.options.textFilter.text, comment.comment.userName) ||
            // Check all replies for value
            comment.replies
                .map((reply) => {
                // Check user for value
                return (FilterOptions._messageFilter(this.options.textFilter.text, reply.comment.userName) ||
                    // Check body of reply for value
                    FilterOptions._messageFilter(this.options.textFilter.text, typeof reply.comment.body === 'string'
                        ? reply.comment.body
                        : reply.comment.body.value));
            })
                .filter((value) => !!value).flat();
        // Matched and not negated
        if (textMatches.length && !this.options.textFilter.negate) {
            return { visibility: true, data: { type: 1 /* FilterDataType.Comment */, textMatches } };
        }
        // Matched and negated - exclude it only if parent visibility is not set
        if (textMatches.length &&
            this.options.textFilter.negate &&
            parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return false;
        }
        // Not matched and negated - include it only if parent visibility is not set
        if (textMatches.length === 0 &&
            this.options.textFilter.negate &&
            parentVisibility === 2 /* TreeVisibility.Recurse */) {
            return true;
        }
        return parentVisibility;
    }
}
let CommentsList = class CommentsList extends WorkbenchObjectTree {
    constructor(labels, container, options, contextKeyService, listService, instantiationService, configurationService, contextMenuService, keybindingService) {
        const delegate = new CommentsModelVirtualDelegate();
        const actionViewItemProvider = createActionViewItem.bind(undefined, instantiationService);
        const menus = instantiationService.createInstance(CommentsMenus);
        menus.setContextKeyService(contextKeyService);
        const renderers = [
            instantiationService.createInstance(ResourceWithCommentsRenderer, labels),
            instantiationService.createInstance(CommentNodeRenderer, actionViewItemProvider, menus),
        ];
        super('CommentsTree', container, delegate, renderers, {
            accessibilityProvider: options.accessibilityProvider,
            identityProvider: {
                getId: (element) => {
                    if (element instanceof CommentsModel) {
                        return 'root';
                    }
                    if (element instanceof ResourceWithCommentThreads) {
                        return `${element.uniqueOwner}-${element.id}`;
                    }
                    if (element instanceof CommentNode) {
                        return (`${element.uniqueOwner}-${element.resource.toString()}-${element.threadId}-${element.comment.uniqueIdInThread}` +
                            (element.isRoot ? '-root' : ''));
                    }
                    return '';
                },
            },
            expandOnlyOnTwistieClick: true,
            collapseByDefault: false,
            overrideStyles: options.overrideStyles,
            filter: options.filter,
            sorter: options.sorter,
            findWidgetEnabled: false,
            multipleSelectionSupport: false,
        }, instantiationService, contextKeyService, listService, configurationService);
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.menus = menus;
        this.disposables.add(this.onContextMenu((e) => this.commentsOnContextMenu(e)));
    }
    commentsOnContextMenu(treeEvent) {
        const node = treeEvent.element;
        if (!(node instanceof CommentNode)) {
            return;
        }
        const event = treeEvent.browserEvent;
        event.preventDefault();
        event.stopPropagation();
        this.setFocus([node]);
        const actions = this.menus.getResourceContextActions(node);
        if (!actions.length) {
            return;
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => treeEvent.anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, {
                        label: true,
                        keybinding: keybinding.getLabel(),
                    });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.domFocus();
                }
            },
            getActionsContext: () => ({
                commentControlHandle: node.controllerHandle,
                commentThreadHandle: node.threadHandle,
                $mid: 7 /* MarshalledId.CommentThread */,
                thread: node.thread,
            }),
        });
    }
    filterComments() {
        this.refilter();
    }
    getVisibleItemCount() {
        let filtered = 0;
        const root = this.getNode();
        for (const resourceNode of root.children) {
            for (const commentNode of resourceNode.children) {
                if (commentNode.visible && resourceNode.visible) {
                    filtered++;
                }
            }
        }
        return filtered;
    }
};
CommentsList = __decorate([
    __param(3, IContextKeyService),
    __param(4, IListService),
    __param(5, IInstantiationService),
    __param(6, IConfigurationService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService)
], CommentsList);
export { CommentsList };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNUcmVlVmlld2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c1RyZWVWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRTdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQVNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sWUFBWSxFQUVaLG1CQUFtQixHQUNuQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNuRyxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGtCQUFrQixHQUNsQixNQUFNLHdDQUF3QyxDQUFBO0FBRy9DLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFJckgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFDTixTQUFTLEdBRVQsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLHFCQUFxQixHQUNyQixNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHckYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBS3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUzRSxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRywwQkFBMEIsQ0FBQTtBQUMxRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxVQUFVLENBQUE7QUFDbEQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQXFCLEdBQUcsQ0FBQyxTQUFTLENBQ2pFLHFCQUFxQixFQUNyQixVQUFVLENBQ1YsQ0FBQTtBQThCRCxNQUFNLDRCQUE0QjthQUdULGdCQUFXLEdBQUcsd0JBQXdCLENBQUE7YUFDdEMsZUFBVSxHQUFHLGNBQWMsQ0FBQTtJQUVuRCxTQUFTLENBQUMsT0FBWTtRQUNyQixJQUFJLE9BQU8sWUFBWSxXQUFXLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDMUQsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRU0sYUFBYSxDQUFDLE9BQVk7UUFDaEMsSUFBSSxPQUFPLFlBQVksMEJBQTBCLEVBQUUsQ0FBQztZQUNuRCxPQUFPLDRCQUE0QixDQUFDLFdBQVcsQ0FBQTtRQUNoRCxDQUFDO1FBQ0QsSUFBSSxPQUFPLFlBQVksV0FBVyxFQUFFLENBQUM7WUFDcEMsT0FBTyw0QkFBNEIsQ0FBQyxVQUFVLENBQUE7UUFDL0MsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQzs7QUFHRixNQUFNLE9BQU8sNEJBQTRCO0lBS3hDLFlBQW9CLE1BQXNCO1FBQXRCLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBRjFDLGVBQVUsR0FBVyx3QkFBd0IsQ0FBQTtJQUVBLENBQUM7SUFFOUMsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUV6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsYUFBYSxDQUNaLElBQTJDLEVBQzNDLEtBQWEsRUFDYixZQUFtQyxFQUNuQyxNQUEwQjtRQUUxQixZQUFZLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3pELFlBQVksQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUUzQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDN0IsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUE7WUFDdEQsWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQTtRQUNoRCxDQUFDO2FBQU0sQ0FBQztZQUNQLFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtZQUNqQyxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQW1DO1FBQ2xELFlBQVksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDckMsQ0FBQztDQUNEO0FBRU0sSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYTtJQUd6QixZQUEyQyxXQUF5QjtRQUF6QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztJQUFHLENBQUM7SUFFeEUsa0JBQWtCLENBQUMsT0FBb0I7UUFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMseUJBQXlCLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDcEMsQ0FBQztJQUVELHlCQUF5QixDQUFDLE9BQW9CO1FBQzdDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMseUJBQXlCLEVBQUUsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzVFLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxPQUEyQjtRQUN0RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFBO0lBQ2pDLENBQUM7SUFFTyxVQUFVLENBQ2pCLE1BQWMsRUFDZCxPQUFvQjtRQUVwQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDN0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFBO1FBQ3RDLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBb0I7WUFDaEMsQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDO1lBQ3BDLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDM0MsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQztZQUN2QyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztTQUNyQyxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXZFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRTtZQUN2RSxpQkFBaUIsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQTtRQUNGLE9BQU8scUJBQXFCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQTtJQUNuQyxDQUFDO0NBQ0QsQ0FBQTtBQTNDWSxhQUFhO0lBR1osV0FBQSxZQUFZLENBQUE7R0FIYixhQUFhLENBMkN6Qjs7QUFFTSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQUsvQixZQUNTLHNCQUErQyxFQUMvQyxLQUFvQixFQUNaLGFBQThDLEVBQ3ZDLG9CQUE0RCxFQUNwRSxZQUE0QyxFQUM1QyxZQUFtQztRQUwxQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQy9DLFVBQUssR0FBTCxLQUFLLENBQWU7UUFDSyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDdEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNwQyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQVJuRCxlQUFVLEdBQVcsY0FBYyxDQUFBO0lBU2hDLENBQUM7SUFFSixjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQTtRQUMzRixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBRTFFLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxlQUFlLENBQ3BDLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLFlBQVksRUFDakIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQ25ELENBQUE7UUFDRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMzRCxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4QixjQUFjLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRWpDLE1BQU0sY0FBYyxHQUFHO1lBQ3RCLElBQUk7WUFDSixTQUFTO1lBQ1QsU0FBUztZQUNULFNBQVM7WUFDVCxTQUFTO1lBQ1QsY0FBYztZQUNkLEtBQUs7U0FDTCxDQUFBO1FBQ0QsY0FBYyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBRTdDLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDekUsTUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLEVBQUU7WUFDakQsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLHNCQUFzQjtTQUNuRCxDQUFDLENBQUE7UUFFRixNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sZUFBZSxHQUFHO1lBQ3ZCLFNBQVMsRUFBRSxnQkFBZ0I7WUFDM0IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsRCxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BELGVBQWUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDckUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM1RCxTQUFTLEVBQUUsSUFBSSxlQUFlLENBQzdCLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLFlBQVksRUFDakIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FDM0Q7U0FDRCxDQUFBO1FBQ0QsZUFBZSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQzlDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUVqRixNQUFNLFdBQVcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsQ0FBQTtJQUNuRSxDQUFDO0lBRU8sY0FBYyxDQUFDLFlBQW9CO1FBQzFDLElBQUksWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzdFLENBQUM7YUFBTSxJQUFJLFlBQVksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMvQixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckQsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsV0FBNEIsRUFBRSxXQUE0QjtRQUNwRixNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUMsV0FBVyxFQUFFO1lBQ25ELE1BQU0sRUFBRSxJQUFJO1lBQ1osYUFBYSxFQUFFO2dCQUNkLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQztnQkFDekYsV0FBVyxFQUFFLFdBQVc7YUFDeEI7U0FDRCxDQUFDLENBQUE7UUFDRixNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDakMsZUFBZSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRztnQkFDdEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUM7Z0JBQ3pELENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNqQyxLQUFLLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHO1lBQ2hCLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7WUFDckQsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztZQUNyRCxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO1lBQ3JELEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7WUFDckQsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztZQUNyRCxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO1NBQ3JELENBQUE7UUFDRCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNuRSxPQUFPLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUNELE9BQ0MsZUFBZSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDM0MsZUFBZSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLEtBQUssSUFBSSxFQUMxRCxDQUFDO1lBQ0YsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQy9FLENBQUM7UUFDRCxPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0lBRU8sT0FBTyxDQUFDLFdBQWdDO1FBQy9DLElBQUksV0FBVyxLQUFLLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ25ELE9BQU8sT0FBTyxDQUFDLGlCQUFpQixDQUFBO1FBQ2pDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUNaLElBQTRCLEVBQzVCLEtBQWEsRUFDYixZQUF3QyxFQUN4QyxNQUEwQjtRQUUxQixZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTlCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDcEQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsS0FBSywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxRSxZQUFZLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtZQUN4RCxZQUFZLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDdEYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDN0QsQ0FBQzthQUFNLENBQUM7WUFDUCxZQUFZLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1lBQ3BELFlBQVksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1lBQzVELFlBQVksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFBO1FBQ3pELENBQUM7UUFFRCxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUNoRCxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDbkYsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FDM0IsQ0FDRCxDQUFBO1FBQ0QsWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDN0MsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQ3JFLENBQUE7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FDbEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQ2pDLENBQUE7WUFDRCxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUM5RixZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE9BQU8sOEJBQThCLEdBQUcsQ0FBQTtRQUN4RixDQUFDO1FBQ0QsWUFBWSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQTtRQUNqRixZQUFZLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQ2pELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FDckYsQ0FBQTtRQUNELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFFcEMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtRQUN6RCxZQUFZLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNoRSxJQUFJLE9BQU8sZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEQsWUFBWSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQ3BGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUN6QyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUMxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDMUYsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6RSxDQUFDO1lBQ0QsWUFBWSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMvRSxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FDNUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FDbEMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQ2hDLFlBQVksQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUMxQyxlQUFlLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQ3pDLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQzdFLFlBQVksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUMzRCxhQUFhLEVBQ2IsVUFBVSxFQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FDbEMsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDM0QsY0FBYyxFQUNkLGNBQWMsRUFDZCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FDaEMsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0QsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDOUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUc7WUFDaEMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0I7WUFDbkQsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZO1lBQzlDLElBQUksb0NBQTRCO1NBQ0UsQ0FBQTtRQUVuQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLFlBQVksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1lBQzdELE9BQU07UUFDUCxDQUFDO1FBRUQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7UUFDekQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbEYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtRQUNqRixZQUFZLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDdEUsZUFBZSxFQUNmLHFCQUFxQixFQUNyQixXQUFXLENBQUMsUUFBUSxDQUNwQixDQUFBO1FBQ0QsWUFBWSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUNsRCxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FDbkUsQ0FBQTtJQUNGLENBQUM7SUFFTyxnQ0FBZ0MsQ0FDdkMsS0FBcUMsRUFDckMsS0FBa0I7UUFFbEIsT0FBTyxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUN0RixDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXdDO1FBQ3ZELFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUN4RSxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2pDLENBQUM7Q0FDRCxDQUFBO0FBbFBZLG1CQUFtQjtJQVE3QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGFBQWEsQ0FBQTtHQVhILG1CQUFtQixDQWtQL0I7O0FBTUQsSUFBVyxjQUdWO0FBSEQsV0FBVyxjQUFjO0lBQ3hCLDJEQUFRLENBQUE7SUFDUix5REFBTyxDQUFBO0FBQ1IsQ0FBQyxFQUhVLGNBQWMsS0FBZCxjQUFjLFFBR3hCO0FBY0QsTUFBTSxPQUFPLE1BQU07SUFDbEIsWUFBbUIsT0FBc0I7UUFBdEIsWUFBTyxHQUFQLE9BQU8sQ0FBZTtJQUFHLENBQUM7SUFFN0MsTUFBTSxDQUNMLE9BQWlELEVBQ2pELGdCQUFnQztRQUVoQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzVGLHNDQUE2QjtRQUM5QixDQUFDO1FBRUQsSUFBSSxPQUFPLFlBQVksMEJBQTBCLEVBQUUsQ0FBQztZQUNuRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMzQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3pELENBQUM7SUFDRixDQUFDO0lBRU8scUJBQXFCLENBQzVCLGVBQTJDO1FBRTNDLHlGQUF5RjtRQUN6RixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JFLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQ3ZDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFDNUIsUUFBUSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FDbEMsQ0FBQTtZQUNELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU87b0JBQ04sVUFBVSxFQUFFLElBQUk7b0JBQ2hCLElBQUksRUFBRSxFQUFFLElBQUksaUNBQXlCLEVBQUUsVUFBVSxFQUFFLFVBQVUsSUFBSSxFQUFFLEVBQUU7aUJBQ3JFLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELHNDQUE2QjtJQUM5QixDQUFDO0lBRU8saUJBQWlCLENBQ3hCLE9BQW9CLEVBQ3BCLGdCQUFnQztRQUVoQyxNQUFNLG9CQUFvQixHQUN6QixPQUFPLENBQUMsV0FBVyxLQUFLLFNBQVM7WUFDakMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUNsRixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsS0FBSyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFdkYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDM0IsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sV0FBVztRQUNoQixrQ0FBa0M7UUFDbEMsYUFBYSxDQUFDLGNBQWMsQ0FDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUM1QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVE7WUFDdkMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSTtZQUN0QixDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUM3QjtZQUNELDZCQUE2QjtZQUM3QixhQUFhLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUNwRiw4QkFBOEI7WUFFN0IsT0FBTyxDQUFDLE9BQU87aUJBQ2IsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2QsdUJBQXVCO2dCQUN2QixPQUFPLENBQ04sYUFBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7b0JBQ2xGLGdDQUFnQztvQkFDaEMsYUFBYSxDQUFDLGNBQWMsQ0FDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUM1QixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVE7d0JBQ3JDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUk7d0JBQ3BCLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQzNCLENBQ0QsQ0FBQTtZQUNGLENBQUMsQ0FBQztpQkFDRCxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQzNCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFVCwwQkFBMEI7UUFDMUIsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxnQ0FBd0IsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFBO1FBQ2pGLENBQUM7UUFFRCx3RUFBd0U7UUFDeEUsSUFDQyxXQUFXLENBQUMsTUFBTTtZQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNO1lBQzlCLGdCQUFnQixtQ0FBMkIsRUFDMUMsQ0FBQztZQUNGLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELDRFQUE0RTtRQUM1RSxJQUNDLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNO1lBQzlCLGdCQUFnQixtQ0FBMkIsRUFDMUMsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sZ0JBQWdCLENBQUE7SUFDeEIsQ0FBQztDQUNEO0FBRU0sSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBYSxTQUFRLG1CQUdqQztJQUdBLFlBQ0MsTUFBc0IsRUFDdEIsU0FBc0IsRUFDdEIsT0FBNkIsRUFDVCxpQkFBcUMsRUFDM0MsV0FBeUIsRUFDaEIsb0JBQTJDLEVBQzNDLG9CQUEyQyxFQUM1QixrQkFBdUMsRUFDeEMsaUJBQXFDO1FBRTFFLE1BQU0sUUFBUSxHQUFHLElBQUksNEJBQTRCLEVBQUUsQ0FBQTtRQUNuRCxNQUFNLHNCQUFzQixHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUN6RixNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDN0MsTUFBTSxTQUFTLEdBQUc7WUFDakIsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDRCQUE0QixFQUFFLE1BQU0sQ0FBQztZQUN6RSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxDQUFDO1NBQ3ZGLENBQUE7UUFFRCxLQUFLLENBQ0osY0FBYyxFQUNkLFNBQVMsRUFDVCxRQUFRLEVBQ1IsU0FBUyxFQUNUO1lBQ0MscUJBQXFCLEVBQUUsT0FBTyxDQUFDLHFCQUFxQjtZQUNwRCxnQkFBZ0IsRUFBRTtnQkFDakIsS0FBSyxFQUFFLENBQUMsT0FBWSxFQUFFLEVBQUU7b0JBQ3ZCLElBQUksT0FBTyxZQUFZLGFBQWEsRUFBRSxDQUFDO3dCQUN0QyxPQUFPLE1BQU0sQ0FBQTtvQkFDZCxDQUFDO29CQUNELElBQUksT0FBTyxZQUFZLDBCQUEwQixFQUFFLENBQUM7d0JBQ25ELE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQTtvQkFDOUMsQ0FBQztvQkFDRCxJQUFJLE9BQU8sWUFBWSxXQUFXLEVBQUUsQ0FBQzt3QkFDcEMsT0FBTyxDQUNOLEdBQUcsT0FBTyxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLE9BQU8sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTs0QkFDL0csQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUMvQixDQUFBO29CQUNGLENBQUM7b0JBQ0QsT0FBTyxFQUFFLENBQUE7Z0JBQ1YsQ0FBQzthQUNEO1lBQ0Qsd0JBQXdCLEVBQUUsSUFBSTtZQUM5QixpQkFBaUIsRUFBRSxLQUFLO1lBQ3hCLGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYztZQUN0QyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDdEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3RCLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsd0JBQXdCLEVBQUUsS0FBSztTQUMvQixFQUNELG9CQUFvQixFQUNwQixpQkFBaUIsRUFDakIsV0FBVyxFQUNYLG9CQUFvQixDQUNwQixDQUFBO1FBaERxQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3hDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFnRDFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVPLHFCQUFxQixDQUM1QixTQUVDO1FBRUQsTUFBTSxJQUFJLEdBQW9FLFNBQVMsQ0FBQyxPQUFPLENBQUE7UUFDL0YsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDcEMsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBWSxTQUFTLENBQUMsWUFBWSxDQUFBO1FBRTdDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN0QixLQUFLLENBQUMsZUFBZSxFQUFFLENBQUE7UUFFdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztZQUN2QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU07WUFDakMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87WUFDekIsaUJBQWlCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDN0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDckUsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsT0FBTyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFO3dCQUN6QyxLQUFLLEVBQUUsSUFBSTt3QkFDWCxVQUFVLEVBQUUsVUFBVSxDQUFDLFFBQVEsRUFBRTtxQkFDakMsQ0FBQyxDQUFBO2dCQUNILENBQUM7Z0JBQ0QsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELE1BQU0sRUFBRSxDQUFDLFlBQXNCLEVBQUUsRUFBRTtnQkFDbEMsSUFBSSxZQUFZLEVBQUUsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQztZQUNELGlCQUFpQixFQUFFLEdBQW9DLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRCxvQkFBb0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO2dCQUMzQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsWUFBWTtnQkFDdEMsSUFBSSxvQ0FBNEI7Z0JBQ2hDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTthQUNuQixDQUFDO1NBQ0YsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGNBQWM7UUFDYixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDaEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRTNCLEtBQUssTUFBTSxZQUFZLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzFDLEtBQUssTUFBTSxXQUFXLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLFdBQVcsQ0FBQyxPQUFPLElBQUksWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNqRCxRQUFRLEVBQUUsQ0FBQTtnQkFDWCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0NBQ0QsQ0FBQTtBQW5JWSxZQUFZO0lBVXRCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0dBZlIsWUFBWSxDQW1JeEIifQ==