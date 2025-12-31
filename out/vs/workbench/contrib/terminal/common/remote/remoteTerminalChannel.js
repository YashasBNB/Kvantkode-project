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
import { IWorkbenchConfigurationService } from '../../../../services/configuration/common/configuration.js';
import { IRemoteAuthorityResolverService } from '../../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { serializeEnvironmentDescriptionMap, serializeEnvironmentVariableCollection, } from '../../../../../platform/terminal/common/environmentVariableShared.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { SideBySideEditor, EditorResourceAccessor } from '../../../../common/editor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IEnvironmentVariableService } from '../environmentVariable.js';
import { ITerminalLogService, } from '../../../../../platform/terminal/common/terminal.js';
import { ConfigurationResolverExpression } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
export const REMOTE_TERMINAL_CHANNEL_NAME = 'remoteterminal';
let RemoteTerminalChannelClient = class RemoteTerminalChannelClient {
    get onPtyHostExit() {
        return this._channel.listen("$onPtyHostExitEvent" /* RemoteTerminalChannelEvent.OnPtyHostExitEvent */);
    }
    get onPtyHostStart() {
        return this._channel.listen("$onPtyHostStartEvent" /* RemoteTerminalChannelEvent.OnPtyHostStartEvent */);
    }
    get onPtyHostUnresponsive() {
        return this._channel.listen("$onPtyHostUnresponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostUnresponsiveEvent */);
    }
    get onPtyHostResponsive() {
        return this._channel.listen("$onPtyHostResponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostResponsiveEvent */);
    }
    get onPtyHostRequestResolveVariables() {
        return this._channel.listen("$onPtyHostRequestResolveVariablesEvent" /* RemoteTerminalChannelEvent.OnPtyHostRequestResolveVariablesEvent */);
    }
    get onProcessData() {
        return this._channel.listen("$onProcessDataEvent" /* RemoteTerminalChannelEvent.OnProcessDataEvent */);
    }
    get onProcessExit() {
        return this._channel.listen("$onProcessExitEvent" /* RemoteTerminalChannelEvent.OnProcessExitEvent */);
    }
    get onProcessReady() {
        return this._channel.listen("$onProcessReadyEvent" /* RemoteTerminalChannelEvent.OnProcessReadyEvent */);
    }
    get onProcessReplay() {
        return this._channel.listen("$onProcessReplayEvent" /* RemoteTerminalChannelEvent.OnProcessReplayEvent */);
    }
    get onProcessOrphanQuestion() {
        return this._channel.listen("$onProcessOrphanQuestion" /* RemoteTerminalChannelEvent.OnProcessOrphanQuestion */);
    }
    get onExecuteCommand() {
        return this._channel.listen("$onExecuteCommand" /* RemoteTerminalChannelEvent.OnExecuteCommand */);
    }
    get onDidRequestDetach() {
        return this._channel.listen("$onDidRequestDetach" /* RemoteTerminalChannelEvent.OnDidRequestDetach */);
    }
    get onDidChangeProperty() {
        return this._channel.listen("$onDidChangeProperty" /* RemoteTerminalChannelEvent.OnDidChangeProperty */);
    }
    constructor(_remoteAuthority, _channel, _configurationService, _workspaceContextService, _resolverService, _environmentVariableService, _remoteAuthorityResolverService, _logService, _editorService, _labelService) {
        this._remoteAuthority = _remoteAuthority;
        this._channel = _channel;
        this._configurationService = _configurationService;
        this._workspaceContextService = _workspaceContextService;
        this._resolverService = _resolverService;
        this._environmentVariableService = _environmentVariableService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._logService = _logService;
        this._editorService = _editorService;
        this._labelService = _labelService;
    }
    restartPtyHost() {
        return this._channel.call("$restartPtyHost" /* RemoteTerminalChannelRequest.RestartPtyHost */, []);
    }
    async createProcess(shellLaunchConfig, configuration, activeWorkspaceRootUri, options, shouldPersistTerminal, cols, rows, unicodeVersion) {
        // Be sure to first wait for the remote configuration
        await this._configurationService.whenRemoteConfigurationLoaded();
        // We will use the resolver service to resolve all the variables in the config / launch config
        // But then we will keep only some variables, since the rest need to be resolved on the remote side
        const resolvedVariables = Object.create(null);
        const lastActiveWorkspace = activeWorkspaceRootUri
            ? (this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined)
            : undefined;
        const expr = ConfigurationResolverExpression.parse({ shellLaunchConfig, configuration });
        try {
            await this._resolverService.resolveAsync(lastActiveWorkspace, expr);
        }
        catch (err) {
            this._logService.error(err);
        }
        for (const [{ inner }, resolved] of expr.resolved()) {
            if (/^config:/.test(inner) || inner === 'selectedText' || inner === 'lineNumber') {
                resolvedVariables[inner] = resolved.value;
            }
        }
        const envVariableCollections = [];
        for (const [k, v] of this._environmentVariableService.collections.entries()) {
            envVariableCollections.push([
                k,
                serializeEnvironmentVariableCollection(v.map),
                serializeEnvironmentDescriptionMap(v.descriptionMap),
            ]);
        }
        const resolverResult = await this._remoteAuthorityResolverService.resolveAuthority(this._remoteAuthority);
        const resolverEnv = resolverResult.options && resolverResult.options.extensionHostEnv;
        const workspace = this._workspaceContextService.getWorkspace();
        const workspaceFolders = workspace.folders;
        const activeWorkspaceFolder = activeWorkspaceRootUri
            ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri)
            : null;
        const activeFileResource = EditorResourceAccessor.getOriginalUri(this._editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
            filterByScheme: [Schemas.file, Schemas.vscodeUserData, Schemas.vscodeRemote],
        });
        const args = {
            configuration,
            resolvedVariables,
            envVariableCollections,
            shellLaunchConfig,
            workspaceId: workspace.id,
            workspaceName: this._labelService.getWorkspaceLabel(workspace),
            workspaceFolders,
            activeWorkspaceFolder,
            activeFileResource,
            shouldPersistTerminal,
            options,
            cols,
            rows,
            unicodeVersion,
            resolverEnv,
        };
        return await this._channel.call("$createProcess" /* RemoteTerminalChannelRequest.CreateProcess */, args);
    }
    requestDetachInstance(workspaceId, instanceId) {
        return this._channel.call("$requestDetachInstance" /* RemoteTerminalChannelRequest.RequestDetachInstance */, [
            workspaceId,
            instanceId,
        ]);
    }
    acceptDetachInstanceReply(requestId, persistentProcessId) {
        return this._channel.call("$acceptDetachInstanceReply" /* RemoteTerminalChannelRequest.AcceptDetachInstanceReply */, [
            requestId,
            persistentProcessId,
        ]);
    }
    attachToProcess(id) {
        return this._channel.call("$attachToProcess" /* RemoteTerminalChannelRequest.AttachToProcess */, [id]);
    }
    detachFromProcess(id, forcePersist) {
        return this._channel.call("$detachFromProcess" /* RemoteTerminalChannelRequest.DetachFromProcess */, [id, forcePersist]);
    }
    listProcesses() {
        return this._channel.call("$listProcesses" /* RemoteTerminalChannelRequest.ListProcesses */);
    }
    getLatency() {
        return this._channel.call("$getLatency" /* RemoteTerminalChannelRequest.GetLatency */);
    }
    getPerformanceMarks() {
        return this._channel.call("$getPerformanceMarks" /* RemoteTerminalChannelRequest.GetPerformanceMarks */);
    }
    reduceConnectionGraceTime() {
        return this._channel.call("$reduceConnectionGraceTime" /* RemoteTerminalChannelRequest.ReduceConnectionGraceTime */);
    }
    processBinary(id, data) {
        return this._channel.call("$processBinary" /* RemoteTerminalChannelRequest.ProcessBinary */, [id, data]);
    }
    start(id) {
        return this._channel.call("$start" /* RemoteTerminalChannelRequest.Start */, [id]);
    }
    input(id, data) {
        return this._channel.call("$input" /* RemoteTerminalChannelRequest.Input */, [id, data]);
    }
    acknowledgeDataEvent(id, charCount) {
        return this._channel.call("$acknowledgeDataEvent" /* RemoteTerminalChannelRequest.AcknowledgeDataEvent */, [id, charCount]);
    }
    setUnicodeVersion(id, version) {
        return this._channel.call("$setUnicodeVersion" /* RemoteTerminalChannelRequest.SetUnicodeVersion */, [id, version]);
    }
    shutdown(id, immediate) {
        return this._channel.call("$shutdown" /* RemoteTerminalChannelRequest.Shutdown */, [id, immediate]);
    }
    resize(id, cols, rows) {
        return this._channel.call("$resize" /* RemoteTerminalChannelRequest.Resize */, [id, cols, rows]);
    }
    clearBuffer(id) {
        return this._channel.call("$clearBuffer" /* RemoteTerminalChannelRequest.ClearBuffer */, [id]);
    }
    getInitialCwd(id) {
        return this._channel.call("$getInitialCwd" /* RemoteTerminalChannelRequest.GetInitialCwd */, [id]);
    }
    getCwd(id) {
        return this._channel.call("$getCwd" /* RemoteTerminalChannelRequest.GetCwd */, [id]);
    }
    orphanQuestionReply(id) {
        return this._channel.call("$orphanQuestionReply" /* RemoteTerminalChannelRequest.OrphanQuestionReply */, [id]);
    }
    sendCommandResult(reqId, isError, payload) {
        return this._channel.call("$sendCommandResult" /* RemoteTerminalChannelRequest.SendCommandResult */, [
            reqId,
            isError,
            payload,
        ]);
    }
    freePortKillProcess(port) {
        return this._channel.call("$freePortKillProcess" /* RemoteTerminalChannelRequest.FreePortKillProcess */, [port]);
    }
    getDefaultSystemShell(osOverride) {
        return this._channel.call("$getDefaultSystemShell" /* RemoteTerminalChannelRequest.GetDefaultSystemShell */, [osOverride]);
    }
    getProfiles(profiles, defaultProfile, includeDetectedProfiles) {
        return this._channel.call("$getProfiles" /* RemoteTerminalChannelRequest.GetProfiles */, [
            this._workspaceContextService.getWorkspace().id,
            profiles,
            defaultProfile,
            includeDetectedProfiles,
        ]);
    }
    acceptPtyHostResolvedVariables(requestId, resolved) {
        return this._channel.call("$acceptPtyHostResolvedVariables" /* RemoteTerminalChannelRequest.AcceptPtyHostResolvedVariables */, [
            requestId,
            resolved,
        ]);
    }
    getEnvironment() {
        return this._channel.call("$getEnvironment" /* RemoteTerminalChannelRequest.GetEnvironment */);
    }
    getWslPath(original, direction) {
        return this._channel.call("$getWslPath" /* RemoteTerminalChannelRequest.GetWslPath */, [original, direction]);
    }
    setTerminalLayoutInfo(layout) {
        const workspace = this._workspaceContextService.getWorkspace();
        const args = {
            workspaceId: workspace.id,
            tabs: layout ? layout.tabs : [],
        };
        return this._channel.call("$setTerminalLayoutInfo" /* RemoteTerminalChannelRequest.SetTerminalLayoutInfo */, args);
    }
    updateTitle(id, title, titleSource) {
        return this._channel.call("$updateTitle" /* RemoteTerminalChannelRequest.UpdateTitle */, [id, title, titleSource]);
    }
    updateIcon(id, userInitiated, icon, color) {
        return this._channel.call("$updateIcon" /* RemoteTerminalChannelRequest.UpdateIcon */, [
            id,
            userInitiated,
            icon,
            color,
        ]);
    }
    refreshProperty(id, property) {
        return this._channel.call("$refreshProperty" /* RemoteTerminalChannelRequest.RefreshProperty */, [id, property]);
    }
    updateProperty(id, property, value) {
        return this._channel.call("$updateProperty" /* RemoteTerminalChannelRequest.UpdateProperty */, [id, property, value]);
    }
    getTerminalLayoutInfo() {
        const workspace = this._workspaceContextService.getWorkspace();
        const args = {
            workspaceId: workspace.id,
        };
        return this._channel.call("$getTerminalLayoutInfo" /* RemoteTerminalChannelRequest.GetTerminalLayoutInfo */, args);
    }
    reviveTerminalProcesses(workspaceId, state, dateTimeFormatLocate) {
        return this._channel.call("$reviveTerminalProcesses" /* RemoteTerminalChannelRequest.ReviveTerminalProcesses */, [
            workspaceId,
            state,
            dateTimeFormatLocate,
        ]);
    }
    getRevivedPtyNewId(id) {
        return this._channel.call("$getRevivedPtyNewId" /* RemoteTerminalChannelRequest.GetRevivedPtyNewId */, [id]);
    }
    serializeTerminalState(ids) {
        return this._channel.call("$serializeTerminalState" /* RemoteTerminalChannelRequest.SerializeTerminalState */, [ids]);
    }
    // #region Pty service contribution RPC calls
    installAutoReply(match, reply) {
        return this._channel.call("$installAutoReply" /* RemoteTerminalChannelRequest.InstallAutoReply */, [match, reply]);
    }
    uninstallAllAutoReplies() {
        return this._channel.call("$uninstallAllAutoReplies" /* RemoteTerminalChannelRequest.UninstallAllAutoReplies */, []);
    }
};
RemoteTerminalChannelClient = __decorate([
    __param(2, IWorkbenchConfigurationService),
    __param(3, IWorkspaceContextService),
    __param(4, IConfigurationResolverService),
    __param(5, IEnvironmentVariableService),
    __param(6, IRemoteAuthorityResolverService),
    __param(7, ITerminalLogService),
    __param(8, IEditorService),
    __param(9, ILabelService)
], RemoteTerminalChannelClient);
export { RemoteTerminalChannelClient };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVybWluYWxDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL3JlbW90ZS9yZW1vdGVUZXJtaW5hbENoYW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDM0csT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDbEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDaEcsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxzQ0FBc0MsR0FDdEMsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUMxSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN2RSxPQUFPLEVBaUJOLG1CQUFtQixHQUVuQixNQUFNLHFEQUFxRCxDQUFBO0FBZTVELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNGQUFzRixDQUFBO0FBRXRJLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGdCQUFnQixDQUFBO0FBcUNyRCxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjtJQUN2QyxJQUFJLGFBQWE7UUFD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