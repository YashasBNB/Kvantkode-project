import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { InlineChatController } from '../browser/inlineChatController.js';
import { AbstractInline1ChatAction, setHoldForSpeech } from '../browser/inlineChatActions.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { StartVoiceChatAction, StopListeningAction, VOICE_KEY_HOLD_THRESHOLD, } from '../../chat/electron-sandbox/actions/voiceChatActions.js';
import { CTX_INLINE_CHAT_VISIBLE } from '../common/inlineChat.js';
import { HasSpeechProvider, ISpeechService } from '../../speech/common/speechService.js';
import { localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
export class HoldToSpeak extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.holdForSpeech',
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(HasSpeechProvider, CTX_INLINE_CHAT_VISIBLE),
            title: localize2('holdForSpeech', 'Hold for Speech'),
            keybinding: {
                when: EditorContextKeys.textInputFocus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
            },
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const ctrl = InlineChatController.get(editor);
        if (ctrl) {
            holdForSpeech(accessor, ctrl, this);
        }
    }
}
function holdForSpeech(accessor, ctrl, action) {
    const configService = accessor.get(IConfigurationService);
    const speechService = accessor.get(ISpeechService);
    const keybindingService = accessor.get(IKeybindingService);
    const commandService = accessor.get(ICommandService);
    // enabled or possible?
    if (!configService.getValue("inlineChat.holdToSpeech" /* InlineChatConfigKeys.HoldToSpeech */ || !speechService.hasSpeechProvider)) {
        return;
    }
    const holdMode = keybindingService.enableKeybindingHoldMode(action.desc.id);
    if (!holdMode) {
        return;
    }
    let listening = false;
    const handle = disposableTimeout(() => {
        // start VOICE input
        commandService.executeCommand(StartVoiceChatAction.ID, {
            voice: { disableTimeout: true },
        });
        listening = true;
    }, VOICE_KEY_HOLD_THRESHOLD);
    holdMode.finally(() => {
        if (listening) {
            commandService.executeCommand(StopListeningAction.ID).finally(() => {
                ctrl.widget.chatWidget.acceptInput();
            });
        }
        handle.dispose();
    });
}
// make this accessible to the chat actions from the browser layer
setHoldForSpeech(holdForSpeech);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2VsZWN0cm9uLXNhbmRib3gvaW5saW5lQ2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUEsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3JGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQix3QkFBd0IsR0FDeEIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQXdCLE1BQU0seUJBQXlCLENBQUE7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsTUFBTSxPQUFPLFdBQVksU0FBUSxhQUFhO0lBQzdDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxF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