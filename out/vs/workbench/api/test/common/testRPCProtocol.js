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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJQQ1Byb3RvY29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvY29tbW9uL3Rlc3RSUENQcm90b2NvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFLN0QsT0FBTyxFQUdOLDZCQUE2QixHQUM3QixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsMkJBQTJCLEdBQzNCLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsTUFBTSxVQUFVLHNCQUFzQixDQUFDLEtBQVU7SUFDaEQsT0FBTztRQUNOLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLGVBQWUsRUFBRSxJQUFLO1FBQ3RCLFFBQVE7WUFDUCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxHQUFHLENBQWlCLFVBQThCLEVBQUUsS0FBUTtZQUMzRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLEVBQUUsU0FBVTtRQUNuQixnQkFBZ0IsRUFBRSxTQUFVO1FBQzVCLEtBQUssRUFBRSxTQUFVO1FBQ2pCLGlCQUFpQix3Q0FBZ0M7S0FDakQsQ0FBQTtBQUNGLENBQUM7QUFFRCxvRkFBb0Y7QUFDcEYsTUFBTSxVQUFVLGtCQUFrQixDQUFJLFFBQW1DO0lBQ3hFLE9BQU8sc0JBQXNCLENBQzVCLElBQUksS0FBSyxDQUNSLEVBQUUsRUFDRjtRQUNDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBWTtZQUN4QixJQUFJLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2xDLE9BQVEsUUFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMvQixDQUFDO1lBQ0QsT0FBTyxHQUFH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