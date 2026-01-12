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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFlLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBR2hGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxNQUFNLFVBQVUsUUFBUSxDQUN2QixPQUFvQixFQUNwQixLQUtDO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFO1FBQzlDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxLQUFzQjtJQUNyQyxPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0FBQ3hELENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQ3pDLE1BQXdCLEVBQ3hCLFdBQWlEO0lBRWpELE1BQU0sQ0FBQyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDL0IsSUFBSSxhQUFh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