/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { URI } from '../../../../base/common/uri.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { Emitter } from '../../../../base/common/event.js';
import { IVoidSettingsService } from './voidSettingsService.js';
export const IMCPService = createDecorator('mcpConfigService');
const MCP_CONFIG_FILE_NAME = 'mcp.json';
const MCP_CONFIG_SAMPLE = { mcpServers: {} };
const MCP_CONFIG_SAMPLE_STRING = JSON.stringify(MCP_CONFIG_SAMPLE, null, 2);
// export interface MCPCallToolOfToolName {
// 	[toolName: string]: (params: any) => Promise<{
// 		result: any | Promise<any>,
// 		interruptTool?: () => void
// 	}>;
// }
let MCPService = class MCPService extends Disposable {
    // private readonly _onLoadingServersChange = new Emitter<MCPServerEventLoadingParam>();
    // public readonly onLoadingServersChange = this._onLoadingServersChange.event;
    constructor(fileService, pathService, productService, editorService, mainProcessService, voidSettingsService) {
        super();
        this.fileService = fileService;
        this.pathService = pathService;
        this.productService = productService;
        this.editorService = editorService;
        this.mainProcessService = mainProcessService;
        this.voidSettingsService = voidSettingsService;
        // list of MCP servers pulled from mcpChannel
        this.state = {
            mcpServerOfName: {},
            error: undefined,
        };
        // Emitters for server events
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._setMCPServerState = async (serverName, newServer) => {
            if (newServer === undefined) {
                // Remove the server from the state
                const { [serverName]: removed, ...remainingServers } = this.state.mcpServerOfName;
                this.state = {
                    ...this.state,
                    mcpServerOfName: remainingServers,
                };
            }
            else {
                // Add or update the server
                this.state = {
                    ...this.state,
                    mcpServerOfName: {
                        ...this.state.mcpServerOfName,
                        [serverName]: newServer,
                    },
                };
            }
            this._onDidChangeState.fire();
        };
        this._setHasError = async (errMsg) => {
            this.state = {
                ...this.state,
                error: errMsg,
            };
            this._onDidChangeState.fire();
        };
        this.channel = this.mainProcessService.getChannel('void-channel-mcp');
        const onEvent = (e) => {
            // console.log('GOT EVENT', e)
            this._setMCPServerState(e.response.name, e.response.newServer);
        };
        this._register(this.channel.listen('onAdd_server')(onEvent));
        this._register(this.channel.listen('onUpdate_server')(onEvent));
        this._register(this.channel.listen('onDelete_server')(onEvent));
        this._initialize();
    }
    async _initialize() {
        try {
            await this.voidSettingsService.waitForInitState;
            // Create .mcpConfig if it doesn't exist
            const mcpConfigUri = await this._getMCPConfigFilePath();
            const fileExists = await this._configFileExists(mcpConfigUri);
            if (!fileExists) {
                await this._createMCPConfigFile(mcpConfigUri);
                console.log('MCP Config file created:', mcpConfigUri.toString());
            }
            await this._addMCPConfigFileWatcher();
            await this._refreshMCPServers();
        }
        catch (error) {
            console.error('Error initializing MCPService:', error);
        }
    }
    // Create the file/directory if it doesn't exist
    async _createMCPConfigFile(mcpConfigUri) {
        await this.fileService.createFile(mcpConfigUri.with({ path: mcpConfigUri.path }));
        const buffer = VSBuffer.fromString(MCP_CONFIG_SAMPLE_STRING);
        await this.fileService.writeFile(mcpConfigUri, buffer);
    }
    async _addMCPConfigFileWatcher() {
        const mcpConfigUri = await this._getMCPConfigFilePath();
        this._register(this.fileService.watch(mcpConfigUri));
        this._register(this.fileService.onDidFilesChange(async (e) => {
            if (!e.contains(mcpConfigUri))
                return;
            await this._refreshMCPServers();
        }));
    }
    // Client-side functions
    async revealMCPConfigFile() {
        try {
            const mcpConfigUri = await this._getMCPConfigFilePath();
            await this.editorService.openEditor({
                resource: mcpConfigUri,
                options: {
                    pinned: true,
                    revealIfOpened: true,
                },
            });
        }
        catch (error) {
            console.error('Error opening MCP config file:', error);
        }
    }
    getMCPTools() {
        const allTools = [];
        for (const serverName in this.state.mcpServerOfName) {
            const server = this.state.mcpServerOfName[serverName];
            server.tools?.forEach((tool) => {
                allTools.push({
                    description: tool.description || '',
                    params: this._transformInputSchemaToParams(tool.inputSchema),
                    name: tool.name,
                    mcpServerName: serverName,
                });
            });
        }
        if (allTools.length === 0)
            return undefined;
        return allTools;
    }
    _transformInputSchemaToParams(inputSchema) {
        // Check if inputSchema is valid
        if (!inputSchema || !inputSchema.properties)
            return {};
        const params = {};
        Object.keys(inputSchema.properties).forEach((paramName) => {
            const propertyValues = inputSchema.properties[paramName];
            // Check if propertyValues is not an object
            if (typeof propertyValues !== 'object') {
                console.warn(`Invalid property value for ${paramName}: expected object, got ${typeof propertyValues}`);
                return; // in forEach the return is equivalent to continue
            }
            // Add the parameter to the params object
            params[paramName] = {
                description: JSON.stringify(propertyValues.description || '', null, 2) || '',
            };
        });
        return params;
    }
    async _getMCPConfigFilePath() {
        const appName = this.productService.dataFolderName;
        const userHome = await this.pathService.userHome();
        const uri = URI.joinPath(userHome, appName, MCP_CONFIG_FILE_NAME);
        return uri;
    }
    async _configFileExists(mcpConfigUri) {
        try {
            await this.fileService.stat(mcpConfigUri);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async _parseMCPConfigFile() {
        const mcpConfigUri = await this._getMCPConfigFilePath();
        try {
            const fileContent = await this.fileService.readFile(mcpConfigUri);
            const contentString = fileContent.value.toString();
            const configFileJson = JSON.parse(contentString);
            if (!configFileJson.mcpServers) {
                throw new Error('Missing mcpServers property');
            }
            return configFileJson;
        }
        catch (error) {
            const fullError = `Error parsing MCP config file: ${error}`;
            this._setHasError(fullError);
            return null;
        }
    }
    // Handle server state changes
    async _refreshMCPServers() {
        this._setHasError(undefined);
        const newConfigFileJSON = await this._parseMCPConfigFile();
        if (!newConfigFileJSON) {
            console.log(`Not setting state: MCP config file not found`);
            return;
        }
        if (!newConfigFileJSON?.mcpServers) {
            console.log(`Not setting state: MCP config file did not have an 'mcpServers' field`);
            return;
        }
        const oldConfigFileNames = Object.keys(this.state.mcpServerOfName);
        const newConfigFileNames = Object.keys(newConfigFileJSON.mcpServers);
        const addedServerNames = newConfigFileNames.filter((serverName) => !oldConfigFileNames.includes(serverName)); // in new and not in old
        const removedServerNames = oldConfigFileNames.filter((serverName) => !newConfigFileNames.includes(serverName)); // in old and not in new
        // set isOn to any new servers in the config
        const addedUserStateOfName = {};
        for (const name of addedServerNames) {
            addedUserStateOfName[name] = { isOn: true };
        }
        await this.voidSettingsService.addMCPUserStateOfNames(addedUserStateOfName);
        // delete isOn for any servers that no longer show up in the config
        await this.voidSettingsService.removeMCPUserStateOfNames(removedServerNames);
        // set all servers to loading
        for (const serverName in newConfigFileJSON.mcpServers) {
            this._setMCPServerState(serverName, { status: 'loading', tools: [] });
        }
        const updatedServerNames = Object.keys(newConfigFileJSON.mcpServers).filter((serverName) => !addedServerNames.includes(serverName) && !removedServerNames.includes(serverName));
        this.channel.call('refreshMCPServers', {
            mcpConfigFileJSON: newConfigFileJSON,
            addedServerNames,
            removedServerNames,
            updatedServerNames,
            userStateOfName: this.voidSettingsService.state.mcpUserStateOfName,
        });
    }
    stringifyResult(result) {
        let toolResultStr;
        if (result.event === 'text') {
            toolResultStr = result.text;
        }
        else if (result.event === 'image') {
            toolResultStr = `[Image: ${result.image.mimeType}]`;
        }
        else if (result.event === 'audio') {
            toolResultStr = `[Audio content]`;
        }
        else if (result.event === 'resource') {
            toolResultStr = `[Resource content]`;
        }
        else {
            toolResultStr = JSON.stringify(result);
        }
        return toolResultStr;
    }
    // toggle MCP server and update isOn in void settings
    async toggleServerIsOn(serverName, isOn) {
        this._setMCPServerState(serverName, { status: 'loading', tools: [] });
        await this.voidSettingsService.setMCPServerState(serverName, { isOn });
        this.channel.call('toggleMCPServer', { serverName, isOn });
    }
    async callMCPTool(toolData) {
        const result = await this.channel.call('callTool', toolData);
        if (result.event === 'error') {
            throw new Error(`Error: ${result.text}`);
        }
        return { result };
    }
};
MCPService = __decorate([
    __param(0, IFileService),
    __param(1, IPathService),
    __param(2, IProductService),
    __param(3, IEditorService),
    __param(4, IMainProcessService),
    __param(5, IVoidSettingsService)
], MCPService);
registerSingleton(IMCPService, MCPService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vbWNwU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQVMzRixPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFxQi9ELE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQWMsa0JBQWtCLENBQUMsQ0FBQTtBQUUzRSxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQTtBQUN2QyxNQUFNLGlCQUFpQixHQUFHLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFBO0FBQzVD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