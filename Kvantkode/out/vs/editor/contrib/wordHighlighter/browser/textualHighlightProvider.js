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
import { USUAL_WORD_SEPARATORS } from '../../../common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { DocumentHighlightKind, } from '../../../common/languages.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
class TextualDocumentHighlightProvider {
    constructor() {
        this.selector = { language: '*' };
    }
    provideDocumentHighlights(model, position, token) {
        const result = [];
        const word = model.getWordAtPosition({
            lineNumber: position.lineNumber,
            column: position.column,
        });
        if (!word) {
            return Promise.resolve(result);
        }
        if (model.isDisposed()) {
            return;
        }
        const matches = model.findMatches(word.word, true, false, true, USUAL_WORD_SEPARATORS, false);
        return matches.map((m) => ({
            range: m.range,
            kind: DocumentHighlightKind.Text,
        }));
    }
    provideMultiDocumentHighlights(primaryModel, position, otherModels, token) {
        const result = new ResourceMap();
        const word = primaryModel.getWordAtPosition({
            lineNumber: position.lineNumber,
            column: position.column,
        });
        if (!word) {
            return Promise.resolve(result);
        }
        for (const model of [primaryModel, ...otherModels]) {
            if (model.isDisposed()) {
                continue;
            }
            const matches = model.findMatches(word.word, true, false, true, USUAL_WORD_SEPARATORS, false);
            const highlights = matches.map((m) => ({
                range: m.range,
                kind: DocumentHighlightKind.Text,
            }));
            if (highlights) {
                result.set(model.uri, highlights);
            }
        }
        return result;
    }
}
let TextualMultiDocumentHighlightFeature = class TextualMultiDocumentHighlightFeature extends Disposable {
    constructor(languageFeaturesService) {
        super();
        this._register(languageFeaturesService.documentHighlightProvider.register('*', new TextualDocumentHighlightProvider()));
        this._register(languageFeaturesService.multiDocumentHighlightProvider.register('*', new TextualDocumentHighlightProvider()));
    }
};
TextualMultiDocumentHighlightFeature = __decorate([
    __param(0, ILanguageFeaturesService)
], TextualMultiDocumentHighlightFeature);
export { TextualMultiDocumentHighlightFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVhbEhpZ2hsaWdodFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi93b3JkSGlnaGxpZ2h0ZXIvYnJvd3Nlci90ZXh0dWFsSGlnaGxpZ2h0UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUVOLHFCQUFxQixHQUlyQixNQUFNLDhCQUE4QixDQUFBO0FBSXJDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHNUQsTUFBTSxnQ0FBZ0M7SUFBdEM7UUFHQyxhQUFRLEdBQW1CLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFBO0lBK0Q3QyxDQUFDO0lBN0RBLHlCQUF5QixDQUN4QixLQUFpQixFQUNqQixRQUFrQixFQUNsQixLQUF3QjtRQUV4QixNQUFNLE1BQU0sR0FBd0IsRUFBRSxDQUFBO1FBRXRDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztZQUNwQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDL0IsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1NBQ3ZCLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3RixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDMUIsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLO1lBQ2QsSUFBSSxFQUFFLHFCQUFxQixDQUFDLElBQUk7U0FDaEMsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRUQsOEJBQThCLENBQzdCLFlBQXdCLEVBQ3hCLFFBQWtCLEVBQ2xCLFdBQXlCLEVBQ3pCLEtBQXdCO1FBRXhCLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxFQUF1QixDQUFBO1FBRXJELE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztZQUMzQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDL0IsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1NBQ3ZCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDcEQsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDeEIsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDN0YsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdEMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLO2dCQUNkLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxJQUFJO2FBQ2hDLENBQUMsQ0FBQyxDQUFBO1lBRUgsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0Q7QUFFTSxJQUFNLG9DQUFvQyxHQUExQyxNQUFNLG9DQUFxQyxTQUFRLFVBQVU7SUFDbkUsWUFBc0MsdUJBQWlEO1FBQ3RGLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FDYix1QkFBdUIsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQ3pELEdBQUcsRUFDSCxJQUFJLGdDQUFnQyxFQUFFLENBQ3RDLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsdUJBQXVCLENBQUMsOEJBQThCLENBQUMsUUFBUSxDQUM5RCxHQUFHLEVBQ0gsSUFBSSxnQ0FBZ0MsRUFBRSxDQUN0QyxDQUNELENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWhCWSxvQ0FBb0M7SUFDbkMsV0FBQSx3QkFBd0IsQ0FBQTtHQUR6QixvQ0FBb0MsQ0FnQmhEIn0=