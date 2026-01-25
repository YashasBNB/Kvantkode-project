/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ThrottledDelayer } from '../../../common/async.js';
import { Event, PauseableEmitter } from '../../../common/event.js';
import { Disposable } from '../../../common/lifecycle.js';
import { parse, stringify } from '../../../common/marshalling.js';
import { isObject, isUndefinedOrNull } from '../../../common/types.js';
export var StorageHint;
(function (StorageHint) {
    // A hint to the storage that the storage
    // does not exist on disk yet. This allows
    // the storage library to improve startup
    // time by not checking the storage for data.
    StorageHint[StorageHint["STORAGE_DOES_NOT_EXIST"] = 0] = "STORAGE_DOES_NOT_EXIST";
    // A hint to the storage that the storage
    // is backed by an in-memory storage.
    StorageHint[StorageHint["STORAGE_IN_MEMORY"] = 1] = "STORAGE_IN_MEMORY";
})(StorageHint || (StorageHint = {}));
export function isStorageItemsChangeEvent(thing) {
    const candidate = thing;
    return candidate?.changed instanceof Map || candidate?.deleted instanceof Set;
}
export var StorageState;
(function (StorageState) {
    StorageState[StorageState["None"] = 0] = "None";
    StorageState[StorageState["Initialized"] = 1] = "Initialized";
    StorageState[StorageState["Closed"] = 2] = "Closed";
})(StorageState || (StorageState = {}));
export class Storage extends Disposable {
    static { this.DEFAULT_FLUSH_DELAY = 100; }
    constructor(database, options = Object.create(null)) {
        super();
        this.database = database;
        this.options = options;
        this._onDidChangeStorage = this._register(new PauseableEmitter());
        this.onDidChangeStorage = this._onDidChangeStorage.event;
        this.state = StorageState.None;
        this.cache = new Map();
        this.flushDelayer = this._register(new ThrottledDelayer(Storage.DEFAULT_FLUSH_DELAY));
        this.pendingDeletes = new Set();
        this.pendingInserts = new Map();
        this.pendingClose = undefined;
        this.whenFlushedCallbacks = [];
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.database.onDidChangeItemsExternal((e) => this.onDidChangeItemsExternal(e)));
    }
    onDidChangeItemsExternal(e) {
        this._onDidChangeStorage.pause();
        try {
            // items that change external require us to update our
            // caches with the values. we just accept the value and
            // emit an event if there is a change.
            e.changed?.forEach((value, key) => this.acceptExternal(key, value));
            e.deleted?.forEach((key) => this.acceptExternal(key, undefined));
        }
        finally {
            this._onDidChangeStorage.resume();
        }
    }
    acceptExternal(key, value) {
        if (this.state === StorageState.Closed) {
            return; // Return early if we are already closed
        }
        let changed = false;
        // Item got removed, check for deletion
        if (isUndefinedOrNull(value)) {
            changed = this.cache.delete(key);
        }
        // Item got updated, check for change
        else {
            const currentValue = this.cache.get(key);
            if (currentValue !== value) {
                this.cache.set(key, value);
                changed = true;
            }
        }
        // Signal to outside listeners
        if (changed) {
            this._onDidChangeStorage.fire({ key, external: true });
        }
    }
    get items() {
        return this.cache;
    }
    get size() {
        return this.cache.size;
    }
    async init() {
        if (this.state !== StorageState.None) {
            return; // either closed or already initialized
        }
        this.state = StorageState.Initialized;
        if (this.options.hint === StorageHint.STORAGE_DOES_NOT_EXIST) {
            // return early if we know the storage file does not exist. this is a performance
            // optimization to not load all items of the underlying storage if we know that
            // there can be no items because the storage does not exist.
            return;
        }
        this.cache = await this.database.getItems();
    }
    get(key, fallbackValue) {
        const value = this.cache.get(key);
        if (isUndefinedOrNull(value)) {
            return fallbackValue;
        }
        return value;
    }
    getBoolean(key, fallbackValue) {
        const value = this.get(key);
        if (isUndefinedOrNull(value)) {
            return fallbackValue;
        }
        return value === 'true';
    }
    getNumber(key, fallbackValue) {
        const value = this.get(key);
        if (isUndefinedOrNull(value)) {
            return fallbackValue;
        }
        return parseInt(value, 10);
    }
    getObject(key, fallbackValue) {
        const value = this.get(key);
        if (isUndefinedOrNull(value)) {
            return fallbackValue;
        }
        return parse(value);
    }
    async set(key, value, external = false) {
        if (this.state === StorageState.Closed) {
            return; // Return early if we are already closed
        }
        // We remove the key for undefined/null values
        if (isUndefinedOrNull(value)) {
            return this.delete(key, external);
        }
        // Otherwise, convert to String and store
        const valueStr = isObject(value) || Array.isArray(value) ? stringify(value) : String(value);
        // Return early if value already set
        const currentValue = this.cache.get(key);
        if (currentValue === valueStr) {
            return;
        }
        // Update in cache and pending
        this.cache.set(key, valueStr);
        this.pendingInserts.set(key, valueStr);
        this.pendingDeletes.delete(key);
        // Event
        this._onDidChangeStorage.fire({ key, external });
        // Accumulate work by scheduling after timeout
        return this.doFlush();
    }
    async delete(key, external = false) {
        if (this.state === StorageState.Closed) {
            return; // Return early if we are already closed
        }
        // Remove from cache and add to pending
        const wasDeleted = this.cache.delete(key);
        if (!wasDeleted) {
            return; // Return early if value already deleted
        }
        if (!this.pendingDeletes.has(key)) {
            this.pendingDeletes.add(key);
        }
        this.pendingInserts.delete(key);
        // Event
        this._onDidChangeStorage.fire({ key, external });
        // Accumulate work by scheduling after timeout
        return this.doFlush();
    }
    async optimize() {
        if (this.state === StorageState.Closed) {
            return; // Return early if we are already closed
        }
        // Await pending data to be flushed to the DB
        // before attempting to optimize the DB
        await this.flush(0);
        return this.database.optimize();
    }
    async close() {
        if (!this.pendingClose) {
            this.pendingClose = this.doClose();
        }
        return this.pendingClose;
    }
    async doClose() {
        // Update state
        this.state = StorageState.Closed;
        // Trigger new flush to ensure data is persisted and then close
        // even if there is an error flushing. We must always ensure
        // the DB is closed to avoid corruption.
        //
        // Recovery: we pass our cache over as recovery option in case
        // the DB is not healthy.
        try {
            await this.doFlush(0 /* as soon as possible */);
        }
        catch (error) {
            // Ignore
        }
        await this.database.close(() => this.cache);
    }
    get hasPending() {
        return this.pendingInserts.size > 0 || this.pendingDeletes.size > 0;
    }
    async flushPending() {
        if (!this.hasPending) {
            return; // return early if nothing to do
        }
        // Get pending data
        const updateRequest = {
            insert: this.pendingInserts,
            delete: this.pendingDeletes,
        };
        // Reset pending data for next run
        this.pendingDeletes = new Set();
        this.pendingInserts = new Map();
        // Update in storage and release any
        // waiters we have once done
        return this.database.updateItems(updateRequest).finally(() => {
            if (!this.hasPending) {
                while (this.whenFlushedCallbacks.length) {
                    this.whenFlushedCallbacks.pop()?.();
                }
            }
        });
    }
    async flush(delay) {
        if (this.state === StorageState.Closed || // Return early if we are already closed
            this.pendingClose // return early if nothing to do
        ) {
            return;
        }
        return this.doFlush(delay);
    }
    async doFlush(delay) {
        if (this.options.hint === StorageHint.STORAGE_IN_MEMORY) {
            return this.flushPending(); // return early if in-memory
        }
        return this.flushDelayer.trigger(() => this.flushPending(), delay);
    }
    async whenFlushed() {
        if (!this.hasPending) {
            return; // return early if nothing to do
        }
        return new Promise((resolve) => this.whenFlushedCallbacks.push(resolve));
    }
    isInMemory() {
        return this.options.hint === StorageHint.STORAGE_IN_MEMORY;
    }
}
export class InMemoryStorageDatabase {
    constructor() {
        this.onDidChangeItemsExternal = Event.None;
        this.items = new Map();
    }
    async getItems() {
        return this.items;
    }
    async updateItems(request) {
        request.insert?.forEach((value, key) => this.items.set(key, value));
        request.delete?.forEach((key) => this.items.delete(key));
    }
    async optimize() { }
    async close() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9zdG9yYWdlL2NvbW1vbi9zdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFdEUsTUFBTSxDQUFOLElBQVksV0FVWDtBQVZELFdBQVksV0FBVztJQUN0Qix5Q0FBeUM7SUFDekMsMENBQTBDO0lBQzFDLHlDQUF5QztJQUN6Qyw2Q0FBNkM7SUFDN0MsaUZBQXNCLENBQUE7SUFFdEIseUNBQXlDO0lBQ3pDLHFDQUFxQztJQUNyQyx1RUFBaUIsQ0FBQTtBQUNsQixDQUFDLEVBVlcsV0FBVyxLQUFYLFdBQVcsUUFVdEI7QUFnQkQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLEtBQWM7SUFDdkQsTUFBTSxTQUFTLEdBQUcsS0FBNkMsQ0FBQTtJQUUvRCxPQUFPLFNBQVMsRUFBRSxPQUFPLFlBQVksR0FBRyxJQUFJLFNBQVMsRUFBRSxPQUFPLFlBQVksR0FBRyxDQUFBO0FBQzlFLENBQUM7QUErREQsTUFBTSxDQUFOLElBQVksWUFJWDtBQUpELFdBQVksWUFBWTtJQUN2QiwrQ0FBSSxDQUFBO0lBQ0osNkRBQVcsQ0FBQTtJQUNYLG1EQUFNLENBQUE7QUFDUCxDQUFDLEVBSlcsWUFBWSxLQUFaLFlBQVks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