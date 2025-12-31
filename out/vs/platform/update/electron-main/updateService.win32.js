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
import { spawn } from 'child_process';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { timeout } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { memoize } from '../../../base/common/decorators.js';
import { hash } from '../../../base/common/hash.js';
import * as path from '../../../base/common/path.js';
import { URI } from '../../../base/common/uri.js';
import { checksum } from '../../../base/node/crypto.js';
import * as pfs from '../../../base/node/pfs.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService, } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { State, } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL, } from './abstractUpdateService.js';
async function pollUntil(fn, millis = 1000) {
    while (!fn()) {
        await timeout(millis);
    }
}
let _updateType = undefined;
function getUpdateType() {
    if (typeof _updateType === 'undefined') {
        _updateType = fs.existsSync(path.join(path.dirname(process.execPath), 'unins000.exe'))
            ? 0 /* UpdateType.Setup */
            : 1 /* UpdateType.Archive */;
    }
    return _updateType;
}
let Win32UpdateService = class Win32UpdateService extends AbstractUpdateService {
    get cachePath() {
        const result = path.join(tmpdir(), `vscode-${this.productService.quality}-${this.productService.target}-${process.arch}`);
        return fs.promises.mkdir(result, { recursive: true }).then(() => result);
    }
    constructor(lifecycleMainService, configurationService, telemetryService, environmentMainService, requestService, logService, fileService, nativeHostMainService, productService) {
        super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);
        this.telemetryService = telemetryService;
        this.fileService = fileService;
        this.nativeHostMainService = nativeHostMainService;
        lifecycleMainService.setRelaunchHandler(this);
    }
    handleRelaunch(options) {
        if (options?.addArgs || options?.removeArgs) {
            return false; // we cannot apply an update and restart with different args
        }
        if (this.state.type !== "ready" /* StateType.Ready */ || !this.availableUpdate) {
            return false; // we only handle the relaunch when we have a pending update
        }
        this.logService.trace('update#handleRelaunch(): running raw#quitAndInstall()');
        this.doQuitAndInstall();
        return true;
    }
    async initialize() {
        if (this.productService.target === 'user' &&
            (await this.nativeHostMainService.isAdmin(undefined))) {
            this.setState(State.Disabled(5 /* DisablementReason.RunningAsAdmin */));
            this.logService.info('update#ctor - updates are disabled due to running as Admin in user setup');
            return;
        }
        await super.initialize();
    }
    buildUpdateFeedUrl(quality) {
        let platform = `win32-${process.arch}`;
        if (getUpdateType() === 1 /* UpdateType.Archive */) {
            platform += '-archive';
        }
        else if (this.productService.target === 'user') {
            platform += '-user';
        }
        return createUpdateURL(platform, quality, this.productService);
    }
    doCheckForUpdates(context) {
        if (!this.url) {
            return;
        }
        this.setState(State.CheckingForUpdates(context));
        this.requestService
            .request({ url: this.url }, CancellationToken.None)
            .then(asJson)
            .then((update) => {
            const updateType = getUpdateType();
            if (!update || !update.url || !update.version || !update.productVersion) {
                this.setState(State.Idle(updateType));
                return Promise.resolve(null);
            }
            if (updateType === 1 /* UpdateType.Archive */) {
                this.setState(State.AvailableForDownload(update));
                return Promise.resolve(null);
            }
            this.setState(State.Downloading);
            return this.cleanup(update.version).then(() => {
                return this.getUpdatePackagePath(update.version)
                    .then((updatePackagePath) => {
                    return pfs.Promises.exists(updatePackagePath).then((exists) => {
                        if (exists) {
                            return Promise.resolve(updatePackagePath);
                        }
                        const downloadPath = `${updatePackagePath}.tmp`;
                        return this.requestService
                            .request({ url: update.url }, CancellationToken.None)
                            .then((context) => this.fileService.writeFile(URI.file(downloadPath), context.stream))
                            .then(update.sha256hash
                            ? () => checksum(downloadPath, update.sha256hash)
                            : () => undefined)
                            .then(() => pfs.Promises.rename(downloadPath, updatePackagePath, false /* no retry */))
                            .then(() => updatePackagePath);
                    });
                })
                    .then((packagePath) => {
                    this.availableUpdate = { packagePath };
                    this.setState(State.Downloaded(update));
                    const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
                    if (fastUpdatesEnabled) {
                        if (this.productService.target === 'user') {
                            this.doApplyUpdate();
                        }
                    }
                    else {
                        this.setState(State.Ready(update));
                    }
                });
            });
        })
            .then(undefined, (err) => {
            this.telemetryService.publicLog2('update:error', { messageHash: String(hash(String(err))) });
            this.logService.error(err);
            // only show message when explicitly checking for updates
            const message = !!context ? err.message || err : undefined;
            this.setState(State.Idle(getUpdateType(), message));
        });
    }
    async doDownloadUpdate(state) {
        if (state.update.url) {
            this.nativeHostMainService.openExternal(undefined, state.update.url);
        }
        this.setState(State.Idle(getUpdateType()));
    }
    async getUpdatePackagePath(version) {
        const cachePath = await this.cachePath;
        return path.join(cachePath, `CodeSetup-${this.productService.quality}-${version}.exe`);
    }
    async cleanup(exceptVersion = null) {
        const filter = exceptVersion
            ? (one) => !new RegExp(`${this.productService.quality}-${exceptVersion}\\.exe$`).test(one)
            : () => true;
        const cachePath = await this.cachePath;
        const versions = await pfs.Promises.readdir(cachePath);
        const promises = versions.filter(filter).map(async (one) => {
            try {
                await fs.promises.unlink(path.join(cachePath, one));
            }
            catch (err) {
                // ignore
            }
        });
        await Promise.all(promises);
    }
    async doApplyUpdate() {
        if (this.state.type !== "downloaded" /* StateType.Downloaded */) {
            return Promise.resolve(undefined);
        }
        if (!this.availableUpdate) {
            return Promise.resolve(undefined);
        }
        const update = this.state.update;
        this.setState(State.Updating(update));
        const cachePath = await this.cachePath;
        this.availableUpdate.updateFilePath = path.join(cachePath, `CodeSetup-${this.productService.quality}-${update.version}.flag`);
        await pfs.Promises.writeFile(this.availableUpdate.updateFilePath, 'flag');
        const child = spawn(this.availableUpdate.packagePath, [
            '/verysilent',
            '/log',
            `/update="${this.availableUpdate.updateFilePath}"`,
            '/nocloseapplications',
            '/mergetasks=runcode,!desktopicon,!quicklaunchicon',
        ], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore'],
            windowsVerbatimArguments: true,
        });
        child.once('exit', () => {
            this.availableUpdate = undefined;
            this.setState(State.Idle(getUpdateType()));
        });
        const readyMutexName = `${this.productService.win32MutexName}-ready`;
        const mutex = await import('@vscode/windows-mutex');
        // poll for mutex-ready
        pollUntil(() => mutex.isActive(readyMutexName)).then(() => this.setState(State.Ready(update)));
    }
    doQuitAndInstall() {
        if (this.state.type !== "ready" /* StateType.Ready */ || !this.availableUpdate) {
            return;
        }
        this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
        if (this.availableUpdate.updateFilePath) {
            fs.unlinkSync(this.availableUpdate.updateFilePath);
        }
        else {
            spawn(this.availableUpdate.packagePath, ['/silent', '/log', '/mergetasks=runcode,!desktopicon,!quicklaunchicon'], {
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore'],
            });
        }
    }
    getUpdateType() {
        return getUpdateType();
    }
    async _applySpecificUpdate(packagePath) {
        if (this.state.type !== "idle" /* StateType.Idle */) {
            return;
        }
        const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
        const update = { version: 'unknown', productVersion: 'unknown' };
        this.setState(State.Downloading);
        this.availableUpdate = { packagePath };
        this.setState(State.Downloaded(update));
        if (fastUpdatesEnabled) {
            if (this.productService.target === 'user') {
                this.doApplyUpdate();
            }
        }
        else {
            this.setState(State.Ready(update));
        }
    }
};
__decorate([
    memoize
], Win32UpdateService.prototype, "cachePath", null);
Win32UpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IConfigurationService),
    __param(2, ITelemetryService),
    __param(3, IEnvironmentMainService),
    __param(4, IRequestService),
    __param(5, ILogService),
    __param(6, IFileService),
    __param(7, INativeHostMainService),
    __param(8, IProductService)
], Win32UpdateService);
export { Win32UpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS53aW4zMi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VwZGF0ZS9lbGVjdHJvbi1tYWluL3VwZGF0ZVNlcnZpY2Uud2luMzIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNyQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEtBQUssR0FBRyxNQUFNLDJCQUEyQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQ04scUJBQXFCLEdBR3JCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFJTixLQUFLLEdBR0wsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLGVBQWUsR0FFZixNQUFNLDRCQUE0QixDQUFBO0FBRW5DLEtBQUssVUFBVSxTQUFTLENBQUMsRUFBaUIsRUFBRSxNQUFNLEdBQUcsSUFBSTtJQUN4RCxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUNkLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3RCLENBQUM7QUFDRixDQUFDO0FBT0QsSUFBSSxXQUFXLEdBQTJCLFNBQVMsQ0FBQTtBQUNuRCxTQUFTLGFBQWE7SUFDckIsSUFBSSxPQUFPLFdBQVcsS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUN4QyxXQUFXLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3JGLENBQUM7WUFDRCxDQUFDLDJCQUFtQixDQUFBO0lBQ3RCLENBQUM7SUFFRCxPQUFPLFdBQVcsQ0FBQTtBQUNuQixDQUFDO0FBRU0sSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxxQkFBcUI7SUFJNUQsSUFBSSxTQUFTO1FBQ1osTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDdkIsTUFBTSxFQUFFLEVBQ1IsVUFBVSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQ3JGLENBQUE7UUFDRCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsWUFDd0Isb0JBQTJDLEVBQzNDLG9CQUEyQyxFQUM5QixnQkFBbUMsRUFDOUMsc0JBQStDLEVBQ3ZELGNBQStCLEVBQ25DLFVBQXVCLEVBQ0wsV0FBeUIsRUFDZixxQkFBNkMsRUFDckUsY0FBK0I7UUFFaEQsS0FBSyxDQUNKLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsc0JBQXNCLEVBQ3RCLGNBQWMsRUFDZCxVQUFVLEVBQ1YsY0FBYyxDQUNkLENBQUE7UUFmbUMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUl4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNmLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFZdEYsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUEwQjtRQUN4QyxJQUFJLE9BQU8sRUFBRSxPQUFPLElBQUksT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDO1lBQzdDLE9BQU8sS0FBSyxDQUFBLENBQUMsNERBQTREO1FBQzFFLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxrQ0FBb0IsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNsRSxPQUFPLEtBQUssQ0FBQSxDQUFDLDREQUE0RDtRQUMxRSxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUV2QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFa0IsS0FBSyxDQUFDLFVBQVU7UUFDbEMsSUFDQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxNQUFNO1lBQ3JDLENBQUMsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQ3BELENBQUM7WUFDRixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLDBDQUFrQyxDQUFDLENBQUE7WUFDL0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLDBFQUEwRSxDQUMxRSxDQUFBO1lBQ0QsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRVMsa0JBQWtCLENBQUMsT0FBZTtRQUMzQyxJQUFJLFFBQVEsR0FBRyxTQUFTLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUV0QyxJQUFJLGFBQWEsRUFBRSwrQkFBdUIsRUFBRSxDQUFDO1lBQzVDLFFBQVEsSUFBSSxVQUFVLENBQUE7UUFDdkIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDbEQsUUFBUSxJQUFJLE9BQU8sQ0FBQTtRQUNwQixDQUFDO1FBRUQsT0FBTyxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVTLGlCQUFpQixDQUFDLE9BQVk7UUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNmLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUVoRCxJQUFJLENBQUMsY0FBYzthQUNqQixPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQzthQUNsRCxJQUFJLENBQWlCLE1BQU0sQ0FBQzthQUM1QixJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNoQixNQUFNLFVBQVUsR0FBRyxhQUFhLEVBQUUsQ0FBQTtZQUVsQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3pFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO2dCQUNyQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztZQUVELElBQUksVUFBVSwrQkFBdUIsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUNqRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztZQUVELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBRWhDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDN0MsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztxQkFDOUMsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtvQkFDM0IsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUM3RCxJQUFJLE1BQU0sRUFBRSxDQUFDOzRCQUNaLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO3dCQUMxQyxDQUFDO3dCQUVELE1BQU0sWUFBWSxHQUFHLEdBQUcsaUJBQWlCLE1BQU0sQ0FBQTt3QkFFL0MsT0FBTyxJQUFJLENBQUMsY0FBYzs2QkFDeEIsT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7NkJBQ3BELElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ2pCLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUNsRTs2QkFDQSxJQUFJLENBQ0osTUFBTSxDQUFDLFVBQVU7NEJBQ2hCLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUM7NEJBQ2pELENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQ2xCOzZCQUNBLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FDVixHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUMxRTs2QkFDQSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtvQkFDaEMsQ0FBQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQyxDQUFDO3FCQUNELElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO29CQUNyQixJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUE7b0JBQ3RDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO29CQUV2QyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQzVELHVDQUF1QyxDQUN2QyxDQUFBO29CQUNELElBQUksa0JBQWtCLEVBQUUsQ0FBQzt3QkFDeEIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQzs0QkFDM0MsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO3dCQUNyQixDQUFDO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtvQkFDbkMsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQTtZQUNKLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQy9CLGNBQWMsRUFDZCxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDMUMsQ0FBQTtZQUNELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRTFCLHlEQUF5RDtZQUN6RCxNQUFNLE9BQU8sR0FBdUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUM5RSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFa0IsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQTJCO1FBQ3BFLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JFLENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBZTtRQUNqRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDdEMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLE9BQU8sTUFBTSxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPLENBQUMsZ0JBQStCLElBQUk7UUFDeEQsTUFBTSxNQUFNLEdBQUcsYUFBYTtZQUMzQixDQUFDLENBQUMsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUNoQixDQUFDLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLElBQUksYUFBYSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ2pGLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUE7UUFFYixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDdEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUV0RCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDMUQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNwRCxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxTQUFTO1lBQ1YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFa0IsS0FBSyxDQUFDLGFBQWE7UUFDckMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksNENBQXlCLEVBQUUsQ0FBQztZQUM5QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQTtRQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUVyQyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUE7UUFFdEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDOUMsU0FBUyxFQUNULGFBQWEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sT0FBTyxDQUNqRSxDQUFBO1FBRUQsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN6RSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQ2xCLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUNoQztZQUNDLGFBQWE7WUFDYixNQUFNO1lBQ04sWUFBWSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsR0FBRztZQUNsRCxzQkFBc0I7WUFDdEIsbURBQW1EO1NBQ25ELEVBQ0Q7WUFDQyxRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO1lBQ3JDLHdCQUF3QixFQUFFLElBQUk7U0FDOUIsQ0FDRCxDQUFBO1FBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1lBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0MsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLGNBQWMsR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxRQUFRLENBQUE7UUFDcEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUVuRCx1QkFBdUI7UUFDdkIsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMvRixDQUFDO0lBRWtCLGdCQUFnQjtRQUNsQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxrQ0FBb0IsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNsRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUE7UUFFOUUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNuRCxDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssQ0FDSixJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFDaEMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLG1EQUFtRCxDQUFDLEVBQ3hFO2dCQUNDLFFBQVEsRUFBRSxJQUFJO2dCQUNkLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO2FBQ3JDLENBQ0QsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRWtCLGFBQWE7UUFDL0IsT0FBTyxhQUFhLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRVEsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFdBQW1CO1FBQ3RELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLGdDQUFtQixFQUFFLENBQUM7WUFDeEMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQzVELHVDQUF1QyxDQUN2QyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQVksRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsQ0FBQTtRQUV6RSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUE7UUFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFdkMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF6UkE7SUFEQyxPQUFPO21EQU9QO0FBVlcsa0JBQWtCO0lBYTVCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLGVBQWUsQ0FBQTtHQXJCTCxrQkFBa0IsQ0E2UjlCIn0=