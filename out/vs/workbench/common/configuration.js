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
import { localize } from '../../nls.js';
import { Extensions as ConfigurationExtensions, } from '../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { IWorkspaceContextService, } from '../../platform/workspace/common/workspace.js';
import { IConfigurationService, } from '../../platform/configuration/common/configuration.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { Emitter } from '../../base/common/event.js';
import { IRemoteAgentService } from '../services/remote/common/remoteAgentService.js';
import { isWindows } from '../../base/common/platform.js';
import { equals } from '../../base/common/objects.js';
import { DeferredPromise } from '../../base/common/async.js';
import { IUserDataProfilesService, } from '../../platform/userDataProfile/common/userDataProfile.js';
export const applicationConfigurationNodeBase = Object.freeze({
    id: 'application',
    order: 100,
    title: localize('applicationConfigurationTitle', 'Application'),
    type: 'object',
});
export const workbenchConfigurationNodeBase = Object.freeze({
    id: 'workbench',
    order: 7,
    title: localize('workbenchConfigurationTitle', 'Workbench'),
    type: 'object',
});
export const securityConfigurationNodeBase = Object.freeze({
    id: 'security',
    scope: 1 /* ConfigurationScope.APPLICATION */,
    title: localize('securityConfigurationTitle', 'Security'),
    type: 'object',
    order: 7,
});
export const problemsConfigurationNodeBase = Object.freeze({
    id: 'problems',
    title: localize('problemsConfigurationTitle', 'Problems'),
    type: 'object',
    order: 101,
});
export const windowConfigurationNodeBase = Object.freeze({
    id: 'window',
    order: 8,
    title: localize('windowConfigurationTitle', 'Window'),
    type: 'object',
});
export const Extensions = {
    ConfigurationMigration: 'base.contributions.configuration.migration',
};
class ConfigurationMigrationRegistry {
    constructor() {
        this.migrations = [];
        this._onDidRegisterConfigurationMigrations = new Emitter();
        this.onDidRegisterConfigurationMigration = this._onDidRegisterConfigurationMigrations.event;
    }
    registerConfigurationMigrations(configurationMigrations) {
        this.migrations.push(...configurationMigrations);
    }
}
const configurationMigrationRegistry = new ConfigurationMigrationRegistry();
Registry.add(Extensions.ConfigurationMigration, configurationMigrationRegistry);
let ConfigurationMigrationWorkbenchContribution = class ConfigurationMigrationWorkbenchContribution extends Disposable {
    static { this.ID = 'workbench.contrib.configurationMigration'; }
    constructor(configurationService, workspaceService) {
        super();
        this.configurationService = configurationService;
        this.workspaceService = workspaceService;
        this._register(this.workspaceService.onDidChangeWorkspaceFolders(async (e) => {
            for (const folder of e.added) {
                await this.migrateConfigurationsForFolder(folder, configurationMigrationRegistry.migrations);
            }
        }));
        this.migrateConfigurations(configurationMigrationRegistry.migrations);
        this._register(configurationMigrationRegistry.onDidRegisterConfigurationMigration((migration) => this.migrateConfigurations(migration)));
    }
    async migrateConfigurations(migrations) {
        await this.migrateConfigurationsForFolder(undefined, migrations);
        for (const folder of this.workspaceService.getWorkspace().folders) {
            await this.migrateConfigurationsForFolder(folder, migrations);
        }
    }
    async migrateConfigurationsForFolder(folder, migrations) {
        await Promise.all([
            migrations.map((migration) => this.migrateConfigurationsForFolderAndOverride(migration, folder?.uri)),
        ]);
    }
    async migrateConfigurationsForFolderAndOverride(migration, resource) {
        const inspectData = this.configurationService.inspect(migration.key, { resource });
        const targetPairs = this.workspaceService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */
            ? [
                ['user', 2 /* ConfigurationTarget.USER */],
                ['userLocal', 3 /* ConfigurationTarget.USER_LOCAL */],
                ['userRemote', 4 /* ConfigurationTarget.USER_REMOTE */],
                ['workspace', 5 /* ConfigurationTarget.WORKSPACE */],
                ['workspaceFolder', 6 /* ConfigurationTarget.WORKSPACE_FOLDER */],
            ]
            : [
                ['user', 2 /* ConfigurationTarget.USER */],
                ['userLocal', 3 /* ConfigurationTarget.USER_LOCAL */],
                ['userRemote', 4 /* ConfigurationTarget.USER_REMOTE */],
                ['workspace', 5 /* ConfigurationTarget.WORKSPACE */],
            ];
        for (const [dataKey, target] of targetPairs) {
            const inspectValue = inspectData[dataKey];
            if (!inspectValue) {
                continue;
            }
            const migrationValues = [];
            if (inspectValue.value !== undefined) {
                const keyValuePairs = await this.runMigration(migration, dataKey, inspectValue.value, resource, undefined);
                for (const keyValuePair of keyValuePairs ?? []) {
                    migrationValues.push([keyValuePair, []]);
                }
            }
            for (const { identifiers, value } of inspectValue.overrides ?? []) {
                if (value !== undefined) {
                    const keyValuePairs = await this.runMigration(migration, dataKey, value, resource, identifiers);
                    for (const keyValuePair of keyValuePairs ?? []) {
                        migrationValues.push([keyValuePair, identifiers]);
                    }
                }
            }
            if (migrationValues.length) {
                // apply migrations
                await Promise.allSettled(migrationValues.map(async ([[key, value], overrideIdentifiers]) => this.configurationService.updateValue(key, value.value, { resource, overrideIdentifiers }, target)));
            }
        }
    }
    async runMigration(migration, dataKey, value, resource, overrideIdentifiers) {
        const valueAccessor = (key) => {
            const inspectData = this.configurationService.inspect(key, { resource });
            const inspectValue = inspectData[dataKey];
            if (!inspectValue) {
                return undefined;
            }
            if (!overrideIdentifiers) {
                return inspectValue.value;
            }
            return inspectValue.overrides?.find(({ identifiers }) => equals(identifiers, overrideIdentifiers))?.value;
        };
        const result = await migration.migrateFn(value, valueAccessor);
        return Array.isArray(result) ? result : [[migration.key, result]];
    }
};
ConfigurationMigrationWorkbenchContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkspaceContextService)
], ConfigurationMigrationWorkbenchContribution);
export { ConfigurationMigrationWorkbenchContribution };
let DynamicWorkbenchSecurityConfiguration = class DynamicWorkbenchSecurityConfiguration extends Disposable {
    static { this.ID = 'workbench.contrib.dynamicWorkbenchSecurityConfiguration'; }
    constructor(remoteAgentService) {
        super();
        this.remoteAgentService = remoteAgentService;
        this._ready = new DeferredPromise();
        this.ready = this._ready.p;
        this.create();
    }
    async create() {
        try {
            await this.doCreate();
        }
        finally {
            this._ready.complete();
        }
    }
    async doCreate() {
        if (!isWindows) {
            const remoteEnvironment = await this.remoteAgentService.getEnvironment();
            if (remoteEnvironment?.os !== 1 /* OperatingSystem.Windows */) {
                return;
            }
        }
        // Windows: UNC allow list security configuration
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        registry.registerConfiguration({
            ...securityConfigurationNodeBase,
            properties: {
                'security.allowedUNCHosts': {
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: '^[^\\\\]+$',
                        patternErrorMessage: localize('security.allowedUNCHosts.patternErrorMessage', 'UNC host names must not contain backslashes.'),
                    },
                    default: [],
                    markdownDescription: localize('security.allowedUNCHosts', 'A set of UNC host names (without leading or trailing backslash, for example `192.168.0.1` or `my-server`) to allow without user confirmation. If a UNC host is being accessed that is not allowed via this setting or has not been acknowledged via user confirmation, an error will occur and the operation stopped. A restart is required when changing this setting. Find out more about this setting at https://aka.ms/vscode-windows-unc.'),
                    scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
                },
                'security.restrictUNCAccess': {
                    type: 'boolean',
                    default: true,
                    markdownDescription: localize('security.restrictUNCAccess', 'If enabled, only allows access to UNC host names that are allowed by the `#security.allowedUNCHosts#` setting or after user confirmation. Find out more about this setting at https://aka.ms/vscode-windows-unc.'),
                    scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
                },
            },
        });
    }
};
DynamicWorkbenchSecurityConfiguration = __decorate([
    __param(0, IRemoteAgentService)
], DynamicWorkbenchSecurityConfiguration);
export { DynamicWorkbenchSecurityConfiguration };
export const CONFIG_NEW_WINDOW_PROFILE = 'window.newWindowProfile';
let DynamicWindowConfiguration = class DynamicWindowConfiguration extends Disposable {
    static { this.ID = 'workbench.contrib.dynamicWindowConfiguration'; }
    constructor(userDataProfilesService, configurationService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.configurationService = configurationService;
        this.registerNewWindowProfileConfiguration();
        this._register(this.userDataProfilesService.onDidChangeProfiles((e) => this.registerNewWindowProfileConfiguration()));
        this.setNewWindowProfile();
        this.checkAndResetNewWindowProfileConfig();
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.source !== 7 /* ConfigurationTarget.DEFAULT */ &&
                e.affectsConfiguration(CONFIG_NEW_WINDOW_PROFILE)) {
                this.setNewWindowProfile();
            }
        }));
        this._register(this.userDataProfilesService.onDidChangeProfiles(() => this.checkAndResetNewWindowProfileConfig()));
    }
    registerNewWindowProfileConfiguration() {
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        const configurationNode = {
            ...windowConfigurationNodeBase,
            properties: {
                [CONFIG_NEW_WINDOW_PROFILE]: {
                    type: ['string', 'null'],
                    default: null,
                    enum: [...this.userDataProfilesService.profiles.map((profile) => profile.name), null],
                    enumItemLabels: [
                        ...this.userDataProfilesService.profiles.map((p) => ''),
                        localize('active window', 'Active Window'),
                    ],
                    description: localize('newWindowProfile', 'Specifies the profile to use when opening a new window. If a profile name is provided, the new window will use that profile. If no profile name is provided, the new window will use the profile of the active window or the Default profile if no active window exists.'),
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        };
        if (this.configurationNode) {
            registry.updateConfigurations({ add: [configurationNode], remove: [this.configurationNode] });
        }
        else {
            registry.registerConfiguration(configurationNode);
        }
        this.configurationNode = configurationNode;
    }
    setNewWindowProfile() {
        const newWindowProfileName = this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE);
        this.newWindowProfile = newWindowProfileName
            ? this.userDataProfilesService.profiles.find((profile) => profile.name === newWindowProfileName)
            : undefined;
    }
    checkAndResetNewWindowProfileConfig() {
        const newWindowProfileName = this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE);
        if (!newWindowProfileName) {
            return;
        }
        const profile = this.newWindowProfile
            ? this.userDataProfilesService.profiles.find((profile) => profile.id === this.newWindowProfile.id)
            : undefined;
        if (newWindowProfileName === profile?.name) {
            return;
        }
        this.configurationService.updateValue(CONFIG_NEW_WINDOW_PROFILE, profile?.name);
    }
};
DynamicWindowConfiguration = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IConfigurationService)
], DynamicWindowConfiguration);
export { DynamicWindowConfiguration };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vY29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFJTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXJFLE9BQU8sRUFDTix3QkFBd0IsR0FHeEIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBRU4scUJBQXFCLEdBR3JCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNyRixPQUFPLEVBQW1CLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLDBEQUEwRCxDQUFBO0FBRWpFLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQXFCO0lBQ2pGLEVBQUUsRUFBRSxhQUFhO0lBQ2pCLEtBQUssRUFBRSxHQUFHO0lBQ1YsS0FBSyxFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxhQUFhLENBQUM7SUFDL0QsSUFBSSxFQUFFLFFBQVE7Q0FDZCxDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFxQjtJQUMvRSxFQUFFLEVBQUUsV0FBVztJQUNmLEtBQUssRUFBRSxDQUFDO0lBQ1IsS0FBSyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxXQUFXLENBQUM7SUFDM0QsSUFBSSxFQUFFLFFBQVE7Q0FDZCxDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFxQjtJQUM5RSxFQUFFLEVBQUUsVUFBVTtJQUNkLEtBQUssd0NBQWdDO0lBQ3JDLEtBQUssRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQ3pELElBQUksRUFBRSxRQUFRO0lBQ2QsS0FBSyxFQUFFLENBQUM7Q0FDUixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFxQjtJQUM5RSxFQUFFLEVBQUUsVUFBVTtJQUNkLEtBQUssRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQ3pELElBQUksRUFBRSxRQUFRO0lBQ2QsS0FBSyxFQUFFLEdBQUc7Q0FDVixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFxQjtJQUM1RSxFQUFFLEVBQUUsUUFBUTtJQUNaLEtBQUssRUFBRSxDQUFDO0lBQ1IsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxRQUFRLENBQUM7SUFDckQsSUFBSSxFQUFFLFFBQVE7Q0FDZCxDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUc7SUFDekIsc0JBQXNCLEVBQUUsNENBQTRDO0NBQ3BFLENBQUE7QUFpQkQsTUFBTSw4QkFBOEI7SUFBcEM7UUFDVSxlQUFVLEdBQTZCLEVBQUUsQ0FBQTtRQUVqQywwQ0FBcUMsR0FBRyxJQUFJLE9BQU8sRUFBNEIsQ0FBQTtRQUN2Rix3Q0FBbUMsR0FBRyxJQUFJLENBQUMscUNBQXFDLENBQUMsS0FBSyxDQUFBO0lBS2hHLENBQUM7SUFIQSwrQkFBK0IsQ0FBQyx1QkFBaUQ7UUFDaEYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyx1QkFBdUIsQ0FBQyxDQUFBO0lBQ2pELENBQUM7Q0FDRDtBQUVELE1BQU0sOEJBQThCLEdBQUcsSUFBSSw4QkFBOEIsRUFBRSxDQUFBO0FBQzNFLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUFFLDhCQUE4QixDQUFDLENBQUE7QUFFeEUsSUFBTSwyQ0FBMkMsR0FBakQsTUFBTSwyQ0FDWixTQUFRLFVBQVU7YUFHRixPQUFFLEdBQUcsMENBQTBDLEFBQTdDLENBQTZDO0lBRS9ELFlBQ3lDLG9CQUEyQyxFQUN4QyxnQkFBMEM7UUFFckYsS0FBSyxFQUFFLENBQUE7UUFIaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUN4QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTBCO1FBR3JGLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3RCxLQUFLLE1BQU0sTUFBTSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLENBQUMsOEJBQThCLENBQ3hDLE1BQU0sRUFDTiw4QkFBOEIsQ0FBQyxVQUFVLENBQ3pDLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsU0FBUyxDQUNiLDhCQUE4QixDQUFDLG1DQUFtQyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FDaEYsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUNyQyxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHFCQUFxQixDQUFDLFVBQW9DO1FBQ3ZFLE1BQU0sSUFBSSxDQUFDLDhCQUE4QixDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoRSxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuRSxNQUFNLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDOUQsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsOEJBQThCLENBQzNDLE1BQW9DLEVBQ3BDLFVBQW9DO1FBRXBDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FDNUIsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQ3RFO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyx5Q0FBeUMsQ0FDdEQsU0FBaUMsRUFDakMsUUFBYztRQUVkLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFFbEYsTUFBTSxXQUFXLEdBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxxQ0FBNkI7WUFDckUsQ0FBQyxDQUFDO2dCQUNBLENBQUMsTUFBTSxtQ0FBMkI7Z0JBQ2xDLENBQUMsV0FBVyx5Q0FBaUM7Z0JBQzdDLENBQUMsWUFBWSwwQ0FBa0M7Z0JBQy9DLENBQUMsV0FBVyx3Q0FBZ0M7Z0JBQzVDLENBQUMsaUJBQWlCLCtDQUF1QzthQUN6RDtZQUNGLENBQUMsQ0FBQztnQkFDQSxDQUFDLE1BQU0sbUNBQTJCO2dCQUNsQyxDQUFDLFdBQVcseUNBQWlDO2dCQUM3QyxDQUFDLFlBQVksMENBQWtDO2dCQUMvQyxDQUFDLFdBQVcsd0NBQWdDO2FBQzVDLENBQUE7UUFDSixLQUFLLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksV0FBVyxFQUFFLENBQUM7WUFDN0MsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBbUMsQ0FBQTtZQUMzRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxlQUFlLEdBQStDLEVBQUUsQ0FBQTtZQUV0RSxJQUFJLFlBQVksQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FDNUMsU0FBUyxFQUNULE9BQU8sRUFDUCxZQUFZLENBQUMsS0FBSyxFQUNsQixRQUFRLEVBQ1IsU0FBUyxDQUNULENBQUE7Z0JBQ0QsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLElBQUksRUFBRSxFQUFFLENBQUM7b0JBQ2hELGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDekMsQ0FBQztZQUNGLENBQUM7WUFFRCxLQUFLLE1BQU0sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLElBQUksWUFBWSxDQUFDLFNBQVMsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ3pCLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FDNUMsU0FBUyxFQUNULE9BQU8sRUFDUCxLQUFLLEVBQ0wsUUFBUSxFQUNSLFdBQVcsQ0FDWCxDQUFBO29CQUNELEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxJQUFJLEVBQUUsRUFBRSxDQUFDO3dCQUNoRCxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7b0JBQ2xELENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsbUJBQW1CO2dCQUNuQixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQ3ZCLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxFQUFFLENBQ2pFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQ3BDLEdBQUcsRUFDSCxLQUFLLENBQUMsS0FBSyxFQUNYLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixFQUFFLEVBQ2pDLE1BQU0sQ0FDTixDQUNELENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZLENBQ3pCLFNBQWlDLEVBQ2pDLE9BQXVDLEVBQ3ZDLEtBQVUsRUFDVixRQUF5QixFQUN6QixtQkFBeUM7UUFFekMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRTtZQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDeEUsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBbUMsQ0FBQTtZQUMzRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFDRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxZQUFZLENBQUMsS0FBSyxDQUFBO1lBQzFCLENBQUM7WUFDRCxPQUFPLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQ3ZELE1BQU0sQ0FBQyxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FDeEMsRUFBRSxLQUFLLENBQUE7UUFDVCxDQUFDLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzlELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7O0FBOUlXLDJDQUEyQztJQU9yRCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsd0JBQXdCLENBQUE7R0FSZCwyQ0FBMkMsQ0ErSXZEOztBQUVNLElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQ1osU0FBUSxVQUFVO2FBR0YsT0FBRSxHQUFHLHlEQUF5RCxBQUE1RCxDQUE0RDtJQUs5RSxZQUFpQyxrQkFBd0Q7UUFDeEYsS0FBSyxFQUFFLENBQUE7UUFEMEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUh4RSxXQUFNLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQTtRQUM1QyxVQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFLN0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2QsQ0FBQztJQUVPLEtBQUssQ0FBQyxNQUFNO1FBQ25CLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3RCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsUUFBUTtRQUNyQixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUN4RSxJQUFJLGlCQUFpQixFQUFFLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztnQkFDdkQsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsaURBQWlEO1FBQ2pELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQzNGLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQztZQUM5QixHQUFHLDZCQUE2QjtZQUNoQyxVQUFVLEVBQUU7Z0JBQ1gsMEJBQTBCLEVBQUU7b0JBQzNCLElBQUksRUFBRSxPQUFPO29CQUNiLEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsUUFBUTt3QkFDZCxPQUFPLEVBQUUsWUFBWTt3QkFDckIsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qiw4Q0FBOEMsRUFDOUMsOENBQThDLENBQzlDO3FCQUNEO29CQUNELE9BQU8sRUFBRSxFQUFFO29CQUNYLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsMEJBQTBCLEVBQzFCLGdiQUFnYixDQUNoYjtvQkFDRCxLQUFLLGdEQUF3QztpQkFDN0M7Z0JBQ0QsNEJBQTRCLEVBQUU7b0JBQzdCLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxJQUFJO29CQUNiLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsNEJBQTRCLEVBQzVCLGtOQUFrTixDQUNsTjtvQkFDRCxLQUFLLGdEQUF3QztpQkFDN0M7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7O0FBaEVXLHFDQUFxQztJQVNwQyxXQUFBLG1CQUFtQixDQUFBO0dBVHBCLHFDQUFxQyxDQWlFakQ7O0FBRUQsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcseUJBQXlCLENBQUE7QUFFM0QsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO2FBQ3pDLE9BQUUsR0FBRyw4Q0FBOEMsQUFBakQsQ0FBaUQ7SUFLbkUsWUFDNEMsdUJBQWlELEVBQ3BELG9CQUEyQztRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQUhvQyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ3BELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFHbkYsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLENBQUE7UUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsdUJBQXVCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUN0RCxJQUFJLENBQUMscUNBQXFDLEVBQUUsQ0FDNUMsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLENBQUE7UUFFMUMsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ25ELElBQ0MsQ0FBQyxDQUFDLE1BQU0sd0NBQWdDO2dCQUN4QyxDQUFDLENBQUMsb0JBQW9CLENBQUMseUJBQXlCLENBQUMsRUFDaEQsQ0FBQztnQkFDRixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUNyRCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsQ0FDMUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLHFDQUFxQztRQUM1QyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMzRixNQUFNLGlCQUFpQixHQUF1QjtZQUM3QyxHQUFHLDJCQUEyQjtZQUM5QixVQUFVLEVBQUU7Z0JBQ1gsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFO29CQUM1QixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO29CQUN4QixPQUFPLEVBQUUsSUFBSTtvQkFDYixJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDO29CQUNyRixjQUFjLEVBQUU7d0JBQ2YsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO3dCQUN2RCxRQUFRLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQztxQkFDMUM7b0JBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsa0JBQWtCLEVBQ2xCLDBRQUEwUSxDQUMxUTtvQkFDRCxLQUFLLHdDQUFnQztpQkFDckM7YUFDRDtTQUNELENBQUE7UUFDRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVCLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlGLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUNELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQTtJQUMzQyxDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQzFGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxvQkFBb0I7WUFDM0MsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUMxQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxvQkFBb0IsQ0FDbEQ7WUFDRixDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2IsQ0FBQztJQUVPLG1DQUFtQztRQUMxQyxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUMxRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMzQixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0I7WUFDcEMsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUMxQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsZ0JBQWlCLENBQUMsRUFBRSxDQUNyRDtZQUNGLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDWixJQUFJLG9CQUFvQixLQUFLLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUM1QyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2hGLENBQUM7O0FBMUZXLDBCQUEwQjtJQU9wQyxXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEscUJBQXFCLENBQUE7R0FSWCwwQkFBMEIsQ0EyRnRDIn0=