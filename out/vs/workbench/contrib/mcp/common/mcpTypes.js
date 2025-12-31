/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../base/common/assert.js';
import { equals as objectsEqual } from '../../../../base/common/objects.js';
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const extensionMcpCollectionPrefix = 'ext.';
export function extensionPrefixedIdentifier(identifier, id) {
    return ExtensionIdentifier.toKey(identifier) + '/' + id;
}
export var McpCollectionSortOrder;
(function (McpCollectionSortOrder) {
    McpCollectionSortOrder[McpCollectionSortOrder["WorkspaceFolder"] = 0] = "WorkspaceFolder";
    McpCollectionSortOrder[McpCollectionSortOrder["Workspace"] = 100] = "Workspace";
    McpCollectionSortOrder[McpCollectionSortOrder["User"] = 200] = "User";
    McpCollectionSortOrder[McpCollectionSortOrder["Extension"] = 300] = "Extension";
    McpCollectionSortOrder[McpCollectionSortOrder["Filesystem"] = 400] = "Filesystem";
    McpCollectionSortOrder[McpCollectionSortOrder["RemoteBoost"] = -50] = "RemoteBoost";
})(McpCollectionSortOrder || (McpCollectionSortOrder = {}));
export var McpCollectionDefinition;
(function (McpCollectionDefinition) {
    function equals(a, b) {
        return (a.id === b.id &&
            a.remoteAuthority === b.remoteAuthority &&
            a.label === b.label &&
            a.isTrustedByDefault === b.isTrustedByDefault);
    }
    McpCollectionDefinition.equals = equals;
})(McpCollectionDefinition || (McpCollectionDefinition = {}));
export var McpServerDefinition;
(function (McpServerDefinition) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinition.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            id: def.id,
            label: def.label,
            launch: McpServerLaunch.fromSerialized(def.launch),
            variableReplacement: def.variableReplacement
                ? McpServerDefinitionVariableReplacement.fromSerialized(def.variableReplacement)
                : undefined,
        };
    }
    McpServerDefinition.fromSerialized = fromSerialized;
    function equals(a, b) {
        return (a.id === b.id &&
            a.label === b.label &&
            arraysEqual(a.roots, b.roots, (a, b) => a.toString() === b.toString()) &&
            objectsEqual(a.launch, b.launch) &&
            objectsEqual(a.presentation, b.presentation) &&
            objectsEqual(a.variableReplacement, b.variableReplacement));
    }
    McpServerDefinition.equals = equals;
})(McpServerDefinition || (McpServerDefinition = {}));
export var McpServerDefinitionVariableReplacement;
(function (McpServerDefinitionVariableReplacement) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinitionVariableReplacement.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            section: def.section,
            folder: def.folder ? { ...def.folder, uri: URI.revive(def.folder.uri) } : undefined,
            target: def.target,
        };
    }
    McpServerDefinitionVariableReplacement.fromSerialized = fromSerialized;
})(McpServerDefinitionVariableReplacement || (McpServerDefinitionVariableReplacement = {}));
export var LazyCollectionState;
(function (LazyCollectionState) {
    LazyCollectionState[LazyCollectionState["HasUnknown"] = 0] = "HasUnknown";
    LazyCollectionState[LazyCollectionState["LoadingUnknown"] = 1] = "LoadingUnknown";
    LazyCollectionState[LazyCollectionState["AllKnown"] = 2] = "AllKnown";
})(LazyCollectionState || (LazyCollectionState = {}));
export const IMcpService = createDecorator('IMcpService');
export var McpServerToolsState;
(function (McpServerToolsState) {
    /** Tools have not been read before */
    McpServerToolsState[McpServerToolsState["Unknown"] = 0] = "Unknown";
    /** Tools were read from the cache */
    McpServerToolsState[McpServerToolsState["Cached"] = 1] = "Cached";
    /** Tools are refreshing for the first time */
    McpServerToolsState[McpServerToolsState["RefreshingFromUnknown"] = 2] = "RefreshingFromUnknown";
    /** Tools are refreshing and the current tools are cached */
    McpServerToolsState[McpServerToolsState["RefreshingFromCached"] = 3] = "RefreshingFromCached";
    /** Tool state is live, server is connected */
    McpServerToolsState[McpServerToolsState["Live"] = 4] = "Live";
})(McpServerToolsState || (McpServerToolsState = {}));
export var McpServerTransportType;
(function (McpServerTransportType) {
    /** A command-line MCP server communicating over standard in/out */
    McpServerTransportType[McpServerTransportType["Stdio"] = 1] = "Stdio";
    /** An MCP server that uses Server-Sent Events */
    McpServerTransportType[McpServerTransportType["SSE"] = 2] = "SSE";
})(McpServerTransportType || (McpServerTransportType = {}));
export var McpServerLaunch;
(function (McpServerLaunch) {
    function toSerialized(launch) {
        return launch;
    }
    McpServerLaunch.toSerialized = toSerialized;
    function fromSerialized(launch) {
        switch (launch.type) {
            case 2 /* McpServerTransportType.SSE */:
                return { type: launch.type, uri: URI.revive(launch.uri), headers: launch.headers };
            case 1 /* McpServerTransportType.Stdio */:
                return {
                    type: launch.type,
                    cwd: launch.cwd ? URI.revive(launch.cwd) : undefined,
                    command: launch.command,
                    args: launch.args,
                    env: launch.env,
                    envFile: launch.envFile,
                };
        }
    }
    McpServerLaunch.fromSerialized = fromSerialized;
})(McpServerLaunch || (McpServerLaunch = {}));
/**
 * McpConnectionState is the state of the underlying connection and is
 * communicated e.g. from the extension host to the renderer.
 */
