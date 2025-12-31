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
import { URI } from '../../../base/common/uri.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, getScopes, } from '../../../platform/configuration/common/configurationRegistry.js';
import { IWorkspaceContextService, } from '../../../platform/workspace/common/workspace.js';
import { MainContext, ExtHostContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IConfigurationService, } from '../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
let MainThreadConfiguration = class MainThreadConfiguration {
    constructor(extHostContext, _workspaceContextService, configurationService, _environmentService) {
        this._workspaceContextService = _workspaceContextService;
        this.configurationService = configurationService;
        this._environmentService = _environmentService;
        const proxy = extHostContext.getProxy(ExtHostContext.ExtHostConfiguration);
        proxy.$initializeConfiguration(this._getConfigurationData());
        this._configurationListener = configurationService.onDidChangeConfiguration((e) => {
            proxy.$acceptConfigurationChanged(this._getConfigurationData(), e.change);
        });
    }
    _getConfigurationData() {
        const configurationData = {
            ...this.configurationService.getConfigurationData(),
            configurationScopes: [],
        };
        // Send configurations scopes only in development mode.
        if (!this._environmentService.isBuilt || this._environmentService.isExtensionDevelopment) {
            configurationData.configurationScopes = getScopes();
        }
        return configurationData;
    }
    dispose() {
        this._configurationListener.dispose();
    }
    $updateConfigurationOption(target, key, value, overrides, scopeToLanguage) {
        overrides = {
            resource: overrides?.resource ? URI.revive(overrides.resource) : undefined,
            overrideIdentifier: overrides?.overrideIdentifier,
        };
        return this.writeConfiguration(target, key, value, overrides, scopeToLanguage);
    }
    $removeConfigurationOption(target, key, overrides, scopeToLanguage) {
        overrides = {
            resource: overrides?.resource ? URI.revive(overrides.resource) : undefined,
            overrideIdentifier: overrides?.overrideIdentifier,
        };
        return this.writeConfiguration(target, key, undefined, overrides, scopeToLanguage);
    }
    writeConfiguration(target, key, value, overrides, scopeToLanguage) {
        target =
            target !== null && target !== undefined
                ? target
                : this.deriveConfigurationTarget(key, overrides);
        const configurationValue = this.configurationService.inspect(key, overrides);
        switch (target) {
            case 8 /* ConfigurationTarget.MEMORY */:
                return this._updateValue(key, value, target, configurationValue?.memory?.override, overrides, scopeToLanguage);
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                return this._updateValue(key, value, target, configurationValue?.workspaceFolder?.override, overrides, scopeToLanguage);
            case 5 /* ConfigurationTarget.WORKSPACE */:
                return this._updateValue(key, value, target, configurationValue?.workspace?.override, overrides, scopeToLanguage);
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                return this._updateValue(key, value, target, configurationValue?.userRemote?.override, overrides, scopeToLanguage);
            default:
                return this._updateValue(key, value, target, configurationValue?.userLocal?.override, overrides, scopeToLanguage);
        }
    }
    _updateValue(key, value, configurationTarget, overriddenValue, overrides, scopeToLanguage) {
        overrides =
            scopeToLanguage === true
                ? overrides
                : scopeToLanguage === false
                    ? { resource: overrides.resource }
                    : overrides.overrideIdentifier && overriddenValue !== undefined
                        ? overrides
                        : { resource: overrides.resource };
        return this.configurationService.updateValue(key, value, overrides, configurationTarget, {
            donotNotifyError: true,
        });
    }
    deriveConfigurationTarget(key, overrides) {
        if (overrides.resource &&
            this._workspaceContextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            const configurationProperties = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
            if (configurationProperties[key] &&
                (configurationProperties[key].scope === 5 /* ConfigurationScope.RESOURCE */ ||
                    configurationProperties[key].scope === 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */)) {
                return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
        }
        return 5 /* ConfigurationTarget.WORKSPACE */;
    }
};
MainThreadConfiguration = __decorate([
    extHostNamedCustomer(MainContext.MainThreadConfiguration),
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IEnvironmentService)
], MainThreadConfiguration);
export { MainThreadConfiguration };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRWpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixFQUVyQyxTQUFTLEdBQ1QsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUVOLFdBQVcsRUFDWCxjQUFjLEdBRWQsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLHFCQUFxQixHQUVyQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBR2xGLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBR25DLFlBQ0MsY0FBK0IsRUFDWSx3QkFBa0QsRUFDckQsb0JBQTJDLEVBQzdDLG1CQUF3QztRQUZuQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ3JELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDN0Msd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUU5RSxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRTFFLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENB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