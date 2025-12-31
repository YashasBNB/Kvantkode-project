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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3JhcEluUmVsb2FkYWJsZUNsYXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vb2JzZXJ2YWJsZS9jb21tb24vd3JhcEluUmVsb2FkYWJsZUNsYXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFHTixxQkFBcUIsR0FDckIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxRQUE2QjtJQUU3QixPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDaEYsQ0FBQztBQUlELE1BQU0sU0FBUztJQUNkLFlBQTRCLG9CQUEyQztRQUEzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBQUcsQ0FBQztJQUVwRSxJQUFJLENBQUMsR0FBRyxNQUFhLElBQVMsQ0FBQztDQUN0QztBQUVELFNBQVMsYUFBYSxDQUFrQixRQUFtQixFQUFFLENBQWdDO0lBQzVGLE9BQU8sTUFBTSxpQkFBa0IsU0FBUSxDQUFDO1FBQWpDOztZQUNFLGFBQVEsR0FBNEIsU0FBUyxDQUFBO1FBWXRELENBQUM7UUFWUyxJQUFJLENBQUMsR0FBRyxNQUFhO1lBQzdCLElBQUksQ0FBQyxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ2xELE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUN6RCxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsS0FBWSxFQUFFLEdBQUcsTUFBTSxDQUFnQixDQUFDLENBQUE7WUFDNUYsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDekIsQ0FBQztLQUNNLENBQUE7QUFDVCxDQUFDO0FBRUQsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLFNBQVM7SUFDakMsWUFBbUMsQ0FBd0I7UUFDMUQsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ1IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ1osQ0FBQztDQUNELENBQUE7QUFMSyxVQUFVO0lBQ0YsV0FBQSxxQkFBcUIsQ0FBQTtHQUQ3QixVQUFVLENBS2Y7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxRQUE2QjtJQUU3QixPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUUsUUFBUSxFQUFVLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDekYsQ0FBQztBQUVELElBQU0sVUFBVSxHQUFoQixNQUFNLFVBQVcsU0FBUSxTQUFTO0lBQ2pDLFlBQVksTUFBVyxFQUF5QixDQUF3QjtRQUN2RSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xCLENBQUM7Q0FDRCxDQUFBO0FBTEssVUFBVTtJQUNXLFdBQUEscUJBQXFCLENBQUE7R0FEMUMsVUFBVSxDQUtmIn0=