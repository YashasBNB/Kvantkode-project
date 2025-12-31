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
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { TreeSitterTextModelService } from '../../../../editor/common/services/treeSitter/treeSitterParserService.js';
import { ITreeSitterImporter, ITreeSitterParserService, TreeSitterImporter, } from '../../../../editor/common/services/treeSitterParserService.js';
import { ITreeSitterTokenizationFeature } from './treeSitterTokenizationFeature.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { TreeSitterTokenizationRegistry } from '../../../../editor/common/languages.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
/**
 * Makes sure the ITreeSitterTokenizationService is instantiated
 */
let TreeSitterTokenizationInstantiator = class TreeSitterTokenizationInstantiator {
    static { this.ID = 'workbench.contrib.treeSitterTokenizationInstantiator'; }
    constructor(_treeSitterTokenizationService, _treeSitterTokenizationFeature) { }
};
TreeSitterTokenizationInstantiator = __decorate([
    __param(0, ITreeSitterParserService),
    __param(1, ITreeSitterTokenizationFeature)
], TreeSitterTokenizationInstantiator);
registerSingleton(ITreeSitterImporter, TreeSitterImporter, 0 /* InstantiationType.Eager */);
registerSingleton(ITreeSitterParserService, TreeSitterTextModelService, 0 /* InstantiationType.Eager */);
registerWorkbenchContribution2(TreeSitterTokenizationInstantiator.ID, TreeSitterTokenizationInstantiator, 2 /* WorkbenchPhase.BlockRestore */);
CommandsRegistry.registerCommand('_workbench.colorizeTreeSitterTokens', async (accessor, resource) => {
    const treeSitterParserService = accessor.get(ITreeSitterParserService);
    const textModelService = accessor.get(ITextFileService);
    const textModel = resource
        ? (await textModelService.files.resolve(resource)).textEditorModel
        : undefined;
    if (!textModel) {
        throw new Error(`Cannot resolve text model for resource ${resource}`);
    }
    const tokenizer = await TreeSitterTokenizationRegistry.getOrCreate(textModel.getLanguageId());
    if (!tokenizer) {
        throw new Error(`Cannot resolve tokenizer for language ${textModel.getLanguageId()}`);
    }
    const textModelTreeSitter = await treeSitterParserService.getTextModelTreeSitter(textModel);
    if (!textModelTreeSitter) {
        throw new Error(`Cannot resolve tree sitter parser for language ${textModel.getLanguageId()}`);
    }
    const stopwatch = new StopWatch();
    await textModelTreeSitter.parse();
    stopwatch.stop();
    let captureTime = 0;
    let metadataTime = 0;
    for (let i = 1; i <= textModel.getLineCount(); i++) {
        const result = tokenizer.tokenizeEncodedInstrumented(i, textModel);
        if (result) {
            captureTime += result.captureTime;
            metadataTime += result.metadataTime;
        }
    }
    textModelTreeSitter.dispose();
    textModel.dispose();
    return { parseTime: stopwatch.elapsed(), captureTime, metadataTime };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RyZWVTaXR0ZXIvYnJvd3Nlci90cmVlU2l0dGVyVG9rZW5pemF0aW9uRmVhdHVyZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUNySCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHdCQUF3QixFQUN4QixrQkFBa0IsR0FDbEIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVuRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFaEU7O0dBRUc7QUFDSCxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFrQzthQUN2QixPQUFFLEdBQUcsc0RBQXNELEFBQXpELENBQXlEO0lBRTNFLFlBQzJCLDhCQUF3RCxFQUNsRCw4QkFBOEQsSUFDNUYsQ0FBQzs7QUFOQyxrQ0FBa0M7SUFJckMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLDhCQUE4QixDQUFBO0dBTDNCLGtD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