/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ChatAgentService, } from '../../common/chatAgents.js';
const testAgentId = 'testAgent';
const testAgentData = {
    id: testAgentId,
    name: 'Test Agent',
    extensionDisplayName: '',
    extensionId: new ExtensionIdentifier(''),
    extensionPublisherId: '',
    locations: [],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
};
class TestingContextKeyService extends MockContextKeyService {
    constructor() {
        super(...arguments);
        this._contextMatchesRulesReturnsTrue = false;
    }
    contextMatchesRulesReturnsTrue() {
        this._contextMatchesRulesReturnsTrue = true;
    }
    contextMatchesRules(rules) {
        return this._contextMatchesRulesReturnsTrue;
    }
}
suite('ChatAgents', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let chatAgentService;
    let contextKeyService;
    setup(() => {
        contextKeyService = new TestingContextKeyService();
        chatAgentService = store.add(new ChatAgentService(contextKeyService));
    });
    test('registerAgent', async () => {
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        const agentRegistration = chatAgentService.registerAgent(testAgentId, testAgentData);
        assert.strictEqual(chatAgentService.getAgents().length, 1);
        assert.strictEqual(chatAgentService.getAgents()[0].id, testAgentId);
        assert.throws(() => chatAgentService.registerAgent(testAgentId, testAgentData));
        agentRegistration.dispose();
        assert.strictEqual(chatAgentService.getAgents().length, 0);
    });
    test('agent when clause', async () => {
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        store.add(chatAgentService.registerAgent(testAgentId, {
            ...testAgentData,
            when: 'myKey',
        }));
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        contextKeyService.contextMatchesRulesReturnsTrue();
        assert.strictEqual(chatAgentService.getAgents().length, 1);
    });
    suite('registerAgentImplementation', function () {
        const agentImpl = {
            invoke: async () => {
                return {};
            },
            provideFollowups: async () => {
                return [];
            },
        };
        test('should register an agent implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            store.add(chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
            const agents = chatAgentService.getActivatedAgents();
            assert.strictEqual(agents.length, 1);
            assert.strictEqual(agents[0].id, testAgentId);
        });
        test('can dispose an agent implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            const implRegistration = chatAgentService.registerAgentImplementation(testAgentId, agentImpl);
            implRegistration.dispose();
            const agents = chatAgentService.getActivatedAgents();
            assert.strictEqual(agents.length, 0);
        });
        test('should throw error if agent does not exist', () => {
            assert.throws(() => chatAgentService.registerAgentImplementation('nonexistentAgent', agentImpl));
        });
        test('should throw error if agent already has an implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            store.add(chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
            assert.throws(() => chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9jaGF0QWdlbnRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQy9HLE9BQU8sRUFDTixnQkFBZ0IsR0FHaEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUVuQyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUE7QUFDL0IsTUFBTSxhQUFhLEdBQW1CO0lBQ3JDLEVBQUUsRUFBRSxXQUFXO0lBQ2YsSUFBSSxFQUFFLFlBQVk7SUFDbEIsb0JBQW9CLEVBQUUsRUFBRTtJQUN4QixXQUFXLEVBQUUsSUFBSSxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7SUFDeEMsb0JBQW9CLEVBQUUsRUFBRTtJQUN4QixTQUFTLEVBQUUsRUFBRTtJQUNiLFFBQVEsRUFBRSxFQUFFO0lBQ1osYUFBYSxFQUFFLEVBQUU7SUFDakIsY0FBYyxFQUFFLEVBQUU7Q0FDbEIsQ0FBQTtBQUVELE1BQU0sd0JBQXlCLFNBQVEscUJBQXFCO0lBQTVEOztRQUNTLG9DQUErQixHQUFHLEtBQUssQ0FBQTtJQVFoRCxDQUFDO0lBUE8sOEJBQThCO1FBQ3BDLElBQUksQ0FBQywrQkFBK0IsR0FBRyxJQUFJLENBQUE7SUFDNUMsQ0FBQztJQUVlLG1CQUFtQixDQUFDLEtBQTJCO1FBQzlELE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFBO0lBQzVDLENBQUM7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