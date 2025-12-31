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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQVM1RyxNQUFNLHdCQUF3QixHQUFHLGtCQUFrQixDQUFBO0FBRW5ELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLENBQUMsWUFBb0IsRUFBRSxFQUFFLENBQUMsd0JBQXdCLEdBQUcsWUFBWSxDQUFBO0FBRW5HLE1BQU0sc0JBQXNCLEdBQUc7SUFDOUIsT0FBTyxFQUFFLE1BQU07SUFDZixJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztJQUMxQixHQUFHLEVBQUUsRUFBRTtDQUNQLENBQUE7QUFFRCxNQUFNLENBQU4sSUFBa0IsZUFLakI7QUFMRCxXQUFrQixlQUFlO0lBQ2hDLG1EQUFnQyxDQUFBO0lBQ2hDLHdDQUFxQixDQUFBO0lBQ3JCLGlEQUE4QixDQUFBO0lBQzlCLHVEQUFvQyxDQUFBO0FBQ3JDLENBQUMsRUFMaUIsZUFBZSxLQUFmLGVBQWUsUUFLaEM7QUFFRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQzlDLHNEQUErQixFQUFFLElBQUk7SUFDckMsMkNBQTBCLEVBQUUsSUFBSTtJQUNoQyxvREFBOEIsRUFBRSxJQUFJO0lBQ3BDLDBEQUFpQyxFQUFFLElBQUk7Q0FDQyxDQUFzQixDQUFBO0FBRS9ELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixH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