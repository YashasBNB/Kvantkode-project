/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../base/common/assert.js';
import * as types from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IConfigurationService = createDecorator('configurationService');
export function isConfigurationOverrides(thing) {
    return (thing &&
        typeof thing === 'object' &&
        (!thing.overrideIdentifier || typeof thing.overrideIdentifier === 'string') &&
        (!thing.resource || thing.resource instanceof URI));
}
export function isConfigurationUpdateOverrides(thing) {
    return (thing &&
        typeof thing === 'object' &&
        (!thing.overrideIdentifiers || Array.isArray(thing.overrideIdentifiers)) &&
        !thing.overrideIdentifier &&
        (!thing.resource || thing.resource instanceof URI));
}
export var ConfigurationTarget;
(function (ConfigurationTarget) {
    ConfigurationTarget[ConfigurationTarget["APPLICATION"] = 1] = "APPLICATION";
    ConfigurationTarget[ConfigurationTarget["USER"] = 2] = "USER";
    ConfigurationTarget[ConfigurationTarget["USER_LOCAL"] = 3] = "USER_LOCAL";
    ConfigurationTarget[ConfigurationTarget["USER_REMOTE"] = 4] = "USER_REMOTE";
    ConfigurationTarget[ConfigurationTarget["WORKSPACE"] = 5] = "WORKSPACE";
    ConfigurationTarget[ConfigurationTarget["WORKSPACE_FOLDER"] = 6] = "WORKSPACE_FOLDER";
    ConfigurationTarget[ConfigurationTarget["DEFAULT"] = 7] = "DEFAULT";
    ConfigurationTarget[ConfigurationTarget["MEMORY"] = 8] = "MEMORY";
})(ConfigurationTarget || (ConfigurationTarget = {}));
export function ConfigurationTargetToString(configurationTarget) {
    switch (configurationTarget) {
        case 1 /* ConfigurationTarget.APPLICATION */:
            return 'APPLICATION';
        case 2 /* ConfigurationTarget.USER */:
            return 'USER';
        case 3 /* ConfigurationTarget.USER_LOCAL */:
            return 'USER_LOCAL';
        case 4 /* ConfigurationTarget.USER_REMOTE */:
            return 'USER_REMOTE';
        case 5 /* ConfigurationTarget.WORKSPACE */:
            return 'WORKSPACE';
        case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
            return 'WORKSPACE_FOLDER';
        case 7 /* ConfigurationTarget.DEFAULT */:
            return 'DEFAULT';
        case 8 /* ConfigurationTarget.MEMORY */:
            return 'MEMORY';
    }
}
export function getConfigValueInTarget(configValue, scope) {
    switch (scope) {
        case 1 /* ConfigurationTarget.APPLICATION */:
            return configValue.applicationValue;
        case 2 /* ConfigurationTarget.USER */:
            return configValue.userValue;
        case 3 /* ConfigurationTarget.USER_LOCAL */:
            return configValue.userLocalValue;
        case 4 /* ConfigurationTarget.USER_REMOTE */:
            return configValue.userRemoteValue;
        case 5 /* ConfigurationTarget.WORKSPACE */:
            return configValue.workspaceValue;
        case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
            return configValue.workspaceFolderValue;
        case 7 /* ConfigurationTarget.DEFAULT */:
            return configValue.defaultValue;
        case 8 /* ConfigurationTarget.MEMORY */:
            return configValue.memoryValue;
        default:
            assertNever(scope);
    }
}
export function isConfigured(configValue) {
    return (configValue.applicationValue !== undefined ||
        configValue.userValue !== undefined ||
        configValue.userLocalValue !== undefined ||
        configValue.userRemoteValue !== undefined ||
        configValue.workspaceValue !== undefined ||
        configValue.workspaceFolderValue !== undefined);
}
export function toValuesTree(properties, conflictReporter) {
    const root = Object.create(null);
    for (const key in properties) {
        addToValueTree(root, key, properties[key], conflictReporter);
    }
    return root;
}
export function addToValueTree(settingsTreeRoot, key, value, conflictReporter) {
    const segments = key.split('.');
    const last = segments.pop();
    let curr = settingsTreeRoot;
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        let obj = curr[s];
        switch (typeof obj) {
            case 'undefined':
                obj = curr[s] = Object.create(null);
                break;
            case 'object':
                if (obj === null) {
                    conflictReporter(`Ignoring ${key} as ${segments.slice(0, i + 1).join('.')} is null`);
                    return;
                }
                break;
            default:
                conflictReporter(`Ignoring ${key} as ${segments.slice(0, i + 1).join('.')} is ${JSON.stringify(obj)}`);
                return;
        }
        curr = obj;
    }
    if (typeof curr === 'object' && curr !== null) {
        try {
            curr[last] = value; // workaround https://github.com/microsoft/vscode/issues/13606
        }
        catch (e) {
            conflictReporter(`Ignoring ${key} as ${segments.join('.')} is ${JSON.stringify(curr)}`);
        }
    }
    else {
        conflictReporter(`Ignoring ${key} as ${segments.join('.')} is ${JSON.stringify(curr)}`);
    }
}
export function removeFromValueTree(valueTree, key) {
    const segments = key.split('.');
    doRemoveFromValueTree(valueTree, segments);
}
function doRemoveFromValueTree(valueTree, segments) {
    if (!valueTree) {
        return;
    }
    const first = segments.shift();
    if (segments.length === 0) {
        // Reached last segment
        delete valueTree[first];
        return;
    }
    if (Object.keys(valueTree).indexOf(first) !== -1) {
        const value = valueTree[first];
        if (typeof value === 'object' && !Array.isArray(value)) {
            doRemoveFromValueTree(value, segments);
            if (Object.keys(value).length === 0) {
                delete valueTree[first];
            }
        }
    }
}
export function getConfigurationValue(config, settingPath, defaultValue) {
    function accessSetting(config, path) {
        let current = config;
        for (const component of path) {
            if (typeof current !== 'object' || current === null) {
                return undefined;
            }
            current = current[component];
        }
        return current;
    }
    const path = settingPath.split('.');
    const result = accessSetting(config, path);
    return typeof result === 'undefined' ? defaultValue : result;
}
export function merge(base, add, overwrite) {
    Object.keys(add).forEach((key) => {
        if (key !== '__proto__') {
            if (key in base) {
                if (types.isObject(base[key]) && types.isObject(add[key])) {
                    merge(base[key], add[key], overwrite);
                }
                else if (overwrite) {
                    base[key] = add[key];
                }
            }
            else {
                base[key] = add[key];
            }
        }
    });
}
export function getLanguageTagSettingPlainKey(settingKey) {
    return settingKey.replace(/[\[\]]/g, '');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi9jb21tb24vY29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHNUQsT0FBTyxLQUFLLEtBQUssTUFBTSwrQkFBK0IsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUc3RSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUE7QUFFbkcsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQVU7SUFDbEQsT0FBTyxDQUNOLEtBQUs7UUFDTCxPQUFPLEtBQUssS0FBSyxRQUFRO1FBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLElBQUksT0FBTyxLQUFLLENBQUMsa0JBQWtCLEtBQUssUUFBUSxDQUFDO1FBQzNFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxRQUFRLFlBQVksR0FBRyxDQUFDLENBQ2xELENBQUE7QUFDRixDQUFDO0FBT0QsTUFBTSxVQUFVLDhCQUE4QixDQUFDLEtBQVU7SUFDeEQsT0FBTyxDQUNOLEtBQUs7UUFDTCxPQUFPLEtBQUssS0FBSyxRQUFRO1FBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN4RSxDQUFDLEtBQUssQ0FBQyxrQkFBa0I7UUFDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLElB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