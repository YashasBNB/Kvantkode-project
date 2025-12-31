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
var ExtensionEditor_1;
import { $, addDisposableListener, append, hide, setParentFlowTo, show, } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { CheckboxActionViewItem } from '../../../../base/browser/ui/toggle/toggle.js';
import { Action } from '../../../../base/common/actions.js';
import * as arrays from '../../../../base/common/arrays.js';
import { Cache } from '../../../../base/common/cache.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { isNative, language } from '../../../../base/common/platform.js';
import { isUndefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/extensionEditor.css';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import { localize } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { computeSize, IExtensionGalleryService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { defaultCheckboxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { buttonForeground, buttonHoverBackground, editorBackground, textLinkActiveForeground, textLinkForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ExtensionFeaturesTab } from './extensionFeaturesTab.js';
import { ButtonWithDropDownExtensionAction, ClearLanguageAction, DisableDropDownAction, EnableDropDownAction, ButtonWithDropdownExtensionActionViewItem, DropDownExtensionAction, ExtensionEditorManageExtensionAction, ExtensionStatusAction, ExtensionStatusLabelAction, InstallAnotherVersionAction, InstallDropdownAction, InstallingLabelAction, LocalInstallAction, MigrateDeprecatedExtensionAction, ExtensionRuntimeStateAction, RemoteInstallAction, SetColorThemeAction, SetFileIconThemeAction, SetLanguageAction, SetProductIconThemeAction, ToggleAutoUpdateForExtensionAction, UninstallAction, UpdateAction, WebInstallAction, TogglePreReleaseExtensionAction, } from './extensionsActions.js';
import { Delegate } from './extensionsList.js';
import { ExtensionData, ExtensionsGridView, ExtensionsTree, getExtensions, } from './extensionsViewer.js';
import { ExtensionRecommendationWidget, ExtensionStatusWidget, ExtensionWidget, InstallCountWidget, RatingsWidget, RemoteBadgeWidget, SponsorWidget, PublisherWidget, onClick, ExtensionKindIndicatorWidget, } from './extensionsWidgets.js';
import { ExtensionContainers, IExtensionsWorkbenchService, } from '../common/extensions.js';
import { DEFAULT_MARKDOWN_STYLES, renderMarkdownDocument, } from '../../markdown/browser/markdownDocumentRenderer.js';
import { IWebviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED, } from '../../webview/browser/webview.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}, ${date.toLocaleTimeString(language, { hourCycle: 'h23' })}`;
}
class NavBar extends Disposable {
    get onChange() {
        return this._onChange.event;
    }
    get currentId() {
        return this._currentId;
    }
    constructor(container) {
        super();
        this._onChange = this._register(new Emitter());
        this._currentId = null;
        const element = append(container, $('.navbar'));
        this.actions = [];
        this.actionbar = this._register(new ActionBar(element));
    }
    push(id, label, tooltip) {
        const action = new Action(id, label, undefined, true, () => this.update(id, true));
        action.tooltip = tooltip;
        this.actions.push(action);
        this.actionbar.push(action);
        if (this.actions.length === 1) {
            this.update(id);
        }
    }
    clear() {
        this.actions = dispose(this.actions);
        this.actionbar.clear();
    }
    switch(id) {
        const action = this.actions.find((action) => action.id === id);
        if (action) {
            action.run();
            return true;
        }
        return false;
    }
    update(id, focus) {
        this._currentId = id;
        this._onChange.fire({ id, focus: !!focus });
        this.actions.forEach((a) => (a.checked = a.id === id));
    }
}
var WebviewIndex;
(function (WebviewIndex) {
    WebviewIndex[WebviewIndex["Readme"] = 0] = "Readme";
    WebviewIndex[WebviewIndex["Changelog"] = 1] = "Changelog";
})(WebviewIndex || (WebviewIndex = {}));
const CONTEXT_SHOW_PRE_RELEASE_VERSION = new RawContextKey('showPreReleaseVersion', false);
class ExtensionWithDifferentGalleryVersionWidget extends ExtensionWidget {
    constructor() {
        super(...arguments);
        this._gallery = null;
    }
    get gallery() {
        return this._gallery;
    }
    set gallery(gallery) {
        if (this.extension &&
            gallery &&
            !areSameExtensions(this.extension.identifier, gallery.identifier)) {
            return;
        }
        this._gallery = gallery;
        this.update();
    }
}
class VersionWidget extends ExtensionWithDifferentGalleryVersionWidget {
    constructor(container, hoverService) {
        super();
        this.element = append(container, $('code.version', undefined, 'pre-release'));
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, localize('extension version', 'Extension Version')));
        this.render();
    }
    render() {
        if (this.extension?.preRelease) {
            show(this.element);
        }
        else {
            hide(this.element);
        }
    }
}
let ExtensionEditor = class ExtensionEditor extends EditorPane {
    static { ExtensionEditor_1 = this; }
    static { this.ID = 'workbench.editor.extension'; }
    constructor(group, telemetryService, instantiationService, extensionsWorkbenchService, extensionGalleryService, themeService, notificationService, openerService, extensionRecommendationsService, storageService, extensionService, webviewService, languageService, contextMenuService, contextKeyService, hoverService) {
        super(ExtensionEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionGalleryService = extensionGalleryService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.extensionService = extensionService;
        this.webviewService = webviewService;
        this.languageService = languageService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this._scopedContextKeyService = this._register(new MutableDisposable());
        // Some action bar items use a webview whose vertical scroll position we track in this map
        this.initialScrollProgress = new Map();
        // Spot when an ExtensionEditor instance gets reused for a different extension, in which case the vertical scroll positions must be zeroed
        this.currentIdentifier = '';
        this.layoutParticipants = [];
        this.contentDisposables = this._register(new DisposableStore());
        this.transientDisposables = this._register(new DisposableStore());
        this.activeElement = null;
        this.extensionReadme = null;
        this.extensionChangelog = null;
        this.extensionManifest = null;
    }
    get scopedContextKeyService() {
        return this._scopedContextKeyService.value;
    }
    createEditor(parent) {
        const root = append(parent, $('.extension-editor'));
        this._scopedContextKeyService.value = this.contextKeyService.createScoped(root);
        this._scopedContextKeyService.value.createKey('inExtensionEditor', true);
        this.showPreReleaseVersionContextKey = CONTEXT_SHOW_PRE_RELEASE_VERSION.bindTo(this._scopedContextKeyService.value);
        root.tabIndex = 0; // this is required for the focus tracker on the editor
        root.style.outline = 'none';
        root.setAttribute('role', 'document');
        const header = append(root, $('.header'));
        const iconContainer = append(header, $('.icon-container'));
        const icon = append(iconContainer, $('img.icon', { draggable: false, alt: '' }));
        const remoteBadge = this.instantiationService.createInstance(RemoteBadgeWidget, iconContainer, true);
        const details = append(header, $('.details'));
        const title = append(details, $('.title'));
        const name = append(title, $('span.name.clickable', { role: 'heading', tabIndex: 0 }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), name, localize('name', 'Extension name')));
        const versionWidget = new VersionWidget(title, this.hoverService);
        const preview = append(title, $('span.preview'));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), preview, localize('preview', 'Preview')));
        preview.textContent = localize('preview', 'Preview');
        const builtin = append(title, $('span.builtin'));
        builtin.textContent = localize('builtin', 'Built-in');
        const subtitle = append(details, $('.subtitle'));
        const subTitleEntryContainers = [];
        const publisherContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(publisherContainer);
        const publisherWidget = this.instantiationService.createInstance(PublisherWidget, publisherContainer, false);
        const extensionKindContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(extensionKindContainer);
        const extensionKindWidget = this.instantiationService.createInstance(ExtensionKindIndicatorWidget, extensionKindContainer, false);
        const installCountContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(installCountContainer);
        const installCountWidget = this.instantiationService.createInstance(InstallCountWidget, installCountContainer, false);
        const ratingsContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(ratingsContainer);
        const ratingsWidget = this.instantiationService.createInstance(RatingsWidget, ratingsContainer, false);
        const sponsorContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(sponsorContainer);
        const sponsorWidget = this.instantiationService.createInstance(SponsorWidget, sponsorContainer);
        const widgets = [
            remoteBadge,
            versionWidget,
            publisherWidget,
            extensionKindWidget,
            installCountWidget,
            ratingsWidget,
            sponsorWidget,
        ];
        const description = append(details, $('.description'));
        const installAction = this.instantiationService.createInstance(InstallDropdownAction);
        const actions = [
            this.instantiationService.createInstance(ExtensionRuntimeStateAction),
            this.instantiationService.createInstance(ExtensionStatusLabelAction),
            this.instantiationService.createInstance(UpdateAction, true),
            this.instantiationService.createInstance(SetColorThemeAction),
            this.instantiationService.createInstance(SetFileIconThemeAction),
            this.instantiationService.createInstance(SetProductIconThemeAction),
            this.instantiationService.createInstance(SetLanguageAction),
            this.instantiationService.createInstance(ClearLanguageAction),
            this.instantiationService.createInstance(EnableDropDownAction),
            this.instantiationService.createInstance(DisableDropDownAction),
            this.instantiationService.createInstance(RemoteInstallAction, false),
            this.instantiationService.createInstance(LocalInstallAction),
            this.instantiationService.createInstance(WebInstallAction),
            installAction,
            this.instantiationService.createInstance(InstallingLabelAction),
            this.instantiationService.createInstance(ButtonWithDropDownExtensionAction, 'extensions.uninstall', UninstallAction.UninstallClass, [
                [
                    this.instantiationService.createInstance(MigrateDeprecatedExtensionAction, false),
                    this.instantiationService.createInstance(UninstallAction),
                    this.instantiationService.createInstance(InstallAnotherVersionAction, null, true),
                ],
            ]),
            this.instantiationService.createInstance(TogglePreReleaseExtensionAction),
            this.instantiationService.createInstance(ToggleAutoUpdateForExtensionAction),
            new ExtensionEditorManageExtensionAction(this.scopedContextKeyService || this.contextKeyService, this.instantiationService),
        ];
        const actionsAndStatusContainer = append(details, $('.actions-status-container'));
        const extensionActionBar = this._register(new ActionBar(actionsAndStatusContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof DropDownExtensionAction) {
                    return action.createActionViewItem(options);
                }
                if (action instanceof ButtonWithDropDownExtensionAction) {
                    return new ButtonWithDropdownExtensionActionViewItem(action, {
                        ...options,
                        icon: true,
                        label: true,
                        menuActionsOrProvider: { getActions: () => action.menuActions },
                        menuActionClassNames: action.menuActionClassNames,
                    }, this.contextMenuService);
                }
                if (action instanceof ToggleAutoUpdateForExtensionAction) {
                    return new CheckboxActionViewItem(undefined, action, {
                        ...options,
                        icon: true,
                        label: true,
                        checkboxStyles: defaultCheckboxStyles,
                    });
                }
                return undefined;
            },
            focusOnlyEnabledItems: true,
        }));
        extensionActionBar.push(actions, { icon: true, label: true });
        extensionActionBar.setFocusable(true);
        // update focusable elements when the enablement of an action changes
        this._register(Event.any(...actions.map((a) => Event.filter(a.onDidChange, (e) => e.enabled !== undefined)))(() => {
            extensionActionBar.setFocusable(false);
            extensionActionBar.setFocusable(true);
        }));
        const otherExtensionContainers = [];
        const extensionStatusAction = this.instantiationService.createInstance(ExtensionStatusAction);
        const extensionStatusWidget = this._register(this.instantiationService.createInstance(ExtensionStatusWidget, append(actionsAndStatusContainer, $('.status')), extensionStatusAction));
        otherExtensionContainers.push(extensionStatusAction, new (class extends ExtensionWidget {
            render() {
                actionsAndStatusContainer.classList.toggle('list-layout', this.extension?.state === 1 /* ExtensionState.Installed */);
            }
        })());
        const recommendationWidget = this.instantiationService.createInstance(ExtensionRecommendationWidget, append(details, $('.recommendation')));
        widgets.push(recommendationWidget);
        this._register(Event.any(extensionStatusWidget.onDidRender, recommendationWidget.onDidRender)(() => {
            if (this.dimension) {
                this.layout(this.dimension);
            }
        }));
        const extensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...actions, ...widgets, ...otherExtensionContainers]);
        for (const disposable of [
            ...actions,
            ...widgets,
            ...otherExtensionContainers,
            extensionContainers,
        ]) {
            this._register(disposable);
        }
        const onError = Event.chain(extensionActionBar.onDidRun, ($) => $.map(({ error }) => error).filter((error) => !!error));
        this._register(onError(this.onError, this));
        const body = append(root, $('.body'));
        const navbar = new NavBar(body);
        const content = append(body, $('.content'));
        content.id = generateUuid(); // An id is needed for the webview parent flow to
        this.template = {
            builtin,
            content,
            description,
            header,
            icon,
            iconContainer,
            name,
            navbar,
            preview,
            actionsAndStatusContainer,
            extensionActionBar,
            set extension(extension) {
                extensionContainers.extension = extension;
                let lastNonEmptySubtitleEntryContainer;
                for (const subTitleEntryElement of subTitleEntryContainers) {
                    subTitleEntryElement.classList.remove('last-non-empty');
                    if (subTitleEntryElement.children.length > 0) {
                        lastNonEmptySubtitleEntryContainer = subTitleEntryElement;
                    }
                }
                if (lastNonEmptySubtitleEntryContainer) {
                    lastNonEmptySubtitleEntryContainer.classList.add('last-non-empty');
                }
            },
            set gallery(gallery) {
                versionWidget.gallery = gallery;
            },
            set manifest(manifest) {
                installAction.manifest = manifest;
            },
        };
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        this.updatePreReleaseVersionContext();
        if (this.template) {
            await this.render(input.extension, this.template, !!options?.preserveFocus);
        }
    }
    setOptions(options) {
        const currentOptions = this.options;
        super.setOptions(options);
        this.updatePreReleaseVersionContext();
        if (this.input &&
            this.template &&
            currentOptions?.showPreReleaseVersion !== options?.showPreReleaseVersion) {
            this.render(this.input.extension, this.template, !!options?.preserveFocus);
            return;
        }
        if (options?.tab) {
            this.template?.navbar.switch(options.tab);
        }
    }
    updatePreReleaseVersionContext() {
        let showPreReleaseVersion = this.options
            ?.showPreReleaseVersion;
        if (isUndefined(showPreReleaseVersion)) {
            showPreReleaseVersion = !!this.input.extension.gallery?.properties
                .isPreReleaseVersion;
        }
        this.showPreReleaseVersionContextKey?.set(showPreReleaseVersion);
    }
    async openTab(tab) {
        if (!this.input || !this.template) {
            return;
        }
        if (this.template.navbar.switch(tab)) {
            return;
        }
        // Fallback to Readme tab if ExtensionPack tab does not exist
        if (tab === "extensionPack" /* ExtensionEditorTab.ExtensionPack */) {
            this.template.navbar.switch("readme" /* ExtensionEditorTab.Readme */);
        }
    }
    async getGalleryVersionToShow(extension, preRelease) {
        if (extension.resourceExtension) {
            return null;
        }
        if (extension.local?.source === 'resource') {
            return null;
        }
        if (isUndefined(preRelease)) {
            return null;
        }
        if (preRelease === extension.gallery?.properties.isPreReleaseVersion) {
            return null;
        }
        if (preRelease && !extension.hasPreReleaseVersion) {
            return null;
        }
        if (!preRelease && !extension.hasReleaseVersion) {
            return null;
        }
        return ((await this.extensionGalleryService.getExtensions([{ ...extension.identifier, preRelease, hasPreRelease: extension.hasPreReleaseVersion }], CancellationToken.None))[0] || null);
    }
    async render(extension, template, preserveFocus) {
        this.activeElement = null;
        this.transientDisposables.clear();
        const token = this.transientDisposables.add(new CancellationTokenSource()).token;
        const gallery = await this.getGalleryVersionToShow(extension, this.options?.showPreReleaseVersion);
        if (token.isCancellationRequested) {
            return;
        }
        this.extensionReadme = new Cache(() => gallery ? this.extensionGalleryService.getReadme(gallery, token) : extension.getReadme(token));
        this.extensionChangelog = new Cache(() => gallery
            ? this.extensionGalleryService.getChangelog(gallery, token)
            : extension.getChangelog(token));
        this.extensionManifest = new Cache(() => gallery
            ? this.extensionGalleryService.getManifest(gallery, token)
            : extension.getManifest(token));
        template.extension = extension;
        template.gallery = gallery;
        template.manifest = null;
        this.transientDisposables.add(addDisposableListener(template.icon, 'error', () => (template.icon.src = extension.iconUrlFallback), { once: true }));
        template.icon.src = extension.iconUrl;
        template.name.textContent = extension.displayName;
        template.name.classList.toggle('clickable', !!extension.url);
        template.name.classList.toggle('deprecated', !!extension.deprecationInfo);
        template.preview.style.display = extension.preview ? 'inherit' : 'none';
        template.builtin.style.display = extension.isBuiltin ? 'inherit' : 'none';
        template.description.textContent = extension.description;
        if (extension.url) {
            this.transientDisposables.add(onClick(template.name, () => this.openerService.open(URI.parse(extension.url))));
        }
        const manifest = await this.extensionManifest.get().promise;
        if (token.isCancellationRequested) {
            return;
        }
        if (manifest) {
            template.manifest = manifest;
        }
        this.renderNavbar(extension, manifest, template, preserveFocus);
        // report telemetry
        const extRecommendations = this.extensionRecommendationsService.getAllRecommendationsWithReason();
        let recommendationsData = {};
        if (extRecommendations[extension.identifier.id.toLowerCase()]) {
            recommendationsData = {
                recommendationReason: extRecommendations[extension.identifier.id.toLowerCase()].reasonId,
            };
        }
        /* __GDPR__
        "extensionGallery:openExtension" : {
            "owner": "sandy081",
            "recommendationReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
        */
        this.telemetryService.publicLog('extensionGallery:openExtension', {
            ...extension.telemetryData,
            ...recommendationsData,
        });
    }
    renderNavbar(extension, manifest, template, preserveFocus) {
        template.content.innerText = '';
        template.navbar.clear();
        if (this.currentIdentifier !== extension.identifier.id) {
            this.initialScrollProgress.clear();
            this.currentIdentifier = extension.identifier.id;
        }
        template.navbar.push("readme" /* ExtensionEditorTab.Readme */, localize('details', 'Details'), localize('detailstooltip', "Extension details, rendered from the extension's 'README.md' file"));
        if (manifest) {
            template.navbar.push("features" /* ExtensionEditorTab.Features */, localize('features', 'Features'), localize('featurestooltip', 'Lists features contributed by this extension'));
        }
        if (extension.hasChangelog()) {
            template.navbar.push("changelog" /* ExtensionEditorTab.Changelog */, localize('changelog', 'Changelog'), localize('changelogtooltip', "Extension update history, rendered from the extension's 'CHANGELOG.md' file"));
        }
        if (extension.dependencies.length) {
            template.navbar.push("dependencies" /* ExtensionEditorTab.Dependencies */, localize('dependencies', 'Dependencies'), localize('dependenciestooltip', 'Lists extensions this extension depends on'));
        }
        if (manifest && manifest.extensionPack?.length && !this.shallRenderAsExtensionPack(manifest)) {
            template.navbar.push("extensionPack" /* ExtensionEditorTab.ExtensionPack */, localize('extensionpack', 'Extension Pack'), localize('extensionpacktooltip', 'Lists extensions those will be installed together with this extension'));
        }
        if (this.options?.tab) {
            template.navbar.switch(this.options.tab);
        }
        if (template.navbar.currentId) {
            this.onNavbarChange(extension, { id: template.navbar.currentId, focus: !preserveFocus }, template);
        }
        template.navbar.onChange((e) => this.onNavbarChange(extension, e, template), this, this.transientDisposables);
    }
    clearInput() {
        this.contentDisposables.clear();
        this.transientDisposables.clear();
        super.clearInput();
    }
    focus() {
        super.focus();
        this.activeElement?.focus();
    }
    showFind() {
        this.activeWebview?.showFind();
    }
    runFindAction(previous) {
        this.activeWebview?.runFindAction(previous);
    }
    get activeWebview() {
        if (!this.activeElement || !this.activeElement.runFindAction) {
            return undefined;
        }
        return this.activeElement;
    }
    onNavbarChange(extension, { id, focus }, template) {
        this.contentDisposables.clear();
        template.content.innerText = '';
        this.activeElement = null;
        if (id) {
            const cts = new CancellationTokenSource();
            this.contentDisposables.add(toDisposable(() => cts.dispose(true)));
            this.open(id, extension, template, cts.token).then((activeElement) => {
                if (cts.token.isCancellationRequested) {
                    return;
                }
                this.activeElement = activeElement;
                if (focus) {
                    this.focus();
                }
            });
        }
    }
    open(id, extension, template, token) {
        switch (id) {
            case "readme" /* ExtensionEditorTab.Readme */:
                return this.openDetails(extension, template, token);
            case "features" /* ExtensionEditorTab.Features */:
                return this.openFeatures(template, token);
            case "changelog" /* ExtensionEditorTab.Changelog */:
                return this.openChangelog(extension, template, token);
            case "dependencies" /* ExtensionEditorTab.Dependencies */:
                return this.openExtensionDependencies(extension, template, token);
            case "extensionPack" /* ExtensionEditorTab.ExtensionPack */:
                return this.openExtensionPack(extension, template, token);
        }
        return Promise.resolve(null);
    }
    async openMarkdown(extension, cacheResult, noContentCopy, container, webviewIndex, title, token) {
        try {
            const body = await this.renderMarkdown(extension, cacheResult, container, token);
            if (token.isCancellationRequested) {
                return Promise.resolve(null);
            }
            const webview = this.contentDisposables.add(this.webviewService.createWebviewOverlay({
                title,
                options: {
                    enableFindWidget: true,
                    tryRestoreScrollPosition: true,
                    disableServiceWorker: true,
                },
                contentOptions: {},
                extension: undefined,
            }));
            webview.initialScrollProgress = this.initialScrollProgress.get(webviewIndex) || 0;
            webview.claim(this, this.window, this.scopedContextKeyService);
            setParentFlowTo(webview.container, container);
            webview.layoutWebviewOverElement(container);
            webview.setHtml(body);
            webview.claim(this, this.window, undefined);
            this.contentDisposables.add(webview.onDidFocus(() => this._onDidFocus?.fire()));
            this.contentDisposables.add(webview.onDidScroll(() => this.initialScrollProgress.set(webviewIndex, webview.initialScrollProgress)));
            const removeLayoutParticipant = arrays.insert(this.layoutParticipants, {
                layout: () => {
                    webview.layoutWebviewOverElement(container);
                },
            });
            this.contentDisposables.add(toDisposable(removeLayoutParticipant));
            let isDisposed = false;
            this.contentDisposables.add(toDisposable(() => {
                isDisposed = true;
            }));
            this.contentDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since syntax highlighting of code blocks may have changed
                const body = await this.renderMarkdown(extension, cacheResult, container);
                if (!isDisposed) {
                    // Make sure we weren't disposed of in the meantime
                    webview.setHtml(body);
                }
            }));
            this.contentDisposables.add(webview.onDidClickLink((link) => {
                if (!link) {
                    return;
                }
                // Only allow links with specific schemes
                if (matchesScheme(link, Schemas.http) ||
                    matchesScheme(link, Schemas.https) ||
                    matchesScheme(link, Schemas.mailto)) {
                    this.openerService.open(link);
                }
                if (matchesScheme(link, Schemas.command) && extension.type === 0 /* ExtensionType.System */) {
                    this.openerService.open(link, { allowCommands: true });
                }
            }));
            return webview;
        }
        catch (e) {
            const p = append(container, $('p.nocontent'));
            p.textContent = noContentCopy;
            return p;
        }
    }
    async renderMarkdown(extension, cacheResult, container, token) {
        const contents = await this.loadContents(() => cacheResult, container);
        if (token?.isCancellationRequested) {
            return '';
        }
        const content = await renderMarkdownDocument(contents, this.extensionService, this.languageService, { shouldSanitize: extension.type !== 0 /* ExtensionType.System */, token });
        if (token?.isCancellationRequested) {
            return '';
        }
        return this.renderBody(content);
    }
    renderBody(body) {
        const nonce = generateUuid();
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; script-src 'none'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}

					/* prevent scroll-to-top button from blocking the body text */
					body {
						padding-bottom: 75px;
					}

					#scroll-to-top {
						position: fixed;
						width: 32px;
						height: 32px;
						right: 25px;
						bottom: 25px;
						background-color: var(--vscode-button-secondaryBackground);
						border-color: var(--vscode-button-border);
						border-radius: 50%;
						cursor: pointer;
						box-shadow: 1px 1px 1px rgba(0,0,0,.25);
						outline: none;
						display: flex;
						justify-content: center;
						align-items: center;
					}

					#scroll-to-top:hover {
						background-color: var(--vscode-button-secondaryHoverBackground);
						box-shadow: 2px 2px 2px rgba(0,0,0,.25);
					}

					body.vscode-high-contrast #scroll-to-top {
						border-width: 2px;
						border-style: solid;
						box-shadow: none;
					}

					#scroll-to-top span.icon::before {
						content: "";
						display: block;
						background: var(--vscode-button-secondaryForeground);
						/* Chevron up icon */
						webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						-webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						width: 16px;
						height: 16px;
					}
					${css}
				</style>
			</head>
			<body>
				<a id="scroll-to-top" role="button" aria-label="scroll to top" href="#"><span class="icon"></span></a>
				${body}
			</body>
		</html>`;
    }
    async openDetails(extension, template, token) {
        const details = append(template.content, $('.details'));
        const readmeContainer = append(details, $('.readme-container'));
        const additionalDetailsContainer = append(details, $('.additional-details-container'));
        const layout = () => details.classList.toggle('narrow', this.dimension && this.dimension.width < 500);
        layout();
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout })));
        let activeElement = null;
        const manifest = await this.extensionManifest.get().promise;
        if (manifest && manifest.extensionPack?.length && this.shallRenderAsExtensionPack(manifest)) {
            activeElement = await this.openExtensionPackReadme(extension, manifest, readmeContainer, token);
        }
        else {
            activeElement = await this.openMarkdown(extension, this.extensionReadme.get(), localize('noReadme', 'No README available.'), readmeContainer, 0 /* WebviewIndex.Readme */, localize('Readme title', 'Readme'), token);
        }
        this.renderAdditionalDetails(additionalDetailsContainer, extension);
        return activeElement;
    }
    shallRenderAsExtensionPack(manifest) {
        return !!manifest.categories?.some((category) => category.toLowerCase() === 'extension packs');
    }
    async openExtensionPackReadme(extension, manifest, container, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        const extensionPackReadme = append(container, $('div', { class: 'extension-pack-readme' }));
        extensionPackReadme.style.margin = '0 auto';
        extensionPackReadme.style.maxWidth = '882px';
        const extensionPack = append(extensionPackReadme, $('div', { class: 'extension-pack' }));
        if (manifest.extensionPack.length <= 3) {
            extensionPackReadme.classList.add('one-row');
        }
        else if (manifest.extensionPack.length <= 6) {
            extensionPackReadme.classList.add('two-rows');
        }
        else if (manifest.extensionPack.length <= 9) {
            extensionPackReadme.classList.add('three-rows');
        }
        else {
            extensionPackReadme.classList.add('more-rows');
        }
        const extensionPackHeader = append(extensionPack, $('div.header'));
        extensionPackHeader.textContent = localize('extension pack', 'Extension Pack ({0})', manifest.extensionPack.length);
        const extensionPackContent = append(extensionPack, $('div', { class: 'extension-pack-content' }));
        extensionPackContent.setAttribute('tabindex', '0');
        append(extensionPack, $('div.footer'));
        const readmeContent = append(extensionPackReadme, $('div.readme-content'));
        await Promise.all([
            this.renderExtensionPack(manifest, extensionPackContent, token),
            this.openMarkdown(extension, this.extensionReadme.get(), localize('noReadme', 'No README available.'), readmeContent, 0 /* WebviewIndex.Readme */, localize('Readme title', 'Readme'), token),
        ]);
        return { focus: () => extensionPackContent.focus() };
    }
    renderAdditionalDetails(container, extension) {
        const content = $('div', { class: 'additional-details-content', tabindex: '0' });
        const scrollableContent = new DomScrollableElement(content, {});
        const layout = () => scrollableContent.scanDomNode();
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        this.contentDisposables.add(scrollableContent);
        this.contentDisposables.add(this.instantiationService.createInstance(AdditionalDetailsWidget, content, extension));
        append(container, scrollableContent.getDomNode());
        scrollableContent.scanDomNode();
    }
    openChangelog(extension, template, token) {
        return this.openMarkdown(extension, this.extensionChangelog.get(), localize('noChangelog', 'No Changelog available.'), template.content, 1 /* WebviewIndex.Changelog */, localize('Changelog title', 'Changelog'), token);
    }
    async openFeatures(template, token) {
        const manifest = await this.loadContents(() => this.extensionManifest.get(), template.content);
        if (token.isCancellationRequested) {
            return null;
        }
        if (!manifest) {
            return null;
        }
        const extensionFeaturesTab = this.contentDisposables.add(this.instantiationService.createInstance(ExtensionFeaturesTab, manifest, this.options?.feature));
        const layout = () => extensionFeaturesTab.layout(template.content.clientHeight, template.content.clientWidth);
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        append(template.content, extensionFeaturesTab.domNode);
        layout();
        return extensionFeaturesTab.domNode;
    }
    openExtensionDependencies(extension, template, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        if (arrays.isFalsyOrEmpty(extension.dependencies)) {
            append(template.content, $('p.nocontent')).textContent = localize('noDependencies', 'No Dependencies');
            return Promise.resolve(template.content);
        }
        const content = $('div', { class: 'subcontent' });
        const scrollableContent = new DomScrollableElement(content, {});
        append(template.content, scrollableContent.getDomNode());
        this.contentDisposables.add(scrollableContent);
        const dependenciesTree = this.instantiationService.createInstance(ExtensionsTree, new ExtensionData(extension, null, (extension) => extension.dependencies || [], this.extensionsWorkbenchService), content, {
            listBackground: editorBackground,
        });
        const layout = () => {
            scrollableContent.scanDomNode();
            const scrollDimensions = scrollableContent.getScrollDimensions();
            dependenciesTree.layout(scrollDimensions.height);
        };
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        this.contentDisposables.add(dependenciesTree);
        scrollableContent.scanDomNode();
        return Promise.resolve({
            focus() {
                dependenciesTree.domFocus();
            },
        });
    }
    async openExtensionPack(extension, template, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve(null);
        }
        const manifest = await this.loadContents(() => this.extensionManifest.get(), template.content);
        if (token.isCancellationRequested) {
            return null;
        }
        if (!manifest) {
            return null;
        }
        return this.renderExtensionPack(manifest, template.content, token);
    }
    async renderExtensionPack(manifest, parent, token) {
        if (token.isCancellationRequested) {
            return null;
        }
        const content = $('div', { class: 'subcontent' });
        const scrollableContent = new DomScrollableElement(content, { useShadows: false });
        append(parent, scrollableContent.getDomNode());
        const extensionsGridView = this.instantiationService.createInstance(ExtensionsGridView, content, new Delegate());
        const extensions = await getExtensions(manifest.extensionPack, this.extensionsWorkbenchService);
        extensionsGridView.setExtensions(extensions);
        scrollableContent.scanDomNode();
        this.contentDisposables.add(scrollableContent);
        this.contentDisposables.add(extensionsGridView);
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout: () => scrollableContent.scanDomNode() })));
        return content;
    }
    loadContents(loadingTask, container) {
        container.classList.add('loading');
        const result = this.contentDisposables.add(loadingTask());
        const onDone = () => container.classList.remove('loading');
        result.promise.then(onDone, onDone);
        return result.promise;
    }
    layout(dimension) {
        this.dimension = dimension;
        this.layoutParticipants.forEach((p) => p.layout());
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        this.notificationService.error(err);
    }
};
ExtensionEditor = ExtensionEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IExtensionsWorkbenchService),
    __param(4, IExtensionGalleryService),
    __param(5, IThemeService),
    __param(6, INotificationService),
    __param(7, IOpenerService),
    __param(8, IExtensionRecommendationsService),
    __param(9, IStorageService),
    __param(10, IExtensionService),
    __param(11, IWebviewService),
    __param(12, ILanguageService),
    __param(13, IContextMenuService),
    __param(14, IContextKeyService),
    __param(15, IHoverService)
], ExtensionEditor);
export { ExtensionEditor };
let AdditionalDetailsWidget = class AdditionalDetailsWidget extends Disposable {
    constructor(container, extension, hoverService, openerService, userDataProfilesService, remoteAgentService, fileService, uriIdentityService, extensionsWorkbenchService, extensionGalleryManifestService) {
        super();
        this.container = container;
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.userDataProfilesService = userDataProfilesService;
        this.remoteAgentService = remoteAgentService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.disposables = this._register(new DisposableStore());
        this.render(extension);
        this._register(this.extensionsWorkbenchService.onChange((e) => {
            if (e &&
                areSameExtensions(e.identifier, extension.identifier) &&
                e.server === extension.server) {
                this.render(e);
            }
        }));
    }
    render(extension) {
        this.container.innerText = '';
        this.disposables.clear();
        if (extension.local) {
            this.renderInstallInfo(this.container, extension.local);
        }
        if (extension.gallery) {
            this.renderMarketplaceInfo(this.container, extension);
        }
        this.renderCategories(this.container, extension);
        this.renderExtensionResources(this.container, extension);
    }
    renderCategories(container, extension) {
        if (extension.categories.length) {
            const categoriesContainer = append(container, $('.categories-container.additional-details-element'));
            append(categoriesContainer, $('.additional-details-title', undefined, localize('categories', 'Categories')));
            const categoriesElement = append(categoriesContainer, $('.categories'));
            this.extensionGalleryManifestService.getExtensionGalleryManifest().then((manifest) => {
                const hasCategoryFilter = manifest?.capabilities.extensionQuery.filtering?.some(({ name }) => name === "Category" /* FilterType.Category */);
                for (const category of extension.categories) {
                    const categoryElement = append(categoriesElement, $('span.category', { tabindex: '0' }, category));
                    if (hasCategoryFilter) {
                        categoryElement.classList.add('clickable');
                        this.disposables.add(onClick(categoryElement, () => this.extensionsWorkbenchService.openSearch(`@category:"${category}"`)));
                    }
                }
            });
        }
    }
    renderExtensionResources(container, extension) {
        const resources = [];
        if (extension.url) {
            resources.push([localize('Marketplace', 'Marketplace'), URI.parse(extension.url)]);
        }
        if (extension.supportUrl) {
            try {
                resources.push([localize('issues', 'Issues'), URI.parse(extension.supportUrl)]);
            }
            catch (error) {
                /* Ignore */
            }
        }
        if (extension.repository) {
            try {
                resources.push([localize('repository', 'Repository'), URI.parse(extension.repository)]);
            }
            catch (error) {
                /* Ignore */
            }
        }
        if (extension.licenseUrl) {
            try {
                resources.push([localize('license', 'License'), URI.parse(extension.licenseUrl)]);
            }
            catch (error) {
                /* Ignore */
            }
        }
        if (extension.publisherUrl) {
            resources.push([extension.publisherDisplayName, extension.publisherUrl]);
        }
        if (resources.length || extension.publisherSponsorLink) {
            const extensionResourcesContainer = append(container, $('.resources-container.additional-details-element'));
            append(extensionResourcesContainer, $('.additional-details-title', undefined, localize('resources', 'Resources')));
            const resourcesElement = append(extensionResourcesContainer, $('.resources'));
            for (const [label, uri] of resources) {
                const resource = append(resourcesElement, $('a.resource', { tabindex: '0' }, label));
                this.disposables.add(onClick(resource, () => this.openerService.open(uri)));
                this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), resource, uri.toString()));
            }
        }
    }
    renderInstallInfo(container, extension) {
        const installInfoContainer = append(container, $('.more-info-container.additional-details-element'));
        append(installInfoContainer, $('.additional-details-title', undefined, localize('Install Info', 'Installation')));
        const installInfo = append(installInfoContainer, $('.more-info'));
        append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('id', 'Identifier')), $('code', undefined, extension.identifier.id)));
        if (extension.type !== 0 /* ExtensionType.System */) {
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('Version', 'Version')), $('code', undefined, extension.manifest.version)));
        }
        if (extension.installedTimestamp) {
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('last updated', 'Last Updated')), $('div', undefined, toDateString(new Date(extension.installedTimestamp)))));
        }
        if (!extension.isBuiltin && extension.source !== 'gallery') {
            const element = $('div', undefined, extension.source === 'vsix' ? localize('vsix', 'VSIX') : localize('other', 'Local'));
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('source', 'Source')), element));
            if (isNative &&
                extension.source === 'resource' &&
                extension.location.scheme === Schemas.file) {
                element.classList.add('link');
                element.title = extension.location.fsPath;
                this.disposables.add(onClick(element, () => this.openerService.open(extension.location, { openExternal: true })));
            }
        }
        if (extension.size) {
            const element = $('div', undefined, ByteSize.formatSize(extension.size));
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', { title: localize('size when installed', 'Size when installed') }, localize('size', 'Size')), element));
            if (isNative && extension.location.scheme === Schemas.file) {
                element.classList.add('link');
                element.title = extension.location.fsPath;
                this.disposables.add(onClick(element, () => this.openerService.open(extension.location, { openExternal: true })));
            }
        }
        this.getCacheLocation(extension).then((cacheLocation) => {
            if (!cacheLocation) {
                return;
            }
            computeSize(cacheLocation, this.fileService).then((cacheSize) => {
                if (!cacheSize) {
                    return;
                }
                const element = $('div', undefined, ByteSize.formatSize(cacheSize));
                append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', { title: localize('disk space used', 'Cache size') }, localize('cache size', 'Cache')), element));
                if (isNative && extension.location.scheme === Schemas.file) {
                    element.classList.add('link');
                    element.title = cacheLocation.fsPath;
                    this.disposables.add(onClick(element, () => this.openerService.open(cacheLocation.with({ scheme: Schemas.file }), {
                        openExternal: true,
                    })));
                }
            });
        });
    }
    async getCacheLocation(extension) {
        let extensionCacheLocation = this.uriIdentityService.extUri.joinPath(this.userDataProfilesService.defaultProfile.globalStorageHome, extension.identifier.id.toLowerCase());
        if (extension.location.scheme === Schemas.vscodeRemote) {
            const environment = await this.remoteAgentService.getEnvironment();
            if (!environment) {
                return undefined;
            }
            extensionCacheLocation = this.uriIdentityService.extUri.joinPath(environment.globalStorageHome, extension.identifier.id.toLowerCase());
        }
        return extensionCacheLocation;
    }
    renderMarketplaceInfo(container, extension) {
        const gallery = extension.gallery;
        const moreInfoContainer = append(container, $('.more-info-container.additional-details-element'));
        append(moreInfoContainer, $('.additional-details-title', undefined, localize('Marketplace Info', 'Marketplace')));
        const moreInfo = append(moreInfoContainer, $('.more-info'));
        if (gallery) {
            if (!extension.local) {
                append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('id', 'Identifier')), $('code', undefined, extension.identifier.id)));
                append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('Version', 'Version')), $('code', undefined, gallery.version)));
            }
            append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('published', 'Published')), $('div', undefined, toDateString(new Date(gallery.releaseDate)))), $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('last released', 'Last Released')), $('div', undefined, toDateString(new Date(gallery.lastUpdated)))));
        }
    }
};
AdditionalDetailsWidget = __decorate([
    __param(2, IHoverService),
    __param(3, IOpenerService),
    __param(4, IUserDataProfilesService),
    __param(5, IRemoteAgentService),
    __param(6, IFileService),
    __param(7, IUriIdentityService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionGalleryManifestService)
], AdditionalDetailsWidget);
const contextKeyExpr = ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', ExtensionEditor.ID), EditorContextKeys.focus.toNegated());
registerAction2(class ShowExtensionEditorFindAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.showfind',
            title: localize('find', 'Find'),
            keybinding: {
                when: contextKeyExpr,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
            },
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.showFind();
    }
});
registerAction2(class StartExtensionEditorFindNextAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.findNext',
            title: localize('find next', 'Find Next'),
            keybinding: {
                when: ContextKeyExpr.and(contextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.runFindAction(false);
    }
});
registerAction2(class StartExtensionEditorFindPreviousAction extends Action2 {
    constructor() {
        super({
            id: 'editor.action.extensioneditor.findPrevious',
            title: localize('find previous', 'Find Previous'),
            keybinding: {
                when: ContextKeyExpr.and(contextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor) {
        const extensionEditor = getExtensionEditor(accessor);
        extensionEditor?.runFindAction(true);
    }
});
registerThemingParticipant((theme, collector) => {
    const link = theme.getColor(textLinkForeground);
    if (link) {
        collector.addRule(`.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource { color: ${link}; }`);
        collector.addRule(`.monaco-workbench .extension-editor .content .feature-contributions a { color: ${link}; }`);
    }
    const activeLink = theme.getColor(textLinkActiveForeground);
    if (activeLink) {
        collector.addRule(`.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource:hover,
			.monaco-workbench .extension-editor .content .details .additional-details-container .resources-container a.resource:active { color: ${activeLink}; }`);
        collector.addRule(`.monaco-workbench .extension-editor .content .feature-contributions a:hover,
			.monaco-workbench .extension-editor .content .feature-contributions a:active { color: ${activeLink}; }`);
    }
    const buttonHoverBackgroundColor = theme.getColor(buttonHoverBackground);
    if (buttonHoverBackgroundColor) {
        collector.addRule(`.monaco-workbench .extension-editor .content > .details > .additional-details-container .categories-container > .categories > .category.clickable:hover { background-color: ${buttonHoverBackgroundColor}; border-color: ${buttonHoverBackgroundColor}; }`);
    }
    const buttonForegroundColor = theme.getColor(buttonForeground);
    if (buttonForegroundColor) {
        collector.addRule(`.monaco-workbench .extension-editor .content > .details > .additional-details-container .categories-container > .categories > .category.clickable:hover { color: ${buttonForegroundColor}; }`);
    }
});
function getExtensionEditor(accessor) {
    const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
    if (activeEditorPane instanceof ExtensionEditor) {
        return activeEditorPane;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbkVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLENBQUMsRUFFRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLElBQUksRUFDSixlQUFlLEVBQ2YsSUFBSSxHQUNKLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRSxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQWUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixPQUFPLEVBQ1AsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFB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