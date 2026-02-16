var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
export const IContinueChatClient = createDecorator('voidContinueChatClient');
let ContinueChatClient = class ContinueChatClient extends Disposable {
    constructor(llmMessageService, convertToLLMMessageService, voidSettingsService) {
        super();
        this.llmMessageService = llmMessageService;
        this.convertToLLMMessageService = convertToLLMMessageService;
        this.voidSettingsService = voidSettingsService;
    }
    async streamResponse(opts) {
        const { messages, onChunk, onDone, onError } = opts;
        // Get the current model selection for Chat feature
        const modelSelection = this.voidSettingsService.state.modelSelectionOfFeature['Chat'];
        if (!modelSelection) {
            const error = new Error('No model selected for Chat. Please configure a model in settings.');
            onError(error);
            return { abort: () => { } };
        }
        try {
            // Validate input messages
            if (!messages || messages.length === 0) {
                const error = new Error('No messages provided to ContinueChatClient');
                onError(error);
                return { abort: () => { } };
            }
            console.log('🚀 ContinueChatClient: Sending messages to AI:', {
                messageCount: messages.length,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content || m.displayContent || 'N/A'
                })),
                modelSelection
            });
            // Convert chat messages to LLM-compatible format
            const conversionResult = await this.convertToLLMMessageService.prepareLLMChatMessages({
                chatMessages: messages,
                chatMode: this.voidSettingsService.state.globalSettings.chatMode,
                modelSelection,
            });
            console.log('🔄 ContinueChatClient: Message conversion result:', {
                convertedMessageCount: conversionResult.messages.length,
                hasSystemMessage: !!conversionResult.separateSystemMessage,
                messages: conversionResult.messages.map(m => ({
                    role: m.role,
                    content: m.content || 'N/A'
                }))
            });
            // Validate converted messages
            if (!conversionResult.messages || conversionResult.messages.length === 0) {
                const error = new Error('Message conversion resulted in empty messages array');
                onError(error);
                return { abort: () => { } };
            }
            // Send the message using the LLM service
            console.log('📤 ContinueChatClient: Sending to LLM service...');
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
                    });
                    // Stream the chunk to the caller
                    onChunk({
                        content: fullText,
                        reasoning: fullReasoning || undefined
                    });
                },
                onFinalMessage: ({ fullText, fullReasoning }) => {
                    // Log final AI response
                    console.log('✅ ContinueChatClient: AI final response:', {
                        contentLength: fullText.length,
                        content: fullText,
                        hasReasoning: !!fullReasoning,
                        reasoningLength: fullReasoning?.length || 0,
                        reasoning: fullReasoning
                    });
                    // Send the final response
                    onDone({
                        content: fullText,
                        reasoning: fullReasoning || undefined
                    });
                },
                onError: (error) => {
                    // Log error
                    console.error('❌ ContinueChatClient: AI service error:', {
                        errorMessage: error.message,
                        errorType: typeof error,
                        fullError: error
                    });
                    // Forward the error to the caller
                    onError(new Error(error.message));
                },
                onAbort: () => {
                    console.log('🛑 ContinueChatClient: Request aborted');
                    // Handle abort if needed
                },
            });
            console.log('🆔 ContinueChatClient: Request sent with ID:', requestId);
            // Return the abort function
            return {
                abort: () => {
                    if (requestId) {
                        this.llmMessageService.abort(requestId);
                    }
                }
            };
        }
        catch (error) {
            throw error;
        }
    }
};
ContinueChatClient = __decorate([
    __param(0, ILLMMessageService),
    __param(1, IConvertToLLMMessageService),
    __param(2, IVoidSettingsService)
], ContinueChatClient);
export { ContinueChatClient };
registerSingleton(IContinueChatClient, ContinueChatClient, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGludWVDaGF0Q2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY29udGludWVDaGF0Q2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRzVGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBeUJ2RSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLHdCQUF3QixDQUFDLENBQUE7QUFFMUYsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBR2pELFlBQ3NDLGlCQUFxQyxFQUM1QiwwQkFBdUQsRUFDOUQsbUJBQXlDO1FBRWhGLEtBQUssRUFBRSxDQUFBO1FBSjhCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDNUIsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE2QjtRQUM5RCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO0lBR2pGLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLElBQStCO1FBQ25ELE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFFbkQsbURBQW1EO1FBQ25ELE1B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