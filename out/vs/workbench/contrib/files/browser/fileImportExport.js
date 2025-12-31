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
var BrowserFileUpload_1, FileDownload_1;
import { localize } from '../../../../nls.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { getFileNamesMessage, IDialogService, IFileDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { ByteSize, IFileService, } from '../../../../platform/files/common/files.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IExplorerService } from './files.js';
import { VIEW_ID } from '../common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Limiter, Promises, RunOnceWorker } from '../../../../base/common/async.js';
import { newWriteableBufferStream, VSBuffer } from '../../../../base/common/buffer.js';
import { basename, dirname, joinPath } from '../../../../base/common/resources.js';
import { ResourceFileEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { ExplorerItem } from '../common/explorerModel.js';
import { URI } from '../../../../base/common/uri.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { extractEditorsAndFilesDropData } from '../../../../platform/dnd/browser/dnd.js';
import { IWorkspaceEditingService } from '../../../services/workspaces/common/workspaceEditing.js';
import { isWeb } from '../../../../base/common/platform.js';
import { getActiveWindow, isDragEvent, triggerDownload } from '../../../../base/browser/dom.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { listenStream } from '../../../../base/common/stream.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { canceled } from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { WebFileSystemAccess } from '../../../../platform/files/browser/webFileSystemAccess.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
let BrowserFileUpload = class BrowserFileUpload {
    static { BrowserFileUpload_1 = this; }
    static { this.MAX_PARALLEL_UPLOADS = 20; }
    constructor(progressService, dialogService, explorerService, editorService, fileService) {
        this.progressService = progressService;
        this.dialogService = dialogService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.fileService = fileService;
    }
    upload(target, source) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const uploadPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: true,
            title: localize('uploadingFiles', 'Uploading'),
        }, async (progress) => this.doUpload(target, this.toTransfer(source), progress, cts.token), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => uploadPromise);
        return uploadPromise;
    }
    toTransfer(source) {
        if (isDragEvent(source)) {
            return source.dataTransfer;
        }
        const transfer = { items: [] };
        // We want to reuse the same code for uploading from
        // Drag & Drop as well as input element based upload
        // so we convert into webkit data transfer when the
        // input element approach is used (simplified).
        for (const file of source) {
            transfer.items.push({
                webkitGetAsEntry: () => {
                    return {
                        name: file.name,
                        isDirectory: false,
                        isFile: true,
                        createReader: () => {
                            throw new Error('Unsupported for files');
                        },
                        file: (resolve) => resolve(file),
                    };
                },
            });
        }
        return transfer;
    }
    async doUpload(target, source, progress, token) {
        const items = source.items;
        // Somehow the items thing is being modified at random, maybe as a security
        // measure since this is a DND operation. As such, we copy the items into
        // an array we own as early as possible before using it.
        const entries = [];
        for (const item of items) {
            entries.push(item.webkitGetAsEntry());
        }
        const results = [];
        const operation = {
            startTime: Date.now(),
            progressScheduler: new RunOnceWorker((steps) => {
                progress.report(steps[steps.length - 1]);
            }, 1000),
            filesTotal: entries.length,
            filesUploaded: 0,
            totalBytesUploaded: 0,
        };
        // Upload all entries in parallel up to a
        // certain maximum leveraging the `Limiter`
        const uploadLimiter = new Limiter(BrowserFileUpload_1.MAX_PARALLEL_UPLOADS);
        await Promises.settled(entries.map((entry) => {
            return uploadLimiter.queue(async () => {
                if (token.isCancellationRequested) {
                    return;
                }
                // Confirm overwrite as needed
                if (target && entry.name && target.getChild(entry.name)) {
                    const { confirmed } = await this.dialogService.confirm(getFileOverwriteConfirm(entry.name));
                    if (!confirmed) {
                        return;
                    }
                    await this.explorerService.applyBulkEdit([
                        new ResourceFileEdit(joinPath(target.resource, entry.name), undefined, {
                            recursive: true,
                            folder: target.getChild(entry.name)?.isDirectory,
                        }),
                    ], {
                        undoLabel: localize('overwrite', 'Overwrite {0}', entry.name),
                        progressLabel: localize('overwriting', 'Overwriting {0}', entry.name),
                    });
                    if (token.isCancellationRequested) {
                        return;
                    }
                }
                // Upload entry
                const result = await this.doUploadEntry(entry, target.resource, target, progress, operation, token);
                if (result) {
                    results.push(result);
                }
            });
        }));
        operation.progressScheduler.dispose();
        // Open uploaded file in editor only if we upload just one
        const firstUploadedFile = results[0];
        if (!token.isCancellationRequested && firstUploadedFile?.isFile) {
            await this.editorService.openEditor({
                resource: firstUploadedFile.resource,
                options: { pinned: true },
            });
        }
    }
    async doUploadEntry(entry, parentResource, target, progress, operation, token) {
        if (token.isCancellationRequested || !entry.name || (!entry.isFile && !entry.isDirectory)) {
            return undefined;
        }
        // Report progress
        let fileBytesUploaded = 0;
        const reportProgress = (fileSize, bytesUploaded) => {
            fileBytesUploaded += bytesUploaded;
            operation.totalBytesUploaded += bytesUploaded;
            const bytesUploadedPerSecond = operation.totalBytesUploaded / ((Date.now() - operation.startTime) / 1000);
            // Small file
            let message;
            if (fileSize < ByteSize.MB) {
                if (operation.filesTotal === 1) {
                    message = `${entry.name}`;
                }
                else {
                    message = localize('uploadProgressSmallMany', '{0} of {1} files ({2}/s)', operation.filesUploaded, operation.filesTotal, ByteSize.formatSize(bytesUploadedPerSecond));
                }
            }
            // Large file
            else {
                message = localize('uploadProgressLarge', '{0} ({1} of {2}, {3}/s)', entry.name, ByteSize.formatSize(fileBytesUploaded), ByteSize.formatSize(fileSize), ByteSize.formatSize(bytesUploadedPerSecond));
            }
            // Report progress but limit to update only once per second
            operation.progressScheduler.work({ message });
        };
        operation.filesUploaded++;
        reportProgress(0, 0);
        // Handle file upload
        const resource = joinPath(parentResource, entry.name);
        if (entry.isFile) {
            const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
            if (token.isCancellationRequested) {
                return undefined;
            }
            // Chrome/Edge/Firefox support stream method, but only use it for
            // larger files to reduce the overhead of the streaming approach
            if (typeof file.stream === 'function' && file.size > ByteSize.MB) {
                await this.doUploadFileBuffered(resource, file, reportProgress, token);
            }
            // Fallback to unbuffered upload for other browsers or small files
            else {
                await this.doUploadFileUnbuffered(resource, file, reportProgress);
            }
            return { isFile: true, resource };
        }
        // Handle folder upload
        else {
            // Create target folder
            await this.fileService.createFolder(resource);
            if (token.isCancellationRequested) {
                return undefined;
            }
            // Recursive upload files in this directory
            const dirReader = entry.createReader();
            const childEntries = [];
            let done = false;
            do {
                const childEntriesChunk = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
                if (childEntriesChunk.length > 0) {
                    childEntries.push(...childEntriesChunk);
                }
                else {
                    done = true; // an empty array is a signal that all entries have been read
                }
            } while (!done && !token.isCancellationRequested);
            // Update operation total based on new counts
            operation.filesTotal += childEntries.length;
            // Split up files from folders to upload
            const folderTarget = (target && target.getChild(entry.name)) || undefined;
            const fileChildEntries = [];
            const folderChildEntries = [];
            for (const childEntry of childEntries) {
                if (childEntry.isFile) {
                    fileChildEntries.push(childEntry);
                }
                else if (childEntry.isDirectory) {
                    folderChildEntries.push(childEntry);
                }
            }
            // Upload files (up to `MAX_PARALLEL_UPLOADS` in parallel)
            const fileUploadQueue = new Limiter(BrowserFileUpload_1.MAX_PARALLEL_UPLOADS);
            await Promises.settled(fileChildEntries.map((fileChildEntry) => {
                return fileUploadQueue.queue(() => this.doUploadEntry(fileChildEntry, resource, folderTarget, progress, operation, token));
            }));
            // Upload folders (sequentially give we don't know their sizes)
            for (const folderChildEntry of folderChildEntries) {
                await this.doUploadEntry(folderChildEntry, resource, folderTarget, progress, operation, token);
            }
            return { isFile: false, resource };
        }
    }
    async doUploadFileBuffered(resource, file, progressReporter, token) {
        const writeableStream = newWriteableBufferStream({
            // Set a highWaterMark to prevent the stream
            // for file upload to produce large buffers
            // in-memory
            highWaterMark: 10,
        });
        const writeFilePromise = this.fileService.writeFile(resource, writeableStream);
        // Read the file in chunks using File.stream() web APIs
        try {
            const reader = file.stream().getReader();
            let res = await reader.read();
            while (!res.done) {
                if (token.isCancellationRequested) {
                    break;
                }
                // Write buffer into stream but make sure to wait
                // in case the `highWaterMark` is reached
                const buffer = VSBuffer.wrap(res.value);
                await writeableStream.write(buffer);
                if (token.isCancellationRequested) {
                    break;
                }
                // Report progress
                progressReporter(file.size, buffer.byteLength);
                res = await reader.read();
            }
            writeableStream.end(undefined);
        }
        catch (error) {
            writeableStream.error(error);
            writeableStream.end();
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Wait for file being written to target
        await writeFilePromise;
    }
    doUploadFileUnbuffered(resource, file, progressReporter) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    if (event.target?.result instanceof ArrayBuffer) {
                        const buffer = VSBuffer.wrap(new Uint8Array(event.target.result));
                        await this.fileService.writeFile(resource, buffer);
                        // Report progress
                        progressReporter(file.size, buffer.byteLength);
                    }
                    else {
                        throw new Error('Could not read from dropped file.');
                    }
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            };
            // Start reading the file to trigger `onload`
            reader.readAsArrayBuffer(file);
        });
    }
};
BrowserFileUpload = BrowserFileUpload_1 = __decorate([
    __param(0, IProgressService),
    __param(1, IDialogService),
    __param(2, IExplorerService),
    __param(3, IEditorService),
    __param(4, IFileService)
], BrowserFileUpload);
export { BrowserFileUpload };
//#endregion
//#region External File Import (drag and drop)
let ExternalFileImport = class ExternalFileImport {
    constructor(fileService, hostService, contextService, configurationService, dialogService, workspaceEditingService, explorerService, editorService, progressService, notificationService, instantiationService) {
        this.fileService = fileService;
        this.hostService = hostService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this.workspaceEditingService = workspaceEditingService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.progressService = progressService;
        this.notificationService = notificationService;
        this.instantiationService = instantiationService;
    }
    async import(target, source, targetWindow) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const importPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: true,
            title: localize('copyingFiles', 'Copying...'),
        }, async () => await this.doImport(target, source, targetWindow, cts.token), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => importPromise);
        return importPromise;
    }
    async doImport(target, source, targetWindow, token) {
        // Activate all providers for the resources dropped
        const candidateFiles = coalesce((await this.instantiationService.invokeFunction((accessor) => extractEditorsAndFilesDropData(accessor, source))).map((editor) => editor.resource));
        await Promise.all(candidateFiles.map((resource) => this.fileService.activateProvider(resource.scheme)));
        // Check for dropped external files to be folders
        const files = coalesce(candidateFiles.filter((resource) => this.fileService.hasProvider(resource)));
        const resolvedFiles = await this.fileService.resolveAll(files.map((file) => ({ resource: file })));
        if (token.isCancellationRequested) {
            return;
        }
        // Pass focus to window
        this.hostService.focus(targetWindow);
        // Handle folders by adding to workspace if we are in workspace context and if dropped on top
        const folders = resolvedFiles
            .filter((resolvedFile) => resolvedFile.success && resolvedFile.stat?.isDirectory)
            .map((resolvedFile) => ({ uri: resolvedFile.stat.resource }));
        if (folders.length > 0 && target.isRoot) {
            let ImportChoice;
            (function (ImportChoice) {
                ImportChoice[ImportChoice["Copy"] = 1] = "Copy";
                ImportChoice[ImportChoice["Add"] = 2] = "Add";
            })(ImportChoice || (ImportChoice = {}));
            const buttons = [
                {
                    label: folders.length > 1
                        ? localize('copyFolders', '&&Copy Folders')
                        : localize('copyFolder', '&&Copy Folder'),
                    run: () => ImportChoice.Copy,
                },
            ];
            let message;
            // We only allow to add a folder to the workspace if there is already a workspace folder with that scheme
            const workspaceFolderSchemas = this.contextService
                .getWorkspace()
                .folders.map((folder) => folder.uri.scheme);
            if (folders.some((folder) => workspaceFolderSchemas.indexOf(folder.uri.scheme) >= 0)) {
                buttons.unshift({
                    label: folders.length > 1
                        ? localize('addFolders', '&&Add Folders to Workspace')
                        : localize('addFolder', '&&Add Folder to Workspace'),
                    run: () => ImportChoice.Add,
                });
                message =
                    folders.length > 1
                        ? localize('dropFolders', 'Do you want to copy the folders or add the folders to the workspace?')
                        : localize('dropFolder', "Do you want to copy '{0}' or add '{0}' as a folder to the workspace?", basename(folders[0].uri));
            }
            else {
                message =
                    folders.length > 1
                        ? localize('copyfolders', 'Are you sure to want to copy folders?')
                        : localize('copyfolder', "Are you sure to want to copy '{0}'?", basename(folders[0].uri));
            }
            const { result } = await this.dialogService.prompt({
                type: Severity.Info,
                message,
                buttons,
                cancelButton: true,
            });
            // Add folders
            if (result === ImportChoice.Add) {
                return this.workspaceEditingService.addFolders(folders);
            }
            // Copy resources
            if (result === ImportChoice.Copy) {
                return this.importResources(target, files, token);
            }
        }
        // Handle dropped files (only support FileStat as target)
        else if (target instanceof ExplorerItem) {
            return this.importResources(target, files, token);
        }
    }
    async importResources(target, resources, token) {
        if (resources && resources.length > 0) {
            // Resolve target to check for name collisions and ask user
            const targetStat = await this.fileService.resolve(target.resource);
            if (token.isCancellationRequested) {
                return;
            }
            // Check for name collisions
            const targetNames = new Set();
            const caseSensitive = this.fileService.hasCapability(target.resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
            if (targetStat.children) {
                targetStat.children.forEach((child) => {
                    targetNames.add(caseSensitive ? child.name : child.name.toLowerCase());
                });
            }
            let inaccessibleFileCount = 0;
            const resourcesFiltered = coalesce(await Promises.settled(resources.map(async (resource) => {
                const fileDoesNotExist = !(await this.fileService.exists(resource));
                if (fileDoesNotExist) {
                    inaccessibleFileCount++;
                    return undefined;
                }
                if (targetNames.has(caseSensitive ? basename(resource) : basename(resource).toLowerCase())) {
                    const confirmationResult = await this.dialogService.confirm(getFileOverwriteConfirm(basename(resource)));
                    if (!confirmationResult.confirmed) {
                        return undefined;
                    }
                }
                return resource;
            })));
            if (inaccessibleFileCount > 0) {
                this.notificationService.error(inaccessibleFileCount > 1
                    ? localize('filesInaccessible', 'Some or all of the dropped files could not be accessed for import.')
                    : localize('fileInaccessible', 'The dropped file could not be accessed for import.'));
            }
            // Copy resources through bulk edit API
            const resourceFileEdits = resourcesFiltered.map((resource) => {
                const sourceFileName = basename(resource);
                const targetFile = joinPath(target.resource, sourceFileName);
                return new ResourceFileEdit(resource, targetFile, { overwrite: true, copy: true });
            });
            const undoLevel = this.configurationService.getValue().explorer.confirmUndo;
            await this.explorerService.applyBulkEdit(resourceFileEdits, {
                undoLabel: resourcesFiltered.length === 1
                    ? localize({
                        comment: ['substitution will be the name of the file that was imported'],
                        key: 'importFile',
                    }, 'Import {0}', basename(resourcesFiltered[0]))
                    : localize({
                        comment: ['substitution will be the number of files that were imported'],
                        key: 'importnFile',
                    }, 'Import {0} resources', resourcesFiltered.length),
                progressLabel: resourcesFiltered.length === 1
                    ? localize({
                        comment: ['substitution will be the name of the file that was copied'],
                        key: 'copyingFile',
                    }, 'Copying {0}', basename(resourcesFiltered[0]))
                    : localize({
                        comment: ['substitution will be the number of files that were copied'],
                        key: 'copyingnFile',
                    }, 'Copying {0} resources', resourcesFiltered.length),
                progressLocation: 10 /* ProgressLocation.Window */,
                confirmBeforeUndo: undoLevel === "verbose" /* UndoConfirmLevel.Verbose */ || undoLevel === "default" /* UndoConfirmLevel.Default */,
            });
            // if we only add one file, just open it directly
            const autoOpen = this.configurationService.getValue().explorer.autoOpenDroppedFile;
            if (autoOpen && resourceFileEdits.length === 1) {
                const item = this.explorerService.findClosest(resourceFileEdits[0].newResource);
                if (item && !item.isDirectory) {
                    this.editorService.openEditor({ resource: item.resource, options: { pinned: true } });
                }
            }
        }
    }
};
ExternalFileImport = __decorate([
    __param(0, IFileService),
    __param(1, IHostService),
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IDialogService),
    __param(5, IWorkspaceEditingService),
    __param(6, IExplorerService),
    __param(7, IEditorService),
    __param(8, IProgressService),
    __param(9, INotificationService),
    __param(10, IInstantiationService)
], ExternalFileImport);
export { ExternalFileImport };
let FileDownload = class FileDownload {
    static { FileDownload_1 = this; }
    static { this.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY = 'workbench.explorer.downloadPath'; }
    constructor(fileService, explorerService, progressService, logService, fileDialogService, storageService) {
        this.fileService = fileService;
        this.explorerService = explorerService;
        this.progressService = progressService;
        this.logService = logService;
        this.fileDialogService = fileDialogService;
        this.storageService = storageService;
    }
    download(source) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const downloadPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: isWeb,
            title: localize('downloadingFiles', 'Downloading'),
        }, async (progress) => this.doDownload(source, progress, cts), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => downloadPromise);
        return downloadPromise;
    }
    async doDownload(sources, progress, cts) {
        for (const source of sources) {
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Web: use DOM APIs to download files with optional support
            // for folders and large files
            if (isWeb) {
                await this.doDownloadBrowser(source.resource, progress, cts);
            }
            // Native: use working copy file service to get at the contents
            else {
                await this.doDownloadNative(source, progress, cts);
            }
        }
    }
    async doDownloadBrowser(resource, progress, cts) {
        const stat = await this.fileService.resolve(resource, { resolveMetadata: true });
        if (cts.token.isCancellationRequested) {
            return;
        }
        const maxBlobDownloadSize = 32 * ByteSize.MB; // avoid to download via blob-trick >32MB to avoid memory pressure
        const preferFileSystemAccessWebApis = stat.isDirectory || stat.size > maxBlobDownloadSize;
        // Folder: use FS APIs to download files and folders if available and preferred
        const activeWindow = getActiveWindow();
        if (preferFileSystemAccessWebApis && WebFileSystemAccess.supported(activeWindow)) {
            try {
                const parentFolder = await activeWindow.showDirectoryPicker();
                const operation = {
                    startTime: Date.now(),
                    progressScheduler: new RunOnceWorker((steps) => {
                        progress.report(steps[steps.length - 1]);
                    }, 1000),
                    filesTotal: stat.isDirectory ? 0 : 1, // folders increment filesTotal within downloadFolder method
                    filesDownloaded: 0,
                    totalBytesDownloaded: 0,
                    fileBytesDownloaded: 0,
                };
                if (stat.isDirectory) {
                    const targetFolder = await parentFolder.getDirectoryHandle(stat.name, { create: true });
                    await this.downloadFolderBrowser(stat, targetFolder, operation, cts.token);
                }
                else {
                    await this.downloadFileBrowser(parentFolder, stat, operation, cts.token);
                }
                operation.progressScheduler.dispose();
            }
            catch (error) {
                this.logService.warn(error);
                cts.cancel(); // `showDirectoryPicker` will throw an error when the user cancels
            }
        }
        // File: use traditional download to circumvent browser limitations
        else if (stat.isFile) {
            let bufferOrUri;
            try {
                bufferOrUri = (await this.fileService.readFile(stat.resource, { limits: { size: maxBlobDownloadSize } }, cts.token)).value.buffer;
            }
            catch (error) {
                bufferOrUri = FileAccess.uriToBrowserUri(stat.resource);
            }
            if (!cts.token.isCancellationRequested) {
                triggerDownload(bufferOrUri, stat.name);
            }
        }
    }
    async downloadFileBufferedBrowser(resource, target, operation, token) {
        const contents = await this.fileService.readFileStream(resource, undefined, token);
        if (token.isCancellationRequested) {
            target.close();
            return;
        }
        return new Promise((resolve, reject) => {
            const sourceStream = contents.value;
            const disposables = new DisposableStore();
            disposables.add(toDisposable(() => target.close()));
            disposables.add(createSingleCallFunction(token.onCancellationRequested)(() => {
                disposables.dispose();
                reject(canceled());
            }));
            listenStream(sourceStream, {
                onData: (data) => {
                    target.write(data.buffer);
                    this.reportProgress(contents.name, contents.size, data.byteLength, operation);
                },
                onError: (error) => {
                    disposables.dispose();
                    reject(error);
                },
                onEnd: () => {
                    disposables.dispose();
                    resolve();
                },
            }, token);
        });
    }
    async downloadFileUnbufferedBrowser(resource, target, operation, token) {
        const contents = await this.fileService.readFile(resource, undefined, token);
        if (!token.isCancellationRequested) {
            target.write(contents.value.buffer);
            this.reportProgress(contents.name, contents.size, contents.value.byteLength, operation);
        }
        target.close();
    }
    async downloadFileBrowser(targetFolder, file, operation, token) {
        // Report progress
        operation.filesDownloaded++;
        operation.fileBytesDownloaded = 0; // reset for this file
        this.reportProgress(file.name, 0, 0, operation);
        // Start to download
        const targetFile = await targetFolder.getFileHandle(file.name, { create: true });
        const targetFileWriter = await targetFile.createWritable();
        // For large files, write buffered using streams
        if (file.size > ByteSize.MB) {
            return this.downloadFileBufferedBrowser(file.resource, targetFileWriter, operation, token);
        }
        // For small files prefer to write unbuffered to reduce overhead
        return this.downloadFileUnbufferedBrowser(file.resource, targetFileWriter, operation, token);
    }
    async downloadFolderBrowser(folder, targetFolder, operation, token) {
        if (folder.children) {
            operation.filesTotal += folder.children.map((child) => child.isFile).length;
            for (const child of folder.children) {
                if (token.isCancellationRequested) {
                    return;
                }
                if (child.isFile) {
                    await this.downloadFileBrowser(targetFolder, child, operation, token);
                }
                else {
                    const childFolder = await targetFolder.getDirectoryHandle(child.name, { create: true });
                    const resolvedChildFolder = await this.fileService.resolve(child.resource, {
                        resolveMetadata: true,
                    });
                    await this.downloadFolderBrowser(resolvedChildFolder, childFolder, operation, token);
                }
            }
        }
    }
    reportProgress(name, fileSize, bytesDownloaded, operation) {
        operation.fileBytesDownloaded += bytesDownloaded;
        operation.totalBytesDownloaded += bytesDownloaded;
        const bytesDownloadedPerSecond = operation.totalBytesDownloaded / ((Date.now() - operation.startTime) / 1000);
        // Small file
        let message;
        if (fileSize < ByteSize.MB) {
            if (operation.filesTotal === 1) {
                message = name;
            }
            else {
                message = localize('downloadProgressSmallMany', '{0} of {1} files ({2}/s)', operation.filesDownloaded, operation.filesTotal, ByteSize.formatSize(bytesDownloadedPerSecond));
            }
        }
        // Large file
        else {
            message = localize('downloadProgressLarge', '{0} ({1} of {2}, {3}/s)', name, ByteSize.formatSize(operation.fileBytesDownloaded), ByteSize.formatSize(fileSize), ByteSize.formatSize(bytesDownloadedPerSecond));
        }
        // Report progress but limit to update only once per second
        operation.progressScheduler.work({ message });
    }
    async doDownloadNative(explorerItem, progress, cts) {
        progress.report({ message: explorerItem.name });
        let defaultUri;
        const lastUsedDownloadPath = this.storageService.get(FileDownload_1.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (lastUsedDownloadPath) {
            defaultUri = joinPath(URI.file(lastUsedDownloadPath), explorerItem.name);
        }
        else {
            defaultUri = joinPath(explorerItem.isDirectory
                ? await this.fileDialogService.defaultFolderPath(Schemas.file)
                : await this.fileDialogService.defaultFilePath(Schemas.file), explorerItem.name);
        }
        const destination = await this.fileDialogService.showSaveDialog({
            availableFileSystems: [Schemas.file],
            saveLabel: localize('downloadButton', 'Download'),
            title: localize('chooseWhereToDownload', 'Choose Where to Download'),
            defaultUri,
        });
        if (destination) {
            // Remember as last used download folder
            this.storageService.store(FileDownload_1.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY, dirname(destination).fsPath, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Perform download
            await this.explorerService.applyBulkEdit([new ResourceFileEdit(explorerItem.resource, destination, { overwrite: true, copy: true })], {
                undoLabel: localize('downloadBulkEdit', 'Download {0}', explorerItem.name),
                progressLabel: localize('downloadingBulkEdit', 'Downloading {0}', explorerItem.name),
                progressLocation: 10 /* ProgressLocation.Window */,
            });
        }
        else {
            cts.cancel(); // User canceled a download. In case there were multiple files selected we should cancel the remainder of the prompts #86100
        }
    }
};
FileDownload = FileDownload_1 = __decorate([
    __param(0, IFileService),
    __param(1, IExplorerService),
    __param(2, IProgressService),
    __param(3, ILogService),
    __param(4, IFileDialogService),
    __param(5, IStorageService)
], FileDownload);
export { FileDownload };
//#endregion
//#region Helpers
export function getFileOverwriteConfirm(name) {
    return {
        message: localize('confirmOverwrite', "A file or folder with the name '{0}' already exists in the destination folder. Do you want to replace it?", name),
        detail: localize('irreversible', 'This action is irreversible!'),
        primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Replace'),
        type: 'warning',
    };
}
export function getMultipleFilesOverwriteConfirm(files) {
    if (files.length > 1) {
        return {
            message: localize('confirmManyOverwrites', 'The following {0} files and/or folders already exist in the destination folder. Do you want to replace them?', files.length),
            detail: getFileNamesMessage(files) +
                '\n' +
                localize('irreversible', 'This action is irreversible!'),
            primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Replace'),
            type: 'warning',
        };
    }
    return getFileOverwriteConfirm(basename(files[0]));
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUltcG9ydEV4cG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZmlsZUltcG9ydEV4cG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sbUJBQW1CLEVBRW5CLGNBQWMsRUFDZCxrQkFBa0IsR0FFbEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sUUFBUSxFQUVSLFlBQVksR0FFWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUVOLGdCQUFnQixHQUdoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUM3QyxPQUFPLEVBQXlDLE9BQU8sRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDekYsT0FBTyxF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