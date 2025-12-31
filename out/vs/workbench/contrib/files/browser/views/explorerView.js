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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci92aWV3cy9leHBsb3JlclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFFNUMsT0FBTyxLQUFLLElBQUksTUFBTSwyQ0FBMkMsQ0FBQTtBQUtqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUVOLHFCQUFxQixFQUNyQiwyQkFBMkIsRUFDM0Isc0JBQXNCLEVBQ3RCLG1CQUFtQixFQUNuQiwrQkFBK0IsRUFDL0IsbUJBQW1CLEVBQ25CLCtCQUErQixFQUMvQiw4QkFBOEIsRUFDOUIsbUNBQW1DLEVBQ25DLGtDQUFrQyxFQUNsQyx5Q0FBeUMsRUFDekMsT0FBTyxFQUNQLCtCQUErQixFQUMvQixxQ0FBcUMsRUFDckMseUJBQXlCLEVBQ3pCLHFDQUFxQyxFQUNyQywwQkFBMEIsR0FDMUIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNqRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlFLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixF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