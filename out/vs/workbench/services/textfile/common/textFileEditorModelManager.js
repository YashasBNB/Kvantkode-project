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
import { localize } from '../../../../nls.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { TextFileEditorModel } from './textFileEditorModel.js';
import { dispose, Disposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { Promises, ResourceQueue } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { TextFileSaveParticipant } from './textFileSaveParticipant.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IWorkingCopyFileService, } from '../../workingCopy/common/workingCopyFileService.js';
import { extname, joinPath } from '../../../../base/common/resources.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../editor/common/model/textModel.js';
import { PLAINTEXT_EXTENSION, PLAINTEXT_LANGUAGE_ID, } from '../../../../editor/common/languages/modesRegistry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
let TextFileEditorModelManager = class TextFileEditorModelManager extends Disposable {
    get models() {
        return [...this.mapResourceToModel.values()];
    }
    constructor(instantiationService, fileService, notificationService, workingCopyFileService, uriIdentityService) {
        super();
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.notificationService = notificationService;
        this.workingCopyFileService = workingCopyFileService;
        this.uriIdentityService = uriIdentityService;
        this._onDidCreate = this._register(new Emitter({
            leakWarningThreshold: 500 /* increased for users with hundreds of inputs opened */,
        }));
        this.onDidCreate = this._onDidCreate.event;
        this._onDidResolve = this._register(new Emitter());
        this.onDidResolve = this._onDidResolve.event;
        this._onDidRemove = this._register(new Emitter());
        this.onDidRemove = this._onDidRemove.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeReadonly = this._register(new Emitter());
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        this._onDidChangeOrphaned = this._register(new Emitter());
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this._onDidSaveError = this._register(new Emitter());
        this.onDidSaveError = this._onDidSaveError.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidRevert = this._register(new Emitter());
        this.onDidRevert = this._onDidRevert.event;
        this._onDidChangeEncoding = this._register(new Emitter());
        this.onDidChangeEncoding = this._onDidChangeEncoding.event;
        this.mapResourceToModel = new ResourceMap();
        this.mapResourceToModelListeners = new ResourceMap();
        this.mapResourceToDisposeListener = new ResourceMap();
        this.mapResourceToPendingModelResolvers = new ResourceMap();
        this.modelResolveQueue = this._register(new ResourceQueue());
        this.saveErrorHandler = (() => {
            const notificationService = this.notificationService;
            return {
                onSaveError(error, model) {
                    notificationService.error(localize({
                        key: 'genericSaveError',
                        comment: ['{0} is the resource that failed to save and {1} the error message'],
                    }, "Failed to save '{0}': {1}", model.name, toErrorMessage(error, false)));
                },
            };
        })();
        this.mapCorrelationIdToModelsToRestore = new Map();
        this.saveParticipants = this._register(this.instantiationService.createInstance(TextFileSaveParticipant));
        this.registerListeners();
    }
    registerListeners() {
        // Update models from file change events
        this._register(this.fileService.onDidFilesChange((e) => this.onDidFilesChange(e)));
        // File system provider changes
        this._register(this.fileService.onDidChangeFileSystemProviderCapabilities((e) => this.onDidChangeFileSystemProviderCapabilities(e)));
        this._register(this.fileService.onDidChangeFileSystemProviderRegistrations((e) => this.onDidChangeFileSystemProviderRegistrations(e)));
        // Working copy operations
        this._register(this.workingCopyFileService.onWillRunWorkingCopyFileOperation((e) => this.onWillRunWorkingCopyFileOperation(e)));
        this._register(this.workingCopyFileService.onDidFailWorkingCopyFileOperation((e) => this.onDidFailWorkingCopyFileOperation(e)));
        this._register(this.workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => this.onDidRunWorkingCopyFileOperation(e)));
    }
    onDidFilesChange(e) {
        for (const model of this.models) {
            if (model.isDirty()) {
                continue; // never reload dirty models
            }
            // Trigger a model resolve for any update or add event that impacts
            // the model. We also consider the added event because it could
            // be that a file was added and updated right after.
            if (e.contains(model.resource, 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */)) {
                this.queueModelReload(model);
            }
        }
    }
    onDidChangeFileSystemProviderCapabilities(e) {
        // Resolve models again for file systems that changed
        // capabilities to fetch latest metadata (e.g. readonly)
        // into all models.
        this.queueModelReloads(e.scheme);
    }
    onDidChangeFileSystemProviderRegistrations(e) {
        if (!e.added) {
            return; // only if added
        }
        // Resolve models again for file systems that registered
        // to account for capability changes: extensions may
        // unregister and register the same provider with different
        // capabilities, so we want to ensure to fetch latest
        // metadata (e.g. readonly) into all models.
        this.queueModelReloads(e.scheme);
    }
    queueModelReloads(scheme) {
        for (const model of this.models) {
            if (model.isDirty()) {
                continue; // never reload dirty models
            }
            if (scheme === model.resource.scheme) {
                this.queueModelReload(model);
            }
        }
    }
    queueModelReload(model) {
        // Resolve model to update (use a queue to prevent accumulation of resolves
        // when the resolve actually takes long. At most we only want the queue
        // to have a size of 2 (1 running resolve and 1 queued resolve).
        const queueSize = this.modelResolveQueue.queueSize(model.resource);
        if (queueSize <= 1) {
            this.modelResolveQueue.queueFor(model.resource, async () => {
                try {
                    await this.reload(model);
                }
                catch (error) {
                    onUnexpectedError(error);
                }
            });
        }
    }
    onWillRunWorkingCopyFileOperation(e) {
        // Move / Copy: remember models to restore after the operation
        if (e.operation === 2 /* FileOperation.MOVE */ || e.operation === 3 /* FileOperation.COPY */) {
            const modelsToRestore = [];
            for (const { source, target } of e.files) {
                if (source) {
                    if (this.uriIdentityService.extUri.isEqual(source, target)) {
                        continue; // ignore if resources are considered equal
                    }
                    // find all models that related to source (can be many if resource is a folder)
                    const sourceModels = [];
                    for (const model of this.models) {
                        if (this.uriIdentityService.extUri.isEqualOrParent(model.resource, source)) {
                            sourceModels.push(model);
                        }
                    }
                    // remember each source model to resolve again after move is done
                    // with optional content to restore if it was dirty
                    for (const sourceModel of sourceModels) {
                        const sourceModelResource = sourceModel.resource;
                        // If the source is the actual model, just use target as new resource
                        let targetModelResource;
                        if (this.uriIdentityService.extUri.isEqual(sourceModelResource, source)) {
                            targetModelResource = target;
                        }
                        // Otherwise a parent folder of the source is being moved, so we need
                        // to compute the target resource based on that
                        else {
                            targetModelResource = joinPath(target, sourceModelResource.path.substr(source.path.length + 1));
                        }
                        const languageId = sourceModel.getLanguageId();
                        modelsToRestore.push({
                            source: sourceModelResource,
                            target: targetModelResource,
                            language: languageId
                                ? {
                                    id: languageId,
                                    explicit: sourceModel.languageChangeSource === 'user',
                                }
                                : undefined,
                            encoding: sourceModel.getEncoding(),
                            snapshot: sourceModel.isDirty() ? sourceModel.createSnapshot() : undefined,
                        });
                    }
                }
            }
            this.mapCorrelationIdToModelsToRestore.set(e.correlationId, modelsToRestore);
        }
    }
    onDidFailWorkingCopyFileOperation(e) {
        // Move / Copy: restore dirty flag on models to restore that were dirty
        if (e.operation === 2 /* FileOperation.MOVE */ || e.operation === 3 /* FileOperation.COPY */) {
            const modelsToRestore = this.mapCorrelationIdToModelsToRestore.get(e.correlationId);
            if (modelsToRestore) {
                this.mapCorrelationIdToModelsToRestore.delete(e.correlationId);
                modelsToRestore.forEach((model) => {
                    // snapshot presence means this model used to be dirty and so we restore that
                    // flag. we do NOT have to restore the content because the model was only soft
                    // reverted and did not loose its original dirty contents.
                    if (model.snapshot) {
                        this.get(model.source)?.setDirty(true);
                    }
                });
            }
        }
    }
    onDidRunWorkingCopyFileOperation(e) {
        switch (e.operation) {
            // Create: Revert existing models
            case 0 /* FileOperation.CREATE */:
                e.waitUntil((async () => {
                    for (const { target } of e.files) {
                        const model = this.get(target);
                        if (model && !model.isDisposed()) {
                            await model.revert();
                        }
                    }
                })());
                break;
            // Move/Copy: restore models that were resolved before the operation took place
            case 2 /* FileOperation.MOVE */:
            case 3 /* FileOperation.COPY */:
                e.waitUntil((async () => {
                    const modelsToRestore = this.mapCorrelationIdToModelsToRestore.get(e.correlationId);
                    if (modelsToRestore) {
                        this.mapCorrelationIdToModelsToRestore.delete(e.correlationId);
                        await Promises.settled(modelsToRestore.map(async (modelToRestore) => {
                            // From this moment on, only operate on the canonical resource
                            // to fix a potential data loss issue:
                            // https://github.com/microsoft/vscode/issues/211374
                            const target = this.uriIdentityService.asCanonicalUri(modelToRestore.target);
                            // restore the model at the target. if we have previous dirty content, we pass it
                            // over to be used, otherwise we force a reload from disk. this is important
                            // because we know the file has changed on disk after the move and the model might
                            // have still existed with the previous state. this ensures that the model is not
                            // tracking a stale state.
                            const restoredModel = await this.resolve(target, {
                                reload: { async: false }, // enforce a reload
                                contents: modelToRestore.snapshot
                                    ? createTextBufferFactoryFromSnapshot(modelToRestore.snapshot)
                                    : undefined,
                                encoding: modelToRestore.encoding,
                            });
                            // restore model language only if it is specific
                            if (modelToRestore.language?.id &&
                                modelToRestore.language.id !== PLAINTEXT_LANGUAGE_ID) {
                                // an explicitly set language is restored via `setLanguageId`
                                // to preserve it as explicitly set by the user.
                                // (https://github.com/microsoft/vscode/issues/203648)
                                if (modelToRestore.language.explicit) {
                                    restoredModel.setLanguageId(modelToRestore.language.id);
                                }
                                // otherwise, a model language is applied via lower level
                                // APIs to not confuse it with an explicitly set language.
                                // (https://github.com/microsoft/vscode/issues/125795)
                                else if (restoredModel.getLanguageId() === PLAINTEXT_LANGUAGE_ID &&
                                    extname(target) !== PLAINTEXT_EXTENSION) {
                                    restoredModel.updateTextEditorModel(undefined, modelToRestore.language.id);
                                }
                            }
                        }));
                    }
                })());
                break;
        }
    }
    get(resource) {
        return this.mapResourceToModel.get(resource);
    }
    has(resource) {
        return this.mapResourceToModel.has(resource);
    }
    async reload(model) {
        // Await a pending model resolve first before proceeding
        // to ensure that we never resolve a model more than once
        // in parallel.
        await this.joinPendingResolves(model.resource);
        if (model.isDirty() || model.isDisposed() || !this.has(model.resource)) {
            return; // the model possibly got dirty or disposed, so return early then
        }
        // Trigger reload
        await this.doResolve(model, { reload: { async: false } });
    }
    async resolve(resource, options) {
        // Await a pending model resolve first before proceeding
        // to ensure that we never resolve a model more than once
        // in parallel.
        const pendingResolve = this.joinPendingResolves(resource);
        if (pendingResolve) {
            await pendingResolve;
        }
        // Trigger resolve
        return this.doResolve(resource, options);
    }
    async doResolve(resourceOrModel, options) {
        let model;
        let resource;
        if (URI.isUri(resourceOrModel)) {
            resource = resourceOrModel;
            model = this.get(resource);
        }
        else {
            resource = resourceOrModel.resource;
            model = resourceOrModel;
        }
        let modelResolve;
        let didCreateModel = false;
        // Model exists
        if (model) {
            // Always reload if contents are provided
            if (options?.contents) {
                modelResolve = model.resolve(options);
            }
            // Reload async or sync based on options
            else if (options?.reload) {
                // async reload: trigger a reload but return immediately
                if (options.reload.async) {
                    modelResolve = Promise.resolve();
                    (async () => {
                        try {
                            await model.resolve(options);
                        }
                        catch (error) {
                            if (!model.isDisposed()) {
                                onUnexpectedError(error); // only log if the model is still around
                            }
                        }
                    })();
                }
                // sync reload: do not return until model reloaded
                else {
                    modelResolve = model.resolve(options);
                }
            }
            // Do not reload
            else {
                modelResolve = Promise.resolve();
            }
        }
        // Model does not exist
        else {
            didCreateModel = true;
            const newModel = (model = this.instantiationService.createInstance(TextFileEditorModel, resource, options ? options.encoding : undefined, options ? options.languageId : undefined));
            modelResolve = model.resolve(options);
            this.registerModel(newModel);
        }
        // Store pending resolves to avoid race conditions
        this.mapResourceToPendingModelResolvers.set(resource, modelResolve);
        // Make known to manager (if not already known)
        this.add(resource, model);
        // Emit some events if we created the model
        if (didCreateModel) {
            this._onDidCreate.fire(model);
            // If the model is dirty right from the beginning,
            // make sure to emit this as an event
            if (model.isDirty()) {
                this._onDidChangeDirty.fire(model);
            }
        }
        try {
            await modelResolve;
        }
        catch (error) {
            // Automatically dispose the model if we created it
            // because we cannot dispose a model we do not own
            // https://github.com/microsoft/vscode/issues/138850
            if (didCreateModel) {
                model.dispose();
            }
            throw error;
        }
        finally {
            // Remove from pending resolves
            this.mapResourceToPendingModelResolvers.delete(resource);
        }
        // Apply language if provided
        if (options?.languageId) {
            model.setLanguageId(options.languageId);
        }
        // Model can be dirty if a backup was restored, so we make sure to
        // have this event delivered if we created the model here
        if (didCreateModel && model.isDirty()) {
            this._onDidChangeDirty.fire(model);
        }
        return model;
    }
    joinPendingResolves(resource) {
        const pendingModelResolve = this.mapResourceToPendingModelResolvers.get(resource);
        if (!pendingModelResolve) {
            return;
        }
        return this.doJoinPendingResolves(resource);
    }
    async doJoinPendingResolves(resource) {
        // While we have pending model resolves, ensure
        // to await the last one finishing before returning.
        // This prevents a race when multiple clients await
        // the pending resolve and then all trigger the resolve
        // at the same time.
        let currentModelCopyResolve;
        while (this.mapResourceToPendingModelResolvers.has(resource)) {
            const nextPendingModelResolve = this.mapResourceToPendingModelResolvers.get(resource);
            if (nextPendingModelResolve === currentModelCopyResolve) {
                return; // already awaited on - return
            }
            currentModelCopyResolve = nextPendingModelResolve;
            try {
                await nextPendingModelResolve;
            }
            catch (error) {
                // ignore any error here, it will bubble to the original requestor
            }
        }
    }
    registerModel(model) {
        // Install model listeners
        const modelListeners = new DisposableStore();
        modelListeners.add(model.onDidResolve((reason) => this._onDidResolve.fire({ model, reason })));
        modelListeners.add(model.onDidChangeDirty(() => this._onDidChangeDirty.fire(model)));
        modelListeners.add(model.onDidChangeReadonly(() => this._onDidChangeReadonly.fire(model)));
        modelListeners.add(model.onDidChangeOrphaned(() => this._onDidChangeOrphaned.fire(model)));
        modelListeners.add(model.onDidSaveError(() => this._onDidSaveError.fire(model)));
        modelListeners.add(model.onDidSave((e) => this._onDidSave.fire({ model, ...e })));
        modelListeners.add(model.onDidRevert(() => this._onDidRevert.fire(model)));
        modelListeners.add(model.onDidChangeEncoding(() => this._onDidChangeEncoding.fire(model)));
        // Keep for disposal
        this.mapResourceToModelListeners.set(model.resource, modelListeners);
    }
    add(resource, model) {
        const knownModel = this.mapResourceToModel.get(resource);
        if (knownModel === model) {
            return; // already cached
        }
        // dispose any previously stored dispose listener for this resource
        const disposeListener = this.mapResourceToDisposeListener.get(resource);
        disposeListener?.dispose();
        // store in cache but remove when model gets disposed
        this.mapResourceToModel.set(resource, model);
        this.mapResourceToDisposeListener.set(resource, model.onWillDispose(() => this.remove(resource)));
    }
    remove(resource) {
        const removed = this.mapResourceToModel.delete(resource);
        const disposeListener = this.mapResourceToDisposeListener.get(resource);
        if (disposeListener) {
            dispose(disposeListener);
            this.mapResourceToDisposeListener.delete(resource);
        }
        const modelListener = this.mapResourceToModelListeners.get(resource);
        if (modelListener) {
            dispose(modelListener);
            this.mapResourceToModelListeners.delete(resource);
        }
        if (removed) {
            this._onDidRemove.fire(resource);
        }
    }
    addSaveParticipant(participant) {
        return this.saveParticipants.addSaveParticipant(participant);
    }
    runSaveParticipants(model, context, progress, token) {
        return this.saveParticipants.participate(model, context, progress, token);
    }
    //#endregion
    canDispose(model) {
        // quick return if model already disposed or not dirty and not resolving
        if (model.isDisposed() ||
            (!this.mapResourceToPendingModelResolvers.has(model.resource) && !model.isDirty())) {
            return true;
        }
        // promise based return in all other cases
        return this.doCanDispose(model);
    }
    async doCanDispose(model) {
        // Await any pending resolves first before proceeding
        const pendingResolve = this.joinPendingResolves(model.resource);
        if (pendingResolve) {
            await pendingResolve;
            return this.canDispose(model);
        }
        // dirty model: we do not allow to dispose dirty models to prevent
        // data loss cases. dirty models can only be disposed when they are
        // either saved or reverted
        if (model.isDirty()) {
            await Event.toPromise(model.onDidChangeDirty);
            return this.canDispose(model);
        }
        return true;
    }
    dispose() {
        super.dispose();
        // model caches
        this.mapResourceToModel.clear();
        this.mapResourceToPendingModelResolvers.clear();
        // dispose the dispose listeners
        dispose(this.mapResourceToDisposeListener.values());
        this.mapResourceToDisposeListener.clear();
        // dispose the model change listeners
        dispose(this.mapResourceToModelListeners.values());
        this.mapResourceToModelListeners.clear();
    }
};
TextFileEditorModelManager = __decorate([
    __param(0, IInstantiationService),
    __param(1, IFileService),
    __param(2, INotificationService),
    __param(3, IWorkingCopyFileService),
    __param(4, IUriIdentityService)
], TextFileEditorModelManager);
export { TextFileEditorModelManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvY29tbW9uL3RleHRGaWxlRWRpdG9yTW9kZWxNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUNOLE9BQU8sRUFFUCxVQUFVLEVBQ1YsZUFBZSxHQUNmLE1BQU0sc0NBQXNDLENBQUE7QUFTN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFDTixZQUFZLEdBTVosTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXRFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFFTix1QkFBdUIsR0FFdkIsTUFBTSxvREFBb0QsQ0FBQTtBQUUz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