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
import './media/panel.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { basename } from '../../../../base/common/resources.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { CommentNode, ResourceWithCommentThreads, } from '../common/commentModel.js';
import { ICommentService } from './commentService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { CommentsList, COMMENTS_VIEW_TITLE, Filter } from './commentsTreeViewer.js';
import { FilterViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { CommentsViewFilterFocusContextKey } from './comments.js';
import { CommentsFilters, } from './commentsViewActions.js';
import { Memento } from '../../../common/memento.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { FilterOptions } from './commentsFilterOptions.js';
import { CommentThreadApplicability, CommentThreadState, } from '../../../../editor/common/languages.js';
import { revealCommentThread } from './commentsController.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { CommentsModel, threadHasMeaningfulComments } from './commentsModel.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { AccessibleViewAction } from '../../accessibility/browser/accessibleViewActions.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
export const CONTEXT_KEY_HAS_COMMENTS = new RawContextKey('commentsView.hasComments', false);
export const CONTEXT_KEY_SOME_COMMENTS_EXPANDED = new RawContextKey('commentsView.someCommentsExpanded', false);
export const CONTEXT_KEY_COMMENT_FOCUSED = new RawContextKey('commentsView.commentFocused', false);
const VIEW_STORAGE_ID = 'commentsViewState';
function createResourceCommentsIterator(model) {
    const result = [];
    for (const m of model.resourceCommentThreads) {
        const children = [];
        for (const r of m.commentThreads) {
            if (threadHasMeaningfulComments(r.thread)) {
                children.push({ element: r });
            }
        }
        if (children.length > 0) {
            result.push({ element: m, children });
        }
    }
    return result;
}
let CommentsPanel = class CommentsPanel extends FilterViewPane {
    get focusedCommentNode() {
        const focused = this.tree?.getFocus();
        if (focused?.length === 1 && focused[0] instanceof CommentNode) {
            return focused[0];
        }
        return undefined;
    }
    get focusedCommentInfo() {
        if (!this.focusedCommentNode) {
            return;
        }
        return this.getScreenReaderInfoForNode(this.focusedCommentNode);
    }
    focusNextNode() {
        if (!this.tree) {
            return;
        }
        const focused = this.tree.getFocus()?.[0];
        if (!focused) {
            return;
        }
        let next = this.tree.navigate(focused).next();
        while (next && !(next instanceof CommentNode)) {
            next = this.tree.navigate(next).next();
        }
        if (!next) {
            return;
        }
        this.tree.setFocus([next]);
    }
    focusPreviousNode() {
        if (!this.tree) {
            return;
        }
        const focused = this.tree.getFocus()?.[0];
        if (!focused) {
            return;
        }
        let previous = this.tree.navigate(focused).previous();
        while (previous && !(previous instanceof CommentNode)) {
            previous = this.tree.navigate(previous).previous();
        }
        if (!previous) {
            return;
        }
        this.tree.setFocus([previous]);
    }
    constructor(options, instantiationService, viewDescriptorService, editorService, configurationService, contextKeyService, contextMenuService, keybindingService, openerService, themeService, commentService, hoverService, uriIdentityService, storageService, pathService) {
        const stateMemento = new Memento(VIEW_STORAGE_ID, storageService);
        const viewState = stateMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        super({
            ...options,
            filterOptions: {
                placeholder: nls.localize('comments.filter.placeholder', 'Filter (e.g. text, author)'),
                ariaLabel: nls.localize('comments.filter.ariaLabel', 'Filter comments'),
                history: viewState['filterHistory'] || [],
                text: viewState['filter'] || '',
                focusContextKey: CommentsViewFilterFocusContextKey.key,
            },
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorService = editorService;
        this.commentService = commentService;
        this.uriIdentityService = uriIdentityService;
        this.pathService = pathService;
        this.totalComments = 0;
        this.currentHeight = 0;
        this.currentWidth = 0;
        this.cachedFilterStats = undefined;
        this.onDidChangeVisibility = this.onDidChangeBodyVisibility;
        this.hasCommentsContextKey = CONTEXT_KEY_HAS_COMMENTS.bindTo(contextKeyService);
        this.someCommentsExpandedContextKey =
            CONTEXT_KEY_SOME_COMMENTS_EXPANDED.bindTo(contextKeyService);
        this.commentsFocusedContextKey = CONTEXT_KEY_COMMENT_FOCUSED.bindTo(contextKeyService);
        this.stateMemento = stateMemento;
        this.viewState = viewState;
        this.filters = this._register(new CommentsFilters({
            showResolved: this.viewState['showResolved'] !== false,
            showUnresolved: this.viewState['showUnresolved'] !== false,
            sortBy: this.viewState['sortBy'] ?? "resourceAscending" /* CommentsSortOrder.ResourceAscending */,
        }, this.contextKeyService));
        this.filter = new Filter(new FilterOptions(this.filterWidget.getFilterText(), this.filters.showResolved, this.filters.showUnresolved));
        this._register(this.filters.onDidChange((event) => {
            if (event.showResolved || event.showUnresolved) {
                this.updateFilter();
            }
            if (event.sortBy) {
                this.refresh();
            }
        }));
        this._register(this.filterWidget.onDidChangeFilterText(() => this.updateFilter()));
    }
    saveState() {
        this.viewState['filter'] = this.filterWidget.getFilterText();
        this.viewState['filterHistory'] = this.filterWidget.getHistory();
        this.viewState['showResolved'] = this.filters.showResolved;
        this.viewState['showUnresolved'] = this.filters.showUnresolved;
        this.viewState['sortBy'] = this.filters.sortBy;
        this.stateMemento.saveMemento();
        super.saveState();
    }
    render() {
        super.render();
        this._register(registerNavigableContainer({
            name: 'commentsView',
            focusNotifiers: [this, this.filterWidget],
            focusNextWidget: () => {
                if (this.filterWidget.hasFocus()) {
                    this.focus();
                }
            },
            focusPreviousWidget: () => {
                if (!this.filterWidget.hasFocus()) {
                    this.focusFilter();
                }
            },
        }));
    }
    focusFilter() {
        this.filterWidget.focus();
    }
    clearFilterText() {
        this.filterWidget.setFilterText('');
    }
    getFilterStats() {
        if (!this.cachedFilterStats) {
            this.cachedFilterStats = {
                total: this.totalComments,
                filtered: this.tree?.getVisibleItemCount() ?? 0,
            };
        }
        return this.cachedFilterStats;
    }
    updateFilter() {
        this.filter.options = new FilterOptions(this.filterWidget.getFilterText(), this.filters.showResolved, this.filters.showUnresolved);
        this.tree?.filterComments();
        this.cachedFilterStats = undefined;
        const { total, filtered } = this.getFilterStats();
        this.filterWidget.updateBadge(total === filtered || total === 0
            ? undefined
            : nls.localize('showing filtered results', 'Showing {0} of {1}', filtered, total));
        this.filterWidget.checkMoreFilters(!this.filters.showResolved || !this.filters.showUnresolved);
    }
    renderBody(container) {
        super.renderBody(container);
        container.classList.add('comments-panel');
        const domContainer = dom.append(container, dom.$('.comments-panel-container'));
        this.treeContainer = dom.append(domContainer, dom.$('.tree-container'));
        this.treeContainer.classList.add('file-icon-themable-tree', 'show-file-icons');
        this.cachedFilterStats = undefined;
        this.createTree();
        this.createMessageBox(domContainer);
        this._register(this.commentService.onDidSetAllCommentThreads(this.onAllCommentsChanged, this));
        this._register(this.commentService.onDidUpdateCommentThreads(this.onCommentsUpdated, this));
        this._register(this.commentService.onDidDeleteDataProvider(this.onDataProviderDeleted, this));
        this._register(this.onDidChangeBodyVisibility((visible) => {
            if (visible) {
                this.refresh();
            }
        }));
        this.renderComments();
    }
    focus() {
        super.focus();
        const element = this.tree?.getHTMLElement();
        if (element && dom.isActiveElement(element)) {
            return;
        }
        if (!this.commentService.commentsModel.hasCommentThreads() && this.messageBoxContainer) {
            this.messageBoxContainer.focus();
        }
        else if (this.tree) {
            this.tree.domFocus();
        }
    }
    renderComments() {
        this.treeContainer.classList.toggle('hidden', !this.commentService.commentsModel.hasCommentThreads());
        this.renderMessage();
        this.tree?.setChildren(null, createResourceCommentsIterator(this.commentService.commentsModel));
    }
    collapseAll() {
        if (this.tree) {
            this.tree.collapseAll();
            this.tree.setSelection([]);
            this.tree.setFocus([]);
            this.tree.domFocus();
            this.tree.focusFirst();
        }
    }
    expandAll() {
        if (this.tree) {
            this.tree.expandAll();
            this.tree.setSelection([]);
            this.tree.setFocus([]);
            this.tree.domFocus();
            this.tree.focusFirst();
        }
    }
    get hasRendered() {
        return !!this.tree;
    }
    layoutBodyContent(height = this.currentHeight, width = this.currentWidth) {
        if (this.messageBoxContainer) {
            this.messageBoxContainer.style.height = `${height}px`;
        }
        this.tree?.layout(height, width);
        this.currentHeight = height;
        this.currentWidth = width;
    }
    createMessageBox(parent) {
        this.messageBoxContainer = dom.append(parent, dom.$('.message-box-container'));
        this.messageBoxContainer.setAttribute('tabIndex', '0');
    }
    renderMessage() {
        this.messageBoxContainer.textContent = this.commentService.commentsModel.getMessage();
        this.messageBoxContainer.classList.toggle('hidden', this.commentService.commentsModel.hasCommentThreads());
    }
    makeCommentLocationLabel(file, range) {
        const fileLabel = basename(file);
        if (!range) {
            return nls.localize('fileCommentLabel', 'in {0}', fileLabel);
        }
        if (range.startLineNumber === range.endLineNumber) {
            return nls.localize('oneLineCommentLabel', 'at line {0} column {1} in {2}', range.startLineNumber, range.startColumn, fileLabel);
        }
        else {
            return nls.localize('multiLineCommentLabel', 'from line {0} to line {1} in {2}', range.startLineNumber, range.endLineNumber, fileLabel);
        }
    }
    makeScreenReaderLabelInfo(element, forAriaLabel) {
        const userName = element.comment.userName;
        const locationLabel = this.makeCommentLocationLabel(element.resource, element.range);
        const replyCountLabel = this.getReplyCountAsString(element, forAriaLabel);
        const bodyLabel = typeof element.comment.body === 'string' ? element.comment.body : element.comment.body.value;
        return { userName, locationLabel, replyCountLabel, bodyLabel };
    }
    getScreenReaderInfoForNode(element, forAriaLabel) {
        let accessibleViewHint = '';
        if (forAriaLabel &&
            this.configurationService.getValue("accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */)) {
            const kbLabel = this.keybindingService
                .lookupKeybinding(AccessibleViewAction.id)
                ?.getAriaLabel();
            accessibleViewHint = kbLabel
                ? nls.localize('accessibleViewHint', '\nInspect this in the accessible view ({0}).', kbLabel)
                : nls.localize('acessibleViewHintNoKbOpen', '\nInspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.');
        }
        const replies = this.getRepliesAsString(element, forAriaLabel);
        const editor = this.editorService.findEditors(element.resource);
        const codeEditor = this.editorService.activeEditorPane?.getControl();
        let relevantLines;
        if (element.range && editor?.length && isCodeEditor(codeEditor)) {
            relevantLines = codeEditor.getModel()?.getValueInRange(element.range);
            if (relevantLines) {
                relevantLines = '\nCorresponding code: \n' + relevantLines;
            }
        }
        if (!relevantLines) {
            relevantLines = '';
        }
        const labelInfo = this.makeScreenReaderLabelInfo(element, forAriaLabel);
        if (element.threadRelevance === CommentThreadApplicability.Outdated) {
            return (nls.localize('resourceWithCommentLabelOutdated', 'Outdated from {0}: {1}\n{2}\n{3}\n{4}', labelInfo.userName, labelInfo.bodyLabel, labelInfo.locationLabel, labelInfo.replyCountLabel, relevantLines) +
                replies +
                accessibleViewHint);
        }
        else {
            return (nls.localize('resourceWithCommentLabel', '{0}: {1}\n{2}\n{3}\n{4}', labelInfo.userName, labelInfo.bodyLabel, labelInfo.locationLabel, labelInfo.replyCountLabel, relevantLines) +
                replies +
                accessibleViewHint);
        }
    }
    getRepliesAsString(node, forAriaLabel) {
        if (!node.replies.length || forAriaLabel) {
            return '';
        }
        return ('\n' +
            node.replies
                .map((reply) => nls.localize('resourceWithRepliesLabel', '{0} {1}', reply.comment.userName, typeof reply.comment.body === 'string' ? reply.comment.body : reply.comment.body.value))
                .join('\n'));
    }
    getReplyCountAsString(node, forAriaLabel) {
        return node.replies.length && !forAriaLabel
            ? nls.localize('replyCount', ' {0} replies,', node.replies.length)
            : '';
    }
    createTree() {
        this.treeLabels = this._register(this.instantiationService.createInstance(ResourceLabels, this));
        this.tree = this._register(this.instantiationService.createInstance(CommentsList, this.treeLabels, this.treeContainer, {
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            selectionNavigation: true,
            filter: this.filter,
            sorter: {
                compare: (a, b) => {
                    if (a instanceof CommentsModel || b instanceof CommentsModel) {
                        return 0;
                    }
                    if (this.filters.sortBy === "updatedAtDescending" /* CommentsSortOrder.UpdatedAtDescending */) {
                        return a.lastUpdatedAt > b.lastUpdatedAt ? -1 : 1;
                    }
                    else if (this.filters.sortBy === "resourceAscending" /* CommentsSortOrder.ResourceAscending */) {
                        if (a instanceof ResourceWithCommentThreads &&
                            b instanceof ResourceWithCommentThreads) {
                            const workspaceScheme = this.pathService.defaultUriScheme;
                            if (a.resource.scheme !== b.resource.scheme &&
                                (a.resource.scheme === workspaceScheme || b.resource.scheme === workspaceScheme)) {
                                // Workspace scheme should always come first
                                return b.resource.scheme === workspaceScheme ? 1 : -1;
                            }
                            return a.resource.toString() > b.resource.toString() ? 1 : -1;
                        }
                        else if (a instanceof CommentNode &&
                            b instanceof CommentNode &&
                            a.thread.range &&
                            b.thread.range) {
                            return a.thread.range?.startLineNumber > b.thread.range?.startLineNumber ? 1 : -1;
                        }
                    }
                    return 0;
                },
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (item) => {
                    return undefined;
                },
            },
            accessibilityProvider: {
                getAriaLabel: (element) => {
                    if (element instanceof CommentsModel) {
                        return nls.localize('rootCommentsLabel', 'Comments for current workspace');
                    }
                    if (element instanceof ResourceWithCommentThreads) {
                        return nls.localize('resourceWithCommentThreadsLabel', 'Comments in {0}, full path {1}', basename(element.resource), element.resource.fsPath);
                    }
                    if (element instanceof CommentNode) {
                        return this.getScreenReaderInfoForNode(element, true);
                    }
                    return '';
                },
                getWidgetAriaLabel() {
                    return COMMENTS_VIEW_TITLE.value;
                },
            },
        }));
        this._register(this.tree.onDidOpen((e) => {
            this.openFile(e.element, e.editorOptions.pinned, e.editorOptions.preserveFocus, e.sideBySide);
        }));
        this._register(this.tree.onDidChangeModel(() => {
            this.updateSomeCommentsExpanded();
        }));
        this._register(this.tree.onDidChangeCollapseState(() => {
            this.updateSomeCommentsExpanded();
        }));
        this._register(this.tree.onDidFocus(() => this.commentsFocusedContextKey.set(true)));
        this._register(this.tree.onDidBlur(() => this.commentsFocusedContextKey.set(false)));
    }
    openFile(element, pinned, preserveFocus, sideBySide) {
        if (!element) {
            return;
        }
        if (!(element instanceof ResourceWithCommentThreads || element instanceof CommentNode)) {
            return;
        }
        const threadToReveal = element instanceof ResourceWithCommentThreads
            ? element.commentThreads[0].thread
            : element.thread;
        const commentToReveal = element instanceof ResourceWithCommentThreads ? element.commentThreads[0].comment : undefined;
        return revealCommentThread(this.commentService, this.editorService, this.uriIdentityService, threadToReveal, commentToReveal, false, pinned, preserveFocus, sideBySide);
    }
    async refresh() {
        if (!this.tree) {
            return;
        }
        if (this.isVisible()) {
            this.hasCommentsContextKey.set(this.commentService.commentsModel.hasCommentThreads());
            this.cachedFilterStats = undefined;
            this.renderComments();
            if (this.tree.getSelection().length === 0 &&
                this.commentService.commentsModel.hasCommentThreads()) {
                const firstComment = this.commentService.commentsModel.resourceCommentThreads[0].commentThreads[0];
                if (firstComment) {
                    this.tree.setFocus([firstComment]);
                    this.tree.setSelection([firstComment]);
                }
            }
        }
    }
    onAllCommentsChanged(e) {
        this.cachedFilterStats = undefined;
        this.totalComments += e.commentThreads.length;
        let unresolved = 0;
        for (const thread of e.commentThreads) {
            if (thread.state === CommentThreadState.Unresolved) {
                unresolved++;
            }
        }
        this.refresh();
    }
    onCommentsUpdated(e) {
        this.cachedFilterStats = undefined;
        this.totalComments += e.added.length;
        this.totalComments -= e.removed.length;
        let unresolved = 0;
        for (const resource of this.commentService.commentsModel.resourceCommentThreads) {
            for (const thread of resource.commentThreads) {
                if (thread.threadState === CommentThreadState.Unresolved) {
                    unresolved++;
                }
            }
        }
        this.refresh();
    }
    onDataProviderDeleted(owner) {
        this.cachedFilterStats = undefined;
        this.totalComments = 0;
        this.refresh();
    }
    updateSomeCommentsExpanded() {
        this.someCommentsExpandedContextKey.set(this.isSomeCommentsExpanded());
    }
    areAllCommentsExpanded() {
        if (!this.tree) {
            return false;
        }
        const navigator = this.tree.navigate();
        while (navigator.next()) {
            if (this.tree.isCollapsed(navigator.current())) {
                return false;
            }
        }
        return true;
    }
    isSomeCommentsExpanded() {
        if (!this.tree) {
            return false;
        }
        const navigator = this.tree.navigate();
        while (navigator.next()) {
            if (!this.tree.isCollapsed(navigator.current())) {
                return true;
            }
        }
        return false;
    }
};
CommentsPanel = __decorate([
    __param(1, IInstantiationService),
    __param(2, IViewDescriptorService),
    __param(3, IEditorService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, ICommentService),
    __param(11, IHoverService),
    __param(12, IUriIdentityService),
    __param(13, IStorageService),
    __param(14, IPathService)
], CommentsPanel);
export { CommentsPanel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQ04sV0FBVyxFQUVYLDBCQUEwQixHQUMxQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxlQUFlLEVBQWlDLE1BQU0scUJBQXFCLENBQUE7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ25GLE9BQU8sRUFBb0IsY0FBYyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUs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