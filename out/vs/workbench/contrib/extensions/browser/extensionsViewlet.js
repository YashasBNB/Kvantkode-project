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
import './media/extensionsViewlet.css';
import { localize, localize2 } from '../../../../nls.js';
import { timeout, Delayer } from '../../../../base/common/async.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { Action } from '../../../../base/common/actions.js';
import { append, $, Dimension, hide, show, DragAndDropObserver, trackFocus, addDisposableListener, EventType, clearNode, } from '../../../../base/browser/dom.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService, VIEWLET_ID, CloseExtensionDetailsOnViewChangeKey, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, WORKSPACE_RECOMMENDATIONS_VIEW_ID, AutoCheckUpdatesConfigurationKey, OUTDATED_EXTENSIONS_VIEW_ID, CONTEXT_HAS_GALLERY, extensionsSearchActionsMenu, AutoRestartConfigurationKey, } from '../common/extensions.js';
import { InstallLocalExtensionsInRemoteAction, InstallRemoteExtensionsInLocalAction, } from './extensionsActions.js';
import { IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { ExtensionsInput } from '../common/extensionsInput.js';
import { ExtensionsListView, EnabledExtensionsView, DisabledExtensionsView, RecommendedExtensionsView, WorkspaceRecommendedExtensionsView, ServerInstalledExtensionsView, DefaultRecommendedExtensionsView, UntrustedWorkspaceUnsupportedExtensionsView, UntrustedWorkspacePartiallySupportedExtensionsView, VirtualWorkspaceUnsupportedExtensionsView, VirtualWorkspacePartiallySupportedExtensionsView, DefaultPopularExtensionsView, DeprecatedExtensionsView, SearchMarketplaceExtensionsView, RecentlyUpdatedExtensionsView, OutdatedExtensionsView, StaticQueryExtensionsView, NONE_CATEGORY, } from './extensionsViews.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import Severity from '../../../../base/common/severity.js';
import { IActivityService, NumberBadge, WarningBadge, } from '../../../services/activity/common/activity.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, IViewDescriptorService, } from '../../../common/views.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IContextKeyService, ContextKeyExpr, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, NotificationPriority, } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Query } from '../common/extensionQuery.js';
import { SuggestEnabledInput } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { EXTENSION_CATEGORIES } from '../../../../platform/extensions/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { SIDE_BAR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { VirtualWorkspaceContext, WorkbenchStateContext } from '../../../common/contextkeys.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { installLocalInRemoteIcon } from './extensionsIcons.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { extractEditorsAndFilesDropData } from '../../../../platform/dnd/browser/dnd.js';
import { extname } from '../../../../base/common/resources.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IExtensionGalleryManifestService, } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
export const DefaultViewsContext = new RawContextKey('defaultExtensionViews', true);
export const ExtensionsSortByContext = new RawContextKey('extensionsSortByValue', '');
export const SearchMarketplaceExtensionsContext = new RawContextKey('searchMarketplaceExtensions', false);
export const SearchHasTextContext = new RawContextKey('extensionSearchHasText', false);
const InstalledExtensionsContext = new RawContextKey('installedExtensions', false);
const SearchInstalledExtensionsContext = new RawContextKey('searchInstalledExtensions', false);
const SearchRecentlyUpdatedExtensionsContext = new RawContextKey('searchRecentlyUpdatedExtensions', false);
const SearchExtensionUpdatesContext = new RawContextKey('searchExtensionUpdates', false);
const SearchOutdatedExtensionsContext = new RawContextKey('searchOutdatedExtensions', false);
const SearchEnabledExtensionsContext = new RawContextKey('searchEnabledExtensions', false);
const SearchDisabledExtensionsContext = new RawContextKey('searchDisabledExtensions', false);
const HasInstalledExtensionsContext = new RawContextKey('hasInstalledExtensions', true);
export const BuiltInExtensionsContext = new RawContextKey('builtInExtensions', false);
const SearchBuiltInExtensionsContext = new RawContextKey('searchBuiltInExtensions', false);
const SearchUnsupportedWorkspaceExtensionsContext = new RawContextKey('searchUnsupportedWorkspaceExtensions', false);
const SearchDeprecatedExtensionsContext = new RawContextKey('searchDeprecatedExtensions', false);
export const RecommendedExtensionsContext = new RawContextKey('recommendedExtensions', false);
const SortByUpdateDateContext = new RawContextKey('sortByUpdateDate', false);
export const ExtensionsSearchValueContext = new RawContextKey('extensionsSearchValue', '');
const REMOTE_CATEGORY = localize2({ key: 'remote', comment: ['Remote as in remote machine'] }, 'Remote');
let ExtensionsViewletViewsContribution = class ExtensionsViewletViewsContribution extends Disposable {
    constructor(extensionManagementServerService, labelService, viewDescriptorService, contextKeyService) {
        super();
        this.extensionManagementServerService = extensionManagementServerService;
        this.labelService = labelService;
        this.contextKeyService = contextKeyService;
        this.container = viewDescriptorService.getViewContainerById(VIEWLET_ID);
        this.registerViews();
    }
    registerViews() {
        const viewDescriptors = [];
        /* Default views */
        viewDescriptors.push(...this.createDefaultExtensionsViewDescriptors());
        /* Search views */
        viewDescriptors.push(...this.createSearchExtensionsViewDescriptors());
        /* Recommendations views */
        viewDescriptors.push(...this.createRecommendedExtensionsViewDescriptors());
        /* Built-in extensions views */
        viewDescriptors.push(...this.createBuiltinExtensionsViewDescriptors());
        /* Trust Required extensions views */
        viewDescriptors.push(...this.createUnsupportedWorkspaceExtensionsViewDescriptors());
        /* Other Local Filtered extensions views */
        viewDescriptors.push(...this.createOtherLocalFilteredExtensionsViewDescriptors());
        Registry.as(Extensions.ViewsRegistry).registerViews(viewDescriptors, this.container);
    }
    createDefaultExtensionsViewDescriptors() {
        const viewDescriptors = [];
        /*
         * Default installed extensions views - Shows all user installed extensions.
         */
        const servers = [];
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            servers.push(this.extensionManagementServerService.localExtensionManagementServer);
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            servers.push(this.extensionManagementServerService.remoteExtensionManagementServer);
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            servers.push(this.extensionManagementServerService.webExtensionManagementServer);
        }
        const getViewName = (viewTitle, server) => {
            return servers.length > 1 ? `${server.label} - ${viewTitle}` : viewTitle;
        };
        let installedWebExtensionsContextChangeEvent = Event.None;
        if (this.extensionManagementServerService.webExtensionManagementServer &&
            this.extensionManagementServerService.remoteExtensionManagementServer) {
            const interestingContextKeys = new Set();
            interestingContextKeys.add('hasInstalledWebExtensions');
            installedWebExtensionsContextChangeEvent = Event.filter(this.contextKeyService.onDidChangeContext, (e) => e.affectsSome(interestingContextKeys));
        }
        const serverLabelChangeEvent = Event.any(this.labelService.onDidChangeFormatters, installedWebExtensionsContextChangeEvent);
        for (const server of servers) {
            const getInstalledViewName = () => getViewName(localize('installed', 'Installed'), server);
            const onDidChangeTitle = Event.map(serverLabelChangeEvent, () => getInstalledViewName());
            const id = servers.length > 1
                ? `workbench.views.extensions.${server.id}.installed`
                : `workbench.views.extensions.installed`;
            /* Installed extensions view */
            viewDescriptors.push({
                id,
                get name() {
                    return {
                        value: getInstalledViewName(),
                        original: getViewName('Installed', server),
                    };
                },
                weight: 100,
                order: 1,
                when: ContextKeyExpr.and(DefaultViewsContext),
                ctorDescriptor: new SyncDescriptor(ServerInstalledExtensionsView, [
                    { server, flexibleHeight: true, onDidChangeTitle },
                ]),
                /* Installed extensions views shall not be allowed to hidden when there are more than one server */
                canToggleVisibility: servers.length === 1,
            });
            if (server === this.extensionManagementServerService.remoteExtensionManagementServer &&
                this.extensionManagementServerService.localExtensionManagementServer) {
                this._register(registerAction2(class InstallLocalExtensionsInRemoteAction2 extends Action2 {
                    constructor() {
                        super({
                            id: 'workbench.extensions.installLocalExtensions',
                            get title() {
                                return localize2('select and install local extensions', "Install Local Extensions in '{0}'...", server.label);
                            },
                            category: REMOTE_CATEGORY,
                            icon: installLocalInRemoteIcon,
                            f1: true,
                            menu: {
                                id: MenuId.ViewTitle,
                                when: ContextKeyExpr.equals('view', id),
                                group: 'navigation',
                            },
                        });
                    }
                    run(accessor) {
                        return accessor
                            .get(IInstantiationService)
                            .createInstance(InstallLocalExtensionsInRemoteAction)
                            .run();
                    }
                }));
            }
        }
        if (this.extensionManagementServerService.localExtensionManagementServer &&
            this.extensionManagementServerService.remoteExtensionManagementServer) {
            this._register(registerAction2(class InstallRemoteExtensionsInLocalAction2 extends Action2 {
                constructor() {
                    super({
                        id: 'workbench.extensions.actions.installLocalExtensionsInRemote',
                        title: localize2('install remote in local', 'Install Remote Extensions Locally...'),
                        category: REMOTE_CATEGORY,
                        f1: true,
                    });
                }
                run(accessor) {
                    return accessor
                        .get(IInstantiationService)
                        .createInstance(InstallRemoteExtensionsInLocalAction, 'workbench.extensions.actions.installLocalExtensionsInRemote')
                        .run();
                }
            }));
        }
        /*
         * Default popular extensions view
         * Separate view for popular extensions required as we need to show popular and recommended sections
         * in the default view when there is no search text, and user has no installed extensions.
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.popular',
            name: localize2('popularExtensions', 'Popular'),
            ctorDescriptor: new SyncDescriptor(DefaultPopularExtensionsView, [{ hideBadge: true }]),
            when: ContextKeyExpr.and(DefaultViewsContext, ContextKeyExpr.not('hasInstalledExtensions'), CONTEXT_HAS_GALLERY),
            weight: 60,
            order: 2,
            canToggleVisibility: false,
        });
        /*
         * Default recommended extensions view
         * When user has installed extensions, this is shown along with the views for enabled & disabled extensions
         * When user has no installed extensions, this is shown along with the view for popular extensions
         */
        viewDescriptors.push({
            id: 'extensions.recommendedList',
            name: localize2('recommendedExtensions', 'Recommended'),
            ctorDescriptor: new SyncDescriptor(DefaultRecommendedExtensionsView, [
                { flexibleHeight: true },
            ]),
            when: ContextKeyExpr.and(DefaultViewsContext, SortByUpdateDateContext.negate(), ContextKeyExpr.not('config.extensions.showRecommendationsOnlyOnDemand'), CONTEXT_HAS_GALLERY),
            weight: 40,
            order: 3,
            canToggleVisibility: true,
        });
        /* Installed views shall be default in multi server window  */
        if (servers.length === 1) {
            /*
             * Default enabled extensions view - Shows all user installed enabled extensions.
             * Hidden by default
             */
            viewDescriptors.push({
                id: 'workbench.views.extensions.enabled',
                name: localize2('enabledExtensions', 'Enabled'),
                ctorDescriptor: new SyncDescriptor(EnabledExtensionsView, [{}]),
                when: ContextKeyExpr.and(DefaultViewsContext, ContextKeyExpr.has('hasInstalledExtensions')),
                hideByDefault: true,
                weight: 40,
                order: 4,
                canToggleVisibility: true,
            });
            /*
             * Default disabled extensions view - Shows all disabled extensions.
             * Hidden by default
             */
            viewDescriptors.push({
                id: 'workbench.views.extensions.disabled',
                name: localize2('disabledExtensions', 'Disabled'),
                ctorDescriptor: new SyncDescriptor(DisabledExtensionsView, [{}]),
                when: ContextKeyExpr.and(DefaultViewsContext, ContextKeyExpr.has('hasInstalledExtensions')),
                hideByDefault: true,
                weight: 10,
                order: 5,
                canToggleVisibility: true,
            });
        }
        return viewDescriptors;
    }
    createSearchExtensionsViewDescriptors() {
        const viewDescriptors = [];
        /*
         * View used for searching Marketplace
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.marketplace',
            name: localize2('marketPlace', 'Marketplace'),
            ctorDescriptor: new SyncDescriptor(SearchMarketplaceExtensionsView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchMarketplaceExtensions')),
        });
        /*
         * View used for searching all installed extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchInstalled',
            name: localize2('installed', 'Installed'),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.or(ContextKeyExpr.has('searchInstalledExtensions'), ContextKeyExpr.has('installedExtensions')),
        });
        /*
         * View used for searching recently updated extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchRecentlyUpdated',
            name: localize2('recently updated', 'Recently Updated'),
            ctorDescriptor: new SyncDescriptor(RecentlyUpdatedExtensionsView, [{}]),
            when: ContextKeyExpr.or(SearchExtensionUpdatesContext, ContextKeyExpr.has('searchRecentlyUpdatedExtensions')),
            order: 2,
        });
        /*
         * View used for searching enabled extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchEnabled',
            name: localize2('enabled', 'Enabled'),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchEnabledExtensions')),
        });
        /*
         * View used for searching disabled extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchDisabled',
            name: localize2('disabled', 'Disabled'),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchDisabledExtensions')),
        });
        /*
         * View used for searching outdated extensions
         */
        viewDescriptors.push({
            id: OUTDATED_EXTENSIONS_VIEW_ID,
            name: localize2('availableUpdates', 'Available Updates'),
            ctorDescriptor: new SyncDescriptor(OutdatedExtensionsView, [{}]),
            when: ContextKeyExpr.or(SearchExtensionUpdatesContext, ContextKeyExpr.has('searchOutdatedExtensions')),
            order: 1,
        });
        /*
         * View used for searching builtin extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchBuiltin',
            name: localize2('builtin', 'Builtin'),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchBuiltInExtensions')),
        });
        /*
         * View used for searching workspace unsupported extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchWorkspaceUnsupported',
            name: localize2('workspaceUnsupported', 'Workspace Unsupported'),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchWorkspaceUnsupportedExtensions')),
        });
        return viewDescriptors;
    }
    createRecommendedExtensionsViewDescriptors() {
        const viewDescriptors = [];
        viewDescriptors.push({
            id: WORKSPACE_RECOMMENDATIONS_VIEW_ID,
            name: localize2('workspaceRecommendedExtensions', 'Workspace Recommendations'),
            ctorDescriptor: new SyncDescriptor(WorkspaceRecommendedExtensionsView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('recommendedExtensions'), WorkbenchStateContext.notEqualsTo('empty')),
            order: 1,
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.otherRecommendations',
            name: localize2('otherRecommendedExtensions', 'Other Recommendations'),
            ctorDescriptor: new SyncDescriptor(RecommendedExtensionsView, [{}]),
            when: ContextKeyExpr.has('recommendedExtensions'),
            order: 2,
        });
        return viewDescriptors;
    }
    createBuiltinExtensionsViewDescriptors() {
        const viewDescriptors = [];
        const configuredCategories = ['themes', 'programming languages'];
        const otherCategories = EXTENSION_CATEGORIES.filter((c) => !configuredCategories.includes(c.toLowerCase()));
        otherCategories.push(NONE_CATEGORY);
        const otherCategoriesQuery = `${otherCategories.map((c) => `category:"${c}"`).join(' ')} ${configuredCategories.map((c) => `category:"-${c}"`).join(' ')}`;
        viewDescriptors.push({
            id: 'workbench.views.extensions.builtinFeatureExtensions',
            name: localize2('builtinFeatureExtensions', 'Features'),
            ctorDescriptor: new SyncDescriptor(StaticQueryExtensionsView, [
                { query: `@builtin ${otherCategoriesQuery}` },
            ]),
            when: ContextKeyExpr.has('builtInExtensions'),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.builtinThemeExtensions',
            name: localize2('builtInThemesExtensions', 'Themes'),
            ctorDescriptor: new SyncDescriptor(StaticQueryExtensionsView, [
                { query: `@builtin category:themes` },
            ]),
            when: ContextKeyExpr.has('builtInExtensions'),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.builtinProgrammingLanguageExtensions',
            name: localize2('builtinProgrammingLanguageExtensions', 'Programming Languages'),
            ctorDescriptor: new SyncDescriptor(StaticQueryExtensionsView, [
                { query: `@builtin category:"programming languages"` },
            ]),
            when: ContextKeyExpr.has('builtInExtensions'),
        });
        return viewDescriptors;
    }
    createUnsupportedWorkspaceExtensionsViewDescriptors() {
        const viewDescriptors = [];
        viewDescriptors.push({
            id: 'workbench.views.extensions.untrustedUnsupportedExtensions',
            name: localize2('untrustedUnsupportedExtensions', 'Disabled in Restricted Mode'),
            ctorDescriptor: new SyncDescriptor(UntrustedWorkspaceUnsupportedExtensionsView, [{}]),
            when: ContextKeyExpr.and(SearchUnsupportedWorkspaceExtensionsContext),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.untrustedPartiallySupportedExtensions',
            name: localize2('untrustedPartiallySupportedExtensions', 'Limited in Restricted Mode'),
            ctorDescriptor: new SyncDescriptor(UntrustedWorkspacePartiallySupportedExtensionsView, [{}]),
            when: ContextKeyExpr.and(SearchUnsupportedWorkspaceExtensionsContext),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.virtualUnsupportedExtensions',
            name: localize2('virtualUnsupportedExtensions', 'Disabled in Virtual Workspaces'),
            ctorDescriptor: new SyncDescriptor(VirtualWorkspaceUnsupportedExtensionsView, [{}]),
            when: ContextKeyExpr.and(VirtualWorkspaceContext, SearchUnsupportedWorkspaceExtensionsContext),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.virtualPartiallySupportedExtensions',
            name: localize2('virtualPartiallySupportedExtensions', 'Limited in Virtual Workspaces'),
            ctorDescriptor: new SyncDescriptor(VirtualWorkspacePartiallySupportedExtensionsView, [{}]),
            when: ContextKeyExpr.and(VirtualWorkspaceContext, SearchUnsupportedWorkspaceExtensionsContext),
        });
        return viewDescriptors;
    }
    createOtherLocalFilteredExtensionsViewDescriptors() {
        const viewDescriptors = [];
        viewDescriptors.push({
            id: 'workbench.views.extensions.deprecatedExtensions',
            name: localize2('deprecated', 'Deprecated'),
            ctorDescriptor: new SyncDescriptor(DeprecatedExtensionsView, [{}]),
            when: ContextKeyExpr.and(SearchDeprecatedExtensionsContext),
        });
        return viewDescriptors;
    }
};
ExtensionsViewletViewsContribution = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, ILabelService),
    __param(2, IViewDescriptorService),
    __param(3, IContextKeyService)
], ExtensionsViewletViewsContribution);
export { ExtensionsViewletViewsContribution };
let ExtensionsViewPaneContainer = class ExtensionsViewPaneContainer extends ViewPaneContainer {
    constructor(layoutService, telemetryService, progressService, instantiationService, editorGroupService, extensionGalleryManifestService, extensionsWorkbenchService, extensionManagementServerService, notificationService, paneCompositeService, themeService, configurationService, storageService, contextService, contextKeyService, contextMenuService, extensionService, viewDescriptorService, preferencesService, commandService, logService) {
        super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
        this.progressService = progressService;
        this.editorGroupService = editorGroupService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.notificationService = notificationService;
        this.paneCompositeService = paneCompositeService;
        this.contextKeyService = contextKeyService;
        this.preferencesService = preferencesService;
        this.commandService = commandService;
        this.extensionGalleryManifest = null;
        this.notificationDisposables = this._register(new MutableDisposable());
        this.searchDelayer = new Delayer(500);
        this.extensionsSearchValueContextKey = ExtensionsSearchValueContext.bindTo(contextKeyService);
        this.defaultViewsContextKey = DefaultViewsContext.bindTo(contextKeyService);
        this.sortByContextKey = ExtensionsSortByContext.bindTo(contextKeyService);
        this.searchMarketplaceExtensionsContextKey =
            SearchMarketplaceExtensionsContext.bindTo(contextKeyService);
        this.searchHasTextContextKey = SearchHasTextContext.bindTo(contextKeyService);
        this.sortByUpdateDateContextKey = SortByUpdateDateContext.bindTo(contextKeyService);
        this.installedExtensionsContextKey = InstalledExtensionsContext.bindTo(contextKeyService);
        this.searchInstalledExtensionsContextKey =
            SearchInstalledExtensionsContext.bindTo(contextKeyService);
        this.searchRecentlyUpdatedExtensionsContextKey =
            SearchRecentlyUpdatedExtensionsContext.bindTo(contextKeyService);
        this.searchExtensionUpdatesContextKey = SearchExtensionUpdatesContext.bindTo(contextKeyService);
        this.searchWorkspaceUnsupportedExtensionsContextKey =
            SearchUnsupportedWorkspaceExtensionsContext.bindTo(contextKeyService);
        this.searchDeprecatedExtensionsContextKey =
            SearchDeprecatedExtensionsContext.bindTo(contextKeyService);
        this.searchOutdatedExtensionsContextKey =
            SearchOutdatedExtensionsContext.bindTo(contextKeyService);
        this.searchEnabledExtensionsContextKey =
            SearchEnabledExtensionsContext.bindTo(contextKeyService);
        this.searchDisabledExtensionsContextKey =
            SearchDisabledExtensionsContext.bindTo(contextKeyService);
        this.hasInstalledExtensionsContextKey = HasInstalledExtensionsContext.bindTo(contextKeyService);
        this.builtInExtensionsContextKey = BuiltInExtensionsContext.bindTo(contextKeyService);
        this.searchBuiltInExtensionsContextKey =
            SearchBuiltInExtensionsContext.bindTo(contextKeyService);
        this.recommendedExtensionsContextKey = RecommendedExtensionsContext.bindTo(contextKeyService);
        this._register(this.paneCompositeService.onDidPaneCompositeOpen((e) => {
            if (e.viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
                this.onViewletOpen(e.composite);
            }
        }, this));
        this._register(extensionsWorkbenchService.onReset(() => this.refresh()));
        this.searchViewletState = this.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        extensionGalleryManifestService.getExtensionGalleryManifest().then((galleryManifest) => {
            this.extensionGalleryManifest = galleryManifest;
            this._register(extensionGalleryManifestService.onDidChangeExtensionGalleryManifest((galleryManifest) => {
                this.extensionGalleryManifest = galleryManifest;
                this.refresh();
            }));
        });
    }
    get searchValue() {
        return this.searchBox?.getValue();
    }
    create(parent) {
        parent.classList.add('extensions-viewlet');
        this.root = parent;
        const overlay = append(this.root, $('.overlay'));
        const overlayBackgroundColor = this.getColor(SIDE_BAR_DRAG_AND_DROP_BACKGROUND) ?? '';
        overlay.style.backgroundColor = overlayBackgroundColor;
        hide(overlay);
        this.header = append(this.root, $('.header'));
        const placeholder = localize('searchExtensions', 'Search Extensions in Marketplace');
        const searchValue = this.searchViewletState['query.value']
            ? this.searchViewletState['query.value']
            : '';
        const searchContainer = append(this.header, $('.extensions-search-container'));
        this.searchBox = this._register(this.instantiationService.createInstance(SuggestEnabledInput, `${VIEWLET_ID}.searchbox`, searchContainer, {
            triggerCharacters: ['@'],
            sortKey: (item) => {
                if (item.indexOf(':') === -1) {
                    return 'a';
                }
                else if (/ext:/.test(item) || /id:/.test(item) || /tag:/.test(item)) {
                    return 'b';
                }
                else if (/sort:/.test(item)) {
                    return 'c';
                }
                else {
                    return 'd';
                }
            },
            provideResults: (query) => Query.suggestions(query, this.extensionGalleryManifest),
        }, placeholder, 'extensions:searchinput', { placeholderText: placeholder, value: searchValue }));
        this.notificationContainer = append(this.header, $('.notification-container.hidden', { tabindex: '0' }));
        this.renderNotificaiton();
        this._register(this.extensionsWorkbenchService.onDidChangeExtensionsNotification(() => this.renderNotificaiton()));
        this.updateInstalledExtensionsContexts();
        if (this.searchBox.getValue()) {
            this.triggerSearch();
        }
        this._register(this.searchBox.onInputDidChange(() => {
            this.sortByContextKey.set(Query.parse(this.searchBox?.getValue() ?? '').sortBy);
            this.triggerSearch();
        }, this));
        this._register(this.searchBox.onShouldFocusResults(() => this.focusListView(), this));
        const controlElement = append(searchContainer, $('.extensions-search-actions-container'));
        this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, controlElement, extensionsSearchActionsMenu, {
            toolbarOptions: {
                primaryGroup: () => true,
            },
            actionViewItemProvider: (action, options) => createActionViewItem(this.instantiationService, action, options),
        }));
        // Register DragAndDrop support
        this._register(new DragAndDropObserver(this.root, {
            onDragEnter: (e) => {
                if (this.isSupportedDragElement(e)) {
                    show(overlay);
                }
            },
            onDragLeave: (e) => {
                if (this.isSupportedDragElement(e)) {
                    hide(overlay);
                }
            },
            onDragOver: (e) => {
                if (this.isSupportedDragElement(e)) {
                    e.dataTransfer.dropEffect = 'copy';
                }
            },
            onDrop: async (e) => {
                if (this.isSupportedDragElement(e)) {
                    hide(overlay);
                    const vsixs = coalesce((await this.instantiationService.invokeFunction((accessor) => extractEditorsAndFilesDropData(accessor, e))).map((editor) => editor.resource && extname(editor.resource) === '.vsix'
                        ? editor.resource
                        : undefined));
                    if (vsixs.length > 0) {
                        try {
                            // Attempt to install the extension(s)
                            await this.commandService.executeCommand(INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, vsixs);
                        }
                        catch (err) {
                            this.notificationService.error(err);
                        }
                    }
                }
            },
        }));
        super.create(append(this.root, $('.extensions')));
        const focusTracker = this._register(trackFocus(this.root));
        const isSearchBoxFocused = () => this.searchBox?.inputWidget.hasWidgetFocus();
        this._register(registerNavigableContainer({
            name: 'extensionsView',
            focusNotifiers: [focusTracker],
            focusNextWidget: () => {
                if (isSearchBoxFocused()) {
                    this.focusListView();
                }
            },
            focusPreviousWidget: () => {
                if (!isSearchBoxFocused()) {
                    this.searchBox?.focus();
                }
            },
        }));
    }
    focus() {
        super.focus();
        this.searchBox?.focus();
    }
    layout(dimension) {
        this._dimension = dimension;
        if (this.root) {
            this.root.classList.toggle('narrow', dimension.width <= 250);
            this.root.classList.toggle('mini', dimension.width <= 200);
        }
        this.searchBox?.layout(new Dimension(dimension.width - 34 - /*padding*/ 8 - 24 * 2, 20));
        const searchBoxHeight = 20 + 21; /*margin*/
        const headerHeight = this.header && !!this.notificationContainer?.childNodes.length
            ? this.notificationContainer.clientHeight + searchBoxHeight + 10 /*margin*/
            : searchBoxHeight;
        this.header.style.height = `${headerHeight}px`;
        super.layout(new Dimension(dimension.width, dimension.height - headerHeight));
    }
    getOptimalWidth() {
        return 400;
    }
    search(value) {
        if (this.searchBox && this.searchBox.getValue() !== value) {
            this.searchBox.setValue(value);
        }
    }
    async refresh() {
        await this.updateInstalledExtensionsContexts();
        this.doSearch(true);
        if (this.configurationService.getValue(AutoCheckUpdatesConfigurationKey)) {
            this.extensionsWorkbenchService.checkForUpdates();
        }
    }
    renderNotificaiton() {
        if (!this.notificationContainer) {
            return;
        }
        clearNode(this.notificationContainer);
        this.notificationDisposables.value = new DisposableStore();
        const status = this.extensionsWorkbenchService.getExtensionsNotification();
        const query = status?.extensions.map((extension) => `@id:${extension.identifier.id}`).join(' ');
        if (status &&
            (query === this.searchBox?.getValue() || !this.searchMarketplaceExtensionsContextKey.get())) {
            this.notificationContainer.setAttribute('aria-label', status.message);
            this.notificationContainer.classList.remove('hidden');
            const messageContainer = append(this.notificationContainer, $('.message-container'));
            append(messageContainer, $('span')).className = SeverityIcon.className(status.severity);
            append(messageContainer, $('span.message', undefined, status.message));
            const showAction = append(messageContainer, $('span.message-text-action', {
                tabindex: '0',
                role: 'button',
                'aria-label': `${status.message}. ${localize('click show', 'Click to Show')}`,
            }, localize('show', 'Show')));
            this.notificationDisposables.value.add(addDisposableListener(showAction, EventType.CLICK, () => this.search(query ?? '')));
            this.notificationDisposables.value.add(addDisposableListener(showAction, EventType.KEY_DOWN, (e) => {
                const standardKeyboardEvent = new StandardKeyboardEvent(e);
                if (standardKeyboardEvent.keyCode === 3 /* KeyCode.Enter */ ||
                    standardKeyboardEvent.keyCode === 10 /* KeyCode.Space */) {
                    this.search(query ?? '');
                }
                standardKeyboardEvent.stopPropagation();
            }));
            const dismissAction = append(this.notificationContainer, $(`span.message-action${ThemeIcon.asCSSSelector(Codicon.close)}`, {
                tabindex: '0',
                role: 'button',
                'aria-label': localize('dismiss', 'Dismiss'),
                title: localize('dismiss', 'Dismiss'),
            }));
            this.notificationDisposables.value.add(addDisposableListener(dismissAction, EventType.CLICK, () => status.dismiss()));
            this.notificationDisposables.value.add(addDisposableListener(dismissAction, EventType.KEY_DOWN, (e) => {
                const standardKeyboardEvent = new StandardKeyboardEvent(e);
                if (standardKeyboardEvent.keyCode === 3 /* KeyCode.Enter */ ||
                    standardKeyboardEvent.keyCode === 10 /* KeyCode.Space */) {
                    status.dismiss();
                }
                standardKeyboardEvent.stopPropagation();
            }));
        }
        else {
            this.notificationContainer.removeAttribute('aria-label');
            this.notificationContainer.classList.add('hidden');
        }
        if (this._dimension) {
            this.layout(this._dimension);
        }
    }
    async updateInstalledExtensionsContexts() {
        const result = await this.extensionsWorkbenchService.queryLocal();
        this.hasInstalledExtensionsContextKey.set(result.some((r) => !r.isBuiltin));
    }
    triggerSearch() {
        this.searchDelayer
            .trigger(() => this.doSearch(), this.searchBox && this.searchBox.getValue() ? 500 : 0)
            .then(undefined, (err) => this.onError(err));
    }
    normalizedQuery() {
        return this.searchBox
            ? this.searchBox
                .getValue()
                .trim()
                .replace(/@category/g, 'category')
                .replace(/@tag:/g, 'tag:')
                .replace(/@ext:/g, 'ext:')
                .replace(/@featured/g, 'featured')
                .replace(/@popular/g, this.extensionManagementServerService.webExtensionManagementServer &&
                !this.extensionManagementServerService.localExtensionManagementServer &&
                !this.extensionManagementServerService.remoteExtensionManagementServer
                ? '@web'
                : '@popular')
            : '';
    }
    saveState() {
        const value = this.searchBox ? this.searchBox.getValue() : '';
        if (ExtensionsListView.isLocalExtensionsQuery(value)) {
            this.searchViewletState['query.value'] = value;
        }
        else {
            this.searchViewletState['query.value'] = '';
        }
        super.saveState();
    }
    doSearch(refresh) {
        const value = this.normalizedQuery();
        this.contextKeyService.bufferChangeEvents(() => {
            const isRecommendedExtensionsQuery = ExtensionsListView.isRecommendedExtensionsQuery(value);
            this.searchHasTextContextKey.set(value.trim() !== '');
            this.extensionsSearchValueContextKey.set(value);
            this.installedExtensionsContextKey.set(ExtensionsListView.isInstalledExtensionsQuery(value));
            this.searchInstalledExtensionsContextKey.set(ExtensionsListView.isSearchInstalledExtensionsQuery(value));
            this.searchRecentlyUpdatedExtensionsContextKey.set(ExtensionsListView.isSearchRecentlyUpdatedQuery(value) &&
                !ExtensionsListView.isSearchExtensionUpdatesQuery(value));
            this.searchOutdatedExtensionsContextKey.set(ExtensionsListView.isOutdatedExtensionsQuery(value) &&
                !ExtensionsListView.isSearchExtensionUpdatesQuery(value));
            this.searchExtensionUpdatesContextKey.set(ExtensionsListView.isSearchExtensionUpdatesQuery(value));
            this.searchEnabledExtensionsContextKey.set(ExtensionsListView.isEnabledExtensionsQuery(value));
            this.searchDisabledExtensionsContextKey.set(ExtensionsListView.isDisabledExtensionsQuery(value));
            this.searchBuiltInExtensionsContextKey.set(ExtensionsListView.isSearchBuiltInExtensionsQuery(value));
            this.searchWorkspaceUnsupportedExtensionsContextKey.set(ExtensionsListView.isSearchWorkspaceUnsupportedExtensionsQuery(value));
            this.searchDeprecatedExtensionsContextKey.set(ExtensionsListView.isSearchDeprecatedExtensionsQuery(value));
            this.builtInExtensionsContextKey.set(ExtensionsListView.isBuiltInExtensionsQuery(value));
            this.recommendedExtensionsContextKey.set(isRecommendedExtensionsQuery);
            this.searchMarketplaceExtensionsContextKey.set(!!value &&
                !ExtensionsListView.isLocalExtensionsQuery(value) &&
                !isRecommendedExtensionsQuery);
            this.sortByUpdateDateContextKey.set(ExtensionsListView.isSortUpdateDateQuery(value));
            this.defaultViewsContextKey.set(!value || ExtensionsListView.isSortInstalledExtensionsQuery(value));
        });
        this.renderNotificaiton();
        return this.progress(Promise.all(this.panes.map((view) => view
            .show(this.normalizedQuery(), refresh)
            .then((model) => this.alertSearchResult(model.length, view.id))))).then(() => undefined);
    }
    onDidAddViewDescriptors(added) {
        const addedViews = super.onDidAddViewDescriptors(added);
        this.progress(Promise.all(addedViews.map((addedView) => addedView
            .show(this.normalizedQuery())
            .then((model) => this.alertSearchResult(model.length, addedView.id)))));
        return addedViews;
    }
    alertSearchResult(count, viewId) {
        const view = this.viewContainerModel.visibleViewDescriptors.find((view) => view.id === viewId);
        switch (count) {
            case 0:
                break;
            case 1:
                if (view) {
                    alert(localize('extensionFoundInSection', '1 extension found in the {0} section.', view.name.value));
                }
                else {
                    alert(localize('extensionFound', '1 extension found.'));
                }
                break;
            default:
                if (view) {
                    alert(localize('extensionsFoundInSection', '{0} extensions found in the {1} section.', count, view.name.value));
                }
                else {
                    alert(localize('extensionsFound', '{0} extensions found.', count));
                }
                break;
        }
    }
    getFirstExpandedPane() {
        for (const pane of this.panes) {
            if (pane.isExpanded() && pane instanceof ExtensionsListView) {
                return pane;
            }
        }
        return undefined;
    }
    focusListView() {
        const pane = this.getFirstExpandedPane();
        if (pane && pane.count() > 0) {
            pane.focus();
        }
    }
    onViewletOpen(viewlet) {
        if (!viewlet || viewlet.getId() === VIEWLET_ID) {
            return;
        }
        if (this.configurationService.getValue(CloseExtensionDetailsOnViewChangeKey)) {
            const promises = this.editorGroupService.groups.map((group) => {
                const editors = group.editors.filter((input) => input instanceof ExtensionsInput);
                return group.closeEditors(editors);
            });
            Promise.all(promises);
        }
    }
    progress(promise) {
        return this.progressService.withProgress({ location: 5 /* ProgressLocation.Extensions */ }, () => promise);
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
    isSupportedDragElement(e) {
        if (e.dataTransfer) {
            const typesLowerCase = e.dataTransfer.types.map((t) => t.toLocaleLowerCase());
            return typesLowerCase.indexOf('files') !== -1;
        }
        return false;
    }
};
ExtensionsViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IProgressService),
    __param(3, IInstantiationService),
    __param(4, IEditorGroupsService),
    __param(5, IExtensionGalleryManifestService),
    __param(6, IExtensionsWorkbenchService),
    __param(7, IExtensionManagementServerService),
    __param(8, INotificationService),
    __param(9, IPaneCompositePartService),
    __param(10, IThemeService),
    __param(11, IConfigurationService),
    __param(12, IStorageService),
    __param(13, IWorkspaceContextService),
    __param(14, IContextKeyService),
    __param(15, IContextMenuService),
    __param(16, IExtensionService),
    __param(17, IViewDescriptorService),
    __param(18, IPreferencesService),
    __param(19, ICommandService),
    __param(20, ILogService)
], ExtensionsViewPaneContainer);
export { ExtensionsViewPaneContainer };
let StatusUpdater = class StatusUpdater extends Disposable {
    constructor(activityService, extensionsWorkbenchService, extensionEnablementService, configurationService) {
        super();
        this.activityService = activityService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.configurationService = configurationService;
        this.badgeHandle = this._register(new MutableDisposable());
        this.onServiceChange();
        this._register(Event.any(Event.debounce(extensionsWorkbenchService.onChange, () => undefined, 100, undefined, undefined, undefined, this._store), extensionsWorkbenchService.onDidChangeExtensionsNotification)(this.onServiceChange, this));
    }
    onServiceChange() {
        this.badgeHandle.clear();
        let badge;
        const extensionsNotification = this.extensionsWorkbenchService.getExtensionsNotification();
        if (extensionsNotification) {
            if (extensionsNotification.severity === Severity.Warning) {
                badge = new WarningBadge(() => extensionsNotification.message);
            }
        }
        else {
            const actionRequired = this.configurationService.getValue(AutoRestartConfigurationKey) === true
                ? []
                : this.extensionsWorkbenchService.installed.filter((e) => e.runtimeState !== undefined);
            const outdated = this.extensionsWorkbenchService.outdated.reduce((r, e) => r +
                (this.extensionEnablementService.isEnabled(e.local) && !actionRequired.includes(e)
                    ? 1
                    : 0), 0);
            const newBadgeNumber = outdated + actionRequired.length;
            if (newBadgeNumber > 0) {
                let msg = '';
                if (outdated) {
                    msg +=
                        outdated === 1
                            ? localize('extensionToUpdate', '{0} requires update', outdated)
                            : localize('extensionsToUpdate', '{0} require update', outdated);
                }
                if (outdated > 0 && actionRequired.length > 0) {
                    msg += ', ';
                }
                if (actionRequired.length) {
                    msg +=
                        actionRequired.length === 1
                            ? localize('extensionToReload', '{0} requires restart', actionRequired.length)
                            : localize('extensionsToReload', '{0} require restart', actionRequired.length);
                }
                badge = new NumberBadge(newBadgeNumber, () => msg);
            }
        }
        if (badge) {
            this.badgeHandle.value = this.activityService.showViewContainerActivity(VIEWLET_ID, { badge });
        }
    }
};
StatusUpdater = __decorate([
    __param(0, IActivityService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IWorkbenchExtensionEnablementService),
    __param(3, IConfigurationService)
], StatusUpdater);
export { StatusUpdater };
let MaliciousExtensionChecker = class MaliciousExtensionChecker {
    constructor(extensionsManagementService, extensionsWorkbenchService, hostService, logService, notificationService) {
        this.extensionsManagementService = extensionsManagementService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.hostService = hostService;
        this.logService = logService;
        this.notificationService = notificationService;
        this.loopCheckForMaliciousExtensions();
    }
    loopCheckForMaliciousExtensions() {
        this.checkForMaliciousExtensions()
            .then(() => timeout(1000 * 60 * 5)) // every five minutes
            .then(() => this.loopCheckForMaliciousExtensions());
    }
    async checkForMaliciousExtensions() {
        try {
            const maliciousExtensions = [];
            let shouldRestartExtensions = false;
            let shouldReloadWindow = false;
            for (const extension of this.extensionsWorkbenchService.installed) {
                if (extension.isMalicious && extension.local) {
                    maliciousExtensions.push(extension.local);
                    shouldRestartExtensions =
                        shouldRestartExtensions ||
                            extension.runtimeState?.action === "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */;
                    shouldReloadWindow =
                        shouldReloadWindow ||
                            extension.runtimeState?.action === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */;
                }
            }
            if (maliciousExtensions.length) {
                await this.extensionsManagementService.uninstallExtensions(maliciousExtensions.map((e) => ({ extension: e, options: { remove: true } })));
                this.notificationService.prompt(Severity.Warning, localize('malicious warning', 'The following extensions were found to be problematic and have been uninstalled: {0}', maliciousExtensions.map((e) => e.identifier.id).join(', ')), shouldRestartExtensions || shouldReloadWindow
                    ? [
                        {
                            label: shouldRestartExtensions
                                ? localize('restartNow', 'Restart Extensions')
                                : localize('reloadNow', 'Reload Now'),
                            run: () => shouldRestartExtensions
                                ? this.extensionsWorkbenchService.updateRunningExtensions()
                                : this.hostService.reload(),
                        },
                    ]
                    : [], {
                    sticky: true,
                    priority: NotificationPriority.URGENT,
                });
            }
        }
        catch (err) {
            this.logService.error(err);
        }
    }
};
MaliciousExtensionChecker = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IHostService),
    __param(3, ILogService),
    __param(4, INotificationService)
], MaliciousExtensionChecker);
export { MaliciousExtensionChecker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdsZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc1ZpZXdsZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFaEYsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sTUFBTSxFQUNOLENBQUMsRUFDRCxTQUFTLEVBQ1QsSUFBSSxFQUNKLElBQUksRUFDSixtQkFBbUIsRUFDbkIsVUFBVSxFQUNWLHFCQUFxQixFQUNyQixTQUFTLEVBQ1QsU0FBUyxHQUNULE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTiwyQkFBMkIsRUFFM0Is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