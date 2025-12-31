/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { URI } from '../../../../../base/common/uri.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { IExtensionService, nullExtensionDescription, } from '../../../../services/extensions/common/extensions.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { TestContextService, TestExtensionService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { ChatAgentService, IChatAgentService, } from '../../common/chatAgents.js';
import { IChatService } from '../../common/chatService.js';
import { ChatService } from '../../common/chatServiceImpl.js';
import { ChatSlashCommandService, IChatSlashCommandService, } from '../../common/chatSlashCommands.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { MockChatService } from './mockChatService.js';
import { MockChatVariablesService } from './mockChatVariables.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
const chatAgentWithUsedContextId = 'ChatProviderWithUsedContext';
const chatAgentWithUsedContext = {
    id: chatAgentWithUsedContextId,
    name: chatAgentWithUsedContextId,
    extensionId: nullExtensionDescription.identifier,
    publisherDisplayName: '',
    extensionPublisherId: '',
    extensionDisplayName: '',
    locations: [ChatAgentLocation.Panel],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
    async invoke(request, progress, history, token) {
        progress({
            documents: [
                {
                    uri: URI.file('/test/path/to/file'),
                    version: 3,
                    ranges: [new Range(1, 1, 2, 2)],
                },
            ],
            kind: 'usedContext',
        });
        return { metadata: { metadataKey: 'value' } };
    },
    async provideFollowups(sessionId, token) {
        return [
            {
                kind: 'reply',
                message: 'Something else',
                agentId: '',
                tooltip: 'a tooltip',
            },
        ];
    },
};
const chatAgentWithMarkdownId = 'ChatProviderWithMarkdown';
const chatAgentWithMarkdown = {
    id: chatAgentWithMarkdownId,
    name: chatAgentWithMarkdownId,
    extensionId: nullExtensionDescription.identifier,
    publisherDisplayName: '',
    extensionPublisherId: '',
    extensionDisplayName: '',
    locations: [ChatAgentLocation.Panel],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
    async invoke(request, progress, history, token) {
        progress({ kind: 'markdownContent', content: new MarkdownString('test') });
        return { metadata: { metadataKey: 'value' } };
    },
    async provideFollowups(sessionId, token) {
        return [];
    },
};
function getAgentData(id) {
    return {
        name: id,
        id: id,
        extensionId: nullExtensionDescription.identifier,
        extensionPublisherId: '',
        publisherDisplayName: '',
        extensionDisplayName: '',
        locations: [ChatAgentLocation.Panel],
        metadata: {},
        slashCommands: [],
        disambiguation: [],
    };
}
suite('ChatService', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let storageService;
    let instantiationService;
    let chatAgentService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService(new ServiceCollection([IChatVariablesService, new MockChatVariablesService()], [IWorkbenchAssignmentService, new NullWorkbenchAssignmentService()])));
        instantiationService.stub(IStorageService, (storageService = testDisposables.add(new TestStorageService())));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IViewsService, new TestExtensionService());
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        instantiationService.stub(IChatSlashCommandService, testDisposables.add(instantiationService.createInstance(ChatSlashCommandService)));
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IChatService, new MockChatService());
        instantiationService.stub(IEnvironmentService, {
            workspaceStorageHome: URI.file('/test/path/to/workspaceStorage'),
        });
        instantiationService.stub(ILifecycleService, { onWillShutdown: Event.None });
        chatAgentService = testDisposables.add(instantiationService.createInstance(ChatAgentService));
        instantiationService.stub(IChatAgentService, chatAgentService);
        const agent = {
            async invoke(request, progress, history, token) {
                return {};
            },
        };
        testDisposables.add(chatAgentService.registerAgent('testAgent', {
            ...getAgentData('testAgent'),
            isDefault: true,
        }));
        testDisposables.add(chatAgentService.registerAgent(chatAgentWithUsedContextId, getAgentData(chatAgentWithUsedContextId)));
        testDisposables.add(chatAgentService.registerAgent(chatAgentWithMarkdownId, getAgentData(chatAgentWithMarkdownId)));
        testDisposables.add(chatAgentService.registerAgentImplementation('testAgent', agent));
        chatAgentService.updateAgent('testAgent', { requester: { name: 'test' } });
    });
    test('retrieveSession', async () => {
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const session1 = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        await session1.waitForInitialization();
        session1.addRequest({ parts: [], text: 'request 1' }, { variables: [] }, 0);
        const session2 = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        await session2.waitForInitialization();
        session2.addRequest({ parts: [], text: 'request 2' }, { variables: [] }, 0);
        storageService.flush();
        const testService2 = testDisposables.add(instantiationService.createInstance(ChatService));
        const retrieved1 = testDisposables.add((await testService2.getOrRestoreSession(session1.sessionId)));
        await retrieved1.waitForInitialization();
        const retrieved2 = testDisposables.add((await testService2.getOrRestoreSession(session2.sessionId)));
        await retrieved2.waitForInitialization();
        assert.deepStrictEqual(retrieved1.getRequests()[0]?.message.text, 'request 1');
        assert.deepStrictEqual(retrieved2.getRequests()[0]?.message.text, 'request 2');
    });
    test('addCompleteRequest', async () => {
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const model = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        assert.strictEqual(model.getRequests().length, 0);
        await testService.addCompleteRequest(model.sessionId, 'test request', undefined, 0, {
            message: 'test response',
        });
        assert.strictEqual(model.getRequests().length, 1);
        assert.ok(model.getRequests()[0].response);
        assert.strictEqual(model.getRequests()[0].response?.response.toString(), 'test response');
    });
    test('sendRequest fails', async () => {
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const model = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        const response = await testService.sendRequest(model.sessionId, `@${chatAgentWithUsedContextId} test request`);
        assert(response);
        await response.responseCompletePromise;
        await assertSnapshot(toSnapshotExportData(model));
    });
    test('history', async () => {
        const historyLengthAgent = {
            async invoke(request, progress, history, token) {
                return {
                    metadata: { historyLength: history.length },
                };
            },
        };
        testDisposables.add(chatAgentService.registerAgent('defaultAgent', {
            ...getAgentData('defaultAgent'),
            isDefault: true,
        }));
        testDisposables.add(chatAgentService.registerAgent('agent2', getAgentData('agent2')));
        testDisposables.add(chatAgentService.registerAgentImplementation('defaultAgent', historyLengthAgent));
        testDisposables.add(chatAgentService.registerAgentImplementation('agent2', historyLengthAgent));
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const model = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        // Send a request to default agent
        const response = await testService.sendRequest(model.sessionId, `test request`, {
            agentId: 'defaultAgent',
        });
        assert(response);
        await response.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 1);
        assert.strictEqual(model.getRequests()[0].response?.result?.metadata?.historyLength, 0);
        // Send a request to agent2- it can't see the default agent's message
        const response2 = await testService.sendRequest(model.sessionId, `test request`, {
            agentId: 'agent2',
        });
        assert(response2);
        await response2.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 2);
        assert.strictEqual(model.getRequests()[1].response?.result?.metadata?.historyLength, 0);
        // Send a request to defaultAgent - the default agent can see agent2's message
        const response3 = await testService.sendRequest(model.sessionId, `test request`, {
            agentId: 'defaultAgent',
        });
        assert(response3);
        await response3.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 3);
        assert.strictEqual(model.getRequests()[2].response?.result?.metadata?.historyLength, 2);
    });
    test('can serialize', async () => {
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithUsedContextId, chatAgentWithUsedContext));
        chatAgentService.updateAgent(chatAgentWithUsedContextId, { requester: { name: 'test' } });
        const testService = testDisposables.add(instantiationService.createInstance(ChatService));
        const model = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        assert.strictEqual(model.getRequests().length, 0);
        await assertSnapshot(toSnapshotExportData(model));
        const response = await testService.sendRequest(model.sessionId, `@${chatAgentWithUsedContextId} test request`);
        assert(response);
        await response.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 1);
        const response2 = await testService.sendRequest(model.sessionId, `test request 2`);
        assert(response2);
        await response2.responseCompletePromise;
        assert.strictEqual(model.getRequests().length, 2);
        await assertSnapshot(toSnapshotExportData(model));
    });
    test('can deserialize', async () => {
        let serializedChatData;
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithUsedContextId, chatAgentWithUsedContext));
        // create the first service, send request, get response, and serialize the state
        {
            // serapate block to not leak variables in outer scope
            const testService = testDisposables.add(instantiationService.createInstance(ChatService));
            const chatModel1 = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
            assert.strictEqual(chatModel1.getRequests().length, 0);
            const response = await testService.sendRequest(chatModel1.sessionId, `@${chatAgentWithUsedContextId} test request`);
            assert(response);
            await response.responseCompletePromise;
            serializedChatData = JSON.parse(JSON.stringify(chatModel1));
        }
        // try deserializing the state into a new service
        const testService2 = testDisposables.add(instantiationService.createInstance(ChatService));
        const chatModel2 = testService2.loadSessionFromContent(serializedChatData);
        assert(chatModel2);
        await assertSnapshot(toSnapshotExportData(chatModel2));
    });
    test('can deserialize with response', async () => {
        let serializedChatData;
        testDisposables.add(chatAgentService.registerAgentImplementation(chatAgentWithMarkdownId, chatAgentWithMarkdown));
        {
            const testService = testDisposables.add(instantiationService.createInstance(ChatService));
            const chatModel1 = testDisposables.add(testService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
            assert.strictEqual(chatModel1.getRequests().length, 0);
            const response = await testService.sendRequest(chatModel1.sessionId, `@${chatAgentWithUsedContextId} test request`);
            assert(response);
            await response.responseCompletePromise;
            serializedChatData = JSON.parse(JSON.stringify(chatModel1));
        }
        // try deserializing the state into a new service
        const testService2 = testDisposables.add(instantiationService.createInstance(ChatService));
        const chatModel2 = testService2.loadSessionFromContent(serializedChatData);
        assert(chatModel2);
        await assertSnapshot(toSnapshotExportData(chatModel2));
    });
});
function toSnapshotExportData(model) {
    const exp = model.toExport();
    return {
        ...exp,
        requests: exp.requests.map((r) => {
            return {
                ...r,
                timestamp: undefined,
                requestId: undefined, // id contains a random part
                responseId: undefined, // id contains a random part
            };
        }),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vY2hhdFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxN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