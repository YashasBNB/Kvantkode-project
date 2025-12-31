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
var MainThreadCustomEditorModel_1;
import { multibyteAwareBtoa } from '../../../base/browser/dom.js';
import { createCancelablePromise } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { isCancellationError, onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { basename } from '../../../base/common/path.js';
import { isEqual, isEqualOrParent, toLocalResource } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { localize } from '../../../nls.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IUndoRedoService, } from '../../../platform/undoRedo/common/undoRedo.js';
import { reviveWebviewExtension } from './mainThreadWebviews.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { CustomEditorInput } from '../../contrib/customEditor/browser/customEditorInput.js';
import { ICustomEditorService, } from '../../contrib/customEditor/common/customEditor.js';
import { CustomTextEditorModel } from '../../contrib/customEditor/common/customTextEditorModel.js';
import { ExtensionKeyedWebviewOriginStore, } from '../../contrib/webview/browser/webview.js';
import { IWebviewWorkbenchService } from '../../contrib/webviewPanel/browser/webviewWorkbenchService.js';
import { editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { ResourceWorkingCopy } from '../../services/workingCopy/common/resourceWorkingCopy.js';
import { NO_TYPE_ID, } from '../../services/workingCopy/common/workingCopy.js';
import { IWorkingCopyFileService, } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
var CustomEditorModelType;
(function (CustomEditorModelType) {
    CustomEditorModelType[CustomEditorModelType["Custom"] = 0] = "Custom";
    CustomEditorModelType[CustomEditorModelType["Text"] = 1] = "Text";
})(CustomEditorModelType || (CustomEditorModelType = {}));
let MainThreadCustomEditors = class MainThreadCustomEditors extends Disposable {
    constructor(context, mainThreadWebview, mainThreadWebviewPanels, extensionService, storageService, workingCopyService, workingCopyFileService, _customEditorService, _editorGroupService, _editorService, _instantiationService, _webviewWorkbenchService, _uriIdentityService) {
        super();
        this.mainThreadWebview = mainThreadWebview;
        this.mainThreadWebviewPanels = mainThreadWebviewPanels;
        this._customEditorService = _customEditorService;
        this._editorGroupService = _editorGroupService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this._uriIdentityService = _uriIdentityService;
        this._editorProviders = this._register(new DisposableMap());
        this._editorRenameBackups = new Map();
        this._webviewOriginStore = new ExtensionKeyedWebviewOriginStore('mainThreadCustomEditors.origins', storageService);
        this._proxyCustomEditors = context.getProxy(extHostProtocol.ExtHostContext.ExtHostCustomEditors);
        this._register(workingCopyFileService.registerWorkingCopyProvider((editorResource) => {
            const matchedWorkingCopies = [];
            for (const workingCopy of workingCopyService.workingCopies) {
                if (workingCopy instanceof MainThreadCustomEditorModel) {
                    if (isEqualOrParent(editorResource, workingCopy.editorResource)) {
                        matchedWorkingCopies.push(workingCopy);
                    }
                }
            }
            return matchedWorkingCopies;
        }));
        // This reviver's only job is to activate custom editor extensions.
        this._register(_webviewWorkbenchService.registerResolver({
            canResolve: (webview) => {
                if (webview instanceof CustomEditorInput) {
                    extensionService.activateByEvent(`onCustomEditor:${webview.viewType}`);
                }
                return false;
            },
            resolveWebview: () => {
                throw new Error('not implemented');
            },
        }));
        // Working copy operations
        this._register(workingCopyFileService.onWillRunWorkingCopyFileOperation(async (e) => this.onWillRunWorkingCopyFileOperation(e)));
    }
    $registerTextEditorProvider(extensionData, viewType, options, capabilities, serializeBuffersForPostMessage) {
        this.registerEditorProvider(1 /* CustomEditorModelType.Text */, reviveWebviewExtension(extensionData), viewType, options, capabilities, true, serializeBuffersForPostMessage);
    }
    $registerCustomEditorProvider(extensionData, viewType, options, supportsMultipleEditorsPerDocument, serializeBuffersForPostMessage) {
        this.registerEditorProvider(0 /* CustomEditorModelType.Custom */, reviveWebviewExtension(extensionData), viewType, options, {}, supportsMultipleEditorsPerDocument, serializeBuffersForPostMessage);
    }
    registerEditorProvider(modelType, extension, viewType, options, capabilities, supportsMultipleEditorsPerDocument, serializeBuffersForPostMessage) {
        if (this._editorProviders.has(viewType)) {
            throw new Error(`Provider for ${viewType} already registered`);
        }
        const disposables = new DisposableStore();
        disposables.add(this._customEditorService.registerCustomEditorCapabilities(viewType, {
            supportsMultipleEditorsPerDocument,
        }));
        disposables.add(this._webviewWorkbenchService.registerResolver({
            canResolve: (webviewInput) => {
                return webviewInput instanceof CustomEditorInput && webviewInput.viewType === viewType;
            },
            resolveWebview: async (webviewInput, cancellation) => {
                const handle = generateUuid();
                const resource = webviewInput.resource;
                webviewInput.webview.origin = this._webviewOriginStore.getOrigin(viewType, extension.id);
                this.mainThreadWebviewPanels.addWebviewInput(handle, webviewInput, {
                    serializeBuffersForPostMessage,
                });
                webviewInput.webview.options = options;
                webviewInput.webview.extension = extension;
                // If there's an old resource this was a move and we must resolve the backup at the same time as the webview
                // This is because the backup must be ready upon model creation, and the input resolve method comes after
                let backupId = webviewInput.backupId;
                if (webviewInput.oldResource && !webviewInput.backupId) {
                    const backup = this._editorRenameBackups.get(webviewInput.oldResource.toString());
                    backupId = backup?.backupId;
                    this._editorRenameBackups.delete(webviewInput.oldResource.toString());
                }
                let modelRef;
                try {
                    modelRef = await this.getOrCreateCustomEditorModel(modelType, resource, viewType, { backupId }, cancellation);
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewInput.webview.setHtml(this.mainThreadWebview.getWebviewResolvedFailedContent(viewType));
                    return;
                }
                if (cancellation.isCancellationRequested) {
                    modelRef.dispose();
                    return;
                }
                const disposeSub = webviewInput.webview.onDidDispose(() => {
                    disposeSub.dispose();
                    // If the model is still dirty, make sure we have time to save it
                    if (modelRef.object.isDirty()) {
                        const sub = modelRef.object.onDidChangeDirty(() => {
                            if (!modelRef.object.isDirty()) {
                                sub.dispose();
                                modelRef.dispose();
                            }
                        });
                        return;
                    }
                    modelRef.dispose();
                });
                if (capabilities.supportsMove) {
                    webviewInput.onMove(async (newResource) => {
                        const oldModel = modelRef;
                        modelRef = await this.getOrCreateCustomEditorModel(modelType, newResource, viewType, {}, CancellationToken.None);
                        this._proxyCustomEditors.$onMoveCustomEditor(handle, newResource, viewType);
                        oldModel.dispose();
                    });
                }
                try {
                    await this._proxyCustomEditors.$resolveCustomEditor(this._uriIdentityService.asCanonicalUri(resource), handle, viewType, {
                        title: webviewInput.getTitle(),
                        contentOptions: webviewInput.webview.contentOptions,
                        options: webviewInput.webview.options,
                        active: webviewInput === this._editorService.activeEditor,
                    }, editorGroupToColumn(this._editorGroupService, webviewInput.group || 0), cancellation);
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewInput.webview.setHtml(this.mainThreadWebview.getWebviewResolvedFailedContent(viewType));
                    modelRef.dispose();
                    return;
                }
            },
        }));
        this._editorProviders.set(viewType, disposables);
    }
    $unregisterEditorProvider(viewType) {
        if (!this._editorProviders.has(viewType)) {
            throw new Error(`No provider for ${viewType} registered`);
        }
        this._editorProviders.deleteAndDispose(viewType);
        this._customEditorService.models.disposeAllModelsForView(viewType);
    }
    async getOrCreateCustomEditorModel(modelType, resource, viewType, options, cancellation) {
        const existingModel = this._customEditorService.models.tryRetain(resource, viewType);
        if (existingModel) {
            return existingModel;
        }
        switch (modelType) {
            case 1 /* CustomEditorModelType.Text */: {
                const model = CustomTextEditorModel.create(this._instantiationService, viewType, resource);
                return this._customEditorService.models.add(resource, viewType, model);
            }
            case 0 /* CustomEditorModelType.Custom */: {
                const model = MainThreadCustomEditorModel.create(this._instantiationService, this._proxyCustomEditors, viewType, resource, options, () => {
                    return Array.from(this.mainThreadWebviewPanels.webviewInputs).filter((editor) => editor instanceof CustomEditorInput && isEqual(editor.resource, resource));
                }, cancellation);
                return this._customEditorService.models.add(resource, viewType, model);
            }
        }
    }
    async $onDidEdit(resourceComponents, viewType, editId, label) {
        const model = await this.getCustomEditorModel(resourceComponents, viewType);
        model.pushEdit(editId, label);
    }
    async $onContentChange(resourceComponents, viewType) {
        const model = await this.getCustomEditorModel(resourceComponents, viewType);
        model.changeContent();
    }
    async getCustomEditorModel(resourceComponents, viewType) {
        const resource = URI.revive(resourceComponents);
        const model = await this._customEditorService.models.get(resource, viewType);
        if (!model || !(model instanceof MainThreadCustomEditorModel)) {
            throw new Error('Could not find model for webview editor');
        }
        return model;
    }
    //#region Working Copy
    async onWillRunWorkingCopyFileOperation(e) {
        if (e.operation !== 2 /* FileOperation.MOVE */) {
            return;
        }
        e.waitUntil((async () => {
            const models = [];
            for (const file of e.files) {
                if (file.source) {
                    models.push(...(await this._customEditorService.models.getAllModels(file.source)));
                }
            }
            for (const model of models) {
                if (model instanceof MainThreadCustomEditorModel && model.isDirty()) {
                    const workingCopy = await model.backup(CancellationToken.None);
                    if (workingCopy.meta) {
                        // This cast is safe because we do an instanceof check above and a custom document backup data is always returned
                        this._editorRenameBackups.set(model.editorResource.toString(), workingCopy.meta);
                    }
                }
            }
        })());
    }
};
MainThreadCustomEditors = __decorate([
    __param(3, IExtensionService),
    __param(4, IStorageService),
    __param(5, IWorkingCopyService),
    __param(6, IWorkingCopyFileService),
    __param(7, ICustomEditorService),
    __param(8, IEditorGroupsService),
    __param(9, IEditorService),
    __param(10, IInstantiationService),
    __param(11, IWebviewWorkbenchService),
    __param(12, IUriIdentityService)
], MainThreadCustomEditors);
export { MainThreadCustomEditors };
var HotExitState;
(function (HotExitState) {
    let Type;
    (function (Type) {
        Type[Type["Allowed"] = 0] = "Allowed";
        Type[Type["NotAllowed"] = 1] = "NotAllowed";
        Type[Type["Pending"] = 2] = "Pending";
    })(Type = HotExitState.Type || (HotExitState.Type = {}));
    HotExitState.Allowed = Object.freeze({ type: 0 /* Type.Allowed */ });
    HotExitState.NotAllowed = Object.freeze({ type: 1 /* Type.NotAllowed */ });
    class Pending {
        constructor(operation) {
            this.operation = operation;
            this.type = 2 /* Type.Pending */;
        }
    }
    HotExitState.Pending = Pending;
})(HotExitState || (HotExitState = {}));
let MainThreadCustomEditorModel = MainThreadCustomEditorModel_1 = class MainThreadCustomEditorModel extends ResourceWorkingCopy {
    static async create(instantiationService, proxy, viewType, resource, options, getEditors, cancellation) {
        const editors = getEditors();
        let untitledDocumentData;
        if (editors.length !== 0) {
            untitledDocumentData = editors[0].untitledDocumentData;
        }
        const { editable } = await proxy.$createCustomDocument(resource, viewType, options.backupId, untitledDocumentData, cancellation);
        return instantiationService.createInstance(MainThreadCustomEditorModel_1, proxy, viewType, resource, !!options.backupId, editable, !!untitledDocumentData, getEditors);
    }
    constructor(_proxy, _viewType, _editorResource, fromBackup, _editable, startDirty, _getEditors, _fileDialogService, fileService, _labelService, _undoService, _environmentService, workingCopyService, _pathService, extensionService) {
        super(MainThreadCustomEditorModel_1.toWorkingCopyResource(_viewType, _editorResource), fileService);
        this._proxy = _proxy;
        this._viewType = _viewType;
        this._editorResource = _editorResource;
        this._editable = _editable;
        this._getEditors = _getEditors;
        this._fileDialogService = _fileDialogService;
        this._labelService = _labelService;
        this._undoService = _undoService;
        this._environmentService = _environmentService;
        this._pathService = _pathService;
        this._fromBackup = false;
        this._hotExitState = HotExitState.Allowed;
        this._currentEditIndex = -1;
        this._savePoint = -1;
        this._edits = [];
        this._isDirtyFromContentChange = false;
        // TODO@mjbvz consider to enable a `typeId` that is specific for custom
        // editors. Using a distinct `typeId` allows the working copy to have
        // any resource (including file based resources) even if other working
        // copies exist with the same resource.
        //
        // IMPORTANT: changing the `typeId` has an impact on backups for this
        // working copy. Any value that is not the empty string will be used
        // as seed to the backup. Only change the `typeId` if you have implemented
        // a fallback solution to resolve any existing backups that do not have
        // this seed.
        this.typeId = NO_TYPE_ID;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this.onDidChangeReadonly = Event.None;
        this._fromBackup = fromBackup;
        if (_editable) {
            this._register(workingCopyService.registerWorkingCopy(this));
            this._register(extensionService.onWillStop((e) => {
                e.veto(true, localize('vetoExtHostRestart', "An extension provided editor for '{0}' is still open that would close otherwise.", this.name));
            }));
        }
        // Normally means we're re-opening an untitled file
        if (startDirty) {
            this._isDirtyFromContentChange = true;
        }
    }
    get editorResource() {
        return this._editorResource;
    }
    dispose() {
        if (this._editable) {
            this._undoService.removeElements(this._editorResource);
        }
        this._proxy.$disposeCustomDocument(this._editorResource, this._viewType);
        super.dispose();
    }
    //#region IWorkingCopy
    // Make sure each custom editor has a unique resource for backup and edits
    static toWorkingCopyResource(viewType, resource) {
        const authority = viewType.replace(/[^a-z0-9\-_]/gi, '-');
        const path = `/${multibyteAwareBtoa(resource.with({ query: null, fragment: null }).toString(true))}`;
        return URI.from({
            scheme: Schemas.vscodeCustomEditor,
            authority: authority,
            path: path,
            query: JSON.stringify(resource.toJSON()),
        });
    }
    get name() {
        return basename(this._labelService.getUriLabel(this._editorResource));
    }
    get capabilities() {
        return this.isUntitled() ? 2 /* WorkingCopyCapabilities.Untitled */ : 0 /* WorkingCopyCapabilities.None */;
    }
    isDirty() {
        if (this._isDirtyFromContentChange) {
            return true;
        }
        if (this._edits.length > 0) {
            return this._savePoint !== this._currentEditIndex;
        }
        return this._fromBackup;
    }
    isUntitled() {
        return this._editorResource.scheme === Schemas.untitled;
    }
    //#endregion
    isReadonly() {
        return !this._editable;
    }
    get viewType() {
        return this._viewType;
    }
    get backupId() {
        return this._backupId;
    }
    pushEdit(editId, label) {
        if (!this._editable) {
            throw new Error('Document is not editable');
        }
        this.change(() => {
            this.spliceEdits(editId);
            this._currentEditIndex = this._edits.length - 1;
        });
        this._undoService.pushElement({
            type: 0 /* UndoRedoElementType.Resource */,
            resource: this._editorResource,
            label: label ?? localize('defaultEditLabel', 'Edit'),
            code: 'undoredo.customEditorEdit',
            undo: () => this.undo(),
            redo: () => this.redo(),
        });
    }
    changeContent() {
        this.change(() => {
            this._isDirtyFromContentChange = true;
        });
    }
    async undo() {
        if (!this._editable) {
            return;
        }
        if (this._currentEditIndex < 0) {
            // nothing to undo
            return;
        }
        const undoneEdit = this._edits[this._currentEditIndex];
        this.change(() => {
            --this._currentEditIndex;
        });
        await this._proxy.$undo(this._editorResource, this.viewType, undoneEdit, this.isDirty());
    }
    async redo() {
        if (!this._editable) {
            return;
        }
        if (this._currentEditIndex >= this._edits.length - 1) {
            // nothing to redo
            return;
        }
        const redoneEdit = this._edits[this._currentEditIndex + 1];
        this.change(() => {
            ++this._currentEditIndex;
        });
        await this._proxy.$redo(this._editorResource, this.viewType, redoneEdit, this.isDirty());
    }
    spliceEdits(editToInsert) {
        const start = this._currentEditIndex + 1;
        const toRemove = this._edits.length - this._currentEditIndex;
        const removedEdits = typeof editToInsert === 'number'
            ? this._edits.splice(start, toRemove, editToInsert)
            : this._edits.splice(start, toRemove);
        if (removedEdits.length) {
            this._proxy.$disposeEdits(this._editorResource, this._viewType, removedEdits);
        }
    }
    change(makeEdit) {
        const wasDirty = this.isDirty();
        makeEdit();
        this._onDidChangeContent.fire();
        if (this.isDirty() !== wasDirty) {
            this._onDidChangeDirty.fire();
        }
    }
    async revert(options) {
        if (!this._editable) {
            return;
        }
        if (this._currentEditIndex === this._savePoint &&
            !this._isDirtyFromContentChange &&
            !this._fromBackup) {
            return;
        }
        if (!options?.soft) {
            this._proxy.$revert(this._editorResource, this.viewType, CancellationToken.None);
        }
        this.change(() => {
            this._isDirtyFromContentChange = false;
            this._fromBackup = false;
            this._currentEditIndex = this._savePoint;
            this.spliceEdits();
        });
    }
    async save(options) {
        const result = !!(await this.saveCustomEditor(options));
        // Emit Save Event
        if (result) {
            this._onDidSave.fire({ reason: options?.reason, source: options?.source });
        }
        return result;
    }
    async saveCustomEditor(options) {
        if (!this._editable) {
            return undefined;
        }
        if (this.isUntitled()) {
            const targetUri = await this.suggestUntitledSavePath(options);
            if (!targetUri) {
                return undefined;
            }
            await this.saveCustomEditorAs(this._editorResource, targetUri, options);
            return targetUri;
        }
        const savePromise = createCancelablePromise((token) => this._proxy.$onSave(this._editorResource, this.viewType, token));
        this._ongoingSave?.cancel();
        this._ongoingSave = savePromise;
        try {
            await savePromise;
            if (this._ongoingSave === savePromise) {
                // Make sure we are still doing the same save
                this.change(() => {
                    this._isDirtyFromContentChange = false;
                    this._savePoint = this._currentEditIndex;
                    this._fromBackup = false;
                });
            }
        }
        finally {
            if (this._ongoingSave === savePromise) {
                // Make sure we are still doing the same save
                this._ongoingSave = undefined;
            }
        }
        return this._editorResource;
    }
    suggestUntitledSavePath(options) {
        if (!this.isUntitled()) {
            throw new Error('Resource is not untitled');
        }
        const remoteAuthority = this._environmentService.remoteAuthority;
        const localResource = toLocalResource(this._editorResource, remoteAuthority, this._pathService.defaultUriScheme);
        return this._fileDialogService.pickFileToSave(localResource, options?.availableFileSystems);
    }
    async saveCustomEditorAs(resource, targetResource, _options) {
        if (this._editable) {
            // TODO: handle cancellation
            await createCancelablePromise((token) => this._proxy.$onSaveAs(this._editorResource, this.viewType, targetResource, token));
            this.change(() => {
                this._savePoint = this._currentEditIndex;
            });
            return true;
        }
        else {
            // Since the editor is readonly, just copy the file over
            await this.fileService.copy(resource, targetResource, false /* overwrite */);
            return true;
        }
    }
    get canHotExit() {
        return (typeof this._backupId === 'string' && this._hotExitState.type === 0 /* HotExitState.Type.Allowed */);
    }
    async backup(token) {
        const editors = this._getEditors();
        if (!editors.length) {
            throw new Error('No editors found for resource, cannot back up');
        }
        const primaryEditor = editors[0];
        const backupMeta = {
            viewType: this.viewType,
            editorResource: this._editorResource,
            backupId: '',
            extension: primaryEditor.extension
                ? {
                    id: primaryEditor.extension.id.value,
                    location: primaryEditor.extension.location,
                }
                : undefined,
            webview: {
                origin: primaryEditor.webview.origin,
                options: primaryEditor.webview.options,
                state: primaryEditor.webview.state,
            },
        };
        const backupData = {
            meta: backupMeta,
        };
        if (!this._editable) {
            return backupData;
        }
        if (this._hotExitState.type === 2 /* HotExitState.Type.Pending */) {
            this._hotExitState.operation.cancel();
        }
        const pendingState = new HotExitState.Pending(createCancelablePromise((token) => this._proxy.$backup(this._editorResource.toJSON(), this.viewType, token)));
        this._hotExitState = pendingState;
        token.onCancellationRequested(() => {
            pendingState.operation.cancel();
        });
        let errorMessage = '';
        try {
            const backupId = await pendingState.operation;
            // Make sure state has not changed in the meantime
            if (this._hotExitState === pendingState) {
                this._hotExitState = HotExitState.Allowed;
                backupData.meta.backupId = backupId;
                this._backupId = backupId;
            }
        }
        catch (e) {
            if (isCancellationError(e)) {
                // This is expected
                throw e;
            }
            // Otherwise it could be a real error. Make sure state has not changed in the meantime.
            if (this._hotExitState === pendingState) {
                this._hotExitState = HotExitState.NotAllowed;
            }
            if (e.message) {
                errorMessage = e.message;
            }
        }
        if (this._hotExitState === HotExitState.Allowed) {
            return backupData;
        }
        throw new Error(`Cannot backup in this state: ${errorMessage}`);
    }
};
MainThreadCustomEditorModel = MainThreadCustomEditorModel_1 = __decorate([
    __param(7, IFileDialogService),
    __param(8, IFileService),
    __param(9, ILabelService),
    __param(10, IUndoRedoService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IWorkingCopyService),
    __param(13, IPathService),
    __param(14, IExtensionService)
], MainThreadCustomEditorModel);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEN1c3RvbUVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEN1c3RvbUVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2pFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsR0FFZixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0YsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2hGLE9BQU8sRUFBaUIsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7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