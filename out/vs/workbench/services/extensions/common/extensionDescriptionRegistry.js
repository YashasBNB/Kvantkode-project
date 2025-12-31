/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet, } from '../../../../platform/extensions/common/extensions.js';
import { Emitter } from '../../../../base/common/event.js';
import * as path from '../../../../base/common/path.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
export class DeltaExtensionsResult {
    constructor(versionId, removedDueToLooping) {
        this.versionId = versionId;
        this.removedDueToLooping = removedDueToLooping;
    }
}
export class ExtensionDescriptionRegistry {
    static isHostExtension(extensionId, myRegistry, globalRegistry) {
        if (myRegistry.getExtensionDescription(extensionId)) {
            // I have this extension
            return false;
        }
        const extensionDescription = globalRegistry.getExtensionDescription(extensionId);
        if (!extensionDescription) {
            // unknown extension
            return false;
        }
        if ((extensionDescription.main || extensionDescription.browser) &&
            extensionDescription.api === 'none') {
            return true;
        }
        return false;
    }
    constructor(_activationEventsReader, extensionDescriptions) {
        this._activationEventsReader = _activationEventsReader;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._versionId = 0;
        this._extensionDescriptions = extensionDescriptions;
        this._initialize();
    }
    _initialize() {
        // Ensure extensions are stored in the order: builtin, user, under development
        this._extensionDescriptions.sort(extensionCmp);
        this._extensionsMap = new ExtensionIdentifierMap();
        this._extensionsArr = [];
        this._activationMap = new Map();
        for (const extensionDescription of this._extensionDescriptions) {
            if (this._extensionsMap.has(extensionDescription.identifier)) {
                // No overwriting allowed!
                console.error('Extension `' + extensionDescription.identifier.value + '` is already registered');
                continue;
            }
            this._extensionsMap.set(extensionDescription.identifier, extensionDescription);
            this._extensionsArr.push(extensionDescription);
            const activationEvents = this._activationEventsReader.readActivationEvents(extensionDescription);
            for (const activationEvent of activationEvents) {
                if (!this._activationMap.has(activationEvent)) {
                    this._activationMap.set(activationEvent, []);
                }
                this._activationMap.get(activationEvent).push(extensionDescription);
            }
        }
    }
    set(extensionDescriptions) {
        this._extensionDescriptions = extensionDescriptions;
        this._initialize();
        this._versionId++;
        this._onDidChange.fire(undefined);
        return {
            versionId: this._versionId,
        };
    }
    deltaExtensions(toAdd, toRemove) {
        // It is possible that an extension is removed, only to be added again at a different version
        // so we will first handle removals
        this._extensionDescriptions = removeExtensions(this._extensionDescriptions, toRemove);
        // Then, handle the extensions to add
        this._extensionDescriptions = this._extensionDescriptions.concat(toAdd);
        // Immediately remove looping extensions!
        const looping = ExtensionDescriptionRegistry._findLoopingExtensions(this._extensionDescriptions);
        this._extensionDescriptions = removeExtensions(this._extensionDescriptions, looping.map((ext) => ext.identifier));
        this._initialize();
        this._versionId++;
        this._onDidChange.fire(undefined);
        return new DeltaExtensionsResult(this._versionId, looping);
    }
    static _findLoopingExtensions(extensionDescriptions) {
        const G = new (class {
            constructor() {
                this._arcs = new Map();
                this._nodesSet = new Set();
                this._nodesArr = [];
            }
            addNode(id) {
                if (!this._nodesSet.has(id)) {
                    this._nodesSet.add(id);
                    this._nodesArr.push(id);
                }
            }
            addArc(from, to) {
                this.addNode(from);
                this.addNode(to);
                if (this._arcs.has(from)) {
                    this._arcs.get(from).push(to);
                }
                else {
                    this._arcs.set(from, [to]);
                }
            }
            getArcs(id) {
                if (this._arcs.has(id)) {
                    return this._arcs.get(id);
                }
                return [];
            }
            hasOnlyGoodArcs(id, good) {
                const dependencies = G.getArcs(id);
                for (let i = 0; i < dependencies.length; i++) {
                    if (!good.has(dependencies[i])) {
                        return false;
                    }
                }
                return true;
            }
            getNodes() {
                return this._nodesArr;
            }
        })();
        const descs = new ExtensionIdentifierMap();
        for (const extensionDescription of extensionDescriptions) {
            descs.set(extensionDescription.identifier, extensionDescription);
            if (extensionDescription.extensionDependencies) {
                for (const depId of extensionDescription.extensionDependencies) {
                    G.addArc(ExtensionIdentifier.toKey(extensionDescription.identifier), ExtensionIdentifier.toKey(depId));
                }
            }
        }
        // initialize with all extensions with no dependencies.
        const good = new Set();
        G.getNodes()
            .filter((id) => G.getArcs(id).length === 0)
            .forEach((id) => good.add(id));
        // all other extensions will be processed below.
        const nodes = G.getNodes().filter((id) => !good.has(id));
        let madeProgress;
        do {
            madeProgress = false;
            // find one extension which has only good deps
            for (let i = 0; i < nodes.length; i++) {
                const id = nodes[i];
                if (G.hasOnlyGoodArcs(id, good)) {
                    nodes.splice(i, 1);
                    i--;
                    good.add(id);
                    madeProgress = true;
                }
            }
        } while (madeProgress);
        // The remaining nodes are bad and have loops
        return nodes.map((id) => descs.get(id));
    }
    containsActivationEvent(activationEvent) {
        return this._activationMap.has(activationEvent);
    }
    containsExtension(extensionId) {
        return this._extensionsMap.has(extensionId);
    }
    getExtensionDescriptionsForActivationEvent(activationEvent) {
        const extensions = this._activationMap.get(activationEvent);
        return extensions ? extensions.slice(0) : [];
    }
    getAllExtensionDescriptions() {
        return this._extensionsArr.slice(0);
    }
    getSnapshot() {
        return new ExtensionDescriptionRegistrySnapshot(this._versionId, this.getAllExtensionDescriptions());
    }
    getExtensionDescription(extensionId) {
        const extension = this._extensionsMap.get(extensionId);
        return extension ? extension : undefined;
    }
    getExtensionDescriptionByUUID(uuid) {
        for (const extensionDescription of this._extensionsArr) {
            if (extensionDescription.uuid === uuid) {
                return extensionDescription;
            }
        }
        return undefined;
    }
    getExtensionDescriptionByIdOrUUID(extensionId, uuid) {
        return (this.getExtensionDescription(extensionId) ??
            (uuid ? this.getExtensionDescriptionByUUID(uuid) : undefined));
    }
}
export class ExtensionDescriptionRegistrySnapshot {
    constructor(versionId, extensions) {
        this.versionId = versionId;
        this.extensions = extensions;
    }
}
export class LockableExtensionDescriptionRegistry {
    constructor(activationEventsReader) {
        this._lock = new Lock();
        this._actual = new ExtensionDescriptionRegistry(activationEventsReader, []);
    }
    async acquireLock(customerName) {
        const lock = await this._lock.acquire(customerName);
        return new ExtensionDescriptionRegistryLock(this, lock);
    }
    deltaExtensions(acquiredLock, toAdd, toRemove) {
        if (!acquiredLock.isAcquiredFor(this)) {
            throw new Error('Lock is not held');
        }
        return this._actual.deltaExtensions(toAdd, toRemove);
    }
    containsActivationEvent(activationEvent) {
        return this._actual.containsActivationEvent(activationEvent);
    }
    containsExtension(extensionId) {
        return this._actual.containsExtension(extensionId);
    }
    getExtensionDescriptionsForActivationEvent(activationEvent) {
        return this._actual.getExtensionDescriptionsForActivationEvent(activationEvent);
    }
    getAllExtensionDescriptions() {
        return this._actual.getAllExtensionDescriptions();
    }
    getSnapshot() {
        return this._actual.getSnapshot();
    }
    getExtensionDescription(extensionId) {
        return this._actual.getExtensionDescription(extensionId);
    }
    getExtensionDescriptionByUUID(uuid) {
        return this._actual.getExtensionDescriptionByUUID(uuid);
    }
    getExtensionDescriptionByIdOrUUID(extensionId, uuid) {
        return this._actual.getExtensionDescriptionByIdOrUUID(extensionId, uuid);
    }
}
export class ExtensionDescriptionRegistryLock extends Disposable {
    constructor(_registry, lock) {
        super();
        this._registry = _registry;
        this._isDisposed = false;
        this._register(lock);
    }
    isAcquiredFor(registry) {
        return !this._isDisposed && this._registry === registry;
    }
}
class LockCustomer {
    constructor(name) {
        this.name = name;
        const withResolvers = promiseWithResolvers();
        this.promise = withResolvers.promise;
        this._resolve = withResolvers.resolve;
    }
    resolve(value) {
        this._resolve(value);
    }
}
class Lock {
    constructor() {
        this._pendingCustomers = [];
        this._isLocked = false;
    }
    async acquire(customerName) {
        const customer = new LockCustomer(customerName);
        this._pendingCustomers.push(customer);
        this._advance();
        return customer.promise;
    }
    _advance() {
        if (this._isLocked) {
            // cannot advance yet
            return;
        }
        if (this._pendingCustomers.length === 0) {
            // no more waiting customers
            return;
        }
        const customer = this._pendingCustomers.shift();
        this._isLocked = true;
        let customerHoldsLock = true;
        const logLongRunningCustomerTimeout = setTimeout(() => {
            if (customerHoldsLock) {
                console.warn(`The customer named ${customer.name} has been holding on to the lock for 30s. This might be a problem.`);
            }
        }, 30 * 1000 /* 30 seconds */);
        const releaseLock = () => {
            if (!customerHoldsLock) {
                return;
            }
            clearTimeout(logLongRunningCustomerTimeout);
            customerHoldsLock = false;
            this._isLocked = false;
            this._advance();
        };
        customer.resolve(toDisposable(releaseLock));
    }
}
var SortBucket;
(function (SortBucket) {
    SortBucket[SortBucket["Builtin"] = 0] = "Builtin";
    SortBucket[SortBucket["User"] = 1] = "User";
    SortBucket[SortBucket["Dev"] = 2] = "Dev";
})(SortBucket || (SortBucket = {}));
/**
 * Ensure that:
 * - first are builtin extensions
 * - second are user extensions
 * - third are extensions under development
 *
 * In each bucket, extensions must be sorted alphabetically by their folder name.
 */
