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
import { binarySearch, coalesceInPlace, equals } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LRUCache } from '../../../../base/common/map.js';
import { commonPrefixLength } from '../../../../base/common/strings.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageFeatureDebounceService, } from '../../../common/services/languageFeatureDebounce.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IModelService } from '../../../common/services/model.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export class TreeElement {
    remove() {
        this.parent?.children.delete(this.id);
    }
    static findId(candidate, container) {
        // complex id-computation which contains the origin/extension,
        // the parent path, and some dedupe logic when names collide
        let candidateId;
        if (typeof candidate === 'string') {
            candidateId = `${container.id}/${candidate}`;
        }
        else {
            candidateId = `${container.id}/${candidate.name}`;
            if (container.children.get(candidateId) !== undefined) {
                candidateId = `${container.id}/${candidate.name}_${candidate.range.startLineNumber}_${candidate.range.startColumn}`;
            }
        }
        let id = candidateId;
        for (let i = 0; container.children.get(id) !== undefined; i++) {
            id = `${candidateId}_${i}`;
        }
        return id;
    }
    static getElementById(id, element) {
        if (!id) {
            return undefined;
        }
        const len = commonPrefixLength(id, element.id);
        if (len === id.length) {
            return element;
        }
        if (len < element.id.length) {
            return undefined;
        }
        for (const [, child] of element.children) {
            const candidate = TreeElement.getElementById(id, child);
            if (candidate) {
                return candidate;
            }
        }
        return undefined;
    }
    static size(element) {
        let res = 1;
        for (const [, child] of element.children) {
            res += TreeElement.size(child);
        }
        return res;
    }
    static empty(element) {
        return element.children.size === 0;
    }
}
export class OutlineElement extends TreeElement {
    constructor(id, parent, symbol) {
        super();
        this.id = id;
        this.parent = parent;
        this.symbol = symbol;
        this.children = new Map();
    }
}
export class OutlineGroup extends TreeElement {
    constructor(id, parent, label, order) {
        super();
        this.id = id;
        this.parent = parent;
        this.label = label;
        this.order = order;
        this.children = new Map();
    }
    getItemEnclosingPosition(position) {
        return position ? this._getItemEnclosingPosition(position, this.children) : undefined;
    }
    _getItemEnclosingPosition(position, children) {
        for (const [, item] of children) {
            if (!item.symbol.range || !Range.containsPosition(item.symbol.range, position)) {
                continue;
            }
            return this._getItemEnclosingPosition(position, item.children) || item;
        }
        return undefined;
    }
    updateMarker(marker) {
        for (const [, child] of this.children) {
            this._updateMarker(marker, child);
        }
    }
    _updateMarker(markers, item) {
        item.marker = undefined;
        // find the proper start index to check for item/marker overlap.
        const idx = binarySearch(markers, item.symbol.range, Range.compareRangesUsingStarts);
        let start;
        if (idx < 0) {
            start = ~idx;
            if (start > 0 && Range.areIntersecting(markers[start - 1], item.symbol.range)) {
                start -= 1;
            }
        }
        else {
            start = idx;
        }
        const myMarkers = [];
        let myTopSev;
        for (; start < markers.length && Range.areIntersecting(item.symbol.range, markers[start]); start++) {
            // remove markers intersecting with this outline element
            // and store them in a 'private' array.
            const marker = markers[start];
            myMarkers.push(marker);
            markers[start] = undefined;
            if (!myTopSev || marker.severity > myTopSev) {
                myTopSev = marker.severity;
            }
        }
        // Recurse into children and let them match markers that have matched
        // this outline element. This might remove markers from this element and
        // therefore we remember that we have had markers. That allows us to render
        // the dot, saying 'this element has children with markers'
        for (const [, child] of item.children) {
            this._updateMarker(myMarkers, child);
        }
        if (myTopSev) {
            item.marker = {
                count: myMarkers.length,
                topSev: myTopSev,
            };
        }
        coalesceInPlace(markers);
    }
}
export class OutlineModel extends TreeElement {
    static create(registry, textModel, token) {
        const cts = new CancellationTokenSource(token);
        const result = new OutlineModel(textModel.uri);
        const provider = registry.ordered(textModel);
        const promises = provider.map((provider, index) => {
            const id = TreeElement.findId(`provider_${index}`, result);
            const group = new OutlineGroup(id, result, provider.displayName ?? 'Unknown Outline Provider', index);
            return Promise.resolve(provider.provideDocumentSymbols(textModel, cts.token))
                .then((result) => {
                for (const info of result || []) {
                    OutlineModel._makeOutlineElement(info, group);
                }
                return group;
            }, (err) => {
                onUnexpectedExternalError(err);
                return group;
            })
                .then((group) => {
                if (!TreeElement.empty(group)) {
                    result._groups.set(id, group);
                }
                else {
                    group.remove();
                }
            });
        });
        const listener = registry.onDidChange(() => {
            const newProvider = registry.ordered(textModel);
            if (!equals(newProvider, provider)) {
                cts.cancel();
            }
        });
        return Promise.all(promises)
            .then(() => {
            if (cts.token.isCancellationRequested && !token.isCancellationRequested) {
                return OutlineModel.create(registry, textModel, token);
            }
            else {
                return result._compact();
            }
        })
            .finally(() => {
            cts.dispose();
            listener.dispose();
            cts.dispose();
        });
    }
    static _makeOutlineElement(info, container) {
        const id = TreeElement.findId(info, container);
        const res = new OutlineElement(id, container, info);
        if (info.children) {
            for (const childInfo of info.children) {
                OutlineModel._makeOutlineElement(childInfo, res);
            }
        }
        container.children.set(res.id, res);
    }
    static get(element) {
        while (element) {
            if (element instanceof OutlineModel) {
                return element;
            }
            element = element.parent;
        }
        return undefined;
    }
    constructor(uri) {
        super();
        this.uri = uri;
        this.id = 'root';
        this.parent = undefined;
        this._groups = new Map();
        this.children = new Map();
        this.id = 'root';
        this.parent = undefined;
    }
    _compact() {
        let count = 0;
        for (const [key, group] of this._groups) {
            if (group.children.size === 0) {
                // empty
                this._groups.delete(key);
            }
            else {
                count += 1;
            }
        }
        if (count !== 1) {
            //
            this.children = this._groups;
        }
        else {
            // adopt all elements of the first group
            const group = Iterable.first(this._groups.values());
            for (const [, child] of group.children) {
                child.parent = this;
                this.children.set(child.id, child);
            }
        }
        return this;
    }
    merge(other) {
        if (this.uri.toString() !== other.uri.toString()) {
            return false;
        }
        if (this._groups.size !== other._groups.size) {
            return false;
        }
        this._groups = other._groups;
        this.children = other.children;
        return true;
    }
    getItemEnclosingPosition(position, context) {
        let preferredGroup;
        if (context) {
            let candidate = context.parent;
            while (candidate && !preferredGroup) {
                if (candidate instanceof OutlineGroup) {
                    preferredGroup = candidate;
                }
                candidate = candidate.parent;
            }
        }
        let result = undefined;
        for (const [, group] of this._groups) {
            result = group.getItemEnclosingPosition(position);
            if (result && (!preferredGroup || preferredGroup === group)) {
                break;
            }
        }
        return result;
    }
    getItemById(id) {
        return TreeElement.getElementById(id, this);
    }
    updateMarker(marker) {
        // sort markers by start range so that we can use
        // outline element starts for quicker look up
        marker.sort(Range.compareRangesUsingStarts);
        for (const [, group] of this._groups) {
            group.updateMarker(marker.slice(0));
        }
    }
    getTopLevelSymbols() {
        const roots = [];
        for (const child of this.children.values()) {
            if (child instanceof OutlineElement) {
                roots.push(child.symbol);
            }
            else {
                roots.push(...Iterable.map(child.children.values(), (child) => child.symbol));
            }
        }
        return roots.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
    }
    asListOfDocumentSymbols() {
        const roots = this.getTopLevelSymbols();
        const bucket = [];
        OutlineModel._flattenDocumentSymbols(bucket, roots, '');
        return bucket.sort((a, b) => Position.compare(Range.getStartPosition(a.range), Range.getStartPosition(b.range)) ||
            Position.compare(Range.getEndPosition(b.range), Range.getEndPosition(a.range)));
    }
    static _flattenDocumentSymbols(bucket, entries, overrideContainerLabel) {
        for (const entry of entries) {
            bucket.push({
                kind: entry.kind,
                tags: entry.tags,
                name: entry.name,
                detail: entry.detail,
                containerName: entry.containerName || overrideContainerLabel,
                range: entry.range,
                selectionRange: entry.selectionRange,
                children: undefined, // we flatten it...
            });
            // Recurse over children
            if (entry.children) {
                OutlineModel._flattenDocumentSymbols(bucket, entry.children, entry.name);
            }
        }
    }
}
export const IOutlineModelService = createDecorator('IOutlineModelService');
let OutlineModelService = class OutlineModelService {
    constructor(_languageFeaturesService, debounces, modelService) {
        this._languageFeaturesService = _languageFeaturesService;
        this._disposables = new DisposableStore();
        this._cache = new LRUCache(15, 0.7);
        this._debounceInformation = debounces.for(_languageFeaturesService.documentSymbolProvider, 'DocumentSymbols', { min: 350 });
        // don't cache outline models longer than their text model
        this._disposables.add(modelService.onModelRemoved((textModel) => {
            this._cache.delete(textModel.id);
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
    async getOrCreate(textModel, token) {
        const registry = this._languageFeaturesService.documentSymbolProvider;
        const provider = registry.ordered(textModel);
        let data = this._cache.get(textModel.id);
        if (!data || data.versionId !== textModel.getVersionId() || !equals(data.provider, provider)) {
            const source = new CancellationTokenSource();
            data = {
                versionId: textModel.getVersionId(),
                provider,
                promiseCnt: 0,
                source,
                promise: OutlineModel.create(registry, textModel, source.token),
                model: undefined,
            };
            this._cache.set(textModel.id, data);
            const now = Date.now();
            data.promise
                .then((outlineModel) => {
                data.model = outlineModel;
                this._debounceInformation.update(textModel, Date.now() - now);
            })
                .catch((_err) => {
                this._cache.delete(textModel.id);
            });
        }
        if (data.model) {
            // resolved -> return data
            return data.model;
        }
        // increase usage counter
        data.promiseCnt += 1;
        const listener = token.onCancellationRequested(() => {
            // last -> cancel provider request, remove cached promise
            if (--data.promiseCnt === 0) {
                data.source.cancel();
                this._cache.delete(textModel.id);
            }
        });
        try {
            return await data.promise;
        }
        finally {
            listener.dispose();
        }
    }
    getDebounceValue(textModel) {
        return this._debounceInformation.get(textModel);
    }
    getCachedModels() {
        return Iterable.filter(Iterable.map(this._cache.values(), (entry) => entry.model), (model) => model !== undefined);
    }
};
OutlineModelService = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, ILanguageFeatureDebounceService),
    __param(2, IModelService)
], OutlineModelService);
export { OutlineModelService };
registerSingleton(IOutlineModelService, OutlineModelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZU1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZG9jdW1lbnRTeW1ib2xzL2Jyb3dzZXIvb3V0bGluZU1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXZFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFJN0QsT0FBTyxFQUVOLCtCQUErQixHQUMvQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV2RixNQUFNLE9BQWdCLFdBQVc7SUFLaEMsTUFBTTtRQUNMLElBQUksQ0FB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