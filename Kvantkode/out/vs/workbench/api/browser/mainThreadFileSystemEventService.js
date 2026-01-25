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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRmlsZVN5c3RlbUV2ZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNsRixPQUFPLEVBQWlCLFlBQVksRUFBaUIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUVOLHVCQUF1QixHQUd2QixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzVFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXRGLE9BQU8sRUFB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