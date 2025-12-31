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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUxlbnNDYWNoZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVsZW5zL2Jyb3dzZXIvY29kZUxlbnNDYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQzdDLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsRUFHZixtQkFBbUIsR0FDbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbkUsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsZ0JBQWdCLENBQUMsQ0FBQTtBQWMvRSxNQUFNLFNBQVM7SUFDZCxZQUNVLFNBQWlCLEVBQ2pCLElBQW1CO1FBRG5CLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsU0FBSSxHQUFKLElBQUksQ0FBZTtJQUMxQixDQUFDO0NBQ0o7QUFFTSxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFhO0lBV3pCLFlBQTZCLGNBQStCO1FBUjNDLGtCQUFhLEdBQUcsSUFBSSxDQUFDO1lBQ3JDLGlCQUFpQjtnQkFDaEIsTUFBTSxJQUFJLEtBQUssQ0FB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