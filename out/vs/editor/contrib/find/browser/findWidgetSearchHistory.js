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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFdpZGdldFNlYXJjaEhpc3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvYnJvd3Nlci9maW5kV2lkZ2V0U2VhcmNoSGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUVoRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1Qjs7YUFDWixxQkFBZ0IsR0FBRyx3QkFBd0IsQUFBM0IsQ0FBMkI7YUFLbkQsY0FBUyxHQUFtQyxJQUFJLEFBQXZDLENBQXVDO0lBRS9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBK0I7UUFDakQsSUFBSSxDQUFDLHlCQUF1QixDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLHlCQUF1QixDQUFDLFNBQVMsR0FBRyxJQUFJLHlCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2hGLENBQUM7UUFDRCxPQUFPLHlCQUF1QixDQUFDLFNBQVMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsWUFBNkIsY0FBZ0Q7UUFBL0IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBYnJFLG1CQUFjLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUE7UUFjOUMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksT0FBTyxFQUFZLENBQUE7UUFDbEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBQ2pELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNaLENBQUM7SUFFRCxNQUFNLENBQUMsQ0FBUztRQUNmLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNYLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFTO1FBQ1osSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ1gsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsR0FBRyxDQUFDLENBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUMzQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDWixDQUFDO0lBRUQsT0FBTyxDQUNOLFVBQXFFLEVBQ3JFLE9BQWE7UUFFYiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ1gsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBQ0QsT0FBTyxDQUFFLENBQVc7UUFDbkIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDWixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksTUFBc0IsQ0FBQTtRQUMxQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDbEMseUJBQXVCLENBQUMsZ0JBQWdCLGlDQUV4QyxDQUFBO1FBRUQsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULElBQUksQ0FBQztnQkFDSixNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN6QixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixlQUFlO1lBQ2hCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELGtCQUFrQjtJQUNsQixJQUFJO1FBQ0gsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFBO1FBQzdCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3BDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4Qix5QkFBdUIsQ0FBQyxnQkFBZ0IsRUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsNkRBR3hCLENBQUE7WUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZDLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDOztBQXZGVyx1QkFBdUI7SUFldEIsV0FBQSxlQUFlLENBQUE7R0FmaEIsdUJBQXVCLENBd0ZuQyJ9