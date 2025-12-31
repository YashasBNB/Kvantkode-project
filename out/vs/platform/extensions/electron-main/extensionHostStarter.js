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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFN0YXJ0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25zL2VsZWN0cm9uLW1haW4vZXh0ZW5zaW9uSG9zdFN0YXJ0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUszRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDM0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFckUsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVOzthQUdwQyxZQUFPLEdBQVcsQ0FBQyxBQUFaLENBQVk7SUFLbEMsWUFDYyxXQUF5QyxFQUMvQixxQkFBNkQsRUFDL0QsbUJBQXlELEVBQzNELGlCQUFxRDtRQUV4RSxLQUFLLEVBQUUsQ0FBQTtRQUx1QixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNkLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDOUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUMxQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1C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