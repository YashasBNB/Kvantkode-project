/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../../../../platform/dialogs/test/common/testDialogService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { shouldPasteTerminalText } from '../../browser/terminalClipboard.js';
suite('TerminalClipboard', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('shouldPasteTerminalText', () => {
        let instantiationService;
        let configurationService;
        setup(async () => {
            instantiationService = store.add(new TestInstantiationService());
            configurationService = new TestConfigurationService({
                ["terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */]: 'auto',
            });
            instantiationService.stub(IConfigurationService, configurationService);
            instantiationService.stub(IDialogService, new TestDialogService(undefined, { result: { confirmed: false } }));
        });
        function setConfigValue(value) {
            configurationService = new TestConfigurationService({
                ["terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */]: value,
            });
            instantiationService.stub(IConfigurationService, configurationService);
        }
        test('Single line string', async () => {
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo', undefined), true);
            setConfigValue('always');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo', undefined), true);
            setConfigValue('never');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo', undefined), true);
        });
        test('Single line string with trailing new line', async () => {
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\n', undefined), true);
            setConfigValue('always');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\n', undefined), false);
            setConfigValue('never');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\n', undefined), true);
        });
        test('Multi-line string', async () => {
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), false);
            setConfigValue('always');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), false);
            setConfigValue('never');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), true);
        });
        test('Bracketed paste mode', async () => {
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
            setConfigValue('always');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), false);
            setConfigValue('never');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
        });
        test('Legacy config', async () => {
            setConfigValue(true); // 'auto'
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), false);
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
            setConfigValue(false); // 'never'
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
        });
        test('Invalid config', async () => {
            setConfigValue(123);
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), false);
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDbGlwYm9hcmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NsaXBib2FyZC90ZXN0L2Jyb3dzZXIvdGVybWluYWxDbGlwYm9hcmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUUzSCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RSxLQUFLLENBQUMsbUJBQW1CLEVBQUU7SUFDMUIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLElBQUksb0JBQThDLENBQUE7UUFDbEQsSUFBSSxvQkFBOEMsQ0FBQTtRQUVsRCxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDaEIsb0JBQW9CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQTtZQUNoRSxvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixDQUFDO2dCQUNuRCx1R0FBK0MsRUFBRSxNQUFNO2FBQ3ZELENBQUMsQ0FBQTtZQUNGLG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1lBQ3RFLG9CQUFvQixDQUFDLElBQUksQ0FDeEIsY0FBYyxFQUNkLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FDbEUsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsU0FBUyxjQUFjLENBQUMsS0FBYztZQUNyQyxvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixDQUFDO2dCQUNuRCx1R0FBK0MsRUFBRSxLQUFLO2FBQ3RELENBQUMsQ0FBQTtZQUNGLG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7UUFFRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDckMsV0FBVyxDQUNWLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsRUFDcEYsSUFBSSxDQUNKLENBQUE7WUFFRCxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDeEIsV0FBVyxDQUNWLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsRUFDcEYsSUFBSSxDQUNKLENBQUE7WUFFRCxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdkIsV0FBVyxDQUNWLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsRUFDcEYsSUFBSSxDQUNKLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxXQUFXLENBQ1YsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUN0RixJQUFJLENBQ0osQ0FBQTtZQUVELGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN4QixXQUFXLENBQ1YsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUN0RixLQUFLLENBQ0wsQ0FBQTtZQUVELGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN2QixXQUFXLENBQ1YsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUN0RixJQUFJLENBQ0osQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3BDLFdBQVcsQ0FDVixNQUFNLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQ3pGLEtBQUssQ0FDTCxDQUFBO1lBRUQsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3hCLFdBQVcsQ0FDVixNQUFNLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQ3pGLEtBQUssQ0FDTCxDQUFBO1lBRUQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZCLFdBQVcsQ0FDVixNQUFNLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQ3pGLElBQUksQ0FDSixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkMsV0FBVyxDQUNWLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFDcEYsSUFBSSxDQUNKLENBQUE7WUFFRCxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDeEIsV0FBVyxDQUNWLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFDcEYsS0FBSyxDQUNMLENBQUE7WUFFRCxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdkIsV0FBVyxDQUNWLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFDcEYsSUFBSSxDQUNKLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUMsU0FBUztZQUM5QixXQUFXLENBQ1YsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxFQUN6RixLQUFLLENBQ0wsQ0FBQTtZQUNELFdBQVcsQ0FDVixNQUFNLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQ3BGLElBQUksQ0FDSixDQUFBO1lBRUQsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsVUFBVTtZQUNoQyxXQUFXLENBQ1YsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUNwRixJQUFJLENBQ0osQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNuQixXQUFXLENBQ1YsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxFQUN6RixLQUFLLENBQ0wsQ0FBQTtZQUNELFdBQVcsQ0FDVixNQUFNLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQ3BGLElBQUksQ0FDSixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=