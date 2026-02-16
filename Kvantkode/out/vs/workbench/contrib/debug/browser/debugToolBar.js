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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUb29sQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnVG9vbEJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sU0FBUyxHQUdULE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsT0FBTyxFQUFjLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFDTixNQUFNLEdBS04sTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFDTixlQUFlLEVBQ2YsT0FBTyxFQUVQLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQVksUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQ04saUNBQWlDLEdBRWpDLE1BQU0sMkVBQTJFLENB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