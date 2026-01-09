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
