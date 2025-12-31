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
var MultiEditorTabsControl_1;
import './media/multieditortabscontrol.css';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { shorten } from '../../../../base/common/labels.js';
import { EditorResourceAccessor, SideBySideEditor, DEFAULT_EDITOR_ASSOCIATION, preventEditorClose, EditorCloseMethod, } from '../../../common/editor.js';
import { computeEditorAriaLabel } from '../../editor.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { EventType as TouchEventType, Gesture, } from '../../../../base/browser/touch.js';
import { ResourceLabels, DEFAULT_LABELS_CONTAINER } from '../../labels.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { EditorCommandsContextActionRunner, EditorTabsControl } from './editorTabsControl.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { dispose, DisposableStore, combinedDisposable, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { ScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { getOrSet } from '../../../../base/common/map.js';
import { IThemeService, registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { TAB_INACTIVE_BACKGROUND, TAB_ACTIVE_BACKGROUND, TAB_BORDER, EDITOR_DRAG_AND_DROP_BACKGROUND, TAB_UNFOCUSED_ACTIVE_BACKGROUND, TAB_UNFOCUSED_ACTIVE_BORDER, TAB_ACTIVE_BORDER, TAB_HOVER_BACKGROUND, TAB_HOVER_BORDER, TAB_UNFOCUSED_HOVER_BACKGROUND, TAB_UNFOCUSED_HOVER_BORDER, EDITOR_GROUP_HEADER_TABS_BACKGROUND, WORKBENCH_BACKGROUND, TAB_ACTIVE_BORDER_TOP, TAB_UNFOCUSED_ACTIVE_BORDER_TOP, TAB_ACTIVE_MODIFIED_BORDER, TAB_INACTIVE_MODIFIED_BORDER, TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER, TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER, TAB_UNFOCUSED_INACTIVE_BACKGROUND, TAB_HOVER_FOREGROUND, TAB_UNFOCUSED_HOVER_FOREGROUND, EDITOR_GROUP_HEADER_TABS_BORDER, TAB_LAST_PINNED_BORDER, TAB_SELECTED_BORDER_TOP, } from '../../../common/theme.js';
import { activeContrastBorder, contrastBorder, editorBackground, } from '../../../../platform/theme/common/colorRegistry.js';
import { ResourcesDropHandler, DraggedEditorIdentifier, DraggedEditorGroupIdentifier, extractTreeDropData, isWindowDraggedOver, } from '../../dnd.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { addDisposableListener, EventType, EventHelper, Dimension, scheduleAtNextAnimationFrame, findParentWithClass, clearNode, DragAndDropObserver, isMouseEvent, getWindow, $, } from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { prepareMoveCopyEditors, } from './editor.js';
import { CloseEditorTabAction, UnpinEditorAction } from './editorActions.js';
import { assertAllDefined, assertIsDefined } from '../../../../base/common/types.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { basenameOrAuthority } from '../../../../base/common/resources.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { win32, posix } from '../../../../base/common/path.js';
import { coalesce, insert } from '../../../../base/common/arrays.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { isSafari } from '../../../../base/browser/browser.js';
import { equals } from '../../../../base/common/objects.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { UNLOCK_GROUP_COMMAND_ID } from './editorCommands.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { ITreeViewsDnDService } from '../../../../editor/common/services/treeViewsDndService.js';
import { DraggedTreeItemsIdentifier } from '../../../../editor/common/services/treeViewsDnd.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { StickyEditorGroupModel, UnstickyEditorGroupModel, } from '../../../common/editor/filteredEditorGroupModel.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
let MultiEditorTabsControl = class MultiEditorTabsControl extends EditorTabsControl {
    static { MultiEditorTabsControl_1 = this; }
    static { this.SCROLLBAR_SIZES = {
        default: 3,
        large: 10,
    }; }
    static { this.TAB_WIDTH = {
        compact: 38,
        shrink: 80,
        fit: 120,
    }; }
    static { this.DRAG_OVER_OPEN_TAB_THRESHOLD = 1500; }
    static { this.MOUSE_WHEEL_EVENT_THRESHOLD = 150; }
    static { this.MOUSE_WHEEL_DISTANCE_THRESHOLD = 1.5; }
    constructor(parent, editorPartsView, groupsView, groupView, tabsModel, contextMenuService, instantiationService, contextKeyService, keybindingService, notificationService, quickInputService, themeService, editorService, pathService, treeViewsDragAndDropService, editorResolverService, hostService) {
        super(parent, editorPartsView, groupsView, groupView, tabsModel, contextMenuService, instantiationService, contextKeyService, keybindingService, notificationService, quickInputService, themeService, editorResolverService, hostService);
        this.editorService = editorService;
        this.pathService = pathService;
        this.treeViewsDragAndDropService = treeViewsDragAndDropService;
        this.closeEditorAction = this._register(this.instantiationService.createInstance(CloseEditorTabAction, CloseEditorTabAction.ID, CloseEditorTabAction.LABEL));
        this.unpinEditorAction = this._register(this.instantiationService.createInstance(UnpinEditorAction, UnpinEditorAction.ID, UnpinEditorAction.LABEL));
        this.tabResourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER));
        this.tabLabels = [];
        this.tabActionBars = [];
        this.tabDisposables = [];
        this.dimensions = {
            container: Dimension.None,
            available: Dimension.None,
        };
        this.layoutScheduler = this._register(new MutableDisposable());
        this.path = isWindows ? win32 : posix;
        this.lastMouseWheelEventTime = 0;
        this.isMouseOverTabs = false;
        this.updateEditorLabelScheduler = this._register(new RunOnceScheduler(() => this.doUpdateEditorLabels(), 0));
        (async () => (this.path = await this.pathService.path))();
        // React to decorations changing for our resource labels
        this._register(this.tabResourceLabels.onDidChangeDecorations(() => this.doHandleDecorationsChange()));
    }
    create(parent) {
        super.create(parent);
        this.titleContainer = parent;
        // Tabs and Actions Container (are on a single row with flex side-by-side)
        this.tabsAndActionsContainer = $('.tabs-and-actions-container');
        this.titleContainer.appendChild(this.tabsAndActionsContainer);
        // Tabs Container
        this.tabsContainer = $('.tabs-container', {
            role: 'tablist',
            draggable: true,
        });
        this._register(Gesture.addTarget(this.tabsContainer));
        this.tabSizingFixedDisposables = this._register(new DisposableStore());
        this.updateTabSizing(false);
        // Tabs Scrollbar
        this.tabsScrollbar = this.createTabsScrollbar(this.tabsContainer);
        this.tabsAndActionsContainer.appendChild(this.tabsScrollbar.getDomNode());
        // Tabs Container listeners
        this.registerTabsContainerListeners(this.tabsContainer, this.tabsScrollbar);
        // Create Editor Toolbar
        this.createEditorActionsToolBar(this.tabsAndActionsContainer, ['editor-actions']);
        // Set tabs control visibility
        this.updateTabsControlVisibility();
        return this.tabsAndActionsContainer;
    }
    createTabsScrollbar(scrollable) {
        const tabsScrollbar = this._register(new ScrollableElement(scrollable, {
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            horizontalScrollbarSize: this.getTabsScrollbarSizing(),
            vertical: 2 /* ScrollbarVisibility.Hidden */,
            scrollYToX: true,
            useShadows: false,
        }));
        this._register(tabsScrollbar.onScroll((e) => {
            if (e.scrollLeftChanged) {
                scrollable.scrollLeft = e.scrollLeft;
            }
        }));
        return tabsScrollbar;
    }
    updateTabsScrollbarSizing() {
        this.tabsScrollbar?.updateOptions({
            horizontalScrollbarSize: this.getTabsScrollbarSizing(),
        });
    }
    updateTabSizing(fromEvent) {
        const [tabsContainer, tabSizingFixedDisposables] = assertAllDefined(this.tabsContainer, this.tabSizingFixedDisposables);
        tabSizingFixedDisposables.clear();
        const options = this.groupsView.partOptions;
        if (options.tabSizing === 'fixed') {
            tabsContainer.style.setProperty('--tab-sizing-fixed-min-width', `${options.tabSizingFixedMinWidth}px`);
            tabsContainer.style.setProperty('--tab-sizing-fixed-max-width', `${options.tabSizingFixedMaxWidth}px`);
            // For https://github.com/microsoft/vscode/issues/40290 we want to
            // preserve the current tab widths as long as the mouse is over the
            // tabs so that you can quickly close them via mouse click. For that
            // we track mouse movements over the tabs container.
            tabSizingFixedDisposables.add(addDisposableListener(tabsContainer, EventType.MOUSE_ENTER, () => {
                this.isMouseOverTabs = true;
            }));
            tabSizingFixedDisposables.add(addDisposableListener(tabsContainer, EventType.MOUSE_LEAVE, () => {
                this.isMouseOverTabs = false;
                this.updateTabsFixedWidth(false);
            }));
        }
        else if (fromEvent) {
            tabsContainer.style.removeProperty('--tab-sizing-fixed-min-width');
            tabsContainer.style.removeProperty('--tab-sizing-fixed-max-width');
            this.updateTabsFixedWidth(false);
        }
    }
    updateTabsFixedWidth(fixed) {
        this.forEachTab((editor, tabIndex, tabContainer) => {
            if (fixed) {
                const { width } = tabContainer.getBoundingClientRect();
                tabContainer.style.setProperty('--tab-sizing-current-width', `${width}px`);
            }
            else {
                tabContainer.style.removeProperty('--tab-sizing-current-width');
            }
        });
    }
    getTabsScrollbarSizing() {
        if (this.groupsView.partOptions.titleScrollbarSizing !== 'large') {
            return MultiEditorTabsControl_1.SCROLLBAR_SIZES.default;
        }
        return MultiEditorTabsControl_1.SCROLLBAR_SIZES.large;
    }
    registerTabsContainerListeners(tabsContainer, tabsScrollbar) {
        // Forward scrolling inside the container to our custom scrollbar
        this._register(addDisposableListener(tabsContainer, EventType.SCROLL, () => {
            if (tabsContainer.classList.contains('scroll')) {
                tabsScrollbar.setScrollPosition({
                    scrollLeft: tabsContainer.scrollLeft, // during DND the container gets scrolled so we need to update the custom scrollbar
                });
            }
        }));
        // New file when double-clicking on tabs container (but not tabs)
        for (const eventType of [TouchEventType.Tap, EventType.DBLCLICK]) {
            this._register(addDisposableListener(tabsContainer, eventType, (e) => {
                if (eventType === EventType.DBLCLICK) {
                    if (e.target !== tabsContainer) {
                        return; // ignore if target is not tabs container
                    }
                }
                else {
                    if (e.tapCount !== 2) {
                        return; // ignore single taps
                    }
                    if (e.initialTarget !== tabsContainer) {
                        return; // ignore if target is not tabs container
                    }
                }
                EventHelper.stop(e);
                this.editorService.openEditor({
                    resource: undefined,
                    options: {
                        pinned: true,
                        index: this.groupView.count, // always at the end
                        override: DEFAULT_EDITOR_ASSOCIATION.id,
                    },
                }, this.groupView.id);
            }));
        }
        // Prevent auto-scrolling (https://github.com/microsoft/vscode/issues/16690)
        this._register(addDisposableListener(tabsContainer, EventType.MOUSE_DOWN, (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        }));
        // Prevent auto-pasting (https://github.com/microsoft/vscode/issues/201696)
        if (isLinux) {
            this._register(addDisposableListener(tabsContainer, EventType.MOUSE_UP, (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                }
            }));
        }
        // Drag & Drop support
        let lastDragEvent = undefined;
        let isNewWindowOperation = false;
        this._register(new DragAndDropObserver(tabsContainer, {
            onDragStart: (e) => {
                isNewWindowOperation = this.onGroupDragStart(e, tabsContainer);
            },
            onDrag: (e) => {
                lastDragEvent = e;
            },
            onDragEnter: (e) => {
                // Always enable support to scroll while dragging
                tabsContainer.classList.add('scroll');
                // Return if the target is not on the tabs container
                if (e.target !== tabsContainer) {
                    return;
                }
                // Return if transfer is unsupported
                if (!this.isSupportedDropTransfer(e)) {
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'none';
                    }
                    return;
                }
                // Update the dropEffect to "copy" if there is no local data to be dragged because
                // in that case we can only copy the data into and not move it from its source
                if (!this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'copy';
                    }
                }
                this.updateDropFeedback(tabsContainer, true, e);
            },
            onDragLeave: (e) => {
                this.updateDropFeedback(tabsContainer, false, e);
                tabsContainer.classList.remove('scroll');
            },
            onDragEnd: (e) => {
                this.updateDropFeedback(tabsContainer, false, e);
                tabsContainer.classList.remove('scroll');
                this.onGroupDragEnd(e, lastDragEvent, tabsContainer, isNewWindowOperation);
            },
            onDrop: (e) => {
                this.updateDropFeedback(tabsContainer, false, e);
                tabsContainer.classList.remove('scroll');
                if (e.target === tabsContainer) {
                    const isGroupTransfer = this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype);
                    this.onDrop(e, isGroupTransfer ? this.groupView.count : this.tabsModel.count, tabsContainer);
                }
            },
        }));
        // Mouse-wheel support to switch to tabs optionally
        this._register(addDisposableListener(tabsContainer, EventType.MOUSE_WHEEL, (e) => {
            const activeEditor = this.groupView.activeEditor;
            if (!activeEditor || this.groupView.count < 2) {
                return; // need at least 2 open editors
            }
            // Shift-key enables or disables this behaviour depending on the setting
            if (this.groupsView.partOptions.scrollToSwitchTabs === true) {
                if (e.shiftKey) {
                    return; // 'on': only enable this when Shift-key is not pressed
                }
            }
            else {
                if (!e.shiftKey) {
                    return; // 'off': only enable this when Shift-key is pressed
                }
            }
            // Ignore event if the last one happened too recently (https://github.com/microsoft/vscode/issues/96409)
            // The restriction is relaxed according to the absolute value of `deltaX` and `deltaY`
            // to support discrete (mouse wheel) and contiguous scrolling (touchpad) equally well
            const now = Date.now();
            if (now - this.lastMouseWheelEventTime <
                MultiEditorTabsControl_1.MOUSE_WHEEL_EVENT_THRESHOLD -
                    2 * (Math.abs(e.deltaX) + Math.abs(e.deltaY))) {
                return;
            }
            this.lastMouseWheelEventTime = now;
            // Figure out scrolling direction but ignore it if too subtle
            let tabSwitchDirection;
            if (e.deltaX + e.deltaY < -MultiEditorTabsControl_1.MOUSE_WHEEL_DISTANCE_THRESHOLD) {
                tabSwitchDirection = -1;
            }
            else if (e.deltaX + e.deltaY > MultiEditorTabsControl_1.MOUSE_WHEEL_DISTANCE_THRESHOLD) {
                tabSwitchDirection = 1;
            }
            else {
                return;
            }
            const nextEditor = this.groupView.getEditorByIndex(this.groupView.getIndexOfEditor(activeEditor) + tabSwitchDirection);
            if (!nextEditor) {
                return;
            }
            // Open it
            this.groupView.openEditor(nextEditor);
            // Disable normal scrolling, opening the editor will already reveal it properly
            EventHelper.stop(e, true);
        }));
        // Context menu
        const showContextMenu = (e) => {
            EventHelper.stop(e);
            // Find target anchor
            let anchor = tabsContainer;
            if (isMouseEvent(e)) {
                anchor = new StandardMouseEvent(getWindow(this.parent), e);
            }
            // Show it
            this.contextMenuService.showContextMenu({
                getAnchor: () => anchor,
                menuId: MenuId.EditorTabsBarContext,
                contextKeyService: this.contextKeyService,
                menuActionOptions: { shouldForwardArgs: true },
                getActionsContext: () => ({ groupId: this.groupView.id }),
                getKeyBinding: (action) => this.getKeybinding(action),
                onHide: () => this.groupView.focus(),
            });
        };
        this._register(addDisposableListener(tabsContainer, TouchEventType.Contextmenu, (e) => showContextMenu(e)));
        this._register(addDisposableListener(tabsContainer, EventType.CONTEXT_MENU, (e) => showContextMenu(e)));
    }
    doHandleDecorationsChange() {
        // A change to decorations potentially has an impact on the size of tabs
        // so we need to trigger a layout in that case to adjust things
        this.layout(this.dimensions);
    }
    updateEditorActionsToolbar() {
        super.updateEditorActionsToolbar();
        // Changing the actions in the toolbar can have an impact on the size of the
        // tab container, so we need to layout the tabs to make sure the active is visible
        this.layout(this.dimensions);
    }
    openEditor(editor, options) {
        const changed = this.handleOpenedEditors();
        // Respect option to focus tab control if provided
        if (options?.focusTabControl) {
            this.withTab(editor, (editor, tabIndex, tabContainer) => tabContainer.focus());
        }
        return changed;
    }
    openEditors(editors) {
        return this.handleOpenedEditors();
    }
    handleOpenedEditors() {
        // Set tabs control visibility
        this.updateTabsControlVisibility();
        // Create tabs as needed
        const [tabsContainer, tabsScrollbar] = assertAllDefined(this.tabsContainer, this.tabsScrollbar);
        for (let i = tabsContainer.children.length; i < this.tabsModel.count; i++) {
            tabsContainer.appendChild(this.createTab(i, tabsContainer, tabsScrollbar));
        }
        // Make sure to recompute tab labels and detect
        // if a label change occurred that requires a
        // redraw of tabs.
        const activeEditorChanged = this.didActiveEditorChange();
        const oldTabLabels = this.tabLabels;
        this.computeTabLabels();
        // Redraw and update in these cases
        let didChange = false;
        if (activeEditorChanged || // active editor changed
            oldTabLabels.length !== this.tabLabels.length || // number of tabs changed
            oldTabLabels.some((label, index) => !this.equalsEditorInputLabel(label, this.tabLabels.at(index))) // editor labels changed
        ) {
            this.redraw({ forceRevealActiveTab: true });
            didChange = true;
        }
        // Otherwise only layout for revealing
        else {
            this.layout(this.dimensions, { forceRevealActiveTab: true });
        }
        return didChange;
    }
    didActiveEditorChange() {
        if ((!this.activeTabLabel?.editor && this.tabsModel.activeEditor) || // active editor changed from null => editor
            (this.activeTabLabel?.editor && !this.tabsModel.activeEditor) || // active editor changed from editor => null
            !this.activeTabLabel?.editor ||
            !this.tabsModel.isActive(this.activeTabLabel.editor) // active editor changed from editorA => editorB
        ) {
            return true;
        }
        return false;
    }
    equalsEditorInputLabel(labelA, labelB) {
        if (labelA === labelB) {
            return true;
        }
        if (!labelA || !labelB) {
            return false;
        }
        return (labelA.name === labelB.name &&
            labelA.description === labelB.description &&
            labelA.forceDescription === labelB.forceDescription &&
            labelA.title === labelB.title &&
            labelA.ariaLabel === labelB.ariaLabel);
    }
    beforeCloseEditor(editor) {
        // Fix tabs width if the mouse is over tabs and before closing
        // a tab (except the last tab) when tab sizing is 'fixed'.
        // This helps keeping the close button stable under
        // the mouse and allows for rapid closing of tabs.
        if (this.isMouseOverTabs && this.groupsView.partOptions.tabSizing === 'fixed') {
            const closingLastTab = this.tabsModel.isLast(editor);
            this.updateTabsFixedWidth(!closingLastTab);
        }
    }
    closeEditor(editor) {
        this.handleClosedEditors();
    }
    closeEditors(editors) {
        this.handleClosedEditors();
    }
    handleClosedEditors() {
        // There are tabs to show
        if (this.tabsModel.count) {
            // Remove tabs that got closed
            const tabsContainer = assertIsDefined(this.tabsContainer);
            while (tabsContainer.children.length > this.tabsModel.count) {
                // Remove one tab from container (must be the last to keep indexes in order!)
                tabsContainer.lastChild?.remove();
                // Remove associated tab label and widget
                dispose(this.tabDisposables.pop());
            }
            // A removal of a label requires to recompute all labels
            this.computeTabLabels();
            // Redraw all tabs
            this.redraw({ forceRevealActiveTab: true });
        }
        // No tabs to show
        else {
            if (this.tabsContainer) {
                clearNode(this.tabsContainer);
            }
            this.tabDisposables = dispose(this.tabDisposables);
            this.tabResourceLabels.clear();
            this.tabLabels = [];
            this.activeTabLabel = undefined;
            this.tabActionBars = [];
            this.clearEditorActionsToolbar();
            this.updateTabsControlVisibility();
        }
    }
    moveEditor(editor, fromTabIndex, targeTabIndex) {
        // Move the editor label
        const editorLabel = this.tabLabels[fromTabIndex];
        this.tabLabels.splice(fromTabIndex, 1);
        this.tabLabels.splice(targeTabIndex, 0, editorLabel);
        // Redraw tabs in the range of the move
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => {
            this.redrawTab(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar);
        }, Math.min(fromTabIndex, targeTabIndex), // from: smallest of fromTabIndex/targeTabIndex
        Math.max(fromTabIndex, targeTabIndex));
        // Moving an editor requires a layout to keep the active editor visible
        this.layout(this.dimensions, { forceRevealActiveTab: true });
    }
    pinEditor(editor) {
        this.withTab(editor, (editor, tabIndex, tabContainer, tabLabelWidget, tabLabel) => this.redrawTabLabel(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel));
    }
    stickEditor(editor) {
        this.doHandleStickyEditorChange(editor);
    }
    unstickEditor(editor) {
        this.doHandleStickyEditorChange(editor);
    }
    doHandleStickyEditorChange(editor) {
        // Update tab
        this.withTab(editor, (editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => this.redrawTab(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar));
        // Sticky change has an impact on each tab's border because
        // it potentially moves the border to the last pinned tab
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel) => {
            this.redrawTabBorders(tabIndex, tabContainer);
        });
        // A change to the sticky state requires a layout to keep the active editor visible
        this.layout(this.dimensions, { forceRevealActiveTab: true });
    }
    setActive(isGroupActive) {
        // Activity has an impact on each tab's active indication
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => {
            this.redrawTabSelectedActiveAndDirty(isGroupActive, editor, tabContainer, tabActionBar);
        });
        // Activity has an impact on the toolbar, so we need to update and layout
        this.updateEditorActionsToolbar();
        this.layout(this.dimensions, { forceRevealActiveTab: true });
    }
    updateEditorSelections() {
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => {
            this.redrawTabSelectedActiveAndDirty(this.groupsView.activeGroup === this.groupView, editor, tabContainer, tabActionBar);
        });
    }
    updateEditorLabel(editor) {
        // Update all labels to account for changes to tab labels
        // Since this method may be called a lot of times from
        // individual editors, we collect all those requests and
        // then run the update once because we have to update
        // all opened tabs in the group at once.
        this.updateEditorLabelScheduler.schedule();
    }
    doUpdateEditorLabels() {
        // A change to a label requires to recompute all labels
        this.computeTabLabels();
        // As such we need to redraw each label
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel) => {
            this.redrawTabLabel(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel);
        });
        // A change to a label requires a layout to keep the active editor visible
        this.layout(this.dimensions);
    }
    updateEditorDirty(editor) {
        this.withTab(editor, (editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => this.redrawTabSelectedActiveAndDirty(this.groupsView.activeGroup === this.groupView, editor, tabContainer, tabActionBar));
    }
    updateOptions(oldOptions, newOptions) {
        super.updateOptions(oldOptions, newOptions);
        // A change to a label format options requires to recompute all labels
        if (oldOptions.labelFormat !== newOptions.labelFormat) {
            this.computeTabLabels();
        }
        // Update tabs scrollbar sizing
        if (oldOptions.titleScrollbarSizing !== newOptions.titleScrollbarSizing) {
            this.updateTabsScrollbarSizing();
        }
        // Update editor actions
        if (oldOptions.alwaysShowEditorActions !== newOptions.alwaysShowEditorActions) {
            this.updateEditorActionsToolbar();
        }
        // Update tabs sizing
        if (oldOptions.tabSizingFixedMinWidth !== newOptions.tabSizingFixedMinWidth ||
            oldOptions.tabSizingFixedMaxWidth !== newOptions.tabSizingFixedMaxWidth ||
            oldOptions.tabSizing !== newOptions.tabSizing) {
            this.updateTabSizing(true);
        }
        // Redraw tabs when other options change
        if (oldOptions.labelFormat !== newOptions.labelFormat ||
            oldOptions.tabActionLocation !== newOptions.tabActionLocation ||
            oldOptions.tabActionCloseVisibility !== newOptions.tabActionCloseVisibility ||
            oldOptions.tabActionUnpinVisibility !== newOptions.tabActionUnpinVisibility ||
            oldOptions.tabSizing !== newOptions.tabSizing ||
            oldOptions.pinnedTabSizing !== newOptions.pinnedTabSizing ||
            oldOptions.showIcons !== newOptions.showIcons ||
            oldOptions.hasIcons !== newOptions.hasIcons ||
            oldOptions.highlightModifiedTabs !== newOptions.highlightModifiedTabs ||
            oldOptions.wrapTabs !== newOptions.wrapTabs ||
            !equals(oldOptions.decorations, newOptions.decorations)) {
            this.redraw();
        }
    }
    updateStyles() {
        this.redraw();
    }
    forEachTab(fn, fromTabIndex, toTabIndex) {
        this.tabsModel
            .getEditors(1 /* EditorsOrder.SEQUENTIAL */)
            .forEach((editor, tabIndex) => {
            if (typeof fromTabIndex === 'number' && fromTabIndex > tabIndex) {
                return; // do nothing if we are not yet at `fromIndex`
            }
            if (typeof toTabIndex === 'number' && toTabIndex < tabIndex) {
                return; // do nothing if we are beyond `toIndex`
            }
            this.doWithTab(tabIndex, editor, fn);
        });
    }
    withTab(editor, fn) {
        this.doWithTab(this.tabsModel.indexOf(editor), editor, fn);
    }
    doWithTab(tabIndex, editor, fn) {
        const tabsContainer = assertIsDefined(this.tabsContainer);
        const tabContainer = tabsContainer.children[tabIndex];
        const tabResourceLabel = this.tabResourceLabels.get(tabIndex);
        const tabLabel = this.tabLabels[tabIndex];
        const tabActionBar = this.tabActionBars[tabIndex];
        if (tabContainer && tabResourceLabel && tabLabel) {
            fn(editor, tabIndex, tabContainer, tabResourceLabel, tabLabel, tabActionBar);
        }
    }
    createTab(tabIndex, tabsContainer, tabsScrollbar) {
        // Tab Container
        const tabContainer = $('.tab', {
            draggable: true,
            role: 'tab',
        });
        // Gesture Support
        this._register(Gesture.addTarget(tabContainer));
        // Tab Border Top
        const tabBorderTopContainer = $('.tab-border-top-container');
        tabContainer.appendChild(tabBorderTopContainer);
        // Tab Editor Label
        const editorLabel = this.tabResourceLabels.create(tabContainer, {
            hoverTargetOverride: tabContainer,
        });
        // Tab Actions
        const tabActionsContainer = $('.tab-actions');
        tabContainer.appendChild(tabActionsContainer);
        const that = this;
        const tabActionRunner = new EditorCommandsContextActionRunner({
            groupId: this.groupView.id,
            get editorIndex() {
                return that.toEditorIndex(tabIndex);
            },
        });
        const tabActionBar = new ActionBar(tabActionsContainer, {
            ariaLabel: localize('ariaLabelTabActions', 'Tab actions'),
            actionRunner: tabActionRunner,
        });
        const tabActionListener = tabActionBar.onWillRun((e) => {
            if (e.action.id === this.closeEditorAction.id) {
                this.blockRevealActiveTabOnce();
            }
        });
        const tabActionBarDisposable = combinedDisposable(tabActionRunner, tabActionBar, tabActionListener, toDisposable(insert(this.tabActionBars, tabActionBar)));
        // Tab Fade Hider
        // Hides the tab fade to the right when tab action left and sizing shrink/fixed, ::after, ::before are already used
        const tabShadowHider = $('.tab-fade-hider');
        tabContainer.appendChild(tabShadowHider);
        // Tab Border Bottom
        const tabBorderBottomContainer = $('.tab-border-bottom-container');
        tabContainer.appendChild(tabBorderBottomContainer);
        // Eventing
        const eventsDisposable = this.registerTabListeners(tabContainer, tabIndex, tabsContainer, tabsScrollbar);
        this.tabDisposables.push(combinedDisposable(eventsDisposable, tabActionBarDisposable, tabActionRunner, editorLabel));
        return tabContainer;
    }
    toEditorIndex(tabIndex) {
        // Given a `tabIndex` that is relative to the tabs model
        // returns the `editorIndex` relative to the entire group
        const editor = assertIsDefined(this.tabsModel.getEditorByIndex(tabIndex));
        return this.groupView.getIndexOfEditor(editor);
    }
    registerTabListeners(tab, tabIndex, tabsContainer, tabsScrollbar) {
        const disposables = new DisposableStore();
        const handleClickOrTouch = async (e, preserveFocus) => {
            tab.blur(); // prevent flicker of focus outline on tab until editor got focus
            if (isMouseEvent(e) &&
                (e.button !== 0 /* middle/right mouse button */ ||
                    (isMacintosh && e.ctrlKey) /* macOS context menu */)) {
                if (e.button === 1) {
                    e.preventDefault(); // required to prevent auto-scrolling (https://github.com/microsoft/vscode/issues/16690)
                }
                return;
            }
            if (this.originatesFromTabActionBar(e)) {
                return; // not when clicking on actions
            }
            // Open tabs editor
            const editor = this.tabsModel.getEditorByIndex(tabIndex);
            if (editor) {
                if (e.shiftKey) {
                    let anchor;
                    if (this.lastSingleSelectSelectedEditor &&
                        this.tabsModel.isSelected(this.lastSingleSelectSelectedEditor)) {
                        // The last selected editor is the anchor
                        anchor = this.lastSingleSelectSelectedEditor;
                    }
                    else {
                        // The active editor is the anchor
                        const activeEditor = assertIsDefined(this.groupView.activeEditor);
                        this.lastSingleSelectSelectedEditor = activeEditor;
                        anchor = activeEditor;
                    }
                    await this.selectEditorsBetween(editor, anchor);
                }
                else if ((e.ctrlKey && !isMacintosh) || (e.metaKey && isMacintosh)) {
                    if (this.tabsModel.isSelected(editor)) {
                        await this.unselectEditor(editor);
                    }
                    else {
                        await this.selectEditor(editor);
                        this.lastSingleSelectSelectedEditor = editor;
                    }
                }
                else {
                    // Even if focus is preserved make sure to activate the group.
                    // If a new active editor is selected, keep the current selection on key
                    // down such that drag and drop can operate over the selection. The selection
                    // is removed on key up in this case.
                    const inactiveSelection = this.tabsModel.isSelected(editor)
                        ? this.groupView.selectedEditors.filter((e) => !e.matches(editor))
                        : [];
                    await this.groupView.openEditor(editor, { preserveFocus, activation: EditorActivation.ACTIVATE }, { inactiveSelection, focusTabControl: true });
                }
            }
        };
        const showContextMenu = (e) => {
            EventHelper.stop(e);
            const editor = this.tabsModel.getEditorByIndex(tabIndex);
            if (editor) {
                this.onTabContextMenu(editor, e, tab);
            }
        };
        // Open on Click / Touch
        disposables.add(addDisposableListener(tab, EventType.MOUSE_DOWN, (e) => handleClickOrTouch(e, false)));
        disposables.add(addDisposableListener(tab, TouchEventType.Tap, (e) => handleClickOrTouch(e, true))); // Preserve focus on touch #125470
        // Touch Scroll Support
        disposables.add(addDisposableListener(tab, TouchEventType.Change, (e) => {
            tabsScrollbar.setScrollPosition({
                scrollLeft: tabsScrollbar.getScrollPosition().scrollLeft - e.translationX,
            });
        }));
        // Update selection & prevent flicker of focus outline on tab until editor got focus
        disposables.add(addDisposableListener(tab, EventType.MOUSE_UP, async (e) => {
            EventHelper.stop(e);
            tab.blur();
            if (isMouseEvent(e) &&
                (e.button !== 0 /* middle/right mouse button */ ||
                    (isMacintosh && e.ctrlKey) /* macOS context menu */)) {
                return;
            }
            if (this.originatesFromTabActionBar(e)) {
                return; // not when clicking on actions
            }
            const isCtrlCmd = (e.ctrlKey && !isMacintosh) || (e.metaKey && isMacintosh);
            if (!isCtrlCmd && !e.shiftKey && this.groupView.selectedEditors.length > 1) {
                await this.unselectAllEditors();
            }
        }));
        // Close on mouse middle click
        disposables.add(addDisposableListener(tab, EventType.AUXCLICK, (e) => {
            if (e.button === 1 /* Middle Button*/) {
                EventHelper.stop(e, true /* for https://github.com/microsoft/vscode/issues/56715 */);
                const editor = this.tabsModel.getEditorByIndex(tabIndex);
                if (editor) {
                    if (preventEditorClose(this.tabsModel, editor, EditorCloseMethod.MOUSE, this.groupsView.partOptions)) {
                        return;
                    }
                    this.blockRevealActiveTabOnce();
                    this.closeEditorAction.run({
                        groupId: this.groupView.id,
                        editorIndex: this.groupView.getIndexOfEditor(editor),
                    });
                }
            }
        }));
        // Context menu on Shift+F10
        disposables.add(addDisposableListener(tab, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.shiftKey && event.keyCode === 68 /* KeyCode.F10 */) {
                showContextMenu(e);
            }
        }));
        // Context menu on touch context menu gesture
        disposables.add(addDisposableListener(tab, TouchEventType.Contextmenu, (e) => {
            showContextMenu(e);
        }));
        // Keyboard accessibility
        disposables.add(addDisposableListener(tab, EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            let handled = false;
            // Run action on Enter/Space
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                handled = true;
                const editor = this.tabsModel.getEditorByIndex(tabIndex);
                if (editor) {
                    this.groupView.openEditor(editor);
                }
            }
            // Navigate in editors
            else if ([
                15 /* KeyCode.LeftArrow */,
                17 /* KeyCode.RightArrow */,
                16 /* KeyCode.UpArrow */,
                18 /* KeyCode.DownArrow */,
                14 /* KeyCode.Home */,
                13 /* KeyCode.End */,
            ].some((kb) => event.equals(kb))) {
                let editorIndex = this.toEditorIndex(tabIndex);
                if (event.equals(15 /* KeyCode.LeftArrow */) || event.equals(16 /* KeyCode.UpArrow */)) {
                    editorIndex = editorIndex - 1;
                }
                else if (event.equals(17 /* KeyCode.RightArrow */) || event.equals(18 /* KeyCode.DownArrow */)) {
                    editorIndex = editorIndex + 1;
                }
                else if (event.equals(14 /* KeyCode.Home */)) {
                    editorIndex = 0;
                }
                else {
                    editorIndex = this.groupView.count - 1;
                }
                const target = this.groupView.getEditorByIndex(editorIndex);
                if (target) {
                    handled = true;
                    this.groupView.openEditor(target, { preserveFocus: true }, { focusTabControl: true });
                }
            }
            if (handled) {
                EventHelper.stop(e, true);
            }
            // moving in the tabs container can have an impact on scrolling position, so we need to update the custom scrollbar
            tabsScrollbar.setScrollPosition({
                scrollLeft: tabsContainer.scrollLeft,
            });
        }));
        // Double click: either pin or toggle maximized
        for (const eventType of [TouchEventType.Tap, EventType.DBLCLICK]) {
            disposables.add(addDisposableListener(tab, eventType, (e) => {
                if (eventType === EventType.DBLCLICK) {
                    EventHelper.stop(e);
                }
                else if (e.tapCount !== 2) {
                    return; // ignore single taps
                }
                const editor = this.tabsModel.getEditorByIndex(tabIndex);
                if (editor && this.tabsModel.isPinned(editor)) {
                    switch (this.groupsView.partOptions.doubleClickTabToToggleEditorGroupSizes) {
                        case 'maximize':
                            this.groupsView.toggleMaximizeGroup(this.groupView);
                            break;
                        case 'expand':
                            this.groupsView.toggleExpandGroup(this.groupView);
                            break;
                        case 'off':
                            break;
                    }
                }
                else {
                    this.groupView.pinEditor(editor);
                }
            }));
        }
        // Context menu
        disposables.add(addDisposableListener(tab, EventType.CONTEXT_MENU, (e) => {
            EventHelper.stop(e, true);
            const editor = this.tabsModel.getEditorByIndex(tabIndex);
            if (editor) {
                this.onTabContextMenu(editor, e, tab);
            }
        }, true /* use capture to fix https://github.com/microsoft/vscode/issues/19145 */));
        // Drag & Drop support
        let lastDragEvent = undefined;
        let isNewWindowOperation = false;
        disposables.add(new DragAndDropObserver(tab, {
            onDragStart: (e) => {
                const editor = this.tabsModel.getEditorByIndex(tabIndex);
                if (!editor) {
                    return;
                }
                isNewWindowOperation = this.isNewWindowOperation(e);
                const selectedEditors = this.groupView.selectedEditors;
                this.editorTransfer.setData(selectedEditors.map((e) => new DraggedEditorIdentifier({ editor: e, groupId: this.groupView.id })), DraggedEditorIdentifier.prototype);
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'copyMove';
                    if (selectedEditors.length > 1) {
                        const label = `${editor.getName()} + ${selectedEditors.length - 1}`;
                        applyDragImage(e, tab, label);
                    }
                    else {
                        e.dataTransfer.setDragImage(tab, 0, 0); // top left corner of dragged tab set to cursor position to make room for drop-border feedback
                    }
                }
                // Apply some datatransfer types to allow for dragging the element outside of the application
                this.doFillResourceDataTransfers(selectedEditors, e, isNewWindowOperation);
                scheduleAtNextAnimationFrame(getWindow(this.parent), () => this.updateDropFeedback(tab, false, e, tabIndex));
            },
            onDrag: (e) => {
                lastDragEvent = e;
            },
            onDragEnter: (e) => {
                // Return if transfer is unsupported
                if (!this.isSupportedDropTransfer(e)) {
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'none';
                    }
                    return;
                }
                // Update the dropEffect to "copy" if there is no local data to be dragged because
                // in that case we can only copy the data into and not move it from its source
                if (!this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'copy';
                    }
                }
                this.updateDropFeedback(tab, true, e, tabIndex);
            },
            onDragOver: (e, dragDuration) => {
                if (dragDuration >= MultiEditorTabsControl_1.DRAG_OVER_OPEN_TAB_THRESHOLD) {
                    const draggedOverTab = this.tabsModel.getEditorByIndex(tabIndex);
                    if (draggedOverTab && this.tabsModel.activeEditor !== draggedOverTab) {
                        this.groupView.openEditor(draggedOverTab, { preserveFocus: true });
                    }
                }
                this.updateDropFeedback(tab, true, e, tabIndex);
            },
            onDragEnd: async (e) => {
                this.updateDropFeedback(tab, false, e, tabIndex);
                const draggedEditors = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
                this.editorTransfer.clearData(DraggedEditorIdentifier.prototype);
                if (!isNewWindowOperation ||
                    isWindowDraggedOver() ||
                    !draggedEditors ||
                    draggedEditors.length === 0) {
                    return; // drag to open in new window is disabled
                }
                const auxiliaryEditorPart = await this.maybeCreateAuxiliaryEditorPartAt(e, tab);
                if (!auxiliaryEditorPart) {
                    return;
                }
                const targetGroup = auxiliaryEditorPart.activeGroup;
                const editorsWithOptions = prepareMoveCopyEditors(this.groupView, draggedEditors.map((editor) => editor.identifier.editor));
                if (this.isMoveOperation(lastDragEvent ?? e, targetGroup.id, draggedEditors[0].identifier.editor)) {
                    this.groupView.moveEditors(editorsWithOptions, targetGroup);
                }
                else {
                    this.groupView.copyEditors(editorsWithOptions, targetGroup);
                }
                targetGroup.focus();
            },
            onDrop: (e) => {
                this.updateDropFeedback(tab, false, e, tabIndex);
                // compute the target index
                let targetIndex = tabIndex;
                if (this.getTabDragOverLocation(e, tab) === 'right') {
                    targetIndex++;
                }
                this.onDrop(e, targetIndex, tabsContainer);
            },
        }));
        return disposables;
    }
    isSupportedDropTransfer(e) {
        if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
            const data = this.groupTransfer.getData(DraggedEditorGroupIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const group = data[0];
                if (group.identifier === this.groupView.id) {
                    return false; // groups cannot be dropped on group it originates from
                }
            }
            return true;
        }
        if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
            return true; // (local) editors can always be dropped
        }
        if (e.dataTransfer && e.dataTransfer.types.length > 0) {
            return true; // optimistically allow external data (// see https://github.com/microsoft/vscode/issues/25789)
        }
        return false;
    }
    updateDropFeedback(element, isDND, e, tabIndex) {
        const isTab = typeof tabIndex === 'number';
        let dropTarget;
        if (isDND) {
            if (isTab) {
                dropTarget = this.computeDropTarget(e, tabIndex, element);
            }
            else {
                dropTarget = {
                    leftElement: element.lastElementChild,
                    rightElement: undefined,
                };
            }
        }
        else {
            dropTarget = undefined;
        }
        this.updateDropTarget(dropTarget);
    }
    updateDropTarget(newTarget) {
        const oldTargets = this.dropTarget;
        if (oldTargets === newTarget ||
            (oldTargets &&
                newTarget &&
                oldTargets.leftElement === newTarget.leftElement &&
                oldTargets.rightElement === newTarget.rightElement)) {
            return;
        }
        const dropClassLeft = 'drop-target-left';
        const dropClassRight = 'drop-target-right';
        if (oldTargets) {
            oldTargets.leftElement?.classList.remove(dropClassLeft);
            oldTargets.rightElement?.classList.remove(dropClassRight);
        }
        if (newTarget) {
            newTarget.leftElement?.classList.add(dropClassLeft);
            newTarget.rightElement?.classList.add(dropClassRight);
        }
        this.dropTarget = newTarget;
    }
    getTabDragOverLocation(e, tab) {
        const rect = tab.getBoundingClientRect();
        const offsetXRelativeToParent = e.clientX - rect.left;
        return offsetXRelativeToParent <= rect.width / 2 ? 'left' : 'right';
    }
    computeDropTarget(e, tabIndex, targetTab) {
        const isLeftSideOfTab = this.getTabDragOverLocation(e, targetTab) === 'left';
        const isLastTab = tabIndex === this.tabsModel.count - 1;
        const isFirstTab = tabIndex === 0;
        // Before first tab
        if (isLeftSideOfTab && isFirstTab) {
            return { leftElement: undefined, rightElement: targetTab };
        }
        // After last tab
        if (!isLeftSideOfTab && isLastTab) {
            return { leftElement: targetTab, rightElement: undefined };
        }
        // Between two tabs
        const tabBefore = isLeftSideOfTab ? targetTab.previousElementSibling : targetTab;
        const tabAfter = isLeftSideOfTab ? targetTab : targetTab.nextElementSibling;
        return { leftElement: tabBefore, rightElement: tabAfter };
    }
    async selectEditor(editor) {
        if (this.groupView.isActive(editor)) {
            return;
        }
        await this.groupView.setSelection(editor, this.groupView.selectedEditors);
    }
    async selectEditorsBetween(target, anchor) {
        const editorIndex = this.groupView.getIndexOfEditor(target);
        if (editorIndex === -1) {
            throw new BugIndicatingError();
        }
        const anchorEditorIndex = this.groupView.getIndexOfEditor(anchor);
        if (anchorEditorIndex === -1) {
            throw new BugIndicatingError();
        }
        let selection = this.groupView.selectedEditors;
        // Unselect editors on other side of anchor in relation to the target
        let currentEditorIndex = anchorEditorIndex;
        while (currentEditorIndex >= 0 && currentEditorIndex <= this.groupView.count - 1) {
            currentEditorIndex =
                anchorEditorIndex < editorIndex ? currentEditorIndex - 1 : currentEditorIndex + 1;
            const currentEditor = this.groupView.getEditorByIndex(currentEditorIndex);
            if (!currentEditor) {
                break;
            }
            if (!this.groupView.isSelected(currentEditor)) {
                break;
            }
            selection = selection.filter((editor) => !editor.matches(currentEditor));
        }
        // Select editors between anchor and target
        const fromEditorIndex = anchorEditorIndex < editorIndex ? anchorEditorIndex : editorIndex;
        const toEditorIndex = anchorEditorIndex < editorIndex ? editorIndex : anchorEditorIndex;
        const editorsToSelect = this.groupView
            .getEditors(1 /* EditorsOrder.SEQUENTIAL */)
            .slice(fromEditorIndex, toEditorIndex + 1);
        for (const editor of editorsToSelect) {
            if (!this.groupView.isSelected(editor)) {
                selection.push(editor);
            }
        }
        const inactiveSelectedEditors = selection.filter((editor) => !editor.matches(target));
        await this.groupView.setSelection(target, inactiveSelectedEditors);
    }
    async unselectEditor(editor) {
        const isUnselectingActiveEditor = this.groupView.isActive(editor);
        // If there is only one editor selected, do not unselect it
        if (isUnselectingActiveEditor && this.groupView.selectedEditors.length === 1) {
            return;
        }
        let newActiveEditor = assertIsDefined(this.groupView.activeEditor);
        // If active editor is bing unselected then find the most recently opened selected editor
        // that is not the editor being unselected
        if (isUnselectingActiveEditor) {
            const recentEditors = this.groupView.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
            for (let i = 1; i < recentEditors.length; i++) {
                // First one is the active editor
                const recentEditor = recentEditors[i];
                if (this.groupView.isSelected(recentEditor)) {
                    newActiveEditor = recentEditor;
                    break;
                }
            }
        }
        const inactiveSelectedEditors = this.groupView.selectedEditors.filter((e) => !e.matches(editor) && !e.matches(newActiveEditor));
        await this.groupView.setSelection(newActiveEditor, inactiveSelectedEditors);
    }
    async unselectAllEditors() {
        if (this.groupView.selectedEditors.length > 1) {
            const activeEditor = assertIsDefined(this.groupView.activeEditor);
            await this.groupView.setSelection(activeEditor, []);
        }
    }
    computeTabLabels() {
        const { labelFormat } = this.groupsView.partOptions;
        const { verbosity, shortenDuplicates } = this.getLabelConfigFlags(labelFormat);
        // Build labels and descriptions for each editor
        const labels = [];
        let activeEditorTabIndex = -1;
        this.tabsModel
            .getEditors(1 /* EditorsOrder.SEQUENTIAL */)
            .forEach((editor, tabIndex) => {
            labels.push({
                editor,
                name: editor.getName(),
                description: editor.getDescription(verbosity),
                forceDescription: editor.hasCapability(64 /* EditorInputCapabilities.ForceDescription */),
                title: editor.getTitle(2 /* Verbosity.LONG */),
                ariaLabel: computeEditorAriaLabel(editor, tabIndex, this.groupView, this.editorPartsView.count),
            });
            if (editor === this.tabsModel.activeEditor) {
                activeEditorTabIndex = tabIndex;
            }
        });
        // Shorten labels as needed
        if (shortenDuplicates) {
            this.shortenTabLabels(labels);
        }
        // Remember for fast lookup
        this.tabLabels = labels;
        this.activeTabLabel = labels[activeEditorTabIndex];
    }
    shortenTabLabels(labels) {
        // Gather duplicate titles, while filtering out invalid descriptions
        const mapNameToDuplicates = new Map();
        for (const label of labels) {
            if (typeof label.description === 'string') {
                getOrSet(mapNameToDuplicates, label.name, []).push(label);
            }
            else {
                label.description = '';
            }
        }
        // Identify duplicate names and shorten descriptions
        for (const [, duplicateLabels] of mapNameToDuplicates) {
            // Remove description if the title isn't duplicated
            // and we have no indication to enforce description
            if (duplicateLabels.length === 1 && !duplicateLabels[0].forceDescription) {
                duplicateLabels[0].description = '';
                continue;
            }
            // Identify duplicate descriptions
            const mapDescriptionToDuplicates = new Map();
            for (const duplicateLabel of duplicateLabels) {
                getOrSet(mapDescriptionToDuplicates, duplicateLabel.description, []).push(duplicateLabel);
            }
            // For editors with duplicate descriptions, check whether any long descriptions differ
            let useLongDescriptions = false;
            for (const [, duplicateLabels] of mapDescriptionToDuplicates) {
                if (!useLongDescriptions && duplicateLabels.length > 1) {
                    const [first, ...rest] = duplicateLabels.map(({ editor }) => editor.getDescription(2 /* Verbosity.LONG */));
                    useLongDescriptions = rest.some((description) => description !== first);
                }
            }
            // If so, replace all descriptions with long descriptions
            if (useLongDescriptions) {
                mapDescriptionToDuplicates.clear();
                for (const duplicateLabel of duplicateLabels) {
                    duplicateLabel.description = duplicateLabel.editor.getDescription(2 /* Verbosity.LONG */);
                    getOrSet(mapDescriptionToDuplicates, duplicateLabel.description, []).push(duplicateLabel);
                }
            }
            // Obtain final set of descriptions
            const descriptions = [];
            for (const [description] of mapDescriptionToDuplicates) {
                descriptions.push(description);
            }
            // Remove description if all descriptions are identical unless forced
            if (descriptions.length === 1) {
                for (const label of mapDescriptionToDuplicates.get(descriptions[0]) || []) {
                    if (!label.forceDescription) {
                        label.description = '';
                    }
                }
                continue;
            }
            // Shorten descriptions
            const shortenedDescriptions = shorten(descriptions, this.path.sep);
            descriptions.forEach((description, tabIndex) => {
                for (const label of mapDescriptionToDuplicates.get(description) || []) {
                    label.description = shortenedDescriptions[tabIndex];
                }
            });
        }
    }
    getLabelConfigFlags(value) {
        switch (value) {
            case 'short':
                return { verbosity: 0 /* Verbosity.SHORT */, shortenDuplicates: false };
            case 'medium':
                return { verbosity: 1 /* Verbosity.MEDIUM */, shortenDuplicates: false };
            case 'long':
                return { verbosity: 2 /* Verbosity.LONG */, shortenDuplicates: false };
            default:
                return { verbosity: 1 /* Verbosity.MEDIUM */, shortenDuplicates: true };
        }
    }
    redraw(options) {
        // Border below tabs if any with explicit high contrast support
        if (this.tabsAndActionsContainer) {
            let tabsContainerBorderColor = this.getColor(EDITOR_GROUP_HEADER_TABS_BORDER);
            if (!tabsContainerBorderColor && isHighContrast(this.theme.type)) {
                tabsContainerBorderColor = this.getColor(TAB_BORDER) || this.getColor(contrastBorder);
            }
            if (tabsContainerBorderColor) {
                this.tabsAndActionsContainer.classList.add('tabs-border-bottom');
                this.tabsAndActionsContainer.style.setProperty('--tabs-border-bottom-color', tabsContainerBorderColor.toString());
            }
            else {
                this.tabsAndActionsContainer.classList.remove('tabs-border-bottom');
                this.tabsAndActionsContainer.style.removeProperty('--tabs-border-bottom-color');
            }
        }
        // For each tab
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => {
            this.redrawTab(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar);
        });
        // Update Editor Actions Toolbar
        this.updateEditorActionsToolbar();
        // Ensure the active tab is always revealed
        this.layout(this.dimensions, options);
    }
    redrawTab(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) {
        const isTabSticky = this.tabsModel.isSticky(tabIndex);
        const options = this.groupsView.partOptions;
        // Label
        this.redrawTabLabel(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel);
        // Action
        const hasUnpinAction = isTabSticky && options.tabActionUnpinVisibility;
        const hasCloseAction = !hasUnpinAction && options.tabActionCloseVisibility;
        const hasAction = hasUnpinAction || hasCloseAction;
        let tabAction;
        if (hasAction) {
            tabAction = hasUnpinAction ? this.unpinEditorAction : this.closeEditorAction;
        }
        else {
            // Even if the action is not visible, add it as it contains the dirty indicator
            tabAction = isTabSticky ? this.unpinEditorAction : this.closeEditorAction;
        }
        if (!tabActionBar.hasAction(tabAction)) {
            if (!tabActionBar.isEmpty()) {
                tabActionBar.clear();
            }
            tabActionBar.push(tabAction, {
                icon: true,
                label: false,
                keybinding: this.getKeybindingLabel(tabAction),
            });
        }
        tabContainer.classList.toggle(`pinned-action-off`, isTabSticky && !hasUnpinAction);
        tabContainer.classList.toggle(`close-action-off`, !hasUnpinAction && !hasCloseAction);
        for (const option of ['left', 'right']) {
            tabContainer.classList.toggle(`tab-actions-${option}`, hasAction && options.tabActionLocation === option);
        }
        const tabSizing = isTabSticky && options.pinnedTabSizing === 'shrink'
            ? 'shrink' /* treat sticky shrink tabs as tabSizing: 'shrink' */
            : options.tabSizing;
        for (const option of ['fit', 'shrink', 'fixed']) {
            tabContainer.classList.toggle(`sizing-${option}`, tabSizing === option);
        }
        tabContainer.classList.toggle('has-icon', options.showIcons && options.hasIcons);
        tabContainer.classList.toggle('sticky', isTabSticky);
        for (const option of ['normal', 'compact', 'shrink']) {
            tabContainer.classList.toggle(`sticky-${option}`, isTabSticky && options.pinnedTabSizing === option);
        }
        // If not wrapping tabs, sticky compact/shrink tabs need a position to remain at their location
        // when scrolling to stay in view (requirement for position: sticky)
        if (!options.wrapTabs && isTabSticky && options.pinnedTabSizing !== 'normal') {
            let stickyTabWidth = 0;
            switch (options.pinnedTabSizing) {
                case 'compact':
                    stickyTabWidth = MultiEditorTabsControl_1.TAB_WIDTH.compact;
                    break;
                case 'shrink':
                    stickyTabWidth = MultiEditorTabsControl_1.TAB_WIDTH.shrink;
                    break;
            }
            tabContainer.style.left = `${tabIndex * stickyTabWidth}px`;
        }
        else {
            tabContainer.style.left = 'auto';
        }
        // Borders / outline
        this.redrawTabBorders(tabIndex, tabContainer);
        // Selection / active / dirty state
        this.redrawTabSelectedActiveAndDirty(this.groupsView.activeGroup === this.groupView, editor, tabContainer, tabActionBar);
    }
    redrawTabLabel(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel) {
        const options = this.groupsView.partOptions;
        // Unless tabs are sticky compact, show the full label and description
        // Sticky compact tabs will only show an icon if icons are enabled
        // or their first character of the name otherwise
        let name;
        let forceLabel = false;
        let fileDecorationBadges = Boolean(options.decorations?.badges);
        const fileDecorationColors = Boolean(options.decorations?.colors);
        let description;
        if (options.pinnedTabSizing === 'compact' && this.tabsModel.isSticky(tabIndex)) {
            const isShowingIcons = options.showIcons && options.hasIcons;
            name = isShowingIcons ? '' : tabLabel.name?.charAt(0).toUpperCase();
            description = '';
            forceLabel = true;
            fileDecorationBadges = false; // not enough space when sticky tabs are compact
        }
        else {
            name = tabLabel.name;
            description = tabLabel.description || '';
        }
        if (tabLabel.ariaLabel) {
            tabContainer.setAttribute('aria-label', tabLabel.ariaLabel);
            // Set aria-description to empty string so that screen readers would not read the title as well
            // More details https://github.com/microsoft/vscode/issues/95378
            tabContainer.setAttribute('aria-description', '');
        }
        // Label
        tabLabelWidget.setResource({
            name,
            description,
            resource: EditorResourceAccessor.getOriginalUri(editor, {
                supportSideBySide: SideBySideEditor.BOTH,
            }),
        }, {
            title: this.getHoverTitle(editor),
            extraClasses: coalesce(['tab-label', fileDecorationBadges ? 'tab-label-has-badge' : undefined].concat(editor.getLabelExtraClasses())),
            italic: !this.tabsModel.isPinned(editor),
            forceLabel,
            fileDecorations: {
                colors: fileDecorationColors,
                badges: fileDecorationBadges,
            },
            icon: editor.getIcon(),
            hideIcon: options.showIcons === false,
        });
        // Tests helper
        const resource = EditorResourceAccessor.getOriginalUri(editor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (resource) {
            tabContainer.setAttribute('data-resource-name', basenameOrAuthority(resource));
        }
        else {
            tabContainer.removeAttribute('data-resource-name');
        }
    }
    redrawTabSelectedActiveAndDirty(isGroupActive, editor, tabContainer, tabActionBar) {
        const isTabActive = this.tabsModel.isActive(editor);
        const hasModifiedBorderTop = this.doRedrawTabDirty(isGroupActive, isTabActive, editor, tabContainer);
        this.doRedrawTabActive(isGroupActive, !hasModifiedBorderTop, editor, tabContainer, tabActionBar);
    }
    doRedrawTabActive(isGroupActive, allowBorderTop, editor, tabContainer, tabActionBar) {
        const isActive = this.tabsModel.isActive(editor);
        const isSelected = this.tabsModel.isSelected(editor);
        tabContainer.classList.toggle('active', isActive);
        tabContainer.classList.toggle('selected', isSelected);
        tabContainer.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tabContainer.tabIndex = isActive ? 0 : -1; // Only active tab can be focused into
        tabActionBar.setFocusable(isActive);
        // Set border BOTTOM if theme defined color
        if (isActive) {
            const activeTabBorderColorBottom = this.getColor(isGroupActive ? TAB_ACTIVE_BORDER : TAB_UNFOCUSED_ACTIVE_BORDER);
            tabContainer.classList.toggle('tab-border-bottom', !!activeTabBorderColorBottom);
            tabContainer.style.setProperty('--tab-border-bottom-color', activeTabBorderColorBottom ?? '');
        }
        // Set border TOP if theme defined color
        let tabBorderColorTop = null;
        if (allowBorderTop) {
            if (isActive) {
                tabBorderColorTop = this.getColor(isGroupActive ? TAB_ACTIVE_BORDER_TOP : TAB_UNFOCUSED_ACTIVE_BORDER_TOP);
            }
            if (tabBorderColorTop === null && isSelected) {
                tabBorderColorTop = this.getColor(TAB_SELECTED_BORDER_TOP);
            }
        }
        tabContainer.classList.toggle('tab-border-top', !!tabBorderColorTop);
        tabContainer.style.setProperty('--tab-border-top-color', tabBorderColorTop ?? '');
    }
    doRedrawTabDirty(isGroupActive, isTabActive, editor, tabContainer) {
        let hasModifiedBorderColor = false;
        // Tab: dirty (unless saving)
        if (editor.isDirty() && !editor.isSaving()) {
            tabContainer.classList.add('dirty');
            // Highlight modified tabs with a border if configured
            if (this.groupsView.partOptions.highlightModifiedTabs) {
                let modifiedBorderColor;
                if (isGroupActive && isTabActive) {
                    modifiedBorderColor = this.getColor(TAB_ACTIVE_MODIFIED_BORDER);
                }
                else if (isGroupActive && !isTabActive) {
                    modifiedBorderColor = this.getColor(TAB_INACTIVE_MODIFIED_BORDER);
                }
                else if (!isGroupActive && isTabActive) {
                    modifiedBorderColor = this.getColor(TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER);
                }
                else {
                    modifiedBorderColor = this.getColor(TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER);
                }
                if (modifiedBorderColor) {
                    hasModifiedBorderColor = true;
                    tabContainer.classList.add('dirty-border-top');
                    tabContainer.style.setProperty('--tab-dirty-border-top-color', modifiedBorderColor);
                }
            }
            else {
                tabContainer.classList.remove('dirty-border-top');
                tabContainer.style.removeProperty('--tab-dirty-border-top-color');
            }
        }
        // Tab: not dirty
        else {
            tabContainer.classList.remove('dirty', 'dirty-border-top');
            tabContainer.style.removeProperty('--tab-dirty-border-top-color');
        }
        return hasModifiedBorderColor;
    }
    redrawTabBorders(tabIndex, tabContainer) {
        const isTabSticky = this.tabsModel.isSticky(tabIndex);
        const isTabLastSticky = isTabSticky && this.tabsModel.stickyCount === tabIndex + 1;
        const showLastStickyTabBorderColor = this.tabsModel.stickyCount !== this.tabsModel.count;
        // Borders / Outline
        const borderRightColor = (isTabLastSticky && showLastStickyTabBorderColor
            ? this.getColor(TAB_LAST_PINNED_BORDER)
            : undefined) ||
            this.getColor(TAB_BORDER) ||
            this.getColor(contrastBorder);
        tabContainer.style.borderRight = borderRightColor ? `1px solid ${borderRightColor}` : '';
        tabContainer.style.outlineColor = this.getColor(activeContrastBorder) || '';
    }
    prepareEditorActions(editorActions) {
        const isGroupActive = this.groupsView.activeGroup === this.groupView;
        // Active: allow all actions
        if (isGroupActive) {
            return editorActions;
        }
        // Inactive: only show "Unlock" and secondary actions
        else {
            return {
                primary: this.groupsView.partOptions.alwaysShowEditorActions
                    ? editorActions.primary
                    : editorActions.primary.filter((action) => action.id === UNLOCK_GROUP_COMMAND_ID),
                secondary: editorActions.secondary,
            };
        }
    }
    getHeight() {
        // Return quickly if our used dimensions are known
        if (this.dimensions.used) {
            return this.dimensions.used.height;
        }
        // Otherwise compute via browser APIs
        else {
            return this.computeHeight();
        }
    }
    computeHeight() {
        let height;
        if (!this.visible) {
            height = 0;
        }
        else if (this.groupsView.partOptions.wrapTabs &&
            this.tabsAndActionsContainer?.classList.contains('wrapping')) {
            // Wrap: we need to ask `offsetHeight` to get
            // the real height of the title area with wrapping.
            height = this.tabsAndActionsContainer.offsetHeight;
        }
        else {
            height = this.tabHeight;
        }
        return height;
    }
    layout(dimensions, options) {
        // Remember dimensions that we get
        Object.assign(this.dimensions, dimensions);
        if (this.visible) {
            if (!this.layoutScheduler.value) {
                // The layout of tabs can be an expensive operation because we access DOM properties
                // that can result in the browser doing a full page layout to validate them. To buffer
                // this a little bit we try at least to schedule this work on the next animation frame
                // when we have restored or when idle otherwise.
                const disposable = scheduleAtNextAnimationFrame(getWindow(this.parent), () => {
                    this.doLayout(this.dimensions, this.layoutScheduler.value?.options /* ensure to pick up latest options */);
                    this.layoutScheduler.clear();
                });
                this.layoutScheduler.value = { options, dispose: () => disposable.dispose() };
            }
            // Make sure to keep options updated
            if (options?.forceRevealActiveTab) {
                this.layoutScheduler.value.options = {
                    ...this.layoutScheduler.value.options,
                    forceRevealActiveTab: true,
                };
            }
        }
        // First time layout: compute the dimensions and store it
        if (!this.dimensions.used) {
            this.dimensions.used = new Dimension(dimensions.container.width, this.computeHeight());
        }
        return this.dimensions.used;
    }
    doLayout(dimensions, options) {
        // Layout tabs
        if (dimensions.container !== Dimension.None && dimensions.available !== Dimension.None) {
            this.doLayoutTabs(dimensions, options);
        }
        // Remember the dimensions used in the control so that we can
        // return it fast from the `layout` call without having to
        // compute it over and over again
        const oldDimension = this.dimensions.used;
        const newDimension = (this.dimensions.used = new Dimension(dimensions.container.width, this.computeHeight()));
        // In case the height of the title control changed from before
        // (currently only possible if wrapping changed on/off), we need
        // to signal this to the outside via a `relayout` call so that
        // e.g. the editor control can be adjusted accordingly.
        if (oldDimension && oldDimension.height !== newDimension.height) {
            this.groupView.relayout();
        }
    }
    doLayoutTabs(dimensions, options) {
        // Always first layout tabs with wrapping support even if wrapping
        // is disabled. The result indicates if tabs wrap and if not, we
        // need to proceed with the layout without wrapping because even
        // if wrapping is enabled in settings, there are cases where
        // wrapping is disabled (e.g. due to space constraints)
        const tabsWrapMultiLine = this.doLayoutTabsWrapping(dimensions);
        if (!tabsWrapMultiLine) {
            this.doLayoutTabsNonWrapping(options);
        }
    }
    doLayoutTabsWrapping(dimensions) {
        const [tabsAndActionsContainer, tabsContainer, editorToolbarContainer, tabsScrollbar] = assertAllDefined(this.tabsAndActionsContainer, this.tabsContainer, this.editorActionsToolbarContainer, this.tabsScrollbar);
        // Handle wrapping tabs according to setting:
        // - enabled: only add class if tabs wrap and don't exceed available dimensions
        // - disabled: remove class and margin-right variable
        const didTabsWrapMultiLine = tabsAndActionsContainer.classList.contains('wrapping');
        let tabsWrapMultiLine = didTabsWrapMultiLine;
        function updateTabsWrapping(enabled) {
            tabsWrapMultiLine = enabled;
            // Toggle the `wrapped` class to enable wrapping
            tabsAndActionsContainer.classList.toggle('wrapping', tabsWrapMultiLine);
            // Update `last-tab-margin-right` CSS variable to account for the absolute
            // positioned editor actions container when tabs wrap. The margin needs to
            // be the width of the editor actions container to avoid screen cheese.
            tabsContainer.style.setProperty('--last-tab-margin-right', tabsWrapMultiLine ? `${editorToolbarContainer.offsetWidth}px` : '0');
            // Remove old css classes that are not needed anymore
            for (const tab of tabsContainer.children) {
                tab.classList.remove('last-in-row');
            }
        }
        // Setting enabled: selectively enable wrapping if possible
        if (this.groupsView.partOptions.wrapTabs) {
            const visibleTabsWidth = tabsContainer.offsetWidth;
            const allTabsWidth = tabsContainer.scrollWidth;
            const lastTabFitsWrapped = () => {
                const lastTab = this.getLastTab();
                if (!lastTab) {
                    return true; // no tab always fits
                }
                const lastTabOverlapWithToolbarWidth = lastTab.offsetWidth + editorToolbarContainer.offsetWidth - dimensions.available.width;
                if (lastTabOverlapWithToolbarWidth > 1) {
                    // Allow for slight rounding errors related to zooming here
                    // https://github.com/microsoft/vscode/issues/116385
                    return false;
                }
                return true;
            };
            // If tabs wrap or should start to wrap (when width exceeds visible width)
            // we must trigger `updateWrapping` to set the `last-tab-margin-right`
            // accordingly based on the number of actions. The margin is important to
            // properly position the last tab apart from the actions
            //
            // We already check here if the last tab would fit when wrapped given the
            // editor toolbar will also show right next to it. This ensures we are not
            // enabling wrapping only to disable it again in the code below (this fixes
            // flickering issue https://github.com/microsoft/vscode/issues/115050)
            if (tabsWrapMultiLine || (allTabsWidth > visibleTabsWidth && lastTabFitsWrapped())) {
                updateTabsWrapping(true);
            }
            // Tabs wrap multiline: remove wrapping under certain size constraint conditions
            if (tabsWrapMultiLine) {
                if (tabsContainer.offsetHeight > dimensions.available.height || // if height exceeds available height
                    (allTabsWidth === visibleTabsWidth && tabsContainer.offsetHeight === this.tabHeight) || // if wrapping is not needed anymore
                    !lastTabFitsWrapped() // if last tab does not fit anymore
                ) {
                    updateTabsWrapping(false);
                }
            }
        }
        // Setting disabled: remove CSS traces only if tabs did wrap
        else if (didTabsWrapMultiLine) {
            updateTabsWrapping(false);
        }
        // If we transitioned from non-wrapping to wrapping, we need
        // to update the scrollbar to have an equal `width` and
        // `scrollWidth`. Otherwise a scrollbar would appear which is
        // never desired when wrapping.
        if (tabsWrapMultiLine && !didTabsWrapMultiLine) {
            const visibleTabsWidth = tabsContainer.offsetWidth;
            tabsScrollbar.setScrollDimensions({
                width: visibleTabsWidth,
                scrollWidth: visibleTabsWidth,
            });
        }
        // Update the `last-in-row` class on tabs when wrapping
        // is enabled (it doesn't do any harm otherwise). This
        // class controls additional properties of tab when it is
        // the last tab in a row
        if (tabsWrapMultiLine) {
            // Using a map here to change classes after the for loop is
            // crucial for performance because changing the class on a
            // tab can result in layouts of the rendering engine.
            const tabs = new Map();
            let currentTabsPosY = undefined;
            let lastTab = undefined;
            for (const child of tabsContainer.children) {
                const tab = child;
                const tabPosY = tab.offsetTop;
                // Marks a new or the first row of tabs
                if (tabPosY !== currentTabsPosY) {
                    currentTabsPosY = tabPosY;
                    if (lastTab) {
                        tabs.set(lastTab, true); // previous tab must be last in row then
                    }
                }
                // Always remember last tab and ensure the
                // last-in-row class is not present until
                // we know the tab is last
                lastTab = tab;
                tabs.set(tab, false);
            }
            // Last tab overally is always last-in-row
            if (lastTab) {
                tabs.set(lastTab, true);
            }
            for (const [tab, lastInRow] of tabs) {
                tab.classList.toggle('last-in-row', lastInRow);
            }
        }
        return tabsWrapMultiLine;
    }
    doLayoutTabsNonWrapping(options) {
        const [tabsContainer, tabsScrollbar] = assertAllDefined(this.tabsContainer, this.tabsScrollbar);
        //
        // Synopsis
        // - allTabsWidth:   			sum of all tab widths
        // - stickyTabsWidth:			sum of all sticky tab widths (unless `pinnedTabSizing: normal`)
        // - visibleContainerWidth: 	size of tab container
        // - availableContainerWidth: 	size of tab container minus size of sticky tabs
        //
        // [------------------------------ All tabs width ---------------------------------------]
        // [------------------- Visible container width -------------------]
        //                         [------ Available container width ------]
        // [ Sticky A ][ Sticky B ][ Tab C ][ Tab D ][ Tab E ][ Tab F ][ Tab G ][ Tab H ][ Tab I ]
        //                 Active Tab Width [-------]
        // [------- Active Tab Pos X -------]
        // [-- Sticky Tabs Width --]
        //
        const visibleTabsWidth = tabsContainer.offsetWidth;
        const allTabsWidth = tabsContainer.scrollWidth;
        // Compute width of sticky tabs depending on pinned tab sizing
        // - compact: sticky-tabs * TAB_SIZES.compact
        // -  shrink: sticky-tabs * TAB_SIZES.shrink
        // -  normal: 0 (sticky tabs inherit look and feel from non-sticky tabs)
        let stickyTabsWidth = 0;
        if (this.tabsModel.stickyCount > 0) {
            let stickyTabWidth = 0;
            switch (this.groupsView.partOptions.pinnedTabSizing) {
                case 'compact':
                    stickyTabWidth = MultiEditorTabsControl_1.TAB_WIDTH.compact;
                    break;
                case 'shrink':
                    stickyTabWidth = MultiEditorTabsControl_1.TAB_WIDTH.shrink;
                    break;
            }
            stickyTabsWidth = this.tabsModel.stickyCount * stickyTabWidth;
        }
        const activeTabAndIndex = this.tabsModel.activeEditor
            ? this.getTabAndIndex(this.tabsModel.activeEditor)
            : undefined;
        const [activeTab, activeTabIndex] = activeTabAndIndex ?? [undefined, undefined];
        // Figure out if active tab is positioned static which has an
        // impact on whether to reveal the tab or not later
        let activeTabPositionStatic = this.groupsView.partOptions.pinnedTabSizing !== 'normal' &&
            typeof activeTabIndex === 'number' &&
            this.tabsModel.isSticky(activeTabIndex);
        // Special case: we have sticky tabs but the available space for showing tabs
        // is little enough that we need to disable sticky tabs sticky positioning
        // so that tabs can be scrolled at naturally.
        let availableTabsContainerWidth = visibleTabsWidth - stickyTabsWidth;
        if (this.tabsModel.stickyCount > 0 &&
            availableTabsContainerWidth < MultiEditorTabsControl_1.TAB_WIDTH.fit) {
            tabsContainer.classList.add('disable-sticky-tabs');
            availableTabsContainerWidth = visibleTabsWidth;
            stickyTabsWidth = 0;
            activeTabPositionStatic = false;
        }
        else {
            tabsContainer.classList.remove('disable-sticky-tabs');
        }
        let activeTabPosX;
        let activeTabWidth;
        if (!this.blockRevealActiveTab && activeTab) {
            activeTabPosX = activeTab.offsetLeft;
            activeTabWidth = activeTab.offsetWidth;
        }
        // Update scrollbar
        const { width: oldVisibleTabsWidth, scrollWidth: oldAllTabsWidth } = tabsScrollbar.getScrollDimensions();
        tabsScrollbar.setScrollDimensions({
            width: visibleTabsWidth,
            scrollWidth: allTabsWidth,
        });
        const dimensionsChanged = oldVisibleTabsWidth !== visibleTabsWidth || oldAllTabsWidth !== allTabsWidth;
        // Revealing the active tab is skipped under some conditions:
        if (this.blockRevealActiveTab || // explicitly disabled
            typeof activeTabPosX !== 'number' || // invalid dimension
            typeof activeTabWidth !== 'number' || // invalid dimension
            activeTabPositionStatic || // static tab (sticky)
            (!dimensionsChanged && !options?.forceRevealActiveTab) // dimensions did not change and we have low layout priority (https://github.com/microsoft/vscode/issues/133631)
        ) {
            this.blockRevealActiveTab = false;
            return;
        }
        // Reveal the active one
        const tabsContainerScrollPosX = tabsScrollbar.getScrollPosition().scrollLeft;
        const activeTabFits = activeTabWidth <= availableTabsContainerWidth;
        const adjustedActiveTabPosX = activeTabPosX - stickyTabsWidth;
        //
        // Synopsis
        // - adjustedActiveTabPosX: the adjusted tabPosX takes the width of sticky tabs into account
        //   conceptually the scrolling only begins after sticky tabs so in order to reveal a tab fully
        //   the actual position needs to be adjusted for sticky tabs.
        //
        // Tab is overflowing to the right: Scroll minimally until the element is fully visible to the right
        // Note: only try to do this if we actually have enough width to give to show the tab fully!
        //
        // Example: Tab G should be made active and needs to be fully revealed as such.
        //
        // [-------------------------------- All tabs width -----------------------------------------]
        // [-------------------- Visible container width --------------------]
        //                           [----- Available container width -------]
        //     [ Sticky A ][ Sticky B ][ Tab C ][ Tab D ][ Tab E ][ Tab F ][ Tab G ][ Tab H ][ Tab I ]
        //                     Active Tab Width [-------]
        //     [------- Active Tab Pos X -------]
        //                             [-------- Adjusted Tab Pos X -------]
        //     [-- Sticky Tabs Width --]
        //
        //
        if (activeTabFits &&
            tabsContainerScrollPosX + availableTabsContainerWidth < adjustedActiveTabPosX + activeTabWidth) {
            tabsScrollbar.setScrollPosition({
                scrollLeft: tabsContainerScrollPosX +
                    (adjustedActiveTabPosX +
                        activeTabWidth /* right corner of tab */ -
                        (tabsContainerScrollPosX +
                            availableTabsContainerWidth)) /* right corner of view port */,
            });
        }
        //
        // Tab is overlflowing to the left or does not fit: Scroll it into view to the left
        //
        // Example: Tab C should be made active and needs to be fully revealed as such.
        //
        // [----------------------------- All tabs width ----------------------------------------]
        //     [------------------ Visible container width ------------------]
        //                           [----- Available container width -------]
        // [ Sticky A ][ Sticky B ][ Tab C ][ Tab D ][ Tab E ][ Tab F ][ Tab G ][ Tab H ][ Tab I ]
        //                 Active Tab Width [-------]
        // [------- Active Tab Pos X -------]
        //      Adjusted Tab Pos X []
        // [-- Sticky Tabs Width --]
        //
        //
        else if (tabsContainerScrollPosX > adjustedActiveTabPosX || !activeTabFits) {
            tabsScrollbar.setScrollPosition({
                scrollLeft: adjustedActiveTabPosX,
            });
        }
    }
    updateTabsControlVisibility() {
        const tabsAndActionsContainer = assertIsDefined(this.tabsAndActionsContainer);
        tabsAndActionsContainer.classList.toggle('empty', !this.visible);
        // Reset dimensions if hidden
        if (!this.visible && this.dimensions) {
            this.dimensions.used = undefined;
        }
    }
    get visible() {
        return this.tabsModel.count > 0;
    }
    getTabAndIndex(editor) {
        const tabIndex = this.tabsModel.indexOf(editor);
        const tab = this.getTabAtIndex(tabIndex);
        if (tab) {
            return [tab, tabIndex];
        }
        return undefined;
    }
    getTabAtIndex(tabIndex) {
        if (tabIndex >= 0) {
            const tabsContainer = assertIsDefined(this.tabsContainer);
            return tabsContainer.children[tabIndex];
        }
        return undefined;
    }
    getLastTab() {
        return this.getTabAtIndex(this.tabsModel.count - 1);
    }
    blockRevealActiveTabOnce() {
        // When closing tabs through the tab close button or gesture, the user
        // might want to rapidly close tabs in sequence and as such revealing
        // the active tab after each close would be annoying. As such we block
        // the automated revealing of the active tab once after the close is
        // triggered.
        this.blockRevealActiveTab = true;
    }
    originatesFromTabActionBar(e) {
        let element;
        if (isMouseEvent(e)) {
            element = (e.target || e.srcElement);
        }
        else {
            element = e.initialTarget;
        }
        return !!findParentWithClass(element, 'action-item', 'tab');
    }
    async onDrop(e, targetTabIndex, tabsContainer) {
        EventHelper.stop(e, true);
        this.updateDropFeedback(tabsContainer, false, e, targetTabIndex);
        tabsContainer.classList.remove('scroll');
        let targetEditorIndex = this.tabsModel instanceof UnstickyEditorGroupModel
            ? targetTabIndex + this.groupView.stickyCount
            : targetTabIndex;
        const options = {
            sticky: this.tabsModel instanceof StickyEditorGroupModel &&
                this.tabsModel.stickyCount === targetEditorIndex,
            index: targetEditorIndex,
        };
        // Check for group transfer
        if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
            const data = this.groupTransfer.getData(DraggedEditorGroupIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const sourceGroup = this.editorPartsView.getGroup(data[0].identifier);
                if (sourceGroup) {
                    const mergeGroupOptions = { index: targetEditorIndex };
                    if (!this.isMoveOperation(e, sourceGroup.id)) {
                        mergeGroupOptions.mode = 0 /* MergeGroupMode.COPY_EDITORS */;
                    }
                    this.groupsView.mergeGroup(sourceGroup, this.groupView, mergeGroupOptions);
                }
                this.groupView.focus();
                this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype);
            }
        }
        // Check for editor transfer
        else if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
            const data = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const sourceGroup = this.editorPartsView.getGroup(data[0].identifier.groupId);
                if (sourceGroup) {
                    for (const de of data) {
                        const editor = de.identifier.editor;
                        // Only allow moving/copying from a single group source
                        if (sourceGroup.id !== de.identifier.groupId) {
                            continue;
                        }
                        // Keep the same order when moving / copying editors within the same group
                        const sourceEditorIndex = sourceGroup.getIndexOfEditor(editor);
                        if (sourceGroup === this.groupView && sourceEditorIndex < targetEditorIndex) {
                            targetEditorIndex--;
                        }
                        if (this.isMoveOperation(e, de.identifier.groupId, editor)) {
                            sourceGroup.moveEditor(editor, this.groupView, {
                                ...options,
                                index: targetEditorIndex,
                            });
                        }
                        else {
                            sourceGroup.copyEditor(editor, this.groupView, {
                                ...options,
                                index: targetEditorIndex,
                            });
                        }
                        targetEditorIndex++;
                    }
                }
            }
            this.groupView.focus();
            this.editorTransfer.clearData(DraggedEditorIdentifier.prototype);
        }
        // Check for tree items
        else if (this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)) {
            const data = this.treeItemsTransfer.getData(DraggedTreeItemsIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const editors = [];
                for (const id of data) {
                    const dataTransferItem = await this.treeViewsDragAndDropService.removeDragOperationTransfer(id.identifier);
                    if (dataTransferItem) {
                        const treeDropData = await extractTreeDropData(dataTransferItem);
                        editors.push(...treeDropData.map((editor) => ({
                            ...editor,
                            options: { ...editor.options, pinned: true, index: targetEditorIndex },
                        })));
                    }
                }
                this.editorService.openEditors(editors, this.groupView, { validateTrust: true });
            }
            this.treeItemsTransfer.clearData(DraggedTreeItemsIdentifier.prototype);
        }
        // Check for URI transfer
        else {
            const dropHandler = this.instantiationService.createInstance(ResourcesDropHandler, {
                allowWorkspaceOpen: false,
            });
            dropHandler.handleDrop(e, getWindow(this.parent), () => this.groupView, () => this.groupView.focus(), options);
        }
    }
    dispose() {
        super.dispose();
        this.tabDisposables = dispose(this.tabDisposables);
    }
};
MultiEditorTabsControl = MultiEditorTabsControl_1 = __decorate([
    __param(5, IContextMenuService),
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IQuickInputService),
    __param(11, IThemeService),
    __param(12, IEditorService),
    __param(13, IPathService),
    __param(14, ITreeViewsDnDService),
    __param(15, IEditorResolverService),
    __param(16, IHostService)
], MultiEditorTabsControl);
export { MultiEditorTabsControl };
registerThemingParticipant((theme, collector) => {
    // Add bottom border to tabs when wrapping
    const borderColor = theme.getColor(TAB_BORDER);
    if (borderColor) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title > .tabs-and-actions-container.wrapping .tabs-container > .tab {
				border-bottom: 1px solid ${borderColor};
			}
		`);
    }
    // Styling with Outline color (e.g. high contrast theme)
    const activeContrastBorderColor = theme.getColor(activeContrastBorder);
    if (activeContrastBorderColor) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab.active,
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab.active:hover  {
				outline: 1px solid;
				outline-offset: -5px;
			}

			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.selected:not(.active):not(:hover)  {
				outline: 1px dotted;
				outline-offset: -5px;
			}

			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab.active:focus {
				outline-style: dashed;
			}

			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active {
				outline: 1px dotted;
				outline-offset: -5px;
			}

			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:hover  {
				outline: 1px dashed;
				outline-offset: -5px;
			}

			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active > .tab-actions .action-label,
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active:hover > .tab-actions .action-label,
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.dirty > .tab-actions .action-label,
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.sticky > .tab-actions .action-label,
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:hover > .tab-actions .action-label {
				opacity: 1 !important;
			}
		`);
    }
    // High Contrast Border Color for Editor Actions
    const contrastBorderColor = theme.getColor(contrastBorder);
    if (contrastBorderColor) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title .editor-actions {
				outline: 1px solid ${contrastBorderColor}
			}
		`);
    }
    // Hover Background
    const tabHoverBackground = theme.getColor(TAB_HOVER_BACKGROUND);
    if (tabHoverBackground) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab:not(.selected):hover {
				background-color: ${tabHoverBackground} !important;
			}
		`);
    }
    const tabUnfocusedHoverBackground = theme.getColor(TAB_UNFOCUSED_HOVER_BACKGROUND);
    if (tabUnfocusedHoverBackground) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:not(.selected):hover  {
				background-color: ${tabUnfocusedHoverBackground} !important;
			}
		`);
    }
    // Hover Foreground
    const tabHoverForeground = theme.getColor(TAB_HOVER_FOREGROUND);
    if (tabHoverForeground) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab:not(.selected):hover  {
				color: ${tabHoverForeground} !important;
			}
		`);
    }
    const tabUnfocusedHoverForeground = theme.getColor(TAB_UNFOCUSED_HOVER_FOREGROUND);
    if (tabUnfocusedHoverForeground) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:not(.selected):hover  {
				color: ${tabUnfocusedHoverForeground} !important;
			}
		`);
    }
    // Hover Border
    //
    // Unfortunately we need to copy a lot of CSS over from the
    // multiEditorTabsControl.css because we want to reuse the same
    // styles we already have for the normal bottom-border.
    const tabHoverBorder = theme.getColor(TAB_HOVER_BORDER);
    if (tabHoverBorder) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab:hover > .tab-border-bottom-container {
				display: block;
				position: absolute;
				left: 0;
				pointer-events: none;
				width: 100%;
				z-index: 10;
				bottom: 0;
				height: 1px;
				background-color: ${tabHoverBorder};
			}
		`);
    }
    const tabUnfocusedHoverBorder = theme.getColor(TAB_UNFOCUSED_HOVER_BORDER);
    if (tabUnfocusedHoverBorder) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:hover > .tab-border-bottom-container  {
				display: block;
				position: absolute;
				left: 0;
				pointer-events: none;
				width: 100%;
				z-index: 10;
				bottom: 0;
				height: 1px;
				background-color: ${tabUnfocusedHoverBorder};
			}
		`);
    }
    // Fade out styles via linear gradient (when tabs are set to shrink or fixed)
    // But not when:
    // - in high contrast theme
    // - if we have a contrast border (which draws an outline - https://github.com/microsoft/vscode/issues/109117)
    // - on Safari (https://github.com/microsoft/vscode/issues/108996)
    if (!isHighContrast(theme.type) && !isSafari && !activeContrastBorderColor) {
        const workbenchBackground = WORKBENCH_BACKGROUND(theme);
        const editorBackgroundColor = theme.getColor(editorBackground);
        const editorGroupHeaderTabsBackground = theme.getColor(EDITOR_GROUP_HEADER_TABS_BACKGROUND);
        const editorDragAndDropBackground = theme.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND);
        let adjustedTabBackground;
        if (editorGroupHeaderTabsBackground && editorBackgroundColor) {
            adjustedTabBackground = editorGroupHeaderTabsBackground.flatten(editorBackgroundColor, editorBackgroundColor, workbenchBackground);
        }
        let adjustedTabDragBackground;
        if (editorGroupHeaderTabsBackground &&
            editorBackgroundColor &&
            editorDragAndDropBackground &&
            editorBackgroundColor) {
            adjustedTabDragBackground = editorGroupHeaderTabsBackground.flatten(editorBackgroundColor, editorDragAndDropBackground, editorBackgroundColor, workbenchBackground);
        }
        // Adjust gradient for focused and unfocused hover background
        const makeTabHoverBackgroundRule = (color, colorDrag, hasFocus = false) => `
			.monaco-workbench .part.editor > .content:not(.dragged-over) .editor-group-container${hasFocus ? '.active' : ''} > .title .tabs-container > .tab.sizing-shrink:not(.dragged):not(.sticky-compact):hover > .tab-label > .monaco-icon-label-container::after,
			.monaco-workbench .part.editor > .content:not(.dragged-over) .editor-group-container${hasFocus ? '.active' : ''} > .title .tabs-container > .tab.sizing-fixed:not(.dragged):not(.sticky-compact):hover > .tab-label > .monaco-icon-label-container::after {
				background: linear-gradient(to left, ${color}, transparent) !important;
			}

			.monaco-workbench .part.editor > .content.dragged-over .editor-group-container${hasFocus ? '.active' : ''} > .title .tabs-container > .tab.sizing-shrink:not(.dragged):not(.sticky-compact):hover > .tab-label > .monaco-icon-label-container::after,
			.monaco-workbench .part.editor > .content.dragged-over .editor-group-container${hasFocus ? '.active' : ''} > .title .tabs-container > .tab.sizing-fixed:not(.dragged):not(.sticky-compact):hover > .tab-label > .monaco-icon-label-container::after {
				background: linear-gradient(to left, ${colorDrag}, transparent) !important;
			}
		`;
        // Adjust gradient for (focused) hover background
        if (tabHoverBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabHoverBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabHoverBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabHoverBackgroundRule(adjustedColor, adjustedColorDrag, true));
        }
        // Adjust gradient for unfocused hover background
        if (tabUnfocusedHoverBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabUnfocusedHoverBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabUnfocusedHoverBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabHoverBackgroundRule(adjustedColor, adjustedColorDrag));
        }
        // Adjust gradient for drag and drop background
        if (editorDragAndDropBackground && adjustedTabDragBackground) {
            const adjustedColorDrag = editorDragAndDropBackground.flatten(adjustedTabDragBackground);
            collector.addRule(`
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container.active > .title .tabs-container > .tab.sizing-shrink.dragged-over:not(.active):not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container:not(.active) > .title .tabs-container > .tab.sizing-shrink.dragged-over:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container.active > .title .tabs-container > .tab.sizing-fixed.dragged-over:not(.active):not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container:not(.active) > .title .tabs-container > .tab.sizing-fixed.dragged-over:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after {
					background: linear-gradient(to left, ${adjustedColorDrag}, transparent) !important;
				}
		`);
        }
        const makeTabBackgroundRule = (color, colorDrag, focused, active) => `
				.monaco-workbench .part.editor > .content:not(.dragged-over) .editor-group-container${focused ? '.active' : ':not(.active)'} > .title .tabs-container > .tab.sizing-shrink${active ? '.active' : ''}:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content:not(.dragged-over) .editor-group-container${focused ? '.active' : ':not(.active)'} > .title .tabs-container > .tab.sizing-fixed${active ? '.active' : ''}:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after {
					background: linear-gradient(to left, ${color}, transparent);
				}

				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container${focused ? '.active' : ':not(.active)'} > .title .tabs-container > .tab.sizing-shrink${active ? '.active' : ''}:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container${focused ? '.active' : ':not(.active)'} > .title .tabs-container > .tab.sizing-fixed${active ? '.active' : ''}:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after {
					background: linear-gradient(to left, ${colorDrag}, transparent);
				}
		`;
        // Adjust gradient for focused active tab background
        const tabActiveBackground = theme.getColor(TAB_ACTIVE_BACKGROUND);
        if (tabActiveBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabActiveBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabActiveBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabBackgroundRule(adjustedColor, adjustedColorDrag, true, true));
        }
        // Adjust gradient for unfocused active tab background
        const tabUnfocusedActiveBackground = theme.getColor(TAB_UNFOCUSED_ACTIVE_BACKGROUND);
        if (tabUnfocusedActiveBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabUnfocusedActiveBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabUnfocusedActiveBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabBackgroundRule(adjustedColor, adjustedColorDrag, false, true));
        }
        // Adjust gradient for focused inactive tab background
        const tabInactiveBackground = theme.getColor(TAB_INACTIVE_BACKGROUND);
        if (tabInactiveBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabInactiveBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabInactiveBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabBackgroundRule(adjustedColor, adjustedColorDrag, true, false));
        }
        // Adjust gradient for unfocused inactive tab background
        const tabUnfocusedInactiveBackground = theme.getColor(TAB_UNFOCUSED_INACTIVE_BACKGROUND);
        if (tabUnfocusedInactiveBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabUnfocusedInactiveBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabUnfocusedInactiveBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabBackgroundRule(adjustedColor, adjustedColorDrag, false, false));
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlFZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9tdWx0aUVkaXRvclRhYnNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sc0JBQXNCLEVBR3RCLGdCQUFnQixFQUNoQiwwQkFBMEIsRUFHMUIsa0JBQWtCLEVBQ2xCLGlCQUFpQixHQUdqQixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pGLE9BQU8sRUFDTixTQUFTLElBQUksY0FBYyxFQUUzQixPQUFPLEdBQ1AsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsY0FBYyxFQUFrQix3QkFBd0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFP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