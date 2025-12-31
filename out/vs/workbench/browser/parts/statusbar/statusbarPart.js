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
var StatusbarPart_1, AuxiliaryStatusbarPart_1;
import './media/statusbarpart.css';
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore, disposeIfDisposable, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { MultiWindowParts, Part } from '../../part.js';
import { EventType as TouchEventType, Gesture, } from '../../../../base/browser/touch.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStatusbarService, isStatusbarEntryLocation, isStatusbarEntryPriority, } from '../../../services/statusbar/browser/statusbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { Separator, toAction } from '../../../../base/common/actions.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { STATUS_BAR_BACKGROUND, STATUS_BAR_FOREGROUND, STATUS_BAR_NO_FOLDER_BACKGROUND, STATUS_BAR_ITEM_HOVER_BACKGROUND, STATUS_BAR_BORDER, STATUS_BAR_NO_FOLDER_FOREGROUND, STATUS_BAR_NO_FOLDER_BORDER, STATUS_BAR_ITEM_COMPACT_HOVER_BACKGROUND, STATUS_BAR_ITEM_FOCUS_BORDER, STATUS_BAR_FOCUS_BORDER, } from '../../../common/theme.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { contrastBorder, activeContrastBorder, } from '../../../../platform/theme/common/colorRegistry.js';
import { EventHelper, addDisposableListener, EventType, clearNode, getWindow, isHTMLElement, $, } from '../../../../base/browser/dom.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { equals } from '../../../../base/common/arrays.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { ToggleStatusbarVisibilityAction } from '../../actions/layoutActions.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { hash } from '../../../../base/common/hash.js';
import { WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { HideStatusbarEntryAction, ManageExtensionAction, ToggleStatusbarEntryVisibilityAction, } from './statusbarActions.js';
import { StatusbarViewModel } from './statusbarModel.js';
import { StatusbarEntryItem } from './statusbarItem.js';
import { StatusBarFocused } from '../../../common/contextkeys.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isManagedHoverTooltipHTMLElement, isManagedHoverTooltipMarkdownString, } from '../../../../base/browser/ui/hover/hover.js';
let StatusbarPart = class StatusbarPart extends Part {
    static { StatusbarPart_1 = this; }
    static { this.HEIGHT = 22; }
    constructor(id, instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService) {
        super(id, { hasTitle: false }, themeService, storageService, layoutService);
        this.instantiationService = instantiationService;
        this.contextService = contextService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        //#region IView
        this.minimumWidth = 0;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = StatusbarPart_1.HEIGHT;
        this.maximumHeight = StatusbarPart_1.HEIGHT;
        this.pendingEntries = [];
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.onDidOverrideEntry = this._register(new Emitter());
        this.entryOverrides = new Map();
        this.compactEntriesDisposable = this._register(new MutableDisposable());
        this.styleOverrides = new Set();
        this.viewModel = this._register(new StatusbarViewModel(storageService));
        this.onDidChangeEntryVisibility = this.viewModel.onDidChangeEntryVisibility;
        this.hoverDelegate = this._register(this.instantiationService.createInstance(WorkbenchHoverDelegate, 'element', {
            instantHover: true,
            dynamicDelay(content) {
                if (typeof content === 'function' ||
                    isHTMLElement(content) ||
                    (isManagedHoverTooltipMarkdownString(content) &&
                        typeof content.markdown === 'function') ||
                    isManagedHoverTooltipHTMLElement(content)) {
                    // override the delay for content that is rich (e.g. html or long running)
                    // so that it appears more instantly. these hovers carry more important
                    // information and should not be delayed by preference.
                    return 500;
                }
                return undefined;
            },
        }, (_, focus) => ({
            persistence: {
                hideOnKeyDown: true,
                sticky: focus,
            },
        })));
        this.registerListeners();
    }
    registerListeners() {
        // Entry visibility changes
        this._register(this.onDidChangeEntryVisibility(() => this.updateCompactEntries()));
        // Workbench state changes
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.updateStyles()));
    }
    overrideEntry(id, override) {
        this.entryOverrides.set(id, override);
        this.onDidOverrideEntry.fire(id);
        return toDisposable(() => {
            const currentOverride = this.entryOverrides.get(id);
            if (currentOverride === override) {
                this.entryOverrides.delete(id);
                this.onDidOverrideEntry.fire(id);
            }
        });
    }
    withEntryOverride(entry, id) {
        const override = this.entryOverrides.get(id);
        if (override) {
            entry = { ...entry, ...override };
        }
        return entry;
    }
    addEntry(entry, id, alignment, priorityOrLocation = 0) {
        let priority;
        if (isStatusbarEntryPriority(priorityOrLocation)) {
            priority = priorityOrLocation;
        }
        else {
            priority = {
                primary: priorityOrLocation,
                secondary: hash(id), // derive from identifier to accomplish uniqueness
            };
        }
        // As long as we have not been created into a container yet, record all entries
        // that are pending so that they can get created at a later point
        if (!this.element) {
            return this.doAddPendingEntry(entry, id, alignment, priority);
        }
        // Otherwise add to view
        return this.doAddEntry(entry, id, alignment, priority);
    }
    doAddPendingEntry(entry, id, alignment, priority) {
        const pendingEntry = { entry, id, alignment, priority };
        this.pendingEntries.push(pendingEntry);
        const accessor = {
            update: (entry) => {
                if (pendingEntry.accessor) {
                    pendingEntry.accessor.update(entry);
                }
                else {
                    pendingEntry.entry = entry;
                }
            },
            dispose: () => {
                if (pendingEntry.accessor) {
                    pendingEntry.accessor.dispose();
                }
                else {
                    this.pendingEntries = this.pendingEntries.filter((entry) => entry !== pendingEntry);
                }
            },
        };
        return accessor;
    }
    doAddEntry(entry, id, alignment, priority) {
        const disposables = new DisposableStore();
        // View model item
        const itemContainer = this.doCreateStatusItem(id, alignment);
        const item = disposables.add(this.instantiationService.createInstance(StatusbarEntryItem, itemContainer, this.withEntryOverride(entry, id), this.hoverDelegate));
        // View model entry
        const viewModelEntry = new (class {
            constructor() {
                this.id = id;
                this.extensionId = entry.extensionId;
                this.alignment = alignment;
                this.priority = priority;
                this.container = itemContainer;
                this.labelContainer = item.labelContainer;
            }
            get name() {
                return item.name;
            }
            get hasCommand() {
                return item.hasCommand;
            }
        })();
        // Add to view model
        const { needsFullRefresh } = this.doAddOrRemoveModelEntry(viewModelEntry, true);
        if (needsFullRefresh) {
            this.appendStatusbarEntries();
        }
        else {
            this.appendStatusbarEntry(viewModelEntry);
        }
        let lastEntry = entry;
        const accessor = {
            update: (entry) => {
                lastEntry = entry;
                item.update(this.withEntryOverride(entry, id));
            },
            dispose: () => {
                const { needsFullRefresh } = this.doAddOrRemoveModelEntry(viewModelEntry, false);
                if (needsFullRefresh) {
                    this.appendStatusbarEntries();
                }
                else {
                    itemContainer.remove();
                    this.updateCompactEntries();
                }
                disposables.dispose();
            },
        };
        // React to overrides
        disposables.add(this.onDidOverrideEntry.event((overrideEntryId) => {
            if (overrideEntryId === id) {
                accessor.update(lastEntry);
            }
        }));
        return accessor;
    }
    doCreateStatusItem(id, alignment, ...extraClasses) {
        const itemContainer = $('.statusbar-item', { id });
        if (extraClasses) {
            itemContainer.classList.add(...extraClasses);
        }
        if (alignment === 1 /* StatusbarAlignment.RIGHT */) {
            itemContainer.classList.add('right');
        }
        else {
            itemContainer.classList.add('left');
        }
        return itemContainer;
    }
    doAddOrRemoveModelEntry(entry, add) {
        // Update model but remember previous entries
        const entriesBefore = this.viewModel.entries;
        if (add) {
            this.viewModel.add(entry);
        }
        else {
            this.viewModel.remove(entry);
        }
        const entriesAfter = this.viewModel.entries;
        // Apply operation onto the entries from before
        if (add) {
            entriesBefore.splice(entriesAfter.indexOf(entry), 0, entry);
        }
        else {
            entriesBefore.splice(entriesBefore.indexOf(entry), 1);
        }
        // Figure out if a full refresh is needed by comparing arrays
        const needsFullRefresh = !equals(entriesBefore, entriesAfter);
        return { needsFullRefresh };
    }
    isEntryVisible(id) {
        return !this.viewModel.isHidden(id);
    }
    updateEntryVisibility(id, visible) {
        if (visible) {
            this.viewModel.show(id);
        }
        else {
            this.viewModel.hide(id);
        }
    }
    focusNextEntry() {
        this.viewModel.focusNextEntry();
    }
    focusPreviousEntry() {
        this.viewModel.focusPreviousEntry();
    }
    isEntryFocused() {
        return this.viewModel.isEntryFocused();
    }
    focus(preserveEntryFocus = true) {
        this.getContainer()?.focus();
        const lastFocusedEntry = this.viewModel.lastFocusedEntry;
        if (preserveEntryFocus && lastFocusedEntry) {
            setTimeout(() => lastFocusedEntry.labelContainer.focus(), 0); // Need a timeout, for some reason without it the inner label container will not get focused
        }
    }
    createContentArea(parent) {
        this.element = parent;
        // Track focus within container
        const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
        StatusBarFocused.bindTo(scopedContextKeyService).set(true);
        // Left items container
        this.leftItemsContainer = $('.left-items.items-container');
        this.element.appendChild(this.leftItemsContainer);
        this.element.tabIndex = 0;
        // Right items container
        this.rightItemsContainer = $('.right-items.items-container');
        this.element.appendChild(this.rightItemsContainer);
        // Context menu support
        this._register(addDisposableListener(parent, EventType.CONTEXT_MENU, (e) => this.showContextMenu(e)));
        this._register(Gesture.addTarget(parent));
        this._register(addDisposableListener(parent, TouchEventType.Contextmenu, (e) => this.showContextMenu(e)));
        // Initial status bar entries
        this.createInitialStatusbarEntries();
        return this.element;
    }
    createInitialStatusbarEntries() {
        // Add items in order according to alignment
        this.appendStatusbarEntries();
        // Fill in pending entries if any
        while (this.pendingEntries.length) {
            const pending = this.pendingEntries.shift();
            if (pending) {
                pending.accessor = this.addEntry(pending.entry, pending.id, pending.alignment, pending.priority.primary);
            }
        }
    }
    appendStatusbarEntries() {
        const leftItemsContainer = assertIsDefined(this.leftItemsContainer);
        const rightItemsContainer = assertIsDefined(this.rightItemsContainer);
        // Clear containers
        clearNode(leftItemsContainer);
        clearNode(rightItemsContainer);
        // Append all
        for (const entry of [
            ...this.viewModel.getEntries(0 /* StatusbarAlignment.LEFT */),
            ...this.viewModel.getEntries(1 /* StatusbarAlignment.RIGHT */).reverse(), // reversing due to flex: row-reverse
        ]) {
            const target = entry.alignment === 0 /* StatusbarAlignment.LEFT */ ? leftItemsContainer : rightItemsContainer;
            target.appendChild(entry.container);
        }
        // Update compact entries
        this.updateCompactEntries();
    }
    appendStatusbarEntry(entry) {
        const entries = this.viewModel.getEntries(entry.alignment);
        if (entry.alignment === 1 /* StatusbarAlignment.RIGHT */) {
            entries.reverse(); // reversing due to flex: row-reverse
        }
        const target = assertIsDefined(entry.alignment === 0 /* StatusbarAlignment.LEFT */
            ? this.leftItemsContainer
            : this.rightItemsContainer);
        const index = entries.indexOf(entry);
        if (index + 1 === entries.length) {
            target.appendChild(entry.container); // append at the end if last
        }
        else {
            target.insertBefore(entry.container, entries[index + 1].container); // insert before next element otherwise
        }
        // Update compact entries
        this.updateCompactEntries();
    }
    updateCompactEntries() {
        const entries = this.viewModel.entries;
        // Find visible entries and clear compact related CSS classes if any
        const mapIdToVisibleEntry = new Map();
        for (const entry of entries) {
            if (!this.viewModel.isHidden(entry.id)) {
                mapIdToVisibleEntry.set(entry.id, entry);
            }
            entry.container.classList.remove('compact-left', 'compact-right');
        }
        // Figure out groups of entries with `compact` alignment
        const compactEntryGroups = new Map();
        for (const entry of mapIdToVisibleEntry.values()) {
            if (isStatusbarEntryLocation(entry.priority.primary) && // entry references another entry as location
                entry.priority.primary.compact // entry wants to be compact
            ) {
                const locationId = entry.priority.primary.location.id;
                const location = mapIdToVisibleEntry.get(locationId);
                if (!location) {
                    continue; // skip if location does not exist
                }
                // Build a map of entries that are compact among each other
                let compactEntryGroup = compactEntryGroups.get(locationId);
                if (!compactEntryGroup) {
                    // It is possible that this entry references another entry
                    // that itself references an entry. In that case, we want
                    // to add it to the entries of the referenced entry.
                    for (const group of compactEntryGroups.values()) {
                        if (group.has(locationId)) {
                            compactEntryGroup = group;
                            break;
                        }
                    }
                    if (!compactEntryGroup) {
                        compactEntryGroup = new Map();
                        compactEntryGroups.set(locationId, compactEntryGroup);
                    }
                }
                compactEntryGroup.set(entry.id, entry);
                compactEntryGroup.set(location.id, location);
                // Adjust CSS classes to move compact items closer together
                if (entry.priority.primary.alignment === 0 /* StatusbarAlignment.LEFT */) {
                    location.container.classList.add('compact-left');
                    entry.container.classList.add('compact-right');
                }
                else {
                    location.container.classList.add('compact-right');
                    entry.container.classList.add('compact-left');
                }
            }
        }
        // Install mouse listeners to update hover feedback for
        // all compact entries that belong to each other
        const statusBarItemHoverBackground = this.getColor(STATUS_BAR_ITEM_HOVER_BACKGROUND);
        const statusBarItemCompactHoverBackground = this.getColor(STATUS_BAR_ITEM_COMPACT_HOVER_BACKGROUND);
        this.compactEntriesDisposable.value = new DisposableStore();
        if (statusBarItemHoverBackground &&
            statusBarItemCompactHoverBackground &&
            !isHighContrast(this.theme.type)) {
            for (const [, compactEntryGroup] of compactEntryGroups) {
                for (const compactEntry of compactEntryGroup.values()) {
                    if (!compactEntry.hasCommand) {
                        continue; // only show hover feedback when we have a command
                    }
                    this.compactEntriesDisposable.value.add(addDisposableListener(compactEntry.labelContainer, EventType.MOUSE_OVER, () => {
                        compactEntryGroup.forEach((compactEntry) => (compactEntry.labelContainer.style.backgroundColor =
                            statusBarItemHoverBackground));
                        compactEntry.labelContainer.style.backgroundColor =
                            statusBarItemCompactHoverBackground;
                    }));
                    this.compactEntriesDisposable.value.add(addDisposableListener(compactEntry.labelContainer, EventType.MOUSE_OUT, () => {
                        compactEntryGroup.forEach((compactEntry) => (compactEntry.labelContainer.style.backgroundColor = ''));
                    }));
                }
            }
        }
    }
    showContextMenu(e) {
        EventHelper.stop(e, true);
        const event = new StandardMouseEvent(getWindow(this.element), e);
        let actions = undefined;
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => {
                actions = this.getContextMenuActions(event);
                return actions;
            },
            onHide: () => {
                if (actions) {
                    disposeIfDisposable(actions);
                }
            },
        });
    }
    getContextMenuActions(event) {
        const actions = [];
        // Provide an action to hide the status bar at last
        actions.push(toAction({
            id: ToggleStatusbarVisibilityAction.ID,
            label: localize('hideStatusBar', 'Hide Status Bar'),
            run: () => this.instantiationService.invokeFunction((accessor) => new ToggleStatusbarVisibilityAction().run(accessor)),
        }));
        actions.push(new Separator());
        // Show an entry per known status entry
        // Note: even though entries have an identifier, there can be multiple entries
        // having the same identifier (e.g. from extensions). So we make sure to only
        // show a single entry per identifier we handled.
        const handledEntries = new Set();
        for (const entry of this.viewModel.entries) {
            if (!handledEntries.has(entry.id)) {
                actions.push(new ToggleStatusbarEntryVisibilityAction(entry.id, entry.name, this.viewModel));
                handledEntries.add(entry.id);
            }
        }
        // Figure out if mouse is over an entry
        let statusEntryUnderMouse = undefined;
        for (let element = event.target; element; element = element.parentElement) {
            const entry = this.viewModel.findEntry(element);
            if (entry) {
                statusEntryUnderMouse = entry;
                break;
            }
        }
        if (statusEntryUnderMouse) {
            actions.push(new Separator());
            if (statusEntryUnderMouse.extensionId) {
                actions.push(this.instantiationService.createInstance(ManageExtensionAction, statusEntryUnderMouse.extensionId));
            }
            actions.push(new HideStatusbarEntryAction(statusEntryUnderMouse.id, statusEntryUnderMouse.name, this.viewModel));
        }
        return actions;
    }
    updateStyles() {
        super.updateStyles();
        const container = assertIsDefined(this.getContainer());
        const styleOverride = [...this.styleOverrides].sort((a, b) => a.priority - b.priority)[0];
        // Background / foreground colors
        const backgroundColor = this.getColor(styleOverride?.background ??
            (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */
                ? STATUS_BAR_BACKGROUND
                : STATUS_BAR_NO_FOLDER_BACKGROUND)) || '';
        container.style.backgroundColor = backgroundColor;
        const foregroundColor = this.getColor(styleOverride?.foreground ??
            (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */
                ? STATUS_BAR_FOREGROUND
                : STATUS_BAR_NO_FOLDER_FOREGROUND)) || '';
        container.style.color = foregroundColor;
        const itemBorderColor = this.getColor(STATUS_BAR_ITEM_FOCUS_BORDER);
        // Border color
        const borderColor = this.getColor(styleOverride?.border ??
            (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */
                ? STATUS_BAR_BORDER
                : STATUS_BAR_NO_FOLDER_BORDER)) || this.getColor(contrastBorder);
        if (borderColor) {
            container.classList.add('status-border-top');
            container.style.setProperty('--status-border-top-color', borderColor);
        }
        else {
            container.classList.remove('status-border-top');
            container.style.removeProperty('--status-border-top-color');
        }
        // Colors and focus outlines via dynamic stylesheet
        const statusBarFocusColor = this.getColor(STATUS_BAR_FOCUS_BORDER);
        if (!this.styleElement) {
            this.styleElement = createStyleSheet(container);
        }
        this.styleElement.textContent = `

				/* Status bar focus outline */
				.monaco-workbench .part.statusbar:focus {
					outline-color: ${statusBarFocusColor};
				}

				/* Status bar item focus outline */
				.monaco-workbench .part.statusbar > .items-container > .statusbar-item a:focus-visible {
					outline: 1px solid ${this.getColor(activeContrastBorder) ?? itemBorderColor};
					outline-offset: ${borderColor ? '-2px' : '-1px'};
				}

				/* Notification Beak */
				.monaco-workbench .part.statusbar > .items-container > .statusbar-item.has-beak > .status-bar-item-beak-container:before {
					border-bottom-color: ${backgroundColor};
				}
			`;
    }
    layout(width, height, top, left) {
        super.layout(width, height, top, left);
        super.layoutContents(width, height);
    }
    overrideStyle(style) {
        this.styleOverrides.add(style);
        this.updateStyles();
        return toDisposable(() => {
            this.styleOverrides.delete(style);
            this.updateStyles();
        });
    }
    toJSON() {
        return {
            type: "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */,
        };
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
};
StatusbarPart = StatusbarPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IWorkspaceContextService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IContextMenuService),
    __param(7, IContextKeyService)
], StatusbarPart);
let MainStatusbarPart = class MainStatusbarPart extends StatusbarPart {
    constructor(instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService) {
        super("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService);
    }
};
MainStatusbarPart = __decorate([
    __param(0, IInstantiationService),
    __param(1, IThemeService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextMenuService),
    __param(6, IContextKeyService)
], MainStatusbarPart);
export { MainStatusbarPart };
let AuxiliaryStatusbarPart = class AuxiliaryStatusbarPart extends StatusbarPart {
    static { AuxiliaryStatusbarPart_1 = this; }
    static { this.COUNTER = 1; }
    constructor(container, instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService) {
        const id = AuxiliaryStatusbarPart_1.COUNTER++;
        super(`workbench.parts.auxiliaryStatus.${id}`, instantiationService, themeService, contextService, storageService, layoutService, contextMenuService, contextKeyService);
        this.container = container;
        this.height = StatusbarPart.HEIGHT;
    }
};
AuxiliaryStatusbarPart = AuxiliaryStatusbarPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IWorkspaceContextService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IContextMenuService),
    __param(7, IContextKeyService)
], AuxiliaryStatusbarPart);
export { AuxiliaryStatusbarPart };
let StatusbarService = class StatusbarService extends MultiWindowParts {
    constructor(instantiationService, storageService, themeService) {
        super('workbench.statusBarService', themeService, storageService);
        this.instantiationService = instantiationService;
        this._onDidCreateAuxiliaryStatusbarPart = this._register(new Emitter());
        this.onDidCreateAuxiliaryStatusbarPart = this._onDidCreateAuxiliaryStatusbarPart.event;
        this.mainPart = this._register(this.instantiationService.createInstance(MainStatusbarPart));
        this._register(this.registerPart(this.mainPart));
        this.onDidChangeEntryVisibility = this.mainPart.onDidChangeEntryVisibility;
    }
    //#region Auxiliary Statusbar Parts
    createAuxiliaryStatusbarPart(container) {
        // Container
        const statusbarPartContainer = $('footer.part.statusbar', {
            role: 'status',
            'aria-live': 'off',
            tabIndex: '0',
        });
        statusbarPartContainer.style.position = 'relative';
        container.appendChild(statusbarPartContainer);
        // Statusbar Part
        const statusbarPart = this.instantiationService.createInstance(AuxiliaryStatusbarPart, statusbarPartContainer);
        const disposable = this.registerPart(statusbarPart);
        statusbarPart.create(statusbarPartContainer);
        Event.once(statusbarPart.onWillDispose)(() => disposable.dispose());
        // Emit internal event
        this._onDidCreateAuxiliaryStatusbarPart.fire(statusbarPart);
        return statusbarPart;
    }
    createScoped(statusbarEntryContainer, disposables) {
        return disposables.add(this.instantiationService.createInstance(ScopedStatusbarService, statusbarEntryContainer));
    }
    addEntry(entry, id, alignment, priorityOrLocation = 0) {
        if (entry.showInAllWindows) {
            return this.doAddEntryToAllWindows(entry, id, alignment, priorityOrLocation);
        }
        return this.mainPart.addEntry(entry, id, alignment, priorityOrLocation);
    }
    doAddEntryToAllWindows(originalEntry, id, alignment, priorityOrLocation = 0) {
        const entryDisposables = new DisposableStore();
        const accessors = new Set();
        let entry = originalEntry;
        function addEntry(part) {
            const partDisposables = new DisposableStore();
            partDisposables.add(part.onWillDispose(() => partDisposables.dispose()));
            const accessor = partDisposables.add(part.addEntry(entry, id, alignment, priorityOrLocation));
            accessors.add(accessor);
            partDisposables.add(toDisposable(() => accessors.delete(accessor)));
            entryDisposables.add(partDisposables);
            partDisposables.add(toDisposable(() => entryDisposables.delete(partDisposables)));
        }
        for (const part of this.parts) {
            addEntry(part);
        }
        entryDisposables.add(this.onDidCreateAuxiliaryStatusbarPart((part) => addEntry(part)));
        return {
            update: (updatedEntry) => {
                entry = updatedEntry;
                for (const update of accessors) {
                    update.update(updatedEntry);
                }
            },
            dispose: () => entryDisposables.dispose(),
        };
    }
    isEntryVisible(id) {
        return this.mainPart.isEntryVisible(id);
    }
    updateEntryVisibility(id, visible) {
        for (const part of this.parts) {
            part.updateEntryVisibility(id, visible);
        }
    }
    overrideEntry(id, override) {
        const disposables = new DisposableStore();
        for (const part of this.parts) {
            disposables.add(part.overrideEntry(id, override));
        }
        return disposables;
    }
    focus(preserveEntryFocus) {
        this.activePart.focus(preserveEntryFocus);
    }
    focusNextEntry() {
        this.activePart.focusNextEntry();
    }
    focusPreviousEntry() {
        this.activePart.focusPreviousEntry();
    }
    isEntryFocused() {
        return this.activePart.isEntryFocused();
    }
    overrideStyle(style) {
        const disposables = new DisposableStore();
        for (const part of this.parts) {
            disposables.add(part.overrideStyle(style));
        }
        return disposables;
    }
};
StatusbarService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IStorageService),
    __param(2, IThemeService)
], StatusbarService);
export { StatusbarService };
let ScopedStatusbarService = class ScopedStatusbarService extends Disposable {
    constructor(statusbarEntryContainer, statusbarService) {
        super();
        this.statusbarEntryContainer = statusbarEntryContainer;
        this.statusbarService = statusbarService;
        this.onDidChangeEntryVisibility = this.statusbarEntryContainer.onDidChangeEntryVisibility;
    }
    createAuxiliaryStatusbarPart(container) {
        return this.statusbarService.createAuxiliaryStatusbarPart(container);
    }
    createScoped(statusbarEntryContainer, disposables) {
        return this.statusbarService.createScoped(statusbarEntryContainer, disposables);
    }
    getPart() {
        return this.statusbarEntryContainer;
    }
    addEntry(entry, id, alignment, priorityOrLocation = 0) {
        return this.statusbarEntryContainer.addEntry(entry, id, alignment, priorityOrLocation);
    }
    isEntryVisible(id) {
        return this.statusbarEntryContainer.isEntryVisible(id);
    }
    updateEntryVisibility(id, visible) {
        this.statusbarEntryContainer.updateEntryVisibility(id, visible);
    }
    overrideEntry(id, override) {
        return this.statusbarEntryContainer.overrideEntry(id, override);
    }
    focus(preserveEntryFocus) {
        this.statusbarEntryContainer.focus(preserveEntryFocus);
    }
    focusNextEntry() {
        this.statusbarEntryContainer.focusNextEntry();
    }
    focusPreviousEntry() {
        this.statusbarEntryContainer.focusPreviousEntry();
    }
    isEntryFocused() {
        return this.statusbarEntryContainer.isEntryFocused();
    }
    overrideStyle(style) {
        return this.statusbarEntryContainer.overrideStyle(style);
    }
};
ScopedStatusbarService = __decorate([
    __param(1, IStatusbarService)
], ScopedStatusbarService);
export { ScopedStatusbarService };
registerSingleton(IStatusbarService, StatusbarService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3N0YXR1c2Jhci9zdGF0dXNiYXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixtQkFBbUIsRUFFbkIsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDdEQsT0FBTyxFQUNOLFNBQVMsSUFBSSxjQUFjLEVBQzNCLE9BQU8sR0FFUCxNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsRUFJakIsd0JBQXdCLEVBRXhCLHdCQUF3QixHQUV4QixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBVyxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLCtCQUErQixFQUMvQixnQ0FBZ0MsRUFDaEMsaUJBQWlCLEVBQ2pCLCtCQUErQixFQUMvQiwyQkFBMkIsRUFDM0Isd0NBQXdDLEVBQ3hDLDRCQUE0QixFQUM1Qix1QkFBdUIsR0FDdkIsTUFBTSwwQkFB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