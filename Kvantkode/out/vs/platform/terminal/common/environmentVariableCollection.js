/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../base/common/platform.js';
import { EnvironmentVariableMutatorType, } from './environmentVariable.js';
const mutatorTypeToLabelMap = new Map([
    [EnvironmentVariableMutatorType.Append, 'APPEND'],
    [EnvironmentVariableMutatorType.Prepend, 'PREPEND'],
    [EnvironmentVariableMutatorType.Replace, 'REPLACE'],
]);
export class MergedEnvironmentVariableCollection {
    constructor(collections) {
        this.collections = collections;
        this.map = new Map();
        this.descriptionMap = new Map();
        collections.forEach((collection, extensionIdentifier) => {
            this.populateDescriptionMap(collection, extensionIdentifier);
            const it = collection.map.entries();
            let next = it.next();
            while (!next.done) {
                const mutator = next.value[1];
                const key = next.value[0];
                let entry = this.map.get(key);
                if (!entry) {
                    entry = [];
                    this.map.set(key, entry);
                }
                // If the first item in the entry is replace ignore any other entries as they would
                // just get replaced by this one.
                if (entry.length > 0 && entry[0].type === EnvironmentVariableMutatorType.Replace) {
                    next = it.next();
                    continue;
                }
                const extensionMutator = {
                    extensionIdentifier,
                    value: mutator.value,
                    type: mutator.type,
                    scope: mutator.scope,
                    variable: mutator.variable,
                    options: mutator.options,
                };
                if (!extensionMutator.scope) {
                    delete extensionMutator.scope; // Convenient for tests
                }
                // Mutators get applied in the reverse order than they are created
                entry.unshift(extensionMutator);
                next = it.next();
            }
        });
    }
    async applyToProcessEnvironment(env, scope, variableResolver) {
        let lowerToActualVariableNames;
        if (isWindows) {
            lowerToActualVariableNames = {};
            Object.keys(env).forEach((e) => (lowerToActualVariableNames[e.toLowerCase()] = e));
        }
        for (const [variable, mutators] of this.getVariableMap(scope)) {
            const actualVariable = isWindows
                ? lowerToActualVariableNames[variable.toLowerCase()] || variable
                : variable;
            for (const mutator of mutators) {
                const value = variableResolver ? await variableResolver(mutator.value) : mutator.value;
                // Default: true
                if (mutator.options?.applyAtProcessCreation ?? true) {
                    switch (mutator.type) {
                        case EnvironmentVariableMutatorType.Append:
                            env[actualVariable] = (env[actualVariable] || '') + value;
                            break;
                        case EnvironmentVariableMutatorType.Prepend:
                            env[actualVariable] = value + (env[actualVariable] || '');
                            break;
                        case EnvironmentVariableMutatorType.Replace:
                            env[actualVariable] = value;
                            break;
                    }
                }
                // Default: false
                if (mutator.options?.applyAtShellIntegration ?? false) {
                    const key = `VSCODE_ENV_${mutatorTypeToLabelMap.get(mutator.type)}`;
                    env[key] = (env[key] ? env[key] + ':' : '') + variable + '=' + this._encodeColons(value);
                }
            }
        }
    }
    _encodeColons(value) {
        return value.replaceAll(':', '\\x3a');
    }
    diff(other, scope) {
        const added = new Map();
        const changed = new Map();
        const removed = new Map();
        // Find added
        other.getVariableMap(scope).forEach((otherMutators, variable) => {
            const currentMutators = this.getVariableMap(scope).get(variable);
            const result = getMissingMutatorsFromArray(otherMutators, currentMutators);
            if (result) {
                added.set(variable, result);
            }
        });
        // Find removed
        this.getVariableMap(scope).forEach((currentMutators, variable) => {
            const otherMutators = other.getVariableMap(scope).get(variable);
            const result = getMissingMutatorsFromArray(currentMutators, otherMutators);
            if (result) {
                removed.set(variable, result);
            }
        });
        // Find changed
        this.getVariableMap(scope).forEach((currentMutators, variable) => {
            const otherMutators = other.getVariableMap(scope).get(variable);
            const result = getChangedMutatorsFromArray(currentMutators, otherMutators);
            if (result) {
                changed.set(variable, result);
            }
        });
        if (added.size === 0 && changed.size === 0 && removed.size === 0) {
            return undefined;
        }
        return { added, changed, removed };
    }
    getVariableMap(scope) {
        const result = new Map();
        for (const mutators of this.map.values()) {
            const filteredMutators = mutators.filter((m) => filterScope(m, scope));
            if (filteredMutators.length > 0) {
                // All of these mutators are for the same variable because they are in the same scope, hence choose anyone to form a key.
                result.set(filteredMutators[0].variable, filteredMutators);
            }
        }
        return result;
    }
    getDescriptionMap(scope) {
        const result = new Map();
        for (const mutators of this.descriptionMap.values()) {
            const filteredMutators = mutators.filter((m) => filterScope(m, scope, true));
            for (const mutator of filteredMutators) {
                result.set(mutator.extensionIdentifier, mutator.description);
            }
        }
        return result;
    }
    populateDescriptionMap(collection, extensionIdentifier) {
        if (!collection.descriptionMap) {
            return;
        }
        const it = collection.descriptionMap.entries();
        let next = it.next();
        while (!next.done) {
            const mutator = next.value[1];
            const key = next.value[0];
            let entry = this.descriptionMap.get(key);
            if (!entry) {
                entry = [];
                this.descriptionMap.set(key, entry);
            }
            const extensionMutator = {
                extensionIdentifier,
                scope: mutator.scope,
                description: mutator.description,
            };
            if (!extensionMutator.scope) {
                delete extensionMutator.scope; // Convenient for tests
            }
            entry.push(extensionMutator);
            next = it.next();
        }
    }
}
/**
 * Returns whether a mutator matches with the scope provided.
 * @param mutator Mutator to filter
 * @param scope Scope to be used for querying
 * @param strictFilter If true, mutators with global scope is not returned when querying for workspace scope.
 * i.e whether mutator scope should always exactly match with query scope.
 */
