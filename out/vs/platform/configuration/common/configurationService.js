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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb25maWd1cmF0aW9uL2NvbW1vbi9jb25maWd1cmF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQXdCLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEQsT0FBTyxFQUFFLEVBQUUsRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RSxPQUFPLEVBVU4sd0JBQXdCLEVBQ3hCLDhCQUE4QixHQUM5QixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFDTixhQUFhLEVBQ2Isd0JBQXdCLEVBQ3hCLGtCQUFrQixFQUNsQixZQUFZLEdBQ1osTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUs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