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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEN1c3RvbUVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDdXN0b21FZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBSWhFLE9BQU8sS0FBSyxjQUFjLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxFQUVOLG9DQUFvQyxFQUNwQyxlQUFlLEdBQ2YsTUFBTSxxQkFBcUIsQ0FBQTtBQUk1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ2xDLE9BQU8sS0FBSyxlQUFlLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxLQUFLLFlBQVksTUFBTSxtQkFBbUIsQ0FBQTtBQUVqRCxNQUFNLHdCQUF3QjtJQUc3QixZQUNpQixRQUErQixFQUM5QixZQUE2QjtRQUQ5QixhQUFRLEdBQVIsUUFBUSxDQUF1QjtRQUM5QixpQkFBWSxHQUFaLFlBQVksQ0FBaUI7UUFKdkMsbUJBQWMsR0FBRyxDQUFDLENBQUE7UUFPVCxXQUFNLEdBQUcsSUFBSSxLQUFLLENBQWlDLGtCQUFrQixDQUFDLENBQUE7SUFGcEYsQ0FBQztJQU1KLE9BQU8sQ0FBQyxJQUFvQztRQUMzQyxP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