/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ViewModel } from '../../../common/viewModel/viewModelImpl.js';
import { TestConfiguration } from '../config/testConfiguration.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { createTextModel } from '../../common/testTextModel.js';
import { TestLanguageConfigurationService } from '../../common/modes/testLanguageConfigurationService.js';
import { TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
export function testViewModel(text, options, callback) {
    const EDITOR_ID = 1;
    const configuration = new TestConfiguration(options);
    const model = createTextModel(text.join('\n'));
    const monospaceLineBreaksComputerFactory = MonospaceLineBreaksComputerFactory.create(configuration.options);
    const testLanguageConfigurationService = new TestLanguageConfigurationService();
    const viewModel = new ViewModel(EDITOR_ID, configuration, model, monospaceLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, null, testLanguageConfigurationService, new TestThemeService(), {
        setVisibleLines(visibleLines, stabilized) { },
    }, {
        batchChanges: (cb) => cb(),
    });
    callback(viewModel, model);
    viewModel.dispose();
    model.dispose();
    configuration.dispose();
    testLanguageConfigurationService.dispose();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci92aWV3TW9kZWwvdGVzdFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTdGLE1BQU0sVUFBVSxhQUFhLENBQzVCLElBQWMsRUFDZCxPQUF1QixFQUN2QixRQUEwRDtJQUUxRCxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUE7SUFFbkIsTUFBTSxhQUFhLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzlDLE1BQU0sa0NBQWtDLEdBQUcsa0NBQWtDLENBQUMsTUFBTSxDQUNuRixhQUFhLENBQUMsT0FBTyxDQUNyQixDQUFBO0lBQ0QsTUFBTSxnQ0FBZ0MsR0FBRyxJQUFJLGdDQUFnQyxFQUFFLENBQUE7SUFDL0UsTUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQzlCLFNBQVMsRUFDVCxhQUFhLEVBQ2IsS0FBSyxFQUNMLGtDQUFrQyxFQUNsQyxrQ0FBa0MsRUFDbEMsSUFBSyxFQUNMLGdDQUFnQyxFQUNoQyxJQUFJLGdCQUFnQixFQUFFLEVBQ3RCO1FBQ0MsZUFBZSxDQUFDLFlBQVksRUFBRSxVQUFVLElBQUcsQ0FBQztLQUM1QyxFQUNEO1FBQ0MsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7S0FDMUIsQ0FDRCxDQUFBO0lBRUQsUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUUxQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbkIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2YsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3ZCLGdDQUFnQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0FBQzNDLENBQUMifQ==