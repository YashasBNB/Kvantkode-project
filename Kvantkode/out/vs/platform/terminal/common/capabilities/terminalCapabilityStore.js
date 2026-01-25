/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class TerminalCapabilityStore extends Disposable {
    constructor() {
        super(...arguments);
        this._map = new Map();
        this._onDidRemoveCapabilityType = this._register(new Emitter());
        this.onDidRemoveCapabilityType = this._onDidRemoveCapabilityType.event;
        this._onDidAddCapabilityType = this._register(new Emitter());
        this.onDidAddCapabilityType = this._onDidAddCapabilityType.event;
        this._onDidRemoveCapability = this._register(new Emitter());
        this.onDidRemoveCapability = this._onDidRemoveCapability.event;
        this._onDidAddCapability = this._register(new Emitter());
        this.onDidAddCapability = this._onDidAddCapability.event;
    }
    get items() {
        return this._map.keys();
    }
    add(capability, impl) {
        this._map.set(capability, impl);
        this._onDidAddCapabilityType.fire(capability);
        this._onDidAddCapability.fire({ id: capability, capability: impl });
    }
    get(capability) {
        // HACK: This isn't totally safe since the Map key and value are not connected
        return this._map.get(capability);
    }
    remove(capability) {
        const impl = this._map.get(capability);
        if (!impl) {
            return;
        }
        this._map.delete(capability);
        this._onDidRemoveCapabilityType.fire(capability);
        this._onDidAddCapability.fire({ id: capability, capability: impl });
    }
    has(capability) {
        return this._map.has(capability);
    }
}
export class TerminalCapabilityStoreMultiplexer extends Disposable {
    constructor() {
        super(...arguments);
        this._stores = [];
        this._onDidRemoveCapabilityType = this._register(new Emitter());
        this.onDidRemoveCapabilityType = this._onDidRemoveCapabilityType.event;
        this._onDidAddCapabilityType = this._register(new Emitter());
        this.onDidAddCapabilityType = this._onDidAddCapabilityType.event;
        this._onDidRemoveCapability = this._register(new Emitter());
        this.onDidRemoveCapability = this._onDidRemoveCapability.event;
        this._onDidAddCapability = this._register(new Emitter());
        this.onDidAddCapability = this._onDidAddCapability.event;
    }
    get items() {
        return this._items();
    }
    *_items() {
        for (const store of this._stores) {
            for (const c of store.items) {
                yield c;
            }
        }
    }
    has(capability) {
        for (const store of this._stores) {
            for (const c of store.items) {
                if (c === capability) {
                    return true;
                }
            }
        }
        return false;
    }
    get(capability) {
        for (const store of this._stores) {
            const c = store.get(capability);
            if (c) {
                return c;
            }
        }
        return undefined;
    }
    add(store) {
        this._stores.push(store);
        for (const capability of store.items) {
            this._onDidAddCapabilityType.fire(capability);
            this._onDidAddCapability.fire({ id: capability, capability: store.get(capability) });
        }
        this._register(store.onDidAddCapabilityType((e) => this._onDidAddCapabilityType.fire(e)));
        this._register(store.onDidAddCapability((e) => this._onDidAddCapability.fire(e)));
        this._register(store.onDidRemoveCapabilityType((e) => this._onDidRemoveCapabilityType.fire(e)));
        this._register(store.onDidRemoveCapability((e) => this._onDidRemoveCapability.fire(e)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDYXBhYmlsaXR5U3RvcmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9jYXBhYmlsaXRpZXMvdGVybWluYWxDYXBhYmlsaXR5U3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVFqRSxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJQUF2RDs7UUFDUyxTQUFJLEdBQTBELElBQUksR0FBRyxFQUFFLENBQUE7UUFFOUQsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBc0IsQ0FBQyxDQUFBO1FBQ3RGLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUE7UUFDekQsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBc0IsQ0FBQyxDQUFBO1FBQ25GLDJCQUFzQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUE7UUFFbkQsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkQsSUFBSSxPQUFPLEVBQXNDLENBQ2pELENBQUE7UUFDUSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBQ2pELHdCQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3BELElBQUksT0FBTyxFQUFzQyxDQUNqRCxDQUFBO1FBQ1EsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtJQThCN0QsQ0FBQztJQTVCQSxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FB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