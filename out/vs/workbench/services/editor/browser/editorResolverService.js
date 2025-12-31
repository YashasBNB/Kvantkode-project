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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9icm93c2VyL2VkaXRvclJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUVoQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsc0JBQXNCLEVBR3RCLHdCQUF3QixFQUN4QixnQ0FBZ0MsRUFDaEMseUJBQXlCLEVBQ3pCLCtCQUErQixFQUMvQiw2QkFBNkIsRUFDN0IsMEJBQTBCLEVBRTFCLGdCQUFnQixFQUNoQiw4QkFBOEIsR0FDOUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFFTix3QkFBd0IsRUFJeEIsNEJBQTRCLEVBQzVCLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsY0FBYyxHQUlkLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUdOLGtCQUFrQixHQUdsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQVc1RCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7O0lBT3BELFlBQVk7YUFDWSx1QkFBa0IsR0FBRyxpQ0FBaUMsQUFBcEMsQ0FBb0M7YUFDdEQsbUJBQWMsR0FBRyw2QkFBNkIsQUFBaEMsQ0FBZ0M7YUFDOUMsaUNBQTRCLEdBQUcsMkNBQTJDLEFBQTlDLENBQThDO0lBV2xHLFlBQ3VCLGtCQUF5RCxFQUN4RCxvQkFBNEQsRUFDNUQsb0JBQTRELEVBQy9ELGlCQUFzRCxFQUNwRCxtQkFBMEQsRUFDL0QsY0FBZ0QsRUFDOUMsZ0JBQW9ELEVBQzFELFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFBO1FBVGdDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBc0I7UUFDdkMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDbkMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUM5QyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDN0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUN6QyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBMUJ0RCxTQUFTO1FBQ1Esb0NBQStCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixFQUFRLENBQUMsQ0FBQTtRQUN0RixtQ0FBOEIsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsS0FBSyxDQUFBO1FBT3BGLGNBQWM7UUFDTixhQUFRLEdBQXdFLElBQUksR0FBRyxFQUc1RixDQUFBO1FBQ0ssc0JBQWlCLEdBQTJELElBQUksR0FBRyxFQUFFLENBQUE7UUFDckYsNEJBQXVCLEdBQVksSUFBSSxDQUFBO1FBYzlDLDhCQUE4QjtRQUM5QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUNuQixJQUFJLENBQUMsS0FBSyxDQUNULElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUN0Qix1QkFBcUIsQ0FBQyxjQUFjLGdDQUVwQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUNsQixDQUNELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLHVCQUFxQixDQUFDLGNBQWMsK0JBQXVCLENBQUE7UUFFdEYsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUU7WUFDeEMscUpBQXFKO1lBQ3JKLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNwQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsOERBQThEO1FBQzlELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUNsRCxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQTtRQUN2QixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLDJCQUEyQixDQUNsQyxNQUEyQixFQUMzQixjQUEwQztRQUsxQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUE7UUFFNUIseUNBQXlDO1FBQ3pDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQy9ELFNBQVMsRUFDVCxhQUFhLEVBQ2IsY0FBYyxDQUNkLENBQUE7UUFDRCxJQUFJLGVBQWUsWUFBWSxPQUFPLEVBQUUsQ0FBQztZQUN4QyxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDekYsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxHQUFHLGVBQWUsQ0FBQTtZQUMzQyxPQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMxQyxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQ2xCLE1BQTJCLEVBQzNCLGNBQTBDO1FBRTFDLCtCQUErQjtRQUMvQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFFbEQsb0RBQW9EO1FBQ3BELGtEQUFrRDtRQUNsRCx3Q0FBd0M7UUFDeEMsSUFBSSwrQkFBK0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzdDLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsSUFBSSx1QkFFUSxDQUFBO1FBQ1osTUFBTSw2QkFBNkIsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzlGLElBQUksNkJBQTZCLFlBQVksT0FBTyxFQUFFLENBQUM7WUFDdEQsdUJBQXVCLEdBQUcsTUFBTSw2QkFBNkIsQ0FBQTtRQUM5RCxDQUFDO2FBQU0sQ0FBQztZQUNQLHVCQUF1QixHQUFHLDZCQUE2QixDQUFBO1FBQ3hELENBQUM7UUFFRCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUM5QixtQ0FBMEI7UUFDM0IsQ0FBQztRQUNELHlEQUF5RDtRQUN6RCxNQUFNLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsR0FBRyx1QkFBdUIsQ0FBQTtRQUNsRSxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLGFBQWEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHLGFBQWEsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUE7UUFDakUsQ0FBQztRQUVELElBQUksUUFBUSxHQUFHLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUU7WUFDcEUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTztTQUMzQyxDQUFDLENBQUE7UUFFRix3SkFBd0o7UUFDeEosSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNuRSxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFBO1FBQ2hFLENBQUM7UUFFRCx5RUFBeUU7UUFDekUsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUIsUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDbEQsQ0FBQzthQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksUUFBUSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQy9ELG1DQUEwQjtRQUMzQixDQUFDO1FBRUQsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLFFBQVEsS0FBSyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMvRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDckQsZ0VBQWdFO1lBQ2hFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDYixvQ0FBMkI7WUFDNUIsQ0FBQztZQUNELHlDQUF5QztZQUN6QyxhQUFhLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUMvQixDQUFDO1FBRUQsa0lBQWtJO1FBQ2xJLElBQUksRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbEUsUUFBUSxFQUNSLGFBQWEsQ0FBQyxPQUFPLEVBQUUsUUFBZ0UsQ0FDdkYsQ0FBQTtRQUNELG9IQUFvSDtRQUNwSCxJQUFJLENBQUMsY0FBYyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxRQUFRLElBQUksd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzlGLG1DQUEwQjtRQUMzQixDQUFDO2FBQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzVCLDBGQUEwRjtZQUMxRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUM5RSxjQUFjLEdBQUcsY0FBYyxFQUFFLE1BQU0sQ0FBQTtZQUN2QyxrQkFBa0IsR0FBRyxjQUFjLEVBQUUsa0JBQWtCLENBQUE7WUFDdkQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixtQ0FBMEI7WUFDM0IsQ0FBQztRQUNGLENBQUM7UUFFRCwwR0FBMEc7UUFDMUcsSUFBSSx5QkFBeUIsQ0FBQyxhQUFhLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMvRixJQUFJLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFO2dCQUNyRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO2FBQzdDLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDbkQsQ0FBQztZQUNELE1BQU0sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDeEUsSUFBSSxDQUFDLGVBQWUsSUFBSSxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxlQUFlLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN4RixNQUFNLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzFGLFFBQVEsRUFDUiwwQkFBMEIsQ0FBQyxFQUFFLENBQzdCLENBQUE7Z0JBQ0QsY0FBYyxHQUFHLFlBQVksQ0FBQTtnQkFDN0Isa0JBQWtCLEdBQUcsc0JBQXNCLENBQUE7WUFDNUMsQ0FBQztZQUNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDckIsbUNBQTBCO1lBQzNCLENBQUM7UUFDRixDQUFDO1FBRUQsOEZBQThGO1FBQzlGLGFBQWEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFNUYscUVBQXFFO1FBQ3JFLElBQ0MsY0FBYyxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixLQUFLLFNBQVM7WUFDdEUseUJBQXlCLENBQUMsYUFBYSxDQUFDLEVBQ3ZDLENBQUM7WUFDRixtQ0FBMEI7UUFDM0IsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzlFLElBQUksa0JBQWtCLElBQUksS0FBSyxFQUFFLENBQUM7WUFDakMsc0NBQXNDO1lBQ3RDLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUNyQyxRQUFRLEVBQ1IsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQy9CLGFBQWEsRUFDYixLQUFLLENBQUMsTUFBTSxFQUNaLEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzVELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQix1QkFBdUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLFFBQVEsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLHNGQUFzRixDQUN0SyxDQUFBO1lBQ0YsQ0FBQztZQUNELE9BQU8sRUFBRSxHQUFHLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUMzQixDQUFDO1FBQ0Qsb0NBQTJCO0lBQzVCLENBQUM7SUFFTyxLQUFLLENBQUMseUJBQXlCLENBQ3RDLE1BQXNDLEVBQ3RDLGNBQTBDO1FBRTFDLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDdEYsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztZQUM5RCxtQ0FBMEI7UUFDM0IsQ0FBQztRQUNELE1BQU0sdUJBQXVCLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUN2RCxNQUFNLENBQUMsU0FBUyxFQUNoQixxQkFBcUIsQ0FBQyxLQUFLLElBQUksY0FBYyxDQUM3QyxDQUFBO1FBQ0QsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztZQUNoRSxtQ0FBMEI7UUFDM0IsQ0FBQztRQUNELE9BQU87WUFDTixLQUFLLEVBQUUscUJBQXFCLENBQUMsS0FBSyxJQUFJLHVCQUF1QixDQUFDLEtBQUs7WUFDbkUsTUFBTSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQy9DLHFCQUFxQixFQUNyQixNQUFNLENBQUMsS0FBSyxFQUNaLE1BQU0sQ0FBQyxXQUFXLEVBQ2xCLHVCQUF1QixDQUFDLE1BQU0sRUFDOUIscUJBQXFCLENBQUMsTUFBTSxDQUM1QjtZQUNELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztTQUN2QixDQUFBO0lBQ0YsQ0FBQztJQUVELGtCQUFrQixDQUFDLFFBQWtCO1FBQ3BDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLENBQUM7WUFDSixRQUFRLEVBQUUsQ0FBQTtRQUNYLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUM5QyxDQUFDO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FDYixXQUEyQyxFQUMzQyxVQUFnQyxFQUNoQyxPQUFnQyxFQUNoQyxtQkFBNkM7UUFFN0MsSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNyRCxJQUFJLGdCQUFnQixLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUE2QixDQUFBO1lBQ3ZELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFFRCxJQUFJLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZELElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLGFBQWEsR0FBRyxFQUFFLENBQUE7UUFDbkIsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUU7WUFDcEMsV0FBVztZQUNYLFVBQVU7WUFDVixPQUFPO1lBQ1AsbUJBQW1CO1NBQ25CLENBQUMsQ0FBQTtRQUNGLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUE7UUFDbkMsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQzNDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixNQUFNLEVBQUUsQ0FBQTtZQUNSLElBQUksYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pELGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDeEMsQ0FBQztZQUNELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUE7WUFDbkMsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQzVDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELDBCQUEwQixDQUFDLFFBQWE7UUFDdkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDbEQsSUFBSSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUM3QyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQ2YsV0FBVyxDQUFDLGVBQWUsSUFBSSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUMxRixDQUFBO1FBQ0QseUZBQXlGO1FBQ3pGLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FDL0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQzdFLENBQUE7UUFDRCxNQUFNLFVBQVUsR0FBc0IsSUFBSSxDQUFDLGtCQUFrQixDQUFBO1FBQzdELDZDQUE2QztRQUM3QyxPQUFPLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQ2xELFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FDaEUsQ0FBQTtJQUNGLENBQUM7SUFFRCxzQkFBc0I7UUFDckIsTUFBTSwyQkFBMkIsR0FDaEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FDaEMsNEJBQTRCLENBQzVCLElBQUksRUFBRSxDQUFBO1FBQ1IsTUFBTSxtQkFBbUIsR0FBRywyQkFBMkIsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFBO1FBQzFFLE1BQU0scUJBQXFCLEdBQUcsMkJBQTJCLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQTtRQUM5RSxNQUFNLGdCQUFnQixHQUFHLDJCQUEyQixDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUE7UUFDcEUsTUFBTSxlQUFlLEdBQTBDLEVBQUUsR0FBRyxxQkFBcUIsRUFBRSxDQUFBO1FBQzNGLGtJQUFrSTtRQUNsSSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsbUJBQW1CLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUM1RixJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDeEMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQTtRQUN2QixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQzVELE1BQU0sV0FBVyxHQUFzQjtnQkFDdEMsZUFBZSxFQUFFLEdBQUc7Z0JBQ3BCLFFBQVEsRUFBRSxLQUFLO2FBQ2YsQ0FBQTtZQUNELFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUNELE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7SUFFRDs7O09BR0c7SUFDSyxrQkFBa0I7UUFDekIsNkVBQTZFO1FBQzdFLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtRQUM5QixDQUFDO1FBQ0QsSUFBSSxDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQTtRQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBcUQsQ0FBQTtRQUM1RSxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE1BQU0saUJBQWlCLEdBQXNCLEVBQUUsQ0FBQTtZQUMvQyxLQUFLLE1BQU0sT0FBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLGdCQUFnQixHQUFpQyxTQUFTLENBQUE7Z0JBQzlELCtEQUErRDtnQkFDL0QsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQ3ZCLGdCQUFnQixHQUFHOzRCQUNsQixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7NEJBQzdCLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVzs0QkFDL0IsT0FBTyxFQUFFLEVBQUU7NEJBQ1gsbUJBQW1CLEVBQUUsRUFBRTt5QkFDdkIsQ0FBQTtvQkFDRixDQUFDO29CQUNELDhCQUE4QjtvQkFDOUIsZ0JBQWdCLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7b0JBQzdFLGdCQUFnQixDQUFDLG1CQUFtQixHQUFHO3dCQUN0QyxHQUFHLGdCQUFnQixDQUFDLG1CQUFtQjt3QkFDdkMsR0FBRyxNQUFNLENBQUMsbUJBQW1CO3FCQUM3QixDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO29CQUN0QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDekMsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVksa0JBQWtCO1FBQzdCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsc0JBQXNCLENBQUMsV0FBbUIsRUFBRSxRQUFnQjtRQUMzRCxNQUFNLGNBQWMsR0FBc0IsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsQ0FBQTtRQUM5RixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQ3pELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QyxnRUFBZ0U7UUFDaEUsS0FBSyxNQUFNLFdBQVcsSUFBSSxDQUFDLEdBQUcsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNwRSxJQUFJLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDakMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUE7WUFDckUsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLDRCQUE0QixFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDdEYsQ0FBQztJQUVPLG1CQUFtQixDQUFDLFFBQWE7UUFDeEMsd0dBQXdHO1FBQ3hHLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5RCxNQUFNLGVBQWUsR0FBdUIsRUFBRSxDQUFBO1FBQzlDLHlCQUF5QjtRQUN6QixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDckQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FDeEMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ3RELENBQUE7Z0JBQ0QsSUFDQyxDQUFDLGVBQWUsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsS0FBSyx3QkFBd0IsQ0FBQyxTQUFTLENBQUM7b0JBQ3RGLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsRUFDakMsQ0FBQztvQkFDRixlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM3QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCw4Q0FBOEM7UUFDOUMsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BDLDZGQUE2RjtZQUM3RixJQUNDLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztnQkFDL0UsT0FBTyxDQUFDLENBQUMsV0FBVyxLQUFLLFFBQVE7Z0JBQ2pDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQ2hDLENBQUM7Z0JBQ0YsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQTtZQUNuRCxDQUFDO1lBQ0QsT0FBTyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxVQUFVLENBQUMsUUFBYztRQUMvQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFFbEQsY0FBYztRQUNkLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNsRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxLQUFLLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZGLE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztZQUNELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxNQUFNO1FBQ04sT0FBTyxRQUFRLENBQ2QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUMxRCxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FDckIsQ0FBQTtJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSyxTQUFTLENBQ2hCLFFBQWEsRUFDYixRQUE4RDtRQUU5RCxNQUFNLGtCQUFrQixHQUFHLENBQUMsT0FBMEIsRUFBRSxRQUFnQixFQUFFLEVBQUU7WUFDM0UsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzlCLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGtCQUFrQixLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUN2RSxPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUN4RixDQUFDO2dCQUNELE9BQU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFBO1lBQ3pDLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFBO1FBRUQsSUFBSSxRQUFRLElBQUksUUFBUSxLQUFLLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzlELCtFQUErRTtZQUMvRSxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQTtZQUNqRCxPQUFPO2dCQUNOLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQUM7Z0JBQ3ZELGtCQUFrQixFQUFFLEtBQUs7YUFDekIsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFbEQsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDekUsaUdBQWlHO1FBQ2pHLE1BQU0sV0FBVyxHQUNoQixRQUFRLEtBQUssZ0JBQWdCLENBQUMsY0FBYztZQUMzQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsU0FBUztZQUNwQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFBO1FBQ3BDLElBQUksZUFBZSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQ25DLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDVixjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxjQUFjLENBQUMsV0FBVyxDQUFDO1lBQ3pFLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLDBCQUEwQixDQUFDLEVBQUUsQ0FDdkQsQ0FBQTtRQUNELElBQUksZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPO2dCQUNOLE1BQU0sRUFDTCx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFXLEtBQUssd0JBQXdCLENBQUMsU0FBUztvQkFDL0UsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7b0JBQ2xFLENBQUMsQ0FBQyxTQUFTO2dCQUNiLGtCQUFrQixFQUFFLEtBQUs7YUFDekIsQ0FBQTtRQUNGLENBQUM7UUFDRCxtR0FBbUc7UUFDbkcsTUFBTSxnQkFBZ0IsR0FDckIsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEtBQUssd0JBQXdCLENBQUMsU0FBUztZQUM1RSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2xDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUE7UUFFNUUsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUE7UUFFOUIsb0dBQW9HO1FBQ3BHLGVBQWUsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUN2QyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEtBQUssd0JBQXdCLENBQUMsU0FBUyxDQUM3RSxDQUFBO1FBQ0QsSUFBSSx1QkFBdUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDeEUsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1FBQzFCLENBQUM7UUFFRCxPQUFPO1lBQ04sTUFBTSxFQUFFLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQztZQUNyRCxrQkFBa0I7U0FDbEIsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsZUFBZSxDQUM1QixNQUEyQixFQUMzQixLQUFtQixFQUNuQixjQUFnQztRQUVoQyxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFBO1FBQzVCLE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDL0QsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTztTQUMzQyxDQUFDLENBQUE7UUFDRixvREFBb0Q7UUFDcEQsSUFBSSxPQUFPLElBQUksT0FBTyxPQUFPLENBQUMsVUFBVSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzFELE9BQU8sR0FBRztnQkFDVCxHQUFHLE9BQU87Z0JBQ1YsVUFBVSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUzthQUN4RSxDQUFBO1FBQ0YsQ0FBQztRQUVELGtFQUFrRTtRQUNsRSxJQUFJLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUNoRSxPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxjQUFjLENBQUMsbUJBQW1CLENBQUMsc0JBQXNCLENBQ3ZGLE1BQU0sRUFDTixLQUFLLENBQ0wsQ0FBQTtZQUNELE9BQU8sRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPLElBQUksT0FBTyxFQUFFLENBQUE7UUFDekYsQ0FBQztRQUVELGdFQUFnRTtRQUNoRSxJQUFJLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO2dCQUMvRCxPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxjQUFjLENBQUMsbUJBQW1CLENBQUMscUJBQXFCLENBQ3RGLE1BQU0sRUFDTixLQUFLLENBQ0wsQ0FBQTtZQUNELE9BQU8sRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPLElBQUksT0FBTyxFQUFFLENBQUE7UUFDekYsQ0FBQztRQUVELDBFQUEwRTtRQUMxRSxJQUFJLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO2dCQUNwRSxPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxjQUFjLENBQUMsbUJBQW1CLENBQUMsMEJBQTBCLENBQzNGLE1BQU0sRUFDTixLQUFLLENBQ0wsQ0FBQTtZQUNELE9BQU8sRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPLElBQUksT0FBTyxFQUFFLENBQUE7UUFDekYsQ0FBQztRQUVELElBQUksK0JBQStCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUE7UUFDekUsQ0FBQztRQUVELElBQUksNkJBQTZCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLHlCQUF5QixFQUFFLENBQUM7Z0JBQ25FLE9BQU07WUFDUCxDQUFDO1lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyx5QkFBeUIsQ0FDMUYsTUFBTSxFQUNOLEtBQUssQ0FDTCxDQUFBO1lBQ0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixDQUFDLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUN6RixDQUFDO1FBRUQsZ0dBQWdHO1FBQ2hHLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0RBQWtELENBQUMsQ0FBQTtRQUNwRSxDQUFDO1FBRUQsOElBQThJO1FBQzlJLE1BQU0sdUJBQXVCLEdBQzVCLE9BQU8sY0FBYyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsS0FBSyxVQUFVO1lBQzlELENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFO1lBQzVDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFBO1FBQzdDLElBQUksdUJBQXVCLEVBQUUsQ0FBQztZQUM3QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQzFELFFBQVEsRUFDUixjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FDNUIsQ0FBQTtZQUNELElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM1QixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQy9FLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQTtnQkFDM0IsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU0sQ0FBQyxpQkFBaUI7Z0JBQ3pCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELCtGQUErRjtRQUMvRixJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDM0QsT0FBTTtRQUNQLENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FDbEYsTUFBTSxFQUNOLEtBQUssQ0FDTCxDQUFBO1FBQ0QsT0FBTyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUE7UUFDN0MsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFBO1FBRXJDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ssS0FBSyxDQUFDLDZCQUE2QixDQUMxQywwQkFBK0UsRUFDL0UsV0FBeUI7UUFFekIsTUFBTSxXQUFXLEdBQUcsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakQsK0VBQStFO1FBQy9FLEtBQUssTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1lBQzVELElBQUksTUFBTSxLQUFLLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM5QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2IsT0FBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxxREFBcUQ7UUFDckQsSUFBSSxXQUFXLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0MsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUMzRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFBO0lBQzFCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLDhCQUE4QixDQUNyQyxRQUFhLEVBQ2IsUUFBZ0I7UUFFaEIsTUFBTSxHQUFHLEdBQXdELEVBQUUsQ0FBQTtRQUNuRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRW5FLEtBQUssTUFBTSxLQUFLLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkMsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDeEUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFTyxLQUFLLENBQUMsMkJBQTJCLENBQ3hDLFFBQWEsRUFDYixVQUFrQixFQUNsQixZQUFpQyxFQUNqQyxhQUEwQixFQUMxQixLQUFtQjtRQUtuQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbEQsTUFBTSxhQUFhLEdBQWlCLElBQUksQ0FBQyxLQUFLLENBQzdDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUN0Qix1QkFBcUIsQ0FBQyw0QkFBNEIsZ0NBRWxELElBQUksQ0FDSixDQUNELENBQUE7UUFDRCxNQUFNLGVBQWUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFBO1FBQy9DLGdHQUFnRztRQUNoRyxNQUFNLDRCQUE0QixHQUFHLEdBQUcsRUFBRTtZQUN6QyxhQUFhLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ25DLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3RGLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4Qix1QkFBcUIsQ0FBQyw0QkFBNEIsRUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsOERBRzdCLENBQUE7UUFDRixDQUFDLENBQUE7UUFFRCx3RkFBd0Y7UUFDeEYsSUFDQyxhQUFhLENBQUMsZUFBZSxDQUFDO1lBQzlCLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsS0FBSyxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3JGLENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQzdDLFFBQVEsQ0FBQyxPQUFPLEVBQ2hCLFFBQVEsQ0FDUCxvQ0FBb0MsRUFDcEMsZ0VBQWdFLENBQ2hFLEVBQ0Q7WUFDQztnQkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLG1CQUFtQixDQUFDO2dCQUN2RSxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2Ysa0ZBQWtGO29CQUNsRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO29CQUMxRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ2IsT0FBTTtvQkFDUCxDQUFDO29CQUNELFlBQVksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO29CQUM3QixNQUFNLGlCQUFpQixHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBQ3ZFLElBQ0MsaUJBQWlCLGlDQUF5Qjt3QkFDMUMsaUJBQWlCLGdDQUF3QixFQUN4QyxDQUFDO3dCQUNGLE9BQU07b0JBQ1AsQ0FBQztvQkFDRCxpREFBaUQ7b0JBQ2pELEtBQUssQ0FBQyxjQUFjLENBQUM7d0JBQ3BCOzRCQUNDLE1BQU0sRUFBRSxhQUFhOzRCQUNyQixXQUFXLEVBQUUsaUJBQWlCLENBQUMsTUFBTTs0QkFDckMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLE9BQU8sSUFBSSxNQUFNO3lCQUM1QztxQkFDRCxDQUFDLENBQUE7Z0JBQ0gsQ0FBQzthQUNEO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDO2dCQUNyRSxHQUFHLEVBQUUsNEJBQTRCO2FBQ2pDO1NBQ0QsQ0FDRCxDQUFBO1FBQ0Qsa0ZBQWtGO1FBQ2xGLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzlDLDRCQUE0QixFQUFFLENBQUE7WUFDOUIsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzFCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLDBCQUEwQixDQUFDLFFBQWEsRUFBRSxpQkFBMkI7UUFDNUUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLDhDQUE4QztRQUM5QyxJQUFJLGlCQUFpQixHQUNwQixRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRO1lBQ25DLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUM5QixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEtBQUssd0JBQXdCLENBQUMsU0FBUyxDQUNuRTtZQUNGLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEMscUNBQXFDO1FBQ3JDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFBO1FBQzdFLDhHQUE4RztRQUM5RyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSywwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkQsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUNWLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSywwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDOUQsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNyRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixNQUFNLGdCQUFnQixHQUF5QixFQUFFLENBQUE7UUFDakQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDakYsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsK0JBQStCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDaEYsTUFBTSw0QkFBNEIsR0FBRyxRQUFRLENBQzVDLHdDQUF3QyxFQUN4QyxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELHNEQUFzRDtRQUN0RCxJQUFJLGVBQWUsR0FBRyxjQUFjLENBQUE7UUFDcEMsSUFDQyxDQUFDLGVBQWU7WUFDaEIsaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDNUIsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFFBQVEsS0FBSyx3QkFBd0IsQ0FBQyxNQUFNLEVBQzVFLENBQUM7WUFDRixlQUFlLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQTtRQUN0RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLGVBQWUsR0FBRywwQkFBMEIsQ0FBQyxFQUFFLENBQUE7UUFDaEQsQ0FBQztRQUNELHVDQUF1QztRQUN2QyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNwQyxNQUFNLGVBQWUsR0FBRyxhQUFhLEVBQUUsUUFBUSxJQUFJLDBCQUEwQixDQUFDLEVBQUUsQ0FBQTtZQUNoRixNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1lBQ2pGLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLGVBQWUsQ0FBQTtZQUMxRCxNQUFNLGNBQWMsR0FBbUI7Z0JBQ3RDLEVBQUUsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ3hCLEtBQUssRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUs7Z0JBQzlCLFdBQVcsRUFDVixRQUFRLElBQUksU0FBUztvQkFDcEIsQ0FBQyxDQUFDLDRCQUE0QjtvQkFDOUIsQ0FBQyxDQUFDLFFBQVE7d0JBQ1QsQ0FBQyxDQUFDLG9CQUFvQjt3QkFDdEIsQ0FBQyxDQUFDLFNBQVM7NEJBQ1YsQ0FBQyxDQUFDLG1CQUFtQjs0QkFDckIsQ0FBQyxDQUFDLFNBQVM7Z0JBQ2YsTUFBTSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUTthQUM5RCxDQUFBO1lBQ0QsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3RDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGlCQUFpQixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLFNBQVMsR0FBd0IsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUE7WUFDNUQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2hDLE1BQU0scUJBQXFCLEdBQUc7Z0JBQzdCLEVBQUUsRUFBRSx1QkFBcUIsQ0FBQyxrQkFBa0I7Z0JBQzVDLEtBQUssRUFBRSxRQUFRLENBQ2QsaUNBQWlDLEVBQ2pDLHVDQUF1QyxFQUN2QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUN2QjthQUNELENBQUE7WUFDRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBQ0QsT0FBTyxnQkFBZ0IsQ0FBQTtJQUN4QixDQUFDO0lBRU8sS0FBSyxDQUFDLFlBQVksQ0FDekIsTUFBMkIsRUFDM0IsaUJBQTJCO1FBUTNCLElBQUksUUFBUSxHQUFHLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDNUQsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTztTQUMzQyxDQUFDLENBQUE7UUFFRixJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBRUQsNERBQTREO1FBQzVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUVoRiwyQkFBMkI7UUFDM0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNuQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFpQixFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUMvRSxDQUFBO1FBQ0QsTUFBTSxrQkFBa0IsR0FBRyxpQkFBaUI7WUFDM0MsQ0FBQyxDQUFDLFFBQVEsQ0FDUix5Q0FBeUMsRUFDekMscUNBQXFDLEVBQ3JDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQ3ZCO1lBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSx5QkFBeUIsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUN4RixZQUFZLENBQUMsV0FBVyxHQUFHLGtCQUFrQixDQUFBO1FBQzdDLFlBQVksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUE7UUFDekMsWUFBWSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUE7UUFDaEMsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUU1RCxDQUFBO1FBQ1osSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLFlBQVksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sTUFBTSxHQUEyQixNQUFNLElBQUksT0FBTyxDQUF5QixDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzVGLFdBQVcsQ0FBQyxHQUFHLENBQ2QsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUM5QixJQUFJLE1BQU0sR0FBMkIsU0FBUyxDQUFBO2dCQUU5QyxJQUFJLFlBQVksQ0FBQyxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM3QyxNQUFNLEdBQUc7d0JBQ1IsSUFBSSxFQUFFLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dCQUNuQyxPQUFPLEVBQUUsWUFBWSxDQUFDLE9BQU87d0JBQzdCLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxZQUFZO3FCQUNoQyxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsc0ZBQXNGO2dCQUN0RixJQUFJLFFBQVEsSUFBSSxpQkFBaUIsSUFBSSxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUN0RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNyRSxDQUFDO2dCQUVELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoQixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsV0FBVyxDQUFDLEdBQUcsQ0FDZCxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtnQkFDM0IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNyQixPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELFdBQVcsQ0FBQyxHQUFHLENBQ2QsWUFBWSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pDLG1DQUFtQztnQkFDbkMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtnQkFFbEQsa0JBQWtCO2dCQUNsQixJQUFJLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ2hFLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBRUYsZUFBZTtRQUNmLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUV0QiwyREFBMkQ7UUFDM0QsK0RBQStEO1FBQy9ELHVDQUF1QztRQUN2QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osZ0hBQWdIO1lBQ2hILElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssdUJBQXFCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDakUsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1lBRUQscUJBQXFCO1lBQ3JCLE1BQU0sYUFBYSxHQUFtQjtnQkFDckMsR0FBRyxNQUFNLENBQUMsT0FBTztnQkFDakIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDeEIsYUFBYSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLGFBQWE7YUFDdkUsQ0FBQTtZQUVELE9BQU8sYUFBYSxDQUFBO1FBQ3JCLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8sWUFBWTtRQUNuQixzQ0FBc0M7UUFDdEMsTUFBTSxZQUFZLEdBQWdCLElBQUksR0FBRyxFQUFVLENBQUE7UUFFbkQsK0RBQStEO1FBQy9ELEtBQUssTUFBTSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNsRSxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FDdEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxLQUFLLHdCQUF3QixDQUFDLE1BQU07Z0JBQ3pELENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLDBCQUEwQixDQUFDLEVBQUUsQ0FDbEQsQ0FBQTtZQUNELHVGQUF1RjtZQUN2RixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2xCLFNBQVE7WUFDVCxDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQzNDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBRUQsbUZBQW1GO1FBQ25GLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDdEQsS0FBSyxNQUFNLFdBQVcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVDLElBQUksV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNqQyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4Qix1QkFBcUIsQ0FBQyxjQUFjLEVBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyw4REFHeEMsQ0FBQTtJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxRQUFhO1FBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDckMsSUFBSSxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDL0MsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQzs7QUExK0JXLHFCQUFxQjtJQXNCL0IsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFdBQVcsQ0FBQTtHQTdCRCxxQkFBcUIsQ0EyK0JqQzs7QUFFRCxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsa0NBQTBCLENBQUEifQ==