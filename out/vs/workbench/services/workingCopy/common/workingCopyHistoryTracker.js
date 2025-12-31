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
var WorkingCopyHistoryTracker_1;
import { localize } from '../../../../nls.js';
import { GlobalIdleValue, Limiter } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IPathService } from '../../path/common/pathService.js';
import { isStoredFileWorkingCopySaveEvent, } from './storedFileWorkingCopy.js';
import { IWorkingCopyHistoryService, MAX_PARALLEL_HISTORY_IO_OPS } from './workingCopyHistory.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { Schemas } from '../../../../base/common/network.js';
import { ResourceGlobMatcher } from '../../../common/resources.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
let WorkingCopyHistoryTracker = class WorkingCopyHistoryTracker extends Disposable {
    static { WorkingCopyHistoryTracker_1 = this; }
    static { this.SETTINGS = {
        ENABLED: 'workbench.localHistory.enabled',
        SIZE_LIMIT: 'workbench.localHistory.maxFileSize',
        EXCLUDES: 'workbench.localHistory.exclude',
    }; }
    static { this.UNDO_REDO_SAVE_SOURCE = SaveSourceRegistry.registerSource('undoRedo.source', localize('undoRedo.source', 'Undo / Redo')); }
    constructor(workingCopyService, workingCopyHistoryService, uriIdentityService, pathService, configurationService, undoRedoService, contextService, fileService) {
        super();
        this.workingCopyService = workingCopyService;
        this.workingCopyHistoryService = workingCopyHistoryService;
        this.uriIdentityService = uriIdentityService;
        this.pathService = pathService;
        this.configurationService = configurationService;
        this.undoRedoService = undoRedoService;
        this.contextService = contextService;
        this.fileService = fileService;
        this.limiter = this._register(new Limiter(MAX_PARALLEL_HISTORY_IO_OPS));
        this.resourceExcludeMatcher = this._register(new GlobalIdleValue(() => {
            const matcher = this._register(new ResourceGlobMatcher((root) => this.configurationService.getValue(WorkingCopyHistoryTracker_1.SETTINGS.EXCLUDES, {
                resource: root,
            }), (event) => event.affectsConfiguration(WorkingCopyHistoryTracker_1.SETTINGS.EXCLUDES), this.contextService, this.configurationService));
            return matcher;
        }));
        this.pendingAddHistoryEntryOperations = new ResourceMap((resource) => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.workingCopyContentVersion = new ResourceMap((resource) => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.historyEntryContentVersion = new ResourceMap((resource) => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.registerListeners();
    }
    registerListeners() {
        // File Events
        this._register(this.fileService.onDidRunOperation((e) => this.onDidRunFileOperation(e)));
        // Working Copy Events
        this._register(this.workingCopyService.onDidChangeContent((workingCopy) => this.onDidChangeContent(workingCopy)));
        this._register(this.workingCopyService.onDidSave((e) => this.onDidSave(e)));
    }
    async onDidRunFileOperation(e) {
        if (!this.shouldTrackHistoryFromFileOperationEvent(e)) {
            return; // return early for working copies we are not interested in
        }
        const source = e.resource;
        const target = e.target.resource;
        // Move working copy history entries for this file move event
        const resources = await this.workingCopyHistoryService.moveEntries(source, target);
        // Make sure to track the content version of each entry that
        // was moved in our map. This ensures that a subsequent save
        // without a content change does not add a redundant entry
        // (https://github.com/microsoft/vscode/issues/145881)
        for (const resource of resources) {
            const contentVersion = this.getContentVersion(resource);
            this.historyEntryContentVersion.set(resource, contentVersion);
        }
    }
    onDidChangeContent(workingCopy) {
        // Increment content version ID for resource
        const contentVersionId = this.getContentVersion(workingCopy.resource);
        this.workingCopyContentVersion.set(workingCopy.resource, contentVersionId + 1);
    }
    getContentVersion(resource) {
        return this.workingCopyContentVersion.get(resource) || 0;
    }
    onDidSave(e) {
        if (!this.shouldTrackHistoryFromSaveEvent(e)) {
            return; // return early for working copies we are not interested in
        }
        const contentVersion = this.getContentVersion(e.workingCopy.resource);
        if (this.historyEntryContentVersion.get(e.workingCopy.resource) === contentVersion) {
            return; // return early when content version already has associated history entry
        }
        // Cancel any previous operation for this resource
        this.pendingAddHistoryEntryOperations.get(e.workingCopy.resource)?.dispose(true);
        // Create new cancellation token support and remember
        const cts = new CancellationTokenSource();
        this.pendingAddHistoryEntryOperations.set(e.workingCopy.resource, cts);
        // Queue new operation to add to history
        this.limiter.queue(async () => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            const contentVersion = this.getContentVersion(e.workingCopy.resource);
            // Figure out source of save operation if not provided already
            let source = e.source;
            if (!e.source) {
                source = this.resolveSourceFromUndoRedo(e);
            }
            // Add entry
            await this.workingCopyHistoryService.addEntry({ resource: e.workingCopy.resource, source, timestamp: e.stat.mtime }, cts.token);
            // Remember content version as being added to history
            this.historyEntryContentVersion.set(e.workingCopy.resource, contentVersion);
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Finally remove from pending operations
            this.pendingAddHistoryEntryOperations.delete(e.workingCopy.resource);
        });
    }
    resolveSourceFromUndoRedo(e) {
        const lastStackElement = this.undoRedoService.getLastElement(e.workingCopy.resource);
        if (lastStackElement) {
            if (lastStackElement.code === 'undoredo.textBufferEdit') {
                return undefined; // ignore any unspecific stack element that resulted just from typing
            }
            return lastStackElement.label;
        }
        const allStackElements = this.undoRedoService.getElements(e.workingCopy.resource);
        if (allStackElements.future.length > 0 || allStackElements.past.length > 0) {
            return WorkingCopyHistoryTracker_1.UNDO_REDO_SAVE_SOURCE;
        }
        return undefined;
    }
    shouldTrackHistoryFromSaveEvent(e) {
        if (!isStoredFileWorkingCopySaveEvent(e)) {
            return false; // only support working copies that are backed by stored files
        }
        return this.shouldTrackHistory(e.workingCopy.resource, e.stat);
    }
    shouldTrackHistoryFromFileOperationEvent(e) {
        if (!e.isOperation(2 /* FileOperation.MOVE */)) {
            return false; // only interested in move operations
        }
        return this.shouldTrackHistory(e.target.resource, e.target);
    }
    shouldTrackHistory(resource, stat) {
        if (resource.scheme !== this.pathService.defaultUriScheme && // track history for all workspace resources
            resource.scheme !== Schemas.vscodeUserData && // track history for all settings
            resource.scheme !== Schemas.inMemory // track history for tests that use in-memory
        ) {
            return false; // do not support unknown resources
        }
        const configuredMaxFileSizeInBytes = 1024 *
            this.configurationService.getValue(WorkingCopyHistoryTracker_1.SETTINGS.SIZE_LIMIT, {
                resource,
            });
        if (stat.size > configuredMaxFileSizeInBytes) {
            return false; // only track files that are not too large
        }
        if (this.configurationService.getValue(WorkingCopyHistoryTracker_1.SETTINGS.ENABLED, {
            resource,
        }) === false) {
            return false; // do not track when history is disabled
        }
        // Finally check for exclude setting
        return !this.resourceExcludeMatcher.value.matches(resource);
    }
};
WorkingCopyHistoryTracker = WorkingCopyHistoryTracker_1 = __decorate([
    __param(0, IWorkingCopyService),
    __param(1, IWorkingCopyHistoryService),
    __param(2, IUriIdentityService),
    __param(3, IPathService),
    __param(4, IConfigurationService),
    __param(5, IUndoRedoService),
    __param(6, IWorkspaceContextService),
    __param(7, IFileService)
], WorkingCopyHistoryTracker);
export { WorkingCopyHistoryTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5VHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vd29ya2luZ0NvcHlIaXN0b3J5VHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUU1RixPQUFPLEVBQWMsa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUNOLGdDQUFnQyxHQUVoQyxNQUFNLDRCQUE0QixDQUFBO0FBR25DLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ2pHLE9BQU8sRUFBeUIsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFF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