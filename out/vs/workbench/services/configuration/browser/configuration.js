/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event, Emitter } from '../../../../base/common/event.js';
import * as errors from '../../../../base/common/errors.js';
import { Disposable, dispose, toDisposable, MutableDisposable, combinedDisposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { whenProviderRegistered, } from '../../../../platform/files/common/files.js';
import { ConfigurationModel, ConfigurationModelParser, UserSettings, } from '../../../../platform/configuration/common/configurationModels.js';
import { WorkspaceConfigurationModelParser, StandaloneConfigurationModelParser, } from '../common/configurationModels.js';
import { TASKS_CONFIGURATION_KEY, FOLDER_SETTINGS_NAME, LAUNCH_CONFIGURATION_KEY, REMOTE_MACHINE_SCOPES, FOLDER_SCOPES, WORKSPACE_SCOPES, APPLY_ALL_PROFILES_SETTING, APPLICATION_SCOPES, MCP_CONFIGURATION_KEY, } from '../common/configuration.js';
import { Extensions, OVERRIDE_PROPERTY_REGEX, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { equals } from '../../../../base/common/objects.js';
import { hash } from '../../../../base/common/hash.js';
import { joinPath } from '../../../../base/common/resources.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { isEmptyObject, isObject } from '../../../../base/common/types.js';
import { DefaultConfiguration as BaseDefaultConfiguration } from '../../../../platform/configuration/common/configurations.js';
export class DefaultConfiguration extends BaseDefaultConfiguration {
    static { this.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY = 'DefaultOverridesCacheExists'; }
    constructor(configurationCache, environmentService, logService) {
        super(logService);
        this.configurationCache = configurationCache;
        this.configurationRegistry = Registry.as(Extensions.Configuration);
        this.cachedConfigurationDefaultsOverrides = {};
        this.cacheKey = {
            type: 'defaults',
            key: 'configurationDefaultsOverrides',
        };
        this.updateCache = false;
        if (environmentService.options?.configurationDefaults) {
            this.configurationRegistry.registerDefaultConfigurations([
                { overrides: environmentService.options.configurationDefaults },
            ]);
        }
    }
    getConfigurationDefaultOverrides() {
        return this.cachedConfigurationDefaultsOverrides;
    }
    async initialize() {
        await this.initializeCachedConfigurationDefaultsOverrides();
        return super.initialize();
    }
    reload() {
        this.updateCache = true;
        this.cachedConfigurationDefaultsOverrides = {};
        this.updateCachedConfigurationDefaultsOverrides();
        return super.reload();
    }
    hasCachedConfigurationDefaultsOverrides() {
        return !isEmptyObject(this.cachedConfigurationDefaultsOverrides);
    }
    initializeCachedConfigurationDefaultsOverrides() {
        if (!this.initiaizeCachedConfigurationDefaultsOverridesPromise) {
            this.initiaizeCachedConfigurationDefaultsOverridesPromise = (async () => {
                try {
                    // Read only when the cache exists
                    if (localStorage.getItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY)) {
                        const content = await this.configurationCache.read(this.cacheKey);
                        if (content) {
                            this.cachedConfigurationDefaultsOverrides = JSON.parse(content);
                        }
                    }
                }
                catch (error) {
                    /* ignore */
                }
                this.cachedConfigurationDefaultsOverrides = isObject(this.cachedConfigurationDefaultsOverrides)
                    ? this.cachedConfigurationDefaultsOverrides
                    : {};
            })();
        }
        return this.initiaizeCachedConfigurationDefaultsOverridesPromise;
    }
    onDidUpdateConfiguration(properties, defaultsOverrides) {
        super.onDidUpdateConfiguration(properties, defaultsOverrides);
        if (defaultsOverrides) {
            this.updateCachedConfigurationDefaultsOverrides();
        }
    }
    async updateCachedConfigurationDefaultsOverrides() {
        if (!this.updateCache) {
            return;
        }
        const cachedConfigurationDefaultsOverrides = {};
        const configurationDefaultsOverrides = this.configurationRegistry.getConfigurationDefaultsOverrides();
        for (const [key, value] of configurationDefaultsOverrides) {
            if (!OVERRIDE_PROPERTY_REGEX.test(key) && value.value !== undefined) {
                cachedConfigurationDefaultsOverrides[key] = value.value;
            }
        }
        try {
            if (Object.keys(cachedConfigurationDefaultsOverrides).length) {
                localStorage.setItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY, 'yes');
                await this.configurationCache.write(this.cacheKey, JSON.stringify(cachedConfigurationDefaultsOverrides));
            }
            else {
                localStorage.removeItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY);
                await this.configurationCache.remove(this.cacheKey);
            }
        }
        catch (error) {
            /* Ignore error */
        }
    }
}
export class ApplicationConfiguration extends UserSettings {
    constructor(userDataProfilesService, fileService, uriIdentityService, logService) {
        super(userDataProfilesService.defaultProfile.settingsResource, { scopes: APPLICATION_SCOPES, skipUnregistered: true }, uriIdentityService.extUri, fileService, logService);
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._register(this.onDidChange(() => this.reloadConfigurationScheduler.schedule()));
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.loadConfiguration().then((configurationModel) => this._onDidChangeConfiguration.fire(configurationModel)), 50));
    }
    async initialize() {
        return this.loadConfiguration();
    }
    async loadConfiguration() {
        const model = await super.loadConfiguration();
        const value = model.getValue(APPLY_ALL_PROFILES_SETTING);
        const allProfilesSettings = Array.isArray(value) ? value : [];
        return this.parseOptions.include || allProfilesSettings.length
            ? this.reparse({ ...this.parseOptions, include: allProfilesSettings })
            : model;
    }
}
export class UserConfiguration extends Disposable {
    get hasTasksLoaded() {
        return this.userConfiguration.value instanceof FileServiceBasedConfiguration;
    }
    constructor(settingsResource, tasksResource, configurationParseOptions, fileService, uriIdentityService, logService) {
        super();
        this.settingsResource = settingsResource;
        this.tasksResource = tasksResource;
        this.configurationParseOptions = configurationParseOptions;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this.userConfiguration = this._register(new MutableDisposable());
        this.userConfigurationChangeDisposable = this._register(new MutableDisposable());
        this.userConfiguration.value = new UserSettings(settingsResource, this.configurationParseOptions, uriIdentityService.extUri, this.fileService, logService);
        this.userConfigurationChangeDisposable.value = this.userConfiguration.value.onDidChange(() => this.reloadConfigurationScheduler.schedule());
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.userConfiguration
            .value.loadConfiguration()
            .then((configurationModel) => this._onDidChangeConfiguration.fire(configurationModel)), 50));
    }
    async reset(settingsResource, tasksResource, configurationParseOptions) {
        this.settingsResource = settingsResource;
        this.tasksResource = tasksResource;
        this.configurationParseOptions = configurationParseOptions;
        return this.doReset();
    }
    async doReset(settingsConfiguration) {
        const folder = this.uriIdentityService.extUri.dirname(this.settingsResource);
        const standAloneConfigurationResources = this.tasksResource
            ? [[TASKS_CONFIGURATION_KEY, this.tasksResource]]
            : [];
        const fileServiceBasedConfiguration = new FileServiceBasedConfiguration(folder.toString(), this.settingsResource, standAloneConfigurationResources, this.configurationParseOptions, this.fileService, this.uriIdentityService, this.logService);
        const configurationModel = await fileServiceBasedConfiguration.loadConfiguration(settingsConfiguration);
        this.userConfiguration.value = fileServiceBasedConfiguration;
        // Check for value because userConfiguration might have been disposed.
        if (this.userConfigurationChangeDisposable.value) {
            this.userConfigurationChangeDisposable.value = this.userConfiguration.value.onDidChange(() => this.reloadConfigurationScheduler.schedule());
        }
        return configurationModel;
    }
    async initialize() {
        return this.userConfiguration.value.loadConfiguration();
    }
    async reload(settingsConfiguration) {
        if (this.hasTasksLoaded) {
            return this.userConfiguration.value.loadConfiguration();
        }
        return this.doReset(settingsConfiguration);
    }
    reparse(parseOptions) {
        this.configurationParseOptions = { ...this.configurationParseOptions, ...parseOptions };
        return this.userConfiguration.value.reparse(this.configurationParseOptions);
    }
    getRestrictedSettings() {
        return this.userConfiguration.value.getRestrictedSettings();
    }
}
class FileServiceBasedConfiguration extends Disposable {
    constructor(name, settingsResource, standAloneConfigurationResources, configurationParseOptions, fileService, uriIdentityService, logService) {
        super();
        this.settingsResource = settingsResource;
        this.standAloneConfigurationResources = standAloneConfigurationResources;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.allResources = [
            this.settingsResource,
            ...this.standAloneConfigurationResources.map(([, resource]) => resource),
        ];
        this._register(combinedDisposable(...this.allResources.map((resource) => combinedDisposable(this.fileService.watch(uriIdentityService.extUri.dirname(resource)), 
        // Also listen to the resource incase the resource is a symlink - https://github.com/microsoft/vscode/issues/118134
        this.fileService.watch(resource)))));
        this._folderSettingsModelParser = new ConfigurationModelParser(name, logService);
        this._folderSettingsParseOptions = configurationParseOptions;
        this._standAloneConfigurations = [];
        this._cache = ConfigurationModel.createEmptyModel(this.logService);
        this._register(Event.debounce(Event.any(Event.filter(this.fileService.onDidFilesChange, (e) => this.handleFileChangesEvent(e)), Event.filter(this.fileService.onDidRunOperation, (e) => this.handleFileOperationEvent(e))), () => undefined, 100)(() => this._onDidChange.fire()));
    }
    async resolveContents(donotResolveSettings) {
        const resolveContents = async (resources) => {
            return Promise.all(resources.map(async (resource) => {
                try {
                    const content = await this.fileService.readFile(resource, { atomic: true });
                    return content.value.toString();
                }
                catch (error) {
                    this.logService.trace(`Error while resolving configuration file '${resource.toString()}': ${errors.getErrorMessage(error)}`);
                    if (error.fileOperationResult !==
                        1 /* FileOperationResult.FILE_NOT_FOUND */ &&
                        error.fileOperationResult !==
                            9 /* FileOperationResult.FILE_NOT_DIRECTORY */) {
                        this.logService.error(error);
                    }
                }
                return '{}';
            }));
        };
        const [[settingsContent], standAloneConfigurationContents] = await Promise.all([
            donotResolveSettings
                ? Promise.resolve([undefined])
                : resolveContents([this.settingsResource]),
            resolveContents(this.standAloneConfigurationResources.map(([, resource]) => resource)),
        ]);
        return [
            settingsContent,
            standAloneConfigurationContents.map((content, index) => [
                this.standAloneConfigurationResources[index][0],
                content,
            ]),
        ];
    }
    async loadConfiguration(settingsConfiguration) {
        const [settingsContent, standAloneConfigurationContents] = await this.resolveContents(!!settingsConfiguration);
        // reset
        this._standAloneConfigurations = [];
        this._folderSettingsModelParser.parse('', this._folderSettingsParseOptions);
        // parse
        if (settingsContent !== undefined) {
            this._folderSettingsModelParser.parse(settingsContent, this._folderSettingsParseOptions);
        }
        for (let index = 0; index < standAloneConfigurationContents.length; index++) {
            const contents = standAloneConfigurationContents[index][1];
            if (contents !== undefined) {
                const standAloneConfigurationModelParser = new StandaloneConfigurationModelParser(this.standAloneConfigurationResources[index][1].toString(), this.standAloneConfigurationResources[index][0], this.logService);
                standAloneConfigurationModelParser.parse(contents);
                this._standAloneConfigurations.push(standAloneConfigurationModelParser.configurationModel);
            }
        }
        // Consolidate (support *.json files in the workspace settings folder)
        this.consolidate(settingsConfiguration);
        return this._cache;
    }
    getRestrictedSettings() {
        return this._folderSettingsModelParser.restrictedConfigurations;
    }
    reparse(configurationParseOptions) {
        const oldContents = this._folderSettingsModelParser.configurationModel.contents;
        this._folderSettingsParseOptions = configurationParseOptions;
        this._folderSettingsModelParser.reparse(this._folderSettingsParseOptions);
        if (!equals(oldContents, this._folderSettingsModelParser.configurationModel.contents)) {
            this.consolidate();
        }
        return this._cache;
    }
    consolidate(settingsConfiguration) {
        this._cache = (settingsConfiguration ?? this._folderSettingsModelParser.configurationModel).merge(...this._standAloneConfigurations);
    }
    handleFileChangesEvent(event) {
        // One of the resources has changed
        if (this.allResources.some((resource) => event.contains(resource))) {
            return true;
        }
        // One of the resource's parent got deleted
        if (this.allResources.some((resource) => event.contains(this.uriIdentityService.extUri.dirname(resource), 2 /* FileChangeType.DELETED */))) {
            return true;
        }
        return false;
    }
    handleFileOperationEvent(event) {
        // One of the resources has changed
        if ((event.isOperation(0 /* FileOperation.CREATE */) ||
            event.isOperation(3 /* FileOperation.COPY */) ||
            event.isOperation(1 /* FileOperation.DELETE */) ||
            event.isOperation(4 /* FileOperation.WRITE */)) &&
            this.allResources.some((resource) => this.uriIdentityService.extUri.isEqual(event.resource, resource))) {
            return true;
        }
        // One of the resource's parent got deleted
        if (event.isOperation(1 /* FileOperation.DELETE */) &&
            this.allResources.some((resource) => this.uriIdentityService.extUri.isEqual(event.resource, this.uriIdentityService.extUri.dirname(resource)))) {
            return true;
        }
        return false;
    }
}
export class RemoteUserConfiguration extends Disposable {
    constructor(remoteAuthority, configurationCache, fileService, uriIdentityService, remoteAgentService, logService) {
        super();
        this._userConfigurationInitializationPromise = null;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._onDidInitialize = this._register(new Emitter());
        this.onDidInitialize = this._onDidInitialize.event;
        this._fileService = fileService;
        this._userConfiguration = this._cachedConfiguration = new CachedRemoteUserConfiguration(remoteAuthority, configurationCache, { scopes: REMOTE_MACHINE_SCOPES }, logService);
        remoteAgentService.getEnvironment().then(async (environment) => {
            if (environment) {
                const userConfiguration = this._register(new FileServiceBasedRemoteUserConfiguration(environment.settingsPath, { scopes: REMOTE_MACHINE_SCOPES }, this._fileService, uriIdentityService, logService));
                this._register(userConfiguration.onDidChangeConfiguration((configurationModel) => this.onDidUserConfigurationChange(configurationModel)));
                this._userConfigurationInitializationPromise = userConfiguration.initialize();
                const configurationModel = await this._userConfigurationInitializationPromise;
                this._userConfiguration.dispose();
                this._userConfiguration = userConfiguration;
                this.onDidUserConfigurationChange(configurationModel);
                this._onDidInitialize.fire(configurationModel);
            }
        });
    }
    async initialize() {
        if (this._userConfiguration instanceof FileServiceBasedRemoteUserConfiguration) {
            return this._userConfiguration.initialize();
        }
        // Initialize cached configuration
        let configurationModel = await this._userConfiguration.initialize();
        if (this._userConfigurationInitializationPromise) {
            // Use user configuration
            configurationModel = await this._userConfigurationInitializationPromise;
            this._userConfigurationInitializationPromise = null;
        }
        return configurationModel;
    }
    reload() {
        return this._userConfiguration.reload();
    }
    reparse() {
        return this._userConfiguration.reparse({ scopes: REMOTE_MACHINE_SCOPES });
    }
    getRestrictedSettings() {
        return this._userConfiguration.getRestrictedSettings();
    }
    onDidUserConfigurationChange(configurationModel) {
        this.updateCache();
        this._onDidChangeConfiguration.fire(configurationModel);
    }
    async updateCache() {
        if (this._userConfiguration instanceof FileServiceBasedRemoteUserConfiguration) {
            let content;
            try {
                content = await this._userConfiguration.resolveContent();
            }
            catch (error) {
                if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    return;
                }
            }
            await this._cachedConfiguration.updateConfiguration(content);
        }
    }
}
class FileServiceBasedRemoteUserConfiguration extends Disposable {
    constructor(configurationResource, configurationParseOptions, fileService, uriIdentityService, logService) {
        super();
        this.configurationResource = configurationResource;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this.fileWatcherDisposable = this._register(new MutableDisposable());
        this.directoryWatcherDisposable = this._register(new MutableDisposable());
        this.parser = new ConfigurationModelParser(this.configurationResource.toString(), logService);
        this.parseOptions = configurationParseOptions;
        this._register(fileService.onDidFilesChange((e) => this.handleFileChangesEvent(e)));
        this._register(fileService.onDidRunOperation((e) => this.handleFileOperationEvent(e)));
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.reload().then((configurationModel) => this._onDidChangeConfiguration.fire(configurationModel)), 50));
        this._register(toDisposable(() => {
            this.stopWatchingResource();
            this.stopWatchingDirectory();
        }));
    }
    watchResource() {
        this.fileWatcherDisposable.value = this.fileService.watch(this.configurationResource);
    }
    stopWatchingResource() {
        this.fileWatcherDisposable.value = undefined;
    }
    watchDirectory() {
        const directory = this.uriIdentityService.extUri.dirname(this.configurationResource);
        this.directoryWatcherDisposable.value = this.fileService.watch(directory);
    }
    stopWatchingDirectory() {
        this.directoryWatcherDisposable.value = undefined;
    }
    async initialize() {
        const exists = await this.fileService.exists(this.configurationResource);
        this.onResourceExists(exists);
        return this.reload();
    }
    async resolveContent() {
        const content = await this.fileService.readFile(this.configurationResource, { atomic: true });
        return content.value.toString();
    }
    async reload() {
        try {
            const content = await this.resolveContent();
            this.parser.parse(content, this.parseOptions);
            return this.parser.configurationModel;
        }
        catch (e) {
            return ConfigurationModel.createEmptyModel(this.logService);
        }
    }
    reparse(configurationParseOptions) {
        this.parseOptions = configurationParseOptions;
        this.parser.reparse(this.parseOptions);
        return this.parser.configurationModel;
    }
    getRestrictedSettings() {
        return this.parser.restrictedConfigurations;
    }
    handleFileChangesEvent(event) {
        // Find changes that affect the resource
        let affectedByChanges = false;
        if (event.contains(this.configurationResource, 1 /* FileChangeType.ADDED */)) {
            affectedByChanges = true;
            this.onResourceExists(true);
        }
        else if (event.contains(this.configurationResource, 2 /* FileChangeType.DELETED */)) {
            affectedByChanges = true;
            this.onResourceExists(false);
        }
        else if (event.contains(this.configurationResource, 0 /* FileChangeType.UPDATED */)) {
            affectedByChanges = true;
        }
        if (affectedByChanges) {
            this.reloadConfigurationScheduler.schedule();
        }
    }
    handleFileOperationEvent(event) {
        if ((event.isOperation(0 /* FileOperation.CREATE */) ||
            event.isOperation(3 /* FileOperation.COPY */) ||
            event.isOperation(1 /* FileOperation.DELETE */) ||
            event.isOperation(4 /* FileOperation.WRITE */)) &&
            this.uriIdentityService.extUri.isEqual(event.resource, this.configurationResource)) {
            this.reloadConfigurationScheduler.schedule();
        }
    }
    onResourceExists(exists) {
        if (exists) {
            this.stopWatchingDirectory();
            this.watchResource();
        }
        else {
            this.stopWatchingResource();
            this.watchDirectory();
        }
    }
}
class CachedRemoteUserConfiguration extends Disposable {
    constructor(remoteAuthority, configurationCache, configurationParseOptions, logService) {
        super();
        this.configurationCache = configurationCache;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.key = { type: 'user', key: remoteAuthority };
        this.parser = new ConfigurationModelParser('CachedRemoteUserConfiguration', logService);
        this.parseOptions = configurationParseOptions;
        this.configurationModel = ConfigurationModel.createEmptyModel(logService);
    }
    getConfigurationModel() {
        return this.configurationModel;
    }
    initialize() {
        return this.reload();
    }
    reparse(configurationParseOptions) {
        this.parseOptions = configurationParseOptions;
        this.parser.reparse(this.parseOptions);
        this.configurationModel = this.parser.configurationModel;
        return this.configurationModel;
    }
    getRestrictedSettings() {
        return this.parser.restrictedConfigurations;
    }
    async reload() {
        try {
            const content = await this.configurationCache.read(this.key);
            const parsed = JSON.parse(content);
            if (parsed.content) {
                this.parser.parse(parsed.content, this.parseOptions);
                this.configurationModel = this.parser.configurationModel;
            }
        }
        catch (e) {
            /* Ignore error */
        }
        return this.configurationModel;
    }
    async updateConfiguration(content) {
        if (content) {
            return this.configurationCache.write(this.key, JSON.stringify({ content }));
        }
        else {
            return this.configurationCache.remove(this.key);
        }
    }
}
export class WorkspaceConfiguration extends Disposable {
    get initialized() {
        return this._initialized;
    }
    constructor(configurationCache, fileService, uriIdentityService, logService) {
        super();
        this.configurationCache = configurationCache;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._workspaceConfigurationDisposables = this._register(new DisposableStore());
        this._workspaceIdentifier = null;
        this._isWorkspaceTrusted = false;
        this._onDidUpdateConfiguration = this._register(new Emitter());
        this.onDidUpdateConfiguration = this._onDidUpdateConfiguration.event;
        this._initialized = false;
        this.fileService = fileService;
        this._workspaceConfiguration = this._cachedConfiguration = new CachedWorkspaceConfiguration(configurationCache, logService);
    }
    async initialize(workspaceIdentifier, workspaceTrusted) {
        this._workspaceIdentifier = workspaceIdentifier;
        this._isWorkspaceTrusted = workspaceTrusted;
        if (!this._initialized) {
            if (this.configurationCache.needsCaching(this._workspaceIdentifier.configPath)) {
                this._workspaceConfiguration = this._cachedConfiguration;
                this.waitAndInitialize(this._workspaceIdentifier);
            }
            else {
                this.doInitialize(new FileServiceBasedWorkspaceConfiguration(this.fileService, this.uriIdentityService, this.logService));
            }
        }
        await this.reload();
    }
    async reload() {
        if (this._workspaceIdentifier) {
            await this._workspaceConfiguration.load(this._workspaceIdentifier, {
                scopes: WORKSPACE_SCOPES,
                skipRestricted: this.isUntrusted(),
            });
        }
    }
    getFolders() {
        return this._workspaceConfiguration.getFolders();
    }
    setFolders(folders, jsonEditingService) {
        if (this._workspaceIdentifier) {
            return jsonEditingService
                .write(this._workspaceIdentifier.configPath, [{ path: ['folders'], value: folders }], true)
                .then(() => this.reload());
        }
        return Promise.resolve();
    }
    isTransient() {
        return this._workspaceConfiguration.isTransient();
    }
    getConfiguration() {
        return this._workspaceConfiguration.getWorkspaceSettings();
    }
    updateWorkspaceTrust(trusted) {
        this._isWorkspaceTrusted = trusted;
        return this.reparseWorkspaceSettings();
    }
    reparseWorkspaceSettings() {
        this._workspaceConfiguration.reparseWorkspaceSettings({
            scopes: WORKSPACE_SCOPES,
            skipRestricted: this.isUntrusted(),
        });
        return this.getConfiguration();
    }
    getRestrictedSettings() {
        return this._workspaceConfiguration.getRestrictedSettings();
    }
    async waitAndInitialize(workspaceIdentifier) {
        await whenProviderRegistered(workspaceIdentifier.configPath, this.fileService);
        if (!(this._workspaceConfiguration instanceof FileServiceBasedWorkspaceConfiguration)) {
            const fileServiceBasedWorkspaceConfiguration = this._register(new FileServiceBasedWorkspaceConfiguration(this.fileService, this.uriIdentityService, this.logService));
            await fileServiceBasedWorkspaceConfiguration.load(workspaceIdentifier, {
                scopes: WORKSPACE_SCOPES,
                skipRestricted: this.isUntrusted(),
            });
            this.doInitialize(fileServiceBasedWorkspaceConfiguration);
            this.onDidWorkspaceConfigurationChange(false, true);
        }
    }
    doInitialize(fileServiceBasedWorkspaceConfiguration) {
        this._workspaceConfigurationDisposables.clear();
        this._workspaceConfiguration = this._workspaceConfigurationDisposables.add(fileServiceBasedWorkspaceConfiguration);
        this._workspaceConfigurationDisposables.add(this._workspaceConfiguration.onDidChange((e) => this.onDidWorkspaceConfigurationChange(true, false)));
        this._initialized = true;
    }
    isUntrusted() {
        return !this._isWorkspaceTrusted;
    }
    async onDidWorkspaceConfigurationChange(reload, fromCache) {
        if (reload) {
            await this.reload();
        }
        this.updateCache();
        this._onDidUpdateConfiguration.fire(fromCache);
    }
    async updateCache() {
        if (this._workspaceIdentifier &&
            this.configurationCache.needsCaching(this._workspaceIdentifier.configPath) &&
            this._workspaceConfiguration instanceof FileServiceBasedWorkspaceConfiguration) {
            const content = await this._workspaceConfiguration.resolveContent(this._workspaceIdentifier);
            await this._cachedConfiguration.updateWorkspace(this._workspaceIdentifier, content);
        }
    }
}
class FileServiceBasedWorkspaceConfiguration extends Disposable {
    constructor(fileService, uriIdentityService, logService) {
        super();
        this.fileService = fileService;
        this.logService = logService;
        this._workspaceIdentifier = null;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.workspaceConfigurationModelParser = new WorkspaceConfigurationModelParser('', logService);
        this.workspaceSettings = ConfigurationModel.createEmptyModel(logService);
        this._register(Event.any(Event.filter(this.fileService.onDidFilesChange, (e) => !!this._workspaceIdentifier && e.contains(this._workspaceIdentifier.configPath)), Event.filter(this.fileService.onDidRunOperation, (e) => !!this._workspaceIdentifier &&
            (e.isOperation(0 /* FileOperation.CREATE */) ||
                e.isOperation(3 /* FileOperation.COPY */) ||
                e.isOperation(1 /* FileOperation.DELETE */) ||
                e.isOperation(4 /* FileOperation.WRITE */)) &&
            uriIdentityService.extUri.isEqual(e.resource, this._workspaceIdentifier.configPath)))(() => this.reloadConfigurationScheduler.schedule()));
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this._onDidChange.fire(), 50));
        this.workspaceConfigWatcher = this._register(this.watchWorkspaceConfigurationFile());
    }
    get workspaceIdentifier() {
        return this._workspaceIdentifier;
    }
    async resolveContent(workspaceIdentifier) {
        const content = await this.fileService.readFile(workspaceIdentifier.configPath, {
            atomic: true,
        });
        return content.value.toString();
    }
    async load(workspaceIdentifier, configurationParseOptions) {
        if (!this._workspaceIdentifier || this._workspaceIdentifier.id !== workspaceIdentifier.id) {
            this._workspaceIdentifier = workspaceIdentifier;
            this.workspaceConfigurationModelParser = new WorkspaceConfigurationModelParser(this._workspaceIdentifier.id, this.logService);
            dispose(this.workspaceConfigWatcher);
            this.workspaceConfigWatcher = this._register(this.watchWorkspaceConfigurationFile());
        }
        let contents = '';
        try {
            contents = await this.resolveContent(this._workspaceIdentifier);
        }
        catch (error) {
            const exists = await this.fileService.exists(this._workspaceIdentifier.configPath);
            if (exists) {
                this.logService.error(error);
            }
        }
        this.workspaceConfigurationModelParser.parse(contents, configurationParseOptions);
        this.consolidate();
    }
    getConfigurationModel() {
        return this.workspaceConfigurationModelParser.configurationModel;
    }
    getFolders() {
        return this.workspaceConfigurationModelParser.folders;
    }
    isTransient() {
        return this.workspaceConfigurationModelParser.transient;
    }
    getWorkspaceSettings() {
        return this.workspaceSettings;
    }
    reparseWorkspaceSettings(configurationParseOptions) {
        this.workspaceConfigurationModelParser.reparseWorkspaceSettings(configurationParseOptions);
        this.consolidate();
        return this.getWorkspaceSettings();
    }
    getRestrictedSettings() {
        return this.workspaceConfigurationModelParser.getRestrictedWorkspaceSettings();
    }
    consolidate() {
        this.workspaceSettings = this.workspaceConfigurationModelParser.settingsModel.merge(this.workspaceConfigurationModelParser.launchModel, this.workspaceConfigurationModelParser.tasksModel);
    }
    watchWorkspaceConfigurationFile() {
        return this._workspaceIdentifier
            ? this.fileService.watch(this._workspaceIdentifier.configPath)
            : Disposable.None;
    }
}
class CachedWorkspaceConfiguration {
    constructor(configurationCache, logService) {
        this.configurationCache = configurationCache;
        this.logService = logService;
        this.onDidChange = Event.None;
        this.workspaceConfigurationModelParser = new WorkspaceConfigurationModelParser('', logService);
        this.workspaceSettings = ConfigurationModel.createEmptyModel(logService);
    }
    async load(workspaceIdentifier, configurationParseOptions) {
        try {
            const key = this.getKey(workspaceIdentifier);
            const contents = await this.configurationCache.read(key);
            const parsed = JSON.parse(contents);
            if (parsed.content) {
                this.workspaceConfigurationModelParser = new WorkspaceConfigurationModelParser(key.key, this.logService);
                this.workspaceConfigurationModelParser.parse(parsed.content, configurationParseOptions);
                this.consolidate();
            }
        }
        catch (e) { }
    }
    get workspaceIdentifier() {
        return null;
    }
    getConfigurationModel() {
        return this.workspaceConfigurationModelParser.configurationModel;
    }
    getFolders() {
        return this.workspaceConfigurationModelParser.folders;
    }
    isTransient() {
        return this.workspaceConfigurationModelParser.transient;
    }
    getWorkspaceSettings() {
        return this.workspaceSettings;
    }
    reparseWorkspaceSettings(configurationParseOptions) {
        this.workspaceConfigurationModelParser.reparseWorkspaceSettings(configurationParseOptions);
        this.consolidate();
        return this.getWorkspaceSettings();
    }
    getRestrictedSettings() {
        return this.workspaceConfigurationModelParser.getRestrictedWorkspaceSettings();
    }
    consolidate() {
        this.workspaceSettings = this.workspaceConfigurationModelParser.settingsModel.merge(this.workspaceConfigurationModelParser.launchModel, this.workspaceConfigurationModelParser.tasksModel);
    }
    async updateWorkspace(workspaceIdentifier, content) {
        try {
            const key = this.getKey(workspaceIdentifier);
            if (content) {
                await this.configurationCache.write(key, JSON.stringify({ content }));
            }
            else {
                await this.configurationCache.remove(key);
            }
        }
        catch (error) { }
    }
    getKey(workspaceIdentifier) {
        return {
            type: 'workspaces',
            key: workspaceIdentifier.id,
        };
    }
}
class CachedFolderConfiguration {
    constructor(folder, configFolderRelativePath, configurationParseOptions, configurationCache, logService) {
        this.configurationCache = configurationCache;
        this.logService = logService;
        this.onDidChange = Event.None;
        this.key = {
            type: 'folder',
            key: hash(joinPath(folder, configFolderRelativePath).toString()).toString(16),
        };
        this._folderSettingsModelParser = new ConfigurationModelParser('CachedFolderConfiguration', logService);
        this._folderSettingsParseOptions = configurationParseOptions;
        this._standAloneConfigurations = [];
        this.configurationModel = ConfigurationModel.createEmptyModel(logService);
    }
    async loadConfiguration() {
        try {
            const contents = await this.configurationCache.read(this.key);
            const { content: configurationContents } = JSON.parse(contents.toString());
            if (configurationContents) {
                for (const key of Object.keys(configurationContents)) {
                    if (key === FOLDER_SETTINGS_NAME) {
                        this._folderSettingsModelParser.parse(configurationContents[key], this._folderSettingsParseOptions);
                    }
                    else {
                        const standAloneConfigurationModelParser = new StandaloneConfigurationModelParser(key, key, this.logService);
                        standAloneConfigurationModelParser.parse(configurationContents[key]);
                        this._standAloneConfigurations.push(standAloneConfigurationModelParser.configurationModel);
                    }
                }
            }
            this.consolidate();
        }
        catch (e) { }
        return this.configurationModel;
    }
    async updateConfiguration(settingsContent, standAloneConfigurationContents) {
        const content = {};
        if (settingsContent) {
            content[FOLDER_SETTINGS_NAME] = settingsContent;
        }
        standAloneConfigurationContents.forEach(([key, contents]) => {
            if (contents) {
                content[key] = contents;
            }
        });
        if (Object.keys(content).length) {
            await this.configurationCache.write(this.key, JSON.stringify({ content }));
        }
        else {
            await this.configurationCache.remove(this.key);
        }
    }
    getRestrictedSettings() {
        return this._folderSettingsModelParser.restrictedConfigurations;
    }
    reparse(configurationParseOptions) {
        this._folderSettingsParseOptions = configurationParseOptions;
        this._folderSettingsModelParser.reparse(this._folderSettingsParseOptions);
        this.consolidate();
        return this.configurationModel;
    }
    consolidate() {
        this.configurationModel = this._folderSettingsModelParser.configurationModel.merge(...this._standAloneConfigurations);
    }
    getUnsupportedKeys() {
        return [];
    }
}
export class FolderConfiguration extends Disposable {
    constructor(useCache, workspaceFolder, configFolderRelativePath, workbenchState, workspaceTrusted, fileService, uriIdentityService, logService, configurationCache) {
        super();
        this.workspaceFolder = workspaceFolder;
        this.workbenchState = workbenchState;
        this.workspaceTrusted = workspaceTrusted;
        this.configurationCache = configurationCache;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.scopes =
            3 /* WorkbenchState.WORKSPACE */ === this.workbenchState ? FOLDER_SCOPES : WORKSPACE_SCOPES;
        this.configurationFolder = uriIdentityService.extUri.joinPath(workspaceFolder.uri, configFolderRelativePath);
        this.cachedFolderConfiguration = new CachedFolderConfiguration(workspaceFolder.uri, configFolderRelativePath, { scopes: this.scopes, skipRestricted: this.isUntrusted() }, configurationCache, logService);
        if (useCache && this.configurationCache.needsCaching(workspaceFolder.uri)) {
            this.folderConfiguration = this.cachedFolderConfiguration;
            whenProviderRegistered(workspaceFolder.uri, fileService).then(() => {
                this.folderConfiguration = this._register(this.createFileServiceBasedConfiguration(fileService, uriIdentityService, logService));
                this._register(this.folderConfiguration.onDidChange((e) => this.onDidFolderConfigurationChange()));
                this.onDidFolderConfigurationChange();
            });
        }
        else {
            this.folderConfiguration = this._register(this.createFileServiceBasedConfiguration(fileService, uriIdentityService, logService));
            this._register(this.folderConfiguration.onDidChange((e) => this.onDidFolderConfigurationChange()));
        }
    }
    loadConfiguration() {
        return this.folderConfiguration.loadConfiguration();
    }
    updateWorkspaceTrust(trusted) {
        this.workspaceTrusted = trusted;
        return this.reparse();
    }
    reparse() {
        const configurationModel = this.folderConfiguration.reparse({
            scopes: this.scopes,
            skipRestricted: this.isUntrusted(),
        });
        this.updateCache();
        return configurationModel;
    }
    getRestrictedSettings() {
        return this.folderConfiguration.getRestrictedSettings();
    }
    isUntrusted() {
        return !this.workspaceTrusted;
    }
    onDidFolderConfigurationChange() {
        this.updateCache();
        this._onDidChange.fire();
    }
    createFileServiceBasedConfiguration(fileService, uriIdentityService, logService) {
        const settingsResource = uriIdentityService.extUri.joinPath(this.configurationFolder, `${FOLDER_SETTINGS_NAME}.json`);
        const standAloneConfigurationResources = [
            TASKS_CONFIGURATION_KEY,
            LAUNCH_CONFIGURATION_KEY,
            MCP_CONFIGURATION_KEY,
        ].map((name) => [
            name,
            uriIdentityService.extUri.joinPath(this.configurationFolder, `${name}.json`),
        ]);
        return new FileServiceBasedConfiguration(this.configurationFolder.toString(), settingsResource, standAloneConfigurationResources, { scopes: this.scopes, skipRestricted: this.isUntrusted() }, fileService, uriIdentityService, logService);
    }
    async updateCache() {
        if (this.configurationCache.needsCaching(this.configurationFolder) &&
            this.folderConfiguration instanceof FileServiceBasedConfiguration) {
            const [settingsContent, standAloneConfigurationContents] = await this.folderConfiguration.resolveContents();
            this.cachedFolderConfiguration.updateConfiguration(settingsContent, standAloneConfigurationContents);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vYnJvd3Nlci9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sVUFBVSxFQUVWLE9BQU8sRUFDUCxZQUFZLEVBQ1osaUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixlQUFlLEdBQ2YsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBSU4sc0JBQXNCLEdBS3RCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUNOLGtCQUFrQixFQUNsQix3QkFBd0IsRUFFeEIsWUFBWSxHQUNaLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyxrQ0FBa0MsR0FDbEMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQix3QkFBd0IsRUFHeEIscUJBQXFCLEVBQ3JCLGFBQWEsRUFDYixnQkFBZ0IsRUFDaEIsMEJBQTBCLEVBQzFCLGtCQUFrQixFQUNsQixxQkFBcUIsR0FDckIsTUFBTSw0QkFBNEIsQ0FBQTtBQU9uQyxPQUFPLEVBRU4sVUFBVSxFQUVWLHVCQUF1QixHQUN2QixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1B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