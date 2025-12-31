/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
const defaultSerialization = {
    deserialize: (d) => JSON.parse(d),
    serialize: (d) => JSON.stringify(d),
};
/**
 * todo@connor4312: is this worthy to be in common?
 */
let StoredValue = class StoredValue extends Disposable {
    constructor(options, storage) {
        super();
        this.storage = storage;
        this.key = options.key;
        this.scope = options.scope;
        this.target = options.target;
        this.serialization = options.serialization ?? defaultSerialization;
        this.onDidChange = this.storage.onDidChangeValue(this.scope, this.key, this._store);
    }
    get(defaultValue) {
        if (this.value === undefined) {
            const value = this.storage.get(this.key, this.scope);
            this.value = value === undefined ? defaultValue : this.serialization.deserialize(value);
        }
        return this.value;
    }
    /**
     * Persists changes to the value.
     * @param value
     */
    store(value) {
        this.value = value;
        this.storage.store(this.key, this.serialization.serialize(value), this.scope, this.target);
    }
    /**
     * Delete an element stored under the provided key from storage.
     */
    delete() {
        this.storage.remove(this.key, this.scope);
    }
};
StoredValue = __decorate([
    __param(1, IStorageService)
], StoredValue);
export { StoredValue };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkVmFsdWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi9zdG9yZWRWYWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGVBQWUsR0FJZixNQUFNLGdEQUFnRCxDQUFBO0FBT3ZELE1BQU0sb0JBQW9CLEdBQW1DO0lBQzVELFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDakMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztDQUNuQyxDQUFBO0FBU0Q7O0dBRUc7QUFDSSxJQUFNLFdBQVcsR0FBakIsTUFBTSxXQUFlLFNBQVEsVUFBVTtJQVk3QyxZQUNDLE9BQStCLEVBQ0csT0FBd0I7UUFFMUQsS0FBSyxFQUFFLENBQUE7UUFGMkIsWUFBTyxHQUFQLE9BQU8sQ0FBaUI7UUFJMUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxJQUFJLG9CQUFvQixDQUFBO1FBQ2xFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFZTSxHQUFHLENBQUMsWUFBZ0I7UUFDMUIsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3BELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4RixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxLQUFLLENBQUMsS0FBUTtRQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU07UUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0NBQ0QsQ0FBQTtBQTNEWSxXQUFXO0lBY3JCLFdBQUEsZUFBZSxDQUFBO0dBZEwsV0FBVyxDQTJEdkIifQ==