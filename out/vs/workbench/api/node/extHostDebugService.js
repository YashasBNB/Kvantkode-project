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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0RGVidWdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixnQkFBZ0IsRUFDaEIsT0FBTyxHQUNQLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUV0QyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDBCQUEwQixFQUMxQiw4QkFBOEIsR0FDOUIsTUFBTSxvRUFBb0UsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFeEUsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixxQkFBcUIsRUFDckIsa0JBQWtCLEdBQ2xCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXpGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQy9ELE9BQU8sRUFBeUIscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQXVCLE1BQU0sa0NBQWtDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FB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