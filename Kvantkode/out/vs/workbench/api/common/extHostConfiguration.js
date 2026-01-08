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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbEUsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTlELE9BQU8sRUFBb0IsaUJBQWlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRSxPQUFPLEVBSU4sV0FBVyxHQUNYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLG1CQUFtQixJQUFJLDBCQUEwQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFPckYsT0FBTyxFQUNOLGFBQWEsRUFDYix3QkFBd0IsR0FDeEIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBS3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxTQUFTLE1BQU0sQ0FBQyxJQUFTLEVBQUUsR0FBVztJQUNyQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ1QsTUFBTSxLQUFL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