function extensionCmp(a, b) {
    const aSortBucket = a.isBuiltin
        ? 0 /* SortBucket.Builtin */
        : a.isUnderDevelopment
            ? 2 /* SortBucket.Dev */
            : 1 /* SortBucket.User */;
    const bSortBucket = b.isBuiltin
        ? 0 /* SortBucket.Builtin */
        : b.isUnderDevelopment
            ? 2 /* SortBucket.Dev */
            : 1 /* SortBucket.User */;
    if (aSortBucket !== bSortBucket) {
        return aSortBucket - bSortBucket;
    }
    const aLastSegment = path.posix.basename(a.extensionLocation.path);
    const bLastSegment = path.posix.basename(b.extensionLocation.path);
    if (aLastSegment < bLastSegment) {
        return -1;
    }
    if (aLastSegment > bLastSegment) {
        return 1;
    }
    return 0;
}
function removeExtensions(arr, toRemove) {
    const toRemoveSet = new ExtensionIdentifierSet(toRemove);
    return arr.filter((extension) => !toRemoveSet.has(extension.identifier));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRGVzY3JpcHRpb25SZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25EZXNjcmlwdGlvblJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsc0JBQXNCLEVBQ3RCLHNCQUFzQixHQUV0QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFdkUsTUFBTSxPQUFPLHFCQUFxQjtJQUNqQyxZQUNpQixTQUFpQixFQUNqQixtQkFBNEM7UUFENUMsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXlCO0lBQzFELENBQUM7Q0FDSjtBQWlCRCxNQUFNLE9BQU8sNEJBQTRCO0lBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQzVCLFdBQXlDLEVBQ3pDLFVBQXdDLEVBQ3hDLGNBQTRDO1FBRTVDLElBQUksVUFBVSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDckQsd0JBQXdCO1lBQ3hCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE1BQU0sb0JBQW9CLEdBQUcsY0FBYyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ2hGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzNCLG9CQUFvQjtZ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