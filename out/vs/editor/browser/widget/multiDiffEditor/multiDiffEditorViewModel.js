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
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { constObservable, derived, derivedObservableWithWritableCache, mapObservableArrayCached, observableFromValueWithChangeEvent, observableValue, transaction, } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IModelService } from '../../../common/services/model.js';
import { DiffEditorOptions } from '../diffEditor/diffEditorOptions.js';
import { DiffEditorViewModel } from '../diffEditor/diffEditorViewModel.js';
import { RefCounted } from '../diffEditor/utils.js';
export class MultiDiffEditorViewModel extends Disposable {
    async waitForDiffs() {
        for (const d of this.items.get()) {
            await d.diffEditorViewModel.waitForDiff();
        }
    }
    collapseAll() {
        transaction((tx) => {
            for (const d of this.items.get()) {
                d.collapsed.set(true, tx);
            }
        });
    }
    expandAll() {
        transaction((tx) => {
            for (const d of this.items.get()) {
                d.collapsed.set(false, tx);
            }
        });
    }
    get contextKeys() {
        return this.model.contextKeys;
    }
    constructor(model, _instantiationService) {
        super();
        this.model = model;
        this._instantiationService = _instantiationService;
        this._documents = observableFromValueWithChangeEvent(this.model, this.model.documents);
        this._documentsArr = derived(this, (reader) => {
            const result = this._documents.read(reader);
            if (result === 'loading') {
                return [];
            }
            return result;
        });
        this.isLoading = derived(this, (reader) => this._documents.read(reader) === 'loading');
        this.items = mapObservableArrayCached(this, this._documentsArr, (d, store) => store.add(this._instantiationService.createInstance(DocumentDiffItemViewModel, d, this))).recomputeInitiallyAndOnChange(this._store);
        this.focusedDiffItem = derived(this, (reader) => this.items.read(reader).find((i) => i.isFocused.read(reader)));
        this.activeDiffItem = derivedObservableWithWritableCache(this, (reader, lastValue) => (this.focusedDiffItem.read(reader) ??
            (lastValue && this.items.read(reader).indexOf(lastValue) !== -1))
            ? lastValue
            : undefined);
    }
}
let DocumentDiffItemViewModel = class DocumentDiffItemViewModel extends Disposable {
    get diffEditorViewModel() {
        return this.diffEditorViewModelRef.object;
    }
    get originalUri() {
        return this.documentDiffItem.original?.uri;
    }
    get modifiedUri() {
        return this.documentDiffItem.modified?.uri;
    }
    setIsFocused(source, tx) {
        this._isFocusedSource.set(source, tx);
    }
    get documentDiffItem() {
        return this.documentDiffItemRef.object;
    }
    constructor(documentDiffItem, _editorViewModel, _instantiationService, _modelService) {
        super();
        this._editorViewModel = _editorViewModel;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this.collapsed = observableValue(this, false);
        this.lastTemplateData = observableValue(this, { contentHeight: 500, selections: undefined });
        this.isActive = derived(this, (reader) => this._editorViewModel.activeDiffItem.read(reader) === this);
        this._isFocusedSource = observableValue(this, constObservable(false));
        this.isFocused = derived(this, (reader) => this._isFocusedSource.read(reader).read(reader));
        this.isAlive = observableValue(this, true);
        this._register(toDisposable(() => {
            this.isAlive.set(false, undefined);
        }));
        this.documentDiffItemRef = this._register(documentDiffItem.createNewRef(this));
        function updateOptions(options) {
            return {
                ...options,
                hideUnchangedRegions: {
                    enabled: true,
                },
            };
        }
        const options = this._instantiationService.createInstance(DiffEditorOptions, updateOptions(this.documentDiffItem.options || {}));
        if (this.documentDiffItem.onOptionsDidChange) {
            this._register(this.documentDiffItem.onOptionsDidChange(() => {
                options.updateOptions(updateOptions(this.documentDiffItem.options || {}));
            }));
        }
        const diffEditorViewModelStore = new DisposableStore();
        const originalTextModel = this.documentDiffItem.original ??
            diffEditorViewModelStore.add(this._modelService.createModel('', null));
        const modifiedTextModel = this.documentDiffItem.modified ??
            diffEditorViewModelStore.add(this._modelService.createModel('', null));
        diffEditorViewModelStore.add(this.documentDiffItemRef.createNewRef(this));
        this.diffEditorViewModelRef = this._register(RefCounted.createWithDisposable(this._instantiationService.createInstance(DiffEditorViewModel, {
            original: originalTextModel,
            modified: modifiedTextModel,
        }, options), diffEditorViewModelStore, this));
    }
    getKey() {
        return JSON.stringify([this.originalUri?.toString(), this.modifiedUri?.toString()]);
    }
};
DocumentDiffItemViewModel = __decorate([
    __param(2, IInstantiationService),
    __param(3, IModelService)
], DocumentDiffItemViewModel);
export { DocumentDiffItemViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L211bHRpRGlmZkVkaXRvci9tdWx0aURpZmZFZGl0b3JWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEcsT0FBTyxFQUdOLGVBQWUsRUFDZixPQUFPLEVBQ1Asa0NBQWtDLEVBQ2xDLHdCQUF3QixFQUN4QixrQ0FBa0MsRUFDbEMsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLHVDQUF1QyxDQUFBO0FBRzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBSWxHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFHbkQsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFVBQVU7SUErQmhELEtBQUssQ0FBQyxZQUFZO1FBQ3hCLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBRU0sV0FBVztRQUNqQixXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUNsQixLQUFLLE1BQU0sQ0FBQyxJQUFJLElB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