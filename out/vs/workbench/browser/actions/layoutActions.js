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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvbGF5b3V0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW9CLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEVBQ2YsT0FBTyxHQUNQLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFHTix1QkFBdUIsRUFLdkIsZ0JBQWdCLEdBQ2hCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBbUIsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN2RixPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sc0JBQXNCLEVBR3RCLDZCQUE2QixHQUM3QixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxP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