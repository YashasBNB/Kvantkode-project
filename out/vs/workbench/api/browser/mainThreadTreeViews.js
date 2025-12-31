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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRyZWVWaWV3cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVHJlZVZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlGLE9BQU8sRUFDTixjQUFjLEVBR2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQU1OLFVBQVUsRUFDVixrQkFBa0IsRUFHbEIsZUFBZSxHQUVmLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0UsT0FBTyxLQUFLLFdBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFH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