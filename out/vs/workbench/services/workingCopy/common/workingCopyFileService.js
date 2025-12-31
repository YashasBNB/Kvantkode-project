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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlGaWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vd29ya2luZ0NvcHlGaWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sZUFBZSxFQUNmLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQVMsWUFBWSxFQUFjLE1BQU0sa0NBQWtDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFDTixZQUFZLEdBR1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQVE5RixPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUdoRyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FDbkMsZUFBZSxDQUEwQix3QkFBd0IsQ0FBQyxDQUFBO0FBd1I1RCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUF3QnJELFlBQ2UsV0FBMEMsRUFDbkMsa0JBQXdELEVBQ3RELG9CQUEyQyxFQUM3QyxrQkFBd0Q7UUFFN0UsS0FBSyxFQUFFLENBQUE7UUFMd0IsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUV2Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBekI5RSxnQkFBZ0I7UUFFQyx1Q0FBa0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNuRSxJQUFJLFlBQVksRUFBd0IsQ0FDeEMsQ0FBQTtRQUNRLHNDQUFpQyxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFLLENBQUE7UUFFekUsdUNBQWtDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkUsSUFBSSxZQUFZLEVBQXdCLENBQ3hDLENBQUE7UUFDUSxzQ0FBaUMsR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQUMsS0FBSyxDQUFBO1FBRXpFLHNDQUFpQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2xFLElBQUksWUFBWSxFQUF3QixDQUN4QyxDQUFBO1FBQ1EscUNBQWdDLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLEtBQUssQ0FBQTtRQUV4RixZQUFZO1FBRUosbUJBQWMsR0FBRyxDQUFDLENBQUE7UUF3VTFCLFlBQVk7UUFFWixzQkFBc0I7UUFFTCx5QkFBb0IsR0FBMEIsRUFBRSxDQUFBO1FBbFVoRSxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDOUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1DQUFtQyxDQUFDLENBQ3hFLENBQUE7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9DQUFvQyxDQUFDLENBQ3pFLENBQUE7UUFFRCw4RUFBOEU7UUFDOUUsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUM3QyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQ25FLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDNUMsd0RBQXdEO29CQUN4RCx3REFBd0Q7b0JBQ3hELGlCQUFpQjtvQkFDakIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUN0RixDQUFDO2dCQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM5RSxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQseUJBQXlCO0lBRXpCLE1BQU0sQ0FDTCxVQUFrQyxFQUNsQyxLQUF3QixFQUN4QixRQUFxQztRQUVyQyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsWUFBWSxDQUNYLFVBQThCLEVBQzlCLEtBQXdCLEVBQ3hCLFFBQXFDO1FBRXJDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQ3pCLFVBQXVELEVBQ3ZELE1BQWUsRUFDZixLQUF3QixFQUN4QixRQUFxQztRQUVyQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsNENBQTRDO1FBQzVDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLGVBQWUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQzdDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUN0RixDQUNELENBQUE7WUFDRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxjQUFjLFlBQVksS0FBSyxDQUFDLENBQUE7WUFDdkYsSUFBSSxLQUFLLFlBQVksS0FBSyxFQUFFLENBQUM7Z0JBQzVCLE1BQU0sS0FBSyxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssZ0NBQXdCLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVyRixnQkFBZ0I7UUFDaEIsTUFBTSxLQUFLLEdBQUcsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLFNBQVMsOEJBQXNCLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDOUYsTUFBTSxJQUFJLENBQUMsa0NBQWtDLENBQUMsU0FBUyxDQUN0RCxLQUFLLEVBQ0wsaUJBQWlCLENBQUMsSUFBSSxDQUFDLHlFQUF5RSxDQUNoRyxDQUFBO1FBRUQsOEJBQThCO1FBQzlCLElBQUksS0FBOEIsQ0FBQTtRQUNsQyxJQUFJLENBQUM7WUFDSixJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLEtBQUssR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQzdCLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FDMUIsU0FBUyxDQUFDLFFBQVEsRUFDakIsU0FBa0MsQ0FBQyxRQUFRLEVBQzVDLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FDbEMsQ0FDRCxDQUNELENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FDN0IsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQ2hGLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsY0FBYztZQUNkLE1BQU0sSUFBSSxDQUFDLGtDQUFrQyxDQUFDLFNBQVMsQ0FDdEQsS0FBSyxFQUNMLGlCQUFpQixDQUFDLElBQUksQ0FBQyx5RUFBeUUsQ0FDaEcsQ0FBQTtZQUVELE1BQU0sS0FBSyxDQUFBO1FBQ1osQ0FBQztRQUVELGNBQWM7UUFDZCxNQUFNLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxTQUFTLENBQ3JELEtBQUssRUFDTCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMseUVBQXlFLENBQ2hHLENBQUE7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUNULFVBQTRCLEVBQzVCLEtBQXdCLEVBQ3hCLFFBQXFDO1FBRXJDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FDVCxVQUE0QixFQUM1QixLQUF3QixFQUN4QixRQUFxQztRQUVyQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZLENBQ3pCLFVBQStDLEVBQy9DLElBQWEsRUFDYixLQUF3QixFQUN4QixRQUFxQztRQUVyQyxNQUFNLEtBQUssR0FBNEIsRUFBRSxDQUFBO1FBRXpDLCtDQUErQztRQUMvQyxLQUFLLE1BQU0sRUFDVixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQ3hCLFNBQVMsR0FDVCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxDQUFDLElBQUk7Z0JBQ3JDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQztnQkFDckQsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtZQUN2RCxJQUFJLGtCQUFrQixZQUFZLEtBQUssRUFBRSxDQUFDO2dCQUN6QyxNQUFNLGtCQUFrQixDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBRUQsNkJBQTZCO1FBQzdCLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQyxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FDdEMsS0FBSyxFQUNMLElBQUksQ0FBQyxDQUFDLDRCQUFvQixDQUFDLDJCQUFtQixFQUM5QyxRQUFRLEVBQ1IsS0FBSyxDQUNMLENBQUE7UUFFRCxlQUFlO1FBQ2YsTUFBTSxLQUFLLEdBQUc7WUFDYixhQUFhLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNwQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsNEJBQW9CLENBQUMsMkJBQW1CO1lBQ3pELEtBQUs7U0FDTCxDQUFBO1FBQ0QsTUFBTSxJQUFJLENBQUMsa0NBQWtDLENBQUMsU0FBUyxDQUN0RCxLQUFLLEVBQ0wsaUJBQWlCLENBQUMsSUFBSSxDQUFDLHlFQUF5RSxDQUNoRyxDQUFBO1FBRUQsSUFBSSxDQUFDO1lBQ0osS0FBSyxNQUFNLEVBQ1YsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUN4QixTQUFTLEdBQ1QsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDakIsa0VBQWtFO2dCQUNsRSw4QkFBOEI7Z0JBQzlCLGlEQUFpRDtnQkFDakQsaUNBQWlDO2dCQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzdELE1BQU0sa0JBQWtCLEdBQUcsSUFBSTt3QkFDOUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDdEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ3hCLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FDckIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQ3JGLENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCw0REFBNEQ7Z0JBQzVELElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtnQkFDbkUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7Z0JBQ25FLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsY0FBYztZQUNkLE1BQU0sSUFBSSxDQUFDLGtDQUFrQyxDQUFDLFNBQVMsQ0FDdEQsS0FBSyxFQUNMLGlCQUFpQixDQUFDLElBQUksQ0FBQyx5RUFBeUUsQ0FDaEcsQ0FBQTtZQUVELE1BQU0sS0FBSyxDQUFBO1FBQ1osQ0FBQztRQUVELGNBQWM7UUFDZCxNQUFNLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxTQUFTLENBQ3JELEtBQUssRUFDTCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMseUVBQXlFLENBQ2hHLENBQUE7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUNYLFVBQThCLEVBQzlCLEtBQXdCLEVBQ3hCLFFBQXFDO1FBRXJDLDRDQUE0QztRQUM1QyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtnQkFDM0UsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTO2dCQUM5QixRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7YUFDNUIsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxjQUFjLFlBQVksS0FBSyxFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sY0FBYyxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDO1FBRUQsNkJBQTZCO1FBQzdCLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLGdDQUF3QixRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFckYsZ0JBQWdCO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxTQUFTLDhCQUFzQixFQUFFLEtBQUssRUFBRSxDQUFBO1FBQzlGLE1BQU0sSUFBSSxDQUFDLGtDQUFrQyxDQUFDLFNBQVMsQ0FDdEQsS0FBSyxFQUNMLGlCQUFpQixDQUFDLElBQUksQ0FBQyx5RUFBeUUsQ0FDaEcsQ0FBQTtRQUVELCtEQUErRDtRQUMvRCwyREFBMkQ7UUFDM0QsOENBQThDO1FBQzlDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7WUFDcEMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM1RCxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQ3JCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUNyRixDQUFBO1FBQ0YsQ0FBQztRQUVELGdDQUFnQztRQUNoQyxJQUFJLENBQUM7WUFDSixLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNwQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7b0JBQzlDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztvQkFDOUIsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO2lCQUM1QixDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsY0FBYztZQUNkLE1BQU0sSUFBSSxDQUFDLGtDQUFrQyxDQUFDLFNBQVMsQ0FDdEQsS0FBSyxFQUNMLGlCQUFpQixDQUFDLElBQUksQ0FBQyx5RUFBeUUsQ0FDaEcsQ0FBQTtZQUVELE1BQU0sS0FBSyxDQUFBO1FBQ1osQ0FBQztRQUVELGNBQWM7UUFDZCxNQUFNLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxTQUFTLENBQ3JELEtBQUssRUFDTCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMseUVBQXlFLENBQ2hHLENBQUE7SUFDRixDQUFDO0lBUUQsMkJBQTJCLENBQUMsV0FBaUQ7UUFDNUUsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVPLDRCQUE0QixDQUNuQyxLQUF5QixFQUN6QixTQUF3QixFQUN4QixRQUFnRCxFQUNoRCxLQUF3QjtRQUV4QixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDckYsQ0FBQztJQVFELElBQUksbUJBQW1CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVELGtCQUFrQixDQUFDLFdBQWtEO1FBQ3BFLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxtQkFBbUIsQ0FDbEIsV0FBZ0UsRUFDaEUsT0FBcUQsRUFDckQsUUFBa0MsRUFDbEMsS0FBd0I7UUFFeEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2hGLENBQUM7SUFRRCwyQkFBMkIsQ0FBQyxRQUE2QjtRQUN4RCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTFELE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBYTtRQUNyQixNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFnQixDQUFBO1FBQ2xELEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDbEQsS0FBSyxNQUFNLFdBQVcsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztvQkFDM0Isa0JBQWtCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0NBR0QsQ0FBQTtBQXhYWSxzQkFBc0I7SUF5QmhDLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7R0E1QlQsc0JBQXNCLENBd1hsQzs7QUFFRCxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSxzQkFBc0Isb0NBQTRCLENBQUEifQ==