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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHNBZGRDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwQ29tbWFuZHNBZGRDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEtBQUssSUFBSSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUVOLHNCQUFzQixFQUN0QixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFNekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUNOLGtCQUFrQixHQUdsQixN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