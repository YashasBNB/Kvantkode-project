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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRGVzY3JpcHRpb25SZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbkRlc2NyaXB0aW9uUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsc0JBQXNCLEdBRXRCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV2RSxNQUFNLE9BQU8scUJBQXFCO0lBQ2pDLFlBQ2lCLFNBQWlCLEVBQ2pCLG1CQUE0QztRQUQ1QyxjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBeUI7SUFDMUQsQ0FBQztDQUNKO0FBaUJELE1BQU0sT0FBTyw0QkFBNEI7SUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FDNUIsV0FBeUMsRUFDekMsVUFBd0MsRUFDeEMsY0FBNEM7UUFFNUMsSUFBSSxVQUFVLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNyRCx3QkFBd0I7WUFDeEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDaEYsSUFBSSxDQUFDLG9CQUFvQixF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