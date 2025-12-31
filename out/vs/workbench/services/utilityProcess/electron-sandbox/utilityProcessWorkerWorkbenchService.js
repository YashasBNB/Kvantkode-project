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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3NXb3JrZXJXb3JrYmVuY2hTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3V0aWxpdHlQcm9jZXNzL2VsZWN0cm9uLXNhbmRib3gvdXRpbGl0eVByb2Nlc3NXb3JrZXJXb3JrYmVuY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsTUFBTSxJQUFJLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBYSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ25GLE9BQU8sRUFFTixrQ0FBa0MsR0FHbEMsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRW5FLE1BQU0sQ0FBQyxNQUFNLHFDQUFxQyxHQUNqRCxlQUFlLENBQXdDLHNDQUFzQyxDQUFDLENBQUE7QUFxRHhGLElBQU0sb0NBQW9DLEdBQTFDLE1BQU0sb0NBQ1osU0FBUSxVQUFVO0lBTWxCLElBQVksMkJBQTJCO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLGtDQUFrQyxDQUFDLENBQUE7WUFDdEYsSUFBSSxDQUFDLDRCQUE0QjtnQkFDaEMsWUFBWSxDQUFDLFNBQVMsQ0FBK0IsT0FBTyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFBO0lBQ3pDLENBQUM7SUFJRCxZQUNVLFFBQWdCLEVBQ1osVUFBd0MsRUFDaEMsa0JBQXdEO1FBRTdFLEtBQUssRUFBRSxDQUFBO1FBSkUsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNLLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDZix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBaEJ0RSxpQ0FBNEIsR0FBNkMsU0FBUyxDQUFBO1FBV3pFLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQTtJQVFoRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFxQztRQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFBO1FBRTlELCtEQUErRDtRQUMvRCwyREFBMkQ7UUFDM0QsZ0VBQWdFO1FBQ2hFLHVEQUF1RDtRQUV2RCxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFaEUsd0VBQXdFO1FBQ3hFLE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFBO1FBQzVCLE1BQU0sZUFBZSxHQUFHLHVEQUF1RCxDQUFBO1FBQy9FLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FDOUIsU0FBUyxDQUFDLDhDQUE4QyxFQUN4RCxlQUFlLEVBQ2YsS0FBSyxDQUNMLENBQUE7UUFFRCxpREFBaUQ7UUFDakQsd0NBQXdDO1FBQ3hDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxZQUFZLENBQUM7WUFDcEUsT0FBTztZQUNQLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFO1NBQ25FLENBQUMsQ0FBQTtRQUVGLDJEQUEyRDtRQUMzRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUV4RSxJQUFJLENBQUMsMkJBQTJCLENBQUMsYUFBYSxDQUFDO2dCQUM5QyxPQUFPO2dCQUNQLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFO2FBQ2xDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQTtRQUM5QixNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM3QixJQUFJLGlCQUFpQixDQUFDLElBQUksRUFBRSxVQUFVLElBQUksQ0FBQyxRQUFRLFdBQVcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQ2pGLENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxzRUFBc0UsQ0FBQyxDQUFBO1FBRTdGLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7WUFDbEMsSUFBSSxNQUFNLEVBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIseURBQXlELE1BQU0sQ0FBQyxJQUFJLGFBQWEsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUNoRyxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQiw2REFBNkQsTUFBTSxFQUFFLElBQUksYUFBYSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQ3RHLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUE7SUFDeEUsQ0FBQztJQUVELGNBQWM7UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDNUIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBNUZZLG9DQUFvQztJQXFCOUMsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLG1CQUFtQixDQUFBO0dBdEJULG9DQUFvQyxDQTRGaEQifQ==