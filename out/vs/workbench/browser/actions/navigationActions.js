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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF2aWdhdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL25hdmlnYXRpb25BY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMzQyxPQUFPLEVBQ04sb0JBQW9CLEdBSXBCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sZ0RBQWdELENBQUE7QUFDL0YsT0FBTyxFQUNOLE9BQU8sRUFFUCxlQUFlLEdBQ2YsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFHdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRzlFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBSWpHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVuRSxNQUFlLG9CQUFxQixTQUFRLE9BQU87SUFDbEQsWUFDQyxPQUF3QixFQUNkLFNBQW9CO1FBRTlCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUZKLGNBQVMsR0FBVCxTQUFTLENBQVc7SUFHL0IsQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDM0QsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDN0QsTUFBTSxvQkFBb0IsR0FBRyxRQUFR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