/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { URI } from '../../../../../base/common/uri.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { OffsetRange } from '../../../../../editor/common/core/offsetRange.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ChatAgentService, IChatAgentService } from '../../common/chatAgents.js';
import { ChatModel, normalizeSerializableChatData, Response, } from '../../common/chatModel.js';
import { ChatRequestTextPart } from '../../common/chatParserTypes.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { TestExtensionService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
suite('ChatModel', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IStorageService, testDisposables.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IChatAgentService, testDisposables.add(instantiationService.createInstance(ChatAgentService)));
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
    });
    test('Waits for initialization', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        let hasInitialized = false;
        model.waitForInitialization().then(() => {
            hasInitialized = true;
        });
        await timeout(0);
        assert.strictEqual(hasInitialized, false);
        model.startInitialize();
        model.initialize(undefined);
        await timeout(0);
        assert.strictEqual(hasInitialized, true);
    });
    test('must call startInitialize before initialize', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        let hasInitialized = false;
        model.waitForInitialization().then(() => {
            hasInitialized = true;
        });
        await timeout(0);
        assert.strictEqual(hasInitialized, false);
        assert.throws(() => model.initialize(undefined));
        assert.strictEqual(hasInitialized, false);
    });
    test('deinitialize/reinitialize', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        let hasInitialized = false;
        model.waitForInitialization().then(() => {
            hasInitialized = true;
        });
        model.startInitialize();
        model.initialize(undefined);
        await timeout(0);
        assert.strictEqual(hasInitialized, true);
        model.deinitialize();
        let hasInitialized2 = false;
        model.waitForInitialization().then(() => {
            hasInitialized2 = true;
        });
        model.startInitialize();
        model.initialize(undefined);
        await timeout(0);
        assert.strictEqual(hasInitialized2, true);
    });
    test('cannot initialize twice', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model.startInitialize();
        model.initialize(undefined);
        assert.throws(() => model.initialize(undefined));
    });
    test('Initialization fails when model is disposed', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model.dispose();
        assert.throws(() => model.initialize(undefined));
    });
    test('removeRequest', async () => {
        const model = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model.startInitialize();
        model.initialize(undefined);
        const text = 'hello';
        model.addRequest({
            text,
            parts: [
                new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text),
            ],
        }, { variables: [] }, 0);
        const requests = model.getRequests();
        assert.strictEqual(requests.length, 1);
        model.removeRequest(requests[0].id);
        assert.strictEqual(model.getRequests().length, 0);
    });
    test('adoptRequest', async function () {
        const model1 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Editor));
        const model2 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model1.startInitialize();
        model1.initialize(undefined);
        model2.startInitialize();
        model2.initialize(undefined);
        const text = 'hello';
        const request1 = model1.addRequest({
            text,
            parts: [
                new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text),
            ],
        }, { variables: [] }, 0);
        assert.strictEqual(model1.getRequests().length, 1);
        assert.strictEqual(model2.getRequests().length, 0);
        assert.ok(request1.session === model1);
        assert.ok(request1.response?.session === model1);
        model2.adoptRequest(request1);
        assert.strictEqual(model1.getRequests().length, 0);
        assert.strictEqual(model2.getRequests().length, 1);
        assert.ok(request1.session === model2);
        assert.ok(request1.response?.session === model2);
        model2.acceptResponseProgress(request1, {
            content: new MarkdownString('Hello'),
            kind: 'markdownContent',
        });
        assert.strictEqual(request1.response.response.toString(), 'Hello');
    });
    test('addCompleteRequest', async function () {
        const model1 = testDisposables.add(instantiationService.createInstance(ChatModel, undefined, ChatAgentLocation.Panel));
        model1.startInitialize();
        model1.initialize(undefined);
        const text = 'hello';
        const request1 = model1.addRequest({
            text,
            parts: [
                new ChatRequestTextPart(new OffsetRange(0, text.length), new Range(1, text.length, 1, text.length), text),
            ],
        }, { variables: [] }, 0, undefined, undefined, undefined, undefined, undefined, true);
        assert.strictEqual(request1.isCompleteAddedRequest, true);
        assert.strictEqual(request1.response.isCompleteAddedRequest, true);
        assert.strictEqual(request1.shouldBeRemovedOnSend, undefined);
        assert.strictEqual(request1.response.shouldBeRemovedOnSend, undefined);
    });
});
suite('Response', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('mergeable markdown', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('markdown1'), kind: 'markdownContent' });
        response.updateContent({ content: new MarkdownString('markdown2'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
        assert.strictEqual(response.toString(), 'markdown1markdown2');
    });
    test('not mergeable markdown', async () => {
        const response = store.add(new Response([]));
        const md1 = new MarkdownString('markdown1');
        md1.supportHtml = true;
        response.updateContent({ content: md1, kind: 'markdownContent' });
        response.updateContent({ content: new MarkdownString('markdown2'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
    });
    test('inline reference', async () => {
        const response = store.add(new Response([]));
        response.updateContent({ content: new MarkdownString('text before '), kind: 'markdownContent' });
        response.updateContent({
            inlineReference: URI.parse('https://microsoft.com/'),
            kind: 'inlineReference',
        });
        response.updateContent({ content: new MarkdownString(' text after'), kind: 'markdownContent' });
        await assertSnapshot(response.value);
        assert.strictEqual(response.toString(), 'text before https://microsoft.com/ text after');
    });
});
suite('normalizeSerializableChatData', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('v1', () => {
        const v1Data = {
            creationDate: Date.now(),
            initialLocation: undefined,
            isImported: false,
            requesterAvatarIconUri: undefined,
            requesterUsername: 'me',
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
        };
        const newData = normalizeSerializableChatData(v1Data);
        assert.strictEqual(newData.creationDate, v1Data.creationDate);
        assert.strictEqual(newData.lastMessageDate, v1Data.creationDate);
        assert.strictEqual(newData.version, 3);
        assert.ok('customTitle' in newData);
    });
    test('v2', () => {
        const v2Data = {
            version: 2,
            creationDate: 100,
            lastMessageDate: Date.now(),
            initialLocation: undefined,
            isImported: false,
            requesterAvatarIconUri: undefined,
            requesterUsername: 'me',
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
            computedTitle: 'computed title',
        };
        const newData = normalizeSerializableChatData(v2Data);
        assert.strictEqual(newData.version, 3);
        assert.strictEqual(newData.creationDate, v2Data.creationDate);
        assert.strictEqual(newData.lastMessageDate, v2Data.lastMessageDate);
        assert.strictEqual(newData.customTitle, v2Data.computedTitle);
    });
    test('old bad data', () => {
        const v1Data = {
            // Testing the scenario where these are missing
            sessionId: undefined,
            creationDate: undefined,
            initialLocation: undefined,
            isImported: false,
            requesterAvatarIconUri: undefined,
            requesterUsername: 'me',
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
        };
        const newData = normalizeSerializableChatData(v1Data);
        assert.strictEqual(newData.version, 3);
        assert.ok(newData.creationDate > 0);
        assert.ok(newData.lastMessageDate > 0);
        assert.ok(newData.sessionId);
    });
    test('v3 with bug', () => {
        const v3Data = {
            // Test case where old data was wrongly normalized and these fields were missing
            creationDate: undefined,
            lastMessageDate: undefined,
            version: 3,
            initialLocation: undefined,
            isImported: false,
            requesterAvatarIconUri: undefined,
            requesterUsername: 'me',
            requests: [],
            responderAvatarIconUri: undefined,
            responderUsername: 'bot',
            sessionId: 'session1',
            customTitle: 'computed title',
        };
        const newData = normalizeSerializableChatData(v3Data);
        assert.strictEqual(newData.version, 3);
        assert.ok(newData.creationDate > 0);
        assert.ok(newData.lastMessageDate > 0);
        assert.ok(newData.sessionId);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL2NoYXRNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNoRixPQUFPLEVBQ04sU0FBUyxFQUlULDZCQUE2QixFQUM3QixRQUFRLEdBQ1IsTUFBTSwyQkFBMkIsQ0FBQTtBQUNs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