import { Disposable } from '../../../../base/common/lifecycle.js'
import {
	registerSingleton,
	InstantiationType,
} from '../../../../platform/instantiation/common/extensions.js'
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js'

import type { ChatMessage } from '../common/chatThreadServiceTypes.js'

export interface ContinueChatChunk {
	content?: string
	reasoning?: string
}

export interface ContinueChatFinal {
	content: string
	reasoning?: string
}

export interface ContinueChatStreamOptions {
	messages: ChatMessage[]
	onChunk: (delta: ContinueChatChunk) => void
	onDone: (final: ContinueChatFinal) => void
	onError: (error: Error) => void
}

export interface IContinueChatClient {
	readonly _serviceBrand: undefined

	streamResponse(opts: ContinueChatStreamOptions): { abort: () => void }
}

export const IContinueChatClient = createDecorator<IContinueChatClient>('voidContinueChatClient')

export class ContinueChatClient extends Disposable implements IContinueChatClient {
	_serviceBrand: undefined

	streamResponse(opts: ContinueChatStreamOptions): { abort: () => void } {
		const fullText = 'Continue (stub): ' + (opts.messages[opts.messages.length - 1]?.content ?? '')

		opts.onChunk({ content: fullText })
		opts.onDone({ content: fullText })

		return {
			abort: () => {},
		}
	}
}

registerSingleton(IContinueChatClient, ContinueChatClient, InstantiationType.Eager)
