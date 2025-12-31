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
var SuggestAlternatives_1;
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
let SuggestAlternatives = class SuggestAlternatives {
    static { SuggestAlternatives_1 = this; }
    static { this.OtherSuggestions = new RawContextKey('hasOtherSuggestions', false); }
    constructor(_editor, contextKeyService) {
        this._editor = _editor;
        this._index = 0;
        this._ckOtherSuggestions = SuggestAlternatives_1.OtherSuggestions.bindTo(contextKeyService);
    }
    dispose() {
        this.reset();
    }
    reset() {
        this._ckOtherSuggestions.reset();
        this._listener?.dispose();
        this._model = undefined;
        this._acceptNext = undefined;
        this._ignore = false;
    }
    set({ model, index }, acceptNext) {
        // no suggestions -> nothing to do
        if (model.items.length === 0) {
            this.reset();
            return;
        }
        // no alternative suggestions -> nothing to do
        const nextIndex = SuggestAlternatives_1._moveIndex(true, model, index);
        if (nextIndex === index) {
            this.reset();
            return;
        }
        this._acceptNext = acceptNext;
        this._model = model;
        this._index = index;
        this._listener = this._editor.onDidChangeCursorPosition(() => {
            if (!this._ignore) {
                this.reset();
            }
        });
        this._ckOtherSuggestions.set(true);
    }
    static _moveIndex(fwd, model, index) {
        let newIndex = index;
        for (let rounds = model.items.length; rounds > 0; rounds--) {
            newIndex = (newIndex + model.items.length + (fwd ? +1 : -1)) % model.items.length;
            if (newIndex === index) {
                break;
            }
            if (!model.items[newIndex].completion.additionalTextEdits) {
                break;
            }
        }
        return newIndex;
    }
    next() {
        this._move(true);
    }
    prev() {
        this._move(false);
    }
    _move(fwd) {
        if (!this._model) {
            // nothing to reason about
            return;
        }
        try {
            this._ignore = true;
            this._index = SuggestAlternatives_1._moveIndex(fwd, this._model, this._index);
            this._acceptNext({
                index: this._index,
                item: this._model.items[this._index],
                model: this._model,
            });
        }
        finally {
            this._ignore = false;
        }
    }
};
SuggestAlternatives = SuggestAlternatives_1 = __decorate([
    __param(1, IContextKeyService)
], SuggestAlternatives);
export { SuggestAlternatives };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdEFsdGVybmF0aXZlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0QWx0ZXJuYXRpdmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBSXRELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1COzthQUNmLHFCQUFnQixHQUFHLElBQUksYUFBYSxDQUFVLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxBQUEzRCxDQUEyRDtJQVUzRixZQUNrQixPQUFvQixFQUNqQixpQkFBcUM7UUFEeEMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQVA5QixXQUFNLEdBQVcsQ0FBQyxDQUFBO1FBVXpCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxxQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNiLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7UUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7SUFDckIsQ0FBQztJQUVELEdBQUcsQ0FDRixFQUFFLEtBQUssRUFBRSxLQUFLLEVBQXVCLEVBQ3JDLFVBQWtEO1FBRWxELGtDQUFrQztRQUNsQyxJQUFJLEtBQUss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