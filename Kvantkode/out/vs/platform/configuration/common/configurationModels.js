/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Emitter, Event } from '../../../base/common/event.js';
import * as json from '../../../base/common/json.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { getOrSet, ResourceMap } from '../../../base/common/map.js';
import * as objects from '../../../base/common/objects.js';
import * as types from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { addToValueTree, getConfigurationValue, removeFromValueTree, toValuesTree, } from './configuration.js';
import { Extensions, overrideIdentifiersFromKey, OVERRIDE_PROPERTY_REGEX, } from './configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
function freeze(data) {
    return Object.isFrozen(data) ? data : objects.deepFreeze(data);
}
export class ConfigurationModel {
    static createEmptyModel(logService) {
        return new ConfigurationModel({}, [], [], undefined, logService);
    }
    constructor(_contents, _keys, _overrides, raw, logService) {
        this._contents = _contents;
        this._keys = _keys;
        this._overrides = _overrides;
        this.raw = raw;
        this.logService = logService;
        this.overrideConfigurations = new Map();
    }
    get rawConfiguration() {
        if (!this._rawConfiguration) {
            if (this.raw) {
                const rawConfigurationModels = (Array.isArray(this.raw) ? this.raw : [this.raw]).map((raw) => {
                    if (raw instanceof ConfigurationModel) {
                        return raw;
                    }
                    const parser = new ConfigurationModelParser('', this.logService);
                    parser.parseRaw(raw);
                    return parser.configurationModel;
                });
                this._rawConfiguration = rawConfigurationModels.reduce((previous, current) => (current === previous ? current : previous.merge(current)), rawConfigurationModels[0]);
            }
            else {
                // raw is same as current
                this._rawConfiguration = this;
            }
        }
        return this._rawConfiguration;
    }
    get contents() {
        return this._contents;
    }
    get overrides() {
        return this._overrides;
    }
    get keys() {
        return this._keys;
    }
    isEmpty() {
        return (this._keys.length === 0 &&
            Object.keys(this._contents).length === 0 &&
            this._overrides.length === 0);
    }
    getValue(section) {
        return section ? getConfigurationValue(this.contents, section) : this.contents;
    }
    inspect(section, overrideIdentifier) {
        const that = this;
        return {
            get value() {
                return freeze(that.rawConfiguration.getValue(section));
            },
            get override() {
                return overrideIdentifier
                    ? freeze(that.rawConfiguration.getOverrideValue(section, overrideIdentifier))
                    : undefined;
            },
            get merged() {
                return freeze(overrideIdentifier
                    ? that.rawConfiguration.override(overrideIdentifier).getValue(section)
                    : that.rawConfiguration.getValue(section));
            },
            get overrides() {
                const overrides = [];
                for (const { contents, identifiers, keys } of that.rawConfiguration.overrides) {
                    const value = new ConfigurationModel(contents, keys, [], undefined, that.logService).getValue(section);
                    if (value !== undefined) {
                        overrides.push({ identifiers, value });
                    }
                }
                return overrides.length ? freeze(overrides) : undefined;
            },
        };
    }
    getOverrideValue(section, overrideIdentifier) {
        const overrideContents = this.getContentsForOverrideIdentifer(overrideIdentifier);
        return overrideContents
            ? section
                ? getConfigurationValue(overrideContents, section)
                : overrideContents
            : undefined;
    }
    getKeysForOverrideIdentifier(identifier) {
        const keys = [];
        for (const override of this.overrides) {
            if (override.identifiers.includes(identifier)) {
                keys.push(...override.keys);
            }
        }
        return arrays.distinct(keys);
    }
    getAllOverrideIdentifiers() {
        const result = [];
        for (const override of this.overrides) {
            result.push(...override.identifiers);
        }
        return arrays.distinct(result);
    }
    override(identifier) {
        let overrideConfigurationModel = this.overrideConfigurations.get(identifier);
        if (!overrideConfigurationModel) {
            overrideConfigurationModel = this.createOverrideConfigurationModel(identifier);
            this.overrideConfigurations.set(identifier, overrideConfigurationModel);
        }
        return overrideConfigurationModel;
    }
    merge(...others) {
        const contents = objects.deepClone(this.contents);
        const overrides = objects.deepClone(this.overrides);
        const keys = [...this.keys];
        const raws = this.raw ? (Array.isArray(this.raw) ? [...this.raw] : [this.raw]) : [this];
        for (const other of others) {
            raws.push(...(other.raw ? (Array.isArray(other.raw) ? other.raw : [other.raw]) : [other]));
            if (other.isEmpty()) {
                continue;
            }
            this.mergeContents(contents, other.contents);
            for (const otherOverride of other.overrides) {
                const [override] = overrides.filter((o) => arrays.equals(o.identifiers, otherOverride.identifiers));
                if (override) {
                    this.mergeContents(override.contents, otherOverride.contents);
                    override.keys.push(...otherOverride.keys);
                    override.keys = arrays.distinct(override.keys);
                }
                else {
                    overrides.push(objects.deepClone(otherOverride));
                }
            }
            for (const key of other.keys) {
                if (keys.indexOf(key) === -1) {
                    keys.push(key);
                }
            }
        }
        return new ConfigurationModel(contents, keys, overrides, !raws.length || raws.every((raw) => raw instanceof ConfigurationModel) ? undefined : raws, this.logService);
    }
    createOverrideConfigurationModel(identifier) {
        const overrideContents = this.getContentsForOverrideIdentifer(identifier);
        if (!overrideContents ||
            typeof overrideContents !== 'object' ||
            !Object.keys(overrideContents).length) {
            // If there are no valid overrides, return self
            return this;
        }
        const contents = {};
        for (const key of arrays.distinct([
            ...Object.keys(this.contents),
            ...Object.keys(overrideContents),
        ])) {
            let contentsForKey = this.contents[key];
            const overrideContentsForKey = overrideContents[key];
            // If there are override contents for the key, clone and merge otherwise use base contents
            if (overrideContentsForKey) {
                // Clone and merge only if base contents and override contents are of type object otherwise just override
                if (typeof contentsForKey === 'object' && typeof overrideContentsForKey === 'object') {
                    contentsForKey = objects.deepClone(contentsForKey);
                    this.mergeContents(contentsForKey, overrideContentsForKey);
                }
                else {
                    contentsForKey = overrideContentsForKey;
                }
            }
            contents[key] = contentsForKey;
        }
        return new ConfigurationModel(contents, this.keys, this.overrides, undefined, this.logService);
    }
    mergeContents(source, target) {
        for (const key of Object.keys(target)) {
            if (key in source) {
                if (types.isObject(source[key]) && types.isObject(target[key])) {
                    this.mergeContents(source[key], target[key]);
                    continue;
                }
            }
            source[key] = objects.deepClone(target[key]);
        }
    }
    getContentsForOverrideIdentifer(identifier) {
        let contentsForIdentifierOnly = null;
        let contents = null;
        const mergeContents = (contentsToMerge) => {
            if (contentsToMerge) {
                if (contents) {
                    this.mergeContents(contents, contentsToMerge);
                }
                else {
                    contents = objects.deepClone(contentsToMerge);
                }
            }
        };
        for (const override of this.overrides) {
            if (override.identifiers.length === 1 && override.identifiers[0] === identifier) {
                contentsForIdentifierOnly = override.contents;
            }
            else if (override.identifiers.includes(identifier)) {
                mergeContents(override.contents);
            }
        }
        // Merge contents of the identifier only at the end to take precedence.
        mergeContents(contentsForIdentifierOnly);
        return contents;
    }
    toJSON() {
        return {
            contents: this.contents,
            overrides: this.overrides,
            keys: this.keys,
        };
    }
    // Update methods
    addValue(key, value) {
        this.updateValue(key, value, true);
    }
    setValue(key, value) {
        this.updateValue(key, value, false);
    }
    removeValue(key) {
        const index = this.keys.indexOf(key);
        if (index === -1) {
            return;
        }
        this.keys.splice(index, 1);
        removeFromValueTree(this.contents, key);
        if (OVERRIDE_PROPERTY_REGEX.test(key)) {
            this.overrides.splice(this.overrides.findIndex((o) => arrays.equals(o.identifiers, overrideIdentifiersFromKey(key))), 1);
        }
    }
    updateValue(key, value, add) {
        addToValueTree(this.contents, key, value, (e) => this.logService.error(e));
        add = add || this.keys.indexOf(key) === -1;
        if (add) {
            this.keys.push(key);
        }
        if (OVERRIDE_PROPERTY_REGEX.test(key)) {
            const identifiers = overrideIdentifiersFromKey(key);
            const override = {
                identifiers,
                keys: Object.keys(this.contents[key]),
                contents: toValuesTree(this.contents[key], (message) => this.logService.error(message)),
            };
            const index = this.overrides.findIndex((o) => arrays.equals(o.identifiers, identifiers));
            if (index !== -1) {
                this.overrides[index] = override;
            }
            else {
                this.overrides.push(override);
            }
        }
    }
}
export class ConfigurationModelParser {
    constructor(_name, logService) {
        this._name = _name;
        this.logService = logService;
        this._raw = null;
        this._configurationModel = null;
        this._restrictedConfigurations = [];
        this._parseErrors = [];
    }
    get configurationModel() {
        return this._configurationModel || ConfigurationModel.createEmptyModel(this.logService);
    }
    get restrictedConfigurations() {
        return this._restrictedConfigurations;
    }
    get errors() {
        return this._parseErrors;
    }
    parse(content, options) {
        if (!types.isUndefinedOrNull(content)) {
            const raw = this.doParseContent(content);
            this.parseRaw(raw, options);
        }
    }
    reparse(options) {
        if (this._raw) {
            this.parseRaw(this._raw, options);
        }
    }
    parseRaw(raw, options) {
        this._raw = raw;
        const { contents, keys, overrides, restricted, hasExcludedProperties } = this.doParseRaw(raw, options);
        this._configurationModel = new ConfigurationModel(contents, keys, overrides, hasExcludedProperties ? [raw] : undefined /* raw has not changed */, this.logService);
        this._restrictedConfigurations = restricted || [];
    }
    doParseContent(content) {
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
            try {
                json.visit(content, visitor);
                raw = currentParent[0] || {};
            }
            catch (e) {
                this.logService.error(`Error while parsing settings file ${this._name}: ${e}`);
                this._parseErrors = [e];
            }
        }
        return raw;
    }
    doParseRaw(raw, options) {
        const configurationProperties = Registry.as(Extensions.Configuration).getConfigurationProperties();
        const filtered = this.filter(raw, configurationProperties, true, options);
        raw = filtered.raw;
        const contents = toValuesTree(raw, (message) => this.logService.error(`Conflict in settings file ${this._name}: ${message}`));
        const keys = Object.keys(raw);
        const overrides = this.toOverrides(raw, (message) => this.logService.error(`Conflict in settings file ${this._name}: ${message}`));
        return {
            contents,
            keys,
            overrides,
            restricted: filtered.restricted,
            hasExcludedProperties: filtered.hasExcludedProperties,
        };
    }
    filter(properties, configurationProperties, filterOverriddenProperties, options) {
        let hasExcludedProperties = false;
        if (!options?.scopes && !options?.skipRestricted && !options?.exclude?.length) {
            return { raw: properties, restricted: [], hasExcludedProperties };
        }
        const raw = {};
        const restricted = [];
        for (const key in properties) {
            if (OVERRIDE_PROPERTY_REGEX.test(key) && filterOverriddenProperties) {
                const result = this.filter(properties[key], configurationProperties, false, options);
                raw[key] = result.raw;
                hasExcludedProperties = hasExcludedProperties || result.hasExcludedProperties;
                restricted.push(...result.restricted);
            }
            else {
                const propertySchema = configurationProperties[key];
                if (propertySchema?.restricted) {
                    restricted.push(key);
                }
                if (this.shouldInclude(key, propertySchema, options)) {
                    raw[key] = properties[key];
                }
                else {
                    hasExcludedProperties = true;
                }
            }
        }
        return { raw, restricted, hasExcludedProperties };
    }
    shouldInclude(key, propertySchema, options) {
        if (options.exclude?.includes(key)) {
            return false;
        }
        if (options.include?.includes(key)) {
            return true;
        }
        if (options.skipRestricted && propertySchema?.restricted) {
            return false;
        }
        if (options.skipUnregistered && !propertySchema) {
            return false;
        }
        const scope = propertySchema
            ? typeof propertySchema.scope !== 'undefined'
                ? propertySchema.scope
                : 4 /* ConfigurationScope.WINDOW */
            : undefined;
        if (scope === undefined || options.scopes === undefined) {
            return true;
        }
        return options.scopes.includes(scope);
    }
    toOverrides(raw, conflictReporter) {
        const overrides = [];
        for (const key of Object.keys(raw)) {
            if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                const overrideRaw = {};
                for (const keyInOverrideRaw in raw[key]) {
                    overrideRaw[keyInOverrideRaw] = raw[key][keyInOverrideRaw];
                }
                overrides.push({
                    identifiers: overrideIdentifiersFromKey(key),
                    keys: Object.keys(overrideRaw),
                    contents: toValuesTree(overrideRaw, conflictReporter),
                });
            }
        }
        return overrides;
    }
}
export class UserSettings extends Disposable {
    constructor(userSettingsResource, parseOptions, extUri, fileService, logService) {
        super();
        this.userSettingsResource = userSettingsResource;
        this.parseOptions = parseOptions;
        this.fileService = fileService;
        this.logService = logService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.parser = new ConfigurationModelParser(this.userSettingsResource.toString(), logService);
        this._register(this.fileService.watch(extUri.dirname(this.userSettingsResource)));
        // Also listen to the resource incase the resource is a symlink - https://github.com/microsoft/vscode/issues/118134
        this._register(this.fileService.watch(this.userSettingsResource));
        this._register(Event.any(Event.filter(this.fileService.onDidFilesChange, (e) => e.contains(this.userSettingsResource)), Event.filter(this.fileService.onDidRunOperation, (e) => (e.isOperation(0 /* FileOperation.CREATE */) ||
            e.isOperation(3 /* FileOperation.COPY */) ||
            e.isOperation(1 /* FileOperation.DELETE */) ||
            e.isOperation(4 /* FileOperation.WRITE */)) &&
            extUri.isEqual(e.resource, userSettingsResource)))(() => this._onDidChange.fire()));
    }
    async loadConfiguration() {
        try {
            const content = await this.fileService.readFile(this.userSettingsResource);
            this.parser.parse(content.value.toString() || '{}', this.parseOptions);
            return this.parser.configurationModel;
        }
        catch (e) {
            return ConfigurationModel.createEmptyModel(this.logService);
        }
    }
    reparse(parseOptions) {
        if (parseOptions) {
            this.parseOptions = parseOptions;
        }
        this.parser.reparse(this.parseOptions);
        return this.parser.configurationModel;
    }
    getRestrictedSettings() {
        return this.parser.restrictedConfigurations;
    }
}
class ConfigurationInspectValue {
    constructor(key, overrides, _value, overrideIdentifiers, defaultConfiguration, policyConfiguration, applicationConfiguration, userConfiguration, localUserConfiguration, remoteUserConfiguration, workspaceConfiguration, folderConfigurationModel, memoryConfigurationModel) {
        this.key = key;
        this.overrides = overrides;
        this._value = _value;
        this.overrideIdentifiers = overrideIdentifiers;
        this.defaultConfiguration = defaultConfiguration;
        this.policyConfiguration = policyConfiguration;
        this.applicationConfiguration = applicationConfiguration;
        this.userConfiguration = userConfiguration;
        this.localUserConfiguration = localUserConfiguration;
        this.remoteUserConfiguration = remoteUserConfiguration;
        this.workspaceConfiguration = workspaceConfiguration;
        this.folderConfigurationModel = folderConfigurationModel;
        this.memoryConfigurationModel = memoryConfigurationModel;
    }
    get value() {
        return freeze(this._value);
    }
    toInspectValue(inspectValue) {
        return inspectValue?.value !== undefined ||
            inspectValue?.override !== undefined ||
            inspectValue?.overrides !== undefined
            ? inspectValue
            : undefined;
    }
    get defaultInspectValue() {
        if (!this._defaultInspectValue) {
            this._defaultInspectValue = this.defaultConfiguration.inspect(this.key, this.overrides.overrideIdentifier);
        }
        return this._defaultInspectValue;
    }
    get defaultValue() {
        return this.defaultInspectValue.merged;
    }
    get default() {
        return this.toInspectValue(this.defaultInspectValue);
    }
    get policyInspectValue() {
        if (this._policyInspectValue === undefined) {
            this._policyInspectValue = this.policyConfiguration
                ? this.policyConfiguration.inspect(this.key)
                : null;
        }
        return this._policyInspectValue;
    }
    get policyValue() {
        return this.policyInspectValue?.merged;
    }
    get policy() {
        return this.policyInspectValue?.value !== undefined
            ? { value: this.policyInspectValue.value }
            : undefined;
    }
    get applicationInspectValue() {
        if (this._applicationInspectValue === undefined) {
            this._applicationInspectValue = this.applicationConfiguration
                ? this.applicationConfiguration.inspect(this.key)
                : null;
        }
        return this._applicationInspectValue;
    }
    get applicationValue() {
        return this.applicationInspectValue?.merged;
    }
    get application() {
        return this.toInspectValue(this.applicationInspectValue);
    }
    get userInspectValue() {
        if (!this._userInspectValue) {
            this._userInspectValue = this.userConfiguration.inspect(this.key, this.overrides.overrideIdentifier);
        }
        return this._userInspectValue;
    }
    get userValue() {
        return this.userInspectValue.merged;
    }
    get user() {
        return this.toInspectValue(this.userInspectValue);
    }
    get userLocalInspectValue() {
        if (!this._userLocalInspectValue) {
            this._userLocalInspectValue = this.localUserConfiguration.inspect(this.key, this.overrides.overrideIdentifier);
        }
        return this._userLocalInspectValue;
    }
    get userLocalValue() {
        return this.userLocalInspectValue.merged;
    }
    get userLocal() {
        return this.toInspectValue(this.userLocalInspectValue);
    }
    get userRemoteInspectValue() {
        if (!this._userRemoteInspectValue) {
            this._userRemoteInspectValue = this.remoteUserConfiguration.inspect(this.key, this.overrides.overrideIdentifier);
        }
        return this._userRemoteInspectValue;
    }
    get userRemoteValue() {
        return this.userRemoteInspectValue.merged;
    }
    get userRemote() {
        return this.toInspectValue(this.userRemoteInspectValue);
    }
    get workspaceInspectValue() {
        if (this._workspaceInspectValue === undefined) {
            this._workspaceInspectValue = this.workspaceConfiguration
                ? this.workspaceConfiguration.inspect(this.key, this.overrides.overrideIdentifier)
                : null;
        }
        return this._workspaceInspectValue;
    }
    get workspaceValue() {
        return this.workspaceInspectValue?.merged;
    }
    get workspace() {
        return this.toInspectValue(this.workspaceInspectValue);
    }
    get workspaceFolderInspectValue() {
        if (this._workspaceFolderInspectValue === undefined) {
            this._workspaceFolderInspectValue = this.folderConfigurationModel
                ? this.folderConfigurationModel.inspect(this.key, this.overrides.overrideIdentifier)
                : null;
        }
        return this._workspaceFolderInspectValue;
    }
    get workspaceFolderValue() {
        return this.workspaceFolderInspectValue?.merged;
    }
    get workspaceFolder() {
        return this.toInspectValue(this.workspaceFolderInspectValue);
    }
    get memoryInspectValue() {
        if (this._memoryInspectValue === undefined) {
            this._memoryInspectValue = this.memoryConfigurationModel.inspect(this.key, this.overrides.overrideIdentifier);
        }
        return this._memoryInspectValue;
    }
    get memoryValue() {
        return this.memoryInspectValue.merged;
    }
    get memory() {
        return this.toInspectValue(this.memoryInspectValue);
    }
}
export class Configuration {
    constructor(_defaultConfiguration, _policyConfiguration, _applicationConfiguration, _localUserConfiguration, _remoteUserConfiguration, _workspaceConfiguration, _folderConfigurations, _memoryConfiguration, _memoryConfigurationByResource, logService) {
        this._defaultConfiguration = _defaultConfiguration;
        this._policyConfiguration = _policyConfiguration;
        this._applicationConfiguration = _applicationConfiguration;
        this._localUserConfiguration = _localUserConfiguration;
        this._remoteUserConfiguration = _remoteUserConfiguration;
        this._workspaceConfiguration = _workspaceConfiguration;
        this._folderConfigurations = _folderConfigurations;
        this._memoryConfiguration = _memoryConfiguration;
        this._memoryConfigurationByResource = _memoryConfigurationByResource;
        this.logService = logService;
        this._workspaceConsolidatedConfiguration = null;
        this._foldersConsolidatedConfigurations = new ResourceMap();
        this._userConfiguration = null;
    }
    getValue(section, overrides, workspace) {
        const consolidateConfigurationModel = this.getConsolidatedConfigurationModel(section, overrides, workspace);
        return consolidateConfigurationModel.getValue(section);
    }
    updateValue(key, value, overrides = {}) {
        let memoryConfiguration;
        if (overrides.resource) {
            memoryConfiguration = this._memoryConfigurationByResource.get(overrides.resource);
            if (!memoryConfiguration) {
                memoryConfiguration = ConfigurationModel.createEmptyModel(this.logService);
                this._memoryConfigurationByResource.set(overrides.resource, memoryConfiguration);
            }
        }
        else {
            memoryConfiguration = this._memoryConfiguration;
        }
        if (value === undefined) {
            memoryConfiguration.removeValue(key);
        }
        else {
            memoryConfiguration.setValue(key, value);
        }
        if (!overrides.resource) {
            this._workspaceConsolidatedConfiguration = null;
        }
    }
    inspect(key, overrides, workspace) {
        const consolidateConfigurationModel = this.getConsolidatedConfigurationModel(key, overrides, workspace);
        const folderConfigurationModel = this.getFolderConfigurationModelForResource(overrides.resource, workspace);
        const memoryConfigurationModel = overrides.resource
            ? this._memoryConfigurationByResource.get(overrides.resource) || this._memoryConfiguration
            : this._memoryConfiguration;
        const overrideIdentifiers = new Set();
        for (const override of consolidateConfigurationModel.overrides) {
            for (const overrideIdentifier of override.identifiers) {
                if (consolidateConfigurationModel.getOverrideValue(key, overrideIdentifier) !== undefined) {
                    overrideIdentifiers.add(overrideIdentifier);
                }
            }
        }
        return new ConfigurationInspectValue(key, overrides, consolidateConfigurationModel.getValue(key), overrideIdentifiers.size ? [...overrideIdentifiers] : undefined, this._defaultConfiguration, this._policyConfiguration.isEmpty() ? undefined : this._policyConfiguration, this.applicationConfiguration.isEmpty() ? undefined : this.applicationConfiguration, this.userConfiguration, this.localUserConfiguration, this.remoteUserConfiguration, workspace ? this._workspaceConfiguration : undefined, folderConfigurationModel ? folderConfigurationModel : undefined, memoryConfigurationModel);
    }
    keys(workspace) {
        const folderConfigurationModel = this.getFolderConfigurationModelForResource(undefined, workspace);
        return {
            default: this._defaultConfiguration.keys.slice(0),
            user: this.userConfiguration.keys.slice(0),
            workspace: this._workspaceConfiguration.keys.slice(0),
            workspaceFolder: folderConfigurationModel ? folderConfigurationModel.keys.slice(0) : [],
        };
    }
    updateDefaultConfiguration(defaultConfiguration) {
        this._defaultConfiguration = defaultConfiguration;
        this._workspaceConsolidatedConfiguration = null;
        this._foldersConsolidatedConfigurations.clear();
    }
    updatePolicyConfiguration(policyConfiguration) {
        this._policyConfiguration = policyConfiguration;
    }
    updateApplicationConfiguration(applicationConfiguration) {
        this._applicationConfiguration = applicationConfiguration;
        this._workspaceConsolidatedConfiguration = null;
        this._foldersConsolidatedConfigurations.clear();
    }
    updateLocalUserConfiguration(localUserConfiguration) {
        this._localUserConfiguration = localUserConfiguration;
        this._userConfiguration = null;
        this._workspaceConsolidatedConfiguration = null;
        this._foldersConsolidatedConfigurations.clear();
    }
    updateRemoteUserConfiguration(remoteUserConfiguration) {
        this._remoteUserConfiguration = remoteUserConfiguration;
        this._userConfiguration = null;
        this._workspaceConsolidatedConfiguration = null;
        this._foldersConsolidatedConfigurations.clear();
    }
    updateWorkspaceConfiguration(workspaceConfiguration) {
        this._workspaceConfiguration = workspaceConfiguration;
        this._workspaceConsolidatedConfiguration = null;
        this._foldersConsolidatedConfigurations.clear();
    }
    updateFolderConfiguration(resource, configuration) {
        this._folderConfigurations.set(resource, configuration);
        this._foldersConsolidatedConfigurations.delete(resource);
    }
    deleteFolderConfiguration(resource) {
        this.folderConfigurations.delete(resource);
        this._foldersConsolidatedConfigurations.delete(resource);
    }
    compareAndUpdateDefaultConfiguration(defaults, keys) {
        const overrides = [];
        if (!keys) {
            const { added, updated, removed } = compare(this._defaultConfiguration, defaults);
            keys = [...added, ...updated, ...removed];
        }
        for (const key of keys) {
            for (const overrideIdentifier of overrideIdentifiersFromKey(key)) {
                const fromKeys = this._defaultConfiguration.getKeysForOverrideIdentifier(overrideIdentifier);
                const toKeys = defaults.getKeysForOverrideIdentifier(overrideIdentifier);
                const keys = [
                    ...toKeys.filter((key) => fromKeys.indexOf(key) === -1),
                    ...fromKeys.filter((key) => toKeys.indexOf(key) === -1),
                    ...fromKeys.filter((key) => !objects.equals(this._defaultConfiguration.override(overrideIdentifier).getValue(key), defaults.override(overrideIdentifier).getValue(key))),
                ];
                overrides.push([overrideIdentifier, keys]);
            }
        }
        this.updateDefaultConfiguration(defaults);
        return { keys, overrides };
    }
    compareAndUpdatePolicyConfiguration(policyConfiguration) {
        const { added, updated, removed } = compare(this._policyConfiguration, policyConfiguration);
        const keys = [...added, ...updated, ...removed];
        if (keys.length) {
            this.updatePolicyConfiguration(policyConfiguration);
        }
        return { keys, overrides: [] };
    }
    compareAndUpdateApplicationConfiguration(application) {
        const { added, updated, removed, overrides } = compare(this.applicationConfiguration, application);
        const keys = [...added, ...updated, ...removed];
        if (keys.length) {
            this.updateApplicationConfiguration(application);
        }
        return { keys, overrides };
    }
    compareAndUpdateLocalUserConfiguration(user) {
        const { added, updated, removed, overrides } = compare(this.localUserConfiguration, user);
        const keys = [...added, ...updated, ...removed];
        if (keys.length) {
            this.updateLocalUserConfiguration(user);
        }
        return { keys, overrides };
    }
    compareAndUpdateRemoteUserConfiguration(user) {
        const { added, updated, removed, overrides } = compare(this.remoteUserConfiguration, user);
        const keys = [...added, ...updated, ...removed];
        if (keys.length) {
            this.updateRemoteUserConfiguration(user);
        }
        return { keys, overrides };
    }
    compareAndUpdateWorkspaceConfiguration(workspaceConfiguration) {
        const { added, updated, removed, overrides } = compare(this.workspaceConfiguration, workspaceConfiguration);
        const keys = [...added, ...updated, ...removed];
        if (keys.length) {
            this.updateWorkspaceConfiguration(workspaceConfiguration);
        }
        return { keys, overrides };
    }
    compareAndUpdateFolderConfiguration(resource, folderConfiguration) {
        const currentFolderConfiguration = this.folderConfigurations.get(resource);
        const { added, updated, removed, overrides } = compare(currentFolderConfiguration, folderConfiguration);
        const keys = [...added, ...updated, ...removed];
        if (keys.length || !currentFolderConfiguration) {
            this.updateFolderConfiguration(resource, folderConfiguration);
        }
        return { keys, overrides };
    }
    compareAndDeleteFolderConfiguration(folder) {
        const folderConfig = this.folderConfigurations.get(folder);
        if (!folderConfig) {
            throw new Error('Unknown folder');
        }
        this.deleteFolderConfiguration(folder);
        const { added, updated, removed, overrides } = compare(folderConfig, undefined);
        return { keys: [...added, ...updated, ...removed], overrides };
    }
    get defaults() {
        return this._defaultConfiguration;
    }
    get applicationConfiguration() {
        return this._applicationConfiguration;
    }
    get userConfiguration() {
        if (!this._userConfiguration) {
            if (this._remoteUserConfiguration.isEmpty()) {
                this._userConfiguration = this._localUserConfiguration;
            }
            else {
                const merged = this._localUserConfiguration.merge(this._remoteUserConfiguration);
                this._userConfiguration = new ConfigurationModel(merged.contents, merged.keys, merged.overrides, undefined, this.logService);
            }
        }
        return this._userConfiguration;
    }
    get localUserConfiguration() {
        return this._localUserConfiguration;
    }
    get remoteUserConfiguration() {
        return this._remoteUserConfiguration;
    }
    get workspaceConfiguration() {
        return this._workspaceConfiguration;
    }
    get folderConfigurations() {
        return this._folderConfigurations;
    }
    getConsolidatedConfigurationModel(section, overrides, workspace) {
        let configurationModel = this.getConsolidatedConfigurationModelForResource(overrides, workspace);
        if (overrides.overrideIdentifier) {
            configurationModel = configurationModel.override(overrides.overrideIdentifier);
        }
        if (!this._policyConfiguration.isEmpty() &&
            this._policyConfiguration.getValue(section) !== undefined) {
            // clone by merging
            configurationModel = configurationModel.merge();
            for (const key of this._policyConfiguration.keys) {
                configurationModel.setValue(key, this._policyConfiguration.getValue(key));
            }
        }
        return configurationModel;
    }
    getConsolidatedConfigurationModelForResource({ resource }, workspace) {
        let consolidateConfiguration = this.getWorkspaceConsolidatedConfiguration();
        if (workspace && resource) {
            const root = workspace.getFolder(resource);
            if (root) {
                consolidateConfiguration =
                    this.getFolderConsolidatedConfiguration(root.uri) || consolidateConfiguration;
            }
            const memoryConfigurationForResource = this._memoryConfigurationByResource.get(resource);
            if (memoryConfigurationForResource) {
                consolidateConfiguration = consolidateConfiguration.merge(memoryConfigurationForResource);
            }
        }
        return consolidateConfiguration;
    }
    getWorkspaceConsolidatedConfiguration() {
        if (!this._workspaceConsolidatedConfiguration) {
            this._workspaceConsolidatedConfiguration = this._defaultConfiguration.merge(this.applicationConfiguration, this.userConfiguration, this._workspaceConfiguration, this._memoryConfiguration);
        }
        return this._workspaceConsolidatedConfiguration;
    }
    getFolderConsolidatedConfiguration(folder) {
        let folderConsolidatedConfiguration = this._foldersConsolidatedConfigurations.get(folder);
        if (!folderConsolidatedConfiguration) {
            const workspaceConsolidateConfiguration = this.getWorkspaceConsolidatedConfiguration();
            const folderConfiguration = this._folderConfigurations.get(folder);
            if (folderConfiguration) {
                folderConsolidatedConfiguration =
                    workspaceConsolidateConfiguration.merge(folderConfiguration);
                this._foldersConsolidatedConfigurations.set(folder, folderConsolidatedConfiguration);
            }
            else {
                folderConsolidatedConfiguration = workspaceConsolidateConfiguration;
            }
        }
        return folderConsolidatedConfiguration;
    }
    getFolderConfigurationModelForResource(resource, workspace) {
        if (workspace && resource) {
            const root = workspace.getFolder(resource);
            if (root) {
                return this._folderConfigurations.get(root.uri);
            }
        }
        return undefined;
    }
    toData() {
        return {
            defaults: {
                contents: this._defaultConfiguration.contents,
                overrides: this._defaultConfiguration.overrides,
                keys: this._defaultConfiguration.keys,
            },
            policy: {
                contents: this._policyConfiguration.contents,
                overrides: this._policyConfiguration.overrides,
                keys: this._policyConfiguration.keys,
            },
            application: {
                contents: this.applicationConfiguration.contents,
                overrides: this.applicationConfiguration.overrides,
                keys: this.applicationConfiguration.keys,
                raw: Array.isArray(this.applicationConfiguration.raw)
                    ? undefined
                    : this.applicationConfiguration.raw,
            },
            userLocal: {
                contents: this.localUserConfiguration.contents,
                overrides: this.localUserConfiguration.overrides,
                keys: this.localUserConfiguration.keys,
                raw: Array.isArray(this.localUserConfiguration.raw)
                    ? undefined
                    : this.localUserConfiguration.raw,
            },
            userRemote: {
                contents: this.remoteUserConfiguration.contents,
                overrides: this.remoteUserConfiguration.overrides,
                keys: this.remoteUserConfiguration.keys,
                raw: Array.isArray(this.remoteUserConfiguration.raw)
                    ? undefined
                    : this.remoteUserConfiguration.raw,
            },
            workspace: {
                contents: this._workspaceConfiguration.contents,
                overrides: this._workspaceConfiguration.overrides,
                keys: this._workspaceConfiguration.keys,
            },
            folders: [...this._folderConfigurations.keys()].reduce((result, folder) => {
                const { contents, overrides, keys } = this._folderConfigurations.get(folder);
                result.push([folder, { contents, overrides, keys }]);
                return result;
            }, []),
        };
    }
    allKeys() {
        const keys = new Set();
        this._defaultConfiguration.keys.forEach((key) => keys.add(key));
        this.userConfiguration.keys.forEach((key) => keys.add(key));
        this._workspaceConfiguration.keys.forEach((key) => keys.add(key));
        this._folderConfigurations.forEach((folderConfiguration) => folderConfiguration.keys.forEach((key) => keys.add(key)));
        return [...keys.values()];
    }
    allOverrideIdentifiers() {
        const keys = new Set();
        this._defaultConfiguration.getAllOverrideIdentifiers().forEach((key) => keys.add(key));
        this.userConfiguration.getAllOverrideIdentifiers().forEach((key) => keys.add(key));
        this._workspaceConfiguration.getAllOverrideIdentifiers().forEach((key) => keys.add(key));
        this._folderConfigurations.forEach((folderConfiguration) => folderConfiguration.getAllOverrideIdentifiers().forEach((key) => keys.add(key)));
        return [...keys.values()];
    }
    getAllKeysForOverrideIdentifier(overrideIdentifier) {
        const keys = new Set();
        this._defaultConfiguration
            .getKeysForOverrideIdentifier(overrideIdentifier)
            .forEach((key) => keys.add(key));
        this.userConfiguration
            .getKeysForOverrideIdentifier(overrideIdentifier)
            .forEach((key) => keys.add(key));
        this._workspaceConfiguration
            .getKeysForOverrideIdentifier(overrideIdentifier)
            .forEach((key) => keys.add(key));
        this._folderConfigurations.forEach((folderConfiguration) => folderConfiguration
            .getKeysForOverrideIdentifier(overrideIdentifier)
            .forEach((key) => keys.add(key)));
        return [...keys.values()];
    }
    static parse(data, logService) {
        const defaultConfiguration = this.parseConfigurationModel(data.defaults, logService);
        const policyConfiguration = this.parseConfigurationModel(data.policy, logService);
        const applicationConfiguration = this.parseConfigurationModel(data.application, logService);
        const userLocalConfiguration = this.parseConfigurationModel(data.userLocal, logService);
        const userRemoteConfiguration = this.parseConfigurationModel(data.userRemote, logService);
        const workspaceConfiguration = this.parseConfigurationModel(data.workspace, logService);
        const folders = data.folders.reduce((result, value) => {
            result.set(URI.revive(value[0]), this.parseConfigurationModel(value[1], logService));
            return result;
        }, new ResourceMap());
        return new Configuration(defaultConfiguration, policyConfiguration, applicationConfiguration, userLocalConfiguration, userRemoteConfiguration, workspaceConfiguration, folders, ConfigurationModel.createEmptyModel(logService), new ResourceMap(), logService);
    }
    static parseConfigurationModel(model, logService) {
        return new ConfigurationModel(model.contents, model.keys, model.overrides, model.raw, logService);
    }
}
export function mergeChanges(...changes) {
    if (changes.length === 0) {
        return { keys: [], overrides: [] };
    }
    if (changes.length === 1) {
        return changes[0];
    }
    const keysSet = new Set();
    const overridesMap = new Map();
    for (const change of changes) {
        change.keys.forEach((key) => keysSet.add(key));
        change.overrides.forEach(([identifier, keys]) => {
            const result = getOrSet(overridesMap, identifier, new Set());
            keys.forEach((key) => result.add(key));
        });
    }
    const overrides = [];
    overridesMap.forEach((keys, identifier) => overrides.push([identifier, [...keys.values()]]));
    return { keys: [...keysSet.values()], overrides };
}
export class ConfigurationChangeEvent {
    constructor(change, previous, currentConfiguraiton, currentWorkspace, logService) {
        this.change = change;
        this.previous = previous;
        this.currentConfiguraiton = currentConfiguraiton;
        this.currentWorkspace = currentWorkspace;
        this.logService = logService;
        this._marker = '\n';
        this._markerCode1 = this._marker.charCodeAt(0);
        this._markerCode2 = '.'.charCodeAt(0);
        this.affectedKeys = new Set();
        this._previousConfiguration = undefined;
        for (const key of change.keys) {
            this.affectedKeys.add(key);
        }
        for (const [, keys] of change.overrides) {
            for (const key of keys) {
                this.affectedKeys.add(key);
            }
        }
        // Example: '\nfoo.bar\nabc.def\n'
        this._affectsConfigStr = this._marker;
        for (const key of this.affectedKeys) {
            this._affectsConfigStr += key + this._marker;
        }
    }
    get previousConfiguration() {
        if (!this._previousConfiguration && this.previous) {
            this._previousConfiguration = Configuration.parse(this.previous.data, this.logService);
        }
        return this._previousConfiguration;
    }
    affectsConfiguration(section, overrides) {
        // we have one large string with all keys that have changed. we pad (marker) the section
        // and check that either find it padded or before a segment character
        const needle = this._marker + section;
        const idx = this._affectsConfigStr.indexOf(needle);
        if (idx < 0) {
            // NOT: (marker + section)
            return false;
        }
        const pos = idx + needle.length;
        if (pos >= this._affectsConfigStr.length) {
            return false;
        }
        const code = this._affectsConfigStr.charCodeAt(pos);
        if (code !== this._markerCode1 && code !== this._markerCode2) {
            // NOT: section + (marker | segment)
            return false;
        }
        if (overrides) {
            const value1 = this.previousConfiguration
                ? this.previousConfiguration.getValue(section, overrides, this.previous?.workspace)
                : undefined;
            const value2 = this.currentConfiguraiton.getValue(section, overrides, this.currentWorkspace);
            return !objects.equals(value1, value2);
        }
        return true;
    }
}
function compare(from, to) {
    const { added, removed, updated } = compareConfigurationContents(to?.rawConfiguration, from?.rawConfiguration);
    const overrides = [];
    const fromOverrideIdentifiers = from?.getAllOverrideIdentifiers() || [];
    const toOverrideIdentifiers = to?.getAllOverrideIdentifiers() || [];
    if (to) {
        const addedOverrideIdentifiers = toOverrideIdentifiers.filter((key) => !fromOverrideIdentifiers.includes(key));
        for (const identifier of addedOverrideIdentifiers) {
            overrides.push([identifier, to.getKeysForOverrideIdentifier(identifier)]);
        }
    }
    if (from) {
        const removedOverrideIdentifiers = fromOverrideIdentifiers.filter((key) => !toOverrideIdentifiers.includes(key));
        for (const identifier of removedOverrideIdentifiers) {
            overrides.push([identifier, from.getKeysForOverrideIdentifier(identifier)]);
        }
    }
    if (to && from) {
        for (const identifier of fromOverrideIdentifiers) {
            if (toOverrideIdentifiers.includes(identifier)) {
                const result = compareConfigurationContents({
                    contents: from.getOverrideValue(undefined, identifier) || {},
                    keys: from.getKeysForOverrideIdentifier(identifier),
                }, {
                    contents: to.getOverrideValue(undefined, identifier) || {},
                    keys: to.getKeysForOverrideIdentifier(identifier),
                });
                overrides.push([identifier, [...result.added, ...result.removed, ...result.updated]]);
            }
        }
    }
    return { added, removed, updated, overrides };
}
function compareConfigurationContents(to, from) {
    const added = to
        ? from
            ? to.keys.filter((key) => from.keys.indexOf(key) === -1)
            : [...to.keys]
        : [];
    const removed = from
        ? to
            ? from.keys.filter((key) => to.keys.indexOf(key) === -1)
            : [...from.keys]
        : [];
    const updated = [];
    if (to && from) {
        for (const key of from.keys) {
            if (to.keys.indexOf(key) !== -1) {
                const value1 = getConfigurationValue(from.contents, key);
                const value2 = getConfigurationValue(to.contents, key);
                if (!objects.equals(value1, value2)) {
                    updated.push(key);
                }
            }
        }
    }
    return { added, removed, updated };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi9jb21tb24vY29uZmlndXJhdGlvbk1vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNuRSxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBRTFELE9BQU8sS0FBSyxLQUFLLE1BQU0sK0JBQStCLENBQUE7QUFDdEQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sY0FBYyxFQUVkLHFCQUFxQixFQVdyQixtQkFBbUIsRUFDbkIsWUFBWSxHQUNaLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUVOLFVBQVUsRUFHViwwQkFBMEIsRUFDMUIsdUJBQXVCLEdBQ3ZCLE1BQU0sNEJBQTRCLENBQUE7QUFHbkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzVELFNBQVMsTUFBTSxDQUFJLElBQU87SUFDekIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDL0QsQ0FB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