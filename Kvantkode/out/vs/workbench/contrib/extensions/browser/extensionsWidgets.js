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
var InstallCountWidget_1, ExtensionHoverWidget_1;
import './media/extensionsWidgets.css';
import * as semver from '../../../../base/common/semver/semver.js';
import { Disposable, toDisposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { IExtensionsWorkbenchService, } from '../common/extensions.js';
import { append, $, reset, addDisposableListener, EventType, finalHandler, } from '../../../../base/browser/dom.js';
import * as platform from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService, IExtensionRecommendationsService, } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { extensionButtonProminentBackground } from './extensionsActions.js';
import { IThemeService, registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { EXTENSION_BADGE_REMOTE_BACKGROUND, EXTENSION_BADGE_REMOTE_FOREGROUND, } from '../../../common/theme.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { activationTimeIcon, errorIcon, infoIcon, installCountIcon, preReleaseIcon, privateExtensionIcon, ratingIcon, remoteIcon, sponsorIcon, starEmptyIcon, starFullIcon, starHalfIcon, syncIgnoredIcon, warningIcon, } from './extensionsIcons.js';
import { registerColor, textLinkForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { URI } from '../../../../base/common/uri.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import Severity from '../../../../base/common/severity.js';
import { Color } from '../../../../base/common/color.js';
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, IExtensionFeaturesManagementService, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { extensionVerifiedPublisherIconColor, verifiedPublisherIcon, } from '../../../services/extensionManagement/common/extensionsIcons.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IExplorerService } from '../../files/browser/files.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { VIEW_ID as EXPLORER_VIEW_ID } from '../../files/common/files.js';
export class ExtensionWidget extends Disposable {
    constructor() {
        super(...arguments);
        this._extension = null;
    }
    get extension() {
        return this._extension;
    }
    set extension(extension) {
        this._extension = extension;
        this.update();
    }
    update() {
        this.render();
    }
}
export function onClick(element, callback) {
    const disposables = new DisposableStore();
    disposables.add(addDisposableListener(element, EventType.CLICK, finalHandler(callback)));
    disposables.add(addDisposableListener(element, EventType.KEY_UP, (e) => {
        const keyboardEvent = new StandardKeyboardEvent(e);
        if (keyboardEvent.equals(10 /* KeyCode.Space */) || keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            e.preventDefault();
            e.stopPropagation();
            callback();
        }
    }));
    return disposables;
}
let InstallCountWidget = InstallCountWidget_1 = class InstallCountWidget extends ExtensionWidget {
    constructor(container, small, hoverService) {
        super();
        this.container = container;
        this.small = small;
        this.hoverService = hoverService;
        this.disposables = this._register(new DisposableStore());
        this.render();
        this._register(toDisposable(() => this.clear()));
    }
    clear() {
        this.container.innerText = '';
        this.disposables.clear();
    }
    render() {
        this.clear();
        if (!this.extension) {
            return;
        }
        if (this.small && this.extension.state !== 3 /* ExtensionState.Uninstalled */) {
            return;
        }
        const installLabel = InstallCountWidget_1.getInstallLabel(this.extension, this.small);
        if (!installLabel) {
            return;
        }
        const parent = this.small
            ? this.container
            : append(this.container, $('span.install', { tabIndex: 0 }));
        append(parent, $('span' + ThemeIcon.asCSSSelector(installCountIcon)));
        const count = append(parent, $('span.count'));
        count.textContent = installLabel;
        if (!this.small) {
            this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.container, localize('install count', 'Install count')));
        }
    }
    static getInstallLabel(extension, small) {
        const installCount = extension.installCount;
        if (!installCount) {
            return undefined;
        }
        let installLabel;
        if (small) {
            if (installCount > 1000000) {
                installLabel = `${Math.floor(installCount / 100000) / 10}M`;
            }
            else if (installCount > 1000) {
                installLabel = `${Math.floor(installCount / 1000)}K`;
            }
            else {
                installLabel = String(installCount);
            }
        }
        else {
            installLabel = installCount.toLocaleString(platform.language);
        }
        return installLabel;
    }
};
InstallCountWidget = InstallCountWidget_1 = __decorate([
    __param(2, IHoverService)
], InstallCountWidget);
export { InstallCountWidget };
let RatingsWidget = class RatingsWidget extends ExtensionWidget {
    constructor(container, small, hoverService, openerService) {
        super();
        this.container = container;
        this.small = small;
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.disposables = this._register(new DisposableStore());
        container.classList.add('extension-ratings');
        if (this.small) {
            container.classList.add('small');
        }
        this.render();
        this._register(toDisposable(() => this.clear()));
    }
    clear() {
        this.container.innerText = '';
        this.disposables.clear();
    }
    render() {
        this.clear();
        if (!this.extension) {
            return;
        }
        if (this.small && this.extension.state !== 3 /* ExtensionState.Uninstalled */) {
            return;
        }
        if (this.extension.rating === undefined) {
            return;
        }
        if (this.small && !this.extension.ratingCount) {
            return;
        }
        if (!this.extension.url) {
            return;
        }
        const rating = Math.round(this.extension.rating * 2) / 2;
        if (this.small) {
            append(this.container, $('span' + ThemeIcon.asCSSSelector(starFullIcon)));
            const count = append(this.container, $('span.count'));
            count.textContent = String(rating);
        }
        else {
            const element = append(this.container, $('span.rating.clickable', { tabIndex: 0 }));
            for (let i = 1; i <= 5; i++) {
                if (rating >= i) {
                    append(element, $('span' + ThemeIcon.asCSSSelector(starFullIcon)));
                }
                else if (rating >= i - 0.5) {
                    append(element, $('span' + ThemeIcon.asCSSSelector(starHalfIcon)));
                }
                else {
                    append(element, $('span' + ThemeIcon.asCSSSelector(starEmptyIcon)));
                }
            }
            if (this.extension.ratingCount) {
                const ratingCountElemet = append(element, $('span', undefined, ` (${this.extension.ratingCount})`));
                ratingCountElemet.style.paddingLeft = '1px';
            }
            this.containerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), element, ''));
            this.containerHover.update(localize('ratedLabel', 'Average rating: {0} out of 5', rating));
            element.setAttribute('role', 'link');
            if (this.extension.ratingUrl) {
                this.disposables.add(onClick(element, () => this.openerService.open(URI.parse(this.extension.ratingUrl))));
            }
        }
    }
};
RatingsWidget = __decorate([
    __param(2, IHoverService),
    __param(3, IOpenerService)
], RatingsWidget);
export { RatingsWidget };
let PublisherWidget = class PublisherWidget extends ExtensionWidget {
    constructor(container, small, extensionsWorkbenchService, hoverService, openerService) {
        super();
        this.container = container;
        this.small = small;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.disposables = this._register(new DisposableStore());
        this.render();
        this._register(toDisposable(() => this.clear()));
    }
    clear() {
        this.element?.remove();
        this.disposables.clear();
    }
    render() {
        this.clear();
        if (!this.extension) {
            return;
        }
        if (this.extension.resourceExtension) {
            return;
        }
        if (this.extension.local?.source === 'resource') {
            return;
        }
        this.element = append(this.container, $('.publisher'));
        const publisherDisplayName = $('.publisher-name.ellipsis');
        publisherDisplayName.textContent = this.extension.publisherDisplayName;
        const verifiedPublisher = $('.verified-publisher');
        append(verifiedPublisher, $('span.extension-verified-publisher.clickable'), renderIcon(verifiedPublisherIcon));
        if (this.small) {
            if (this.extension.publisherDomain) {
                append(this.element, verifiedPublisher);
            }
            append(this.element, publisherDisplayName);
        }
        else {
            this.element.classList.toggle('clickable', !!this.extension.url);
            this.element.setAttribute('role', 'button');
            this.element.tabIndex = 0;
            this.containerHover = this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, localize('publisher', 'Publisher ({0})', this.extension.publisherDisplayName)));
            append(this.element, publisherDisplayName);
            if (this.extension.publisherDomain) {
                append(this.element, verifiedPublisher);
                const publisherDomainLink = URI.parse(this.extension.publisherDomain.link);
                verifiedPublisher.tabIndex = 0;
                verifiedPublisher.setAttribute('role', 'button');
                this.containerHover.update(localize('verified publisher', 'This publisher has verified ownership of {0}', this.extension.publisherDomain.link));
                verifiedPublisher.setAttribute('role', 'link');
                append(verifiedPublisher, $('span.extension-verified-publisher-domain', undefined, publisherDomainLink.authority.startsWith('www.')
                    ? publisherDomainLink.authority.substring(4)
                    : publisherDomainLink.authority));
                this.disposables.add(onClick(verifiedPublisher, () => this.openerService.open(publisherDomainLink)));
            }
            if (this.extension.url) {
                this.disposables.add(onClick(this.element, () => this.extensionsWorkbenchService.openSearch(`publisher:"${this.extension?.publisherDisplayName}"`)));
            }
        }
    }
};
PublisherWidget = __decorate([
    __param(2, IExtensionsWorkbenchService),
    __param(3, IHoverService),
    __param(4, IOpenerService)
], PublisherWidget);
export { PublisherWidget };
let SponsorWidget = class SponsorWidget extends ExtensionWidget {
    constructor(container, hoverService, openerService) {
        super();
        this.container = container;
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.disposables = this._register(new DisposableStore());
        this.render();
    }
    render() {
        reset(this.container);
        this.disposables.clear();
        if (!this.extension?.publisherSponsorLink) {
            return;
        }
        const sponsor = append(this.container, $('span.sponsor.clickable', { tabIndex: 0 }));
        this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), sponsor, this.extension?.publisherSponsorLink.toString() ?? ''));
        sponsor.setAttribute('role', 'link'); // #132645
        const sponsorIconElement = renderIcon(sponsorIcon);
        const label = $('span', undefined, localize('sponsor', 'Sponsor'));
        append(sponsor, sponsorIconElement, label);
        this.disposables.add(onClick(sponsor, () => {
            this.openerService.open(this.extension.publisherSponsorLink);
        }));
    }
};
SponsorWidget = __decorate([
    __param(1, IHoverService),
    __param(2, IOpenerService)
], SponsorWidget);
export { SponsorWidget };
let RecommendationWidget = class RecommendationWidget extends ExtensionWidget {
    constructor(parent, extensionRecommendationsService) {
        super();
        this.parent = parent;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.disposables = this._register(new DisposableStore());
        this.render();
        this._register(toDisposable(() => this.clear()));
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => this.render()));
    }
    clear() {
        this.element?.remove();
        this.element = undefined;
        this.disposables.clear();
    }
    render() {
        this.clear();
        if (!this.extension ||
            this.extension.state === 1 /* ExtensionState.Installed */ ||
            this.extension.deprecationInfo) {
            return;
        }
        const extRecommendations = this.extensionRecommendationsService.getAllRecommendationsWithReason();
        if (extRecommendations[this.extension.identifier.id.toLowerCase()]) {
            this.element = append(this.parent, $('div.extension-bookmark'));
            const recommendation = append(this.element, $('.recommendation'));
            append(recommendation, $('span' + ThemeIcon.asCSSSelector(ratingIcon)));
        }
    }
};
RecommendationWidget = __decorate([
    __param(1, IExtensionRecommendationsService)
], RecommendationWidget);
export { RecommendationWidget };
export class PreReleaseBookmarkWidget extends ExtensionWidget {
    constructor(parent) {
        super();
        this.parent = parent;
        this.disposables = this._register(new DisposableStore());
        this.render();
        this._register(toDisposable(() => this.clear()));
    }
    clear() {
        this.element?.remove();
        this.element = undefined;
        this.disposables.clear();
    }
    render() {
        this.clear();
        if (this.extension?.state === 1 /* ExtensionState.Installed */
            ? this.extension.preRelease
            : this.extension?.hasPreReleaseVersion) {
            this.element = append(this.parent, $('div.extension-bookmark'));
            const preRelease = append(this.element, $('.pre-release'));
            append(preRelease, $('span' + ThemeIcon.asCSSSelector(preReleaseIcon)));
        }
    }
}
let RemoteBadgeWidget = class RemoteBadgeWidget extends ExtensionWidget {
    constructor(parent, tooltip, extensionManagementServerService, instantiationService) {
        super();
        this.tooltip = tooltip;
        this.extensionManagementServerService = extensionManagementServerService;
        this.instantiationService = instantiationService;
        this.remoteBadge = this._register(new MutableDisposable());
        this.element = append(parent, $('.extension-remote-badge-container'));
        this.render();
        this._register(toDisposable(() => this.clear()));
    }
    clear() {
        this.remoteBadge.value?.element.remove();
        this.remoteBadge.clear();
    }
    render() {
        this.clear();
        if (!this.extension ||
            !this.extension.local ||
            !this.extension.server ||
            !(this.extensionManagementServerService.localExtensionManagementServer &&
                this.extensionManagementServerService.remoteExtensionManagementServer) ||
            this.extension.server !==
                this.extensionManagementServerService.remoteExtensionManagementServer) {
            return;
        }
        this.remoteBadge.value = this.instantiationService.createInstance(RemoteBadge, this.tooltip);
        append(this.element, this.remoteBadge.value.element);
    }
};
RemoteBadgeWidget = __decorate([
    __param(2, IExtensionManagementServerService),
    __param(3, IInstantiationService)
], RemoteBadgeWidget);
export { RemoteBadgeWidget };
let RemoteBadge = class RemoteBadge extends Disposable {
    constructor(tooltip, hoverService, labelService, themeService, extensionManagementServerService) {
        super();
        this.tooltip = tooltip;
        this.labelService = labelService;
        this.themeService = themeService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.element = $('div.extension-badge.extension-remote-badge');
        this.elementHover = this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, ''));
        this.render();
    }
    render() {
        append(this.element, $('span' + ThemeIcon.asCSSSelector(remoteIcon)));
        const applyBadgeStyle = () => {
            if (!this.element) {
                return;
            }
            const bgColor = this.themeService.getColorTheme().getColor(EXTENSION_BADGE_REMOTE_BACKGROUND);
            const fgColor = this.themeService.getColorTheme().getColor(EXTENSION_BADGE_REMOTE_FOREGROUND);
            this.element.style.backgroundColor = bgColor ? bgColor.toString() : '';
            this.element.style.color = fgColor ? fgColor.toString() : '';
        };
        applyBadgeStyle();
        this._register(this.themeService.onDidColorThemeChange(() => applyBadgeStyle()));
        if (this.tooltip) {
            const updateTitle = () => {
                if (this.element && this.extensionManagementServerService.remoteExtensionManagementServer) {
                    this.elementHover.update(localize('remote extension title', 'Extension in {0}', this.extensionManagementServerService.remoteExtensionManagementServer.label));
                }
            };
            this._register(this.labelService.onDidChangeFormatters(() => updateTitle()));
            updateTitle();
        }
    }
};
RemoteBadge = __decorate([
    __param(1, IHoverService),
    __param(2, ILabelService),
    __param(3, IThemeService),
    __param(4, IExtensionManagementServerService)
], RemoteBadge);
export class ExtensionPackCountWidget extends ExtensionWidget {
    constructor(parent) {
        super();
        this.parent = parent;
        this.render();
        this._register(toDisposable(() => this.clear()));
    }
    clear() {
        this.element?.remove();
        this.countBadge?.dispose();
        this.countBadge = undefined;
    }
    render() {
        this.clear();
        if (!this.extension ||
            !this.extension.categories?.some((category) => category.toLowerCase() === 'extension packs') ||
            !this.extension.extensionPack.length) {
            return;
        }
        this.element = append(this.parent, $('.extension-badge.extension-pack-badge'));
        this.countBadge = new CountBadge(this.element, {}, defaultCountBadgeStyles);
        this.countBadge.setCount(this.extension.extensionPack.length);
    }
}
let ExtensionKindIndicatorWidget = class ExtensionKindIndicatorWidget extends ExtensionWidget {
    constructor(container, small, hoverService, contextService, uriIdentityService, explorerService, viewsService) {
        super();
        this.container = container;
        this.small = small;
        this.hoverService = hoverService;
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this.explorerService = explorerService;
        this.viewsService = viewsService;
        this.disposables = this._register(new DisposableStore());
        this.render();
        this._register(toDisposable(() => this.clear()));
    }
    clear() {
        this.element?.remove();
        this.disposables.clear();
    }
    render() {
        this.clear();
        if (this.small) {
            return;
        }
        if (!this.extension) {
            return;
        }
        if (this.extension?.private) {
            this.element = append(this.container, $('.extension-kind-indicator'));
            append(this.element, $('span' + ThemeIcon.asCSSSelector(privateExtensionIcon)));
            if (!this.small) {
                append(this.element, $('span.private-extension-label', undefined, localize('privateExtension', 'Private Extension')));
            }
            return;
        }
        const location = this.extension.resourceExtension?.location ??
            (this.extension.local?.source === 'resource' ? this.extension.local?.location : undefined);
        if (!location) {
            return;
        }
        this.element = append(this.container, $('.extension-kind-indicator'));
        const workspaceFolder = this.contextService.getWorkspaceFolder(location);
        if (workspaceFolder && this.extension.isWorkspaceScoped) {
            this.element.textContent = localize('workspace extension', 'Workspace Extension');
            this.element.classList.add('clickable');
            this.element.setAttribute('role', 'button');
            this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, this.uriIdentityService.extUri.relativePath(workspaceFolder.uri, location)));
            this.disposables.add(onClick(this.element, () => {
                this.viewsService
                    .openView(EXPLORER_VIEW_ID, true)
                    .then(() => this.explorerService.select(location, true));
            }));
        }
        else {
            this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, location.path));
            this.element.textContent = localize('local extension', 'Local Extension');
        }
    }
};
ExtensionKindIndicatorWidget = __decorate([
    __param(2, IHoverService),
    __param(3, IWorkspaceContextService),
    __param(4, IUriIdentityService),
    __param(5, IExplorerService),
    __param(6, IViewsService)
], ExtensionKindIndicatorWidget);
export { ExtensionKindIndicatorWidget };
let SyncIgnoredWidget = class SyncIgnoredWidget extends ExtensionWidget {
    constructor(container, configurationService, extensionsWorkbenchService, hoverService, userDataSyncEnablementService) {
        super();
        this.container = container;
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.hoverService = hoverService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.disposables = this._register(new DisposableStore());
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('settingsSync.ignoredExtensions'))(() => this.render()));
        this._register(userDataSyncEnablementService.onDidChangeEnablement(() => this.update()));
        this.render();
    }
    render() {
        this.disposables.clear();
        this.container.innerText = '';
        if (this.extension &&
            this.extension.state === 1 /* ExtensionState.Installed */ &&
            this.userDataSyncEnablementService.isEnabled() &&
            this.extensionsWorkbenchService.isExtensionIgnoredToSync(this.extension)) {
            const element = append(this.container, $('span.extension-sync-ignored' + ThemeIcon.asCSSSelector(syncIgnoredIcon)));
            this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), element, localize('syncingore.label', 'This extension is ignored during sync.')));
            element.classList.add(...ThemeIcon.asClassNameArray(syncIgnoredIcon));
        }
    }
};
SyncIgnoredWidget = __decorate([
    __param(1, IConfigurationService),
    __param(2, IExtensionsWorkbenchService),
    __param(3, IHoverService),
    __param(4, IUserDataSyncEnablementService)
], SyncIgnoredWidget);
export { SyncIgnoredWidget };
let ExtensionRuntimeStatusWidget = class ExtensionRuntimeStatusWidget extends ExtensionWidget {
    constructor(extensionViewState, container, extensionService, extensionFeaturesManagementService, extensionsWorkbenchService) {
        super();
        this.extensionViewState = extensionViewState;
        this.container = container;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this._register(extensionService.onDidChangeExtensionsStatus((extensions) => {
            if (this.extension &&
                extensions.some((e) => areSameExtensions({ id: e.value }, this.extension.identifier))) {
                this.update();
            }
        }));
        this._register(extensionFeaturesManagementService.onDidChangeAccessData((e) => {
            if (this.extension &&
                ExtensionIdentifier.equals(this.extension.identifier.id, e.extension)) {
                this.update();
            }
        }));
    }
    render() {
        this.container.innerText = '';
        if (!this.extension) {
            return;
        }
        if (this.extensionViewState.filters.featureId &&
            this.extension.state === 1 /* ExtensionState.Installed */) {
            const accessData = this.extensionFeaturesManagementService
                .getAllAccessDataForExtension(new ExtensionIdentifier(this.extension.identifier.id))
                .get(this.extensionViewState.filters.featureId);
            const feature = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeature(this.extensionViewState.filters.featureId);
            if (feature?.icon && accessData) {
                const featureAccessTimeElement = append(this.container, $('span.activationTime'));
                featureAccessTimeElement.textContent = localize('feature access label', '{0} reqs', accessData.accessTimes.length);
                const iconElement = append(this.container, $('span' + ThemeIcon.asCSSSelector(feature.icon)));
                iconElement.style.paddingLeft = '4px';
                return;
            }
        }
        const extensionStatus = this.extensionsWorkbenchService.getExtensionRuntimeStatus(this.extension);
        if (extensionStatus?.activationTimes) {
            const activationTime = extensionStatus.activationTimes.codeLoadingTime +
                extensionStatus.activationTimes.activateCallTime;
            append(this.container, $('span' + ThemeIcon.asCSSSelector(activationTimeIcon)));
            const activationTimeElement = append(this.container, $('span.activationTime'));
            activationTimeElement.textContent = `${activationTime}ms`;
        }
    }
};
ExtensionRuntimeStatusWidget = __decorate([
    __param(2, IExtensionService),
    __param(3, IExtensionFeaturesManagementService),
    __param(4, IExtensionsWorkbenchService)
], ExtensionRuntimeStatusWidget);
export { ExtensionRuntimeStatusWidget };
let ExtensionHoverWidget = ExtensionHoverWidget_1 = class ExtensionHoverWidget extends ExtensionWidget {
    constructor(options, extensionStatusAction, extensionsWorkbenchService, extensionFeaturesManagementService, hoverService, configurationService, extensionRecommendationsService, themeService, contextService) {
        super();
        this.options = options;
        this.extensionStatusAction = extensionStatusAction;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.hoverService = hoverService;
        this.configurationService = configurationService;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.themeService = themeService;
        this.contextService = contextService;
        this.hover = this._register(new MutableDisposable());
    }
    render() {
        this.hover.value = undefined;
        if (this.extension) {
            this.hover.value = this.hoverService.setupManagedHover({
                delay: this.configurationService.getValue('workbench.hover.delay'),
                showHover: (options, focus) => {
                    return this.hoverService.showInstantHover({
                        ...options,
                        additionalClasses: ['extension-hover'],
                        position: {
                            hoverPosition: this.options.position(),
                            forcePosition: true,
                        },
                        persistence: {
                            hideOnKeyDown: true,
                        },
                    }, focus);
                },
                placement: 'element',
            }, this.options.target, {
                markdown: () => Promise.resolve(this.getHoverMarkdown()),
                markdownNotSupportedFallback: undefined,
            }, {
                appearance: {
                    showHoverHint: true,
                },
            });
        }
    }
    getHoverMarkdown() {
        if (!this.extension) {
            return undefined;
        }
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        markdown.appendMarkdown(`**${this.extension.displayName}**`);
        if (semver.valid(this.extension.version)) {
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">**&nbsp;_v${this.extension.version}${this.extension.isPreReleaseVersion ? ' (pre-release)' : ''}_**&nbsp;</span>`);
        }
        markdown.appendText(`\n`);
        let addSeparator = false;
        if (this.extension.private) {
            markdown.appendMarkdown(`$(${privateExtensionIcon.id}) ${localize('privateExtension', 'Private Extension')}`);
            addSeparator = true;
        }
        if (this.extension.state === 1 /* ExtensionState.Installed */) {
            const installLabel = InstallCountWidget.getInstallLabel(this.extension, true);
            if (installLabel) {
                if (addSeparator) {
                    markdown.appendText(`  |  `);
                }
                markdown.appendMarkdown(`$(${installCountIcon.id}) ${installLabel}`);
                addSeparator = true;
            }
            if (this.extension.rating) {
                if (addSeparator) {
                    markdown.appendText(`  |  `);
                }
                const rating = Math.round(this.extension.rating * 2) / 2;
                markdown.appendMarkdown(`$(${starFullIcon.id}) [${rating}](${this.extension.url}&ssr=false#review-details)`);
                addSeparator = true;
            }
            if (this.extension.publisherSponsorLink) {
                if (addSeparator) {
                    markdown.appendText(`  |  `);
                }
                markdown.appendMarkdown(`$(${sponsorIcon.id}) [${localize('sponsor', 'Sponsor')}](${this.extension.publisherSponsorLink})`);
                addSeparator = true;
            }
        }
        if (addSeparator) {
            markdown.appendText(`\n`);
        }
        const location = this.extension.resourceExtension?.location ??
            (this.extension.local?.source === 'resource' ? this.extension.local?.location : undefined);
        if (location) {
            if (this.extension.isWorkspaceScoped && this.contextService.isInsideWorkspace(location)) {
                markdown.appendMarkdown(localize('workspace extension', 'Workspace Extension'));
            }
            else {
                markdown.appendMarkdown(localize('local extension', 'Local Extension'));
            }
            markdown.appendText(`\n`);
        }
        if (this.extension.description) {
            markdown.appendMarkdown(`${this.extension.description}`);
            markdown.appendText(`\n`);
        }
        if (this.extension.publisherDomain?.verified) {
            const bgColor = this.themeService
                .getColorTheme()
                .getColor(extensionVerifiedPublisherIconColor);
            const publisherVerifiedTooltip = localize('publisher verified tooltip', 'This publisher has verified ownership of {0}', `[${URI.parse(this.extension.publisherDomain.link).authority}](${this.extension.publisherDomain.link})`);
            markdown.appendMarkdown(`<span style="color:${bgColor ? Color.Format.CSS.formatHex(bgColor) : '#ffffff'};">$(${verifiedPublisherIcon.id})</span>&nbsp;${publisherVerifiedTooltip}`);
            markdown.appendText(`\n`);
        }
        if (this.extension.outdated) {
            markdown.appendMarkdown(localize('updateRequired', 'Latest version:'));
            markdown.appendMarkdown(`&nbsp;<span style="background-color:#8080802B;">**&nbsp;_v${this.extension.latestVersion}_**&nbsp;</span>`);
            markdown.appendText(`\n`);
        }
        const preReleaseMessage = ExtensionHoverWidget_1.getPreReleaseMessage(this.extension);
        const extensionRuntimeStatus = this.extensionsWorkbenchService.getExtensionRuntimeStatus(this.extension);
        const extensionFeaturesAccessData = this.extensionFeaturesManagementService.getAllAccessDataForExtension(new ExtensionIdentifier(this.extension.identifier.id));
        const extensionStatus = this.extensionStatusAction.status;
        const runtimeState = this.extension.runtimeState;
        const recommendationMessage = this.getRecommendationMessage(this.extension);
        if (extensionRuntimeStatus ||
            extensionFeaturesAccessData.size ||
            extensionStatus.length ||
            runtimeState ||
            recommendationMessage ||
            preReleaseMessage) {
            markdown.appendMarkdown(`---`);
            markdown.appendText(`\n`);
            if (extensionRuntimeStatus) {
                if (extensionRuntimeStatus.activationTimes) {
                    const activationTime = extensionRuntimeStatus.activationTimes.codeLoadingTime +
                        extensionRuntimeStatus.activationTimes.activateCallTime;
                    markdown.appendMarkdown(`${localize('activation', 'Activation time')}${extensionRuntimeStatus.activationTimes.activationReason.startup ? ` (${localize('startup', 'Startup')})` : ''}: \`${activationTime}ms\``);
                    markdown.appendText(`\n`);
                }
                if (extensionRuntimeStatus.runtimeErrors.length || extensionRuntimeStatus.messages.length) {
                    const hasErrors = extensionRuntimeStatus.runtimeErrors.length ||
                        extensionRuntimeStatus.messages.some((message) => message.type === Severity.Error);
                    const hasWarnings = extensionRuntimeStatus.messages.some((message) => message.type === Severity.Warning);
                    const errorsLink = extensionRuntimeStatus.runtimeErrors.length
                        ? `[${extensionRuntimeStatus.runtimeErrors.length === 1 ? localize('uncaught error', '1 uncaught error') : localize('uncaught errors', '{0} uncaught errors', extensionRuntimeStatus.runtimeErrors.length)}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "features" /* ExtensionEditorTab.Features */]))}`)})`
                        : undefined;
                    const messageLink = extensionRuntimeStatus.messages.length
                        ? `[${extensionRuntimeStatus.messages.length === 1 ? localize('message', '1 message') : localize('messages', '{0} messages', extensionRuntimeStatus.messages.length)}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "features" /* ExtensionEditorTab.Features */]))}`)})`
                        : undefined;
                    markdown.appendMarkdown(`$(${hasErrors ? errorIcon.id : hasWarnings ? warningIcon.id : infoIcon.id}) This extension has reported `);
                    if (errorsLink && messageLink) {
                        markdown.appendMarkdown(`${errorsLink} and ${messageLink}`);
                    }
                    else {
                        markdown.appendMarkdown(`${errorsLink || messageLink}`);
                    }
                    markdown.appendText(`\n`);
                }
            }
            if (extensionFeaturesAccessData.size) {
                const registry = Registry.as(Extensions.ExtensionFeaturesRegistry);
                for (const [featureId, accessData] of extensionFeaturesAccessData) {
                    if (accessData?.accessTimes.length) {
                        const feature = registry.getExtensionFeature(featureId);
                        if (feature) {
                            markdown.appendMarkdown(localize('feature usage label', '{0} usage', feature.label));
                            markdown.appendMarkdown(`: [${localize('total', '{0} {1} requests in last 30 days', accessData.accessTimes.length, feature.accessDataLabel ?? feature.label)}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "features" /* ExtensionEditorTab.Features */]))}`)})`);
                            markdown.appendText(`\n`);
                        }
                    }
                }
            }
            for (const status of extensionStatus) {
                if (status.icon) {
                    markdown.appendMarkdown(`$(${status.icon.id})&nbsp;`);
                }
                markdown.appendMarkdown(status.message.value);
                markdown.appendText(`\n`);
            }
            if (runtimeState) {
                markdown.appendMarkdown(`$(${infoIcon.id})&nbsp;`);
                markdown.appendMarkdown(`${runtimeState.reason}`);
                markdown.appendText(`\n`);
            }
            if (preReleaseMessage) {
                const extensionPreReleaseIcon = this.themeService
                    .getColorTheme()
                    .getColor(extensionPreReleaseIconColor);
                markdown.appendMarkdown(`<span style="color:${extensionPreReleaseIcon ? Color.Format.CSS.formatHex(extensionPreReleaseIcon) : '#ffffff'};">$(${preReleaseIcon.id})</span>&nbsp;${preReleaseMessage}`);
                markdown.appendText(`\n`);
            }
            if (recommendationMessage) {
                markdown.appendMarkdown(recommendationMessage);
                markdown.appendText(`\n`);
            }
        }
        return markdown;
    }
    getRecommendationMessage(extension) {
        if (extension.state === 1 /* ExtensionState.Installed */) {
            return undefined;
        }
        if (extension.deprecationInfo) {
            return undefined;
        }
        const recommendation = this.extensionRecommendationsService.getAllRecommendationsWithReason()[extension.identifier.id.toLowerCase()];
        if (!recommendation?.reasonText) {
            return undefined;
        }
        const bgColor = this.themeService.getColorTheme().getColor(extensionButtonProminentBackground);
        return `<span style="color:${bgColor ? Color.Format.CSS.formatHex(bgColor) : '#ffffff'};">$(${starEmptyIcon.id})</span>&nbsp;${recommendation.reasonText}`;
    }
    static getPreReleaseMessage(extension) {
        if (!extension.hasPreReleaseVersion) {
            return undefined;
        }
        if (extension.isBuiltin) {
            return undefined;
        }
        if (extension.isPreReleaseVersion) {
            return undefined;
        }
        if (extension.preRelease) {
            return undefined;
        }
        const preReleaseVersionLink = `[${localize('Show prerelease version', 'Pre-Release version')}](${URI.parse(`command:workbench.extensions.action.showPreReleaseVersion?${encodeURIComponent(JSON.stringify([extension.identifier.id]))}`)})`;
        return localize('has prerelease', 'This extension has a {0} available', preReleaseVersionLink);
    }
};
ExtensionHoverWidget = ExtensionHoverWidget_1 = __decorate([
    __param(2, IExtensionsWorkbenchService),
    __param(3, IExtensionFeaturesManagementService),
    __param(4, IHoverService),
    __param(5, IConfigurationService),
    __param(6, IExtensionRecommendationsService),
    __param(7, IThemeService),
    __param(8, IWorkspaceContextService)
], ExtensionHoverWidget);
export { ExtensionHoverWidget };
let ExtensionStatusWidget = class ExtensionStatusWidget extends ExtensionWidget {
    constructor(container, extensionStatusAction, openerService) {
        super();
        this.container = container;
        this.extensionStatusAction = extensionStatusAction;
        this.openerService = openerService;
        this.renderDisposables = this._register(new MutableDisposable());
        this._onDidRender = this._register(new Emitter());
        this.onDidRender = this._onDidRender.event;
        this.render();
        this._register(extensionStatusAction.onDidChangeStatus(() => this.render()));
    }
    render() {
        reset(this.container);
        this.renderDisposables.value = undefined;
        const disposables = new DisposableStore();
        this.renderDisposables.value = disposables;
        const extensionStatus = this.extensionStatusAction.status;
        if (extensionStatus.length) {
            const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
            for (let i = 0; i < extensionStatus.length; i++) {
                const status = extensionStatus[i];
                if (status.icon) {
                    markdown.appendMarkdown(`$(${status.icon.id})&nbsp;`);
                }
                markdown.appendMarkdown(status.message.value);
                if (i < extensionStatus.length - 1) {
                    markdown.appendText(`\n`);
                }
            }
            const rendered = disposables.add(renderMarkdown(markdown, {
                actionHandler: {
                    callback: (content) => {
                        this.openerService.open(content, { allowCommands: true }).catch(onUnexpectedError);
                    },
                    disposables,
                },
            }));
            append(this.container, rendered.element);
        }
        this._onDidRender.fire();
    }
};
ExtensionStatusWidget = __decorate([
    __param(2, IOpenerService)
], ExtensionStatusWidget);
export { ExtensionStatusWidget };
let ExtensionRecommendationWidget = class ExtensionRecommendationWidget extends ExtensionWidget {
    constructor(container, extensionRecommendationsService, extensionIgnoredRecommendationsService) {
        super();
        this.container = container;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.extensionIgnoredRecommendationsService = extensionIgnoredRecommendationsService;
        this._onDidRender = this._register(new Emitter());
        this.onDidRender = this._onDidRender.event;
        this.render();
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => this.render()));
    }
    render() {
        reset(this.container);
        const recommendationStatus = this.getRecommendationStatus();
        if (recommendationStatus) {
            if (recommendationStatus.icon) {
                append(this.container, $(`div${ThemeIcon.asCSSSelector(recommendationStatus.icon)}`));
            }
            append(this.container, $(`div.recommendation-text`, undefined, recommendationStatus.message));
        }
        this._onDidRender.fire();
    }
    getRecommendationStatus() {
        if (!this.extension ||
            this.extension.deprecationInfo ||
            this.extension.state === 1 /* ExtensionState.Installed */) {
            return undefined;
        }
        const extRecommendations = this.extensionRecommendationsService.getAllRecommendationsWithReason();
        if (extRecommendations[this.extension.identifier.id.toLowerCase()]) {
            const reasonText = extRecommendations[this.extension.identifier.id.toLowerCase()].reasonText;
            if (reasonText) {
                return { icon: starEmptyIcon, message: reasonText };
            }
        }
        else if (this.extensionIgnoredRecommendationsService.globalIgnoredRecommendations.indexOf(this.extension.identifier.id.toLowerCase()) !== -1) {
            return {
                icon: undefined,
                message: localize('recommendationHasBeenIgnored', 'You have chosen not to receive recommendations for this extension.'),
            };
        }
        return undefined;
    }
};
ExtensionRecommendationWidget = __decorate([
    __param(1, IExtensionRecommendationsService),
    __param(2, IExtensionIgnoredRecommendationsService)
], ExtensionRecommendationWidget);
export { ExtensionRecommendationWidget };
export const extensionRatingIconColor = registerColor('extensionIcon.starForeground', { light: '#DF6100', dark: '#FF8E00', hcDark: '#FF8E00', hcLight: textLinkForeground }, localize('extensionIconStarForeground', 'The icon color for extension ratings.'), false);
export const extensionPreReleaseIconColor = registerColor('extensionIcon.preReleaseForeground', { dark: '#1d9271', light: '#1d9271', hcDark: '#1d9271', hcLight: textLinkForeground }, localize('extensionPreReleaseForeground', 'The icon color for pre-release extension.'), false);
export const extensionSponsorIconColor = registerColor('extensionIcon.sponsorForeground', { light: '#B51E78', dark: '#D758B3', hcDark: null, hcLight: '#B51E78' }, localize('extensionIcon.sponsorForeground', 'The icon color for extension sponsor.'), false);
export const extensionPrivateBadgeBackground = registerColor('extensionIcon.privateForeground', { dark: '#ffffff60', light: '#00000060', hcDark: '#ffffff60', hcLight: '#00000060' }, localize('extensionIcon.private', 'The icon color for private extensions.'));
registerThemingParticipant((theme, collector) => {
    const extensionRatingIcon = theme.getColor(extensionRatingIconColor);
    if (extensionRatingIcon) {
        collector.addRule(`.extension-ratings .codicon-extensions-star-full, .extension-ratings .codicon-extensions-star-half { color: ${extensionRatingIcon}; }`);
        collector.addRule(`.monaco-hover.extension-hover .markdown-hover .hover-contents ${ThemeIcon.asCSSSelector(starFullIcon)} { color: ${extensionRatingIcon}; }`);
    }
    const extensionVerifiedPublisherIcon = theme.getColor(extensionVerifiedPublisherIconColor);
    if (extensionVerifiedPublisherIcon) {
        collector.addRule(`${ThemeIcon.asCSSSelector(verifiedPublisherIcon)} { color: ${extensionVerifiedPublisherIcon}; }`);
    }
    collector.addRule(`.monaco-hover.extension-hover .markdown-hover .hover-contents ${ThemeIcon.asCSSSelector(sponsorIcon)} { color: var(--vscode-extensionIcon-sponsorForeground); }`);
    collector.addRule(`.extension-editor > .header > .details > .subtitle .sponsor ${ThemeIcon.asCSSSelector(sponsorIcon)} { color: var(--vscode-extensionIcon-sponsorForeground); }`);
    const privateBadgeBackground = theme.getColor(extensionPrivateBadgeBackground);
    if (privateBadgeBackground) {
        collector.addRule(`.extension-private-badge { color: ${privateBadgeBackground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zV2lkZ2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEtBQUssTUFBTSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixVQUFVLEVBQ1YsWUFBWSxFQUNaLGVBQWUsRUFDZixpQkFBaUIsR0FFakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sMkJBQTJCLEdBSzNCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUNOLE1BQU0sRUFDTixDQUFDLEVBQ0QsS0FBSyxFQUNMLHFCQUFxQixFQUNyQixTQUFTLEVBQ1QsWUFBWSxHQUNaLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDdkgsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxnQ0FBZ0MsR0FDaEMsTUFBTSwrRUFBK0UsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGtDQUFrQyxFQUF5QixNQUFNLHdCQUF3QixDQUFBO0FBQ2xHLE9BQU8sRUFDTixhQUFhLEVBQ2IsMEJBQTBCLEdBQzFCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFDTixp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