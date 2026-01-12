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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS53aW4zMi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXBkYXRlL2VsZWN0cm9uLW1haW4vdXBkYXRlU2VydmljZS53aW4zMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3JDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZELE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFDTixxQkFBcUIsR0FHckIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENB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