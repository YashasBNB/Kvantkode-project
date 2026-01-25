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
var OutlineItem_1, FileItem_1, BreadcrumbsControl_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { BreadcrumbsItem, BreadcrumbsWidget, } from '../../../../base/browser/ui/breadcrumbs/breadcrumbsWidget.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { combinedDisposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { basename, extUri } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { OutlineElement } from '../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { fillInSymbolsDragData, LocalSelectionTransfer, } from '../../../../platform/dnd/browser/dnd.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IListService, WorkbenchAsyncDataTree, WorkbenchDataTree, WorkbenchListFocusContextKey, } from '../../../../platform/list/browser/listService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultBreadcrumbsWidgetStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorResourceAccessor, SideBySideEditor, } from '../../../common/editor.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { DraggedEditorIdentifier, fillEditorsDragData } from '../../dnd.js';
import { DEFAULT_LABELS_CONTAINER, ResourceLabels } from '../../labels.js';
import { BreadcrumbsConfig, IBreadcrumbsService } from './breadcrumbs.js';
import { BreadcrumbsModel, FileElement, OutlineElement2 } from './breadcrumbsModel.js';
import { BreadcrumbsFilePicker, BreadcrumbsOutlinePicker, } from './breadcrumbsPicker.js';
import './media/breadcrumbscontrol.css';
let OutlineItem = OutlineItem_1 = class OutlineItem extends BreadcrumbsItem {
    constructor(model, element, options, _instantiationService) {
        super();
        this.model = model;
        this.element = element;
        this.options = options;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
    }
    dispose() {
        this._disposables.dispose();
    }
    equals(other) {
        if (!(other instanceof OutlineItem_1)) {
            return false;
        }
        return (this.element.element === other.element.element &&
            this.options.showFileIcons === other.options.showFileIcons &&
            this.options.showSymbolIcons === other.options.showSymbolIcons);
    }
    render(container) {
        const { element, outline } = this.element;
        if (element === outline) {
            const element = dom.$('span', undefined, '…');
            container.appendChild(element);
            return;
        }
        const templateId = outline.config.delegate.getTemplateId(element);
        const renderer = outline.config.renderers.find((renderer) => renderer.templateId === templateId);
        if (!renderer) {
            container.innerText = '<<NO RENDERER>>';
            return;
        }
        const template = renderer.renderTemplate(container);
        renderer.renderElement({
            element,
            children: [],
            depth: 0,
            visibleChildrenCount: 0,
            visibleChildIndex: 0,
            collapsible: false,
            collapsed: false,
            visible: true,
            filterData: undefined,
        }, 0, template, undefined);
        this._disposables.add(toDisposable(() => {
            renderer.disposeTemplate(template);
        }));
        if (element instanceof OutlineElement && outline.uri) {
            this._disposables.add(this._instantiationService.invokeFunction((accessor) => createBreadcrumbDndObserver(accessor, container, element.symbol.name, { symbol: element.symbol, uri: outline.uri }, this.model, this.options.dragEditor)));
        }
    }
};
OutlineItem = OutlineItem_1 = __decorate([
    __param(3, IInstantiationService)
], OutlineItem);
let FileItem = FileItem_1 = class FileItem extends BreadcrumbsItem {
    constructor(model, element, options, _labels, _hoverDelegate, _instantiationService) {
        super();
        this.model = model;
        this.element = element;
        this.options = options;
        this._labels = _labels;
        this._hoverDelegate = _hoverDelegate;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
    }
    dispose() {
        this._disposables.dispose();
    }
    equals(other) {
        if (!(other instanceof FileItem_1)) {
            return false;
        }
        return (extUri.isEqual(this.element.uri, other.element.uri) &&
            this.options.showFileIcons === other.options.showFileIcons &&
            this.options.showSymbolIcons === other.options.showSymbolIcons);
    }
    render(container) {
        // file/folder
        const label = this._labels.create(container, { hoverDelegate: this._hoverDelegate });
        label.setFile(this.element.uri, {
            hidePath: true,
            hideIcon: this.element.kind === FileKind.FOLDER || !this.options.showFileIcons,
            fileKind: this.element.kind,
            fileDecorations: { colors: this.options.showDecorationColors, badges: false },
        });
        container.classList.add(FileKind[this.element.kind].toLowerCase());
        this._disposables.add(label);
        this._disposables.add(this._instantiationService.invokeFunction((accessor) => createBreadcrumbDndObserver(accessor, container, basename(this.element.uri), this.element.uri, this.model, this.options.dragEditor)));
    }
};
FileItem = FileItem_1 = __decorate([
    __param(5, IInstantiationService)
], FileItem);
function createBreadcrumbDndObserver(accessor, container, label, item, model, dragEditor) {
    const instantiationService = accessor.get(IInstantiationService);
    container.draggable = true;
    return new dom.DragAndDropObserver(container, {
        onDragStart: (event) => {
            if (!event.dataTransfer) {
                return;
            }
            // Set data transfer
            event.dataTransfer.effectAllowed = 'copyMove';
            instantiationService.invokeFunction((accessor) => {
                if (URI.isUri(item)) {
                    fillEditorsDragData(accessor, [item], event);
                }
                else {
                    // Symbol
                    fillEditorsDragData(accessor, [{ resource: item.uri, selection: item.symbol.range }], event);
                    fillInSymbolsDragData([
                        {
                            name: item.symbol.name,
                            fsPath: item.uri.fsPath,
                            range: item.symbol.range,
                            kind: item.symbol.kind,
                        },
                    ], event);
                }
                if (dragEditor && model.editor && model.editor?.input) {
                    const editorTransfer = LocalSelectionTransfer.getInstance();
                    editorTransfer.setData([
                        new DraggedEditorIdentifier({
                            editor: model.editor.input,
                            groupId: model.editor.group.id,
                        }),
                    ], DraggedEditorIdentifier.prototype);
                }
            });
            applyDragImage(event, container, label);
        },
    });
}
const separatorIcon = registerIcon('breadcrumb-separator', Codicon.chevronRight, localize('separatorIcon', 'Icon for the separator in the breadcrumbs.'));
let BreadcrumbsControl = class BreadcrumbsControl {
    static { BreadcrumbsControl_1 = this; }
    static { this.HEIGHT = 22; }
    static { this.SCROLLBAR_SIZES = {
        default: 3,
        large: 8,
    }; }
    static { this.Payload_Reveal = {}; }
    static { this.Payload_RevealAside = {}; }
    static { this.Payload_Pick = {}; }
    static { this.CK_BreadcrumbsPossible = new RawContextKey('breadcrumbsPossible', false, localize('breadcrumbsPossible', 'Whether the editor can show breadcrumbs')); }
    static { this.CK_BreadcrumbsVisible = new RawContextKey('breadcrumbsVisible', false, localize('breadcrumbsVisible', 'Whether breadcrumbs are currently visible')); }
    static { this.CK_BreadcrumbsActive = new RawContextKey('breadcrumbsActive', false, localize('breadcrumbsActive', 'Whether breadcrumbs have focus')); }
    get onDidVisibilityChange() {
        return this._onDidVisibilityChange.event;
    }
    constructor(container, _options, _editorGroup, _contextKeyService, _contextViewService, _instantiationService, _quickInputService, _fileService, _editorService, _labelService, configurationService, breadcrumbsService) {
        this._options = _options;
        this._editorGroup = _editorGroup;
        this._contextKeyService = _contextKeyService;
        this._contextViewService = _contextViewService;
        this._instantiationService = _instantiationService;
        this._quickInputService = _quickInputService;
        this._fileService = _fileService;
        this._editorService = _editorService;
        this._labelService = _labelService;
        this._disposables = new DisposableStore();
        this._breadcrumbsDisposables = new DisposableStore();
        this._model = new MutableDisposable();
        this._breadcrumbsPickerShowing = false;
        this._onDidVisibilityChange = this._disposables.add(new Emitter());
        this.domNode = document.createElement('div');
        this.domNode.classList.add('breadcrumbs-control');
        dom.append(container, this.domNode);
        this._cfUseQuickPick = BreadcrumbsConfig.UseQuickPick.bindTo(configurationService);
        this._cfShowIcons = BreadcrumbsConfig.Icons.bindTo(configurationService);
        this._cfTitleScrollbarSizing =
            BreadcrumbsConfig.TitleScrollbarSizing.bindTo(configurationService);
        this._labels = this._instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER);
        const sizing = this._cfTitleScrollbarSizing.getValue() ?? 'default';
        const styles = _options.widgetStyles ?? defaultBreadcrumbsWidgetStyles;
        this._widget = new BreadcrumbsWidget(this.domNode, BreadcrumbsControl_1.SCROLLBAR_SIZES[sizing], separatorIcon, styles);
        this._widget.onDidSelectItem(this._onSelectEvent, this, this._disposables);
        this._widget.onDidFocusItem(this._onFocusEvent, this, this._disposables);
        this._widget.onDidChangeFocus(this._updateCkBreadcrumbsActive, this, this._disposables);
        this._ckBreadcrumbsPossible = BreadcrumbsControl_1.CK_BreadcrumbsPossible.bindTo(this._contextKeyService);
        this._ckBreadcrumbsVisible = BreadcrumbsControl_1.CK_BreadcrumbsVisible.bindTo(this._contextKeyService);
        this._ckBreadcrumbsActive = BreadcrumbsControl_1.CK_BreadcrumbsActive.bindTo(this._contextKeyService);
        this._hoverDelegate = getDefaultHoverDelegate('mouse');
        this._disposables.add(breadcrumbsService.register(this._editorGroup.id, this._widget));
        this.hide();
    }
    dispose() {
        this._disposables.dispose();
        this._breadcrumbsDisposables.dispose();
        this._ckBreadcrumbsPossible.reset();
        this._ckBreadcrumbsVisible.reset();
        this._ckBreadcrumbsActive.reset();
        this._cfUseQuickPick.dispose();
        this._cfShowIcons.dispose();
        this._widget.dispose();
        this._labels.dispose();
        this.domNode.remove();
    }
    get model() {
        return this._model.value;
    }
    layout(dim) {
        this._widget.layout(dim);
    }
    isHidden() {
        return this.domNode.classList.contains('hidden');
    }
    hide() {
        const wasHidden = this.isHidden();
        this._breadcrumbsDisposables.clear();
        this._ckBreadcrumbsVisible.set(false);
        this.domNode.classList.toggle('hidden', true);
        if (!wasHidden) {
            this._onDidVisibilityChange.fire();
        }
    }
    show() {
        const wasHidden = this.isHidden();
        this._ckBreadcrumbsVisible.set(true);
        this.domNode.classList.toggle('hidden', false);
        if (wasHidden) {
            this._onDidVisibilityChange.fire();
        }
    }
    revealLast() {
        this._widget.revealLast();
    }
    update() {
        this._breadcrumbsDisposables.clear();
        // honor diff editors and such
        const uri = EditorResourceAccessor.getCanonicalUri(this._editorGroup.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        const wasHidden = this.isHidden();
        if (!uri || !this._fileService.hasProvider(uri)) {
            // cleanup and return when there is no input or when
            // we cannot handle this input
            this._ckBreadcrumbsPossible.set(false);
            if (!wasHidden) {
                this.hide();
                return true;
            }
            else {
                return false;
            }
        }
        // display uri which can be derived from certain inputs
        const fileInfoUri = EditorResourceAccessor.getOriginalUri(this._editorGroup.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        this.show();
        this._ckBreadcrumbsPossible.set(true);
        const model = this._instantiationService.createInstance(BreadcrumbsModel, fileInfoUri ?? uri, this._editorGroup.activeEditorPane);
        this._model.value = model;
        this.domNode.classList.toggle('backslash-path', this._labelService.getSeparator(uri.scheme, uri.authority) === '\\');
        const updateBreadcrumbs = () => {
            this.domNode.classList.toggle('relative-path', model.isRelative());
            const showIcons = this._cfShowIcons.getValue();
            const options = {
                ...this._options,
                showFileIcons: this._options.showFileIcons && showIcons,
                showSymbolIcons: this._options.showSymbolIcons && showIcons,
            };
            const items = model
                .getElements()
                .map((element) => element instanceof FileElement
                ? this._instantiationService.createInstance(FileItem, model, element, options, this._labels, this._hoverDelegate)
                : this._instantiationService.createInstance(OutlineItem, model, element, options));
            if (items.length === 0) {
                this._widget.setEnabled(false);
                this._widget.setItems([
                    new (class extends BreadcrumbsItem {
                        render(container) {
                            container.innerText = localize('empty', 'no elements');
                        }
                        equals(other) {
                            return other === this;
                        }
                        dispose() { }
                    })(),
                ]);
            }
            else {
                this._widget.setEnabled(true);
                this._widget.setItems(items);
                this._widget.reveal(items[items.length - 1]);
            }
        };
        const listener = model.onDidUpdate(updateBreadcrumbs);
        const configListener = this._cfShowIcons.onDidChange(updateBreadcrumbs);
        updateBreadcrumbs();
        this._breadcrumbsDisposables.clear();
        this._breadcrumbsDisposables.add(listener);
        this._breadcrumbsDisposables.add(toDisposable(() => this._model.clear()));
        this._breadcrumbsDisposables.add(configListener);
        this._breadcrumbsDisposables.add(toDisposable(() => this._widget.setItems([])));
        const updateScrollbarSizing = () => {
            const sizing = this._cfTitleScrollbarSizing.getValue() ?? 'default';
            this._widget.setHorizontalScrollbarSize(BreadcrumbsControl_1.SCROLLBAR_SIZES[sizing]);
        };
        updateScrollbarSizing();
        const updateScrollbarSizeListener = this._cfTitleScrollbarSizing.onDidChange(updateScrollbarSizing);
        this._breadcrumbsDisposables.add(updateScrollbarSizeListener);
        // close picker on hide/update
        this._breadcrumbsDisposables.add({
            dispose: () => {
                if (this._breadcrumbsPickerShowing) {
                    this._contextViewService.hideContextView({ source: this });
                }
            },
        });
        return wasHidden !== this.isHidden();
    }
    _onFocusEvent(event) {
        if (event.item && this._breadcrumbsPickerShowing) {
            this._breadcrumbsPickerIgnoreOnceItem = undefined;
            this._widget.setSelection(event.item);
        }
    }
    _onSelectEvent(event) {
        if (!event.item) {
            return;
        }
        if (event.item === this._breadcrumbsPickerIgnoreOnceItem) {
            this._breadcrumbsPickerIgnoreOnceItem = undefined;
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            return;
        }
        const { element } = event.item;
        this._editorGroup.focus();
        const group = this._getEditorGroup(event.payload);
        if (group !== undefined) {
            // reveal the item
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            this._revealInEditor(event, element, group);
            return;
        }
        if (this._cfUseQuickPick.getValue()) {
            // using quick pick
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            this._quickInputService.quickAccess.show(element instanceof OutlineElement2 ? '@' : '');
            return;
        }
        // show picker
        let picker;
        let pickerAnchor;
        this._contextViewService.showContextView({
            render: (parent) => {
                if (event.item instanceof FileItem) {
                    picker = this._instantiationService.createInstance(BreadcrumbsFilePicker, parent, event.item.model.resource);
                }
                else if (event.item instanceof OutlineItem) {
                    picker = this._instantiationService.createInstance(BreadcrumbsOutlinePicker, parent, event.item.model.resource);
                }
                const selectListener = picker.onWillPickElement(() => this._contextViewService.hideContextView({ source: this, didPick: true }));
                const zoomListener = PixelRatio.getInstance(dom.getWindow(this.domNode)).onDidChange(() => this._contextViewService.hideContextView({ source: this }));
                const focusTracker = dom.trackFocus(parent);
                const blurListener = focusTracker.onDidBlur(() => {
                    this._breadcrumbsPickerIgnoreOnceItem = this._widget.isDOMFocused()
                        ? event.item
                        : undefined;
                    this._contextViewService.hideContextView({ source: this });
                });
                this._breadcrumbsPickerShowing = true;
                this._updateCkBreadcrumbsActive();
                return combinedDisposable(picker, selectListener, zoomListener, focusTracker, blurListener);
            },
            getAnchor: () => {
                if (!pickerAnchor) {
                    const window = dom.getWindow(this.domNode);
                    const maxInnerWidth = window.innerWidth - 8; /*a little less the full widget*/
                    let maxHeight = Math.min(window.innerHeight * 0.7, 300);
                    const pickerWidth = Math.min(maxInnerWidth, Math.max(240, maxInnerWidth / 4.17));
                    const pickerArrowSize = 8;
                    let pickerArrowOffset;
                    const data = dom.getDomNodePagePosition(event.node.firstChild);
                    const y = data.top + data.height + pickerArrowSize;
                    if (y + maxHeight >= window.innerHeight) {
                        maxHeight = window.innerHeight - y - 30; /* room for shadow and status bar*/
                    }
                    let x = data.left;
                    if (x + pickerWidth >= maxInnerWidth) {
                        x = maxInnerWidth - pickerWidth;
                    }
                    if (event.payload instanceof StandardMouseEvent) {
                        const maxPickerArrowOffset = pickerWidth - 2 * pickerArrowSize;
                        pickerArrowOffset = event.payload.posx - x;
                        if (pickerArrowOffset > maxPickerArrowOffset) {
                            x = Math.min(maxInnerWidth - pickerWidth, x + pickerArrowOffset - maxPickerArrowOffset);
                            pickerArrowOffset = maxPickerArrowOffset;
                        }
                    }
                    else {
                        pickerArrowOffset = data.left + data.width * 0.3 - x;
                    }
                    picker.show(element, maxHeight, pickerWidth, pickerArrowSize, Math.max(0, pickerArrowOffset));
                    pickerAnchor = { x, y };
                }
                return pickerAnchor;
            },
            onHide: (data) => {
                if (!data?.didPick) {
                    picker.restoreViewState();
                }
                this._breadcrumbsPickerShowing = false;
                this._updateCkBreadcrumbsActive();
                if (data?.source === this) {
                    this._widget.setFocused(undefined);
                    this._widget.setSelection(undefined);
                }
                picker.dispose();
            },
        });
    }
    _updateCkBreadcrumbsActive() {
        const value = this._widget.isDOMFocused() || this._breadcrumbsPickerShowing;
        this._ckBreadcrumbsActive.set(value);
    }
    async _revealInEditor(event, element, group, pinned = false) {
        if (element instanceof FileElement) {
            if (element.kind === FileKind.FILE) {
                await this._editorService.openEditor({ resource: element.uri, options: { pinned } }, group);
            }
            else {
                // show next picker
                const items = this._widget.getItems();
                const idx = items.indexOf(event.item);
                this._widget.setFocused(items[idx + 1]);
                this._widget.setSelection(items[idx + 1], BreadcrumbsControl_1.Payload_Pick);
            }
        }
        else {
            element.outline.reveal(element, { pinned }, group === SIDE_GROUP, false);
        }
    }
    _getEditorGroup(data) {
        if (data === BreadcrumbsControl_1.Payload_RevealAside) {
            return SIDE_GROUP;
        }
        else if (data === BreadcrumbsControl_1.Payload_Reveal) {
            return ACTIVE_GROUP;
        }
        else {
            return undefined;
        }
    }
};
BreadcrumbsControl = BreadcrumbsControl_1 = __decorate([
    __param(3, IContextKeyService),
    __param(4, IContextViewService),
    __param(5, IInstantiationService),
    __param(6, IQuickInputService),
    __param(7, IFileService),
    __param(8, IEditorService),
    __param(9, ILabelService),
    __param(10, IConfigurationService),
    __param(11, IBreadcrumbsService)
], BreadcrumbsControl);
export { BreadcrumbsControl };
let BreadcrumbsControlFactory = class BreadcrumbsControlFactory {
    get control() {
        return this._control;
    }
    get onDidEnablementChange() {
        return this._onDidEnablementChange.event;
    }
    get onDidVisibilityChange() {
        return this._onDidVisibilityChange.event;
    }
    constructor(_container, _editorGroup, _options, configurationService, _instantiationService, fileService) {
        this._container = _container;
        this._editorGroup = _editorGroup;
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
        this._controlDisposables = new DisposableStore();
        this._onDidEnablementChange = this._disposables.add(new Emitter());
        this._onDidVisibilityChange = this._disposables.add(new Emitter());
        const config = this._disposables.add(BreadcrumbsConfig.IsEnabled.bindTo(configurationService));
        this._disposables.add(config.onDidChange(() => {
            const value = config.getValue();
            if (!value && this._control) {
                this._controlDisposables.clear();
                this._control = undefined;
                this._onDidEnablementChange.fire();
            }
            else if (value && !this._control) {
                this._control = this.createControl();
                this._control.update();
                this._onDidEnablementChange.fire();
            }
        }));
        if (config.getValue()) {
            this._control = this.createControl();
        }
        this._disposables.add(fileService.onDidChangeFileSystemProviderRegistrations((e) => {
            if (this._control?.model && this._control.model.resource.scheme !== e.scheme) {
                // ignore if the scheme of the breadcrumbs resource is not affected
                return;
            }
            if (this._control?.update()) {
                this._onDidEnablementChange.fire();
            }
        }));
    }
    createControl() {
        const control = this._controlDisposables.add(this._instantiationService.createInstance(BreadcrumbsControl, this._container, this._options, this._editorGroup));
        this._controlDisposables.add(control.onDidVisibilityChange(() => this._onDidVisibilityChange.fire()));
        return control;
    }
    dispose() {
        this._disposables.dispose();
        this._controlDisposables.dispose();
    }
};
BreadcrumbsControlFactory = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IFileService)
], BreadcrumbsControlFactory);
export { BreadcrumbsControlFactory };
//#region commands
// toggle command
registerAction2(class ToggleBreadcrumb extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.toggle',
            title: {
                ...localize2('cmd.toggle', 'Toggle Breadcrumbs'),
                mnemonicTitle: localize({ key: 'miBreadcrumbs', comment: ['&& denotes a mnemonic'] }, 'Toggle &&Breadcrumbs'),
            },
            category: Categories.View,
            toggled: {
                condition: ContextKeyExpr.equals('config.breadcrumbs.enabled', true),
                title: localize('cmd.toggle2', 'Toggle Breadcrumbs'),
                mnemonicTitle: localize({ key: 'miBreadcrumbs2', comment: ['&& denotes a mnemonic'] }, 'Toggle &&Breadcrumbs'),
            },
            menu: [
                { id: MenuId.CommandPalette },
                { id: MenuId.MenubarAppearanceMenu, group: '4_editor', order: 2 },
                { id: MenuId.NotebookToolbar, group: 'notebookLayout', order: 2 },
                { id: MenuId.StickyScrollContext },
                { id: MenuId.NotebookStickyScrollContext, group: 'notebookView', order: 2 },
                { id: MenuId.NotebookToolbarContext, group: 'notebookView', order: 2 },
            ],
        });
    }
    run(accessor) {
        const config = accessor.get(IConfigurationService);
        const value = BreadcrumbsConfig.IsEnabled.bindTo(config).getValue();
        BreadcrumbsConfig.IsEnabled.bindTo(config).updateValue(!value);
    }
});
// focus/focus-and-select
function focusAndSelectHandler(accessor, select) {
    // find widget and focus/select
    const groups = accessor.get(IEditorGroupsService);
    const breadcrumbs = accessor.get(IBreadcrumbsService);
    const widget = breadcrumbs.getWidget(groups.activeGroup.id);
    if (widget) {
        const item = widget.getItems().at(-1);
        widget.setFocused(item);
        if (select) {
            widget.setSelection(item, BreadcrumbsControl.Payload_Pick);
        }
    }
}
registerAction2(class FocusAndSelectBreadcrumbs extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.focusAndSelect',
            title: localize2('cmd.focusAndSelect', 'Focus and Select Breadcrumbs'),
            precondition: BreadcrumbsControl.CK_BreadcrumbsVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
                when: BreadcrumbsControl.CK_BreadcrumbsPossible,
            },
            f1: true,
        });
    }
    run(accessor, ...args) {
        focusAndSelectHandler(accessor, true);
    }
});
registerAction2(class FocusBreadcrumbs extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.focus',
            title: localize2('cmd.focus', 'Focus Breadcrumbs'),
            precondition: BreadcrumbsControl.CK_BreadcrumbsVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 85 /* KeyCode.Semicolon */,
                when: BreadcrumbsControl.CK_BreadcrumbsPossible,
            },
            f1: true,
        });
    }
    run(accessor, ...args) {
        focusAndSelectHandler(accessor, false);
    }
});
// this commands is only enabled when breadcrumbs are
// disabled which it then enables and focuses
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.toggleToOn',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
    when: ContextKeyExpr.not('config.breadcrumbs.enabled'),
    handler: async (accessor) => {
        const instant = accessor.get(IInstantiationService);
        const config = accessor.get(IConfigurationService);
        // check if enabled and iff not enable
        const isEnabled = BreadcrumbsConfig.IsEnabled.bindTo(config);
        if (!isEnabled.getValue()) {
            await isEnabled.updateValue(true);
            await timeout(50); // hacky - the widget might not be ready yet...
        }
        return instant.invokeFunction(focusAndSelectHandler, true);
    },
});
// navigation
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 17 /* KeyCode.RightArrow */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */],
    mac: {
        primary: 17 /* KeyCode.RightArrow */,
        secondary: [512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */],
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusNext();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 15 /* KeyCode.LeftArrow */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */],
    mac: {
        primary: 15 /* KeyCode.LeftArrow */,
        secondary: [512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */],
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusPrev();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusNextWithPicker',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusNext();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusPreviousWithPicker',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusPrev();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.selectFocused',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 3 /* KeyCode.Enter */,
    secondary: [18 /* KeyCode.DownArrow */],
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setSelection(widget.getFocused(), BreadcrumbsControl.Payload_Pick);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.revealFocused',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 10 /* KeyCode.Space */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */],
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setSelection(widget.getFocused(), BreadcrumbsControl.Payload_Reveal);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.selectEditor',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 9 /* KeyCode.Escape */,
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setFocused(undefined);
        widget.setSelection(undefined);
        groups.activeGroup.activeEditorPane?.focus();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.revealFocusedFromTreeAside',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const editors = accessor.get(IEditorService);
        const lists = accessor.get(IListService);
        const tree = lists.lastFocusedList;
        if (!(tree instanceof WorkbenchDataTree) && !(tree instanceof WorkbenchAsyncDataTree)) {
            return;
        }
        const element = tree.getFocus()[0];
        if (URI.isUri(element?.resource)) {
            // IFileStat: open file in editor
            return editors.openEditor({
                resource: element.resource,
                options: { pinned: true },
            }, SIDE_GROUP);
        }
        // IOutline: check if this the outline and iff so reveal element
        const input = tree.getInput();
        if (input && typeof input.outlineKind === 'string') {
            return input.reveal(element, {
                pinned: true,
                preserveFocus: false,
            }, true, false);
        }
    },
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNDb250cm9sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYnJlYWRjcnVtYnNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sZUFBZSxFQUNmLGlCQUFpQixHQUdqQixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFD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