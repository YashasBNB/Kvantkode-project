/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../base/common/cancellation.js';
import { hash } from '../../../base/common/hash.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { joinPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import * as typeConverters from './extHostTypeConverters.js';
import { shouldSerializeBuffersForPostMessage, toExtensionData, } from './extHostWebview.js';
import { Cache } from './cache.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as extHostTypes from './extHostTypes.js';
class CustomDocumentStoreEntry {
    constructor(document, _storagePath) {
        this.document = document;
        this._storagePath = _storagePath;
        this._backupCounter = 1;
        this._edits = new Cache('custom documents');
    }
    addEdit(item) {
        return this._edits.add([item]);
    }
    async undo(editId, isDirty) {
        await this.getEdit(editId).undo();
        if (!isDirty) {
            this.disposeBackup();
        }
    }
    async redo(editId, isDirty) {
        await this.getEdit(editId).redo();
        if (!isDirty) {
            this.disposeBackup();
        }
    }
    disposeEdits(editIds) {
        for (const id of editIds) {
            this._edits.delete(id);
        }
    }
    getNewBackupUri() {
        if (!this._storagePath) {
            throw new Error('Backup requires a valid storage path');
        }
        const fileName = hashPath(this.document.uri) + this._backupCounter++;
        return joinPath(this._storagePath, fileName);
    }
    updateBackup(backup) {
        this._backup?.delete();
        this._backup = backup;
    }
    disposeBackup() {
        this._backup?.delete();
        this._backup = undefined;
    }
    getEdit(editId) {
        const edit = this._edits.get(editId, 0);
        if (!edit) {
            throw new Error('No edit found');
        }
        return edit;
    }
}
class CustomDocumentStore {
    constructor() {
        this._documents = new Map();
    }
    get(viewType, resource) {
        return this._documents.get(this.key(viewType, resource));
    }
    add(viewType, document, storagePath) {
        const key = this.key(viewType, document.uri);
        if (this._documents.has(key)) {
            throw new Error(`Document already exists for viewType:${viewType} resource:${document.uri}`);
        }
        const entry = new CustomDocumentStoreEntry(document, storagePath);
        this._documents.set(key, entry);
        return entry;
    }
    delete(viewType, document) {
        const key = this.key(viewType, document.uri);
        this._documents.delete(key);
    }
    key(viewType, resource) {
        return `${viewType}@@@${resource}`;
    }
}
var CustomEditorType;
(function (CustomEditorType) {
    CustomEditorType[CustomEditorType["Text"] = 0] = "Text";
    CustomEditorType[CustomEditorType["Custom"] = 1] = "Custom";
})(CustomEditorType || (CustomEditorType = {}));
class EditorProviderStore {
    constructor() {
        this._providers = new Map();
    }
    addTextProvider(viewType, extension, provider) {
        return this.add(viewType, { type: 0 /* CustomEditorType.Text */, extension, provider });
    }
    addCustomProvider(viewType, extension, provider) {
        return this.add(viewType, { type: 1 /* CustomEditorType.Custom */, extension, provider });
    }
    get(viewType) {
        return this._providers.get(viewType);
    }
    add(viewType, entry) {
        if (this._providers.has(viewType)) {
            throw new Error(`Provider for viewType:${viewType} already registered`);
        }
        this._providers.set(viewType, entry);
        return new extHostTypes.Disposable(() => this._providers.delete(viewType));
    }
}
export class ExtHostCustomEditors {
    constructor(mainContext, _extHostDocuments, _extensionStoragePaths, _extHostWebview, _extHostWebviewPanels) {
        this._extHostDocuments = _extHostDocuments;
        this._extensionStoragePaths = _extensionStoragePaths;
        this._extHostWebview = _extHostWebview;
        this._extHostWebviewPanels = _extHostWebviewPanels;
        this._editorProviders = new EditorProviderStore();
        this._documents = new CustomDocumentStore();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadCustomEditors);
    }
    registerCustomEditorProvider(extension, viewType, provider, options) {
        const disposables = new DisposableStore();
        if (isCustomTextEditorProvider(provider)) {
            disposables.add(this._editorProviders.addTextProvider(viewType, extension, provider));
            this._proxy.$registerTextEditorProvider(toExtensionData(extension), viewType, options.webviewOptions || {}, {
                supportsMove: !!provider.moveCustomTextEditor,
            }, shouldSerializeBuffersForPostMessage(extension));
        }
        else {
            disposables.add(this._editorProviders.addCustomProvider(viewType, extension, provider));
            if (isCustomEditorProviderWithEditingCapability(provider)) {
                disposables.add(provider.onDidChangeCustomDocument((e) => {
                    const entry = this.getCustomDocumentEntry(viewType, e.document.uri);
                    if (isEditEvent(e)) {
                        const editId = entry.addEdit(e);
                        this._proxy.$onDidEdit(e.document.uri, viewType, editId, e.label);
                    }
                    else {
                        this._proxy.$onContentChange(e.document.uri, viewType);
                    }
                }));
            }
            this._proxy.$registerCustomEditorProvider(toExtensionData(extension), viewType, options.webviewOptions || {}, !!options.supportsMultipleEditorsPerDocument, shouldSerializeBuffersForPostMessage(extension));
        }
        return extHostTypes.Disposable.from(disposables, new extHostTypes.Disposable(() => {
            this._proxy.$unregisterEditorProvider(viewType);
        }));
    }
    async $createCustomDocument(resource, viewType, backupId, untitledDocumentData, cancellation) {
        const entry = this._editorProviders.get(viewType);
        if (!entry) {
            throw new Error(`No provider found for '${viewType}'`);
        }
        if (entry.type !== 1 /* CustomEditorType.Custom */) {
            throw new Error(`Invalid provide type for '${viewType}'`);
        }
        const revivedResource = URI.revive(resource);
        const document = await entry.provider.openCustomDocument(revivedResource, { backupId, untitledDocumentData: untitledDocumentData?.buffer }, cancellation);
        let storageRoot;
        if (isCustomEditorProviderWithEditingCapability(entry.provider) &&
            this._extensionStoragePaths) {
            storageRoot =
                this._extensionStoragePaths.workspaceValue(entry.extension) ??
                    this._extensionStoragePaths.globalValue(entry.extension);
        }
        this._documents.add(viewType, document, storageRoot);
        return { editable: isCustomEditorProviderWithEditingCapability(entry.provider) };
    }
    async $disposeCustomDocument(resource, viewType) {
        const entry = this._editorProviders.get(viewType);
        if (!entry) {
            throw new Error(`No provider found for '${viewType}'`);
        }
        if (entry.type !== 1 /* CustomEditorType.Custom */) {
            throw new Error(`Invalid provider type for '${viewType}'`);
        }
        const revivedResource = URI.revive(resource);
        const { document } = this.getCustomDocumentEntry(viewType, revivedResource);
        this._documents.delete(viewType, document);
        document.dispose();
    }
    async $resolveCustomEditor(resource, handle, viewType, initData, position, cancellation) {
        const entry = this._editorProviders.get(viewType);
        if (!entry) {
            throw new Error(`No provider found for '${viewType}'`);
        }
        const viewColumn = typeConverters.ViewColumn.to(position);
        const webview = this._extHostWebview.createNewWebview(handle, initData.contentOptions, entry.extension);
        const panel = this._extHostWebviewPanels.createNewWebviewPanel(handle, viewType, initData.title, viewColumn, initData.options, webview, initData.active);
        const revivedResource = URI.revive(resource);
        switch (entry.type) {
            case 1 /* CustomEditorType.Custom */: {
                const { document } = this.getCustomDocumentEntry(viewType, revivedResource);
                return entry.provider.resolveCustomEditor(document, panel, cancellation);
            }
            case 0 /* CustomEditorType.Text */: {
                const document = this._extHostDocuments.getDocument(revivedResource);
                return entry.provider.resolveCustomTextEditor(document, panel, cancellation);
            }
            default: {
                throw new Error('Unknown webview provider type');
            }
        }
    }
    $disposeEdits(resourceComponents, viewType, editIds) {
        const document = this.getCustomDocumentEntry(viewType, resourceComponents);
        document.disposeEdits(editIds);
    }
    async $onMoveCustomEditor(handle, newResourceComponents, viewType) {
        const entry = this._editorProviders.get(viewType);
        if (!entry) {
            throw new Error(`No provider found for '${viewType}'`);
        }
        if (!entry.provider.moveCustomTextEditor) {
            throw new Error(`Provider does not implement move '${viewType}'`);
        }
        const webview = this._extHostWebviewPanels.getWebviewPanel(handle);
        if (!webview) {
            throw new Error(`No webview found`);
        }
        const resource = URI.revive(newResourceComponents);
        const document = this._extHostDocuments.getDocument(resource);
        await entry.provider.moveCustomTextEditor(document, webview, CancellationToken.None);
    }
    async $undo(resourceComponents, viewType, editId, isDirty) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        return entry.undo(editId, isDirty);
    }
    async $redo(resourceComponents, viewType, editId, isDirty) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        return entry.redo(editId, isDirty);
    }
    async $revert(resourceComponents, viewType, cancellation) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        const provider = this.getCustomEditorProvider(viewType);
        await provider.revertCustomDocument(entry.document, cancellation);
        entry.disposeBackup();
    }
    async $onSave(resourceComponents, viewType, cancellation) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        const provider = this.getCustomEditorProvider(viewType);
        await provider.saveCustomDocument(entry.document, cancellation);
        entry.disposeBackup();
    }
    async $onSaveAs(resourceComponents, viewType, targetResource, cancellation) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        const provider = this.getCustomEditorProvider(viewType);
        return provider.saveCustomDocumentAs(entry.document, URI.revive(targetResource), cancellation);
    }
    async $backup(resourceComponents, viewType, cancellation) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        const provider = this.getCustomEditorProvider(viewType);
        const backup = await provider.backupCustomDocument(entry.document, {
            destination: entry.getNewBackupUri(),
        }, cancellation);
        entry.updateBackup(backup);
        return backup.id;
    }
    getCustomDocumentEntry(viewType, resource) {
        const entry = this._documents.get(viewType, URI.revive(resource));
        if (!entry) {
            throw new Error('No custom document found');
        }
        return entry;
    }
    getCustomEditorProvider(viewType) {
        const entry = this._editorProviders.get(viewType);
        const provider = entry?.provider;
        if (!provider || !isCustomEditorProviderWithEditingCapability(provider)) {
            throw new Error('Custom document is not editable');
        }
        return provider;
    }
}
function isCustomEditorProviderWithEditingCapability(provider) {
    return !!provider.onDidChangeCustomDocument;
}
function isCustomTextEditorProvider(provider) {
    return typeof provider.resolveCustomTextEditor === 'function';
}
function isEditEvent(e) {
    return (typeof e.undo === 'function' &&
        typeof e.redo === 'function');
}
function hashPath(resource) {
    const str = resource.scheme === Schemas.file || resource.scheme === Schemas.untitled
        ? resource.fsPath
        : resource.toString();
    return hash(str) + '';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEN1c3RvbUVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q3VzdG9tRWRpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUloRSxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFBO0FBQzVELE9BQU8sRUFFTixvQ0FBb0MsRUFDcEMsZUFBZSxHQUNmLE1BQU0scUJBQXFCLENBQUE7QUFJNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNsQyxPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sS0FBSyxZQUFZLE1BQU0sbUJBQW1CLENBQUE7QUFFakQsTUFBTSx3QkFBd0I7SUFHN0IsWUFDaUIsUUFBK0IsRUFDOUIsWUFBNkI7UUFEOUIsYUFBUSxHQUFSLFFBQVEsQ0FBdUI7UUFDOUIsaUJBQVksR0FBWixZQUFZLENBQWlCO1FBSnZDLG1CQUFjLEdBQUcsQ0FBQyxDQUFBO1FBT1QsV0FBTSxHQUFHLElBQUksS0FBSyxDQUFpQyxrQkFBa0IsQ0FBQyxDQUFBO0lBRnBGLENBQUM7SUFNSixPQUFPLENBQUMsSUFBb0M7UUFDM0MsT0FBTyxJ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