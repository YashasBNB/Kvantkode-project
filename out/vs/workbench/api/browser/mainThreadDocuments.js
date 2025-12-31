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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRG9jdW1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQWMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBYyxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFpQixNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFDTixjQUFjLEdBR2QsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBR04sZ0JBQWdCLEdBRWhCLE1BQU0sNkNBQTZDLENBQUE7QUFFcEQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQVcsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixD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