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
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { Client as MessagePortClient } from '../../../../base/parts/ipc/common/ipc.mp.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-sandbox/ipc.mp.js';
import { ipcUtilityProcessWorkerChannelName, } from '../../../../platform/utilityProcess/common/utilityProcessWorkerService.js';
import { Barrier, timeout } from '../../../../base/common/async.js';
export const IUtilityProcessWorkerWorkbenchService = createDecorator('utilityProcessWorkerWorkbenchService');
let UtilityProcessWorkerWorkbenchService = class UtilityProcessWorkerWorkbenchService extends Disposable {
    get utilityProcessWorkerService() {
        if (!this._utilityProcessWorkerService) {
            const channel = this.mainProcessService.getChannel(ipcUtilityProcessWorkerChannelName);
            this._utilityProcessWorkerService =
                ProxyChannel.toService(channel);
        }
        return this._utilityProcessWorkerService;
    }
    constructor(windowId, logService, mainProcessService) {
        super();
        this.windowId = windowId;
        this.logService = logService;
        this.mainProcessService = mainProcessService;
        this._utilityProcessWorkerService = undefined;
        this.restoredBarrier = new Barrier();
    }
    async createWorker(process) {
        this.logService.trace('Renderer->UtilityProcess#createWorker');
        // We want to avoid heavy utility process work to happen before
        // the window has restored. As such, make sure we await the
        // `Restored` phase before making a connection attempt, but also
        // add a timeout to be safe against possible deadlocks.
        await Promise.race([this.restoredBarrier.wait(), timeout(2000)]);
        // Get ready to acquire the message port from the utility process worker
        const nonce = generateUuid();
        const responseChannel = 'vscode:createUtilityProcessWorkerMessageChannelResult';
        const portPromise = acquirePort(undefined /* we trigger the request via service call! */, responseChannel, nonce);
        // Actually talk with the utility process service
        // to create a new process from a worker
        const onDidTerminate = this.utilityProcessWorkerService.createWorker({
            process,
            reply: { windowId: this.windowId, channel: responseChannel, nonce },
        });
        // Dispose worker upon disposal via utility process service
        const disposables = new DisposableStore();
        disposables.add(toDisposable(() => {
            this.logService.trace('Renderer->UtilityProcess#disposeWorker', process);
            this.utilityProcessWorkerService.disposeWorker({
                process,
                reply: { windowId: this.windowId },
            });
        }));
        const port = await portPromise;
        const client = disposables.add(new MessagePortClient(port, `window:${this.windowId},module:${process.moduleId}`));
        this.logService.trace('Renderer->UtilityProcess#createWorkerChannel: connection established');
        onDidTerminate.then(({ reason }) => {
            if (reason?.code === 0) {
                this.logService.trace(`[UtilityProcessWorker]: terminated normally with code ${reason.code}, signal: ${reason.signal}`);
            }
            else {
                this.logService.error(`[UtilityProcessWorker]: terminated unexpectedly with code ${reason?.code}, signal: ${reason?.signal}`);
            }
        });
        return { client, onDidTerminate, dispose: () => disposables.dispose() };
    }
    notifyRestored() {
        if (!this.restoredBarrier.isOpen()) {
            this.restoredBarrier.open();
        }
    }
};
UtilityProcessWorkerWorkbenchService = __decorate([
    __param(1, ILogService),
    __param(2, IMainProcessService)
], UtilityProcessWorkerWorkbenchService);
export { UtilityProcessWorkerWorkbenchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3NXb3JrZXJXb3JrYmVuY2hTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXRpbGl0eVByb2Nlc3MvZWxlY3Ryb24tc2FuZGJveC91dGlsaXR5UHJvY2Vzc1dvcmtlcldvcmtiZW5jaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxNQUFNLElBQUksaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFhLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDbkYsT0FBTyxFQUVOLGtDQUFrQyxHQUdsQyxNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbkUsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQ2pELGVBQWUsQ0FBd0Msc0NBQXNDLENBQUMsQ0FBQTtBQXFEeEYsSUFBTSxvQ0FBb0MsR0FBMUMsTUFBTSxvQ0FDWixTQUFRLFVBQVU7SUFNbEIsSUFBWSwyQkFB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