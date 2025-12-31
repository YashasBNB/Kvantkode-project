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
import * as resources from '../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { localize } from '../../../nls.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier, ExtensionIdentifierSet, } from '../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Extensions as ViewletExtensions, } from '../../browser/panecomposite.js';
import { CustomTreeView, TreeViewPane } from '../../browser/parts/views/treeView.js';
import { ViewPaneContainer } from '../../browser/parts/views/viewPaneContainer.js';
import { registerWorkbenchContribution2, } from '../../common/contributions.js';
import { Extensions as ViewContainerExtensions, } from '../../common/views.js';
import { VIEWLET_ID as DEBUG } from '../../contrib/debug/common/debug.js';
import { VIEWLET_ID as EXPLORER } from '../../contrib/files/common/files.js';
import { VIEWLET_ID as REMOTE } from '../../contrib/remote/browser/remoteExplorer.js';
import { VIEWLET_ID as SCM } from '../../contrib/scm/common/scm.js';
import { WebviewViewPane } from '../../contrib/webviewView/browser/webviewViewPane.js';
import { isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExtensionsRegistry, } from '../../services/extensions/common/extensionsRegistry.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Extensions as ExtensionFeaturesRegistryExtensions, } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
const viewsContainerSchema = {
    type: 'object',
    properties: {
        id: {
            description: localize({
                key: 'vscode.extension.contributes.views.containers.id',
                comment: [
                    'Contribution refers to those that an extension contributes to VS Code through an extension/contribution point. ',
                ],
            }, "Unique id used to identify the container in which views can be contributed using 'views' contribution point"),
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$',
        },
        title: {
            description: localize('vscode.extension.contributes.views.containers.title', 'Human readable string used to render the container'),
            type: 'string',
        },
        icon: {
            description: localize('vscode.extension.contributes.views.containers.icon', "Path to the container icon. Icons are 24x24 centered on a 50x40 block and have a fill color of 'rgb(215, 218, 224)' or '#d7dae0'. It is recommended that icons be in SVG, though any image file type is accepted."),
            type: 'string',
        },
    },
    required: ['id', 'title', 'icon'],
};
export const viewsContainersContribution = {
    description: localize('vscode.extension.contributes.viewsContainers', 'Contributes views containers to the editor'),
    type: 'object',
    properties: {
        activitybar: {
            description: localize('views.container.activitybar', 'Contribute views containers to Activity Bar'),
            type: 'array',
            items: viewsContainerSchema,
        },
        panel: {
            description: localize('views.container.panel', 'Contribute views containers to Panel'),
            type: 'array',
            items: viewsContainerSchema,
        },
    },
    additionalProperties: false,
};
var ViewType;
(function (ViewType) {
    ViewType["Tree"] = "tree";
    ViewType["Webview"] = "webview";
})(ViewType || (ViewType = {}));
var InitialVisibility;
(function (InitialVisibility) {
    InitialVisibility["Visible"] = "visible";
    InitialVisibility["Hidden"] = "hidden";
    InitialVisibility["Collapsed"] = "collapsed";
})(InitialVisibility || (InitialVisibility = {}));
const viewDescriptor = {
    type: 'object',
    required: ['id', 'name', 'icon'],
    defaultSnippets: [{ body: { id: '${1:id}', name: '${2:name}', icon: '${3:icon}' } }],
    properties: {
        type: {
            markdownDescription: localize('vscode.extension.contributes.view.type', 'Type of the view. This can either be `tree` for a tree view based view or `webview` for a webview based view. The default is `tree`.'),
            type: 'string',
            enum: ['tree', 'webview'],
            markdownEnumDescriptions: [
                localize('vscode.extension.contributes.view.tree', 'The view is backed by a `TreeView` created by `createTreeView`.'),
                localize('vscode.extension.contributes.view.webview', 'The view is backed by a `WebviewView` registered by `registerWebviewViewProvider`.'),
            ],
        },
        id: {
            markdownDescription: localize('vscode.extension.contributes.view.id', 'Identifier of the view. This should be unique across all views. It is recommended to include your extension id as part of the view id. Use this to register a data provider through `vscode.window.registerTreeDataProviderForView` API. Also to trigger activating your extension by registering `onView:${id}` event to `activationEvents`.'),
            type: 'string',
        },
        name: {
            description: localize('vscode.extension.contributes.view.name', 'The human-readable name of the view. Will be shown'),
            type: 'string',
        },
        when: {
            description: localize('vscode.extension.contributes.view.when', 'Condition which must be true to show this view'),
            type: 'string',
        },
        icon: {
            description: localize('vscode.extension.contributes.view.icon', 'Path to the view icon. View icons are displayed when the name of the view cannot be shown. It is recommended that icons be in SVG, though any image file type is accepted.'),
            type: 'string',
        },
        contextualTitle: {
            description: localize('vscode.extension.contributes.view.contextualTitle', "Human-readable context for when the view is moved out of its original location. By default, the view's container name will be used."),
            type: 'string',
        },
        visibility: {
            description: localize('vscode.extension.contributes.view.initialState', 'Initial state of the view when the extension is first installed. Once the user has changed the view state by collapsing, moving, or hiding the view, the initial state will not be used again.'),
            type: 'string',
            enum: ['visible', 'hidden', 'collapsed'],
            default: 'visible',
            enumDescriptions: [
                localize('vscode.extension.contributes.view.initialState.visible', 'The default initial state for the view. In most containers the view will be expanded, however; some built-in containers (explorer, scm, and debug) show all contributed views collapsed regardless of the `visibility`.'),
                localize('vscode.extension.contributes.view.initialState.hidden', 'The view will not be shown in the view container, but will be discoverable through the views menu and other view entry points and can be un-hidden by the user.'),
                localize('vscode.extension.contributes.view.initialState.collapsed', 'The view will show in the view container, but will be collapsed.'),
            ],
        },
        initialSize: {
            type: 'number',
            description: localize('vscode.extension.contributs.view.size', "The initial size of the view. The size will behave like the css 'flex' property, and will set the initial size when the view is first shown. In the side bar, this is the height of the view. This value is only respected when the same extension owns both the view and the view container."),
        },
        accessibilityHelpContent: {
            type: 'string',
            markdownDescription: localize('vscode.extension.contributes.view.accessibilityHelpContent', 'When the accessibility help dialog is invoked in this view, this content will be presented to the user as a markdown string. Keybindings will be resolved when provided in the format of <keybinding:commandId>. If there is no keybinding, that will be indicated and this command will be included in a quickpick for easy configuration.'),
        },
    },
};
const remoteViewDescriptor = {
    type: 'object',
    required: ['id', 'name'],
    properties: {
        id: {
            description: localize('vscode.extension.contributes.view.id', 'Identifier of the view. This should be unique across all views. It is recommended to include your extension id as part of the view id. Use this to register a data provider through `vscode.window.registerTreeDataProviderForView` API. Also to trigger activating your extension by registering `onView:${id}` event to `activationEvents`.'),
            type: 'string',
        },
        name: {
            description: localize('vscode.extension.contributes.view.name', 'The human-readable name of the view. Will be shown'),
            type: 'string',
        },
        when: {
            description: localize('vscode.extension.contributes.view.when', 'Condition which must be true to show this view'),
            type: 'string',
        },
        group: {
            description: localize('vscode.extension.contributes.view.group', 'Nested group in the viewlet'),
            type: 'string',
        },
        remoteName: {
            description: localize('vscode.extension.contributes.view.remoteName', 'The name of the remote type associated with this view'),
            type: ['string', 'array'],
            items: {
                type: 'string',
            },
        },
    },
};
const viewsContribution = {
    description: localize('vscode.extension.contributes.views', 'Contributes views to the editor'),
    type: 'object',
    properties: {
        explorer: {
            description: localize('views.explorer', 'Contributes views to Explorer container in the Activity bar'),
            type: 'array',
            items: viewDescriptor,
            default: [],
        },
        debug: {
            description: localize('views.debug', 'Contributes views to Debug container in the Activity bar'),
            type: 'array',
            items: viewDescriptor,
            default: [],
        },
        scm: {
            description: localize('views.scm', 'Contributes views to SCM container in the Activity bar'),
            type: 'array',
            items: viewDescriptor,
            default: [],
        },
        test: {
            description: localize('views.test', 'Contributes views to Test container in the Activity bar'),
            type: 'array',
            items: viewDescriptor,
            default: [],
        },
        remote: {
            description: localize('views.remote', 'Contributes views to Remote container in the Activity bar. To contribute to this container, enableProposedApi needs to be turned on'),
            type: 'array',
            items: remoteViewDescriptor,
            default: [],
        },
    },
    additionalProperties: {
        description: localize('views.contributed', 'Contributes views to contributed views container'),
        type: 'array',
        items: viewDescriptor,
        default: [],
    },
};
const viewsContainersExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'viewsContainers',
    jsonSchema: viewsContainersContribution,
});
const viewsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'views',
    deps: [viewsContainersExtensionPoint],
    jsonSchema: viewsContribution,
    activationEventsGenerator: (viewExtensionPointTypeArray, result) => {
        for (const viewExtensionPointType of viewExtensionPointTypeArray) {
            for (const viewDescriptors of Object.values(viewExtensionPointType)) {
                for (const viewDescriptor of viewDescriptors) {
                    if (viewDescriptor.id) {
                        result.push(`onView:${viewDescriptor.id}`);
                    }
                }
            }
        }
    },
});
const CUSTOM_VIEWS_START_ORDER = 7;
let ViewsExtensionHandler = class ViewsExtensionHandler {
    static { this.ID = 'workbench.contrib.viewsExtensionHandler'; }
    constructor(instantiationService, logService) {
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        this.viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
        this.handleAndRegisterCustomViewContainers();
        this.handleAndRegisterCustomViews();
    }
    handleAndRegisterCustomViewContainers() {
        viewsContainersExtensionPoint.setHandler((extensions, { added, removed }) => {
            if (removed.length) {
                this.removeCustomViewContainers(removed);
            }
            if (added.length) {
                this.addCustomViewContainers(added, this.viewContainersRegistry.all);
            }
        });
    }
    addCustomViewContainers(extensionPoints, existingViewContainers) {
        const viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        let activityBarOrder = CUSTOM_VIEWS_START_ORDER +
            viewContainersRegistry.all.filter((v) => !!v.extensionId &&
                viewContainersRegistry.getViewContainerLocation(v) === 0 /* ViewContainerLocation.Sidebar */).length;
        let panelOrder = 5 +
            viewContainersRegistry.all.filter((v) => !!v.extensionId &&
                viewContainersRegistry.getViewContainerLocation(v) === 1 /* ViewContainerLocation.Panel */).length +
            1;
        for (const { value, collector, description } of extensionPoints) {
            Object.entries(value).forEach(([key, value]) => {
                if (!this.isValidViewsContainer(value, collector)) {
                    return;
                }
                switch (key) {
                    case 'activitybar':
                        activityBarOrder = this.registerCustomViewContainers(value, description, activityBarOrder, existingViewContainers, 0 /* ViewContainerLocation.Sidebar */);
                        break;
                    case 'panel':
                        panelOrder = this.registerCustomViewContainers(value, description, panelOrder, existingViewContainers, 1 /* ViewContainerLocation.Panel */);
                        break;
                }
            });
        }
    }
    removeCustomViewContainers(extensionPoints) {
        const viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        const removedExtensions = extensionPoints.reduce((result, e) => {
            result.add(e.description.identifier);
            return result;
        }, new ExtensionIdentifierSet());
        for (const viewContainer of viewContainersRegistry.all) {
            if (viewContainer.extensionId && removedExtensions.has(viewContainer.extensionId)) {
                // move all views in this container into default view container
                const views = this.viewsRegistry.getViews(viewContainer);
                if (views.length) {
                    this.viewsRegistry.moveViews(views, this.getDefaultViewContainer());
                }
                this.deregisterCustomViewContainer(viewContainer);
            }
        }
    }
    isValidViewsContainer(viewsContainersDescriptors, collector) {
        if (!Array.isArray(viewsContainersDescriptors)) {
            collector.error(localize('viewcontainer requirearray', 'views containers must be an array'));
            return false;
        }
        for (const descriptor of viewsContainersDescriptors) {
            if (typeof descriptor.id !== 'string' && isFalsyOrWhitespace(descriptor.id)) {
                collector.error(localize('requireidstring', "property `{0}` is mandatory and must be of type `string` with non-empty value. Only alphanumeric characters, '_', and '-' are allowed.", 'id'));
                return false;
            }
            if (!/^[a-z0-9_-]+$/i.test(descriptor.id)) {
                collector.error(localize('requireidstring', "property `{0}` is mandatory and must be of type `string` with non-empty value. Only alphanumeric characters, '_', and '-' are allowed.", 'id'));
                return false;
            }
            if (typeof descriptor.title !== 'string') {
                collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'title'));
                return false;
            }
            if (typeof descriptor.icon !== 'string') {
                collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'icon'));
                return false;
            }
            if (isFalsyOrWhitespace(descriptor.title)) {
                collector.warn(localize('requirenonemptystring', 'property `{0}` is mandatory and must be of type `string` with non-empty value', 'title'));
                return true;
            }
        }
        return true;
    }
    registerCustomViewContainers(containers, extension, order, existingViewContainers, location) {
        containers.forEach((descriptor) => {
            const themeIcon = ThemeIcon.fromString(descriptor.icon);
            const icon = themeIcon || resources.joinPath(extension.extensionLocation, descriptor.icon);
            const id = `workbench.view.extension.${descriptor.id}`;
            const title = descriptor.title || id;
            const viewContainer = this.registerCustomViewContainer(id, title, icon, order++, extension.identifier, location);
            // Move those views that belongs to this container
            if (existingViewContainers.length) {
                const viewsToMove = [];
                for (const existingViewContainer of existingViewContainers) {
                    if (viewContainer !== existingViewContainer) {
                        viewsToMove.push(...this.viewsRegistry
                            .getViews(existingViewContainer)
                            .filter((view) => view.originalContainerId === descriptor.id));
                    }
                }
                if (viewsToMove.length) {
                    this.viewsRegistry.moveViews(viewsToMove, viewContainer);
                }
            }
        });
        return order;
    }
    registerCustomViewContainer(id, title, icon, order, extensionId, location) {
        let viewContainer = this.viewContainersRegistry.get(id);
        if (!viewContainer) {
            viewContainer = this.viewContainersRegistry.registerViewContainer({
                id,
                title: { value: title, original: title },
                extensionId,
                ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
                    id,
                    { mergeViewWithContainerWhenSingleView: true },
                ]),
                hideIfEmpty: true,
                order,
                icon,
            }, location);
        }
        return viewContainer;
    }
    deregisterCustomViewContainer(viewContainer) {
        this.viewContainersRegistry.deregisterViewContainer(viewContainer);
        Registry.as(ViewletExtensions.Viewlets).deregisterPaneComposite(viewContainer.id);
    }
    handleAndRegisterCustomViews() {
        viewsExtensionPoint.setHandler((extensions, { added, removed }) => {
            if (removed.length) {
                this.removeViews(removed);
            }
            if (added.length) {
                this.addViews(added);
            }
        });
    }
    addViews(extensions) {
        const viewIds = new Set();
        const allViewDescriptors = [];
        for (const extension of extensions) {
            const { value, collector } = extension;
            Object.entries(value).forEach(([key, value]) => {
                if (!this.isValidViewDescriptors(value, collector)) {
                    return;
                }
                if (key === 'remote' &&
                    !isProposedApiEnabled(extension.description, 'contribViewsRemote')) {
                    collector.warn(localize('ViewContainerRequiresProposedAPI', "View container '{0}' requires 'enabledApiProposals: [\"contribViewsRemote\"]' to be added to 'Remote'.", key));
                    return;
                }
                const viewContainer = this.getViewContainer(key);
                if (!viewContainer) {
                    collector.warn(localize('ViewContainerDoesnotExist', "View container '{0}' does not exist and all views registered to it will be added to 'Explorer'.", key));
                }
                const container = viewContainer || this.getDefaultViewContainer();
                const viewDescriptors = [];
                for (let index = 0; index < value.length; index++) {
                    const item = value[index];
                    // validate
                    if (viewIds.has(item.id)) {
                        collector.error(localize('duplicateView1', 'Cannot register multiple views with same id `{0}`', item.id));
                        continue;
                    }
                    if (this.viewsRegistry.getView(item.id) !== null) {
                        collector.error(localize('duplicateView2', 'A view with id `{0}` is already registered.', item.id));
                        continue;
                    }
                    const order = ExtensionIdentifier.equals(extension.description.identifier, container.extensionId)
                        ? index + 1
                        : container.viewOrderDelegate
                            ? container.viewOrderDelegate.getOrder(item.group)
                            : undefined;
                    let icon;
                    if (typeof item.icon === 'string') {
                        icon =
                            ThemeIcon.fromString(item.icon) ||
                                resources.joinPath(extension.description.extensionLocation, item.icon);
                    }
                    const initialVisibility = this.convertInitialVisibility(item.visibility);
                    const type = this.getViewType(item.type);
                    if (!type) {
                        collector.error(localize('unknownViewType', 'Unknown view type `{0}`.', item.type));
                        continue;
                    }
                    let weight = undefined;
                    if (typeof item.initialSize === 'number') {
                        if (container.extensionId?.value === extension.description.identifier.value) {
                            weight = item.initialSize;
                        }
                        else {
                            this.logService.warn(`${extension.description.identifier.value} tried to set the view size of ${item.id} but it was ignored because the view container does not belong to it.`);
                        }
                    }
                    let accessibilityHelpContent;
                    if (isProposedApiEnabled(extension.description, 'contribAccessibilityHelpContent') &&
                        item.accessibilityHelpContent) {
                        accessibilityHelpContent = new MarkdownString(item.accessibilityHelpContent);
                    }
                    const viewDescriptor = {
                        type: type,
                        ctorDescriptor: type === ViewType.Tree
                            ? new SyncDescriptor(TreeViewPane)
                            : new SyncDescriptor(WebviewViewPane),
                        id: item.id,
                        name: { value: item.name, original: item.name },
                        when: ContextKeyExpr.deserialize(item.when),
                        containerIcon: icon || viewContainer?.icon,
                        containerTitle: item.contextualTitle ||
                            (viewContainer &&
                                (typeof viewContainer.title === 'string'
                                    ? viewContainer.title
                                    : viewContainer.title.value)),
                        canToggleVisibility: true,
                        canMoveView: viewContainer?.id !== REMOTE,
                        treeView: type === ViewType.Tree
                            ? this.instantiationService.createInstance(CustomTreeView, item.id, item.name, extension.description.identifier.value)
                            : undefined,
                        collapsed: this.showCollapsed(container) || initialVisibility === InitialVisibility.Collapsed,
                        order: order,
                        extensionId: extension.description.identifier,
                        originalContainerId: key,
                        group: item.group,
                        remoteAuthority: item.remoteName || item.remoteAuthority, // TODO@roblou - delete after remote extensions are updated
                        virtualWorkspace: item.virtualWorkspace,
                        hideByDefault: initialVisibility === InitialVisibility.Hidden,
                        workspace: viewContainer?.id === REMOTE ? true : undefined,
                        weight,
                        accessibilityHelpContent,
                    };
                    viewIds.add(viewDescriptor.id);
                    viewDescriptors.push(viewDescriptor);
                }
                allViewDescriptors.push({ viewContainer: container, views: viewDescriptors });
            });
        }
        this.viewsRegistry.registerViews2(allViewDescriptors);
    }
    getViewType(type) {
        if (type === ViewType.Webview) {
            return ViewType.Webview;
        }
        if (!type || type === ViewType.Tree) {
            return ViewType.Tree;
        }
        return undefined;
    }
    getDefaultViewContainer() {
        return this.viewContainersRegistry.get(EXPLORER);
    }
    removeViews(extensions) {
        const removedExtensions = extensions.reduce((result, e) => {
            result.add(e.description.identifier);
            return result;
        }, new ExtensionIdentifierSet());
        for (const viewContainer of this.viewContainersRegistry.all) {
            const removedViews = this.viewsRegistry
                .getViews(viewContainer)
                .filter((v) => v.extensionId &&
                removedExtensions.has(v.extensionId));
            if (removedViews.length) {
                this.viewsRegistry.deregisterViews(removedViews, viewContainer);
                for (const view of removedViews) {
                    const anyView = view;
                    if (anyView.treeView) {
                        anyView.treeView.dispose();
                    }
                }
            }
        }
    }
    convertInitialVisibility(value) {
        if (Object.values(InitialVisibility).includes(value)) {
            return value;
        }
        return undefined;
    }
    isValidViewDescriptors(viewDescriptors, collector) {
        if (!Array.isArray(viewDescriptors)) {
            collector.error(localize('requirearray', 'views must be an array'));
            return false;
        }
        for (const descriptor of viewDescriptors) {
            if (typeof descriptor.id !== 'string') {
                collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'id'));
                return false;
            }
            if (typeof descriptor.name !== 'string') {
                collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'name'));
                return false;
            }
            if (descriptor.when && typeof descriptor.when !== 'string') {
                collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'when'));
                return false;
            }
            if (descriptor.icon && typeof descriptor.icon !== 'string') {
                collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'icon'));
                return false;
            }
            if (descriptor.contextualTitle && typeof descriptor.contextualTitle !== 'string') {
                collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'contextualTitle'));
                return false;
            }
            if (descriptor.visibility && !this.convertInitialVisibility(descriptor.visibility)) {
                collector.error(localize('optenum', 'property `{0}` can be omitted or must be one of {1}', 'visibility', Object.values(InitialVisibility).join(', ')));
                return false;
            }
        }
        return true;
    }
    getViewContainer(value) {
        switch (value) {
            case 'explorer':
                return this.viewContainersRegistry.get(EXPLORER);
            case 'debug':
                return this.viewContainersRegistry.get(DEBUG);
            case 'scm':
                return this.viewContainersRegistry.get(SCM);
            case 'remote':
                return this.viewContainersRegistry.get(REMOTE);
            default:
                return this.viewContainersRegistry.get(`workbench.view.extension.${value}`);
        }
    }
    showCollapsed(container) {
        switch (container.id) {
            case EXPLORER:
            case SCM:
            case DEBUG:
                return true;
        }
        return false;
    }
};
ViewsExtensionHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService)
], ViewsExtensionHandler);
class ViewContainersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.viewsContainers;
    }
    render(manifest) {
        const contrib = manifest.contributes?.viewsContainers || {};
        const viewContainers = Object.keys(contrib).reduce((result, location) => {
            const viewContainersForLocation = contrib[location];
            result.push(...viewContainersForLocation.map((viewContainer) => ({ ...viewContainer, location })));
            return result;
        }, []);
        if (!viewContainers.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('view container id', 'ID'),
            localize('view container title', 'Title'),
            localize('view container location', 'Where'),
        ];
        const rows = viewContainers
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((viewContainer) => {
            return [viewContainer.id, viewContainer.title, viewContainer.location];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
}
class ViewsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.views;
    }
    render(manifest) {
        const contrib = manifest.contributes?.views || {};
        const views = Object.keys(contrib).reduce((result, location) => {
            const viewsForLocation = contrib[location];
            result.push(...viewsForLocation.map((view) => ({ ...view, location })));
            return result;
        }, []);
        if (!views.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('view id', 'ID'),
            localize('view name title', 'Name'),
            localize('view container location', 'Where'),
        ];
        const rows = views
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((view) => {
            return [view.id, view.name, view.location];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
}
Registry.as(ExtensionFeaturesRegistryExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'viewsContainers',
    label: localize('viewsContainers', 'View Containers'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(ViewContainersDataRenderer),
});
Registry.as(ExtensionFeaturesRegistryExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'views',
    label: localize('views', 'Views'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(ViewsDataRenderer),
});
registerWorkbenchContribution2(ViewsExtensionHandler.ID, ViewsExtensionHandler, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci92aWV3c0V4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxTQUFTLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHNCQUFzQixHQUd0QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFDTixVQUFVLElBQUksaUJBQWlCLEdBRS9CLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FPckMsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsVUFBVSxJQUFJLEtB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