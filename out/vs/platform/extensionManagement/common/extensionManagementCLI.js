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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { getErrorMessage, isCancellationError } from '../../../base/common/errors.js';
import { Schemas } from '../../../base/common/network.js';
import { basename } from '../../../base/common/resources.js';
import { gt } from '../../../base/common/semver/semver.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { EXTENSION_IDENTIFIER_REGEX, IExtensionGalleryService, IExtensionManagementService, } from './extensionManagement.js';
import { areSameExtensions, getExtensionId, getGalleryExtensionId, getIdAndVersion, } from './extensionManagementUtil.js';
import { EXTENSION_CATEGORIES, } from '../../extensions/common/extensions.js';
const notFound = (id) => localize('notFound', "Extension '{0}' not found.", id);
const useId = localize('useId', 'Make sure you use the full extension ID, including the publisher, e.g.: {0}', 'ms-dotnettools.csharp');
let ExtensionManagementCLI = class ExtensionManagementCLI {
    constructor(logger, extensionManagementService, extensionGalleryService) {
        this.logger = logger;
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
    }
    get location() {
        return undefined;
    }
    async listExtensions(showVersions, category, profileLocation) {
        let extensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, profileLocation);
        const categories = EXTENSION_CATEGORIES.map((c) => c.toLowerCase());
        if (category && category !== '') {
            if (categories.indexOf(category.toLowerCase()) < 0) {
                this.logger.info('Invalid category please enter a valid category. To list valid categories run --category without a category specified');
                return;
            }
            extensions = extensions.filter((e) => {
                if (e.manifest.categories) {
                    const lowerCaseCategories = e.manifest.categories.map((c) => c.toLowerCase());
                    return lowerCaseCategories.indexOf(category.toLowerCase()) > -1;
                }
                return false;
            });
        }
        else if (category === '') {
            this.logger.info('Possible Categories: ');
            categories.forEach((category) => {
                this.logger.info(category);
            });
            return;
        }
        if (this.location) {
            this.logger.info(localize('listFromLocation', 'Extensions installed on {0}:', this.location));
        }
        extensions = extensions.sort((e1, e2) => e1.identifier.id.localeCompare(e2.identifier.id));
        let lastId = undefined;
        for (const extension of extensions) {
            if (lastId !== extension.identifier.id) {
                lastId = extension.identifier.id;
                this.logger.info(showVersions ? `${lastId}@${extension.manifest.version}` : lastId);
            }
        }
    }
    async installExtensions(extensions, builtinExtensions, installOptions, force) {
        const failed = [];
        try {
            if (extensions.length) {
                this.logger.info(this.location
                    ? localize('installingExtensionsOnLocation', 'Installing extensions on {0}...', this.location)
                    : localize('installingExtensions', 'Installing extensions...'));
            }
            const installVSIXInfos = [];
            const installExtensionInfos = [];
            const addInstallExtensionInfo = (id, version, isBuiltin) => {
                installExtensionInfos.push({
                    id,
                    version: version !== 'prerelease' ? version : undefined,
                    installOptions: {
                        ...installOptions,
                        isBuiltin,
                        installPreReleaseVersion: version === 'prerelease' || installOptions.installPreReleaseVersion,
                    },
                });
            };
            for (const extension of extensions) {
                if (extension instanceof URI) {
                    installVSIXInfos.push({ vsix: extension, installOptions });
                }
                else {
                    const [id, version] = getIdAndVersion(extension);
                    addInstallExtensionInfo(id, version, false);
                }
            }
            for (const extension of builtinExtensions) {
                if (extension instanceof URI) {
                    installVSIXInfos.push({
                        vsix: extension,
                        installOptions: {
                            ...installOptions,
                            isBuiltin: true,
                            donotIncludePackAndDependencies: true,
                        },
                    });
                }
                else {
                    const [id, version] = getIdAndVersion(extension);
                    addInstallExtensionInfo(id, version, true);
                }
            }
            const installed = await this.extensionManagementService.getInstalled(undefined, installOptions.profileLocation);
            if (installVSIXInfos.length) {
                await Promise.all(installVSIXInfos.map(async ({ vsix, installOptions }) => {
                    try {
                        await this.installVSIX(vsix, installOptions, force, installed);
                    }
                    catch (err) {
                        this.logger.error(err);
                        failed.push(vsix.toString());
                    }
                }));
            }
            if (installExtensionInfos.length) {
                const failedGalleryExtensions = await this.installGalleryExtensions(installExtensionInfos, installed, force);
                failed.push(...failedGalleryExtensions);
            }
        }
        catch (error) {
            this.logger.error(localize('error while installing extensions', 'Error while installing extensions: {0}', getErrorMessage(error)));
            throw error;
        }
        if (failed.length) {
            throw new Error(localize('installation failed', 'Failed Installing Extensions: {0}', failed.join(', ')));
        }
    }
    async updateExtensions(profileLocation) {
        const installedExtensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, profileLocation);
        const installedExtensionsQuery = [];
        for (const extension of installedExtensions) {
            if (!!extension.identifier.uuid) {
                // No need to check new version for an unpublished extension
                installedExtensionsQuery.push({ ...extension.identifier, preRelease: extension.preRelease });
            }
        }
        this.logger.trace(localize({ key: 'updateExtensionsQuery', comment: ['Placeholder is for the count of extensions'] }, 'Fetching latest versions for {0} extensions', installedExtensionsQuery.length));
        const availableVersions = await this.extensionGalleryService.getExtensions(installedExtensionsQuery, { compatible: true }, CancellationToken.None);
        const extensionsToUpdate = [];
        for (const newVersion of availableVersions) {
            for (const oldVersion of installedExtensions) {
                if (areSameExtensions(oldVersion.identifier, newVersion.identifier) &&
                    gt(newVersion.version, oldVersion.manifest.version)) {
                    extensionsToUpdate.push({
                        extension: newVersion,
                        options: {
                            operation: 3 /* InstallOperation.Update */,
                            installPreReleaseVersion: oldVersion.preRelease,
                            profileLocation,
                            isApplicationScoped: oldVersion.isApplicationScoped,
                        },
                    });
                }
            }
        }
        if (!extensionsToUpdate.length) {
            this.logger.info(localize('updateExtensionsNoExtensions', 'No extension to update'));
            return;
        }
        this.logger.info(localize('updateExtensionsNewVersionsAvailable', 'Updating extensions: {0}', extensionsToUpdate.map((ext) => ext.extension.identifier.id).join(', ')));
        const installationResult = await this.extensionManagementService.installGalleryExtensions(extensionsToUpdate);
        for (const extensionResult of installationResult) {
            if (extensionResult.error) {
                this.logger.error(localize('errorUpdatingExtension', 'Error while updating extension {0}: {1}', extensionResult.identifier.id, getErrorMessage(extensionResult.error)));
            }
            else {
                this.logger.info(localize('successUpdate', "Extension '{0}' v{1} was successfully updated.", extensionResult.identifier.id, extensionResult.local?.manifest.version));
            }
        }
    }
    async installGalleryExtensions(installExtensionInfos, installed, force) {
        installExtensionInfos = installExtensionInfos.filter((installExtensionInfo) => {
            const { id, version, installOptions } = installExtensionInfo;
            const installedExtension = installed.find((i) => areSameExtensions(i.identifier, { id }));
            if (installedExtension) {
                if (!force && (!version || (version === 'prerelease' && installedExtension.preRelease))) {
                    this.logger.info(localize('alreadyInstalled-checkAndUpdate', "Extension '{0}' v{1} is already installed. Use '--force' option to update to latest version or provide '@<version>' to install a specific version, for example: '{2}@1.2.3'.", id, installedExtension.manifest.version, id));
                    return false;
                }
                if (version && installedExtension.manifest.version === version) {
                    this.logger.info(localize('alreadyInstalled', "Extension '{0}' is already installed.", `${id}@${version}`));
                    return false;
                }
                if (installedExtension.preRelease && version !== 'prerelease') {
                    installOptions.preRelease = false;
                }
            }
            return true;
        });
        if (!installExtensionInfos.length) {
            return [];
        }
        const failed = [];
        const extensionsToInstall = [];
        const galleryExtensions = await this.getGalleryExtensions(installExtensionInfos);
        await Promise.all(installExtensionInfos.map(async ({ id, version, installOptions }) => {
            const gallery = galleryExtensions.get(id.toLowerCase());
            if (!gallery) {
                this.logger.error(`${notFound(version ? `${id}@${version}` : id)}\n${useId}`);
                failed.push(id);
                return;
            }
            try {
                const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
                if (manifest && !this.validateExtensionKind(manifest)) {
                    return;
                }
            }
            catch (err) {
                this.logger.error(err.message || err.stack || err);
                failed.push(id);
                return;
            }
            const installedExtension = installed.find((e) => areSameExtensions(e.identifier, gallery.identifier));
            if (installedExtension) {
                if (gallery.version === installedExtension.manifest.version) {
                    this.logger.info(localize('alreadyInstalled', "Extension '{0}' is already installed.", version ? `${id}@${version}` : id));
                    return;
                }
                this.logger.info(localize('updateMessage', "Updating the extension '{0}' to the version {1}", id, gallery.version));
            }
            if (installOptions.isBuiltin) {
                this.logger.info(version
                    ? localize('installing builtin with version', "Installing builtin extension '{0}' v{1}...", id, version)
                    : localize('installing builtin ', "Installing builtin extension '{0}'...", id));
            }
            else {
                this.logger.info(version
                    ? localize('installing with version', "Installing extension '{0}' v{1}...", id, version)
                    : localize('installing', "Installing extension '{0}'...", id));
            }
            extensionsToInstall.push({
                extension: gallery,
                options: {
                    ...installOptions,
                    installGivenVersion: !!version,
                    isApplicationScoped: installOptions.isApplicationScoped || installedExtension?.isApplicationScoped,
                },
            });
        }));
        if (extensionsToInstall.length) {
            const installationResult = await this.extensionManagementService.installGalleryExtensions(extensionsToInstall);
            for (const extensionResult of installationResult) {
                if (extensionResult.error) {
                    this.logger.error(localize('errorInstallingExtension', 'Error while installing extension {0}: {1}', extensionResult.identifier.id, getErrorMessage(extensionResult.error)));
                    failed.push(extensionResult.identifier.id);
                }
                else {
                    this.logger.info(localize('successInstall', "Extension '{0}' v{1} was successfully installed.", extensionResult.identifier.id, extensionResult.local?.manifest.version));
                }
            }
        }
        return failed;
    }
    async installVSIX(vsix, installOptions, force, installedExtensions) {
        const manifest = await this.extensionManagementService.getManifest(vsix);
        if (!manifest) {
            throw new Error('Invalid vsix');
        }
        const valid = await this.validateVSIX(manifest, force, installOptions.profileLocation, installedExtensions);
        if (valid) {
            try {
                await this.extensionManagementService.install(vsix, {
                    ...installOptions,
                    installGivenVersion: true,
                });
                this.logger.info(localize('successVsixInstall', "Extension '{0}' was successfully installed.", basename(vsix)));
            }
            catch (error) {
                if (isCancellationError(error)) {
                    this.logger.info(localize('cancelVsixInstall', "Cancelled installing extension '{0}'.", basename(vsix)));
                }
                else {
                    throw error;
                }
            }
        }
    }
    async getGalleryExtensions(extensions) {
        const galleryExtensions = new Map();
        const preRelease = extensions.some((e) => e.installOptions.installPreReleaseVersion);
        const targetPlatform = await this.extensionManagementService.getTargetPlatform();
        const extensionInfos = [];
        for (const extension of extensions) {
            if (EXTENSION_IDENTIFIER_REGEX.test(extension.id)) {
                extensionInfos.push({ ...extension, preRelease });
            }
        }
        if (extensionInfos.length) {
            const result = await this.extensionGalleryService.getExtensions(extensionInfos, { targetPlatform }, CancellationToken.None);
            for (const extension of result) {
                galleryExtensions.set(extension.identifier.id.toLowerCase(), extension);
            }
        }
        return galleryExtensions;
    }
    validateExtensionKind(_manifest) {
        return true;
    }
    async validateVSIX(manifest, force, profileLocation, installedExtensions) {
        if (!force) {
            const extensionIdentifier = { id: getGalleryExtensionId(manifest.publisher, manifest.name) };
            const newer = installedExtensions.find((local) => areSameExtensions(extensionIdentifier, local.identifier) &&
                gt(local.manifest.version, manifest.version));
            if (newer) {
                this.logger.info(localize('forceDowngrade', "A newer version of extension '{0}' v{1} is already installed. Use '--force' option to downgrade to older version.", newer.identifier.id, newer.manifest.version, manifest.version));
                return false;
            }
        }
        return this.validateExtensionKind(manifest);
    }
    async uninstallExtensions(extensions, force, profileLocation) {
        const getId = async (extensionDescription) => {
            if (extensionDescription instanceof URI) {
                const manifest = await this.extensionManagementService.getManifest(extensionDescription);
                return getExtensionId(manifest.publisher, manifest.name);
            }
            return extensionDescription;
        };
        const uninstalledExtensions = [];
        for (const extension of extensions) {
            const id = await getId(extension);
            const installed = await this.extensionManagementService.getInstalled(undefined, profileLocation);
            const extensionsToUninstall = installed.filter((e) => areSameExtensions(e.identifier, { id }));
            if (!extensionsToUninstall.length) {
                throw new Error(`${this.notInstalled(id)}\n${useId}`);
            }
            if (extensionsToUninstall.some((e) => e.type === 0 /* ExtensionType.System */)) {
                this.logger.info(localize('builtin', "Extension '{0}' is a Built-in extension and cannot be uninstalled", id));
                return;
            }
            if (!force && extensionsToUninstall.some((e) => e.isBuiltin)) {
                this.logger.info(localize('forceUninstall', "Extension '{0}' is marked as a Built-in extension by user. Please use '--force' option to uninstall it.", id));
                return;
            }
            this.logger.info(localize('uninstalling', 'Uninstalling {0}...', id));
            for (const extensionToUninstall of extensionsToUninstall) {
                await this.extensionManagementService.uninstall(extensionToUninstall, { profileLocation });
                uninstalledExtensions.push(extensionToUninstall);
            }
            if (this.location) {
                this.logger.info(localize('successUninstallFromLocation', "Extension '{0}' was successfully uninstalled from {1}!", id, this.location));
            }
            else {
                this.logger.info(localize('successUninstall', "Extension '{0}' was successfully uninstalled!", id));
            }
        }
    }
    async locateExtension(extensions) {
        const installed = await this.extensionManagementService.getInstalled();
        extensions.forEach((e) => {
            installed.forEach((i) => {
                if (i.identifier.id === e) {
                    if (i.location.scheme === Schemas.file) {
                        this.logger.info(i.location.fsPath);
                        return;
                    }
                }
            });
        });
    }
    notInstalled(id) {
        return this.location
            ? localize('notInstalleddOnLocation', "Extension '{0}' is not installed on {1}.", id, this.location)
            : localize('notInstalled', "Extension '{0}' is not installed.", id);
    }
};
ExtensionManagementCLI = __decorate([
    __param(1, IExtensionManagementService),
    __param(2, IExtensionGalleryService)
], ExtensionManagementCLI);
export { ExtensionManagementCLI };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudENMSS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uTWFuYWdlbWVudENMSS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHdCQUF3QixFQUV4QiwyQkFBMkIsR0FNM0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxxQkFBcUIsRUFDckIsZUFBZSxHQUNmLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUVOLG9CQUFvQixHQUVwQixNQUFNLHVDQUF1QyxDQUFBO0FBRzlDLE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLDRCQUE0QixFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBQ3ZGLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FDckIsT0FBTyxF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