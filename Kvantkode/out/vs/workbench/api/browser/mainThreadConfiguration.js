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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEVBRXJDLFNBQVMsR0FDVCxNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBRU4sV0FBVyxFQUNYLGNBQWMsR0FFZCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4scUJBQXFCLEdBRXJCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFHbEYsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFHbkMsWUFDQyxjQUErQixFQUNZLHdCQUFrRCxFQUNyRCxvQkFBMkMsRUFDN0MsbUJBQXdDO1FBRm5DLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFDckQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM3Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBRTlFLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFMUUsS0FBSyxD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