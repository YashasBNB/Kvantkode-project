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
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { MutableObservableValue } from './observableValue.js';
import { StoredValue } from './storedValue.js';
let TestExclusions = class TestExclusions extends Disposable {
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this.excluded = this._register(MutableObservableValue.stored(new StoredValue({
            key: 'excludedTestItems',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
            serialization: {
                deserialize: (v) => new Set(JSON.parse(v)),
                serialize: (v) => JSON.stringify([...v]),
            },
        }, this.storageService), new Set()));
        /**
         * Event that fires when the excluded tests change.
         */
        this.onTestExclusionsChanged = this.excluded.onDidChange;
    }
    /**
     * Gets whether there's any excluded tests.
     */
    get hasAny() {
        return this.excluded.value.size > 0;
    }
    /**
     * Gets all excluded tests.
     */
    get all() {
        return this.excluded.value;
    }
    /**
     * Sets whether a test is excluded.
     */
    toggle(test, exclude) {
        if (exclude !== true && this.excluded.value.has(test.item.extId)) {
            this.excluded.value = new Set(Iterable.filter(this.excluded.value, (e) => e !== test.item.extId));
        }
        else if (exclude !== false && !this.excluded.value.has(test.item.extId)) {
            this.excluded.value = new Set([...this.excluded.value, test.item.extId]);
        }
    }
    /**
     * Gets whether a test is excluded.
     */
    contains(test) {
        return this.excluded.value.has(test.item.extId);
    }
    /**
     * Removes all test exclusions.
     */
    clear() {
        this.excluded.value = new Set();
    }
};
TestExclusions = __decorate([
    __param(0, IStorageService)
], TestExclusions);
export { TestExclusions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4Y2x1c2lvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RFeGNsdXNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUd2QyxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsVUFBVTtJQW1CN0MsWUFBNkIsY0FBZ0Q7UUFDNUUsS0FBSyxFQUFFLENBQUE7UUFEc0MsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBbEI1RCxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDekMsc0JBQXNCLENBQUMsTUFBTSxDQUM1QixJQUFJLFdBQVcsQ0FDZDtZQUNDLEdBQUcsRUFBRSxtQkFBbUI7WUFDeEIsS0FBSyxnQ0FBd0I7WUFDN0IsTUFBTSwrQkFBdUI7WUFDN0IsYUFBYSxFQUFFO2dCQUNkLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUN4QztTQUNELEVBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FDbkIsRUFDRCxJQUFJLEdBQUcsRUFBRSxDQUNULENBQ0QsQ0FBQTtRQU1EOztXQUVHO1FBQ2EsNEJBQXVCLEdBQW1CLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFBO0lBTG5GLENBQUM7SUFPRDs7T0FFRztJQUNILElBQVcsTUFBTTtRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxHQUFHO1FBQ2IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtJQUMzQixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsSUFBc0IsRUFBRSxPQUFpQjtRQUN0RCxJQUFJLE9BQU8sS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FDNUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQ2xFLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxPQUFPLEtBQUssS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxRQUFRLENBQUMsSUFBc0I7UUFDckMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0NBQ0QsQ0FBQTtBQXBFWSxjQUFjO0lBbUJiLFdBQUEsZUFBZSxDQUFBO0dBbkJoQixjQUFjLENBb0UxQiJ9