/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { removeMCPToolNamePrefix, } from '../common/mcpServiceTypes.js';
const getClientConfig = (serverName) => {
    return {
        name: `${serverName}-client`,
        version: '0.1.0',
        // debug: true,
    };
};
export class MCPChannel {
    constructor() {
        this.infoOfClientId = {};
        this._refreshingServerNames = new Set();
        // mcp emitters
        this.mcpEmitters = {
            serverEvent: {
                onAdd: new Emitter(),
                onUpdate: new Emitter(),
                onDelete: new Emitter(),
            },
        };
    }
    // browser uses this to listen for changes
    listen(_, event) {
        // server events
        if (event === 'onAdd_server')
            return this.mcpEmitters.serverEvent.onAdd.event;
        else if (event === 'onUpdate_server')
            return this.mcpEmitters.serverEvent.onUpdate.event;
        else if (event === 'onDelete_server')
            return this.mcpEmitters.serverEvent.onDelete.event;
        // else if (event === 'onLoading_server') return this.mcpEmitters.serverEvent.onChangeLoading.event;
        // tool call events
        // handle unknown events
        else
            throw new Error(`Event not found: ${event}`);
    }
    // browser uses this to call (see this.channel.call() in mcpConfigService.ts for all usages)
    async call(_, command, params) {
        try {
            if (command === 'refreshMCPServers') {
                await this._refreshMCPServers(params);
            }
            else if (command === 'closeAllMCPServers') {
                await this._closeAllMCPServers();
            }
            else if (command === 'toggleMCPServer') {
                await this._toggleMCPServer(params.serverName, params.isOn);
            }
            else if (command === 'callTool') {
                const p = params;
                const response = await this._safeCallTool(p.serverName, p.toolName, p.params);
                return response;
            }
            else {
                throw new Error(`Void sendLLM: command "${command}" not recognized.`);
            }
        }
        catch (e) {
            console.error('mcp channel: Call Error:', e);
        }
    }
    // server functions
    async _refreshMCPServers(params) {
        const { mcpConfigFileJSON, userStateOfName, addedServerNames, removedServerNames, updatedServerNames, } = params;
        const { mcpServers: mcpServersJSON } = mcpConfigFileJSON;
        const allChanges = [
            ...addedServerNames.map((n) => ({ serverName: n, type: 'added' })),
            ...removedServerNames.map((n) => ({ serverName: n, type: 'removed' })),
            ...updatedServerNames.map((n) => ({ serverName: n, type: 'updated' })),
        ];
        await Promise.all(allChanges.map(async ({ serverName, type }) => {
            // check if already refreshing
            if (this._refreshingServerNames.has(serverName))
                return;
            this._refreshingServerNames.add(serverName);
            const prevServer = this.infoOfClientId[serverName]?.mcpServer;
            // close and delete the old client
            if (type === 'removed' || type === 'updated') {
                await this._closeClient(serverName);
                delete this.infoOfClientId[serverName];
                this.mcpEmitters.serverEvent.onDelete.fire({ response: { prevServer, name: serverName } });
            }
            // create a new client
            if (type === 'added' || type === 'updated') {
                const clientInfo = await this._createClient(mcpServersJSON[serverName], serverName, userStateOfName[serverName]?.isOn);
                this.infoOfClientId[serverName] = clientInfo;
                this.mcpEmitters.serverEvent.onAdd.fire({
                    response: { newServer: clientInfo.mcpServer, name: serverName },
                });
            }
        }));
        allChanges.forEach(({ serverName, type }) => {
            this._refreshingServerNames.delete(serverName);
        });
    }
    async _createClientUnsafe(server, serverName, isOn) {
        const clientConfig = getClientConfig(serverName);
        const client = new Client(clientConfig);
        let transport;
        let info;
        if (server.url) {
            // first try HTTP, fall back to SSE
            try {
                transport = new StreamableHTTPClientTransport(server.url);
                await client.connect(transport);
                console.log(`Connected via HTTP to ${serverName}`);
                const { tools } = await client.listTools();
                const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({
                    name: this._addUniquePrefix(name),
                    ...rest,
                }));
                info = {
                    status: isOn ? 'success' : 'offline',
                    tools: toolsWithUniqueName,
                    command: server.url.toString(),
                };
            }
            catch (httpErr) {
                console.warn(`HTTP failed for ${serverName}, trying SSE…`, httpErr);
                transport = new SSEClientTransport(server.url);
                await client.connect(transport);
                const { tools } = await client.listTools();
                const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({
                    name: this._addUniquePrefix(name),
                    ...rest,
                }));
                console.log(`Connected via SSE to ${serverName}`);
                info = {
                    status: isOn ? 'success' : 'offline',
                    tools: toolsWithUniqueName,
                    command: server.url.toString(),
                };
            }
        }
        else if (server.command) {
            // console.log('ENV DATA: ', server.env)
            transport = new StdioClientTransport({
                command: server.command,
                args: server.args,
                env: {
                    ...server.env,
                    ...process.env,
                },
            });
            await client.connect(transport);
            // Get the tools from the server
            const { tools } = await client.listTools();
            const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({
                name: this._addUniquePrefix(name),
                ...rest,
            }));
            // Create a full command string for display
            const fullCommand = `${server.command} ${server.args?.join(' ') || ''}`;
            // Format server object
            info = {
                status: isOn ? 'success' : 'offline',
                tools: toolsWithUniqueName,
                command: fullCommand,
            };
        }
        else {
            throw new Error(`No url or command for server ${serverName}`);
        }
        return { _client: client, mcpServerEntryJSON: server, mcpServer: info };
    }
    _addUniquePrefix(base) {
        return `${Math.random().toString(36).slice(2, 8)}_${base}`;
    }
    async _createClient(serverConfig, serverName, isOn = true) {
        try {
            const c = await this._createClientUnsafe(serverConfig, serverName, isOn);
            return c;
        }
        catch (err) {
            console.error(`❌ Failed to connect to server "${serverName}":`, err);
            const fullCommand = !serverConfig.command
                ? ''
                : `${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`;
            const c = { status: 'error', error: err + '', command: fullCommand };
            return { mcpServerEntryJSON: serverConfig, mcpServer: c };
        }
    }
    async _closeAllMCPServers() {
        for (const serverName in this.infoOfClientId) {
            await this._closeClient(serverName);
            delete this.infoOfClientId[serverName];
        }
        console.log('Closed all MCP servers');
    }
    async _closeClient(serverName) {
        const info = this.infoOfClientId[serverName];
        if (!info)
            return;
        const { _client: client } = info;
        if (client) {
            await client.close();
        }
        console.log(`Closed MCP server ${serverName}`);
    }
    async _toggleMCPServer(serverName, isOn) {
        const prevServer = this.infoOfClientId[serverName]?.mcpServer;
        // Handle turning on the server
        if (isOn) {
            // this.mcpEmitters.serverEvent.onChangeLoading.fire(getLoadingServerObject(serverName, isOn))
            const clientInfo = await this._createClientUnsafe(this.infoOfClientId[serverName].mcpServerEntryJSON, serverName, isOn);
            this.mcpEmitters.serverEvent.onUpdate.fire({
                response: {
                    name: serverName,
                    newServer: clientInfo.mcpServer,
                    prevServer: prevServer,
                },
            });
        }
        // Handle turning off the server
        else {
            // this.mcpEmitters.serverEvent.onChangeLoading.fire(getLoadingServerObject(serverName, isOn))
            this._closeClient(serverName);
            delete this.infoOfClientId[serverName]._client;
            this.mcpEmitters.serverEvent.onUpdate.fire({
                response: {
                    name: serverName,
                    newServer: {
                        status: 'offline',
                        tools: [],
                        command: '',
                        // Explicitly set error to undefined to reset the error state
                        error: undefined,
                    },
                    prevServer: prevServer,
                },
            });
        }
    }
    // tool call functions
    async _callTool(serverName, toolName, params) {
        const server = this.infoOfClientId[serverName];
        if (!server)
            throw new Error(`Server ${serverName} not found`);
        const { _client: client } = server;
        if (!client)
            throw new Error(`Client for server ${serverName} not found`);
        // Call the tool with the provided parameters
        const response = await client.callTool({
            name: removeMCPToolNamePrefix(toolName),
            arguments: params,
        });
        const { content } = response;
        const returnValue = content[0];
        if (returnValue.type === 'text') {
            // handle text response
            if (response.isError) {
                throw new Error(`Tool call error: ${returnValue.text}`);
            }
            // handle success
            return {
                event: 'text',
                text: returnValue.text,
                toolName,
                serverName,
            };
        }
        // if (returnValue.type === 'audio') {
        // 	// handle audio response
        // }
        // if (returnValue.type === 'image') {
        // 	// handle image response
        // }
        // if (returnValue.type === 'resource') {
        // 	// handle resource response
        // }
        throw new Error(`Tool call error: We don\'t support ${returnValue.type} tool response yet for tool ${toolName} on server ${serverName}`);
    }
    // tool call error wrapper
    async _safeCallTool(serverName, toolName, params) {
        try {
            const response = await this._callTool(serverName, toolName, params);
            return response;
        }
        catch (err) {
            let errorMessage;
            if (typeof err === 'object' && err !== null && err['code']) {
                const code = err.code;
                let codeDescription = '';
                if (code === -32700)
                    codeDescription = 'Parse Error';
                if (code === -32600)
                    codeDescription = 'Invalid Request';
                if (code === -32601)
                    codeDescription = 'Method Not Found';
                if (code === -32602)
                    codeDescription = 'Invalid Parameters';
                if (code === -32603)
                    codeDescription = 'Internal Error';
                errorMessage = `${codeDescription}. Full response:\n${JSON.stringify(err, null, 2)}`;
            }
            // Check if it's an MCP error with a code
            else if (typeof err === 'string') {
                // String error
                errorMessage = err;
            }
            else {
                // Unknown error format
                errorMessage = JSON.stringify(err, null, 2);
            }
            const fullErrorMessage = `❌ Failed to call tool "${toolName}" on server "${serverName}": ${errorMessage}`;
            const errorResponse = {
                event: 'error',
                text: fullErrorMessage,
                toolName,
                serverName,
            };
            return errorResponse;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL21jcENoYW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFPMUYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RSxPQUFPLEVBUU4sdUJBQXVCLEdBQ3ZCLE1BQU0sOEJBQThCLENBQUE7QUFLckMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxVQUFrQixFQUFFLEVBQUU7SUFDOUMsT0FBTztRQUNOLElBQUksRUFBRSxHQUFHLFVBQVUsU0FBUztRQUM1QixPQUFPLEVBQUUsT0FBTztRQUNoQixlQUFlO0tBQ2YsQ0FBQTtBQUNGLENBQUMsQ0FBQTtBQXFCRCxNQUFNLE9BQU8sVUFBVTtJQW1CdEI7UUFsQmlCLG1CQUFjLEdBQW1CLEVBQUUsQ0FBQTtRQUNuQywyQkFBc0IsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUVoRSxlQUFlO1FBQ0UsZ0JBQVcsR0FBRztZQUM5QixXQUFXLEVBQUU7Z0JBQ1osS0FBSyxFQUFFLElBQUksT0FBTyxFQUEwQjtnQkFDNUMsUUFBUSxFQUFFLElBQUksT0FBTyxFQUEwQjtnQkFDL0MsUUFBUSxFQUFFLElBQUksT0FBTyxFQUEwQjthQUMvQztTQU9ELENBQUE7SUFFYyxDQUFDO0lBRWhC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