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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dvcmtiZW5jaFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc1dvcmtiZW5jaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RCxPQUFPLEVBRU4sUUFBUSxFQUNSLGdCQUFnQixFQUNoQix1QkFBdUIsR0FDdkIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xHLE9BQU8sRUFBVSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sd0JBQXdCLEVBT3hCLGlCQUFpQixFQU1qQiwwQkFBMEIsRUFFMUIsMEJBQTBCLEVBSTFCLHNCQUFzQixFQUN0Qix5QkFBeUIsRUFDekIsMEJBQTBCLEVBQzFCLDhDQUE4QyxFQUM5Qyx3QkFBd0IsR0FFeEIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sb0NBQW9DLEVBRXBDLGlDQUFpQyxFQUVqQyxvQ0FBb0MsRUFDcEMsZUFBZSxHQUVmLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyw4QkFBOEIsRUFDOUIsaUJBQWlCLEVBQ2pCLGdCQUFnQixFQUNoQixxQkFBcUIsRUFDckIsV0FBVyxHQUNYLE1BQU0sNEVBQTRFLENBQUE7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBSU4sMEJBQTBCLEVBQzFCLGdDQUFnQyxFQUNoQyw0QkFBNEIsRUFLNUIsMkJBQTJCLEVBQzNCLFVBQVUsR0FHVixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFDTixjQUFjLEVBQ2QsVUFBVSxFQUNWLFlBQVksR0FDWixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxXQUFXLEVBQWdDLE1BQU0sd0NBQXdDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBMkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUVOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBS04sbUJBQW1CLEVBR25CLDRCQUE0QixHQUM1QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbkgsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qiw4QkFBOEIsR0FFOUIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBQy9ILE9BQU8sRUFDTixpQkFBaUIsRUFFakIsV0FBVyxFQUNYLHNCQUFzQixHQUN0QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUE7QUFDbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDckcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBRWxCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBYSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3hGLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsYUFBYSxHQUNiLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEYsT0FBTyxFQUVOLHNDQUFzQyxFQUN0QyxnQ0FBZ0MsR0FDaEMsTUFBTSw2RUFBNkUsQ0FBQTtBQXlCN0UsSUFBTSxTQUFTLEdBQWYsTUFBTSxTQUFTO0lBS3JCLFlBQ1MsYUFBc0QsRUFDdEQsb0JBQWdGLEVBQ3hFLE1BQThDLEVBQ3ZELEtBQWtDLEVBQ2pDLFFBQXVDLEVBQzlCLHFCQUVMLEVBQ2MsY0FBeUQsRUFDaEUsZ0JBQW9ELEVBQzFELFVBQXdDLEVBQ3ZDLFdBQTBDLEVBQ3ZDLGNBQWdEO1FBWnpELGtCQUFhLEdBQWIsYUFBYSxDQUF5QztRQUN0RCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTREO1FBQ3hFLFdBQU0sR0FBTixNQUFNLENBQXdDO1FBQ3ZELFVBQUssR0FBTCxLQUFLLENBQTZCO1FBQ2pDLGFBQVEsR0FBUixRQUFRLENBQStCO1FBQzlCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FFMUI7UUFDK0IsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQy9DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDekMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUN0QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN0QixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFqQjNELG9CQUFlLDRDQUFtRDtRQUVqRSwwQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFBO1FBOE85QyxjQUFTLEdBQVksS0FBSyxDQUFBO0lBOU4vQixDQUFDO0lBRUosSUFBSSxpQkFBaUI7UUFDcEIsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNoQyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNwRCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLGlCQUFpQixFQUFFLENBQUM7WUFDbkMsT0FBTztnQkFDTixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVTtnQkFDakMsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUTtnQkFDN0IsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUTtnQkFDN0IsWUFBWSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWTtnQkFDckMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUzthQUMvQixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLE9BQXNDO1FBQ2pELElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLDJCQUFtQixDQUFBO0lBQ3pELENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7SUFDakQsQ0FBQztJQUVELElBQUksaUJBQWlCO1FBQ3BCLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNoQyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNwRCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUN6QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsOEJBQThCLEVBQUUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFBO0lBQ3pELENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQ3JELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxFQUFFLFdBQVcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ3ZFLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFBO1FBQy9CLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQTtRQUN6QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsS0FBTSxDQUFDLFVBQVUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQTtJQUNqRixDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQTtRQUM5QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsOEJBQThCLEVBQUUsRUFBRSxTQUFTLElBQUksRUFBRSxDQUFBO0lBQzlELENBQUM7SUFFRCxJQUFJLG9CQUFvQjtRQUN2QixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUE7UUFDbkUsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUN2RixDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUE7SUFDckMsQ0FBQztJQUVELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0I7WUFDeEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztZQUM5QyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQ3JFLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ3JGLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQTtJQUM1QixDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE9BQU87WUFDbEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTztZQUN0QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsRUFBRSxPQUFPLElBQUksRUFBRSxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU87WUFDbEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVztZQUMxQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsRUFBRSxXQUFXLElBQUksRUFBRSxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVELElBQUksR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUE7SUFDakMsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sQ0FDTixJQUFJLENBQUMsY0FBYztZQUNuQixJQUFJLENBQUMsd0JBQXdCO1lBQzdCLElBQUksQ0FBQyxZQUFZO1lBQ2pCLElBQUksQ0FBQyxjQUFjLENBQ25CLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sQ0FDTixJQUFJLENBQUMsc0JBQXNCO1lBQzNCLElBQUksQ0FBQyx3QkFBd0I7WUFDN0IsSUFBSSxDQUFDLFlBQVk7WUFDakIsSUFBSSxDQUFDLGNBQWMsQ0FDbkIsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzVDLE9BQU8sVUFBVSxDQUFDLGVBQWUsQ0FDaEMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDakUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQVksd0JBQXdCO1FBQ25DLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFVBQVUsQ0FBQyxlQUFlLENBQ2hDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUN6RixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsSUFBWSxjQUFjO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDdkUsQ0FBQztJQUVELElBQVksc0JBQXNCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDL0UsQ0FBQztJQUVELElBQVksY0FBYztRQUN6QixJQUFJLElBQUksQ0FBQyxJQUFJLGlDQUF5QixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN0RCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM1RCxJQUNDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztvQkFDckQsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQzVDLENBQUM7b0JBQ0YsT0FBTyxVQUFVLENBQUMsWUFBWSxDQUM3Qiw4REFBOEQsQ0FDOUQsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pCLENBQUM7Z0JBQ0QsSUFDQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7b0JBQ3ZELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUM5QyxDQUFDO29CQUNGLE9BQU8sVUFBVSxDQUFDLFlBQVksQ0FDN0IsaUVBQWlFLENBQ2pFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLGVBQWUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVU7WUFDcEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHO1lBQ3BDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2pHLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDdkYsQ0FBQztJQUVELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBR0QsSUFBVyxXQUFXO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsZUFBZSxnREFBd0MsQ0FBQTtJQUN0RixDQUFDO0lBSUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzVELENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDdEQsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELG9EQUFvRDtZQUNwRCxJQUFJLElBQUksQ0FBQyxJQUFJLGlDQUF5QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNwRixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDM0UsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBQ0QsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ2pELE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLFlBQVk7UUFDYixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxzQkFBc0I7UUFDekIsT0FBTyxDQUNOLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztZQUNaLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTztZQUNkLENBQUMsNEVBQThDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO1lBQ25GLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGNBQWMsbUNBQXVCO1lBQzdELElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGNBQWM7WUFDcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FDM0MsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFBO1FBRS9CLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2pELENBQUM7YUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ2xCLE9BQU8sOEJBQThCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLElBQUksS0FBSyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsSUFBSSxtQkFBbUI7UUFDdEIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFBO1FBQ3RDLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQTtJQUN0RCxDQUFDO0lBR0QsSUFBSSxvQkFBb0I7UUFDdkIsT0FBTyxDQUNOLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLG9CQUFvQjtZQUNwQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxvQkFBb0I7WUFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FDdEMsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUE7SUFDckUsQ0FBQztJQUVPLFFBQVE7UUFDZixPQUFPLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBd0I7UUFDekMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzdCLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUE7UUFDdEIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsS0FBSyxDQUFDLGtCQUFrQixDQUN2QixRQUEyQixpQkFBaUIsQ0FBQyxJQUFJO1FBRWpELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDdEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2xDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQzdCLFVBQVUsRUFDVixDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO3dCQUN6RSxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO3dCQUM3QyxNQUFNLENBQUMsQ0FBQTtvQkFDUixDQUFDLENBQUMsQ0FBQyxDQUNILENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHVCQUF1QixDQUFDLEVBQzlELElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUNsQixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsU0FBUztRQUNSLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsQ0FBQztZQUN2QyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLGlDQUF5QixDQUFBO0lBQzFDLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQXdCO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUM3QixJQUFJLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQztZQUN0QixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNoRSxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDaEMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1lBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDakYsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLElBQUksaUNBQXlCLEVBQUUsQ0FBQztZQUN4QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxJQUFJOzs7RUFHMUQsSUFBSSxDQUFDLFdBQVc7Q0FDakIsQ0FBQyxDQUFBO1FBQ0EsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ2xGLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELFlBQVk7UUFDWCxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbkQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUF3QjtRQUMxQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDN0IsSUFBSSxLQUFLLEVBQUUsWUFBWSxFQUFFLENBQUM7WUFDekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDbkUsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ2hDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FDckIsb0RBQW9ELCtCQUErQiwyQ0FBMkMsQ0FDOUgsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFDbEQsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUQsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtRQUNqQyxDQUFDO1FBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQTtRQUMxQixDQUFDO1FBQ0QsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUE7UUFDbkQsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELElBQUksSUFBSTtRQUNQLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFDeEIsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxHQUFHLElBQUksQ0FBQTtRQUNsRCxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLHFCQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JFLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQTtRQUM1QyxDQUFDO1FBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFBO1FBQzdDLENBQUM7UUFDRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFBO1FBQzlELENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxJQUFJLGFBQWE7UUFDaEIsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFDbEQsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDN0QsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxhQUFhLElBQUksRUFBRSxDQUFBO1FBQzlDLENBQUM7UUFDRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQTtRQUN0RCxDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsNEJBQTRCLENBQUMseUJBQXFEO1FBQ2pGLElBQUksQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEYsSUFBSSxDQUFDLGVBQWUsR0FBRyx5QkFBeUIsQ0FBQyxVQUFVO1lBQzFELENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDeEUsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUNaLElBQUksQ0FBQywrQkFBK0I7WUFDbkMseUJBQXlCLEVBQUUsK0JBQStCLEVBQUUsUUFBUSxDQUNuRSxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FDaEMsQ0FBQTtJQUNILENBQUM7SUFFTyw4QkFBOEI7UUFDckMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQTtRQUMzQixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUE7UUFDdkMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNELENBQUE7QUExaEJZLFNBQVM7SUFjbkIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxZQUFZLENBQUE7SUFDWixZQUFBLGVBQWUsQ0FBQTtHQWxCTCxTQUFTLENBMGhCckI7O0FBRUQsTUFBTSwwQkFBMEIsR0FBRyx1QkFBdUIsQ0FBQTtBQUMxRCxNQUFNLGdDQUFnQyxHQUFHLDRCQUE0QixDQUFBO0FBQ3JFLE1BQU0sc0NBQXNDLEdBQUcsbUNBQW1DLENBQUE7QUFFbEYsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLFVBQVU7SUFJbEMsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQTtJQUM1QixDQUFDO0lBR0QsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtJQUMzQixDQUFDO0lBTUQsWUFDVSxNQUFrQyxFQUMxQixhQUFzRCxFQUN0RCxvQkFFaEIsRUFDZ0IsaUJBQTBCLEVBQ2pCLGNBQXlELEVBRW5GLDBCQUFpRixFQUVqRixtQ0FBMEYsRUFDdkUsZ0JBQW9ELEVBQ2hELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQWRFLFdBQU0sR0FBTixNQUFNLENBQTRCO1FBQzFCLGtCQUFhLEdBQWIsYUFBYSxDQUF5QztRQUN0RCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBRXBDO1FBQ2dCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBUztRQUNBLG1CQUFjLEdBQWQsY0FBYyxDQUEwQjtRQUVsRSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXNDO1FBRWhFLHdDQUFtQyxHQUFuQyxtQ0FBbUMsQ0FBc0M7UUFDdEQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUMvQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBN0JuRSxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUMsSUFBSSxPQUFPLEVBQXNFLENBQ2pGLENBQUE7UUFLZ0IsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBS3ZELGVBQVUsR0FBZ0IsRUFBRSxDQUFBO1FBQzVCLGlCQUFZLEdBQWdCLEVBQUUsQ0FBQTtRQUM5QixjQUFTLEdBQWdCLEVBQUUsQ0FBQTtRQWtCbEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixNQUFNLENBQUMsMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUN2RixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixNQUFNLENBQUMsMEJBQTBCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM5RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQzlCLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLDBCQUEwQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDNUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FDdkMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixNQUFNLENBQUMsMEJBQTBCLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMvRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQy9CLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLDBCQUEwQixDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDcEUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FDMUMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4RixJQUFJLENBQUMsU0FBUyxDQUNiLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDbEYsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZGLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsbUNBQW1DLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDakUsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNyRSxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUE7Z0JBQ2pELElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNuQixJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3BDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsbUNBQW1DLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDbkUsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3ZCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3hDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsbUNBQW1DLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDdEUsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3ZCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUdELElBQUksS0FBSztRQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7WUFDaEIsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLENBQUM7WUFDRCxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDekMsSUFDQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FDbEMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQzdELEVBQ0EsQ0FBQztvQkFDRixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDNUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLGNBQStCO1FBQ25ELE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzlCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNsQixDQUFDO0lBRUQsS0FBSyxDQUFDLGtDQUFrQyxDQUN2QyxpQkFBc0MsRUFDdEMsY0FBK0I7UUFFL0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsbURBQW1ELENBQ2hGLGlCQUFpQixFQUNqQixjQUFjLENBQ2QsQ0FBQTtRQUNELEtBQUssTUFBTSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUMvQyx3REFBd0Q7WUFDeEQsSUFBSSxTQUFTLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwRixTQUFTLENBQUMsS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3RFLENBQUM7WUFDRCxJQUNDLENBQUMsU0FBUyxDQUFDLE9BQU87Z0JBQ2xCLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxPQUFPO2dCQUM3QyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEtBQUssT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQ2hGLENBQUM7Z0JBQ0YsU0FBUyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7Z0JBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsbURBQW1ELENBQ2hFLGlCQUFzQyxFQUN0QyxjQUErQjtRQUUvQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3ZGLE1BQU0sMkJBQTJCLEdBQXdCLEVBQUUsQ0FBQTtRQUMzRCxNQUFNLGtDQUFrQyxHQUFxQixFQUFFLENBQUE7UUFDL0QsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUN2QixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3JCLElBQ0MsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUM5QyxPQUFPLEVBQ1AsU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQzFCLGNBQWMsRUFDZCxjQUFjLENBQ2QsRUFDQSxDQUFDO29CQUNGLDJCQUEyQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDMUMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGtDQUFrQyxDQUFDLElBQUksQ0FBQzt3QkFDdkMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVU7d0JBQzdCLFVBQVUsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVU7cUJBQ3RDLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9DLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQ3JELGtDQUFrQyxFQUNsQyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsRUFDNUUsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1lBQ0QsMkJBQTJCLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHlDQUF5QyxDQUFDLDJCQUEyQixDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUVPLHlDQUF5QyxDQUNoRCxpQkFBc0M7UUFFdEMsTUFBTSxnQkFBZ0IsR0FBcUMsRUFBRSxDQUFBO1FBQzdELE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUE2QixFQUNsRCxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUE7UUFDNUMsS0FBSyxNQUFNLE9BQU8sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBQ0QsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDeEMsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMxQyxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO29CQUMzQyxTQUFRO2dCQUNULENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLE1BQU0sS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO2dCQUMvRCxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO2dCQUM1QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLGdCQUFnQixDQUFBO0lBQ3hCLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUMzQixjQUErQixFQUMvQixPQUEwQjtRQUUxQixJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtRQUMvQixJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUt6RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUMvQiwrQkFBK0IsQ0FDL0IsQ0FBQTtZQUNELE1BQU0sdUJBQXVCLEdBQWtDLENBQzlELE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQ3RDLENBQUMsRUFBRSxHQUFHLGNBQWMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsRUFDNUUsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUNELENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDSixtQkFBbUIsR0FBRyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixDQUFBO1FBQ2pGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFO1lBQzlFLEVBQUUsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUk7WUFDM0Isb0JBQW9CLEVBQUUsT0FBTyxDQUFDLG9CQUFvQjtZQUNsRCxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDaEMsbUJBQW1CO1NBQ25CLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxVQUFVLENBQUMsZ0JBQW1DO1FBQzdDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRU8sa0JBQWtCLENBQUMsS0FBNEI7UUFDdEQsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQTtRQUN4QixJQUFJLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxNQUFNLFNBQVMsR0FDZCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzlFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZDLFNBQVMsRUFDVCxJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxNQUFNLEVBQ1gsU0FBUyxFQUNULE1BQU0sRUFDTixTQUFTLENBQ1QsQ0FBQTtZQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxjQUFnQztRQUN0RSxNQUFNLHlCQUF5QixHQUM5QixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtRQUM1RSxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsWUFBWSxDQUNwRSxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsQ0FDZCxDQUFBO1FBQ0QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QixHQUFHLENBQUMsSUFBSSxDQUNQLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUN6RixDQUFBO1FBQ0YsQ0FBQztRQUVELGdIQUFnSDtRQUNoSCxNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLEVBQUU7WUFDMUYsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLGtCQUErQyxFQUNsRCxhQUEwQyxFQUMxQyxlQUE0QyxDQUFBO2dCQUM3QyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNwQyxJQUFJLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO3dCQUNqQyxrQkFBa0IsR0FBRyxTQUFTLENBQUE7b0JBQy9CLENBQUM7eUJBQU0sSUFBSSxTQUFTLENBQUMsSUFBSSwrQkFBdUIsRUFBRSxDQUFDO3dCQUNsRCxhQUFhLEdBQUcsU0FBUyxDQUFBO29CQUMxQixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsZUFBZSxHQUFHLFNBQVMsQ0FBQTtvQkFDNUIsQ0FBQztnQkFDRixDQUFDO2dCQUNELE1BQU0sU0FBUyxHQUFHLGtCQUFrQixJQUFJLGFBQWEsSUFBSSxlQUFlLENBQUE7Z0JBQ3hFLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDdkIsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVOLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlGLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3hDLE1BQU0sU0FBUyxHQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMsU0FBUyxFQUNULElBQUksQ0FBQyxhQUFhLEVBQ2xCLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLE1BQU0sRUFDWCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1lBQ0YsU0FBUyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7WUFDdkIsU0FBUyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDckYsU0FBUyxDQUFDLDRCQUE0QixDQUFDLHlCQUF5QixDQUFDLENBQUE7WUFDakUsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUs7UUFDbEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFDbkIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUE7UUFDdEIsTUFBTSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFTyxLQUFLLENBQUMsc0JBQXNCLENBQUMsT0FBMEM7UUFDOUUsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQTtRQUNsQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzdCLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFBO1lBQy9CLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ2pFLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUNqRSxNQUFNLG1CQUFtQixHQUFHLE9BQU87Z0JBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZGLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFDUCxJQUFJLENBQUMsVUFBVSxHQUFHLG1CQUFtQjtnQkFDcEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssbUJBQW1CLENBQUM7Z0JBQzFELENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFBO1lBRWxCLElBQUksU0FBUyxHQUEwQixtQkFBbUI7Z0JBQ3pELENBQUMsQ0FBQyxtQkFBbUI7Z0JBQ3JCLENBQUMsQ0FBQyxRQUFRLElBQUksS0FBSztvQkFDbEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3hDLFNBQVMsRUFDVCxJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxNQUFNLEVBQ1gsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLENBQ1Q7b0JBQ0YsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUNiLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDWCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzdDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsU0FBVSxDQUFDLFVBQVUsQ0FBQyxDQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNKLElBQUksU0FBUyxFQUFFLENBQUM7d0JBQ2YsU0FBUyxHQUFHLFNBQVMsQ0FBQTtvQkFDdEIsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUMvQixDQUFDO29CQUNELFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO29CQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUN4QixTQUFTLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtvQkFDNUIsQ0FBQztvQkFDRCxTQUFTLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDdEYsQ0FBQztnQkFDRCxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDbEIsQ0FBQyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FDNUUsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtZQUM1RixLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNwQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDakQsQ0FBQztZQUNELElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxLQUFzQjtRQUNoRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMvRixJQUFJLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN0QixNQUFNLFVBQVUsR0FDZixTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxVQUFVLENBQUE7WUFDM0YsU0FBUyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7WUFDdkIsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1lBQ25DLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxVQUF1QjtRQUN4RSxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQUMsQ0FBQTtRQUNoRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FDaEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQzFFO1lBQ0MsVUFBVSxFQUFFLElBQUk7WUFDaEIsY0FBYyxFQUFFLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUIsRUFBRTtTQUNoRixFQUNELGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtRQUNELEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7WUFDcEMsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDL0MsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQ3JELENBQUE7WUFDRCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixTQUFTLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQTtnQkFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1lBQ25DLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQixDQUFDLFVBQWdDO1FBQzVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDOUYsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0sWUFBWSxHQUNqQixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQTtZQUM3RixJQUFJLENBQUMsWUFBWSxHQUFHO2dCQUNuQixZQUFZO2dCQUNaLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUNoRixDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDNUUsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQThCO1FBQ2hGLE1BQU0sV0FBVyxHQUNoQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQzNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQ25ELENBQUE7UUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUM1RixDQUFDO1FBQ0QsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsa0JBQWlEO1FBQzVFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDMUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUM3RSxDQUFBO1FBQ0QsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNwQyxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDM0YsSUFBSSxlQUFlLEtBQUssU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUNuRCxTQUFTLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtvQkFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsaUJBQWlCLENBQUMsU0FBb0I7UUFDckMsSUFDQyxTQUFTLENBQUMsT0FBTztZQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxPQUFRLENBQUMsVUFBVSxDQUFDLENBQ3RGLEVBQ0EsQ0FBQztZQUNGLHlDQUFnQztRQUNqQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzFGLDJDQUFrQztRQUNuQyxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQ2xDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLEtBQUssU0FBUztZQUNmLENBQUMsQ0FBQyxDQUFDLE9BQU87Z0JBQ1QsU0FBUyxDQUFDLE9BQU87Z0JBQ2pCLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNKLE9BQU8sS0FBSyxDQUFDLENBQUMsa0NBQTBCLENBQUMsbUNBQTJCLENBQUE7SUFDckUsQ0FBQztDQUNELENBQUE7QUE3ZUssVUFBVTtJQXdCYixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsb0NBQW9DLENBQUE7SUFFcEMsV0FBQSxvQ0FBb0MsQ0FBQTtJQUVwQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7R0E5QmxCLFVBQVUsQ0E2ZWY7QUFFTSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUNaLFNBQVEsVUFBVTs7YUFHTSx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEFBQXRCLENBQXNCLEdBQUMsV0FBVztJQWM5RSxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFBO0lBQzVCLENBQUM7SUFTRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO0lBQzNCLENBQUM7SUFTRCxZQUN3QixvQkFBNEQsRUFDbkUsYUFBOEMsRUFFOUQsMEJBQWlGLEVBQ3ZELGNBQXlELEVBRW5GLCtCQUFrRixFQUMzRCxvQkFBNEQsRUFDaEUsZ0JBQW9ELEVBQ2pELG1CQUEwRCxFQUNuRSxVQUF1QixFQUVwQywwQkFBaUYsRUFDbkUsV0FBMEMsRUFDdEMsZUFBa0QsRUFFcEUsZ0NBQW9GLEVBQ2xFLGVBQWtELEVBRXBFLCtCQUFxRixFQUMzRCx1QkFBa0UsRUFDM0UsY0FBZ0QsRUFDN0MsaUJBQXFDLEVBRXpELGtDQUF3RixFQUMzRSxVQUF3QyxFQUNsQyxnQkFBb0QsRUFDdkQsYUFBOEMsRUFDM0MsZ0JBQW9ELEVBQ3pELFdBQTBDLEVBQy9CLHNCQUFnRSxFQUN4RSxjQUFnRCxFQUNqRCxhQUE4QyxFQUU5RCw2QkFBOEUsRUFDOUQsYUFBOEMsRUFDekMsa0JBQXdELEVBQ25ELHVCQUFrRSxFQUM3RSxZQUE0QyxFQUN2QyxpQkFBc0QsRUFDdEQsaUJBQXNELEVBQy9DLHdCQUFvRTtRQUUvRixLQUFLLEVBQUUsQ0FBQTtRQTNDaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNsRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFFN0MsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFzQztRQUN0QyxtQkFBYyxHQUFkLGNBQWMsQ0FBMEI7UUFFbEUsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQUMxQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQy9DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDaEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUcvRCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXNDO1FBQ2xELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3JCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUVuRCxxQ0FBZ0MsR0FBaEMsZ0NBQWdDLENBQW1DO1FBQ2pELG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUVuRCxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQXFDO1FBQzFDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFDMUQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBR2hELHVDQUFrQyxHQUFsQyxrQ0FBa0MsQ0FBcUM7UUFDMUQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNqQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3RDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMxQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3hDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ2QsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUN2RCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDaEMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBRTdDLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBZ0M7UUFDN0Msa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3hCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDbEMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUM1RCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUN0QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3JDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDOUIsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQXpFL0Usb0JBQWUsR0FBc0IsSUFBSSxDQUFBO1FBQ3pDLHFCQUFnQixHQUFzQixJQUFJLENBQUE7UUFDMUMsa0JBQWEsR0FBc0IsSUFBSSxDQUFBO1FBQ3ZDLHNCQUFpQixHQUFpQixFQUFFLENBQUE7UUFLcEMsY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQU1qRSx1Q0FBa0MsR0FBRyxJQUFJLE9BQU8sRUFFOUQsQ0FBQTtRQUNNLHNDQUFpQyxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFLLENBQUE7UUFFekUsYUFBUSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFLdEMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFBO1FBRTdELGVBQVUsR0FBaUIsRUFBRSxDQUFBO1FBQzdCLG9CQUFlLEdBQTZCLEVBQUUsQ0FBQTtRQXVUckMsa0NBQTZCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQXRRdkYsTUFBTSxzQkFBc0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsK0JBQStCLENBQUMsQ0FBQTtRQUM3RixJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLHNCQUFzQixDQUFBO1FBQ2xELENBQUM7UUFDRCxJQUFJLENBQUMsK0JBQStCLEdBQUcsNEJBQTRCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDN0YsSUFBSSxnQ0FBZ0MsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1lBQ3JFLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEMsb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxVQUFVLEVBQ1YsZ0NBQWdDLENBQUMsOEJBQThCLEVBQy9ELENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEVBQ3BDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUNsQyxDQUFDLGdDQUFnQyxDQUFDLCtCQUErQixDQUNqRSxDQUNELENBQUE7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5RixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFDRCxJQUFJLGdDQUFnQyxDQUFDLCtCQUErQixFQUFFLENBQUM7WUFDdEUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3JDLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsVUFBVSxFQUNWLGdDQUFnQyxDQUFDLCtCQUErQixFQUNoRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUNwQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFDbEMsSUFBSSxDQUNKLENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUMvRSxDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2xFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUNELElBQUksZ0NBQWdDLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUNuRSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2xDLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsVUFBVSxFQUNWLGdDQUFnQyxDQUFDLDRCQUE0QixFQUM3RCxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUNwQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFDbEMsQ0FBQyxDQUNBLGdDQUFnQyxDQUFDLCtCQUErQjtnQkFDaEUsZ0NBQWdDLENBQUMsOEJBQThCLENBQy9ELENBQ0QsQ0FDRCxDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksZ0JBQWdCLENBQzlDLDRCQUEwQixDQUFDLG9CQUFvQixDQUMvQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksZ0JBQWdCLENBQU8sSUFBSSxDQUFDLENBQUE7UUFDekQsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNqQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDaEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFaEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDekMsQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVO1FBQ3ZCLDhCQUE4QjtRQUM5QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDakIsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNqQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUNBQWlDLEVBQUU7U0FDekQsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzVCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQ2xFLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQ2pELENBQ0QsQ0FBQTtRQUVELE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksbUNBQTJCLENBQUE7UUFDM0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzVCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLENBQUE7UUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQiwrQkFFbkMsc0NBQXNDLEVBQ3RDLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLENBQUMsQ0FDdkQsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0Isb0NBRW5DLDBCQUEwQixFQUMxQixJQUFJLENBQUMsTUFBTSxDQUNYLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxDQUFDLENBQzlELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLG9DQUVuQyxnQ0FBZ0MsRUFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLEVBQUUsQ0FBQyxDQUM5RCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsUUFBUSxDQUNiLElBQUksQ0FBQyxRQUFRLEVBQ2IsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUNmLEdBQUcsQ0FDSCxDQUFDLEdBQUcsRUFBRTtZQUNOLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFBO1lBQ25DLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO1FBQ3RDLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLHNDQUFzQztRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQztnQkFDeEQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO29CQUNoQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtnQkFDdEMsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFFLENBQUM7Z0JBQzlELElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsQ0FBQztvQkFDdEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO2dCQUNuRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLEVBQUU7WUFDMUUsSUFDQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyx1QkFBdUI7Z0JBQ3JELGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMzRSxDQUFDO2dCQUNGLElBQUksQ0FBQyxlQUFlLENBQUMsOEJBQThCLENBQUMsQ0FBQTtZQUNyRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLFFBQVEsQ0FDYixJQUFJLENBQUMsUUFBUSxFQUNiLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixHQUFHLENBQ0gsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQzNFLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFDQyxDQUFDLENBQUMsQ0FBQyxJQUFJLDhEQUFpQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ3ZELENBQUMsQ0FBQyxJQUFJLGtFQUFtQztnQkFDekMsQ0FBQyxDQUFDLElBQUksNENBQXlCLEVBQzlCLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FNOUIsdUNBQXVDLENBQUMsQ0FBQTtnQkFDMUMsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDO29CQUN0QyxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQ3ZDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLHVDQUF1QyxDQUFDLEdBQUcsRUFBRTtZQUMxRSxJQUFJLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxlQUFlLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELDZCQUE2QjtRQUM3QixJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRWxFLG9CQUFvQjtRQUNwQixJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFcEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1lBQ2xDLCtDQUErQztZQUMvQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7WUFDbkMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQztnQkFDekQsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7WUFDbkMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssS0FBSyxDQUFBO0lBQzNDLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDcEQsMEJBQTBCLENBQzFCLENBQUE7UUFDRCxJQUFTLFVBQVUsS0FBSyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2xELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsS0FBSyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDM0YsQ0FBQztJQUVELEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxtQkFBNEI7UUFDbEUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN2RCxJQUFJLG9CQUFvQixLQUFLLG1CQUFtQixFQUFFLENBQUM7WUFDbEQsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO1lBQy9DLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLHdCQUF3QixDQUFDO1lBQy9FLE9BQU8sRUFBRSxtQkFBbUI7Z0JBQzNCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNaLHlCQUF5QixFQUN6Qix1REFBdUQsQ0FDdkQ7Z0JBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQ1osMEJBQTBCLEVBQzFCLHdEQUF3RCxDQUN4RDtZQUNILE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNuQixzQ0FBc0MsRUFDdEMsa0ZBQWtGLENBQ2xGO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUVELG9GQUFvRjtRQUNwRixJQUFJLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFdkMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFFNUYsSUFBSSxDQUFDLCtCQUErQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUM1RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBR08sMkJBQTJCO1FBQ2xDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFBO1FBQ3BELElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzlFLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUN0RixJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDeEYsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGtDQUFrQztRQUN6QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUzthQUNqQyxNQUFNLENBQ04sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUNiLENBQUMsU0FBUyxDQUFDLFNBQVM7WUFDcEIsQ0FBQyxTQUFTLENBQUMsZUFBZSw4Q0FBcUM7Z0JBQzlELFNBQVMsQ0FBQyxlQUFlLDZDQUFvQyxDQUFDLENBQ2hFO2FBQ0EsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQy9CLHFCQUFxQixFQUNyQjtZQUNDLFlBQVksRUFBRSxJQUFJLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0QsS0FBSyxFQUFFLFlBQVksQ0FBQyxNQUFNO1NBQzFCLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsNEJBQTRCLENBQ3pDLEtBQTJDLEVBQzNDLE9BQTZDO1FBRTdDLE1BQU0saUJBQWlCLEdBQWlCLEVBQUUsQ0FBQTtRQUMxQyxNQUFNLGlCQUFpQixHQUE0QixFQUFFLENBQUE7UUFDckQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzNDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUMvRSxDQUFBO1lBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sbUJBQW1CLEdBQTRCLEVBQUUsQ0FBQTtRQUN2RCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzVCLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7Z0JBQzVFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMvQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QixNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQzFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFDeEUsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1lBQ0QsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUE7UUFDdEMsQ0FBQztRQUNELElBQUksbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQ2xELG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQ25ELElBQUksQ0FDSixDQUFBO1lBQ0QsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUE7UUFDdEMsQ0FBQztRQUNELEtBQUssTUFBTSxnQkFBZ0IsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxNQUFlO1FBQ2xELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQ3ZDO1lBQ0MsUUFBUSxxQ0FBNkI7WUFDckMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsdUNBQXVDLENBQUM7U0FDbEYsRUFDRCxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsb0NBQW9DLENBQUMsTUFBTSxDQUFDLENBQ2xGLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSztRQUNaLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQTtRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQTtRQUNwQixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxTQUFzQjtRQUNuRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBR0QsSUFBSSxLQUFLO1FBQ1IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQTtZQUM3QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUE7Z0JBQ2hCLE1BQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDbEUsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBR0QsSUFBSSxTQUFTO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQTtZQUNwQixLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUNqRCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ2hDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDM0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsS0FBSyxxQ0FBNkIsQ0FDcEUsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQW1DO1FBQ25ELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUNDLElBQUksQ0FBQyxlQUFlO2dCQUNwQixJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCLEtBQUssTUFBTSxFQUM5RSxDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtZQUNyRSxDQUFDO1lBQ0QsSUFDQyxJQUFJLENBQUMsZ0JBQWdCO2dCQUNyQixJQUFJLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCLEtBQUssTUFBTSxFQUMvRSxDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1lBQ3RFLENBQUM7WUFDRCxJQUNDLElBQUksQ0FBQyxhQUFhO2dCQUNsQixJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLEtBQUssTUFBTSxFQUM1RSxDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtZQUNuRSxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQztnQkFDSixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7WUFDcEUsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7WUFDckUsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtZQUNsRSxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUlELEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBUyxFQUFFLElBQVU7UUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxPQUFPLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQWtCLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUN0RixNQUFNLEtBQUssR0FBc0IsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQzFGLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUNoRixPQUFPLENBQUMsaUJBQWlCLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztZQUNqRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQjtZQUN4QixDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFBO1FBRTVCLE1BQU0seUJBQXlCLEdBQzlCLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLDRCQUE0QixFQUFFLENBQUE7UUFDckUsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN4RCxPQUFPO1lBQ04sU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDMUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FDcEQ7WUFDRCxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDbEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUNuQyxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNsRCxJQUFJLENBQUMsa0NBQWtDLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzdDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxDQUFBO1lBQ25GLENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQztJQVFELEtBQUssQ0FBQyxhQUFhLENBQ2xCLGNBQWdDLEVBQ2hDLElBQVMsRUFDVCxJQUFVO1FBRVYsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0seUJBQXlCLEdBQzlCLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLDRCQUE0QixFQUFFLENBQUE7UUFDckUsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0YsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDMUQsT0FBTyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLHlCQUF5QixDQUFDLENBQUMsQ0FBQTtJQUNoRyxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLFNBQWdCLEVBQUUsaUJBQTBCO1FBQ3ZFLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pGLE9BQU8sa0JBQWtCLENBQUMsR0FBRyxDQUM1QixDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FDckIsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQztZQUN0RSxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2QyxTQUFTLEVBQ1QsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsRUFDcEMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQ2xDLFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsQ0FDeEMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLHNDQUFzQztRQUM3QyxJQUNDLElBQUksQ0FBQywyQkFBMkI7WUFDaEMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUMsNERBQTRELEVBQ2pHLENBQUM7WUFDRixJQUFJLENBQUMsNEJBQTRCLEdBQUcsU0FBUyxDQUFBO1lBQzdDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDO0lBRU8sNEJBQTRCO1FBQ25DLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUE7UUFDcEUsTUFBTSxzQkFBc0IsR0FBYSxFQUFFLENBQUE7UUFFM0MsSUFBSSxzQkFBK0UsQ0FBQTtRQUNuRixJQUFJLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25DLHNFQUFzRTtZQUN0RSxLQUFLLE1BQU0scUJBQXFCLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsQ0FBQztnQkFDdEUsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUsscUJBQXFCLENBQUMsRUFBRSxDQUFDO29CQUN6RSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDbkQsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JFLHNCQUFzQixHQUFHO29CQUN4QixPQUFPLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztvQkFDMUMsUUFBUSxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7b0JBQzVDLFVBQVUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO29CQUNoRCxHQUFHLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztvQkFDbEMsT0FBTyxFQUFFLEdBQUcsRUFBRTt3QkFDYixJQUFJLENBQUMseUJBQXlCLENBQUM7NEJBQzlCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUFFOzRCQUNuQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO3lCQUM3QixDQUFDLENBQUE7d0JBQ0YsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUE7b0JBQ3BDLENBQUM7aUJBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLHlCQUF5QixDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFFdEQsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxLQUFLLHNCQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ3RFLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQTtZQUNwRCxJQUFJLENBQUMsa0NBQWtDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzFFLENBQUM7SUFDRixDQUFDO0lBRU8sOEJBQThCO1FBR3JDLE1BQU0sc0JBQXNCLEdBRXhCLEVBQUUsQ0FBQTtRQUVOLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQzdDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxnREFBd0MsQ0FDaEUsQ0FBQTtRQUNELElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsc0JBQXNCLENBQUMsSUFBSSxDQUFDO2dCQUMzQixPQUFPLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLE1BQU07b0JBQzVFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNaLGlDQUFpQyxFQUNqQyx5RkFBeUYsQ0FDekY7b0JBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQ1osdUJBQXVCLEVBQ3ZCLDZFQUE2RSxDQUM3RTtnQkFDSCxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQzFCLFVBQVUsRUFBRSxvQkFBb0I7Z0JBQ2hDLEdBQUcsRUFDRix1QkFBdUI7b0JBQ3ZCLG9CQUFvQjt5QkFDbEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7eUJBQzlELEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7eUJBQ3pDLElBQUksQ0FBQyxHQUFHLENBQUM7YUFDWixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDMUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxlQUFlLHVEQUErQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUN6RixDQUFBO1FBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QixJQUNDLGlCQUFpQixDQUFDLElBQUksQ0FDckIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxLQUFLO2dCQUNQLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxNQUFNO2dCQUNoQyxDQUFDLENBQUMsYUFBYSxDQUNkLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQy9CLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUMzQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FDeEI7b0JBQ0EseUJBQXlCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsbUJBQW1CLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQy9FLEVBQ0EsQ0FBQztnQkFDRixzQkFBc0IsQ0FBQyxJQUFJLENBQUM7b0JBQzNCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNwQix3QkFBd0IsRUFDeEIsc0ZBQXNGLENBQ3RGO29CQUNELFFBQVEsRUFBRSxRQUFRLENBQUMsT0FBTztvQkFDMUIsVUFBVSxFQUFFLGlCQUFpQjtvQkFDN0IsR0FBRyxFQUNGLHlCQUF5Qjt3QkFDekIsaUJBQWlCOzZCQUNmLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDOzZCQUM5RCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7NkJBQzNFLElBQUksQ0FBQyxHQUFHLENBQUM7aUJBQ1osQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLHNCQUFzQixDQUFDLElBQUksQ0FBQztvQkFDM0IsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsMkNBQTJDLENBQUM7b0JBQ3ZGLFFBQVEsRUFBRSxRQUFRLENBQUMsT0FBTztvQkFDMUIsVUFBVSxFQUFFLGlCQUFpQjtvQkFDN0IsR0FBRyxFQUNGLG9CQUFvQjt3QkFDcEIsaUJBQWlCOzZCQUNmLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDOzZCQUM5RCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7NkJBQzNFLElBQUksQ0FBQyxHQUFHLENBQUM7aUJBQ1osQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUM3QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FDM0YsQ0FBQTtRQUNELElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsc0JBQXNCLENBQUMsSUFBSSxDQUFDO2dCQUMzQixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDcEIsdUJBQXVCLEVBQ3ZCLDBFQUEwRSxDQUMxRTtnQkFDRCxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQzFCLFVBQVUsRUFBRSxvQkFBb0I7Z0JBQ2hDLEdBQUcsRUFDRix1QkFBdUI7b0JBQ3ZCLG9CQUFvQjt5QkFDbEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7eUJBQzlELEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7eUJBQ3pDLElBQUksQ0FBQyxHQUFHLENBQUM7YUFDWixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxzQkFBc0IsQ0FBQTtJQUM5QixDQUFDO0lBRUQseUJBQXlCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFBO0lBQ25DLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxJQUFZO1FBQ3BDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtRQUUxRCxNQUFNLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQTtRQUMxQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMvQixJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQzlDLHVCQUF1QjtnQkFDdkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUE7Z0JBQzFELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBRWxDLGdCQUFnQjtnQkFDaEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQ0FBb0MsQ0FDM0UsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQ25CLENBQUE7Z0JBQ0QsTUFBTSxZQUFZLEdBQUcsVUFBVSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUNuRixNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtnQkFFaEUseUJBQXlCO2dCQUN6QixPQUFPLGNBQWMsR0FBRyxpQkFBaUIsR0FBRyxLQUFLLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxTQUFTLEdBQUcsR0FBRyxDQUFBO1lBQzlILENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVPLFdBQVcsQ0FDbEIsT0FBMEIsRUFDMUIseUJBQXFEO1FBRXJELElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ25ELFNBQVMsRUFDVCxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUNwQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFDbEMsU0FBUyxFQUNULFNBQVMsRUFDVCxPQUFPLEVBQ1AsU0FBUyxDQUNULENBQ0E7WUFBWSxTQUFVLENBQUMsNEJBQTRCLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUNoRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLG9DQUFvQyxDQUFDLE9BQTBCO1FBQ3RFLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BDLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDL0IseUJBQXlCO2dCQUN6QixJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzNELE9BQU8sU0FBUyxDQUFBO2dCQUNqQixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNuRCxJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7b0JBQ2pFLCtCQUErQjtvQkFDL0IsT0FBTyxTQUFTLENBQUE7Z0JBQ2pCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLHFDQUFxQyxDQUFDLFFBQWE7UUFDMUQsT0FBTyxDQUNOLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNkLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUN2RixJQUFJLElBQUksQ0FDVCxDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBOEIsRUFBRSxPQUFpQztRQUMzRSxJQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ25DLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQTtZQUNwQixTQUFTO2dCQUNSLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbkUsQ0FBQyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUUsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFDRCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUNsQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsRUFDcEUsT0FBTyxFQUNQLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUMvQyxDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBbUIsRUFBRSxhQUF1QjtRQUM1RCxNQUFNLGlCQUFpQixHQUFHLENBQ3pCLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQzNELEVBQUUsb0JBQW9CLEVBQWtDLENBQUE7UUFDekQsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUVELHlCQUF5QixDQUFDLFNBQXFCO1FBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDcEUsS0FBSyxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUNoRCxJQUFJLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELE9BQU8sZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUFDLE9BQWdCLEtBQUs7UUFDbEQsTUFBTSxLQUFLLEdBQXNCLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUE7UUFFN0IsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3pDLEtBQUssTUFBTSxTQUFTLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUMzQyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFBO1lBQzNDLElBQUksQ0FBQyxZQUFZLElBQUksWUFBWSxDQUFDLE1BQU0sMkVBQWlELEVBQUUsQ0FBQztnQkFDM0YsU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLHVDQUErQixFQUFFLENBQUM7Z0JBQ3BELFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdEMsU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN0QixTQUFRO1lBQ1QsQ0FBQztZQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzVFLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3BFLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUNqRixDQUFBO2dCQUNELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdEIsUUFBUSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ2pELENBQUM7Z0JBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDNUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1FBQ0YsQ0FBQztRQUVELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzFELElBQUksU0FBUyxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ2xDLFNBQVE7WUFDVCxDQUFDO1lBQ0QsSUFDQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM1QixpQkFBaUIsQ0FDaEIsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFDeEQsQ0FBQyxDQUFDLEtBQUssRUFBRSxVQUFVLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FDbkMsQ0FDRCxFQUNBLENBQUM7Z0JBQ0YsU0FBUTtZQUNULENBQUM7WUFDRCxxRkFBcUY7WUFDckYsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFDLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JDLElBQ0MsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQzdDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLCtCQUErQixDQUFDLEVBQ3hELElBQUksQ0FDSixFQUNBLENBQUM7Z0JBQ0YsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDcEUsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDO3dCQUMvQixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7d0JBQ3ZCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNwQix1QkFBdUIsRUFDdkIsbURBQW1ELENBQ25EO3dCQUNELFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxNQUFNO3FCQUNyQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztnQkFtQkQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIsd0JBQXdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFDN0UsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sZUFBZSxDQUFDLFNBQXFCO1FBQzVDLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxLQUFLLHVDQUErQixDQUFBO1FBQ3BFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNwRSxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FDbkUsQ0FBQTtRQUNELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQywrQkFBK0I7WUFDekYsQ0FBQztZQUNELENBQUMsdUVBQTZDLENBQUE7UUFDL0MsTUFBTSxpQkFBaUIsR0FDdEIsWUFBWSxpRUFBNEM7WUFDdkQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQztZQUN6QyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBRTVELElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsTUFBTSx5QkFBeUIsR0FDOUIsZ0JBQWdCLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDL0UsTUFBTSxzQkFBc0IsR0FDM0IsZ0JBQWdCO2dCQUNoQixDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU07b0JBQ2pCLFNBQVMsQ0FBQyxNQUFNO3dCQUNmLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FDakUsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQzdCLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUI7b0JBQzVCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUNyQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUNwQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FDbEMsQ0FBQyxDQUFBO1lBQ0osSUFDQyxDQUFDLHlCQUF5QjtnQkFDMUIsc0JBQXNCO2dCQUN0QixDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUNuQyxDQUFDO2dCQUNGLE9BQU87b0JBQ04sTUFBTSxFQUFFLFlBQVk7b0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNuQixzQkFBc0IsRUFDdEIsOERBQThELEVBQzlELGlCQUFpQixDQUNqQjtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztZQUNELE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQixNQUFNLHNCQUFzQixHQUMzQixnQkFBZ0I7Z0JBQ2hCLFNBQVMsQ0FBQyxNQUFNO29CQUNmLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FDakUsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQzdCLENBQUE7WUFDSCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUU1RSx1QkFBdUI7WUFDdkIsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLDREQUE0RDtvQkFDNUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQ3BGLE9BQU8sU0FBUyxDQUFBO29CQUNqQixDQUFDO29CQUNELE1BQU0sc0JBQXNCLEdBQzNCLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FDakUsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQzdCLENBQUE7b0JBRUYsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO3dCQUM1QixnSEFBZ0g7d0JBQ2hILElBQ0MsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0I7NEJBQ3BDLENBQUMsU0FBUyxDQUFDLE9BQU8sS0FBSyxnQkFBZ0IsQ0FBQyxPQUFPO2dDQUM5QyxTQUFTLENBQUMsS0FBSyxDQUFDLGNBQWMsS0FBSyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsRUFDbkUsQ0FBQzs0QkFDRixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBOzRCQUM3RCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFBOzRCQUMzRCxJQUNDLG9CQUFvQjtnQ0FDcEIsQ0FBQyxhQUFhLENBQ2IsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFDdkMscUJBQXFCLENBQUMsT0FBTyxFQUM3QixxQkFBcUIsQ0FBQyxJQUFJLENBQzFCO2dDQUNELGFBQWEsQ0FDWixTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUN2QyxvQkFBb0IsQ0FBQyxPQUFPLEVBQzVCLG9CQUFvQixDQUFDLElBQUksQ0FDekIsRUFDQSxDQUFDO2dDQUNGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO2dDQUN0QyxJQUFJLEtBQUssQ0FBQyxJQUFJLGtFQUFtQyxFQUFFLENBQUM7b0NBQ25ELE9BQU87d0NBQ04sTUFBTSxrRUFBMkM7d0NBQ2pELE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNuQiwyQkFBMkIsRUFDM0Isb0RBQW9ELEVBQ3BELElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUM1QjtxQ0FDRCxDQUFBO2dDQUNGLENBQUM7Z0NBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSw0Q0FBeUIsRUFBRSxDQUFDO29DQUN6QyxPQUFPO3dDQUNOLE1BQU0sNERBQXdDO3dDQUM5QyxNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbkIseUJBQXlCLEVBQ3pCLG9EQUFvRCxFQUNwRCxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FDNUI7cUNBQ0QsQ0FBQTtnQ0FDRixDQUFDO2dDQUNELElBQUksS0FBSyxDQUFDLElBQUksa0NBQW9CLEVBQUUsQ0FBQztvQ0FDcEMsT0FBTzt3Q0FDTixNQUFNLGtFQUEyQzt3Q0FDakQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ25CLDBCQUEwQixFQUMxQixxREFBcUQsRUFDckQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQzVCO3FDQUNELENBQUE7Z0NBQ0YsQ0FBQztnQ0FDRCxPQUFPLFNBQVMsQ0FBQTs0QkFDakIsQ0FBQzs0QkFDRCxPQUFPO2dDQUNOLE1BQU0sRUFBRSxZQUFZO2dDQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbkIsbUJBQW1CLEVBQ25CLDZDQUE2QyxFQUM3QyxpQkFBaUIsQ0FDakI7NkJBQ0QsQ0FBQTt3QkFDRixDQUFDO3dCQUVELElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzs0QkFDdkMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDbkQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQztnQ0FDckQsQ0FBQyxDQUFDLE1BQU0sS0FBSyxTQUFTLENBQUMsTUFBTSxDQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFBOzRCQUNKLElBQUksc0JBQXNCLEVBQUUsQ0FBQztnQ0FDNUIsMEVBQTBFO2dDQUMxRSxJQUNDLHNCQUFzQjtvQ0FDckIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLCtCQUErQjtvQ0FDdEUsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLGtCQUFrQixDQUN6RCxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDeEI7b0NBQ0Qsc0JBQXNCLENBQUMsTUFBTTt3Q0FDNUIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDhCQUE4QixFQUNwRSxDQUFDO29DQUNGLE9BQU87d0NBQ04sTUFBTSxFQUFFLFlBQVk7d0NBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNuQixnQkFBZ0IsRUFDaEIsOENBQThDLEVBQzlDLGlCQUFpQixDQUNqQjtxQ0FDRCxDQUFBO2dDQUNGLENBQUM7Z0NBRUQsaUZBQWlGO2dDQUNqRixJQUNDLHNCQUFzQjtvQ0FDckIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDhCQUE4QjtvQ0FDckUsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLHlCQUF5QixDQUNoRSxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDeEI7b0NBQ0Qsc0JBQXNCLENBQUMsTUFBTTt3Q0FDNUIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLCtCQUErQixFQUNyRSxDQUFDO29DQUNGLE9BQU87d0NBQ04sTUFBTSxFQUFFLFlBQVk7d0NBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNuQixlQUFlLEVBQ2YsNkNBQTZDLEVBQzdDLGlCQUFpQixFQUNqQixJQUFJLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUM1RTtxQ0FDRCxDQUFBO2dDQUNGLENBQUM7NEJBQ0YsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUNDLFNBQVMsQ0FBQyxNQUFNOzRCQUNmLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw4QkFBOEI7NEJBQ3JFLHNCQUFzQjtnQ0FDckIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLCtCQUErQixFQUNyRSxDQUFDOzRCQUNGLDBFQUEwRTs0QkFDMUUsSUFDQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFDbkYsQ0FBQztnQ0FDRixPQUFPO29DQUNOLE1BQU0sRUFBRSxZQUFZO29DQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbkIsbUJBQW1CLEVBQ25CLHNDQUFzQyxFQUN0QyxpQkFBaUIsQ0FDakI7aUNBQ0QsQ0FBQTs0QkFDRixDQUFDO3dCQUNGLENBQUM7d0JBQ0QsSUFDQyxTQUFTLENBQUMsTUFBTTs0QkFDZixJQUFJLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCOzRCQUN0RSxzQkFBc0I7Z0NBQ3JCLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw4QkFBOEIsRUFDcEUsQ0FBQzs0QkFDRixpRkFBaUY7NEJBQ2pGLElBQ0MsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLHlCQUF5QixDQUNoRSxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDeEIsRUFDQSxDQUFDO2dDQUNGLE9BQU87b0NBQ04sTUFBTSxFQUFFLFlBQVk7b0NBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNuQixtQkFBbUIsRUFDbkIsc0NBQXNDLEVBQ3RDLGlCQUFpQixDQUNqQjtpQ0FDRCxDQUFBOzRCQUNGLENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO29CQUNELE9BQU8sU0FBUyxDQUFBO2dCQUNqQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO3dCQUM1QixPQUFPOzRCQUNOLE1BQU0sRUFBRSxZQUFZOzRCQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbkIsb0JBQW9CLEVBQ3BCLHVDQUF1QyxFQUN2QyxpQkFBaUIsQ0FDakI7eUJBQ0QsQ0FBQTtvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUVELDJCQUEyQjtpQkFDdEIsQ0FBQztnQkFDTCxJQUNDLFNBQVM7b0JBQ1QsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUM5RSxDQUFDO29CQUNGLE9BQU87d0JBQ04sTUFBTSxFQUFFLFlBQVk7d0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNuQixtQkFBbUIsRUFDbkIsc0NBQXNDLEVBQ3RDLGlCQUFpQixDQUNqQjtxQkFDRCxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLE1BQU07b0JBQ25DLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTTt3QkFDakIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDhCQUE4Qjt3QkFDcEUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQywrQkFBK0I7d0JBQ3ZFLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCO29CQUN2RSxDQUFDLENBQUMsSUFBSSxDQUFBO2dCQUNQLElBQUksV0FBVyxJQUFJLFNBQVMsQ0FBQyxlQUFlLG9EQUE0QyxFQUFFLENBQUM7b0JBQzFGLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQy9DLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLFdBQVcsQ0FDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDSiw0Q0FBNEM7b0JBQzVDLElBQ0Msc0JBQXNCO3dCQUN0QixzQkFBc0IsQ0FBQyxLQUFLO3dCQUM1QixJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUN0RSxDQUFDO3dCQUNGLE9BQU87NEJBQ04sTUFBTSxFQUFFLFlBQVk7NEJBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNuQixtQkFBbUIsRUFDbkIsc0NBQXNDLEVBQ3RDLGlCQUFpQixDQUNqQjt5QkFDRCxDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLFVBQXdCO1FBQ25ELElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyQixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUMxQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FDcEUsQ0FBQTtRQUNELElBQUksaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE9BQU8saUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sa0JBQWtCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO1FBQ3BGLE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUE7UUFFN0YsaURBQWlEO1FBQ2pELDRDQUE0QztRQUM1QyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFekYsSUFBSSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDckQsS0FBSyxNQUFNLGFBQWEsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDNUMsUUFBUSxhQUFhLEVBQUUsQ0FBQztvQkFDdkIsS0FBSyxJQUFJO3dCQUNSLDREQUE0RDt3QkFDNUQsSUFDQyxTQUFTLENBQUMsTUFBTTs0QkFDaEIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDhCQUE4QixFQUNuRSxDQUFDOzRCQUNGLE9BQU8sSUFBSSxDQUFBO3dCQUNaLENBQUM7d0JBQ0QsT0FBTyxLQUFLLENBQUE7b0JBQ2IsS0FBSyxXQUFXO3dCQUNmLGlEQUFpRDt3QkFDakQsSUFDQyxTQUFTLENBQUMsTUFBTTs0QkFDaEIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLCtCQUErQixFQUNwRSxDQUFDOzRCQUNGLE9BQU8sSUFBSSxDQUFBO3dCQUNaLENBQUM7d0JBQ0QsT0FBTyxLQUFLLENBQUE7b0JBQ2IsS0FBSyxLQUFLO3dCQUNULG9DQUFvQzt3QkFDcEMsSUFDQyxTQUFTLENBQUMsTUFBTTs0QkFDaEIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixFQUNqRSxDQUFDOzRCQUNGLE9BQU8sSUFBSSxDQUFBO3dCQUNaLENBQUM7d0JBQ0QsT0FBTyxLQUFLLENBQUE7Z0JBQ2QsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCLEVBQUUsQ0FBQztZQUN4RixTQUFTLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7Z0JBQ2pELEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFLENBQUM7b0JBQzVDLFFBQVEsYUFBYSxFQUFFLENBQUM7d0JBQ3ZCLEtBQUssV0FBVzs0QkFDZixnREFBZ0Q7NEJBQ2hELElBQ0MsU0FBUyxDQUFDLE1BQU07Z0NBQ2hCLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw4QkFBOEIsRUFDbkUsQ0FBQztnQ0FDRixPQUFPLElBQUksQ0FBQTs0QkFDWixDQUFDOzRCQUNELE9BQU8sS0FBSyxDQUFBO3dCQUNiLEtBQUssS0FBSzs0QkFDVCwwQ0FBMEM7NEJBQzFDLElBQ0MsU0FBUyxDQUFDLE1BQU07Z0NBQ2hCLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw4QkFBOEIsRUFDbkUsQ0FBQztnQ0FDRixPQUFPLElBQUksQ0FBQTs0QkFDWixDQUFDOzRCQUNELE9BQU8sS0FBSyxDQUFBO29CQUNkLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDdEYsU0FBUyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO2dCQUNqRCxLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUM1QyxRQUFRLGFBQWEsRUFBRSxDQUFDO3dCQUN2QixLQUFLLEtBQUs7NEJBQ1Qsb0NBQW9DOzRCQUNwQyxJQUNDLFNBQVMsQ0FBQyxNQUFNO2dDQUNoQixJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLEVBQ2pFLENBQUM7Z0NBQ0YsT0FBTyxJQUFJLENBQUE7NEJBQ1osQ0FBQzs0QkFDRCxPQUFPLEtBQUssQ0FBQTtvQkFDZCxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQywrQkFBK0IsRUFBRSxDQUFDO1lBQ3pGLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFDakQsS0FBSyxNQUFNLGFBQWEsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDNUMsUUFBUSxhQUFhLEVBQUUsQ0FBQzt3QkFDdkIsS0FBSyxLQUFLOzRCQUNULDJDQUEyQzs0QkFDM0MsSUFDQyxTQUFTLENBQUMsTUFBTTtnQ0FDaEIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLCtCQUErQixFQUNwRSxDQUFDO2dDQUNGLE9BQU8sSUFBSSxDQUFBOzRCQUNaLENBQUM7NEJBQ0QsT0FBTyxLQUFLLENBQUE7b0JBQ2QsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxTQUFTLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxTQUFvQjtRQUM3QyxJQUNDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3JELENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUNyRCxFQUNBLENBQUM7WUFDRix5Q0FBZ0M7UUFDakMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2hFLElBQUksS0FBSyx1Q0FBK0IsRUFBRSxDQUFDO2dCQUMxQyxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUM3RCxJQUFJLEtBQUssdUNBQStCLEVBQUUsQ0FBQztnQkFDMUMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBQ0QsMENBQWlDO0lBQ2xDLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQWUsRUFBRSxXQUFxQjtRQUMzRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsK0NBQStDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDOUUsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQWlCLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFxQixFQUFFLENBQUE7UUFDbEMsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEMsSUFBSSxXQUFXLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3pDLDBGQUEwRjtnQkFDMUYsU0FBUTtZQUNULENBQUM7WUFDRCxJQUNDLFNBQVMsQ0FBQyxTQUFTO2dCQUNuQixDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTTtnQkFDeEIsQ0FBQyxTQUFTLENBQUMsSUFBSSxpQ0FBeUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUM3RSxDQUFDO2dCQUNGLHlIQUF5SDtnQkFDekgsU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUM1QyxTQUFRO1lBQ1QsQ0FBQztZQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDbkYsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLE1BQU0sY0FBYyxHQUNuQixNQUFNLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQWExRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUc5QixtQ0FBbUMsRUFBRTtnQkFDdEMsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNO2FBQ25CLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUMzRixNQUFNLGlCQUFpQixHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQ2hFLEtBQUssRUFDTDtnQkFDQyxjQUFjO2dCQUNkLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFO2dCQUN4QyxpQkFBaUIsRUFBRSxJQUFJO2FBQ3ZCLEVBQ0QsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1lBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLENBQUMsa0NBQWtDLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUNqRSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUztRQUNkLE1BQU0sUUFBUSxHQUEyQixFQUFFLENBQUE7UUFDM0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNuQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQztvQkFDYixTQUFTLEVBQUUsU0FBUyxDQUFDLE9BQU87b0JBQzVCLE9BQU8sRUFBRTt3QkFDUixTQUFTLGlDQUF5Qjt3QkFDbEMsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLEtBQUssRUFBRSxtQkFBbUI7d0JBQzlELGVBQWUsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGtCQUFrQjt3QkFDOUUsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLEtBQUssRUFBRSxtQkFBbUI7d0JBQ3pELE9BQU8sRUFBRSxFQUFFLENBQUMsOENBQThDLENBQUMsRUFBRSxJQUFJLEVBQUU7cUJBQ25FO2lCQUNELENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLFdBQW1CLEVBQUUsVUFBbUI7UUFDMUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FDL0QsQ0FBQyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFDakMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEVBQ3BCLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtRQUNELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSw0QkFBNEIsRUFBRSxXQUFXLENBQUMsQ0FDOUUsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFBO1FBQy9ELE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQTtRQUNsQixLQUFLLE1BQU0sY0FBYyxJQUFJLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDbEUsSUFDQyxjQUFjLDJDQUEyQjtnQkFDekMsY0FBYywrQ0FBNkIsRUFDMUMsQ0FBQztnQkFDRixPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNaLEtBQUssRUFDSixjQUFjLCtDQUE2Qjt3QkFDMUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQzt3QkFDL0MsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQztvQkFDMUMsRUFBRSxFQUFFLGNBQWM7aUJBQ2xCLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDM0Isc0JBQXNCLEVBQ3RCLG9FQUFvRSxDQUNwRSxDQUFBO1lBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUMvQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQ3RELEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUN4QixDQUFBO1lBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE9BQU07WUFDUCxDQUFDO1lBQ0QsY0FBYyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUE7UUFDM0IsQ0FBQztRQUVELElBQUksY0FBYyxLQUFLLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNuRSxDQUFDO1lBQUEsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQzVELENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQ2pDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsRUFDcEMsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztZQUMxRCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxvQ0FBb0MsQ0FBQztZQUMzRSxjQUFjLEVBQUUsS0FBSztZQUNyQixnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLGFBQWEsRUFBRSxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7U0FDL0MsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FDaEMsRUFBRSxRQUFRLHdDQUErQixFQUFFLEVBQzNDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUNsQixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDbkYsTUFBTSxJQUFJLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLGdCQUFnQixDQUFDLE9BQU8sR0FBRyxjQUFjLCtDQUE2QixJQUFJLGNBQWMsK0NBQTZCLElBQUksY0FBYywyQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUE7WUFDdlAsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FDakMsZ0JBQWdCLEVBQ2hCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsZ0NBRXhELENBQUE7WUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUM1QixHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGtDQUFrQyxDQUFDLENBQ3RFLENBQUE7UUFDRixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsa0NBQWtDLENBQUMsT0FBNEI7UUFDNUUsTUFBTSxVQUFVLEdBQWlCLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FDdkIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQzdCLFVBQVUsQ0FBQyxrQ0FBa0MsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FDaEYsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQixvQ0FBb0MsRUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNwRCxDQUFBO1lBQ0QsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUVPLHlCQUF5QixDQUFDLFNBQVMsR0FBRyxLQUFLO1FBQ2xELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsbUJBQW1CO2FBQ3RCLE9BQU8sQ0FDUCxLQUFLLElBQUksRUFBRTtZQUNWLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsQ0FBQztnQkFDdEMsTUFBTSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7WUFDN0IsQ0FBQztZQUNELElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1FBQ2pDLENBQUMsRUFDRCxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQzlDO2FBQ0EsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDO1lBQ2pGLE9BQU8sSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBLENBQUMsU0FBUztRQUNwQyxDQUFDO1FBQ0QsT0FBTyw0QkFBMEIsQ0FBQyxvQkFBb0IsQ0FBQTtJQUN2RCxDQUFDO0lBRU8sOEJBQThCO1FBQ3JDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqRyxDQUFDO0lBRU8sS0FBSyxDQUFDLDJCQUEyQjtRQUN4QyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDekQsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUNyQixRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUNyRixDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLDJCQUEyQjtRQUN4QyxNQUFNLEtBQUssR0FBcUIsRUFBRSxDQUFBO1FBQ2xDLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BDLElBQUksU0FBUyxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLE1BQU0sSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDeEYsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDcEUsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixNQUFNLGlCQUFpQixHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQ2hFLEtBQUssRUFDTCxpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7WUFDRCxJQUFJLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixNQUFNLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQ2pFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0I7UUFDakMsTUFBTSxRQUFRLEdBQWlCLEVBQUUsQ0FBQTtRQUNqQyxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ25GLFNBQVE7WUFDVCxDQUFDO1lBQ0QsSUFBSSxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUN4RCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUMzRixTQUFRO1lBQ1QsQ0FBQztZQUNELFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDekIsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUMvQyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQ3JCLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNsQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2hFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FDbEIsQ0FBQyxFQUNELENBQUMsQ0FBQyxLQUFLLEVBQUUsVUFBVTtnQkFDbEIsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRTtnQkFDcEQsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLENBQ3JCLENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO0lBQ3pFLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNoRixDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLFFBQVEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdkMsbUVBQW9DO1lBQ3BDLDZDQUEwQjtZQUMxQix5Q0FBd0I7WUFDeEIsa0NBQW9CLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFBO2dCQUM5RCxJQUFJLE9BQU8sSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ3RDLE9BQU87d0JBQ04sT0FBTzt3QkFDUCxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVM7NEJBQzlDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxFQUFFOzRCQUNuRSxDQUFDLENBQUMsU0FBUztxQkFDWixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxTQUFxQjtRQUN0RCxJQUFJLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxFQUFFLENBQUM7WUFDaEQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFFakQsSUFBSSxlQUFlLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDL0IsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtZQUNwRSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUN6RCxJQUFJLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNsRCxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFDRCxJQUNDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO2dCQUN6RCxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLEVBQ2xELENBQUM7Z0JBQ0YsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQTtRQUMzRSxJQUFJLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDbEYsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxlQUFlLEtBQUssdUJBQXVCLEVBQUUsQ0FBQztZQUNqRCxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDM0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxTQUFxQjtRQUN2RCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3pCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDekUsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUMzRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ2hELE9BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFFBQVEsR0FDYixTQUFTLFlBQVksU0FBUztnQkFDN0IsQ0FBQyxDQUFDLE1BQU0sU0FBUyxDQUFDLGtCQUFrQixFQUFFO2dCQUN0QyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3BGLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDO2dCQUMzQyxPQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLHlCQUF5QixFQUN6QixtSEFBbUgsRUFDbkgsU0FBUyxDQUFDLFdBQVcsQ0FDckIsQ0FBQTtJQUNGLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxvQkFBeUM7UUFDL0QsSUFBSSxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1lBQ3BDLElBQUksMEJBQTBCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztnQkFDM0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsQ0FBQyxDQUFBO1lBQ3pFLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDbEUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVPLCtCQUErQixDQUFDLFNBQWlCO1FBQ3hELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFDL0QsT0FBTyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVELEtBQUssQ0FBQyw2QkFBNkIsQ0FDbEMsb0JBQXlDLEVBQ3pDLE1BQWU7UUFFZixJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7WUFDaEMsSUFBSSxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUE7WUFDOUQsQ0FBQztZQUNELE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUE7WUFDM0UsTUFBTSxXQUFXLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUNwRSxNQUFNLGNBQWMsR0FBRyw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDeEUsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixJQUFJLGNBQWMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUMzQiw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUN2RCxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksY0FBYyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzNCLDRCQUE0QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDL0MsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsK0JBQStCLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtZQUNsRSxJQUFJLE1BQU0sSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3pFLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUU7b0JBQ2hGLE1BQU0sRUFBRSxLQUFLO2lCQUNiLENBQUMsQ0FBQTtZQUNILENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtZQUN6RSxJQUFJLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksMEJBQTBCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztvQkFDM0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsQ0FBQyxDQUFBO2dCQUN6RSxDQUFDO2dCQUNELG9CQUFvQixHQUFHLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFBO2dCQUN6RCxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLE1BQU0sRUFBRSxDQUFDO29CQUNsRSxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUNaLDJCQUEyQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO29CQUN2RCxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSwyQkFBMkIsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDOzRCQUNoRSwyQkFBMkIsQ0FBQyxNQUFNLENBQ2pDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxFQUN6RCxDQUFDLENBQ0QsQ0FBQTt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLENBQUMsOEJBQThCLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFDaEUsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxvQkFBb0IsRUFBRSxDQUFDO3dCQUN4RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDdkIsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ3BFLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUNoRSxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQzVDLENBQUE7Z0JBQ0QsTUFBTSw2QkFBNkIsR0FBRywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ3ZGLE1BQU0sOEJBQThCLEdBQUcsMkJBQTJCLENBQUMsUUFBUSxDQUMxRSxJQUFJLFdBQVcsRUFBRSxDQUNqQixDQUFBO2dCQUVELElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osSUFBSSw4QkFBOEIsRUFBRSxDQUFDO3dCQUNwQywyQkFBMkIsQ0FBQyxNQUFNLENBQ2pDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLEVBQ3RELENBQUMsQ0FDRCxDQUFBO29CQUNGLENBQUM7b0JBQ0QsSUFBSSw2QkFBNkIsRUFBRSxDQUFDO3dCQUNuQyxJQUFJLDZCQUE2QixFQUFFLENBQUM7NEJBQ25DLDJCQUEyQixDQUFDLE1BQU0sQ0FDakMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUNoRCxDQUFDLENBQ0QsQ0FBQTt3QkFDRixDQUFDO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQzs0QkFDcEMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO3dCQUM5QyxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCx1QkFBdUI7cUJBQ2xCLENBQUM7b0JBQ0wsSUFBSSw2QkFBNkIsRUFBRSxDQUFDO3dCQUNuQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO29CQUN4RixDQUFDO29CQUNELElBQUksNkJBQTZCLEVBQUUsQ0FBQzt3QkFDbkMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7NEJBQ3JDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUE7d0JBQ3BELENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksOEJBQThCLEVBQUUsQ0FBQzs0QkFDcEMsMkJBQTJCLENBQUMsTUFBTSxDQUNqQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxFQUN0RCxDQUFDLENBQ0QsQ0FBQTt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLENBQUMsOEJBQThCLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUMxQyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUM1QixDQUFDO0lBQ0YsQ0FBQztJQUVPLDZDQUE2QztRQUNwRCxJQUNDLElBQUksQ0FBQyxnQ0FBZ0M7WUFDcEMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLENBQUMsNERBQTREO1lBQ3hHLElBQUksQ0FBQyxpQ0FBaUM7Z0JBQ3JDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxDQUFDLDREQUE0RCxFQUN4RyxDQUFDO1lBQ0YsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2pFLE1BQU0sT0FBTyxHQUFHLENBQUMsVUFBd0IsRUFBa0IsRUFBRTtnQkFDNUQsTUFBTSxnQkFBZ0IsR0FBaUIsRUFBRSxDQUFBO2dCQUN6QyxNQUFNLG1CQUFtQixHQUFpQixFQUFFLENBQUE7Z0JBQzVDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ3BDLElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7d0JBQy9DLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDakMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDcEMsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1lBQy9DLENBQUMsQ0FBQTtZQUVELE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxzQkFBc0IsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUM3RSxJQUFJLENBQUMsaUNBQWlDLEdBQUcsU0FBUyxDQUFBO1lBQ2xELElBQUksQ0FBQyxrQ0FBa0MsR0FBRyxTQUFTLENBQUE7WUFDbkQsTUFBTSxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBRXZFLEtBQUssTUFBTSxDQUFDLElBQUksbUJBQW1CLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQzNDLElBQUksbUJBQW1CLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3RDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQztZQUNELEtBQUssTUFBTSxDQUFDLElBQUksc0JBQXNCLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQzlDLElBQUksZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFxQjtRQUNyQyxJQUFJLENBQUMsQ0FBQyxTQUFTLFlBQVksU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxPQUFPLElBQUksY0FBYyxFQUFFLENBQUMsVUFBVSxDQUNyQyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDBDQUEwQyxDQUFDLENBQzVFLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDM0IsT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FDckMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsK0NBQStDLENBQUMsQ0FDMUUsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxFQUFFLENBQUM7WUFDaEQsT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FDckMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsK0NBQStDLENBQUMsQ0FDM0UsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2QixJQUNDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRO2dCQUMzQixDQUFDLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLDJCQUEyQixFQUFFLENBQUMsRUFBRSxZQUFZO3FCQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQzdCLENBQUM7Z0JBQ0YsT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FDckMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsK0JBQStCLENBQUMsQ0FDM0QsQ0FBQTtZQUNGLENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZTtnQkFDdkMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztnQkFDMUQsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUNaLElBQUksV0FBVyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMxQixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZ0JBQWdCO2dCQUN6QyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7Z0JBQzNELENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDWixJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWE7Z0JBQ25DLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7Z0JBQ3hELENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDWixJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDeEIsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQsT0FBTyxDQUNOLFdBQVc7Z0JBQ1gsWUFBWTtnQkFDWixTQUFTO2dCQUNULElBQUksY0FBYyxFQUFFLENBQUMsVUFBVSxDQUM5QixHQUFHLENBQUMsUUFBUSxDQUNYLHFCQUFxQixFQUNyQiwrRUFBK0UsRUFDL0UsU0FBUyxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FDaEQsQ0FDRCxDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsSUFDQyxTQUFTLENBQUMsaUJBQWlCO1lBQzNCLENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUN2RixDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FDckMsR0FBRyxDQUFDLFFBQVEsQ0FDWCxxQkFBcUIsRUFDckIsK0VBQStFLEVBQy9FLFNBQVMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ2hELENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUNaLEdBQThCLEVBQzlCLGlCQUEwQyxFQUFFLEVBQzVDLGdCQUE0QztRQUU1QyxJQUFJLFdBQXFFLENBQUE7UUFDekUsSUFBSSxTQUFpQyxDQUFBO1FBQ3JDLElBQUksT0FBaUQsQ0FBQTtRQUVyRCxJQUFJLEdBQUcsWUFBWSxHQUFHLEVBQUUsQ0FBQztZQUN4QixXQUFXLEdBQUcsR0FBRyxDQUFBO1FBQ2xCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxlQUEyQyxDQUFBO1lBQy9DLElBQUksT0FBc0MsQ0FBQTtZQUUxQyxnQkFBZ0I7WUFDaEIsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbkIsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEYsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQztvQkFDM0IsZUFBZSxHQUFHO3dCQUNqQixFQUFFLEVBQUUsR0FBRzt3QkFDUCxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87d0JBQy9CLFVBQVUsRUFBRSxjQUFjLENBQUMsd0JBQXdCLElBQUksSUFBSSxDQUFDLGlCQUFpQjtxQkFDN0UsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELHFCQUFxQjtpQkFDaEIsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLFNBQVMsR0FBRyxHQUFHLENBQUE7Z0JBQ2YsT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUE7Z0JBQ3JCLElBQUksY0FBYyxDQUFDLE9BQU8sSUFBSSxjQUFjLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDM0UsZUFBZSxHQUFHLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ25GLENBQUM7WUFDRixDQUFDO1lBQ0Qsc0JBQXNCO2lCQUNqQixJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUNoQyxTQUFTLEdBQUcsR0FBRyxDQUFBO2dCQUNmLFdBQVcsR0FBRyxHQUFHLENBQUMsaUJBQWlCLENBQUE7WUFDcEMsQ0FBQztZQUVELElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQ3JCLE1BQU0sY0FBYyxHQUFHLFNBQVMsRUFBRSxNQUFNO29CQUN2QyxDQUFDLENBQUMsTUFBTSxTQUFTLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLGlCQUFpQixFQUFFO29CQUN2RSxDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUNaLE9BQU8sR0FBRyxDQUNULE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQ3RDLENBQUMsZUFBZSxDQUFDLEVBQ2pCLEVBQUUsY0FBYyxFQUFFLEVBQ2xCLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FDRCxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNSLENBQUM7WUFFRCxJQUFJLENBQUMsU0FBUyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUMzQixTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDbkQsU0FBUyxFQUNULENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEVBQ3BDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUNsQyxTQUFTLEVBQ1QsU0FBUyxFQUNULE9BQU8sRUFDUCxTQUFTLENBQ1QsQ0FDQTtnQkFBWSxTQUFVLENBQUMsNEJBQTRCLENBQ25ELE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLDRCQUE0QixFQUFFLENBQ3BFLENBQUE7WUFDRixDQUFDO1lBRUQsSUFBSSxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsK0NBQStDLENBQUMsQ0FBQyxDQUFBO1lBQzVGLENBQUM7WUFFRCxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLHFDQUFxQztnQkFDckMsMEVBQTBFO2dCQUMxRSxJQUFJLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUN0QyxPQUFPLEdBQUcsRUFBRSxDQUFBO29CQUNaLE1BQU0sa0JBQWtCLEdBQ3ZCLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUNyRSxLQUFLLE1BQU0sZ0JBQWdCLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7d0JBQ3ZELElBQ0Msa0JBQWtCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQzs0QkFDcEQsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDbEMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQ25ELEVBQ0EsQ0FBQzs0QkFDRixPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO3dCQUN0QyxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCw0REFBNEQ7Z0JBQzVELCtEQUErRDtnQkFDL0QsaUVBQWlFO3FCQUM1RCxJQUFJLGNBQWMsQ0FBQyxNQUFNLElBQUksU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO29CQUNwRCxPQUFPLEdBQUcsRUFBRSxDQUFBO29CQUNaLElBQUksU0FBUyxDQUFDLGVBQWUsb0RBQTRDLEVBQUUsQ0FBQzt3QkFDM0UsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQ3hCLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFBO3dCQUNyRSxJQUFJLGlCQUFpQixFQUFFLENBQUM7NEJBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTt3QkFDaEMsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNkLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBYyxHQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQTt3QkFDaEUsTUFBTSxRQUFRLEdBQ2IsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTt3QkFDekUsTUFBTSxjQUFjLEdBQUcsUUFBUTs0QkFDOUIsQ0FBQyxDQUFDLHNDQUFzQyxDQUN0QyxRQUFRLHFFQUVSOzRCQUNGLENBQUMsQ0FBQyxTQUFTLENBQUE7d0JBQ1osTUFBTSxrQkFBa0IsR0FBRyxjQUFjOzRCQUN4QyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FDWixjQUFjLEVBQ2QsaURBQWlELEVBQ2pELGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FDekI7NEJBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTt3QkFDTCxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQzs0QkFDNUIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDM0IsbUJBQW1CLEVBQ25CLDRGQUE0RixFQUM1RixFQUFFLEVBQ0YsY0FBYyxDQUFDLE9BQU8sQ0FDdEIsQ0FBQTs0QkFDRCxNQUFNLElBQUksd0JBQXdCLENBQ2pDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLHlEQUVqRSxDQUFBO3dCQUNGLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUMzQixXQUFXLEVBQ1gsbUVBQW1FLEVBQ25FLEVBQUUsQ0FDRixDQUFBOzRCQUNELE1BQU0sSUFBSSx3QkFBd0IsQ0FDakMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8seURBRWpFLENBQUE7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO29CQUNELFdBQVcsR0FBRyxPQUFPLENBQUE7Z0JBQ3RCLENBQUM7Z0JBQ0QsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQzVCLGNBQWMsQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUE7Z0JBQzFDLENBQUM7Z0JBQ0QsSUFBSSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztvQkFDbEMsY0FBYyxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtnQkFDeEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxTQUFTLEdBQ2QsV0FBVyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUM7b0JBQzNDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUU7b0JBQzlDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxpQkFBaUIsNENBQXlCLENBQUE7Z0JBQzlFLE1BQU0sT0FBTyxHQUE2QixFQUFFLENBQUE7Z0JBQzVDLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1osS0FBSyxFQUNKLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLE1BQU07d0JBQzdFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNaLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDakUscUJBQXFCLENBQ3JCO3dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNaLEVBQUUsR0FBRyxFQUFFLDhCQUE4QixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDM0UsNkJBQTZCLEVBQzdCLGNBQWMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUNuQztvQkFDSixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtpQkFDZixDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNaLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQzt3QkFDN0MsR0FBRyxFQUFFLEdBQUcsRUFBRTs0QkFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVUsQ0FBQyxDQUFBOzRCQUNyQixPQUFPLEtBQUssQ0FBQTt3QkFDYixDQUFDO3FCQUNELENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQVU7b0JBQ3ZELEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLG1CQUFtQixDQUFDO29CQUNqRSxPQUFPLEVBQUUsU0FBUzt3QkFDakIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQ1oseUJBQXlCLEVBQ3pCLHVEQUF1RCxFQUN2RCxTQUFTLENBQUMsV0FBVyxFQUNyQixTQUFTLENBQUMsb0JBQW9CLENBQzlCO3dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDBDQUEwQyxDQUFDO29CQUNqRixNQUFNLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUM7d0JBQzdDLENBQUMsQ0FBQyxjQUFjLENBQUMsYUFBYTt3QkFDOUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsTUFBTTtvQkFDdEMsWUFBWSxFQUFFLElBQUk7b0JBQ2xCLE9BQU87b0JBQ1AsUUFBUSxFQUFFLFNBQVM7d0JBQ2xCLENBQUMsQ0FBQzs0QkFDQSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxxQkFBcUIsQ0FBQzs0QkFDNUQsT0FBTyxFQUFFLElBQUk7eUJBQ2I7d0JBQ0YsQ0FBQyxDQUFDLFNBQVM7aUJBQ1osQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3BCLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFBO2dCQUM5QixDQUFDO2dCQUNELElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsY0FBYyxDQUFDLGVBQWUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUE7Z0JBQ3pELENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxXQUFXLFlBQVksR0FBRyxFQUFFLENBQUM7Z0JBQ2hDLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQy9CLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsRUFDdkQsZ0JBQWdCLENBQ2hCLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksU0FBUyxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ2pDLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQy9CLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FDSixJQUFJLENBQUMsMEJBQTBCLENBQUMsd0JBQXdCLENBQ3ZELFdBQWlDLEVBQ2pDLGNBQWMsQ0FDZCxFQUNGLGdCQUFnQixDQUNoQixDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUMvQixTQUFTLEVBQ1QsR0FBRyxFQUFFLENBQ0osSUFBSSxDQUFDLGtCQUFrQixDQUN0QixTQUFVLEVBQ1YsV0FBZ0MsRUFDaEMsY0FBYyxFQUNkLE9BQU8sQ0FDUCxFQUNGLGdCQUFnQixDQUNoQixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLDZCQUE2QixDQUFDLENBQUMsQ0FBQTtRQUN4RSxDQUFDO1FBRUQsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0IsSUFDQyxTQUFTLENBQUMsZUFBZSwrQ0FBc0M7Z0JBQy9ELFNBQVMsQ0FBQyxlQUFlLDZDQUFxQyxFQUM3RCxDQUFDO2dCQUNGLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNsQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO3dCQUMvQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxrQkFBa0IsQ0FBQzt3QkFDL0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3BCLHdCQUF3QixFQUN4QiwyQ0FBMkMsRUFDM0MsU0FBUyxDQUFDLFdBQVcsQ0FDckI7d0JBQ0QsTUFBTSxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDOzRCQUM3QyxDQUFDLENBQUMsY0FBYyxDQUFDLGFBQWE7NEJBQzlCLENBQUMsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLE1BQU07d0JBQ3RDLGFBQWEsRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQzs0QkFDcEQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQ1osRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNoRSxvQkFBb0IsQ0FDcEI7NEJBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQ1osRUFBRSxHQUFHLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUMxRSw0QkFBNEIsRUFDNUIsY0FBYyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQ25DO3FCQUNILENBQUMsQ0FBQTtvQkFDRixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO3dCQUN2QixNQUFNLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtvQkFDOUIsQ0FBQztnQkFDRixDQUFDO2dCQUNELE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FDdkIsU0FBUyxFQUNULFNBQVMsQ0FBQyxlQUFlLCtDQUFzQztvQkFDOUQsQ0FBQztvQkFDRCxDQUFDLHlDQUFnQyxDQUNsQyxDQUFBO1lBQ0YsQ0FBQztZQUNELE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FDcEIsU0FBcUIsRUFDckIsTUFBa0MsRUFDbEMsY0FBK0I7UUFFL0IsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMxQyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFBO1lBQzdCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7WUFDdkMsQ0FBQztZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3hCLFNBQVM7b0JBQ1IsQ0FDQyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQ3ZCLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUMzRCxpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQ0QsQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUE7WUFDbkIsQ0FBQztZQUNELElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN2QixPQUFPLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFO29CQUM5RSx3QkFBd0IsRUFBRSxLQUFLLENBQUMsVUFBVTtvQkFDMUMsR0FBRyxjQUFjO2lCQUNqQixDQUFDLENBQUE7WUFDSCxDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxNQUFNLENBQUMsMEJBQTBCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUNsRixJQUNDLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxjQUFjLENBQUMsRUFDeEYsQ0FBQztnQkFDRixNQUFNLElBQUksS0FBSyxDQUNkLEdBQUcsQ0FBQyxRQUFRLENBQ1gsY0FBYyxFQUNkLDZEQUE2RCxFQUM3RCxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FDdkIsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3RCxJQUFJLENBQUM7Z0JBQ0osT0FBTyxNQUFNLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0QsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksQ0FBQztvQkFDSixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQyxDQUFDO2dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7b0JBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUM3QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGNBQWMsQ0FBQyxTQUFxQjtRQUNuQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFxQjtRQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUN4QyxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFRLENBQUMsQ0FBQTtRQUM1QyxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6QixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDO1lBQ25DLEVBQUUsRUFBRSxNQUFNO1lBQ1YsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLE9BQU87WUFDbkMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNwQyxLQUFLLEVBQUUscUJBQXFCLElBQUksU0FBUyxDQUFDLFdBQVc7U0FDckQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FDWixVQUFxQyxFQUNyQyxlQUFnQztRQUVoQyxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xFLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFhO1FBQzVCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxLQUFLO1lBQ3hCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsTUFBTSxxQkFBcUIsR0FBNkIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN4RixLQUFLLE1BQU0sYUFBYSxJQUFJLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9GLElBQ0MsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNqQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsVUFBVSxDQUFDLENBQ25FLEVBQ0EsQ0FBQztnQkFDRixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFpQixFQUFFLENBQUE7UUFDbkMsS0FBSyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUNuRCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDbEIsU0FBUTtnQkFDVCxDQUFDO2dCQUNELElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDL0QsU0FBUTtnQkFDVCxDQUFDO2dCQUNELElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3JDLFNBQVE7Z0JBQ1QsQ0FBQztnQkFDRCxJQUNDLFNBQVMsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQzdDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUMzQyxFQUNBLENBQUM7b0JBQ0YsU0FBUTtnQkFDVCxDQUFDO2dCQUNELElBQ0MsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3JCLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUN6RSxFQUNBLENBQUM7b0JBQ0YsU0FBUTtnQkFDVCxDQUFDO2dCQUNELElBQ0MsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUNyRixDQUFDO29CQUNGLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3RCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtnQkFDdkQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7Z0JBQ2xELEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHFDQUFxQyxDQUFDO2dCQUNqRixJQUFJLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3RCLE9BQU8sRUFBRSxJQUFJLENBQUMsdURBQXVELENBQ3BFLFNBQVMsRUFDVCxVQUFVLENBQ1Y7Z0JBQ0QsT0FBTyxFQUFFO29CQUNSO3dCQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUM7d0JBQ3BELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO3FCQUNmO2lCQUNEO2dCQUNELFlBQVksRUFBRTtvQkFDYixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztpQkFDaEI7YUFDRCxDQUFDLENBQUE7WUFDRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQ3ZCO1lBQ0MsUUFBUSxxQ0FBNkI7WUFDckMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsNEJBQTRCLENBQUM7WUFDMUUsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUU7U0FDcEMsRUFDRCxHQUFHLEVBQUUsQ0FDSixJQUFJLENBQUMsMEJBQTBCO2FBQzdCLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDO2FBQzFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FDeEIsQ0FBQTtJQUNGLENBQUM7SUFFTywrQkFBK0IsQ0FDdEMsU0FBMEIsRUFDMUIsU0FBdUIsRUFDdkIsVUFBNkIsRUFBRTtRQUUvQixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNoRixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQTtRQUM3RCxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzQixNQUFNLGdCQUFnQixHQUFzQixFQUFFLENBQUE7WUFDOUMsS0FBSyxNQUFNLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDM0IsSUFDQyxDQUFDLENBQUMsS0FBSztvQkFDUCxDQUFDLENBQUMsQ0FBQyxTQUFTO29CQUNaLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQ25FLENBQUM7b0JBQ0YsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUM7WUFDRCxNQUFNLHNCQUFzQixHQUFzQixFQUFFLENBQUE7WUFDcEQsS0FBSyxNQUFNLGVBQWUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNoRCxzQkFBc0IsQ0FBQyxJQUFJLENBQzFCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQzVFLENBQUE7WUFDRixDQUFDO1lBQ0QsT0FBTyxDQUFDLEdBQUcsZ0JBQWdCLEVBQUUsR0FBRyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3hELENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFTyx1REFBdUQsQ0FDOUQsU0FBcUIsRUFDckIsVUFBd0I7UUFFeEIsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FDbEIsK0JBQStCLEVBQy9CLHlIQUF5SCxFQUN6SCxTQUFTLENBQUMsV0FBVyxFQUNyQixVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUN6QixDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLDZCQUE2QixFQUM3QixtSUFBbUksRUFDbkksU0FBUyxDQUFDLFdBQVcsRUFDckIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFDekIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FDekIsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLGtDQUFrQyxFQUNsQywwSUFBMEksRUFDMUksU0FBUyxDQUFDLFdBQVcsRUFDckIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFDekIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FDekIsQ0FBQTtJQUNGLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxTQUFxQjtRQUM3QyxPQUFPLFNBQVMsQ0FBQyxLQUFLO1lBQ3JCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQXFCO1FBQzNDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdEIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLFNBQVMsQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDNUQsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUU7Z0JBQ3JFLFVBQVUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVO2FBQ2pDLENBQUMsQ0FBQTtZQUNGLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRTtZQUM3Qix3QkFBd0IsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVO1lBQy9DLFVBQVUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVO1NBQ2pDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsNEJBQTRCLENBQUMsU0FBcUI7UUFDdkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFELElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNsQyxDQUFDO1lBQVksU0FBVSxDQUFDLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxxQ0FBcUMsQ0FDL0UsU0FBUyxDQUFDLEtBQUssRUFDZixJQUFJLENBQ0osQ0FBQTtZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQy9CLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUMzRCxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFDdkIsQ0FBQyxTQUFTLENBQ1YsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUVELEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxTQUFxQjtRQUM1RCxJQUNDLENBQUMsU0FBUyxDQUFDLEtBQUs7WUFDaEIsNEJBQTRCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7WUFDdEQsU0FBUyxDQUFDLFNBQVMsRUFDbEIsQ0FBQztZQUNGLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFBO1FBQy9ELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDaEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRTtZQUNoRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3pDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUNyRCxFQUFFLEtBQUssQ0FBQTtZQUNSLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsS0FBSyxtQkFBbUIsRUFBRSxDQUFDO2dCQUNoRSxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxxQkFBcUIsQ0FDMUQsS0FBSyxFQUNMLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQzdELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsTUFBTSxVQUFVLEdBQWlCLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsT0FBTyxVQUFVLENBQUE7SUFDbEIsQ0FBQztJQUVPLDBCQUEwQixDQUFDLFNBQTBCO1FBQzVELElBQUksU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQy9CLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLCtCQUErQixDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUM1RixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDOUYsQ0FBQztJQUVELEtBQUssQ0FBQyxxQ0FBcUMsQ0FDMUMsU0FBMEIsRUFDMUIsSUFBYTtRQUViLE1BQU0sZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFBO1FBQzdCLElBQUksU0FBUyxDQUFDLGVBQWUsS0FBSyxlQUFlLEVBQUUsQ0FBQztZQUNuRCxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRTtnQkFDM0UsZUFBZTthQUNmLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8sU0FBUyxDQUNoQixTQUFpQyxFQUNqQyxXQUEyQyxFQUMzQyxnQkFBNEM7UUFFNUMsTUFBTSxLQUFLLEdBQUcsU0FBUztZQUN0QixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FDWiw0QkFBNEIsRUFDNUIsZ0NBQWdDLEVBQ2hDLFNBQVMsQ0FBQyxXQUFXLENBQ3JCO1lBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUNuRSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQ3ZCO1lBQ0MsUUFBUSxFQUFFLGdCQUFnQix1Q0FBK0I7WUFDekQsS0FBSztTQUNMLEVBQ0QsS0FBSyxJQUFJLEVBQUU7WUFDVixJQUFJLENBQUM7Z0JBQ0osSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQy9CLENBQUM7Z0JBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxXQUFXLEVBQUUsQ0FBQTtnQkFDakMsT0FBTyxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDakUsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFBO29CQUNoRSw2RkFBNkY7b0JBQzdGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxlQUFlLENBQzVCLElBQVMsRUFDVCxjQUE4QjtRQUU5QixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEUsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ25ELGlCQUFpQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDbkMsRUFBRSxFQUFFLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQztTQUM1RCxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixjQUFjLEdBQUcsY0FBYyxJQUFJLEVBQUUsQ0FBQTtZQUNyQyxJQUFJLGlCQUFpQixDQUFDLGFBQWEsS0FBSyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzFELGNBQWMsQ0FBQyxNQUFNO29CQUNwQixpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDdkYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGNBQWMsQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUE7WUFDMUMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRU8sa0JBQWtCLENBQ3pCLFNBQXFCLEVBQ3JCLE9BQTBCLEVBQzFCLGNBQXVDLEVBQ3ZDLE9BQWlEO1FBRWpELGNBQWMsR0FBRyxjQUFjLElBQUksRUFBRSxDQUFBO1FBQ3JDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDN0YsSUFBSSxTQUFTLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakMsY0FBYyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUN4RCxjQUFjLENBQUMsU0FBUyxrQ0FBMEIsQ0FBQTtZQUNsRCxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FDdkQsT0FBTyxFQUNQLFNBQVMsQ0FBQyxLQUFLLEVBQ2YsY0FBYyxDQUNkLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDNUYsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsNEJBQTRCLENBQ3pDLFVBQWdDO1FBRWhDLElBQUksa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNsRCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUMvQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDekIsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUNwQixLQUFLLENBQUMsTUFBTSxDQUNYLElBQUksQ0FBQyxRQUFRLEVBQ2IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FDekYsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELGtCQUFrQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDaEcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDekIseUJBQXlCO1lBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBQ0QsT0FBTyxrQkFBa0IsQ0FBQTtJQUMxQixDQUFDO0lBRU8sS0FBSyxDQUFDLDJCQUEyQixDQUFDLFNBQXFCO1FBQzlELElBQ0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMzQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUNqRSxFQUNBLENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQ0MsQ0FBQyxTQUFTLENBQUMsS0FBSztZQUNoQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQzlFLENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDaEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtnQkFDbkUsSUFBSSxDQUFDO29CQUNKLElBQ0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMzQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUNqRSxFQUNBLENBQUM7d0JBQ0YsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO3dCQUNwQixDQUFDLEVBQUUsQ0FBQTtvQkFDSixDQUFDO2dCQUNGLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNULENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLHNCQUFzQixDQUM3QixVQUF3QixFQUN4QixlQUFnQztRQUVoQyxNQUFNLE1BQU0sR0FDWCxlQUFlLDZDQUFvQztZQUNuRCxlQUFlLDhDQUFxQyxDQUFBO1FBQ3JELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLGtDQUFrQyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FDdkUsVUFBVSxFQUNWLElBQUksQ0FBQyxLQUFLLEVBQ1YsZUFBZSxFQUNmLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQ2xDLENBQUE7WUFDRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FDaEMsVUFBVSxFQUNWLGtDQUFrQyxFQUNsQyxlQUFlLENBQ2YsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQ3JELFVBQVUsRUFDVixJQUFJLENBQUMsS0FBSyxFQUNWLGVBQWUsRUFDZixFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUNuQyxDQUFBO1lBQ0QsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQ2pGLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ25FLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHFCQUFxQixDQUNsQyxVQUF3QixFQUN4QixlQUE2QixFQUM3QixlQUFnQztRQUVoQyxNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQUcsVUFBVSxFQUFFLEdBQUcsZUFBZSxDQUFDLENBQUE7UUFDekQsTUFBTSxNQUFNLEdBQ1gsZUFBZSw2Q0FBb0M7WUFDbkQsZUFBZSw4Q0FBcUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNwQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzNGLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN2QixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQzt3QkFDbEQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsbUNBQW1DLENBQUM7d0JBQzdFLElBQUksRUFBRSxRQUFRLENBQUMsT0FBTzt3QkFDdEIsT0FBTyxFQUFFLElBQUksQ0FBQyx1Q0FBdUMsQ0FDcEQsU0FBUyxFQUNULGFBQWEsRUFDYixVQUFVLENBQ1Y7d0JBQ0QsT0FBTyxFQUFFOzRCQUNSO2dDQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUM7Z0NBQ2pELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJOzZCQUNmO3lCQUNEO3dCQUNELFlBQVksRUFBRTs0QkFDYixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSzt5QkFDaEI7cUJBQ0QsQ0FBQyxDQUFBO29CQUNGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDYixNQUFNLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtvQkFDOUIsQ0FBQztvQkFDRCxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFDM0UsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRU8sd0JBQXdCLENBQy9CLFVBQXdCLEVBQ3hCLFNBQXVCLEVBQ3ZCLGVBQWdDLEVBQ2hDLE9BQWlELEVBQ2pELFVBQXdCLEVBQUU7UUFFMUIsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25FLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLEtBQUssTUFBTSxTQUFTLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDeEIsQ0FBQztZQUNELE1BQU0sMkJBQTJCLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMxRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDL0IsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztnQkFDRCxNQUFNLE1BQU0sR0FDWCxlQUFlLDZDQUFvQztvQkFDbkQsZUFBZSw4Q0FBcUMsQ0FBQTtnQkFDckQsTUFBTSxrQkFBa0IsR0FDdkIsQ0FBQyxDQUFDLGVBQWUsNkNBQW9DO29CQUNyRCxDQUFDLENBQUMsZUFBZSw4Q0FBcUMsQ0FBQTtnQkFDdkQsSUFBSSxNQUFNLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztvQkFDbkMsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztnQkFDRCxPQUFPLENBQ04sQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksd0ZBQXdGO29CQUNwSCxDQUFDLE9BQU8sQ0FBQyxZQUFZLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDdEMsVUFBVSxDQUFDLElBQUksQ0FDZCxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQ2IsQ0FBQyxPQUFPLENBQUMsWUFBWTt3QkFDcEIsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7d0JBQzlFLENBQUMsT0FBTyxDQUFDLElBQUk7NEJBQ1osU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FDaEYsQ0FDRCxDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDRixJQUFJLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN4QywyQkFBMkIsQ0FBQyxJQUFJLENBQy9CLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUMvQiwyQkFBMkIsRUFDM0IsU0FBUyxFQUNULGVBQWUsRUFDZixPQUFPLEVBQ1AsT0FBTyxDQUNQLENBQ0QsQ0FBQTtZQUNGLENBQUM7WUFDRCxPQUFPLDJCQUEyQixDQUFBO1FBQ25DLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFTyw2QkFBNkIsQ0FDcEMsU0FBcUIsRUFDckIsbUJBQWlDLEVBQ2pDLFNBQXVCO1FBRXZCLE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdCLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNyQixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO2dCQUNsRixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxJQUFJLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDbEMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzlDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FDNUMsQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sdUNBQXVDLENBQzlDLFNBQXFCLEVBQ3JCLHFCQUFtQyxFQUNuQyxVQUF3QjtRQUV4QixLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcscUJBQXFCLENBQUMsRUFBRSxDQUFDO1lBQ3ZELE1BQU0sd0JBQXdCLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3hELENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUNwRSxDQUFBO1lBQ0QsSUFBSSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxJQUFJLENBQUMsb0RBQW9ELENBQy9ELENBQUMsRUFDRCx3QkFBd0IsQ0FDeEIsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRU8sb0RBQW9ELENBQzNELFNBQXFCLEVBQ3JCLFVBQXdCO1FBRXhCLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLHNCQUFzQixFQUN0QixxSEFBcUgsRUFDckgsU0FBUyxDQUFDLFdBQVcsRUFDckIsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FDekIsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUNsQixvQkFBb0IsRUFDcEIsK0hBQStILEVBQy9ILFNBQVMsQ0FBQyxXQUFXLEVBQ3JCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQ3pCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQ3pCLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUNsQix5QkFBeUIsRUFDekIsc0lBQXNJLEVBQ3RJLFNBQVMsQ0FBQyxXQUFXLEVBQ3JCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQ3pCLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQ3pCLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWUsQ0FDNUIsVUFBd0IsRUFDeEIsZUFBZ0M7UUFFaEMsT0FBTyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQ3pELFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFNLENBQUMsRUFDL0IsZUFBZSxDQUNmLENBQUE7SUFDRixDQUFDO0lBTU8sOEJBQThCO1FBQ3JDLElBQ0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ2xCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxzQ0FBOEIsSUFBSSxDQUFDLENBQUMsS0FBSyx3Q0FBZ0MsQ0FDdkYsRUFDQSxDQUFDO1lBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsWUFBWSxDQUNoQixFQUFFLFFBQVEscUNBQTZCLEVBQUUsRUFDekMsR0FBRyxFQUFFLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQ2xFLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFBO1lBQzFCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZLENBQUksT0FBeUIsRUFBRSxJQUFzQjtRQUN4RSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxNQUFNLGNBQWMsR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQzVELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ3pDLElBQUksQ0FBQztnQkFDSixPQUFPLE1BQU0sY0FBYyxDQUFBO1lBQzVCLENBQUM7b0JBQVMsQ0FBQztnQkFDVixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDMUQsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUN0QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLE9BQU8sQ0FBQyxHQUFRO1FBQ3ZCLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFMUMsSUFDQyw4RUFBOEUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQzNGLENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFNBQVMsQ0FBQyxHQUFRLEVBQUUsT0FBeUI7UUFDNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDNUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxHQUFRO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFbkQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFNUIsSUFBSSxDQUFDLFVBQVUsRUFBRTthQUNmLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDckIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ3BDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FDeEQsQ0FBQTtZQUNELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsQ0FBQztnQkFBQSxDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FDdEMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUNyQixFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFDakIsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1lBQ0YsQ0FBQztZQUNELElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDeEMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDLENBQUM7YUFDRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxPQUFPLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLE1BQU0sQ0FDbEQsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUM1QyxDQUFBO0lBQ0YsQ0FBQztJQUVELDhCQUE4QjtRQUM3QixJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO1lBQ3JFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLFdBQVcsQ0FBQTtZQUNuQixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixZQUFZO1FBQ2IsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVPLDhCQUE4QixDQUFDLDJCQUFxQztRQUMzRSxJQUFJLENBQUMsZ0NBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFHRCxJQUFZLGdDQUFnQztRQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLGlDQUFpQyxHQUFHLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxDQUFBO1FBQ3BGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsSUFBWSxnQ0FBZ0MsQ0FBQyxnQ0FBd0M7UUFDcEYsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLEtBQUssZ0NBQWdDLEVBQUUsQ0FBQztZQUNoRixJQUFJLENBQUMsaUNBQWlDLEdBQUcsZ0NBQWdDLENBQUE7WUFDekUsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7UUFDM0UsQ0FBQztJQUNGLENBQUM7SUFFTyxtQ0FBbUM7UUFDMUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIscUNBQTRCLElBQUksQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFFTyxtQ0FBbUMsQ0FBQyxLQUFhO1FBQ3hELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QiwwQkFBMEIsRUFDMUIsS0FBSyxnRUFHTCxDQUFBO0lBQ0YsQ0FBQztJQUVELCtCQUErQjtRQUM5QixJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO1lBQ3RFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLFdBQVcsQ0FBQTtZQUNuQixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixZQUFZO1FBQ2IsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVPLCtCQUErQixDQUFDLDRCQUFzQztRQUM3RSxJQUFJLENBQUMsaUNBQWlDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO0lBQ3RGLENBQUM7SUFHRCxJQUFZLGlDQUFpQztRQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLGtDQUFrQyxHQUFHLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxDQUFBO1FBQ3RGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsSUFBWSxpQ0FBaUMsQ0FBQyxpQ0FBeUM7UUFDdEYsSUFBSSxJQUFJLENBQUMsaUNBQWlDLEtBQUssaUNBQWlDLEVBQUUsQ0FBQztZQUNsRixJQUFJLENBQUMsa0NBQWtDLEdBQUcsaUNBQWlDLENBQUE7WUFDM0UsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7UUFDN0UsQ0FBQztJQUNGLENBQUM7SUFFTyxvQ0FBb0M7UUFDM0MsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MscUNBQTRCLElBQUksQ0FBQyxDQUFBO0lBQ2pHLENBQUM7SUFFTyxvQ0FBb0MsQ0FBQyxLQUFhO1FBQ3pELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixnQ0FBZ0MsRUFDaEMsS0FBSyxnRUFHTCxDQUFBO0lBQ0YsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1lBQ2hFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLFdBQVcsQ0FBQTtZQUNuQixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixZQUFZO1FBQ2IsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVPLHlCQUF5QixDQUFDLHNCQUFnQztRQUNqRSxJQUFJLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFHRCxJQUFZLDJCQUEyQjtRQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO1FBQzFFLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsSUFBWSwyQkFBMkIsQ0FBQywyQkFBbUM7UUFDMUUsSUFBSSxJQUFJLENBQUMsMkJBQTJCLEtBQUssMkJBQTJCLEVBQUUsQ0FBQztZQUN0RSxJQUFJLENBQUMsNEJBQTRCLEdBQUcsMkJBQTJCLENBQUE7WUFDL0QsSUFBSSxDQUFDLDhCQUE4QixDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDakUsQ0FBQztJQUNGLENBQUM7SUFFTyw4QkFBOEI7UUFDckMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDN0Isc0NBQXNDLGdDQUV0QyxJQUFJLENBQ0osQ0FBQTtJQUNGLENBQUM7SUFFTyw4QkFBOEIsQ0FBQyxLQUFhO1FBQ25ELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixzQ0FBc0MsRUFDdEMsS0FBSywyREFHTCxDQUFBO0lBQ0YsQ0FBQzs7QUFuc0dXLDBCQUEwQjtJQXlDcEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsb0NBQW9DLENBQUE7SUFFcEMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGdDQUFnQyxDQUFBO0lBRWhDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxvQ0FBb0MsQ0FBQTtJQUVwQyxZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsZ0JBQWdCLENBQUE7SUFDaEIsWUFBQSxpQ0FBaUMsQ0FBQTtJQUVqQyxZQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFlBQUEsbUNBQW1DLENBQUE7SUFFbkMsWUFBQSx3QkFBd0IsQ0FBQTtJQUN4QixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxtQ0FBbUMsQ0FBQTtJQUVuQyxZQUFBLFdBQVcsQ0FBQTtJQUNYLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsWUFBWSxDQUFBO0lBQ1osWUFBQSx1QkFBdUIsQ0FBQTtJQUN2QixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSw4QkFBOEIsQ0FBQTtJQUU5QixZQUFBLGNBQWMsQ0FBQTtJQUNkLFlBQUEsbUJBQW1CLENBQUE7SUFDbkIsWUFBQSx3QkFBd0IsQ0FBQTtJQUN4QixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLHlCQUF5QixDQUFBO0dBbEZmLDBCQUEwQixDQW9zR3RDIn0=