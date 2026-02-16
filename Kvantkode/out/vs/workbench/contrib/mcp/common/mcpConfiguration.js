/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
const mcpActivationEventPrefix = 'onMcpCollection:';
export const mcpActivationEvent = (collectionId) => mcpActivationEventPrefix + collectionId;
const mcpSchemaExampleServer = {
    command: 'node',
    args: ['my-mcp-server.js'],
    env: {},
};
export var DiscoverySource;
(function (DiscoverySource) {
    DiscoverySource["ClaudeDesktop"] = "claude-desktop";
    DiscoverySource["Windsurf"] = "windsurf";
    DiscoverySource["CursorGlobal"] = "cursor-global";
    DiscoverySource["CursorWorkspace"] = "cursor-workspace";
})(DiscoverySource || (DiscoverySource = {}));
export const allDiscoverySources = Object.keys({
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: true,
    ["windsurf" /* DiscoverySource.Windsurf */]: true,
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: true,
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: true,
});
export const discoverySourceLabel = {
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: localize('mcp.discovery.source.claude-desktop', 'Claude Desktop'),
    ["windsurf" /* DiscoverySource.Windsurf */]: localize('mcp.discovery.source.windsurf', 'Windsurf'),
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: localize('mcp.discovery.source.cursor-global', 'Cursor (Global)'),
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: localize('mcp.discovery.source.cursor-workspace', 'Cursor (Workspace)'),
};
export const mcpConfigurationSection = 'mcp';
export const mcpDiscoverySection = 'chat.mcp.discovery.enabled';
export const mcpEnabledSection = 'chat.mcp.enabled';
export const mcpSchemaExampleServers = {
    'mcp-server-time': {
        command: 'python',
        args: ['-m', 'mcp_server_time', '--local-timezone=America/Los_Angeles'],
        env: {},
    },
};
export const mcpStdioServerSchema = {
    type: 'object',
    additionalProperties: false,
    examples: [mcpSchemaExampleServer],
    properties: {
        type: {
            type: 'string',
            enum: ['stdio'],
            description: localize('app.mcp.json.type', 'The type of the server.'),
        },
        command: {
            type: 'string',
            description: localize('app.mcp.json.command', 'The command to run the server.'),
        },
        args: {
            type: 'array',
            description: localize('app.mcp.args.command', 'Arguments passed to the server.'),
            items: {
                type: 'string',
            },
        },
        envFile: {
            type: 'string',
            description: localize('app.mcp.envFile.command', 'Path to a file containing environment variables for the server.'),
            examples: ['${workspaceFolder}/.env'],
        },
        env: {
            description: localize('app.mcp.env.command', 'Environment variables passed to the server.'),
            additionalProperties: {
                anyOf: [{ type: 'null' }, { type: 'string' }, { type: 'number' }],
            },
        },
    },
};
export const mcpServerSchema = {
    id: mcpSchemaId,
    type: 'object',
    title: localize('app.mcp.json.title', 'Model Context Protocol Servers'),
    allowTrailingCommas: true,
    allowComments: true,
    additionalProperties: false,
    properties: {
        servers: {
            examples: [mcpSchemaExampleServers],
            additionalProperties: {
                oneOf: [
                    mcpStdioServerSchema,
                    {
                        type: 'object',
                        additionalProperties: false,
                        required: ['url', 'type'],
                        examples: [
                            {
                                type: 'sse',
                                url: 'http://localhost:3001',
                                headers: {},
                            },
                        ],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['sse'],
                                description: localize('app.mcp.json.type', 'The type of the server.'),
                            },
                            url: {
                                type: 'string',
                                format: 'uri',
                                description: localize('app.mcp.json.url', 'The URL of the server-sent-event (SSE) server.'),
                            },
                            env: {
                                description: localize('app.mcp.json.headers', 'Additional headers sent to the server.'),
                                additionalProperties: { type: 'string' },
                            },
                        },
                    },
                ],
            },
        },
        inputs: inputsSchema.definitions.inputs,
    },
};
export const mcpContributionPoint = {
    extensionPoint: 'modelContextServerCollections',
    activationEventsGenerator(contribs, result) {
        for (const contrib of contribs) {
            if (contrib.id) {
                result.push(mcpActivationEvent(contrib.id));
            }
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.mcp', 'Contributes Model Context Protocol servers. Users of this should also use `vscode.lm.registerMcpConfigurationProvider`.'),
        type: 'array',
        defaultSnippets: [{ body: [{ id: '', label: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { id: '', label: '' } }],
            properties: {
                id: {
                    description: localize('vscode.extension.contributes.mcp.id', 'Unique ID for the collection.'),
                    type: 'string',
                },
                label: {
                    description: localize('vscode.extension.contributes.mcp.label', 'Display name for the collection.'),
                    type: 'string',
                },
            },
        },
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBUzVHLE1BQU0sd0JBQXdCLEdBQUcsa0JBQWtCLENBQUE7QUFFbkQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxZQUFvQixFQUFFLEVBQUUsQ0FBQyx3QkFBd0IsR0FBRyxZQUFZLENBQUE7QUFFbkcsTUFBTSxzQkFBc0IsR0FBRztJQUM5QixPQUFPLEVBQUUsTUFBTTtJQUNmLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDO0lBQzFCLEdBQUcsRUFBRSxFQUFFO0NBQ1AsQ0FBQTtBQUVELE1BQU0sQ0FBTixJQUFrQixlQUtqQjtBQUxELFdBQWtCLGVBQWU7SUFDaEMsbURBQWdDLENBQUE7SUFDaEMsd0NBQXFCLENBQUE7SUFDckIsaURBQThCLENBQUE7SUFDOUIsdURBQW9DLENBQUE7QUFDckMsQ0FBQyxFQUxpQixlQUFlLEtBQWYsZUFBZSxRQUtoQztBQUVELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDOUMsc0RBQStCLEVBQUUsSUFBSTtJQUNyQywyQ0FBMEIsRUFBRSxJQUFJO0lBQ2hDLG9EQUE4QixFQUFFLElBQUk7SUFDcEMsMERBQWlDLEVBQUUsSUFBSTtDQUNDLENBQXNCLENBQUE7QUFFL0Qs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