/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebWorkerServer, } from './webWorker.js';
let initialized = false;
export function initialize(factory) {
    if (initialized) {
        throw new Error('WebWorker already initialized!');
    }
    initialized = true;
    const webWorkerServer = new WebWorkerServer((msg) => globalThis.postMessage(msg), (workerServer) => factory(workerServer));
    globalThis.onmessage = (e) => {
        webWorkerServer.onmessage(e.data);
    };
    return webWorkerServer;
}
export function bootstrapWebWorker(factory) {
    globalThis.onmessage = (_e) => {
        // Ignore first message in this case and initialize if not yet initialized
        if (!initialized) {
            initialize(factory);
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyQm9vdHN0cmFwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi93b3JrZXIvd2ViV29ya2VyQm9vdHN0cmFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFHTixlQUFlLEdBQ2YsTUFBTSxnQkFBZ0IsQ0FBQTtBQVd2QixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUE7QUFFdkIsTUFBTSxVQUFVLFVBQVUsQ0FDekIsT0FBaUQ7SUFFakQsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUNELFdBQVcsR0FBRyxJQUFJLENBQUE7SUFFbEIsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLENBQzFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUNwQyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUN2QyxDQUFBO0lBRUQsVUFBVSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQWUsRUFBRSxFQUFFO1FBQzFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2xDLENBQUMsQ0FBQTtJQUVELE9BQU8sZUFBZSxDQUFBO0FBQ3ZCLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsT0FBbUQ7SUFDckYsVUFBVSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQWdCLEVBQUUsRUFBRTtRQUMzQywwRUFBMEU7UUFDMUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNwQixDQUFDO0lBQ0YsQ0FBQyxDQUFBO0FBQ0YsQ0FBQyJ9