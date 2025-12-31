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
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Promises } from '../../../../base/common/async.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
let BaseFileWorkingCopyManager = class BaseFileWorkingCopyManager extends Disposable {
    constructor(fileService, logService, workingCopyBackupService) {
        super();
        this.fileService = fileService;
        this.logService = logService;
        this.workingCopyBackupService = workingCopyBackupService;
        this._onDidCreate = this._register(new Emitter());
        this.onDidCreate = this._onDidCreate.event;
        this.mapResourceToWorkingCopy = new ResourceMap();
        this.mapResourceToDisposeListener = new ResourceMap();
    }
    has(resource) {
        return this.mapResourceToWorkingCopy.has(resource);
    }
    add(resource, workingCopy) {
        const knownWorkingCopy = this.get(resource);
        if (knownWorkingCopy === workingCopy) {
            return; // already cached
        }
        // Add to our working copy map
        this.mapResourceToWorkingCopy.set(resource, workingCopy);
        // Update our dispose listener to remove it on dispose
        this.mapResourceToDisposeListener.get(resource)?.dispose();
        this.mapResourceToDisposeListener.set(resource, workingCopy.onWillDispose(() => this.remove(resource)));
        // Signal creation event
        this._onDidCreate.fire(workingCopy);
    }
    remove(resource) {
        // Dispose any existing listener
        const disposeListener = this.mapResourceToDisposeListener.get(resource);
        if (disposeListener) {
            dispose(disposeListener);
            this.mapResourceToDisposeListener.delete(resource);
        }
        // Remove from our working copy map
        return this.mapResourceToWorkingCopy.delete(resource);
    }
    //#region Get / Get all
    get workingCopies() {
        return [...this.mapResourceToWorkingCopy.values()];
    }
    get(resource) {
        return this.mapResourceToWorkingCopy.get(resource);
    }
    //#endregion
    //#region Lifecycle
    dispose() {
        super.dispose();
        // Clear working copy caches
        //
        // Note: we are not explicitly disposing the working copies
        // known to the manager because this can have unwanted side
        // effects such as backups getting discarded once the working
        // copy unregisters. We have an explicit `destroy`
        // for that purpose (https://github.com/microsoft/vscode/pull/123555)
        //
        this.mapResourceToWorkingCopy.clear();
        // Dispose the dispose listeners
        dispose(this.mapResourceToDisposeListener.values());
        this.mapResourceToDisposeListener.clear();
    }
    async destroy() {
        // Make sure all dirty working copies are saved to disk
        try {
            await Promises.settled(this.workingCopies.map(async (workingCopy) => {
                if (workingCopy.isDirty()) {
                    await this.saveWithFallback(workingCopy);
                }
            }));
        }
        catch (error) {
            this.logService.error(error);
        }
        // Dispose all working copies
        dispose(this.mapResourceToWorkingCopy.values());
        // Finally dispose manager
        this.dispose();
    }
    async saveWithFallback(workingCopy) {
        // First try regular save
        let saveSuccess = false;
        try {
            saveSuccess = await workingCopy.save();
        }
        catch (error) {
            // Ignore
        }
        // Then fallback to backup if that exists
        if (!saveSuccess || workingCopy.isDirty()) {
            const backup = await this.workingCopyBackupService.resolve(workingCopy);
            if (backup) {
                await this.fileService.writeFile(workingCopy.resource, backup.value, { unlock: true });
            }
        }
    }
};
BaseFileWorkingCopyManager = __decorate([
    __param(0, IFileService),
    __param(1, ILogService),
    __param(2, IWorkingCopyBackupService)
], BaseFileWorkingCopyManager);
export { BaseFileWorkingCopyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi9hYnN0cmFjdEZpbGVXb3JraW5nQ29weU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBb0MzRCxJQUFlLDBCQUEwQixHQUF6QyxNQUFlLDBCQUlyQixTQUFRLFVBQVU7SUFTbEIsWUFDZSxXQUE0QyxFQUM3QyxVQUEwQyxFQUV2RCx3QkFBc0U7UUFFdEUsS0FBSyxFQUFFLENBQUE7UUFMMEIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDMUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUVwQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBVnRELGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBSyxDQUFDLENBQUE7UUFDdkQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUU3Qiw2QkFBd0IsR0FBRyxJQUFJLFdBQVcsRUFB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