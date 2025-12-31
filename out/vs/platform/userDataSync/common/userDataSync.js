/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../base/common/arrays.js';
import { isObject, isString } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { allSettings, Extensions as ConfigurationExtensions, getAllConfigurationProperties, parseScope, } from '../../configuration/common/configurationRegistry.js';
import { EXTENSION_IDENTIFIER_PATTERN, } from '../../extensionManagement/common/extensionManagement.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Extensions as JSONExtensions, } from '../../jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../registry/common/platform.js';
export function getDisallowedIgnoredSettings() {
    const allSettings = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
    return Object.keys(allSettings).filter((setting) => !!allSettings[setting].disallowSyncIgnore);
}
export function getDefaultIgnoredSettings(excludeExtensions = false) {
    const allSettings = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
    const ignoredSettings = getIgnoredSettings(allSettings, excludeExtensions);
    const disallowedSettings = getDisallowedIgnoredSettings();
    return distinct([...ignoredSettings, ...disallowedSettings]);
}
export function getIgnoredSettingsForExtension(manifest) {
    if (!manifest.contributes?.configuration) {
        return [];
    }
    const configurations = Array.isArray(manifest.contributes.configuration)
        ? manifest.contributes.configuration
        : [manifest.contributes.configuration];
    if (!configurations.length) {
        return [];
    }
    const properties = getAllConfigurationProperties(configurations);
    return getIgnoredSettings(properties, false);
}
function getIgnoredSettings(properties, excludeExtensions) {
    const ignoredSettings = new Set();
    for (const key in properties) {
        if (excludeExtensions && !!properties[key].source) {
            continue;
        }
        const scope = isString(properties[key].scope)
            ? parseScope(properties[key].scope)
            : properties[key].scope;
        if (properties[key].ignoreSync ||
            scope === 2 /* ConfigurationScope.MACHINE */ ||
            scope === 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */) {
            ignoredSettings.add(key);
        }
    }
    return [...ignoredSettings.values()];
}
export const USER_DATA_SYNC_CONFIGURATION_SCOPE = 'settingsSync';
export const CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM = 'settingsSync.keybindingsPerPlatform';
export function registerConfiguration() {
    const ignoredSettingsSchemaId = 'vscode://schemas/ignoredSettings';
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    configurationRegistry.registerConfiguration({
        id: 'settingsSync',
        order: 30,
        title: localize('settings sync', 'Settings Sync'),
        type: 'object',
        properties: {
            [CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM]: {
                type: 'boolean',
                description: localize('settingsSync.keybindingsPerPlatform', 'Synchronize keybindings for each platform.'),
                default: true,
                scope: 1 /* ConfigurationScope.APPLICATION */,
                tags: ['sync', 'usesOnlineServices'],
            },
            'settingsSync.ignoredExtensions': {
                type: 'array',
                markdownDescription: localize('settingsSync.ignoredExtensions', 'List of extensions to be ignored while synchronizing. The identifier of an extension is always `${publisher}.${name}`. For example: `vscode.csharp`.'),
                items: [
                    {
                        type: 'string',
                        pattern: EXTENSION_IDENTIFIER_PATTERN,
                        errorMessage: localize('app.extension.identifier.errorMessage', "Expected format '${publisher}.${name}'. Example: 'vscode.csharp'."),
                    },
                ],
                default: [],
                scope: 1 /* ConfigurationScope.APPLICATION */,
                uniqueItems: true,
                disallowSyncIgnore: true,
                tags: ['sync', 'usesOnlineServices'],
            },
            'settingsSync.ignoredSettings': {
                type: 'array',
                description: localize('settingsSync.ignoredSettings', 'Configure settings to be ignored while synchronizing.'),
                default: [],
                scope: 1 /* ConfigurationScope.APPLICATION */,
                $ref: ignoredSettingsSchemaId,
                additionalProperties: true,
                uniqueItems: true,
                disallowSyncIgnore: true,
                tags: ['sync', 'usesOnlineServices'],
            },
        },
    });
    const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
    const registerIgnoredSettingsSchema = () => {
        const disallowedIgnoredSettings = getDisallowedIgnoredSettings();
        const defaultIgnoredSettings = getDefaultIgnoredSettings();
        const settings = Object.keys(allSettings.properties).filter((setting) => !defaultIgnoredSettings.includes(setting));
        const ignoredSettings = defaultIgnoredSettings.filter((setting) => !disallowedIgnoredSettings.includes(setting));
        const ignoredSettingsSchema = {
            items: {
                type: 'string',
                enum: [...settings, ...ignoredSettings.map((setting) => `-${setting}`)],
            },
        };
        jsonRegistry.registerSchema(ignoredSettingsSchemaId, ignoredSettingsSchema);
    };
    return configurationRegistry.onDidUpdateConfiguration(() => registerIgnoredSettingsSchema());
}
export function isAuthenticationProvider(thing) {
    return thing && isObject(thing) && isString(thing.id) && Array.isArray(thing.scopes);
}
export var SyncResource;
(function (SyncResource) {
    SyncResource["Settings"] = "settings";
    SyncResource["Keybindings"] = "keybindings";
    SyncResource["Snippets"] = "snippets";
    SyncResource["Prompts"] = "prompts";
    SyncResource["Tasks"] = "tasks";
    SyncResource["Extensions"] = "extensions";
    SyncResource["GlobalState"] = "globalState";
    SyncResource["Profiles"] = "profiles";
    SyncResource["WorkspaceState"] = "workspaceState";
})(SyncResource || (SyncResource = {}));
export const ALL_SYNC_RESOURCES = [
    "settings" /* SyncResource.Settings */,
    "keybindings" /* SyncResource.Keybindings */,
    "snippets" /* SyncResource.Snippets */,
    "prompts" /* SyncResource.Prompts */,
    "tasks" /* SyncResource.Tasks */,
    "extensions" /* SyncResource.Extensions */,
    "globalState" /* SyncResource.GlobalState */,
    "profiles" /* SyncResource.Profiles */,
];
export function getPathSegments(collection, ...paths) {
    return collection ? [collection, ...paths] : paths;
}
export function getLastSyncResourceUri(collection, syncResource, environmentService, extUri) {
    return extUri.joinPath(environmentService.userDataSyncHome, ...getPathSegments(collection, syncResource, `lastSync${syncResource}.json`));
}
export const IUserDataSyncStoreManagementService = createDecorator('IUserDataSyncStoreManagementService');
export const IUserDataSyncStoreService = createDecorator('IUserDataSyncStoreService');
export const IUserDataSyncLocalStoreService = createDecorator('IUserDataSyncLocalStoreService');
//#endregion
// #region User Data Sync Headers
export const HEADER_OPERATION_ID = 'x-operation-id';
export const HEADER_EXECUTION_ID = 'X-Execution-Id';
export function createSyncHeaders(executionId) {
    const headers = {};
    headers[HEADER_EXECUTION_ID] = executionId;
    return headers;
}
//#endregion
// #region User Data Sync Error
export var UserDataSyncErrorCode;
(function (UserDataSyncErrorCode) {
    // Client Errors (>= 400 )
    UserDataSyncErrorCode["Unauthorized"] = "Unauthorized"; /* 401 */
    UserDataSyncErrorCode["Forbidden"] = "Forbidden"; /* 403 */
    UserDataSyncErrorCode["NotFound"] = "NotFound"; /* 404 */
    UserDataSyncErrorCode["MethodNotFound"] = "MethodNotFound"; /* 405 */
    UserDataSyncErrorCode["Conflict"] = "Conflict"; /* 409 */
    UserDataSyncErrorCode["Gone"] = "Gone"; /* 410 */
    UserDataSyncErrorCode["PreconditionFailed"] = "PreconditionFailed"; /* 412 */
    UserDataSyncErrorCode["TooLarge"] = "TooLarge"; /* 413 */
    UserDataSyncErrorCode["UpgradeRequired"] = "UpgradeRequired"; /* 426 */
    UserDataSyncErrorCode["PreconditionRequired"] = "PreconditionRequired"; /* 428 */
    UserDataSyncErrorCode["TooManyRequests"] = "RemoteTooManyRequests"; /* 429 */
    UserDataSyncErrorCode["TooManyRequestsAndRetryAfter"] = "TooManyRequestsAndRetryAfter"; /* 429 + Retry-After */
    // Local Errors
    UserDataSyncErrorCode["RequestFailed"] = "RequestFailed";
    UserDataSyncErrorCode["RequestCanceled"] = "RequestCanceled";
    UserDataSyncErrorCode["RequestTimeout"] = "RequestTimeout";
    UserDataSyncErrorCode["RequestProtocolNotSupported"] = "RequestProtocolNotSupported";
    UserDataSyncErrorCode["RequestPathNotEscaped"] = "RequestPathNotEscaped";
    UserDataSyncErrorCode["RequestHeadersNotObject"] = "RequestHeadersNotObject";
    UserDataSyncErrorCode["NoCollection"] = "NoCollection";
    UserDataSyncErrorCode["NoRef"] = "NoRef";
    UserDataSyncErrorCode["EmptyResponse"] = "EmptyResponse";
    UserDataSyncErrorCode["TurnedOff"] = "TurnedOff";
    UserDataSyncErrorCode["SessionExpired"] = "SessionExpired";
    UserDataSyncErrorCode["ServiceChanged"] = "ServiceChanged";
    UserDataSyncErrorCode["DefaultServiceChanged"] = "DefaultServiceChanged";
    UserDataSyncErrorCode["LocalTooManyProfiles"] = "LocalTooManyProfiles";
    UserDataSyncErrorCode["LocalTooManyRequests"] = "LocalTooManyRequests";
    UserDataSyncErrorCode["LocalPreconditionFailed"] = "LocalPreconditionFailed";
    UserDataSyncErrorCode["LocalInvalidContent"] = "LocalInvalidContent";
    UserDataSyncErrorCode["LocalError"] = "LocalError";
    UserDataSyncErrorCode["IncompatibleLocalContent"] = "IncompatibleLocalContent";
    UserDataSyncErrorCode["IncompatibleRemoteContent"] = "IncompatibleRemoteContent";
    UserDataSyncErrorCode["Unknown"] = "Unknown";
})(UserDataSyncErrorCode || (UserDataSyncErrorCode = {}));
export class UserDataSyncError extends Error {
    constructor(message, code, resource, operationId) {
        super(message);
        this.code = code;
        this.resource = resource;
        this.operationId = operationId;
        this.name = `${this.code} (UserDataSyncError) syncResource:${this.resource || 'unknown'} operationId:${this.operationId || 'unknown'}`;
    }
}
export class UserDataSyncStoreError extends UserDataSyncError {
    constructor(message, url, code, serverCode, operationId) {
        super(message, code, undefined, operationId);
        this.url = url;
        this.serverCode = serverCode;
    }
}
export class UserDataAutoSyncError extends UserDataSyncError {
    constructor(message, code) {
        super(message, code);
    }
}
(function (UserDataSyncError) {
    function toUserDataSyncError(error) {
        if (error instanceof UserDataSyncError) {
            return error;
        }
        const match = /^(.+) \(UserDataSyncError\) syncResource:(.+) operationId:(.+)$/.exec(error.name);
        if (match && match[1]) {
            const syncResource = match[2] === 'unknown' ? undefined : match[2];
            const operationId = match[3] === 'unknown' ? undefined : match[3];
            return new UserDataSyncError(error.message, match[1], syncResource, operationId);
        }
        return new UserDataSyncError(error.message, "Unknown" /* UserDataSyncErrorCode.Unknown */);
    }
    UserDataSyncError.toUserDataSyncError = toUserDataSyncError;
})(UserDataSyncError || (UserDataSyncError = {}));
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["Uninitialized"] = "uninitialized";
    SyncStatus["Idle"] = "idle";
    SyncStatus["Syncing"] = "syncing";
    SyncStatus["HasConflicts"] = "hasConflicts";
})(SyncStatus || (SyncStatus = {}));
export var Change;
(function (Change) {
    Change[Change["None"] = 0] = "None";
    Change[Change["Added"] = 1] = "Added";
    Change[Change["Modified"] = 2] = "Modified";
    Change[Change["Deleted"] = 3] = "Deleted";
})(Change || (Change = {}));
export var MergeState;
(function (MergeState) {
    MergeState["Preview"] = "preview";
    MergeState["Conflict"] = "conflict";
    MergeState["Accepted"] = "accepted";
})(MergeState || (MergeState = {}));
//#endregion
// #region keys synced only in web
export const SYNC_SERVICE_URL_TYPE = 'sync.store.url.type';
export function getEnablementKey(resource) {
    return `sync.enable.${resource}`;
}
// #endregion
// #region User Data Sync Services
export const IUserDataSyncEnablementService = createDecorator('IUserDataSyncEnablementService');
export const IUserDataSyncService = createDecorator('IUserDataSyncService');
export const IUserDataSyncResourceProviderService = createDecorator('IUserDataSyncResourceProviderService');
export const IUserDataAutoSyncService = createDecorator('IUserDataAutoSyncService');
export const IUserDataSyncUtilService = createDecorator('IUserDataSyncUtilService');
export const IUserDataSyncLogService = createDecorator('IUserDataSyncLogService');
//#endregion
export const USER_DATA_SYNC_LOG_ID = 'userDataSync';
export const USER_DATA_SYNC_SCHEME = 'vscode-userdata-sync';
export const PREVIEW_DIR_NAME = 'preview';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBUXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFDTixXQUFXLEVBRVgsVUFBVSxJQUFJLHVCQUF1QixFQUdyQyw2QkFBNkIsRUFDN0IsVUFBVSxHQUNWLE1BQU0scURBQXFELENBQUE7QUFFNUQsT0FBTyxFQUNOLDRCQUE0QixHQUU1QixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sVUFBVSxJQUFJLGNBQWMsR0FFNUIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFPNUQsTUFBTSxVQUFVLDRCQUE0QjtJQUMzQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUM5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtJQUM5QixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDL0YsQ0FBQztBQUVELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxvQkFBNkIs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