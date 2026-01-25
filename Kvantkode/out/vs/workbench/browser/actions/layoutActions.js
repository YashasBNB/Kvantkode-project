/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, Action2, } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IWorkbenchLayoutService, positionToString, } from '../../services/layout/browser/layoutService.js';
import { IInstantiationService, } from '../../../platform/instantiation/common/instantiation.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { isWindows, isLinux, isWeb, isMacintosh, isNative } from '../../../base/common/platform.js';
import { IsMacNativeContext } from '../../../platform/contextkey/common/contextkeys.js';
import { KeybindingsRegistry, } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService, ViewContainerLocationToString, } from '../../common/views.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { IQuickInputService, } from '../../../platform/quickinput/common/quickInput.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { ToggleAuxiliaryBarAction } from '../parts/auxiliarybar/auxiliaryBarActions.js';
import { TogglePanelAction } from '../parts/panel/panelActions.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { AuxiliaryBarVisibleContext, PanelAlignmentContext, PanelVisibleContext, SideBarVisibleContext, FocusedViewContext, InEditorZenModeContext, IsMainEditorCenteredLayoutContext, MainEditorAreaVisibleContext, IsMainWindowFullscreenContext, PanelPositionContext, IsAuxiliaryWindowFocusedContext, TitleBarStyleContext, } from '../../common/contextkeys.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { registerIcon } from '../../../platform/theme/common/iconRegistry.js';
import { mainWindow } from '../../../base/browser/window.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IPreferencesService } from '../../services/preferences/common/preferences.js';
import { QuickInputAlignmentContextKey } from '../../../platform/quickinput/browser/quickInput.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
// Register Icons
const menubarIcon = registerIcon('menuBar', Codicon.layoutMenubar, localize('menuBarIcon', 'Represents the menu bar'));
const activityBarLeftIcon = registerIcon('activity-bar-left', Codicon.layoutActivitybarLeft, localize('activityBarLeft', 'Represents the activity bar in the left position'));
const activityBarRightIcon = registerIcon('activity-bar-right', Codicon.layoutActivitybarRight, localize('activityBarRight', 'Represents the activity bar in the right position'));
const panelLeftIcon = registerIcon('panel-left', Codicon.layoutSidebarLeft, localize('panelLeft', 'Represents a side bar in the left position'));
const panelLeftOffIcon = registerIcon('panel-left-off', Codicon.layoutSidebarLeftOff, localize('panelLeftOff', 'Represents a side bar in the left position toggled off'));
const panelRightIcon = registerIcon('panel-right', Codicon.layoutSidebarRight, localize('panelRight', 'Represents side bar in the right position'));
const panelRightOffIcon = registerIcon('panel-right-off', Codicon.layoutSidebarRightOff, localize('panelRightOff', 'Represents side bar in the right position toggled off'));
const panelIcon = registerIcon('panel-bottom', Codicon.layoutPanel, localize('panelBottom', 'Represents the bottom panel'));
const statusBarIcon = registerIcon('statusBar', Codicon.layoutStatusbar, localize('statusBarIcon', 'Represents the status bar'));
const panelAlignmentLeftIcon = registerIcon('panel-align-left', Codicon.layoutPanelLeft, localize('panelBottomLeft', 'Represents the bottom panel alignment set to the left'));
const panelAlignmentRightIcon = registerIcon('panel-align-right', Codicon.layoutPanelRight, localize('panelBottomRight', 'Represents the bottom panel alignment set to the right'));
const panelAlignmentCenterIcon = registerIcon('panel-align-center', Codicon.layoutPanelCenter, localize('panelBottomCenter', 'Represents the bottom panel alignment set to the center'));
const panelAlignmentJustifyIcon = registerIcon('panel-align-justify', Codicon.layoutPanelJustify, localize('panelBottomJustify', 'Represents the bottom panel alignment set to justified'));
const quickInputAlignmentTopIcon = registerIcon('quickInputAlignmentTop', Codicon.arrowUp, localize('quickInputAlignmentTop', 'Represents quick input alignment set to the top'));
const quickInputAlignmentCenterIcon = registerIcon('quickInputAlignmentCenter', Codicon.circle, localize('quickInputAlignmentCenter', 'Represents quick input alignment set to the center'));
const fullscreenIcon = registerIcon('fullscreen', Codicon.screenFull, localize('fullScreenIcon', 'Represents full screen'));
const centerLayoutIcon = registerIcon('centerLayoutIcon', Codicon.layoutCentered, localize('centerLayoutIcon', 'Represents centered layout mode'));
const zenModeIcon = registerIcon('zenMode', Codicon.target, localize('zenModeIcon', 'Represents zen mode'));
export const ToggleActivityBarVisibilityActionId = 'workbench.action.toggleActivityBarVisibility';
// --- Toggle Centered Layout
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleCenteredLayout',
            title: {
                ...localize2('toggleCenteredLayout', 'Toggle Centered Layout'),
                mnemonicTitle: localize({ key: 'miToggleCenteredLayout', comment: ['&& denotes a mnemonic'] }, '&&Centered Layout'),
            },
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
            category: Categories.View,
            f1: true,
            toggled: IsMainEditorCenteredLayoutContext,
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '1_toggle_view',
                    order: 3,
                },
            ],
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        layoutService.centerMainEditorLayout(!layoutService.isMainEditorLayoutCentered());
        editorGroupService.activeGroup.focus();
    }
});
// --- Set Sidebar Position
const sidebarPositionConfigurationKey = 'workbench.sideBar.location';
class MoveSidebarPositionAction extends Action2 {
    constructor(id, title, position) {
        super({
            id,
            title,
            f1: false,
        });
        this.position = position;
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const configurationService = accessor.get(IConfigurationService);
        const position = layoutService.getSideBarPosition();
        if (position !== this.position) {
            return configurationService.updateValue(sidebarPositionConfigurationKey, positionToString(this.position));
        }
    }
}
class MoveSidebarRightAction extends MoveSidebarPositionAction {
    static { this.ID = 'workbench.action.moveSideBarRight'; }
    constructor() {
        super(MoveSidebarRightAction.ID, localize2('moveSidebarRight', 'Move Primary Side Bar Right'), 1 /* Position.RIGHT */);
    }
}
class MoveSidebarLeftAction extends MoveSidebarPositionAction {
    static { this.ID = 'workbench.action.moveSideBarLeft'; }
    constructor() {
        super(MoveSidebarLeftAction.ID, localize2('moveSidebarLeft', 'Move Primary Side Bar Left'), 0 /* Position.LEFT */);
    }
}
registerAction2(MoveSidebarRightAction);
registerAction2(MoveSidebarLeftAction);
// --- Toggle Sidebar Position
export class ToggleSidebarPositionAction extends Action2 {
    static { this.ID = 'workbench.action.toggleSidebarPosition'; }
    static { this.LABEL = localize('toggleSidebarPosition', 'Toggle Primary Side Bar Position'); }
    static getLabel(layoutService) {
        return layoutService.getSideBarPosition() === 0 /* Position.LEFT */
            ? localize('moveSidebarRight', 'Move Primary Side Bar Right')
            : localize('moveSidebarLeft', 'Move Primary Side Bar Left');
    }
    constructor() {
        super({
            id: ToggleSidebarPositionAction.ID,
            title: localize2('toggleSidebarPosition', 'Toggle Primary Side Bar Position'),
            category: Categories.View,
            f1: true,
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const configurationService = accessor.get(IConfigurationService);
        const position = layoutService.getSideBarPosition();
        const newPositionValue = position === 0 /* Position.LEFT */ ? 'right' : 'left';
        return configurationService.updateValue(sidebarPositionConfigurationKey, newPositionValue);
    }
}
registerAction2(ToggleSidebarPositionAction);
const configureLayoutIcon = registerIcon('configure-layout-icon', Codicon.layout, localize('cofigureLayoutIcon', 'Icon represents workbench layout configuration.'));
MenuRegistry.appendMenuItem(MenuId.LayoutControlMenu, {
    submenu: MenuId.LayoutControlMenuSubmenu,
    title: localize('configureLayout', 'Configure Layout'),
    icon: configureLayoutIcon,
    group: '1_workbench_layout',
    when: ContextKeyExpr.equals('config.workbench.layoutControl.type', 'menu'),
});
MenuRegistry.appendMenuItems([
    {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarPositionAction.ID,
                title: localize('move side bar right', 'Move Primary Side Bar Right'),
            },
            when: ContextKeyExpr.and(ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */))),
            order: 1,
        },
    },
    {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarPositionAction.ID,
                title: localize('move sidebar left', 'Move Primary Side Bar Left'),
            },
            when: ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */))),
            order: 1,
        },
    },
    {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarPositionAction.ID,
                title: localize('move second sidebar left', 'Move KvantKode Side Bar Left'),
            },
            when: ContextKeyExpr.and(ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
            order: 1,
        },
    },
    {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarPositionAction.ID,
                title: localize('move second sidebar right', 'Move KvantKode Side Bar Right'),
            },
            when: ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
            order: 1,
        },
    },
]);
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    group: '3_workbench_layout_move',
    command: {
        id: ToggleSidebarPositionAction.ID,
        title: localize({ key: 'miMoveSidebarRight', comment: ['&& denotes a mnemonic'] }, '&&Move Primary Side Bar Right'),
    },
    when: ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'),
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    group: '3_workbench_layout_move',
    command: {
        id: ToggleSidebarPositionAction.ID,
        title: localize({ key: 'miMoveSidebarLeft', comment: ['&& denotes a mnemonic'] }, '&&Move Primary Side Bar Left'),
    },
    when: ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'),
    order: 2,
});
// --- Toggle Editor Visibility
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleEditorVisibility',
            title: {
                ...localize2('toggleEditor', 'Toggle Editor Area Visibility'),
                mnemonicTitle: localize({ key: 'miShowEditorArea', comment: ['&& denotes a mnemonic'] }, 'Show &&Editor Area'),
            },
            category: Categories.View,
            f1: true,
            toggled: MainEditorAreaVisibleContext,
            // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
            precondition: ContextKeyExpr.and(IsAuxiliaryWindowFocusedContext.toNegated(), ContextKeyExpr.or(PanelAlignmentContext.isEqualTo('center'), PanelPositionContext.notEqualsTo('bottom'))),
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).toggleMaximizedPanel();
    }
});
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    group: '2_appearance',
    title: localize({ key: 'miAppearance', comment: ['&& denotes a mnemonic'] }, '&&Appearance'),
    submenu: MenuId.MenubarAppearanceMenu,
    order: 1,
});
// Toggle Sidebar Visibility
export class ToggleSidebarVisibilityAction extends Action2 {
    static { this.ID = 'workbench.action.toggleSidebarVisibility'; }
    static { this.LABEL = localize('compositePart.hideSideBarLabel', 'Hide Primary Side Bar'); }
    constructor() {
        super({
            id: ToggleSidebarVisibilityAction.ID,
            title: localize2('toggleSidebar', 'Toggle Primary Side Bar Visibility'),
            toggled: {
                condition: SideBarVisibleContext,
                title: localize('primary sidebar', 'Primary Side Bar'),
                mnemonicTitle: localize({ key: 'primary sidebar mnemonic', comment: ['&& denotes a mnemonic'] }, '&&Primary Side Bar'),
            },
            metadata: {
                description: localize('openAndCloseSidebar', 'Open/Show and Close/Hide Sidebar'),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */,
            },
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 0,
                },
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 1,
                },
            ],
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */), "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
    }
}
registerAction2(ToggleSidebarVisibilityAction);
MenuRegistry.appendMenuItems([
    {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarVisibilityAction.ID,
                title: localize('compositePart.hideSideBarLabel', 'Hide Primary Side Bar'),
            },
            when: ContextKeyExpr.and(SideBarVisibleContext, ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */))),
            order: 2,
        },
    },
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleSidebarVisibilityAction.ID,
                title: localize('toggleSideBar', 'Toggle Primary Side Bar'),
                icon: panelLeftOffIcon,
                toggled: { condition: SideBarVisibleContext, icon: panelLeftIcon },
            },
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'left')),
            order: 0,
        },
    },
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleSidebarVisibilityAction.ID,
                title: localize('toggleSideBar', 'Toggle Primary Side Bar'),
                icon: panelRightOffIcon,
                toggled: { condition: SideBarVisibleContext, icon: panelRightIcon },
            },
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'right')),
            order: 2,
        },
    },
]);
// --- Toggle Statusbar Visibility
export class ToggleStatusbarVisibilityAction extends Action2 {
    static { this.ID = 'workbench.action.toggleStatusbarVisibility'; }
    static { this.statusbarVisibleKey = 'workbench.statusBar.visible'; }
    constructor() {
        super({
            id: ToggleStatusbarVisibilityAction.ID,
            title: {
                ...localize2('toggleStatusbar', 'Toggle Status Bar Visibility'),
                mnemonicTitle: localize({ key: 'miStatusbar', comment: ['&& denotes a mnemonic'] }, 'S&&tatus Bar'),
            },
            category: Categories.View,
            f1: true,
            toggled: ContextKeyExpr.equals('config.workbench.statusBar.visible', true),
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 3,
                },
            ],
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const configurationService = accessor.get(IConfigurationService);
        const visibility = layoutService.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, mainWindow);
        const newVisibilityValue = !visibility;
        return configurationService.updateValue(ToggleStatusbarVisibilityAction.statusbarVisibleKey, newVisibilityValue);
    }
}
registerAction2(ToggleStatusbarVisibilityAction);
// ------------------- Editor Tabs Layout --------------------------------
class AbstractSetShowTabsAction extends Action2 {
    constructor(settingName, value, title, id, precondition, description) {
        super({
            id,
            title,
            category: Categories.View,
            precondition,
            metadata: description ? { description } : undefined,
            f1: true,
        });
        this.settingName = settingName;
        this.value = value;
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue(this.settingName, this.value);
    }
}
// --- Hide Editor Tabs
export class HideEditorTabsAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.hideEditorTabs'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "none" /* EditorTabsMode.NONE */).negate(), InEditorZenModeContext.negate());
        const title = localize2('hideEditorTabs', 'Hide Editor Tabs');
        super("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, "none" /* EditorTabsMode.NONE */, title, HideEditorTabsAction.ID, precondition, localize2('hideEditorTabsDescription', 'Hide Tab Bar'));
    }
}
export class ZenHideEditorTabsAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.zenHideEditorTabs'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */}`, "none" /* EditorTabsMode.NONE */).negate(), InEditorZenModeContext);
        const title = localize2('hideEditorTabsZenMode', 'Hide Editor Tabs in Zen Mode');
        super("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, "none" /* EditorTabsMode.NONE */, title, ZenHideEditorTabsAction.ID, precondition, localize2('hideEditorTabsZenModeDescription', 'Hide Tab Bar in Zen Mode'));
    }
}
// --- Show Multiple Editor Tabs
export class ShowMultipleEditorTabsAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.showMultipleEditorTabs'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "multiple" /* EditorTabsMode.MULTIPLE */).negate(), InEditorZenModeContext.negate());
        const title = localize2('showMultipleEditorTabs', 'Show Multiple Editor Tabs');
        super("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, "multiple" /* EditorTabsMode.MULTIPLE */, title, ShowMultipleEditorTabsAction.ID, precondition, localize2('showMultipleEditorTabsDescription', 'Show Tab Bar with multiple tabs'));
    }
}
export class ZenShowMultipleEditorTabsAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.zenShowMultipleEditorTabs'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */}`, "multiple" /* EditorTabsMode.MULTIPLE */).negate(), InEditorZenModeContext);
        const title = localize2('showMultipleEditorTabsZenMode', 'Show Multiple Editor Tabs in Zen Mode');
        super("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, "multiple" /* EditorTabsMode.MULTIPLE */, title, ZenShowMultipleEditorTabsAction.ID, precondition, localize2('showMultipleEditorTabsZenModeDescription', 'Show Tab Bar in Zen Mode'));
    }
}
// --- Show Single Editor Tab
export class ShowSingleEditorTabAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.showEditorTab'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "single" /* EditorTabsMode.SINGLE */).negate(), InEditorZenModeContext.negate());
        const title = localize2('showSingleEditorTab', 'Show Single Editor Tab');
        super("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, "single" /* EditorTabsMode.SINGLE */, title, ShowSingleEditorTabAction.ID, precondition, localize2('showSingleEditorTabDescription', 'Show Tab Bar with one Tab'));
    }
}
export class ZenShowSingleEditorTabAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.zenShowEditorTab'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */}`, "single" /* EditorTabsMode.SINGLE */).negate(), InEditorZenModeContext);
        const title = localize2('showSingleEditorTabZenMode', 'Show Single Editor Tab in Zen Mode');
        super("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, "single" /* EditorTabsMode.SINGLE */, title, ZenShowSingleEditorTabAction.ID, precondition, localize2('showSingleEditorTabZenModeDescription', 'Show Tab Bar in Zen Mode with one Tab'));
    }
}
registerAction2(HideEditorTabsAction);
registerAction2(ZenHideEditorTabsAction);
registerAction2(ShowMultipleEditorTabsAction);
registerAction2(ZenShowMultipleEditorTabsAction);
registerAction2(ShowSingleEditorTabAction);
registerAction2(ZenShowSingleEditorTabAction);
// --- Tab Bar Submenu in View Appearance Menu
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.EditorTabsBarShowTabsSubmenu,
    title: localize('tabBar', 'Tab Bar'),
    group: '3_workbench_layout_move',
    order: 10,
    when: InEditorZenModeContext.negate(),
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.EditorTabsBarShowTabsZenModeSubmenu,
    title: localize('tabBar', 'Tab Bar'),
    group: '3_workbench_layout_move',
    order: 10,
    when: InEditorZenModeContext,
});
// --- Show Editor Actions in Title Bar
export class EditorActionsTitleBarAction extends Action2 {
    static { this.ID = 'workbench.action.editorActionsTitleBar'; }
    constructor() {
        super({
            id: EditorActionsTitleBarAction.ID,
            title: localize2('moveEditorActionsToTitleBar', 'Move Editor Actions to Title Bar'),
            category: Categories.View,
            precondition: ContextKeyExpr.equals(`config.${"workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */}`, "titleBar" /* EditorActionsLocation.TITLEBAR */).negate(),
            metadata: {
                description: localize2('moveEditorActionsToTitleBarDescription', 'Move Editor Actions from the tab bar to the title bar'),
            },
            f1: true,
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */, "titleBar" /* EditorActionsLocation.TITLEBAR */);
    }
}
registerAction2(EditorActionsTitleBarAction);
// --- Editor Actions Default Position
export class EditorActionsDefaultAction extends Action2 {
    static { this.ID = 'workbench.action.editorActionsDefault'; }
    constructor() {
        super({
            id: EditorActionsDefaultAction.ID,
            title: localize2('moveEditorActionsToTabBar', 'Move Editor Actions to Tab Bar'),
            category: Categories.View,
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */}`, "default" /* EditorActionsLocation.DEFAULT */).negate(), ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "none" /* EditorTabsMode.NONE */).negate()),
            metadata: {
                description: localize2('moveEditorActionsToTabBarDescription', 'Move Editor Actions from the title bar to the tab bar'),
            },
            f1: true,
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */, "default" /* EditorActionsLocation.DEFAULT */);
    }
}
registerAction2(EditorActionsDefaultAction);
// --- Hide Editor Actions
export class HideEditorActionsAction extends Action2 {
    static { this.ID = 'workbench.action.hideEditorActions'; }
    constructor() {
        super({
            id: HideEditorActionsAction.ID,
            title: localize2('hideEditorActons', 'Hide Editor Actions'),
            category: Categories.View,
            precondition: ContextKeyExpr.equals(`config.${"workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */}`, "hidden" /* EditorActionsLocation.HIDDEN */).negate(),
            metadata: {
                description: localize2('hideEditorActonsDescription', 'Hide Editor Actions in the tab and title bar'),
            },
            f1: true,
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */, "hidden" /* EditorActionsLocation.HIDDEN */);
    }
}
registerAction2(HideEditorActionsAction);
// --- Hide Editor Actions
export class ShowEditorActionsAction extends Action2 {
    static { this.ID = 'workbench.action.showEditorActions'; }
    constructor() {
        super({
            id: ShowEditorActionsAction.ID,
            title: localize2('showEditorActons', 'Show Editor Actions'),
            category: Categories.View,
            precondition: ContextKeyExpr.equals(`config.${"workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */}`, "hidden" /* EditorActionsLocation.HIDDEN */),
            metadata: {
                description: localize2('showEditorActonsDescription', 'Make Editor Actions visible.'),
            },
            f1: true,
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */, "default" /* EditorActionsLocation.DEFAULT */);
    }
}
registerAction2(ShowEditorActionsAction);
// --- Editor Actions Position Submenu in View Appearance Menu
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.EditorActionsPositionSubmenu,
    title: localize('editorActionsPosition', 'Editor Actions Position'),
    group: '3_workbench_layout_move',
    order: 11,
});
// --- Configure Tabs Layout
export class ConfigureEditorTabsAction extends Action2 {
    static { this.ID = 'workbench.action.configureEditorTabs'; }
    constructor() {
        super({
            id: ConfigureEditorTabsAction.ID,
            title: localize2('configureTabs', 'Configure Tabs'),
            category: Categories.View,
        });
    }
    run(accessor) {
        const preferencesService = accessor.get(IPreferencesService);
        preferencesService.openSettings({ jsonEditor: false, query: 'workbench.editor tab' });
    }
}
registerAction2(ConfigureEditorTabsAction);
// --- Configure Editor
export class ConfigureEditorAction extends Action2 {
    static { this.ID = 'workbench.action.configureEditor'; }
    constructor() {
        super({
            id: ConfigureEditorAction.ID,
            title: localize2('configureEditors', 'Configure Editors'),
            category: Categories.View,
        });
    }
    run(accessor) {
        const preferencesService = accessor.get(IPreferencesService);
        preferencesService.openSettings({ jsonEditor: false, query: 'workbench.editor' });
    }
}
registerAction2(ConfigureEditorAction);
// --- Toggle Pinned Tabs On Separate Row
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleSeparatePinnedEditorTabs',
            title: localize2('toggleSeparatePinnedEditorTabs', 'Separate Pinned Editor Tabs'),
            category: Categories.View,
            precondition: ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "multiple" /* EditorTabsMode.MULTIPLE */),
            metadata: {
                description: localize2('toggleSeparatePinnedEditorTabsDescription', 'Toggle whether pinned editor tabs are shown on a separate row above unpinned tabs.'),
            },
            f1: true,
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const oldettingValue = configurationService.getValue('workbench.editor.pinnedTabsOnSeparateRow');
        const newSettingValue = !oldettingValue;
        return configurationService.updateValue('workbench.editor.pinnedTabsOnSeparateRow', newSettingValue);
    }
});
// --- Toggle Zen Mode
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleZenMode',
            title: {
                ...localize2('toggleZenMode', 'Toggle Zen Mode'),
                mnemonicTitle: localize({ key: 'miToggleZenMode', comment: ['&& denotes a mnemonic'] }, 'Zen Mode'),
            },
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 56 /* KeyCode.KeyZ */),
            },
            toggled: InEditorZenModeContext,
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '1_toggle_view',
                    order: 2,
                },
            ],
        });
    }
    run(accessor) {
        return accessor.get(IWorkbenchLayoutService).toggleZenMode();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.exitZenMode',
    weight: 100 /* KeybindingWeight.EditorContrib */ - 1000,
    handler(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const contextKeyService = accessor.get(IContextKeyService);
        if (InEditorZenModeContext.getValue(contextKeyService)) {
            layoutService.toggleZenMode();
        }
    },
    when: InEditorZenModeContext,
    primary: KeyChord(9 /* KeyCode.Escape */, 9 /* KeyCode.Escape */),
});
// --- Toggle Menu Bar
if (isWindows || isLinux || isWeb) {
    registerAction2(class ToggleMenubarAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.toggleMenuBar',
                title: {
                    ...localize2('toggleMenuBar', 'Toggle Menu Bar'),
                    mnemonicTitle: localize({ key: 'miMenuBar', comment: ['&& denotes a mnemonic'] }, 'Menu &&Bar'),
                },
                category: Categories.View,
                f1: true,
                toggled: ContextKeyExpr.and(IsMacNativeContext.toNegated(), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'hidden'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'toggle'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'compact')),
                menu: [
                    {
                        id: MenuId.MenubarAppearanceMenu,
                        group: '2_workbench_layout',
                        order: 0,
                    },
                ],
            });
        }
        run(accessor) {
            return accessor.get(IWorkbenchLayoutService).toggleMenuBar();
        }
    });
    // Add separately to title bar context menu so we can use a different title
    for (const menuId of [MenuId.TitleBarContext, MenuId.TitleBarTitleContext]) {
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: 'workbench.action.toggleMenuBar',
                title: localize('miMenuBarNoMnemonic', 'Menu Bar'),
                toggled: ContextKeyExpr.and(IsMacNativeContext.toNegated(), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'hidden'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'toggle'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'compact')),
            },
            when: ContextKeyExpr.and(IsAuxiliaryWindowFocusedContext.toNegated(), ContextKeyExpr.notEquals(TitleBarStyleContext.key, "native" /* TitlebarStyle.NATIVE */), IsMainWindowFullscreenContext.negate()),
            group: '2_config',
            order: 0,
        });
    }
}
// --- Reset View Locations
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.resetViewLocations',
            title: localize2('resetViewLocations', 'Reset View Locations'),
            category: Categories.View,
            f1: true,
        });
    }
    run(accessor) {
        return accessor.get(IViewDescriptorService).reset();
    }
});
// --- Move View
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.moveView',
            title: localize2('moveView', 'Move View'),
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const instantiationService = accessor.get(IInstantiationService);
        const quickInputService = accessor.get(IQuickInputService);
        const contextKeyService = accessor.get(IContextKeyService);
        const paneCompositePartService = accessor.get(IPaneCompositePartService);
        const focusedViewId = FocusedViewContext.getValue(contextKeyService);
        let viewId;
        if (focusedViewId &&
            viewDescriptorService.getViewDescriptorById(focusedViewId)?.canMoveView) {
            viewId = focusedViewId;
        }
        try {
            viewId = await this.getView(quickInputService, viewDescriptorService, paneCompositePartService, viewId);
            if (!viewId) {
                return;
            }
            const moveFocusedViewAction = new MoveFocusedViewAction();
            instantiationService.invokeFunction((accessor) => moveFocusedViewAction.run(accessor, viewId));
        }
        catch { }
    }
    getViewItems(viewDescriptorService, paneCompositePartService) {
        const results = [];
        const viewlets = paneCompositePartService.getVisiblePaneCompositeIds(0 /* ViewContainerLocation.Sidebar */);
        viewlets.forEach((viewletId) => {
            const container = viewDescriptorService.getViewContainerById(viewletId);
            const containerModel = viewDescriptorService.getViewContainerModel(container);
            let hasAddedView = false;
            containerModel.visibleViewDescriptors.forEach((viewDescriptor) => {
                if (viewDescriptor.canMoveView) {
                    if (!hasAddedView) {
                        results.push({
                            type: 'separator',
                            label: localize('sidebarContainer', 'Side Bar / {0}', containerModel.title),
                        });
                        hasAddedView = true;
                    }
                    results.push({
                        id: viewDescriptor.id,
                        label: viewDescriptor.name.value,
                    });
                }
            });
        });
        const panels = paneCompositePartService.getPinnedPaneCompositeIds(1 /* ViewContainerLocation.Panel */);
        panels.forEach((panel) => {
            const container = viewDescriptorService.getViewContainerById(panel);
            const containerModel = viewDescriptorService.getViewContainerModel(container);
            let hasAddedView = false;
            containerModel.visibleViewDescriptors.forEach((viewDescriptor) => {
                if (viewDescriptor.canMoveView) {
                    if (!hasAddedView) {
                        results.push({
                            type: 'separator',
                            label: localize('panelContainer', 'Panel / {0}', containerModel.title),
                        });
                        hasAddedView = true;
                    }
                    results.push({
                        id: viewDescriptor.id,
                        label: viewDescriptor.name.value,
                    });
                }
            });
        });
        const sidePanels = paneCompositePartService.getPinnedPaneCompositeIds(2 /* ViewContainerLocation.AuxiliaryBar */);
        sidePanels.forEach((panel) => {
            const container = viewDescriptorService.getViewContainerById(panel);
            const containerModel = viewDescriptorService.getViewContainerModel(container);
            let hasAddedView = false;
            containerModel.visibleViewDescriptors.forEach((viewDescriptor) => {
                if (viewDescriptor.canMoveView) {
                    if (!hasAddedView) {
                        results.push({
                            type: 'separator',
                            label: localize('secondarySideBarContainer', 'KvantKode Side Bar / {0}', containerModel.title),
                        });
                        hasAddedView = true;
                    }
                    results.push({
                        id: viewDescriptor.id,
                        label: viewDescriptor.name.value,
                    });
                }
            });
        });
        return results;
    }
    async getView(quickInputService, viewDescriptorService, paneCompositePartService, viewId) {
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.placeholder = localize('moveFocusedView.selectView', 'Select a View to Move');
        quickPick.items = this.getViewItems(viewDescriptorService, paneCompositePartService);
        quickPick.selectedItems = quickPick.items.filter((item) => item.id === viewId);
        return new Promise((resolve, reject) => {
            disposables.add(quickPick.onDidAccept(() => {
                const viewId = quickPick.selectedItems[0];
                if (viewId.id) {
                    resolve(viewId.id);
                }
                else {
                    reject();
                }
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                reject();
            }));
            quickPick.show();
        });
    }
});
// --- Move Focused View
class MoveFocusedViewAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.moveFocusedView',
            title: localize2('moveFocusedView', 'Move Focused View'),
            category: Categories.View,
            precondition: FocusedViewContext.notEqualsTo(''),
            f1: true,
        });
    }
    run(accessor, viewId) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const viewsService = accessor.get(IViewsService);
        const quickInputService = accessor.get(IQuickInputService);
        const contextKeyService = accessor.get(IContextKeyService);
        const dialogService = accessor.get(IDialogService);
        const paneCompositePartService = accessor.get(IPaneCompositePartService);
        const focusedViewId = viewId || FocusedViewContext.getValue(contextKeyService);
        if (focusedViewId === undefined || focusedViewId.trim() === '') {
            dialogService.error(localize('moveFocusedView.error.noFocusedView', 'There is no view currently focused.'));
            return;
        }
        const viewDescriptor = viewDescriptorService.getViewDescriptorById(focusedViewId);
        if (!viewDescriptor || !viewDescriptor.canMoveView) {
            dialogService.error(localize('moveFocusedView.error.nonMovableView', 'The currently focused view is not movable.'));
            return;
        }
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.placeholder = localize('moveFocusedView.selectDestination', 'Select a Destination for the View');
        quickPick.title = localize({
            key: 'moveFocusedView.title',
            comment: ['{0} indicates the title of the view the user has selected to move.'],
        }, 'View: Move {0}', viewDescriptor.name.value);
        const items = [];
        const currentContainer = viewDescriptorService.getViewContainerByViewId(focusedViewId);
        const currentLocation = viewDescriptorService.getViewLocationById(focusedViewId);
        const isViewSolo = viewDescriptorService.getViewContainerModel(currentContainer).allViewDescriptors.length === 1;
        if (!(isViewSolo && currentLocation === 1 /* ViewContainerLocation.Panel */)) {
            items.push({
                id: '_.panel.newcontainer',
                label: localize({
                    key: 'moveFocusedView.newContainerInPanel',
                    comment: ['Creates a new top-level tab in the panel.'],
                }, 'New Panel Entry'),
            });
        }
        if (!(isViewSolo && currentLocation === 0 /* ViewContainerLocation.Sidebar */)) {
            items.push({
                id: '_.sidebar.newcontainer',
                label: localize('moveFocusedView.newContainerInSidebar', 'New Side Bar Entry'),
            });
        }
        if (!(isViewSolo && currentLocation === 2 /* ViewContainerLocation.AuxiliaryBar */)) {
            items.push({
                id: '_.auxiliarybar.newcontainer',
                label: localize('moveFocusedView.newContainerInSidePanel', 'New KvantKode Side Bar Entry'),
            });
        }
        items.push({
            type: 'separator',
            label: localize('sidebar', 'Side Bar'),
        });
        const pinnedViewlets = paneCompositePartService.getVisiblePaneCompositeIds(0 /* ViewContainerLocation.Sidebar */);
        items.push(...pinnedViewlets
            .filter((viewletId) => {
            if (viewletId === viewDescriptorService.getViewContainerByViewId(focusedViewId).id) {
                return false;
            }
            return !viewDescriptorService.getViewContainerById(viewletId).rejectAddedViews;
        })
            .map((viewletId) => {
            return {
                id: viewletId,
                label: viewDescriptorService.getViewContainerModel(viewDescriptorService.getViewContainerById(viewletId)).title,
            };
        }));
        items.push({
            type: 'separator',
            label: localize('panel', 'Panel'),
        });
        const pinnedPanels = paneCompositePartService.getPinnedPaneCompositeIds(1 /* ViewContainerLocation.Panel */);
        items.push(...pinnedPanels
            .filter((panel) => {
            if (panel === viewDescriptorService.getViewContainerByViewId(focusedViewId).id) {
                return false;
            }
            return !viewDescriptorService.getViewContainerById(panel).rejectAddedViews;
        })
            .map((panel) => {
            return {
                id: panel,
                label: viewDescriptorService.getViewContainerModel(viewDescriptorService.getViewContainerById(panel)).title,
            };
        }));
        items.push({
            type: 'separator',
            label: localize('secondarySideBar', 'KvantKode Side Bar'),
        });
        const pinnedAuxPanels = paneCompositePartService.getPinnedPaneCompositeIds(2 /* ViewContainerLocation.AuxiliaryBar */);
        items.push(...pinnedAuxPanels
            .filter((panel) => {
            if (panel === viewDescriptorService.getViewContainerByViewId(focusedViewId).id) {
                return false;
            }
            return !viewDescriptorService.getViewContainerById(panel).rejectAddedViews;
        })
            .map((panel) => {
            return {
                id: panel,
                label: viewDescriptorService.getViewContainerModel(viewDescriptorService.getViewContainerById(panel)).title,
            };
        }));
        quickPick.items = items;
        disposables.add(quickPick.onDidAccept(() => {
            const destination = quickPick.selectedItems[0];
            if (destination.id === '_.panel.newcontainer') {
                viewDescriptorService.moveViewToLocation(viewDescriptor, 1 /* ViewContainerLocation.Panel */, this.desc.id);
                viewsService.openView(focusedViewId, true);
            }
            else if (destination.id === '_.sidebar.newcontainer') {
                viewDescriptorService.moveViewToLocation(viewDescriptor, 0 /* ViewContainerLocation.Sidebar */, this.desc.id);
                viewsService.openView(focusedViewId, true);
            }
            else if (destination.id === '_.auxiliarybar.newcontainer') {
                viewDescriptorService.moveViewToLocation(viewDescriptor, 2 /* ViewContainerLocation.AuxiliaryBar */, this.desc.id);
                viewsService.openView(focusedViewId, true);
            }
            else if (destination.id) {
                viewDescriptorService.moveViewsToContainer([viewDescriptor], viewDescriptorService.getViewContainerById(destination.id), undefined, this.desc.id);
                viewsService.openView(focusedViewId, true);
            }
            quickPick.hide();
        }));
        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
        quickPick.show();
    }
}
registerAction2(MoveFocusedViewAction);
// --- Reset Focused View Location
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.resetFocusedViewLocation',
            title: localize2('resetFocusedViewLocation', 'Reset Focused View Location'),
            category: Categories.View,
            f1: true,
            precondition: FocusedViewContext.notEqualsTo(''),
        });
    }
    run(accessor) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const contextKeyService = accessor.get(IContextKeyService);
        const dialogService = accessor.get(IDialogService);
        const viewsService = accessor.get(IViewsService);
        const focusedViewId = FocusedViewContext.getValue(contextKeyService);
        let viewDescriptor = null;
        if (focusedViewId !== undefined && focusedViewId.trim() !== '') {
            viewDescriptor = viewDescriptorService.getViewDescriptorById(focusedViewId);
        }
        if (!viewDescriptor) {
            dialogService.error(localize('resetFocusedView.error.noFocusedView', 'There is no view currently focused.'));
            return;
        }
        const defaultContainer = viewDescriptorService.getDefaultContainerById(viewDescriptor.id);
        if (!defaultContainer ||
            defaultContainer === viewDescriptorService.getViewContainerByViewId(viewDescriptor.id)) {
            return;
        }
        viewDescriptorService.moveViewsToContainer([viewDescriptor], defaultContainer, undefined, this.desc.id);
        viewsService.openView(viewDescriptor.id, true);
    }
});
// --- Resize View
class BaseResizeViewAction extends Action2 {
    static { this.RESIZE_INCREMENT = 60; } // This is a css pixel size
    resizePart(widthChange, heightChange, layoutService, partToResize) {
        let part;
        if (partToResize === undefined) {
            const isEditorFocus = layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */);
            const isSidebarFocus = layoutService.hasFocus("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
            const isPanelFocus = layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
            const isAuxiliaryBarFocus = layoutService.hasFocus("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            if (isSidebarFocus) {
                part = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
            }
            else if (isPanelFocus) {
                part = "workbench.parts.panel" /* Parts.PANEL_PART */;
            }
            else if (isEditorFocus) {
                part = "workbench.parts.editor" /* Parts.EDITOR_PART */;
            }
            else if (isAuxiliaryBarFocus) {
                part = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
            }
        }
        else {
            part = partToResize;
        }
        if (part) {
            layoutService.resizePart(part, widthChange, heightChange);
        }
    }
}
class IncreaseViewSizeAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.increaseViewSize',
            title: localize2('increaseViewSize', 'Increase Current View Size'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
        });
    }
    run(accessor) {
        this.resizePart(BaseResizeViewAction.RESIZE_INCREMENT, BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService));
    }
}
class IncreaseViewWidthAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.increaseViewWidth',
            title: localize2('increaseEditorWidth', 'Increase Editor Width'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
        });
    }
    run(accessor) {
        this.resizePart(BaseResizeViewAction.RESIZE_INCREMENT, 0, accessor.get(IWorkbenchLayoutService), "workbench.parts.editor" /* Parts.EDITOR_PART */);
    }
}
class IncreaseViewHeightAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.increaseViewHeight',
            title: localize2('increaseEditorHeight', 'Increase Editor Height'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
        });
    }
    run(accessor) {
        this.resizePart(0, BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService), "workbench.parts.editor" /* Parts.EDITOR_PART */);
    }
}
class DecreaseViewSizeAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.decreaseViewSize',
            title: localize2('decreaseViewSize', 'Decrease Current View Size'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
        });
    }
    run(accessor) {
        this.resizePart(-BaseResizeViewAction.RESIZE_INCREMENT, -BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService));
    }
}
class DecreaseViewWidthAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.decreaseViewWidth',
            title: localize2('decreaseEditorWidth', 'Decrease Editor Width'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
        });
    }
    run(accessor) {
        this.resizePart(-BaseResizeViewAction.RESIZE_INCREMENT, 0, accessor.get(IWorkbenchLayoutService), "workbench.parts.editor" /* Parts.EDITOR_PART */);
    }
}
class DecreaseViewHeightAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.decreaseViewHeight',
            title: localize2('decreaseEditorHeight', 'Decrease Editor Height'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
        });
    }
    run(accessor) {
        this.resizePart(0, -BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService), "workbench.parts.editor" /* Parts.EDITOR_PART */);
    }
}
registerAction2(IncreaseViewSizeAction);
registerAction2(IncreaseViewWidthAction);
registerAction2(IncreaseViewHeightAction);
registerAction2(DecreaseViewSizeAction);
registerAction2(DecreaseViewWidthAction);
registerAction2(DecreaseViewHeightAction);
//#region Quick Input Alignment Actions
registerAction2(class AlignQuickInputTopAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.alignQuickInputTop',
            title: localize2('alignQuickInputTop', 'Align Quick Input Top'),
            f1: false,
        });
    }
    run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.setAlignment('top');
    }
});
registerAction2(class AlignQuickInputCenterAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.alignQuickInputCenter',
            title: localize2('alignQuickInputCenter', 'Align Quick Input Center'),
            f1: false,
        });
    }
    run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.setAlignment('center');
    }
});
function isContextualLayoutVisualIcon(icon) {
    return icon.iconA !== undefined;
}
const CreateToggleLayoutItem = (id, active, label, visualIcon) => {
    return {
        id,
        active,
        label,
        visualIcon,
        activeIcon: Codicon.eye,
        inactiveIcon: Codicon.eyeClosed,
        activeAriaLabel: localize('selectToHide', 'Select to Hide'),
        inactiveAriaLabel: localize('selectToShow', 'Select to Show'),
        useButtons: true,
    };
};
const CreateOptionLayoutItem = (id, active, label, visualIcon) => {
    return {
        id,
        active,
        label,
        visualIcon,
        activeIcon: Codicon.check,
        activeAriaLabel: localize('active', 'Active'),
        useButtons: false,
    };
};
const MenuBarToggledContext = ContextKeyExpr.and(IsMacNativeContext.toNegated(), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'hidden'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'toggle'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'compact'));
const ToggleVisibilityActions = [];
if (!isMacintosh || !isNative) {
    ToggleVisibilityActions.push(CreateToggleLayoutItem('workbench.action.toggleMenuBar', MenuBarToggledContext, localize('menuBar', 'Menu Bar'), menubarIcon));
}
ToggleVisibilityActions.push(...[
    CreateToggleLayoutItem(ToggleActivityBarVisibilityActionId, ContextKeyExpr.notEquals('config.workbench.activityBar.location', 'hidden'), localize('activityBar', 'Activity Bar'), {
        whenA: ContextKeyExpr.equals('config.workbench.sideBar.location', 'left'),
        iconA: activityBarLeftIcon,
        iconB: activityBarRightIcon,
    }),
    CreateToggleLayoutItem(ToggleSidebarVisibilityAction.ID, SideBarVisibleContext, localize('sideBar', 'Primary Side Bar'), {
        whenA: ContextKeyExpr.equals('config.workbench.sideBar.location', 'left'),
        iconA: panelLeftIcon,
        iconB: panelRightIcon,
    }),
    CreateToggleLayoutItem(ToggleAuxiliaryBarAction.ID, AuxiliaryBarVisibleContext, localize('secondarySideBar', 'KvantKode Side Bar'), {
        whenA: ContextKeyExpr.equals('config.workbench.sideBar.location', 'left'),
        iconA: panelRightIcon,
        iconB: panelLeftIcon,
    }),
    CreateToggleLayoutItem(TogglePanelAction.ID, PanelVisibleContext, localize('panel', 'Panel'), panelIcon),
    CreateToggleLayoutItem(ToggleStatusbarVisibilityAction.ID, ContextKeyExpr.equals('config.workbench.statusBar.visible', true), localize('statusBar', 'Status Bar'), statusBarIcon),
]);
const MoveSideBarActions = [
    CreateOptionLayoutItem(MoveSidebarLeftAction.ID, ContextKeyExpr.equals('config.workbench.sideBar.location', 'left'), localize('leftSideBar', 'Left'), panelLeftIcon),
    CreateOptionLayoutItem(MoveSidebarRightAction.ID, ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'), localize('rightSideBar', 'Right'), panelRightIcon),
];
const AlignPanelActions = [
    CreateOptionLayoutItem('workbench.action.alignPanelLeft', PanelAlignmentContext.isEqualTo('left'), localize('leftPanel', 'Left'), panelAlignmentLeftIcon),
    CreateOptionLayoutItem('workbench.action.alignPanelRight', PanelAlignmentContext.isEqualTo('right'), localize('rightPanel', 'Right'), panelAlignmentRightIcon),
    CreateOptionLayoutItem('workbench.action.alignPanelCenter', PanelAlignmentContext.isEqualTo('center'), localize('centerPanel', 'Center'), panelAlignmentCenterIcon),
    CreateOptionLayoutItem('workbench.action.alignPanelJustify', PanelAlignmentContext.isEqualTo('justify'), localize('justifyPanel', 'Justify'), panelAlignmentJustifyIcon),
];
const QuickInputActions = [
    CreateOptionLayoutItem('workbench.action.alignQuickInputTop', QuickInputAlignmentContextKey.isEqualTo('top'), localize('top', 'Top'), quickInputAlignmentTopIcon),
    CreateOptionLayoutItem('workbench.action.alignQuickInputCenter', QuickInputAlignmentContextKey.isEqualTo('center'), localize('center', 'Center'), quickInputAlignmentCenterIcon),
];
const MiscLayoutOptions = [
    CreateOptionLayoutItem('workbench.action.toggleFullScreen', IsMainWindowFullscreenContext, localize('fullscreen', 'Full Screen'), fullscreenIcon),
    CreateOptionLayoutItem('workbench.action.toggleZenMode', InEditorZenModeContext, localize('zenMode', 'Zen Mode'), zenModeIcon),
    CreateOptionLayoutItem('workbench.action.toggleCenteredLayout', IsMainEditorCenteredLayoutContext, localize('centeredLayout', 'Centered Layout'), centerLayoutIcon),
];
const LayoutContextKeySet = new Set();
for (const { active } of [
    ...ToggleVisibilityActions,
    ...MoveSideBarActions,
    ...AlignPanelActions,
    ...QuickInputActions,
    ...MiscLayoutOptions,
]) {
    for (const key of active.keys()) {
        LayoutContextKeySet.add(key);
    }
}
registerAction2(class CustomizeLayoutAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.customizeLayout',
            title: localize2('customizeLayout', 'Customize Layout...'),
            f1: true,
            icon: configureLayoutIcon,
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: 'z_end',
                },
                {
                    id: MenuId.LayoutControlMenu,
                    when: ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both'),
                    group: '1_layout',
                },
            ],
        });
    }
    getItems(contextKeyService, keybindingService) {
        const toQuickPickItem = (item) => {
            const toggled = item.active.evaluate(contextKeyService.getContext(null));
            let label = item.useButtons
                ? item.label
                : item.label +
                    (toggled && item.activeIcon
                        ? ` $(${item.activeIcon.id})`
                        : !toggled && item.inactiveIcon
                            ? ` $(${item.inactiveIcon.id})`
                            : '');
            const ariaLabel = item.label +
                (toggled && item.activeAriaLabel
                    ? ` (${item.activeAriaLabel})`
                    : !toggled && item.inactiveAriaLabel
                        ? ` (${item.inactiveAriaLabel})`
                        : '');
            if (item.visualIcon) {
                let icon = item.visualIcon;
                if (isContextualLayoutVisualIcon(icon)) {
                    const useIconA = icon.whenA.evaluate(contextKeyService.getContext(null));
                    icon = useIconA ? icon.iconA : icon.iconB;
                }
                label = `$(${icon.id}) ${label}`;
            }
            const icon = toggled ? item.activeIcon : item.inactiveIcon;
            return {
                type: 'item',
                id: item.id,
                label,
                ariaLabel,
                keybinding: keybindingService.lookupKeybinding(item.id, contextKeyService),
                buttons: !item.useButtons
                    ? undefined
                    : [
                        {
                            alwaysVisible: false,
                            tooltip: ariaLabel,
                            iconClass: icon ? ThemeIcon.asClassName(icon) : undefined,
                        },
                    ],
            };
        };
        return [
            {
                type: 'separator',
                label: localize('toggleVisibility', 'Visibility'),
            },
            ...ToggleVisibilityActions.map(toQuickPickItem),
            {
                type: 'separator',
                label: localize('sideBarPosition', 'Primary Side Bar Position'),
            },
            ...MoveSideBarActions.map(toQuickPickItem),
            {
                type: 'separator',
                label: localize('panelAlignment', 'Panel Alignment'),
            },
            ...AlignPanelActions.map(toQuickPickItem),
            {
                type: 'separator',
                label: localize('quickOpen', 'Quick Input Position'),
            },
            ...QuickInputActions.map(toQuickPickItem),
            {
                type: 'separator',
                label: localize('layoutModes', 'Modes'),
            },
            ...MiscLayoutOptions.map(toQuickPickItem),
        ];
    }
    run(accessor) {
        if (this._currentQuickPick) {
            this._currentQuickPick.hide();
            return;
        }
        const configurationService = accessor.get(IConfigurationService);
        const contextKeyService = accessor.get(IContextKeyService);
        const commandService = accessor.get(ICommandService);
        const quickInputService = accessor.get(IQuickInputService);
        const keybindingService = accessor.get(IKeybindingService);
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
        this._currentQuickPick = quickPick;
        quickPick.items = this.getItems(contextKeyService, keybindingService);
        quickPick.ignoreFocusOut = true;
        quickPick.hideInput = true;
        quickPick.title = localize('customizeLayoutQuickPickTitle', 'Customize Layout');
        const closeButton = {
            alwaysVisible: true,
            iconClass: ThemeIcon.asClassName(Codicon.close),
            tooltip: localize('close', 'Close'),
        };
        const resetButton = {
            alwaysVisible: true,
            iconClass: ThemeIcon.asClassName(Codicon.discard),
            tooltip: localize('restore defaults', 'Restore Defaults'),
        };
        quickPick.buttons = [resetButton, closeButton];
        let selectedItem = undefined;
        disposables.add(contextKeyService.onDidChangeContext((changeEvent) => {
            if (changeEvent.affectsSome(LayoutContextKeySet)) {
                quickPick.items = this.getItems(contextKeyService, keybindingService);
                if (selectedItem) {
                    quickPick.activeItems = quickPick.items.filter((item) => item.id === selectedItem?.id);
                }
                setTimeout(() => quickInputService.focus(), 0);
            }
        }));
        disposables.add(quickPick.onDidAccept((event) => {
            if (quickPick.selectedItems.length) {
                selectedItem = quickPick.selectedItems[0];
                commandService.executeCommand(selectedItem.id);
            }
        }));
        disposables.add(quickPick.onDidTriggerItemButton((event) => {
            if (event.item) {
                selectedItem = event.item;
                commandService.executeCommand(selectedItem.id);
            }
        }));
        disposables.add(quickPick.onDidTriggerButton((button) => {
            if (button === closeButton) {
                quickPick.hide();
            }
            else if (button === resetButton) {
                const resetSetting = (id) => {
                    const config = configurationService.inspect(id);
                    configurationService.updateValue(id, config.defaultValue);
                };
                // Reset all layout options
                resetSetting('workbench.activityBar.location');
                resetSetting('workbench.sideBar.location');
                resetSetting('workbench.statusBar.visible');
                resetSetting('workbench.panel.defaultLocation');
                if (!isMacintosh || !isNative) {
                    resetSetting('window.menuBarVisibility');
                }
                commandService.executeCommand('workbench.action.alignPanelCenter');
                commandService.executeCommand('workbench.action.alignQuickInputTop');
            }
        }));
        disposables.add(quickPick.onDidHide(() => {
            quickPick.dispose();
        }));
        disposables.add(quickPick.onDispose(() => {
            this._currentQuickPick = undefined;
            disposables.dispose();
        }));
        quickPick.show();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy9sYXlvdXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBb0IsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3ZFLE9BQU8sRUFDTixNQUFNLEVBQ04sWUFBWSxFQUNaLGVBQWUsRUFDZixPQUFPLEdBQ1AsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUdOLHVCQUF1QixFQUt2QixnQkFBZ0IsR0FDaEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTixzQkFBc0IsRUFHdEIsNkJBQTZCLEdBQzdCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FB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