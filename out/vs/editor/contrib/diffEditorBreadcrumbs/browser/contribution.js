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
import { reverseOrder, compareBy, numberComparator } from '../../../../base/common/arrays.js';
import { observableValue, observableSignalFromEvent, autorunWithStore, } from '../../../../base/common/observable.js';
import { HideUnchangedRegionsFeature, } from '../../../browser/widget/diffEditor/features/hideUnchangedRegionsFeature.js';
import { DisposableCancellationTokenSource } from '../../../browser/widget/diffEditor/utils.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IOutlineModelService } from '../../documentSymbols/browser/outlineModel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
let DiffEditorBreadcrumbsSource = class DiffEditorBreadcrumbsSource extends Disposable {
    constructor(_textModel, _languageFeaturesService, _outlineModelService) {
        super();
        this._textModel = _textModel;
        this._languageFeaturesService = _languageFeaturesService;
        this._outlineModelService = _outlineModelService;
        this._currentModel = observableValue(this, undefined);
        const documentSymbolProviderChanged = observableSignalFromEvent('documentSymbolProvider.onDidChange', this._languageFeaturesService.documentSymbolProvider.onDidChange);
        const textModelChanged = observableSignalFromEvent('_textModel.onDidChangeContent', Event.debounce((e) => this._textModel.onDidChangeContent(e), () => undefined, 100));
        this._register(autorunWithStore(async (reader, store) => {
            documentSymbolProviderChanged.read(reader);
            textModelChanged.read(reader);
            const src = store.add(new DisposableCancellationTokenSource());
            const model = await this._outlineModelService.getOrCreate(this._textModel, src.token);
            if (store.isDisposed) {
                return;
            }
            this._currentModel.set(model, undefined);
        }));
    }
    getBreadcrumbItems(startRange, reader) {
        const m = this._currentModel.read(reader);
        if (!m) {
            return [];
        }
        const symbols = m
            .asListOfDocumentSymbols()
            .filter((s) => startRange.contains(s.range.startLineNumber) &&
            !startRange.contains(s.range.endLineNumber));
        symbols.sort(reverseOrder(compareBy((s) => s.range.endLineNumber - s.range.startLineNumber, numberComparator)));
        return symbols.map((s) => ({
            name: s.name,
            kind: s.kind,
            startLineNumber: s.range.startLineNumber,
        }));
    }
};
DiffEditorBreadcrumbsSource = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, IOutlineModelService)
], DiffEditorBreadcrumbsSource);
HideUnchangedRegionsFeature.setBreadcrumbsSourceFactory((textModel, instantiationService) => {
    return instantiationService.createInstance(DiffEditorBreadcrumbsSource, textModel);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZGlmZkVkaXRvckJyZWFkY3J1bWJzL2Jyb3dzZXIvY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0YsT0FBTyxFQUNOLGVBQWUsRUFDZix5QkFBeUIsRUFDekIsZ0JBQWdCLEdBRWhCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLDJCQUEyQixHQUUzQixNQUFNLDRFQUE0RSxDQUFBO0FBQ25GLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxvQkFBb0IsRUFBZ0IsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBR3hELElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQUduRCxZQUNrQixVQUFzQixFQUNiLHdCQUFtRSxFQUN2RSxvQkFBMkQ7UUFFakYsS0FBSyxFQUFFLENBQUE7UUFKVSxlQUFVLEdBQVYsVUFBVSxDQUFZO1FBQ0ksNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtRQUN0RCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBTGpFLGtCQUFhLEdBQUcsZUFBZSxDQUEyQixJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFTMUYsTUFBTSw2QkFBNkIsR0FBRyx5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