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
var OpenEditorsView_1;
import './media/openeditors.css';
import * as nls from '../../../../../nls.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { ActionRunner, } from '../../../../../base/common/actions.js';
import * as dom from '../../../../../base/browser/dom.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { EditorResourceAccessor, SideBySideEditor, preventEditorClose, EditorCloseMethod, } from '../../../../common/editor.js';
import { SaveAllInGroupAction, CloseGroupAction } from '../fileActions.js';
import { OpenEditorsFocusedContext, ExplorerFocusedContext, OpenEditor, } from '../../common/files.js';
import { CloseAllEditorsAction, CloseEditorAction, UnpinEditorAction, } from '../../../../browser/parts/editor/editorActions.js';
import { IContextKeyService, ContextKeyExpr, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { asCssVariable, badgeBackground, badgeForeground, contrastBorder, } from '../../../../../platform/theme/common/colorRegistry.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { DisposableMap, dispose } from '../../../../../base/common/lifecycle.js';
import { MenuId, Action2, registerAction2, MenuRegistry, } from '../../../../../platform/actions/common/actions.js';
import { OpenEditorsDirtyEditorContext, OpenEditorsGroupContext, OpenEditorsReadonlyEditorContext, SAVE_ALL_LABEL, SAVE_ALL_COMMAND_ID, NEW_UNTITLED_FILE_COMMAND_ID, OpenEditorsSelectedFileOrUntitledContext, } from '../fileConstants.js';
import { ResourceContextKey, MultipleEditorGroupsContext } from '../../../../common/contextkeys.js';
import { CodeDataTransfers, containsDragType } from '../../../../../platform/dnd/browser/dnd.js';
import { ResourcesDropHandler, fillEditorsDragData } from '../../../../browser/dnd.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { DataTransfers } from '../../../../../base/browser/dnd.js';
import { memoize } from '../../../../../base/common/decorators.js';
import { ElementsDragAndDropData, NativeDragAndDropData, } from '../../../../../base/browser/ui/list/listView.js';
import { IWorkingCopyService } from '../../../../services/workingCopy/common/workingCopyService.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { compareFileNamesDefault } from '../../../../../base/common/comparers.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../../base/common/network.js';
import { extUriIgnorePathCase } from '../../../../../base/common/resources.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { EditorGroupView } from '../../../../browser/parts/editor/editorGroupView.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
const $ = dom.$;
let OpenEditorsView = class OpenEditorsView extends ViewPane {
    static { OpenEditorsView_1 = this; }
    static { this.DEFAULT_VISIBLE_OPEN_EDITORS = 9; }
    static { this.DEFAULT_MIN_VISIBLE_OPEN_EDITORS = 0; }
    static { this.ID = 'workbench.explorer.openEditorsView'; }
    static { this.NAME = nls.localize2({ key: 'openEditors', comment: ['Open is an adjective'] }, 'Open Editors'); }
    constructor(options, instantiationService, viewDescriptorService, contextMenuService, editorGroupService, configurationService, keybindingService, contextKeyService, themeService, telemetryService, hoverService, workingCopyService, filesConfigurationService, openerService, fileService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorGroupService = editorGroupService;
        this.telemetryService = telemetryService;
        this.workingCopyService = workingCopyService;
        this.filesConfigurationService = filesConfigurationService;
        this.fileService = fileService;
        this.needsRefresh = false;
        this.elements = [];
        this.blockFocusActiveEditorTracking = false;
        this.structuralRefreshDelay = 0;
        this.sortOrder = configurationService.getValue('explorer.openEditors.sortOrder');
        this.registerUpdateEvents();
        // Also handle configuration updates
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationChange(e)));
        // Handle dirty counter
        this._register(this.workingCopyService.onDidChangeDirty((workingCopy) => this.updateDirtyIndicator(workingCopy)));
    }
    registerUpdateEvents() {
        const updateWholeList = () => {
            if (!this.isBodyVisible() || !this.list) {
                this.needsRefresh = true;
                return;
            }
            this.listRefreshScheduler?.schedule(this.structuralRefreshDelay);
        };
        const groupDisposables = this._register(new DisposableMap());
        const addGroupListener = (group) => {
            const groupModelChangeListener = group.onDidModelChange((e) => {
                if (this.listRefreshScheduler?.isScheduled()) {
                    return;
                }
                if (!this.isBodyVisible() || !this.list) {
                    this.needsRefresh = true;
                    return;
                }
                const index = this.getIndex(group, e.editor);
                switch (e.kind) {
                    case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                        this.focusActiveEditor();
                        break;
                    case 1 /* GroupModelChangeKind.GROUP_INDEX */:
                    case 2 /* GroupModelChangeKind.GROUP_LABEL */:
                        if (index >= 0) {
                            this.list.splice(index, 1, [group]);
                        }
                        break;
                    case 14 /* GroupModelChangeKind.EDITOR_DIRTY */:
                    case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                    case 10 /* GroupModelChangeKind.EDITOR_CAPABILITIES */:
                    case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                    case 9 /* GroupModelChangeKind.EDITOR_LABEL */:
                        this.list.splice(index, 1, [new OpenEditor(e.editor, group)]);
                        this.focusActiveEditor();
                        break;
                    case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                    case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                    case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                        updateWholeList();
                        break;
                }
            });
            groupDisposables.set(group.id, groupModelChangeListener);
        };
        this.editorGroupService.groups.forEach((g) => addGroupListener(g));
        this._register(this.editorGroupService.onDidAddGroup((group) => {
            addGroupListener(group);
            updateWholeList();
        }));
        this._register(this.editorGroupService.onDidMoveGroup(() => updateWholeList()));
        this._register(this.editorGroupService.onDidChangeActiveGroup(() => this.focusActiveEditor()));
        this._register(this.editorGroupService.onDidRemoveGroup((group) => {
            groupDisposables.deleteAndDispose(group.id);
            updateWholeList();
        }));
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.title);
        const count = dom.append(container, $('.open-editors-dirty-count-container'));
        this.dirtyCountElement = dom.append(count, $('.dirty-count.monaco-count-badge.long'));
        this.dirtyCountElement.style.backgroundColor = asCssVariable(badgeBackground);
        this.dirtyCountElement.style.color = asCssVariable(badgeForeground);
        this.dirtyCountElement.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        this.updateDirtyIndicator();
    }
    renderBody(container) {
        super.renderBody(container);
        container.classList.add('open-editors');
        container.classList.add('show-file-icons');
        const delegate = new OpenEditorsDelegate();
        if (this.list) {
            this.list.dispose();
        }
        if (this.listLabels) {
            this.listLabels.clear();
        }
        this.dnd = new OpenEditorsDragAndDrop(this.sortOrder, this.instantiationService, this.editorGroupService);
        this.listLabels = this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this.onDidChangeBodyVisibility,
        });
        this.list = this.instantiationService.createInstance(WorkbenchList, 'OpenEditors', container, delegate, [
            new EditorGroupRenderer(this.keybindingService, this.instantiationService),
            new OpenEditorRenderer(this.listLabels, this.instantiationService, this.keybindingService, this.configurationService),
        ], {
            identityProvider: {
                getId: (element) => element instanceof OpenEditor ? element.getId() : element.id.toString(),
            },
            dnd: this.dnd,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            accessibilityProvider: new OpenEditorsAccessibilityProvider(),
        });
        this._register(this.list);
        this._register(this.listLabels);
        // Register the refresh scheduler
        let labelChangeListeners = [];
        this.listRefreshScheduler = this._register(new RunOnceScheduler(() => {
            // No need to refresh the list if it's not rendered
            if (!this.list) {
                return;
            }
            labelChangeListeners = dispose(labelChangeListeners);
            const previousLength = this.list.length;
            const elements = this.getElements();
            this.list.splice(0, this.list.length, elements);
            this.focusActiveEditor();
            if (previousLength !== this.list.length) {
                this.updateSize();
            }
            this.needsRefresh = false;
            if (this.sortOrder === 'alphabetical' || this.sortOrder === 'fullPath') {
                // We need to resort the list if the editor label changed
                elements.forEach((e) => {
                    if (e instanceof OpenEditor) {
                        labelChangeListeners.push(e.editor.onDidChangeLabel(() => this.listRefreshScheduler?.schedule()));
                    }
                });
            }
        }, this.structuralRefreshDelay));
        this.updateSize();
        this.handleContextKeys();
        this._register(this.list.onContextMenu((e) => this.onListContextMenu(e)));
        // Open when selecting via keyboard
        this._register(this.list.onMouseMiddleClick((e) => {
            if (e && e.element instanceof OpenEditor) {
                if (preventEditorClose(e.element.group, e.element.editor, EditorCloseMethod.MOUSE, this.editorGroupService.partOptions)) {
                    return;
                }
                e.element.group.closeEditor(e.element.editor, { preserveFocus: true });
            }
        }));
        this._register(this.list.onDidOpen((e) => {
            const element = e.element;
            if (!element) {
                return;
            }
            else if (element instanceof OpenEditor) {
                if (dom.isMouseEvent(e.browserEvent) && e.browserEvent.button === 1) {
                    return; // middle click already handled above: closes the editor
                }
                this.withActiveEditorFocusTrackingDisabled(() => {
                    this.openEditor(element, {
                        preserveFocus: e.editorOptions.preserveFocus,
                        pinned: e.editorOptions.pinned,
                        sideBySide: e.sideBySide,
                    });
                });
            }
            else {
                this.withActiveEditorFocusTrackingDisabled(() => {
                    this.editorGroupService.activateGroup(element);
                    if (!e.editorOptions.preserveFocus) {
                        element.focus();
                    }
                });
            }
        }));
        this.listRefreshScheduler.schedule(0);
        this._register(this.onDidChangeBodyVisibility((visible) => {
            if (visible && this.needsRefresh) {
                this.listRefreshScheduler?.schedule(0);
            }
        }));
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        this._register(containerModel.onDidChangeAllViewDescriptors(() => {
            this.updateSize();
        }));
    }
    handleContextKeys() {
        if (!this.list) {
            return;
        }
        // Bind context keys
        OpenEditorsFocusedContext.bindTo(this.list.contextKeyService);
        ExplorerFocusedContext.bindTo(this.list.contextKeyService);
        const groupFocusedContext = OpenEditorsGroupContext.bindTo(this.contextKeyService);
        const dirtyEditorFocusedContext = OpenEditorsDirtyEditorContext.bindTo(this.contextKeyService);
        const readonlyEditorFocusedContext = OpenEditorsReadonlyEditorContext.bindTo(this.contextKeyService);
        const openEditorsSelectedFileOrUntitledContext = OpenEditorsSelectedFileOrUntitledContext.bindTo(this.contextKeyService);
        const resourceContext = this.instantiationService.createInstance(ResourceContextKey);
        this._register(resourceContext);
        this._register(this.list.onDidChangeFocus((e) => {
            resourceContext.reset();
            groupFocusedContext.reset();
            dirtyEditorFocusedContext.reset();
            readonlyEditorFocusedContext.reset();
            const element = e.elements.length ? e.elements[0] : undefined;
            if (element instanceof OpenEditor) {
                const resource = element.getResource();
                dirtyEditorFocusedContext.set(element.editor.isDirty() && !element.editor.isSaving());
                readonlyEditorFocusedContext.set(!!element.editor.isReadonly());
                resourceContext.set(resource ?? null);
            }
            else if (!!element) {
                groupFocusedContext.set(true);
            }
        }));
        this._register(this.list.onDidChangeSelection((e) => {
            const selectedAreFileOrUntitled = e.elements.every((e) => {
                if (e instanceof OpenEditor) {
                    const resource = e.getResource();
                    return (resource &&
                        (resource.scheme === Schemas.untitled || this.fileService.hasProvider(resource)));
                }
                return false;
            });
            openEditorsSelectedFileOrUntitledContext.set(selectedAreFileOrUntitled);
        }));
    }
    focus() {
        super.focus();
        this.list?.domFocus();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.list?.layout(height, width);
    }
    get showGroups() {
        return this.editorGroupService.groups.length > 1;
    }
    getElements() {
        this.elements = [];
        this.editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */).forEach((g) => {
            if (this.showGroups) {
                this.elements.push(g);
            }
            let editors = g.editors.map((ei) => new OpenEditor(ei, g));
            if (this.sortOrder === 'alphabetical') {
                editors = editors.sort((first, second) => compareFileNamesDefault(first.editor.getName(), second.editor.getName()));
            }
            else if (this.sortOrder === 'fullPath') {
                editors = editors.sort((first, second) => {
                    const firstResource = first.editor.resource;
                    const secondResource = second.editor.resource;
                    //put 'system' editors before everything
                    if (firstResource === undefined && secondResource === undefined) {
                        return compareFileNamesDefault(first.editor.getName(), second.editor.getName());
                    }
                    else if (firstResource === undefined) {
                        return -1;
                    }
                    else if (secondResource === undefined) {
                        return 1;
                    }
                    else {
                        const firstScheme = firstResource.scheme;
                        const secondScheme = secondResource.scheme;
                        //put non-file editors before files
                        if (firstScheme !== Schemas.file && secondScheme !== Schemas.file) {
                            return extUriIgnorePathCase.compare(firstResource, secondResource);
                        }
                        else if (firstScheme !== Schemas.file) {
                            return -1;
                        }
                        else if (secondScheme !== Schemas.file) {
                            return 1;
                        }
                        else {
                            return extUriIgnorePathCase.compare(firstResource, secondResource);
                        }
                    }
                });
            }
            this.elements.push(...editors);
        });
        return this.elements;
    }
    getIndex(group, editor) {
        if (!editor) {
            return this.elements.findIndex((e) => !(e instanceof OpenEditor) && e.id === group.id);
        }
        return this.elements.findIndex((e) => e instanceof OpenEditor && e.editor === editor && e.group.id === group.id);
    }
    openEditor(element, options) {
        if (element) {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: 'workbench.files.openFile', from: 'openEditors' });
            const preserveActivateGroup = options.sideBySide && options.preserveFocus; // needed for https://github.com/microsoft/vscode/issues/42399
            if (!preserveActivateGroup) {
                this.editorGroupService.activateGroup(element.group); // needed for https://github.com/microsoft/vscode/issues/6672
            }
            const targetGroup = options.sideBySide ? this.editorGroupService.sideGroup : element.group;
            targetGroup.openEditor(element.editor, options);
        }
    }
    onListContextMenu(e) {
        if (!e.element) {
            return;
        }
        const element = e.element;
        this.contextMenuService.showContextMenu({
            menuId: MenuId.OpenEditorsContext,
            menuActionOptions: {
                shouldForwardArgs: true,
                arg: element instanceof OpenEditor
                    ? EditorResourceAccessor.getOriginalUri(element.editor)
                    : {},
            },
            contextKeyService: this.list?.contextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => element instanceof OpenEditor
                ? {
                    groupId: element.groupId,
                    editorIndex: element.group.getIndexOfEditor(element.editor),
                }
                : { groupId: element.id },
        });
    }
    withActiveEditorFocusTrackingDisabled(fn) {
        this.blockFocusActiveEditorTracking = true;
        try {
            fn();
        }
        finally {
            this.blockFocusActiveEditorTracking = false;
        }
    }
    focusActiveEditor() {
        if (!this.list || this.blockFocusActiveEditorTracking) {
            return;
        }
        if (this.list.length && this.editorGroupService.activeGroup) {
            const index = this.getIndex(this.editorGroupService.activeGroup, this.editorGroupService.activeGroup.activeEditor);
            if (index >= 0) {
                try {
                    this.list.setFocus([index]);
                    this.list.setSelection([index]);
                    this.list.reveal(index);
                }
                catch (e) {
                    // noop list updated in the meantime
                }
                return;
            }
        }
        this.list.setFocus([]);
        this.list.setSelection([]);
    }
    onConfigurationChange(event) {
        if (event.affectsConfiguration('explorer.openEditors')) {
            this.updateSize();
        }
        // Trigger a 'repaint' when decoration settings change or the sort order changed
        if (event.affectsConfiguration('explorer.decorations') ||
            event.affectsConfiguration('explorer.openEditors.sortOrder')) {
            this.sortOrder = this.configurationService.getValue('explorer.openEditors.sortOrder');
            if (this.dnd) {
                this.dnd.sortOrder = this.sortOrder;
            }
            this.listRefreshScheduler?.schedule();
        }
    }
    updateSize() {
        // Adjust expanded body size
        this.minimumBodySize =
            this.orientation === 0 /* Orientation.VERTICAL */ ? this.getMinExpandedBodySize() : 170;
        this.maximumBodySize =
            this.orientation === 0 /* Orientation.VERTICAL */
                ? this.getMaxExpandedBodySize()
                : Number.POSITIVE_INFINITY;
    }
    updateDirtyIndicator(workingCopy) {
        if (workingCopy) {
            const gotDirty = workingCopy.isDirty();
            if (gotDirty &&
                !(workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) &&
                this.filesConfigurationService.hasShortAutoSaveDelay(workingCopy.resource)) {
                return; // do not indicate dirty of working copies that are auto saved after short delay
            }
        }
        const dirty = this.workingCopyService.dirtyCount;
        if (dirty === 0) {
            this.dirtyCountElement.classList.add('hidden');
        }
        else {
            this.dirtyCountElement.textContent = nls.localize('dirtyCounter', '{0} unsaved', dirty);
            this.dirtyCountElement.classList.remove('hidden');
        }
    }
    get elementCount() {
        return this.editorGroupService.groups
            .map((g) => g.count)
            .reduce((first, second) => first + second, this.showGroups ? this.editorGroupService.groups.length : 0);
    }
    getMaxExpandedBodySize() {
        let minVisibleOpenEditors = this.configurationService.getValue('explorer.openEditors.minVisible');
        // If it's not a number setting it to 0 will result in dynamic resizing.
        if (typeof minVisibleOpenEditors !== 'number') {
            minVisibleOpenEditors = OpenEditorsView_1.DEFAULT_MIN_VISIBLE_OPEN_EDITORS;
        }
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        if (containerModel.visibleViewDescriptors.length <= 1) {
            return Number.POSITIVE_INFINITY;
        }
        return Math.max(this.elementCount, minVisibleOpenEditors) * OpenEditorsDelegate.ITEM_HEIGHT;
    }
    getMinExpandedBodySize() {
        let visibleOpenEditors = this.configurationService.getValue('explorer.openEditors.visible');
        if (typeof visibleOpenEditors !== 'number') {
            visibleOpenEditors = OpenEditorsView_1.DEFAULT_VISIBLE_OPEN_EDITORS;
        }
        return this.computeMinExpandedBodySize(visibleOpenEditors);
    }
    computeMinExpandedBodySize(visibleOpenEditors = OpenEditorsView_1.DEFAULT_VISIBLE_OPEN_EDITORS) {
        const itemsToShow = Math.min(Math.max(visibleOpenEditors, 1), this.elementCount);
        return itemsToShow * OpenEditorsDelegate.ITEM_HEIGHT;
    }
    setStructuralRefreshDelay(delay) {
        this.structuralRefreshDelay = delay;
    }
    getOptimalWidth() {
        if (!this.list) {
            return super.getOptimalWidth();
        }
        const parentNode = this.list.getHTMLElement();
        const childNodes = [].slice.call(parentNode.querySelectorAll('.open-editor > a'));
        return dom.getLargestChildWidth(parentNode, childNodes);
    }
};
OpenEditorsView = OpenEditorsView_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IViewDescriptorService),
    __param(3, IContextMenuService),
    __param(4, IEditorGroupsService),
    __param(5, IConfigurationService),
    __param(6, IKeybindingService),
    __param(7, IContextKeyService),
    __param(8, IThemeService),
    __param(9, ITelemetryService),
    __param(10, IHoverService),
    __param(11, IWorkingCopyService),
    __param(12, IFilesConfigurationService),
    __param(13, IOpenerService),
    __param(14, IFileService)
], OpenEditorsView);
export { OpenEditorsView };
class OpenEditorActionRunner extends ActionRunner {
    async run(action) {
        if (!this.editor) {
            return;
        }
        return super.run(action, {
            groupId: this.editor.groupId,
            editorIndex: this.editor.group.getIndexOfEditor(this.editor.editor),
        });
    }
}
class OpenEditorsDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(_element) {
        return OpenEditorsDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        if (element instanceof OpenEditor) {
            return OpenEditorRenderer.ID;
        }
        return EditorGroupRenderer.ID;
    }
}
class EditorGroupRenderer {
    static { this.ID = 'editorgroup'; }
    constructor(keybindingService, instantiationService) {
        this.keybindingService = keybindingService;
        this.instantiationService = instantiationService;
        // noop
    }
    get templateId() {
        return EditorGroupRenderer.ID;
    }
    renderTemplate(container) {
        const editorGroupTemplate = Object.create(null);
        editorGroupTemplate.root = dom.append(container, $('.editor-group'));
        editorGroupTemplate.name = dom.append(editorGroupTemplate.root, $('span.name'));
        editorGroupTemplate.actionBar = new ActionBar(container);
        const saveAllInGroupAction = this.instantiationService.createInstance(SaveAllInGroupAction, SaveAllInGroupAction.ID, SaveAllInGroupAction.LABEL);
        const saveAllInGroupKey = this.keybindingService.lookupKeybinding(saveAllInGroupAction.id);
        editorGroupTemplate.actionBar.push(saveAllInGroupAction, {
            icon: true,
            label: false,
            keybinding: saveAllInGroupKey ? saveAllInGroupKey.getLabel() : undefined,
        });
        const closeGroupAction = this.instantiationService.createInstance(CloseGroupAction, CloseGroupAction.ID, CloseGroupAction.LABEL);
        const closeGroupActionKey = this.keybindingService.lookupKeybinding(closeGroupAction.id);
        editorGroupTemplate.actionBar.push(closeGroupAction, {
            icon: true,
            label: false,
            keybinding: closeGroupActionKey ? closeGroupActionKey.getLabel() : undefined,
        });
        return editorGroupTemplate;
    }
    renderElement(editorGroup, _index, templateData) {
        templateData.editorGroup = editorGroup;
        templateData.name.textContent = editorGroup.label;
        templateData.actionBar.context = { groupId: editorGroup.id };
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
    }
}
class OpenEditorRenderer {
    static { this.ID = 'openeditor'; }
    constructor(labels, instantiationService, keybindingService, configurationService) {
        this.labels = labels;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.closeEditorAction = this.instantiationService.createInstance(CloseEditorAction, CloseEditorAction.ID, CloseEditorAction.LABEL);
        this.unpinEditorAction = this.instantiationService.createInstance(UnpinEditorAction, UnpinEditorAction.ID, UnpinEditorAction.LABEL);
        // noop
    }
    get templateId() {
        return OpenEditorRenderer.ID;
    }
    renderTemplate(container) {
        const editorTemplate = Object.create(null);
        editorTemplate.container = container;
        editorTemplate.actionRunner = new OpenEditorActionRunner();
        editorTemplate.actionBar = new ActionBar(container, {
            actionRunner: editorTemplate.actionRunner,
        });
        editorTemplate.root = this.labels.create(container);
        return editorTemplate;
    }
    renderElement(openedEditor, _index, templateData) {
        const editor = openedEditor.editor;
        templateData.actionRunner.editor = openedEditor;
        templateData.container.classList.toggle('dirty', editor.isDirty() && !editor.isSaving());
        templateData.container.classList.toggle('sticky', openedEditor.isSticky());
        templateData.root.setResource({
            resource: EditorResourceAccessor.getOriginalUri(editor, {
                supportSideBySide: SideBySideEditor.BOTH,
            }),
            name: editor.getName(),
            description: editor.getDescription(1 /* Verbosity.MEDIUM */),
        }, {
            italic: openedEditor.isPreview(),
            extraClasses: ['open-editor'].concat(openedEditor.editor.getLabelExtraClasses()),
            fileDecorations: this.configurationService.getValue().explorer.decorations,
            title: editor.getTitle(2 /* Verbosity.LONG */),
            icon: editor.getIcon(),
        });
        const editorAction = openedEditor.isSticky() ? this.unpinEditorAction : this.closeEditorAction;
        if (!templateData.actionBar.hasAction(editorAction)) {
            if (!templateData.actionBar.isEmpty()) {
                templateData.actionBar.clear();
            }
            templateData.actionBar.push(editorAction, {
                icon: true,
                label: false,
                keybinding: this.keybindingService.lookupKeybinding(editorAction.id)?.getLabel(),
            });
        }
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
        templateData.root.dispose();
        templateData.actionRunner.dispose();
    }
}
class OpenEditorsDragAndDrop {
    set sortOrder(value) {
        this._sortOrder = value;
    }
    constructor(sortOrder, instantiationService, editorGroupService) {
        this.instantiationService = instantiationService;
        this.editorGroupService = editorGroupService;
        this._sortOrder = sortOrder;
    }
    get dropHandler() {
        return this.instantiationService.createInstance(ResourcesDropHandler, {
            allowWorkspaceOpen: false,
        });
    }
    getDragURI(element) {
        if (element instanceof OpenEditor) {
            const resource = element.getResource();
            if (resource) {
                return resource.toString();
            }
        }
        return null;
    }
    getDragLabel(elements) {
        if (elements.length > 1) {
            return String(elements.length);
        }
        const element = elements[0];
        return element instanceof OpenEditor ? element.editor.getName() : element.label;
    }
    onDragStart(data, originalEvent) {
        const items = data.elements;
        const editors = [];
        if (items) {
            for (const item of items) {
                if (item instanceof OpenEditor) {
                    editors.push(item);
                }
            }
        }
        if (editors.length) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction(fillEditorsDragData, editors, originalEvent);
        }
    }
    onDragOver(data, _targetElement, _targetIndex, targetSector, originalEvent) {
        if (data instanceof NativeDragAndDropData) {
            if (!containsDragType(originalEvent, DataTransfers.FILES, CodeDataTransfers.FILES)) {
                return false;
            }
        }
        if (this._sortOrder !== 'editorOrder') {
            if (data instanceof ElementsDragAndDropData) {
                // No reordering supported when sorted
                return false;
            }
            else {
                // Allow droping files to open them
                return { accept: true, effect: { type: 1 /* ListDragOverEffectType.Move */ }, feedback: [-1] };
            }
        }
        let dropEffectPosition = undefined;
        switch (targetSector) {
            case 0 /* ListViewTargetSector.TOP */:
            case 1 /* ListViewTargetSector.CENTER_TOP */:
                dropEffectPosition =
                    _targetIndex === 0 && _targetElement instanceof EditorGroupView
                        ? "drop-target-after" /* ListDragOverEffectPosition.After */
                        : "drop-target-before" /* ListDragOverEffectPosition.Before */;
                break;
            case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
            case 3 /* ListViewTargetSector.BOTTOM */:
                dropEffectPosition = "drop-target-after" /* ListDragOverEffectPosition.After */;
                break;
        }
        return {
            accept: true,
            effect: { type: 1 /* ListDragOverEffectType.Move */, position: dropEffectPosition },
            feedback: [_targetIndex],
        };
    }
    drop(data, targetElement, _targetIndex, targetSector, originalEvent) {
        let group = targetElement instanceof OpenEditor
            ? targetElement.group
            : targetElement || this.editorGroupService.groups[this.editorGroupService.count - 1];
        let targetEditorIndex = targetElement instanceof OpenEditor
            ? targetElement.group.getIndexOfEditor(targetElement.editor)
            : 0;
        switch (targetSector) {
            case 0 /* ListViewTargetSector.TOP */:
            case 1 /* ListViewTargetSector.CENTER_TOP */:
                if (targetElement instanceof EditorGroupView && group.index !== 0) {
                    group = this.editorGroupService.groups[group.index - 1];
                    targetEditorIndex = group.count;
                }
                break;
            case 3 /* ListViewTargetSector.BOTTOM */:
            case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                if (targetElement instanceof OpenEditor) {
                    targetEditorIndex++;
                }
                break;
        }
        if (data instanceof ElementsDragAndDropData) {
            for (const oe of data.elements) {
                const sourceEditorIndex = oe.group.getIndexOfEditor(oe.editor);
                if (oe.group === group && sourceEditorIndex < targetEditorIndex) {
                    targetEditorIndex--;
                }
                oe.group.moveEditor(oe.editor, group, { index: targetEditorIndex, preserveFocus: true });
                targetEditorIndex++;
            }
            this.editorGroupService.activateGroup(group);
        }
        else {
            this.dropHandler.handleDrop(originalEvent, mainWindow, () => group, () => group.focus(), { index: targetEditorIndex });
        }
    }
    dispose() { }
}
__decorate([
    memoize
], OpenEditorsDragAndDrop.prototype, "dropHandler", null);
class OpenEditorsAccessibilityProvider {
    getWidgetAriaLabel() {
        return nls.localize('openEditors', 'Open Editors');
    }
    getAriaLabel(element) {
        if (element instanceof OpenEditor) {
            return `${element.editor.getName()}, ${element.editor.getDescription()}`;
        }
        return element.ariaLabel;
    }
}
const toggleEditorGroupLayoutId = 'workbench.action.toggleEditorGroupLayout';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleEditorGroupLayout',
            title: nls.localize2('flipLayout', 'Toggle Vertical/Horizontal Editor Layout'),
            f1: true,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 21 /* KeyCode.Digit0 */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 21 /* KeyCode.Digit0 */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: Codicon.editorLayout,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OpenEditorsView.ID), MultipleEditorGroupsContext),
                order: 10,
            },
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const newOrientation = editorGroupService.orientation === 1 /* GroupOrientation.VERTICAL */
            ? 0 /* GroupOrientation.HORIZONTAL */
            : 1 /* GroupOrientation.VERTICAL */;
        editorGroupService.setGroupOrientation(newOrientation);
        editorGroupService.activeGroup.focus();
    }
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '5_flip',
    command: {
        id: toggleEditorGroupLayoutId,
        title: {
            ...nls.localize2('miToggleEditorLayoutWithoutMnemonic', 'Flip Layout'),
            mnemonicTitle: nls.localize({ key: 'miToggleEditorLayout', comment: ['&& denotes a mnemonic'] }, 'Flip &&Layout'),
        },
    },
    order: 1,
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.files.saveAll',
            title: SAVE_ALL_LABEL,
            f1: true,
            icon: Codicon.saveAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', OpenEditorsView.ID),
                order: 20,
            },
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(SAVE_ALL_COMMAND_ID);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'openEditors.closeAll',
            title: CloseAllEditorsAction.LABEL,
            f1: false,
            icon: Codicon.closeAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', OpenEditorsView.ID),
                order: 30,
            },
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const closeAll = new CloseAllEditorsAction();
        await instantiationService.invokeFunction((accessor) => closeAll.run(accessor));
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'openEditors.newUntitledFile',
            title: nls.localize2('newUntitledFile', 'New Untitled Text File'),
            f1: false,
            icon: Codicon.newFile,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', OpenEditorsView.ID),
                order: 5,
            },
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(NEW_UNTITLED_FILE_COMMAND_ID);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbkVkaXRvcnNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL3ZpZXdzL29wZW5FZGl0b3JzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RFLE9BQU8sRUFFTixZQUFZLEdBR1osTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sb0JBQW9CLEdBSXBCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFFTixzQkFBc0IsRUFDdEIsZ0JBQWdCLEVBR2hCLGtCQUFrQixFQUNsQixpQkFBaUIsR0FDakIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUMxRSxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLHNCQUFzQixFQUV0QixVQUFVLEdBQ1YsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLGlCQUFpQixFQUNqQixpQkFBaUIsR0FDakIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGNBQWMsR0FDZCxNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQ04sYUFBYSxFQUNiLGVBQWUsRUFDZixlQUFlLEVBQ2YsY0FBYyxHQUNkLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBVW5GLE9BQU8sRUFBRSxjQUFjLEVBQWtCLE1BQU0sK0JBQStCLENBQUE7QUFDOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQWUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0YsT0FBTyxFQUNOLE1BQU0sRUFDTixPQUFPLEVBQ1AsZUFBZSxFQUNmLFlBQVksR0FDWixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsdUJBQXVCLEVBQ3ZCLGdDQUFnQyxFQUNoQyxjQUFjLEVBQ2QsbUJBQW1CLEVBQ25CLDRCQUE0QixFQUM1Qix3Q0FBd0MsR0FDeEMsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFdEUsT0FBTyxFQUFvQixhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUNOLHVCQUF1QixFQUV2QixxQkFBcUIsR0FDckIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUtuRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFHaEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRTVFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFUixJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFFBQVE7O2FBQ3BCLGlDQUE0QixHQUFHLENBQUMsQUFBSixDQUFJO2FBQ2hDLHFDQUFnQyxHQUFHLENBQUMsQUFBSixDQUFJO2FBQzVDLE9BQUUsR0FBRyxvQ0FBb0MsQUFBdkMsQ0FBdUM7YUFDekMsU0FBSSxHQUFxQixHQUFHLENBQUMsU0FBUyxDQUNyRCxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUN6RCxjQUFjLENBQ2QsQUFIbUIsQ0FHbkI7SUFhRCxZQUNDLE9BQTRCLEVBQ0wsb0JBQTJDLEVBQzFDLHFCQUE2QyxFQUNoRCxrQkFBdUMsRUFDdEMsa0JBQXlELEVBQ3hELG9CQUEyQyxFQUM5QyxpQkFBcUMsRUFDckMsaUJBQXFDLEVBQzFDLFlBQTJCLEVBQ3ZCLGdCQUFvRCxFQUN4RCxZQUEyQixFQUNyQixrQkFBd0QsRUFFN0UseUJBQXNFLEVBQ3RELGFBQTZCLEVBQy9CLFdBQTBDO1FBRXhELEtBQUssQ0FDSixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLHFCQUFxQixFQUNyQixvQkFBb0IsRUFDcEIsYUFBYSxFQUNiLFlBQVksRUFDWixZQUFZLENBQ1osQ0FBQTtRQXhCc0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQUszQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBRWpDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFFNUQsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUE0QjtRQUV2QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQXJCakQsaUJBQVksR0FBRyxLQUFLLENBQUE7UUFDcEIsYUFBUSxHQUFrQyxFQUFFLENBQUE7UUFFNUMsbUNBQThCLEdBQUcsS0FBSyxDQUFBO1FBaUM3QyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFBO1FBQy9CLElBQUksQ0FBQyxTQUFTLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxDQUFDLENBQUE7UUFFaEYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFFM0Isb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDeEYsQ0FBQTtRQUVELHVCQUF1QjtRQUN2QixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQ3hELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FDdEMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUU7WUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7Z0JBQ3hCLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUNqRSxDQUFDLENBQUE7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQVUsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxLQUFtQixFQUFFLEVBQUU7WUFDaEQsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDN0QsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQztvQkFDOUMsT0FBTTtnQkFDUCxDQUFDO2dCQUNELElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO29CQUN4QixPQUFNO2dCQUNQLENBQUM7Z0JBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM1QyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDaEI7d0JBQ0MsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7d0JBQ3hCLE1BQUs7b0JBQ04sOENBQXNDO29CQUN0Qzt3QkFDQyxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7d0JBQ3BDLENBQUM7d0JBQ0QsTUFBSztvQkFDTixnREFBdUM7b0JBQ3ZDLGlEQUF3QztvQkFDeEMsdURBQThDO29CQUM5Qyw4Q0FBcUM7b0JBQ3JDO3dCQUNDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDOUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7d0JBQ3hCLE1BQUs7b0JBQ04sOENBQXNDO29CQUN0Qyw4Q0FBc0M7b0JBQ3RDO3dCQUNDLGVBQWUsRUFBRSxDQUFBO3dCQUNqQixNQUFLO2dCQUNQLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUNGLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFDekQsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDL0MsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkIsZUFBZSxFQUFFLENBQUE7UUFDbEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlGLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDbEQsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzNDLGVBQWUsRUFBRSxDQUFBO1FBQ2xCLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRWtCLGlCQUFpQixDQUFDLFNBQXNCO1FBQzFELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRTlDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUE7UUFDN0UsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUE7UUFFckYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzdFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxhQUFhLGFBQWEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFBO1FBRWxGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFa0IsVUFBVSxDQUFDLFNBQXNCO1FBQ25ELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFM0IsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDdkMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUUxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7UUFFMUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3hCLENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksc0JBQXNCLENBQ3BDLElBQUksQ0FBQyxTQUFTLEVBQ2QsSUFBSSxDQUFDLG9CQUFvQixFQUN6QixJQUFJLENBQUMsa0JBQWtCLENBQ3ZCLENBQUE7UUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFO1lBQzFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyx5QkFBeUI7U0FDckQsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUNuRCxhQUFhLEVBQ2IsYUFBYSxFQUNiLFNBQVMsRUFDVCxRQUFRLEVBQ1I7WUFDQyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUM7WUFDMUUsSUFBSSxrQkFBa0IsQ0FDckIsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxpQkFBaUIsRUFDdEIsSUFBSSxDQUFDLG9CQUFvQixDQUN6QjtTQUNELEVBQ0Q7WUFDQyxnQkFBZ0IsRUFBRTtnQkFDakIsS0FBSyxFQUFFLENBQUMsT0FBa0MsRUFBRSxFQUFFLENBQzdDLE9BQU8sWUFBWSxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7YUFDeEU7WUFDRCxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixjQUFjLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsa0JBQWtCO1lBQ2hFLHFCQUFxQixFQUFFLElBQUksZ0NBQWdDLEVBQUU7U0FDN0QsQ0FDMkMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUUvQixpQ0FBaUM7UUFDakMsSUFBSSxvQkFBb0IsR0FBa0IsRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6QyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUN6QixtREFBbUQ7WUFDbkQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDaEIsT0FBTTtZQUNQLENBQUM7WUFDRCxvQkFBb0IsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUNwRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQTtZQUN2QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQy9DLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1lBQ3hCLElBQUksY0FBYyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUNsQixDQUFDO1lBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUE7WUFFekIsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLGNBQWMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUN4RSx5REFBeUQ7Z0JBQ3pELFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDdEIsSUFBSSxDQUFDLFlBQVksVUFBVSxFQUFFLENBQUM7d0JBQzdCLG9CQUFvQixDQUFDLElBQUksQ0FDeEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FDdEUsQ0FBQTtvQkFDRixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUMsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FDL0IsQ0FBQTtRQUVELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUVqQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXpFLG1DQUFtQztRQUNuQyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUMxQyxJQUNDLGtCQUFrQixDQUNqQixDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFDZixDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFDaEIsaUJBQWlCLENBQUMsS0FBSyxFQUN2QixJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUNuQyxFQUNBLENBQUM7b0JBQ0YsT0FBTTtnQkFDUCxDQUFDO2dCQUVELENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUE7WUFDekIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE9BQU07WUFDUCxDQUFDO2lCQUFNLElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNyRSxPQUFNLENBQUMsd0RBQXdEO2dCQUNoRSxDQUFDO2dCQUVELElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxHQUFHLEVBQUU7b0JBQy9DLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO3dCQUN4QixhQUFhLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhO3dCQUM1QyxNQUFNLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNO3dCQUM5QixVQUFVLEVBQUUsQ0FBQyxDQUFDLFVBQVU7cUJBQ3hCLENBQUMsQ0FBQTtnQkFDSCxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMscUNBQXFDLENBQUMsR0FBRyxFQUFFO29CQUMvQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUM5QyxJQUFJLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDcEMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO29CQUNoQixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJDLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDMUMsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUN0RSxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBRSxDQUM1RCxDQUFBO1FBQ0YsSUFBSSxDQUFDLFNBQVMsQ0FDYixjQUFjLENBQUMsNkJBQTZCLENBQUMsR0FBRyxFQUFFO1lBQ2pELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNsQixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU07UUFDUCxDQUFDO1FBRUQsb0JBQW9CO1FBQ3BCLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDN0Qsc0JBQXNCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUUxRCxNQUFNLG1CQUFtQixHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNsRixNQUFNLHlCQUF5QixHQUFHLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUM5RixNQUFNLDRCQUE0QixHQUFHLGdDQUFnQyxDQUFDLE1BQU0sQ0FDM0UsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFBO1FBQ0QsTUFBTSx3Q0FBd0MsR0FDN0Msd0NBQXdDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRXhFLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNwRixJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRS9CLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2hDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUN2QixtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMzQix5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNqQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUVwQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQzdELElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNuQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ3RDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUNyRiw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtnQkFDL0QsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLENBQUE7WUFDdEMsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsTUFBTSx5QkFBeUIsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUN4RCxJQUFJLENBQUMsWUFBWSxVQUFVLEVBQUUsQ0FBQztvQkFDN0IsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBO29CQUNoQyxPQUFPLENBQ04sUUFBUTt3QkFDUixDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUNoRixDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDLENBQUMsQ0FBQTtZQUNGLHdDQUF3QyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3hFLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRVEsS0FBSztRQUNiLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUViLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVrQixVQUFVLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDMUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0IsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFZLFVBQVU7UUFDckIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVPLFdBQVc7UUFDbEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7UUFDbEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMscUNBQTZCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDNUUsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RCLENBQUM7WUFDRCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUQsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLGNBQWMsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FDeEUsQ0FBQTtZQUNGLENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUMxQyxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtvQkFDeEMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7b0JBQzNDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFBO29CQUM3Qyx3Q0FBd0M7b0JBQ3hDLElBQUksYUFBYSxLQUFLLFNBQVMsSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7d0JBQ2pFLE9BQU8sdUJBQXVCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7b0JBQ2hGLENBQUM7eUJBQU0sSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7d0JBQ3hDLE9BQU8sQ0FBQyxDQUFDLENBQUE7b0JBQ1YsQ0FBQzt5QkFBTSxJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUUsQ0FBQzt3QkFDekMsT0FBTyxDQUFDLENBQUE7b0JBQ1QsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUE7d0JBQ3hDLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUE7d0JBQzFDLG1DQUFtQzt3QkFDbkMsSUFBSSxXQUFXLEtBQUssT0FBTyxDQUFDLElBQUksSUFBSSxZQUFZLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUNuRSxPQUFPLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUE7d0JBQ25FLENBQUM7NkJBQU0sSUFBSSxXQUFXLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUN6QyxPQUFPLENBQUMsQ0FBQyxDQUFBO3dCQUNWLENBQUM7NkJBQU0sSUFBSSxZQUFZLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUMxQyxPQUFPLENBQUMsQ0FBQTt3QkFDVCxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsT0FBTyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO3dCQUNuRSxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQTtRQUMvQixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRU8sUUFBUSxDQUFDLEtBQW1CLEVBQUUsTUFBc0M7UUFDM0UsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FDN0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsWUFBWSxVQUFVLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FDaEYsQ0FBQTtJQUNGLENBQUM7SUFFTyxVQUFVLENBQ2pCLE9BQW1CLEVBQ25CLE9BQTRFO1FBRTVFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUc5Qix5QkFBeUIsRUFBRSxFQUFFLEVBQUUsRUFBRSwwQkFBMEIsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTtZQUVyRixNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxVQUFVLElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQSxDQUFDLDhEQUE4RDtZQUN4SSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyw2REFBNkQ7WUFDbkgsQ0FBQztZQUNELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7WUFDMUYsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2hELENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCLENBQUMsQ0FBbUQ7UUFDNUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFFekIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztZQUN2QyxNQUFNLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUNqQyxpQkFBaUIsRUFBRTtnQkFDbEIsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsR0FBRyxFQUNGLE9BQU8sWUFBWSxVQUFVO29CQUM1QixDQUFDLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7b0JBQ3ZELENBQUMsQ0FBQyxFQUFFO2FBQ047WUFDRCxpQkFBaUIsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQjtZQUMvQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU07WUFDekIsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQ3ZCLE9BQU8sWUFBWSxVQUFVO2dCQUM1QixDQUFDLENBQUM7b0JBQ0EsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO29CQUN4QixXQUFXLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO2lCQUMzRDtnQkFDRixDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRTtTQUMzQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8scUNBQXFDLENBQUMsRUFBYztRQUMzRCxJQUFJLENBQUMsOEJBQThCLEdBQUcsSUFBSSxDQUFBO1FBQzFDLElBQUksQ0FBQztZQUNKLEVBQUUsRUFBRSxDQUFBO1FBQ0wsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLDhCQUE4QixHQUFHLEtBQUssQ0FBQTtRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQztZQUN2RCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzdELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQzFCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQ25DLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUNoRCxDQUFBO1lBQ0QsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQztvQkFDSixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7b0JBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtvQkFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3hCLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixvQ0FBb0M7Z0JBQ3JDLENBQUM7Z0JBQ0QsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVPLHFCQUFxQixDQUFDLEtBQWdDO1FBQzdELElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbEIsQ0FBQztRQUNELGdGQUFnRjtRQUNoRixJQUNDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUNsRCxLQUFLLENBQUMsb0JBQW9CLENBQUMsZ0NBQWdDLENBQUMsRUFDM0QsQ0FBQztZQUNGLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO1lBQ3JGLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUE7WUFDcEMsQ0FBQztZQUNELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUN0QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLFVBQVU7UUFDakIsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxlQUFlO1lBQ25CLElBQUksQ0FBQyxXQUFXLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQ2hGLElBQUksQ0FBQyxlQUFlO1lBQ25CLElBQUksQ0FBQyxXQUFXLGlDQUF5QjtnQkFDeEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtnQkFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQTtJQUM3QixDQUFDO0lBRU8sb0JBQW9CLENBQUMsV0FBMEI7UUFDdEQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDdEMsSUFDQyxRQUFRO2dCQUNSLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSwyQ0FBbUMsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFDekUsQ0FBQztnQkFDRixPQUFNLENBQUMsZ0ZBQWdGO1lBQ3hGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQTtRQUNoRCxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBWSxZQUFZO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU07YUFDbkMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO2FBQ25CLE1BQU0sQ0FDTixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxNQUFNLEVBQ2pDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQzNELENBQUE7SUFDSCxDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLElBQUkscUJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDN0QsaUNBQWlDLENBQ2pDLENBQUE7UUFDRCx3RUFBd0U7UUFDeEUsSUFBSSxPQUFPLHFCQUFxQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9DLHFCQUFxQixHQUFHLGlCQUFlLENBQUMsZ0NBQWdDLENBQUE7UUFDekUsQ0FBQztRQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FDdEUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUUsQ0FDNUQsQ0FBQTtRQUNGLElBQUksY0FBYyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2RCxPQUFPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUscUJBQXFCLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUE7SUFDNUYsQ0FBQztJQUVPLHNCQUFzQjtRQUM3QixJQUFJLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQzFELDhCQUE4QixDQUM5QixDQUFBO1FBQ0QsSUFBSSxPQUFPLGtCQUFrQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVDLGtCQUFrQixHQUFHLGlCQUFlLENBQUMsNEJBQTRCLENBQUE7UUFDbEUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVPLDBCQUEwQixDQUNqQyxrQkFBa0IsR0FBRyxpQkFBZSxDQUFDLDRCQUE0QjtRQUVqRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ2hGLE9BQU8sV0FBVyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQTtJQUNyRCxDQUFDO0lBRUQseUJBQXlCLENBQUMsS0FBYTtRQUN0QyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFBO0lBQ3BDLENBQUM7SUFFUSxlQUFlO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDL0IsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDN0MsTUFBTSxVQUFVLEdBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFFaEcsT0FBTyxHQUFHLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3hELENBQUM7O0FBeG1CVyxlQUFlO0lBc0J6QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsbUJBQW1CLENBQUE7SUFDbkIsWUFBQSwwQkFBMEIsQ0FBQTtJQUUxQixZQUFBLGNBQWMsQ0FBQTtJQUNkLFlBQUEsWUFBWSxDQUFBO0dBcENGLGVBQWUsQ0F5bUIzQjs7QUFnQkQsTUFBTSxzQkFBdUIsU0FBUSxZQUFZO0lBR3ZDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBZTtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLE9BQU07UUFDUCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUN4QixPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPO1lBQzVCLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztTQUNuRSxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLG1CQUFtQjthQUNELGdCQUFXLEdBQUcsRUFBRSxDQUFBO0lBRXZDLFNBQVMsQ0FBQyxRQUFtQztRQUM1QyxPQUFPLG1CQUFtQixDQUFDLFdBQVcsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQWtDO1FBQy9DLElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ25DLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxDQUFBO1FBQzdCLENBQUM7UUFFRCxPQUFPLG1CQUFtQixDQUFDLEVBQUUsQ0FBQTtJQUM5QixDQUFDOztBQUdGLE1BQU0sbUJBQW1CO2FBQ1IsT0FBRSxHQUFHLGFBQWEsQ0FBQTtJQUVsQyxZQUNTLGlCQUFxQyxFQUNyQyxvQkFBMkM7UUFEM0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBRW5ELE9BQU87SUFDUixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxtQkFBbUIsQ0FBQyxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVELGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLG1CQUFtQixHQUE2QixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pFLG1CQUFtQixDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxtQkFBbUIsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDL0UsbUJBQW1CLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXhELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDcEUsb0JBQW9CLEVBQ3BCLG9CQUFvQixDQUFDLEVBQUUsRUFDdkIsb0JBQW9CLENBQUMsS0FBSyxDQUMxQixDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUYsbUJBQW1CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUN4RCxJQUFJLEVBQUUsSUFBSTtZQUNWLEtBQUssRUFBRSxLQUFLO1lBQ1osVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUN4RSxDQUFDLENBQUE7UUFFRixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ2hFLGdCQUFnQixFQUNoQixnQkFBZ0IsQ0FBQyxFQUFFLEVBQ25CLGdCQUFnQixDQUFDLEtBQUssQ0FDdEIsQ0FBQTtRQUNELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3hGLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7WUFDcEQsSUFBSSxFQUFFLElBQUk7WUFDVixLQUFLLEVBQUUsS0FBSztZQUNaLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDNUUsQ0FBQyxDQUFBO1FBRUYsT0FBTyxtQkFBbUIsQ0FBQTtJQUMzQixDQUFDO0lBRUQsYUFBYSxDQUNaLFdBQXlCLEVBQ3pCLE1BQWMsRUFDZCxZQUFzQztRQUV0QyxZQUFZLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTtRQUN0QyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFBO1FBQ2pELFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXNDO1FBQ3JELFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDakMsQ0FBQzs7QUFHRixNQUFNLGtCQUFrQjthQUNQLE9BQUUsR0FBRyxZQUFZLEFBQWYsQ0FBZTtJQWFqQyxZQUNTLE1BQXNCLEVBQ3RCLG9CQUEyQyxFQUMzQyxpQkFBcUMsRUFDckMsb0JBQTJDO1FBSDNDLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBQ3RCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBZm5DLHNCQUFpQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzVFLGlCQUFpQixFQUNqQixpQkFBaUIsQ0FBQyxFQUFFLEVBQ3BCLGlCQUFpQixDQUFDLEtBQUssQ0FDdkIsQ0FBQTtRQUNnQixzQkFBaUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM1RSxpQkFBaUIsRUFDakIsaUJBQWlCLENBQUMsRUFBRSxFQUNwQixpQkFBaUIsQ0FBQyxLQUFLLENBQ3ZCLENBQUE7UUFRQSxPQUFPO0lBQ1IsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxjQUFjLEdBQTRCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkUsY0FBYyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDcEMsY0FBYyxDQUFDLFlBQVksR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUE7UUFDMUQsY0FBYyxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUU7WUFDbkQsWUFBWSxFQUFFLGNBQWMsQ0FBQyxZQUFZO1NBQ3pDLENBQUMsQ0FBQTtRQUNGLGNBQWMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFbkQsT0FBTyxjQUFjLENBQUE7SUFDdEIsQ0FBQztJQUVELGFBQWEsQ0FDWixZQUF3QixFQUN4QixNQUFjLEVBQ2QsWUFBcUM7UUFFckMsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQTtRQUNsQyxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUE7UUFDL0MsWUFBWSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUN4RixZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUM1QjtZQUNDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFO2dCQUN2RCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJO2FBQ3hDLENBQUM7WUFDRixJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN0QixXQUFXLEVBQUUsTUFBTSxDQUFDLGNBQWMsMEJBQWtCO1NBQ3BELEVBQ0Q7WUFDQyxNQUFNLEVBQUUsWUFBWSxDQUFDLFNBQVMsRUFBRTtZQUNoQyxZQUFZLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2hGLGVBQWUsRUFDZCxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUF1QixDQUFDLFFBQVEsQ0FBQyxXQUFXO1lBQy9FLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSx3QkFBZ0I7WUFDdEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUU7U0FDdEIsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtRQUM5RixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUN2QyxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQy9CLENBQUM7WUFDRCxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7Z0JBQ3pDLElBQUksRUFBRSxJQUFJO2dCQUNWLEtBQUssRUFBRSxLQUFLO2dCQUNaLFVBQVUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTthQUNoRixDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUFxQztRQUNwRCxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2hDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDM0IsWUFBWSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNwQyxDQUFDOztBQUdGLE1BQU0sc0JBQXNCO0lBRTNCLElBQVcsU0FBUyxDQUFDLEtBQWtEO1FBQ3RFLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxZQUNDLFNBQXNELEVBQzlDLG9CQUEyQyxFQUMzQyxrQkFBd0M7UUFEeEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXNCO1FBRWhELElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0lBQzVCLENBQUM7SUFFUSxJQUFZLFdBQVc7UUFDL0IsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFO1lBQ3JFLGtCQUFrQixFQUFFLEtBQUs7U0FDekIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUFrQztRQUM1QyxJQUFJLE9BQU8sWUFBWSxVQUFVLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDdEMsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxPQUFPLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFlBQVksQ0FBRSxRQUF1QztRQUNwRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9CLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0IsT0FBTyxPQUFPLFlBQVksVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFBO0lBQ2hGLENBQUM7SUFFRCxXQUFXLENBQUMsSUFBc0IsRUFBRSxhQUF3QjtRQUMzRCxNQUFNLEtBQUssR0FBSSxJQUEyRCxDQUFDLFFBQVEsQ0FBQTtRQUNuRixNQUFNLE9BQU8sR0FBd0IsRUFBRSxDQUFBO1FBQ3ZDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUMxQixJQUFJLElBQUksWUFBWSxVQUFVLEVBQUUsQ0FBQztvQkFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDbkIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEIsNkZBQTZGO1lBQzdGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3RGLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVSxDQUNULElBQXNCLEVBQ3RCLGNBQXlDLEVBQ3pDLFlBQW9CLEVBQ3BCLFlBQThDLEVBQzlDLGFBQXdCO1FBRXhCLElBQUksSUFBSSxZQUFZLHFCQUFxQixFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BGLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDdkMsSUFBSSxJQUFJLFlBQVksdUJBQXVCLEVBQUUsQ0FBQztnQkFDN0Msc0NBQXNDO2dCQUN0QyxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxtQ0FBbUM7Z0JBQ25DLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUkscUNBQTZCLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDdkYsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLGtCQUFrQixHQUEyQyxTQUFTLENBQUE7UUFDMUUsUUFBUSxZQUFZLEVBQUUsQ0FBQztZQUN0QixzQ0FBOEI7WUFDOUI7Z0JBQ0Msa0JBQWtCO29CQUNqQixZQUFZLEtBQUssQ0FBQyxJQUFJLGNBQWMsWUFBWSxlQUFlO3dCQUM5RCxDQUFDO3dCQUNELENBQUMsNkRBQWtDLENBQUE7Z0JBQ3JDLE1BQUs7WUFDTixnREFBd0M7WUFDeEM7Z0JBQ0Msa0JBQWtCLDZEQUFtQyxDQUFBO2dCQUNyRCxNQUFLO1FBQ1AsQ0FBQztRQUVELE9BQU87WUFDTixNQUFNLEVBQUUsSUFBSTtZQUNaLE1BQU0sRUFBRSxFQUFFLElBQUkscUNBQTZCLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFO1lBQzNFLFFBQVEsRUFBRSxDQUFDLFlBQVksQ0FBQztTQUN4QixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FDSCxJQUFzQixFQUN0QixhQUFvRCxFQUNwRCxZQUFvQixFQUNwQixZQUE4QyxFQUM5QyxhQUF3QjtRQUV4QixJQUFJLEtBQUssR0FDUixhQUFhLFlBQVksVUFBVTtZQUNsQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUs7WUFDckIsQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdEYsSUFBSSxpQkFBaUIsR0FDcEIsYUFBYSxZQUFZLFVBQVU7WUFDbEMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztZQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRUwsUUFBUSxZQUFZLEVBQUUsQ0FBQztZQUN0QixzQ0FBOEI7WUFDOUI7Z0JBQ0MsSUFBSSxhQUFhLFlBQVksZUFBZSxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25FLEtBQUssR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7b0JBQ3ZELGlCQUFpQixHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUE7Z0JBQ2hDLENBQUM7Z0JBQ0QsTUFBSztZQUNOLHlDQUFpQztZQUNqQztnQkFDQyxJQUFJLGFBQWEsWUFBWSxVQUFVLEVBQUUsQ0FBQztvQkFDekMsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQztnQkFDRCxNQUFLO1FBQ1AsQ0FBQztRQUVELElBQUksSUFBSSxZQUFZLHVCQUF1QixFQUFFLENBQUM7WUFDN0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzlELElBQUksRUFBRSxDQUFDLEtBQUssS0FBSyxLQUFLLElBQUksaUJBQWlCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztvQkFDakUsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQztnQkFDRCxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDeEYsaUJBQWlCLEVBQUUsQ0FBQTtZQUNwQixDQUFDO1lBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUMxQixhQUFhLEVBQ2IsVUFBVSxFQUNWLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFDWCxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQ25CLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLENBQzVCLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sS0FBVSxDQUFDO0NBQ2xCO0FBN0lTO0lBQVIsT0FBTzt5REFJUDtBQTJJRixNQUFNLGdDQUFnQztJQUdyQyxrQkFBa0I7UUFDakIsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQWtDO1FBQzlDLElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ25DLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQTtRQUN6RSxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFBO0lBQ3pCLENBQUM7Q0FDRDtBQUVELE1BQU0seUJBQXlCLEdBQUcsMENBQTBDLENBQUE7QUFDNUUsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDBDQUEwQztZQUM5QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsMENBQTBDLENBQUM7WUFDOUUsRUFBRSxFQUFFLElBQUk7WUFDUixVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLDhDQUF5QiwwQkFBaUI7Z0JBQ25ELEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxnREFBMkIsMEJBQWlCLEVBQUU7Z0JBQzlELE1BQU0sNkNBQW1DO2FBQ3pDO1lBQ0QsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1lBQzFCLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQ3BCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUNqRCwyQkFBMkIsQ0FDM0I7Z0JBQ0QsS0FBSyxFQUFFLEVBQUU7YUFDVDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzdELE1BQU0sY0FBYyxHQUNuQixrQkFBa0IsQ0FBQyxXQUFXLHNDQUE4QjtZQUMzRCxDQUFDO1lBQ0QsQ0FBQyxrQ0FBMEIsQ0FBQTtRQUM3QixrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN0RCxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdkMsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFO0lBQ3JELEtBQUssRUFBRSxRQUFRO0lBQ2YsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLHlCQUF5QjtRQUM3QixLQUFLLEVBQUU7WUFDTixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMscUNBQXFDLEVBQUUsYUFBYSxDQUFDO1lBQ3RFLGFBQWEsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUMxQixFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ25FLGVBQWUsQ0FDZjtTQUNEO0tBQ0Q7SUFDRCxLQUFLLEVBQUUsQ0FBQztDQUNSLENBQUMsQ0FBQTtBQUVGLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnQ0FBZ0M7WUFDcEMsS0FBSyxFQUFFLGNBQWM7WUFDckIsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDckIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztnQkFDcEIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDO2dCQUN2RCxLQUFLLEVBQUUsRUFBRTthQUNUO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHNCQUFzQjtZQUMxQixLQUFLLEVBQUUscUJBQXFCLENBQUMsS0FBSztZQUNsQyxFQUFFLEVBQUUsS0FBSztZQUNULElBQUksRUFBRSxPQUFPLENBQUMsUUFBUTtZQUN0QixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUNwQixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELEtBQUssRUFBRSxFQUFFO2FBQ1Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUVoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixFQUFFLENBQUE7UUFDNUMsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUNoRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDZCQUE2QjtZQUNqQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSx3QkFBd0IsQ0FBQztZQUNqRSxFQUFFLEVBQUUsS0FBSztZQUNULElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztZQUNyQixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUNwQixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7Q0FDRCxDQUNELENBQUEifQ==