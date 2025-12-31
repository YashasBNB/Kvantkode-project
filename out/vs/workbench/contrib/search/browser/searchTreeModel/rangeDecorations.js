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
var RangeHighlightDecorations_1;
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
/**
 * Can add a range highlight decoration to a model.
 * It will automatically remove it when the model has its decorations changed.
 */
let RangeHighlightDecorations = class RangeHighlightDecorations {
    static { RangeHighlightDecorations_1 = this; }
    constructor(_modelService) {
        this._modelService = _modelService;
        this._decorationId = null;
        this._model = null;
        this._modelDisposables = new DisposableStore();
    }
    removeHighlightRange() {
        if (this._model && this._decorationId) {
            const decorationId = this._decorationId;
            this._model.changeDecorations((accessor) => {
                accessor.removeDecoration(decorationId);
            });
        }
        this._decorationId = null;
    }
    highlightRange(resource, range, ownerId = 0) {
        let model;
        if (URI.isUri(resource)) {
            model = this._modelService.getModel(resource);
        }
        else {
            model = resource;
        }
        if (model) {
            this.doHighlightRange(model, range);
        }
    }
    doHighlightRange(model, range) {
        this.removeHighlightRange();
        model.changeDecorations((accessor) => {
            this._decorationId = accessor.addDecoration(range, RangeHighlightDecorations_1._RANGE_HIGHLIGHT_DECORATION);
        });
        this.setModel(model);
    }
    setModel(model) {
        if (this._model !== model) {
            this.clearModelListeners();
            this._model = model;
            this._modelDisposables.add(this._model.onDidChangeDecorations((e) => {
                this.clearModelListeners();
                this.removeHighlightRange();
                this._model = null;
            }));
            this._modelDisposables.add(this._model.onWillDispose(() => {
                this.clearModelListeners();
                this.removeHighlightRange();
                this._model = null;
            }));
        }
    }
    clearModelListeners() {
        this._modelDisposables.clear();
    }
    dispose() {
        if (this._model) {
            this.removeHighlightRange();
            this._model = null;
        }
        this._modelDisposables.dispose();
    }
    static { this._RANGE_HIGHLIGHT_DECORATION = ModelDecorationOptions.register({
        description: 'search-range-highlight',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'rangeHighlight',
        isWholeLine: true,
    }); }
};
RangeHighlightDecorations = RangeHighlightDecorations_1 = __decorate([
    __param(0, IModelService)
], RangeHighlightDecorations);
export { RangeHighlightDecorations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VEZWNvcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaFRyZWVNb2RlbC9yYW5nZURlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUc5RTs7O0dBR0c7QUFFSSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUF5Qjs7SUFLckMsWUFBMkIsYUFBNkM7UUFBNUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFKaEUsa0JBQWEsR0FBa0IsSUFBSSxDQUFBO1FBQ25DLFdBQU0sR0FBc0IsSUFBSSxDQUFBO1FBQ3ZCLHNCQUFpQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFaUIsQ0FBQztJQUU1RSxvQkFBb0I7UUFDbkIsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDMUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3hDLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO0lBQzFCLENBQUM7SUFF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