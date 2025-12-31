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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudENMSS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnRDTEkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUNOLDBCQUEwQixFQUMxQix3QkFBd0IsRUFFeEIsMkJBQTJCLEdBTTNCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixjQUFjLEVBQ2QscUJBQXFCLEVBQ3JCLGVBQWUsR0FDZixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFFTixvQkFBb0IsR0FFcEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUc5QyxNQUFNLFFBQVEsR0FBRyxDQUFDLEVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSw0QkFBNEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUN2RixNQUFNLEtBQUssR0FBRyxRQUFRLENBQ3JCLE9BQU8sRUFDUCw2RUFBNkUsRUFDN0UsdUJBQXVC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