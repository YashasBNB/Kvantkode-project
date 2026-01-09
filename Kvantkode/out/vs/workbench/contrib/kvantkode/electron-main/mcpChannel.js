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
