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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdm9pY2VDaGF0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDNUUsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUE7QUF3Q3ZGLElBQUssY0FJSjtBQUpELFdBQUssY0FBYztJQUNsQixxREFBUyxDQUFBO0lBQ1QseURBQVcsQ0FBQTtJQUNYLDZFQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFKSSxjQUFjLEtBQWQsY0FBYyxRQUlsQjtBQUVELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLElBQUksYUFBYSxD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