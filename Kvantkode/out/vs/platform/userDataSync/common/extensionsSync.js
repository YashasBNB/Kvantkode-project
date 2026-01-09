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
import { Promises } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { Event } from '../../../base/common/event.js';
import { toFormattedString } from '../../../base/common/jsonFormatter.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { compare } from '../../../base/common/strings.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { GlobalExtensionEnablementService } from '../../extensionManagement/common/extensionEnablementService.js';
import { IExtensionGalleryService, IExtensionManagementService, ExtensionManagementError, DISABLED_EXTENSIONS_STORAGE_PATH, EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, EXTENSION_INSTALL_SOURCE_CONTEXT, EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, } from '../../extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../extensionManagement/common/extensionManagementUtil.js';
import { ExtensionStorageService, IExtensionStorageService, } from '../../extensionManagement/common/extensionStorage.js';
import { isApplicationScopedExtension, } from '../../extensions/common/extensions.js';
import { IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ServiceCollection } from '../../instantiation/common/serviceCollection.js';
import { ILogService } from '../../log/common/log.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractInitializer, AbstractSynchroniser, getSyncResourceLogLabel, } from './abstractSynchronizer.js';
import { merge } from './extensionsMerge.js';
import { IIgnoredExtensionsManagementService } from './ignoredExtensions.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME, } from './userDataSync.js';
import { IUserDataProfileStorageService } from '../../userDataProfile/common/userDataProfileStorageService.js';
async function parseAndMigrateExtensions(syncData, extensionManagementService) {
    const extensions = JSON.parse(syncData.content);
    if (syncData.version === 1 || syncData.version === 2) {
        const builtinExtensions = (await extensionManagementService.getInstalled(0 /* ExtensionType.System */)).filter((e) => e.isBuiltin);
        for (const extension of extensions) {
            // #region Migration from v1 (enabled -> disabled)
            if (syncData.version === 1) {
                if (extension.enabled === false) {
                    extension.disabled = true;
                }
                delete extension.enabled;
            }
            // #endregion
            // #region Migration from v2 (set installed property on extension)
            if (syncData.version === 2) {
                if (builtinExtensions.every((installed) => !areSameExtensions(installed.identifier, extension.identifier))) {
                    extension.installed = true;
                }
            }
            // #endregion
        }
    }
    return extensions;
}
export function parseExtensions(syncData) {
    return JSON.parse(syncData.content);
}
export function stringify(extensions, format) {
    extensions.sort((e1, e2) => {
        if (!e1.identifier.uuid && e2.identifier.uuid) {
            return -1;
        }
        if (e1.identifier.uuid && !e2.identifier.uuid) {
            return 1;
        }
        return compare(e1.identifier.id, e2.identifier.id);
    });
    return format ? toFormattedString(extensions, {}) : JSON.stringify(extensions);
}
let ExtensionsSynchroniser = class ExtensionsSynchroniser extends AbstractSynchroniser {
    constructor(
    // profileLocation changes for default profile
    profile, collection, environmentService, fileService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, extensionManagementService, ignoredExtensionsManagementService, logService, configurationService, userDataSyncEnablementService, telemetryService, extensionStorageService, uriIdentityService, userDataProfileStorageService, instantiationService) {
        super({ syncResource: "extensions" /* SyncResource.Extensions */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.extensionManagementService = extensionManagementService;
        this.ignoredExtensionsManagementService = ignoredExtensionsManagementService;
        this.instantiationService = instantiationService;
        /*
            Version 3 - Introduce installed property to skip installing built in extensions
            protected readonly version: number = 3;
        */
        /* Version 4: Change settings from `sync.${setting}` to `settingsSync.{setting}` */
        /* Version 5: Introduce extension state */
        /* Version 6: Added isApplicationScoped property */
        this.version = 6;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'extensions.json');
        this.baseResource = this.previewResource.with({
            scheme: USER_DATA_SYNC_SCHEME,
            authority: 'base',
        });
        this.localResource = this.previewResource.with({
            scheme: USER_DATA_SYNC_SCHEME,
            authority: 'local',
        });
        this.remoteResource = this.previewResource.with({
            scheme: USER_DATA_SYNC_SCHEME,
            authority: 'remote',
        });
        this.acceptedResource = this.previewResource.with({
            scheme: USER_DATA_SYNC_SCHEME,
            authority: 'accepted',
        });
        this.localExtensionsProvider = this.instantiationService.createInstance(LocalExtensionsProvider);
        this._register(Event.any(Event.filter(this.extensionManagementService.onDidInstallExtensions, (e) => e.some(({ local }) => !!local)), Event.filter(this.extensionManagementService.onDidUninstallExtension, (e) => !e.error), Event.filter(userDataProfileStorageService.onDidChange, (e) => e.valueChanges.some(({ profile, changes }) => this.syncResource.profile.id === profile.id &&
            changes.some((change) => change.key === DISABLED_EXTENSIONS_STORAGE_PATH))), extensionStorageService.onDidChangeExtensionStorageToSync)(() => this.triggerLocalChange()));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData) {
        const remoteExtensions = remoteUserData.syncData
            ? await parseAndMigrateExtensions(remoteUserData.syncData, this.extensionManagementService)
            : null;
        const skippedExtensions = lastSyncUserData?.skippedExtensions ?? [];
        const builtinExtensions = lastSyncUserData?.builtinExtensions ?? null;
        const lastSyncExtensions = lastSyncUserData?.syncData
            ? await parseAndMigrateExtensions(lastSyncUserData.syncData, this.extensionManagementService)
            : null;
        const { localExtensions, ignoredExtensions } = await this.localExtensionsProvider.getLocalExtensions(this.syncResource.profile);
        if (remoteExtensions) {
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote extensions with local extensions...`);
        }
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote extensions does not exist. Synchronizing extensions for the first time.`);
        }
        const { local, remote } = merge(localExtensions, remoteExtensions, lastSyncExtensions, skippedExtensions, ignoredExtensions, builtinExtensions);
        const previewResult = {
            local,
            remote,
            content: this.getPreviewContent(localExtensions, local.added, local.updated, local.removed),
            localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0
                ? 2 /* Change.Modified */
                : 0 /* Change.None */,
            remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
        const localContent = this.stringify(localExtensions, false);
        return [
            {
                skippedExtensions,
                builtinExtensions,
                baseResource: this.baseResource,
                baseContent: lastSyncExtensions ? this.stringify(lastSyncExtensions, false) : localContent,
                localResource: this.localResource,
                localContent,
                localExtensions,
                remoteResource: this.remoteResource,
                remoteExtensions,
                remoteContent: remoteExtensions ? this.stringify(remoteExtensions, false) : null,
                previewResource: this.previewResource,
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.acceptedResource,
            },
        ];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncExtensions = lastSyncUserData.syncData
            ? await parseAndMigrateExtensions(lastSyncUserData.syncData, this.extensionManagementService)
            : null;
        const { localExtensions, ignoredExtensions } = await this.localExtensionsProvider.getLocalExtensions(this.syncResource.profile);
        const { remote } = merge(localExtensions, lastSyncExtensions, lastSyncExtensions, lastSyncUserData.skippedExtensions || [], ignoredExtensions, lastSyncUserData.builtinExtensions || []);
        return remote !== null;
    }
    getPreviewContent(localExtensions, added, updated, removed) {
        const preview = [...added, ...updated];
        const idsOrUUIDs = new Set();
        const addIdentifier = (identifier) => {
            idsOrUUIDs.add(identifier.id.toLowerCase());
            if (identifier.uuid) {
                idsOrUUIDs.add(identifier.uuid);
            }
        };
        preview.forEach(({ identifier }) => addIdentifier(identifier));
        removed.forEach(addIdentifier);
        for (const localExtension of localExtensions) {
            if (idsOrUUIDs.has(localExtension.identifier.id.toLowerCase()) ||
                (localExtension.identifier.uuid && idsOrUUIDs.has(localExtension.identifier.uuid))) {
                // skip
                continue;
            }
            preview.push(localExtension);
        }
        return this.stringify(preview, false);
    }
    async getMergeResult(resourcePreview, token) {
        return { ...resourcePreview.previewResult, hasConflicts: false };
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        /* Accept local resource */
        if (this.extUri.isEqual(resource, this.localResource)) {
            return this.acceptLocal(resourcePreview);
        }
        /* Accept remote resource */
        if (this.extUri.isEqual(resource, this.remoteResource)) {
            return this.acceptRemote(resourcePreview);
        }
        /* Accept preview resource */
        if (this.extUri.isEqual(resource, this.previewResource)) {
            return resourcePreview.previewResult;
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async acceptLocal(resourcePreview) {
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, this.syncResource.profile.extensionsResource);
        const ignoredExtensions = this.ignoredExtensionsManagementService.getIgnoredExtensions(installedExtensions);
        const remoteExtensions = resourcePreview.remoteContent
            ? JSON.parse(resourcePreview.remoteContent)
            : null;
        const mergeResult = merge(resourcePreview.localExtensions, remoteExtensions, remoteExtensions, resourcePreview.skippedExtensions, ignoredExtensions, resourcePreview.builtinExtensions);
        const { local, remote } = mergeResult;
        return {
            content: resourcePreview.localContent,
            local,
            remote,
            localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0
                ? 2 /* Change.Modified */
                : 0 /* Change.None */,
            remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
    }
    async acceptRemote(resourcePreview) {
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, this.syncResource.profile.extensionsResource);
        const ignoredExtensions = this.ignoredExtensionsManagementService.getIgnoredExtensions(installedExtensions);
        const remoteExtensions = resourcePreview.remoteContent
            ? JSON.parse(resourcePreview.remoteContent)
            : null;
        if (remoteExtensions !== null) {
            const mergeResult = merge(resourcePreview.localExtensions, remoteExtensions, resourcePreview.localExtensions, [], ignoredExtensions, resourcePreview.builtinExtensions);
            const { local, remote } = mergeResult;
            return {
                content: resourcePreview.remoteContent,
                local,
                remote,
                localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0
                    ? 2 /* Change.Modified */
                    : 0 /* Change.None */,
                remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
            };
        }
        else {
            return {
                content: resourcePreview.remoteContent,
                local: { added: [], removed: [], updated: [] },
                remote: null,
                localChange: 0 /* Change.None */,
                remoteChange: 0 /* Change.None */,
            };
        }
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        let { skippedExtensions, builtinExtensions, localExtensions } = resourcePreviews[0][0];
        const { local, remote, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing extensions.`);
        }
        if (localChange !== 0 /* Change.None */) {
            await this.backupLocal(JSON.stringify(localExtensions));
            skippedExtensions = await this.localExtensionsProvider.updateLocalExtensions(local.added, local.removed, local.updated, skippedExtensions, this.syncResource.profile);
        }
        if (remote) {
            // update remote
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote extensions...`);
            const content = JSON.stringify(remote.all);
            remoteUserData = await this.updateRemoteUserData(content, force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote extensions.${remote.added.length ? ` Added: ${JSON.stringify(remote.added.map((e) => e.identifier.id))}.` : ''}${remote.updated.length ? ` Updated: ${JSON.stringify(remote.updated.map((e) => e.identifier.id))}.` : ''}${remote.removed.length ? ` Removed: ${JSON.stringify(remote.removed.map((e) => e.identifier.id))}.` : ''}`);
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized extensions...`);
            builtinExtensions = this.computeBuiltinExtensions(localExtensions, builtinExtensions);
            await this.updateLastSyncUserData(remoteUserData, { skippedExtensions, builtinExtensions });
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized extensions.${skippedExtensions.length ? ` Skipped: ${JSON.stringify(skippedExtensions.map((e) => e.identifier.id))}.` : ''}`);
        }
    }
    computeBuiltinExtensions(localExtensions, previousBuiltinExtensions) {
        const localExtensionsSet = new Set();
        const builtinExtensions = [];
        for (const localExtension of localExtensions) {
            localExtensionsSet.add(localExtension.identifier.id.toLowerCase());
            if (!localExtension.installed) {
                builtinExtensions.push(localExtension.identifier);
            }
        }
        if (previousBuiltinExtensions) {
            for (const builtinExtension of previousBuiltinExtensions) {
                // Add previous builtin extension if it does not exist in local extensions
                if (!localExtensionsSet.has(builtinExtension.id.toLowerCase())) {
                    builtinExtensions.push(builtinExtension);
                }
            }
        }
        return builtinExtensions;
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri) ||
            this.extUri.isEqual(this.baseResource, uri) ||
            this.extUri.isEqual(this.localResource, uri) ||
            this.extUri.isEqual(this.acceptedResource, uri)) {
            const content = await this.resolvePreviewContent(uri);
            return content ? this.stringify(JSON.parse(content), true) : content;
        }
        return null;
    }
    stringify(extensions, format) {
        return stringify(extensions, format);
    }
    async hasLocalData() {
        try {
            const { localExtensions } = await this.localExtensionsProvider.getLocalExtensions(this.syncResource.profile);
            if (localExtensions.some((e) => e.installed || e.disabled)) {
                return true;
            }
        }
        catch (error) {
            /* ignore error */
        }
        return false;
    }
};
ExtensionsSynchroniser = __decorate([
    __param(2, IEnvironmentService),
    __param(3, IFileService),
    __param(4, IStorageService),
    __param(5, IUserDataSyncStoreService),
    __param(6, IUserDataSyncLocalStoreService),
    __param(7, IExtensionManagementService),
    __param(8, IIgnoredExtensionsManagementService),
    __param(9, IUserDataSyncLogService),
    __param(10, IConfigurationService),
    __param(11, IUserDataSyncEnablementService),
    __param(12, ITelemetryService),
    __param(13, IExtensionStorageService),
    __param(14, IUriIdentityService),
    __param(15, IUserDataProfileStorageService),
    __param(16, IInstantiationService)
], ExtensionsSynchroniser);
export { ExtensionsSynchroniser };
let LocalExtensionsProvider = class LocalExtensionsProvider {
    constructor(extensionManagementService, userDataProfileStorageService, extensionGalleryService, ignoredExtensionsManagementService, instantiationService, logService) {
        this.extensionManagementService = extensionManagementService;
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.extensionGalleryService = extensionGalleryService;
        this.ignoredExtensionsManagementService = ignoredExtensionsManagementService;
        this.instantiationService = instantiationService;
        this.logService = logService;
    }
    async getLocalExtensions(profile) {
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, profile.extensionsResource);
        const ignoredExtensions = this.ignoredExtensionsManagementService.getIgnoredExtensions(installedExtensions);
        const localExtensions = await this.withProfileScopedServices(profile, async (extensionEnablementService, extensionStorageService) => {
            const disabledExtensions = extensionEnablementService.getDisabledExtensions();
            return installedExtensions.map((extension) => {
                const { identifier, isBuiltin, manifest, preRelease, pinned, isApplicationScoped } = extension;
                const syncExntesion = {
                    identifier,
                    preRelease,
                    version: manifest.version,
                    pinned: !!pinned,
                };
                if (isApplicationScoped && !isApplicationScopedExtension(manifest)) {
                    syncExntesion.isApplicationScoped = isApplicationScoped;
                }
                if (disabledExtensions.some((disabledExtension) => areSameExtensions(disabledExtension, identifier))) {
                    syncExntesion.disabled = true;
                }
                if (!isBuiltin) {
                    syncExntesion.installed = true;
                }
                try {
                    const keys = extensionStorageService.getKeysForSync({
                        id: identifier.id,
                        version: manifest.version,
                    });
                    if (keys) {
                        const extensionStorageState = extensionStorageService.getExtensionState(extension, true) || {};
                        syncExntesion.state = Object.keys(extensionStorageState).reduce((state, key) => {
                            if (keys.includes(key)) {
                                state[key] = extensionStorageState[key];
                            }
                            return state;
                        }, {});
                    }
                }
                catch (error) {
                    this.logService.info(`${getSyncResourceLogLabel("extensions" /* SyncResource.Extensions */, profile)}: Error while parsing extension state`, getErrorMessage(error));
                }
                return syncExntesion;
            });
        });
        return { localExtensions, ignoredExtensions };
    }
    async updateLocalExtensions(added, removed, updated, skippedExtensions, profile) {
        const syncResourceLogLabel = getSyncResourceLogLabel("extensions" /* SyncResource.Extensions */, profile);
        const extensionsToInstall = [];
        const syncExtensionsToInstall = new Map();
        const removeFromSkipped = [];
        const addToSkipped = [];
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, profile.extensionsResource);
        // 1. Sync extensions state first so that the storage is flushed and updated in all opened windows
        if (added.length || updated.length) {
            await this.withProfileScopedServices(profile, async (extensionEnablementService, extensionStorageService) => {
                await Promises.settled([...added, ...updated].map(async (e) => {
                    const installedExtension = installedExtensions.find((installed) => areSameExtensions(installed.identifier, e.identifier));
                    // Builtin Extension Sync: Enablement & State
                    if (installedExtension && installedExtension.isBuiltin) {
                        if (e.state && installedExtension.manifest.version === e.version) {
                            this.updateExtensionState(e.state, installedExtension, installedExtension.manifest.version, extensionStorageService);
                        }
                        const isDisabled = extensionEnablementService
                            .getDisabledExtensions()
                            .some((disabledExtension) => areSameExtensions(disabledExtension, e.identifier));
                        if (isDisabled !== !!e.disabled) {
                            if (e.disabled) {
                                this.logService.trace(`${syncResourceLogLabel}: Disabling extension...`, e.identifier.id);
                                await extensionEnablementService.disableExtension(e.identifier);
                                this.logService.info(`${syncResourceLogLabel}: Disabled extension`, e.identifier.id);
                            }
                            else {
                                this.logService.trace(`${syncResourceLogLabel}: Enabling extension...`, e.identifier.id);
                                await extensionEnablementService.enableExtension(e.identifier);
                                this.logService.info(`${syncResourceLogLabel}: Enabled extension`, e.identifier.id);
                            }
                        }
                        removeFromSkipped.push(e.identifier);
                        return;
                    }
                    // User Extension Sync: Install/Update, Enablement & State
                    const version = e.pinned ? e.version : undefined;
                    const extension = (await this.extensionGalleryService.getExtensions([{ ...e.identifier, version, preRelease: version ? undefined : e.preRelease }], CancellationToken.None))[0];
                    /* Update extension state only if
                     *	extension is installed and version is same as synced version or
                     *	extension is not installed and installable
                     */
                    if (e.state &&
                        (installedExtension
                            ? installedExtension.manifest.version ===
                                e.version /* Installed and remote has same version */
                            : !!extension) /* Installable */) {
                        this.updateExtensionState(e.state, installedExtension || extension, installedExtension?.manifest.version, extensionStorageService);
                    }
                    if (extension) {
                        try {
                            const isDisabled = extensionEnablementService
                                .getDisabledExtensions()
                                .some((disabledExtension) => areSameExtensions(disabledExtension, e.identifier));
                            if (isDisabled !== !!e.disabled) {
                                if (e.disabled) {
                                    this.logService.trace(`${syncResourceLogLabel}: Disabling extension...`, e.identifier.id, extension.version);
                                    await extensionEnablementService.disableExtension(extension.identifier);
                                    this.logService.info(`${syncResourceLogLabel}: Disabled extension`, e.identifier.id, extension.version);
                                }
                                else {
                                    this.logService.trace(`${syncResourceLogLabel}: Enabling extension...`, e.identifier.id, extension.version);
                                    await extensionEnablementService.enableExtension(extension.identifier);
                                    this.logService.info(`${syncResourceLogLabel}: Enabled extension`, e.identifier.id, extension.version);
                                }
                            }
                            if (!installedExtension || // Install if the extension does not exist
                                installedExtension.preRelease !== e.preRelease || // Install if the extension pre-release preference has changed
                                installedExtension.pinned !== e.pinned || // Install if the extension pinned preference has changed
                                (version && installedExtension.manifest.version !== version) // Install if the extension version has changed
                            ) {
                                if ((await this.extensionManagementService.canInstall(extension)) === true) {
                                    extensionsToInstall.push({
                                        extension,
                                        options: {
                                            isMachineScoped: false /* set isMachineScoped value to prevent install and sync dialog in web */,
                                            donotIncludePackAndDependencies: true,
                                            installGivenVersion: e.pinned && !!e.version,
                                            pinned: e.pinned,
                                            installPreReleaseVersion: e.preRelease,
                                            preRelease: e.preRelease,
                                            profileLocation: profile.extensionsResource,
                                            isApplicationScoped: e.isApplicationScoped,
                                            context: {
                                                [EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT]: true,
                                                [EXTENSION_INSTALL_SOURCE_CONTEXT]: "settingsSync" /* ExtensionInstallSource.SETTINGS_SYNC */,
                                                [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true,
                                            },
                                        },
                                    });
                                    syncExtensionsToInstall.set(extension.identifier.id.toLowerCase(), e);
                                }
                                else {
                                    this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension because it cannot be installed.`, extension.displayName || extension.identifier.id);
                                    addToSkipped.push(e);
                                }
                            }
                        }
                        catch (error) {
                            addToSkipped.push(e);
                            this.logService.error(error);
                            this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension`, extension.displayName || extension.identifier.id);
                        }
                    }
                    else {
                        addToSkipped.push(e);
                        this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension because the extension is not found.`, e.identifier.id);
                    }
                }));
            });
        }
        // 2. Next uninstall the removed extensions
        if (removed.length) {
            const extensionsToRemove = installedExtensions.filter(({ identifier, isBuiltin }) => !isBuiltin && removed.some((r) => areSameExtensions(identifier, r)));
            await Promises.settled(extensionsToRemove.map(async (extensionToRemove) => {
                this.logService.trace(`${syncResourceLogLabel}: Uninstalling local extension...`, extensionToRemove.identifier.id);
                await this.extensionManagementService.uninstall(extensionToRemove, {
                    donotIncludePack: true,
                    donotCheckDependents: true,
                    profileLocation: profile.extensionsResource,
                });
                this.logService.info(`${syncResourceLogLabel}: Uninstalled local extension.`, extensionToRemove.identifier.id);
                removeFromSkipped.push(extensionToRemove.identifier);
            }));
        }
        // 3. Install extensions at the end
        const results = await this.extensionManagementService.installGalleryExtensions(extensionsToInstall);
        for (const { identifier, local, error, source } of results) {
            const gallery = source;
            if (local) {
                this.logService.info(`${syncResourceLogLabel}: Installed extension.`, identifier.id, gallery.version);
                removeFromSkipped.push(identifier);
            }
            else {
                const e = syncExtensionsToInstall.get(identifier.id.toLowerCase());
                if (e) {
                    addToSkipped.push(e);
                    this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension`, gallery.displayName || gallery.identifier.id);
                }
                if (error instanceof ExtensionManagementError &&
                    [
                        "Incompatible" /* ExtensionManagementErrorCode.Incompatible */,
                        "IncompatibleApi" /* ExtensionManagementErrorCode.IncompatibleApi */,
                        "IncompatibleTargetPlatform" /* ExtensionManagementErrorCode.IncompatibleTargetPlatform */,
                    ].includes(error.code)) {
                    this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension because the compatible extension is not found.`, gallery.displayName || gallery.identifier.id);
                }
                else if (error) {
                    this.logService.error(error);
                }
            }
        }
        const newSkippedExtensions = [];
        for (const skippedExtension of skippedExtensions) {
            if (!removeFromSkipped.some((e) => areSameExtensions(e, skippedExtension.identifier))) {
                newSkippedExtensions.push(skippedExtension);
            }
        }
        for (const skippedExtension of addToSkipped) {
            if (!newSkippedExtensions.some((e) => areSameExtensions(e.identifier, skippedExtension.identifier))) {
                newSkippedExtensions.push(skippedExtension);
            }
        }
        return newSkippedExtensions;
    }
    updateExtensionState(state, extension, version, extensionStorageService) {
        const extensionState = extensionStorageService.getExtensionState(extension, true) || {};
        const keys = version
            ? extensionStorageService.getKeysForSync({ id: extension.identifier.id, version })
            : undefined;
        if (keys) {
            keys.forEach((key) => {
                extensionState[key] = state[key];
            });
        }
        else {
            Object.keys(state).forEach((key) => (extensionState[key] = state[key]));
        }
        extensionStorageService.setExtensionState(extension, extensionState, true);
    }
    async withProfileScopedServices(profile, fn) {
        return this.userDataProfileStorageService.withProfileScopedStorageService(profile, async (storageService) => {
            const disposables = new DisposableStore();
            const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IStorageService, storageService])));
            const extensionEnablementService = disposables.add(instantiationService.createInstance(GlobalExtensionEnablementService));
            const extensionStorageService = disposables.add(instantiationService.createInstance(ExtensionStorageService));
            try {
                return await fn(extensionEnablementService, extensionStorageService);
            }
            finally {
                disposables.dispose();
            }
        });
    }
};
LocalExtensionsProvider = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IUserDataProfileStorageService),
    __param(2, IExtensionGalleryService),
    __param(3, IIgnoredExtensionsManagementService),
    __param(4, IInstantiationService),
    __param(5, IUserDataSyncLogService)
], LocalExtensionsProvider);
export { LocalExtensionsProvider };
let AbstractExtensionsInitializer = class AbstractExtensionsInitializer extends AbstractInitializer {
    constructor(extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("extensions" /* SyncResource.Extensions */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
        this.extensionManagementService = extensionManagementService;
        this.ignoredExtensionsManagementService = ignoredExtensionsManagementService;
    }
    async parseExtensions(remoteUserData) {
        return remoteUserData.syncData
            ? await parseAndMigrateExtensions(remoteUserData.syncData, this.extensionManagementService)
            : null;
    }
    generatePreview(remoteExtensions, localExtensions) {
        const installedExtensions = [];
        const newExtensions = [];
        const disabledExtensions = [];
        for (const extension of remoteExtensions) {
            if (this.ignoredExtensionsManagementService.hasToNeverSyncExtension(extension.identifier.id)) {
                // Skip extension ignored to sync
                continue;
            }
            const installedExtension = localExtensions.find((i) => areSameExtensions(i.identifier, extension.identifier));
            if (installedExtension) {
                installedExtensions.push(installedExtension);
                if (extension.disabled) {
                    disabledExtensions.push(extension.identifier);
                }
            }
            else if (extension.installed) {
                newExtensions.push({ ...extension.identifier, preRelease: !!extension.preRelease });
                if (extension.disabled) {
                    disabledExtensions.push(extension.identifier);
                }
            }
        }
        return { installedExtensions, newExtensions, disabledExtensions, remoteExtensions };
    }
};
AbstractExtensionsInitializer = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IIgnoredExtensionsManagementService),
    __param(2, IFileService),
    __param(3, IUserDataProfilesService),
    __param(4, IEnvironmentService),
    __param(5, ILogService),
    __param(6, IStorageService),
    __param(7, IUriIdentityService)
], AbstractExtensionsInitializer);
export { AbstractExtensionsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1N5bmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vZXh0ZW5zaW9uc1N5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNqSCxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixFQUczQix3QkFBd0IsRUFHeEIsZ0NBQWdDLEVBQ2hDLDBDQUEwQyxFQUMxQyxnQ0FBZ0MsRUFHaEMsOENBQThDLEdBQzlDLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDL0YsT0FBTyxFQUNOLHVCQUF1QixFQUN2Qix3QkFBd0IsR0FDeEIsTUFBTSxzREFBc0QsQ0FB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