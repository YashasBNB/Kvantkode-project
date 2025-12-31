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
import { realpath, watch } from 'fs';
import { timeout } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import * as path from '../../../base/common/path.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { State, } from '../common/update.js';
let AbstractUpdateService = class AbstractUpdateService {
    get state() {
        return this._state;
    }
    setState(state) {
        this.logService.info('update#setState', state.type);
        this._state = state;
        this._onStateChange.fire(state);
    }
    constructor(lifecycleMainService, environmentMainService, logService) {
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this._state = State.Uninitialized;
        this._onStateChange = new Emitter();
        this.onStateChange = this._onStateChange.event;
        if (environmentMainService.disableUpdates) {
            this.logService.info('update#ctor - updates are disabled');
            return;
        }
        this.setState(State.Idle(this.getUpdateType()));
        // Start checking for updates after 30 seconds
        this.scheduleCheckForUpdates(30 * 1000).then(undefined, (err) => this.logService.error(err));
    }
    scheduleCheckForUpdates(delay = 60 * 60 * 1000) {
        return timeout(delay)
            .then(() => this.checkForUpdates(false))
            .then(() => {
            // Check again after 1 hour
            return this.scheduleCheckForUpdates(60 * 60 * 1000);
        });
    }
    async checkForUpdates(explicit) {
        this.logService.trace('update#checkForUpdates, state = ', this.state.type);
        if (this.state.type !== "idle" /* StateType.Idle */) {
            return;
        }
        this.doCheckForUpdates(explicit);
    }
    async downloadUpdate() {
        this.logService.trace('update#downloadUpdate, state = ', this.state.type);
        if (this.state.type !== "available for download" /* StateType.AvailableForDownload */) {
            return;
        }
        await this.doDownloadUpdate(this.state);
    }
    doDownloadUpdate(state) {
        return Promise.resolve(undefined);
    }
    async applyUpdate() {
        this.logService.trace('update#applyUpdate, state = ', this.state.type);
        if (this.state.type !== "downloaded" /* StateType.Downloaded */) {
            return;
        }
        await this.doApplyUpdate();
    }
    doApplyUpdate() {
        return Promise.resolve(undefined);
    }
    quitAndInstall() {
        this.logService.trace('update#quitAndInstall, state = ', this.state.type);
        if (this.state.type !== "ready" /* StateType.Ready */) {
            return Promise.resolve(undefined);
        }
        this.logService.trace('update#quitAndInstall(): before lifecycle quit()');
        this.lifecycleMainService.quit(true /* will restart */).then((vetod) => {
            this.logService.trace(`update#quitAndInstall(): after lifecycle quit() with veto: ${vetod}`);
            if (vetod) {
                return;
            }
            this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
            this.doQuitAndInstall();
        });
        return Promise.resolve(undefined);
    }
    getUpdateType() {
        return 2 /* UpdateType.Snap */;
    }
    doQuitAndInstall() {
        // noop
    }
    async _applySpecificUpdate(packagePath) {
        // noop
    }
};
AbstractUpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IEnvironmentMainService),
    __param(2, ILogService)
], AbstractUpdateService);
let SnapUpdateService = class SnapUpdateService extends AbstractUpdateService {
    constructor(snap, snapRevision, lifecycleMainService, environmentMainService, logService) {
        super(lifecycleMainService, environmentMainService, logService);
        this.snap = snap;
        this.snapRevision = snapRevision;
        const watcher = watch(path.dirname(this.snap));
        const onChange = Event.fromNodeEventEmitter(watcher, 'change', (_, fileName) => fileName);
        const onCurrentChange = Event.filter(onChange, (n) => n === 'current');
        const onDebouncedCurrentChange = Event.debounce(onCurrentChange, (_, e) => e, 2000);
        const listener = onDebouncedCurrentChange(() => this.checkForUpdates(false));
        lifecycleMainService.onWillShutdown(() => {
            listener.dispose();
            watcher.close();
        });
    }
    doCheckForUpdates() {
        this.setState(State.CheckingForUpdates(false));
        this.isUpdateAvailable().then((result) => {
            if (result) {
                this.setState(State.Ready({ version: 'something' }));
            }
            else {
                this.setState(State.Idle(2 /* UpdateType.Snap */));
            }
        }, (err) => {
            this.logService.error(err);
            this.setState(State.Idle(2 /* UpdateType.Snap */, err.message || err));
        });
    }
    doQuitAndInstall() {
        this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
        // Allow 3 seconds for VS Code to close
        spawn('sleep 3 && ' + path.basename(process.argv[0]), {
            shell: true,
            detached: true,
            stdio: 'ignore',
        });
    }
    async isUpdateAvailable() {
        const resolvedCurrentSnapPath = await new Promise((c, e) => realpath(`${path.dirname(this.snap)}/current`, (err, r) => (err ? e(err) : c(r))));
        const currentRevision = path.basename(resolvedCurrentSnapPath);
        return this.snapRevision !== currentRevision;
    }
    isLatestVersion() {
        return this.isUpdateAvailable().then(undefined, (err) => {
            this.logService.error('update#checkForSnapUpdate(): Could not get realpath of application.');
            return undefined;
        });
    }
};
SnapUpdateService = __decorate([
    __param(2, ILifecycleMainService),
    __param(3, IEnvironmentMainService),
    __param(4, ILogService)
], SnapUpdateService);
export { SnapUpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS5zbmFwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXBkYXRlL2VsZWN0cm9uLW1haW4vdXBkYXRlU2VydmljZS5zbmFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDckMsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDcEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUdOLEtBQUssR0FHTCxNQUFNLHFCQUFxQixDQUFBO0FBRTVCLElBQWUscUJBQXFCLEdBQXBDLE1BQWUscUJBQXFCO0lBUW5DLElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRVMsUUFBUSxDQUFDLEtBQVk7UUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2hD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