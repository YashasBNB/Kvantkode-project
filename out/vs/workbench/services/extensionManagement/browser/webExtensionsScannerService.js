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
import { IBuiltinExtensionsScannerService, parseEnabledApiProposalNames, } from '../../../../platform/extensions/common/extensions.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IWebExtensionsScannerService, } from '../common/extensionManagement.js';
import { isWeb, Language } from '../../../../base/common/platform.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { Queue } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IExtensionGalleryService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions, getGalleryExtensionId, getExtensionId, isMalicious, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localizeManifest, } from '../../../../platform/extensionManagement/common/extensionNls.js';
import { localize, localize2 } from '../../../../nls.js';
import * as semver from '../../../../base/common/semver/semver.js';
import { isString, isUndefined } from '../../../../base/common/types.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IExtensionResourceLoaderService, migratePlatformSpecificExtensionGalleryResourceURL, } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { basename } from '../../../../base/common/path.js';
import { IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { validateExtensionManifest } from '../../../../platform/extensions/common/extensionValidator.js';
import Severity from '../../../../base/common/severity.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
function isGalleryExtensionInfo(obj) {
    const galleryExtensionInfo = obj;
    return (typeof galleryExtensionInfo?.id === 'string' &&
        (galleryExtensionInfo.preRelease === undefined ||
            typeof galleryExtensionInfo.preRelease === 'boolean') &&
        (galleryExtensionInfo.migrateStorageFrom === undefined ||
            typeof galleryExtensionInfo.migrateStorageFrom === 'string'));
}
function isUriComponents(thing) {
    if (!thing) {
        return false;
    }
    return isString(thing.path) && isString(thing.scheme);
}
let WebExtensionsScannerService = class WebExtensionsScannerService extends Disposable {
    constructor(environmentService, builtinExtensionsScannerService, fileService, logService, galleryService, extensionManifestPropertiesService, extensionResourceLoaderService, extensionStorageService, storageService, productService, userDataProfilesService, uriIdentityService, lifecycleService) {
        super();
        this.environmentService = environmentService;
        this.builtinExtensionsScannerService = builtinExtensionsScannerService;
        this.fileService = fileService;
        this.logService = logService;
        this.galleryService = galleryService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.extensionStorageService = extensionStorageService;
        this.storageService = storageService;
        this.productService = productService;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.systemExtensionsCacheResource = undefined;
        this.customBuiltinExtensionsCacheResource = undefined;
        this.resourcesAccessQueueMap = new ResourceMap();
        if (isWeb) {
            this.systemExtensionsCacheResource = joinPath(environmentService.userRoamingDataHome, 'systemExtensionsCache.json');
            this.customBuiltinExtensionsCacheResource = joinPath(environmentService.userRoamingDataHome, 'customBuiltinExtensionsCache.json');
            // Eventually update caches
            lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(() => this.updateCaches());
        }
        this.extensionsEnabledWithApiProposalVersion =
            productService.extensionsEnabledWithApiProposalVersion?.map((id) => id.toLowerCase()) ?? [];
    }
    readCustomBuiltinExtensionsInfoFromEnv() {
        if (!this._customBuiltinExtensionsInfoPromise) {
            this._customBuiltinExtensionsInfoPromise = (async () => {
                let extensions = [];
                const extensionLocations = [];
                const extensionGalleryResources = [];
                const extensionsToMigrate = [];
                const customBuiltinExtensionsInfo = this.environmentService.options &&
                    Array.isArray(this.environmentService.options.additionalBuiltinExtensions)
                    ? this.environmentService.options.additionalBuiltinExtensions.map((additionalBuiltinExtension) => isString(additionalBuiltinExtension)
                        ? { id: additionalBuiltinExtension }
                        : additionalBuiltinExtension)
                    : [];
                for (const e of customBuiltinExtensionsInfo) {
                    if (isGalleryExtensionInfo(e)) {
                        extensions.push({ id: e.id, preRelease: !!e.preRelease });
                        if (e.migrateStorageFrom) {
                            extensionsToMigrate.push([e.migrateStorageFrom, e.id]);
                        }
                    }
                    else if (isUriComponents(e)) {
                        const extensionLocation = URI.revive(e);
                        if (await this.extensionResourceLoaderService.isExtensionGalleryResource(extensionLocation)) {
                            extensionGalleryResources.push(extensionLocation);
                        }
                        else {
                            extensionLocations.push(extensionLocation);
                        }
                    }
                }
                if (extensions.length) {
                    extensions = await this.checkAdditionalBuiltinExtensions(extensions);
                }
                if (extensions.length) {
                    this.logService.info('Found additional builtin gallery extensions in env', extensions);
                }
                if (extensionLocations.length) {
                    this.logService.info('Found additional builtin location extensions in env', extensionLocations.map((e) => e.toString()));
                }
                if (extensionGalleryResources.length) {
                    this.logService.info('Found additional builtin extension gallery resources in env', extensionGalleryResources.map((e) => e.toString()));
                }
                return { extensions, extensionsToMigrate, extensionLocations, extensionGalleryResources };
            })();
        }
        return this._customBuiltinExtensionsInfoPromise;
    }
    async checkAdditionalBuiltinExtensions(extensions) {
        const extensionsControlManifest = await this.galleryService.getExtensionsControlManifest();
        const result = [];
        for (const extension of extensions) {
            if (isMalicious({ id: extension.id }, extensionsControlManifest.malicious)) {
                this.logService.info(`Checking additional builtin extensions: Ignoring '${extension.id}' because it is reported to be malicious.`);
                continue;
            }
            const deprecationInfo = extensionsControlManifest.deprecated[extension.id.toLowerCase()];
            if (deprecationInfo?.extension?.autoMigrate) {
                const preReleaseExtensionId = deprecationInfo.extension.id;
                this.logService.info(`Checking additional builtin extensions: '${extension.id}' is deprecated, instead using '${preReleaseExtensionId}'`);
                result.push({ id: preReleaseExtensionId, preRelease: !!extension.preRelease });
            }
            else {
                result.push(extension);
            }
        }
        return result;
    }
    /**
     * All system extensions bundled with the product
     */
    async readSystemExtensions() {
        const systemExtensions = await this.builtinExtensionsScannerService.scanBuiltinExtensions();
        const cachedSystemExtensions = await Promise.all((await this.readSystemExtensionsCache()).map((e) => this.toScannedExtension(e, true, 0 /* ExtensionType.System */)));
        const result = new Map();
        for (const extension of [...systemExtensions, ...cachedSystemExtensions]) {
            const existing = result.get(extension.identifier.id.toLowerCase());
            if (existing) {
                // Incase there are duplicates always take the latest version
                if (semver.gt(existing.manifest.version, extension.manifest.version)) {
                    continue;
                }
            }
            result.set(extension.identifier.id.toLowerCase(), extension);
        }
        return [...result.values()];
    }
    /**
     * All extensions defined via `additionalBuiltinExtensions` API
     */
    async readCustomBuiltinExtensions(scanOptions) {
        const [customBuiltinExtensionsFromLocations, customBuiltinExtensionsFromGallery] = await Promise.all([
            this.getCustomBuiltinExtensionsFromLocations(scanOptions),
            this.getCustomBuiltinExtensionsFromGallery(scanOptions),
        ]);
        const customBuiltinExtensions = [
            ...customBuiltinExtensionsFromLocations,
            ...customBuiltinExtensionsFromGallery,
        ];
        await this.migrateExtensionsStorage(customBuiltinExtensions);
        return customBuiltinExtensions;
    }
    async getCustomBuiltinExtensionsFromLocations(scanOptions) {
        const { extensionLocations } = await this.readCustomBuiltinExtensionsInfoFromEnv();
        if (!extensionLocations.length) {
            return [];
        }
        const result = [];
        await Promise.allSettled(extensionLocations.map(async (extensionLocation) => {
            try {
                const webExtension = await this.toWebExtension(extensionLocation);
                const extension = await this.toScannedExtension(webExtension, true);
                if (extension.isValid || !scanOptions?.skipInvalidExtensions) {
                    result.push(extension);
                }
                else {
                    this.logService.info(`Skipping invalid additional builtin extension ${webExtension.identifier.id}`);
                }
            }
            catch (error) {
                this.logService.info(`Error while fetching the additional builtin extension ${extensionLocation.toString()}.`, getErrorMessage(error));
            }
        }));
        return result;
    }
    async getCustomBuiltinExtensionsFromGallery(scanOptions) {
        if (!this.galleryService.isEnabled()) {
            this.logService.info('Ignoring fetching additional builtin extensions from gallery as it is disabled.');
            return [];
        }
        const result = [];
        const { extensions, extensionGalleryResources } = await this.readCustomBuiltinExtensionsInfoFromEnv();
        try {
            const cacheValue = JSON.stringify({
                extensions: extensions.sort((a, b) => a.id.localeCompare(b.id)),
                extensionGalleryResources: extensionGalleryResources.map((e) => e.toString()).sort(),
            });
            const useCache = this.storageService.get('additionalBuiltinExtensions', -1 /* StorageScope.APPLICATION */, '{}') ===
                cacheValue;
            const webExtensions = await (useCache
                ? this.getCustomBuiltinExtensionsFromCache()
                : this.updateCustomBuiltinExtensionsCache());
            if (webExtensions.length) {
                await Promise.all(webExtensions.map(async (webExtension) => {
                    try {
                        const extension = await this.toScannedExtension(webExtension, true);
                        if (extension.isValid || !scanOptions?.skipInvalidExtensions) {
                            result.push(extension);
                        }
                        else {
                            this.logService.info(`Skipping invalid additional builtin gallery extension ${webExtension.identifier.id}`);
                        }
                    }
                    catch (error) {
                        this.logService.info(`Ignoring additional builtin extension ${webExtension.identifier.id} because there is an error while converting it into scanned extension`, getErrorMessage(error));
                    }
                }));
            }
            this.storageService.store('additionalBuiltinExtensions', cacheValue, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        catch (error) {
            this.logService.info('Ignoring following additional builtin extensions as there is an error while fetching them from gallery', extensions.map(({ id }) => id), getErrorMessage(error));
        }
        return result;
    }
    async getCustomBuiltinExtensionsFromCache() {
        const cachedCustomBuiltinExtensions = await this.readCustomBuiltinExtensionsCache();
        const webExtensionsMap = new Map();
        for (const webExtension of cachedCustomBuiltinExtensions) {
            const existing = webExtensionsMap.get(webExtension.identifier.id.toLowerCase());
            if (existing) {
                // Incase there are duplicates always take the latest version
                if (semver.gt(existing.version, webExtension.version)) {
                    continue;
                }
            }
            /* Update preRelease flag in the cache - https://github.com/microsoft/vscode/issues/142831 */
            if (webExtension.metadata?.isPreReleaseVersion && !webExtension.metadata?.preRelease) {
                webExtension.metadata.preRelease = true;
            }
            webExtensionsMap.set(webExtension.identifier.id.toLowerCase(), webExtension);
        }
        return [...webExtensionsMap.values()];
    }
    async migrateExtensionsStorage(customBuiltinExtensions) {
        if (!this._migrateExtensionsStoragePromise) {
            this._migrateExtensionsStoragePromise = (async () => {
                const { extensionsToMigrate } = await this.readCustomBuiltinExtensionsInfoFromEnv();
                if (!extensionsToMigrate.length) {
                    return;
                }
                const fromExtensions = await this.galleryService.getExtensions(extensionsToMigrate.map(([id]) => ({ id })), CancellationToken.None);
                try {
                    await Promise.allSettled(extensionsToMigrate.map(async ([from, to]) => {
                        const toExtension = customBuiltinExtensions.find((extension) => areSameExtensions(extension.identifier, { id: to }));
                        if (toExtension) {
                            const fromExtension = fromExtensions.find((extension) => areSameExtensions(extension.identifier, { id: from }));
                            const fromExtensionManifest = fromExtension
                                ? await this.galleryService.getManifest(fromExtension, CancellationToken.None)
                                : null;
                            const fromExtensionId = fromExtensionManifest
                                ? getExtensionId(fromExtensionManifest.publisher, fromExtensionManifest.name)
                                : from;
                            const toExtensionId = getExtensionId(toExtension.manifest.publisher, toExtension.manifest.name);
                            this.extensionStorageService.addToMigrationList(fromExtensionId, toExtensionId);
                        }
                        else {
                            this.logService.info(`Skipped migrating extension storage from '${from}' to '${to}', because the '${to}' extension is not found.`);
                        }
                    }));
                }
                catch (error) {
                    this.logService.error(error);
                }
            })();
        }
        return this._migrateExtensionsStoragePromise;
    }
    async updateCaches() {
        await this.updateSystemExtensionsCache();
        await this.updateCustomBuiltinExtensionsCache();
    }
    async updateSystemExtensionsCache() {
        const systemExtensions = await this.builtinExtensionsScannerService.scanBuiltinExtensions();
        const cachedSystemExtensions = (await this.readSystemExtensionsCache()).filter((cached) => {
            const systemExtension = systemExtensions.find((e) => areSameExtensions(e.identifier, cached.identifier));
            return systemExtension && semver.gt(cached.version, systemExtension.manifest.version);
        });
        await this.writeSystemExtensionsCache(() => cachedSystemExtensions);
    }
    async updateCustomBuiltinExtensionsCache() {
        if (!this._updateCustomBuiltinExtensionsCachePromise) {
            this._updateCustomBuiltinExtensionsCachePromise = (async () => {
                this.logService.info('Updating additional builtin extensions cache');
                const { extensions, extensionGalleryResources } = await this.readCustomBuiltinExtensionsInfoFromEnv();
                const [galleryWebExtensions, extensionGalleryResourceWebExtensions] = await Promise.all([
                    this.resolveBuiltinGalleryExtensions(extensions),
                    this.resolveBuiltinExtensionGalleryResources(extensionGalleryResources),
                ]);
                const webExtensionsMap = new Map();
                for (const webExtension of [
                    ...galleryWebExtensions,
                    ...extensionGalleryResourceWebExtensions,
                ]) {
                    webExtensionsMap.set(webExtension.identifier.id.toLowerCase(), webExtension);
                }
                await this.resolveDependenciesAndPackedExtensions(extensionGalleryResourceWebExtensions, webExtensionsMap);
                const webExtensions = [...webExtensionsMap.values()];
                await this.writeCustomBuiltinExtensionsCache(() => webExtensions);
                return webExtensions;
            })();
        }
        return this._updateCustomBuiltinExtensionsCachePromise;
    }
    async resolveBuiltinExtensionGalleryResources(extensionGalleryResources) {
        if (extensionGalleryResources.length === 0) {
            return [];
        }
        const result = new Map();
        const extensionInfos = [];
        await Promise.all(extensionGalleryResources.map(async (extensionGalleryResource) => {
            try {
                const webExtension = await this.toWebExtensionFromExtensionGalleryResource(extensionGalleryResource);
                result.set(webExtension.identifier.id.toLowerCase(), webExtension);
                extensionInfos.push({ id: webExtension.identifier.id, version: webExtension.version });
            }
            catch (error) {
                this.logService.info(`Ignoring additional builtin extension from gallery resource ${extensionGalleryResource.toString()} because there is an error while converting it into web extension`, getErrorMessage(error));
            }
        }));
        const galleryExtensions = await this.galleryService.getExtensions(extensionInfos, CancellationToken.None);
        for (const galleryExtension of galleryExtensions) {
            const webExtension = result.get(galleryExtension.identifier.id.toLowerCase());
            if (webExtension) {
                result.set(galleryExtension.identifier.id.toLowerCase(), {
                    ...webExtension,
                    identifier: { id: webExtension.identifier.id, uuid: galleryExtension.identifier.uuid },
                    readmeUri: galleryExtension.assets.readme
                        ? URI.parse(galleryExtension.assets.readme.uri)
                        : undefined,
                    changelogUri: galleryExtension.assets.changelog
                        ? URI.parse(galleryExtension.assets.changelog.uri)
                        : undefined,
                    metadata: {
                        isPreReleaseVersion: galleryExtension.properties.isPreReleaseVersion,
                        preRelease: galleryExtension.properties.isPreReleaseVersion,
                        isBuiltin: true,
                        pinned: true,
                    },
                });
            }
        }
        return [...result.values()];
    }
    async resolveBuiltinGalleryExtensions(extensions) {
        if (extensions.length === 0) {
            return [];
        }
        const webExtensions = [];
        const galleryExtensionsMap = await this.getExtensionsWithDependenciesAndPackedExtensions(extensions);
        const missingExtensions = extensions.filter(({ id }) => !galleryExtensionsMap.has(id.toLowerCase()));
        if (missingExtensions.length) {
            this.logService.info('Skipping the additional builtin extensions because their compatible versions are not found.', missingExtensions);
        }
        await Promise.all([...galleryExtensionsMap.values()].map(async (gallery) => {
            try {
                const webExtension = await this.toWebExtensionFromGallery(gallery, {
                    isPreReleaseVersion: gallery.properties.isPreReleaseVersion,
                    preRelease: gallery.properties.isPreReleaseVersion,
                    isBuiltin: true,
                });
                webExtensions.push(webExtension);
            }
            catch (error) {
                this.logService.info(`Ignoring additional builtin extension ${gallery.identifier.id} because there is an error while converting it into web extension`, getErrorMessage(error));
            }
        }));
        return webExtensions;
    }
    async resolveDependenciesAndPackedExtensions(webExtensions, result) {
        const extensionInfos = [];
        for (const webExtension of webExtensions) {
            for (const e of [
                ...(webExtension.manifest?.extensionDependencies ?? []),
                ...(webExtension.manifest?.extensionPack ?? []),
            ]) {
                if (!result.has(e.toLowerCase())) {
                    extensionInfos.push({ id: e, version: webExtension.version });
                }
            }
        }
        if (extensionInfos.length === 0) {
            return;
        }
        const galleryExtensions = await this.getExtensionsWithDependenciesAndPackedExtensions(extensionInfos, new Set([...result.keys()]));
        await Promise.all([...galleryExtensions.values()].map(async (gallery) => {
            try {
                const webExtension = await this.toWebExtensionFromGallery(gallery, {
                    isPreReleaseVersion: gallery.properties.isPreReleaseVersion,
                    preRelease: gallery.properties.isPreReleaseVersion,
                    isBuiltin: true,
                });
                result.set(webExtension.identifier.id.toLowerCase(), webExtension);
            }
            catch (error) {
                this.logService.info(`Ignoring additional builtin extension ${gallery.identifier.id} because there is an error while converting it into web extension`, getErrorMessage(error));
            }
        }));
    }
    async getExtensionsWithDependenciesAndPackedExtensions(toGet, seen = new Set(), result = new Map()) {
        if (toGet.length === 0) {
            return result;
        }
        const extensions = await this.galleryService.getExtensions(toGet, { compatible: true, targetPlatform: "web" /* TargetPlatform.WEB */ }, CancellationToken.None);
        const packsAndDependencies = new Map();
        for (const extension of extensions) {
            result.set(extension.identifier.id.toLowerCase(), extension);
            for (const id of [
                ...(isNonEmptyArray(extension.properties.dependencies)
                    ? extension.properties.dependencies
                    : []),
                ...(isNonEmptyArray(extension.properties.extensionPack)
                    ? extension.properties.extensionPack
                    : []),
            ]) {
                if (!result.has(id.toLowerCase()) &&
                    !packsAndDependencies.has(id.toLowerCase()) &&
                    !seen.has(id.toLowerCase())) {
                    const extensionInfo = toGet.find((e) => areSameExtensions(e, extension.identifier));
                    packsAndDependencies.set(id.toLowerCase(), { id, preRelease: extensionInfo?.preRelease });
                }
            }
        }
        return this.getExtensionsWithDependenciesAndPackedExtensions([...packsAndDependencies.values()].filter(({ id }) => !result.has(id.toLowerCase())), seen, result);
    }
    async scanSystemExtensions() {
        return this.readSystemExtensions();
    }
    async scanUserExtensions(profileLocation, scanOptions) {
        const extensions = new Map();
        // Custom builtin extensions defined through `additionalBuiltinExtensions` API
        const customBuiltinExtensions = await this.readCustomBuiltinExtensions(scanOptions);
        for (const extension of customBuiltinExtensions) {
            extensions.set(extension.identifier.id.toLowerCase(), extension);
        }
        // User Installed extensions
        const installedExtensions = await this.scanInstalledExtensions(profileLocation, scanOptions);
        for (const extension of installedExtensions) {
            extensions.set(extension.identifier.id.toLowerCase(), extension);
        }
        return [...extensions.values()];
    }
    async scanExtensionsUnderDevelopment() {
        const devExtensions = this.environmentService.options?.developmentOptions?.extensions;
        const result = [];
        if (Array.isArray(devExtensions)) {
            await Promise.allSettled(devExtensions.map(async (devExtension) => {
                try {
                    const location = URI.revive(devExtension);
                    if (URI.isUri(location)) {
                        const webExtension = await this.toWebExtension(location);
                        result.push(await this.toScannedExtension(webExtension, false));
                    }
                    else {
                        this.logService.info(`Skipping the extension under development ${devExtension} as it is not URI type.`);
                    }
                }
                catch (error) {
                    this.logService.info(`Error while fetching the extension under development ${devExtension.toString()}.`, getErrorMessage(error));
                }
            }));
        }
        return result;
    }
    async scanExistingExtension(extensionLocation, extensionType, profileLocation) {
        if (extensionType === 0 /* ExtensionType.System */) {
            const systemExtensions = await this.scanSystemExtensions();
            return (systemExtensions.find((e) => e.location.toString() === extensionLocation.toString()) || null);
        }
        const userExtensions = await this.scanUserExtensions(profileLocation);
        return (userExtensions.find((e) => e.location.toString() === extensionLocation.toString()) || null);
    }
    async scanExtensionManifest(extensionLocation) {
        try {
            return await this.getExtensionManifest(extensionLocation);
        }
        catch (error) {
            this.logService.warn(`Error while fetching manifest from ${extensionLocation.toString()}`, getErrorMessage(error));
            return null;
        }
    }
    async addExtensionFromGallery(galleryExtension, metadata, profileLocation) {
        const webExtension = await this.toWebExtensionFromGallery(galleryExtension, metadata);
        return this.addWebExtension(webExtension, profileLocation);
    }
    async addExtension(location, metadata, profileLocation) {
        const webExtension = await this.toWebExtension(location, undefined, undefined, undefined, undefined, undefined, undefined, metadata);
        const extension = await this.toScannedExtension(webExtension, false);
        await this.addToInstalledExtensions([webExtension], profileLocation);
        return extension;
    }
    async removeExtension(extension, profileLocation) {
        await this.writeInstalledExtensions(profileLocation, (installedExtensions) => installedExtensions.filter((installedExtension) => !areSameExtensions(installedExtension.identifier, extension.identifier)));
    }
    async updateMetadata(extension, metadata, profileLocation) {
        let updatedExtension = undefined;
        await this.writeInstalledExtensions(profileLocation, (installedExtensions) => {
            const result = [];
            for (const installedExtension of installedExtensions) {
                if (areSameExtensions(extension.identifier, installedExtension.identifier)) {
                    installedExtension.metadata = { ...installedExtension.metadata, ...metadata };
                    updatedExtension = installedExtension;
                    result.push(installedExtension);
                }
                else {
                    result.push(installedExtension);
                }
            }
            return result;
        });
        if (!updatedExtension) {
            throw new Error('Extension not found');
        }
        return this.toScannedExtension(updatedExtension, extension.isBuiltin);
    }
    async copyExtensions(fromProfileLocation, toProfileLocation, filter) {
        const extensionsToCopy = [];
        const fromWebExtensions = await this.readInstalledExtensions(fromProfileLocation);
        await Promise.all(fromWebExtensions.map(async (webExtension) => {
            const scannedExtension = await this.toScannedExtension(webExtension, false);
            if (filter(scannedExtension)) {
                extensionsToCopy.push(webExtension);
            }
        }));
        if (extensionsToCopy.length) {
            await this.addToInstalledExtensions(extensionsToCopy, toProfileLocation);
        }
    }
    async addWebExtension(webExtension, profileLocation) {
        const isSystem = !!(await this.scanSystemExtensions()).find((e) => areSameExtensions(e.identifier, webExtension.identifier));
        const isBuiltin = !!webExtension.metadata?.isBuiltin;
        const extension = await this.toScannedExtension(webExtension, isBuiltin);
        if (isSystem) {
            await this.writeSystemExtensionsCache((systemExtensions) => {
                // Remove the existing extension to avoid duplicates
                systemExtensions = systemExtensions.filter((extension) => !areSameExtensions(extension.identifier, webExtension.identifier));
                systemExtensions.push(webExtension);
                return systemExtensions;
            });
            return extension;
        }
        // Update custom builtin extensions to custom builtin extensions cache
        if (isBuiltin) {
            await this.writeCustomBuiltinExtensionsCache((customBuiltinExtensions) => {
                // Remove the existing extension to avoid duplicates
                customBuiltinExtensions = customBuiltinExtensions.filter((extension) => !areSameExtensions(extension.identifier, webExtension.identifier));
                customBuiltinExtensions.push(webExtension);
                return customBuiltinExtensions;
            });
            const installedExtensions = await this.readInstalledExtensions(profileLocation);
            // Also add to installed extensions if it is installed to update its version
            if (installedExtensions.some((e) => areSameExtensions(e.identifier, webExtension.identifier))) {
                await this.addToInstalledExtensions([webExtension], profileLocation);
            }
            return extension;
        }
        // Add to installed extensions
        await this.addToInstalledExtensions([webExtension], profileLocation);
        return extension;
    }
    async addToInstalledExtensions(webExtensions, profileLocation) {
        await this.writeInstalledExtensions(profileLocation, (installedExtensions) => {
            // Remove the existing extension to avoid duplicates
            installedExtensions = installedExtensions.filter((installedExtension) => webExtensions.some((extension) => !areSameExtensions(installedExtension.identifier, extension.identifier)));
            installedExtensions.push(...webExtensions);
            return installedExtensions;
        });
    }
    async scanInstalledExtensions(profileLocation, scanOptions) {
        let installedExtensions = await this.readInstalledExtensions(profileLocation);
        // If current profile is not a default profile, then add the application extensions to the list
        if (!this.uriIdentityService.extUri.isEqual(profileLocation, this.userDataProfilesService.defaultProfile.extensionsResource)) {
            // Remove application extensions from the non default profile
            installedExtensions = installedExtensions.filter((i) => !i.metadata?.isApplicationScoped);
            // Add application extensions from the default profile to the list
            const defaultProfileExtensions = await this.readInstalledExtensions(this.userDataProfilesService.defaultProfile.extensionsResource);
            installedExtensions.push(...defaultProfileExtensions.filter((i) => i.metadata?.isApplicationScoped));
        }
        installedExtensions.sort((a, b) => a.identifier.id < b.identifier.id
            ? -1
            : a.identifier.id > b.identifier.id
                ? 1
                : semver.rcompare(a.version, b.version));
        const result = new Map();
        for (const webExtension of installedExtensions) {
            const existing = result.get(webExtension.identifier.id.toLowerCase());
            if (existing && semver.gt(existing.manifest.version, webExtension.version)) {
                continue;
            }
            const extension = await this.toScannedExtension(webExtension, false);
            if (extension.isValid || !scanOptions?.skipInvalidExtensions) {
                result.set(extension.identifier.id.toLowerCase(), extension);
            }
            else {
                this.logService.info(`Skipping invalid installed extension ${webExtension.identifier.id}`);
            }
        }
        return [...result.values()];
    }
    async toWebExtensionFromGallery(galleryExtension, metadata) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({
            publisher: galleryExtension.publisher,
            name: galleryExtension.name,
            version: galleryExtension.version,
            targetPlatform: galleryExtension.properties.targetPlatform === "web" /* TargetPlatform.WEB */
                ? "web" /* TargetPlatform.WEB */
                : undefined,
        }, 'extension');
        if (!extensionLocation) {
            throw new Error('No extension gallery service configured.');
        }
        return this.toWebExtensionFromExtensionGalleryResource(extensionLocation, galleryExtension.identifier, galleryExtension.assets.readme ? URI.parse(galleryExtension.assets.readme.uri) : undefined, galleryExtension.assets.changelog
            ? URI.parse(galleryExtension.assets.changelog.uri)
            : undefined, metadata);
    }
    async toWebExtensionFromExtensionGalleryResource(extensionLocation, identifier, readmeUri, changelogUri, metadata) {
        const extensionResources = await this.listExtensionResources(extensionLocation);
        const packageNLSResources = this.getPackageNLSResourceMapFromResources(extensionResources);
        // The fallback, in English, will fill in any gaps missing in the localized file.
        const fallbackPackageNLSResource = extensionResources.find((e) => basename(e) === 'package.nls.json');
        return this.toWebExtension(extensionLocation, identifier, undefined, packageNLSResources, fallbackPackageNLSResource ? URI.parse(fallbackPackageNLSResource) : null, readmeUri, changelogUri, metadata);
    }
    getPackageNLSResourceMapFromResources(extensionResources) {
        const packageNLSResources = new Map();
        extensionResources.forEach((e) => {
            // Grab all package.nls.{language}.json files
            const regexResult = /package\.nls\.([\w-]+)\.json/.exec(basename(e));
            if (regexResult?.[1]) {
                packageNLSResources.set(regexResult[1], URI.parse(e));
            }
        });
        return packageNLSResources;
    }
    async toWebExtension(extensionLocation, identifier, manifest, packageNLSUris, fallbackPackageNLSUri, readmeUri, changelogUri, metadata) {
        if (!manifest) {
            try {
                manifest = await this.getExtensionManifest(extensionLocation);
            }
            catch (error) {
                throw new Error(`Error while fetching manifest from the location '${extensionLocation.toString()}'. ${getErrorMessage(error)}`);
            }
        }
        if (!this.extensionManifestPropertiesService.canExecuteOnWeb(manifest)) {
            throw new Error(localize('not a web extension', "Cannot add '{0}' because this extension is not a web extension.", manifest.displayName || manifest.name));
        }
        if (fallbackPackageNLSUri === undefined) {
            try {
                fallbackPackageNLSUri = joinPath(extensionLocation, 'package.nls.json');
                await this.extensionResourceLoaderService.readExtensionResource(fallbackPackageNLSUri);
            }
            catch (error) {
                fallbackPackageNLSUri = undefined;
            }
        }
        const defaultManifestTranslations = fallbackPackageNLSUri
            ? URI.isUri(fallbackPackageNLSUri)
                ? await this.getTranslations(fallbackPackageNLSUri)
                : fallbackPackageNLSUri
            : null;
        return {
            identifier: {
                id: getGalleryExtensionId(manifest.publisher, manifest.name),
                uuid: identifier?.uuid,
            },
            version: manifest.version,
            location: extensionLocation,
            manifest,
            readmeUri,
            changelogUri,
            packageNLSUris,
            fallbackPackageNLSUri: URI.isUri(fallbackPackageNLSUri) ? fallbackPackageNLSUri : undefined,
            defaultManifestTranslations,
            metadata,
        };
    }
    async toScannedExtension(webExtension, isBuiltin, type = 1 /* ExtensionType.User */) {
        const validations = [];
        let manifest = webExtension.manifest;
        if (!manifest) {
            try {
                manifest = await this.getExtensionManifest(webExtension.location);
            }
            catch (error) {
                validations.push([
                    Severity.Error,
                    `Error while fetching manifest from the location '${webExtension.location}'. ${getErrorMessage(error)}`,
                ]);
            }
        }
        if (!manifest) {
            const [publisher, name] = webExtension.identifier.id.split('.');
            manifest = {
                name,
                publisher,
                version: webExtension.version,
                engines: { vscode: '*' },
            };
        }
        const packageNLSUri = webExtension.packageNLSUris?.get(Language.value().toLowerCase());
        const fallbackPackageNLS = webExtension.defaultManifestTranslations ?? webExtension.fallbackPackageNLSUri;
        if (packageNLSUri) {
            manifest = await this.translateManifest(manifest, packageNLSUri, fallbackPackageNLS);
        }
        else if (fallbackPackageNLS) {
            manifest = await this.translateManifest(manifest, fallbackPackageNLS);
        }
        const uuid = webExtension.metadata?.id;
        const validateApiVersion = this.extensionsEnabledWithApiProposalVersion.includes(webExtension.identifier.id.toLowerCase());
        validations.push(...validateExtensionManifest(this.productService.version, this.productService.date, webExtension.location, manifest, false, validateApiVersion));
        let isValid = true;
        for (const [severity, message] of validations) {
            if (severity === Severity.Error) {
                isValid = false;
                this.logService.error(message);
            }
        }
        if (manifest.enabledApiProposals && validateApiVersion) {
            manifest.enabledApiProposals = parseEnabledApiProposalNames([...manifest.enabledApiProposals]);
        }
        return {
            identifier: { id: webExtension.identifier.id, uuid: webExtension.identifier.uuid || uuid },
            location: webExtension.location,
            manifest,
            type,
            isBuiltin,
            readmeUrl: webExtension.readmeUri,
            changelogUrl: webExtension.changelogUri,
            metadata: webExtension.metadata,
            targetPlatform: "web" /* TargetPlatform.WEB */,
            validations,
            isValid,
            preRelease: !!webExtension.metadata?.preRelease,
        };
    }
    async listExtensionResources(extensionLocation) {
        try {
            const result = await this.extensionResourceLoaderService.readExtensionResource(extensionLocation);
            return JSON.parse(result);
        }
        catch (error) {
            this.logService.warn('Error while fetching extension resources list', getErrorMessage(error));
        }
        return [];
    }
    async translateManifest(manifest, nlsURL, fallbackNLS) {
        try {
            const translations = URI.isUri(nlsURL) ? await this.getTranslations(nlsURL) : nlsURL;
            const fallbackTranslations = URI.isUri(fallbackNLS)
                ? await this.getTranslations(fallbackNLS)
                : fallbackNLS;
            if (translations) {
                manifest = localizeManifest(this.logService, manifest, translations, fallbackTranslations);
            }
        }
        catch (error) {
            /* ignore */
        }
        return manifest;
    }
    async getExtensionManifest(location) {
        const url = joinPath(location, 'package.json');
        const content = await this.extensionResourceLoaderService.readExtensionResource(url);
        return JSON.parse(content);
    }
    async getTranslations(nlsUrl) {
        try {
            const content = await this.extensionResourceLoaderService.readExtensionResource(nlsUrl);
            return JSON.parse(content);
        }
        catch (error) {
            this.logService.error(`Error while fetching translations of an extension`, nlsUrl.toString(), getErrorMessage(error));
        }
        return undefined;
    }
    async readInstalledExtensions(profileLocation) {
        return this.withWebExtensions(profileLocation);
    }
    writeInstalledExtensions(profileLocation, updateFn) {
        return this.withWebExtensions(profileLocation, updateFn);
    }
    readCustomBuiltinExtensionsCache() {
        return this.withWebExtensions(this.customBuiltinExtensionsCacheResource);
    }
    writeCustomBuiltinExtensionsCache(updateFn) {
        return this.withWebExtensions(this.customBuiltinExtensionsCacheResource, updateFn);
    }
    readSystemExtensionsCache() {
        return this.withWebExtensions(this.systemExtensionsCacheResource);
    }
    writeSystemExtensionsCache(updateFn) {
        return this.withWebExtensions(this.systemExtensionsCacheResource, updateFn);
    }
    async withWebExtensions(file, updateFn) {
        if (!file) {
            return [];
        }
        return this.getResourceAccessQueue(file).queue(async () => {
            let webExtensions = [];
            // Read
            try {
                const content = await this.fileService.readFile(file);
                const storedWebExtensions = JSON.parse(content.value.toString());
                for (const e of storedWebExtensions) {
                    if (!e.location || !e.identifier || !e.version) {
                        this.logService.info('Ignoring invalid extension while scanning', storedWebExtensions);
                        continue;
                    }
                    let packageNLSUris;
                    if (e.packageNLSUris) {
                        packageNLSUris = new Map();
                        Object.entries(e.packageNLSUris).forEach(([key, value]) => packageNLSUris.set(key, URI.revive(value)));
                    }
                    webExtensions.push({
                        identifier: e.identifier,
                        version: e.version,
                        location: URI.revive(e.location),
                        manifest: e.manifest,
                        readmeUri: URI.revive(e.readmeUri),
                        changelogUri: URI.revive(e.changelogUri),
                        packageNLSUris,
                        fallbackPackageNLSUri: URI.revive(e.fallbackPackageNLSUri),
                        defaultManifestTranslations: e.defaultManifestTranslations,
                        packageNLSUri: URI.revive(e.packageNLSUri),
                        metadata: e.metadata,
                    });
                }
                try {
                    webExtensions = await this.migrateWebExtensions(webExtensions, file);
                }
                catch (error) {
                    this.logService.error(`Error while migrating scanned extensions in ${file.toString()}`, getErrorMessage(error));
                }
            }
            catch (error) {
                /* Ignore */
                if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logService.error(error);
                }
            }
            // Update
            if (updateFn) {
                await this.storeWebExtensions((webExtensions = updateFn(webExtensions)), file);
            }
            return webExtensions;
        });
    }
    async migrateWebExtensions(webExtensions, file) {
        let update = false;
        webExtensions = await Promise.all(webExtensions.map(async (webExtension) => {
            if (!webExtension.manifest) {
                try {
                    webExtension.manifest = await this.getExtensionManifest(webExtension.location);
                    update = true;
                }
                catch (error) {
                    this.logService.error(`Error while updating manifest of an extension in ${file.toString()}`, webExtension.identifier.id, getErrorMessage(error));
                }
            }
            if (isUndefined(webExtension.defaultManifestTranslations)) {
                if (webExtension.fallbackPackageNLSUri) {
                    try {
                        const content = await this.extensionResourceLoaderService.readExtensionResource(webExtension.fallbackPackageNLSUri);
                        webExtension.defaultManifestTranslations = JSON.parse(content);
                        update = true;
                    }
                    catch (error) {
                        this.logService.error(`Error while fetching default manifest translations of an extension`, webExtension.identifier.id, getErrorMessage(error));
                    }
                }
                else {
                    update = true;
                    webExtension.defaultManifestTranslations = null;
                }
            }
            const migratedLocation = migratePlatformSpecificExtensionGalleryResourceURL(webExtension.location, "web" /* TargetPlatform.WEB */);
            if (migratedLocation) {
                update = true;
                webExtension.location = migratedLocation;
            }
            if (isUndefined(webExtension.metadata?.hasPreReleaseVersion) &&
                webExtension.metadata?.preRelease) {
                update = true;
                webExtension.metadata.hasPreReleaseVersion = true;
            }
            return webExtension;
        }));
        if (update) {
            await this.storeWebExtensions(webExtensions, file);
        }
        return webExtensions;
    }
    async storeWebExtensions(webExtensions, file) {
        function toStringDictionary(dictionary) {
            if (!dictionary) {
                return undefined;
            }
            const result = Object.create(null);
            dictionary.forEach((value, key) => (result[key] = value.toJSON()));
            return result;
        }
        const storedWebExtensions = webExtensions.map((e) => ({
            identifier: e.identifier,
            version: e.version,
            manifest: e.manifest,
            location: e.location.toJSON(),
            readmeUri: e.readmeUri?.toJSON(),
            changelogUri: e.changelogUri?.toJSON(),
            packageNLSUris: toStringDictionary(e.packageNLSUris),
            defaultManifestTranslations: e.defaultManifestTranslations,
            fallbackPackageNLSUri: e.fallbackPackageNLSUri?.toJSON(),
            metadata: e.metadata,
        }));
        await this.fileService.writeFile(file, VSBuffer.fromString(JSON.stringify(storedWebExtensions)));
    }
    getResourceAccessQueue(file) {
        let resourceQueue = this.resourcesAccessQueueMap.get(file);
        if (!resourceQueue) {
            this.resourcesAccessQueueMap.set(file, (resourceQueue = new Queue()));
        }
        return resourceQueue;
    }
};
WebExtensionsScannerService = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, IBuiltinExtensionsScannerService),
    __param(2, IFileService),
    __param(3, ILogService),
    __param(4, IExtensionGalleryService),
    __param(5, IExtensionManifestPropertiesService),
    __param(6, IExtensionResourceLoaderService),
    __param(7, IExtensionStorageService),
    __param(8, IStorageService),
    __param(9, IProductService),
    __param(10, IUserDataProfilesService),
    __param(11, IUriIdentityService),
    __param(12, ILifecycleService)
], WebExtensionsScannerService);
export { WebExtensionsScannerService };
if (isWeb) {
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: 'workbench.extensions.action.openInstalledWebExtensionsResource',
                title: localize2('openInstalledWebExtensionsResource', 'Open Installed Web Extensions Resource'),
                category: Categories.Developer,
                f1: true,
                precondition: IsWebContext,
            });
        }
        run(serviceAccessor) {
            const editorService = serviceAccessor.get(IEditorService);
            const userDataProfileService = serviceAccessor.get(IUserDataProfileService);
            editorService.openEditor({
                resource: userDataProfileService.currentProfile.extensionsResource,
            });
        }
    });
}
registerSingleton(IWebExtensionsScannerService, WebExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvYnJvd3Nlci93ZWJFeHRlbnNpb25zU2Nhbm5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGdDQUFnQyxFQU9oQyw0QkFBNEIsR0FDNUIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNyRyxPQUFPLEVBRU4sNEJBQTRCLEdBRTVCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUdOLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFDTix3QkFBd0IsR0FLeEIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHFCQUFxQixFQUNyQixjQUFj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