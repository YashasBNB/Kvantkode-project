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
var EditorPart_1;
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { Part } from '../../part.js';
import { Dimension, $, EventHelper, addDisposableGenericMouseDownListener, getWindow, isAncestorOfActiveElement, getActiveElement, isHTMLElement, } from '../../../../base/browser/dom.js';
import { Event, Emitter, Relay, PauseableEmitter } from '../../../../base/common/event.js';
import { contrastBorder, editorBackground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { orthogonal, SerializableGrid, Sizing, isGridBranchNode, createSerializedGrid, } from '../../../../base/browser/ui/grid/grid.js';
import { EDITOR_GROUP_BORDER, EDITOR_PANE_BACKGROUND } from '../../../common/theme.js';
import { distinct, coalesce } from '../../../../base/common/arrays.js';
import { getEditorPartOptions, impactsEditorPartOptions, } from './editor.js';
import { EditorGroupView } from './editorGroupView.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { dispose, toDisposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { isSerializedEditorGroupModel, } from '../../../common/editor/editorGroupModel.js';
import { EditorDropTarget } from './editorDropTarget.js';
import { Color } from '../../../../base/common/color.js';
import { CenteredViewLayout } from '../../../../base/browser/ui/centered/centeredViewLayout.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { assertIsDefined, assertType } from '../../../../base/common/types.js';
import { CompositeDragAndDropObserver } from '../../dnd.js';
import { DeferredPromise, Promises } from '../../../../base/common/async.js';
import { findGroup } from '../../../services/editor/common/editorGroupFinder.js';
import { SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { EditorPartMaximizedEditorGroupContext, EditorPartMultipleEditorGroupsContext, IsAuxiliaryEditorPartContext, } from '../../../common/contextkeys.js';
import { mainWindow } from '../../../../base/browser/window.js';
class GridWidgetView {
    constructor() {
        this.element = $('.grid-view-container');
        this._onDidChange = new Relay();
        this.onDidChange = this._onDidChange.event;
    }
    get minimumWidth() {
        return this.gridWidget ? this.gridWidget.minimumWidth : 0;
    }
    get maximumWidth() {
        return this.gridWidget ? this.gridWidget.maximumWidth : Number.POSITIVE_INFINITY;
    }
    get minimumHeight() {
        return this.gridWidget ? this.gridWidget.minimumHeight : 0;
    }
    get maximumHeight() {
        return this.gridWidget ? this.gridWidget.maximumHeight : Number.POSITIVE_INFINITY;
    }
    get gridWidget() {
        return this._gridWidget;
    }
    set gridWidget(grid) {
        this.element.innerText = '';
        if (grid) {
            this.element.appendChild(grid.element);
            this._onDidChange.input = grid.onDidChange;
        }
        else {
            this._onDidChange.input = Event.None;
        }
        this._gridWidget = grid;
    }
    layout(width, height, top, left) {
        this.gridWidget?.layout(width, height, top, left);
    }
    dispose() {
        this._onDidChange.dispose();
    }
}
let EditorPart = class EditorPart extends Part {
    static { EditorPart_1 = this; }
    static { this.EDITOR_PART_UI_STATE_STORAGE_KEY = 'editorpart.state'; }
    static { this.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY = 'editorpart.centeredview'; }
    constructor(editorPartsView, id, groupsLabel, windowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        super(id, { hasTitle: false }, themeService, storageService, layoutService);
        this.editorPartsView = editorPartsView;
        this.groupsLabel = groupsLabel;
        this.windowId = windowId;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.contextKeyService = contextKeyService;
        //#region Events
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidLayout = this._register(new Emitter());
        this.onDidLayout = this._onDidLayout.event;
        this._onDidChangeActiveGroup = this._register(new Emitter());
        this.onDidChangeActiveGroup = this._onDidChangeActiveGroup.event;
        this._onDidChangeGroupIndex = this._register(new Emitter());
        this.onDidChangeGroupIndex = this._onDidChangeGroupIndex.event;
        this._onDidChangeGroupLabel = this._register(new Emitter());
        this.onDidChangeGroupLabel = this._onDidChangeGroupLabel.event;
        this._onDidChangeGroupLocked = this._register(new Emitter());
        this.onDidChangeGroupLocked = this._onDidChangeGroupLocked.event;
        this._onDidChangeGroupMaximized = this._register(new Emitter());
        this.onDidChangeGroupMaximized = this._onDidChangeGroupMaximized.event;
        this._onDidActivateGroup = this._register(new Emitter());
        this.onDidActivateGroup = this._onDidActivateGroup.event;
        this._onDidAddGroup = this._register(new PauseableEmitter());
        this.onDidAddGroup = this._onDidAddGroup.event;
        this._onDidRemoveGroup = this._register(new PauseableEmitter());
        this.onDidRemoveGroup = this._onDidRemoveGroup.event;
        this._onDidMoveGroup = this._register(new Emitter());
        this.onDidMoveGroup = this._onDidMoveGroup.event;
        this.onDidSetGridWidget = this._register(new Emitter());
        this._onDidChangeSizeConstraints = this._register(new Relay());
        this.onDidChangeSizeConstraints = Event.any(this.onDidSetGridWidget.event, this._onDidChangeSizeConstraints.event);
        this._onDidScroll = this._register(new Relay());
        this.onDidScroll = Event.any(this.onDidSetGridWidget.event, this._onDidScroll.event);
        this._onDidChangeEditorPartOptions = this._register(new Emitter());
        this.onDidChangeEditorPartOptions = this._onDidChangeEditorPartOptions.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        //#endregion
        this.workspaceMemento = this.getMemento(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        this.profileMemento = this.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.groupViews = new Map();
        this.mostRecentActiveGroups = [];
        this.gridWidgetDisposables = this._register(new DisposableStore());
        this.gridWidgetView = this._register(new GridWidgetView());
        this.enforcedPartOptions = [];
        this.top = 0;
        this.left = 0;
        this.sideGroup = {
            openEditor: (editor, options) => {
                const [group] = this.scopedInstantiationService.invokeFunction((accessor) => findGroup(accessor, { editor, options }, SIDE_GROUP));
                return group.openEditor(editor, options);
            },
        };
        this._isReady = false;
        this.whenReadyPromise = new DeferredPromise();
        this.whenReady = this.whenReadyPromise.p;
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this._willRestoreState = false;
        this.priority = 2 /* LayoutPriority.High */;
        this._partOptions = getEditorPartOptions(this.configurationService, this.themeService);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
        this._register(this.themeService.onDidFileIconThemeChange(() => this.handleChangedPartOptions()));
        this._register(this.onDidChangeMementoValue(1 /* StorageScope.WORKSPACE */, this._store)((e) => this.onDidChangeMementoState(e)));
    }
    onConfigurationUpdated(event) {
        if (impactsEditorPartOptions(event)) {
            this.handleChangedPartOptions();
        }
    }
    handleChangedPartOptions() {
        const oldPartOptions = this._partOptions;
        const newPartOptions = getEditorPartOptions(this.configurationService, this.themeService);
        for (const enforcedPartOptions of this.enforcedPartOptions) {
            Object.assign(newPartOptions, enforcedPartOptions); // check for overrides
        }
        this._partOptions = newPartOptions;
        this._onDidChangeEditorPartOptions.fire({ oldPartOptions, newPartOptions });
    }
    get partOptions() {
        return this._partOptions;
    }
    enforcePartOptions(options) {
        this.enforcedPartOptions.push(options);
        this.handleChangedPartOptions();
        return toDisposable(() => {
            this.enforcedPartOptions.splice(this.enforcedPartOptions.indexOf(options), 1);
            this.handleChangedPartOptions();
        });
    }
    get contentDimension() {
        return this._contentDimension;
    }
    get activeGroup() {
        return this._activeGroup;
    }
    get groups() {
        return Array.from(this.groupViews.values());
    }
    get count() {
        return this.groupViews.size;
    }
    get orientation() {
        return this.gridWidget && this.gridWidget.orientation === 0 /* Orientation.VERTICAL */
            ? 1 /* GroupOrientation.VERTICAL */
            : 0 /* GroupOrientation.HORIZONTAL */;
    }
    get isReady() {
        return this._isReady;
    }
    get hasRestorableState() {
        return !!this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
    }
    get willRestoreState() {
        return this._willRestoreState;
    }
    getGroups(order = 0 /* GroupsOrder.CREATION_TIME */) {
        switch (order) {
            case 0 /* GroupsOrder.CREATION_TIME */:
                return this.groups;
            case 1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */: {
                const mostRecentActive = coalesce(this.mostRecentActiveGroups.map((groupId) => this.getGroup(groupId)));
                // there can be groups that got never active, even though they exist. in this case
                // make sure to just append them at the end so that all groups are returned properly
                return distinct([...mostRecentActive, ...this.groups]);
            }
            case 2 /* GroupsOrder.GRID_APPEARANCE */: {
                const views = [];
                if (this.gridWidget) {
                    this.fillGridNodes(views, this.gridWidget.getViews());
                }
                return views;
            }
        }
    }
    fillGridNodes(target, node) {
        if (isGridBranchNode(node)) {
            node.children.forEach((child) => this.fillGridNodes(target, child));
        }
        else {
            target.push(node.view);
        }
    }
    hasGroup(identifier) {
        return this.groupViews.has(identifier);
    }
    getGroup(identifier) {
        return this.groupViews.get(identifier);
    }
    findGroup(scope, source = this.activeGroup, wrap) {
        // by direction
        if (typeof scope.direction === 'number') {
            return this.doFindGroupByDirection(scope.direction, source, wrap);
        }
        // by location
        if (typeof scope.location === 'number') {
            return this.doFindGroupByLocation(scope.location, source, wrap);
        }
        throw new Error('invalid arguments');
    }
    doFindGroupByDirection(direction, source, wrap) {
        const sourceGroupView = this.assertGroupView(source);
        // Find neighbours and sort by our MRU list
        const neighbours = this.gridWidget.getNeighborViews(sourceGroupView, this.toGridViewDirection(direction), wrap);
        neighbours.sort((n1, n2) => this.mostRecentActiveGroups.indexOf(n1.id) - this.mostRecentActiveGroups.indexOf(n2.id));
        return neighbours[0];
    }
    doFindGroupByLocation(location, source, wrap) {
        const sourceGroupView = this.assertGroupView(source);
        const groups = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        const index = groups.indexOf(sourceGroupView);
        switch (location) {
            case 0 /* GroupLocation.FIRST */:
                return groups[0];
            case 1 /* GroupLocation.LAST */:
                return groups[groups.length - 1];
            case 2 /* GroupLocation.NEXT */: {
                let nextGroup = groups[index + 1];
                if (!nextGroup && wrap) {
                    nextGroup = this.doFindGroupByLocation(0 /* GroupLocation.FIRST */, source);
                }
                return nextGroup;
            }
            case 3 /* GroupLocation.PREVIOUS */: {
                let previousGroup = groups[index - 1];
                if (!previousGroup && wrap) {
                    previousGroup = this.doFindGroupByLocation(1 /* GroupLocation.LAST */, source);
                }
                return previousGroup;
            }
        }
    }
    activateGroup(group, preserveWindowOrder) {
        const groupView = this.assertGroupView(group);
        this.doSetGroupActive(groupView);
        // Ensure window on top unless disabled
        if (!preserveWindowOrder) {
            this.hostService.moveTop(getWindow(this.element));
        }
        return groupView;
    }
    restoreGroup(group) {
        const groupView = this.assertGroupView(group);
        this.doRestoreGroup(groupView);
        return groupView;
    }
    getSize(group) {
        const groupView = this.assertGroupView(group);
        return this.gridWidget.getViewSize(groupView);
    }
    setSize(group, size) {
        const groupView = this.assertGroupView(group);
        this.gridWidget.resizeView(groupView, size);
    }
    arrangeGroups(arrangement, target = this.activeGroup) {
        if (this.count < 2) {
            return; // require at least 2 groups to show
        }
        if (!this.gridWidget) {
            return; // we have not been created yet
        }
        const groupView = this.assertGroupView(target);
        switch (arrangement) {
            case 2 /* GroupsArrangement.EVEN */:
                this.gridWidget.distributeViewSizes();
                break;
            case 0 /* GroupsArrangement.MAXIMIZE */:
                if (this.groups.length < 2) {
                    return; // need at least 2 groups to be maximized
                }
                this.gridWidget.maximizeView(groupView);
                groupView.focus();
                break;
            case 1 /* GroupsArrangement.EXPAND */:
                this.gridWidget.expandView(groupView);
                break;
        }
    }
    toggleMaximizeGroup(target = this.activeGroup) {
        if (this.hasMaximizedGroup()) {
            this.unmaximizeGroup();
        }
        else {
            this.arrangeGroups(0 /* GroupsArrangement.MAXIMIZE */, target);
        }
    }
    toggleExpandGroup(target = this.activeGroup) {
        if (this.isGroupExpanded(this.activeGroup)) {
            this.arrangeGroups(2 /* GroupsArrangement.EVEN */);
        }
        else {
            this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, target);
        }
    }
    unmaximizeGroup() {
        this.gridWidget.exitMaximizedView();
        this._activeGroup.focus(); // When making views visible the focus can be affected, so restore it
    }
    hasMaximizedGroup() {
        return this.gridWidget.hasMaximizedView();
    }
    isGroupMaximized(targetGroup) {
        return this.gridWidget.isViewMaximized(targetGroup);
    }
    isGroupExpanded(targetGroup) {
        return this.gridWidget.isViewExpanded(targetGroup);
    }
    setGroupOrientation(orientation) {
        if (!this.gridWidget) {
            return; // we have not been created yet
        }
        const newOrientation = orientation === 0 /* GroupOrientation.HORIZONTAL */ ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
        if (this.gridWidget.orientation !== newOrientation) {
            this.gridWidget.orientation = newOrientation;
        }
    }
    applyLayout(layout) {
        const restoreFocus = this.shouldRestoreFocus(this.container);
        // Determine how many groups we need overall
        let layoutGroupsCount = 0;
        function countGroups(groups) {
            for (const group of groups) {
                if (Array.isArray(group.groups)) {
                    countGroups(group.groups);
                }
                else {
                    layoutGroupsCount++;
                }
            }
        }
        countGroups(layout.groups);
        // If we currently have too many groups, merge them into the last one
        let currentGroupViews = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        if (layoutGroupsCount < currentGroupViews.length) {
            const lastGroupInLayout = currentGroupViews[layoutGroupsCount - 1];
            currentGroupViews.forEach((group, index) => {
                if (index >= layoutGroupsCount) {
                    this.mergeGroup(group, lastGroupInLayout);
                }
            });
            currentGroupViews = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        }
        const activeGroup = this.activeGroup;
        // Prepare grid descriptor to create new grid from
        const gridDescriptor = createSerializedGrid({
            orientation: this.toGridViewOrientation(layout.orientation, this.isTwoDimensionalGrid()
                ? this.gridWidget.orientation // preserve original orientation for 2-dimensional grids
                : orthogonal(this.gridWidget.orientation)),
            groups: layout.groups,
        });
        // Recreate gridwidget with descriptor
        this.doApplyGridState(gridDescriptor, activeGroup.id, currentGroupViews);
        // Restore focus as needed
        if (restoreFocus) {
            this._activeGroup.focus();
        }
    }
    getLayout() {
        // Example return value:
        // { orientation: 0, groups: [ { groups: [ { size: 0.4 }, { size: 0.6 } ], size: 0.5 }, { groups: [ {}, {} ], size: 0.5 } ] }
        const serializedGrid = this.gridWidget.serialize();
        const orientation = serializedGrid.orientation === 1 /* Orientation.HORIZONTAL */
            ? 0 /* GroupOrientation.HORIZONTAL */
            : 1 /* GroupOrientation.VERTICAL */;
        const root = this.serializedNodeToGroupLayoutArgument(serializedGrid.root);
        return {
            orientation,
            groups: root.groups,
        };
    }
    serializedNodeToGroupLayoutArgument(serializedNode) {
        if (serializedNode.type === 'branch') {
            return {
                size: serializedNode.size,
                groups: serializedNode.data.map((node) => this.serializedNodeToGroupLayoutArgument(node)),
            };
        }
        return { size: serializedNode.size };
    }
    shouldRestoreFocus(target) {
        if (!target) {
            return false;
        }
        const activeElement = getActiveElement();
        if (activeElement === target.ownerDocument.body) {
            return true; // always restore focus if nothing is focused currently
        }
        // otherwise check for the active element being an ancestor of the target
        return isAncestorOfActiveElement(target);
    }
    isTwoDimensionalGrid() {
        const views = this.gridWidget.getViews();
        if (isGridBranchNode(views)) {
            // the grid is 2-dimensional if any children
            // of the grid is a branch node
            return views.children.some((child) => isGridBranchNode(child));
        }
        return false;
    }
    addGroup(location, direction, groupToCopy) {
        const locationView = this.assertGroupView(location);
        let newGroupView;
        // Same groups view: add to grid widget directly
        if (locationView.groupsView === this) {
            const restoreFocus = this.shouldRestoreFocus(locationView.element);
            const shouldExpand = this.groupViews.size > 1 && this.isGroupExpanded(locationView);
            newGroupView = this.doCreateGroupView(groupToCopy);
            // Add to grid widget
            this.gridWidget.addView(newGroupView, this.getSplitSizingStyle(), locationView, this.toGridViewDirection(direction));
            // Update container
            this.updateContainer();
            // Event
            this._onDidAddGroup.fire(newGroupView);
            // Notify group index change given a new group was added
            this.notifyGroupIndexChange();
            // Expand new group, if the reference view was previously expanded
            if (shouldExpand) {
                this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, newGroupView);
            }
            // Restore focus if we had it previously after completing the grid
            // operation. That operation might cause reparenting of grid views
            // which moves focus to the <body> element otherwise.
            if (restoreFocus) {
                locationView.focus();
            }
        }
        // Different group view: add to grid widget of that group
        else {
            newGroupView = locationView.groupsView.addGroup(locationView, direction, groupToCopy);
        }
        return newGroupView;
    }
    getSplitSizingStyle() {
        switch (this._partOptions.splitSizing) {
            case 'distribute':
                return Sizing.Distribute;
            case 'split':
                return Sizing.Split;
            default:
                return Sizing.Auto;
        }
    }
    doCreateGroupView(from, options) {
        // Create group view
        let groupView;
        if (from instanceof EditorGroupView) {
            groupView = EditorGroupView.createCopy(from, this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        else if (isSerializedEditorGroupModel(from)) {
            groupView = EditorGroupView.createFromSerialized(from, this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        else {
            groupView = EditorGroupView.createNew(this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        // Keep in map
        this.groupViews.set(groupView.id, groupView);
        // Track focus
        const groupDisposables = new DisposableStore();
        groupDisposables.add(groupView.onDidFocus(() => {
            this.doSetGroupActive(groupView);
            this._onDidFocus.fire();
        }));
        // Track group changes
        groupDisposables.add(groupView.onDidModelChange((e) => {
            switch (e.kind) {
                case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                    this._onDidChangeGroupLocked.fire(groupView);
                    break;
                case 1 /* GroupModelChangeKind.GROUP_INDEX */:
                    this._onDidChangeGroupIndex.fire(groupView);
                    break;
                case 2 /* GroupModelChangeKind.GROUP_LABEL */:
                    this._onDidChangeGroupLabel.fire(groupView);
                    break;
            }
        }));
        // Track active editor change after it occurred
        groupDisposables.add(groupView.onDidActiveEditorChange(() => {
            this.updateContainer();
        }));
        // Track dispose
        Event.once(groupView.onWillDispose)(() => {
            dispose(groupDisposables);
            this.groupViews.delete(groupView.id);
            this.doUpdateMostRecentActive(groupView);
        });
        return groupView;
    }
    doSetGroupActive(group) {
        if (this._activeGroup !== group) {
            const previousActiveGroup = this._activeGroup;
            this._activeGroup = group;
            // Update list of most recently active groups
            this.doUpdateMostRecentActive(group, true);
            // Mark previous one as inactive
            if (previousActiveGroup && !previousActiveGroup.disposed) {
                previousActiveGroup.setActive(false);
            }
            // Mark group as new active
            group.setActive(true);
            // Expand the group if it is currently minimized
            this.doRestoreGroup(group);
            // Event
            this._onDidChangeActiveGroup.fire(group);
        }
        // Always fire the event that a group has been activated
        // even if its the same group that is already active to
        // signal the intent even when nothing has changed.
        this._onDidActivateGroup.fire(group);
    }
    doRestoreGroup(group) {
        if (!this.gridWidget) {
            return; // method is called as part of state restore very early
        }
        try {
            if (this.hasMaximizedGroup() && !this.isGroupMaximized(group)) {
                this.unmaximizeGroup();
            }
            const viewSize = this.gridWidget.getViewSize(group);
            if (viewSize.width === group.minimumWidth || viewSize.height === group.minimumHeight) {
                this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, group);
            }
        }
        catch (error) {
            // ignore: method might be called too early before view is known to grid
        }
    }
    doUpdateMostRecentActive(group, makeMostRecentlyActive) {
        const index = this.mostRecentActiveGroups.indexOf(group.id);
        // Remove from MRU list
        if (index !== -1) {
            this.mostRecentActiveGroups.splice(index, 1);
        }
        // Add to front as needed
        if (makeMostRecentlyActive) {
            this.mostRecentActiveGroups.unshift(group.id);
        }
    }
    toGridViewDirection(direction) {
        switch (direction) {
            case 0 /* GroupDirection.UP */:
                return 0 /* Direction.Up */;
            case 1 /* GroupDirection.DOWN */:
                return 1 /* Direction.Down */;
            case 2 /* GroupDirection.LEFT */:
                return 2 /* Direction.Left */;
            case 3 /* GroupDirection.RIGHT */:
                return 3 /* Direction.Right */;
        }
    }
    toGridViewOrientation(orientation, fallback) {
        if (typeof orientation === 'number') {
            return orientation === 0 /* GroupOrientation.HORIZONTAL */
                ? 1 /* Orientation.HORIZONTAL */
                : 0 /* Orientation.VERTICAL */;
        }
        return fallback;
    }
    removeGroup(group, preserveFocus) {
        const groupView = this.assertGroupView(group);
        if (this.count === 1) {
            return; // Cannot remove the last root group
        }
        // Remove empty group
        if (groupView.isEmpty) {
            this.doRemoveEmptyGroup(groupView, preserveFocus);
        }
        // Remove group with editors
        else {
            this.doRemoveGroupWithEditors(groupView);
        }
    }
    doRemoveGroupWithEditors(groupView) {
        const mostRecentlyActiveGroups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        let lastActiveGroup;
        if (this._activeGroup === groupView) {
            lastActiveGroup = mostRecentlyActiveGroups[1];
        }
        else {
            lastActiveGroup = mostRecentlyActiveGroups[0];
        }
        // Removing a group with editors should merge these editors into the
        // last active group and then remove this group.
        this.mergeGroup(groupView, lastActiveGroup);
    }
    doRemoveEmptyGroup(groupView, preserveFocus) {
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.container);
        // Activate next group if the removed one was active
        if (this._activeGroup === groupView) {
            const mostRecentlyActiveGroups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current group we are about to dispose
            this.doSetGroupActive(nextActiveGroup);
        }
        // Remove from grid widget & dispose
        this.gridWidget.removeView(groupView, this.getSplitSizingStyle());
        groupView.dispose();
        // Restore focus if we had it previously after completing the grid
        // operation. That operation might cause reparenting of grid views
        // which moves focus to the <body> element otherwise.
        if (restoreFocus) {
            this._activeGroup.focus();
        }
        // Notify group index change given a group was removed
        this.notifyGroupIndexChange();
        // Update container
        this.updateContainer();
        // Event
        this._onDidRemoveGroup.fire(groupView);
    }
    moveGroup(group, location, direction) {
        const sourceView = this.assertGroupView(group);
        const targetView = this.assertGroupView(location);
        if (sourceView.id === targetView.id) {
            throw new Error('Cannot move group into its own');
        }
        const restoreFocus = this.shouldRestoreFocus(sourceView.element);
        let movedView;
        // Same groups view: move via grid widget API
        if (sourceView.groupsView === targetView.groupsView) {
            this.gridWidget.moveView(sourceView, this.getSplitSizingStyle(), targetView, this.toGridViewDirection(direction));
            movedView = sourceView;
        }
        // Different groups view: move via groups view API
        else {
            movedView = targetView.groupsView.addGroup(targetView, direction, sourceView);
            sourceView.closeAllEditors();
            this.removeGroup(sourceView, restoreFocus);
        }
        // Restore focus if we had it previously after completing the grid
        // operation. That operation might cause reparenting of grid views
        // which moves focus to the <body> element otherwise.
        if (restoreFocus) {
            movedView.focus();
        }
        // Event
        this._onDidMoveGroup.fire(movedView);
        // Notify group index change given a group was moved
        this.notifyGroupIndexChange();
        return movedView;
    }
    copyGroup(group, location, direction) {
        const groupView = this.assertGroupView(group);
        const locationView = this.assertGroupView(location);
        const restoreFocus = this.shouldRestoreFocus(groupView.element);
        // Copy the group view
        const copiedGroupView = this.addGroup(locationView, direction, groupView);
        // Restore focus if we had it
        if (restoreFocus) {
            copiedGroupView.focus();
        }
        return copiedGroupView;
    }
    mergeGroup(group, target, options) {
        const sourceView = this.assertGroupView(group);
        const targetView = this.assertGroupView(target);
        // Collect editors to move/copy
        const editors = [];
        let index = options && typeof options.index === 'number' ? options.index : targetView.count;
        for (const editor of sourceView.editors) {
            const inactive = !sourceView.isActive(editor) || this._activeGroup !== sourceView;
            let actualIndex;
            if (targetView.contains(editor) &&
                // Do not configure an `index` for editors that are sticky in
                // the target, otherwise there is a chance of losing that state
                // when the editor is moved.
                // See https://github.com/microsoft/vscode/issues/239549
                (targetView.isSticky(editor) ||
                    // Do not configure an `index` when we are explicitly instructed
                    options?.preserveExistingIndex)) {
                // leave `index` as `undefined`
            }
            else {
                actualIndex = index;
                index++;
            }
            editors.push({
                editor,
                options: {
                    index: actualIndex,
                    inactive,
                    preserveFocus: inactive,
                },
            });
        }
        // Move/Copy editors over into target
        let result = true;
        if (options?.mode === 0 /* MergeGroupMode.COPY_EDITORS */) {
            sourceView.copyEditors(editors, targetView);
        }
        else {
            result = sourceView.moveEditors(editors, targetView);
        }
        // Remove source if the view is now empty and not already removed
        if (sourceView.isEmpty &&
            !sourceView.disposed /* could have been disposed already via workbench.editor.closeEmptyGroups setting */) {
            this.removeGroup(sourceView, true);
        }
        return result;
    }
    mergeAllGroups(target, options) {
        const targetView = this.assertGroupView(target);
        let result = true;
        for (const group of this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (group === targetView) {
                continue; // keep target
            }
            const merged = this.mergeGroup(group, targetView, options);
            if (!merged) {
                result = false;
            }
        }
        return result;
    }
    assertGroupView(group) {
        let groupView;
        if (typeof group === 'number') {
            groupView = this.editorPartsView.getGroup(group);
        }
        else {
            groupView = group;
        }
        if (!groupView) {
            throw new Error('Invalid editor group provided!');
        }
        return groupView;
    }
    createEditorDropTarget(container, delegate) {
        assertType(isHTMLElement(container));
        return this.scopedInstantiationService.createInstance(EditorDropTarget, container, delegate);
    }
    //#region Part
    // TODO @sbatten @joao find something better to prevent editor taking over #79897
    get minimumWidth() {
        return Math.min(this.centeredLayoutWidget.minimumWidth, this.layoutService.getMaximumEditorDimensions(this.layoutService.getContainer(getWindow(this.container))).width);
    }
    get maximumWidth() {
        return this.centeredLayoutWidget.maximumWidth;
    }
    get minimumHeight() {
        return Math.min(this.centeredLayoutWidget.minimumHeight, this.layoutService.getMaximumEditorDimensions(this.layoutService.getContainer(getWindow(this.container))).height);
    }
    get maximumHeight() {
        return this.centeredLayoutWidget.maximumHeight;
    }
    get snap() {
        return this.layoutService.getPanelAlignment() === 'center';
    }
    get onDidChange() {
        return Event.any(this.centeredLayoutWidget.onDidChange, this.onDidSetGridWidget.event);
    }
    get gridSeparatorBorder() {
        return (this.theme.getColor(EDITOR_GROUP_BORDER) ||
            this.theme.getColor(contrastBorder) ||
            Color.transparent);
    }
    updateStyles() {
        const container = assertIsDefined(this.container);
        container.style.backgroundColor = this.getColor(editorBackground) || '';
        const separatorBorderStyle = {
            separatorBorder: this.gridSeparatorBorder,
            background: this.theme.getColor(EDITOR_PANE_BACKGROUND) || Color.transparent,
        };
        this.gridWidget.style(separatorBorderStyle);
        this.centeredLayoutWidget.styles(separatorBorderStyle);
    }
    createContentArea(parent, options) {
        // Container
        this.element = parent;
        this.container = $('.content');
        if (this.windowId !== mainWindow.vscodeWindowId) {
            this.container.classList.add('auxiliary');
        }
        parent.appendChild(this.container);
        // Scoped instantiation service
        const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.container));
        this.scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])));
        // Grid control
        this._willRestoreState = !options || options.restorePreviousState;
        this.doCreateGridControl();
        // Centered layout widget
        this.centeredLayoutWidget = this._register(new CenteredViewLayout(this.container, this.gridWidgetView, this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY], this._partOptions.centeredLayoutFixedWidth));
        this._register(this.onDidChangeEditorPartOptions((e) => this.centeredLayoutWidget.setFixedWidth(e.newPartOptions.centeredLayoutFixedWidth ?? false)));
        // Drag & Drop support
        this.setupDragAndDropSupport(parent, this.container);
        // Context keys
        this.handleContextKeys(scopedContextKeyService);
        // Signal ready
        this.whenReadyPromise.complete();
        this._isReady = true;
        // Signal restored
        Promises.settled(this.groups.map((group) => group.whenRestored)).finally(() => {
            this.whenRestoredPromise.complete();
        });
        return this.container;
    }
    handleContextKeys(contextKeyService) {
        const isAuxiliaryEditorPartContext = IsAuxiliaryEditorPartContext.bindTo(contextKeyService);
        isAuxiliaryEditorPartContext.set(this.windowId !== mainWindow.vscodeWindowId);
        const multipleEditorGroupsContext = EditorPartMultipleEditorGroupsContext.bindTo(contextKeyService);
        const maximizedEditorGroupContext = EditorPartMaximizedEditorGroupContext.bindTo(contextKeyService);
        const updateContextKeys = () => {
            const groupCount = this.count;
            if (groupCount > 1) {
                multipleEditorGroupsContext.set(true);
            }
            else {
                multipleEditorGroupsContext.reset();
            }
            if (this.hasMaximizedGroup()) {
                maximizedEditorGroupContext.set(true);
            }
            else {
                maximizedEditorGroupContext.reset();
            }
        };
        updateContextKeys();
        this._register(this.onDidAddGroup(() => updateContextKeys()));
        this._register(this.onDidRemoveGroup(() => updateContextKeys()));
        this._register(this.onDidChangeGroupMaximized(() => updateContextKeys()));
    }
    setupDragAndDropSupport(parent, container) {
        // Editor drop target
        this._register(this.createEditorDropTarget(container, Object.create(null)));
        // No drop in the editor
        const overlay = $('.drop-block-overlay');
        parent.appendChild(overlay);
        // Hide the block if a mouse down event occurs #99065
        this._register(addDisposableGenericMouseDownListener(overlay, () => overlay.classList.remove('visible')));
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(this.element, {
            onDragStart: (e) => overlay.classList.add('visible'),
            onDragEnd: (e) => overlay.classList.remove('visible'),
        }));
        let horizontalOpenerTimeout;
        let verticalOpenerTimeout;
        let lastOpenHorizontalPosition;
        let lastOpenVerticalPosition;
        const openPartAtPosition = (position) => {
            if (!this.layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) &&
                position === this.layoutService.getPanelPosition()) {
                this.layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
            }
            else if (!this.layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) &&
                position ===
                    (this.layoutService.getSideBarPosition() === 1 /* Position.RIGHT */
                        ? 0 /* Position.LEFT */
                        : 1 /* Position.RIGHT */)) {
                this.layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            }
        };
        const clearAllTimeouts = () => {
            if (horizontalOpenerTimeout) {
                clearTimeout(horizontalOpenerTimeout);
                horizontalOpenerTimeout = undefined;
            }
            if (verticalOpenerTimeout) {
                clearTimeout(verticalOpenerTimeout);
                verticalOpenerTimeout = undefined;
            }
        };
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(overlay, {
            onDragOver: (e) => {
                EventHelper.stop(e.eventData, true);
                if (e.eventData.dataTransfer) {
                    e.eventData.dataTransfer.dropEffect = 'none';
                }
                const boundingRect = overlay.getBoundingClientRect();
                let openHorizontalPosition = undefined;
                let openVerticalPosition = undefined;
                const proximity = 100;
                if (e.eventData.clientX < boundingRect.left + proximity) {
                    openHorizontalPosition = 0 /* Position.LEFT */;
                }
                if (e.eventData.clientX > boundingRect.right - proximity) {
                    openHorizontalPosition = 1 /* Position.RIGHT */;
                }
                if (e.eventData.clientY > boundingRect.bottom - proximity) {
                    openVerticalPosition = 2 /* Position.BOTTOM */;
                }
                if (e.eventData.clientY < boundingRect.top + proximity) {
                    openVerticalPosition = 3 /* Position.TOP */;
                }
                if (horizontalOpenerTimeout && openHorizontalPosition !== lastOpenHorizontalPosition) {
                    clearTimeout(horizontalOpenerTimeout);
                    horizontalOpenerTimeout = undefined;
                }
                if (verticalOpenerTimeout && openVerticalPosition !== lastOpenVerticalPosition) {
                    clearTimeout(verticalOpenerTimeout);
                    verticalOpenerTimeout = undefined;
                }
                if (!horizontalOpenerTimeout && openHorizontalPosition !== undefined) {
                    lastOpenHorizontalPosition = openHorizontalPosition;
                    horizontalOpenerTimeout = setTimeout(() => openPartAtPosition(openHorizontalPosition), 200);
                }
                if (!verticalOpenerTimeout && openVerticalPosition !== undefined) {
                    lastOpenVerticalPosition = openVerticalPosition;
                    verticalOpenerTimeout = setTimeout(() => openPartAtPosition(openVerticalPosition), 200);
                }
            },
            onDragLeave: () => clearAllTimeouts(),
            onDragEnd: () => clearAllTimeouts(),
            onDrop: () => clearAllTimeouts(),
        }));
    }
    centerLayout(active) {
        this.centeredLayoutWidget.activate(active);
    }
    isLayoutCentered() {
        if (this.centeredLayoutWidget) {
            return this.centeredLayoutWidget.isActive();
        }
        return false;
    }
    doCreateGridControl() {
        // Grid Widget (with previous UI state)
        let restoreError = false;
        if (this._willRestoreState) {
            restoreError = !this.doCreateGridControlWithPreviousState();
        }
        // Grid Widget (no previous UI state or failed to restore)
        if (!this.gridWidget || restoreError) {
            const initialGroup = this.doCreateGroupView();
            this.doSetGridWidget(new SerializableGrid(initialGroup));
            // Ensure a group is active
            this.doSetGroupActive(initialGroup);
        }
        // Update container
        this.updateContainer();
        // Notify group index change we created the entire grid
        this.notifyGroupIndexChange();
    }
    doCreateGridControlWithPreviousState() {
        const state = this.loadState();
        if (state?.serializedGrid) {
            try {
                // MRU
                this.mostRecentActiveGroups = state.mostRecentActiveGroups;
                // Grid Widget
                this.doCreateGridControlWithState(state.serializedGrid, state.activeGroup);
            }
            catch (error) {
                // Log error
                onUnexpectedError(new Error(`Error restoring editor grid widget: ${error} (with state: ${JSON.stringify(state)})`));
                // Clear any state we have from the failing restore
                this.disposeGroups();
                return false; // failure
            }
        }
        return true; // success
    }
    doCreateGridControlWithState(serializedGrid, activeGroupId, editorGroupViewsToReuse, options) {
        // Determine group views to reuse if any
        let reuseGroupViews;
        if (editorGroupViewsToReuse) {
            reuseGroupViews = editorGroupViewsToReuse.slice(0); // do not modify original array
        }
        else {
            reuseGroupViews = [];
        }
        // Create new
        const groupViews = [];
        const gridWidget = SerializableGrid.deserialize(serializedGrid, {
            fromJSON: (serializedEditorGroup) => {
                let groupView;
                if (reuseGroupViews.length > 0) {
                    groupView = reuseGroupViews.shift();
                }
                else {
                    groupView = this.doCreateGroupView(serializedEditorGroup, options);
                }
                groupViews.push(groupView);
                if (groupView.id === activeGroupId) {
                    this.doSetGroupActive(groupView);
                }
                return groupView;
            },
        }, { styles: { separatorBorder: this.gridSeparatorBorder } });
        // If the active group was not found when restoring the grid
        // make sure to make at least one group active. We always need
        // an active group.
        if (!this._activeGroup) {
            this.doSetGroupActive(groupViews[0]);
        }
        // Validate MRU group views matches grid widget state
        if (this.mostRecentActiveGroups.some((groupId) => !this.getGroup(groupId))) {
            this.mostRecentActiveGroups = groupViews.map((group) => group.id);
        }
        // Set it
        this.doSetGridWidget(gridWidget);
    }
    doSetGridWidget(gridWidget) {
        let boundarySashes = {};
        if (this.gridWidget) {
            boundarySashes = this.gridWidget.boundarySashes;
            this.gridWidget.dispose();
        }
        this.gridWidget = gridWidget;
        this.gridWidget.boundarySashes = boundarySashes;
        this.gridWidgetView.gridWidget = gridWidget;
        this._onDidChangeSizeConstraints.input = gridWidget.onDidChange;
        this._onDidScroll.input = gridWidget.onDidScroll;
        this.gridWidgetDisposables.clear();
        this.gridWidgetDisposables.add(gridWidget.onDidChangeViewMaximized((maximized) => this._onDidChangeGroupMaximized.fire(maximized)));
        this.onDidSetGridWidget.fire(undefined);
    }
    updateContainer() {
        const container = assertIsDefined(this.container);
        container.classList.toggle('empty', this.isEmpty);
    }
    notifyGroupIndexChange() {
        this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */).forEach((group, index) => group.notifyIndexChanged(index));
    }
    notifyGroupsLabelChange(newLabel) {
        for (const group of this.groups) {
            group.notifyLabelChanged(newLabel);
        }
    }
    get isEmpty() {
        return this.count === 1 && this._activeGroup.isEmpty;
    }
    setBoundarySashes(sashes) {
        this.gridWidget.boundarySashes = sashes;
        this.centeredLayoutWidget.boundarySashes = sashes;
    }
    layout(width, height, top, left) {
        this.top = top;
        this.left = left;
        // Layout contents
        const contentAreaSize = super.layoutContents(width, height).contentSize;
        // Layout editor container
        this.doLayout(Dimension.lift(contentAreaSize), top, left);
    }
    doLayout(dimension, top = this.top, left = this.left) {
        this._contentDimension = dimension;
        // Layout Grid
        this.centeredLayoutWidget.layout(this._contentDimension.width, this._contentDimension.height, top, left);
        // Event
        this._onDidLayout.fire(dimension);
    }
    saveState() {
        // Persist grid UI state
        if (this.gridWidget) {
            if (this.isEmpty) {
                delete this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
            }
            else {
                this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY] = this.createState();
            }
        }
        // Persist centered view state
        if (this.centeredLayoutWidget) {
            const centeredLayoutState = this.centeredLayoutWidget.state;
            if (this.centeredLayoutWidget.isDefault(centeredLayoutState)) {
                delete this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY];
            }
            else {
                this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY] = centeredLayoutState;
            }
        }
        super.saveState();
    }
    loadState() {
        return this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
    }
    createState() {
        return {
            serializedGrid: this.gridWidget.serialize(),
            activeGroup: this._activeGroup.id,
            mostRecentActiveGroups: this.mostRecentActiveGroups,
        };
    }
    applyState(state, options) {
        if (state === 'empty') {
            return this.doApplyEmptyState();
        }
        else {
            return this.doApplyState(state, options);
        }
    }
    async doApplyState(state, options) {
        const groups = await this.doPrepareApplyState();
        // Pause add/remove events for groups during the duration of applying the state
        // This ensures that we can do this transition atomically with the new state
        // being ready when the events are fired. This is important because usually there
        // is never the state where no groups are present, but for this transition we
        // need to temporarily dispose all groups to restore the new set.
        this._onDidAddGroup.pause();
        this._onDidRemoveGroup.pause();
        this.disposeGroups();
        // MRU
        this.mostRecentActiveGroups = state.mostRecentActiveGroups;
        // Grid Widget
        try {
            this.doApplyGridState(state.serializedGrid, state.activeGroup, undefined, options);
        }
        finally {
            // It is very important to keep this order: first resume the events for
            // removed groups and then for added groups. Many listeners may store
            // groups in sets by their identifier and groups can have the same
            // identifier before and after.
            this._onDidRemoveGroup.resume();
            this._onDidAddGroup.resume();
        }
        // Restore editors that were not closed before and are now opened now
        await this.activeGroup.openEditors(groups
            .flatMap((group) => group.editors)
            .filter((editor) => this.editorPartsView.groups.every((groupView) => !groupView.contains(editor)))
            .map((editor) => ({
            editor,
            options: { pinned: true, preserveFocus: true, inactive: true },
        })));
    }
    async doApplyEmptyState() {
        await this.doPrepareApplyState();
        this.mergeAllGroups(this.activeGroup);
    }
    async doPrepareApplyState() {
        // Before disposing groups, try to close as many editors as
        // possible, but skip over those that would trigger a dialog
        // (for example when being dirty). This is to be able to later
        // restore these editors after state has been applied.
        const groups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        for (const group of groups) {
            await group.closeAllEditors({ excludeConfirming: true });
        }
        return groups;
    }
    doApplyGridState(gridState, activeGroupId, editorGroupViewsToReuse, options) {
        // Recreate grid widget from state
        this.doCreateGridControlWithState(gridState, activeGroupId, editorGroupViewsToReuse, options);
        // Layout
        this.doLayout(this._contentDimension);
        // Update container
        this.updateContainer();
        // Events for groups that got added
        for (const groupView of this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)) {
            if (!editorGroupViewsToReuse?.includes(groupView)) {
                this._onDidAddGroup.fire(groupView);
            }
        }
        // Notify group index change given layout has changed
        this.notifyGroupIndexChange();
    }
    onDidChangeMementoState(e) {
        if (e.external && e.scope === 1 /* StorageScope.WORKSPACE */) {
            this.reloadMemento(e.scope);
            const state = this.loadState();
            if (state) {
                this.applyState(state);
            }
        }
    }
    toJSON() {
        return {
            type: "workbench.parts.editor" /* Parts.EDITOR_PART */,
        };
    }
    disposeGroups() {
        for (const group of this.groups) {
            group.dispose();
            this._onDidRemoveGroup.fire(group);
        }
        this.groupViews.clear();
        this.mostRecentActiveGroups = [];
    }
    dispose() {
        // Event
        this._onWillDispose.fire();
        // Forward to all groups
        this.disposeGroups();
        // Grid widget
        this.gridWidget?.dispose();
        super.dispose();
    }
};
EditorPart = EditorPart_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IStorageService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IHostService),
    __param(10, IContextKeyService)
], EditorPart);
export { EditorPart };
let MainEditorPart = class MainEditorPart extends EditorPart {
    constructor(editorPartsView, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        super(editorPartsView, "workbench.parts.editor" /* Parts.EDITOR_PART */, '', mainWindow.vscodeWindowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService);
    }
};
MainEditorPart = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IHostService),
    __param(7, IContextKeyService)
], MainEditorPart);
export { MainEditorPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNwQyxPQUFPLEVBQ04sU0FBUyxFQUNULENBQUMsRUFDRCxXQUFXLEVBQ1gscUNBQXFDLEVBQ3JDLFNBQVMsRUFDVCx5QkFBeUIsRUFDekIsZ0JBQWdCLEVBQ2hCLGFBQWEsR0FDYixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFGLE9BQU8sRUFDTixjQUFjLEVBQ2QsZ0JBQWdCLEdBQ2hCLE1BQU0sb0RBQW9ELENBQUE7QUFnQjNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixVQUFVLEVBSVYsZ0JBQWdCLEVBQ2hCLE1BQU0sRUFLTixnQkFBZ0IsRUFFaEIsb0JBQW9CLEdBRXBCLE1BQU0sMENBQTBDLENBQUE7QUFRakQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLHdCQUF3QixHQUt4QixNQUFNLGFBQWEsQ0FBQTtBQUNwQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFFTixPQUFPLEVBQ1AsWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixlQUFlLEdBSWYsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBRU4sNEJBQTRCLEdBQzVCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFFTix1QkFBdUIsR0FFdkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQWUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFDTixxQ0FBcUMsRUFDckMscUNBQXFDLEVBQ3JDLDRCQUE0QixHQUM1QixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQVEvRCxNQUFNLGNBQWM7SUFBcEI7UUFDVSxZQUFPLEdBQWdCLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBZWpELGlCQUFZLEdBQUcsSUFBSSxLQUFLLEVBQWlELENBQUE7UUFDeEUsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQTRCL0MsQ0FBQztJQTFDQSxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUNELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQTtJQUNqRixDQUFDO0lBQ0QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBQ0QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQTtJQUNsRixDQUFDO0lBT0QsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxJQUFJLFVBQVUsQ0FBQyxJQUF5QjtRQUN2QyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFFM0IsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQzNDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNyQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7SUFDeEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFhLEVBQUUsTUFBYyxFQUFFLEdBQVcsRUFBRSxJQUFZO1FBQzlELElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0NBQ0Q7QUFFTSxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEsSUFBSTs7YUFDWCxxQ0FBZ0MsR0FBRyxrQkFBa0IsQUFBckIsQ0FBcUI7YUFDckQsMENBQXFDLEdBQUcseUJBQXlCLEFBQTVCLENBQTRCO0lBOEV6RixZQUNvQixlQUFpQyxFQUNwRCxFQUFVLEVBQ08sV0FBbUIsRUFDM0IsUUFBZ0IsRUFDRixvQkFBNEQsRUFDcEUsWUFBMkIsRUFDbkIsb0JBQTRELEVBQ2xFLGNBQStCLEVBQ3ZCLGFBQXNDLEVBQ2pELFdBQTBDLEVBQ3BDLGlCQUFzRDtRQUUxRSxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFaeEQsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBRW5DLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQzNCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDZSx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBRTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFHcEQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQXZGM0UsZ0JBQWdCO1FBRUMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN6RCxlQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUE7UUFFM0IsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFhLENBQUMsQ0FBQTtRQUMvRCxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBRTdCLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW9CLENBQUMsQ0FBQTtRQUNqRiwyQkFBc0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFBO1FBRW5ELDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW9CLENBQUMsQ0FBQTtRQUNoRiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBRWpELDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW9CLENBQUMsQ0FBQTtRQUNoRiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBRWpELDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW9CLENBQUMsQ0FBQTtRQUNqRiwyQkFBc0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFBO1FBRW5ELCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFBO1FBQzNFLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUE7UUFFekQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBb0IsQ0FBQyxDQUFBO1FBQzdFLHVCQUFrQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFFM0MsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLEVBQW9CLENBQUMsQ0FBQTtRQUNqRixrQkFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO1FBRWpDLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsRUFBb0IsQ0FBQyxDQUFBO1FBQ3BGLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFdkMsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFvQixDQUFDLENBQUE7UUFDekUsbUJBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQTtRQUVuQyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNuRCxJQUFJLE9BQU8sRUFBaUQsQ0FDNUQsQ0FBQTtRQUVnQixnQ0FBMkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1RCxJQUFJLEtBQUssRUFBaUQsQ0FDMUQsQ0FBQTtRQUNRLCtCQUEwQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQzlDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQzdCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQ3RDLENBQUE7UUFFZ0IsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxFQUFRLENBQUMsQ0FBQTtRQUN4RCxnQkFBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXZFLGtDQUE2QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzlELElBQUksT0FBTyxFQUFpQyxDQUM1QyxDQUFBO1FBQ1EsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQTtRQUUvRCxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzVELGtCQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUE7UUFFbEQsWUFBWTtRQUVLLHFCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLDREQUE0QyxDQUFBO1FBQzlFLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsNkRBQTZDLENBQUE7UUFFN0UsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFBO1FBQ2xFLDJCQUFzQixHQUFzQixFQUFFLENBQUE7UUFTckMsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFDN0QsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksY0FBYyxFQUFvQixDQUFDLENBQUE7UUF3RGhGLHdCQUFtQixHQUFzQyxFQUFFLENBQUE7UUFpQjNELFFBQUcsR0FBRyxDQUFDLENBQUE7UUFDUCxTQUFJLEdBQUcsQ0FBQyxDQUFBO1FBV1AsY0FBUyxHQUFxQjtZQUN0QyxVQUFVLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7Z0JBQy9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDM0UsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FDcEQsQ0FBQTtnQkFFRCxPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3pDLENBQUM7U0FDRCxDQUFBO1FBZ0JPLGFBQVEsR0FBRyxLQUFLLENBQUE7UUFLUCxxQkFBZ0IsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO1FBQ3RELGNBQVMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBRTNCLHdCQUFtQixHQUFHLElBQUksZUFBZSxFQUFRLENBQUE7UUFDekQsaUJBQVksR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBTTFDLHNCQUFpQixHQUFHLEtBQUssQ0FBQTtRQTYwQnhCLGFBQVEsK0JBQXNDO1FBeDdCdEQsSUFBSSxDQUFDLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRXRGLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUN6RixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQ2pGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyx1QkFBdUIsaUNBRTNCLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3pDLENBQUE7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsS0FBZ0M7UUFDOUQsSUFBSSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRU8sd0JBQXdCO1FBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7UUFDeEMsTUFBTSxjQUFjLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUV6RixLQUFLLE1BQU0sbUJBQW1CLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQSxDQUFDLHNCQUFzQjtRQUMxRSxDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksR0FBRyxjQUFjLENBQUE7UUFFbEMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFLRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUVELGtCQUFrQixDQUFDLE9BQXdDO1FBQzFELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7UUFFL0IsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM3RSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUNoQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFLRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBR0QsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFZRCxJQUFJLE1BQU07UUFDVCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLGlDQUF5QjtZQUM3RSxDQUFDO1lBQ0QsQ0FBQyxvQ0FBNEIsQ0FBQTtJQUMvQixDQUFDO0lBR0QsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFRRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBVSxDQUFDLGdDQUFnQyxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUdELElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBSyxvQ0FBNEI7UUFDMUMsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmO2dCQUNDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtZQUVuQiw2Q0FBcUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUNoQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQ3BFLENBQUE7Z0JBRUQsa0ZBQWtGO2dCQUNsRixvRkFBb0Y7Z0JBQ3BGLE9BQU8sUUFBUSxDQUFDLENBQUMsR0FBRyxnQkFBZ0IsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7WUFDRCx3Q0FBZ0MsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUE7Z0JBQ3BDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBQ3RELENBQUM7Z0JBRUQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxhQUFhLENBQ3BCLE1BQTBCLEVBQzFCLElBQW1FO1FBRW5FLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUSxDQUFDLFVBQTJCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELFFBQVEsQ0FBQyxVQUEyQjtRQUNuQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxTQUFTLENBQ1IsS0FBc0IsRUFDdEIsU0FBNkMsSUFBSSxDQUFDLFdBQVcsRUFDN0QsSUFBYztRQUVkLGVBQWU7UUFDZixJQUFJLE9BQU8sS0FBSyxDQUFDLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRSxDQUFDO1FBRUQsY0FBYztRQUNkLElBQUksT0FBTyxLQUFLLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hFLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVPLHNCQUFzQixDQUM3QixTQUF5QixFQUN6QixNQUEwQyxFQUMxQyxJQUFjO1FBRWQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVwRCwyQ0FBMkM7UUFDM0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FDbEQsZUFBZSxFQUNmLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFDbkMsSUFBSSxDQUNKLENBQUE7UUFDRCxVQUFVLENBQUMsSUFBSSxDQUNkLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQ1YsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQ3hGLENBQUE7UUFFRCxPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyQixDQUFDO0lBRU8scUJBQXFCLENBQzVCLFFBQXVCLEVBQ3ZCLE1BQTBDLEVBQzFDLElBQWM7UUFFZCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLHFDQUE2QixDQUFBO1FBQzFELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFN0MsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNsQjtnQkFDQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNqQjtnQkFDQyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLCtCQUF1QixDQUFDLENBQUMsQ0FBQztnQkFDekIsSUFBSSxTQUFTLEdBQWlDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQy9ELElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ3hCLFNBQVMsR0FBRyxJQUFJLENBQUMscUJBQXFCLDhCQUFzQixNQUFNLENBQUMsQ0FBQTtnQkFDcEUsQ0FBQztnQkFFRCxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsbUNBQTJCLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixJQUFJLGFBQWEsR0FBaUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDbkUsSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDNUIsYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsNkJBQXFCLE1BQU0sQ0FBQyxDQUFBO2dCQUN2RSxDQUFDO2dCQUVELE9BQU8sYUFBYSxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELGFBQWEsQ0FDWixLQUF5QyxFQUN6QyxtQkFBNkI7UUFFN0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFaEMsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELFlBQVksQ0FBQyxLQUF5QztRQUNyRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFOUIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELE9BQU8sQ0FBQyxLQUF5QztRQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRTdDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVELE9BQU8sQ0FDTixLQUF5QyxFQUN6QyxJQUF1QztRQUV2QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRTdDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsYUFBYSxDQUNaLFdBQThCLEVBQzlCLFNBQTZDLElBQUksQ0FBQyxXQUFXO1FBRTdELElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQixPQUFNLENBQUMsb0NBQW9DO1FBQzVDLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLE9BQU0sQ0FBQywrQkFBK0I7UUFDdkMsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFOUMsUUFBUSxXQUFXLEVBQUUsQ0FBQztZQUNyQjtnQkFDQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7Z0JBQ3JDLE1BQUs7WUFDTjtnQkFDQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM1QixPQUFNLENBQUMseUNBQXlDO2dCQUNqRCxDQUFDO2dCQUNELElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUN2QyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ2pCLE1BQUs7WUFDTjtnQkFDQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDckMsTUFBSztRQUNQLENBQUM7SUFDRixDQUFDO0lBRUQsbUJBQW1CLENBQUMsU0FBNkMsSUFBSSxDQUFDLFdBQVc7UUFDaEYsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUN2QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxhQUFhLHFDQUE2QixNQUFNLENBQUMsQ0FBQTtRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUVELGlCQUFpQixDQUFDLFNBQTZDLElBQUksQ0FBQyxXQUFXO1FBQzlFLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsYUFBYSxnQ0FBd0IsQ0FBQTtRQUMzQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxhQUFhLG1DQUEyQixNQUFNLENBQUMsQ0FBQTtRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWU7UUFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUEsQ0FBQyxxRUFBcUU7SUFDaEcsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsV0FBNkI7UUFDckQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsZUFBZSxDQUFDLFdBQTZCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELG1CQUFtQixDQUFDLFdBQTZCO1FBQ2hELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsT0FBTSxDQUFDLCtCQUErQjtRQUN2QyxDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQ25CLFdBQVcsd0NBQWdDLENBQUMsQ0FBQyxnQ0FBd0IsQ0FBQyw2QkFBcUIsQ0FBQTtRQUM1RixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxLQUFLLGNBQWMsRUFBRSxDQUFDO1lBQ3BELElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLGNBQWMsQ0FBQTtRQUM3QyxDQUFDO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FBQyxNQUF5QjtRQUNwQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTVELDRDQUE0QztRQUM1QyxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtRQUN6QixTQUFTLFdBQVcsQ0FBQyxNQUE2QjtZQUNqRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUM1QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQ2pDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzFCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxpQkFBaUIsRUFBRSxDQUFBO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTFCLHFFQUFxRTtRQUNyRSxJQUFJLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLHFDQUE2QixDQUFBO1FBQ25FLElBQUksaUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNsRSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQzFDLElBQUksS0FBSyxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUE7Z0JBQzFDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUVGLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLHFDQUE2QixDQUFBO1FBQ2hFLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBRXBDLGtEQUFrRDtRQUNsRCxNQUFNLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQztZQUMzQyxXQUFXLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUN0QyxNQUFNLENBQUMsV0FBVyxFQUNsQixJQUFJLENBQUMsb0JBQW9CLEVBQUU7Z0JBQzFCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyx3REFBd0Q7Z0JBQ3RGLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FDMUM7WUFDRCxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07U0FDckIsQ0FBQyxDQUFBO1FBRUYsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBRXhFLDBCQUEwQjtRQUMxQixJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTO1FBQ1Isd0JBQXdCO1FBQ3hCLDZIQUE2SDtRQUU3SCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ2xELE1BQU0sV0FBVyxHQUNoQixjQUFjLENBQUMsV0FBVyxtQ0FBMkI7WUFDcEQsQ0FBQztZQUNELENBQUMsa0NBQTBCLENBQUE7UUFDN0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUUxRSxPQUFPO1lBQ04sV0FBVztZQUNYLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBK0I7U0FDNUMsQ0FBQTtJQUNGLENBQUM7SUFFTyxtQ0FBbUMsQ0FDMUMsY0FBK0I7UUFFL0IsSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE9BQU87Z0JBQ04sSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJO2dCQUN6QixNQUFNLEVBQUUsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN6RixDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFUyxrQkFBa0IsQ0FBQyxNQUEyQjtRQUN2RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3hDLElBQUksYUFBYSxLQUFLLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakQsT0FBTyxJQUFJLENBQUEsQ0FBQyx1REFBdUQ7UUFDcEUsQ0FBQztRQUVELHlFQUF5RTtRQUN6RSxPQUFPLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN4QyxJQUFJLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0IsNENBQTRDO1lBQzVDLCtCQUErQjtZQUMvQixPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxRQUFRLENBQ1AsUUFBNEMsRUFDNUMsU0FBeUIsRUFDekIsV0FBOEI7UUFFOUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVuRCxJQUFJLFlBQThCLENBQUE7UUFFbEMsZ0RBQWdEO1FBQ2hELElBQUksWUFBWSxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN0QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBRWxFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ25GLFlBQVksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUE7WUFFbEQscUJBQXFCO1lBQ3JCLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUN0QixZQUFZLEVBQ1osSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQzFCLFlBQVksRUFDWixJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQ25DLENBQUE7WUFFRCxtQkFBbUI7WUFDbkIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBRXRCLFFBQVE7WUFDUixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUV0Qyx3REFBd0Q7WUFDeEQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7WUFFN0Isa0VBQWtFO1lBQ2xFLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxhQUFhLG1DQUEyQixZQUFZLENBQUMsQ0FBQTtZQUMzRCxDQUFDO1lBRUQsa0VBQWtFO1lBQ2xFLGtFQUFrRTtZQUNsRSxxREFBcUQ7WUFDckQsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDbEIsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDO1FBRUQseURBQXlEO2FBQ3BELENBQUM7WUFDTCxZQUFZLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN0RixDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkMsS0FBSyxZQUFZO2dCQUNoQixPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUE7WUFDekIsS0FBSyxPQUFPO2dCQUNYLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQTtZQUNwQjtnQkFDQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUE7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFTyxpQkFBaUIsQ0FDeEIsSUFBNEQsRUFDNUQsT0FBaUM7UUFFakMsb0JBQW9CO1FBQ3BCLElBQUksU0FBMkIsQ0FBQTtRQUMvQixJQUFJLElBQUksWUFBWSxlQUFlLEVBQUUsQ0FBQztZQUNyQyxTQUFTLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FDckMsSUFBSSxFQUNKLElBQUksQ0FBQyxlQUFlLEVBQ3BCLElBQUksRUFDSixJQUFJLENBQUMsV0FBVyxFQUNoQixJQUFJLENBQUMsS0FBSyxFQUNWLElBQUksQ0FBQywwQkFBMEIsRUFDL0IsT0FBTyxDQUNQLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQy9DLFNBQVMsR0FBRyxlQUFlLENBQUMsb0JBQW9CLENBQy9DLElBQUksRUFDSixJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLEVBQ0osSUFBSSxDQUFDLFdBQVcsRUFDaEIsSUFBSSxDQUFDLEtBQUssRUFDVixJQUFJLENBQUMsMEJBQTBCLEVBQy9CLE9BQU8sQ0FDUCxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxTQUFTLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FDcEMsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxFQUNKLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxLQUFLLEVBQ1YsSUFBSSxDQUFDLDBCQUEwQixFQUMvQixPQUFPLENBQ1AsQ0FBQTtRQUNGLENBQUM7UUFFRCxjQUFjO1FBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU1QyxjQUFjO1FBQ2QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzlDLGdCQUFnQixDQUFDLEdBQUcsQ0FDbkIsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDekIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRWhDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHNCQUFzQjtRQUN0QixnQkFBZ0IsQ0FBQyxHQUFHLENBQ25CLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2hDLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNoQjtvQkFDQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUM1QyxNQUFLO2dCQUNOO29CQUNDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQzNDLE1BQUs7Z0JBQ047b0JBQ0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDM0MsTUFBSztZQUNQLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsK0NBQStDO1FBQy9DLGdCQUFnQixDQUFDLEdBQUcsQ0FDbkIsU0FBUyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN0QyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELGdCQUFnQjtRQUNoQixLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLEVBQUU7WUFDeEMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ3BDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN6QyxDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxLQUF1QjtRQUMvQyxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDakMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1lBQzdDLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO1lBRXpCLDZDQUE2QztZQUM3QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRTFDLGdDQUFnQztZQUNoQyxJQUFJLG1CQUFtQixJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzFELG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNyQyxDQUFDO1lBRUQsMkJBQTJCO1lBQzNCLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFckIsZ0RBQWdEO1lBQ2hELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFMUIsUUFBUTtZQUNSLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekMsQ0FBQztRQUVELHdEQUF3RDtRQUN4RCx1REFBdUQ7UUFDdkQsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVPLGNBQWMsQ0FBQyxLQUF1QjtRQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLE9BQU0sQ0FBQyx1REFBdUQ7UUFDL0QsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7WUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNuRCxJQUFJLFFBQVEsQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLFlBQVksSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDdEYsSUFBSSxDQUFDLGFBQWEsbUNBQTJCLEtBQUssQ0FBQyxDQUFBO1lBQ3BELENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQix3RUFBd0U7UUFDekUsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0IsQ0FDL0IsS0FBdUIsRUFDdkIsc0JBQWdDO1FBRWhDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTNELHVCQUF1QjtRQUN2QixJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFFRCx5QkFBeUI7UUFDekIsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsU0FBeUI7UUFDcEQsUUFBUSxTQUFTLEVBQUUsQ0FBQztZQUNuQjtnQkFDQyw0QkFBbUI7WUFDcEI7Z0JBQ0MsOEJBQXFCO1lBQ3RCO2dCQUNDLDhCQUFxQjtZQUN0QjtnQkFDQywrQkFBc0I7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxXQUE2QixFQUFFLFFBQXFCO1FBQ2pGLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDckMsT0FBTyxXQUFXLHdDQUFnQztnQkFDakQsQ0FBQztnQkFDRCxDQUFDLDZCQUFxQixDQUFBO1FBQ3hCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQXlDLEVBQUUsYUFBdUI7UUFDN0UsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEIsT0FBTSxDQUFDLG9DQUFvQztRQUM1QyxDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELDRCQUE0QjthQUN2QixDQUFDO1lBQ0wsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRU8sd0JBQXdCLENBQUMsU0FBMkI7UUFDM0QsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUywwQ0FBa0MsQ0FBQTtRQUVqRixJQUFJLGVBQWlDLENBQUE7UUFDckMsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3JDLGVBQWUsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxDQUFDO2FBQU0sQ0FBQztZQUNQLGVBQWUsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsb0VBQW9FO1FBQ3BFLGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRU8sa0JBQWtCLENBQUMsU0FBMkIsRUFBRSxhQUF1QjtRQUM5RSxNQUFNLFlBQVksR0FBRyxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTlFLG9EQUFvRDtRQUNwRCxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDckMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUywwQ0FBa0MsQ0FBQTtZQUNqRixNQUFNLGVBQWUsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLHdEQUF3RDtZQUM1RyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELG9DQUFvQztRQUNwQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQTtRQUNqRSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFbkIsa0VBQWtFO1FBQ2xFLGtFQUFrRTtRQUNsRSxxREFBcUQ7UUFDckQsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzFCLENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFFN0IsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUV0QixRQUFRO1FBQ1IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsU0FBUyxDQUNSLEtBQXlDLEVBQ3pDLFFBQTRDLEVBQzVDLFNBQXlCO1FBRXpCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVqRCxJQUFJLFVBQVUsQ0FBQyxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoRSxJQUFJLFNBQTJCLENBQUE7UUFFL0IsNkNBQTZDO1FBQzdDLElBQUksVUFBVSxDQUFDLFVBQVUsS0FBSyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQ3ZCLFVBQVUsRUFDVixJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFDMUIsVUFBVSxFQUNWLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FDbkMsQ0FBQTtZQUNELFNBQVMsR0FBRyxVQUFVLENBQUE7UUFDdkIsQ0FBQztRQUVELGtEQUFrRDthQUM3QyxDQUFDO1lBQ0wsU0FBUyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDN0UsVUFBVSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFRCxrRUFBa0U7UUFDbEUsa0VBQWtFO1FBQ2xFLHFEQUFxRDtRQUNyRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNsQixDQUFDO1FBRUQsUUFBUTtRQUNSLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXBDLG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUU3QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsU0FBUyxDQUNSLEtBQXlDLEVBQ3pDLFFBQTRDLEVBQzVDLFNBQXlCO1FBRXpCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVuRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRS9ELHNCQUFzQjtRQUN0QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFekUsNkJBQTZCO1FBQzdCLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3hCLENBQUM7UUFFRCxPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsVUFBVSxDQUNULEtBQXlDLEVBQ3pDLE1BQTBDLEVBQzFDLE9BQTRCO1FBRTVCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUvQywrQkFBK0I7UUFDL0IsTUFBTSxPQUFPLEdBQTZCLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLEtBQUssR0FBRyxPQUFPLElBQUksT0FBTyxPQUFPLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQTtRQUMzRixLQUFLLE1BQU0sTUFBTSxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFFBQVEsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxVQUFVLENBQUE7WUFFakYsSUFBSSxXQUErQixDQUFBO1lBQ25DLElBQ0MsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQzNCLDZEQUE2RDtnQkFDN0QsK0RBQStEO2dCQUMvRCw0QkFBNEI7Z0JBQzVCLHdEQUF3RDtnQkFDeEQsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztvQkFDM0IsZ0VBQWdFO29CQUNoRSxPQUFPLEVBQUUscUJBQXFCLENBQUMsRUFDL0IsQ0FBQztnQkFDRiwrQkFBK0I7WUFDaEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsR0FBRyxLQUFLLENBQUE7Z0JBQ25CLEtBQUssRUFBRSxDQUFBO1lBQ1IsQ0FBQztZQUVELE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1osTUFBTTtnQkFDTixPQUFPLEVBQUU7b0JBQ1IsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLFFBQVE7b0JBQ1IsYUFBYSxFQUFFLFFBQVE7aUJBQ3ZCO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELHFDQUFxQztRQUNyQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxPQUFPLEVBQUUsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO1lBQ25ELFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzVDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFFRCxpRUFBaUU7UUFDakUsSUFDQyxVQUFVLENBQUMsT0FBTztZQUNsQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsb0ZBQW9GLEVBQ3hHLENBQUM7WUFDRixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsY0FBYyxDQUNiLE1BQTBDLEVBQzFDLE9BQTRCO1FBRTVCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFL0MsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFNBQVMsMENBQWtDLEVBQUUsQ0FBQztZQUN0RSxJQUFJLEtBQUssS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDMUIsU0FBUSxDQUFDLGNBQWM7WUFDeEIsQ0FBQztZQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUMxRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxHQUFHLEtBQUssQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRVMsZUFBZSxDQUFDLEtBQXlDO1FBQ2xFLElBQUksU0FBdUMsQ0FBQTtRQUMzQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9CLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqRCxDQUFDO2FBQU0sQ0FBQztZQUNQLFNBQVMsR0FBRyxLQUFLLENBQUE7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxTQUFrQixFQUFFLFFBQW1DO1FBQzdFLFVBQVUsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUVwQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzdGLENBQUM7SUFFRCxjQUFjO0lBRWQsaUZBQWlGO0lBQ2pGLElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FDZCxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUN0QyxJQUFJLENBQUMsYUFBYSxDQUFDLDBCQUEwQixDQUM1QyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQzFELENBQUMsS0FBSyxDQUNQLENBQUE7SUFDRixDQUFDO0lBQ0QsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFBO0lBQzlDLENBQUM7SUFDRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUNkLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQ3ZDLElBQUksQ0FBQyxhQUFhLENBQUMsMEJBQTBCLENBQzVDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FDMUQsQ0FBQyxNQUFNLENBQ1IsQ0FBQTtJQUNGLENBQUM7SUFDRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFBO0lBQy9DLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxRQUFRLENBQUE7SUFDM0QsQ0FBQztJQUVELElBQWEsV0FBVztRQUN2QixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUdELElBQVksbUJBQW1CO1FBQzlCLE9BQU8sQ0FDTixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQztZQUN4QyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUM7WUFDbkMsS0FBSyxDQUFDLFdBQVcsQ0FDakIsQ0FBQTtJQUNGLENBQUM7SUFFUSxZQUFZO1FBQ3BCLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakQsU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUV2RSxNQUFNLG9CQUFvQixHQUFHO1lBQzVCLGVBQWUsRUFBRSxJQUFJLENBQUMsbUJBQW1CO1lBQ3pDLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxXQUFXO1NBQzVFLENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRWtCLGlCQUFpQixDQUNuQyxNQUFtQixFQUNuQixPQUFvQztRQUVwQyxZQUFZO1FBQ1osSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDOUIsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNqRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDMUMsQ0FBQztRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWxDLCtCQUErQjtRQUMvQixNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzdDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUNuRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQy9DLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQ3BDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQ3BFLENBQ0QsQ0FBQTtRQUVELGVBQWU7UUFDZixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLG9CQUFvQixDQUFBO1FBQ2pFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRTFCLHlCQUF5QjtRQUN6QixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDekMsSUFBSSxrQkFBa0IsQ0FDckIsSUFBSSxDQUFDLFNBQVMsRUFDZCxJQUFJLENBQUMsY0FBYyxFQUNuQixJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVUsQ0FBQyxxQ0FBcUMsQ0FBQyxFQUNyRSxJQUFJLENBQUMsWUFBWSxDQUFDLHdCQUF3QixDQUMxQyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3ZDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsSUFBSSxLQUFLLENBQUMsQ0FDM0YsQ0FDRCxDQUFBO1FBRUQsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXBELGVBQWU7UUFDZixJQUFJLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUUvQyxlQUFlO1FBQ2YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1FBRXBCLGtCQUFrQjtRQUNsQixRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQzdFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNwQyxDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBRU8saUJBQWlCLENBQUMsaUJBQXFDO1FBQzlELE1BQU0sNEJBQTRCLEdBQUcsNEJBQTRCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDM0YsNEJBQTRCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRTdFLE1BQU0sMkJBQTJCLEdBQ2hDLHFDQUFxQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sMkJBQTJCLEdBQ2hDLHFDQUFxQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRWhFLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO1lBQzlCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7WUFDN0IsSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BCLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN0QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsMkJBQTJCLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDcEMsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztnQkFDOUIsMkJBQTJCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3RDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCwyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsaUJBQWlCLEVBQUUsQ0FBQTtRQUVuQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVPLHVCQUF1QixDQUFDLE1BQW1CLEVBQUUsU0FBc0I7UUFDMUUscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUzRSx3QkFBd0I7UUFDeEIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUUzQixxREFBcUQ7UUFDckQsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQ0FBcUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FDekYsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsNEJBQTRCLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2xFLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ3BELFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO1NBQ3JELENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSx1QkFBNEIsQ0FBQTtRQUNoQyxJQUFJLHFCQUEwQixDQUFBO1FBQzlCLElBQUksMEJBQWdELENBQUE7UUFDcEQsSUFBSSx3QkFBOEMsQ0FBQTtRQUNsRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsUUFBa0IsRUFBRSxFQUFFO1lBQ2pELElBQ0MsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsZ0RBQWtCO2dCQUMvQyxRQUFRLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxFQUNqRCxDQUFDO2dCQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEtBQUssaURBQW1CLENBQUE7WUFDMUQsQ0FBQztpQkFBTSxJQUNOLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLDhEQUF5QjtnQkFDdEQsUUFBUTtvQkFDUCxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLEVBQUUsMkJBQW1CO3dCQUMxRCxDQUFDO3dCQUNELENBQUMsdUJBQWUsQ0FBQyxFQUNsQixDQUFDO2dCQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEtBQUssK0RBQTBCLENBQUE7WUFDakUsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxFQUFFO1lBQzdCLElBQUksdUJBQXVCLEVBQUUsQ0FBQztnQkFDN0IsWUFBWSxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQ3JDLHVCQUF1QixHQUFHLFNBQVMsQ0FBQTtZQUNwQyxDQUFDO1lBRUQsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO2dCQUMzQixZQUFZLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDbkMscUJBQXFCLEdBQUcsU0FBUyxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFO1lBQzdELFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNqQixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ25DLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDOUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQTtnQkFDN0MsQ0FBQztnQkFFRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtnQkFFcEQsSUFBSSxzQkFBc0IsR0FBeUIsU0FBUyxDQUFBO2dCQUM1RCxJQUFJLG9CQUFvQixHQUF5QixTQUFTLENBQUE7Z0JBQzFELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQTtnQkFDckIsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUN6RCxzQkFBc0Isd0JBQWdCLENBQUE7Z0JBQ3ZDLENBQUM7Z0JBRUQsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsS0FBSyxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUMxRCxzQkFBc0IseUJBQWlCLENBQUE7Z0JBQ3hDLENBQUM7Z0JBRUQsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsTUFBTSxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUMzRCxvQkFBb0IsMEJBQWtCLENBQUE7Z0JBQ3ZDLENBQUM7Z0JBRUQsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsR0FBRyxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUN4RCxvQkFBb0IsdUJBQWUsQ0FBQTtnQkFDcEMsQ0FBQztnQkFFRCxJQUFJLHVCQUF1QixJQUFJLHNCQUFzQixLQUFLLDBCQUEwQixFQUFFLENBQUM7b0JBQ3RGLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO29CQUNyQyx1QkFBdUIsR0FBRyxTQUFTLENBQUE7Z0JBQ3BDLENBQUM7Z0JBRUQsSUFBSSxxQkFBcUIsSUFBSSxvQkFBb0IsS0FBSyx3QkFBd0IsRUFBRSxDQUFDO29CQUNoRixZQUFZLENBQUMscUJBQXFCLENBQUMsQ0FBQTtvQkFDbkMscUJBQXFCLEdBQUcsU0FBUyxDQUFBO2dCQUNsQyxDQUFDO2dCQUVELElBQUksQ0FBQyx1QkFBdUIsSUFBSSxzQkFBc0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDdEUsMEJBQTBCLEdBQUcsc0JBQXNCLENBQUE7b0JBQ25ELHVCQUF1QixHQUFHLFVBQVUsQ0FDbkMsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsRUFDaEQsR0FBRyxDQUNILENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMscUJBQXFCLElBQUksb0JBQW9CLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ2xFLHdCQUF3QixHQUFHLG9CQUFvQixDQUFBO29CQUMvQyxxQkFBcUIsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDeEYsQ0FBQztZQUNGLENBQUM7WUFDRCxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLEVBQUU7WUFDckMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixFQUFFO1lBQ25DLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRTtTQUNoQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsTUFBZTtRQUMzQixJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzVDLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsdUNBQXVDO1FBQ3ZDLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQTtRQUN4QixJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVCLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxDQUFBO1FBQzVELENBQUM7UUFFRCwwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksWUFBWSxFQUFFLENBQUM7WUFDdEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7WUFFeEQsMkJBQTJCO1lBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUV0Qix1REFBdUQ7UUFDdkQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVPLG9DQUFvQztRQUMzQyxNQUFNLEtBQUssR0FBbUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQzlELElBQUksS0FBSyxFQUFFLGNBQWMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQztnQkFDSixNQUFNO2dCQUNOLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUE7Z0JBRTFELGNBQWM7Z0JBQ2QsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzNFLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixZQUFZO2dCQUNaLGlCQUFpQixDQUNoQixJQUFJLEtBQUssQ0FDUix1Q0FBdUMsS0FBSyxpQkFBaUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUNyRixDQUNELENBQUE7Z0JBRUQsbURBQW1EO2dCQUNuRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7Z0JBRXBCLE9BQU8sS0FBSyxDQUFBLENBQUMsVUFBVTtZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBLENBQUMsVUFBVTtJQUN2QixDQUFDO0lBRU8sNEJBQTRCLENBQ25DLGNBQStCLEVBQy9CLGFBQThCLEVBQzlCLHVCQUE0QyxFQUM1QyxPQUFpQztRQUVqQyx3Q0FBd0M7UUFDeEMsSUFBSSxlQUFtQyxDQUFBO1FBQ3ZDLElBQUksdUJBQXVCLEVBQUUsQ0FBQztZQUM3QixlQUFlLEdBQUcsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsK0JBQStCO1FBQ25GLENBQUM7YUFBTSxDQUFDO1lBQ1AsZUFBZSxHQUFHLEVBQUUsQ0FBQTtRQUNyQixDQUFDO1FBRUQsYUFBYTtRQUNiLE1BQU0sVUFBVSxHQUF1QixFQUFFLENBQUE7UUFDekMsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxDQUM5QyxjQUFjLEVBQ2Q7WUFDQyxRQUFRLEVBQUUsQ0FBQyxxQkFBeUQsRUFBRSxFQUFFO2dCQUN2RSxJQUFJLFNBQTJCLENBQUE7Z0JBQy9CLElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDaEMsU0FBUyxHQUFHLGVBQWUsQ0FBQyxLQUFLLEVBQUcsQ0FBQTtnQkFDckMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFNBQVMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQ25FLENBQUM7Z0JBRUQsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFFMUIsSUFBSSxTQUFTLENBQUMsRUFBRSxLQUFLLGFBQWEsRUFBRSxDQUFDO29CQUNwQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ2pDLENBQUM7Z0JBRUQsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztTQUNELEVBQ0QsRUFBRSxNQUFNLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FDekQsQ0FBQTtRQUVELDREQUE0RDtRQUM1RCw4REFBOEQ7UUFDOUQsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFFRCxxREFBcUQ7UUFDckQsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVFLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbEUsQ0FBQztRQUVELFNBQVM7UUFDVCxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFTyxlQUFlLENBQUMsVUFBOEM7UUFDckUsSUFBSSxjQUFjLEdBQW9CLEVBQUUsQ0FBQTtRQUV4QyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUE7WUFDL0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMxQixDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO1FBQy9DLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUUzQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUE7UUFDL0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQTtRQUNoRCxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FDN0IsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FDakQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FDL0MsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRU8sZUFBZTtRQUN0QixNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLHNCQUFzQjtRQUM3QixJQUFJLENBQUMsU0FBUyxxQ0FBNkIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FDcEUsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUMvQixDQUFBO0lBQ0YsQ0FBQztJQUVELHVCQUF1QixDQUFDLFFBQWdCO1FBQ3ZDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQVksT0FBTztRQUNsQixPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFBO0lBQ3JELENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxNQUF1QjtRQUN4QyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUE7UUFDdkMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUE7SUFDbEQsQ0FBQztJQUVRLE1BQU0sQ0FBQyxLQUFhLEVBQUUsTUFBYyxFQUFFLEdBQVcsRUFBRSxJQUFZO1FBQ3ZFLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFBO1FBQ2QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFFaEIsa0JBQWtCO1FBQ2xCLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQTtRQUV2RSwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRU8sUUFBUSxDQUFDLFNBQW9CLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJO1FBQ3RFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUE7UUFFbEMsY0FBYztRQUNkLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQy9CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQzVCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQzdCLEdBQUcsRUFDSCxJQUFJLENBQ0osQ0FBQTtRQUVELFFBQVE7UUFDUixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRWtCLFNBQVM7UUFDM0Isd0JBQXdCO1FBQ3hCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFVLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtZQUMxRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVUsQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUN4RixDQUFDO1FBQ0YsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQy9CLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtZQUMzRCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBVSxDQUFDLHFDQUFxQyxDQUFDLENBQUE7WUFDN0UsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBVSxDQUFDLHFDQUFxQyxDQUFDLEdBQUcsbUJBQW1CLENBQUE7WUFDNUYsQ0FBQztRQUNGLENBQUM7UUFFRCxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVTLFNBQVM7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBVSxDQUFDLGdDQUFnQyxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPO1lBQ04sY0FBYyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFO1lBQzNDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDakMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLHNCQUFzQjtTQUNuRCxDQUFBO0lBQ0YsQ0FBQztJQUVELFVBQVUsQ0FDVCxLQUFtQyxFQUNuQyxPQUFpQztRQUVqQyxJQUFJLEtBQUssS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ2hDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZLENBQ3pCLEtBQXlCLEVBQ3pCLE9BQWlDO1FBRWpDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFL0MsK0VBQStFO1FBQy9FLDRFQUE0RTtRQUM1RSxpRkFBaUY7UUFDakYsNkVBQTZFO1FBQzdFLGlFQUFpRTtRQUVqRSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzNCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUU5QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFFcEIsTUFBTTtRQUNOLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUE7UUFFMUQsY0FBYztRQUNkLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ25GLENBQUM7Z0JBQVMsQ0FBQztZQUNWLHVFQUF1RTtZQUN2RSxxRUFBcUU7WUFDckUsa0VBQWtFO1lBQ2xFLCtCQUErQjtZQUMvQixJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDL0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUM3QixDQUFDO1FBRUQscUVBQXFFO1FBQ3JFLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQ2pDLE1BQU07YUFDSixPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7YUFDakMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDbEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDN0U7YUFDQSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDakIsTUFBTTtZQUNOLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO1NBQzlELENBQUMsQ0FBQyxDQUNKLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQjtRQUM5QixNQUFNLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRWhDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CO1FBQ2hDLDJEQUEyRDtRQUMzRCw0REFBNEQ7UUFDNUQsOERBQThEO1FBQzlELHNEQUFzRDtRQUV0RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUywwQ0FBa0MsQ0FBQTtRQUMvRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzVCLE1BQU0sS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLGdCQUFnQixDQUN2QixTQUEwQixFQUMxQixhQUE4QixFQUM5Qix1QkFBNEMsRUFDNUMsT0FBaUM7UUFFakMsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRTdGLFNBQVM7UUFDVCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRXJDLG1CQUFtQjtRQUNuQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFFdEIsbUNBQW1DO1FBQ25DLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMscUNBQTZCLEVBQUUsQ0FBQztZQUNyRSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3BDLENBQUM7UUFDRixDQUFDO1FBRUQscURBQXFEO1FBQ3JELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxDQUEyQjtRQUMxRCxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLEtBQUssbUNBQTJCLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUUzQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDOUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU07UUFDTCxPQUFPO1lBQ04sSUFBSSxrREFBbUI7U0FDdkIsQ0FBQTtJQUNGLENBQUM7SUFFTyxhQUFhO1FBQ3BCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUVmLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDdkIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRVEsT0FBTztRQUNmLFFBQVE7UUFDUixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRTFCLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFFcEIsY0FBYztRQUNkLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFFMUIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7O0FBem1EVyxVQUFVO0lBcUZwQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxZQUFZLENBQUE7SUFDWixZQUFBLGtCQUFrQixDQUFBO0dBM0ZSLFVBQVUsQ0E0bUR0Qjs7QUFFTSxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsVUFBVTtJQUM3QyxZQUNDLGVBQWlDLEVBQ1Ysb0JBQTJDLEVBQ25ELFlBQTJCLEVBQ25CLG9CQUEyQyxFQUNqRCxjQUErQixFQUN2QixhQUFzQyxFQUNqRCxXQUF5QixFQUNuQixpQkFBcUM7UUFFekQsS0FBSyxDQUNKLGVBQWUsb0RBRWYsRUFBRSxFQUNGLFVBQVUsQ0FBQyxjQUFjLEVBQ3pCLG9CQUFvQixFQUNwQixZQUFZLEVBQ1osb0JBQW9CLEVBQ3BCLGNBQWMsRUFDZCxhQUFhLEVBQ2IsV0FBVyxFQUNYLGlCQUFpQixDQUNqQixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF6QlksY0FBYztJQUd4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGtCQUFrQixDQUFBO0dBVFIsY0FBYyxDQXlCMUIifQ==