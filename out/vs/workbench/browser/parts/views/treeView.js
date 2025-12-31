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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy92aWV3cy90cmVlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBb0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxLQUFLLE1BQU0sc0NBQXNDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDeEYsT0FBTyxFQUNOLFNBQVMsR0FFVCxNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQWdCekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBVyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBYyxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFFTixnQkFBZ0IsRUFDaEIsY0FBYyxHQUNkLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FB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