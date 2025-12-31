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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc1dpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sVUFBVSxFQUNWLFlBQVksRUFDWixlQUFlLEVBQ2YsaUJBQWlCLEdBRWpCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUVOLDJCQUEyQixHQUszQixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFDTixNQUFNLEVBQ04sQ0FBQyxFQUNELEtBQUssRUFDTCxxQkFBcUIsRUFDckIsU0FBUyxFQUNULFlBQVksR0FDWixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3ZILE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsZ0NBQWdDLEdBQ2hDLE1BQU0sK0VBQStFLENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBeUIsTUFBTSx3QkFBd0IsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sYUFBYSxFQUNiLDBCQUEwQixHQUMxQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04saUNBQWlD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