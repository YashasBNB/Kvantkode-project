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
