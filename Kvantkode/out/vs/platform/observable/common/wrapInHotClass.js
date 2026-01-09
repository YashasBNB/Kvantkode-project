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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3JhcEluSG90Q2xhc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL29ic2VydmFibGUvY29tbW9uL3dyYXBJbkhvdENsYXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBZSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xGLE9BQU8sRUFBa0IscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVuRyxNQUFNLFVBQVUsMkJBQTJCLENBQUksS0FBUTtJQUN0RCxJQUFJLEtBQUssWUFBWSxTQUFTLEVBQUUsQ0FBQztRQUNoQyxPQUFPLEtBQUssQ0FBQyxTQUFnQixDQUFBO0lBQzlCLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FDOUIsS0FBaUM7SUFFakMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUM5RSxDQUFDO0FBSUQsTUFBTSxTQUFTO0lBR2QsWUFBNEIsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFBRyxDQUFDO0lBRXBFLElBQUksQ0FBQyxHQUFHLE1BQWEsSUFBUyxDQUFDO0NBQ3RDO0FBRUQsU0FBUyxhQUFhLENBQWtCLEtBQXVCLEVBQUUsQ0FBZ0M7SUFDaEcsT0FBTyxNQUFNLGlCQUFrQixTQUFRLENBQUM7UUFBakM7O1lBQ0UsYUFBUSxHQUE0QixTQUFTLENBQUE7UUFjdEQsQ0FBQztRQVpTLElBQUksQ0FBQyxHQUFHLE1BQWE7WUFDN0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDbEQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUN6QixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBZ0IsQ0FDMUUsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE9BQU87WUFDTixJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ3pCLENBQUM7S0FDTSxDQUFBO0FBQ1QsQ0FBQztBQUVELElBQU0sVUFBVSxHQUFoQixNQUFNLFVBQVcsU0FBUSxTQUFTO0lBQ2pDLFlBQW1DLENBQXdCO1FBQzFELEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNSLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNaLENBQUM7Q0FDRCxDQUFBO0FBTEssVUFBVTtJQUNGLFdBQUEscUJBQXFCLENBQUE7R0FEN0IsVUFBVSxDQUtmO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQzlCLEtBQWlDO0lBRWpDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDOUUsQ0FBQztBQUVELElBQU0sVUFBVSxHQUFoQixNQUFNLFVBQVcsU0FBUSxTQUFTO0lBQ2pDLFlBQVksTUFBVyxFQUF5QixDQUF3QjtRQUN2RSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xCLENBQUM7Q0FDRCxDQUFBO0FBTEssVUFBVTtJQUNXLFdBQUEscUJBQXFCLENBQUE7R0FEMUMsVUFBVSxDQUtmIn0=