/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { isLinux } from '../../../../base/common/platform.js';
import { AbstractDiskFileSystemProvider } from '../../../../platform/files/common/diskFileSystemProvider.js';
import { DiskFileSystemProviderClient, LOCAL_FILE_SYSTEM_CHANNEL_NAME, } from '../../../../platform/files/common/diskFileSystemProviderClient.js';
import { UniversalWatcherClient } from './watcherClient.js';
import { LogService } from '../../../../platform/log/common/logService.js';
/**
 * A sandbox ready disk file system provider that delegates almost all calls
 * to the main process via `DiskFileSystemProviderServer` except for recursive
 * file watching that is done via shared process workers due to CPU intensity.
 */
export class DiskFileSystemProvider extends AbstractDiskFileSystemProvider {
    constructor(mainProcessService, utilityProcessWorkerWorkbenchService, logService, loggerService) {
        super(logService, {
            watcher: { forceUniversal: true /* send all requests to universal watcher process */ },
        });
        this.utilityProcessWorkerWorkbenchService = utilityProcessWorkerWorkbenchService;
        this.loggerService = loggerService;
        this._watcherLogService = undefined;
        this.provider = this._register(new DiskFileSystemProviderClient(mainProcessService.getChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME), { pathCaseSensitive: isLinux, trash: true }));
        this.registerListeners();
    }
    registerListeners() {
        // Forward events from the embedded provider
        this._register(this.provider.onDidChangeFile((changes) => this._onDidChangeFile.fire(changes)));
        this._register(this.provider.onDidWatchError((error) => this._onDidWatchError.fire(error)));
    }
    //#region File Capabilities
    get onDidChangeCapabilities() {
        return this.provider.onDidChangeCapabilities;
    }
    get capabilities() {
        return this.provider.capabilities;
    }
    //#endregion
    //#region File Metadata Resolving
    stat(resource) {
        return this.provider.stat(resource);
    }
    readdir(resource) {
        return this.provider.readdir(resource);
    }
    //#endregion
    //#region File Reading/Writing
    readFile(resource, opts) {
        return this.provider.readFile(resource, opts);
    }
    readFileStream(resource, opts, token) {
        return this.provider.readFileStream(resource, opts, token);
    }
    writeFile(resource, content, opts) {
        return this.provider.writeFile(resource, content, opts);
    }
    open(resource, opts) {
        return this.provider.open(resource, opts);
    }
    close(fd) {
        return this.provider.close(fd);
    }
    read(fd, pos, data, offset, length) {
        return this.provider.read(fd, pos, data, offset, length);
    }
    write(fd, pos, data, offset, length) {
        return this.provider.write(fd, pos, data, offset, length);
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    mkdir(resource) {
        return this.provider.mkdir(resource);
    }
    delete(resource, opts) {
        return this.provider.delete(resource, opts);
    }
    rename(from, to, opts) {
        return this.provider.rename(from, to, opts);
    }
    copy(from, to, opts) {
        return this.provider.copy(from, to, opts);
    }
    //#endregion
    //#region Clone File
    cloneFile(from, to) {
        return this.provider.cloneFile(from, to);
    }
    //#endregion
    //#region File Watching
    createUniversalWatcher(onChange, onLogMessage, verboseLogging) {
        return new UniversalWatcherClient((changes) => onChange(changes), (msg) => onLogMessage(msg), verboseLogging, this.utilityProcessWorkerWorkbenchService);
    }
    createNonRecursiveWatcher() {
        throw new Error('Method not implemented in sandbox.'); // we never expect this to be called given we set `forceUniversal: true`
    }
    get watcherLogService() {
        if (!this._watcherLogService) {
            this._watcherLogService = new LogService(this.loggerService.createLogger('fileWatcher', {
                name: localize('fileWatcher', 'File Watcher'),
            }));
        }
        return this._watcherLogService;
    }
    logWatcherMessage(msg) {
        this.watcherLogService[msg.type](msg.message);
        if (msg.type !== 'trace' && msg.type !== 'debug') {
            super.logWatcherMessage(msg); // allow non-verbose log messages in window log
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9maWxlcy9lbGVjdHJvbi1zYW5kYm94L2Rpc2tGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQW1CN0QsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFLNUcsT0FBTyxFQUNOLDRCQUE0QixFQUM1Qiw4QkFBOEIsR0FDOUIsTUFBTSxtRUFBbUUsQ0FBQTtBQUsxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUczRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFMUU7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxzQkFDWixTQUFRLDhCQUE4QjtJQVd0QyxZQUNDLGtCQUF1QyxFQUN0QixvQ0FBMkUsRUFDNUYsVUFBdUIsRUFDTixhQUE2QjtRQUU5QyxLQUFLLENBQUMsVUFBVSxFQUFFO1lBQ2pCLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsb0RBQW9ELEVBQUU7U0FDdEYsQ0FBQyxDQUFBO1FBTmUseUNBQW9DLEdBQXBDLG9DQUFvQyxDQUF1QztRQUUzRSxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUF1SXZDLHVCQUFrQixHQUE0QixTQUFTLENBQUE7UUFqSTlELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDN0IsSUFBSSw0QkFBNEIsQ0FDL0Isa0JBQWtCLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDLEVBQzdE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