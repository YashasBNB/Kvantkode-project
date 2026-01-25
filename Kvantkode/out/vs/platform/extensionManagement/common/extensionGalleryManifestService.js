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
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IProductService } from '../../product/common/productService.js';
let ExtensionGalleryManifestService = class ExtensionGalleryManifestService extends Disposable {
    constructor(productService) {
        super();
        this.productService = productService;
        this.onDidChangeExtensionGalleryManifest = Event.None;
    }
    isEnabled() {
        return !!this.productService.extensionsGallery?.serviceUrl;
    }
    async getExtensionGalleryManifest() {
        const extensionsGallery = this.productService.extensionsGallery;
        if (!extensionsGallery?.serviceUrl) {
            return null;
        }
        const resources = [
            {
                id: `${extensionsGallery.serviceUrl}/extensionquery`,
                type: "ExtensionQueryService" /* ExtensionGalleryResourceType.ExtensionQueryService */,
            },
            {
                id: `${extensionsGallery.serviceUrl}/vscode/{publisher}/{name}/latest`,
                type: "ExtensionLatestVersionUriTemplate" /* ExtensionGalleryResourceType.ExtensionLatestVersionUri */,
            },
            {
                id: `${extensionsGallery.serviceUrl}/publishers/{publisher}/extensions/{name}/{version}/stats?statType={statTypeName}`,
                type: "ExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.ExtensionStatisticsUri */,
            },
            {
                id: `${extensionsGallery.serviceUrl}/itemName/{publisher}.{name}/version/{version}/statType/{statTypeValue}/vscodewebextension`,
                type: "WebExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.WebExtensionStatisticsUri */,
            },
        ];
        if (extensionsGallery.publisherUrl) {
            resources.push({
                id: `${extensionsGallery.publisherUrl}/{publisher}`,
                type: "PublisherViewUriTemplate" /* ExtensionGalleryResourceType.PublisherViewUri */,
            });
        }
        if (extensionsGallery.itemUrl) {
            resources.push({
                id: `${extensionsGallery.itemUrl}/?itemName={publisher}.{name}`,
                type: "ExtensionDetailsViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionDetailsViewUri */,
            });
            resources.push({
                id: `${extensionsGallery.itemUrl}/?itemName={publisher}.{name}&ssr=false#review-details`,
                type: "ExtensionRatingViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionRatingViewUri */,
            });
        }
        if (extensionsGallery.resourceUrlTemplate) {
            resources.push({
                id: extensionsGallery.resourceUrlTemplate,
                type: "ExtensionResourceUriTemplate" /* ExtensionGalleryResourceType.ExtensionResourceUri */,
            });
        }
        const filtering = [
            {
                name: "Tag" /* FilterType.Tag */,
                value: 1,
            },
            {
                name: "ExtensionId" /* FilterType.ExtensionId */,
                value: 4,
            },
            {
                name: "Category" /* FilterType.Category */,
                value: 5,
            },
            {
                name: "ExtensionName" /* FilterType.ExtensionName */,
                value: 7,
            },
            {
                name: "Target" /* FilterType.Target */,
                value: 8,
            },
            {
                name: "Featured" /* FilterType.Featured */,
                value: 9,
            },
            {
                name: "SearchText" /* FilterType.SearchText */,
                value: 10,
            },
            {
                name: "ExcludeWithFlags" /* FilterType.ExcludeWithFlags */,
                value: 12,
            },
        ];
        const sorting = [
            {
                name: "NoneOrRelevance" /* SortBy.NoneOrRelevance */,
                value: 0,
            },
            {
                name: "LastUpdatedDate" /* SortBy.LastUpdatedDate */,
                value: 1,
            },
            {
                name: "Title" /* SortBy.Title */,
                value: 2,
            },
            {
                name: "PublisherName" /* SortBy.PublisherName */,
                value: 3,
            },
            {
                name: "InstallCount" /* SortBy.InstallCount */,
                value: 4,
            },
            {
                name: "AverageRating" /* SortBy.AverageRating */,
                value: 6,
            },
            {
                name: "PublishedDate" /* SortBy.PublishedDate */,
                value: 10,
            },
            {
                name: "WeightedRating" /* SortBy.WeightedRating */,
                value: 12,
            },
        ];
        const flags = [
            {
                name: "None" /* Flag.None */,
                value: 0x0,
            },
            {
                name: "IncludeVersions" /* Flag.IncludeVersions */,
                value: 0x1,
            },
            {
                name: "IncludeFiles" /* Flag.IncludeFiles */,
                value: 0x2,
            },
            {
                name: "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */,
                value: 0x4,
            },
            {
                name: "IncludeSharedAccounts" /* Flag.IncludeSharedAccounts */,
                value: 0x8,
            },
            {
                name: "IncludeVersionProperties" /* Flag.IncludeVersionProperties */,
                value: 0x10,
            },
            {
                name: "ExcludeNonValidated" /* Flag.ExcludeNonValidated */,
                value: 0x20,
            },
            {
                name: "IncludeInstallationTargets" /* Flag.IncludeInstallationTargets */,
                value: 0x40,
            },
            {
                name: "IncludeAssetUri" /* Flag.IncludeAssetUri */,
                value: 0x80,
            },
            {
                name: "IncludeStatistics" /* Flag.IncludeStatistics */,
                value: 0x100,
            },
            {
                name: "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */,
                value: 0x200,
            },
            {
                name: "Unpublished" /* Flag.Unpublished */,
                value: 0x1000,
            },
            {
                name: "IncludeNameConflictInfo" /* Flag.IncludeNameConflictInfo */,
                value: 0x8000,
            },
            {
                name: "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */,
                value: 0x10000,
            },
        ];
        return {
            version: '',
            resources,
            capabilities: {
                extensionQuery: {
                    filtering,
                    sorting,
                    flags,
                },
                signing: {
                    allRepositorySigned: true,
                },
            },
        };
    }
};
ExtensionGalleryManifestService = __decorate([
    __param(0, IProductService)
], ExtensionGalleryManifestService);
export { ExtensionGalleryManifestService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQW1CakUsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFDWixTQUFRLFVBQVU7SUFNbEIsWUFBNkIsY0FBa0Q7UUFDOUUsS0FBSyxFQUFFLENBQUE7UUFEd0MsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRnRFLHdDQUFtQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFJekQsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsS0FBSyxDQUFDLDJCQUEyQjtRQUNoQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBRWxDLENBQUE7UUFDWixJQUFJLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLENBQUM7WUFDcEMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUc7WUFDakI7Z0JBQ0MsRUFBRSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsVUFBVSxpQkFBaUI7Z0JBQ3BELElBQUksa0ZBQW9EO2FBQ3hEO1lBQ0Q7Z0JBQ0MsRUFBRSxFQUFFLEdB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