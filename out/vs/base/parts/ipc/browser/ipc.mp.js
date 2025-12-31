/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Client as MessagePortClient } from '../common/ipc.mp.js';
/**
 * An implementation of a `IPCClient` on top of DOM `MessagePort`.
 */
export class Client extends MessagePortClient {
    /**
     * @param clientId a way to uniquely identify this client among
     * other clients. this is important for routing because every
     * client can also be a server
     */
    constructor(port, clientId) {
        super(port, clientId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvYnJvd3Nlci9pcGMubXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRWpFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLE1BQU8sU0FBUSxpQkFBaUI7SUFDNUM7Ozs7T0FJRztJQUNILFlBQVksSUFBaUIsRUFBRSxRQUFnQjtRQUM5QyxLQUFLLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3RCLENBQUM7Q0FDRCJ9