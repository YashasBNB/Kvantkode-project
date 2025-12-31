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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4Y2x1c2lvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0RXhjbHVzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFHdkMsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7SUFtQjdDLFlBQTZCLGNBQWdEO1FBQzVFLEtBQUssRUFBRSxDQUFBO1FBRHNDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQWxCNUQsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3pDLHNCQUFzQixDQUFDLE1BQU0sQ0FDNUIsSUFBSSxXQUFXLENBQ2Q7WUFDQyxHQUFHLEVBQUUsbUJBQW1CO1lBQ3hCLEtBQUssZ0NBQXdCO1lBQzdCLE1BQU0sK0JBQXVCO1lBQzdCLGFBQWEsRUFBRTtnQkFDZCxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDeEM7U0FDRCxFQUNELElBQUksQ0FBQyxjQUFjLENBQ25CLEVBQ0QsSUFBSSxHQUFHLEVBQUUsQ0FDVCxDQUNELENBQUE7UUFNRDs7V0FFRztRQUNhLDRCQUF1QixHQUFtQixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQTtJQUxuRixDQUFDO0lBT0Q7O09BRUc7SUFDSCxJQUFXLE1BQU07UUFDaEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsR0FBRztRQUNiLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7SUFDM0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLElBQXNCLEVBQUUsT0FBaUI7UUFDdEQsSUFBSSxPQUFPLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQzVCLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUNsRSxDQUFBO1FBQ0YsQ0FBQzthQUFNLElBQUksT0FBTyxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0UsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RSxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksUUFBUSxDQUFDLElBQXNCO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSztRQUNYLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7SUFDaEMsQ0FBQztDQUNELENBQUE7QUFwRVksY0FBYztJQW1CYixXQUFBLGVBQWUsQ0FBQTtHQW5CaEIsY0FBYyxDQW9FMUIifQ==