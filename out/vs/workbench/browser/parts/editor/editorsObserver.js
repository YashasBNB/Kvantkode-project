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
var EditorsObserver_1;
import { EditorExtensions, } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { dispose, Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { LinkedMap, ResourceMap } from '../../../../base/common/map.js';
import { equals } from '../../../../base/common/objects.js';
/**
 * A observer of opened editors across all editor groups by most recently used.
 * Rules:
 * - the last editor in the list is the one most recently activated
 * - the first editor in the list is the one that was activated the longest time ago
 * - an editor that opens inactive will be placed behind the currently active editor
 *
 * The observer may start to close editors based on the workbench.editor.limit setting.
 */
let EditorsObserver = class EditorsObserver extends Disposable {
    static { EditorsObserver_1 = this; }
    static { this.STORAGE_KEY = 'editors.mru'; }
    get count() {
        return this.mostRecentEditorsMap.size;
    }
    get editors() {
        return [...this.mostRecentEditorsMap.values()];
    }
    hasEditor(editor) {
        const editors = this.editorsPerResourceCounter.get(editor.resource);
        return editors?.has(this.toIdentifier(editor)) ?? false;
    }
    hasEditors(resource) {
        return this.editorsPerResourceCounter.has(resource);
    }
    toIdentifier(arg1, editorId) {
        if (typeof arg1 !== 'string') {
            return this.toIdentifier(arg1.typeId, arg1.editorId);
        }
        if (editorId) {
            return `${arg1}/${editorId}`;
        }
        return arg1;
    }
    constructor(editorGroupsContainer, editorGroupService, storageService) {
        super();
        this.editorGroupService = editorGroupService;
        this.storageService = storageService;
        this.keyMap = new Map();
        this.mostRecentEditorsMap = new LinkedMap();
        this.editorsPerResourceCounter = new ResourceMap();
        this._onDidMostRecentlyActiveEditorsChange = this._register(new Emitter());
        this.onDidMostRecentlyActiveEditorsChange = this._onDidMostRecentlyActiveEditorsChange.event;
        this.editorGroupsContainer = editorGroupsContainer ?? editorGroupService;
        this.isScoped = !!editorGroupsContainer;
        this.registerListeners();
        this.loadState();
    }
    registerListeners() {
        this._register(this.editorGroupsContainer.onDidAddGroup((group) => this.onGroupAdded(group)));
        this._register(this.editorGroupService.onDidChangeEditorPartOptions((e) => this.onDidChangeEditorPartOptions(e)));
        this._register(this.storageService.onWillSaveState(() => this.saveState()));
    }
    onGroupAdded(group) {
        // Make sure to add any already existing editor
        // of the new group into our list in LRU order
        const groupEditorsMru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        for (let i = groupEditorsMru.length - 1; i >= 0; i--) {
            this.addMostRecentEditor(group, groupEditorsMru[i], false /* is not active */, true /* is new */);
        }
        // Make sure that active editor is put as first if group is active
        if (this.editorGroupsContainer.activeGroup === group && group.activeEditor) {
            this.addMostRecentEditor(group, group.activeEditor, true /* is active */, false /* already added before */);
        }
        // Group Listeners
        this.registerGroupListeners(group);
    }
    registerGroupListeners(group) {
        const groupDisposables = new DisposableStore();
        groupDisposables.add(group.onDidModelChange((e) => {
            switch (e.kind) {
                // Group gets active: put active editor as most recent
                case 0 /* GroupModelChangeKind.GROUP_ACTIVE */: {
                    if (this.editorGroupsContainer.activeGroup === group && group.activeEditor) {
                        this.addMostRecentEditor(group, group.activeEditor, true /* is active */, false /* editor already opened */);
                    }
                    break;
                }
                // Editor opens: put it as second most recent
                //
                // Also check for maximum allowed number of editors and
                // start to close oldest ones if needed.
                case 5 /* GroupModelChangeKind.EDITOR_OPEN */: {
                    if (e.editor) {
                        this.addMostRecentEditor(group, e.editor, false /* is not active */, true /* is new */);
                        this.ensureOpenedEditorsLimit({ groupId: group.id, editor: e.editor }, group.id);
                    }
                    break;
                }
            }
        }));
        // Editor closes: remove from recently opened
        groupDisposables.add(group.onDidCloseEditor((e) => {
            this.removeMostRecentEditor(group, e.editor);
        }));
        // Editor gets active: put active editor as most recent
        // if group is active, otherwise second most recent
        groupDisposables.add(group.onDidActiveEditorChange((e) => {
            if (e.editor) {
                this.addMostRecentEditor(group, e.editor, this.editorGroupsContainer.activeGroup === group, false /* editor already opened */);
            }
        }));
        // Make sure to cleanup on dispose
        Event.once(group.onWillDispose)(() => dispose(groupDisposables));
    }
    onDidChangeEditorPartOptions(event) {
        if (!equals(event.newPartOptions.limit, event.oldPartOptions.limit)) {
            const activeGroup = this.editorGroupsContainer.activeGroup;
            let exclude = undefined;
            if (activeGroup.activeEditor) {
                exclude = { editor: activeGroup.activeEditor, groupId: activeGroup.id };
            }
            this.ensureOpenedEditorsLimit(exclude);
        }
    }
    addMostRecentEditor(group, editor, isActive, isNew) {
        const key = this.ensureKey(group, editor);
        const mostRecentEditor = this.mostRecentEditorsMap.first;
        // Active or first entry: add to end of map
        if (isActive || !mostRecentEditor) {
            this.mostRecentEditorsMap.set(key, key, mostRecentEditor ? 1 /* Touch.AsOld */ : undefined);
        }
        // Otherwise: insert before most recent
        else {
            // we have most recent editors. as such we
            // put this newly opened editor right before
            // the current most recent one because it cannot
            // be the most recently active one unless
            // it becomes active. but it is still more
            // active then any other editor in the list.
            this.mostRecentEditorsMap.set(key, key, 1 /* Touch.AsOld */);
            this.mostRecentEditorsMap.set(mostRecentEditor, mostRecentEditor, 1 /* Touch.AsOld */);
        }
        // Update in resource map if this is a new editor
        if (isNew) {
            this.updateEditorResourcesMap(editor, true);
        }
        // Event
        this._onDidMostRecentlyActiveEditorsChange.fire();
    }
    updateEditorResourcesMap(editor, add) {
        // Distill the editor resource and type id with support
        // for side by side editor's primary side too.
        let resource = undefined;
        let typeId = undefined;
        let editorId = undefined;
        if (editor instanceof SideBySideEditorInput) {
            resource = editor.primary.resource;
            typeId = editor.primary.typeId;
            editorId = editor.primary.editorId;
        }
        else {
            resource = editor.resource;
            typeId = editor.typeId;
            editorId = editor.editorId;
        }
        if (!resource) {
            return; // require a resource
        }
        const identifier = this.toIdentifier(typeId, editorId);
        // Add entry
        if (add) {
            let editorsPerResource = this.editorsPerResourceCounter.get(resource);
            if (!editorsPerResource) {
                editorsPerResource = new Map();
                this.editorsPerResourceCounter.set(resource, editorsPerResource);
            }
            editorsPerResource.set(identifier, (editorsPerResource.get(identifier) ?? 0) + 1);
        }
        // Remove entry
        else {
            const editorsPerResource = this.editorsPerResourceCounter.get(resource);
            if (editorsPerResource) {
                const counter = editorsPerResource.get(identifier) ?? 0;
                if (counter > 1) {
                    editorsPerResource.set(identifier, counter - 1);
                }
                else {
                    editorsPerResource.delete(identifier);
                    if (editorsPerResource.size === 0) {
                        this.editorsPerResourceCounter.delete(resource);
                    }
                }
            }
        }
    }
    removeMostRecentEditor(group, editor) {
        // Update in resource map
        this.updateEditorResourcesMap(editor, false);
        // Update in MRU list
        const key = this.findKey(group, editor);
        if (key) {
            // Remove from most recent editors
            this.mostRecentEditorsMap.delete(key);
            // Remove from key map
            const map = this.keyMap.get(group.id);
            if (map && map.delete(key.editor) && map.size === 0) {
                this.keyMap.delete(group.id);
            }
            // Event
            this._onDidMostRecentlyActiveEditorsChange.fire();
        }
    }
    findKey(group, editor) {
        const groupMap = this.keyMap.get(group.id);
        if (!groupMap) {
            return undefined;
        }
        return groupMap.get(editor);
    }
    ensureKey(group, editor) {
        let groupMap = this.keyMap.get(group.id);
        if (!groupMap) {
            groupMap = new Map();
            this.keyMap.set(group.id, groupMap);
        }
        let key = groupMap.get(editor);
        if (!key) {
            key = { groupId: group.id, editor };
            groupMap.set(editor, key);
        }
        return key;
    }
    async ensureOpenedEditorsLimit(exclude, groupId) {
        if (!this.editorGroupService.partOptions.limit?.enabled ||
            typeof this.editorGroupService.partOptions.limit.value !== 'number' ||
            this.editorGroupService.partOptions.limit.value <= 0) {
            return; // return early if not enabled or invalid
        }
        const limit = this.editorGroupService.partOptions.limit.value;
        // In editor group
        if (this.editorGroupService.partOptions.limit?.perEditorGroup) {
            // For specific editor groups
            if (typeof groupId === 'number') {
                const group = this.editorGroupsContainer.getGroup(groupId);
                if (group) {
                    await this.doEnsureOpenedEditorsLimit(limit, group
                        .getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)
                        .map((editor) => ({ editor, groupId })), exclude);
                }
            }
            // For all editor groups
            else {
                for (const group of this.editorGroupsContainer.groups) {
                    await this.ensureOpenedEditorsLimit(exclude, group.id);
                }
            }
        }
        // Across all editor groups
        else {
            await this.doEnsureOpenedEditorsLimit(limit, [...this.mostRecentEditorsMap.values()], exclude);
        }
    }
    async doEnsureOpenedEditorsLimit(limit, mostRecentEditors, exclude) {
        // Check for `excludeDirty` setting and apply it by excluding
        // any recent editor that is dirty from the opened editors limit
        let mostRecentEditorsCountingForLimit;
        if (this.editorGroupService.partOptions.limit?.excludeDirty) {
            mostRecentEditorsCountingForLimit = mostRecentEditors.filter(({ editor }) => {
                if ((editor.isDirty() && !editor.isSaving()) ||
                    editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */)) {
                    return false; // not dirty editors (unless in the process of saving) or scratchpads
                }
                return true;
            });
        }
        else {
            mostRecentEditorsCountingForLimit = mostRecentEditors;
        }
        if (limit >= mostRecentEditorsCountingForLimit.length) {
            return; // only if opened editors exceed setting and is valid and enabled
        }
        // Extract least recently used editors that can be closed
        const leastRecentlyClosableEditors = mostRecentEditorsCountingForLimit
            .reverse()
            .filter(({ editor, groupId }) => {
            if ((editor.isDirty() && !editor.isSaving()) ||
                editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */)) {
                return false; // not dirty editors (unless in the process of saving) or scratchpads
            }
            if (exclude && editor === exclude.editor && groupId === exclude.groupId) {
                return false; // never the editor that should be excluded
            }
            if (this.editorGroupsContainer.getGroup(groupId)?.isSticky(editor)) {
                return false; // never sticky editors
            }
            return true;
        });
        // Close editors until we reached the limit again
        let editorsToCloseCount = mostRecentEditorsCountingForLimit.length - limit;
        const mapGroupToEditorsToClose = new Map();
        for (const { groupId, editor } of leastRecentlyClosableEditors) {
            let editorsInGroupToClose = mapGroupToEditorsToClose.get(groupId);
            if (!editorsInGroupToClose) {
                editorsInGroupToClose = [];
                mapGroupToEditorsToClose.set(groupId, editorsInGroupToClose);
            }
            editorsInGroupToClose.push(editor);
            editorsToCloseCount--;
            if (editorsToCloseCount === 0) {
                break; // limit reached
            }
        }
        for (const [groupId, editors] of mapGroupToEditorsToClose) {
            const group = this.editorGroupsContainer.getGroup(groupId);
            if (group) {
                await group.closeEditors(editors, { preserveFocus: true });
            }
        }
    }
    saveState() {
        if (this.isScoped) {
            return; // do not persist state when scoped
        }
        if (this.mostRecentEditorsMap.isEmpty()) {
            this.storageService.remove(EditorsObserver_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        else {
            this.storageService.store(EditorsObserver_1.STORAGE_KEY, JSON.stringify(this.serialize()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    serialize() {
        const registry = Registry.as(EditorExtensions.EditorFactory);
        const entries = [...this.mostRecentEditorsMap.values()];
        const mapGroupToSerializableEditorsOfGroup = new Map();
        return {
            entries: coalesce(entries.map(({ editor, groupId }) => {
                // Find group for entry
                const group = this.editorGroupsContainer.getGroup(groupId);
                if (!group) {
                    return undefined;
                }
                // Find serializable editors of group
                let serializableEditorsOfGroup = mapGroupToSerializableEditorsOfGroup.get(group);
                if (!serializableEditorsOfGroup) {
                    serializableEditorsOfGroup = group
                        .getEditors(1 /* EditorsOrder.SEQUENTIAL */)
                        .filter((editor) => {
                        const editorSerializer = registry.getEditorSerializer(editor);
                        return editorSerializer?.canSerialize(editor);
                    });
                    mapGroupToSerializableEditorsOfGroup.set(group, serializableEditorsOfGroup);
                }
                // Only store the index of the editor of that group
                // which can be undefined if the editor is not serializable
                const index = serializableEditorsOfGroup.indexOf(editor);
                if (index === -1) {
                    return undefined;
                }
                return { groupId, index };
            })),
        };
    }
    async loadState() {
        if (this.editorGroupsContainer === this.editorGroupService.mainPart ||
            this.editorGroupsContainer === this.editorGroupService) {
            await this.editorGroupService.whenReady;
        }
        // Previous state: Load editors map from persisted state
        // unless we are running in scoped mode
        let hasRestorableState = false;
        if (!this.isScoped) {
            const serialized = this.storageService.get(EditorsObserver_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (serialized) {
                hasRestorableState = true;
                this.deserialize(JSON.parse(serialized));
            }
        }
        // No previous state: best we can do is add each editor
        // from oldest to most recently used editor group
        if (!hasRestorableState) {
            const groups = this.editorGroupsContainer.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            for (let i = groups.length - 1; i >= 0; i--) {
                const group = groups[i];
                const groupEditorsMru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
                for (let i = groupEditorsMru.length - 1; i >= 0; i--) {
                    this.addMostRecentEditor(group, groupEditorsMru[i], true /* enforce as active to preserve order */, true /* is new */);
                }
            }
        }
        // Ensure we listen on group changes for those that exist on startup
        for (const group of this.editorGroupsContainer.groups) {
            this.registerGroupListeners(group);
        }
    }
    deserialize(serialized) {
        const mapValues = [];
        for (const { groupId, index } of serialized.entries) {
            // Find group for entry
            const group = this.editorGroupsContainer.getGroup(groupId);
            if (!group) {
                continue;
            }
            // Find editor for entry
            const editor = group.getEditorByIndex(index);
            if (!editor) {
                continue;
            }
            // Make sure key is registered as well
            const editorIdentifier = this.ensureKey(group, editor);
            mapValues.push([editorIdentifier, editorIdentifier]);
            // Update in resource map
            this.updateEditorResourcesMap(editor, true);
        }
        // Fill map with deserialized values
        this.mostRecentEditorsMap.fromJSON(mapValues);
    }
};
EditorsObserver = EditorsObserver_1 = __decorate([
    __param(1, IEditorGroupsService),
    __param(2, IStorageService)
], EditorsObserver);
export { EditorsObserver };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yc09ic2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvcnNPYnNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUlOLGdCQUFnQixHQUtoQixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sb0JBQW9CLEdBSXBCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQVMsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBYTNEOzs7Ozs7OztHQVFHO0FBQ0ksSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVOzthQUN0QixnQkFBVyxHQUFHLGFBQWEsQUFBaEIsQ0FBZ0I7SUFXbkQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFBO0lBQ3RDLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLENBQUMsR0FBRyxJQUFJLENB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