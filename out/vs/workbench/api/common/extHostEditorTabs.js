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
import { diffSets } from '../../../base/common/collections.js';
import { Emitter } from '../../../base/common/event.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as typeConverters from './extHostTypeConverters.js';
import { ChatEditorTabInput, CustomEditorTabInput, InteractiveWindowInput, NotebookDiffEditorTabInput, NotebookEditorTabInput, TerminalEditorTabInput, TextDiffTabInput, TextMergeTabInput, TextTabInput, WebviewEditorTabInput, TextMultiDiffTabInput, } from './extHostTypes.js';
export const IExtHostEditorTabs = createDecorator('IExtHostEditorTabs');
class ExtHostEditorTab {
    constructor(dto, parentGroup, activeTabIdGetter) {
        this._activeTabIdGetter = activeTabIdGetter;
        this._parentGroup = parentGroup;
        this.acceptDtoUpdate(dto);
    }
    get apiObject() {
        if (!this._apiObject) {
            // Don't want to lose reference to parent `this` in the getters
            const that = this;
            const obj = {
                get isActive() {
                    // We use a getter function here to always ensure at most 1 active tab per group and prevent iteration for being required
                    return that._dto.id === that._activeTabIdGetter();
                },
                get label() {
                    return that._dto.label;
                },
                get input() {
                    return that._input;
                },
                get isDirty() {
                    return that._dto.isDirty;
                },
                get isPinned() {
                    return that._dto.isPinned;
                },
                get isPreview() {
                    return that._dto.isPreview;
                },
                get group() {
                    return that._parentGroup.apiObject;
                },
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    get tabId() {
        return this._dto.id;
    }
    acceptDtoUpdate(dto) {
        this._dto = dto;
        this._input = this._initInput();
    }
    _initInput() {
        switch (this._dto.input.kind) {
            case 1 /* TabInputKind.TextInput */:
                return new TextTabInput(URI.revive(this._dto.input.uri));
            case 2 /* TabInputKind.TextDiffInput */:
                return new TextDiffTabInput(URI.revive(this._dto.input.original), URI.revive(this._dto.input.modified));
            case 3 /* TabInputKind.TextMergeInput */:
                return new TextMergeTabInput(URI.revive(this._dto.input.base), URI.revive(this._dto.input.input1), URI.revive(this._dto.input.input2), URI.revive(this._dto.input.result));
            case 6 /* TabInputKind.CustomEditorInput */:
                return new CustomEditorTabInput(URI.revive(this._dto.input.uri), this._dto.input.viewType);
            case 7 /* TabInputKind.WebviewEditorInput */:
                return new WebviewEditorTabInput(this._dto.input.viewType);
            case 4 /* TabInputKind.NotebookInput */:
                return new NotebookEditorTabInput(URI.revive(this._dto.input.uri), this._dto.input.notebookType);
            case 5 /* TabInputKind.NotebookDiffInput */:
                return new NotebookDiffEditorTabInput(URI.revive(this._dto.input.original), URI.revive(this._dto.input.modified), this._dto.input.notebookType);
            case 8 /* TabInputKind.TerminalEditorInput */:
                return new TerminalEditorTabInput();
            case 9 /* TabInputKind.InteractiveEditorInput */:
                return new InteractiveWindowInput(URI.revive(this._dto.input.uri), URI.revive(this._dto.input.inputBoxUri));
            case 10 /* TabInputKind.ChatEditorInput */:
                return new ChatEditorTabInput();
            case 11 /* TabInputKind.MultiDiffEditorInput */:
                return new TextMultiDiffTabInput(this._dto.input.diffEditors.map((diff) => new TextDiffTabInput(URI.revive(diff.original), URI.revive(diff.modified))));
            default:
                return undefined;
        }
    }
}
class ExtHostEditorTabGroup {
    constructor(dto, activeGroupIdGetter) {
        this._tabs = [];
        this._activeTabId = '';
        this._dto = dto;
        this._activeGroupIdGetter = activeGroupIdGetter;
        // Construct all tabs from the given dto
        for (const tabDto of dto.tabs) {
            if (tabDto.isActive) {
                this._activeTabId = tabDto.id;
            }
            this._tabs.push(new ExtHostEditorTab(tabDto, this, () => this.activeTabId()));
        }
    }
    get apiObject() {
        if (!this._apiObject) {
            // Don't want to lose reference to parent `this` in the getters
            const that = this;
            const obj = {
                get isActive() {
                    // We use a getter function here to always ensure at most 1 active group and prevent iteration for being required
                    return that._dto.groupId === that._activeGroupIdGetter();
                },
                get viewColumn() {
                    return typeConverters.ViewColumn.to(that._dto.viewColumn);
                },
                get activeTab() {
                    return that._tabs.find((tab) => tab.tabId === that._activeTabId)?.apiObject;
                },
                get tabs() {
                    return Object.freeze(that._tabs.map((tab) => tab.apiObject));
                },
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    get groupId() {
        return this._dto.groupId;
    }
    get tabs() {
        return this._tabs;
    }
    acceptGroupDtoUpdate(dto) {
        this._dto = dto;
    }
    acceptTabOperation(operation) {
        // In the open case we add the tab to the group
        if (operation.kind === 0 /* TabModelOperationKind.TAB_OPEN */) {
            const tab = new ExtHostEditorTab(operation.tabDto, this, () => this.activeTabId());
            // Insert tab at editor index
            this._tabs.splice(operation.index, 0, tab);
            if (operation.tabDto.isActive) {
                this._activeTabId = tab.tabId;
            }
            return tab;
        }
        else if (operation.kind === 1 /* TabModelOperationKind.TAB_CLOSE */) {
            const tab = this._tabs.splice(operation.index, 1)[0];
            if (!tab) {
                throw new Error(`Tab close updated received for index ${operation.index} which does not exist`);
            }
            if (tab.tabId === this._activeTabId) {
                this._activeTabId = '';
            }
            return tab;
        }
        else if (operation.kind === 3 /* TabModelOperationKind.TAB_MOVE */) {
            if (operation.oldIndex === undefined) {
                throw new Error('Invalid old index on move IPC');
            }
            // Splice to remove at old index and insert at new index === moving the tab
            const tab = this._tabs.splice(operation.oldIndex, 1)[0];
            if (!tab) {
                throw new Error(`Tab move updated received for index ${operation.oldIndex} which does not exist`);
            }
            this._tabs.splice(operation.index, 0, tab);
            return tab;
        }
        const tab = this._tabs.find((extHostTab) => extHostTab.tabId === operation.tabDto.id);
        if (!tab) {
            throw new Error('INVALID tab');
        }
        if (operation.tabDto.isActive) {
            this._activeTabId = operation.tabDto.id;
        }
        else if (this._activeTabId === operation.tabDto.id && !operation.tabDto.isActive) {
            // Events aren't guaranteed to be in order so if we receive a dto that matches the active tab id
            // but isn't active we mark the active tab id as empty. This prevent onDidActiveTabChange from
            // firing incorrectly
            this._activeTabId = '';
        }
        tab.acceptDtoUpdate(operation.tabDto);
        return tab;
    }
    // Not a getter since it must be a function to be used as a callback for the tabs
    activeTabId() {
        return this._activeTabId;
    }
}
let ExtHostEditorTabs = class ExtHostEditorTabs {
    constructor(extHostRpc) {
        this._onDidChangeTabs = new Emitter();
        this._onDidChangeTabGroups = new Emitter();
        this._extHostTabGroups = [];
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadEditorTabs);
    }
    get tabGroups() {
        if (!this._apiObject) {
            const that = this;
            const obj = {
                // never changes -> simple value
                onDidChangeTabGroups: that._onDidChangeTabGroups.event,
                onDidChangeTabs: that._onDidChangeTabs.event,
                // dynamic -> getters
                get all() {
                    return Object.freeze(that._extHostTabGroups.map((group) => group.apiObject));
                },
                get activeTabGroup() {
                    const activeTabGroupId = that._activeGroupId;
                    const activeTabGroup = assertIsDefined(that._extHostTabGroups.find((candidate) => candidate.groupId === activeTabGroupId)
                        ?.apiObject);
                    return activeTabGroup;
                },
                close: async (tabOrTabGroup, preserveFocus) => {
                    const tabsOrTabGroups = Array.isArray(tabOrTabGroup) ? tabOrTabGroup : [tabOrTabGroup];
                    if (!tabsOrTabGroups.length) {
                        return true;
                    }
                    // Check which type was passed in and call the appropriate close
                    // Casting is needed as typescript doesn't seem to infer enough from this
                    if (isTabGroup(tabsOrTabGroups[0])) {
                        return this._closeGroups(tabsOrTabGroups, preserveFocus);
                    }
                    else {
                        return this._closeTabs(tabsOrTabGroups, preserveFocus);
                    }
                },
                // move: async (tab: vscode.Tab, viewColumn: ViewColumn, index: number, preserveFocus?: boolean) => {
                // 	const extHostTab = this._findExtHostTabFromApi(tab);
                // 	if (!extHostTab) {
                // 		throw new Error('Invalid tab');
                // 	}
                // 	this._proxy.$moveTab(extHostTab.tabId, index, typeConverters.ViewColumn.from(viewColumn), preserveFocus);
                // 	return;
                // }
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    $acceptEditorTabModel(tabGroups) {
        const groupIdsBefore = new Set(this._extHostTabGroups.map((group) => group.groupId));
        const groupIdsAfter = new Set(tabGroups.map((dto) => dto.groupId));
        const diff = diffSets(groupIdsBefore, groupIdsAfter);
        const closed = this._extHostTabGroups
            .filter((group) => diff.removed.includes(group.groupId))
            .map((group) => group.apiObject);
        const opened = [];
        const changed = [];
        this._extHostTabGroups = tabGroups.map((tabGroup) => {
            const group = new ExtHostEditorTabGroup(tabGroup, () => this._activeGroupId);
            if (diff.added.includes(group.groupId)) {
                opened.push(group.apiObject);
            }
            else {
                changed.push(group.apiObject);
            }
            return group;
        });
        // Set the active tab group id
        const activeTabGroupId = assertIsDefined(tabGroups.find((group) => group.isActive === true)?.groupId);
        if (activeTabGroupId !== undefined && this._activeGroupId !== activeTabGroupId) {
            this._activeGroupId = activeTabGroupId;
        }
        this._onDidChangeTabGroups.fire(Object.freeze({ opened, closed, changed }));
    }
    $acceptTabGroupUpdate(groupDto) {
        const group = this._extHostTabGroups.find((group) => group.groupId === groupDto.groupId);
        if (!group) {
            throw new Error('Update Group IPC call received before group creation.');
        }
        group.acceptGroupDtoUpdate(groupDto);
        if (groupDto.isActive) {
            this._activeGroupId = groupDto.groupId;
        }
        this._onDidChangeTabGroups.fire(Object.freeze({ changed: [group.apiObject], opened: [], closed: [] }));
    }
    $acceptTabOperation(operation) {
        const group = this._extHostTabGroups.find((group) => group.groupId === operation.groupId);
        if (!group) {
            throw new Error('Update Tabs IPC call received before group creation.');
        }
        const tab = group.acceptTabOperation(operation);
        // Construct the tab change event based on the operation
        switch (operation.kind) {
            case 0 /* TabModelOperationKind.TAB_OPEN */:
                this._onDidChangeTabs.fire(Object.freeze({
                    opened: [tab.apiObject],
                    closed: [],
                    changed: [],
                }));
                return;
            case 1 /* TabModelOperationKind.TAB_CLOSE */:
                this._onDidChangeTabs.fire(Object.freeze({
                    opened: [],
                    closed: [tab.apiObject],
                    changed: [],
                }));
                return;
            case 3 /* TabModelOperationKind.TAB_MOVE */:
            case 2 /* TabModelOperationKind.TAB_UPDATE */:
                this._onDidChangeTabs.fire(Object.freeze({
                    opened: [],
                    closed: [],
                    changed: [tab.apiObject],
                }));
                return;
        }
    }
    _findExtHostTabFromApi(apiTab) {
        for (const group of this._extHostTabGroups) {
            for (const tab of group.tabs) {
                if (tab.apiObject === apiTab) {
                    return tab;
                }
            }
        }
        return;
    }
    _findExtHostTabGroupFromApi(apiTabGroup) {
        return this._extHostTabGroups.find((candidate) => candidate.apiObject === apiTabGroup);
    }
    async _closeTabs(tabs, preserveFocus) {
        const extHostTabIds = [];
        for (const tab of tabs) {
            const extHostTab = this._findExtHostTabFromApi(tab);
            if (!extHostTab) {
                throw new Error('Tab close: Invalid tab not found!');
            }
            extHostTabIds.push(extHostTab.tabId);
        }
        return this._proxy.$closeTab(extHostTabIds, preserveFocus);
    }
    async _closeGroups(groups, preserverFoucs) {
        const extHostGroupIds = [];
        for (const group of groups) {
            const extHostGroup = this._findExtHostTabGroupFromApi(group);
            if (!extHostGroup) {
                throw new Error('Group close: Invalid group not found!');
            }
            extHostGroupIds.push(extHostGroup.groupId);
        }
        return this._proxy.$closeGroup(extHostGroupIds, preserverFoucs);
    }
};
ExtHostEditorTabs = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostEditorTabs);
export { ExtHostEditorTabs };
//#region Utils
function isTabGroup(obj) {
    const tabGroup = obj;
    if (tabGroup.tabs !== undefined) {
        return true;
    }
    return false;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVkaXRvclRhYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RWRpdG9yVGFicy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFJTixXQUFXLEdBS1gsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFBO0FBQzVELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLHNCQUFzQixFQUN0QiwwQkFBMEIsRUFDMUIsc0JBQXNCLEVBQ3RCLHNCQUFzQixFQUN0QixnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLFlBQVksRUFDWixxQkFBcUIsRUFDckIscUJBQXFCLEdBQ3JCLE1BQU0sbUJBQW1CLENBQUE7QUFRMUIsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixvQkFBb0IsQ0FBQyxDQUFBO0FBYzNGLE1BQU0sZ0JBQWdCO0lBT3JCLFlBQ0MsR0FBa0IsRUFDbEIsV0FBa0MsRUFDbEMsaUJBQStCO1FBRS9CLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQTtRQUMzQyxJQUFJLENBQUMs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