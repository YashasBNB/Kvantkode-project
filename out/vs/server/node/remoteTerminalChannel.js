/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import { Emitter, Event } from '../../base/common/event.js';
import { cloneAndChange } from '../../base/common/objects.js';
import { Disposable } from '../../base/common/lifecycle.js';
import * as path from '../../base/common/path.js';
import * as platform from '../../base/common/platform.js';
import { URI } from '../../base/common/uri.js';
import { createRandomIPCHandle } from '../../base/parts/ipc/node/ipc.net.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { CLIServerBase } from '../../workbench/api/node/extHostCLIServer.js';
import { MergedEnvironmentVariableCollection } from '../../platform/terminal/common/environmentVariableCollection.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection, } from '../../platform/terminal/common/environmentVariableShared.js';
import * as terminalEnvironment from '../../workbench/contrib/terminal/common/terminalEnvironment.js';
import { AbstractVariableResolverService } from '../../workbench/services/configurationResolver/common/variableResolver.js';
import { buildUserEnvironment } from './extensionHostConnection.js';
import { promiseWithResolvers } from '../../base/common/async.js';
import { shouldUseEnvironmentVariableCollection } from '../../platform/terminal/common/terminalEnvironment.js';
class CustomVariableResolver extends AbstractVariableResolverService {
    constructor(env, workspaceFolders, activeFileResource, resolvedVariables, extensionService) {
        super({
            getFolderUri: (folderName) => {
                const found = workspaceFolders.filter((f) => f.name === folderName);
                if (found && found.length > 0) {
                    return found[0].uri;
                }
                return undefined;
            },
            getWorkspaceFolderCount: () => {
                return workspaceFolders.length;
            },
            getConfigurationValue: (folderUri, section) => {
                return resolvedVariables[`config:${section}`];
            },
            getExecPath: () => {
                return env['VSCODE_EXEC_PATH'];
            },
            getAppRoot: () => {
                return env['VSCODE_CWD'];
            },
            getFilePath: () => {
                if (activeFileResource) {
                    return path.normalize(activeFileResource.fsPath);
                }
                return undefined;
            },
            getSelectedText: () => {
                return resolvedVariables['selectedText'];
            },
            getLineNumber: () => {
                return resolvedVariables['lineNumber'];
            },
            getColumnNumber: () => {
                return resolvedVariables['columnNumber'];
            },
            getExtension: async (id) => {
                const installed = await extensionService.getInstalled();
                const found = installed.find((e) => e.identifier.id === id);
                return found && { extensionLocation: found.location };
            },
        }, undefined, Promise.resolve(os.homedir()), Promise.resolve(env));
    }
}
export class RemoteTerminalChannel extends Disposable {
    constructor(_environmentService, _logService, _ptyHostService, _productService, _extensionManagementService, _configurationService) {
        super();
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._ptyHostService = _ptyHostService;
        this._productService = _productService;
        this._extensionManagementService = _extensionManagementService;
        this._configurationService = _configurationService;
        this._lastReqId = 0;
        this._pendingCommands = new Map();
        this._onExecuteCommand = this._register(new Emitter());
        this.onExecuteCommand = this._onExecuteCommand.event;
    }
    async call(ctx, command, args) {
        switch (command) {
            case "$restartPtyHost" /* RemoteTerminalChannelRequest.RestartPtyHost */:
                return this._ptyHostService.restartPtyHost.apply(this._ptyHostService, args);
            case "$createProcess" /* RemoteTerminalChannelRequest.CreateProcess */: {
                const uriTransformer = createURITransformer(ctx.remoteAuthority);
                return this._createProcess(uriTransformer, args);
            }
            case "$attachToProcess" /* RemoteTerminalChannelRequest.AttachToProcess */:
                return this._ptyHostService.attachToProcess.apply(this._ptyHostService, args);
            case "$detachFromProcess" /* RemoteTerminalChannelRequest.DetachFromProcess */:
                return this._ptyHostService.detachFromProcess.apply(this._ptyHostService, args);
            case "$listProcesses" /* RemoteTerminalChannelRequest.ListProcesses */:
                return this._ptyHostService.listProcesses.apply(this._ptyHostService, args);
            case "$getLatency" /* RemoteTerminalChannelRequest.GetLatency */:
                return this._ptyHostService.getLatency.apply(this._ptyHostService, args);
            case "$getPerformanceMarks" /* RemoteTerminalChannelRequest.GetPerformanceMarks */:
                return this._ptyHostService.getPerformanceMarks.apply(this._ptyHostService, args);
            case "$orphanQuestionReply" /* RemoteTerminalChannelRequest.OrphanQuestionReply */:
                return this._ptyHostService.orphanQuestionReply.apply(this._ptyHostService, args);
            case "$acceptPtyHostResolvedVariables" /* RemoteTerminalChannelRequest.AcceptPtyHostResolvedVariables */:
                return this._ptyHostService.acceptPtyHostResolvedVariables.apply(this._ptyHostService, args);
            case "$start" /* RemoteTerminalChannelRequest.Start */:
                return this._ptyHostService.start.apply(this._ptyHostService, args);
            case "$input" /* RemoteTerminalChannelRequest.Input */:
                return this._ptyHostService.input.apply(this._ptyHostService, args);
            case "$acknowledgeDataEvent" /* RemoteTerminalChannelRequest.AcknowledgeDataEvent */:
                return this._ptyHostService.acknowledgeDataEvent.apply(this._ptyHostService, args);
            case "$shutdown" /* RemoteTerminalChannelRequest.Shutdown */:
                return this._ptyHostService.shutdown.apply(this._ptyHostService, args);
            case "$resize" /* RemoteTerminalChannelRequest.Resize */:
                return this._ptyHostService.resize.apply(this._ptyHostService, args);
            case "$clearBuffer" /* RemoteTerminalChannelRequest.ClearBuffer */:
                return this._ptyHostService.clearBuffer.apply(this._ptyHostService, args);
            case "$getInitialCwd" /* RemoteTerminalChannelRequest.GetInitialCwd */:
                return this._ptyHostService.getInitialCwd.apply(this._ptyHostService, args);
            case "$getCwd" /* RemoteTerminalChannelRequest.GetCwd */:
                return this._ptyHostService.getCwd.apply(this._ptyHostService, args);
            case "$processBinary" /* RemoteTerminalChannelRequest.ProcessBinary */:
                return this._ptyHostService.processBinary.apply(this._ptyHostService, args);
            case "$sendCommandResult" /* RemoteTerminalChannelRequest.SendCommandResult */:
                return this._sendCommandResult(args[0], args[1], args[2]);
            case "$installAutoReply" /* RemoteTerminalChannelRequest.InstallAutoReply */:
                return this._ptyHostService.installAutoReply.apply(this._ptyHostService, args);
            case "$uninstallAllAutoReplies" /* RemoteTerminalChannelRequest.UninstallAllAutoReplies */:
                return this._ptyHostService.uninstallAllAutoReplies.apply(this._ptyHostService, args);
            case "$getDefaultSystemShell" /* RemoteTerminalChannelRequest.GetDefaultSystemShell */:
                return this._getDefaultSystemShell.apply(this, args);
            case "$getProfiles" /* RemoteTerminalChannelRequest.GetProfiles */:
                return this._getProfiles.apply(this, args);
            case "$getEnvironment" /* RemoteTerminalChannelRequest.GetEnvironment */:
                return this._getEnvironment();
            case "$getWslPath" /* RemoteTerminalChannelRequest.GetWslPath */:
                return this._getWslPath(args[0], args[1]);
            case "$getTerminalLayoutInfo" /* RemoteTerminalChannelRequest.GetTerminalLayoutInfo */:
                return this._ptyHostService.getTerminalLayoutInfo(args);
            case "$setTerminalLayoutInfo" /* RemoteTerminalChannelRequest.SetTerminalLayoutInfo */:
                return this._ptyHostService.setTerminalLayoutInfo(args);
            case "$serializeTerminalState" /* RemoteTerminalChannelRequest.SerializeTerminalState */:
                return this._ptyHostService.serializeTerminalState.apply(this._ptyHostService, args);
            case "$reviveTerminalProcesses" /* RemoteTerminalChannelRequest.ReviveTerminalProcesses */:
                return this._ptyHostService.reviveTerminalProcesses.apply(this._ptyHostService, args);
            case "$getRevivedPtyNewId" /* RemoteTerminalChannelRequest.GetRevivedPtyNewId */:
                return this._ptyHostService.getRevivedPtyNewId.apply(this._ptyHostService, args);
            case "$setUnicodeVersion" /* RemoteTerminalChannelRequest.SetUnicodeVersion */:
                return this._ptyHostService.setUnicodeVersion.apply(this._ptyHostService, args);
            case "$reduceConnectionGraceTime" /* RemoteTerminalChannelRequest.ReduceConnectionGraceTime */:
                return this._reduceConnectionGraceTime();
            case "$updateIcon" /* RemoteTerminalChannelRequest.UpdateIcon */:
                return this._ptyHostService.updateIcon.apply(this._ptyHostService, args);
            case "$updateTitle" /* RemoteTerminalChannelRequest.UpdateTitle */:
                return this._ptyHostService.updateTitle.apply(this._ptyHostService, args);
            case "$updateProperty" /* RemoteTerminalChannelRequest.UpdateProperty */:
                return this._ptyHostService.updateProperty.apply(this._ptyHostService, args);
            case "$refreshProperty" /* RemoteTerminalChannelRequest.RefreshProperty */:
                return this._ptyHostService.refreshProperty.apply(this._ptyHostService, args);
            case "$requestDetachInstance" /* RemoteTerminalChannelRequest.RequestDetachInstance */:
                return this._ptyHostService.requestDetachInstance(args[0], args[1]);
            case "$acceptDetachedInstance" /* RemoteTerminalChannelRequest.AcceptDetachedInstance */:
                return this._ptyHostService.acceptDetachInstanceReply(args[0], args[1]);
            case "$freePortKillProcess" /* RemoteTerminalChannelRequest.FreePortKillProcess */:
                return this._ptyHostService.freePortKillProcess.apply(this._ptyHostService, args);
            case "$acceptDetachInstanceReply" /* RemoteTerminalChannelRequest.AcceptDetachInstanceReply */:
                return this._ptyHostService.acceptDetachInstanceReply.apply(this._ptyHostService, args);
        }
        // @ts-expect-error Assert command is the `never` type to ensure all messages are handled
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(_, event, arg) {
        switch (event) {
            case "$onPtyHostExitEvent" /* RemoteTerminalChannelEvent.OnPtyHostExitEvent */:
                return this._ptyHostService.onPtyHostExit || Event.None;
            case "$onPtyHostStartEvent" /* RemoteTerminalChannelEvent.OnPtyHostStartEvent */:
                return this._ptyHostService.onPtyHostStart || Event.None;
            case "$onPtyHostUnresponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostUnresponsiveEvent */:
                return this._ptyHostService.onPtyHostUnresponsive || Event.None;
            case "$onPtyHostResponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostResponsiveEvent */:
                return this._ptyHostService.onPtyHostResponsive || Event.None;
            case "$onPtyHostRequestResolveVariablesEvent" /* RemoteTerminalChannelEvent.OnPtyHostRequestResolveVariablesEvent */:
                return this._ptyHostService.onPtyHostRequestResolveVariables || Event.None;
            case "$onProcessDataEvent" /* RemoteTerminalChannelEvent.OnProcessDataEvent */:
                return this._ptyHostService.onProcessData;
            case "$onProcessReadyEvent" /* RemoteTerminalChannelEvent.OnProcessReadyEvent */:
                return this._ptyHostService.onProcessReady;
            case "$onProcessExitEvent" /* RemoteTerminalChannelEvent.OnProcessExitEvent */:
                return this._ptyHostService.onProcessExit;
            case "$onProcessReplayEvent" /* RemoteTerminalChannelEvent.OnProcessReplayEvent */:
                return this._ptyHostService.onProcessReplay;
            case "$onProcessOrphanQuestion" /* RemoteTerminalChannelEvent.OnProcessOrphanQuestion */:
                return this._ptyHostService.onProcessOrphanQuestion;
            case "$onExecuteCommand" /* RemoteTerminalChannelEvent.OnExecuteCommand */:
                return this.onExecuteCommand;
            case "$onDidRequestDetach" /* RemoteTerminalChannelEvent.OnDidRequestDetach */:
                return this._ptyHostService.onDidRequestDetach || Event.None;
            case "$onDidChangeProperty" /* RemoteTerminalChannelEvent.OnDidChangeProperty */:
                return this._ptyHostService.onDidChangeProperty;
        }
        // @ts-expect-error Assert event is the `never` type to ensure all messages are handled
        throw new Error(`IPC Command ${event} not found`);
    }
    async _createProcess(uriTransformer, args) {
        const shellLaunchConfig = {
            name: args.shellLaunchConfig.name,
            executable: args.shellLaunchConfig.executable,
            args: args.shellLaunchConfig.args,
            cwd: typeof args.shellLaunchConfig.cwd === 'string' ||
                typeof args.shellLaunchConfig.cwd === 'undefined'
                ? args.shellLaunchConfig.cwd
                : URI.revive(uriTransformer.transformIncoming(args.shellLaunchConfig.cwd)),
            env: args.shellLaunchConfig.env,
            useShellEnvironment: args.shellLaunchConfig.useShellEnvironment,
            reconnectionProperties: args.shellLaunchConfig.reconnectionProperties,
            type: args.shellLaunchConfig.type,
            isFeatureTerminal: args.shellLaunchConfig.isFeatureTerminal,
            tabActions: args.shellLaunchConfig.tabActions,
            shellIntegrationEnvironmentReporting: args.shellLaunchConfig.shellIntegrationEnvironmentReporting,
        };
        const baseEnv = await buildUserEnvironment(args.resolverEnv, !!args.shellLaunchConfig.useShellEnvironment, platform.language, this._environmentService, this._logService, this._configurationService);
        this._logService.trace('baseEnv', baseEnv);
        const reviveWorkspaceFolder = (workspaceData) => {
            return {
                uri: URI.revive(uriTransformer.transformIncoming(workspaceData.uri)),
                name: workspaceData.name,
                index: workspaceData.index,
                toResource: () => {
                    throw new Error('Not implemented');
                },
            };
        };
        const workspaceFolders = args.workspaceFolders.map(reviveWorkspaceFolder);
        const activeWorkspaceFolder = args.activeWorkspaceFolder
            ? reviveWorkspaceFolder(args.activeWorkspaceFolder)
            : undefined;
        const activeFileResource = args.activeFileResource
            ? URI.revive(uriTransformer.transformIncoming(args.activeFileResource))
            : undefined;
        const customVariableResolver = new CustomVariableResolver(baseEnv, workspaceFolders, activeFileResource, args.resolvedVariables, this._extensionManagementService);
        const variableResolver = terminalEnvironment.createVariableResolver(activeWorkspaceFolder, process.env, customVariableResolver);
        // Get the initial cwd
        const initialCwd = await terminalEnvironment.getCwd(shellLaunchConfig, os.homedir(), variableResolver, activeWorkspaceFolder?.uri, args.configuration['terminal.integrated.cwd'], this._logService);
        shellLaunchConfig.cwd = initialCwd;
        const envPlatformKey = platform.isWindows
            ? 'terminal.integrated.env.windows'
            : platform.isMacintosh
                ? 'terminal.integrated.env.osx'
                : 'terminal.integrated.env.linux';
        const envFromConfig = args.configuration[envPlatformKey];
        const env = await terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfig, variableResolver, this._productService.version, args.configuration['terminal.integrated.detectLocale'], baseEnv);
        // Apply extension environment variable collections to the environment
        if (shouldUseEnvironmentVariableCollection(shellLaunchConfig)) {
            const entries = [];
            for (const [k, v, d] of args.envVariableCollections) {
                entries.push([
                    k,
                    {
                        map: deserializeEnvironmentVariableCollection(v),
                        descriptionMap: deserializeEnvironmentDescriptionMap(d),
                    },
                ]);
            }
            const envVariableCollections = new Map(entries);
            const mergedCollection = new MergedEnvironmentVariableCollection(envVariableCollections);
            const workspaceFolder = activeWorkspaceFolder
                ? (activeWorkspaceFolder ?? undefined)
                : undefined;
            await mergedCollection.applyToProcessEnvironment(env, { workspaceFolder }, variableResolver);
        }
        // Fork the process and listen for messages
        this._logService.debug(`Terminal process launching on remote agent`, {
            shellLaunchConfig,
            initialCwd,
            cols: args.cols,
            rows: args.rows,
            env,
        });
        // Setup the CLI server to support forwarding commands run from the CLI
        const ipcHandlePath = createRandomIPCHandle();
        env.VSCODE_IPC_HOOK_CLI = ipcHandlePath;
        const persistentProcessId = await this._ptyHostService.createProcess(shellLaunchConfig, initialCwd, args.cols, args.rows, args.unicodeVersion, env, baseEnv, args.options, args.shouldPersistTerminal, args.workspaceId, args.workspaceName);
        const commandsExecuter = {
            executeCommand: (id, ...args) => this._executeCommand(persistentProcessId, id, args, uriTransformer),
        };
        const cliServer = new CLIServerBase(commandsExecuter, this._logService, ipcHandlePath);
        this._ptyHostService.onProcessExit((e) => e.id === persistentProcessId && cliServer.dispose());
        return {
            persistentTerminalId: persistentProcessId,
            resolvedShellLaunchConfig: shellLaunchConfig,
        };
    }
    _executeCommand(persistentProcessId, commandId, commandArgs, uriTransformer) {
        const { resolve, reject, promise } = promiseWithResolvers();
        const reqId = ++this._lastReqId;
        this._pendingCommands.set(reqId, { resolve, reject, uriTransformer });
        const serializedCommandArgs = cloneAndChange(commandArgs, (obj) => {
            if (obj && obj.$mid === 1) {
                // this is UriComponents
                return uriTransformer.transformOutgoing(obj);
            }
            if (obj && obj instanceof URI) {
                return uriTransformer.transformOutgoingURI(obj);
            }
            return undefined;
        });
        this._onExecuteCommand.fire({
            reqId,
            persistentProcessId,
            commandId,
            commandArgs: serializedCommandArgs,
        });
        return promise;
    }
    _sendCommandResult(reqId, isError, serializedPayload) {
        const data = this._pendingCommands.get(reqId);
        if (!data) {
            return;
        }
        this._pendingCommands.delete(reqId);
        const payload = cloneAndChange(serializedPayload, (obj) => {
            if (obj && obj.$mid === 1) {
                // this is UriComponents
                return data.uriTransformer.transformIncoming(obj);
            }
            return undefined;
        });
        if (isError) {
            data.reject(payload);
        }
        else {
            data.resolve(payload);
        }
    }
    _getDefaultSystemShell(osOverride) {
        return this._ptyHostService.getDefaultSystemShell(osOverride);
    }
    async _getProfiles(workspaceId, profiles, defaultProfile, includeDetectedProfiles) {
        return (this._ptyHostService.getProfiles(workspaceId, profiles, defaultProfile, includeDetectedProfiles) || []);
    }
    _getEnvironment() {
        return { ...process.env };
    }
    _getWslPath(original, direction) {
        return this._ptyHostService.getWslPath(original, direction);
    }
    _reduceConnectionGraceTime() {
        return this._ptyHostService.reduceConnectionGraceTime();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVybWluYWxDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlVGVybWluYWxDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRCxPQUFPLEtBQUssSUFBSSxNQUFNLDJCQUEyQixDQUFBO0FBQ2pELE9BQU8sS0FBSyxRQUFRLE1BQU0sK0JBQStCLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBWTVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQXFCLE1BQU0sOENBQThDLENBQUE7QUFFL0YsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDckgsT0FBTyxFQUNOLG9DQUFvQyxFQUNwQyx3Q0FBd0MsR0FDeEMsTUFBTSw2REFBNkQsQ0FBQTtBQVFwRSxPQUFPLEtBQUssbUJBQW1CLE1BQU0sZ0VBQWdFLENBQUE7QUFDckcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMkVBQTJFLENBQUE7QUFDM0gsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFNbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRC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