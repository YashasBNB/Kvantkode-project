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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { GlobalExtensionEnablementService } from '../../../../platform/extensionManagement/common/extensionEnablementService.js';
import { EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, IExtensionGalleryService, IExtensionManagementService, IGlobalExtensionEnablementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUserDataProfileStorageService } from '../../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { IUserDataProfileService, } from '../common/userDataProfile.js';
let ExtensionsResourceInitializer = class ExtensionsResourceInitializer {
    constructor(userDataProfileService, extensionManagementService, extensionGalleryService, extensionEnablementService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionEnablementService = extensionEnablementService;
        this.logService = logService;
    }
    async initialize(content) {
        const profileExtensions = JSON.parse(content);
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, this.userDataProfileService.currentProfile.extensionsResource);
        const extensionsToEnableOrDisable = [];
        const extensionsToInstall = [];
        for (const e of profileExtensions) {
            const isDisabled = this.extensionEnablementService
                .getDisabledExtensions()
                .some((disabledExtension) => areSameExtensions(disabledExtension, e.identifier));
            const installedExtension = installedExtensions.find((installed) => areSameExtensions(installed.identifier, e.identifier));
            if (!installedExtension ||
                (!installedExtension.isBuiltin && installedExtension.preRelease !== e.preRelease)) {
                extensionsToInstall.push(e);
            }
            if (isDisabled !== !!e.disabled) {
                extensionsToEnableOrDisable.push({ extension: e.identifier, enable: !e.disabled });
            }
        }
        const extensionsToUninstall = installedExtensions.filter((extension) => !extension.isBuiltin &&
            !profileExtensions.some(({ identifier }) => areSameExtensions(identifier, extension.identifier)));
        for (const { extension, enable } of extensionsToEnableOrDisable) {
            if (enable) {
                this.logService.trace(`Initializing Profile: Enabling extension...`, extension.id);
                await this.extensionEnablementService.enableExtension(extension);
                this.logService.info(`Initializing Profile: Enabled extension...`, extension.id);
            }
            else {
                this.logService.trace(`Initializing Profile: Disabling extension...`, extension.id);
                await this.extensionEnablementService.disableExtension(extension);
                this.logService.info(`Initializing Profile: Disabled extension...`, extension.id);
            }
        }
        if (extensionsToInstall.length) {
            const galleryExtensions = await this.extensionGalleryService.getExtensions(extensionsToInstall.map((e) => ({
                ...e.identifier,
                version: e.version,
                hasPreRelease: e.version ? undefined : e.preRelease,
            })), CancellationToken.None);
            await Promise.all(extensionsToInstall.map(async (e) => {
                const extension = galleryExtensions.find((galleryExtension) => areSameExtensions(galleryExtension.identifier, e.identifier));
                if (!extension) {
                    return;
                }
                if ((await this.extensionManagementService.canInstall(extension)) === true) {
                    this.logService.trace(`Initializing Profile: Installing extension...`, extension.identifier.id, extension.version);
                    await this.extensionManagementService.installFromGallery(extension, {
                        isMachineScoped: false /* set isMachineScoped value to prevent install and sync dialog in web */,
                        donotIncludePackAndDependencies: true,
                        installGivenVersion: !!e.version,
                        installPreReleaseVersion: e.preRelease,
                        profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
                        context: {
                            [EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT]: true,
                            [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true,
                        },
                    });
                    this.logService.info(`Initializing Profile: Installed extension...`, extension.identifier.id, extension.version);
                }
                else {
                    this.logService.info(`Initializing Profile: Skipped installing extension because it cannot be installed.`, extension.identifier.id);
                }
            }));
        }
        if (extensionsToUninstall.length) {
            await Promise.all(extensionsToUninstall.map((e) => this.extensionManagementService.uninstall(e)));
        }
    }
};
ExtensionsResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IExtensionManagementService),
    __param(2, IExtensionGalleryService),
    __param(3, IGlobalExtensionEnablementService),
    __param(4, ILogService)
], ExtensionsResourceInitializer);
export { ExtensionsResourceInitializer };
let ExtensionsResource = class ExtensionsResource {
    constructor(extensionManagementService, extensionGalleryService, userDataProfileStorageService, instantiationService, logService) {
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.instantiationService = instantiationService;
        this.logService = logService;
    }
    async getContent(profile, exclude) {
        const extensions = await this.getLocalExtensions(profile);
        return this.toContent(extensions, exclude);
    }
    toContent(extensions, exclude) {
        return JSON.stringify(exclude?.length
            ? extensions.filter((e) => !exclude.includes(e.identifier.id.toLowerCase()))
            : extensions);
    }
    async apply(content, profile, progress, token) {
        return this.withProfileScopedServices(profile, async (extensionEnablementService) => {
            const profileExtensions = await this.getProfileExtensions(content);
            const installedExtensions = await this.extensionManagementService.getInstalled(undefined, profile.extensionsResource);
            const extensionsToEnableOrDisable = [];
            const extensionsToInstall = [];
            for (const e of profileExtensions) {
                const isDisabled = extensionEnablementService
                    .getDisabledExtensions()
                    .some((disabledExtension) => areSameExtensions(disabledExtension, e.identifier));
                const installedExtension = installedExtensions.find((installed) => areSameExtensions(installed.identifier, e.identifier));
                if (!installedExtension ||
                    (!installedExtension.isBuiltin && installedExtension.preRelease !== e.preRelease)) {
                    extensionsToInstall.push(e);
                }
                if (isDisabled !== !!e.disabled) {
                    extensionsToEnableOrDisable.push({ extension: e.identifier, enable: !e.disabled });
                }
            }
            const extensionsToUninstall = installedExtensions.filter((extension) => !extension.isBuiltin &&
                !profileExtensions.some(({ identifier }) => areSameExtensions(identifier, extension.identifier)) &&
                !extension.isApplicationScoped);
            for (const { extension, enable } of extensionsToEnableOrDisable) {
                if (enable) {
                    this.logService.trace(`Importing Profile (${profile.name}): Enabling extension...`, extension.id);
                    await extensionEnablementService.enableExtension(extension);
                    this.logService.info(`Importing Profile (${profile.name}): Enabled extension...`, extension.id);
                }
                else {
                    this.logService.trace(`Importing Profile (${profile.name}): Disabling extension...`, extension.id);
                    await extensionEnablementService.disableExtension(extension);
                    this.logService.info(`Importing Profile (${profile.name}): Disabled extension...`, extension.id);
                }
            }
            if (extensionsToInstall.length) {
                this.logService.info(`Importing Profile (${profile.name}): Started installing extensions.`);
                const galleryExtensions = await this.extensionGalleryService.getExtensions(extensionsToInstall.map((e) => ({
                    ...e.identifier,
                    version: e.version,
                    hasPreRelease: e.version ? undefined : e.preRelease,
                })), CancellationToken.None);
                const installExtensionInfos = [];
                await Promise.all(extensionsToInstall.map(async (e) => {
                    const extension = galleryExtensions.find((galleryExtension) => areSameExtensions(galleryExtension.identifier, e.identifier));
                    if (!extension) {
                        return;
                    }
                    if ((await this.extensionManagementService.canInstall(extension)) === true) {
                        installExtensionInfos.push({
                            extension,
                            options: {
                                isMachineScoped: false /* set isMachineScoped value to prevent install and sync dialog in web */,
                                donotIncludePackAndDependencies: true,
                                installGivenVersion: !!e.version,
                                installPreReleaseVersion: e.preRelease,
                                profileLocation: profile.extensionsResource,
                                context: { [EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT]: true },
                            },
                        });
                    }
                    else {
                        this.logService.info(`Importing Profile (${profile.name}): Skipped installing extension because it cannot be installed.`, extension.identifier.id);
                    }
                }));
                if (installExtensionInfos.length) {
                    if (token) {
                        await this.extensionManagementService.requestPublisherTrust(installExtensionInfos);
                        for (const installExtensionInfo of installExtensionInfos) {
                            if (token.isCancellationRequested) {
                                return;
                            }
                            progress?.(localize('installingExtension', 'Installing extension {0}...', installExtensionInfo.extension.displayName ??
                                installExtensionInfo.extension.identifier.id));
                            await this.extensionManagementService.installFromGallery(installExtensionInfo.extension, installExtensionInfo.options);
                        }
                    }
                    else {
                        await this.extensionManagementService.installGalleryExtensions(installExtensionInfos);
                    }
                }
                this.logService.info(`Importing Profile (${profile.name}): Finished installing extensions.`);
            }
            if (extensionsToUninstall.length) {
                await Promise.all(extensionsToUninstall.map((e) => this.extensionManagementService.uninstall(e)));
            }
        });
    }
    async copy(from, to, disableExtensions) {
        await this.extensionManagementService.copyExtensions(from.extensionsResource, to.extensionsResource);
        const extensionsToDisable = await this.withProfileScopedServices(from, async (extensionEnablementService) => extensionEnablementService.getDisabledExtensions());
        if (disableExtensions) {
            const extensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, to.extensionsResource);
            for (const extension of extensions) {
                extensionsToDisable.push(extension.identifier);
            }
        }
        await this.withProfileScopedServices(to, async (extensionEnablementService) => Promise.all(extensionsToDisable.map((extension) => extensionEnablementService.disableExtension(extension))));
    }
    async getLocalExtensions(profile) {
        return this.withProfileScopedServices(profile, async (extensionEnablementService) => {
            const result = new Map();
            const installedExtensions = await this.extensionManagementService.getInstalled(undefined, profile.extensionsResource);
            const disabledExtensions = extensionEnablementService.getDisabledExtensions();
            for (const extension of installedExtensions) {
                const { identifier, preRelease } = extension;
                const disabled = disabledExtensions.some((disabledExtension) => areSameExtensions(disabledExtension, identifier));
                if (extension.isBuiltin && !disabled) {
                    // skip enabled builtin extensions
                    continue;
                }
                if (!extension.isBuiltin) {
                    if (!extension.identifier.uuid) {
                        // skip user extensions without uuid
                        continue;
                    }
                }
                const existing = result.get(identifier.id.toLowerCase());
                if (existing?.disabled) {
                    // Remove the duplicate disabled extension
                    result.delete(identifier.id.toLowerCase());
                }
                const profileExtension = {
                    identifier,
                    displayName: extension.manifest.displayName,
                };
                if (disabled) {
                    profileExtension.disabled = true;
                }
                if (!extension.isBuiltin && extension.pinned) {
                    profileExtension.version = extension.manifest.version;
                }
                if (!profileExtension.version && preRelease) {
                    profileExtension.preRelease = true;
                }
                profileExtension.applicationScoped = extension.isApplicationScoped;
                result.set(profileExtension.identifier.id.toLowerCase(), profileExtension);
            }
            return [...result.values()];
        });
    }
    async getProfileExtensions(content) {
        return JSON.parse(content);
    }
    async withProfileScopedServices(profile, fn) {
        return this.userDataProfileStorageService.withProfileScopedStorageService(profile, async (storageService) => {
            const disposables = new DisposableStore();
            const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IStorageService, storageService])));
            const extensionEnablementService = disposables.add(instantiationService.createInstance(GlobalExtensionEnablementService));
            try {
                return await fn(extensionEnablementService);
            }
            finally {
                disposables.dispose();
            }
        });
    }
};
ExtensionsResource = __decorate([
    __param(0, IWorkbenchExtensionManagementService),
    __param(1, IExtensionGalleryService),
    __param(2, IUserDataProfileStorageService),
    __param(3, IInstantiationService),
    __param(4, ILogService)
], ExtensionsResource);
export { ExtensionsResource };
export class ExtensionsResourceTreeItem {
    constructor() {
        this.type = "extensions" /* ProfileResourceType.Extensions */;
        this.handle = "extensions" /* ProfileResourceType.Extensions */;
        this.label = { label: localize('extensions', 'Extensions') };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
        this.contextValue = "extensions" /* ProfileResourceType.Extensions */;
        this.excludedExtensions = new Set();
    }
    async getChildren() {
        const extensions = (await this.getExtensions()).sort((a, b) => (a.displayName ?? a.identifier.id).localeCompare(b.displayName ?? b.identifier.id));
        const that = this;
        return extensions.map((e) => ({
            ...e,
            handle: e.identifier.id.toLowerCase(),
            parent: this,
            label: { label: e.displayName || e.identifier.id },
            description: e.applicationScoped
                ? localize('all profiles and disabled', 'All Profiles')
                : undefined,
            collapsibleState: TreeItemCollapsibleState.None,
            checkbox: that.checkbox
                ? {
                    get isChecked() {
                        return !that.excludedExtensions.has(e.identifier.id.toLowerCase());
                    },
                    set isChecked(value) {
                        if (value) {
                            that.excludedExtensions.delete(e.identifier.id.toLowerCase());
                        }
                        else {
                            that.excludedExtensions.add(e.identifier.id.toLowerCase());
                        }
                    },
                    tooltip: localize('exclude', 'Select {0} Extension', e.displayName || e.identifier.id),
                    accessibilityInformation: {
                        label: localize('exclude', 'Select {0} Extension', e.displayName || e.identifier.id),
                    },
                }
                : undefined,
            themeIcon: Codicon.extensions,
            command: {
                id: 'extension.open',
                title: '',
                arguments: [e.identifier.id, undefined, true],
            },
        }));
    }
    async hasContent() {
        const extensions = await this.getExtensions();
        return extensions.length > 0;
    }
}
let ExtensionsResourceExportTreeItem = class ExtensionsResourceExportTreeItem extends ExtensionsResourceTreeItem {
    constructor(profile, instantiationService) {
        super();
        this.profile = profile;
        this.instantiationService = instantiationService;
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.extensions;
    }
    getExtensions() {
        return this.instantiationService
            .createInstance(ExtensionsResource)
            .getLocalExtensions(this.profile);
    }
    async getContent() {
        return this.instantiationService
            .createInstance(ExtensionsResource)
            .getContent(this.profile, [...this.excludedExtensions.values()]);
    }
};
ExtensionsResourceExportTreeItem = __decorate([
    __param(1, IInstantiationService)
], ExtensionsResourceExportTreeItem);
export { ExtensionsResourceExportTreeItem };
let ExtensionsResourceImportTreeItem = class ExtensionsResourceImportTreeItem extends ExtensionsResourceTreeItem {
    constructor(content, instantiationService) {
        super();
        this.content = content;
        this.instantiationService = instantiationService;
    }
    isFromDefaultProfile() {
        return false;
    }
    getExtensions() {
        return this.instantiationService
            .createInstance(ExtensionsResource)
            .getProfileExtensions(this.content);
    }
    async getContent() {
        const extensionsResource = this.instantiationService.createInstance(ExtensionsResource);
        const extensions = await extensionsResource.getProfileExtensions(this.content);
        return extensionsResource.toContent(extensions, [...this.excludedExtensions.values()]);
    }
};
ExtensionsResourceImportTreeItem = __decorate([
    __param(1, IInstantiationService)
], ExtensionsResourceImportTreeItem);
export { ExtensionsResourceImportTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Jlc291cmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvZXh0ZW5zaW9uc1Jlc291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ2hJLE9BQU8sRUFDTiw4Q0FBOEMsRUFDOUMsMENBQTBDLEVBQzFDLHdCQUF3QixFQUV4QiwyQkFBMkIsRUFDM0IsaUNBQWlDLEdBR2pDLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFFOUcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUtoRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQTtBQUM3SCxPQUFPLEVBQTBCLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0YsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0s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