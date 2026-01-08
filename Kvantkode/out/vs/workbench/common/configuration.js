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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxFQUlOLFVBQVUsSUFBSSx1QkFBdUIsR0FDckMsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFckUsT0FBTyxFQUNOLHdCQUF3QixHQUd4QixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFFTixxQkFBcUIsR0FHckIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3JGLE9BQU8sRUFBbUIsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFMUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0sMERBQTBELENBQUE7QUFFakUsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBcUI7SUFDakYsRUFBRSxFQUFFLGFBQWE7SUFDakIsS0FBSyxFQUFFLEdBQUc7SUFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLGFBQWEsQ0FBQztJQUMvRCxJQUFJLEVBQUUs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