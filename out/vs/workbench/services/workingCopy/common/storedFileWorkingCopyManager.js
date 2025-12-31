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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vc3RvcmVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixxQkFBcUIsR0FPckIsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRSxPQUFPLEVBSU4sWUFBWSxHQUdaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBd0IsTUFBTSw2QkFBNkIsQ0FBQTtBQUMzRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFP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