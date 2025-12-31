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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEYXRhVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL2FzeW5jRGF0YVRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsT0FBTyxFQUFFLHVCQUF1QixFQUF3QixNQUFNLHFCQUFxQixDQUFBO0FBRW5GLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsWUFBWSxJQUFJLFlBQVksRUFNNUIsVUFBVSxFQUNWLGNBQWMsR0FHZCxNQUFNLG1CQUFtQixDQUFBO0FBRTFCLE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDckUsT0FBTyxFQUNOLHNCQUFzQixFQU10QixVQUFVLEdBQ1YsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBYU4sOEJBQThCLEVBQzlCLFNBQVMsRUFHVCxVQUFVLEdBQ1YsTUFBTSxXQUFXLENBQUE7QUFDbEIsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixRQUFRLEVBQ1IsZ0JBQWdCLEVBQ2hCLE9BQU8sR0FDUCxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFbEcsT0FBTyxFQUFFLFVBQVUs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