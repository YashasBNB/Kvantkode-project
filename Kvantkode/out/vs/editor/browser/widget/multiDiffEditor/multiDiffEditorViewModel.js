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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvbXVsdGlEaWZmRWRpdG9yL211bHRpRGlmZkVkaXRvclZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRyxPQUFPLEVBR04sZUFBZSxFQUNmLE9BQU8sRUFDUCxrQ0FBa0MsRUFDbEMsd0JBQXdCLEVBQ3hCLGtDQUFrQyxFQUNsQyxlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sdUNBQXVDLENBQUE7QUFHOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFJbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUduRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQStCaEQsS0FBSyxDQUFDLFlBQVk7UUFDeEIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDbEMsTUFBTSxDQUFDLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFTSxXQUFXO1FBQ2pCLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQ2xC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