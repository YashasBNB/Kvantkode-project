import { CancellationToken } from '../../../../base/common/cancellation.js'
// import * as crypto from 'crypto'  // Removed Node.js crypto import
import { Disposable } from '../../../../base/common/lifecycle.js'
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js'
import {
	InstantiationType,
	registerSingleton,
} from '../../../../platform/instantiation/common/extensions.js'
import { IModelService } from '../../../../editor/common/services/model.js'
import { ITextModel } from '../../../../editor/common/model.js'
import {
	IAiEmbeddingVectorService,
} from '../../../services/aiEmbeddingVector/common/aiEmbeddingVectorService.js'
import {
	ITreeSitterParserService,
} from '../../../../editor/common/services/treeSitterParserService.js'
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js'

export type RagChunk = {
	chunkId: string
	uri: string
	languageId: string
	startLine: number
	endLine: number
	text: string
	symbols: string[]
}

type StoredChunk = RagChunk & {
	embedding: number[]
	updatedAt: number
}

type RagIndexState = {
	version: 1
	chunks: Record<string, StoredChunk>
}

export interface IRagCodeContextService {
	readonly _serviceBrand: undefined
	getContextForQuery(opts: {
		query: string
		maxChars: number
		maxChunks: number
	}): Promise<string>
	clearIndex(): void
}

export const IRagCodeContextService = createDecorator<IRagCodeContextService>('ragCodeContextService')

const STORAGE_KEY = 'void.rag.index.v1'

const safeNormalize = (s: string): string => s.replace(/\s+/g, ' ').trim()

const cosineSim = (a: number[], b: number[]): number => {
	let dot = 0
	let na = 0
	let nb = 0
	for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
		const x = a[i]
		const y = b[i]
		dot += x * y
		na += x * x
		nb += y * y
	}
	if (!na || !nb) return 0
	return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

const lexicalScore = (query: string, text: string): number => {
	const q = safeNormalize(query).toLowerCase()
	const t = safeNormalize(text).toLowerCase()
	if (!q || !t) return 0
	let score = 0
	for (const term of q.split(' ').filter(Boolean)) {
		if (term.length < 2) continue
		if (t.includes(term)) score += 1
	}
	return score
}

class RagCodeContextService extends Disposable implements IRagCodeContextService {
	_serviceBrand: undefined

	private _index: RagIndexState

	constructor(
		@IModelService private readonly modelService: IModelService,
		@IAiEmbeddingVectorService private readonly embeddingService: IAiEmbeddingVectorService,
		@ITreeSitterParserService private readonly treeSitterService: ITreeSitterParserService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super()
		this._index = this._loadIndex()

		this._register(
			this.modelService.onModelAdded((m) => {
				this._indexModelBestEffort(m).catch(() => null)
			}),
		)
		for (const m of this.modelService.getModels()) {
			this._indexModelBestEffort(m).catch(() => null)
		}
	}

	clearIndex(): void {
		this._index = { version: 1, chunks: {} }
		this._persistIndex()
	}

	async getContextForQuery(opts: {
		query: string
		maxChars: number
		maxChunks: number
	}): Promise<string> {
		const { query, maxChars, maxChunks } = opts
		if (!query?.trim()) return ''
		if (!this.embeddingService.isEnabled()) return ''

		// Ensure active models are indexed (best-effort)
		await Promise.all(
			this.modelService
				.getModels()
				.filter((m) => m.isAttachedToEditor())
				.map((m) => this._indexModelBestEffort(m)),
		).catch(() => null)

		const qEmbedding = (await this.embeddingService.getEmbeddingVector(query, CancellationToken.None)) as number[]

		const candidates = Object.values(this._index.chunks)
		if (!candidates.length) return ''

		const scored = candidates
			.map((c) => {
				const v = cosineSim(qEmbedding, c.embedding)
				const l = lexicalScore(query, c.text)
				const symBoost = c.symbols.some((s) => safeNormalize(query).toLowerCase().includes(s.toLowerCase())) ? 1 : 0
				const sizePenalty = Math.min(2, c.text.length / 4000)
				return { c, score: v * 5 + l * 0.25 + symBoost * 0.75 - sizePenalty }
			})
			.sort((a, b) => b.score - a.score)

		let remaining = maxChars
		const picked: StoredChunk[] = []
		const seenUris = new Set<string>()
		for (const s of scored) {
			if (picked.length >= maxChunks) break
			if (remaining <= 0) break
			if (seenUris.has(s.c.uri) && picked.length >= Math.floor(maxChunks / 2)) {
				continue
			}
			const text = s.c.text
			if (text.length < 30) continue
			if (text.length > remaining) continue
			picked.push(s.c)
			seenUris.add(s.c.uri)
			remaining -= text.length
		}

		if (!picked.length) return ''

		const out: string[] = []
		out.push('Relevant code context (auto-selected):')
		for (const p of picked) {
			out.push(`\n[${p.uri}:${p.startLine}-${p.endLine}]\n${p.text}`)
		}
		return out.join('\n')
	}

	private _loadIndex(): RagIndexState {
		try {
			const raw = this.storageService.get(STORAGE_KEY, StorageScope.WORKSPACE)
			if (!raw) return { version: 1, chunks: {} }
			const parsed = JSON.parse(raw) as RagIndexState
			if (!parsed || parsed.version !== 1 || !parsed.chunks) return { version: 1, chunks: {} }
			return parsed
		} catch {
			return { version: 1, chunks: {} }
		}
	}

