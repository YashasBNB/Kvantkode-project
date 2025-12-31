/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { GlobalIdleValue } from '../../../base/common/async.js';
import { illegalState } from '../../../base/common/errors.js';
import { dispose, isDisposable, toDisposable, } from '../../../base/common/lifecycle.js';
import { SyncDescriptor } from './descriptors.js';
import { Graph } from './graph.js';
import { IInstantiationService, _util, } from './instantiation.js';
import { ServiceCollection } from './serviceCollection.js';
import { LinkedList } from '../../../base/common/linkedList.js';
// TRACING
const _enableAllTracing = false;
// || "TRUE" // DO NOT CHECK IN!
class CyclicDependencyError extends Error {
    constructor(graph) {
        super('cyclic dependency between services');
        this.message =
            graph.findCycleSlow() ?? `UNABLE to detect cycle, dumping graph: \n${graph.toString()}`;
    }
}
export class InstantiationService {
    constructor(_services = new ServiceCollection(), _strict = false, _parent, _enableTracing = _enableAllTracing) {
        this._services = _services;
        this._strict = _strict;
        this._parent = _parent;
        this._enableTracing = _enableTracing;
        this._isDisposed = false;
        this._servicesToMaybeDispose = new Set();
        this._children = new Set();
        this._activeInstantiations = new Set();
        this._services.set(IInstantiationService, this);
        this._globalGraph = _enableTracing ? (_parent?._globalGraph ?? new Graph((e) => e)) : undefined;
    }
    dispose() {
        if (!this._isDisposed) {
            this._isDisposed = true;
            // dispose all child services
            dispose(this._children);
            this._children.clear();
            // dispose all services created by this service
            for (const candidate of this._servicesToMaybeDispose) {
                if (isDisposable(candidate)) {
                    candidate.dispose();
                }
            }
            this._servicesToMaybeDispose.clear();
        }
    }
    _throwIfDisposed() {
        if (this._isDisposed) {
            throw new Error('InstantiationService has been disposed');
        }
    }
    createChild(services, store) {
        this._throwIfDisposed();
        const that = this;
        const result = new (class extends InstantiationService {
            dispose() {
                that._children.delete(result);
                super.dispose();
            }
        })(services, this._strict, this, this._enableTracing);
        this._children.add(result);
        store?.add(result);
        return result;
    }
    invokeFunction(fn, ...args) {
        this._throwIfDisposed();
        const _trace = Trace.traceInvocation(this._enableTracing, fn);
        let _done = false;
        try {
            const accessor = {
                get: (id) => {
                    if (_done) {
                        throw illegalState('service accessor is only valid during the invocation of its target method');
                    }
                    const result = this._getOrCreateServiceInstance(id, _trace);
                    if (!result) {
                        throw new Error(`[invokeFunction] unknown service '${id}'`);
                    }
                    return result;
                },
            };
            return fn(accessor, ...args);
        }
        finally {
            _done = true;
            _trace.stop();
        }
    }
    createInstance(ctorOrDescriptor, ...rest) {
        this._throwIfDisposed();
        let _trace;
        let result;
        if (ctorOrDescriptor instanceof SyncDescriptor) {
            _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor.ctor);
            result = this._createInstance(ctorOrDescriptor.ctor, ctorOrDescriptor.staticArguments.concat(rest), _trace);
        }
        else {
            _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor);
            result = this._createInstance(ctorOrDescriptor, rest, _trace);
        }
        _trace.stop();
        return result;
    }
    _createInstance(ctor, args = [], _trace) {
        // arguments defined by service decorators
        const serviceDependencies = _util.getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
        const serviceArgs = [];
        for (const dependency of serviceDependencies) {
            const service = this._getOrCreateServiceInstance(dependency.id, _trace);
            if (!service) {
                this._throwIfStrict(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`, false);
            }
            serviceArgs.push(service);
        }
        const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;
        // check for argument mismatches, adjust static args if needed
        if (args.length !== firstServiceArgPos) {
            console.trace(`[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`);
            const delta = firstServiceArgPos - args.length;
            if (delta > 0) {
                args = args.concat(new Array(delta));
            }
            else {
                args = args.slice(0, firstServiceArgPos);
            }
        }
        // now create the instance
        return Reflect.construct(ctor, args.concat(serviceArgs));
    }
    _setCreatedServiceInstance(id, instance) {
        if (this._services.get(id) instanceof SyncDescriptor) {
            this._services.set(id, instance);
        }
        else if (this._parent) {
            this._parent._setCreatedServiceInstance(id, instance);
        }
        else {
            throw new Error('illegalState - setting UNKNOWN service instance');
        }
    }
    _getServiceInstanceOrDescriptor(id) {
        const instanceOrDesc = this._services.get(id);
        if (!instanceOrDesc && this._parent) {
            return this._parent._getServiceInstanceOrDescriptor(id);
        }
        else {
            return instanceOrDesc;
        }
    }
    _getOrCreateServiceInstance(id, _trace) {
        if (this._globalGraph && this._globalGraphImplicitDependency) {
            this._globalGraph.insertEdge(this._globalGraphImplicitDependency, String(id));
        }
        const thing = this._getServiceInstanceOrDescriptor(id);
        if (thing instanceof SyncDescriptor) {
            return this._safeCreateAndCacheServiceInstance(id, thing, _trace.branch(id, true));
        }
        else {
            _trace.branch(id, false);
            return thing;
        }
    }
    _safeCreateAndCacheServiceInstance(id, desc, _trace) {
        if (this._activeInstantiations.has(id)) {
            throw new Error(`illegal state - RECURSIVELY instantiating service '${id}'`);
        }
        this._activeInstantiations.add(id);
        try {
            return this._createAndCacheServiceInstance(id, desc, _trace);
        }
        finally {
            this._activeInstantiations.delete(id);
        }
    }
    _createAndCacheServiceInstance(id, desc, _trace) {
        const graph = new Graph((data) => data.id.toString());
        let cycleCount = 0;
        const stack = [{ id, desc, _trace }];
        const seen = new Set();
        while (stack.length) {
            const item = stack.pop();
            if (seen.has(String(item.id))) {
                continue;
            }
            seen.add(String(item.id));
            graph.lookupOrInsertNode(item);
            // a weak but working heuristic for cycle checks
            if (cycleCount++ > 1000) {
                throw new CyclicDependencyError(graph);
            }
            // check all dependencies for existence and if they need to be created first
            for (const dependency of _util.getServiceDependencies(item.desc.ctor)) {
                const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id);
                if (!instanceOrDesc) {
                    this._throwIfStrict(`[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`, true);
                }
                // take note of all service dependencies
                this._globalGraph?.insertEdge(String(item.id), String(dependency.id));
                if (instanceOrDesc instanceof SyncDescriptor) {
                    const d = {
                        id: dependency.id,
                        desc: instanceOrDesc,
                        _trace: item._trace.branch(dependency.id, true),
                    };
                    graph.insertEdge(item, d);
                    stack.push(d);
                }
            }
        }
        while (true) {
            const roots = graph.roots();
            // if there is no more roots but still
            // nodes in the graph we have a cycle
            if (roots.length === 0) {
                if (!graph.isEmpty()) {
                    throw new CyclicDependencyError(graph);
                }
                break;
            }
            for (const { data } of roots) {
                // Repeat the check for this still being a service sync descriptor. That's because
                // instantiating a dependency might have side-effect and recursively trigger instantiation
                // so that some dependencies are now fullfilled already.
                const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id);
                if (instanceOrDesc instanceof SyncDescriptor) {
                    // create instance and overwrite the service collections
                    const instance = this._createServiceInstanceWithOwner(data.id, data.desc.ctor, data.desc.staticArguments, data.desc.supportsDelayedInstantiation, data._trace);
                    this._setCreatedServiceInstance(data.id, instance);
                }
                graph.removeNode(data);
            }
        }
        return this._getServiceInstanceOrDescriptor(id);
    }
    _createServiceInstanceWithOwner(id, ctor, args = [], supportsDelayedInstantiation, _trace) {
        if (this._services.get(id) instanceof SyncDescriptor) {
            return this._createServiceInstance(id, ctor, args, supportsDelayedInstantiation, _trace, this._servicesToMaybeDispose);
        }
        else if (this._parent) {
            return this._parent._createServiceInstanceWithOwner(id, ctor, args, supportsDelayedInstantiation, _trace);
        }
        else {
            throw new Error(`illegalState - creating UNKNOWN service instance ${ctor.name}`);
        }
    }
    _createServiceInstance(id, ctor, args = [], supportsDelayedInstantiation, _trace, disposeBucket) {
        if (!supportsDelayedInstantiation) {
            // eager instantiation
            const result = this._createInstance(ctor, args, _trace);
            disposeBucket.add(result);
            return result;
        }
        else {
            const child = new InstantiationService(undefined, this._strict, this, this._enableTracing);
            child._globalGraphImplicitDependency = String(id);
            // Return a proxy object that's backed by an idle value. That
            // strategy is to instantiate services in our idle time or when actually
            // needed but not when injected into a consumer
            // return "empty events" when the service isn't instantiated yet
            const earlyListeners = new Map();
            const idle = new GlobalIdleValue(() => {
                const result = child._createInstance(ctor, args, _trace);
                // early listeners that we kept are now being subscribed to
                // the real service
                for (const [key, values] of earlyListeners) {
                    const candidate = result[key];
                    if (typeof candidate === 'function') {
                        for (const value of values) {
                            value.disposable = candidate.apply(result, value.listener);
                        }
                    }
                }
                earlyListeners.clear();
                disposeBucket.add(result);
                return result;
            });
            return new Proxy(Object.create(null), {
                get(target, key) {
                    if (!idle.isInitialized) {
                        // looks like an event
                        if (typeof key === 'string' && (key.startsWith('onDid') || key.startsWith('onWill'))) {
                            let list = earlyListeners.get(key);
                            if (!list) {
                                list = new LinkedList();
                                earlyListeners.set(key, list);
                            }
                            const event = (callback, thisArg, disposables) => {
                                if (idle.isInitialized) {
                                    return idle.value[key](callback, thisArg, disposables);
                                }
                                else {
                                    const entry = {
                                        listener: [callback, thisArg, disposables],
                                        disposable: undefined,
                                    };
                                    const rm = list.push(entry);
                                    const result = toDisposable(() => {
                                        rm();
                                        entry.disposable?.dispose();
                                    });
                                    return result;
                                }
                            };
                            return event;
                        }
                    }
                    // value already exists
                    if (key in target) {
                        return target[key];
                    }
                    // create value
                    const obj = idle.value;
                    let prop = obj[key];
                    if (typeof prop !== 'function') {
                        return prop;
                    }
                    prop = prop.bind(obj);
                    target[key] = prop;
                    return prop;
                },
                set(_target, p, value) {
                    idle.value[p] = value;
                    return true;
                },
                getPrototypeOf(_target) {
                    return ctor.prototype;
                },
            });
        }
    }
    _throwIfStrict(msg, printWarning) {
        if (printWarning) {
            console.warn(msg);
        }
        if (this._strict) {
            throw new Error(msg);
        }
    }
}
//#region -- tracing ---
var TraceType;
(function (TraceType) {
    TraceType[TraceType["None"] = 0] = "None";
    TraceType[TraceType["Creation"] = 1] = "Creation";
    TraceType[TraceType["Invocation"] = 2] = "Invocation";
    TraceType[TraceType["Branch"] = 3] = "Branch";
})(TraceType || (TraceType = {}));
export class Trace {
    static { this.all = new Set(); }
    static { this._None = new (class extends Trace {
        constructor() {
            super(0 /* TraceType.None */, null);
        }
        stop() { }
        branch() {
            return this;
        }
    })(); }
    static traceInvocation(_enableTracing, ctor) {
        return !_enableTracing
            ? Trace._None
            : new Trace(2 /* TraceType.Invocation */, ctor.name || new Error().stack.split('\n').slice(3, 4).join('\n'));
    }
    static traceCreation(_enableTracing, ctor) {
        return !_enableTracing ? Trace._None : new Trace(1 /* TraceType.Creation */, ctor.name);
    }
    static { this._totals = 0; }
    constructor(type, name) {
        this.type = type;
        this.name = name;
        this._start = Date.now();
        this._dep = [];
    }
    branch(id, first) {
        const child = new Trace(3 /* TraceType.Branch */, id.toString());
        this._dep.push([id, first, child]);
        return child;
    }
    stop() {
        const dur = Date.now() - this._start;
        Trace._totals += dur;
        let causedCreation = false;
        function printChild(n, trace) {
            const res = [];
            const prefix = new Array(n + 1).join('\t');
            for (const [id, first, child] of trace._dep) {
                if (first && child) {
                    causedCreation = true;
                    res.push(`${prefix}CREATES -> ${id}`);
                    const nested = printChild(n + 1, child);
                    if (nested) {
                        res.push(nested);
                    }
                }
                else {
                    res.push(`${prefix}uses -> ${id}`);
                }
            }
            return res.join('\n');
        }
        const lines = [
            `${this.type === 1 /* TraceType.Creation */ ? 'CREATE' : 'CALL'} ${this.name}`,
            `${printChild(1, this)}`,
            `DONE, took ${dur.toFixed(2)}ms (grand total ${Trace._totals.toFixed(2)}ms)`,
        ];
        if (dur > 2 || causedCreation) {
            Trace.all.add(lines.join('\n'));
        }
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9pbnN0YW50aWF0aW9uL2NvbW1vbi9pbnN0YW50aWF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFFTixPQUFPLEVBRVAsWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxjQUFjLEVBQW1CLE1BQU0sa0JBQWtCLENBQUE7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNsQyxPQUFPLEVBRU4scUJBQXFCLEVBR3JCLEtBQUssR0FDTCxNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUvRCxVQUFVO0FBQ1YsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUE7QUFDL0IsZ0NBQWdDO0FBQ2hDLE1BQU0scUJBQXNCLFNBQVEsS0FBSztJQUN4QyxZQUFZLEtBQWlCO1FBQzVCLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxPQUFPO1lBQ1gsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLDRDQUE0QyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQTtJQUN6RixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sb0JBQW9CO0lBVWhDLFlBQ2tCLFlBQStCLElBQUksaUJBQWlCLEVBQUUsRUFDdEQsVUFBbUIs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