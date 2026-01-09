/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { ContextMenuService } from '../../../../../../platform/contextview/browser/contextMenuService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILayoutService } from '../../../../../../platform/layout/browser/layoutService.js';
import { ILoggerService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { writeP } from '../../../../terminal/browser/terminalTestHelpers.js';
import { XtermTerminal } from '../../../../terminal/browser/xterm/xtermTerminal.js';
import { BufferContentTracker } from '../../browser/bufferContentTracker.js';
import { ILifecycleService } from '../../../../../services/lifecycle/common/lifecycle.js';
import { TestLayoutService, TestLifecycleService, } from '../../../../../test/browser/workbenchTestServices.js';
import { TestLoggerService } from '../../../../../test/common/workbenchTestServices.js';
import { IAccessibilitySignalService } from '../../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ITerminalConfigurationService } from '../../../../terminal/browser/terminal.js';
import { TerminalConfigurationService } from '../../../../terminal/browser/terminalConfigurationService.js';
const defaultTerminalConfig = {
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontWeightBold: 'normal',
    gpuAcceleration: 'off',
    scrollback: 1000,
    fastScrollSensitivity: 2,
    mouseWheelScrollSensitivity: 1,
    unicodeVersion: '6',
};
suite('Buffer Content Tracker', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let themeService;
    let xterm;
    let capabilities;
    let bufferTracker;
    const prompt = 'vscode-git:(prompt/more-tests)';
    const promptPlusData = 'vscode-git:(prompt/more-tests) ' + 'some data';
    setup(async () => {
        configurationService = new TestConfigurationService({
            terminal: { integrated: defaultTerminalConfig },
        });
        instantiationService = store.add(new TestInstantiationService());
        themeService = new TestThemeService();
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(ITerminalConfigurationService, store.add(instantiationService.createInstance(TerminalConfigurationService)));
        instantiationService.stub(IThemeService, themeService);
        instantiationService.stub(ITerminalLogService, new NullLogService());
        instantiationService.stub(ILoggerService, store.add(new TestLoggerService()));
        instantiationService.stub(IContextMenuService, store.add(instantiationService.createInstance(ContextMenuService)));
        instantiationService.stub(ILifecycleService, store.add(new TestLifecycleService()));
        instantiationService.stub(IContextKeyService, store.add(new MockContextKeyService()));
        instantiationService.stub(IAccessibilitySignalService, {
            playSignal: async () => { },
            isSoundEnabled(signal) {
                return false;
            },
        });
        instantiationService.stub(ILayoutService, new TestLayoutService());
        capabilities = store.add(new TerminalCapabilityStore());
        if (!isWindows) {
            capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, null);
        }
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(instantiationService.createInstance(XtermTerminal, TerminalCtor, {
            cols: 80,
            rows: 30,
            xtermColorProvider: { getBackgroundColor: () => undefined },
            capabilities,
            disableShellIntegrationReporting: true,
        }));
        const container = document.createElement('div');
        xterm.raw.open(container);
        configurationService = new TestConfigurationService({
            terminal: {
                integrated: { tabs: { separator: ' - ', title: '${cwd}', description: '${cwd}' } },
            },
        });
        bufferTracker = store.add(instantiationService.createInstance(BufferContentTracker, xterm));
    });
    test('should not clear the prompt line', async () => {
        assert.strictEqual(bufferTracker.lines.length, 0);
        await writeP(xterm.raw, prompt);
        xterm.clearBuffer();
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
    });
    test('repeated updates should not change the content', async () => {
        assert.strictEqual(bufferTracker.lines.length, 0);
        await writeP(xterm.raw, prompt);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
    });
    test('should add lines in the viewport and scrollback', async () => {
        await writeAndAssertBufferState(promptPlusData, 38, xterm.raw, bufferTracker);
    });
    test('should add lines in the viewport and full scrollback', async () => {
        await writeAndAssertBufferState(promptPlusData, 1030, xterm.raw, bufferTracker);
    });
    test('should refresh viewport', async () => {
        await writeAndAssertBufferState(promptPlusData, 6, xterm.raw, bufferTracker);
        await writeP(xterm.raw, '\x1b[3Ainserteddata');
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [
            promptPlusData,
            promptPlusData,
            `${promptPlusData}inserteddata`,
            promptPlusData,
            promptPlusData,
            promptPlusData,
        ]);
    });
    test('should refresh viewport with full scrollback', async () => {
        const content = `${prompt}\r\n`.repeat(1030).trimEnd();
        await writeP(xterm.raw, content);
        bufferTracker.update();
        await writeP(xterm.raw, '\x1b[4Ainsertion');
        bufferTracker.update();
        const expected = content.split('\r\n');
        expected[1025] = `${prompt}insertion`;
        assert.deepStrictEqual(bufferTracker.lines[1025], `${prompt}insertion`);
    });
    test('should cap the size of the cached lines, removing old lines in favor of new lines', async () => {
        const content = `${prompt}\r\n`.repeat(1036).trimEnd();
        await writeP(xterm.raw, content);
        bufferTracker.update();
        const expected = content.split('\r\n');
        // delete the 6 lines that should be trimmed
        for (let i = 0; i < 6; i++) {
            expected.pop();
        }
        // insert a new character
        await writeP(xterm.raw, '\x1b[2Ainsertion');
        bufferTracker.update();
        expected[1027] = `${prompt}insertion`;
        assert.strictEqual(bufferTracker.lines.length, expected.length);
        assert.deepStrictEqual(bufferTracker.lines, expected);
    });
});
async function writeAndAssertBufferState(data, rows, terminal, bufferTracker) {
    const content = `${data}\r\n`.repeat(rows).trimEnd();
    await writeP(terminal, content);
    bufferTracker.update();
    assert.strictEqual(bufferTracker.lines.length, rows);
    assert.deepStrictEqual(bufferTracker.lines, content.split('\r\n'));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyQ29udGVudFRyYWNrZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2FjY2Vzc2liaWxpdHkvdGVzdC9icm93c2VyL2J1ZmZlckNvbnRlbnRUcmFja2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNsSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUU3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQTtB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