	private _persistIndex(): void {
		try {
			this.storageService.store(
				STORAGE_KEY,
				JSON.stringify(this._index),
				StorageScope.WORKSPACE,
				StorageTarget.MACHINE,
			)
		} catch {
			// ignore
		}
	}

	private async _hashChunk(uri: string, languageId: string, startLine: number, endLine: number, text: string): Promise<string> {
		// Use Web Crypto API instead of Node.js crypto
		const data = `${uri}|${languageId}|${startLine}|${endLine}|${text}`
		const encoder = new TextEncoder()
		const dataBuffer = encoder.encode(data)

		return crypto.subtle.digest('SHA-256', dataBuffer).then(hash => {
			const hashArray = Array.from(new Uint8Array(hash))
			return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
		})
	}

	private async _indexModelBestEffort(model: ITextModel): Promise<void> {
		try {
			if (!model || model.isDisposed()) return
			const chunks = await this._extractChunks(model)
			if (!chunks.length) return

			const newChunks: RagChunk[] = []
			for (const c of chunks) {
				const chunkId = await this._hashChunk(c.uri, c.languageId, c.startLine, c.endLine, c.text)
				if (!this._index.chunks[chunkId]) {
					newChunks.push({ ...c, chunkId })
				}
			}
			if (!newChunks.length) return

			const embeddings = (await this.embeddingService.getEmbeddingVector(
				newChunks.map((c) => c.text),
				CancellationToken.None,
			)) as number[][]

			const now = Date.now()
			for (let i = 0; i < newChunks.length; i += 1) {
				const c = newChunks[i]
				const emb = embeddings[i]
				if (!emb) continue
				this._index.chunks[c.chunkId] = {
					...c,
					embedding: emb,
					updatedAt: now,
				}
			}

			// Basic cap to avoid unbounded growth from many edits
			const keys = Object.keys(this._index.chunks)
			if (keys.length > 2500) {
				keys
					.sort((a, b) => (this._index.chunks[a].updatedAt ?? 0) - (this._index.chunks[b].updatedAt ?? 0))
					.slice(0, keys.length - 2500)
					.forEach((k) => delete this._index.chunks[k])
			}

			this._persistIndex()
		} catch {
			// ignore
		}
	}

	private async _extractChunks(model: ITextModel): Promise<Omit<RagChunk, 'chunkId'>[]> {
		const languageId = model.getLanguageId()
		const fullText = model.getValue()
		if (!fullText.trim()) return []

		// Try tree-sitter (best-effort)
		if (languageId) {
			try {
				const tree = await this.treeSitterService.getTree(fullText, languageId)
				if (tree) {
					return this._chunksFromTree(tree, model)
				}
			} catch {
				// ignore
			}
		}

		// Fallback: fixed-size window chunks
		return this._windowChunks(model)
	}

	private _chunksFromTree(tree: any, model: ITextModel): Omit<RagChunk, 'chunkId'>[] {
		const uri = model.uri.toString()
		const res: Array<Omit<RagChunk, 'chunkId'>> = []
		const root = tree.rootNode
		if (!root) return this._windowChunks(model)

		const visit = (node: any) => {
			const t = String(node.type || '')
			const isChunk =
				t === 'function_declaration' ||
				t === 'method_definition' ||
				t === 'class_declaration' ||
				t === 'lexical_declaration' ||
				t === 'variable_statement'
			if (isChunk) {
				const startLine = (node.startPosition?.row ?? 0) + 1
				const endLine = (node.endPosition?.row ?? 0) + 1
				if (endLine - startLine < 2) {
					// too small
				} else {
					const text = model.getValueInRange({
						startLineNumber: startLine,
						startColumn: 1,
						endLineNumber: endLine,
						endColumn: model.getLineMaxColumn(endLine),
					} as any)
					const cleaned = text.trim()
					if (cleaned.length > 0 && cleaned.length < 8000) {
						res.push({
							uri,
							languageId: model.getLanguageId(),
							startLine,
							endLine,
							text: cleaned,
							symbols: this._extractSymbolNames(cleaned),
						})
					}
				}
			}

			for (let i = 0; i < (node.namedChildCount ?? 0); i += 1) {
				visit(node.namedChild(i))
			}
		}

		visit(root)
		if (res.length > 0) return res
		return this._windowChunks(model)
	}

	private _windowChunks(model: ITextModel): Omit<RagChunk, 'chunkId'>[] {
		const uri = model.uri.toString()
		const lineCount = model.getLineCount()
		const maxLines = 120
		const chunks: Array<Omit<RagChunk, 'chunkId'>> = []
		for (let start = 1; start <= lineCount; start += maxLines) {
			const end = Math.min(lineCount, start + maxLines - 1)
			const text = model.getValueInRange({
				startLineNumber: start,
				startColumn: 1,
				endLineNumber: end,
				endColumn: model.getLineMaxColumn(end),
			} as any)
			const cleaned = text.trim()
			if (cleaned.length < 50) continue
			chunks.push({
				uri,
				languageId: model.getLanguageId(),
				startLine: start,
				endLine: end,
				text: cleaned.slice(0, 8000),
				symbols: this._extractSymbolNames(cleaned),
			})
			if (chunks.length >= 40) break
		}
		return chunks
	}

	private _extractSymbolNames(text: string): string[] {
		const out = new Set<string>()
		const re = /(class|function)\s+([A-Za-z_$][\w$]*)/g
		let m: RegExpExecArray | null
		while ((m = re.exec(text))) {
			out.add(m[2])
		}
		return [...out]
	}
}

registerSingleton(IRagCodeContextService, RagCodeContextService, InstantiationType.Eager)
