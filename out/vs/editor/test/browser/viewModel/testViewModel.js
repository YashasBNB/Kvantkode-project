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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvdmlld01vZGVsL3Rlc3RWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU3RixNQUFNLFVBQVUsYUFBYSxDQUM1QixJQUFjLEVBQ2QsT0FBdUIsRUFDdkIsUUFBMEQ7SUFFMUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFBO0lBRW5CLE1BQU0sYUFBYSxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDcEQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUM5QyxNQUFNLGtDQUFrQyxHQUFHLGtDQUFrQyxDQUFDLE1BQU0sQ0FDbkYsYUFBYSxDQUFDLE9BQU8sQ0FDckIsQ0FBQTtJQUNELE1BQU0sZ0NBQWdDLEdBQUcsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFBO0lBQy9FLE1BQU0sU0FBUyxHQUFHLElBQUksU0FBUyxDQUM5QixTQUFTLEVBQ1QsYUFBYSxFQUNiLEtBQUssRUFDTCxrQ0FBa0MsRUFDbEMsa0NBQWtDLEVBQ2xDLElBQUssRUFDTCxnQ0FBZ0MsRUFDaEMsSUFBSSxnQkFBZ0IsRUFBRSxFQUN0QjtRQUNDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsVUFBVSxJQUFHLENBQUM7S0FDNUMsRUFDRDtRQUNDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO0tBQzFCLENBQ0QsQ0FBQTtJQUVELFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFFMUIsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ25CLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNmLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN2QixnQ0FBZ0MsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUMzQyxDQUFDIn0=