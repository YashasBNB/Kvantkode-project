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
var ExtensionHostStarter_1;
import { Promises } from '../../../base/common/async.js';
import { canceled } from '../../../base/common/errors.js';
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { WindowUtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
let ExtensionHostStarter = class ExtensionHostStarter extends Disposable {
    static { ExtensionHostStarter_1 = this; }
    static { this._lastId = 0; }
    constructor(_logService, _lifecycleMainService, _windowsMainService, _telemetryService) {
        super();
        this._logService = _logService;
        this._lifecycleMainService = _lifecycleMainService;
        this._windowsMainService = _windowsMainService;
        this._telemetryService = _telemetryService;
        this._extHosts = new Map();
        this._shutdown = false;
        // On shutdown: gracefully await extension host shutdowns
        this._register(this._lifecycleMainService.onWillShutdown((e) => {
            this._shutdown = true;
            e.join('extHostStarter', this._waitForAllExit(6000));
        }));
    }
    dispose() {
        // Intentionally not killing the extension host processes
        super.dispose();
    }
    _getExtHost(id) {
        const extHostProcess = this._extHosts.get(id);
        if (!extHostProcess) {
            throw new Error(`Unknown extension host!`);
        }
        return extHostProcess;
    }
    onDynamicStdout(id) {
        return this._getExtHost(id).onStdout;
    }
    onDynamicStderr(id) {
        return this._getExtHost(id).onStderr;
    }
    onDynamicMessage(id) {
        return this._getExtHost(id).onMessage;
    }
    onDynamicExit(id) {
        return this._getExtHost(id).onExit;
    }
    async createExtensionHost() {
        if (this._shutdown) {
            throw canceled();
        }
        const id = String(++ExtensionHostStarter_1._lastId);
        const extHost = new WindowUtilityProcess(this._logService, this._windowsMainService, this._telemetryService, this._lifecycleMainService);
        this._extHosts.set(id, extHost);
        const disposable = extHost.onExit(({ pid, code, signal }) => {
            disposable.dispose();
            this._logService.info(`Extension host with pid ${pid} exited with code: ${code}, signal: ${signal}.`);
            setTimeout(() => {
                extHost.dispose();
                this._extHosts.delete(id);
            });
            // See https://github.com/microsoft/vscode/issues/194477
            // We have observed that sometimes the process sends an exit
            // event, but does not really exit and is stuck in an endless
            // loop. In these cases we kill the process forcefully after
            // a certain timeout.
            setTimeout(() => {
                try {
                    process.kill(pid, 0); // will throw if the process doesn't exist anymore.
                    this._logService.error(`Extension host with pid ${pid} still exists, forcefully killing it...`);
                    process.kill(pid);
                }
                catch (er) {
                    // ignore, as the process is already gone
                }
            }, 1000);
        });
        return { id };
    }
    async start(id, opts) {
        if (this._shutdown) {
            throw canceled();
        }
        const extHost = this._getExtHost(id);
        extHost.start({
            ...opts,
            type: 'extensionHost',
            entryPoint: 'vs/workbench/api/node/extensionHostProcess',
            args: ['--skipWorkspaceStorageLock'],
            execArgv: opts.execArgv,
            allowLoadingUnsignedLibraries: true,
            respondToAuthRequestsFromMainProcess: true,
            correlationId: id,
        });
        const pid = await Event.toPromise(extHost.onSpawn);
        return { pid };
    }
    async enableInspectPort(id) {
        if (this._shutdown) {
            throw canceled();
        }
        const extHostProcess = this._extHosts.get(id);
        if (!extHostProcess) {
            return false;
        }
        return extHostProcess.enableInspectPort();
    }
    async kill(id) {
        if (this._shutdown) {
            throw canceled();
        }
        const extHostProcess = this._extHosts.get(id);
        if (!extHostProcess) {
            // already gone!
            return;
        }
        extHostProcess.kill();
    }
    async _killAllNow() {
        for (const [, extHost] of this._extHosts) {
            extHost.kill();
        }
    }
    async _waitForAllExit(maxWaitTimeMs) {
        const exitPromises = [];
        for (const [, extHost] of this._extHosts) {
            exitPromises.push(extHost.waitForExit(maxWaitTimeMs));
        }
        return Promises.settled(exitPromises).then(() => { });
    }
};
ExtensionHostStarter = ExtensionHostStarter_1 = __decorate([
    __param(0, ILogService),
    __param(1, ILifecycleMainService),
    __param(2, IWindowsMainService),
    __param(3, ITelemetryService)
], ExtensionHostStarter);
export { ExtensionHostStarter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFN0YXJ0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbnMvZWxlY3Ryb24tbWFpbi9leHRlbnNpb25Ib3N0U3RhcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBSzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVyRSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7O2FBR3BDLFlBQU8sR0FBVyxDQUFDLEFBQVosQ0FBWTtJQUtsQyxZQUNjLFdBQXlDLEVBQy9CLHFCQUE2RCxFQUMvRCxtQkFBeUQsRUFDM0QsaUJBQXFEO1FBRXhFLEtBQUssRUFBRSxDQUFBO1FBTHVCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ2QsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM5Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQzFDLHNCQUFpQixHQUFqQixpQkFBaUIs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