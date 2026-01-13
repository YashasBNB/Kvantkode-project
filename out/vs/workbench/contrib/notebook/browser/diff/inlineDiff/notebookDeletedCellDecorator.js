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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEZWxldGVkQ2VsbERlY29yYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2lubGluZURpZmYvbm90ZWJvb2tEZWxldGVkQ2VsbERlY29yYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEVBQ1AsWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBR25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTlELE9BQU8sRUFBbUIseUJBQXlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNyRixPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVwRixNQUFN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