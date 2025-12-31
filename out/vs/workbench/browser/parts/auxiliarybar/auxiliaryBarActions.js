/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { AuxiliaryBarVisibleContext } from '../../../common/contextkeys.js';
import { ViewContainerLocationToString } from '../../../common/views.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
import { closeIcon } from '../panel/panelActions.js';
const auxiliaryBarRightIcon = registerIcon('auxiliarybar-right-layout-icon', Codicon.layoutSidebarRight, localize('toggleAuxiliaryIconRight', 'Icon to toggle the auxiliary bar off in its right position.'));
const auxiliaryBarRightOffIcon = registerIcon('auxiliarybar-right-off-layout-icon', Codicon.layoutSidebarRightOff, localize('toggleAuxiliaryIconRightOn', 'Icon to toggle the auxiliary bar on in its right position.'));
const auxiliaryBarLeftIcon = registerIcon('auxiliarybar-left-layout-icon', Codicon.layoutSidebarLeft, localize('toggleAuxiliaryIconLeft', 'Icon to toggle the auxiliary bar in its left position.'));
const auxiliaryBarLeftOffIcon = registerIcon('auxiliarybar-left-off-layout-icon', Codicon.layoutSidebarLeftOff, localize('toggleAuxiliaryIconLeftOn', 'Icon to toggle the auxiliary bar on in its left position.'));
export class ToggleAuxiliaryBarAction extends Action2 {
    static { this.ID = 'workbench.action.toggleAuxiliaryBar'; }
    static { this.LABEL = localize2('toggleAuxiliaryBar', 'Toggle KvantKode Side Bar Visibility'); }
    constructor() {
        super({
            id: ToggleAuxiliaryBarAction.ID,
            title: ToggleAuxiliaryBarAction.LABEL,
            toggled: {
                condition: AuxiliaryBarVisibleContext,
                title: localize('closeSecondarySideBar', 'Hide KvantKode Side Bar'),
                icon: closeIcon,
                mnemonicTitle: localize({ key: 'secondary sidebar mnemonic', comment: ['&& denotes a mnemonic'] }, 'Secondary Si&&de Bar'),
            },
            icon: closeIcon, // Ensures no flickering when using toggled.icon
            category: Categories.View,
            metadata: {
                description: localize('openAndCloseAuxiliaryBar', 'Open/Show and Close/Hide KvantKode Side Bar'),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 32 /* KeyCode.KeyB */,
            },
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 1,
                },
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 2,
                },
                {
                    id: MenuId.AuxiliaryBarTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "default" /* ActivityBarPosition.DEFAULT */),
                },
            ],
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */), "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
    }
}
registerAction2(ToggleAuxiliaryBarAction);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeAuxiliaryBar',
            title: localize2('closeSecondarySideBar', 'Hide KvantKode Side Bar'),
            category: Categories.View,
            precondition: AuxiliaryBarVisibleContext,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
    }
});
registerAction2(class FocusAuxiliaryBarAction extends Action2 {
    static { this.ID = 'workbench.action.focusAuxiliaryBar'; }
    static { this.LABEL = localize2('focusAuxiliaryBar', 'Focus into KvantKode Side Bar'); }
    constructor() {
        super({
            id: FocusAuxiliaryBarAction.ID,
            title: FocusAuxiliaryBarAction.LABEL,
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        // Show auxiliary bar
        if (!layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        }
        // Focus into active composite
        const composite = paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
        composite?.focus();
    }
});
MenuRegistry.appendMenuItems([
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize('toggleSecondarySideBar', 'Toggle KvantKode Side Bar'),
                toggled: { condition: AuxiliaryBarVisibleContext, icon: auxiliaryBarLeftIcon },
                icon: auxiliaryBarLeftOffIcon,
            },
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'right')),
            order: 0,
        },
    },
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize('toggleSecondarySideBar', 'Toggle KvantKode Side Bar'),
                toggled: { condition: AuxiliaryBarVisibleContext, icon: auxiliaryBarRightIcon },
                icon: auxiliaryBarRightOffIcon,
            },
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'left')),
            order: 2,
        },
    },
    {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize2('hideAuxiliaryBar', 'Hide KvantKode Side Bar'),
            },
            when: ContextKeyExpr.and(AuxiliaryBarVisibleContext, ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
            order: 2,
        },
    },
]);
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousAuxiliaryBarView',
            title: localize2('previousAuxiliaryBarView', 'Previous KvantKode Side Bar View'),
            category: Categories.View,
            f1: true,
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextAuxiliaryBarView',
            title: localize2('nextAuxiliaryBarView', 'Next KvantKode Side Bar View'),
            category: Categories.View,
            f1: true,
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, 1);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5QmFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2F1eGlsaWFyeWJhci9hdXhpbGlhcnlCYXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFDTixPQUFPLEVBQ1AsTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRSxPQUFPLEVBQXlCLDZCQUE2QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDL0YsT0FBTyxFQUVOLHVCQUF1QixHQUd2QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBSXBHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVwRCxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FDekMsZ0NBQWdDLEVBQ2hDLE9BQU8sQ0FBQyxrQkFBa0IsRUFDMUIsUUFBUSxDQUNQLDBCQUEwQixFQUMxQiw2REFBNkQsQ0FDN0QsQ0FDRCxD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