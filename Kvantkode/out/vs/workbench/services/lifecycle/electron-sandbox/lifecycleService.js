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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xpZmVjeWNsZS9lbGVjdHJvbi1zYW5kYm94L2xpZmVjeWNsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNoRixPQUFPLEVBRU4saUJBQWlCLEVBRWpCLHVCQUF1QixHQUN2QixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTFFLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsd0JBQXdCOzthQUMzQyxrQ0FBNkIsR0FBRyxJQUFJLEFBQVAsQ0FBTzthQUNwQyxnQ0FBMkIsR0FBRyxHQUFHLEFBQU4sQ0FBTTtJQUV6RCxZ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