/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { ChatEditingService } from '../../browser/chatEditing/chatEditingServiceImpl.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IMultiDiffSourceResolverService, } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IChatService } from '../../common/chatService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ChatService } from '../../common/chatServiceImpl.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { assertThrowsAsync, ensureNoDisposablesAreLeakedInTestSuite, } from '../../../../../base/test/common/utils.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { MockChatVariablesService } from '../common/mockChatVariables.js';
import { ChatAgentService, IChatAgentService, } from '../../common/chatAgents.js';
import { IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { URI } from '../../../../../base/common/uri.js';
import { assertType } from '../../../../../base/common/types.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { waitForState } from '../../../../../base/common/observable.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ChatAgentLocation } from '../../common/constants.js';
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
suite('ChatEditingService', function () {
    const store = new DisposableStore();
    let editingService;
    let chatService;
    let textModelService;
    setup(function () {
        const collection = new ServiceCollection();
        collection.set(IWorkbenchAssignmentService, new NullWorkbenchAssignmentService());
        collection.set(IChatAgentService, new SyncDescriptor(ChatAgentService));
        collection.set(IChatVariablesService, new MockChatVariablesService());
        collection.set(IChatSlashCommandService, new (class extends mock() {
        })());
        collection.set(IChatEditingService, new SyncDescriptor(ChatEditingService));
        collection.set(IChatService, new SyncDescriptor(ChatService));
        collection.set(IMultiDiffSourceResolverService, new (class extends mock() {
            registerResolver(_resolver) {
                return Disposable.None;
            }
        })());
        collection.set(INotebookService, new (class extends mock() {
            getNotebookTextModel(_uri) {
                return undefined;
            }
            hasSupportedNotebooks(_resource) {
                return false;
            }
        })());
        const insta = store.add(store.add(workbenchInstantiationService(undefined, store)).createChild(collection));
        const value = insta.get(IChatEditingService);
        assert.ok(value instanceof ChatEditingService);
        editingService = value;
        chatService = insta.get(IChatService);
        const chatAgentService = insta.get(IChatAgentService);
        const agent = {
            async invoke(request, progress, history, token) {
                return {};
            },
        };
        store.add(chatAgentService.registerAgent('testAgent', {
            ...getAgentData('testAgent'),
            isDefault: true,
        }));
        store.add(chatAgentService.registerAgentImplementation('testAgent', agent));
        textModelService = insta.get(ITextModelService);
        const modelService = insta.get(IModelService);
        store.add(textModelService.registerTextModelContentProvider('test', {
            async provideTextContent(resource) {
                return modelService.createModel(resource.path.repeat(10), null, resource, false);
            },
        }));
    });
    teardown(() => {
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('create session', async function () {
        assert.ok(editingService);
        const model = chatService.startSession(ChatAgentLocation.EditingSession, CancellationToken.None);
        const session = await editingService.createEditingSession(model, true);
        assert.strictEqual(session.chatSessionId, model.sessionId);
        assert.strictEqual(session.isGlobalEditingSession, true);
        await assertThrowsAsync(async () => {
            // DUPE not allowed
            await editingService.createEditingSession(model);
        });
        session.dispose();
        model.dispose();
    });
    test('create session, file entry & isCurrentlyBeingModifiedBy', async function () {
        assert.ok(editingService);
        const uri = URI.from({ scheme: 'test', path: 'HelloWorld' });
        const model = chatService.startSession(ChatAgentLocation.EditingSession, CancellationToken.None);
        const session = await model.editingSessionObs?.promise;
        if (!session) {
            assert.fail('session not created');
        }
        const chatRequest = model?.addRequest({ text: '', parts: [] }, { variables: [] }, 0);
        assertType(chatRequest.response);
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: false });
        chatRequest.response.updateContent({
            kind: 'textEdit',
            uri,
            edits: [{ range: new Range(1, 1, 1, 1), text: 'FarBoo\n' }],
            done: false,
        });
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: true });
        const entry = await waitForState(session.entries.map((value) => value.find((a) => isEqual(a.modifiedURI, uri))));
        assert.ok(isEqual(entry.modifiedURI, uri));
        await waitForState(entry.isCurrentlyBeingModifiedBy.map((value) => value === chatRequest.response));
        assert.ok(entry.isCurrentlyBeingModifiedBy.get() === chatRequest.response);
        const unset = waitForState(entry.isCurrentlyBeingModifiedBy.map((res) => res === undefined));
        chatRequest.response.complete();
        await unset;
        await entry.reject(undefined);
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9jaGF0RWRpdGluZ1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBRU4sK0JBQStCLEdBQy9CLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsdUNBQXVDLEdBQ3ZDLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekUsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixpQkFBaUIsR0FDakIs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