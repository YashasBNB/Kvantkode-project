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
import { Disposable, DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { Extensions, ResolvableTreeItem, NoTreeViewError, } from '../../common/views.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { distinct } from '../../../base/common/arrays.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { isUndefinedOrNull, isNumber } from '../../../base/common/types.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { createStringDataTransferItem, VSDataTransfer } from '../../../base/common/dataTransfer.js';
import { DataTransferFileCache } from '../common/shared/dataTransferCache.js';
import * as typeConvert from '../common/extHostTypeConverters.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
let MainThreadTreeViews = class MainThreadTreeViews extends Disposable {
    constructor(extHostContext, viewsService, notificationService, extensionService, logService) {
        super();
        this.viewsService = viewsService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.logService = logService;
        this._dataProviders = this._register(new DisposableMap());
        this._dndControllers = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTreeViews);
    }
    async $registerTreeViewDataProvider(treeViewId, options) {
        this.logService.trace('MainThreadTreeViews#$registerTreeViewDataProvider', treeViewId, options);
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            const dataProvider = new TreeViewDataProvider(treeViewId, this._proxy, this.notificationService);
            const disposables = new DisposableStore();
            this._dataProviders.set(treeViewId, { dataProvider, dispose: () => disposables.dispose() });
            const dndController = options.hasHandleDrag || options.hasHandleDrop
                ? new TreeViewDragAndDropController(treeViewId, options.dropMimeTypes, options.dragMimeTypes, options.hasHandleDrag, this._proxy)
                : undefined;
            const viewer = this.getTreeView(treeViewId);
            if (viewer) {
                // Order is important here. The internal tree isn't created until the dataProvider is set.
                // Set all other properties first!
                viewer.showCollapseAllAction = options.showCollapseAll;
                viewer.canSelectMany = options.canSelectMany;
                viewer.manuallyManageCheckboxes = options.manuallyManageCheckboxes;
                viewer.dragAndDropController = dndController;
                if (dndController) {
                    this._dndControllers.set(treeViewId, dndController);
                }
                viewer.dataProvider = dataProvider;
                this.registerListeners(treeViewId, viewer, disposables);
                this._proxy.$setVisible(treeViewId, viewer.visible);
            }
            else {
                this.notificationService.error('No view is registered with id: ' + treeViewId);
            }
        });
    }
    $reveal(treeViewId, itemInfo, options) {
        this.logService.trace('MainThreadTreeViews#$reveal', treeViewId, itemInfo?.item, itemInfo?.parentChain, options);
        return this.viewsService.openView(treeViewId, options.focus).then(() => {
            const viewer = this.getTreeView(treeViewId);
            if (viewer && itemInfo) {
                return this.reveal(viewer, this._dataProviders.get(treeViewId).dataProvider, itemInfo.item, itemInfo.parentChain, options);
            }
            return undefined;
        });
    }
    $refresh(treeViewId, itemsToRefreshByHandle) {
        this.logService.trace('MainThreadTreeViews#$refresh', treeViewId, itemsToRefreshByHandle);
        const viewer = this.getTreeView(treeViewId);
        const dataProvider = this._dataProviders.get(treeViewId);
        if (viewer && dataProvider) {
            const itemsToRefresh = dataProvider.dataProvider.getItemsToRefresh(itemsToRefreshByHandle);
            return viewer.refresh(itemsToRefresh.items.length ? itemsToRefresh.items : undefined, itemsToRefresh.checkboxes.length ? itemsToRefresh.checkboxes : undefined);
        }
        return Promise.resolve();
    }
    $setMessage(treeViewId, message) {
        this.logService.trace('MainThreadTreeViews#$setMessage', treeViewId, message.toString());
        const viewer = this.getTreeView(treeViewId);
        if (viewer) {
            viewer.message = message;
        }
    }
    $setTitle(treeViewId, title, description) {
        this.logService.trace('MainThreadTreeViews#$setTitle', treeViewId, title, description);
        const viewer = this.getTreeView(treeViewId);
        if (viewer) {
            viewer.title = title;
            viewer.description = description;
        }
    }
    $setBadge(treeViewId, badge) {
        this.logService.trace('MainThreadTreeViews#$setBadge', treeViewId, badge?.value, badge?.tooltip);
        const viewer = this.getTreeView(treeViewId);
        if (viewer) {
            viewer.badge = badge;
        }
    }
    $resolveDropFileData(destinationViewId, requestId, dataItemId) {
        const controller = this._dndControllers.get(destinationViewId);
        if (!controller) {
            throw new Error('Unknown tree');
        }
        return controller.resolveDropFileData(requestId, dataItemId);
    }
    async $disposeTree(treeViewId) {
        const viewer = this.getTreeView(treeViewId);
        if (viewer) {
            viewer.dataProvider = undefined;
        }
        this._dataProviders.deleteAndDispose(treeViewId);
    }
    async reveal(treeView, dataProvider, itemIn, parentChain, options) {
        options = options ? options : { select: false, focus: false };
        const select = isUndefinedOrNull(options.select) ? false : options.select;
        const focus = isUndefinedOrNull(options.focus) ? false : options.focus;
        let expand = Math.min(isNumber(options.expand) ? options.expand : options.expand === true ? 1 : 0, 3);
        if (dataProvider.isEmpty()) {
            // Refresh if empty
            await treeView.refresh();
        }
        for (const parent of parentChain) {
            const parentItem = dataProvider.getItem(parent.handle);
            if (parentItem) {
                await treeView.expand(parentItem);
            }
        }
        const item = dataProvider.getItem(itemIn.handle);
        if (item) {
            await treeView.reveal(item);
            if (select) {
                treeView.setSelection([item]);
            }
            if (focus === false) {
                treeView.setFocus();
            }
            else if (focus) {
                treeView.setFocus(item);
            }
            let itemsToExpand = [item];
            for (; itemsToExpand.length > 0 && expand > 0; expand--) {
                await treeView.expand(itemsToExpand);
                itemsToExpand = itemsToExpand.reduce((result, itemValue) => {
                    const item = dataProvider.getItem(itemValue.handle);
                    if (item && item.children && item.children.length) {
                        result.push(...item.children);
                    }
                    return result;
                }, []);
            }
        }
    }
    registerListeners(treeViewId, treeView, disposables) {
        disposables.add(treeView.onDidExpandItem((item) => this._proxy.$setExpanded(treeViewId, item.handle, true)));
        disposables.add(treeView.onDidCollapseItem((item) => this._proxy.$setExpanded(treeViewId, item.handle, false)));
        disposables.add(treeView.onDidChangeSelectionAndFocus((items) => this._proxy.$setSelectionAndFocus(treeViewId, items.selection.map(({ handle }) => handle), items.focus.handle)));
        disposables.add(treeView.onDidChangeVisibility((isVisible) => this._proxy.$setVisible(treeViewId, isVisible)));
        disposables.add(treeView.onDidChangeCheckboxState((items) => {
            this._proxy.$changeCheckboxState(treeViewId, items.map((item) => {
                return { treeItemHandle: item.handle, newState: item.checkbox?.isChecked ?? false };
            }));
        }));
    }
    getTreeView(treeViewId) {
        const viewDescriptor = (Registry.as(Extensions.ViewsRegistry).getView(treeViewId));
        return viewDescriptor ? viewDescriptor.treeView : null;
    }
    dispose() {
        for (const dataprovider of this._dataProviders) {
            const treeView = this.getTreeView(dataprovider[0]);
            if (treeView) {
                treeView.dataProvider = undefined;
            }
        }
        this._dataProviders.dispose();
        this._dndControllers.clear();
        super.dispose();
    }
};
MainThreadTreeViews = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTreeViews),
    __param(1, IViewsService),
    __param(2, INotificationService),
    __param(3, IExtensionService),
    __param(4, ILogService)
], MainThreadTreeViews);
export { MainThreadTreeViews };
class TreeViewDragAndDropController {
    constructor(treeViewId, dropMimeTypes, dragMimeTypes, hasWillDrop, _proxy) {
        this.treeViewId = treeViewId;
        this.dropMimeTypes = dropMimeTypes;
        this.dragMimeTypes = dragMimeTypes;
        this.hasWillDrop = hasWillDrop;
        this._proxy = _proxy;
        this.dataTransfersCache = new DataTransferFileCache();
    }
    async handleDrop(dataTransfer, targetTreeItem, token, operationUuid, sourceTreeId, sourceTreeItemHandles) {
        const request = this.dataTransfersCache.add(dataTransfer);
        try {
            const dataTransferDto = await typeConvert.DataTransfer.fromList(dataTransfer);
            if (token.isCancellationRequested) {
                return;
            }
            return await this._proxy.$handleDrop(this.treeViewId, request.id, dataTransferDto, targetTreeItem?.handle, token, operationUuid, sourceTreeId, sourceTreeItemHandles);
        }
        finally {
            request.dispose();
        }
    }
    async handleDrag(sourceTreeItemHandles, operationUuid, token) {
        if (!this.hasWillDrop) {
            return;
        }
        const additionalDataTransferDTO = await this._proxy.$handleDrag(this.treeViewId, sourceTreeItemHandles, operationUuid, token);
        if (!additionalDataTransferDTO) {
            return;
        }
        const additionalDataTransfer = new VSDataTransfer();
        additionalDataTransferDTO.items.forEach(([type, item]) => {
            additionalDataTransfer.replace(type, createStringDataTransferItem(item.asString));
        });
        return additionalDataTransfer;
    }
    resolveDropFileData(requestId, dataItemId) {
        return this.dataTransfersCache.resolveFileData(requestId, dataItemId);
    }
}
class TreeViewDataProvider {
    constructor(treeViewId, _proxy, notificationService) {
        this.treeViewId = treeViewId;
        this._proxy = _proxy;
        this.notificationService = notificationService;
        this.itemsMap = new Map();
        this.hasResolve = this._proxy.$hasResolve(this.treeViewId);
    }
    async getChildren(treeItem) {
        const batches = await this.getChildrenBatch(treeItem ? [treeItem] : undefined);
        return batches?.[0];
    }
    getChildrenBatch(treeItems) {
        if (!treeItems) {
            this.itemsMap.clear();
        }
        return this._proxy
            .$getChildren(this.treeViewId, treeItems ? treeItems.map((item) => item.handle) : undefined)
            .then((children) => {
            const convertedChildren = this.convertTransferChildren(treeItems ?? [], children);
            return this.postGetChildren(convertedChildren);
        }, (err) => {
            // It can happen that a tree view is disposed right as `getChildren` is called. This results in an error because the data provider gets removed.
            // The tree will shortly get cleaned up in this case. We just need to handle the error here.
            if (!NoTreeViewError.is(err)) {
                this.notificationService.error(err);
            }
            return [];
        });
    }
    convertTransferChildren(parents, children) {
        const convertedChildren = Array(parents.length);
        if (children) {
            for (const childGroup of children) {
                const childGroupIndex = childGroup[0];
                convertedChildren[childGroupIndex] = childGroup.slice(1);
            }
        }
        return convertedChildren;
    }
    getItemsToRefresh(itemsToRefreshByHandle) {
        const itemsToRefresh = [];
        const checkboxesToRefresh = [];
        if (itemsToRefreshByHandle) {
            for (const newTreeItemHandle of Object.keys(itemsToRefreshByHandle)) {
                const currentTreeItem = this.getItem(newTreeItemHandle);
                if (currentTreeItem) {
                    // Refresh only if the item exists
                    const newTreeItem = itemsToRefreshByHandle[newTreeItemHandle];
                    if (currentTreeItem.checkbox?.isChecked !== newTreeItem.checkbox?.isChecked) {
                        checkboxesToRefresh.push(currentTreeItem);
                    }
                    // Update the current item with refreshed item
                    this.updateTreeItem(currentTreeItem, newTreeItem);
                    if (newTreeItemHandle === newTreeItem.handle) {
                        itemsToRefresh.push(currentTreeItem);
                    }
                    else {
                        // Update maps when handle is changed and refresh parent
                        this.itemsMap.delete(newTreeItemHandle);
                        this.itemsMap.set(currentTreeItem.handle, currentTreeItem);
                        const parent = newTreeItem.parentHandle
                            ? this.itemsMap.get(newTreeItem.parentHandle)
                            : null;
                        if (parent) {
                            itemsToRefresh.push(parent);
                        }
                    }
                }
            }
        }
        return { items: itemsToRefresh, checkboxes: checkboxesToRefresh };
    }
    getItem(treeItemHandle) {
        return this.itemsMap.get(treeItemHandle);
    }
    isEmpty() {
        return this.itemsMap.size === 0;
    }
    async postGetChildren(elementGroups) {
        if (elementGroups === undefined) {
            return undefined;
        }
        const resultGroups = [];
        const hasResolve = await this.hasResolve;
        if (elementGroups) {
            for (const elements of elementGroups) {
                const result = [];
                resultGroups.push(result);
                if (!elements) {
                    continue;
                }
                for (const element of elements) {
                    const resolvable = new ResolvableTreeItem(element, hasResolve
                        ? (token) => {
                            return this._proxy.$resolve(this.treeViewId, element.handle, token);
                        }
                        : undefined);
                    this.itemsMap.set(element.handle, resolvable);
                    result.push(resolvable);
                }
            }
        }
        return resultGroups;
    }
    updateTreeItem(current, treeItem) {
        treeItem.children = treeItem.children ? treeItem.children : undefined;
        if (current) {
            const properties = distinct([
                ...Object.keys(current instanceof ResolvableTreeItem ? current.asTreeItem() : current),
                ...Object.keys(treeItem),
            ]);
            for (const property of properties) {
                ;
                current[property] = treeItem[property];
            }
            if (current instanceof ResolvableTreeItem) {
                current.resetResolve();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRyZWVWaWV3cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRUcmVlVmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUYsT0FBTyxFQUNOLGNBQWMsRUFHZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBTU4sVUFBVSxFQUNWLGtCQUFrQixFQUdsQixlQUFlLEdBRWYsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RSxPQUFPLEtBQUssV0FBVyxNQUFNLG9DQUFvQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FB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