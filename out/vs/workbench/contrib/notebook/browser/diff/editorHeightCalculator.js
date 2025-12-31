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
import { UnchangedRegion } from '../../../../../editor/browser/widget/diffEditor/diffEditorViewModel.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { getEditorPadding } from './diffCellEditorOptions.js';
import { HeightOfHiddenLinesRegionInDiffEditor } from './diffElementViewModel.js';
let DiffEditorHeightCalculatorService = class DiffEditorHeightCalculatorService {
    constructor(lineHeight, textModelResolverService, editorWorkerService, configurationService) {
        this.lineHeight = lineHeight;
        this.textModelResolverService = textModelResolverService;
        this.editorWorkerService = editorWorkerService;
        this.configurationService = configurationService;
    }
    async diffAndComputeHeight(original, modified) {
        const [originalModel, modifiedModel] = await Promise.all([
            this.textModelResolverService.createModelReference(original),
            this.textModelResolverService.createModelReference(modified),
        ]);
        try {
            const diffChanges = await this.editorWorkerService
                .computeDiff(original, modified, {
                ignoreTrimWhitespace: true,
                maxComputationTimeMs: 0,
                computeMoves: false,
            }, 'advanced')
                .then((diff) => diff?.changes || []);
            const unchangedRegionFeatureEnabled = this.configurationService.getValue('diffEditor.hideUnchangedRegions.enabled');
            const minimumLineCount = this.configurationService.getValue('diffEditor.hideUnchangedRegions.minimumLineCount');
            const contextLineCount = this.configurationService.getValue('diffEditor.hideUnchangedRegions.contextLineCount');
            const originalLineCount = originalModel.object.textEditorModel.getLineCount();
            const modifiedLineCount = modifiedModel.object.textEditorModel.getLineCount();
            const unchanged = unchangedRegionFeatureEnabled
                ? UnchangedRegion.fromDiffs(diffChanges, originalLineCount, modifiedLineCount, minimumLineCount ?? 3, contextLineCount ?? 3)
                : [];
            const numberOfNewLines = diffChanges.reduce((prev, curr) => {
                if (curr.original.isEmpty && !curr.modified.isEmpty) {
                    return prev + curr.modified.length;
                }
                if (!curr.original.isEmpty &&
                    !curr.modified.isEmpty &&
                    curr.modified.length > curr.original.length) {
                    return prev + curr.modified.length - curr.original.length;
                }
                return prev;
            }, 0);
            const orginalNumberOfLines = originalModel.object.textEditorModel.getLineCount();
            const numberOfHiddenLines = unchanged.reduce((prev, curr) => prev + curr.lineCount, 0);
            const numberOfHiddenSections = unchanged.length;
            const unchangeRegionsHeight = numberOfHiddenSections * HeightOfHiddenLinesRegionInDiffEditor;
            const visibleLineCount = orginalNumberOfLines + numberOfNewLines - numberOfHiddenLines;
            // TODO: When we have a horizontal scrollbar, we need to add 12 to the height.
            // Right now there's no way to determine if a horizontal scrollbar is visible in the editor.
            return (visibleLineCount * this.lineHeight +
                getEditorPadding(visibleLineCount).top +
                getEditorPadding(visibleLineCount).bottom +
                unchangeRegionsHeight);
        }
        finally {
            originalModel.dispose();
            modifiedModel.dispose();
        }
    }
    computeHeightFromLines(lineCount) {
        return (lineCount * this.lineHeight +
            getEditorPadding(lineCount).top +
            getEditorPadding(lineCount).bottom);
    }
};
DiffEditorHeightCalculatorService = __decorate([
    __param(1, ITextModelService),
    __param(2, IEditorWorkerService),
    __param(3, IConfigurationService)
], DiffEditorHeightCalculatorService);
export { DiffEditorHeightCalculatorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9lZGl0b3JIZWlnaHRDYWxjdWxhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQU8xRSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFpQztJQUM3QyxZQUNrQixVQUFrQixFQUNDLHdCQUEyQyxFQUN4QyxtQkFBeUMsRUFDeEMsb0JBQTJDO1FBSGxFLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQW1CO1FBQ3hDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDeEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUNqRixDQUFDO0lBRUcsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFFBQWEsRUFBRSxRQUFhO1FBQzdELE1BQU0sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ3hELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUM7WUFDNUQsSUFBSSxD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