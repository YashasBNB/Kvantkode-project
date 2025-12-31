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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9jb21tb24vcmVtb3RlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBSU4sVUFBVSxJQUFJLG1CQUFtQixFQUNqQyw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFFLGFBQWEsRUFBMkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRyxPQUFPLEVBQW1CLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sb0VBQW9FLENBQUE7QUFFM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0Qs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