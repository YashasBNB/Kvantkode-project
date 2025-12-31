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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vY29tbW9uL2NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRzVELE9BQU8sS0FBSyxLQUFLLE1BQU0sK0JBQStCLENBQUE7QUFDdEQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHN0UsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFBO0FBRW5HLE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxLQUFVO0lBQ2xELE9BQU8sQ0FDTixLQUFLO1FBQ0wsT0FBTyxLQUFLLEtBQUssUUFBUTtRQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLGtCQUFrQixJQUFJLE9BQU8sS0FBSyxDQUFDLGtCQUFrQixLQUFLLFFBQVEsQ0FBQztRQUMzRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxZQUFZLEdBQUcsQ0FBQyxDQUNsRCxDQUFBO0FBQ0YsQ0FBQztBQU9ELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxLQUFVO0lBQ3hELE9BQU8sQ0FDTixLQUFLO1FBQ0wsT0FBTyxLQUFLLEtBQUssUUFBUTtRQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLG1CQUFtQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDeEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCO1FBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLEtB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