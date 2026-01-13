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
import { readHotReloadableExport } from '../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, derivedWithStore, observableValue, recomputeInitiallyAndOnChange, } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import './colors.js';
import { DiffEditorItemTemplate } from './diffEditorItemTemplate.js';
import { MultiDiffEditorViewModel } from './multiDiffEditorViewModel.js';
import { MultiDiffEditorWidgetImpl, } from './multiDiffEditorWidgetImpl.js';
let MultiDiffEditorWidget = class MultiDiffEditorWidget extends Disposable {
    constructor(_element, _workbenchUIElementFactory, _instantiationService) {
        super();
        this._element = _element;
        this._workbenchUIElementFactory = _workbenchUIElementFactory;
        this._instantiationService = _instantiationService;
        this._dimension = observableValue(this, undefined);
        this._viewModel = observableValue(this, undefined);
        this._widgetImpl = derivedWithStore(this, (reader, store) => {
            readHotReloadableExport(DiffEditorItemTemplate, reader);
            return store.add(this._instantiationService.createInstance(readHotReloadableExport(MultiDiffEditorWidgetImpl, reader), this._element, this._dimension, this._viewModel, this._workbenchUIElementFactory));
        });
        this._activeControl = derived(this, (reader) => this._widgetImpl.read(reader).activeControl.read(reader));
        this.onDidChangeActiveControl = Event.fromObservableLight(this._activeControl);
        this._register(recomputeInitiallyAndOnChange(this._widgetImpl));
    }
    reveal(resource, options) {
        this._widgetImpl.get().reveal(resource, options);
    }
    createViewModel(model) {
        return new MultiDiffEditorViewModel(model, this._instantiationService);
    }
    setViewModel(viewModel) {
        this._viewModel.set(viewModel, undefined);
    }
    layout(dimension) {
        this._dimension.set(dimension, undefined);
    }
    getActiveControl() {
        return this._activeControl.get();
    }
    getViewState() {
        return this._widgetImpl.get().getViewState();
    }
    setViewState(viewState) {
        this._widgetImpl.get().setViewState(viewState);
    }
    tryGetCodeEditor(resource) {
        return this._widgetImpl.get().tryGetCodeEditor(resource);
    }
    findDocumentDiffItem(resource) {
        return this._widgetImpl.get().findDocumentDiffItem(resource);
    }
};
MultiDiffEditorWidget = __decorate([
    __param(2, IInstantiationService)
], MultiDiffEditorWidget);
export { MultiDiffEditorWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvbXVsdGlEaWZmRWRpdG9yL211bHRpRGlmZkVkaXRvcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZiw2QkFBNkIsR0FDN0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUtsRyxPQUFPLGFBQWEsQ0FBQTtBQUNwQixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBR04seUJBQXlCLEdBQ3pCLE1BQU0sZ0NBQWdDLENBQUE7QUFHaEMsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBb0JwRCxZQUNrQixRQUFxQixFQUNyQiwwQkFBc0QsRUFDaEQscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBSlUsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQiwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTRCO1FBQy9CLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUF0QnBFLGVBQVUsR0FBRyxlQUFlLENBQXdCLElB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