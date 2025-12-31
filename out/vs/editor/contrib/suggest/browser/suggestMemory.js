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
var SuggestMemoryService_1;
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { CompletionItemKinds } from '../../../common/languages.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, WillSaveStateReason, } from '../../../../platform/storage/common/storage.js';
export class Memory {
    constructor(name) {
        this.name = name;
    }
    select(model, pos, items) {
        if (items.length === 0) {
            return 0;
        }
        const topScore = items[0].score[0];
        for (let i = 0; i < items.length; i++) {
            const { score, completion: suggestion } = items[i];
            if (score[0] !== topScore) {
                // stop when leaving the group of top matches
                break;
            }
            if (suggestion.preselect) {
                // stop when seeing an auto-select-item
                return i;
            }
        }
        return 0;
    }
}
export class NoMemory extends Memory {
    constructor() {
        super('first');
    }
    memorize(model, pos, item) {
        // no-op
    }
    toJSON() {
        return undefined;
    }
    fromJSON() {
        //
    }
}
export class LRUMemory extends Memory {
    constructor() {
        super('recentlyUsed');
        this._cache = new LRUCache(300, 0.66);
        this._seq = 0;
    }
    memorize(model, pos, item) {
        const key = `${model.getLanguageId()}/${item.textLabel}`;
        this._cache.set(key, {
            touch: this._seq++,
            type: item.completion.kind,
            insertText: item.completion.insertText,
        });
    }
    select(model, pos, items) {
        if (items.length === 0) {
            return 0;
        }
        const lineSuffix = model.getLineContent(pos.lineNumber).substr(pos.column - 10, pos.column - 1);
        if (/\s$/.test(lineSuffix)) {
            return super.select(model, pos, items);
        }
        const topScore = items[0].score[0];
        let indexPreselect = -1;
        let indexRecency = -1;
        let seq = -1;
        for (let i = 0; i < items.length; i++) {
            if (items[i].score[0] !== topScore) {
                // consider only top items
                break;
            }
            const key = `${model.getLanguageId()}/${items[i].textLabel}`;
            const item = this._cache.peek(key);
            if (item &&
                item.touch > seq &&
                item.type === items[i].completion.kind &&
                item.insertText === items[i].completion.insertText) {
                seq = item.touch;
                indexRecency = i;
            }
            if (items[i].completion.preselect && indexPreselect === -1) {
                // stop when seeing an auto-select-item
                return (indexPreselect = i);
            }
        }
        if (indexRecency !== -1) {
            return indexRecency;
        }
        else if (indexPreselect !== -1) {
            return indexPreselect;
        }
        else {
            return 0;
        }
    }
    toJSON() {
        return this._cache.toJSON();
    }
    fromJSON(data) {
        this._cache.clear();
        const seq = 0;
        for (const [key, value] of data) {
            value.touch = seq;
            value.type =
                typeof value.type === 'number' ? value.type : CompletionItemKinds.fromString(value.type);
            this._cache.set(key, value);
        }
        this._seq = this._cache.size;
    }
}
export class PrefixMemory extends Memory {
    constructor() {
        super('recentlyUsedByPrefix');
        this._trie = TernarySearchTree.forStrings();
        this._seq = 0;
    }
    memorize(model, pos, item) {
        const { word } = model.getWordUntilPosition(pos);
        const key = `${model.getLanguageId()}/${word}`;
        this._trie.set(key, {
            type: item.completion.kind,
            insertText: item.completion.insertText,
            touch: this._seq++,
        });
    }
    select(model, pos, items) {
        const { word } = model.getWordUntilPosition(pos);
        if (!word) {
            return super.select(model, pos, items);
        }
        const key = `${model.getLanguageId()}/${word}`;
        let item = this._trie.get(key);
        if (!item) {
            item = this._trie.findSubstr(key);
        }
        if (item) {
            for (let i = 0; i < items.length; i++) {
                const { kind, insertText } = items[i].completion;
                if (kind === item.type && insertText === item.insertText) {
                    return i;
                }
            }
        }
        return super.select(model, pos, items);
    }
    toJSON() {
        const entries = [];
        this._trie.forEach((value, key) => entries.push([key, value]));
        // sort by last recently used (touch), then
        // take the top 200 item and normalize their
        // touch
        entries.sort((a, b) => -(a[1].touch - b[1].touch)).forEach((value, i) => (value[1].touch = i));
        return entries.slice(0, 200);
    }
    fromJSON(data) {
        this._trie.clear();
        if (data.length > 0) {
            this._seq = data[0][1].touch + 1;
            for (const [key, value] of data) {
                value.type =
                    typeof value.type === 'number' ? value.type : CompletionItemKinds.fromString(value.type);
                this._trie.set(key, value);
            }
        }
    }
}
let SuggestMemoryService = class SuggestMemoryService {
    static { SuggestMemoryService_1 = this; }
    static { this._strategyCtors = new Map([
        ['recentlyUsedByPrefix', PrefixMemory],
        ['recentlyUsed', LRUMemory],
        ['first', NoMemory],
    ]); }
    static { this._storagePrefix = 'suggest/memories'; }
    constructor(_storageService, _configService) {
        this._storageService = _storageService;
        this._configService = _configService;
        this._disposables = new DisposableStore();
        this._persistSoon = new RunOnceScheduler(() => this._saveState(), 500);
        this._disposables.add(_storageService.onWillSaveState((e) => {
            if (e.reason === WillSaveStateReason.SHUTDOWN) {
                this._saveState();
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
        this._persistSoon.dispose();
    }
    memorize(model, pos, item) {
        this._withStrategy(model, pos).memorize(model, pos, item);
        this._persistSoon.schedule();
    }
    select(model, pos, items) {
        return this._withStrategy(model, pos).select(model, pos, items);
    }
    _withStrategy(model, pos) {
        const mode = this._configService.getValue('editor.suggestSelection', {
            overrideIdentifier: model.getLanguageIdAtPosition(pos.lineNumber, pos.column),
            resource: model.uri,
        });
        if (this._strategy?.name !== mode) {
            this._saveState();
            const ctor = SuggestMemoryService_1._strategyCtors.get(mode) || NoMemory;
            this._strategy = new ctor();
            try {
                const share = this._configService.getValue('editor.suggest.shareSuggestSelections');
                const scope = share ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */;
                const raw = this._storageService.get(`${SuggestMemoryService_1._storagePrefix}/${mode}`, scope);
                if (raw) {
                    this._strategy.fromJSON(JSON.parse(raw));
                }
            }
            catch (e) {
                // things can go wrong with JSON...
            }
        }
        return this._strategy;
    }
    _saveState() {
        if (this._strategy) {
            const share = this._configService.getValue('editor.suggest.shareSuggestSelections');
            const scope = share ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */;
            const raw = JSON.stringify(this._strategy);
            this._storageService.store(`${SuggestMemoryService_1._storagePrefix}/${this._strategy.name}`, raw, scope, 1 /* StorageTarget.MACHINE */);
        }
    }
};
SuggestMemoryService = SuggestMemoryService_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IConfigurationService)
], SuggestMemoryService);
export { SuggestMemoryService };
export const ISuggestMemoryService = createDecorator('ISuggestMemories');
registerSingleton(ISuggestMemoryService, SuggestMemoryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdE1lbW9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0TWVtb3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBR2hGLE9BQU8sRUFBc0IsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixlQUFlLEVBR2YsbUJBQW1CLEdBQ25CLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsTUFBTSxPQUFnQixNQUFNO0lBQzNCLFlBQXFCLElBQWE7UUFBYixTQUFJLEdBQUosSUFBSSxDQUFTO0lBQUcsQ0FBQztJQUV0QyxNQUFNLENBQUMsS0FBaUIsRUFBRSxHQUFjLEVBQUUsS0FBdUI7UUFDaEUsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEMsS0FBSyxJ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