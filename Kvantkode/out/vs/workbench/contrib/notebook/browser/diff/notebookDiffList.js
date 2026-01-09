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
var CellDiffPlaceholderRenderer_1, NotebookDocumentMetadataDiffRenderer_1, CellDiffSingleSideRenderer_1, CellDiffSideBySideRenderer_1;
import './notebookDiff.css';
import * as DOM from '../../../../../base/browser/dom.js';
import * as domStylesheets from '../../../../../base/browser/domStylesheets.js';
import { isMonacoEditor, MouseController, } from '../../../../../base/browser/ui/list/listWidget.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IListService, WorkbenchList, } from '../../../../../platform/list/browser/listService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { DIFF_CELL_MARGIN, } from './notebookDiffEditorBrowser.js';
import { CellDiffPlaceholderElement, CollapsedCellOverlayWidget, DeletedElement, getOptimizedNestedCodeEditorWidgetOptions, InsertElement, ModifiedElement, NotebookDocumentMetadataElement, UnchangedCellOverlayWidget, } from './diffComponents.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { DiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { IMenuService, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { CodiconActionViewItem } from '../view/cellParts/cellActionView.js';
import { BareFontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { WorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { fixedDiffEditorOptions, fixedEditorOptions } from './diffCellEditorOptions.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { localize } from '../../../../../nls.js';
import { EditorExtensionsRegistry } from '../../../../../editor/browser/editorExtensions.js';
let NotebookCellTextDiffListDelegate = class NotebookCellTextDiffListDelegate {
    constructor(targetWindow, configurationService) {
        this.configurationService = configurationService;
        const editorOptions = this.configurationService.getValue('editor');
        this.lineHeight = BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(targetWindow).value).lineHeight;
    }
    getHeight(element) {
        return element.getHeight(this.lineHeight);
    }
    hasDynamicHeight(element) {
        return false;
    }
    getTemplateId(element) {
        switch (element.type) {
            case 'delete':
            case 'insert':
                return CellDiffSingleSideRenderer.TEMPLATE_ID;
            case 'modified':
            case 'unchanged':
                return CellDiffSideBySideRenderer.TEMPLATE_ID;
            case 'placeholder':
                return CellDiffPlaceholderRenderer.TEMPLATE_ID;
            case 'modifiedMetadata':
            case 'unchangedMetadata':
                return NotebookDocumentMetadataDiffRenderer.TEMPLATE_ID;
        }
    }
};
NotebookCellTextDiffListDelegate = __decorate([
    __param(1, IConfigurationService)
], NotebookCellTextDiffListDelegate);
export { NotebookCellTextDiffListDelegate };
let CellDiffPlaceholderRenderer = class CellDiffPlaceholderRenderer {
    static { CellDiffPlaceholderRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'cell_diff_placeholder'; }
    constructor(notebookEditor, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
    }
    get templateId() {
        return CellDiffPlaceholderRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const body = DOM.$('.cell-placeholder-body');
        DOM.append(container, body);
        const elementDisposables = new DisposableStore();
        const marginOverlay = new CollapsedCellOverlayWidget(body);
        const contents = DOM.append(body, DOM.$('.contents'));
        const placeholder = DOM.append(contents, DOM.$('span.text', {
            title: localize('notebook.diff.hiddenCells.expandAll', 'Double click to show'),
        }));
        return {
            body,
            container,
            placeholder,
            marginOverlay,
            elementDisposables,
        };
    }
    renderElement(element, index, templateData, height) {
        templateData.body.classList.remove('left', 'right', 'full');
        templateData.elementDisposables.add(this.instantiationService.createInstance(CellDiffPlaceholderElement, element, templateData));
    }
    disposeTemplate(templateData) {
        templateData.container.innerText = '';
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
};
CellDiffPlaceholderRenderer = CellDiffPlaceholderRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], CellDiffPlaceholderRenderer);
export { CellDiffPlaceholderRenderer };
let NotebookDocumentMetadataDiffRenderer = class NotebookDocumentMetadataDiffRenderer {
    static { NotebookDocumentMetadataDiffRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'notebook_metadata_diff_side_by_side'; }
    constructor(notebookEditor, instantiationService, contextMenuService, keybindingService, menuService, contextKeyService, notificationService, themeService, accessibilityService) {
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.notificationService = notificationService;
        this.themeService = themeService;
        this.accessibilityService = accessibilityService;
    }
    get templateId() {
        return NotebookDocumentMetadataDiffRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const body = DOM.$('.cell-body');
        DOM.append(container, body);
        const diffEditorContainer = DOM.$('.cell-diff-editor-container');
        DOM.append(body, diffEditorContainer);
        const cellHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.input-header-container'));
        const sourceContainer = DOM.append(diffEditorContainer, DOM.$('.source-container'));
        const { editor, editorContainer } = this._buildSourceEditor(sourceContainer);
        const inputToolbarContainer = DOM.append(sourceContainer, DOM.$('.editor-input-toolbar-container'));
        const cellToolbarContainer = DOM.append(inputToolbarContainer, DOM.$('div.property-toolbar'));
        const toolbar = this.instantiationService.createInstance(WorkbenchToolBar, cellToolbarContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    const item = new CodiconActionViewItem(action, { hoverDelegate: options.hoverDelegate }, this.keybindingService, this.notificationService, this.contextKeyService, this.themeService, this.contextMenuService, this.accessibilityService);
                    return item;
                }
                return undefined;
            },
            highlightToggledItems: true,
        });
        const borderContainer = DOM.append(body, DOM.$('.border-container'));
        const leftBorder = DOM.append(borderContainer, DOM.$('.left-border'));
        const rightBorder = DOM.append(borderContainer, DOM.$('.right-border'));
        const topBorder = DOM.append(borderContainer, DOM.$('.top-border'));
        const bottomBorder = DOM.append(borderContainer, DOM.$('.bottom-border'));
        const marginOverlay = new UnchangedCellOverlayWidget(body);
        const elementDisposables = new DisposableStore();
        return {
            body,
            container,
            diffEditorContainer,
            cellHeaderContainer,
            sourceEditor: editor,
            editorContainer,
            inputToolbarContainer,
            toolbar,
            leftBorder,
            rightBorder,
            topBorder,
            bottomBorder,
            marginOverlay,
            elementDisposables,
        };
    }
    _buildSourceEditor(sourceContainer) {
        return buildDiffEditorWidget(this.instantiationService, this.notebookEditor, sourceContainer, {
            readOnly: true,
        });
    }
    renderElement(element, index, templateData, height) {
        templateData.body.classList.remove('full');
        templateData.elementDisposables.add(this.instantiationService.createInstance(NotebookDocumentMetadataElement, this.notebookEditor, element, templateData));
    }
    disposeTemplate(templateData) {
        templateData.container.innerText = '';
        templateData.sourceEditor.dispose();
        templateData.toolbar?.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData) {
        if (templateData.toolbar) {
            templateData.toolbar.context = undefined;
        }
        templateData.elementDisposables.clear();
    }
};
NotebookDocumentMetadataDiffRenderer = NotebookDocumentMetadataDiffRenderer_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, INotificationService),
    __param(7, IThemeService),
    __param(8, IAccessibilityService)
], NotebookDocumentMetadataDiffRenderer);
export { NotebookDocumentMetadataDiffRenderer };
let CellDiffSingleSideRenderer = class CellDiffSingleSideRenderer {
    static { CellDiffSingleSideRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'cell_diff_single'; }
    constructor(notebookEditor, instantiationService) {
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
    }
    get templateId() {
        return CellDiffSingleSideRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const body = DOM.$('.cell-body');
        DOM.append(container, body);
        const diffEditorContainer = DOM.$('.cell-diff-editor-container');
        DOM.append(body, diffEditorContainer);
        const diagonalFill = DOM.append(body, DOM.$('.diagonal-fill'));
        const cellHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.input-header-container'));
        const sourceContainer = DOM.append(diffEditorContainer, DOM.$('.source-container'));
        const { editor, editorContainer } = this._buildSourceEditor(sourceContainer);
        const metadataHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.metadata-header-container'));
        const metadataInfoContainer = DOM.append(diffEditorContainer, DOM.$('.metadata-info-container'));
        const outputHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.output-header-container'));
        const outputInfoContainer = DOM.append(diffEditorContainer, DOM.$('.output-info-container'));
        const borderContainer = DOM.append(body, DOM.$('.border-container'));
        const leftBorder = DOM.append(borderContainer, DOM.$('.left-border'));
        const rightBorder = DOM.append(borderContainer, DOM.$('.right-border'));
        const topBorder = DOM.append(borderContainer, DOM.$('.top-border'));
        const bottomBorder = DOM.append(borderContainer, DOM.$('.bottom-border'));
        return {
            body,
            container,
            editorContainer,
            diffEditorContainer,
            diagonalFill,
            cellHeaderContainer,
            sourceEditor: editor,
            metadataHeaderContainer,
            metadataInfoContainer,
            outputHeaderContainer,
            outputInfoContainer,
            leftBorder,
            rightBorder,
            topBorder,
            bottomBorder,
            elementDisposables: new DisposableStore(),
        };
    }
    _buildSourceEditor(sourceContainer) {
        return buildSourceEditor(this.instantiationService, this.notebookEditor, sourceContainer);
    }
    renderElement(element, index, templateData, height) {
        templateData.body.classList.remove('left', 'right', 'full');
        switch (element.type) {
            case 'delete':
                templateData.elementDisposables.add(this.instantiationService.createInstance(DeletedElement, this.notebookEditor, element, templateData));
                return;
            case 'insert':
                templateData.elementDisposables.add(this.instantiationService.createInstance(InsertElement, this.notebookEditor, element, templateData));
                return;
            default:
                break;
        }
    }
    disposeTemplate(templateData) {
        templateData.container.innerText = '';
        templateData.sourceEditor.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
};
CellDiffSingleSideRenderer = CellDiffSingleSideRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], CellDiffSingleSideRenderer);
export { CellDiffSingleSideRenderer };
let CellDiffSideBySideRenderer = class CellDiffSideBySideRenderer {
    static { CellDiffSideBySideRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'cell_diff_side_by_side'; }
    constructor(notebookEditor, instantiationService, contextMenuService, keybindingService, menuService, contextKeyService, notificationService, themeService, accessibilityService) {
        this.notebookEditor = notebookEditor;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.notificationService = notificationService;
        this.themeService = themeService;
        this.accessibilityService = accessibilityService;
    }
    get templateId() {
        return CellDiffSideBySideRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const body = DOM.$('.cell-body');
        DOM.append(container, body);
        const diffEditorContainer = DOM.$('.cell-diff-editor-container');
        DOM.append(body, diffEditorContainer);
        const cellHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.input-header-container'));
        const sourceContainer = DOM.append(diffEditorContainer, DOM.$('.source-container'));
        const { editor, editorContainer } = this._buildSourceEditor(sourceContainer);
        const inputToolbarContainer = DOM.append(sourceContainer, DOM.$('.editor-input-toolbar-container'));
        const cellToolbarContainer = DOM.append(inputToolbarContainer, DOM.$('div.property-toolbar'));
        const toolbar = this.instantiationService.createInstance(WorkbenchToolBar, cellToolbarContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    const item = new CodiconActionViewItem(action, { hoverDelegate: options.hoverDelegate }, this.keybindingService, this.notificationService, this.contextKeyService, this.themeService, this.contextMenuService, this.accessibilityService);
                    return item;
                }
                return undefined;
            },
            highlightToggledItems: true,
        });
        const metadataHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.metadata-header-container'));
        const metadataInfoContainer = DOM.append(diffEditorContainer, DOM.$('.metadata-info-container'));
        const outputHeaderContainer = DOM.append(diffEditorContainer, DOM.$('.output-header-container'));
        const outputInfoContainer = DOM.append(diffEditorContainer, DOM.$('.output-info-container'));
        const borderContainer = DOM.append(body, DOM.$('.border-container'));
        const leftBorder = DOM.append(borderContainer, DOM.$('.left-border'));
        const rightBorder = DOM.append(borderContainer, DOM.$('.right-border'));
        const topBorder = DOM.append(borderContainer, DOM.$('.top-border'));
        const bottomBorder = DOM.append(borderContainer, DOM.$('.bottom-border'));
        const marginOverlay = new UnchangedCellOverlayWidget(body);
        const elementDisposables = new DisposableStore();
        return {
            body,
            container,
            diffEditorContainer,
            cellHeaderContainer,
            sourceEditor: editor,
            editorContainer,
            inputToolbarContainer,
            toolbar,
            metadataHeaderContainer,
            metadataInfoContainer,
            outputHeaderContainer,
            outputInfoContainer,
            leftBorder,
            rightBorder,
            topBorder,
            bottomBorder,
            marginOverlay,
            elementDisposables,
        };
    }
    _buildSourceEditor(sourceContainer) {
        return buildDiffEditorWidget(this.instantiationService, this.notebookEditor, sourceContainer);
    }
    renderElement(element, index, templateData, height) {
        templateData.body.classList.remove('left', 'right', 'full');
        switch (element.type) {
            case 'unchanged':
                templateData.elementDisposables.add(this.instantiationService.createInstance(ModifiedElement, this.notebookEditor, element, templateData));
                return;
            case 'modified':
                templateData.elementDisposables.add(this.instantiationService.createInstance(ModifiedElement, this.notebookEditor, element, templateData));
                return;
            default:
                break;
        }
    }
    disposeTemplate(templateData) {
        templateData.container.innerText = '';
        templateData.sourceEditor.dispose();
        templateData.toolbar?.dispose();
        templateData.elementDisposables.dispose();
    }
    disposeElement(element, index, templateData) {
        if (templateData.toolbar) {
            templateData.toolbar.context = undefined;
        }
        templateData.elementDisposables.clear();
    }
};
CellDiffSideBySideRenderer = CellDiffSideBySideRenderer_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, INotificationService),
    __param(7, IThemeService),
    __param(8, IAccessibilityService)
], CellDiffSideBySideRenderer);
export { CellDiffSideBySideRenderer };
export class NotebookMouseController extends MouseController {
    onViewPointer(e) {
        if (isMonacoEditor(e.browserEvent.target)) {
            const focus = typeof e.index === 'undefined' ? [] : [e.index];
            this.list.setFocus(focus, e.browserEvent);
        }
        else {
            super.onViewPointer(e);
        }
    }
}
let NotebookTextDiffList = class NotebookTextDiffList extends WorkbenchList {
    get rowsContainer() {
        return this.view.containerDomNode;
    }
    constructor(listUser, container, delegate, renderers, contextKeyService, options, listService, configurationService, instantiationService) {
        super(listUser, container, delegate, renderers, options, contextKeyService, listService, configurationService, instantiationService);
    }
    createMouseController(options) {
        return new NotebookMouseController(this);
    }
    getCellViewScrollTop(element) {
        const index = this.indexOf(element);
        // if (index === undefined || index < 0 || index >= this.length) {
        // 	this._getViewIndexUpperBound(element);
        // 	throw new ListError(this.listUser, `Invalid index ${index}`);
        // }
        return this.view.elementTop(index);
    }
    getScrollHeight() {
        return this.view.scrollHeight;
    }
    triggerScrollFromMouseWheelEvent(browserEvent) {
        this.view.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this.view.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    clear() {
        super.splice(0, this.length);
    }
    updateElementHeight2(element, size) {
        const viewIndex = this.indexOf(element);
        const focused = this.getFocus();
        this.view.updateElementHeight(viewIndex, size, focused.length ? focused[0] : null);
    }
    style(styles) {
        const selectorSuffix = this.view.domId;
        if (!this.styleElement) {
            this.styleElement = domStylesheets.createStyleSheet(this.view.domNode);
        }
        const suffix = selectorSuffix && `.${selectorSuffix}`;
        const content = [];
        if (styles.listBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows { background: ${styles.listBackground}; }`);
        }
        if (styles.listFocusBackground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { background-color: ${styles.listFocusBackground}; }`);
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused:hover { background-color: ${styles.listFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listFocusForeground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
        }
        if (styles.listActiveSelectionBackground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { background-color: ${styles.listActiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected:hover { background-color: ${styles.listActiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listActiveSelectionForeground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
        }
        if (styles.listFocusAndSelectionBackground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected.focused { background-color: ${styles.listFocusAndSelectionBackground}; }
			`);
        }
        if (styles.listFocusAndSelectionForeground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
        }
        if (styles.listInactiveFocusBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { background-color:  ${styles.listInactiveFocusBackground}; }`);
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused:hover { background-color:  ${styles.listInactiveFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { background-color:  ${styles.listInactiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected:hover { background-color:  ${styles.listInactiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionForeground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listInactiveSelectionForeground}; }`);
        }
        if (styles.listHoverBackground) {
            content.push(`.monaco-list${suffix}:not(.drop-target) > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { background-color:  ${styles.listHoverBackground}; }`);
        }
        if (styles.listHoverForeground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
        }
        if (styles.listSelectionOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
        }
        if (styles.listFocusOutline) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
        }
        if (styles.listInactiveFocusOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px dotted ${styles.listInactiveFocusOutline}; outline-offset: -1px; }`);
        }
        if (styles.listHoverOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
        }
        if (styles.listDropOverBackground) {
            content.push(`
				.monaco-list${suffix}.drop-target,
				.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows.drop-target,
				.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-row.drop-target { background-color: ${styles.listDropOverBackground} !important; color: inherit !important; }
			`);
        }
        const newStyles = content.join('\n');
        if (newStyles !== this.styleElement.textContent) {
            this.styleElement.textContent = newStyles;
        }
    }
};
NotebookTextDiffList = __decorate([
    __param(6, IListService),
    __param(7, IConfigurationService),
    __param(8, IInstantiationService)
], NotebookTextDiffList);
export { NotebookTextDiffList };
function buildDiffEditorWidget(instantiationService, notebookEditor, sourceContainer, options = {}) {
    const editorContainer = DOM.append(sourceContainer, DOM.$('.editor-container'));
    const editor = instantiationService.createInstance(DiffEditorWidget, editorContainer, {
        ...fixedDiffEditorOptions,
        overflowWidgetsDomNode: notebookEditor.getOverflowContainerDomNode(),
        originalEditable: false,
        ignoreTrimWhitespace: false,
        automaticLayout: false,
        dimension: {
            height: 0,
            width: 0,
        },
        renderSideBySide: true,
        useInlineViewWhenSpaceIsLimited: false,
        ...options,
    }, {
        originalEditor: getOptimizedNestedCodeEditorWidgetOptions(),
        modifiedEditor: getOptimizedNestedCodeEditorWidgetOptions(),
    });
    return {
        editor,
        editorContainer,
    };
}
function buildSourceEditor(instantiationService, notebookEditor, sourceContainer, options = {}) {
    const editorContainer = DOM.append(sourceContainer, DOM.$('.editor-container'));
    const skipContributions = ['editor.contrib.emptyTextEditorHint'];
    const editor = instantiationService.createInstance(CodeEditorWidget, editorContainer, {
        ...fixedEditorOptions,
        glyphMargin: false,
        dimension: {
            width: (notebookEditor.getLayoutInfo().width - 2 * DIFF_CELL_MARGIN) / 2 - 18,
            height: 0,
        },
        automaticLayout: false,
        overflowWidgetsDomNode: notebookEditor.getOverflowContainerDomNode(),
        readOnly: true,
    }, {
        contributions: EditorExtensionsRegistry.getEditorContributions().filter((c) => skipContributions.indexOf(c.id) === -1),
    });
    return { editor, editorContainer };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rRGlmZkxpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sb0JBQW9CLENBQUE7QUFNM0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEtBQUssY0FBYyxNQUFNLCtDQUErQyxDQUFBO0FBQy9FLE9BQU8sRUFHTixjQUFjLEVBRWQsZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixZQUFZLEVBRVosYUFBYSxHQUNiLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBUXBGLE9BQU8sRUFJTixnQkFBZ0IsR0FHaEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQixjQUFjLEVBQ2QseUNBQXlDLEVBQ3pDLGFBQWEsRUFDYixlQUFlLEVBQ2YsK0JBQStCLEVBQy9CLDBCQUEwQixHQUMxQixNQUFNLHFCQUFxQixDQUFBO0FBQzVC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