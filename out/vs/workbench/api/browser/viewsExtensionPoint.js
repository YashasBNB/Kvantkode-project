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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL3ZpZXdzRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLFNBQVMsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsc0JBQXNCLEdBR3RCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUNOLFVBQVUsSUFBSSxpQkFBaUIsR0FFL0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQU9yQyxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxVQUFVLElB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