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
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { ActionBar, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Action, } from '../../../../base/common/actions.js';
import * as arrays from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import * as errors from '../../../../base/common/errors.js';
import { DisposableStore, dispose, markAsSingleton, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { platform } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { DropdownWithPrimaryActionViewItem, } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { createActionViewItem, getFlatActionBarActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { widgetBorder, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { getWindowControlsStyle, } from '../../../../platform/window/common/window.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { CONTEXT_DEBUG_STATE, CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG, CONTEXT_IN_DEBUG_MODE, CONTEXT_MULTI_SESSION_DEBUG, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED, IDebugService, VIEWLET_ID, } from '../common/debug.js';
import { FocusSessionActionViewItem } from './debugActionViewItems.js';
import { debugToolBarBackground, debugToolBarBorder } from './debugColors.js';
import { CONTINUE_ID, CONTINUE_LABEL, DISCONNECT_AND_SUSPEND_ID, DISCONNECT_AND_SUSPEND_LABEL, DISCONNECT_ID, DISCONNECT_LABEL, FOCUS_SESSION_ID, FOCUS_SESSION_LABEL, PAUSE_ID, PAUSE_LABEL, RESTART_LABEL, RESTART_SESSION_ID, REVERSE_CONTINUE_ID, STEP_BACK_ID, STEP_INTO_ID, STEP_INTO_LABEL, STEP_OUT_ID, STEP_OUT_LABEL, STEP_OVER_ID, STEP_OVER_LABEL, STOP_ID, STOP_LABEL, } from './debugCommands.js';
import * as icons from './debugIcons.js';
import './media/debugToolBar.css';
const DEBUG_TOOLBAR_POSITION_KEY = 'debug.actionswidgetposition';
const DEBUG_TOOLBAR_Y_KEY = 'debug.actionswidgety';
let DebugToolBar = class DebugToolBar extends Themable {
    constructor(notificationService, telemetryService, debugService, layoutService, storageService, configurationService, themeService, instantiationService, menuService, contextKeyService) {
        super(themeService);
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.debugService = debugService;
        this.layoutService = layoutService;
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.isVisible = false;
        this.isBuilt = false;
        this.stopActionViewItemDisposables = this._register(new DisposableStore());
        /** coordinate of the debug toolbar per aux window */
        this.auxWindowCoordinates = new WeakMap();
        this.trackPixelRatioListener = this._register(new MutableDisposable());
        this.$el = dom.$('div.debug-toolbar');
        // Note: changes to this setting require a restart, so no need to listen to it.
        const customWindowControls = getWindowControlsStyle(this.configurationService) === "custom" /* WindowControlsStyle.CUSTOM */;
        // Do not allow the widget to overflow or underflow window controls.
        // Use CSS calculations to avoid having to force layout with `.clientWidth`
        const controlsOnLeft = customWindowControls && platform === 1 /* Platform.Mac */;
        const controlsOnRight = customWindowControls && (platform === 3 /* Platform.Windows */ || platform === 2 /* Platform.Linux */);
        this.$el.style.transform = `translate(
			min(
				max(${controlsOnLeft ? '60px' : '0px'}, calc(-50% + (100vw * var(--x-position)))),
				calc(100vw - 100% - ${controlsOnRight ? '100px' : '0px'})
			),
			var(--y-position)
		)`;
        this.dragArea = dom.append(this.$el, dom.$('div.drag-area' + ThemeIcon.asCSSSelector(icons.debugGripper)));
        const actionBarContainer = dom.append(this.$el, dom.$('div.action-bar-container'));
        this.debugToolBarMenu = menuService.createMenu(MenuId.DebugToolBar, contextKeyService);
        this._register(this.debugToolBarMenu);
        this.activeActions = [];
        this.actionBar = this._register(new ActionBar(actionBarContainer, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            actionViewItemProvider: (action, options) => {
                if (action.id === FOCUS_SESSION_ID) {
                    return this.instantiationService.createInstance(FocusSessionActionViewItem, action, undefined);
                }
                else if (action.id === STOP_ID || action.id === DISCONNECT_ID) {
                    this.stopActionViewItemDisposables.clear();
                    const item = this.instantiationService.invokeFunction((accessor) => createDisconnectMenuItemAction(action, this.stopActionViewItemDisposables, accessor, { hoverDelegate: options.hoverDelegate }));
                    if (item) {
                        return item;
                    }
                }
                return createActionViewItem(this.instantiationService, action, options);
            },
        }));
        this.updateScheduler = this._register(new RunOnceScheduler(() => {
            const state = this.debugService.state;
            const toolBarLocation = this.configurationService.getValue('debug').toolBarLocation;
            if (state === 0 /* State.Inactive */ ||
                toolBarLocation !== 'floating' ||
                this.debugService
                    .getModel()
                    .getSessions()
                    .every((s) => s.suppressDebugToolbar) ||
                (state === 1 /* State.Initializing */ &&
                    this.debugService.initializingOptions?.suppressDebugToolbar)) {
                return this.hide();
            }
            const actions = getFlatActionBarActions(this.debugToolBarMenu.getActions({ shouldForwardArgs: true }));
            if (!arrays.equals(actions, this.activeActions, (first, second) => first.id === second.id && first.enabled === second.enabled)) {
                this.actionBar.clear();
                this.actionBar.push(actions, { icon: true, label: false });
                this.activeActions = actions;
            }
            this.show();
        }, 20));
        this.updateStyles();
        this.registerListeners();
        this.hide();
    }
    registerListeners() {
        this._register(this.debugService.onDidChangeState(() => this.updateScheduler.schedule()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug.toolBarLocation')) {
                this.updateScheduler.schedule();
            }
            if (e.affectsConfiguration("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */) ||
                e.affectsConfiguration("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */)) {
                this._yRange = undefined;
                this.setCoordinates();
            }
        }));
        this._register(this.debugToolBarMenu.onDidChange(() => this.updateScheduler.schedule()));
        this._register(this.actionBar.actionRunner.onDidRun((e) => {
            // check for error
            if (e.error && !errors.isCancellationError(e.error)) {
                this.notificationService.warn(e.error);
            }
            // log in telemetry
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: 'debugActionsWidget' });
        }));
        this._register(dom.addDisposableGenericMouseUpListener(this.dragArea, (event) => {
            const mouseClickEvent = new StandardMouseEvent(dom.getWindow(this.dragArea), event);
            if (mouseClickEvent.detail === 2) {
                // double click on debug bar centers it again #8250
                this.setCoordinates(0.5, this.yDefault);
                this.storePosition();
            }
        }));
        this._register(dom.addDisposableGenericMouseDownListener(this.dragArea, (e) => {
            this.dragArea.classList.add('dragged');
            const activeWindow = dom.getWindow(this.layoutService.activeContainer);
            const originEvent = new StandardMouseEvent(activeWindow, e);
            const originX = this.computeCurrentXPercent();
            const originY = this.getCurrentYPosition();
            const mouseMoveListener = dom.addDisposableGenericMouseMoveListener(activeWindow, (e) => {
                const mouseMoveEvent = new StandardMouseEvent(activeWindow, e);
                // Prevent default to stop editor selecting text #8524
                mouseMoveEvent.preventDefault();
                this.setCoordinates(originX + (mouseMoveEvent.posx - originEvent.posx) / activeWindow.innerWidth, originY + mouseMoveEvent.posy - originEvent.posy);
            });
            const mouseUpListener = dom.addDisposableGenericMouseUpListener(activeWindow, (e) => {
                this.storePosition();
                this.dragArea.classList.remove('dragged');
                mouseMoveListener.dispose();
                mouseUpListener.dispose();
            });
        }));
        this._register(this.layoutService.onDidChangePartVisibility(() => this.setCoordinates()));
        this._register(this.layoutService.onDidChangeActiveContainer(async () => {
            this._yRange = undefined;
            // note: we intentionally don't keep the activeContainer before the
            // `await` clause to avoid any races due to quickly switching windows.
            await this.layoutService.whenContainerStylesLoaded(dom.getWindow(this.layoutService.activeContainer));
            if (this.isBuilt) {
                this.doShowInActiveContainer();
                this.setCoordinates();
            }
        }));
    }
    /**
     * Computes the x percent position at which the toolbar is currently displayed.
     */
    computeCurrentXPercent() {
        const { left, width } = this.$el.getBoundingClientRect();
        return (left + width / 2) / dom.getWindow(this.$el).innerWidth;
    }
    /**
     * Gets the x position set in the style of the toolbar. This may not be its
     * actual position on screen depending on toolbar locations.
     */
    getCurrentXPercent() {
        return Number(this.$el.style.getPropertyValue('--x-position'));
    }
    /** Gets the y position set in the style of the toolbar */
    getCurrentYPosition() {
        return parseInt(this.$el.style.getPropertyValue('--y-position'));
    }
    storePosition() {
        const activeWindow = dom.getWindow(this.layoutService.activeContainer);
        const isMainWindow = this.layoutService.activeContainer === this.layoutService.mainContainer;
        const x = this.getCurrentXPercent();
        const y = this.getCurrentYPosition();
        if (isMainWindow) {
            this.storageService.store(DEBUG_TOOLBAR_POSITION_KEY, x, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store(DEBUG_TOOLBAR_Y_KEY, y, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.auxWindowCoordinates.set(activeWindow, { x, y });
        }
    }
    updateStyles() {
        super.updateStyles();
        if (this.$el) {
            this.$el.style.backgroundColor = this.getColor(debugToolBarBackground) || '';
            const widgetShadowColor = this.getColor(widgetShadow);
            this.$el.style.boxShadow = widgetShadowColor ? `0 0 8px 2px ${widgetShadowColor}` : '';
            const contrastBorderColor = this.getColor(widgetBorder);
            const borderColor = this.getColor(debugToolBarBorder);
            if (contrastBorderColor) {
                this.$el.style.border = `1px solid ${contrastBorderColor}`;
            }
            else {
                this.$el.style.border = borderColor ? `solid ${borderColor}` : 'none';
                this.$el.style.border = '1px 0';
            }
        }
    }
    /** Gets the stored X position of the middle of the toolbar based on the current window width */
    getStoredXPosition() {
        const currentWindow = dom.getWindow(this.layoutService.activeContainer);
        const isMainWindow = currentWindow === mainWindow;
        const storedPercentage = isMainWindow
            ? Number(this.storageService.get(DEBUG_TOOLBAR_POSITION_KEY, 0 /* StorageScope.PROFILE */))
            : this.auxWindowCoordinates.get(currentWindow)?.x;
        return storedPercentage !== undefined && !isNaN(storedPercentage) ? storedPercentage : 0.5;
    }
    getStoredYPosition() {
        const currentWindow = dom.getWindow(this.layoutService.activeContainer);
        const isMainWindow = currentWindow === mainWindow;
        const storedY = isMainWindow
            ? this.storageService.getNumber(DEBUG_TOOLBAR_Y_KEY, 0 /* StorageScope.PROFILE */)
            : this.auxWindowCoordinates.get(currentWindow)?.y;
        return storedY ?? this.yDefault;
    }
    setCoordinates(x, y) {
        if (!this.isVisible) {
            return;
        }
        x ??= this.getStoredXPosition();
        y ??= this.getStoredYPosition();
        const [yMin, yMax] = this.yRange;
        y = Math.max(yMin, Math.min(y, yMax));
        this.$el.style.setProperty('--x-position', `${x}`);
        this.$el.style.setProperty('--y-position', `${y}px`);
    }
    get yDefault() {
        return this.layoutService.mainContainerOffset.top;
    }
    get yRange() {
        if (!this._yRange) {
            const isTitleBarVisible = this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, dom.getWindow(this.layoutService.activeContainer));
            const yMin = isTitleBarVisible ? 0 : this.layoutService.mainContainerOffset.top;
            let yMax = 0;
            if (isTitleBarVisible) {
                if (this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) === true) {
                    yMax += 35;
                }
                else {
                    yMax += 28;
                }
            }
            if (this.configurationService.getValue("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */) !== "none" /* EditorTabsMode.NONE */) {
                yMax += 35;
            }
            this._yRange = [yMin, yMax];
        }
        return this._yRange;
    }
    show() {
        if (this.isVisible) {
            this.setCoordinates();
            return;
        }
        if (!this.isBuilt) {
            this.isBuilt = true;
            this.doShowInActiveContainer();
        }
        this.isVisible = true;
        dom.show(this.$el);
        this.setCoordinates();
    }
    doShowInActiveContainer() {
        this.layoutService.activeContainer.appendChild(this.$el);
        this.trackPixelRatioListener.value = PixelRatio.getInstance(dom.getWindow(this.$el)).onDidChange(() => this.setCoordinates());
    }
    hide() {
        this.isVisible = false;
        dom.hide(this.$el);
    }
    dispose() {
        super.dispose();
        this.$el?.remove();
    }
};
DebugToolBar = __decorate([
    __param(0, INotificationService),
    __param(1, ITelemetryService),
    __param(2, IDebugService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IStorageService),
    __param(5, IConfigurationService),
    __param(6, IThemeService),
    __param(7, IInstantiationService),
    __param(8, IMenuService),
    __param(9, IContextKeyService)
], DebugToolBar);
export { DebugToolBar };
export function createDisconnectMenuItemAction(action, disposables, accessor, options) {
    const menuService = accessor.get(IMenuService);
    const contextKeyService = accessor.get(IContextKeyService);
    const instantiationService = accessor.get(IInstantiationService);
    const menu = menuService.getMenuActions(MenuId.DebugToolBarStop, contextKeyService, {
        shouldForwardArgs: true,
    });
    const secondary = getFlatActionBarActions(menu);
    if (!secondary.length) {
        return undefined;
    }
    const dropdownAction = disposables.add(new Action('notebook.moreRunActions', localize('notebook.moreRunActionsLabel', 'More...'), 'codicon-chevron-down', true));
    const item = instantiationService.createInstance(DropdownWithPrimaryActionViewItem, action, dropdownAction, secondary, 'debug-stop-actions', options);
    return item;
}
// Debug toolbar
const debugViewTitleItems = [];
const registerDebugToolBarItem = (id, title, order, icon, when, precondition, alt) => {
    MenuRegistry.appendMenuItem(MenuId.DebugToolBar, {
        group: 'navigation',
        when,
        order,
        command: {
            id,
            title,
            icon,
            precondition,
        },
        alt,
    });
    // Register actions in debug viewlet when toolbar is docked
    debugViewTitleItems.push(MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
        group: 'navigation',
        when: ContextKeyExpr.and(when, ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_STATE.notEqualsTo('inactive'), ContextKeyExpr.equals('config.debug.toolBarLocation', 'docked')),
        order,
        command: {
            id,
            title,
            icon,
            precondition,
        },
    }));
};
markAsSingleton(MenuRegistry.onDidChangeMenu((e) => {
    // In case the debug toolbar is docked we need to make sure that the docked toolbar has the up to date commands registered #115945
    if (e.has(MenuId.DebugToolBar)) {
        dispose(debugViewTitleItems);
        const items = MenuRegistry.getMenuItems(MenuId.DebugToolBar);
        for (const i of items) {
            debugViewTitleItems.push(MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
                ...i,
                when: ContextKeyExpr.and(i.when, ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_STATE.notEqualsTo('inactive'), ContextKeyExpr.equals('config.debug.toolBarLocation', 'docked')),
            }));
        }
    }
}));
const CONTEXT_TOOLBAR_COMMAND_CENTER = ContextKeyExpr.equals('config.debug.toolBarLocation', 'commandCenter');
MenuRegistry.appendMenuItem(MenuId.CommandCenterCenter, {
    submenu: MenuId.DebugToolBar,
    title: 'Debug',
    icon: Codicon.debug,
    order: 1,
    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, CONTEXT_TOOLBAR_COMMAND_CENTER),
});
registerDebugToolBarItem(CONTINUE_ID, CONTINUE_LABEL, 10, icons.debugContinue, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(PAUSE_ID, PAUSE_LABEL, 10, icons.debugPause, CONTEXT_DEBUG_STATE.notEqualsTo('stopped'), ContextKeyExpr.and(CONTEXT_DEBUG_STATE.isEqualTo('running'), CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.toNegated()));
registerDebugToolBarItem(STOP_ID, STOP_LABEL, 70, icons.debugStop, CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), undefined, {
    id: DISCONNECT_ID,
    title: DISCONNECT_LABEL,
    icon: icons.debugDisconnect,
    precondition: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED),
});
registerDebugToolBarItem(DISCONNECT_ID, DISCONNECT_LABEL, 70, icons.debugDisconnect, CONTEXT_FOCUSED_SESSION_IS_ATTACH, undefined, {
    id: STOP_ID,
    title: STOP_LABEL,
    icon: icons.debugStop,
    precondition: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED),
});
registerDebugToolBarItem(STEP_OVER_ID, STEP_OVER_LABEL, 20, icons.debugStepOver, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(STEP_INTO_ID, STEP_INTO_LABEL, 30, icons.debugStepInto, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(STEP_OUT_ID, STEP_OUT_LABEL, 40, icons.debugStepOut, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(RESTART_SESSION_ID, RESTART_LABEL, 60, icons.debugRestart);
registerDebugToolBarItem(STEP_BACK_ID, localize('stepBackDebug', 'Step Back'), 50, icons.debugStepBack, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(REVERSE_CONTINUE_ID, localize('reverseContinue', 'Reverse'), 55, icons.debugReverseContinue, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(FOCUS_SESSION_ID, FOCUS_SESSION_LABEL, 100, Codicon.listTree, ContextKeyExpr.and(CONTEXT_MULTI_SESSION_DEBUG, CONTEXT_TOOLBAR_COMMAND_CENTER.negate()));
MenuRegistry.appendMenuItem(MenuId.DebugToolBarStop, {
    group: 'navigation',
    when: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED),
    order: 0,
    command: {
        id: DISCONNECT_ID,
        title: DISCONNECT_LABEL,
        icon: icons.debugDisconnect,
    },
});
MenuRegistry.appendMenuItem(MenuId.DebugToolBarStop, {
    group: 'navigation',
    when: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED),
    order: 0,
    command: {
        id: STOP_ID,
        title: STOP_LABEL,
        icon: icons.debugStop,
    },
});
MenuRegistry.appendMenuItem(MenuId.DebugToolBarStop, {
    group: 'navigation',
    when: ContextKeyExpr.or(ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED), ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED)),
    order: 0,
    command: {
        id: DISCONNECT_AND_SUSPEND_ID,
        title: DISCONNECT_AND_SUSPEND_LABEL,
        icon: icons.debugDisconnect,
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUb29sQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1Rvb2xCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxFQUNOLFNBQVMsR0FHVCxNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE9BQU8sRUFBYyxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sTUFBTSxHQUtOLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFFUCxlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFZLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUNOLGlDQUFpQyxHQUVqQyxNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFDTixvQkFB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