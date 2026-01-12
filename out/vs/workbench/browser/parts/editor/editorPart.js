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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFDTixTQUFTLEVBQ1QsQ0FBQyxFQUNELFdBQVcsRUFDWCxxQ0FBcUMsRUFDckMsU0FBUyxFQUNULHlCQUF5QixFQUN6QixnQkFBZ0IsRUFDaEIsYUFBYSxHQUNiLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUYsT0FBTyxFQUNOLGNBQWMsRUFDZCxnQkFBZ0IsR0FDaEIsTUFBTSxvREFBb0QsQ0FBQTtBQWdCM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLFVBQVUsRUFJVixnQkFBZ0IsRUFDaEIsTUFBTSxFQUtOLGdCQUFnQixFQUVoQixvQkFBb0IsR0FFcEIsTUFBTSwwQ0FBMEMsQ0FBQTtBQVFqRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsd0JBQXdCLEdBS3hCLE1BQU0sYUFBYSxDQUFBO0FBQ3BCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0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