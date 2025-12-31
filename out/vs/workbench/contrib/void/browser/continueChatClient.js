import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IContinueChatClient = createDecorator('voidContinueChatClient');
export class ContinueChatClient extends Disposable {
    streamResponse(opts) {
        const fullText = 'Continue (stub): ' + (opts.messages[opts.messages.length - 1]?.content ?? '');
        opts.onChunk({ content: fullText });
        opts.onDone({ content: fullText });
        return {
            abort: () => { },
        };
    }
}
registerSingleton(IContinueChatClient, ContinueChatClient, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGludWVDaGF0Q2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2NvbnRpbnVlQ2hhdENsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQTJCNUYsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQix3QkFBd0IsQ0FBQyxDQUFBO0FBRWpHLE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBR2pELGNBQWMsQ0FBQyxJQUErQjtRQUM3QyxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRS9GLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFFbEMsT0FBTztZQUNOLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO1NBQ2YsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixrQ0FBMEIsQ0FBQSJ9