/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { SpeechToTextStatus, } from '../../../speech/common/speechService.js';
import { VoiceChatService, } from '../../common/voiceChatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
suite('VoiceChat', () => {
    class TestChatAgentCommand {
        constructor(name, description) {
            this.name = name;
            this.description = description;
        }
    }
    class TestChatAgent {
        constructor(id, slashCommands) {
            this.id = id;
            this.slashCommands = slashCommands;
            this.extensionId = nullExtensionDescription.identifier;
            this.extensionPublisher = '';
            this.extensionDisplayName = '';
            this.extensionPublisherId = '';
            this.locations = [ChatAgentLocation.Panel];
            this.disambiguation = [];
            this.metadata = {};
            this.name = id;
        }
        provideFollowups(request, result, history, token) {
            throw new Error('Method not implemented.');
        }
        provideSampleQuestions(location, token) {
            throw new Error('Method not implemented.');
        }
        invoke(request, progress, history, token) {
            throw new Error('Method not implemented.');
        }
        provideWelcomeMessage(token) {
            throw new Error('Method not implemented.');
        }
    }
    const agents = [
        new TestChatAgent('workspace', [
            new TestChatAgentCommand('fix', 'fix'),
            new TestChatAgentCommand('explain', 'explain'),
        ]),
        new TestChatAgent('vscode', [new TestChatAgentCommand('search', 'search')]),
    ];
    class TestChatAgentService {
        constructor() {
            this.onDidChangeAgents = Event.None;
            this.hasToolsAgent = false;
        }
        registerAgentImplementation(id, agent) {
            throw new Error();
        }
        registerDynamicAgent(data, agentImpl) {
            throw new Error('Method not implemented.');
        }
        invokeAgent(id, request, progress, history, token) {
            throw new Error();
        }
        setRequestPaused(agent, requestId, isPaused) {
            throw new Error('not implemented');
        }
        getFollowups(id, request, result, history, token) {
            throw new Error();
        }
        getActivatedAgents() {
            return agents;
        }
        getAgents() {
            return agents;
        }
        getDefaultAgent() {
            throw new Error();
        }
        getContributedDefaultAgent() {
            throw new Error();
        }
        registerAgent(id, data) {
            throw new Error('Method not implemented.');
        }
        getAgent(id) {
            throw new Error('Method not implemented.');
        }
        getAgentsByName(name) {
            throw new Error('Method not implemented.');
        }
        updateAgent(id, updateMetadata) {
            throw new Error('Method not implemented.');
        }
        getAgentByFullyQualifiedId(id) {
            throw new Error('Method not implemented.');
        }
        registerAgentCompletionProvider(id, provider) {
            throw new Error('Method not implemented.');
        }
        getAgentCompletionItems(id, query, token) {
            throw new Error('Method not implemented.');
        }
        agentHasDupeName(id) {
            throw new Error('Method not implemented.');
        }
        getChatTitle(id, history, token) {
            throw new Error('Method not implemented.');
        }
        hasChatParticipantDetectionProviders() {
            throw new Error('Method not implemented.');
        }
        registerChatParticipantDetectionProvider(handle, provider) {
            throw new Error('Method not implemented.');
        }
        detectAgentOrCommand(request, history, options, token) {
            throw new Error('Method not implemented.');
        }
    }
    class TestSpeechService {
        constructor() {
            this.onDidChangeHasSpeechProvider = Event.None;
            this.hasSpeechProvider = true;
            this.hasActiveSpeechToTextSession = false;
            this.hasActiveTextToSpeechSession = false;
            this.hasActiveKeywordRecognition = false;
            this.onDidStartSpeechToTextSession = Event.None;
            this.onDidEndSpeechToTextSession = Event.None;
            this.onDidStartTextToSpeechSession = Event.None;
            this.onDidEndTextToSpeechSession = Event.None;
            this.onDidStartKeywordRecognition = Event.None;
            this.onDidEndKeywordRecognition = Event.None;
        }
        registerSpeechProvider(identifier, provider) {
            throw new Error('Method not implemented.');
        }
        async createSpeechToTextSession(token) {
            return {
                onDidChange: emitter.event,
            };
        }
        async createTextToSpeechSession(token) {
            return {
                onDidChange: Event.None,
                synthesize: async () => { },
            };
        }
        recognizeKeyword(token) {
            throw new Error('Method not implemented.');
        }
    }
    const disposables = new DisposableStore();
    let emitter;
    let service;
    let event;
    async function createSession(options) {
        const cts = new CancellationTokenSource();
        disposables.add(toDisposable(() => cts.dispose(true)));
        const session = await service.createVoiceChatSession(cts.token, options);
        disposables.add(session.onDidChange((e) => {
            event = e;
        }));
    }
    setup(() => {
        emitter = disposables.add(new Emitter());
        service = disposables.add(new VoiceChatService(new TestSpeechService(), new TestChatAgentService(), new MockContextKeyService()));
    });
    teardown(() => {
        disposables.clear();
    });
    test('Agent and slash command detection (useAgents: false)', async () => {
        await testAgentsAndSlashCommandsDetection({ usesAgents: false, model: {} });
    });
    test('Agent and slash command detection (useAgents: true)', async () => {
        await testAgentsAndSlashCommandsDetection({ usesAgents: true, model: {} });
    });
    async function testAgentsAndSlashCommandsDetection(options) {
        // Nothing to detect
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Started });
        assert.strictEqual(event?.status, SpeechToTextStatus.Started);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'Hello' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, 'Hello');
        assert.strictEqual(event?.waitingForInput, undefined);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'Hello World' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, 'Hello World');
        assert.strictEqual(event?.waitingForInput, undefined);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'Hello World' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, 'Hello World');
        assert.strictEqual(event?.waitingForInput, undefined);
        // Agent
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, 'At');
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace' : 'At workspace');
        assert.strictEqual(event?.waitingForInput, options.usesAgents);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'at workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace' : 'at workspace');
        assert.strictEqual(event?.waitingForInput, options.usesAgents);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At workspace help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At workspace help');
        assert.strictEqual(event?.waitingForInput, false);
        // Agent with punctuation
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At workspace, help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At workspace, help');
        assert.strictEqual(event?.waitingForInput, false);
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At Workspace. help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At Workspace. help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At Workspace. help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace help' : 'At Workspace. help');
        assert.strictEqual(event?.waitingForInput, false);
        // Slash Command
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'Slash fix' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace /fix' : '/fix');
        assert.strictEqual(event?.waitingForInput, true);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'Slash fix' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace /fix' : '/fix');
        assert.strictEqual(event?.waitingForInput, true);
        // Agent + Slash Command
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At code slash search help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code slash search help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At code slash search help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code slash search help');
        assert.strictEqual(event?.waitingForInput, false);
        // Agent + Slash Command with punctuation
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At code, slash search, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code, slash search, help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At code, slash search, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code, slash search, help');
        assert.strictEqual(event?.waitingForInput, false);
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At code. slash, search help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code. slash, search help');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At code. slash search, help' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@vscode /search help' : 'At code. slash search, help');
        assert.strictEqual(event?.waitingForInput, false);
        // Agent not detected twice
        await createSession(options);
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace, for at workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace for at workspace' : 'At workspace, for at workspace');
        assert.strictEqual(event?.waitingForInput, false);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace, for at workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, options.usesAgents ? '@workspace for at workspace' : 'At workspace, for at workspace');
        assert.strictEqual(event?.waitingForInput, false);
        // Slash command detected after agent recognized
        if (options.usesAgents) {
            await createSession(options);
            emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
            assert.strictEqual(event?.text, '@workspace');
            assert.strictEqual(event?.waitingForInput, true);
            emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'slash' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
            assert.strictEqual(event?.text, 'slash');
            assert.strictEqual(event?.waitingForInput, false);
            emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'slash fix' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
            assert.strictEqual(event?.text, '/fix');
            assert.strictEqual(event?.waitingForInput, true);
            emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'slash fix' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
            assert.strictEqual(event?.text, '/fix');
            assert.strictEqual(event?.waitingForInput, true);
            await createSession(options);
            emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
            assert.strictEqual(event?.text, '@workspace');
            assert.strictEqual(event?.waitingForInput, true);
            emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'slash fix' });
            assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
            assert.strictEqual(event?.text, '/fix');
            assert.strictEqual(event?.waitingForInput, true);
        }
    }
    test('waiting for input', async () => {
        // Agent
        await createSession({ usesAgents: true, model: {} });
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, '@workspace');
        assert.strictEqual(event.waitingForInput, true);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, '@workspace');
        assert.strictEqual(event.waitingForInput, true);
        // Slash Command
        await createSession({ usesAgents: true, model: {} });
        emitter.fire({ status: SpeechToTextStatus.Recognizing, text: 'At workspace slash explain' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognizing);
        assert.strictEqual(event?.text, '@workspace /explain');
        assert.strictEqual(event.waitingForInput, true);
        emitter.fire({ status: SpeechToTextStatus.Recognized, text: 'At workspace slash explain' });
        assert.strictEqual(event?.status, SpeechToTextStatus.Recognized);
        assert.strictEqual(event?.text, '@workspace /explain');
        assert.strictEqual(event.waitingForInput, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi92b2ljZUNoYXRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFHbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDL0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDL0YsT0FBTyxFQU9OLGtCQUFrQixHQUNsQixNQUFNLHlDQUF5QyxDQUFBO0FBaUJoRCxPQUFPLEVBR04sZ0JBQWdCLEdBQ2hCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFN0QsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsTUFBTSxvQkFBb0I7UUFDekIsWUFDVSxJQUFZLEVBQ1osV0FBbUI7WUFEbkIsU0FBSSxHQUFKLElBQUksQ0FBUTtZQUNaLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQzFCLENBQUM7S0FDSjtJQUVELE1BQU0sYUFBYTtRQU9sQixZQUNVLEVBQVUsRUFDVixhQUFrQztZQURsQyxPQUFFLEdBQUYsRUFBRSxDQUFRO1lBQ1Ys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QUM1RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxFQUFFLElBQUksRUFDWCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQzNFLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakQsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQTtRQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxFQUFFLElBQUksRUFDWCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQzNFLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQTtRQUM1RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxFQUFFLElBQUksRUFDWCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsNkJB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