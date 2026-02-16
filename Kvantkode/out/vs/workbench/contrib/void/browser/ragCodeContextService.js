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
// import * as crypto from 'crypto'  // Removed Node.js crypto import
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IAiEmbeddingVectorService, } from '../../../services/aiEmbeddingVector/common/aiEmbeddingVectorService.js';
import { ITreeSitterParserService, } from '../../../../editor/common/services/treeSitterParserService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const IRagCodeContextService = createDecorator('ragCodeContextService');
const STORAGE_KEY = 'void.rag.index.v1';
const safeNormalize = (s) => s.replace(/\s+/g, ' ').trim();
const cosineSim = (a, b) => {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
        const x = a[i];
        const y = b[i];
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    if (!na || !nb)
        return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
};
const lexicalScore = (query, text) => {
    const q = safeNormalize(query).toLowerCase();
    const t = safeNormalize(text).toLowerCase();
    if (!q || !t)
        return 0;
    let score = 0;
    for (const term of q.split(' ').filter(Boolean)) {
        if (term.length < 2)
            continue;
        if (t.includes(term))
            score += 1;
    }
    return score;
};
let RagCodeContextService = class RagCodeContextService extends Disposable {
    constructor(modelService, embeddingService, treeSitterService, storageService) {
        super();
        this.modelService = modelService;
        this.embeddingService = embeddingService;
        this.treeSitterService = treeSitterService;
        this.storageService = storageService;
        this._index = this._loadIndex();
        this._register(this.modelService.onModelAdded((m) => {
            this._indexModelBestEffort(m).catch(() => null);
        }));
        for (const m of this.modelService.getModels()) {
            this._indexModelBestEffort(m).catch(() => null);
        }
    }
    clearIndex() {
        this._index = { version: 1, chunks: {} };
        this._persistIndex();
    }
    async getContextForQuery(opts) {
        const { query, maxChars, maxChunks } = opts;
        if (!query?.trim())
            return '';
        if (!this.embeddingService.isEnabled())
            return '';
        // Ensure active models are indexed (best-effort)
        await Promise.all(this.modelService
            .getModels()
            .filter((m) => m.isAttachedToEditor())
            .map((m) => this._indexModelBestEffort(m))).catch(() => null);
        const qEmbedding = (await this.embeddingService.getEmbeddingVector(query, CancellationToken.None));
        const candidates = Object.values(this._index.chunks);
        if (!candidates.length)
            return '';
        const scored = candidates
            .map((c) => {
            const v = cosineSim(qEmbedding, c.embedding);
            const l = lexicalScore(query, c.text);
            const symBoost = c.symbols.some((s) => safeNormalize(query).toLowerCase().includes(s.toLowerCase())) ? 1 : 0;
            const sizePenalty = Math.min(2, c.text.length / 4000);
            return { c, score: v * 5 + l * 0.25 + symBoost * 0.75 - sizePenalty };
        })
            .sort((a, b) => b.score - a.score);
        let remaining = maxChars;
        const picked = [];
        const seenUris = new Set();
        for (const s of scored) {
            if (picked.length >= maxChunks)
                break;
            if (remaining <= 0)
                break;
            if (seenUris.has(s.c.uri) && picked.length >= Math.floor(maxChunks / 2)) {
                continue;
            }
            const text = s.c.text;
            if (text.length < 30)
                continue;
            if (text.length > remaining)
                continue;
            picked.push(s.c);
            seenUris.add(s.c.uri);
            remaining -= text.length;
        }
        if (!picked.length)
            return '';
        const out = [];
        out.push('Relevant code context (auto-selected):');
        for (const p of picked) {
            out.push(`\n[${p.uri}:${p.startLine}-${p.endLine}]\n${p.text}`);
        }
        return out.join('\n');
    }
    _loadIndex() {
        try {
            const raw = this.storageService.get(STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (!raw)
                return { version: 1, chunks: {} };
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.version !== 1 || !parsed.chunks)
                return { version: 1, chunks: {} };
            return parsed;
        }
        catch {
            return { version: 1, chunks: {} };
        }
    }
    _persistIndex() {
        try {
            this.storageService.store(STORAGE_KEY, JSON.stringify(this._index), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        catch {
            // ignore
        }
    }
    async _hashChunk(uri, languageId, startLine, endLine, text) {
        // Use Web Crypto API instead of Node.js crypto
        const data = `${uri}|${languageId}|${startLine}|${endLine}|${text}`;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        return crypto.subtle.digest('SHA-256', dataBuffer).then(hash => {
            const hashArray = Array.from(new Uint8Array(hash));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        });
    }
    async _indexModelBestEffort(model) {
        try {
            if (!model || model.isDisposed())
                return;
            const chunks = await this._extractChunks(model);
            if (!chunks.length)
                return;
            const newChunks = [];
            for (const c of chunks) {
                const chunkId = await this._hashChunk(c.uri, c.languageId, c.startLine, c.endLine, c.text);
                if (!this._index.chunks[chunkId]) {
                    newChunks.push({ ...c, chunkId });
                }
            }
            if (!newChunks.length)
                return;
            const embeddings = (await this.embeddingService.getEmbeddingVector(newChunks.map((c) => c.text), CancellationToken.None));
            const now = Date.now();
            for (let i = 0; i < newChunks.length; i += 1) {
                const c = newChunks[i];
                const emb = embeddings[i];
                if (!emb)
                    continue;
                this._index.chunks[c.chunkId] = {
                    ...c,
                    embedding: emb,
                    updatedAt: now,
                };
            }
            // Basic cap to avoid unbounded growth from many edits
            const keys = Object.keys(this._index.chunks);
            if (keys.length > 2500) {
                keys
                    .sort((a, b) => (this._index.chunks[a].updatedAt ?? 0) - (this._index.chunks[b].updatedAt ?? 0))
                    .slice(0, keys.length - 2500)
                    .forEach((k) => delete this._index.chunks[k]);
            }
            this._persistIndex();
        }
        catch {
            // ignore
        }
    }
    async _extractChunks(model) {
        const languageId = model.getLanguageId();
        const fullText = model.getValue();
        if (!fullText.trim())
            return [];
        // Try tree-sitter (best-effort)
        if (languageId) {
            try {
                const tree = await this.treeSitterService.getTree(fullText, languageId);
                if (tree) {
                    return this._chunksFromTree(tree, model);
                }
            }
            catch {
                // ignore
            }
        }
        // Fallback: fixed-size window chunks
        return this._windowChunks(model);
    }
    _chunksFromTree(tree, model) {
        const uri = model.uri.toString();
        const res = [];
        const root = tree.rootNode;
        if (!root)
            return this._windowChunks(model);
        const visit = (node) => {
            const t = String(node.type || '');
            const isChunk = t === 'function_declaration' ||
                t === 'method_definition' ||
                t === 'class_declaration' ||
                t === 'lexical_declaration' ||
                t === 'variable_statement';
            if (isChunk) {
                const startLine = (node.startPosition?.row ?? 0) + 1;
                const endLine = (node.endPosition?.row ?? 0) + 1;
                if (endLine - startLine < 2) {
                    // too small
                }
                else {
                    const text = model.getValueInRange({
                        startLineNumber: startLine,
                        startColumn: 1,
                        endLineNumber: endLine,
                        endColumn: model.getLineMaxColumn(endLine),
                    });
                    const cleaned = text.trim();
                    if (cleaned.length > 0 && cleaned.length < 8000) {
                        res.push({
                            uri,
                            languageId: model.getLanguageId(),
                            startLine,
                            endLine,
                            text: cleaned,
                            symbols: this._extractSymbolNames(cleaned),
                        });
                    }
                }
            }
            for (let i = 0; i < (node.namedChildCount ?? 0); i += 1) {
                visit(node.namedChild(i));
            }
        };
        visit(root);
        if (res.length > 0)
            return res;
        return this._windowChunks(model);
    }
    _windowChunks(model) {
        const uri = model.uri.toString();
        const lineCount = model.getLineCount();
        const maxLines = 120;
        const chunks = [];
        for (let start = 1; start <= lineCount; start += maxLines) {
            const end = Math.min(lineCount, start + maxLines - 1);
            const text = model.getValueInRange({
                startLineNumber: start,
                startColumn: 1,
                endLineNumber: end,
                endColumn: model.getLineMaxColumn(end),
            });
            const cleaned = text.trim();
            if (cleaned.length < 50)
                continue;
            chunks.push({
                uri,
                languageId: model.getLanguageId(),
                startLine: start,
                endLine: end,
                text: cleaned.slice(0, 8000),
                symbols: this._extractSymbolNames(cleaned),
            });
            if (chunks.length >= 40)
                break;
        }
        return chunks;
    }
    _extractSymbolNames(text) {
        const out = new Set();
        const re = /(class|function)\s+([A-Za-z_$][\w$]*)/g;
        let m;
        while ((m = re.exec(text))) {
            out.add(m[2]);
        }
        return [...out];
    }
};
RagCodeContextService = __decorate([
    __param(0, IModelService),
    __param(1, IAiEmbeddingVectorService),
    __param(2, ITreeSitterParserService),
    __param(3, IStorageService)
], RagCodeContextService);
registerSingleton(IRagCodeContextService, RagCodeContextService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFnQ29kZUNvbnRleHRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvcmFnQ29kZUNvbnRleHRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLHFFQUFxRTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFM0UsT0FBTyxFQUNOLHlCQUF5QixHQUN6QixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTix3QkFBd0IsR0FDeEIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFBO0FBZ0M3RyxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUE7QUFFdEcsTUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUE7QUFFdkMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFTLEVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO0FBRTFFLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBVyxFQUFFLENBQVcsRUFBVSxFQUFFO0lBQ3RELElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUNYLElBQUksRUFB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QUMsR0FBRyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNyQyxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNyRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsUUFBUSxHQUFHLElBQUksR0FBRyxXQUFXLEVBQUUsQ0FBQTtRQUN0RSxDQUFDLENBQUM7YUFDRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVuQyxJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUE7UUFDeEIsTUFBTSxNQUFNLEdBQWtCLEVBQUUsQ0FBQTtRQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQ2xDLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDeEIsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLFNBQVM7Z0JBQUUsTUFBSztZQUNyQyxJQUFJLFNBQVMsSUFBSSxDQUFDO2dCQUFFLE1BQUs7WUFDekIsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FB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