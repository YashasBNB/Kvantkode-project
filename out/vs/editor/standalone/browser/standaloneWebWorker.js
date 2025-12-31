/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorWorkerClient } from '../../browser/services/editorWorkerService.js';
/**
 * Create a new web worker that has model syncing capabilities built in.
 * Specify an AMD module to load that will `create` an object that will be proxied.
 */
export function createWebWorker(modelService, opts) {
    return new MonacoWebWorkerImpl(modelService, opts);
}
class MonacoWebWorkerImpl extends EditorWorkerClient {
    constructor(modelService, opts) {
        super(opts.worker, opts.keepIdleModels || false, modelService);
        this._foreignModuleHost = opts.host || null;
        this._foreignProxy = this._getProxy().then((proxy) => {
            return new Proxy({}, {
                get(target, prop, receiver) {
                    if (typeof prop !== 'string') {
                        throw new Error(`Not supported`);
                    }
                    return (...args) => {
                        return proxy.$fmr(prop, args);
                    };
                },
            });
        });
    }
    // foreign host request
    fhr(method, args) {
        if (!this._foreignModuleHost || typeof this._foreignModuleHost[method] !== 'function') {
            return Promise.reject(new Error('Missing method ' + method + ' or missing main thread foreign host.'));
        }
        try {
            return Promise.resolve(this._foreignModuleHost[method].apply(this._foreignModuleHost, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    getProxy() {
        return this._foreignProxy;
    }
    withSyncedResources(resources) {
        return this.workerWithSyncedResources(resources).then((_) => this.getProxy());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVdlYldvcmtlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZVdlYldvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUdsRjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUM5QixZQUEyQixFQUMzQixJQUErQjtJQUUvQixPQUFPLElBQUksbUJBQW1CLENBQUksWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQ3RELENBQUM7QUFxQ0QsTUFBTSxtQkFDTCxTQUFRLGtCQUFrQjtJQU0xQixZQUFZLFlBQTJCLEVBQUUsSUFBK0I7UUFDdkUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsSUFBSSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFBO1FBQzNDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3BELE9BQU8sSUFBSSxLQUFLLENBQ2YsRUFBRSxFQUNGO2dCQUNDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVE7b0JBQ3pCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7d0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7b0JBQ2pDLENBQUM7b0JBQ0QsT0FBTyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7d0JBQ3pCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQzlCLENBQUMsQ0FBQTtnQkFDRixDQUFDO2FBQ0QsQ0FDSSxDQUFBO1FBQ1AsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsdUJBQXVCO0lBQ1AsR0FBRyxDQUFDLE1BQWMsRUFBRSxJQUFXO1FBQzlDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDdkYsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUNwQixJQUFJLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLEdBQUcsdUNBQXVDLENBQUMsQ0FDL0UsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM3RixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVNLG1CQUFtQixDQUFDLFNBQWdCO1FBQzFDLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDOUUsQ0FBQztDQUNEIn0=