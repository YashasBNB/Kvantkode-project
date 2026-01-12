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
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { Barrier, DeferredPromise } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { ILoggerMainService } from '../../log/electron-main/loggerService.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
import { NullTelemetryService } from '../../telemetry/common/telemetryUtils.js';
import { parseSharedProcessDebugPort } from '../../environment/node/environmentService.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { SharedProcessChannelConnection, SharedProcessRawConnection, SharedProcessLifecycle, } from '../common/sharedProcess.js';
import { Emitter } from '../../../base/common/event.js';
let SharedProcess = class SharedProcess extends Disposable {
    constructor(machineId, sqmId, devDeviceId, environmentMainService, userDataProfilesService, lifecycleMainService, logService, loggerMainService, policyService) {
        super();
        this.machineId = machineId;
        this.sqmId = sqmId;
        this.devDeviceId = devDeviceId;
        this.environmentMainService = environmentMainService;
        this.userDataProfilesService = userDataProfilesService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.loggerMainService = loggerMainService;
        this.policyService = policyService;
        this.firstWindowConnectionBarrier = new Barrier();
        this.utilityProcess = undefined;
        this.utilityProcessLogListener = undefined;
        this._onDidCrash = this._register(new Emitter());
        this.onDidCrash = this._onDidCrash.event;
        this._whenReady = undefined;
        this._whenIpcReady = undefined;
        this.registerListeners();
    }
    registerListeners() {
        // Shared process channel connections from workbench windows
        validatedIpcMain.on(SharedProcessChannelConnection.request, (e, nonce) => this.onWindowConnection(e, nonce, SharedProcessChannelConnection.response));
        // Shared process raw connections from workbench windows
        validatedIpcMain.on(SharedProcessRawConnection.request, (e, nonce) => this.onWindowConnection(e, nonce, SharedProcessRawConnection.response));
        // Lifecycle
        this._register(this.lifecycleMainService.onWillShutdown(() => this.onWillShutdown()));
    }
    async onWindowConnection(e, nonce, responseChannel) {
        this.logService.trace(`[SharedProcess] onWindowConnection for: ${responseChannel}`);
        // release barrier if this is the first window connection
        if (!this.firstWindowConnectionBarrier.isOpen()) {
            this.firstWindowConnectionBarrier.open();
        }
        // await the shared process to be overall ready
        // we do not just wait for IPC ready because the
        // workbench window will communicate directly
        await this.whenReady();
        // connect to the shared process passing the responseChannel
        // as payload to give a hint what the connection is about
        const port = await this.connect(responseChannel);
        // Check back if the requesting window meanwhile closed
        // Since shared process is delayed on startup there is
        // a chance that the window close before the shared process
        // was ready for a connection.
        if (e.sender.isDestroyed()) {
            return port.close();
        }
        // send the port back to the requesting window
        e.sender.postMessage(responseChannel, nonce, [port]);
    }
    onWillShutdown() {
        this.logService.trace('[SharedProcess] onWillShutdown');
        this.utilityProcess?.postMessage(SharedProcessLifecycle.exit);
        this.utilityProcess = undefined;
    }
    whenReady() {
        if (!this._whenReady) {
            this._whenReady = (async () => {
                // Wait for shared process being ready to accept connection
                await this.whenIpcReady;
                // Overall signal that the shared process was loaded and
                // all services within have been created.
                const whenReady = new DeferredPromise();
                this.utilityProcess?.once(SharedProcessLifecycle.initDone, () => whenReady.complete());
                await whenReady.p;
                this.utilityProcessLogListener?.dispose();
                this.logService.trace('[SharedProcess] Overall ready');
            })();
        }
        return this._whenReady;
    }
    get whenIpcReady() {
        if (!this._whenIpcReady) {
            this._whenIpcReady = (async () => {
                // Always wait for first window asking for connection
                await this.firstWindowConnectionBarrier.wait();
                // Spawn shared process
                this.createUtilityProcess();
                // Wait for shared process indicating that IPC connections are accepted
                const sharedProcessIpcReady = new DeferredPromise();
                this.utilityProcess?.once(SharedProcessLifecycle.ipcReady, () => sharedProcessIpcReady.complete());
                await sharedProcessIpcReady.p;
                this.logService.trace('[SharedProcess] IPC ready');
            })();
        }
        return this._whenIpcReady;
    }
    createUtilityProcess() {
        this.utilityProcess = this._register(new UtilityProcess(this.logService, NullTelemetryService, this.lifecycleMainService));
        // Install a log listener for very early shared process warnings and errors
        this.utilityProcessLogListener = this.utilityProcess.onMessage((e) => {
            if (typeof e.warning === 'string') {
                this.logService.warn(e.warning);
            }
            else if (typeof e.error === 'string') {
                this.logService.error(e.error);
            }
        });
        const inspectParams = parseSharedProcessDebugPort(this.environmentMainService.args, this.environmentMainService.isBuilt);
        let execArgv = undefined;
        if (inspectParams.port) {
            execArgv = ['--nolazy'];
            if (inspectParams.break) {
                execArgv.push(`--inspect-brk=${inspectParams.port}`);
            }
            else {
                execArgv.push(`--inspect=${inspectParams.port}`);
            }
        }
        this.utilityProcess.start({
            type: 'shared-process',
            entryPoint: 'vs/code/electron-utility/sharedProcess/sharedProcessMain',
            payload: this.createSharedProcessConfiguration(),
            respondToAuthRequestsFromMainProcess: true,
            execArgv,
        });
        this._register(this.utilityProcess.onCrash(() => this._onDidCrash.fire()));
    }
    createSharedProcessConfiguration() {
        return {
            machineId: this.machineId,
            sqmId: this.sqmId,
            devDeviceId: this.devDeviceId,
            codeCachePath: this.environmentMainService.codeCachePath,
            profiles: {
                home: this.userDataProfilesService.profilesHome,
                all: this.userDataProfilesService.profiles,
            },
            args: this.environmentMainService.args,
            logLevel: this.loggerMainService.getLogLevel(),
            loggers: this.loggerMainService.getGlobalLoggers(),
            policiesData: this.policyService.serialize(),
        };
    }
    async connect(payload) {
        // Wait for shared process being ready to accept connection
        await this.whenIpcReady;
        // Connect and return message port
        const utilityProcess = assertIsDefined(this.utilityProcess);
        return utilityProcess.connect(payload);
    }
};
SharedProcess = __decorate([
    __param(3, IEnvironmentMainService),
    __param(4, IUserDataProfilesService),
    __param(5, ILifecycleMainService),
    __param(6, ILogService),
    __param(7, ILoggerMainService),
    __param(8, IPolicyService)
], SharedProcess);
export { SharedProcess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc2hhcmVkUHJvY2Vzcy9lbGVjdHJvbi1tYWluL3NoYXJlZFByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXJELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsMEJBQTBCLEVBQzFCLHNCQUFzQixHQUN0QixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxPQUFPLEVB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