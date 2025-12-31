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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcmlnaW5hbENlbGxNb2RlbEZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvaW5saW5lRGlmZi9ub3RlYm9va09yaWdpbmFsQ2VsbE1vZGVsRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWMsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxFQUNmLHFCQUFxQixHQUNyQixNQUFNLGtFQUFrRSxDQUFBO0FBRXpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpGLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLGVBQWUsQ0FDL0QsbUNBQW1DLENBQ25DLENBQUE7QUFZTSxJQUFNLDRDQUE0QyxHQUFsRCxNQUFNLDRDQUE2QyxTQUFRLG1CQUErQjtJQUNoRyxZQUNpQyxZQUEyQixFQUN4QixnQkFBa0M7UUFFckUsS0FBSyxFQUFFLENBQUE7UUFIeUIsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDeEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtJQUd0RSxDQUFDO0lBRWtCLHNCQUFzQixDQUN4QyxJQUFZLEVBQ1osR0FBUSxFQUNSLFNBQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLFFBQWtCO1FBRWxCLE1BQU0sTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sWUFBWSxDQUFBO1FBQ3hDLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQztZQUNwRixDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7WUFDNUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsTUFBTTtnQkFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO2dCQUM5QyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ1IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUNrQix1QkFBdUIsQ0FBQyxJQUFZLEVBQUUsS0FBaUI7UUFDekUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCxDQUFBO0FBM0JZLDRDQUE0QztJQUV0RCxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7R0FITiw0Q0FBNEMsQ0EyQnhEOztBQUVNLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWdDO0lBRzVDLFlBQW1DLG9CQUEyQztRQUM3RSxJQUFJLENBQUMsS0FBSyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFFRCxXQUFXLENBQ1YsR0FBUSxFQUNSLFNBQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLFFBQWtCO1FBRWxCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzlFLENBQUM7Q0FDRCxDQUFBO0FBZlksZ0NBQWdDO0lBRy9CLFdBQUEscUJBQXFCLENBQUE7R0FIdEIsZ0NBQWdDLENBZTVDIn0=