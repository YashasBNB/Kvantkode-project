/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise, RunOnceScheduler } from '../../../base/common/async.js';
export class ExtensionMemento {
    constructor(id, global, storage) {
        this._deferredPromises = new Map();
        this._id = id;
        this._shared = global;
        this._storage = storage;
        this._init = this._storage
            .initializeExtensionStorage(this._shared, this._id, Object.create(null))
            .then((value) => {
            this._value = value;
            return this;
        });
        this._storageListener = this._storage.onDidChangeStorage((e) => {
            if (e.shared === this._shared && e.key === this._id) {
                this._value = e.value;
            }
        });
        this._scheduler = new RunOnceScheduler(() => {
            const records = this._deferredPromises;
            this._deferredPromises = new Map();
            (async () => {
                try {
                    await this._storage.setValue(this._shared, this._id, this._value);
                    for (const value of records.values()) {
                        value.complete();
                    }
                }
                catch (e) {
                    for (const value of records.values()) {
                        value.error(e);
                    }
                }
            })();
        }, 0);
    }
    keys() {
        // Filter out `undefined` values, as they can stick around in the `_value` until the `onDidChangeStorage` event runs
        return Object.entries(this._value ?? {})
            .filter(([, value]) => value !== undefined)
            .map(([key]) => key);
    }
    get whenReady() {
        return this._init;
    }
    get(key, defaultValue) {
        let value = this._value[key];
        if (typeof value === 'undefined') {
            value = defaultValue;
        }
        return value;
    }
    update(key, value) {
        if (value !== null && typeof value === 'object') {
            // Prevent the value from being as-is for until we have
            // received the change event from the main side by emulating
            // the treatment of values via JSON parsing and stringifying.
            // (https://github.com/microsoft/vscode/issues/209479)
            this._value[key] = JSON.parse(JSON.stringify(value));
        }
        else {
            this._value[key] = value;
        }
        const record = this._deferredPromises.get(key);
        if (record !== undefined) {
            return record.p;
        }
        const promise = new DeferredPromise();
        this._deferredPromises.set(key, promise);
        if (!this._scheduler.isScheduled()) {
            this._scheduler.schedule();
        }
        return promise.p;
    }
    dispose() {
        this._storageListener.dispose();
    }
}
export class ExtensionGlobalMemento extends ExtensionMemento {
    setKeysForSync(keys) {
        this._storage.registerExtensionStorageKeysToSync({ id: this._id, version: this._extension.version }, keys);
    }
    constructor(extensionDescription, storage) {
        super(extensionDescription.identifier.value, true, storage);
        this._extension = extensionDescription;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lbWVudG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TWVtZW50by50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFakYsTUFBTSxPQUFPLGdCQUFnQjtJQVk1QixZQUFZLEVBQVUsRUFBRSxNQUFlLEVBQUUsT0FBdUI7UUFIeEQsc0JBQWlCLEdBQXVDLElBQUksR0FBRyxFQUFFLENBQUE7UUFJeEUsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDYixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUV2QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRO2FBQ3hCLDBCQUEwQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3ZFLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7WUFDbkIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtRQUVILElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDOUQsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxNQUFNLEdB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