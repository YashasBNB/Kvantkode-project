/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { initialize } from '../base/common/worker/webWorkerBootstrap.js';
import { EditorWorker } from './common/services/editorWebWorker.js';
import { EditorWorkerHost } from './common/services/editorWorkerHost.js';
/**
 * Used by `monaco-editor` to hook up web worker rpc.
 * @skipMangle
 * @internal
 */
export function start(client) {
    const webWorkerServer = initialize(() => new EditorWorker(client));
    const editorWorkerHost = EditorWorkerHost.getChannel(webWorkerServer);
    const host = new Proxy({}, {
        get(target, prop, receiver) {
            if (typeof prop !== 'string') {
                throw new Error(`Not supported`);
            }
            return (...args) => {
                return editorWorkerHost.$fhr(prop, args);
            };
        },
    });
    return {
        host: host,
        getMirrorModels: () => {
            return webWorkerServer.requestHandler.getModels();
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLndvcmtlci5zdGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2VkaXRvci53b3JrZXIuc3RhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQWtCLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFeEU7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQ3BCLE1BQWU7SUFFZixNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNsRSxNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNyRSxNQUFNLElBQUksR0FBRyxJQUFJLEtBQUssQ0FDckIsRUFBRSxFQUNGO1FBQ0MsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUTtZQUN6QixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtnQkFDekIsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3pDLENBQUMsQ0FBQTtRQUNGLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxPQUFPO1FBQ04sSUFBSSxFQUFFLElBQWE7UUFDbkIsZUFBZSxFQUFFLEdBQUcsRUFBRTtZQUNyQixPQUFPLGVBQWUsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDbEQsQ0FBQztLQUNELENBQUE7QUFDRixDQUFDIn0=