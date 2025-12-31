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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9ub3RlYm9va0RpZmZMaXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG9CQUFvQixDQUFBO0FBTTNCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxLQUFLLGNBQWMsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMvRSxPQUFPLEVBR04sY0FBYyxFQUVkLGVBQWUsR0FDZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sWUFBWSxFQUVaLGFBQWEsR0FDYixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQVFwRixPQUFPLEVBSU4sZ0JBQWdCLEdBR2hCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsY0FBYyxFQUNkLHlDQUF5QyxFQUN6QyxhQUFhLEVBQ2IsZUFBZSxFQUNmLCtCQUErQixFQUMvQiwwQkFBMEIsR0FDMUIsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUs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