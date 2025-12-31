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
import { ArrayQueue, CompareResult } from '../../../../base/common/arrays.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorunOpts } from '../../../../base/common/observable.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
export function setStyle(element, style) {
    Object.entries(style).forEach(([key, value]) => {
        element.style.setProperty(key, toSize(value));
    });
}
function toSize(value) {
    return typeof value === 'number' ? `${value}px` : value;
}
export function applyObservableDecorations(editor, decorations) {
    const d = new DisposableStore();
    let decorationIds = [];
    d.add(autorunOpts({ debugName: () => `Apply decorations from ${decorations.debugName}` }, (reader) => {
        const d = decorations.read(reader);
        editor.changeDecorations((a) => {
            decorationIds = a.deltaDecorations(decorationIds, d);
        });
    }));
    d.add({
        dispose: () => {
            editor.changeDecorations((a) => {
                decorationIds = a.deltaDecorations(decorationIds, []);
            });
        },
    });
    return d;
}
export function* leftJoin(left, right, compare) {
    const rightQueue = new ArrayQueue(right);
    for (const leftElement of left) {
        rightQueue.takeWhile((rightElement) => CompareResult.isGreaterThan(compare(leftElement, rightElement)));
        const equals = rightQueue.takeWhile((rightElement) => CompareResult.isNeitherLessOrGreaterThan(compare(leftElement, rightElement)));
        yield { left: leftElement, rights: equals || [] };
    }
}
export function* join(left, right, compare) {
    const rightQueue = new ArrayQueue(right);
    for (const leftElement of left) {
        const skipped = rightQueue.takeWhile((rightElement) => CompareResult.isGreaterThan(compare(leftElement, rightElement)));
        if (skipped) {
            yield { rights: skipped };
        }
        const equals = rightQueue.takeWhile((rightElement) => CompareResult.isNeitherLessOrGreaterThan(compare(leftElement, rightElement)));
        yield { left: leftElement, rights: equals || [] };
    }
}
export function concatArrays(...arrays) {
    return [].concat(...arrays);
}
export function elementAtOrUndefined(arr, index) {
    return arr[index];
}
export function setFields(obj, fields) {
    return Object.assign(obj, fields);
}
export function deepMerge(source1, source2) {
    const result = {};
    for (const key in source1) {
        result[key] = source1[key];
    }
    for (const key in source2) {
        const source2Value = source2[key];
        if (typeof result[key] === 'object' && source2Value && typeof source2Value === 'object') {
            result[key] = deepMerge(result[key], source2Value);
        }
        else {
            result[key] = source2Value;
        }
    }
    return result;
}
let PersistentStore = class PersistentStore {
    constructor(key, storageService) {
        this.key = key;
        this.storageService = storageService;
        this.hasValue = false;
        this.value = undefined;
    }
    get() {
        if (!this.hasValue) {
            const value = this.storageService.get(this.key, 0 /* StorageScope.PROFILE */);
            if (value !== undefined) {
                try {
                    this.value = JSON.parse(value);
                }
                catch (e) {
                    onUnexpectedError(e);
                }
            }
            this.hasValue = true;
        }
        return this.value;
    }
    set(newValue) {
        this.value = newValue;
        this.storageService.store(this.key, JSON.stringify(this.value), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
PersistentStore = __decorate([
    __param(1, IStorageService)
], PersistentStore);
export { PersistentStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBZSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUdoRixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsTUFBTSxVQUFVLFFBQVEsQ0FDdkIsT0FBb0IsRUFDcEIsS0FLQztJQUVELE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtRQUM5QyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDOUMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsS0FBc0I7SUFDckMsT0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtBQUN4RCxDQUFDO0FBRUQsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxNQUF3QixFQUN4QixXQUFpRDtJQUVqRCxNQUFNLENBQUMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQy9CLElBQUksYUFBYSxHQUFh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