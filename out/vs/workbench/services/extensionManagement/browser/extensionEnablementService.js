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
import { localize } from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IExtensionManagementService, IGlobalExtensionEnablementService, ENABLED_EXTENSIONS_STORAGE_PATH, DISABLED_EXTENSIONS_STORAGE_PATH, IAllowedExtensionsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService, } from '../common/extensionManagement.js';
import { areSameExtensions, BetterMergeId, getExtensionDependencies, isMalicious, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { isAuthenticationProviderExtension, isLanguagePackExtension, isResolverExtension, } from '../../../../platform/extensions/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { StorageManager } from '../../../../platform/extensionManagement/common/extensionEnablementService.js';
import { webWorkerExtHostConfig, } from '../../extensions/common/extensions.js';
import { IUserDataSyncAccountService } from '../../../../platform/userDataSync/common/userDataSyncAccount.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../host/browser/host.js';
import { IExtensionBisectService } from './extensionBisect.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { equals } from '../../../../base/common/arrays.js';
import { isString } from '../../../../base/common/types.js';
import { Delayer } from '../../../../base/common/async.js';
const SOURCE = 'IWorkbenchExtensionEnablementService';
let ExtensionEnablementService = class ExtensionEnablementService extends Disposable {
    constructor(storageService, globalExtensionEnablementService, contextService, environmentService, extensionManagementService, configurationService, extensionManagementServerService, userDataSyncEnablementService, userDataSyncAccountService, lifecycleService, notificationService, hostService, extensionBisectService, allowedExtensionsService, workspaceTrustManagementService, workspaceTrustRequestService, extensionManifestPropertiesService, instantiationService, logService) {
        super();
        this.storageService = storageService;
        this.globalExtensionEnablementService = globalExtensionEnablementService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this.extensionManagementService = extensionManagementService;
        this.configurationService = configurationService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataSyncAccountService = userDataSyncAccountService;
        this.lifecycleService = lifecycleService;
        this.notificationService = notificationService;
        this.extensionBisectService = extensionBisectService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.logService = logService;
        this._onEnablementChanged = new Emitter();
        this.onEnablementChanged = this._onEnablementChanged.event;
        this.extensionsDisabledExtensions = [];
        this.delayer = this._register(new Delayer(0));
        this.storageManager = this._register(new StorageManager(storageService));
        const uninstallDisposable = this._register(Event.filter(extensionManagementService.onDidUninstallExtension, (e) => !e.error)(({ identifier }) => this._reset(identifier)));
        let isDisposed = false;
        this._register(toDisposable(() => (isDisposed = true)));
        this.extensionsManager = this._register(instantiationService.createInstance(ExtensionsManager));
        this.extensionsManager.whenInitialized().then(() => {
            if (!isDisposed) {
                uninstallDisposable.dispose();
                this._onDidChangeExtensions([], [], false);
                this._register(this.extensionsManager.onDidChangeExtensions(({ added, removed, isProfileSwitch }) => this._onDidChangeExtensions(added, removed, isProfileSwitch)));
                this.loopCheckForMaliciousExtensions();
            }
        });
        this._register(this.globalExtensionEnablementService.onDidChangeEnablement(({ extensions, source }) => this._onDidChangeGloballyDisabledExtensions(extensions, source)));
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this._onDidChangeExtensions([], [], false)));
        // delay notification for extensions disabled until workbench restored
        if (this.allUserExtensionsDisabled) {
            this.lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(() => {
                this.notificationService.prompt(Severity.Info, localize('extensionsDisabled', 'All installed extensions are temporarily disabled.'), [
                    {
                        label: localize('Reload', 'Reload and Enable Extensions'),
                        run: () => hostService.reload({ disableExtensions: false }),
                    },
                ], {
                    sticky: true,
                    priority: NotificationPriority.URGENT,
                });
            });
        }
    }
    get hasWorkspace() {
        return this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
    }
    get allUserExtensionsDisabled() {
        return this.environmentService.disableExtensions === true;
    }
    getEnablementState(extension) {
        return this._computeEnablementState(extension, this.extensionsManager.extensions, this.getWorkspaceType());
    }
    getEnablementStates(extensions, workspaceTypeOverrides = {}) {
        const extensionsEnablements = new Map();
        const workspaceType = { ...this.getWorkspaceType(), ...workspaceTypeOverrides };
        return extensions.map((extension) => this._computeEnablementState(extension, extensions, workspaceType, extensionsEnablements));
    }
    getDependenciesEnablementStates(extension) {
        return getExtensionDependencies(this.extensionsManager.extensions, extension).map((e) => [
            e,
            this.getEnablementState(e),
        ]);
    }
    canChangeEnablement(extension) {
        try {
            this.throwErrorIfCannotChangeEnablement(extension);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    canChangeWorkspaceEnablement(extension) {
        if (!this.canChangeEnablement(extension)) {
            return false;
        }
        try {
            this.throwErrorIfCannotChangeWorkspaceEnablement(extension);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    throwErrorIfCannotChangeEnablement(extension, donotCheckDependencies) {
        if (isLanguagePackExtension(extension.manifest)) {
            throw new Error(localize('cannot disable language pack extension', 'Cannot change enablement of {0} extension because it contributes language packs.', extension.manifest.displayName || extension.identifier.id));
        }
        if (this.userDataSyncEnablementService.isEnabled() &&
            this.userDataSyncAccountService.account &&
            isAuthenticationProviderExtension(extension.manifest) &&
            extension.manifest.contributes.authentication.some((a) => a.id === this.userDataSyncAccountService.account.authenticationProviderId)) {
            throw new Error(localize('cannot disable auth extension', 'Cannot change enablement {0} extension because Settings Sync depends on it.', extension.manifest.displayName || extension.identifier.id));
        }
        if (this._isEnabledInEnv(extension)) {
            throw new Error(localize('cannot change enablement environment', 'Cannot change enablement of {0} extension because it is enabled in environment', extension.manifest.displayName || extension.identifier.id));
        }
        this.throwErrorIfEnablementStateCannotBeChanged(extension, this.getEnablementState(extension), donotCheckDependencies);
    }
    throwErrorIfEnablementStateCannotBeChanged(extension, enablementStateOfExtension, donotCheckDependencies) {
        switch (enablementStateOfExtension) {
            case 2 /* EnablementState.DisabledByEnvironment */:
                throw new Error(localize('cannot change disablement environment', 'Cannot change enablement of {0} extension because it is disabled in environment', extension.manifest.displayName || extension.identifier.id));
            case 4 /* EnablementState.DisabledByMalicious */:
                throw new Error(localize('cannot change enablement malicious', 'Cannot change enablement of {0} extension because it is malicious', extension.manifest.displayName || extension.identifier.id));
            case 5 /* EnablementState.DisabledByVirtualWorkspace */:
                throw new Error(localize('cannot change enablement virtual workspace', 'Cannot change enablement of {0} extension because it does not support virtual workspaces', extension.manifest.displayName || extension.identifier.id));
            case 1 /* EnablementState.DisabledByExtensionKind */:
                throw new Error(localize('cannot change enablement extension kind', 'Cannot change enablement of {0} extension because of its extension kind', extension.manifest.displayName || extension.identifier.id));
            case 7 /* EnablementState.DisabledByAllowlist */:
                throw new Error(localize('cannot change disallowed extension enablement', 'Cannot change enablement of {0} extension because it is disallowed', extension.manifest.displayName || extension.identifier.id));
            case 6 /* EnablementState.DisabledByInvalidExtension */:
                throw new Error(localize('cannot change invalid extension enablement', 'Cannot change enablement of {0} extension because of it is invalid', extension.manifest.displayName || extension.identifier.id));
            case 8 /* EnablementState.DisabledByExtensionDependency */:
                if (donotCheckDependencies) {
                    break;
                }
                // Can be changed only when all its dependencies enablements can be changed
                for (const dependency of getExtensionDependencies(this.extensionsManager.extensions, extension)) {
                    if (this.isEnabled(dependency)) {
                        continue;
                    }
                    throw new Error(localize('cannot change enablement dependency', "Cannot enable '{0}' extension because it depends on '{1}' extension that cannot be enabled", extension.manifest.displayName || extension.identifier.id, dependency.manifest.displayName || dependency.identifier.id));
                }
        }
    }
    throwErrorIfCannotChangeWorkspaceEnablement(extension) {
        if (!this.hasWorkspace) {
            throw new Error(localize('noWorkspace', 'No workspace.'));
        }
        if (isAuthenticationProviderExtension(extension.manifest)) {
            throw new Error(localize('cannot disable auth extension in workspace', 'Cannot change enablement of {0} extension in workspace because it contributes authentication providers', extension.manifest.displayName || extension.identifier.id));
        }
    }
    async setEnablement(extensions, newState) {
        await this.extensionsManager.whenInitialized();
        if (newState === 11 /* EnablementState.EnabledGlobally */ ||
            newState === 12 /* EnablementState.EnabledWorkspace */) {
            extensions.push(...this.getExtensionsToEnableRecursively(extensions, this.extensionsManager.extensions, newState, { dependencies: true, pack: true }));
        }
        const workspace = newState === 10 /* EnablementState.DisabledWorkspace */ ||
            newState === 12 /* EnablementState.EnabledWorkspace */;
        for (const extension of extensions) {
            if (workspace) {
                this.throwErrorIfCannotChangeWorkspaceEnablement(extension);
            }
            else {
                this.throwErrorIfCannotChangeEnablement(extension);
            }
        }
        const result = [];
        for (const extension of extensions) {
            const enablementState = this.getEnablementState(extension);
            if (enablementState === 0 /* EnablementState.DisabledByTrustRequirement */ ||
                /* All its disabled dependencies are disabled by Trust Requirement */
                (enablementState === 8 /* EnablementState.DisabledByExtensionDependency */ &&
                    this.getDependenciesEnablementStates(extension).every(([, e]) => this.isEnabledEnablementState(e) || e === 0 /* EnablementState.DisabledByTrustRequirement */))) {
                const trustState = await this.workspaceTrustRequestService.requestWorkspaceTrust();
                result.push(trustState ?? false);
            }
            else {
                result.push(await this._setUserEnablementState(extension, newState));
            }
        }
        const changedExtensions = extensions.filter((e, index) => result[index]);
        if (changedExtensions.length) {
            this._onEnablementChanged.fire(changedExtensions);
        }
        return result;
    }
    getExtensionsToEnableRecursively(extensions, allExtensions, enablementState, options, checked = []) {
        if (!options.dependencies && !options.pack) {
            return [];
        }
        const toCheck = extensions.filter((e) => checked.indexOf(e) === -1);
        if (!toCheck.length) {
            return [];
        }
        for (const extension of toCheck) {
            checked.push(extension);
        }
        const extensionsToEnable = [];
        for (const extension of allExtensions) {
            // Extension is already checked
            if (checked.some((e) => areSameExtensions(e.identifier, extension.identifier))) {
                continue;
            }
            const enablementStateOfExtension = this.getEnablementState(extension);
            // Extension is enabled
            if (this.isEnabledEnablementState(enablementStateOfExtension)) {
                continue;
            }
            // Skip if dependency extension is disabled by extension kind
            if (enablementStateOfExtension === 1 /* EnablementState.DisabledByExtensionKind */) {
                continue;
            }
            // Check if the extension is a dependency or in extension pack
            if (extensions.some((e) => (options.dependencies &&
                e.manifest.extensionDependencies?.some((id) => areSameExtensions({ id }, extension.identifier))) ||
                (options.pack &&
                    e.manifest.extensionPack?.some((id) => areSameExtensions({ id }, extension.identifier))))) {
                const index = extensionsToEnable.findIndex((e) => areSameExtensions(e.identifier, extension.identifier));
                // Extension is not added to the disablement list so add it
                if (index === -1) {
                    extensionsToEnable.push(extension);
                }
                // Extension is there already in the disablement list.
                else {
                    try {
                        // Replace only if the enablement state can be changed
                        this.throwErrorIfEnablementStateCannotBeChanged(extension, enablementStateOfExtension, true);
                        extensionsToEnable.splice(index, 1, extension);
                    }
                    catch (error) {
                        /*Do not add*/
                    }
                }
            }
        }
        if (extensionsToEnable.length) {
            extensionsToEnable.push(...this.getExtensionsToEnableRecursively(extensionsToEnable, allExtensions, enablementState, options, checked));
        }
        return extensionsToEnable;
    }
    _setUserEnablementState(extension, newState) {
        const currentState = this._getUserEnablementState(extension.identifier);
        if (currentState === newState) {
            return Promise.resolve(false);
        }
        switch (newState) {
            case 11 /* EnablementState.EnabledGlobally */:
                this._enableExtension(extension.identifier);
                break;
            case 9 /* EnablementState.DisabledGlobally */:
                this._disableExtension(extension.identifier);
                break;
            case 12 /* EnablementState.EnabledWorkspace */:
                this._enableExtensionInWorkspace(extension.identifier);
                break;
            case 10 /* EnablementState.DisabledWorkspace */:
                this._disableExtensionInWorkspace(extension.identifier);
                break;
        }
        return Promise.resolve(true);
    }
    isEnabled(extension) {
        const enablementState = this.getEnablementState(extension);
        return this.isEnabledEnablementState(enablementState);
    }
    isEnabledEnablementState(enablementState) {
        return (enablementState === 3 /* EnablementState.EnabledByEnvironment */ ||
            enablementState === 12 /* EnablementState.EnabledWorkspace */ ||
            enablementState === 11 /* EnablementState.EnabledGlobally */);
    }
    isDisabledGlobally(extension) {
        return this._isDisabledGlobally(extension.identifier);
    }
    _computeEnablementState(extension, extensions, workspaceType, computedEnablementStates) {
        computedEnablementStates = computedEnablementStates ?? new Map();
        let enablementState = computedEnablementStates.get(extension);
        if (enablementState !== undefined) {
            return enablementState;
        }
        enablementState = this._getUserEnablementState(extension.identifier);
        const isEnabled = this.isEnabledEnablementState(enablementState);
        if (isMalicious(extension.identifier, this.getMaliciousExtensions())) {
            enablementState = 4 /* EnablementState.DisabledByMalicious */;
        }
        else if (isEnabled &&
            extension.type === 1 /* ExtensionType.User */ &&
            this.allowedExtensionsService.isAllowed(extension) !== true) {
            enablementState = 7 /* EnablementState.DisabledByAllowlist */;
        }
        else if (isEnabled && !extension.isValid) {
            enablementState = 6 /* EnablementState.DisabledByInvalidExtension */;
        }
        else if (this.extensionBisectService.isDisabledByBisect(extension)) {
            enablementState = 2 /* EnablementState.DisabledByEnvironment */;
        }
        else if (this._isDisabledInEnv(extension)) {
            enablementState = 2 /* EnablementState.DisabledByEnvironment */;
        }
        else if (this._isDisabledByVirtualWorkspace(extension, workspaceType)) {
            enablementState = 5 /* EnablementState.DisabledByVirtualWorkspace */;
        }
        else if (isEnabled && this._isDisabledByWorkspaceTrust(extension, workspaceType)) {
            enablementState = 0 /* EnablementState.DisabledByTrustRequirement */;
        }
        else if (this._isDisabledByExtensionKind(extension)) {
            enablementState = 1 /* EnablementState.DisabledByExtensionKind */;
        }
        else if (isEnabled &&
            this._isDisabledByExtensionDependency(extension, extensions, workspaceType, computedEnablementStates)) {
            enablementState = 8 /* EnablementState.DisabledByExtensionDependency */;
        }
        else if (!isEnabled && this._isEnabledInEnv(extension)) {
            enablementState = 3 /* EnablementState.EnabledByEnvironment */;
        }
        computedEnablementStates.set(extension, enablementState);
        return enablementState;
    }
    _isDisabledInEnv(extension) {
        if (this.allUserExtensionsDisabled) {
            return (!extension.isBuiltin &&
                !isResolverExtension(extension.manifest, this.environmentService.remoteAuthority));
        }
        const disabledExtensions = this.environmentService.disableExtensions;
        if (Array.isArray(disabledExtensions)) {
            return disabledExtensions.some((id) => areSameExtensions({ id }, extension.identifier));
        }
        // Check if this is the better merge extension which was migrated to a built-in extension
        if (areSameExtensions({ id: BetterMergeId.value }, extension.identifier)) {
            return true;
        }
        return false;
    }
    _isEnabledInEnv(extension) {
        const enabledExtensions = this.environmentService.enableExtensions;
        if (Array.isArray(enabledExtensions)) {
            return enabledExtensions.some((id) => areSameExtensions({ id }, extension.identifier));
        }
        return false;
    }
    _isDisabledByVirtualWorkspace(extension, workspaceType) {
        // Not a virtual workspace
        if (!workspaceType.virtual) {
            return false;
        }
        // Supports virtual workspace
        if (this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(extension.manifest) !== false) {
            return false;
        }
        // Web extension from web extension management server
        if (this.extensionManagementServerService.getExtensionManagementServer(extension) ===
            this.extensionManagementServerService.webExtensionManagementServer &&
            this.extensionManifestPropertiesService.canExecuteOnWeb(extension.manifest)) {
            return false;
        }
        return true;
    }
    _isDisabledByExtensionKind(extension) {
        if (this.extensionManagementServerService.remoteExtensionManagementServer ||
            this.extensionManagementServerService.webExtensionManagementServer) {
            const installLocation = this.extensionManagementServerService.getExtensionInstallLocation(extension);
            for (const extensionKind of this.extensionManifestPropertiesService.getExtensionKind(extension.manifest)) {
                if (extensionKind === 'ui') {
                    if (installLocation === 1 /* ExtensionInstallLocation.Local */) {
                        return false;
                    }
                }
                if (extensionKind === 'workspace') {
                    if (installLocation === 2 /* ExtensionInstallLocation.Remote */) {
                        return false;
                    }
                }
                if (extensionKind === 'web') {
                    if (this.extensionManagementServerService.webExtensionManagementServer /* web */) {
                        if (installLocation === 3 /* ExtensionInstallLocation.Web */ ||
                            installLocation === 2 /* ExtensionInstallLocation.Remote */) {
                            return false;
                        }
                    }
                    else if (installLocation === 1 /* ExtensionInstallLocation.Local */) {
                        const enableLocalWebWorker = this.configurationService.getValue(webWorkerExtHostConfig);
                        if (enableLocalWebWorker === true || enableLocalWebWorker === 'auto') {
                            // Web extensions are enabled on all configurations
                            return false;
                        }
                    }
                }
            }
            return true;
        }
        return false;
    }
    _isDisabledByWorkspaceTrust(extension, workspaceType) {
        if (workspaceType.trusted) {
            return false;
        }
        if (this.contextService.isInsideWorkspace(extension.location)) {
            return true;
        }
        return (this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(extension.manifest) === false);
    }
    _isDisabledByExtensionDependency(extension, extensions, workspaceType, computedEnablementStates) {
        if (!extension.manifest.extensionDependencies) {
            return false;
        }
        // Find dependency that is from the same server or does not exports any API
        const dependencyExtensions = extensions.filter((e) => extension.manifest.extensionDependencies?.some((id) => areSameExtensions(e.identifier, { id }) &&
            (this.extensionManagementServerService.getExtensionManagementServer(e) ===
                this.extensionManagementServerService.getExtensionManagementServer(extension) ||
                ((e.manifest.main || e.manifest.browser) && e.manifest.api === 'none'))));
        if (!dependencyExtensions.length) {
            return false;
        }
        const hasEnablementState = computedEnablementStates.has(extension);
        if (!hasEnablementState) {
            // Placeholder to handle cyclic deps
            computedEnablementStates.set(extension, 11 /* EnablementState.EnabledGlobally */);
        }
        try {
            for (const dependencyExtension of dependencyExtensions) {
                const enablementState = this._computeEnablementState(dependencyExtension, extensions, workspaceType, computedEnablementStates);
                if (!this.isEnabledEnablementState(enablementState) &&
                    enablementState !== 1 /* EnablementState.DisabledByExtensionKind */) {
                    return true;
                }
            }
        }
        finally {
            if (!hasEnablementState) {
                // remove the placeholder
                computedEnablementStates.delete(extension);
            }
        }
        return false;
    }
    _getUserEnablementState(identifier) {
        if (this.hasWorkspace) {
            if (this._getWorkspaceEnabledExtensions().filter((e) => areSameExtensions(e, identifier))[0]) {
                return 12 /* EnablementState.EnabledWorkspace */;
            }
            if (this._getWorkspaceDisabledExtensions().filter((e) => areSameExtensions(e, identifier))[0]) {
                return 10 /* EnablementState.DisabledWorkspace */;
            }
        }
        if (this._isDisabledGlobally(identifier)) {
            return 9 /* EnablementState.DisabledGlobally */;
        }
        return 11 /* EnablementState.EnabledGlobally */;
    }
    _isDisabledGlobally(identifier) {
        return this.globalExtensionEnablementService
            .getDisabledExtensions()
            .some((e) => areSameExtensions(e, identifier));
    }
    _enableExtension(identifier) {
        this._removeFromWorkspaceDisabledExtensions(identifier);
        this._removeFromWorkspaceEnabledExtensions(identifier);
        return this.globalExtensionEnablementService.enableExtension(identifier, SOURCE);
    }
    _disableExtension(identifier) {
        this._removeFromWorkspaceDisabledExtensions(identifier);
        this._removeFromWorkspaceEnabledExtensions(identifier);
        return this.globalExtensionEnablementService.disableExtension(identifier, SOURCE);
    }
    _enableExtensionInWorkspace(identifier) {
        this._removeFromWorkspaceDisabledExtensions(identifier);
        this._addToWorkspaceEnabledExtensions(identifier);
    }
    _disableExtensionInWorkspace(identifier) {
        this._addToWorkspaceDisabledExtensions(identifier);
        this._removeFromWorkspaceEnabledExtensions(identifier);
    }
    _addToWorkspaceDisabledExtensions(identifier) {
        if (!this.hasWorkspace) {
            return Promise.resolve(false);
        }
        const disabledExtensions = this._getWorkspaceDisabledExtensions();
        if (disabledExtensions.every((e) => !areSameExtensions(e, identifier))) {
            disabledExtensions.push(identifier);
            this._setDisabledExtensions(disabledExtensions);
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }
    async _removeFromWorkspaceDisabledExtensions(identifier) {
        if (!this.hasWorkspace) {
            return false;
        }
        const disabledExtensions = this._getWorkspaceDisabledExtensions();
        for (let index = 0; index < disabledExtensions.length; index++) {
            const disabledExtension = disabledExtensions[index];
            if (areSameExtensions(disabledExtension, identifier)) {
                disabledExtensions.splice(index, 1);
                this._setDisabledExtensions(disabledExtensions);
                return true;
            }
        }
        return false;
    }
    _addToWorkspaceEnabledExtensions(identifier) {
        if (!this.hasWorkspace) {
            return false;
        }
        const enabledExtensions = this._getWorkspaceEnabledExtensions();
        if (enabledExtensions.every((e) => !areSameExtensions(e, identifier))) {
            enabledExtensions.push(identifier);
            this._setEnabledExtensions(enabledExtensions);
            return true;
        }
        return false;
    }
    _removeFromWorkspaceEnabledExtensions(identifier) {
        if (!this.hasWorkspace) {
            return false;
        }
        const enabledExtensions = this._getWorkspaceEnabledExtensions();
        for (let index = 0; index < enabledExtensions.length; index++) {
            const disabledExtension = enabledExtensions[index];
            if (areSameExtensions(disabledExtension, identifier)) {
                enabledExtensions.splice(index, 1);
                this._setEnabledExtensions(enabledExtensions);
                return true;
            }
        }
        return false;
    }
    _getWorkspaceEnabledExtensions() {
        return this._getExtensions(ENABLED_EXTENSIONS_STORAGE_PATH);
    }
    _setEnabledExtensions(enabledExtensions) {
        this._setExtensions(ENABLED_EXTENSIONS_STORAGE_PATH, enabledExtensions);
    }
    _getWorkspaceDisabledExtensions() {
        return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
    }
    _setDisabledExtensions(disabledExtensions) {
        this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disabledExtensions);
    }
    _getExtensions(storageId) {
        if (!this.hasWorkspace) {
            return [];
        }
        return this.storageManager.get(storageId, 1 /* StorageScope.WORKSPACE */);
    }
    _setExtensions(storageId, extensions) {
        this.storageManager.set(storageId, extensions, 1 /* StorageScope.WORKSPACE */);
    }
    async _onDidChangeGloballyDisabledExtensions(extensionIdentifiers, source) {
        if (source !== SOURCE) {
            await this.extensionsManager.whenInitialized();
            const extensions = this.extensionsManager.extensions.filter((installedExtension) => extensionIdentifiers.some((identifier) => areSameExtensions(identifier, installedExtension.identifier)));
            this._onEnablementChanged.fire(extensions);
        }
    }
    _onDidChangeExtensions(added, removed, isProfileSwitch) {
        const changedExtensions = added.filter((e) => !this.isEnabledEnablementState(this.getEnablementState(e)));
        const existingDisabledExtensions = this.extensionsDisabledExtensions;
        this.extensionsDisabledExtensions = this.extensionsManager.extensions.filter((extension) => {
            const enablementState = this.getEnablementState(extension);
            return (enablementState === 8 /* EnablementState.DisabledByExtensionDependency */ ||
                enablementState === 7 /* EnablementState.DisabledByAllowlist */ ||
                enablementState === 4 /* EnablementState.DisabledByMalicious */);
        });
        for (const extension of existingDisabledExtensions) {
            if (this.extensionsDisabledExtensions.every((e) => !areSameExtensions(e.identifier, extension.identifier))) {
                changedExtensions.push(extension);
            }
        }
        for (const extension of this.extensionsDisabledExtensions) {
            if (existingDisabledExtensions.every((e) => !areSameExtensions(e.identifier, extension.identifier))) {
                changedExtensions.push(extension);
            }
        }
        if (changedExtensions.length) {
            this._onEnablementChanged.fire(changedExtensions);
        }
        if (!isProfileSwitch) {
            removed.forEach(({ identifier }) => this._reset(identifier));
        }
    }
    async updateExtensionsEnablementsWhenWorkspaceTrustChanges() {
        await this.extensionsManager.whenInitialized();
        const computeEnablementStates = (workspaceType) => {
            const extensionsEnablements = new Map();
            return this.extensionsManager.extensions.map((extension) => [
                extension,
                this._computeEnablementState(extension, this.extensionsManager.extensions, workspaceType, extensionsEnablements),
            ]);
        };
        const workspaceType = this.getWorkspaceType();
        const enablementStatesWithTrustedWorkspace = computeEnablementStates({
            ...workspaceType,
            trusted: true,
        });
        const enablementStatesWithUntrustedWorkspace = computeEnablementStates({
            ...workspaceType,
            trusted: false,
        });
        const enablementChangedExtensionsBecauseOfTrust = enablementStatesWithTrustedWorkspace
            .filter(([, enablementState], index) => enablementState !== enablementStatesWithUntrustedWorkspace[index][1])
            .map(([extension]) => extension);
        if (enablementChangedExtensionsBecauseOfTrust.length) {
            this._onEnablementChanged.fire(enablementChangedExtensionsBecauseOfTrust);
        }
    }
    getWorkspaceType() {
        return {
            trusted: this.workspaceTrustManagementService.isWorkspaceTrusted(),
            virtual: isVirtualWorkspace(this.contextService.getWorkspace()),
        };
    }
    _reset(extension) {
        this._removeFromWorkspaceDisabledExtensions(extension);
        this._removeFromWorkspaceEnabledExtensions(extension);
        this.globalExtensionEnablementService.enableExtension(extension);
    }
    loopCheckForMaliciousExtensions() {
        this.checkForMaliciousExtensions()
            .then(() => this.delayer.trigger(() => { }, 1000 * 60 * 5)) // every five minutes
            .then(() => this.loopCheckForMaliciousExtensions());
    }
    async checkForMaliciousExtensions() {
        try {
            const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
            const changed = this.storeMaliciousExtensions(extensionsControlManifest.malicious);
            if (changed) {
                this._onDidChangeExtensions([], [], false);
            }
        }
        catch (err) {
            this.logService.error(err);
        }
    }
    getMaliciousExtensions() {
        return this.storageService.getObject('extensionsEnablement/malicious', -1 /* StorageScope.APPLICATION */, []);
    }
    storeMaliciousExtensions(extensions) {
        const existing = this.getMaliciousExtensions();
        if (equals(existing, extensions, (a, b) => !isString(a) && !isString(b) ? areSameExtensions(a, b) : a === b)) {
            return false;
        }
        this.storageService.store('extensionsEnablement/malicious', JSON.stringify(extensions), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        return true;
    }
};
ExtensionEnablementService = __decorate([
    __param(0, IStorageService),
    __param(1, IGlobalExtensionEnablementService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IExtensionManagementService),
    __param(5, IConfigurationService),
    __param(6, IExtensionManagementServerService),
    __param(7, IUserDataSyncEnablementService),
    __param(8, IUserDataSyncAccountService),
    __param(9, ILifecycleService),
    __param(10, INotificationService),
    __param(11, IHostService),
    __param(12, IExtensionBisectService),
    __param(13, IAllowedExtensionsService),
    __param(14, IWorkspaceTrustManagementService),
    __param(15, IWorkspaceTrustRequestService),
    __param(16, IExtensionManifestPropertiesService),
    __param(17, IInstantiationService),
    __param(18, ILogService)
], ExtensionEnablementService);
export { ExtensionEnablementService };
let ExtensionsManager = class ExtensionsManager extends Disposable {
    get extensions() {
        return this._extensions;
    }
    constructor(extensionManagementService, extensionManagementServerService, logService) {
        super();
        this.extensionManagementService = extensionManagementService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.logService = logService;
        this._extensions = [];
        this._onDidChangeExtensions = this._register(new Emitter());
        this.onDidChangeExtensions = this._onDidChangeExtensions.event;
        this.disposed = false;
        this._register(toDisposable(() => (this.disposed = true)));
        this.initializePromise = this.initialize();
    }
    whenInitialized() {
        return this.initializePromise;
    }
    async initialize() {
        try {
            this._extensions = [
                ...(await this.extensionManagementService.getInstalled()),
                ...(await this.extensionManagementService.getInstalledWorkspaceExtensions(true)),
            ];
            if (this.disposed) {
                return;
            }
            this._onDidChangeExtensions.fire({
                added: this.extensions,
                removed: [],
                isProfileSwitch: false,
            });
        }
        catch (error) {
            this.logService.error(error);
        }
        this._register(this.extensionManagementService.onDidInstallExtensions((e) => this.updateExtensions(e.reduce((result, { local, operation }) => {
            if (local && operation !== 4 /* InstallOperation.Migrate */) {
                result.push(local);
            }
            return result;
        }, []), [], undefined, false)));
        this._register(Event.filter(this.extensionManagementService.onDidUninstallExtension, (e) => !e.error)((e) => this.updateExtensions([], [e.identifier], e.server, false)));
        this._register(this.extensionManagementService.onDidChangeProfile(({ added, removed, server }) => {
            this.updateExtensions(added, removed.map(({ identifier }) => identifier), server, true);
        }));
    }
    updateExtensions(added, identifiers, server, isProfileSwitch) {
        if (added.length) {
            for (const extension of added) {
                const extensionServer = this.extensionManagementServerService.getExtensionManagementServer(extension);
                const index = this._extensions.findIndex((e) => areSameExtensions(e.identifier, extension.identifier) &&
                    this.extensionManagementServerService.getExtensionManagementServer(e) ===
                        extensionServer);
                if (index !== -1) {
                    this._extensions.splice(index, 1);
                }
            }
            this._extensions.push(...added);
        }
        const removed = [];
        for (const identifier of identifiers) {
            const index = this._extensions.findIndex((e) => areSameExtensions(e.identifier, identifier) &&
                this.extensionManagementServerService.getExtensionManagementServer(e) === server);
            if (index !== -1) {
                removed.push(...this._extensions.splice(index, 1));
            }
        }
        if (added.length || removed.length) {
            this._onDidChangeExtensions.fire({ added, removed, isProfileSwitch });
        }
    }
};
ExtensionsManager = __decorate([
    __param(0, IWorkbenchExtensionManagementService),
    __param(1, IExtensionManagementServerService),
    __param(2, ILogService)
], ExtensionsManager);
registerSingleton(IWorkbenchExtensionEnablementService, ExtensionEnablementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9icm93c2VyL2V4dGVuc2lvbkVuYWJsZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUNOLDJCQUEyQixFQUUzQixpQ0FBaUMsRUFDakMsK0JBQStCLEVBQy9CLGdDQUFnQyxFQUVoQyx5QkFBeUIsR0FDekIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sb0NBQW9DLEVBRXBDLGlDQUFpQyxFQUNqQyxvQ0FBb0MsR0FHcEMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGFBQWEsRUFDYix3QkFBd0IsRUFDeEIsV0FBVyxHQUNYLE1BQU0sNEVBQTRFLENBQUE7QUFDbkYsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBR04saUNBQWlDLEVBQ2pDLHVCQUF1QixFQUN2QixtQkFBbUIsR0FDbkIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FB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