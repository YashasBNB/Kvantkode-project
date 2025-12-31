/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VoiceChatService_1;
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { rtrim } from '../../../../base/common/strings.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatAgentService } from './chatAgents.js';
import { chatAgentLeader, chatSubcommandLeader } from './chatParserTypes.js';
import { ISpeechService, SpeechToTextStatus, } from '../../speech/common/speechService.js';
export const IVoiceChatService = createDecorator('voiceChatService');
var PhraseTextType;
(function (PhraseTextType) {
    PhraseTextType[PhraseTextType["AGENT"] = 1] = "AGENT";
    PhraseTextType[PhraseTextType["COMMAND"] = 2] = "COMMAND";
    PhraseTextType[PhraseTextType["AGENT_AND_COMMAND"] = 3] = "AGENT_AND_COMMAND";
})(PhraseTextType || (PhraseTextType = {}));
export const VoiceChatInProgress = new RawContextKey('voiceChatInProgress', false, {
    type: 'boolean',
    description: localize('voiceChatInProgress', 'A speech-to-text session is in progress for chat.'),
});
let VoiceChatService = class VoiceChatService extends Disposable {
    static { VoiceChatService_1 = this; }
    static { this.AGENT_PREFIX = chatAgentLeader; }
    static { this.COMMAND_PREFIX = chatSubcommandLeader; }
    static { this.PHRASES_LOWER = {
        [this.AGENT_PREFIX]: 'at',
        [this.COMMAND_PREFIX]: 'slash',
    }; }
    static { this.PHRASES_UPPER = {
        [this.AGENT_PREFIX]: 'At',
        [this.COMMAND_PREFIX]: 'Slash',
    }; }
    static { this.CHAT_AGENT_ALIAS = new Map([['vscode', 'code']]); }
    constructor(speechService, chatAgentService, contextKeyService) {
        super();
        this.speechService = speechService;
        this.chatAgentService = chatAgentService;
        this.activeVoiceChatSessions = 0;
        this.voiceChatInProgress = VoiceChatInProgress.bindTo(contextKeyService);
    }
    createPhrases(model) {
        const phrases = new Map();
        for (const agent of this.chatAgentService.getActivatedAgents()) {
            const agentPhrase = `${VoiceChatService_1.PHRASES_LOWER[VoiceChatService_1.AGENT_PREFIX]} ${VoiceChatService_1.CHAT_AGENT_ALIAS.get(agent.name) ?? agent.name}`.toLowerCase();
            phrases.set(agentPhrase, { agent: agent.name });
            for (const slashCommand of agent.slashCommands) {
                const slashCommandPhrase = `${VoiceChatService_1.PHRASES_LOWER[VoiceChatService_1.COMMAND_PREFIX]} ${slashCommand.name}`.toLowerCase();
                phrases.set(slashCommandPhrase, { agent: agent.name, command: slashCommand.name });
                const agentSlashCommandPhrase = `${agentPhrase} ${slashCommandPhrase}`.toLowerCase();
                phrases.set(agentSlashCommandPhrase, { agent: agent.name, command: slashCommand.name });
            }
        }
        return phrases;
    }
    toText(value, type) {
        switch (type) {
            case PhraseTextType.AGENT:
                return `${VoiceChatService_1.AGENT_PREFIX}${value.agent}`;
            case PhraseTextType.COMMAND:
                return `${VoiceChatService_1.COMMAND_PREFIX}${value.command}`;
            case PhraseTextType.AGENT_AND_COMMAND:
                return `${VoiceChatService_1.AGENT_PREFIX}${value.agent} ${VoiceChatService_1.COMMAND_PREFIX}${value.command}`;
        }
    }
    async createVoiceChatSession(token, options) {
        const disposables = new DisposableStore();
        const onSessionStoppedOrCanceled = (dispose) => {
            this.activeVoiceChatSessions = Math.max(0, this.activeVoiceChatSessions - 1);
            if (this.activeVoiceChatSessions === 0) {
                this.voiceChatInProgress.reset();
            }
            if (dispose) {
                disposables.dispose();
            }
        };
        disposables.add(token.onCancellationRequested(() => onSessionStoppedOrCanceled(true)));
        let detectedAgent = false;
        let detectedSlashCommand = false;
        const emitter = disposables.add(new Emitter());
        const session = await this.speechService.createSpeechToTextSession(token, 'chat');
        if (token.isCancellationRequested) {
            onSessionStoppedOrCanceled(true);
        }
        const phrases = this.createPhrases(options.model);
        disposables.add(session.onDidChange((e) => {
            switch (e.status) {
                case SpeechToTextStatus.Recognizing:
                case SpeechToTextStatus.Recognized: {
                    let massagedEvent = e;
                    if (e.text) {
                        const startsWithAgent = e.text.startsWith(VoiceChatService_1.PHRASES_UPPER[VoiceChatService_1.AGENT_PREFIX]) ||
                            e.text.startsWith(VoiceChatService_1.PHRASES_LOWER[VoiceChatService_1.AGENT_PREFIX]);
                        const startsWithSlashCommand = e.text.startsWith(VoiceChatService_1.PHRASES_UPPER[VoiceChatService_1.COMMAND_PREFIX]) ||
                            e.text.startsWith(VoiceChatService_1.PHRASES_LOWER[VoiceChatService_1.COMMAND_PREFIX]);
                        if (startsWithAgent || startsWithSlashCommand) {
                            const originalWords = e.text.split(' ');
                            let transformedWords;
                            let waitingForInput = false;
                            // Check for agent + slash command
                            if (options.usesAgents &&
                                startsWithAgent &&
                                !detectedAgent &&
                                !detectedSlashCommand &&
                                originalWords.length >= 4) {
                                const phrase = phrases.get(originalWords
                                    .slice(0, 4)
                                    .map((word) => this.normalizeWord(word))
                                    .join(' '));
                                if (phrase) {
                                    transformedWords = [
                                        this.toText(phrase, PhraseTextType.AGENT_AND_COMMAND),
                                        ...originalWords.slice(4),
                                    ];
                                    waitingForInput = originalWords.length === 4;
                                    if (e.status === SpeechToTextStatus.Recognized) {
                                        detectedAgent = true;
                                        detectedSlashCommand = true;
                                    }
                                }
                            }
                            // Check for agent (if not done already)
                            if (options.usesAgents &&
                                startsWithAgent &&
                                !detectedAgent &&
                                !transformedWords &&
                                originalWords.length >= 2) {
                                const phrase = phrases.get(originalWords
                                    .slice(0, 2)
                                    .map((word) => this.normalizeWord(word))
                                    .join(' '));
                                if (phrase) {
                                    transformedWords = [
                                        this.toText(phrase, PhraseTextType.AGENT),
                                        ...originalWords.slice(2),
                                    ];
                                    waitingForInput = originalWords.length === 2;
                                    if (e.status === SpeechToTextStatus.Recognized) {
                                        detectedAgent = true;
                                    }
                                }
                            }
                            // Check for slash command (if not done already)
                            if (startsWithSlashCommand &&
                                !detectedSlashCommand &&
                                !transformedWords &&
                                originalWords.length >= 2) {
                                const phrase = phrases.get(originalWords
                                    .slice(0, 2)
                                    .map((word) => this.normalizeWord(word))
                                    .join(' '));
                                if (phrase) {
                                    transformedWords = [
                                        this.toText(phrase, options.usesAgents && !detectedAgent
                                            ? PhraseTextType.AGENT_AND_COMMAND // rewrite `/fix` to `@workspace /foo` in this case
                                            : PhraseTextType.COMMAND),
                                        ...originalWords.slice(2),
                                    ];
                                    waitingForInput = originalWords.length === 2;
                                    if (e.status === SpeechToTextStatus.Recognized) {
                                        detectedSlashCommand = true;
                                    }
                                }
                            }
                            massagedEvent = {
                                status: e.status,
                                text: (transformedWords ?? originalWords).join(' '),
                                waitingForInput,
                            };
                        }
                    }
                    emitter.fire(massagedEvent);
                    break;
                }
                case SpeechToTextStatus.Started:
                    this.activeVoiceChatSessions++;
                    this.voiceChatInProgress.set(true);
                    emitter.fire(e);
                    break;
                case SpeechToTextStatus.Stopped:
                    onSessionStoppedOrCanceled(false);
                    emitter.fire(e);
                    break;
                case SpeechToTextStatus.Error:
                    emitter.fire(e);
                    break;
            }
        }));
        return {
            onDidChange: emitter.event,
        };
    }
    normalizeWord(word) {
        word = rtrim(word, '.');
        word = rtrim(word, ',');
        word = rtrim(word, '?');
        return word.toLowerCase();
    }
};
VoiceChatService = VoiceChatService_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IChatAgentService),
    __param(2, IContextKeyService)
], VoiceChatService);
export { VoiceChatService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3ZvaWNlQ2hhdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzVFLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFBO0FBd0N2RixJQUFLLGNBSUo7QUFKRCxXQUFLLGNBQWM7SUFDbEIscURBQVMsQ0FBQTtJQUNULHlEQUFXLENBQUE7SUFDWCw2RUFBcUIsQ0FBQTtBQUN0QixDQUFDLEVBSkksY0FBYyxLQUFkLGNBQWMsUUFJbEI7QUFFRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIsRUFBRSxLQUFLLEVB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