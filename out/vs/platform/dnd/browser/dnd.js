/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DataTransfers } from '../../../base/browser/dnd.js';
import { mainWindow } from '../../../base/browser/window.js';
import { coalesce } from '../../../base/common/arrays.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { ResourceMap } from '../../../base/common/map.js';
import { parse } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { isNative, isWeb } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { HTMLFileSystemProvider } from '../../files/browser/htmlFileSystemProvider.js';
import { WebFileSystemAccess } from '../../files/browser/webFileSystemAccess.js';
import { ByteSize, IFileService } from '../../files/common/files.js';
import { IInstantiationService, } from '../../instantiation/common/instantiation.js';
import { extractSelection } from '../../opener/common/opener.js';
import { Registry } from '../../registry/common/platform.js';
//#region Editor / Resources DND
export const CodeDataTransfers = {
    EDITORS: 'CodeEditors',
    FILES: 'CodeFiles',
    SYMBOLS: 'application/vnd.code.symbols',
    MARKERS: 'application/vnd.code.diagnostics',
};
export function extractEditorsDropData(e) {
    const editors = [];
    if (e.dataTransfer && e.dataTransfer.types.length > 0) {
        // Data Transfer: Code Editors
        const rawEditorsData = e.dataTransfer.getData(CodeDataTransfers.EDITORS);
        if (rawEditorsData) {
            try {
                editors.push(...parse(rawEditorsData));
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Data Transfer: Resources
        else {
            try {
                const rawResourcesData = e.dataTransfer.getData(DataTransfers.RESOURCES);
                editors.push(...createDraggedEditorInputFromRawResourcesData(rawResourcesData));
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Check for native file transfer
        if (e.dataTransfer?.files) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                if (file && getPathForFile(file)) {
                    try {
                        editors.push({
                            resource: URI.file(getPathForFile(file)),
                            isExternal: true,
                            allowWorkspaceOpen: true,
                        });
                    }
                    catch (error) {
                        // Invalid URI
                    }
                }
            }
        }
        // Check for CodeFiles transfer
        const rawCodeFiles = e.dataTransfer.getData(CodeDataTransfers.FILES);
        if (rawCodeFiles) {
            try {
                const codeFiles = JSON.parse(rawCodeFiles);
                for (const codeFile of codeFiles) {
                    editors.push({ resource: URI.file(codeFile), isExternal: true, allowWorkspaceOpen: true });
                }
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Workbench contributions
        const contributions = Registry.as(Extensions.DragAndDropContribution).getAll();
        for (const contribution of contributions) {
            const data = e.dataTransfer.getData(contribution.dataFormatKey);
            if (data) {
                try {
                    editors.push(...contribution.getEditorInputs(data));
                }
                catch (error) {
                    // Invalid transfer
                }
            }
        }
    }
    // Prevent duplicates: it is possible that we end up with the same
    // dragged editor multiple times because multiple data transfers
    // are being used (https://github.com/microsoft/vscode/issues/128925)
    const coalescedEditors = [];
    const seen = new ResourceMap();
    for (const editor of editors) {
        if (!editor.resource) {
            coalescedEditors.push(editor);
        }
        else if (!seen.has(editor.resource)) {
            coalescedEditors.push(editor);
            seen.set(editor.resource, true);
        }
    }
    return coalescedEditors;
}
export async function extractEditorsAndFilesDropData(accessor, e) {
    const editors = extractEditorsDropData(e);
    // Web: Check for file transfer
    if (e.dataTransfer && isWeb && containsDragType(e, DataTransfers.FILES)) {
        const files = e.dataTransfer.items;
        if (files) {
            const instantiationService = accessor.get(IInstantiationService);
            const filesData = await instantiationService.invokeFunction((accessor) => extractFilesDropData(accessor, e));
            for (const fileData of filesData) {
                editors.push({
                    resource: fileData.resource,
                    contents: fileData.contents?.toString(),
                    isExternal: true,
                    allowWorkspaceOpen: fileData.isDirectory,
                });
            }
        }
    }
    return editors;
}
export function createDraggedEditorInputFromRawResourcesData(rawResourcesData) {
    const editors = [];
    if (rawResourcesData) {
        const resourcesRaw = JSON.parse(rawResourcesData);
        for (const resourceRaw of resourcesRaw) {
            if (resourceRaw.indexOf(':') > 0) {
                // mitigate https://github.com/microsoft/vscode/issues/124946
                const { selection, uri } = extractSelection(URI.parse(resourceRaw));
                editors.push({ resource: uri, options: { selection } });
            }
        }
    }
    return editors;
}
async function extractFilesDropData(accessor, event) {
    // Try to extract via `FileSystemHandle`
    if (WebFileSystemAccess.supported(mainWindow)) {
        const items = event.dataTransfer?.items;
        if (items) {
            return extractFileTransferData(accessor, items);
        }
    }
    // Try to extract via `FileList`
    const files = event.dataTransfer?.files;
    if (!files) {
        return [];
    }
    return extractFileListData(accessor, files);
}
async function extractFileTransferData(accessor, items) {
    const fileSystemProvider = accessor.get(IFileService).getProvider(Schemas.file);
    // eslint-disable-next-line no-restricted-syntax
    if (!(fileSystemProvider instanceof HTMLFileSystemProvider)) {
        return []; // only supported when running in web
    }
    const results = [];
    for (let i = 0; i < items.length; i++) {
        const file = items[i];
        if (file) {
            const result = new DeferredPromise();
            results.push(result);
            (async () => {
                try {
                    const handle = await file.getAsFileSystemHandle();
                    if (!handle) {
                        result.complete(undefined);
                        return;
                    }
                    if (WebFileSystemAccess.isFileSystemFileHandle(handle)) {
                        result.complete({
                            resource: await fileSystemProvider.registerFileHandle(handle),
                            isDirectory: false,
                        });
                    }
                    else if (WebFileSystemAccess.isFileSystemDirectoryHandle(handle)) {
                        result.complete({
                            resource: await fileSystemProvider.registerDirectoryHandle(handle),
                            isDirectory: true,
                        });
                    }
                    else {
                        result.complete(undefined);
                    }
                }
                catch (error) {
                    result.complete(undefined);
                }
            })();
        }
    }
    return coalesce(await Promise.all(results.map((result) => result.p)));
}
export async function extractFileListData(accessor, files) {
    const dialogService = accessor.get(IDialogService);
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
            // Skip for very large files because this operation is unbuffered
            if (file.size > 100 * ByteSize.MB) {
                dialogService.warn(localize('fileTooLarge', 'File is too large to open as untitled editor. Please upload it first into the file explorer and then try again.'));
                continue;
            }
            const result = new DeferredPromise();
            results.push(result);
            const reader = new FileReader();
            reader.onerror = () => result.complete(undefined);
            reader.onabort = () => result.complete(undefined);
            reader.onload = async (event) => {
                const name = file.name;
                const loadResult = event.target?.result ?? undefined;
                if (typeof name !== 'string' || typeof loadResult === 'undefined') {
                    result.complete(undefined);
                    return;
                }
                result.complete({
                    resource: URI.from({ scheme: Schemas.untitled, path: name }),
                    contents: typeof loadResult === 'string'
                        ? VSBuffer.fromString(loadResult)
                        : VSBuffer.wrap(new Uint8Array(loadResult)),
                });
            };
            // Start reading
            reader.readAsArrayBuffer(file);
        }
    }
    return coalesce(await Promise.all(results.map((result) => result.p)));
}
//#endregion
export function containsDragType(event, ...dragTypesToFind) {
    if (!event.dataTransfer) {
        return false;
    }
    const dragTypes = event.dataTransfer.types;
    const lowercaseDragTypes = [];
    for (let i = 0; i < dragTypes.length; i++) {
        lowercaseDragTypes.push(dragTypes[i].toLowerCase()); // somehow the types are lowercase
    }
    for (const dragType of dragTypesToFind) {
        if (lowercaseDragTypes.indexOf(dragType.toLowerCase()) >= 0) {
            return true;
        }
    }
    return false;
}
class DragAndDropContributionRegistry {
    constructor() {
        this._contributions = new Map();
    }
    register(contribution) {
        if (this._contributions.has(contribution.dataFormatKey)) {
            throw new Error(`A drag and drop contributiont with key '${contribution.dataFormatKey}' was already registered.`);
        }
        this._contributions.set(contribution.dataFormatKey, contribution);
    }
    getAll() {
        return this._contributions.values();
    }
}
export const Extensions = {
    DragAndDropContribution: 'workbench.contributions.dragAndDrop',
};
Registry.add(Extensions.DragAndDropContribution, new DragAndDropContributionRegistry());
//#endregion
//#region DND Utilities
/**
 * A singleton to store transfer data during drag & drop operations that are only valid within the application.
 */
export class LocalSelectionTransfer {
    static { this.INSTANCE = new LocalSelectionTransfer(); }
    constructor() {
        // protect against external instantiation
    }
    static getInstance() {
        return LocalSelectionTransfer.INSTANCE;
    }
    hasData(proto) {
        return proto && proto === this.proto;
    }
    clearData(proto) {
        if (this.hasData(proto)) {
            this.proto = undefined;
            this.data = undefined;
        }
    }
    getData(proto) {
        if (this.hasData(proto)) {
            return this.data;
        }
        return undefined;
    }
    setData(data, proto) {
        if (proto) {
            this.data = data;
            this.proto = proto;
        }
    }
}
function setDataAsJSON(e, kind, data) {
    e.dataTransfer?.setData(kind, JSON.stringify(data));
}
function getDataAsJSON(e, kind, defaultValue) {
    const rawSymbolsData = e.dataTransfer?.getData(kind);
    if (rawSymbolsData) {
        try {
            return JSON.parse(rawSymbolsData);
        }
        catch (error) {
            // Invalid transfer
        }
    }
    return defaultValue;
}
export function extractSymbolDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.SYMBOLS, []);
}
export function fillInSymbolsDragData(symbolsData, e) {
    setDataAsJSON(e, CodeDataTransfers.SYMBOLS, symbolsData);
}
export function extractMarkerDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.MARKERS, undefined);
}
export function fillInMarkersDragData(markerData, e) {
    setDataAsJSON(e, CodeDataTransfers.MARKERS, markerData);
}
/**
 * A helper to get access to Electrons `webUtils.getPathForFile` function
 * in a safe way without crashing the application when running in the web.
 */
export function getPathForFile(file) {
    if (isNative && typeof globalThis.vscode?.webUtils?.getPathForFile === 'function') {
        return globalThis.vscode.webUtils.getPathForFile(file);
    }
    return undefined;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZG5kL2Jyb3dzZXIvZG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFaEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxF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