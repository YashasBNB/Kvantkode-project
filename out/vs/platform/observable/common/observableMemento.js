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
import { strictEquals } from '../../../base/common/equals.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ObservableValue } from '../../../base/common/observableInternal/base.js';
import { DebugNameData } from '../../../base/common/observableInternal/debugName.js';
import { IStorageService } from '../../storage/common/storage.js';
/**
 * Defines an observable memento. Returns a function that can be called with
 * the specific storage scope, target, and service to use in a class.
 *
 * Note that the returned Observable is a disposable, because it interacts
 * with storage service events, and must be tracked appropriately.
 */
export function observableMemento(opts) {
    return (scope, target, storageService) => {
        return new ObservableMemento(opts, scope, target, storageService);
    };
}
/**
 * A value that is stored, and is also observable. Note: T should be readonly.
 */
let ObservableMemento = class ObservableMemento extends ObservableValue {
    constructor(opts, storageScope, storageTarget, storageService) {
        if (opts.defaultValue && typeof opts.defaultValue === 'object') {
            opts.toStorage ??= (value) => JSON.stringify(value);
            opts.fromStorage ??= (value) => JSON.parse(value);
        }
        let initialValue = opts.defaultValue;
        const fromStorage = storageService.get(opts.key, storageScope);
        if (fromStorage !== undefined) {
            if (opts.fromStorage) {
                try {
                    initialValue = opts.fromStorage(fromStorage);
                }
                catch {
                    initialValue = opts.defaultValue;
                }
            }
        }
        super(new DebugNameData(undefined, `storage/${opts.key}`, undefined), initialValue, strictEquals);
        this._store = new DisposableStore();
        this._didChange = false;
        const didChange = storageService.onDidChangeValue(storageScope, opts.key, this._store);
        // only take external changes if there aren't local changes we've made
        this._store.add(didChange((e) => {
            if (e.external && e.key === opts.key && !this._didChange) {
                this.set(opts.defaultValue, undefined);
            }
        }));
        this._store.add(storageService.onWillSaveState(() => {
            if (this._didChange) {
                this._didChange = false;
                const value = this.get();
                if (opts.toStorage) {
                    storageService.store(opts.key, opts.toStorage(value), storageScope, storageTarget);
                }
                else {
                    storageService.store(opts.key, String(value), storageScope, storageTarget);
                }
            }
        }));
    }
    _setValue(newValue) {
        super._setValue(newValue);
        this._didChange = true;
    }
    dispose() {
        this._store.dispose();
    }
};
ObservableMemento = __decorate([
    __param(3, IStorageService)
], ObservableMemento);
export { ObservableMemento };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZU1lbWVudG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL29ic2VydmFibGUvY29tbW9uL29ic2VydmFibGVNZW1lbnRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGlDQUFpQyxDQUFBO0FBVTlGOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBSSxJQUErQjtJQUNuRSxPQUFPLENBQ04sS0FBbUIsRUFDbkIsTUFBcUIsRUFDckIsY0FBK0IsRUFDUixFQUFFO1FBQ3pCLE9BQU8sSUFBSSxpQkFBaUIsQ0FBSSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNyRSxDQUFDLENBQUE7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFxQixTQUFRLGVBQWtCO0lBSTNELFlBQ0MsSUFBK0IsRUFDL0IsWUFBMEIsRUFDMUIsYUFBNEIsRUFDWCxjQUErQjtRQUVoRCxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksT0FBTyxJQUFJLENBQUMsWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hFLElBQUksQ0FBQyxTQUFTLEtBQUssQ0FBQyxLQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxT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