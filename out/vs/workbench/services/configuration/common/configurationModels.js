/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/objects.js';
import { toValuesTree, } from '../../../../platform/configuration/common/configuration.js';
import { Configuration as BaseConfiguration, ConfigurationModelParser, ConfigurationModel, } from '../../../../platform/configuration/common/configurationModels.js';
import { isBoolean } from '../../../../base/common/types.js';
import { distinct } from '../../../../base/common/arrays.js';
export class WorkspaceConfigurationModelParser extends ConfigurationModelParser {
    constructor(name, logService) {
        super(name, logService);
        this._folders = [];
        this._transient = false;
        this._settingsModelParser = new ConfigurationModelParser(name, logService);
        this._launchModel = ConfigurationModel.createEmptyModel(logService);
        this._tasksModel = ConfigurationModel.createEmptyModel(logService);
    }
    get folders() {
        return this._folders;
    }
    get transient() {
        return this._transient;
    }
    get settingsModel() {
        return this._settingsModelParser.configurationModel;
    }
    get launchModel() {
        return this._launchModel;
    }
    get tasksModel() {
        return this._tasksModel;
    }
    reparseWorkspaceSettings(configurationParseOptions) {
        this._settingsModelParser.reparse(configurationParseOptions);
    }
    getRestrictedWorkspaceSettings() {
        return this._settingsModelParser.restrictedConfigurations;
    }
    doParseRaw(raw, configurationParseOptions) {
        this._folders = (raw['folders'] || []);
        this._transient = isBoolean(raw['transient']) && raw['transient'];
        this._settingsModelParser.parseRaw(raw['settings'], configurationParseOptions);
        this._launchModel = this.createConfigurationModelFrom(raw, 'launch');
        this._tasksModel = this.createConfigurationModelFrom(raw, 'tasks');
        return super.doParseRaw(raw, configurationParseOptions);
    }
    createConfigurationModelFrom(raw, key) {
        const data = raw[key];
        if (data) {
            const contents = toValuesTree(data, (message) => console.error(`Conflict in settings file ${this._name}: ${message}`));
            const scopedContents = Object.create(null);
            scopedContents[key] = contents;
            const keys = Object.keys(data).map((k) => `${key}.${k}`);
            return new ConfigurationModel(scopedContents, keys, [], undefined, this.logService);
        }
        return ConfigurationModel.createEmptyModel(this.logService);
    }
}
export class StandaloneConfigurationModelParser extends ConfigurationModelParser {
    constructor(name, scope, logService) {
        super(name, logService);
        this.scope = scope;
    }
    doParseRaw(raw, configurationParseOptions) {
        const contents = toValuesTree(raw, (message) => console.error(`Conflict in settings file ${this._name}: ${message}`));
        const scopedContents = Object.create(null);
        scopedContents[this.scope] = contents;
        const keys = Object.keys(raw).map((key) => `${this.scope}.${key}`);
        return { contents: scopedContents, keys, overrides: [] };
    }
}
export class Configuration extends BaseConfiguration {
    constructor(defaults, policy, application, localUser, remoteUser, workspaceConfiguration, folders, memoryConfiguration, memoryConfigurationByResource, _workspace, logService) {
        super(defaults, policy, application, localUser, remoteUser, workspaceConfiguration, folders, memoryConfiguration, memoryConfigurationByResource, logService);
        this._workspace = _workspace;
    }
    getValue(key, overrides = {}) {
        return super.getValue(key, overrides, this._workspace);
    }
    inspect(key, overrides = {}) {
        return super.inspect(key, overrides, this._workspace);
    }
    keys() {
        return super.keys(this._workspace);
    }
    compareAndDeleteFolderConfiguration(folder) {
        if (this._workspace &&
            this._workspace.folders.length > 0 &&
            this._workspace.folders[0].uri.toString() === folder.toString()) {
            // Do not remove workspace configuration
            return { keys: [], overrides: [] };
        }
        return super.compareAndDeleteFolderConfiguration(folder);
    }
    compare(other) {
        const compare = (fromKeys, toKeys, overrideIdentifier) => {
            const keys = [];
            keys.push(...toKeys.filter((key) => fromKeys.indexOf(key) === -1));
            keys.push(...fromKeys.filter((key) => toKeys.indexOf(key) === -1));
            keys.push(...fromKeys.filter((key) => {
                // Ignore if the key does not exist in both models
                if (toKeys.indexOf(key) === -1) {
                    return false;
                }
                // Compare workspace value
                if (!equals(this.getValue(key, { overrideIdentifier }), other.getValue(key, { overrideIdentifier }))) {
                    return true;
                }
                // Compare workspace folder value
                return (this._workspace &&
                    this._workspace.folders.some((folder) => !equals(this.getValue(key, { resource: folder.uri, overrideIdentifier }), other.getValue(key, { resource: folder.uri, overrideIdentifier }))));
            }));
            return keys;
        };
        const keys = compare(this.allKeys(), other.allKeys());
        const overrides = [];
        const allOverrideIdentifiers = distinct([
            ...this.allOverrideIdentifiers(),
            ...other.allOverrideIdentifiers(),
        ]);
        for (const overrideIdentifier of allOverrideIdentifiers) {
            const keys = compare(this.getAllKeysForOverrideIdentifier(overrideIdentifier), other.getAllKeysForOverrideIdentifier(overrideIdentifier), overrideIdentifier);
            if (keys.length) {
                overrides.push([overrideIdentifier, keys]);
            }
        }
        return { keys, overrides };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL2NvbW1vbi9jb25maWd1cmF0aW9uTW9kZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sWUFBWSxHQUtaLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLGFBQWEsSUFBSSxpQkFBaUIsRUFDbEMsd0JBQXdCLEVBQ3hCLGtCQUFrQixHQUVsQixNQUFNLGtFQUFrRSxDQUFBO0FBS3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHNUQsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLHdCQUF3QjtJQU85RSxZQUFZLElBQVksRUFBRSxVQUF1QjtRQUNoRCxLQUFLLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBUGhCLGFBQVEsR0FBNkIsRUFBRSxDQUFBO1FBQ3ZDLGVBQVUsR0FBWSxLQUFLLENBQUE7UUFPbEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzFFLElBQUksQ0FBQyxZQUFZLEdBQUcsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7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