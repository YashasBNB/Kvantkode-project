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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvclRhYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRWRpdG9yVGFicy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sY0FBYyxFQUlkLFdBQVcsR0FLWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixzQkFBc0IsRUFFdEIsZ0JBQWdCLEdBQ2hCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWhGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMzRixPQUFPLEVB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