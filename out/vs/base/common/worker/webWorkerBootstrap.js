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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyQm9vdHN0cmFwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vd29ya2VyL3dlYldvcmtlckJvb3RzdHJhcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBR04sZUFBZSxHQUNmLE1BQU0sZ0JBQWdCLENBQUE7QUFXdkIsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFBO0FBRXZCLE1BQU0sVUFBVSxVQUFVLENBQ3pCLE9BQWlEO0lBRWpELElBQUksV0FBVyxFQUFFLENBQUM7UUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFDRCxXQUFXLEdBQUcsSUFBSSxDQUFBO0lBRWxCLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxDQUMxQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFDcEMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FDdkMsQ0FBQTtJQUVELFVBQVUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFlLEVBQUUsRUFBRTtRQUMxQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUE7SUFFRCxPQUFPLGVBQWUsQ0FBQTtBQUN2QixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLE9BQW1EO0lBQ3JGLFVBQVUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFnQixFQUFFLEVBQUU7UUFDM0MsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEIsQ0FBQztJQUNGLENBQUMsQ0FBQTtBQUNGLENBQUMifQ==