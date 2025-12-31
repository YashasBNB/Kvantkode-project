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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVdvcmtpbmdDb3B5TWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vZmlsZVdvcmtpbmdDb3B5TWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sZUFBZSxFQUNmLFFBQVEsRUFDUixPQUFPLEVBQ1AsUUFBUSxFQUNSLE9BQU8sR0FDUCxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBZ0Isa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFRNUYsT0FBTyxFQUNOLDRCQUE0QixHQUc1QixNQUFN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