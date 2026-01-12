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
var ExplorerView_1;
import * as nls from '../../../../../nls.js';
import * as perf from '../../../../../base/common/performance.js';
import { memoize } from '../../../../../base/common/decorators.js';
import { ExplorerFolderContext, FilesExplorerFocusedContext, ExplorerFocusedContext, ExplorerRootContext, ExplorerResourceReadonlyContext, ExplorerResourceCut, ExplorerResourceMoveableToTrash, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext, ExplorerCompressedLastFocusContext, ExplorerResourceAvailableEditorIdsContext, VIEW_ID, ExplorerResourceWritableContext, ViewHasSomeCollapsibleRootItemContext, FoldersViewVisibleContext, ExplorerResourceParentReadOnlyContext, ExplorerFindProviderActive, } from '../../common/files.js';
import { FileCopiedContext, NEW_FILE_COMMAND_ID, NEW_FOLDER_COMMAND_ID } from '../fileActions.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { ExplorerDecorationsProvider } from './explorerDecorationsProvider.js';
import { IWorkspaceContextService, } from '../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IProgressService, } from '../../../../../platform/progress/common/progress.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService, ContextKeyExpr, } from '../../../../../platform/contextkey/common/contextkey.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { IDecorationsService } from '../../../../services/decorations/common/decorations.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { DelayedDragHandler } from '../../../../../base/browser/dnd.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP, } from '../../../../services/editor/common/editorService.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ExplorerDelegate, ExplorerDataSource, FilesRenderer, FilesFilter, FileSorter, FileDragAndDrop, ExplorerCompressionDelegate, isCompressedFolderName, ExplorerFindProvider, } from './explorerViewer.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { MenuId, Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ExplorerItem, NewExplorerItem } from '../../common/explorerModel.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IFileService, } from '../../../../../platform/files/common/files.js';
import { Event } from '../../../../../base/common/event.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IExplorerService } from '../files.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IEditorResolverService } from '../../../../services/editor/common/editorResolverService.js';
import { EditorOpenSource } from '../../../../../platform/editor/common/editor.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
function hasExpandedRootChild(tree, treeInput) {
    for (const folder of treeInput) {
        if (tree.hasNode(folder) && !tree.isCollapsed(folder)) {
            for (const [, child] of folder.children.entries()) {
                if (tree.hasNode(child) && tree.isCollapsible(child) && !tree.isCollapsed(child)) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Whether or not any of the nodes in the tree are expanded
 */
function hasExpandedNode(tree, treeInput) {
    for (const folder of treeInput) {
        if (tree.hasNode(folder) && !tree.isCollapsed(folder)) {
            return true;
        }
    }
    return false;
}
const identityProvider = {
    getId: (stat) => {
        if (stat instanceof NewExplorerItem) {
            return `new:${stat.getId()}`;
        }
        return stat.getId();
    },
};
export function getContext(focus, selection, respectMultiSelection, compressedNavigationControllerProvider) {
    let focusedStat;
    focusedStat = focus.length ? focus[0] : undefined;
    // If we are respecting multi-select and we have a multi-selection we ignore focus as we want to act on the selection
    if (respectMultiSelection && selection.length > 1) {
        focusedStat = undefined;
    }
    const compressedNavigationControllers = focusedStat &&
        compressedNavigationControllerProvider.getCompressedNavigationController(focusedStat);
    const compressedNavigationController = compressedNavigationControllers && compressedNavigationControllers.length
        ? compressedNavigationControllers[0]
        : undefined;
    focusedStat = compressedNavigationController
        ? compressedNavigationController.current
        : focusedStat;
    const selectedStats = [];
    for (const stat of selection) {
        const controllers = compressedNavigationControllerProvider.getCompressedNavigationController(stat);
        const controller = controllers && controllers.length ? controllers[0] : undefined;
        if (controller && focusedStat && controller === compressedNavigationController) {
            if (stat === focusedStat) {
                selectedStats.push(stat);
            }
            // Ignore stats which are selected but are part of the same compact node as the focused stat
            continue;
        }
        if (controller) {
            selectedStats.push(...controller.items);
        }
        else {
            selectedStats.push(stat);
        }
    }
    if (!focusedStat) {
        if (respectMultiSelection) {
            return selectedStats;
        }
        else {
            return [];
        }
    }
    if (respectMultiSelection && selectedStats.indexOf(focusedStat) >= 0) {
        return selectedStats;
    }
    return [focusedStat];
}
let ExplorerView = class ExplorerView extends ViewPane {
    static { ExplorerView_1 = this; }
    static { this.TREE_VIEW_STATE_STORAGE_KEY = 'workbench.explorer.treeViewState'; }
    constructor(options, contextMenuService, viewDescriptorService, instantiationService, contextService, progressService, editorService, editorResolverService, layoutService, keybindingService, contextKeyService, configurationService, decorationService, labelService, themeService, telemetryService, hoverService, explorerService, storageService, clipboardService, fileService, uriIdentityService, commandService, openerService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.contextService = contextService;
        this.progressService = progressService;
        this.editorService = editorService;
        this.editorResolverService = editorResolverService;
        this.layoutService = layoutService;
        this.decorationService = decorationService;
        this.labelService = labelService;
        this.telemetryService = telemetryService;
        this.explorerService = explorerService;
        this.storageService = storageService;
        this.clipboardService = clipboardService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.commandService = commandService;
        this._autoReveal = false;
        this.delegate = options.delegate;
        this.resourceContext = instantiationService.createInstance(ResourceContextKey);
        this._register(this.resourceContext);
        this.parentReadonlyContext = ExplorerResourceParentReadOnlyContext.bindTo(contextKeyService);
        this.folderContext = ExplorerFolderContext.bindTo(contextKeyService);
        this.readonlyContext = ExplorerResourceReadonlyContext.bindTo(contextKeyService);
        this.availableEditorIdsContext =
            ExplorerResourceAvailableEditorIdsContext.bindTo(contextKeyService);
        this.rootContext = ExplorerRootContext.bindTo(contextKeyService);
        this.resourceMoveableToTrash = ExplorerResourceMoveableToTrash.bindTo(contextKeyService);
        this.compressedFocusContext = ExplorerCompressedFocusContext.bindTo(contextKeyService);
        this.compressedFocusFirstContext = ExplorerCompressedFirstFocusContext.bindTo(contextKeyService);
        this.compressedFocusLastContext = ExplorerCompressedLastFocusContext.bindTo(contextKeyService);
        this.viewHasSomeCollapsibleRootItem =
            ViewHasSomeCollapsibleRootItemContext.bindTo(contextKeyService);
        this.viewVisibleContextKey = FoldersViewVisibleContext.bindTo(contextKeyService);
        this.explorerService.registerView(this);
    }
    get autoReveal() {
        return this._autoReveal;
    }
    set autoReveal(autoReveal) {
        this._autoReveal = autoReveal;
    }
    get name() {
        return this.labelService.getWorkspaceLabel(this.contextService.getWorkspace());
    }
    get title() {
        return this.name;
    }
    set title(_) {
        // noop
    }
    setVisible(visible) {
        this.viewVisibleContextKey.set(visible);
        super.setVisible(visible);
    }
    get fileCopiedContextKey() {
        return FileCopiedContext.bindTo(this.contextKeyService);
    }
    get resourceCutContextKey() {
        return ExplorerResourceCut.bindTo(this.contextKeyService);
    }
    // Split view methods
    renderHeader(container) {
        super.renderHeader(container);
        // Expand on drag over
        this.dragHandler = new DelayedDragHandler(container, () => this.setExpanded(true));
        const titleElement = container.querySelector('.title');
        const setHeader = () => {
            titleElement.textContent = this.name;
            this.updateTitle(this.name);
            this.ariaHeaderLabel = nls.localize('explorerSection', 'Explorer Section: {0}', this.name);
            titleElement.setAttribute('aria-label', this.ariaHeaderLabel);
        };
        this._register(this.contextService.onDidChangeWorkspaceName(setHeader));
        this._register(this.labelService.onDidChangeFormatters(setHeader));
        setHeader();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    renderBody(container) {
        super.renderBody(container);
        this.container = container;
        this.treeContainer = DOM.append(container, DOM.$('.explorer-folders-view'));
        this.createTree(this.treeContainer);
        this._register(this.labelService.onDidChangeFormatters(() => {
            this._onDidChangeTitleArea.fire();
        }));
        // Update configuration
        this.onConfigurationUpdated(undefined);
        // When the explorer viewer is loaded, listen to changes to the editor input
        this._register(this.editorService.onDidActiveEditorChange(() => {
            this.selectActiveFile();
        }));
        // Also handle configuration updates
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
        this._register(this.onDidChangeBodyVisibility(async (visible) => {
            if (visible) {
                // Always refresh explorer when it becomes visible to compensate for missing file events #126817
                await this.setTreeInput();
                // Update the collapse / expand  button state
                this.updateAnyCollapsedContext();
                // Find resource to focus from active editor input if set
                this.selectActiveFile(true);
            }
        }));
        // Support for paste of files into explorer
        this._register(DOM.addDisposableListener(DOM.getWindow(this.container), DOM.EventType.PASTE, async (event) => {
            if (!this.hasFocus() || this.readonlyContext.get()) {
                return;
            }
            if (event.clipboardData?.files?.length) {
                await this.commandService.executeCommand('filesExplorer.paste', event.clipboardData?.files);
            }
        }));
    }
    focus() {
        super.focus();
        this.tree.domFocus();
        if (this.tree.getFocusedPart() === 0 /* AbstractTreePart.Tree */) {
            const focused = this.tree.getFocus();
            if (focused.length === 1 && this._autoReveal) {
                this.tree.reveal(focused[0], 0.5);
            }
        }
    }
    hasFocus() {
        return DOM.isAncestorOfActiveElement(this.container);
    }
    getFocus() {
        return this.tree.getFocus();
    }
    focusNext() {
        this.tree.focusNext();
    }
    focusLast() {
        this.tree.focusLast();
    }
    getContext(respectMultiSelection) {
        const focusedItems = this.tree.getFocusedPart() === 1 /* AbstractTreePart.StickyScroll */
            ? this.tree.getStickyScrollFocus()
            : this.tree.getFocus();
        return getContext(focusedItems, this.tree.getSelection(), respectMultiSelection, this.renderer);
    }
    isItemVisible(item) {
        // If filter is undefined it means the tree hasn't been rendered yet, so nothing is visible
        if (!this.filter) {
            return false;
        }
        return this.filter.filter(item, 1 /* TreeVisibility.Visible */);
    }
    isItemCollapsed(item) {
        return this.tree.isCollapsed(item);
    }
    async setEditable(stat, isEditing) {
        if (isEditing) {
            this.horizontalScrolling = this.tree.options.horizontalScrolling;
            if (this.horizontalScrolling) {
                this.tree.updateOptions({ horizontalScrolling: false });
            }
            await this.tree.expand(stat.parent);
        }
        else {
            if (this.horizontalScrolling !== undefined) {
                this.tree.updateOptions({ horizontalScrolling: this.horizontalScrolling });
            }
            this.horizontalScrolling = undefined;
            this.treeContainer.classList.remove('highlight');
        }
        await this.refresh(false, stat.parent, false);
        if (isEditing) {
            this.treeContainer.classList.add('highlight');
            this.tree.reveal(stat);
        }
        else {
            this.tree.domFocus();
        }
    }
    async selectActiveFile(reveal = this._autoReveal) {
        if (this._autoReveal) {
            const activeFile = EditorResourceAccessor.getCanonicalUri(this.editorService.activeEditor, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            });
            if (activeFile) {
                const focus = this.tree.getFocus();
                const selection = this.tree.getSelection();
                if (focus.length === 1 &&
                    this.uriIdentityService.extUri.isEqual(focus[0].resource, activeFile) &&
                    selection.length === 1 &&
                    this.uriIdentityService.extUri.isEqual(selection[0].resource, activeFile)) {
                    // No action needed, active file is already focused and selected
                    return;
                }
                return this.explorerService.select(activeFile, reveal);
            }
        }
    }
    createTree(container) {
        this.filter = this.instantiationService.createInstance(FilesFilter);
        this._register(this.filter);
        this._register(this.filter.onDidChange(() => this.refresh(true)));
        const explorerLabels = this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this.onDidChangeBodyVisibility,
        });
        this._register(explorerLabels);
        this.findProvider = this.instantiationService.createInstance(ExplorerFindProvider, this.filter, () => this.tree);
        const updateWidth = (stat) => this.tree.updateWidth(stat);
        this.renderer = this.instantiationService.createInstance(FilesRenderer, container, explorerLabels, this.findProvider.highlightTree, updateWidth);
        this._register(this.renderer);
        this._register(createFileIconThemableTreeContainerScope(container, this.themeService));
        const isCompressionEnabled = () => this.configurationService.getValue('explorer.compactFolders');
        const getFileNestingSettings = (item) => this.configurationService.getValue({ resource: item?.root.resource })
            .explorer.fileNesting;
        this.tree = this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'FileExplorer', container, new ExplorerDelegate(), new ExplorerCompressionDelegate(), [this.renderer], this.instantiationService.createInstance(ExplorerDataSource, this.filter, this.findProvider), {
            compressionEnabled: isCompressionEnabled(),
            accessibilityProvider: this.renderer,
            identityProvider,
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (stat) => {
                    if (this.explorerService.isEditable(stat)) {
                        return undefined;
                    }
                    return stat.name;
                },
                getCompressedNodeKeyboardNavigationLabel: (stats) => {
                    if (stats.some((stat) => this.explorerService.isEditable(stat))) {
                        return undefined;
                    }
                    return stats.map((stat) => stat.name).join('/');
                },
            },
            multipleSelectionSupport: true,
            filter: this.filter,
            sorter: this.instantiationService.createInstance(FileSorter),
            dnd: this.instantiationService.createInstance(FileDragAndDrop, (item) => this.isItemCollapsed(item)),
            collapseByDefault: (e) => {
                if (e instanceof ExplorerItem) {
                    if (e.hasNests && getFileNestingSettings(e).expand) {
                        return false;
                    }
                    if (this.findProvider.isShowingFilterResults()) {
                        return false;
                    }
                }
                return true;
            },
            autoExpandSingleChildren: true,
            expandOnlyOnTwistieClick: (e) => {
                if (e instanceof ExplorerItem) {
                    if (e.hasNests) {
                        return true;
                    }
                    else if (this.configurationService.getValue('workbench.tree.expandMode') === 'doubleClick') {
                        return true;
                    }
                }
                return false;
            },
            paddingBottom: ExplorerDelegate.ITEM_HEIGHT,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            findProvider: this.findProvider,
        });
        this._register(this.tree);
        this._register(this.themeService.onDidColorThemeChange(() => this.tree.rerender()));
        // Bind configuration
        const onDidChangeCompressionConfiguration = Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('explorer.compactFolders'));
        this._register(onDidChangeCompressionConfiguration((_) => this.tree.updateOptions({ compressionEnabled: isCompressionEnabled() })));
        // Bind context keys
        FilesExplorerFocusedContext.bindTo(this.tree.contextKeyService);
        ExplorerFocusedContext.bindTo(this.tree.contextKeyService);
        // Update resource context based on focused element
        this._register(this.tree.onDidChangeFocus((e) => this.onFocusChanged(e.elements)));
        this.onFocusChanged([]);
        // Open when selecting via keyboard
        this._register(this.tree.onDidOpen(async (e) => {
            const element = e.element;
            if (!element) {
                return;
            }
            // Do not react if the user is expanding selection via keyboard.
            // Check if the item was previously also selected, if yes the user is simply expanding / collapsing current selection #66589.
            const shiftDown = DOM.isKeyboardEvent(e.browserEvent) && e.browserEvent.shiftKey;
            if (!shiftDown) {
                if (element.isDirectory || this.explorerService.isEditable(undefined)) {
                    // Do not react if user is clicking on explorer items while some are being edited #70276
                    // Do not react if clicking on directories
                    return;
                }
                this.telemetryService.publicLog2('workbenchActionExecuted', { id: 'workbench.files.openFile', from: 'explorer' });
                try {
                    this.delegate?.willOpenElement(e.browserEvent);
                    await this.editorService.openEditor({
                        resource: element.resource,
                        options: {
                            preserveFocus: e.editorOptions.preserveFocus,
                            pinned: e.editorOptions.pinned,
                            source: EditorOpenSource.USER,
                        },
                    }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                }
                finally {
                    this.delegate?.didOpenElement();
                }
            }
        }));
        this._register(this.tree.onContextMenu((e) => this.onContextMenu(e)));
        this._register(this.tree.onDidScroll(async (e) => {
            const editable = this.explorerService.getEditable();
            if (e.scrollTopChanged && editable && this.tree.getRelativeTop(editable.stat) === null) {
                await editable.data.onFinish('', false);
            }
        }));
        this._register(this.tree.onDidChangeCollapseState((e) => {
            const element = e.node.element?.element;
            if (element) {
                const navigationControllers = this.renderer.getCompressedNavigationController(element instanceof Array ? element[0] : element);
                navigationControllers?.forEach((controller) => controller.updateCollapsed(e.node.collapsed));
            }
            // Update showing expand / collapse button
            this.updateAnyCollapsedContext();
        }));
        this.updateAnyCollapsedContext();
        this._register(this.tree.onMouseDblClick((e) => {
            // If empty space is clicked, and not scrolling by page enabled #173261
            const scrollingByPage = this.configurationService.getValue('workbench.list.scrollByPage');
            if (e.element === null && !scrollingByPage) {
                // click in empty area -> create a new file #116676
                this.commandService.executeCommand(NEW_FILE_COMMAND_ID);
            }
        }));
        // save view state
        this._register(this.storageService.onWillSaveState(() => {
            this.storeTreeViewState();
        }));
    }
    // React on events
    onConfigurationUpdated(event) {
        if (!event || event.affectsConfiguration('explorer.autoReveal')) {
            const configuration = this.configurationService.getValue();
            this._autoReveal = configuration?.explorer?.autoReveal;
        }
        // Push down config updates to components of viewer
        if (event &&
            (event.affectsConfiguration('explorer.decorations.colors') ||
                event.affectsConfiguration('explorer.decorations.badges'))) {
            this.refresh(true);
        }
    }
    storeTreeViewState() {
        this.storageService.store(ExplorerView_1.TREE_VIEW_STATE_STORAGE_KEY, JSON.stringify(this.tree.getViewState()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    setContextKeys(stat) {
        const folders = this.contextService.getWorkspace().folders;
        const resource = stat ? stat.resource : folders[folders.length - 1].uri;
        stat = stat || this.explorerService.findClosest(resource);
        this.resourceContext.set(resource);
        this.folderContext.set(!!stat && stat.isDirectory);
        this.readonlyContext.set(!!stat && !!stat.isReadonly);
        this.parentReadonlyContext.set(Boolean(stat?.parent?.isReadonly));
        this.rootContext.set(!!stat && stat.isRoot);
        if (resource) {
            const overrides = resource
                ? this.editorResolverService.getEditors(resource).map((editor) => editor.id)
                : [];
            this.availableEditorIdsContext.set(overrides.join(','));
        }
        else {
            this.availableEditorIdsContext.reset();
        }
    }
    async onContextMenu(e) {
        if (DOM.isEditableElement(e.browserEvent.target)) {
            return;
        }
        const stat = e.element;
        let anchor = e.anchor;
        // Adjust for compressed folders (except when mouse is used)
        if (DOM.isHTMLElement(anchor)) {
            if (stat) {
                const controllers = this.renderer.getCompressedNavigationController(stat);
                if (controllers && controllers.length > 0) {
                    if (DOM.isKeyboardEvent(e.browserEvent) ||
                        isCompressedFolderName(e.browserEvent.target)) {
                        anchor = controllers[0].labels[controllers[0].index];
                    }
                    else {
                        controllers.forEach((controller) => controller.last());
                    }
                }
            }
        }
        // update dynamic contexts
        this.fileCopiedContextKey.set(await this.clipboardService.hasResources());
        this.setContextKeys(stat);
        const selection = this.tree.getSelection();
        const roots = this.explorerService.roots; // If the click is outside of the elements pass the root resource if there is only one root. If there are multiple roots pass empty object.
        let arg;
        if (stat instanceof ExplorerItem) {
            const compressedControllers = this.renderer.getCompressedNavigationController(stat);
            arg =
                compressedControllers && compressedControllers.length
                    ? compressedControllers[0].current.resource
                    : stat.resource;
        }
        else {
            arg = roots.length === 1 ? roots[0].resource : {};
        }
        this.contextMenuService.showContextMenu({
            menuId: MenuId.ExplorerContext,
            menuActionOptions: { arg, shouldForwardArgs: true },
            contextKeyService: this.tree.contextKeyService,
            getAnchor: () => anchor,
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.tree.domFocus();
                }
            },
            getActionsContext: () => stat && selection && selection.indexOf(stat) >= 0
                ? selection.map((fs) => fs.resource)
                : stat instanceof ExplorerItem
                    ? [stat.resource]
                    : [],
        });
    }
    onFocusChanged(elements) {
        const stat = elements && elements.length ? elements[0] : undefined;
        this.setContextKeys(stat);
        if (stat) {
            const enableTrash = Boolean(this.configurationService.getValue().files?.enableTrash);
            const hasCapability = this.fileService.hasCapability(stat.resource, 4096 /* FileSystemProviderCapabilities.Trash */);
            this.resourceMoveableToTrash.set(enableTrash && hasCapability);
        }
        else {
            this.resourceMoveableToTrash.reset();
        }
        const compressedNavigationControllers = stat && this.renderer.getCompressedNavigationController(stat);
        if (!compressedNavigationControllers) {
            this.compressedFocusContext.set(false);
            return;
        }
        this.compressedFocusContext.set(true);
        compressedNavigationControllers.forEach((controller) => {
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    // General methods
    /**
     * Refresh the contents of the explorer to get up to date data from the disk about the file structure.
     * If the item is passed we refresh only that level of the tree, otherwise we do a full refresh.
     */
    refresh(recursive, item, cancelEditing = true) {
        if (!this.tree ||
            !this.isBodyVisible() ||
            (item && !this.tree.hasNode(item)) ||
            (this.findProvider?.isShowingFilterResults() && recursive)) {
            // Tree node doesn't exist yet, when it becomes visible we will refresh
            return Promise.resolve(undefined);
        }
        if (cancelEditing && this.explorerService.isEditable(undefined)) {
            this.tree.domFocus();
        }
        const toRefresh = item || this.tree.getInput();
        return this.tree.updateChildren(toRefresh, recursive, !!item);
    }
    getOptimalWidth() {
        const parentNode = this.tree.getHTMLElement();
        const childNodes = [].slice.call(parentNode.querySelectorAll('.explorer-item .label-name')); // select all file labels
        return DOM.getLargestChildWidth(parentNode, childNodes);
    }
    async setTreeInput() {
        if (!this.isBodyVisible()) {
            return Promise.resolve(undefined);
        }
        // Wait for the last execution to complete before executing
        if (this.setTreeInputPromise) {
            await this.setTreeInputPromise;
        }
        const initialInputSetup = !this.tree.getInput();
        if (initialInputSetup) {
            perf.mark('code/willResolveExplorer');
        }
        const roots = this.explorerService.roots;
        let input = roots[0];
        if (this.contextService.getWorkbenchState() !== 2 /* WorkbenchState.FOLDER */ || roots[0].error) {
            // Display roots only when multi folder workspace
            input = roots;
        }
        let viewState;
        if (this.tree && this.tree.getInput()) {
            viewState = this.tree.getViewState();
        }
        else {
            const rawViewState = this.storageService.get(ExplorerView_1.TREE_VIEW_STATE_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (rawViewState) {
                viewState = JSON.parse(rawViewState);
            }
        }
        const previousInput = this.tree.getInput();
        const promise = (this.setTreeInputPromise = this.tree
            .setInput(input, viewState)
            .then(async () => {
            if (Array.isArray(input)) {
                if (!viewState || previousInput instanceof ExplorerItem) {
                    // There is no view state for this workspace (we transitioned from a folder workspace?), expand up to five roots.
                    // If there are many roots in a workspace, expanding them all would can cause performance issues #176226
                    for (let i = 0; i < Math.min(input.length, 5); i++) {
                        try {
                            await this.tree.expand(input[i]);
                        }
                        catch (e) { }
                    }
                }
                // Reloaded or transitioned from an empty workspace, but only have a single folder in the workspace.
                if (!previousInput &&
                    input.length === 1 &&
                    this.configurationService.getValue().explorer
                        .expandSingleFolderWorkspaces) {
                    await this.tree.expand(input[0]).catch(() => { });
                }
                if (Array.isArray(previousInput)) {
                    const previousRoots = new ResourceMap();
                    previousInput.forEach((previousRoot) => previousRoots.set(previousRoot.resource, true));
                    // Roots added to the explorer -> expand them.
                    await Promise.all(input.map(async (item) => {
                        if (!previousRoots.has(item.resource)) {
                            try {
                                await this.tree.expand(item);
                            }
                            catch (e) { }
                        }
                    }));
                }
            }
            if (initialInputSetup) {
                perf.mark('code/didResolveExplorer');
            }
        }));
        this.progressService.withProgress({
            location: 1 /* ProgressLocation.Explorer */,
            delay: this.layoutService.isRestored() ? 800 : 1500, // reduce progress visibility when still restoring
        }, (_progress) => promise);
        await promise;
        if (!this.decorationsProvider) {
            this.decorationsProvider = new ExplorerDecorationsProvider(this.explorerService, this.contextService);
            this._register(this.decorationService.registerDecorationsProvider(this.decorationsProvider));
        }
    }
    async selectResource(resource, reveal = this._autoReveal, retry = 0) {
        // do no retry more than once to prevent infinite loops in cases of inconsistent model
        if (retry === 2) {
            return;
        }
        if (!resource || !this.isBodyVisible()) {
            return;
        }
        // If something is refreshing the explorer, we must await it or else a selection race condition can occur
        if (this.setTreeInputPromise) {
            await this.setTreeInputPromise;
        }
        // Expand all stats in the parent chain.
        let item = this.explorerService.findClosestRoot(resource);
        while (item && item.resource.toString() !== resource.toString()) {
            try {
                await this.tree.expand(item);
            }
            catch (e) {
                return this.selectResource(resource, reveal, retry + 1);
            }
            if (!item.children.size) {
                item = null;
            }
            else {
                for (const child of item.children.values()) {
                    if (this.uriIdentityService.extUri.isEqualOrParent(resource, child.resource)) {
                        item = child;
                        break;
                    }
                    item = null;
                }
            }
        }
        if (item) {
            if (item === this.tree.getInput()) {
                this.tree.setFocus([]);
                this.tree.setSelection([]);
                return;
            }
            try {
                // We must expand the nest to have it be populated in the tree
                if (item.nestedParent) {
                    await this.tree.expand(item.nestedParent);
                }
                if ((reveal === true || reveal === 'force') && this.tree.getRelativeTop(item) === null) {
                    // Don't scroll to the item if it's already visible, or if set not to.
                    this.tree.reveal(item, 0.5);
                }
                this.tree.setFocus([item]);
                this.tree.setSelection([item]);
            }
            catch (e) {
                // Element might not be in the tree, try again and silently fail
                return this.selectResource(resource, reveal, retry + 1);
            }
        }
    }
    itemsCopied(stats, cut, previousCut) {
        this.fileCopiedContextKey.set(stats.length > 0);
        this.resourceCutContextKey.set(cut && stats.length > 0);
        previousCut?.forEach((item) => this.tree.rerender(item));
        if (cut) {
            stats.forEach((s) => this.tree.rerender(s));
        }
    }
    expandAll() {
        if (this.explorerService.isEditable(undefined)) {
            this.tree.domFocus();
        }
        this.tree.expandAll();
    }
    collapseAll() {
        if (this.explorerService.isEditable(undefined)) {
            this.tree.domFocus();
        }
        const treeInput = this.tree.getInput();
        if (Array.isArray(treeInput)) {
            if (hasExpandedRootChild(this.tree, treeInput)) {
                treeInput.forEach((folder) => {
                    folder.children.forEach((child) => this.tree.hasNode(child) && this.tree.collapse(child, true));
                });
                return;
            }
        }
        this.tree.collapseAll();
    }
    previousCompressedStat() {
        const focused = this.tree.getFocus();
        if (!focused.length) {
            return;
        }
        const compressedNavigationControllers = this.renderer.getCompressedNavigationController(focused[0]);
        compressedNavigationControllers.forEach((controller) => {
            controller.previous();
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    nextCompressedStat() {
        const focused = this.tree.getFocus();
        if (!focused.length) {
            return;
        }
        const compressedNavigationControllers = this.renderer.getCompressedNavigationController(focused[0]);
        compressedNavigationControllers.forEach((controller) => {
            controller.next();
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    firstCompressedStat() {
        const focused = this.tree.getFocus();
        if (!focused.length) {
            return;
        }
        const compressedNavigationControllers = this.renderer.getCompressedNavigationController(focused[0]);
        compressedNavigationControllers.forEach((controller) => {
            controller.first();
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    lastCompressedStat() {
        const focused = this.tree.getFocus();
        if (!focused.length) {
            return;
        }
        const compressedNavigationControllers = this.renderer.getCompressedNavigationController(focused[0]);
        compressedNavigationControllers.forEach((controller) => {
            controller.last();
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    updateCompressedNavigationContextKeys(controller) {
        this.compressedFocusFirstContext.set(controller.index === 0);
        this.compressedFocusLastContext.set(controller.index === controller.count - 1);
    }
    updateAnyCollapsedContext() {
        const treeInput = this.tree.getInput();
        if (treeInput === undefined) {
            return;
        }
        const treeInputArray = Array.isArray(treeInput)
            ? treeInput
            : Array.from(treeInput.children.values());
        // Has collapsible root when anything is expanded
        this.viewHasSomeCollapsibleRootItem.set(hasExpandedNode(this.tree, treeInputArray));
        // synchronize state to cache
        this.storeTreeViewState();
    }
    hasPhantomElements() {
        return !!this.findProvider?.isShowingFilterResults();
    }
    dispose() {
        this.dragHandler?.dispose();
        super.dispose();
    }
};
__decorate([
    memoize
], ExplorerView.prototype, "fileCopiedContextKey", null);
__decorate([
    memoize
], ExplorerView.prototype, "resourceCutContextKey", null);
ExplorerView = ExplorerView_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IViewDescriptorService),
    __param(3, IInstantiationService),
    __param(4, IWorkspaceContextService),
    __param(5, IProgressService),
    __param(6, IEditorService),
    __param(7, IEditorResolverService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IKeybindingService),
    __param(10, IContextKeyService),
    __param(11, IConfigurationService),
    __param(12, IDecorationsService),
    __param(13, ILabelService),
    __param(14, IThemeService),
    __param(15, ITelemetryService),
    __param(16, IHoverService),
    __param(17, IExplorerService),
    __param(18, IStorageService),
    __param(19, IClipboardService),
    __param(20, IFileService),
    __param(21, IUriIdentityService),
    __param(22, ICommandService),
    __param(23, IOpenerService)
], ExplorerView);
export { ExplorerView };
export function createFileIconThemableTreeContainerScope(container, themeService) {
    container.classList.add('file-icon-themable-tree');
    container.classList.add('show-file-icons');
    const onDidChangeFileIconTheme = (theme) => {
        container.classList.toggle('align-icons-and-twisties', theme.hasFileIcons && !theme.hasFolderIcons);
        container.classList.toggle('hide-arrows', theme.hidesExplorerArrows === true);
    };
    onDidChangeFileIconTheme(themeService.getFileIconTheme());
    return themeService.onDidFileIconThemeChange(onDidChangeFileIconTheme);
}
const CanCreateContext = ContextKeyExpr.or(
// Folder: can create unless readonly
ContextKeyExpr.and(ExplorerFolderContext, ExplorerResourceWritableContext), 
// File: can create unless parent is readonly
ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ExplorerResourceParentReadOnlyContext.toNegated()));
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.files.action.createFileFromExplorer',
            title: nls.localize('createNewFile', 'New File...'),
            f1: false,
            icon: Codicon.newFile,
            precondition: CanCreateContext,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VIEW_ID),
                order: 10,
            },
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand(NEW_FILE_COMMAND_ID);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.files.action.createFolderFromExplorer',
            title: nls.localize('createNewFolder', 'New Folder...'),
            f1: false,
            icon: Codicon.newFolder,
            precondition: CanCreateContext,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VIEW_ID),
                order: 20,
            },
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand(NEW_FOLDER_COMMAND_ID);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.files.action.refreshFilesExplorer',
            title: nls.localize2('refreshExplorer', 'Refresh Explorer'),
            f1: true,
            icon: Codicon.refresh,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VIEW_ID),
                order: 30,
            },
            metadata: {
                description: nls.localize2('refreshExplorerMetadata', 'Forces a refresh of the Explorer.'),
            },
            precondition: ExplorerFindProviderActive.negate(),
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const explorerService = accessor.get(IExplorerService);
        await viewsService.openView(VIEW_ID);
        await explorerService.refresh();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.files.action.collapseExplorerFolders',
            title: nls.localize2('collapseExplorerFolders', 'Collapse Folders in Explorer'),
            f1: true,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VIEW_ID),
                order: 40,
            },
            metadata: {
                description: nls.localize2('collapseExplorerFoldersMetadata', 'Folds all folders in the Explorer.'),
            },
        });
    }
    run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = viewsService.getViewWithId(VIEW_ID);
        if (view !== null) {
            const explorerView = view;
            explorerView.collapseAll();
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL3ZpZXdzL2V4cGxvcmVyVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUU1QyxPQUFPLEtBQUssSUFBSSxNQUFNLDJDQUEyQyxDQUFBO0FBS2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRSxPQUFPLEVBRU4scUJBQXFCLEVBQ3JCLDJCQUEyQixFQUMzQixzQkFBc0IsRUFDdEIsbUJBQW1CLEVBQ25CLCtCQUErQixFQUMvQixtQkFBbUIsRUFDbkIsK0JBQStCLEVBQy9CLDhCQUE4QixFQUM5QixtQ0FBbUMsRUFDbkMsa0NBQWtDLEVBQ2xDLHlDQUF5QyxFQUN6QyxPQUFPLEVBQ1AsK0JBQStCLEVBQy9CLHFDQUFxQyxFQUNyQyx5QkFBeUIsRUFDekIscUNBQXFDLEVBQ3JDLDBCQUEwQixHQUMxQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2pHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUUsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JB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