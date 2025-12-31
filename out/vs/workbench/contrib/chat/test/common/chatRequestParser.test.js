/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mockObject } from '../../../../../base/test/common/mock.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IExtensionService, nullExtensionDescription, } from '../../../../services/extensions/common/extensions.js';
import { TestExtensionService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { ChatAgentService, IChatAgentService, } from '../../common/chatAgents.js';
import { ChatRequestParser } from '../../common/chatRequestParser.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { ChatMode, ChatAgentLocation } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { MockChatService } from './mockChatService.js';
import { MockChatVariablesService } from './mockChatVariables.js';
suite('ChatRequestParser', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let parser;
    let toolsService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IStorageService, testDisposables.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IChatService, new MockChatService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IChatVariablesService, new MockChatVariablesService());
        instantiationService.stub(IChatAgentService, testDisposables.add(instantiationService.createInstance(ChatAgentService)));
        toolsService = mockObject()({});
        instantiationService.stub(ILanguageModelToolsService, toolsService);
    });
    test('plain text', async () => {
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', 'test');
        await assertSnapshot(result);
    });
    test('plain text with newlines', async () => {
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = 'line 1\nline 2\r\nline 3';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('slash command', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '/fix this';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('invalid slash command', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '/explain this';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('multiple slash commands', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '/fix /fix';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    // test('variables', async () => {
    // 	varService.hasVariable.returns(true);
    // 	varService.getVariable.returns({ id: 'copilot.selection' });
    // 	parser = instantiationService.createInstance(ChatRequestParser);
    // 	const text = 'What does #selection mean?';
    // 	const result = parser.parseChatRequest('1', text);
    // 	await assertSnapshot(result);
    // });
    // test('variable with question mark', async () => {
    // 	varService.hasVariable.returns(true);
    // 	varService.getVariable.returns({ id: 'copilot.selection' });
    // 	parser = instantiationService.createInstance(ChatRequestParser);
    // 	const text = 'What is #selection?';
    // 	const result = parser.parseChatRequest('1', text);
    // 	await assertSnapshot(result);
    // });
    // test('invalid variables', async () => {
    // 	varService.hasVariable.returns(false);
    // 	parser = instantiationService.createInstance(ChatRequestParser);
    // 	const text = 'What does #selection mean?';
    // 	const result = parser.parseChatRequest('1', text);
    // 	await assertSnapshot(result);
    // });
    const getAgentWithSlashCommands = (slashCommands) => {
        return {
            id: 'agent',
            name: 'agent',
            extensionId: nullExtensionDescription.identifier,
            publisherDisplayName: '',
            extensionDisplayName: '',
            extensionPublisherId: '',
            locations: [ChatAgentLocation.Panel],
            metadata: {},
            slashCommands,
            disambiguation: [],
        };
    };
    test('agent with subcommand after text', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([
            getAgentWithSlashCommands([{ name: 'subCommand', description: '' }]),
        ]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent Please do /subCommand thanks');
        await assertSnapshot(result);
    });
    test('agents, subCommand', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([
            getAgentWithSlashCommands([{ name: 'subCommand', description: '' }]),
        ]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent /subCommand Please do thanks');
        await assertSnapshot(result);
    });
    test('agent but edit mode', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([])]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent hello', undefined, { mode: ChatMode.Edit });
        await assertSnapshot(result);
    });
    test('agent with question mark', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([
            getAgentWithSlashCommands([{ name: 'subCommand', description: '' }]),
        ]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent? Are you there');
        await assertSnapshot(result);
    });
    test('agent and subcommand with leading whitespace', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([
            getAgentWithSlashCommands([{ name: 'subCommand', description: '' }]),
        ]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '    \r\n\t   @agent \r\n\t   /subCommand Thanks');
        await assertSnapshot(result);
    });
    test('agent and subcommand after newline', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([
            getAgentWithSlashCommands([{ name: 'subCommand', description: '' }]),
        ]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '    \n@agent\n/subCommand Thanks');
        await assertSnapshot(result);
    });
    test('agent not first', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([
            getAgentWithSlashCommands([{ name: 'subCommand', description: '' }]),
        ]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', 'Hello Mr. @agent');
        await assertSnapshot(result);
    });
    test('agents and tools and multiline', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([
            getAgentWithSlashCommands([{ name: 'subCommand', description: '' }]),
        ]);
        instantiationService.stub(IChatAgentService, agentsService);
        toolsService.getToolByName
            .onCall(0)
            .returns({
            id: 'get_selection',
            canBeReferencedInPrompt: true,
            displayName: '',
            modelDescription: '',
            source: { type: 'internal' },
        });
        toolsService.getToolByName
            .onCall(1)
            .returns({
            id: 'get_debugConsole',
            canBeReferencedInPrompt: true,
            displayName: '',
            modelDescription: '',
            source: { type: 'internal' },
        });
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent /subCommand \nPlease do with #selection\nand #debugConsole');
        await assertSnapshot(result);
    });
    test('agents and tools and multiline, part2', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([
            getAgentWithSlashCommands([{ name: 'subCommand', description: '' }]),
        ]);
        instantiationService.stub(IChatAgentService, agentsService);
        toolsService.getToolByName
            .onCall(0)
            .returns({
            id: 'get_selection',
            canBeReferencedInPrompt: true,
            displayName: '',
            modelDescription: '',
            source: { type: 'internal' },
        });
        toolsService.getToolByName
            .onCall(1)
            .returns({
            id: 'get_debugConsole',
            canBeReferencedInPrompt: true,
            displayName: '',
            modelDescription: '',
            source: { type: 'internal' },
        });
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent Please \ndo /subCommand with #selection\nand #debugConsole');
        await assertSnapshot(result);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlcXVlc3RQYXJzZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vY2hhdFJlcXVlc3RQYXJzZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWMsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25GLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsd0JBQXdCLEdBQ3hCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixrQkFBa0IsR0FDbEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sZ0JBQWdCLEVBR2hCLGlCQUFpQixHQUNqQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1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