export var McpConnectionState;
(function (McpConnectionState) {
    let Kind;
    (function (Kind) {
        Kind[Kind["Stopped"] = 0] = "Stopped";
        Kind[Kind["Starting"] = 1] = "Starting";
        Kind[Kind["Running"] = 2] = "Running";
        Kind[Kind["Error"] = 3] = "Error";
    })(Kind = McpConnectionState.Kind || (McpConnectionState.Kind = {}));
    McpConnectionState.toString = (s) => {
        switch (s.state) {
            case 0 /* Kind.Stopped */:
                return localize('mcpstate.stopped', 'Stopped');
            case 1 /* Kind.Starting */:
                return localize('mcpstate.starting', 'Starting');
            case 2 /* Kind.Running */:
                return localize('mcpstate.running', 'Running');
            case 3 /* Kind.Error */:
                return localize('mcpstate.error', 'Error {0}', s.message);
            default:
                assertNever(s);
        }
    };
    McpConnectionState.toKindString = (s) => {
        switch (s) {
            case 0 /* Kind.Stopped */:
                return 'stopped';
            case 1 /* Kind.Starting */:
                return 'starting';
            case 2 /* Kind.Running */:
                return 'running';
            case 3 /* Kind.Error */:
                return 'error';
            default:
                assertNever(s);
        }
    };
    /** Returns if the MCP state is one where starting a new server is valid */
    McpConnectionState.canBeStarted = (s) => s === 3 /* Kind.Error */ || s === 0 /* Kind.Stopped */;
    /** Gets whether the state is a running state. */
    McpConnectionState.isRunning = (s) => !McpConnectionState.canBeStarted(s.state);
})(McpConnectionState || (McpConnectionState = {}));
export class MpcResponseError extends Error {
    constructor(message, code, data) {
        super(`MPC ${code}: ${message}`);
        this.code = code;
        this.data = data;
    }
}
export class McpConnectionFailedError extends Error {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUcvRCxPQUFPLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFekUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBTTVGLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLE1BQU0sQ0FBQTtBQUVsRCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsVUFBK0IsRUFBRSxFQUFVO0lBQ3RGLE9BQU8sbUJBQW1CLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUE7QUFDeEQsQ0FBQztBQXNDRCxNQUFNLENBQU4sSUFBa0Isc0JBUWpCO0FBUkQsV0FBa0Isc0JBQXNCO0lBQ3ZDLHlGQUFtQixDQUFBO0lBQ25CLCtFQUFlLENBQUE7SUFDZixxRUFBVSxDQUFBO0lBQ1YsK0VBQWUsQ0FBQTtJQUNmLGlGQUFnQixDQUFBO0lBRWhCLG1GQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFSaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQVF2QztBQUVELE1BQU0sS0FBVyx1QkFBdUIsQ0FnQnZD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