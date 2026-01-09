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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dEdhdGhlcmluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9jb250ZXh0R2F0aGVyaW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHckUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxLQUFLLEVBQVUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQW9CN0YsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQ3BDLGVBQWUsQ0FBMkIseUJBQXlCLENBQUMsQ0FBQTtBQUVyRSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFPL0MsWUFDMkIsb0JBQStELEVBQzFFLGFBQTZDLEVBQ3hDLGtCQUF1RDtRQUUzRSxLQUFLLEVBQUUsQ0FBQTtRQUpvQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTBCO1FBQ3pELGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3ZCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7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