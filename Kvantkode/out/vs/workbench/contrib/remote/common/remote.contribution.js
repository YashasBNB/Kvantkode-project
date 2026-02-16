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
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { isWeb, OS } from '../../../../base/common/platform.js';
import { Schemas } from '../../../../base/common/network.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { localize, localize2 } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { PersistentConnection } from '../../../../platform/remote/common/remoteAgentConnection.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { DownloadServiceChannel } from '../../../../platform/download/common/downloadIpc.js';
import { RemoteLoggerChannelClient } from '../../../../platform/log/common/logIpc.js';
import { REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS } from '../../../../platform/remote/common/remote.js';
import product from '../../../../platform/product/common/product.js';
const EXTENSION_IDENTIFIER_PATTERN = '([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$';
let LabelContribution = class LabelContribution {
    static { this.ID = 'workbench.contrib.remoteLabel'; }
    constructor(labelService, remoteAgentService) {
        this.labelService = labelService;
        this.remoteAgentService = remoteAgentService;
        this.registerFormatters();
    }
    registerFormatters() {
        this.remoteAgentService.getEnvironment().then((remoteEnvironment) => {
            const os = remoteEnvironment?.os || OS;
            const formatting = {
                label: '${path}',
                separator: os === 1 /* OperatingSystem.Windows */ ? '\\' : '/',
                tildify: os !== 1 /* OperatingSystem.Windows */,
                normalizeDriveLetter: os === 1 /* OperatingSystem.Windows */,
                workspaceSuffix: isWeb ? undefined : Schemas.vscodeRemote,
            };
            this.labelService.registerFormatter({
                scheme: Schemas.vscodeRemote,
                formatting,
            });
            if (remoteEnvironment) {
                this.labelService.registerFormatter({
                    scheme: Schemas.vscodeUserData,
                    formatting,
                });
            }
        });
    }
};
LabelContribution = __decorate([
    __param(0, ILabelService),
    __param(1, IRemoteAgentService)
], LabelContribution);
export { LabelContribution };
let RemoteChannelsContribution = class RemoteChannelsContribution extends Disposable {
    constructor(remoteAgentService, downloadService, loggerService) {
        super();
        const connection = remoteAgentService.getConnection();
        if (connection) {
            connection.registerChannel('download', new DownloadServiceChannel(downloadService));
            connection.withChannel('logger', async (channel) => this._register(new RemoteLoggerChannelClient(loggerService, channel)));
        }
    }
};
RemoteChannelsContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IDownloadService),
    __param(2, ILoggerService)
], RemoteChannelsContribution);
let RemoteInvalidWorkspaceDetector = class RemoteInvalidWorkspaceDetector extends Disposable {
    static { this.ID = 'workbench.contrib.remoteInvalidWorkspaceDetector'; }
    constructor(fileService, dialogService, environmentService, contextService, fileDialogService, remoteAgentService) {
        super();
        this.fileService = fileService;
        this.dialogService = dialogService;
        this.environmentService = environmentService;
        this.contextService = contextService;
        this.fileDialogService = fileDialogService;
        // When connected to a remote workspace, we currently cannot
        // validate that the workspace exists before actually opening
        // it. As such, we need to check on that after startup and guide
        // the user to a valid workspace.
        // (see https://github.com/microsoft/vscode/issues/133872)
        if (this.environmentService.remoteAuthority) {
            remoteAgentService.getEnvironment().then((remoteEnv) => {
                if (remoteEnv) {
                    // we use the presence of `remoteEnv` to figure out
                    // if we got a healthy remote connection
                    // (see https://github.com/microsoft/vscode/issues/135331)
                    this.validateRemoteWorkspace();
                }
            });
        }
    }
    async validateRemoteWorkspace() {
        const workspace = this.contextService.getWorkspace();
        const workspaceUriToStat = workspace.configuration ?? workspace.folders.at(0)?.uri;
        if (!workspaceUriToStat) {
            return; // only when in workspace
        }
        const exists = await this.fileService.exists(workspaceUriToStat);
        if (exists) {
            return; // all good!
        }
        const res = await this.dialogService.confirm({
            type: 'warning',
            message: localize('invalidWorkspaceMessage', 'Workspace does not exist'),
            detail: localize('invalidWorkspaceDetail', 'Please select another workspace to open.'),
            primaryButton: localize({ key: 'invalidWorkspacePrimary', comment: ['&& denotes a mnemonic'] }, '&&Open Workspace...'),
        });
        if (res.confirmed) {
            // Pick Workspace
            if (workspace.configuration) {
                return this.fileDialogService.pickWorkspaceAndOpen({});
            }
            // Pick Folder
            return this.fileDialogService.pickFolderAndOpen({});
        }
    }
};
RemoteInvalidWorkspaceDetector = __decorate([
    __param(0, IFileService),
    __param(1, IDialogService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IWorkspaceContextService),
    __param(4, IFileDialogService),
    __param(5, IRemoteAgentService)
], RemoteInvalidWorkspaceDetector);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
registerWorkbenchContribution2(LabelContribution.ID, LabelContribution, 1 /* WorkbenchPhase.BlockStartup */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteChannelsContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(RemoteInvalidWorkspaceDetector.ID, RemoteInvalidWorkspaceDetector, 1 /* WorkbenchPhase.BlockStartup */);
const enableDiagnostics = true;
if (enableDiagnostics) {
    class TriggerReconnectAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.triggerReconnect',
                title: localize2('triggerReconnect', 'Connection: Trigger Reconnect'),
                category: Categories.Developer,
                f1: true,
            });
        }
        async run(accessor) {
            PersistentConnection.debugTriggerReconnection();
        }
    }
    class PauseSocketWriting extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.pauseSocketWriting',
                title: localize2('pauseSocketWriting', 'Connection: Pause socket writing'),
                category: Categories.Developer,
                f1: true,
            });
        }
        async run(accessor) {
            PersistentConnection.debugPauseSocketWriting();
        }
    }
    registerAction2(TriggerReconnectAction);
    registerAction2(PauseSocketWriting);
}
const extensionKindSchema = {
    type: 'string',
    enum: ['ui', 'workspace'],
    enumDescriptions: [
        localize('ui', 'UI extension kind. In a remote window, such extensions are enabled only when available on the local machine.'),
        localize('workspace', 'Workspace extension kind. In a remote window, such extensions are enabled only when available on the remote.'),
    ],
};
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'remote',
    title: localize('remote', 'Remote'),
    type: 'object',
    properties: {
        'remote.extensionKind': {
            type: 'object',
            markdownDescription: localize('remote.extensionKind', "Override the kind of an extension. `ui` extensions are installed and run on the local machine while `workspace` extensions are run on the remote. By overriding an extension's default kind using this setting, you specify if that extension should be installed and enabled locally or remotely."),
            patternProperties: {
                [EXTENSION_IDENTIFIER_PATTERN]: {
                    oneOf: [{ type: 'array', items: extensionKindSchema }, extensionKindSchema],
                    default: ['ui'],
                },
            },
            default: {
                'pub.name': ['ui'],
            },
        },
        'remote.restoreForwardedPorts': {
            type: 'boolean',
            markdownDescription: localize('remote.restoreForwardedPorts', 'Restores the ports you forwarded in a workspace.'),
            default: true,
        },
        'remote.autoForwardPorts': {
            type: 'boolean',
            markdownDescription: localize('remote.autoForwardPorts', 'When enabled, new running processes are detected and ports that they listen on are automatically forwarded. Disabling this setting will not prevent all ports from being forwarded. Even when disabled, extensions will still be able to cause ports to be forwarded, and opening some URLs will still cause ports to forwarded. Also see {0}.', '`#remote.autoForwardPortsSource#`'),
            default: true,
        },
        'remote.autoForwardPortsSource': {
            type: 'string',
            markdownDescription: localize('remote.autoForwardPortsSource', 'Sets the source from which ports are automatically forwarded when {0} is true. When {0} is false, {1} will be used to find information about ports that have already been forwarded. On Windows and macOS remotes, the `process` and `hybrid` options have no effect and `output` will be used.', '`#remote.autoForwardPorts#`', '`#remote.autoForwardPortsSource#`'),
            enum: ['process', 'output', 'hybrid'],
            enumDescriptions: [
                localize('remote.autoForwardPortsSource.process', 'Ports will be automatically forwarded when discovered by watching for processes that are started and include a port.'),
                localize('remote.autoForwardPortsSource.output', 'Ports will be automatically forwarded when discovered by reading terminal and debug output. Not all processes that use ports will print to the integrated terminal or debug console, so some ports will be missed. Ports forwarded based on output will not be "un-forwarded" until reload or until the port is closed by the user in the Ports view.'),
                localize('remote.autoForwardPortsSource.hybrid', 'Ports will be automatically forwarded when discovered by reading terminal and debug output. Not all processes that use ports will print to the integrated terminal or debug console, so some ports will be missed. Ports will be "un-forwarded" by watching for processes that listen on that port to be terminated.'),
            ],
            default: 'process',
        },
        'remote.autoForwardPortsFallback': {
            type: 'number',
            default: 20,
            markdownDescription: localize('remote.autoForwardPortFallback', "The number of auto forwarded ports that will trigger the switch from `process` to `hybrid` when automatically forwarding ports and `remote.autoForwardPortsSource` is set to `process` by default. Set to `0` to disable the fallback. When `remote.autoForwardPortsFallback` hasn't been configured, but `remote.autoForwardPortsSource` has, `remote.autoForwardPortsFallback` will be treated as though it's set to `0`."),
        },
        'remote.forwardOnOpen': {
            type: 'boolean',
            description: localize('remote.forwardOnClick', 'Controls whether local URLs with a port will be forwarded when opened from the terminal and the debug console.'),
            default: true,
        },
        // Consider making changes to extensions\configuration-editing\schemas\devContainer.schema.src.json
        // and extensions\configuration-editing\schemas\attachContainer.schema.json
        // to keep in sync with devcontainer.json schema.
        'remote.portsAttributes': {
            type: 'object',
            patternProperties: {
                '(^\\d+(-\\d+)?$)|(.+)': {
                    type: 'object',
                    description: localize('remote.portsAttributes.port', 'A port, range of ports (ex. "40000-55000"), host and port (ex. "db:1234"), or regular expression (ex. ".+\\\\/server.js").  For a port number or range, the attributes will apply to that port number or range of port numbers. Attributes which use a regular expression will apply to ports whose associated process command line matches the expression.'),
                    properties: {
                        onAutoForward: {
                            type: 'string',
                            enum: ['notify', 'openBrowser', 'openBrowserOnce', 'openPreview', 'silent', 'ignore'],
                            enumDescriptions: [
                                localize('remote.portsAttributes.notify', 'Shows a notification when a port is automatically forwarded.'),
                                localize('remote.portsAttributes.openBrowser', 'Opens the browser when the port is automatically forwarded. Depending on your settings, this could open an embedded browser.'),
                                localize('remote.portsAttributes.openBrowserOnce', 'Opens the browser when the port is automatically forwarded, but only the first time the port is forward during a session. Depending on your settings, this could open an embedded browser.'),
                                localize('remote.portsAttributes.openPreview', 'Opens a preview in the same window when the port is automatically forwarded.'),
                                localize('remote.portsAttributes.silent', 'Shows no notification and takes no action when this port is automatically forwarded.'),
                                localize('remote.portsAttributes.ignore', 'This port will not be automatically forwarded.'),
                            ],
                            description: localize('remote.portsAttributes.onForward', 'Defines the action that occurs when the port is discovered for automatic forwarding'),
                            default: 'notify',
                        },
                        elevateIfNeeded: {
                            type: 'boolean',
                            description: localize('remote.portsAttributes.elevateIfNeeded', 'Automatically prompt for elevation (if needed) when this port is forwarded. Elevate is required if the local port is a privileged port.'),
                            default: false,
                        },
                        label: {
                            type: 'string',
                            description: localize('remote.portsAttributes.label', 'Label that will be shown in the UI for this port.'),
                            default: localize('remote.portsAttributes.labelDefault', 'Application'),
                        },
                        requireLocalPort: {
                            type: 'boolean',
                            markdownDescription: localize('remote.portsAttributes.requireLocalPort', "When true, a modal dialog will show if the chosen local port isn't used for forwarding."),
                            default: false,
                        },
                        protocol: {
                            type: 'string',
                            enum: ['http', 'https'],
                            description: localize('remote.portsAttributes.protocol', 'The protocol to use when forwarding this port.'),
                        },
                    },
                    default: {
                        label: localize('remote.portsAttributes.labelDefault', 'Application'),
                        onAutoForward: 'notify',
                    },
                },
            },
            markdownDescription: localize('remote.portsAttributes', 'Set properties that are applied when a specific port number is forwarded. For example:\n\n```\n"3000": {\n  "label": "Application"\n},\n"40000-55000": {\n  "onAutoForward": "ignore"\n},\n".+\\\\/server.js": {\n "onAutoForward": "openPreview"\n}\n```'),
            defaultSnippets: [
                { body: { '${1:3000}': { label: '${2:Application}', onAutoForward: 'openPreview' } } },
            ],
            errorMessage: localize('remote.portsAttributes.patternError', 'Must be a port number, range of port numbers, or regular expression.'),
            additionalProperties: false,
            default: {
                '443': {
                    protocol: 'https',
                },
                '8443': {
                    protocol: 'https',
                },
            },
        },
        'remote.otherPortsAttributes': {
            type: 'object',
            properties: {
                onAutoForward: {
                    type: 'string',
                    enum: ['notify', 'openBrowser', 'openPreview', 'silent', 'ignore'],
                    enumDescriptions: [
                        localize('remote.portsAttributes.notify', 'Shows a notification when a port is automatically forwarded.'),
                        localize('remote.portsAttributes.openBrowser', 'Opens the browser when the port is automatically forwarded. Depending on your settings, this could open an embedded browser.'),
                        localize('remote.portsAttributes.openPreview', 'Opens a preview in the same window when the port is automatically forwarded.'),
                        localize('remote.portsAttributes.silent', 'Shows no notification and takes no action when this port is automatically forwarded.'),
                        localize('remote.portsAttributes.ignore', 'This port will not be automatically forwarded.'),
                    ],
                    description: localize('remote.portsAttributes.onForward', 'Defines the action that occurs when the port is discovered for automatic forwarding'),
                    default: 'notify',
                },
                elevateIfNeeded: {
                    type: 'boolean',
                    description: localize('remote.portsAttributes.elevateIfNeeded', 'Automatically prompt for elevation (if needed) when this port is forwarded. Elevate is required if the local port is a privileged port.'),
                    default: false,
                },
                label: {
                    type: 'string',
                    description: localize('remote.portsAttributes.label', 'Label that will be shown in the UI for this port.'),
                    default: localize('remote.portsAttributes.labelDefault', 'Application'),
                },
                requireLocalPort: {
                    type: 'boolean',
                    markdownDescription: localize('remote.portsAttributes.requireLocalPort', "When true, a modal dialog will show if the chosen local port isn't used for forwarding."),
                    default: false,
                },
                protocol: {
                    type: 'string',
                    enum: ['http', 'https'],
                    description: localize('remote.portsAttributes.protocol', 'The protocol to use when forwarding this port.'),
                },
            },
            defaultSnippets: [{ body: { onAutoForward: 'ignore' } }],
            markdownDescription: localize('remote.portsAttributes.defaults', 'Set default properties that are applied to all ports that don\'t get properties from the setting {0}. For example:\n\n```\n{\n  "onAutoForward": "ignore"\n}\n```', '`#remote.portsAttributes#`'),
            additionalProperties: false,
        },
        'remote.localPortHost': {
            type: 'string',
            enum: ['localhost', 'allInterfaces'],
            default: 'localhost',
            description: localize('remote.localPortHost', 'Specifies the local host name that will be used for port forwarding.'),
        },
        [REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS]: {
            type: 'array',
            markdownDescription: localize('remote.defaultExtensionsIfInstalledLocally.markdownDescription', 'List of extensions to install upon connection to a remote when already installed locally.'),
            default: product?.remoteDefaultExtensionsIfInstalledLocally || [],
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                patternErrorMessage: localize('remote.defaultExtensionsIfInstalledLocally.invalidFormat', 'Extension identifier must be in format "publisher.name".'),
            },
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2NvbW1vbi9yZW1vdGUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFJTixVQUFVLElBQUksbUJBQW1CLEVBQ2pDLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsYUFBYSxFQUEyQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25HLE9BQU8sRUFBbUIsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FDckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pHLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFBO0FBRXBFLE1BQU0sNEJBQTRCLEdBQUcsMERBQTBELENBQUE7QUFFeEYsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7YUFDYixPQUFFLEdBQUcsK0JBQStCLEFBQWxDLENBQWtDO0lBRXBELFlBQ2lDLFlBQTJCLEVBQ3JCLGtCQUF1QztRQUQ3QyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNyQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBRTdFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEVBQUU7WUFDbkUsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQTtZQUN0QyxNQUFNLFVBQVUsR0FBNEI7Z0JBQzNDLEtBQUssRUFBRSxTQUFTO2dCQUNoQixTQUFTLEVBQUUsRUFBRSxvQ0FBNEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHO2dCQUN0RCxPQUFPLEVBQUUsRUFBRSxvQ0FBNEI7Z0JBQ3ZDLG9CQUFvQixFQUFFLEVBQUUsb0NBQTRCO2dCQUNwRCxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZO2FBQ3pELENBQUE7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO2dCQUNuQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVk7Z0JBQzVCLFVBQVU7YUFDVixDQUFDLENBQUE7WUFFRixJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7b0JBQ25DLE1BQU0sRUFBRSxPQUFPLENBQUMsY0FBYztvQkFDOUIsVUFBVTtpQkFDVixDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDOztBQWhDVyxpQkFBaUI7SUFJM0IsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLG1CQUFtQixDQUFBO0dBTFQsaUJBQWlCLENBaUM3Qjs7QUFFRCxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFDbEQsWUFDc0Isa0JBQXVDLEVBQzFDLGVBQWlDLEVBQ25DLGFBQTZCO1FBRTdDLEtBQUssRUFBRSxDQUFBO1FBQ1AsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDckQsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixVQUFVLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxJQUFJLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7WUFDbkYsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSx5QkFBeUIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FDckUsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWZLLDBCQUEwQjtJQUU3QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxjQUFjLENBQUE7R0FKWCwwQkFBMEIsQ0FlL0I7QUFFRCxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7YUFDdEMsT0FBRSxHQUFHLGtEQUFrRCxBQUFyRCxDQUFxRDtJQUV2RSxZQUNnQyxXQUF5QixFQUN2QixhQUE2QixFQUNmLGtCQUFnRCxFQUNwRCxjQUF3QyxFQUM5QyxpQkFBcUMsRUFDckQsa0JBQXVDO1FBRTVELEtBQUssRUFBRSxDQUFBO1FBUHdCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNmLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBOEI7UUFDcEQsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQzlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFLMUUsNERBQTREO1FBQzVELDZEQUE2RDtRQUM3RCxnRUFBZ0U7UUFDaEUsaUNBQWlDO1FBQ2pDLDBEQUEwRDtRQUMxRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM3QyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFDdEQsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixtREFBbUQ7b0JBQ25ELHdDQUF3QztvQkFDeEMsMERBQTBEO29CQUMxRCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsdUJBQXVCO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDcEQsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsYUFBYSxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQTtRQUNsRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN6QixPQUFNLENBQUMseUJBQXlCO1FBQ2pDLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDaEUsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU0sQ0FBQyxZQUFZO1FBQ3BCLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO1lBQzVDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSwwQkFBMEIsQ0FBQztZQUN4RSxNQUFNLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDBDQUEwQyxDQUFDO1lBQ3RGLGFBQWEsRUFBRSxRQUFRLENBQ3RCLEVBQUUsR0FBRyxFQUFFLHlCQUF5QixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDdEUscUJBQXFCLENBQ3JCO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbkIsaUJBQWlCO1lBQ2pCLElBQUksU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM3QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1lBRUQsY0FBYztZQUNkLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3BELENBQUM7SUFDRixDQUFDOztBQTdESSw4QkFBOEI7SUFJakMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsbUJBQW1CLENBQUE7R0FUaEIsOEJBQThCLENBOERuQztBQUVELE1BQU0sOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDakQsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFBO0FBQ0QsOEJBQThCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLGlCQUFpQixzQ0FBOEIsQ0FBQTtBQUNwRyw4QkFBOEIsQ0FBQyw2QkFBNkIsQ0FDM0QsMEJBQTBCLGtDQUUxQixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLDhCQUE4QixDQUFDLEVBQUUsRUFDakMsOEJBQThCLHNDQUU5QixDQUFBO0FBRUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUE7QUFFOUIsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO0lBQ3ZCLE1BQU0sc0JBQXVCLFNBQVEsT0FBTztRQUMzQztZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsbUNBQW1DO2dCQUN2QyxLQUFLLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLCtCQUErQixDQUFDO2dCQUNyRSxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7Z0JBQzlCLEVBQUUsRUFBRSxJQUFJO2FBQ1IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7WUFDbkMsb0JBQW9CLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUNoRCxDQUFDO0tBQ0Q7SUFFRCxNQUFNLGtCQUFtQixTQUFRLE9BQU87UUFDdkM7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLHFDQUFxQztnQkFDekMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxrQ0FBa0MsQ0FBQztnQkFDMUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO2dCQUM5QixFQUFFLEVBQUUsSUFBSTthQUNSLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1lBQ25DLG9CQUFvQixDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDL0MsQ0FBQztLQUNEO0lBRUQsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFDdkMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDcEMsQ0FBQztBQUVELE1BQU0sbUJBQW1CLEdBQWdCO0lBQ3hDLElBQUksRUFBRSxRQUFRO0lBQ2QsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQztJQUN6QixnQkFBZ0IsRUFBRTtRQUNqQixRQUFRLENBQ1AsSUFBSSxFQUNKLDhHQUE4RyxDQUM5RztRQUNELFFBQVEsQ0FDUCxXQUFXLEVBQ1gsOEdBQThHLENBQzlHO0tBQ0Q7Q0FDRCxDQUFBO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFDaEcsRUFBRSxFQUFFLFFBQVE7SUFDWixLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDbkMsSUFBSSxFQUFFLFFBQVE7SUFDZCxVQUFVLEVBQUU7UUFDWCxzQkFBc0IsRUFBRTtZQUN2QixJQUFJLEVBQUUsUUFBUTtZQUNkLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsc0JBQXNCLEVBQ3RCLG9TQUFvUyxDQUNwUztZQUNELGlCQUFpQixFQUFFO2dCQUNsQixDQUFDLDRCQUE0QixDQUFDLEVBQUU7b0JBQy9CLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQztvQkFDM0UsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDO2lCQUNmO2FBQ0Q7WUFDRCxPQUFPLEVBQUU7Z0JBQ1IsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDO2FBQ2xCO1NBQ0Q7UUFDRCw4QkFBOEIsRUFBRTtZQUMvQixJQUFJLEVBQUUsU0FBUztZQUNmLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsOEJBQThCLEVBQzlCLGtEQUFrRCxDQUNsRDtZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCx5QkFBeUIsRUFBRTtZQUMxQixJQUFJLEVBQUUsU0FBUztZQUNmLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIseUJBQXlCLEVBQ3pCLGdWQUFnVixFQUNoVixtQ0FBbUMsQ0FDbkM7WUFDRCxPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0QsK0JBQStCLEVBQUU7WUFDaEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLCtCQUErQixFQUMvQixpU0FBaVMsRUFDalMsNkJBQTZCLEVBQzdCLG1DQUFtQyxDQUNuQztZQUNELElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO1lBQ3JDLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQ1AsdUNBQXVDLEVBQ3ZDLHNIQUFzSCxDQUN0SDtnQkFDRCxRQUFRLENBQ1Asc0NBQXNDLEVBQ3RDLHVWQUF1VixDQUN2VjtnQkFDRCxRQUFRLENBQ1Asc0NBQXNDLEVBQ3RDLHNUQUFzVCxDQUN0VDthQUNEO1lBQ0QsT0FBTyxFQUFFLFNBQVM7U0FDbEI7UUFDRCxpQ0FBaUMsRUFBRTtZQUNsQyxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxFQUFFO1lBQ1gsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixnQ0FBZ0MsRUFDaEMsNlpBQTZaLENBQzdaO1NBQ0Q7UUFDRCxzQkFBc0IsRUFBRTtZQUN2QixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHVCQUF1QixFQUN2QixnSEFBZ0gsQ0FDaEg7WUFDRCxPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0QsbUdBQW1HO1FBQ25HLDJFQUEyRTtRQUMzRSxpREFBaUQ7UUFDakQsd0JBQXdCLEVBQUU7WUFDekIsSUFBSSxFQUFFLFFBQVE7WUFDZCxpQkFBaUIsRUFBRTtnQkFDbEIsdUJBQXVCLEVBQUU7b0JBQ3hCLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDZCQUE2QixFQUM3Qiw2VkFBNlYsQ0FDN1Y7b0JBQ0QsVUFBVSxFQUFFO3dCQUNYLGFBQWEsRUFBRTs0QkFDZCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDOzRCQUNyRixnQkFBZ0IsRUFBRTtnQ0FDakIsUUFBUSxDQUNQLCtCQUErQixFQUMvQiw4REFBOEQsQ0FDOUQ7Z0NBQ0QsUUFBUSxDQUNQLG9DQUFvQyxFQUNwQyw4SEFBOEgsQ0FDOUg7Z0NBQ0QsUUFBUSxDQUNQLHdDQUF3QyxFQUN4Qyw0TEFBNEwsQ0FDNUw7Z0NBQ0QsUUFBUSxDQUNQLG9DQUFvQyxFQUNwQyw4RUFBOEUsQ0FDOUU7Z0NBQ0QsUUFBUSxDQUNQLCtCQUErQixFQUMvQixzRkFBc0YsQ0FDdEY7Z0NBQ0QsUUFBUSxDQUNQLCtCQUErQixFQUMvQixnREFBZ0QsQ0FDaEQ7NkJBQ0Q7NEJBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsa0NBQWtDLEVBQ2xDLHFGQUFxRixDQUNyRjs0QkFDRCxPQUFPLEVBQUUsUUFBUTt5QkFDakI7d0JBQ0QsZUFBZSxFQUFFOzRCQUNoQixJQUFJLEVBQUUsU0FBUzs0QkFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQix3Q0FBd0MsRUFDeEMseUlBQXlJLENBQ3pJOzRCQUNELE9BQU8sRUFBRSxLQUFLO3lCQUNkO3dCQUNELEtBQUssRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsUUFBUSxDQUNwQiw4QkFBOEIsRUFDOUIsbURBQW1ELENBQ25EOzRCQUNELE9BQU8sRUFBRSxRQUFRLENBQUMscUNBQXFDLEVBQUUsYUFBYSxDQUFDO3lCQUN2RTt3QkFDRCxnQkFBZ0IsRUFBRTs0QkFDakIsSUFBSSxFQUFFLFNBQVM7NEJBQ2YsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qix5Q0FBeUMsRUFDekMseUZBQXlGLENBQ3pGOzRCQUNELE9BQU8sRUFBRSxLQUFLO3lCQUNkO3dCQUNELFFBQVEsRUFBRTs0QkFDVCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDOzRCQUN2QixXQUFXLEVBQUUsUUFBUSxDQUNwQixpQ0FBaUMsRUFDakMsZ0RBQWdELENBQ2hEO3lCQUNEO3FCQUNEO29CQUNELE9BQU8sRUFBRTt3QkFDUixLQUFLLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLGFBQWEsQ0FBQzt3QkFDckUsYUFBYSxFQUFFLFFBQVE7cUJBQ3ZCO2lCQUNEO2FBQ0Q7WUFDRCxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLHdCQUF3QixFQUN4QiwyUEFBMlAsQ0FDM1A7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCLEVBQUUsSUFBSSxFQUFFLEVBQUUsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFO2FBQ3RGO1lBQ0QsWUFBWSxFQUFFLFFBQVEsQ0FDckIscUNBQXFDLEVBQ3JDLHNFQUFzRSxDQUN0RTtZQUNELG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsT0FBTyxFQUFFO2dCQUNSLEtBQUssRUFBRTtvQkFDTixRQUFRLEVBQUUsT0FBTztpQkFDakI7Z0JBQ0QsTUFBTSxFQUFFO29CQUNQLFFBQVEsRUFBRSxPQUFPO2lCQUNqQjthQUNEO1NBQ0Q7UUFDRCw2QkFBNkIsRUFBRTtZQUM5QixJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxhQUFhLEVBQUU7b0JBQ2QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQztvQkFDbEUsZ0JBQWdCLEVBQUU7d0JBQ2pCLFFBQVEsQ0FDUCwrQkFBK0IsRUFDL0IsOERBQThELENBQzlEO3dCQUNELFFBQVEsQ0FDUCxvQ0FBb0MsRUFDcEMsOEhBQThILENBQzlIO3dCQUNELFFBQVEsQ0FDUCxvQ0FBb0MsRUFDcEMsOEVBQThFLENBQzlFO3dCQUNELFFBQVEsQ0FDUCwrQkFBK0IsRUFDL0Isc0ZBQXNGLENBQ3RGO3dCQUNELFFBQVEsQ0FDUCwrQkFBK0IsRUFDL0IsZ0RBQWdELENBQ2hEO3FCQUNEO29CQUNELFdBQVcsRUFBRSxRQUFRLENBQ3BCLGtDQUFrQyxFQUNsQyxxRkFBcUYsQ0FDckY7b0JBQ0QsT0FBTyxFQUFFLFFBQVE7aUJBQ2pCO2dCQUNELGVBQWUsRUFBRTtvQkFDaEIsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsd0NBQXdDLEVBQ3hDLHlJQUF5SSxDQUN6STtvQkFDRCxPQUFPLEVBQUUsS0FBSztpQkFDZDtnQkFDRCxLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsOEJBQThCLEVBQzlCLG1EQUFtRCxDQUNuRDtvQkFDRCxPQUFPLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLGFBQWEsQ0FBQztpQkFDdkU7Z0JBQ0QsZ0JBQWdCLEVBQUU7b0JBQ2pCLElBQUksRUFBRSxTQUFTO29CQUNmLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIseUNBQXlDLEVBQ3pDLHlGQUF5RixDQUN6RjtvQkFDRCxPQUFPLEVBQUUsS0FBSztpQkFDZDtnQkFDRCxRQUFRLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztvQkFDdkIsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsaUNBQWlDLEVBQ2pDLGdEQUFnRCxDQUNoRDtpQkFDRDthQUNEO1lBQ0QsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4RCxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLGlDQUFpQyxFQUNqQyxtS0FBbUssRUFDbkssNEJBQTRCLENBQzVCO1lBQ0Qsb0JBQW9CLEVBQUUsS0FBSztTQUMzQjtRQUNELHNCQUFzQixFQUFFO1lBQ3ZCLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQztZQUNwQyxPQUFPLEVBQUUsV0FBVztZQUNwQixXQUFXLEVBQUUsUUFBUSxDQUNwQixzQkFBc0IsRUFDdEIsc0VBQXNFLENBQ3RFO1NBQ0Q7UUFDRCxDQUFDLGtDQUFrQyxDQUFDLEVBQUU7WUFDckMsSUFBSSxFQUFFLE9BQU87WUFDYixtQkFBbUIsRUFBRSxRQUFRLENBQzVCLGdFQUFnRSxFQUNoRSwyRkFBMkYsQ0FDM0Y7WUFDRCxPQUFPLEVBQUUsT0FBTyxFQUFFLHlDQUF5QyxJQUFJLEVBQUU7WUFDakUsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSw0QkFBNEI7Z0JBQ3JDLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsMERBQTBELEVBQzFELDBEQUEwRCxDQUMxRDthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQSJ9