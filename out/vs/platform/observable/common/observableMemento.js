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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZU1lbWVudG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vYnNlcnZhYmxlL2NvbW1vbi9vYnNlcnZhYmxlTWVtZW50by50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQVU5Rjs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQUksSUFBK0I7SUFDbkUsT0FBTyxDQUNOLEtBQW1CLEVBQ25CLE1BQXFCLEVBQ3JCLGNBQStCLEVBQ1IsRUFBRTtRQUN6QixPQUFPLElBQUksaUJBQWlCLENBQUksSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFBO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0ksSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBcUIsU0FBUSxlQUFrQjtJQUkzRCxZQUNDLElBQStCLEVBQy9CLFlBQTBCLEVBQzFCLGFBQTRCLEVBQ1gsY0FBK0I7UUFFaEQsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLE9BQU8sSUFBSSxDQUFDLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRSxJQUFJLENBQUMsU0FBUyxLQUFLLENBQUMsS0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFB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