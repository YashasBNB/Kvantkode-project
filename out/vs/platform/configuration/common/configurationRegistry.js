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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi9jb21tb24vY29uZmlndXJhdGlvblJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxLQUFLLEtBQUssTUFBTSwrQkFBK0IsQ0FBQTtBQUN0RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xFLE9BQU8sRUFDTixVQUFVLElBQUksY0FBYyxHQUU1QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc1RCxNQUFNLENBQU4sSUFBWSxxQkFHWDtBQUhELFdBQVkscUJBQXFCO0lBQ2hDLG9EQUEyQixDQUFBO0lBQzNCLHNEQUE2QixDQUFBO0FBQzlCLENBQUMsRUFIVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBR2hDO0FBRUQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHO0lBQ3pCLGFBQWEsRUFBRSxrQ0FBa0M7Q0FDakQsQ0FBQTtBQTRHRCxNQUFNLENBQU4sSUFBa0Isa0JBNkJqQjtBQTdCRCxXQUFrQixrQkFBa0I7SUFDbkM7O09BRUc7SUFDSCx5RUFBZSxDQUFBO0lBQ2Y7O09BRUc7SUFDSCxpRUFBTyxDQUFBO0lBQ1A7O09BRUc7SUFDSCx5RkFBbUIsQ0FBQTtJQUNuQjs7T0FFRztJQUNILCtEQUFNLENBQUE7SUFDTjs7T0FFRztJQUNILG1FQUFRLENBQUE7SUFDUjs7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