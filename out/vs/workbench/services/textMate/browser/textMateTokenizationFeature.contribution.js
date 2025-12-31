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
import { ITextMateTokenizationService } from './textMateTokenizationFeature.js';
import { TextMateTokenizationFeature } from './textMateTokenizationFeatureImpl.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
/**
 * Makes sure the ITextMateTokenizationService is instantiated
 */
let TextMateTokenizationInstantiator = class TextMateTokenizationInstantiator {
    static { this.ID = 'workbench.contrib.textMateTokenizationInstantiator'; }
    constructor(_textMateTokenizationService) { }
};
TextMateTokenizationInstantiator = __decorate([
    __param(0, ITextMateTokenizationService)
], TextMateTokenizationInstantiator);
registerSingleton(ITextMateTokenizationService, TextMateTokenizationFeature, 0 /* InstantiationType.Eager */);
registerWorkbenchContribution2(TextMateTokenizationInstantiator.ID, TextMateTokenizationInstantiator, 2 /* WorkbenchPhase.BlockRestore */);
CommandsRegistry.registerCommand('_workbench.colorizeTextMateTokens', async (accessor, resource) => {
    const textModelService = accessor.get(ITextFileService);
    const textModel = resource
        ? (await textModelService.files.resolve(resource)).textEditorModel
        : undefined;
    if (!textModel) {
        throw new Error(`Cannot resolve text model for resource ${resource}`);
    }
    const tokenizer = await TokenizationRegistry.getOrCreate(textModel.getLanguageId());
    if (!tokenizer) {
        throw new Error(`Cannot resolve tokenizer for language ${textModel.getLanguageId()}`);
    }
    const stopwatch = new StopWatch();
    let state = tokenizer.getInitialState();
    for (let i = 1; i <= textModel.getLineCount(); i++) {
        state = tokenizer.tokenizeEncoded(textModel.getLineContent(i), true, state).endState;
    }
    stopwatch.stop();
    return { tokenizeTime: stopwatch.elapsed() };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25GZWF0dXJlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9icm93c2VyL3RleHRNYXRlVG9rZW5pemF0aW9uRmVhdHVyZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUduRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFaEU7O0dBRUc7QUFDSCxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFnQzthQUNyQixPQUFFLEdBQUcsb0RBQW9ELEFBQXZELENBQXVEO0lBRXpFLFlBQytCLDRCQUEwRCxJQUN0RixDQUFDOztBQUxDLGdDQUFnQztJQUluQyxXQUFBLDRCQUE0QixDQUFBO0dBSnpCLGdDQUFnQyxDQU1yQztBQUVELGlCQUFpQixDQUNoQiw0QkFBNEIsRUFDNUIsMkJBQTJCLGtDQUUzQixDQUFBO0FBRUQsOEJBQThCLENBQzdCLGdDQUFnQyxDQUFDLEVBQUUsRUFDbkMsZ0NBQWdDLHNDQUVoQyxDQUFBO0FBRUQsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQixtQ0FBbUMsRUFDbkMsS0FBSyxFQUFFLFFBQTBCLEVBQUUsUUFBYyxFQUFxQyxFQUFFO0lBQ3ZGLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3ZELE1BQU0sU0FBUyxHQUFHLFFBQVE7UUFDekIsQ0FBQyxDQUFDLENBQUMsTUFBTSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZTtRQUNsRSxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ1osSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sb0JBQW9CLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO0lBQ25GLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxTQUFTLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO0lBQ2pDLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDcEQsS0FBSyxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFBO0lBQ3JGLENBQUM7SUFDRCxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDaEIsT0FBTyxFQUFFLFlBQVksRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQTtBQUM3QyxDQUFDLENBQ0QsQ0FBQSJ9