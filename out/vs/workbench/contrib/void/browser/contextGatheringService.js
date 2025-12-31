var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Position } from '../../../../editor/common/core/position.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
export const IContextGatheringService = createDecorator('contextGatheringService');
let ContextGatheringService = class ContextGatheringService extends Disposable {
    constructor(_langFeaturesService, _modelService, _codeEditorService) {
        super();
        this._langFeaturesService = _langFeaturesService;
        this._modelService = _modelService;
        this._codeEditorService = _codeEditorService;
        this._NUM_LINES = 3;
        // Cache holds the most recent list of snippets.
        this._cache = [];
        this._snippetIntervals = [];
        this._modelService.getModels().forEach((model) => this._subscribeToModel(model));
        this._register(this._modelService.onModelAdded((model) => this._subscribeToModel(model)));
    }
    _subscribeToModel(model) {
        console.log('Subscribing to model:', model.uri.toString());
        this._register(model.onDidChangeContent(() => {
            const editor = this._codeEditorService.getFocusedCodeEditor();
            if (editor && editor.getModel() === model) {
                const pos = editor.getPosition();
                console.log('updateCache called at position:', pos);
                if (pos) {
                    this.updateCache(model, pos);
                }
            }
        }));
    }
    async updateCache(model, pos) {
        const snippets = new Set();
        this._snippetIntervals = []; // Reset intervals for new cache update
        await this._gatherNearbySnippets(model, pos, this._NUM_LINES, 3, snippets, this._snippetIntervals);
        await this._gatherParentSnippets(model, pos, this._NUM_LINES, 3, snippets, this._snippetIntervals);
        // Convert to array and filter overlapping snippets
        this._cache = Array.from(snippets);
        console.log('Cache updated:', this._cache);
    }
    getCachedSnippets() {
        return this._cache;
    }
    // Basic snippet extraction.
    _getSnippetForRange(model, range, numLines) {
        const startLine = Math.max(range.startLineNumber - numLines, 1);
        const endLine = Math.min(range.endLineNumber + numLines, model.getLineCount());
        const snippetRange = new Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        return this._cleanSnippet(model.getValueInRange(snippetRange));
    }
    _cleanSnippet(snippet) {
        return (snippet
            .split('\n')
            // Remove empty lines and lines with only comments
            .filter((line) => {
            const trimmed = line.trim();
            return trimmed && !/^\/\/+$/.test(trimmed);
        })
            // Rejoin with newlines
            .join('\n')
            // Remove excess whitespace
            .trim());
    }
    _normalizeSnippet(snippet) {
        return (snippet
            // Remove multiple newlines
            .replace(/\n{2,}/g, '\n')
            // Remove trailing whitespace
            .trim());
    }
    _addSnippetIfNotOverlapping(model, range, snippets, visited) {
        const startLine = range.startLineNumber;
        const endLine = range.endLineNumber;
        const uri = model.uri.toString();
        if (!this._isRangeVisited(uri, startLine, endLine, visited)) {
            visited.push({ uri, startLine, endLine });
            const snippet = this._normalizeSnippet(this._getSnippetForRange(model, range, this._NUM_LINES));
            if (snippet.length > 0) {
                snippets.add(snippet);
            }
        }
    }
    async _gatherNearbySnippets(model, pos, numLines, depth, snippets, visited) {
        if (depth <= 0)
            return;
        const startLine = Math.max(pos.lineNumber - numLines, 1);
        const endLine = Math.min(pos.lineNumber + numLines, model.getLineCount());
        const range = new Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        this._addSnippetIfNotOverlapping(model, range, snippets, visited);
        const symbols = await this._getSymbolsNearPosition(model, pos, numLines);
        for (const sym of symbols) {
            const defs = await this._getDefinitionSymbols(model, sym);
            for (const def of defs) {
                const defModel = this._modelService.getModel(def.uri);
                if (defModel) {
                    const defPos = new Position(def.range.startLineNumber, def.range.startColumn);
                    this._addSnippetIfNotOverlapping(defModel, def.range, snippets, visited);
                    await this._gatherNearbySnippets(defModel, defPos, numLines, depth - 1, snippets, visited);
                }
            }
        }
    }
    async _gatherParentSnippets(model, pos, numLines, depth, snippets, visited) {
        if (depth <= 0)
            return;
        const container = await this._findContainerFunction(model, pos);
        if (!container)
            return;
        const containerRange = container.kind === 5 /* SymbolKind.Method */ ? container.selectionRange : container.range;
        this._addSnippetIfNotOverlapping(model, containerRange, snippets, visited);
        const symbols = await this._getSymbolsNearRange(model, containerRange, numLines);
        for (const sym of symbols) {
            const defs = await this._getDefinitionSymbols(model, sym);
            for (const def of defs) {
                const defModel = this._modelService.getModel(def.uri);
                if (defModel) {
                    const defPos = new Position(def.range.startLineNumber, def.range.startColumn);
                    this._addSnippetIfNotOverlapping(defModel, def.range, snippets, visited);
                    await this._gatherNearbySnippets(defModel, defPos, numLines, depth - 1, snippets, visited);
                }
            }
        }
        const containerPos = new Position(containerRange.startLineNumber, containerRange.startColumn);
        await this._gatherParentSnippets(model, containerPos, numLines, depth - 1, snippets, visited);
    }
    _isRangeVisited(uri, startLine, endLine, visited) {
        return visited.some((interval) => interval.uri === uri && !(endLine < interval.startLine || startLine > interval.endLine));
    }
    async _getSymbolsNearPosition(model, pos, numLines) {
        const startLine = Math.max(pos.lineNumber - numLines, 1);
        const endLine = Math.min(pos.lineNumber + numLines, model.getLineCount());
        const range = new Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        return this._getSymbolsInRange(model, range);
    }
    async _getSymbolsNearRange(model, range, numLines) {
        const centerLine = Math.floor((range.startLineNumber + range.endLineNumber) / 2);
        const startLine = Math.max(centerLine - numLines, 1);
        const endLine = Math.min(centerLine + numLines, model.getLineCount());
        const searchRange = new Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        return this._getSymbolsInRange(model, searchRange);
    }
    async _getSymbolsInRange(model, range) {
        const symbols = [];
        const providers = this._langFeaturesService.documentSymbolProvider.ordered(model);
        for (const provider of providers) {
            try {
                const result = await provider.provideDocumentSymbols(model, CancellationToken.None);
                if (result) {
                    const flat = this._flattenSymbols(result);
                    const intersecting = flat.filter((sym) => this._rangesIntersect(sym.range, range));
                    symbols.push(...intersecting);
                }
            }
            catch (e) {
                console.warn('Symbol provider error:', e);
            }
        }
        // Also check reference providers.
        const refProviders = this._langFeaturesService.referenceProvider.ordered(model);
        for (let line = range.startLineNumber; line <= range.endLineNumber; line++) {
            const content = model.getLineContent(line);
            const words = content.match(/[a-zA-Z_]\w*/g) || [];
            for (const word of words) {
                const startColumn = content.indexOf(word) + 1;
                const pos = new Position(line, startColumn);
                if (!this._positionInRange(pos, range))
                    continue;
                for (const provider of refProviders) {
                    try {
                        const refs = await provider.provideReferences(model, pos, { includeDeclaration: true }, CancellationToken.None);
                        if (refs) {
                            const filtered = refs.filter((ref) => this._rangesIntersect(ref.range, range));
                            for (const ref of filtered) {
                                symbols.push({
                                    name: word,
                                    detail: '',
                                    kind: 12 /* SymbolKind.Variable */,
                                    range: ref.range,
                                    selectionRange: ref.range,
                                    children: [],
                                    tags: [],
                                });
                            }
                        }
                    }
                    catch (e) {
                        console.warn('Reference provider error:', e);
                    }
                }
            }
        }
        return symbols;
    }
    _flattenSymbols(symbols) {
        const flat = [];
        for (const sym of symbols) {
            flat.push(sym);
            if (sym.children && sym.children.length > 0) {
                flat.push(...this._flattenSymbols(sym.children));
            }
        }
        return flat;
    }
    _rangesIntersect(a, b) {
        return !(a.endLineNumber < b.startLineNumber ||
            a.startLineNumber > b.endLineNumber ||
            (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn) ||
            (a.startLineNumber === b.endLineNumber && a.endColumn > b.endColumn));
    }
    _positionInRange(pos, range) {
        return (pos.lineNumber >= range.startLineNumber &&
            pos.lineNumber <= range.endLineNumber &&
            (pos.lineNumber !== range.startLineNumber || pos.column >= range.startColumn) &&
            (pos.lineNumber !== range.endLineNumber || pos.column <= range.endColumn));
    }
    // Get definition symbols for a given symbol.
    async _getDefinitionSymbols(model, symbol) {
        const pos = new Position(symbol.range.startLineNumber, symbol.range.startColumn);
        const providers = this._langFeaturesService.definitionProvider.ordered(model);
        const defs = [];
        for (const provider of providers) {
            try {
                const res = await provider.provideDefinition(model, pos, CancellationToken.None);
                if (res) {
                    const links = Array.isArray(res) ? res : [res];
                    defs.push(...links.map((link) => ({
                        name: symbol.name,
                        detail: symbol.detail,
                        kind: symbol.kind,
                        range: link.range,
                        selectionRange: link.range,
                        children: [],
                        tags: symbol.tags || [],
                        uri: link.uri, // Now keeping it as URI instead of converting to string
                    })));
                }
            }
            catch (e) {
                console.warn('Definition provider error:', e);
            }
        }
        return defs;
    }
    async _findContainerFunction(model, pos) {
        const searchRange = new Range(Math.max(pos.lineNumber - 1, 1), 1, Math.min(pos.lineNumber + 1, model.getLineCount()), model.getLineMaxColumn(pos.lineNumber));
        const symbols = await this._getSymbolsInRange(model, searchRange);
        const funcs = symbols.filter((s) => (s.kind === 11 /* SymbolKind.Function */ || s.kind === 5 /* SymbolKind.Method */) &&
            this._positionInRange(pos, s.range));
        if (!funcs.length)
            return null;
        return funcs.reduce((innermost, current) => {
            if (!innermost)
                return current;
            const moreInner = (current.range.startLineNumber > innermost.range.startLineNumber ||
                (current.range.startLineNumber === innermost.range.startLineNumber &&
                    current.range.startColumn > innermost.range.startColumn)) &&
                (current.range.endLineNumber < innermost.range.endLineNumber ||
                    (current.range.endLineNumber === innermost.range.endLineNumber &&
                        current.range.endColumn < innermost.range.endColumn));
            return moreInner ? current : innermost;
        }, null);
    }
};
ContextGatheringService = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IModelService),
    __param(2, ICodeEditorService)
], ContextGatheringService);
registerSingleton(IContextGatheringService, ContextGatheringService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dEdhdGhlcmluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY29udGV4dEdhdGhlcmluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBR3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsS0FBSyxFQUFVLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFvQjdGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUNwQyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUE7QUFFckUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBTy9DLFlBQzJCLG9CQUErRCxFQUMxRSxhQUE2QyxFQUN4QyxrQkFBdUQ7UUFFM0UsS0FBSyxFQUFFLENBQUE7UUFKb0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUEwQjtRQUN6RCxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUN2Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBUjNELGVBQVUsR0FBRyxDQUFDLENB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