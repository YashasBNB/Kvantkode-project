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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2ZpbGVzL2VsZWN0cm9uLXNhbmRib3gvZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBbUI3RCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUs1RyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDhCQUE4QixHQUM5QixNQUFNLG1FQUFtRSxDQUFBO0FBSzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUUxRTs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLHNCQUNaLFNBQVEsOEJBQThCO0lBV3RDLFlBQ0Msa0JBQXVDLEVBQ3RCLG9DQUEyRSxFQUM1RixVQUF1QixFQUNOLGFBQTZCO1FBRTlDLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDakIsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxvREFBb0QsRUFBRTtTQUN0RixDQUFDLENBQUE7UUFOZSx5Q0FBb0MsR0FBcEMsb0NBQW9DLENBQXVDO1FBRTNFLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQXVJdkMsdUJBQWtCLEdBQTRCLFNBQVMsQ0FBQTtRQWpJOUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3QixJQUFJLDRCQUE0QixDQUMvQixrQkFBa0IsQ0FBQyxVQUFVLENBQUMsOEJBQThCLENBQUMs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