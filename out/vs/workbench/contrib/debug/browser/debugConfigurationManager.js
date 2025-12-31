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
import { distinct } from '../../../../base/common/arrays.js';
import { sequence } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import * as json from '../../../../base/common/json.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import * as resources from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI as uri } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Extensions as JSONExtensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { ACTIVE_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { CONTEXT_DEBUG_CONFIGURATION_TYPE, DebugConfigurationProviderTriggerKind, } from '../common/debug.js';
import { launchSchema } from '../common/debugSchemas.js';
import { getVisibleAndSorted } from '../common/debugUtils.js';
import { debugConfigure } from './debugIcons.js';
const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
jsonRegistry.registerSchema(launchSchemaId, launchSchema);
const DEBUG_SELECTED_CONFIG_NAME_KEY = 'debug.selectedconfigname';
const DEBUG_SELECTED_ROOT = 'debug.selectedroot';
// Debug type is only stored if a dynamic configuration is used for better restore
const DEBUG_SELECTED_TYPE = 'debug.selectedtype';
const DEBUG_RECENT_DYNAMIC_CONFIGURATIONS = 'debug.recentdynamicconfigurations';
const ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME = 'onDebugDynamicConfigurations';
let ConfigurationManager = class ConfigurationManager {
    constructor(adapterManager, contextService, configurationService, quickInputService, instantiationService, storageService, extensionService, historyService, uriIdentityService, contextKeyService, logService) {
        this.adapterManager = adapterManager;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.historyService = historyService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.getSelectedConfig = () => Promise.resolve(undefined);
        this.selectedDynamic = false;
        this._onDidSelectConfigurationName = new Emitter();
        this._onDidChangeConfigurationProviders = new Emitter();
        this.onDidChangeConfigurationProviders = this._onDidChangeConfigurationProviders.event;
        this.configProviders = [];
        this.toDispose = [this._onDidChangeConfigurationProviders];
        this.initLaunches();
        this.setCompoundSchemaValues();
        this.registerListeners();
        const previousSelectedRoot = this.storageService.get(DEBUG_SELECTED_ROOT, 1 /* StorageScope.WORKSPACE */);
        const previousSelectedType = this.storageService.get(DEBUG_SELECTED_TYPE, 1 /* StorageScope.WORKSPACE */);
        const previousSelectedLaunch = this.launches.find((l) => l.uri.toString() === previousSelectedRoot);
        const previousSelectedName = this.storageService.get(DEBUG_SELECTED_CONFIG_NAME_KEY, 1 /* StorageScope.WORKSPACE */);
        this.debugConfigurationTypeContext = CONTEXT_DEBUG_CONFIGURATION_TYPE.bindTo(contextKeyService);
        const dynamicConfig = previousSelectedType ? { type: previousSelectedType } : undefined;
        if (previousSelectedLaunch && previousSelectedLaunch.getConfigurationNames().length) {
            this.selectConfiguration(previousSelectedLaunch, previousSelectedName, undefined, dynamicConfig);
        }
        else if (this.launches.length > 0) {
            this.selectConfiguration(undefined, previousSelectedName, undefined, dynamicConfig);
        }
    }
    registerDebugConfigurationProvider(debugConfigurationProvider) {
        this.configProviders.push(debugConfigurationProvider);
        this._onDidChangeConfigurationProviders.fire();
        return {
            dispose: () => {
                this.unregisterDebugConfigurationProvider(debugConfigurationProvider);
                this._onDidChangeConfigurationProviders.fire();
            },
        };
    }
    unregisterDebugConfigurationProvider(debugConfigurationProvider) {
        const ix = this.configProviders.indexOf(debugConfigurationProvider);
        if (ix >= 0) {
            this.configProviders.splice(ix, 1);
        }
    }
    /**
     * if scope is not specified,a value of DebugConfigurationProvideTrigger.Initial is assumed.
     */
    hasDebugConfigurationProvider(debugType, triggerKind) {
        if (triggerKind === undefined) {
            triggerKind = DebugConfigurationProviderTriggerKind.Initial;
        }
        // check if there are providers for the given type that contribute a provideDebugConfigurations method
        const provider = this.configProviders.find((p) => p.provideDebugConfigurations && p.type === debugType && p.triggerKind === triggerKind);
        return !!provider;
    }
    async resolveConfigurationByProviders(folderUri, type, config, token) {
        const resolveDebugConfigurationForType = async (type, config) => {
            if (type !== '*') {
                await this.adapterManager.activateDebuggers('onDebugResolve', type);
            }
            for (const p of this.configProviders) {
                if (p.type === type && p.resolveDebugConfiguration && config) {
                    config = await p.resolveDebugConfiguration(folderUri, config, token);
                }
            }
            return config;
        };
        let resolvedType = config.type ?? type;
        let result = config;
        for (let seen = new Set(); result && !seen.has(resolvedType);) {
            seen.add(resolvedType);
            result = await resolveDebugConfigurationForType(resolvedType, result);
            result = await resolveDebugConfigurationForType('*', result);
            resolvedType = result?.type ?? type;
        }
        return result;
    }
    async resolveDebugConfigurationWithSubstitutedVariables(folderUri, type, config, token) {
        // pipe the config through the promises sequentially. Append at the end the '*' types
        const providers = this.configProviders
            .filter((p) => p.type === type && p.resolveDebugConfigurationWithSubstitutedVariables)
            .concat(this.configProviders.filter((p) => p.type === '*' && p.resolveDebugConfigurationWithSubstitutedVariables));
        let result = config;
        await sequence(providers.map((provider) => async () => {
            // If any provider returned undefined or null make sure to respect that and do not pass the result to more resolver
            if (result) {
                result = await provider.resolveDebugConfigurationWithSubstitutedVariables(folderUri, result, token);
            }
        }));
        return result;
    }
    async provideDebugConfigurations(folderUri, type, token) {
        await this.adapterManager.activateDebuggers('onDebugInitialConfigurations');
        const results = await Promise.all(this.configProviders
            .filter((p) => p.type === type &&
            p.triggerKind === DebugConfigurationProviderTriggerKind.Initial &&
            p.provideDebugConfigurations)
            .map((p) => p.provideDebugConfigurations(folderUri, token)));
        return results.reduce((first, second) => first.concat(second), []);
    }
    async getDynamicProviders() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const debugDynamicExtensionsTypes = this.extensionService.extensions.reduce((acc, e) => {
            if (!e.activationEvents) {
                return acc;
            }
            const explicitTypes = [];
            let hasGenericEvent = false;
            for (const event of e.activationEvents) {
                if (event === ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME) {
                    hasGenericEvent = true;
                }
                else if (event.startsWith(`${ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME}:`)) {
                    explicitTypes.push(event.slice(ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME.length + 1));
                }
            }
            if (explicitTypes.length) {
                explicitTypes.forEach((t) => acc.add(t));
            }
            else if (hasGenericEvent) {
                const debuggerType = e.contributes?.debuggers?.[0].type;
                if (debuggerType) {
                    acc.add(debuggerType);
                }
            }
            return acc;
        }, new Set());
        for (const configProvider of this.configProviders) {
            if (configProvider.triggerKind === DebugConfigurationProviderTriggerKind.Dynamic) {
                debugDynamicExtensionsTypes.add(configProvider.type);
            }
        }
        return [...debugDynamicExtensionsTypes].map((type) => {
            return {
                label: this.adapterManager.getDebuggerLabel(type),
                getProvider: async () => {
                    await this.adapterManager.activateDebuggers(ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME, type);
                    return this.configProviders.find((p) => p.type === type &&
                        p.triggerKind === DebugConfigurationProviderTriggerKind.Dynamic &&
                        p.provideDebugConfigurations);
                },
                type,
                pick: async () => {
                    // Do a late 'onDebugDynamicConfigurationsName' activation so extensions are not activated too early #108578
                    await this.adapterManager.activateDebuggers(ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME, type);
                    const disposables = new DisposableStore();
                    const token = new CancellationTokenSource();
                    disposables.add(token);
                    const input = disposables.add(this.quickInputService.createQuickPick());
                    input.busy = true;
                    input.placeholder = nls.localize('selectConfiguration', 'Select Launch Configuration');
                    const chosenPromise = new Promise((resolve) => {
                        disposables.add(input.onDidAccept(() => resolve(input.activeItems[0])));
                        disposables.add(input.onDidTriggerItemButton(async (context) => {
                            resolve(undefined);
                            const { launch, config } = context.item;
                            await launch.openConfigFile({
                                preserveFocus: false,
                                type: config.type,
                                suppressInitialConfigs: true,
                            });
                            // Only Launch have a pin trigger button
                            await launch.writeConfiguration(config);
                            await this.selectConfiguration(launch, config.name);
                            this.removeRecentDynamicConfigurations(config.name, config.type);
                        }));
                        disposables.add(input.onDidHide(() => resolve(undefined)));
                    }).finally(() => token.cancel());
                    let items;
                    try {
                        // This await invokes the extension providers, which might fail due to several reasons,
                        // therefore we gate this logic under a try/catch to prevent leaving the Debug Tab
                        // selector in a borked state.
                        items = await this.getDynamicConfigurationsByType(type, token.token);
                    }
                    catch (err) {
                        this.logService.error(err);
                        disposables.dispose();
                        return;
                    }
                    input.items = items;
                    input.busy = false;
                    input.show();
                    const chosen = await chosenPromise;
                    disposables.dispose();
                    return chosen;
                },
            };
        });
    }
    async getDynamicConfigurationsByType(type, token = CancellationToken.None) {
        // Do a late 'onDebugDynamicConfigurationsName' activation so extensions are not activated too early #108578
        await this.adapterManager.activateDebuggers(ON_DEBUG_DYNAMIC_CONFIGURATIONS_NAME, type);
        const picks = [];
        const provider = this.configProviders.find((p) => p.type === type &&
            p.triggerKind === DebugConfigurationProviderTriggerKind.Dynamic &&
            p.provideDebugConfigurations);
        this.getLaunches().forEach((launch) => {
            if (provider) {
                picks.push(provider.provideDebugConfigurations(launch.workspace?.uri, token).then((configurations) => configurations.map((config) => ({
                    label: config.name,
                    description: launch.name,
                    config,
                    buttons: [
                        {
                            iconClass: ThemeIcon.asClassName(debugConfigure),
                            tooltip: nls.localize('editLaunchConfig', 'Edit Debug Configuration in launch.json'),
                        },
                    ],
                    launch,
                }))));
            }
        });
        return (await Promise.all(picks)).flat();
    }
    getAllConfigurations() {
        const all = [];
        for (const l of this.launches) {
            for (const name of l.getConfigurationNames()) {
                const config = l.getConfiguration(name) || l.getCompound(name);
                if (config) {
                    all.push({ launch: l, name, presentation: config.presentation });
                }
            }
        }
        return getVisibleAndSorted(all);
    }
    removeRecentDynamicConfigurations(name, type) {
        const remaining = this.getRecentDynamicConfigurations().filter((c) => c.name !== name || c.type !== type);
        this.storageService.store(DEBUG_RECENT_DYNAMIC_CONFIGURATIONS, JSON.stringify(remaining), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (this.selectedConfiguration.name === name &&
            this.selectedType === type &&
            this.selectedDynamic) {
            this.selectConfiguration(undefined, undefined);
        }
        else {
            this._onDidSelectConfigurationName.fire();
        }
    }
    getRecentDynamicConfigurations() {
        return JSON.parse(this.storageService.get(DEBUG_RECENT_DYNAMIC_CONFIGURATIONS, 1 /* StorageScope.WORKSPACE */, '[]'));
    }
    registerListeners() {
        this.toDispose.push(Event.any(this.contextService.onDidChangeWorkspaceFolders, this.contextService.onDidChangeWorkbenchState)(() => {
            this.initLaunches();
            this.selectConfiguration(undefined);
            this.setCompoundSchemaValues();
        }));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('launch')) {
                // A change happen in the launch.json. If there is already a launch configuration selected, do not change the selection.
                await this.selectConfiguration(undefined);
                this.setCompoundSchemaValues();
            }
        }));
        this.toDispose.push(this.adapterManager.onDidDebuggersExtPointRead(() => {
            this.setCompoundSchemaValues();
        }));
    }
    initLaunches() {
        this.launches = this.contextService
            .getWorkspace()
            .folders.map((folder) => this.instantiationService.createInstance(Launch, this, this.adapterManager, folder));
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            this.launches.push(this.instantiationService.createInstance(WorkspaceLaunch, this, this.adapterManager));
        }
        this.launches.push(this.instantiationService.createInstance(UserLaunch, this, this.adapterManager));
        if (this.selectedLaunch && this.launches.indexOf(this.selectedLaunch) === -1) {
            this.selectConfiguration(undefined);
        }
    }
    setCompoundSchemaValues() {
        const compoundConfigurationsSchema = launchSchema.properties['compounds'].items
            .properties['configurations'];
        const launchNames = this.launches
            .map((l) => l.getConfigurationNames(true))
            .reduce((first, second) => first.concat(second), []);
        compoundConfigurationsSchema.items.oneOf[0].enum = launchNames;
        compoundConfigurationsSchema.items.oneOf[1].properties.name.enum = launchNames;
        const folderNames = this.contextService.getWorkspace().folders.map((f) => f.name);
        compoundConfigurationsSchema.items.oneOf[1].properties.folder.enum =
            folderNames;
        jsonRegistry.registerSchema(launchSchemaId, launchSchema);
    }
    getLaunches() {
        return this.launches;
    }
    getLaunch(workspaceUri) {
        if (!uri.isUri(workspaceUri)) {
            return undefined;
        }
        return this.launches.find((l) => l.workspace && this.uriIdentityService.extUri.isEqual(l.workspace.uri, workspaceUri));
    }
    get selectedConfiguration() {
        return {
            launch: this.selectedLaunch,
            name: this.selectedName,
            getConfig: this.getSelectedConfig,
            type: this.selectedType,
        };
    }
    get onDidSelectConfiguration() {
        return this._onDidSelectConfigurationName.event;
    }
    getWorkspaceLaunch() {
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            return this.launches[this.launches.length - 1];
        }
        return undefined;
    }
    async selectConfiguration(launch, name, config, dynamicConfig) {
        if (typeof launch === 'undefined') {
            const rootUri = this.historyService.getLastActiveWorkspaceRoot();
            launch = this.getLaunch(rootUri);
            if (!launch || launch.getConfigurationNames().length === 0) {
                launch =
                    this.launches.find((l) => !!(l && l.getConfigurationNames().length)) ||
                        launch ||
                        this.launches[0];
            }
        }
        const previousLaunch = this.selectedLaunch;
        const previousName = this.selectedName;
        const previousSelectedDynamic = this.selectedDynamic;
        this.selectedLaunch = launch;
        if (this.selectedLaunch) {
            this.storageService.store(DEBUG_SELECTED_ROOT, this.selectedLaunch.uri.toString(), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_SELECTED_ROOT, 1 /* StorageScope.WORKSPACE */);
        }
        const names = launch ? launch.getConfigurationNames() : [];
        this.getSelectedConfig = () => {
            const selected = this.selectedName ? launch?.getConfiguration(this.selectedName) : undefined;
            return Promise.resolve(selected || config);
        };
        let type = config?.type;
        if (name && names.indexOf(name) >= 0) {
            this.setSelectedLaunchName(name);
        }
        else if (dynamicConfig && dynamicConfig.type) {
            // We could not find the previously used name and config is not passed. We should get all dynamic configurations from providers
            // And potentially auto select the previously used dynamic configuration #96293
            type = dynamicConfig.type;
            if (!config) {
                const providers = (await this.getDynamicProviders()).filter((p) => p.type === type);
                this.getSelectedConfig = async () => {
                    const activatedProviders = await Promise.all(providers.map((p) => p.getProvider()));
                    const provider = activatedProviders.length > 0 ? activatedProviders[0] : undefined;
                    if (provider && launch && launch.workspace) {
                        const token = new CancellationTokenSource();
                        const dynamicConfigs = await provider.provideDebugConfigurations(launch.workspace.uri, token.token);
                        const dynamicConfig = dynamicConfigs.find((c) => c.name === name);
                        if (dynamicConfig) {
                            return dynamicConfig;
                        }
                    }
                    return undefined;
                };
            }
            this.setSelectedLaunchName(name);
            let recentDynamicProviders = this.getRecentDynamicConfigurations();
            if (name && dynamicConfig.type) {
                // We need to store the recently used dynamic configurations to be able to show them in UI #110009
                recentDynamicProviders.unshift({ name, type: dynamicConfig.type });
                recentDynamicProviders = distinct(recentDynamicProviders, (t) => `${t.name} : ${t.type}`);
                this.storageService.store(DEBUG_RECENT_DYNAMIC_CONFIGURATIONS, JSON.stringify(recentDynamicProviders), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }
        else if (!this.selectedName || names.indexOf(this.selectedName) === -1) {
            // We could not find the configuration to select, pick the first one, or reset the selection if there is no launch configuration
            const nameToSet = names.length ? names[0] : undefined;
            this.setSelectedLaunchName(nameToSet);
        }
        if (!config && launch && this.selectedName) {
            config = launch.getConfiguration(this.selectedName);
            type = config?.type;
        }
        this.selectedType = dynamicConfig?.type || config?.type;
        this.selectedDynamic = !!dynamicConfig;
        // Only store the selected type if we are having a dynamic configuration. Otherwise restoring this configuration from storage might be misindentified as a dynamic configuration
        this.storageService.store(DEBUG_SELECTED_TYPE, dynamicConfig ? this.selectedType : undefined, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (type) {
            this.debugConfigurationTypeContext.set(type);
        }
        else {
            this.debugConfigurationTypeContext.reset();
        }
        if (this.selectedLaunch !== previousLaunch ||
            this.selectedName !== previousName ||
            previousSelectedDynamic !== this.selectedDynamic) {
            this._onDidSelectConfigurationName.fire();
        }
    }
    setSelectedLaunchName(selectedName) {
        this.selectedName = selectedName;
        if (this.selectedName) {
            this.storageService.store(DEBUG_SELECTED_CONFIG_NAME_KEY, this.selectedName, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(DEBUG_SELECTED_CONFIG_NAME_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
    dispose() {
        this.toDispose = dispose(this.toDispose);
    }
};
ConfigurationManager = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IExtensionService),
    __param(7, IHistoryService),
    __param(8, IUriIdentityService),
    __param(9, IContextKeyService),
    __param(10, ILogService)
], ConfigurationManager);
export { ConfigurationManager };
class AbstractLaunch {
    constructor(configurationManager, adapterManager) {
        this.configurationManager = configurationManager;
        this.adapterManager = adapterManager;
    }
    getCompound(name) {
        const config = this.getDeduplicatedConfig();
        if (!config || !config.compounds) {
            return undefined;
        }
        return config.compounds.find((compound) => compound.name === name);
    }
    getConfigurationNames(ignoreCompoundsAndPresentation = false) {
        const config = this.getDeduplicatedConfig();
        if (!config || (!Array.isArray(config.configurations) && !Array.isArray(config.compounds))) {
            return [];
        }
        else {
            const configurations = [];
            if (config.configurations) {
                configurations.push(...config.configurations.filter((cfg) => cfg && typeof cfg.name === 'string'));
            }
            if (ignoreCompoundsAndPresentation) {
                return configurations.map((c) => c.name);
            }
            if (config.compounds) {
                configurations.push(...config.compounds.filter((compound) => typeof compound.name === 'string' &&
                    compound.configurations &&
                    compound.configurations.length));
            }
            return getVisibleAndSorted(configurations).map((c) => c.name);
        }
    }
    getConfiguration(name) {
        // We need to clone the configuration in order to be able to make changes to it #42198
        const config = this.getDeduplicatedConfig();
        if (!config || !config.configurations) {
            return undefined;
        }
        const configuration = config.configurations.find((config) => config && config.name === name);
        if (!configuration) {
            return;
        }
        if (this instanceof UserLaunch) {
            return { ...configuration, __configurationTarget: 2 /* ConfigurationTarget.USER */ };
        }
        else if (this instanceof WorkspaceLaunch) {
            return { ...configuration, __configurationTarget: 5 /* ConfigurationTarget.WORKSPACE */ };
        }
        else {
            return { ...configuration, __configurationTarget: 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ };
        }
    }
    async getInitialConfigurationContent(folderUri, type, useInitialConfigs, token) {
        let content = '';
        const adapter = type
            ? { debugger: this.adapterManager.getEnabledDebugger(type) }
            : await this.adapterManager.guessDebugger(true);
        if (adapter?.withConfig && adapter.debugger) {
            content = await adapter.debugger.getInitialConfigurationContent([adapter.withConfig.config]);
        }
        else if (adapter?.debugger) {
            const initialConfigs = useInitialConfigs
                ? await this.configurationManager.provideDebugConfigurations(folderUri, adapter.debugger.type, token || CancellationToken.None)
                : [];
            content = await adapter.debugger.getInitialConfigurationContent(initialConfigs);
        }
        return content;
    }
    get hidden() {
        return false;
    }
    getDeduplicatedConfig() {
        const original = this.getConfig();
        return (original && {
            version: original.version,
            compounds: original.compounds && distinguishConfigsByName(original.compounds),
            configurations: original.configurations && distinguishConfigsByName(original.configurations),
        });
    }
}
function distinguishConfigsByName(things) {
    const seen = new Map();
    return things.map((thing) => {
        const no = seen.get(thing.name) || 0;
        seen.set(thing.name, no + 1);
        return no === 0 ? thing : { ...thing, name: `${thing.name} (${no})` };
    });
}
let Launch = class Launch extends AbstractLaunch {
    constructor(configurationManager, adapterManager, workspace, fileService, textFileService, editorService, configurationService) {
        super(configurationManager, adapterManager);
        this.workspace = workspace;
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.configurationService = configurationService;
    }
    get uri() {
        return resources.joinPath(this.workspace.uri, '/.vscode/launch.json');
    }
    get name() {
        return this.workspace.name;
    }
    getConfig() {
        return this.configurationService.inspect('launch', {
            resource: this.workspace.uri,
        }).workspaceFolderValue;
    }
    async openConfigFile({ preserveFocus, type, suppressInitialConfigs, }, token) {
        const resource = this.uri;
        let created = false;
        let content = '';
        try {
            const fileContent = await this.fileService.readFile(resource);
            content = fileContent.value.toString();
        }
        catch {
            // launch.json not found: create one by collecting launch configs from debugConfigProviders
            content = await this.getInitialConfigurationContent(this.workspace.uri, type, !suppressInitialConfigs, token);
            if (!content) {
                // Cancelled
                return { editor: null, created: false };
            }
            created = true; // pin only if config file is created #8727
            try {
                await this.textFileService.write(resource, content);
            }
            catch (error) {
                throw new Error(nls.localize('DebugConfig.failed', "Unable to create 'launch.json' file inside the '.vscode' folder ({0}).", error.message));
            }
        }
        const index = content.indexOf(`"${this.configurationManager.selectedConfiguration.name}"`);
        let startLineNumber = 1;
        for (let i = 0; i < index; i++) {
            if (content.charAt(i) === '\n') {
                startLineNumber++;
            }
        }
        const selection = startLineNumber > 1 ? { startLineNumber, startColumn: 4 } : undefined;
        const editor = await this.editorService.openEditor({
            resource,
            options: {
                selection,
                preserveFocus,
                pinned: created,
                revealIfVisible: true,
            },
        }, ACTIVE_GROUP);
        return {
            editor: editor ?? null,
            created,
        };
    }
    async writeConfiguration(configuration) {
        // note: we don't get the deduplicated config since we don't want that to 'leak' into the file
        const fullConfig = this.getConfig() || {};
        fullConfig.configurations = [...(fullConfig.configurations || []), configuration];
        await this.configurationService.updateValue('launch', fullConfig, { resource: this.workspace.uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
    }
};
Launch = __decorate([
    __param(3, IFileService),
    __param(4, ITextFileService),
    __param(5, IEditorService),
    __param(6, IConfigurationService)
], Launch);
let WorkspaceLaunch = class WorkspaceLaunch extends AbstractLaunch {
    constructor(configurationManager, adapterManager, editorService, configurationService, contextService) {
        super(configurationManager, adapterManager);
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.contextService = contextService;
    }
    get workspace() {
        return undefined;
    }
    get uri() {
        return this.contextService.getWorkspace().configuration;
    }
    get name() {
        return nls.localize('workspace', 'workspace');
    }
    getConfig() {
        return this.configurationService.inspect('launch').workspaceValue;
    }
    async openConfigFile({ preserveFocus, type, useInitialConfigs, }, token) {
        const launchExistInFile = !!this.getConfig();
        if (!launchExistInFile) {
            // Launch property in workspace config not found: create one by collecting launch configs from debugConfigProviders
            const content = await this.getInitialConfigurationContent(undefined, type, useInitialConfigs, token);
            if (content) {
                await this.configurationService.updateValue('launch', json.parse(content), 5 /* ConfigurationTarget.WORKSPACE */);
            }
            else {
                return { editor: null, created: false };
            }
        }
        const editor = await this.editorService.openEditor({
            resource: this.contextService.getWorkspace().configuration,
            options: { preserveFocus },
        }, ACTIVE_GROUP);
        return {
            editor: editor ?? null,
            created: false,
        };
    }
};
WorkspaceLaunch = __decorate([
    __param(2, IEditorService),
    __param(3, IConfigurationService),
    __param(4, IWorkspaceContextService)
], WorkspaceLaunch);
let UserLaunch = class UserLaunch extends AbstractLaunch {
    constructor(configurationManager, adapterManager, configurationService, preferencesService) {
        super(configurationManager, adapterManager);
        this.configurationService = configurationService;
        this.preferencesService = preferencesService;
    }
    get workspace() {
        return undefined;
    }
    get uri() {
        return this.preferencesService.userSettingsResource;
    }
    get name() {
        return nls.localize('user settings', 'user settings');
    }
    get hidden() {
        return true;
    }
    getConfig() {
        return this.configurationService.inspect('launch').userValue;
    }
    async openConfigFile({ preserveFocus, type, useInitialContent, }) {
        const editor = await this.preferencesService.openUserSettings({
            jsonEditor: true,
            preserveFocus,
            revealSetting: { key: 'launch' },
        });
        return {
            editor: editor ?? null,
            created: false,
        };
    }
};
UserLaunch = __decorate([
    __param(2, IConfigurationService),
    __param(3, IPreferencesService)
], UserLaunch);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb25maWd1cmF0aW9uTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdDb25maWd1cmF0aW9uTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sVUFBVSxJQUFJ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