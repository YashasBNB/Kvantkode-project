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
var ExtensionsListView_1;
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore, isDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { isCancellationError, getErrorMessage, CancellationError, } from '../../../../base/common/errors.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { PagedModel, DelayedPagedModel, } from '../../../../base/common/paging.js';
import { ExtensionGalleryError, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService, IWorkbenchExtensionManagementService, IWorkbenchExtensionEnablementService, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { areSameExtensions, getExtensionDependencies, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Delegate, Renderer } from './extensionsList.js';
import { ExtensionResultsListFocused, IExtensionsWorkbenchService, } from '../common/extensions.js';
import { Query } from '../common/extensionQuery.js';
import { IExtensionService, toExtension } from '../../../services/extensions/common/extensions.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { ManageExtensionAction, getContextMenuActions, ExtensionAction, } from './extensionsActions.js';
import { WorkbenchPagedList } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { ViewPane, ViewPaneShowActions, } from '../../../browser/parts/views/viewPane.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { coalesce, distinct, range } from '../../../../base/common/arrays.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Action, Separator, ActionRunner } from '../../../../base/common/actions.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, isLanguagePackExtension, } from '../../../../platform/extensions/common/extensions.js';
import { createCancelablePromise, ThrottledDelayer, } from '../../../../base/common/async.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isOfflineError } from '../../../../base/parts/request/common/request.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, IExtensionFeaturesManagementService, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { isString } from '../../../../base/common/types.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
export const NONE_CATEGORY = 'none';
class ExtensionsViewState extends Disposable {
    constructor() {
        super(...arguments);
        this._onFocus = this._register(new Emitter());
        this.onFocus = this._onFocus.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this.currentlyFocusedItems = [];
        this.filters = {};
    }
    onFocusChange(extensions) {
        this.currentlyFocusedItems.forEach((extension) => this._onBlur.fire(extension));
        this.currentlyFocusedItems = extensions;
        this.currentlyFocusedItems.forEach((extension) => this._onFocus.fire(extension));
    }
}
var LocalSortBy;
(function (LocalSortBy) {
    LocalSortBy["UpdateDate"] = "UpdateDate";
})(LocalSortBy || (LocalSortBy = {}));
function isLocalSortBy(value) {
    switch (value) {
        case "UpdateDate" /* LocalSortBy.UpdateDate */:
            return true;
    }
}
let ExtensionsListView = class ExtensionsListView extends ViewPane {
    static { ExtensionsListView_1 = this; }
    static { this.RECENT_UPDATE_DURATION = 7 * 24 * 60 * 60 * 1000; } // 7 days
    constructor(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, preferencesService, storageService, workspaceTrustManagementService, extensionEnablementService, layoutService, extensionFeaturesManagementService, uriIdentityService, logService) {
        super({
            ...viewletViewOptions,
            showActions: ViewPaneShowActions.Always,
            maximumBodySize: options.flexibleHeight
                ? storageService.getNumber(`${viewletViewOptions.id}.size`, 0 /* StorageScope.PROFILE */, 0)
                    ? undefined
                    : 0
                : undefined,
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.options = options;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.telemetryService = telemetryService;
        this.contextService = contextService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.extensionManagementService = extensionManagementService;
        this.workspaceService = workspaceService;
        this.productService = productService;
        this.preferencesService = preferencesService;
        this.storageService = storageService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.layoutService = layoutService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.list = null;
        this.queryRequest = null;
        this.contextMenuActionRunner = this._register(new ActionRunner());
        if (this.options.onDidChangeTitle) {
            this._register(this.options.onDidChangeTitle((title) => this.updateTitle(title)));
        }
        this._register(this.contextMenuActionRunner.onDidRun(({ error }) => error && this.notificationService.error(error)));
        this.registerActions();
    }
    registerActions() { }
    renderHeader(container) {
        container.classList.add('extension-view-header');
        super.renderHeader(container);
        if (!this.options.hideBadge) {
            this.badge = this._register(new CountBadge(append(container, $('.count-badge-wrapper')), {}, defaultCountBadgeStyles));
        }
    }
    renderBody(container) {
        super.renderBody(container);
        const messageContainer = append(container, $('.message-container'));
        const messageSeverityIcon = append(messageContainer, $(''));
        const messageBox = append(messageContainer, $('.message'));
        const extensionsList = append(container, $('.extensions-list'));
        const delegate = new Delegate();
        this.extensionsViewState = new ExtensionsViewState();
        const renderer = this.instantiationService.createInstance(Renderer, this.extensionsViewState, {
            hoverOptions: {
                position: () => {
                    const viewLocation = this.viewDescriptorService.getViewLocationById(this.id);
                    if (viewLocation === 0 /* ViewContainerLocation.Sidebar */) {
                        return this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */
                            ? 1 /* HoverPosition.RIGHT */
                            : 0 /* HoverPosition.LEFT */;
                    }
                    if (viewLocation === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                        return this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */
                            ? 0 /* HoverPosition.LEFT */
                            : 1 /* HoverPosition.RIGHT */;
                    }
                    return 1 /* HoverPosition.RIGHT */;
                },
            },
        });
        this.list = this.instantiationService.createInstance(WorkbenchPagedList, 'Extensions', extensionsList, delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(extension) {
                    return getAriaLabelForExtension(extension);
                },
                getWidgetAriaLabel() {
                    return localize('extensions', 'Extensions');
                },
            },
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            openOnSingleClick: true,
        });
        ExtensionResultsListFocused.bindTo(this.list.contextKeyService);
        this._register(this.list.onContextMenu((e) => this.onContextMenu(e), this));
        this._register(this.list.onDidChangeFocus((e) => this.extensionsViewState?.onFocusChange(coalesce(e.elements)), this));
        this._register(this.list);
        this._register(this.extensionsViewState);
        this._register(Event.debounce(Event.filter(this.list.onDidOpen, (e) => e.element !== null), (_, event) => event, 75, true)((options) => {
            this.openExtension(options.element, {
                sideByside: options.sideBySide,
                ...options.editorOptions,
            });
        }));
        this.bodyTemplate = {
            extensionsList,
            messageBox,
            messageContainer,
            messageSeverityIcon,
        };
        if (this.queryResult) {
            this.setModel(this.queryResult.model);
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        if (this.bodyTemplate) {
            this.bodyTemplate.extensionsList.style.height = height + 'px';
        }
        this.list?.layout(height, width);
    }
    async show(query, refresh) {
        if (this.queryRequest) {
            if (!refresh && this.queryRequest.query === query) {
                return this.queryRequest.request;
            }
            this.queryRequest.request.cancel();
            this.queryRequest = null;
        }
        if (this.queryResult) {
            this.queryResult.disposables.dispose();
            this.queryResult = undefined;
            if (this.extensionsViewState) {
                this.extensionsViewState.filters = {};
            }
        }
        const parsedQuery = Query.parse(query);
        const options = {
            sortOrder: 0 /* SortOrder.Default */,
        };
        switch (parsedQuery.sortBy) {
            case 'installs':
                options.sortBy = "InstallCount" /* GallerySortBy.InstallCount */;
                break;
            case 'rating':
                options.sortBy = "WeightedRating" /* GallerySortBy.WeightedRating */;
                break;
            case 'name':
                options.sortBy = "Title" /* GallerySortBy.Title */;
                break;
            case 'publishedDate':
                options.sortBy = "PublishedDate" /* GallerySortBy.PublishedDate */;
                break;
            case 'updateDate':
                options.sortBy = "UpdateDate" /* LocalSortBy.UpdateDate */;
                break;
        }
        const request = createCancelablePromise(async (token) => {
            try {
                this.queryResult = await this.query(parsedQuery, options, token);
                const model = this.queryResult.model;
                this.setModel(model, this.queryResult.description
                    ? { text: this.queryResult.description, severity: Severity.Info }
                    : undefined);
                if (this.queryResult.onDidChangeModel) {
                    this.queryResult.disposables.add(this.queryResult.onDidChangeModel((model) => {
                        if (this.queryResult) {
                            this.queryResult.model = model;
                            this.updateModel(model);
                        }
                    }));
                }
                return model;
            }
            catch (e) {
                const model = new PagedModel([]);
                if (!isCancellationError(e)) {
                    this.logService.error(e);
                    this.setModel(model, this.getMessage(e));
                }
                return this.list ? this.list.model : model;
            }
        });
        request.finally(() => (this.queryRequest = null));
        this.queryRequest = { query, request };
        return request;
    }
    count() {
        return this.queryResult?.model.length ?? 0;
    }
    showEmptyModel() {
        const emptyModel = new PagedModel([]);
        this.setModel(emptyModel);
        return Promise.resolve(emptyModel);
    }
    async onContextMenu(e) {
        if (e.element) {
            const disposables = new DisposableStore();
            const manageExtensionAction = disposables.add(this.instantiationService.createInstance(ManageExtensionAction));
            const extension = e.element
                ? this.extensionsWorkbenchService.local.find((local) => areSameExtensions(local.identifier, e.element.identifier) &&
                    (!e.element.server || e.element.server === local.server)) || e.element
                : e.element;
            manageExtensionAction.extension = extension;
            let groups = [];
            if (manageExtensionAction.enabled) {
                groups = await manageExtensionAction.getActionGroups();
            }
            else if (extension) {
                groups = await getContextMenuActions(extension, this.contextKeyService, this.instantiationService);
                groups.forEach((group) => group.forEach((extensionAction) => {
                    if (extensionAction instanceof ExtensionAction) {
                        extensionAction.extension = extension;
                    }
                }));
            }
            const actions = [];
            for (const menuActions of groups) {
                for (const menuAction of menuActions) {
                    actions.push(menuAction);
                    if (isDisposable(menuAction)) {
                        disposables.add(menuAction);
                    }
                }
                actions.push(new Separator());
            }
            actions.pop();
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
                actionRunner: this.contextMenuActionRunner,
                onHide: () => disposables.dispose(),
            });
        }
    }
    async query(query, options, token) {
        const idRegex = /@id:(([a-z0-9A-Z][a-z0-9\-A-Z]*)\.([a-z0-9A-Z][a-z0-9\-A-Z]*))/g;
        const ids = [];
        let idMatch;
        while ((idMatch = idRegex.exec(query.value)) !== null) {
            const name = idMatch[1];
            ids.push(name);
        }
        if (ids.length) {
            const model = await this.queryByIds(ids, options, token);
            return { model, disposables: new DisposableStore() };
        }
        if (ExtensionsListView_1.isLocalExtensionsQuery(query.value, query.sortBy)) {
            return this.queryLocal(query, options);
        }
        if (ExtensionsListView_1.isSearchPopularQuery(query.value)) {
            query.value = query.value.replace('@popular', '');
            options.sortBy = !options.sortBy ? "InstallCount" /* GallerySortBy.InstallCount */ : options.sortBy;
        }
        else if (ExtensionsListView_1.isSearchRecentlyPublishedQuery(query.value)) {
            query.value = query.value.replace('@recentlyPublished', '');
            options.sortBy = !options.sortBy ? "PublishedDate" /* GallerySortBy.PublishedDate */ : options.sortBy;
        }
        const galleryQueryOptions = {
            ...options,
            sortBy: isLocalSortBy(options.sortBy) ? undefined : options.sortBy,
        };
        const model = await this.queryGallery(query, galleryQueryOptions, token);
        return { model, disposables: new DisposableStore() };
    }
    async queryByIds(ids, options, token) {
        const idsSet = ids.reduce((result, id) => {
            result.add(id.toLowerCase());
            return result;
        }, new Set());
        const result = (await this.extensionsWorkbenchService.queryLocal(this.options.server)).filter((e) => idsSet.has(e.identifier.id.toLowerCase()));
        const galleryIds = result.length
            ? ids.filter((id) => result.every((r) => !areSameExtensions(r.identifier, { id })))
            : ids;
        if (galleryIds.length) {
            const galleryResult = await this.extensionsWorkbenchService.getExtensions(galleryIds.map((id) => ({ id })), { source: 'queryById' }, token);
            result.push(...galleryResult);
        }
        return new PagedModel(result);
    }
    async queryLocal(query, options) {
        const local = await this.extensionsWorkbenchService.queryLocal(this.options.server);
        let { extensions, canIncludeInstalledExtensions, description } = await this.filterLocal(local, this.extensionService.extensions, query, options);
        const disposables = new DisposableStore();
        const onDidChangeModel = disposables.add(new Emitter());
        if (canIncludeInstalledExtensions) {
            let isDisposed = false;
            disposables.add(toDisposable(() => (isDisposed = true)));
            disposables.add(Event.debounce(Event.any(Event.filter(this.extensionsWorkbenchService.onChange, (e) => e?.state === 1 /* ExtensionState.Installed */), this.extensionService.onDidChangeExtensions), () => undefined)(async () => {
                const local = this.options.server
                    ? this.extensionsWorkbenchService.installed.filter((e) => e.server === this.options.server)
                    : this.extensionsWorkbenchService.local;
                const { extensions: newExtensions } = await this.filterLocal(local, this.extensionService.extensions, query, options);
                if (!isDisposed) {
                    const mergedExtensions = this.mergeAddedExtensions(extensions, newExtensions);
                    if (mergedExtensions) {
                        extensions = mergedExtensions;
                        onDidChangeModel.fire(new PagedModel(extensions));
                    }
                }
            }));
        }
        return {
            model: new PagedModel(extensions),
            description,
            onDidChangeModel: onDidChangeModel.event,
            disposables,
        };
    }
    async filterLocal(local, runningExtensions, query, options) {
        const value = query.value;
        let extensions = [];
        let canIncludeInstalledExtensions = true;
        let description;
        if (/@builtin/i.test(value)) {
            extensions = this.filterBuiltinExtensions(local, query, options);
            canIncludeInstalledExtensions = false;
        }
        else if (/@installed/i.test(value)) {
            extensions = this.filterInstalledExtensions(local, runningExtensions, query, options);
        }
        else if (/@outdated/i.test(value)) {
            extensions = this.filterOutdatedExtensions(local, query, options);
        }
        else if (/@disabled/i.test(value)) {
            extensions = this.filterDisabledExtensions(local, runningExtensions, query, options);
        }
        else if (/@enabled/i.test(value)) {
            extensions = this.filterEnabledExtensions(local, runningExtensions, query, options);
        }
        else if (/@workspaceUnsupported/i.test(value)) {
            extensions = this.filterWorkspaceUnsupportedExtensions(local, query, options);
        }
        else if (/@deprecated/i.test(query.value)) {
            extensions = await this.filterDeprecatedExtensions(local, query, options);
        }
        else if (/@recentlyUpdated/i.test(query.value)) {
            extensions = this.filterRecentlyUpdatedExtensions(local, query, options);
        }
        else if (/@feature:/i.test(query.value)) {
            const result = this.filterExtensionsByFeature(local, query);
            if (result) {
                extensions = result.extensions;
                description = result.description;
            }
        }
        return { extensions, canIncludeInstalledExtensions, description };
    }
    filterBuiltinExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value
            .replace(/@builtin/g, '')
            .replace(/@sort:(\w+)(-\w*)?/g, '')
            .trim()
            .toLowerCase();
        const result = local.filter((e) => e.isBuiltin &&
            (e.name.toLowerCase().indexOf(value) > -1 ||
                e.displayName.toLowerCase().indexOf(value) > -1) &&
            this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterExtensionByCategory(e, includedCategories, excludedCategories) {
        if (!includedCategories.length && !excludedCategories.length) {
            return true;
        }
        if (e.categories.length) {
            if (excludedCategories.length &&
                e.categories.some((category) => excludedCategories.includes(category.toLowerCase()))) {
                return false;
            }
            return e.categories.some((category) => includedCategories.includes(category.toLowerCase()));
        }
        else {
            return includedCategories.includes(NONE_CATEGORY);
        }
    }
    parseCategories(value) {
        const includedCategories = [];
        const excludedCategories = [];
        value = value.replace(/\bcategory:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedCategory, category) => {
            const entry = (category || quotedCategory || '').toLowerCase();
            if (entry.startsWith('-')) {
                if (excludedCategories.indexOf(entry) === -1) {
                    excludedCategories.push(entry);
                }
            }
            else {
                if (includedCategories.indexOf(entry) === -1) {
                    includedCategories.push(entry);
                }
            }
            return '';
        });
        return { value, includedCategories, excludedCategories };
    }
    filterInstalledExtensions(local, runningExtensions, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value
            .replace(/@installed/g, '')
            .replace(/@sort:(\w+)(-\w*)?/g, '')
            .trim()
            .toLowerCase();
        const matchingText = (e) => (e.name.toLowerCase().indexOf(value) > -1 ||
            e.displayName.toLowerCase().indexOf(value) > -1 ||
            e.description.toLowerCase().indexOf(value) > -1) &&
            this.filterExtensionByCategory(e, includedCategories, excludedCategories);
        let result;
        if (options.sortBy !== undefined) {
            result = local.filter((e) => !e.isBuiltin && matchingText(e));
            result = this.sortExtensions(result, options);
        }
        else {
            result = local.filter((e) => (!e.isBuiltin || e.outdated || e.runtimeState !== undefined) && matchingText(e));
            const runningExtensionsById = runningExtensions.reduce((result, e) => {
                result.set(e.identifier.value, e);
                return result;
            }, new ExtensionIdentifierMap());
            const defaultSort = (e1, e2) => {
                const running1 = runningExtensionsById.get(e1.identifier.id);
                const isE1Running = !!running1 &&
                    this.extensionManagementServerService.getExtensionManagementServer(toExtension(running1)) === e1.server;
                const running2 = runningExtensionsById.get(e2.identifier.id);
                const isE2Running = running2 &&
                    this.extensionManagementServerService.getExtensionManagementServer(toExtension(running2)) === e2.server;
                if (isE1Running && isE2Running) {
                    return e1.displayName.localeCompare(e2.displayName);
                }
                const isE1LanguagePackExtension = e1.local && isLanguagePackExtension(e1.local.manifest);
                const isE2LanguagePackExtension = e2.local && isLanguagePackExtension(e2.local.manifest);
                if (!isE1Running && !isE2Running) {
                    if (isE1LanguagePackExtension) {
                        return -1;
                    }
                    if (isE2LanguagePackExtension) {
                        return 1;
                    }
                    return e1.displayName.localeCompare(e2.displayName);
                }
                if ((isE1Running && isE2LanguagePackExtension) ||
                    (isE2Running && isE1LanguagePackExtension)) {
                    return e1.displayName.localeCompare(e2.displayName);
                }
                return isE1Running ? -1 : 1;
            };
            const incompatible = [];
            const deprecated = [];
            const outdated = [];
            const actionRequired = [];
            const noActionRequired = [];
            for (const e of result) {
                if (e.enablementState === 6 /* EnablementState.DisabledByInvalidExtension */) {
                    incompatible.push(e);
                }
                else if (e.deprecationInfo) {
                    deprecated.push(e);
                }
                else if (e.outdated &&
                    this.extensionEnablementService.isEnabledEnablementState(e.enablementState)) {
                    outdated.push(e);
                }
                else if (e.runtimeState) {
                    actionRequired.push(e);
                }
                else {
                    noActionRequired.push(e);
                }
            }
            result = [
                ...incompatible.sort(defaultSort),
                ...deprecated.sort(defaultSort),
                ...outdated.sort(defaultSort),
                ...actionRequired.sort(defaultSort),
                ...noActionRequired.sort(defaultSort),
            ];
        }
        return result;
    }
    filterOutdatedExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value
            .replace(/@outdated/g, '')
            .replace(/@sort:(\w+)(-\w*)?/g, '')
            .trim()
            .toLowerCase();
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter((extension) => extension.outdated &&
            (extension.name.toLowerCase().indexOf(value) > -1 ||
                extension.displayName.toLowerCase().indexOf(value) > -1) &&
            this.filterExtensionByCategory(extension, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterDisabledExtensions(local, runningExtensions, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value
            .replace(/@disabled/g, '')
            .replace(/@sort:(\w+)(-\w*)?/g, '')
            .trim()
            .toLowerCase();
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter((e) => runningExtensions.every((r) => !areSameExtensions({ id: r.identifier.value, uuid: r.uuid }, e.identifier)) &&
            (e.name.toLowerCase().indexOf(value) > -1 ||
                e.displayName.toLowerCase().indexOf(value) > -1) &&
            this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterEnabledExtensions(local, runningExtensions, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value
            ? value
                .replace(/@enabled/g, '')
                .replace(/@sort:(\w+)(-\w*)?/g, '')
                .trim()
                .toLowerCase()
            : '';
        local = local.filter((e) => !e.isBuiltin);
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter((e) => runningExtensions.some((r) => areSameExtensions({ id: r.identifier.value, uuid: r.uuid }, e.identifier)) &&
            (e.name.toLowerCase().indexOf(value) > -1 ||
                e.displayName.toLowerCase().indexOf(value) > -1) &&
            this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterWorkspaceUnsupportedExtensions(local, query, options) {
        // shows local extensions which are restricted or disabled in the current workspace because of the extension's capability
        const queryString = query.value; // @sortby is already filtered out
        const match = queryString.match(/^\s*@workspaceUnsupported(?::(untrusted|virtual)(Partial)?)?(?:\s+([^\s]*))?/i);
        if (!match) {
            return [];
        }
        const type = match[1]?.toLowerCase();
        const partial = !!match[2];
        const nameFilter = match[3]?.toLowerCase();
        if (nameFilter) {
            local = local.filter((extension) => extension.name.toLowerCase().indexOf(nameFilter) > -1 ||
                extension.displayName.toLowerCase().indexOf(nameFilter) > -1);
        }
        const hasVirtualSupportType = (extension, supportType) => {
            return (extension.local &&
                this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(extension.local.manifest) === supportType);
        };
        const hasRestrictedSupportType = (extension, supportType) => {
            if (!extension.local) {
                return false;
            }
            const enablementState = this.extensionEnablementService.getEnablementState(extension.local);
            if (enablementState !== 11 /* EnablementState.EnabledGlobally */ &&
                enablementState !== 12 /* EnablementState.EnabledWorkspace */ &&
                enablementState !== 0 /* EnablementState.DisabledByTrustRequirement */ &&
                enablementState !== 8 /* EnablementState.DisabledByExtensionDependency */) {
                return false;
            }
            if (this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(extension.local.manifest) === supportType) {
                return true;
            }
            if (supportType === false) {
                const dependencies = getExtensionDependencies(local.map((ext) => ext.local), extension.local);
                return dependencies.some((ext) => this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(ext.manifest) === supportType);
            }
            return false;
        };
        const inVirtualWorkspace = isVirtualWorkspace(this.workspaceService.getWorkspace());
        const inRestrictedWorkspace = !this.workspaceTrustManagementService.isWorkspaceTrusted();
        if (type === 'virtual') {
            // show limited and disabled extensions unless disabled because of a untrusted workspace
            local = local.filter((extension) => inVirtualWorkspace &&
                hasVirtualSupportType(extension, partial ? 'limited' : false) &&
                !(inRestrictedWorkspace && hasRestrictedSupportType(extension, false)));
        }
        else if (type === 'untrusted') {
            // show limited and disabled extensions unless disabled because of a virtual workspace
            local = local.filter((extension) => hasRestrictedSupportType(extension, partial ? 'limited' : false) &&
                !(inVirtualWorkspace && hasVirtualSupportType(extension, false)));
        }
        else {
            // show extensions that are restricted or disabled in the current workspace
            local = local.filter((extension) => (inVirtualWorkspace && !hasVirtualSupportType(extension, true)) ||
                (inRestrictedWorkspace && !hasRestrictedSupportType(extension, true)));
        }
        return this.sortExtensions(local, options);
    }
    async filterDeprecatedExtensions(local, query, options) {
        const value = query.value
            .replace(/@deprecated/g, '')
            .replace(/@sort:(\w+)(-\w*)?/g, '')
            .trim()
            .toLowerCase();
        const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
        const deprecatedExtensionIds = Object.keys(extensionsControlManifest.deprecated);
        local = local.filter((e) => deprecatedExtensionIds.includes(e.identifier.id) &&
            (!value ||
                e.name.toLowerCase().indexOf(value) > -1 ||
                e.displayName.toLowerCase().indexOf(value) > -1));
        return this.sortExtensions(local, options);
    }
    filterRecentlyUpdatedExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        const currentTime = Date.now();
        local = local.filter((e) => !e.isBuiltin &&
            !e.outdated &&
            e.local?.updated &&
            e.local?.installedTimestamp !== undefined &&
            currentTime - e.local.installedTimestamp < ExtensionsListView_1.RECENT_UPDATE_DURATION);
        value = value
            .replace(/@recentlyUpdated/g, '')
            .replace(/@sort:(\w+)(-\w*)?/g, '')
            .trim()
            .toLowerCase();
        const result = local.filter((e) => (e.name.toLowerCase().indexOf(value) > -1 ||
            e.displayName.toLowerCase().indexOf(value) > -1) &&
            this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        options.sortBy = options.sortBy ?? "UpdateDate" /* LocalSortBy.UpdateDate */;
        return this.sortExtensions(result, options);
    }
    filterExtensionsByFeature(local, query) {
        const value = query.value.replace(/@feature:/g, '').trim();
        const featureId = value.split(' ')[0];
        const feature = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeature(featureId);
        if (!feature) {
            return undefined;
        }
        if (this.extensionsViewState) {
            this.extensionsViewState.filters.featureId = featureId;
        }
        const renderer = feature.renderer
            ? this.instantiationService.createInstance(feature.renderer)
            : undefined;
        try {
            const result = [];
            for (const e of local) {
                if (!e.local) {
                    continue;
                }
                const accessData = this.extensionFeaturesManagementService.getAccessData(new ExtensionIdentifier(e.identifier.id), featureId);
                const shouldRender = renderer?.shouldRender(e.local.manifest);
                if (accessData || shouldRender) {
                    result.push([e, accessData?.accessTimes.length ?? 0]);
                }
            }
            return {
                extensions: result.sort(([, a], [, b]) => b - a).map(([e]) => e),
                description: localize('showingExtensionsForFeature', 'Extensions using {0} in the last 30 days', feature.label),
            };
        }
        finally {
            renderer?.dispose();
        }
    }
    mergeAddedExtensions(extensions, newExtensions) {
        const oldExtensions = [...extensions];
        const findPreviousExtensionIndex = (from) => {
            let index = -1;
            const previousExtensionInNew = newExtensions[from];
            if (previousExtensionInNew) {
                index = oldExtensions.findIndex((e) => areSameExtensions(e.identifier, previousExtensionInNew.identifier));
                if (index === -1) {
                    return findPreviousExtensionIndex(from - 1);
                }
            }
            return index;
        };
        let hasChanged = false;
        for (let index = 0; index < newExtensions.length; index++) {
            const extension = newExtensions[index];
            if (extensions.every((r) => !areSameExtensions(r.identifier, extension.identifier))) {
                hasChanged = true;
                extensions.splice(findPreviousExtensionIndex(index - 1) + 1, 0, extension);
            }
        }
        return hasChanged ? extensions : undefined;
    }
    async queryGallery(query, options, token) {
        const hasUserDefinedSortOrder = options.sortBy !== undefined;
        if (!hasUserDefinedSortOrder && !query.value.trim()) {
            options.sortBy = "InstallCount" /* GallerySortBy.InstallCount */;
        }
        if (this.isRecommendationsQuery(query)) {
            return this.queryRecommendations(query, options, token);
        }
        const text = query.value;
        if (!text) {
            options.source = 'viewlet';
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return new PagedModel(pager);
        }
        if (/\bext:([^\s]+)\b/g.test(text)) {
            options.text = text;
            options.source = 'file-extension-tags';
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return new PagedModel(pager);
        }
        options.text = text.substring(0, 350);
        options.source = 'searchText';
        if (hasUserDefinedSortOrder ||
            /\b(category|tag):([^\s]+)\b/gi.test(text) ||
            /\bfeatured(\s+|\b|$)/gi.test(text)) {
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return new PagedModel(pager);
        }
        const [pager, preferredExtensions] = await Promise.all([
            this.extensionsWorkbenchService.queryGallery(options, token),
            this.getPreferredExtensions(options.text.toLowerCase(), token).catch(() => []),
        ]);
        return preferredExtensions.length
            ? new PreferredExtensionsPagedModel(preferredExtensions, pager)
            : new PagedModel(pager);
    }
    async getPreferredExtensions(searchText, token) {
        const preferredExtensions = this.extensionsWorkbenchService.local.filter((e) => !e.isBuiltin &&
            (e.name.toLowerCase().indexOf(searchText) > -1 ||
                e.displayName.toLowerCase().indexOf(searchText) > -1 ||
                e.description.toLowerCase().indexOf(searchText) > -1));
        const preferredExtensionUUIDs = new Set();
        if (preferredExtensions.length) {
            // Update gallery data for preferred extensions if they are not yet fetched
            const extesionsToFetch = [];
            for (const extension of preferredExtensions) {
                if (extension.identifier.uuid) {
                    preferredExtensionUUIDs.add(extension.identifier.uuid);
                }
                if (!extension.gallery && extension.identifier.uuid) {
                    extesionsToFetch.push(extension.identifier);
                }
            }
            if (extesionsToFetch.length) {
                this.extensionsWorkbenchService
                    .getExtensions(extesionsToFetch, CancellationToken.None)
                    .catch((e) => null /*ignore error*/);
            }
        }
        const preferredResults = [];
        try {
            const manifest = await this.extensionManagementService.getExtensionsControlManifest();
            if (Array.isArray(manifest.search)) {
                for (const s of manifest.search) {
                    if (s.query &&
                        s.query.toLowerCase() === searchText &&
                        Array.isArray(s.preferredResults)) {
                        preferredResults.push(...s.preferredResults);
                        break;
                    }
                }
            }
            if (preferredResults.length) {
                const result = await this.extensionsWorkbenchService.getExtensions(preferredResults.map((id) => ({ id })), token);
                for (const extension of result) {
                    if (extension.identifier.uuid &&
                        !preferredExtensionUUIDs.has(extension.identifier.uuid)) {
                        preferredExtensions.push(extension);
                    }
                }
            }
        }
        catch (e) {
            this.logService.warn('Failed to get preferred results from the extensions control manifest.', e);
        }
        return preferredExtensions;
    }
    sortExtensions(extensions, options) {
        switch (options.sortBy) {
            case "InstallCount" /* GallerySortBy.InstallCount */:
                extensions = extensions.sort((e1, e2) => typeof e2.installCount === 'number' && typeof e1.installCount === 'number'
                    ? e2.installCount - e1.installCount
                    : NaN);
                break;
            case "UpdateDate" /* LocalSortBy.UpdateDate */:
                extensions = extensions.sort((e1, e2) => typeof e2.local?.installedTimestamp === 'number' &&
                    typeof e1.local?.installedTimestamp === 'number'
                    ? e2.local.installedTimestamp - e1.local.installedTimestamp
                    : typeof e2.local?.installedTimestamp === 'number'
                        ? 1
                        : typeof e1.local?.installedTimestamp === 'number'
                            ? -1
                            : NaN);
                break;
            case "AverageRating" /* GallerySortBy.AverageRating */:
            case "WeightedRating" /* GallerySortBy.WeightedRating */:
                extensions = extensions.sort((e1, e2) => typeof e2.rating === 'number' && typeof e1.rating === 'number'
                    ? e2.rating - e1.rating
                    : NaN);
                break;
            default:
                extensions = extensions.sort((e1, e2) => e1.displayName.localeCompare(e2.displayName));
                break;
        }
        if (options.sortOrder === 2 /* SortOrder.Descending */) {
            extensions = extensions.reverse();
        }
        return extensions;
    }
    isRecommendationsQuery(query) {
        return (ExtensionsListView_1.isWorkspaceRecommendedExtensionsQuery(query.value) ||
            ExtensionsListView_1.isKeymapsRecommendedExtensionsQuery(query.value) ||
            ExtensionsListView_1.isLanguageRecommendedExtensionsQuery(query.value) ||
            ExtensionsListView_1.isExeRecommendedExtensionsQuery(query.value) ||
            ExtensionsListView_1.isRemoteRecommendedExtensionsQuery(query.value) ||
            /@recommended:all/i.test(query.value) ||
            ExtensionsListView_1.isSearchRecommendedExtensionsQuery(query.value) ||
            ExtensionsListView_1.isRecommendedExtensionsQuery(query.value));
    }
    async queryRecommendations(query, options, token) {
        // Workspace recommendations
        if (ExtensionsListView_1.isWorkspaceRecommendedExtensionsQuery(query.value)) {
            return this.getWorkspaceRecommendationsModel(query, options, token);
        }
        // Keymap recommendations
        if (ExtensionsListView_1.isKeymapsRecommendedExtensionsQuery(query.value)) {
            return this.getKeymapRecommendationsModel(query, options, token);
        }
        // Language recommendations
        if (ExtensionsListView_1.isLanguageRecommendedExtensionsQuery(query.value)) {
            return this.getLanguageRecommendationsModel(query, options, token);
        }
        // Exe recommendations
        if (ExtensionsListView_1.isExeRecommendedExtensionsQuery(query.value)) {
            return this.getExeRecommendationsModel(query, options, token);
        }
        // Remote recommendations
        if (ExtensionsListView_1.isRemoteRecommendedExtensionsQuery(query.value)) {
            return this.getRemoteRecommendationsModel(query, options, token);
        }
        // All recommendations
        if (/@recommended:all/i.test(query.value)) {
            return this.getAllRecommendationsModel(options, token);
        }
        // Search recommendations
        if (ExtensionsListView_1.isSearchRecommendedExtensionsQuery(query.value) ||
            (ExtensionsListView_1.isRecommendedExtensionsQuery(query.value) && options.sortBy !== undefined)) {
            return this.searchRecommendations(query, options, token);
        }
        // Other recommendations
        if (ExtensionsListView_1.isRecommendedExtensionsQuery(query.value)) {
            return this.getOtherRecommendationsModel(query, options, token);
        }
        return new PagedModel([]);
    }
    async getInstallableRecommendations(recommendations, options, token) {
        const result = [];
        if (recommendations.length) {
            const galleryExtensions = [];
            const resourceExtensions = [];
            for (const recommendation of recommendations) {
                if (typeof recommendation === 'string') {
                    galleryExtensions.push(recommendation);
                }
                else {
                    resourceExtensions.push(recommendation);
                }
            }
            if (galleryExtensions.length) {
                try {
                    const extensions = await this.extensionsWorkbenchService.getExtensions(galleryExtensions.map((id) => ({ id })), { source: options.source }, token);
                    for (const extension of extensions) {
                        if (extension.gallery &&
                            !extension.deprecationInfo &&
                            (await this.extensionManagementService.canInstall(extension.gallery)) === true) {
                            result.push(extension);
                        }
                    }
                }
                catch (error) {
                    if (!resourceExtensions.length || !this.isOfflineError(error)) {
                        throw error;
                    }
                }
            }
            if (resourceExtensions.length) {
                const extensions = await this.extensionsWorkbenchService.getResourceExtensions(resourceExtensions, true);
                for (const extension of extensions) {
                    if ((await this.extensionsWorkbenchService.canInstall(extension)) === true) {
                        result.push(extension);
                    }
                }
            }
        }
        return result;
    }
    async getWorkspaceRecommendations() {
        const recommendations = await this.extensionRecommendationsService.getWorkspaceRecommendations();
        const { important } = await this.extensionRecommendationsService.getConfigBasedRecommendations();
        for (const configBasedRecommendation of important) {
            if (!recommendations.find((extensionId) => extensionId === configBasedRecommendation)) {
                recommendations.push(configBasedRecommendation);
            }
        }
        return recommendations;
    }
    async getWorkspaceRecommendationsModel(query, options, token) {
        const recommendations = await this.getWorkspaceRecommendations();
        const installableRecommendations = await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-workspace' }, token);
        return new PagedModel(installableRecommendations);
    }
    async getKeymapRecommendationsModel(query, options, token) {
        const value = query.value
            .replace(/@recommended:keymaps/g, '')
            .trim()
            .toLowerCase();
        const recommendations = this.extensionRecommendationsService.getKeymapRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-keymaps' }, token)).filter((extension) => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getLanguageRecommendationsModel(query, options, token) {
        const value = query.value
            .replace(/@recommended:languages/g, '')
            .trim()
            .toLowerCase();
        const recommendations = this.extensionRecommendationsService.getLanguageRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-languages' }, token)).filter((extension) => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getRemoteRecommendationsModel(query, options, token) {
        const value = query.value
            .replace(/@recommended:remotes/g, '')
            .trim()
            .toLowerCase();
        const recommendations = this.extensionRecommendationsService.getRemoteRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-remotes' }, token)).filter((extension) => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getExeRecommendationsModel(query, options, token) {
        const exe = query.value.replace(/@exe:/g, '').trim().toLowerCase();
        const { important, others } = await this.extensionRecommendationsService.getExeBasedRecommendations(exe.startsWith('"') ? exe.substring(1, exe.length - 1) : exe);
        const installableRecommendations = await this.getInstallableRecommendations([...important, ...others], { ...options, source: 'recommendations-exe' }, token);
        return new PagedModel(installableRecommendations);
    }
    async getOtherRecommendationsModel(query, options, token) {
        const otherRecommendations = await this.getOtherRecommendations();
        const installableRecommendations = await this.getInstallableRecommendations(otherRecommendations, { ...options, source: 'recommendations-other', sortBy: undefined }, token);
        const result = coalesce(otherRecommendations.map((id) => installableRecommendations.find((i) => areSameExtensions(i.identifier, { id }))));
        return new PagedModel(result);
    }
    async getOtherRecommendations() {
        const local = (await this.extensionsWorkbenchService.queryLocal(this.options.server)).map((e) => e.identifier.id.toLowerCase());
        const workspaceRecommendations = (await this.getWorkspaceRecommendations()).map((extensionId) => (isString(extensionId) ? extensionId.toLowerCase() : extensionId));
        return distinct((await Promise.all([
            // Order is important
            this.extensionRecommendationsService.getImportantRecommendations(),
            this.extensionRecommendationsService.getFileBasedRecommendations(),
            this.extensionRecommendationsService.getOtherRecommendations(),
        ]))
            .flat()
            .filter((extensionId) => !local.includes(extensionId.toLowerCase()) &&
            !workspaceRecommendations.includes(extensionId.toLowerCase())), (extensionId) => extensionId.toLowerCase());
    }
    // Get All types of recommendations, trimmed to show a max of 8 at any given time
    async getAllRecommendationsModel(options, token) {
        const localExtensions = await this.extensionsWorkbenchService.queryLocal(this.options.server);
        const localExtensionIds = localExtensions.map((e) => e.identifier.id.toLowerCase());
        const allRecommendations = distinct((await Promise.all([
            // Order is important
            this.getWorkspaceRecommendations(),
            this.extensionRecommendationsService.getImportantRecommendations(),
            this.extensionRecommendationsService.getFileBasedRecommendations(),
            this.extensionRecommendationsService.getOtherRecommendations(),
        ]))
            .flat()
            .filter((extensionId) => {
            if (isString(extensionId)) {
                return !localExtensionIds.includes(extensionId.toLowerCase());
            }
            return !localExtensions.some((localExtension) => localExtension.local &&
                this.uriIdentityService.extUri.isEqual(localExtension.local.location, extensionId));
        }));
        const installableRecommendations = await this.getInstallableRecommendations(allRecommendations, { ...options, source: 'recommendations-all', sortBy: undefined }, token);
        const result = [];
        for (let i = 0; i < installableRecommendations.length && result.length < 8; i++) {
            const recommendation = allRecommendations[i];
            if (isString(recommendation)) {
                const extension = installableRecommendations.find((extension) => areSameExtensions(extension.identifier, { id: recommendation }));
                if (extension) {
                    result.push(extension);
                }
            }
            else {
                const extension = installableRecommendations.find((extension) => extension.resourceExtension &&
                    this.uriIdentityService.extUri.isEqual(extension.resourceExtension.location, recommendation));
                if (extension) {
                    result.push(extension);
                }
            }
        }
        return new PagedModel(result);
    }
    async searchRecommendations(query, options, token) {
        const value = query.value
            .replace(/@recommended/g, '')
            .trim()
            .toLowerCase();
        const recommendations = distinct([
            ...(await this.getWorkspaceRecommendations()),
            ...(await this.getOtherRecommendations()),
        ]);
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations', sortBy: undefined }, token)).filter((extension) => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(this.sortExtensions(installableRecommendations, options));
    }
    setModel(model, message, donotResetScrollTop) {
        if (this.list) {
            this.list.model = new DelayedPagedModel(model);
            this.updateBody(message);
            if (!donotResetScrollTop) {
                this.list.scrollTop = 0;
            }
        }
        if (this.badge) {
            this.badge.setCount(this.count());
        }
    }
    updateModel(model) {
        if (this.list) {
            this.list.model = new DelayedPagedModel(model);
            this.updateBody();
        }
        if (this.badge) {
            this.badge.setCount(this.count());
        }
    }
    updateBody(message) {
        if (this.bodyTemplate) {
            const count = this.count();
            this.bodyTemplate.extensionsList.classList.toggle('hidden', count === 0);
            this.bodyTemplate.messageContainer.classList.toggle('hidden', !message && count > 0);
            if (this.isBodyVisible()) {
                if (message) {
                    this.bodyTemplate.messageSeverityIcon.className = SeverityIcon.className(message.severity);
                    this.bodyTemplate.messageBox.textContent = message.text;
                }
                else if (this.count() === 0) {
                    this.bodyTemplate.messageSeverityIcon.className = '';
                    this.bodyTemplate.messageBox.textContent = localize('no extensions found', 'No extensions found.');
                }
                if (this.bodyTemplate.messageBox.textContent) {
                    alert(this.bodyTemplate.messageBox.textContent);
                }
            }
        }
        this.updateSize();
    }
    getMessage(error) {
        if (this.isOfflineError(error)) {
            return {
                text: localize('offline error', 'Unable to search the Marketplace when offline, please check your network connection.'),
                severity: Severity.Warning,
            };
        }
        else {
            return {
                text: localize('error', 'Error while fetching extensions. {0}', getErrorMessage(error)),
                severity: Severity.Error,
            };
        }
    }
    isOfflineError(error) {
        if (error instanceof ExtensionGalleryError) {
            return error.code === "Offline" /* ExtensionGalleryErrorCode.Offline */;
        }
        return isOfflineError(error);
    }
    updateSize() {
        if (this.options.flexibleHeight) {
            this.maximumBodySize = this.list?.model.length ? Number.POSITIVE_INFINITY : 0;
            this.storageService.store(`${this.id}.size`, this.list?.model.length || 0, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    openExtension(extension, options) {
        extension =
            this.extensionsWorkbenchService.local.filter((e) => areSameExtensions(e.identifier, extension.identifier))[0] || extension;
        this.extensionsWorkbenchService
            .open(extension, options)
            .then(undefined, (err) => this.onError(err));
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        const message = (err && err.message) || '';
        if (/ECONNREFUSED/.test(message)) {
            const error = createErrorWithActions(localize('suggestProxyError', "Marketplace returned 'ECONNREFUSED'. Please check the 'http.proxy' setting."), [
                new Action('open user settings', localize('open user settings', 'Open User Settings'), undefined, true, () => this.preferencesService.openUserSettings()),
            ]);
            this.notificationService.error(error);
            return;
        }
        this.notificationService.error(err);
    }
    dispose() {
        super.dispose();
        if (this.queryRequest) {
            this.queryRequest.request.cancel();
            this.queryRequest = null;
        }
        if (this.queryResult) {
            this.queryResult.disposables.dispose();
            this.queryResult = undefined;
        }
        this.list = null;
    }
    static isLocalExtensionsQuery(query, sortBy) {
        return (this.isInstalledExtensionsQuery(query) ||
            this.isSearchInstalledExtensionsQuery(query) ||
            this.isOutdatedExtensionsQuery(query) ||
            this.isEnabledExtensionsQuery(query) ||
            this.isDisabledExtensionsQuery(query) ||
            this.isBuiltInExtensionsQuery(query) ||
            this.isSearchBuiltInExtensionsQuery(query) ||
            this.isBuiltInGroupExtensionsQuery(query) ||
            this.isSearchDeprecatedExtensionsQuery(query) ||
            this.isSearchWorkspaceUnsupportedExtensionsQuery(query) ||
            this.isSearchRecentlyUpdatedQuery(query) ||
            this.isSearchExtensionUpdatesQuery(query) ||
            this.isSortInstalledExtensionsQuery(query, sortBy) ||
            this.isFeatureExtensionsQuery(query));
    }
    static isSearchBuiltInExtensionsQuery(query) {
        return /@builtin\s.+/i.test(query);
    }
    static isBuiltInExtensionsQuery(query) {
        return /^\s*@builtin$/i.test(query.trim());
    }
    static isBuiltInGroupExtensionsQuery(query) {
        return /^\s*@builtin:.+$/i.test(query.trim());
    }
    static isSearchWorkspaceUnsupportedExtensionsQuery(query) {
        return /^\s*@workspaceUnsupported(:(untrusted|virtual)(Partial)?)?(\s|$)/i.test(query);
    }
    static isInstalledExtensionsQuery(query) {
        return /@installed$/i.test(query);
    }
    static isSearchInstalledExtensionsQuery(query) {
        return /@installed\s./i.test(query) || this.isFeatureExtensionsQuery(query);
    }
    static isOutdatedExtensionsQuery(query) {
        return /@outdated/i.test(query);
    }
    static isEnabledExtensionsQuery(query) {
        return /@enabled/i.test(query);
    }
    static isDisabledExtensionsQuery(query) {
        return /@disabled/i.test(query);
    }
    static isSearchDeprecatedExtensionsQuery(query) {
        return /@deprecated\s?.*/i.test(query);
    }
    static isRecommendedExtensionsQuery(query) {
        return /^@recommended$/i.test(query.trim());
    }
    static isSearchRecommendedExtensionsQuery(query) {
        return /@recommended\s.+/i.test(query);
    }
    static isWorkspaceRecommendedExtensionsQuery(query) {
        return /@recommended:workspace/i.test(query);
    }
    static isExeRecommendedExtensionsQuery(query) {
        return /@exe:.+/i.test(query);
    }
    static isRemoteRecommendedExtensionsQuery(query) {
        return /@recommended:remotes/i.test(query);
    }
    static isKeymapsRecommendedExtensionsQuery(query) {
        return /@recommended:keymaps/i.test(query);
    }
    static isLanguageRecommendedExtensionsQuery(query) {
        return /@recommended:languages/i.test(query);
    }
    static isSortInstalledExtensionsQuery(query, sortBy) {
        return ((sortBy !== undefined && sortBy !== '' && query === '') ||
            (!sortBy && /^@sort:\S*$/i.test(query)));
    }
    static isSearchPopularQuery(query) {
        return /@popular/i.test(query);
    }
    static isSearchRecentlyPublishedQuery(query) {
        return /@recentlyPublished/i.test(query);
    }
    static isSearchRecentlyUpdatedQuery(query) {
        return /@recentlyUpdated/i.test(query);
    }
    static isSearchExtensionUpdatesQuery(query) {
        return /@updates/i.test(query);
    }
    static isSortUpdateDateQuery(query) {
        return /@sort:updateDate/i.test(query);
    }
    static isFeatureExtensionsQuery(query) {
        return /@feature:/i.test(query);
    }
    focus() {
        super.focus();
        if (!this.list) {
            return;
        }
        if (!(this.list.getFocus().length || this.list.getSelection().length)) {
            this.list.focusNext();
        }
        this.list.domFocus();
    }
};
ExtensionsListView = ExtensionsListView_1 = __decorate([
    __param(2, INotificationService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IExtensionService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionRecommendationsService),
    __param(10, ITelemetryService),
    __param(11, IHoverService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IExtensionManagementServerService),
    __param(15, IExtensionManifestPropertiesService),
    __param(16, IWorkbenchExtensionManagementService),
    __param(17, IWorkspaceContextService),
    __param(18, IProductService),
    __param(19, IContextKeyService),
    __param(20, IViewDescriptorService),
    __param(21, IOpenerService),
    __param(22, IPreferencesService),
    __param(23, IStorageService),
    __param(24, IWorkspaceTrustManagementService),
    __param(25, IWorkbenchExtensionEnablementService),
    __param(26, IWorkbenchLayoutService),
    __param(27, IExtensionFeaturesManagementService),
    __param(28, IUriIdentityService),
    __param(29, ILogService)
], ExtensionsListView);
export { ExtensionsListView };
export class DefaultPopularExtensionsView extends ExtensionsListView {
    async show() {
        const query = this.extensionManagementServerService.webExtensionManagementServer &&
            !this.extensionManagementServerService.localExtensionManagementServer &&
            !this.extensionManagementServerService.remoteExtensionManagementServer
            ? '@web'
            : '';
        return super.show(query);
    }
}
export class ServerInstalledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@installed';
        if (!ExtensionsListView.isLocalExtensionsQuery(query) ||
            ExtensionsListView.isSortInstalledExtensionsQuery(query)) {
            query = query += ' @installed';
        }
        return super.show(query.trim());
    }
}
export class EnabledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query || '@enabled';
        return ExtensionsListView.isEnabledExtensionsQuery(query)
            ? super.show(query)
            : ExtensionsListView.isSortInstalledExtensionsQuery(query)
                ? super.show('@enabled ' + query)
                : this.showEmptyModel();
    }
}
export class DisabledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query || '@disabled';
        return ExtensionsListView.isDisabledExtensionsQuery(query)
            ? super.show(query)
            : ExtensionsListView.isSortInstalledExtensionsQuery(query)
                ? super.show('@disabled ' + query)
                : this.showEmptyModel();
    }
}
export class OutdatedExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@outdated';
        if (ExtensionsListView.isSearchExtensionUpdatesQuery(query)) {
            query = query.replace('@updates', '@outdated');
        }
        return super.show(query.trim());
    }
    updateSize() {
        super.updateSize();
        this.setExpanded(this.count() > 0);
    }
}
export class RecentlyUpdatedExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@recentlyUpdated';
        if (ExtensionsListView.isSearchExtensionUpdatesQuery(query)) {
            query = query.replace('@updates', '@recentlyUpdated');
        }
        return super.show(query.trim());
    }
}
let StaticQueryExtensionsView = class StaticQueryExtensionsView extends ExtensionsListView {
    constructor(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, preferencesService, storageService, workspaceTrustManagementService, extensionEnablementService, layoutService, extensionFeaturesManagementService, uriIdentityService, logService) {
        super(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, preferencesService, storageService, workspaceTrustManagementService, extensionEnablementService, layoutService, extensionFeaturesManagementService, uriIdentityService, logService);
        this.options = options;
    }
    show() {
        return super.show(this.options.query);
    }
};
StaticQueryExtensionsView = __decorate([
    __param(2, INotificationService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IExtensionService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionRecommendationsService),
    __param(10, ITelemetryService),
    __param(11, IHoverService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IExtensionManagementServerService),
    __param(15, IExtensionManifestPropertiesService),
    __param(16, IWorkbenchExtensionManagementService),
    __param(17, IWorkspaceContextService),
    __param(18, IProductService),
    __param(19, IContextKeyService),
    __param(20, IViewDescriptorService),
    __param(21, IOpenerService),
    __param(22, IPreferencesService),
    __param(23, IStorageService),
    __param(24, IWorkspaceTrustManagementService),
    __param(25, IWorkbenchExtensionEnablementService),
    __param(26, IWorkbenchLayoutService),
    __param(27, IExtensionFeaturesManagementService),
    __param(28, IUriIdentityService),
    __param(29, ILogService)
], StaticQueryExtensionsView);
export { StaticQueryExtensionsView };
function toSpecificWorkspaceUnsupportedQuery(query, qualifier) {
    if (!query) {
        return '@workspaceUnsupported:' + qualifier;
    }
    const match = query.match(new RegExp(`@workspaceUnsupported(:${qualifier})?(\\s|$)`, 'i'));
    if (match) {
        if (!match[1]) {
            return query.replace(/@workspaceUnsupported/gi, '@workspaceUnsupported:' + qualifier);
        }
        return query;
    }
    return undefined;
}
export class UntrustedWorkspaceUnsupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'untrusted');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class UntrustedWorkspacePartiallySupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'untrustedPartial');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class VirtualWorkspaceUnsupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'virtual');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class VirtualWorkspacePartiallySupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'virtualPartial');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class DeprecatedExtensionsView extends ExtensionsListView {
    async show(query) {
        return ExtensionsListView.isSearchDeprecatedExtensionsQuery(query)
            ? super.show(query)
            : this.showEmptyModel();
    }
}
export class SearchMarketplaceExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.reportSearchFinishedDelayer = this._register(new ThrottledDelayer(2000));
        this.searchWaitPromise = Promise.resolve();
    }
    async show(query) {
        const queryPromise = super.show(query);
        this.reportSearchFinishedDelayer.trigger(() => this.reportSearchFinished());
        this.searchWaitPromise = queryPromise.then(null, null);
        return queryPromise;
    }
    async reportSearchFinished() {
        await this.searchWaitPromise;
        this.telemetryService.publicLog2('extensionsView:MarketplaceSearchFinished');
    }
}
export class DefaultRecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended:all';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => {
            this.show('');
        }));
    }
    async show(query) {
        if (query && query.trim() !== this.recommendedExtensionsQuery) {
            return this.showEmptyModel();
        }
        const model = await super.show(this.recommendedExtensionsQuery);
        if (!this.extensionsWorkbenchService.local.some((e) => !e.isBuiltin)) {
            // This is part of popular extensions view. Collapse if no installed extensions.
            this.setExpanded(model.length > 0);
        }
        return model;
    }
}
export class RecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => {
            this.show('');
        }));
    }
    async show(query) {
        return query && query.trim() !== this.recommendedExtensionsQuery
            ? this.showEmptyModel()
            : super.show(this.recommendedExtensionsQuery);
    }
}
export class WorkspaceRecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended:workspace';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => this.show(this.recommendedExtensionsQuery)));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.show(this.recommendedExtensionsQuery)));
    }
    async show(query) {
        const shouldShowEmptyView = query && query.trim() !== '@recommended' && query.trim() !== '@recommended:workspace';
        const model = await (shouldShowEmptyView
            ? this.showEmptyModel()
            : super.show(this.recommendedExtensionsQuery));
        this.setExpanded(model.length > 0);
        return model;
    }
    async getInstallableWorkspaceRecommendations() {
        const installed = (await this.extensionsWorkbenchService.queryLocal()).filter((l) => l.enablementState !== 1 /* EnablementState.DisabledByExtensionKind */); // Filter extensions disabled by kind
        const recommendations = (await this.getWorkspaceRecommendations()).filter((recommendation) => installed.every((local) => isString(recommendation)
            ? !areSameExtensions({ id: recommendation }, local.identifier)
            : !this.uriIdentityService.extUri.isEqual(recommendation, local.local?.location)));
        return this.getInstallableRecommendations(recommendations, { source: 'install-all-workspace-recommendations' }, CancellationToken.None);
    }
    async installWorkspaceRecommendations() {
        const installableRecommendations = await this.getInstallableWorkspaceRecommendations();
        if (installableRecommendations.length) {
            const galleryExtensions = [];
            const resourceExtensions = [];
            for (const recommendation of installableRecommendations) {
                if (recommendation.gallery) {
                    galleryExtensions.push({ extension: recommendation.gallery, options: {} });
                }
                else {
                    resourceExtensions.push(recommendation);
                }
            }
            await Promise.all([
                this.extensionManagementService.installGalleryExtensions(galleryExtensions),
                ...resourceExtensions.map((extension) => this.extensionsWorkbenchService.install(extension)),
            ]);
        }
        else {
            this.notificationService.notify({
                severity: Severity.Info,
                message: localize('no local extensions', 'There are no extensions to install.'),
            });
        }
    }
}
export function getAriaLabelForExtension(extension) {
    if (!extension) {
        return '';
    }
    const publisher = extension.publisherDomain?.verified
        ? localize('extension.arialabel.verifiedPublisher', 'Verified Publisher {0}', extension.publisherDisplayName)
        : localize('extension.arialabel.publisher', 'Publisher {0}', extension.publisherDisplayName);
    const deprecated = extension?.deprecationInfo
        ? localize('extension.arialabel.deprecated', 'Deprecated')
        : '';
    const rating = extension?.rating
        ? localize('extension.arialabel.rating', 'Rated {0} out of 5 stars by {1} users', extension.rating.toFixed(2), extension.ratingCount)
        : '';
    return `${extension.displayName}, ${deprecated ? `${deprecated}, ` : ''}${extension.version}, ${publisher}, ${extension.description} ${rating ? `, ${rating}` : ''}`;
}
export class PreferredExtensionsPagedModel {
    constructor(preferredExtensions, pager) {
        this.preferredExtensions = preferredExtensions;
        this.pager = pager;
        this.resolved = new Map();
        this.preferredGalleryExtensions = new Set();
        this.resolvedGalleryExtensionsFromQuery = [];
        for (let i = 0; i < this.preferredExtensions.length; i++) {
            this.resolved.set(i, this.preferredExtensions[i]);
        }
        for (const e of preferredExtensions) {
            if (e.identifier.uuid) {
                this.preferredGalleryExtensions.add(e.identifier.uuid);
            }
        }
        // expected that all preferred gallery extensions will be part of the query results
        this.length =
            preferredExtensions.length - this.preferredGalleryExtensions.size + this.pager.total;
        const totalPages = Math.ceil(this.pager.total / this.pager.pageSize);
        this.populateResolvedExtensions(0, this.pager.firstPage);
        this.pages = range(totalPages - 1).map(() => ({
            promise: null,
            cts: null,
            promiseIndexes: new Set(),
        }));
    }
    isResolved(index) {
        return this.resolved.has(index);
    }
    get(index) {
        return this.resolved.get(index);
    }
    async resolve(index, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            throw new CancellationError();
        }
        if (this.isResolved(index)) {
            return this.get(index);
        }
        const indexInPagedModel = index - this.preferredExtensions.length + this.resolvedGalleryExtensionsFromQuery.length;
        const pageIndex = Math.floor(indexInPagedModel / this.pager.pageSize);
        const page = this.pages[pageIndex];
        if (!page.promise) {
            page.cts = new CancellationTokenSource();
            page.promise = this.pager
                .getPage(pageIndex, page.cts.token)
                .then((extensions) => this.populateResolvedExtensions(pageIndex, extensions))
                .catch((e) => {
                page.promise = null;
                throw e;
            })
                .finally(() => (page.cts = null));
        }
        const listener = cancellationToken.onCancellationRequested(() => {
            if (!page.cts) {
                return;
            }
            page.promiseIndexes.delete(index);
            if (page.promiseIndexes.size === 0) {
                page.cts.cancel();
            }
        });
        page.promiseIndexes.add(index);
        try {
            await page.promise;
        }
        finally {
            listener.dispose();
        }
        return this.get(index);
    }
    populateResolvedExtensions(pageIndex, extensions) {
        let adjustIndexOfNextPagesBy = 0;
        const pageStartIndex = pageIndex * this.pager.pageSize;
        for (let i = 0; i < extensions.length; i++) {
            const e = extensions[i];
            if (e.gallery?.identifier.uuid &&
                this.preferredGalleryExtensions.has(e.gallery.identifier.uuid)) {
                this.resolvedGalleryExtensionsFromQuery.push(e);
                adjustIndexOfNextPagesBy++;
            }
            else {
                this.resolved.set(this.preferredExtensions.length -
                    this.resolvedGalleryExtensionsFromQuery.length +
                    pageStartIndex +
                    i, e);
            }
        }
        // If this page has preferred gallery extensions, then adjust the index of the next pages
        // by the number of preferred gallery extensions found in this page. Because these preferred extensions
        // are already in the resolved list and since we did not add them now, we need to adjust the indices of the next pages.
        // Skip first page as the preferred extensions are always in the first page
        if (pageIndex !== 0 && adjustIndexOfNextPagesBy) {
            const nextPageStartIndex = (pageIndex + 1) * this.pager.pageSize;
            const indices = [...this.resolved.keys()].sort();
            for (const index of indices) {
                if (index >= nextPageStartIndex) {
                    const e = this.resolved.get(index);
                    if (e) {
                        this.resolved.delete(index);
                        this.resolved.set(index - adjustIndexOfNextPagesBy, e);
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc1ZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUNOLFVBQVUsRUFFVixpQkFBaUIsR0FFakIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBTU4scUJBQXFCLEdBQ3JCLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUVOLGlDQUFpQyxFQUVqQyxvQ0FBb0MsRUFDcEMsb0NBQW9DLEdBQ3BDLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDaEksT0FBTyxFQUNOLGlCQUFpQixFQUNqQix3QkFBd0IsR0FDeEIsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsTUFBTSxF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