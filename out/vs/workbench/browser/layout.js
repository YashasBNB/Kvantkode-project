/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableMap, DisposableStore, toDisposable, } from '../../base/common/lifecycle.js';
import { Emitter } from '../../base/common/event.js';
import { EventType, addDisposableListener, getClientArea, position, size, isAncestorUsingFlowTo, computeScreenAwareSize, getActiveDocument, getWindows, getActiveWindow, isActiveDocument, getWindow, getWindowId, getActiveElement, Dimension, } from '../../base/browser/dom.js';
import { onDidChangeFullscreen, isFullscreen, isWCOEnabled } from '../../base/browser/browser.js';
import { IWorkingCopyBackupService } from '../services/workingCopy/common/workingCopyBackup.js';
import { isWindows, isLinux, isMacintosh, isWeb, isIOS } from '../../base/common/platform.js';
import { isResourceEditorInput, pathsToEditors, } from '../common/editor.js';
import { SidebarPart } from './parts/sidebar/sidebarPart.js';
import { PanelPart } from './parts/panel/panelPart.js';
import { positionFromString, positionToString, panelOpensMaximizedFromString, shouldShowCustomTitleBar, isHorizontal, isMultiWindowPart, } from '../services/layout/browser/layoutService.js';
import { isTemporaryWorkspace, IWorkspaceContextService, } from '../../platform/workspace/common/workspace.js';
import { IStorageService, } from '../../platform/storage/common/storage.js';
import { IConfigurationService, } from '../../platform/configuration/common/configuration.js';
import { ITitleService } from '../services/title/browser/titleService.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { getMenuBarVisibility, hasNativeTitlebar, hasCustomTitlebar, useWindowControlsOverlay, DEFAULT_WINDOW_SIZE, } from '../../platform/window/common/window.js';
import { IHostService } from '../services/host/browser/host.js';
import { IBrowserWorkbenchEnvironmentService } from '../services/environment/browser/environmentService.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { IEditorGroupsService, } from '../services/editor/common/editorGroupsService.js';
import { SerializableGrid, Sizing, } from '../../base/browser/ui/grid/grid.js';
import { Part } from './part.js';
import { IStatusbarService } from '../services/statusbar/browser/statusbar.js';
import { IFileService } from '../../platform/files/common/files.js';
import { isCodeEditor } from '../../editor/browser/editorBrowser.js';
import { coalesce } from '../../base/common/arrays.js';
import { assertIsDefined } from '../../base/common/types.js';
import { INotificationService, NotificationsFilter, } from '../../platform/notification/common/notification.js';
import { IThemeService } from '../../platform/theme/common/themeService.js';
import { WINDOW_ACTIVE_BORDER, WINDOW_INACTIVE_BORDER } from '../common/theme.js';
import { URI } from '../../base/common/uri.js';
import { IViewDescriptorService } from '../common/views.js';
import { DiffEditorInput } from '../common/editor/diffEditorInput.js';
import { mark } from '../../base/common/performance.js';
import { IExtensionService } from '../services/extensions/common/extensions.js';
import { ILogService } from '../../platform/log/common/log.js';
import { DeferredPromise, Promises } from '../../base/common/async.js';
import { IBannerService } from '../services/banner/browser/bannerService.js';
import { IPaneCompositePartService } from '../services/panecomposite/browser/panecomposite.js';
import { AuxiliaryBarPart } from './parts/auxiliarybar/auxiliaryBarPart.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { IAuxiliaryWindowService } from '../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { mainWindow } from '../../base/browser/window.js';
var LayoutClasses;
(function (LayoutClasses) {
    LayoutClasses["SIDEBAR_HIDDEN"] = "nosidebar";
    LayoutClasses["MAIN_EDITOR_AREA_HIDDEN"] = "nomaineditorarea";
    LayoutClasses["PANEL_HIDDEN"] = "nopanel";
    LayoutClasses["AUXILIARYBAR_HIDDEN"] = "noauxiliarybar";
    LayoutClasses["STATUSBAR_HIDDEN"] = "nostatusbar";
    LayoutClasses["FULLSCREEN"] = "fullscreen";
    LayoutClasses["MAXIMIZED"] = "maximized";
    LayoutClasses["WINDOW_BORDER"] = "border";
})(LayoutClasses || (LayoutClasses = {}));
const COMMAND_CENTER_SETTINGS = [
    'chat.commandCenter.enabled',
    'workbench.navigationControl.enabled',
    'workbench.experimental.share.enabled',
];
export const TITLE_BAR_SETTINGS = [
    "workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */,
    "window.commandCenter" /* LayoutSettings.COMMAND_CENTER */,
    ...COMMAND_CENTER_SETTINGS,
    "workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */,
    "workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */,
    'window.menuBarVisibility',
    "window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */,
    "window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */,
];
const DEFAULT_WINDOW_DIMENSIONS = new Dimension(DEFAULT_WINDOW_SIZE.width, DEFAULT_WINDOW_SIZE.height);
export class Layout extends Disposable {
    get activeContainer() {
        return this.getContainerFromDocument(getActiveDocument());
    }
    get containers() {
        const containers = [];
        for (const { window } of getWindows()) {
            containers.push(this.getContainerFromDocument(window.document));
        }
        return containers;
    }
    getContainerFromDocument(targetDocument) {
        if (targetDocument === this.mainContainer.ownerDocument) {
            // main window
            return this.mainContainer;
        }
        else {
            // auxiliary window
            return targetDocument.body.getElementsByClassName('monaco-workbench')[0];
        }
    }
    whenContainerStylesLoaded(window) {
        return this.containerStylesLoaded.get(window.vscodeWindowId);
    }
    get mainContainerDimension() {
        return this._mainContainerDimension;
    }
    get activeContainerDimension() {
        return this.getContainerDimension(this.activeContainer);
    }
    getContainerDimension(container) {
        if (container === this.mainContainer) {
            return this.mainContainerDimension; // main window
        }
        else {
            return getClientArea(container); // auxiliary window
        }
    }
    get mainContainerOffset() {
        return this.computeContainerOffset(mainWindow);
    }
    get activeContainerOffset() {
        return this.computeContainerOffset(getWindow(this.activeContainer));
    }
    computeContainerOffset(targetWindow) {
        let top = 0;
        let quickPickTop = 0;
        if (this.isVisible("workbench.parts.banner" /* Parts.BANNER_PART */)) {
            top = this.getPart("workbench.parts.banner" /* Parts.BANNER_PART */).maximumHeight;
            quickPickTop = top;
        }
        const titlebarVisible = this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow);
        if (titlebarVisible) {
            top += this.getPart("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */).maximumHeight;
            quickPickTop = top;
        }
        const isCommandCenterVisible = titlebarVisible &&
            this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) !== false;
        if (isCommandCenterVisible) {
            // If the command center is visible then the quickinput
            // should go over the title bar and the banner
            quickPickTop = 6;
        }
        return { top, quickPickTop };
    }
    constructor(parent) {
        super();
        this.parent = parent;
        //#region Events
        this._onDidChangeZenMode = this._register(new Emitter());
        this.onDidChangeZenMode = this._onDidChangeZenMode.event;
        this._onDidChangeMainEditorCenteredLayout = this._register(new Emitter());
        this.onDidChangeMainEditorCenteredLayout = this._onDidChangeMainEditorCenteredLayout.event;
        this._onDidChangePanelAlignment = this._register(new Emitter());
        this.onDidChangePanelAlignment = this._onDidChangePanelAlignment.event;
        this._onDidChangeWindowMaximized = this._register(new Emitter());
        this.onDidChangeWindowMaximized = this._onDidChangeWindowMaximized.event;
        this._onDidChangePanelPosition = this._register(new Emitter());
        this.onDidChangePanelPosition = this._onDidChangePanelPosition.event;
        this._onDidChangePartVisibility = this._register(new Emitter());
        this.onDidChangePartVisibility = this._onDidChangePartVisibility.event;
        this._onDidChangeNotificationsVisibility = this._register(new Emitter());
        this.onDidChangeNotificationsVisibility = this._onDidChangeNotificationsVisibility.event;
        this._onDidLayoutMainContainer = this._register(new Emitter());
        this.onDidLayoutMainContainer = this._onDidLayoutMainContainer.event;
        this._onDidLayoutActiveContainer = this._register(new Emitter());
        this.onDidLayoutActiveContainer = this._onDidLayoutActiveContainer.event;
        this._onDidLayoutContainer = this._register(new Emitter());
        this.onDidLayoutContainer = this._onDidLayoutContainer.event;
        this._onDidAddContainer = this._register(new Emitter());
        this.onDidAddContainer = this._onDidAddContainer.event;
        this._onDidChangeActiveContainer = this._register(new Emitter());
        this.onDidChangeActiveContainer = this._onDidChangeActiveContainer.event;
        //#endregion
        //#region Properties
        this.mainContainer = document.createElement('div');
        this.containerStylesLoaded = new Map();
        //#endregion
        this.parts = new Map();
        this.initialized = false;
        this.disposed = false;
        this._openedDefaultEditors = false;
        this.whenReadyPromise = new DeferredPromise();
        this.whenReady = this.whenReadyPromise.p;
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this.restored = false;
    }
    initLayout(accessor) {
        // Services
        this.environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
        this.configurationService = accessor.get(IConfigurationService);
        this.hostService = accessor.get(IHostService);
        this.contextService = accessor.get(IWorkspaceContextService);
        this.storageService = accessor.get(IStorageService);
        this.workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        this.themeService = accessor.get(IThemeService);
        this.extensionService = accessor.get(IExtensionService);
        this.logService = accessor.get(ILogService);
        this.telemetryService = accessor.get(ITelemetryService);
        this.auxiliaryWindowService = accessor.get(IAuxiliaryWindowService);
        // Parts
        this.editorService = accessor.get(IEditorService);
        this.mainPartEditorService = this.editorService.createScoped('main', this._store);
        this.editorGroupService = accessor.get(IEditorGroupsService);
        this.paneCompositeService = accessor.get(IPaneCompositePartService);
        this.viewDescriptorService = accessor.get(IViewDescriptorService);
        this.titleService = accessor.get(ITitleService);
        this.notificationService = accessor.get(INotificationService);
        this.statusBarService = accessor.get(IStatusbarService);
        accessor.get(IBannerService);
        // Listeners
        this.registerLayoutListeners();
        // State
        this.initLayoutState(accessor.get(ILifecycleService), accessor.get(IFileService));
    }
    registerLayoutListeners() {
        // Restore editor if hidden
        const showEditorIfHidden = () => {
            if (!this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow)) {
                this.toggleMaximizedPanel();
            }
        };
        // Wait to register these listeners after the editor group service
        // is ready to avoid conflicts on startup
        this.editorGroupService.whenRestored.then(() => {
            // Restore main editor part on any editor change in main part
            this._register(this.mainPartEditorService.onDidVisibleEditorsChange(showEditorIfHidden));
            this._register(this.editorGroupService.mainPart.onDidActivateGroup(showEditorIfHidden));
            // Revalidate center layout when active editor changes: diff editor quits centered mode.
            this._register(this.mainPartEditorService.onDidActiveEditorChange(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        });
        // Configuration changes
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if ([
                ...TITLE_BAR_SETTINGS,
                LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION,
                LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE,
            ].some((setting) => e.affectsConfiguration(setting))) {
                // Show Command Center if command center actions enabled
                const shareEnabled = e.affectsConfiguration('workbench.experimental.share.enabled') &&
                    this.configurationService.getValue('workbench.experimental.share.enabled');
                const navigationControlEnabled = e.affectsConfiguration('workbench.navigationControl.enabled') &&
                    this.configurationService.getValue('workbench.navigationControl.enabled');
                // Currently not supported for "chat.commandCenter.enabled" as we
                // programatically set this during setup and could lead to unwanted titlebar appearing
                // const chatControlsEnabled = e.affectsConfiguration('chat.commandCenter.enabled') && this.configurationService.getValue<boolean>('chat.commandCenter.enabled');
                if (shareEnabled || navigationControlEnabled) {
                    if (this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) === false) {
                        this.configurationService.updateValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */, true);
                        return; // onDidChangeConfiguration will be triggered again
                    }
                }
                // Show Custom TitleBar if actions enabled in (or moved to) the titlebar
                const editorActionsMovedToTitlebar = e.affectsConfiguration("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */) &&
                    this.configurationService.getValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */) === "titleBar" /* EditorActionsLocation.TITLEBAR */;
                const commandCenterEnabled = e.affectsConfiguration("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) &&
                    this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */);
                const layoutControlsEnabled = e.affectsConfiguration("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */) &&
                    this.configurationService.getValue("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */);
                const activityBarMovedToTopOrBottom = e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) &&
                    ["top" /* ActivityBarPosition.TOP */, "bottom" /* ActivityBarPosition.BOTTOM */].includes(this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */));
                if (activityBarMovedToTopOrBottom ||
                    editorActionsMovedToTitlebar ||
                    commandCenterEnabled ||
                    layoutControlsEnabled) {
                    if (this.configurationService.getValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */) === "never" /* CustomTitleBarVisibility.NEVER */) {
                        this.configurationService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
                        return; // onDidChangeConfiguration will be triggered again
                    }
                }
                this.doUpdateLayoutConfiguration();
            }
        }));
        // Fullscreen changes
        this._register(onDidChangeFullscreen((windowId) => this.onFullscreenChanged(windowId)));
        // Group changes
        this._register(this.editorGroupService.mainPart.onDidAddGroup(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        this._register(this.editorGroupService.mainPart.onDidRemoveGroup(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        this._register(this.editorGroupService.mainPart.onDidChangeGroupMaximized(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED))));
        // Prevent workbench from scrolling #55456
        this._register(addDisposableListener(this.mainContainer, EventType.SCROLL, () => (this.mainContainer.scrollTop = 0)));
        // Menubar visibility changes
        const showingCustomMenu = (isWindows || isLinux || isWeb) && !hasNativeTitlebar(this.configurationService);
        if (showingCustomMenu) {
            this._register(this.titleService.onMenubarVisibilityChange((visible) => this.onMenubarToggled(visible)));
        }
        // Theme changes
        this._register(this.themeService.onDidColorThemeChange(() => this.updateWindowsBorder()));
        // Window active / focus changes
        this._register(this.hostService.onDidChangeFocus((focused) => this.onWindowFocusChanged(focused)));
        this._register(this.hostService.onDidChangeActiveWindow(() => this.onActiveWindowChanged()));
        // WCO changes
        if (isWeb && typeof navigator.windowControlsOverlay === 'object') {
            this._register(addDisposableListener(navigator.windowControlsOverlay, 'geometrychange', () => this.onDidChangeWCO()));
        }
        // Auxiliary windows
        this._register(this.auxiliaryWindowService.onDidOpenAuxiliaryWindow(({ window, disposables }) => {
            const windowId = window.window.vscodeWindowId;
            this.containerStylesLoaded.set(windowId, window.whenStylesHaveLoaded);
            window.whenStylesHaveLoaded.then(() => this.containerStylesLoaded.delete(windowId));
            disposables.add(toDisposable(() => this.containerStylesLoaded.delete(windowId)));
            const eventDisposables = disposables.add(new DisposableStore());
            this._onDidAddContainer.fire({ container: window.container, disposables: eventDisposables });
            disposables.add(window.onDidLayout((dimension) => this.handleContainerDidLayout(window.container, dimension)));
        }));
    }
    onMenubarToggled(visible) {
        if (visible !== this.state.runtime.menuBar.toggled) {
            this.state.runtime.menuBar.toggled = visible;
            const menuBarVisibility = getMenuBarVisibility(this.configurationService);
            // The menu bar toggles the title bar in web because it does not need to be shown for window controls only
            if (isWeb && menuBarVisibility === 'toggle') {
                this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            }
            // The menu bar toggles the title bar in full screen for toggle and classic settings
            else if (this.state.runtime.mainWindowFullscreen &&
                (menuBarVisibility === 'toggle' || menuBarVisibility === 'classic')) {
                this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            }
            // Move layout call to any time the menubar
            // is toggled to update consumers of offset
            // see issue #115267
            this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
        }
    }
    handleContainerDidLayout(container, dimension) {
        if (container === this.mainContainer) {
            this._onDidLayoutMainContainer.fire(dimension);
        }
        if (isActiveDocument(container)) {
            this._onDidLayoutActiveContainer.fire(dimension);
        }
        this._onDidLayoutContainer.fire({ container, dimension });
    }
    onFullscreenChanged(windowId) {
        if (windowId !== mainWindow.vscodeWindowId) {
            return; // ignore all but main window
        }
        this.state.runtime.mainWindowFullscreen = isFullscreen(mainWindow);
        // Apply as CSS class
        if (this.state.runtime.mainWindowFullscreen) {
            this.mainContainer.classList.add(LayoutClasses.FULLSCREEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.FULLSCREEN);
            const zenModeExitInfo = this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO);
            if (zenModeExitInfo.transitionedToFullScreen && this.isZenModeActive()) {
                this.toggleZenMode();
            }
        }
        // Change edge snapping accordingly
        this.workbenchGrid.edgeSnapping = this.state.runtime.mainWindowFullscreen;
        // Changing fullscreen state of the main window has an impact
        // on custom title bar visibility, so we need to update
        if (hasCustomTitlebar(this.configurationService)) {
            // Propagate to grid
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
            this.updateWindowsBorder(true);
        }
    }
    onActiveWindowChanged() {
        const activeContainerId = this.getActiveContainerId();
        if (this.state.runtime.activeContainerId !== activeContainerId) {
            this.state.runtime.activeContainerId = activeContainerId;
            // Indicate active window border
            this.updateWindowsBorder();
            this._onDidChangeActiveContainer.fire();
        }
    }
    onWindowFocusChanged(hasFocus) {
        if (this.state.runtime.hasFocus !== hasFocus) {
            this.state.runtime.hasFocus = hasFocus;
            this.updateWindowsBorder();
        }
    }
    getActiveContainerId() {
        const activeContainer = this.activeContainer;
        return getWindow(activeContainer).vscodeWindowId;
    }
    doUpdateLayoutConfiguration(skipLayout) {
        // Custom Titlebar visibility with native titlebar
        this.updateCustomTitleBarVisibility();
        // Menubar visibility
        this.updateMenubarVisibility(!!skipLayout);
        // Centered Layout
        this.editorGroupService.whenRestored.then(() => this.centerMainEditorLayout(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED), skipLayout));
    }
    setSideBarPosition(position) {
        const activityBar = this.getPart("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
        const sideBar = this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const auxiliaryBar = this.getPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const newPositionValue = position === 0 /* Position.LEFT */ ? 'left' : 'right';
        const oldPositionValue = position === 1 /* Position.RIGHT */ ? 'left' : 'right';
        const panelAlignment = this.getPanelAlignment();
        const panelPosition = this.getPanelPosition();
        this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON, position);
        // Adjust CSS
        const activityBarContainer = assertIsDefined(activityBar.getContainer());
        const sideBarContainer = assertIsDefined(sideBar.getContainer());
        const auxiliaryBarContainer = assertIsDefined(auxiliaryBar.getContainer());
        activityBarContainer.classList.remove(oldPositionValue);
        sideBarContainer.classList.remove(oldPositionValue);
        activityBarContainer.classList.add(newPositionValue);
        sideBarContainer.classList.add(newPositionValue);
        // Auxiliary Bar has opposite values
        auxiliaryBarContainer.classList.remove(newPositionValue);
        auxiliaryBarContainer.classList.add(oldPositionValue);
        // Update Styles
        activityBar.updateStyles();
        sideBar.updateStyles();
        auxiliaryBar.updateStyles();
        // Move activity bar and side bars
        this.adjustPartPositions(position, panelAlignment, panelPosition);
    }
    updateWindowsBorder(skipLayout = false) {
        if (isWeb ||
            isWindows || // not working well with zooming (border often not visible)
            ((isWindows || isLinux) && useWindowControlsOverlay(this.configurationService)) || // Windows/Linux: not working with WCO (border cannot draw over the overlay)
            hasNativeTitlebar(this.configurationService)) {
            return;
        }
        const theme = this.themeService.getColorTheme();
        const activeBorder = theme.getColor(WINDOW_ACTIVE_BORDER);
        const inactiveBorder = theme.getColor(WINDOW_INACTIVE_BORDER);
        const didHaveMainWindowBorder = this.hasMainWindowBorder();
        for (const container of this.containers) {
            const isMainContainer = container === this.mainContainer;
            const isActiveContainer = this.activeContainer === container;
            let windowBorder = false;
            if (!this.state.runtime.mainWindowFullscreen && (activeBorder || inactiveBorder)) {
                windowBorder = true;
                // If the inactive color is missing, fallback to the active one
                const borderColor = isActiveContainer && this.state.runtime.hasFocus
                    ? activeBorder
                    : (inactiveBorder ?? activeBorder);
                container.style.setProperty('--window-border-color', borderColor?.toString() ?? 'transparent');
            }
            if (isMainContainer) {
                this.state.runtime.mainWindowBorder = windowBorder;
            }
            container.classList.toggle(LayoutClasses.WINDOW_BORDER, windowBorder);
        }
        if (!skipLayout && didHaveMainWindowBorder !== this.hasMainWindowBorder()) {
            this.layout();
        }
    }
    initLayoutState(lifecycleService, fileService) {
        this._mainContainerDimension = getClientArea(this.parent, DEFAULT_WINDOW_DIMENSIONS); // running with fallback to ensure no error is thrown (https://github.com/microsoft/vscode/issues/240242)
        this.stateModel = new LayoutStateModel(this.storageService, this.configurationService, this.contextService);
        this.stateModel.load(this._mainContainerDimension);
        // Both editor and panel should not be hidden on startup
        if (this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN) &&
            this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN)) {
            this.stateModel.setRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN, false);
        }
        this._register(this.stateModel.onDidChangeState((change) => {
            if (change.key === LayoutStateKeys.ACTIVITYBAR_HIDDEN) {
                this.setActivityBarHidden(change.value);
            }
            if (change.key === LayoutStateKeys.STATUSBAR_HIDDEN) {
                this.setStatusBarHidden(change.value);
            }
            if (change.key === LayoutStateKeys.SIDEBAR_POSITON) {
                this.setSideBarPosition(change.value);
            }
            if (change.key === LayoutStateKeys.PANEL_POSITION) {
                this.setPanelPosition(change.value);
            }
            if (change.key === LayoutStateKeys.PANEL_ALIGNMENT) {
                this.setPanelAlignment(change.value);
            }
            this.doUpdateLayoutConfiguration();
        }));
        // Layout Initialization State
        const initialEditorsState = this.getInitialEditorsState();
        if (initialEditorsState) {
            this.logService.trace('Initial editor state', initialEditorsState);
        }
        const initialLayoutState = {
            layout: {
                editors: initialEditorsState?.layout,
            },
            editor: {
                restoreEditors: this.shouldRestoreEditors(this.contextService, initialEditorsState),
                editorsToOpen: this.resolveEditorsToOpen(fileService, initialEditorsState),
            },
            views: {
                defaults: this.getDefaultLayoutViews(this.environmentService, this.storageService),
                containerToRestore: {},
            },
        };
        // Layout Runtime State
        const layoutRuntimeState = {
            activeContainerId: this.getActiveContainerId(),
            mainWindowFullscreen: isFullscreen(mainWindow),
            hasFocus: this.hostService.hasFocus,
            maximized: new Set(),
            mainWindowBorder: false,
            menuBar: {
                toggled: false,
            },
            zenMode: {
                transitionDisposables: new DisposableMap(),
            },
        };
        this.state = {
            initialization: initialLayoutState,
            runtime: layoutRuntimeState,
        };
        // Sidebar View Container To Restore
        if (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            // Only restore last viewlet if window was reloaded or we are in development mode
            let viewContainerToRestore;
            if (!this.environmentService.isBuilt ||
                lifecycleService.startupKind === 3 /* StartupKind.ReloadedWindow */ ||
                (this.environmentService.isExtensionDevelopment &&
                    !this.environmentService.extensionTestsLocationURI)) {
                viewContainerToRestore = this.storageService.get(SidebarPart.activeViewletSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id);
            }
            else {
                viewContainerToRestore = this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id;
            }
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.sideBar = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, true);
            }
        }
        // Panel View Container To Restore
        if (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            const viewContainerToRestore = this.storageService.get(PanelPart.activePanelSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(1 /* ViewContainerLocation.Panel */)?.id);
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.panel = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_HIDDEN, true);
            }
        }
        // Auxiliary View to restore
        if (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            const viewContainerToRestore = this.storageService.get(AuxiliaryBarPart.activeViewSettingsKey, 1 /* StorageScope.WORKSPACE */, this.viewDescriptorService.getDefaultViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */)?.id);
            if (viewContainerToRestore) {
                this.state.initialization.views.containerToRestore.auxiliaryBar = viewContainerToRestore;
            }
            else {
                this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN, true);
            }
        }
        // Window border
        this.updateWindowsBorder(true);
    }
    getDefaultLayoutViews(environmentService, storageService) {
        const defaultLayout = environmentService.options?.defaultLayout;
        if (!defaultLayout) {
            return undefined;
        }
        if (!defaultLayout.force && !storageService.isNew(1 /* StorageScope.WORKSPACE */)) {
            return undefined;
        }
        const { views } = defaultLayout;
        if (views?.length) {
            return views.map((view) => view.id);
        }
        return undefined;
    }
    shouldRestoreEditors(contextService, initialEditorsState) {
        // Restore editors based on a set of rules:
        // - never when running on temporary workspace
        // - not when we have files to open, unless:
        // - always when `window.restoreWindows: preserve`
        if (isTemporaryWorkspace(contextService.getWorkspace())) {
            return false;
        }
        const forceRestoreEditors = this.configurationService.getValue('window.restoreWindows') === 'preserve';
        return !!forceRestoreEditors || initialEditorsState === undefined;
    }
    willRestoreEditors() {
        return this.state.initialization.editor.restoreEditors;
    }
    async resolveEditorsToOpen(fileService, initialEditorsState) {
        if (initialEditorsState) {
            // Merge editor (single)
            const filesToMerge = coalesce(await pathsToEditors(initialEditorsState.filesToMerge, fileService, this.logService));
            if (filesToMerge.length === 4 &&
                isResourceEditorInput(filesToMerge[0]) &&
                isResourceEditorInput(filesToMerge[1]) &&
                isResourceEditorInput(filesToMerge[2]) &&
                isResourceEditorInput(filesToMerge[3])) {
                return [
                    {
                        editor: {
                            input1: { resource: filesToMerge[0].resource },
                            input2: { resource: filesToMerge[1].resource },
                            base: { resource: filesToMerge[2].resource },
                            result: { resource: filesToMerge[3].resource },
                            options: { pinned: true },
                        },
                    },
                ];
            }
            // Diff editor (single)
            const filesToDiff = coalesce(await pathsToEditors(initialEditorsState.filesToDiff, fileService, this.logService));
            if (filesToDiff.length === 2) {
                return [
                    {
                        editor: {
                            original: { resource: filesToDiff[0].resource },
                            modified: { resource: filesToDiff[1].resource },
                            options: { pinned: true },
                        },
                    },
                ];
            }
            // Normal editor (multiple)
            const filesToOpenOrCreate = [];
            const resolvedFilesToOpenOrCreate = await pathsToEditors(initialEditorsState.filesToOpenOrCreate, fileService, this.logService);
            for (let i = 0; i < resolvedFilesToOpenOrCreate.length; i++) {
                const resolvedFileToOpenOrCreate = resolvedFilesToOpenOrCreate[i];
                if (resolvedFileToOpenOrCreate) {
                    filesToOpenOrCreate.push({
                        editor: resolvedFileToOpenOrCreate,
                        viewColumn: initialEditorsState.filesToOpenOrCreate?.[i].viewColumn, // take over `viewColumn` from initial state
                    });
                }
            }
            return filesToOpenOrCreate;
        }
        // Empty workbench configured to open untitled file if empty
        else if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ &&
            this.configurationService.getValue('workbench.startupEditor') === 'newUntitledFile') {
            if (this.editorGroupService.hasRestorableState) {
                return []; // do not open any empty untitled file if we restored groups/editors from previous session
            }
            const hasBackups = await this.workingCopyBackupService.hasBackups();
            if (hasBackups) {
                return []; // do not open any empty untitled file if we have backups to restore
            }
            return [
                {
                    editor: { resource: undefined }, // open empty untitled file
                },
            ];
        }
        return [];
    }
    get openedDefaultEditors() {
        return this._openedDefaultEditors;
    }
    getInitialEditorsState() {
        // Check for editors / editor layout from `defaultLayout` options first
        const defaultLayout = this.environmentService.options?.defaultLayout;
        if ((defaultLayout?.editors?.length || defaultLayout?.layout?.editors) &&
            (defaultLayout.force || this.storageService.isNew(1 /* StorageScope.WORKSPACE */))) {
            this._openedDefaultEditors = true;
            return {
                layout: defaultLayout.layout?.editors,
                filesToOpenOrCreate: defaultLayout?.editors?.map((editor) => {
                    return {
                        viewColumn: editor.viewColumn,
                        fileUri: URI.revive(editor.uri),
                        openOnlyIfExists: editor.openOnlyIfExists,
                        options: editor.options,
                    };
                }),
            };
        }
        // Then check for files to open, create or diff/merge from main side
        const { filesToOpenOrCreate, filesToDiff, filesToMerge } = this.environmentService;
        if (filesToOpenOrCreate || filesToDiff || filesToMerge) {
            return { filesToOpenOrCreate, filesToDiff, filesToMerge };
        }
        return undefined;
    }
    isRestored() {
        return this.restored;
    }
    restoreParts() {
        // distinguish long running restore operations that
        // are required for the layout to be ready from those
        // that are needed to signal restoring is done
        const layoutReadyPromises = [];
        const layoutRestoredPromises = [];
        // Restore editors
        layoutReadyPromises.push((async () => {
            mark('code/willRestoreEditors');
            // first ensure the editor part is ready
            await this.editorGroupService.whenReady;
            mark('code/restoreEditors/editorGroupsReady');
            // apply editor layout if any
            if (this.state.initialization.layout?.editors) {
                this.editorGroupService.mainPart.applyLayout(this.state.initialization.layout.editors);
            }
            // then see for editors to open as instructed
            // it is important that we trigger this from
            // the overall restore flow to reduce possible
            // flicker on startup: we want any editor to
            // open to get a chance to open first before
            // signaling that layout is restored, but we do
            // not need to await the editors from having
            // fully loaded.
            const editors = await this.state.initialization.editor.editorsToOpen;
            mark('code/restoreEditors/editorsToOpenResolved');
            let openEditorsPromise = undefined;
            if (editors.length) {
                // we have to map editors to their groups as instructed
                // by the input. this is important to ensure that we open
                // the editors in the groups they belong to.
                const editorGroupsInVisualOrder = this.editorGroupService.mainPart.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
                const mapEditorsToGroup = new Map();
                for (const editor of editors) {
                    const group = editorGroupsInVisualOrder[(editor.viewColumn ?? 1) - 1]; // viewColumn is index+1 based
                    let editorsByGroup = mapEditorsToGroup.get(group.id);
                    if (!editorsByGroup) {
                        editorsByGroup = new Set();
                        mapEditorsToGroup.set(group.id, editorsByGroup);
                    }
                    editorsByGroup.add(editor.editor);
                }
                openEditorsPromise = Promise.all(Array.from(mapEditorsToGroup).map(async ([groupId, editors]) => {
                    try {
                        await this.editorService.openEditors(Array.from(editors), groupId, {
                            validateTrust: true,
                        });
                    }
                    catch (error) {
                        this.logService.error(error);
                    }
                }));
            }
            // do not block the overall layout ready flow from potentially
            // slow editors to resolve on startup
            layoutRestoredPromises.push(Promise.all([
                openEditorsPromise?.finally(() => mark('code/restoreEditors/editorsOpened')),
                this.editorGroupService.whenRestored.finally(() => mark('code/restoreEditors/editorGroupsRestored')),
            ]).finally(() => {
                // the `code/didRestoreEditors` perf mark is specifically
                // for when visible editors have resolved, so we only mark
                // if when editor group service has restored.
                mark('code/didRestoreEditors');
            }));
        })());
        // Restore default views (only when `IDefaultLayout` is provided)
        const restoreDefaultViewsPromise = (async () => {
            if (this.state.initialization.views.defaults?.length) {
                mark('code/willOpenDefaultViews');
                const locationsRestored = [];
                const tryOpenView = (view) => {
                    const location = this.viewDescriptorService.getViewLocationById(view.id);
                    if (location !== null) {
                        const container = this.viewDescriptorService.getViewContainerByViewId(view.id);
                        if (container) {
                            if (view.order >= (locationsRestored?.[location]?.order ?? 0)) {
                                locationsRestored[location] = { id: container.id, order: view.order };
                            }
                            const containerModel = this.viewDescriptorService.getViewContainerModel(container);
                            containerModel.setCollapsed(view.id, false);
                            containerModel.setVisible(view.id, true);
                            return true;
                        }
                    }
                    return false;
                };
                const defaultViews = [...this.state.initialization.views.defaults]
                    .reverse()
                    .map((v, index) => ({ id: v, order: index }));
                let i = defaultViews.length;
                while (i) {
                    i--;
                    if (tryOpenView(defaultViews[i])) {
                        defaultViews.splice(i, 1);
                    }
                }
                // If we still have views left over, wait until all extensions have been registered and try again
                if (defaultViews.length) {
                    await this.extensionService.whenInstalledExtensionsRegistered();
                    let i = defaultViews.length;
                    while (i) {
                        i--;
                        if (tryOpenView(defaultViews[i])) {
                            defaultViews.splice(i, 1);
                        }
                    }
                }
                // If we opened a view in the sidebar, stop any restore there
                if (locationsRestored[0 /* ViewContainerLocation.Sidebar */]) {
                    this.state.initialization.views.containerToRestore.sideBar =
                        locationsRestored[0 /* ViewContainerLocation.Sidebar */].id;
                }
                // If we opened a view in the panel, stop any restore there
                if (locationsRestored[1 /* ViewContainerLocation.Panel */]) {
                    this.state.initialization.views.containerToRestore.panel =
                        locationsRestored[1 /* ViewContainerLocation.Panel */].id;
                }
                // If we opened a view in the auxiliary bar, stop any restore there
                if (locationsRestored[2 /* ViewContainerLocation.AuxiliaryBar */]) {
                    this.state.initialization.views.containerToRestore.auxiliaryBar =
                        locationsRestored[2 /* ViewContainerLocation.AuxiliaryBar */].id;
                }
                mark('code/didOpenDefaultViews');
            }
        })();
        layoutReadyPromises.push(restoreDefaultViewsPromise);
        // Restore Sidebar
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that sidebar already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.sideBar) {
                return;
            }
            mark('code/willRestoreViewlet');
            const viewlet = await this.paneCompositeService.openPaneComposite(this.state.initialization.views.containerToRestore.sideBar, 0 /* ViewContainerLocation.Sidebar */);
            if (!viewlet) {
                await this.paneCompositeService.openPaneComposite(this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id, 0 /* ViewContainerLocation.Sidebar */); // fallback to default viewlet as needed
            }
            mark('code/didRestoreViewlet');
        })());
        // Restore Panel
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that panel already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.panel) {
                return;
            }
            mark('code/willRestorePanel');
            const panel = await this.paneCompositeService.openPaneComposite(this.state.initialization.views.containerToRestore.panel, 1 /* ViewContainerLocation.Panel */);
            if (!panel) {
                await this.paneCompositeService.openPaneComposite(this.viewDescriptorService.getDefaultViewContainer(1 /* ViewContainerLocation.Panel */)?.id, 1 /* ViewContainerLocation.Panel */); // fallback to default panel as needed
            }
            mark('code/didRestorePanel');
        })());
        // Restore Auxiliary Bar
        layoutReadyPromises.push((async () => {
            // Restoring views could mean that auxbar already
            // restored, as such we need to test again
            await restoreDefaultViewsPromise;
            if (!this.state.initialization.views.containerToRestore.auxiliaryBar) {
                return;
            }
            mark('code/willRestoreAuxiliaryBar');
            const viewlet = await this.paneCompositeService.openPaneComposite(this.state.initialization.views.containerToRestore.auxiliaryBar, 2 /* ViewContainerLocation.AuxiliaryBar */);
            if (!viewlet) {
                await this.paneCompositeService.openPaneComposite(this.viewDescriptorService.getDefaultViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */)
                    ?.id, 2 /* ViewContainerLocation.AuxiliaryBar */); // fallback to default viewlet as needed
            }
            mark('code/didRestoreAuxiliaryBar');
        })());
        // Restore Zen Mode
        const zenModeWasActive = this.isZenModeActive();
        const restoreZenMode = getZenModeConfiguration(this.configurationService).restore;
        if (zenModeWasActive) {
            this.setZenModeActive(!restoreZenMode);
            this.toggleZenMode(false, true);
        }
        // Restore Main Editor Center Mode
        if (this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED)) {
            this.centerMainEditorLayout(true, true);
        }
        // Await for promises that we recorded to update
        // our ready and restored states properly.
        Promises.settled(layoutReadyPromises).finally(() => {
            this.whenReadyPromise.complete();
            Promises.settled(layoutRestoredPromises).finally(() => {
                this.restored = true;
                this.whenRestoredPromise.complete();
            });
        });
    }
    registerPart(part) {
        const id = part.getId();
        this.parts.set(id, part);
        return toDisposable(() => this.parts.delete(id));
    }
    getPart(key) {
        const part = this.parts.get(key);
        if (!part) {
            throw new Error(`Unknown part ${key}`);
        }
        return part;
    }
    registerNotifications(delegate) {
        this._register(delegate.onDidChangeNotificationsVisibility((visible) => this._onDidChangeNotificationsVisibility.fire(visible)));
    }
    hasFocus(part) {
        const container = this.getContainer(getActiveWindow(), part);
        if (!container) {
            return false;
        }
        const activeElement = getActiveElement();
        if (!activeElement) {
            return false;
        }
        return isAncestorUsingFlowTo(activeElement, container);
    }
    _getFocusedPart() {
        for (const part of this.parts.keys()) {
            if (this.hasFocus(part)) {
                return part;
            }
        }
        return undefined;
    }
    focusPart(part, targetWindow = mainWindow) {
        const container = this.getContainer(targetWindow, part) ?? this.mainContainer;
        switch (part) {
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                this.editorGroupService.getPart(container).activeGroup.focus();
                break;
            case "workbench.parts.panel" /* Parts.PANEL_PART */: {
                this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)?.focus();
                break;
            }
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */: {
                this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)?.focus();
                break;
            }
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */: {
                this.paneCompositeService
                    .getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)
                    ?.focus();
                break;
            }
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                ;
                this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */).focusActivityBar();
                break;
            case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                this.statusBarService.getPart(container).focus();
                break;
            default: {
                container?.focus();
            }
        }
    }
    getContainer(targetWindow, part) {
        if (typeof part === 'undefined') {
            return this.getContainerFromDocument(targetWindow.document);
        }
        if (targetWindow === mainWindow) {
            return this.getPart(part).getContainer();
        }
        // Only some parts are supported for auxiliary windows
        let partCandidate;
        if (part === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            partCandidate = this.editorGroupService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        else if (part === "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */) {
            partCandidate = this.statusBarService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        else if (part === "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */) {
            partCandidate = this.titleService.getPart(this.getContainerFromDocument(targetWindow.document));
        }
        if (partCandidate instanceof Part) {
            return partCandidate.getContainer();
        }
        return undefined;
    }
    isVisible(part, targetWindow = mainWindow) {
        if (targetWindow !== mainWindow && part === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            return true; // cannot hide editor part in auxiliary windows
        }
        if (this.initialized) {
            switch (part) {
                case "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */:
                    return this.workbenchGrid.isViewVisible(this.titleBarPartView);
                case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                    return !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN);
                case "workbench.parts.panel" /* Parts.PANEL_PART */:
                    return !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN);
                case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                    return !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN);
                case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                    return !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN);
                case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                    return !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN);
                case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                    return !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN);
                case "workbench.parts.banner" /* Parts.BANNER_PART */:
                    return this.workbenchGrid.isViewVisible(this.bannerPartView);
                default:
                    return false; // any other part cannot be hidden
            }
        }
        switch (part) {
            case "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */:
                return shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN);
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN);
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN);
            case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN);
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN);
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                return !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN);
            default:
                return false; // any other part cannot be hidden
        }
    }
    shouldShowBannerFirst() {
        return isWeb && !isWCOEnabled();
    }
    focus() {
        if (this.isPanelMaximized() && this.mainContainer === this.activeContainer) {
            this.focusPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        else {
            this.focusPart("workbench.parts.editor" /* Parts.EDITOR_PART */, getWindow(this.activeContainer));
        }
    }
    focusPanelOrEditor() {
        const activePanel = this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if ((this.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */) || !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */)) && activePanel) {
            activePanel.focus(); // prefer panel if it has focus or editor is hidden
        }
        else {
            this.focus(); // otherwise focus editor
        }
    }
    getMaximumEditorDimensions(container) {
        const targetWindow = getWindow(container);
        const containerDimension = this.getContainerDimension(container);
        if (container === this.mainContainer) {
            const isPanelHorizontal = isHorizontal(this.getPanelPosition());
            const takenWidth = (this.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */) ? this.activityBarPartView.minimumWidth : 0) +
                (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? this.sideBarPartView.minimumWidth : 0) +
                (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && !isPanelHorizontal
                    ? this.panelPartView.minimumWidth
                    : 0) +
                (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? this.auxiliaryBarPartView.minimumWidth : 0);
            const takenHeight = (this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow)
                ? this.titleBarPartView.minimumHeight
                : 0) +
                (this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, targetWindow)
                    ? this.statusBarPartView.minimumHeight
                    : 0) +
                (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && isPanelHorizontal
                    ? this.panelPartView.minimumHeight
                    : 0);
            const availableWidth = containerDimension.width - takenWidth;
            const availableHeight = containerDimension.height - takenHeight;
            return { width: availableWidth, height: availableHeight };
        }
        else {
            const takenHeight = (this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, targetWindow)
                ? this.titleBarPartView.minimumHeight
                : 0) +
                (this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, targetWindow)
                    ? this.statusBarPartView.minimumHeight
                    : 0);
            return { width: containerDimension.width, height: containerDimension.height - takenHeight };
        }
    }
    isZenModeActive() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
    }
    setZenModeActive(active) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE, active);
    }
    toggleZenMode(skipLayout, restoring = false) {
        const focusedPartPreTransition = this._getFocusedPart();
        this.setZenModeActive(!this.isZenModeActive());
        this.state.runtime.zenMode.transitionDisposables.clearAndDisposeAll();
        const setLineNumbers = (lineNumbers) => {
            for (const editor of this.mainPartEditorService.visibleTextEditorControls) {
                // To properly reset line numbers we need to read the configuration for each editor respecting it's uri.
                if (!lineNumbers && isCodeEditor(editor) && editor.hasModel()) {
                    const model = editor.getModel();
                    lineNumbers = this.configurationService.getValue('editor.lineNumbers', {
                        resource: model.uri,
                        overrideIdentifier: model.getLanguageId(),
                    });
                }
                if (!lineNumbers) {
                    lineNumbers = this.configurationService.getValue('editor.lineNumbers');
                }
                editor.updateOptions({ lineNumbers });
            }
        };
        // Check if zen mode transitioned to full screen and if now we are out of zen mode
        // -> we need to go out of full screen (same goes for the centered editor layout)
        let toggleMainWindowFullScreen = false;
        const config = getZenModeConfiguration(this.configurationService);
        const zenModeExitInfo = this.stateModel.getRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO);
        // Zen Mode Active
        if (this.isZenModeActive()) {
            toggleMainWindowFullScreen =
                !this.state.runtime.mainWindowFullscreen && config.fullScreen && !isIOS;
            if (!restoring) {
                zenModeExitInfo.transitionedToFullScreen = toggleMainWindowFullScreen;
                zenModeExitInfo.transitionedToCenteredEditorLayout =
                    !this.isMainEditorLayoutCentered() && config.centerLayout;
                zenModeExitInfo.handleNotificationsDoNotDisturbMode =
                    this.notificationService.getFilter() === NotificationsFilter.OFF;
                zenModeExitInfo.wasVisible.sideBar = this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
                zenModeExitInfo.wasVisible.panel = this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */);
                zenModeExitInfo.wasVisible.auxiliaryBar = this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
                this.stateModel.setRuntimeValue(LayoutStateKeys.ZEN_MODE_EXIT_INFO, zenModeExitInfo);
            }
            this.setPanelHidden(true, true);
            this.setAuxiliaryBarHidden(true, true);
            this.setSideBarHidden(true, true);
            if (config.hideActivityBar) {
                this.setActivityBarHidden(true, true);
            }
            if (config.hideStatusBar) {
                this.setStatusBarHidden(true, true);
            }
            if (config.hideLineNumbers) {
                setLineNumbers('off');
                this.state.runtime.zenMode.transitionDisposables.set("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */, this.mainPartEditorService.onDidVisibleEditorsChange(() => setLineNumbers('off')));
            }
            if (config.showTabs !== this.editorGroupService.partOptions.showTabs) {
                this.state.runtime.zenMode.transitionDisposables.set("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, this.editorGroupService.mainPart.enforcePartOptions({ showTabs: config.showTabs }));
            }
            if (config.silentNotifications && zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                this.notificationService.setFilter(NotificationsFilter.ERROR);
            }
            if (config.centerLayout) {
                this.centerMainEditorLayout(true, true);
            }
            // Zen Mode Configuration Changes
            this.state.runtime.zenMode.transitionDisposables.set('configurationChange', this.configurationService.onDidChangeConfiguration((e) => {
                // Activity Bar
                if (e.affectsConfiguration("zenMode.hideActivityBar" /* ZenModeSettings.HIDE_ACTIVITYBAR */)) {
                    const zenModeHideActivityBar = this.configurationService.getValue("zenMode.hideActivityBar" /* ZenModeSettings.HIDE_ACTIVITYBAR */);
                    this.setActivityBarHidden(zenModeHideActivityBar, true);
                }
                // Status Bar
                if (e.affectsConfiguration("zenMode.hideStatusBar" /* ZenModeSettings.HIDE_STATUSBAR */)) {
                    const zenModeHideStatusBar = this.configurationService.getValue("zenMode.hideStatusBar" /* ZenModeSettings.HIDE_STATUSBAR */);
                    this.setStatusBarHidden(zenModeHideStatusBar, true);
                }
                // Center Layout
                if (e.affectsConfiguration("zenMode.centerLayout" /* ZenModeSettings.CENTER_LAYOUT */)) {
                    const zenModeCenterLayout = this.configurationService.getValue("zenMode.centerLayout" /* ZenModeSettings.CENTER_LAYOUT */);
                    this.centerMainEditorLayout(zenModeCenterLayout, true);
                }
                // Show Tabs
                if (e.affectsConfiguration("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */)) {
                    const zenModeShowTabs = this.configurationService.getValue("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */) ?? 'multiple';
                    this.state.runtime.zenMode.transitionDisposables.set("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, this.editorGroupService.mainPart.enforcePartOptions({ showTabs: zenModeShowTabs }));
                }
                // Notifications
                if (e.affectsConfiguration("zenMode.silentNotifications" /* ZenModeSettings.SILENT_NOTIFICATIONS */)) {
                    const zenModeSilentNotifications = !!this.configurationService.getValue("zenMode.silentNotifications" /* ZenModeSettings.SILENT_NOTIFICATIONS */);
                    if (zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                        this.notificationService.setFilter(zenModeSilentNotifications ? NotificationsFilter.ERROR : NotificationsFilter.OFF);
                    }
                }
                // Center Layout
                if (e.affectsConfiguration("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */)) {
                    const lineNumbersType = this.configurationService.getValue("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */)
                        ? 'off'
                        : undefined;
                    setLineNumbers(lineNumbersType);
                    this.state.runtime.zenMode.transitionDisposables.set("zenMode.hideLineNumbers" /* ZenModeSettings.HIDE_LINENUMBERS */, this.mainPartEditorService.onDidVisibleEditorsChange(() => setLineNumbers(lineNumbersType)));
                }
            }));
        }
        // Zen Mode Inactive
        else {
            if (zenModeExitInfo.wasVisible.panel) {
                this.setPanelHidden(false, true);
            }
            if (zenModeExitInfo.wasVisible.auxiliaryBar) {
                this.setAuxiliaryBarHidden(false, true);
            }
            if (zenModeExitInfo.wasVisible.sideBar) {
                this.setSideBarHidden(false, true);
            }
            if (!this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN, true)) {
                this.setActivityBarHidden(false, true);
            }
            if (!this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN, true)) {
                this.setStatusBarHidden(false, true);
            }
            if (zenModeExitInfo.transitionedToCenteredEditorLayout) {
                this.centerMainEditorLayout(false, true);
            }
            if (zenModeExitInfo.handleNotificationsDoNotDisturbMode) {
                this.notificationService.setFilter(NotificationsFilter.OFF);
            }
            setLineNumbers();
            toggleMainWindowFullScreen =
                zenModeExitInfo.transitionedToFullScreen && this.state.runtime.mainWindowFullscreen;
        }
        if (!skipLayout) {
            this.layout();
        }
        if (toggleMainWindowFullScreen) {
            this.hostService.toggleFullScreen(mainWindow);
        }
        // restore focus if part is still visible, otherwise fallback to editor
        if (focusedPartPreTransition &&
            this.isVisible(focusedPartPreTransition, getWindow(this.activeContainer))) {
            if (isMultiWindowPart(focusedPartPreTransition)) {
                this.focusPart(focusedPartPreTransition, getWindow(this.activeContainer));
            }
            else {
                this.focusPart(focusedPartPreTransition);
            }
        }
        else {
            this.focus();
        }
        // Event
        this._onDidChangeZenMode.fire(this.isZenModeActive());
    }
    setStatusBarHidden(hidden, skipLayout) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.STATUSBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.STATUSBAR_HIDDEN);
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.statusBarPartView, !hidden);
    }
    createWorkbenchLayout() {
        const titleBar = this.getPart("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */);
        const bannerPart = this.getPart("workbench.parts.banner" /* Parts.BANNER_PART */);
        const editorPart = this.getPart("workbench.parts.editor" /* Parts.EDITOR_PART */);
        const activityBar = this.getPart("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
        const panelPart = this.getPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        const auxiliaryBarPart = this.getPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const sideBar = this.getPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const statusBar = this.getPart("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */);
        // View references for all parts
        this.titleBarPartView = titleBar;
        this.bannerPartView = bannerPart;
        this.sideBarPartView = sideBar;
        this.activityBarPartView = activityBar;
        this.editorPartView = editorPart;
        this.panelPartView = panelPart;
        this.auxiliaryBarPartView = auxiliaryBarPart;
        this.statusBarPartView = statusBar;
        const viewMap = {
            ["workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */]: this.activityBarPartView,
            ["workbench.parts.banner" /* Parts.BANNER_PART */]: this.bannerPartView,
            ["workbench.parts.titlebar" /* Parts.TITLEBAR_PART */]: this.titleBarPartView,
            ["workbench.parts.editor" /* Parts.EDITOR_PART */]: this.editorPartView,
            ["workbench.parts.panel" /* Parts.PANEL_PART */]: this.panelPartView,
            ["workbench.parts.sidebar" /* Parts.SIDEBAR_PART */]: this.sideBarPartView,
            ["workbench.parts.statusbar" /* Parts.STATUSBAR_PART */]: this.statusBarPartView,
            ["workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */]: this.auxiliaryBarPartView,
        };
        const fromJSON = ({ type }) => viewMap[type];
        const workbenchGrid = SerializableGrid.deserialize(this.createGridDescriptor(), { fromJSON }, { proportionalLayout: false });
        this.mainContainer.prepend(workbenchGrid.element);
        this.mainContainer.setAttribute('role', 'application');
        this.workbenchGrid = workbenchGrid;
        this.workbenchGrid.edgeSnapping = this.state.runtime.mainWindowFullscreen;
        for (const part of [
            titleBar,
            editorPart,
            activityBar,
            panelPart,
            sideBar,
            statusBar,
            auxiliaryBarPart,
            bannerPart,
        ]) {
            this._register(part.onDidVisibilityChange((visible) => {
                if (part === sideBar) {
                    this.setSideBarHidden(!visible, true);
                }
                else if (part === panelPart) {
                    this.setPanelHidden(!visible, true);
                }
                else if (part === auxiliaryBarPart) {
                    this.setAuxiliaryBarHidden(!visible, true);
                }
                else if (part === editorPart) {
                    this.setEditorHidden(!visible, true);
                }
                this._onDidChangePartVisibility.fire();
                this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
            }));
        }
        this._register(this.storageService.onWillSaveState((e) => {
            // Side Bar Size
            const sideBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.sideBarPartView)
                : this.workbenchGrid.getViewSize(this.sideBarPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.SIDEBAR_SIZE, sideBarSize);
            // Panel Size
            const panelSize = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView)
                : isHorizontal(this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION))
                    ? this.workbenchGrid.getViewSize(this.panelPartView).height
                    : this.workbenchGrid.getViewSize(this.panelPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.PANEL_SIZE, panelSize);
            // Auxiliary Bar Size
            const auxiliaryBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN)
                ? this.workbenchGrid.getViewCachedVisibleSize(this.auxiliaryBarPartView)
                : this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).width;
            this.stateModel.setInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE, auxiliaryBarSize);
            this.stateModel.save(true, true);
        }));
    }
    layout() {
        if (!this.disposed) {
            this._mainContainerDimension = getClientArea(this.state.runtime.mainWindowFullscreen
                ? mainWindow.document.body // in fullscreen mode, make sure to use <body> element because
                : this.parent, // in that case the workbench will span the entire site
            DEFAULT_WINDOW_DIMENSIONS);
            this.logService.trace(`Layout#layout, height: ${this._mainContainerDimension.height}, width: ${this._mainContainerDimension.width}`);
            position(this.mainContainer, 0, 0, 0, 0, 'relative');
            size(this.mainContainer, this._mainContainerDimension.width, this._mainContainerDimension.height);
            // Layout the grid widget
            this.workbenchGrid.layout(this._mainContainerDimension.width, this._mainContainerDimension.height);
            this.initialized = true;
            // Emit as event
            this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);
        }
    }
    isMainEditorLayoutCentered() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED);
    }
    centerMainEditorLayout(active, skipLayout) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED, active);
        const mainVisibleEditors = coalesce(this.editorGroupService.mainPart.groups.map((group) => group.activeEditor));
        const isEditorComplex = mainVisibleEditors.some((editor) => {
            if (editor instanceof DiffEditorInput) {
                return this.configurationService.getValue('diffEditor.renderSideBySide');
            }
            if (editor?.hasCapability(256 /* EditorInputCapabilities.MultipleEditors */)) {
                return true;
            }
            return false;
        });
        const layout = this.editorGroupService.getLayout();
        let hasMoreThanOneColumn = false;
        if (layout.orientation === 0 /* GroupOrientation.HORIZONTAL */) {
            hasMoreThanOneColumn = layout.groups.length > 1;
        }
        else {
            hasMoreThanOneColumn = layout.groups.some((group) => group.groups && group.groups.length > 1);
        }
        const isCenteredLayoutAutoResizing = this.configurationService.getValue('workbench.editor.centeredLayoutAutoResize');
        if (isCenteredLayoutAutoResizing &&
            ((hasMoreThanOneColumn && !this.editorGroupService.mainPart.hasMaximizedGroup()) ||
                isEditorComplex)) {
            active = false; // disable centered layout for complex editors or when there is more than one group
        }
        if (this.editorGroupService.mainPart.isLayoutCentered() !== active) {
            this.editorGroupService.mainPart.centerLayout(active);
            if (!skipLayout) {
                this.layout();
            }
        }
        this._onDidChangeMainEditorCenteredLayout.fire(this.stateModel.getRuntimeValue(LayoutStateKeys.MAIN_EDITOR_CENTERED));
    }
    getSize(part) {
        return this.workbenchGrid.getViewSize(this.getPart(part));
    }
    setSize(part, size) {
        this.workbenchGrid.resizeView(this.getPart(part), size);
    }
    resizePart(part, sizeChangeWidth, sizeChangeHeight) {
        const sizeChangePxWidth = Math.sign(sizeChangeWidth) *
            computeScreenAwareSize(getActiveWindow(), Math.abs(sizeChangeWidth));
        const sizeChangePxHeight = Math.sign(sizeChangeHeight) *
            computeScreenAwareSize(getActiveWindow(), Math.abs(sizeChangeHeight));
        let viewSize;
        switch (part) {
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.sideBarPartView);
                this.workbenchGrid.resizeView(this.sideBarPartView, {
                    width: viewSize.width + sizeChangePxWidth,
                    height: viewSize.height,
                });
                break;
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.panelPartView);
                this.workbenchGrid.resizeView(this.panelPartView, {
                    width: viewSize.width + (isHorizontal(this.getPanelPosition()) ? 0 : sizeChangePxWidth),
                    height: viewSize.height + (isHorizontal(this.getPanelPosition()) ? sizeChangePxHeight : 0),
                });
                break;
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView);
                this.workbenchGrid.resizeView(this.auxiliaryBarPartView, {
                    width: viewSize.width + sizeChangePxWidth,
                    height: viewSize.height,
                });
                break;
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                viewSize = this.workbenchGrid.getViewSize(this.editorPartView);
                // Single Editor Group
                if (this.editorGroupService.mainPart.count === 1) {
                    this.workbenchGrid.resizeView(this.editorPartView, {
                        width: viewSize.width + sizeChangePxWidth,
                        height: viewSize.height + sizeChangePxHeight,
                    });
                }
                else {
                    const activeGroup = this.editorGroupService.mainPart.activeGroup;
                    const { width, height } = this.editorGroupService.mainPart.getSize(activeGroup);
                    this.editorGroupService.mainPart.setSize(activeGroup, {
                        width: width + sizeChangePxWidth,
                        height: height + sizeChangePxHeight,
                    });
                    // After resizing the editor group
                    // if it does not change in either direction
                    // try resizing the full editor part
                    const { width: newWidth, height: newHeight } = this.editorGroupService.mainPart.getSize(activeGroup);
                    if ((sizeChangePxHeight && height === newHeight) ||
                        (sizeChangePxWidth && width === newWidth)) {
                        this.workbenchGrid.resizeView(this.editorPartView, {
                            width: viewSize.width + (sizeChangePxWidth && width === newWidth ? sizeChangePxWidth : 0),
                            height: viewSize.height +
                                (sizeChangePxHeight && height === newHeight ? sizeChangePxHeight : 0),
                        });
                    }
                }
                break;
            default:
                return; // Cannot resize other parts
        }
    }
    setActivityBarHidden(hidden, skipLayout) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN, hidden);
        this.workbenchGrid.setViewVisible(this.activityBarPartView, !hidden);
    }
    setBannerHidden(hidden) {
        this.workbenchGrid.setViewVisible(this.bannerPartView, !hidden);
    }
    setEditorHidden(hidden, skipLayout) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.MAIN_EDITOR_AREA_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.MAIN_EDITOR_AREA_HIDDEN);
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.editorPartView, !hidden);
        // The editor and panel cannot be hidden at the same time
        if (hidden && !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            this.setPanelHidden(false, true);
        }
    }
    getLayoutClasses() {
        return coalesce([
            !this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? LayoutClasses.SIDEBAR_HIDDEN : undefined,
            !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow)
                ? LayoutClasses.MAIN_EDITOR_AREA_HIDDEN
                : undefined,
            !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) ? LayoutClasses.PANEL_HIDDEN : undefined,
            !this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? LayoutClasses.AUXILIARYBAR_HIDDEN : undefined,
            !this.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */) ? LayoutClasses.STATUSBAR_HIDDEN : undefined,
            this.state.runtime.mainWindowFullscreen ? LayoutClasses.FULLSCREEN : undefined,
        ]);
    }
    setSideBarHidden(hidden, skipLayout) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.SIDEBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.SIDEBAR_HIDDEN);
        }
        // If sidebar becomes hidden, also hide the current active Viewlet if any
        if (hidden && this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)) {
            this.paneCompositeService.hideActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
            this.focusPanelOrEditor();
        }
        // If sidebar becomes visible, show last active Viewlet or default viewlet
        else if (!hidden &&
            !this.paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */)) {
            const viewletToOpen = this.paneCompositeService.getLastActivePaneCompositeId(0 /* ViewContainerLocation.Sidebar */);
            if (viewletToOpen) {
                const viewlet = this.paneCompositeService.openPaneComposite(viewletToOpen, 0 /* ViewContainerLocation.Sidebar */, true);
                if (!viewlet) {
                    this.paneCompositeService.openPaneComposite(this.viewDescriptorService.getDefaultViewContainer(0 /* ViewContainerLocation.Sidebar */)?.id, 0 /* ViewContainerLocation.Sidebar */, true);
                }
            }
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.sideBarPartView, !hidden);
    }
    hasViews(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        if (!viewContainer) {
            return false;
        }
        const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
        if (!viewContainerModel) {
            return false;
        }
        return viewContainerModel.activeViewDescriptors.length >= 1;
    }
    adjustPartPositions(sideBarPosition, panelAlignment, panelPosition) {
        // Move activity bar and side bars
        const isPanelVertical = !isHorizontal(panelPosition);
        const sideBarSiblingToEditor = isPanelVertical ||
            !(panelAlignment === 'center' ||
                (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'right') ||
                (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'left'));
        const auxiliaryBarSiblingToEditor = isPanelVertical ||
            !(panelAlignment === 'center' ||
                (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'right') ||
                (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'left'));
        const preMovePanelWidth = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)
            ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView) ??
                this.panelPartView.minimumWidth)
            : this.workbenchGrid.getViewSize(this.panelPartView).width;
        const preMovePanelHeight = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)
            ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.panelPartView) ??
                this.panelPartView.minimumHeight)
            : this.workbenchGrid.getViewSize(this.panelPartView).height;
        const preMoveSideBarSize = !this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)
            ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.sideBarPartView) ??
                this.sideBarPartView.minimumWidth)
            : this.workbenchGrid.getViewSize(this.sideBarPartView).width;
        const preMoveAuxiliaryBarSize = !this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)
            ? Sizing.Invisible(this.workbenchGrid.getViewCachedVisibleSize(this.auxiliaryBarPartView) ??
                this.auxiliaryBarPartView.minimumWidth)
            : this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).width;
        const focusedPart = ["workbench.parts.panel" /* Parts.PANEL_PART */, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */].find((part) => this.hasFocus(part));
        if (sideBarPosition === 0 /* Position.LEFT */) {
            this.workbenchGrid.moveViewTo(this.activityBarPartView, [2, 0]);
            this.workbenchGrid.moveView(this.sideBarPartView, preMoveSideBarSize, sideBarSiblingToEditor ? this.editorPartView : this.activityBarPartView, sideBarSiblingToEditor ? 2 /* Direction.Left */ : 3 /* Direction.Right */);
            if (auxiliaryBarSiblingToEditor) {
                this.workbenchGrid.moveView(this.auxiliaryBarPartView, preMoveAuxiliaryBarSize, this.editorPartView, 3 /* Direction.Right */);
            }
            else {
                this.workbenchGrid.moveViewTo(this.auxiliaryBarPartView, [2, -1]);
            }
        }
        else {
            this.workbenchGrid.moveViewTo(this.activityBarPartView, [2, -1]);
            this.workbenchGrid.moveView(this.sideBarPartView, preMoveSideBarSize, sideBarSiblingToEditor ? this.editorPartView : this.activityBarPartView, sideBarSiblingToEditor ? 3 /* Direction.Right */ : 2 /* Direction.Left */);
            if (auxiliaryBarSiblingToEditor) {
                this.workbenchGrid.moveView(this.auxiliaryBarPartView, preMoveAuxiliaryBarSize, this.editorPartView, 2 /* Direction.Left */);
            }
            else {
                this.workbenchGrid.moveViewTo(this.auxiliaryBarPartView, [2, 0]);
            }
        }
        // Maintain focus after moving parts
        if (focusedPart) {
            this.focusPart(focusedPart);
        }
        // We moved all the side parts based on the editor and ignored the panel
        // Now, we need to put the panel back in the right position when it is next to the editor
        if (isPanelVertical) {
            this.workbenchGrid.moveView(this.panelPartView, preMovePanelWidth, this.editorPartView, panelPosition === 0 /* Position.LEFT */ ? 2 /* Direction.Left */ : 3 /* Direction.Right */);
            this.workbenchGrid.resizeView(this.panelPartView, {
                height: preMovePanelHeight,
                width: preMovePanelWidth,
            });
        }
        // Moving views in the grid can cause them to re-distribute sizing unnecessarily
        // Resize visible parts to the width they were before the operation
        if (this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            this.workbenchGrid.resizeView(this.sideBarPartView, {
                height: this.workbenchGrid.getViewSize(this.sideBarPartView).height,
                width: preMoveSideBarSize,
            });
        }
        if (this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            this.workbenchGrid.resizeView(this.auxiliaryBarPartView, {
                height: this.workbenchGrid.getViewSize(this.auxiliaryBarPartView).height,
                width: preMoveAuxiliaryBarSize,
            });
        }
    }
    setPanelAlignment(alignment, skipLayout) {
        // Panel alignment only applies to a panel in the top/bottom position
        if (!isHorizontal(this.getPanelPosition())) {
            this.setPanelPosition(2 /* Position.BOTTOM */);
        }
        // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
        if (alignment !== 'center' && this.isPanelMaximized()) {
            this.toggleMaximizedPanel();
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT, alignment);
        this.adjustPartPositions(this.getSideBarPosition(), alignment, this.getPanelPosition());
        this._onDidChangePanelAlignment.fire(alignment);
    }
    setPanelHidden(hidden, skipLayout) {
        // Return if not initialized fully #105480
        if (!this.workbenchGrid) {
            return;
        }
        const wasHidden = !this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */);
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_HIDDEN, hidden);
        const isPanelMaximized = this.isPanelMaximized();
        const panelOpensMaximized = this.panelOpensMaximized();
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.PANEL_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.PANEL_HIDDEN);
        }
        // If panel part becomes hidden, also hide the current active panel if any
        let focusEditor = false;
        if (hidden && this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)) {
            this.paneCompositeService.hideActivePaneComposite(1 /* ViewContainerLocation.Panel */);
            focusEditor = isIOS ? false : true; // Do not auto focus on ios #127832
        }
        // If panel part becomes visible, show last active panel or default panel
        else if (!hidden &&
            !this.paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)) {
            let panelToOpen = this.paneCompositeService.getLastActivePaneCompositeId(1 /* ViewContainerLocation.Panel */);
            // verify that the panel we try to open has views before we default to it
            // otherwise fall back to any view that has views still refs #111463
            if (!panelToOpen || !this.hasViews(panelToOpen)) {
                panelToOpen = this.viewDescriptorService
                    .getViewContainersByLocation(1 /* ViewContainerLocation.Panel */)
                    .find((viewContainer) => this.hasViews(viewContainer.id))?.id;
            }
            if (panelToOpen) {
                const focus = !skipLayout;
                const panel = this.paneCompositeService.openPaneComposite(panelToOpen, 1 /* ViewContainerLocation.Panel */, focus);
                if (!panel) {
                    this.paneCompositeService.openPaneComposite(this.viewDescriptorService.getDefaultViewContainer(1 /* ViewContainerLocation.Panel */)?.id, 1 /* ViewContainerLocation.Panel */, focus);
                }
            }
        }
        // If maximized and in process of hiding, unmaximize before hiding to allow caching of non-maximized size
        if (hidden && isPanelMaximized) {
            this.toggleMaximizedPanel();
        }
        // Don't proceed if we have already done this before
        if (wasHidden === hidden) {
            return;
        }
        // Propagate layout changes to grid
        this.workbenchGrid.setViewVisible(this.panelPartView, !hidden);
        // If in process of showing, toggle whether or not panel is maximized
        if (!hidden) {
            if (!skipLayout && isPanelMaximized !== panelOpensMaximized) {
                this.toggleMaximizedPanel();
            }
        }
        else {
            // If in process of hiding, remember whether the panel is maximized or not
            this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED, isPanelMaximized);
        }
        if (focusEditor) {
            this.editorGroupService.mainPart.activeGroup.focus(); // Pass focus to editor group if panel part is now hidden
        }
    }
    toggleMaximizedPanel() {
        const size = this.workbenchGrid.getViewSize(this.panelPartView);
        const panelPosition = this.getPanelPosition();
        const isMaximized = this.isPanelMaximized();
        if (!isMaximized) {
            if (this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
                if (isHorizontal(panelPosition)) {
                    this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT, size.height);
                }
                else {
                    this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH, size.width);
                }
            }
            this.setEditorHidden(true);
        }
        else {
            this.setEditorHidden(false);
            this.workbenchGrid.resizeView(this.panelPartView, {
                width: isHorizontal(panelPosition)
                    ? size.width
                    : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH),
                height: isHorizontal(panelPosition)
                    ? this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT)
                    : size.height,
            });
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED, !isMaximized);
    }
    panelOpensMaximized() {
        // The workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
        if (this.getPanelAlignment() !== 'center' && isHorizontal(this.getPanelPosition())) {
            return false;
        }
        const panelOpensMaximized = panelOpensMaximizedFromString(this.configurationService.getValue(WorkbenchLayoutSettings.PANEL_OPENS_MAXIMIZED));
        const panelLastIsMaximized = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_WAS_LAST_MAXIMIZED);
        return (panelOpensMaximized === 0 /* PanelOpensMaximizedOptions.ALWAYS */ ||
            (panelOpensMaximized === 2 /* PanelOpensMaximizedOptions.REMEMBER_LAST */ && panelLastIsMaximized));
    }
    setAuxiliaryBarHidden(hidden, skipLayout) {
        this.stateModel.setRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN, hidden);
        // Adjust CSS
        if (hidden) {
            this.mainContainer.classList.add(LayoutClasses.AUXILIARYBAR_HIDDEN);
        }
        else {
            this.mainContainer.classList.remove(LayoutClasses.AUXILIARYBAR_HIDDEN);
        }
        // If auxiliary bar becomes hidden, also hide the current active pane composite if any
        if (hidden &&
            this.paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)) {
            this.paneCompositeService.hideActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
            this.focusPanelOrEditor();
        }
        // If auxiliary bar becomes visible, show last active pane composite or default pane composite
        else if (!hidden &&
            !this.paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */)) {
            let viewletToOpen = this.paneCompositeService.getLastActivePaneCompositeId(2 /* ViewContainerLocation.AuxiliaryBar */);
            // verify that the viewlet we try to open has views before we default to it
            // otherwise fall back to any view that has views still refs #111463
            if (!viewletToOpen || !this.hasViews(viewletToOpen)) {
                viewletToOpen = this.viewDescriptorService
                    .getViewContainersByLocation(2 /* ViewContainerLocation.AuxiliaryBar */)
                    .find((viewContainer) => this.hasViews(viewContainer.id))?.id;
            }
            if (viewletToOpen) {
                const focus = !skipLayout;
                const viewlet = this.paneCompositeService.openPaneComposite(viewletToOpen, 2 /* ViewContainerLocation.AuxiliaryBar */, focus);
                if (!viewlet) {
                    this.paneCompositeService.openPaneComposite(this.viewDescriptorService.getDefaultViewContainer(2 /* ViewContainerLocation.AuxiliaryBar */)
                        ?.id, 2 /* ViewContainerLocation.AuxiliaryBar */, focus);
                }
            }
        }
        // Propagate to grid
        this.workbenchGrid.setViewVisible(this.auxiliaryBarPartView, !hidden);
    }
    setPartHidden(hidden, part, targetWindow = mainWindow) {
        switch (part) {
            case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                return this.setActivityBarHidden(hidden);
            case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                return this.setSideBarHidden(hidden);
            case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                return this.setEditorHidden(hidden);
            case "workbench.parts.banner" /* Parts.BANNER_PART */:
                return this.setBannerHidden(hidden);
            case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                return this.setAuxiliaryBarHidden(hidden);
            case "workbench.parts.panel" /* Parts.PANEL_PART */:
                return this.setPanelHidden(hidden);
        }
    }
    hasMainWindowBorder() {
        return this.state.runtime.mainWindowBorder;
    }
    getMainWindowBorderRadius() {
        return this.state.runtime.mainWindowBorder && isMacintosh ? '10px' : undefined;
    }
    isPanelMaximized() {
        // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
        return ((this.getPanelAlignment() === 'center' || !isHorizontal(this.getPanelPosition())) &&
            !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow));
    }
    getSideBarPosition() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
    }
    getPanelAlignment() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT);
    }
    updateMenubarVisibility(skipLayout) {
        const shouldShowTitleBar = shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
        if (!skipLayout &&
            this.workbenchGrid &&
            shouldShowTitleBar !== this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)) {
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowTitleBar);
        }
    }
    updateCustomTitleBarVisibility() {
        const shouldShowTitleBar = shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled);
        const titlebarVisible = this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */);
        if (shouldShowTitleBar !== titlebarVisible) {
            this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowTitleBar);
        }
    }
    toggleMenuBar() {
        let currentVisibilityValue = getMenuBarVisibility(this.configurationService);
        if (typeof currentVisibilityValue !== 'string') {
            currentVisibilityValue = 'classic';
        }
        let newVisibilityValue;
        if (currentVisibilityValue === 'visible' || currentVisibilityValue === 'classic') {
            newVisibilityValue = hasNativeTitlebar(this.configurationService) ? 'toggle' : 'compact';
        }
        else {
            newVisibilityValue = 'classic';
        }
        this.configurationService.updateValue('window.menuBarVisibility', newVisibilityValue);
    }
    getPanelPosition() {
        return this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION);
    }
    setPanelPosition(position) {
        if (!this.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            this.setPanelHidden(false);
        }
        const panelPart = this.getPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        const oldPositionValue = positionToString(this.getPanelPosition());
        const newPositionValue = positionToString(position);
        // Adjust CSS
        const panelContainer = assertIsDefined(panelPart.getContainer());
        panelContainer.classList.remove(oldPositionValue);
        panelContainer.classList.add(newPositionValue);
        // Update Styles
        panelPart.updateStyles();
        // Layout
        const size = this.workbenchGrid.getViewSize(this.panelPartView);
        const sideBarSize = this.workbenchGrid.getViewSize(this.sideBarPartView);
        const auxiliaryBarSize = this.workbenchGrid.getViewSize(this.auxiliaryBarPartView);
        let editorHidden = !this.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow);
        // Save last non-maximized size for panel before move
        if (newPositionValue !== oldPositionValue && !editorHidden) {
            // Save the current size of the panel for the new orthogonal direction
            // If moving down, save the width of the panel
            // Otherwise, save the height of the panel
            if (isHorizontal(position)) {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH, size.width);
            }
            else if (isHorizontal(positionFromString(oldPositionValue))) {
                this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT, size.height);
            }
        }
        if (isHorizontal(position) && this.getPanelAlignment() !== 'center' && editorHidden) {
            this.toggleMaximizedPanel();
            editorHidden = false;
        }
        this.stateModel.setRuntimeValue(LayoutStateKeys.PANEL_POSITION, position);
        const sideBarVisible = this.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const auxiliaryBarVisible = this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        const hadFocus = this.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
        if (position === 2 /* Position.BOTTOM */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden
                ? size.height
                : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT), this.editorPartView, 1 /* Direction.Down */);
        }
        else if (position === 3 /* Position.TOP */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden
                ? size.height
                : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_HEIGHT), this.editorPartView, 0 /* Direction.Up */);
        }
        else if (position === 1 /* Position.RIGHT */) {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden
                ? size.width
                : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH), this.editorPartView, 3 /* Direction.Right */);
        }
        else {
            this.workbenchGrid.moveView(this.panelPartView, editorHidden
                ? size.width
                : this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_LAST_NON_MAXIMIZED_WIDTH), this.editorPartView, 2 /* Direction.Left */);
        }
        if (hadFocus) {
            this.focusPart("workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        // Reset sidebar to original size before shifting the panel
        this.workbenchGrid.resizeView(this.sideBarPartView, sideBarSize);
        if (!sideBarVisible) {
            this.setSideBarHidden(true);
        }
        this.workbenchGrid.resizeView(this.auxiliaryBarPartView, auxiliaryBarSize);
        if (!auxiliaryBarVisible) {
            this.setAuxiliaryBarHidden(true);
        }
        if (isHorizontal(position)) {
            this.adjustPartPositions(this.getSideBarPosition(), this.getPanelAlignment(), position);
        }
        this._onDidChangePanelPosition.fire(newPositionValue);
    }
    isWindowMaximized(targetWindow) {
        return this.state.runtime.maximized.has(getWindowId(targetWindow));
    }
    updateWindowMaximizedState(targetWindow, maximized) {
        this.mainContainer.classList.toggle(LayoutClasses.MAXIMIZED, maximized);
        const targetWindowId = getWindowId(targetWindow);
        if (maximized === this.state.runtime.maximized.has(targetWindowId)) {
            return;
        }
        if (maximized) {
            this.state.runtime.maximized.add(targetWindowId);
        }
        else {
            this.state.runtime.maximized.delete(targetWindowId);
        }
        this.updateWindowsBorder();
        this._onDidChangeWindowMaximized.fire({ windowId: targetWindowId, maximized });
    }
    getVisibleNeighborPart(part, direction) {
        if (!this.workbenchGrid) {
            return undefined;
        }
        if (!this.isVisible(part, mainWindow)) {
            return undefined;
        }
        const neighborViews = this.workbenchGrid.getNeighborViews(this.getPart(part), direction, false);
        if (!neighborViews) {
            return undefined;
        }
        for (const neighborView of neighborViews) {
            const neighborPart = [
                "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */,
                "workbench.parts.editor" /* Parts.EDITOR_PART */,
                "workbench.parts.panel" /* Parts.PANEL_PART */,
                "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */,
                "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */,
                "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */,
                "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */,
            ].find((partId) => this.getPart(partId) === neighborView && this.isVisible(partId, mainWindow));
            if (neighborPart !== undefined) {
                return neighborPart;
            }
        }
        return undefined;
    }
    onDidChangeWCO() {
        const bannerFirst = this.workbenchGrid.getNeighborViews(this.titleBarPartView, 0 /* Direction.Up */, false).length > 0;
        const shouldBannerBeFirst = this.shouldShowBannerFirst();
        if (bannerFirst !== shouldBannerBeFirst) {
            this.workbenchGrid.moveView(this.bannerPartView, Sizing.Distribute, this.titleBarPartView, shouldBannerBeFirst ? 0 /* Direction.Up */ : 1 /* Direction.Down */);
        }
        this.workbenchGrid.setViewVisible(this.titleBarPartView, shouldShowCustomTitleBar(this.configurationService, mainWindow, this.state.runtime.menuBar.toggled));
    }
    arrangeEditorNodes(nodes, availableHeight, availableWidth) {
        if (!nodes.sideBar && !nodes.auxiliaryBar) {
            nodes.editor.size = availableHeight;
            return nodes.editor;
        }
        const result = [nodes.editor];
        nodes.editor.size = availableWidth;
        if (nodes.sideBar) {
            if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === 0 /* Position.LEFT */) {
                result.splice(0, 0, nodes.sideBar);
            }
            else {
                result.push(nodes.sideBar);
            }
            nodes.editor.size -= this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN)
                ? 0
                : nodes.sideBar.size;
        }
        if (nodes.auxiliaryBar) {
            if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === 1 /* Position.RIGHT */) {
                result.splice(0, 0, nodes.auxiliaryBar);
            }
            else {
                result.push(nodes.auxiliaryBar);
            }
            nodes.editor.size -= this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN)
                ? 0
                : nodes.auxiliaryBar.size;
        }
        return {
            type: 'branch',
            data: result,
            size: availableHeight,
        };
    }
    arrangeMiddleSectionNodes(nodes, availableWidth, availableHeight) {
        const activityBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN)
            ? 0
            : nodes.activityBar.size;
        const sideBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN)
            ? 0
            : nodes.sideBar.size;
        const auxiliaryBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN)
            ? 0
            : nodes.auxiliaryBar.size;
        const panelSize = this.stateModel.getInitializationValue(LayoutStateKeys.PANEL_SIZE)
            ? 0
            : nodes.panel.size;
        const panelPostion = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION);
        const sideBarPosition = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
        const result = [];
        if (!isHorizontal(panelPostion)) {
            result.push(nodes.editor);
            nodes.editor.size =
                availableWidth - activityBarSize - sideBarSize - panelSize - auxiliaryBarSize;
            if (panelPostion === 1 /* Position.RIGHT */) {
                result.push(nodes.panel);
            }
            else {
                result.splice(0, 0, nodes.panel);
            }
            if (sideBarPosition === 0 /* Position.LEFT */) {
                result.push(nodes.auxiliaryBar);
                result.splice(0, 0, nodes.sideBar);
                result.splice(0, 0, nodes.activityBar);
            }
            else {
                result.splice(0, 0, nodes.auxiliaryBar);
                result.push(nodes.sideBar);
                result.push(nodes.activityBar);
            }
        }
        else {
            const panelAlignment = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT);
            const sideBarNextToEditor = !(panelAlignment === 'center' ||
                (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'right') ||
                (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'left'));
            const auxiliaryBarNextToEditor = !(panelAlignment === 'center' ||
                (sideBarPosition === 1 /* Position.RIGHT */ && panelAlignment === 'right') ||
                (sideBarPosition === 0 /* Position.LEFT */ && panelAlignment === 'left'));
            const editorSectionWidth = availableWidth -
                activityBarSize -
                (sideBarNextToEditor ? 0 : sideBarSize) -
                (auxiliaryBarNextToEditor ? 0 : auxiliaryBarSize);
            const editorNodes = this.arrangeEditorNodes({
                editor: nodes.editor,
                sideBar: sideBarNextToEditor ? nodes.sideBar : undefined,
                auxiliaryBar: auxiliaryBarNextToEditor ? nodes.auxiliaryBar : undefined,
            }, availableHeight - panelSize, editorSectionWidth);
            result.push({
                type: 'branch',
                data: panelPostion === 2 /* Position.BOTTOM */
                    ? [editorNodes, nodes.panel]
                    : [nodes.panel, editorNodes],
                size: editorSectionWidth,
            });
            if (!sideBarNextToEditor) {
                if (sideBarPosition === 0 /* Position.LEFT */) {
                    result.splice(0, 0, nodes.sideBar);
                }
                else {
                    result.push(nodes.sideBar);
                }
            }
            if (!auxiliaryBarNextToEditor) {
                if (sideBarPosition === 1 /* Position.RIGHT */) {
                    result.splice(0, 0, nodes.auxiliaryBar);
                }
                else {
                    result.push(nodes.auxiliaryBar);
                }
            }
            if (sideBarPosition === 0 /* Position.LEFT */) {
                result.splice(0, 0, nodes.activityBar);
            }
            else {
                result.push(nodes.activityBar);
            }
        }
        return result;
    }
    createGridDescriptor() {
        const { width, height } = this._mainContainerDimension;
        const sideBarSize = this.stateModel.getInitializationValue(LayoutStateKeys.SIDEBAR_SIZE);
        const auxiliaryBarPartSize = this.stateModel.getInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE);
        const panelSize = this.stateModel.getInitializationValue(LayoutStateKeys.PANEL_SIZE);
        const titleBarHeight = this.titleBarPartView.minimumHeight;
        const bannerHeight = this.bannerPartView.minimumHeight;
        const statusBarHeight = this.statusBarPartView.minimumHeight;
        const activityBarWidth = this.activityBarPartView.minimumWidth;
        const middleSectionHeight = height - titleBarHeight - statusBarHeight;
        const titleAndBanner = [
            {
                type: 'leaf',
                data: { type: "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */ },
                size: titleBarHeight,
                visible: this.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow),
            },
            {
                type: 'leaf',
                data: { type: "workbench.parts.banner" /* Parts.BANNER_PART */ },
                size: bannerHeight,
                visible: false,
            },
        ];
        const activityBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */ },
            size: activityBarWidth,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN),
        };
        const sideBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ },
            size: sideBarSize,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN),
        };
        const auxiliaryBarNode = {
            type: 'leaf',
            data: { type: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */ },
            size: auxiliaryBarPartSize,
            visible: this.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */),
        };
        const editorNode = {
            type: 'leaf',
            data: { type: "workbench.parts.editor" /* Parts.EDITOR_PART */ },
            size: 0, // Update based on sibling sizes
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN),
        };
        const panelNode = {
            type: 'leaf',
            data: { type: "workbench.parts.panel" /* Parts.PANEL_PART */ },
            size: panelSize,
            visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN),
        };
        const middleSection = this.arrangeMiddleSectionNodes({
            activityBar: activityBarNode,
            auxiliaryBar: auxiliaryBarNode,
            editor: editorNode,
            panel: panelNode,
            sideBar: sideBarNode,
        }, width, middleSectionHeight);
        const result = {
            root: {
                type: 'branch',
                size: width,
                data: [
                    ...(this.shouldShowBannerFirst() ? titleAndBanner.reverse() : titleAndBanner),
                    {
                        type: 'branch',
                        data: middleSection,
                        size: middleSectionHeight,
                    },
                    {
                        type: 'leaf',
                        data: { type: "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */ },
                        size: statusBarHeight,
                        visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN),
                    },
                ],
            },
            orientation: 0 /* Orientation.VERTICAL */,
            width,
            height,
        };
        const layoutDescriptor = {
            activityBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN),
            sideBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN),
            auxiliaryBarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN),
            panelVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN),
            statusbarVisible: !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN),
            sideBarPosition: positionToString(this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON)),
            panelPosition: positionToString(this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION)),
        };
        this.telemetryService.publicLog2('startupLayout', layoutDescriptor);
        return result;
    }
    dispose() {
        super.dispose();
        this.disposed = true;
    }
}
function getZenModeConfiguration(configurationService) {
    return configurationService.getValue(WorkbenchLayoutSettings.ZEN_MODE_CONFIG);
}
class WorkbenchLayoutStateKey {
    constructor(name, scope, target, defaultValue) {
        this.name = name;
        this.scope = scope;
        this.target = target;
        this.defaultValue = defaultValue;
    }
}
class RuntimeStateKey extends WorkbenchLayoutStateKey {
    constructor(name, scope, target, defaultValue, zenModeIgnore) {
        super(name, scope, target, defaultValue);
        this.zenModeIgnore = zenModeIgnore;
        this.runtime = true;
    }
}
class InitializationStateKey extends WorkbenchLayoutStateKey {
    constructor() {
        super(...arguments);
        this.runtime = false;
    }
}
const LayoutStateKeys = {
    // Editor
    MAIN_EDITOR_CENTERED: new RuntimeStateKey('editor.centered', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    // Zen Mode
    ZEN_MODE_ACTIVE: new RuntimeStateKey('zenMode.active', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    ZEN_MODE_EXIT_INFO: new RuntimeStateKey('zenMode.exitInfo', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, {
        transitionedToCenteredEditorLayout: false,
        transitionedToFullScreen: false,
        handleNotificationsDoNotDisturbMode: false,
        wasVisible: {
            auxiliaryBar: false,
            panel: false,
            sideBar: false,
        },
    }),
    // Part Sizing
    SIDEBAR_SIZE: new InitializationStateKey('sideBar.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 200),
    AUXILIARYBAR_SIZE: new InitializationStateKey('auxiliaryBar.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 800), // Void changed this from 200 to 800
    PANEL_SIZE: new InitializationStateKey('panel.size', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_LAST_NON_MAXIMIZED_HEIGHT: new RuntimeStateKey('panel.lastNonMaximizedHeight', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_LAST_NON_MAXIMIZED_WIDTH: new RuntimeStateKey('panel.lastNonMaximizedWidth', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, 300),
    PANEL_WAS_LAST_MAXIMIZED: new RuntimeStateKey('panel.wasLastMaximized', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    // Part Positions
    SIDEBAR_POSITON: new RuntimeStateKey('sideBar.position', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, 0 /* Position.LEFT */),
    PANEL_POSITION: new RuntimeStateKey('panel.position', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, 2 /* Position.BOTTOM */),
    PANEL_ALIGNMENT: new RuntimeStateKey('panel.alignment', 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */, 'center'),
    // Part Visibility
    ACTIVITYBAR_HIDDEN: new RuntimeStateKey('activityBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false, true),
    SIDEBAR_HIDDEN: new RuntimeStateKey('sideBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    EDITOR_HIDDEN: new RuntimeStateKey('editor.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false),
    PANEL_HIDDEN: new RuntimeStateKey('panel.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, true),
    AUXILIARYBAR_HIDDEN: new RuntimeStateKey('auxiliaryBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, true),
    STATUSBAR_HIDDEN: new RuntimeStateKey('statusBar.hidden', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, false, true),
};
var WorkbenchLayoutSettings;
(function (WorkbenchLayoutSettings) {
    WorkbenchLayoutSettings["PANEL_POSITION"] = "workbench.panel.defaultLocation";
    WorkbenchLayoutSettings["PANEL_OPENS_MAXIMIZED"] = "workbench.panel.opensMaximized";
    WorkbenchLayoutSettings["ZEN_MODE_CONFIG"] = "zenMode";
    WorkbenchLayoutSettings["EDITOR_CENTERED_LAYOUT_AUTO_RESIZE"] = "workbench.editor.centeredLayoutAutoResize";
})(WorkbenchLayoutSettings || (WorkbenchLayoutSettings = {}));
var LegacyWorkbenchLayoutSettings;
(function (LegacyWorkbenchLayoutSettings) {
    LegacyWorkbenchLayoutSettings["STATUSBAR_VISIBLE"] = "workbench.statusBar.visible";
    LegacyWorkbenchLayoutSettings["SIDEBAR_POSITION"] = "workbench.sideBar.location";
})(LegacyWorkbenchLayoutSettings || (LegacyWorkbenchLayoutSettings = {}));
class LayoutStateModel extends Disposable {
    static { this.STORAGE_PREFIX = 'workbench.'; }
    constructor(storageService, configurationService, contextService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this.stateCache = new Map();
        this._register(this.configurationService.onDidChangeConfiguration((configurationChange) => this.updateStateFromLegacySettings(configurationChange)));
    }
    updateStateFromLegacySettings(configurationChangeEvent) {
        if (configurationChangeEvent.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.ACTIVITYBAR_HIDDEN, this.isActivityBarHidden());
        }
        if (configurationChangeEvent.affectsConfiguration(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.STATUSBAR_HIDDEN, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
        }
        if (configurationChangeEvent.affectsConfiguration(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION)) {
            this.setRuntimeValueAndFire(LayoutStateKeys.SIDEBAR_POSITON, positionFromString(this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ??
                'left'));
        }
    }
    updateLegacySettingsFromState(key, value) {
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        if (key.zenModeIgnore && isZenMode) {
            return;
        }
        if (key === LayoutStateKeys.ACTIVITYBAR_HIDDEN) {
            this.configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, value ? "hidden" /* ActivityBarPosition.HIDDEN */ : undefined);
        }
        else if (key === LayoutStateKeys.STATUSBAR_HIDDEN) {
            this.configurationService.updateValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE, !value);
        }
        else if (key === LayoutStateKeys.SIDEBAR_POSITON) {
            this.configurationService.updateValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION, positionToString(value));
        }
    }
    load(mainContainerDimension) {
        let key;
        // Load stored values for all keys
        for (key in LayoutStateKeys) {
            const stateKey = LayoutStateKeys[key];
            const value = this.loadKeyFromStorage(stateKey);
            if (value !== undefined) {
                this.stateCache.set(stateKey.name, value);
            }
        }
        // Apply legacy settings
        this.stateCache.set(LayoutStateKeys.ACTIVITYBAR_HIDDEN.name, this.isActivityBarHidden());
        this.stateCache.set(LayoutStateKeys.STATUSBAR_HIDDEN.name, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
        this.stateCache.set(LayoutStateKeys.SIDEBAR_POSITON.name, positionFromString(this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ??
            'left'));
        // Set dynamic defaults: part sizing and side bar visibility
        LayoutStateKeys.PANEL_POSITION.defaultValue = positionFromString(this.configurationService.getValue(WorkbenchLayoutSettings.PANEL_POSITION) ?? 'bottom');
        LayoutStateKeys.SIDEBAR_SIZE.defaultValue = Math.min(300, mainContainerDimension.width / 4);
        LayoutStateKeys.AUXILIARYBAR_SIZE.defaultValue = Math.min(300, mainContainerDimension.width / 4);
        LayoutStateKeys.PANEL_SIZE.defaultValue =
            (this.stateCache.get(LayoutStateKeys.PANEL_POSITION.name) ??
                isHorizontal(LayoutStateKeys.PANEL_POSITION.defaultValue))
                ? mainContainerDimension.height / 3
                : mainContainerDimension.width / 4;
        LayoutStateKeys.SIDEBAR_HIDDEN.defaultValue =
            this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */;
        // Apply all defaults
        for (key in LayoutStateKeys) {
            const stateKey = LayoutStateKeys[key];
            if (this.stateCache.get(stateKey.name) === undefined) {
                this.stateCache.set(stateKey.name, stateKey.defaultValue);
            }
        }
        // Register for runtime key changes
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._store)((storageChangeEvent) => {
            let key;
            for (key in LayoutStateKeys) {
                const stateKey = LayoutStateKeys[key];
                if (stateKey instanceof RuntimeStateKey &&
                    stateKey.scope === 0 /* StorageScope.PROFILE */ &&
                    stateKey.target === 0 /* StorageTarget.USER */) {
                    if (`${LayoutStateModel.STORAGE_PREFIX}${stateKey.name}` === storageChangeEvent.key) {
                        const value = this.loadKeyFromStorage(stateKey) ?? stateKey.defaultValue;
                        if (this.stateCache.get(stateKey.name) !== value) {
                            this.stateCache.set(stateKey.name, value);
                            this._onDidChangeState.fire({ key: stateKey, value });
                        }
                    }
                }
            }
        }));
    }
    save(workspace, global) {
        let key;
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        for (key in LayoutStateKeys) {
            const stateKey = LayoutStateKeys[key];
            if ((workspace && stateKey.scope === 1 /* StorageScope.WORKSPACE */) ||
                (global && stateKey.scope === 0 /* StorageScope.PROFILE */)) {
                if (isZenMode && stateKey instanceof RuntimeStateKey && stateKey.zenModeIgnore) {
                    continue; // Don't write out specific keys while in zen mode
                }
                this.saveKeyToStorage(stateKey);
            }
        }
    }
    getInitializationValue(key) {
        return this.stateCache.get(key.name);
    }
    setInitializationValue(key, value) {
        this.stateCache.set(key.name, value);
    }
    getRuntimeValue(key, fallbackToSetting) {
        if (fallbackToSetting) {
            switch (key) {
                case LayoutStateKeys.ACTIVITYBAR_HIDDEN:
                    this.stateCache.set(key.name, this.isActivityBarHidden());
                    break;
                case LayoutStateKeys.STATUSBAR_HIDDEN:
                    this.stateCache.set(key.name, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
                    break;
                case LayoutStateKeys.SIDEBAR_POSITON:
                    this.stateCache.set(key.name, this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ??
                        'left');
                    break;
            }
        }
        return this.stateCache.get(key.name);
    }
    setRuntimeValue(key, value) {
        this.stateCache.set(key.name, value);
        const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
        if (key.scope === 0 /* StorageScope.PROFILE */) {
            if (!isZenMode || !key.zenModeIgnore) {
                this.saveKeyToStorage(key);
                this.updateLegacySettingsFromState(key, value);
            }
        }
    }
    isActivityBarHidden() {
        const oldValue = this.configurationService.getValue('workbench.activityBar.visible');
        if (oldValue !== undefined) {
            return !oldValue;
        }
        return (this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) !==
            "default" /* ActivityBarPosition.DEFAULT */);
    }
    setRuntimeValueAndFire(key, value) {
        const previousValue = this.stateCache.get(key.name);
        if (previousValue === value) {
            return;
        }
        this.setRuntimeValue(key, value);
        this._onDidChangeState.fire({ key, value });
    }
    saveKeyToStorage(key) {
        const value = this.stateCache.get(key.name);
        this.storageService.store(`${LayoutStateModel.STORAGE_PREFIX}${key.name}`, typeof value === 'object' ? JSON.stringify(value) : value, key.scope, key.target);
    }
    loadKeyFromStorage(key) {
        let value = this.storageService.get(`${LayoutStateModel.STORAGE_PREFIX}${key.name}`, key.scope);
        if (value !== undefined) {
            switch (typeof key.defaultValue) {
                case 'boolean':
                    value = value === 'true';
                    break;
                case 'number':
                    value = parseInt(value);
                    break;
                case 'object':
                    value = JSON.parse(value);
                    break;
            }
        }
        return value;
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvbGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUNOLFNBQVMsRUFDVCxxQkFBcUIsRUFDckIsYUFBYSxFQUNiLFFBQVEsRUFDUixJQUFJLEVBRUoscUJBQXFCLEVBQ3JCLHNCQUFzQixFQUN0QixpQkFBaUIsRUFDakIsVUFBVSxFQUNWLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIsU0FBUyxFQUNULFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsU0FBUyxHQUNULE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzdGLE9BQU8sRUFHTixxQkFBcUIsRUFFckIsY0FBYyxHQUNkLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RCxPQUFPLEVBS04sa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUNoQiw2QkFBNkIsRUFTN0Isd0JBQXdCLEVBQ3hCLFlBQVks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