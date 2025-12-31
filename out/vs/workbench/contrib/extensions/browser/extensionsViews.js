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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNWaWV3cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFDTixVQUFVLEVBRVYsaUJBQWlCLEdBRWpCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQU1OLHFCQUFxQixHQUNyQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFFTixpQ0FBaUMsRUFFakMsb0NBQW9DLEVBQ3BDLG9DQUFvQyxHQUNwQyxNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ2hJLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsd0JBQXdCLEdBQ3hCLE1BQU0sNEVBQTRFLENBQUE7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3hELE9BQU8sRUFDTiwyQkFBMkIsRUFJM0IsMkJBQTJCLEdBRTNCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLGVBQWUsR0FDZixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUNOLFFBQVEsRUFFUixtQkFBbUIsR0FDbkIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFXLE1BQU0sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0YsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixzQkFBc0IsRUFLdEIsdUJBQXVCLEdBQ3ZCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixnQkFBZ0IsR0FDaEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBQy9ILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzFHLE9BQU8sRUFDTix1QkFBdUIsR0FFdkIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxFQUVWLG1DQUFtQyxHQUVuQyxNQUFNLG1FQUFtRSxDQUFBO0FBRTFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFM0UsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQTtBQU9uQyxNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFBNUM7O1FBQ2tCLGFBQVEsR0FBd0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYyxDQUFDLENBQUE7UUFDakYsWUFBTyxHQUFzQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtRQUV4QyxZQUFPLEdBQXdCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWMsQ0FBQyxDQUFBO1FBQ2hGLFdBQU0sR0FBc0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFFL0MsMEJBQXFCLEdBQWlCLEVBQUUsQ0FBQTtRQUVoRCxZQUFPLEdBRUgsRUFBRSxDQUFBO0lBT1AsQ0FBQztJQUxBLGFBQWEsQ0FBQyxVQUF3QjtRQUNyQyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQy9FLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxVQUFVLENBQUE7UUFDdkMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtJQUNqRixDQUFDO0NBQ0Q7QUFnQkQsSUFBVyxXQUVWO0FBRkQsV0FBVyxXQUFXO0lBQ3JCLHdDQUF5QixDQUFBO0FBQzFCLENBQUMsRUFGVSxXQUFXLEtBQVgsV0FBVyxRQUVyQjtBQUVELFNBQVMsYUFBYSxDQUFDLEtBQVU7SUFDaEMsUUFBUSxLQUFvQixFQUFFLENBQUM7UUFDOUI7WUFDQyxPQUFPLElBQUksQ0FBQTtJQUNiLENBQUM7QUFDRixDQUFDO0FBS00sSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxRQUFROzthQUNoQywyQkFBc0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxBQUExQixDQUEwQixHQUFDLFNBQVM7SUFxQnpFLFlBQ29CLE9BQWtDLEVBQ3JELGtCQUF1QyxFQUNqQixtQkFBbUQsRUFDckQsaUJBQXFDLEVBQ3BDLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDbkQsWUFBMkIsRUFDdkIsZ0JBQW9ELEVBQzFDLDBCQUFpRSxFQUU5RiwrQkFBMkUsRUFDeEQsZ0JBQXNELEVBQzFELFlBQTJCLEVBQ25CLG9CQUEyQyxFQUN4QyxjQUFrRCxFQUU1RSxnQ0FBc0YsRUFFdEYsa0NBQXdGLEVBRXhGLDBCQUFtRixFQUN6RCxnQkFBNkQsRUFDdEUsY0FBa0QsRUFDL0MsaUJBQXFDLEVBQ2pDLHFCQUE2QyxFQUNyRCxhQUE2QixFQUN4QixrQkFBd0QsRUFDNUQsY0FBZ0QsRUFFakUsK0JBQWtGLEVBRWxGLDBCQUFpRixFQUN4RCxhQUF1RCxFQUVoRixrQ0FBd0YsRUFDbkUsa0JBQTBELEVBQ2xFLFVBQXdDO1FBRXJELEtBQUssQ0FDSjtZQUNDLEdBQUksa0JBQXVDO1lBQzNDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNO1lBQ3ZDLGVBQWUsRUFBRSxPQUFPLENBQUMsY0FBYztnQkFDdEMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxFQUFFLE9BQU8sZ0NBQXdCLENBQUMsQ0FBQztvQkFDbkYsQ0FBQyxDQUFDLFNBQVM7b0JBQ1gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLFNBQVM7U0FDWixFQUNELGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLGlCQUFpQixFQUNqQixxQkFBcUIsRUFDckIsb0JBQW9CLEVBQ3BCLGFBQWEsRUFDYixZQUFZLEVBQ1osWUFBWSxDQUNaLENBQUE7UUF6RGtCLFlBQU8sR0FBUCxPQUFPLENBQTJCO1FBRXJCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFLckMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNoQywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBRXBGLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBa0M7UUFDckMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUdyQyxtQkFBYyxHQUFkLGNBQWMsQ0FBMEI7UUFFekQscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztRQUVyRSx1Q0FBa0MsR0FBbEMsa0NBQWtDLENBQXFDO1FBRXJFLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBc0M7UUFDdEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUEwQjtRQUNuRCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFJN0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFFaEQsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQUVqRSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXNDO1FBQ3ZDLGtCQUFhLEdBQWIsYUFBYSxDQUF5QjtRQUUvRCx1Q0FBa0MsR0FBbEMsa0NBQWtDLENBQXFDO1FBQ2hELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDakQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQS9DOUMsU0FBSSxHQUEwQyxJQUFJLENBQUE7UUFDbEQsaUJBQVksR0FHVCxJQUFJLENBQUE7UUFJRSw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQTtRQTZENUUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUNwQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUM3RCxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVTLGVBQWUsS0FBVSxDQUFDO0lBRWpCLFlBQVksQ0FBQyxTQUFzQjtRQUNyRCxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ2hELEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxQixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQ3pGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVrQixVQUFVLENBQUMsU0FBc0I7UUFDbkQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUUzQixNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtRQUNuRSxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7UUFDL0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQTtRQUNwRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDN0YsWUFBWSxFQUFFO2dCQUNiLFFBQVEsRUFBRSxHQUFHLEVBQUU7b0JBQ2QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDNUUsSUFBSSxZQUFZLDBDQUFrQyxFQUFFLENBQUM7d0JBQ3BELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsRUFBRSwwQkFBa0I7NEJBQy9ELENBQUM7NEJBQ0QsQ0FBQywyQkFBbUIsQ0FBQTtvQkFDdEIsQ0FBQztvQkFDRCxJQUFJLFlBQVksK0NBQXVDLEVBQUUsQ0FBQzt3QkFDekQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixFQUFFLDBCQUFrQjs0QkFDL0QsQ0FBQzs0QkFDRCxDQUFDLDRCQUFvQixDQUFBO29CQUN2QixDQUFDO29CQUNELG1DQUEwQjtnQkFDM0IsQ0FBQzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUNuRCxrQkFBa0IsRUFDbEIsWUFBWSxFQUNaLGNBQWMsRUFDZCxRQUFRLEVBQ1IsQ0FBQyxRQUFRLENBQUMsRUFDVjtZQUNDLHdCQUF3QixFQUFFLEtBQUs7WUFDL0IsZ0JBQWdCLEVBQUUsS0FBSztZQUN2QixtQkFBbUIsRUFBRSxLQUFLO1lBQzFCLHFCQUFxQixFQUFFO2dCQUN0QixZQUFZLENBQUMsU0FBNEI7b0JBQ3hDLE9BQU8sd0JBQXdCLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQzNDLENBQUM7Z0JBQ0Qsa0JBQWtCO29CQUNqQixPQUFPLFFBQVEsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUE7Z0JBQzVDLENBQUM7YUFDRDtZQUNELGNBQWMsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxrQkFBa0I7WUFDaEUsaUJBQWlCLEVBQUUsSUFBSTtTQUN2QixDQUNpQyxDQUFBO1FBQ25DLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDekIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUNwRSxJQUFJLENBQ0osQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUV4QyxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxRQUFRLENBQ2IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsRUFDNUQsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQ25CLEVBQUUsRUFDRixJQUFJLENBQ0osQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBUSxFQUFFO2dCQUNwQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7Z0JBQzlCLEdBQUcsT0FBTyxDQUFDLGFBQWE7YUFDeEIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLEdBQUc7WUFDbkIsY0FBYztZQUNkLFVBQVU7WUFDVixnQkFBZ0I7WUFDaEIsbUJBQW1CO1NBQ25CLENBQUE7UUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFa0IsVUFBVSxDQUFDLE1BQWMsRUFBRSxLQUFhO1FBQzFELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9CLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWEsRUFBRSxPQUFpQjtRQUMxQyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUNuRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFBO1lBQ2pDLENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNsQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTtRQUN6QixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7WUFDNUIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXRDLE1BQU0sT0FBTyxHQUFrQjtZQUM5QixTQUFTLDJCQUFtQjtTQUM1QixDQUFBO1FBRUQsUUFBUSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUIsS0FBSyxVQUFVO2dCQUNkLE9BQU8sQ0FBQyxNQUFNLGtEQUE2QixDQUFBO2dCQUMzQyxNQUFLO1lBQ04sS0FBSyxRQUFRO2dCQUNaLE9BQU8sQ0FBQyxNQUFNLHNEQUErQixDQUFBO2dCQUM3QyxNQUFLO1lBQ04sS0FBSyxNQUFNO2dCQUNWLE9BQU8sQ0FBQyxNQUFNLG9DQUFzQixDQUFBO2dCQUNwQyxNQUFLO1lBQ04sS0FBSyxlQUFlO2dCQUNuQixPQUFPLENBQUMsTUFBTSxvREFBOEIsQ0FBQTtnQkFDNUMsTUFBSztZQUNOLEtBQUssWUFBWTtnQkFDaEIsT0FBTyxDQUFDLE1BQU0sNENBQXlCLENBQUE7Z0JBQ3ZDLE1BQUs7UUFDUCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsdUJBQXVCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3ZELElBQUksQ0FBQztnQkFDSixJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtnQkFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FDWixLQUFLLEVBQ0wsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXO29CQUMzQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUU7b0JBQ2pFLENBQUMsQ0FBQyxTQUFTLENBQ1osQ0FBQTtnQkFDRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7d0JBQzNDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDOzRCQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7NEJBQzlCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQ3hCLENBQUM7b0JBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFDRixDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osTUFBTSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ2hDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN6QyxDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtZQUMzQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDdEMsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRVMsY0FBYztRQUN2QixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3pCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRU8sS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFvQztRQUMvRCxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNmLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7WUFDekMsTUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQy9ELENBQUE7WUFDRCxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsT0FBTztnQkFDMUIsQ0FBQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUMxQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ1QsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsT0FBUSxDQUFDLFVBQVUsQ0FBQztvQkFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxPQUFRLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FDM0QsSUFBSSxDQUFDLENBQUMsT0FBTztnQkFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtZQUNaLHFCQUFxQixDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7WUFDM0MsSUFBSSxNQUFNLEdBQWdCLEVBQUUsQ0FBQTtZQUM1QixJQUFJLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNuQyxNQUFNLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUN2RCxDQUFDO2lCQUFNLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sR0FBRyxNQUFNLHFCQUFxQixDQUNuQyxTQUFTLEVBQ1QsSUFBSSxDQUFDLGlCQUFpQixFQUN0QixJQUFJLENBQUMsb0JBQW9CLENBQ3pCLENBQUE7Z0JBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ3hCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxlQUFlLEVBQUUsRUFBRTtvQkFDakMsSUFBSSxlQUFlLFlBQVksZUFBZSxFQUFFLENBQUM7d0JBQ2hELGVBQWUsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO29CQUN0QyxDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO1lBQ0QsTUFBTSxPQUFPLEdBQWMsRUFBRSxDQUFBO1lBQzdCLEtBQUssTUFBTSxXQUFXLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQ3hCLElBQUksWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7d0JBQzlCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQzVCLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQTtZQUM5QixDQUFDO1lBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ2IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztnQkFDdkMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO2dCQUN6QixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTztnQkFDekIsWUFBWSxFQUFFLElBQUksQ0FBQyx1QkFBdUI7Z0JBQzFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFO2FBQ25DLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUssQ0FDbEIsS0FBWSxFQUNaLE9BQXNCLEVBQ3RCLEtBQXdCO1FBRXhCLE1BQU0sT0FBTyxHQUFHLGlFQUFpRSxDQUFBO1FBQ2pGLE1BQU0sR0FBRyxHQUFhLEVBQUUsQ0FBQTtRQUN4QixJQUFJLE9BQU8sQ0FBQTtRQUNYLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN2RCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNmLENBQUM7UUFDRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoQixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxJQUFJLGVBQWUsRUFBRSxFQUFFLENBQUE7UUFDckQsQ0FBQztRQUVELElBQUksb0JBQWtCLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMxRSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLG9CQUFrQixDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFELEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ2pELE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsaURBQTRCLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBQy9FLENBQUM7YUFBTSxJQUFJLG9CQUFrQixDQUFDLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNFLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDM0QsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxtREFBNkIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDaEYsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQXlCO1lBQ2pELEdBQUcsT0FBTztZQUNWLE1BQU0sRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1NBQ2xFLENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksZUFBZSxFQUFFLEVBQUUsQ0FBQTtJQUNyRCxDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVUsQ0FDdkIsR0FBYSxFQUNiLE9BQXNCLEVBQ3RCLEtBQXdCO1FBRXhCLE1BQU0sTUFBTSxHQUFnQixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ3JELE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7WUFDNUIsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQzVGLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQ2hELENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTTtZQUMvQixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ25GLENBQUMsQ0FBQyxHQUFHLENBQUE7UUFFTixJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QixNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQ3hFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ2hDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUN2QixLQUFLLENBQ0wsQ0FBQTtZQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQTtRQUM5QixDQUFDO1FBRUQsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFZLEVBQUUsT0FBc0I7UUFDNUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkYsSUFBSSxFQUFFLFVBQVUsRUFBRSw2QkFBNkIsRUFBRSxXQUFXLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQ3RGLEtBQUssRUFDTCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUNoQyxLQUFLLEVBQ0wsT0FBTyxDQUNQLENBQUE7UUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBMkIsQ0FBQyxDQUFBO1FBRWhGLElBQUksNkJBQTZCLEVBQUUsQ0FBQztZQUNuQyxJQUFJLFVBQVUsR0FBWSxLQUFLLENBQUE7WUFDL0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hELFdBQVcsQ0FBQyxHQUFHLENBQ2QsS0FBSyxDQUFDLFFBQVEsQ0FDYixLQUFLLENBQUMsR0FBRyxDQUNSLEtBQUssQ0FBQyxNQUFNLENBQ1gsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFDeEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLHFDQUE2QixDQUM1QyxFQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FDM0MsRUFDRCxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQ2YsQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDWixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU07b0JBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDaEQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQ3ZDO29CQUNGLENBQUMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO2dCQUN4QyxNQUFNLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FDM0QsS0FBSyxFQUNMLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQ2hDLEtBQUssRUFDTCxPQUFPLENBQ1AsQ0FBQTtnQkFDRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQTtvQkFDN0UsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO3dCQUN0QixVQUFVLEdBQUcsZ0JBQWdCLENBQUE7d0JBQzdCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO29CQUNsRCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU87WUFDTixLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQ2pDLFdBQVc7WUFDWCxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLO1lBQ3hDLFdBQVc7U0FDWCxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXLENBQ3hCLEtBQW1CLEVBQ25CLGlCQUFtRCxFQUNuRCxLQUFZLEVBQ1osT0FBc0I7UUFNdEIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQTtRQUN6QixJQUFJLFVBQVUsR0FBaUIsRUFBRSxDQUFBO1FBQ2pDLElBQUksNkJBQTZCLEdBQUcsSUFBSSxDQUFBO1FBQ3hDLElBQUksV0FBK0IsQ0FBQTtRQUVuQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixVQUFVLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDaEUsNkJBQTZCLEdBQUcsS0FBSyxDQUFBO1FBQ3RDLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxVQUFVLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEYsQ0FBQzthQUFNLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JDLFVBQVUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNsRSxDQUFDO2FBQU0sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDckMsVUFBVSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3JGLENBQUM7YUFBTSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxVQUFVLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDcEYsQ0FBQzthQUFNLElBQUksd0JBQXdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakQsVUFBVSxHQUFHLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzlFLENBQUM7YUFBTSxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0MsVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDMUUsQ0FBQzthQUFNLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xELFVBQVUsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN6RSxDQUFDO2FBQU0sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDM0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQTtnQkFDOUIsV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUE7WUFDakMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEVBQUUsVUFBVSxFQUFFLDZCQUE2QixFQUFFLFdBQVcsRUFBRSxDQUFBO0lBQ2xFLENBQUM7SUFFTyx1QkFBdUIsQ0FDOUIsS0FBbUIsRUFDbkIsS0FBWSxFQUNaLE9BQXNCO1FBRXRCLElBQUksRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6RixLQUFLLEdBQUcsS0FBSzthQUNYLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO2FBQ3hCLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUM7YUFDbEMsSUFBSSxFQUFFO2FBQ04sV0FBVyxFQUFFLENBQUE7UUFFZixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUMxQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLFNBQVM7WUFDWCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUMxRSxDQUFBO1FBRUQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRU8seUJBQXlCLENBQ2hDLENBQWEsRUFDYixrQkFBNEIsRUFDNUIsa0JBQTRCO1FBRTVCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5RCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDekIsSUFDQyxrQkFBa0IsQ0FBQyxNQUFNO2dCQUN6QixDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQ25GLENBQUM7Z0JBQ0YsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUYsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FBQyxLQUFhO1FBS3BDLE1BQU0sa0JBQWtCLEdBQWEsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sa0JBQWtCLEdBQWEsRUFBRSxDQUFBO1FBQ3ZDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUNwQiw2Q0FBNkMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQy9CLE1BQU0sS0FBSyxHQUFHLENBQUMsUUFBUSxJQUFJLGNBQWMsSUFBSSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUM5RCxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDOUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzlDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUMsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxDQUFBO0lBQ3pELENBQUM7SUFFTyx5QkFBeUIsQ0FDaEMsS0FBbUIsRUFDbkIsaUJBQW1ELEVBQ25ELEtBQVksRUFDWixPQUFzQjtRQUV0QixJQUFJLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFekYsS0FBSyxHQUFHLEtBQUs7YUFDWCxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQzthQUMxQixPQUFPLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDO2FBQ2xDLElBQUksRUFBRTthQUNOLFdBQVcsRUFBRSxDQUFBO1FBRWYsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFhLEVBQUUsRUFBRSxDQUN0QyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0MsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFFLElBQUksTUFBTSxDQUFBO1FBRVYsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0QsTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzlDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQ3BCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxZQUFZLEtBQUssU0FBUyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUN0RixDQUFBO1lBQ0QsTUFBTSxxQkFBcUIsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3BFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pDLE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQyxFQUFFLElBQUksc0JBQXNCLEVBQXlCLENBQUMsQ0FBQTtZQUV2RCxNQUFNLFdBQVcsR0FBRyxDQUFDLEVBQWMsRUFBRSxFQUFjLEVBQUUsRUFBRTtnQkFDdEQsTUFBTSxRQUFRLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQzVELE1BQU0sV0FBVyxHQUNoQixDQUFDLENBQUMsUUFBUTtvQkFDVixJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLENBQ2pFLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FDckIsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFBO2dCQUNoQixNQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDNUQsTUFBTSxXQUFXLEdBQ2hCLFFBQVE7b0JBQ1IsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixDQUNqRSxXQUFXLENBQUMsUUFBUSxDQUFDLENBQ3JCLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQTtnQkFDaEIsSUFBSSxXQUFXLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2hDLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUNwRCxDQUFDO2dCQUNELE1BQU0seUJBQXlCLEdBQUcsRUFBRSxDQUFDLEtBQUssSUFBSSx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUN4RixNQUFNLHlCQUF5QixHQUFHLEVBQUUsQ0FBQyxLQUFLLElBQUksdUJBQXVCLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDeEYsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsQyxJQUFJLHlCQUF5QixFQUFFLENBQUM7d0JBQy9CLE9BQU8sQ0FBQyxDQUFDLENBQUE7b0JBQ1YsQ0FBQztvQkFDRCxJQUFJLHlCQUF5QixFQUFFLENBQUM7d0JBQy9CLE9BQU8sQ0FBQyxDQUFBO29CQUNULENBQUM7b0JBQ0QsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ3BELENBQUM7Z0JBQ0QsSUFDQyxDQUFDLFdBQVcsSUFBSSx5QkFBeUIsQ0FBQztvQkFDMUMsQ0FBQyxXQUFXLElBQUkseUJBQXlCLENBQUMsRUFDekMsQ0FBQztvQkFDRixPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDcEQsQ0FBQztnQkFDRCxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1QixDQUFDLENBQUE7WUFFRCxNQUFNLFlBQVksR0FBaUIsRUFBRSxDQUFBO1lBQ3JDLE1BQU0sVUFBVSxHQUFpQixFQUFFLENBQUE7WUFDbkMsTUFBTSxRQUFRLEdBQWlCLEVBQUUsQ0FBQTtZQUNqQyxNQUFNLGNBQWMsR0FBaUIsRUFBRSxDQUFBO1lBQ3ZDLE1BQU0sZ0JBQWdCLEdBQWlCLEVBQUUsQ0FBQTtZQUV6QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsQ0FBQyxlQUFlLHVEQUErQyxFQUFFLENBQUM7b0JBQ3RFLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3JCLENBQUM7cUJBQU0sSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQzlCLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ25CLENBQUM7cUJBQU0sSUFDTixDQUFDLENBQUMsUUFBUTtvQkFDVixJQUFJLENBQUMsMEJBQTBCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUMxRSxDQUFDO29CQUNGLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pCLENBQUM7cUJBQU0sSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQzNCLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3pCLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxHQUFHO2dCQUNSLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ2pDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQy9CLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQzdCLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ25DLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQzthQUNyQyxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLHdCQUF3QixDQUMvQixLQUFtQixFQUNuQixLQUFZLEVBQ1osT0FBc0I7UUFFdEIsSUFBSSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXpGLEtBQUssR0FBRyxLQUFLO2FBQ1gsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7YUFDekIsT0FBTyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsQ0FBQzthQUNsQyxJQUFJLEVBQUU7YUFDTixXQUFXLEVBQUUsQ0FBQTtRQUVmLE1BQU0sTUFBTSxHQUFHLEtBQUs7YUFDbEIsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQzlELE1BQU0sQ0FDTixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQ2IsU0FBUyxDQUFDLFFBQVE7WUFDbEIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hELFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUMsQ0FDbEYsQ0FBQTtRQUVGLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVPLHdCQUF3QixDQUMvQixLQUFtQixFQUNuQixpQkFBbUQsRUFDbkQsS0FBWSxFQUNaLE9BQXNCO1FBRXRCLElBQUksRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV6RixLQUFLLEdBQUcsS0FBSzthQUNYLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO2FBQ3pCLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUM7YUFDbEMsSUFBSSxFQUFFO2FBQ04sV0FBVyxFQUFFLENBQUE7UUFFZixNQUFNLE1BQU0sR0FBRyxLQUFLO2FBQ2xCLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUM5RCxNQUFNLENBQ04sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLGlCQUFpQixDQUFDLEtBQUssQ0FDdEIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQ2pGO1lBQ0QsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3hDLENBQUMsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUMsQ0FDMUUsQ0FBQTtRQUVGLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVPLHVCQUF1QixDQUM5QixLQUFtQixFQUNuQixpQkFBbUQsRUFDbkQsS0FBWSxFQUNaLE9BQXNCO1FBRXRCLElBQUksRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV6RixLQUFLLEdBQUcsS0FBSztZQUNaLENBQUMsQ0FBQyxLQUFLO2lCQUNKLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO2lCQUN4QixPQUFPLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDO2lCQUNsQyxJQUFJLEVBQUU7aUJBQ04sV0FBVyxFQUFFO1lBQ2hCLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFFTCxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDekMsTUFBTSxNQUFNLEdBQUcsS0FBSzthQUNsQixJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDOUQsTUFBTSxDQUNOLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM1QixpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FDekU7WUFDRCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUMxRSxDQUFBO1FBRUYsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRU8sb0NBQW9DLENBQzNDLEtBQW1CLEVBQ25CLEtBQVksRUFDWixPQUFzQjtRQUV0Qix5SEFBeUg7UUFFekgsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQSxDQUFDLGtDQUFrQztRQUVsRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUM5QiwrRUFBK0UsQ0FDL0UsQ0FBQTtRQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQTtRQUUxQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUNuQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQ2IsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyRCxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDN0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLHFCQUFxQixHQUFHLENBQzdCLFNBQXFCLEVBQ3JCLFdBQWlELEVBQ2hELEVBQUU7WUFDSCxPQUFPLENBQ04sU0FBUyxDQUFDLEtBQUs7Z0JBQ2YsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLHVDQUF1QyxDQUM5RSxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDeEIsS0FBSyxXQUFXLENBQ2pCLENBQUE7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLHdCQUF3QixHQUFHLENBQ2hDLFNBQXFCLEVBQ3JCLFdBQW1ELEVBQ2xELEVBQUU7WUFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN0QixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzNGLElBQ0MsZUFBZSw2Q0FBb0M7Z0JBQ25ELGVBQWUsOENBQXFDO2dCQUNwRCxlQUFlLHVEQUErQztnQkFDOUQsZUFBZSwwREFBa0QsRUFDaEUsQ0FBQztnQkFDRixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFFRCxJQUNDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyx5Q0FBeUMsQ0FDaEYsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQ3hCLEtBQUssV0FBVyxFQUNoQixDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUVELElBQUksV0FBVyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMzQixNQUFNLFlBQVksR0FBRyx3QkFBd0IsQ0FDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQU0sQ0FBQyxFQUM5QixTQUFTLENBQUMsS0FBSyxDQUNmLENBQUE7Z0JBQ0QsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUN2QixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQ1AsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLHlDQUF5QyxDQUNoRixHQUFHLENBQUMsUUFBUSxDQUNaLEtBQUssV0FBVyxDQUNsQixDQUFBO1lBQ0YsQ0FBQztZQUVELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUFBO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUNuRixNQUFNLHFCQUFxQixHQUFHLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFFeEYsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEIsd0ZBQXdGO1lBQ3hGLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUNuQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQ2Isa0JBQWtCO2dCQUNsQixxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFDN0QsQ0FBQyxDQUFDLHFCQUFxQixJQUFJLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUN2RSxDQUFBO1FBQ0YsQ0FBQzthQUFNLElBQUksSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLHNGQUFzRjtZQUN0RixLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FDbkIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUNiLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUNoRSxDQUFDLENBQUMsa0JBQWtCLElBQUkscUJBQXFCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQ2pFLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLDJFQUEyRTtZQUMzRSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FDbkIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUNiLENBQUMsa0JBQWtCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQy9ELENBQUMscUJBQXFCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FDdEUsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTyxLQUFLLENBQUMsMEJBQTBCLENBQ3ZDLEtBQW1CLEVBQ25CLEtBQVksRUFDWixPQUFzQjtRQUV0QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSzthQUN2QixPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQzthQUMzQixPQUFPLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDO2FBQ2xDLElBQUksRUFBRTthQUNOLFdBQVcsRUFBRSxDQUFBO1FBQ2YsTUFBTSx5QkFBeUIsR0FDOUIsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtRQUNyRSxNQUFNLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDaEYsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQ25CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDaEQsQ0FBQyxDQUFDLEtBQUs7Z0JBQ04sQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN4QyxDQUFDLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUNsRCxDQUFBO1FBQ0QsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRU8sK0JBQStCLENBQ3RDLEtBQW1CLEVBQ25CLEtBQVksRUFDWixPQUFzQjtRQUV0QixJQUFJLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzlCLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUNuQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNaLENBQUMsQ0FBQyxDQUFDLFFBQVE7WUFDWCxDQUFDLENBQUMsS0FBSyxFQUFFLE9BQU87WUFDaEIsQ0FBQyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsS0FBSyxTQUFTO1lBQ3pDLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLGtCQUFrQixHQUFHLG9CQUFrQixDQUFDLHNCQUFzQixDQUNyRixDQUFBO1FBRUQsS0FBSyxHQUFHLEtBQUs7YUFDWCxPQUFPLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO2FBQ2hDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUM7YUFDbEMsSUFBSSxFQUFFO2FBQ04sV0FBVyxFQUFFLENBQUE7UUFFZixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUMxQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUMxRSxDQUFBO1FBRUQsT0FBTyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSw2Q0FBMEIsQ0FBQTtRQUV6RCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFTyx5QkFBeUIsQ0FDaEMsS0FBbUIsRUFDbkIsS0FBWTtRQUVaLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUMxRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQzFCLFVBQVUsQ0FBQyx5QkFBeUIsQ0FDcEMsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDdkQsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRO1lBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUE0QixPQUFPLENBQUMsUUFBUSxDQUFDO1lBQ3ZGLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDWixJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBMkIsRUFBRSxDQUFBO1lBQ3pDLEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ2QsU0FBUTtnQkFDVCxDQUFDO2dCQUNELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxhQUFhLENBQ3ZFLElBQUksbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFDeEMsU0FBUyxDQUNULENBQUE7Z0JBQ0QsTUFBTSxZQUFZLEdBQUcsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUM3RCxJQUFJLFVBQVUsSUFBSSxZQUFZLEVBQUUsQ0FBQztvQkFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN0RCxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU87Z0JBQ04sVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxXQUFXLEVBQUUsUUFBUSxDQUNwQiw2QkFBNkIsRUFDN0IsMENBQTBDLEVBQzFDLE9BQU8sQ0FBQyxLQUFLLENBQ2I7YUFDRCxDQUFBO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sb0JBQW9CLENBQzNCLFVBQXdCLEVBQ3hCLGFBQTJCO1FBRTNCLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQTtRQUNyQyxNQUFNLDBCQUEwQixHQUFHLENBQUMsSUFBWSxFQUFVLEVBQUU7WUFDM0QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDZCxNQUFNLHNCQUFzQixHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsRCxJQUFJLHNCQUFzQixFQUFFLENBQUM7Z0JBQzVCLEtBQUssR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDckMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FDbEUsQ0FBQTtnQkFDRCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsQixPQUFPLDBCQUEwQixDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQTtRQUVELElBQUksVUFBVSxHQUFZLEtBQUssQ0FBQTtRQUMvQixLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzNELE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN0QyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNyRixVQUFVLEdBQUcsSUFBSSxDQUFBO2dCQUNqQixVQUFVLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNFLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzNDLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUN6QixLQUFZLEVBQ1osT0FBNkIsRUFDN0IsS0FBd0I7UUFFeEIsTUFBTSx1QkFBdUIsR0FBRyxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQTtRQUM1RCxJQUFJLENBQUMsdUJBQXVCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDckQsT0FBTyxDQUFDLE1BQU0sa0RBQTZCLENBQUE7UUFDNUMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQTtRQUV4QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtZQUMxQixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2hGLE9BQU8sSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDcEMsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7WUFDbkIsT0FBTyxDQUFDLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQTtZQUN0QyxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2hGLE9BQU8sSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDckMsT0FBTyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUE7UUFFN0IsSUFDQyx1QkFBdUI7WUFDdkIsK0JBQStCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUMxQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ2xDLENBQUM7WUFDRixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2hGLE9BQU8sSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE1BQU0sQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDdEQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDO1lBQzVELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7U0FDOUUsQ0FBQyxDQUFBO1FBRUYsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNO1lBQ2hDLENBQUMsQ0FBQyxJQUFJLDZCQUE2QixDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQztZQUMvRCxDQUFDLENBQUMsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQkFBc0IsQ0FDbkMsVUFBa0IsRUFDbEIsS0FBd0I7UUFFeEIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDdkUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDWixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDN0MsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwRCxDQUFDLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUN2RCxDQUFBO1FBQ0QsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBRWpELElBQUksbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsMkVBQTJFO1lBQzNFLE1BQU0sZ0JBQWdCLEdBQTJCLEVBQUUsQ0FBQTtZQUNuRCxLQUFLLE1BQU0sU0FBUyxJQUFJLG1CQUFtQixFQUFFLENBQUM7Z0JBQzdDLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDL0IsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3ZELENBQUM7Z0JBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDckQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsMEJBQTBCO3FCQUM3QixhQUFhLENBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDO3FCQUN2RCxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3RDLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBYSxFQUFFLENBQUE7UUFDckMsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtZQUNyRixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLEtBQUssTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNqQyxJQUNDLENBQUMsQ0FBQyxLQUFLO3dCQUNQLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssVUFBVTt3QkFDcEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFDaEMsQ0FBQzt3QkFDRixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTt3QkFDNUMsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUNqRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ3RDLEtBQUssQ0FDTCxDQUFBO2dCQUNELEtBQUssTUFBTSxTQUFTLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ2hDLElBQ0MsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJO3dCQUN6QixDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUN0RCxDQUFDO3dCQUNGLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDcEMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLHVFQUF1RSxFQUN2RSxDQUFDLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLG1CQUFtQixDQUFBO0lBQzNCLENBQUM7SUFFTyxjQUFjLENBQUMsVUFBd0IsRUFBRSxPQUFzQjtRQUN0RSxRQUFRLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QjtnQkFDQyxVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUN2QyxPQUFPLEVBQUUsQ0FBQyxZQUFZLEtBQUssUUFBUSxJQUFJLE9BQU8sRUFBRSxDQUFDLFlBQVksS0FBSyxRQUFRO29CQUN6RSxDQUFDLENBQUMsRUFBRSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUMsWUFBWTtvQkFDbkMsQ0FBQyxDQUFDLEdBQUcsQ0FDTixDQUFBO2dCQUNELE1BQUs7WUFDTjtnQkFDQyxVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUN2QyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLEtBQUssUUFBUTtvQkFDaEQsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLGtCQUFrQixLQUFLLFFBQVE7b0JBQy9DLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCO29CQUMzRCxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLGtCQUFrQixLQUFLLFFBQVE7d0JBQ2pELENBQUMsQ0FBQyxDQUFDO3dCQUNILENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLEtBQUssUUFBUTs0QkFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDSixDQUFDLENBQUMsR0FBRyxDQUNSLENBQUE7Z0JBQ0QsTUFBSztZQUNOLHVEQUFpQztZQUNqQztnQkFDQyxVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUN2QyxPQUFPLEVBQUUsQ0FBQyxNQUFNLEtBQUssUUFBUSxJQUFJLE9BQU8sRUFBRSxDQUFDLE1BQU0sS0FBSyxRQUFRO29CQUM3RCxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTTtvQkFDdkIsQ0FBQyxDQUFDLEdBQUcsQ0FDTixDQUFBO2dCQUNELE1BQUs7WUFDTjtnQkFDQyxVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO2dCQUN0RixNQUFLO1FBQ1AsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLFNBQVMsaUNBQXlCLEVBQUUsQ0FBQztZQUNoRCxVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2xDLENBQUM7UUFDRCxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBRU8sc0JBQXNCLENBQUMsS0FBWTtRQUMxQyxPQUFPLENBQ04sb0JBQWtCLENBQUMscUNBQXFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztZQUNyRSxvQkFBa0IsQ0FBQyxtQ0FBbUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ25FLG9CQUFrQixDQUFDLG9DQUFvQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDcEUsb0JBQWtCLENBQUMsK0JBQStCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztZQUMvRCxvQkFBa0IsQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ2xFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ3JDLG9CQUFrQixDQUFDLGtDQUFrQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDbEUsb0JBQWtCLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUM1RCxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FDakMsS0FBWSxFQUNaLE9BQXNCLEVBQ3RCLEtBQXdCO1FBRXhCLDRCQUE0QjtRQUM1QixJQUFJLG9CQUFrQixDQUFDLHFDQUFxQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNFLE9BQU8sSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixJQUFJLG9CQUFrQixDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pFLE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakUsQ0FBQztRQUVELDJCQUEyQjtRQUMzQixJQUFJLG9CQUFrQixDQUFDLG9DQUFvQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFFLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkUsQ0FBQztRQUVELHNCQUFzQjtRQUN0QixJQUFJLG9CQUFrQixDQUFDLCtCQUErQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JFLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixJQUFJLG9CQUFrQixDQUFDLGtDQUFrQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hFLE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakUsQ0FBQztRQUVELHNCQUFzQjtRQUN0QixJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixJQUNDLG9CQUFrQixDQUFDLGtDQUFrQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDbEUsQ0FBQyxvQkFBa0IsQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxTQUFTLENBQUMsRUFDN0YsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUVELHdCQUF3QjtRQUN4QixJQUFJLG9CQUFrQixDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xFLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUVELE9BQU8sSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUVTLEtBQUssQ0FBQyw2QkFBNkIsQ0FDNUMsZUFBb0MsRUFDcEMsT0FBc0IsRUFDdEIsS0FBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQWlCLEVBQUUsQ0FBQTtRQUMvQixJQUFJLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1QixNQUFNLGlCQUFpQixHQUFhLEVBQUUsQ0FBQTtZQUN0QyxNQUFNLGtCQUFrQixHQUFVLEVBQUUsQ0FBQTtZQUNwQyxLQUFLLE1BQU0sY0FBYyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUM5QyxJQUFJLE9BQU8sY0FBYyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUN4QyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQ3ZDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQ3hDLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDO29CQUNKLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FDckUsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUN2QyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQzFCLEtBQUssQ0FDTCxDQUFBO29CQUNELEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7d0JBQ3BDLElBQ0MsU0FBUyxDQUFDLE9BQU87NEJBQ2pCLENBQUMsU0FBUyxDQUFDLGVBQWU7NEJBQzFCLENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLElBQUksRUFDN0UsQ0FBQzs0QkFDRixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO3dCQUN2QixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUMvRCxNQUFNLEtBQUssQ0FBQTtvQkFDWixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMscUJBQXFCLENBQzdFLGtCQUFrQixFQUNsQixJQUFJLENBQ0osQ0FBQTtnQkFDRCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNwQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQzVFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ3ZCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRVMsS0FBSyxDQUFDLDJCQUEyQjtRQUMxQyxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQywrQkFBK0IsQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1FBQ2hHLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQywrQkFBK0IsQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO1FBQ2hHLEtBQUssTUFBTSx5QkFBeUIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsV0FBVyxLQUFLLHlCQUF5QixDQUFDLEVBQUUsQ0FBQztnQkFDdkYsZUFBZSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1lBQ2hELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxlQUFlLENBQUE7SUFDdkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FDN0MsS0FBWSxFQUNaLE9BQXNCLEVBQ3RCLEtBQXdCO1FBRXhCLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDaEUsTUFBTSwwQkFBMEIsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FDMUUsZUFBZSxFQUNmLEVBQUUsR0FBRyxPQUFPLEVBQUUsTUFBTSxFQUFFLDJCQUEyQixFQUFFLEVBQ25ELEtBQUssQ0FDTCxDQUFBO1FBQ0QsT0FBTyxJQUFJLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTyxLQUFLLENBQUMsNkJBQTZCLENBQzFDLEtBQVksRUFDWixPQUFzQixFQUN0QixLQUF3QjtRQUV4QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSzthQUN2QixPQUFPLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDO2FBQ3BDLElBQUksRUFBRTthQUNOLFdBQVcsRUFBRSxDQUFBO1FBQ2YsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLHdCQUF3QixFQUFFLENBQUE7UUFDdkYsTUFBTSwwQkFBMEIsR0FBRyxDQUNsQyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FDdkMsZUFBZSxFQUNmLEVBQUUsR0FBRyxPQUFPLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixFQUFFLEVBQ2pELEtBQUssQ0FDTCxDQUNELENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixPQUFPLElBQUksVUFBVSxDQUFDLDBCQUEwQixDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLEtBQUssQ0FBQywrQkFBK0IsQ0FDNUMsS0FBWSxFQUNaLE9BQXNCLEVBQ3RCLEtBQXdCO1FBRXhCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLO2FBQ3ZCLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLENBQUM7YUFDdEMsSUFBSSxFQUFFO2FBQ04sV0FBVyxFQUFFLENBQUE7UUFDZixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtRQUN6RixNQUFNLDBCQUEwQixHQUFHLENBQ2xDLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxlQUFlLEVBQ2YsRUFBRSxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUsMkJBQTJCLEVBQUUsRUFDbkQsS0FBSyxDQUNMLENBQ0QsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE9BQU8sSUFBSSxVQUFVLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRU8sS0FBSyxDQUFDLDZCQUE2QixDQUMxQyxLQUFZLEVBQ1osT0FBc0IsRUFDdEIsS0FBd0I7UUFFeEIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUs7YUFDdkIsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQzthQUNwQyxJQUFJLEVBQUU7YUFDTixXQUFXLEVBQUUsQ0FBQTtRQUNmLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1FBQ3ZGLE1BQU0sMEJBQTBCLEdBQUcsQ0FDbEMsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQ3ZDLGVBQWUsRUFDZixFQUFFLEdBQUcsT0FBTyxFQUFFLE1BQU0sRUFBRSx5QkFBeUIsRUFBRSxFQUNqRCxLQUFLLENBQ0wsQ0FDRCxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsT0FBTyxJQUFJLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTyxLQUFLLENBQUMsMEJBQTBCLENBQ3ZDLEtBQVksRUFDWixPQUFzQixFQUN0QixLQUF3QjtRQUV4QixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDbEUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FDMUIsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsMEJBQTBCLENBQ3BFLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDNUQsQ0FBQTtRQUNGLE1BQU0sMEJBQTBCLEdBQUcsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQzFFLENBQUMsR0FBRyxTQUFTLEVBQUUsR0FBRyxNQUFNLENBQUMsRUFDekIsRUFBRSxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsRUFDN0MsS0FBSyxDQUNMLENBQUE7UUFDRCxPQUFPLElBQUksVUFBVSxDQUFDLDBCQUEwQixDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLEtBQUssQ0FBQyw0QkFBNEIsQ0FDekMsS0FBWSxFQUNaLE9BQXNCLEVBQ3RCLEtBQXdCO1FBRXhCLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUNqRSxNQUFNLDBCQUEwQixHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUMxRSxvQkFBb0IsRUFDcEIsRUFBRSxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUNsRSxLQUFLLENBQ0wsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FDdEIsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FDL0IsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUMvRSxDQUNELENBQUE7UUFDRCxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFTyxLQUFLLENBQUMsdUJBQXVCO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMvRixDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FDN0IsQ0FBQTtRQUNELE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUM5RSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQ2xGLENBQUE7UUFFRCxPQUFPLFFBQVEsQ0FDZCxDQUNDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixxQkFBcUI7WUFDckIsSUFBSSxDQUFDLCtCQUErQixDQUFDLDJCQUEyQixFQUFFO1lBQ2xFLElBQUksQ0FBQywrQkFBK0IsQ0FBQywyQkFBMkIsRUFBRTtZQUNsRSxJQUFJLENBQUMsK0JBQStCLENBQUMsdUJBQXVCLEVBQUU7U0FDOUQsQ0FBQyxDQUNGO2FBQ0MsSUFBSSxFQUFFO2FBQ04sTUFBTSxDQUNOLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FDZixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzFDLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUM5RCxFQUNGLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQzFDLENBQUE7SUFDRixDQUFDO0lBRUQsaUZBQWlGO0lBQ3pFLEtBQUssQ0FBQywwQkFBMEIsQ0FDdkMsT0FBc0IsRUFDdEIsS0FBd0I7UUFFeEIsTUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0YsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBRW5GLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUNsQyxDQUNDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixxQkFBcUI7WUFDckIsSUFBSSxDQUFDLDJCQUEyQixFQUFFO1lBQ2xDLElBQUksQ0FBQywrQkFBK0IsQ0FBQywyQkFBMkIsRUFBRTtZQUNsRSxJQUFJLENBQUMsK0JBQStCLENBQUMsMkJBQTJCLEVBQUU7WUFDbEUsSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixFQUFFO1NBQzlELENBQUMsQ0FDRjthQUNDLElBQUksRUFBRTthQUNOLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ3ZCLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7WUFDOUQsQ0FBQztZQUNELE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUMzQixDQUFDLGNBQWMsRUFBRSxFQUFFLENBQ2xCLGNBQWMsQ0FBQyxLQUFLO2dCQUNwQixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FDbkYsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUNILENBQUE7UUFFRCxNQUFNLDBCQUEwQixHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUMxRSxrQkFBa0IsRUFDbEIsRUFBRSxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUNoRSxLQUFLLENBQ0wsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUE7UUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLDBCQUEwQixDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pGLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVDLElBQUksUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQy9ELGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FDL0QsQ0FBQTtnQkFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxTQUFTLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUNoRCxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQ2IsU0FBUyxDQUFDLGlCQUFpQjtvQkFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQ3JDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQ3BDLGNBQWMsQ0FDZCxDQUNGLENBQUE7Z0JBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFTyxLQUFLLENBQUMscUJBQXFCLENBQ2xDLEtBQVksRUFDWixPQUFzQixFQUN0QixLQUF3QjtRQUV4QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSzthQUN2QixPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQzthQUM1QixJQUFJLEVBQUU7YUFDTixXQUFXLEVBQUUsQ0FBQTtRQUNmLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQztZQUNoQyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztZQUM3QyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztTQUN6QyxDQUFDLENBQUE7UUFDRixNQUFNLDBCQUEwQixHQUFHLENBQ2xDLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxlQUFlLEVBQ2YsRUFBRSxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUM1RCxLQUFLLENBQ0wsQ0FDRCxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDaEYsQ0FBQztJQUVPLFFBQVEsQ0FDZixLQUE4QixFQUM5QixPQUFpQixFQUNqQixtQkFBNkI7UUFFN0IsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDeEIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7SUFDRixDQUFDO0lBRU8sV0FBVyxDQUFDLEtBQThCO1FBQ2pELElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM5QyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbEIsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7SUFDRixDQUFDO0lBRU8sVUFBVSxDQUFDLE9BQWlCO1FBQ25DLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMxQixJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDeEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFFcEYsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDYixJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDMUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7Z0JBQ3hELENBQUM7cUJBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQy9CLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtvQkFDcEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FDbEQscUJBQXFCLEVBQ3JCLHNCQUFzQixDQUN0QixDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDOUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUNoRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVPLFVBQVUsQ0FBQyxLQUFVO1FBQzVCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU87Z0JBQ04sSUFBSSxFQUFFLFFBQVEsQ0FDYixlQUFlLEVBQ2Ysc0ZBQXNGLENBQ3RGO2dCQUNELFFBQVEsRUFBRSxRQUFRLENBQUMsT0FBTzthQUMxQixDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPO2dCQUNOLElBQUksRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdkYsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLO2FBQ3hCLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxLQUFZO1FBQ2xDLElBQUksS0FBSyxZQUFZLHFCQUFxQixFQUFFLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUMsSUFBSSxzREFBc0MsQ0FBQTtRQUN4RCxDQUFDO1FBQ0QsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVTLFVBQVU7UUFDbkIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3RSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsR0FBRyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQ2pCLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLDhEQUc1QixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxhQUFhLENBQ3BCLFNBQXFCLEVBQ3JCLE9BQTRFO1FBRTVFLFNBQVM7WUFDUixJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2xELGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUNyRCxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQTtRQUNsQixJQUFJLENBQUMsMEJBQTBCO2FBQzdCLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDO2FBQ3hCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU8sT0FBTyxDQUFDLEdBQVE7UUFDdkIsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUUxQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxNQUFNLEtBQUssR0FBRyxzQkFBc0IsQ0FDbkMsUUFBUSxDQUNQLG1CQUFtQixFQUNuQiw2RUFBNkUsQ0FDN0UsRUFDRDtnQkFDQyxJQUFJLE1BQU0sQ0FDVCxvQkFBb0IsRUFDcEIsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLEVBQ3BELFNBQVMsRUFDVCxJQUFJLEVBQ0osR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixFQUFFLENBQ2hEO2FBQ0QsQ0FDRCxDQUFBO1lBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNyQyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUNsQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTtRQUN6QixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFDN0IsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO0lBQ2pCLENBQUM7SUFFRCxNQUFNLENBQUMsc0JBQXNCLENBQUMsS0FBYSxFQUFFLE1BQWU7UUFDM0QsT0FBTyxDQUNOLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7WUFDdEMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQztZQUM1QyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1lBQ3JDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUM7WUFDcEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQztZQUNyQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO1lBQ3BDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUM7WUFDMUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQztZQUN6QyxJQUFJLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFDO1lBQzdDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxLQUFLLENBQUM7WUFDdkQsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQztZQUN4QyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDO1lBQ3pDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDO1lBQ2xELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FDcEMsQ0FBQTtJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsOEJBQThCLENBQUMsS0FBYTtRQUNsRCxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxLQUFhO1FBQzVDLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxNQUFNLENBQUMsNkJBQTZCLENBQUMsS0FBYTtRQUNqRCxPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsTUFBTSxDQUFDLDJDQUEyQyxDQUFDLEtBQWE7UUFDL0QsT0FBTyxtRUFBbUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUVELE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxLQUFhO1FBQzlDLE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsTUFBTSxDQUFDLGdDQUFnQyxDQUFDLEtBQWE7UUFDcEQsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCxNQUFNLENBQUMseUJBQXlCLENBQUMsS0FBYTtRQUM3QyxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxLQUFhO1FBQzVDLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsTUFBTSxDQUFDLHlCQUF5QixDQUFDLEtBQWE7UUFDN0MsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFFRCxNQUFNLENBQUMsaUNBQWlDLENBQUMsS0FBYTtRQUNyRCxPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsTUFBTSxDQUFDLDRCQUE0QixDQUFDLEtBQWE7UUFDaEQsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELE1BQU0sQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFhO1FBQ3RELE9BQU8sbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxNQUFNLENBQUMscUNBQXFDLENBQUMsS0FBYTtRQUN6RCxPQUFPLHlCQUF5QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsTUFBTSxDQUFDLCtCQUErQixDQUFDLEtBQWE7UUFDbkQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFRCxNQUFNLENBQUMsa0NBQWtDLENBQUMsS0FBYTtRQUN0RCxPQUFPLHVCQUF1QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLEtBQWE7UUFDdkQsT0FBTyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFhO1FBQ3hELE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxNQUFNLENBQUMsOEJBQThCLENBQUMsS0FBYSxFQUFFLE1BQWU7UUFDbkUsT0FBTyxDQUNOLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxNQUFNLEtBQUssRUFBRSxJQUFJLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDdkQsQ0FBQyxDQUFDLE1BQU0sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQ3ZDLENBQUE7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEtBQWE7UUFDeEMsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxNQUFNLENBQUMsOEJBQThCLENBQUMsS0FBYTtRQUNsRCxPQUFPLHFCQUFxQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsTUFBTSxDQUFDLDRCQUE0QixDQUFDLEtBQWE7UUFDaEQsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxLQUFhO1FBQ2pELE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsTUFBTSxDQUFDLHFCQUFxQixDQUFDLEtBQWE7UUFDekMsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxLQUFhO1FBQzVDLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRVEsS0FBSztRQUNiLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdkUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNyQixDQUFDOztBQWx3RFcsa0JBQWtCO0lBeUI1QixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsZ0NBQWdDLENBQUE7SUFFaEMsWUFBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEscUJBQXFCLENBQUE7SUFDckIsWUFBQSx3QkFBd0IsQ0FBQTtJQUN4QixZQUFBLGlDQUFpQyxDQUFBO0lBRWpDLFlBQUEsbUNBQW1DLENBQUE7SUFFbkMsWUFBQSxvQ0FBb0MsQ0FBQTtJQUVwQyxZQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxtQkFBbUIsQ0FBQTtJQUNuQixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsZ0NBQWdDLENBQUE7SUFFaEMsWUFBQSxvQ0FBb0MsQ0FBQTtJQUVwQyxZQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFlBQUEsbUNBQW1DLENBQUE7SUFFbkMsWUFBQSxtQkFBbUIsQ0FBQTtJQUNuQixZQUFBLFdBQVcsQ0FBQTtHQTNERCxrQkFBa0IsQ0Ftd0Q5Qjs7QUFFRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsa0JBQWtCO0lBQzFELEtBQUssQ0FBQyxJQUFJO1FBQ2xCLE1BQU0sS0FBSyxHQUNWLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEI7WUFDbEUsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCO1lBQ3JFLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLCtCQUErQjtZQUNyRSxDQUFDLENBQUMsTUFBTTtZQUNSLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDTixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDekIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDZCQUE4QixTQUFRLGtCQUFrQjtJQUMzRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDaEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUE7UUFDcEMsSUFDQyxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztZQUNqRCxrQkFBa0IsQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsRUFDdkQsQ0FBQztZQUNGLEtBQUssR0FBRyxLQUFLLElBQUksYUFBYSxDQUFBO1FBQy9CLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLGtCQUFrQjtJQUNuRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDaEMsS0FBSyxHQUFHLEtBQUssSUFBSSxVQUFVLENBQUE7UUFDM0IsT0FBTyxrQkFBa0IsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUM7WUFDeEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ25CLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUM7Z0JBQ3pELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7Z0JBQ2pDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDMUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGtCQUFrQjtJQUNwRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDaEMsS0FBSyxHQUFHLEtBQUssSUFBSSxXQUFXLENBQUE7UUFDNUIsT0FBTyxrQkFBa0IsQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7WUFDekQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ25CLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUM7Z0JBQ3pELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7Z0JBQ2xDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDMUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGtCQUFrQjtJQUNwRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDaEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUE7UUFDbkMsSUFBSSxrQkFBa0IsQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdELEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMvQyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFFa0IsVUFBVTtRQUM1QixLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDZCQUE4QixTQUFRLGtCQUFrQjtJQUMzRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDaEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQTtRQUMxQyxJQUFJLGtCQUFrQixDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0QsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDdEQsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0NBQ0Q7QUFNTSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLGtCQUFrQjtJQUNoRSxZQUM2QixPQUF5QyxFQUNyRSxrQkFBdUMsRUFDakIsbUJBQXlDLEVBQzNDLGlCQUFxQyxFQUNwQyxrQkFBdUMsRUFDckMsb0JBQTJDLEVBQ25ELFlBQTJCLEVBQ3ZCLGdCQUFtQyxFQUN6QiwwQkFBdUQsRUFFcEYsK0JBQWlFLEVBQzlDLGdCQUFtQyxFQUN2QyxZQUEyQixFQUNuQixvQkFBMkMsRUFDeEMsY0FBd0MsRUFFbEUsZ0NBQW1FLEVBRW5FLGtDQUF1RSxFQUV2RSwwQkFBZ0UsRUFDdEMsZ0JBQTBDLEVBQ25ELGNBQStCLEVBQzVCLGlCQUFxQyxFQUNqQyxxQkFBNkMsRUFDckQsYUFBNkIsRUFDeEIsa0JBQXVDLEVBQzNDLGNBQStCLEVBRWhELCtCQUFpRSxFQUVqRSwwQkFBZ0UsRUFDdkMsYUFBc0MsRUFFL0Qsa0NBQXVFLEVBQ2xELGtCQUF1QyxFQUMvQyxVQUF1QjtRQUVwQyxLQUFLLENBQ0osT0FBTyxFQUNQLGtCQUFrQixFQUNsQixtQkFBbUIsRUFDbkIsaUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixvQkFBb0IsRUFDcEIsWUFBWSxFQUNaLGdCQUFnQixFQUNoQiwwQkFBMEIsRUFDMUIsK0JBQStCLEVBQy9CLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osb0JBQW9CLEVBQ3BCLGNBQWMsRUFDZCxnQ0FBZ0MsRUFDaEMsa0NBQWtDLEVBQ2xDLDBCQUEwQixFQUMxQixnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLGlCQUFpQixFQUNqQixxQkFBcUIsRUFDckIsYUFBYSxFQUNiLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QsK0JBQStCLEVBQy9CLDBCQUEwQixFQUMxQixhQUFhLEVBQ2Isa0NBQWtDLEVBQ2xDLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FBQTtRQXJFMkIsWUFBTyxHQUFQLE9BQU8sQ0FBa0M7SUFzRXRFLENBQUM7SUFFUSxJQUFJO1FBQ1osT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdEMsQ0FBQztDQUNELENBQUE7QUE3RVkseUJBQXlCO0lBSW5DLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFlBQUEsaUNBQWlDLENBQUE7SUFFakMsWUFBQSxtQ0FBbUMsQ0FBQTtJQUVuQyxZQUFBLG9DQUFvQyxDQUFBO0lBRXBDLFlBQUEsd0JBQXdCLENBQUE7SUFDeEIsWUFBQSxlQUFlLENBQUE7SUFDZixZQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLG1CQUFtQixDQUFBO0lBQ25CLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxZQUFBLG9DQUFvQyxDQUFBO0lBRXBDLFlBQUEsdUJBQXVCLENBQUE7SUFDdkIsWUFBQSxtQ0FBbUMsQ0FBQTtJQUVuQyxZQUFBLG1CQUFtQixDQUFBO0lBQ25CLFlBQUEsV0FBVyxDQUFBO0dBdENELHlCQUF5QixDQTZFckM7O0FBRUQsU0FBUyxtQ0FBbUMsQ0FBQyxLQUFhLEVBQUUsU0FBaUI7SUFDNUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osT0FBTyx3QkFBd0IsR0FBRyxTQUFTLENBQUE7SUFDNUMsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsMEJBQTBCLFNBQVMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDMUYsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNmLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSx3QkFBd0IsR0FBRyxTQUFTLENBQUMsQ0FBQTtRQUN0RixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sT0FBTywyQ0FBNEMsU0FBUSxrQkFBa0I7SUFDekUsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFhO1FBQ2hDLE1BQU0sWUFBWSxHQUFHLG1DQUFtQyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUM1RSxPQUFPLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQ3ZFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrREFBbUQsU0FBUSxrQkFBa0I7SUFDaEYsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFhO1FBQ2hDLE1BQU0sWUFBWSxHQUFHLG1DQUFtQyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQ25GLE9BQU8sWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDdkUsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlDQUEwQyxTQUFRLGtCQUFrQjtJQUN2RSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDaEMsTUFBTSxZQUFZLEdBQUcsbUNBQW1DLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFFLE9BQU8sWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDdkUsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdEQUFpRCxTQUFRLGtCQUFrQjtJQUM5RSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDaEMsTUFBTSxZQUFZLEdBQUcsbUNBQW1DLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDakYsT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUN2RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsa0JBQWtCO0lBQ3RELEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBYTtRQUNoQyxPQUFPLGtCQUFrQixDQUFDLGlDQUFpQyxDQUFDLEtBQUssQ0FBQztZQUNqRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDbkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsa0JBQWtCO0lBQXZFOztRQUNrQixnQ0FBMkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNqRixzQkFBaUIsR0FBa0IsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBYTdELENBQUM7SUFYUyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWE7UUFDaEMsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUE7UUFDM0UsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RELE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CO1FBQ2pDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsMENBQTBDLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZ0NBQWlDLFNBQVEsa0JBQWtCO0lBQXhFOztRQUNrQiwrQkFBMEIsR0FBRyxrQkFBa0IsQ0FBQTtJQXVCakUsQ0FBQztJQXJCbUIsVUFBVSxDQUFDLFNBQXNCO1FBQ25ELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFM0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsK0JBQStCLENBQUMsMEJBQTBCLENBQUMsR0FBRyxFQUFFO1lBQ3BFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBYTtRQUNoQyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDL0QsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDN0IsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDdEUsZ0ZBQWdGO1lBQ2hGLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsa0JBQWtCO0lBQWpFOztRQUNrQiwrQkFBMEIsR0FBRyxjQUFjLENBQUE7SUFpQjdELENBQUM7SUFmbUIsVUFBVSxDQUFDLFNBQXNCO1FBQ25ELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFM0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsK0JBQStCLENBQUMsMEJBQTBCLENBQUMsR0FBRyxFQUFFO1lBQ3BFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBYTtRQUNoQyxPQUFPLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssSUFBSSxDQUFDLDBCQUEwQjtZQUMvRCxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUN2QixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0NBQ1osU0FBUSxrQkFBa0I7SUFEM0I7O1FBSWtCLCtCQUEwQixHQUFHLHdCQUF3QixDQUFBO0lBc0V2RSxDQUFDO0lBcEVtQixVQUFVLENBQUMsU0FBc0I7UUFDbkQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUUzQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQywrQkFBK0IsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLEVBQUUsQ0FDcEUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FDMUMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLEdBQUcsRUFBRSxDQUNsRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUMxQyxDQUNELENBQUE7SUFDRixDQUFDO0lBRVEsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFhO1FBQ2hDLE1BQU0sbUJBQW1CLEdBQ3hCLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssY0FBYyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQTtRQUN0RixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsbUJBQW1CO1lBQ3ZDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQ0FBc0M7UUFDbkQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FDNUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLG9EQUE0QyxDQUNwRSxDQUFBLENBQUMscUNBQXFDO1FBQ3ZDLE1BQU0sZUFBZSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQzVGLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUN6QixRQUFRLENBQUMsY0FBYyxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUM7WUFDOUQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQ2pGLENBQ0QsQ0FBQTtRQUNELE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUN4QyxlQUFlLEVBQ2YsRUFBRSxNQUFNLEVBQUUsdUNBQXVDLEVBQUUsRUFDbkQsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQywrQkFBK0I7UUFDcEMsTUFBTSwwQkFBMEIsR0FBRyxNQUFNLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxDQUFBO1FBQ3RGLElBQUksMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkMsTUFBTSxpQkFBaUIsR0FBMkIsRUFBRSxDQUFBO1lBQ3BELE1BQU0sa0JBQWtCLEdBQWlCLEVBQUUsQ0FBQTtZQUMzQyxLQUFLLE1BQU0sY0FBYyxJQUFJLDBCQUEwQixFQUFFLENBQUM7Z0JBQ3pELElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUM1QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDM0UsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGtCQUFrQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDeEMsQ0FBQztZQUNGLENBQUM7WUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQ2pCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDM0UsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUN2QyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUNsRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQztnQkFDL0IsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO2dCQUN2QixPQUFPLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHFDQUFxQyxDQUFDO2FBQy9FLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsU0FBNEI7SUFDcEUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxlQUFlLEVBQUUsUUFBUTtRQUNwRCxDQUFDLENBQUMsUUFBUSxDQUNSLHVDQUF1QyxFQUN2Qyx3QkFBd0IsRUFDeEIsU0FBUyxDQUFDLG9CQUFvQixDQUM5QjtRQUNGLENBQUMsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsZUFBZSxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQzdGLE1BQU0sVUFBVSxHQUFHLFNBQVMsRUFBRSxlQUFlO1FBQzVDLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsWUFBWSxDQUFDO1FBQzFELENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDTCxNQUFNLE1BQU0sR0FBRyxTQUFTLEVBQUUsTUFBTTtRQUMvQixDQUFDLENBQUMsUUFBUSxDQUNSLDRCQUE0QixFQUM1Qix1Q0FBdUMsRUFDdkMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQzNCLFNBQVMsQ0FBQyxXQUFXLENBQ3JCO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNMLE9BQU8sR0FBRyxTQUFTLENBQUMsV0FBVyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxPQUFPLEtBQUssU0FBUyxLQUFLLFNBQVMsQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQTtBQUNySyxDQUFDO0FBRUQsTUFBTSxPQUFPLDZCQUE2QjtJQVl6QyxZQUNrQixtQkFBaUMsRUFDakMsS0FBeUI7UUFEekIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFjO1FBQ2pDLFVBQUssR0FBTCxLQUFLLENBQW9CO1FBYjFCLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQTtRQUNqRCwrQkFBMEIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQzlDLHVDQUFrQyxHQUFpQixFQUFFLENBQUE7UUFhNUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELEtBQUssTUFBTSxDQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1FBQ0YsQ0FBQztRQUVELG1GQUFtRjtRQUNuRixJQUFJLENBQUMsTUFBTTtZQUNWLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO1FBRXJGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDeEQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLE9BQU8sRUFBRSxJQUFJO1lBQ2IsR0FBRyxFQUFFLElBQUk7WUFDVCxjQUFjLEVBQUUsSUFBSSxHQUFHLEVBQVU7U0FDakMsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQWE7UUFDdkIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsR0FBRyxDQUFDLEtBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhLEVBQUUsaUJBQW9DO1FBQ2hFLElBQUksaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUMvQyxNQUFNLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtRQUM5QixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7UUFFRCxNQUFNLGlCQUFpQixHQUN0QixLQUFLLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQUMsTUFBTSxDQUFBO1FBQ3pGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWxDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7WUFDeEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSztpQkFDdkIsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztpQkFDbEMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2lCQUM1RSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDWixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtnQkFDbkIsTUFBTSxDQUFDLENBQUE7WUFDUixDQUFDLENBQUM7aUJBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7WUFDL0QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDZixPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2pDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDbEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFOUIsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFBO1FBQ25CLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZCLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxTQUFpQixFQUFFLFVBQXdCO1FBQzdFLElBQUksd0JBQXdCLEdBQUcsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sY0FBYyxHQUFHLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQTtRQUN0RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QixJQUNDLENBQUMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQzFCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQzdELENBQUM7Z0JBQ0YsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDL0Msd0JBQXdCLEVBQUUsQ0FBQTtZQUMzQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQ2hCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNO29CQUM5QixJQUFJLENBQUMsa0NBQWtDLENBQUMsTUFBTTtvQkFDOUMsY0FBYztvQkFDZCxDQUFDLEVBQ0YsQ0FBQyxDQUNELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELHlGQUF5RjtRQUN6Rix1R0FBdUc7UUFDdkcsdUhBQXVIO1FBQ3ZILDJFQUEyRTtRQUMzRSxJQUFJLFNBQVMsS0FBSyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQztZQUNqRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFBO1lBQ2hFLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDaEQsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxLQUFLLElBQUksa0JBQWtCLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ2xDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQzNCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtvQkFDdkQsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==