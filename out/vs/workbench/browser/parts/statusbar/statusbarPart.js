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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvc3RhdHVzYmFyL3N0YXR1c2JhclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLG1CQUFtQixFQUVuQixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sU0FBUyxJQUFJLGNBQWMsRUFDM0IsT0FBTyxHQUVQLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGlCQUFpQixFQUlqQix3QkFBd0IsRUFFeEIsd0JBQXdCLEdBRXhCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFXLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIsK0JBQStCLEVBQy9CLGdDQUFnQyxFQUNoQyxpQkFBaUIsRUFDakIsK0JBQStCLEVBQy9CLDJCQUEyQixFQUMzQix3Q0FBd0MsRUFDeEMsNEJBQTRCLEVBQzVCLHVCQUF1QixHQUN2QixNQUFN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