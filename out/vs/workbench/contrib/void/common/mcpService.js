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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL21jcFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFTM0YsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBcUIvRCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFjLGtCQUFrQixDQUFDLENBQUE7QUFFM0UsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUE7QUFDdkMsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQTtBQUM1QyxNQUFNLHdCQUF3QixHQUFHLElBQUks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