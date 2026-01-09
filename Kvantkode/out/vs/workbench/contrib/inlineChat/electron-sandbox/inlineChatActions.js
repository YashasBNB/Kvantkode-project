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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvZWxlY3Ryb24tc2FuZGJveC9pbmxpbmVDaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsbUJBQW1CLEVBQ25CLHdCQUF3QixHQUN4QixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSx1QkFBdUIsRUFBd0IsTUFBTSx5QkFBeUIsQ0FBQTtBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RSxNQUFNLE9BQU8sV0FBWSxTQUFRLGFBQWE7SUFDN0M7UUFD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