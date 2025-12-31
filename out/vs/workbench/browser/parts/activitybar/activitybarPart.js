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
var ActivitybarPart_1;
import './media/activitybarpart.css';
import './media/activityaction.css';
import { localize, localize2 } from '../../../../nls.js';
import { Part } from '../../part.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ToggleSidebarPositionAction, ToggleSidebarVisibilityAction, } from '../../actions/layoutActions.js';
import { IThemeService, registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { ACTIVITY_BAR_BACKGROUND, ACTIVITY_BAR_BORDER, ACTIVITY_BAR_FOREGROUND, ACTIVITY_BAR_ACTIVE_BORDER, ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_INACTIVE_FOREGROUND, ACTIVITY_BAR_ACTIVE_BACKGROUND, ACTIVITY_BAR_DRAG_AND_DROP_BORDER, ACTIVITY_BAR_ACTIVE_FOCUS_BORDER, } from '../../../common/theme.js';
import { activeContrastBorder, contrastBorder, focusBorder, } from '../../../../platform/theme/common/colorRegistry.js';
import { addDisposableListener, append, EventType, isAncestor, $, clearNode, } from '../../../../base/browser/dom.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { CustomMenubarControl } from '../titlebar/menubarControl.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getMenuBarVisibility } from '../../../../platform/window/common/window.js';
import { Separator, SubmenuAction, toAction } from '../../../../base/common/actions.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { PaneCompositeBar } from '../paneCompositeBar.js';
import { GlobalCompositeBar } from '../globalCompositeBar.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Action2, IMenuService, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IViewDescriptorService, ViewContainerLocationToString, } from '../../../common/views.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
let ActivitybarPart = class ActivitybarPart extends Part {
    static { ActivitybarPart_1 = this; }
    static { this.ACTION_HEIGHT = 48; }
    static { this.pinnedViewContainersKey = 'workbench.activity.pinnedViewlets2'; }
    static { this.placeholderViewContainersKey = 'workbench.activity.placeholderViewlets'; }
    static { this.viewContainersWorkspaceStateKey = 'workbench.activity.viewletsWorkspaceState'; }
    constructor(paneCompositePart, instantiationService, layoutService, themeService, storageService) {
        super("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */, { hasTitle: false }, themeService, storageService, layoutService);
        this.paneCompositePart = paneCompositePart;
        this.instantiationService = instantiationService;
        //#region IView
        this.minimumWidth = 48;
        this.maximumWidth = 48;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        //#endregion
        this.compositeBar = this._register(new MutableDisposable());
    }
    createCompositeBar() {
        return this.instantiationService.createInstance(ActivityBarCompositeBar, {
            partContainerClass: 'activitybar',
            pinnedViewContainersKey: ActivitybarPart_1.pinnedViewContainersKey,
            placeholderViewContainersKey: ActivitybarPart_1.placeholderViewContainersKey,
            viewContainersWorkspaceStateKey: ActivitybarPart_1.viewContainersWorkspaceStateKey,
            orientation: 1 /* ActionsOrientation.VERTICAL */,
            icon: true,
            iconSize: 24,
            activityHoverOptions: {
                position: () => this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */
                    ? 1 /* HoverPosition.RIGHT */
                    : 0 /* HoverPosition.LEFT */,
            },
            preventLoopNavigation: true,
            recomputeSizes: false,
            fillExtraContextMenuActions: (actions, e) => { },
            compositeSize: 52,
            colors: (theme) => ({
                activeForegroundColor: theme.getColor(ACTIVITY_BAR_FOREGROUND),
                inactiveForegroundColor: theme.getColor(ACTIVITY_BAR_INACTIVE_FOREGROUND),
                activeBorderColor: theme.getColor(ACTIVITY_BAR_ACTIVE_BORDER),
                activeBackground: theme.getColor(ACTIVITY_BAR_ACTIVE_BACKGROUND),
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                dragAndDropBorder: theme.getColor(ACTIVITY_BAR_DRAG_AND_DROP_BORDER),
                activeBackgroundColor: undefined,
                inactiveBackgroundColor: undefined,
                activeBorderBottomColor: undefined,
            }),
            overflowActionSize: ActivitybarPart_1.ACTION_HEIGHT,
        }, "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */, this.paneCompositePart, true);
    }
    createContentArea(parent) {
        this.element = parent;
        this.content = append(this.element, $('.content'));
        if (this.layoutService.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */)) {
            this.show();
        }
        return this.content;
    }
    getPinnedPaneCompositeIds() {
        return this.compositeBar.value?.getPinnedPaneCompositeIds() ?? [];
    }
    getVisiblePaneCompositeIds() {
        return this.compositeBar.value?.getVisiblePaneCompositeIds() ?? [];
    }
    getPaneCompositeIds() {
        return this.compositeBar.value?.getPaneCompositeIds() ?? [];
    }
    focus() {
        this.compositeBar.value?.focus();
    }
    updateStyles() {
        super.updateStyles();
        const container = assertIsDefined(this.getContainer());
        const background = this.getColor(ACTIVITY_BAR_BACKGROUND) || '';
        container.style.backgroundColor = background;
        const borderColor = this.getColor(ACTIVITY_BAR_BORDER) || this.getColor(contrastBorder) || '';
        container.classList.toggle('bordered', !!borderColor);
        container.style.borderColor = borderColor ? borderColor : '';
    }
    show(focus) {
        if (!this.content) {
            return;
        }
        if (!this.compositeBar.value) {
            this.compositeBar.value = this.createCompositeBar();
            this.compositeBar.value.create(this.content);
            if (this.dimension) {
                this.layout(this.dimension.width, this.dimension.height);
            }
        }
        if (focus) {
            this.focus();
        }
    }
    hide() {
        if (!this.compositeBar.value) {
            return;
        }
        this.compositeBar.clear();
        if (this.content) {
            clearNode(this.content);
        }
    }
    layout(width, height) {
        super.layout(width, height, 0, 0);
        if (!this.compositeBar.value) {
            return;
        }
        // Layout contents
        const contentAreaSize = super.layoutContents(width, height).contentSize;
        // Layout composite bar
        this.compositeBar.value.layout(width, contentAreaSize.height);
    }
    toJSON() {
        return {
            type: "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */,
        };
    }
};
ActivitybarPart = ActivitybarPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IWorkbenchLayoutService),
    __param(3, IThemeService),
    __param(4, IStorageService)
], ActivitybarPart);
export { ActivitybarPart };
let ActivityBarCompositeBar = class ActivityBarCompositeBar extends PaneCompositeBar {
    constructor(options, part, paneCompositePart, showGlobalActivities, instantiationService, storageService, extensionService, viewDescriptorService, viewService, contextKeyService, environmentService, configurationService, menuService, layoutService) {
        super({
            ...options,
            fillExtraContextMenuActions: (actions, e) => {
                options.fillExtraContextMenuActions(actions, e);
                this.fillContextMenuActions(actions, e);
            },
        }, part, paneCompositePart, instantiationService, storageService, extensionService, viewDescriptorService, viewService, contextKeyService, environmentService, layoutService);
        this.configurationService = configurationService;
        this.menuService = menuService;
        this.keyboardNavigationDisposables = this._register(new DisposableStore());
        if (showGlobalActivities) {
            this.globalCompositeBar = this._register(instantiationService.createInstance(GlobalCompositeBar, () => this.getContextMenuActions(), (theme) => this.options.colors(theme), this.options.activityHoverOptions));
        }
        // Register for configuration changes
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('window.menuBarVisibility')) {
                if (getMenuBarVisibility(this.configurationService) === 'compact') {
                    this.installMenubar();
                }
                else {
                    this.uninstallMenubar();
                }
            }
        }));
    }
    fillContextMenuActions(actions, e) {
        // Menu
        const menuBarVisibility = getMenuBarVisibility(this.configurationService);
        if (menuBarVisibility === 'compact' ||
            menuBarVisibility === 'hidden' ||
            menuBarVisibility === 'toggle') {
            actions.unshift(...[
                toAction({
                    id: 'toggleMenuVisibility',
                    label: localize('menu', 'Menu'),
                    checked: menuBarVisibility === 'compact',
                    run: () => this.configurationService.updateValue('window.menuBarVisibility', menuBarVisibility === 'compact' ? 'toggle' : 'compact'),
                }),
                new Separator(),
            ]);
        }
        if (menuBarVisibility === 'compact' && this.menuBarContainer && e?.target) {
            if (isAncestor(e.target, this.menuBarContainer)) {
                actions.unshift(...[
                    toAction({
                        id: 'hideCompactMenu',
                        label: localize('hideMenu', 'Hide Menu'),
                        run: () => this.configurationService.updateValue('window.menuBarVisibility', 'toggle'),
                    }),
                    new Separator(),
                ]);
            }
        }
        // Global Composite Bar
        if (this.globalCompositeBar) {
            actions.push(new Separator());
            actions.push(...this.globalCompositeBar.getContextMenuActions());
        }
        actions.push(new Separator());
        actions.push(...this.getActivityBarContextMenuActions());
    }
    uninstallMenubar() {
        if (this.menuBar) {
            this.menuBar.dispose();
            this.menuBar = undefined;
        }
        if (this.menuBarContainer) {
            this.menuBarContainer.remove();
            this.menuBarContainer = undefined;
        }
    }
    installMenubar() {
        if (this.menuBar) {
            return; // prevent menu bar from installing twice #110720
        }
        this.menuBarContainer = $('.menubar');
        const content = assertIsDefined(this.element);
        content.prepend(this.menuBarContainer);
        // Menubar: install a custom menu bar depending on configuration
        this.menuBar = this._register(this.instantiationService.createInstance(CustomMenubarControl));
        this.menuBar.create(this.menuBarContainer);
    }
    registerKeyboardNavigationListeners() {
        this.keyboardNavigationDisposables.clear();
        // Up/Down or Left/Right arrow on compact menu
        if (this.menuBarContainer) {
            this.keyboardNavigationDisposables.add(addDisposableListener(this.menuBarContainer, EventType.KEY_DOWN, (e) => {
                const kbEvent = new StandardKeyboardEvent(e);
                if (kbEvent.equals(18 /* KeyCode.DownArrow */) || kbEvent.equals(17 /* KeyCode.RightArrow */)) {
                    this.focus();
                }
            }));
        }
        // Up/Down on Activity Icons
        if (this.compositeBarContainer) {
            this.keyboardNavigationDisposables.add(addDisposableListener(this.compositeBarContainer, EventType.KEY_DOWN, (e) => {
                const kbEvent = new StandardKeyboardEvent(e);
                if (kbEvent.equals(18 /* KeyCode.DownArrow */) || kbEvent.equals(17 /* KeyCode.RightArrow */)) {
                    this.globalCompositeBar?.focus();
                }
                else if (kbEvent.equals(16 /* KeyCode.UpArrow */) || kbEvent.equals(15 /* KeyCode.LeftArrow */)) {
                    this.menuBar?.toggleFocus();
                }
            }));
        }
        // Up arrow on global icons
        if (this.globalCompositeBar) {
            this.keyboardNavigationDisposables.add(addDisposableListener(this.globalCompositeBar.element, EventType.KEY_DOWN, (e) => {
                const kbEvent = new StandardKeyboardEvent(e);
                if (kbEvent.equals(16 /* KeyCode.UpArrow */) || kbEvent.equals(15 /* KeyCode.LeftArrow */)) {
                    this.focus(this.getVisiblePaneCompositeIds().length - 1);
                }
            }));
        }
    }
    create(parent) {
        this.element = parent;
        // Install menubar if compact
        if (getMenuBarVisibility(this.configurationService) === 'compact') {
            this.installMenubar();
        }
        // View Containers action bar
        this.compositeBarContainer = super.create(this.element);
        // Global action bar
        if (this.globalCompositeBar) {
            this.globalCompositeBar.create(this.element);
        }
        // Keyboard Navigation
        this.registerKeyboardNavigationListeners();
        return this.compositeBarContainer;
    }
    layout(width, height) {
        if (this.menuBarContainer) {
            if (this.options.orientation === 1 /* ActionsOrientation.VERTICAL */) {
                height -= this.menuBarContainer.clientHeight;
            }
            else {
                width -= this.menuBarContainer.clientWidth;
            }
        }
        if (this.globalCompositeBar) {
            if (this.options.orientation === 1 /* ActionsOrientation.VERTICAL */) {
                height -= this.globalCompositeBar.size() * ActivitybarPart.ACTION_HEIGHT;
            }
            else {
                width -= this.globalCompositeBar.element.clientWidth;
            }
        }
        super.layout(width, height);
    }
    getActivityBarContextMenuActions() {
        const activityBarPositionMenu = this.menuService.getMenuActions(MenuId.ActivityBarPositionMenu, this.contextKeyService, { shouldForwardArgs: true, renderShortTitle: true });
        const positionActions = getContextMenuActions(activityBarPositionMenu).secondary;
        const actions = [
            new SubmenuAction('workbench.action.panel.position', localize('activity bar position', 'Activity Bar Position'), positionActions),
            toAction({
                id: ToggleSidebarPositionAction.ID,
                label: ToggleSidebarPositionAction.getLabel(this.layoutService),
                run: () => this.instantiationService.invokeFunction((accessor) => new ToggleSidebarPositionAction().run(accessor)),
            }),
        ];
        if (this.part === "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) {
            actions.push(toAction({
                id: ToggleSidebarVisibilityAction.ID,
                label: ToggleSidebarVisibilityAction.LABEL,
                run: () => this.instantiationService.invokeFunction((accessor) => new ToggleSidebarVisibilityAction().run(accessor)),
            }));
        }
        return actions;
    }
};
ActivityBarCompositeBar = __decorate([
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IExtensionService),
    __param(7, IViewDescriptorService),
    __param(8, IViewsService),
    __param(9, IContextKeyService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IConfigurationService),
    __param(12, IMenuService),
    __param(13, IWorkbenchLayoutService)
], ActivityBarCompositeBar);
export { ActivityBarCompositeBar };
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.activityBarLocation.default',
            title: {
                ...localize2('positionActivityBarDefault', 'Move Activity Bar to Side'),
                mnemonicTitle: localize({ key: 'miDefaultActivityBar', comment: ['&& denotes a mnemonic'] }, '&&Default'),
            },
            shortTitle: localize('default', 'Default'),
            category: Categories.View,
            toggled: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "default" /* ActivityBarPosition.DEFAULT */),
            menu: [
                {
                    id: MenuId.ActivityBarPositionMenu,
                    order: 1,
                },
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.notEquals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "default" /* ActivityBarPosition.DEFAULT */),
                },
            ],
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, "default" /* ActivityBarPosition.DEFAULT */);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.activityBarLocation.top',
            title: {
                ...localize2('positionActivityBarTop', 'Move Activity Bar to Top'),
                mnemonicTitle: localize({ key: 'miTopActivityBar', comment: ['&& denotes a mnemonic'] }, '&&Top'),
            },
            shortTitle: localize('top', 'Top'),
            category: Categories.View,
            toggled: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "top" /* ActivityBarPosition.TOP */),
            menu: [
                {
                    id: MenuId.ActivityBarPositionMenu,
                    order: 2,
                },
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.notEquals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "top" /* ActivityBarPosition.TOP */),
                },
            ],
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, "top" /* ActivityBarPosition.TOP */);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.activityBarLocation.bottom',
            title: {
                ...localize2('positionActivityBarBottom', 'Move Activity Bar to Bottom'),
                mnemonicTitle: localize({ key: 'miBottomActivityBar', comment: ['&& denotes a mnemonic'] }, '&&Bottom'),
            },
            shortTitle: localize('bottom', 'Bottom'),
            category: Categories.View,
            toggled: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "bottom" /* ActivityBarPosition.BOTTOM */),
            menu: [
                {
                    id: MenuId.ActivityBarPositionMenu,
                    order: 3,
                },
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.notEquals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "bottom" /* ActivityBarPosition.BOTTOM */),
                },
            ],
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, "bottom" /* ActivityBarPosition.BOTTOM */);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.activityBarLocation.hide',
            title: {
                ...localize2('hideActivityBar', 'Hide Activity Bar'),
                mnemonicTitle: localize({ key: 'miHideActivityBar', comment: ['&& denotes a mnemonic'] }, '&&Hidden'),
            },
            shortTitle: localize('hide', 'Hidden'),
            category: Categories.View,
            toggled: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "hidden" /* ActivityBarPosition.HIDDEN */),
            menu: [
                {
                    id: MenuId.ActivityBarPositionMenu,
                    order: 4,
                },
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.notEquals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "hidden" /* ActivityBarPosition.HIDDEN */),
                },
            ],
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, "hidden" /* ActivityBarPosition.HIDDEN */);
    }
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.ActivityBarPositionMenu,
    title: localize('positionActivituBar', 'Activity Bar Position'),
    group: '3_workbench_layout_move',
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitleContext, {
    submenu: MenuId.ActivityBarPositionMenu,
    title: localize('positionActivituBar', 'Activity Bar Position'),
    when: ContextKeyExpr.or(ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */)), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
    group: '3_workbench_layout_move',
    order: 1,
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousSideBarView',
            title: localize2('previousSideBarView', 'Previous Primary Side Bar View'),
            category: Categories.View,
            f1: true,
        }, 0 /* ViewContainerLocation.Sidebar */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextSideBarView',
            title: localize2('nextSideBarView', 'Next Primary Side Bar View'),
            category: Categories.View,
            f1: true,
        }, 0 /* ViewContainerLocation.Sidebar */, 1);
    }
});
registerAction2(class FocusActivityBarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.focusActivityBar',
            title: localize2('focusActivityBar', 'Focus Activity Bar'),
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.focusPart("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
    }
});
registerThemingParticipant((theme, collector) => {
    const activityBarActiveBorderColor = theme.getColor(ACTIVITY_BAR_ACTIVE_BORDER);
    if (activityBarActiveBorderColor) {
        collector.addRule(`
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked .active-item-indicator:before {
				border-left-color: ${activityBarActiveBorderColor};
			}
		`);
    }
    const activityBarActiveFocusBorderColor = theme.getColor(ACTIVITY_BAR_ACTIVE_FOCUS_BORDER);
    if (activityBarActiveFocusBorderColor) {
        collector.addRule(`
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked:focus::before {
				visibility: hidden;
			}

			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked:focus .active-item-indicator:before {
				visibility: visible;
				border-left-color: ${activityBarActiveFocusBorderColor};
			}
		`);
    }
    const activityBarActiveBackgroundColor = theme.getColor(ACTIVITY_BAR_ACTIVE_BACKGROUND);
    if (activityBarActiveBackgroundColor) {
        collector.addRule(`
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked .active-item-indicator {
				z-index: 0;
				background-color: ${activityBarActiveBackgroundColor};
			}
		`);
    }
    // Styling with Outline color (e.g. high contrast theme)
    const outline = theme.getColor(activeContrastBorder);
    if (outline) {
        collector.addRule(`
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item .action-label::before{
				padding: 6px;
			}

			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.active .action-label::before,
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.active:hover .action-label::before,
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked .action-label::before,
			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item.checked:hover .action-label::before {
				outline: 1px solid ${outline};
			}

			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:hover .action-label::before {
				outline: 1px dashed ${outline};
			}

			.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .active-item-indicator:before {
				border-left-color: ${outline};
			}
		`);
    }
    // Styling without outline color
    else {
        const focusBorderColor = theme.getColor(focusBorder);
        if (focusBorderColor) {
            collector.addRule(`
				.monaco-workbench .activitybar > .content :not(.monaco-menu) > .monaco-action-bar .action-item:focus .active-item-indicator::before {
						border-left-color: ${focusBorderColor};
					}
				`);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHliYXJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvYWN0aXZpdHliYXIvYWN0aXZpdHliYXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFFTix1QkFBdUIsR0FJdkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pGLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsNkJBQTZCLEdBQzdCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLGFBQWEsRUFFYiwwQkFBMEIsR0FDMUIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLG1CQUFtQixFQUNuQix1QkFBdUIsRUFDdkIsMEJBQTBCLEVBQzFCLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsZ0NBQWdDLEVBQ2hDLDhCQUE4QixFQUM5QixpQ0FBaUMsRUFDakMsZ0NBQWdDLEdBQ2hDLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsV0FBVyxHQUNYLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixNQUFNLEVBQ04sU0FBUyxFQUNU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