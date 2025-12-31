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
var AuxiliaryBrowserTitlebarPart_1;
import './media/titlebarpart.css';
import { localize, localize2 } from '../../../../nls.js';
import { MultiWindowParts, Part } from '../../part.js';
import { getWCOTitlebarAreaRect, getZoomFactor, isWCOEnabled, } from '../../../../base/browser/browser.js';
import { getTitleBarStyle, getMenuBarVisibility, hasCustomTitlebar, hasNativeTitlebar, DEFAULT_CUSTOM_TITLEBAR_HEIGHT, getWindowControlsStyle, } from '../../../../platform/window/common/window.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { TITLE_BAR_ACTIVE_BACKGROUND, TITLE_BAR_ACTIVE_FOREGROUND, TITLE_BAR_INACTIVE_FOREGROUND, TITLE_BAR_INACTIVE_BACKGROUND, TITLE_BAR_BORDER, WORKBENCH_BACKGROUND, } from '../../../common/theme.js';
import { isMacintosh, isWindows, isLinux, isWeb, isNative, platformLocale, } from '../../../../base/common/platform.js';
import { Color } from '../../../../base/common/color.js';
import { EventType, EventHelper, Dimension, append, $, addDisposableListener, prepend, reset, getWindow, getWindowId, isAncestor, getActiveDocument, isHTMLElement, } from '../../../../base/browser/dom.js';
import { CustomMenubarControl } from './menubarControl.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { createActionViewItem, fillInActionBarActions as fillInActionBarActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { WindowTitle } from './windowTitle.js';
import { CommandCenterControl } from './commandCenterControl.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID } from '../../../common/activity.js';
import { AccountsActivityActionViewItem, isAccountsActionVisible, SimpleAccountActivityActionViewItem, SimpleGlobalActivityActionViewItem, } from '../globalCompositeBar.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { prepareActions, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { EDITOR_CORE_NAVIGATION_COMMANDS } from '../editor/editorCommands.js';
import { EditorPane } from '../editor/editorPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { EditorCommandsContextActionRunner } from '../editor/editorTabsControl.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ACCOUNTS_ACTIVITY_TILE_ACTION, GLOBAL_ACTIVITY_TITLE_ACTION } from './titlebarActions.js';
import { createInstantHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { safeIntl } from '../../../../base/common/date.js';
import { TitleBarVisibleContext } from '../../../common/contextkeys.js';
let BrowserTitleService = class BrowserTitleService extends MultiWindowParts {
    constructor(instantiationService, storageService, themeService) {
        super('workbench.titleService', themeService, storageService);
        this.instantiationService = instantiationService;
        this.properties = undefined;
        this.variables = new Map();
        this.mainPart = this._register(this.createMainTitlebarPart());
        this.onMenubarVisibilityChange = this.mainPart.onMenubarVisibilityChange;
        this._register(this.registerPart(this.mainPart));
        this.registerActions();
        this.registerAPICommands();
    }
    createMainTitlebarPart() {
        return this.instantiationService.createInstance(MainBrowserTitlebarPart);
    }
    registerActions() {
        // Focus action
        const that = this;
        this._register(registerAction2(class FocusTitleBar extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.focusTitleBar`,
                    title: localize2('focusTitleBar', 'Focus Title Bar'),
                    category: Categories.View,
                    f1: true,
                    precondition: TitleBarVisibleContext,
                });
            }
            run() {
                that.getPartByDocument(getActiveDocument())?.focus();
            }
        }));
    }
    registerAPICommands() {
        this._register(CommandsRegistry.registerCommand({
            id: 'registerWindowTitleVariable',
            handler: (accessor, name, contextKey) => {
                this.registerVariables([{ name, contextKey }]);
            },
            metadata: {
                description: 'Registers a new title variable',
                args: [
                    {
                        name: 'name',
                        schema: { type: 'string' },
                        description: 'The name of the variable to register',
                    },
                    {
                        name: 'contextKey',
                        schema: { type: 'string' },
                        description: 'The context key to use for the value of the variable',
                    },
                ],
            },
        }));
    }
    //#region Auxiliary Titlebar Parts
    createAuxiliaryTitlebarPart(container, editorGroupsContainer) {
        const titlebarPartContainer = $('.part.titlebar', { role: 'none' });
        titlebarPartContainer.style.position = 'relative';
        container.insertBefore(titlebarPartContainer, container.firstChild); // ensure we are first element
        const disposables = new DisposableStore();
        const titlebarPart = this.doCreateAuxiliaryTitlebarPart(titlebarPartContainer, editorGroupsContainer);
        disposables.add(this.registerPart(titlebarPart));
        disposables.add(Event.runAndSubscribe(titlebarPart.onDidChange, () => (titlebarPartContainer.style.height = `${titlebarPart.height}px`)));
        titlebarPart.create(titlebarPartContainer);
        if (this.properties) {
            titlebarPart.updateProperties(this.properties);
        }
        if (this.variables.size) {
            titlebarPart.registerVariables(Array.from(this.variables.values()));
        }
        Event.once(titlebarPart.onWillDispose)(() => disposables.dispose());
        return titlebarPart;
    }
    doCreateAuxiliaryTitlebarPart(container, editorGroupsContainer) {
        return this.instantiationService.createInstance(AuxiliaryBrowserTitlebarPart, container, editorGroupsContainer, this.mainPart);
    }
    updateProperties(properties) {
        this.properties = properties;
        for (const part of this.parts) {
            part.updateProperties(properties);
        }
    }
    registerVariables(variables) {
        const newVariables = [];
        for (const variable of variables) {
            if (!this.variables.has(variable.name)) {
                this.variables.set(variable.name, variable);
                newVariables.push(variable);
            }
        }
        for (const part of this.parts) {
            part.registerVariables(newVariables);
        }
    }
};
BrowserTitleService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IStorageService),
    __param(2, IThemeService)
], BrowserTitleService);
export { BrowserTitleService };
let BrowserTitlebarPart = class BrowserTitlebarPart extends Part {
    get minimumHeight() {
        const wcoEnabled = isWeb && isWCOEnabled();
        let value = this.isCommandCenterVisible || wcoEnabled ? DEFAULT_CUSTOM_TITLEBAR_HEIGHT : 30;
        if (wcoEnabled) {
            value = Math.max(value, getWCOTitlebarAreaRect(getWindow(this.element))?.height ?? 0);
        }
        return value / (this.preventZoom ? getZoomFactor(getWindow(this.element)) : 1);
    }
    get maximumHeight() {
        return this.minimumHeight;
    }
    constructor(id, targetWindow, editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService) {
        super(id, { hasTitle: false }, themeService, storageService, layoutService);
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.hostService = hostService;
        this.editorGroupService = editorGroupService;
        this.menuService = menuService;
        this.keybindingService = keybindingService;
        //#region IView
        this.minimumWidth = 0;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        //#endregion
        //#region Events
        this._onMenubarVisibilityChange = this._register(new Emitter());
        this.onMenubarVisibilityChange = this._onMenubarVisibilityChange.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.actionToolBarDisposable = this._register(new DisposableStore());
        this.editorActionsChangeDisposable = this._register(new DisposableStore());
        this.hasGlobalToolbarEntries = false;
        this.globalToolbarMenuDisposables = this._register(new DisposableStore());
        this.editorToolbarMenuDisposables = this._register(new DisposableStore());
        this.layoutToolbarMenuDisposables = this._register(new DisposableStore());
        this.activityToolbarDisposables = this._register(new DisposableStore());
        this.titleDisposables = this._register(new DisposableStore());
        this.isInactive = false;
        this.titleBarStyle = getTitleBarStyle(this.configurationService);
        this.globalToolbarMenu = this._register(this.menuService.createMenu(MenuId.TitleBar, this.contextKeyService));
        this.isAuxiliary = editorGroupsContainer !== 'main';
        this.editorService = editorService.createScoped(editorGroupsContainer, this._store);
        this.editorGroupsContainer =
            editorGroupsContainer === 'main' ? editorGroupService.mainPart : editorGroupsContainer;
        this.windowTitle = this._register(instantiationService.createInstance(WindowTitle, targetWindow, editorGroupsContainer));
        this.hoverDelegate = this._register(createInstantHoverDelegate());
        this.registerListeners(getWindowId(targetWindow));
    }
    registerListeners(targetWindowId) {
        this._register(this.hostService.onDidChangeFocus((focused) => (focused ? this.onFocus() : this.onBlur())));
        this._register(this.hostService.onDidChangeActiveWindow((windowId) => windowId === targetWindowId ? this.onFocus() : this.onBlur()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationChanged(e)));
        this._register(this.editorGroupService.onDidChangeEditorPartOptions((e) => this.onEditorPartConfigurationChange(e)));
    }
    onBlur() {
        this.isInactive = true;
        this.updateStyles();
    }
    onFocus() {
        this.isInactive = false;
        this.updateStyles();
    }
    onEditorPartConfigurationChange({ oldPartOptions, newPartOptions, }) {
        if (oldPartOptions.editorActionsLocation !== newPartOptions.editorActionsLocation ||
            oldPartOptions.showTabs !== newPartOptions.showTabs) {
            if (hasCustomTitlebar(this.configurationService, this.titleBarStyle) && this.actionToolBar) {
                this.createActionToolBar();
                this.createActionToolBarMenus({ editorActions: true });
                this._onDidChange.fire(undefined);
            }
        }
    }
    onConfigurationChanged(event) {
        // Custom menu bar (disabled if auxiliary)
        if (!this.isAuxiliary &&
            !hasNativeTitlebar(this.configurationService, this.titleBarStyle) &&
            (!isMacintosh || isWeb)) {
            if (event.affectsConfiguration('window.menuBarVisibility')) {
                if (this.currentMenubarVisibility === 'compact') {
                    this.uninstallMenubar();
                }
                else {
                    this.installMenubar();
                }
            }
        }
        // Actions
        if (hasCustomTitlebar(this.configurationService, this.titleBarStyle) && this.actionToolBar) {
            const affectsLayoutControl = event.affectsConfiguration("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */);
            const affectsActivityControl = event.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
            if (affectsLayoutControl || affectsActivityControl) {
                this.createActionToolBarMenus({
                    layoutActions: affectsLayoutControl,
                    activityActions: affectsActivityControl,
                });
                this._onDidChange.fire(undefined);
            }
        }
        // Command Center
        if (event.affectsConfiguration("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */)) {
            this.createTitle();
            this._onDidChange.fire(undefined);
        }
    }
    installMenubar() {
        if (this.menubar) {
            return; // If the menubar is already installed, skip
        }
        this.customMenubar = this._register(this.instantiationService.createInstance(CustomMenubarControl));
        this.menubar = append(this.leftContent, $('div.menubar'));
        this.menubar.setAttribute('role', 'menubar');
        this._register(this.customMenubar.onVisibilityChange((e) => this.onMenubarVisibilityChanged(e)));
        this.customMenubar.create(this.menubar);
    }
    uninstallMenubar() {
        this.customMenubar?.dispose();
        this.customMenubar = undefined;
        this.menubar?.remove();
        this.menubar = undefined;
        this.onMenubarVisibilityChanged(false);
    }
    onMenubarVisibilityChanged(visible) {
        if (isWeb || isWindows || isLinux) {
            if (this.lastLayoutDimensions) {
                this.layout(this.lastLayoutDimensions.width, this.lastLayoutDimensions.height);
            }
            this._onMenubarVisibilityChange.fire(visible);
        }
    }
    updateProperties(properties) {
        this.windowTitle.updateProperties(properties);
    }
    registerVariables(variables) {
        this.windowTitle.registerVariables(variables);
    }
    createContentArea(parent) {
        this.element = parent;
        this.rootContainer = append(parent, $('.titlebar-container'));
        this.leftContent = append(this.rootContainer, $('.titlebar-left'));
        this.centerContent = append(this.rootContainer, $('.titlebar-center'));
        this.rightContent = append(this.rootContainer, $('.titlebar-right'));
        // App Icon (Windows, Linux)
        if ((isWindows || isLinux) &&
            !hasNativeTitlebar(this.configurationService, this.titleBarStyle)) {
            this.appIcon = prepend(this.leftContent, $('a.window-appicon'));
        }
        // Draggable region that we can manipulate for #52522
        this.dragRegion = prepend(this.rootContainer, $('div.titlebar-drag-region'));
        // Menubar: install a custom menu bar depending on configuration
        if (!this.isAuxiliary &&
            !hasNativeTitlebar(this.configurationService, this.titleBarStyle) &&
            (!isMacintosh || isWeb) &&
            this.currentMenubarVisibility !== 'compact') {
            this.installMenubar();
        }
        // Title
        this.title = append(this.centerContent, $('div.window-title'));
        this.createTitle();
        // Create Toolbar Actions
        if (hasCustomTitlebar(this.configurationService, this.titleBarStyle)) {
            this.actionToolBarElement = append(this.rightContent, $('div.action-toolbar-container'));
            this.createActionToolBar();
            this.createActionToolBarMenus();
        }
        // Window Controls Container
        if (!hasNativeTitlebar(this.configurationService, this.titleBarStyle)) {
            let primaryWindowControlsLocation = isMacintosh ? 'left' : 'right';
            if (isMacintosh && isNative) {
                // Check if the locale is RTL, macOS will move traffic lights in RTL locales
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/textInfo
                const localeInfo = safeIntl.Locale(platformLocale);
                if (localeInfo?.textInfo?.direction === 'rtl') {
                    primaryWindowControlsLocation = 'right';
                }
            }
            if (isMacintosh && isNative && primaryWindowControlsLocation === 'left') {
                // macOS native: controls are on the left and the container is not needed to make room
                // for something, except for web where a custom menu being supported). not putting the
                // container helps with allowing to move the window when clicking very close to the
                // window control buttons.
            }
            else if (getWindowControlsStyle(this.configurationService) === "hidden" /* WindowControlsStyle.HIDDEN */) {
                // Linux/Windows: controls are explicitly disabled
            }
            else {
                this.windowControlsContainer = append(primaryWindowControlsLocation === 'left' ? this.leftContent : this.rightContent, $('div.window-controls-container'));
                if (isWeb) {
                    // Web: its possible to have control overlays on both sides, for example on macOS
                    // with window controls on the left and PWA controls on the right.
                    append(primaryWindowControlsLocation === 'left' ? this.rightContent : this.leftContent, $('div.window-controls-container'));
                }
                if (isWCOEnabled()) {
                    this.windowControlsContainer.classList.add('wco-enabled');
                }
            }
        }
        // Context menu over title bar: depending on the OS and the location of the click this will either be
        // the overall context menu for the entire title bar or a specific title context menu.
        // Windows / Linux: we only support the overall context menu on the title bar
        // macOS: we support both the overall context menu and the title context menu.
        //        in addition, we allow Cmd+click to bring up the title context menu.
        {
            this._register(addDisposableListener(this.rootContainer, EventType.CONTEXT_MENU, (e) => {
                EventHelper.stop(e);
                let targetMenu;
                if (isMacintosh && isHTMLElement(e.target) && isAncestor(e.target, this.title)) {
                    targetMenu = MenuId.TitleBarTitleContext;
                }
                else {
                    targetMenu = MenuId.TitleBarContext;
                }
                this.onContextMenu(e, targetMenu);
            }));
            if (isMacintosh) {
                this._register(addDisposableListener(this.title, EventType.MOUSE_DOWN, (e) => {
                    if (e.metaKey) {
                        EventHelper.stop(e, true /* stop bubbling to prevent command center from opening */);
                        this.onContextMenu(e, MenuId.TitleBarTitleContext);
                    }
                }, true /* capture phase to prevent command center from opening */));
            }
        }
        this.updateStyles();
        return this.element;
    }
    createTitle() {
        this.titleDisposables.clear();
        // Text Title
        if (!this.isCommandCenterVisible) {
            this.title.innerText = this.windowTitle.value;
            this.titleDisposables.add(this.windowTitle.onDidChange(() => {
                this.title.innerText = this.windowTitle.value;
                // layout menubar and other renderings in the titlebar
                if (this.lastLayoutDimensions) {
                    this.updateLayout(this.lastLayoutDimensions);
                }
            }));
        }
        // Menu Title
        else {
            const commandCenter = this.instantiationService.createInstance(CommandCenterControl, this.windowTitle, this.hoverDelegate);
            reset(this.title, commandCenter.element);
            this.titleDisposables.add(commandCenter);
        }
    }
    actionViewItemProvider(action, options) {
        // --- Activity Actions
        if (!this.isAuxiliary) {
            if (action.id === GLOBAL_ACTIVITY_ID) {
                return this.instantiationService.createInstance(SimpleGlobalActivityActionViewItem, { position: () => 2 /* HoverPosition.BELOW */ }, options);
            }
            if (action.id === ACCOUNTS_ACTIVITY_ID) {
                return this.instantiationService.createInstance(SimpleAccountActivityActionViewItem, { position: () => 2 /* HoverPosition.BELOW */ }, options);
            }
        }
        // --- Editor Actions
        const activeEditorPane = this.editorGroupsContainer.activeGroup?.activeEditorPane;
        if (activeEditorPane && activeEditorPane instanceof EditorPane) {
            const result = activeEditorPane.getActionViewItem(action, options);
            if (result) {
                return result;
            }
        }
        // Check extensions
        return createActionViewItem(this.instantiationService, action, {
            ...options,
            menuAsChild: false,
        });
    }
    getKeybinding(action) {
        const editorPaneAwareContextKeyService = this.editorGroupsContainer.activeGroup?.activeEditorPane?.scopedContextKeyService ??
            this.contextKeyService;
        return this.keybindingService.lookupKeybinding(action.id, editorPaneAwareContextKeyService);
    }
    createActionToolBar() {
        // Creates the action tool bar. Depends on the configuration of the title bar menus
        // Requires to be recreated whenever editor actions enablement changes
        this.actionToolBarDisposable.clear();
        this.actionToolBar = this.actionToolBarDisposable.add(this.instantiationService.createInstance(WorkbenchToolBar, this.actionToolBarElement, {
            contextMenu: MenuId.TitleBarContext,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            ariaLabel: localize('ariaLabelTitleActions', 'Title actions'),
            getKeyBinding: (action) => this.getKeybinding(action),
            overflowBehavior: {
                maxItems: 9,
                exempted: [ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID, ...EDITOR_CORE_NAVIGATION_COMMANDS],
            },
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            telemetrySource: 'titlePart',
            highlightToggledItems: this.editorActionsEnabled, // Only show toggled state for editor actions (Layout actions are not shown as toggled)
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            hoverDelegate: this.hoverDelegate,
        }));
        if (this.editorActionsEnabled) {
            this.actionToolBarDisposable.add(this.editorGroupsContainer.onDidChangeActiveGroup(() => this.createActionToolBarMenus({ editorActions: true })));
        }
    }
    createActionToolBarMenus(update = true) {
        if (update === true) {
            update = { editorActions: true, layoutActions: true, activityActions: true };
        }
        const updateToolBarActions = () => {
            const actions = { primary: [], secondary: [] };
            // --- Editor Actions
            if (this.editorActionsEnabled) {
                this.editorActionsChangeDisposable.clear();
                const activeGroup = this.editorGroupsContainer.activeGroup;
                if (activeGroup) {
                    const editorActions = activeGroup.createEditorActions(this.editorActionsChangeDisposable);
                    actions.primary.push(...editorActions.actions.primary);
                    actions.secondary.push(...editorActions.actions.secondary);
                    this.editorActionsChangeDisposable.add(editorActions.onDidChange(() => updateToolBarActions()));
                }
            }
            // --- Global Actions
            const globalToolbarActions = this.globalToolbarMenu.getActions();
            this.hasGlobalToolbarEntries = globalToolbarActions.length > 0;
            fillInActionBarActions(globalToolbarActions, actions);
            // --- Layout Actions
            if (this.layoutToolbarMenu) {
                fillInActionBarActions(this.layoutToolbarMenu.getActions(), actions, () => !this.editorActionsEnabled);
            }
            // --- Activity Actions (always at the end)
            if (this.activityActionsEnabled) {
                if (isAccountsActionVisible(this.storageService)) {
                    actions.primary.push(ACCOUNTS_ACTIVITY_TILE_ACTION);
                }
                actions.primary.push(GLOBAL_ACTIVITY_TITLE_ACTION);
            }
            this.actionToolBar.setActions(prepareActions(actions.primary), prepareActions(actions.secondary));
        };
        // Create/Update the menus which should be in the title tool bar
        if (update.editorActions) {
            this.editorToolbarMenuDisposables.clear();
            // The editor toolbar menu is handled by the editor group so we do not need to manage it here.
            // However, depending on the active editor, we need to update the context and action runner of the toolbar menu.
            if (this.editorActionsEnabled && this.editorService.activeEditor !== undefined) {
                const context = {
                    groupId: this.editorGroupsContainer.activeGroup.id,
                };
                this.actionToolBar.actionRunner = this.editorToolbarMenuDisposables.add(new EditorCommandsContextActionRunner(context));
                this.actionToolBar.context = context;
            }
            else {
                this.actionToolBar.actionRunner = this.editorToolbarMenuDisposables.add(new ActionRunner());
                this.actionToolBar.context = undefined;
            }
        }
        if (update.layoutActions) {
            this.layoutToolbarMenuDisposables.clear();
            if (this.layoutControlEnabled) {
                this.layoutToolbarMenu = this.menuService.createMenu(MenuId.LayoutControlMenu, this.contextKeyService);
                this.layoutToolbarMenuDisposables.add(this.layoutToolbarMenu);
                this.layoutToolbarMenuDisposables.add(this.layoutToolbarMenu.onDidChange(() => updateToolBarActions()));
            }
            else {
                this.layoutToolbarMenu = undefined;
            }
        }
        this.globalToolbarMenuDisposables.clear();
        this.globalToolbarMenuDisposables.add(this.globalToolbarMenu.onDidChange(() => updateToolBarActions()));
        if (update.activityActions) {
            this.activityToolbarDisposables.clear();
            if (this.activityActionsEnabled) {
                this.activityToolbarDisposables.add(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, this._store)(() => updateToolBarActions()));
            }
        }
        updateToolBarActions();
    }
    updateStyles() {
        super.updateStyles();
        // Part container
        if (this.element) {
            if (this.isInactive) {
                this.element.classList.add('inactive');
            }
            else {
                this.element.classList.remove('inactive');
            }
            const titleBackground = this.getColor(this.isInactive ? TITLE_BAR_INACTIVE_BACKGROUND : TITLE_BAR_ACTIVE_BACKGROUND, (color, theme) => {
                // LCD Rendering Support: the title bar part is a defining its own GPU layer.
                // To benefit from LCD font rendering, we must ensure that we always set an
                // opaque background color. As such, we compute an opaque color given we know
                // the background color is the workbench background.
                return color.isOpaque() ? color : color.makeOpaque(WORKBENCH_BACKGROUND(theme));
            }) || '';
            this.element.style.backgroundColor = titleBackground;
            if (this.appIconBadge) {
                this.appIconBadge.style.backgroundColor = titleBackground;
            }
            if (titleBackground && Color.fromHex(titleBackground).isLighter()) {
                this.element.classList.add('light');
            }
            else {
                this.element.classList.remove('light');
            }
            const titleForeground = this.getColor(this.isInactive ? TITLE_BAR_INACTIVE_FOREGROUND : TITLE_BAR_ACTIVE_FOREGROUND);
            this.element.style.color = titleForeground || '';
            const titleBorder = this.getColor(TITLE_BAR_BORDER);
            this.element.style.borderBottom = titleBorder ? `1px solid ${titleBorder}` : '';
        }
    }
    onContextMenu(e, menuId) {
        const event = new StandardMouseEvent(getWindow(this.element), e);
        // Show it
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            menuId,
            contextKeyService: this.contextKeyService,
            domForShadowRoot: isMacintosh && isNative ? event.target : undefined,
        });
    }
    get currentMenubarVisibility() {
        if (this.isAuxiliary) {
            return 'hidden';
        }
        return getMenuBarVisibility(this.configurationService);
    }
    get layoutControlEnabled() {
        return (!this.isAuxiliary &&
            this.configurationService.getValue("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */) !== false);
    }
    get isCommandCenterVisible() {
        return this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) !== false;
    }
    get editorActionsEnabled() {
        return (this.editorGroupService.partOptions.editorActionsLocation ===
            "titleBar" /* EditorActionsLocation.TITLEBAR */ ||
            (this.editorGroupService.partOptions.editorActionsLocation ===
                "default" /* EditorActionsLocation.DEFAULT */ &&
                this.editorGroupService.partOptions.showTabs === "none" /* EditorTabsMode.NONE */));
    }
    get activityActionsEnabled() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        return (!this.isAuxiliary &&
            (activityBarPosition === "top" /* ActivityBarPosition.TOP */ ||
                activityBarPosition === "bottom" /* ActivityBarPosition.BOTTOM */));
    }
    get hasZoomableElements() {
        const hasMenubar = !(this.currentMenubarVisibility === 'hidden' ||
            this.currentMenubarVisibility === 'compact' ||
            (!isWeb && isMacintosh));
        const hasCommandCenter = this.isCommandCenterVisible;
        const hasToolBarActions = this.hasGlobalToolbarEntries ||
            this.layoutControlEnabled ||
            this.editorActionsEnabled ||
            this.activityActionsEnabled;
        return hasMenubar || hasCommandCenter || hasToolBarActions;
    }
    get preventZoom() {
        // Prevent zooming behavior if any of the following conditions are met:
        // 1. Shrinking below the window control size (zoom < 1)
        // 2. No custom items are present in the title bar
        return getZoomFactor(getWindow(this.element)) < 1 || !this.hasZoomableElements;
    }
    layout(width, height) {
        this.updateLayout(new Dimension(width, height));
        super.layoutContents(width, height);
    }
    updateLayout(dimension) {
        this.lastLayoutDimensions = dimension;
        if (hasCustomTitlebar(this.configurationService, this.titleBarStyle)) {
            const zoomFactor = getZoomFactor(getWindow(this.element));
            this.element.style.setProperty('--zoom-factor', zoomFactor.toString());
            this.rootContainer.classList.toggle('counter-zoom', this.preventZoom);
            if (this.customMenubar) {
                const menubarDimension = new Dimension(0, dimension.height);
                this.customMenubar.layout(menubarDimension);
            }
        }
    }
    focus() {
        if (this.customMenubar) {
            this.customMenubar.toggleFocus();
        }
        else {
            ;
            this.element.querySelector('[tabindex]:not([tabindex="-1"])')?.focus();
        }
    }
    toJSON() {
        return {
            type: "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */,
        };
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
};
BrowserTitlebarPart = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, IEditorGroupsService),
    __param(13, IEditorService),
    __param(14, IMenuService),
    __param(15, IKeybindingService)
], BrowserTitlebarPart);
export { BrowserTitlebarPart };
let MainBrowserTitlebarPart = class MainBrowserTitlebarPart extends BrowserTitlebarPart {
    constructor(contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService) {
        super("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow, 'main', contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService);
    }
};
MainBrowserTitlebarPart = __decorate([
    __param(0, IContextMenuService),
    __param(1, IConfigurationService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, IInstantiationService),
    __param(4, IThemeService),
    __param(5, IStorageService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IContextKeyService),
    __param(8, IHostService),
    __param(9, IEditorGroupsService),
    __param(10, IEditorService),
    __param(11, IMenuService),
    __param(12, IKeybindingService)
], MainBrowserTitlebarPart);
export { MainBrowserTitlebarPart };
let AuxiliaryBrowserTitlebarPart = class AuxiliaryBrowserTitlebarPart extends BrowserTitlebarPart {
    static { AuxiliaryBrowserTitlebarPart_1 = this; }
    static { this.COUNTER = 1; }
    get height() {
        return this.minimumHeight;
    }
    constructor(container, editorGroupsContainer, mainTitlebar, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService) {
        const id = AuxiliaryBrowserTitlebarPart_1.COUNTER++;
        super(`workbench.parts.auxiliaryTitle.${id}`, getWindow(container), editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService);
        this.container = container;
        this.mainTitlebar = mainTitlebar;
    }
    get preventZoom() {
        // Prevent zooming behavior if any of the following conditions are met:
        // 1. Shrinking below the window control size (zoom < 1)
        // 2. No custom items are present in the main title bar
        // The auxiliary title bar never contains any zoomable items itself,
        // but we want to match the behavior of the main title bar.
        return getZoomFactor(getWindow(this.element)) < 1 || !this.mainTitlebar.hasZoomableElements;
    }
};
AuxiliaryBrowserTitlebarPart = AuxiliaryBrowserTitlebarPart_1 = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, IEditorGroupsService),
    __param(13, IEditorService),
    __param(14, IMenuService),
    __param(15, IKeybindingService)
], AuxiliaryBrowserTitlebarPart);
export { AuxiliaryBrowserTitlebarPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGl0bGViYXJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdGl0bGViYXIvdGl0bGViYXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUV0RCxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGFBQWEsRUFDYixZQUFZLEdBQ1osTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBRU4sZ0JBQWdCLEVBQ2hCLG9CQUFvQixFQUNwQixpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLDhCQUE4QixFQUM5QixzQkFBc0IsR0FHdEIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2pILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLDJCQUEyQixFQUMzQiw2QkFBNkIsRUFDN0IsNkJBQTZCLEVBQzdCLGdCQUFnQixFQUNoQixvQkFBb0IsR0FDcEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNq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