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
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { StoredFileWorkingCopy, } from './storedFileWorkingCopy.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Promises, ResourceQueue } from '../../../../base/common/async.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IWorkingCopyFileService } from './workingCopyFileService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
import { BaseFileWorkingCopyManager, } from './abstractFileWorkingCopyManager.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyEditorService } from './workingCopyEditorService.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
let StoredFileWorkingCopyManager = class StoredFileWorkingCopyManager extends BaseFileWorkingCopyManager {
    constructor(workingCopyTypeId, modelFactory, fileService, lifecycleService, labelService, logService, workingCopyFileService, workingCopyBackupService, uriIdentityService, filesConfigurationService, workingCopyService, notificationService, workingCopyEditorService, editorService, elevatedFileService, progressService) {
        super(fileService, logService, workingCopyBackupService);
        this.workingCopyTypeId = workingCopyTypeId;
        this.modelFactory = modelFactory;
        this.lifecycleService = lifecycleService;
        this.labelService = labelService;
        this.workingCopyFileService = workingCopyFileService;
        this.uriIdentityService = uriIdentityService;
        this.filesConfigurationService = filesConfigurationService;
        this.workingCopyService = workingCopyService;
        this.notificationService = notificationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.editorService = editorService;
        this.elevatedFileService = elevatedFileService;
        this.progressService = progressService;
        //#region Events
        this._onDidResolve = this._register(new Emitter());
        this.onDidResolve = this._onDidResolve.event;
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
        this._onDidRemove = this._register(new Emitter());
        this.onDidRemove = this._onDidRemove.event;
        //#endregion
        this.mapResourceToWorkingCopyListeners = new ResourceMap();
        this.mapResourceToPendingWorkingCopyResolve = new ResourceMap();
        this.workingCopyResolveQueue = this._register(new ResourceQueue());
        //#endregion
        //#region Working Copy File Events
        this.mapCorrelationIdToWorkingCopiesToRestore = new Map();
        this.registerListeners();
    }
    registerListeners() {
        // Update working copies from file change events
        this._register(this.fileService.onDidFilesChange((e) => this.onDidFilesChange(e)));
        // File system provider changes
        this._register(this.fileService.onDidChangeFileSystemProviderCapabilities((e) => this.onDidChangeFileSystemProviderCapabilities(e)));
        this._register(this.fileService.onDidChangeFileSystemProviderRegistrations((e) => this.onDidChangeFileSystemProviderRegistrations(e)));
        // Working copy operations
        this._register(this.workingCopyFileService.onWillRunWorkingCopyFileOperation((e) => this.onWillRunWorkingCopyFileOperation(e)));
        this._register(this.workingCopyFileService.onDidFailWorkingCopyFileOperation((e) => this.onDidFailWorkingCopyFileOperation(e)));
        this._register(this.workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => this.onDidRunWorkingCopyFileOperation(e)));
        // Lifecycle
        if (isWeb) {
            this._register(this.lifecycleService.onBeforeShutdown((event) => event.veto(this.onBeforeShutdownWeb(), 'veto.fileWorkingCopyManager')));
        }
        else {
            this._register(this.lifecycleService.onWillShutdown((event) => event.join(this.onWillShutdownDesktop(), {
                id: 'join.fileWorkingCopyManager',
                label: localize('join.fileWorkingCopyManager', 'Saving working copies'),
            })));
        }
    }
    onBeforeShutdownWeb() {
        if (this.workingCopies.some((workingCopy) => workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */))) {
            // stored file working copies are pending to be saved:
            // veto because web does not support long running shutdown
            return true;
        }
        return false;
    }
    async onWillShutdownDesktop() {
        let pendingSavedWorkingCopies;
        // As long as stored file working copies are pending to be saved, we prolong the shutdown
        // until that has happened to ensure we are not shutting down in the middle of
        // writing to the working copy (https://github.com/microsoft/vscode/issues/116600).
        while ((pendingSavedWorkingCopies = this.workingCopies.filter((workingCopy) => workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */))).length > 0) {
            await Promises.settled(pendingSavedWorkingCopies.map((workingCopy) => workingCopy.joinState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */)));
        }
    }
    //#region Resolve from file or file provider changes
    onDidChangeFileSystemProviderCapabilities(e) {
        // Resolve working copies again for file systems that changed
        // capabilities to fetch latest metadata (e.g. readonly)
        // into all working copies.
        this.queueWorkingCopyReloads(e.scheme);
    }
    onDidChangeFileSystemProviderRegistrations(e) {
        if (!e.added) {
            return; // only if added
        }
        // Resolve working copies again for file systems that registered
        // to account for capability changes: extensions may unregister
        // and register the same provider with different capabilities,
        // so we want to ensure to fetch latest metadata (e.g. readonly)
        // into all working copies.
        this.queueWorkingCopyReloads(e.scheme);
    }
    onDidFilesChange(e) {
        // Trigger a resolve for any update or add event that impacts
        // the working copy. We also consider the added event
        // because it could be that a file was added and updated
        // right after.
        this.queueWorkingCopyReloads(e);
    }
    queueWorkingCopyReloads(schemeOrEvent) {
        for (const workingCopy of this.workingCopies) {
            if (workingCopy.isDirty()) {
                continue; // never reload dirty working copies
            }
            let resolveWorkingCopy = false;
            if (typeof schemeOrEvent === 'string') {
                resolveWorkingCopy = schemeOrEvent === workingCopy.resource.scheme;
            }
            else {
                resolveWorkingCopy = schemeOrEvent.contains(workingCopy.resource, 0 /* FileChangeType.UPDATED */, 1 /* FileChangeType.ADDED */);
            }
            if (resolveWorkingCopy) {
                this.queueWorkingCopyReload(workingCopy);
            }
        }
    }
    queueWorkingCopyReload(workingCopy) {
        // Resolves a working copy to update (use a queue to prevent accumulation of
        // resolve when the resolving actually takes long. At most we only want the
        // queue to have a size of 2 (1 running resolve and 1 queued resolve).
        const queueSize = this.workingCopyResolveQueue.queueSize(workingCopy.resource);
        if (queueSize <= 1) {
            this.workingCopyResolveQueue.queueFor(workingCopy.resource, async () => {
                try {
                    await this.reload(workingCopy);
                }
                catch (error) {
                    this.logService.error(error);
                }
            });
        }
    }
    onWillRunWorkingCopyFileOperation(e) {
        // Move / Copy: remember working copies to restore after the operation
        if (e.operation === 2 /* FileOperation.MOVE */ || e.operation === 3 /* FileOperation.COPY */) {
            e.waitUntil((async () => {
                const workingCopiesToRestore = [];
                for (const { source, target } of e.files) {
                    if (source) {
                        if (this.uriIdentityService.extUri.isEqual(source, target)) {
                            continue; // ignore if resources are considered equal
                        }
                        // Find all working copies that related to source (can be many if resource is a folder)
                        const sourceWorkingCopies = [];
                        for (const workingCopy of this.workingCopies) {
                            if (this.uriIdentityService.extUri.isEqualOrParent(workingCopy.resource, source)) {
                                sourceWorkingCopies.push(workingCopy);
                            }
                        }
                        // Remember each source working copy to load again after move is done
                        // with optional content to restore if it was dirty
                        for (const sourceWorkingCopy of sourceWorkingCopies) {
                            const sourceResource = sourceWorkingCopy.resource;
                            // If the source is the actual working copy, just use target as new resource
                            let targetResource;
                            if (this.uriIdentityService.extUri.isEqual(sourceResource, source)) {
                                targetResource = target;
                            }
                            // Otherwise a parent folder of the source is being moved, so we need
                            // to compute the target resource based on that
                            else {
                                targetResource = joinPath(target, sourceResource.path.substr(source.path.length + 1));
                            }
                            workingCopiesToRestore.push({
                                source: sourceResource,
                                target: targetResource,
                                snapshot: sourceWorkingCopy.isDirty()
                                    ? await sourceWorkingCopy.model?.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None)
                                    : undefined,
                            });
                        }
                    }
                }
                this.mapCorrelationIdToWorkingCopiesToRestore.set(e.correlationId, workingCopiesToRestore);
            })());
        }
    }
    onDidFailWorkingCopyFileOperation(e) {
        // Move / Copy: restore dirty flag on working copies to restore that were dirty
        if (e.operation === 2 /* FileOperation.MOVE */ || e.operation === 3 /* FileOperation.COPY */) {
            const workingCopiesToRestore = this.mapCorrelationIdToWorkingCopiesToRestore.get(e.correlationId);
            if (workingCopiesToRestore) {
                this.mapCorrelationIdToWorkingCopiesToRestore.delete(e.correlationId);
                for (const workingCopy of workingCopiesToRestore) {
                    // Snapshot presence means this working copy used to be modified and so we restore that
                    // flag. we do NOT have to restore the content because the working copy was only soft
                    // reverted and did not loose its original modified contents.
                    if (workingCopy.snapshot) {
                        this.get(workingCopy.source)?.markModified();
                    }
                }
            }
        }
    }
    onDidRunWorkingCopyFileOperation(e) {
        switch (e.operation) {
            // Create: Revert existing working copies
            case 0 /* FileOperation.CREATE */:
                e.waitUntil((async () => {
                    for (const { target } of e.files) {
                        const workingCopy = this.get(target);
                        if (workingCopy && !workingCopy.isDisposed()) {
                            await workingCopy.revert();
                        }
                    }
                })());
                break;
            // Move/Copy: restore working copies that were loaded before the operation took place
            case 2 /* FileOperation.MOVE */:
            case 3 /* FileOperation.COPY */:
                e.waitUntil((async () => {
                    const workingCopiesToRestore = this.mapCorrelationIdToWorkingCopiesToRestore.get(e.correlationId);
                    if (workingCopiesToRestore) {
                        this.mapCorrelationIdToWorkingCopiesToRestore.delete(e.correlationId);
                        await Promises.settled(workingCopiesToRestore.map(async (workingCopyToRestore) => {
                            // From this moment on, only operate on the canonical resource
                            // to fix a potential data loss issue:
                            // https://github.com/microsoft/vscode/issues/211374
                            const target = this.uriIdentityService.asCanonicalUri(workingCopyToRestore.target);
                            // Restore the working copy at the target. if we have previous dirty content, we pass it
                            // over to be used, otherwise we force a reload from disk. this is important
                            // because we know the file has changed on disk after the move and the working copy might
                            // have still existed with the previous state. this ensures that the working copy is not
                            // tracking a stale state.
                            await this.resolve(target, {
                                reload: { async: false }, // enforce a reload
                                contents: workingCopyToRestore.snapshot,
                            });
                        }));
                    }
                })());
                break;
        }
    }
    //#endregion
    //#region Reload & Resolve
    async reload(workingCopy) {
        // Await a pending working copy resolve first before proceeding
        // to ensure that we never resolve a working copy more than once
        // in parallel.
        await this.joinPendingResolves(workingCopy.resource);
        if (workingCopy.isDirty() || workingCopy.isDisposed() || !this.has(workingCopy.resource)) {
            return; // the working copy possibly got dirty or disposed, so return early then
        }
        // Trigger reload
        await this.doResolve(workingCopy, { reload: { async: false } });
    }
    async resolve(resource, options) {
        // Await a pending working copy resolve first before proceeding
        // to ensure that we never resolve a working copy more than once
        // in parallel.
        const pendingResolve = this.joinPendingResolves(resource);
        if (pendingResolve) {
            await pendingResolve;
        }
        // Trigger resolve
        return this.doResolve(resource, options);
    }
    async doResolve(resourceOrWorkingCopy, options) {
        let workingCopy;
        let resource;
        if (URI.isUri(resourceOrWorkingCopy)) {
            resource = resourceOrWorkingCopy;
            workingCopy = this.get(resource);
        }
        else {
            resource = resourceOrWorkingCopy.resource;
            workingCopy = resourceOrWorkingCopy;
        }
        let workingCopyResolve;
        let didCreateWorkingCopy = false;
        const resolveOptions = {
            contents: options?.contents,
            forceReadFromFile: options?.reload?.force,
            limits: options?.limits,
        };
        // Working copy exists
        if (workingCopy) {
            // Always reload if contents are provided
            if (options?.contents) {
                workingCopyResolve = workingCopy.resolve(resolveOptions);
            }
            // Reload async or sync based on options
            else if (options?.reload) {
                // Async reload: trigger a reload but return immediately
                if (options.reload.async) {
                    workingCopyResolve = Promise.resolve();
                    (async () => {
                        try {
                            await workingCopy.resolve(resolveOptions);
                        }
                        catch (error) {
                            if (!workingCopy.isDisposed()) {
                                onUnexpectedError(error); // only log if the working copy is still around
                            }
                        }
                    })();
                }
                // Sync reload: do not return until working copy reloaded
                else {
                    workingCopyResolve = workingCopy.resolve(resolveOptions);
                }
            }
            // Do not reload
            else {
                workingCopyResolve = Promise.resolve();
            }
        }
        // Stored file working copy does not exist
        else {
            didCreateWorkingCopy = true;
            workingCopy = new StoredFileWorkingCopy(this.workingCopyTypeId, resource, this.labelService.getUriBasenameLabel(resource), this.modelFactory, async (options) => {
                await this.resolve(resource, { ...options, reload: { async: false } });
            }, this.fileService, this.logService, this.workingCopyFileService, this.filesConfigurationService, this.workingCopyBackupService, this.workingCopyService, this.notificationService, this.workingCopyEditorService, this.editorService, this.elevatedFileService, this.progressService);
            workingCopyResolve = workingCopy.resolve(resolveOptions);
            this.registerWorkingCopy(workingCopy);
        }
        // Store pending resolve to avoid race conditions
        this.mapResourceToPendingWorkingCopyResolve.set(resource, workingCopyResolve);
        // Make known to manager (if not already known)
        this.add(resource, workingCopy);
        // Emit some events if we created the working copy
        if (didCreateWorkingCopy) {
            // If the working copy is dirty right from the beginning,
            // make sure to emit this as an event
            if (workingCopy.isDirty()) {
                this._onDidChangeDirty.fire(workingCopy);
            }
        }
        try {
            await workingCopyResolve;
        }
        catch (error) {
            // Automatically dispose the working copy if we created
            // it because we cannot dispose a working copy we do not
            // own (https://github.com/microsoft/vscode/issues/138850)
            if (didCreateWorkingCopy) {
                workingCopy.dispose();
            }
            throw error;
        }
        finally {
            // Remove from pending resolves
            this.mapResourceToPendingWorkingCopyResolve.delete(resource);
        }
        // Stored file working copy can be dirty if a backup was restored, so we make sure to
        // have this event delivered if we created the working copy here
        if (didCreateWorkingCopy && workingCopy.isDirty()) {
            this._onDidChangeDirty.fire(workingCopy);
        }
        return workingCopy;
    }
    joinPendingResolves(resource) {
        const pendingWorkingCopyResolve = this.mapResourceToPendingWorkingCopyResolve.get(resource);
        if (!pendingWorkingCopyResolve) {
            return;
        }
        return this.doJoinPendingResolves(resource);
    }
    async doJoinPendingResolves(resource) {
        // While we have pending working copy resolves, ensure
        // to await the last one finishing before returning.
        // This prevents a race when multiple clients await
        // the pending resolve and then all trigger the resolve
        // at the same time.
        let currentWorkingCopyResolve;
        while (this.mapResourceToPendingWorkingCopyResolve.has(resource)) {
            const nextPendingWorkingCopyResolve = this.mapResourceToPendingWorkingCopyResolve.get(resource);
            if (nextPendingWorkingCopyResolve === currentWorkingCopyResolve) {
                return; // already awaited on - return
            }
            currentWorkingCopyResolve = nextPendingWorkingCopyResolve;
            try {
                await nextPendingWorkingCopyResolve;
            }
            catch (error) {
                // ignore any error here, it will bubble to the original requestor
            }
        }
    }
    registerWorkingCopy(workingCopy) {
        // Install working copy listeners
        const workingCopyListeners = new DisposableStore();
        workingCopyListeners.add(workingCopy.onDidResolve(() => this._onDidResolve.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidChangeDirty(() => this._onDidChangeDirty.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidChangeReadonly(() => this._onDidChangeReadonly.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidChangeOrphaned(() => this._onDidChangeOrphaned.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidSaveError(() => this._onDidSaveError.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onDidSave((e) => this._onDidSave.fire({ workingCopy, ...e })));
        workingCopyListeners.add(workingCopy.onDidRevert(() => this._onDidRevert.fire(workingCopy)));
        // Keep for disposal
        this.mapResourceToWorkingCopyListeners.set(workingCopy.resource, workingCopyListeners);
    }
    remove(resource) {
        const removed = super.remove(resource);
        // Dispose any existing working copy listeners
        const workingCopyListener = this.mapResourceToWorkingCopyListeners.get(resource);
        if (workingCopyListener) {
            dispose(workingCopyListener);
            this.mapResourceToWorkingCopyListeners.delete(resource);
        }
        if (removed) {
            this._onDidRemove.fire(resource);
        }
        return removed;
    }
    //#endregion
    //#region Lifecycle
    canDispose(workingCopy) {
        // Quick return if working copy already disposed or not dirty and not resolving
        if (workingCopy.isDisposed() ||
            (!this.mapResourceToPendingWorkingCopyResolve.has(workingCopy.resource) &&
                !workingCopy.isDirty())) {
            return true;
        }
        // Promise based return in all other cases
        return this.doCanDispose(workingCopy);
    }
    async doCanDispose(workingCopy) {
        // Await any pending resolves first before proceeding
        const pendingResolve = this.joinPendingResolves(workingCopy.resource);
        if (pendingResolve) {
            await pendingResolve;
            return this.canDispose(workingCopy);
        }
        // Dirty working copy: we do not allow to dispose dirty working copys
        // to prevent data loss cases. dirty working copys can only be disposed when
        // they are either saved or reverted
        if (workingCopy.isDirty()) {
            await Event.toPromise(workingCopy.onDidChangeDirty);
            return this.canDispose(workingCopy);
        }
        return true;
    }
    dispose() {
        super.dispose();
        // Clear pending working copy resolves
        this.mapResourceToPendingWorkingCopyResolve.clear();
        // Dispose the working copy change listeners
        dispose(this.mapResourceToWorkingCopyListeners.values());
        this.mapResourceToWorkingCopyListeners.clear();
    }
};
StoredFileWorkingCopyManager = __decorate([
    __param(2, IFileService),
    __param(3, ILifecycleService),
    __param(4, ILabelService),
    __param(5, ILogService),
    __param(6, IWorkingCopyFileService),
    __param(7, IWorkingCopyBackupService),
    __param(8, IUriIdentityService),
    __param(9, IFilesConfigurationService),
    __param(10, IWorkingCopyService),
    __param(11, INotificationService),
    __param(12, IWorkingCopyEditorService),
    __param(13, IEditorService),
    __param(14, IElevatedFileService),
    __param(15, IProgressService)
], StoredFileWorkingCopyManager);
export { StoredFileWorkingCopyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi9zdG9yZWRGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLHFCQUFxQixHQU9yQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFFLE9BQU8sRUFJTixZQUFZLEdBR1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUF3QixNQUFNLDZCQUE2QixDQUFBO0FBQzNGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFN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