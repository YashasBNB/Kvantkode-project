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
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IRemoteAgentService, remoteConnectionLatencyMeasurer, } from '../../../services/remote/common/remoteAgentService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Extensions as WorkbenchContributionsExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../base/common/network.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { OpenLocalFileFolderCommand, OpenLocalFileCommand, OpenLocalFolderCommand, SaveLocalFileCommand, RemoteFileDialogContext, } from '../../../services/dialogs/browser/simpleFileDialog.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { TELEMETRY_SETTING_ID } from '../../../../platform/telemetry/common/telemetry.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
let RemoteAgentDiagnosticListener = class RemoteAgentDiagnosticListener {
    constructor(remoteAgentService, labelService) {
        ipcRenderer.on('vscode:getDiagnosticInfo', (event, request) => {
            const connection = remoteAgentService.getConnection();
            if (connection) {
                const hostName = labelService.getHostLabel(Schemas.vscodeRemote, connection.remoteAuthority);
                remoteAgentService
                    .getDiagnosticInfo(request.args)
                    .then((info) => {
                    if (info) {
                        ;
                        info.hostName = hostName;
                        if (remoteConnectionLatencyMeasurer.latency?.high) {
                            ;
                            info.latency = {
                                average: remoteConnectionLatencyMeasurer.latency.average,
                                current: remoteConnectionLatencyMeasurer.latency.current,
                            };
                        }
                    }
                    ipcRenderer.send(request.replyChannel, info);
                })
                    .catch((e) => {
                    const errorMessage = e && e.message
                        ? `Connection to '${hostName}' could not be established  ${e.message}`
                        : `Connection to '${hostName}' could not be established `;
                    ipcRenderer.send(request.replyChannel, { hostName, errorMessage });
                });
            }
            else {
                ipcRenderer.send(request.replyChannel);
            }
        });
    }
};
RemoteAgentDiagnosticListener = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ILabelService)
], RemoteAgentDiagnosticListener);
let RemoteExtensionHostEnvironmentUpdater = class RemoteExtensionHostEnvironmentUpdater {
    constructor(remoteAgentService, remoteResolverService, extensionService) {
        const connection = remoteAgentService.getConnection();
        if (connection) {
            connection.onDidStateChange(async (e) => {
                if (e.type === 4 /* PersistentConnectionEventType.ConnectionGain */) {
                    const resolveResult = await remoteResolverService.resolveAuthority(connection.remoteAuthority);
                    if (resolveResult.options && resolveResult.options.extensionHostEnv) {
                        await extensionService.setRemoteEnvironment(resolveResult.options.extensionHostEnv);
                    }
                }
            });
        }
    }
};
RemoteExtensionHostEnvironmentUpdater = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IRemoteAuthorityResolverService),
    __param(2, IExtensionService)
], RemoteExtensionHostEnvironmentUpdater);
let RemoteTelemetryEnablementUpdater = class RemoteTelemetryEnablementUpdater extends Disposable {
    static { this.ID = 'workbench.contrib.remoteTelemetryEnablementUpdater'; }
    constructor(remoteAgentService, configurationService) {
        super();
        this.remoteAgentService = remoteAgentService;
        this.configurationService = configurationService;
        this.updateRemoteTelemetryEnablement();
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(TELEMETRY_SETTING_ID)) {
                this.updateRemoteTelemetryEnablement();
            }
        }));
    }
    updateRemoteTelemetryEnablement() {
        return this.remoteAgentService.updateTelemetryLevel(getTelemetryLevel(this.configurationService));
    }
};
RemoteTelemetryEnablementUpdater = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IConfigurationService)
], RemoteTelemetryEnablementUpdater);
let RemoteEmptyWorkbenchPresentation = class RemoteEmptyWorkbenchPresentation extends Disposable {
    static { this.ID = 'workbench.contrib.remoteEmptyWorkbenchPresentation'; }
    constructor(environmentService, remoteAuthorityResolverService, configurationService, commandService, contextService) {
        super();
        function shouldShowExplorer() {
            const startupEditor = configurationService.getValue('workbench.startupEditor');
            return startupEditor !== 'welcomePage' && startupEditor !== 'welcomePageInEmptyWorkbench';
        }
        function shouldShowTerminal() {
            return shouldShowExplorer();
        }
        const { remoteAuthority, filesToDiff, filesToMerge, filesToOpenOrCreate, filesToWait } = environmentService;
        if (remoteAuthority &&
            contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ &&
            !filesToDiff?.length &&
            !filesToMerge?.length &&
            !filesToOpenOrCreate?.length &&
            !filesToWait) {
            remoteAuthorityResolverService.resolveAuthority(remoteAuthority).then(() => {
                if (shouldShowExplorer()) {
                    commandService.executeCommand('workbench.view.explorer');
                }
                if (shouldShowTerminal()) {
                    commandService.executeCommand('workbench.action.terminal.toggleTerminal');
                }
            });
        }
    }
};
RemoteEmptyWorkbenchPresentation = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IRemoteAuthorityResolverService),
    __param(2, IConfigurationService),
    __param(3, ICommandService),
    __param(4, IWorkspaceContextService)
], RemoteEmptyWorkbenchPresentation);
/**
 * Sets the 'wslFeatureInstalled' context key if the WSL feature is or was installed on this machine.
 */
