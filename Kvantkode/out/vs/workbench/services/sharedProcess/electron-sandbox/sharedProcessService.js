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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zaGFyZWRQcm9jZXNzL2VsZWN0cm9uLXNhbmRib3gvc2hhcmVkUHJvY2Vzc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3pGLE9BQU8sRUFHTixpQkFBaUIsR0FDakIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsMEJBQTBCLEdBQzFCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRTVFLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQU9uRCxZQUNVLFFBQWdCLEVBQ1osVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFIRSxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ0ssZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUpyQyxvQkFBZSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7UUFRL0MsSUFBSSxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNsRCxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU87UUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtRQUV4RCw2REFBNkQ7UUFDN0QsNERBQTREO1FBQzVELDREQUE0RDtRQUM1RCwwREFBMEQ7UUFDMUQsMkRBQTJEO1FBQzNELGlEQUFpRDtRQUVqRCxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFaEUseURBQXlEO1FBQ3pELElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUE7UUFDNUUsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQzdCLDhCQUE4QixDQUFDLE9BQU8sRUFDdEMsOEJBQThCLENBQUMsUUFBUSxDQUN2QyxDQUFBO1FBQ0QsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQTtRQUVoRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzlFLENBQUM7SUFFRCxjQUFjO1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVSxDQUFDLFdBQW1CO1FBQzdCLE9BQU8saUJBQWlCLENBQ3ZCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FDekYsQ0FBQTtJQUNGLENBQUM7SUFFRCxlQUFlLENBQUMsV0FBbUIsRUFBRSxPQUErQjtRQUNuRSxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FDcEQsVUFBVSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQ2hELENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQjtRQUN4Qiw2Q0FBNkM7UUFDN0MsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQUE7UUFFdEMsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlFQUFpRSxDQUFDLENBQUE7UUFDeEYsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQzdCLDBCQUEwQixDQUFDLE9BQU8sRUFDbEMsMEJBQTBCLENBQUMsUUFBUSxDQUNuQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMscUVBQXFFLENBQUMsQ0FBQTtRQUU1RixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRCxDQUFBO0FBekVZLG9CQUFvQjtJQVM5QixXQUFBLFdBQVcsQ0FBQTtHQVRELG9CQUFvQixDQXlFaEMifQ==