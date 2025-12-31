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
var MainThreadFileSystemEventService_1;
import { DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { localize } from '../../../nls.js';
import { IWorkingCopyFileService, } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IBulkEditService } from '../../../editor/browser/services/bulkEditService.js';
import { IProgressService } from '../../../platform/progress/common/progress.js';
import { raceCancellation } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../base/common/severity.js';
import { IStorageService, } from '../../../platform/storage/common/storage.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { reviveWorkspaceEditDto } from './mainThreadBulkEdits.js';
import { URI } from '../../../base/common/uri.js';
let MainThreadFileSystemEventService = class MainThreadFileSystemEventService {
    static { MainThreadFileSystemEventService_1 = this; }
    static { this.MementoKeyAdditionalEdits = `file.particpants.additionalEdits`; }
    constructor(extHostContext, _fileService, workingCopyFileService, bulkEditService, progressService, dialogService, storageService, logService, envService, uriIdentService, _logService) {
        this._fileService = _fileService;
        this._logService = _logService;
        this._listener = new DisposableStore();
        this._watches = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystemEventService);
        this._listener.add(_fileService.onDidFilesChange((event) => {
            this._proxy.$onFileEvent({
                created: event.rawAdded,
                changed: event.rawUpdated,
                deleted: event.rawDeleted,
            });
        }));
        const that = this;
        const fileOperationParticipant = new (class {
            async participate(files, operation, undoInfo, timeout, token) {
                if (undoInfo?.isUndoing) {
                    return;
                }
                const cts = new CancellationTokenSource(token);
                const timer = setTimeout(() => cts.cancel(), timeout);
                const data = await progressService
                    .withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: this._progressLabel(operation),
                    cancellable: true,
                    delay: Math.min(timeout / 2, 3000),
                }, () => {
                    // race extension host event delivery against timeout AND user-cancel
                    const onWillEvent = that._proxy.$onWillRunFileOperation(operation, files, timeout, cts.token);
                    return raceCancellation(onWillEvent, cts.token);
                }, () => {
                    // user-cancel
                    cts.cancel();
                })
                    .finally(() => {
                    cts.dispose();
                    clearTimeout(timer);
                });
                if (!data || data.edit.edits.length === 0) {
                    // cancelled, no reply, or no edits
                    return;
                }
                const needsConfirmation = data.edit.edits.some((edit) => edit.metadata?.needsConfirmation);
                let showPreview = storageService.getBoolean(MainThreadFileSystemEventService_1.MementoKeyAdditionalEdits, 0 /* StorageScope.PROFILE */);
                if (envService.extensionTestsLocationURI) {
                    // don't show dialog in tests
                    showPreview = false;
                }
                if (showPreview === undefined) {
                    // show a user facing message
                    let message;
                    if (data.extensionNames.length === 1) {
                        if (operation === 0 /* FileOperation.CREATE */) {
                            message = localize('ask.1.create', "Extension '{0}' wants to make refactoring changes with this file creation", data.extensionNames[0]);
                        }
                        else if (operation === 3 /* FileOperation.COPY */) {
                            message = localize('ask.1.copy', "Extension '{0}' wants to make refactoring changes with this file copy", data.extensionNames[0]);
                        }
                        else if (operation === 2 /* FileOperation.MOVE */) {
                            message = localize('ask.1.move', "Extension '{0}' wants to make refactoring changes with this file move", data.extensionNames[0]);
                        } /* if (operation === FileOperation.DELETE) */
                        else {
                            message = localize('ask.1.delete', "Extension '{0}' wants to make refactoring changes with this file deletion", data.extensionNames[0]);
                        }
                    }
                    else {
                        if (operation === 0 /* FileOperation.CREATE */) {
                            message = localize({ key: 'ask.N.create', comment: ['{0} is a number, e.g "3 extensions want..."'] }, '{0} extensions want to make refactoring changes with this file creation', data.extensionNames.length);
                        }
                        else if (operation === 3 /* FileOperation.COPY */) {
                            message = localize({ key: 'ask.N.copy', comment: ['{0} is a number, e.g "3 extensions want..."'] }, '{0} extensions want to make refactoring changes with this file copy', data.extensionNames.length);
                        }
                        else if (operation === 2 /* FileOperation.MOVE */) {
                            message = localize({ key: 'ask.N.move', comment: ['{0} is a number, e.g "3 extensions want..."'] }, '{0} extensions want to make refactoring changes with this file move', data.extensionNames.length);
                        } /* if (operation === FileOperation.DELETE) */
                        else {
                            message = localize({ key: 'ask.N.delete', comment: ['{0} is a number, e.g "3 extensions want..."'] }, '{0} extensions want to make refactoring changes with this file deletion', data.extensionNames.length);
                        }
                    }
                    if (needsConfirmation) {
                        // edit which needs confirmation -> always show dialog
                        const { confirmed } = await dialogService.confirm({
                            type: Severity.Info,
                            message,
                            primaryButton: localize('preview', 'Show &&Preview'),
                            cancelButton: localize('cancel', 'Skip Changes'),
                        });
                        showPreview = true;
                        if (!confirmed) {
                            // no changes wanted
                            return;
                        }
                    }
                    else {
                        // choice
                        let Choice;
                        (function (Choice) {
                            Choice[Choice["OK"] = 0] = "OK";
                            Choice[Choice["Preview"] = 1] = "Preview";
                            Choice[Choice["Cancel"] = 2] = "Cancel";
                        })(Choice || (Choice = {}));
                        const { result, checkboxChecked } = await dialogService.prompt({
                            type: Severity.Info,
                            message,
                            buttons: [
                                {
                                    label: localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK'),
                                    run: () => Choice.OK,
                                },
                                {
                                    label: localize({ key: 'preview', comment: ['&& denotes a mnemonic'] }, 'Show &&Preview'),
                                    run: () => Choice.Preview,
                                },
                            ],
                            cancelButton: {
                                label: localize('cancel', 'Skip Changes'),
                                run: () => Choice.Cancel,
                            },
                            checkbox: { label: localize('again', 'Do not ask me again') },
                        });
                        if (result === Choice.Cancel) {
                            // no changes wanted, don't persist cancel option
                            return;
                        }
                        showPreview = result === Choice.Preview;
                        if (checkboxChecked) {
                            storageService.store(MainThreadFileSystemEventService_1.MementoKeyAdditionalEdits, showPreview, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                        }
                    }
                }
                logService.info('[onWill-handler] applying additional workspace edit from extensions', data.extensionNames);
                await bulkEditService.apply(reviveWorkspaceEditDto(data.edit, uriIdentService), {
                    undoRedoGroupId: undoInfo?.undoRedoGroupId,
                    showPreview,
                });
            }
            _progressLabel(operation) {
                switch (operation) {
                    case 0 /* FileOperation.CREATE */:
                        return localize('msg-create', "Running 'File Create' participants...");
                    case 2 /* FileOperation.MOVE */:
                        return localize('msg-rename', "Running 'File Rename' participants...");
                    case 3 /* FileOperation.COPY */:
                        return localize('msg-copy', "Running 'File Copy' participants...");
                    case 1 /* FileOperation.DELETE */:
                        return localize('msg-delete', "Running 'File Delete' participants...");
                    case 4 /* FileOperation.WRITE */:
                        return localize('msg-write', "Running 'File Write' participants...");
                }
            }
        })();
        // BEFORE file operation
        this._listener.add(workingCopyFileService.addFileOperationParticipant(fileOperationParticipant));
        // AFTER file operation
        this._listener.add(workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => this._proxy.$onDidRunFileOperation(e.operation, e.files)));
    }
    async $watch(extensionId, session, resource, unvalidatedOpts, correlate) {
        const uri = URI.revive(resource);
        const opts = {
            ...unvalidatedOpts,
        };
        // Convert a recursive watcher to a flat watcher if the path
        // turns out to not be a folder. Recursive watching is only
        // possible on folders, so we help all file watchers by checking
        // early.
        if (opts.recursive) {
            try {
                const stat = await this._fileService.stat(uri);
                if (!stat.isDirectory) {
                    opts.recursive = false;
                }
            }
            catch (error) {
                // ignore
            }
        }
        // Correlated file watching: use an exclusive `createWatcher()`
        // Note: currently not enabled for extensions (but leaving in in case of future usage)
        if (correlate && !opts.recursive) {
            this._logService.trace(`MainThreadFileSystemEventService#$watch(): request to start watching correlated (extension: ${extensionId}, path: ${uri.toString(true)}, recursive: ${opts.recursive}, session: ${session}, excludes: ${JSON.stringify(opts.excludes)}, includes: ${JSON.stringify(opts.includes)})`);
            const watcherDisposables = new DisposableStore();
            const subscription = watcherDisposables.add(this._fileService.createWatcher(uri, { ...opts, recursive: false }));
            watcherDisposables.add(subscription.onDidChange((event) => {
                this._proxy.$onFileEvent({
                    session,
                    created: event.rawAdded,
                    changed: event.rawUpdated,
                    deleted: event.rawDeleted,
                });
            }));
            this._watches.set(session, watcherDisposables);
        }
        // Uncorrelated file watching: via shared `watch()`
        else {
            this._logService.trace(`MainThreadFileSystemEventService#$watch(): request to start watching uncorrelated (extension: ${extensionId}, path: ${uri.toString(true)}, recursive: ${opts.recursive}, session: ${session}, excludes: ${JSON.stringify(opts.excludes)}, includes: ${JSON.stringify(opts.includes)})`);
            const subscription = this._fileService.watch(uri, opts);
            this._watches.set(session, subscription);
        }
    }
    $unwatch(session) {
        if (this._watches.has(session)) {
            this._logService.trace(`MainThreadFileSystemEventService#$unwatch(): request to stop watching (session: ${session})`);
            this._watches.deleteAndDispose(session);
        }
    }
    dispose() {
        this._listener.dispose();
        this._watches.dispose();
    }
};
MainThreadFileSystemEventService = MainThreadFileSystemEventService_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadFileSystemEventService),
    __param(1, IFileService),
    __param(2, IWorkingCopyFileService),
    __param(3, IBulkEditService),
    __param(4, IProgressService),
    __param(5, IDialogService),
    __param(6, IStorageService),
    __param(7, ILogService),
    __param(8, IEnvironmentService),
    __param(9, IUriIdentityService),
    __param(10, ILogService)
], MainThreadFileSystemEventService);
export { MainThreadFileSystemEventService };
registerAction2(class ResetMemento extends Action2 {
    constructor() {
        super({
            id: 'files.participants.resetChoice',
            title: {
                value: localize('label', "Reset choice for 'File operation needs preview'"),
                original: `Reset choice for 'File operation needs preview'`,
            },
            f1: true,
        });
    }
    run(accessor) {
        accessor
            .get(IStorageService)
            .remove(MainThreadFileSystemEventService.MementoKeyAdditionalEdits, 0 /* StorageScope.PROFILE */);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbEYsT0FBTyxFQUFpQixZQUFZLEVBQWlCLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixjQUFjLEVBRWQsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFFTix1QkFBdUIsR0FHdkIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0sK0NBQStDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM1RSxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUV0RixPQUFPLEVBQUUsV0FB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