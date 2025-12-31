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
import { doHash } from '../../../base/common/hash.js';
import { LRUCache } from '../../../base/common/map.js';
import { clamp, MovingAverage, SlidingWindowAverage } from '../../../base/common/numbers.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { matchesScheme } from '../../../base/common/network.js';
export const ILanguageFeatureDebounceService = createDecorator('ILanguageFeatureDebounceService');
var IdentityHash;
(function (IdentityHash) {
    const _hashes = new WeakMap();
    let pool = 0;
    function of(obj) {
        let value = _hashes.get(obj);
        if (value === undefined) {
            value = ++pool;
            _hashes.set(obj, value);
        }
        return value;
    }
    IdentityHash.of = of;
})(IdentityHash || (IdentityHash = {}));
class NullDebounceInformation {
    constructor(_default) {
        this._default = _default;
    }
    get(_model) {
        return this._default;
    }
    update(_model, _value) {
        return this._default;
    }
    default() {
        return this._default;
    }
}
class FeatureDebounceInformation {
    constructor(_logService, _name, _registry, _default, _min, _max) {
        this._logService = _logService;
        this._name = _name;
        this._registry = _registry;
        this._default = _default;
        this._min = _min;
        this._max = _max;
        this._cache = new LRUCache(50, 0.7);
    }
    _key(model) {
        return (model.id +
            this._registry.all(model).reduce((hashVal, obj) => doHash(IdentityHash.of(obj), hashVal), 0));
    }
    get(model) {
        const key = this._key(model);
        const avg = this._cache.get(key);
        return avg ? clamp(avg.value, this._min, this._max) : this.default();
    }
    update(model, value) {
        const key = this._key(model);
        let avg = this._cache.get(key);
        if (!avg) {
            avg = new SlidingWindowAverage(6);
            this._cache.set(key, avg);
        }
        const newValue = clamp(avg.update(value), this._min, this._max);
        if (!matchesScheme(model.uri, 'output')) {
            this._logService.trace(`[DEBOUNCE: ${this._name}] for ${model.uri.toString()} is ${newValue}ms`);
        }
        return newValue;
    }
    _overall() {
        const result = new MovingAverage();
        for (const [, avg] of this._cache) {
            result.update(avg.value);
        }
        return result.value;
    }
    default() {
        const value = this._overall() | 0 || this._default;
        return clamp(value, this._min, this._max);
    }
}
let LanguageFeatureDebounceService = class LanguageFeatureDebounceService {
    constructor(_logService, envService) {
        this._logService = _logService;
        this._data = new Map();
        this._isDev = envService.isExtensionDevelopment || !envService.isBuilt;
    }
    for(feature, name, config) {
        const min = config?.min ?? 50;
        const max = config?.max ?? min ** 2;
        const extra = config?.key ?? undefined;
        const key = `${IdentityHash.of(feature)},${min}${extra ? ',' + extra : ''}`;
        let info = this._data.get(key);
        if (!info) {
            if (this._isDev) {
                this._logService.debug(`[DEBOUNCE: ${name}] is disabled in developed mode`);
                info = new NullDebounceInformation(min * 1.5);
            }
            else {
                info = new FeatureDebounceInformation(this._logService, name, feature, this._overallAverage() | 0 || min * 1.5, // default is overall default or derived from min-value
                min, max);
            }
            this._data.set(key, info);
        }
        return info;
    }
    _overallAverage() {
        // Average of all language features. Not a great value but an approximation
        const result = new MovingAverage();
        for (const info of this._data.values()) {
            result.update(info.default());
        }
        return result.value;
    }
};
LanguageFeatureDebounceService = __decorate([
    __param(0, ILogService),
    __param(1, IEnvironmentService)
], LanguageFeatureDebounceService);
export { LanguageFeatureDebounceService };
registerSingleton(ILanguageFeatureDebounceService, LanguageFeatureDebounceService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VGZWF0dXJlRGVib3VuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL2xhbmd1YWdlRmVhdHVyZURlYm91bmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUc1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFL0QsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsZUFBZSxDQUM3RCxpQ0FBaUMsQ0FDakMsQ0FBQTtBQWtCRCxJQUFVLFlBQVksQ0FXckI7QUFYRCxXQUFVLFlBQVk7SUFDckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUE7SUFDN0MsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQ1osU0FBZ0IsRUFBRSxDQUFDLEdBQVc7UUFDN0IsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM1QixJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QixLQUFLLEdBQUcs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