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
var AbstractLifecycleService_1;
import { Emitter } from '../../../../base/common/event.js';
import { Barrier } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { LifecyclePhaseToString, } from './lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { mark } from '../../../../base/common/performance.js';
import { IStorageService, WillSaveStateReason, } from '../../../../platform/storage/common/storage.js';
let AbstractLifecycleService = class AbstractLifecycleService extends Disposable {
    static { AbstractLifecycleService_1 = this; }
    static { this.LAST_SHUTDOWN_REASON_KEY = 'lifecyle.lastShutdownReason'; }
    get startupKind() {
        return this._startupKind;
    }
    get phase() {
        return this._phase;
    }
    get willShutdown() {
        return this._willShutdown;
    }
    constructor(logService, storageService) {
        super();
        this.logService = logService;
        this.storageService = storageService;
        this._onBeforeShutdown = this._register(new Emitter());
        this.onBeforeShutdown = this._onBeforeShutdown.event;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._onDidShutdown = this._register(new Emitter());
        this.onDidShutdown = this._onDidShutdown.event;
        this._onBeforeShutdownError = this._register(new Emitter());
        this.onBeforeShutdownError = this._onBeforeShutdownError.event;
        this._onShutdownVeto = this._register(new Emitter());
        this.onShutdownVeto = this._onShutdownVeto.event;
        this._phase = 1 /* LifecyclePhase.Starting */;
        this._willShutdown = false;
        this.phaseWhen = new Map();
        // Resolve startup kind
        this._startupKind = this.resolveStartupKind();
        // Save shutdown reason to retrieve on next startup
        this._register(this.storageService.onWillSaveState((e) => {
            if (e.reason === WillSaveStateReason.SHUTDOWN) {
                this.storageService.store(AbstractLifecycleService_1.LAST_SHUTDOWN_REASON_KEY, this.shutdownReason, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }));
    }
    resolveStartupKind() {
        const startupKind = this.doResolveStartupKind() ?? 1 /* StartupKind.NewWindow */;
        this.logService.trace(`[lifecycle] starting up (startup kind: ${startupKind})`);
        return startupKind;
    }
    doResolveStartupKind() {
        // Retrieve and reset last shutdown reason
        const lastShutdownReason = this.storageService.getNumber(AbstractLifecycleService_1.LAST_SHUTDOWN_REASON_KEY, 1 /* StorageScope.WORKSPACE */);
        this.storageService.remove(AbstractLifecycleService_1.LAST_SHUTDOWN_REASON_KEY, 1 /* StorageScope.WORKSPACE */);
        // Convert into startup kind
        let startupKind = undefined;
        switch (lastShutdownReason) {
            case 3 /* ShutdownReason.RELOAD */:
                startupKind = 3 /* StartupKind.ReloadedWindow */;
                break;
            case 4 /* ShutdownReason.LOAD */:
                startupKind = 4 /* StartupKind.ReopenedWindow */;
                break;
        }
        return startupKind;
    }
    set phase(value) {
        if (value < this.phase) {
            throw new Error('Lifecycle cannot go backwards');
        }
        if (this._phase === value) {
            return;
        }
        this.logService.trace(`lifecycle: phase changed (value: ${value})`);
        this._phase = value;
        mark(`code/LifecyclePhase/${LifecyclePhaseToString(value)}`);
        const barrier = this.phaseWhen.get(this._phase);
        if (barrier) {
            barrier.open();
            this.phaseWhen.delete(this._phase);
        }
    }
    async when(phase) {
        if (phase <= this._phase) {
            return;
        }
        let barrier = this.phaseWhen.get(phase);
        if (!barrier) {
            barrier = new Barrier();
            this.phaseWhen.set(phase, barrier);
        }
        await barrier.wait();
    }
};
AbstractLifecycleService = AbstractLifecycleService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IStorageService)
], AbstractLifecycleService);
export { AbstractLifecycleService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9saWZlY3ljbGUvY29tbW9uL2xpZmVjeWNsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFLTixzQkFBc0IsR0FJdEIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdELE9BQU8sRUFDTixlQUFlLEVBR2YsbUJBQW1CLEdBQ25CLE1BQU0sZ0RBQWdELENBQUE7QUFFaEQsSUFBZSx3QkFBd0IsR0FBdkMsTUFBZSx3QkFBeUIsU0FBUSxVQUFVOzthQUN4Qyw2QkFBd0IsR0FBRyw2QkFBNkIsQUFBaEMsQ0FBZ0M7SUFzQmhGLElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBR0QsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFHRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQU1ELFlBQ2MsVUFBMEMsRUFDdEMsY0FBa0Q7UUFFbkUsS0FBSyxFQUFFLENBQUE7UUFIeUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNuQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUF0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