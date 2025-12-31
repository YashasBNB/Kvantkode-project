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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Jlc291cmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL2V4dGVuc2lvbnNSZXNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUNoSSxPQUFPLEVBQ04sOENBQThDLEVBQzlDLDBDQUEwQyxFQUMxQyx3QkFBd0IsRUFFeEIsMkJBQTJCLEVBQzNCLGlDQUFpQyxHQUdqQyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBRTlHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFLaEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sOEVBQThFLENBQUE7QUFDN0gsT0FBTyxFQUEwQix3QkFBd0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNGLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHlEQUF5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