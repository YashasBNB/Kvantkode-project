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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVhbEhpZ2hsaWdodFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvd29yZEhpZ2hsaWdodGVyL2Jyb3dzZXIvdGV4dHVhbEhpZ2hsaWdodFByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFFTixxQkFBcUIsR0FJckIsTUFBTSw4QkFBOEIsQ0FBQTtBQUlyQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRzVELE1BQU0sZ0NBQWdDO0lBQXRDO1FBR0MsYUFBUSxHQUFtQixFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQTtJQStEN0MsQ0FBQztJQTdEQSx5QkFBeUIsQ0FDeEIsS0FBaUIsRUFDakIsUUFBa0IsRUFDbEIsS0FBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQXdCLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUM7WUFDcEMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO1lBQy9CLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtTQUN2QixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0YsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzFCLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztZQUNkLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxJQUFJO1NBQ2hDLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVELDhCQUE4QixDQUM3QixZQUF3QixFQUN4QixRQUFrQixFQUNsQixXQUF5QixFQUN6QixLQUF3QjtRQUV4QixNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsRUFBdUIsQ0FBQTtRQUVyRCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUM7WUFDM0MsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO1lBQy9CLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtTQUN2QixDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUVELEtBQUssTUFBTSxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3BELElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQ3hCLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzdGLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3RDLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztnQkFDZCxJQUFJLEVBQUUscUJBQXFCLENBQUMsSUFBSTthQUNoQyxDQUFDLENBQUMsQ0FBQTtZQUVILElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztDQUNEO0FBRU0sSUFBTSxvQ0FBb0MsR0FBMUMsTUFBTSxvQ0FBcUMsU0FBUSxVQUFVO0lBQ25FLFlBQXNDLHVCQUFpRDtRQUN0RixLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxTQUFTLENBQ2IsdUJBQXVCLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUN6RCxHQUFHLEVBQ0gsSUFBSSxnQ0FBZ0MsRUFBRSxDQUN0QyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLHVCQUF1QixDQUFDLDhCQUE4QixDQUFDLFFBQVEsQ0FDOUQsR0FBRyxFQUNILElBQUksZ0NBQWdDLEVBQUUsQ0FDdEMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFoQlksb0NBQW9DO0lBQ25DLFdBQUEsd0JBQXdCLENBQUE7R0FEekIsb0NBQW9DLENBZ0JoRCJ9