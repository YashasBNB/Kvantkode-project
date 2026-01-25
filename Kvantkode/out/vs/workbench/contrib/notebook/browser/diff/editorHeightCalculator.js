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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2VkaXRvckhlaWdodENhbGN1bGF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzdELE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBTzFFLElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWlDO0lBQzdDLFlBQ2tCLFVBQWtCLEVBQ0Msd0JBQTJDLEVBQ3hDLG1CQUF5QyxFQUN4QyxvQkFBMkM7UUFIbEUsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBbUI7UUFDeEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN4Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBQ2pGLENBQUM7SUFFRyxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBYSxFQUFFLFFBQWE7UUFDN0QsTUFBTSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDeEQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQztZQUM1RCxJ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