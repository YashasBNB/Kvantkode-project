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
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
let ResourceWorkingCopy = class ResourceWorkingCopy extends Disposable {
    constructor(resource, fileService) {
        super();
        this.resource = resource;
        this.fileService = fileService;
        //#region Orphaned Tracking
        this._onDidChangeOrphaned = this._register(new Emitter());
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this.orphaned = false;
        //#endregion
        //#region Dispose
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._register(this.fileService.onDidFilesChange((e) => this.onDidFilesChange(e)));
    }
    isOrphaned() {
        return this.orphaned;
    }
    async onDidFilesChange(e) {
        let fileEventImpactsUs = false;
        let newInOrphanModeGuess;
        // If we are currently orphaned, we check if the file was added back
        if (this.orphaned) {
            const fileWorkingCopyResourceAdded = e.contains(this.resource, 1 /* FileChangeType.ADDED */);
            if (fileWorkingCopyResourceAdded) {
                newInOrphanModeGuess = false;
                fileEventImpactsUs = true;
            }
        }
        // Otherwise we check if the file was deleted
        else {
            const fileWorkingCopyResourceDeleted = e.contains(this.resource, 2 /* FileChangeType.DELETED */);
            if (fileWorkingCopyResourceDeleted) {
                newInOrphanModeGuess = true;
                fileEventImpactsUs = true;
            }
        }
        if (fileEventImpactsUs && this.orphaned !== newInOrphanModeGuess) {
            let newInOrphanModeValidated = false;
            if (newInOrphanModeGuess) {
                // We have received reports of users seeing delete events even though the file still
                // exists (network shares issue: https://github.com/microsoft/vscode/issues/13665).
                // Since we do not want to mark the working copy as orphaned, we have to check if the
                // file is really gone and not just a faulty file event.
                await timeout(100, CancellationToken.None);
                if (this.isDisposed()) {
                    newInOrphanModeValidated = true;
                }
                else {
                    const exists = await this.fileService.exists(this.resource);
                    newInOrphanModeValidated = !exists;
                }
            }
            if (this.orphaned !== newInOrphanModeValidated && !this.isDisposed()) {
                this.setOrphaned(newInOrphanModeValidated);
            }
        }
    }
    setOrphaned(orphaned) {
        if (this.orphaned !== orphaned) {
            this.orphaned = orphaned;
            this._onDidChangeOrphaned.fire();
        }
    }
    isDisposed() {
        return this._store.isDisposed;
    }
    dispose() {
        // State
        this.orphaned = false;
        // Event
        this._onWillDispose.fire();
        super.dispose();
    }
    //#endregion
    //#region Modified Tracking
    isModified() {
        return this.isDirty();
    }
};
ResourceWorkingCopy = __decorate([
    __param(1, IFileService)
], ResourceWorkingCopy);
export { ResourceWorkingCopy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VXb3JraW5nQ29weS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vcmVzb3VyY2VXb3JraW5nQ29weS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RSxPQUFPLEVBR04sWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFtQzVDLElBQWUsbUJBQW1CLEdBQWxDLE1BQWUsbUJBQW9CLFNBQVEsVUFBVTtJQUMzRCxZQUNVLFFBQWEsRUFDUixXQUE0QztRQUUxRCxLQUFLLEVBQUUsQ0FBQTtRQUhFLGFBQVEsR0FBUixRQUFRLENBQUs7UUFDVyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQU8zRCwyQkFBMkI7UUFFVix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNsRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRXRELGFBQVEsR0FBRyxLQUFLLENBQUE7UUEyRHhCLFlBQVk7UUFFWixpQkFBaUI7UUFFQSxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzVELGtCQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUE7UUF4RWpELElBQUksQ0FBQyxTQUFTLENB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