function filterScope(mutator, scope, strictFilter = false) {
    if (!mutator.scope) {
        if (strictFilter) {
            return scope === mutator.scope;
        }
        return true;
    }
    // If a mutator is scoped to a workspace folder, only apply it if the workspace
    // folder matches.
    if (mutator.scope.workspaceFolder &&
        scope?.workspaceFolder &&
        mutator.scope.workspaceFolder.index === scope.workspaceFolder.index) {
        return true;
    }
    return false;
}
function getMissingMutatorsFromArray(current, other) {
    // If it doesn't exist, all are removed
    if (!other) {
        return current;
    }
    // Create a map to help
    const otherMutatorExtensions = new Set();
    other.forEach((m) => otherMutatorExtensions.add(m.extensionIdentifier));
    // Find entries removed from other
    const result = [];
    current.forEach((mutator) => {
        if (!otherMutatorExtensions.has(mutator.extensionIdentifier)) {
            result.push(mutator);
        }
    });
    return result.length === 0 ? undefined : result;
}
function getChangedMutatorsFromArray(current, other) {
    // If it doesn't exist, none are changed (they are removed)
    if (!other) {
        return undefined;
    }
    // Create a map to help
    const otherMutatorExtensions = new Map();
    other.forEach((m) => otherMutatorExtensions.set(m.extensionIdentifier, m));
    // Find entries that exist in both but are not equal
    const result = [];
    current.forEach((mutator) => {
        const otherMutator = otherMutatorExtensions.get(mutator.extensionIdentifier);
        if (otherMutator &&
            (mutator.type !== otherMutator.type ||
                mutator.value !== otherMutator.value ||
                mutator.scope?.workspaceFolder?.index !== otherMutator.scope?.workspaceFolder?.index)) {
            // Return the new result, not the old one
            result.push(otherMutator);
        }
    });
    return result.length === 0 ? undefined : result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9lbnZpcm9ubWVudFZhcmlhYmxlQ29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXVCLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pGLE9BQU8sRUFDTiw4QkFBOEIsR0FPOUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUlqQyxNQUFNLHFCQUFxQixHQUFnRCxJQUFJLEdBQUcsQ0FBQztJQUNsRixDQUFDLDhCQUE4QixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7SUFDakQsQ0FBQyw4QkFBOEIsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDO0lBQ25ELENBQUMsOEJBQThCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQztDQUNuRCxDQUFDLENBQUE7QUFFRixNQUFNLE9BQU8sbUNBQW1DO0lBSy9DLFlBQXFCLFdBQWdFO1FBQWhFLGdCQUFXLEdBQVgsV0FBVyxDQUFxRDtRQUpwRSxRQUFHLEdBQTZELElBQUksR0FBRyxFQUFFLENBQUE7UUFDekUsbUJBQWMsR0FDOUIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUdULFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsRUFBRTtZQUN2RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVSxFQUFFLG1CQUFtQixDQUFDLENBQUE7WUFDNUQsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNuQyxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUs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