let WSLContextKeyInitializer = class WSLContextKeyInitializer extends Disposable {
    static { this.ID = 'workbench.contrib.wslContextKeyInitializer'; }
    constructor(contextKeyService, nativeHostService, storageService, lifecycleService) {
        super();
        const contextKeyId = 'wslFeatureInstalled';
        const storageKey = 'remote.wslFeatureInstalled';
        const defaultValue = storageService.getBoolean(storageKey, -1 /* StorageScope.APPLICATION */, undefined);
        const hasWSLFeatureContext = new RawContextKey(contextKeyId, !!defaultValue, nls.localize('wslFeatureInstalled', 'Whether the platform has the WSL feature installed'));
        const contextKey = hasWSLFeatureContext.bindTo(contextKeyService);
        if (defaultValue === undefined) {
            lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(async () => {
                nativeHostService.hasWSLFeatureInstalled().then((res) => {
                    if (res) {
                        contextKey.set(true);
                        // once detected, set to true
                        storageService.store(storageKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                    }
                });
            });
        }
    }
};
WSLContextKeyInitializer = __decorate([
    __param(0, IContextKeyService),
    __param(1, INativeHostService),
    __param(2, IStorageService),
    __param(3, ILifecycleService)
], WSLContextKeyInitializer);
const workbenchContributionsRegistry = Registry.as(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteAgentDiagnosticListener, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteExtensionHostEnvironmentUpdater, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(RemoteTelemetryEnablementUpdater.ID, RemoteTelemetryEnablementUpdater, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(RemoteEmptyWorkbenchPresentation.ID, RemoteEmptyWorkbenchPresentation, 2 /* WorkbenchPhase.BlockRestore */);
if (isWindows) {
    registerWorkbenchContribution2(WSLContextKeyInitializer.ID, WSLContextKeyInitializer, 2 /* WorkbenchPhase.BlockRestore */);
}
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'remote',
    title: nls.localize('remote', 'Remote'),
    type: 'object',
    properties: {
        'remote.downloadExtensionsLocally': {
            type: 'boolean',
            markdownDescription: nls.localize('remote.downloadExtensionsLocally', 'When enabled extensions are downloaded locally and installed on remote.'),
            default: false,
        },
    },
});
if (isMacintosh) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFileFolderCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFileFolderCommand.LABEL, args: [] },
        handler: OpenLocalFileFolderCommand.handler(),
    });
}
else {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFileCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFileCommand.LABEL, args: [] },
        handler: OpenLocalFileCommand.handler(),
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFolderCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */),
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFolderCommand.LABEL, args: [] },
        handler: OpenLocalFolderCommand.handler(),
    });
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: SaveLocalFileCommand.ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 49 /* KeyCode.KeyS */,
    when: RemoteFileDialogContext,
    metadata: { description: SaveLocalFileCommand.LABEL, args: [] },
    handler: SaveLocalFileCommand.handler(),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9lbGVjdHJvbi1zYW5kYm94L3JlbW90ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwrQkFBK0IsR0FDL0IsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RSxPQUFPLEVBQVUsUUFBUSxFQUFXLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFJTixVQUFVLElBQUksZ0NBQWdDLEVBQzlDLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFLeEYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFFekgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FDckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMvRyxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLG9CQUFvQixFQUNwQixzQkFBc0IsRUFDdEIsb0JBQW9CLEVBQ3BCLHVCQUF1QixHQUN2QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMzRixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE2QjtJQUNsQyxZQUNzQixrQkFBdUMsRUFDN0MsWUFBMkI7UUFFMUMsV0FBVyxDQUFDLEVBQUUsQ0FDYiwwQkFBMEIsRUFDMUIsQ0FBQyxLQUFjLEVBQUUsT0FBK0QsRUFBUSxFQUFFO1lBQ3pGLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3JELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQ3pDLE9BQU8sQ0FBQyxZQUFZLEVBQ3BCLFVBQVUsQ0FBQyxlQUFlLENBQzFCLENBQUE7Z0JBQ0Qsa0JBQWtCO3FCQUNoQixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO3FCQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDZCxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUNWLENBQUM7d0JBQUMsSUFBOEIsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO3dCQUNwRCxJQUFJLCtCQUErQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQzs0QkFDbkQsQ0FBQzs0QkFBQyxJQUE4QixDQUFDLE9BQU8sR0FBRztnQ0FDMUMsT0FBTyxFQUFFLCtCQUErQixDQUFDLE9BQU8sQ0FBQyxPQUFPO2dDQUN4RCxPQUFPLEVBQUUsK0JBQStCLENBQUMsT0FBTyxDQUFDLE9BQU87NkJBQ3hELENBQUE7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO29CQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDN0MsQ0FBQyxDQUFDO3FCQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUNaLE1BQU0sWUFBWSxHQUNqQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU87d0JBQ2IsQ0FBQyxDQUFDLGtCQUFrQixRQUFRLCtCQUErQixDQUFDLENBQUMsT0FBTyxFQUFFO3dCQUN0RSxDQUFDLENBQUMsa0JBQWtCLFFBQVEsNkJBQTZCLENBQUE7b0JBQzNELFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFBO2dCQUNuRSxDQUFDLENBQUMsQ0FBQTtZQUNKLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFDSyw2QkFBNkI7SUFFaEMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtHQUhWLDZCQUE2QixDQTBDbEM7QUFFRCxJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUFxQztJQUMxQyxZQUNzQixrQkFBdUMsRUFDM0IscUJBQXNELEVBQ3BFLGdCQUFtQztRQUV0RCxNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNyRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3ZDLElBQUksQ0FBQyxDQUFDLElBQUkseURBQWlELEVBQUUsQ0FBQztvQkFDN0QsTUFBTSxhQUFhLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FDakUsVUFBVSxDQUFDLGVBQWUsQ0FDMUIsQ0FBQTtvQkFDRCxJQUFJLGFBQWEsQ0FBQyxPQUFPLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUNyRSxNQUFNLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtvQkFDcEYsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFwQksscUNBQXFDO0lBRXhDLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSwrQkFBK0IsQ0FBQTtJQUMvQixXQUFBLGlCQUFpQixDQUFBO0dBSmQscUNBQXFDLENBb0IxQztBQUVELElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWlDLFNBQVEsVUFBVTthQUN4QyxPQUFFLEdBQUcsb0RBQW9ELEFBQXZELENBQXVEO0lBRXpFLFlBQ3VDLGtCQUF1QyxFQUNyQyxvQkFBMkM7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFIK0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSW5GLElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFBO1FBRXRDLElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xELElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLCtCQUErQjtRQUN0QyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FDbEQsaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQzVDLENBQUE7SUFDRixDQUFDOztBQXhCSSxnQ0FBZ0M7SUFJbkMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0dBTGxCLGdDQUFnQyxDQXlCckM7QUFFRCxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7YUFDeEMsT0FBRSxHQUFHLG9EQUFvRCxBQUF2RCxDQUF1RDtJQUV6RSxZQUNxQyxrQkFBc0QsRUFFMUYsOEJBQStELEVBQ3hDLG9CQUEyQyxFQUNqRCxjQUErQixFQUN0QixjQUF3QztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLFNBQVMsa0JBQWtCO1lBQzFCLE1BQU0sYUFBYSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyx5QkFBeUIsQ0FBQyxDQUFBO1lBQ3RGLE9BQU8sYUFBYSxLQUFLLGFBQWEsSUFBSSxhQUFhLEtBQUssNkJBQTZCLENBQUE7UUFDMUYsQ0FBQztRQUVELFNBQVMsa0JBQWtCO1lBQzFCLE9BQU8sa0JBQWtCLEVBQUUsQ0FBQTtRQUM1QixDQUFDO1FBRUQsTUFBTSxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxHQUNyRixrQkFBa0IsQ0FBQTtRQUNuQixJQUNDLGVBQWU7WUFDZixjQUFjLENBQUMsaUJBQWlCLEVBQUUsaUNBQXlCO1lBQzNELENBQUMsV0FBVyxFQUFFLE1BQU07WUFDcEIsQ0FBQyxZQUFZLEVBQUUsTUFBTTtZQUNyQixDQUFDLG1CQUFtQixFQUFFLE1BQU07WUFDNUIsQ0FBQyxXQUFXLEVBQ1gsQ0FBQztZQUNGLDhCQUE4QixDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQzFFLElBQUksa0JBQWtCLEVBQUUsRUFBRSxDQUFDO29CQUMxQixjQUFjLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLENBQUE7Z0JBQ3pELENBQUM7Z0JBQ0QsSUFBSSxrQkFBa0IsRUFBRSxFQUFFLENBQUM7b0JBQzFCLGNBQWMsQ0FBQyxjQUFjLENBQUMsMENBQTBDLENBQUMsQ0FBQTtnQkFDMUUsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7O0FBekNJLGdDQUFnQztJQUluQyxXQUFBLGtDQUFrQyxDQUFBO0lBQ2xDLFdBQUEsK0JBQStCLENBQUE7SUFFL0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsd0JBQXdCLENBQUE7R0FUckIsZ0NBQWdDLENBMENyQztBQUVEOztHQUVHO0FBQ0gsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO2FBQ2hDLE9BQUUsR0FBRyw0Q0FBNEMsQUFBL0MsQ0FBK0M7SUFFakUsWUFDcUIsaUJBQXFDLEVBQ3JDLGlCQUFxQyxFQUN4QyxjQUErQixFQUM3QixnQkFBbUM7UUFFdEQsS0FBSyxFQUFFLENBQUE7UUFFUCxNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQTtRQUMxQyxNQUFNLFVBQVUsR0FBRyw0QkFBNEIsQ0FBQTtRQUUvQyxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDLFVBQVUscUNBQTRCLFNBQVMsQ0FBQyxDQUFBO1FBRS9GLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxhQUFhLENBQzdDLFlBQVksRUFDWixDQUFDLENBQUMsWUFBWSxFQUNkLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsb0RBQW9ELENBQUMsQ0FDekYsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRWpFLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLGdCQUFnQixDQUFDLElBQUksbUNBQTJCLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNoRSxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO29CQUN2RCxJQUFJLEdBQUcsRUFBRSxDQUFDO3dCQUNULFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQ3BCLDZCQUE2Qjt3QkFDN0IsY0FBYyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxtRUFBa0QsQ0FBQTtvQkFDeEYsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7O0FBbENJLHdCQUF3QjtJQUkzQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0dBUGQsd0JBQXdCLENBbUM3QjtBQUVELE1BQU0sOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDakQsZ0NBQWdDLENBQUMsU0FBUyxDQUMxQyxDQUFBO0FBQ0QsOEJBQThCLENBQUMsNkJBQTZCLENBQzNELDZCQUE2QixvQ0FFN0IsQ0FBQTtBQUNELDhCQUE4QixDQUFDLDZCQUE2QixDQUMzRCxxQ0FBcUMsb0NBRXJDLENBQUE7QUFDRCw4QkFBOEIsQ0FDN0IsZ0NBQWdDLENBQUMsRUFBRSxFQUNuQyxnQ0FBZ0Msc0NBRWhDLENBQUE7QUFDRCw4QkFBOEIsQ0FDN0IsZ0NBQWdDLENBQUMsRUFBRSxFQUNuQyxnQ0FBZ0Msc0NBRWhDLENBQUE7QUFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO0lBQ2YsOEJBQThCLENBQzdCLHdCQUF3QixDQUFDLEVBQUUsRUFDM0Isd0JBQXdCLHNDQUV4QixDQUFBO0FBQ0YsQ0FBQztBQUVELFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ2hHLEVBQUUsRUFBRSxRQUFRO0lBQ1osS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUN2QyxJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRTtRQUNYLGtDQUFrQyxFQUFFO1lBQ25DLElBQUksRUFBRSxTQUFTO1lBQ2YsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsa0NBQWtDLEVBQ2xDLHlFQUF5RSxDQUN6RTtZQUNELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLElBQUksV0FBVyxFQUFFLENBQUM7SUFDakIsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLDBCQUEwQixDQUFDLEVBQUU7UUFDakMsTUFBTSw2Q0FBbUM7UUFDekMsT0FBTyxFQUFFLGlEQUE2QjtRQUN0QyxJQUFJLEVBQUUsdUJBQXVCO1FBQzdCLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSwwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtRQUNyRSxPQUFPLEVBQUUsMEJBQTBCLENBQUMsT0FBTyxFQUFFO0tBQzdDLENBQUMsQ0FBQTtBQUNILENBQUM7S0FBTSxDQUFDO0lBQ1AsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7UUFDM0IsTUFBTSw2Q0FBbUM7UUFDekMsT0FBTyxFQUFFLGlEQUE2QjtRQUN0QyxJQUFJLEVBQUUsdUJBQXVCO1FBQzdCLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtRQUMvRCxPQUFPLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxFQUFFO0tBQ3ZDLENBQUMsQ0FBQTtJQUNGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1FBQ3BELEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFO1FBQzdCLE1BQU0sNkNBQW1DO1FBQ3pDLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLEVBQUUsaURBQTZCLENBQUM7UUFDL0UsSUFBSSxFQUFFLHVCQUF1QjtRQUM3QixRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7UUFDakUsT0FBTyxFQUFFLHNCQUFzQixDQUFDLE9BQU8sRUFBRTtLQUN6QyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7SUFDM0IsTUFBTSw2Q0FBbUM7SUFDekMsT0FBTyxFQUFFLG1EQUE2Qix3QkFBZTtJQUNyRCxJQUFJLEVBQUUsdUJBQXVCO0lBQzdCLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtJQUMvRCxPQUFPLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxFQUFFO0NBQ3ZDLENBQUMsQ0FBQSJ9