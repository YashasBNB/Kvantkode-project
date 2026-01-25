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
import { distinct } from '../../../base/common/arrays.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError, getErrorMessage, isCancellationError, } from '../../../base/common/errors.js';
import { isWeb, platform } from '../../../base/common/platform.js';
import { arch } from '../../../base/common/process.js';
import { isBoolean, isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { isOfflineError, } from '../../../base/parts/request/common/request.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { getTargetPlatform, isNotWebExtensionInWebTargetPlatform, isTargetPlatformCompatible, toTargetPlatform, WEB_EXTENSION_TAG, ExtensionGalleryError, UseUnpkgResourceApiConfigKey, IAllowedExtensionsService, EXTENSION_IDENTIFIER_REGEX, } from './extensionManagement.js';
import { adoptToGalleryExtensionId, areSameExtensions, getGalleryExtensionId, getGalleryExtensionTelemetryData, } from './extensionManagementUtil.js';
import { areApiProposalsCompatible, isEngineValid, } from '../../extensions/common/extensionValidator.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, asTextOrError, IRequestService, isSuccess } from '../../request/common/request.js';
import { resolveMarketplaceHeaders } from '../../externalServices/common/marketplace.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { format2 } from '../../../base/common/strings.js';
import { getExtensionGalleryManifestResourceUri, IExtensionGalleryManifestService, } from './extensionGalleryManifest.js';
const CURRENT_TARGET_PLATFORM = isWeb ? "web" /* TargetPlatform.WEB */ : getTargetPlatform(platform, arch);
const SEARCH_ACTIVITY_HEADER_NAME = 'X-Market-Search-Activity-Id';
const ACTIVITY_HEADER_NAME = 'Activityid';
const SERVER_HEADER_NAME = 'Server';
const END_END_ID_HEADER_NAME = 'X-Vss-E2eid';
const AssetType = {
    Icon: 'Microsoft.VisualStudio.Services.Icons.Default',
    Details: 'Microsoft.VisualStudio.Services.Content.Details',
    Changelog: 'Microsoft.VisualStudio.Services.Content.Changelog',
    Manifest: 'Microsoft.VisualStudio.Code.Manifest',
    VSIX: 'Microsoft.VisualStudio.Services.VSIXPackage',
    License: 'Microsoft.VisualStudio.Services.Content.License',
    Repository: 'Microsoft.VisualStudio.Services.Links.Source',
    Signature: 'Microsoft.VisualStudio.Services.VsixSignature',
};
const PropertyType = {
    Dependency: 'Microsoft.VisualStudio.Code.ExtensionDependencies',
    ExtensionPack: 'Microsoft.VisualStudio.Code.ExtensionPack',
    Engine: 'Microsoft.VisualStudio.Code.Engine',
    PreRelease: 'Microsoft.VisualStudio.Code.PreRelease',
    EnabledApiProposals: 'Microsoft.VisualStudio.Code.EnabledApiProposals',
    LocalizedLanguages: 'Microsoft.VisualStudio.Code.LocalizedLanguages',
    WebExtension: 'Microsoft.VisualStudio.Code.WebExtension',
    SponsorLink: 'Microsoft.VisualStudio.Code.SponsorLink',
    SupportLink: 'Microsoft.VisualStudio.Services.Links.Support',
    ExecutesCode: 'Microsoft.VisualStudio.Code.ExecutesCode',
    Private: 'PrivateMarketplace',
};
const DefaultPageSize = 10;
const DefaultQueryState = {
    pageNumber: 1,
    pageSize: DefaultPageSize,
    sortBy: "NoneOrRelevance" /* SortBy.NoneOrRelevance */,
    sortOrder: 0 /* SortOrder.Default */,
    flags: [],
    criteria: [],
    assetTypes: [],
};
var VersionKind;
(function (VersionKind) {
    VersionKind[VersionKind["Release"] = 0] = "Release";
    VersionKind[VersionKind["Prerelease"] = 1] = "Prerelease";
    VersionKind[VersionKind["Latest"] = 2] = "Latest";
})(VersionKind || (VersionKind = {}));
class Query {
    constructor(state = DefaultQueryState) {
        this.state = state;
    }
    get pageNumber() {
        return this.state.pageNumber;
    }
    get pageSize() {
        return this.state.pageSize;
    }
    get sortBy() {
        return this.state.sortBy;
    }
    get sortOrder() {
        return this.state.sortOrder;
    }
    get flags() {
        return this.state.flags;
    }
    get criteria() {
        return this.state.criteria;
    }
    get assetTypes() {
        return this.state.assetTypes;
    }
    get source() {
        return this.state.source;
    }
    get searchText() {
        const criterium = this.state.criteria.filter((criterium) => criterium.filterType === "SearchText" /* FilterType.SearchText */)[0];
        return criterium && criterium.value ? criterium.value : '';
    }
    withPage(pageNumber, pageSize = this.state.pageSize) {
        return new Query({ ...this.state, pageNumber, pageSize });
    }
    withFilter(filterType, ...values) {
        const criteria = [
            ...this.state.criteria,
            ...(values.length ? values.map((value) => ({ filterType, value })) : [{ filterType }]),
        ];
        return new Query({ ...this.state, criteria });
    }
    withSortBy(sortBy) {
        return new Query({ ...this.state, sortBy });
    }
    withSortOrder(sortOrder) {
        return new Query({ ...this.state, sortOrder });
    }
    withFlags(...flags) {
        return new Query({ ...this.state, flags: distinct(flags) });
    }
    withAssetTypes(...assetTypes) {
        return new Query({ ...this.state, assetTypes });
    }
    withSource(source) {
        return new Query({ ...this.state, source });
    }
}
function getStatistic(statistics, name) {
    const result = (statistics || []).filter((s) => s.statisticName === name)[0];
    return result ? result.value : 0;
}
function getCoreTranslationAssets(version) {
    const coreTranslationAssetPrefix = 'Microsoft.VisualStudio.Code.Translation.';
    const result = version.files.filter((f) => f.assetType.indexOf(coreTranslationAssetPrefix) === 0);
    return result.reduce((result, file) => {
        const asset = getVersionAsset(version, file.assetType);
        if (asset) {
            result.push([file.assetType.substring(coreTranslationAssetPrefix.length), asset]);
        }
        return result;
    }, []);
}
function getRepositoryAsset(version) {
    if (version.properties) {
        const results = version.properties.filter((p) => p.key === AssetType.Repository);
        const gitRegExp = new RegExp('((git|ssh|http(s)?)|(git@[\\w.]+))(:(//)?)([\\w.@:/\\-~]+)(.git)(/)?');
        const uri = results.filter((r) => gitRegExp.test(r.value))[0];
        return uri ? { uri: uri.value, fallbackUri: uri.value } : null;
    }
    return getVersionAsset(version, AssetType.Repository);
}
function getDownloadAsset(version) {
    return {
        // always use fallbackAssetUri for download asset to hit the Marketplace API so that downloads are counted
        uri: `${version.fallbackAssetUri}/${AssetType.VSIX}?redirect=true${version.targetPlatform ? `&targetPlatform=${version.targetPlatform}` : ''}`,
        fallbackUri: `${version.fallbackAssetUri}/${AssetType.VSIX}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`,
    };
}
function getVersionAsset(version, type) {
    const result = version.files.filter((f) => f.assetType === type)[0];
    return result
        ? {
            uri: `${version.assetUri}/${type}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`,
            fallbackUri: `${version.fallbackAssetUri}/${type}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`,
        }
        : null;
}
function getExtensions(version, property) {
    const values = version.properties ? version.properties.filter((p) => p.key === property) : [];
    const value = values.length > 0 && values[0].value;
    return value ? value.split(',').map((v) => adoptToGalleryExtensionId(v)) : [];
}
function getEngine(version) {
    const values = version.properties
        ? version.properties.filter((p) => p.key === PropertyType.Engine)
        : [];
    return (values.length > 0 && values[0].value) || '';
}
function isPreReleaseVersion(version) {
    const values = version.properties
        ? version.properties.filter((p) => p.key === PropertyType.PreRelease)
        : [];
    return values.length > 0 && values[0].value === 'true';
}
function isPrivateExtension(version) {
    const values = version.properties
        ? version.properties.filter((p) => p.key === PropertyType.Private)
        : [];
    return values.length > 0 && values[0].value === 'true';
}
function executesCode(version) {
    const values = version.properties
        ? version.properties.filter((p) => p.key === PropertyType.ExecutesCode)
        : [];
    return values.length > 0 ? values[0].value === 'true' : undefined;
}
function getEnabledApiProposals(version) {
    const values = version.properties
        ? version.properties.filter((p) => p.key === PropertyType.EnabledApiProposals)
        : [];
    const value = (values.length > 0 && values[0].value) || '';
    return value ? value.split(',') : [];
}
function getLocalizedLanguages(version) {
    const values = version.properties
        ? version.properties.filter((p) => p.key === PropertyType.LocalizedLanguages)
        : [];
    const value = (values.length > 0 && values[0].value) || '';
    return value ? value.split(',') : [];
}
function getSponsorLink(version) {
    return version.properties?.find((p) => p.key === PropertyType.SponsorLink)?.value;
}
function getSupportLink(version) {
    return version.properties?.find((p) => p.key === PropertyType.SupportLink)?.value;
}
function getIsPreview(flags) {
    return flags.indexOf('preview') !== -1;
}
function getTargetPlatformForExtensionVersion(version) {
    return version.targetPlatform
        ? toTargetPlatform(version.targetPlatform)
        : "undefined" /* TargetPlatform.UNDEFINED */;
}
function getAllTargetPlatforms(rawGalleryExtension) {
    const allTargetPlatforms = distinct(rawGalleryExtension.versions.map(getTargetPlatformForExtensionVersion));
    // Is a web extension only if it has WEB_EXTENSION_TAG
    const isWebExtension = !!rawGalleryExtension.tags?.includes(WEB_EXTENSION_TAG);
    // Include Web Target Platform only if it is a web extension
    const webTargetPlatformIndex = allTargetPlatforms.indexOf("web" /* TargetPlatform.WEB */);
    if (isWebExtension) {
        if (webTargetPlatformIndex === -1) {
            // Web extension but does not has web target platform -> add it
            allTargetPlatforms.push("web" /* TargetPlatform.WEB */);
        }
    }
    else {
        if (webTargetPlatformIndex !== -1) {
            // Not a web extension but has web target platform -> remove it
            allTargetPlatforms.splice(webTargetPlatformIndex, 1);
        }
    }
    return allTargetPlatforms;
}
export function sortExtensionVersions(versions, preferredTargetPlatform) {
    /* It is expected that versions from Marketplace are sorted by version. So we are just sorting by preferred targetPlatform */
    for (let index = 0; index < versions.length; index++) {
        const version = versions[index];
        if (version.version === versions[index - 1]?.version) {
            let insertionIndex = index;
            const versionTargetPlatform = getTargetPlatformForExtensionVersion(version);
            /* put it at the beginning */
            if (versionTargetPlatform === preferredTargetPlatform) {
                while (insertionIndex > 0 && versions[insertionIndex - 1].version === version.version) {
                    insertionIndex--;
                }
            }
            if (insertionIndex !== index) {
                versions.splice(index, 1);
                versions.splice(insertionIndex, 0, version);
            }
        }
    }
    return versions;
}
function setTelemetry(extension, index, querySource) {
    /* __GDPR__FRAGMENT__
    "GalleryExtensionTelemetryData2" : {
        "index" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
        "querySource": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "queryActivityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    }
    */
    extension.telemetryData = {
        index,
        querySource,
        queryActivityId: extension.queryContext?.[SEARCH_ACTIVITY_HEADER_NAME],
    };
}
function toExtension(galleryExtension, version, allTargetPlatforms, extensionGalleryManifest, queryContext) {
    const latestVersion = galleryExtension.versions[0];
    const assets = {
        manifest: getVersionAsset(version, AssetType.Manifest),
        readme: getVersionAsset(version, AssetType.Details),
        changelog: getVersionAsset(version, AssetType.Changelog),
        license: getVersionAsset(version, AssetType.License),
        repository: getRepositoryAsset(version),
        download: getDownloadAsset(version),
        icon: getVersionAsset(version, AssetType.Icon),
        signature: getVersionAsset(version, AssetType.Signature),
        coreTranslations: getCoreTranslationAssets(version),
    };
    const detailsViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionDetailsViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionDetailsViewUri */);
    const publisherViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "PublisherViewUriTemplate" /* ExtensionGalleryResourceType.PublisherViewUri */);
    const ratingViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionRatingViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionRatingViewUri */);
    return {
        type: 'gallery',
        identifier: {
            id: getGalleryExtensionId(galleryExtension.publisher.publisherName, galleryExtension.extensionName),
            uuid: galleryExtension.extensionId,
        },
        name: galleryExtension.extensionName,
        version: version.version,
        displayName: galleryExtension.displayName,
        publisherId: galleryExtension.publisher.publisherId,
        publisher: galleryExtension.publisher.publisherName,
        publisherDisplayName: galleryExtension.publisher.displayName,
        publisherDomain: galleryExtension.publisher.domain
            ? {
                link: galleryExtension.publisher.domain,
                verified: !!galleryExtension.publisher.isDomainVerified,
            }
            : undefined,
        publisherSponsorLink: getSponsorLink(latestVersion),
        description: galleryExtension.shortDescription ?? '',
        installCount: getStatistic(galleryExtension.statistics, 'install'),
        rating: getStatistic(galleryExtension.statistics, 'averagerating'),
        ratingCount: getStatistic(galleryExtension.statistics, 'ratingcount'),
        categories: galleryExtension.categories || [],
        tags: galleryExtension.tags || [],
        releaseDate: Date.parse(galleryExtension.releaseDate),
        lastUpdated: Date.parse(galleryExtension.lastUpdated),
        allTargetPlatforms,
        assets,
        properties: {
            dependencies: getExtensions(version, PropertyType.Dependency),
            extensionPack: getExtensions(version, PropertyType.ExtensionPack),
            engine: getEngine(version),
            enabledApiProposals: getEnabledApiProposals(version),
            localizedLanguages: getLocalizedLanguages(version),
            targetPlatform: getTargetPlatformForExtensionVersion(version),
            isPreReleaseVersion: isPreReleaseVersion(version),
            executesCode: executesCode(version),
        },
        hasPreReleaseVersion: isPreReleaseVersion(latestVersion),
        hasReleaseVersion: true,
        private: isPrivateExtension(latestVersion),
        preview: getIsPreview(galleryExtension.flags),
        isSigned: !!assets.signature,
        queryContext,
        supportLink: getSupportLink(latestVersion),
        detailsLink: detailsViewUri
            ? format2(detailsViewUri, {
                publisher: galleryExtension.publisher.publisherName,
                name: galleryExtension.extensionName,
            })
            : undefined,
        publisherLink: publisherViewUri
            ? format2(publisherViewUri, { publisher: galleryExtension.publisher.publisherName })
            : undefined,
        ratingLink: ratingViewUri
            ? format2(ratingViewUri, {
                publisher: galleryExtension.publisher.publisherName,
                name: galleryExtension.extensionName,
            })
            : undefined,
    };
}
let AbstractExtensionGalleryService = class AbstractExtensionGalleryService {
    constructor(storageService, assignmentService, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        this.assignmentService = assignmentService;
        this.requestService = requestService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.telemetryService = telemetryService;
        this.fileService = fileService;
        this.productService = productService;
        this.configurationService = configurationService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.extensionsControlUrl = productService.extensionsGallery?.controlUrl;
        this.unpkgResourceApi = productService.extensionsGallery?.extensionUrlTemplate;
        this.extensionsEnabledWithApiProposalVersion =
            productService.extensionsEnabledWithApiProposalVersion?.map((id) => id.toLowerCase()) ?? [];
        this.commonHeadersPromise = resolveMarketplaceHeaders(productService.version, productService, this.environmentService, this.configurationService, this.fileService, storageService, this.telemetryService);
    }
    isEnabled() {
        return this.extensionGalleryManifestService.isEnabled();
    }
    async getExtensions(extensionInfos, arg1, arg2) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        const options = CancellationToken.isCancellationToken(arg1)
            ? {}
            : arg1;
        const token = CancellationToken.isCancellationToken(arg1) ? arg1 : arg2;
        const resourceApi = options.preferResourceApi &&
            (this.configurationService.getValue(UseUnpkgResourceApiConfigKey) ?? false)
            ? await this.getResourceApi(extensionGalleryManifest)
            : undefined;
        const result = resourceApi
            ? await this.getExtensionsUsingResourceApi(extensionInfos, options, resourceApi, extensionGalleryManifest, token)
            : await this.getExtensionsUsingQueryApi(extensionInfos, options, extensionGalleryManifest, token);
        const uuids = result.map((r) => r.identifier.uuid);
        const extensionInfosByName = [];
        for (const e of extensionInfos) {
            if (e.uuid && !uuids.includes(e.uuid)) {
                extensionInfosByName.push({ ...e, uuid: undefined });
            }
        }
        if (extensionInfosByName.length) {
            // report telemetry data for additional query
            this.telemetryService.publicLog2('galleryService:additionalQueryByName', {
                count: extensionInfosByName.length,
            });
            const extensions = await this.getExtensionsUsingQueryApi(extensionInfosByName, options, extensionGalleryManifest, token);
            result.push(...extensions);
        }
        return result;
    }
    async getResourceApi(extensionGalleryManifest) {
        const latestVersionResource = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionLatestVersionUriTemplate" /* ExtensionGalleryResourceType.ExtensionLatestVersionUri */);
        if (!latestVersionResource) {
            return undefined;
        }
        if (this.productService.quality !== 'stable') {
            return {
                uri: latestVersionResource,
                fallback: this.unpkgResourceApi,
            };
        }
        const value = (await this.assignmentService?.getTreatment('extensions.gallery.useResourceApi')) ?? 'unpkg';
        if (value === 'marketplace') {
            return {
                uri: latestVersionResource,
                fallback: this.unpkgResourceApi,
            };
        }
        if (value === 'unpkg' && this.unpkgResourceApi) {
            return { uri: this.unpkgResourceApi };
        }
        return undefined;
    }
    async getExtensionsUsingQueryApi(extensionInfos, options, extensionGalleryManifest, token) {
        const names = [], ids = [], includePreRelease = [], versions = [];
        let isQueryForReleaseVersionFromPreReleaseVersion = true;
        for (const extensionInfo of extensionInfos) {
            if (extensionInfo.uuid) {
                ids.push(extensionInfo.uuid);
            }
            else {
                names.push(extensionInfo.id);
            }
            if (extensionInfo.version) {
                versions.push({
                    id: extensionInfo.id,
                    uuid: extensionInfo.uuid,
                    version: extensionInfo.version,
                });
            }
            else {
                includePreRelease.push({
                    id: extensionInfo.id,
                    uuid: extensionInfo.uuid,
                    includePreRelease: !!extensionInfo.preRelease,
                });
            }
            isQueryForReleaseVersionFromPreReleaseVersion =
                isQueryForReleaseVersionFromPreReleaseVersion &&
                    !!extensionInfo.hasPreRelease &&
                    !extensionInfo.preRelease;
        }
        if (!ids.length && !names.length) {
            return [];
        }
        let query = new Query().withPage(1, extensionInfos.length);
        if (ids.length) {
            query = query.withFilter("ExtensionId" /* FilterType.ExtensionId */, ...ids);
        }
        if (names.length) {
            query = query.withFilter("ExtensionName" /* FilterType.ExtensionName */, ...names);
        }
        if (options.queryAllVersions) {
            query = query.withFlags(...query.flags, "IncludeVersions" /* Flag.IncludeVersions */);
        }
        if (options.source) {
            query = query.withSource(options.source);
        }
        const { extensions } = await this.queryGalleryExtensions(query, {
            targetPlatform: options.targetPlatform ?? CURRENT_TARGET_PLATFORM,
            includePreRelease,
            versions,
            compatible: !!options.compatible,
            productVersion: options.productVersion ?? {
                version: this.productService.version,
                date: this.productService.date,
            },
            isQueryForReleaseVersionFromPreReleaseVersion,
        }, extensionGalleryManifest, token);
        if (options.source) {
            extensions.forEach((e, index) => setTelemetry(e, index, options.source));
        }
        return extensions;
    }
    async getExtensionsUsingResourceApi(extensionInfos, options, resourceApi, extensionGalleryManifest, token) {
        const result = [];
        const toQuery = [];
        const toFetchLatest = [];
        for (const extensionInfo of extensionInfos) {
            if (!EXTENSION_IDENTIFIER_REGEX.test(extensionInfo.id)) {
                continue;
            }
            if (extensionInfo.version) {
                toQuery.push(extensionInfo);
            }
            else {
                toFetchLatest.push(extensionInfo);
            }
        }
        await Promise.allSettled(toFetchLatest.map(async (extensionInfo) => {
            let galleryExtension;
            try {
                try {
                    galleryExtension = await this.getLatestGalleryExtension(extensionInfo, options, resourceApi.uri, extensionGalleryManifest, token);
                }
                catch (error) {
                    if (!resourceApi.fallback) {
                        throw error;
                    }
                    // fallback to unpkg
                    this.logService.error(`Error while getting the latest version for the extension ${extensionInfo.id} from ${resourceApi.uri}. Trying the fallback ${resourceApi.fallback}`, getErrorMessage(error));
                    this.telemetryService.publicLog2('galleryService:fallbacktounpkg', {
                        extension: extensionInfo.id,
                        preRelease: !!extensionInfo.preRelease,
                        compatible: !!options.compatible,
                    });
                    galleryExtension = await this.getLatestGalleryExtension(extensionInfo, options, resourceApi.fallback, extensionGalleryManifest, token);
                }
                if (galleryExtension === 'NOT_FOUND') {
                    if (extensionInfo.uuid) {
                        // Fallback to query if extension with UUID is not found. Probably extension is renamed.
                        toQuery.push(extensionInfo);
                    }
                    return;
                }
                if (galleryExtension) {
                    result.push(galleryExtension);
                }
            }
            catch (error) {
                // fallback to query
                this.logService.error(`Error while getting the latest version for the extension ${extensionInfo.id}.`, getErrorMessage(error));
                this.telemetryService.publicLog2('galleryService:fallbacktoquery', {
                    extension: extensionInfo.id,
                    preRelease: !!extensionInfo.preRelease,
                    compatible: !!options.compatible,
                    fromFallback: !!resourceApi.fallback,
                });
                toQuery.push(extensionInfo);
            }
        }));
        if (toQuery.length) {
            const extensions = await this.getExtensionsUsingQueryApi(toQuery, options, extensionGalleryManifest, token);
            result.push(...extensions);
        }
        return result;
    }
    async getLatestGalleryExtension(extensionInfo, options, resourceUriTemplate, extensionGalleryManifest, token) {
        const [publisher, name] = extensionInfo.id.split('.');
        const uri = URI.parse(format2(resourceUriTemplate, { publisher, name }));
        const rawGalleryExtension = await this.getLatestRawGalleryExtension(extensionInfo.id, uri, token);
        if (!rawGalleryExtension) {
            return 'NOT_FOUND';
        }
        const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
        const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
            targetPlatform: options.targetPlatform ?? CURRENT_TARGET_PLATFORM,
            compatible: !!options.compatible,
            productVersion: options.productVersion ?? {
                version: this.productService.version,
                date: this.productService.date,
            },
            version: extensionInfo.preRelease ? 1 /* VersionKind.Prerelease */ : 0 /* VersionKind.Release */,
        }, allTargetPlatforms);
        if (rawGalleryExtensionVersion) {
            return toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest);
        }
        return null;
    }
    async getCompatibleExtension(extension, includePreRelease, targetPlatform, productVersion = {
        version: this.productService.version,
        date: this.productService.date,
    }) {
        if (isNotWebExtensionInWebTargetPlatform(extension.allTargetPlatforms, targetPlatform)) {
            return null;
        }
        if (await this.isExtensionCompatible(extension, includePreRelease, targetPlatform)) {
            return extension;
        }
        if (this.allowedExtensionsService.isAllowed({
            id: extension.identifier.id,
            publisherDisplayName: extension.publisherDisplayName,
        }) !== true) {
            return null;
        }
        const result = await this.getExtensions([
            {
                ...extension.identifier,
                preRelease: includePreRelease,
                hasPreRelease: extension.hasPreReleaseVersion,
            },
        ], {
            compatible: true,
            productVersion,
            queryAllVersions: true,
            targetPlatform,
        }, CancellationToken.None);
        return result[0] ?? null;
    }
    async isExtensionCompatible(extension, includePreRelease, targetPlatform, productVersion = {
        version: this.productService.version,
        date: this.productService.date,
    }) {
        if (this.allowedExtensionsService.isAllowed(extension) !== true) {
            return false;
        }
        if (!isTargetPlatformCompatible(extension.properties.targetPlatform, extension.allTargetPlatforms, targetPlatform)) {
            return false;
        }
        if (!includePreRelease && extension.properties.isPreReleaseVersion) {
            // Pre-releases are not allowed when include pre-release flag is not set
            return false;
        }
        let engine = extension.properties.engine;
        if (!engine) {
            const manifest = await this.getManifest(extension, CancellationToken.None);
            if (!manifest) {
                throw new Error('Manifest was not found');
            }
            engine = manifest.engines.vscode;
        }
        if (!isEngineValid(engine, productVersion.version, productVersion.date)) {
            return false;
        }
        if (!this.areApiProposalsCompatible(extension.identifier, extension.properties.enabledApiProposals)) {
            return false;
        }
        return true;
    }
    areApiProposalsCompatible(extensionIdentifier, enabledApiProposals) {
        if (!enabledApiProposals) {
            return true;
        }
        if (!this.extensionsEnabledWithApiProposalVersion.includes(extensionIdentifier.id.toLowerCase())) {
            return true;
        }
        return areApiProposalsCompatible(enabledApiProposals);
    }
    async isValidVersion(extension, rawGalleryExtensionVersion, { targetPlatform, compatible, productVersion, version }, publisherDisplayName, allTargetPlatforms) {
        // Specific version
        if (isString(version)) {
            if (rawGalleryExtensionVersion.version !== version) {
                return false;
            }
        }
        // Prerelease or release version kind
        else if (version === 0 /* VersionKind.Release */ || version === 1 /* VersionKind.Prerelease */) {
            if (isPreReleaseVersion(rawGalleryExtensionVersion) !==
                (version === 1 /* VersionKind.Prerelease */)) {
                return false;
            }
        }
        const targetPlatformForExtension = getTargetPlatformForExtensionVersion(rawGalleryExtensionVersion);
        if (!isTargetPlatformCompatible(targetPlatformForExtension, allTargetPlatforms, targetPlatform)) {
            return false;
        }
        if (compatible) {
            if (this.allowedExtensionsService.isAllowed({
                id: extension,
                publisherDisplayName,
                version: rawGalleryExtensionVersion.version,
                prerelease: isPreReleaseVersion(rawGalleryExtensionVersion),
                targetPlatform: targetPlatformForExtension,
            }) !== true) {
                return false;
            }
            try {
                const engine = await this.getEngine(extension, rawGalleryExtensionVersion);
                if (!isEngineValid(engine, productVersion.version, productVersion.date)) {
                    return false;
                }
            }
            catch (error) {
                this.logService.error(`Error while getting the engine for the version ${rawGalleryExtensionVersion.version}.`, getErrorMessage(error));
                return false;
            }
        }
        return true;
    }
    async query(options, token) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        let text = options.text || '';
        const pageSize = options.pageSize ?? 50;
        let query = new Query().withPage(1, pageSize);
        if (text) {
            // Use category filter instead of "category:themes"
            text = text.replace(/\bcategory:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedCategory, category) => {
                query = query.withFilter("Category" /* FilterType.Category */, category || quotedCategory);
                return '';
            });
            // Use tag filter instead of "tag:debuggers"
            text = text.replace(/\btag:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedTag, tag) => {
                query = query.withFilter("Tag" /* FilterType.Tag */, tag || quotedTag);
                return '';
            });
            // Use featured filter
            text = text.replace(/\bfeatured(\s+|\b|$)/g, () => {
                query = query.withFilter("Featured" /* FilterType.Featured */);
                return '';
            });
            text = text.trim();
            if (text) {
                text = text.length < 200 ? text : text.substring(0, 200);
                query = query.withFilter("SearchText" /* FilterType.SearchText */, text);
            }
            if (extensionGalleryManifest.capabilities.extensionQuery.sorting?.some((c) => c.name === "NoneOrRelevance" /* SortBy.NoneOrRelevance */)) {
                query = query.withSortBy("NoneOrRelevance" /* SortBy.NoneOrRelevance */);
            }
        }
        else {
            if (extensionGalleryManifest.capabilities.extensionQuery.sorting?.some((c) => c.name === "InstallCount" /* SortBy.InstallCount */)) {
                query = query.withSortBy("InstallCount" /* SortBy.InstallCount */);
            }
        }
        if (options.sortBy &&
            extensionGalleryManifest.capabilities.extensionQuery.sorting?.some((c) => c.name === options.sortBy)) {
            query = query.withSortBy(options.sortBy);
        }
        if (typeof options.sortOrder === 'number') {
            query = query.withSortOrder(options.sortOrder);
        }
        if (options.source) {
            query = query.withSource(options.source);
        }
        const runQuery = async (query, token) => {
            const { extensions, total } = await this.queryGalleryExtensions(query, {
                targetPlatform: CURRENT_TARGET_PLATFORM,
                compatible: false,
                includePreRelease: !!options.includePreRelease,
                productVersion: options.productVersion ?? {
                    version: this.productService.version,
                    date: this.productService.date,
                },
            }, extensionGalleryManifest, token);
            extensions.forEach((e, index) => setTelemetry(e, (query.pageNumber - 1) * query.pageSize + index, options.source));
            return { extensions, total };
        };
        const { extensions, total } = await runQuery(query, token);
        const getPage = async (pageIndex, ct) => {
            if (ct.isCancellationRequested) {
                throw new CancellationError();
            }
            const { extensions } = await runQuery(query.withPage(pageIndex + 1), ct);
            return extensions;
        };
        return { firstPage: extensions, total, pageSize: query.pageSize, getPage };
    }
    async queryGalleryExtensions(query, criteria, extensionGalleryManifest, token) {
        if (this.productService.quality !== 'stable' &&
            (await this.assignmentService?.getTreatment('useLatestPrereleaseAndStableVersionFlag'))) {
            return this.queryGalleryExtensionsUsingIncludeLatestPrereleaseAndStableVersionFlag(query, criteria, extensionGalleryManifest, token);
        }
        return this.queryGalleryExtensionsWithAllVersionsAsFallback(query, criteria, extensionGalleryManifest, token);
    }
    async queryGalleryExtensionsWithAllVersionsAsFallback(query, criteria, extensionGalleryManifest, token) {
        const flags = query.flags;
        /**
         * If both version flags (IncludeLatestVersionOnly and IncludeVersions) are included, then only include latest versions (IncludeLatestVersionOnly) flag.
         */
        if (query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) &&
            query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            query = query.withFlags(...query.flags.filter((flag) => flag !== "IncludeVersions" /* Flag.IncludeVersions */));
        }
        /**
         * If version flags (IncludeLatestVersionOnly and IncludeVersions) are not included, default is to query for latest versions (IncludeLatestVersionOnly).
         */
        if (!query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) &&
            !query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            query = query.withFlags(...query.flags, "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */);
        }
        /**
         * If versions criteria exist or every requested extension is for release version and has a pre-release version, then remove latest flags and add all versions flag.
         */
        if (criteria.versions?.length || criteria.isQueryForReleaseVersionFromPreReleaseVersion) {
            query = query.withFlags(...query.flags.filter((flag) => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        /**
         * Add necessary extension flags
         */
        query = query.withFlags(...query.flags, "IncludeAssetUri" /* Flag.IncludeAssetUri */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeStatistics" /* Flag.IncludeStatistics */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */);
        const { galleryExtensions: rawGalleryExtensions, total, context, } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, token);
        const hasAllVersions = !query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */);
        if (hasAllVersions) {
            const extensions = [];
            for (const rawGalleryExtension of rawGalleryExtensions) {
                const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
                const extensionIdentifier = {
                    id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName),
                    uuid: rawGalleryExtension.extensionId,
                };
                const includePreRelease = isBoolean(criteria.includePreRelease)
                    ? criteria.includePreRelease
                    : !!criteria.includePreRelease.find((extensionIdentifierWithPreRelease) => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease;
                const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                    compatible: criteria.compatible,
                    targetPlatform: criteria.targetPlatform,
                    productVersion: criteria.productVersion,
                    version: criteria.versions?.find((extensionIdentifierWithVersion) => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version ?? (includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */),
                }, allTargetPlatforms);
                if (rawGalleryExtensionVersion) {
                    extensions.push(toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, context));
                }
            }
            return { extensions, total };
        }
        const result = [];
        const needAllVersions = new Map();
        for (let index = 0; index < rawGalleryExtensions.length; index++) {
            const rawGalleryExtension = rawGalleryExtensions[index];
            const extensionIdentifier = {
                id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName),
                uuid: rawGalleryExtension.extensionId,
            };
            const includePreRelease = isBoolean(criteria.includePreRelease)
                ? criteria.includePreRelease
                : !!criteria.includePreRelease.find((extensionIdentifierWithPreRelease) => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease;
            const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
            if (criteria.compatible) {
                // Skip looking for all versions if requested for a web-compatible extension and it is not a web extension.
                if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
                    continue;
                }
                // Skip looking for all versions if the extension is not allowed.
                if (this.allowedExtensionsService.isAllowed({
                    id: extensionIdentifier.id,
                    publisherDisplayName: rawGalleryExtension.publisher.displayName,
                }) !== true) {
                    continue;
                }
            }
            const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                compatible: criteria.compatible,
                targetPlatform: criteria.targetPlatform,
                productVersion: criteria.productVersion,
                version: criteria.versions?.find((extensionIdentifierWithVersion) => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version ?? (includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */),
            }, allTargetPlatforms);
            const extension = rawGalleryExtensionVersion
                ? toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, context)
                : null;
            if (!extension ||
                /** Need all versions if the extension is a pre-release version but
                 * 		- the query is to look for a release version or
                 * 		- the extension has no release version
                 * Get all versions to get or check the release version
                 */
                (extension.properties.isPreReleaseVersion &&
                    (!includePreRelease || !extension.hasReleaseVersion)) ||
                /**
                 * Need all versions if the extension is a release version with a different target platform than requested and also has a pre-release version
                 * Because, this is a platform specific extension and can have a newer release version supporting this platform.
                 * See https://github.com/microsoft/vscode/issues/139628
                 */
                (!extension.properties.isPreReleaseVersion &&
                    extension.properties.targetPlatform !== criteria.targetPlatform &&
                    extension.hasPreReleaseVersion)) {
                needAllVersions.set(rawGalleryExtension.extensionId, index);
            }
            else {
                result.push([index, extension]);
            }
        }
        if (needAllVersions.size) {
            const stopWatch = new StopWatch();
            const query = new Query()
                .withFlags(...flags.filter((flag) => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */)
                .withPage(1, needAllVersions.size)
                .withFilter("ExtensionId" /* FilterType.ExtensionId */, ...needAllVersions.keys());
            const { extensions } = await this.queryGalleryExtensions(query, criteria, extensionGalleryManifest, token);
            this.telemetryService.publicLog2('galleryService:additionalQuery', {
                duration: stopWatch.elapsed(),
                count: needAllVersions.size,
            });
            for (const extension of extensions) {
                const index = needAllVersions.get(extension.identifier.uuid);
                result.push([index, extension]);
            }
        }
        return {
            extensions: result.sort((a, b) => a[0] - b[0]).map(([, extension]) => extension),
            total,
        };
    }
    async queryGalleryExtensionsUsingIncludeLatestPrereleaseAndStableVersionFlag(query, criteria, extensionGalleryManifest, token) {
        /**
         * If versions criteria exist, then remove latest flags and add all versions flag.
         */
        if (criteria.versions?.length) {
            query = query.withFlags(...query.flags.filter((flag) => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */ &&
                flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        else if (!query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            /**
             * If the query does not specify all versions flag, handle latest versions.
             */
            const includeLatest = isBoolean(criteria.includePreRelease)
                ? criteria.includePreRelease
                : criteria.includePreRelease.every(({ includePreRelease }) => includePreRelease);
            query = includeLatest
                ? query.withFlags(...query.flags.filter((flag) => flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */)
                : query.withFlags(...query.flags.filter((flag) => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */);
        }
        /**
         * If all versions flag is set, remove latest flags.
         */
        if (query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */) &&
            (query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) ||
                query.flags.includes("IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */))) {
            query = query.withFlags(...query.flags.filter((flag) => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */ &&
                flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        /**
         * Add necessary extension flags
         */
        query = query.withFlags(...query.flags, "IncludeAssetUri" /* Flag.IncludeAssetUri */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeStatistics" /* Flag.IncludeStatistics */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */);
        const { galleryExtensions: rawGalleryExtensions, total, context, } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, token);
        const extensions = [];
        for (let index = 0; index < rawGalleryExtensions.length; index++) {
            const rawGalleryExtension = rawGalleryExtensions[index];
            const extensionIdentifier = {
                id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName),
                uuid: rawGalleryExtension.extensionId,
            };
            const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
            if (criteria.compatible) {
                // Skip looking for all versions if requested for a web-compatible extension and it is not a web extension.
                if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
                    continue;
                }
                // Skip looking for all versions if the extension is not allowed.
                if (this.allowedExtensionsService.isAllowed({
                    id: extensionIdentifier.id,
                    publisherDisplayName: rawGalleryExtension.publisher.displayName,
                }) !== true) {
                    continue;
                }
            }
            const version = criteria.versions?.find((extensionIdentifierWithVersion) => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version ??
                ((isBoolean(criteria.includePreRelease)
                    ? criteria.includePreRelease
                    : !!criteria.includePreRelease.find((extensionIdentifierWithPreRelease) => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease)
                    ? 2 /* VersionKind.Latest */
                    : 0 /* VersionKind.Release */);
            const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                compatible: criteria.compatible,
                targetPlatform: criteria.targetPlatform,
                productVersion: criteria.productVersion,
                version,
            }, allTargetPlatforms);
            if (rawGalleryExtensionVersion) {
                extensions.push(toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, context));
            }
        }
        return { extensions, total };
    }
    async getRawGalleryExtensionVersion(rawGalleryExtension, criteria, allTargetPlatforms) {
        const extensionIdentifier = {
            id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName),
            uuid: rawGalleryExtension.extensionId,
        };
        const rawGalleryExtensionVersions = sortExtensionVersions(rawGalleryExtension.versions, criteria.targetPlatform);
        if (criteria.compatible &&
            isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
            return null;
        }
        const version = isString(criteria.version) ? criteria.version : undefined;
        for (let index = 0; index < rawGalleryExtensionVersions.length; index++) {
            const rawGalleryExtensionVersion = rawGalleryExtensionVersions[index];
            if (await this.isValidVersion(extensionIdentifier.id, rawGalleryExtensionVersion, criteria, rawGalleryExtension.publisher.displayName, allTargetPlatforms)) {
                if (criteria.compatible &&
                    !this.areApiProposalsCompatible(extensionIdentifier, getEnabledApiProposals(rawGalleryExtensionVersion))) {
                    continue;
                }
                return rawGalleryExtensionVersion;
            }
            if (version && rawGalleryExtensionVersion.version === version) {
                return null;
            }
        }
        if (version || criteria.compatible) {
            return null;
        }
        /**
         * Fallback: Return the latest version
         * This can happen when the extension does not have a release version or does not have a version compatible with the given target platform.
         */
        return rawGalleryExtension.versions[0];
    }
    async queryRawGalleryExtensions(query, extensionGalleryManifest, token) {
        const extensionsQueryApi = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionQueryService" /* ExtensionGalleryResourceType.ExtensionQueryService */);
        if (!extensionsQueryApi) {
            throw new Error('No extension gallery query service configured.');
        }
        query = query
            /* Always exclude non validated extensions */
            .withFlags(...query.flags, "ExcludeNonValidated" /* Flag.ExcludeNonValidated */)
            .withFilter("Target" /* FilterType.Target */, 'Microsoft.VisualStudio.Code');
        const unpublishedFlag = extensionGalleryManifest.capabilities.extensionQuery.flags?.find((f) => f.name === "Unpublished" /* Flag.Unpublished */);
        /* Always exclude unpublished extensions */
        if (unpublishedFlag) {
            query = query.withFilter("ExcludeWithFlags" /* FilterType.ExcludeWithFlags */, String(unpublishedFlag.value));
        }
        const data = JSON.stringify({
            filters: [
                {
                    criteria: query.criteria.reduce((criteria, c) => {
                        const criterium = extensionGalleryManifest.capabilities.extensionQuery.filtering?.find((f) => f.name === c.filterType);
                        if (criterium) {
                            criteria.push({
                                filterType: criterium.value,
                                value: c.value,
                            });
                        }
                        return criteria;
                    }, []),
                    pageNumber: query.pageNumber,
                    pageSize: query.pageSize,
                    sortBy: extensionGalleryManifest.capabilities.extensionQuery.sorting?.find((s) => s.name === query.sortBy)?.value,
                    sortOrder: query.sortOrder,
                },
            ],
            assetTypes: query.assetTypes,
            flags: query.flags.reduce((flags, flag) => {
                const flagValue = extensionGalleryManifest.capabilities.extensionQuery.flags?.find((f) => f.name === flag);
                if (flagValue) {
                    flags |= flagValue.value;
                }
                return flags;
            }, 0),
        });
        const commonHeaders = await this.commonHeadersPromise;
        const headers = {
            ...commonHeaders,
            'Content-Type': 'application/json',
            Accept: 'application/json;api-version=3.0-preview.1',
            'Accept-Encoding': 'gzip',
            'Content-Length': String(data.length),
        };
        const stopWatch = new StopWatch();
        let context, errorCode, total = 0;
        try {
            context = await this.requestService.request({
                type: 'POST',
                url: extensionsQueryApi,
                data,
                headers,
            }, token);
            if (context.res.statusCode && context.res.statusCode >= 400 && context.res.statusCode < 500) {
                return { galleryExtensions: [], total };
            }
            const result = await asJson(context);
            if (result) {
                const r = result.results[0];
                const galleryExtensions = r.extensions;
                const resultCount = r.resultMetadata && r.resultMetadata.filter((m) => m.metadataType === 'ResultCount')[0];
                total =
                    (resultCount &&
                        resultCount.metadataItems.filter((i) => i.name === 'TotalCount')[0].count) ||
                        0;
                return {
                    galleryExtensions,
                    total,
                    context: context.res.headers['activityid']
                        ? {
                            [SEARCH_ACTIVITY_HEADER_NAME]: context.res.headers['activityid'],
                        }
                        : {},
                };
            }
            return { galleryExtensions: [], total };
        }
        catch (e) {
            if (isCancellationError(e)) {
                errorCode = "Cancelled" /* ExtensionGalleryErrorCode.Cancelled */;
                throw e;
            }
            else {
                const errorMessage = getErrorMessage(e);
                errorCode = isOfflineError(e)
                    ? "Offline" /* ExtensionGalleryErrorCode.Offline */
                    : errorMessage.startsWith('XHR timeout')
                        ? "Timeout" /* ExtensionGalleryErrorCode.Timeout */
                        : "Failed" /* ExtensionGalleryErrorCode.Failed */;
                throw new ExtensionGalleryError(errorMessage, errorCode);
            }
        }
        finally {
            this.telemetryService.publicLog2('galleryService:query', {
                filterTypes: query.criteria.map((criterium) => criterium.filterType),
                flags: query.flags,
                sortBy: query.sortBy,
                sortOrder: String(query.sortOrder),
                pageNumber: String(query.pageNumber),
                source: query.source,
                searchTextLength: query.searchText.length,
                requestBodySize: String(data.length),
                duration: stopWatch.elapsed(),
                success: !!context && isSuccess(context),
                responseBodySize: context?.res.headers['Content-Length'],
                statusCode: context ? String(context.res.statusCode) : undefined,
                errorCode,
                count: String(total),
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
        }
    }
    getHeaderValue(headers, name) {
        const value = headers?.[name.toLowerCase()];
        return Array.isArray(value) ? value[0] : value;
    }
    async getLatestRawGalleryExtension(extension, uri, token) {
        let errorCode;
        const stopWatch = new StopWatch();
        let context;
        try {
            const commonHeaders = await this.commonHeadersPromise;
            const headers = {
                ...commonHeaders,
                'Content-Type': 'application/json',
                Accept: 'application/json;api-version=7.2-preview',
                'Accept-Encoding': 'gzip',
            };
            context = await this.requestService.request({
                type: 'GET',
                url: uri.toString(true),
                headers,
                timeout: 10000 /*10s*/,
            }, token);
            if (context.res.statusCode === 404) {
                errorCode = 'NotFound';
                return null;
            }
            if (context.res.statusCode && context.res.statusCode !== 200) {
                errorCode = `GalleryServiceError:` + context.res.statusCode;
                throw new Error('Unexpected HTTP response: ' + context.res.statusCode);
            }
            const result = await asJson(context);
            if (!result) {
                errorCode = 'NoData';
            }
            return result;
        }
        catch (error) {
            if (isCancellationError(error)) {
                errorCode = "Cancelled" /* ExtensionGalleryErrorCode.Cancelled */;
            }
            else {
                const errorMessage = getErrorMessage(error);
                errorCode = isOfflineError(error)
                    ? "Offline" /* ExtensionGalleryErrorCode.Offline */
                    : errorMessage.startsWith('XHR timeout')
                        ? "Timeout" /* ExtensionGalleryErrorCode.Timeout */
                        : "Failed" /* ExtensionGalleryErrorCode.Failed */;
            }
            throw error;
        }
        finally {
            this.telemetryService.publicLog2('galleryService:getLatest', {
                extension,
                host: uri.authority,
                duration: stopWatch.elapsed(),
                errorCode,
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
        }
    }
    async reportStatistic(publisher, name, version, type) {
        const manifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!manifest) {
            return undefined;
        }
        let url;
        if (isWeb) {
            const resource = getExtensionGalleryManifestResourceUri(manifest, "WebExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.WebExtensionStatisticsUri */);
            if (!resource) {
                return;
            }
            url = format2(resource, {
                publisher,
                name,
                version,
                statTypeValue: type === "install" /* StatisticType.Install */ ? '1' : '3',
            });
        }
        else {
            const resource = getExtensionGalleryManifestResourceUri(manifest, "ExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.ExtensionStatisticsUri */);
            if (!resource) {
                return;
            }
            url = format2(resource, { publisher, name, version, statTypeName: type });
        }
        const Accept = isWeb ? 'api-version=6.1-preview.1' : '*/*;api-version=4.0-preview.1';
        const commonHeaders = await this.commonHeadersPromise;
        const headers = { ...commonHeaders, Accept };
        try {
            await this.requestService.request({
                type: 'POST',
                url,
                headers,
            }, CancellationToken.None);
        }
        catch (error) {
            /* Ignore */
        }
    }
    async download(extension, location, operation) {
        this.logService.trace('ExtensionGalleryService#download', extension.identifier.id);
        const data = getGalleryExtensionTelemetryData(extension);
        const startTime = new Date().getTime();
        const operationParam = operation === 2 /* InstallOperation.Install */
            ? 'install'
            : operation === 3 /* InstallOperation.Update */
                ? 'update'
                : '';
        const downloadAsset = operationParam
            ? {
                uri: `${extension.assets.download.uri}${URI.parse(extension.assets.download.uri).query ? '&' : '?'}${operationParam}=true`,
                fallbackUri: `${extension.assets.download.fallbackUri}${URI.parse(extension.assets.download.fallbackUri).query ? '&' : '?'}${operationParam}=true`,
            }
            : extension.assets.download;
        const headers = extension.queryContext?.[SEARCH_ACTIVITY_HEADER_NAME]
            ? { [SEARCH_ACTIVITY_HEADER_NAME]: extension.queryContext[SEARCH_ACTIVITY_HEADER_NAME] }
            : undefined;
        const context = await this.getAsset(extension.identifier.id, downloadAsset, AssetType.VSIX, extension.version, headers ? { headers } : undefined);
        try {
            await this.fileService.writeFile(location, context.stream);
        }
        catch (error) {
            try {
                await this.fileService.del(location);
            }
            catch (e) {
                /* ignore */
                this.logService.warn(`Error while deleting the file ${location.toString()}`, getErrorMessage(e));
            }
            throw new ExtensionGalleryError(getErrorMessage(error), "DownloadFailedWriting" /* ExtensionGalleryErrorCode.DownloadFailedWriting */);
        }
        /* __GDPR__
            "galleryService:downloadVSIX" : {
                "owner": "sandy081",
                "duration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "${include}": [
                    "${GalleryExtensionTelemetryData}"
                ]
            }
        */
        this.telemetryService.publicLog('galleryService:downloadVSIX', {
            ...data,
            duration: new Date().getTime() - startTime,
        });
    }
    async downloadSignatureArchive(extension, location) {
        if (!extension.assets.signature) {
            throw new Error('No signature asset found');
        }
        this.logService.trace('ExtensionGalleryService#downloadSignatureArchive', extension.identifier.id);
        const context = await this.getAsset(extension.identifier.id, extension.assets.signature, AssetType.Signature, extension.version);
        try {
            await this.fileService.writeFile(location, context.stream);
        }
        catch (error) {
            try {
                await this.fileService.del(location);
            }
            catch (e) {
                /* ignore */
                this.logService.warn(`Error while deleting the file ${location.toString()}`, getErrorMessage(e));
            }
            throw new ExtensionGalleryError(getErrorMessage(error), "DownloadFailedWriting" /* ExtensionGalleryErrorCode.DownloadFailedWriting */);
        }
    }
    async getReadme(extension, token) {
        if (extension.assets.readme) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.readme, AssetType.Details, extension.version, {}, token);
            const content = await asTextOrError(context);
            return content || '';
        }
        return '';
    }
    async getManifest(extension, token) {
        if (extension.assets.manifest) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.manifest, AssetType.Manifest, extension.version, {}, token);
            const text = await asTextOrError(context);
            return text ? JSON.parse(text) : null;
        }
        return null;
    }
    async getManifestFromRawExtensionVersion(extension, rawExtensionVersion, token) {
        const manifestAsset = getVersionAsset(rawExtensionVersion, AssetType.Manifest);
        if (!manifestAsset) {
            throw new Error('Manifest was not found');
        }
        const headers = { 'Accept-Encoding': 'gzip' };
        const context = await this.getAsset(extension, manifestAsset, AssetType.Manifest, rawExtensionVersion.version, { headers });
        return await asJson(context);
    }
    async getCoreTranslation(extension, languageId) {
        const asset = extension.assets.coreTranslations.filter((t) => t[0] === languageId.toUpperCase())[0];
        if (asset) {
            const context = await this.getAsset(extension.identifier.id, asset[1], asset[0], extension.version);
            const text = await asTextOrError(context);
            return text ? JSON.parse(text) : null;
        }
        return null;
    }
    async getChangelog(extension, token) {
        if (extension.assets.changelog) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.changelog, AssetType.Changelog, extension.version, {}, token);
            const content = await asTextOrError(context);
            return content || '';
        }
        return '';
    }
    async getAllCompatibleVersions(extensionIdentifier, includePreRelease, targetPlatform) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        let query = new Query()
            .withFlags("IncludeVersions" /* Flag.IncludeVersions */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */)
            .withPage(1, 1);
        if (extensionIdentifier.uuid) {
            query = query.withFilter("ExtensionId" /* FilterType.ExtensionId */, extensionIdentifier.uuid);
        }
        else {
            query = query.withFilter("ExtensionName" /* FilterType.ExtensionName */, extensionIdentifier.id);
        }
        const { galleryExtensions } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, CancellationToken.None);
        if (!galleryExtensions.length) {
            return [];
        }
        const allTargetPlatforms = getAllTargetPlatforms(galleryExtensions[0]);
        if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, targetPlatform)) {
            return [];
        }
        const validVersions = [];
        const productVersion = { version: this.productService.version, date: this.productService.date };
        await Promise.all(galleryExtensions[0].versions.map(async (version) => {
            try {
                if ((await this.isValidVersion(extensionIdentifier.id, version, {
                    compatible: true,
                    productVersion,
                    targetPlatform,
                    version: includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */,
                }, galleryExtensions[0].publisher.displayName, allTargetPlatforms)) &&
                    this.areApiProposalsCompatible(extensionIdentifier, getEnabledApiProposals(version))) {
                    validVersions.push(version);
                }
            }
            catch (error) {
                /* Ignore error and skip version */
            }
        }));
        const result = [];
        const seen = new Set();
        for (const version of sortExtensionVersions(validVersions, targetPlatform)) {
            if (!seen.has(version.version)) {
                seen.add(version.version);
                result.push({
                    version: version.version,
                    date: version.lastUpdated,
                    isPreReleaseVersion: isPreReleaseVersion(version),
                });
            }
        }
        return result;
    }
    async getAsset(extension, asset, assetType, extensionVersion, options = {}, token = CancellationToken.None) {
        const commonHeaders = await this.commonHeadersPromise;
        const baseOptions = { type: 'GET' };
        const headers = { ...commonHeaders, ...(options.headers || {}) };
        options = { ...options, ...baseOptions, headers };
        const url = asset.uri;
        const fallbackUrl = asset.fallbackUri;
        const firstOptions = { ...options, url };
        let context;
        try {
            context = await this.requestService.request(firstOptions, token);
            if (context.res.statusCode === 200) {
                return context;
            }
            const message = await asTextOrError(context);
            throw new Error(`Expected 200, got back ${context.res.statusCode} instead.\n\n${message}`);
        }
        catch (err) {
            if (isCancellationError(err)) {
                throw err;
            }
            const message = getErrorMessage(err);
            this.telemetryService.publicLog2('galleryService:cdnFallback', {
                extension,
                assetType,
                message,
                extensionVersion,
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
            const fallbackOptions = { ...options, url: fallbackUrl };
            return this.requestService.request(fallbackOptions, token);
        }
    }
    async getEngine(extension, rawExtensionVersion) {
        let engine = getEngine(rawExtensionVersion);
        if (!engine) {
            this.telemetryService.publicLog2('galleryService:engineFallback', {
                extension,
                extensionVersion: rawExtensionVersion.version,
            });
            const manifest = await this.getManifestFromRawExtensionVersion(extension, rawExtensionVersion, CancellationToken.None);
            if (!manifest) {
                throw new Error('Manifest was not found');
            }
            engine = manifest.engines.vscode;
        }
        return engine;
    }
    async getExtensionsControlManifest() {
        if (!this.isEnabled()) {
            throw new Error('No extension gallery service configured.');
        }
        if (!this.extensionsControlUrl) {
            return { malicious: [], deprecated: {}, search: [] };
        }
        const context = await this.requestService.request({
            type: 'GET',
            url: this.extensionsControlUrl,
            timeout: 10000 /*10s*/,
        }, CancellationToken.None);
        if (context.res.statusCode !== 200) {
            throw new Error('Could not get extensions report.');
        }
        const result = await asJson(context);
        const malicious = [];
        const deprecated = {};
        const search = [];
        const extensionsEnabledWithPreRelease = [];
        if (result) {
            for (const id of result.malicious) {
                if (EXTENSION_IDENTIFIER_REGEX.test(id)) {
                    malicious.push({ id });
                }
                else {
                    malicious.push(id);
                }
            }
            if (result.migrateToPreRelease) {
                for (const [unsupportedPreReleaseExtensionId, preReleaseExtensionInfo] of Object.entries(result.migrateToPreRelease)) {
                    if (!preReleaseExtensionInfo.engine ||
                        isEngineValid(preReleaseExtensionInfo.engine, this.productService.version, this.productService.date)) {
                        deprecated[unsupportedPreReleaseExtensionId.toLowerCase()] = {
                            disallowInstall: true,
                            extension: {
                                id: preReleaseExtensionInfo.id,
                                displayName: preReleaseExtensionInfo.displayName,
                                autoMigrate: { storage: !!preReleaseExtensionInfo.migrateStorage },
                                preRelease: true,
                            },
                        };
                    }
                }
            }
            if (result.deprecated) {
                for (const [deprecatedExtensionId, deprecationInfo] of Object.entries(result.deprecated)) {
                    if (deprecationInfo) {
                        deprecated[deprecatedExtensionId.toLowerCase()] = isBoolean(deprecationInfo)
                            ? {}
                            : deprecationInfo;
                    }
                }
            }
            if (result.search) {
                for (const s of result.search) {
                    search.push(s);
                }
            }
            if (Array.isArray(result.extensionsEnabledWithPreRelease)) {
                for (const id of result.extensionsEnabledWithPreRelease) {
                    extensionsEnabledWithPreRelease.push(id.toLowerCase());
                }
            }
        }
        return { malicious, deprecated, search, extensionsEnabledWithPreRelease };
    }
};
AbstractExtensionGalleryService = __decorate([
    __param(2, IRequestService),
    __param(3, ILogService),
    __param(4, IEnvironmentService),
    __param(5, ITelemetryService),
    __param(6, IFileService),
    __param(7, IProductService),
    __param(8, IConfigurationService),
    __param(9, IAllowedExtensionsService),
    __param(10, IExtensionGalleryManifestService)
], AbstractExtensionGalleryService);
export { AbstractExtensionGalleryService };
let ExtensionGalleryService = class ExtensionGalleryService extends AbstractExtensionGalleryService {
    constructor(storageService, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        super(storageService, undefined, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService);
    }
};
ExtensionGalleryService = __decorate([
    __param(0, IStorageService),
    __param(1, IRequestService),
    __param(2, ILogService),
    __param(3, IEnvironmentService),
    __param(4, ITelemetryService),
    __param(5, IFileService),
    __param(6, IProductService),
    __param(7, IConfigurationService),
    __param(8, IAllowedExtensionsService),
    __param(9, IExtensionGalleryManifestService)
], ExtensionGalleryService);
export { ExtensionGalleryService };
let ExtensionGalleryServiceWithNoStorageService = class ExtensionGalleryServiceWithNoStorageService extends AbstractExtensionGalleryService {
    constructor(requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        super(undefined, undefined, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService);
    }
};
ExtensionGalleryServiceWithNoStorageService = __decorate([
    __param(0, IRequestService),
    __param(1, ILogService),
    __param(2, IEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, IFileService),
    __param(5, IProductService),
    __param(6, IConfigurationService),
    __param(7, IAllowedExtensionsService),
    __param(8, IExtensionGalleryManifestService)
], ExtensionGalleryServiceWithNoStorageService);
export { ExtensionGalleryServiceWithNoStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbkdhbGxlcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixtQkFBbUIsR0FDbkIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBSU4sY0FBYyxHQUNkLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUNOLGlCQUFpQixFQVdqQixvQ0FBb0MsRUFDcEMsMEJBQTBCLEVBSTFCLGdCQUFnQixFQUNoQixpQkFBaUIsRUFJakIscUJBQXFCLEVBR3JCLDRCQUE0QixFQUM1Qix5QkFBeUIsRUFDekIsMEJBQTBCLEdBRzFCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLHlCQUF5QixFQUN6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