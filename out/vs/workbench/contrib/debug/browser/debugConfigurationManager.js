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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb25maWd1cmF0aW9uTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0NvbmZpZ3VyYXRpb25NYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxlQUFlLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixVQUFV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