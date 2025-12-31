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
import { autorunWithStore } from '../../../base/common/observable.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
export function hotClassGetOriginalInstance(value) {
    if (value instanceof BaseClass) {
        return value._instance;
    }
    return value;
}
/**
 * Wrap a class in a reloadable wrapper.
 * When the wrapper is created, the original class is created.
 * When the original class changes, the instance is re-created.
 */
export function wrapInHotClass0(clazz) {
    return !isHotReloadEnabled() ? clazz.get() : createWrapper(clazz, BaseClass0);
}
class BaseClass {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    init(...params) { }
}
function createWrapper(clazz, B) {
    return class ReloadableWrapper extends B {
        constructor() {
            super(...arguments);
            this._autorun = undefined;
        }
        init(...params) {
            this._autorun = autorunWithStore((reader, store) => {
                const clazz_ = clazz.read(reader);
                this._instance = store.add(this.instantiationService.createInstance(clazz_, ...params));
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
export function wrapInHotClass1(clazz) {
    return !isHotReloadEnabled() ? clazz.get() : createWrapper(clazz, BaseClass1);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3JhcEluSG90Q2xhc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vYnNlcnZhYmxlL2NvbW1vbi93cmFwSW5Ib3RDbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQWUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRixPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFbkcsTUFBTSxVQUFVLDJCQUEyQixDQUFJLEtBQVE7SUFDdEQsSUFBSSxLQUFLLFlBQVksU0FBUyxFQUFFLENBQUM7UUFDaEMsT0FBTyxLQUFLLENBQUMsU0FBZ0IsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQzlCLEtBQWlDO0lBRWpDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDOUUsQ0FBQztBQUlELE1BQU0sU0FBUztJQUdkLFlBQTRCLG9CQUEyQztRQUEzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBQUcsQ0FBQztJQUVwRSxJQUFJLENBQUMsR0FBRyxNQUFhLElBQVMsQ0FBQztDQUN0QztBQUVELFNBQVMsYUFBYSxDQUFrQixLQUF1QixFQUFFLENBQWdDO0lBQ2hHLE9BQU8sTUFBTSxpQkFBa0IsU0FBUSxDQUFDO1FBQWpDOztZQUNFLGFBQVEsR0FBNEIsU0FBUyxDQUFBO1FBY3RELENBQUM7UUFaUyxJQUFJLENBQUMsR0FBRyxNQUFhO1lBQzdCLElBQUksQ0FBQyxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ2xELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDekIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQWdCLENBQzFFLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPO1lBQ04sSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN6QixDQUFDO0tBQ00sQ0FBQTtBQUNULENBQUM7QUFFRCxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEsU0FBUztJQUNqQyxZQUFtQyxDQUF3QjtRQUMxRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDUixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDWixDQUFDO0NBQ0QsQ0FBQTtBQUxLLFVBQVU7SUFDRixXQUFBLHFCQUFxQixDQUFBO0dBRDdCLFVBQVUsQ0FLZjtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUM5QixLQUFpQztJQUVqQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0FBQzlFLENBQUM7QUFFRCxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEsU0FBUztJQUNqQyxZQUFZLE1BQVcsRUFBeUIsQ0FBd0I7UUFDdkUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ1IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDO0NBQ0QsQ0FBQTtBQUxLLFVBQVU7SUFDVyxXQUFBLHFCQUFxQixDQUFBO0dBRDFDLFVBQVUsQ0FLZiJ9