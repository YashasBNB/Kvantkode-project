/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../base/common/event.js';
import { localize } from '../../nls.js';
import { createDecorator } from '../../platform/instantiation/common/instantiation.js';
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
import { getOrSet, SetMap } from '../../base/common/map.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { mixin } from '../../base/common/objects.js';
import { Codicon } from '../../base/common/codicons.js';
import { registerIcon } from '../../platform/theme/common/iconRegistry.js';
export const VIEWS_LOG_ID = 'views';
export const VIEWS_LOG_NAME = localize('views log', 'Views');
export const defaultViewIcon = registerIcon('default-view-icon', Codicon.window, localize('defaultViewIcon', 'Default view icon.'));
export var Extensions;
(function (Extensions) {
    Extensions.ViewContainersRegistry = 'workbench.registry.view.containers';
    Extensions.ViewsRegistry = 'workbench.registry.view';
})(Extensions || (Extensions = {}));
export var ViewContainerLocation;
(function (ViewContainerLocation) {
    ViewContainerLocation[ViewContainerLocation["Sidebar"] = 0] = "Sidebar";
    ViewContainerLocation[ViewContainerLocation["Panel"] = 1] = "Panel";
    ViewContainerLocation[ViewContainerLocation["AuxiliaryBar"] = 2] = "AuxiliaryBar";
})(ViewContainerLocation || (ViewContainerLocation = {}));
export const ViewContainerLocations = [
    0 /* ViewContainerLocation.Sidebar */,
    1 /* ViewContainerLocation.Panel */,
    2 /* ViewContainerLocation.AuxiliaryBar */,
];
export function ViewContainerLocationToString(viewContainerLocation) {
    switch (viewContainerLocation) {
        case 0 /* ViewContainerLocation.Sidebar */:
            return 'sidebar';
        case 1 /* ViewContainerLocation.Panel */:
            return 'panel';
        case 2 /* ViewContainerLocation.AuxiliaryBar */:
            return 'auxiliarybar';
    }
}
class ViewContainersRegistryImpl extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidRegister = this._register(new Emitter());
        this.onDidRegister = this._onDidRegister.event;
        this._onDidDeregister = this._register(new Emitter());
        this.onDidDeregister = this._onDidDeregister.event;
        this.viewContainers = new Map();
        this.defaultViewContainers = [];
    }
    get all() {
        return [...this.viewContainers.values()].flat();
    }
    registerViewContainer(viewContainerDescriptor, viewContainerLocation, options) {
        const existing = this.get(viewContainerDescriptor.id);
        if (existing) {
            return existing;
        }
        const viewContainer = viewContainerDescriptor;
        viewContainer.openCommandActionDescriptor = options?.doNotRegisterOpenCommand
            ? undefined
            : (viewContainer.openCommandActionDescriptor ?? { id: viewContainer.id });
        const viewContainers = getOrSet(this.viewContainers, viewContainerLocation, []);
        viewContainers.push(viewContainer);
        if (options?.isDefault) {
            this.defaultViewContainers.push(viewContainer);
        }
        this._onDidRegister.fire({ viewContainer, viewContainerLocation });
        return viewContainer;
    }
    deregisterViewContainer(viewContainer) {
        for (const viewContainerLocation of this.viewContainers.keys()) {
            const viewContainers = this.viewContainers.get(viewContainerLocation);
            const index = viewContainers?.indexOf(viewContainer);
            if (index !== -1) {
                viewContainers?.splice(index, 1);
                if (viewContainers.length === 0) {
                    this.viewContainers.delete(viewContainerLocation);
                }
                this._onDidDeregister.fire({ viewContainer, viewContainerLocation });
                return;
            }
        }
    }
    get(id) {
        return this.all.filter((viewContainer) => viewContainer.id === id)[0];
    }
    getViewContainers(location) {
        return [...(this.viewContainers.get(location) || [])];
    }
    getViewContainerLocation(container) {
        return [...this.viewContainers.keys()].filter((location) => this.getViewContainers(location).filter((viewContainer) => viewContainer?.id === container.id).length > 0)[0];
    }
    getDefaultViewContainer(location) {
        return this.defaultViewContainers.find((viewContainer) => this.getViewContainerLocation(viewContainer) === location);
    }
}
Registry.add(Extensions.ViewContainersRegistry, new ViewContainersRegistryImpl());
export var ViewContentGroups;
(function (ViewContentGroups) {
    ViewContentGroups["Open"] = "2_open";
    ViewContentGroups["Debug"] = "4_debug";
    ViewContentGroups["SCM"] = "5_scm";
    ViewContentGroups["More"] = "9_more";
})(ViewContentGroups || (ViewContentGroups = {}));
function compareViewContentDescriptors(a, b) {
    const aGroup = a.group ?? ViewContentGroups.More;
    const bGroup = b.group ?? ViewContentGroups.More;
    if (aGroup !== bGroup) {
        return aGroup.localeCompare(bGroup);
    }
    return (a.order ?? 5) - (b.order ?? 5);
}
class ViewsRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this._onViewsRegistered = this._register(new Emitter());
        this.onViewsRegistered = this._onViewsRegistered.event;
        this._onViewsDeregistered = this._register(new Emitter());
        this.onViewsDeregistered = this._onViewsDeregistered.event;
        this._onDidChangeContainer = this._register(new Emitter());
        this.onDidChangeContainer = this._onDidChangeContainer.event;
        this._onDidChangeViewWelcomeContent = this._register(new Emitter());
        this.onDidChangeViewWelcomeContent = this._onDidChangeViewWelcomeContent.event;
        this._viewContainers = [];
        this._views = new Map();
        this._viewWelcomeContents = new SetMap();
    }
    registerViews(views, viewContainer) {
        this.registerViews2([{ views, viewContainer }]);
    }
    registerViews2(views) {
        views.forEach(({ views, viewContainer }) => this.addViews(views, viewContainer));
        this._onViewsRegistered.fire(views);
    }
    deregisterViews(viewDescriptors, viewContainer) {
        const views = this.removeViews(viewDescriptors, viewContainer);
        if (views.length) {
            this._onViewsDeregistered.fire({ views, viewContainer });
        }
    }
    moveViews(viewsToMove, viewContainer) {
        for (const container of this._views.keys()) {
            if (container !== viewContainer) {
                const views = this.removeViews(viewsToMove, container);
                if (views.length) {
                    this.addViews(views, viewContainer);
                    this._onDidChangeContainer.fire({ views, from: container, to: viewContainer });
                }
            }
        }
    }
    getViews(loc) {
        return this._views.get(loc) || [];
    }
    getView(id) {
        for (const viewContainer of this._viewContainers) {
            const viewDescriptor = (this._views.get(viewContainer) || []).filter((v) => v.id === id)[0];
            if (viewDescriptor) {
                return viewDescriptor;
            }
        }
        return null;
    }
    getViewContainer(viewId) {
        for (const viewContainer of this._viewContainers) {
            const viewDescriptor = (this._views.get(viewContainer) || []).filter((v) => v.id === viewId)[0];
            if (viewDescriptor) {
                return viewContainer;
            }
        }
        return null;
    }
    registerViewWelcomeContent(id, viewContent) {
        this._viewWelcomeContents.add(id, viewContent);
        this._onDidChangeViewWelcomeContent.fire(id);
        return toDisposable(() => {
            this._viewWelcomeContents.delete(id, viewContent);
            this._onDidChangeViewWelcomeContent.fire(id);
        });
    }
    registerViewWelcomeContent2(id, viewContentMap) {
        const disposables = new Map();
        for (const [key, content] of viewContentMap) {
            this._viewWelcomeContents.add(id, content);
            disposables.set(key, toDisposable(() => {
                this._viewWelcomeContents.delete(id, content);
                this._onDidChangeViewWelcomeContent.fire(id);
            }));
        }
        this._onDidChangeViewWelcomeContent.fire(id);
        return disposables;
    }
    getViewWelcomeContent(id) {
        const result = [];
        this._viewWelcomeContents.forEach(id, (descriptor) => result.push(descriptor));
        return result.sort(compareViewContentDescriptors);
    }
    addViews(viewDescriptors, viewContainer) {
        let views = this._views.get(viewContainer);
        if (!views) {
            views = [];
            this._views.set(viewContainer, views);
            this._viewContainers.push(viewContainer);
        }
        for (const viewDescriptor of viewDescriptors) {
            if (this.getView(viewDescriptor.id) !== null) {
                throw new Error(localize('duplicateId', "A view with id '{0}' is already registered", viewDescriptor.id));
            }
            views.push(viewDescriptor);
        }
    }
    removeViews(viewDescriptors, viewContainer) {
        const views = this._views.get(viewContainer);
        if (!views) {
            return [];
        }
        const viewsToDeregister = [];
        const remaningViews = [];
        for (const view of views) {
            if (!viewDescriptors.includes(view)) {
                remaningViews.push(view);
            }
            else {
                viewsToDeregister.push(view);
            }
        }
        if (viewsToDeregister.length) {
            if (remaningViews.length) {
                this._views.set(viewContainer, remaningViews);
            }
            else {
                this._views.delete(viewContainer);
                this._viewContainers.splice(this._viewContainers.indexOf(viewContainer), 1);
            }
        }
        return viewsToDeregister;
    }
}
Registry.add(Extensions.ViewsRegistry, new ViewsRegistry());
export const IViewDescriptorService = createDecorator('viewDescriptorService');
export var ViewVisibilityState;
(function (ViewVisibilityState) {
    ViewVisibilityState[ViewVisibilityState["Default"] = 0] = "Default";
    ViewVisibilityState[ViewVisibilityState["Expand"] = 1] = "Expand";
})(ViewVisibilityState || (ViewVisibilityState = {}));
export var TreeItemCollapsibleState;
(function (TreeItemCollapsibleState) {
    TreeItemCollapsibleState[TreeItemCollapsibleState["None"] = 0] = "None";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(TreeItemCollapsibleState || (TreeItemCollapsibleState = {}));
export class ResolvableTreeItem {
    constructor(treeItem, resolve) {
        this.resolved = false;
        this._hasResolve = false;
        mixin(this, treeItem);
        this._hasResolve = !!resolve;
        this.resolve = async (token) => {
            if (resolve && !this.resolved) {
                const resolvedItem = await resolve(token);
                if (resolvedItem) {
                    // Resolvable elements. Currently tooltip and command.
                    this.tooltip = this.tooltip ?? resolvedItem.tooltip;
                    this.command = this.command ?? resolvedItem.command;
                }
            }
            if (!token.isCancellationRequested) {
                this.resolved = true;
            }
        };
    }
    get hasResolve() {
        return this._hasResolve;
    }
    resetResolve() {
        this.resolved = false;
    }
    asTreeItem() {
        return {
            handle: this.handle,
            parentHandle: this.parentHandle,
            collapsibleState: this.collapsibleState,
            label: this.label,
            description: this.description,
            icon: this.icon,
            iconDark: this.iconDark,
            themeIcon: this.themeIcon,
            resourceUri: this.resourceUri,
            tooltip: this.tooltip,
            contextValue: this.contextValue,
            command: this.command,
            children: this.children,
            accessibilityInformation: this.accessibilityInformation,
        };
    }
}
export class NoTreeViewError extends Error {
    constructor(treeViewId) {
        super(localize('treeView.notRegistered', "No tree view with id '{0}' registered.", treeViewId));
        this.name = 'NoTreeViewError';
    }
    static is(err) {
        return !!err && err.name === 'NoTreeViewError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL3ZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN0RixPQUFPLEVBQWUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXRGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBUXJFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBSzFFLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUE7QUFDbkMsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDNUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FDMUMsbUJBQW1CLEVBQ25CLE9BQU8sQ0FBQyxNQUFNLEVBQ2QsUUFBUSxDQUFDLGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLENBQ2pELENBQUE7QUFFRCxNQUFNLEtBQVcsVUFBVSxDQUcxQjtBQUhELFdBQWlCLFVBQVU7SUFDYixpQ0FBc0IsR0FBRyxvQ0FBb0MsQ0FBQTtJQUM3RCx3QkFBYSxHQUFHLHlCQUF5QixD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