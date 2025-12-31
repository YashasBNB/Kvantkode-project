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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNDb250cm9sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2JyZWFkY3J1bWJzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxFQUNOLGVBQWUsRUFDZixpQkFBaUIsR0FHakIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixlQUFlLEVBRWYsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9B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