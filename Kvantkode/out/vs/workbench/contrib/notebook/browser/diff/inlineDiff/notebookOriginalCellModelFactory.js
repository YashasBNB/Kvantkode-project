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
import { ReferenceCollection } from '../../../../../../base/common/lifecycle.js';
import { createDecorator, IInstantiationService, } from '../../../../../../platform/instantiation/common/instantiation.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
export const INotebookOriginalCellModelFactory = createDecorator('INotebookOriginalCellModelFactory');
let OriginalNotebookCellModelReferenceCollection = class OriginalNotebookCellModelReferenceCollection extends ReferenceCollection {
    constructor(modelService, _languageService) {
        super();
        this.modelService = modelService;
        this._languageService = _languageService;
    }
    createReferencedObject(_key, uri, cellValue, language, cellKind) {
        const scheme = `${uri.scheme}-chat-edit`;
        const originalCellUri = URI.from({ scheme, fragment: uri.fragment, path: uri.path });
        const languageSelection = this._languageService.getLanguageIdByLanguageName(language)
            ? this._languageService.createById(language)
            : cellKind === CellKind.Markup
                ? this._languageService.createById('markdown')
                : null;
        return this.modelService.createModel(cellValue, languageSelection, originalCellUri);
    }
    destroyReferencedObject(_key, model) {
        model.dispose();
    }
};
OriginalNotebookCellModelReferenceCollection = __decorate([
    __param(0, IModelService),
    __param(1, ILanguageService)
], OriginalNotebookCellModelReferenceCollection);
export { OriginalNotebookCellModelReferenceCollection };
let OriginalNotebookCellModelFactory = class OriginalNotebookCellModelFactory {
    constructor(instantiationService) {
        this._data = instantiationService.createInstance(OriginalNotebookCellModelReferenceCollection);
    }
    getOrCreate(uri, cellValue, language, cellKind) {
        return this._data.acquire(uri.toString(), uri, cellValue, language, cellKind);
    }
};
OriginalNotebookCellModelFactory = __decorate([
    __param(0, IInstantiationService)
], OriginalNotebookCellModelFactory);
export { OriginalNotebookCellModelFactory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcmlnaW5hbENlbGxNb2RlbEZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9pbmxpbmVEaWZmL25vdGVib29rT3JpZ2luYWxDZWxsTW9kZWxGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBYyxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzVGLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sa0VBQWtFLENBQUE7QUFFekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakYsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsZUFBZSxDQUMvRCxtQ0FBbUMsQ0FDbkMsQ0FBQTtBQVlNLElBQU0sNENBQTRDLEdBQWxELE1BQU0sNENBQTZDLFNBQVEsbUJBQStCO0lBQ2hHLFlBQ2lDLFlBQTJCLEVBQ3hCLGdCQUFrQztRQUVyRSxLQUFLLEVBQUUsQ0FBQTtRQUh5QixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUN4QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO0lBR3RFLENBQUM7SUFFa0Isc0JBQXNCLENBQ3hDLElBQVksRUFDWixHQUFRLEVBQ1IsU0FBaUIsRUFDakIsUUFBZ0IsRUFDaEIsUUFBa0I7UUFFbEIsTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxZQUFZLENBQUE7UUFDeEMsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFDcEYsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDO1lBQ3BGLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUM1QyxDQUFDLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNO2dCQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7Z0JBQzlDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDUixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBQ2tCLHVCQUF1QixDQUFDLElBQVksRUFBRSxLQUFpQjtRQUN6RSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNELENBQUE7QUEzQlksNENBQTRDO0lBRXRELFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxnQkFBZ0IsQ0FBQTtHQUhOLDRDQUE0QyxDQTJCeEQ7O0FBRU0sSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBZ0M7SUFHNUMsWUFBbUMsb0JBQTJDO1FBQzdFLElBQUksQ0FBQyxLQUFLLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDRDQUE0QyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVELFdBQVcsQ0FDVixHQUFRLEVBQ1IsU0FBaUIsRUFDakIsUUFBZ0IsRUFDaEIsUUFBa0I7UUFFbEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDOUUsQ0FBQztDQUNELENBQUE7QUFmWSxnQ0FBZ0M7SUFHL0IsV0FBQSxxQkFBcUIsQ0FBQTtHQUh0QixnQ0FBZ0MsQ0FlNUMifQ==