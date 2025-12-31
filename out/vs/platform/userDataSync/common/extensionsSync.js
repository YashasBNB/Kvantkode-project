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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1N5bmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL2V4dGVuc2lvbnNTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDakgsT0FBTyxFQUNOLHdCQUF3QixFQUN4QiwyQkFBMkIsRUFHM0Isd0JBQXdCLEVBR3hCLGdDQUFnQyxFQUNoQywwQ0FBMEMsRUFDMUMsZ0NBQWdDLEVBR2hDLDhDQUE4QyxHQUM5QyxNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQy9GLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsd0JBQXdCLEdBQ3hCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUdOLDRCQUE0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