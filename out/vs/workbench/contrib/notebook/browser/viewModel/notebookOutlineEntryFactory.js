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
import { renderMarkdownAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { IOutlineModelService, } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { localize } from '../../../../../nls.js';
import { getMarkdownHeadersInCell } from './foldingModel.js';
import { OutlineEntry } from './OutlineEntry.js';
import { CellKind } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
export var NotebookOutlineConstants;
(function (NotebookOutlineConstants) {
    NotebookOutlineConstants[NotebookOutlineConstants["NonHeaderOutlineLevel"] = 7] = "NonHeaderOutlineLevel";
})(NotebookOutlineConstants || (NotebookOutlineConstants = {}));
function getMarkdownHeadersInCellFallbackToHtmlTags(fullContent) {
    const headers = Array.from(getMarkdownHeadersInCell(fullContent));
    if (headers.length) {
        return headers;
    }
    // no markdown syntax headers, try to find html tags
    const match = fullContent.match(/<h([1-6]).*>(.*)<\/h\1>/i);
    if (match) {
        const level = parseInt(match[1]);
        const text = match[2].trim();
        headers.push({ depth: level, text });
    }
    return headers;
}
export const INotebookOutlineEntryFactory = createDecorator('INotebookOutlineEntryFactory');
let NotebookOutlineEntryFactory = class NotebookOutlineEntryFactory {
    constructor(executionStateService, outlineModelService, textModelService) {
        this.executionStateService = executionStateService;
        this.outlineModelService = outlineModelService;
        this.textModelService = textModelService;
        this.cellOutlineEntryCache = {};
        this.cachedMarkdownOutlineEntries = new WeakMap();
    }
    getOutlineEntries(cell, index) {
        const entries = [];
        const isMarkdown = cell.cellKind === CellKind.Markup;
        // cap the amount of characters that we look at and use the following logic
        // - for MD prefer headings (each header is an entry)
        // - otherwise use the first none-empty line of the cell (MD or code)
        let content = getCellFirstNonEmptyLine(cell);
        let hasHeader = false;
        if (isMarkdown) {
            const fullContent = cell.getText().substring(0, 10000);
            const cache = this.cachedMarkdownOutlineEntries.get(cell);
            const headers = cache?.alternativeId === cell.getAlternativeId()
                ? cache.headers
                : Array.from(getMarkdownHeadersInCellFallbackToHtmlTags(fullContent));
            this.cachedMarkdownOutlineEntries.set(cell, {
                alternativeId: cell.getAlternativeId(),
                headers,
            });
            for (const { depth, text } of headers) {
                hasHeader = true;
                entries.push(new OutlineEntry(index++, depth, cell, text, false, false));
            }
            if (!hasHeader) {
                content = renderMarkdownAsPlaintext({ value: content });
            }
        }
        if (!hasHeader) {
            const exeState = !isMarkdown && this.executionStateService.getCellExecution(cell.uri);
            let preview = content.trim();
            if (!isMarkdown) {
                const cached = this.cellOutlineEntryCache[cell.id];
                // Gathering symbols from the model is an async operation, but this provider is syncronous.
                // So symbols need to be precached before this function is called to get the full list.
                if (cached) {
                    // push code cell entry that is a parent of cached symbols, always necessary. filtering for quickpick done in that provider.
                    entries.push(new OutlineEntry(index++, 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */, cell, preview, !!exeState, exeState ? exeState.isPaused : false));
                    cached.forEach((entry) => {
                        entries.push(new OutlineEntry(index++, entry.level, cell, entry.name, false, false, entry.range, entry.kind));
                    });
                }
            }
            if (entries.length === 0) {
                // if there are no cached entries, use the first line of the cell as a code cell
                if (preview.length === 0) {
                    // empty or just whitespace
                    preview = localize('empty', 'empty cell');
                }
                entries.push(new OutlineEntry(index++, 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */, cell, preview, !!exeState, exeState ? exeState.isPaused : false));
            }
        }
        return entries;
    }
    async cacheSymbols(cell, cancelToken) {
        if (cell.cellKind === CellKind.Markup) {
            return;
        }
        const ref = await this.textModelService.createModelReference(cell.uri);
        try {
            const textModel = ref.object.textEditorModel;
            const outlineModel = await this.outlineModelService.getOrCreate(textModel, cancelToken);
            const entries = createOutlineEntries(outlineModel.getTopLevelSymbols(), 8);
            this.cellOutlineEntryCache[cell.id] = entries;
        }
        finally {
            ref.dispose();
        }
    }
};
NotebookOutlineEntryFactory = __decorate([
    __param(0, INotebookExecutionStateService),
    __param(1, IOutlineModelService),
    __param(2, ITextModelService)
], NotebookOutlineEntryFactory);
export { NotebookOutlineEntryFactory };
function createOutlineEntries(symbols, level) {
    const entries = [];
    symbols.forEach((symbol) => {
        entries.push({ name: symbol.name, range: symbol.range, level, kind: symbol.kind });
        if (symbol.children) {
            entries.push(...createOutlineEntries(symbol.children, level + 1));
        }
    });
    return entries;
}
function getCellFirstNonEmptyLine(cell) {
    const textBuffer = cell.textBuffer;
    for (let i = 0; i < textBuffer.getLineCount(); i++) {
        const firstNonWhitespace = textBuffer.getLineFirstNonWhitespaceColumn(i + 1);
        const lineLength = textBuffer.getLineLength(i + 1);
        if (firstNonWhitespace < lineLength) {
            return textBuffer.getLineContent(i + 1);
        }
    }
    return cell.getText().substring(0, 100);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRW50cnlGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9ub3RlYm9va091dGxpbmVFbnRyeUZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFM0YsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDaEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUU1RixNQUFNLENBQU4sSUFBa0Isd0JBRWpCO0FBRkQsV0FBa0Isd0JBQXdCO0lBQ3pDLHlHQUF5QixDQUFBO0FBQzFCLENBQUMsRUFGaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUV6QztBQVNELFNBQVMsMENBQTBDLENBQUMsV0FBbUI7SUFDdEUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFD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