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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvc3RvcmFnZS9jb21tb24vc3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXRFLE1BQU0sQ0FBTixJQUFZLFdBVVg7QUFWRCxXQUFZLFdBQVc7SUFDdEIseUNBQXlDO0lBQ3pDLDBDQUEwQztJQUMxQyx5Q0FBeUM7SUFDekMsNkNBQTZDO0lBQzdDLGlGQUFzQixDQUFBO0lBRXRCLHlDQUF5QztJQUN6QyxxQ0FBcUM7SUFDckMsdUVBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQVZXLFdBQVcsS0FBWCxXQUFXLFFBVXRCO0FBZ0JELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUFjO0lBQ3ZELE1BQU0sU0FBUyxHQUFHLEtBQTZDLENBQUE7SUFFL0QsT0FBTyxTQUFTLEVBQUUsT0FBTyxZQUFZLEdBQUcsSUFBSSxTQUFTLEVBQUUsT0FBTyxZQUFZLEdBQUcsQ0FBQTtBQUM5RSxDQUFDO0FBK0RELE1BQU0sQ0FBTixJQUFZLFlBSVg7QUFKRCxXQUFZLFlBQVk7SUFDdkIsK0NBQUksQ0FBQTtJQUNKLDZEQUFXLENBQUE7SUFDWCxtREFBTSxDQUFBO0FBQ1AsQ0FBQyxFQUpXLFlBQVksS0FBWixZQUFZLFFBSXZC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