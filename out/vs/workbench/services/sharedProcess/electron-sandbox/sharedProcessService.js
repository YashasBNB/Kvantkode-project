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
import { Client as MessagePortClient } from '../../../../base/parts/ipc/common/ipc.mp.js';
import { getDelayedChannel, } from '../../../../base/parts/ipc/common/ipc.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { SharedProcessChannelConnection, SharedProcessRawConnection, } from '../../../../platform/sharedProcess/common/sharedProcess.js';
import { mark } from '../../../../base/common/performance.js';
import { Barrier, timeout } from '../../../../base/common/async.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-sandbox/ipc.mp.js';
let SharedProcessService = class SharedProcessService extends Disposable {
    constructor(windowId, logService) {
        super();
        this.windowId = windowId;
        this.logService = logService;
        this.restoredBarrier = new Barrier();
        this.withSharedProcessConnection = this.connect();
    }
    async connect() {
        this.logService.trace('Renderer->SharedProcess#connect');
        // Our performance tests show that a connection to the shared
        // process can have significant overhead to the startup time
        // of the window because the shared process could be created
        // as a result. As such, make sure we await the `Restored`
        // phase before making a connection attempt, but also add a
        // timeout to be safe against possible deadlocks.
        await Promise.race([this.restoredBarrier.wait(), timeout(2000)]);
        // Acquire a message port connected to the shared process
        mark('code/willConnectSharedProcess');
        this.logService.trace('Renderer->SharedProcess#connect: before acquirePort');
        const port = await acquirePort(SharedProcessChannelConnection.request, SharedProcessChannelConnection.response);
        mark('code/didConnectSharedProcess');
        this.logService.trace('Renderer->SharedProcess#connect: connection established');
        return this._register(new MessagePortClient(port, `window:${this.windowId}`));
    }
    notifyRestored() {
        if (!this.restoredBarrier.isOpen()) {
            this.restoredBarrier.open();
        }
    }
    getChannel(channelName) {
        return getDelayedChannel(this.withSharedProcessConnection.then((connection) => connection.getChannel(channelName)));
    }
    registerChannel(channelName, channel) {
        this.withSharedProcessConnection.then((connection) => connection.registerChannel(channelName, channel));
    }
    async createRawConnection() {
        // Await initialization of the shared process
        await this.withSharedProcessConnection;
        // Create a new port to the shared process
        this.logService.trace('Renderer->SharedProcess#createRawConnection: before acquirePort');
        const port = await acquirePort(SharedProcessRawConnection.request, SharedProcessRawConnection.response);
        this.logService.trace('Renderer->SharedProcess#createRawConnection: connection established');
        return port;
    }
};
SharedProcessService = __decorate([
    __param(1, ILogService)
], SharedProcessService);
export { SharedProcessService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2hhcmVkUHJvY2Vzcy9lbGVjdHJvbi1zYW5kYm94L3NoYXJlZFByb2Nlc3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLElBQUksaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN6RixPQUFPLEVBR04saUJBQWlCLEdBQ2pCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLDBCQUEwQixHQUMxQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUU1RSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFPbkQsWUFDVSxRQUFnQixFQUNaLFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFBO1FBSEUsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNLLGVBQVUsR0FBVixVQUFVLENBQWE7UUFKckMsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFBO1FBUS9DLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbEQsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPO1FBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7UUFFeEQsNkRBQTZEO1FBQzdELDREQUE0RDtRQUM1RCw0REFBNEQ7UUFDNUQsMERBQTBEO1FBQzFELDJEQUEyRDtRQUMzRCxpREFBaUQ7UUFFakQsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWhFLHlEQUF5RDtRQUN6RCxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxxREFBcUQsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUM3Qiw4QkFBOEIsQ0FBQyxPQUFPLEVBQ3RDLDhCQUE4QixDQUFDLFFBQVEsQ0FDdkMsQ0FBQTtRQUNELElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUE7UUFFaEYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxFQUFFLFVBQVUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0lBRUQsY0FBYztRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM1QixDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVUsQ0FBQyxXQUFtQjtRQUM3QixPQUFPLGlCQUFpQixDQUN2QixJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQ3pGLENBQUE7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLFdBQW1CLEVBQUUsT0FBK0I7UUFDbkUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQ3BELFVBQVUsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUNoRCxDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUI7UUFDeEIsNkNBQTZDO1FBQzdDLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFBO1FBRXRDLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxpRUFBaUUsQ0FBQyxDQUFBO1FBQ3hGLE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUM3QiwwQkFBMEIsQ0FBQyxPQUFPLEVBQ2xDLDBCQUEwQixDQUFDLFFBQVEsQ0FDbkMsQ0FBQTtRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHFFQUFxRSxDQUFDLENBQUE7UUFFNUYsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBQ0QsQ0FBQTtBQXpFWSxvQkFBb0I7SUFTOUIsV0FBQSxXQUFXLENBQUE7R0FURCxvQkFBb0IsQ0F5RWhDIn0=