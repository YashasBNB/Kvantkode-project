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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNdWx0aURpZmZFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rTXVsdGlEaWZmRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUN0SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQ04sK0JBQStCLEdBRy9CLE1BQU0sb0VBQW9FLENBQUE7QUFFM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFcEYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsaUNBQWlDLENBQUE7QUFFOUUsTUFBTSxPQUFPLDRCQUE2QixTQUFRLHVCQUF1QjthQUMvQyxPQUFFLEdBQVcsd0NBQXdDLENBQUE7SUFDOUUsTUFBTSxDQUFVLE1BQU0sQ0FDckIsb0JBQTJDLEVBQzNDLFFBQWEsRUFDYixJQUF3QixFQUN4QixXQUErQixFQUMvQixnQkFBcUIsRUFDckIsUUFBZ0I7UUFFaEIsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUMvQyxvQkFBb0IsRUFDcEIsZ0JBQWdCLEVBQ2hCLFNBQVMsRUFDVCxRQUFRLENBQ1IsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FDL0Msb0JBQW9CLEVBQ3BCLFFBQVEsRUFDUixTQUFTLEVBQ1QsUUFBUSxDQUNSLENBQUE7UUFDRCxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FDekMsNEJBQTRCLEVBQzVCLElBQUksRUFDSixXQUFXLEVBQ1gsUUFBUSxFQUNSLFFBQVEsRUFDUixRQUFRLENBQ1IsQ0FBQTtJQUNGLENBQUM7O0FBR0ssSUFBTSxrQ0FBa0MsMENBQXhDLE1BQU0sa0NBQ1osU0FBUSxvQkFBb0I7SUFHckIsTUFBTSxDQUFDLFdBQVcsQ0FDeEIscUJBQTRDLEVBQzVDLG9CQUEyQztRQUUzQyxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUNoQyxHQUFHLDZCQUE2QixJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3hHLENBQUE7UUFDRCxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FDekMsb0NBQWtDLEVBQ2xDLGVBQWUsRUFDZixxQkFBcUIsQ0FDckIsQ0FBQTtJQUNGLENBQUM7SUFDRCxZQUNDLGVBQW9CLEVBQ0gscUJBQTRDLEVBQzFDLGlCQUFvQyxFQUV2RCxpQ0FBb0UsRUFDN0MscUJBQTRDLEVBRW5FLCtCQUFnRSxFQUM5QyxnQkFBa0M7UUFFcEQsS0FBSyxDQUNKLGVBQWUsRUFDZixTQUFTLEVBQ1QsU0FBUyxFQUNULElBQUksRUFDSixpQkFBaUIsRUFDakIsaUNBQWlDLEVBQ2pDLHFCQUFxQixFQUNyQiwrQkFBK0IsRUFDL0IsZ0JBQWdCLENBQ2hCLENBQUE7UUFuQmdCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFvQjdELElBQUksQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRUQsWUFBWSxDQUFDLEdBQVE7UUFDcEIsT0FBTyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQU07UUFDN0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtJQUNqRCxDQUFDO0NBQ0QsQ0FBQTtBQWpEWSxrQ0FBa0M7SUFvQjVDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxpQ0FBaUMsQ0FBQTtJQUVqQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsK0JBQStCLENBQUE7SUFFL0IsV0FBQSxnQkFBZ0IsQ0FBQTtHQTFCTixrQ0FBa0MsQ0FpRDlDIn0=