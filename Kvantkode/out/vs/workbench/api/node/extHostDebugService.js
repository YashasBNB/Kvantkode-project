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
import { createCancelablePromise, disposableTimeout, firstParallel, RunOnceScheduler, timeout, } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import * as nls from '../../../nls.js';
import { LinuxExternalTerminalService, MacExternalTerminalService, WindowsExternalTerminalService, } from '../../../platform/externalTerminal/node/externalTerminalService.js';
import { SignService } from '../../../platform/sign/node/signService.js';
import { ExecutableDebugAdapter, NamedPipeDebugAdapter, SocketDebugAdapter, } from '../../contrib/debug/node/debugAdapter.js';
import { hasChildProcesses, prepareCommand } from '../../contrib/debug/node/terminals.js';
import { IExtHostCommands } from '../common/extHostCommands.js';
import { IExtHostConfiguration } from '../common/extHostConfiguration.js';
import { ExtHostDebugServiceBase } from '../common/extHostDebugService.js';
import { IExtHostEditorTabs } from '../common/extHostEditorTabs.js';
import { IExtHostExtensionService } from '../common/extHostExtensionService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { IExtHostTerminalService } from '../common/extHostTerminalService.js';
import { IExtHostTesting } from '../common/extHostTesting.js';
import { DebugAdapterExecutable, DebugAdapterNamedPipeServer, DebugAdapterServer, ThemeIcon, } from '../common/extHostTypes.js';
import { IExtHostVariableResolverProvider } from '../common/extHostVariableResolverService.js';
import { IExtHostWorkspace } from '../common/extHostWorkspace.js';
import { IExtHostTerminalShellIntegration } from '../common/extHostTerminalShellIntegration.js';
let ExtHostDebugService = class ExtHostDebugService extends ExtHostDebugServiceBase {
    constructor(extHostRpcService, workspaceService, extensionService, configurationService, _terminalService, _terminalShellIntegrationService, editorTabs, variableResolver, commands, testing) {
        super(extHostRpcService, workspaceService, extensionService, configurationService, editorTabs, variableResolver, commands, testing);
        this._terminalService = _terminalService;
        this._terminalShellIntegrationService = _terminalShellIntegrationService;
        this._integratedTerminalInstances = new DebugTerminalCollection();
    }
    createDebugAdapter(adapter, session) {
        if (adapter instanceof DebugAdapterExecutable) {
            return new ExecutableDebugAdapter(this.convertExecutableToDto(adapter), session.type);
        }
        else if (adapter instanceof DebugAdapterServer) {
            return new SocketDebugAdapter(this.convertServerToDto(adapter));
        }
        else if (adapter instanceof DebugAdapterNamedPipeServer) {
            return new NamedPipeDebugAdapter(this.convertPipeServerToDto(adapter));
        }
        else {
            return super.createDebugAdapter(adapter, session);
        }
    }
    daExecutableFromPackage(session, extensionRegistry) {
        const dae = ExecutableDebugAdapter.platformAdapterExecutable(extensionRegistry.getAllExtensionDescriptions(), session.type);
        if (dae) {
            return new DebugAdapterExecutable(dae.command, dae.args, dae.options);
        }
        return undefined;
    }
    createSignService() {
        return new SignService();
    }
    async $runInTerminal(args, sessionId) {
        if (args.kind === 'integrated') {
            if (!this._terminalDisposedListener) {
                // React on terminal disposed and check if that is the debug terminal #12956
                this._terminalDisposedListener = this._register(this._terminalService.onDidCloseTerminal((terminal) => {
                    this._integratedTerminalInstances.onTerminalClosed(terminal);
                }));
            }
            const configProvider = await this._configurationService.getConfigProvider();
            const shell = this._terminalService.getDefaultShell(true);
            const shellArgs = this._terminalService.getDefaultShellArgs(true);
            const terminalName = args.title || nls.localize('debug.terminal.title', 'Debug Process');
            const shellConfig = JSON.stringify({ shell, shellArgs });
            let terminal = await this._integratedTerminalInstances.checkout(shellConfig, terminalName);
            let cwdForPrepareCommand;
            let giveShellTimeToInitialize = false;
            if (!terminal) {
                const options = {
                    shellPath: shell,
                    shellArgs: shellArgs,
                    cwd: args.cwd,
                    name: terminalName,
                    iconPath: new ThemeIcon('debug'),
                };
                giveShellTimeToInitialize = true;
                terminal = this._terminalService.createTerminalFromOptions(options, {
                    isFeatureTerminal: true,
                    // Since debug termnials are REPLs, we want shell integration to be enabled.
                    // Ignore isFeatureTerminal when evaluating shell integration enablement.
                    forceShellIntegration: true,
                    useShellEnvironment: true,
                });
                this._integratedTerminalInstances.insert(terminal, shellConfig);
            }
            else {
                cwdForPrepareCommand = args.cwd;
            }
            terminal.show(true);
            const shellProcessId = await terminal.processId;
            if (giveShellTimeToInitialize) {
                // give a new terminal some time to initialize the shell (most recently, #228191)
                // - If shell integration is available, use that as a deterministic signal
                // - Debounce content being written to known when the prompt is available
                // - Give a longer timeout otherwise
                let Timing;
                (function (Timing) {
                    Timing[Timing["DataDebounce"] = 500] = "DataDebounce";
                    Timing[Timing["MaxDelay"] = 5000] = "MaxDelay";
                })(Timing || (Timing = {}));
                const ds = new DisposableStore();
                await new Promise((resolve) => {
                    const scheduler = ds.add(new RunOnceScheduler(resolve, 500 /* Timing.DataDebounce */));
                    ds.add(this._terminalService.onDidWriteTerminalData((e) => {
                        if (e.terminal === terminal) {
                            scheduler.schedule();
                        }
                    }));
                    ds.add(this._terminalShellIntegrationService.onDidChangeTerminalShellIntegration((e) => {
                        if (e.terminal === terminal) {
                            resolve();
                        }
                    }));
                    ds.add(disposableTimeout(resolve, 5000 /* Timing.MaxDelay */));
                });
                ds.dispose();
            }
            else {
                if (terminal.state.isInteractedWith && !terminal.shellIntegration) {
                    terminal.sendText('\u0003'); // Ctrl+C for #106743. Not part of the same command for #107969
                    await timeout(200); // mirroring https://github.com/microsoft/vscode/blob/c67ccc70ece5f472ec25464d3eeb874cfccee9f1/src/vs/workbench/contrib/terminal/browser/terminalInstance.ts#L852-L857
                }
                if (configProvider.getConfiguration('debug.terminal').get('clearBeforeReusing')) {
                    // clear terminal before reusing it
                    let clearCommand;
                    if (shell.indexOf('powershell') >= 0 ||
                        shell.indexOf('pwsh') >= 0 ||
                        shell.indexOf('cmd.exe') >= 0) {
                        clearCommand = 'cls';
                    }
                    else if (shell.indexOf('bash') >= 0) {
                        clearCommand = 'clear';
                    }
                    else if (platform.isWindows) {
                        clearCommand = 'cls';
                    }
                    else {
                        clearCommand = 'clear';
                    }
                    if (terminal.shellIntegration) {
                        const ds = new DisposableStore();
                        const execution = terminal.shellIntegration.executeCommand(clearCommand);
                        await new Promise((resolve) => {
                            ds.add(this._terminalShellIntegrationService.onDidEndTerminalShellExecution((e) => {
                                if (e.execution === execution) {
                                    resolve();
                                }
                            }));
                            ds.add(disposableTimeout(resolve, 500)); // 500ms timeout to ensure we resolve
                        });
                        ds.dispose();
                    }
                    else {
                        terminal.sendText(clearCommand);
                        await timeout(200); // add a small delay to ensure the command is processed, see #240953
                    }
                }
            }
            const command = prepareCommand(shell, args.args, !!args.argsCanBeInterpretedByShell, cwdForPrepareCommand, args.env);
            if (terminal.shellIntegration) {
                terminal.shellIntegration.executeCommand(command);
            }
            else {
                terminal.sendText(command);
            }
            // Mark terminal as unused when its session ends, see #112055
            const sessionListener = this.onDidTerminateDebugSession((s) => {
                if (s.id === sessionId) {
                    this._integratedTerminalInstances.free(terminal);
                    sessionListener.dispose();
                }
            });
            return shellProcessId;
        }
        else if (args.kind === 'external') {
            return runInExternalTerminal(args, await this._configurationService.getConfigProvider());
        }
        return super.$runInTerminal(args, sessionId);
    }
};
ExtHostDebugService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostWorkspace),
    __param(2, IExtHostExtensionService),
    __param(3, IExtHostConfiguration),
    __param(4, IExtHostTerminalService),
    __param(5, IExtHostTerminalShellIntegration),
    __param(6, IExtHostEditorTabs),
    __param(7, IExtHostVariableResolverProvider),
    __param(8, IExtHostCommands),
    __param(9, IExtHostTesting)
], ExtHostDebugService);
export { ExtHostDebugService };
let externalTerminalService = undefined;
function runInExternalTerminal(args, configProvider) {
    if (!externalTerminalService) {
        if (platform.isWindows) {
            externalTerminalService = new WindowsExternalTerminalService();
        }
        else if (platform.isMacintosh) {
            externalTerminalService = new MacExternalTerminalService();
        }
        else if (platform.isLinux) {
            externalTerminalService = new LinuxExternalTerminalService();
        }
        else {
            throw new Error('external terminals not supported on this platform');
        }
    }
    const config = configProvider.getConfiguration('terminal');
    return externalTerminalService.runInTerminal(args.title, args.cwd, args.args, args.env || {}, config.external || {});
}
class DebugTerminalCollection {
    constructor() {
        this._terminalInstances = new Map();
    }
    /**
     * Delay before a new terminal is a candidate for reuse. See #71850
     */
    static { this.minUseDelay = 1000; }
    async checkout(config, name, cleanupOthersByName = false) {
        const entries = [...this._terminalInstances.entries()];
        const promises = entries.map(([terminal, termInfo]) => createCancelablePromise(async (ct) => {
            // Only allow terminals that match the title.  See #123189
            if (terminal.name !== name) {
                return null;
            }
            if (termInfo.lastUsedAt !== -1 && (await hasChildProcesses(await terminal.processId))) {
                return null;
            }
            // important: date check and map operations must be synchronous
            const now = Date.now();
            if (termInfo.lastUsedAt + DebugTerminalCollection.minUseDelay > now ||
                ct.isCancellationRequested) {
                return null;
            }
            if (termInfo.config !== config) {
                if (cleanupOthersByName) {
                    terminal.dispose();
                }
                return null;
            }
            termInfo.lastUsedAt = now;
            return terminal;
        }));
        return await firstParallel(promises, (t) => !!t);
    }
    insert(terminal, termConfig) {
        this._terminalInstances.set(terminal, { lastUsedAt: Date.now(), config: termConfig });
    }
    free(terminal) {
        const info = this._terminalInstances.get(terminal);
        if (info) {
            info.lastUsedAt = -1;
        }
    }
    onTerminalClosed(terminal) {
        this._terminalInstances.delete(terminal);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3REZWJ1Z1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLGdCQUFnQixFQUNoQixPQUFPLEdBQ1AsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBRXRDLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsMEJBQTBCLEVBQzFCLDhCQUE4QixHQUM5QixNQUFNLG9FQUFvRSxDQUFBO0FBRTNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV4RSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHFCQUFxQixFQUNyQixrQkFBa0IsR0FDbEIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDL0QsT0FBTyxFQUF5QixxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBdUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMv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