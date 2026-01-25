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
var EditorResolverService_1;
import * as glob from '../../../../base/common/glob.js';
import { distinct, insert } from '../../../../base/common/arrays.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { basename, extname, isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorActivation, EditorResolution, } from '../../../../platform/editor/common/editor.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorResourceAccessor, isEditorInputWithOptions, isEditorInputWithOptionsAndGroup, isResourceDiffEditorInput, isResourceSideBySideEditorInput, isUntitledResourceEditorInput, isResourceMergeEditorInput, SideBySideEditor, isResourceMultiDiffEditorInput, } from '../../../common/editor.js';
import { IEditorGroupsService } from '../common/editorGroupsService.js';
import { Schemas } from '../../../../base/common/network.js';
import { RegisteredEditorPriority, editorsAssociationsSettingId, globMatchesResource, IEditorResolverService, priorityToRank, } from '../common/editorResolverService.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { localize } from '../../../../nls.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { findGroup } from '../common/editorGroupFinder.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { PauseableEmitter } from '../../../../base/common/event.js';
let EditorResolverService = class EditorResolverService extends Disposable {
    static { EditorResolverService_1 = this; }
    // Constants
    static { this.configureDefaultID = 'promptOpenWith.configureDefault'; }
    static { this.cacheStorageID = 'editorOverrideService.cache'; }
    static { this.conflictingDefaultsStorageID = 'editorOverrideService.conflictingDefaults'; }
    constructor(editorGroupService, instantiationService, configurationService, quickInputService, notificationService, storageService, extensionService, logService) {
        super();
        this.editorGroupService = editorGroupService;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.quickInputService = quickInputService;
        this.notificationService = notificationService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.logService = logService;
        // Events
        this._onDidChangeEditorRegistrations = this._register(new PauseableEmitter());
        this.onDidChangeEditorRegistrations = this._onDidChangeEditorRegistrations.event;
        // Data Stores
        this._editors = new Map();
        this._flattenedEditors = new Map();
        this._shouldReFlattenEditors = true;
        // Read in the cache on statup
        this.cache = new Set(JSON.parse(this.storageService.get(EditorResolverService_1.cacheStorageID, 0 /* StorageScope.PROFILE */, JSON.stringify([]))));
        this.storageService.remove(EditorResolverService_1.cacheStorageID, 0 /* StorageScope.PROFILE */);
        this._register(this.storageService.onWillSaveState(() => {
            // We want to store the glob patterns we would activate on, this allows us to know if we need to await the ext host on startup for opening a resource
            this.cacheEditors();
        }));
        // When extensions have registered we no longer need the cache
        this._register(this.extensionService.onDidRegisterExtensions(() => {
            this.cache = undefined;
        }));
    }
    resolveUntypedInputAndGroup(editor, preferredGroup) {
        const untypedEditor = editor;
        // Use the untyped editor to find a group
        const findGroupResult = this.instantiationService.invokeFunction(findGroup, untypedEditor, preferredGroup);
        if (findGroupResult instanceof Promise) {
            return findGroupResult.then(([group, activation]) => [untypedEditor, group, activation]);
        }
        else {
            const [group, activation] = findGroupResult;
            return [untypedEditor, group, activation];
        }
    }
    async resolveEditor(editor, preferredGroup) {
        // Update the flattened editors
        this._flattenedEditors = this._flattenEditorsMap();
        // Special case: side by side editors requires us to
        // independently resolve both sides and then build
        // a side by side editor with the result
        if (isResourceSideBySideEditorInput(editor)) {
            return this.doResolveSideBySideEditor(editor, preferredGroup);
        }
        let resolvedUntypedAndGroup;
        const resolvedUntypedAndGroupResult = this.resolveUntypedInputAndGroup(editor, preferredGroup);
        if (resolvedUntypedAndGroupResult instanceof Promise) {
            resolvedUntypedAndGroup = await resolvedUntypedAndGroupResult;
        }
        else {
            resolvedUntypedAndGroup = resolvedUntypedAndGroupResult;
        }
        if (!resolvedUntypedAndGroup) {
            return 2 /* ResolvedStatus.NONE */;
        }
        // Get the resolved untyped editor, group, and activation
        const [untypedEditor, group, activation] = resolvedUntypedAndGroup;
        if (activation) {
            untypedEditor.options = { ...untypedEditor.options, activation };
        }
        let resource = EditorResourceAccessor.getCanonicalUri(untypedEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        // If it was resolved before we await for the extensions to activate and then proceed with resolution or else the backing extensions won't be registered
        if (this.cache && resource && this.resourceMatchesCache(resource)) {
            await this.extensionService.whenInstalledExtensionsRegistered();
        }
        // Undefined resource -> untilted. Other malformed URI's are unresolvable
        if (resource === undefined) {
            resource = URI.from({ scheme: Schemas.untitled });
        }
        else if (resource.scheme === undefined || resource === null) {
            return 2 /* ResolvedStatus.NONE */;
        }
        if (untypedEditor.options?.override === EditorResolution.PICK) {
            const picked = await this.doPickEditor(untypedEditor);
            // If the picker was cancelled we will stop resolving the editor
            if (!picked) {
                return 1 /* ResolvedStatus.ABORT */;
            }
            // Populate the options with the new ones
            untypedEditor.options = picked;
        }
        // Resolved the editor ID as much as possible, now find a given editor (cast here is ok because we resolve down to a string above)
        let { editor: selectedEditor, conflictingDefault } = this.getEditor(resource, untypedEditor.options?.override);
        // If no editor was found and this was a typed editor or an editor with an explicit override we could not resolve it
        if (!selectedEditor && (untypedEditor.options?.override || isEditorInputWithOptions(editor))) {
            return 2 /* ResolvedStatus.NONE */;
        }
        else if (!selectedEditor) {
            // Simple untyped editors that we could not resolve will be resolved to the default editor
            const resolvedEditor = this.getEditor(resource, DEFAULT_EDITOR_ASSOCIATION.id);
            selectedEditor = resolvedEditor?.editor;
            conflictingDefault = resolvedEditor?.conflictingDefault;
            if (!selectedEditor) {
                return 2 /* ResolvedStatus.NONE */;
            }
        }
        // In the special case of diff editors we do some more work to determine the correct editor for both sides
        if (isResourceDiffEditorInput(untypedEditor) && untypedEditor.options?.override === undefined) {
            let resource2 = EditorResourceAccessor.getCanonicalUri(untypedEditor, {
                supportSideBySide: SideBySideEditor.SECONDARY,
            });
            if (!resource2) {
                resource2 = URI.from({ scheme: Schemas.untitled });
            }
            const { editor: selectedEditor2 } = this.getEditor(resource2, undefined);
            if (!selectedEditor2 || selectedEditor.editorInfo.id !== selectedEditor2.editorInfo.id) {
                const { editor: selectedDiff, conflictingDefault: conflictingDefaultDiff } = this.getEditor(resource, DEFAULT_EDITOR_ASSOCIATION.id);
                selectedEditor = selectedDiff;
                conflictingDefault = conflictingDefaultDiff;
            }
            if (!selectedEditor) {
                return 2 /* ResolvedStatus.NONE */;
            }
        }
        // If no override we take the selected editor id so that matches works with the isActive check
        untypedEditor.options = { override: selectedEditor.editorInfo.id, ...untypedEditor.options };
        // Check if diff can be created based on prescene of factory function
        if (selectedEditor.editorFactoryObject.createDiffEditorInput === undefined &&
            isResourceDiffEditorInput(untypedEditor)) {
            return 2 /* ResolvedStatus.NONE */;
        }
        const input = await this.doResolveEditor(untypedEditor, group, selectedEditor);
        if (conflictingDefault && input) {
            // Show the conflicting default dialog
            await this.doHandleConflictingDefaults(resource, selectedEditor.editorInfo.label, untypedEditor, input.editor, group);
        }
        if (input) {
            if (input.editor.editorId !== selectedEditor.editorInfo.id) {
                this.logService.warn(`Editor ID Mismatch: ${input.editor.editorId} !== ${selectedEditor.editorInfo.id}. This will cause bugs. Please ensure editorInput.editorId matches the registered id`);
            }
            return { ...input, group };
        }
        return 1 /* ResolvedStatus.ABORT */;
    }
    async doResolveSideBySideEditor(editor, preferredGroup) {
        const primaryResolvedEditor = await this.resolveEditor(editor.primary, preferredGroup);
        if (!isEditorInputWithOptionsAndGroup(primaryResolvedEditor)) {
            return 2 /* ResolvedStatus.NONE */;
        }
        const secondaryResolvedEditor = await this.resolveEditor(editor.secondary, primaryResolvedEditor.group ?? preferredGroup);
        if (!isEditorInputWithOptionsAndGroup(secondaryResolvedEditor)) {
            return 2 /* ResolvedStatus.NONE */;
        }
        return {
            group: primaryResolvedEditor.group ?? secondaryResolvedEditor.group,
            editor: this.instantiationService.createInstance(SideBySideEditorInput, editor.label, editor.description, secondaryResolvedEditor.editor, primaryResolvedEditor.editor),
            options: editor.options,
        };
    }
    bufferChangeEvents(callback) {
        this._onDidChangeEditorRegistrations.pause();
        try {
            callback();
        }
        finally {
            this._onDidChangeEditorRegistrations.resume();
        }
    }
    registerEditor(globPattern, editorInfo, options, editorFactoryObject) {
        let registeredEditor = this._editors.get(globPattern);
        if (registeredEditor === undefined) {
            registeredEditor = new Map();
            this._editors.set(globPattern, registeredEditor);
        }
        let editorsWithId = registeredEditor.get(editorInfo.id);
        if (editorsWithId === undefined) {
            editorsWithId = [];
        }
        const remove = insert(editorsWithId, {
            globPattern,
            editorInfo,
            options,
            editorFactoryObject,
        });
        registeredEditor.set(editorInfo.id, editorsWithId);
        this._shouldReFlattenEditors = true;
        this._onDidChangeEditorRegistrations.fire();
        return toDisposable(() => {
            remove();
            if (editorsWithId && editorsWithId.length === 0) {
                registeredEditor?.delete(editorInfo.id);
            }
            this._shouldReFlattenEditors = true;
            this._onDidChangeEditorRegistrations.fire();
        });
    }
    getAssociationsForResource(resource) {
        const associations = this.getAllUserAssociations();
        let matchingAssociations = associations.filter((association) => association.filenamePattern && globMatchesResource(association.filenamePattern, resource));
        // Sort matching associations based on glob length as a longer glob will be more specific
        matchingAssociations = matchingAssociations.sort((a, b) => (b.filenamePattern?.length ?? 0) - (a.filenamePattern?.length ?? 0));
        const allEditors = this._registeredEditors;
        // Ensure that the settings are valid editors
        return matchingAssociations.filter((association) => allEditors.find((c) => c.editorInfo.id === association.viewType));
    }
    getAllUserAssociations() {
        const inspectedEditorAssociations = this.configurationService.inspect(editorsAssociationsSettingId) || {};
        const defaultAssociations = inspectedEditorAssociations.defaultValue ?? {};
        const workspaceAssociations = inspectedEditorAssociations.workspaceValue ?? {};
        const userAssociations = inspectedEditorAssociations.userValue ?? {};
        const rawAssociations = { ...workspaceAssociations };
        // We want to apply the default associations and user associations on top of the workspace associations but ignore duplicate keys.
        for (const [key, value] of Object.entries({ ...defaultAssociations, ...userAssociations })) {
            if (rawAssociations[key] === undefined) {
                rawAssociations[key] = value;
            }
        }
        const associations = [];
        for (const [key, value] of Object.entries(rawAssociations)) {
            const association = {
                filenamePattern: key,
                viewType: value,
            };
            associations.push(association);
        }
        return associations;
    }
    /**
     * Given the nested nature of the editors map, we merge factories of the same glob and id to make it flat
     * and easier to work with
     */
    _flattenEditorsMap() {
        // If we shouldn't be re-flattening (due to lack of update) then return early
        if (!this._shouldReFlattenEditors) {
            return this._flattenedEditors;
        }
        this._shouldReFlattenEditors = false;
        const editors = new Map();
        for (const [glob, value] of this._editors) {
            const registeredEditors = [];
            for (const editors of value.values()) {
                let registeredEditor = undefined;
                // Merge all editors with the same id and glob pattern together
                for (const editor of editors) {
                    if (!registeredEditor) {
                        registeredEditor = {
                            editorInfo: editor.editorInfo,
                            globPattern: editor.globPattern,
                            options: {},
                            editorFactoryObject: {},
                        };
                    }
                    // Merge options and factories
                    registeredEditor.options = { ...registeredEditor.options, ...editor.options };
                    registeredEditor.editorFactoryObject = {
                        ...registeredEditor.editorFactoryObject,
                        ...editor.editorFactoryObject,
                    };
                }
                if (registeredEditor) {
                    registeredEditors.push(registeredEditor);
                }
            }
            editors.set(glob, registeredEditors);
        }
        return editors;
    }
    /**
     * Returns all editors as an array. Possible to contain duplicates
     */
    get _registeredEditors() {
        return Array.from(this._flattenedEditors.values()).flat();
    }
    updateUserAssociations(globPattern, editorID) {
        const newAssociation = { viewType: editorID, filenamePattern: globPattern };
        const currentAssociations = this.getAllUserAssociations();
        const newSettingObject = Object.create(null);
        // Form the new setting object including the newest associations
        for (const association of [...currentAssociations, newAssociation]) {
            if (association.filenamePattern) {
                newSettingObject[association.filenamePattern] = association.viewType;
            }
        }
        this.configurationService.updateValue(editorsAssociationsSettingId, newSettingObject);
    }
    findMatchingEditors(resource) {
        // The user setting should be respected even if the editor doesn't specify that resource in package.json
        const userSettings = this.getAssociationsForResource(resource);
        const matchingEditors = [];
        // Then all glob patterns
        for (const [key, editors] of this._flattenedEditors) {
            for (const editor of editors) {
                const foundInSettings = userSettings.find((setting) => setting.viewType === editor.editorInfo.id);
                if ((foundInSettings && editor.editorInfo.priority !== RegisteredEditorPriority.exclusive) ||
                    globMatchesResource(key, resource)) {
                    matchingEditors.push(editor);
                }
            }
        }
        // Return the editors sorted by their priority
        return matchingEditors.sort((a, b) => {
            // Very crude if priorities match longer glob wins as longer globs are normally more specific
            if (priorityToRank(b.editorInfo.priority) === priorityToRank(a.editorInfo.priority) &&
                typeof b.globPattern === 'string' &&
                typeof a.globPattern === 'string') {
                return b.globPattern.length - a.globPattern.length;
            }
            return priorityToRank(b.editorInfo.priority) - priorityToRank(a.editorInfo.priority);
        });
    }
    getEditors(resource) {
        this._flattenedEditors = this._flattenEditorsMap();
        // By resource
        if (URI.isUri(resource)) {
            const editors = this.findMatchingEditors(resource);
            if (editors.find((e) => e.editorInfo.priority === RegisteredEditorPriority.exclusive)) {
                return [];
            }
            return editors.map((editor) => editor.editorInfo);
        }
        // All
        return distinct(this._registeredEditors.map((editor) => editor.editorInfo), (editor) => editor.id);
    }
    /**
     * Given a resource and an editorId selects the best possible editor
     * @returns The editor and whether there was another default which conflicted with it
     */
    getEditor(resource, editorId) {
        const findMatchingEditor = (editors, viewType) => {
            return editors.find((editor) => {
                if (editor.options && editor.options.canSupportResource !== undefined) {
                    return editor.editorInfo.id === viewType && editor.options.canSupportResource(resource);
                }
                return editor.editorInfo.id === viewType;
            });
        };
        if (editorId && editorId !== EditorResolution.EXCLUSIVE_ONLY) {
            // Specific id passed in doesn't have to match the resource, it can be anything
            const registeredEditors = this._registeredEditors;
            return {
                editor: findMatchingEditor(registeredEditors, editorId),
                conflictingDefault: false,
            };
        }
        const editors = this.findMatchingEditors(resource);
        const associationsFromSetting = this.getAssociationsForResource(resource);
        // We only want minPriority+ if no user defined setting is found, else we won't resolve an editor
        const minPriority = editorId === EditorResolution.EXCLUSIVE_ONLY
            ? RegisteredEditorPriority.exclusive
            : RegisteredEditorPriority.builtin;
        let possibleEditors = editors.filter((editor) => priorityToRank(editor.editorInfo.priority) >= priorityToRank(minPriority) &&
            editor.editorInfo.id !== DEFAULT_EDITOR_ASSOCIATION.id);
        if (possibleEditors.length === 0) {
            return {
                editor: associationsFromSetting[0] && minPriority !== RegisteredEditorPriority.exclusive
                    ? findMatchingEditor(editors, associationsFromSetting[0].viewType)
                    : undefined,
                conflictingDefault: false,
            };
        }
        // If the editor is exclusive we use that, else use the user setting, else use the built-in+ editor
        const selectedViewType = possibleEditors[0].editorInfo.priority === RegisteredEditorPriority.exclusive
            ? possibleEditors[0].editorInfo.id
            : associationsFromSetting[0]?.viewType || possibleEditors[0].editorInfo.id;
        let conflictingDefault = false;
        // Filter out exclusive before we check for conflicts as exclusive editors cannot be manually chosen
        possibleEditors = possibleEditors.filter((editor) => editor.editorInfo.priority !== RegisteredEditorPriority.exclusive);
        if (associationsFromSetting.length === 0 && possibleEditors.length > 1) {
            conflictingDefault = true;
        }
        return {
            editor: findMatchingEditor(editors, selectedViewType),
            conflictingDefault,
        };
    }
    async doResolveEditor(editor, group, selectedEditor) {
        let options = editor.options;
        const resource = EditorResourceAccessor.getCanonicalUri(editor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        // If no activation option is provided, populate it.
        if (options && typeof options.activation === 'undefined') {
            options = {
                ...options,
                activation: options.preserveFocus ? EditorActivation.RESTORE : undefined,
            };
        }
        // If it's a merge editor we trigger the create merge editor input
        if (isResourceMergeEditorInput(editor)) {
            if (!selectedEditor.editorFactoryObject.createMergeEditorInput) {
                return;
            }
            const inputWithOptions = await selectedEditor.editorFactoryObject.createMergeEditorInput(editor, group);
            return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
        }
        // If it's a diff editor we trigger the create diff editor input
        if (isResourceDiffEditorInput(editor)) {
            if (!selectedEditor.editorFactoryObject.createDiffEditorInput) {
                return;
            }
            const inputWithOptions = await selectedEditor.editorFactoryObject.createDiffEditorInput(editor, group);
            return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
        }
        // If it's a diff list editor we trigger the create diff list editor input
        if (isResourceMultiDiffEditorInput(editor)) {
            if (!selectedEditor.editorFactoryObject.createMultiDiffEditorInput) {
                return;
            }
            const inputWithOptions = await selectedEditor.editorFactoryObject.createMultiDiffEditorInput(editor, group);
            return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
        }
        if (isResourceSideBySideEditorInput(editor)) {
            throw new Error(`Untyped side by side editor input not supported here.`);
        }
        if (isUntitledResourceEditorInput(editor)) {
            if (!selectedEditor.editorFactoryObject.createUntitledEditorInput) {
                return;
            }
            const inputWithOptions = await selectedEditor.editorFactoryObject.createUntitledEditorInput(editor, group);
            return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
        }
        // Should no longer have an undefined resource so lets throw an error if that's somehow the case
        if (resource === undefined) {
            throw new Error(`Undefined resource on non untitled editor input.`);
        }
        // If the editor states it can only be opened once per resource we must close all existing ones except one and move the new one into the group
        const singleEditorPerResource = typeof selectedEditor.options?.singlePerResource === 'function'
            ? selectedEditor.options.singlePerResource()
            : selectedEditor.options?.singlePerResource;
        if (singleEditorPerResource) {
            const existingEditors = this.findExistingEditorsForResource(resource, selectedEditor.editorInfo.id);
            if (existingEditors.length) {
                const editor = await this.moveExistingEditorForResource(existingEditors, group);
                if (editor) {
                    return { editor, options };
                }
                else {
                    return; // failed to move
                }
            }
        }
        // If no factory is above, return flow back to caller letting them know we could not resolve it
        if (!selectedEditor.editorFactoryObject.createEditorInput) {
            return;
        }
        // Respect options passed back
        const inputWithOptions = await selectedEditor.editorFactoryObject.createEditorInput(editor, group);
        options = inputWithOptions.options ?? options;
        const input = inputWithOptions.editor;
        return { editor: input, options };
    }
    /**
     * Moves the first existing editor for a resource to the target group unless already opened there.
     * Additionally will close any other editors that are open for that resource and viewtype besides the first one found
     * @param resource The resource of the editor
     * @param viewType the viewtype of the editor
     * @param targetGroup The group to move it to
     * @returns The moved editor input or `undefined` if the editor could not be moved
     */
    async moveExistingEditorForResource(existingEditorsForResource, targetGroup) {
        const editorToUse = existingEditorsForResource[0];
        // We should only have one editor but if there are multiple we close the others
        for (const { editor, group } of existingEditorsForResource) {
            if (editor !== editorToUse.editor) {
                const closed = await group.closeEditor(editor);
                if (!closed) {
                    return;
                }
            }
        }
        // Move the editor already opened to the target group
        if (targetGroup.id !== editorToUse.group.id) {
            const moved = editorToUse.group.moveEditor(editorToUse.editor, targetGroup);
            if (!moved) {
                return;
            }
        }
        return editorToUse.editor;
    }
    /**
     * Given a resource and an editorId, returns all editors open for that resource and editorId.
     * @param resource The resource specified
     * @param editorId The editorID
     * @returns A list of editors
     */
    findExistingEditorsForResource(resource, editorId) {
        const out = [];
        const orderedGroups = distinct([...this.editorGroupService.groups]);
        for (const group of orderedGroups) {
            for (const editor of group.editors) {
                if (isEqual(editor.resource, resource) && editor.editorId === editorId) {
                    out.push({ editor, group });
                }
            }
        }
        return out;
    }
    async doHandleConflictingDefaults(resource, editorName, untypedInput, currentEditor, group) {
        const editors = this.findMatchingEditors(resource);
        const storedChoices = JSON.parse(this.storageService.get(EditorResolverService_1.conflictingDefaultsStorageID, 0 /* StorageScope.PROFILE */, '{}'));
        const globForResource = `*${extname(resource)}`;
        // Writes to the storage service that a choice has been made for the currently installed editors
        const writeCurrentEditorsToStorage = () => {
            storedChoices[globForResource] = [];
            editors.forEach((editor) => storedChoices[globForResource].push(editor.editorInfo.id));
            this.storageService.store(EditorResolverService_1.conflictingDefaultsStorageID, JSON.stringify(storedChoices), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        };
        // If the user has already made a choice for this editor we don't want to ask them again
        if (storedChoices[globForResource] &&
            storedChoices[globForResource].find((editorID) => editorID === currentEditor.editorId)) {
            return;
        }
        const handle = this.notificationService.prompt(Severity.Warning, localize('editorResolver.conflictingDefaults', 'There are multiple default editors available for the resource.'), [
            {
                label: localize('editorResolver.configureDefault', 'Configure Default'),
                run: async () => {
                    // Show the picker and tell it to update the setting to whatever the user selected
                    const picked = await this.doPickEditor(untypedInput, true);
                    if (!picked) {
                        return;
                    }
                    untypedInput.options = picked;
                    const replacementEditor = await this.resolveEditor(untypedInput, group);
                    if (replacementEditor === 1 /* ResolvedStatus.ABORT */ ||
                        replacementEditor === 2 /* ResolvedStatus.NONE */) {
                        return;
                    }
                    // Replace the current editor with the picked one
                    group.replaceEditors([
                        {
                            editor: currentEditor,
                            replacement: replacementEditor.editor,
                            options: replacementEditor.options ?? picked,
                        },
                    ]);
                },
            },
            {
                label: localize('editorResolver.keepDefault', 'Keep {0}', editorName),
                run: writeCurrentEditorsToStorage,
            },
        ]);
        // If the user pressed X we assume they want to keep the current editor as default
        const onCloseListener = handle.onDidClose(() => {
            writeCurrentEditorsToStorage();
            onCloseListener.dispose();
        });
    }
    mapEditorsToQuickPickEntry(resource, showDefaultPicker) {
        const currentEditor = this.editorGroupService.activeGroup.findEditors(resource).at(0);
        // If untitled, we want all registered editors
        let registeredEditors = resource.scheme === Schemas.untitled
            ? this._registeredEditors.filter((e) => e.editorInfo.priority !== RegisteredEditorPriority.exclusive)
            : this.findMatchingEditors(resource);
        // We don't want duplicate Id entries
        registeredEditors = distinct(registeredEditors, (c) => c.editorInfo.id);
        const defaultSetting = this.getAssociationsForResource(resource)[0]?.viewType;
        // Not the most efficient way to do this, but we want to ensure the text editor is at the top of the quickpick
        registeredEditors = registeredEditors.sort((a, b) => {
            if (a.editorInfo.id === DEFAULT_EDITOR_ASSOCIATION.id) {
                return -1;
            }
            else if (b.editorInfo.id === DEFAULT_EDITOR_ASSOCIATION.id) {
                return 1;
            }
            else {
                return priorityToRank(b.editorInfo.priority) - priorityToRank(a.editorInfo.priority);
            }
        });
        const quickPickEntries = [];
        const currentlyActiveLabel = localize('promptOpenWith.currentlyActive', 'Active');
        const currentDefaultLabel = localize('promptOpenWith.currentDefault', 'Default');
        const currentDefaultAndActiveLabel = localize('promptOpenWith.currentDefaultAndActive', 'Active and Default');
        // Default order = setting -> highest priority -> text
        let defaultViewType = defaultSetting;
        if (!defaultViewType &&
            registeredEditors.length > 2 &&
            registeredEditors[1]?.editorInfo.priority !== RegisteredEditorPriority.option) {
            defaultViewType = registeredEditors[1]?.editorInfo.id;
        }
        if (!defaultViewType) {
            defaultViewType = DEFAULT_EDITOR_ASSOCIATION.id;
        }
        // Map the editors to quickpick entries
        registeredEditors.forEach((editor) => {
            const currentViewType = currentEditor?.editorId ?? DEFAULT_EDITOR_ASSOCIATION.id;
            const isActive = currentEditor ? editor.editorInfo.id === currentViewType : false;
            const isDefault = editor.editorInfo.id === defaultViewType;
            const quickPickEntry = {
                id: editor.editorInfo.id,
                label: editor.editorInfo.label,
                description: isActive && isDefault
                    ? currentDefaultAndActiveLabel
                    : isActive
                        ? currentlyActiveLabel
                        : isDefault
                            ? currentDefaultLabel
                            : undefined,
                detail: editor.editorInfo.detail ?? editor.editorInfo.priority,
            };
            quickPickEntries.push(quickPickEntry);
        });
        if (!showDefaultPicker && extname(resource) !== '') {
            const separator = { type: 'separator' };
            quickPickEntries.push(separator);
            const configureDefaultEntry = {
                id: EditorResolverService_1.configureDefaultID,
                label: localize('promptOpenWith.configureDefault', "Configure default editor for '{0}'...", `*${extname(resource)}`),
            };
            quickPickEntries.push(configureDefaultEntry);
        }
        return quickPickEntries;
    }
    async doPickEditor(editor, showDefaultPicker) {
        let resource = EditorResourceAccessor.getOriginalUri(editor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (resource === undefined) {
            resource = URI.from({ scheme: Schemas.untitled });
        }
        // Get all the editors for the resource as quickpick entries
        const editorPicks = this.mapEditorsToQuickPickEntry(resource, showDefaultPicker);
        // Create the editor picker
        const disposables = new DisposableStore();
        const editorPicker = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        const placeHolderMessage = showDefaultPicker
            ? localize('promptOpenWith.updateDefaultPlaceHolder', "Select new default editor for '{0}'", `*${extname(resource)}`)
            : localize('promptOpenWith.placeHolder', "Select editor for '{0}'", basename(resource));
        editorPicker.placeholder = placeHolderMessage;
        editorPicker.canAcceptInBackground = true;
        editorPicker.items = editorPicks;
        const firstItem = editorPicker.items.find((item) => item.type === 'item');
        if (firstItem) {
            editorPicker.selectedItems = [firstItem];
        }
        // Prompt the user to select an editor
        const picked = await new Promise((resolve) => {
            disposables.add(editorPicker.onDidAccept((e) => {
                let result = undefined;
                if (editorPicker.selectedItems.length === 1) {
                    result = {
                        item: editorPicker.selectedItems[0],
                        keyMods: editorPicker.keyMods,
                        openInBackground: e.inBackground,
                    };
                }
                // If asked to always update the setting then update it even if the gear isn't clicked
                if (resource && showDefaultPicker && result?.item.id) {
                    this.updateUserAssociations(`*${extname(resource)}`, result.item.id);
                }
                resolve(result);
            }));
            disposables.add(editorPicker.onDidHide(() => {
                disposables.dispose();
                resolve(undefined);
            }));
            disposables.add(editorPicker.onDidTriggerItemButton((e) => {
                // Trigger opening and close picker
                resolve({ item: e.item, openInBackground: false });
                // Persist setting
                if (resource && e.item && e.item.id) {
                    this.updateUserAssociations(`*${extname(resource)}`, e.item.id);
                }
            }));
            editorPicker.show();
        });
        // Close picker
        editorPicker.dispose();
        // If the user picked an editor, look at how the picker was
        // used (e.g. modifier keys, open in background) and create the
        // options and group to use accordingly
        if (picked) {
            // If the user selected to configure default we trigger this picker again and tell it to show the default picker
            if (picked.item.id === EditorResolverService_1.configureDefaultID) {
                return this.doPickEditor(editor, true);
            }
            // Figure out options
            const targetOptions = {
                ...editor.options,
                override: picked.item.id,
                preserveFocus: picked.openInBackground || editor.options?.preserveFocus,
            };
            return targetOptions;
        }
        return undefined;
    }
    cacheEditors() {
        // Create a set to store glob patterns
        const cacheStorage = new Set();
        // Store just the relative pattern pieces without any path info
        for (const [globPattern, contribPoint] of this._flattenedEditors) {
            const nonOptional = !!contribPoint.find((c) => c.editorInfo.priority !== RegisteredEditorPriority.option &&
                c.editorInfo.id !== DEFAULT_EDITOR_ASSOCIATION.id);
            // Don't keep a cache of the optional ones as those wouldn't be opened on start anyways
            if (!nonOptional) {
                continue;
            }
            if (glob.isRelativePattern(globPattern)) {
                cacheStorage.add(`${globPattern.pattern}`);
            }
            else {
                cacheStorage.add(globPattern);
            }
        }
        // Also store the users settings as those would have to activate on startup as well
        const userAssociations = this.getAllUserAssociations();
        for (const association of userAssociations) {
            if (association.filenamePattern) {
                cacheStorage.add(association.filenamePattern);
            }
        }
        this.storageService.store(EditorResolverService_1.cacheStorageID, JSON.stringify(Array.from(cacheStorage)), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    resourceMatchesCache(resource) {
        if (!this.cache) {
            return false;
        }
        for (const cacheEntry of this.cache) {
            if (globMatchesResource(cacheEntry, resource)) {
                return true;
            }
        }
        return false;
    }
};
EditorResolverService = EditorResolverService_1 = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, INotificationService),
    __param(5, IStorageService),
    __param(6, IExtensionService),
    __param(7, ILogService)
], EditorResolverService);
export { EditorResolverService };
registerSingleton(IEditorResolverService, EditorResolverService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2Jyb3dzZXIvZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBRWhCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUNOLDBCQUEwQixFQUMxQixzQkFBc0IsRUFHdEIsd0JBQXdCLEVBQ3hCLGdDQUFnQyxFQUNoQyx5QkFBeUIsRUFDekIsK0JBQStCLEVBQy9CLDZCQUE2QixFQUM3QiwwQkFBMEIsRUFFMUIsZ0JBQWdCLEVBQ2hCLDhCQUE4QixHQUM5QixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUVOLHdCQUF3QixFQUl4Qiw0QkFBNEIsRUFDNUIsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixjQUFjLEdBSWQsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBR04sa0JBQWtCLEdBR2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBVzVELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTs7SUFPcEQsWUFBWTthQUNZLHVCQUFrQixHQUFHLGlDQUFpQyxBQUFwQyxDQUFvQzthQUN0RCxtQkFBYyxHQUFHLDZCQUE2QixBQUFoQyxDQUFnQzthQUM5QyxpQ0FBNEIsR0FBRywyQ0FBMkMsQUFBOUMsQ0FBOEM7SUFXbEcsWUFDdUIsa0JBQXlELEVBQ3hELG9CQUE0RCxFQUM1RCxvQkFBNEQsRUFDL0QsaUJBQXNELEVBQ3BELG1CQUEwRCxFQUMvRCxjQUFnRCxFQUM5QyxnQkFBb0QsRUFDMUQsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFUZ0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQUN2Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDOUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNuQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQzlDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUM3QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3pDLGVBQVUsR0FBVixVQUFVLENBQWE7UUExQnRELFNBQVM7UUFDUSxvQ0FBK0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLEVBQVEsQ0FBQyxDQUFBO1FBQ3RGLG1DQUE4QixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLENBQUE7UUFPcEYsY0FBYztRQUNOLGFBQVEsR0FBd0UsSUFBSSxHQUFHLEVBRzVGLENBQUE7UUFDSyxzQkFBaUIsR0FBMkQsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNyRiw0QkFBdUIsR0FBWSxJQUFJLENBQUE7UUFjOUMsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQ25CLElBQUksQ0FBQyxLQUFLLENBQ1QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ3RCLHVCQUFxQixDQUFDLGNBQWMsZ0NBRXBDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQ2xCLENBQ0QsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsdUJBQXFCLENBQUMsY0FBYywrQkFBdUIsQ0FBQTtRQUV0RixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRTtZQUN4QyxxSkFBcUo7WUFDckosSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCw4REFBOEQ7UUFDOUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ2xELElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFBO1FBQ3ZCLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sMkJBQTJCLENBQ2xDLE1BQTJCLEVBQzNCLGNBQTBDO1FBSzFDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQTtRQUU1Qix5Q0FBeUM7UUFDekMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDL0QsU0FBUyxFQUNULGFBQWEsRUFDYixjQUFjLENBQ2QsQ0FBQTtRQUNELElBQUksZUFBZSxZQUFZLE9BQU8sRUFBRSxDQUFDO1lBQ3hDLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEdBQUcsZUFBZSxDQUFBO1lBQzNDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FDbEIsTUFBMkIsRUFDM0IsY0FBMEM7UUFFMUMsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUVsRCxvREFBb0Q7UUFDcEQsa0RBQWtEO1FBQ2xELHdDQUF3QztRQUN4QyxJQUFJLCtCQUErQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCxJQUFJLHVCQUVRLENBQUE7UUFDWixNQUFNLDZCQUE2QixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDOUYsSUFBSSw2QkFBNkIsWUFBWSxPQUFPLEVBQUUsQ0FBQztZQUN0RCx1QkFBdUIsR0FBRyxNQUFNLDZCQUE2QixDQUFBO1FBQzlELENBQUM7YUFBTSxDQUFDO1lBQ1AsdUJBQXVCLEdBQUcsNkJBQTZCLENBQUE7UUFDeEQsQ0FBQztRQUVELElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQzlCLG1DQUEwQjtRQUMzQixDQUFDO1FBQ0QseURBQXlEO1FBQ3pELE1BQU0sQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxHQUFHLHVCQUF1QixDQUFBO1FBQ2xFLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsYUFBYSxDQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUcsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQTtRQUNqRSxDQUFDO1FBRUQsSUFBSSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRTtZQUNwRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO1NBQzNDLENBQUMsQ0FBQTtRQUVGLHdKQUF3SjtRQUN4SixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ25FLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlDQUFpQyxFQUFFLENBQUE7UUFDaEUsQ0FBQztRQUVELHlFQUF5RTtRQUN6RSxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNsRCxDQUFDO2FBQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDL0QsbUNBQTBCO1FBQzNCLENBQUM7UUFFRCxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxLQUFLLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQy9ELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUNyRCxnRUFBZ0U7WUFDaEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLG9DQUEyQjtZQUM1QixDQUFDO1lBQ0QseUNBQXlDO1lBQ3pDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQy9CLENBQUM7UUFFRCxrSUFBa0k7UUFDbEksSUFBSSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNsRSxRQUFRLEVBQ1IsYUFBYSxDQUFDLE9BQU8sRUFBRSxRQUFnRSxDQUN2RixDQUFBO1FBQ0Qsb0hBQW9IO1FBQ3BILElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLFFBQVEsSUFBSSx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDOUYsbUNBQTBCO1FBQzNCLENBQUM7YUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDNUIsMEZBQTBGO1lBQzFGLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzlFLGNBQWMsR0FBRyxjQUFjLEVBQUUsTUFBTSxDQUFBO1lBQ3ZDLGtCQUFrQixHQUFHLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQTtZQUN2RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3JCLG1DQUEwQjtZQUMzQixDQUFDO1FBQ0YsQ0FBQztRQUVELDBHQUEwRztRQUMxRyxJQUFJLHlCQUF5QixDQUFDLGFBQWEsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9GLElBQUksU0FBUyxHQUFHLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUU7Z0JBQ3JFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLFNBQVM7YUFDN0MsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1lBQ0QsTUFBTSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN4RSxJQUFJLENBQUMsZUFBZSxJQUFJLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3hGLE1BQU0sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUYsUUFBUSxFQUNSLDBCQUEwQixDQUFDLEVBQUUsQ0FDN0IsQ0FBQTtnQkFDRCxjQUFjLEdBQUcsWUFBWSxDQUFBO2dCQUM3QixrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQTtZQUM1QyxDQUFDO1lBQ0QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixtQ0FBMEI7WUFDM0IsQ0FBQztRQUNGLENBQUM7UUFFRCw4RkFBOEY7UUFDOUYsYUFBYSxDQUFDLE9BQU8sR0FBRyxFQUFFLFFBQVEsRUFBRSxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxHQUFHLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUU1RixxRUFBcUU7UUFDckUsSUFDQyxjQUFjLENBQUMsbUJBQW1CLENBQUMscUJBQXFCLEtBQUssU0FBUztZQUN0RSx5QkFBeUIsQ0FBQyxhQUFhLENBQUMsRUFDdkMsQ0FBQztZQUNGLG1DQUEwQjtRQUMzQixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDOUUsSUFBSSxrQkFBa0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNqQyxzQ0FBc0M7WUFDdEMsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQ3JDLFFBQVEsRUFDUixjQUFjLENBQUMsVUFBVSxDQUFDLEtBQUssRUFDL0IsYUFBYSxFQUNiLEtBQUssQ0FBQyxNQUFNLEVBQ1osS0FBSyxDQUNMLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEtBQUssY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLHVCQUF1QixLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsUUFBUSxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsc0ZBQXNGLENBQ3RLLENBQUE7WUFDRixDQUFDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFBO1FBQzNCLENBQUM7UUFDRCxvQ0FBMkI7SUFDNUIsQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUIsQ0FDdEMsTUFBc0MsRUFDdEMsY0FBMEM7UUFFMUMsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN0RixJQUFJLENBQUMsZ0NBQWdDLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO1lBQzlELG1DQUEwQjtRQUMzQixDQUFDO1FBQ0QsTUFBTSx1QkFBdUIsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQ3ZELE1BQU0sQ0FBQyxTQUFTLEVBQ2hCLHFCQUFxQixDQUFDLEtBQUssSUFBSSxjQUFjLENBQzdDLENBQUE7UUFDRCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO1lBQ2hFLG1DQUEwQjtRQUMzQixDQUFDO1FBQ0QsT0FBTztZQUNOLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxLQUFLLElBQUksdUJBQXVCLENBQUMsS0FBSztZQUNuRSxNQUFNLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDL0MscUJBQXFCLEVBQ3JCLE1BQU0sQ0FBQyxLQUFLLEVBQ1osTUFBTSxDQUFDLFdBQVcsRUFDbEIsdUJBQXVCLENBQUMsTUFBTSxFQUM5QixxQkFBcUIsQ0FBQyxNQUFNLENBQzVCO1lBQ0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1NBQ3ZCLENBQUE7SUFDRixDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBa0I7UUFDcEMsSUFBSSxDQUFDLCtCQUErQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQztZQUNKLFFBQVEsRUFBRSxDQUFBO1FBQ1gsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLCtCQUErQixDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUNiLFdBQTJDLEVBQzNDLFVBQWdDLEVBQ2hDLE9BQWdDLEVBQ2hDLG1CQUE2QztRQUU3QyxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3JELElBQUksZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDcEMsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUE7WUFDdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDakQsQ0FBQztRQUVELElBQUksYUFBYSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdkQsSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDakMsYUFBYSxHQUFHLEVBQUUsQ0FBQTtRQUNuQixDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRTtZQUNwQyxXQUFXO1lBQ1gsVUFBVTtZQUNWLE9BQU87WUFDUCxtQkFBbUI7U0FDbkIsQ0FBQyxDQUFBO1FBQ0YsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQTtRQUNuQyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDM0MsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLE1BQU0sRUFBRSxDQUFBO1lBQ1IsSUFBSSxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakQsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN4QyxDQUFDO1lBQ0QsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQTtZQUNuQyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsMEJBQTBCLENBQUMsUUFBYTtRQUN2QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUNsRCxJQUFJLG9CQUFvQixHQUFHLFlBQVksQ0FBQyxNQUFNLENBQzdDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FDZixXQUFXLENBQUMsZUFBZSxJQUFJLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLENBQzFGLENBQUE7UUFDRCx5RkFBeUY7UUFDekYsb0JBQW9CLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUMvQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FDN0UsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFzQixJQUFJLENBQUMsa0JBQWtCLENBQUE7UUFDN0QsNkNBQTZDO1FBQzdDLE9BQU8sb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FDbEQsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUNoRSxDQUFBO0lBQ0YsQ0FBQztJQUVELHNCQUFzQjtRQUNyQixNQUFNLDJCQUEyQixHQUNoQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUNoQyw0QkFBNEIsQ0FDNUIsSUFBSSxFQUFFLENBQUE7UUFDUixNQUFNLG1CQUFtQixHQUFHLDJCQUEyQixDQUFDLFlBQVksSUFBSSxFQUFFLENBQUE7UUFDMUUsTUFBTSxxQkFBcUIsR0FBRywyQkFBMkIsQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFBO1FBQzlFLE1BQU0sZ0JBQWdCLEdBQUcsMkJBQTJCLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQTtRQUNwRSxNQUFNLGVBQWUsR0FBMEMsRUFBRSxHQUFHLHFCQUFxQixFQUFFLENBQUE7UUFDM0Ysa0lBQWtJO1FBQ2xJLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxHQUFHLGdCQUFnQixFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzVGLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN4QyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBQ0QsTUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDNUQsTUFBTSxXQUFXLEdBQXNCO2dCQUN0QyxlQUFlLEVBQUUsR0FBRztnQkFDcEIsUUFBUSxFQUFFLEtBQUs7YUFDZixDQUFBO1lBQ0QsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBQ0QsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQUVEOzs7T0FHRztJQUNLLGtCQUFrQjtRQUN6Qiw2RUFBNkU7UUFDN0UsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQzlCLENBQUM7UUFDRCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFBO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFxRCxDQUFBO1FBQzVFLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0MsTUFBTSxpQkFBaUIsR0FBc0IsRUFBRSxDQUFBO1lBQy9DLEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLElBQUksZ0JBQWdCLEdBQWlDLFNBQVMsQ0FBQTtnQkFDOUQsK0RBQStEO2dCQUMvRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUM5QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDdkIsZ0JBQWdCLEdBQUc7NEJBQ2xCLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTs0QkFDN0IsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXOzRCQUMvQixPQUFPLEVBQUUsRUFBRTs0QkFDWCxtQkFBbUIsRUFBRSxFQUFFO3lCQUN2QixDQUFBO29CQUNGLENBQUM7b0JBQ0QsOEJBQThCO29CQUM5QixnQkFBZ0IsQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDN0UsZ0JBQWdCLENBQUMsbUJBQW1CLEdBQUc7d0JBQ3RDLEdBQUcsZ0JBQWdCLENBQUMsbUJBQW1CO3dCQUN2QyxHQUFHLE1BQU0sQ0FBQyxtQkFBbUI7cUJBQzdCLENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7b0JBQ3RCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUN6QyxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDckMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBWSxrQkFBa0I7UUFDN0IsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzFELENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxXQUFtQixFQUFFLFFBQWdCO1FBQzNELE1BQU0sY0FBYyxHQUFzQixFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxDQUFBO1FBQzlGLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDekQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVDLGdFQUFnRTtRQUNoRSxLQUFLLE1BQU0sV0FBVyxJQUFJLENBQUMsR0FBRyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3BFLElBQUksV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNqQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQTtZQUNyRSxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsNEJBQTRCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUN0RixDQUFDO0lBRU8sbUJBQW1CLENBQUMsUUFBYTtRQUN4Qyx3R0FBd0c7UUFDeEcsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlELE1BQU0sZUFBZSxHQUF1QixFQUFFLENBQUE7UUFDOUMseUJBQXlCO1FBQ3pCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNyRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUN4QyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FDdEQsQ0FBQTtnQkFDRCxJQUNDLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxLQUFLLHdCQUF3QixDQUFDLFNBQVMsQ0FBQztvQkFDdEYsbUJBQW1CLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUNqQyxDQUFDO29CQUNGLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzdCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELDhDQUE4QztRQUM5QyxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsNkZBQTZGO1lBQzdGLElBQ0MsY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUMvRSxPQUFPLENBQUMsQ0FBQyxXQUFXLEtBQUssUUFBUTtnQkFDakMsT0FBTyxDQUFDLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFDaEMsQ0FBQztnQkFDRixPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFBO1lBQ25ELENBQUM7WUFDRCxPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLFVBQVUsQ0FBQyxRQUFjO1FBQy9CLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUVsRCxjQUFjO1FBQ2QsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2xELElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEtBQUssd0JBQXdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDdkYsT0FBTyxFQUFFLENBQUE7WUFDVixDQUFDO1lBQ0QsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELE1BQU07UUFDTixPQUFPLFFBQVEsQ0FDZCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQzFELENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUNyQixDQUFBO0lBQ0YsQ0FBQztJQUVEOzs7T0FHRztJQUNLLFNBQVMsQ0FDaEIsUUFBYSxFQUNiLFFBQThEO1FBRTlELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxPQUEwQixFQUFFLFFBQWdCLEVBQUUsRUFBRTtZQUMzRSxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDOUIsSUFBSSxNQUFNLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ3ZFLE9BQU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssUUFBUSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3hGLENBQUM7Z0JBQ0QsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxRQUFRLENBQUE7WUFDekMsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUE7UUFFRCxJQUFJLFFBQVEsSUFBSSxRQUFRLEtBQUssZ0JBQWdCLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDOUQsK0VBQStFO1lBQy9FLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFBO1lBQ2pELE9BQU87Z0JBQ04sTUFBTSxFQUFFLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQztnQkFDdkQsa0JBQWtCLEVBQUUsS0FBSzthQUN6QixDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVsRCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6RSxpR0FBaUc7UUFDakcsTUFBTSxXQUFXLEdBQ2hCLFFBQVEsS0FBSyxnQkFBZ0IsQ0FBQyxjQUFjO1lBQzNDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTO1lBQ3BDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUE7UUFDcEMsSUFBSSxlQUFlLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FDbkMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNWLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxXQUFXLENBQUM7WUFDekUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssMEJBQTBCLENBQUMsRUFBRSxDQUN2RCxDQUFBO1FBQ0QsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE9BQU87Z0JBQ04sTUFBTSxFQUNMLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxJQUFJLFdBQVcsS0FBSyx3QkFBd0IsQ0FBQyxTQUFTO29CQUMvRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztvQkFDbEUsQ0FBQyxDQUFDLFNBQVM7Z0JBQ2Isa0JBQWtCLEVBQUUsS0FBSzthQUN6QixDQUFBO1FBQ0YsQ0FBQztRQUNELG1HQUFtRztRQUNuRyxNQUFNLGdCQUFnQixHQUNyQixlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsS0FBSyx3QkFBd0IsQ0FBQyxTQUFTO1lBQzVFLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbEMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQTtRQUU1RSxJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtRQUU5QixvR0FBb0c7UUFDcEcsZUFBZSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQ3ZDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsS0FBSyx3QkFBd0IsQ0FBQyxTQUFTLENBQzdFLENBQUE7UUFDRCxJQUFJLHVCQUF1QixDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4RSxrQkFBa0IsR0FBRyxJQUFJLENBQUE7UUFDMUIsQ0FBQztRQUVELE9BQU87WUFDTixNQUFNLEVBQUUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDO1lBQ3JELGtCQUFrQjtTQUNsQixDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxlQUFlLENBQzVCLE1BQTJCLEVBQzNCLEtBQW1CLEVBQ25CLGNBQWdDO1FBRWhDLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUE7UUFDNUIsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtZQUMvRCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO1NBQzNDLENBQUMsQ0FBQTtRQUNGLG9EQUFvRDtRQUNwRCxJQUFJLE9BQU8sSUFBSSxPQUFPLE9BQU8sQ0FBQyxVQUFVLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDMUQsT0FBTyxHQUFHO2dCQUNULEdBQUcsT0FBTztnQkFDVixVQUFVLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTO2FBQ3hFLENBQUE7UUFDRixDQUFDO1FBRUQsa0VBQWtFO1FBQ2xFLElBQUksMEJBQTBCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQ2hFLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FDdkYsTUFBTSxFQUNOLEtBQUssQ0FDTCxDQUFBO1lBQ0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixDQUFDLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUN6RixDQUFDO1FBRUQsZ0VBQWdFO1FBQ2hFLElBQUkseUJBQXlCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQy9ELE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FDdEYsTUFBTSxFQUNOLEtBQUssQ0FDTCxDQUFBO1lBQ0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixDQUFDLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUN6RixDQUFDO1FBRUQsMEVBQTBFO1FBQzFFLElBQUksOEJBQThCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLDBCQUEwQixFQUFFLENBQUM7Z0JBQ3BFLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQywwQkFBMEIsQ0FDM0YsTUFBTSxFQUNOLEtBQUssQ0FDTCxDQUFBO1lBQ0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixDQUFDLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUN6RixDQUFDO1FBRUQsSUFBSSwrQkFBK0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQTtRQUN6RSxDQUFDO1FBRUQsSUFBSSw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMseUJBQXlCLEVBQUUsQ0FBQztnQkFDbkUsT0FBTTtZQUNQLENBQUM7WUFDRCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sY0FBYyxDQUFDLG1CQUFtQixDQUFDLHlCQUF5QixDQUMxRixNQUFNLEVBQ04sS0FBSyxDQUNMLENBQUE7WUFDRCxPQUFPLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsT0FBTyxJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQ3pGLENBQUM7UUFFRCxnR0FBZ0c7UUFDaEcsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFBO1FBQ3BFLENBQUM7UUFFRCw4SUFBOEk7UUFDOUksTUFBTSx1QkFBdUIsR0FDNUIsT0FBTyxjQUFjLENBQUMsT0FBTyxFQUFFLGlCQUFpQixLQUFLLFVBQVU7WUFDOUQsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUU7WUFDNUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUE7UUFDN0MsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1lBQzdCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyw4QkFBOEIsQ0FDMUQsUUFBUSxFQUNSLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUM1QixDQUFBO1lBQ0QsSUFBSSxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzVCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDL0UsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFBO2dCQUMzQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTSxDQUFDLGlCQUFpQjtnQkFDekIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsK0ZBQStGO1FBQy9GLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMzRCxPQUFNO1FBQ1AsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixNQUFNLGdCQUFnQixHQUFHLE1BQU0sY0FBYyxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUNsRixNQUFNLEVBQ04sS0FBSyxDQUNMLENBQUE7UUFDRCxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQTtRQUM3QyxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUE7UUFFckMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSyxLQUFLLENBQUMsNkJBQTZCLENBQzFDLDBCQUErRSxFQUMvRSxXQUF5QjtRQUV6QixNQUFNLFdBQVcsR0FBRywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVqRCwrRUFBK0U7UUFDL0UsS0FBSyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLDBCQUEwQixFQUFFLENBQUM7WUFDNUQsSUFBSSxNQUFNLEtBQUssV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNuQyxNQUFNLE1BQU0sR0FBRyxNQUFNLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzlDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDYixPQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELHFEQUFxRDtRQUNyRCxJQUFJLFdBQVcsQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3QyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzNFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUE7SUFDMUIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssOEJBQThCLENBQ3JDLFFBQWEsRUFDYixRQUFnQjtRQUVoQixNQUFNLEdBQUcsR0FBd0QsRUFBRSxDQUFBO1FBQ25FLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFbkUsS0FBSyxNQUFNLEtBQUssSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQyxLQUFLLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUN4RSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7Z0JBQzVCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUVPLEtBQUssQ0FBQywyQkFBMkIsQ0FDeEMsUUFBYSxFQUNiLFVBQWtCLEVBQ2xCLFlBQWlDLEVBQ2pDLGFBQTBCLEVBQzFCLEtBQW1CO1FBS25CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsRCxNQUFNLGFBQWEsR0FBaUIsSUFBSSxDQUFDLEtBQUssQ0FDN0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ3RCLHVCQUFxQixDQUFDLDRCQUE0QixnQ0FFbEQsSUFBSSxDQUNKLENBQ0QsQ0FBQTtRQUNELE1BQU0sZUFBZSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUE7UUFDL0MsZ0dBQWdHO1FBQ2hHLE1BQU0sNEJBQTRCLEdBQUcsR0FBRyxFQUFFO1lBQ3pDLGFBQWEsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDbkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdEYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHVCQUFxQixDQUFDLDRCQUE0QixFQUNsRCxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyw4REFHN0IsQ0FBQTtRQUNGLENBQUMsQ0FBQTtRQUVELHdGQUF3RjtRQUN4RixJQUNDLGFBQWEsQ0FBQyxlQUFlLENBQUM7WUFDOUIsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxLQUFLLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFDckYsQ0FBQztZQUNGLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FDN0MsUUFBUSxDQUFDLE9BQU8sRUFDaEIsUUFBUSxDQUNQLG9DQUFvQyxFQUNwQyxnRUFBZ0UsQ0FDaEUsRUFDRDtZQUNDO2dCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsbUJBQW1CLENBQUM7Z0JBQ3ZFLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDZixrRkFBa0Y7b0JBQ2xGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQzFELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDYixPQUFNO29CQUNQLENBQUM7b0JBQ0QsWUFBWSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7b0JBQzdCLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDdkUsSUFDQyxpQkFBaUIsaUNBQXlCO3dCQUMxQyxpQkFBaUIsZ0NBQXdCLEVBQ3hDLENBQUM7d0JBQ0YsT0FBTTtvQkFDUCxDQUFDO29CQUNELGlEQUFpRDtvQkFDakQsS0FBSyxDQUFDLGNBQWMsQ0FBQzt3QkFDcEI7NEJBQ0MsTUFBTSxFQUFFLGFBQWE7NEJBQ3JCLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNOzRCQUNyQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsT0FBTyxJQUFJLE1BQU07eUJBQzVDO3FCQUNELENBQUMsQ0FBQTtnQkFDSCxDQUFDO2FBQ0Q7WUFDRDtnQkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUM7Z0JBQ3JFLEdBQUcsRUFBRSw0QkFBNEI7YUFDakM7U0FDRCxDQUNELENBQUE7UUFDRCxrRkFBa0Y7UUFDbEYsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDOUMsNEJBQTRCLEVBQUUsQ0FBQTtZQUM5QixlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDMUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sMEJBQTBCLENBQUMsUUFBYSxFQUFFLGlCQUEyQjtRQUM1RSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsOENBQThDO1FBQzlDLElBQUksaUJBQWlCLEdBQ3BCLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVE7WUFDbkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQzlCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsS0FBSyx3QkFBd0IsQ0FBQyxTQUFTLENBQ25FO1lBQ0YsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QyxxQ0FBcUM7UUFDckMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUE7UUFDN0UsOEdBQThHO1FBQzlHLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN2RCxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ1YsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM5RCxPQUFPLENBQUMsQ0FBQTtZQUNULENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3JGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLE1BQU0sZ0JBQWdCLEdBQXlCLEVBQUUsQ0FBQTtRQUNqRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqRixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNoRixNQUFNLDRCQUE0QixHQUFHLFFBQVEsQ0FDNUMsd0NBQXdDLEVBQ3hDLG9CQUFvQixDQUNwQixDQUFBO1FBQ0Qsc0RBQXNEO1FBQ3RELElBQUksZUFBZSxHQUFHLGNBQWMsQ0FBQTtRQUNwQyxJQUNDLENBQUMsZUFBZTtZQUNoQixpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUM1QixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsUUFBUSxLQUFLLHdCQUF3QixDQUFDLE1BQU0sRUFDNUUsQ0FBQztZQUNGLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFBO1FBQ3RELENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsZUFBZSxHQUFHLDBCQUEwQixDQUFDLEVBQUUsQ0FBQTtRQUNoRCxDQUFDO1FBQ0QsdUNBQXVDO1FBQ3ZDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3BDLE1BQU0sZUFBZSxHQUFHLGFBQWEsRUFBRSxRQUFRLElBQUksMEJBQTBCLENBQUMsRUFBRSxDQUFBO1lBQ2hGLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFDakYsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssZUFBZSxDQUFBO1lBQzFELE1BQU0sY0FBYyxHQUFtQjtnQkFDdEMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDeEIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSztnQkFDOUIsV0FBVyxFQUNWLFFBQVEsSUFBSSxTQUFTO29CQUNwQixDQUFDLENBQUMsNEJBQTRCO29CQUM5QixDQUFDLENBQUMsUUFBUTt3QkFDVCxDQUFDLENBQUMsb0JBQW9CO3dCQUN0QixDQUFDLENBQUMsU0FBUzs0QkFDVixDQUFDLENBQUMsbUJBQW1COzRCQUNyQixDQUFDLENBQUMsU0FBUztnQkFDZixNQUFNLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRO2FBQzlELENBQUE7WUFDRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDdEMsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsaUJBQWlCLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3BELE1BQU0sU0FBUyxHQUF3QixFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQTtZQUM1RCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDaEMsTUFBTSxxQkFBcUIsR0FBRztnQkFDN0IsRUFBRSxFQUFFLHVCQUFxQixDQUFDLGtCQUFrQjtnQkFDNUMsS0FBSyxFQUFFLFFBQVEsQ0FDZCxpQ0FBaUMsRUFDakMsdUNBQXVDLEVBQ3ZDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQ3ZCO2FBQ0QsQ0FBQTtZQUNELGdCQUFnQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFDRCxPQUFPLGdCQUFnQixDQUFBO0lBQ3hCLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUN6QixNQUEyQixFQUMzQixpQkFBMkI7UUFRM0IsSUFBSSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRTtZQUM1RCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO1NBQzNDLENBQUMsQ0FBQTtRQUVGLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVCLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCw0REFBNEQ7UUFDNUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBRWhGLDJCQUEyQjtRQUMzQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ25DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQWlCLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQy9FLENBQUE7UUFDRCxNQUFNLGtCQUFrQixHQUFHLGlCQUFpQjtZQUMzQyxDQUFDLENBQUMsUUFBUSxDQUNSLHlDQUF5QyxFQUN6QyxxQ0FBcUMsRUFDckMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FDdkI7WUFDRixDQUFDLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLHlCQUF5QixFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLFlBQVksQ0FBQyxXQUFXLEdBQUcsa0JBQWtCLENBQUE7UUFDN0MsWUFBWSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQTtRQUN6QyxZQUFZLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQTtRQUNoQyxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLENBRTVELENBQUE7UUFDWixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsWUFBWSxDQUFDLGFBQWEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFFRCxzQ0FBc0M7UUFDdEMsTUFBTSxNQUFNLEdBQTJCLE1BQU0sSUFBSSxPQUFPLENBQXlCLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDNUYsV0FBVyxDQUFDLEdBQUcsQ0FDZCxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzlCLElBQUksTUFBTSxHQUEyQixTQUFTLENBQUE7Z0JBRTlDLElBQUksWUFBWSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzdDLE1BQU0sR0FBRzt3QkFDUixJQUFJLEVBQUUsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7d0JBQ25DLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTzt3QkFDN0IsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLFlBQVk7cUJBQ2hDLENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxzRkFBc0Y7Z0JBQ3RGLElBQUksUUFBUSxJQUFJLGlCQUFpQixJQUFJLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3RELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3JFLENBQUM7Z0JBRUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2hCLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxXQUFXLENBQUMsR0FBRyxDQUNkLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO2dCQUMzQixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ3JCLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNuQixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsV0FBVyxDQUFDLEdBQUcsQ0FDZCxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDekMsbUNBQW1DO2dCQUNuQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUVsRCxrQkFBa0I7Z0JBQ2xCLElBQUksUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDaEUsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUE7UUFFRixlQUFlO1FBQ2YsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXRCLDJEQUEyRDtRQUMzRCwrREFBK0Q7UUFDL0QsdUNBQXVDO1FBQ3ZDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixnSEFBZ0g7WUFDaEgsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyx1QkFBcUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUNqRSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7WUFFRCxxQkFBcUI7WUFDckIsTUFBTSxhQUFhLEdBQW1CO2dCQUNyQyxHQUFHLE1BQU0sQ0FBQyxPQUFPO2dCQUNqQixRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN4QixhQUFhLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsYUFBYTthQUN2RSxDQUFBO1lBRUQsT0FBTyxhQUFhLENBQUE7UUFDckIsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxZQUFZO1FBQ25CLHNDQUFzQztRQUN0QyxNQUFNLFlBQVksR0FBZ0IsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUVuRCwrREFBK0Q7UUFDL0QsS0FBSyxNQUFNLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2xFLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUN0QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEtBQUssd0JBQXdCLENBQUMsTUFBTTtnQkFDekQsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssMEJBQTBCLENBQUMsRUFBRSxDQUNsRCxDQUFBO1lBQ0QsdUZBQXVGO1lBQ3ZGLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEIsU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUN6QyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDM0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCxtRkFBbUY7UUFDbkYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUN0RCxLQUFLLE1BQU0sV0FBVyxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDNUMsSUFBSSxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ2pDLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzlDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHVCQUFxQixDQUFDLGNBQWMsRUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLDhEQUd4QyxDQUFBO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQixDQUFDLFFBQWE7UUFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQyxJQUFJLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMvQyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDOztBQTErQlcscUJBQXFCO0lBc0IvQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsV0FBVyxDQUFBO0dBN0JELHFCQUFxQixDQTIrQmpDOztBQUVELGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixrQ0FBMEIsQ0FBQSJ9