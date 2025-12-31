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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25HYWxsZXJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixlQUFlLEVBQ2YsbUJBQW1CLEdBQ25CLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUlOLGNBQWMsR0FDZCxNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFDTixpQkFBaUIsRUFXakIsb0NBQW9DLEVBQ3BDLDBCQUEwQixFQUkxQixnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBSWpCLHFCQUFxQixFQUdyQiw0QkFBNEIsRUFDNUIseUJBQXlCLEVBQ3pCLDBCQUEwQixHQUcxQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsaUJB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