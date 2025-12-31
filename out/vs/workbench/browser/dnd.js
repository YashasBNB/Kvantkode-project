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
import { DataTransfers } from '../../base/browser/dnd.js';
import { DragAndDropObserver, EventType, addDisposableListener, onDidRegisterWindow, } from '../../base/browser/dom.js';
import { coalesce } from '../../base/common/arrays.js';
import { UriList } from '../../base/common/dataTransfer.js';
import { Emitter, Event } from '../../base/common/event.js';
import { Disposable, DisposableStore, markAsSingleton, } from '../../base/common/lifecycle.js';
import { stringify } from '../../base/common/marshalling.js';
import { Mimes } from '../../base/common/mime.js';
import { FileAccess, Schemas } from '../../base/common/network.js';
import { isWindows } from '../../base/common/platform.js';
import { basename, isEqual } from '../../base/common/resources.js';
import { URI } from '../../base/common/uri.js';
import { CodeDataTransfers, Extensions, LocalSelectionTransfer, createDraggedEditorInputFromRawResourcesData, extractEditorsAndFilesDropData, } from '../../platform/dnd/browser/dnd.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IInstantiationService, } from '../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { extractSelection, withSelection } from '../../platform/opener/common/opener.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { IWorkspaceContextService, hasWorkspaceFileExtension, isTemporaryWorkspace, } from '../../platform/workspace/common/workspace.js';
import { IWorkspacesService, } from '../../platform/workspaces/common/workspaces.js';
import { EditorResourceAccessor, isEditorIdentifier, isResourceDiffEditorInput, isResourceMergeEditorInput, isResourceSideBySideEditorInput, } from '../common/editor.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { IHostService } from '../services/host/browser/host.js';
import { ITextFileService } from '../services/textfile/common/textfiles.js';
import { IWorkspaceEditingService } from '../services/workspaces/common/workspaceEditing.js';
import { mainWindow } from '../../base/browser/window.js';
import { BroadcastDataChannel } from '../../base/browser/broadcast.js';
//#region Editor / Resources DND
export class DraggedEditorIdentifier {
    constructor(identifier) {
        this.identifier = identifier;
    }
}
export class DraggedEditorGroupIdentifier {
    constructor(identifier) {
        this.identifier = identifier;
    }
}
export async function extractTreeDropData(dataTransfer) {
    const editors = [];
    const resourcesKey = Mimes.uriList.toLowerCase();
    // Data Transfer: Resources
    if (dataTransfer.has(resourcesKey)) {
        try {
            const asString = await dataTransfer.get(resourcesKey)?.asString();
            const rawResourcesData = JSON.stringify(UriList.parse(asString ?? ''));
            editors.push(...createDraggedEditorInputFromRawResourcesData(rawResourcesData));
        }
        catch (error) {
            // Invalid transfer
        }
    }
    return editors;
}
/**
 * Shared function across some components to handle drag & drop of resources.
 * E.g. of folders and workspace files to open them in the window instead of
 * the editor or to handle dirty editors being dropped between instances of Code.
 */
