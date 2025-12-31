/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isThenable } from '../../../../base/common/async.js';
import { SerializableObjectWithBuffers, } from '../../../services/extensions/common/proxyIdentifier.js';
import { parseJsonAndRestoreBufferRefs, stringifyJsonWithBufferRefs, } from '../../../services/extensions/common/rpcProtocol.js';
export function SingleProxyRPCProtocol(thing) {
    return {
        _serviceBrand: undefined,
        remoteAuthority: null,
        getProxy() {
            return thing;
        },
        set(identifier, value) {
            return value;
        },
        dispose: undefined,
        assertRegistered: undefined,
        drain: undefined,
        extensionHostKind: 1 /* ExtensionHostKind.LocalProcess */,
    };
}
/** Makes a fake {@link SingleProxyRPCProtocol} on which any method can be called */
export function AnyCallRPCProtocol(useCalls) {
    return SingleProxyRPCProtocol(new Proxy({}, {
        get(_target, prop) {
            if (useCalls && prop in useCalls) {
                return useCalls[prop];
            }
            return () => Promise.resolve(undefined);
        },
    }));
}
export class TestRPCProtocol {
    constructor() {
        this.remoteAuthority = null;
        this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
        this._callCountValue = 0;
        this._locals = Object.create(null);
        this._proxies = Object.create(null);
    }
    drain() {
        return Promise.resolve();
    }
    get _callCount() {
        return this._callCountValue;
    }
    set _callCount(value) {
        this._callCountValue = value;
        if (this._callCountValue === 0) {
            this._completeIdle?.();
            this._idle = undefined;
        }
    }
    sync() {
        return new Promise((c) => {
            setTimeout(c, 0);
        }).then(() => {
            if (this._callCount === 0) {
                return undefined;
            }
            if (!this._idle) {
                this._idle = new Promise((c, e) => {
                    this._completeIdle = c;
                });
            }
            return this._idle;
        });
    }
    getProxy(identifier) {
        if (!this._proxies[identifier.sid]) {
            this._proxies[identifier.sid] = this._createProxy(identifier.sid);
        }
        return this._proxies[identifier.sid];
    }
    _createProxy(proxyId) {
        const handler = {
            get: (target, name) => {
                if (typeof name === 'string' &&
                    !target[name] &&
                    name.charCodeAt(0) === 36 /* CharCode.DollarSign */) {
                    target[name] = (...myArgs) => {
                        return this._remoteCall(proxyId, name, myArgs);
                    };
                }
                return target[name];
            },
        };
        return new Proxy(Object.create(null), handler);
    }
    set(identifier, value) {
        this._locals[identifier.sid] = value;
        return value;
    }
    _remoteCall(proxyId, path, args) {
        this._callCount++;
        return new Promise((c) => {
            setTimeout(c, 0);
        }).then(() => {
            const instance = this._locals[proxyId];
            // pretend the args went over the wire... (invoke .toJSON on objects...)
            const wireArgs = simulateWireTransfer(args);
            let p;
            try {
                const result = instance[path].apply(instance, wireArgs);
                p = isThenable(result) ? result : Promise.resolve(result);
            }
            catch (err) {
                p = Promise.reject(err);
            }
            return p.then((result) => {
                this._callCount--;
                // pretend the result went over the wire... (invoke .toJSON on objects...)
                const wireResult = simulateWireTransfer(result);
                return wireResult;
            }, (err) => {
                this._callCount--;
                return Promise.reject(err);
            });
        });
    }
    dispose() {
        throw new Error('Not implemented!');
    }
    assertRegistered(identifiers) {
        throw new Error('Not implemented!');
    }
}
function simulateWireTransfer(obj) {
    if (!obj) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(simulateWireTransfer);
    }
    if (obj instanceof SerializableObjectWithBuffers) {
        const { jsonString, referencedBuffers } = stringifyJsonWithBufferRefs(obj);
        return parseJsonAndRestoreBufferRefs(jsonString, referencedBuffers, null);
    }
    else {
        return JSON.parse(JSON.stringify(obj));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJQQ1Byb3RvY29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2NvbW1vbi90ZXN0UlBDUHJvdG9jb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBSzdELE9BQU8sRUFHTiw2QkFBNkIsR0FDN0IsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDJCQUEyQixHQUMzQixNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxLQUFVO0lBQ2hELE9BQU87UUFDTixhQUFhLEVBQUUsU0FBUztRQUN4QixlQUFlLEVBQUUsSUFBSztRQUN0QixRQUFRO1lBQ1AsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsR0FBRyxDQUFpQixVQUE4QixFQUFFLEtBQVE7WUFDM0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxFQUFFLFNBQVU7UUFDbkIsZ0JBQWdCLEVBQUUsU0FBVTtRQUM1QixLQUFLLEVBQUUsU0FBVTtRQUNqQixpQkFBaUIsd0NBQWdDO0tBQ2pELENBQUE7QUFDRixDQUFDO0FBRUQsb0ZBQW9GO0FBQ3BGLE1BQU0sVUFBVSxrQkFBa0IsQ0FBSSxRQUFtQztJQUN4RSxPQUFPLHNCQUFzQixDQUM1QixJQUFJLEtBQUssQ0FDUixFQUFFLEVBQ0Y7UUFDQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQVk7WUFDeEIsSUFBSSxRQUFRLElBQUksSUFBSSxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNsQyxPQUFRLFFBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDL0IsQ0FBQztZQUNELE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9B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