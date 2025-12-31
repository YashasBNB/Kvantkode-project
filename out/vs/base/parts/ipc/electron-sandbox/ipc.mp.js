/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../browser/window.js';
import { Event } from '../../../common/event.js';
import { generateUuid } from '../../../common/uuid.js';
import { ipcMessagePort, ipcRenderer } from '../../sandbox/electron-sandbox/globals.js';
export async function acquirePort(requestChannel, responseChannel, nonce = generateUuid()) {
    // Get ready to acquire the message port from the
    // provided `responseChannel` via preload helper.
    ipcMessagePort.acquire(responseChannel, nonce);
    // If a `requestChannel` is provided, we are in charge
    // to trigger acquisition of the message port from main
    if (typeof requestChannel === 'string') {
        ipcRenderer.send(requestChannel, nonce);
    }
    // Wait until the main side has returned the `MessagePort`
    // We need to filter by the `nonce` to ensure we listen
    // to the right response.
    const onMessageChannelResult = Event.fromDOMEventEmitter(mainWindow, 'message', (e) => ({ nonce: e.data, port: e.ports[0], source: e.source }));
    const { port } = await Event.toPromise(Event.once(Event.filter(onMessageChannelResult, (e) => e.nonce === nonce && e.source === mainWindow)));
    return port;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvZWxlY3Ryb24tc2FuZGJveC9pcGMubXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQVF2RixNQUFNLENBQUMsS0FBSyxVQUFVLFdBQVcsQ0FDaEMsY0FBa0MsRUFDbEMsZUFBdUIsRUFDdkIsS0FBSyxHQUFHLFlBQVksRUFBRTtJQUV0QixpREFBaUQ7SUFDakQsaURBQWlEO0lBQ2pELGNBQWMsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBRTlDLHNEQUFzRDtJQUN0RCx1REFBdUQ7SUFDdkQsSUFBSSxPQUFPLGNBQWMsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsMERBQTBEO0lBQzFELHVEQUF1RDtJQUN2RCx5QkFBeUI7SUFDekIsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUMsbUJBQW1CLENBQ3ZELFVBQVUsRUFDVixTQUFTLEVBQ1QsQ0FBQyxDQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQzVFLENBQUE7SUFDRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUNyQyxLQUFLLENBQUMsSUFBSSxDQUNULEtBQUssQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDLENBQ3pGLENBQ0QsQ0FBQTtJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyJ9