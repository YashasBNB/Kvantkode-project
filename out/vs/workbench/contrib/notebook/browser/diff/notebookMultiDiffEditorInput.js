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
var NotebookMultiDiffEditorWidgetInput_1;
import { URI } from '../../../../../base/common/uri.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { IMultiDiffSourceResolverService, } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { NotebookDiffEditorInput } from '../../common/notebookDiffEditorInput.js';
import { NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
export const NotebookMultiDiffEditorScheme = 'multi-cell-notebook-diff-editor';
export class NotebookMultiDiffEditorInput extends NotebookDiffEditorInput {
    static { this.ID = 'workbench.input.multiDiffNotebookInput'; }
    static create(instantiationService, resource, name, description, originalResource, viewType) {
        const original = NotebookEditorInput.getOrCreate(instantiationService, originalResource, undefined, viewType);
        const modified = NotebookEditorInput.getOrCreate(instantiationService, resource, undefined, viewType);
        return instantiationService.createInstance(NotebookMultiDiffEditorInput, name, description, original, modified, viewType);
    }
}
let NotebookMultiDiffEditorWidgetInput = NotebookMultiDiffEditorWidgetInput_1 = class NotebookMultiDiffEditorWidgetInput extends MultiDiffEditorInput {
    static createInput(notebookDiffViewModel, instantiationService) {
        const multiDiffSource = URI.parse(`${NotebookMultiDiffEditorScheme}:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
        return instantiationService.createInstance(NotebookMultiDiffEditorWidgetInput_1, multiDiffSource, notebookDiffViewModel);
    }
    constructor(multiDiffSource, notebookDiffViewModel, _textModelService, _textResourceConfigurationService, _instantiationService, _multiDiffSourceResolverService, _textFileService) {
        super(multiDiffSource, undefined, undefined, true, _textModelService, _textResourceConfigurationService, _instantiationService, _multiDiffSourceResolverService, _textFileService);
        this.notebookDiffViewModel = notebookDiffViewModel;
        this._register(_multiDiffSourceResolverService.registerResolver(this));
    }
    canHandleUri(uri) {
        return uri.toString() === this.multiDiffSource.toString();
    }
    async resolveDiffSource(_) {
        return { resources: this.notebookDiffViewModel };
    }
};
NotebookMultiDiffEditorWidgetInput = NotebookMultiDiffEditorWidgetInput_1 = __decorate([
    __param(2, ITextModelService),
    __param(3, ITextResourceConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IMultiDiffSourceResolverService),
    __param(6, ITextFileService)
], NotebookMultiDiffEditorWidgetInput);
export { NotebookMultiDiffEditorWidgetInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNdWx0aURpZmZFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9ub3RlYm9va011bHRpRGlmZkVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDdEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUNOLCtCQUErQixHQUcvQixNQUFNLG9FQUFvRSxDQUFBO0FBRTNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXBGLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGlDQUFpQyxDQUFBO0FBRTlFLE1BQU0sT0FBTyw0QkFBNkIsU0FBUSx1QkFBdUI7YUFDL0MsT0FBRSxHQUFXLHdDQUF3QyxDQUFBO0lBQzlFLE1BQU0sQ0FBVSxNQUFNLENBQ3JCLG9CQUEyQyxFQUMzQyxRQUFhLEVBQ2IsSUFBd0IsRUFDeEIsV0FBK0IsRUFDL0IsZ0JBQXFCLEVBQ3JCLFFBQWdCO1FBRWhCLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FDL0Msb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixTQUFTLEVBQ1QsUUFBUSxDQUNSLENBQUE7UUFDRCxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQy9DLG9CQUFvQixFQUNwQixRQUFRLEVBQ1IsU0FBUyxFQUNULFFBQVEsQ0FDUixDQUFBO1FBQ0QsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLDRCQUE0QixFQUM1QixJQUFJLEVBQ0osV0FBVyxFQUNYLFFBQVEsRUFDUixRQUFRLEVBQ1IsUUFBUSxDQUNSLENBQUE7SUFDRixDQUFDOztBQUdLLElBQU0sa0NBQWtDLDBDQUF4QyxNQUFNLGtDQUNaLFNBQVEsb0JBQW9CO0lBR3JCLE1BQU0sQ0FBQyxXQUFXLENBQ3hCLHFCQUE0QyxFQUM1QyxvQkFBMkM7UUFFM0MsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FDaEMsR0FBRyw2QkFBNkIsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN4RyxDQUFBO1FBQ0QsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLG9DQUFrQyxFQUNsQyxlQUFlLEVBQ2YscUJBQXFCLENBQ3JCLENBQUE7SUFDRixDQUFDO0lBQ0QsWUFDQyxlQUFvQixFQUNILHFCQUE0QyxFQUMxQyxpQkFBb0MsRUFFdkQsaUNBQW9FLEVBQzdDLHFCQUE0QyxFQUVuRSwrQkFBZ0UsRUFDOUMsZ0JBQWtDO1FBRXBELEtBQUssQ0FDSixlQUFlLEVBQ2YsU0FBUyxFQUNULFNBQVMsRUFDVCxJQUFJLEVBQ0osaUJBQWlCLEVBQ2pCLGlDQUFpQyxFQUNqQyxxQkFBcUIsRUFDckIsK0JBQStCLEVBQy9CLGdCQUFnQixDQUNoQixDQUFBO1FBbkJnQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBb0I3RCxJQUFJLENBQUMsU0FBUyxDQUFDLCtCQUErQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVELFlBQVksQ0FBQyxHQUFRO1FBQ3BCLE9BQU8sR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDMUQsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFNO1FBQzdCLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7SUFDakQsQ0FBQztDQUNELENBQUE7QUFqRFksa0NBQWtDO0lBb0I1QyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLCtCQUErQixDQUFBO0lBRS9CLFdBQUEsZ0JBQWdCLENBQUE7R0ExQk4sa0NBQWtDLENBaUQ5QyJ9