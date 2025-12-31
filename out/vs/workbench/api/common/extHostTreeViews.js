/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { basename } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { NoTreeViewError, } from '../../common/views.js';
import { asPromise } from '../../../base/common/async.js';
import * as extHostTypes from './extHostTypes.js';
import { isUndefinedOrNull, isString } from '../../../base/common/types.js';
import { equals, coalesce } from '../../../base/common/arrays.js';
import { MarkdownString, ViewBadge, DataTransfer } from './extHostTypeConverters.js';
import { isMarkdownString } from '../../../base/common/htmlContent.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { TreeViewsDnDService, } from '../../../editor/common/services/treeViewsDnd.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
function toTreeItemLabel(label, extension) {
    if (isString(label)) {
        return { label };
    }
    if (label && typeof label === 'object' && typeof label.label === 'string') {
        let highlights = undefined;
        if (Array.isArray(label.highlights)) {
            highlights = label.highlights.filter((highlight) => highlight.length === 2 &&
                typeof highlight[0] === 'number' &&
                typeof highlight[1] === 'number');
            highlights = highlights.length ? highlights : undefined;
        }
        return { label: label.label, highlights };
    }
    return undefined;
}
export class ExtHostTreeViews extends Disposable {
    constructor(_proxy, commands, logService) {
        super();
        this._proxy = _proxy;
        this.commands = commands;
        this.logService = logService;
        this.treeViews = new Map();
        this.treeDragAndDropService = new TreeViewsDnDService();
        function isTreeViewConvertableItem(arg) {
            return (arg &&
                arg.$treeViewId &&
                (arg.$treeItemHandle || arg.$selectedTreeItems || arg.$focusedTreeItem));
        }
        commands.registerArgumentProcessor({
            processArgument: (arg) => {
                if (isTreeViewConvertableItem(arg)) {
                    return this.convertArgument(arg);
                }
                else if (Array.isArray(arg) && arg.length > 0) {
                    return arg.map((item) => {
                        if (isTreeViewConvertableItem(item)) {
                            return this.convertArgument(item);
                        }
                        return item;
                    });
                }
                return arg;
            },
        });
    }
    registerTreeDataProvider(id, treeDataProvider, extension) {
        const treeView = this.createTreeView(id, { treeDataProvider }, extension);
        return { dispose: () => treeView.dispose() };
    }
    createTreeView(viewId, options, extension) {
        if (!options || !options.treeDataProvider) {
            throw new Error('Options with treeDataProvider is mandatory');
        }
        const dropMimeTypes = options.dragAndDropController?.dropMimeTypes ?? [];
        const dragMimeTypes = options.dragAndDropController?.dragMimeTypes ?? [];
        const hasHandleDrag = !!options.dragAndDropController?.handleDrag;
        const hasHandleDrop = !!options.dragAndDropController?.handleDrop;
        const treeView = this.createExtHostTreeView(viewId, options, extension);
        const proxyOptions = {
            showCollapseAll: !!options.showCollapseAll,
            canSelectMany: !!options.canSelectMany,
            dropMimeTypes,
            dragMimeTypes,
            hasHandleDrag,
            hasHandleDrop,
            manuallyManageCheckboxes: !!options.manageCheckboxStateManually,
        };
        const registerPromise = this._proxy.$registerTreeViewDataProvider(viewId, proxyOptions);
        const view = {
            get onDidCollapseElement() {
                return treeView.onDidCollapseElement;
            },
            get onDidExpandElement() {
                return treeView.onDidExpandElement;
            },
            get selection() {
                return treeView.selectedElements;
            },
            get onDidChangeSelection() {
                return treeView.onDidChangeSelection;
            },
            get activeItem() {
                checkProposedApiEnabled(extension, 'treeViewActiveItem');
                return treeView.focusedElement;
            },
            get onDidChangeActiveItem() {
                checkProposedApiEnabled(extension, 'treeViewActiveItem');
                return treeView.onDidChangeActiveItem;
            },
            get visible() {
                return treeView.visible;
            },
            get onDidChangeVisibility() {
                return treeView.onDidChangeVisibility;
            },
            get onDidChangeCheckboxState() {
                return treeView.onDidChangeCheckboxState;
            },
            get message() {
                return treeView.message;
            },
            set message(message) {
                if (isMarkdownString(message)) {
                    checkProposedApiEnabled(extension, 'treeViewMarkdownMessage');
                }
                treeView.message = message;
            },
            get title() {
                return treeView.title;
            },
            set title(title) {
                treeView.title = title;
            },
            get description() {
                return treeView.description;
            },
            set description(description) {
                treeView.description = description;
            },
            get badge() {
                return treeView.badge;
            },
            set badge(badge) {
                if (badge !== undefined && extHostTypes.ViewBadge.isViewBadge(badge)) {
                    treeView.badge = {
                        value: Math.floor(Math.abs(badge.value)),
                        tooltip: badge.tooltip,
                    };
                }
                else if (badge === undefined) {
                    treeView.badge = undefined;
                }
            },
            reveal: (element, options) => {
                return treeView.reveal(element, options);
            },
            dispose: async () => {
                // Wait for the registration promise to finish before doing the dispose.
                await registerPromise;
                this.treeViews.delete(viewId);
                treeView.dispose();
            },
        };
        this._register(view);
        return view;
    }
    async $getChildren(treeViewId, treeItemHandles) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            return Promise.reject(new NoTreeViewError(treeViewId));
        }
        if (!treeItemHandles) {
            const children = await treeView.getChildren();
            return children ? [[0, ...children]] : undefined;
        }
        // Keep order of treeItemHandles in case extension trees already depend on this
        const result = [];
        for (let i = 0; i < treeItemHandles.length; i++) {
            const treeItemHandle = treeItemHandles[i];
            const children = await treeView.getChildren(treeItemHandle);
            if (children) {
                result.push([i, ...children]);
            }
        }
        return result;
    }
    async $handleDrop(destinationViewId, requestId, treeDataTransferDTO, targetItemHandle, token, operationUuid, sourceViewId, sourceTreeItemHandles) {
        const treeView = this.treeViews.get(destinationViewId);
        if (!treeView) {
            return Promise.reject(new NoTreeViewError(destinationViewId));
        }
        const treeDataTransfer = DataTransfer.toDataTransfer(treeDataTransferDTO, async (dataItemIndex) => {
            return (await this._proxy.$resolveDropFileData(destinationViewId, requestId, dataItemIndex))
                .buffer;
        });
        if (sourceViewId === destinationViewId && sourceTreeItemHandles) {
            await this.addAdditionalTransferItems(treeDataTransfer, treeView, sourceTreeItemHandles, token, operationUuid);
        }
        return treeView.onDrop(treeDataTransfer, targetItemHandle, token);
    }
    async addAdditionalTransferItems(treeDataTransfer, treeView, sourceTreeItemHandles, token, operationUuid) {
        const existingTransferOperation = this.treeDragAndDropService.removeDragOperationTransfer(operationUuid);
        if (existingTransferOperation) {
            ;
            (await existingTransferOperation)?.forEach((value, key) => {
                if (value) {
                    treeDataTransfer.set(key, value);
                }
            });
        }
        else if (operationUuid && treeView.handleDrag) {
            const willDropPromise = treeView.handleDrag(sourceTreeItemHandles, treeDataTransfer, token);
            this.treeDragAndDropService.addDragOperationTransfer(operationUuid, willDropPromise);
            await willDropPromise;
        }
        return treeDataTransfer;
    }
    async $handleDrag(sourceViewId, sourceTreeItemHandles, operationUuid, token) {
        const treeView = this.treeViews.get(sourceViewId);
        if (!treeView) {
            return Promise.reject(new NoTreeViewError(sourceViewId));
        }
        const treeDataTransfer = await this.addAdditionalTransferItems(new extHostTypes.DataTransfer(), treeView, sourceTreeItemHandles, token, operationUuid);
        if (!treeDataTransfer || token.isCancellationRequested) {
            return;
        }
        return DataTransfer.from(treeDataTransfer);
    }
    async $hasResolve(treeViewId) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        return treeView.hasResolve;
    }
    $resolve(treeViewId, treeItemHandle, token) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        return treeView.resolveTreeItem(treeItemHandle, token);
    }
    $setExpanded(treeViewId, treeItemHandle, expanded) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        treeView.setExpanded(treeItemHandle, expanded);
    }
    $setSelectionAndFocus(treeViewId, selectedHandles, focusedHandle) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        treeView.setSelectionAndFocus(selectedHandles, focusedHandle);
    }
    $setVisible(treeViewId, isVisible) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            if (!isVisible) {
                return;
            }
            throw new NoTreeViewError(treeViewId);
        }
        treeView.setVisible(isVisible);
    }
    $changeCheckboxState(treeViewId, checkboxUpdate) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        treeView.setCheckboxState(checkboxUpdate);
    }
    createExtHostTreeView(id, options, extension) {
        const treeView = this._register(new ExtHostTreeView(id, options, this._proxy, this.commands.converter, this.logService, extension));
        this.treeViews.set(id, treeView);
        return treeView;
    }
    convertArgument(arg) {
        const treeView = this.treeViews.get(arg.$treeViewId);
        if (treeView && '$treeItemHandle' in arg) {
            return treeView.getExtensionElement(arg.$treeItemHandle);
        }
        if (treeView && '$focusedTreeItem' in arg && arg.$focusedTreeItem) {
            return treeView.focusedElement;
        }
        return null;
    }
}
class ExtHostTreeView extends Disposable {
    static { this.LABEL_HANDLE_PREFIX = '0'; }
    static { this.ID_HANDLE_PREFIX = '1'; }
    get visible() {
        return this._visible;
    }
    get selectedElements() {
        return (this._selectedHandles
            .map((handle) => this.getExtensionElement(handle))
            .filter((element) => !isUndefinedOrNull(element)));
    }
    get focusedElement() {
        return ((this._focusedHandle ? this.getExtensionElement(this._focusedHandle) : undefined));
    }
    constructor(viewId, options, proxy, commands, logService, extension) {
        super();
        this.viewId = viewId;
        this.proxy = proxy;
        this.commands = commands;
        this.logService = logService;
        this.extension = extension;
        this.roots = undefined;
        this.elements = new Map();
        this.nodes = new Map();
        this._visible = false;
        this._selectedHandles = [];
        this._focusedHandle = undefined;
        this._onDidExpandElement = this._register(new Emitter());
        this.onDidExpandElement = this._onDidExpandElement.event;
        this._onDidCollapseElement = this._register(new Emitter());
        this.onDidCollapseElement = this._onDidCollapseElement.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeActiveItem = this._register(new Emitter());
        this.onDidChangeActiveItem = this._onDidChangeActiveItem.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
        this._onDidChangeData = this._register(new Emitter());
        this.refreshPromise = Promise.resolve();
        this.refreshQueue = Promise.resolve();
        this._message = '';
        this._title = '';
        this._refreshCancellationSource = new CancellationTokenSource();
        if (extension.contributes && extension.contributes.views) {
            for (const location in extension.contributes.views) {
                for (const view of extension.contributes.views[location]) {
                    if (view.id === viewId) {
                        this._title = view.name;
                    }
                }
            }
        }
        this.dataProvider = options.treeDataProvider;
        this.dndController = options.dragAndDropController;
        if (this.dataProvider.onDidChangeTreeData) {
            this._register(this.dataProvider.onDidChangeTreeData((elementOrElements) => {
                if (Array.isArray(elementOrElements) && elementOrElements.length === 0) {
                    return;
                }
                this._onDidChangeData.fire({ message: false, element: elementOrElements });
            }));
        }
        let refreshingPromise;
        let promiseCallback;
        const onDidChangeData = Event.debounce(this._onDidChangeData.event, (result, current) => {
            if (!result) {
                result = { message: false, elements: [] };
            }
            if (current.element !== false) {
                if (!refreshingPromise) {
                    // New refresh has started
                    refreshingPromise = new Promise((c) => (promiseCallback = c));
                    this.refreshPromise = this.refreshPromise.then(() => refreshingPromise);
                }
                if (Array.isArray(current.element)) {
                    result.elements.push(...current.element);
                }
                else {
                    result.elements.push(current.element);
                }
            }
            if (current.message) {
                result.message = true;
            }
            return result;
        }, 200, true);
        this._register(onDidChangeData(({ message, elements }) => {
            if (elements.length) {
                this.refreshQueue = this.refreshQueue.then(() => {
                    const _promiseCallback = promiseCallback;
                    refreshingPromise = null;
                    return this.refresh(elements).then(() => _promiseCallback());
                });
            }
            if (message) {
                this.proxy.$setMessage(this.viewId, MarkdownString.fromStrict(this._message) ?? '');
            }
        }));
    }
    async getChildren(parentHandle) {
        const parentElement = parentHandle ? this.getExtensionElement(parentHandle) : undefined;
        if (parentHandle && !parentElement) {
            this.logService.error(`No tree item with id \'${parentHandle}\' found.`);
            return Promise.resolve([]);
        }
        let childrenNodes = this.getChildrenNodes(parentHandle); // Get it from cache
        if (!childrenNodes) {
            childrenNodes = await this.fetchChildrenNodes(parentElement);
        }
        return childrenNodes ? childrenNodes.map((n) => n.item) : undefined;
    }
    getExtensionElement(treeItemHandle) {
        return this.elements.get(treeItemHandle);
    }
    reveal(element, options) {
        options = options ? options : { select: true, focus: false };
        const select = isUndefinedOrNull(options.select) ? true : options.select;
        const focus = isUndefinedOrNull(options.focus) ? false : options.focus;
        const expand = isUndefinedOrNull(options.expand) ? false : options.expand;
        if (typeof this.dataProvider.getParent !== 'function') {
            return Promise.reject(new Error(`Required registered TreeDataProvider to implement 'getParent' method to access 'reveal' method`));
        }
        if (element) {
            return this.refreshPromise
                .then(() => this.resolveUnknownParentChain(element))
                .then((parentChain) => this.resolveTreeNode(element, parentChain[parentChain.length - 1]).then((treeNode) => this.proxy.$reveal(this.viewId, { item: treeNode.item, parentChain: parentChain.map((p) => p.item) }, { select, focus, expand })), (error) => this.logService.error(error));
        }
        else {
            return this.proxy.$reveal(this.viewId, undefined, { select, focus, expand });
        }
    }
    get message() {
        return this._message;
    }
    set message(message) {
        this._message = message;
        this._onDidChangeData.fire({ message: true, element: false });
    }
    get title() {
        return this._title;
    }
    set title(title) {
        this._title = title;
        this.proxy.$setTitle(this.viewId, title, this._description);
    }
    get description() {
        return this._description;
    }
    set description(description) {
        this._description = description;
        this.proxy.$setTitle(this.viewId, this._title, description);
    }
    get badge() {
        return this._badge;
    }
    set badge(badge) {
        if (this._badge?.value === badge?.value && this._badge?.tooltip === badge?.tooltip) {
            return;
        }
        this._badge = ViewBadge.from(badge);
        this.proxy.$setBadge(this.viewId, badge);
    }
    setExpanded(treeItemHandle, expanded) {
        const element = this.getExtensionElement(treeItemHandle);
        if (element) {
            if (expanded) {
                this._onDidExpandElement.fire(Object.freeze({ element }));
            }
            else {
                this._onDidCollapseElement.fire(Object.freeze({ element }));
            }
        }
    }
    setSelectionAndFocus(selectedHandles, focusedHandle) {
        const changedSelection = !equals(this._selectedHandles, selectedHandles);
        this._selectedHandles = selectedHandles;
        const changedFocus = this._focusedHandle !== focusedHandle;
        this._focusedHandle = focusedHandle;
        if (changedSelection) {
            this._onDidChangeSelection.fire(Object.freeze({ selection: this.selectedElements }));
        }
        if (changedFocus) {
            this._onDidChangeActiveItem.fire(Object.freeze({ activeItem: this.focusedElement }));
        }
    }
    setVisible(visible) {
        if (visible !== this._visible) {
            this._visible = visible;
            this._onDidChangeVisibility.fire(Object.freeze({ visible: this._visible }));
        }
    }
    async setCheckboxState(checkboxUpdates) {
        const items = (await Promise.all(checkboxUpdates.map(async (checkboxUpdate) => {
            const extensionItem = this.getExtensionElement(checkboxUpdate.treeItemHandle);
            if (extensionItem) {
                return {
                    extensionItem: extensionItem,
                    treeItem: await this.dataProvider.getTreeItem(extensionItem),
                    newState: checkboxUpdate.newState
                        ? extHostTypes.TreeItemCheckboxState.Checked
                        : extHostTypes.TreeItemCheckboxState.Unchecked,
                };
            }
            return Promise.resolve(undefined);
        }))).filter((item) => item !== undefined);
        items.forEach((item) => {
            item.treeItem.checkboxState = item.newState
                ? extHostTypes.TreeItemCheckboxState.Checked
                : extHostTypes.TreeItemCheckboxState.Unchecked;
        });
        this._onDidChangeCheckboxState.fire({
            items: items.map((item) => [item.extensionItem, item.newState]),
        });
    }
    async handleDrag(sourceTreeItemHandles, treeDataTransfer, token) {
        const extensionTreeItems = [];
        for (const sourceHandle of sourceTreeItemHandles) {
            const extensionItem = this.getExtensionElement(sourceHandle);
            if (extensionItem) {
                extensionTreeItems.push(extensionItem);
            }
        }
        if (!this.dndController?.handleDrag || extensionTreeItems.length === 0) {
            return;
        }
        await this.dndController.handleDrag(extensionTreeItems, treeDataTransfer, token);
        return treeDataTransfer;
    }
    get hasHandleDrag() {
        return !!this.dndController?.handleDrag;
    }
    async onDrop(treeDataTransfer, targetHandleOrNode, token) {
        const target = targetHandleOrNode ? this.getExtensionElement(targetHandleOrNode) : undefined;
        if ((!target && targetHandleOrNode) || !this.dndController?.handleDrop) {
            return;
        }
        return asPromise(() => this.dndController?.handleDrop
            ? this.dndController.handleDrop(target, treeDataTransfer, token)
            : undefined);
    }
    get hasResolve() {
        return !!this.dataProvider.resolveTreeItem;
    }
    async resolveTreeItem(treeItemHandle, token) {
        if (!this.dataProvider.resolveTreeItem) {
            return;
        }
        const element = this.elements.get(treeItemHandle);
        if (element) {
            const node = this.nodes.get(element);
            if (node) {
                const resolve = (await this.dataProvider.resolveTreeItem(node.extensionItem, element, token)) ??
                    node.extensionItem;
                this.validateTreeItem(resolve);
                // Resolvable elements. Currently only tooltip and command.
                node.item.tooltip = this.getTooltip(resolve.tooltip);
                node.item.command = this.getCommand(node.disposableStore, resolve.command);
                return node.item;
            }
        }
        return;
    }
    resolveUnknownParentChain(element) {
        return this.resolveParent(element).then((parent) => {
            if (!parent) {
                return Promise.resolve([]);
            }
            return this.resolveUnknownParentChain(parent).then((result) => this.resolveTreeNode(parent, result[result.length - 1]).then((parentNode) => {
                result.push(parentNode);
                return result;
            }));
        });
    }
    resolveParent(element) {
        const node = this.nodes.get(element);
        if (node) {
            return Promise.resolve(node.parent ? this.elements.get(node.parent.item.handle) : undefined);
        }
        return asPromise(() => this.dataProvider.getParent(element));
    }
    resolveTreeNode(element, parent) {
        const node = this.nodes.get(element);
        if (node) {
            return Promise.resolve(node);
        }
        return asPromise(() => this.dataProvider.getTreeItem(element))
            .then((extTreeItem) => this.createHandle(element, extTreeItem, parent, true))
            .then((handle) => this.getChildren(parent ? parent.item.handle : undefined).then(() => {
            const cachedElement = this.getExtensionElement(handle);
            if (cachedElement) {
                const node = this.nodes.get(cachedElement);
                if (node) {
                    return Promise.resolve(node);
                }
            }
            throw new Error(`Cannot resolve tree item for element ${handle} from extension ${this.extension.identifier.value}`);
        }));
    }
    getChildrenNodes(parentNodeOrHandle) {
        if (parentNodeOrHandle) {
            let parentNode;
            if (typeof parentNodeOrHandle === 'string') {
                const parentElement = this.getExtensionElement(parentNodeOrHandle);
                parentNode = parentElement ? this.nodes.get(parentElement) : undefined;
            }
            else {
                parentNode = parentNodeOrHandle;
            }
            return parentNode ? parentNode.children || undefined : undefined;
        }
        return this.roots;
    }
    async fetchChildrenNodes(parentElement) {
        // clear children cache
        this.clearChildren(parentElement);
        const cts = new CancellationTokenSource(this._refreshCancellationSource.token);
        try {
            const parentNode = parentElement ? this.nodes.get(parentElement) : undefined;
            const elements = await this.dataProvider.getChildren(parentElement);
            if (cts.token.isCancellationRequested) {
                return undefined;
            }
            const coalescedElements = coalesce(elements || []);
            const treeItems = await Promise.all(coalesce(coalescedElements).map((element) => {
                return this.dataProvider.getTreeItem(element);
            }));
            if (cts.token.isCancellationRequested) {
                return undefined;
            }
            // createAndRegisterTreeNodes adds the nodes to a cache. This must be done sync so that they get added in the correct order.
            const items = treeItems.map((item, index) => item ? this.createAndRegisterTreeNode(coalescedElements[index], item, parentNode) : null);
            return coalesce(items);
        }
        finally {
            cts.dispose();
        }
    }
    refresh(elements) {
        const hasRoot = elements.some((element) => !element);
        if (hasRoot) {
            // Cancel any pending children fetches
            this._refreshCancellationSource.dispose(true);
            this._refreshCancellationSource = new CancellationTokenSource();
            this.clearAll(); // clear cache
            return this.proxy.$refresh(this.viewId);
        }
        else {
            const handlesToRefresh = this.getHandlesToRefresh(elements);
            if (handlesToRefresh.length) {
                return this.refreshHandles(handlesToRefresh);
            }
        }
        return Promise.resolve(undefined);
    }
    getHandlesToRefresh(elements) {
        const elementsToUpdate = new Set();
        const elementNodes = elements.map((element) => this.nodes.get(element));
        for (const elementNode of elementNodes) {
            if (elementNode && !elementsToUpdate.has(elementNode.item.handle)) {
                // check if an ancestor of extElement is already in the elements list
                let currentNode = elementNode;
                while (currentNode &&
                    currentNode.parent &&
                    elementNodes.findIndex((node) => currentNode &&
                        currentNode.parent &&
                        node &&
                        node.item.handle === currentNode.parent.item.handle) === -1) {
                    const parentElement = this.elements.get(currentNode.parent.item.handle);
                    currentNode = parentElement ? this.nodes.get(parentElement) : undefined;
                }
                if (currentNode && !currentNode.parent) {
                    elementsToUpdate.add(elementNode.item.handle);
                }
            }
        }
        const handlesToUpdate = [];
        // Take only top level elements
        elementsToUpdate.forEach((handle) => {
            const element = this.elements.get(handle);
            if (element) {
                const node = this.nodes.get(element);
                if (node && (!node.parent || !elementsToUpdate.has(node.parent.item.handle))) {
                    handlesToUpdate.push(handle);
                }
            }
        });
        return handlesToUpdate;
    }
    refreshHandles(itemHandles) {
        const itemsToRefresh = {};
        return Promise.all(itemHandles.map((treeItemHandle) => this.refreshNode(treeItemHandle).then((node) => {
            if (node) {
                itemsToRefresh[treeItemHandle] = node.item;
            }
        }))).then(() => Object.keys(itemsToRefresh).length
            ? this.proxy.$refresh(this.viewId, itemsToRefresh)
            : undefined);
    }
    refreshNode(treeItemHandle) {
        const extElement = this.getExtensionElement(treeItemHandle);
        if (extElement) {
            const existing = this.nodes.get(extElement);
            if (existing) {
                this.clearChildren(extElement); // clear children cache
                return asPromise(() => this.dataProvider.getTreeItem(extElement)).then((extTreeItem) => {
                    if (extTreeItem) {
                        const newNode = this.createTreeNode(extElement, extTreeItem, existing.parent);
                        this.updateNodeCache(extElement, newNode, existing, existing.parent);
                        existing.dispose();
                        return newNode;
                    }
                    return null;
                });
            }
        }
        return Promise.resolve(null);
    }
    createAndRegisterTreeNode(element, extTreeItem, parentNode) {
        const node = this.createTreeNode(element, extTreeItem, parentNode);
        if (extTreeItem.id && this.elements.has(node.item.handle)) {
            throw new Error(localize('treeView.duplicateElement', 'Element with id {0} is already registered', extTreeItem.id));
        }
        this.addNodeToCache(element, node);
        this.addNodeToParentCache(node, parentNode);
        return node;
    }
    getTooltip(tooltip) {
        if (extHostTypes.MarkdownString.isMarkdownString(tooltip)) {
            return MarkdownString.from(tooltip);
        }
        return tooltip;
    }
    getCommand(disposable, command) {
        return command
            ? { ...this.commands.toInternal(command, disposable), originalId: command.command }
            : undefined;
    }
    getCheckbox(extensionTreeItem) {
        if (extensionTreeItem.checkboxState === undefined) {
            return undefined;
        }
        let checkboxState;
        let tooltip = undefined;
        let accessibilityInformation = undefined;
        if (typeof extensionTreeItem.checkboxState === 'number') {
            checkboxState = extensionTreeItem.checkboxState;
        }
        else {
            checkboxState = extensionTreeItem.checkboxState.state;
            tooltip = extensionTreeItem.checkboxState.tooltip;
            accessibilityInformation = extensionTreeItem.checkboxState.accessibilityInformation;
        }
        return {
            isChecked: checkboxState === extHostTypes.TreeItemCheckboxState.Checked,
            tooltip,
            accessibilityInformation,
        };
    }
    validateTreeItem(extensionTreeItem) {
        if (!extHostTypes.TreeItem.isTreeItem(extensionTreeItem, this.extension)) {
            throw new Error(`Extension ${this.extension.identifier.value} has provided an invalid tree item.`);
        }
    }
    createTreeNode(element, extensionTreeItem, parent) {
        this.validateTreeItem(extensionTreeItem);
        const disposableStore = this._register(new DisposableStore());
        const handle = this.createHandle(element, extensionTreeItem, parent);
        const icon = this.getLightIconPath(extensionTreeItem);
        const item = {
            handle,
            parentHandle: parent ? parent.item.handle : undefined,
            label: toTreeItemLabel(extensionTreeItem.label, this.extension),
            description: extensionTreeItem.description,
            resourceUri: extensionTreeItem.resourceUri,
            tooltip: this.getTooltip(extensionTreeItem.tooltip),
            command: this.getCommand(disposableStore, extensionTreeItem.command),
            contextValue: extensionTreeItem.contextValue,
            icon,
            iconDark: this.getDarkIconPath(extensionTreeItem) || icon,
            themeIcon: this.getThemeIcon(extensionTreeItem),
            collapsibleState: isUndefinedOrNull(extensionTreeItem.collapsibleState)
                ? extHostTypes.TreeItemCollapsibleState.None
                : extensionTreeItem.collapsibleState,
            accessibilityInformation: extensionTreeItem.accessibilityInformation,
            checkbox: this.getCheckbox(extensionTreeItem),
        };
        return {
            item,
            extensionItem: extensionTreeItem,
            parent,
            children: undefined,
            disposableStore,
            dispose() {
                disposableStore.dispose();
            },
        };
    }
    getThemeIcon(extensionTreeItem) {
        return extensionTreeItem.iconPath instanceof extHostTypes.ThemeIcon
            ? extensionTreeItem.iconPath
            : undefined;
    }
    createHandle(element, { id, label, resourceUri }, parent, returnFirst) {
        if (id) {
            return `${ExtHostTreeView.ID_HANDLE_PREFIX}/${id}`;
        }
        const treeItemLabel = toTreeItemLabel(label, this.extension);
        const prefix = parent ? parent.item.handle : ExtHostTreeView.LABEL_HANDLE_PREFIX;
        let elementId = treeItemLabel ? treeItemLabel.label : resourceUri ? basename(resourceUri) : '';
        elementId = elementId.indexOf('/') !== -1 ? elementId.replace('/', '//') : elementId;
        const existingHandle = this.nodes.has(element)
            ? this.nodes.get(element).item.handle
            : undefined;
        const childrenNodes = this.getChildrenNodes(parent) || [];
        let handle;
        let counter = 0;
        do {
            handle = `${prefix}/${counter}:${elementId}`;
            if (returnFirst || !this.elements.has(handle) || existingHandle === handle) {
                // Return first if asked for or
                // Return if handle does not exist or
                // Return if handle is being reused
                break;
            }
            counter++;
        } while (counter <= childrenNodes.length);
        return handle;
    }
    getLightIconPath(extensionTreeItem) {
        if (extensionTreeItem.iconPath &&
            !(extensionTreeItem.iconPath instanceof extHostTypes.ThemeIcon)) {
            if (typeof extensionTreeItem.iconPath === 'string' || URI.isUri(extensionTreeItem.iconPath)) {
                return this.getIconPath(extensionTreeItem.iconPath);
            }
            return this.getIconPath(extensionTreeItem.iconPath.light);
        }
        return undefined;
    }
    getDarkIconPath(extensionTreeItem) {
        if (extensionTreeItem.iconPath &&
            !(extensionTreeItem.iconPath instanceof extHostTypes.ThemeIcon) &&
            extensionTreeItem.iconPath.dark) {
            return this.getIconPath(extensionTreeItem.iconPath.dark);
        }
        return undefined;
    }
    getIconPath(iconPath) {
        if (URI.isUri(iconPath)) {
            return iconPath;
        }
        return URI.file(iconPath);
    }
    addNodeToCache(element, node) {
        this.elements.set(node.item.handle, element);
        this.nodes.set(element, node);
    }
    updateNodeCache(element, newNode, existing, parentNode) {
        // Remove from the cache
        this.elements.delete(newNode.item.handle);
        this.nodes.delete(element);
        if (newNode.item.handle !== existing.item.handle) {
            this.elements.delete(existing.item.handle);
        }
        // Add the new node to the cache
        this.addNodeToCache(element, newNode);
        // Replace the node in parent's children nodes
        const childrenNodes = this.getChildrenNodes(parentNode) || [];
        const childNode = childrenNodes.filter((c) => c.item.handle === existing.item.handle)[0];
        if (childNode) {
            childrenNodes.splice(childrenNodes.indexOf(childNode), 1, newNode);
        }
    }
    addNodeToParentCache(node, parentNode) {
        if (parentNode) {
            if (!parentNode.children) {
                parentNode.children = [];
            }
            parentNode.children.push(node);
        }
        else {
            if (!this.roots) {
                this.roots = [];
            }
            this.roots.push(node);
        }
    }
    clearChildren(parentElement) {
        if (parentElement) {
            const node = this.nodes.get(parentElement);
            if (node) {
                if (node.children) {
                    for (const child of node.children) {
                        const childElement = this.elements.get(child.item.handle);
                        if (childElement) {
                            this.clear(childElement);
                        }
                    }
                }
                node.children = undefined;
            }
        }
        else {
            this.clearAll();
        }
    }
    clear(element) {
        const node = this.nodes.get(element);
        if (node) {
            if (node.children) {
                for (const child of node.children) {
                    const childElement = this.elements.get(child.item.handle);
                    if (childElement) {
                        this.clear(childElement);
                    }
                }
            }
            this.nodes.delete(element);
            this.elements.delete(node.item.handle);
            node.dispose();
        }
    }
    clearAll() {
        this.roots = undefined;
        this.elements.clear();
        this.nodes.forEach((node) => node.dispose());
        this.nodes.clear();
    }
    dispose() {
        super.dispose();
        this._refreshCancellationSource.dispose();
        this.clearAll();
        this.proxy.$disposeTree(this.viewId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRyZWVWaWV3cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUcmVlVmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBTzVGLE9BQU8sRUFRTixlQUFlLEdBQ2YsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekQsT0FBTyxLQUFLLFlBQVksTUFBTSxtQkFBbUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDM0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUdqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRixPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkYsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSxpREFBaUQsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxn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