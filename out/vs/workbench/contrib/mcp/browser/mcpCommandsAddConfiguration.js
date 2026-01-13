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
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../base/common/assert.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { parse as parseJsonc } from '../../../../base/common/jsonc.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { getConfigValueInTarget, IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { mcpConfigurationSection, mcpStdioServerSchema, } from '../common/mcpConfiguration.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { McpServerOptionsCommand } from './mcpCommands.js';
var AddConfigurationType;
(function (AddConfigurationType) {
    AddConfigurationType[AddConfigurationType["Stdio"] = 0] = "Stdio";
    AddConfigurationType[AddConfigurationType["SSE"] = 1] = "SSE";
    AddConfigurationType[AddConfigurationType["NpmPackage"] = 2] = "NpmPackage";
    AddConfigurationType[AddConfigurationType["PipPackage"] = 3] = "PipPackage";
    AddConfigurationType[AddConfigurationType["DockerImage"] = 4] = "DockerImage";
})(AddConfigurationType || (AddConfigurationType = {}));
const assistedTypes = {
    [2 /* AddConfigurationType.NpmPackage */]: {
        title: localize('mcp.npm.title', 'Enter NPM Package Name'),
        placeholder: localize('mcp.npm.placeholder', 'Package name (e.g., @org/package)'),
        pickLabel: localize('mcp.serverType.npm', 'NPM Package'),
        pickDescription: localize('mcp.serverType.npm.description', 'Install from an NPM package name'),
    },
    [3 /* AddConfigurationType.PipPackage */]: {
        title: localize('mcp.pip.title', 'Enter Pip Package Name'),
        placeholder: localize('mcp.pip.placeholder', 'Package name (e.g., package-name)'),
        pickLabel: localize('mcp.serverType.pip', 'Pip Package'),
        pickDescription: localize('mcp.serverType.pip.description', 'Install from a Pip package name'),
    },
    [4 /* AddConfigurationType.DockerImage */]: {
        title: localize('mcp.docker.title', 'Enter Docker Image Name'),
        placeholder: localize('mcp.docker.placeholder', 'Image name (e.g., mcp/imagename)'),
        pickLabel: localize('mcp.serverType.docker', 'Docker Image'),
        pickDescription: localize('mcp.serverType.docker.description', 'Install from a Docker image'),
    },
};
var AddConfigurationCopilotCommand;
(function (AddConfigurationCopilotCommand) {
    /** Returns whether MCP enhanced setup is enabled. */
    AddConfigurationCopilotCommand["IsSupported"] = "github.copilot.chat.mcp.setup.check";
    /** Takes an npm/pip package name, validates its owner. */
    AddConfigurationCopilotCommand["ValidatePackage"] = "github.copilot.chat.mcp.setup.validatePackage";
    /** Returns the resolved MCP configuration. */
    AddConfigurationCopilotCommand["StartFlow"] = "github.copilot.chat.mcp.setup.flow";
})(AddConfigurationCopilotCommand || (AddConfigurationCopilotCommand = {}));
let McpAddConfigurationCommand = class McpAddConfigurationCommand {
    constructor(_explicitConfigUri, _quickInputService, _configurationService, _jsonEditingService, _workspaceService, _environmentService, _commandService, _mcpRegistry, _openerService, _editorService, _fileService, _notificationService, _telemetryService) {
        this._explicitConfigUri = _explicitConfigUri;
        this._quickInputService = _quickInputService;
        this._configurationService = _configurationService;
        this._jsonEditingService = _jsonEditingService;
        this._workspaceService = _workspaceService;
        this._environmentService = _environmentService;
        this._commandService = _commandService;
        this._mcpRegistry = _mcpRegistry;
        this._openerService = _openerService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this._notificationService = _notificationService;
        this._telemetryService = _telemetryService;
    }
    async getServerType() {
        const items = [
            {
                kind: 0 /* AddConfigurationType.Stdio */,
                label: localize('mcp.serverType.command', 'Command (stdio)'),
                description: localize('mcp.serverType.command.description', 'Run a local command that implements the MCP protocol'),
            },
            {
                kind: 1 /* AddConfigurationType.SSE */,
                label: localize('mcp.serverType.http', 'HTTP (server-sent events)'),
                description: localize('mcp.serverType.http.description', 'Connect to a remote HTTP server that implements the MCP protocol'),
            },
        ];
        let aiSupported;
        try {
            aiSupported = await this._commandService.executeCommand("github.copilot.chat.mcp.setup.check" /* AddConfigurationCopilotCommand.IsSupported */);
        }
        catch {
            // ignored
        }
        if (aiSupported) {
            items.unshift({
                type: 'separator',
                label: localize('mcp.serverType.manual', 'Manual Install'),
            });
            items.push({ type: 'separator', label: localize('mcp.serverType.copilot', 'Model-Assisted') }, ...Object.entries(assistedTypes).map(([type, { pickLabel, pickDescription }]) => ({
                kind: Number(type),
                label: pickLabel,
                description: pickDescription,
            })));
        }
        const result = await this._quickInputService.pick(items, {
            placeHolder: localize('mcp.serverType.placeholder', 'Choose the type of MCP server to add'),
        });
        return result?.kind;
    }
    async getStdioConfig() {
        const command = await this._quickInputService.input({
            title: localize('mcp.command.title', 'Enter Command'),
            placeHolder: localize('mcp.command.placeholder', 'Command to run (with optional arguments)'),
            ignoreFocusLost: true,
        });
        if (!command) {
            return undefined;
        }
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: 'stdio',
        });
        // Split command into command and args, handling quotes
        const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g);
        return {
            type: 'stdio',
            command: parts[0].replace(/"/g, ''),
            args: parts.slice(1).map((arg) => arg.replace(/"/g, '')),
        };
    }
    async getSSEConfig() {
        const url = await this._quickInputService.input({
            title: localize('mcp.url.title', 'Enter Server URL'),
            placeHolder: localize('mcp.url.placeholder', 'URL of the MCP server (e.g., http://localhost:3000)'),
            ignoreFocusLost: true,
        });
        if (!url) {
            return undefined;
        }
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: 'sse',
        });
        return {
            type: 'sse',
            url,
        };
    }
    async getServerId(suggestion = `my-mcp-server-${generateUuid().split('-')[0]}`) {
        const id = await this._quickInputService.input({
            title: localize('mcp.serverId.title', 'Enter Server ID'),
            placeHolder: localize('mcp.serverId.placeholder', 'Unique identifier for this server'),
            value: suggestion,
            ignoreFocusLost: true,
        });
        return id;
    }
    async getConfigurationTarget() {
        const options = [
            {
                target: 2 /* ConfigurationTarget.USER */,
                label: localize('mcp.target.user', 'User Settings'),
                description: localize('mcp.target.user.description', 'Available in all workspaces'),
            },
        ];
        if (!!this._environmentService.remoteAuthority) {
            options.push({
                target: 4 /* ConfigurationTarget.USER_REMOTE */,
                label: localize('mcp.target.remote', 'Remote Settings'),
                description: localize('mcp.target..remote.description', 'Available on this remote machine'),
            });
        }
        if (this._workspaceService.getWorkspace().folders.length > 0) {
            options.push({
                target: 5 /* ConfigurationTarget.WORKSPACE */,
                label: localize('mcp.target.workspace', 'Workspace Settings'),
                description: localize('mcp.target.workspace.description', 'Available in this workspace'),
            });
        }
        if (options.length === 1) {
            return options[0].target;
        }
        const targetPick = await this._quickInputService.pick(options, {
            title: localize('mcp.target.title', 'Choose where to save the configuration'),
        });
        return targetPick?.target;
    }
    async getAssistedConfig(type) {
        const packageName = await this._quickInputService.input({
            ignoreFocusLost: true,
            title: assistedTypes[type].title,
            placeHolder: assistedTypes[type].placeholder,
        });
        if (!packageName) {
            return undefined;
        }
        let LoadAction;
        (function (LoadAction) {
            LoadAction["Retry"] = "retry";
            LoadAction["Cancel"] = "cancel";
            LoadAction["Allow"] = "allow";
        })(LoadAction || (LoadAction = {}));
        const loadingQuickPickStore = new DisposableStore();
        const loadingQuickPick = loadingQuickPickStore.add(this._quickInputService.createQuickPick());
        loadingQuickPick.title = localize('mcp.loading.title', 'Loading package details...');
        loadingQuickPick.busy = true;
        loadingQuickPick.ignoreFocusOut = true;
        const packageType = this.getPackageType(type);
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: packageType,
        });
        this._commandService
            .executeCommand("github.copilot.chat.mcp.setup.validatePackage" /* AddConfigurationCopilotCommand.ValidatePackage */, {
            type: packageType,
            name: packageName,
            targetConfig: {
                ...mcpStdioServerSchema,
                properties: {
                    ...mcpStdioServerSchema.properties,
                    name: {
                        type: 'string',
                        description: 'Suggested name of the server, alphanumeric and hyphen only',
                    },
                },
                required: [...(mcpStdioServerSchema.required || []), 'name'],
            },
        })
            .then((result) => {
            if (!result || result.state === 'error') {
                loadingQuickPick.title = result?.error || 'Unknown error loading package';
                loadingQuickPick.items = [
                    { id: "retry" /* LoadAction.Retry */, label: localize('mcp.error.retry', 'Try a different package') },
                    { id: "cancel" /* LoadAction.Cancel */, label: localize('cancel', 'Cancel') },
                ];
            }
            else {
                loadingQuickPick.title = localize('mcp.confirmPublish', 'Install {0} from {1}?', packageName, result.publisher);
                loadingQuickPick.items = [
                    { id: "allow" /* LoadAction.Allow */, label: localize('allow', 'Allow') },
                    { id: "cancel" /* LoadAction.Cancel */, label: localize('cancel', 'Cancel') },
                ];
            }
            loadingQuickPick.busy = false;
        });
        const loadingAction = await new Promise((resolve) => {
            loadingQuickPick.onDidAccept(() => resolve(loadingQuickPick.selectedItems[0]?.id));
            loadingQuickPick.onDidHide(() => resolve(undefined));
            loadingQuickPick.show();
        }).finally(() => loadingQuickPick.dispose());
        switch (loadingAction) {
            case "retry" /* LoadAction.Retry */:
                return this.getAssistedConfig(type);
            case "allow" /* LoadAction.Allow */:
                break;
            case "cancel" /* LoadAction.Cancel */:
            default:
                return undefined;
        }
        const configWithName = await this._commandService.executeCommand("github.copilot.chat.mcp.setup.flow" /* AddConfigurationCopilotCommand.StartFlow */, {
            name: packageName,
            type: packageType,
        });
        if (!configWithName) {
            return undefined;
        }
        const { name, ...config } = configWithName;
        return { name, config };
    }
    /** Shows the location of a server config once it's discovered. */
    showOnceDiscovered(name) {
        const store = new DisposableStore();
        store.add(autorun((reader) => {
            const colls = this._mcpRegistry.collections.read(reader);
            const match = mapFindFirst(colls, (collection) => mapFindFirst(collection.serverDefinitions.read(reader), (server) => server.label === name ? { server, collection } : undefined));
            if (match) {
                if (match.collection.presentation?.origin) {
                    this._openerService.openEditor({
                        resource: match.collection.presentation.origin,
                        options: {
                            selection: match.server.presentation?.origin?.range,
                            preserveFocus: true,
                        },
                    });
                }
                else {
                    this._commandService.executeCommand(McpServerOptionsCommand.id, name);
                }
                store.dispose();
            }
        }));
        store.add(disposableTimeout(() => store.dispose(), 5000));
    }
    writeToUserSetting(name, config, target, inputs) {
        const settings = {
            ...getConfigValueInTarget(this._configurationService.inspect(mcpConfigurationSection), target),
        };
        settings.servers = { ...settings.servers, [name]: config };
        if (inputs) {
            settings.inputs = [...(settings.inputs || []), ...inputs];
        }
        return this._configurationService.updateValue(mcpConfigurationSection, settings, target);
    }
    async run() {
        // Step 1: Choose server type
        const serverType = await this.getServerType();
        if (serverType === undefined) {
            return;
        }
        // Step 2: Get server details based on type
        let serverConfig;
        let suggestedName;
        switch (serverType) {
            case 0 /* AddConfigurationType.Stdio */:
                serverConfig = await this.getStdioConfig();
                break;
            case 1 /* AddConfigurationType.SSE */:
                serverConfig = await this.getSSEConfig();
                break;
            case 2 /* AddConfigurationType.NpmPackage */:
            case 3 /* AddConfigurationType.PipPackage */:
            case 4 /* AddConfigurationType.DockerImage */: {
                const r = await this.getAssistedConfig(serverType);
                serverConfig = r?.config;
                suggestedName = r?.name;
                break;
            }
            default:
                assertNever(serverType);
        }
        if (!serverConfig) {
            return;
        }
        // Step 3: Get server ID
        const serverId = await this.getServerId(suggestedName);
        if (!serverId) {
            return;
        }
        // Step 4: Choose configuration target if no configUri provided
        let target;
        const workspace = this._workspaceService.getWorkspace();
        if (!this._explicitConfigUri) {
            target = await this.getConfigurationTarget();
            if (!target) {
                return;
            }
        }
        // Step 5: Update configuration
        const writeToUriDirect = this._explicitConfigUri
            ? URI.parse(this._explicitConfigUri)
            : target === 5 /* ConfigurationTarget.WORKSPACE */ && workspace.folders.length === 1
                ? URI.joinPath(workspace.folders[0].uri, '.vscode', 'mcp.json')
                : undefined;
        if (writeToUriDirect) {
            await this._jsonEditingService.write(writeToUriDirect, [
                {
                    path: ['servers', serverId],
                    value: serverConfig,
                },
            ], true);
        }
        else {
            await this.writeToUserSetting(serverId, serverConfig, target);
        }
        const packageType = this.getPackageType(serverType);
        if (packageType) {
            this._telemetryService.publicLog2('mcp.addserver.completed', {
                packageType,
                serverType: serverConfig.type,
                target: target === 5 /* ConfigurationTarget.WORKSPACE */ ? 'workspace' : 'user',
            });
        }
        this.showOnceDiscovered(serverId);
    }
    async pickForUrlHandler(resource, showIsPrimary = false) {
        const name = decodeURIComponent(basename(resource)).replace(/\.json$/, '');
        const placeHolder = localize('install.title', 'Install MCP server {0}', name);
        const items = [
            {
                id: 'install',
                label: localize('install.start', 'Install Server'),
                description: localize('install.description', 'Install in your user settings'),
            },
            { id: 'show', label: localize('install.show', 'Show Configuration', name) },
            { id: 'rename', label: localize('install.rename', 'Rename "{0}"', name) },
            { id: 'cancel', label: localize('cancel', 'Cancel') },
        ];
        if (showIsPrimary) {
            ;
            [items[0], items[1]] = [items[1], items[0]];
        }
        const pick = await this._quickInputService.pick(items, { placeHolder, ignoreFocusLost: true });
        const getEditors = () => this._editorService
            .getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)
            .filter((e) => e.editor.resource?.toString() === resource.toString());
        switch (pick?.id) {
            case 'show':
                await this._editorService.openEditor({ resource });
                break;
            case 'install':
                await this._editorService.save(getEditors());
                try {
                    const contents = await this._fileService.readFile(resource);
                    const { inputs, ...config } = parseJsonc(contents.value.toString());
                    await this.writeToUserSetting(name, config, 3 /* ConfigurationTarget.USER_LOCAL */, inputs);
                    this._editorService.closeEditors(getEditors());
                    this.showOnceDiscovered(name);
                }
                catch (e) {
                    this._notificationService.error(localize('install.error', 'Error installing MCP server {0}: {1}', name, e.message));
                    await this._editorService.openEditor({ resource });
                }
                break;
            case 'rename': {
                const newName = await this._quickInputService.input({
                    placeHolder: localize('install.newName', 'Enter new name'),
                    value: name,
                });
                if (newName) {
                    const newURI = resource.with({ path: `/${encodeURIComponent(newName)}.json` });
                    await this._editorService.save(getEditors());
                    await this._fileService.move(resource, newURI);
                    return this.pickForUrlHandler(newURI, showIsPrimary);
                }
                break;
            }
        }
    }
    getPackageType(serverType) {
        switch (serverType) {
            case 2 /* AddConfigurationType.NpmPackage */:
                return 'npm';
            case 3 /* AddConfigurationType.PipPackage */:
                return 'pip';
            case 4 /* AddConfigurationType.DockerImage */:
                return 'docker';
            case 0 /* AddConfigurationType.Stdio */:
                return 'stdio';
            case 1 /* AddConfigurationType.SSE */:
                return 'sse';
            default:
                return undefined;
        }
    }
};
McpAddConfigurationCommand = __decorate([
    __param(1, IQuickInputService),
    __param(2, IConfigurationService),
    __param(3, IJSONEditingService),
    __param(4, IWorkspaceContextService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, ICommandService),
    __param(7, IMcpRegistry),
    __param(8, IEditorService),
    __param(9, IEditorService),
    __param(10, IFileService),
    __param(11, INotificationService),
    __param(12, ITelemetryService)
], McpAddConfigurationCommand);
export { McpAddConfigurationCommand };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHNBZGRDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BDb21tYW5kc0FkZENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsS0FBSyxJQUFJLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBRU4sc0JBQXNCLEVBQ3RCLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQU16RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixP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