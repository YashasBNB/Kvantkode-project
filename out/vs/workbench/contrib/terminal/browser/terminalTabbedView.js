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
import { Sizing, SplitView, } from '../../../../base/browser/ui/splitview/splitview.js';
import { Disposable, DisposableStore, dispose, } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITerminalConfigurationService, ITerminalGroupService, ITerminalService, } from './terminal.js';
import { TerminalTabList } from './terminalTabsList.js';
import * as dom from '../../../../base/browser/dom.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { localize } from '../../../../nls.js';
import { openContextMenu } from './terminalContextMenu.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { getInstanceHoverInfo } from './terminalTooltip.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const $ = dom.$;
var CssClass;
(function (CssClass) {
    CssClass["ViewIsVertical"] = "terminal-side-view";
})(CssClass || (CssClass = {}));
var WidthConstants;
(function (WidthConstants) {
    WidthConstants[WidthConstants["StatusIcon"] = 30] = "StatusIcon";
    WidthConstants[WidthConstants["SplitAnnotation"] = 30] = "SplitAnnotation";
})(WidthConstants || (WidthConstants = {}));
let TerminalTabbedView = class TerminalTabbedView extends Disposable {
    constructor(parentElement, _terminalService, _terminalConfigurationService, _terminalGroupService, _instantiationService, _contextMenuService, _configurationService, menuService, _storageService, contextKeyService, _hoverService) {
        super();
        this._terminalService = _terminalService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalGroupService = _terminalGroupService;
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._configurationService = _configurationService;
        this._storageService = _storageService;
        this._hoverService = _hoverService;
        this._cancelContextMenu = false;
        this._tabContainer = $('.tabs-container');
        const tabListContainer = $('.tabs-list-container');
        this._tabListElement = $('.tabs-list');
        tabListContainer.appendChild(this._tabListElement);
        this._tabContainer.appendChild(tabListContainer);
        this._instanceMenu = this._register(menuService.createMenu(MenuId.TerminalInstanceContext, contextKeyService));
        this._tabsListMenu = this._register(menuService.createMenu(MenuId.TerminalTabContext, contextKeyService));
        this._tabsListEmptyMenu = this._register(menuService.createMenu(MenuId.TerminalTabEmptyAreaContext, contextKeyService));
        this._tabList = this._register(this._instantiationService.createInstance(TerminalTabList, this._tabListElement, this._register(new DisposableStore())));
        const terminalOuterContainer = $('.terminal-outer-container');
        this._terminalContainer = $('.terminal-groups-container');
        terminalOuterContainer.appendChild(this._terminalContainer);
        this._terminalService.setContainers(parentElement, this._terminalContainer);
        this._terminalIsTabsNarrowContextKey = TerminalContextKeys.tabsNarrow.bindTo(contextKeyService);
        this._terminalTabsFocusContextKey = TerminalContextKeys.tabsFocus.bindTo(contextKeyService);
        this._terminalTabsMouseContextKey = TerminalContextKeys.tabsMouse.bindTo(contextKeyService);
        this._tabTreeIndex = this._terminalConfigurationService.config.tabs.location === 'left' ? 0 : 1;
        this._terminalContainerIndex =
            this._terminalConfigurationService.config.tabs.location === 'left' ? 1 : 0;
        this._register(_configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */) ||
                e.affectsConfiguration("terminal.integrated.tabs.hideCondition" /* TerminalSettingId.TabsHideCondition */)) {
                this._refreshShowTabs();
            }
            else if (e.affectsConfiguration("terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */)) {
                this._tabTreeIndex =
                    this._terminalConfigurationService.config.tabs.location === 'left' ? 0 : 1;
                this._terminalContainerIndex =
                    this._terminalConfigurationService.config.tabs.location === 'left' ? 1 : 0;
                if (this._shouldShowTabs()) {
                    this._splitView.swapViews(0, 1);
                    this._removeSashListener();
                    this._addSashListener();
                    this._splitView.resizeView(this._tabTreeIndex, this._getLastListWidth());
                }
            }
        }));
        this._register(this._terminalGroupService.onDidChangeInstances(() => this._refreshShowTabs()));
        this._register(this._terminalGroupService.onDidChangeGroups(() => this._refreshShowTabs()));
        this._attachEventListeners(parentElement, this._terminalContainer);
        this._register(this._terminalGroupService.onDidChangePanelOrientation((orientation) => {
            this._panelOrientation = orientation;
            if (this._panelOrientation === 0 /* Orientation.VERTICAL */) {
                this._terminalContainer.classList.add("terminal-side-view" /* CssClass.ViewIsVertical */);
            }
            else {
                this._terminalContainer.classList.remove("terminal-side-view" /* CssClass.ViewIsVertical */);
            }
        }));
        this._splitView = new SplitView(parentElement, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            proportionalLayout: false,
        });
        this._setupSplitView(terminalOuterContainer);
    }
    _shouldShowTabs() {
        const enabled = this._terminalConfigurationService.config.tabs.enabled;
        const hide = this._terminalConfigurationService.config.tabs.hideCondition;
        if (!enabled) {
            return false;
        }
        if (hide === 'never') {
            return true;
        }
        if (hide === 'singleTerminal' && this._terminalGroupService.instances.length > 1) {
            return true;
        }
        if (hide === 'singleGroup' && this._terminalGroupService.groups.length > 1) {
            return true;
        }
        return false;
    }
    _refreshShowTabs() {
        if (this._shouldShowTabs()) {
            if (this._splitView.length === 1) {
                this._addTabTree();
                this._addSashListener();
                this._splitView.resizeView(this._tabTreeIndex, this._getLastListWidth());
                this.rerenderTabs();
            }
        }
        else {
            if (this._splitView.length === 2 && !this._terminalTabsMouseContextKey.get()) {
                this._splitView.removeView(this._tabTreeIndex);
                this._plusButton?.remove();
                this._removeSashListener();
            }
        }
    }
    _getLastListWidth() {
        const widthKey = this._panelOrientation === 0 /* Orientation.VERTICAL */
            ? "tabs-list-width-vertical" /* TerminalStorageKeys.TabsListWidthVertical */
            : "tabs-list-width-horizontal" /* TerminalStorageKeys.TabsListWidthHorizontal */;
        const storedValue = this._storageService.get(widthKey, 0 /* StorageScope.PROFILE */);
        if (!storedValue || !parseInt(storedValue)) {
            // we want to use the min width by default for the vertical orientation bc
            // there is such a limited width for the terminal panel to begin w there.
            return this._panelOrientation === 0 /* Orientation.VERTICAL */
                ? 46 /* TerminalTabsListSizes.NarrowViewWidth */
                : 120 /* TerminalTabsListSizes.DefaultWidth */;
        }
        return parseInt(storedValue);
    }
    _handleOnDidSashReset() {
        // Calculate ideal size of list to display all text based on its contents
        let idealWidth = 80 /* TerminalTabsListSizes.WideViewMinimumWidth */;
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = 1;
        offscreenCanvas.height = 1;
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
            const style = dom.getWindow(this._tabListElement).getComputedStyle(this._tabListElement);
            ctx.font = `${style.fontStyle} ${style.fontSize} ${style.fontFamily}`;
            const maxInstanceWidth = this._terminalGroupService.instances.reduce((p, c) => {
                return Math.max(p, ctx.measureText(c.title + (c.description || '')).width + this._getAdditionalWidth(c));
            }, 0);
            idealWidth = Math.ceil(Math.max(maxInstanceWidth, 80 /* TerminalTabsListSizes.WideViewMinimumWidth */));
        }
        // If the size is already ideal, toggle to collapsed
        const currentWidth = Math.ceil(this._splitView.getViewSize(this._tabTreeIndex));
        if (currentWidth === idealWidth) {
            idealWidth = 46 /* TerminalTabsListSizes.NarrowViewWidth */;
        }
        this._splitView.resizeView(this._tabTreeIndex, idealWidth);
        this._updateListWidth(idealWidth);
    }
    _getAdditionalWidth(instance) {
        // Size to include padding, icon, status icon (if any), split annotation (if any), + a little more
        const additionalWidth = 40;
        const statusIconWidth = instance.statusList.statuses.length > 0 ? 30 /* WidthConstants.StatusIcon */ : 0;
        const splitAnnotationWidth = (this._terminalGroupService.getGroupForInstance(instance)?.terminalInstances.length || 0) > 1
            ? 30 /* WidthConstants.SplitAnnotation */
            : 0;
        return additionalWidth + splitAnnotationWidth + statusIconWidth;
    }
    _handleOnDidSashChange() {
        const listWidth = this._splitView.getViewSize(this._tabTreeIndex);
        if (!this._width || listWidth <= 0) {
            return;
        }
        this._updateListWidth(listWidth);
    }
    _updateListWidth(width) {
        if (width < 63 /* TerminalTabsListSizes.MidpointViewWidth */ &&
            width >= 46 /* TerminalTabsListSizes.NarrowViewWidth */) {
            width = 46 /* TerminalTabsListSizes.NarrowViewWidth */;
            this._splitView.resizeView(this._tabTreeIndex, width);
        }
        else if (width >= 63 /* TerminalTabsListSizes.MidpointViewWidth */ &&
            width < 80 /* TerminalTabsListSizes.WideViewMinimumWidth */) {
            width = 80 /* TerminalTabsListSizes.WideViewMinimumWidth */;
            this._splitView.resizeView(this._tabTreeIndex, width);
        }
        this.rerenderTabs();
        const widthKey = this._panelOrientation === 0 /* Orientation.VERTICAL */
            ? "tabs-list-width-vertical" /* TerminalStorageKeys.TabsListWidthVertical */
            : "tabs-list-width-horizontal" /* TerminalStorageKeys.TabsListWidthHorizontal */;
        this._storageService.store(widthKey, width, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    _setupSplitView(terminalOuterContainer) {
        this._register(this._splitView.onDidSashReset(() => this._handleOnDidSashReset()));
        this._register(this._splitView.onDidSashChange(() => this._handleOnDidSashChange()));
        if (this._shouldShowTabs()) {
            this._addTabTree();
        }
        this._splitView.addView({
            element: terminalOuterContainer,
            layout: (width) => this._terminalGroupService.groups.forEach((tab) => tab.layout(width, this._height || 0)),
            minimumSize: 120,
            maximumSize: Number.POSITIVE_INFINITY,
            onDidChange: () => Disposable.None,
            priority: 2 /* LayoutPriority.High */,
        }, Sizing.Distribute, this._terminalContainerIndex);
        if (this._shouldShowTabs()) {
            this._addSashListener();
        }
    }
    _addTabTree() {
        this._splitView.addView({
            element: this._tabContainer,
            layout: (width) => this._tabList.layout(this._height || 0, width),
            minimumSize: 46 /* TerminalTabsListSizes.NarrowViewWidth */,
            maximumSize: 500 /* TerminalTabsListSizes.MaximumWidth */,
            onDidChange: () => Disposable.None,
            priority: 1 /* LayoutPriority.Low */,
        }, Sizing.Distribute, this._tabTreeIndex);
        this.rerenderTabs();
    }
    rerenderTabs() {
        this._updateHasText();
        this._tabList.refresh();
    }
    _addSashListener() {
        let interval;
        this._sashDisposables = [
            this._splitView.sashes[0].onDidStart((e) => {
                interval = dom.disposableWindowInterval(dom.getWindow(this._splitView.el), () => {
                    this.rerenderTabs();
                }, 100);
            }),
            this._splitView.sashes[0].onDidEnd((e) => {
                interval.dispose();
            }),
        ];
    }
    _removeSashListener() {
        if (this._sashDisposables) {
            dispose(this._sashDisposables);
            this._sashDisposables = undefined;
        }
    }
    _updateHasText() {
        const hasText = this._tabListElement.clientWidth > 63 /* TerminalTabsListSizes.MidpointViewWidth */;
        this._tabContainer.classList.toggle('has-text', hasText);
        this._terminalIsTabsNarrowContextKey.set(!hasText);
    }
    layout(width, height) {
        this._height = height;
        this._width = width;
        this._splitView.layout(width);
        if (this._shouldShowTabs()) {
            this._splitView.resizeView(this._tabTreeIndex, this._getLastListWidth());
        }
        this._updateHasText();
    }
    _attachEventListeners(parentDomElement, terminalContainer) {
        this._register(dom.addDisposableListener(this._tabContainer, 'mouseleave', async (event) => {
            this._terminalTabsMouseContextKey.set(false);
            this._refreshShowTabs();
            event.stopPropagation();
        }));
        this._register(dom.addDisposableListener(this._tabContainer, 'mouseenter', async (event) => {
            this._terminalTabsMouseContextKey.set(true);
            event.stopPropagation();
        }));
        this._register(dom.addDisposableListener(terminalContainer, 'mousedown', async (event) => {
            const terminal = this._terminalGroupService.activeInstance;
            if (this._terminalGroupService.instances.length > 0 && terminal) {
                const result = await terminal.handleMouseEvent(event, this._instanceMenu);
                if (typeof result === 'object' && result.cancelContextMenu) {
                    this._cancelContextMenu = true;
                }
            }
        }));
        this._register(dom.addDisposableListener(terminalContainer, 'contextmenu', (event) => {
            const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
            if (rightClickBehavior === 'nothing' && !event.shiftKey) {
                this._cancelContextMenu = true;
            }
            terminalContainer.focus();
            if (!this._cancelContextMenu) {
                openContextMenu(dom.getWindow(terminalContainer), event, this._terminalGroupService.activeInstance, this._instanceMenu, this._contextMenuService);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            this._cancelContextMenu = false;
        }));
        this._register(dom.addDisposableListener(this._tabContainer, 'contextmenu', (event) => {
            const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
            if (rightClickBehavior === 'nothing' && !event.shiftKey) {
                this._cancelContextMenu = true;
            }
            if (!this._cancelContextMenu) {
                const emptyList = this._tabList.getFocus().length === 0;
                if (!emptyList) {
                    this._terminalGroupService.lastAccessedMenu = 'tab-list';
                }
                // Put the focused item first as it's used as the first positional argument
                const selectedInstances = this._tabList.getSelectedElements();
                const focusedInstance = this._tabList.getFocusedElements()?.[0];
                if (focusedInstance) {
                    selectedInstances.splice(selectedInstances.findIndex((e) => e.instanceId === focusedInstance.instanceId), 1);
                    selectedInstances.unshift(focusedInstance);
                }
                openContextMenu(dom.getWindow(this._tabContainer), event, selectedInstances, emptyList ? this._tabsListEmptyMenu : this._tabsListMenu, this._contextMenuService, emptyList ? this._getTabActions() : undefined);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            this._cancelContextMenu = false;
        }));
        this._register(dom.addDisposableListener(terminalContainer.ownerDocument, 'keydown', (event) => {
            terminalContainer.classList.toggle('alt-active', !!event.altKey);
        }));
        this._register(dom.addDisposableListener(terminalContainer.ownerDocument, 'keyup', (event) => {
            terminalContainer.classList.toggle('alt-active', !!event.altKey);
        }));
        this._register(dom.addDisposableListener(parentDomElement, 'keyup', (event) => {
            if (event.keyCode === 27) {
                // Keep terminal open on escape
                event.stopPropagation();
            }
        }));
        this._register(dom.addDisposableListener(this._tabContainer, dom.EventType.FOCUS_IN, () => {
            this._terminalTabsFocusContextKey.set(true);
        }));
        this._register(dom.addDisposableListener(this._tabContainer, dom.EventType.FOCUS_OUT, () => {
            this._terminalTabsFocusContextKey.set(false);
        }));
    }
    _getTabActions() {
        return [
            new Separator(),
            this._configurationService.inspect("terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */).userValue === 'left'
                ? new Action('moveRight', localize('moveTabsRight', 'Move Tabs Right'), undefined, undefined, async () => {
                    this._configurationService.updateValue("terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */, 'right');
                })
                : new Action('moveLeft', localize('moveTabsLeft', 'Move Tabs Left'), undefined, undefined, async () => {
                    this._configurationService.updateValue("terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */, 'left');
                }),
            new Action('hideTabs', localize('hideTabs', 'Hide Tabs'), undefined, undefined, async () => {
                this._configurationService.updateValue("terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */, false);
            }),
        ];
    }
    setEditable(isEditing) {
        if (!isEditing) {
            this._tabList.domFocus();
        }
        this._tabList.refresh(false);
    }
    focusTabs() {
        if (!this._shouldShowTabs()) {
            return;
        }
        this._terminalTabsFocusContextKey.set(true);
        const selected = this._tabList.getSelection();
        this._tabList.domFocus();
        if (selected) {
            this._tabList.setFocus(selected);
        }
    }
    focus() {
        if (this._terminalService.connectionState === 1 /* TerminalConnectionState.Connected */) {
            this._focus();
            return;
        }
        // If the terminal is waiting to reconnect to remote terminals, then there is no TerminalInstance yet that can
        // be focused. So wait for connection to finish, then focus.
        const previousActiveElement = this._tabListElement.ownerDocument.activeElement;
        if (previousActiveElement) {
            // TODO: Improve lifecycle management this event should be disposed after first fire
            this._register(this._terminalService.onDidChangeConnectionState(() => {
                // Only focus the terminal if the activeElement has not changed since focus() was called
                // TODO: Hack
                if (dom.isActiveElement(previousActiveElement)) {
                    this._focus();
                }
            }));
        }
    }
    focusHover() {
        if (this._shouldShowTabs()) {
            this._tabList.focusHover();
            return;
        }
        const instance = this._terminalGroupService.activeInstance;
        if (!instance) {
            return;
        }
        this._hoverService.showInstantHover({
            ...getInstanceHoverInfo(instance, this._storageService),
            target: this._terminalContainer,
            trapFocus: true,
        }, true);
    }
    _focus() {
        this._terminalGroupService.activeInstance?.focusWhenReady();
    }
};
TerminalTabbedView = __decorate([
    __param(1, ITerminalService),
    __param(2, ITerminalConfigurationService),
    __param(3, ITerminalGroupService),
    __param(4, IInstantiationService),
    __param(5, IContextMenuService),
    __param(6, IConfigurationService),
    __param(7, IMenuService),
    __param(8, IStorageService),
    __param(9, IContextKeyService),
    __param(10, IHoverService)
], TerminalTabbedView);
export { TerminalTabbedView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUYWJiZWRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFRhYmJlZFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUdOLE1BQU0sRUFDTixTQUFTLEdBQ1QsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEdBRVAsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLHFCQUFxQixFQUVyQixnQkFBZ0IsR0FFaEIsTUFBTSxlQUFlLENBQUE7QUFDdEIsT0FBTyxFQUF5QixlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5RSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0UsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM1RixPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFN0YsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJB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