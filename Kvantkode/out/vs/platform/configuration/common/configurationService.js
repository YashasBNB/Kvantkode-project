/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct, equals as arrayEquals } from '../../../base/common/arrays.js';
import { Queue, RunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { applyEdits, setProperty } from '../../../base/common/jsonEdit.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { equals } from '../../../base/common/objects.js';
import { OS } from '../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { isConfigurationOverrides, isConfigurationUpdateOverrides, } from './configuration.js';
import { Configuration, ConfigurationChangeEvent, ConfigurationModel, UserSettings, } from './configurationModels.js';
import { keyFromOverrideIdentifiers } from './configurationRegistry.js';
import { DefaultConfiguration, NullPolicyConfiguration, PolicyConfiguration, } from './configurations.js';
import { NullPolicyService } from '../../policy/common/policy.js';
export class ConfigurationService extends Disposable {
    constructor(settingsResource, fileService, policyService, logService) {
        super();
        this.settingsResource = settingsResource;
        this.logService = logService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this.defaultConfiguration = this._register(new DefaultConfiguration(logService));
        this.policyConfiguration =
            policyService instanceof NullPolicyService
                ? new NullPolicyConfiguration()
                : this._register(new PolicyConfiguration(this.defaultConfiguration, policyService, logService));
        this.userConfiguration = this._register(new UserSettings(this.settingsResource, {}, extUriBiasedIgnorePathCase, fileService, logService));
        this.configuration = new Configuration(this.defaultConfiguration.configurationModel, this.policyConfiguration.configurationModel, ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), logService);
        this.configurationEditing = new ConfigurationEditing(settingsResource, fileService, this);
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.reloadConfiguration(), 50));
        this._register(this.defaultConfiguration.onDidChangeConfiguration(({ defaults, properties }) => this.onDidDefaultConfigurationChange(defaults, properties)));
        this._register(this.policyConfiguration.onDidChangeConfiguration((model) => this.onDidPolicyConfigurationChange(model)));
        this._register(this.userConfiguration.onDidChange(() => this.reloadConfigurationScheduler.schedule()));
    }
    async initialize() {
        const [defaultModel, policyModel, userModel] = await Promise.all([
            this.defaultConfiguration.initialize(),
            this.policyConfiguration.initialize(),
            this.userConfiguration.loadConfiguration(),
        ]);
        this.configuration = new Configuration(defaultModel, policyModel, ConfigurationModel.createEmptyModel(this.logService), userModel, ConfigurationModel.createEmptyModel(this.logService), ConfigurationModel.createEmptyModel(this.logService), new ResourceMap(), ConfigurationModel.createEmptyModel(this.logService), new ResourceMap(), this.logService);
    }
    getConfigurationData() {
        return this.configuration.toData();
    }
    getValue(arg1, arg2) {
        const section = typeof arg1 === 'string' ? arg1 : undefined;
        const overrides = isConfigurationOverrides(arg1)
            ? arg1
            : isConfigurationOverrides(arg2)
                ? arg2
                : {};
        return this.configuration.getValue(section, overrides, undefined);
    }
    async updateValue(key, value, arg3, arg4, options) {
        const overrides = isConfigurationUpdateOverrides(arg3)
            ? arg3
            : isConfigurationOverrides(arg3)
                ? {
                    resource: arg3.resource,
                    overrideIdentifiers: arg3.overrideIdentifier ? [arg3.overrideIdentifier] : undefined,
                }
                : undefined;
        const target = overrides ? arg4 : arg3;
        if (target !== undefined) {
            if (target !== 3 /* ConfigurationTarget.USER_LOCAL */ && target !== 2 /* ConfigurationTarget.USER */) {
                throw new Error(`Unable to write ${key} to target ${target}.`);
            }
        }
        if (overrides?.overrideIdentifiers) {
            overrides.overrideIdentifiers = distinct(overrides.overrideIdentifiers);
            overrides.overrideIdentifiers = overrides.overrideIdentifiers.length
                ? overrides.overrideIdentifiers
                : undefined;
        }
        const inspect = this.inspect(key, {
            resource: overrides?.resource,
            overrideIdentifier: overrides?.overrideIdentifiers
                ? overrides.overrideIdentifiers[0]
                : undefined,
        });
        if (inspect.policyValue !== undefined) {
            throw new Error(`Unable to write ${key} because it is configured in system policy.`);
        }
        // Remove the setting, if the value is same as default value
        if (equals(value, inspect.defaultValue)) {
            value = undefined;
        }
        if (overrides?.overrideIdentifiers?.length && overrides.overrideIdentifiers.length > 1) {
            const overrideIdentifiers = overrides.overrideIdentifiers.sort();
            const existingOverrides = this.configuration.localUserConfiguration.overrides.find((override) => arrayEquals([...override.identifiers].sort(), overrideIdentifiers));
            if (existingOverrides) {
                overrides.overrideIdentifiers = existingOverrides.identifiers;
            }
        }
        const path = overrides?.overrideIdentifiers?.length
            ? [keyFromOverrideIdentifiers(overrides.overrideIdentifiers), key]
            : [key];
        await this.configurationEditing.write(path, value);
        await this.reloadConfiguration();
    }
    inspect(key, overrides = {}) {
        return this.configuration.inspect(key, overrides, undefined);
    }
    keys() {
        return this.configuration.keys(undefined);
    }
    async reloadConfiguration() {
        const configurationModel = await this.userConfiguration.loadConfiguration();
        this.onDidChangeUserConfiguration(configurationModel);
    }
    onDidChangeUserConfiguration(userConfigurationModel) {
        const previous = this.configuration.toData();
        const change = this.configuration.compareAndUpdateLocalUserConfiguration(userConfigurationModel);
        this.trigger(change, previous, 2 /* ConfigurationTarget.USER */);
    }
    onDidDefaultConfigurationChange(defaultConfigurationModel, properties) {
        const previous = this.configuration.toData();
        const change = this.configuration.compareAndUpdateDefaultConfiguration(defaultConfigurationModel, properties);
        this.trigger(change, previous, 7 /* ConfigurationTarget.DEFAULT */);
    }
    onDidPolicyConfigurationChange(policyConfiguration) {
        const previous = this.configuration.toData();
        const change = this.configuration.compareAndUpdatePolicyConfiguration(policyConfiguration);
        this.trigger(change, previous, 7 /* ConfigurationTarget.DEFAULT */);
    }
    trigger(configurationChange, previous, source) {
        const event = new ConfigurationChangeEvent(configurationChange, { data: previous }, this.configuration, undefined, this.logService);
        event.source = source;
        this._onDidChangeConfiguration.fire(event);
    }
}
class ConfigurationEditing {
    constructor(settingsResource, fileService, configurationService) {
        this.settingsResource = settingsResource;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.queue = new Queue();
    }
    write(path, value) {
        return this.queue.queue(() => this.doWriteConfiguration(path, value)); // queue up writes to prevent race conditions
    }
    async doWriteConfiguration(path, value) {
        let content;
        try {
            const fileContent = await this.fileService.readFile(this.settingsResource);
            content = fileContent.value.toString();
        }
        catch (error) {
            if (error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                content = '{}';
            }
            else {
                throw error;
            }
        }
        const parseErrors = [];
        parse(content, parseErrors, { allowTrailingComma: true, allowEmptyContent: true });
        if (parseErrors.length > 0) {
            throw new Error('Unable to write into the settings file. Please open the file to correct errors/warnings in the file and try again.');
        }
        const edits = this.getEdits(content, path, value);
        content = applyEdits(content, edits);
        await this.fileService.writeFile(this.settingsResource, VSBuffer.fromString(content));
    }
    getEdits(content, path, value) {
        const { tabSize, insertSpaces, eol } = this.formattingOptions;
        // With empty path the entire file is being replaced, so we just use JSON.stringify
        if (!path.length) {
            const content = JSON.stringify(value, null, insertSpaces ? ' '.repeat(tabSize) : '\t');
            return [
                {
                    content,
                    length: content.length,
                    offset: 0,
                },
            ];
        }
        return setProperty(content, path, value, { tabSize, insertSpaces, eol });
    }
    get formattingOptions() {
        if (!this._formattingOptions) {
            let eol = OS === 3 /* OperatingSystem.Linux */ || OS === 2 /* OperatingSystem.Macintosh */ ? '\n' : '\r\n';
            const configuredEol = this.configurationService.getValue('files.eol', {
                overrideIdentifier: 'jsonc',
            });
            if (configuredEol && typeof configuredEol === 'string' && configuredEol !== 'auto') {
                eol = configuredEol;
            }
            this._formattingOptions = {
                eol,
                insertSpaces: !!this.configurationService.getValue('editor.insertSpaces', {
                    overrideIdentifier: 'jsonc',
                }),
                tabSize: this.configurationService.getValue('editor.tabSize', {
                    overrideIdentifier: 'jsonc',
                }),
            };
        }
        return this._formattingOptions;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vY29tbW9uL2NvbmZpZ3VyYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBd0IsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsRUFBRSxFQUFtQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlFLE9BQU8sRUFVTix3QkFBd0IsRUFDeEIsOEJBQThCLEdBQzlCLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUNOLGFBQWEsRUFDYix3QkFBd0IsRUFDeEIsa0JBQWtCLEVBQ2xCLFlBQVksR0FDWixNQUFNLDBCQUEwQixDQUFBO0FBQ2pD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