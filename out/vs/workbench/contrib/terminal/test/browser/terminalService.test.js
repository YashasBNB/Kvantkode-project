/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fail } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { ITerminalInstanceService, ITerminalService, } from '../../browser/terminal.js';
import { TerminalService } from '../../browser/terminalService.js';
import { TERMINAL_CONFIG_SECTION } from '../../common/terminal.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Workbench - TerminalService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let terminalService;
    let configurationService;
    let dialogService;
    setup(async () => {
        dialogService = new TestDialogService();
        configurationService = new TestConfigurationService({
            files: {},
            terminal: {
                integrated: {
                    confirmOnKill: 'never',
                },
            },
        });
        const instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService,
        }, store);
        instantiationService.stub(IDialogService, dialogService);
        instantiationService.stub(ITerminalInstanceService, 'getBackend', undefined);
        instantiationService.stub(ITerminalInstanceService, 'getRegisteredBackends', []);
        instantiationService.stub(IRemoteAgentService, 'getConnection', null);
        terminalService = store.add(instantiationService.createInstance(TerminalService));
        instantiationService.stub(ITerminalService, terminalService);
    });
    suite('safeDisposeTerminal', () => {
        let onExitEmitter;
        setup(() => {
            onExitEmitter = store.add(new Emitter());
        });
        test('should not show prompt when confirmOnKill is never', async () => {
            await setConfirmOnKill(configurationService, 'never');
            await terminalService.safeDisposeTerminal({
                target: TerminalLocation.Editor,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
            await terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
        });
        test('should not show prompt when any terminal editor is closed (handled by editor itself)', async () => {
            await setConfirmOnKill(configurationService, 'editor');
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Editor,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
            await setConfirmOnKill(configurationService, 'always');
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Editor,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
        });
        test('should not show prompt when confirmOnKill is editor and panel terminal is closed', async () => {
            await setConfirmOnKill(configurationService, 'editor');
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
        });
        test('should show prompt when confirmOnKill is panel and panel terminal is closed', async () => {
            await setConfirmOnKill(configurationService, 'panel');
            // No child process cases
            dialogService.setConfirmResult({ confirmed: false });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: false,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
            dialogService.setConfirmResult({ confirmed: true });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: false,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
            // Child process cases
            dialogService.setConfirmResult({ confirmed: false });
            await terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                dispose: () => fail(),
            });
            dialogService.setConfirmResult({ confirmed: true });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
        });
        test('should show prompt when confirmOnKill is always and panel terminal is closed', async () => {
            await setConfirmOnKill(configurationService, 'always');
            // No child process cases
            dialogService.setConfirmResult({ confirmed: false });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: false,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
            dialogService.setConfirmResult({ confirmed: true });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: false,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
            // Child process cases
            dialogService.setConfirmResult({ confirmed: false });
            await terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                dispose: () => fail(),
            });
            dialogService.setConfirmResult({ confirmed: true });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined),
            });
        });
    });
});
async function setConfirmOnKill(configurationService, value) {
    await configurationService.setUserConfiguration(TERMINAL_CONFIG_SECTION, { confirmOnKill: value });
    configurationService.onDidChangeConfigurationEmitter.fire({
        affectsConfiguration: () => true,
        affectedKeys: ['terminal.integrated.confirmOnKill'],
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUM3QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3RGLE9BQU8sRUFFTix3QkFBd0IsRUFDeEIsZ0JBQWdCLEdBQ2hCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpHLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLGVBQWdDLENBQUE7SUFDcEMsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJQUFJ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