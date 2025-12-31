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
import { URI } from '../../../../base/common/uri.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { equals } from '../../../../base/common/objects.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Queue, Barrier, Promises, Delayer } from '../../../../base/common/async.js';
import { Extensions as JSONExtensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { IWorkspaceContextService, Workspace as BaseWorkspace, toWorkspaceFolder, isWorkspaceFolder, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, } from '../../../../platform/workspace/common/workspace.js';
import { ConfigurationModel, ConfigurationChangeEvent, mergeChanges, } from '../../../../platform/configuration/common/configurationModels.js';
import { isConfigurationOverrides, ConfigurationTargetToString, isConfigurationUpdateOverrides, IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { NullPolicyConfiguration, PolicyConfiguration, } from '../../../../platform/configuration/common/configurations.js';
import { Configuration } from '../common/configurationModels.js';
import { FOLDER_CONFIG_FOLDER_NAME, defaultSettingsSchemaId, userSettingsSchemaId, workspaceSettingsSchemaId, folderSettingsSchemaId, machineSettingsSchemaId, LOCAL_MACHINE_SCOPES, PROFILE_SCOPES, LOCAL_MACHINE_PROFILE_SCOPES, profileSettingsSchemaId, APPLY_ALL_PROFILES_SETTING, APPLICATION_SCOPES, } from '../common/configuration.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, allSettings, windowSettings, resourceSettings, applicationSettings, machineSettings, machineOverridableSettings, keyFromOverrideIdentifiers, OVERRIDE_PROPERTY_PATTERN, resourceLanguageSettingsSchemaId, configurationDefaultsSchemaId, applicationMachineSettings, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { isStoredWorkspaceFolder, getStoredWorkspaceFolder, toWorkspaceFolders, } from '../../../../platform/workspaces/common/workspaces.js';
import { ConfigurationEditing, } from '../common/configurationEditing.js';
import { WorkspaceConfiguration, FolderConfiguration, RemoteUserConfiguration, UserConfiguration, DefaultConfiguration, ApplicationConfiguration, } from './configuration.js';
import { mark } from '../../../../base/common/performance.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { delta, distinct, equals as arrayEquals } from '../../../../base/common/arrays.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IWorkbenchAssignmentService } from '../../assignment/common/assignmentService.js';
import { isUndefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { NullPolicyService } from '../../../../platform/policy/common/policy.js';
import { IJSONEditingService } from '../common/jsonEditing.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { runWhenWindowIdle } from '../../../../base/browser/dom.js';
function getLocalUserConfigurationScopes(userDataProfile, hasRemote) {
    const isDefaultProfile = userDataProfile.isDefault || userDataProfile.useDefaultFlags?.settings;
    if (isDefaultProfile) {
        return hasRemote ? LOCAL_MACHINE_SCOPES : undefined;
    }
    return hasRemote ? LOCAL_MACHINE_PROFILE_SCOPES : PROFILE_SCOPES;
}
class Workspace extends BaseWorkspace {
    constructor() {
        super(...arguments);
        this.initialized = false;
    }
}
export class WorkspaceService extends Disposable {
    get restrictedSettings() {
        return this._restrictedSettings;
    }
    constructor({ remoteAuthority, configurationCache, }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, policyService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.remoteAgentService = remoteAgentService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.initialized = false;
        this.applicationConfiguration = null;
        this.remoteUserConfiguration = null;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._onWillChangeWorkspaceFolders = this._register(new Emitter());
        this.onWillChangeWorkspaceFolders = this._onWillChangeWorkspaceFolders.event;
        this._onDidChangeWorkspaceFolders = this._register(new Emitter());
        this.onDidChangeWorkspaceFolders = this._onDidChangeWorkspaceFolders.event;
        this._onDidChangeWorkspaceName = this._register(new Emitter());
        this.onDidChangeWorkspaceName = this._onDidChangeWorkspaceName.event;
        this._onDidChangeWorkbenchState = this._register(new Emitter());
        this.onDidChangeWorkbenchState = this._onDidChangeWorkbenchState.event;
        this.isWorkspaceTrusted = true;
        this._restrictedSettings = { default: [] };
        this._onDidChangeRestrictedSettings = this._register(new Emitter());
        this.onDidChangeRestrictedSettings = this._onDidChangeRestrictedSettings.event;
        this.configurationRegistry = Registry.as(Extensions.Configuration);
        this.initRemoteUserConfigurationBarrier = new Barrier();
        this.completeWorkspaceBarrier = new Barrier();
        this.defaultConfiguration = this._register(new DefaultConfiguration(configurationCache, environmentService, logService));
        this.policyConfiguration =
            policyService instanceof NullPolicyService
                ? new NullPolicyConfiguration()
                : this._register(new PolicyConfiguration(this.defaultConfiguration, policyService, logService));
        this.configurationCache = configurationCache;
        this._configuration = new Configuration(this.defaultConfiguration.configurationModel, this.policyConfiguration.configurationModel, ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), this.workspace, logService);
        this.applicationConfigurationDisposables = this._register(new DisposableStore());
        this.createApplicationConfiguration();
        this.localUserConfiguration = this._register(new UserConfiguration(userDataProfileService.currentProfile.settingsResource, userDataProfileService.currentProfile.tasksResource, {
            scopes: getLocalUserConfigurationScopes(userDataProfileService.currentProfile, !!remoteAuthority),
        }, fileService, uriIdentityService, logService));
        this.cachedFolderConfigs = new ResourceMap();
        this._register(this.localUserConfiguration.onDidChangeConfiguration((userConfiguration) => this.onLocalUserConfigurationChanged(userConfiguration)));
        if (remoteAuthority) {
            const remoteUserConfiguration = (this.remoteUserConfiguration = this._register(new RemoteUserConfiguration(remoteAuthority, configurationCache, fileService, uriIdentityService, remoteAgentService, logService)));
            this._register(remoteUserConfiguration.onDidInitialize((remoteUserConfigurationModel) => {
                this._register(remoteUserConfiguration.onDidChangeConfiguration((remoteUserConfigurationModel) => this.onRemoteUserConfigurationChanged(remoteUserConfigurationModel)));
                this.onRemoteUserConfigurationChanged(remoteUserConfigurationModel);
                this.initRemoteUserConfigurationBarrier.open();
            }));
        }
        else {
            this.initRemoteUserConfigurationBarrier.open();
        }
        this.workspaceConfiguration = this._register(new WorkspaceConfiguration(configurationCache, fileService, uriIdentityService, logService));
        this._register(this.workspaceConfiguration.onDidUpdateConfiguration((fromCache) => {
            this.onWorkspaceConfigurationChanged(fromCache).then(() => {
                this.workspace.initialized = this.workspaceConfiguration.initialized;
                this.checkAndMarkWorkspaceComplete(fromCache);
            });
        }));
        this._register(this.defaultConfiguration.onDidChangeConfiguration(({ properties, defaults }) => this.onDefaultConfigurationChanged(defaults, properties)));
        this._register(this.policyConfiguration.onDidChangeConfiguration((configurationModel) => this.onPolicyConfigurationChanged(configurationModel)));
        this._register(userDataProfileService.onDidChangeCurrentProfile((e) => this.onUserDataProfileChanged(e)));
        this.workspaceEditingQueue = new Queue();
    }
    createApplicationConfiguration() {
        this.applicationConfigurationDisposables.clear();
        if (this.userDataProfileService.currentProfile.isDefault ||
            this.userDataProfileService.currentProfile.useDefaultFlags?.settings) {
            this.applicationConfiguration = null;
        }
        else {
            this.applicationConfiguration = this.applicationConfigurationDisposables.add(this._register(new ApplicationConfiguration(this.userDataProfilesService, this.fileService, this.uriIdentityService, this.logService)));
            this.applicationConfigurationDisposables.add(this.applicationConfiguration.onDidChangeConfiguration((configurationModel) => this.onApplicationConfigurationChanged(configurationModel)));
        }
    }
    // Workspace Context Service Impl
    async getCompleteWorkspace() {
        await this.completeWorkspaceBarrier.wait();
        return this.getWorkspace();
    }
    getWorkspace() {
        return this.workspace;
    }
    getWorkbenchState() {
        // Workspace has configuration file
        if (this.workspace.configuration) {
            return 3 /* WorkbenchState.WORKSPACE */;
        }
        // Folder has single root
        if (this.workspace.folders.length === 1) {
            return 2 /* WorkbenchState.FOLDER */;
        }
        // Empty
        return 1 /* WorkbenchState.EMPTY */;
    }
    getWorkspaceFolder(resource) {
        return this.workspace.getFolder(resource);
    }
    addFolders(foldersToAdd, index) {
        return this.updateFolders(foldersToAdd, [], index);
    }
    removeFolders(foldersToRemove) {
        return this.updateFolders([], foldersToRemove);
    }
    async updateFolders(foldersToAdd, foldersToRemove, index) {
        return this.workspaceEditingQueue.queue(() => this.doUpdateFolders(foldersToAdd, foldersToRemove, index));
    }
    isInsideWorkspace(resource) {
        return !!this.getWorkspaceFolder(resource);
    }
    isCurrentWorkspace(workspaceIdOrFolder) {
        switch (this.getWorkbenchState()) {
            case 2 /* WorkbenchState.FOLDER */: {
                let folderUri = undefined;
                if (URI.isUri(workspaceIdOrFolder)) {
                    folderUri = workspaceIdOrFolder;
                }
                else if (isSingleFolderWorkspaceIdentifier(workspaceIdOrFolder)) {
                    folderUri = workspaceIdOrFolder.uri;
                }
                return (URI.isUri(folderUri) &&
                    this.uriIdentityService.extUri.isEqual(folderUri, this.workspace.folders[0].uri));
            }
            case 3 /* WorkbenchState.WORKSPACE */:
                return (isWorkspaceIdentifier(workspaceIdOrFolder) && this.workspace.id === workspaceIdOrFolder.id);
        }
        return false;
    }
    async doUpdateFolders(foldersToAdd, foldersToRemove, index) {
        if (this.getWorkbenchState() !== 3 /* WorkbenchState.WORKSPACE */) {
            return Promise.resolve(undefined); // we need a workspace to begin with
        }
        if (foldersToAdd.length + foldersToRemove.length === 0) {
            return Promise.resolve(undefined); // nothing to do
        }
        let foldersHaveChanged = false;
        // Remove first (if any)
        let currentWorkspaceFolders = this.getWorkspace().folders;
        let newStoredFolders = currentWorkspaceFolders
            .map((f) => f.raw)
            .filter((folder, index) => {
            if (!isStoredWorkspaceFolder(folder)) {
                return true; // keep entries which are unrelated
            }
            return !this.contains(foldersToRemove, currentWorkspaceFolders[index].uri); // keep entries which are unrelated
        });
        foldersHaveChanged = currentWorkspaceFolders.length !== newStoredFolders.length;
        // Add afterwards (if any)
        if (foldersToAdd.length) {
            // Recompute current workspace folders if we have folders to add
            const workspaceConfigPath = this.getWorkspace().configuration;
            const workspaceConfigFolder = this.uriIdentityService.extUri.dirname(workspaceConfigPath);
            currentWorkspaceFolders = toWorkspaceFolders(newStoredFolders, workspaceConfigPath, this.uriIdentityService.extUri);
            const currentWorkspaceFolderUris = currentWorkspaceFolders.map((folder) => folder.uri);
            const storedFoldersToAdd = [];
            for (const folderToAdd of foldersToAdd) {
                const folderURI = folderToAdd.uri;
                if (this.contains(currentWorkspaceFolderUris, folderURI)) {
                    continue; // already existing
                }
                try {
                    const result = await this.fileService.stat(folderURI);
                    if (!result.isDirectory) {
                        continue;
                    }
                }
                catch (e) {
                    /* Ignore */
                }
                storedFoldersToAdd.push(getStoredWorkspaceFolder(folderURI, false, folderToAdd.name, workspaceConfigFolder, this.uriIdentityService.extUri));
            }
            // Apply to array of newStoredFolders
            if (storedFoldersToAdd.length > 0) {
                foldersHaveChanged = true;
                if (typeof index === 'number' && index >= 0 && index < newStoredFolders.length) {
                    newStoredFolders = newStoredFolders.slice(0);
                    newStoredFolders.splice(index, 0, ...storedFoldersToAdd);
                }
                else {
                    newStoredFolders = [...newStoredFolders, ...storedFoldersToAdd];
                }
            }
        }
        // Set folders if we recorded a change
        if (foldersHaveChanged) {
            return this.setFolders(newStoredFolders);
        }
        return Promise.resolve(undefined);
    }
    async setFolders(folders) {
        if (!this.instantiationService) {
            throw new Error('Cannot update workspace folders because workspace service is not yet ready to accept writes.');
        }
        await this.instantiationService.invokeFunction((accessor) => this.workspaceConfiguration.setFolders(folders, accessor.get(IJSONEditingService)));
        return this.onWorkspaceConfigurationChanged(false);
    }
    contains(resources, toCheck) {
        return resources.some((resource) => this.uriIdentityService.extUri.isEqual(resource, toCheck));
    }
    // Workspace Configuration Service Impl
    getConfigurationData() {
        return this._configuration.toData();
    }
    getValue(arg1, arg2) {
        const section = typeof arg1 === 'string' ? arg1 : undefined;
        const overrides = isConfigurationOverrides(arg1)
            ? arg1
            : isConfigurationOverrides(arg2)
                ? arg2
                : undefined;
        return this._configuration.getValue(section, overrides);
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
        const targets = target ? [target] : [];
        if (overrides?.overrideIdentifiers) {
            overrides.overrideIdentifiers = distinct(overrides.overrideIdentifiers);
            overrides.overrideIdentifiers = overrides.overrideIdentifiers.length
                ? overrides.overrideIdentifiers
                : undefined;
        }
        if (!targets.length) {
            if (overrides?.overrideIdentifiers && overrides.overrideIdentifiers.length > 1) {
                throw new Error('Configuration Target is required while updating the value for multiple override identifiers');
            }
            const inspect = this.inspect(key, {
                resource: overrides?.resource,
                overrideIdentifier: overrides?.overrideIdentifiers
                    ? overrides.overrideIdentifiers[0]
                    : undefined,
            });
            targets.push(...this.deriveConfigurationTargets(key, value, inspect));
            // Remove the setting, if the value is same as default value and is updated only in user target
            if (equals(value, inspect.defaultValue) &&
                targets.length === 1 &&
                (targets[0] === 2 /* ConfigurationTarget.USER */ || targets[0] === 3 /* ConfigurationTarget.USER_LOCAL */)) {
                value = undefined;
            }
        }
        await Promises.settled(targets.map((target) => this.writeConfigurationValue(key, value, target, overrides, options)));
    }
    async reloadConfiguration(target) {
        if (target === undefined) {
            this.reloadDefaultConfiguration();
            const application = await this.reloadApplicationConfiguration(true);
            const { local, remote } = await this.reloadUserConfiguration();
            await this.reloadWorkspaceConfiguration();
            await this.loadConfiguration(application, local, remote, true);
            return;
        }
        if (isWorkspaceFolder(target)) {
            await this.reloadWorkspaceFolderConfiguration(target);
            return;
        }
        switch (target) {
            case 7 /* ConfigurationTarget.DEFAULT */:
                this.reloadDefaultConfiguration();
                return;
            case 2 /* ConfigurationTarget.USER */: {
                const { local, remote } = await this.reloadUserConfiguration();
                await this.loadConfiguration(this._configuration.applicationConfiguration, local, remote, true);
                return;
            }
            case 3 /* ConfigurationTarget.USER_LOCAL */:
                await this.reloadLocalUserConfiguration();
                return;
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                await this.reloadRemoteUserConfiguration();
                return;
            case 5 /* ConfigurationTarget.WORKSPACE */:
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                await this.reloadWorkspaceConfiguration();
                return;
        }
    }
    hasCachedConfigurationDefaultsOverrides() {
        return this.defaultConfiguration.hasCachedConfigurationDefaultsOverrides();
    }
    inspect(key, overrides) {
        return this._configuration.inspect(key, overrides);
    }
    keys() {
        return this._configuration.keys();
    }
    async whenRemoteConfigurationLoaded() {
        await this.initRemoteUserConfigurationBarrier.wait();
    }
    /**
     * At present, all workspaces (empty, single-folder, multi-root) in local and remote
     * can be initialized without requiring extension host except following case:
     *
     * A multi root workspace with .code-workspace file that has to be resolved by an extension.
     * Because of readonly `rootPath` property in extension API we have to resolve multi root workspace
     * before extension host starts so that `rootPath` can be set to first folder.
     *
     * This restriction is lifted partially for web in `MainThreadWorkspace`.
     * In web, we start extension host with empty `rootPath` in this case.
     *
     * Related root path issue discussion is being tracked here - https://github.com/microsoft/vscode/issues/69335
     */
    async initialize(arg) {
        mark('code/willInitWorkspaceService');
        const trigger = this.initialized;
        this.initialized = false;
        const workspace = await this.createWorkspace(arg);
        await this.updateWorkspaceAndInitializeConfiguration(workspace, trigger);
        this.checkAndMarkWorkspaceComplete(false);
        mark('code/didInitWorkspaceService');
    }
    updateWorkspaceTrust(trusted) {
        if (this.isWorkspaceTrusted !== trusted) {
            this.isWorkspaceTrusted = trusted;
            const data = this._configuration.toData();
            const folderConfigurationModels = [];
            for (const folder of this.workspace.folders) {
                const folderConfiguration = this.cachedFolderConfigs.get(folder.uri);
                let configurationModel;
                if (folderConfiguration) {
                    configurationModel = folderConfiguration.updateWorkspaceTrust(this.isWorkspaceTrusted);
                    this._configuration.updateFolderConfiguration(folder.uri, configurationModel);
                }
                folderConfigurationModels.push(configurationModel);
            }
            if (this.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                if (folderConfigurationModels[0]) {
                    this._configuration.updateWorkspaceConfiguration(folderConfigurationModels[0]);
                }
            }
            else {
                this._configuration.updateWorkspaceConfiguration(this.workspaceConfiguration.updateWorkspaceTrust(this.isWorkspaceTrusted));
            }
            this.updateRestrictedSettings();
            let keys = [];
            if (this.restrictedSettings.userLocal) {
                keys.push(...this.restrictedSettings.userLocal);
            }
            if (this.restrictedSettings.userRemote) {
                keys.push(...this.restrictedSettings.userRemote);
            }
            if (this.restrictedSettings.workspace) {
                keys.push(...this.restrictedSettings.workspace);
            }
            this.restrictedSettings.workspaceFolder?.forEach((value) => keys.push(...value));
            keys = distinct(keys);
            if (keys.length) {
                this.triggerConfigurationChange({ keys, overrides: [] }, { data, workspace: this.workspace }, 5 /* ConfigurationTarget.WORKSPACE */);
            }
        }
    }
    acquireInstantiationService(instantiationService) {
        this.instantiationService = instantiationService;
    }
    isSettingAppliedForAllProfiles(key) {
        const scope = this.configurationRegistry.getConfigurationProperties()[key]?.scope;
        if (scope && APPLICATION_SCOPES.includes(scope)) {
            return true;
        }
        const allProfilesSettings = this.getValue(APPLY_ALL_PROFILES_SETTING) ?? [];
        return Array.isArray(allProfilesSettings) && allProfilesSettings.includes(key);
    }
    async createWorkspace(arg) {
        if (isWorkspaceIdentifier(arg)) {
            return this.createMultiFolderWorkspace(arg);
        }
        if (isSingleFolderWorkspaceIdentifier(arg)) {
            return this.createSingleFolderWorkspace(arg);
        }
        return this.createEmptyWorkspace(arg);
    }
    async createMultiFolderWorkspace(workspaceIdentifier) {
        await this.workspaceConfiguration.initialize({ id: workspaceIdentifier.id, configPath: workspaceIdentifier.configPath }, this.isWorkspaceTrusted);
        const workspaceConfigPath = workspaceIdentifier.configPath;
        const workspaceFolders = toWorkspaceFolders(this.workspaceConfiguration.getFolders(), workspaceConfigPath, this.uriIdentityService.extUri);
        const workspaceId = workspaceIdentifier.id;
        const workspace = new Workspace(workspaceId, workspaceFolders, this.workspaceConfiguration.isTransient(), workspaceConfigPath, (uri) => this.uriIdentityService.extUri.ignorePathCasing(uri));
        workspace.initialized = this.workspaceConfiguration.initialized;
        return workspace;
    }
    createSingleFolderWorkspace(singleFolderWorkspaceIdentifier) {
        const workspace = new Workspace(singleFolderWorkspaceIdentifier.id, [toWorkspaceFolder(singleFolderWorkspaceIdentifier.uri)], false, null, (uri) => this.uriIdentityService.extUri.ignorePathCasing(uri));
        workspace.initialized = true;
        return workspace;
    }
    createEmptyWorkspace(emptyWorkspaceIdentifier) {
        const workspace = new Workspace(emptyWorkspaceIdentifier.id, [], false, null, (uri) => this.uriIdentityService.extUri.ignorePathCasing(uri));
        workspace.initialized = true;
        return Promise.resolve(workspace);
    }
    checkAndMarkWorkspaceComplete(fromCache) {
        if (!this.completeWorkspaceBarrier.isOpen() && this.workspace.initialized) {
            this.completeWorkspaceBarrier.open();
            this.validateWorkspaceFoldersAndReload(fromCache);
        }
    }
    async updateWorkspaceAndInitializeConfiguration(workspace, trigger) {
        const hasWorkspaceBefore = !!this.workspace;
        let previousState;
        let previousWorkspacePath;
        let previousFolders = [];
        if (hasWorkspaceBefore) {
            previousState = this.getWorkbenchState();
            previousWorkspacePath = this.workspace.configuration
                ? this.workspace.configuration.fsPath
                : undefined;
            previousFolders = this.workspace.folders;
            this.workspace.update(workspace);
        }
        else {
            this.workspace = workspace;
        }
        await this.initializeConfiguration(trigger);
        // Trigger changes after configuration initialization so that configuration is up to date.
        if (hasWorkspaceBefore) {
            const newState = this.getWorkbenchState();
            if (previousState && newState !== previousState) {
                this._onDidChangeWorkbenchState.fire(newState);
            }
            const newWorkspacePath = this.workspace.configuration
                ? this.workspace.configuration.fsPath
                : undefined;
            if ((previousWorkspacePath && newWorkspacePath !== previousWorkspacePath) ||
                newState !== previousState) {
                this._onDidChangeWorkspaceName.fire();
            }
            const folderChanges = this.compareFolders(previousFolders, this.workspace.folders);
            if (folderChanges &&
                (folderChanges.added.length || folderChanges.removed.length || folderChanges.changed.length)) {
                await this.handleWillChangeWorkspaceFolders(folderChanges, false);
                this._onDidChangeWorkspaceFolders.fire(folderChanges);
            }
        }
        if (!this.localUserConfiguration.hasTasksLoaded) {
            // Reload local user configuration again to load user tasks
            this._register(runWhenWindowIdle(mainWindow, () => this.reloadLocalUserConfiguration(false, this._configuration.localUserConfiguration)));
        }
    }
    compareFolders(currentFolders, newFolders) {
        const result = { added: [], removed: [], changed: [] };
        result.added = newFolders.filter((newFolder) => !currentFolders.some((currentFolder) => newFolder.uri.toString() === currentFolder.uri.toString()));
        for (let currentIndex = 0; currentIndex < currentFolders.length; currentIndex++) {
            const currentFolder = currentFolders[currentIndex];
            let newIndex = 0;
            for (newIndex = 0; newIndex < newFolders.length &&
                currentFolder.uri.toString() !== newFolders[newIndex].uri.toString(); newIndex++) { }
            if (newIndex < newFolders.length) {
                if (currentIndex !== newIndex || currentFolder.name !== newFolders[newIndex].name) {
                    result.changed.push(currentFolder);
                }
            }
            else {
                result.removed.push(currentFolder);
            }
        }
        return result;
    }
    async initializeConfiguration(trigger) {
        await this.defaultConfiguration.initialize();
        const initPolicyConfigurationPromise = this.policyConfiguration.initialize();
        const initApplicationConfigurationPromise = this.applicationConfiguration
            ? this.applicationConfiguration.initialize()
            : Promise.resolve(ConfigurationModel.createEmptyModel(this.logService));
        const initUserConfiguration = async () => {
            mark('code/willInitUserConfiguration');
            const result = await Promise.all([
                this.localUserConfiguration.initialize(),
                this.remoteUserConfiguration
                    ? this.remoteUserConfiguration.initialize()
                    : Promise.resolve(ConfigurationModel.createEmptyModel(this.logService)),
            ]);
            if (this.applicationConfiguration) {
                const applicationConfigurationModel = await initApplicationConfigurationPromise;
                result[0] = this.localUserConfiguration.reparse({
                    exclude: applicationConfigurationModel.getValue(APPLY_ALL_PROFILES_SETTING),
                });
            }
            mark('code/didInitUserConfiguration');
            return result;
        };
        const [, application, [local, remote]] = await Promise.all([
            initPolicyConfigurationPromise,
            initApplicationConfigurationPromise,
            initUserConfiguration(),
        ]);
        mark('code/willInitWorkspaceConfiguration');
        await this.loadConfiguration(application, local, remote, trigger);
        mark('code/didInitWorkspaceConfiguration');
    }
    reloadDefaultConfiguration() {
        this.onDefaultConfigurationChanged(this.defaultConfiguration.reload());
    }
    async reloadApplicationConfiguration(donotTrigger) {
        if (!this.applicationConfiguration) {
            return ConfigurationModel.createEmptyModel(this.logService);
        }
        const model = await this.applicationConfiguration.loadConfiguration();
        if (!donotTrigger) {
            this.onApplicationConfigurationChanged(model);
        }
        return model;
    }
    async reloadUserConfiguration() {
        const [local, remote] = await Promise.all([
            this.reloadLocalUserConfiguration(true),
            this.reloadRemoteUserConfiguration(true),
        ]);
        return { local, remote };
    }
    async reloadLocalUserConfiguration(donotTrigger, settingsConfiguration) {
        const model = await this.localUserConfiguration.reload(settingsConfiguration);
        if (!donotTrigger) {
            this.onLocalUserConfigurationChanged(model);
        }
        return model;
    }
    async reloadRemoteUserConfiguration(donotTrigger) {
        if (this.remoteUserConfiguration) {
            const model = await this.remoteUserConfiguration.reload();
            if (!donotTrigger) {
                this.onRemoteUserConfigurationChanged(model);
            }
            return model;
        }
        return ConfigurationModel.createEmptyModel(this.logService);
    }
    async reloadWorkspaceConfiguration() {
        const workbenchState = this.getWorkbenchState();
        if (workbenchState === 2 /* WorkbenchState.FOLDER */) {
            return this.onWorkspaceFolderConfigurationChanged(this.workspace.folders[0]);
        }
        if (workbenchState === 3 /* WorkbenchState.WORKSPACE */) {
            return this.workspaceConfiguration
                .reload()
                .then(() => this.onWorkspaceConfigurationChanged(false));
        }
    }
    reloadWorkspaceFolderConfiguration(folder) {
        return this.onWorkspaceFolderConfigurationChanged(folder);
    }
    async loadConfiguration(applicationConfigurationModel, userConfigurationModel, remoteUserConfigurationModel, trigger) {
        // reset caches
        this.cachedFolderConfigs = new ResourceMap();
        const folders = this.workspace.folders;
        const folderConfigurations = await this.loadFolderConfigurations(folders);
        const workspaceConfiguration = this.getWorkspaceConfigurationModel(folderConfigurations);
        const folderConfigurationModels = new ResourceMap();
        folderConfigurations.forEach((folderConfiguration, index) => folderConfigurationModels.set(folders[index].uri, folderConfiguration));
        const currentConfiguration = this._configuration;
        this._configuration = new Configuration(this.defaultConfiguration.configurationModel, this.policyConfiguration.configurationModel, applicationConfigurationModel, userConfigurationModel, remoteUserConfigurationModel, workspaceConfiguration, folderConfigurationModels, ConfigurationModel.createEmptyModel(this.logService), new ResourceMap(), this.workspace, this.logService);
        this.initialized = true;
        if (trigger) {
            const change = this._configuration.compare(currentConfiguration);
            this.triggerConfigurationChange(change, { data: currentConfiguration.toData(), workspace: this.workspace }, 5 /* ConfigurationTarget.WORKSPACE */);
        }
        this.updateRestrictedSettings();
    }
    getWorkspaceConfigurationModel(folderConfigurations) {
        switch (this.getWorkbenchState()) {
            case 2 /* WorkbenchState.FOLDER */:
                return folderConfigurations[0];
            case 3 /* WorkbenchState.WORKSPACE */:
                return this.workspaceConfiguration.getConfiguration();
            default:
                return ConfigurationModel.createEmptyModel(this.logService);
        }
    }
    onUserDataProfileChanged(e) {
        e.join((async () => {
            const promises = [];
            promises.push(this.localUserConfiguration.reset(e.profile.settingsResource, e.profile.tasksResource, {
                scopes: getLocalUserConfigurationScopes(e.profile, !!this.remoteUserConfiguration),
            }));
            if (e.previous.isDefault !== e.profile.isDefault ||
                !!e.previous.useDefaultFlags?.settings !== !!e.profile.useDefaultFlags?.settings) {
                this.createApplicationConfiguration();
                if (this.applicationConfiguration) {
                    promises.push(this.reloadApplicationConfiguration(true));
                }
            }
            let [localUser, application] = await Promise.all(promises);
            application = application ?? this._configuration.applicationConfiguration;
            if (this.applicationConfiguration) {
                localUser = this.localUserConfiguration.reparse({
                    exclude: application.getValue(APPLY_ALL_PROFILES_SETTING),
                });
            }
            await this.loadConfiguration(application, localUser, this._configuration.remoteUserConfiguration, true);
        })());
    }
    onDefaultConfigurationChanged(configurationModel, properties) {
        if (this.workspace) {
            const previousData = this._configuration.toData();
            const change = this._configuration.compareAndUpdateDefaultConfiguration(configurationModel, properties);
            if (this.applicationConfiguration) {
                this._configuration.updateApplicationConfiguration(this.applicationConfiguration.reparse());
            }
            if (this.remoteUserConfiguration) {
                this._configuration.updateLocalUserConfiguration(this.localUserConfiguration.reparse());
                this._configuration.updateRemoteUserConfiguration(this.remoteUserConfiguration.reparse());
            }
            if (this.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                const folderConfiguration = this.cachedFolderConfigs.get(this.workspace.folders[0].uri);
                if (folderConfiguration) {
                    this._configuration.updateWorkspaceConfiguration(folderConfiguration.reparse());
                    this._configuration.updateFolderConfiguration(this.workspace.folders[0].uri, folderConfiguration.reparse());
                }
            }
            else {
                this._configuration.updateWorkspaceConfiguration(this.workspaceConfiguration.reparseWorkspaceSettings());
                for (const folder of this.workspace.folders) {
                    const folderConfiguration = this.cachedFolderConfigs.get(folder.uri);
                    if (folderConfiguration) {
                        this._configuration.updateFolderConfiguration(folder.uri, folderConfiguration.reparse());
                    }
                }
            }
            this.triggerConfigurationChange(change, { data: previousData, workspace: this.workspace }, 7 /* ConfigurationTarget.DEFAULT */);
            this.updateRestrictedSettings();
        }
    }
    onPolicyConfigurationChanged(policyConfiguration) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const change = this._configuration.compareAndUpdatePolicyConfiguration(policyConfiguration);
        this.triggerConfigurationChange(change, previous, 7 /* ConfigurationTarget.DEFAULT */);
    }
    onApplicationConfigurationChanged(applicationConfiguration) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const previousAllProfilesSettings = this._configuration.applicationConfiguration.getValue(APPLY_ALL_PROFILES_SETTING) ??
            [];
        const change = this._configuration.compareAndUpdateApplicationConfiguration(applicationConfiguration);
        const currentAllProfilesSettings = this.getValue(APPLY_ALL_PROFILES_SETTING) ?? [];
        const configurationProperties = this.configurationRegistry.getConfigurationProperties();
        const changedKeys = [];
        for (const changedKey of change.keys) {
            const scope = configurationProperties[changedKey]?.scope;
            if (scope && APPLICATION_SCOPES.includes(scope)) {
                changedKeys.push(changedKey);
                if (changedKey === APPLY_ALL_PROFILES_SETTING) {
                    for (const previousAllProfileSetting of previousAllProfilesSettings) {
                        if (!currentAllProfilesSettings.includes(previousAllProfileSetting)) {
                            changedKeys.push(previousAllProfileSetting);
                        }
                    }
                    for (const currentAllProfileSetting of currentAllProfilesSettings) {
                        if (!previousAllProfilesSettings.includes(currentAllProfileSetting)) {
                            changedKeys.push(currentAllProfileSetting);
                        }
                    }
                }
            }
            else if (currentAllProfilesSettings.includes(changedKey)) {
                changedKeys.push(changedKey);
            }
        }
        change.keys = changedKeys;
        if (change.keys.includes(APPLY_ALL_PROFILES_SETTING)) {
            this._configuration.updateLocalUserConfiguration(this.localUserConfiguration.reparse({ exclude: currentAllProfilesSettings }));
        }
        this.triggerConfigurationChange(change, previous, 2 /* ConfigurationTarget.USER */);
    }
    onLocalUserConfigurationChanged(userConfiguration) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const change = this._configuration.compareAndUpdateLocalUserConfiguration(userConfiguration);
        this.triggerConfigurationChange(change, previous, 2 /* ConfigurationTarget.USER */);
    }
    onRemoteUserConfigurationChanged(userConfiguration) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const change = this._configuration.compareAndUpdateRemoteUserConfiguration(userConfiguration);
        this.triggerConfigurationChange(change, previous, 2 /* ConfigurationTarget.USER */);
    }
    async onWorkspaceConfigurationChanged(fromCache) {
        if (this.workspace && this.workspace.configuration) {
            let newFolders = toWorkspaceFolders(this.workspaceConfiguration.getFolders(), this.workspace.configuration, this.uriIdentityService.extUri);
            // Validate only if workspace is initialized
            if (this.workspace.initialized) {
                const { added, removed, changed } = this.compareFolders(this.workspace.folders, newFolders);
                /* If changed validate new folders */
                if (added.length || removed.length || changed.length) {
                    newFolders = await this.toValidWorkspaceFolders(newFolders);
                }
                else {
                    /* Otherwise use existing */
                    newFolders = this.workspace.folders;
                }
            }
            await this.updateWorkspaceConfiguration(newFolders, this.workspaceConfiguration.getConfiguration(), fromCache);
        }
    }
    updateRestrictedSettings() {
        const changed = [];
        const allProperties = this.configurationRegistry.getConfigurationProperties();
        const defaultRestrictedSettings = Object.keys(allProperties)
            .filter((key) => allProperties[key].restricted)
            .sort((a, b) => a.localeCompare(b));
        const defaultDelta = delta(defaultRestrictedSettings, this._restrictedSettings.default, (a, b) => a.localeCompare(b));
        changed.push(...defaultDelta.added, ...defaultDelta.removed);
        const application = (this.applicationConfiguration?.getRestrictedSettings() || []).sort((a, b) => a.localeCompare(b));
        const applicationDelta = delta(application, this._restrictedSettings.application || [], (a, b) => a.localeCompare(b));
        changed.push(...applicationDelta.added, ...applicationDelta.removed);
        const userLocal = this.localUserConfiguration
            .getRestrictedSettings()
            .sort((a, b) => a.localeCompare(b));
        const userLocalDelta = delta(userLocal, this._restrictedSettings.userLocal || [], (a, b) => a.localeCompare(b));
        changed.push(...userLocalDelta.added, ...userLocalDelta.removed);
        const userRemote = (this.remoteUserConfiguration?.getRestrictedSettings() || []).sort((a, b) => a.localeCompare(b));
        const userRemoteDelta = delta(userRemote, this._restrictedSettings.userRemote || [], (a, b) => a.localeCompare(b));
        changed.push(...userRemoteDelta.added, ...userRemoteDelta.removed);
        const workspaceFolderMap = new ResourceMap();
        for (const workspaceFolder of this.workspace.folders) {
            const cachedFolderConfig = this.cachedFolderConfigs.get(workspaceFolder.uri);
            const folderRestrictedSettings = (cachedFolderConfig?.getRestrictedSettings() || []).sort((a, b) => a.localeCompare(b));
            if (folderRestrictedSettings.length) {
                workspaceFolderMap.set(workspaceFolder.uri, folderRestrictedSettings);
            }
            const previous = this._restrictedSettings.workspaceFolder?.get(workspaceFolder.uri) || [];
            const workspaceFolderDelta = delta(folderRestrictedSettings, previous, (a, b) => a.localeCompare(b));
            changed.push(...workspaceFolderDelta.added, ...workspaceFolderDelta.removed);
        }
        const workspace = this.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */
            ? this.workspaceConfiguration.getRestrictedSettings().sort((a, b) => a.localeCompare(b))
            : this.workspace.folders[0]
                ? workspaceFolderMap.get(this.workspace.folders[0].uri) || []
                : [];
        const workspaceDelta = delta(workspace, this._restrictedSettings.workspace || [], (a, b) => a.localeCompare(b));
        changed.push(...workspaceDelta.added, ...workspaceDelta.removed);
        if (changed.length) {
            this._restrictedSettings = {
                default: defaultRestrictedSettings,
                application: application.length ? application : undefined,
                userLocal: userLocal.length ? userLocal : undefined,
                userRemote: userRemote.length ? userRemote : undefined,
                workspace: workspace.length ? workspace : undefined,
                workspaceFolder: workspaceFolderMap.size ? workspaceFolderMap : undefined,
            };
            this._onDidChangeRestrictedSettings.fire(this.restrictedSettings);
        }
    }
    async updateWorkspaceConfiguration(workspaceFolders, configuration, fromCache) {
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const change = this._configuration.compareAndUpdateWorkspaceConfiguration(configuration);
        const changes = this.compareFolders(this.workspace.folders, workspaceFolders);
        if (changes.added.length || changes.removed.length || changes.changed.length) {
            this.workspace.folders = workspaceFolders;
            const change = await this.onFoldersChanged();
            await this.handleWillChangeWorkspaceFolders(changes, fromCache);
            this.triggerConfigurationChange(change, previous, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
            this._onDidChangeWorkspaceFolders.fire(changes);
        }
        else {
            this.triggerConfigurationChange(change, previous, 5 /* ConfigurationTarget.WORKSPACE */);
        }
        this.updateRestrictedSettings();
    }
    async handleWillChangeWorkspaceFolders(changes, fromCache) {
        const joiners = [];
        this._onWillChangeWorkspaceFolders.fire({
            join(updateWorkspaceTrustStatePromise) {
                joiners.push(updateWorkspaceTrustStatePromise);
            },
            changes,
            fromCache,
        });
        try {
            await Promises.settled(joiners);
        }
        catch (error) {
            /* Ignore */
        }
    }
    async onWorkspaceFolderConfigurationChanged(folder) {
        const [folderConfiguration] = await this.loadFolderConfigurations([folder]);
        const previous = { data: this._configuration.toData(), workspace: this.workspace };
        const folderConfigurationChange = this._configuration.compareAndUpdateFolderConfiguration(folder.uri, folderConfiguration);
        if (this.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceConfigurationChange = this._configuration.compareAndUpdateWorkspaceConfiguration(folderConfiguration);
            this.triggerConfigurationChange(mergeChanges(folderConfigurationChange, workspaceConfigurationChange), previous, 5 /* ConfigurationTarget.WORKSPACE */);
        }
        else {
            this.triggerConfigurationChange(folderConfigurationChange, previous, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        }
        this.updateRestrictedSettings();
    }
    async onFoldersChanged() {
        const changes = [];
        // Remove the configurations of deleted folders
        for (const key of this.cachedFolderConfigs.keys()) {
            if (!this.workspace.folders.filter((folder) => folder.uri.toString() === key.toString())[0]) {
                const folderConfiguration = this.cachedFolderConfigs.get(key);
                folderConfiguration.dispose();
                this.cachedFolderConfigs.delete(key);
                changes.push(this._configuration.compareAndDeleteFolderConfiguration(key));
            }
        }
        const toInitialize = this.workspace.folders.filter((folder) => !this.cachedFolderConfigs.has(folder.uri));
        if (toInitialize.length) {
            const folderConfigurations = await this.loadFolderConfigurations(toInitialize);
            folderConfigurations.forEach((folderConfiguration, index) => {
                changes.push(this._configuration.compareAndUpdateFolderConfiguration(toInitialize[index].uri, folderConfiguration));
            });
        }
        return mergeChanges(...changes);
    }
    loadFolderConfigurations(folders) {
        return Promise.all([
            ...folders.map((folder) => {
                let folderConfiguration = this.cachedFolderConfigs.get(folder.uri);
                if (!folderConfiguration) {
                    folderConfiguration = new FolderConfiguration(!this.initialized, folder, FOLDER_CONFIG_FOLDER_NAME, this.getWorkbenchState(), this.isWorkspaceTrusted, this.fileService, this.uriIdentityService, this.logService, this.configurationCache);
                    this._register(folderConfiguration.onDidChange(() => this.onWorkspaceFolderConfigurationChanged(folder)));
                    this.cachedFolderConfigs.set(folder.uri, this._register(folderConfiguration));
                }
                return folderConfiguration.loadConfiguration();
            }),
        ]);
    }
    async validateWorkspaceFoldersAndReload(fromCache) {
        const validWorkspaceFolders = await this.toValidWorkspaceFolders(this.workspace.folders);
        const { removed } = this.compareFolders(this.workspace.folders, validWorkspaceFolders);
        if (removed.length) {
            await this.updateWorkspaceConfiguration(validWorkspaceFolders, this.workspaceConfiguration.getConfiguration(), fromCache);
        }
    }
    // Filter out workspace folders which are files (not directories)
    // Workspace folders those cannot be resolved are not filtered because they are handled by the Explorer.
    async toValidWorkspaceFolders(workspaceFolders) {
        const validWorkspaceFolders = [];
        for (const workspaceFolder of workspaceFolders) {
            try {
                const result = await this.fileService.stat(workspaceFolder.uri);
                if (!result.isDirectory) {
                    continue;
                }
            }
            catch (e) {
                this.logService.warn(`Ignoring the error while validating workspace folder ${workspaceFolder.uri.toString()} - ${toErrorMessage(e)}`);
            }
            validWorkspaceFolders.push(workspaceFolder);
        }
        return validWorkspaceFolders;
    }
    async writeConfigurationValue(key, value, target, overrides, options) {
        if (!this.instantiationService) {
            throw new Error('Cannot write configuration because the configuration service is not yet ready to accept writes.');
        }
        if (target === 7 /* ConfigurationTarget.DEFAULT */) {
            throw new Error('Invalid configuration target');
        }
        if (target === 8 /* ConfigurationTarget.MEMORY */) {
            const previous = { data: this._configuration.toData(), workspace: this.workspace };
            this._configuration.updateValue(key, value, overrides);
            this.triggerConfigurationChange({
                keys: overrides?.overrideIdentifiers?.length
                    ? [keyFromOverrideIdentifiers(overrides.overrideIdentifiers), key]
                    : [key],
                overrides: overrides?.overrideIdentifiers?.length
                    ? overrides.overrideIdentifiers.map((overrideIdentifier) => [overrideIdentifier, [key]])
                    : [],
            }, previous, target);
            return;
        }
        const editableConfigurationTarget = this.toEditableConfigurationTarget(target, key);
        if (!editableConfigurationTarget) {
            throw new Error('Invalid configuration target');
        }
        if (editableConfigurationTarget === 2 /* EditableConfigurationTarget.USER_REMOTE */ &&
            !this.remoteUserConfiguration) {
            throw new Error('Invalid configuration target');
        }
        if (overrides?.overrideIdentifiers?.length && overrides.overrideIdentifiers.length > 1) {
            const configurationModel = this.getConfigurationModelForEditableConfigurationTarget(editableConfigurationTarget, overrides.resource);
            if (configurationModel) {
                const overrideIdentifiers = overrides.overrideIdentifiers.sort();
                const existingOverrides = configurationModel.overrides.find((override) => arrayEquals([...override.identifiers].sort(), overrideIdentifiers));
                if (existingOverrides) {
                    overrides.overrideIdentifiers = existingOverrides.identifiers;
                }
            }
        }
        // Use same instance of ConfigurationEditing to make sure all writes go through the same queue
        this.configurationEditing =
            this.configurationEditing ?? this.createConfigurationEditingService(this.instantiationService);
        await (await this.configurationEditing).writeConfiguration(editableConfigurationTarget, { key, value }, { scopes: overrides, ...options });
        switch (editableConfigurationTarget) {
            case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                if (this.applicationConfiguration && this.isSettingAppliedForAllProfiles(key)) {
                    await this.reloadApplicationConfiguration();
                }
                else {
                    await this.reloadLocalUserConfiguration();
                }
                return;
            case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                return this.reloadRemoteUserConfiguration().then(() => undefined);
            case 3 /* EditableConfigurationTarget.WORKSPACE */:
                return this.reloadWorkspaceConfiguration();
            case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */: {
                const workspaceFolder = overrides && overrides.resource ? this.workspace.getFolder(overrides.resource) : null;
                if (workspaceFolder) {
                    return this.reloadWorkspaceFolderConfiguration(workspaceFolder);
                }
            }
        }
    }
    async createConfigurationEditingService(instantiationService) {
        const remoteSettingsResource = (await this.remoteAgentService.getEnvironment())?.settingsPath ?? null;
        return instantiationService.createInstance(ConfigurationEditing, remoteSettingsResource);
    }
    getConfigurationModelForEditableConfigurationTarget(target, resource) {
        switch (target) {
            case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                return this._configuration.localUserConfiguration;
            case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                return this._configuration.remoteUserConfiguration;
            case 3 /* EditableConfigurationTarget.WORKSPACE */:
                return this._configuration.workspaceConfiguration;
            case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */:
                return resource ? this._configuration.folderConfigurations.get(resource) : undefined;
        }
    }
    getConfigurationModel(target, resource) {
        switch (target) {
            case 3 /* ConfigurationTarget.USER_LOCAL */:
                return this._configuration.localUserConfiguration;
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                return this._configuration.remoteUserConfiguration;
            case 5 /* ConfigurationTarget.WORKSPACE */:
                return this._configuration.workspaceConfiguration;
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                return resource ? this._configuration.folderConfigurations.get(resource) : undefined;
            default:
                return undefined;
        }
    }
    deriveConfigurationTargets(key, value, inspect) {
        if (equals(value, inspect.value)) {
            return [];
        }
        const definedTargets = [];
        if (inspect.workspaceFolderValue !== undefined) {
            definedTargets.push(6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        }
        if (inspect.workspaceValue !== undefined) {
            definedTargets.push(5 /* ConfigurationTarget.WORKSPACE */);
        }
        if (inspect.userRemoteValue !== undefined) {
            definedTargets.push(4 /* ConfigurationTarget.USER_REMOTE */);
        }
        if (inspect.userLocalValue !== undefined) {
            definedTargets.push(3 /* ConfigurationTarget.USER_LOCAL */);
        }
        if (inspect.applicationValue !== undefined) {
            definedTargets.push(1 /* ConfigurationTarget.APPLICATION */);
        }
        if (value === undefined) {
            // Remove the setting in all defined targets
            return definedTargets;
        }
        return [definedTargets[0] || 2 /* ConfigurationTarget.USER */];
    }
    triggerConfigurationChange(change, previous, target) {
        if (change.keys.length) {
            if (target !== 7 /* ConfigurationTarget.DEFAULT */) {
                this.logService.debug(`Configuration keys changed in ${ConfigurationTargetToString(target)} target`, ...change.keys);
            }
            const configurationChangeEvent = new ConfigurationChangeEvent(change, previous, this._configuration, this.workspace, this.logService);
            configurationChangeEvent.source = target;
            this._onDidChangeConfiguration.fire(configurationChangeEvent);
        }
    }
    toEditableConfigurationTarget(target, key) {
        if (target === 1 /* ConfigurationTarget.APPLICATION */) {
            return 1 /* EditableConfigurationTarget.USER_LOCAL */;
        }
        if (target === 2 /* ConfigurationTarget.USER */) {
            if (this.remoteUserConfiguration) {
                const scope = this.configurationRegistry.getConfigurationProperties()[key]?.scope;
                if (scope === 2 /* ConfigurationScope.MACHINE */ ||
                    scope === 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */ ||
                    scope === 3 /* ConfigurationScope.APPLICATION_MACHINE */) {
                    return 2 /* EditableConfigurationTarget.USER_REMOTE */;
                }
                if (this.inspect(key).userRemoteValue !== undefined) {
                    return 2 /* EditableConfigurationTarget.USER_REMOTE */;
                }
            }
            return 1 /* EditableConfigurationTarget.USER_LOCAL */;
        }
        if (target === 3 /* ConfigurationTarget.USER_LOCAL */) {
            return 1 /* EditableConfigurationTarget.USER_LOCAL */;
        }
        if (target === 4 /* ConfigurationTarget.USER_REMOTE */) {
            return 2 /* EditableConfigurationTarget.USER_REMOTE */;
        }
        if (target === 5 /* ConfigurationTarget.WORKSPACE */) {
            return 3 /* EditableConfigurationTarget.WORKSPACE */;
        }
        if (target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            return 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */;
        }
        return null;
    }
}
let RegisterConfigurationSchemasContribution = class RegisterConfigurationSchemasContribution extends Disposable {
    constructor(workspaceContextService, environmentService, workspaceTrustManagementService, extensionService, lifecycleService) {
        super();
        this.workspaceContextService = workspaceContextService;
        this.environmentService = environmentService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        extensionService.whenInstalledExtensionsRegistered().then(() => {
            this.registerConfigurationSchemas();
            const configurationRegistry = Registry.as(Extensions.Configuration);
            const delayer = this._register(new Delayer(50));
            this._register(Event.any(configurationRegistry.onDidUpdateConfiguration, configurationRegistry.onDidSchemaChange, workspaceTrustManagementService.onDidChangeTrust)(() => delayer.trigger(() => this.registerConfigurationSchemas(), lifecycleService.phase === 4 /* LifecyclePhase.Eventually */
                ? undefined
                : 2500 /* delay longer in early phases */)));
        });
    }
    registerConfigurationSchemas() {
        const allSettingsSchema = {
            properties: allSettings.properties,
            patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true,
        };
        const userSettingsSchema = this.environmentService.remoteAuthority
            ? {
                properties: Object.assign({}, applicationSettings.properties, windowSettings.properties, resourceSettings.properties),
                patternProperties: allSettings.patternProperties,
                additionalProperties: true,
                allowTrailingCommas: true,
                allowComments: true,
            }
            : allSettingsSchema;
        const profileSettingsSchema = {
            properties: Object.assign({}, machineSettings.properties, machineOverridableSettings.properties, windowSettings.properties, resourceSettings.properties),
            patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true,
        };
        const machineSettingsSchema = {
            properties: Object.assign({}, applicationMachineSettings.properties, machineSettings.properties, machineOverridableSettings.properties, windowSettings.properties, resourceSettings.properties),
            patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true,
        };
        const workspaceSettingsSchema = {
            properties: Object.assign({}, this.checkAndFilterPropertiesRequiringTrust(machineOverridableSettings.properties), this.checkAndFilterPropertiesRequiringTrust(windowSettings.properties), this.checkAndFilterPropertiesRequiringTrust(resourceSettings.properties)),
            patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true,
        };
        const defaultSettingsSchema = {
            properties: Object.keys(allSettings.properties).reduce((result, key) => {
                result[key] = Object.assign({ deprecationMessage: undefined }, allSettings.properties[key]);
                return result;
            }, {}),
            patternProperties: Object.keys(allSettings.patternProperties).reduce((result, key) => {
                result[key] = Object.assign({ deprecationMessage: undefined }, allSettings.patternProperties[key]);
                return result;
            }, {}),
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true,
        };
        const folderSettingsSchema = 3 /* WorkbenchState.WORKSPACE */ === this.workspaceContextService.getWorkbenchState()
            ? {
                properties: Object.assign({}, this.checkAndFilterPropertiesRequiringTrust(machineOverridableSettings.properties), this.checkAndFilterPropertiesRequiringTrust(resourceSettings.properties)),
                patternProperties: allSettings.patternProperties,
                additionalProperties: true,
                allowTrailingCommas: true,
                allowComments: true,
            }
            : workspaceSettingsSchema;
        const configDefaultsSchema = {
            type: 'object',
            description: localize('configurationDefaults.description', 'Contribute defaults for configurations'),
            properties: Object.assign({}, this.filterDefaultOverridableProperties(machineOverridableSettings.properties), this.filterDefaultOverridableProperties(windowSettings.properties), this.filterDefaultOverridableProperties(resourceSettings.properties)),
            patternProperties: {
                [OVERRIDE_PROPERTY_PATTERN]: {
                    type: 'object',
                    default: {},
                    $ref: resourceLanguageSettingsSchemaId,
                },
            },
            additionalProperties: false,
        };
        this.registerSchemas({
            defaultSettingsSchema,
            userSettingsSchema,
            profileSettingsSchema,
            machineSettingsSchema,
            workspaceSettingsSchema,
            folderSettingsSchema,
            configDefaultsSchema,
        });
    }
    registerSchemas(schemas) {
        const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
        jsonRegistry.registerSchema(defaultSettingsSchemaId, schemas.defaultSettingsSchema);
        jsonRegistry.registerSchema(userSettingsSchemaId, schemas.userSettingsSchema);
        jsonRegistry.registerSchema(profileSettingsSchemaId, schemas.profileSettingsSchema);
        jsonRegistry.registerSchema(machineSettingsSchemaId, schemas.machineSettingsSchema);
        jsonRegistry.registerSchema(workspaceSettingsSchemaId, schemas.workspaceSettingsSchema);
        jsonRegistry.registerSchema(folderSettingsSchemaId, schemas.folderSettingsSchema);
        jsonRegistry.registerSchema(configurationDefaultsSchemaId, schemas.configDefaultsSchema);
    }
    checkAndFilterPropertiesRequiringTrust(properties) {
        if (this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            return properties;
        }
        const result = {};
        Object.entries(properties).forEach(([key, value]) => {
            if (!value.restricted) {
                result[key] = value;
            }
        });
        return result;
    }
    filterDefaultOverridableProperties(properties) {
        const result = {};
        Object.entries(properties).forEach(([key, value]) => {
            if (!value.disallowConfigurationDefault) {
                result[key] = value;
            }
        });
        return result;
    }
};
RegisterConfigurationSchemasContribution = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IWorkspaceTrustManagementService),
    __param(3, IExtensionService),
    __param(4, ILifecycleService)
], RegisterConfigurationSchemasContribution);
let ResetConfigurationDefaultsOverridesCache = class ResetConfigurationDefaultsOverridesCache extends Disposable {
    constructor(configurationService, extensionService) {
        super();
        if (configurationService.hasCachedConfigurationDefaultsOverrides()) {
            extensionService
                .whenInstalledExtensionsRegistered()
                .then(() => configurationService.reloadConfiguration(7 /* ConfigurationTarget.DEFAULT */));
        }
    }
};
ResetConfigurationDefaultsOverridesCache = __decorate([
    __param(0, IConfigurationService),
    __param(1, IExtensionService)
], ResetConfigurationDefaultsOverridesCache);
let UpdateExperimentalSettingsDefaults = class UpdateExperimentalSettingsDefaults extends Disposable {
    static { this.ID = 'workbench.contrib.updateExperimentalSettingsDefaults'; }
    constructor(workbenchAssignmentService) {
        super();
        this.workbenchAssignmentService = workbenchAssignmentService;
        this.processedExperimentalSettings = new Set();
        this.configurationRegistry = Registry.as(Extensions.Configuration);
        this.processExperimentalSettings(Object.keys(this.configurationRegistry.getConfigurationProperties()));
        this._register(this.configurationRegistry.onDidUpdateConfiguration(({ properties }) => this.processExperimentalSettings(properties)));
    }
    async processExperimentalSettings(properties) {
        const overrides = {};
        const allProperties = this.configurationRegistry.getConfigurationProperties();
        for (const property of properties) {
            const schema = allProperties[property];
            const tags = schema?.tags;
            // Many experimental settings refer to in-development or unstable settings.
            // onExP more clearly indicates that the setting could be
            // part of an experiment.
            if (!tags || !tags.some((tag) => tag.toLowerCase() === 'onexp')) {
                continue;
            }
            if (this.processedExperimentalSettings.has(property)) {
                continue;
            }
            this.processedExperimentalSettings.add(property);
            try {
                const value = await this.workbenchAssignmentService.getTreatment(`config.${property}`);
                if (!isUndefined(value) && !equals(value, schema.default)) {
                    overrides[property] = value;
                }
            }
            catch (error) {
                /*ignore */
            }
        }
        if (Object.keys(overrides).length) {
            this.configurationRegistry.registerDefaultConfigurations([{ overrides }]);
        }
    }
};
UpdateExperimentalSettingsDefaults = __decorate([
    __param(0, IWorkbenchAssignmentService)
], UpdateExperimentalSettingsDefaults);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(RegisterConfigurationSchemasContribution, 3 /* LifecyclePhase.Restored */);
workbenchContributionsRegistry.registerWorkbenchContribution(ResetConfigurationDefaultsOverridesCache, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(UpdateExperimentalSettingsDefaults.ID, UpdateExperimentalSettingsDefaults, 2 /* WorkbenchPhase.BlockRestore */);
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        [APPLY_ALL_PROFILES_SETTING]: {
            type: 'array',
            description: localize('setting description', 'Configure settings to be applied for all profiles.'),
            default: [],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            additionalProperties: true,
            uniqueItems: true,
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi9icm93c2VyL2NvbmZpZ3VyYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEYsT0FBTyxFQUVOLFVBQVUsSUFBSSxjQUFjLEdBQzVCLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixTQUFTLElBQUksYUFBYSxFQUsxQixpQkFBaUIsRUFDakIsaUJBQWlCLEVBSWpCLGlDQUFpQyxFQUNqQyxxQkFBcUIsR0FHckIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLHdCQUF3QixFQUN4QixZQUFZLEdBQ1osTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBSU4sd0JBQXdCLEVBSXhCLDJCQUEyQixFQUUzQiw4QkFBOEIsRUFDOUIscUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUVOLHVCQUF1QixFQUN2Qixt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