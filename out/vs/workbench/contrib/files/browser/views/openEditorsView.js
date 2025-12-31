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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbkVkaXRvcnNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci92aWV3cy9vcGVuRWRpdG9yc1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sWUFBWSxHQUdaLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLG9CQUFvQixHQUlwQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBRU4sc0JBQXNCLEVBQ3RCLGdCQUFnQixFQUdoQixrQkFBa0IsRUFDbEIsaUJBQWlCLEdBQ2pCLE1BQU0sOEJBQThCLENBQUE7QUFFckMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDMUUsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixzQkFBc0IsRUFFdEIsVUFBVSxHQUNWLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixpQkFBaUIsRUFDakIsaUJBQWlCLEdB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