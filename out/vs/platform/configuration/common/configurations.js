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
import { coalesce } from '../../../base/common/arrays.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { deepClone, equals } from '../../../base/common/objects.js';
import { isEmptyObject, isString } from '../../../base/common/types.js';
import { ConfigurationModel } from './configurationModels.js';
import { Extensions, } from './configurationRegistry.js';
import { ILogService, NullLogService } from '../../log/common/log.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { Registry } from '../../registry/common/platform.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import * as json from '../../../base/common/json.js';
export class DefaultConfiguration extends Disposable {
    get configurationModel() {
        return this._configurationModel;
    }
    constructor(logService) {
        super();
        this.logService = logService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._configurationModel = ConfigurationModel.createEmptyModel(this.logService);
    }
    async initialize() {
        this.resetConfigurationModel();
        this._register(Registry.as(Extensions.Configuration).onDidUpdateConfiguration(({ properties, defaultsOverrides }) => this.onDidUpdateConfiguration(Array.from(properties), defaultsOverrides)));
        return this.configurationModel;
    }
    reload() {
        this.resetConfigurationModel();
        return this.configurationModel;
    }
    onDidUpdateConfiguration(properties, defaultsOverrides) {
        this.updateConfigurationModel(properties, Registry.as(Extensions.Configuration).getConfigurationProperties());
        this._onDidChangeConfiguration.fire({ defaults: this.configurationModel, properties });
    }
    getConfigurationDefaultOverrides() {
        return {};
    }
    resetConfigurationModel() {
        this._configurationModel = ConfigurationModel.createEmptyModel(this.logService);
        const properties = Registry.as(Extensions.Configuration).getConfigurationProperties();
        this.updateConfigurationModel(Object.keys(properties), properties);
    }
    updateConfigurationModel(properties, configurationProperties) {
        const configurationDefaultsOverrides = this.getConfigurationDefaultOverrides();
        for (const key of properties) {
            const defaultOverrideValue = configurationDefaultsOverrides[key];
            const propertySchema = configurationProperties[key];
            if (defaultOverrideValue !== undefined) {
                this._configurationModel.setValue(key, defaultOverrideValue);
            }
            else if (propertySchema) {
                this._configurationModel.setValue(key, deepClone(propertySchema.default));
            }
            else {
                this._configurationModel.removeValue(key);
            }
        }
    }
}
export class NullPolicyConfiguration {
    constructor() {
        this.onDidChangeConfiguration = Event.None;
        this.configurationModel = ConfigurationModel.createEmptyModel(new NullLogService());
    }
    async initialize() {
        return this.configurationModel;
    }
}
let PolicyConfiguration = class PolicyConfiguration extends Disposable {
    get configurationModel() {
        return this._configurationModel;
    }
    constructor(defaultConfiguration, policyService, logService) {
        super();
        this.defaultConfiguration = defaultConfiguration;
        this.policyService = policyService;
        this.logService = logService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._configurationModel = ConfigurationModel.createEmptyModel(this.logService);
        this.configurationRegistry = Registry.as(Extensions.Configuration);
    }
    async initialize() {
        this.logService.trace('PolicyConfiguration#initialize');
        this.update(await this.updatePolicyDefinitions(this.defaultConfiguration.configurationModel.keys), false);
        this.update(await this.updatePolicyDefinitions(Object.keys(this.configurationRegistry.getExcludedConfigurationProperties())), false);
        this._register(this.policyService.onDidChange((policyNames) => this.onDidChangePolicies(policyNames)));
        this._register(this.defaultConfiguration.onDidChangeConfiguration(async ({ properties }) => this.update(await this.updatePolicyDefinitions(properties), true)));
        return this._configurationModel;
    }
    async updatePolicyDefinitions(properties) {
        this.logService.trace('PolicyConfiguration#updatePolicyDefinitions', properties);
        const policyDefinitions = {};
        const keys = [];
        const configurationProperties = this.configurationRegistry.getConfigurationProperties();
        const excludedConfigurationProperties = this.configurationRegistry.getExcludedConfigurationProperties();
        for (const key of properties) {
            const config = configurationProperties[key] ?? excludedConfigurationProperties[key];
            if (!config) {
                // Config is removed. So add it to the list if in case it was registered as policy before
                keys.push(key);
                continue;
            }
            if (config.policy) {
                if (config.type !== 'string' &&
                    config.type !== 'number' &&
                    config.type !== 'array' &&
                    config.type !== 'object' &&
                    config.type !== 'boolean') {
                    this.logService.warn(`Policy ${config.policy.name} has unsupported type ${config.type}`);
                    continue;
                }
                const { defaultValue, previewFeature } = config.policy;
                keys.push(key);
                policyDefinitions[config.policy.name] = {
                    type: config.type === 'number' ? 'number' : config.type === 'boolean' ? 'boolean' : 'string',
                    previewFeature,
                    defaultValue,
                };
            }
        }
        if (!isEmptyObject(policyDefinitions)) {
            await this.policyService.updatePolicyDefinitions(policyDefinitions);
        }
        return keys;
    }
    onDidChangePolicies(policyNames) {
        this.logService.trace('PolicyConfiguration#onDidChangePolicies', policyNames);
        const policyConfigurations = this.configurationRegistry.getPolicyConfigurations();
        const keys = coalesce(policyNames.map((policyName) => policyConfigurations.get(policyName)));
        this.update(keys, true);
    }
    update(keys, trigger) {
        this.logService.trace('PolicyConfiguration#update', keys);
        const configurationProperties = this.configurationRegistry.getConfigurationProperties();
        const excludedConfigurationProperties = this.configurationRegistry.getExcludedConfigurationProperties();
        const changed = [];
        const wasEmpty = this._configurationModel.isEmpty();
        for (const key of keys) {
            const proprety = configurationProperties[key] ?? excludedConfigurationProperties[key];
            const policyName = proprety?.policy?.name;
            if (policyName) {
                let policyValue = this.policyService.getPolicyValue(policyName);
                if (isString(policyValue) && proprety.type !== 'string') {
                    try {
                        policyValue = this.parse(policyValue);
                    }
                    catch (e) {
                        this.logService.error(`Error parsing policy value ${policyName}:`, getErrorMessage(e));
                        continue;
                    }
                }
                if (wasEmpty
                    ? policyValue !== undefined
                    : !equals(this._configurationModel.getValue(key), policyValue)) {
                    changed.push([key, policyValue]);
                }
            }
            else {
                if (this._configurationModel.getValue(key) !== undefined) {
                    changed.push([key, undefined]);
                }
            }
        }
        if (changed.length) {
            this.logService.trace('PolicyConfiguration#changed', changed);
            const old = this._configurationModel;
            this._configurationModel = ConfigurationModel.createEmptyModel(this.logService);
            for (const key of old.keys) {
                this._configurationModel.setValue(key, old.getValue(key));
            }
            for (const [key, policyValue] of changed) {
                if (policyValue === undefined) {
                    this._configurationModel.removeValue(key);
                }
                else {
                    this._configurationModel.setValue(key, policyValue);
                }
            }
            if (trigger) {
                this._onDidChangeConfiguration.fire(this._configurationModel);
            }
        }
    }
    parse(content) {
        let raw = {};
        let currentProperty = null;
        let currentParent = [];
        const previousParents = [];
        const parseErrors = [];
        function onValue(value) {
            if (Array.isArray(currentParent)) {
                ;
                currentParent.push(value);
            }
            else if (currentProperty !== null) {
                if (currentParent[currentProperty] !== undefined) {
                    throw new Error(`Duplicate property found: ${currentProperty}`);
                }
                currentParent[currentProperty] = value;
            }
        }
        const visitor = {
            onObjectBegin: () => {
                const object = {};
                onValue(object);
                previousParents.push(currentParent);
                currentParent = object;
                currentProperty = null;
            },
            onObjectProperty: (name) => {
                currentProperty = name;
            },
            onObjectEnd: () => {
                currentParent = previousParents.pop();
            },
            onArrayBegin: () => {
                const array = [];
                onValue(array);
                previousParents.push(currentParent);
                currentParent = array;
                currentProperty = null;
            },
            onArrayEnd: () => {
                currentParent = previousParents.pop();
            },
            onLiteralValue: onValue,
            onError: (error, offset, length) => {
                parseErrors.push({ error, offset, length });
            },
        };
        if (content) {
            json.visit(content, visitor);
            raw = currentParent[0] || {};
        }
        if (parseErrors.length > 0) {
            throw new Error(parseErrors.map((e) => getErrorMessage(e.error)).join('\n'));
        }
        return raw;
    }
};
PolicyConfiguration = __decorate([
    __param(1, IPolicyService),
    __param(2, ILogService)
], PolicyConfiguration);
export { PolicyConfiguration };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb25maWd1cmF0aW9uL2NvbW1vbi9jb25maWd1cmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzdELE9BQU8sRUFDTixVQUFVLEdBR1YsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQW9CLE1BQU0sK0JBQStCLENBQUE7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFBO0FBR3BELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxVQUFVO0lBT25ELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO0lBQ2hDLENBQUM7SUFFRCxZQUE2QixVQUF1QjtRQUNuRCxLQUFLLEVBQUUsQ0FBQTtR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