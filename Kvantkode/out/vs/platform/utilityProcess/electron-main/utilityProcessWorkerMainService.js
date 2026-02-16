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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3NXb3JrZXJNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXRpbGl0eVByb2Nlc3MvZWxlY3Ryb24tbWFpbi91dGlsaXR5UHJvY2Vzc1dvcmtlck1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBUXJELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUU3RixNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FDNUMsZUFBZSxDQUFtQyxzQkFBc0IsQ0FBQyxDQUFBO0FBTW5FLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQ1osU0FBUSxVQUFVO0lBT2xCLFlBQ2MsVUFBd0MsRUFDaEMsa0JBQXdELEVBQzFELGdCQUFvRCxFQUNoRCxvQkFBNEQ7UUFFbkYsS0FBSyxF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