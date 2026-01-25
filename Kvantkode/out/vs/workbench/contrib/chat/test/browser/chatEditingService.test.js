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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9icm93c2VyL2NoYXRFZGl0aW5nU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFFTiwrQkFBK0IsR0FDL0IsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEUsT0FBTyxFQUNOLGlCQUFpQixFQUNqQix1Q0FBdUMsR0FDdkMsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLGlCQUFpQixH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