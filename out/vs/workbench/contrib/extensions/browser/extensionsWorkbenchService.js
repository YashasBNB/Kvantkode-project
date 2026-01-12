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
var ExtensionsWorkbenchService_1;
import * as nls from '../../../../nls.js';
import * as semver from '../../../../base/common/semver/semver.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { index } from '../../../../base/common/arrays.js';
import { Promises, ThrottledDelayer, createCancelablePromise, } from '../../../../base/common/async.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { singlePagePager } from '../../../../base/common/paging.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionGalleryService, WEB_EXTENSION_TAG, isTargetPlatformCompatible, EXTENSION_IDENTIFIER_REGEX, TargetPlatformToString, IAllowedExtensionsService, AllowedExtensionsConfigKey, EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, ExtensionManagementError, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService, DefaultIconPath, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { getGalleryExtensionTelemetryData, getLocalExtensionTelemetryData, areSameExtensions, groupByExtension, getGalleryExtensionId, isMalicious, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { URI } from '../../../../base/common/uri.js';
import { AutoUpdateConfigurationKey, AutoCheckUpdatesConfigurationKey, HasOutdatedExtensionsContext, AutoRestartConfigurationKey, VIEWLET_ID, } from '../common/extensions.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP, } from '../../../services/editor/common/editorService.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { ExtensionsInput } from '../common/extensionsInput.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import * as resources from '../../../../base/common/resources.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ExtensionIdentifier, isApplicationScopedExtension, } from '../../../../platform/extensions/common/extensions.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { FileAccess } from '../../../../base/common/network.js';
import { IIgnoredExtensionsManagementService } from '../../../../platform/userDataSync/common/ignoredExtensions.js';
import { IUserDataAutoSyncService, IUserDataSyncEnablementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { isBoolean, isDefined, isString, isUndefined } from '../../../../base/common/types.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { IExtensionService, toExtension, toExtensionDescription, } from '../../../services/extensions/common/extensions.js';
import { isWeb, language } from '../../../../base/common/platform.js';
import { getLocale } from '../../../../platform/languagePacks/common/languagePacks.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IDialogService, IFileDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { areApiProposalsCompatible, isEngineValid, } from '../../../../platform/extensions/common/extensionValidator.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ShowCurrentReleaseNotesActionId } from '../../update/common/update.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { getExtensionGalleryManifestResourceUri, IExtensionGalleryManifestService, } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
let Extension = class Extension {
    constructor(stateProvider, runtimeStateProvider, server, local, _gallery, resourceExtensionInfo, galleryService, telemetryService, logService, fileService, productService) {
        this.stateProvider = stateProvider;
        this.runtimeStateProvider = runtimeStateProvider;
        this.server = server;
        this.local = local;
        this._gallery = _gallery;
        this.resourceExtensionInfo = resourceExtensionInfo;
        this.galleryService = galleryService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.fileService = fileService;
        this.productService = productService;
        this.enablementState = 11 /* EnablementState.EnabledGlobally */;
        this.galleryResourcesCache = new Map();
        this.malicious = false;
    }
    get resourceExtension() {
        if (this.resourceExtensionInfo) {
            return this.resourceExtensionInfo.resourceExtension;
        }
        if (this.local?.isWorkspaceScoped) {
            return {
                type: 'resource',
                identifier: this.local.identifier,
                location: this.local.location,
                manifest: this.local.manifest,
                changelogUri: this.local.changelogUrl,
                readmeUri: this.local.readmeUrl,
            };
        }
        return undefined;
    }
    get gallery() {
        return this._gallery;
    }
    set gallery(gallery) {
        this._gallery = gallery;
        this.galleryResourcesCache.clear();
    }
    get type() {
        return this.local ? this.local.type : 1 /* ExtensionType.User */;
    }
    get isBuiltin() {
        return this.local ? this.local.isBuiltin : false;
    }
    get isWorkspaceScoped() {
        if (this.local) {
            return this.local.isWorkspaceScoped;
        }
        if (this.resourceExtensionInfo) {
            return this.resourceExtensionInfo.isWorkspaceScoped;
        }
        return false;
    }
    get name() {
        if (this.gallery) {
            return this.gallery.name;
        }
        return this.getManifestFromLocalOrResource()?.name ?? '';
    }
    get displayName() {
        if (this.gallery) {
            return this.gallery.displayName || this.gallery.name;
        }
        return this.getManifestFromLocalOrResource()?.displayName ?? this.name;
    }
    get identifier() {
        if (this.gallery) {
            return this.gallery.identifier;
        }
        if (this.resourceExtension) {
            return this.resourceExtension.identifier;
        }
        return this.local.identifier;
    }
    get uuid() {
        return this.gallery ? this.gallery.identifier.uuid : this.local?.identifier.uuid;
    }
    get publisher() {
        if (this.gallery) {
            return this.gallery.publisher;
        }
        return this.getManifestFromLocalOrResource()?.publisher ?? '';
    }
    get publisherDisplayName() {
        if (this.gallery) {
            return this.gallery.publisherDisplayName || this.gallery.publisher;
        }
        if (this.local?.publisherDisplayName) {
            return this.local.publisherDisplayName;
        }
        return this.publisher;
    }
    get publisherUrl() {
        return this.gallery?.publisherLink ? URI.parse(this.gallery.publisherLink) : undefined;
    }
    get publisherDomain() {
        return this.gallery?.publisherDomain;
    }
    get publisherSponsorLink() {
        return this.gallery?.publisherSponsorLink
            ? URI.parse(this.gallery.publisherSponsorLink)
            : undefined;
    }
    get version() {
        return this.local ? this.local.manifest.version : this.latestVersion;
    }
    get private() {
        return this.local ? this.local.private : this.gallery ? this.gallery.private : false;
    }
    get pinned() {
        return !!this.local?.pinned;
    }
    get latestVersion() {
        return this.gallery
            ? this.gallery.version
            : (this.getManifestFromLocalOrResource()?.version ?? '');
    }
    get description() {
        return this.gallery
            ? this.gallery.description
            : (this.getManifestFromLocalOrResource()?.description ?? '');
    }
    get url() {
        return this.gallery?.detailsLink;
    }
    get iconUrl() {
        return (this.galleryIconUrl ||
            this.resourceExtensionIconUrl ||
            this.localIconUrl ||
            this.defaultIconUrl);
    }
    get iconUrlFallback() {
        return (this.galleryIconUrlFallback ||
            this.resourceExtensionIconUrl ||
            this.localIconUrl ||
            this.defaultIconUrl);
    }
    get localIconUrl() {
        if (this.local && this.local.manifest.icon) {
            return FileAccess.uriToBrowserUri(resources.joinPath(this.local.location, this.local.manifest.icon)).toString(true);
        }
        return null;
    }
    get resourceExtensionIconUrl() {
        if (this.resourceExtension?.manifest.icon) {
            return FileAccess.uriToBrowserUri(resources.joinPath(this.resourceExtension.location, this.resourceExtension.manifest.icon)).toString(true);
        }
        return null;
    }
    get galleryIconUrl() {
        return this.gallery?.assets.icon ? this.gallery.assets.icon.uri : null;
    }
    get galleryIconUrlFallback() {
        return this.gallery?.assets.icon ? this.gallery.assets.icon.fallbackUri : null;
    }
    get defaultIconUrl() {
        if (this.type === 0 /* ExtensionType.System */ && this.local) {
            if (this.local.manifest && this.local.manifest.contributes) {
                if (Array.isArray(this.local.manifest.contributes.themes) &&
                    this.local.manifest.contributes.themes.length) {
                    return FileAccess.asBrowserUri('vs/workbench/contrib/extensions/browser/media/theme-icon.png').toString(true);
                }
                if (Array.isArray(this.local.manifest.contributes.grammars) &&
                    this.local.manifest.contributes.grammars.length) {
                    return FileAccess.asBrowserUri('vs/workbench/contrib/extensions/browser/media/language-icon.svg').toString(true);
                }
            }
        }
        return DefaultIconPath;
    }
    get repository() {
        return this.gallery && this.gallery.assets.repository
            ? this.gallery.assets.repository.uri
            : undefined;
    }
    get licenseUrl() {
        return this.gallery && this.gallery.assets.license ? this.gallery.assets.license.uri : undefined;
    }
    get supportUrl() {
        return this.gallery && this.gallery.supportLink ? this.gallery.supportLink : undefined;
    }
    get state() {
        return this.stateProvider(this);
    }
    get isMalicious() {
        return this.malicious || this.enablementState === 4 /* EnablementState.DisabledByMalicious */;
    }
    get installCount() {
        return this.gallery ? this.gallery.installCount : undefined;
    }
    get rating() {
        return this.gallery ? this.gallery.rating : undefined;
    }
    get ratingCount() {
        return this.gallery ? this.gallery.ratingCount : undefined;
    }
    get ratingUrl() {
        return this.gallery?.ratingLink;
    }
    get outdated() {
        try {
            if (!this.gallery || !this.local) {
                return false;
            }
            // Do not allow updating system extensions in stable
            if (this.type === 0 /* ExtensionType.System */ && this.productService.quality === 'stable') {
                return false;
            }
            if (!this.local.preRelease && this.gallery.properties.isPreReleaseVersion) {
                return false;
            }
            if (semver.gt(this.latestVersion, this.version)) {
                return true;
            }
            if (this.outdatedTargetPlatform) {
                return true;
            }
        }
        catch (error) {
            /* Ignore */
        }
        return false;
    }
    get outdatedTargetPlatform() {
        return (!!this.local &&
            !!this.gallery &&
            !["undefined" /* TargetPlatform.UNDEFINED */, "web" /* TargetPlatform.WEB */].includes(this.local.targetPlatform) &&
            this.gallery.properties.targetPlatform !== "web" /* TargetPlatform.WEB */ &&
            this.local.targetPlatform !== this.gallery.properties.targetPlatform &&
            semver.eq(this.latestVersion, this.version));
    }
    get runtimeState() {
        return this.runtimeStateProvider(this);
    }
    get telemetryData() {
        const { local, gallery } = this;
        if (gallery) {
            return getGalleryExtensionTelemetryData(gallery);
        }
        else if (local) {
            return getLocalExtensionTelemetryData(local);
        }
        else {
            return {};
        }
    }
    get preview() {
        return this.local?.manifest.preview ?? this.gallery?.preview ?? false;
    }
    get preRelease() {
        return !!this.local?.preRelease;
    }
    get isPreReleaseVersion() {
        if (this.local) {
            return this.local.isPreReleaseVersion;
        }
        return !!this.gallery?.properties.isPreReleaseVersion;
    }
    get hasPreReleaseVersion() {
        return (!!this.gallery?.hasPreReleaseVersion ||
            !!this.local?.hasPreReleaseVersion ||
            !!this._extensionEnabledWithPreRelease);
    }
    get hasReleaseVersion() {
        return !!this.resourceExtension || !!this.gallery?.hasReleaseVersion;
    }
    getLocal() {
        return this.local && !this.outdated ? this.local : undefined;
    }
    async getManifest(token) {
        const local = this.getLocal();
        if (local) {
            return local.manifest;
        }
        if (this.gallery) {
            return this.getGalleryManifest(token);
        }
        if (this.resourceExtension) {
            return this.resourceExtension.manifest;
        }
        return null;
    }
    async getGalleryManifest(token = CancellationToken.None) {
        if (this.gallery) {
            let cache = this.galleryResourcesCache.get('manifest');
            if (!cache) {
                if (this.gallery.assets.manifest) {
                    this.galleryResourcesCache.set('manifest', (cache = this.galleryService.getManifest(this.gallery, token).catch((e) => {
                        this.galleryResourcesCache.delete('manifest');
                        throw e;
                    })));
                }
                else {
                    this.logService.error(nls.localize('Manifest is not found', 'Manifest is not found'), this.identifier.id);
                }
            }
            return cache;
        }
        return null;
    }
    hasReadme() {
        if (this.local && this.local.readmeUrl) {
            return true;
        }
        if (this.gallery && this.gallery.assets.readme) {
            return true;
        }
        if (this.resourceExtension?.readmeUri) {
            return true;
        }
        return this.type === 0 /* ExtensionType.System */;
    }
    async getReadme(token) {
        const local = this.getLocal();
        if (local?.readmeUrl) {
            const content = await this.fileService.readFile(local.readmeUrl);
            return content.value.toString();
        }
        if (this.gallery) {
            if (this.gallery.assets.readme) {
                return this.galleryService.getReadme(this.gallery, token);
            }
            this.telemetryService.publicLog('extensions:NotFoundReadMe', this.telemetryData);
        }
        if (this.type === 0 /* ExtensionType.System */) {
            return Promise.resolve(`# ${this.displayName || this.name}
**Notice:** This extension is bundled with Visual Studio Code. It can be disabled but not uninstalled.
## Features
${this.description}
`);
        }
        if (this.resourceExtension?.readmeUri) {
            const content = await this.fileService.readFile(this.resourceExtension?.readmeUri);
            return content.value.toString();
        }
        return Promise.reject(new Error('not available'));
    }
    hasChangelog() {
        if (this.local && this.local.changelogUrl) {
            return true;
        }
        if (this.gallery && this.gallery.assets.changelog) {
            return true;
        }
        return this.type === 0 /* ExtensionType.System */;
    }
    async getChangelog(token) {
        const local = this.getLocal();
        if (local?.changelogUrl) {
            const content = await this.fileService.readFile(local.changelogUrl);
            return content.value.toString();
        }
        if (this.gallery?.assets.changelog) {
            return this.galleryService.getChangelog(this.gallery, token);
        }
        if (this.type === 0 /* ExtensionType.System */) {
            return Promise.resolve(`Please check the [VS Code Release Notes](command:${ShowCurrentReleaseNotesActionId}) for changes to the built-in extensions.`);
        }
        return Promise.reject(new Error('not available'));
    }
    get categories() {
        const { local, gallery, resourceExtension } = this;
        if (local && local.manifest.categories && !this.outdated) {
            return local.manifest.categories;
        }
        if (gallery) {
            return gallery.categories;
        }
        if (resourceExtension) {
            return resourceExtension.manifest.categories ?? [];
        }
        return [];
    }
    get tags() {
        const { gallery } = this;
        if (gallery) {
            return gallery.tags.filter((tag) => !tag.startsWith('_'));
        }
        return [];
    }
    get dependencies() {
        const { local, gallery, resourceExtension } = this;
        if (local && local.manifest.extensionDependencies && !this.outdated) {
            return local.manifest.extensionDependencies;
        }
        if (gallery) {
            return gallery.properties.dependencies || [];
        }
        if (resourceExtension) {
            return resourceExtension.manifest.extensionDependencies || [];
        }
        return [];
    }
    get extensionPack() {
        const { local, gallery, resourceExtension } = this;
        if (local && local.manifest.extensionPack && !this.outdated) {
            return local.manifest.extensionPack;
        }
        if (gallery) {
            return gallery.properties.extensionPack || [];
        }
        if (resourceExtension) {
            return resourceExtension.manifest.extensionPack || [];
        }
        return [];
    }
    setExtensionsControlManifest(extensionsControlManifest) {
        this.malicious = isMalicious(this.identifier, extensionsControlManifest.malicious);
        this.deprecationInfo = extensionsControlManifest.deprecated
            ? extensionsControlManifest.deprecated[this.identifier.id.toLowerCase()]
            : undefined;
        this._extensionEnabledWithPreRelease =
            extensionsControlManifest?.extensionsEnabledWithPreRelease?.includes(this.identifier.id.toLowerCase());
    }
    getManifestFromLocalOrResource() {
        if (this.local) {
            return this.local.manifest;
        }
        if (this.resourceExtension) {
            return this.resourceExtension.manifest;
        }
        return null;
    }
};
Extension = __decorate([
    __param(6, IExtensionGalleryService),
    __param(7, ITelemetryService),
    __param(8, ILogService),
    __param(9, IFileService),
    __param(10, IProductService)
], Extension);
export { Extension };
const EXTENSIONS_AUTO_UPDATE_KEY = 'extensions.autoUpdate';
const EXTENSIONS_DONOT_AUTO_UPDATE_KEY = 'extensions.donotAutoUpdate';
const EXTENSIONS_DISMISSED_NOTIFICATIONS_KEY = 'extensions.dismissedNotifications';
let Extensions = class Extensions extends Disposable {
    get onChange() {
        return this._onChange.event;
    }
    get onReset() {
        return this._onReset.event;
    }
    constructor(server, stateProvider, runtimeStateProvider, isWorkspaceServer, galleryService, extensionEnablementService, workbenchExtensionManagementService, telemetryService, instantiationService) {
        super();
        this.server = server;
        this.stateProvider = stateProvider;
        this.runtimeStateProvider = runtimeStateProvider;
        this.isWorkspaceServer = isWorkspaceServer;
        this.galleryService = galleryService;
        this.extensionEnablementService = extensionEnablementService;
        this.workbenchExtensionManagementService = workbenchExtensionManagementService;
        this.telemetryService = telemetryService;
        this.instantiationService = instantiationService;
        this._onChange = this._register(new Emitter());
        this._onReset = this._register(new Emitter());
        this.installing = [];
        this.uninstalling = [];
        this.installed = [];
        this._register(server.extensionManagementService.onInstallExtension((e) => this.onInstallExtension(e)));
        this._register(server.extensionManagementService.onDidInstallExtensions((e) => this.onDidInstallExtensions(e)));
        this._register(server.extensionManagementService.onUninstallExtension((e) => this.onUninstallExtension(e.identifier)));
        this._register(server.extensionManagementService.onDidUninstallExtension((e) => this.onDidUninstallExtension(e)));
        this._register(server.extensionManagementService.onDidUpdateExtensionMetadata((e) => this.onDidUpdateExtensionMetadata(e.local)));
        this._register(server.extensionManagementService.onDidChangeProfile(() => this.reset()));
        this._register(extensionEnablementService.onEnablementChanged((e) => this.onEnablementChanged(e)));
        this._register(Event.any(this.onChange, this.onReset)(() => (this._local = undefined)));
        if (this.isWorkspaceServer) {
            this._register(this.workbenchExtensionManagementService.onInstallExtension((e) => {
                if (e.workspaceScoped) {
                    this.onInstallExtension(e);
                }
            }));
            this._register(this.workbenchExtensionManagementService.onDidInstallExtensions((e) => {
                const result = e.filter((e) => e.workspaceScoped);
                if (result.length) {
                    this.onDidInstallExtensions(result);
                }
            }));
            this._register(this.workbenchExtensionManagementService.onUninstallExtension((e) => {
                if (e.workspaceScoped) {
                    this.onUninstallExtension(e.identifier);
                }
            }));
            this._register(this.workbenchExtensionManagementService.onDidUninstallExtension((e) => {
                if (e.workspaceScoped) {
                    this.onDidUninstallExtension(e);
                }
            }));
        }
    }
    get local() {
        if (!this._local) {
            this._local = [];
            for (const extension of this.installed) {
                this._local.push(extension);
            }
            for (const extension of this.installing) {
                if (!this.installed.some((installed) => areSameExtensions(installed.identifier, extension.identifier))) {
                    this._local.push(extension);
                }
            }
        }
        return this._local;
    }
    async queryInstalled(productVersion) {
        await this.fetchInstalledExtensions(productVersion);
        this._onChange.fire(undefined);
        return this.local;
    }
    async syncInstalledExtensionsWithGallery(galleryExtensions, productVersion) {
        const extensions = await this.mapInstalledExtensionWithCompatibleGalleryExtension(galleryExtensions, productVersion);
        for (const [extension, gallery] of extensions) {
            // update metadata of the extension if it does not exist
            if (extension.local && extension.local.identifier.uuid !== gallery.identifier.uuid) {
                extension.local = await this.updateMetadata(extension.local, gallery);
            }
            if (!extension.gallery ||
                extension.gallery.version !== gallery.version ||
                extension.gallery.properties.targetPlatform !== gallery.properties.targetPlatform) {
                extension.gallery = gallery;
                this._onChange.fire({ extension });
            }
        }
    }
    async mapInstalledExtensionWithCompatibleGalleryExtension(galleryExtensions, productVersion) {
        const mappedExtensions = this.mapInstalledExtensionWithGalleryExtension(galleryExtensions);
        const targetPlatform = await this.server.extensionManagementService.getTargetPlatform();
        const compatibleGalleryExtensions = [];
        const compatibleGalleryExtensionsToFetch = [];
        await Promise.allSettled(mappedExtensions.map(async ([extension, gallery]) => {
            if (extension.local) {
                if (await this.galleryService.isExtensionCompatible(gallery, extension.local.preRelease, targetPlatform, productVersion)) {
                    compatibleGalleryExtensions.push(gallery);
                }
                else {
                    compatibleGalleryExtensionsToFetch.push({
                        ...extension.local.identifier,
                        preRelease: extension.local.preRelease,
                    });
                }
            }
        }));
        if (compatibleGalleryExtensionsToFetch.length) {
            const result = await this.galleryService.getExtensions(compatibleGalleryExtensionsToFetch, { targetPlatform, compatible: true, queryAllVersions: true, productVersion }, CancellationToken.None);
            compatibleGalleryExtensions.push(...result);
        }
        return this.mapInstalledExtensionWithGalleryExtension(compatibleGalleryExtensions);
    }
    mapInstalledExtensionWithGalleryExtension(galleryExtensions) {
        const mappedExtensions = [];
        const byUUID = new Map(), byID = new Map();
        for (const gallery of galleryExtensions) {
            byUUID.set(gallery.identifier.uuid, gallery);
            byID.set(gallery.identifier.id.toLowerCase(), gallery);
        }
        for (const installed of this.installed) {
            if (installed.uuid) {
                const gallery = byUUID.get(installed.uuid);
                if (gallery) {
                    mappedExtensions.push([installed, gallery]);
                    continue;
                }
            }
            if (installed.local?.source !== 'resource') {
                const gallery = byID.get(installed.identifier.id.toLowerCase());
                if (gallery) {
                    mappedExtensions.push([installed, gallery]);
                }
            }
        }
        return mappedExtensions;
    }
    async updateMetadata(localExtension, gallery) {
        let isPreReleaseVersion = false;
        if (localExtension.manifest.version !== gallery.version) {
            this.telemetryService.publicLog2('galleryService:updateMetadata');
            const galleryWithLocalVersion = (await this.galleryService.getExtensions([{ ...localExtension.identifier, version: localExtension.manifest.version }], CancellationToken.None))[0];
            isPreReleaseVersion = !!galleryWithLocalVersion?.properties?.isPreReleaseVersion;
        }
        return this.workbenchExtensionManagementService.updateMetadata(localExtension, {
            id: gallery.identifier.uuid,
            publisherDisplayName: gallery.publisherDisplayName,
            publisherId: gallery.publisherId,
            isPreReleaseVersion,
        });
    }
    canInstall(galleryExtension) {
        return this.server.extensionManagementService.canInstall(galleryExtension);
    }
    onInstallExtension(event) {
        const { source } = event;
        if (source && !URI.isUri(source)) {
            const extension = this.installed.find((e) => areSameExtensions(e.identifier, source.identifier)) ??
                this.instantiationService.createInstance(Extension, this.stateProvider, this.runtimeStateProvider, this.server, undefined, source, undefined);
            this.installing.push(extension);
            this._onChange.fire({ extension });
        }
    }
    async fetchInstalledExtensions(productVersion) {
        const extensionsControlManifest = await this.server.extensionManagementService.getExtensionsControlManifest();
        const all = await this.server.extensionManagementService.getInstalled(undefined, undefined, productVersion);
        if (this.isWorkspaceServer) {
            all.push(...(await this.workbenchExtensionManagementService.getInstalledWorkspaceExtensions(true)));
        }
        // dedup workspace, user and system extensions by giving priority to workspace first and then to user extension.
        const installed = groupByExtension(all, (r) => r.identifier).reduce((result, extensions) => {
            if (extensions.length === 1) {
                result.push(extensions[0]);
            }
            else {
                let workspaceExtension, userExtension, systemExtension;
                for (const extension of extensions) {
                    if (extension.isWorkspaceScoped) {
                        workspaceExtension = extension;
                    }
                    else if (extension.type === 1 /* ExtensionType.User */) {
                        userExtension = extension;
                    }
                    else {
                        systemExtension = extension;
                    }
                }
                const extension = workspaceExtension ?? userExtension ?? systemExtension;
                if (extension) {
                    result.push(extension);
                }
            }
            return result;
        }, []);
        const byId = index(this.installed, (e) => (e.local ? e.local.identifier.id : e.identifier.id));
        this.installed = installed.map((local) => {
            const extension = byId[local.identifier.id] ||
                this.instantiationService.createInstance(Extension, this.stateProvider, this.runtimeStateProvider, this.server, local, undefined, undefined);
            extension.local = local;
            extension.enablementState = this.extensionEnablementService.getEnablementState(local);
            extension.setExtensionsControlManifest(extensionsControlManifest);
            return extension;
        });
    }
    async reset() {
        this.installed = [];
        this.installing = [];
        this.uninstalling = [];
        await this.fetchInstalledExtensions();
        this._onReset.fire();
    }
    async onDidInstallExtensions(results) {
        const extensions = [];
        for (const event of results) {
            const { local, source } = event;
            const gallery = source && !URI.isUri(source) ? source : undefined;
            const location = source && URI.isUri(source) ? source : undefined;
            const installingExtension = gallery
                ? this.installing.filter((e) => areSameExtensions(e.identifier, gallery.identifier))[0]
                : null;
            this.installing = installingExtension
                ? this.installing.filter((e) => e !== installingExtension)
                : this.installing;
            let extension = installingExtension
                ? installingExtension
                : location || local
                    ? this.instantiationService.createInstance(Extension, this.stateProvider, this.runtimeStateProvider, this.server, local, undefined, undefined)
                    : undefined;
            if (extension) {
                if (local) {
                    const installed = this.installed.filter((e) => areSameExtensions(e.identifier, extension.identifier))[0];
                    if (installed) {
                        extension = installed;
                    }
                    else {
                        this.installed.push(extension);
                    }
                    extension.local = local;
                    if (!extension.gallery) {
                        extension.gallery = gallery;
                    }
                    extension.enablementState = this.extensionEnablementService.getEnablementState(local);
                }
                extensions.push(extension);
            }
            this._onChange.fire(!local || !extension ? undefined : { extension, operation: event.operation });
        }
        if (extensions.length) {
            const manifest = await this.server.extensionManagementService.getExtensionsControlManifest();
            for (const extension of extensions) {
                extension.setExtensionsControlManifest(manifest);
            }
            this.matchInstalledExtensionsWithGallery(extensions);
        }
    }
    async onDidUpdateExtensionMetadata(local) {
        const extension = this.installed.find((e) => areSameExtensions(e.identifier, local.identifier));
        if (extension?.local) {
            const hasChanged = extension.local.pinned !== local.pinned || extension.local.preRelease !== local.preRelease;
            extension.local = local;
            if (hasChanged) {
                this._onChange.fire({ extension });
            }
        }
    }
    async matchInstalledExtensionsWithGallery(extensions) {
        const toMatch = extensions.filter((e) => e.local && !e.gallery && e.local.source !== 'resource');
        if (!toMatch.length) {
            return;
        }
        if (!this.galleryService.isEnabled()) {
            return;
        }
        const galleryExtensions = await this.galleryService.getExtensions(toMatch.map((e) => ({ ...e.identifier, preRelease: e.local?.preRelease })), {
            compatible: true,
            targetPlatform: await this.server.extensionManagementService.getTargetPlatform(),
        }, CancellationToken.None);
        for (const extension of extensions) {
            const compatible = galleryExtensions.find((e) => areSameExtensions(e.identifier, extension.identifier));
            if (compatible) {
                extension.gallery = compatible;
                this._onChange.fire({ extension });
            }
        }
    }
    onUninstallExtension(identifier) {
        const extension = this.installed.filter((e) => areSameExtensions(e.identifier, identifier))[0];
        if (extension) {
            const uninstalling = this.uninstalling.filter((e) => areSameExtensions(e.identifier, identifier))[0] || extension;
            this.uninstalling = [
                uninstalling,
                ...this.uninstalling.filter((e) => !areSameExtensions(e.identifier, identifier)),
            ];
            this._onChange.fire(uninstalling ? { extension: uninstalling } : undefined);
        }
    }
    onDidUninstallExtension({ identifier, error }) {
        const uninstalled = this.uninstalling.find((e) => areSameExtensions(e.identifier, identifier)) ||
            this.installed.find((e) => areSameExtensions(e.identifier, identifier));
        this.uninstalling = this.uninstalling.filter((e) => !areSameExtensions(e.identifier, identifier));
        if (!error) {
            this.installed = this.installed.filter((e) => !areSameExtensions(e.identifier, identifier));
        }
        if (uninstalled) {
            this._onChange.fire({ extension: uninstalled });
        }
    }
    onEnablementChanged(platformExtensions) {
        const extensions = this.local.filter((e) => platformExtensions.some((p) => areSameExtensions(e.identifier, p.identifier)));
        for (const extension of extensions) {
            if (extension.local) {
                const enablementState = this.extensionEnablementService.getEnablementState(extension.local);
                if (enablementState !== extension.enablementState) {
                    extension.enablementState = enablementState;
                    this._onChange.fire({ extension });
                }
            }
        }
    }
    getExtensionState(extension) {
        if (extension.gallery &&
            this.installing.some((e) => !!e.gallery && areSameExtensions(e.gallery.identifier, extension.gallery.identifier))) {
            return 0 /* ExtensionState.Installing */;
        }
        if (this.uninstalling.some((e) => areSameExtensions(e.identifier, extension.identifier))) {
            return 2 /* ExtensionState.Uninstalling */;
        }
        const local = this.installed.filter((e) => e === extension ||
            (e.gallery &&
                extension.gallery &&
                areSameExtensions(e.gallery.identifier, extension.gallery.identifier)))[0];
        return local ? 1 /* ExtensionState.Installed */ : 3 /* ExtensionState.Uninstalled */;
    }
};
Extensions = __decorate([
    __param(4, IExtensionGalleryService),
    __param(5, IWorkbenchExtensionEnablementService),
    __param(6, IWorkbenchExtensionManagementService),
    __param(7, ITelemetryService),
    __param(8, IInstantiationService)
], Extensions);
let ExtensionsWorkbenchService = class ExtensionsWorkbenchService extends Disposable {
    static { ExtensionsWorkbenchService_1 = this; }
    static { this.UpdatesCheckInterval = 1000 * 60 * 60 * 12; } // 12 hours
    get onChange() {
        return this._onChange.event;
    }
    get onReset() {
        return this._onReset.event;
    }
    constructor(instantiationService, editorService, extensionManagementService, galleryService, extensionGalleryManifestService, configurationService, telemetryService, notificationService, urlService, extensionEnablementService, hostService, progressService, extensionManagementServerService, languageService, extensionsSyncManagementService, userDataAutoSyncService, productService, contextKeyService, extensionManifestPropertiesService, logService, extensionService, localeService, lifecycleService, fileService, userDataProfileService, storageService, dialogService, userDataSyncEnablementService, updateService, uriIdentityService, workspaceContextService, viewsService, fileDialogService, quickInputService, allowedExtensionsService) {
        super();
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.extensionManagementService = extensionManagementService;
        this.galleryService = galleryService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
        this.extensionEnablementService = extensionEnablementService;
        this.hostService = hostService;
        this.progressService = progressService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.languageService = languageService;
        this.extensionsSyncManagementService = extensionsSyncManagementService;
        this.userDataAutoSyncService = userDataAutoSyncService;
        this.productService = productService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.localeService = localeService;
        this.lifecycleService = lifecycleService;
        this.fileService = fileService;
        this.userDataProfileService = userDataProfileService;
        this.storageService = storageService;
        this.dialogService = dialogService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.updateService = updateService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceContextService = workspaceContextService;
        this.viewsService = viewsService;
        this.fileDialogService = fileDialogService;
        this.quickInputService = quickInputService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.localExtensions = null;
        this.remoteExtensions = null;
        this.webExtensions = null;
        this.extensionsServers = [];
        this._onChange = this._register(new Emitter());
        this._onDidChangeExtensionsNotification = new Emitter();
        this.onDidChangeExtensionsNotification = this._onDidChangeExtensionsNotification.event;
        this._onReset = new Emitter();
        this.preferPreReleases = this.productService.quality !== 'stable';
        this.installing = [];
        this.tasksInProgress = [];
        this.autoRestartListenerDisposable = this._register(new MutableDisposable());
        const preferPreReleasesValue = configurationService.getValue('_extensions.preferPreReleases');
        if (!isUndefined(preferPreReleasesValue)) {
            this.preferPreReleases = !!preferPreReleasesValue;
        }
        this.hasOutdatedExtensionsContextKey = HasOutdatedExtensionsContext.bindTo(contextKeyService);
        if (extensionManagementServerService.localExtensionManagementServer) {
            this.localExtensions = this._register(instantiationService.createInstance(Extensions, extensionManagementServerService.localExtensionManagementServer, (ext) => this.getExtensionState(ext), (ext) => this.getRuntimeState(ext), !extensionManagementServerService.remoteExtensionManagementServer));
            this._register(this.localExtensions.onChange((e) => this.onDidChangeExtensions(e?.extension)));
            this._register(this.localExtensions.onReset((e) => this.reset()));
            this.extensionsServers.push(this.localExtensions);
        }
        if (extensionManagementServerService.remoteExtensionManagementServer) {
            this.remoteExtensions = this._register(instantiationService.createInstance(Extensions, extensionManagementServerService.remoteExtensionManagementServer, (ext) => this.getExtensionState(ext), (ext) => this.getRuntimeState(ext), true));
            this._register(this.remoteExtensions.onChange((e) => this.onDidChangeExtensions(e?.extension)));
            this._register(this.remoteExtensions.onReset((e) => this.reset()));
            this.extensionsServers.push(this.remoteExtensions);
        }
        if (extensionManagementServerService.webExtensionManagementServer) {
            this.webExtensions = this._register(instantiationService.createInstance(Extensions, extensionManagementServerService.webExtensionManagementServer, (ext) => this.getExtensionState(ext), (ext) => this.getRuntimeState(ext), !(extensionManagementServerService.remoteExtensionManagementServer ||
                extensionManagementServerService.localExtensionManagementServer)));
            this._register(this.webExtensions.onChange((e) => this.onDidChangeExtensions(e?.extension)));
            this._register(this.webExtensions.onReset((e) => this.reset()));
            this.extensionsServers.push(this.webExtensions);
        }
        this.updatesCheckDelayer = new ThrottledDelayer(ExtensionsWorkbenchService_1.UpdatesCheckInterval);
        this.autoUpdateDelayer = new ThrottledDelayer(1000);
        this._register(toDisposable(() => {
            this.updatesCheckDelayer.cancel();
            this.autoUpdateDelayer.cancel();
        }));
        urlService.registerHandler(this);
        this.whenInitialized = this.initialize();
    }
    async initialize() {
        // initialize local extensions
        await Promise.all([
            this.queryLocal(),
            this.extensionService.whenInstalledExtensionsRegistered(),
        ]);
        if (this._store.isDisposed) {
            return;
        }
        this.onDidChangeRunningExtensions(this.extensionService.extensions, []);
        this._register(this.extensionService.onDidChangeExtensions(({ added, removed }) => this.onDidChangeRunningExtensions(added, removed)));
        await this.lifecycleService.when(4 /* LifecyclePhase.Eventually */);
        if (this._store.isDisposed) {
            return;
        }
        this.initializeAutoUpdate();
        this.updateExtensionsNotificaiton();
        this.reportInstalledExtensionsTelemetry();
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, EXTENSIONS_DISMISSED_NOTIFICATIONS_KEY, this._store)((e) => this.onDidDismissedNotificationsValueChange()));
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, EXTENSIONS_AUTO_UPDATE_KEY, this._store)((e) => this.onDidSelectedExtensionToAutoUpdateValueChange()));
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, EXTENSIONS_DONOT_AUTO_UPDATE_KEY, this._store)((e) => this.onDidSelectedExtensionToAutoUpdateValueChange()));
        this._register(Event.debounce(this.onChange, () => undefined, 100)(() => {
            this.updateExtensionsNotificaiton();
            this.reportProgressFromOtherSources();
        }));
    }
    initializeAutoUpdate() {
        // Register listeners for auto updates
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(AutoUpdateConfigurationKey)) {
                if (this.isAutoUpdateEnabled()) {
                    this.eventuallyAutoUpdateExtensions();
                }
            }
            if (e.affectsConfiguration(AutoCheckUpdatesConfigurationKey)) {
                if (this.isAutoCheckUpdatesEnabled()) {
                    this.checkForUpdates(`Enabled auto check updates`);
                }
            }
        }));
        this._register(this.extensionEnablementService.onEnablementChanged((platformExtensions) => {
            if (this.getAutoUpdateValue() === 'onlyEnabledExtensions' &&
                platformExtensions.some((e) => this.extensionEnablementService.isEnabled(e))) {
                this.checkForUpdates('Extension enablement changed');
            }
        }));
        this._register(Event.debounce(this.onChange, () => undefined, 100)(() => this.hasOutdatedExtensionsContextKey.set(this.outdated.length > 0)));
        this._register(this.updateService.onStateChange((e) => {
            if ((e.type === "checking for updates" /* StateType.CheckingForUpdates */ && e.explicit) ||
                e.type === "available for download" /* StateType.AvailableForDownload */ ||
                e.type === "downloaded" /* StateType.Downloaded */) {
                this.telemetryService.publicLog2('extensions:updatecheckonproductupdate');
                if (this.isAutoCheckUpdatesEnabled()) {
                    this.checkForUpdates('Product update');
                }
            }
        }));
        this._register(this.allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => {
            if (this.isAutoCheckUpdatesEnabled()) {
                this.checkForUpdates('Allowed extensions changed');
            }
        }));
        // Update AutoUpdate Contexts
        this.hasOutdatedExtensionsContextKey.set(this.outdated.length > 0);
        // Check for updates
        this.eventuallyCheckForUpdates(true);
        if (isWeb) {
            this.syncPinnedBuiltinExtensions();
            // Always auto update builtin extensions in web
            if (!this.isAutoUpdateEnabled()) {
                this.autoUpdateBuiltinExtensions();
            }
        }
        this.registerAutoRestartListener();
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(AutoRestartConfigurationKey)) {
                this.registerAutoRestartListener();
            }
        }));
    }
    isAutoUpdateEnabled() {
        return this.getAutoUpdateValue() !== false;
    }
    getAutoUpdateValue() {
        const autoUpdate = this.configurationService.getValue(AutoUpdateConfigurationKey);
        if (autoUpdate === 'onlySelectedExtensions') {
            return false;
        }
        return isBoolean(autoUpdate) || autoUpdate === 'onlyEnabledExtensions' ? autoUpdate : true;
    }
    async updateAutoUpdateForAllExtensions(isAutoUpdateEnabled) {
        const wasAutoUpdateEnabled = this.isAutoUpdateEnabled();
        if (wasAutoUpdateEnabled === isAutoUpdateEnabled) {
            return;
        }
        const result = await this.dialogService.confirm({
            title: nls.localize('confirmEnableDisableAutoUpdate', 'Auto Update Extensions'),
            message: isAutoUpdateEnabled
                ? nls.localize('confirmEnableAutoUpdate', 'Do you want to enable auto update for all extensions?')
                : nls.localize('confirmDisableAutoUpdate', 'Do you want to disable auto update for all extensions?'),
            detail: nls.localize('confirmEnableDisableAutoUpdateDetail', 'This will reset any auto update settings you have set for individual extensions.'),
        });
        if (!result.confirmed) {
            return;
        }
        // Reset extensions enabled for auto update first to prevent them from being updated
        this.setEnabledAutoUpdateExtensions([]);
        await this.configurationService.updateValue(AutoUpdateConfigurationKey, isAutoUpdateEnabled);
        this.setDisabledAutoUpdateExtensions([]);
        await this.updateExtensionsPinnedState(!isAutoUpdateEnabled);
        this._onChange.fire(undefined);
    }
    registerAutoRestartListener() {
        this.autoRestartListenerDisposable.value = undefined;
        if (this.configurationService.getValue(AutoRestartConfigurationKey) === true) {
            this.autoRestartListenerDisposable.value = this.hostService.onDidChangeFocus((focus) => {
                if (!focus && this.configurationService.getValue(AutoRestartConfigurationKey) === true) {
                    this.updateRunningExtensions(true);
                }
            });
        }
    }
    reportInstalledExtensionsTelemetry() {
        const extensionIds = this.installed
            .filter((extension) => !extension.isBuiltin &&
            (extension.enablementState === 12 /* EnablementState.EnabledWorkspace */ ||
                extension.enablementState === 11 /* EnablementState.EnabledGlobally */))
            .map((extension) => ExtensionIdentifier.toKey(extension.identifier.id));
        this.telemetryService.publicLog2('installedExtensions', {
            extensionIds: new TelemetryTrustedValue(extensionIds.join(';')),
            count: extensionIds.length,
        });
    }
    async onDidChangeRunningExtensions(added, removed) {
        const changedExtensions = [];
        const extensionsToFetch = [];
        for (const desc of added) {
            const extension = this.installed.find((e) => areSameExtensions({ id: desc.identifier.value, uuid: desc.uuid }, e.identifier));
            if (extension) {
                changedExtensions.push(extension);
            }
            else {
                extensionsToFetch.push(desc);
            }
        }
        const workspaceExtensions = [];
        for (const desc of removed) {
            if (this.workspaceContextService.isInsideWorkspace(desc.extensionLocation)) {
                workspaceExtensions.push(desc);
            }
            else {
                extensionsToFetch.push(desc);
            }
        }
        if (extensionsToFetch.length) {
            const extensions = await this.getExtensions(extensionsToFetch.map((e) => ({ id: e.identifier.value, uuid: e.uuid })), CancellationToken.None);
            changedExtensions.push(...extensions);
        }
        if (workspaceExtensions.length) {
            const extensions = await this.getResourceExtensions(workspaceExtensions.map((e) => e.extensionLocation), true);
            changedExtensions.push(...extensions);
        }
        for (const changedExtension of changedExtensions) {
            this._onChange.fire(changedExtension);
        }
    }
    updateExtensionsPinnedState(pinned) {
        return this.progressService.withProgress({
            location: 5 /* ProgressLocation.Extensions */,
            title: nls.localize('updatingExtensions', 'Updating Extensions Auto Update State'),
        }, () => this.extensionManagementService.resetPinnedStateForAllUserExtensions(pinned));
    }
    reset() {
        for (const task of this.tasksInProgress) {
            task.cancel();
        }
        this.tasksInProgress = [];
        this.installing = [];
        this.onDidChangeExtensions();
        this._onReset.fire();
    }
    onDidChangeExtensions(extension) {
        this._installed = undefined;
        this._local = undefined;
        this._onChange.fire(extension);
    }
    get local() {
        if (!this._local) {
            if (this.extensionsServers.length === 1) {
                this._local = this.installed;
            }
            else {
                this._local = [];
                const byId = groupByExtension(this.installed, (r) => r.identifier);
                for (const extensions of byId) {
                    this._local.push(this.getPrimaryExtension(extensions));
                }
            }
        }
        return this._local;
    }
    get installed() {
        if (!this._installed) {
            this._installed = [];
            for (const extensions of this.extensionsServers) {
                for (const extension of extensions.local) {
                    this._installed.push(extension);
                }
            }
        }
        return this._installed;
    }
    get outdated() {
        return this.installed.filter((e) => e.outdated && e.local && e.state === 1 /* ExtensionState.Installed */);
    }
    async queryLocal(server) {
        if (server) {
            if (this.localExtensions &&
                this.extensionManagementServerService.localExtensionManagementServer === server) {
                return this.localExtensions.queryInstalled(this.getProductVersion());
            }
            if (this.remoteExtensions &&
                this.extensionManagementServerService.remoteExtensionManagementServer === server) {
                return this.remoteExtensions.queryInstalled(this.getProductVersion());
            }
            if (this.webExtensions &&
                this.extensionManagementServerService.webExtensionManagementServer === server) {
                return this.webExtensions.queryInstalled(this.getProductVersion());
            }
        }
        if (this.localExtensions) {
            try {
                await this.localExtensions.queryInstalled(this.getProductVersion());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        if (this.remoteExtensions) {
            try {
                await this.remoteExtensions.queryInstalled(this.getProductVersion());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        if (this.webExtensions) {
            try {
                await this.webExtensions.queryInstalled(this.getProductVersion());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return this.local;
    }
    async queryGallery(arg1, arg2) {
        if (!this.galleryService.isEnabled()) {
            return singlePagePager([]);
        }
        const options = CancellationToken.isCancellationToken(arg1) ? {} : arg1;
        const token = CancellationToken.isCancellationToken(arg1) ? arg1 : arg2;
        options.text = options.text ? this.resolveQueryText(options.text) : options.text;
        options.includePreRelease = isUndefined(options.includePreRelease)
            ? this.preferPreReleases
            : options.includePreRelease;
        const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
        const pager = await this.galleryService.query(options, token);
        this.syncInstalledExtensionsWithGallery(pager.firstPage);
        return {
            firstPage: pager.firstPage.map((gallery) => this.fromGallery(gallery, extensionsControlManifest)),
            total: pager.total,
            pageSize: pager.pageSize,
            getPage: async (pageIndex, token) => {
                const page = await pager.getPage(pageIndex, token);
                this.syncInstalledExtensionsWithGallery(page);
                return page.map((gallery) => this.fromGallery(gallery, extensionsControlManifest));
            },
        };
    }
    async getExtensions(extensionInfos, arg1, arg2) {
        if (!this.galleryService.isEnabled()) {
            return [];
        }
        extensionInfos.forEach((e) => (e.preRelease = e.preRelease ?? this.preferPreReleases));
        const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
        const galleryExtensions = await this.galleryService.getExtensions(extensionInfos, arg1, arg2);
        this.syncInstalledExtensionsWithGallery(galleryExtensions);
        return galleryExtensions.map((gallery) => this.fromGallery(gallery, extensionsControlManifest));
    }
    async getResourceExtensions(locations, isWorkspaceScoped) {
        const resourceExtensions = await this.extensionManagementService.getExtensions(locations);
        return resourceExtensions.map((resourceExtension) => this.getInstalledExtensionMatchingLocation(resourceExtension.location) ??
            this.instantiationService.createInstance(Extension, (ext) => this.getExtensionState(ext), (ext) => this.getRuntimeState(ext), undefined, undefined, undefined, { resourceExtension, isWorkspaceScoped }));
    }
    onDidDismissedNotificationsValueChange() {
        if (this.dismissedNotificationsValue !==
            this.getDismissedNotificationsValue() /* This checks if current window changed the value or not */) {
            this._dismissedNotificationsValue = undefined;
            this.updateExtensionsNotificaiton();
        }
    }
    updateExtensionsNotificaiton() {
        const computedNotificiations = this.computeExtensionsNotifications();
        const dismissedNotifications = [];
        let extensionsNotification;
        if (computedNotificiations.length) {
            // populate dismissed notifications with the ones that are still valid
            for (const dismissedNotification of this.getDismissedNotifications()) {
                if (computedNotificiations.some((e) => e.key === dismissedNotification)) {
                    dismissedNotifications.push(dismissedNotification);
                }
            }
            if (!dismissedNotifications.includes(computedNotificiations[0].key)) {
                extensionsNotification = {
                    message: computedNotificiations[0].message,
                    severity: computedNotificiations[0].severity,
                    extensions: computedNotificiations[0].extensions,
                    key: computedNotificiations[0].key,
                    dismiss: () => {
                        this.setDismissedNotifications([
                            ...this.getDismissedNotifications(),
                            computedNotificiations[0].key,
                        ]);
                        this.updateExtensionsNotificaiton();
                    },
                };
            }
        }
        this.setDismissedNotifications(dismissedNotifications);
        if (this.extensionsNotification?.key !== extensionsNotification?.key) {
            this.extensionsNotification = extensionsNotification;
            this._onDidChangeExtensionsNotification.fire(this.extensionsNotification);
        }
    }
    computeExtensionsNotifications() {
        const computedNotificiations = [];
        const disallowedExtensions = this.local.filter((e) => e.enablementState === 7 /* EnablementState.DisabledByAllowlist */);
        if (disallowedExtensions.length) {
            computedNotificiations.push({
                message: this.configurationService.inspect(AllowedExtensionsConfigKey).policy
                    ? nls.localize('disallowed extensions by policy', 'Some extensions are disabled because they are not allowed by your system administrator.')
                    : nls.localize('disallowed extensions', 'Some extensions are disabled because they are configured not to be allowed.'),
                severity: Severity.Warning,
                extensions: disallowedExtensions,
                key: 'disallowedExtensions:' +
                    disallowedExtensions
                        .sort((a, b) => a.identifier.id.localeCompare(b.identifier.id))
                        .map((e) => e.identifier.id.toLowerCase())
                        .join('-'),
            });
        }
        const invalidExtensions = this.local.filter((e) => e.enablementState === 6 /* EnablementState.DisabledByInvalidExtension */ && !e.isWorkspaceScoped);
        if (invalidExtensions.length) {
            if (invalidExtensions.some((e) => e.local &&
                e.local.manifest.engines?.vscode &&
                (!isEngineValid(e.local.manifest.engines.vscode, this.productService.version, this.productService.date) ||
                    areApiProposalsCompatible([...(e.local.manifest.enabledApiProposals ?? [])])))) {
                computedNotificiations.push({
                    message: nls.localize('incompatibleExtensions', 'Some extensions are disabled due to version incompatibility. Review and update them.'),
                    severity: Severity.Warning,
                    extensions: invalidExtensions,
                    key: 'incompatibleExtensions:' +
                        invalidExtensions
                            .sort((a, b) => a.identifier.id.localeCompare(b.identifier.id))
                            .map((e) => `${e.identifier.id.toLowerCase()}@${e.local?.manifest.version}`)
                            .join('-'),
                });
            }
            else {
                computedNotificiations.push({
                    message: nls.localize('invalidExtensions', 'Invalid extensions detected. Review them.'),
                    severity: Severity.Warning,
                    extensions: invalidExtensions,
                    key: 'invalidExtensions:' +
                        invalidExtensions
                            .sort((a, b) => a.identifier.id.localeCompare(b.identifier.id))
                            .map((e) => `${e.identifier.id.toLowerCase()}@${e.local?.manifest.version}`)
                            .join('-'),
                });
            }
        }
        const deprecatedExtensions = this.local.filter((e) => !!e.deprecationInfo && e.local && this.extensionEnablementService.isEnabled(e.local));
        if (deprecatedExtensions.length) {
            computedNotificiations.push({
                message: nls.localize('deprecated extensions', 'Deprecated extensions detected. Review them and migrate to alternatives.'),
                severity: Severity.Warning,
                extensions: deprecatedExtensions,
                key: 'deprecatedExtensions:' +
                    deprecatedExtensions
                        .sort((a, b) => a.identifier.id.localeCompare(b.identifier.id))
                        .map((e) => e.identifier.id.toLowerCase())
                        .join('-'),
            });
        }
        return computedNotificiations;
    }
    getExtensionsNotification() {
        return this.extensionsNotification;
    }
    resolveQueryText(text) {
        text = text.replace(/@web/g, `tag:"${WEB_EXTENSION_TAG}"`);
        const extensionRegex = /\bext:([^\s]+)\b/g;
        if (extensionRegex.test(text)) {
            text = text.replace(extensionRegex, (m, ext) => {
                // Get curated keywords
                const lookup = this.productService.extensionKeywords || {};
                const keywords = lookup[ext] || [];
                // Get mode name
                const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(URI.file(`.${ext}`));
                const languageName = languageId && this.languageService.getLanguageName(languageId);
                const languageTag = languageName ? ` tag:"${languageName}"` : '';
                // Construct a rich query
                return `tag:"__ext_${ext}" tag:"__ext_.${ext}" ${keywords.map((tag) => `tag:"${tag}"`).join(' ')}${languageTag} tag:"${ext}"`;
            });
        }
        return text.substr(0, 350);
    }
    fromGallery(gallery, extensionsControlManifest) {
        let extension = this.getInstalledExtensionMatchingGallery(gallery);
        if (!extension) {
            extension = this.instantiationService.createInstance(Extension, (ext) => this.getExtensionState(ext), (ext) => this.getRuntimeState(ext), undefined, undefined, gallery, undefined);
            extension.setExtensionsControlManifest(extensionsControlManifest);
        }
        return extension;
    }
    getInstalledExtensionMatchingGallery(gallery) {
        for (const installed of this.local) {
            if (installed.identifier.uuid) {
                // Installed from Gallery
                if (installed.identifier.uuid === gallery.identifier.uuid) {
                    return installed;
                }
            }
            else if (installed.local?.source !== 'resource') {
                if (areSameExtensions(installed.identifier, gallery.identifier)) {
                    // Installed from other sources
                    return installed;
                }
            }
        }
        return null;
    }
    getInstalledExtensionMatchingLocation(location) {
        return (this.local.find((e) => e.local && this.uriIdentityService.extUri.isEqualOrParent(location, e.local?.location)) ?? null);
    }
    async open(extension, options) {
        if (typeof extension === 'string') {
            const id = extension;
            extension =
                this.installed.find((e) => areSameExtensions(e.identifier, { id })) ??
                    (await this.getExtensions([{ id: extension }], CancellationToken.None))[0];
        }
        if (!extension) {
            throw new Error(`Extension not found. ${extension}`);
        }
        await this.editorService.openEditor(this.instantiationService.createInstance(ExtensionsInput, extension), options, options?.sideByside ? SIDE_GROUP : ACTIVE_GROUP);
    }
    async openSearch(searchValue, preserveFoucs) {
        const viewPaneContainer = (await this.viewsService.openViewContainer(VIEWLET_ID, true))?.getViewPaneContainer();
        viewPaneContainer.search(searchValue);
        if (!preserveFoucs) {
            viewPaneContainer.focus();
        }
    }
    getExtensionRuntimeStatus(extension) {
        const extensionsStatus = this.extensionService.getExtensionsStatus();
        for (const id of Object.keys(extensionsStatus)) {
            if (areSameExtensions({ id }, extension.identifier)) {
                return extensionsStatus[id];
            }
        }
        return undefined;
    }
    async updateRunningExtensions(auto = false) {
        const toAdd = [];
        const toRemove = [];
        const extensionsToCheck = [...this.local];
        for (const extension of extensionsToCheck) {
            const runtimeState = extension.runtimeState;
            if (!runtimeState || runtimeState.action !== "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */) {
                continue;
            }
            if (extension.state === 3 /* ExtensionState.Uninstalled */) {
                toRemove.push(extension.identifier.id);
                continue;
            }
            if (!extension.local) {
                continue;
            }
            const isEnabled = this.extensionEnablementService.isEnabled(extension.local);
            if (isEnabled) {
                const runningExtension = this.extensionService.extensions.find((e) => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, extension.identifier));
                if (runningExtension) {
                    toRemove.push(runningExtension.identifier.value);
                }
                toAdd.push(extension.local);
            }
            else {
                toRemove.push(extension.identifier.id);
            }
        }
        for (const extension of this.extensionService.extensions) {
            if (extension.isUnderDevelopment) {
                continue;
            }
            if (extensionsToCheck.some((e) => areSameExtensions({ id: extension.identifier.value, uuid: extension.uuid }, e.local?.identifier ?? e.identifier))) {
                continue;
            }
            // Extension is running but doesn't exist locally. Remove it from running extensions.
            toRemove.push(extension.identifier.value);
        }
        if (toAdd.length || toRemove.length) {
            if (await this.extensionService.stopExtensionHosts(nls.localize('restart', 'Changing extension enablement'), auto)) {
                await this.extensionService.startExtensionHosts({ toAdd, toRemove });
                if (auto) {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: nls.localize('extensionsAutoRestart', 'Extensions were auto restarted to enable updates.'),
                        priority: NotificationPriority.SILENT,
                    });
                }
                this.telemetryService.publicLog2('extensions:autorestart', { count: toAdd.length + toRemove.length, auto });
            }
        }
    }
    getRuntimeState(extension) {
        const isUninstalled = extension.state === 3 /* ExtensionState.Uninstalled */;
        const runningExtension = this.extensionService.extensions.find((e) => areSameExtensions({ id: e.identifier.value }, extension.identifier));
        const reloadAction = this.extensionManagementServerService.remoteExtensionManagementServer
            ? "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */
            : "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */;
        const reloadActionLabel = reloadAction === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */
            ? nls.localize('reload', 'reload window')
            : nls.localize('restart extensions', 'restart extensions');
        if (isUninstalled) {
            const canRemoveRunningExtension = runningExtension && this.extensionService.canRemoveExtension(runningExtension);
            const isSameExtensionRunning = runningExtension &&
                (!extension.server ||
                    extension.server ===
                        this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension))) &&
                (!extension.resourceExtension ||
                    this.uriIdentityService.extUri.isEqual(extension.resourceExtension.location, runningExtension.extensionLocation));
            if (!canRemoveRunningExtension &&
                isSameExtensionRunning &&
                !runningExtension.isUnderDevelopment) {
                return {
                    action: reloadAction,
                    reason: nls.localize('postUninstallTooltip', 'Please {0} to complete the uninstallation of this extension.', reloadActionLabel),
                };
            }
            return undefined;
        }
        if (extension.local) {
            const isSameExtensionRunning = runningExtension &&
                extension.server ===
                    this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension));
            const isEnabled = this.extensionEnablementService.isEnabled(extension.local);
            // Extension is running
            if (runningExtension) {
                if (isEnabled) {
                    // No Reload is required if extension can run without reload
                    if (this.extensionService.canAddExtension(toExtensionDescription(extension.local))) {
                        return undefined;
                    }
                    const runningExtensionServer = this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension));
                    if (isSameExtensionRunning) {
                        // Different version or target platform of same extension is running. Requires reload to run the current version
                        if (!runningExtension.isUnderDevelopment &&
                            (extension.version !== runningExtension.version ||
                                extension.local.targetPlatform !== runningExtension.targetPlatform)) {
                            const productCurrentVersion = this.getProductCurrentVersion();
                            const productUpdateVersion = this.getProductUpdateVersion();
                            if (productUpdateVersion &&
                                !isEngineValid(extension.local.manifest.engines.vscode, productCurrentVersion.version, productCurrentVersion.date) &&
                                isEngineValid(extension.local.manifest.engines.vscode, productUpdateVersion.version, productUpdateVersion.date)) {
                                const state = this.updateService.state;
                                if (state.type === "available for download" /* StateType.AvailableForDownload */) {
                                    return {
                                        action: "downloadUpdate" /* ExtensionRuntimeActionType.DownloadUpdate */,
                                        reason: nls.localize('postUpdateDownloadTooltip', 'Please update {0} to enable the updated extension.', this.productService.nameLong),
                                    };
                                }
                                if (state.type === "downloaded" /* StateType.Downloaded */) {
                                    return {
                                        action: "applyUpdate" /* ExtensionRuntimeActionType.ApplyUpdate */,
                                        reason: nls.localize('postUpdateUpdateTooltip', 'Please update {0} to enable the updated extension.', this.productService.nameLong),
                                    };
                                }
                                if (state.type === "ready" /* StateType.Ready */) {
                                    return {
                                        action: "quitAndInstall" /* ExtensionRuntimeActionType.QuitAndInstall */,
                                        reason: nls.localize('postUpdateRestartTooltip', 'Please restart {0} to enable the updated extension.', this.productService.nameLong),
                                    };
                                }
                                return undefined;
                            }
                            return {
                                action: reloadAction,
                                reason: nls.localize('postUpdateTooltip', 'Please {0} to enable the updated extension.', reloadActionLabel),
                            };
                        }
                        if (this.extensionsServers.length > 1) {
                            const extensionInOtherServer = this.installed.filter((e) => areSameExtensions(e.identifier, extension.identifier) &&
                                e.server !== extension.server)[0];
                            if (extensionInOtherServer) {
                                // This extension prefers to run on UI/Local side but is running in remote
                                if (runningExtensionServer ===
                                    this.extensionManagementServerService.remoteExtensionManagementServer &&
                                    this.extensionManifestPropertiesService.prefersExecuteOnUI(extension.local.manifest) &&
                                    extensionInOtherServer.server ===
                                        this.extensionManagementServerService.localExtensionManagementServer) {
                                    return {
                                        action: reloadAction,
                                        reason: nls.localize('enable locally', 'Please {0} to enable this extension locally.', reloadActionLabel),
                                    };
                                }
                                // This extension prefers to run on Workspace/Remote side but is running in local
                                if (runningExtensionServer ===
                                    this.extensionManagementServerService.localExtensionManagementServer &&
                                    this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(extension.local.manifest) &&
                                    extensionInOtherServer.server ===
                                        this.extensionManagementServerService.remoteExtensionManagementServer) {
                                    return {
                                        action: reloadAction,
                                        reason: nls.localize('enable remote', 'Please {0} to enable this extension in {1}.', reloadActionLabel, this.extensionManagementServerService.remoteExtensionManagementServer?.label),
                                    };
                                }
                            }
                        }
                    }
                    else {
                        if (extension.server ===
                            this.extensionManagementServerService.localExtensionManagementServer &&
                            runningExtensionServer ===
                                this.extensionManagementServerService.remoteExtensionManagementServer) {
                            // This extension prefers to run on UI/Local side but is running in remote
                            if (this.extensionManifestPropertiesService.prefersExecuteOnUI(extension.local.manifest)) {
                                return {
                                    action: reloadAction,
                                    reason: nls.localize('postEnableTooltip', 'Please {0} to enable this extension.', reloadActionLabel),
                                };
                            }
                        }
                        if (extension.server ===
                            this.extensionManagementServerService.remoteExtensionManagementServer &&
                            runningExtensionServer ===
                                this.extensionManagementServerService.localExtensionManagementServer) {
                            // This extension prefers to run on Workspace/Remote side but is running in local
                            if (this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(extension.local.manifest)) {
                                return {
                                    action: reloadAction,
                                    reason: nls.localize('postEnableTooltip', 'Please {0} to enable this extension.', reloadActionLabel),
                                };
                            }
                        }
                    }
                    return undefined;
                }
                else {
                    if (isSameExtensionRunning) {
                        return {
                            action: reloadAction,
                            reason: nls.localize('postDisableTooltip', 'Please {0} to disable this extension.', reloadActionLabel),
                        };
                    }
                }
                return undefined;
            }
            // Extension is not running
            else {
                if (isEnabled &&
                    !this.extensionService.canAddExtension(toExtensionDescription(extension.local))) {
                    return {
                        action: reloadAction,
                        reason: nls.localize('postEnableTooltip', 'Please {0} to enable this extension.', reloadActionLabel),
                    };
                }
                const otherServer = extension.server
                    ? extension.server ===
                        this.extensionManagementServerService.localExtensionManagementServer
                        ? this.extensionManagementServerService.remoteExtensionManagementServer
                        : this.extensionManagementServerService.localExtensionManagementServer
                    : null;
                if (otherServer && extension.enablementState === 1 /* EnablementState.DisabledByExtensionKind */) {
                    const extensionInOtherServer = this.local.filter((e) => areSameExtensions(e.identifier, extension.identifier) && e.server === otherServer)[0];
                    // Same extension in other server exists and
                    if (extensionInOtherServer &&
                        extensionInOtherServer.local &&
                        this.extensionEnablementService.isEnabled(extensionInOtherServer.local)) {
                        return {
                            action: reloadAction,
                            reason: nls.localize('postEnableTooltip', 'Please {0} to enable this extension.', reloadActionLabel),
                        };
                    }
                }
            }
        }
        return undefined;
    }
    getPrimaryExtension(extensions) {
        if (extensions.length === 1) {
            return extensions[0];
        }
        const enabledExtensions = extensions.filter((e) => e.local && this.extensionEnablementService.isEnabled(e.local));
        if (enabledExtensions.length === 1) {
            return enabledExtensions[0];
        }
        const extensionsToChoose = enabledExtensions.length ? enabledExtensions : extensions;
        const manifest = extensionsToChoose.find((e) => e.local && e.local.manifest)?.local?.manifest;
        // Manifest is not found which should not happen.
        // In which case return the first extension.
        if (!manifest) {
            return extensionsToChoose[0];
        }
        const extensionKinds = this.extensionManifestPropertiesService.getExtensionKind(manifest);
        let extension = extensionsToChoose.find((extension) => {
            for (const extensionKind of extensionKinds) {
                switch (extensionKind) {
                    case 'ui':
                        /* UI extension is chosen only if it is installed locally */
                        if (extension.server ===
                            this.extensionManagementServerService.localExtensionManagementServer) {
                            return true;
                        }
                        return false;
                    case 'workspace':
                        /* Choose remote workspace extension if exists */
                        if (extension.server ===
                            this.extensionManagementServerService.remoteExtensionManagementServer) {
                            return true;
                        }
                        return false;
                    case 'web':
                        /* Choose web extension if exists */
                        if (extension.server ===
                            this.extensionManagementServerService.webExtensionManagementServer) {
                            return true;
                        }
                        return false;
                }
            }
            return false;
        });
        if (!extension && this.extensionManagementServerService.localExtensionManagementServer) {
            extension = extensionsToChoose.find((extension) => {
                for (const extensionKind of extensionKinds) {
                    switch (extensionKind) {
                        case 'workspace':
                            /* Choose local workspace extension if exists */
                            if (extension.server ===
                                this.extensionManagementServerService.localExtensionManagementServer) {
                                return true;
                            }
                            return false;
                        case 'web':
                            /* Choose local web extension if exists */
                            if (extension.server ===
                                this.extensionManagementServerService.localExtensionManagementServer) {
                                return true;
                            }
                            return false;
                    }
                }
                return false;
            });
        }
        if (!extension && this.extensionManagementServerService.webExtensionManagementServer) {
            extension = extensionsToChoose.find((extension) => {
                for (const extensionKind of extensionKinds) {
                    switch (extensionKind) {
                        case 'web':
                            /* Choose web extension if exists */
                            if (extension.server ===
                                this.extensionManagementServerService.webExtensionManagementServer) {
                                return true;
                            }
                            return false;
                    }
                }
                return false;
            });
        }
        if (!extension && this.extensionManagementServerService.remoteExtensionManagementServer) {
            extension = extensionsToChoose.find((extension) => {
                for (const extensionKind of extensionKinds) {
                    switch (extensionKind) {
                        case 'web':
                            /* Choose remote web extension if exists */
                            if (extension.server ===
                                this.extensionManagementServerService.remoteExtensionManagementServer) {
                                return true;
                            }
                            return false;
                    }
                }
                return false;
            });
        }
        return extension || extensions[0];
    }
    getExtensionState(extension) {
        if (this.installing.some((i) => areSameExtensions(i.identifier, extension.identifier) &&
            (!extension.server || i.server === extension.server))) {
            return 0 /* ExtensionState.Installing */;
        }
        if (this.remoteExtensions) {
            const state = this.remoteExtensions.getExtensionState(extension);
            if (state !== 3 /* ExtensionState.Uninstalled */) {
                return state;
            }
        }
        if (this.webExtensions) {
            const state = this.webExtensions.getExtensionState(extension);
            if (state !== 3 /* ExtensionState.Uninstalled */) {
                return state;
            }
        }
        if (this.localExtensions) {
            return this.localExtensions.getExtensionState(extension);
        }
        return 3 /* ExtensionState.Uninstalled */;
    }
    async checkForUpdates(reason, onlyBuiltin) {
        if (reason) {
            this.logService.info(`[Extensions]: Checking for updates. Reason: ${reason}`);
        }
        else {
            this.logService.trace(`[Extensions]: Checking for updates`);
        }
        if (!this.galleryService.isEnabled()) {
            return;
        }
        const extensions = [];
        if (this.localExtensions) {
            extensions.push(this.localExtensions);
        }
        if (this.remoteExtensions) {
            extensions.push(this.remoteExtensions);
        }
        if (this.webExtensions) {
            extensions.push(this.webExtensions);
        }
        if (!extensions.length) {
            return;
        }
        const infos = [];
        for (const installed of this.local) {
            if (onlyBuiltin && !installed.isBuiltin) {
                // Skip if check updates only for builtin extensions and current extension is not builtin.
                continue;
            }
            if (installed.isBuiltin &&
                !installed.local?.pinned &&
                (installed.type === 0 /* ExtensionType.System */ || !installed.local?.identifier.uuid)) {
                // Skip checking updates for a builtin extension if it is a system extension or if it does not has Marketplace identifier
                continue;
            }
            if (installed.local?.source === 'resource') {
                continue;
            }
            infos.push({ ...installed.identifier, preRelease: !!installed.local?.preRelease });
        }
        if (infos.length) {
            const targetPlatform = await extensions[0].server.extensionManagementService.getTargetPlatform();
            this.telemetryService.publicLog2('galleryService:checkingForUpdates', {
                count: infos.length,
            });
            this.logService.trace(`Checking updates for extensions`, infos.map((e) => e.id).join(', '));
            const galleryExtensions = await this.galleryService.getExtensions(infos, {
                targetPlatform,
                compatible: true,
                productVersion: this.getProductVersion(),
                preferResourceApi: true,
            }, CancellationToken.None);
            if (galleryExtensions.length) {
                await this.syncInstalledExtensionsWithGallery(galleryExtensions);
            }
        }
    }
    async updateAll() {
        const toUpdate = [];
        this.outdated.forEach((extension) => {
            if (extension.gallery) {
                toUpdate.push({
                    extension: extension.gallery,
                    options: {
                        operation: 3 /* InstallOperation.Update */,
                        installPreReleaseVersion: extension.local?.isPreReleaseVersion,
                        profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
                        isApplicationScoped: extension.local?.isApplicationScoped,
                        context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true },
                    },
                });
            }
        });
        return this.extensionManagementService.installGalleryExtensions(toUpdate);
    }
    async downloadVSIX(extensionId, preRelease) {
        let [galleryExtension] = await this.galleryService.getExtensions([{ id: extensionId, preRelease }], { compatible: true }, CancellationToken.None);
        if (!galleryExtension) {
            throw new Error(nls.localize('extension not found', "Extension '{0}' not found.", extensionId));
        }
        let targetPlatform = galleryExtension.properties.targetPlatform;
        const options = [];
        for (const targetPlatform of galleryExtension.allTargetPlatforms) {
            if (targetPlatform !== "unknown" /* TargetPlatform.UNKNOWN */ &&
                targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */) {
                options.push({
                    label: targetPlatform === "undefined" /* TargetPlatform.UNDEFINED */
                        ? nls.localize('allplatforms', 'All Platforms')
                        : TargetPlatformToString(targetPlatform),
                    id: targetPlatform,
                });
            }
        }
        if (options.length) {
            const message = nls.localize('platform placeholder', 'Please select the platform for which you want to download the VSIX');
            const option = await this.quickInputService.pick(options.sort((a, b) => a.label.localeCompare(b.label)), { placeHolder: message });
            if (!option) {
                return;
            }
            targetPlatform = option.id;
        }
        if (targetPlatform !== galleryExtension.properties.targetPlatform) {
            ;
            [galleryExtension] = await this.galleryService.getExtensions([{ id: extensionId, preRelease }], { compatible: true, targetPlatform }, CancellationToken.None);
        }
        const result = await this.fileDialogService.showOpenDialog({
            title: nls.localize('download title', 'Select folder to download the VSIX'),
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: nls.localize('download', 'Download'),
        });
        if (!result?.[0]) {
            return;
        }
        this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */ }, async (progress) => {
            progress.report({ message: nls.localize('downloading...', 'Downloading VSIX...') });
            const name = `${galleryExtension.identifier.id}-${galleryExtension.version}${targetPlatform !== "undefined" /* TargetPlatform.UNDEFINED */ && targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */ && targetPlatform !== "unknown" /* TargetPlatform.UNKNOWN */ ? `-${targetPlatform}` : ''}.vsix`;
            await this.galleryService.download(galleryExtension, this.uriIdentityService.extUri.joinPath(result[0], name), 1 /* InstallOperation.None */);
            this.notificationService.info(nls.localize('download.completed', 'Successfully downloaded the VSIX'));
        });
    }
    async syncInstalledExtensionsWithGallery(gallery) {
        const extensions = [];
        if (this.localExtensions) {
            extensions.push(this.localExtensions);
        }
        if (this.remoteExtensions) {
            extensions.push(this.remoteExtensions);
        }
        if (this.webExtensions) {
            extensions.push(this.webExtensions);
        }
        if (!extensions.length) {
            return;
        }
        await Promise.allSettled(extensions.map((extensions) => extensions.syncInstalledExtensionsWithGallery(gallery, this.getProductVersion())));
        if (this.outdated.length) {
            this.logService.info(`Auto updating outdated extensions.`, this.outdated.map((e) => e.identifier.id).join(', '));
            this.eventuallyAutoUpdateExtensions();
        }
    }
    isAutoCheckUpdatesEnabled() {
        return this.configurationService.getValue(AutoCheckUpdatesConfigurationKey);
    }
    eventuallyCheckForUpdates(immediate = false) {
        this.updatesCheckDelayer.cancel();
        this.updatesCheckDelayer
            .trigger(async () => {
            if (this.isAutoCheckUpdatesEnabled()) {
                await this.checkForUpdates();
            }
            this.eventuallyCheckForUpdates();
        }, immediate ? 0 : this.getUpdatesCheckInterval())
            .then(undefined, (err) => null);
    }
    getUpdatesCheckInterval() {
        if (this.productService.quality === 'insider' && this.getProductUpdateVersion()) {
            return 1000 * 60 * 60 * 1; // 1 hour
        }
        return ExtensionsWorkbenchService_1.UpdatesCheckInterval;
    }
    eventuallyAutoUpdateExtensions() {
        this.autoUpdateDelayer.trigger(() => this.autoUpdateExtensions()).then(undefined, (err) => null);
    }
    async autoUpdateBuiltinExtensions() {
        await this.checkForUpdates(undefined, true);
        const toUpdate = this.outdated.filter((e) => e.isBuiltin);
        await Promises.settled(toUpdate.map((e) => this.install(e, e.local?.preRelease ? { installPreReleaseVersion: true } : undefined)));
    }
    async syncPinnedBuiltinExtensions() {
        const infos = [];
        for (const installed of this.local) {
            if (installed.isBuiltin && installed.local?.pinned && installed.local?.identifier.uuid) {
                infos.push({ ...installed.identifier, version: installed.version });
            }
        }
        if (infos.length) {
            const galleryExtensions = await this.galleryService.getExtensions(infos, CancellationToken.None);
            if (galleryExtensions.length) {
                await this.syncInstalledExtensionsWithGallery(galleryExtensions);
            }
        }
    }
    async autoUpdateExtensions() {
        const toUpdate = [];
        for (const extension of this.outdated) {
            if (!this.shouldAutoUpdateExtension(extension)) {
                this.logService.info('Auto update disabled for extension', extension.identifier.id);
                continue;
            }
            if (await this.shouldRequireConsentToUpdate(extension)) {
                this.logService.info('Auto update consent required for extension', extension.identifier.id);
                continue;
            }
            toUpdate.push(extension);
        }
        if (!toUpdate.length) {
            return;
        }
        const productVersion = this.getProductVersion();
        await Promises.settled(toUpdate.map((e) => {
            this.logService.info('Auto updating extension', e.identifier.id);
            return this.install(e, e.local?.preRelease
                ? { installPreReleaseVersion: true, productVersion }
                : { productVersion });
        }));
    }
    getProductVersion() {
        return this.getProductUpdateVersion() ?? this.getProductCurrentVersion();
    }
    getProductCurrentVersion() {
        return { version: this.productService.version, date: this.productService.date };
    }
    getProductUpdateVersion() {
        switch (this.updateService.state.type) {
            case "available for download" /* StateType.AvailableForDownload */:
            case "downloaded" /* StateType.Downloaded */:
            case "updating" /* StateType.Updating */:
            case "ready" /* StateType.Ready */: {
                const version = this.updateService.state.update.productVersion;
                if (version && semver.valid(version)) {
                    return {
                        version,
                        date: this.updateService.state.update.timestamp
                            ? new Date(this.updateService.state.update.timestamp).toISOString()
                            : undefined,
                    };
                }
            }
        }
        return undefined;
    }
    shouldAutoUpdateExtension(extension) {
        if (extension.deprecationInfo?.disallowInstall) {
            return false;
        }
        const autoUpdateValue = this.getAutoUpdateValue();
        if (autoUpdateValue === false) {
            const extensionsToAutoUpdate = this.getEnabledAutoUpdateExtensions();
            const extensionId = extension.identifier.id.toLowerCase();
            if (extensionsToAutoUpdate.includes(extensionId)) {
                return true;
            }
            if (this.isAutoUpdateEnabledForPublisher(extension.publisher) &&
                !extensionsToAutoUpdate.includes(`-${extensionId}`)) {
                return true;
            }
            return false;
        }
        if (extension.pinned) {
            return false;
        }
        const disabledAutoUpdateExtensions = this.getDisabledAutoUpdateExtensions();
        if (disabledAutoUpdateExtensions.includes(extension.identifier.id.toLowerCase())) {
            return false;
        }
        if (autoUpdateValue === true) {
            return true;
        }
        if (autoUpdateValue === 'onlyEnabledExtensions') {
            return this.extensionEnablementService.isEnabledEnablementState(extension.enablementState);
        }
        return false;
    }
    async shouldRequireConsentToUpdate(extension) {
        if (!extension.outdated) {
            return;
        }
        if (extension.local?.manifest.main || extension.local?.manifest.browser) {
            return;
        }
        if (!extension.gallery) {
            return;
        }
        if (isDefined(extension.gallery.properties?.executesCode)) {
            if (!extension.gallery.properties.executesCode) {
                return;
            }
        }
        else {
            const manifest = extension instanceof Extension
                ? await extension.getGalleryManifest()
                : await this.galleryService.getManifest(extension.gallery, CancellationToken.None);
            if (!manifest?.main && !manifest?.browser) {
                return;
            }
        }
        return nls.localize('consentRequiredToUpdate', 'The update for {0} extension introduces executable code, which is not present in the currently installed version.', extension.displayName);
    }
    isAutoUpdateEnabledFor(extensionOrPublisher) {
        if (isString(extensionOrPublisher)) {
            if (EXTENSION_IDENTIFIER_REGEX.test(extensionOrPublisher)) {
                throw new Error('Expected publisher string, found extension identifier');
            }
            if (this.isAutoUpdateEnabled()) {
                return true;
            }
            return this.isAutoUpdateEnabledForPublisher(extensionOrPublisher);
        }
        return this.shouldAutoUpdateExtension(extensionOrPublisher);
    }
    isAutoUpdateEnabledForPublisher(publisher) {
        const publishersToAutoUpdate = this.getPublishersToAutoUpdate();
        return publishersToAutoUpdate.includes(publisher.toLowerCase());
    }
    async updateAutoUpdateEnablementFor(extensionOrPublisher, enable) {
        if (this.isAutoUpdateEnabled()) {
            if (isString(extensionOrPublisher)) {
                throw new Error('Expected extension, found publisher string');
            }
            const disabledAutoUpdateExtensions = this.getDisabledAutoUpdateExtensions();
            const extensionId = extensionOrPublisher.identifier.id.toLowerCase();
            const extensionIndex = disabledAutoUpdateExtensions.indexOf(extensionId);
            if (enable) {
                if (extensionIndex !== -1) {
                    disabledAutoUpdateExtensions.splice(extensionIndex, 1);
                }
            }
            else {
                if (extensionIndex === -1) {
                    disabledAutoUpdateExtensions.push(extensionId);
                }
            }
            this.setDisabledAutoUpdateExtensions(disabledAutoUpdateExtensions);
            if (enable && extensionOrPublisher.local && extensionOrPublisher.pinned) {
                await this.extensionManagementService.updateMetadata(extensionOrPublisher.local, {
                    pinned: false,
                });
            }
            this._onChange.fire(extensionOrPublisher);
        }
        else {
            const enabledAutoUpdateExtensions = this.getEnabledAutoUpdateExtensions();
            if (isString(extensionOrPublisher)) {
                if (EXTENSION_IDENTIFIER_REGEX.test(extensionOrPublisher)) {
                    throw new Error('Expected publisher string, found extension identifier');
                }
                extensionOrPublisher = extensionOrPublisher.toLowerCase();
                if (this.isAutoUpdateEnabledFor(extensionOrPublisher) !== enable) {
                    if (enable) {
                        enabledAutoUpdateExtensions.push(extensionOrPublisher);
                    }
                    else {
                        if (enabledAutoUpdateExtensions.includes(extensionOrPublisher)) {
                            enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(extensionOrPublisher), 1);
                        }
                    }
                }
                this.setEnabledAutoUpdateExtensions(enabledAutoUpdateExtensions);
                for (const e of this.installed) {
                    if (e.publisher.toLowerCase() === extensionOrPublisher) {
                        this._onChange.fire(e);
                    }
                }
            }
            else {
                const extensionId = extensionOrPublisher.identifier.id.toLowerCase();
                const enableAutoUpdatesForPublisher = this.isAutoUpdateEnabledFor(extensionOrPublisher.publisher.toLowerCase());
                const enableAutoUpdatesForExtension = enabledAutoUpdateExtensions.includes(extensionId);
                const disableAutoUpdatesForExtension = enabledAutoUpdateExtensions.includes(`-${extensionId}`);
                if (enable) {
                    if (disableAutoUpdatesForExtension) {
                        enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(`-${extensionId}`), 1);
                    }
                    if (enableAutoUpdatesForPublisher) {
                        if (enableAutoUpdatesForExtension) {
                            enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(extensionId), 1);
                        }
                    }
                    else {
                        if (!enableAutoUpdatesForExtension) {
                            enabledAutoUpdateExtensions.push(extensionId);
                        }
                    }
                }
                // Disable Auto Updates
                else {
                    if (enableAutoUpdatesForExtension) {
                        enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(extensionId), 1);
                    }
                    if (enableAutoUpdatesForPublisher) {
                        if (!disableAutoUpdatesForExtension) {
                            enabledAutoUpdateExtensions.push(`-${extensionId}`);
                        }
                    }
                    else {
                        if (disableAutoUpdatesForExtension) {
                            enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(`-${extensionId}`), 1);
                        }
                    }
                }
                this.setEnabledAutoUpdateExtensions(enabledAutoUpdateExtensions);
                this._onChange.fire(extensionOrPublisher);
            }
        }
        if (enable) {
            this.autoUpdateExtensions();
        }
    }
    onDidSelectedExtensionToAutoUpdateValueChange() {
        if (this.enabledAuotUpdateExtensionsValue !==
            this.getEnabledAutoUpdateExtensionsValue() /* This checks if current window changed the value or not */ ||
            this.disabledAutoUpdateExtensionsValue !==
                this.getDisabledAutoUpdateExtensionsValue() /* This checks if current window changed the value or not */) {
            const userExtensions = this.installed.filter((e) => !e.isBuiltin);
            const groupBy = (extensions) => {
                const shouldAutoUpdate = [];
                const shouldNotAutoUpdate = [];
                for (const extension of extensions) {
                    if (this.shouldAutoUpdateExtension(extension)) {
                        shouldAutoUpdate.push(extension);
                    }
                    else {
                        shouldNotAutoUpdate.push(extension);
                    }
                }
                return [shouldAutoUpdate, shouldNotAutoUpdate];
            };
            const [wasShouldAutoUpdate, wasShouldNotAutoUpdate] = groupBy(userExtensions);
            this._enabledAutoUpdateExtensionsValue = undefined;
            this._disabledAutoUpdateExtensionsValue = undefined;
            const [shouldAutoUpdate, shouldNotAutoUpdate] = groupBy(userExtensions);
            for (const e of wasShouldAutoUpdate ?? []) {
                if (shouldNotAutoUpdate?.includes(e)) {
                    this._onChange.fire(e);
                }
            }
            for (const e of wasShouldNotAutoUpdate ?? []) {
                if (shouldAutoUpdate?.includes(e)) {
                    this._onChange.fire(e);
                }
            }
        }
    }
    async canInstall(extension) {
        if (!(extension instanceof Extension)) {
            return new MarkdownString().appendText(nls.localize('not an extension', 'The provided object is not an extension.'));
        }
        if (extension.isMalicious) {
            return new MarkdownString().appendText(nls.localize('malicious', 'This extension is reported to be problematic.'));
        }
        if (extension.deprecationInfo?.disallowInstall) {
            return new MarkdownString().appendText(nls.localize('disallowed', 'This extension is disallowed to be installed.'));
        }
        if (extension.gallery) {
            if (!extension.gallery.isSigned &&
                (await this.extensionGalleryManifestService.getExtensionGalleryManifest())?.capabilities
                    .signing?.allRepositorySigned) {
                return new MarkdownString().appendText(nls.localize('not signed', 'This extension is not signed.'));
            }
            const localResult = this.localExtensions
                ? await this.localExtensions.canInstall(extension.gallery)
                : undefined;
            if (localResult === true) {
                return true;
            }
            const remoteResult = this.remoteExtensions
                ? await this.remoteExtensions.canInstall(extension.gallery)
                : undefined;
            if (remoteResult === true) {
                return true;
            }
            const webResult = this.webExtensions
                ? await this.webExtensions.canInstall(extension.gallery)
                : undefined;
            if (webResult === true) {
                return true;
            }
            return (localResult ??
                remoteResult ??
                webResult ??
                new MarkdownString().appendText(nls.localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", extension.displayName ?? extension.identifier.id)));
        }
        if (extension.resourceExtension &&
            (await this.extensionManagementService.canInstall(extension.resourceExtension)) === true) {
            return true;
        }
        return new MarkdownString().appendText(nls.localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", extension.displayName ?? extension.identifier.id));
    }
    async install(arg, installOptions = {}, progressLocation) {
        let installable;
        let extension;
        let servers;
        if (arg instanceof URI) {
            installable = arg;
        }
        else {
            let installableInfo;
            let gallery;
            // Install by id
            if (isString(arg)) {
                extension = this.local.find((e) => areSameExtensions(e.identifier, { id: arg }));
                if (!extension?.isBuiltin) {
                    installableInfo = {
                        id: arg,
                        version: installOptions.version,
                        preRelease: installOptions.installPreReleaseVersion ?? this.preferPreReleases,
                    };
                }
            }
            // Install by gallery
            else if (arg.gallery) {
                extension = arg;
                gallery = arg.gallery;
                if (installOptions.version && installOptions.version !== gallery?.version) {
                    installableInfo = { id: extension.identifier.id, version: installOptions.version };
                }
            }
            // Install by resource
            else if (arg.resourceExtension) {
                extension = arg;
                installable = arg.resourceExtension;
            }
            if (installableInfo) {
                const targetPlatform = extension?.server
                    ? await extension.server.extensionManagementService.getTargetPlatform()
                    : undefined;
                gallery = (await this.galleryService.getExtensions([installableInfo], { targetPlatform }, CancellationToken.None)).at(0);
            }
            if (!extension && gallery) {
                extension = this.instantiationService.createInstance(Extension, (ext) => this.getExtensionState(ext), (ext) => this.getRuntimeState(ext), undefined, undefined, gallery, undefined);
                extension.setExtensionsControlManifest(await this.extensionManagementService.getExtensionsControlManifest());
            }
            if (extension?.isMalicious) {
                throw new Error(nls.localize('malicious', 'This extension is reported to be problematic.'));
            }
            if (gallery) {
                // If requested to install everywhere
                // then install the extension in all the servers where it is not installed
                if (installOptions.installEverywhere) {
                    servers = [];
                    const installableServers = await this.extensionManagementService.getInstallableServers(gallery);
                    for (const extensionsServer of this.extensionsServers) {
                        if (installableServers.includes(extensionsServer.server) &&
                            !extensionsServer.local.find((e) => areSameExtensions(e.identifier, gallery.identifier))) {
                            servers.push(extensionsServer.server);
                        }
                    }
                }
                // If requested to enable and extension is already installed
                // Check if the extension is disabled because of extension kind
                // If so, install the extension in the server that is compatible.
                else if (installOptions.enable && extension?.local) {
                    servers = [];
                    if (extension.enablementState === 1 /* EnablementState.DisabledByExtensionKind */) {
                        const [installableServer] = await this.extensionManagementService.getInstallableServers(gallery);
                        if (installableServer) {
                            servers.push(installableServer);
                        }
                    }
                }
            }
            if (!servers || servers.length) {
                if (!installable) {
                    if (!gallery) {
                        const id = isString(arg) ? arg : arg.identifier.id;
                        const manifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
                        const reportIssueUri = manifest
                            ? getExtensionGalleryManifestResourceUri(manifest, "ReportIssueUri" /* ExtensionGalleryResourceType.ReportIssueUri */)
                            : undefined;
                        const reportIssueMessage = reportIssueUri
                            ? nls.localize('report issue', 'If this issue persists, please report it at {0}', reportIssueUri.toString())
                            : '';
                        if (installOptions.version) {
                            const message = nls.localize('not found version', "The extension '{0}' cannot be installed because the requested version '{1}' was not found.", id, installOptions.version);
                            throw new ExtensionManagementError(reportIssueMessage ? `${message} ${reportIssueMessage}` : message, "NotFound" /* ExtensionManagementErrorCode.NotFound */);
                        }
                        else {
                            const message = nls.localize('not found', "The extension '{0}' cannot be installed because it was not found.", id);
                            throw new ExtensionManagementError(reportIssueMessage ? `${message} ${reportIssueMessage}` : message, "NotFound" /* ExtensionManagementErrorCode.NotFound */);
                        }
                    }
                    installable = gallery;
                }
                if (installOptions.version) {
                    installOptions.installGivenVersion = true;
                }
                if (extension?.isWorkspaceScoped) {
                    installOptions.isWorkspaceScoped = true;
                }
            }
        }
        if (installable) {
            if (installOptions.justification) {
                const syncCheck = isUndefined(installOptions.isMachineScoped) &&
                    this.userDataSyncEnablementService.isEnabled() &&
                    this.userDataSyncEnablementService.isResourceEnabled("extensions" /* SyncResource.Extensions */);
                const buttons = [];
                buttons.push({
                    label: isString(installOptions.justification) || !installOptions.justification.action
                        ? nls.localize({ key: 'installButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Install Extension')
                        : nls.localize({ key: 'installButtonLabelWithAction', comment: ['&& denotes a mnemonic'] }, '&&Install Extension and {0}', installOptions.justification.action),
                    run: () => true,
                });
                if (!extension) {
                    buttons.push({
                        label: nls.localize('open', 'Open Extension'),
                        run: () => {
                            this.open(extension);
                            return false;
                        },
                    });
                }
                const result = await this.dialogService.prompt({
                    title: nls.localize('installExtensionTitle', 'Install Extension'),
                    message: extension
                        ? nls.localize('installExtensionMessage', "Would you like to install '{0}' extension from '{1}'?", extension.displayName, extension.publisherDisplayName)
                        : nls.localize('installVSIXMessage', 'Would you like to install the extension?'),
                    detail: isString(installOptions.justification)
                        ? installOptions.justification
                        : installOptions.justification.reason,
                    cancelButton: true,
                    buttons,
                    checkbox: syncCheck
                        ? {
                            label: nls.localize('sync extension', 'Sync this extension'),
                            checked: true,
                        }
                        : undefined,
                });
                if (!result.result) {
                    throw new CancellationError();
                }
                if (syncCheck) {
                    installOptions.isMachineScoped = !result.checkboxChecked;
                }
            }
            if (installable instanceof URI) {
                extension = await this.doInstall(undefined, () => this.installFromVSIX(installable, installOptions), progressLocation);
            }
            else if (extension) {
                if (extension.resourceExtension) {
                    extension = await this.doInstall(extension, () => this.extensionManagementService.installResourceExtension(installable, installOptions), progressLocation);
                }
                else {
                    extension = await this.doInstall(extension, () => this.installFromGallery(extension, installable, installOptions, servers), progressLocation);
                }
            }
        }
        if (!extension) {
            throw new Error(nls.localize('unknown', 'Unable to install extension'));
        }
        if (installOptions.enable) {
            if (extension.enablementState === 10 /* EnablementState.DisabledWorkspace */ ||
                extension.enablementState === 9 /* EnablementState.DisabledGlobally */) {
                if (installOptions.justification) {
                    const result = await this.dialogService.confirm({
                        title: nls.localize('enableExtensionTitle', 'Enable Extension'),
                        message: nls.localize('enableExtensionMessage', "Would you like to enable '{0}' extension?", extension.displayName),
                        detail: isString(installOptions.justification)
                            ? installOptions.justification
                            : installOptions.justification.reason,
                        primaryButton: isString(installOptions.justification)
                            ? nls.localize({ key: 'enableButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Enable Extension')
                            : nls.localize({ key: 'enableButtonLabelWithAction', comment: ['&& denotes a mnemonic'] }, '&&Enable Extension and {0}', installOptions.justification.action),
                    });
                    if (!result.confirmed) {
                        throw new CancellationError();
                    }
                }
                await this.setEnablement(extension, extension.enablementState === 10 /* EnablementState.DisabledWorkspace */
                    ? 12 /* EnablementState.EnabledWorkspace */
                    : 11 /* EnablementState.EnabledGlobally */);
            }
            await this.waitUntilExtensionIsEnabled(extension);
        }
        return extension;
    }
    async installInServer(extension, server, installOptions) {
        await this.doInstall(extension, async () => {
            const local = extension.local;
            if (!local) {
                throw new Error('Extension not found');
            }
            if (!extension.gallery) {
                extension =
                    (await this.getExtensions([{ ...extension.identifier, preRelease: local.preRelease }], CancellationToken.None))[0] ?? extension;
            }
            if (extension.gallery) {
                return server.extensionManagementService.installFromGallery(extension.gallery, {
                    installPreReleaseVersion: local.preRelease,
                    ...installOptions,
                });
            }
            const targetPlatform = await server.extensionManagementService.getTargetPlatform();
            if (!isTargetPlatformCompatible(local.targetPlatform, [local.targetPlatform], targetPlatform)) {
                throw new Error(nls.localize('incompatible', "Can't install '{0}' extension because it is not compatible.", extension.identifier.id));
            }
            const vsix = await this.extensionManagementService.zip(local);
            try {
                return await server.extensionManagementService.install(vsix);
            }
            finally {
                try {
                    await this.fileService.del(vsix);
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
        });
    }
    canSetLanguage(extension) {
        if (!isWeb) {
            return false;
        }
        if (!extension.gallery) {
            return false;
        }
        const locale = getLocale(extension.gallery);
        if (!locale) {
            return false;
        }
        return true;
    }
    async setLanguage(extension) {
        if (!this.canSetLanguage(extension)) {
            throw new Error('Can not set language');
        }
        const locale = getLocale(extension.gallery);
        if (locale === language) {
            return;
        }
        const localizedLanguageName = extension.gallery?.properties?.localizedLanguages?.[0];
        return this.localeService.setLocale({
            id: locale,
            galleryExtension: extension.gallery,
            extensionId: extension.identifier.id,
            label: localizedLanguageName ?? extension.displayName,
        });
    }
    setEnablement(extensions, enablementState) {
        extensions = Array.isArray(extensions) ? extensions : [extensions];
        return this.promptAndSetEnablement(extensions, enablementState);
    }
    async uninstall(e) {
        const extension = e.local
            ? e
            : this.local.find((local) => areSameExtensions(local.identifier, e.identifier));
        if (!extension?.local) {
            throw new Error('Missing local');
        }
        const extensionsToUninstall = [{ extension: extension.local }];
        for (const packExtension of this.getAllPackExtensionsToUninstall(extension.local, this.local)) {
            if (!extensionsToUninstall.some((e) => areSameExtensions(e.extension.identifier, packExtension.identifier))) {
                extensionsToUninstall.push({ extension: packExtension });
            }
        }
        const dependents = [];
        for (const { extension } of extensionsToUninstall) {
            for (const local of this.local) {
                if (!local.local) {
                    continue;
                }
                if (areSameExtensions(local.identifier, extension.identifier)) {
                    continue;
                }
                if (local.dependencies.length === 0) {
                    continue;
                }
                if (extension.manifest.extensionPack?.some((id) => areSameExtensions({ id }, local.identifier))) {
                    continue;
                }
                if (dependents.some((d) => d.extensionPack.some((id) => areSameExtensions({ id }, local.identifier)))) {
                    continue;
                }
                if (local.dependencies.some((dep) => areSameExtensions(extension.identifier, { id: dep }))) {
                    dependents.push(local);
                    extensionsToUninstall.push({ extension: local.local });
                }
            }
        }
        if (dependents.length) {
            const { result } = await this.dialogService.prompt({
                title: nls.localize('uninstallDependents', 'Uninstall Extension with Dependents'),
                type: Severity.Warning,
                message: this.getErrorMessageForUninstallingAnExtensionWithDependents(extension, dependents),
                buttons: [
                    {
                        label: nls.localize('uninstallAll', 'Uninstall All'),
                        run: () => true,
                    },
                ],
                cancelButton: {
                    run: () => false,
                },
            });
            if (!result) {
                throw new CancellationError();
            }
        }
        return this.withProgress({
            location: 5 /* ProgressLocation.Extensions */,
            title: nls.localize('uninstallingExtension', 'Uninstalling extension....'),
            source: `${extension.identifier.id}`,
        }, () => this.extensionManagementService
            .uninstallExtensions(extensionsToUninstall)
            .then(() => undefined));
    }
    getAllPackExtensionsToUninstall(extension, installed, checked = []) {
        if (checked.some((e) => areSameExtensions(e.identifier, extension.identifier))) {
            return [];
        }
        checked.push(extension);
        const extensionsPack = extension.manifest.extensionPack ?? [];
        if (extensionsPack.length) {
            const packedExtensions = [];
            for (const i of installed) {
                if (i.local &&
                    !i.isBuiltin &&
                    extensionsPack.some((id) => areSameExtensions({ id }, i.identifier))) {
                    packedExtensions.push(i.local);
                }
            }
            const packOfPackedExtensions = [];
            for (const packedExtension of packedExtensions) {
                packOfPackedExtensions.push(...this.getAllPackExtensionsToUninstall(packedExtension, installed, checked));
            }
            return [...packedExtensions, ...packOfPackedExtensions];
        }
        return [];
    }
    getErrorMessageForUninstallingAnExtensionWithDependents(extension, dependents) {
        if (dependents.length === 1) {
            return nls.localize('singleDependentUninstallError', "Cannot uninstall '{0}' extension alone. '{1}' extension depends on this. Do you want to uninstall all these extensions?", extension.displayName, dependents[0].displayName);
        }
        if (dependents.length === 2) {
            return nls.localize('twoDependentsUninstallError', "Cannot uninstall '{0}' extension alone. '{1}' and '{2}' extensions depend on this. Do you want to uninstall all these extensions?", extension.displayName, dependents[0].displayName, dependents[1].displayName);
        }
        return nls.localize('multipleDependentsUninstallError', "Cannot uninstall '{0}' extension alone. '{1}', '{2}' and other extensions depend on this. Do you want to uninstall all these extensions?", extension.displayName, dependents[0].displayName, dependents[1].displayName);
    }
    isExtensionIgnoredToSync(extension) {
        return extension.local
            ? !this.isInstalledExtensionSynced(extension.local)
            : this.extensionsSyncManagementService.hasToNeverSyncExtension(extension.identifier.id);
    }
    async togglePreRelease(extension) {
        if (!extension.local) {
            return;
        }
        if (extension.preRelease !== extension.isPreReleaseVersion) {
            await this.extensionManagementService.updateMetadata(extension.local, {
                preRelease: !extension.preRelease,
            });
            return;
        }
        await this.install(extension, {
            installPreReleaseVersion: !extension.preRelease,
            preRelease: !extension.preRelease,
        });
    }
    async toggleExtensionIgnoredToSync(extension) {
        const isIgnored = this.isExtensionIgnoredToSync(extension);
        if (extension.local && isIgnored) {
            ;
            extension.local = await this.updateSynchronizingInstalledExtension(extension.local, true);
            this._onChange.fire(extension);
        }
        else {
            this.extensionsSyncManagementService.updateIgnoredExtensions(extension.identifier.id, !isIgnored);
        }
        await this.userDataAutoSyncService.triggerSync(['IgnoredExtensionsUpdated']);
    }
    async toggleApplyExtensionToAllProfiles(extension) {
        if (!extension.local ||
            isApplicationScopedExtension(extension.local.manifest) ||
            extension.isBuiltin) {
            return;
        }
        const isApplicationScoped = extension.local.isApplicationScoped;
        await Promise.all(this.getAllExtensions().map(async (extensions) => {
            const local = extensions.local.find((e) => areSameExtensions(e.identifier, extension.identifier))?.local;
            if (local && local.isApplicationScoped === isApplicationScoped) {
                await this.extensionManagementService.toggleAppliationScope(local, this.userDataProfileService.currentProfile.extensionsResource);
            }
        }));
    }
    getAllExtensions() {
        const extensions = [];
        if (this.localExtensions) {
            extensions.push(this.localExtensions);
        }
        if (this.remoteExtensions) {
            extensions.push(this.remoteExtensions);
        }
        if (this.webExtensions) {
            extensions.push(this.webExtensions);
        }
        return extensions;
    }
    isInstalledExtensionSynced(extension) {
        if (extension.isMachineScoped) {
            return false;
        }
        if (this.extensionsSyncManagementService.hasToAlwaysSyncExtension(extension.identifier.id)) {
            return true;
        }
        return !this.extensionsSyncManagementService.hasToNeverSyncExtension(extension.identifier.id);
    }
    async updateSynchronizingInstalledExtension(extension, sync) {
        const isMachineScoped = !sync;
        if (extension.isMachineScoped !== isMachineScoped) {
            extension = await this.extensionManagementService.updateMetadata(extension, {
                isMachineScoped,
            });
        }
        if (sync) {
            this.extensionsSyncManagementService.updateIgnoredExtensions(extension.identifier.id, false);
        }
        return extension;
    }
    doInstall(extension, installTask, progressLocation) {
        const title = extension
            ? nls.localize('installing named extension', "Installing '{0}' extension....", extension.displayName)
            : nls.localize('installing extension', 'Installing extension....');
        return this.withProgress({
            location: progressLocation ?? 5 /* ProgressLocation.Extensions */,
            title,
        }, async () => {
            try {
                if (extension) {
                    this.installing.push(extension);
                    this._onChange.fire(extension);
                }
                const local = await installTask();
                return await this.waitAndGetInstalledExtension(local.identifier);
            }
            finally {
                if (extension) {
                    this.installing = this.installing.filter((e) => e !== extension);
                    // Trigger the change without passing the extension because it is replaced by a new instance.
                    this._onChange.fire(undefined);
                }
            }
        });
    }
    async installFromVSIX(vsix, installOptions) {
        const manifest = await this.extensionManagementService.getManifest(vsix);
        const existingExtension = this.local.find((local) => areSameExtensions(local.identifier, {
            id: getGalleryExtensionId(manifest.publisher, manifest.name),
        }));
        if (existingExtension) {
            installOptions = installOptions || {};
            if (existingExtension.latestVersion === manifest.version) {
                installOptions.pinned =
                    existingExtension.local?.pinned || !this.shouldAutoUpdateExtension(existingExtension);
            }
            else {
                installOptions.installGivenVersion = true;
            }
        }
        return this.extensionManagementService.installVSIX(vsix, manifest, installOptions);
    }
    installFromGallery(extension, gallery, installOptions, servers) {
        installOptions = installOptions ?? {};
        installOptions.pinned = extension.local?.pinned || !this.shouldAutoUpdateExtension(extension);
        if (extension.local && !servers) {
            installOptions.productVersion = this.getProductVersion();
            installOptions.operation = 3 /* InstallOperation.Update */;
            return this.extensionManagementService.updateFromGallery(gallery, extension.local, installOptions);
        }
        else {
            return this.extensionManagementService.installFromGallery(gallery, installOptions, servers);
        }
    }
    async waitAndGetInstalledExtension(identifier) {
        let installedExtension = this.local.find((local) => areSameExtensions(local.identifier, identifier));
        if (!installedExtension) {
            await Event.toPromise(Event.filter(this.onChange, (e) => !!e && this.local.some((local) => areSameExtensions(local.identifier, identifier))));
        }
        installedExtension = this.local.find((local) => areSameExtensions(local.identifier, identifier));
        if (!installedExtension) {
            // This should not happen
            throw new Error('Extension should have been installed');
        }
        return installedExtension;
    }
    async waitUntilExtensionIsEnabled(extension) {
        if (this.extensionService.extensions.find((e) => ExtensionIdentifier.equals(e.identifier, extension.identifier.id))) {
            return;
        }
        if (!extension.local ||
            !this.extensionService.canAddExtension(toExtensionDescription(extension.local))) {
            return;
        }
        await new Promise((c, e) => {
            const disposable = this.extensionService.onDidChangeExtensions(() => {
                try {
                    if (this.extensionService.extensions.find((e) => ExtensionIdentifier.equals(e.identifier, extension.identifier.id))) {
                        disposable.dispose();
                        c();
                    }
                }
                catch (error) {
                    e(error);
                }
            });
        });
    }
    promptAndSetEnablement(extensions, enablementState) {
        const enable = enablementState === 11 /* EnablementState.EnabledGlobally */ ||
            enablementState === 12 /* EnablementState.EnabledWorkspace */;
        if (enable) {
            const allDependenciesAndPackedExtensions = this.getExtensionsRecursively(extensions, this.local, enablementState, { dependencies: true, pack: true });
            return this.checkAndSetEnablement(extensions, allDependenciesAndPackedExtensions, enablementState);
        }
        else {
            const packedExtensions = this.getExtensionsRecursively(extensions, this.local, enablementState, { dependencies: false, pack: true });
            if (packedExtensions.length) {
                return this.checkAndSetEnablement(extensions, packedExtensions, enablementState);
            }
            return this.checkAndSetEnablement(extensions, [], enablementState);
        }
    }
    async checkAndSetEnablement(extensions, otherExtensions, enablementState) {
        const allExtensions = [...extensions, ...otherExtensions];
        const enable = enablementState === 11 /* EnablementState.EnabledGlobally */ ||
            enablementState === 12 /* EnablementState.EnabledWorkspace */;
        if (!enable) {
            for (const extension of extensions) {
                const dependents = this.getDependentsAfterDisablement(extension, allExtensions, this.local);
                if (dependents.length) {
                    const { result } = await this.dialogService.prompt({
                        title: nls.localize('disableDependents', 'Disable Extension with Dependents'),
                        type: Severity.Warning,
                        message: this.getDependentsErrorMessageForDisablement(extension, allExtensions, dependents),
                        buttons: [
                            {
                                label: nls.localize('disable all', 'Disable All'),
                                run: () => true,
                            },
                        ],
                        cancelButton: {
                            run: () => false,
                        },
                    });
                    if (!result) {
                        throw new CancellationError();
                    }
                    await this.checkAndSetEnablement(dependents, [extension], enablementState);
                }
            }
        }
        return this.doSetEnablement(allExtensions, enablementState);
    }
    getExtensionsRecursively(extensions, installed, enablementState, options, checked = []) {
        const toCheck = extensions.filter((e) => checked.indexOf(e) === -1);
        if (toCheck.length) {
            for (const extension of toCheck) {
                checked.push(extension);
            }
            const extensionsToEanbleOrDisable = installed.filter((i) => {
                if (checked.indexOf(i) !== -1) {
                    return false;
                }
                const enable = enablementState === 11 /* EnablementState.EnabledGlobally */ ||
                    enablementState === 12 /* EnablementState.EnabledWorkspace */;
                const isExtensionEnabled = i.enablementState === 11 /* EnablementState.EnabledGlobally */ ||
                    i.enablementState === 12 /* EnablementState.EnabledWorkspace */;
                if (enable === isExtensionEnabled) {
                    return false;
                }
                return ((enable || !i.isBuiltin) && // Include all Extensions for enablement and only non builtin extensions for disablement
                    (options.dependencies || options.pack) &&
                    extensions.some((extension) => (options.dependencies &&
                        extension.dependencies.some((id) => areSameExtensions({ id }, i.identifier))) ||
                        (options.pack &&
                            extension.extensionPack.some((id) => areSameExtensions({ id }, i.identifier)))));
            });
            if (extensionsToEanbleOrDisable.length) {
                extensionsToEanbleOrDisable.push(...this.getExtensionsRecursively(extensionsToEanbleOrDisable, installed, enablementState, options, checked));
            }
            return extensionsToEanbleOrDisable;
        }
        return [];
    }
    getDependentsAfterDisablement(extension, extensionsToDisable, installed) {
        return installed.filter((i) => {
            if (i.dependencies.length === 0) {
                return false;
            }
            if (i === extension) {
                return false;
            }
            if (!this.extensionEnablementService.isEnabledEnablementState(i.enablementState)) {
                return false;
            }
            if (extensionsToDisable.indexOf(i) !== -1) {
                return false;
            }
            return i.dependencies.some((dep) => [extension, ...extensionsToDisable].some((d) => areSameExtensions(d.identifier, { id: dep })));
        });
    }
    getDependentsErrorMessageForDisablement(extension, allDisabledExtensions, dependents) {
        for (const e of [extension, ...allDisabledExtensions]) {
            const dependentsOfTheExtension = dependents.filter((d) => d.dependencies.some((id) => areSameExtensions({ id }, e.identifier)));
            if (dependentsOfTheExtension.length) {
                return this.getErrorMessageForDisablingAnExtensionWithDependents(e, dependentsOfTheExtension);
            }
        }
        return '';
    }
    getErrorMessageForDisablingAnExtensionWithDependents(extension, dependents) {
        if (dependents.length === 1) {
            return nls.localize('singleDependentError', "Cannot disable '{0}' extension alone. '{1}' extension depends on this. Do you want to disable all these extensions?", extension.displayName, dependents[0].displayName);
        }
        if (dependents.length === 2) {
            return nls.localize('twoDependentsError', "Cannot disable '{0}' extension alone. '{1}' and '{2}' extensions depend on this. Do you want to disable all these extensions?", extension.displayName, dependents[0].displayName, dependents[1].displayName);
        }
        return nls.localize('multipleDependentsError', "Cannot disable '{0}' extension alone. '{1}', '{2}' and other extensions depend on this. Do you want to disable all these extensions?", extension.displayName, dependents[0].displayName, dependents[1].displayName);
    }
    async doSetEnablement(extensions, enablementState) {
        return await this.extensionEnablementService.setEnablement(extensions.map((e) => e.local), enablementState);
    }
    reportProgressFromOtherSources() {
        if (this.installed.some((e) => e.state === 0 /* ExtensionState.Installing */ || e.state === 2 /* ExtensionState.Uninstalling */)) {
            if (!this._activityCallBack) {
                this.withProgress({ location: 5 /* ProgressLocation.Extensions */ }, () => new Promise((resolve) => (this._activityCallBack = resolve)));
            }
        }
        else {
            this._activityCallBack?.();
            this._activityCallBack = undefined;
        }
    }
    withProgress(options, task) {
        return this.progressService.withProgress(options, async () => {
            const cancelableTask = createCancelablePromise(() => task());
            this.tasksInProgress.push(cancelableTask);
            try {
                return await cancelableTask;
            }
            finally {
                const index = this.tasksInProgress.indexOf(cancelableTask);
                if (index !== -1) {
                    this.tasksInProgress.splice(index, 1);
                }
            }
        });
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        const message = (err && err.message) || '';
        if (/getaddrinfo ENOTFOUND|getaddrinfo ENOENT|connect EACCES|connect ECONNREFUSED/.test(message)) {
            return;
        }
        this.notificationService.error(err);
    }
    handleURL(uri, options) {
        if (!/^extension/.test(uri.path)) {
            return Promise.resolve(false);
        }
        this.onOpenExtensionUrl(uri);
        return Promise.resolve(true);
    }
    onOpenExtensionUrl(uri) {
        const match = /^extension\/([^/]+)$/.exec(uri.path);
        if (!match) {
            return;
        }
        const extensionId = match[1];
        this.queryLocal()
            .then(async (local) => {
            let extension = local.find((local) => areSameExtensions(local.identifier, { id: extensionId }));
            if (!extension) {
                ;
                [extension] = await this.getExtensions([{ id: extensionId }], { source: 'uri' }, CancellationToken.None);
            }
            if (extension) {
                await this.hostService.focus(mainWindow);
                await this.open(extension);
            }
        })
            .then(undefined, (error) => this.onError(error));
    }
    getPublishersToAutoUpdate() {
        return this.getEnabledAutoUpdateExtensions().filter((id) => !EXTENSION_IDENTIFIER_REGEX.test(id));
    }
    getEnabledAutoUpdateExtensions() {
        try {
            const parsedValue = JSON.parse(this.enabledAuotUpdateExtensionsValue);
            if (Array.isArray(parsedValue)) {
                return parsedValue;
            }
        }
        catch (e) {
            /* Ignore */
        }
        return [];
    }
    setEnabledAutoUpdateExtensions(enabledAutoUpdateExtensions) {
        this.enabledAuotUpdateExtensionsValue = JSON.stringify(enabledAutoUpdateExtensions);
    }
    get enabledAuotUpdateExtensionsValue() {
        if (!this._enabledAutoUpdateExtensionsValue) {
            this._enabledAutoUpdateExtensionsValue = this.getEnabledAutoUpdateExtensionsValue();
        }
        return this._enabledAutoUpdateExtensionsValue;
    }
    set enabledAuotUpdateExtensionsValue(enabledAuotUpdateExtensionsValue) {
        if (this.enabledAuotUpdateExtensionsValue !== enabledAuotUpdateExtensionsValue) {
            this._enabledAutoUpdateExtensionsValue = enabledAuotUpdateExtensionsValue;
            this.setEnabledAutoUpdateExtensionsValue(enabledAuotUpdateExtensionsValue);
        }
    }
    getEnabledAutoUpdateExtensionsValue() {
        return this.storageService.get(EXTENSIONS_AUTO_UPDATE_KEY, -1 /* StorageScope.APPLICATION */, '[]');
    }
    setEnabledAutoUpdateExtensionsValue(value) {
        this.storageService.store(EXTENSIONS_AUTO_UPDATE_KEY, value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    getDisabledAutoUpdateExtensions() {
        try {
            const parsedValue = JSON.parse(this.disabledAutoUpdateExtensionsValue);
            if (Array.isArray(parsedValue)) {
                return parsedValue;
            }
        }
        catch (e) {
            /* Ignore */
        }
        return [];
    }
    setDisabledAutoUpdateExtensions(disabledAutoUpdateExtensions) {
        this.disabledAutoUpdateExtensionsValue = JSON.stringify(disabledAutoUpdateExtensions);
    }
    get disabledAutoUpdateExtensionsValue() {
        if (!this._disabledAutoUpdateExtensionsValue) {
            this._disabledAutoUpdateExtensionsValue = this.getDisabledAutoUpdateExtensionsValue();
        }
        return this._disabledAutoUpdateExtensionsValue;
    }
    set disabledAutoUpdateExtensionsValue(disabledAutoUpdateExtensionsValue) {
        if (this.disabledAutoUpdateExtensionsValue !== disabledAutoUpdateExtensionsValue) {
            this._disabledAutoUpdateExtensionsValue = disabledAutoUpdateExtensionsValue;
            this.setDisabledAutoUpdateExtensionsValue(disabledAutoUpdateExtensionsValue);
        }
    }
    getDisabledAutoUpdateExtensionsValue() {
        return this.storageService.get(EXTENSIONS_DONOT_AUTO_UPDATE_KEY, -1 /* StorageScope.APPLICATION */, '[]');
    }
    setDisabledAutoUpdateExtensionsValue(value) {
        this.storageService.store(EXTENSIONS_DONOT_AUTO_UPDATE_KEY, value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    getDismissedNotifications() {
        try {
            const parsedValue = JSON.parse(this.dismissedNotificationsValue);
            if (Array.isArray(parsedValue)) {
                return parsedValue;
            }
        }
        catch (e) {
            /* Ignore */
        }
        return [];
    }
    setDismissedNotifications(dismissedNotifications) {
        this.dismissedNotificationsValue = JSON.stringify(dismissedNotifications);
    }
    get dismissedNotificationsValue() {
        if (!this._dismissedNotificationsValue) {
            this._dismissedNotificationsValue = this.getDismissedNotificationsValue();
        }
        return this._dismissedNotificationsValue;
    }
    set dismissedNotificationsValue(dismissedNotificationsValue) {
        if (this.dismissedNotificationsValue !== dismissedNotificationsValue) {
            this._dismissedNotificationsValue = dismissedNotificationsValue;
            this.setDismissedNotificationsValue(dismissedNotificationsValue);
        }
    }
    getDismissedNotificationsValue() {
        return this.storageService.get(EXTENSIONS_DISMISSED_NOTIFICATIONS_KEY, 0 /* StorageScope.PROFILE */, '[]');
    }
    setDismissedNotificationsValue(value) {
        this.storageService.store(EXTENSIONS_DISMISSED_NOTIFICATIONS_KEY, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
ExtensionsWorkbenchService = ExtensionsWorkbenchService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorService),
    __param(2, IWorkbenchExtensionManagementService),
    __param(3, IExtensionGalleryService),
    __param(4, IExtensionGalleryManifestService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, INotificationService),
    __param(8, IURLService),
    __param(9, IWorkbenchExtensionEnablementService),
    __param(10, IHostService),
    __param(11, IProgressService),
    __param(12, IExtensionManagementServerService),
    __param(13, ILanguageService),
    __param(14, IIgnoredExtensionsManagementService),
    __param(15, IUserDataAutoSyncService),
    __param(16, IProductService),
    __param(17, IContextKeyService),
    __param(18, IExtensionManifestPropertiesService),
    __param(19, ILogService),
    __param(20, IExtensionService),
    __param(21, ILocaleService),
    __param(22, ILifecycleService),
    __param(23, IFileService),
    __param(24, IUserDataProfileService),
    __param(25, IStorageService),
    __param(26, IDialogService),
    __param(27, IUserDataSyncEnablementService),
    __param(28, IUpdateService),
    __param(29, IUriIdentityService),
    __param(30, IWorkspaceContextService),
    __param(31, IViewsService),
    __param(32, IFileDialogService),
    __param(33, IQuickInputService),
    __param(34, IAllowedExtensionsService)
], ExtensionsWorkbenchService);
export { ExtensionsWorkbenchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dvcmtiZW5jaFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zV29ya2JlbmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssTUFBTSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pELE9BQU8sRUFFTixRQUFRLEVBQ1IsZ0JBQWdCLEVBQ2hCLHVCQUF1QixHQUN2QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEcsT0FBTyxFQUFVLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTix3QkFBd0IsRUFPeEIsaUJBQWlCLEVBTWpCLDBCQUEwQixFQUUxQiwwQkFBMEIsRUFJMUIsc0JBQXNCLEVBQ3RCLHlCQUF5QixFQUN6QiwwQkFBMEIsRUFDMUIsOENBQThDLEVBQzlDLHdCQUF3QixHQUV4QixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTixvQ0FBb0MsRUFFcEMsaUNBQWlDLEVBRWpDLG9DQUFvQyxF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