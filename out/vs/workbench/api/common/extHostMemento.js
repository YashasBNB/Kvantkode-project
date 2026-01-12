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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lbWVudG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RNZW1lbnRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVqRixNQUFNLE9BQU8sZ0JBQWdCO0lBWTVCLFlBQVksRUFBVSxFQUFFLE1BQWUsRUFBRSxPQUF1QjtRQUh4RCxzQkFBaUIsR0FBdUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUl4RSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBRXZCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVE7YUFDeEIsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkUsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtZQUNuQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUMsQ0FBQyxDQUFBO1FBRUgsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM5RCxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDckQsSUFBSSxDQUFDLE1B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