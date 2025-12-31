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
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../../../base/common/lifecycle.js';
import { splitLines } from '../../../../../../base/common/strings.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { tokenizeToString } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
import { DefaultLineHeight } from '../diffElementViewModel.js';
import { NotebookOverviewRulerLane } from '../../notebookBrowser.js';
import * as DOM from '../../../../../../base/browser/dom.js';
import { MenuWorkbenchToolBar, } from '../../../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { overviewRulerDeletedForeground } from '../../../../scm/common/quickDiff.js';
const ttPolicy = createTrustedTypesPolicy('notebookRenderer', { createHTML: (value) => value });
let NotebookDeletedCellDecorator = class NotebookDeletedCellDecorator extends Disposable {
    constructor(_notebookEditor, toolbar, languageService, instantiationService) {
        super();
        this._notebookEditor = _notebookEditor;
        this.toolbar = toolbar;
        this.languageService = languageService;
        this.instantiationService = instantiationService;
        this.zoneRemover = this._register(new DisposableStore());
        this.createdViewZones = new Map();
        this.deletedCellInfos = new Map();
    }
    getTop(deletedIndex) {
        const info = this.deletedCellInfos.get(deletedIndex);
        if (!info) {
            return;
        }
        if (info.previousIndex === -1) {
            // deleted cell is before the first real cell
            return 0;
        }
        const cells = this._notebookEditor.getCellsInRange({
            start: info.previousIndex,
            end: info.previousIndex + 1,
        });
        if (!cells.length) {
            return this._notebookEditor.getLayoutInfo().height + info.offset;
        }
        const cell = cells[0];
        const cellHeight = this._notebookEditor.getHeightOfElement(cell);
        const top = this._notebookEditor.getAbsoluteTopOfElement(cell);
        return top + cellHeight + info.offset;
    }
    reveal(deletedIndex) {
        const top = this.getTop(deletedIndex);
        if (typeof top === 'number') {
            this._notebookEditor.focusContainer();
            this._notebookEditor.revealOffsetInCenterIfOutsideViewport(top);
            const info = this.deletedCellInfos.get(deletedIndex);
            if (info) {
                const prevIndex = info.previousIndex === -1 ? 0 : info.previousIndex;
                this._notebookEditor.setFocus({ start: prevIndex, end: prevIndex });
                this._notebookEditor.setSelections([{ start: prevIndex, end: prevIndex }]);
            }
        }
    }
    apply(diffInfo, original) {
        this.clear();
        let currentIndex = -1;
        const deletedCellsToRender = { cells: [], index: 0 };
        diffInfo.forEach((diff) => {
            if (diff.type === 'delete') {
                const deletedCell = original.cells[diff.originalCellIndex];
                if (deletedCell) {
                    deletedCellsToRender.cells.push({
                        cell: deletedCell,
                        originalIndex: diff.originalCellIndex,
                        previousIndex: currentIndex,
                    });
                    deletedCellsToRender.index = currentIndex;
                }
            }
            else {
                if (deletedCellsToRender.cells.length) {
                    this._createWidget(deletedCellsToRender.index + 1, deletedCellsToRender.cells);
                    deletedCellsToRender.cells.length = 0;
                }
                currentIndex = diff.modifiedCellIndex;
            }
        });
        if (deletedCellsToRender.cells.length) {
            this._createWidget(deletedCellsToRender.index + 1, deletedCellsToRender.cells);
        }
    }
    clear() {
        this.deletedCellInfos.clear();
        this.zoneRemover.clear();
    }
    _createWidget(index, cells) {
        this._createWidgetImpl(index, cells);
    }
    async _createWidgetImpl(index, cells) {
        const rootContainer = document.createElement('div');
        const widgets = [];
        const heights = await Promise.all(cells.map(async (cell) => {
            const widget = new NotebookDeletedCellWidget(this._notebookEditor, this.toolbar, cell.cell.getValue(), cell.cell.language, rootContainer, cell.originalIndex, this.languageService, this.instantiationService);
            widgets.push(widget);
            const height = await widget.render();
            this.deletedCellInfos.set(cell.originalIndex, {
                height,
                previousIndex: cell.previousIndex,
                offset: 0,
            });
            return height;
        }));
        Array.from(this.deletedCellInfos.keys())
            .sort((a, b) => a - b)
            .forEach((originalIndex) => {
            const previousDeletedCell = this.deletedCellInfos.get(originalIndex - 1);
            if (previousDeletedCell) {
                const deletedCell = this.deletedCellInfos.get(originalIndex);
                if (deletedCell) {
                    deletedCell.offset = previousDeletedCell.height + previousDeletedCell.offset;
                }
            }
        });
        const totalHeight = heights.reduce((prev, curr) => prev + curr, 0);
        this._notebookEditor.changeViewZones((accessor) => {
            const notebookViewZone = {
                afterModelPosition: index,
                heightInPx: totalHeight + 4,
                domNode: rootContainer,
            };
            const id = accessor.addZone(notebookViewZone);
            accessor.layoutZone(id);
            this.createdViewZones.set(index, id);
            const deletedCellOverviewRulereDecorationIds = this._notebookEditor.deltaCellDecorations([], [
                {
                    viewZoneId: id,
                    options: {
                        overviewRuler: {
                            color: overviewRulerDeletedForeground,
                            position: NotebookOverviewRulerLane.Center,
                        },
                    },
                },
            ]);
            this.zoneRemover.add(toDisposable(() => {
                if (this.createdViewZones.get(index) === id) {
                    this.createdViewZones.delete(index);
                }
                if (!this._notebookEditor.isDisposed) {
                    this._notebookEditor.changeViewZones((accessor) => {
                        accessor.removeZone(id);
                        dispose(widgets);
                    });
                    this._notebookEditor.deltaCellDecorations(deletedCellOverviewRulereDecorationIds, []);
                }
            }));
        });
    }
};
NotebookDeletedCellDecorator = __decorate([
    __param(2, ILanguageService),
    __param(3, IInstantiationService)
], NotebookDeletedCellDecorator);
export { NotebookDeletedCellDecorator };
let NotebookDeletedCellWidget = class NotebookDeletedCellWidget extends Disposable {
    // private readonly toolbar: HTMLElement;
    constructor(_notebookEditor, _toolbarOptions, code, language, container, _originalIndex, languageService, instantiationService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._toolbarOptions = _toolbarOptions;
        this.code = code;
        this.language = language;
        this._originalIndex = _originalIndex;
        this.languageService = languageService;
        this.instantiationService = instantiationService;
        this.container = DOM.append(container, document.createElement('div'));
        this._register(toDisposable(() => {
            container.removeChild(this.container);
        }));
    }
    async render() {
        const code = this.code;
        const languageId = this.language;
        const codeHtml = await tokenizeToString(this.languageService, code, languageId);
        // const colorMap = this.getDefaultColorMap();
        const fontInfo = this._notebookEditor.getBaseCellEditorOptions(languageId).value;
        const fontFamilyVar = '--notebook-editor-font-family';
        const fontSizeVar = '--notebook-editor-font-size';
        const fontWeightVar = '--notebook-editor-font-weight';
        // If we have any editors, then use left layout of one of those.
        const editor = this._notebookEditor.codeEditors.map((c) => c[1]).find((c) => c);
        const layoutInfo = editor?.getOptions().get(151 /* EditorOption.layoutInfo */);
        const style = `` +
            `font-family: var(${fontFamilyVar});` +
            `font-weight: var(${fontWeightVar});` +
            `font-size: var(${fontSizeVar});` +
            fontInfo.lineHeight
            ? `line-height: ${fontInfo.lineHeight}px;`
            : '' + layoutInfo?.contentLeft
                ? `margin-left: ${layoutInfo}px;`
                : '' + `white-space: pre;`;
        const rootContainer = this.container;
        rootContainer.classList.add('code-cell-row');
        if (this._toolbarOptions) {
            const toolbar = document.createElement('div');
            toolbar.className = this._toolbarOptions?.className;
            rootContainer.appendChild(toolbar);
            const scopedInstaService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this._notebookEditor.scopedContextKeyService])));
            const toolbarWidget = scopedInstaService.createInstance(MenuWorkbenchToolBar, toolbar, this._toolbarOptions.menuId, {
                telemetrySource: this._toolbarOptions.telemetrySource,
                hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
                toolbarOptions: { primaryGroup: () => true },
                menuOptions: {
                    renderShortTitle: true,
                    arg: this._toolbarOptions.argFactory(this._originalIndex),
                },
            });
            this._store.add(toolbarWidget);
            toolbar.style.position = 'absolute';
            toolbar.style.right = '40px';
            toolbar.style.zIndex = '10';
            toolbar.classList.add('hover'); // Show by default
        }
        const container = DOM.append(rootContainer, DOM.$('.cell-inner-container'));
        container.style.position = 'relative'; // Add this line
        const focusIndicatorLeft = DOM.append(container, DOM.$('.cell-focus-indicator.cell-focus-indicator-side.cell-focus-indicator-left'));
        const cellContainer = DOM.append(container, DOM.$('.cell.code'));
        DOM.append(focusIndicatorLeft, DOM.$('div.execution-count-label'));
        const editorPart = DOM.append(cellContainer, DOM.$('.cell-editor-part'));
        let editorContainer = DOM.append(editorPart, DOM.$('.cell-editor-container'));
        editorContainer = DOM.append(editorContainer, DOM.$('.code', { style }));
        if (fontInfo.fontFamily) {
            editorContainer.style.setProperty(fontFamilyVar, fontInfo.fontFamily);
        }
        if (fontInfo.fontSize) {
            editorContainer.style.setProperty(fontSizeVar, `${fontInfo.fontSize}px`);
        }
        if (fontInfo.fontWeight) {
            editorContainer.style.setProperty(fontWeightVar, fontInfo.fontWeight);
        }
        editorContainer.innerHTML = (ttPolicy?.createHTML(codeHtml) || codeHtml);
        const lineCount = splitLines(code).length;
        const height = lineCount * (fontInfo.lineHeight || DefaultLineHeight) + 12 + 12; // We have 12px top and bottom in generated code HTML;
        const totalHeight = height + 16 + 16;
        return totalHeight;
    }
};
NotebookDeletedCellWidget = __decorate([
    __param(6, ILanguageService),
    __param(7, IInstantiationService)
], NotebookDeletedCellWidget);
export { NotebookDeletedCellWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEZWxldGVkQ2VsbERlY29yYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9pbmxpbmVEaWZmL25vdGVib29rRGVsZXRlZENlbGxEZWNvcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsT0FBTyxFQUNQLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUduRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUU5RCxPQUFPLEVBQW1CLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDckYsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sdURBQXVELENBQUE7QUFFOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFcEYsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUMs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