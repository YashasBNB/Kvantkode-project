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
var FindWidgetSearchHistory_1;
import { Emitter } from '../../../../base/common/event.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
let FindWidgetSearchHistory = class FindWidgetSearchHistory {
    static { FindWidgetSearchHistory_1 = this; }
    static { this.FIND_HISTORY_KEY = 'workbench.find.history'; }
    static { this._instance = null; }
    static getOrCreate(storageService) {
        if (!FindWidgetSearchHistory_1._instance) {
            FindWidgetSearchHistory_1._instance = new FindWidgetSearchHistory_1(storageService);
        }
        return FindWidgetSearchHistory_1._instance;
    }
    constructor(storageService) {
        this.storageService = storageService;
        this.inMemoryValues = new Set();
        this._onDidChangeEmitter = new Emitter();
        this.onDidChange = this._onDidChangeEmitter.event;
        this.load();
    }
    delete(t) {
        const result = this.inMemoryValues.delete(t);
        this.save();
        return result;
    }
    add(t) {
        this.inMemoryValues.add(t);
        this.save();
        return this;
    }
    has(t) {
        return this.inMemoryValues.has(t);
    }
    clear() {
        this.inMemoryValues.clear();
        this.save();
    }
    forEach(callbackfn, thisArg) {
        // fetch latest from storage
        this.load();
        return this.inMemoryValues.forEach(callbackfn);
    }
    replace(t) {
        this.inMemoryValues = new Set(t);
        this.save();
    }
    load() {
        let result;
        const raw = this.storageService.get(FindWidgetSearchHistory_1.FIND_HISTORY_KEY, 1 /* StorageScope.WORKSPACE */);
        if (raw) {
            try {
                result = JSON.parse(raw);
            }
            catch (e) {
                // Invalid data
            }
        }
        this.inMemoryValues = new Set(result || []);
    }
    // Run saves async
    save() {
        const elements = [];
        this.inMemoryValues.forEach((e) => elements.push(e));
        return new Promise((resolve) => {
            this.storageService.store(FindWidgetSearchHistory_1.FIND_HISTORY_KEY, JSON.stringify(elements), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
            this._onDidChangeEmitter.fire(elements);
            resolve();
        });
    }
};
FindWidgetSearchHistory = FindWidgetSearchHistory_1 = __decorate([
    __param(0, IStorageService)
], FindWidgetSearchHistory);
export { FindWidgetSearchHistory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFdpZGdldFNlYXJjaEhpc3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL2Jyb3dzZXIvZmluZFdpZGdldFNlYXJjaEhpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFaEQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7O2FBQ1oscUJBQWdCLEdBQUcsd0JBQXdCLEFBQTNCLENBQTJCO2FBS25ELGNBQVMsR0FBbUMsSUFBSSxBQUF2QyxDQUF1QztJQUUvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQStCO1FBQ2pELElBQUksQ0FBQyx5QkFBdUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4Qyx5QkFBdUIsQ0FBQyxTQUFTLEdBQUcsSUFBSSx5QkFBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNoRixDQUFDO1FBQ0QsT0FBTyx5QkFBdUIsQ0FBQyxTQUFTLENBQUE7SUFDekMsQ0FBQztJQUVELFlBQTZCLGNBQWdEO1FBQS9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQWJyRSxtQkFBYyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBYzlDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFBO1FBQ2xELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQUNqRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDWixDQUFDO0lBRUQsTUFBTSxDQUFDLENBQVM7UUFDZixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDWCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBUztRQUNaLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNYLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sQ0FDTixVQUFxRSxFQUNyRSxPQUFhO1FBRWIsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNYLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUNELE9BQU8sQ0FBRSxDQUFXO1FBQ25CLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQUk7UUFDSCxJQUFJLE1BQXNCLENBQUE7UUFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ2xDLHlCQUF1QixDQUFDLGdCQUFnQixpQ0FFeEMsQ0FBQTtRQUVELElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDekIsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osZUFBZTtZQUNoQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxrQkFBa0I7SUFDbEIsSUFBSTtRQUNILE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQTtRQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIseUJBQXVCLENBQUMsZ0JBQWdCLEVBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLDZEQUd4QixDQUFBO1lBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN2QyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQzs7QUF2RlcsdUJBQXVCO0lBZXRCLFdBQUEsZUFBZSxDQUFBO0dBZmhCLHVCQUF1QixDQXdGbkMifQ==