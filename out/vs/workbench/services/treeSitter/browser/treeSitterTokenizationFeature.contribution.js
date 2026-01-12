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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdHJlZVNpdHRlci9icm93c2VyL3RyZWVTaXR0ZXJUb2tlbml6YXRpb25GZWF0dXJlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ3JILE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsd0JBQXdCLEVBQ3hCLGtCQUFrQixHQUNsQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRW5GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRW5GLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRTs7R0FFRztBQUNILElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQWtDO2FBQ3ZCLE9BQUUsR0FBRyxzREFBc0QsQUFBekQsQ0FBeUQ7SUFFM0UsWUFDMkIsOEJBQXdELEVBQ2xELDhCQUE4RCxJQUM1RixDQUFDOztBQU5DLGtDQUFrQztJQUlyQyxXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsOEJBQThCLENBQUE7R0FMM0Isa0NBQWtDLENBT3ZDO0FBRUQsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLGtDQUEwQixDQUFBO0FBQ25GLGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLDBCQUEwQixrQ0FBMEIsQ0FBQTtBQUVoRyw4QkFBOEIsQ0FDN0Isa0NBQWtDLENBQUMsRUFBRSxFQUNyQyxrQ0FBa0Msc0NBRWxDLENBQUE7QUFFRCxnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLHFDQUFxQyxFQUNyQyxLQUFLLEVBQ0osUUFBMEIsRUFDMUIsUUFBYyxFQUM4RCxFQUFFO0lBQzlFLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQ3RFLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3ZELE1BQU0sU0FBUyxHQUFHLFFBQVE7UUFDekIsQ0FBQyxDQUFDLENBQUMsTUFBTSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZTtRQUNsRSxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ1osSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sOEJBQThCLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO0lBQzdGLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxTQUFTLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUM7SUFFRCxNQUFNLG1CQUFtQixHQUFHLE1BQU0sdUJBQXVCLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDM0YsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsU0FBUyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMvRixDQUFDO0lBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQTtJQUNqQyxNQUFNLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2pDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUVoQixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUE7SUFDbkIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFBO0lBQ3BCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNwRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2xFLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixXQUFXLElBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQTtZQUNqQyxZQUFZLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQTtRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUNELG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzdCLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNuQixPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLENBQUE7QUFDckUsQ0FBQyxDQUNELENBQUEifQ==