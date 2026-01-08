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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3VudGl0bGVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBTU4sdUJBQXVCLEdBQ3ZCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBb0hyRCxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUNaLFNBQVEsMEJBQTBEO0lBa0JsRSxZQUNrQixpQkFBeUIsRUFDekIsWUFBcUQsRUFDckQsWUFBcUQsRUFDeEQsV0FBeUIsRUFD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