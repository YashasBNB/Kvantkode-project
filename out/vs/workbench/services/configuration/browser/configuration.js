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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL2Jyb3dzZXIvY29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUNOLFVBQVUsRUFFVixPQUFPLEVBQ1AsWUFBWSxFQUNaLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsZUFBZSxHQUNmLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUlOLHNCQUFzQixHQUt0QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsd0JBQXdCLEVBRXhCLFlBQVksR0FDWixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsa0NBQWtDLEdBQ2xDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixvQkFBb0IsRUFDcEIsd0JBQXdCLEVBR3hCLHFCQUFxQixFQUNyQixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2hCLDBCQUEwQixFQUMxQixrQkFBa0IsRUFDbEIscUJBQXFCLEdBQ3JCLE1BQU0sNEJBQTRCLENBQUE7QUFPbkMsT0FBTyxFQUVOLFVBQVUsRUFFVix1QkFBdUIsR0FDdkIsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlD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