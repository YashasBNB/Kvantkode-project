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
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { UntitledFileWorkingCopy, } from './untitledFileWorkingCopy.js';
import { Emitter } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { BaseFileWorkingCopyManager, } from './abstractFileWorkingCopyManager.js';
import { ResourceMap } from '../../../../base/common/map.js';
let UntitledFileWorkingCopyManager = class UntitledFileWorkingCopyManager extends BaseFileWorkingCopyManager {
    constructor(workingCopyTypeId, modelFactory, saveDelegate, fileService, labelService, logService, workingCopyBackupService, workingCopyService) {
        super(fileService, logService, workingCopyBackupService);
        this.workingCopyTypeId = workingCopyTypeId;
        this.modelFactory = modelFactory;
        this.saveDelegate = saveDelegate;
        this.labelService = labelService;
        this.workingCopyService = workingCopyService;
        //#region Events
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        //#endregion
        this.mapResourceToWorkingCopyListeners = new ResourceMap();
    }
    async resolve(options) {
        const workingCopy = this.doCreateOrGet(options);
        await workingCopy.resolve();
        return workingCopy;
    }
    doCreateOrGet(options = Object.create(null)) {
        const massagedOptions = this.massageOptions(options);
        // Return existing instance if asked for it
        if (massagedOptions.untitledResource) {
            const existingWorkingCopy = this.get(massagedOptions.untitledResource);
            if (existingWorkingCopy) {
                return existingWorkingCopy;
            }
        }
        // Create new instance otherwise
        return this.doCreate(massagedOptions);
    }
    massageOptions(options) {
        const massagedOptions = Object.create(null);
        // Handle associated resource
        if (options.associatedResource) {
            massagedOptions.untitledResource = URI.from({
                scheme: Schemas.untitled,
                authority: options.associatedResource.authority,
                fragment: options.associatedResource.fragment,
                path: options.associatedResource.path,
                query: options.associatedResource.query,
            });
            massagedOptions.associatedResource = options.associatedResource;
        }
        // Handle untitled resource
        else {
            if (options.untitledResource?.scheme === Schemas.untitled) {
                massagedOptions.untitledResource = options.untitledResource;
            }
            massagedOptions.isScratchpad = options.isScratchpad;
        }
        // Take over initial value
        massagedOptions.contents = options.contents;
        return massagedOptions;
    }
    doCreate(options) {
        // Create a new untitled resource if none is provided
        let untitledResource = options.untitledResource;
        if (!untitledResource) {
            let counter = 1;
            do {
                untitledResource = URI.from({
                    scheme: Schemas.untitled,
                    path: options.isScratchpad ? `Scratchpad-${counter}` : `Untitled-${counter}`,
                    query: this.workingCopyTypeId
                        ? `typeId=${this.workingCopyTypeId}` // distinguish untitled resources among others by encoding the `typeId` as query param
                        : undefined, // keep untitled resources for text files as they are (when `typeId === ''`)
                });
                counter++;
            } while (this.has(untitledResource));
        }
        // Create new working copy with provided options
        const workingCopy = new UntitledFileWorkingCopy(this.workingCopyTypeId, untitledResource, this.labelService.getUriBasenameLabel(untitledResource), !!options.associatedResource, !!options.isScratchpad, options.contents, this.modelFactory, this.saveDelegate, this.workingCopyService, this.workingCopyBackupService, this.logService);
        // Register
        this.registerWorkingCopy(workingCopy);
        return workingCopy;
    }
    registerWorkingCopy(workingCopy) {
        // Install working copy listeners
        const workingCopyListeners = new DisposableStore();
        workingCopyListeners.add(workingCopy.onDidChangeDirty(() => this._onDidChangeDirty.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onWillDispose(() => this._onWillDispose.fire(workingCopy)));
        // Keep for disposal
        this.mapResourceToWorkingCopyListeners.set(workingCopy.resource, workingCopyListeners);
        // Add to cache
        this.add(workingCopy.resource, workingCopy);
        // If the working copy is dirty right from the beginning,
        // make sure to emit this as an event
        if (workingCopy.isDirty()) {
            this._onDidChangeDirty.fire(workingCopy);
        }
    }
    remove(resource) {
        const removed = super.remove(resource);
        // Dispose any existing working copy listeners
        const workingCopyListener = this.mapResourceToWorkingCopyListeners.get(resource);
        if (workingCopyListener) {
            dispose(workingCopyListener);
            this.mapResourceToWorkingCopyListeners.delete(resource);
        }
        return removed;
    }
    //#endregion
    //#region Lifecycle
    dispose() {
        super.dispose();
        // Dispose the working copy change listeners
        dispose(this.mapResourceToWorkingCopyListeners.values());
        this.mapResourceToWorkingCopyListeners.clear();
    }
    //#endregion
    notifyDidSave(source, target) {
        this._onDidSave.fire({ source, target });
    }
};
UntitledFileWorkingCopyManager = __decorate([
    __param(3, IFileService),
    __param(4, ILabelService),
    __param(5, ILogService),
    __param(6, IWorkingCopyBackupService),
    __param(7, IWorkingCopyService)
], UntitledFileWorkingCopyManager);
export { UntitledFileWorkingCopyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi91bnRpdGxlZEZpbGVXb3JraW5nQ29weU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQU1OLHVCQUF1QixHQUN2QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQW9IckQsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFDWixTQUFRLDBCQUEwRDtJQWtCbEUsWUFDa0IsaUJBQXlCLEVBQ3pCLFlBQXFELEVBQ3JELFlBQXFELEVBQ3hELFdBQXlCLEVBQ3hCLFlB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