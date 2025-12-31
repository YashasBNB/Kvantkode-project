/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { mixin, deepClone } from '../../../base/common/objects.js';
import { Emitter } from '../../../base/common/event.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { MainContext, } from './extHost.protocol.js';
import { ConfigurationTarget as ExtHostConfigurationTarget } from './extHostTypes.js';
import { Configuration, ConfigurationChangeEvent, } from '../../../platform/configuration/common/configurationModels.js';
import { OVERRIDE_PROPERTY_REGEX, } from '../../../platform/configuration/common/configurationRegistry.js';
import { isObject } from '../../../base/common/types.js';
import { Barrier } from '../../../base/common/async.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { URI } from '../../../base/common/uri.js';
function lookUp(tree, key) {
    if (key) {
        const parts = key.split('.');
        let node = tree;
        for (let i = 0; node && i < parts.length; i++) {
            node = node[parts[i]];
        }
        return node;
    }
}
function isUri(thing) {
    return thing instanceof URI;
}
function isResourceLanguage(thing) {
    return (thing && thing.uri instanceof URI && thing.languageId && typeof thing.languageId === 'string');
}
function isLanguage(thing) {
    return thing && !thing.uri && thing.languageId && typeof thing.languageId === 'string';
}
function isWorkspaceFolder(thing) {
    return (thing &&
        thing.uri instanceof URI &&
        (!thing.name || typeof thing.name === 'string') &&
        (!thing.index || typeof thing.index === 'number'));
}
function scopeToOverrides(scope) {
    if (isUri(scope)) {
        return { resource: scope };
    }
    if (isResourceLanguage(scope)) {
        return { resource: scope.uri, overrideIdentifier: scope.languageId };
    }
    if (isLanguage(scope)) {
        return { overrideIdentifier: scope.languageId };
    }
    if (isWorkspaceFolder(scope)) {
        return { resource: scope.uri };
    }
    if (scope === null) {
        return { resource: null };
    }
    return undefined;
}
let ExtHostConfiguration = class ExtHostConfiguration {
    constructor(extHostRpc, extHostWorkspace, logService) {
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadConfiguration);
        this._extHostWorkspace = extHostWorkspace;
        this._logService = logService;
        this._barrier = new Barrier();
        this._actual = null;
    }
    getConfigProvider() {
        return this._barrier.wait().then((_) => this._actual);
    }
    $initializeConfiguration(data) {
        this._actual = new ExtHostConfigProvider(this._proxy, this._extHostWorkspace, data, this._logService);
        this._barrier.open();
    }
    $acceptConfigurationChanged(data, change) {
        this.getConfigProvider().then((provider) => provider.$acceptConfigurationChanged(data, change));
    }
};
ExtHostConfiguration = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostWorkspace),
    __param(2, ILogService)
], ExtHostConfiguration);
export { ExtHostConfiguration };
export class ExtHostConfigProvider {
    constructor(proxy, extHostWorkspace, data, logService) {
        this._onDidChangeConfiguration = new Emitter();
        this._proxy = proxy;
        this._logService = logService;
        this._extHostWorkspace = extHostWorkspace;
        this._configuration = Configuration.parse(data, logService);
        this._configurationScopes = this._toMap(data.configurationScopes);
    }
    get onDidChangeConfiguration() {
        return this._onDidChangeConfiguration && this._onDidChangeConfiguration.event;
    }
    $acceptConfigurationChanged(data, change) {
        const previous = {
            data: this._configuration.toData(),
            workspace: this._extHostWorkspace.workspace,
        };
        this._configuration = Configuration.parse(data, this._logService);
        this._configurationScopes = this._toMap(data.configurationScopes);
        this._onDidChangeConfiguration.fire(this._toConfigurationChangeEvent(change, previous));
    }
    getConfiguration(section, scope, extensionDescription) {
        const overrides = scopeToOverrides(scope) || {};
        const config = this._toReadonlyValue(this._configuration.getValue(section, overrides, this._extHostWorkspace.workspace));
        if (section) {
            this._validateConfigurationAccess(section, overrides, extensionDescription?.identifier);
        }
        function parseConfigurationTarget(arg) {
            if (arg === undefined || arg === null) {
                return null;
            }
            if (typeof arg === 'boolean') {
                return arg ? 2 /* ConfigurationTarget.USER */ : 5 /* ConfigurationTarget.WORKSPACE */;
            }
            switch (arg) {
                case ExtHostConfigurationTarget.Global:
                    return 2 /* ConfigurationTarget.USER */;
                case ExtHostConfigurationTarget.Workspace:
                    return 5 /* ConfigurationTarget.WORKSPACE */;
                case ExtHostConfigurationTarget.WorkspaceFolder:
                    return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
        }
        const result = {
            has(key) {
                return typeof lookUp(config, key) !== 'undefined';
            },
            get: (key, defaultValue) => {
                this._validateConfigurationAccess(section ? `${section}.${key}` : key, overrides, extensionDescription?.identifier);
                let result = lookUp(config, key);
                if (typeof result === 'undefined') {
                    result = defaultValue;
                }
                else {
                    let clonedConfig = undefined;
                    const cloneOnWriteProxy = (target, accessor) => {
                        if (isObject(target)) {
                            let clonedTarget = undefined;
                            const cloneTarget = () => {
                                clonedConfig = clonedConfig ? clonedConfig : deepClone(config);
                                clonedTarget = clonedTarget ? clonedTarget : lookUp(clonedConfig, accessor);
                            };
                            return new Proxy(target, {
                                get: (target, property) => {
                                    if (typeof property === 'string' && property.toLowerCase() === 'tojson') {
                                        cloneTarget();
                                        return () => clonedTarget;
                                    }
                                    if (clonedConfig) {
                                        clonedTarget = clonedTarget ? clonedTarget : lookUp(clonedConfig, accessor);
                                        return clonedTarget[property];
                                    }
                                    const result = target[property];
                                    if (typeof property === 'string') {
                                        return cloneOnWriteProxy(result, `${accessor}.${property}`);
                                    }
                                    return result;
                                },
                                set: (_target, property, value) => {
                                    cloneTarget();
                                    if (clonedTarget) {
                                        clonedTarget[property] = value;
                                    }
                                    return true;
                                },
                                deleteProperty: (_target, property) => {
                                    cloneTarget();
                                    if (clonedTarget) {
                                        delete clonedTarget[property];
                                    }
                                    return true;
                                },
                                defineProperty: (_target, property, descriptor) => {
                                    cloneTarget();
                                    if (clonedTarget) {
                                        Object.defineProperty(clonedTarget, property, descriptor);
                                    }
                                    return true;
                                },
                            });
                        }
                        if (Array.isArray(target)) {
                            return deepClone(target);
                        }
                        return target;
                    };
                    result = cloneOnWriteProxy(result, key);
                }
                return result;
            },
            update: (key, value, extHostConfigurationTarget, scopeToLanguage) => {
                key = section ? `${section}.${key}` : key;
                const target = parseConfigurationTarget(extHostConfigurationTarget);
                if (value !== undefined) {
                    return this._proxy.$updateConfigurationOption(target, key, value, overrides, scopeToLanguage);
                }
                else {
                    return this._proxy.$removeConfigurationOption(target, key, overrides, scopeToLanguage);
                }
            },
            inspect: (key) => {
                key = section ? `${section}.${key}` : key;
                const config = this._configuration.inspect(key, overrides, this._extHostWorkspace.workspace);
                if (config) {
                    return {
                        key,
                        defaultValue: deepClone(config.policy?.value ?? config.default?.value),
                        globalLocalValue: deepClone(config.userLocal?.value),
                        globalRemoteValue: deepClone(config.userRemote?.value),
                        globalValue: deepClone(config.user?.value ?? config.application?.value),
                        workspaceValue: deepClone(config.workspace?.value),
                        workspaceFolderValue: deepClone(config.workspaceFolder?.value),
                        defaultLanguageValue: deepClone(config.default?.override),
                        globalLocalLanguageValue: deepClone(config.userLocal?.override),
                        globalRemoteLanguageValue: deepClone(config.userRemote?.override),
                        globalLanguageValue: deepClone(config.user?.override ?? config.application?.override),
                        workspaceLanguageValue: deepClone(config.workspace?.override),
                        workspaceFolderLanguageValue: deepClone(config.workspaceFolder?.override),
                        languageIds: deepClone(config.overrideIdentifiers),
                    };
                }
                return undefined;
            },
        };
        if (typeof config === 'object') {
            mixin(result, config, false);
        }
        return Object.freeze(result);
    }
    _toReadonlyValue(result) {
        const readonlyProxy = (target) => {
            return isObject(target)
                ? new Proxy(target, {
                    get: (target, property) => readonlyProxy(target[property]),
                    set: (_target, property, _value) => {
                        throw new Error(`TypeError: Cannot assign to read only property '${String(property)}' of object`);
                    },
                    deleteProperty: (_target, property) => {
                        throw new Error(`TypeError: Cannot delete read only property '${String(property)}' of object`);
                    },
                    defineProperty: (_target, property) => {
                        throw new Error(`TypeError: Cannot define property '${String(property)}' for a readonly object`);
                    },
                    setPrototypeOf: (_target) => {
                        throw new Error(`TypeError: Cannot set prototype for a readonly object`);
                    },
                    isExtensible: () => false,
                    preventExtensions: () => true,
                })
                : target;
        };
        return readonlyProxy(result);
    }
    _validateConfigurationAccess(key, overrides, extensionId) {
        const scope = OVERRIDE_PROPERTY_REGEX.test(key)
            ? 5 /* ConfigurationScope.RESOURCE */
            : this._configurationScopes.get(key);
        const extensionIdText = extensionId ? `[${extensionId.value}] ` : '';
        if (5 /* ConfigurationScope.RESOURCE */ === scope) {
            if (typeof overrides?.resource === 'undefined') {
                this._logService.warn(`${extensionIdText}Accessing a resource scoped configuration without providing a resource is not expected. To get the effective value for '${key}', provide the URI of a resource or 'null' for any resource.`);
            }
            return;
        }
        if (4 /* ConfigurationScope.WINDOW */ === scope) {
            if (overrides?.resource) {
                this._logService.warn(`${extensionIdText}Accessing a window scoped configuration for a resource is not expected. To associate '${key}' to a resource, define its scope to 'resource' in configuration contributions in 'package.json'.`);
            }
            return;
        }
    }
    _toConfigurationChangeEvent(change, previous) {
        const event = new ConfigurationChangeEvent(change, previous, this._configuration, this._extHostWorkspace.workspace, this._logService);
        return Object.freeze({
            affectsConfiguration: (section, scope) => event.affectsConfiguration(section, scopeToOverrides(scope)),
        });
    }
    _toMap(scopes) {
        return scopes.reduce((result, scope) => {
            result.set(scope[0], scope[1]);
            return result;
        }, new Map());
    }
}
export const IExtHostConfiguration = createDecorator('IExtHostConfiguration');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUU5RCxPQUFPLEVBQW9CLGlCQUFpQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0UsT0FBTyxFQUlOLFdBQVcsR0FDWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxtQkFBbUIsSUFBSSwwQkFBMEIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBT3JGLE9BQU8sRUFDTixhQUFhLEVBQ2Isd0JBQXdCLEdBQ3hCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUt4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsU0FBUyxNQUFNLENBQUMsSUFBUyxFQUFFLEdBQVc7SUFDckMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNULE1BQU0sS0FBSyxHQUFH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