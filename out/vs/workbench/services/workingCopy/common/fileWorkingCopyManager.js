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
var FileWorkingCopyManager_1;
import { localize } from '../../../../nls.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Promises } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { toLocalResource, joinPath, isEqual, basename, dirname, } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { StoredFileWorkingCopyManager, } from './storedFileWorkingCopyManager.js';
import { UntitledFileWorkingCopy, } from './untitledFileWorkingCopy.js';
import { UntitledFileWorkingCopyManager, } from './untitledFileWorkingCopyManager.js';
import { IWorkingCopyFileService } from './workingCopyFileService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
import { IWorkingCopyEditorService } from './workingCopyEditorService.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { Schemas } from '../../../../base/common/network.js';
import { IDecorationsService, } from '../../decorations/common/decorations.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { listErrorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
let FileWorkingCopyManager = class FileWorkingCopyManager extends Disposable {
    static { FileWorkingCopyManager_1 = this; }
    static { this.FILE_WORKING_COPY_SAVE_CREATE_SOURCE = SaveSourceRegistry.registerSource('fileWorkingCopyCreate.source', localize('fileWorkingCopyCreate.source', 'File Created')); }
    static { this.FILE_WORKING_COPY_SAVE_REPLACE_SOURCE = SaveSourceRegistry.registerSource('fileWorkingCopyReplace.source', localize('fileWorkingCopyReplace.source', 'File Replaced')); }
    constructor(workingCopyTypeId, storedWorkingCopyModelFactory, untitledWorkingCopyModelFactory, fileService, lifecycleService, labelService, logService, workingCopyFileService, workingCopyBackupService, uriIdentityService, fileDialogService, filesConfigurationService, workingCopyService, notificationService, workingCopyEditorService, editorService, elevatedFileService, pathService, environmentService, dialogService, decorationsService, progressService) {
        super();
        this.workingCopyTypeId = workingCopyTypeId;
        this.storedWorkingCopyModelFactory = storedWorkingCopyModelFactory;
        this.untitledWorkingCopyModelFactory = untitledWorkingCopyModelFactory;
        this.fileService = fileService;
        this.logService = logService;
        this.workingCopyFileService = workingCopyFileService;
        this.uriIdentityService = uriIdentityService;
        this.fileDialogService = fileDialogService;
        this.filesConfigurationService = filesConfigurationService;
        this.pathService = pathService;
        this.environmentService = environmentService;
        this.dialogService = dialogService;
        this.decorationsService = decorationsService;
        // Stored file working copies manager
        this.stored = this._register(new StoredFileWorkingCopyManager(this.workingCopyTypeId, this.storedWorkingCopyModelFactory, fileService, lifecycleService, labelService, logService, workingCopyFileService, workingCopyBackupService, uriIdentityService, filesConfigurationService, workingCopyService, notificationService, workingCopyEditorService, editorService, elevatedFileService, progressService));
        // Untitled file working copies manager
        this.untitled = this._register(new UntitledFileWorkingCopyManager(this.workingCopyTypeId, this.untitledWorkingCopyModelFactory, async (workingCopy, options) => {
            const result = await this.saveAs(workingCopy.resource, undefined, options);
            return result ? true : false;
        }, fileService, labelService, logService, workingCopyBackupService, workingCopyService));
        // Events
        this.onDidCreate = Event.any(this.stored.onDidCreate, this.untitled.onDidCreate);
        // Decorations
        this.provideDecorations();
    }
    //#region decorations
    provideDecorations() {
        // File working copy decorations
        const provider = this._register(new (class extends Disposable {
            constructor(stored) {
                super();
                this.stored = stored;
                this.label = localize('fileWorkingCopyDecorations', 'File Working Copy Decorations');
                this._onDidChange = this._register(new Emitter());
                this.onDidChange = this._onDidChange.event;
                this.registerListeners();
            }
            registerListeners() {
                // Creates
                this._register(this.stored.onDidResolve((workingCopy) => {
                    if (workingCopy.isReadonly() ||
                        workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */)) {
                        this._onDidChange.fire([workingCopy.resource]);
                    }
                }));
                // Removals: once a stored working copy is no longer
                // under our control, make sure to signal this as
                // decoration change because from this point on we
                // have no way of updating the decoration anymore.
                this._register(this.stored.onDidRemove((workingCopyUri) => this._onDidChange.fire([workingCopyUri])));
                // Changes
                this._register(this.stored.onDidChangeReadonly((workingCopy) => this._onDidChange.fire([workingCopy.resource])));
                this._register(this.stored.onDidChangeOrphaned((workingCopy) => this._onDidChange.fire([workingCopy.resource])));
            }
            provideDecorations(uri) {
                const workingCopy = this.stored.get(uri);
                if (!workingCopy || workingCopy.isDisposed()) {
                    return undefined;
                }
                const isReadonly = workingCopy.isReadonly();
                const isOrphaned = workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */);
                // Readonly + Orphaned
                if (isReadonly && isOrphaned) {
                    return {
                        color: listErrorForeground,
                        letter: Codicon.lockSmall,
                        strikethrough: true,
                        tooltip: localize('readonlyAndDeleted', 'Deleted, Read-only'),
                    };
                }
                // Readonly
                else if (isReadonly) {
                    return {
                        letter: Codicon.lockSmall,
                        tooltip: localize('readonly', 'Read-only'),
                    };
                }
                // Orphaned
                else if (isOrphaned) {
                    return {
                        color: listErrorForeground,
                        strikethrough: true,
                        tooltip: localize('deleted', 'Deleted'),
                    };
                }
                return undefined;
            }
        })(this.stored));
        this._register(this.decorationsService.registerDecorationsProvider(provider));
    }
    //#endregion
    //#region get / get all
    get workingCopies() {
        return [...this.stored.workingCopies, ...this.untitled.workingCopies];
    }
    get(resource) {
        return this.stored.get(resource) ?? this.untitled.get(resource);
    }
    resolve(arg1, arg2) {
        if (URI.isUri(arg1)) {
            // Untitled: via untitled manager
            if (arg1.scheme === Schemas.untitled) {
                return this.untitled.resolve({ untitledResource: arg1 });
            }
            // else: via stored file manager
            else {
                return this.stored.resolve(arg1, arg2);
            }
        }
        return this.untitled.resolve(arg1);
    }
    //#endregion
    //#region Save
    async saveAs(source, target, options) {
        // Get to target resource
        if (!target) {
            const workingCopy = this.get(source);
            if (workingCopy instanceof UntitledFileWorkingCopy && workingCopy.hasAssociatedFilePath) {
                target = await this.suggestSavePath(source);
            }
            else {
                target = await this.fileDialogService.pickFileToSave(await this.suggestSavePath(options?.suggestedTarget ?? source), options?.availableFileSystems);
            }
        }
        if (!target) {
            return; // user canceled
        }
        // Ensure target is not marked as readonly and prompt otherwise
        if (this.filesConfigurationService.isReadonly(target)) {
            const confirmed = await this.confirmMakeWriteable(target);
            if (!confirmed) {
                return;
            }
            else {
                this.filesConfigurationService.updateReadonly(target, false);
            }
        }
        // Just save if target is same as working copies own resource
        // and we are not saving an untitled file working copy
        if (this.fileService.hasProvider(source) && isEqual(source, target)) {
            return this.doSave(source, {
                ...options,
                force: true /* force to save, even if not dirty (https://github.com/microsoft/vscode/issues/99619) */,
            });
        }
        // If the target is different but of same identity, we
        // move the source to the target, knowing that the
        // underlying file system cannot have both and then save.
        // However, this will only work if the source exists
        // and is not orphaned, so we need to check that too.
        if (this.fileService.hasProvider(source) &&
            this.uriIdentityService.extUri.isEqual(source, target) &&
            (await this.fileService.exists(source))) {
            // Move via working copy file service to enable participants
            await this.workingCopyFileService.move([{ file: { source, target } }], CancellationToken.None);
            // At this point we don't know whether we have a
            // working copy for the source or the target URI so we
            // simply try to save with both resources.
            return (await this.doSave(source, options)) ?? (await this.doSave(target, options));
        }
        // Perform normal "Save As"
        return this.doSaveAs(source, target, options);
    }
    async doSave(resource, options) {
        // Save is only possible with stored file working copies,
        // any other have to go via `saveAs` flow.
        const storedFileWorkingCopy = this.stored.get(resource);
        if (storedFileWorkingCopy) {
            const success = await storedFileWorkingCopy.save(options);
            if (success) {
                return storedFileWorkingCopy;
            }
        }
        return undefined;
    }
    async doSaveAs(source, target, options) {
        let sourceContents;
        // If the source is an existing file working copy, we can directly
        // use that to copy the contents to the target destination
        const sourceWorkingCopy = this.get(source);
        if (sourceWorkingCopy?.isResolved()) {
            sourceContents = await sourceWorkingCopy.model.snapshot(1 /* SnapshotContext.Save */, CancellationToken.None);
        }
        // Otherwise we resolve the contents from the underlying file
        else {
            sourceContents = (await this.fileService.readFileStream(source)).value;
        }
        // Resolve target
        const { targetFileExists, targetStoredFileWorkingCopy } = await this.doResolveSaveTarget(source, target);
        // Confirm to overwrite if we have an untitled file working copy with associated path where
        // the file actually exists on disk and we are instructed to save to that file path.
        // This can happen if the file was created after the untitled file was opened.
        // See https://github.com/microsoft/vscode/issues/67946
        if (sourceWorkingCopy instanceof UntitledFileWorkingCopy &&
            sourceWorkingCopy.hasAssociatedFilePath &&
            targetFileExists &&
            this.uriIdentityService.extUri.isEqual(target, toLocalResource(sourceWorkingCopy.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme))) {
            const overwrite = await this.confirmOverwrite(target);
            if (!overwrite) {
                return undefined;
            }
        }
        // Take over content from source to target
        await targetStoredFileWorkingCopy.model?.update(sourceContents, CancellationToken.None);
        // Set source options depending on target exists or not
        if (!options?.source) {
            options = {
                ...options,
                source: targetFileExists
                    ? FileWorkingCopyManager_1.FILE_WORKING_COPY_SAVE_REPLACE_SOURCE
                    : FileWorkingCopyManager_1.FILE_WORKING_COPY_SAVE_CREATE_SOURCE,
            };
        }
        // Save target
        const success = await targetStoredFileWorkingCopy.save({
            ...options,
            from: source,
            force: true /* force to save, even if not dirty (https://github.com/microsoft/vscode/issues/99619) */,
        });
        if (!success) {
            return undefined;
        }
        // Revert the source
        try {
            await sourceWorkingCopy?.revert();
        }
        catch (error) {
            // It is possible that reverting the source fails, for example
            // when a remote is disconnected and we cannot read it anymore.
            // However, this should not interrupt the "Save As" flow, so
            // we gracefully catch the error and just log it.
            this.logService.error(error);
        }
        // Events
        if (source.scheme === Schemas.untitled) {
            this.untitled.notifyDidSave(source, target);
        }
        return targetStoredFileWorkingCopy;
    }
    async doResolveSaveTarget(source, target) {
        // Prefer an existing stored file working copy if it is already resolved
        // for the given target resource
        let targetFileExists = false;
        let targetStoredFileWorkingCopy = this.stored.get(target);
        if (targetStoredFileWorkingCopy?.isResolved()) {
            targetFileExists = true;
        }
        // Otherwise create the target working copy empty if
        // it does not exist already and resolve it from there
        else {
            targetFileExists = await this.fileService.exists(target);
            // Create target file adhoc if it does not exist yet
            if (!targetFileExists) {
                await this.workingCopyFileService.create([{ resource: target }], CancellationToken.None);
            }
            // At this point we need to resolve the target working copy
            // and we have to do an explicit check if the source URI
            // equals the target via URI identity. If they match and we
            // have had an existing working copy with the source, we
            // prefer that one over resolving the target. Otherwise we
            // would potentially introduce a
            if (this.uriIdentityService.extUri.isEqual(source, target) && this.get(source)) {
                targetStoredFileWorkingCopy = await this.stored.resolve(source);
            }
            else {
                targetStoredFileWorkingCopy = await this.stored.resolve(target);
            }
        }
        return { targetFileExists, targetStoredFileWorkingCopy };
    }
    async confirmOverwrite(resource) {
        const { confirmed } = await this.dialogService.confirm({
            type: 'warning',
            message: localize('confirmOverwrite', "'{0}' already exists. Do you want to replace it?", basename(resource)),
            detail: localize('overwriteIrreversible', "A file or folder with the name '{0}' already exists in the folder '{1}'. Replacing it will overwrite its current contents.", basename(resource), basename(dirname(resource))),
            primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Replace'),
        });
        return confirmed;
    }
    async confirmMakeWriteable(resource) {
        const { confirmed } = await this.dialogService.confirm({
            type: 'warning',
            message: localize('confirmMakeWriteable', "'{0}' is marked as read-only. Do you want to save anyway?", basename(resource)),
            detail: localize('confirmMakeWriteableDetail', 'Paths can be configured as read-only via settings.'),
            primaryButton: localize({ key: 'makeWriteableButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Save Anyway'),
        });
        return confirmed;
    }
    async suggestSavePath(resource) {
        // 1.) Just take the resource as is if the file service can handle it
        if (this.fileService.hasProvider(resource)) {
            return resource;
        }
        // 2.) Pick the associated file path for untitled working copies if any
        const workingCopy = this.get(resource);
        if (workingCopy instanceof UntitledFileWorkingCopy && workingCopy.hasAssociatedFilePath) {
            return toLocalResource(resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
        }
        const defaultFilePath = await this.fileDialogService.defaultFilePath();
        // 3.) Pick the working copy name if valid joined with default path
        if (workingCopy) {
            const candidatePath = joinPath(defaultFilePath, workingCopy.name);
            if (await this.pathService.hasValidBasename(candidatePath, workingCopy.name)) {
                return candidatePath;
            }
        }
        // 4.) Finally fallback to the name of the resource joined with default path
        return joinPath(defaultFilePath, basename(resource));
    }
    //#endregion
    //#region Lifecycle
    async destroy() {
        await Promises.settled([this.stored.destroy(), this.untitled.destroy()]);
    }
};
FileWorkingCopyManager = FileWorkingCopyManager_1 = __decorate([
    __param(3, IFileService),
    __param(4, ILifecycleService),
    __param(5, ILabelService),
    __param(6, ILogService),
    __param(7, IWorkingCopyFileService),
    __param(8, IWorkingCopyBackupService),
    __param(9, IUriIdentityService),
    __param(10, IFileDialogService),
    __param(11, IFilesConfigurationService),
    __param(12, IWorkingCopyService),
    __param(13, INotificationService),
    __param(14, IWorkingCopyEditorService),
    __param(15, IEditorService),
    __param(16, IElevatedFileService),
    __param(17, IPathService),
    __param(18, IWorkbenchEnvironmentService),
    __param(19, IDialogService),
    __param(20, IDecorationsService),
    __param(21, IProgressService)
], FileWorkingCopyManager);
export { FileWorkingCopyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVdvcmtpbmdDb3B5TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi9maWxlV29ya2luZ0NvcHlNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixlQUFlLEVBQ2YsUUFBUSxFQUNSLE9BQU8sRUFDUCxRQUFRLEVBQ1IsT0FBTyxHQUNQLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFnQixrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQVE1RixPQUFPLEVBQ04sNEJBQTRCLEdBRzVC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