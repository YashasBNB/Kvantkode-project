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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGludWVDaGF0Q2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY29udGludWVDaGF0Q2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBMkI1RixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLHdCQUF3QixDQUFDLENBQUE7QUFFakcsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFHakQsY0FBYyxDQUFDLElBQStCO1FBQzdDLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLElBQUksRUFBRSxDQUFDLENBQUE7UUFFL0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUVsQyxPQUFPO1lBQ04sS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7U0FDZixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLGtDQUEwQixDQUFBIn0=