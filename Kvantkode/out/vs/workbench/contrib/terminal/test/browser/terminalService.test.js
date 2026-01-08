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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQzdCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDcEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUVOLHdCQUF3QixFQUN4QixnQkFBZ0IsR0FDaEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDOUYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakcsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELElBQUksZUFBZ0MsQ0FBQTtJQUNwQyxJQUFJLG9CQUE4QyxDQUFBO0lBQ2xE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