var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isHotReloadEnabled } from '../../../base/common/hotReload.js';
import { readHotReloadableExport } from '../../../base/common/hotReloadHelpers.js';
import { autorunWithStore } from '../../../base/common/observable.js';
import { IInstantiationService, } from '../../instantiation/common/instantiation.js';
/**
 * Wrap a class in a reloadable wrapper.
 * When the wrapper is created, the original class is created.
 * When the original class changes, the instance is re-created.
 */
export function wrapInReloadableClass0(getClass) {
    return !isHotReloadEnabled() ? getClass() : createWrapper(getClass, BaseClass0);
}
class BaseClass {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    init(...params) { }
}
function createWrapper(getClass, B) {
    return class ReloadableWrapper extends B {
        constructor() {
            super(...arguments);
            this._autorun = undefined;
        }
        init(...params) {
            this._autorun = autorunWithStore((reader, store) => {
                const clazz = readHotReloadableExport(getClass(), reader);
                store.add(this.instantiationService.createInstance(clazz, ...params));
            });
        }
        dispose() {
            this._autorun?.dispose();
        }
    };
}
let BaseClass0 = class BaseClass0 extends BaseClass {
    constructor(i) {
        super(i);
        this.init();
    }
};
BaseClass0 = __decorate([
    __param(0, IInstantiationService)
], BaseClass0);
/**
 * Wrap a class in a reloadable wrapper.
 * When the wrapper is created, the original class is created.
 * When the original class changes, the instance is re-created.
 */
export function wrapInReloadableClass1(getClass) {
    return !isHotReloadEnabled() ? getClass() : createWrapper(getClass, BaseClass1);
}
let BaseClass1 = class BaseClass1 extends BaseClass {
    constructor(param1, i) {
        super(i);
        this.init(param1);
    }
};
BaseClass1 = __decorate([
    __param(1, IInstantiationService)
], BaseClass1);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3JhcEluUmVsb2FkYWJsZUNsYXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vYnNlcnZhYmxlL2NvbW1vbi93cmFwSW5SZWxvYWRhYmxlQ2xhc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUdOLHFCQUFxQixHQUNyQixNQUFNLDZDQUE2QyxDQUFBO0FBRXBEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsc0JBQXNCLENBQ3JDLFFBQTZCO0lBRTdCLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUNoRixDQUFDO0FBSUQsTUFBTSxTQUFTO0lBQ2QsWUFBNEIsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFBRyxDQUFDO0lBRXBFLElBQUksQ0FBQyxHQUFHLE1BQWEsSUFBUyxDQUFDO0NBQ3RDO0FBRUQsU0FBUyxhQUFhLENBQWtCLFFBQW1CLEVBQUUsQ0FBZ0M7SUFDNUYsT0FBTyxNQUFNLGlCQUFrQixTQUFRLENBQUM7UUFBakM7O1lBQ0UsYUFBUSxHQUE0QixTQUFTLENBQUE7UUFZdEQsQ0FBQztRQVZTLElBQUksQ0FBQyxHQUFHLE1BQWE7WUFDN0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDbEQsTUFBTSxLQUFLLEdBQUcsdUJBQXVCLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQ3pELEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxLQUFZLEVBQUUsR0FBRyxNQUFNLENBQWdCLENBQUMsQ0FBQTtZQUM1RixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPO1lBQ04sSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN6QixDQUFDO0tBQ00sQ0FBQTtBQUNULENBQUM7QUFFRCxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEsU0FBUztJQUNqQyxZQUFtQyxDQUF3QjtRQUMxRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDUixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDWixDQUFDO0NBQ0QsQ0FBQTtBQUxLLFVBQVU7SUFDRixXQUFBLHFCQUFxQixDQUFBO0dBRDdCLFVBQVUsQ0FLZjtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsc0JBQXNCLENBQ3JDLFFBQTZCO0lBRTdCLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBRSxRQUFRLEVBQVUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUN6RixDQUFDO0FBRUQsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLFNBQVM7SUFDakMsWUFBWSxNQUFXLEVBQXlCLENBQXdCO1FBQ3ZFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEIsQ0FBQztDQUNELENBQUE7QUFMSyxVQUFVO0lBQ1csV0FBQSxxQkFBcUIsQ0FBQTtHQUQxQyxVQUFVLENBS2YifQ==