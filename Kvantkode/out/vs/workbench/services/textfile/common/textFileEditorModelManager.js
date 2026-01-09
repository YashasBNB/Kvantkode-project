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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vdGV4dEZpbGVFZGl0b3JNb2RlbE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sT0FBTyxFQUVQLFVBQVUsRUFDVixlQUFlLEdBQ2YsTUFBTSxzQ0FBc0MsQ0FBQTtBQVM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUNOLFlBQVksR0FNWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUVOLHVCQUF1QixHQUV2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