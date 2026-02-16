/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../base/common/arrays.js';
import { Emitter } from '../../../base/common/event.js';
import * as types from '../../../base/common/types.js';
import * as nls from '../../../nls.js';
import { getLanguageTagSettingPlainKey } from './configuration.js';
import { Extensions as JSONExtensions, } from '../../jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../registry/common/platform.js';
export var EditPresentationTypes;
(function (EditPresentationTypes) {
    EditPresentationTypes["Multiline"] = "multilineText";
    EditPresentationTypes["Singleline"] = "singlelineText";
})(EditPresentationTypes || (EditPresentationTypes = {}));
export const Extensions = {
    Configuration: 'base.contributions.configuration',
};
export var ConfigurationScope;
(function (ConfigurationScope) {
    /**
     * Application specific configuration, which can be configured only in default profile user settings.
     */
    ConfigurationScope[ConfigurationScope["APPLICATION"] = 1] = "APPLICATION";
    /**
     * Machine specific configuration, which can be configured only in local and remote user settings.
     */
    ConfigurationScope[ConfigurationScope["MACHINE"] = 2] = "MACHINE";
    /**
     * An application machine specific configuration, which can be configured only in default profile user settings and remote user settings.
     */
    ConfigurationScope[ConfigurationScope["APPLICATION_MACHINE"] = 3] = "APPLICATION_MACHINE";
    /**
     * Window specific configuration, which can be configured in the user or workspace settings.
     */
    ConfigurationScope[ConfigurationScope["WINDOW"] = 4] = "WINDOW";
    /**
     * Resource specific configuration, which can be configured in the user, workspace or folder settings.
     */
    ConfigurationScope[ConfigurationScope["RESOURCE"] = 5] = "RESOURCE";
    /**
     * Resource specific configuration that can be configured in language specific settings
     */
    ConfigurationScope[ConfigurationScope["LANGUAGE_OVERRIDABLE"] = 6] = "LANGUAGE_OVERRIDABLE";
    /**
     * Machine specific configuration that can also be configured in workspace or folder settings.
     */
    ConfigurationScope[ConfigurationScope["MACHINE_OVERRIDABLE"] = 7] = "MACHINE_OVERRIDABLE";
})(ConfigurationScope || (ConfigurationScope = {}));
export const allSettings = { properties: {}, patternProperties: {} };
export const applicationSettings = { properties: {}, patternProperties: {} };
export const applicationMachineSettings = { properties: {}, patternProperties: {} };
export const machineSettings = { properties: {}, patternProperties: {} };
export const machineOverridableSettings = { properties: {}, patternProperties: {} };
export const windowSettings = { properties: {}, patternProperties: {} };
export const resourceSettings = { properties: {}, patternProperties: {} };
export const resourceLanguageSettingsSchemaId = 'vscode://schemas/settings/resourceLanguage';
export const configurationDefaultsSchemaId = 'vscode://schemas/settings/configurationDefaults';
const contributionRegistry = Registry.as(JSONExtensions.JSONContribution);
class ConfigurationRegistry {
    constructor() {
        this.registeredConfigurationDefaults = [];
        this.overrideIdentifiers = new Set();
        this._onDidSchemaChange = new Emitter();
        this.onDidSchemaChange = this._onDidSchemaChange.event;
        this._onDidUpdateConfiguration = new Emitter();
        this.onDidUpdateConfiguration = this._onDidUpdateConfiguration.event;
        this.configurationDefaultsOverrides = new Map();
        this.defaultLanguageConfigurationOverridesNode = {
            id: 'defaultOverrides',
            title: nls.localize('defaultLanguageConfigurationOverrides.title', 'Default Language Configuration Overrides'),
            properties: {},
        };
        this.configurationContributors = [this.defaultLanguageConfigurationOverridesNode];
        this.resourceLanguageSettingsSchema = {
            properties: {},
            patternProperties: {},
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true,
        };
        this.configurationProperties = {};
        this.policyConfigurations = new Map();
        this.excludedConfigurationProperties = {};
        contributionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
        this.registerOverridePropertyPatternKey();
    }
    registerConfiguration(configuration, validate = true) {
        this.registerConfigurations([configuration], validate);
        return configuration;
    }
    registerConfigurations(configurations, validate = true) {
        const properties = new Set();
        this.doRegisterConfigurations(configurations, validate, properties);
        contributionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties });
    }
    deregisterConfigurations(configurations) {
        const properties = new Set();
        this.doDeregisterConfigurations(configurations, properties);
        contributionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties });
    }
    updateConfigurations({ add, remove, }) {
        const properties = new Set();
        this.doDeregisterConfigurations(remove, properties);
        this.doRegisterConfigurations(add, false, properties);
        contributionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties });
    }
    registerDefaultConfigurations(configurationDefaults) {
        const properties = new Set();
        this.doRegisterDefaultConfigurations(configurationDefaults, properties);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties, defaultsOverrides: true });
    }
    doRegisterDefaultConfigurations(configurationDefaults, bucket) {
        this.registeredConfigurationDefaults.push(...configurationDefaults);
        const overrideIdentifiers = [];
        for (const { overrides, source } of configurationDefaults) {
            for (const key in overrides) {
                bucket.add(key);
                const configurationDefaultOverridesForKey = this.configurationDefaultsOverrides.get(key) ??
                    this.configurationDefaultsOverrides
                        .set(key, { configurationDefaultOverrides: [] })
                        .get(key);
                const value = overrides[key];
                configurationDefaultOverridesForKey.configurationDefaultOverrides.push({ value, source });
                // Configuration defaults for Override Identifiers
                if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                    const newDefaultOverride = this.mergeDefaultConfigurationsForOverrideIdentifier(key, value, source, configurationDefaultOverridesForKey.configurationDefaultOverrideValue);
                    if (!newDefaultOverride) {
                        continue;
                    }
                    configurationDefaultOverridesForKey.configurationDefaultOverrideValue = newDefaultOverride;
                    this.updateDefaultOverrideProperty(key, newDefaultOverride, source);
                    overrideIdentifiers.push(...overrideIdentifiersFromKey(key));
                }
                // Configuration defaults for Configuration Properties
                else {
                    const newDefaultOverride = this.mergeDefaultConfigurationsForConfigurationProperty(key, value, source, configurationDefaultOverridesForKey.configurationDefaultOverrideValue);
                    if (!newDefaultOverride) {
                        continue;
                    }
                    configurationDefaultOverridesForKey.configurationDefaultOverrideValue = newDefaultOverride;
                    const property = this.configurationProperties[key];
                    if (property) {
                        this.updatePropertyDefaultValue(key, property);
                        this.updateSchema(key, property);
                    }
                }
            }
        }
        this.doRegisterOverrideIdentifiers(overrideIdentifiers);
    }
    deregisterDefaultConfigurations(defaultConfigurations) {
        const properties = new Set();
        this.doDeregisterDefaultConfigurations(defaultConfigurations, properties);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties, defaultsOverrides: true });
    }
    doDeregisterDefaultConfigurations(defaultConfigurations, bucket) {
        for (const defaultConfiguration of defaultConfigurations) {
            const index = this.registeredConfigurationDefaults.indexOf(defaultConfiguration);
            if (index !== -1) {
                this.registeredConfigurationDefaults.splice(index, 1);
            }
        }
        for (const { overrides, source } of defaultConfigurations) {
            for (const key in overrides) {
                const configurationDefaultOverridesForKey = this.configurationDefaultsOverrides.get(key);
                if (!configurationDefaultOverridesForKey) {
                    continue;
                }
                const index = configurationDefaultOverridesForKey.configurationDefaultOverrides.findIndex((configurationDefaultOverride) => source
                    ? configurationDefaultOverride.source?.id === source.id
                    : configurationDefaultOverride.value === overrides[key]);
                if (index === -1) {
                    continue;
                }
                configurationDefaultOverridesForKey.configurationDefaultOverrides.splice(index, 1);
                if (configurationDefaultOverridesForKey.configurationDefaultOverrides.length === 0) {
                    this.configurationDefaultsOverrides.delete(key);
                }
                if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                    let configurationDefaultOverrideValue;
                    for (const configurationDefaultOverride of configurationDefaultOverridesForKey.configurationDefaultOverrides) {
                        configurationDefaultOverrideValue =
                            this.mergeDefaultConfigurationsForOverrideIdentifier(key, configurationDefaultOverride.value, configurationDefaultOverride.source, configurationDefaultOverrideValue);
                    }
                    if (configurationDefaultOverrideValue &&
                        !types.isEmptyObject(configurationDefaultOverrideValue.value)) {
                        configurationDefaultOverridesForKey.configurationDefaultOverrideValue =
                            configurationDefaultOverrideValue;
                        this.updateDefaultOverrideProperty(key, configurationDefaultOverrideValue, source);
                    }
                    else {
                        this.configurationDefaultsOverrides.delete(key);
                        delete this.configurationProperties[key];
                        delete this.defaultLanguageConfigurationOverridesNode.properties[key];
                    }
                }
                else {
                    let configurationDefaultOverrideValue;
                    for (const configurationDefaultOverride of configurationDefaultOverridesForKey.configurationDefaultOverrides) {
                        configurationDefaultOverrideValue =
                            this.mergeDefaultConfigurationsForConfigurationProperty(key, configurationDefaultOverride.value, configurationDefaultOverride.source, configurationDefaultOverrideValue);
                    }
                    configurationDefaultOverridesForKey.configurationDefaultOverrideValue =
                        configurationDefaultOverrideValue;
                    const property = this.configurationProperties[key];
                    if (property) {
                        this.updatePropertyDefaultValue(key, property);
                        this.updateSchema(key, property);
                    }
                }
                bucket.add(key);
            }
        }
        this.updateOverridePropertyPatternKey();
    }
    updateDefaultOverrideProperty(key, newDefaultOverride, source) {
        const property = {
            type: 'object',
            default: newDefaultOverride.value,
            description: nls.localize('defaultLanguageConfiguration.description', 'Configure settings to be overridden for the {0} language.', getLanguageTagSettingPlainKey(key)),
            $ref: resourceLanguageSettingsSchemaId,
            defaultDefaultValue: newDefaultOverride.value,
            source,
            defaultValueSource: source,
        };
        this.configurationProperties[key] = property;
        this.defaultLanguageConfigurationOverridesNode.properties[key] = property;
    }
    mergeDefaultConfigurationsForOverrideIdentifier(overrideIdentifier, configurationValueObject, valueSource, existingDefaultOverride) {
        const defaultValue = existingDefaultOverride?.value || {};
        const source = existingDefaultOverride?.source ?? new Map();
        // This should not happen
        if (!(source instanceof Map)) {
            console.error('objectConfigurationSources is not a Map');
            return undefined;
        }
        for (const propertyKey of Object.keys(configurationValueObject)) {
            const propertyDefaultValue = configurationValueObject[propertyKey];
            const isObjectSetting = types.isObject(propertyDefaultValue) &&
                (types.isUndefined(defaultValue[propertyKey]) || types.isObject(defaultValue[propertyKey]));
            // If the default value is an object, merge the objects and store the source of each keys
            if (isObjectSetting) {
                defaultValue[propertyKey] = {
                    ...(defaultValue[propertyKey] ?? {}),
                    ...propertyDefaultValue,
                };
                // Track the source of each value in the object
                if (valueSource) {
                    for (const objectKey in propertyDefaultValue) {
                        source.set(`${propertyKey}.${objectKey}`, valueSource);
                    }
                }
            }
            // Primitive values are overridden
            else {
                defaultValue[propertyKey] = propertyDefaultValue;
                if (valueSource) {
                    source.set(propertyKey, valueSource);
                }
                else {
                    source.delete(propertyKey);
                }
            }
        }
        return { value: defaultValue, source };
    }
    mergeDefaultConfigurationsForConfigurationProperty(propertyKey, value, valuesSource, existingDefaultOverride) {
        const property = this.configurationProperties[propertyKey];
        const existingDefaultValue = existingDefaultOverride?.value ?? property?.defaultDefaultValue;
        let source = valuesSource;
        const isObjectSetting = types.isObject(value) &&
            ((property !== undefined && property.type === 'object') ||
                (property === undefined &&
                    (types.isUndefined(existingDefaultValue) || types.isObject(existingDefaultValue))));
        // If the default value is an object, merge the objects and store the source of each keys
        if (isObjectSetting) {
            source = existingDefaultOverride?.source ?? new Map();
            // This should not happen
            if (!(source instanceof Map)) {
                console.error('defaultValueSource is not a Map');
                return undefined;
            }
            for (const objectKey in value) {
                if (valuesSource) {
                    source.set(`${propertyKey}.${objectKey}`, valuesSource);
                }
            }
            value = { ...(types.isObject(existingDefaultValue) ? existingDefaultValue : {}), ...value };
        }
        return { value, source };
    }
    deltaConfiguration(delta) {
        // defaults: remove
        let defaultsOverrides = false;
        const properties = new Set();
        if (delta.removedDefaults) {
            this.doDeregisterDefaultConfigurations(delta.removedDefaults, properties);
            defaultsOverrides = true;
        }
        // defaults: add
        if (delta.addedDefaults) {
            this.doRegisterDefaultConfigurations(delta.addedDefaults, properties);
            defaultsOverrides = true;
        }
        // configurations: remove
        if (delta.removedConfigurations) {
            this.doDeregisterConfigurations(delta.removedConfigurations, properties);
        }
        // configurations: add
        if (delta.addedConfigurations) {
            this.doRegisterConfigurations(delta.addedConfigurations, false, properties);
        }
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties, defaultsOverrides });
    }
    notifyConfigurationSchemaUpdated(...configurations) {
        this._onDidSchemaChange.fire();
    }
    registerOverrideIdentifiers(overrideIdentifiers) {
        this.doRegisterOverrideIdentifiers(overrideIdentifiers);
        this._onDidSchemaChange.fire();
    }
    doRegisterOverrideIdentifiers(overrideIdentifiers) {
        for (const overrideIdentifier of overrideIdentifiers) {
            this.overrideIdentifiers.add(overrideIdentifier);
        }
        this.updateOverridePropertyPatternKey();
    }
    doRegisterConfigurations(configurations, validate, bucket) {
        configurations.forEach((configuration) => {
            this.validateAndRegisterProperties(configuration, validate, configuration.extensionInfo, configuration.restrictedProperties, undefined, bucket);
            this.configurationContributors.push(configuration);
            this.registerJSONConfiguration(configuration);
        });
    }
    doDeregisterConfigurations(configurations, bucket) {
        const deregisterConfiguration = (configuration) => {
            if (configuration.properties) {
                for (const key in configuration.properties) {
                    bucket.add(key);
                    const property = this.configurationProperties[key];
                    if (property?.policy?.name) {
                        this.policyConfigurations.delete(property.policy.name);
                    }
                    delete this.configurationProperties[key];
                    this.removeFromSchema(key, configuration.properties[key]);
                }
            }
            configuration.allOf?.forEach((node) => deregisterConfiguration(node));
        };
        for (const configuration of configurations) {
            deregisterConfiguration(configuration);
            const index = this.configurationContributors.indexOf(configuration);
            if (index !== -1) {
                this.configurationContributors.splice(index, 1);
            }
        }
    }
    validateAndRegisterProperties(configuration, validate = true, extensionInfo, restrictedProperties, scope = 4 /* ConfigurationScope.WINDOW */, bucket) {
        scope = types.isUndefinedOrNull(configuration.scope) ? scope : configuration.scope;
        const properties = configuration.properties;
        if (properties) {
            for (const key in properties) {
                const property = properties[key];
                if (validate && validateProperty(key, property)) {
                    delete properties[key];
                    continue;
                }
                property.source = extensionInfo;
                // update default value
                property.defaultDefaultValue = properties[key].default;
                this.updatePropertyDefaultValue(key, property);
                // update scope
                if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                    property.scope = undefined; // No scope for overridable properties `[${identifier}]`
                }
                else {
                    property.scope = types.isUndefinedOrNull(property.scope) ? scope : property.scope;
                    property.restricted = types.isUndefinedOrNull(property.restricted)
                        ? !!restrictedProperties?.includes(key)
                        : property.restricted;
                }
                const excluded = properties[key].hasOwnProperty('included') && !properties[key].included;
                const policyName = properties[key].policy?.name;
                if (excluded) {
                    this.excludedConfigurationProperties[key] = properties[key];
                    if (policyName) {
                        this.policyConfigurations.set(policyName, key);
                        bucket.add(key);
                    }
                    delete properties[key];
                }
                else {
                    bucket.add(key);
                    if (policyName) {
                        this.policyConfigurations.set(policyName, key);
                    }
                    this.configurationProperties[key] = properties[key];
                    if (!properties[key].deprecationMessage && properties[key].markdownDeprecationMessage) {
                        // If not set, default deprecationMessage to the markdown source
                        properties[key].deprecationMessage = properties[key].markdownDeprecationMessage;
                    }
                }
            }
        }
        const subNodes = configuration.allOf;
        if (subNodes) {
            for (const node of subNodes) {
                this.validateAndRegisterProperties(node, validate, extensionInfo, restrictedProperties, scope, bucket);
            }
        }
    }
    // TODO: @sandy081 - Remove this method and include required info in getConfigurationProperties
    getConfigurations() {
        return this.configurationContributors;
    }
    getConfigurationProperties() {
        return this.configurationProperties;
    }
    getPolicyConfigurations() {
        return this.policyConfigurations;
    }
    getExcludedConfigurationProperties() {
        return this.excludedConfigurationProperties;
    }
    getRegisteredDefaultConfigurations() {
        return [...this.registeredConfigurationDefaults];
    }
    getConfigurationDefaultsOverrides() {
        const configurationDefaultsOverrides = new Map();
        for (const [key, value] of this.configurationDefaultsOverrides) {
            if (value.configurationDefaultOverrideValue) {
                configurationDefaultsOverrides.set(key, value.configurationDefaultOverrideValue);
            }
        }
        return configurationDefaultsOverrides;
    }
    registerJSONConfiguration(configuration) {
        const register = (configuration) => {
            const properties = configuration.properties;
            if (properties) {
                for (const key in properties) {
                    this.updateSchema(key, properties[key]);
                }
            }
            const subNodes = configuration.allOf;
            subNodes?.forEach(register);
        };
        register(configuration);
    }
    updateSchema(key, property) {
        allSettings.properties[key] = property;
        switch (property.scope) {
            case 1 /* ConfigurationScope.APPLICATION */:
                applicationSettings.properties[key] = property;
                break;
            case 2 /* ConfigurationScope.MACHINE */:
                machineSettings.properties[key] = property;
                break;
            case 3 /* ConfigurationScope.APPLICATION_MACHINE */:
                applicationMachineSettings.properties[key] = property;
                break;
            case 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */:
                machineOverridableSettings.properties[key] = property;
                break;
            case 4 /* ConfigurationScope.WINDOW */:
                windowSettings.properties[key] = property;
                break;
            case 5 /* ConfigurationScope.RESOURCE */:
                resourceSettings.properties[key] = property;
                break;
            case 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */:
                resourceSettings.properties[key] = property;
                this.resourceLanguageSettingsSchema.properties[key] = property;
                break;
        }
    }
    removeFromSchema(key, property) {
        delete allSettings.properties[key];
        switch (property.scope) {
            case 1 /* ConfigurationScope.APPLICATION */:
                delete applicationSettings.properties[key];
                break;
            case 2 /* ConfigurationScope.MACHINE */:
                delete machineSettings.properties[key];
                break;
            case 3 /* ConfigurationScope.APPLICATION_MACHINE */:
                delete applicationMachineSettings.properties[key];
                break;
            case 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */:
                delete machineOverridableSettings.properties[key];
                break;
            case 4 /* ConfigurationScope.WINDOW */:
                delete windowSettings.properties[key];
                break;
            case 5 /* ConfigurationScope.RESOURCE */:
            case 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */:
                delete resourceSettings.properties[key];
                delete this.resourceLanguageSettingsSchema.properties[key];
                break;
        }
    }
    updateOverridePropertyPatternKey() {
        for (const overrideIdentifier of this.overrideIdentifiers.values()) {
            const overrideIdentifierProperty = `[${overrideIdentifier}]`;
            const resourceLanguagePropertiesSchema = {
                type: 'object',
                description: nls.localize('overrideSettings.defaultDescription', 'Configure editor settings to be overridden for a language.'),
                errorMessage: nls.localize('overrideSettings.errorMessage', 'This setting does not support per-language configuration.'),
                $ref: resourceLanguageSettingsSchemaId,
            };
            this.updatePropertyDefaultValue(overrideIdentifierProperty, resourceLanguagePropertiesSchema);
            allSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            applicationSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            applicationMachineSettings.properties[overrideIdentifierProperty] =
                resourceLanguagePropertiesSchema;
            machineSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            machineOverridableSettings.properties[overrideIdentifierProperty] =
                resourceLanguagePropertiesSchema;
            windowSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            resourceSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
        }
    }
    registerOverridePropertyPatternKey() {
        const resourceLanguagePropertiesSchema = {
            type: 'object',
            description: nls.localize('overrideSettings.defaultDescription', 'Configure editor settings to be overridden for a language.'),
            errorMessage: nls.localize('overrideSettings.errorMessage', 'This setting does not support per-language configuration.'),
            $ref: resourceLanguageSettingsSchemaId,
        };
        allSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        applicationSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] =
            resourceLanguagePropertiesSchema;
        applicationMachineSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] =
            resourceLanguagePropertiesSchema;
        machineSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        machineOverridableSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] =
            resourceLanguagePropertiesSchema;
        windowSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        resourceSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        this._onDidSchemaChange.fire();
    }
    updatePropertyDefaultValue(key, property) {
        const configurationdefaultOverride = this.configurationDefaultsOverrides.get(key)?.configurationDefaultOverrideValue;
        let defaultValue = undefined;
        let defaultSource = undefined;
        if (configurationdefaultOverride &&
            (!property.disallowConfigurationDefault || !configurationdefaultOverride.source) // Prevent overriding the default value if the property is disallowed to be overridden by configuration defaults from extensions
        ) {
            defaultValue = configurationdefaultOverride.value;
            defaultSource = configurationdefaultOverride.source;
        }
        if (types.isUndefined(defaultValue)) {
            defaultValue = property.defaultDefaultValue;
            defaultSource = undefined;
        }
        if (types.isUndefined(defaultValue)) {
            defaultValue = getDefaultValue(property.type);
        }
        property.default = defaultValue;
        property.defaultValueSource = defaultSource;
    }
}
const OVERRIDE_IDENTIFIER_PATTERN = `\\[([^\\]]+)\\]`;
const OVERRIDE_IDENTIFIER_REGEX = new RegExp(OVERRIDE_IDENTIFIER_PATTERN, 'g');
export const OVERRIDE_PROPERTY_PATTERN = `^(${OVERRIDE_IDENTIFIER_PATTERN})+$`;
export const OVERRIDE_PROPERTY_REGEX = new RegExp(OVERRIDE_PROPERTY_PATTERN);
export function overrideIdentifiersFromKey(key) {
    const identifiers = [];
    if (OVERRIDE_PROPERTY_REGEX.test(key)) {
        let matches = OVERRIDE_IDENTIFIER_REGEX.exec(key);
        while (matches?.length) {
            const identifier = matches[1].trim();
            if (identifier) {
                identifiers.push(identifier);
            }
            matches = OVERRIDE_IDENTIFIER_REGEX.exec(key);
        }
    }
    return distinct(identifiers);
}
export function keyFromOverrideIdentifiers(overrideIdentifiers) {
    return overrideIdentifiers.reduce((result, overrideIdentifier) => `${result}[${overrideIdentifier}]`, '');
}
export function getDefaultValue(type) {
    const t = Array.isArray(type) ? type[0] : type;
    switch (t) {
        case 'boolean':
            return false;
        case 'integer':
        case 'number':
            return 0;
        case 'string':
            return '';
        case 'array':
            return [];
        case 'object':
            return {};
        default:
            return null;
    }
}
const configurationRegistry = new ConfigurationRegistry();
Registry.add(Extensions.Configuration, configurationRegistry);
export function validateProperty(property, schema) {
    if (!property.trim()) {
        return nls.localize('config.property.empty', 'Cannot register an empty property');
    }
    if (OVERRIDE_PROPERTY_REGEX.test(property)) {
        return nls.localize('config.property.languageDefault', "Cannot register '{0}'. This matches property pattern '\\\\[.*\\\\]$' for describing language specific editor settings. Use 'configurationDefaults' contribution.", property);
    }
    if (configurationRegistry.getConfigurationProperties()[property] !== undefined) {
        return nls.localize('config.property.duplicate', "Cannot register '{0}'. This property is already registered.", property);
    }
    if (schema.policy?.name &&
        configurationRegistry.getPolicyConfigurations().get(schema.policy?.name) !== undefined) {
        return nls.localize('config.policy.duplicate', "Cannot register '{0}'. The associated policy {1} is already registered with {2}.", property, schema.policy?.name, configurationRegistry.getPolicyConfigurations().get(schema.policy?.name));
    }
    return null;
}
export function getScopes() {
    const scopes = [];
    const configurationProperties = configurationRegistry.getConfigurationProperties();
    for (const key of Object.keys(configurationProperties)) {
        scopes.push([key, configurationProperties[key].scope]);
    }
    scopes.push(['launch', 5 /* ConfigurationScope.RESOURCE */]);
    scopes.push(['task', 5 /* ConfigurationScope.RESOURCE */]);
    return scopes;
}
export function getAllConfigurationProperties(configurationNode) {
    const result = {};
    for (const configuration of configurationNode) {
        const properties = configuration.properties;
        if (types.isObject(properties)) {
            for (const key in properties) {
                result[key] = properties[key];
            }
        }
        if (configuration.allOf) {
            Object.assign(result, getAllConfigurationProperties(configuration.allOf));
        }
    }
    return result;
}
export function parseScope(scope) {
    switch (scope) {
        case 'application':
            return 1 /* ConfigurationScope.APPLICATION */;
        case 'machine':
            return 2 /* ConfigurationScope.MACHINE */;
        case 'resource':
            return 5 /* ConfigurationScope.RESOURCE */;
        case 'machine-overridable':
            return 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */;
        case 'language-overridable':
            return 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */;
        default:
            return 4 /* ConfigurationScope.WINDOW */;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb25maWd1cmF0aW9uL2NvbW1vbi9jb25maWd1cmF0aW9uUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUU5RCxPQUFPLEtBQUssS0FBSyxNQUFNLCtCQUErQixDQUFBO0FBQ3RELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbEUsT0FBTyxFQUNOLFVBQVUsSUFBSSxjQUFjLEdBRTVCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzVELE1BQU0sQ0FBTixJQUFZLHFCQUdYO0FBSEQsV0FBWSxxQkFBcUI7SUFDaEMsb0RBQTJCLENBQUE7SUFDM0Isc0RBQTZCLENBQUE7QUFDOUIsQ0FBQyxFQUhXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFHaEM7QUFFRCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUc7SUFDekIsYUFBYSxFQUFFLGtDQUFrQztDQUNqRCxDQUFBO0FBNEdELE1BQU0sQ0FBTixJQUFrQixrQkE2QmpCO0FBN0JELFdBQWtCLGtCQUFrQjtJQUNuQzs7T0FFRztJQUNILHlFQUFlLENBQUE7SUFDZjs7T0FFRztJQUNILGlFQUFPLENBQUE7SUFDUDs7T0FFRztJQUNILHlGQUFtQixDQUFBO0lBQ25COztPQUVHO0lBQ0gsK0RBQU0sQ0FBQTtJQUNOOztPQUVH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