/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/panelpart.css';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, Action2, } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { isHorizontal, IWorkbenchLayoutService, positionToString, } from '../../../services/layout/browser/layoutService.js';
import { PanelAlignmentContext, PanelMaximizedContext, PanelPositionContext, PanelVisibleContext, } from '../../../common/contextkeys.js';
import { ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
const maximizeIcon = registerIcon('panel-maximize', Codicon.chevronUp, localize('maximizeIcon', 'Icon to maximize a panel.'));
const restoreIcon = registerIcon('panel-restore', Codicon.chevronDown, localize('restoreIcon', 'Icon to restore a panel.'));
export const closeIcon = registerIcon('panel-close', Codicon.close, localize('closeIcon', 'Icon to close a panel.'));
const panelIcon = registerIcon('panel-layout-icon', Codicon.layoutPanel, localize('togglePanelOffIcon', 'Icon to toggle the panel off when it is on.'));
const panelOffIcon = registerIcon('panel-layout-icon-off', Codicon.layoutPanelOff, localize('togglePanelOnIcon', 'Icon to toggle the panel on when it is off.'));
export class TogglePanelAction extends Action2 {
    static { this.ID = 'workbench.action.togglePanel'; }
    static { this.LABEL = localize2('togglePanelVisibility', 'Toggle Panel Visibility'); }
    constructor() {
        super({
            id: TogglePanelAction.ID,
            title: TogglePanelAction.LABEL,
            toggled: {
                condition: PanelVisibleContext,
                title: localize('closePanel', 'Hide Panel'),
                icon: closeIcon,
                mnemonicTitle: localize({ key: 'toggle panel mnemonic', comment: ['&& denotes a mnemonic'] }, '&&Panel'),
            },
            icon: closeIcon, // Ensures no flickering when using toggled.icon
            f1: true,
            category: Categories.View,
            metadata: {
                description: localize('openAndClosePanel', 'Open/Show and Close/Hide Panel'),
            },
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 40 /* KeyCode.KeyJ */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 5,
                },
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 4,
                },
                {
                    id: MenuId.PanelTitle,
                    group: 'navigation',
                    order: 2,
                },
            ],
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */), "workbench.parts.panel" /* Parts.PANEL_PART */);
    }
}
registerAction2(TogglePanelAction);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closePanel',
            title: localize2('closePanel', 'Hide Panel'),
            category: Categories.View,
            precondition: PanelVisibleContext,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).setPartHidden(true, "workbench.parts.panel" /* Parts.PANEL_PART */);
    }
});
registerAction2(class extends Action2 {
    static { this.ID = 'workbench.action.focusPanel'; }
    static { this.LABEL = localize('focusPanel', 'Focus into Panel'); }
    constructor() {
        super({
            id: 'workbench.action.focusPanel',
            title: localize2('focusPanel', 'Focus into Panel'),
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        // Show panel
        if (!layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        // Focus into active panel
        const panel = paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        panel?.focus();
    }
});
const PositionPanelActionId = {
    LEFT: 'workbench.action.positionPanelLeft',
    RIGHT: 'workbench.action.positionPanelRight',
    BOTTOM: 'workbench.action.positionPanelBottom',
    TOP: 'workbench.action.positionPanelTop',
};
const AlignPanelActionId = {
    LEFT: 'workbench.action.alignPanelLeft',
    RIGHT: 'workbench.action.alignPanelRight',
    CENTER: 'workbench.action.alignPanelCenter',
    JUSTIFY: 'workbench.action.alignPanelJustify',
};
function createPanelActionConfig(id, title, shortLabel, value, when) {
    return {
        id,
        title,
        shortLabel,
        value,
        when,
    };
}
function createPositionPanelActionConfig(id, title, shortLabel, position) {
    return createPanelActionConfig(id, title, shortLabel, position, PanelPositionContext.notEqualsTo(positionToString(position)));
}
function createAlignmentPanelActionConfig(id, title, shortLabel, alignment) {
    return createPanelActionConfig(id, title, shortLabel, alignment, PanelAlignmentContext.notEqualsTo(alignment));
}
const PositionPanelActionConfigs = [
    createPositionPanelActionConfig(PositionPanelActionId.TOP, localize2('positionPanelTop', 'Move Panel To Top'), localize('positionPanelTopShort', 'Top'), 3 /* Position.TOP */),
    createPositionPanelActionConfig(PositionPanelActionId.LEFT, localize2('positionPanelLeft', 'Move Panel Left'), localize('positionPanelLeftShort', 'Left'), 0 /* Position.LEFT */),
    createPositionPanelActionConfig(PositionPanelActionId.RIGHT, localize2('positionPanelRight', 'Move Panel Right'), localize('positionPanelRightShort', 'Right'), 1 /* Position.RIGHT */),
    createPositionPanelActionConfig(PositionPanelActionId.BOTTOM, localize2('positionPanelBottom', 'Move Panel To Bottom'), localize('positionPanelBottomShort', 'Bottom'), 2 /* Position.BOTTOM */),
];
const AlignPanelActionConfigs = [
    createAlignmentPanelActionConfig(AlignPanelActionId.LEFT, localize2('alignPanelLeft', 'Set Panel Alignment to Left'), localize('alignPanelLeftShort', 'Left'), 'left'),
    createAlignmentPanelActionConfig(AlignPanelActionId.RIGHT, localize2('alignPanelRight', 'Set Panel Alignment to Right'), localize('alignPanelRightShort', 'Right'), 'right'),
    createAlignmentPanelActionConfig(AlignPanelActionId.CENTER, localize2('alignPanelCenter', 'Set Panel Alignment to Center'), localize('alignPanelCenterShort', 'Center'), 'center'),
    createAlignmentPanelActionConfig(AlignPanelActionId.JUSTIFY, localize2('alignPanelJustify', 'Set Panel Alignment to Justify'), localize('alignPanelJustifyShort', 'Justify'), 'justify'),
];
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.PanelPositionMenu,
    title: localize('positionPanel', 'Panel Position'),
    group: '3_workbench_layout_move',
    order: 4,
});
PositionPanelActionConfigs.forEach((positionPanelAction, index) => {
    const { id, title, shortLabel, value, when } = positionPanelAction;
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id,
                title,
                category: Categories.View,
                f1: true,
            });
        }
        run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            layoutService.setPanelPosition(value === undefined ? 2 /* Position.BOTTOM */ : value);
        }
    });
    MenuRegistry.appendMenuItem(MenuId.PanelPositionMenu, {
        command: {
            id,
            title: shortLabel,
            toggled: when.negate(),
        },
        order: 5 + index,
    });
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.PanelAlignmentMenu,
    title: localize('alignPanel', 'Align Panel'),
    group: '3_workbench_layout_move',
    order: 5,
});
AlignPanelActionConfigs.forEach((alignPanelAction) => {
    const { id, title, shortLabel, value, when } = alignPanelAction;
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id,
                title,
                category: Categories.View,
                toggled: when.negate(),
                f1: true,
            });
        }
        run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            layoutService.setPanelAlignment(value === undefined ? 'center' : value);
        }
    });
    MenuRegistry.appendMenuItem(MenuId.PanelAlignmentMenu, {
        command: {
            id,
            title: shortLabel,
            toggled: when.negate(),
        },
        order: 5,
    });
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousPanelView',
            title: localize2('previousPanelView', 'Previous Panel View'),
            category: Categories.View,
            f1: true,
        }, 1 /* ViewContainerLocation.Panel */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextPanelView',
            title: localize2('nextPanelView', 'Next Panel View'),
            category: Categories.View,
            f1: true,
        }, 1 /* ViewContainerLocation.Panel */, 1);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleMaximizedPanel',
            title: localize2('toggleMaximizedPanel', 'Toggle Maximized Panel'),
            tooltip: localize('maximizePanel', 'Maximize Panel Size'),
            category: Categories.View,
            f1: true,
            icon: maximizeIcon, // This is being rotated in CSS depending on the panel position
            // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
            precondition: ContextKeyExpr.or(PanelAlignmentContext.isEqualTo('center'), ContextKeyExpr.and(PanelPositionContext.notEqualsTo('bottom'), PanelPositionContext.notEqualsTo('top'))),
            toggled: {
                condition: PanelMaximizedContext,
                icon: restoreIcon,
                tooltip: localize('minimizePanel', 'Restore Panel Size'),
            },
            menu: [
                {
                    id: MenuId.PanelTitle,
                    group: 'navigation',
                    order: 1,
                    // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
                    when: ContextKeyExpr.or(PanelAlignmentContext.isEqualTo('center'), ContextKeyExpr.and(PanelPositionContext.notEqualsTo('bottom'), PanelPositionContext.notEqualsTo('top'))),
                },
            ],
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const notificationService = accessor.get(INotificationService);
        if (layoutService.getPanelAlignment() !== 'center' &&
            isHorizontal(layoutService.getPanelPosition())) {
            notificationService.warn(localize('panelMaxNotSupported', 'Maximizing the panel is only supported when it is center aligned.'));
            return;
        }
        if (!layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
            // If the panel is not already maximized, maximize it
            if (!layoutService.isPanelMaximized()) {
                layoutService.toggleMaximizedPanel();
            }
        }
        else {
            layoutService.toggleMaximizedPanel();
        }
    }
});
MenuRegistry.appendMenuItems([
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: TogglePanelAction.ID,
                title: localize('togglePanel', 'Toggle Panel'),
                icon: panelOffIcon,
                toggled: { condition: PanelVisibleContext, icon: panelIcon },
            },
            when: ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')),
            order: 1,
        },
    },
]);
class MoveViewsBetweenPanelsAction extends Action2 {
    constructor(source, destination, desc) {
        super(desc);
        this.source = source;
        this.destination = destination;
    }
    run(accessor, ...args) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const viewsService = accessor.get(IViewsService);
        const srcContainers = viewDescriptorService.getViewContainersByLocation(this.source);
        const destContainers = viewDescriptorService.getViewContainersByLocation(this.destination);
        if (srcContainers.length) {
            const activeViewContainer = viewsService.getVisibleViewContainer(this.source);
            srcContainers.forEach((viewContainer) => viewDescriptorService.moveViewContainerToLocation(viewContainer, this.destination, undefined, this.desc.id));
            layoutService.setPartHidden(false, this.destination === 1 /* ViewContainerLocation.Panel */
                ? "workbench.parts.panel" /* Parts.PANEL_PART */
                : "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            if (activeViewContainer && destContainers.length === 0) {
                viewsService.openViewContainer(activeViewContainer.id, true);
            }
        }
    }
}
// --- Move Panel Views To KvantKode Side Bar
class MovePanelToSidePanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.movePanelToSidePanel'; }
    constructor() {
        super(1 /* ViewContainerLocation.Panel */, 2 /* ViewContainerLocation.AuxiliaryBar */, {
            id: MovePanelToSidePanelAction.ID,
            title: localize2('movePanelToSecondarySideBar', 'Move Panel Views To KvantKode Side Bar'),
            category: Categories.View,
            f1: false,
        });
    }
}
export class MovePanelToSecondarySideBarAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.movePanelToSecondarySideBar'; }
    constructor() {
        super(1 /* ViewContainerLocation.Panel */, 2 /* ViewContainerLocation.AuxiliaryBar */, {
            id: MovePanelToSecondarySideBarAction.ID,
            title: localize2('movePanelToSecondarySideBar', 'Move Panel Views To KvantKode Side Bar'),
            category: Categories.View,
            f1: true,
        });
    }
}
registerAction2(MovePanelToSidePanelAction);
registerAction2(MovePanelToSecondarySideBarAction);
// --- Move KvantKode Side Bar Views To Panel
class MoveSidePanelToPanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.moveSidePanelToPanel'; }
    constructor() {
        super(2 /* ViewContainerLocation.AuxiliaryBar */, 1 /* ViewContainerLocation.Panel */, {
            id: MoveSidePanelToPanelAction.ID,
            title: localize2('moveSidePanelToPanel', 'Move KvantKode Side Bar Views To Panel'),
            category: Categories.View,
            f1: false,
        });
    }
}
export class MoveSecondarySideBarToPanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.moveSecondarySideBarToPanel'; }
    constructor() {
        super(2 /* ViewContainerLocation.AuxiliaryBar */, 1 /* ViewContainerLocation.Panel */, {
            id: MoveSecondarySideBarToPanelAction.ID,
            title: localize2('moveSidePanelToPanel', 'Move KvantKode Side Bar Views To Panel'),
            category: Categories.View,
            f1: true,
        });
    }
}
registerAction2(MoveSidePanelToPanelAction);
registerAction2(MoveSecondarySideBarToPanelAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9wYW5lbC9wYW5lbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFDTixNQUFNLEVBQ04sWUFBWSxFQUNaLGVBQWUsRUFDZixPQUFPLEdBRVAsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUNOLFlBQVksRUFDWix1QkFBdUIsRUFJdkIsZ0JBQWdCLEdBQ2hCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIsb0JBQW9CLEVBQ3BCLG1CQUFtQixHQUNuQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWhGLE9BQU8sRUFBeUIsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDcEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFHL0YsT0FBTyxFQUFFLHlCQUF5QixF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