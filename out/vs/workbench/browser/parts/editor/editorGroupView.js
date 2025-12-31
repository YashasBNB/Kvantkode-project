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
var EditorGroupView_1;
import './media/editorgroupview.css';
import { EditorGroupModel, isGroupEditorCloseEvent, isGroupEditorOpenEvent, isSerializedEditorGroupModel, } from '../../../common/editor/editorGroupModel.js';
import { EditorResourceAccessor, DEFAULT_EDITOR_ASSOCIATION, SideBySideEditor, EditorCloseContext, TEXT_DIFF_EDITOR_ID, } from '../../../common/editor.js';
import { ActiveEditorGroupLockedContext, ActiveEditorDirtyContext, EditorGroupEditorsCountContext, ActiveEditorStickyContext, ActiveEditorPinnedContext, ActiveEditorLastInGroupContext, ActiveEditorFirstInGroupContext, ResourceContextKey, applyAvailableEditorIds, ActiveEditorAvailableEditorIdsContext, ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext, TextCompareEditorVisibleContext, TextCompareEditorActiveContext, ActiveEditorContext, ActiveEditorReadonlyContext, ActiveEditorCanRevertContext, ActiveEditorCanToggleReadonlyContext, ActiveCompareEditorCanSwapContext, MultipleEditorsSelectedInGroupContext, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey, } from '../../../common/contextkeys.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { Emitter, Relay } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Dimension, trackFocus, addDisposableListener, EventType, EventHelper, findParentWithClass, isAncestor, isMouseEvent, isActiveElement, getWindow, getActiveElement, $, } from '../../../../base/browser/dom.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { editorBackground, contrastBorder, } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_GROUP_HEADER_TABS_BACKGROUND, EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND, EDITOR_GROUP_EMPTY_BACKGROUND, EDITOR_GROUP_HEADER_BORDER, } from '../../../common/theme.js';
import { EditorPanes } from './editorPanes.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { EditorProgressIndicator } from '../../../services/progress/browser/progressIndicator.js';
import { localize } from '../../../../nls.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DeferredPromise, Promises, RunOnceWorker } from '../../../../base/common/async.js';
import { EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { fillActiveEditorViewState, } from './editor.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { getActionBarActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { hash } from '../../../../base/common/hash.js';
import { getMimeTypes } from '../../../../editor/common/services/languagesAssociations.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { IFileDialogService, IDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { IFilesConfigurationService, } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { URI } from '../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isLinux, isMacintosh, isNative, isWindows } from '../../../../base/common/platform.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { defaultProgressBarStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { EditorGroupWatermark } from './editorGroupWatermark.js';
import { EditorTitleControl } from './editorTitleControl.js';
import { EditorPane } from './editorPane.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
let EditorGroupView = EditorGroupView_1 = class EditorGroupView extends Themable {
    //#region factory
    static createNew(editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, null, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    static createFromSerialized(serialized, editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, serialized, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    static createCopy(copyFrom, editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, copyFrom, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    constructor(from, editorPartsView, groupsView, groupsLabel, _index, options, instantiationService, contextKeyService, themeService, telemetryService, keybindingService, menuService, contextMenuService, fileDialogService, editorService, filesConfigurationService, uriIdentityService, logService, editorResolverService, hostService, dialogService, fileService) {
        super(themeService);
        this.editorPartsView = editorPartsView;
        this.groupsView = groupsView;
        this.groupsLabel = groupsLabel;
        this._index = _index;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.telemetryService = telemetryService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextMenuService = contextMenuService;
        this.fileDialogService = fileDialogService;
        this.editorService = editorService;
        this.filesConfigurationService = filesConfigurationService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.editorResolverService = editorResolverService;
        this.hostService = hostService;
        this.dialogService = dialogService;
        this.fileService = fileService;
        //#region events
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._onDidModelChange = this._register(new Emitter());
        this.onDidModelChange = this._onDidModelChange.event;
        this._onDidActiveEditorChange = this._register(new Emitter());
        this.onDidActiveEditorChange = this._onDidActiveEditorChange.event;
        this._onDidOpenEditorFail = this._register(new Emitter());
        this.onDidOpenEditorFail = this._onDidOpenEditorFail.event;
        this._onWillCloseEditor = this._register(new Emitter());
        this.onWillCloseEditor = this._onWillCloseEditor.event;
        this._onDidCloseEditor = this._register(new Emitter());
        this.onDidCloseEditor = this._onDidCloseEditor.event;
        this._onWillMoveEditor = this._register(new Emitter());
        this.onWillMoveEditor = this._onWillMoveEditor.event;
        this._onWillOpenEditor = this._register(new Emitter());
        this.onWillOpenEditor = this._onWillOpenEditor.event;
        this.disposedEditorsWorker = this._register(new RunOnceWorker((editors) => this.handleDisposedEditors(editors), 0));
        this.mapEditorToPendingConfirmation = new Map();
        this.containerToolBarMenuDisposable = this._register(new MutableDisposable());
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this._disposed = false;
        //#endregion
        //#region ISerializableView
        this.element = $('div');
        this._onDidChange = this._register(new Relay());
        this.onDidChange = this._onDidChange.event;
        if (from instanceof EditorGroupView_1) {
            this.model = this._register(from.model.clone());
        }
        else if (isSerializedEditorGroupModel(from)) {
            this.model = this._register(instantiationService.createInstance(EditorGroupModel, from));
        }
        else {
            this.model = this._register(instantiationService.createInstance(EditorGroupModel, undefined));
        }
        //#region create()
        {
            // Scoped context key service
            this.scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
            // Container
            this.element.classList.add(...coalesce(['editor-group-container', this.model.isLocked ? 'locked' : undefined]));
            // Container listeners
            this.registerContainerListeners();
            // Container toolbar
            this.createContainerToolbar();
            // Container context menu
            this.createContainerContextMenu();
            // Watermark & shortcuts
            this._register(this.instantiationService.createInstance(EditorGroupWatermark, this.element));
            // Progress bar
            this.progressBar = this._register(new ProgressBar(this.element, defaultProgressBarStyles));
            this.progressBar.hide();
            // Scoped instantiation service
            this.scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService], [
                IEditorProgressService,
                this._register(new EditorProgressIndicator(this.progressBar, this)),
            ])));
            // Context keys
            this.resourceContext = this._register(this.scopedInstantiationService.createInstance(ResourceContextKey));
            this.handleGroupContextKeys();
            // Title container
            this.titleContainer = $('.title');
            this.element.appendChild(this.titleContainer);
            // Title control
            this.titleControl = this._register(this.scopedInstantiationService.createInstance(EditorTitleControl, this.titleContainer, this.editorPartsView, this.groupsView, this, this.model));
            // Editor container
            this.editorContainer = $('.editor-container');
            this.element.appendChild(this.editorContainer);
            // Editor pane
            this.editorPane = this._register(this.scopedInstantiationService.createInstance(EditorPanes, this.element, this.editorContainer, this));
            this._onDidChange.input = this.editorPane.onDidChangeSizeConstraints;
            // Track Focus
            this.doTrackFocus();
            // Update containers
            this.updateTitleContainer();
            this.updateContainer();
            // Update styles
            this.updateStyles();
        }
        //#endregion
        // Restore editors if provided
        const restoreEditorsPromise = this.restoreEditors(from, options) ?? Promise.resolve();
        // Signal restored once editors have restored
        restoreEditorsPromise.finally(() => {
            this.whenRestoredPromise.complete();
        });
        // Register Listeners
        this.registerListeners();
    }
    handleGroupContextKeys() {
        const groupActiveEditorDirtyContext = this.editorPartsView.bind(ActiveEditorDirtyContext, this);
        const groupActiveEditorPinnedContext = this.editorPartsView.bind(ActiveEditorPinnedContext, this);
        const groupActiveEditorFirstContext = this.editorPartsView.bind(ActiveEditorFirstInGroupContext, this);
        const groupActiveEditorLastContext = this.editorPartsView.bind(ActiveEditorLastInGroupContext, this);
        const groupActiveEditorStickyContext = this.editorPartsView.bind(ActiveEditorStickyContext, this);
        const groupEditorsCountContext = this.editorPartsView.bind(EditorGroupEditorsCountContext, this);
        const groupLockedContext = this.editorPartsView.bind(ActiveEditorGroupLockedContext, this);
        const multipleEditorsSelectedContext = MultipleEditorsSelectedInGroupContext.bindTo(this.scopedContextKeyService);
        const twoEditorsSelectedContext = TwoEditorsSelectedInGroupContext.bindTo(this.scopedContextKeyService);
        const selectedEditorsHaveFileOrUntitledResourceContext = SelectedEditorsInGroupFileOrUntitledResourceContextKey.bindTo(this.scopedContextKeyService);
        const groupActiveEditorContext = this.editorPartsView.bind(ActiveEditorContext, this);
        const groupActiveEditorIsReadonly = this.editorPartsView.bind(ActiveEditorReadonlyContext, this);
        const groupActiveEditorCanRevert = this.editorPartsView.bind(ActiveEditorCanRevertContext, this);
        const groupActiveEditorCanToggleReadonly = this.editorPartsView.bind(ActiveEditorCanToggleReadonlyContext, this);
        const groupActiveCompareEditorCanSwap = this.editorPartsView.bind(ActiveCompareEditorCanSwapContext, this);
        const groupTextCompareEditorVisibleContext = this.editorPartsView.bind(TextCompareEditorVisibleContext, this);
        const groupTextCompareEditorActiveContext = this.editorPartsView.bind(TextCompareEditorActiveContext, this);
        const groupActiveEditorAvailableEditorIds = this.editorPartsView.bind(ActiveEditorAvailableEditorIdsContext, this);
        const groupActiveEditorCanSplitInGroupContext = this.editorPartsView.bind(ActiveEditorCanSplitInGroupContext, this);
        const groupActiveEditorIsSideBySideEditorContext = this.editorPartsView.bind(SideBySideEditorActiveContext, this);
        const activeEditorListener = this._register(new MutableDisposable());
        const observeActiveEditor = () => {
            activeEditorListener.clear();
            this.scopedContextKeyService.bufferChangeEvents(() => {
                const activeEditor = this.activeEditor;
                const activeEditorPane = this.activeEditorPane;
                this.resourceContext.set(EditorResourceAccessor.getOriginalUri(activeEditor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                }));
                applyAvailableEditorIds(groupActiveEditorAvailableEditorIds, activeEditor, this.editorResolverService);
                if (activeEditor) {
                    groupActiveEditorCanSplitInGroupContext.set(activeEditor.hasCapability(32 /* EditorInputCapabilities.CanSplitInGroup */));
                    groupActiveEditorIsSideBySideEditorContext.set(activeEditor.typeId === SideBySideEditorInput.ID);
                    groupActiveEditorDirtyContext.set(activeEditor.isDirty() && !activeEditor.isSaving());
                    activeEditorListener.value = activeEditor.onDidChangeDirty(() => {
                        groupActiveEditorDirtyContext.set(activeEditor.isDirty() && !activeEditor.isSaving());
                    });
                }
                else {
                    groupActiveEditorCanSplitInGroupContext.set(false);
                    groupActiveEditorIsSideBySideEditorContext.set(false);
                    groupActiveEditorDirtyContext.set(false);
                }
                if (activeEditorPane) {
                    groupActiveEditorContext.set(activeEditorPane.getId());
                    groupActiveEditorCanRevert.set(!activeEditorPane.input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
                    groupActiveEditorIsReadonly.set(!!activeEditorPane.input.isReadonly());
                    const primaryEditorResource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.PRIMARY });
                    const secondaryEditorResource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.SECONDARY });
                    groupActiveCompareEditorCanSwap.set(activeEditorPane.input instanceof DiffEditorInput &&
                        !activeEditorPane.input.original.isReadonly() &&
                        !!primaryEditorResource &&
                        (this.fileService.hasProvider(primaryEditorResource) ||
                            primaryEditorResource.scheme === Schemas.untitled) &&
                        !!secondaryEditorResource &&
                        (this.fileService.hasProvider(secondaryEditorResource) ||
                            secondaryEditorResource.scheme === Schemas.untitled));
                    groupActiveEditorCanToggleReadonly.set(!!primaryEditorResource &&
                        this.fileService.hasProvider(primaryEditorResource) &&
                        !this.fileService.hasCapability(primaryEditorResource, 2048 /* FileSystemProviderCapabilities.Readonly */));
                    const activePaneDiffEditor = activeEditorPane?.getId() === TEXT_DIFF_EDITOR_ID;
                    groupTextCompareEditorActiveContext.set(activePaneDiffEditor);
                    groupTextCompareEditorVisibleContext.set(activePaneDiffEditor);
                }
                else {
                    groupActiveEditorContext.reset();
                    groupActiveEditorCanRevert.reset();
                    groupActiveEditorIsReadonly.reset();
                    groupActiveCompareEditorCanSwap.reset();
                    groupActiveEditorCanToggleReadonly.reset();
                }
            });
        };
        // Update group contexts based on group changes
        const updateGroupContextKeys = (e) => {
            switch (e.kind) {
                case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                    groupLockedContext.set(this.isLocked);
                    break;
                case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                    groupActiveEditorFirstContext.set(this.model.isFirst(this.model.activeEditor));
                    groupActiveEditorLastContext.set(this.model.isLast(this.model.activeEditor));
                    groupActiveEditorPinnedContext.set(this.model.activeEditor ? this.model.isPinned(this.model.activeEditor) : false);
                    groupActiveEditorStickyContext.set(this.model.activeEditor ? this.model.isSticky(this.model.activeEditor) : false);
                    break;
                case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                    groupActiveEditorPinnedContext.set(this.model.activeEditor ? this.model.isPinned(this.model.activeEditor) : false);
                    groupActiveEditorStickyContext.set(this.model.activeEditor ? this.model.isSticky(this.model.activeEditor) : false);
                case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                    groupActiveEditorFirstContext.set(this.model.isFirst(this.model.activeEditor));
                    groupActiveEditorLastContext.set(this.model.isLast(this.model.activeEditor));
                    break;
                case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                    if (e.editor && e.editor === this.model.activeEditor) {
                        groupActiveEditorPinnedContext.set(this.model.isPinned(this.model.activeEditor));
                    }
                    break;
                case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                    if (e.editor && e.editor === this.model.activeEditor) {
                        groupActiveEditorStickyContext.set(this.model.isSticky(this.model.activeEditor));
                    }
                    break;
                case 4 /* GroupModelChangeKind.EDITORS_SELECTION */:
                    multipleEditorsSelectedContext.set(this.model.selectedEditors.length > 1);
                    twoEditorsSelectedContext.set(this.model.selectedEditors.length === 2);
                    selectedEditorsHaveFileOrUntitledResourceContext.set(this.model.selectedEditors.every((e) => e.resource &&
                        (this.fileService.hasProvider(e.resource) ||
                            e.resource.scheme === Schemas.untitled)));
                    break;
            }
            // Group editors count context
            groupEditorsCountContext.set(this.count);
        };
        this._register(this.onDidModelChange((e) => updateGroupContextKeys(e)));
        // Track the active editor and update context key that reflects
        // the dirty state of this editor
        this._register(this.onDidActiveEditorChange(() => observeActiveEditor()));
        // Update context keys on startup
        observeActiveEditor();
        updateGroupContextKeys({ kind: 8 /* GroupModelChangeKind.EDITOR_ACTIVE */ });
        updateGroupContextKeys({ kind: 3 /* GroupModelChangeKind.GROUP_LOCKED */ });
    }
    registerContainerListeners() {
        // Open new file via doubleclick on empty container
        this._register(addDisposableListener(this.element, EventType.DBLCLICK, (e) => {
            if (this.isEmpty) {
                EventHelper.stop(e);
                this.editorService.openEditor({
                    resource: undefined,
                    options: {
                        pinned: true,
                        override: DEFAULT_EDITOR_ASSOCIATION.id,
                    },
                }, this.id);
            }
        }));
        // Close empty editor group via middle mouse click
        this._register(addDisposableListener(this.element, EventType.AUXCLICK, (e) => {
            if (this.isEmpty && e.button === 1 /* Middle Button */) {
                EventHelper.stop(e, true);
                this.groupsView.removeGroup(this);
            }
        }));
    }
    createContainerToolbar() {
        // Toolbar Container
        const toolbarContainer = $('.editor-group-container-toolbar');
        this.element.appendChild(toolbarContainer);
        // Toolbar
        const containerToolbar = this._register(new ActionBar(toolbarContainer, {
            ariaLabel: localize('ariaLabelGroupActions', 'Empty editor group actions'),
            highlightToggledItems: true,
        }));
        // Toolbar actions
        const containerToolbarMenu = this._register(this.menuService.createMenu(MenuId.EmptyEditorGroup, this.scopedContextKeyService));
        const updateContainerToolbar = () => {
            // Clear old actions
            this.containerToolBarMenuDisposable.value = toDisposable(() => containerToolbar.clear());
            // Create new actions
            const actions = getActionBarActions(containerToolbarMenu.getActions({ arg: { groupId: this.id }, shouldForwardArgs: true }), 'navigation');
            for (const action of [...actions.primary, ...actions.secondary]) {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                containerToolbar.push(action, {
                    icon: true,
                    label: false,
                    keybinding: keybinding?.getLabel(),
                });
            }
        };
        updateContainerToolbar();
        this._register(containerToolbarMenu.onDidChange(updateContainerToolbar));
    }
    createContainerContextMenu() {
        this._register(addDisposableListener(this.element, EventType.CONTEXT_MENU, (e) => this.onShowContainerContextMenu(e)));
        this._register(addDisposableListener(this.element, TouchEventType.Contextmenu, () => this.onShowContainerContextMenu()));
    }
    onShowContainerContextMenu(e) {
        if (!this.isEmpty) {
            return; // only for empty editor groups
        }
        // Find target anchor
        let anchor = this.element;
        if (e) {
            anchor = new StandardMouseEvent(getWindow(this.element), e);
        }
        // Show it
        this.contextMenuService.showContextMenu({
            menuId: MenuId.EmptyEditorGroupContext,
            contextKeyService: this.contextKeyService,
            getAnchor: () => anchor,
            onHide: () => this.focus(),
        });
    }
    doTrackFocus() {
        // Container
        const containerFocusTracker = this._register(trackFocus(this.element));
        this._register(containerFocusTracker.onDidFocus(() => {
            if (this.isEmpty) {
                this._onDidFocus.fire(); // only when empty to prevent duplicate events from `editorPane.onDidFocus`
            }
        }));
        // Title Container
        const handleTitleClickOrTouch = (e) => {
            let target;
            if (isMouseEvent(e)) {
                if (e.button !== 0 /* middle/right mouse button */ ||
                    (isMacintosh && e.ctrlKey) /* macOS context menu */) {
                    return undefined;
                }
                target = e.target;
            }
            else {
                target = e.initialTarget;
            }
            if (findParentWithClass(target, 'monaco-action-bar', this.titleContainer) ||
                findParentWithClass(target, 'monaco-breadcrumb-item', this.titleContainer)) {
                return; // not when clicking on actions or breadcrumbs
            }
            // timeout to keep focus in editor after mouse up
            setTimeout(() => {
                this.focus();
            });
        };
        this._register(addDisposableListener(this.titleContainer, EventType.MOUSE_DOWN, (e) => handleTitleClickOrTouch(e)));
        this._register(addDisposableListener(this.titleContainer, TouchEventType.Tap, (e) => handleTitleClickOrTouch(e)));
        // Editor pane
        this._register(this.editorPane.onDidFocus(() => {
            this._onDidFocus.fire();
        }));
    }
    updateContainer() {
        // Empty Container: add some empty container attributes
        if (this.isEmpty) {
            this.element.classList.add('empty');
            this.element.tabIndex = 0;
            this.element.setAttribute('aria-label', localize('emptyEditorGroup', '{0} (empty)', this.ariaLabel));
        }
        // Non-Empty Container: revert empty container attributes
        else {
            this.element.classList.remove('empty');
            this.element.removeAttribute('tabIndex');
            this.element.removeAttribute('aria-label');
        }
        // Update styles
        this.updateStyles();
    }
    updateTitleContainer() {
        this.titleContainer.classList.toggle('tabs', this.groupsView.partOptions.showTabs === 'multiple');
        this.titleContainer.classList.toggle('show-file-icons', this.groupsView.partOptions.showIcons);
    }
    restoreEditors(from, groupViewOptions) {
        if (this.count === 0) {
            return; // nothing to show
        }
        // Determine editor options
        let options;
        if (from instanceof EditorGroupView_1) {
            options = fillActiveEditorViewState(from); // if we copy from another group, ensure to copy its active editor viewstate
        }
        else {
            options = Object.create(null);
        }
        const activeEditor = this.model.activeEditor;
        if (!activeEditor) {
            return;
        }
        options.pinned = this.model.isPinned(activeEditor); // preserve pinned state
        options.sticky = this.model.isSticky(activeEditor); // preserve sticky state
        options.preserveFocus = true; // handle focus after editor is restored
        const internalOptions = {
            preserveWindowOrder: true, // handle window order after editor is restored
            skipTitleUpdate: true, // update the title later for all editors at once
        };
        const activeElement = getActiveElement();
        // Show active editor (intentionally not using async to keep
        // `restoreEditors` from executing in same stack)
        const result = this.doShowEditor(activeEditor, { active: true, isNew: false /* restored */ }, options, internalOptions).then(() => {
            // Set focused now if this is the active group and focus has
            // not changed meanwhile. This prevents focus from being
            // stolen accidentally on startup when the user already
            // clicked somewhere.
            if (this.groupsView.activeGroup === this &&
                activeElement &&
                isActiveElement(activeElement) &&
                !groupViewOptions?.preserveFocus) {
                this.focus();
            }
        });
        // Restore editors in title control
        this.titleControl.openEditors(this.editors);
        return result;
    }
    //#region event handling
    registerListeners() {
        // Model Events
        this._register(this.model.onDidModelChange((e) => this.onDidGroupModelChange(e)));
        // Option Changes
        this._register(this.groupsView.onDidChangeEditorPartOptions((e) => this.onDidChangeEditorPartOptions(e)));
        // Visibility
        this._register(this.groupsView.onDidVisibilityChange((e) => this.onDidVisibilityChange(e)));
        // Focus
        this._register(this.onDidFocus(() => this.onDidGainFocus()));
    }
    onDidGroupModelChange(e) {
        // Re-emit to outside
        this._onDidModelChange.fire(e);
        // Handle within
        switch (e.kind) {
            case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                this.element.classList.toggle('locked', this.isLocked);
                break;
            case 4 /* GroupModelChangeKind.EDITORS_SELECTION */:
                this.onDidChangeEditorSelection();
                break;
        }
        if (!e.editor) {
            return;
        }
        switch (e.kind) {
            case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                if (isGroupEditorOpenEvent(e)) {
                    this.onDidOpenEditor(e.editor, e.editorIndex);
                }
                break;
            case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                if (isGroupEditorCloseEvent(e)) {
                    this.handleOnDidCloseEditor(e.editor, e.editorIndex, e.context, e.sticky);
                }
                break;
            case 15 /* GroupModelChangeKind.EDITOR_WILL_DISPOSE */:
                this.onWillDisposeEditor(e.editor);
                break;
            case 14 /* GroupModelChangeKind.EDITOR_DIRTY */:
                this.onDidChangeEditorDirty(e.editor);
                break;
            case 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */:
                this.onDidChangeEditorTransient(e.editor);
                break;
            case 9 /* GroupModelChangeKind.EDITOR_LABEL */:
                this.onDidChangeEditorLabel(e.editor);
                break;
        }
    }
    onDidOpenEditor(editor, editorIndex) {
        /* __GDPR__
            "editorOpened" : {
                "owner": "isidorn",
                "${include}": [
                    "${EditorTelemetryDescriptor}"
                ]
            }
        */
        this.telemetryService.publicLog('editorOpened', this.toEditorTelemetryDescriptor(editor));
        // Update container
        this.updateContainer();
    }
    handleOnDidCloseEditor(editor, editorIndex, context, sticky) {
        // Before close
        this._onWillCloseEditor.fire({ groupId: this.id, editor, context, index: editorIndex, sticky });
        // Handle event
        const editorsToClose = [editor];
        // Include both sides of side by side editors when being closed
        if (editor instanceof SideBySideEditorInput) {
            editorsToClose.push(editor.primary, editor.secondary);
        }
        // For each editor to close, we call dispose() to free up any resources.
        // However, certain editors might be shared across multiple editor groups
        // (including being visible in side by side / diff editors) and as such we
        // only dispose when they are not opened elsewhere.
        for (const editor of editorsToClose) {
            if (this.canDispose(editor)) {
                editor.dispose();
            }
        }
        // Update container
        this.updateContainer();
        // Event
        this._onDidCloseEditor.fire({ groupId: this.id, editor, context, index: editorIndex, sticky });
    }
    canDispose(editor) {
        for (const groupView of this.editorPartsView.groups) {
            if (groupView instanceof EditorGroupView_1 &&
                groupView.model.contains(editor, {
                    strictEquals: true, // only if this input is not shared across editor groups
                    supportSideBySide: SideBySideEditor.ANY, // include any side of an opened side by side editor
                })) {
                return false;
            }
        }
        return true;
    }
    toResourceTelemetryDescriptor(resource) {
        if (!resource) {
            return undefined;
        }
        const path = resource
            ? resource.scheme === Schemas.file
                ? resource.fsPath
                : resource.path
            : undefined;
        if (!path) {
            return undefined;
        }
        // Remove query parameters from the resource extension
        let resourceExt = extname(resource);
        const queryStringLocation = resourceExt.indexOf('?');
        resourceExt =
            queryStringLocation !== -1 ? resourceExt.substr(0, queryStringLocation) : resourceExt;
        return {
            mimeType: new TelemetryTrustedValue(getMimeTypes(resource).join(', ')),
            scheme: resource.scheme,
            ext: resourceExt,
            path: hash(path),
        };
    }
    toEditorTelemetryDescriptor(editor) {
        const descriptor = editor.getTelemetryDescriptor();
        const resource = EditorResourceAccessor.getOriginalUri(editor, {
            supportSideBySide: SideBySideEditor.BOTH,
        });
        if (URI.isUri(resource)) {
            descriptor['resource'] = this.toResourceTelemetryDescriptor(resource);
            /* __GDPR__FRAGMENT__
                "EditorTelemetryDescriptor" : {
                    "resource": { "${inline}": [ "${URIDescriptor}" ] }
                }
            */
            return descriptor;
        }
        else if (resource) {
            if (resource.primary) {
                descriptor['resource'] = this.toResourceTelemetryDescriptor(resource.primary);
            }
            if (resource.secondary) {
                descriptor['resourceSecondary'] = this.toResourceTelemetryDescriptor(resource.secondary);
            }
            /* __GDPR__FRAGMENT__
                "EditorTelemetryDescriptor" : {
                    "resource": { "${inline}": [ "${URIDescriptor}" ] },
                    "resourceSecondary": { "${inline}": [ "${URIDescriptor}" ] }
                }
            */
            return descriptor;
        }
        return descriptor;
    }
    onWillDisposeEditor(editor) {
        // To prevent race conditions, we handle disposed editors in our worker with a timeout
        // because it can happen that an input is being disposed with the intent to replace
        // it with some other input right after.
        this.disposedEditorsWorker.work(editor);
    }
    handleDisposedEditors(disposedEditors) {
        // Split between visible and hidden editors
        let activeEditor;
        const inactiveEditors = [];
        for (const disposedEditor of disposedEditors) {
            const editorFindResult = this.model.findEditor(disposedEditor);
            if (!editorFindResult) {
                continue; // not part of the model anymore
            }
            const editor = editorFindResult[0];
            if (!editor.isDisposed()) {
                continue; // editor got reopened meanwhile
            }
            if (this.model.isActive(editor)) {
                activeEditor = editor;
            }
            else {
                inactiveEditors.push(editor);
            }
        }
        // Close all inactive editors first to prevent UI flicker
        for (const inactiveEditor of inactiveEditors) {
            this.doCloseEditor(inactiveEditor, true);
        }
        // Close active one last
        if (activeEditor) {
            this.doCloseEditor(activeEditor, true);
        }
    }
    onDidChangeEditorPartOptions(event) {
        // Title container
        this.updateTitleContainer();
        // Title control
        this.titleControl.updateOptions(event.oldPartOptions, event.newPartOptions);
        // Title control switch between singleEditorTabs, multiEditorTabs and multiRowEditorTabs
        if (event.oldPartOptions.showTabs !== event.newPartOptions.showTabs ||
            event.oldPartOptions.tabHeight !== event.newPartOptions.tabHeight ||
            (event.oldPartOptions.showTabs === 'multiple' &&
                event.oldPartOptions.pinnedTabsOnSeparateRow !==
                    event.newPartOptions.pinnedTabsOnSeparateRow)) {
            // Re-layout
            this.relayout();
            // Ensure to show active editor if any
            if (this.model.activeEditor) {
                this.titleControl.openEditors(this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */));
            }
        }
        // Styles
        this.updateStyles();
        // Pin preview editor once user disables preview
        if (event.oldPartOptions.enablePreview && !event.newPartOptions.enablePreview) {
            if (this.model.previewEditor) {
                this.pinEditor(this.model.previewEditor);
            }
        }
    }
    onDidChangeEditorDirty(editor) {
        // Always show dirty editors pinned
        this.pinEditor(editor);
        // Forward to title control
        this.titleControl.updateEditorDirty(editor);
    }
    onDidChangeEditorTransient(editor) {
        const transient = this.model.isTransient(editor);
        // Transient state overrides the `enablePreview` setting,
        // so when an editor leaves the transient state, we have
        // to ensure its preview state is also cleared.
        if (!transient && !this.groupsView.partOptions.enablePreview) {
            this.pinEditor(editor);
        }
    }
    onDidChangeEditorLabel(editor) {
        // Forward to title control
        this.titleControl.updateEditorLabel(editor);
    }
    onDidChangeEditorSelection() {
        // Forward to title control
        this.titleControl.updateEditorSelections();
    }
    onDidVisibilityChange(visible) {
        // Forward to active editor pane
        this.editorPane.setVisible(visible);
    }
    onDidGainFocus() {
        if (this.activeEditor) {
            // We aggressively clear the transient state of editors
            // as soon as the group gains focus. This is to ensure
            // that the transient state is not staying around when
            // the user interacts with the editor.
            this.model.setTransient(this.activeEditor, false);
        }
    }
    //#endregion
    //#region IEditorGroupView
    get index() {
        return this._index;
    }
    get label() {
        if (this.groupsLabel) {
            return localize('groupLabelLong', '{0}: Group {1}', this.groupsLabel, this._index + 1);
        }
        return localize('groupLabel', 'Group {0}', this._index + 1);
    }
    get ariaLabel() {
        if (this.groupsLabel) {
            return localize('groupAriaLabelLong', '{0}: Editor Group {1}', this.groupsLabel, this._index + 1);
        }
        return localize('groupAriaLabel', 'Editor Group {0}', this._index + 1);
    }
    get disposed() {
        return this._disposed;
    }
    get isEmpty() {
        return this.count === 0;
    }
    get titleHeight() {
        return this.titleControl.getHeight();
    }
    notifyIndexChanged(newIndex) {
        if (this._index !== newIndex) {
            this._index = newIndex;
            this.model.setIndex(newIndex);
        }
    }
    notifyLabelChanged(newLabel) {
        if (this.groupsLabel !== newLabel) {
            this.groupsLabel = newLabel;
            this.model.setLabel(newLabel);
        }
    }
    setActive(isActive) {
        this.active = isActive;
        // Clear selection when group no longer active
        if (!isActive && this.activeEditor && this.selectedEditors.length > 1) {
            this.setSelection(this.activeEditor, []);
        }
        // Update container
        this.element.classList.toggle('active', isActive);
        this.element.classList.toggle('inactive', !isActive);
        // Update title control
        this.titleControl.setActive(isActive);
        // Update styles
        this.updateStyles();
        // Update model
        this.model.setActive(undefined /* entire group got active */);
    }
    //#endregion
    //#region basics()
    get id() {
        return this.model.id;
    }
    get windowId() {
        return this.groupsView.windowId;
    }
    get editors() {
        return this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
    }
    get count() {
        return this.model.count;
    }
    get stickyCount() {
        return this.model.stickyCount;
    }
    get activeEditorPane() {
        return this.editorPane ? (this.editorPane.activeEditorPane ?? undefined) : undefined;
    }
    get activeEditor() {
        return this.model.activeEditor;
    }
    get selectedEditors() {
        return this.model.selectedEditors;
    }
    get previewEditor() {
        return this.model.previewEditor;
    }
    isPinned(editorOrIndex) {
        return this.model.isPinned(editorOrIndex);
    }
    isSticky(editorOrIndex) {
        return this.model.isSticky(editorOrIndex);
    }
    isSelected(editor) {
        return this.model.isSelected(editor);
    }
    isTransient(editorOrIndex) {
        return this.model.isTransient(editorOrIndex);
    }
    isActive(editor) {
        return this.model.isActive(editor);
    }
    async setSelection(activeSelectedEditor, inactiveSelectedEditors) {
        if (!this.isActive(activeSelectedEditor)) {
            // The active selected editor is not yet opened, so we go
            // through `openEditor` to show it. We pass the inactive
            // selection as internal options
            await this.openEditor(activeSelectedEditor, { activation: EditorActivation.ACTIVATE }, { inactiveSelection: inactiveSelectedEditors });
        }
        else {
            this.model.setSelection(activeSelectedEditor, inactiveSelectedEditors);
        }
    }
    contains(candidate, options) {
        return this.model.contains(candidate, options);
    }
    getEditors(order, options) {
        return this.model.getEditors(order, options);
    }
    findEditors(resource, options) {
        const canonicalResource = this.uriIdentityService.asCanonicalUri(resource);
        return this.getEditors(1 /* EditorsOrder.SEQUENTIAL */).filter((editor) => {
            if (editor.resource && isEqual(editor.resource, canonicalResource)) {
                return true;
            }
            // Support side by side editor primary side if specified
            if (options?.supportSideBySide === SideBySideEditor.PRIMARY ||
                options?.supportSideBySide === SideBySideEditor.ANY) {
                const primaryResource = EditorResourceAccessor.getCanonicalUri(editor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                });
                if (primaryResource && isEqual(primaryResource, canonicalResource)) {
                    return true;
                }
            }
            // Support side by side editor secondary side if specified
            if (options?.supportSideBySide === SideBySideEditor.SECONDARY ||
                options?.supportSideBySide === SideBySideEditor.ANY) {
                const secondaryResource = EditorResourceAccessor.getCanonicalUri(editor, {
                    supportSideBySide: SideBySideEditor.SECONDARY,
                });
                if (secondaryResource && isEqual(secondaryResource, canonicalResource)) {
                    return true;
                }
            }
            return false;
        });
    }
    getEditorByIndex(index) {
        return this.model.getEditorByIndex(index);
    }
    getIndexOfEditor(editor) {
        return this.model.indexOf(editor);
    }
    isFirst(editor) {
        return this.model.isFirst(editor);
    }
    isLast(editor) {
        return this.model.isLast(editor);
    }
    focus() {
        // Pass focus to editor panes
        if (this.activeEditorPane) {
            this.activeEditorPane.focus();
        }
        else {
            this.element.focus();
        }
        // Event
        this._onDidFocus.fire();
    }
    pinEditor(candidate = this.activeEditor || undefined) {
        if (candidate && !this.model.isPinned(candidate)) {
            // Update model
            const editor = this.model.pin(candidate);
            // Forward to title control
            if (editor) {
                this.titleControl.pinEditor(editor);
            }
        }
    }
    stickEditor(candidate = this.activeEditor || undefined) {
        this.doStickEditor(candidate, true);
    }
    unstickEditor(candidate = this.activeEditor || undefined) {
        this.doStickEditor(candidate, false);
    }
    doStickEditor(candidate, sticky) {
        if (candidate && this.model.isSticky(candidate) !== sticky) {
            const oldIndexOfEditor = this.getIndexOfEditor(candidate);
            // Update model
            const editor = sticky ? this.model.stick(candidate) : this.model.unstick(candidate);
            if (!editor) {
                return;
            }
            // If the index of the editor changed, we need to forward this to
            // title control and also make sure to emit this as an event
            const newIndexOfEditor = this.getIndexOfEditor(editor);
            if (newIndexOfEditor !== oldIndexOfEditor) {
                this.titleControl.moveEditor(editor, oldIndexOfEditor, newIndexOfEditor, true);
            }
            // Forward sticky state to title control
            if (sticky) {
                this.titleControl.stickEditor(editor);
            }
            else {
                this.titleControl.unstickEditor(editor);
            }
        }
    }
    //#endregion
    //#region openEditor()
    async openEditor(editor, options, internalOptions) {
        return this.doOpenEditor(editor, options, {
            // Appply given internal open options
            ...internalOptions,
            // Allow to match on a side-by-side editor when same
            // editor is opened on both sides. In that case we
            // do not want to open a new editor but reuse that one.
            supportSideBySide: SideBySideEditor.BOTH,
        });
    }
    async doOpenEditor(editor, options, internalOptions) {
        // Guard against invalid editors. Disposed editors
        // should never open because they emit no events
        // e.g. to indicate dirty changes.
        if (!editor || editor.isDisposed()) {
            return;
        }
        // Fire the event letting everyone know we are about to open an editor
        this._onWillOpenEditor.fire({ editor, groupId: this.id });
        // Determine options
        const pinned = options?.sticky ||
            (!this.groupsView.partOptions.enablePreview && !options?.transient) ||
            editor.isDirty() ||
            (options?.pinned ??
                typeof options?.index ===
                    'number') /* unless specified, prefer to pin when opening with index */ ||
            (typeof options?.index === 'number' && this.model.isSticky(options.index)) ||
            editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */);
        const openEditorOptions = {
            index: options ? options.index : undefined,
            pinned,
            sticky: options?.sticky ||
                (typeof options?.index === 'number' && this.model.isSticky(options.index)),
            transient: !!options?.transient,
            inactiveSelection: internalOptions?.inactiveSelection,
            active: this.count === 0 || !options || !options.inactive,
            supportSideBySide: internalOptions?.supportSideBySide,
        };
        if (!openEditorOptions.active &&
            !openEditorOptions.pinned &&
            this.model.activeEditor &&
            !this.model.isPinned(this.model.activeEditor)) {
            // Special case: we are to open an editor inactive and not pinned, but the current active
            // editor is also not pinned, which means it will get replaced with this one. As such,
            // the editor can only be active.
            openEditorOptions.active = true;
        }
        let activateGroup = false;
        let restoreGroup = false;
        if (options?.activation === EditorActivation.ACTIVATE) {
            // Respect option to force activate an editor group.
            activateGroup = true;
        }
        else if (options?.activation === EditorActivation.RESTORE) {
            // Respect option to force restore an editor group.
            restoreGroup = true;
        }
        else if (options?.activation === EditorActivation.PRESERVE) {
            // Respect option to preserve active editor group.
            activateGroup = false;
            restoreGroup = false;
        }
        else if (openEditorOptions.active) {
            // Finally, we only activate/restore an editor which is
            // opening as active editor.
            // If preserveFocus is enabled, we only restore but never
            // activate the group.
            activateGroup = !options || !options.preserveFocus;
            restoreGroup = !activateGroup;
        }
        // Actually move the editor if a specific index is provided and we figure
        // out that the editor is already opened at a different index. This
        // ensures the right set of events are fired to the outside.
        if (typeof openEditorOptions.index === 'number') {
            const indexOfEditor = this.model.indexOf(editor);
            if (indexOfEditor !== -1 && indexOfEditor !== openEditorOptions.index) {
                this.doMoveEditorInsideGroup(editor, openEditorOptions);
            }
        }
        // Update model and make sure to continue to use the editor we get from
        // the model. It is possible that the editor was already opened and we
        // want to ensure that we use the existing instance in that case.
        const { editor: openedEditor, isNew } = this.model.openEditor(editor, openEditorOptions);
        // Conditionally lock the group
        if (isNew && // only if this editor was new for the group
            this.count === 1 && // only when this editor was the first editor in the group
            this.editorPartsView.groups.length > 1 // only allow auto locking if more than 1 group is opened
        ) {
            // only when the editor identifier is configured as such
            if (openedEditor.editorId &&
                this.groupsView.partOptions.autoLockGroups?.has(openedEditor.editorId)) {
                this.lock(true);
            }
        }
        // Show editor
        const showEditorResult = this.doShowEditor(openedEditor, { active: !!openEditorOptions.active, isNew }, options, internalOptions);
        // Finally make sure the group is active or restored as instructed
        if (activateGroup) {
            this.groupsView.activateGroup(this);
        }
        else if (restoreGroup) {
            this.groupsView.restoreGroup(this);
        }
        return showEditorResult;
    }
    doShowEditor(editor, context, options, internalOptions) {
        // Show in editor control if the active editor changed
        let openEditorPromise;
        if (context.active) {
            openEditorPromise = (async () => {
                const { pane, changed, cancelled, error } = await this.editorPane.openEditor(editor, options, internalOptions, { newInGroup: context.isNew });
                // Return early if the operation was cancelled by another operation
                if (cancelled) {
                    return undefined;
                }
                // Editor change event
                if (changed) {
                    this._onDidActiveEditorChange.fire({ editor });
                }
                // Indicate error as an event but do not bubble them up
                if (error) {
                    this._onDidOpenEditorFail.fire(editor);
                }
                // Without an editor pane, recover by closing the active editor
                // (if the input is still the active one)
                if (!pane && this.activeEditor === editor) {
                    this.doCloseEditor(editor, options?.preserveFocus, { fromError: true });
                }
                return pane;
            })();
        }
        else {
            openEditorPromise = Promise.resolve(undefined); // inactive: return undefined as result to signal this
        }
        // Show in title control after editor control because some actions depend on it
        // but respect the internal options in case title control updates should skip.
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.openEditor(editor, internalOptions);
        }
        return openEditorPromise;
    }
    //#endregion
    //#region openEditors()
    async openEditors(editors) {
        // Guard against invalid editors. Disposed editors
        // should never open because they emit no events
        // e.g. to indicate dirty changes.
        const editorsToOpen = coalesce(editors).filter(({ editor }) => !editor.isDisposed());
        // Use the first editor as active editor
        const firstEditor = editorsToOpen.at(0);
        if (!firstEditor) {
            return;
        }
        const openEditorsOptions = {
            // Allow to match on a side-by-side editor when same
            // editor is opened on both sides. In that case we
            // do not want to open a new editor but reuse that one.
            supportSideBySide: SideBySideEditor.BOTH,
        };
        await this.doOpenEditor(firstEditor.editor, firstEditor.options, openEditorsOptions);
        // Open the other ones inactive
        const inactiveEditors = editorsToOpen.slice(1);
        const startingIndex = this.getIndexOfEditor(firstEditor.editor) + 1;
        await Promises.settled(inactiveEditors.map(({ editor, options }, index) => {
            return this.doOpenEditor(editor, {
                ...options,
                inactive: true,
                pinned: true,
                index: startingIndex + index,
            }, {
                ...openEditorsOptions,
                // optimization: update the title control later
                // https://github.com/microsoft/vscode/issues/130634
                skipTitleUpdate: true,
            });
        }));
        // Update the title control all at once with all editors
        this.titleControl.openEditors(inactiveEditors.map(({ editor }) => editor));
        // Opening many editors at once can put any editor to be
        // the active one depending on options. As such, we simply
        // return the active editor pane after this operation.
        return this.editorPane.activeEditorPane ?? undefined;
    }
    //#endregion
    //#region moveEditor()
    moveEditors(editors, target) {
        // Optimization: knowing that we move many editors, we
        // delay the title update to a later point for this group
        // through a method that allows for bulk updates but only
        // when moving to a different group where many editors
        // are more likely to occur.
        const internalOptions = {
            skipTitleUpdate: this !== target,
        };
        let moveFailed = false;
        const movedEditors = new Set();
        for (const { editor, options } of editors) {
            if (this.moveEditor(editor, target, options, internalOptions)) {
                movedEditors.add(editor);
            }
            else {
                moveFailed = true;
            }
        }
        // Update the title control all at once with all editors
        // in source and target if the title update was skipped
        if (internalOptions.skipTitleUpdate) {
            target.titleControl.openEditors(Array.from(movedEditors));
            this.titleControl.closeEditors(Array.from(movedEditors));
        }
        return !moveFailed;
    }
    moveEditor(editor, target, options, internalOptions) {
        // Move within same group
        if (this === target) {
            this.doMoveEditorInsideGroup(editor, options);
            return true;
        }
        // Move across groups
        else {
            return this.doMoveOrCopyEditorAcrossGroups(editor, target, options, {
                ...internalOptions,
                keepCopy: false,
            });
        }
    }
    doMoveEditorInsideGroup(candidate, options) {
        const moveToIndex = options ? options.index : undefined;
        if (typeof moveToIndex !== 'number') {
            return; // do nothing if we move into same group without index
        }
        // Update model and make sure to continue to use the editor we get from
        // the model. It is possible that the editor was already opened and we
        // want to ensure that we use the existing instance in that case.
        const currentIndex = this.model.indexOf(candidate);
        const editor = this.model.getEditorByIndex(currentIndex);
        if (!editor) {
            return;
        }
        // Move when index has actually changed
        if (currentIndex !== moveToIndex) {
            const oldStickyCount = this.model.stickyCount;
            // Update model
            this.model.moveEditor(editor, moveToIndex);
            this.model.pin(editor);
            // Forward to title control
            this.titleControl.moveEditor(editor, currentIndex, moveToIndex, oldStickyCount !== this.model.stickyCount);
            this.titleControl.pinEditor(editor);
        }
        // Support the option to stick the editor even if it is moved.
        // It is important that we call this method after we have moved
        // the editor because the result of moving the editor could have
        // caused a change in sticky state.
        if (options?.sticky) {
            this.stickEditor(editor);
        }
    }
    doMoveOrCopyEditorAcrossGroups(editor, target, openOptions, internalOptions) {
        const keepCopy = internalOptions?.keepCopy;
        // Validate that we can move
        if (!keepCopy ||
            editor.hasCapability(8 /* EditorInputCapabilities.Singleton */) /* singleton editors will always move */) {
            const canMoveVeto = editor.canMove(this.id, target.id);
            if (typeof canMoveVeto === 'string') {
                this.dialogService.error(canMoveVeto, localize('moveErrorDetails', 'Try saving or reverting the editor first and then try again.'));
                return false;
            }
        }
        // When moving/copying an editor, try to preserve as much view state as possible
        // by checking for the editor to be a text editor and creating the options accordingly
        // if so
        const options = fillActiveEditorViewState(this, editor, {
            ...openOptions,
            pinned: true, // always pin moved editor
            sticky: openOptions?.sticky ?? (!keepCopy && this.model.isSticky(editor)), // preserve sticky state only if editor is moved or explicitly wanted (https://github.com/microsoft/vscode/issues/99035)
        });
        // Indicate will move event
        if (!keepCopy) {
            this._onWillMoveEditor.fire({
                groupId: this.id,
                editor,
                target: target.id,
            });
        }
        // A move to another group is an open first...
        target.doOpenEditor(keepCopy ? editor.copy() : editor, options, internalOptions);
        // ...and a close afterwards (unless we copy)
        if (!keepCopy) {
            this.doCloseEditor(editor, true /* do not focus next one behind if any */, {
                ...internalOptions,
                context: EditorCloseContext.MOVE,
            });
        }
        return true;
    }
    //#endregion
    //#region copyEditor()
    copyEditors(editors, target) {
        // Optimization: knowing that we move many editors, we
        // delay the title update to a later point for this group
        // through a method that allows for bulk updates but only
        // when moving to a different group where many editors
        // are more likely to occur.
        const internalOptions = {
            skipTitleUpdate: this !== target,
        };
        for (const { editor, options } of editors) {
            this.copyEditor(editor, target, options, internalOptions);
        }
        // Update the title control all at once with all editors
        // in target if the title update was skipped
        if (internalOptions.skipTitleUpdate) {
            const copiedEditors = editors.map(({ editor }) => editor);
            target.titleControl.openEditors(copiedEditors);
        }
    }
    copyEditor(editor, target, options, internalOptions) {
        // Move within same group because we do not support to show the same editor
        // multiple times in the same group
        if (this === target) {
            this.doMoveEditorInsideGroup(editor, options);
        }
        // Copy across groups
        else {
            this.doMoveOrCopyEditorAcrossGroups(editor, target, options, {
                ...internalOptions,
                keepCopy: true,
            });
        }
    }
    //#endregion
    //#region closeEditor()
    async closeEditor(editor = this.activeEditor || undefined, options) {
        return this.doCloseEditorWithConfirmationHandling(editor, options);
    }
    async doCloseEditorWithConfirmationHandling(editor = this.activeEditor || undefined, options, internalOptions) {
        if (!editor) {
            return false;
        }
        // Check for confirmation and veto
        const veto = await this.handleCloseConfirmation([editor]);
        if (veto) {
            return false;
        }
        // Do close
        this.doCloseEditor(editor, options?.preserveFocus, internalOptions);
        return true;
    }
    doCloseEditor(editor, preserveFocus = this.groupsView.activeGroup !== this, internalOptions) {
        // Forward to title control unless skipped via internal options
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.beforeCloseEditor(editor);
        }
        // Closing the active editor of the group is a bit more work
        if (this.model.isActive(editor)) {
            this.doCloseActiveEditor(preserveFocus, internalOptions);
        }
        // Closing inactive editor is just a model update
        else {
            this.doCloseInactiveEditor(editor, internalOptions);
        }
        // Forward to title control unless skipped via internal options
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.closeEditor(editor);
        }
    }
    doCloseActiveEditor(preserveFocus = this.groupsView.activeGroup !== this, internalOptions) {
        const editorToClose = this.activeEditor;
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.element);
        // Optimization: if we are about to close the last editor in this group and settings
        // are configured to close the group since it will be empty, we first set the last
        // active group as empty before closing the editor. This reduces the amount of editor
        // change events that this operation emits and will reduce flicker. Without this
        // optimization, this group (if active) would first trigger a active editor change
        // event because it became empty, only to then trigger another one when the next
        // group gets active.
        const closeEmptyGroup = this.groupsView.partOptions.closeEmptyGroups;
        if (closeEmptyGroup && this.active && this.count === 1) {
            const mostRecentlyActiveGroups = this.groupsView.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current one, so take [1]
            if (nextActiveGroup) {
                if (restoreFocus) {
                    nextActiveGroup.focus();
                }
                else {
                    this.groupsView.activateGroup(nextActiveGroup, true);
                }
            }
        }
        // Update model
        if (editorToClose) {
            this.model.closeEditor(editorToClose, internalOptions?.context);
        }
        // Open next active if there are more to show
        const nextActiveEditor = this.model.activeEditor;
        if (nextActiveEditor) {
            let activation = undefined;
            if (preserveFocus && this.groupsView.activeGroup !== this) {
                // If we are opening the next editor in an inactive group
                // without focussing it, ensure we preserve the editor
                // group sizes in case that group is minimized.
                // https://github.com/microsoft/vscode/issues/117686
                activation = EditorActivation.PRESERVE;
            }
            const options = {
                preserveFocus,
                activation,
                // When closing an editor due to an error we can end up in a loop where we continue closing
                // editors that fail to open (e.g. when the file no longer exists). We do not want to show
                // repeated errors in this case to the user. As such, if we open the next editor and we are
                // in a scope of a previous editor failing, we silence the input errors until the editor is
                // opened by setting ignoreError: true.
                ignoreError: internalOptions?.fromError,
            };
            const internalEditorOpenOptions = {
                // When closing an editor, we reveal the next one in the group.
                // However, this can be a result of moving an editor to another
                // window so we explicitly disable window reordering in this case.
                preserveWindowOrder: true,
            };
            this.doOpenEditor(nextActiveEditor, options, internalEditorOpenOptions);
        }
        // Otherwise we are empty, so clear from editor control and send event
        else {
            // Forward to editor pane
            if (editorToClose) {
                this.editorPane.closeEditor(editorToClose);
            }
            // Restore focus to group container as needed unless group gets closed
            if (restoreFocus && !closeEmptyGroup) {
                this.focus();
            }
            // Events
            this._onDidActiveEditorChange.fire({ editor: undefined });
            // Remove empty group if we should
            if (closeEmptyGroup) {
                this.groupsView.removeGroup(this, preserveFocus);
            }
        }
    }
    shouldRestoreFocus(target) {
        const activeElement = getActiveElement();
        if (activeElement === target.ownerDocument.body) {
            return true; // always restore focus if nothing is focused currently
        }
        // otherwise check for the active element being an ancestor of the target
        return isAncestor(activeElement, target);
    }
    doCloseInactiveEditor(editor, internalOptions) {
        // Update model
        this.model.closeEditor(editor, internalOptions?.context);
    }
    async handleCloseConfirmation(editors) {
        if (!editors.length) {
            return false; // no veto
        }
        const editor = editors.shift();
        // To prevent multiple confirmation dialogs from showing up one after the other
        // we check if a pending confirmation is currently showing and if so, join that
        let handleCloseConfirmationPromise = this.mapEditorToPendingConfirmation.get(editor);
        if (!handleCloseConfirmationPromise) {
            handleCloseConfirmationPromise = this.doHandleCloseConfirmation(editor);
            this.mapEditorToPendingConfirmation.set(editor, handleCloseConfirmationPromise);
        }
        let veto;
        try {
            veto = await handleCloseConfirmationPromise;
        }
        finally {
            this.mapEditorToPendingConfirmation.delete(editor);
        }
        // Return for the first veto we got
        if (veto) {
            return veto;
        }
        // Otherwise continue with the remainders
        return this.handleCloseConfirmation(editors);
    }
    async doHandleCloseConfirmation(editor, options) {
        if (!this.shouldConfirmClose(editor)) {
            return false; // no veto
        }
        if (editor instanceof SideBySideEditorInput && this.model.contains(editor.primary)) {
            return false; // primary-side of editor is still opened somewhere else
        }
        // Note: we explicitly decide to ask for confirm if closing a normal editor even
        // if it is opened in a side-by-side editor in the group. This decision is made
        // because it may be less obvious that one side of a side by side editor is dirty
        // and can still be changed.
        // The only exception is when the same editor is opened on both sides of a side
        // by side editor (https://github.com/microsoft/vscode/issues/138442)
        if (this.editorPartsView.groups.some((groupView) => {
            if (groupView === this) {
                return false; // skip (we already handled our group above)
            }
            const otherGroup = groupView;
            if (otherGroup.contains(editor, { supportSideBySide: SideBySideEditor.BOTH })) {
                return true; // exact editor still opened (either single, or split-in-group)
            }
            if (editor instanceof SideBySideEditorInput && otherGroup.contains(editor.primary)) {
                return true; // primary side of side by side editor still opened
            }
            return false;
        })) {
            return false; // editor is still editable somewhere else
        }
        // In some cases trigger save before opening the dialog depending
        // on auto-save configuration.
        // However, make sure to respect `skipAutoSave` option in case the automated
        // save fails which would result in the editor never closing.
        // Also, we only do this if no custom confirmation handling is implemented.
        let confirmation = 2 /* ConfirmResult.CANCEL */;
        let saveReason = 1 /* SaveReason.EXPLICIT */;
        let autoSave = false;
        if (!editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) &&
            !options?.skipAutoSave &&
            !editor.closeHandler) {
            // Auto-save on focus change: save, because a dialog would steal focus
            // (see https://github.com/microsoft/vscode/issues/108752)
            if (this.filesConfigurationService.getAutoSaveMode(editor).mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */) {
                autoSave = true;
                confirmation = 0 /* ConfirmResult.SAVE */;
                saveReason = 3 /* SaveReason.FOCUS_CHANGE */;
            }
            // Auto-save on window change: save, because on Windows and Linux, a
            // native dialog triggers the window focus change
            // (see https://github.com/microsoft/vscode/issues/134250)
            else if (isNative &&
                (isWindows || isLinux) &&
                this.filesConfigurationService.getAutoSaveMode(editor).mode ===
                    4 /* AutoSaveMode.ON_WINDOW_CHANGE */) {
                autoSave = true;
                confirmation = 0 /* ConfirmResult.SAVE */;
                saveReason = 4 /* SaveReason.WINDOW_CHANGE */;
            }
        }
        // No auto-save on focus change or custom confirmation handler: ask user
        if (!autoSave) {
            // Switch to editor that we want to handle for confirmation unless showing already
            if (!this.activeEditor || !this.activeEditor.matches(editor)) {
                await this.doOpenEditor(editor);
            }
            // Ensure our window has focus since we are about to show a dialog
            await this.hostService.focus(getWindow(this.element));
            // Let editor handle confirmation if implemented
            if (typeof editor.closeHandler?.confirm === 'function') {
                confirmation = await editor.closeHandler.confirm([{ editor, groupId: this.id }]);
            }
            // Show a file specific confirmation
            else {
                let name;
                if (editor instanceof SideBySideEditorInput) {
                    name = editor.primary.getName(); // prefer shorter names by using primary's name in this case
                }
                else {
                    name = editor.getName();
                }
                confirmation = await this.fileDialogService.showSaveConfirm([name]);
            }
        }
        // It could be that the editor's choice of confirmation has changed
        // given the check for confirmation is long running, so we check
        // again to see if anything needs to happen before closing for good.
        // This can happen for example if `autoSave: onFocusChange` is configured
        // so that the save happens when the dialog opens.
        // However, we only do this unless a custom confirm handler is installed
        // that may not be fit to be asked a second time right after.
        if (!editor.closeHandler && !this.shouldConfirmClose(editor)) {
            return confirmation === 2 /* ConfirmResult.CANCEL */ ? true : false;
        }
        // Otherwise, handle accordingly
        switch (confirmation) {
            case 0 /* ConfirmResult.SAVE */: {
                const result = await editor.save(this.id, { reason: saveReason });
                if (!result && autoSave) {
                    // Save failed and we need to signal this back to the user, so
                    // we handle the dirty editor again but this time ensuring to
                    // show the confirm dialog
                    // (see https://github.com/microsoft/vscode/issues/108752)
                    return this.doHandleCloseConfirmation(editor, { skipAutoSave: true });
                }
                return editor.isDirty(); // veto if still dirty
            }
            case 1 /* ConfirmResult.DONT_SAVE */:
                try {
                    // first try a normal revert where the contents of the editor are restored
                    await editor.revert(this.id);
                    return editor.isDirty(); // veto if still dirty
                }
                catch (error) {
                    this.logService.error(error);
                    // if that fails, since we are about to close the editor, we accept that
                    // the editor cannot be reverted and instead do a soft revert that just
                    // enables us to close the editor. With this, a user can always close a
                    // dirty editor even when reverting fails.
                    await editor.revert(this.id, { soft: true });
                    return editor.isDirty(); // veto if still dirty
                }
            case 2 /* ConfirmResult.CANCEL */:
                return true; // veto
        }
    }
    shouldConfirmClose(editor) {
        if (editor.closeHandler) {
            return editor.closeHandler.showConfirm(); // custom handling of confirmation on close
        }
        return editor.isDirty() && !editor.isSaving(); // editor must be dirty and not saving
    }
    //#endregion
    //#region closeEditors()
    async closeEditors(args, options) {
        if (this.isEmpty) {
            return true;
        }
        const editors = this.doGetEditorsToClose(args);
        // Check for confirmation and veto
        const veto = await this.handleCloseConfirmation(editors.slice(0));
        if (veto) {
            return false;
        }
        // Do close
        this.doCloseEditors(editors, options);
        return true;
    }
    doGetEditorsToClose(args) {
        if (Array.isArray(args)) {
            return args;
        }
        const filter = args;
        const hasDirection = typeof filter.direction === 'number';
        let editorsToClose = this.model.getEditors(hasDirection ? 1 /* EditorsOrder.SEQUENTIAL */ : 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, filter); // in MRU order only if direction is not specified
        // Filter: saved or saving only
        if (filter.savedOnly) {
            editorsToClose = editorsToClose.filter((editor) => !editor.isDirty() || editor.isSaving());
        }
        // Filter: direction (left / right)
        else if (hasDirection && filter.except) {
            editorsToClose =
                filter.direction === 0 /* CloseDirection.LEFT */
                    ? editorsToClose.slice(0, this.model.indexOf(filter.except, editorsToClose))
                    : editorsToClose.slice(this.model.indexOf(filter.except, editorsToClose) + 1);
        }
        // Filter: except
        else if (filter.except) {
            editorsToClose = editorsToClose.filter((editor) => filter.except && !editor.matches(filter.except));
        }
        return editorsToClose;
    }
    doCloseEditors(editors, options) {
        // Close all inactive editors first
        let closeActiveEditor = false;
        for (const editor of editors) {
            if (!this.isActive(editor)) {
                this.doCloseInactiveEditor(editor);
            }
            else {
                closeActiveEditor = true;
            }
        }
        // Close active editor last if contained in editors list to close
        if (closeActiveEditor) {
            this.doCloseActiveEditor(options?.preserveFocus);
        }
        // Forward to title control
        if (editors.length) {
            this.titleControl.closeEditors(editors);
        }
    }
    //#endregion
    //#region closeAllEditors()
    async closeAllEditors(options) {
        if (this.isEmpty) {
            // If the group is empty and the request is to close all editors, we still close
            // the editor group is the related setting to close empty groups is enabled for
            // a convenient way of removing empty editor groups for the user.
            if (this.groupsView.partOptions.closeEmptyGroups) {
                this.groupsView.removeGroup(this);
            }
            return true;
        }
        // Apply the `excludeConfirming` filter if present
        let editors = this.model.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, options);
        if (options?.excludeConfirming) {
            editors = editors.filter((editor) => !this.shouldConfirmClose(editor));
        }
        // Check for confirmation and veto
        const veto = await this.handleCloseConfirmation(editors);
        if (veto) {
            return false;
        }
        // Do close
        this.doCloseAllEditors(options);
        return true;
    }
    doCloseAllEditors(options) {
        let editors = this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */, options);
        if (options?.excludeConfirming) {
            editors = editors.filter((editor) => !this.shouldConfirmClose(editor));
        }
        // Close all inactive editors first
        const editorsToClose = [];
        for (const editor of editors) {
            if (!this.isActive(editor)) {
                this.doCloseInactiveEditor(editor);
            }
            editorsToClose.push(editor);
        }
        // Close active editor last (unless we skip it, e.g. because it is sticky)
        if (this.activeEditor && editorsToClose.includes(this.activeEditor)) {
            this.doCloseActiveEditor();
        }
        // Forward to title control
        if (editorsToClose.length) {
            this.titleControl.closeEditors(editorsToClose);
        }
    }
    //#endregion
    //#region replaceEditors()
    async replaceEditors(editors) {
        // Extract active vs. inactive replacements
        let activeReplacement;
        const inactiveReplacements = [];
        for (let { editor, replacement, forceReplaceDirty, options } of editors) {
            const index = this.getIndexOfEditor(editor);
            if (index >= 0) {
                const isActiveEditor = this.isActive(editor);
                // make sure we respect the index of the editor to replace
                if (options) {
                    options.index = index;
                }
                else {
                    options = { index };
                }
                options.inactive = !isActiveEditor;
                options.pinned = options.pinned ?? true; // unless specified, prefer to pin upon replace
                const editorToReplace = { editor, replacement, forceReplaceDirty, options };
                if (isActiveEditor) {
                    activeReplacement = editorToReplace;
                }
                else {
                    inactiveReplacements.push(editorToReplace);
                }
            }
        }
        // Handle inactive first
        for (const { editor, replacement, forceReplaceDirty, options } of inactiveReplacements) {
            // Open inactive editor
            await this.doOpenEditor(replacement, options);
            // Close replaced inactive editor unless they match
            if (!editor.matches(replacement)) {
                let closed = false;
                if (forceReplaceDirty) {
                    this.doCloseEditor(editor, true, { context: EditorCloseContext.REPLACE });
                    closed = true;
                }
                else {
                    closed = await this.doCloseEditorWithConfirmationHandling(editor, { preserveFocus: true }, { context: EditorCloseContext.REPLACE });
                }
                if (!closed) {
                    return; // canceled
                }
            }
        }
        // Handle active last
        if (activeReplacement) {
            // Open replacement as active editor
            const openEditorResult = this.doOpenEditor(activeReplacement.replacement, activeReplacement.options);
            // Close replaced active editor unless they match
            if (!activeReplacement.editor.matches(activeReplacement.replacement)) {
                if (activeReplacement.forceReplaceDirty) {
                    this.doCloseEditor(activeReplacement.editor, true, {
                        context: EditorCloseContext.REPLACE,
                    });
                }
                else {
                    await this.doCloseEditorWithConfirmationHandling(activeReplacement.editor, { preserveFocus: true }, { context: EditorCloseContext.REPLACE });
                }
            }
            await openEditorResult;
        }
    }
    //#endregion
    //#region Locking
    get isLocked() {
        return this.model.isLocked;
    }
    lock(locked) {
        this.model.lock(locked);
    }
    //#endregion
    //#region Editor Actions
    createEditorActions(disposables) {
        let actions = { primary: [], secondary: [] };
        let onDidChange;
        // Editor actions require the editor control to be there, so we retrieve it via service
        const activeEditorPane = this.activeEditorPane;
        if (activeEditorPane instanceof EditorPane) {
            const editorScopedContextKeyService = activeEditorPane.scopedContextKeyService ?? this.scopedContextKeyService;
            const editorTitleMenu = disposables.add(this.menuService.createMenu(MenuId.EditorTitle, editorScopedContextKeyService, {
                emitEventsForSubmenuChanges: true,
                eventDebounceDelay: 0,
            }));
            onDidChange = editorTitleMenu.onDidChange;
            const shouldInlineGroup = (action, group) => group === 'navigation' && action.actions.length <= 1;
            actions = getActionBarActions(editorTitleMenu.getActions({ arg: this.resourceContext.get(), shouldForwardArgs: true }), 'navigation', shouldInlineGroup);
        }
        else {
            // If there is no active pane in the group (it's the last group and it's empty)
            // Trigger the change event when the active editor changes
            const _onDidChange = disposables.add(new Emitter());
            onDidChange = _onDidChange.event;
            disposables.add(this.onDidActiveEditorChange(() => _onDidChange.fire()));
        }
        return { actions, onDidChange };
    }
    //#endregion
    //#region Themable
    updateStyles() {
        const isEmpty = this.isEmpty;
        // Container
        if (isEmpty) {
            this.element.style.backgroundColor = this.getColor(EDITOR_GROUP_EMPTY_BACKGROUND) || '';
        }
        else {
            this.element.style.backgroundColor = '';
        }
        // Title control
        const borderColor = this.getColor(EDITOR_GROUP_HEADER_BORDER) || this.getColor(contrastBorder);
        if (!isEmpty && borderColor) {
            this.titleContainer.classList.add('title-border-bottom');
            this.titleContainer.style.setProperty('--title-border-bottom-color', borderColor);
        }
        else {
            this.titleContainer.classList.remove('title-border-bottom');
            this.titleContainer.style.removeProperty('--title-border-bottom-color');
        }
        const { showTabs } = this.groupsView.partOptions;
        this.titleContainer.style.backgroundColor =
            this.getColor(showTabs === 'multiple'
                ? EDITOR_GROUP_HEADER_TABS_BACKGROUND
                : EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND) || '';
        // Editor container
        this.editorContainer.style.backgroundColor = this.getColor(editorBackground) || '';
    }
    get minimumWidth() {
        return this.editorPane.minimumWidth;
    }
    get minimumHeight() {
        return this.editorPane.minimumHeight;
    }
    get maximumWidth() {
        return this.editorPane.maximumWidth;
    }
    get maximumHeight() {
        return this.editorPane.maximumHeight;
    }
    get proportionalLayout() {
        if (!this.lastLayout) {
            return true;
        }
        return !(this.lastLayout.width === this.minimumWidth || this.lastLayout.height === this.minimumHeight);
    }
    layout(width, height, top, left) {
        this.lastLayout = { width, height, top, left };
        this.element.classList.toggle('max-height-478px', height <= 478);
        // Layout the title control first to receive the size it occupies
        const titleControlSize = this.titleControl.layout({
            container: new Dimension(width, height),
            available: new Dimension(width, height - this.editorPane.minimumHeight),
        });
        // Update progress bar location
        this.progressBar.getContainer().style.top = `${Math.max(this.titleHeight.offset - 2, 0)}px`;
        // Pass the container width and remaining height to the editor layout
        const editorHeight = Math.max(0, height - titleControlSize.height);
        this.editorContainer.style.height = `${editorHeight}px`;
        this.editorPane.layout({
            width,
            height: editorHeight,
            top: top + titleControlSize.height,
            left,
        });
    }
    relayout() {
        if (this.lastLayout) {
            const { width, height, top, left } = this.lastLayout;
            this.layout(width, height, top, left);
        }
    }
    setBoundarySashes(sashes) {
        this.editorPane.setBoundarySashes(sashes);
    }
    toJSON() {
        return this.model.serialize();
    }
    //#endregion
    dispose() {
        this._disposed = true;
        this._onWillDispose.fire();
        super.dispose();
    }
};
EditorGroupView = EditorGroupView_1 = __decorate([
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IThemeService),
    __param(9, ITelemetryService),
    __param(10, IKeybindingService),
    __param(11, IMenuService),
    __param(12, IContextMenuService),
    __param(13, IFileDialogService),
    __param(14, IEditorService),
    __param(15, IFilesConfigurationService),
    __param(16, IUriIdentityService),
    __param(17, ILogService),
    __param(18, IEditorResolverService),
    __param(19, IHostService),
    __param(20, IDialogService),
    __param(21, IFileService)
], EditorGroupView);
export { EditorGroupView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckdyb3VwVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQ04sZ0JBQWdCLEVBSWhCLHVCQUF1QixFQUN2QixzQkFBc0IsRUFDdEIsNEJBQTRCLEdBQzVCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQVNOLHNCQUFzQixFQUd0QiwwQkFBMEIsRUFDMUIsZ0JBQWdCLEVBQ2hCLGtCQUFrQixFQU9sQixtQkFBbUIsR0FDbkIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLHdCQUF3QixFQUN4Qiw4QkFBOEIsRUFDOUIseUJBQXlCLEVBQ3pCLHlCQUF5QixFQUN6Qiw4QkFBOEIsRUFDOUIsK0JBQStCLEVBQy9CLGtCQUFrQixFQUNsQix1QkFBdUIsRUFDdkIscUNBQXFDLEVBQ3JDLGtDQUFrQyxFQUNsQyw2QkFBNkIsRUFDN0IsK0JBQStCLEVBQy9CLDhCQUE4QixFQUM5QixtQkFBbUIsRUFDbkIsMkJBQTJCLEVBQzNCLDRCQUE0QixFQUM1QixvQ0FBb0MsRUFDcEMsaUNBQWlDLEVBQ2pDLHFDQUFxQyxFQUNyQyxnQ0FBZ0MsRUFDaEMsc0RBQXNELEdBQ3RELE1BQU0sZ0NBQWdDLENBQUE7QUFFdkMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sU0FBUyxFQUNULFVBQVUsRUFDVixxQkFBcUIsRUFDckIsU0FBUyxFQUNULFdBQVcsRUFDWCxtQkFBbUIsRUFDbkIsVUFBVSxFQUVWLFlBQVksRUFDWixlQUFlLEVBQ2YsU0FBUyxFQUNULGdCQUFnQixFQUNoQixDQUFDLEdBQ0QsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGNBQWMsR0FDZCxNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFDTixtQ0FBbUMsRUFDbkMsc0NBQXNDLEVBQ3RDLDZCQUE2QixFQUM3QiwwQkFBMEIsR0FDMUIsTUFBTSwwQkFBMEIsQ0FBQTtBQVNqQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDekYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDakcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBRU4saUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFnQixNQUFNLG1DQUFtQyxDQUFBO0FBQzdGLE9BQU8sRUFHTix5QkFBeUIsR0FTekIsTUFBTSxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDM0UsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBa0IsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sa0JBQWtCLEVBRWxCLGNBQWMsR0FDZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSwwRUFBMEUsQ0FBQTtBQUNqRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUU5RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDNUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDakcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFFNUMsSUFBTSxlQUFlLHVCQUFyQixNQUFNLGVBQWdCLFNBQVEsUUFBUTtJQUM1QyxpQkFBaUI7SUFFakIsTUFBTSxDQUFDLFNBQVMsQ0FDZixlQUFpQyxFQUNqQyxVQUE2QixFQUM3QixXQUFtQixFQUNuQixVQUFrQixFQUNsQixvQkFBMkMsRUFDM0MsT0FBaUM7UUFFakMsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLGlCQUFlLEVBQ2YsSUFBSSxFQUNKLGVBQWUsRUFDZixVQUFVLEVBQ1YsV0FBVyxFQUNYLFVBQVUsRUFDVixPQUFPLENBQ1AsQ0FBQTtJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsb0JBQW9CLENBQzFCLFVBQXVDLEVBQ3ZDLGVBQWlDLEVBQ2pDLFVBQTZCLEVBQzdCLFdBQW1CLEVBQ25CLFVBQWtCLEVBQ2xCLG9CQUEyQyxFQUMzQyxPQUFpQztRQUVqQyxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FDekMsaUJBQWUsRUFDZixVQUFVLEVBQ1YsZUFBZSxFQUNmLFVBQVUsRUFDVixXQUFXLEVBQ1gsVUFBVSxFQUNWLE9BQU8sQ0FDUCxDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQ2hCLFFBQTBCLEVBQzFCLGVBQWlDLEVBQ2pDLFVBQTZCLEVBQzdCLFdBQW1CLEVBQ25CLFVBQWtCLEVBQ2xCLG9CQUEyQyxFQUMzQyxPQUFpQztRQUVqQyxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FDekMsaUJBQWUsRUFDZixRQUFRLEVBQ1IsZUFBZSxFQUNmLFVBQVUsRUFDVixXQUFXLEVBQ1gsVUFBVSxFQUNWLE9BQU8sQ0FDUCxDQUFBO0lBQ0YsQ0FBQztJQXNFRCxZQUNDLElBQTJELEVBQzFDLGVBQWlDLEVBQ3pDLFVBQTZCLEVBQzlCLFdBQW1CLEVBQ25CLE1BQWMsRUFDdEIsT0FBNEMsRUFDckIsb0JBQTRELEVBQy9ELGlCQUFzRCxFQUMzRCxZQUEyQixFQUN2QixnQkFBb0QsRUFDbkQsaUJBQXNELEVBQzVELFdBQTBDLEVBQ25DLGtCQUF3RCxFQUN6RCxpQkFBc0QsRUFDMUQsYUFBaUQsRUFFakUseUJBQXNFLEVBQ2pELGtCQUF3RCxFQUNoRSxVQUF3QyxFQUM3QixxQkFBOEQsRUFDeEUsV0FBMEMsRUFDeEMsYUFBOEMsRUFDaEQsV0FBMEM7UUFFeEQsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBdkJGLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUN6QyxlQUFVLEdBQVYsVUFBVSxDQUFtQjtRQUM5QixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBRWtCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDOUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUV0QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ2xDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDM0MsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN4QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3pDLGtCQUFhLEdBQWIsYUFBYSxDQUFtQjtRQUVoRCw4QkFBeUIsR0FBekIseUJBQXlCLENBQTRCO1FBQ2hDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDL0MsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNaLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFDdkQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQy9CLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBcEZ6RCxnQkFBZ0I7UUFFQyxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3pELGVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtRQUUzQixtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzVELGtCQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUE7UUFFakMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBMEIsQ0FBQyxDQUFBO1FBQ2pGLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFdkMsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDekQsSUFBSSxPQUFPLEVBQTRCLENBQ3ZDLENBQUE7UUFDUSw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFBO1FBRXJELHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWUsQ0FBQyxDQUFBO1FBQ3pFLHdCQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7UUFFN0MsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBcUIsQ0FBQyxDQUFBO1FBQzdFLHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7UUFFekMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBcUIsQ0FBQyxDQUFBO1FBQzVFLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFdkMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBd0IsQ0FBQyxDQUFBO1FBQy9FLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFdkMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBd0IsQ0FBQyxDQUFBO1FBQy9FLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFxQnZDLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3RELElBQUksYUFBYSxDQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ25GLENBQUE7UUFFZ0IsbUNBQThCLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUE7UUFFekUsbUNBQThCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUV4RSx3QkFBbUIsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO1FBQ3pELGlCQUFZLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQXU3QjFDLGNBQVMsR0FBRyxLQUFLLENBQUE7UUFzMkN6QixZQUFZO1FBRVosMkJBQTJCO1FBRWxCLFlBQU8sR0FBZ0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBeUJoQyxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLEVBQWlELENBQUMsQ0FBQTtRQUN4RixnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBOXhFN0MsSUFBSSxJQUFJLFlBQVksaUJBQWUsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDaEQsQ0FBQzthQUFNLElBQUksNEJBQTRCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDekYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDOUYsQ0FBQztRQUVELGtCQUFrQjtRQUNsQixDQUFDO1lBQ0EsNkJBQTZCO1lBQzdCLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FDakQsQ0FBQTtZQUVELFlBQVk7WUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQ3pCLEdBQUcsUUFBUSxDQUFDLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FDbkYsQ0FBQTtZQUVELHNCQUFzQjtZQUN0QixJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtZQUVqQyxvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7WUFFN0IseUJBQXlCO1lBQ3pCLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFBO1lBRWpDLHdCQUF3QjtZQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFFNUYsZUFBZTtZQUNmLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtZQUMxRixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFBO1lBRXZCLCtCQUErQjtZQUMvQixJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDL0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FDcEMsSUFBSSxpQkFBaUIsQ0FDcEIsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsRUFDbEQ7Z0JBQ0Msc0JBQXNCO2dCQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNuRSxDQUNELENBQ0QsQ0FDRCxDQUFBO1lBRUQsZUFBZTtZQUNmLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUNsRSxDQUFBO1lBQ0QsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7WUFFN0Isa0JBQWtCO1lBQ2xCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUU3QyxnQkFBZ0I7WUFDaEIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNqQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsY0FBYyxDQUM3QyxrQkFBa0IsRUFDbEIsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLEVBQ0osSUFBSSxDQUFDLEtBQUssQ0FDVixDQUNELENBQUE7WUFFRCxtQkFBbUI7WUFDbkIsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7WUFFOUMsY0FBYztZQUNkLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDL0IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FDN0MsV0FBVyxFQUNYLElBQUksQ0FBQyxPQUFPLEVBQ1osSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUNKLENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUE7WUFFcEUsY0FBYztZQUNkLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUVuQixvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7WUFDM0IsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBRXRCLGdCQUFnQjtZQUNoQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDcEIsQ0FBQztRQUNELFlBQVk7UUFFWiw4QkFBOEI7UUFDOUIsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFckYsNkNBQTZDO1FBQzdDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUFBO1FBRUYscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRixNQUFNLDhCQUE4QixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUMvRCx5QkFBeUIsRUFDekIsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLDZCQUE2QixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUM5RCwrQkFBK0IsRUFDL0IsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLDRCQUE0QixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUM3RCw4QkFBOEIsRUFDOUIsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLDhCQUE4QixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUMvRCx5QkFBeUIsRUFDekIsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFMUYsTUFBTSw4QkFBOEIsR0FBRyxxQ0FBcUMsQ0FBQyxNQUFNLENBQ2xGLElBQUksQ0FBQyx1QkFBdUIsQ0FDNUIsQ0FBQTtRQUNELE1BQU0seUJBQXlCLEdBQUcsZ0NBQWdDLENBQUMsTUFBTSxDQUN4RSxJQUFJLENBQUMsdUJBQXVCLENBQzVCLENBQUE7UUFDRCxNQUFNLGdEQUFnRCxHQUNyRCxzREFBc0QsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFFNUYsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRixNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEcsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDbkUsb0NBQW9DLEVBQ3BDLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDaEUsaUNBQWlDLEVBQ2pDLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxvQ0FBb0MsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDckUsK0JBQStCLEVBQy9CLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxtQ0FBbUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDcEUsOEJBQThCLEVBQzlCLElBQUksQ0FDSixDQUFBO1FBRUQsTUFBTSxtQ0FBbUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDcEUscUNBQXFDLEVBQ3JDLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSx1Q0FBdUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDeEUsa0NBQWtDLEVBQ2xDLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSwwQ0FBMEMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDM0UsNkJBQTZCLEVBQzdCLElBQUksQ0FDSixDQUFBO1FBRUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBRXBFLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxFQUFFO1lBQ2hDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBRTVCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7Z0JBQ3RDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFBO2dCQUU5QyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRTtvQkFDbkQsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTztpQkFDM0MsQ0FBQyxDQUNGLENBQUE7Z0JBRUQsdUJBQXVCLENBQ3RCLG1DQUFtQyxFQUNuQyxZQUFZLEVBQ1osSUFBSSxDQUFDLHFCQUFxQixDQUMxQixDQUFBO2dCQUVELElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ2xCLHVDQUF1QyxDQUFDLEdBQUcsQ0FDMUMsWUFBWSxDQUFDLGFBQWEsa0RBQXlDLENBQ25FLENBQUE7b0JBQ0QsMENBQTBDLENBQUMsR0FBRyxDQUM3QyxZQUFZLENBQUMsTUFBTSxLQUFLLHFCQUFxQixDQUFDLEVBQUUsQ0FDaEQsQ0FBQTtvQkFFRCw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7b0JBQ3JGLG9CQUFvQixDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO3dCQUMvRCw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7b0JBQ3RGLENBQUMsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sQ0FBQztvQkFDUCx1Q0FBdUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ2xELDBDQUEwQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDckQsNkJBQTZCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUN6QyxDQUFDO2dCQUVELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdEIsd0JBQXdCLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7b0JBQ3RELDBCQUEwQixDQUFDLEdBQUcsQ0FDN0IsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsYUFBYSwwQ0FBa0MsQ0FDdkUsQ0FBQTtvQkFDRCwyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO29CQUV0RSxNQUFNLHFCQUFxQixHQUFHLHNCQUFzQixDQUFDLGNBQWMsQ0FDbEUsZ0JBQWdCLENBQUMsS0FBSyxFQUN0QixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUMvQyxDQUFBO29CQUNELE1BQU0sdUJBQXVCLEdBQUcsc0JBQXNCLENBQUMsY0FBYyxDQUNwRSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQ3RCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQ2pELENBQUE7b0JBQ0QsK0JBQStCLENBQUMsR0FBRyxDQUNsQyxnQkFBZ0IsQ0FBQyxLQUFLLFlBQVksZUFBZTt3QkFDaEQsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRTt3QkFDN0MsQ0FBQyxDQUFDLHFCQUFxQjt3QkFDdkIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQzs0QkFDbkQscUJBQXFCLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUM7d0JBQ25ELENBQUMsQ0FBQyx1QkFBdUI7d0JBQ3pCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUM7NEJBQ3JELHVCQUF1QixDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQ3RELENBQUE7b0JBQ0Qsa0NBQWtDLENBQUMsR0FBRyxDQUNyQyxDQUFDLENBQUMscUJBQXFCO3dCQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQzt3QkFDbkQsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FDOUIscUJBQXFCLHFEQUVyQixDQUNGLENBQUE7b0JBRUQsTUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxtQkFBbUIsQ0FBQTtvQkFDOUUsbUNBQW1DLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7b0JBQzdELG9DQUFvQyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO2dCQUMvRCxDQUFDO3FCQUFNLENBQUM7b0JBQ1Asd0JBQXdCLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQ2hDLDBCQUEwQixDQUFDLEtBQUssRUFBRSxDQUFBO29CQUNsQywyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtvQkFDbkMsK0JBQStCLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQ3ZDLGtDQUFrQyxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUMzQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUE7UUFFRCwrQ0FBK0M7UUFDL0MsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLENBQXlCLEVBQUUsRUFBRTtZQUM1RCxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDaEI7b0JBQ0Msa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDckMsTUFBSztnQkFDTjtvQkFDQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO29CQUM5RSw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO29CQUM1RSw4QkFBOEIsQ0FBQyxHQUFHLENBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQzlFLENBQUE7b0JBQ0QsOEJBQThCLENBQUMsR0FBRyxDQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUM5RSxDQUFBO29CQUNELE1BQUs7Z0JBQ047b0JBQ0MsOEJBQThCLENBQUMsR0FBRyxDQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUM5RSxDQUFBO29CQUNELDhCQUE4QixDQUFDLEdBQUcsQ0FDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FDOUUsQ0FBQTtnQkFDRiw4Q0FBc0M7Z0JBQ3RDO29CQUNDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7b0JBQzlFLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7b0JBQzVFLE1BQUs7Z0JBQ047b0JBQ0MsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQzt3QkFDdEQsOEJBQThCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtvQkFDakYsQ0FBQztvQkFDRCxNQUFLO2dCQUNOO29CQUNDLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7d0JBQ3RELDhCQUE4QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7b0JBQ2pGLENBQUM7b0JBQ0QsTUFBSztnQkFDTjtvQkFDQyw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO29CQUN6RSx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFBO29CQUN0RSxnREFBZ0QsQ0FBQyxHQUFHLENBQ25ELElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FDL0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxRQUFRO3dCQUNWLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQzs0QkFDeEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUN6QyxDQUNELENBQUE7b0JBQ0QsTUFBSztZQUNQLENBQUM7WUFFRCw4QkFBOEI7WUFDOUIsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6QyxDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXZFLCtEQUErRDtRQUMvRCxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekUsaUNBQWlDO1FBQ2pDLG1CQUFtQixFQUFFLENBQUE7UUFDckIsc0JBQXNCLENBQUMsRUFBRSxJQUFJLDRDQUFvQyxFQUFFLENBQUMsQ0FBQTtRQUNwRSxzQkFBc0IsQ0FBQyxFQUFFLElBQUksMkNBQW1DLEVBQUUsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFTywwQkFBMEI7UUFDakMsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0QsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2xCLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBRW5CLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUM1QjtvQkFDQyxRQUFRLEVBQUUsU0FBUztvQkFDbkIsT0FBTyxFQUFFO3dCQUNSLE1BQU0sRUFBRSxJQUFJO3dCQUNaLFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFO3FCQUN2QztpQkFDRCxFQUNELElBQUksQ0FBQyxFQUFFLENBQ1AsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0QsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3hELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUV6QixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0Isb0JBQW9CO1FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUUxQyxVQUFVO1FBQ1YsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN0QyxJQUFJLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtZQUMvQixTQUFTLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLDRCQUE0QixDQUFDO1lBQzFFLHFCQUFxQixFQUFFLElBQUk7U0FDM0IsQ0FBQyxDQUNGLENBQUE7UUFFRCxrQkFBa0I7UUFDbEIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQ2xGLENBQUE7UUFDRCxNQUFNLHNCQUFzQixHQUFHLEdBQUcsRUFBRTtZQUNuQyxvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUV4RixxQkFBcUI7WUFDckIsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQ2xDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFDdkYsWUFBWSxDQUNaLENBQUE7WUFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3JFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQzdCLElBQUksRUFBRSxJQUFJO29CQUNWLEtBQUssRUFBRSxLQUFLO29CQUNaLFVBQVUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO2lCQUNsQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBQ0Qsc0JBQXNCLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVPLDBCQUEwQjtRQUNqQyxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2pFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsQ0FDbEMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQ3BFLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUNqQyxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sMEJBQTBCLENBQUMsQ0FBYztRQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU0sQ0FBQywrQkFBK0I7UUFDdkMsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixJQUFJLE1BQU0sR0FBcUMsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUMzRCxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ1AsTUFBTSxHQUFHLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsVUFBVTtRQUNWLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7WUFDdkMsTUFBTSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUI7WUFDdEMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTTtZQUN2QixNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtTQUMxQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sWUFBWTtRQUNuQixZQUFZO1FBQ1osTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDckMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBQywyRUFBMkU7WUFDcEcsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxrQkFBa0I7UUFDbEIsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLENBQTRCLEVBQVEsRUFBRTtZQUN0RSxJQUFJLE1BQW1CLENBQUE7WUFDdkIsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsSUFDQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQywrQkFBK0I7b0JBQzlDLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyx3QkFBd0IsRUFDbEQsQ0FBQztvQkFDRixPQUFPLFNBQVMsQ0FBQTtnQkFDakIsQ0FBQztnQkFFRCxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQXFCLENBQUE7WUFDakMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sR0FBSSxDQUFrQixDQUFDLGFBQTRCLENBQUE7WUFDMUQsQ0FBQztZQUVELElBQ0MsbUJBQW1CLENBQUMsTUFBTSxFQUFFLG1CQUFtQixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUM7Z0JBQ3JFLG1CQUFtQixDQUFDLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQ3pFLENBQUM7Z0JBQ0YsT0FBTSxDQUFDLDhDQUE4QztZQUN0RCxDQUFDO1lBRUQsaURBQWlEO1lBQ2pELFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2IsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3RFLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUMxQixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3BFLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUMxQixDQUNELENBQUE7UUFFRCxjQUFjO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN4QixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGVBQWU7UUFDdEIsdURBQXVEO1FBQ3ZELElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7WUFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQ3hCLFlBQVksRUFDWixRQUFRLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FDM0QsQ0FBQTtRQUNGLENBQUM7UUFFRCx5REFBeUQ7YUFDcEQsQ0FBQztZQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN4QyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMzQyxDQUFDO1FBRUQsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtJQUNwQixDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDbkMsTUFBTSxFQUNOLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQ25ELENBQUE7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVPLGNBQWMsQ0FDckIsSUFBMkQsRUFDM0QsZ0JBQTBDO1FBRTFDLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QixPQUFNLENBQUMsa0JBQWtCO1FBQzFCLENBQUM7UUFFRCwyQkFBMkI7UUFDM0IsSUFBSSxPQUF1QixDQUFBO1FBQzNCLElBQUksSUFBSSxZQUFZLGlCQUFlLEVBQUUsQ0FBQztZQUNyQyxPQUFPLEdBQUcseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQyw0RUFBNEU7UUFDdkgsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUE7UUFDNUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBRUQsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQSxDQUFDLHdCQUF3QjtRQUMzRSxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBLENBQUMsd0JBQXdCO1FBQzNFLE9BQU8sQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBLENBQUMsd0NBQXdDO1FBRXJFLE1BQU0sZUFBZSxHQUErQjtZQUNuRCxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsK0NBQStDO1lBQzFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsaURBQWlEO1NBQ3hFLENBQUE7UUFFRCxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO1FBRXhDLDREQUE0RDtRQUM1RCxpREFBaUQ7UUFDakQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FDL0IsWUFBWSxFQUNaLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUM3QyxPQUFPLEVBQ1AsZUFBZSxDQUNmLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNYLDREQUE0RDtZQUM1RCx3REFBd0Q7WUFDeEQsdURBQXVEO1lBQ3ZELHFCQUFxQjtZQUVyQixJQUNDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxLQUFLLElBQUk7Z0JBQ3BDLGFBQWE7Z0JBQ2IsZUFBZSxDQUFDLGFBQWEsQ0FBQztnQkFDOUIsQ0FBQyxnQkFBZ0IsRUFBRSxhQUFhLEVBQy9CLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUUzQyxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCx3QkFBd0I7SUFFaEIsaUJBQWlCO1FBQ3hCLGVBQWU7UUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakYsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3pGLENBQUE7UUFFRCxhQUFhO1FBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTNGLFFBQVE7UUFDUixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRU8scUJBQXFCLENBQUMsQ0FBeUI7UUFDdEQscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUIsZ0JBQWdCO1FBRWhCLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCO2dCQUNDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUN0RCxNQUFLO1lBQ047Z0JBQ0MsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUE7Z0JBQ2pDLE1BQUs7UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNmLE9BQU07UUFDUCxDQUFDO1FBRUQsUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEI7Z0JBQ0MsSUFBSSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUMvQixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUM5QyxDQUFDO2dCQUNELE1BQUs7WUFDTjtnQkFDQyxJQUFJLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzFFLENBQUM7Z0JBQ0QsTUFBSztZQUNOO2dCQUNDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ2xDLE1BQUs7WUFDTjtnQkFDQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNyQyxNQUFLO1lBQ047Z0JBQ0MsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDekMsTUFBSztZQUNOO2dCQUNDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3JDLE1BQUs7UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FBQyxNQUFtQixFQUFFLFdBQW1CO1FBQy9EOzs7Ozs7O1VBT0U7UUFDRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUV6RixtQkFBbUI7UUFDbkIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFTyxzQkFBc0IsQ0FDN0IsTUFBbUIsRUFDbkIsV0FBbUIsRUFDbkIsT0FBMkIsRUFDM0IsTUFBZTtRQUVmLGVBQWU7UUFDZixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFFL0YsZUFBZTtRQUNmLE1BQU0sY0FBYyxHQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlDLCtEQUErRDtRQUMvRCxJQUFJLE1BQU0sWUFBWSxxQkFBcUIsRUFBRSxDQUFDO1lBQzdDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdEQsQ0FBQztRQUVELHdFQUF3RTtRQUN4RSx5RUFBeUU7UUFDekUsMEVBQTBFO1FBQzFFLG1EQUFtRDtRQUNuRCxLQUFLLE1BQU0sTUFBTSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3JDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM3QixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDakIsQ0FBQztRQUNGLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBRXRCLFFBQVE7UUFDUixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVPLFVBQVUsQ0FBQyxNQUFtQjtRQUNyQyxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckQsSUFDQyxTQUFTLFlBQVksaUJBQWU7Z0JBQ3BDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtvQkFDaEMsWUFBWSxFQUFFLElBQUksRUFBRSx3REFBd0Q7b0JBQzVFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxvREFBb0Q7aUJBQzdGLENBQUMsRUFDRCxDQUFDO2dCQUNGLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyw2QkFBNkIsQ0FBQyxRQUFhO1FBQ2xELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxRQUFRO1lBQ3BCLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO2dCQUNqQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU07Z0JBQ2pCLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUNoQixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkMsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3BELFdBQVc7WUFDVixtQkFBbUIsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFBO1FBRXRGLE9BQU87WUFDTixRQUFRLEVBQUUsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtZQUN2QixHQUFHLEVBQUUsV0FBVztZQUNoQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztTQUNoQixDQUFBO0lBQ0YsQ0FBQztJQUVPLDJCQUEyQixDQUFDLE1BQW1CO1FBQ3RELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBRWxELE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDOUQsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsSUFBSTtTQUN4QyxDQUFDLENBQUE7UUFDRixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN6QixVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRXJFOzs7O2NBSUU7WUFDRixPQUFPLFVBQVUsQ0FBQTtRQUNsQixDQUFDO2FBQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNyQixJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDOUUsQ0FBQztZQUNELElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN4QixVQUFVLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3pGLENBQUM7WUFDRDs7Ozs7Y0FLRTtZQUNGLE9BQU8sVUFBVSxDQUFBO1FBQ2xCLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBRU8sbUJBQW1CLENBQUMsTUFBbUI7UUFDOUMsc0ZBQXNGO1FBQ3RGLG1GQUFtRjtRQUNuRix3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRU8scUJBQXFCLENBQUMsZUFBOEI7UUFDM0QsMkNBQTJDO1FBQzNDLElBQUksWUFBcUMsQ0FBQTtRQUN6QyxNQUFNLGVBQWUsR0FBa0IsRUFBRSxDQUFBO1FBQ3pDLEtBQUssTUFBTSxjQUFjLElBQUksZUFBZSxFQUFFLENBQUM7WUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUM5RCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdkIsU0FBUSxDQUFDLGdDQUFnQztZQUMxQyxDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO2dCQUMxQixTQUFRLENBQUMsZ0NBQWdDO1lBQzFDLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLFlBQVksR0FBRyxNQUFNLENBQUE7WUFDdEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUM7UUFFRCx5REFBeUQ7UUFDekQsS0FBSyxNQUFNLGNBQWMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkMsQ0FBQztJQUNGLENBQUM7SUFFTyw0QkFBNEIsQ0FBQyxLQUFvQztRQUN4RSxrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFFM0IsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRTNFLHdGQUF3RjtRQUN4RixJQUNDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxLQUFLLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUTtZQUMvRCxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsS0FBSyxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVM7WUFDakUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsS0FBSyxVQUFVO2dCQUM1QyxLQUFLLENBQUMsY0FBYyxDQUFDLHVCQUF1QjtvQkFDM0MsS0FBSyxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUM5QyxDQUFDO1lBQ0YsWUFBWTtZQUNaLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUVmLHNDQUFzQztZQUN0QyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxDQUFBO1lBQzlFLENBQUM7UUFDRixDQUFDO1FBRUQsU0FBUztRQUNULElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUVuQixnREFBZ0Q7UUFDaEQsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLGFBQWEsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDL0UsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsTUFBbUI7UUFDakQsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFdEIsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVPLDBCQUEwQixDQUFDLE1BQW1CO1FBQ3JELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWhELHlEQUF5RDtRQUN6RCx3REFBd0Q7UUFDeEQsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM5RCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsTUFBbUI7UUFDakQsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVPLDBCQUEwQjtRQUNqQywyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO0lBQzNDLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxPQUFnQjtRQUM3QyxnQ0FBZ0M7UUFDaEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdkIsdURBQXVEO1lBQ3ZELHNEQUFzRDtZQUN0RCxzREFBc0Q7WUFDdEQsc0NBQXNDO1lBRXRDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO0lBRVosMEJBQTBCO0lBRTFCLElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3ZGLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sUUFBUSxDQUNkLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsSUFBSSxDQUFDLFdBQVcsRUFDaEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQ2YsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFHRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBZ0I7UUFDbEMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFBO1lBQ3RCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBZ0I7UUFDbEMsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFBO1lBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxDQUFDLFFBQWlCO1FBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFBO1FBRXRCLDhDQUE4QztRQUM5QyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFcEQsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXJDLGdCQUFnQjtRQUNoQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFbkIsZUFBZTtRQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFRCxZQUFZO0lBRVosa0JBQWtCO0lBRWxCLElBQUksRUFBRTtRQUNMLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUE7SUFDaEMsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLGlDQUF5QixDQUFBO0lBQ3RELENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFBO0lBQzlCLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ3JGLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUE7SUFDaEMsQ0FBQztJQUVELFFBQVEsQ0FBQyxhQUFtQztRQUMzQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxRQUFRLENBQUMsYUFBbUM7UUFDM0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQW1CO1FBQzdCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELFdBQVcsQ0FBQyxhQUFtQztRQUM5QyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxRQUFRLENBQUMsTUFBeUM7UUFDakQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FDakIsb0JBQWlDLEVBQ2pDLHVCQUFzQztRQUV0QyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDMUMseURBQXlEO1lBQ3pELHdEQUF3RDtZQUN4RCxnQ0FBZ0M7WUFDaEMsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUNwQixvQkFBb0IsRUFDcEIsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEVBQ3pDLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsQ0FDOUMsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN2RSxDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxTQUE0QyxFQUFFLE9BQTZCO1FBQ25GLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxVQUFVLENBQUMsS0FBbUIsRUFBRSxPQUFxQztRQUNwRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWEsRUFBRSxPQUE0QjtRQUN0RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUUsT0FBTyxJQUFJLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNqRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCx3REFBd0Q7WUFDeEQsSUFDQyxPQUFPLEVBQUUsaUJBQWlCLEtBQUssZ0JBQWdCLENBQUMsT0FBTztnQkFDdkQsT0FBTyxFQUFFLGlCQUFpQixLQUFLLGdCQUFnQixDQUFDLEdBQUcsRUFDbEQsQ0FBQztnQkFDRixNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO29CQUN0RSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO2lCQUMzQyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxlQUFlLElBQUksT0FBTyxDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7b0JBQ3BFLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7WUFDRixDQUFDO1lBRUQsMERBQTBEO1lBQzFELElBQ0MsT0FBTyxFQUFFLGlCQUFpQixLQUFLLGdCQUFnQixDQUFDLFNBQVM7Z0JBQ3pELE9BQU8sRUFBRSxpQkFBaUIsS0FBSyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQ2xELENBQUM7Z0JBQ0YsTUFBTSxpQkFBaUIsR0FBRyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO29CQUN4RSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO2lCQUM3QyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxpQkFBaUIsSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxDQUFDO29CQUN4RSxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsS0FBYTtRQUM3QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELGdCQUFnQixDQUFDLE1BQW1CO1FBQ25DLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELE9BQU8sQ0FBQyxNQUFtQjtRQUMxQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBbUI7UUFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsS0FBSztRQUNKLDZCQUE2QjtRQUM3QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM5QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDckIsQ0FBQztRQUVELFFBQVE7UUFDUixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxTQUFTLENBQUMsWUFBcUMsSUFBSSxDQUFDLFlBQVksSUFBSSxTQUFTO1FBQzVFLElBQUksU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxlQUFlO1lBQ2YsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFeEMsMkJBQTJCO1lBQzNCLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDcEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLFlBQXFDLElBQUksQ0FBQyxZQUFZLElBQUksU0FBUztRQUM5RSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsYUFBYSxDQUFDLFlBQXFDLElBQUksQ0FBQyxZQUFZLElBQUksU0FBUztRQUNoRixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRU8sYUFBYSxDQUFDLFNBQWtDLEVBQUUsTUFBZTtRQUN4RSxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUM1RCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUV6RCxlQUFlO1lBQ2YsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbkYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE9BQU07WUFDUCxDQUFDO1lBRUQsaUVBQWlFO1lBQ2pFLDREQUE0RDtZQUM1RCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0RCxJQUFJLGdCQUFnQixLQUFLLGdCQUFnQixFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMvRSxDQUFDO1lBRUQsd0NBQXdDO1lBQ3hDLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQVk7SUFFWixzQkFBc0I7SUFFdEIsS0FBSyxDQUFDLFVBQVUsQ0FDZixNQUFtQixFQUNuQixPQUF3QixFQUN4QixlQUE0QztRQUU1QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRTtZQUN6QyxxQ0FBcUM7WUFDckMsR0FBRyxlQUFlO1lBQ2xCLG9EQUFvRDtZQUNwRCxrREFBa0Q7WUFDbEQsdURBQXVEO1lBQ3ZELGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLElBQUk7U0FDeEMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZLENBQ3pCLE1BQW1CLEVBQ25CLE9BQXdCLEVBQ3hCLGVBQTRDO1FBRTVDLGtEQUFrRDtRQUNsRCxnREFBZ0Q7UUFDaEQsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDcEMsT0FBTTtRQUNQLENBQUM7UUFFRCxzRUFBc0U7UUFDdEUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFekQsb0JBQW9CO1FBQ3BCLE1BQU0sTUFBTSxHQUNYLE9BQU8sRUFBRSxNQUFNO1lBQ2YsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLGFBQWEsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7WUFDbkUsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUNoQixDQUFDLE9BQU8sRUFBRSxNQUFNO2dCQUNmLE9BQU8sT0FBTyxFQUFFLEtBQUs7b0JBQ3BCLFFBQVEsQ0FBQyxDQUFDLDZEQUE2RDtZQUN6RSxDQUFDLE9BQU8sT0FBTyxFQUFFLEtBQUssS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FBQyxhQUFhLDhDQUFvQyxDQUFBO1FBQ3pELE1BQU0saUJBQWlCLEdBQXVCO1lBQzdDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDMUMsTUFBTTtZQUNOLE1BQU0sRUFDTCxPQUFPLEVBQUUsTUFBTTtnQkFDZixDQUFDLE9BQU8sT0FBTyxFQUFFLEtBQUssS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNFLFNBQVMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVM7WUFDL0IsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLGlCQUFpQjtZQUNyRCxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUTtZQUN6RCxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsaUJBQWlCO1NBQ3JELENBQUE7UUFFRCxJQUNDLENBQUMsaUJBQWlCLENBQUMsTUFBTTtZQUN6QixDQUFDLGlCQUFpQixDQUFDLE1BQU07WUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZO1lBQ3ZCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDNUMsQ0FBQztZQUNGLHlGQUF5RjtZQUN6RixzRkFBc0Y7WUFDdEYsaUNBQWlDO1lBQ2pDLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDaEMsQ0FBQztRQUVELElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQTtRQUN6QixJQUFJLFlBQVksR0FBRyxLQUFLLENBQUE7UUFFeEIsSUFBSSxPQUFPLEVBQUUsVUFBVSxLQUFLLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3ZELG9EQUFvRDtZQUNwRCxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBQ3JCLENBQUM7YUFBTSxJQUFJLE9BQU8sRUFBRSxVQUFVLEtBQUssZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0QsbURBQW1EO1lBQ25ELFlBQVksR0FBRyxJQUFJLENBQUE7UUFDcEIsQ0FBQzthQUFNLElBQUksT0FBTyxFQUFFLFVBQVUsS0FBSyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM5RCxrREFBa0Q7WUFDbEQsYUFBYSxHQUFHLEtBQUssQ0FBQTtZQUNyQixZQUFZLEdBQUcsS0FBSyxDQUFBO1FBQ3JCLENBQUM7YUFBTSxJQUFJLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JDLHVEQUF1RDtZQUN2RCw0QkFBNEI7WUFDNUIseURBQXlEO1lBQ3pELHNCQUFzQjtZQUN0QixhQUFhLEdBQUcsQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFBO1lBQ2xELFlBQVksR0FBRyxDQUFDLGFBQWEsQ0FBQTtRQUM5QixDQUFDO1FBRUQseUVBQXlFO1FBQ3pFLG1FQUFtRTtRQUNuRSw0REFBNEQ7UUFDNUQsSUFBSSxPQUFPLGlCQUFpQixDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoRCxJQUFJLGFBQWEsS0FBSyxDQUFDLENBQUMsSUFBSSxhQUFhLEtBQUssaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtZQUN4RCxDQUFDO1FBQ0YsQ0FBQztRQUVELHVFQUF1RTtRQUN2RSxzRUFBc0U7UUFDdEUsaUVBQWlFO1FBQ2pFLE1BQU0sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBRXhGLCtCQUErQjtRQUMvQixJQUNDLEtBQUssSUFBSSw0Q0FBNEM7WUFDckQsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLElBQUksMERBQTBEO1lBQzlFLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMseURBQXlEO1VBQy9GLENBQUM7WUFDRix3REFBd0Q7WUFDeEQsSUFDQyxZQUFZLENBQUMsUUFBUTtnQkFDckIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQ3JFLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNoQixDQUFDO1FBQ0YsQ0FBQztRQUVELGNBQWM7UUFDZCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQ3pDLFlBQVksRUFDWixFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUM3QyxPQUFPLEVBQ1AsZUFBZSxDQUNmLENBQUE7UUFFRCxrRUFBa0U7UUFDbEUsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxDQUFDO2FBQU0sSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsT0FBTyxnQkFBZ0IsQ0FBQTtJQUN4QixDQUFDO0lBRU8sWUFBWSxDQUNuQixNQUFtQixFQUNuQixPQUE0QyxFQUM1QyxPQUF3QixFQUN4QixlQUE0QztRQUU1QyxzREFBc0Q7UUFDdEQsSUFBSSxpQkFBbUQsQ0FBQTtRQUN2RCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixpQkFBaUIsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUMvQixNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FDM0UsTUFBTSxFQUNOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUM3QixDQUFBO2dCQUVELG1FQUFtRTtnQkFDbkUsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLFNBQVMsQ0FBQTtnQkFDakIsQ0FBQztnQkFFRCxzQkFBc0I7Z0JBQ3RCLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7Z0JBQy9DLENBQUM7Z0JBRUQsdURBQXVEO2dCQUN2RCxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3ZDLENBQUM7Z0JBRUQsK0RBQStEO2dCQUMvRCx5Q0FBeUM7Z0JBQ3pDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxNQUFNLEVBQUUsQ0FBQztvQkFDM0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUN4RSxDQUFDO2dCQUVELE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNMLENBQUM7YUFBTSxDQUFDO1lBQ1AsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQSxDQUFDLHNEQUFzRDtRQUN0RyxDQUFDO1FBRUQsK0VBQStFO1FBQy9FLDhFQUE4RTtRQUM5RSxJQUFJLENBQUMsZUFBZSxFQUFFLGVBQWUsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBRUQsT0FBTyxpQkFBaUIsQ0FBQTtJQUN6QixDQUFDO0lBRUQsWUFBWTtJQUVaLHVCQUF1QjtJQUV2QixLQUFLLENBQUMsV0FBVyxDQUNoQixPQUE0RDtRQUU1RCxrREFBa0Q7UUFDbEQsZ0RBQWdEO1FBQ2hELGtDQUFrQztRQUNsQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUVwRix3Q0FBd0M7UUFDeEMsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUErQjtZQUN0RCxvREFBb0Q7WUFDcEQsa0RBQWtEO1lBQ2xELHVEQUF1RDtZQUN2RCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJO1NBQ3hDLENBQUE7UUFFRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFcEYsK0JBQStCO1FBQy9CLE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkUsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUNyQixlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbEQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUN2QixNQUFNLEVBQ047Z0JBQ0MsR0FBRyxPQUFPO2dCQUNWLFFBQVEsRUFBRSxJQUFJO2dCQUNkLE1BQU0sRUFBRSxJQUFJO2dCQUNaLEtBQUssRUFBRSxhQUFhLEdBQUcsS0FBSzthQUM1QixFQUNEO2dCQUNDLEdBQUcsa0JBQWtCO2dCQUNyQiwrQ0FBK0M7Z0JBQy9DLG9EQUFvRDtnQkFDcEQsZUFBZSxFQUFFLElBQUk7YUFDckIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHdEQUF3RDtRQUN4RCxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUUxRSx3REFBd0Q7UUFDeEQsMERBQTBEO1FBQzFELHNEQUFzRDtRQUN0RCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLElBQUksU0FBUyxDQUFBO0lBQ3JELENBQUM7SUFFRCxZQUFZO0lBRVosc0JBQXNCO0lBRXRCLFdBQVcsQ0FDVixPQUE0RCxFQUM1RCxNQUF1QjtRQUV2QixzREFBc0Q7UUFDdEQseURBQXlEO1FBQ3pELHlEQUF5RDtRQUN6RCxzREFBc0Q7UUFDdEQsNEJBQTRCO1FBQzVCLE1BQU0sZUFBZSxHQUE2QjtZQUNqRCxlQUFlLEVBQUUsSUFBSSxLQUFLLE1BQU07U0FDaEMsQ0FBQTtRQUVELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQTtRQUV0QixNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFBO1FBQzNDLEtBQUssTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUMzQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDL0QsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxHQUFHLElBQUksQ0FBQTtZQUNsQixDQUFDO1FBQ0YsQ0FBQztRQUVELHdEQUF3RDtRQUN4RCx1REFBdUQ7UUFDdkQsSUFBSSxlQUFlLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDckMsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1lBQ3pELElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsT0FBTyxDQUFDLFVBQVUsQ0FBQTtJQUNuQixDQUFDO0lBRUQsVUFBVSxDQUNULE1BQW1CLEVBQ25CLE1BQXVCLEVBQ3ZCLE9BQXdCLEVBQ3hCLGVBQTBDO1FBRTFDLHlCQUF5QjtRQUN6QixJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQzdDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELHFCQUFxQjthQUNoQixDQUFDO1lBQ0wsT0FBTyxJQUFJLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUU7Z0JBQ25FLEdBQUcsZUFBZTtnQkFDbEIsUUFBUSxFQUFFLEtBQUs7YUFDZixDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUFDLFNBQXNCLEVBQUUsT0FBNEI7UUFDbkYsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDdkQsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxPQUFNLENBQUMsc0RBQXNEO1FBQzlELENBQUM7UUFFRCx1RUFBdUU7UUFDdkUsc0VBQXNFO1FBQ3RFLGlFQUFpRTtRQUNqRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3hELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBRUQsdUNBQXVDO1FBQ3ZDLElBQUksWUFBWSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFBO1lBRTdDLGVBQWU7WUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFdEIsMkJBQTJCO1lBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUMzQixNQUFNLEVBQ04sWUFBWSxFQUNaLFdBQVcsRUFDWCxjQUFjLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQ3pDLENBQUE7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBRUQsOERBQThEO1FBQzlELCtEQUErRDtRQUMvRCxnRUFBZ0U7UUFDaEUsbUNBQW1DO1FBQ25DLElBQUksT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFTyw4QkFBOEIsQ0FDckMsTUFBbUIsRUFDbkIsTUFBdUIsRUFDdkIsV0FBZ0MsRUFDaEMsZUFBMEM7UUFFMUMsTUFBTSxRQUFRLEdBQUcsZUFBZSxFQUFFLFFBQVEsQ0FBQTtRQUUxQyw0QkFBNEI7UUFDNUIsSUFDQyxDQUFDLFFBQVE7WUFDVCxNQUFNLENBQUMsYUFBYSwyQ0FFbkIsQ0FBQyx3Q0FBd0MsRUFDekMsQ0FBQztZQUNGLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdEQsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQ3ZCLFdBQVcsRUFDWCxRQUFRLENBQ1Asa0JBQWtCLEVBQ2xCLDhEQUE4RCxDQUM5RCxDQUNELENBQUE7Z0JBRUQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUVELGdGQUFnRjtRQUNoRixzRkFBc0Y7UUFDdEYsUUFBUTtRQUNSLE1BQU0sT0FBTyxHQUFHLHlCQUF5QixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUU7WUFDdkQsR0FBRyxXQUFXO1lBQ2QsTUFBTSxFQUFFLElBQUksRUFBRSwwQkFBMEI7WUFDeEMsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLHdIQUF3SDtTQUNuTSxDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztnQkFDM0IsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNoQixNQUFNO2dCQUNOLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRTthQUNqQixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsOENBQThDO1FBQzlDLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFFaEYsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyx5Q0FBeUMsRUFBRTtnQkFDMUUsR0FBRyxlQUFlO2dCQUNsQixPQUFPLEVBQUUsa0JBQWtCLENBQUMsSUFBSTthQUNoQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsWUFBWTtJQUVaLHNCQUFzQjtJQUV0QixXQUFXLENBQ1YsT0FBNEQsRUFDNUQsTUFBdUI7UUFFdkIsc0RBQXNEO1FBQ3RELHlEQUF5RDtRQUN6RCx5REFBeUQ7UUFDekQsc0RBQXNEO1FBQ3RELDRCQUE0QjtRQUM1QixNQUFNLGVBQWUsR0FBNkI7WUFDakQsZUFBZSxFQUFFLElBQUksS0FBSyxNQUFNO1NBQ2hDLENBQUE7UUFFRCxLQUFLLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsd0RBQXdEO1FBQ3hELDRDQUE0QztRQUM1QyxJQUFJLGVBQWUsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNyQyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDekQsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVLENBQ1QsTUFBbUIsRUFDbkIsTUFBdUIsRUFDdkIsT0FBd0IsRUFDeEIsZUFBb0Q7UUFFcEQsMkVBQTJFO1FBQzNFLG1DQUFtQztRQUNuQyxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzlDLENBQUM7UUFFRCxxQkFBcUI7YUFDaEIsQ0FBQztZQUNMLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRTtnQkFDNUQsR0FBRyxlQUFlO2dCQUNsQixRQUFRLEVBQUUsSUFBSTthQUNkLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtJQUVaLHVCQUF1QjtJQUV2QixLQUFLLENBQUMsV0FBVyxDQUNoQixTQUFrQyxJQUFJLENBQUMsWUFBWSxJQUFJLFNBQVMsRUFDaEUsT0FBNkI7UUFFN0IsT0FBTyxJQUFJLENBQUMscUNBQXFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFTyxLQUFLLENBQUMscUNBQXFDLENBQ2xELFNBQWtDLElBQUksQ0FBQyxZQUFZLElBQUksU0FBUyxFQUNoRSxPQUE2QixFQUM3QixlQUE2QztRQUU3QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3pELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxXQUFXO1FBQ1gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUVuRSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxhQUFhLENBQ3BCLE1BQW1CLEVBQ25CLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsS0FBSyxJQUFJLEVBQ3BELGVBQTZDO1FBRTdDLCtEQUErRDtRQUMvRCxJQUFJLENBQUMsZUFBZSxFQUFFLGVBQWUsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsaURBQWlEO2FBQzVDLENBQUM7WUFDTCxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFFRCwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLG1CQUFtQixDQUMxQixhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEtBQUssSUFBSSxFQUNwRCxlQUE2QztRQUU3QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQ3ZDLE1BQU0sWUFBWSxHQUFHLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFNUUsb0ZBQW9GO1FBQ3BGLGtGQUFrRjtRQUNsRixxRkFBcUY7UUFDckYsZ0ZBQWdGO1FBQ2hGLGtGQUFrRjtRQUNsRixnRkFBZ0Y7UUFDaEYscUJBQXFCO1FBQ3JCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFBO1FBQ3BFLElBQUksZUFBZSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4RCxNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUywwQ0FBa0MsQ0FBQTtZQUM1RixNQUFNLGVBQWUsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLDJDQUEyQztZQUMvRixJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNsQixlQUFlLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ3hCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ3JELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELGVBQWU7UUFDZixJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUVELDZDQUE2QztRQUM3QyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFBO1FBQ2hELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixJQUFJLFVBQVUsR0FBaUMsU0FBUyxDQUFBO1lBQ3hELElBQUksYUFBYSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMzRCx5REFBeUQ7Z0JBQ3pELHNEQUFzRDtnQkFDdEQsK0NBQStDO2dCQUMvQyxvREFBb0Q7Z0JBQ3BELFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUE7WUFDdkMsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFtQjtnQkFDL0IsYUFBYTtnQkFDYixVQUFVO2dCQUNWLDJGQUEyRjtnQkFDM0YsMEZBQTBGO2dCQUMxRiwyRkFBMkY7Z0JBQzNGLDJGQUEyRjtnQkFDM0YsdUNBQXVDO2dCQUN2QyxXQUFXLEVBQUUsZUFBZSxFQUFFLFNBQVM7YUFDdkMsQ0FBQTtZQUVELE1BQU0seUJBQXlCLEdBQStCO2dCQUM3RCwrREFBK0Q7Z0JBQy9ELCtEQUErRDtnQkFDL0Qsa0VBQWtFO2dCQUNsRSxtQkFBbUIsRUFBRSxJQUFJO2FBQ3pCLENBQUE7WUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3hFLENBQUM7UUFFRCxzRUFBc0U7YUFDakUsQ0FBQztZQUNMLHlCQUF5QjtZQUN6QixJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUMzQyxDQUFDO1lBRUQsc0VBQXNFO1lBQ3RFLElBQUksWUFBWSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNiLENBQUM7WUFFRCxTQUFTO1lBQ1QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1lBRXpELGtDQUFrQztZQUNsQyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDakQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsTUFBZTtRQUN6QyxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3hDLElBQUksYUFBYSxLQUFLLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakQsT0FBTyxJQUFJLENBQUEsQ0FBQyx1REFBdUQ7UUFDcEUsQ0FBQztRQUVELHlFQUF5RTtRQUN6RSxPQUFPLFVBQVUsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVPLHFCQUFxQixDQUM1QixNQUFtQixFQUNuQixlQUE2QztRQUU3QyxlQUFlO1FBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRU8sS0FBSyxDQUFDLHVCQUF1QixDQUFDLE9BQXNCO1FBQzNELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckIsT0FBTyxLQUFLLENBQUEsQ0FBQyxVQUFVO1FBQ3hCLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFHLENBQUE7UUFFL0IsK0VBQStFO1FBQy9FLCtFQUErRTtRQUMvRSxJQUFJLDhCQUE4QixHQUFHLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEYsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7WUFDckMsOEJBQThCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLDhCQUE4QixDQUFDLENBQUE7UUFDaEYsQ0FBQztRQUVELElBQUksSUFBYSxDQUFBO1FBQ2pCLElBQUksQ0FBQztZQUNKLElBQUksR0FBRyxNQUFNLDhCQUE4QixDQUFBO1FBQzVDLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFTyxLQUFLLENBQUMseUJBQXlCLENBQ3RDLE1BQW1CLEVBQ25CLE9BQW1DO1FBRW5DLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLEtBQUssQ0FBQSxDQUFDLFVBQVU7UUFDeEIsQ0FBQztRQUVELElBQUksTUFBTSxZQUFZLHFCQUFxQixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3BGLE9BQU8sS0FBSyxDQUFBLENBQUMsd0RBQXdEO1FBQ3RFLENBQUM7UUFFRCxnRkFBZ0Y7UUFDaEYsK0VBQStFO1FBQy9FLGlGQUFpRjtRQUNqRiw0QkFBNEI7UUFDNUIsK0VBQStFO1FBQy9FLHFFQUFxRTtRQUVyRSxJQUNDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQzlDLElBQUksU0FBUyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUN4QixPQUFPLEtBQUssQ0FBQSxDQUFDLDRDQUE0QztZQUMxRCxDQUFDO1lBRUQsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFBO1lBQzVCLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQy9FLE9BQU8sSUFBSSxDQUFBLENBQUMsK0RBQStEO1lBQzVFLENBQUM7WUFFRCxJQUFJLE1BQU0sWUFBWSxxQkFBcUIsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNwRixPQUFPLElBQUksQ0FBQSxDQUFDLG1EQUFtRDtZQUNoRSxDQUFDO1lBRUQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDLENBQUMsRUFDRCxDQUFDO1lBQ0YsT0FBTyxLQUFLLENBQUEsQ0FBQywwQ0FBMEM7UUFDeEQsQ0FBQztRQUVELGlFQUFpRTtRQUNqRSw4QkFBOEI7UUFDOUIsNEVBQTRFO1FBQzVFLDZEQUE2RDtRQUM3RCwyRUFBMkU7UUFDM0UsSUFBSSxZQUFZLCtCQUF1QixDQUFBO1FBQ3ZDLElBQUksVUFBVSw4QkFBc0IsQ0FBQTtRQUNwQyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDcEIsSUFDQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLDBDQUFrQztZQUN2RCxDQUFDLE9BQU8sRUFBRSxZQUFZO1lBQ3RCLENBQUMsTUFBTSxDQUFDLFlBQVksRUFDbkIsQ0FBQztZQUNGLHNFQUFzRTtZQUN0RSwwREFBMEQ7WUFDMUQsSUFDQyxJQUFJLENBQUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUkseUNBQWlDLEVBQzNGLENBQUM7Z0JBQ0YsUUFBUSxHQUFHLElBQUksQ0FBQTtnQkFDZixZQUFZLDZCQUFxQixDQUFBO2dCQUNqQyxVQUFVLGtDQUEwQixDQUFBO1lBQ3JDLENBQUM7WUFFRCxvRUFBb0U7WUFDcEUsaURBQWlEO1lBQ2pELDBEQUEwRDtpQkFDckQsSUFDSixRQUFRO2dCQUNSLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQztnQkFDdEIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJO3lEQUM3QixFQUM3QixDQUFDO2dCQUNGLFFBQVEsR0FBRyxJQUFJLENBQUE7Z0JBQ2YsWUFBWSw2QkFBcUIsQ0FBQTtnQkFDakMsVUFBVSxtQ0FBMkIsQ0FBQTtZQUN0QyxDQUFDO1FBQ0YsQ0FBQztRQUVELHdFQUF3RTtRQUN4RSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixrRkFBa0Y7WUFDbEYsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEMsQ0FBQztZQUVELGtFQUFrRTtZQUNsRSxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUVyRCxnREFBZ0Q7WUFDaEQsSUFBSSxPQUFPLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUN4RCxZQUFZLEdBQUcsTUFBTSxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pGLENBQUM7WUFFRCxvQ0FBb0M7aUJBQy9CLENBQUM7Z0JBQ0wsSUFBSSxJQUFZLENBQUE7Z0JBQ2hCLElBQUksTUFBTSxZQUFZLHFCQUFxQixFQUFFLENBQUM7b0JBQzdDLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBLENBQUMsNERBQTREO2dCQUM3RixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDeEIsQ0FBQztnQkFFRCxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUNwRSxDQUFDO1FBQ0YsQ0FBQztRQUVELG1FQUFtRTtRQUNuRSxnRUFBZ0U7UUFDaEUsb0VBQW9FO1FBQ3BFLHlFQUF5RTtRQUN6RSxrREFBa0Q7UUFDbEQsd0VBQXdFO1FBQ3hFLDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzlELE9BQU8sWUFBWSxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7UUFDNUQsQ0FBQztRQUVELGdDQUFnQztRQUNoQyxRQUFRLFlBQVksRUFBRSxDQUFDO1lBQ3RCLCtCQUF1QixDQUFDLENBQUMsQ0FBQztnQkFDekIsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtnQkFDakUsSUFBSSxDQUFDLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDekIsOERBQThEO29CQUM5RCw2REFBNkQ7b0JBQzdELDBCQUEwQjtvQkFDMUIsMERBQTBEO29CQUMxRCxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDdEUsQ0FBQztnQkFFRCxPQUFPLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQSxDQUFDLHNCQUFzQjtZQUMvQyxDQUFDO1lBQ0Q7Z0JBQ0MsSUFBSSxDQUFDO29CQUNKLDBFQUEwRTtvQkFDMUUsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFFNUIsT0FBTyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUEsQ0FBQyxzQkFBc0I7Z0JBQy9DLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBRTVCLHdFQUF3RTtvQkFDeEUsdUVBQXVFO29CQUN2RSx1RUFBdUU7b0JBQ3ZFLDBDQUEwQztvQkFFMUMsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtvQkFFNUMsT0FBTyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUEsQ0FBQyxzQkFBc0I7Z0JBQy9DLENBQUM7WUFDRjtnQkFDQyxPQUFPLElBQUksQ0FBQSxDQUFDLE9BQU87UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxNQUFtQjtRQUM3QyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN6QixPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUEsQ0FBQywyQ0FBMkM7UUFDckYsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBLENBQUMsc0NBQXNDO0lBQ3JGLENBQUM7SUFFRCxZQUFZO0lBRVosd0JBQXdCO0lBRXhCLEtBQUssQ0FBQyxZQUFZLENBQ2pCLElBQXlDLEVBQ3pDLE9BQTZCO1FBRTdCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUU5QyxrQ0FBa0M7UUFDbEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxXQUFXO1FBQ1gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFckMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sbUJBQW1CLENBQUMsSUFBeUM7UUFDcEUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQ25CLE1BQU0sWUFBWSxHQUFHLE9BQU8sTUFBTSxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUE7UUFFekQsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQ3pDLFlBQVksQ0FBQyxDQUFDLGlDQUF5QixDQUFDLDBDQUFrQyxFQUMxRSxNQUFNLENBQ04sQ0FBQSxDQUFDLGtEQUFrRDtRQUVwRCwrQkFBK0I7UUFDL0IsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdEIsY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzNGLENBQUM7UUFFRCxtQ0FBbUM7YUFDOUIsSUFBSSxZQUFZLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hDLGNBQWM7Z0JBQ2IsTUFBTSxDQUFDLFNBQVMsZ0NBQXdCO29CQUN2QyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFDNUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRixDQUFDO1FBRUQsaUJBQWlCO2FBQ1osSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQ3JDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQzNELENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxjQUFjLENBQUE7SUFDdEIsQ0FBQztJQUVPLGNBQWMsQ0FBQyxPQUFzQixFQUFFLE9BQTZCO1FBQzNFLG1DQUFtQztRQUNuQyxJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtRQUM3QixLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNuQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsaUJBQWlCLEdBQUcsSUFBSSxDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBRUQsaUVBQWlFO1FBQ2pFLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFFRCwyQkFBMkI7UUFDM0IsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDeEMsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO0lBRVosMkJBQTJCO0lBRTNCLEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBaUM7UUFDdEQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsZ0ZBQWdGO1lBQ2hGLCtFQUErRTtZQUMvRSxpRUFBaUU7WUFDakUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNsRCxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSw0Q0FBb0MsT0FBTyxDQUFDLENBQUE7UUFDL0UsSUFBSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztZQUNoQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN2RSxDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3hELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxXQUFXO1FBQ1gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRS9CLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLGlCQUFpQixDQUFDLE9BQWlDO1FBQzFELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxrQ0FBMEIsT0FBTyxDQUFDLENBQUE7UUFDckUsSUFBSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztZQUNoQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN2RSxDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLE1BQU0sY0FBYyxHQUFrQixFQUFFLENBQUE7UUFDeEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbkMsQ0FBQztZQUVELGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELDBFQUEwRTtRQUMxRSxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUNyRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUMzQixDQUFDO1FBRUQsMkJBQTJCO1FBQzNCLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtJQUVaLDBCQUEwQjtJQUUxQixLQUFLLENBQUMsY0FBYyxDQUFDLE9BQTRCO1FBQ2hELDJDQUEyQztRQUMzQyxJQUFJLGlCQUFnRCxDQUFBO1FBQ3BELE1BQU0sb0JBQW9CLEdBQXdCLEVBQUUsQ0FBQTtRQUNwRCxLQUFLLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ3pFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMzQyxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFFNUMsMERBQTBEO2dCQUMxRCxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO2dCQUN0QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUE7Z0JBQ3BCLENBQUM7Z0JBRUQsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLGNBQWMsQ0FBQTtnQkFDbEMsT0FBTyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQSxDQUFDLCtDQUErQztnQkFFdkYsTUFBTSxlQUFlLEdBQUcsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFBO2dCQUMzRSxJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUNwQixpQkFBaUIsR0FBRyxlQUFlLENBQUE7Z0JBQ3BDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7Z0JBQzNDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELHdCQUF3QjtRQUN4QixLQUFLLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDeEYsdUJBQXVCO1lBQ3ZCLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFFN0MsbURBQW1EO1lBQ25ELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQTtnQkFDbEIsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO29CQUN2QixJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtvQkFDekUsTUFBTSxHQUFHLElBQUksQ0FBQTtnQkFDZCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLHFDQUFxQyxDQUN4RCxNQUFNLEVBQ04sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQ3ZCLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUN2QyxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNiLE9BQU0sQ0FBQyxXQUFXO2dCQUNuQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLG9DQUFvQztZQUNwQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQ3pDLGlCQUFpQixDQUFDLFdBQVcsRUFDN0IsaUJBQWlCLENBQUMsT0FBTyxDQUN6QixDQUFBO1lBRUQsaURBQWlEO1lBQ2pELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RFLElBQUksaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDekMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFO3dCQUNsRCxPQUFPLEVBQUUsa0JBQWtCLENBQUMsT0FBTztxQkFDbkMsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLElBQUksQ0FBQyxxQ0FBcUMsQ0FDL0MsaUJBQWlCLENBQUMsTUFBTSxFQUN4QixFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFDdkIsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQ3ZDLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLGdCQUFnQixDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtJQUVaLGlCQUFpQjtJQUVqQixJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLENBQUMsTUFBZTtRQUNuQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBRUQsWUFBWTtJQUVaLHdCQUF3QjtJQUV4QixtQkFBbUIsQ0FBQyxXQUE0QjtRQUMvQyxJQUFJLE9BQU8sR0FBK0IsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQTtRQUV4RSxJQUFJLFdBQVcsQ0FBQTtRQUVmLHVGQUF1RjtRQUN2RixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtRQUM5QyxJQUFJLGdCQUFnQixZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sNkJBQTZCLEdBQ2xDLGdCQUFnQixDQUFDLHVCQUF1QixJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQTtZQUN6RSxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN0QyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLDZCQUE2QixFQUFFO2dCQUM5RSwyQkFBMkIsRUFBRSxJQUFJO2dCQUNqQyxrQkFBa0IsRUFBRSxDQUFDO2FBQ3JCLENBQUMsQ0FDRixDQUFBO1lBQ0QsV0FBVyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUE7WUFFekMsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLE1BQXFCLEVBQUUsS0FBYSxFQUFFLEVBQUUsQ0FDbEUsS0FBSyxLQUFLLFlBQVksSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUE7WUFFckQsT0FBTyxHQUFHLG1CQUFtQixDQUM1QixlQUFlLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFDeEYsWUFBWSxFQUNaLGlCQUFpQixDQUNqQixDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCwrRUFBK0U7WUFDL0UsMERBQTBEO1lBQzFELE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1lBQ3pELFdBQVcsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFBO1lBQ2hDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekUsQ0FBQztRQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUVELFlBQVk7SUFFWixrQkFBa0I7SUFFVCxZQUFZO1FBQ3BCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFFNUIsWUFBWTtRQUNaLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN4RixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUE7UUFDeEMsQ0FBQztRQUVELGdCQUFnQjtRQUNoQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUM5RixJQUFJLENBQUMsT0FBTyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQ3hELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyw2QkFBNkIsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNsRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQzNELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1FBQ3hFLENBQUM7UUFFRCxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUE7UUFDaEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZUFBZTtZQUN4QyxJQUFJLENBQUMsUUFBUSxDQUNaLFFBQVEsS0FBSyxVQUFVO2dCQUN0QixDQUFDLENBQUMsbUNBQW1DO2dCQUNyQyxDQUFDLENBQUMsc0NBQXNDLENBQ3pDLElBQUksRUFBRSxDQUFBO1FBRVIsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ25GLENBQUM7SUFRRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFBO0lBQ3BDLENBQUM7SUFDRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQTtJQUNyQyxDQUFDO0lBQ0QsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQTtJQUNwQyxDQUFDO0lBQ0QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUE7SUFDckMsQ0FBQztJQUVELElBQUksa0JBQWtCO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxDQUFDLENBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsYUFBYSxDQUM1RixDQUFBO0lBQ0YsQ0FBQztJQUtELE1BQU0sQ0FBQyxLQUFhLEVBQUUsTUFBYyxFQUFFLEdBQVcsRUFBRSxJQUFZO1FBQzlELElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUM5QyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBRWhFLGlFQUFpRTtRQUNqRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO1lBQ2pELFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1NBQ3ZFLENBQUMsQ0FBQTtRQUVGLCtCQUErQjtRQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFBO1FBRTNGLHFFQUFxRTtRQUNyRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsWUFBWSxJQUFJLENBQUE7UUFDdkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDdEIsS0FBSztZQUNMLE1BQU0sRUFBRSxZQUFZO1lBQ3BCLEdBQUcsRUFBRSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsTUFBTTtZQUNsQyxJQUFJO1NBQ0osQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtZQUNwRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBRUQsaUJBQWlCLENBQUMsTUFBdUI7UUFDeEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsTUFBTTtRQUNMLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsWUFBWTtJQUVILE9BQU87UUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUVyQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRTFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0NBQ0QsQ0FBQTtBQTcrRVksZUFBZTtJQXlJekIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsWUFBWSxDQUFBO0lBQ1osWUFBQSxtQkFBbUIsQ0FBQTtJQUNuQixZQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSwwQkFBMEIsQ0FBQTtJQUUxQixZQUFBLG1CQUFtQixDQUFBO0lBQ25CLFlBQUEsV0FBVyxDQUFBO0lBQ1gsWUFBQSxzQkFBc0IsQ0FBQTtJQUN0QixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxZQUFZLENBQUE7R0F6SkYsZUFBZSxDQTYrRTNCIn0=