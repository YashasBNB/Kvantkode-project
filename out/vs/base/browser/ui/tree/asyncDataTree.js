/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ElementsDragAndDropData } from '../list/listView.js';
import { ComposedTreeDelegate, TreeFindMode as TreeFindMode, FindFilter, FindController, } from './abstractTree.js';
import { getVisibleState, isFilterResult } from './indexTreeModel.js';
import { CompressibleObjectTree, ObjectTree, } from './objectTree.js';
import { ObjectTreeElementCollapseState, TreeError, WeakMapper, } from './tree.js';
import { createCancelablePromise, Promises, ThrottledDelayer, timeout, } from '../../../common/async.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { isCancellationError, onUnexpectedError } from '../../../common/errors.js';
import { Emitter, Event } from '../../../common/event.js';
import { Iterable } from '../../../common/iterator.js';
import { DisposableStore, dispose, toDisposable } from '../../../common/lifecycle.js';
import { isIterable } from '../../../common/types.js';
import { CancellationTokenSource } from '../../../common/cancellation.js';
import { FuzzyScore } from '../../../common/filters.js';
import { insertInto, splice } from '../../../common/arrays.js';
import { localize } from '../../../../nls.js';
function createAsyncDataTreeNode(props) {
    return {
        ...props,
        children: [],
        refreshPromise: undefined,
        stale: true,
        slow: false,
        forceExpanded: false,
    };
}
function isAncestor(ancestor, descendant) {
    if (!descendant.parent) {
        return false;
    }
    else if (descendant.parent === ancestor) {
        return true;
    }
    else {
        return isAncestor(ancestor, descendant.parent);
    }
}
function intersects(node, other) {
    return node === other || isAncestor(node, other) || isAncestor(other, node);
}
class AsyncDataTreeNodeWrapper {
    get element() {
        return this.node.element.element;
    }
    get children() {
        return this.node.children.map((node) => new AsyncDataTreeNodeWrapper(node));
    }
    get depth() {
        return this.node.depth;
    }
    get visibleChildrenCount() {
        return this.node.visibleChildrenCount;
    }
    get visibleChildIndex() {
        return this.node.visibleChildIndex;
    }
    get collapsible() {
        return this.node.collapsible;
    }
    get collapsed() {
        return this.node.collapsed;
    }
    get visible() {
        return this.node.visible;
    }
    get filterData() {
        return this.node.filterData;
    }
    constructor(node) {
        this.node = node;
    }
}
class AsyncDataTreeRenderer {
    constructor(renderer, nodeMapper, onDidChangeTwistieState) {
        this.renderer = renderer;
        this.nodeMapper = nodeMapper;
        this.onDidChangeTwistieState = onDidChangeTwistieState;
        this.renderedNodes = new Map();
        this.templateId = renderer.templateId;
    }
    renderTemplate(container) {
        const templateData = this.renderer.renderTemplate(container);
        return { templateData };
    }
    renderElement(node, index, templateData, height) {
        this.renderer.renderElement(this.nodeMapper.map(node), index, templateData.templateData, height);
    }
    renderTwistie(element, twistieElement) {
        if (element.slow) {
            twistieElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.treeItemLoading));
            return true;
        }
        else {
            twistieElement.classList.remove(...ThemeIcon.asClassNameArray(Codicon.treeItemLoading));
            return false;
        }
    }
    disposeElement(node, index, templateData, height) {
        this.renderer.disposeElement?.(this.nodeMapper.map(node), index, templateData.templateData, height);
    }
    disposeTemplate(templateData) {
        this.renderer.disposeTemplate(templateData.templateData);
    }
    dispose() {
        this.renderedNodes.clear();
    }
}
function asTreeEvent(e) {
    return {
        browserEvent: e.browserEvent,
        elements: e.elements.map((e) => e.element),
    };
}
function asTreeMouseEvent(e) {
    return {
        browserEvent: e.browserEvent,
        element: e.element && e.element.element,
        target: e.target,
    };
}
function asTreeContextMenuEvent(e) {
    return {
        browserEvent: e.browserEvent,
        element: e.element && e.element.element,
        anchor: e.anchor,
        isStickyScroll: e.isStickyScroll,
    };
}
class AsyncDataTreeElementsDragAndDropData extends ElementsDragAndDropData {
    set context(context) {
        this.data.context = context;
    }
    get context() {
        return this.data.context;
    }
    constructor(data) {
        super(data.elements.map((node) => node.element));
        this.data = data;
    }
}
function asAsyncDataTreeDragAndDropData(data) {
    if (data instanceof ElementsDragAndDropData) {
        return new AsyncDataTreeElementsDragAndDropData(data);
    }
    return data;
}
class AsyncDataTreeNodeListDragAndDrop {
    constructor(dnd) {
        this.dnd = dnd;
    }
    getDragURI(node) {
        return this.dnd.getDragURI(node.element);
    }
    getDragLabel(nodes, originalEvent) {
        if (this.dnd.getDragLabel) {
            return this.dnd.getDragLabel(nodes.map((node) => node.element), originalEvent);
        }
        return undefined;
    }
    onDragStart(data, originalEvent) {
        this.dnd.onDragStart?.(asAsyncDataTreeDragAndDropData(data), originalEvent);
    }
    onDragOver(data, targetNode, targetIndex, targetSector, originalEvent, raw = true) {
        return this.dnd.onDragOver(asAsyncDataTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, targetSector, originalEvent);
    }
    drop(data, targetNode, targetIndex, targetSector, originalEvent) {
        this.dnd.drop(asAsyncDataTreeDragAndDropData(data), targetNode && targetNode.element, targetIndex, targetSector, originalEvent);
    }
    onDragEnd(originalEvent) {
        this.dnd.onDragEnd?.(originalEvent);
    }
    dispose() {
        this.dnd.dispose();
    }
}
class AsyncFindFilter extends FindFilter {
    constructor(findProvider, // remove public
    keyboardNavigationLabelProvider, filter) {
        super(keyboardNavigationLabelProvider, filter);
        this.findProvider = findProvider;
        this.isFindSessionActive = false;
    }
    filter(element, parentVisibility) {
        const filterResult = super.filter(element, parentVisibility);
        if (!this.isFindSessionActive ||
            this.findMode === TreeFindMode.Highlight ||
            !this.findProvider.isVisible) {
            return filterResult;
        }
        const visibility = isFilterResult(filterResult) ? filterResult.visibility : filterResult;
        if (getVisibleState(visibility) === 0 /* TreeVisibility.Hidden */) {
            return 0 /* TreeVisibility.Hidden */;
        }
        return this.findProvider.isVisible(element) ? filterResult : 0 /* TreeVisibility.Hidden */;
    }
}
// TODO Fix types
class AsyncFindController extends FindController {
    constructor(tree, findProvider, filter, contextViewProvider, options) {
        super(tree, filter, contextViewProvider, options);
        this.findProvider = findProvider;
        this.filter = filter;
        this.activeSession = false;
        this.asyncWorkInProgress = false;
        this.taskQueue = new ThrottledDelayer(250);
        // Always make sure to end the session before disposing
        this.disposables.add(toDisposable(async () => {
            if (this.activeSession) {
                await this.findProvider.endSession?.();
            }
        }));
    }
    applyPattern(_pattern) {
        this.renderMessage(false);
        this.activeTokenSource?.cancel();
        this.activeTokenSource = new CancellationTokenSource();
        this.taskQueue.trigger(() => this.applyPatternAsync());
    }
    async applyPatternAsync() {
        const token = this.activeTokenSource?.token;
        if (!token || token.isCancellationRequested) {
            return;
        }
        const pattern = this.pattern;
        if (pattern === '') {
            if (this.activeSession) {
                this.asyncWorkInProgress = true;
                await this.deactivateFindSession();
                this.asyncWorkInProgress = false;
                if (!token.isCancellationRequested) {
                    this.filter.reset();
                    super.applyPattern('');
                }
            }
            return;
        }
        if (!this.activeSession) {
            this.activateFindSession();
        }
        this.asyncWorkInProgress = true;
        this.activeFindMetadata = undefined;
        const findMetadata = await this.findProvider.find(pattern, { matchType: this.matchType, findMode: this.mode }, token);
        if (token.isCancellationRequested || findMetadata === undefined) {
            return;
        }
        this.asyncWorkInProgress = false;
        this.activeFindMetadata = findMetadata;
        this.filter.reset();
        super.applyPattern(pattern);
        if (findMetadata.warningMessage) {
            this.renderMessage(true, findMetadata.warningMessage);
        }
    }
    activateFindSession() {
        this.activeSession = true;
        this.filter.isFindSessionActive = true;
        this.findProvider.startSession?.();
    }
    async deactivateFindSession() {
        this.activeSession = false;
        this.filter.isFindSessionActive = false;
        await this.findProvider.endSession?.();
    }
    render() {
        if (this.asyncWorkInProgress || !this.activeFindMetadata) {
            return;
        }
        const showNotFound = this.activeFindMetadata.matchCount === 0 && this.pattern.length > 0;
        this.renderMessage(showNotFound);
        if (this.pattern.length) {
            this.alertResults(this.activeFindMetadata.matchCount);
        }
    }
    onDidToggleChange(e) {
        // TODO@benibenj handle toggles nicely across all controllers and between controller and filter
        this.toggles.set(e.id, e.isChecked);
        this.filter.findMode = this.mode;
        this.filter.findMatchType = this.matchType;
        this.placeholder =
            this.mode === TreeFindMode.Filter
                ? localize('type to filter', 'Type to filter')
                : localize('type to search', 'Type to search');
        this.applyPattern(this.pattern);
    }
    shouldAllowFocus(node) {
        return this.shouldFocusWhenNavigating(node);
    }
    shouldFocusWhenNavigating(node) {
        if (!this.activeSession || !this.activeFindMetadata) {
            return true;
        }
        const element = node.element?.element;
        if (element && this.activeFindMetadata.isMatch(element)) {
            return true;
        }
        return !FuzzyScore.isDefault(node.filterData);
    }
}
function asObjectTreeOptions(options) {
    return (options && {
        ...options,
        collapseByDefault: true,
        identityProvider: options.identityProvider && {
            getId(el) {
                return options.identityProvider.getId(el.element);
            },
        },
        dnd: options.dnd && new AsyncDataTreeNodeListDragAndDrop(options.dnd),
        multipleSelectionController: options.multipleSelectionController && {
            isSelectionSingleChangeEvent(e) {
                return options.multipleSelectionController.isSelectionSingleChangeEvent({
                    ...e,
                    element: e.element,
                });
            },
            isSelectionRangeChangeEvent(e) {
                return options.multipleSelectionController.isSelectionRangeChangeEvent({
                    ...e,
                    element: e.element,
                });
            },
        },
        accessibilityProvider: options.accessibilityProvider && {
            ...options.accessibilityProvider,
            getPosInSet: undefined,
            getSetSize: undefined,
            getRole: options.accessibilityProvider.getRole
                ? (el) => {
                    return options.accessibilityProvider.getRole(el.element);
                }
                : () => 'treeitem',
            isChecked: options.accessibilityProvider.isChecked
                ? (e) => {
                    return !!options.accessibilityProvider?.isChecked(e.element);
                }
                : undefined,
            getAriaLabel(e) {
                return options.accessibilityProvider.getAriaLabel(e.element);
            },
            getWidgetAriaLabel() {
                return options.accessibilityProvider.getWidgetAriaLabel();
            },
            getWidgetRole: options.accessibilityProvider.getWidgetRole
                ? () => options.accessibilityProvider.getWidgetRole()
                : () => 'tree',
            getAriaLevel: options.accessibilityProvider.getAriaLevel &&
                ((node) => {
                    return options.accessibilityProvider.getAriaLevel(node.element);
                }),
            getActiveDescendantId: options.accessibilityProvider.getActiveDescendantId &&
                ((node) => {
                    return options.accessibilityProvider.getActiveDescendantId(node.element);
                }),
        },
        filter: options.filter && {
            filter(e, parentVisibility) {
                return options.filter.filter(e.element, parentVisibility);
            },
        },
        keyboardNavigationLabelProvider: options.keyboardNavigationLabelProvider && {
            ...options.keyboardNavigationLabelProvider,
            getKeyboardNavigationLabel(e) {
                return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(e.element);
            },
        },
        sorter: undefined,
        expandOnlyOnTwistieClick: typeof options.expandOnlyOnTwistieClick === 'undefined'
            ? undefined
            : typeof options.expandOnlyOnTwistieClick !== 'function'
                ? options.expandOnlyOnTwistieClick
                : (e) => options.expandOnlyOnTwistieClick(e.element),
        defaultFindVisibility: (e) => {
            if (e.hasChildren && e.stale) {
                return 1 /* TreeVisibility.Visible */;
            }
            else if (typeof options.defaultFindVisibility === 'number') {
                return options.defaultFindVisibility;
            }
            else if (typeof options.defaultFindVisibility === 'undefined') {
                return 2 /* TreeVisibility.Recurse */;
            }
            else {
                return options.defaultFindVisibility(e.element);
            }
        },
    });
}
function dfs(node, fn) {
    fn(node);
    node.children.forEach((child) => dfs(child, fn));
}
export class AsyncDataTree {
    get onDidScroll() {
        return this.tree.onDidScroll;
    }
    get onDidChangeFocus() {
        return Event.map(this.tree.onDidChangeFocus, asTreeEvent);
    }
    get onDidChangeSelection() {
        return Event.map(this.tree.onDidChangeSelection, asTreeEvent);
    }
    get onKeyDown() {
        return this.tree.onKeyDown;
    }
    get onMouseClick() {
        return Event.map(this.tree.onMouseClick, asTreeMouseEvent);
    }
    get onMouseDblClick() {
        return Event.map(this.tree.onMouseDblClick, asTreeMouseEvent);
    }
    get onContextMenu() {
        return Event.map(this.tree.onContextMenu, asTreeContextMenuEvent);
    }
    get onTap() {
        return Event.map(this.tree.onTap, asTreeMouseEvent);
    }
    get onPointer() {
        return Event.map(this.tree.onPointer, asTreeMouseEvent);
    }
    get onDidFocus() {
        return this.tree.onDidFocus;
    }
    get onDidBlur() {
        return this.tree.onDidBlur;
    }
    /**
     * To be used internally only!
     * @deprecated
     */
    get onDidChangeModel() {
        return this.tree.onDidChangeModel;
    }
    get onDidChangeCollapseState() {
        return this.tree.onDidChangeCollapseState;
    }
    get onDidUpdateOptions() {
        return this.tree.onDidUpdateOptions;
    }
    get onDidChangeStickyScrollFocused() {
        return this.tree.onDidChangeStickyScrollFocused;
    }
    get findMode() {
        return this.findController ? this.findController.mode : this.tree.findMode;
    }
    set findMode(mode) {
        this.findController ? (this.findController.mode = mode) : (this.tree.findMode = mode);
    }
    get findMatchType() {
        return this.findController ? this.findController.matchType : this.tree.findMatchType;
    }
    set findMatchType(matchType) {
        this.findController
            ? (this.findController.matchType = matchType)
            : (this.tree.findMatchType = matchType);
    }
    get expandOnlyOnTwistieClick() {
        if (typeof this.tree.expandOnlyOnTwistieClick === 'boolean') {
            return this.tree.expandOnlyOnTwistieClick;
        }
        const fn = this.tree.expandOnlyOnTwistieClick;
        return (element) => fn(this.nodes.get((element === this.root.element ? null : element)) || null);
    }
    get onDidDispose() {
        return this.tree.onDidDispose;
    }
    constructor(user, container, delegate, renderers, dataSource, options = {}) {
        this.user = user;
        this.dataSource = dataSource;
        this.nodes = new Map();
        this.subTreeRefreshPromises = new Map();
        this.refreshPromises = new Map();
        this._onDidRender = new Emitter();
        this._onDidChangeNodeSlowState = new Emitter();
        this.nodeMapper = new WeakMapper((node) => new AsyncDataTreeNodeWrapper(node));
        this.disposables = new DisposableStore();
        this.identityProvider = options.identityProvider;
        this.autoExpandSingleChildren =
            typeof options.autoExpandSingleChildren === 'undefined'
                ? false
                : options.autoExpandSingleChildren;
        this.sorter = options.sorter;
        this.getDefaultCollapseState = (e) => options.collapseByDefault
            ? options.collapseByDefault(e)
                ? ObjectTreeElementCollapseState.PreserveOrCollapsed
                : ObjectTreeElementCollapseState.PreserveOrExpanded
            : undefined;
        let asyncFindEnabled = false;
        let findFilter;
        if (options.findProvider &&
            (options.findWidgetEnabled ?? true) &&
            options.keyboardNavigationLabelProvider &&
            options.contextViewProvider) {
            asyncFindEnabled = true;
            findFilter = new AsyncFindFilter(options.findProvider, options.keyboardNavigationLabelProvider, options.filter);
        }
        this.tree = this.createTree(user, container, delegate, renderers, {
            ...options,
            findWidgetEnabled: !asyncFindEnabled,
            filter: findFilter ?? options.filter,
        });
        this.root = createAsyncDataTreeNode({
            element: undefined,
            parent: null,
            hasChildren: true,
            defaultCollapseState: undefined,
        });
        if (this.identityProvider) {
            this.root = {
                ...this.root,
                id: null,
            };
        }
        this.nodes.set(null, this.root);
        this.tree.onDidChangeCollapseState(this._onDidChangeCollapseState, this, this.disposables);
        if (asyncFindEnabled) {
            const findOptions = {
                styles: options.findWidgetStyles,
                showNotFoundMessage: options.showNotFoundMessage,
                defaultFindMatchType: options.defaultFindMatchType,
                defaultFindMode: options.defaultFindMode,
            };
            this.findController = this.disposables.add(new AsyncFindController(this.tree, options.findProvider, findFilter, this.tree.options.contextViewProvider, findOptions));
            this.focusNavigationFilter = (node) => this.findController.shouldFocusWhenNavigating(node);
            this.onDidChangeFindOpenState = this.findController.onDidChangeOpenState;
            this.onDidChangeFindMode = this.findController.onDidChangeMode;
            this.onDidChangeFindMatchType = this.findController.onDidChangeMatchType;
        }
        else {
            this.onDidChangeFindOpenState = this.tree.onDidChangeFindOpenState;
            this.onDidChangeFindMode = this.tree.onDidChangeFindMode;
            this.onDidChangeFindMatchType = this.tree.onDidChangeFindMatchType;
        }
    }
    createTree(user, container, delegate, renderers, options) {
        const objectTreeDelegate = new ComposedTreeDelegate(delegate);
        const objectTreeRenderers = renderers.map((r) => new AsyncDataTreeRenderer(r, this.nodeMapper, this._onDidChangeNodeSlowState.event));
        const objectTreeOptions = asObjectTreeOptions(options) || {};
        return new ObjectTree(user, container, objectTreeDelegate, objectTreeRenderers, objectTreeOptions);
    }
    updateOptions(optionsUpdate = {}) {
        if (this.findController) {
            if (optionsUpdate.defaultFindMode !== undefined) {
                this.findController.mode = optionsUpdate.defaultFindMode;
            }
            if (optionsUpdate.defaultFindMatchType !== undefined) {
                this.findController.matchType = optionsUpdate.defaultFindMatchType;
            }
        }
        this.tree.updateOptions(optionsUpdate);
    }
    get options() {
        return this.tree.options;
    }
    // Widget
    getHTMLElement() {
        return this.tree.getHTMLElement();
    }
    get contentHeight() {
        return this.tree.contentHeight;
    }
    get contentWidth() {
        return this.tree.contentWidth;
    }
    get onDidChangeContentHeight() {
        return this.tree.onDidChangeContentHeight;
    }
    get onDidChangeContentWidth() {
        return this.tree.onDidChangeContentWidth;
    }
    get scrollTop() {
        return this.tree.scrollTop;
    }
    set scrollTop(scrollTop) {
        this.tree.scrollTop = scrollTop;
    }
    get scrollLeft() {
        return this.tree.scrollLeft;
    }
    set scrollLeft(scrollLeft) {
        this.tree.scrollLeft = scrollLeft;
    }
    get scrollHeight() {
        return this.tree.scrollHeight;
    }
    get renderHeight() {
        return this.tree.renderHeight;
    }
    get lastVisibleElement() {
        return this.tree.lastVisibleElement.element;
    }
    get ariaLabel() {
        return this.tree.ariaLabel;
    }
    set ariaLabel(value) {
        this.tree.ariaLabel = value;
    }
    domFocus() {
        this.tree.domFocus();
    }
    isDOMFocused() {
        return this.tree.isDOMFocused();
    }
    navigate(start) {
        let startNode;
        if (start) {
            startNode = this.getDataNode(start);
        }
        return new AsyncDataTreeNavigator(this.tree.navigate(startNode));
    }
    layout(height, width) {
        this.tree.layout(height, width);
    }
    style(styles) {
        this.tree.style(styles);
    }
    // Model
    getInput() {
        return this.root.element;
    }
    async setInput(input, viewState) {
        this.refreshPromises.forEach((promise) => promise.cancel());
        this.refreshPromises.clear();
        this.root.element = input;
        const viewStateContext = viewState && {
            viewState,
            focus: [],
            selection: [],
        };
        await this._updateChildren(input, true, false, viewStateContext);
        if (viewStateContext) {
            this.tree.setFocus(viewStateContext.focus);
            this.tree.setSelection(viewStateContext.selection);
        }
        if (viewState && typeof viewState.scrollTop === 'number') {
            this.scrollTop = viewState.scrollTop;
        }
    }
    async updateChildren(element = this.root.element, recursive = true, rerender = false, options) {
        await this._updateChildren(element, recursive, rerender, undefined, options);
    }
    async _updateChildren(element = this.root.element, recursive = true, rerender = false, viewStateContext, options) {
        if (typeof this.root.element === 'undefined') {
            throw new TreeError(this.user, 'Tree input not set');
        }
        if (this.root.refreshPromise) {
            await this.root.refreshPromise;
            await Event.toPromise(this._onDidRender.event);
        }
        const node = this.getDataNode(element);
        await this.refreshAndRenderNode(node, recursive, viewStateContext, options);
        if (rerender) {
            try {
                this.tree.rerender(node);
            }
            catch {
                // missing nodes are fine, this could've resulted from
                // parallel refresh calls, removing `node` altogether
            }
        }
    }
    resort(element = this.root.element, recursive = true) {
        this.tree.resort(this.getDataNode(element), recursive);
    }
    hasNode(element) {
        return element === this.root.element || this.nodes.has(element);
    }
    // View
    rerender(element) {
        if (element === undefined || element === this.root.element) {
            this.tree.rerender();
            return;
        }
        const node = this.getDataNode(element);
        this.tree.rerender(node);
    }
    updateElementHeight(element, height) {
        const node = this.getDataNode(element);
        this.tree.updateElementHeight(node, height);
    }
    updateWidth(element) {
        const node = this.getDataNode(element);
        this.tree.updateWidth(node);
    }
    // Tree
    getNode(element = this.root.element) {
        const dataNode = this.getDataNode(element);
        const node = this.tree.getNode(dataNode === this.root ? null : dataNode);
        return this.nodeMapper.map(node);
    }
    collapse(element, recursive = false) {
        const node = this.getDataNode(element);
        return this.tree.collapse(node === this.root ? null : node, recursive);
    }
    async expand(element, recursive = false) {
        if (typeof this.root.element === 'undefined') {
            throw new TreeError(this.user, 'Tree input not set');
        }
        if (this.root.refreshPromise) {
            await this.root.refreshPromise;
            await Event.toPromise(this._onDidRender.event);
        }
        const node = this.getDataNode(element);
        if (this.tree.hasElement(node) && !this.tree.isCollapsible(node)) {
            return false;
        }
        if (node.refreshPromise) {
            await this.root.refreshPromise;
            await Event.toPromise(this._onDidRender.event);
        }
        if (node !== this.root && !node.refreshPromise && !this.tree.isCollapsed(node)) {
            return false;
        }
        const result = this.tree.expand(node === this.root ? null : node, recursive);
        if (node.refreshPromise) {
            await this.root.refreshPromise;
            await Event.toPromise(this._onDidRender.event);
        }
        return result;
    }
    toggleCollapsed(element, recursive = false) {
        return this.tree.toggleCollapsed(this.getDataNode(element), recursive);
    }
    expandAll() {
        this.tree.expandAll();
    }
    async expandTo(element) {
        if (!this.dataSource.getParent) {
            throw new Error("Can't expand to element without getParent method");
        }
        const elements = [];
        while (!this.hasNode(element)) {
            element = this.dataSource.getParent(element);
            if (element !== this.root.element) {
                elements.push(element);
            }
        }
        for (const element of Iterable.reverse(elements)) {
            await this.expand(element);
        }
        this.tree.expandTo(this.getDataNode(element));
    }
    collapseAll() {
        this.tree.collapseAll();
    }
    isCollapsible(element) {
        return this.tree.isCollapsible(this.getDataNode(element));
    }
    isCollapsed(element) {
        return this.tree.isCollapsed(this.getDataNode(element));
    }
    triggerTypeNavigation() {
        this.tree.triggerTypeNavigation();
    }
    openFind() {
        if (this.findController) {
            this.findController.open();
        }
        else {
            this.tree.openFind();
        }
    }
    closeFind() {
        if (this.findController) {
            this.findController.close();
        }
        else {
            this.tree.closeFind();
        }
    }
    refilter() {
        this.tree.refilter();
    }
    setAnchor(element) {
        this.tree.setAnchor(typeof element === 'undefined' ? undefined : this.getDataNode(element));
    }
    getAnchor() {
        const node = this.tree.getAnchor();
        return node?.element;
    }
    setSelection(elements, browserEvent) {
        const nodes = elements.map((e) => this.getDataNode(e));
        this.tree.setSelection(nodes, browserEvent);
    }
    getSelection() {
        const nodes = this.tree.getSelection();
        return nodes.map((n) => n.element);
    }
    setFocus(elements, browserEvent) {
        const nodes = elements.map((e) => this.getDataNode(e));
        this.tree.setFocus(nodes, browserEvent);
    }
    focusNext(n = 1, loop = false, browserEvent) {
        this.tree.focusNext(n, loop, browserEvent, this.focusNavigationFilter);
    }
    focusPrevious(n = 1, loop = false, browserEvent) {
        this.tree.focusPrevious(n, loop, browserEvent, this.focusNavigationFilter);
    }
    focusNextPage(browserEvent) {
        return this.tree.focusNextPage(browserEvent, this.focusNavigationFilter);
    }
    focusPreviousPage(browserEvent) {
        return this.tree.focusPreviousPage(browserEvent, this.focusNavigationFilter);
    }
    focusLast(browserEvent) {
        this.tree.focusLast(browserEvent, this.focusNavigationFilter);
    }
    focusFirst(browserEvent) {
        this.tree.focusFirst(browserEvent, this.focusNavigationFilter);
    }
    getFocus() {
        const nodes = this.tree.getFocus();
        return nodes.map((n) => n.element);
    }
    getStickyScrollFocus() {
        const nodes = this.tree.getStickyScrollFocus();
        return nodes.map((n) => n.element);
    }
    getFocusedPart() {
        return this.tree.getFocusedPart();
    }
    reveal(element, relativeTop) {
        this.tree.reveal(this.getDataNode(element), relativeTop);
    }
    getRelativeTop(element) {
        return this.tree.getRelativeTop(this.getDataNode(element));
    }
    // Tree navigation
    getParentElement(element) {
        const node = this.tree.getParentElement(this.getDataNode(element));
        return (node && node.element);
    }
    getFirstElementChild(element = this.root.element) {
        const dataNode = this.getDataNode(element);
        const node = this.tree.getFirstElementChild(dataNode === this.root ? null : dataNode);
        return (node && node.element);
    }
    // Implementation
    getDataNode(element) {
        const node = this.nodes.get((element === this.root.element ? null : element));
        if (!node) {
            const nodeIdentity = this.identityProvider?.getId(element).toString();
            throw new TreeError(this.user, `Data tree node not found${nodeIdentity ? `: ${nodeIdentity}` : ''}`);
        }
        return node;
    }
    async refreshAndRenderNode(node, recursive, viewStateContext, options) {
        if (this.disposables.isDisposed) {
            return; // tree disposed during refresh, again (#228211)
        }
        await this.refreshNode(node, recursive, viewStateContext);
        if (this.disposables.isDisposed) {
            return; // tree disposed during refresh (#199264)
        }
        this.render(node, viewStateContext, options);
    }
    async refreshNode(node, recursive, viewStateContext) {
        let result;
        this.subTreeRefreshPromises.forEach((refreshPromise, refreshNode) => {
            if (!result && intersects(refreshNode, node)) {
                result = refreshPromise.then(() => this.refreshNode(node, recursive, viewStateContext));
            }
        });
        if (result) {
            return result;
        }
        if (node !== this.root) {
            const treeNode = this.tree.getNode(node);
            if (treeNode.collapsed) {
                node.hasChildren = !!this.dataSource.hasChildren(node.element);
                node.stale = true;
                this.setChildren(node, [], recursive, viewStateContext);
                return;
            }
        }
        return this.doRefreshSubTree(node, recursive, viewStateContext);
    }
    async doRefreshSubTree(node, recursive, viewStateContext) {
        let done;
        node.refreshPromise = new Promise((c) => (done = c));
        this.subTreeRefreshPromises.set(node, node.refreshPromise);
        node.refreshPromise.finally(() => {
            node.refreshPromise = undefined;
            this.subTreeRefreshPromises.delete(node);
        });
        try {
            const childrenToRefresh = await this.doRefreshNode(node, recursive, viewStateContext);
            node.stale = false;
            await Promises.settled(childrenToRefresh.map((child) => this.doRefreshSubTree(child, recursive, viewStateContext)));
        }
        finally {
            done();
        }
    }
    async doRefreshNode(node, recursive, viewStateContext) {
        node.hasChildren = !!this.dataSource.hasChildren(node.element);
        let childrenPromise;
        if (!node.hasChildren) {
            childrenPromise = Promise.resolve(Iterable.empty());
        }
        else {
            const children = this.doGetChildren(node);
            if (isIterable(children)) {
                childrenPromise = Promise.resolve(children);
            }
            else {
                const slowTimeout = timeout(800);
                slowTimeout.then(() => {
                    node.slow = true;
                    this._onDidChangeNodeSlowState.fire(node);
                }, (_) => null);
                childrenPromise = children.finally(() => slowTimeout.cancel());
            }
        }
        try {
            const children = await childrenPromise;
            return this.setChildren(node, children, recursive, viewStateContext);
        }
        catch (err) {
            if (node !== this.root && this.tree.hasElement(node)) {
                this.tree.collapse(node);
            }
            if (isCancellationError(err)) {
                return [];
            }
            throw err;
        }
        finally {
            if (node.slow) {
                node.slow = false;
                this._onDidChangeNodeSlowState.fire(node);
            }
        }
    }
    doGetChildren(node) {
        let result = this.refreshPromises.get(node);
        if (result) {
            return result;
        }
        const children = this.dataSource.getChildren(node.element);
        if (isIterable(children)) {
            return this.processChildren(children);
        }
        else {
            result = createCancelablePromise(async () => this.processChildren(await children));
            this.refreshPromises.set(node, result);
            return result.finally(() => {
                this.refreshPromises.delete(node);
            });
        }
    }
    _onDidChangeCollapseState({ node, deep, }) {
        if (node.element === null) {
            return;
        }
        if (!node.collapsed && node.element.stale) {
            if (deep) {
                this.collapse(node.element.element);
            }
            else {
                this.refreshAndRenderNode(node.element, false).catch(onUnexpectedError);
            }
        }
    }
    setChildren(node, childrenElementsIterable, recursive, viewStateContext) {
        const childrenElements = [...childrenElementsIterable];
        // perf: if the node was and still is a leaf, avoid all this hassle
        if (node.children.length === 0 && childrenElements.length === 0) {
            return [];
        }
        const nodesToForget = new Map();
        const childrenTreeNodesById = new Map();
        for (const child of node.children) {
            nodesToForget.set(child.element, child);
            if (this.identityProvider) {
                childrenTreeNodesById.set(child.id, {
                    node: child,
                    collapsed: this.tree.hasElement(child) && this.tree.isCollapsed(child),
                });
            }
        }
        const childrenToRefresh = [];
        const children = childrenElements.map((element) => {
            const hasChildren = !!this.dataSource.hasChildren(element);
            if (!this.identityProvider) {
                const asyncDataTreeNode = createAsyncDataTreeNode({
                    element,
                    parent: node,
                    hasChildren,
                    defaultCollapseState: this.getDefaultCollapseState(element),
                });
                if (hasChildren &&
                    asyncDataTreeNode.defaultCollapseState ===
                        ObjectTreeElementCollapseState.PreserveOrExpanded) {
                    childrenToRefresh.push(asyncDataTreeNode);
                }
                return asyncDataTreeNode;
            }
            const id = this.identityProvider.getId(element).toString();
            const result = childrenTreeNodesById.get(id);
            if (result) {
                const asyncDataTreeNode = result.node;
                nodesToForget.delete(asyncDataTreeNode.element);
                this.nodes.delete(asyncDataTreeNode.element);
                this.nodes.set(element, asyncDataTreeNode);
                asyncDataTreeNode.element = element;
                asyncDataTreeNode.hasChildren = hasChildren;
                if (recursive) {
                    if (result.collapsed) {
                        asyncDataTreeNode.children.forEach((node) => dfs(node, (node) => this.nodes.delete(node.element)));
                        asyncDataTreeNode.children.splice(0, asyncDataTreeNode.children.length);
                        asyncDataTreeNode.stale = true;
                    }
                    else {
                        childrenToRefresh.push(asyncDataTreeNode);
                    }
                }
                else if (hasChildren && !result.collapsed) {
                    childrenToRefresh.push(asyncDataTreeNode);
                }
                return asyncDataTreeNode;
            }
            const childAsyncDataTreeNode = createAsyncDataTreeNode({
                element,
                parent: node,
                id,
                hasChildren,
                defaultCollapseState: this.getDefaultCollapseState(element),
            });
            if (viewStateContext &&
                viewStateContext.viewState.focus &&
                viewStateContext.viewState.focus.indexOf(id) > -1) {
                viewStateContext.focus.push(childAsyncDataTreeNode);
            }
            if (viewStateContext &&
                viewStateContext.viewState.selection &&
                viewStateContext.viewState.selection.indexOf(id) > -1) {
                viewStateContext.selection.push(childAsyncDataTreeNode);
            }
            if (viewStateContext &&
                viewStateContext.viewState.expanded &&
                viewStateContext.viewState.expanded.indexOf(id) > -1) {
                childrenToRefresh.push(childAsyncDataTreeNode);
            }
            else if (hasChildren &&
                childAsyncDataTreeNode.defaultCollapseState ===
                    ObjectTreeElementCollapseState.PreserveOrExpanded) {
                childrenToRefresh.push(childAsyncDataTreeNode);
            }
            return childAsyncDataTreeNode;
        });
        for (const node of nodesToForget.values()) {
            dfs(node, (node) => this.nodes.delete(node.element));
        }
        for (const child of children) {
            this.nodes.set(child.element, child);
        }
        splice(node.children, 0, node.children.length, children);
        // TODO@joao this doesn't take filter into account
        if (node !== this.root &&
            this.autoExpandSingleChildren &&
            children.length === 1 &&
            childrenToRefresh.length === 0) {
            children[0].forceExpanded = true;
            childrenToRefresh.push(children[0]);
        }
        return childrenToRefresh;
    }
    render(node, viewStateContext, options) {
        const children = node.children.map((node) => this.asTreeElement(node, viewStateContext));
        const objectTreeOptions = options && {
            ...options,
            diffIdentityProvider: options.diffIdentityProvider && {
                getId(node) {
                    return options.diffIdentityProvider.getId(node.element);
                },
            },
        };
        this.tree.setChildren(node === this.root ? null : node, children, objectTreeOptions);
        if (node !== this.root) {
            this.tree.setCollapsible(node, node.hasChildren);
        }
        this._onDidRender.fire();
    }
    asTreeElement(node, viewStateContext) {
        if (node.stale) {
            return {
                element: node,
                collapsible: node.hasChildren,
                collapsed: true,
            };
        }
        let collapsed;
        if (viewStateContext &&
            viewStateContext.viewState.expanded &&
            node.id &&
            viewStateContext.viewState.expanded.indexOf(node.id) > -1) {
            collapsed = false;
        }
        else if (node.forceExpanded) {
            collapsed = false;
            node.forceExpanded = false;
        }
        else {
            collapsed = node.defaultCollapseState;
        }
        return {
            element: node,
            children: node.hasChildren
                ? Iterable.map(node.children, (child) => this.asTreeElement(child, viewStateContext))
                : [],
            collapsible: node.hasChildren,
            collapsed,
        };
    }
    processChildren(children) {
        if (this.sorter) {
            children = [...children].sort(this.sorter.compare.bind(this.sorter));
        }
        return children;
    }
    // view state
    getViewState() {
        if (!this.identityProvider) {
            throw new TreeError(this.user, "Can't get tree view state without an identity provider");
        }
        const getId = (element) => this.identityProvider.getId(element).toString();
        const focus = this.getFocus().map(getId);
        const selection = this.getSelection().map(getId);
        const expanded = [];
        const root = this.tree.getNode();
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (node !== root && node.collapsible && !node.collapsed) {
                expanded.push(getId(node.element.element));
            }
            insertInto(stack, stack.length, node.children);
        }
        return { focus, selection, expanded, scrollTop: this.scrollTop };
    }
    dispose() {
        this.disposables.dispose();
        this.tree.dispose();
    }
}
class CompressibleAsyncDataTreeNodeWrapper {
    get element() {
        return {
            elements: this.node.element.elements.map((e) => e.element),
            incompressible: this.node.element.incompressible,
        };
    }
    get children() {
        return this.node.children.map((node) => new CompressibleAsyncDataTreeNodeWrapper(node));
    }
    get depth() {
        return this.node.depth;
    }
    get visibleChildrenCount() {
        return this.node.visibleChildrenCount;
    }
    get visibleChildIndex() {
        return this.node.visibleChildIndex;
    }
    get collapsible() {
        return this.node.collapsible;
    }
    get collapsed() {
        return this.node.collapsed;
    }
    get visible() {
        return this.node.visible;
    }
    get filterData() {
        return this.node.filterData;
    }
    constructor(node) {
        this.node = node;
    }
}
class CompressibleAsyncDataTreeRenderer {
    constructor(renderer, nodeMapper, compressibleNodeMapperProvider, onDidChangeTwistieState) {
        this.renderer = renderer;
        this.nodeMapper = nodeMapper;
        this.compressibleNodeMapperProvider = compressibleNodeMapperProvider;
        this.onDidChangeTwistieState = onDidChangeTwistieState;
        this.renderedNodes = new Map();
        this.disposables = [];
        this.templateId = renderer.templateId;
    }
    renderTemplate(container) {
        const templateData = this.renderer.renderTemplate(container);
        return { templateData };
    }
    renderElement(node, index, templateData, height) {
        this.renderer.renderElement(this.nodeMapper.map(node), index, templateData.templateData, height);
    }
    renderCompressedElements(node, index, templateData, height) {
        this.renderer.renderCompressedElements(this.compressibleNodeMapperProvider().map(node), index, templateData.templateData, height);
    }
    renderTwistie(element, twistieElement) {
        if (element.slow) {
            twistieElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.treeItemLoading));
            return true;
        }
        else {
            twistieElement.classList.remove(...ThemeIcon.asClassNameArray(Codicon.treeItemLoading));
            return false;
        }
    }
    disposeElement(node, index, templateData, height) {
        this.renderer.disposeElement?.(this.nodeMapper.map(node), index, templateData.templateData, height);
    }
    disposeCompressedElements(node, index, templateData, height) {
        this.renderer.disposeCompressedElements?.(this.compressibleNodeMapperProvider().map(node), index, templateData.templateData, height);
    }
    disposeTemplate(templateData) {
        this.renderer.disposeTemplate(templateData.templateData);
    }
    dispose() {
        this.renderedNodes.clear();
        this.disposables = dispose(this.disposables);
    }
}
function asCompressibleObjectTreeOptions(options) {
    const objectTreeOptions = options && asObjectTreeOptions(options);
    return (objectTreeOptions && {
        ...objectTreeOptions,
        keyboardNavigationLabelProvider: objectTreeOptions.keyboardNavigationLabelProvider && {
            ...objectTreeOptions.keyboardNavigationLabelProvider,
            getCompressedNodeKeyboardNavigationLabel(els) {
                return options.keyboardNavigationLabelProvider.getCompressedNodeKeyboardNavigationLabel(els.map((e) => e.element));
            },
        },
    });
}
export class CompressibleAsyncDataTree extends AsyncDataTree {
    constructor(user, container, virtualDelegate, compressionDelegate, renderers, dataSource, options = {}) {
        super(user, container, virtualDelegate, renderers, dataSource, options);
        this.compressionDelegate = compressionDelegate;
        this.compressibleNodeMapper = new WeakMapper((node) => new CompressibleAsyncDataTreeNodeWrapper(node));
        this.filter = options.filter;
    }
    getCompressedTreeNode(e) {
        const node = this.getDataNode(e);
        return this.tree.getCompressedTreeNode(node).element;
    }
    createTree(user, container, delegate, renderers, options) {
        const objectTreeDelegate = new ComposedTreeDelegate(delegate);
        const objectTreeRenderers = renderers.map((r) => new CompressibleAsyncDataTreeRenderer(r, this.nodeMapper, () => this.compressibleNodeMapper, this._onDidChangeNodeSlowState.event));
        const objectTreeOptions = asCompressibleObjectTreeOptions(options) || {};
        return new CompressibleObjectTree(user, container, objectTreeDelegate, objectTreeRenderers, objectTreeOptions);
    }
    asTreeElement(node, viewStateContext) {
        return {
            incompressible: this.compressionDelegate.isIncompressible(node.element),
            ...super.asTreeElement(node, viewStateContext),
        };
    }
    getViewState() {
        if (!this.identityProvider) {
            throw new TreeError(this.user, "Can't get tree view state without an identity provider");
        }
        const getId = (element) => this.identityProvider.getId(element).toString();
        const focus = this.getFocus().map(getId);
        const selection = this.getSelection().map(getId);
        const expanded = [];
        const root = this.tree.getCompressedTreeNode();
        const stack = [root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (node !== root && node.collapsible && !node.collapsed) {
                for (const asyncNode of node.element.elements) {
                    expanded.push(getId(asyncNode.element));
                }
            }
            stack.push(...node.children);
        }
        return { focus, selection, expanded, scrollTop: this.scrollTop };
    }
    render(node, viewStateContext, options) {
        if (!this.identityProvider) {
            return super.render(node, viewStateContext);
        }
        // Preserve traits across compressions. Hacky but does the trick.
        // This is hard to fix properly since it requires rewriting the traits
        // across trees and lists. Let's just keep it this way for now.
        const getId = (element) => this.identityProvider.getId(element).toString();
        const getUncompressedIds = (nodes) => {
            const result = new Set();
            for (const node of nodes) {
                const compressedNode = this.tree.getCompressedTreeNode(node === this.root ? null : node);
                if (!compressedNode.element) {
                    continue;
                }
                for (const node of compressedNode.element.elements) {
                    result.add(getId(node.element));
                }
            }
            return result;
        };
        const oldSelection = getUncompressedIds(this.tree.getSelection());
        const oldFocus = getUncompressedIds(this.tree.getFocus());
        super.render(node, viewStateContext, options);
        const selection = this.getSelection();
        let didChangeSelection = false;
        const focus = this.getFocus();
        let didChangeFocus = false;
        const visit = (node) => {
            const compressedNode = node.element;
            if (compressedNode) {
                for (let i = 0; i < compressedNode.elements.length; i++) {
                    const id = getId(compressedNode.elements[i].element);
                    const element = compressedNode.elements[compressedNode.elements.length - 1].element;
                    // github.com/microsoft/vscode/issues/85938
                    if (oldSelection.has(id) && selection.indexOf(element) === -1) {
                        selection.push(element);
                        didChangeSelection = true;
                    }
                    if (oldFocus.has(id) && focus.indexOf(element) === -1) {
                        focus.push(element);
                        didChangeFocus = true;
                    }
                }
            }
            node.children.forEach(visit);
        };
        visit(this.tree.getCompressedTreeNode(node === this.root ? null : node));
        if (didChangeSelection) {
            this.setSelection(selection);
        }
        if (didChangeFocus) {
            this.setFocus(focus);
        }
    }
    // For compressed async data trees, `TreeVisibility.Recurse` doesn't currently work
    // and we have to filter everything beforehand
    // Related to #85193 and #85835
    processChildren(children) {
        if (this.filter) {
            children = Iterable.filter(children, (e) => {
                const result = this.filter.filter(e, 1 /* TreeVisibility.Visible */);
                const visibility = getVisibility(result);
                if (visibility === 2 /* TreeVisibility.Recurse */) {
                    throw new Error('Recursive tree visibility not supported in async data compressed trees');
                }
                return visibility === 1 /* TreeVisibility.Visible */;
            });
        }
        return super.processChildren(children);
    }
    navigate(start) {
        // Assumptions are made about how tree navigation works in compressed trees
        // These assumptions may be wrong and we should revisit this when needed
        // Example:	[a, b/ba, ba.txt]
        // - previous(ba) => a
        // - previous(b) => a
        // - next(a) => ba
        // - next(b) => ba
        // - next(ba) => ba.txt
        return super.navigate(start);
    }
}
function getVisibility(filterResult) {
    if (typeof filterResult === 'boolean') {
        return filterResult ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
    }
    else if (isFilterResult(filterResult)) {
        return getVisibleState(filterResult.visibility);
    }
    else {
        return getVisibleState(filterResult);
    }
}
class AsyncDataTreeNavigator {
    constructor(navigator) {
        this.navigator = navigator;
    }
    current() {
        const current = this.navigator.current();
        if (current === null) {
            return null;
        }
        return current.element;
    }
    previous() {
        this.navigator.previous();
        return this.current();
    }
    first() {
        this.navigator.first();
        return this.current();
    }
    last() {
        this.navigator.last();
        return this.current();
    }
    next() {
        this.navigator.next();
        return this.current();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEYXRhVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3RyZWUvYXN5bmNEYXRhVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQXdCLE1BQU0scUJBQXFCLENBQUE7QUFFbkYsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixZQUFZLElBQUksWUFBWSxFQU01QixVQUFVLEVBQ1YsY0FBYyxHQUdkLE1BQU0sbUJBQW1CLENBQUE7QUFFMUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sc0JBQXNCLEVBTXRCLFVBQVUsR0FDVixNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFhTiw4QkFBOEIsRUFDOUIsU0FBUyxFQUdULFVBQVUsR0FDVixNQUFNLFdBQVcsQ0FBQTtBQUNsQixPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLFFBQVEsRUFDUixnQkFBZ0IsRUFDaEIsT0FBTyxHQUNQLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUVsRyxPQUFPLEVBQUUs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