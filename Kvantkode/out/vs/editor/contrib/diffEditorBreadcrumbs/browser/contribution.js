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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9kaWZmRWRpdG9yQnJlYWRjcnVtYnMvYnJvd3Nlci9jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RixPQUFPLEVBQ04sZUFBZSxFQUNmLHlCQUF5QixFQUN6QixnQkFBZ0IsR0FFaEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQ04sMkJBQTJCLEdBRTNCLE1BQU0sNEVBQTRFLENBQUE7QUFDbkYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLG9CQUFvQixFQUFnQixNQUFNLCtDQUErQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHeEQsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBR25ELFlBQ2tCLFVBQXNCLEVBQ2Isd0JBQW1FLEVBQ3ZFLG9CQUEyRDtRQUVqRixLQUFLLEVBQUUsQ0FBQTtRQUpVLGVBQVUsR0FBVixVQUFVLENBQVk7UUFDSSw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ3RELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFMakUsa0JBQWEsR0FBRyxlQUFlLENBQTJCLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQVMxRixNQUFNLDZCQUE2QixH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