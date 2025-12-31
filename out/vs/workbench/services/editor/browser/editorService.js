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
var EditorService_1;
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SideBySideEditor, isEditorInputWithOptions, EditorResourceAccessor, isResourceDiffEditorInput, isResourceEditorInput, isEditorInput, isEditorInputWithOptionsAndGroup, isResourceMergeEditorInput, } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { ResourceMap, ResourceSet } from '../../../../base/common/map.js';
import { IFileService, FileChangesEvent, } from '../../../../platform/files/common/files.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { SideBySideEditor as SideBySideEditorPane } from '../../../browser/parts/editor/sideBySideEditor.js';
import { IEditorGroupsService, isEditorReplacement, } from '../common/editorGroupsService.js';
import { IEditorService, isPreferredGroup, } from '../common/editorService.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { Disposable, dispose, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { coalesce, distinct } from '../../../../base/common/arrays.js';
import { isCodeEditor, isDiffEditor, isCompositeEditor, } from '../../../../editor/browser/editorBrowser.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { isUndefined } from '../../../../base/common/types.js';
import { EditorsObserver } from '../../../browser/parts/editor/editorsObserver.js';
import { Promises, timeout } from '../../../../base/common/async.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { indexOfPath } from '../../../../base/common/extpath.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IEditorResolverService } from '../common/editorResolverService.js';
import { IWorkspaceTrustRequestService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IHostService } from '../../host/browser/host.js';
import { findGroup } from '../common/editorGroupFinder.js';
import { ITextEditorService } from '../../textfile/common/textEditorService.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
let EditorService = EditorService_1 = class EditorService extends Disposable {
    constructor(editorGroupsContainer, editorGroupService, instantiationService, fileService, configurationService, contextService, uriIdentityService, editorResolverService, workspaceTrustRequestService, hostService, textEditorService) {
        super();
        this.editorGroupService = editorGroupService;
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this.editorResolverService = editorResolverService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.hostService = hostService;
        this.textEditorService = textEditorService;
        //#region events
        this._onDidActiveEditorChange = this._register(new Emitter());
        this.onDidActiveEditorChange = this._onDidActiveEditorChange.event;
        this._onDidVisibleEditorsChange = this._register(new Emitter());
        this.onDidVisibleEditorsChange = this._onDidVisibleEditorsChange.event;
        this._onDidEditorsChange = this._register(new Emitter());
        this.onDidEditorsChange = this._onDidEditorsChange.event;
        this._onWillOpenEditor = this._register(new Emitter());
        this.onWillOpenEditor = this._onWillOpenEditor.event;
        this._onDidCloseEditor = this._register(new Emitter());
        this.onDidCloseEditor = this._onDidCloseEditor.event;
        this._onDidOpenEditorFail = this._register(new Emitter());
        this.onDidOpenEditorFail = this._onDidOpenEditorFail.event;
        this._onDidMostRecentlyActiveEditorsChange = this._register(new Emitter());
        this.onDidMostRecentlyActiveEditorsChange = this._onDidMostRecentlyActiveEditorsChange.event;
        //#region Editor & group event handlers
        this.lastActiveEditor = undefined;
        //#endregion
        //#region Visible Editors Change: Install file watchers for out of workspace resources that became visible
        this.activeOutOfWorkspaceWatchers = new ResourceMap();
        this.closeOnFileDelete = false;
        this.editorGroupsContainer = editorGroupsContainer ?? editorGroupService;
        this.editorsObserver = this._register(this.instantiationService.createInstance(EditorsObserver, this.editorGroupsContainer));
        this.onConfigurationUpdated();
        this.registerListeners();
    }
    createScoped(editorGroupsContainer, disposables) {
        return disposables.add(new EditorService_1(editorGroupsContainer === 'main' ? this.editorGroupService.mainPart : editorGroupsContainer, this.editorGroupService, this.instantiationService, this.fileService, this.configurationService, this.contextService, this.uriIdentityService, this.editorResolverService, this.workspaceTrustRequestService, this.hostService, this.textEditorService));
    }
    registerListeners() {
        // Editor & group changes
        if (this.editorGroupsContainer === this.editorGroupService.mainPart ||
            this.editorGroupsContainer === this.editorGroupService) {
            this.editorGroupService.whenReady.then(() => this.onEditorGroupsReady());
        }
        else {
            this.onEditorGroupsReady();
        }
        this._register(this.editorGroupsContainer.onDidChangeActiveGroup((group) => this.handleActiveEditorChange(group)));
        this._register(this.editorGroupsContainer.onDidAddGroup((group) => this.registerGroupListeners(group)));
        this._register(this.editorsObserver.onDidMostRecentlyActiveEditorsChange(() => this._onDidMostRecentlyActiveEditorsChange.fire()));
        // Out of workspace file watchers
        this._register(this.onDidVisibleEditorsChange(() => this.handleVisibleEditorsChange()));
        // File changes & operations
        // Note: there is some duplication with the two file event handlers- Since we cannot always rely on the disk events
        // carrying all necessary data in all environments, we also use the file operation events to make sure operations are handled.
        // In any case there is no guarantee if the local event is fired first or the disk one. Thus, code must handle the case
        // that the event ordering is random as well as might not carry all information needed.
        this._register(this.fileService.onDidRunOperation((e) => this.onDidRunFileOperation(e)));
        this._register(this.fileService.onDidFilesChange((e) => this.onDidFilesChange(e)));
        // Configuration
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
    }
    onEditorGroupsReady() {
        // Register listeners to each opened group
        for (const group of this.editorGroupsContainer.groups) {
            this.registerGroupListeners(group);
        }
        // Fire initial set of editor events if there is an active editor
        if (this.activeEditor) {
            this.doHandleActiveEditorChangeEvent();
            this._onDidVisibleEditorsChange.fire();
        }
    }
    handleActiveEditorChange(group) {
        if (group !== this.editorGroupsContainer.activeGroup) {
            return; // ignore if not the active group
        }
        if (!this.lastActiveEditor && !group.activeEditor) {
            return; // ignore if we still have no active editor
        }
        this.doHandleActiveEditorChangeEvent();
    }
    doHandleActiveEditorChangeEvent() {
        // Remember as last active
        const activeGroup = this.editorGroupsContainer.activeGroup;
        this.lastActiveEditor = activeGroup.activeEditor ?? undefined;
        // Fire event to outside parties
        this._onDidActiveEditorChange.fire();
    }
    registerGroupListeners(group) {
        const groupDisposables = new DisposableStore();
        groupDisposables.add(group.onDidModelChange((e) => {
            this._onDidEditorsChange.fire({ groupId: group.id, event: e });
        }));
        groupDisposables.add(group.onDidActiveEditorChange(() => {
            this.handleActiveEditorChange(group);
            this._onDidVisibleEditorsChange.fire();
        }));
        groupDisposables.add(group.onWillOpenEditor((e) => {
            this._onWillOpenEditor.fire(e);
        }));
        groupDisposables.add(group.onDidCloseEditor((e) => {
            this._onDidCloseEditor.fire(e);
        }));
        groupDisposables.add(group.onDidOpenEditorFail((editor) => {
            this._onDidOpenEditorFail.fire({ editor, groupId: group.id });
        }));
        Event.once(group.onWillDispose)(() => {
            dispose(groupDisposables);
        });
    }
    handleVisibleEditorsChange() {
        const visibleOutOfWorkspaceResources = new ResourceSet();
        for (const editor of this.visibleEditors) {
            const resources = distinct(coalesce([
                EditorResourceAccessor.getCanonicalUri(editor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                }),
                EditorResourceAccessor.getCanonicalUri(editor, {
                    supportSideBySide: SideBySideEditor.SECONDARY,
                }),
            ]), (resource) => resource.toString());
            for (const resource of resources) {
                if (this.fileService.hasProvider(resource) &&
                    !this.contextService.isInsideWorkspace(resource)) {
                    visibleOutOfWorkspaceResources.add(resource);
                }
            }
        }
        // Handle no longer visible out of workspace resources
        for (const resource of this.activeOutOfWorkspaceWatchers.keys()) {
            if (!visibleOutOfWorkspaceResources.has(resource)) {
                dispose(this.activeOutOfWorkspaceWatchers.get(resource));
                this.activeOutOfWorkspaceWatchers.delete(resource);
            }
        }
        // Handle newly visible out of workspace resources
        for (const resource of visibleOutOfWorkspaceResources.keys()) {
            if (!this.activeOutOfWorkspaceWatchers.get(resource)) {
                const disposable = this.fileService.watch(resource);
                this.activeOutOfWorkspaceWatchers.set(resource, disposable);
            }
        }
    }
    //#endregion
    //#region File Changes: Move & Deletes to move or close opend editors
    async onDidRunFileOperation(e) {
        // Handle moves specially when file is opened
        if (e.isOperation(2 /* FileOperation.MOVE */)) {
            this.handleMovedFile(e.resource, e.target.resource);
        }
        // Handle deletes
        if (e.isOperation(1 /* FileOperation.DELETE */) || e.isOperation(2 /* FileOperation.MOVE */)) {
            this.handleDeletedFile(e.resource, false, e.target ? e.target.resource : undefined);
        }
    }
    onDidFilesChange(e) {
        if (e.gotDeleted()) {
            this.handleDeletedFile(e, true);
        }
    }
    async handleMovedFile(source, target) {
        for (const group of this.editorGroupsContainer.groups) {
            const replacements = [];
            for (const editor of group.editors) {
                const resource = editor.resource;
                if (!resource || !this.uriIdentityService.extUri.isEqualOrParent(resource, source)) {
                    continue; // not matching our resource
                }
                // Determine new resulting target resource
                let targetResource;
                if (this.uriIdentityService.extUri.isEqual(source, resource)) {
                    targetResource = target; // file got moved
                }
                else {
                    const index = indexOfPath(resource.path, source.path, this.uriIdentityService.extUri.ignorePathCasing(resource));
                    targetResource = joinPath(target, resource.path.substr(index + source.path.length + 1)); // parent folder got moved
                }
                // Delegate rename() to editor instance
                const moveResult = await editor.rename(group.id, targetResource);
                if (!moveResult) {
                    return; // not target - ignore
                }
                const optionOverrides = {
                    preserveFocus: true,
                    pinned: group.isPinned(editor),
                    sticky: group.isSticky(editor),
                    index: group.getIndexOfEditor(editor),
                    inactive: !group.isActive(editor),
                };
                // Construct a replacement with our extra options mixed in
                if (isEditorInput(moveResult.editor)) {
                    replacements.push({
                        editor,
                        replacement: moveResult.editor,
                        options: {
                            ...moveResult.options,
                            ...optionOverrides,
                        },
                    });
                }
                else {
                    replacements.push({
                        editor,
                        replacement: {
                            ...moveResult.editor,
                            options: {
                                ...moveResult.editor.options,
                                ...optionOverrides,
                            },
                        },
                    });
                }
            }
            // Apply replacements
            if (replacements.length) {
                this.replaceEditors(replacements, group);
            }
        }
    }
    onConfigurationUpdated(e) {
        if (e && !e.affectsConfiguration('workbench.editor.closeOnFileDelete')) {
            return;
        }
        const configuration = this.configurationService.getValue();
        if (typeof configuration.workbench?.editor?.closeOnFileDelete === 'boolean') {
            this.closeOnFileDelete = configuration.workbench.editor.closeOnFileDelete;
        }
        else {
            this.closeOnFileDelete = false; // default
        }
    }
    handleDeletedFile(arg1, isExternal, movedTo) {
        for (const editor of this.getAllNonDirtyEditors({
            includeUntitled: false,
            supportSideBySide: true,
        })) {
            ;
            (async () => {
                const resource = editor.resource;
                if (!resource) {
                    return;
                }
                // Handle deletes in opened editors depending on:
                // - we close any editor when `closeOnFileDelete: true`
                // - we close any editor when the delete occurred from within VSCode
                if (this.closeOnFileDelete || !isExternal) {
                    // Do NOT close any opened editor that matches the resource path (either equal or being parent) of the
                    // resource we move to (movedTo). Otherwise we would close a resource that has been renamed to the same
                    // path but different casing.
                    if (movedTo && this.uriIdentityService.extUri.isEqualOrParent(resource, movedTo)) {
                        return;
                    }
                    let matches = false;
                    if (arg1 instanceof FileChangesEvent) {
                        matches = arg1.contains(resource, 2 /* FileChangeType.DELETED */);
                    }
                    else {
                        matches = this.uriIdentityService.extUri.isEqualOrParent(resource, arg1);
                    }
                    if (!matches) {
                        return;
                    }
                    // We have received reports of users seeing delete events even though the file still
                    // exists (network shares issue: https://github.com/microsoft/vscode/issues/13665).
                    // Since we do not want to close an editor without reason, we have to check if the
                    // file is really gone and not just a faulty file event.
                    // This only applies to external file events, so we need to check for the isExternal
                    // flag.
                    let exists = false;
                    if (isExternal && this.fileService.hasProvider(resource)) {
                        await timeout(100);
                        exists = await this.fileService.exists(resource);
                    }
                    if (!exists && !editor.isDisposed()) {
                        editor.dispose();
                    }
                }
            })();
        }
    }
    getAllNonDirtyEditors(options) {
        const editors = [];
        function conditionallyAddEditor(editor) {
            if (editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) && !options.includeUntitled) {
                return;
            }
            if (editor.isDirty()) {
                return;
            }
            editors.push(editor);
        }
        for (const editor of this.editors) {
            if (options.supportSideBySide && editor instanceof SideBySideEditorInput) {
                conditionallyAddEditor(editor.primary);
                conditionallyAddEditor(editor.secondary);
            }
            else {
                conditionallyAddEditor(editor);
            }
        }
        return editors;
    }
    get activeEditorPane() {
        return this.editorGroupsContainer.activeGroup?.activeEditorPane;
    }
    get activeTextEditorControl() {
        const activeEditorPane = this.activeEditorPane;
        if (activeEditorPane) {
            const activeControl = activeEditorPane.getControl();
            if (isCodeEditor(activeControl) || isDiffEditor(activeControl)) {
                return activeControl;
            }
            if (isCompositeEditor(activeControl) && isCodeEditor(activeControl.activeCodeEditor)) {
                return activeControl.activeCodeEditor;
            }
        }
        return undefined;
    }
    get activeTextEditorLanguageId() {
        let activeCodeEditor = undefined;
        const activeTextEditorControl = this.activeTextEditorControl;
        if (isDiffEditor(activeTextEditorControl)) {
            activeCodeEditor = activeTextEditorControl.getModifiedEditor();
        }
        else {
            activeCodeEditor = activeTextEditorControl;
        }
        return activeCodeEditor?.getModel()?.getLanguageId();
    }
    get count() {
        return this.editorsObserver.count;
    }
    get editors() {
        return this.getEditors(1 /* EditorsOrder.SEQUENTIAL */).map(({ editor }) => editor);
    }
    getEditors(order, options) {
        switch (order) {
            // MRU
            case 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */:
                if (options?.excludeSticky) {
                    return this.editorsObserver.editors.filter(({ groupId, editor }) => !this.editorGroupsContainer.getGroup(groupId)?.isSticky(editor));
                }
                return this.editorsObserver.editors;
            // Sequential
            case 1 /* EditorsOrder.SEQUENTIAL */: {
                const editors = [];
                for (const group of this.editorGroupsContainer.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)) {
                    editors.push(...group
                        .getEditors(1 /* EditorsOrder.SEQUENTIAL */, options)
                        .map((editor) => ({ editor, groupId: group.id })));
                }
                return editors;
            }
        }
    }
    get activeEditor() {
        const activeGroup = this.editorGroupsContainer.activeGroup;
        return activeGroup ? (activeGroup.activeEditor ?? undefined) : undefined;
    }
    get visibleEditorPanes() {
        return coalesce(this.editorGroupsContainer.groups.map((group) => group.activeEditorPane));
    }
    get visibleTextEditorControls() {
        return this.doGetVisibleTextEditorControls(this.visibleEditorPanes);
    }
    doGetVisibleTextEditorControls(editorPanes) {
        const visibleTextEditorControls = [];
        for (const editorPane of editorPanes) {
            const controls = [];
            if (editorPane instanceof SideBySideEditorPane) {
                controls.push(editorPane.getPrimaryEditorPane()?.getControl());
                controls.push(editorPane.getSecondaryEditorPane()?.getControl());
            }
            else {
                controls.push(editorPane.getControl());
            }
            for (const control of controls) {
                if (isCodeEditor(control) || isDiffEditor(control)) {
                    visibleTextEditorControls.push(control);
                }
            }
        }
        return visibleTextEditorControls;
    }
    getVisibleTextEditorControls(order) {
        return this.doGetVisibleTextEditorControls(coalesce(this.editorGroupsContainer
            .getGroups(order === 1 /* EditorsOrder.SEQUENTIAL */
            ? 2 /* GroupsOrder.GRID_APPEARANCE */
            : 1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)
            .map((group) => group.activeEditorPane)));
    }
    get visibleEditors() {
        return coalesce(this.editorGroupsContainer.groups.map((group) => group.activeEditor));
    }
    async openEditor(editor, optionsOrPreferredGroup, preferredGroup) {
        let typedEditor = undefined;
        let options = isEditorInput(editor)
            ? optionsOrPreferredGroup
            : editor.options;
        let group = undefined;
        if (isPreferredGroup(optionsOrPreferredGroup)) {
            preferredGroup = optionsOrPreferredGroup;
        }
        // Resolve override unless disabled
        if (!isEditorInput(editor)) {
            const resolvedEditor = await this.editorResolverService.resolveEditor(editor, preferredGroup);
            if (resolvedEditor === 1 /* ResolvedStatus.ABORT */) {
                return; // skip editor if override is aborted
            }
            // We resolved an editor to use
            if (isEditorInputWithOptionsAndGroup(resolvedEditor)) {
                typedEditor = resolvedEditor.editor;
                options = resolvedEditor.options;
                group = resolvedEditor.group;
            }
        }
        // Override is disabled or did not apply: fallback to default
        if (!typedEditor) {
            typedEditor = isEditorInput(editor)
                ? editor
                : await this.textEditorService.resolveTextEditor(editor);
        }
        // If group still isn't defined because of a disabled override we resolve it
        if (!group) {
            let activation = undefined;
            const findGroupResult = this.instantiationService.invokeFunction(findGroup, { editor: typedEditor, options }, preferredGroup);
            if (findGroupResult instanceof Promise) {
                ;
                [group, activation] = await findGroupResult;
            }
            else {
                ;
                [group, activation] = findGroupResult;
            }
            // Mixin editor group activation if returned
            if (activation) {
                options = { ...options, activation };
            }
        }
        return group.openEditor(typedEditor, options);
    }
    async openEditors(editors, preferredGroup, options) {
        // Pass all editors to trust service to determine if
        // we should proceed with opening the editors if we
        // are asked to validate trust.
        if (options?.validateTrust) {
            const editorsTrusted = await this.handleWorkspaceTrust(editors);
            if (!editorsTrusted) {
                return [];
            }
        }
        // Find target groups for editors to open
        const mapGroupToTypedEditors = new Map();
        for (const editor of editors) {
            let typedEditor = undefined;
            let group = undefined;
            // Resolve override unless disabled
            if (!isEditorInputWithOptions(editor)) {
                const resolvedEditor = await this.editorResolverService.resolveEditor(editor, preferredGroup);
                if (resolvedEditor === 1 /* ResolvedStatus.ABORT */) {
                    continue; // skip editor if override is aborted
                }
                // We resolved an editor to use
                if (isEditorInputWithOptionsAndGroup(resolvedEditor)) {
                    typedEditor = resolvedEditor;
                    group = resolvedEditor.group;
                }
            }
            // Override is disabled or did not apply: fallback to default
            if (!typedEditor) {
                typedEditor = isEditorInputWithOptions(editor)
                    ? editor
                    : {
                        editor: await this.textEditorService.resolveTextEditor(editor),
                        options: editor.options,
                    };
            }
            // If group still isn't defined because of a disabled override we resolve it
            if (!group) {
                const findGroupResult = this.instantiationService.invokeFunction(findGroup, typedEditor, preferredGroup);
                if (findGroupResult instanceof Promise) {
                    ;
                    [group] = await findGroupResult;
                }
                else {
                    ;
                    [group] = findGroupResult;
                }
            }
            // Update map of groups to editors
            let targetGroupEditors = mapGroupToTypedEditors.get(group);
            if (!targetGroupEditors) {
                targetGroupEditors = [];
                mapGroupToTypedEditors.set(group, targetGroupEditors);
            }
            targetGroupEditors.push(typedEditor);
        }
        // Open in target groups
        const result = [];
        for (const [group, editors] of mapGroupToTypedEditors) {
            result.push(group.openEditors(editors));
        }
        return coalesce(await Promises.settled(result));
    }
    async handleWorkspaceTrust(editors) {
        const { resources, diffMode, mergeMode } = this.extractEditorResources(editors);
        const trustResult = await this.workspaceTrustRequestService.requestOpenFilesTrust(resources);
        switch (trustResult) {
            case 1 /* WorkspaceTrustUriResponse.Open */:
                return true;
            case 2 /* WorkspaceTrustUriResponse.OpenInNewWindow */:
                await this.hostService.openWindow(resources.map((resource) => ({ fileUri: resource })), { forceNewWindow: true, diffMode, mergeMode });
                return false;
            case 3 /* WorkspaceTrustUriResponse.Cancel */:
                return false;
        }
    }
    extractEditorResources(editors) {
        const resources = new ResourceSet();
        let diffMode = false;
        let mergeMode = false;
        for (const editor of editors) {
            // Typed Editor
            if (isEditorInputWithOptions(editor)) {
                const resource = EditorResourceAccessor.getOriginalUri(editor.editor, {
                    supportSideBySide: SideBySideEditor.BOTH,
                });
                if (URI.isUri(resource)) {
                    resources.add(resource);
                }
                else if (resource) {
                    if (resource.primary) {
                        resources.add(resource.primary);
                    }
                    if (resource.secondary) {
                        resources.add(resource.secondary);
                    }
                    diffMode = editor.editor instanceof DiffEditorInput;
                }
            }
            // Untyped editor
            else {
                if (isResourceMergeEditorInput(editor)) {
                    if (URI.isUri(editor.input1)) {
                        resources.add(editor.input1.resource);
                    }
                    if (URI.isUri(editor.input2)) {
                        resources.add(editor.input2.resource);
                    }
                    if (URI.isUri(editor.base)) {
                        resources.add(editor.base.resource);
                    }
                    if (URI.isUri(editor.result)) {
                        resources.add(editor.result.resource);
                    }
                    mergeMode = true;
                }
                if (isResourceDiffEditorInput(editor)) {
                    if (URI.isUri(editor.original.resource)) {
                        resources.add(editor.original.resource);
                    }
                    if (URI.isUri(editor.modified.resource)) {
                        resources.add(editor.modified.resource);
                    }
                    diffMode = true;
                }
                else if (isResourceEditorInput(editor)) {
                    resources.add(editor.resource);
                }
            }
        }
        return {
            resources: Array.from(resources.keys()),
            diffMode,
            mergeMode,
        };
    }
    //#endregion
    //#region isOpened() / isVisible()
    isOpened(editor) {
        return this.editorsObserver.hasEditor({
            resource: this.uriIdentityService.asCanonicalUri(editor.resource),
            typeId: editor.typeId,
            editorId: editor.editorId,
        });
    }
    isVisible(editor) {
        for (const group of this.editorGroupsContainer.groups) {
            if (group.activeEditor?.matches(editor)) {
                return true;
            }
        }
        return false;
    }
    //#endregion
    //#region closeEditor()
    async closeEditor({ editor, groupId }, options) {
        const group = this.editorGroupsContainer.getGroup(groupId);
        await group?.closeEditor(editor, options);
    }
    //#endregion
    //#region closeEditors()
    async closeEditors(editors, options) {
        const mapGroupToEditors = new Map();
        for (const { editor, groupId } of editors) {
            const group = this.editorGroupsContainer.getGroup(groupId);
            if (!group) {
                continue;
            }
            let editors = mapGroupToEditors.get(group);
            if (!editors) {
                editors = [];
                mapGroupToEditors.set(group, editors);
            }
            editors.push(editor);
        }
        for (const [group, editors] of mapGroupToEditors) {
            await group.closeEditors(editors, options);
        }
    }
    findEditors(arg1, options, arg2) {
        const resource = URI.isUri(arg1) ? arg1 : arg1.resource;
        const typeId = URI.isUri(arg1) ? undefined : arg1.typeId;
        // Do a quick check for the resource via the editor observer
        // which is a very efficient way to find an editor by resource.
        // However, we can only do that unless we are asked to find an
        // editor on the secondary side of a side by side editor, because
        // the editor observer provides fast lookups only for primary
        // editors.
        if (options?.supportSideBySide !== SideBySideEditor.ANY &&
            options?.supportSideBySide !== SideBySideEditor.SECONDARY) {
            if (!this.editorsObserver.hasEditors(resource)) {
                if (URI.isUri(arg1) || isUndefined(arg2)) {
                    return [];
                }
                return undefined;
            }
        }
        // Search only in specific group
        if (!isUndefined(arg2)) {
            const targetGroup = typeof arg2 === 'number' ? this.editorGroupsContainer.getGroup(arg2) : arg2;
            // Resource provided: result is an array
            if (URI.isUri(arg1)) {
                if (!targetGroup) {
                    return [];
                }
                return targetGroup.findEditors(resource, options);
            }
            // Editor identifier provided, result is single
            else {
                if (!targetGroup) {
                    return undefined;
                }
                const editors = targetGroup.findEditors(resource, options);
                for (const editor of editors) {
                    if (editor.typeId === typeId) {
                        return editor;
                    }
                }
                return undefined;
            }
        }
        // Search across all groups in MRU order
        else {
            const result = [];
            for (const group of this.editorGroupsContainer.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
                const editors = [];
                // Resource provided: result is an array
                if (URI.isUri(arg1)) {
                    editors.push(...this.findEditors(arg1, options, group));
                }
                // Editor identifier provided, result is single
                else {
                    const editor = this.findEditors(arg1, options, group);
                    if (editor) {
                        editors.push(editor);
                    }
                }
                result.push(...editors.map((editor) => ({ editor, groupId: group.id })));
            }
            return result;
        }
    }
    async replaceEditors(replacements, group) {
        const targetGroup = typeof group === 'number' ? this.editorGroupsContainer.getGroup(group) : group;
        // Convert all replacements to typed editors unless already
        // typed and handle overrides properly.
        const typedReplacements = [];
        for (const replacement of replacements) {
            let typedReplacement = undefined;
            // Resolve override unless disabled
            if (!isEditorInput(replacement.replacement)) {
                const resolvedEditor = await this.editorResolverService.resolveEditor(replacement.replacement, targetGroup);
                if (resolvedEditor === 1 /* ResolvedStatus.ABORT */) {
                    continue; // skip editor if override is aborted
                }
                // We resolved an editor to use
                if (isEditorInputWithOptionsAndGroup(resolvedEditor)) {
                    typedReplacement = {
                        editor: replacement.editor,
                        replacement: resolvedEditor.editor,
                        options: resolvedEditor.options,
                        forceReplaceDirty: replacement.forceReplaceDirty,
                    };
                }
            }
            // Override is disabled or did not apply: fallback to default
            if (!typedReplacement) {
                typedReplacement = {
                    editor: replacement.editor,
                    replacement: isEditorReplacement(replacement)
                        ? replacement.replacement
                        : await this.textEditorService.resolveTextEditor(replacement.replacement),
                    options: isEditorReplacement(replacement)
                        ? replacement.options
                        : replacement.replacement.options,
                    forceReplaceDirty: replacement.forceReplaceDirty,
                };
            }
            typedReplacements.push(typedReplacement);
        }
        return targetGroup?.replaceEditors(typedReplacements);
    }
    //#endregion
    //#region save/revert
    async save(editors, options) {
        // Convert to array
        if (!Array.isArray(editors)) {
            editors = [editors];
        }
        // Make sure to not save the same editor multiple times
        // by using the `matches()` method to find duplicates
        const uniqueEditors = this.getUniqueEditors(editors);
        // Split editors up into a bucket that is saved in parallel
        // and sequentially. Unless "Save As", all non-untitled editors
        // can be saved in parallel to speed up the operation. Remaining
        // editors are potentially bringing up some UI and thus run
        // sequentially.
        const editorsToSaveParallel = [];
        const editorsToSaveSequentially = [];
        if (options?.saveAs) {
            editorsToSaveSequentially.push(...uniqueEditors);
        }
        else {
            for (const { groupId, editor } of uniqueEditors) {
                if (editor.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                    editorsToSaveSequentially.push({ groupId, editor });
                }
                else {
                    editorsToSaveParallel.push({ groupId, editor });
                }
            }
        }
        // Editors to save in parallel
        const saveResults = await Promises.settled(editorsToSaveParallel.map(({ groupId, editor }) => {
            // Use save as a hint to pin the editor if used explicitly
            if (options?.reason === 1 /* SaveReason.EXPLICIT */) {
                this.editorGroupsContainer.getGroup(groupId)?.pinEditor(editor);
            }
            // Save
            return editor.save(groupId, options);
        }));
        // Editors to save sequentially
        for (const { groupId, editor } of editorsToSaveSequentially) {
            if (editor.isDisposed()) {
                continue; // might have been disposed from the save already
            }
            // Preserve view state by opening the editor first if the editor
            // is untitled or we "Save As". This also allows the user to review
            // the contents of the editor before making a decision.
            const editorPane = await this.openEditor(editor, groupId);
            const editorOptions = {
                pinned: true,
                viewState: editorPane?.getViewState(),
            };
            const result = options?.saveAs
                ? await editor.saveAs(groupId, options)
                : await editor.save(groupId, options);
            saveResults.push(result);
            if (!result) {
                break; // failed or cancelled, abort
            }
            // Replace editor preserving viewstate (either across all groups or
            // only selected group) if the resulting editor is different from the
            // current one.
            if (!editor.matches(result)) {
                const targetGroups = editor.hasCapability(4 /* EditorInputCapabilities.Untitled */)
                    ? this.editorGroupsContainer.groups.map((group) => group.id) /* untitled replaces across all groups */
                    : [groupId];
                for (const targetGroup of targetGroups) {
                    if (result instanceof EditorInput) {
                        await this.replaceEditors([{ editor, replacement: result, options: editorOptions }], targetGroup);
                    }
                    else {
                        await this.replaceEditors([{ editor, replacement: { ...result, options: editorOptions } }], targetGroup);
                    }
                }
            }
        }
        return {
            success: saveResults.every((result) => !!result),
            editors: coalesce(saveResults),
        };
    }
    saveAll(options) {
        return this.save(this.getAllModifiedEditors(options), options);
    }
    async revert(editors, options) {
        // Convert to array
        if (!Array.isArray(editors)) {
            editors = [editors];
        }
        // Make sure to not revert the same editor multiple times
        // by using the `matches()` method to find duplicates
        const uniqueEditors = this.getUniqueEditors(editors);
        await Promises.settled(uniqueEditors.map(async ({ groupId, editor }) => {
            // Use revert as a hint to pin the editor
            this.editorGroupsContainer.getGroup(groupId)?.pinEditor(editor);
            return editor.revert(groupId, options);
        }));
        return !uniqueEditors.some(({ editor }) => editor.isDirty());
    }
    async revertAll(options) {
        return this.revert(this.getAllModifiedEditors(options), options);
    }
    getAllModifiedEditors(options) {
        const editors = [];
        for (const group of this.editorGroupsContainer.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            for (const editor of group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                if (!editor.isModified()) {
                    continue;
                }
                if ((typeof options?.includeUntitled === 'boolean' ||
                    !options?.includeUntitled?.includeScratchpad) &&
                    editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */)) {
                    continue;
                }
                if (!options?.includeUntitled && editor.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                    continue;
                }
                if (options?.excludeSticky && group.isSticky(editor)) {
                    continue;
                }
                editors.push({ groupId: group.id, editor });
            }
        }
        return editors;
    }
    getUniqueEditors(editors) {
        const uniqueEditors = [];
        for (const { editor, groupId } of editors) {
            if (uniqueEditors.some((uniqueEditor) => uniqueEditor.editor.matches(editor))) {
                continue;
            }
            uniqueEditors.push({ editor, groupId });
        }
        return uniqueEditors;
    }
    //#endregion
    dispose() {
        super.dispose();
        // Dispose remaining watchers if any
        this.activeOutOfWorkspaceWatchers.forEach((disposable) => dispose(disposable));
        this.activeOutOfWorkspaceWatchers.clear();
    }
};
EditorService = EditorService_1 = __decorate([
    __param(1, IEditorGroupsService),
    __param(2, IInstantiationService),
    __param(3, IFileService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IUriIdentityService),
    __param(7, IEditorResolverService),
    __param(8, IWorkspaceTrustRequestService),
    __param(9, IHostService),
    __param(10, ITextEditorService)
], EditorService);
export { EditorService };
registerSingleton(IEditorService, new SyncDescriptor(EditorService, [undefined], false));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvYnJvd3Nlci9lZGl0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQVFsRyxPQUFPLEVBQ04sZ0JBQWdCLEVBTWhCLHdCQUF3QixFQVF4QixzQkFBc0IsRUFHdEIseUJBQXlCLEVBRXpCLHFCQUFxQixFQUNyQixhQUFhLEVBQ2IsZ0NBQWdDLEVBRWhDLDBCQUEwQixHQUcxQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pFLE9BQU8sRUFDTixZQUFZLEVBR1osZ0JBQWdCLEdBRWhCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLElBQUksb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RyxPQUFPLEVBQ04sb0JBQW9CLEVBSXBCLG1CQUFtQixHQUduQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8s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