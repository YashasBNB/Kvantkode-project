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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2Jyb3dzZXIvZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sMkJBQTJCLEVBRTNCLGlDQUFpQyxFQUNqQywrQkFBK0IsRUFDL0IsZ0NBQWdDLEVBRWhDLHlCQUF5QixHQUN6QixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTixvQ0FBb0MsRUFFcEMsaUNBQWlDLEVBQ2pDLG9DQUFvQyxHQUdwQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLHdCQUF3QixFQUN4QixXQUFXLEdBQ1gsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFHTixpQ0FBaUMsRUFDakMsdUJBQXVCLEVBQ3ZCLG1CQUFtQixHQUNuQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDOUcsT0FBTyxFQUNOLHNCQUFzQixHQUV0QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQzdHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDOUQsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyw2QkFBNkIsR0FDN0IsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsTUFBTSxNQUFNLEdBQUcsc0NBQXNDLENBQUE7QUFJOUMsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFDWixTQUFRLFVBQVU7SUFjbEIsWUFDa0IsY0FBZ0QsRUFFakUsZ0NBQXNGLEVBQzVELGNBQXlELEVBQ3JELGtCQUFpRSxFQUUvRiwwQkFBd0UsRUFDakQsb0JBQTRELEVBRW5GLGdDQUFvRixFQUVwRiw2QkFBOEUsRUFFOUUsMEJBQXdFLEVBQ3JELGdCQUFvRCxFQUNqRCxtQkFBMEQsRUFDbEUsV0FBeUIsRUFDZCxzQkFBZ0UsRUFDOUQsd0JBQW9FLEVBRS9GLCtCQUFrRixFQUVsRiw0QkFBNEUsRUFFNUUsa0NBQXdGLEVBQ2pFLG9CQUEyQyxFQUNyRCxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQTtRQTVCMkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRTlDLHFDQUFnQyxHQUFoQyxnQ0FBZ0MsQ0FBbUM7UUFDM0MsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ3BDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBOEI7UUFFOUUsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE2QjtRQUNoQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBRWxFLHFDQUFnQyxHQUFoQyxnQ0FBZ0MsQ0FBbUM7UUFFbkUsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztRQUU3RCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQ3BDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDaEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUV0QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQzdDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMkI7UUFFOUUsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQUVqRSxpQ0FBNEIsR0FBNUIsNEJBQTRCLENBQStCO1FBRTNELHVDQUFrQyxHQUFsQyxrQ0FBa0MsQ0FBcUM7UUFFMUQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQXBDckMseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQXlCLENBQUE7UUFDNUQsd0JBQW1CLEdBQ2xDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7UUFJeEIsaUNBQTRCLEdBQWlCLEVBQUUsQ0FBQTtRQUN0QyxZQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBZ0M5RCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUV4RSxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3pDLEtBQUssQ0FBQyxNQUFNLENBQ1gsMEJBQTBCLENBQUMsdUJBQXVCLEVBQ2xELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQ2YsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FDOUMsQ0FBQTtRQUNELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtRQUMvRixJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNsRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUM3QixJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDMUMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxDQUNwRixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FDNUQsQ0FDRCxDQUFBO2dCQUNELElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUN0RixJQUFJLENBQUMsc0NBQXNDLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUMvRCxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLHdCQUF3QixDQUFDLHVDQUF1QyxDQUFDLEdBQUcsRUFBRSxDQUNyRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FDMUMsQ0FDRCxDQUFBO1FBRUQsc0VBQXNFO1FBQ3RFLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksbUNBQTJCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDL0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FDOUIsUUFBUSxDQUFDLElBQUksRUFDYixRQUFRLENBQUMsb0JBQW9CLEVBQUUsb0RBQW9ELENBQUMsRUFDcEY7b0JBQ0M7d0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsOEJBQThCLENBQUM7d0JBQ3pELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLENBQUM7cUJBQzNEO2lCQUNELEVBQ0Q7b0JBQ0MsTUFBTSxFQUFFLElBQUk7b0JBQ1osUUFBUSxFQUFFLG9CQUFvQixDQUFDLE1BQU07aUJBQ3JDLENBQ0QsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGlDQUF5QixDQUFBO0lBQ3hFLENBQUM7SUFFRCxJQUFZLHlCQUF5QjtRQUNwQyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsS0FBSyxJQUFJLENBQUE7SUFDMUQsQ0FBQztJQUVELGtCQUFrQixDQUFDLFNBQXFCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUNsQyxTQUFTLEVBQ1QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFDakMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQ3ZCLENBQUE7SUFDRixDQUFDO0lBRUQsbUJBQW1CLENBQ2xCLFVBQXdCLEVBQ3hCLHlCQUFpRCxFQUFFO1FBRW5ELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUE7UUFDcEUsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQTtRQUMvRSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUNuQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUscUJBQXFCLENBQUMsQ0FDekYsQ0FBQTtJQUNGLENBQUM7SUFFRCwrQkFBK0IsQ0FBQyxTQUFxQjtRQUNwRCxPQUFPLHdCQUF3QixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4RixDQUFDO1lBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztTQUMxQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsbUJBQW1CLENBQUMsU0FBcUI7UUFDeEMsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLGtDQUFrQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2xELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVELDRCQUE0QixDQUFDLFNBQXFCO1FBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsMkNBQTJDLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDM0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7SUFDRixDQUFDO0lBRU8sa0NBQWtDLENBQ3pDLFNBQXFCLEVBQ3JCLHNCQUFnQztRQUVoQyxJQUFJLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLHdDQUF3QyxFQUN4QyxrRkFBa0YsRUFDbEYsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ3pELENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUNDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUU7WUFDOUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU87WUFDdkMsaUNBQWlDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztZQUNyRCxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVksQ0FBQyxjQUFlLENBQUMsSUFBSSxDQUNuRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBUSxDQUFDLHdCQUF3QixDQUNqRixFQUNBLENBQUM7WUFDRixNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsQ0FDUCwrQkFBK0IsRUFDL0IsNkVBQTZFLEVBQzdFLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUN6RCxDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FDZCxRQUFRLENBQ1Asc0NBQXNDLEVBQ3RDLGdGQUFnRixFQUNoRixTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FDekQsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQywwQ0FBMEMsQ0FDOUMsU0FBUyxFQUNULElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFDbEMsc0JBQXNCLENBQ3RCLENBQUE7SUFDRixDQUFDO0lBRU8sMENBQTBDLENBQ2pELFNBQXFCLEVBQ3JCLDBCQUEyQyxFQUMzQyxzQkFBZ0M7UUFFaEMsUUFBUSwwQkFBMEIsRUFBRSxDQUFDO1lBQ3BDO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLHVDQUF1QyxFQUN2QyxpRkFBaUYsRUFDakYsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ3pELENBQ0QsQ0FBQTtZQUNGO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLG9DQUFvQyxFQUNwQyxtRUFBbUUsRUFDbkUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ3pELENBQ0QsQ0FBQTtZQUNGO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLDRDQUE0QyxFQUM1QywwRkFBMEYsRUFDMUYsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ3pELENBQ0QsQ0FBQTtZQUNGO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLHlDQUF5QyxFQUN6Qyx5RUFBeUUsRUFDekUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ3pELENBQ0QsQ0FBQTtZQUNGO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLCtDQUErQyxFQUMvQyxvRUFBb0UsRUFDcEUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ3pELENBQ0QsQ0FBQTtZQUNGO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLDRDQUE0QyxFQUM1QyxvRUFBb0UsRUFDcEUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ3pELENBQ0QsQ0FBQTtZQUNGO2dCQUNDLElBQUksc0JBQXNCLEVBQUUsQ0FBQztvQkFDNUIsTUFBSztnQkFDTixDQUFDO2dCQUNELDJFQUEyRTtnQkFDM0UsS0FBSyxNQUFNLFVBQVUsSUFBSSx3QkFBd0IsQ0FDaEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFDakMsU0FBUyxDQUNULEVBQUUsQ0FBQztvQkFDSCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQzt3QkFDaEMsU0FBUTtvQkFDVCxDQUFDO29CQUNELE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLHFDQUFxQyxFQUNyQyw0RkFBNEYsRUFDNUYsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQ3pELFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUMzRCxDQUNELENBQUE7Z0JBQ0YsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRU8sMkNBQTJDLENBQUMsU0FBcUI7UUFDeEUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBQ0QsSUFBSSxpQ0FBaUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUMzRCxNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsQ0FDUCw0Q0FBNEMsRUFDNUMsd0dBQXdHLEVBQ3hHLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUN6RCxDQUNELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsVUFBd0IsRUFBRSxRQUF5QjtRQUN0RSxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUU5QyxJQUNDLFFBQVEsNkNBQW9DO1lBQzVDLFFBQVEsOENBQXFDLEVBQzVDLENBQUM7WUFDRixVQUFVLENBQUMsSUFBSSxDQUNkLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUN2QyxVQUFVLEVBQ1YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFDakMsUUFBUSxFQUNSLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQ2xDLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FDZCxRQUFRLCtDQUFzQztZQUM5QyxRQUFRLDhDQUFxQyxDQUFBO1FBQzlDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7WUFDcEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsMkNBQTJDLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDNUQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFjLEVBQUUsQ0FBQTtRQUM1QixLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMxRCxJQUNDLGVBQWUsdURBQStDO2dCQUM5RCxxRUFBcUU7Z0JBQ3JFLENBQUMsZUFBZSwwREFBa0Q7b0JBQ2pFLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQ3BELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDVCxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx1REFBK0MsQ0FDckYsQ0FBQyxFQUNGLENBQUM7Z0JBQ0YsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsNEJBQTRCLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtnQkFDbEYsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDLENBQUE7WUFDakMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDckUsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN4RSxJQUFJLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sZ0NBQWdDLENBQ3ZDLFVBQXdCLEVBQ3hCLGFBQXdDLEVBQ3hDLGVBQWdDLEVBQ2hDLE9BQWlELEVBQ2pELFVBQXdCLEVBQUU7UUFFMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUMsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckIsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsS0FBSyxNQUFNLFNBQVMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3hCLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFpQixFQUFFLENBQUE7UUFDM0MsS0FBSyxNQUFNLFNBQVMsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUN2QywrQkFBK0I7WUFDL0IsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hGLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDckUsdUJBQXVCO1lBQ3ZCLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQztnQkFDL0QsU0FBUTtZQUNULENBQUM7WUFFRCw2REFBNkQ7WUFDN0QsSUFBSSwwQkFBMEIsb0RBQTRDLEVBQUUsQ0FBQztnQkFDNUUsU0FBUTtZQUNULENBQUM7WUFFRCw4REFBOEQ7WUFDOUQsSUFDQyxVQUFVLENBQUMsSUFBSSxDQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLE9BQU8sQ0FBQyxZQUFZO2dCQUNwQixDQUFDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQzdDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUMvQyxDQUFDO2dCQUNILENBQUMsT0FBTyxDQUFDLElBQUk7b0JBQ1osQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FDckMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQy9DLENBQUMsQ0FDSixFQUNBLENBQUM7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDaEQsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQ3JELENBQUE7Z0JBRUQsMkRBQTJEO2dCQUMzRCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ25DLENBQUM7Z0JBRUQsc0RBQXNEO3FCQUNqRCxDQUFDO29CQUNMLElBQUksQ0FBQzt3QkFDSixzREFBc0Q7d0JBQ3RELElBQUksQ0FBQywwQ0FBMEMsQ0FDOUMsU0FBUyxFQUNULDBCQUEwQixFQUMxQixJQUFJLENBQ0osQ0FBQTt3QkFDRCxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtvQkFDL0MsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQixjQUFjO29CQUNmLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixrQkFBa0IsQ0FBQyxJQUFJLENBQ3RCLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUN2QyxrQkFBa0IsRUFDbEIsYUFBYSxFQUNiLGVBQWUsRUFDZixPQUFPLEVBQ1AsT0FBTyxDQUNQLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLGtCQUFrQixDQUFBO0lBQzFCLENBQUM7SUFFTyx1QkFBdUIsQ0FDOUIsU0FBcUIsRUFDckIsUUFBeUI7UUFFekIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUV2RSxJQUFJLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMvQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUVELFFBQVEsUUFBUSxFQUFFLENBQUM7WUFDbEI7Z0JBQ0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDM0MsTUFBSztZQUNOO2dCQUNDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQzVDLE1BQUs7WUFDTjtnQkFDQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUN0RCxNQUFLO1lBQ047Z0JBQ0MsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDdkQsTUFBSztRQUNQLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVELFNBQVMsQ0FBQyxTQUFxQjtRQUM5QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDMUQsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELHdCQUF3QixDQUFDLGVBQWdDO1FBQ3hELE9BQU8sQ0FDTixlQUFlLGlEQUF5QztZQUN4RCxlQUFlLDhDQUFxQztZQUNwRCxlQUFlLDZDQUFvQyxDQUNuRCxDQUFBO0lBQ0YsQ0FBQztJQUVELGtCQUFrQixDQUFDLFNBQXFCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRU8sdUJBQXVCLENBQzlCLFNBQXFCLEVBQ3JCLFVBQXFDLEVBQ3JDLGFBQTRCLEVBQzVCLHdCQUEyRDtRQUUzRCx3QkFBd0IsR0FBRyx3QkFBd0IsSUFBSSxJQUFJLEdBQUcsRUFBK0IsQ0FBQTtRQUM3RixJQUFJLGVBQWUsR0FBRyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDN0QsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsT0FBTyxlQUFlLENBQUE7UUFDdkIsQ0FBQztRQUVELGVBQWUsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUVoRSxJQUFJLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUN0RSxlQUFlLDhDQUFzQyxDQUFBO1FBQ3RELENBQUM7YUFBTSxJQUNOLFNBQVM7WUFDVCxTQUFTLENBQUMsSUFBSSwrQkFBdUI7WUFDckMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLEVBQzFELENBQUM7WUFDRixlQUFlLDhDQUFzQyxDQUFBO1FBQ3RELENBQUM7YUFBTSxJQUFJLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QyxlQUFlLHFEQUE2QyxDQUFBO1FBQzdELENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3RFLGVBQWUsZ0RBQXdDLENBQUE7UUFDeEQsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDN0MsZUFBZSxnREFBd0MsQ0FBQTtRQUN4RCxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDekUsZUFBZSxxREFBNkMsQ0FBQTtRQUM3RCxDQUFDO2FBQU0sSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ3BGLGVBQWUscURBQTZDLENBQUE7UUFDN0QsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDdkQsZUFBZSxrREFBMEMsQ0FBQTtRQUMxRCxDQUFDO2FBQU0sSUFDTixTQUFTO1lBQ1QsSUFBSSxDQUFDLGdDQUFnQyxDQUNwQyxTQUFTLEVBQ1QsVUFBVSxFQUNWLGFBQWEsRUFDYix3QkFBd0IsQ0FDeEIsRUFDQSxDQUFDO1lBQ0YsZUFBZSx3REFBZ0QsQ0FBQTtRQUNoRSxDQUFDO2FBQU0sSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDMUQsZUFBZSwrQ0FBdUMsQ0FBQTtRQUN2RCxDQUFDO1FBRUQsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN4RCxPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsU0FBcUI7UUFDN0MsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUNwQyxPQUFPLENBQ04sQ0FBQyxTQUFTLENBQUMsU0FBUztnQkFDcEIsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FDakYsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNwRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7UUFFRCx5RkFBeUY7UUFDekYsSUFBSSxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxhQUFhLENBQUMsS0FBSyxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDMUUsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sZUFBZSxDQUFDLFNBQXFCO1FBQzVDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFBO1FBQ2xFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDdkYsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLDZCQUE2QixDQUNwQyxTQUFxQixFQUNyQixhQUE0QjtRQUU1QiwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFDQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsdUNBQXVDLENBQzlFLFNBQVMsQ0FBQyxRQUFRLENBQ2xCLEtBQUssS0FBSyxFQUNWLENBQUM7WUFDRixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxxREFBcUQ7UUFDckQsSUFDQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDO1lBQzVFLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEI7WUFDbkUsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQzFFLENBQUM7WUFDRixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxTQUFxQjtRQUN2RCxJQUNDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQywrQkFBK0I7WUFDckUsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixFQUNqRSxDQUFDO1lBQ0YsTUFBTSxlQUFlLEdBQ3BCLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUM3RSxLQUFLLE1BQU0sYUFBYSxJQUFJLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxnQkFBZ0IsQ0FDbkYsU0FBUyxDQUFDLFFBQVEsQ0FDbEIsRUFBRSxDQUFDO2dCQUNILElBQUksYUFBYSxLQUFLLElBQUksRUFBRSxDQUFDO29CQUM1QixJQUFJLGVBQWUsMkNBQW1DLEVBQUUsQ0FBQzt3QkFDeEQsT0FBTyxLQUFLLENBQUE7b0JBQ2IsQ0FBQztnQkFDRixDQUFDO2dCQUNELElBQUksYUFBYSxLQUFLLFdBQVcsRUFBRSxDQUFDO29CQUNuQyxJQUFJLGVBQWUsNENBQW9DLEVBQUUsQ0FBQzt3QkFDekQsT0FBTyxLQUFLLENBQUE7b0JBQ2IsQ0FBQztnQkFDRixDQUFDO2dCQUNELElBQUksYUFBYSxLQUFLLEtBQUssRUFBRSxDQUFDO29CQUM3QixJQUFJLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLEVBQUUsQ0FBQzt3QkFDbEYsSUFDQyxlQUFlLHlDQUFpQzs0QkFDaEQsZUFBZSw0Q0FBb0MsRUFDbEQsQ0FBQzs0QkFDRixPQUFPLEtBQUssQ0FBQTt3QkFDYixDQUFDO29CQUNGLENBQUM7eUJBQU0sSUFBSSxlQUFlLDJDQUFtQyxFQUFFLENBQUM7d0JBQy9ELE1BQU0sb0JBQW9CLEdBQ3pCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQ2pDLHNCQUFzQixDQUN0QixDQUFBO3dCQUNGLElBQUksb0JBQW9CLEtBQUssSUFBSSxJQUFJLG9CQUFvQixLQUFLLE1BQU0sRUFBRSxDQUFDOzRCQUN0RSxtREFBbUQ7NEJBQ25ELE9BQU8sS0FBSyxDQUFBO3dCQUNiLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLDJCQUEyQixDQUNsQyxTQUFxQixFQUNyQixhQUE0QjtRQUU1QixJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDL0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxDQUNOLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyx5Q0FBeUMsQ0FDaEYsU0FBUyxDQUFDLFFBQVEsQ0FDbEIsS0FBSyxLQUFLLENBQ1gsQ0FBQTtJQUNGLENBQUM7SUFFTyxnQ0FBZ0MsQ0FDdkMsU0FBcUIsRUFDckIsVUFBcUMsRUFDckMsYUFBNEIsRUFDNUIsd0JBQTBEO1FBRTFELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDL0MsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsMkVBQTJFO1FBQzNFLE1BQU0sb0JBQW9CLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3BELFNBQVMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUM3QyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ04saUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3ZDLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQztnQkFDckUsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQztnQkFDN0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FDekUsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sa0JBQWtCLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3pCLG9DQUFvQztZQUNwQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsU0FBUywyQ0FBa0MsQ0FBQTtRQUN6RSxDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0osS0FBSyxNQUFNLG1CQUFtQixJQUFJLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3hELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FDbkQsbUJBQW1CLEVBQ25CLFVBQVUsRUFDVixhQUFhLEVBQ2Isd0JBQXdCLENBQ3hCLENBQUE7Z0JBQ0QsSUFDQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUM7b0JBQy9DLGVBQWUsb0RBQTRDLEVBQzFELENBQUM7b0JBQ0YsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDekIseUJBQXlCO2dCQUN6Qix3QkFBd0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDM0MsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxVQUFnQztRQUMvRCxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2QixJQUNDLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3ZGLENBQUM7Z0JBQ0YsaURBQXVDO1lBQ3hDLENBQUM7WUFFRCxJQUNDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3hGLENBQUM7Z0JBQ0Ysa0RBQXdDO1lBQ3pDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxnREFBdUM7UUFDeEMsQ0FBQztRQUNELGdEQUFzQztJQUN2QyxDQUFDO0lBRU8sbUJBQW1CLENBQUMsVUFBZ0M7UUFDM0QsT0FBTyxJQUFJLENBQUMsZ0NBQWdDO2FBQzFDLHFCQUFxQixFQUFFO2FBQ3ZCLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFVBQWdDO1FBQ3hELElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMscUNBQXFDLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdEQsT0FBTyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNqRixDQUFDO0lBRU8saUJBQWlCLENBQUMsVUFBZ0M7UUFDekQsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN0RCxPQUFPLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUVPLDJCQUEyQixDQUFDLFVBQWdDO1FBQ25FLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLDRCQUE0QixDQUFDLFVBQWdDO1FBQ3BFLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMscUNBQXFDLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVPLGlDQUFpQyxDQUFDLFVBQWdDO1FBQ3pFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFDRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFBO1FBQ2pFLElBQUksa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDeEUsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ25DLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQy9DLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFTyxLQUFLLENBQUMsc0NBQXNDLENBQ25ELFVBQWdDO1FBRWhDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQTtRQUNqRSxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDaEUsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNuRCxJQUFJLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RELGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ25DLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO2dCQUMvQyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sZ0NBQWdDLENBQUMsVUFBZ0M7UUFDeEUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO1FBQy9ELElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdkUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2xDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQzdDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLHFDQUFxQyxDQUFDLFVBQWdDO1FBQzdFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtRQUMvRCxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDL0QsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNsRCxJQUFJLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RELGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUM3QyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRVMsOEJBQThCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxpQkFBeUM7UUFDdEUsSUFBSSxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFUywrQkFBK0I7UUFDeEMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVPLHNCQUFzQixDQUFDLGtCQUEwQztRQUN4RSxJQUFJLENBQUMsY0FBYyxDQUFDLGdDQUFnQyxFQUFFLGtCQUFrQixDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVPLGNBQWMsQ0FBQyxTQUFpQjtRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxpQ0FBeUIsQ0FBQTtJQUNsRSxDQUFDO0lBRU8sY0FBYyxDQUFDLFNBQWlCLEVBQUUsVUFBa0M7UUFDM0UsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFVBQVUsaUNBQXlCLENBQUE7SUFDdkUsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQ0FBc0MsQ0FDbkQsb0JBQXlELEVBQ3pELE1BQWU7UUFFZixJQUFJLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUN2QixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUM5QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FDbEYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FDeEMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUM1RCxDQUNELENBQUE7WUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQzdCLEtBQWdDLEVBQ2hDLE9BQWtDLEVBQ2xDLGVBQXdCO1FBRXhCLE1BQU0saUJBQWlCLEdBQWlCLEtBQUssQ0FBQyxNQUFNLENBQ25ELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDakUsQ0FBQTtRQUNELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFBO1FBQ3BFLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQzFGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMxRCxPQUFPLENBQ04sZUFBZSwwREFBa0Q7Z0JBQ2pFLGVBQWUsZ0RBQXdDO2dCQUN2RCxlQUFlLGdEQUF3QyxDQUN2RCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixLQUFLLE1BQU0sU0FBUyxJQUFJLDBCQUEwQixFQUFFLENBQUM7WUFDcEQsSUFDQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUN0QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FDN0QsRUFDQSxDQUFDO2dCQUNGLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUNELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDM0QsSUFDQywwQkFBMEIsQ0FBQyxLQUFLLENBQy9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUM3RCxFQUNBLENBQUM7Z0JBQ0YsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzdELENBQUM7SUFDRixDQUFDO0lBRU0sS0FBSyxDQUFDLG9EQUFvRDtRQUNoRSxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUU5QyxNQUFNLHVCQUF1QixHQUFHLENBQy9CLGFBQTRCLEVBQ00sRUFBRTtZQUNwQyxNQUFNLHFCQUFxQixHQUFHLElBQUksR0FBRyxFQUErQixDQUFBO1lBQ3BFLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO2dCQUMzRCxTQUFTO2dCQUNULElBQUksQ0FBQyx1QkFBdUIsQ0FDM0IsU0FBUyxFQUNULElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQ2pDLGFBQWEsRUFDYixxQkFBcUIsQ0FDckI7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUE7UUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUM3QyxNQUFNLG9DQUFvQyxHQUFHLHVCQUF1QixDQUFDO1lBQ3BFLEdBQUcsYUFBYTtZQUNoQixPQUFPLEVBQUUsSUFBSTtTQUNiLENBQUMsQ0FBQTtRQUNGLE1BQU0sc0NBQXNDLEdBQUcsdUJBQXVCLENBQUM7WUFDdEUsR0FBRyxhQUFhO1lBQ2hCLE9BQU8sRUFBRSxLQUFLO1NBQ2QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSx5Q0FBeUMsR0FBRyxvQ0FBb0M7YUFDcEYsTUFBTSxDQUNOLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQzlCLGVBQWUsS0FBSyxzQ0FBc0MsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDckU7YUFDQSxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVqQyxJQUFJLHlDQUF5QyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMseUNBQXlDLENBQUMsQ0FBQTtRQUMxRSxDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixPQUFPO1lBQ04sT0FBTyxFQUFFLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxrQkFBa0IsRUFBRTtZQUNsRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUMvRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxTQUErQjtRQUM3QyxJQUFJLENBQUMsc0NBQXNDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVPLCtCQUErQjtRQUN0QyxJQUFJLENBQUMsMkJBQTJCLEVBQUU7YUFDaEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCO2FBQy9FLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFTyxLQUFLLENBQUMsMkJBQTJCO1FBQ3hDLElBQUksQ0FBQztZQUNKLE1BQU0seUJBQXlCLEdBQzlCLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLDRCQUE0QixFQUFFLENBQUE7WUFDckUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2xGLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDM0MsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FDbkMsZ0NBQWdDLHFDQUVoQyxFQUFFLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyx3QkFBd0IsQ0FDL0IsVUFBd0Q7UUFFeEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDOUMsSUFDQyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUNyQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUNoRSxFQUNBLENBQUM7WUFDRixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsZ0NBQWdDLEVBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLG1FQUcxQixDQUFBO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBQ0QsQ0FBQTtBQXAvQlksMEJBQTBCO0lBZ0JwQyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsMkJBQTJCLENBQUE7SUFFM0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlDQUFpQyxDQUFBO0lBRWpDLFdBQUEsOEJBQThCLENBQUE7SUFFOUIsV0FBQSwyQkFBMkIsQ0FBQTtJQUUzQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFlBQUEseUJBQXlCLENBQUE7SUFDekIsWUFBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxZQUFBLDZCQUE2QixDQUFBO0lBRTdCLFlBQUEsbUNBQW1DLENBQUE7SUFFbkMsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLFdBQVcsQ0FBQTtHQTFDRCwwQkFBMEIsQ0FvL0J0Qzs7QUFFRCxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFFekMsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFjRCxZQUVDLDBCQUFpRixFQUVqRixnQ0FBb0YsRUFDdkUsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFMVSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXNDO1FBRWhFLHFDQUFnQyxHQUFoQyxnQ0FBZ0MsQ0FBbUM7UUFDdEQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQXRCOUMsZ0JBQVcsR0FBaUIsRUFBRSxDQUFBO1FBSzlCLDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzlDLElBQUksT0FBTyxFQUlQLENBQ0osQ0FBQTtRQUNRLDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFHMUQsYUFBUSxHQUFZLEtBQUssQ0FBQTtRQVVoQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDM0MsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVU7UUFDdkIsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLFdBQVcsR0FBRztnQkFDbEIsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN6RCxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEYsQ0FBQTtZQUNELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQixPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDdEIsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsZUFBZSxFQUFFLEtBQUs7YUFDdEIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDNUQsSUFBSSxDQUFDLGdCQUFnQixDQUNwQixDQUFDLENBQUMsTUFBTSxDQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUU7WUFDdkQsSUFBSSxLQUFLLElBQUksU0FBUyxxQ0FBNkIsRUFBRSxDQUFDO2dCQUNyRCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ25CLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDTixFQUFFLEVBQ0YsU0FBUyxFQUNULEtBQUssQ0FDTCxDQUNELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLE1BQU0sQ0FDWCxJQUFJLENBQUMsMEJBQTBCLENBQUMsdUJBQXVCLEVBQ3ZELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQ2YsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQ3BFLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO1lBQ2pGLElBQUksQ0FBQyxnQkFBZ0IsQ0FDcEIsS0FBSyxFQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFDM0MsTUFBTSxFQUNOLElBQUksQ0FDSixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsS0FBbUIsRUFDbkIsV0FBbUMsRUFDbkMsTUFBOEMsRUFDOUMsZUFBd0I7UUFFeEIsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxlQUFlLEdBQ3BCLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDOUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQ3ZDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUM7b0JBQ3JELElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7d0JBQ3BFLGVBQWUsQ0FDakIsQ0FBQTtnQkFDRCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsQixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUNoQyxDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQWlCLEVBQUUsQ0FBQTtRQUNoQyxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUN2QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQ2pGLENBQUE7WUFDRCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbkQsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFDdEUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBekhLLGlCQUFpQjtJQW1CcEIsV0FBQSxvQ0FBb0MsQ0FBQTtJQUVwQyxXQUFBLGlDQUFpQyxDQUFBO0lBRWpDLFdBQUEsV0FBVyxDQUFBO0dBdkJSLGlCQUFpQixDQXlIdEI7QUFFRCxpQkFBaUIsQ0FDaEIsb0NBQW9DLEVBQ3BDLDBCQUEwQixvQ0FFMUIsQ0FBQSJ9