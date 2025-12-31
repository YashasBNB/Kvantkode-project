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
import { Registry } from '../../platform/registry/common/platform.js';
import { Composite, CompositeDescriptor, CompositeRegistry } from './composite.js';
import { IInstantiationService, } from '../../platform/instantiation/common/instantiation.js';
import { Separator } from '../../base/common/actions.js';
import { SubmenuItemAction } from '../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../platform/contextview/browser/contextView.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { ViewsSubMenu } from './parts/views/viewPaneContainer.js';
import { IExtensionService } from '../services/extensions/common/extensions.js';
import { VIEWPANE_FILTER_ACTION } from './parts/views/viewPane.js';
let PaneComposite = class PaneComposite extends Composite {
    constructor(id, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService) {
        super(id, telemetryService, themeService, storageService);
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.extensionService = extensionService;
        this.contextService = contextService;
    }
    create(parent) {
        super.create(parent);
        this.viewPaneContainer = this._register(this.createViewPaneContainer(parent));
        this._register(this.viewPaneContainer.onTitleAreaUpdate(() => this.updateTitleArea()));
        this.viewPaneContainer.create(parent);
    }
    setVisible(visible) {
        super.setVisible(visible);
        this.viewPaneContainer?.setVisible(visible);
    }
    layout(dimension) {
        this.viewPaneContainer?.layout(dimension);
    }
    setBoundarySashes(sashes) {
        this.viewPaneContainer?.setBoundarySashes(sashes);
    }
    getOptimalWidth() {
        return this.viewPaneContainer?.getOptimalWidth() ?? 0;
    }
    openView(id, focus) {
        return this.viewPaneContainer?.openView(id, focus);
    }
    getViewPaneContainer() {
        return this.viewPaneContainer;
    }
    getActionsContext() {
        return this.getViewPaneContainer()?.getActionsContext();
    }
    getContextMenuActions() {
        return this.viewPaneContainer?.menuActions?.getContextMenuActions() ?? [];
    }
    getMenuIds() {
        const result = [];
        if (this.viewPaneContainer?.menuActions) {
            result.push(this.viewPaneContainer.menuActions.menuId);
            if (this.viewPaneContainer.isViewMergedWithContainer()) {
                result.push(this.viewPaneContainer.panes[0].menuActions.menuId);
            }
        }
        return result;
    }
    getActions() {
        const result = [];
        if (this.viewPaneContainer?.menuActions) {
            result.push(...this.viewPaneContainer.menuActions.getPrimaryActions());
            if (this.viewPaneContainer.isViewMergedWithContainer()) {
                const viewPane = this.viewPaneContainer.panes[0];
                if (viewPane.shouldShowFilterInHeader()) {
                    result.push(VIEWPANE_FILTER_ACTION);
                }
                result.push(...viewPane.menuActions.getPrimaryActions());
            }
        }
        return result;
    }
    getSecondaryActions() {
        if (!this.viewPaneContainer?.menuActions) {
            return [];
        }
        const viewPaneActions = this.viewPaneContainer.isViewMergedWithContainer()
            ? this.viewPaneContainer.panes[0].menuActions.getSecondaryActions()
            : [];
        let menuActions = this.viewPaneContainer.menuActions.getSecondaryActions();
        const viewsSubmenuActionIndex = menuActions.findIndex((action) => action instanceof SubmenuItemAction && action.item.submenu === ViewsSubMenu);
        if (viewsSubmenuActionIndex !== -1) {
            const viewsSubmenuAction = menuActions[viewsSubmenuActionIndex];
            if (viewsSubmenuAction.actions.some(({ enabled }) => enabled)) {
                if (menuActions.length === 1 && viewPaneActions.length === 0) {
                    menuActions = viewsSubmenuAction.actions.slice();
                }
                else if (viewsSubmenuActionIndex !== 0) {
                    menuActions = [
                        viewsSubmenuAction,
                        ...menuActions.slice(0, viewsSubmenuActionIndex),
                        ...menuActions.slice(viewsSubmenuActionIndex + 1),
                    ];
                }
            }
            else {
                // Remove views submenu if none of the actions are enabled
                menuActions.splice(viewsSubmenuActionIndex, 1);
            }
        }
        if (menuActions.length && viewPaneActions.length) {
            return [...menuActions, new Separator(), ...viewPaneActions];
        }
        return menuActions.length ? menuActions : viewPaneActions;
    }
    getActionViewItem(action, options) {
        return this.viewPaneContainer?.getActionViewItem(action, options);
    }
    getTitle() {
        return this.viewPaneContainer?.getTitle() ?? '';
    }
    focus() {
        super.focus();
        this.viewPaneContainer?.focus();
    }
};
PaneComposite = __decorate([
    __param(1, ITelemetryService),
    __param(2, IStorageService),
    __param(3, IInstantiationService),
    __param(4, IThemeService),
    __param(5, IContextMenuService),
    __param(6, IExtensionService),
    __param(7, IWorkspaceContextService)
], PaneComposite);
export { PaneComposite };
/**
 * A Pane Composite descriptor is a lightweight descriptor of a Pane Composite in the workbench.
 */
export class PaneCompositeDescriptor extends CompositeDescriptor {
    static create(ctor, id, name, cssClass, order, requestedIndex, iconUrl) {
        return new PaneCompositeDescriptor(ctor, id, name, cssClass, order, requestedIndex, iconUrl);
    }
    constructor(ctor, id, name, cssClass, order, requestedIndex, iconUrl) {
        super(ctor, id, name, cssClass, order, requestedIndex);
        this.iconUrl = iconUrl;
    }
}
export const Extensions = {
    Viewlets: 'workbench.contributions.viewlets',
    Panels: 'workbench.contributions.panels',
    Auxiliary: 'workbench.contributions.auxiliary',
};
export class PaneCompositeRegistry extends CompositeRegistry {
    /**
     * Registers a viewlet to the platform.
     */
    registerPaneComposite(descriptor) {
        super.registerComposite(descriptor);
    }
    /**
     * Deregisters a viewlet to the platform.
     */
    deregisterPaneComposite(id) {
        super.deregisterComposite(id);
    }
    /**
     * Returns the viewlet descriptor for the given id or null if none.
     */
    getPaneComposite(id) {
        return this.getComposite(id);
    }
    /**
     * Returns an array of registered viewlets known to the platform.
     */
    getPaneComposites() {
        return this.getComposites();
    }
}
Registry.add(Extensions.Viewlets, new PaneCompositeRegistry());
Registry.add(Extensions.Panels, new PaneCompositeRegistry());
Registry.add(Extensions.Auxiliary, new PaneCompositeRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWNvbXBvc2l0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhbmVjb21wb3NpdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNsRixPQUFPLEVBR04scUJBQXFCLEdBQ3JCLE1BQU0sc0RBQXNELENBQUE7QUFJN0QsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2pFLE9BQU8sRUFBVSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFxQixZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUdwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUkzRCxJQUFlLGFBQWEsR0FBNUIsTUFBZSxhQUFjLFNBQVEsU0FBUztJQUdwRCxZQUNDLEVBQVUsRUFDUyxnQkFBbUMsRUFDM0IsY0FBK0IsRUFDekIsb0JBQTJDLEVBQzdELFlB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