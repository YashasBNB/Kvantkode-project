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
import { createStyleSheetFromObservable } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived, mapObservableArrayCached, derivedDisposable, constObservable, derivedObservableWithCache, } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../browser/observableCodeEditor.js';
import { InlineCompletionsHintsWidget } from '../hintsWidget/inlineCompletionsHintsWidget.js';
import { convertItemsToStableObservables } from '../utils.js';
import { GhostTextView } from './ghostText/ghostTextView.js';
import { InlineEditsViewAndDiffProducer } from './inlineEdits/inlineEditsViewProducer.js';
let InlineCompletionsView = class InlineCompletionsView extends Disposable {
    constructor(_editor, _model, _focusIsInMenu, _instantiationService) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._focusIsInMenu = _focusIsInMenu;
        this._instantiationService = _instantiationService;
        this._ghostTexts = derived(this, (reader) => {
            const model = this._model.read(reader);
            return model?.ghostTexts.read(reader) ?? [];
        });
        this._stablizedGhostTexts = convertItemsToStableObservables(this._ghostTexts, this._store);
        this._editorObs = observableCodeEditor(this._editor);
        this._ghostTextWidgets = mapObservableArrayCached(this, this._stablizedGhostTexts, (ghostText, store) => derivedDisposable((reader) => this._instantiationService.createInstance(GhostTextView.hot.read(reader), this._editor, {
            ghostText: ghostText,
            warning: this._model.map((m, reader) => {
                const warning = m?.warning?.read(reader);
                return warning ? { icon: warning.icon } : undefined;
            }),
            minReservedLineCount: constObservable(0),
            targetTextModel: this._model.map((v) => v?.textModel),
        }, this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((v) => ({ syntaxHighlightingEnabled: v.syntaxHighlightingEnabled })), false, false)).recomputeInitiallyAndOnChange(store)).recomputeInitiallyAndOnChange(this._store);
        this._inlineEdit = derived(this, (reader) => this._model.read(reader)?.inlineEditState.read(reader)?.inlineEdit);
        this._everHadInlineEdit = derivedObservableWithCache(this, (reader, last) => last ||
            !!this._inlineEdit.read(reader) ||
            !!this._model.read(reader)?.inlineCompletionState.read(reader)?.inlineCompletion
                ?.sourceInlineCompletion.showInlineEditMenu);
        this._inlineEditWidget = derivedDisposable((reader) => {
            if (!this._everHadInlineEdit.read(reader)) {
                return undefined;
            }
            return this._instantiationService.createInstance(InlineEditsViewAndDiffProducer.hot.read(reader), this._editor, this._inlineEdit, this._model, this._focusIsInMenu);
        }).recomputeInitiallyAndOnChange(this._store);
        this._fontFamily = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((val) => val.fontFamily);
        this._register(createStyleSheetFromObservable(derived((reader) => {
            const fontFamily = this._fontFamily.read(reader);
            if (fontFamily === '' || fontFamily === 'default') {
                return '';
            }
            return `
.monaco-editor .ghost-text-decoration,
.monaco-editor .ghost-text-decoration-preview,
.monaco-editor .ghost-text {
	font-family: ${fontFamily};
}`;
        })));
        this._register(new InlineCompletionsHintsWidget(this._editor, this._model, this._instantiationService));
    }
    shouldShowHoverAtViewZone(viewZoneId) {
        return this._ghostTextWidgets.get()[0]?.get().ownsViewZone(viewZoneId) ?? false;
    }
};
InlineCompletionsView = __decorate([
    __param(3, IInstantiationService)
], InlineCompletionsView);
export { InlineCompletionsView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lQ29tcGxldGlvbnNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sT0FBTyxFQUNQLHdCQUF3QixFQUN4QixpQkFBaUIsRUFDakIsZUFBZSxFQUNmLDBCQUEwQixHQUcxQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRWxGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDNUQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBbUVwRCxZQUNrQixPQUFvQixFQUNwQixNQUF1RCxFQUN2RCxjQUE0QyxFQUN0QyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFMVSxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ3BCLFdBQU0sR0FBTixNQUFNLENBQWlEO1FBQ3ZELG1CQUFjLEdBQWQsY0FBYyxDQUE4QjtRQUNy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