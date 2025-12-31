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
var MarkupCellRenderer_1, CodeCellRenderer_1;
import { PixelRatio } from '../../../../../../base/browser/pixelRatio.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../../../base/browser/fastDomNode.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { BareFontInfo } from '../../../../../../editor/common/config/fontInfo.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../../editor/common/languages/modesRegistry.js';
import { localize } from '../../../../../../nls.js';
import { IMenuService } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { CellPartsCollection } from '../cellPart.js';
import { CellChatPart } from '../cellParts/chat/cellChatPart.js';
import { CellComments } from '../cellParts/cellComments.js';
import { CellContextKeyPart } from '../cellParts/cellContextKeys.js';
import { CellDecorations } from '../cellParts/cellDecorations.js';
import { CellDragAndDropPart } from '../cellParts/cellDnd.js';
import { CodeCellDragImageRenderer } from '../cellParts/cellDragRenderer.js';
import { CellEditorOptions } from '../cellParts/cellEditorOptions.js';
import { CellExecutionPart } from '../cellParts/cellExecution.js';
import { CellFocusPart } from '../cellParts/cellFocus.js';
import { CellFocusIndicator } from '../cellParts/cellFocusIndicator.js';
import { CellProgressBar } from '../cellParts/cellProgressBar.js';
import { CellEditorStatusBar } from '../cellParts/cellStatusPart.js';
import { BetweenCellToolbar, CellTitleToolbarPart } from '../cellParts/cellToolbars.js';
import { CodeCell } from '../cellParts/codeCell.js';
import { RunToolbar } from '../cellParts/codeCellRunToolbar.js';
import { CollapsedCellInput } from '../cellParts/collapsedCellInput.js';
import { CollapsedCellOutput } from '../cellParts/collapsedCellOutput.js';
import { FoldedCellHint } from '../cellParts/foldedCellHint.js';
import { MarkupCell } from '../cellParts/markupCell.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
const $ = DOM.$;
let NotebookCellListDelegate = class NotebookCellListDelegate extends Disposable {
    constructor(targetWindow, configurationService) {
        super();
        this.configurationService = configurationService;
        const editorOptions = this.configurationService.getValue('editor');
        this.lineHeight = BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(targetWindow).value).lineHeight;
    }
    getHeight(element) {
        return element.getHeight(this.lineHeight);
    }
    getDynamicHeight(element) {
        return element.getDynamicHeight();
    }
    getTemplateId(element) {
        if (element.cellKind === CellKind.Markup) {
            return MarkupCellRenderer.TEMPLATE_ID;
        }
        else {
            return CodeCellRenderer.TEMPLATE_ID;
        }
    }
};
NotebookCellListDelegate = __decorate([
    __param(1, IConfigurationService)
], NotebookCellListDelegate);
export { NotebookCellListDelegate };
class AbstractCellRenderer extends Disposable {
    constructor(instantiationService, notebookEditor, contextMenuService, menuService, configurationService, keybindingService, notificationService, contextKeyServiceProvider, language, dndController) {
        super();
        this.instantiationService = instantiationService;
        this.notebookEditor = notebookEditor;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.contextKeyServiceProvider = contextKeyServiceProvider;
        this.dndController = dndController;
        this.editorOptions = this._register(new CellEditorOptions(this.notebookEditor.getBaseCellEditorOptions(language), this.notebookEditor.notebookOptions, configurationService));
    }
    dispose() {
        super.dispose();
        this.dndController = undefined;
    }
}
let MarkupCellRenderer = class MarkupCellRenderer extends AbstractCellRenderer {
    static { MarkupCellRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'markdown_cell'; }
    constructor(notebookEditor, dndController, renderedEditors, contextKeyServiceProvider, configurationService, instantiationService, contextMenuService, menuService, keybindingService, notificationService, notebookExecutionStateService) {
        super(instantiationService, notebookEditor, contextMenuService, menuService, configurationService, keybindingService, notificationService, contextKeyServiceProvider, 'markdown', dndController);
        this.renderedEditors = renderedEditors;
        this._notebookExecutionStateService = notebookExecutionStateService;
    }
    get templateId() {
        return MarkupCellRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(rootContainer) {
        rootContainer.classList.add('markdown-cell-row');
        const container = DOM.append(rootContainer, DOM.$('.cell-inner-container'));
        const templateDisposables = new DisposableStore();
        const contextKeyService = templateDisposables.add(this.contextKeyServiceProvider(container));
        const decorationContainer = DOM.append(rootContainer, $('.cell-decoration'));
        const titleToolbarContainer = DOM.append(container, $('.cell-title-toolbar'));
        const focusIndicatorTop = new FastDomNode(DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-top')));
        const focusIndicatorLeft = new FastDomNode(DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-left')));
        const foldingIndicator = DOM.append(focusIndicatorLeft.domNode, DOM.$('.notebook-folding-indicator'));
        const focusIndicatorRight = new FastDomNode(DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-right')));
        const codeInnerContent = DOM.append(container, $('.cell.code'));
        const editorPart = DOM.append(codeInnerContent, $('.cell-editor-part'));
        const cellChatPart = DOM.append(editorPart, $('.cell-chat-part'));
        const cellInputCollapsedContainer = DOM.append(codeInnerContent, $('.input-collapse-container'));
        cellInputCollapsedContainer.style.display = 'none';
        const editorContainer = DOM.append(editorPart, $('.cell-editor-container'));
        editorPart.style.display = 'none';
        const cellCommentPartContainer = DOM.append(container, $('.cell-comment-container'));
        const innerContent = DOM.append(container, $('.cell.markdown'));
        const bottomCellContainer = DOM.append(container, $('.cell-bottom-toolbar-container'));
        const scopedInstaService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const rootClassDelegate = {
            toggle: (className, force) => container.classList.toggle(className, force),
        };
        const titleToolbar = templateDisposables.add(scopedInstaService.createInstance(CellTitleToolbarPart, titleToolbarContainer, rootClassDelegate, this.notebookEditor.creationOptions.menuIds.cellTitleToolbar, this.notebookEditor.creationOptions.menuIds.cellDeleteToolbar, this.notebookEditor));
        const focusIndicatorBottom = new FastDomNode(DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-bottom')));
        const cellParts = new CellPartsCollection(DOM.getWindow(rootContainer), [
            templateDisposables.add(scopedInstaService.createInstance(CellChatPart, this.notebookEditor, cellChatPart)),
            templateDisposables.add(scopedInstaService.createInstance(CellEditorStatusBar, this.notebookEditor, container, editorPart, undefined)),
            templateDisposables.add(new CellFocusIndicator(this.notebookEditor, titleToolbar, focusIndicatorTop, focusIndicatorLeft, focusIndicatorRight, focusIndicatorBottom)),
            templateDisposables.add(new FoldedCellHint(this.notebookEditor, DOM.append(container, $('.notebook-folded-hint')), this._notebookExecutionStateService)),
            templateDisposables.add(new CellDecorations(this.notebookEditor, rootContainer, decorationContainer)),
            templateDisposables.add(scopedInstaService.createInstance(CellComments, this.notebookEditor, cellCommentPartContainer)),
            templateDisposables.add(new CollapsedCellInput(this.notebookEditor, cellInputCollapsedContainer)),
            templateDisposables.add(new CellFocusPart(container, undefined, this.notebookEditor)),
            templateDisposables.add(new CellDragAndDropPart(container)),
            templateDisposables.add(scopedInstaService.createInstance(CellContextKeyPart, this.notebookEditor)),
        ], [
            titleToolbar,
            templateDisposables.add(scopedInstaService.createInstance(BetweenCellToolbar, this.notebookEditor, titleToolbarContainer, bottomCellContainer)),
        ]);
        templateDisposables.add(cellParts);
        const templateData = {
            rootContainer,
            cellInputCollapsedContainer,
            instantiationService: scopedInstaService,
            container,
            cellContainer: innerContent,
            editorPart,
            editorContainer,
            foldingIndicator,
            templateDisposables,
            elementDisposables: templateDisposables.add(new DisposableStore()),
            cellParts,
            toJSON: () => {
                return {};
            },
        };
        return templateData;
    }
    renderElement(element, index, templateData, height) {
        if (!this.notebookEditor.hasModel()) {
            throw new Error('The notebook editor is not attached with view model yet.');
        }
        templateData.currentRenderedCell = element;
        templateData.currentEditor = undefined;
        templateData.editorPart.style.display = 'none';
        templateData.cellContainer.innerText = '';
        if (height === undefined) {
            return;
        }
        templateData.elementDisposables.add(templateData.instantiationService.createInstance(MarkupCell, this.notebookEditor, element, templateData, this.renderedEditors));
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposables.clear();
    }
};
MarkupCellRenderer = MarkupCellRenderer_1 = __decorate([
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IContextMenuService),
    __param(7, IMenuService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, INotebookExecutionStateService)
], MarkupCellRenderer);
export { MarkupCellRenderer };
let CodeCellRenderer = class CodeCellRenderer extends AbstractCellRenderer {
    static { CodeCellRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'code_cell'; }
    constructor(notebookEditor, renderedEditors, editorPool, dndController, contextKeyServiceProvider, configurationService, contextMenuService, menuService, instantiationService, keybindingService, notificationService) {
        super(instantiationService, notebookEditor, contextMenuService, menuService, configurationService, keybindingService, notificationService, contextKeyServiceProvider, PLAINTEXT_LANGUAGE_ID, dndController);
        this.renderedEditors = renderedEditors;
        this.editorPool = editorPool;
    }
    get templateId() {
        return CodeCellRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(rootContainer) {
        rootContainer.classList.add('code-cell-row');
        const container = DOM.append(rootContainer, DOM.$('.cell-inner-container'));
        const templateDisposables = new DisposableStore();
        const contextKeyService = templateDisposables.add(this.contextKeyServiceProvider(container));
        const decorationContainer = DOM.append(rootContainer, $('.cell-decoration'));
        const focusIndicatorTop = new FastDomNode(DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-top')));
        const titleToolbarContainer = DOM.append(container, $('.cell-title-toolbar'));
        // This is also the drag handle
        const focusIndicatorLeft = new FastDomNode(DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-left')));
        const cellChatPart = DOM.append(container, $('.cell-chat-part'));
        const cellContainer = DOM.append(container, $('.cell.code'));
        const runButtonContainer = DOM.append(cellContainer, $('.run-button-container'));
        const cellInputCollapsedContainer = DOM.append(cellContainer, $('.input-collapse-container'));
        cellInputCollapsedContainer.style.display = 'none';
        const executionOrderLabel = DOM.append(focusIndicatorLeft.domNode, $('div.execution-count-label'));
        executionOrderLabel.title = localize('cellExecutionOrderCountLabel', 'Execution Order');
        const editorPart = DOM.append(cellContainer, $('.cell-editor-part'));
        const editorContainer = DOM.append(editorPart, $('.cell-editor-container'));
        const cellCommentPartContainer = DOM.append(container, $('.cell-comment-container'));
        // create a special context key service that set the inCompositeEditor-contextkey
        const editorContextKeyService = templateDisposables.add(this.contextKeyServiceProvider(editorPart));
        const editorInstaService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editorContextKeyService])));
        EditorContextKeys.inCompositeEditor.bindTo(editorContextKeyService).set(true);
        const editor = editorInstaService.createInstance(CodeEditorWidget, editorContainer, {
            ...this.editorOptions.getDefaultValue(),
            dimension: {
                width: 0,
                height: 0,
            },
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'auto',
                handleMouseWheel: false,
                useShadows: false,
            },
        }, {
            contributions: this.notebookEditor.creationOptions.cellEditorContributions,
        });
        templateDisposables.add(editor);
        const outputContainer = new FastDomNode(DOM.append(container, $('.output')));
        const cellOutputCollapsedContainer = DOM.append(outputContainer.domNode, $('.output-collapse-container'));
        const outputShowMoreContainer = new FastDomNode(DOM.append(container, $('.output-show-more-container')));
        const focusIndicatorRight = new FastDomNode(DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-right')));
        const focusSinkElement = DOM.append(container, $('.cell-editor-focus-sink'));
        focusSinkElement.setAttribute('tabindex', '0');
        const bottomCellToolbarContainer = DOM.append(container, $('.cell-bottom-toolbar-container'));
        const focusIndicatorBottom = new FastDomNode(DOM.append(container, $('.cell-focus-indicator.cell-focus-indicator-bottom')));
        const scopedInstaService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        const rootClassDelegate = {
            toggle: (className, force) => container.classList.toggle(className, force),
        };
        const titleToolbar = templateDisposables.add(scopedInstaService.createInstance(CellTitleToolbarPart, titleToolbarContainer, rootClassDelegate, this.notebookEditor.creationOptions.menuIds.cellTitleToolbar, this.notebookEditor.creationOptions.menuIds.cellDeleteToolbar, this.notebookEditor));
        const focusIndicatorPart = templateDisposables.add(new CellFocusIndicator(this.notebookEditor, titleToolbar, focusIndicatorTop, focusIndicatorLeft, focusIndicatorRight, focusIndicatorBottom));
        const contentParts = [
            focusIndicatorPart,
            templateDisposables.add(scopedInstaService.createInstance(CellChatPart, this.notebookEditor, cellChatPart)),
            templateDisposables.add(scopedInstaService.createInstance(CellEditorStatusBar, this.notebookEditor, container, editorPart, editor)),
            templateDisposables.add(scopedInstaService.createInstance(CellProgressBar, editorPart, cellInputCollapsedContainer)),
            templateDisposables.add(new CellDecorations(this.notebookEditor, rootContainer, decorationContainer)),
            templateDisposables.add(scopedInstaService.createInstance(CellComments, this.notebookEditor, cellCommentPartContainer)),
            templateDisposables.add(scopedInstaService.createInstance(CellExecutionPart, this.notebookEditor, executionOrderLabel)),
            templateDisposables.add(scopedInstaService.createInstance(CollapsedCellOutput, this.notebookEditor, cellOutputCollapsedContainer)),
            templateDisposables.add(new CollapsedCellInput(this.notebookEditor, cellInputCollapsedContainer)),
            templateDisposables.add(new CellFocusPart(container, focusSinkElement, this.notebookEditor)),
            templateDisposables.add(new CellDragAndDropPart(container)),
            templateDisposables.add(scopedInstaService.createInstance(CellContextKeyPart, this.notebookEditor)),
        ];
        const { cellExecutePrimary, cellExecuteToolbar } = this.notebookEditor.creationOptions.menuIds;
        if (cellExecutePrimary && cellExecuteToolbar) {
            contentParts.push(templateDisposables.add(scopedInstaService.createInstance(RunToolbar, this.notebookEditor, contextKeyService, container, runButtonContainer, cellExecutePrimary, cellExecuteToolbar)));
        }
        const cellParts = new CellPartsCollection(DOM.getWindow(rootContainer), contentParts, [
            titleToolbar,
            templateDisposables.add(scopedInstaService.createInstance(BetweenCellToolbar, this.notebookEditor, titleToolbarContainer, bottomCellToolbarContainer)),
        ]);
        templateDisposables.add(cellParts);
        const templateData = {
            rootContainer,
            editorPart,
            cellInputCollapsedContainer,
            cellOutputCollapsedContainer,
            instantiationService: scopedInstaService,
            container,
            cellContainer,
            focusSinkElement,
            outputContainer,
            outputShowMoreContainer,
            editor,
            templateDisposables,
            elementDisposables: templateDisposables.add(new DisposableStore()),
            cellParts,
            toJSON: () => {
                return {};
            },
        };
        // focusIndicatorLeft covers the left margin area
        // code/outputFocusIndicator need to be registered as drag handlers so their click handlers don't take over
        const dragHandles = [
            focusIndicatorLeft.domNode,
            focusIndicatorPart.codeFocusIndicator.domNode,
            focusIndicatorPart.outputFocusIndicator.domNode,
        ];
        this.dndController?.registerDragHandle(templateData, rootContainer, dragHandles, () => new CodeCellDragImageRenderer().getDragImage(templateData, templateData.editor, 'code'));
        return templateData;
    }
    renderElement(element, index, templateData, height) {
        if (!this.notebookEditor.hasModel()) {
            throw new Error('The notebook editor is not attached with view model yet.');
        }
        templateData.currentRenderedCell = element;
        if (height === undefined) {
            return;
        }
        templateData.outputContainer.domNode.innerText = '';
        templateData.outputContainer.domNode.appendChild(templateData.cellOutputCollapsedContainer);
        templateData.elementDisposables.add(templateData.instantiationService.createInstance(CodeCell, this.notebookEditor, element, templateData, this.editorPool));
        this.renderedEditors.set(element, templateData.editor);
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
        this.renderedEditors.delete(element);
    }
};
CodeCellRenderer = CodeCellRenderer_1 = __decorate([
    __param(5, IConfigurationService),
    __param(6, IContextMenuService),
    __param(7, IMenuService),
    __param(8, IInstantiationService),
    __param(9, IKeybindingService),
    __param(10, INotificationService)
], CodeCellRenderer);
export { CodeCellRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L3JlbmRlcmVycy9jZWxsUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN6RSxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXhGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBRXpHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN4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