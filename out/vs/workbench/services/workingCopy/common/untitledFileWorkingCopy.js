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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { raceCancellation } from '../../../../base/common/async.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
import { emptyStream } from '../../../../base/common/stream.js';
let UntitledFileWorkingCopy = class UntitledFileWorkingCopy extends Disposable {
    get model() {
        return this._model;
    }
    //#endregion
    constructor(typeId, resource, name, hasAssociatedFilePath, isScratchpad, initialContents, modelFactory, saveDelegate, workingCopyService, workingCopyBackupService, logService) {
        super();
        this.typeId = typeId;
        this.resource = resource;
        this.name = name;
        this.hasAssociatedFilePath = hasAssociatedFilePath;
        this.isScratchpad = isScratchpad;
        this.initialContents = initialContents;
        this.modelFactory = modelFactory;
        this.saveDelegate = saveDelegate;
        this.workingCopyBackupService = workingCopyBackupService;
        this.logService = logService;
        this._model = undefined;
        //#region Events
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidRevert = this._register(new Emitter());
        this.onDidRevert = this._onDidRevert.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.capabilities = this.isScratchpad
            ? 2 /* WorkingCopyCapabilities.Untitled */ | 4 /* WorkingCopyCapabilities.Scratchpad */
            : 2 /* WorkingCopyCapabilities.Untitled */;
        this.modified =
            this.hasAssociatedFilePath ||
                Boolean(this.initialContents && this.initialContents.markModified !== false);
        // Make known to working copy service
        this._register(workingCopyService.registerWorkingCopy(this));
    }
    isDirty() {
        return this.modified && !this.isScratchpad; // Scratchpad working copies are never dirty
    }
    isModified() {
        return this.modified;
    }
    setModified(modified) {
        if (this.modified === modified) {
            return;
        }
        this.modified = modified;
        if (!this.isScratchpad) {
            this._onDidChangeDirty.fire();
        }
    }
    //#endregion
    //#region Resolve
    async resolve() {
        this.trace('resolve()');
        if (this.isResolved()) {
            this.trace('resolve() - exit (already resolved)');
            // return early if the untitled file working copy is already
            // resolved assuming that the contents have meanwhile changed
            // in the underlying model. we only resolve untitled once.
            return;
        }
        let untitledContents;
        // Check for backups or use initial value or empty
        const backup = await this.workingCopyBackupService.resolve(this);
        if (backup) {
            this.trace('resolve() - with backup');
            untitledContents = backup.value;
        }
        else if (this.initialContents?.value) {
            this.trace('resolve() - with initial contents');
            untitledContents = this.initialContents.value;
        }
        else {
            this.trace('resolve() - empty');
            untitledContents = emptyStream();
        }
        // Create model
        await this.doCreateModel(untitledContents);
        // Untitled associated to file path are modified right away as well as untitled with content
        this.setModified(this.hasAssociatedFilePath ||
            !!backup ||
            Boolean(this.initialContents && this.initialContents.markModified !== false));
        // If we have initial contents, make sure to emit this
        // as the appropriate events to the outside.
        if (!!backup || this.initialContents) {
            this._onDidChangeContent.fire();
        }
    }
    async doCreateModel(contents) {
        this.trace('doCreateModel()');
        // Create model and dispose it when we get disposed
        this._model = this._register(await this.modelFactory.createModel(this.resource, contents, CancellationToken.None));
        // Model listeners
        this.installModelListeners(this._model);
    }
    installModelListeners(model) {
        // Content Change
        this._register(model.onDidChangeContent((e) => this.onModelContentChanged(e)));
        // Lifecycle
        this._register(model.onWillDispose(() => this.dispose()));
    }
    onModelContentChanged(e) {
        // Mark the untitled file working copy as non-modified once its
        // in case provided by the change event and in case we do not
        // have an associated path set
        if (!this.hasAssociatedFilePath && e.isInitial) {
            this.setModified(false);
        }
        // Turn modified otherwise
        else {
            this.setModified(true);
        }
        // Emit as general content change event
        this._onDidChangeContent.fire();
    }
    isResolved() {
        return !!this.model;
    }
    //#endregion
    //#region Backup
    get backupDelay() {
        return this.model?.configuration?.backupDelay;
    }
    async backup(token) {
        let content = undefined;
        // Make sure to check whether this working copy has been
        // resolved or not and fallback to the initial value -
        // if any - to prevent backing up an unresolved working
        // copy and loosing the initial value.
        if (this.isResolved()) {
            content = await raceCancellation(this.model.snapshot(2 /* SnapshotContext.Backup */, token), token);
        }
        else if (this.initialContents) {
            content = this.initialContents.value;
        }
        return { content };
    }
    //#endregion
    //#region Save
    async save(options) {
        this.trace('save()');
        const result = await this.saveDelegate(this, options);
        // Emit Save Event
        if (result) {
            this._onDidSave.fire({ reason: options?.reason, source: options?.source });
        }
        return result;
    }
    //#endregion
    //#region Revert
    async revert() {
        this.trace('revert()');
        // No longer modified
        this.setModified(false);
        // Emit as event
        this._onDidRevert.fire();
        // A reverted untitled file working copy is invalid
        // because it has no actual source on disk to revert to.
        // As such we dispose the model.
        this.dispose();
    }
    //#endregion
    dispose() {
        this.trace('dispose()');
        this._onWillDispose.fire();
        super.dispose();
    }
    trace(msg) {
        this.logService.trace(`[untitled file working copy] ${msg}`, this.resource.toString(), this.typeId);
    }
};
UntitledFileWorkingCopy = __decorate([
    __param(8, IWorkingCopyService),
    __param(9, IWorkingCopyBackupService),
    __param(10, ILogService)
], UntitledFileWorkingCopy);
export { UntitledFileWorkingCopy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRGaWxlV29ya2luZ0NvcHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3VudGl0bGVkRmlsZVdvcmtpbmdDb3B5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQWFqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQXdFeEQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFDWixTQUFRLFVBQVU7SUFNbEIsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFtQkQsWUFBWTtJQUVaLFlBQ1UsTUFBYyxFQUNkLFFBQWEsRUFDYixJQUFZLEVBQ1oscUJBQThCLEVBQ3RCLFlBQXFCLEVBQ3JCLGVBQW9FLEVBQ3BFLFlBQXFELEVBQ3JELFlBQXFELEVBQ2pELGtCQUF1QyxFQUNqQyx3QkFBb0UsRUFDbEYsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFaRSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsYUFBUSxHQUFSLFFB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