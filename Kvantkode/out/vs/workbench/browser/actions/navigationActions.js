/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../nls.js';
import { IEditorGroupsService, } from '../../services/editor/common/editorGroupsService.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { Action2, registerAction2, } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { getActiveWindow } from '../../../base/browser/dom.js';
import { isAuxiliaryWindow } from '../../../base/browser/window.js';
class BaseNavigationAction extends Action2 {
    constructor(options, direction) {
        super(options);
        this.direction = direction;
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const isEditorFocus = layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */);
        const isPanelFocus = layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
        const isSidebarFocus = layoutService.hasFocus("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const isAuxiliaryBarFocus = layoutService.hasFocus("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        let neighborPart;
        if (isEditorFocus) {
            const didNavigate = this.navigateAcrossEditorGroup(this.toGroupDirection(this.direction), editorGroupService);
            if (didNavigate) {
                return;
            }
            neighborPart = layoutService.getVisibleNeighborPart("workbench.parts.editor" /* Parts.EDITOR_PART */, this.direction);
        }
        if (isPanelFocus) {
            neighborPart = layoutService.getVisibleNeighborPart("workbench.parts.panel" /* Parts.PANEL_PART */, this.direction);
        }
        if (isSidebarFocus) {
            neighborPart = layoutService.getVisibleNeighborPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, this.direction);
        }
        if (isAuxiliaryBarFocus) {
            neighborPart = neighborPart = layoutService.getVisibleNeighborPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, this.direction);
        }
        if (neighborPart === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            if (!this.navigateBackToEditorGroup(this.toGroupDirection(this.direction), editorGroupService)) {
                this.navigateToEditorGroup(this.direction === 3 /* Direction.Right */ ? 0 /* GroupLocation.FIRST */ : 1 /* GroupLocation.LAST */, editorGroupService);
            }
        }
        else if (neighborPart === "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) {
            this.navigateToSidebar(layoutService, paneCompositeService);
        }
        else if (neighborPart === "workbench.parts.panel" /* Parts.PANEL_PART */) {
            this.navigateToPanel(layoutService, paneCompositeService);
        }
        else if (neighborPart === "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) {
            this.navigateToAuxiliaryBar(layoutService, paneCompositeService);
        }
    }
    async navigateToPanel(layoutService, paneCompositeService) {
        if (!layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            return false;
        }
        const activePanel = paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if (!activePanel) {
            return false;
        }
        const activePanelId = activePanel.getId();
        const res = await paneCompositeService.openPaneComposite(activePanelId, 1 /* ViewContainerLocation.Panel */, true);
        if (!res) {
            return false;
        }
        return res;
    }
    async navigateToSidebar(layoutService, paneCompositeService) {
        if (!layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            return false;
        }
        const activeViewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (!activeViewlet) {
            return false;
        }
        const activeViewletId = activeViewlet.getId();
        const viewlet = await paneCompositeService.openPaneComposite(activeViewletId, 0 /* ViewContainerLocation.Sidebar */, true);
        return !!viewlet;
    }
    async navigateToAuxiliaryBar(layoutService, paneCompositeService) {
        if (!layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            return false;
        }
        const activePanel = paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
        if (!activePanel) {
            return false;
        }
        const activePanelId = activePanel.getId();
        const res = await paneCompositeService.openPaneComposite(activePanelId, 2 /* ViewContainerLocation.AuxiliaryBar */, true);
        if (!res) {
            return false;
        }
        return res;
    }
    navigateAcrossEditorGroup(direction, editorGroupService) {
        return this.doNavigateToEditorGroup({ direction }, editorGroupService);
    }
    navigateToEditorGroup(location, editorGroupService) {
        return this.doNavigateToEditorGroup({ location }, editorGroupService);
    }
    navigateBackToEditorGroup(direction, editorGroupService) {
        if (!editorGroupService.activeGroup) {
            return false;
        }
        const oppositeDirection = this.toOppositeDirection(direction);
        // Check to see if there is a group in between the last
        // active group and the direction of movement
        const groupInBetween = editorGroupService.findGroup({ direction: oppositeDirection }, editorGroupService.activeGroup);
        if (!groupInBetween) {
            // No group in between means we can return
            // focus to the last active editor group
            editorGroupService.activeGroup.focus();
            return true;
        }
        return false;
    }
    toGroupDirection(direction) {
        switch (direction) {
            case 1 /* Direction.Down */:
                return 1 /* GroupDirection.DOWN */;
            case 2 /* Direction.Left */:
                return 2 /* GroupDirection.LEFT */;
            case 3 /* Direction.Right */:
                return 3 /* GroupDirection.RIGHT */;
            case 0 /* Direction.Up */:
                return 0 /* GroupDirection.UP */;
        }
    }
    toOppositeDirection(direction) {
        switch (direction) {
            case 0 /* GroupDirection.UP */:
                return 1 /* GroupDirection.DOWN */;
            case 3 /* GroupDirection.RIGHT */:
                return 2 /* GroupDirection.LEFT */;
            case 2 /* GroupDirection.LEFT */:
                return 3 /* GroupDirection.RIGHT */;
            case 1 /* GroupDirection.DOWN */:
                return 0 /* GroupDirection.UP */;
        }
    }
    doNavigateToEditorGroup(scope, editorGroupService) {
        const targetGroup = editorGroupService.findGroup(scope, editorGroupService.activeGroup);
        if (targetGroup) {
            targetGroup.focus();
            return true;
        }
        return false;
    }
}
registerAction2(class extends BaseNavigationAction {
    constructor() {
        super({
            id: 'workbench.action.navigateLeft',
            title: localize2('navigateLeft', 'Navigate to the View on the Left'),
            category: Categories.View,
            f1: true,
        }, 2 /* Direction.Left */);
    }
});
registerAction2(class extends BaseNavigationAction {
    constructor() {
        super({
            id: 'workbench.action.navigateRight',
            title: localize2('navigateRight', 'Navigate to the View on the Right'),
            category: Categories.View,
            f1: true,
        }, 3 /* Direction.Right */);
    }
});
registerAction2(class extends BaseNavigationAction {
    constructor() {
        super({
            id: 'workbench.action.navigateUp',
            title: localize2('navigateUp', 'Navigate to the View Above'),
            category: Categories.View,
            f1: true,
        }, 0 /* Direction.Up */);
    }
});
registerAction2(class extends BaseNavigationAction {
    constructor() {
        super({
            id: 'workbench.action.navigateDown',
            title: localize2('navigateDown', 'Navigate to the View Below'),
            category: Categories.View,
            f1: true,
        }, 1 /* Direction.Down */);
    }
});
class BaseFocusAction extends Action2 {
    constructor(options, focusNext) {
        super(options);
        this.focusNext = focusNext;
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorService = accessor.get(IEditorService);
        this.focusNextOrPreviousPart(layoutService, editorService, this.focusNext);
    }
    findVisibleNeighbour(layoutService, part, next) {
        const activeWindow = getActiveWindow();
        const windowIsAuxiliary = isAuxiliaryWindow(activeWindow);
        let neighbour;
        if (windowIsAuxiliary) {
            switch (part) {
                case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                    neighbour = "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */;
                    break;
                default:
                    neighbour = "workbench.parts.editor" /* Parts.EDITOR_PART */;
            }
        }
        else {
            switch (part) {
                case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                    neighbour = next ? "workbench.parts.panel" /* Parts.PANEL_PART */ : "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
                    break;
                case "workbench.parts.panel" /* Parts.PANEL_PART */:
                    neighbour = next ? "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */ : "workbench.parts.editor" /* Parts.EDITOR_PART */;
                    break;
                case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                    neighbour = next ? "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */ : "workbench.parts.panel" /* Parts.PANEL_PART */;
                    break;
                case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                    neighbour = next ? "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */ : "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
                    break;
                case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                    neighbour = next ? "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ : "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */;
                    break;
                case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                    neighbour = next ? "workbench.parts.editor" /* Parts.EDITOR_PART */ : "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */;
                    break;
                default:
                    neighbour = "workbench.parts.editor" /* Parts.EDITOR_PART */;
            }
        }
        if (layoutService.isVisible(neighbour, activeWindow) || neighbour === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            return neighbour;
        }
        return this.findVisibleNeighbour(layoutService, neighbour, next);
    }
    focusNextOrPreviousPart(layoutService, editorService, next) {
        let currentlyFocusedPart;
        if (editorService.activeEditorPane?.hasFocus() || layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */)) {
            currentlyFocusedPart = "workbench.parts.editor" /* Parts.EDITOR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */)) {
            currentlyFocusedPart = "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */)) {
            currentlyFocusedPart = "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            currentlyFocusedPart = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            currentlyFocusedPart = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            currentlyFocusedPart = "workbench.parts.panel" /* Parts.PANEL_PART */;
        }
        layoutService.focusPart(currentlyFocusedPart
            ? this.findVisibleNeighbour(layoutService, currentlyFocusedPart, next)
            : "workbench.parts.editor" /* Parts.EDITOR_PART */, getActiveWindow());
    }
}
registerAction2(class extends BaseFocusAction {
    constructor() {
        super({
            id: 'workbench.action.focusNextPart',
            title: localize2('focusNextPart', 'Focus Next Part'),
            category: Categories.View,
            f1: true,
            keybinding: {
                primary: 64 /* KeyCode.F6 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        }, true);
    }
});
registerAction2(class extends BaseFocusAction {
    constructor() {
        super({
            id: 'workbench.action.focusPreviousPart',
            title: localize2('focusPreviousPart', 'Focus Previous Part'),
            category: Categories.View,
            f1: true,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 64 /* KeyCode.F6 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        }, false);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF2aWdhdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvbmF2aWdhdGlvbkFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzNDLE9BQU8sRUFDTixvQkFBb0IsR0FJcEIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQVMsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRixPQUFPLEVBQ04sT0FBTyxFQUVQLGVBQWUsR0FDZixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUd0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFHOUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFJakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRW5FLE1BQWUsb0JBQXFCLFNBQVEsT0FBTztJQUNsRCxZQUNDLE9BQXdCLEVBQ2QsU0FBb0I7UUFFOUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRkosY0FBUyxHQUFULFNBQVMsQ0FBVztJQUcvQixDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUMzRCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM3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