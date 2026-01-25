import { Disposable } from '../../../../base/common/lifecycle.js'
import {
	registerSingleton,
	InstantiationType,
} from '../../../../platform/instantiation/common/extensions.js'
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js'

import type { ChatMessage } from '../common/chatThreadServiceTypes.js'
import { ILLMMessageService } from '../common/sendLLMMessageService.js'
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js'
import { IVoidSettingsService } from '../common/voidSettingsService.js'

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

	streamResponse(opts: ContinueChatStreamOptions): Promise<{ abort: () => void }>
}

export const IContinueChatClient = createDecorator<IContinueChatClient>('voidContinueChatClient')

export class ContinueChatClient extends Disposable implements IContinueChatClient {
	_serviceBrand: undefined

	constructor(
		@ILLMMessageService private readonly llmMessageService: ILLMMessageService,
		@IConvertToLLMMessageService private readonly convertToLLMMessageService: IConvertToLLMMessageService,
		@IVoidSettingsService private readonly voidSettingsService: IVoidSettingsService,
	) {
		super()
	}

	async streamResponse(opts: ContinueChatStreamOptions): Promise<{ abort: () => void }> {
		const { messages, onChunk, onDone, onError } = opts

		// Get the current model selection for Chat feature
		const modelSelection = this.voidSettingsService.state.modelSelectionOfFeature['Chat']
		
		if (!modelSelection) {
			const error = new Error('No model selected for Chat. Please configure a model in settings.')
			onError(error)
			return { abort: () => {} }
		}

		try {
			// Validate input messages
			if (!messages || messages.length === 0) {
				const error = new Error('No messages provided to ContinueChatClient')
				onError(error)
				return { abort: () => {} }
			}

			console.log('🚀 ContinueChatClient: Sending messages to AI:', {
				messageCount: messages.length,
				messages: messages.map(m => ({ 
					role: m.role, 
					content: (m as any).content || (m as any).displayContent || 'N/A' 
				})),
				modelSelection
			})

			// Convert chat messages to LLM-compatible format
			const conversionResult = await this.convertToLLMMessageService.prepareLLMChatMessages({
				chatMessages: messages,
				chatMode: this.voidSettingsService.state.globalSettings.chatMode,
				modelSelection,
			})

			console.log('🔄 ContinueChatClient: Message conversion result:', {
				convertedMessageCount: conversionResult.messages.length,
				hasSystemMessage: !!conversionResult.separateSystemMessage,
				messages: conversionResult.messages.map(m => ({ 
					role: m.role, 
					content: (m as any).content || 'N/A' 
				}))
			})

			// Validate converted messages
			if (!conversionResult.messages || conversionResult.messages.length === 0) {
				const error = new Error('Message conversion resulted in empty messages array')
				onError(error)
				return { abort: () => {} }
			}

			// Send the message using the LLM service
			console.log('📤 ContinueChatClient: Sending to LLM service...')
			const requestId = this.llmMessageService.sendLLMMessage({
				messagesType: 'chatMessages',
				messages: conversionResult.messages,
				separateSystemMessage: conversionResult.separateSystemMessage,
				chatMode: this.voidSettingsService.state.globalSettings.chatMode,
				modelSelection,
				modelSelectionOptions: this.voidSettingsService.state.optionsOfModelSelection['Chat']?.[modelSelection.providerName]?.[modelSelection.modelName],
				overridesOfModel: this.voidSettingsService.state.overridesOfModel,
				logging: {
					loggingName: 'Continue Chat',
					loggingExtras: { messageCount: messages.length }
				},
				onText: ({ fullText, fullReasoning }) => {
					// Log streaming response chunk
					console.log('📥 ContinueChatClient: AI response chunk:', {
						contentLength: fullText.length,
						content: fullText.substring(0, 100) + (fullText.length > 100 ? '...' : ''),
						hasReasoning: !!fullReasoning,
						reasoningLength: fullReasoning?.length || 0
					})
					
					// Stream the chunk to the caller
					onChunk({ 
						content: fullText, 
						reasoning: fullReasoning || undefined 
					})
				},
				onFinalMessage: ({ fullText, fullReasoning }) => {
					// Log final AI response
					console.log('✅ ContinueChatClient: AI final response:', {
						contentLength: fullText.length,
						content: fullText,
						hasReasoning: !!fullReasoning,
						reasoningLength: fullReasoning?.length || 0,
						reasoning: fullReasoning
					})
					
					// Send the final response
					onDone({ 
						content: fullText, 
						reasoning: fullReasoning || undefined 
					})
				},
				onError: (error) => {
					// Log error
					console.error('❌ ContinueChatClient: AI service error:', {
						errorMessage: error.message,
						errorType: typeof error,
						fullError: error
					})
					
					// Forward the error to the caller
					onError(new Error(error.message))
				},
				onAbort: () => {
					console.log('🛑 ContinueChatClient: Request aborted')
					// Handle abort if needed
				},
			})

			console.log('🆔 ContinueChatClient: Request sent with ID:', requestId)

			// Return the abort function
			return {
				abort: () => {
					if (requestId) {
						this.llmMessageService.abort(requestId)
					}
				}
			}
		} catch (error) {
			throw error
		}
	}
}

registerSingleton(IContinueChatClient, ContinueChatClient, InstantiationType.Eager)
