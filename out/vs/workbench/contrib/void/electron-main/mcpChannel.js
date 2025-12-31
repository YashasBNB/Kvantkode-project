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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi9tY3BDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBTzFGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDaEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDNUUsT0FBTyxFQVFOLHVCQUF1QixHQUN2QixNQUFNLDhCQUE4QixDQUFBO0FBS3JDLE1BQU0sZUFBZSxHQUFHLENBQUMsVUFBa0IsRUFBRSxFQUFFO0lBQzlDLE9BQU87UUFDTixJQUFJLEVBQUUsR0FBRyxVQUFVLFNBQVM7UUFDNUIsT0FBTyxFQUFFLE9BQU87UUFDaEIsZUFBZTtLQUNmLENBQUE7QUFDRixDQUFDLENBQUE7QUFxQkQsTUFBTSxPQUFPLFVBQVU7SUFtQnRCO1FBbEJpQixtQkFBYyxHQUFtQixFQUFFLENBQUE7UUFDbkMsMkJBQXNCLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFaEUsZUFBZTtRQUNFLGdCQUFXLEdBQUc7WUFDOUIsV0FBVyxFQUFFO2dCQUNaLEtBQUssRUFBRSxJQUFJLE9BQU8sRUFBMEI7Z0JBQzVDLFFBQVEsRUFBRSxJQUFJLE9BQU8sRUFBMEI7Z0JBQy9DLFFBQVEsRUFBRSxJQUFJLE9BQU8sRUFBMEI7YUFDL0M7U0FPRCxDQUFBO0lBRWMsQ0FBQztJQUVoQiwwQ0FBMEM7SUFDMUMsTUFBTSxDQUFD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