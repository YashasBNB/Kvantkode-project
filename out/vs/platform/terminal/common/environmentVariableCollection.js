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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUF1QixTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRixPQUFPLEVBQ04sOEJBQThCLEdBTzlCLE1BQU0sMEJBQTBCLENBQUE7QUFJakMsTUFBTSxxQkFBcUIsR0FBZ0QsSUFBSSxHQUFHLENBQUM7SUFDbEYsQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO0lBQ2pELENBQUMsOEJBQThCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQztJQUNuRCxDQUFDLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7Q0FDbkQsQ0FBQyxDQUFBO0FBRUYsTUFBTSxPQUFPLG1DQUFtQztJQUsvQyxZQUFxQixXQUFnRTtRQUFoRSxnQkFBVyxHQUFYLFdBQVcsQ0FBcUQ7UUFKcEUsUUFBRyxHQUE2RCxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ3pFLG1CQUFjLEdBQzlCLElBQUksR0FBRyxFQUFFLENBQUE7UUFHVCxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLG1CQUFtQixFQUFFLEVBQUU7WUFDdkQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1lBQzVELE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbkMsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7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