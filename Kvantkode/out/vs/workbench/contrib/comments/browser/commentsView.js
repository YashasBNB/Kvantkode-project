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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixXQUFXLEVBRVgsMEJBQTBCLEdBQzFCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLGVBQWUsRUFBaUMsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDbkYsT0FBTyxFQUFvQixjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8s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