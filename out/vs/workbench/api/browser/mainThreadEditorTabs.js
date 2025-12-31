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
import { Event } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { EditorResourceAccessor, SideBySideEditor, } from '../../common/editor.js';
import { DiffEditorInput } from '../../common/editor/diffEditorInput.js';
import { isGroupEditorMoveEvent } from '../../common/editor/editorGroupModel.js';
import { SideBySideEditorInput } from '../../common/editor/sideBySideEditorInput.js';
import { AbstractTextResourceEditorInput } from '../../common/editor/textResourceEditorInput.js';
import { ChatEditorInput } from '../../contrib/chat/browser/chatEditorInput.js';
import { CustomEditorInput } from '../../contrib/customEditor/browser/customEditorInput.js';
import { InteractiveEditorInput } from '../../contrib/interactive/browser/interactiveEditorInput.js';
import { MergeEditorInput } from '../../contrib/mergeEditor/browser/mergeEditorInput.js';
import { MultiDiffEditorInput } from '../../contrib/multiDiffEditor/browser/multiDiffEditorInput.js';
import { NotebookEditorInput } from '../../contrib/notebook/common/notebookEditorInput.js';
import { TerminalEditorInput } from '../../contrib/terminal/browser/terminalEditorInput.js';
import { WebviewInput } from '../../contrib/webviewPanel/browser/webviewEditorInput.js';
import { columnToEditorGroup, editorGroupToColumn, } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection, } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService, SIDE_GROUP, } from '../../services/editor/common/editorService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadEditorTabs = class MainThreadEditorTabs {
    constructor(extHostContext, _editorGroupsService, _configurationService, _logService, editorService) {
        this._editorGroupsService = _editorGroupsService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._dispoables = new DisposableStore();
        // List of all groups and their corresponding tabs, this is **the** model
        this._tabGroupModel = [];
        // Lookup table for finding group by id
        this._groupLookup = new Map();
        // Lookup table for finding tab by id
        this._tabInfoLookup = new Map();
        // Tracks the currently open MultiDiffEditorInputs to listen to resource changes
        this._multiDiffEditorInputListeners = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostEditorTabs);
        // Main listener which responds to events from the editor service
        this._dispoables.add(editorService.onDidEditorsChange((event) => {
            try {
                this._updateTabsModel(event);
            }
            catch {
                this._logService.error('Failed to update model, rebuilding');
                this._createTabsModel();
            }
        }));
        this._dispoables.add(this._multiDiffEditorInputListeners);
        // Structural group changes (add, remove, move, etc) are difficult to patch.
        // Since they happen infrequently we just rebuild the entire model
        this._dispoables.add(this._editorGroupsService.onDidAddGroup(() => this._createTabsModel()));
        this._dispoables.add(this._editorGroupsService.onDidRemoveGroup(() => this._createTabsModel()));
        // Once everything is read go ahead and initialize the model
        this._editorGroupsService.whenReady.then(() => this._createTabsModel());
    }
    dispose() {
        this._groupLookup.clear();
        this._tabInfoLookup.clear();
        this._dispoables.dispose();
    }
    /**
     * Creates a tab object with the correct properties
     * @param editor The editor input represented by the tab
     * @param group The group the tab is in
     * @returns A tab object
     */
    _buildTabObject(group, editor, editorIndex) {
        const editorId = editor.editorId;
        const tab = {
            id: this._generateTabId(editor, group.id),
            label: editor.getName(),
            editorId,
            input: this._editorInputToDto(editor),
            isPinned: group.isSticky(editorIndex),
            isPreview: !group.isPinned(editorIndex),
            isActive: group.isActive(editor),
            isDirty: editor.isDirty(),
        };
        return tab;
    }
    _editorInputToDto(editor) {
        if (editor instanceof MergeEditorInput) {
            return {
                kind: 3 /* TabInputKind.TextMergeInput */,
                base: editor.base,
                input1: editor.input1.uri,
                input2: editor.input2.uri,
                result: editor.resource,
            };
        }
        if (editor instanceof AbstractTextResourceEditorInput) {
            return {
                kind: 1 /* TabInputKind.TextInput */,
                uri: editor.resource,
            };
        }
        if (editor instanceof SideBySideEditorInput && !(editor instanceof DiffEditorInput)) {
            const primaryResource = editor.primary.resource;
            const secondaryResource = editor.secondary.resource;
            // If side by side editor with same resource on both sides treat it as a singular tab kind
            if (editor.primary instanceof AbstractTextResourceEditorInput &&
                editor.secondary instanceof AbstractTextResourceEditorInput &&
                isEqual(primaryResource, secondaryResource) &&
                primaryResource &&
                secondaryResource) {
                return {
                    kind: 1 /* TabInputKind.TextInput */,
                    uri: primaryResource,
                };
            }
            return { kind: 0 /* TabInputKind.UnknownInput */ };
        }
        if (editor instanceof NotebookEditorInput) {
            return {
                kind: 4 /* TabInputKind.NotebookInput */,
                notebookType: editor.viewType,
                uri: editor.resource,
            };
        }
        if (editor instanceof CustomEditorInput) {
            return {
                kind: 6 /* TabInputKind.CustomEditorInput */,
                viewType: editor.viewType,
                uri: editor.resource,
            };
        }
        if (editor instanceof WebviewInput) {
            return {
                kind: 7 /* TabInputKind.WebviewEditorInput */,
                viewType: editor.viewType,
            };
        }
        if (editor instanceof TerminalEditorInput) {
            return {
                kind: 8 /* TabInputKind.TerminalEditorInput */,
            };
        }
        if (editor instanceof DiffEditorInput) {
            if (editor.modified instanceof AbstractTextResourceEditorInput &&
                editor.original instanceof AbstractTextResourceEditorInput) {
                return {
                    kind: 2 /* TabInputKind.TextDiffInput */,
                    modified: editor.modified.resource,
                    original: editor.original.resource,
                };
            }
            if (editor.modified instanceof NotebookEditorInput &&
                editor.original instanceof NotebookEditorInput) {
                return {
                    kind: 5 /* TabInputKind.NotebookDiffInput */,
                    notebookType: editor.original.viewType,
                    modified: editor.modified.resource,
                    original: editor.original.resource,
                };
            }
        }
        if (editor instanceof InteractiveEditorInput) {
            return {
                kind: 9 /* TabInputKind.InteractiveEditorInput */,
                uri: editor.resource,
                inputBoxUri: editor.inputResource,
            };
        }
        if (editor instanceof ChatEditorInput) {
            return {
                kind: 10 /* TabInputKind.ChatEditorInput */,
            };
        }
        if (editor instanceof MultiDiffEditorInput) {
            const diffEditors = [];
            for (const resource of editor?.resources.get() ?? []) {
                if (resource.originalUri && resource.modifiedUri) {
                    diffEditors.push({
                        kind: 2 /* TabInputKind.TextDiffInput */,
                        original: resource.originalUri,
                        modified: resource.modifiedUri,
                    });
                }
            }
            return {
                kind: 11 /* TabInputKind.MultiDiffEditorInput */,
                diffEditors,
            };
        }
        return { kind: 0 /* TabInputKind.UnknownInput */ };
    }
    /**
     * Generates a unique id for a tab
     * @param editor The editor input
     * @param groupId The group id
     * @returns A unique identifier for a specific tab
     */
    _generateTabId(editor, groupId) {
        let resourceString;
        // Properly get the resource and account for side by side editors
        const resource = EditorResourceAccessor.getCanonicalUri(editor, {
            supportSideBySide: SideBySideEditor.BOTH,
        });
        if (resource instanceof URI) {
            resourceString = resource.toString();
        }
        else {
            resourceString = `${resource?.primary?.toString()}-${resource?.secondary?.toString()}`;
        }
        return `${groupId}~${editor.editorId}-${editor.typeId}-${resourceString} `;
    }
    /**
     * Called whenever a group activates, updates the model by marking the group as active an notifies the extension host
     */
    _onDidGroupActivate() {
        const activeGroupId = this._editorGroupsService.activeGroup.id;
        const activeGroup = this._groupLookup.get(activeGroupId);
        if (activeGroup) {
            // Ok not to loop as exthost accepts last active group
            activeGroup.isActive = true;
            this._proxy.$acceptTabGroupUpdate(activeGroup);
        }
    }
    /**
     * Called when the tab label changes
     * @param groupId The id of the group the tab exists in
     * @param editorInput The editor input represented by the tab
     */
    _onDidTabLabelChange(groupId, editorInput, editorIndex) {
        const tabId = this._generateTabId(editorInput, groupId);
        const tabInfo = this._tabInfoLookup.get(tabId);
        // If tab is found patch, else rebuild
        if (tabInfo) {
            tabInfo.tab.label = editorInput.getName();
            this._proxy.$acceptTabOperation({
                groupId,
                index: editorIndex,
                tabDto: tabInfo.tab,
                kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            });
        }
        else {
            this._logService.error('Invalid model for label change, rebuilding');
            this._createTabsModel();
        }
    }
    /**
     * Called when a new tab is opened
     * @param groupId The id of the group the tab is being created in
     * @param editorInput The editor input being opened
     * @param editorIndex The index of the editor within that group
     */
    _onDidTabOpen(groupId, editorInput, editorIndex) {
        const group = this._editorGroupsService.getGroup(groupId);
        // Even if the editor service knows about the group the group might not exist yet in our model
        const groupInModel = this._groupLookup.get(groupId) !== undefined;
        // Means a new group was likely created so we rebuild the model
        if (!group || !groupInModel) {
            this._createTabsModel();
            return;
        }
        const tabs = this._groupLookup.get(groupId)?.tabs;
        if (!tabs) {
            return;
        }
        // Splice tab into group at index editorIndex
        const tabObject = this._buildTabObject(group, editorInput, editorIndex);
        tabs.splice(editorIndex, 0, tabObject);
        // Update lookup
        const tabId = this._generateTabId(editorInput, groupId);
        this._tabInfoLookup.set(tabId, { group, editorInput, tab: tabObject });
        if (editorInput instanceof MultiDiffEditorInput) {
            this._multiDiffEditorInputListeners.set(editorInput, Event.fromObservableLight(editorInput.resources)(() => {
                const tabInfo = this._tabInfoLookup.get(tabId);
                if (!tabInfo) {
                    return;
                }
                tabInfo.tab = this._buildTabObject(group, editorInput, editorIndex);
                this._proxy.$acceptTabOperation({
                    groupId,
                    index: editorIndex,
                    tabDto: tabInfo.tab,
                    kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
                });
            }));
        }
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: tabObject,
            kind: 0 /* TabModelOperationKind.TAB_OPEN */,
        });
    }
    /**
     * Called when a tab is closed
     * @param groupId The id of the group the tab is being removed from
     * @param editorIndex The index of the editor within that group
     */
    _onDidTabClose(groupId, editorIndex) {
        const group = this._editorGroupsService.getGroup(groupId);
        const tabs = this._groupLookup.get(groupId)?.tabs;
        // Something is wrong with the model state so we rebuild
        if (!group || !tabs) {
            this._createTabsModel();
            return;
        }
        // Splice tab into group at index editorIndex
        const removedTab = tabs.splice(editorIndex, 1);
        // Index must no longer be valid so we return prematurely
        if (removedTab.length === 0) {
            return;
        }
        // Update lookup
        this._tabInfoLookup.delete(removedTab[0]?.id ?? '');
        if (removedTab[0]?.input instanceof MultiDiffEditorInput) {
            this._multiDiffEditorInputListeners.deleteAndDispose(removedTab[0]?.input);
        }
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: removedTab[0],
            kind: 1 /* TabModelOperationKind.TAB_CLOSE */,
        });
    }
    /**
     * Called when the active tab changes
     * @param groupId The id of the group the tab is contained in
     * @param editorIndex The index of the tab
     */
    _onDidTabActiveChange(groupId, editorIndex) {
        // TODO @lramos15 use the tab lookup here if possible. Do we have an editor input?!
        const tabs = this._groupLookup.get(groupId)?.tabs;
        if (!tabs) {
            return;
        }
        const activeTab = tabs[editorIndex];
        // No need to loop over as the exthost uses the most recently marked active tab
        activeTab.isActive = true;
        // Send DTO update to the exthost
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: activeTab,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
        });
    }
    /**
     * Called when the dirty indicator on the tab changes
     * @param groupId The id of the group the tab is in
     * @param editorIndex The index of the tab
     * @param editor The editor input represented by the tab
     */
    _onDidTabDirty(groupId, editorIndex, editor) {
        const tabId = this._generateTabId(editor, groupId);
        const tabInfo = this._tabInfoLookup.get(tabId);
        // Something wrong with the model state so we rebuild
        if (!tabInfo) {
            this._logService.error('Invalid model for dirty change, rebuilding');
            this._createTabsModel();
            return;
        }
        tabInfo.tab.isDirty = editor.isDirty();
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: tabInfo.tab,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
        });
    }
    /**
     * Called when the tab is pinned/unpinned
     * @param groupId The id of the group the tab is in
     * @param editorIndex The index of the tab
     * @param editor The editor input represented by the tab
     */
    _onDidTabPinChange(groupId, editorIndex, editor) {
        const tabId = this._generateTabId(editor, groupId);
        const tabInfo = this._tabInfoLookup.get(tabId);
        const group = tabInfo?.group;
        const tab = tabInfo?.tab;
        // Something wrong with the model state so we rebuild
        if (!group || !tab) {
            this._logService.error('Invalid model for sticky change, rebuilding');
            this._createTabsModel();
            return;
        }
        // Whether or not the tab has the pin icon (internally it's called sticky)
        tab.isPinned = group.isSticky(editorIndex);
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: tab,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
        });
    }
    /**
     * Called when the tab is preview / unpreviewed
     * @param groupId The id of the group the tab is in
     * @param editorIndex The index of the tab
     * @param editor The editor input represented by the tab
     */
    _onDidTabPreviewChange(groupId, editorIndex, editor) {
        const tabId = this._generateTabId(editor, groupId);
        const tabInfo = this._tabInfoLookup.get(tabId);
        const group = tabInfo?.group;
        const tab = tabInfo?.tab;
        // Something wrong with the model state so we rebuild
        if (!group || !tab) {
            this._logService.error('Invalid model for sticky change, rebuilding');
            this._createTabsModel();
            return;
        }
        // Whether or not the tab has the pin icon (internally it's called pinned)
        tab.isPreview = !group.isPinned(editorIndex);
        this._proxy.$acceptTabOperation({
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            groupId,
            tabDto: tab,
            index: editorIndex,
        });
    }
    _onDidTabMove(groupId, editorIndex, oldEditorIndex, editor) {
        const tabs = this._groupLookup.get(groupId)?.tabs;
        // Something wrong with the model state so we rebuild
        if (!tabs) {
            this._logService.error('Invalid model for move change, rebuilding');
            this._createTabsModel();
            return;
        }
        // Move tab from old index to new index
        const removedTab = tabs.splice(oldEditorIndex, 1);
        if (removedTab.length === 0) {
            return;
        }
        tabs.splice(editorIndex, 0, removedTab[0]);
        // Notify exthost of move
        this._proxy.$acceptTabOperation({
            kind: 3 /* TabModelOperationKind.TAB_MOVE */,
            groupId,
            tabDto: removedTab[0],
            index: editorIndex,
            oldIndex: oldEditorIndex,
        });
    }
    /**
     * Builds the model from scratch based on the current state of the editor service.
     */
    _createTabsModel() {
        if (this._editorGroupsService.groups.length === 0) {
            return; // skip this invalid state, it may happen when the entire editor area is transitioning to other state ("editor working sets")
        }
        this._tabGroupModel = [];
        this._groupLookup.clear();
        this._tabInfoLookup.clear();
        let tabs = [];
        for (const group of this._editorGroupsService.groups) {
            const currentTabGroupModel = {
                groupId: group.id,
                isActive: group.id === this._editorGroupsService.activeGroup.id,
                viewColumn: editorGroupToColumn(this._editorGroupsService, group),
                tabs: [],
            };
            group.editors.forEach((editor, editorIndex) => {
                const tab = this._buildTabObject(group, editor, editorIndex);
                tabs.push(tab);
                // Add information about the tab to the lookup
                this._tabInfoLookup.set(this._generateTabId(editor, group.id), {
                    group,
                    tab,
                    editorInput: editor,
                });
            });
            currentTabGroupModel.tabs = tabs;
            this._tabGroupModel.push(currentTabGroupModel);
            this._groupLookup.set(group.id, currentTabGroupModel);
            tabs = [];
        }
        // notify the ext host of the new model
        this._proxy.$acceptEditorTabModel(this._tabGroupModel);
    }
    // TODOD @lramos15 Remove this after done finishing the tab model code
    // private _eventToString(event: IEditorsChangeEvent | IEditorsMoveEvent): string {
    // 	let eventString = '';
    // 	switch (event.kind) {
    // 		case GroupModelChangeKind.GROUP_INDEX: eventString += 'GROUP_INDEX'; break;
    // 		case GroupModelChangeKind.EDITOR_ACTIVE: eventString += 'EDITOR_ACTIVE'; break;
    // 		case GroupModelChangeKind.EDITOR_PIN: eventString += 'EDITOR_PIN'; break;
    // 		case GroupModelChangeKind.EDITOR_OPEN: eventString += 'EDITOR_OPEN'; break;
    // 		case GroupModelChangeKind.EDITOR_CLOSE: eventString += 'EDITOR_CLOSE'; break;
    // 		case GroupModelChangeKind.EDITOR_MOVE: eventString += 'EDITOR_MOVE'; break;
    // 		case GroupModelChangeKind.EDITOR_LABEL: eventString += 'EDITOR_LABEL'; break;
    // 		case GroupModelChangeKind.GROUP_ACTIVE: eventString += 'GROUP_ACTIVE'; break;
    // 		case GroupModelChangeKind.GROUP_LOCKED: eventString += 'GROUP_LOCKED'; break;
    // 		case GroupModelChangeKind.EDITOR_DIRTY: eventString += 'EDITOR_DIRTY'; break;
    // 		case GroupModelChangeKind.EDITOR_STICKY: eventString += 'EDITOR_STICKY'; break;
    // 		default: eventString += `UNKNOWN: ${event.kind}`; break;
    // 	}
    // 	return eventString;
    // }
    /**
     * The main handler for the tab events
     * @param events The list of events to process
     */
    _updateTabsModel(changeEvent) {
        const event = changeEvent.event;
        const groupId = changeEvent.groupId;
        switch (event.kind) {
            case 0 /* GroupModelChangeKind.GROUP_ACTIVE */:
                if (groupId === this._editorGroupsService.activeGroup.id) {
                    this._onDidGroupActivate();
                    break;
                }
                else {
                    return;
                }
            case 9 /* GroupModelChangeKind.EDITOR_LABEL */:
                if (event.editor !== undefined && event.editorIndex !== undefined) {
                    this._onDidTabLabelChange(groupId, event.editor, event.editorIndex);
                    break;
                }
            case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                if (event.editor !== undefined && event.editorIndex !== undefined) {
                    this._onDidTabOpen(groupId, event.editor, event.editorIndex);
                    break;
                }
            case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                if (event.editorIndex !== undefined) {
                    this._onDidTabClose(groupId, event.editorIndex);
                    break;
                }
            case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                if (event.editorIndex !== undefined) {
                    this._onDidTabActiveChange(groupId, event.editorIndex);
                    break;
                }
            case 14 /* GroupModelChangeKind.EDITOR_DIRTY */:
                if (event.editorIndex !== undefined && event.editor !== undefined) {
                    this._onDidTabDirty(groupId, event.editorIndex, event.editor);
                    break;
                }
            case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                if (event.editorIndex !== undefined && event.editor !== undefined) {
                    this._onDidTabPinChange(groupId, event.editorIndex, event.editor);
                    break;
                }
            case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                if (event.editorIndex !== undefined && event.editor !== undefined) {
                    this._onDidTabPreviewChange(groupId, event.editorIndex, event.editor);
                    break;
                }
            case 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */:
                // Currently not exposed in the API
                break;
            case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                if (isGroupEditorMoveEvent(event) &&
                    event.editor &&
                    event.editorIndex !== undefined &&
                    event.oldEditorIndex !== undefined) {
                    this._onDidTabMove(groupId, event.editorIndex, event.oldEditorIndex, event.editor);
                    break;
                }
            default:
                // If it's not an optimized case we rebuild the tabs model from scratch
                this._createTabsModel();
        }
    }
    //#region Messages received from Ext Host
    $moveTab(tabId, index, viewColumn, preserveFocus) {
        const groupId = columnToEditorGroup(this._editorGroupsService, this._configurationService, viewColumn);
        const tabInfo = this._tabInfoLookup.get(tabId);
        const tab = tabInfo?.tab;
        if (!tab) {
            throw new Error(`Attempted to close tab with id ${tabId} which does not exist`);
        }
        let targetGroup;
        const sourceGroup = this._editorGroupsService.getGroup(tabInfo.group.id);
        if (!sourceGroup) {
            return;
        }
        // If group index is out of bounds then we make a new one that's to the right of the last group
        if (this._groupLookup.get(groupId) === undefined) {
            let direction = 3 /* GroupDirection.RIGHT */;
            // Make sure we respect the user's preferred side direction
            if (viewColumn === SIDE_GROUP) {
                direction = preferredSideBySideGroupDirection(this._configurationService);
            }
            targetGroup = this._editorGroupsService.addGroup(this._editorGroupsService.groups[this._editorGroupsService.groups.length - 1], direction);
        }
        else {
            targetGroup = this._editorGroupsService.getGroup(groupId);
        }
        if (!targetGroup) {
            return;
        }
        // Similar logic to if index is out of bounds we place it at the end
        if (index < 0 || index > targetGroup.editors.length) {
            index = targetGroup.editors.length;
        }
        // Find the correct EditorInput using the tab info
        const editorInput = tabInfo?.editorInput;
        if (!editorInput) {
            return;
        }
        // Move the editor to the target group
        sourceGroup.moveEditor(editorInput, targetGroup, { index, preserveFocus });
        return;
    }
    async $closeTab(tabIds, preserveFocus) {
        const groups = new Map();
        for (const tabId of tabIds) {
            const tabInfo = this._tabInfoLookup.get(tabId);
            const tab = tabInfo?.tab;
            const group = tabInfo?.group;
            const editorTab = tabInfo?.editorInput;
            // If not found skip
            if (!group || !tab || !tabInfo || !editorTab) {
                continue;
            }
            const groupEditors = groups.get(group);
            if (!groupEditors) {
                groups.set(group, [editorTab]);
            }
            else {
                groupEditors.push(editorTab);
            }
        }
        // Loop over keys of the groups map and call closeEditors
        const results = [];
        for (const [group, editors] of groups) {
            results.push(await group.closeEditors(editors, { preserveFocus }));
        }
        // TODO @jrieken This isn't quite right how can we say true for some but not others?
        return results.every((result) => result);
    }
    async $closeGroup(groupIds, preserveFocus) {
        const groupCloseResults = [];
        for (const groupId of groupIds) {
            const group = this._editorGroupsService.getGroup(groupId);
            if (group) {
                groupCloseResults.push(await group.closeAllEditors());
                // Make sure group is empty but still there before removing it
                if (group.count === 0 && this._editorGroupsService.getGroup(group.id)) {
                    this._editorGroupsService.removeGroup(group);
                }
            }
        }
        return groupCloseResults.every((result) => result);
    }
};
MainThreadEditorTabs = __decorate([
    extHostNamedCustomer(MainContext.MainThreadEditorTabs),
    __param(1, IEditorGroupsService),
    __param(2, IConfigurationService),
    __param(3, ILogService),
    __param(4, IEditorService)
], MainThreadEditorTabs);
export { MainThreadEditorTabs };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvclRhYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEVkaXRvclRhYnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUVOLGNBQWMsRUFJZCxXQUFXLEdBS1gsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sc0JBQXNCLEVBRXRCLGdCQUFnQixHQUNoQixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDM0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRB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