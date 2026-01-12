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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFRekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUNOLFdBQVcsRUFFWCxVQUFVLElBQUksdUJBQXVCLEVBR3JDLDZCQUE2QixFQUM3QixVQUFVLEdBQ1YsTUFBTSxxREFBcUQsQ0FBQTtBQUU1RCxPQUFPLEVBQ04sNEJBQTRCLEdBRTVCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFDTixVQUFVLElBQUksY0FBYyxHQUU1QixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQU81RCxNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQzlCLHVCQUF1QixDQUFDLGFBQWEsQ0FDckMsQ0FBQywwQkFBMEIsRUFBRSxDQUFBO0lBQzlCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtBQUMvRixDQUFDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLG9C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