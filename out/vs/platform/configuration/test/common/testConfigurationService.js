/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { getConfigurationValue, isConfigurationOverrides, } from '../../common/configuration.js';
import { Extensions } from '../../common/configurationRegistry.js';
import { Registry } from '../../../registry/common/platform.js';
export class TestConfigurationService {
    constructor(configuration) {
        this.onDidChangeConfigurationEmitter = new Emitter();
        this.onDidChangeConfiguration = this.onDidChangeConfigurationEmitter.event;
        this.configurationByRoot = TernarySearchTree.forPaths();
        this.overrideIdentifiers = new Map();
        this.configuration = configuration || Object.create(null);
    }
    reloadConfiguration() {
        return Promise.resolve(this.getValue());
    }
    getValue(arg1, arg2) {
        let configuration;
        const overrides = isConfigurationOverrides(arg1)
            ? arg1
            : isConfigurationOverrides(arg2)
                ? arg2
                : undefined;
        if (overrides) {
            if (overrides.resource) {
                configuration = this.configurationByRoot.findSubstr(overrides.resource.fsPath);
            }
        }
        configuration = configuration ? configuration : this.configuration;
        if (arg1 && typeof arg1 === 'string') {
            return configuration[arg1] ?? getConfigurationValue(configuration, arg1);
        }
        return configuration;
    }
    updateValue(key, value) {
        return Promise.resolve(undefined);
    }
    setUserConfiguration(key, value, root) {
        if (root) {
            const configForRoot = this.configurationByRoot.get(root.fsPath) || Object.create(null);
            configForRoot[key] = value;
            this.configurationByRoot.set(root.fsPath, configForRoot);
        }
        else {
            this.configuration[key] = value;
        }
        return Promise.resolve(undefined);
    }
    setOverrideIdentifiers(key, identifiers) {
        this.overrideIdentifiers.set(key, identifiers);
    }
    inspect(key, overrides) {
        const value = this.getValue(key, overrides);
        return {
            value,
            defaultValue: undefined,
            userValue: value,
            overrideIdentifiers: this.overrideIdentifiers.get(key),
        };
    }
    keys() {
        return {
            default: Object.keys(Registry.as(Extensions.Configuration).getConfigurationProperties()),
            user: Object.keys(this.configuration),
            workspace: [],
            workspaceFolder: [],
        };
    }
    getConfigurationData() {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbmZpZ3VyYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi90ZXN0L2NvbW1vbi90ZXN0Q29uZmlndXJhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRWhGLE9BQU8sRUFDTixxQkFBcUIsRUFLckIsd0JBQXdCLEdBQ3hCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsTUFBTSxPQUFPLHdCQUF3QjtJQU9wQyxZQUFZLGFBQW1CO1FBSHRCLG9DQUErQixHQUFHLElBQUksT0FBTyxFQUE2QixDQUFBO1FBQzFFLDZCQUF3QixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLENBQUE7UUFNdEUsd0JBQW1CLEdBQW1DLGlCQUFpQixDQUFDLFFBQVEsRUFBTyxDQUFBO1FBeUN2Rix3QkFBbUIsR0FBMEIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQTVDN0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBSU0sbUJBQW1CO1FBQ3pCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRU0sUUFBUSxDQUFDLElBQVUsRUFBRSxJQUFVO1FBQ3JDLElBQUksYUFBYSxDQUFBO1FBQ2pC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