let ResourcesDropHandler = class ResourcesDropHandler {
    constructor(options, fileService, workspacesService, editorService, workspaceEditingService, hostService, contextService, instantiationService) {
        this.options = options;
        this.fileService = fileService;
        this.workspacesService = workspacesService;
        this.editorService = editorService;
        this.workspaceEditingService = workspaceEditingService;
        this.hostService = hostService;
        this.contextService = contextService;
        this.instantiationService = instantiationService;
    }
    async handleDrop(event, targetWindow, resolveTargetGroup, afterDrop, options) {
        const editors = await this.instantiationService.invokeFunction((accessor) => extractEditorsAndFilesDropData(accessor, event));
        if (!editors.length) {
            return;
        }
        // Make the window active to handle the drop properly within
        await this.hostService.focus(targetWindow);
        // Check for workspace file / folder being dropped if we are allowed to do so
        if (this.options.allowWorkspaceOpen) {
            const localFilesAllowedToOpenAsWorkspace = coalesce(editors
                .filter((editor) => editor.allowWorkspaceOpen && editor.resource?.scheme === Schemas.file)
                .map((editor) => editor.resource));
            if (localFilesAllowedToOpenAsWorkspace.length > 0) {
                const isWorkspaceOpening = await this.handleWorkspaceDrop(localFilesAllowedToOpenAsWorkspace);
                if (isWorkspaceOpening) {
                    return; // return early if the drop operation resulted in this window changing to a workspace
                }
            }
        }
        // Add external ones to recently open list unless dropped resource is a workspace
        const externalLocalFiles = coalesce(editors
            .filter((editor) => editor.isExternal && editor.resource?.scheme === Schemas.file)
            .map((editor) => editor.resource));
        if (externalLocalFiles.length) {
            this.workspacesService.addRecentlyOpened(externalLocalFiles.map((resource) => ({ fileUri: resource })));
        }
        // Open in Editor
        const targetGroup = resolveTargetGroup?.();
        await this.editorService.openEditors(editors.map((editor) => ({
            ...editor,
            resource: editor.resource,
            options: {
                ...editor.options,
                ...options,
                pinned: true,
            },
        })), targetGroup, { validateTrust: true });
        // Finish with provided function
        afterDrop?.(targetGroup);
    }
    async handleWorkspaceDrop(resources) {
        const toOpen = [];
        const folderURIs = [];
        await Promise.all(resources.map(async (resource) => {
            // Check for Workspace
            if (hasWorkspaceFileExtension(resource)) {
                toOpen.push({ workspaceUri: resource });
                return;
            }
            // Check for Folder
            try {
                const stat = await this.fileService.stat(resource);
                if (stat.isDirectory) {
                    toOpen.push({ folderUri: stat.resource });
                    folderURIs.push({ uri: stat.resource });
                }
            }
            catch (error) {
                // Ignore error
            }
        }));
        // Return early if no external resource is a folder or workspace
        if (toOpen.length === 0) {
            return false;
        }
        // Open in separate windows if we drop workspaces or just one folder
        if (toOpen.length > folderURIs.length || folderURIs.length === 1) {
            await this.hostService.openWindow(toOpen);
        }
        // Add to workspace if we are in a temporary workspace
        else if (isTemporaryWorkspace(this.contextService.getWorkspace())) {
            await this.workspaceEditingService.addFolders(folderURIs);
        }
        // Finally, enter untitled workspace when dropping >1 folders
        else {
            await this.workspaceEditingService.createAndEnterWorkspace(folderURIs);
        }
        return true;
    }
};
ResourcesDropHandler = __decorate([
    __param(1, IFileService),
    __param(2, IWorkspacesService),
    __param(3, IEditorService),
    __param(4, IWorkspaceEditingService),
    __param(5, IHostService),
    __param(6, IWorkspaceContextService),
    __param(7, IInstantiationService)
], ResourcesDropHandler);
export { ResourcesDropHandler };
export function fillEditorsDragData(accessor, resourcesOrEditors, event, options) {
    if (resourcesOrEditors.length === 0 || !event.dataTransfer) {
        return;
    }
    const textFileService = accessor.get(ITextFileService);
    const editorService = accessor.get(IEditorService);
    const fileService = accessor.get(IFileService);
    const labelService = accessor.get(ILabelService);
    // Extract resources from URIs or Editors that
    // can be handled by the file service
    const resources = coalesce(resourcesOrEditors.map((resourceOrEditor) => {
        if (URI.isUri(resourceOrEditor)) {
            return { resource: resourceOrEditor };
        }
        if (isEditorIdentifier(resourceOrEditor)) {
            if (URI.isUri(resourceOrEditor.editor.resource)) {
                return { resource: resourceOrEditor.editor.resource };
            }
            return undefined; // editor without resource
        }
        return {
            ...resourceOrEditor,
            resource: resourceOrEditor.selection
                ? withSelection(resourceOrEditor.resource, resourceOrEditor.selection)
                : resourceOrEditor.resource,
        };
    }));
    const fileSystemResources = resources.filter(({ resource }) => fileService.hasProvider(resource));
    if (!options?.disableStandardTransfer) {
        // Text: allows to paste into text-capable areas
        const lineDelimiter = isWindows ? '\r\n' : '\n';
        event.dataTransfer.setData(DataTransfers.TEXT, fileSystemResources
            .map(({ resource }) => labelService.getUriLabel(resource, { noPrefix: true }))
            .join(lineDelimiter));
        // Download URL: enables support to drag a tab as file to desktop
        // Requirements:
        // - Chrome/Edge only
        // - only a single file is supported
        // - only file:/ resources are supported
        const firstFile = fileSystemResources.find(({ isDirectory }) => !isDirectory);
        if (firstFile) {
            const firstFileUri = FileAccess.uriToFileUri(firstFile.resource); // enforce `file:` URIs
            if (firstFileUri.scheme === Schemas.file) {
                event.dataTransfer.setData(DataTransfers.DOWNLOAD_URL, [Mimes.binary, basename(firstFile.resource), firstFileUri.toString()].join(':'));
            }
        }
    }
    // Resource URLs: allows to drop multiple file resources to a target in VS Code
    const files = fileSystemResources.filter(({ isDirectory }) => !isDirectory);
    if (files.length) {
        event.dataTransfer.setData(DataTransfers.RESOURCES, JSON.stringify(files.map(({ resource }) => resource.toString())));
    }
    // Contributions
    const contributions = Registry.as(Extensions.DragAndDropContribution).getAll();
    for (const contribution of contributions) {
        contribution.setData(resources, event);
    }
    // Editors: enables cross window DND of editors
    // into the editor area while presering UI state
    const draggedEditors = [];
    for (const resourceOrEditor of resourcesOrEditors) {
        // Extract resource editor from provided object or URI
        let editor = undefined;
        if (isEditorIdentifier(resourceOrEditor)) {
            const untypedEditor = resourceOrEditor.editor.toUntyped({
                preserveViewState: resourceOrEditor.groupId,
            });
            if (untypedEditor) {
                editor = {
                    ...untypedEditor,
                    resource: EditorResourceAccessor.getCanonicalUri(untypedEditor),
                };
            }
        }
        else if (URI.isUri(resourceOrEditor)) {
            const { selection, uri } = extractSelection(resourceOrEditor);
            editor = { resource: uri, options: selection ? { selection } : undefined };
        }
        else if (!resourceOrEditor.isDirectory) {
            editor = {
                resource: resourceOrEditor.resource,
                options: {
                    selection: resourceOrEditor.selection,
                },
            };
        }
        if (!editor) {
            continue; // skip over editors that cannot be transferred via dnd
        }
        // Fill in some properties if they are not there already by accessing
        // some well known things from the text file universe.
        // This is not ideal for custom editors, but those have a chance to
        // provide everything from the `toUntyped` method.
        {
            const resource = editor.resource;
            if (resource) {
                const textFileModel = textFileService.files.get(resource);
                if (textFileModel) {
                    // language
                    if (typeof editor.languageId !== 'string') {
                        editor.languageId = textFileModel.getLanguageId();
                    }
                    // encoding
                    if (typeof editor.encoding !== 'string') {
                        editor.encoding = textFileModel.getEncoding();
                    }
                    // contents (only if dirty and not too large)
                    if (typeof editor.contents !== 'string' &&
                        textFileModel.isDirty() &&
                        !textFileModel.textEditorModel.isTooLargeForHeapOperation()) {
                        editor.contents = textFileModel.textEditorModel.getValue();
                    }
                }
                // viewState
                if (!editor.options?.viewState) {
                    editor.options = {
                        ...editor.options,
                        viewState: (() => {
                            for (const visibleEditorPane of editorService.visibleEditorPanes) {
                                if (isEqual(visibleEditorPane.input.resource, resource)) {
                                    const viewState = visibleEditorPane.getViewState();
                                    if (viewState) {
                                        return viewState;
                                    }
                                }
                            }
                            return undefined;
                        })(),
                    };
                }
            }
        }
        // Add as dragged editor
        draggedEditors.push(editor);
    }
    if (draggedEditors.length) {
        event.dataTransfer.setData(CodeDataTransfers.EDITORS, stringify(draggedEditors));
        // Add a URI list entry
        const uriListEntries = [];
        for (const editor of draggedEditors) {
            if (editor.resource) {
                uriListEntries.push(editor.options?.selection
                    ? withSelection(editor.resource, editor.options.selection)
                    : editor.resource);
            }
            else if (isResourceDiffEditorInput(editor)) {
                if (editor.modified.resource) {
                    uriListEntries.push(editor.modified.resource);
                }
            }
            else if (isResourceSideBySideEditorInput(editor)) {
                if (editor.primary.resource) {
                    uriListEntries.push(editor.primary.resource);
                }
            }
            else if (isResourceMergeEditorInput(editor)) {
                uriListEntries.push(editor.result.resource);
            }
        }
        // Due to https://bugs.chromium.org/p/chromium/issues/detail?id=239745, we can only set
        // a single uri for the real `text/uri-list` type. Otherwise all uris end up joined together
        // However we write the full uri-list to an internal type so that other parts of VS Code
        // can use the full list.
        if (!options?.disableStandardTransfer) {
            event.dataTransfer.setData(Mimes.uriList, UriList.create(uriListEntries.slice(0, 1)));
        }
        event.dataTransfer.setData(DataTransfers.INTERNAL_URI_LIST, UriList.create(uriListEntries));
    }
}
export class CompositeDragAndDropData {
    constructor(type, id) {
        this.type = type;
        this.id = id;
    }
    update(dataTransfer) {
        // no-op
    }
    getData() {
        return { type: this.type, id: this.id };
    }
}
export class DraggedCompositeIdentifier {
    constructor(compositeId) {
        this.compositeId = compositeId;
    }
    get id() {
        return this.compositeId;
    }
}
export class DraggedViewIdentifier {
    constructor(viewId) {
        this.viewId = viewId;
    }
    get id() {
        return this.viewId;
    }
}
export class CompositeDragAndDropObserver extends Disposable {
    static get INSTANCE() {
        if (!CompositeDragAndDropObserver.instance) {
            CompositeDragAndDropObserver.instance = new CompositeDragAndDropObserver();
            markAsSingleton(CompositeDragAndDropObserver.instance);
        }
        return CompositeDragAndDropObserver.instance;
    }
    constructor() {
        super();
        this.transferData = LocalSelectionTransfer.getInstance();
        this.onDragStart = this._register(new Emitter());
        this.onDragEnd = this._register(new Emitter());
        this._register(this.onDragEnd.event((e) => {
            const id = e.dragAndDropData.getData().id;
            const type = e.dragAndDropData.getData().type;
            const data = this.readDragData(type);
            if (data?.getData().id === id) {
                this.transferData.clearData(type === 'view'
                    ? DraggedViewIdentifier.prototype
                    : DraggedCompositeIdentifier.prototype);
            }
        }));
    }
    readDragData(type) {
        if (this.transferData.hasData(type === 'view' ? DraggedViewIdentifier.prototype : DraggedCompositeIdentifier.prototype)) {
            const data = this.transferData.getData(type === 'view' ? DraggedViewIdentifier.prototype : DraggedCompositeIdentifier.prototype);
            if (data && data[0]) {
                return new CompositeDragAndDropData(type, data[0].id);
            }
        }
        return undefined;
    }
    writeDragData(id, type) {
        this.transferData.setData([type === 'view' ? new DraggedViewIdentifier(id) : new DraggedCompositeIdentifier(id)], type === 'view' ? DraggedViewIdentifier.prototype : DraggedCompositeIdentifier.prototype);
    }
    registerTarget(element, callbacks) {
        const disposableStore = new DisposableStore();
        disposableStore.add(new DragAndDropObserver(element, {
            onDragEnter: (e) => {
                e.preventDefault();
                if (callbacks.onDragEnter) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (data) {
                        callbacks.onDragEnter({ eventData: e, dragAndDropData: data });
                    }
                }
            },
            onDragLeave: (e) => {
                const data = this.readDragData('composite') || this.readDragData('view');
                if (callbacks.onDragLeave && data) {
                    callbacks.onDragLeave({ eventData: e, dragAndDropData: data });
                }
            },
            onDrop: (e) => {
                if (callbacks.onDrop) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    callbacks.onDrop({ eventData: e, dragAndDropData: data });
                    // Fire drag event in case drop handler destroys the dragged element
                    this.onDragEnd.fire({ eventData: e, dragAndDropData: data });
                }
            },
            onDragOver: (e) => {
                e.preventDefault();
                if (callbacks.onDragOver) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    callbacks.onDragOver({ eventData: e, dragAndDropData: data });
                }
            },
        }));
        if (callbacks.onDragStart) {
            this.onDragStart.event((e) => {
                callbacks.onDragStart(e);
            }, this, disposableStore);
        }
        if (callbacks.onDragEnd) {
            this.onDragEnd.event((e) => {
                callbacks.onDragEnd(e);
            }, this, disposableStore);
        }
        return this._register(disposableStore);
    }
    registerDraggable(element, draggedItemProvider, callbacks) {
        element.draggable = true;
        const disposableStore = new DisposableStore();
        disposableStore.add(new DragAndDropObserver(element, {
            onDragStart: (e) => {
                const { id, type } = draggedItemProvider();
                this.writeDragData(id, type);
                e.dataTransfer?.setDragImage(element, 0, 0);
                this.onDragStart.fire({ eventData: e, dragAndDropData: this.readDragData(type) });
            },
            onDragEnd: (e) => {
                const { type } = draggedItemProvider();
                const data = this.readDragData(type);
                if (!data) {
                    return;
                }
                this.onDragEnd.fire({ eventData: e, dragAndDropData: data });
            },
            onDragEnter: (e) => {
                if (callbacks.onDragEnter) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    if (data) {
                        callbacks.onDragEnter({ eventData: e, dragAndDropData: data });
                    }
                }
            },
            onDragLeave: (e) => {
                const data = this.readDragData('composite') || this.readDragData('view');
                if (!data) {
                    return;
                }
                callbacks.onDragLeave?.({ eventData: e, dragAndDropData: data });
            },
            onDrop: (e) => {
                if (callbacks.onDrop) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    callbacks.onDrop({ eventData: e, dragAndDropData: data });
                    // Fire drag event in case drop handler destroys the dragged element
                    this.onDragEnd.fire({ eventData: e, dragAndDropData: data });
                }
            },
            onDragOver: (e) => {
                if (callbacks.onDragOver) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    callbacks.onDragOver({ eventData: e, dragAndDropData: data });
                }
            },
        }));
        if (callbacks.onDragStart) {
            this.onDragStart.event((e) => {
                callbacks.onDragStart(e);
            }, this, disposableStore);
        }
        if (callbacks.onDragEnd) {
            this.onDragEnd.event((e) => {
                callbacks.onDragEnd(e);
            }, this, disposableStore);
        }
        return this._register(disposableStore);
    }
}
export function toggleDropEffect(dataTransfer, dropEffect, shouldHaveIt) {
    if (!dataTransfer) {
        return;
    }
    dataTransfer.dropEffect = shouldHaveIt ? dropEffect : 'none';
}
let ResourceListDnDHandler = class ResourceListDnDHandler {
    constructor(toResource, instantiationService) {
        this.toResource = toResource;
        this.instantiationService = instantiationService;
    }
    getDragURI(element) {
        const resource = this.toResource(element);
        return resource ? resource.toString() : null;
    }
    getDragLabel(elements) {
        const resources = coalesce(elements.map(this.toResource));
        return resources.length === 1
            ? basename(resources[0])
            : resources.length > 1
                ? String(resources.length)
                : undefined;
    }
    onDragStart(data, originalEvent) {
        const resources = [];
        const elements = data.elements;
        for (const element of elements) {
            const resource = this.toResource(element);
            if (resource) {
                resources.push(resource);
            }
        }
        this.onWillDragElements(elements, originalEvent);
        if (resources.length) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, resources, originalEvent));
        }
    }
    onWillDragElements(elements, originalEvent) {
        // noop
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return false;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) { }
    dispose() { }
};
ResourceListDnDHandler = __decorate([
    __param(1, IInstantiationService)
], ResourceListDnDHandler);
export { ResourceListDnDHandler };
//#endregion
class GlobalWindowDraggedOverTracker extends Disposable {
    static { this.CHANNEL_NAME = 'monaco-workbench-global-dragged-over'; }
    constructor() {
        super();
        this.broadcaster = this._register(new BroadcastDataChannel(GlobalWindowDraggedOverTracker.CHANNEL_NAME));
        this.draggedOver = false;
        this.registerListeners();
    }
    registerListeners() {
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(addDisposableListener(window, EventType.DRAG_OVER, () => this.markDraggedOver(false), true));
            disposables.add(addDisposableListener(window, EventType.DRAG_LEAVE, () => this.clearDraggedOver(false), true));
        }, { window: mainWindow, disposables: this._store }));
        this._register(this.broadcaster.onDidReceiveData((data) => {
            if (data === true) {
                this.markDraggedOver(true);
            }
            else {
                this.clearDraggedOver(true);
            }
        }));
    }
    get isDraggedOver() {
        return this.draggedOver;
    }
    markDraggedOver(fromBroadcast) {
        if (this.draggedOver === true) {
            return; // alrady marked
        }
        this.draggedOver = true;
        if (!fromBroadcast) {
            this.broadcaster.postData(true);
        }
    }
    clearDraggedOver(fromBroadcast) {
        if (this.draggedOver === false) {
            return; // alrady cleared
        }
        this.draggedOver = false;
        if (!fromBroadcast) {
            this.broadcaster.postData(false);
        }
    }
}
const globalDraggedOverTracker = new GlobalWindowDraggedOverTracker();
/**
 * Returns whether the workbench is currently dragged over in any of
 * the opened windows (main windows and auxiliary windows).
 */
export function isWindowDraggedOver() {
    return globalDraggedOverTracker.isDraggedOver;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvZG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0sMkJBQTJCLENBQUE7QUFDM0UsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixTQUFTLEVBQ1QscUJBQXFCLEVBQ3JCLG1CQUFtQixHQUNuQixNQUFNLDJCQUEyQixDQUFBO0FBUWxDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFrQixNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsZUFBZSxHQUNmLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5QyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLFVBQVUsRUFJVixzQkFBc0IsRUFDdEIsNENBQTRDLEVBQzVDLDhCQUE4QixHQUM5QixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxZQUFZ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