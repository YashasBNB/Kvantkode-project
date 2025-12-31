/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
import { Client as IPCElectronClient } from '../../../base/parts/ipc/electron-sandbox/ipc.electron.js';
/**
 * An implementation of `IMainProcessService` that leverages Electron's IPC.
 */
export class ElectronIPCMainProcessService extends Disposable {
    constructor(windowId) {
        super();
        this.mainProcessConnection = this._register(new IPCElectronClient(`window:${windowId}`));
    }
    getChannel(channelName) {
        return this.mainProcessConnection.getChannel(channelName);
    }
    registerChannel(channelName, channel) {
        this.mainProcessConnection.registerChannel(channelName, channel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblByb2Nlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaXBjL2VsZWN0cm9uLXNhbmRib3gvbWFpblByb2Nlc3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsTUFBTSxJQUFJLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFHdEc7O0dBRUc7QUFDSCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsVUFBVTtJQUs1RCxZQUFZLFFBQWdCO1FBQzNCLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBRUQsVUFBVSxDQUFDLFdBQW1CO1FBQzdCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsZUFBZSxDQUFDLFdBQW1CLEVBQUUsT0FBK0I7UUFDbkUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDakUsQ0FBQztDQUNEIn0=