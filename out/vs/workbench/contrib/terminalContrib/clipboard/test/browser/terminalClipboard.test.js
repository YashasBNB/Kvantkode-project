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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDbGlwYm9hcmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jbGlwYm9hcmQvdGVzdC9icm93c2VyL3Rlcm1pbmFsQ2xpcGJvYXJkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDdkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFFM0gsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUUsS0FBSyxDQUFDLG1CQUFtQixFQUFFO0lBQzFCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxJQUFJLG9CQUE4QyxDQUFBO1FBQ2xELElBQUksb0JBQThDLENBQUE7UUFFbEQsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ2hCLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUE7WUFDaEUsb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQztnQkFDbkQsdUdBQStDLEVBQUUs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