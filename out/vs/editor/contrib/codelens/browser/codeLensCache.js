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
import { Event } from '../../../../base/common/event.js';
import { LRUCache } from '../../../../base/common/map.js';
import { Range } from '../../../common/core/range.js';
import { CodeLensModel } from './codelens.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, WillSaveStateReason, } from '../../../../platform/storage/common/storage.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { runWhenWindowIdle } from '../../../../base/browser/dom.js';
export const ICodeLensCache = createDecorator('ICodeLensCache');
class CacheItem {
    constructor(lineCount, data) {
        this.lineCount = lineCount;
        this.data = data;
    }
}
let CodeLensCache = class CodeLensCache {
    constructor(storageService) {
        this._fakeProvider = new (class {
            provideCodeLenses() {
                throw new Error('not supported');
            }
        })();
        this._cache = new LRUCache(20, 0.75);
        // remove old data
        const oldkey = 'codelens/cache';
        runWhenWindowIdle(mainWindow, () => storageService.remove(oldkey, 1 /* StorageScope.WORKSPACE */));
        // restore lens data on start
        const key = 'codelens/cache2';
        const raw = storageService.get(key, 1 /* StorageScope.WORKSPACE */, '{}');
        this._deserialize(raw);
        // store lens data on shutdown
        const onWillSaveStateBecauseOfShutdown = Event.filter(storageService.onWillSaveState, (e) => e.reason === WillSaveStateReason.SHUTDOWN);
        Event.once(onWillSaveStateBecauseOfShutdown)((e) => {
            storageService.store(key, this._serialize(), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        });
    }
    put(model, data) {
        // create a copy of the model that is without command-ids
        // but with comand-labels
        const copyItems = data.lenses.map((item) => {
            return {
                range: item.symbol.range,
                command: item.symbol.command && { id: '', title: item.symbol.command?.title },
            };
        });
        const copyModel = new CodeLensModel();
        copyModel.add({ lenses: copyItems }, this._fakeProvider);
        const item = new CacheItem(model.getLineCount(), copyModel);
        this._cache.set(model.uri.toString(), item);
    }
    get(model) {
        const item = this._cache.get(model.uri.toString());
        return item && item.lineCount === model.getLineCount() ? item.data : undefined;
    }
    delete(model) {
        this._cache.delete(model.uri.toString());
    }
    // --- persistence
    _serialize() {
        const data = Object.create(null);
        for (const [key, value] of this._cache) {
            const lines = new Set();
            for (const d of value.data.lenses) {
                lines.add(d.symbol.range.startLineNumber);
            }
            data[key] = {
                lineCount: value.lineCount,
                lines: [...lines.values()],
            };
        }
        return JSON.stringify(data);
    }
    _deserialize(raw) {
        try {
            const data = JSON.parse(raw);
            for (const key in data) {
                const element = data[key];
                const lenses = [];
                for (const line of element.lines) {
                    lenses.push({ range: new Range(line, 1, line, 11) });
                }
                const model = new CodeLensModel();
                model.add({ lenses }, this._fakeProvider);
                this._cache.set(key, new CacheItem(element.lineCount, model));
            }
        }
        catch {
            // ignore...
        }
    }
};
CodeLensCache = __decorate([
    __param(0, IStorageService)
], CodeLensCache);
export { CodeLensCache };
registerSingleton(ICodeLensCache, CodeLensCache, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUxlbnNDYWNoZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZWxlbnMvYnJvd3Nlci9jb2RlTGVuc0NhY2hlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDN0MsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxFQUdmLG1CQUFtQixHQUNuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVuRSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFpQixnQkFBZ0IsQ0FBQyxDQUFBO0FBYy9FLE1BQU0sU0FBUztJQUNkLFlBQ1UsU0FBaUIsRUFDakIsSUFBbUI7UUFEbkIsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixTQUFJLEdBQUosSUFBSSxDQUFlO0lBQzFCLENBQUM7Q0FDSjtBQUVNLElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWE7SUFXekIsWUFBNkIsY0FBK0I7UUFSM0Msa0JBQWEsR0FBRyxJQUFJLENBQUM7WUFDckMsaUJBQWlCO2dCQUNoQixNQUFNLElBQUksS0FB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