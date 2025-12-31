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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvcGFuZWwvcGFuZWxBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEVBQ2YsT0FBTyxHQUVQLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixZQUFZLEVBQ1osdUJBQXVCLEVBSXZCLGdCQUFnQixHQUNoQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTixxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLG9CQUFvQixFQUNwQixtQkFBbUIsR0FDbkIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sY0FBYyxHQUVkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVoRixPQUFPLEVBQXlCLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRy9GLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FB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