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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vY29tbW9uL2NvbmZpZ3VyYXRpb25Nb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbkUsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRCxPQUFPLEtBQUssS0FBSyxNQUFNLCtCQUErQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUNOLGNBQWMsRUFFZCxxQkFBcUIsRUFXckIsbUJBQW1CLEVBQ25CLFlBQVksR0FDWixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFFTixVQUFVLEVBR1YsMEJBQTBCLEVBQzFCLHVCQUF1QixHQUN2QixNQUFNLDRCQUE0QixDQUFBO0FBR25DLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc1RCxTQUFTLE1BQU0sQ0FBSSxJQUFPO0lBQ3pCLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQy9ELENBQUM7QUFJ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