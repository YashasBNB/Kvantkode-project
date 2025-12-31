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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRW50cnlGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvbm90ZWJvb2tPdXRsaW5lRW50cnlGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRTNGLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFaEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUc5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFNUYsTUFBTSxDQUFOLElBQWtCLHdCQUVqQjtBQUZELFdBQWtCLHdCQUF3QjtJQUN6Qyx5R0FBeUIsQ0FBQTtBQUMxQixDQUFDLEVBRmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFFekM7QUFTRCxTQUFTLDBDQUEwQyxDQUFDLFdBQW1CO0lBQ3RFLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUNqRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNw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