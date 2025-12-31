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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
import { SimpleCommentEditor } from './simpleCommentEditor.js';
let CommentsInputContentProvider = class CommentsInputContentProvider extends Disposable {
    static { this.ID = 'comments.input.contentProvider'; }
    constructor(textModelService, codeEditorService, _modelService, _languageService) {
        super();
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._register(textModelService.registerTextModelContentProvider(Schemas.commentsInput, this));
        this._register(codeEditorService.registerCodeEditorOpenHandler(async (input, editor, _sideBySide) => {
            if (!(editor instanceof SimpleCommentEditor)) {
                return null;
            }
            if (editor.getModel()?.uri.toString() !== input.resource.toString()) {
                return null;
            }
            if (input.options) {
                applyTextEditorOptions(input.options, editor, 1 /* ScrollType.Immediate */);
            }
            return editor;
        }));
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        return (existing ??
            this._modelService.createModel('', this._languageService.createById('markdown'), resource));
    }
};
CommentsInputContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, ICodeEditorService),
    __param(2, IModelService),
    __param(3, ILanguageService)
], CommentsInputContentProvider);
export { CommentsInputContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNJbnB1dENvbnRlbnRQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudHNJbnB1dENvbnRlbnRQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRzVELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFFOUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFdkQsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFDWixTQUFRLFVBQVU7YUFHSyxPQUFFLEdBQUcsZ0NBQWdDLEFBQW5DLENBQW1DO0lBRTVELFlBQ29CLGdCQUFtQyxFQUNsQyxpQkFBcUMsRUFDekIsYUFBNEIsRUFDekIsZ0JBQWtDO1FBRXJFLEtBQUssRUFBRSxDQUFBO1FBSHlCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFHckUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFOUYsSUFBSSxDQUFDLFNBQVMsQ0FDYixpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FDOUMsS0FBSyxFQUNKLEtBQStCLEVBQy9CLE1BQTBCLEVBQzFCLFdBQXFCLEVBQ1MsRUFBRTtZQUNoQyxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksbUJBQW1CLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUNyRSxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLCtCQUF1QixDQUFBO1lBQ3BFLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUMsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQWE7UUFDckMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEQsT0FBTyxDQUNOLFFBQVE7WUFDUixJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FDMUYsQ0FBQTtJQUNGLENBQUM7O0FBN0NXLDRCQUE0QjtJQU90QyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGdCQUFnQixDQUFBO0dBVk4sNEJBQTRCLENBOEN4QyJ9