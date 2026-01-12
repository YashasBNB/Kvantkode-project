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
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { dispose, Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { shouldSynchronizeModel } from '../../../editor/common/model.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { ExtHostContext, } from '../common/extHost.protocol.js';
import { ITextFileService, } from '../../services/textfile/common/textfiles.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { toLocalResource, extUri } from '../../../base/common/resources.js';
import { IWorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
export class BoundModelReferenceCollection {
    constructor(_extUri, _maxAge = 1000 * 60 * 3, // auto-dispse by age
    _maxLength = 1024 * 1024 * 80, // auto-dispose by total length
    _maxSize = 50) {
        this._extUri = _extUri;
        this._maxAge = _maxAge;
        this._maxLength = _maxLength;
        this._maxSize = _maxSize;
        this._data = new Array();
        this._length = 0;
        //
    }
    dispose() {
        this._data = dispose(this._data);
    }
    remove(uri) {
        for (const entry of [...this._data] /* copy array because dispose will modify it */) {
            if (this._extUri.isEqualOrParent(entry.uri, uri)) {
                entry.dispose();
            }
        }
    }
    add(uri, ref, length = 0) {
        // const length = ref.object.textEditorModel.getValueLength();
        const dispose = () => {
            const idx = this._data.indexOf(entry);
            if (idx >= 0) {
                this._length -= length;
                ref.dispose();
                clearTimeout(handle);
                this._data.splice(idx, 1);
            }
        };
        const handle = setTimeout(dispose, this._maxAge);
        const entry = { uri, length, dispose };
        this._data.push(entry);
        this._length += length;
        this._cleanup();
    }
    _cleanup() {
        // clean-up wrt total length
        while (this._length > this._maxLength) {
            this._data[0].dispose();
        }
        // clean-up wrt number of documents
        const extraSize = Math.ceil(this._maxSize * 1.2);
        if (this._data.length >= extraSize) {
            dispose(this._data.slice(0, extraSize - this._maxSize));
        }
    }
}
class ModelTracker extends Disposable {
    constructor(_model, _onIsCaughtUpWithContentChanges, _proxy, _textFileService) {
        super();
        this._model = _model;
        this._onIsCaughtUpWithContentChanges = _onIsCaughtUpWithContentChanges;
        this._proxy = _proxy;
        this._textFileService = _textFileService;
        this._knownVersionId = this._model.getVersionId();
        this._store.add(this._model.onDidChangeContent((e) => {
            this._knownVersionId = e.versionId;
            this._proxy.$acceptModelChanged(this._model.uri, e, this._textFileService.isDirty(this._model.uri));
            if (this.isCaughtUpWithContentChanges()) {
                this._onIsCaughtUpWithContentChanges.fire(this._model.uri);
            }
        }));
    }
    isCaughtUpWithContentChanges() {
        return this._model.getVersionId() === this._knownVersionId;
    }
}
let MainThreadDocuments = class MainThreadDocuments extends Disposable {
    constructor(extHostContext, _modelService, _textFileService, _fileService, _textModelResolverService, _environmentService, _uriIdentityService, workingCopyFileService, _pathService) {
        super();
        this._modelService = _modelService;
        this._textFileService = _textFileService;
        this._fileService = _fileService;
        this._textModelResolverService = _textModelResolverService;
        this._environmentService = _environmentService;
        this._uriIdentityService = _uriIdentityService;
        this._pathService = _pathService;
        this._onIsCaughtUpWithContentChanges = this._store.add(new Emitter());
        this.onIsCaughtUpWithContentChanges = this._onIsCaughtUpWithContentChanges.event;
        this._modelTrackers = new ResourceMap();
        this._modelReferenceCollection = this._store.add(new BoundModelReferenceCollection(_uriIdentityService.extUri));
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocuments);
        this._store.add(_modelService.onModelLanguageChanged(this._onModelModeChanged, this));
        this._store.add(_textFileService.files.onDidSave((e) => {
            if (this._shouldHandleFileEvent(e.model.resource)) {
                this._proxy.$acceptModelSaved(e.model.resource);
            }
        }));
        this._store.add(_textFileService.files.onDidChangeDirty((m) => {
            if (this._shouldHandleFileEvent(m.resource)) {
                this._proxy.$acceptDirtyStateChanged(m.resource, m.isDirty());
            }
        }));
        this._store.add(Event.any(_textFileService.files.onDidChangeEncoding, _textFileService.untitled.onDidChangeEncoding)((m) => {
            if (this._shouldHandleFileEvent(m.resource)) {
                const encoding = m.getEncoding();
                if (encoding) {
                    this._proxy.$acceptEncodingChanged(m.resource, encoding);
                }
            }
        }));
        this._store.add(workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => {
            const isMove = e.operation === 2 /* FileOperation.MOVE */;
            if (isMove || e.operation === 1 /* FileOperation.DELETE */) {
                for (const pair of e.files) {
                    const removed = isMove ? pair.source : pair.target;
                    if (removed) {
                        this._modelReferenceCollection.remove(removed);
                    }
                }
            }
        }));
    }
    dispose() {
        dispose(this._modelTrackers.values());
        this._modelTrackers.clear();
        super.dispose();
    }
    isCaughtUpWithContentChanges(resource) {
        const tracker = this._modelTrackers.get(resource);
        if (tracker) {
            return tracker.isCaughtUpWithContentChanges();
        }
        return true;
    }
    _shouldHandleFileEvent(resource) {
        const model = this._modelService.getModel(resource);
        return !!model && shouldSynchronizeModel(model);
    }
    handleModelAdded(model) {
        // Same filter as in mainThreadEditorsTracker
        if (!shouldSynchronizeModel(model)) {
            // don't synchronize too large models
            return;
        }
        this._modelTrackers.set(model.uri, new ModelTracker(model, this._onIsCaughtUpWithContentChanges, this._proxy, this._textFileService));
    }
    _onModelModeChanged(event) {
        const { model } = event;
        if (!this._modelTrackers.has(model.uri)) {
            return;
        }
        this._proxy.$acceptModelLanguageChanged(model.uri, model.getLanguageId());
    }
    handleModelRemoved(modelUrl) {
        if (!this._modelTrackers.has(modelUrl)) {
            return;
        }
        this._modelTrackers.get(modelUrl).dispose();
        this._modelTrackers.delete(modelUrl);
    }
    // --- from extension host process
    async $trySaveDocument(uri) {
        const target = await this._textFileService.save(URI.revive(uri));
        return Boolean(target);
    }
    async $tryOpenDocument(uriData, options) {
        const inputUri = URI.revive(uriData);
        if (!inputUri.scheme || !(inputUri.fsPath || inputUri.authority)) {
            throw new ErrorNoTelemetry(`Invalid uri. Scheme and authority or path must be set.`);
        }
        const canonicalUri = this._uriIdentityService.asCanonicalUri(inputUri);
        let promise;
        switch (canonicalUri.scheme) {
            case Schemas.untitled:
                promise = this._handleUntitledScheme(canonicalUri, options);
                break;
            case Schemas.file:
            default:
                promise = this._handleAsResourceInput(canonicalUri, options);
                break;
        }
        let documentUri;
        try {
            documentUri = await promise;
        }
        catch (err) {
            throw new ErrorNoTelemetry(`cannot open ${canonicalUri.toString()}. Detail: ${toErrorMessage(err)}`);
        }
        if (!documentUri) {
            throw new ErrorNoTelemetry(`cannot open ${canonicalUri.toString()}`);
        }
        else if (!extUri.isEqual(documentUri, canonicalUri)) {
            throw new ErrorNoTelemetry(`cannot open ${canonicalUri.toString()}. Detail: Actual document opened as ${documentUri.toString()}`);
        }
        else if (!this._modelTrackers.has(canonicalUri)) {
            throw new ErrorNoTelemetry(`cannot open ${canonicalUri.toString()}. Detail: Files above 50MB cannot be synchronized with extensions.`);
        }
        else {
            return canonicalUri;
        }
    }
    $tryCreateDocument(options) {
        return this._doCreateUntitled(undefined, options);
    }
    async _handleAsResourceInput(uri, options) {
        if (options?.encoding) {
            const model = await this._textFileService.files.resolve(uri, {
                encoding: options.encoding,
                reason: 2 /* TextFileResolveReason.REFERENCE */,
            });
            if (model.isDirty()) {
                throw new ErrorNoTelemetry(`Cannot re-open a dirty text document with different encoding. Save it first.`);
            }
            await model.setEncoding(options.encoding, 1 /* EncodingMode.Decode */);
        }
        const ref = await this._textModelResolverService.createModelReference(uri);
        this._modelReferenceCollection.add(uri, ref, ref.object.textEditorModel.getValueLength());
        return ref.object.textEditorModel.uri;
    }
    async _handleUntitledScheme(uri, options) {
        const asLocalUri = toLocalResource(uri, this._environmentService.remoteAuthority, this._pathService.defaultUriScheme);
        const exists = await this._fileService.exists(asLocalUri);
        if (exists) {
            // don't create a new file ontop of an existing file
            return Promise.reject(new Error('file already exists'));
        }
        return await this._doCreateUntitled(Boolean(uri.path) ? uri : undefined, options);
    }
    async _doCreateUntitled(associatedResource, options) {
        const model = this._textFileService.untitled.create({
            associatedResource,
            languageId: options?.language,
            initialValue: options?.content,
            encoding: options?.encoding,
        });
        const resource = model.resource;
        const ref = await this._textModelResolverService.createModelReference(resource);
        if (!this._modelTrackers.has(resource)) {
            ref.dispose();
            throw new Error(`expected URI ${resource.toString()} to have come to LIFE`);
        }
        this._modelReferenceCollection.add(resource, ref, ref.object.textEditorModel.getValueLength());
        Event.once(model.onDidRevert)(() => this._modelReferenceCollection.remove(resource));
        this._proxy.$acceptDirtyStateChanged(resource, true); // mark as dirty
        return resource;
    }
};
MainThreadDocuments = __decorate([
    __param(1, IModelService),
    __param(2, ITextFileService),
    __param(3, IFileService),
    __param(4, ITextModelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IUriIdentityService),
    __param(7, IWorkingCopyFileService),
    __param(8, IPathService)
], MainThreadDocuments);
export { MainThreadDocuments };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWREb2N1bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBYyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFjLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQWlCLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUNOLGNBQWMsR0FHZCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFHTixnQkFBZ0IsR0FFaEIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBVyxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JB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