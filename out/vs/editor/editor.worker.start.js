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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLndvcmtlci5zdGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9lZGl0b3Iud29ya2VyLnN0YXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsWUFBWSxFQUFrQixNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXhFOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUNwQixNQUFlO0lBRWYsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDbEUsTUFBTSxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDckUsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQ3JCLEVBQUUsRUFDRjtRQUNDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVE7WUFDekIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1lBQ0QsT0FBTyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7Z0JBQ3pCLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN6QyxDQUFDLENBQUE7UUFDRixDQUFDO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsT0FBTztRQUNOLElBQUksRUFBRSxJQUFhO1FBQ25CLGVBQWUsRUFBRSxHQUFHLEVBQUU7WUFDckIsT0FBTyxlQUFlLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ2xELENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQyJ9