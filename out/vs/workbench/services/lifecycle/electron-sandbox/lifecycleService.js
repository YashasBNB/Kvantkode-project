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
var NativeLifecycleService_1;
import { handleVetos } from '../../../../platform/lifecycle/common/lifecycle.js';
import { ILifecycleService, WillShutdownJoinerOrder, } from '../common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractLifecycleService } from '../common/lifecycleService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Promises, disposableTimeout, raceCancellation } from '../../../../base/common/async.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
let NativeLifecycleService = class NativeLifecycleService extends AbstractLifecycleService {
    static { NativeLifecycleService_1 = this; }
    static { this.BEFORE_SHUTDOWN_WARNING_DELAY = 5000; }
    static { this.WILL_SHUTDOWN_WARNING_DELAY = 800; }
    constructor(nativeHostService, storageService, logService) {
        super(logService, storageService);
        this.nativeHostService = nativeHostService;
        this.registerListeners();
    }
    registerListeners() {
        const windowId = this.nativeHostService.windowId;
        // Main side indicates that window is about to unload, check for vetos
        ipcRenderer.on('vscode:onBeforeUnload', async (event, reply) => {
            this.logService.trace(`[lifecycle] onBeforeUnload (reason: ${reply.reason})`);
            // trigger onBeforeShutdown events and veto collecting
            const veto = await this.handleBeforeShutdown(reply.reason);
            // veto: cancel unload
            if (veto) {
                this.logService.trace('[lifecycle] onBeforeUnload prevented via veto');
                // Indicate as event
                this._onShutdownVeto.fire();
                ipcRenderer.send(reply.cancelChannel, windowId);
            }
            // no veto: allow unload
            else {
                this.logService.trace('[lifecycle] onBeforeUnload continues without veto');
                this.shutdownReason = reply.reason;
                ipcRenderer.send(reply.okChannel, windowId);
            }
        });
        // Main side indicates that we will indeed shutdown
        ipcRenderer.on('vscode:onWillUnload', async (event, reply) => {
            this.logService.trace(`[lifecycle] onWillUnload (reason: ${reply.reason})`);
            // trigger onWillShutdown events and joining
            await this.handleWillShutdown(reply.reason);
            // trigger onDidShutdown event now that we know we will quit
            this._onDidShutdown.fire();
            // acknowledge to main side
            ipcRenderer.send(reply.replyChannel, windowId);
        });
    }
    async handleBeforeShutdown(reason) {
        const logService = this.logService;
        const vetos = [];
        const pendingVetos = new Set();
        let finalVeto = undefined;
        let finalVetoId = undefined;
        // before-shutdown event with veto support
        this._onBeforeShutdown.fire({
            reason,
            veto(value, id) {
                vetos.push(value);
                // Log any veto instantly
                if (value === true) {
                    logService.info(`[lifecycle]: Shutdown was prevented (id: ${id})`);
                }
                // Track promise completion
                else if (value instanceof Promise) {
                    pendingVetos.add(id);
                    value
                        .then((veto) => {
                        if (veto === true) {
                            logService.info(`[lifecycle]: Shutdown was prevented (id: ${id})`);
                        }
                    })
                        .finally(() => pendingVetos.delete(id));
                }
            },
            finalVeto(value, id) {
                if (!finalVeto) {
                    finalVeto = value;
                    finalVetoId = id;
                }
                else {
                    throw new Error(`[lifecycle]: Final veto is already defined (id: ${id})`);
                }
            },
        });
        const longRunningBeforeShutdownWarning = disposableTimeout(() => {
            logService.warn(`[lifecycle] onBeforeShutdown is taking a long time, pending operations: ${Array.from(pendingVetos).join(', ')}`);
        }, NativeLifecycleService_1.BEFORE_SHUTDOWN_WARNING_DELAY);
        try {
            // First: run list of vetos in parallel
            let veto = await handleVetos(vetos, (error) => this.handleBeforeShutdownError(error, reason));
            if (veto) {
                return veto;
            }
            // Second: run the final veto if defined
            if (finalVeto) {
                try {
                    pendingVetos.add(finalVetoId);
                    veto = await finalVeto();
                    if (veto) {
                        logService.info(`[lifecycle]: Shutdown was prevented by final veto (id: ${finalVetoId})`);
                    }
                }
                catch (error) {
                    veto = true; // treat error as veto
                    this.handleBeforeShutdownError(error, reason);
                }
            }
            return veto;
        }
        finally {
            longRunningBeforeShutdownWarning.dispose();
        }
    }
    handleBeforeShutdownError(error, reason) {
        this.logService.error(`[lifecycle]: Error during before-shutdown phase (error: ${toErrorMessage(error)})`);
        this._onBeforeShutdownError.fire({ reason, error });
    }
    async handleWillShutdown(reason) {
        this._willShutdown = true;
        const joiners = [];
        const lastJoiners = [];
        const pendingJoiners = new Set();
        const cts = new CancellationTokenSource();
        this._onWillShutdown.fire({
            reason,
            token: cts.token,
            joiners: () => Array.from(pendingJoiners.values()),
            join(promiseOrPromiseFn, joiner) {
                pendingJoiners.add(joiner);
                if (joiner.order === WillShutdownJoinerOrder.Last) {
                    const promiseFn = typeof promiseOrPromiseFn === 'function' ? promiseOrPromiseFn : () => promiseOrPromiseFn;
                    lastJoiners.push(() => promiseFn().finally(() => pendingJoiners.delete(joiner)));
                }
                else {
                    const promise = typeof promiseOrPromiseFn === 'function' ? promiseOrPromiseFn() : promiseOrPromiseFn;
                    promise.finally(() => pendingJoiners.delete(joiner));
                    joiners.push(promise);
                }
            },
            force: () => {
                cts.dispose(true);
            },
        });
        const longRunningWillShutdownWarning = disposableTimeout(() => {
            this.logService.warn(`[lifecycle] onWillShutdown is taking a long time, pending operations: ${Array.from(pendingJoiners)
                .map((joiner) => joiner.id)
                .join(', ')}`);
        }, NativeLifecycleService_1.WILL_SHUTDOWN_WARNING_DELAY);
        try {
            await raceCancellation(Promises.settled(joiners), cts.token);
        }
        catch (error) {
            this.logService.error(`[lifecycle]: Error during will-shutdown phase in default joiners (error: ${toErrorMessage(error)})`);
        }
        try {
            await raceCancellation(Promises.settled(lastJoiners.map((lastJoiner) => lastJoiner())), cts.token);
        }
        catch (error) {
            this.logService.error(`[lifecycle]: Error during will-shutdown phase in last joiners (error: ${toErrorMessage(error)})`);
        }
        longRunningWillShutdownWarning.dispose();
    }
    shutdown() {
        return this.nativeHostService.closeWindow();
    }
};
NativeLifecycleService = NativeLifecycleService_1 = __decorate([
    __param(0, INativeHostService),
    __param(1, IStorageService),
    __param(2, ILogService)
], NativeLifecycleService);
export { NativeLifecycleService };
registerSingleton(ILifecycleService, NativeLifecycleService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9saWZlY3ljbGUvZWxlY3Ryb24tc2FuZGJveC9saWZlY3ljbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDaEYsT0FBTyxFQUVOLGlCQUFpQixFQUVqQix1QkFBdUIsR0FDdkIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUxRSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLHdCQUF3Qjs7YUFDM0Msa0NBQTZCLEdBQUcsSUFBSSxBQUFQLENBQU87YUFDcEMsZ0NBQTJCLEdBQUcsR0FBRyxBQUFOLENBQU07SUFFekQsWUFDc0MsaUJBQXFDLEVBQ3pELGNBQStC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