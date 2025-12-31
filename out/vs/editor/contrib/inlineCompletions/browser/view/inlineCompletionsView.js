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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUNvbXBsZXRpb25zVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUNOLE9BQU8sRUFDUCx3QkFBd0IsRUFDeEIsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZiwwQkFBMEIsR0FHMUIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVsRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU3RixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzVELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQW1FcEQsWUFDa0IsT0FBb0IsRUFDcEIsTUFBdUQsRUFDdkQsY0FBNEMsRUFDdEMscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBTFUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNwQixXQUFNLEdBQU4sTUFBTSxDQUFpRDtRQUN2RCxtQkFBYyxHQUFkLGNBQWMsQ0FBOEI7UUFDckIsMEJB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