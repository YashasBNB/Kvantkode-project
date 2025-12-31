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
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { WindowUtilityProcess } from './utilityProcess.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { hash } from '../../../base/common/hash.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
export const IUtilityProcessWorkerMainService = createDecorator('utilityProcessWorker');
let UtilityProcessWorkerMainService = class UtilityProcessWorkerMainService extends Disposable {
    constructor(logService, windowsMainService, telemetryService, lifecycleMainService) {
        super();
        this.logService = logService;
        this.windowsMainService = windowsMainService;
        this.telemetryService = telemetryService;
        this.lifecycleMainService = lifecycleMainService;
        this.workers = new Map();
    }
    async createWorker(configuration) {
        const workerLogId = `window: ${configuration.reply.windowId}, moduleId: ${configuration.process.moduleId}`;
        this.logService.trace(`[UtilityProcessWorker]: createWorker(${workerLogId})`);
        // Ensure to dispose any existing process for config
        const workerId = this.hash(configuration);
        if (this.workers.has(workerId)) {
            this.logService.warn(`[UtilityProcessWorker]: createWorker() found an existing worker that will be terminated (${workerLogId})`);
            this.disposeWorker(configuration);
        }
        // Create new worker
        const worker = new UtilityProcessWorker(this.logService, this.windowsMainService, this.telemetryService, this.lifecycleMainService, configuration);
        if (!worker.spawn()) {
            return { reason: { code: 1, signal: 'EINVALID' } };
        }
        this.workers.set(workerId, worker);
        const onDidTerminate = new DeferredPromise();
        Event.once(worker.onDidTerminate)((reason) => {
            if (reason.code === 0) {
                this.logService.trace(`[UtilityProcessWorker]: terminated normally with code ${reason.code}, signal: ${reason.signal}`);
            }
            else {
                this.logService.error(`[UtilityProcessWorker]: terminated unexpectedly with code ${reason.code}, signal: ${reason.signal}`);
            }
            this.workers.delete(workerId);
            onDidTerminate.complete({ reason });
        });
        return onDidTerminate.p;
    }
    hash(configuration) {
        return hash({
            moduleId: configuration.process.moduleId,
            windowId: configuration.reply.windowId,
        });
    }
    async disposeWorker(configuration) {
        const workerId = this.hash(configuration);
        const worker = this.workers.get(workerId);
        if (!worker) {
            return;
        }
        this.logService.trace(`[UtilityProcessWorker]: disposeWorker(window: ${configuration.reply.windowId}, moduleId: ${configuration.process.moduleId})`);
        worker.kill();
        worker.dispose();
        this.workers.delete(workerId);
    }
};
UtilityProcessWorkerMainService = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, ITelemetryService),
    __param(3, ILifecycleMainService)
], UtilityProcessWorkerMainService);
export { UtilityProcessWorkerMainService };
let UtilityProcessWorker = class UtilityProcessWorker extends Disposable {
    constructor(logService, windowsMainService, telemetryService, lifecycleMainService, configuration) {
        super();
        this.windowsMainService = windowsMainService;
        this.configuration = configuration;
        this._onDidTerminate = this._register(new Emitter());
        this.onDidTerminate = this._onDidTerminate.event;
        this.utilityProcess = this._register(new WindowUtilityProcess(logService, windowsMainService, telemetryService, lifecycleMainService));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.utilityProcess.onExit((e) => this._onDidTerminate.fire({ code: e.code, signal: e.signal })));
        this._register(this.utilityProcess.onCrash((e) => this._onDidTerminate.fire({ code: e.code, signal: 'ECRASH' })));
    }
    spawn() {
        const window = this.windowsMainService.getWindowById(this.configuration.reply.windowId);
        const windowPid = window?.win?.webContents.getOSProcessId();
        return this.utilityProcess.start({
            type: this.configuration.process.type,
            entryPoint: this.configuration.process.moduleId,
            parentLifecycleBound: windowPid,
            windowLifecycleBound: true,
            correlationId: `${this.configuration.reply.windowId}`,
            responseWindowId: this.configuration.reply.windowId,
            responseChannel: this.configuration.reply.channel,
            responseNonce: this.configuration.reply.nonce,
        });
    }
    kill() {
        this.utilityProcess.kill();
    }
};
UtilityProcessWorker = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, ITelemetryService),
    __param(3, ILifecycleMainService)
], UtilityProcessWorker);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3NXb3JrZXJNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3V0aWxpdHlQcm9jZXNzL2VsZWN0cm9uLW1haW4vdXRpbGl0eVByb2Nlc3NXb3JrZXJNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQVFyRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFN0YsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQzVDLGVBQWUsQ0FBbUMsc0JBQXNCLENBQUMsQ0FBQTtBQU1uRSxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUNaLFNBQVEsVUFBVTtJQU9sQixZQUNjLFVBQXdDLEVBQ2hDLGtCQUF3RCxFQUMxRCxnQkFBb0QsRUFDaEQsb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFBO1FBTHVCLGVBQVUsR0FB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