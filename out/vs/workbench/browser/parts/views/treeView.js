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
var TreeRenderer_1;
import { DataTransfers } from '../../../../base/browser/dnd.js';
import * as DOM from '../../../../base/browser/dom.js';
import * as cssJs from '../../../../base/browser/cssValue.js';
import { renderMarkdownAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { ActionBar, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { CollapseAllAction } from '../../../../base/browser/ui/tree/treeDefaults.js';
import { ActionRunner, Separator } from '../../../../base/common/actions.js';
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { isMarkdownString, MarkdownString, } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename, dirname } from '../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { isString } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/views.css';
import { VSDataTransfer } from '../../../../base/common/dataTransfer.js';
import { localize } from '../../../../nls.js';
import { createActionViewItem, getContextMenuActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { FileThemeIcon, FolderThemeIcon, IThemeService, } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { fillEditorsDragData } from '../../dnd.js';
import { ResourceLabels } from '../../labels.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID, } from '../editor/editorCommands.js';
import { getLocationBasedViewColors, ViewPane } from './viewPane.js';
import { Extensions, IViewDescriptorService, ResolvableTreeItem, TreeItemCollapsibleState, } from '../../../common/views.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { CodeDataTransfers, LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { toExternalVSDataTransfer } from '../../../../editor/browser/dnd.js';
import { CheckboxStateHandler, TreeItemCheckbox } from './checkbox.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { ITreeViewsDnDService } from '../../../../editor/common/services/treeViewsDndService.js';
import { DraggedTreeItemsIdentifier } from '../../../../editor/common/services/treeViewsDnd.js';
import { MarkdownRenderer, } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IAccessibleViewInformationService } from '../../../services/accessibility/common/accessibleViewInformationService.js';
let TreeViewPane = class TreeViewPane extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, notificationService, hoverService, accessibleViewService) {
        super({ ...options, titleMenuId: MenuId.ViewTitle, donotForwardArgs: false }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewService);
        const { treeView } = (Registry.as(Extensions.ViewsRegistry).getView(options.id));
        this.treeView = treeView;
        this._register(this.treeView.onDidChangeActions(() => this.updateActions(), this));
        this._register(this.treeView.onDidChangeTitle((newTitle) => this.updateTitle(newTitle)));
        this._register(this.treeView.onDidChangeDescription((newDescription) => this.updateTitleDescription(newDescription)));
        this._register(toDisposable(() => {
            if (this._container &&
                this.treeView.container &&
                this._container === this.treeView.container) {
                this.treeView.setVisibility(false);
            }
        }));
        this._register(this.onDidChangeBodyVisibility(() => this.updateTreeVisibility()));
        this._register(this.treeView.onDidChangeWelcomeState(() => this._onDidChangeViewWelcomeState.fire()));
        if (options.title !== this.treeView.title) {
            this.updateTitle(this.treeView.title);
        }
        if (options.titleDescription !== this.treeView.description) {
            this.updateTitleDescription(this.treeView.description);
        }
        this._actionRunner = this._register(new MultipleSelectionActionRunner(notificationService, () => this.treeView.getSelection()));
        this.updateTreeVisibility();
    }
    focus() {
        super.focus();
        this.treeView.focus();
    }
    renderBody(container) {
        this._container = container;
        super.renderBody(container);
        this.renderTreeView(container);
    }
    shouldShowWelcome() {
        return ((this.treeView.dataProvider === undefined || !!this.treeView.dataProvider.isTreeEmpty) &&
            (this.treeView.message === undefined || this.treeView.message === ''));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.layoutTreeView(height, width);
    }
    getOptimalWidth() {
        return this.treeView.getOptimalWidth();
    }
    renderTreeView(container) {
        this.treeView.show(container);
    }
    layoutTreeView(height, width) {
        this.treeView.layout(height, width);
    }
    updateTreeVisibility() {
        this.treeView.setVisibility(this.isBodyVisible());
    }
    getActionRunner() {
        return this._actionRunner;
    }
    getActionsContext() {
        return { $treeViewId: this.id, $focusedTreeItem: true, $selectedTreeItems: true };
    }
};
TreeViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, INotificationService),
    __param(10, IHoverService),
    __param(11, IAccessibleViewInformationService)
], TreeViewPane);
export { TreeViewPane };
class Root {
    constructor() {
        this.label = { label: 'root' };
        this.handle = '0';
        this.parentHandle = undefined;
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
        this.children = undefined;
    }
}
function commandPreconditions(commandId) {
    const command = CommandsRegistry.getCommand(commandId);
    if (command) {
        const commandAction = MenuRegistry.getCommand(command.id);
        return commandAction && commandAction.precondition;
    }
    return undefined;
}
function isTreeCommandEnabled(treeCommand, contextKeyService) {
    const commandId = treeCommand.originalId
        ? treeCommand.originalId
        : treeCommand.id;
    const precondition = commandPreconditions(commandId);
    if (precondition) {
        return contextKeyService.contextMatchesRules(precondition);
    }
    return true;
}
function isRenderedMessageValue(messageValue) {
    return (!!messageValue &&
        typeof messageValue !== 'string' &&
        'element' in messageValue &&
        'disposables' in messageValue);
}
const noDataProviderMessage = localize('no-dataprovider', 'There is no data provider registered that can provide view data.');
export const RawCustomTreeViewContextKey = new RawContextKey('customTreeView', false);
class Tree extends WorkbenchAsyncDataTree {
}
let AbstractTreeView = class AbstractTreeView extends Disposable {
    constructor(id, _title, themeService, instantiationService, commandService, configurationService, progressService, contextMenuService, keybindingService, notificationService, viewDescriptorService, hoverService, contextKeyService, activityService, logService, openerService) {
        super();
        this.id = id;
        this._title = _title;
        this.themeService = themeService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.progressService = progressService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.viewDescriptorService = viewDescriptorService;
        this.hoverService = hoverService;
        this.contextKeyService = contextKeyService;
        this.activityService = activityService;
        this.logService = logService;
        this.openerService = openerService;
        this.isVisible = false;
        this._hasIconForParentNode = false;
        this._hasIconForLeafNode = false;
        this.focused = false;
        this._canSelectMany = false;
        this._manuallyManageCheckboxes = false;
        this.elementsToRefresh = [];
        this.lastSelection = [];
        this._onDidExpandItem = this._register(new Emitter());
        this.onDidExpandItem = this._onDidExpandItem.event;
        this._onDidCollapseItem = this._register(new Emitter());
        this.onDidCollapseItem = this._onDidCollapseItem.event;
        this._onDidChangeSelectionAndFocus = this._register(new Emitter());
        this.onDidChangeSelectionAndFocus = this._onDidChangeSelectionAndFocus.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDidChangeActions = this._register(new Emitter());
        this.onDidChangeActions = this._onDidChangeActions.event;
        this._onDidChangeWelcomeState = this._register(new Emitter());
        this.onDidChangeWelcomeState = this._onDidChangeWelcomeState.event;
        this._onDidChangeTitle = this._register(new Emitter());
        this.onDidChangeTitle = this._onDidChangeTitle.event;
        this._onDidChangeDescription = this._register(new Emitter());
        this.onDidChangeDescription = this._onDidChangeDescription.event;
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
        this._onDidCompleteRefresh = this._register(new Emitter());
        this._isInitialized = false;
        this._activity = this._register(new MutableDisposable());
        this.activated = false;
        this.treeDisposables = this._register(new DisposableStore());
        this._height = 0;
        this._width = 0;
        this.refreshing = false;
        this.root = new Root();
        this.lastActive = this.root;
        // Try not to add anything that could be costly to this constructor. It gets called once per tree view
        // during startup, and anything added here can affect performance.
    }
    initialize() {
        if (this._isInitialized) {
            return;
        }
        this._isInitialized = true;
        // Remember when adding to this method that it isn't called until the view is visible, meaning that
        // properties could be set and events could be fired before we're initialized and that this needs to be handled.
        this.contextKeyService.bufferChangeEvents(() => {
            this.initializeShowCollapseAllAction();
            this.initializeCollapseAllToggle();
            this.initializeShowRefreshAction();
        });
        this.treeViewDnd = this.instantiationService.createInstance(CustomTreeViewDragAndDrop, this.id);
        if (this._dragAndDropController) {
            this.treeViewDnd.controller = this._dragAndDropController;
        }
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('explorer.decorations')) {
                this.doRefresh([this.root]); /** soft refresh **/
            }
        }));
        this._register(this.viewDescriptorService.onDidChangeLocation(({ views, from, to }) => {
            if (views.some((v) => v.id === this.id)) {
                this.tree?.updateOptions({
                    overrideStyles: getLocationBasedViewColors(this.viewLocation).listOverrideStyles,
                });
            }
        }));
        this.registerActions();
        this.create();
    }
    get viewContainer() {
        return this.viewDescriptorService.getViewContainerByViewId(this.id);
    }
    get viewLocation() {
        return this.viewDescriptorService.getViewLocationById(this.id);
    }
    get dragAndDropController() {
        return this._dragAndDropController;
    }
    set dragAndDropController(dnd) {
        this._dragAndDropController = dnd;
        if (this.treeViewDnd) {
            this.treeViewDnd.controller = dnd;
        }
    }
    get dataProvider() {
        return this._dataProvider;
    }
    set dataProvider(dataProvider) {
        if (dataProvider) {
            if (this.visible) {
                this.activate();
            }
            const self = this;
            this._dataProvider = new (class {
                constructor() {
                    this._isEmpty = true;
                    this._onDidChangeEmpty = new Emitter();
                    this.onDidChangeEmpty = this._onDidChangeEmpty.event;
                }
                get isTreeEmpty() {
                    return this._isEmpty;
                }
                async getChildren(element) {
                    const batches = await this.getChildrenBatch(element ? [element] : undefined);
                    return batches?.[0];
                }
                updateEmptyState(nodes, childrenGroups) {
                    if (nodes.length === 1 && nodes[0] instanceof Root) {
                        const oldEmpty = this._isEmpty;
                        this._isEmpty = childrenGroups.length === 0 || childrenGroups[0].length === 0;
                        if (oldEmpty !== this._isEmpty) {
                            this._onDidChangeEmpty.fire();
                        }
                    }
                }
                findCheckboxesUpdated(nodes, childrenGroups) {
                    if (childrenGroups.length === 0) {
                        return [];
                    }
                    const checkboxesUpdated = [];
                    for (let i = 0; i < nodes.length; i++) {
                        const node = nodes[i];
                        const children = childrenGroups[i];
                        for (const child of children) {
                            child.parent = node;
                            if (!self.manuallyManageCheckboxes &&
                                node?.checkbox?.isChecked === true &&
                                child.checkbox?.isChecked === false) {
                                child.checkbox.isChecked = true;
                                checkboxesUpdated.push(child);
                            }
                        }
                    }
                    return checkboxesUpdated;
                }
                async getChildrenBatch(nodes) {
                    let childrenGroups;
                    let checkboxesUpdated = [];
                    if (nodes &&
                        nodes.every((node) => !!node.children)) {
                        childrenGroups = nodes.map((node) => node.children);
                    }
                    else {
                        nodes = nodes ?? [self.root];
                        const batchedChildren = await (nodes.length === 1 && nodes[0] instanceof Root
                            ? doGetChildrenOrBatch(dataProvider, undefined)
                            : doGetChildrenOrBatch(dataProvider, nodes));
                        for (let i = 0; i < nodes.length; i++) {
                            const node = nodes[i];
                            node.children = batchedChildren ? batchedChildren[i] : undefined;
                        }
                        childrenGroups = batchedChildren ?? [];
                        checkboxesUpdated = this.findCheckboxesUpdated(nodes, childrenGroups);
                    }
                    this.updateEmptyState(nodes, childrenGroups);
                    if (checkboxesUpdated.length > 0) {
                        self._onDidChangeCheckboxState.fire(checkboxesUpdated);
                    }
                    return childrenGroups;
                }
            })();
            if (this._dataProvider.onDidChangeEmpty) {
                this._register(this._dataProvider.onDidChangeEmpty(() => {
                    this.updateCollapseAllToggle();
                    this._onDidChangeWelcomeState.fire();
                }));
            }
            this.updateMessage();
            this.refresh();
        }
        else {
            this._dataProvider = undefined;
            this.treeDisposables.clear();
            this.activated = false;
            this.updateMessage();
        }
        this._onDidChangeWelcomeState.fire();
    }
    get message() {
        return this._message;
    }
    set message(message) {
        this._message = message;
        this.updateMessage();
        this._onDidChangeWelcomeState.fire();
    }
    get title() {
        return this._title;
    }
    set title(name) {
        this._title = name;
        this._onDidChangeTitle.fire(this._title);
    }
    get description() {
        return this._description;
    }
    set description(description) {
        this._description = description;
        this._onDidChangeDescription.fire(this._description);
    }
    get badge() {
        return this._badge;
    }
    set badge(badge) {
        if (this._badge?.value === badge?.value && this._badge?.tooltip === badge?.tooltip) {
            return;
        }
        this._badge = badge;
        if (badge) {
            const activity = {
                badge: new NumberBadge(badge.value, () => badge.tooltip),
                priority: 50,
            };
            this._activity.value = this.activityService.showViewActivity(this.id, activity);
        }
        else {
            this._activity.clear();
        }
    }
    get canSelectMany() {
        return this._canSelectMany;
    }
    set canSelectMany(canSelectMany) {
        const oldCanSelectMany = this._canSelectMany;
        this._canSelectMany = canSelectMany;
        if (this._canSelectMany !== oldCanSelectMany) {
            this.tree?.updateOptions({ multipleSelectionSupport: this.canSelectMany });
        }
    }
    get manuallyManageCheckboxes() {
        return this._manuallyManageCheckboxes;
    }
    set manuallyManageCheckboxes(manuallyManageCheckboxes) {
        this._manuallyManageCheckboxes = manuallyManageCheckboxes;
    }
    get hasIconForParentNode() {
        return this._hasIconForParentNode;
    }
    get hasIconForLeafNode() {
        return this._hasIconForLeafNode;
    }
    get visible() {
        return this.isVisible;
    }
    initializeShowCollapseAllAction(startingValue = false) {
        if (!this.collapseAllContext) {
            this.collapseAllContextKey = new RawContextKey(`treeView.${this.id}.enableCollapseAll`, startingValue, localize('treeView.enableCollapseAll', 'Whether the tree view with id {0} enables collapse all.', this.id));
            this.collapseAllContext = this.collapseAllContextKey.bindTo(this.contextKeyService);
        }
        return true;
    }
    get showCollapseAllAction() {
        this.initializeShowCollapseAllAction();
        return !!this.collapseAllContext?.get();
    }
    set showCollapseAllAction(showCollapseAllAction) {
        this.initializeShowCollapseAllAction(showCollapseAllAction);
        this.collapseAllContext?.set(showCollapseAllAction);
    }
    initializeShowRefreshAction(startingValue = false) {
        if (!this.refreshContext) {
            this.refreshContextKey = new RawContextKey(`treeView.${this.id}.enableRefresh`, startingValue, localize('treeView.enableRefresh', 'Whether the tree view with id {0} enables refresh.', this.id));
            this.refreshContext = this.refreshContextKey.bindTo(this.contextKeyService);
        }
    }
    get showRefreshAction() {
        this.initializeShowRefreshAction();
        return !!this.refreshContext?.get();
    }
    set showRefreshAction(showRefreshAction) {
        this.initializeShowRefreshAction(showRefreshAction);
        this.refreshContext?.set(showRefreshAction);
    }
    registerActions() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.treeView.${that.id}.refresh`,
                    title: localize('refresh', 'Refresh'),
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', that.id), that.refreshContextKey),
                        group: 'navigation',
                        order: Number.MAX_SAFE_INTEGER - 1,
                    },
                    icon: Codicon.refresh,
                });
            }
            async run() {
                return that.refresh();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.treeView.${that.id}.collapseAll`,
                    title: localize('collapseAll', 'Collapse All'),
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', that.id), that.collapseAllContextKey),
                        group: 'navigation',
                        order: Number.MAX_SAFE_INTEGER,
                    },
                    precondition: that.collapseAllToggleContextKey,
                    icon: Codicon.collapseAll,
                });
            }
            async run() {
                if (that.tree) {
                    return new CollapseAllAction(that.tree, true).run();
                }
            }
        }));
    }
    setVisibility(isVisible) {
        // Throughout setVisibility we need to check if the tree view's data provider still exists.
        // This can happen because the `getChildren` call to the extension can return
        // after the tree has been disposed.
        this.initialize();
        isVisible = !!isVisible;
        if (this.isVisible === isVisible) {
            return;
        }
        this.isVisible = isVisible;
        if (this.tree) {
            if (this.isVisible) {
                DOM.show(this.tree.getHTMLElement());
            }
            else {
                DOM.hide(this.tree.getHTMLElement()); // make sure the tree goes out of the tabindex world by hiding it
            }
            if (this.isVisible && this.elementsToRefresh.length && this.dataProvider) {
                this.doRefresh(this.elementsToRefresh);
                this.elementsToRefresh = [];
            }
        }
        setTimeout0(() => {
            if (this.dataProvider) {
                this._onDidChangeVisibility.fire(this.isVisible);
            }
        });
        if (this.visible) {
            this.activate();
        }
    }
    focus(reveal = true, revealItem) {
        if (this.tree && this.root.children && this.root.children.length > 0) {
            // Make sure the current selected element is revealed
            const element = revealItem ?? this.tree.getSelection()[0];
            if (element && reveal) {
                this.tree.reveal(element, 0.5);
            }
            // Pass Focus to Viewer
            this.tree.domFocus();
        }
        else if (this.tree && this.treeContainer && !this.treeContainer.classList.contains('hide')) {
            this.tree.domFocus();
        }
        else {
            this.domNode.focus();
        }
    }
    show(container) {
        this._container = container;
        DOM.append(container, this.domNode);
    }
    create() {
        this.domNode = DOM.$('.tree-explorer-viewlet-tree-view');
        this.messageElement = DOM.append(this.domNode, DOM.$('.message'));
        this.updateMessage();
        this.treeContainer = DOM.append(this.domNode, DOM.$('.customview-tree'));
        this.treeContainer.classList.add('file-icon-themable-tree', 'show-file-icons');
        const focusTracker = this._register(DOM.trackFocus(this.domNode));
        this._register(focusTracker.onDidFocus(() => (this.focused = true)));
        this._register(focusTracker.onDidBlur(() => (this.focused = false)));
    }
    createTree() {
        this.treeDisposables.clear();
        const actionViewItemProvider = createActionViewItem.bind(undefined, this.instantiationService);
        const treeMenus = this.treeDisposables.add(this.instantiationService.createInstance(TreeMenus, this.id));
        this.treeLabels = this.treeDisposables.add(this.instantiationService.createInstance(ResourceLabels, this));
        const dataSource = this.instantiationService.createInstance(TreeDataSource, this, (task) => this.progressService.withProgress({ location: this.id }, () => task));
        const aligner = this.treeDisposables.add(new Aligner(this.themeService));
        const checkboxStateHandler = this.treeDisposables.add(new CheckboxStateHandler());
        const renderer = this.treeDisposables.add(this.instantiationService.createInstance(TreeRenderer, this.id, treeMenus, this.treeLabels, actionViewItemProvider, aligner, checkboxStateHandler, () => this.manuallyManageCheckboxes));
        this.treeDisposables.add(renderer.onDidChangeCheckboxState((e) => this._onDidChangeCheckboxState.fire(e)));
        const widgetAriaLabel = this._title;
        this.tree = this.treeDisposables.add(this.instantiationService.createInstance(Tree, this.id, this.treeContainer, new TreeViewDelegate(), [renderer], dataSource, {
            identityProvider: new TreeViewIdentityProvider(),
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (element.accessibilityInformation) {
                        return element.accessibilityInformation.label;
                    }
                    if (isString(element.tooltip)) {
                        return element.tooltip;
                    }
                    else {
                        if (element.resourceUri && !element.label) {
                            // The custom tree has no good information on what should be used for the aria label.
                            // Allow the tree widget's default aria label to be used.
                            return null;
                        }
                        let buildAriaLabel = '';
                        if (element.label) {
                            buildAriaLabel += element.label.label + ' ';
                        }
                        if (element.description) {
                            buildAriaLabel += element.description;
                        }
                        return buildAriaLabel;
                    }
                },
                getRole(element) {
                    return element.accessibilityInformation?.role ?? 'treeitem';
                },
                getWidgetAriaLabel() {
                    return widgetAriaLabel;
                },
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (item) => {
                    return item.label
                        ? item.label.label
                        : item.resourceUri
                            ? basename(URI.revive(item.resourceUri))
                            : undefined;
                },
            },
            expandOnlyOnTwistieClick: (e) => {
                return (!!e.command ||
                    !!e.checkbox ||
                    this.configurationService.getValue('workbench.tree.expandMode') === 'doubleClick');
            },
            collapseByDefault: (e) => {
                return e.collapsibleState !== TreeItemCollapsibleState.Expanded;
            },
            multipleSelectionSupport: this.canSelectMany,
            dnd: this.treeViewDnd,
            overrideStyles: getLocationBasedViewColors(this.viewLocation).listOverrideStyles,
        }));
        this.treeDisposables.add(renderer.onDidChangeMenuContext((e) => e.forEach((e) => this.tree?.rerender(e))));
        this.treeDisposables.add(this.tree);
        treeMenus.setContextKeyService(this.tree.contextKeyService);
        aligner.tree = this.tree;
        const actionRunner = this.treeDisposables.add(new MultipleSelectionActionRunner(this.notificationService, () => this.tree.getSelection()));
        renderer.actionRunner = actionRunner;
        this.tree.contextKeyService.createKey(this.id, true);
        const customTreeKey = RawCustomTreeViewContextKey.bindTo(this.tree.contextKeyService);
        customTreeKey.set(true);
        this.treeDisposables.add(this.tree.onContextMenu((e) => this.onContextMenu(treeMenus, e, actionRunner)));
        this.treeDisposables.add(this.tree.onDidChangeSelection((e) => {
            this.lastSelection = e.elements;
            this.lastActive = this.tree?.getFocus()[0] ?? this.lastActive;
            this._onDidChangeSelectionAndFocus.fire({
                selection: this.lastSelection,
                focus: this.lastActive,
            });
        }));
        this.treeDisposables.add(this.tree.onDidChangeFocus((e) => {
            if (e.elements.length && e.elements[0] !== this.lastActive) {
                this.lastActive = e.elements[0];
                this.lastSelection = this.tree?.getSelection() ?? this.lastSelection;
                this._onDidChangeSelectionAndFocus.fire({
                    selection: this.lastSelection,
                    focus: this.lastActive,
                });
            }
        }));
        this.treeDisposables.add(this.tree.onDidChangeCollapseState((e) => {
            if (!e.node.element) {
                return;
            }
            const element = Array.isArray(e.node.element.element)
                ? e.node.element.element[0]
                : e.node.element.element;
            if (e.node.collapsed) {
                this._onDidCollapseItem.fire(element);
            }
            else {
                this._onDidExpandItem.fire(element);
            }
        }));
        this.tree.setInput(this.root).then(() => this.updateContentAreas());
        this.treeDisposables.add(this.tree.onDidOpen(async (e) => {
            if (!e.browserEvent) {
                return;
            }
            if (e.browserEvent.target &&
                e.browserEvent.target.classList.contains(TreeItemCheckbox.checkboxClass)) {
                return;
            }
            const selection = this.tree.getSelection();
            const command = await this.resolveCommand(selection.length === 1 ? selection[0] : undefined);
            if (command && isTreeCommandEnabled(command, this.contextKeyService)) {
                let args = command.arguments || [];
                if (command.id === API_OPEN_EDITOR_COMMAND_ID ||
                    command.id === API_OPEN_DIFF_EDITOR_COMMAND_ID) {
                    // Some commands owned by us should receive the
                    // `IOpenEvent` as context to open properly
                    args = [...args, e];
                }
                try {
                    await this.commandService.executeCommand(command.id, ...args);
                }
                catch (err) {
                    this.notificationService.error(err);
                }
            }
        }));
        this.treeDisposables.add(treeMenus.onDidChange((changed) => {
            if (this.tree?.hasNode(changed)) {
                this.tree?.rerender(changed);
            }
        }));
    }
    async resolveCommand(element) {
        let command = element?.command;
        if (element && !command) {
            if (element instanceof ResolvableTreeItem && element.hasResolve) {
                await element.resolve(CancellationToken.None);
                command = element.command;
            }
        }
        return command;
    }
    onContextMenu(treeMenus, treeEvent, actionRunner) {
        this.hoverService.hideHover();
        const node = treeEvent.element;
        if (node === null) {
            return;
        }
        const event = treeEvent.browserEvent;
        event.preventDefault();
        event.stopPropagation();
        this.tree.setFocus([node]);
        let selected = this.canSelectMany ? this.getSelection() : [];
        if (!selected.find((item) => item.handle === node.handle)) {
            selected = [node];
        }
        const actions = treeMenus.getResourceContextActions(selected);
        if (!actions.length) {
            return;
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => treeEvent.anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, {
                        label: true,
                        keybinding: keybinding.getLabel(),
                    });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.tree.domFocus();
                }
            },
            getActionsContext: () => ({ $treeViewId: this.id, $treeItemHandle: node.handle }),
            actionRunner,
        });
    }
    updateMessage() {
        if (this._message) {
            this.showMessage(this._message);
        }
        else if (!this.dataProvider) {
            this.showMessage(noDataProviderMessage);
        }
        else {
            this.hideMessage();
        }
        this.updateContentAreas();
    }
    processMessage(message, disposables) {
        const lines = message.value.split('\n');
        const result = [];
        let hasFoundButton = false;
        for (const line of lines) {
            const linkedText = parseLinkedText(line);
            if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                const node = linkedText.nodes[0];
                const buttonContainer = document.createElement('div');
                buttonContainer.classList.add('button-container');
                const button = new Button(buttonContainer, {
                    title: node.title,
                    secondary: hasFoundButton,
                    supportIcons: true,
                    ...defaultButtonStyles,
                });
                button.label = node.label;
                button.onDidClick((_) => {
                    this.openerService.open(node.href, { allowCommands: true });
                }, null, disposables);
                const href = URI.parse(node.href);
                if (href.scheme === Schemas.command) {
                    const preConditions = commandPreconditions(href.path);
                    if (preConditions) {
                        button.enabled = this.contextKeyService.contextMatchesRules(preConditions);
                        disposables.add(this.contextKeyService.onDidChangeContext((e) => {
                            if (e.affectsSome(new Set(preConditions.keys()))) {
                                button.enabled = this.contextKeyService.contextMatchesRules(preConditions);
                            }
                        }));
                    }
                }
                disposables.add(button);
                hasFoundButton = true;
                result.push(buttonContainer);
            }
            else {
                hasFoundButton = false;
                const rendered = this.markdownRenderer.render(new MarkdownString(line, {
                    isTrusted: message.isTrusted,
                    supportThemeIcons: message.supportThemeIcons,
                    supportHtml: message.supportHtml,
                }));
                result.push(rendered.element);
                disposables.add(rendered);
            }
        }
        const container = document.createElement('div');
        container.classList.add('rendered-message');
        for (const child of result) {
            if (DOM.isHTMLElement(child)) {
                container.appendChild(child);
            }
            else {
                container.appendChild(child.element);
            }
        }
        return container;
    }
    showMessage(message) {
        if (isRenderedMessageValue(this._messageValue)) {
            this._messageValue.disposables.dispose();
        }
        if (isMarkdownString(message) && !this.markdownRenderer) {
            this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        }
        if (isMarkdownString(message)) {
            const disposables = new DisposableStore();
            const renderedMessage = this.processMessage(message, disposables);
            this._messageValue = { element: renderedMessage, disposables };
        }
        else {
            this._messageValue = message;
        }
        if (!this.messageElement) {
            return;
        }
        this.messageElement.classList.remove('hide');
        this.resetMessageElement();
        if (typeof this._messageValue === 'string' && !isFalsyOrWhitespace(this._messageValue)) {
            this.messageElement.textContent = this._messageValue;
        }
        else if (isRenderedMessageValue(this._messageValue)) {
            this.messageElement.appendChild(this._messageValue.element);
        }
        this.layout(this._height, this._width);
    }
    hideMessage() {
        this.resetMessageElement();
        this.messageElement?.classList.add('hide');
        this.layout(this._height, this._width);
    }
    resetMessageElement() {
        if (this.messageElement) {
            DOM.clearNode(this.messageElement);
        }
    }
    layout(height, width) {
        if (height && width && this.messageElement && this.treeContainer) {
            this._height = height;
            this._width = width;
            const treeHeight = height - DOM.getTotalHeight(this.messageElement);
            this.treeContainer.style.height = treeHeight + 'px';
            this.tree?.layout(treeHeight, width);
        }
    }
    getOptimalWidth() {
        if (this.tree) {
            const parentNode = this.tree.getHTMLElement();
            const childNodes = [].slice.call(parentNode.querySelectorAll('.outline-item-label > a'));
            return DOM.getLargestChildWidth(parentNode, childNodes);
        }
        return 0;
    }
    updateCheckboxes(elements) {
        return setCascadingCheckboxUpdates(elements);
    }
    async refresh(elements, checkboxes) {
        if (this.dataProvider && this.tree) {
            if (this.refreshing) {
                await Event.toPromise(this._onDidCompleteRefresh.event);
            }
            if (!elements) {
                elements = [this.root];
                // remove all waiting elements to refresh if root is asked to refresh
                this.elementsToRefresh = [];
            }
            for (const element of elements) {
                element.children = undefined; // reset children
            }
            if (this.isVisible) {
                const affectedElements = this.updateCheckboxes(checkboxes ?? []);
                return this.doRefresh(elements.concat(affectedElements));
            }
            else {
                if (this.elementsToRefresh.length) {
                    const seen = new Set();
                    this.elementsToRefresh.forEach((element) => seen.add(element.handle));
                    for (const element of elements) {
                        if (!seen.has(element.handle)) {
                            this.elementsToRefresh.push(element);
                        }
                    }
                }
                else {
                    this.elementsToRefresh.push(...elements);
                }
            }
        }
        return undefined;
    }
    async expand(itemOrItems) {
        const tree = this.tree;
        if (!tree) {
            return;
        }
        try {
            itemOrItems = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
            for (const element of itemOrItems) {
                await tree.expand(element, false);
            }
        }
        catch (e) {
            // The extension could have changed the tree during the reveal.
            // Because of that, we ignore errors.
        }
    }
    isCollapsed(item) {
        return !!this.tree?.isCollapsed(item);
    }
    setSelection(items) {
        this.tree?.setSelection(items);
    }
    getSelection() {
        return this.tree?.getSelection() ?? [];
    }
    setFocus(item) {
        if (this.tree) {
            if (item) {
                this.focus(true, item);
                this.tree.setFocus([item]);
            }
            else if (this.tree.getFocus().length === 0) {
                this.tree.setFocus([]);
            }
        }
    }
    async reveal(item) {
        if (this.tree) {
            return this.tree.reveal(item);
        }
    }
    async doRefresh(elements) {
        const tree = this.tree;
        if (tree && this.visible) {
            this.refreshing = true;
            const oldSelection = tree.getSelection();
            try {
                await Promise.all(elements.map((element) => tree.updateChildren(element, true, true)));
            }
            catch (e) {
                // When multiple calls are made to refresh the tree in quick succession,
                // we can get a "Tree element not found" error. This is expected.
                // Ideally this is fixable, so log instead of ignoring so the error is preserved.
                this.logService.error(e);
            }
            const newSelection = tree.getSelection();
            if (oldSelection.length !== newSelection.length ||
                oldSelection.some((value, index) => value.handle !== newSelection[index].handle)) {
                this.lastSelection = newSelection;
                this._onDidChangeSelectionAndFocus.fire({
                    selection: this.lastSelection,
                    focus: this.lastActive,
                });
            }
            this.refreshing = false;
            this._onDidCompleteRefresh.fire();
            this.updateContentAreas();
            if (this.focused) {
                this.focus(false);
            }
            this.updateCollapseAllToggle();
        }
    }
    initializeCollapseAllToggle() {
        if (!this.collapseAllToggleContext) {
            this.collapseAllToggleContextKey = new RawContextKey(`treeView.${this.id}.toggleCollapseAll`, false, localize('treeView.toggleCollapseAll', 'Whether collapse all is toggled for the tree view with id {0}.', this.id));
            this.collapseAllToggleContext = this.collapseAllToggleContextKey.bindTo(this.contextKeyService);
        }
    }
    updateCollapseAllToggle() {
        if (this.showCollapseAllAction) {
            this.initializeCollapseAllToggle();
            this.collapseAllToggleContext?.set(!!this.root.children &&
                this.root.children.length > 0 &&
                this.root.children.some((value) => value.collapsibleState !== TreeItemCollapsibleState.None));
        }
    }
    updateContentAreas() {
        const isTreeEmpty = !this.root.children || this.root.children.length === 0;
        // Hide tree container only when there is a message and tree is empty and not refreshing
        if (this._messageValue && isTreeEmpty && !this.refreshing && this.treeContainer) {
            // If there's a dnd controller then hiding the tree prevents it from being dragged into.
            if (!this.dragAndDropController) {
                this.treeContainer.classList.add('hide');
            }
            this.domNode.setAttribute('tabindex', '0');
        }
        else if (this.treeContainer) {
            this.treeContainer.classList.remove('hide');
            if (this.domNode === DOM.getActiveElement()) {
                this.focus();
            }
            this.domNode.removeAttribute('tabindex');
        }
    }
    get container() {
        return this._container;
    }
};
AbstractTreeView = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, ICommandService),
    __param(5, IConfigurationService),
    __param(6, IProgressService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IViewDescriptorService),
    __param(11, IHoverService),
    __param(12, IContextKeyService),
    __param(13, IActivityService),
    __param(14, ILogService),
    __param(15, IOpenerService)
], AbstractTreeView);
class TreeViewIdentityProvider {
    getId(element) {
        return element.handle;
    }
}
class TreeViewDelegate {
    getHeight(element) {
        return TreeRenderer.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return TreeRenderer.TREE_TEMPLATE_ID;
    }
}
async function doGetChildrenOrBatch(dataProvider, nodes) {
    if (dataProvider.getChildrenBatch) {
        return dataProvider.getChildrenBatch(nodes);
    }
    else {
        if (nodes) {
            return Promise.all(nodes.map((node) => dataProvider.getChildren(node).then((children) => children ?? [])));
        }
        else {
            return [await dataProvider.getChildren()].filter((children) => children !== undefined);
        }
    }
}
class TreeDataSource {
    constructor(treeView, withProgress) {
        this.treeView = treeView;
        this.withProgress = withProgress;
    }
    hasChildren(element) {
        return (!!this.treeView.dataProvider && element.collapsibleState !== TreeItemCollapsibleState.None);
    }
    async getChildren(element) {
        const dataProvider = this.treeView.dataProvider;
        if (!dataProvider) {
            return [];
        }
        if (this.batch === undefined) {
            this.batch = [element];
            this.batchPromise = undefined;
        }
        else {
            this.batch.push(element);
        }
        const indexInBatch = this.batch.length - 1;
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                const batch = this.batch;
                this.batch = undefined;
                if (!this.batchPromise) {
                    this.batchPromise = this.withProgress(doGetChildrenOrBatch(dataProvider, batch));
                }
                try {
                    const result = await this.batchPromise;
                    resolve(result && indexInBatch < result.length ? result[indexInBatch] : []);
                }
                catch (e) {
                    if (!e.message.startsWith('Bad progress location:')) {
                        reject(e);
                    }
                }
            }, 0);
        });
    }
}
let TreeRenderer = class TreeRenderer extends Disposable {
    static { TreeRenderer_1 = this; }
    static { this.ITEM_HEIGHT = 22; }
    static { this.TREE_TEMPLATE_ID = 'treeExplorer'; }
    constructor(treeViewId, menus, labels, actionViewItemProvider, aligner, checkboxStateHandler, manuallyManageCheckboxes, themeService, configurationService, labelService, contextKeyService, hoverService, instantiationService) {
        super();
        this.treeViewId = treeViewId;
        this.menus = menus;
        this.labels = labels;
        this.actionViewItemProvider = actionViewItemProvider;
        this.aligner = aligner;
        this.checkboxStateHandler = checkboxStateHandler;
        this.manuallyManageCheckboxes = manuallyManageCheckboxes;
        this.themeService = themeService;
        this.configurationService = configurationService;
        this.labelService = labelService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
        this._onDidChangeMenuContext = this._register(new Emitter());
        this.onDidChangeMenuContext = this._onDidChangeMenuContext.event;
        this._hasCheckbox = false;
        this._renderedElements = new Map(); // tree item handle to template data
        this._hoverDelegate = this._register(instantiationService.createInstance(WorkbenchHoverDelegate, 'mouse', undefined, {}));
        this._register(this.themeService.onDidFileIconThemeChange(() => this.rerender()));
        this._register(this.themeService.onDidColorThemeChange(() => this.rerender()));
        this._register(checkboxStateHandler.onDidChangeCheckboxState((items) => {
            this.updateCheckboxes(items);
        }));
        this._register(this.contextKeyService.onDidChangeContext((e) => this.onDidChangeContext(e)));
    }
    get templateId() {
        return TreeRenderer_1.TREE_TEMPLATE_ID;
    }
    set actionRunner(actionRunner) {
        this._actionRunner = actionRunner;
    }
    renderTemplate(container) {
        container.classList.add('custom-view-tree-node-item');
        const checkboxContainer = DOM.append(container, DOM.$(''));
        const resourceLabel = this.labels.create(container, {
            supportHighlights: true,
            hoverDelegate: this._hoverDelegate,
        });
        const icon = DOM.prepend(resourceLabel.element, DOM.$('.custom-view-tree-node-item-icon'));
        const actionsContainer = DOM.append(resourceLabel.element, DOM.$('.actions'));
        const actionBar = new ActionBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider,
        });
        return { resourceLabel, icon, checkboxContainer, actionBar, container };
    }
    getHover(label, resource, node) {
        if (!(node instanceof ResolvableTreeItem) || !node.hasResolve) {
            if (resource && !node.tooltip) {
                return undefined;
            }
            else if (node.tooltip === undefined) {
                return label;
            }
            else if (!isString(node.tooltip)) {
                return {
                    markdown: node.tooltip,
                    markdownNotSupportedFallback: resource
                        ? undefined
                        : renderMarkdownAsPlaintext(node.tooltip),
                }; // Passing undefined as the fallback for a resource falls back to the old native hover
            }
            else if (node.tooltip !== '') {
                return node.tooltip;
            }
            else {
                return undefined;
            }
        }
        return {
            markdown: typeof node.tooltip === 'string'
                ? node.tooltip
                : (token) => {
                    return new Promise((resolve) => {
                        node.resolve(token).then(() => resolve(node.tooltip));
                    });
                },
            markdownNotSupportedFallback: resource ? undefined : (label ?? ''), // Passing undefined as the fallback for a resource falls back to the old native hover
        };
    }
    renderElement(element, index, templateData) {
        const node = element.element;
        const resource = node.resourceUri ? URI.revive(node.resourceUri) : null;
        const treeItemLabel = node.label
            ? node.label
            : resource
                ? { label: basename(resource) }
                : undefined;
        const description = isString(node.description)
            ? node.description
            : resource && node.description === true
                ? this.labelService.getUriLabel(dirname(resource), { relative: true })
                : undefined;
        const label = treeItemLabel ? treeItemLabel.label : undefined;
        const matches = treeItemLabel && treeItemLabel.highlights && label
            ? treeItemLabel.highlights.map(([start, end]) => {
                if (start < 0) {
                    start = label.length + start;
                }
                if (end < 0) {
                    end = label.length + end;
                }
                if (start >= label.length || end > label.length) {
                    return { start: 0, end: 0 };
                }
                if (start > end) {
                    const swap = start;
                    start = end;
                    end = swap;
                }
                return { start, end };
            })
            : undefined;
        const icon = this.themeService.getColorTheme().type === ColorScheme.LIGHT ? node.icon : node.iconDark;
        const iconUrl = icon ? URI.revive(icon) : undefined;
        const title = this.getHover(label, resource, node);
        // reset
        templateData.actionBar.clear();
        templateData.icon.style.color = '';
        let commandEnabled = true;
        if (node.command) {
            commandEnabled = isTreeCommandEnabled(node.command, this.contextKeyService);
        }
        this.renderCheckbox(node, templateData);
        if (resource) {
            const fileDecorations = this.configurationService.getValue('explorer.decorations');
            const labelResource = resource ? resource : URI.parse('missing:_icon_resource');
            templateData.resourceLabel.setResource({ name: label, description, resource: labelResource }, {
                fileKind: this.getFileKind(node),
                title,
                hideIcon: this.shouldHideResourceLabelIcon(iconUrl, node.themeIcon),
                fileDecorations,
                extraClasses: ['custom-view-tree-node-item-resourceLabel'],
                matches: matches ? matches : createMatches(element.filterData),
                strikethrough: treeItemLabel?.strikethrough,
                disabledCommand: !commandEnabled,
                labelEscapeNewLines: true,
                forceLabel: !!node.label,
            });
        }
        else {
            templateData.resourceLabel.setResource({ name: label, description }, {
                title,
                hideIcon: true,
                extraClasses: ['custom-view-tree-node-item-resourceLabel'],
                matches: matches ? matches : createMatches(element.filterData),
                strikethrough: treeItemLabel?.strikethrough,
                disabledCommand: !commandEnabled,
                labelEscapeNewLines: true,
            });
        }
        if (iconUrl) {
            templateData.icon.className = 'custom-view-tree-node-item-icon';
            templateData.icon.style.backgroundImage = cssJs.asCSSUrl(iconUrl);
        }
        else {
            let iconClass;
            if (this.shouldShowThemeIcon(!!resource, node.themeIcon)) {
                iconClass = ThemeIcon.asClassName(node.themeIcon);
                if (node.themeIcon.color) {
                    templateData.icon.style.color =
                        this.themeService.getColorTheme().getColor(node.themeIcon.color.id)?.toString() ?? '';
                }
            }
            templateData.icon.className = iconClass ? `custom-view-tree-node-item-icon ${iconClass}` : '';
            templateData.icon.style.backgroundImage = '';
        }
        if (!commandEnabled) {
            templateData.icon.className = templateData.icon.className + ' disabled';
            if (templateData.container.parentElement) {
                templateData.container.parentElement.className =
                    templateData.container.parentElement.className + ' disabled';
            }
        }
        templateData.actionBar.context = {
            $treeViewId: this.treeViewId,
            $treeItemHandle: node.handle,
        };
        const menuActions = this.menus.getResourceActions([node]);
        templateData.actionBar.push(menuActions, { icon: true, label: false });
        if (this._actionRunner) {
            templateData.actionBar.actionRunner = this._actionRunner;
        }
        this.setAlignment(templateData.container, node);
        // remember rendered element, an element can be rendered multiple times
        const renderedItems = this._renderedElements.get(element.element.handle) ?? [];
        this._renderedElements.set(element.element.handle, [
            ...renderedItems,
            { original: element, rendered: templateData },
        ]);
    }
    rerender() {
        // As we add items to the map during this call we can't directly use the map in the for loop
        // but have to create a copy of the keys first
        const keys = new Set(this._renderedElements.keys());
        for (const key of keys) {
            const values = this._renderedElements.get(key) ?? [];
            for (const value of values) {
                this.disposeElement(value.original, 0, value.rendered);
                this.renderElement(value.original, 0, value.rendered);
            }
        }
    }
    renderCheckbox(node, templateData) {
        if (node.checkbox) {
            // The first time we find a checkbox we want to rerender the visible tree to adapt the alignment
            if (!this._hasCheckbox) {
                this._hasCheckbox = true;
                this.rerender();
            }
            if (!templateData.checkbox) {
                const checkbox = new TreeItemCheckbox(templateData.checkboxContainer, this.checkboxStateHandler, this._hoverDelegate, this.hoverService);
                templateData.checkbox = checkbox;
            }
            templateData.checkbox.render(node);
        }
        else if (templateData.checkbox) {
            templateData.checkbox.dispose();
            templateData.checkbox = undefined;
        }
    }
    setAlignment(container, treeItem) {
        container.parentElement.classList.toggle('align-icon-with-twisty', !this._hasCheckbox && this.aligner.alignIconWithTwisty(treeItem));
    }
    shouldHideResourceLabelIcon(iconUrl, icon) {
        // We always hide the resource label in favor of the iconUrl when it's provided.
        // When `ThemeIcon` is provided, we hide the resource label icon in favor of it only if it's a not a file icon.
        return !!iconUrl || (!!icon && !this.isFileKindThemeIcon(icon));
    }
    shouldShowThemeIcon(hasResource, icon) {
        if (!icon) {
            return false;
        }
        // If there's a resource and the icon is a file icon, then the icon (or lack thereof) will already be coming from the
        // icon theme and should use whatever the icon theme has provided.
        return !(hasResource && this.isFileKindThemeIcon(icon));
    }
    isFolderThemeIcon(icon) {
        return icon?.id === FolderThemeIcon.id;
    }
    isFileKindThemeIcon(icon) {
        if (icon) {
            return icon.id === FileThemeIcon.id || this.isFolderThemeIcon(icon);
        }
        else {
            return false;
        }
    }
    getFileKind(node) {
        if (node.themeIcon) {
            switch (node.themeIcon.id) {
                case FileThemeIcon.id:
                    return FileKind.FILE;
                case FolderThemeIcon.id:
                    return FileKind.FOLDER;
            }
        }
        return node.collapsibleState === TreeItemCollapsibleState.Collapsed ||
            node.collapsibleState === TreeItemCollapsibleState.Expanded
            ? FileKind.FOLDER
            : FileKind.FILE;
    }
    onDidChangeContext(e) {
        const items = [];
        for (const [_, elements] of this._renderedElements) {
            for (const element of elements) {
                if (e.affectsSome(this.menus.getElementOverlayContexts(element.original.element)) ||
                    e.affectsSome(this.menus.getEntireMenuContexts())) {
                    items.push(element.original.element);
                }
            }
        }
        if (items.length) {
            this._onDidChangeMenuContext.fire(items);
        }
    }
    updateCheckboxes(items) {
        let allItems = [];
        if (!this.manuallyManageCheckboxes()) {
            allItems = setCascadingCheckboxUpdates(items);
        }
        else {
            allItems = items;
        }
        allItems.forEach((item) => {
            const renderedItems = this._renderedElements.get(item.handle);
            if (renderedItems) {
                renderedItems.forEach((renderedItems) => renderedItems.rendered.checkbox?.render(item));
            }
        });
        this._onDidChangeCheckboxState.fire(allItems);
    }
    disposeElement(resource, index, templateData) {
        const itemRenders = this._renderedElements.get(resource.element.handle) ?? [];
        const renderedIndex = itemRenders.findIndex((renderedItem) => templateData === renderedItem.rendered);
        if (itemRenders.length === 1) {
            this._renderedElements.delete(resource.element.handle);
        }
        else if (itemRenders.length > 0) {
            itemRenders.splice(renderedIndex, 1);
        }
        templateData.checkbox?.dispose();
        templateData.checkbox = undefined;
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
        templateData.actionBar.dispose();
    }
};
TreeRenderer = TreeRenderer_1 = __decorate([
    __param(7, IThemeService),
    __param(8, IConfigurationService),
    __param(9, ILabelService),
    __param(10, IContextKeyService),
    __param(11, IHoverService),
    __param(12, IInstantiationService)
], TreeRenderer);
class Aligner extends Disposable {
    constructor(themeService) {
        super();
        this.themeService = themeService;
    }
    set tree(tree) {
        this._tree = tree;
    }
    alignIconWithTwisty(treeItem) {
        if (treeItem.collapsibleState !== TreeItemCollapsibleState.None) {
            return false;
        }
        if (!this.hasIcon(treeItem)) {
            return false;
        }
        if (this._tree) {
            const parent = this._tree.getParentElement(treeItem) || this._tree.getInput();
            if (this.hasIcon(parent)) {
                return (!!parent.children &&
                    parent.children.some((c) => c.collapsibleState !== TreeItemCollapsibleState.None && !this.hasIcon(c)));
            }
            return (!!parent.children &&
                parent.children.every((c) => c.collapsibleState === TreeItemCollapsibleState.None || !this.hasIcon(c)));
        }
        else {
            return false;
        }
    }
    hasIcon(node) {
        const icon = this.themeService.getColorTheme().type === ColorScheme.LIGHT ? node.icon : node.iconDark;
        if (icon) {
            return true;
        }
        if (node.resourceUri || node.themeIcon) {
            const fileIconTheme = this.themeService.getFileIconTheme();
            const isFolder = node.themeIcon
                ? node.themeIcon.id === FolderThemeIcon.id
                : node.collapsibleState !== TreeItemCollapsibleState.None;
            if (isFolder) {
                return fileIconTheme.hasFileIcons && fileIconTheme.hasFolderIcons;
            }
            return fileIconTheme.hasFileIcons;
        }
        return false;
    }
}
class MultipleSelectionActionRunner extends ActionRunner {
    constructor(notificationService, getSelectedResources) {
        super();
        this.getSelectedResources = getSelectedResources;
        this._register(this.onDidRun((e) => {
            if (e.error && !isCancellationError(e.error)) {
                notificationService.error(localize('command-error', 'Error running command {1}: {0}. This is likely caused by the extension that contributes {1}.', e.error.message, e.action.id));
            }
        }));
    }
    async runAction(action, context) {
        const selection = this.getSelectedResources();
        let selectionHandleArgs = undefined;
        let actionInSelected = false;
        if (selection.length > 1) {
            selectionHandleArgs = selection.map((selected) => {
                if (selected.handle === context.$treeItemHandle ||
                    context.$selectedTreeItems) {
                    actionInSelected = true;
                }
                return { $treeViewId: context.$treeViewId, $treeItemHandle: selected.handle };
            });
        }
        if (!actionInSelected && selectionHandleArgs) {
            selectionHandleArgs = undefined;
        }
        await action.run(context, selectionHandleArgs);
    }
}
let TreeMenus = class TreeMenus {
    constructor(id, menuService) {
        this.id = id;
        this.menuService = menuService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    /**
     * Gets only the actions that apply to all of the given elements.
     */
    getResourceActions(elements) {
        const actions = this.getActions(this.getMenuId(), elements);
        return actions.primary;
    }
    /**
     * Gets only the actions that apply to all of the given elements.
     */
    getResourceContextActions(elements) {
        return this.getActions(this.getMenuId(), elements).secondary;
    }
    setContextKeyService(service) {
        this.contextKeyService = service;
    }
    filterNonUniversalActions(groups, newActions) {
        const newActionsSet = new Set(newActions.map((a) => a.id));
        for (const group of groups) {
            const actions = group.keys();
            for (const action of actions) {
                if (!newActionsSet.has(action)) {
                    group.delete(action);
                }
            }
        }
    }
    buildMenu(groups) {
        const result = [];
        for (const group of groups) {
            if (group.size > 0) {
                if (result.length) {
                    result.push(new Separator());
                }
                result.push(...group.values());
            }
        }
        return result;
    }
    createGroups(actions) {
        const groups = [];
        let group = new Map();
        for (const action of actions) {
            if (action instanceof Separator) {
                groups.push(group);
                group = new Map();
            }
            else {
                group.set(action.id, action);
            }
        }
        groups.push(group);
        return groups;
    }
    getElementOverlayContexts(element) {
        return new Map([
            ['view', this.id],
            ['viewItem', element.contextValue],
        ]);
    }
    getEntireMenuContexts() {
        return this.menuService.getMenuContexts(this.getMenuId());
    }
    getMenuId() {
        return MenuId.ViewItemContext;
    }
    getActions(menuId, elements) {
        if (!this.contextKeyService) {
            return { primary: [], secondary: [] };
        }
        let primaryGroups = [];
        let secondaryGroups = [];
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const contextKeyService = this.contextKeyService.createOverlay(this.getElementOverlayContexts(element));
            const menuData = this.menuService.getMenuActions(menuId, contextKeyService, {
                shouldForwardArgs: true,
            });
            const result = getContextMenuActions(menuData, 'inline');
            if (i === 0) {
                primaryGroups = this.createGroups(result.primary);
                secondaryGroups = this.createGroups(result.secondary);
            }
            else {
                this.filterNonUniversalActions(primaryGroups, result.primary);
                this.filterNonUniversalActions(secondaryGroups, result.secondary);
            }
        }
        return { primary: this.buildMenu(primaryGroups), secondary: this.buildMenu(secondaryGroups) };
    }
    dispose() {
        this.contextKeyService = undefined;
    }
};
TreeMenus = __decorate([
    __param(1, IMenuService)
], TreeMenus);
let CustomTreeView = class CustomTreeView extends AbstractTreeView {
    constructor(id, title, extensionId, themeService, instantiationService, commandService, configurationService, progressService, contextMenuService, keybindingService, notificationService, viewDescriptorService, contextKeyService, hoverService, extensionService, activityService, telemetryService, logService, openerService) {
        super(id, title, themeService, instantiationService, commandService, configurationService, progressService, contextMenuService, keybindingService, notificationService, viewDescriptorService, hoverService, contextKeyService, activityService, logService, openerService);
        this.extensionId = extensionId;
        this.extensionService = extensionService;
        this.telemetryService = telemetryService;
    }
    activate() {
        if (!this.activated) {
            this.telemetryService.publicLog2('Extension:ViewActivate', {
                extensionId: new TelemetryTrustedValue(this.extensionId),
                id: this.id,
            });
            this.createTree();
            this.progressService
                .withProgress({ location: this.id }, () => this.extensionService.activateByEvent(`onView:${this.id}`))
                .then(() => timeout(2000))
                .then(() => {
                this.updateMessage();
            });
            this.activated = true;
        }
    }
};
CustomTreeView = __decorate([
    __param(3, IThemeService),
    __param(4, IInstantiationService),
    __param(5, ICommandService),
    __param(6, IConfigurationService),
    __param(7, IProgressService),
    __param(8, IContextMenuService),
    __param(9, IKeybindingService),
    __param(10, INotificationService),
    __param(11, IViewDescriptorService),
    __param(12, IContextKeyService),
    __param(13, IHoverService),
    __param(14, IExtensionService),
    __param(15, IActivityService),
    __param(16, ITelemetryService),
    __param(17, ILogService),
    __param(18, IOpenerService)
], CustomTreeView);
export { CustomTreeView };
export class TreeView extends AbstractTreeView {
    activate() {
        if (!this.activated) {
            this.createTree();
            this.activated = true;
        }
    }
}
let CustomTreeViewDragAndDrop = class CustomTreeViewDragAndDrop {
    constructor(treeId, labelService, instantiationService, treeViewsDragAndDropService, logService) {
        this.treeId = treeId;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.treeViewsDragAndDropService = treeViewsDragAndDropService;
        this.logService = logService;
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this.treeMimeType = `application/vnd.code.tree.${treeId.toLowerCase()}`;
    }
    set controller(controller) {
        this.dndController = controller;
    }
    handleDragAndLog(dndController, itemHandles, uuid, dragCancellationToken) {
        return dndController
            .handleDrag(itemHandles, uuid, dragCancellationToken)
            .then((additionalDataTransfer) => {
            if (additionalDataTransfer) {
                const unlistedTypes = [];
                for (const item of additionalDataTransfer) {
                    if (item[0] !== this.treeMimeType &&
                        dndController.dragMimeTypes.findIndex((value) => value === item[0]) < 0) {
                        unlistedTypes.push(item[0]);
                    }
                }
                if (unlistedTypes.length) {
                    this.logService.warn(`Drag and drop controller for tree ${this.treeId} adds the following data transfer types but does not declare them in dragMimeTypes: ${unlistedTypes.join(', ')}`);
                }
            }
            return additionalDataTransfer;
        });
    }
    addExtensionProvidedTransferTypes(originalEvent, itemHandles) {
        if (!originalEvent.dataTransfer || !this.dndController) {
            return;
        }
        const uuid = generateUuid();
        this.dragCancellationToken = new CancellationTokenSource();
        this.treeViewsDragAndDropService.addDragOperationTransfer(uuid, this.handleDragAndLog(this.dndController, itemHandles, uuid, this.dragCancellationToken.token));
        this.treeItemsTransfer.setData([new DraggedTreeItemsIdentifier(uuid)], DraggedTreeItemsIdentifier.prototype);
        originalEvent.dataTransfer.clearData(Mimes.text);
        if (this.dndController.dragMimeTypes.find((element) => element === Mimes.uriList)) {
            // Add the type that the editor knows
            originalEvent.dataTransfer?.setData(DataTransfers.RESOURCES, '');
        }
        this.dndController.dragMimeTypes.forEach((supportedType) => {
            originalEvent.dataTransfer?.setData(supportedType, '');
        });
    }
    addResourceInfoToTransfer(originalEvent, resources) {
        if (resources.length && originalEvent.dataTransfer) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, resources, originalEvent));
            // The only custom data transfer we set from the explorer is a file transfer
            // to be able to DND between multiple code file explorers across windows
            const fileResources = resources.filter((s) => s.scheme === Schemas.file).map((r) => r.fsPath);
            if (fileResources.length) {
                originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
            }
        }
    }
    onDragStart(data, originalEvent) {
        if (originalEvent.dataTransfer) {
            const treeItemsData = data.getData();
            const resources = [];
            const sourceInfo = {
                id: this.treeId,
                itemHandles: [],
            };
            treeItemsData.forEach((item) => {
                sourceInfo.itemHandles.push(item.handle);
                if (item.resourceUri) {
                    resources.push(URI.revive(item.resourceUri));
                }
            });
            this.addResourceInfoToTransfer(originalEvent, resources);
            this.addExtensionProvidedTransferTypes(originalEvent, sourceInfo.itemHandles);
            originalEvent.dataTransfer.setData(this.treeMimeType, JSON.stringify(sourceInfo));
        }
    }
    debugLog(types) {
        if (types.size) {
            this.logService.debug(`TreeView dragged mime types: ${Array.from(types).join(', ')}`);
        }
        else {
            this.logService.debug(`TreeView dragged with no supported mime types.`);
        }
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        const dataTransfer = toExternalVSDataTransfer(originalEvent.dataTransfer);
        const types = new Set(Array.from(dataTransfer, (x) => x[0]));
        if (originalEvent.dataTransfer) {
            // Also add uri-list if we have any files. At this stage we can't actually access the file itself though.
            for (const item of originalEvent.dataTransfer.items) {
                if (item.kind === 'file' || item.type === DataTransfers.RESOURCES.toLowerCase()) {
                    types.add(Mimes.uriList);
                    break;
                }
            }
        }
        this.debugLog(types);
        const dndController = this.dndController;
        if (!dndController || !originalEvent.dataTransfer || dndController.dropMimeTypes.length === 0) {
            return false;
        }
        const dragContainersSupportedType = Array.from(types).some((value, index) => {
            if (value === this.treeMimeType) {
                return true;
            }
            else {
                return dndController.dropMimeTypes.indexOf(value) >= 0;
            }
        });
        if (dragContainersSupportedType) {
            return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, autoExpand: true };
        }
        return false;
    }
    getDragURI(element) {
        if (!this.dndController) {
            return null;
        }
        return element.resourceUri ? URI.revive(element.resourceUri).toString() : element.handle;
    }
    getDragLabel(elements) {
        if (!this.dndController) {
            return undefined;
        }
        if (elements.length > 1) {
            return String(elements.length);
        }
        const element = elements[0];
        return element.label
            ? element.label.label
            : element.resourceUri
                ? this.labelService.getUriLabel(URI.revive(element.resourceUri))
                : undefined;
    }
    async drop(data, targetNode, targetIndex, targetSector, originalEvent) {
        const dndController = this.dndController;
        if (!originalEvent.dataTransfer || !dndController) {
            return;
        }
        let treeSourceInfo;
        let willDropUuid;
        if (this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)) {
            willDropUuid = this.treeItemsTransfer.getData(DraggedTreeItemsIdentifier.prototype)[0]
                .identifier;
        }
        const originalDataTransfer = toExternalVSDataTransfer(originalEvent.dataTransfer, true);
        const outDataTransfer = new VSDataTransfer();
        for (const [type, item] of originalDataTransfer) {
            if (type === this.treeMimeType ||
                dndController.dropMimeTypes.includes(type) ||
                (item.asFile() && dndController.dropMimeTypes.includes(DataTransfers.FILES.toLowerCase()))) {
                outDataTransfer.append(type, item);
                if (type === this.treeMimeType) {
                    try {
                        treeSourceInfo = JSON.parse(await item.asString());
                    }
                    catch {
                        // noop
                    }
                }
            }
        }
        const additionalDataTransfer = await this.treeViewsDragAndDropService.removeDragOperationTransfer(willDropUuid);
        if (additionalDataTransfer) {
            for (const [type, item] of additionalDataTransfer) {
                outDataTransfer.append(type, item);
            }
        }
        return dndController.handleDrop(outDataTransfer, targetNode, CancellationToken.None, willDropUuid, treeSourceInfo?.id, treeSourceInfo?.itemHandles);
    }
    onDragEnd(originalEvent) {
        // Check if the drag was cancelled.
        if (originalEvent.dataTransfer?.dropEffect === 'none') {
            this.dragCancellationToken?.cancel();
        }
    }
    dispose() { }
};
CustomTreeViewDragAndDrop = __decorate([
    __param(1, ILabelService),
    __param(2, IInstantiationService),
    __param(3, ITreeViewsDnDService),
    __param(4, ILogService)
], CustomTreeViewDragAndDrop);
export { CustomTreeViewDragAndDrop };
function setCascadingCheckboxUpdates(items) {
    const additionalItems = [];
    for (const item of items) {
        if (item.checkbox !== undefined) {
            const checkChildren = (currentItem) => {
                for (const child of currentItem.children ?? []) {
                    if (child.checkbox !== undefined &&
                        currentItem.checkbox !== undefined &&
                        child.checkbox.isChecked !== currentItem.checkbox.isChecked) {
                        child.checkbox.isChecked = currentItem.checkbox.isChecked;
                        additionalItems.push(child);
                        checkChildren(child);
                    }
                }
            };
            checkChildren(item);
            const visitedParents = new Set();
            const checkParents = (currentItem) => {
                if (currentItem.parent &&
                    currentItem.parent.checkbox !== undefined &&
                    currentItem.parent.children) {
                    if (visitedParents.has(currentItem.parent)) {
                        return;
                    }
                    else {
                        visitedParents.add(currentItem.parent);
                    }
                    let someUnchecked = false;
                    let someChecked = false;
                    for (const child of currentItem.parent.children) {
                        if (someUnchecked && someChecked) {
                            break;
                        }
                        if (child.checkbox !== undefined) {
                            if (child.checkbox.isChecked) {
                                someChecked = true;
                            }
                            else {
                                someUnchecked = true;
                            }
                        }
                    }
                    if (someChecked && !someUnchecked && currentItem.parent.checkbox.isChecked !== true) {
                        currentItem.parent.checkbox.isChecked = true;
                        additionalItems.push(currentItem.parent);
                        checkParents(currentItem.parent);
                    }
                    else if (someUnchecked && currentItem.parent.checkbox.isChecked !== false) {
                        currentItem.parent.checkbox.isChecked = false;
                        additionalItems.push(currentItem.parent);
                        checkParents(currentItem.parent);
                    }
                }
            };
            checkParents(item);
        }
    }
    return items.concat(additionalItems);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3ZpZXdzL3RyZWVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFvQixNQUFNLGlDQUFpQyxDQUFBO0FBQ2pGLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLEtBQUssTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RixPQUFPLEVBQ04sU0FBUyxHQUVULE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBZ0J6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFjLE1BQU0sb0NBQW9DLENBQUE7QUFDOUUsT0FBTyxFQUVOLGdCQUFnQixFQUNoQixjQUFjLEdBQ2QsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMv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