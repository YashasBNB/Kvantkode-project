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
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { AsyncEmitter } from '../../../../base/common/event.js';
import { Promises } from '../../../../base/common/async.js';
import { insert } from '../../../../base/common/arrays.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { WorkingCopyFileOperationParticipant } from './workingCopyFileOperationParticipant.js';
import { StoredFileWorkingCopySaveParticipant } from './storedFileWorkingCopySaveParticipant.js';
export const IWorkingCopyFileService = createDecorator('workingCopyFileService');
let WorkingCopyFileService = class WorkingCopyFileService extends Disposable {
    constructor(fileService, workingCopyService, instantiationService, uriIdentityService) {
        super();
        this.fileService = fileService;
        this.workingCopyService = workingCopyService;
        this.uriIdentityService = uriIdentityService;
        //#region Events
        this._onWillRunWorkingCopyFileOperation = this._register(new AsyncEmitter());
        this.onWillRunWorkingCopyFileOperation = this._onWillRunWorkingCopyFileOperation.event;
        this._onDidFailWorkingCopyFileOperation = this._register(new AsyncEmitter());
        this.onDidFailWorkingCopyFileOperation = this._onDidFailWorkingCopyFileOperation.event;
        this._onDidRunWorkingCopyFileOperation = this._register(new AsyncEmitter());
        this.onDidRunWorkingCopyFileOperation = this._onDidRunWorkingCopyFileOperation.event;
        //#endregion
        this.correlationIds = 0;
        //#endregion
        //#region Path related
        this.workingCopyProviders = [];
        this.fileOperationParticipants = this._register(instantiationService.createInstance(WorkingCopyFileOperationParticipant));
        this.saveParticipants = this._register(instantiationService.createInstance(StoredFileWorkingCopySaveParticipant));
        // register a default working copy provider that uses the working copy service
        this._register(this.registerWorkingCopyProvider((resource) => {
            return this.workingCopyService.workingCopies.filter((workingCopy) => {
                if (this.fileService.hasProvider(resource)) {
                    // only check for parents if the resource can be handled
                    // by the file system where we then assume a folder like
                    // path structure
                    return this.uriIdentityService.extUri.isEqualOrParent(workingCopy.resource, resource);
                }
                return this.uriIdentityService.extUri.isEqual(workingCopy.resource, resource);
            });
        }));
    }
    //#region File operations
    create(operations, token, undoInfo) {
        return this.doCreateFileOrFolder(operations, true, token, undoInfo);
    }
    createFolder(operations, token, undoInfo) {
        return this.doCreateFileOrFolder(operations, false, token, undoInfo);
    }
    async doCreateFileOrFolder(operations, isFile, token, undoInfo) {
        if (operations.length === 0) {
            return [];
        }
        // validate create operation before starting
        if (isFile) {
            const validateCreates = await Promises.settled(operations.map((operation) => this.fileService.canCreateFile(operation.resource, { overwrite: operation.overwrite })));
            const error = validateCreates.find((validateCreate) => validateCreate instanceof Error);
            if (error instanceof Error) {
                throw error;
            }
        }
        // file operation participant
        const files = operations.map((operation) => ({ target: operation.resource }));
        await this.runFileOperationParticipants(files, 0 /* FileOperation.CREATE */, undoInfo, token);
        // before events
        const event = { correlationId: this.correlationIds++, operation: 0 /* FileOperation.CREATE */, files };
        await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        // now actually create on disk
        let stats;
        try {
            if (isFile) {
                stats = await Promises.settled(operations.map((operation) => this.fileService.createFile(operation.resource, operation.contents, { overwrite: operation.overwrite })));
            }
            else {
                stats = await Promises.settled(operations.map((operation) => this.fileService.createFolder(operation.resource)));
            }
        }
        catch (error) {
            // error event
            await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
            throw error;
        }
        // after event
        await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        return stats;
    }
    async move(operations, token, undoInfo) {
        return this.doMoveOrCopy(operations, true, token, undoInfo);
    }
    async copy(operations, token, undoInfo) {
        return this.doMoveOrCopy(operations, false, token, undoInfo);
    }
    async doMoveOrCopy(operations, move, token, undoInfo) {
        const stats = [];
        // validate move/copy operation before starting
        for (const { file: { source, target }, overwrite, } of operations) {
            const validateMoveOrCopy = await (move
                ? this.fileService.canMove(source, target, overwrite)
                : this.fileService.canCopy(source, target, overwrite));
            if (validateMoveOrCopy instanceof Error) {
                throw validateMoveOrCopy;
            }
        }
        // file operation participant
        const files = operations.map((o) => o.file);
        await this.runFileOperationParticipants(files, move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */, undoInfo, token);
        // before event
        const event = {
            correlationId: this.correlationIds++,
            operation: move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */,
            files,
        };
        await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        try {
            for (const { file: { source, target }, overwrite, } of operations) {
                // if source and target are not equal, handle dirty working copies
                // depending on the operation:
                // - move: revert both source and target (if any)
                // - copy: revert target (if any)
                if (!this.uriIdentityService.extUri.isEqual(source, target)) {
                    const dirtyWorkingCopies = move
                        ? [...this.getDirty(source), ...this.getDirty(target)]
                        : this.getDirty(target);
                    await Promises.settled(dirtyWorkingCopies.map((dirtyWorkingCopy) => dirtyWorkingCopy.revert({ soft: true })));
                }
                // now we can rename the source to target via file operation
                if (move) {
                    stats.push(await this.fileService.move(source, target, overwrite));
                }
                else {
                    stats.push(await this.fileService.copy(source, target, overwrite));
                }
            }
        }
        catch (error) {
            // error event
            await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
            throw error;
        }
        // after event
        await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        return stats;
    }
    async delete(operations, token, undoInfo) {
        // validate delete operation before starting
        for (const operation of operations) {
            const validateDelete = await this.fileService.canDelete(operation.resource, {
                recursive: operation.recursive,
                useTrash: operation.useTrash,
            });
            if (validateDelete instanceof Error) {
                throw validateDelete;
            }
        }
        // file operation participant
        const files = operations.map((operation) => ({ target: operation.resource }));
        await this.runFileOperationParticipants(files, 1 /* FileOperation.DELETE */, undoInfo, token);
        // before events
        const event = { correlationId: this.correlationIds++, operation: 1 /* FileOperation.DELETE */, files };
        await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        // check for any existing dirty working copies for the resource
        // and do a soft revert before deleting to be able to close
        // any opened editor with these working copies
        for (const operation of operations) {
            const dirtyWorkingCopies = this.getDirty(operation.resource);
            await Promises.settled(dirtyWorkingCopies.map((dirtyWorkingCopy) => dirtyWorkingCopy.revert({ soft: true })));
        }
        // now actually delete from disk
        try {
            for (const operation of operations) {
                await this.fileService.del(operation.resource, {
                    recursive: operation.recursive,
                    useTrash: operation.useTrash,
                });
            }
        }
        catch (error) {
            // error event
            await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
            throw error;
        }
        // after event
        await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
    }
    addFileOperationParticipant(participant) {
        return this.fileOperationParticipants.addFileOperationParticipant(participant);
    }
    runFileOperationParticipants(files, operation, undoInfo, token) {
        return this.fileOperationParticipants.participate(files, operation, undoInfo, token);
    }
    get hasSaveParticipants() {
        return this.saveParticipants.length > 0;
    }
    addSaveParticipant(participant) {
        return this.saveParticipants.addSaveParticipant(participant);
    }
    runSaveParticipants(workingCopy, context, progress, token) {
        return this.saveParticipants.participate(workingCopy, context, progress, token);
    }
    registerWorkingCopyProvider(provider) {
        const remove = insert(this.workingCopyProviders, provider);
        return toDisposable(remove);
    }
    getDirty(resource) {
        const dirtyWorkingCopies = new Set();
        for (const provider of this.workingCopyProviders) {
            for (const workingCopy of provider(resource)) {
                if (workingCopy.isDirty()) {
                    dirtyWorkingCopies.add(workingCopy);
                }
            }
        }
        return Array.from(dirtyWorkingCopies);
    }
};
WorkingCopyFileService = __decorate([
    __param(0, IFileService),
    __param(1, IWorkingCopyService),
    __param(2, IInstantiationService),
    __param(3, IUriIdentityService)
], WorkingCopyFileService);
export { WorkingCopyFileService };
registerSingleton(IWorkingCopyFileService, WorkingCopyFileService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlGaWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi93b3JraW5nQ29weUZpbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBUyxZQUFZLEVBQWMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUNOLFlBQVksR0FHWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBUTlGLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBR2hHLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUNuQyxlQUFlLENBQTBCLHdCQUF3QixDQUFDLENBQUE7QUF3UjVELElBQU0sc0JBQXNCLEdBQTVCLE1B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