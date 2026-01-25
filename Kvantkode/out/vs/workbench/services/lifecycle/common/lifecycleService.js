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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xpZmVjeWNsZS9jb21tb24vbGlmZWN5Y2xlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUtOLHNCQUFzQixHQUl0QixNQUFNLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDN0QsT0FBTyxFQUNOLGVBQWUsRUFHZixtQkFBbUIsR0FDbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUVoRCxJQUFlLHdCQUF3QixHQUF2QyxNQUFlLHdCQUF5QixTQUFRLFVBQVU7O2FBQ3hDLDZCQUF3QixHQUFHLDZCQUE2QixBQUFoQyxDQUFnQztJQXNCaEYsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFHRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUdELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBTUQsWUFDYyxVQUEwQyxFQUN0QyxjQUFrRDtRQUVuRSxLQUFLLEVBQUUsQ0FBQTtRQUh5QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ25CLG1CQUFjLEdBQWQsY0FBYyxDQUFp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