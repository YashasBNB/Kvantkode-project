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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRy9ELE9BQU8sRUFBRSxNQUFNLElBQUksWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFNNUYsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsTUFBTSxDQUFBO0FBRWxELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxVQUErQixFQUFFLEVBQVU7SUFDdEYsT0FBTyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQTtBQUN4RCxDQUFDO0FBc0NELE1BQU0sQ0FBTixJQUFrQixzQkFRakI7QUFSRCxXQUFrQixzQkFBc0I7SUFDdkMseUZBQW1CLENBQUE7SUFDbkIsK0VBQWUsQ0FBQTtJQUNmLHFFQUFVLENBQUE7SUFDViwrRUFBZSxDQUFBO0lBQ2YsaUZBQWdCLENBQUE7SUFFaEIsbUZBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQVJpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBUXZDO0FBRUQsTUFBTSxLQUFXLHVCQUF1QixD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