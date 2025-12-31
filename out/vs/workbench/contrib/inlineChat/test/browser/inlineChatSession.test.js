/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Event } from '../../../../../base/common/event.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestDiffProviderFactoryService } from '../../../../../editor/test/browser/diff/testDiffProviderFactoryService.js';
import { IDiffProviderFactoryService } from '../../../../../editor/browser/widget/diffEditor/diffProviderFactoryService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { instantiateTestCodeEditor } from '../../../../../editor/test/browser/testCodeEditor.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IEditorProgressService, } from '../../../../../platform/progress/common/progress.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IChatAccessibilityService, IChatWidgetService } from '../../../chat/browser/chat.js';
import { IInlineChatSessionService } from '../../browser/inlineChatSessionService.js';
import { InlineChatSessionServiceImpl } from '../../browser/inlineChatSessionServiceImpl.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { assertType } from '../../../../../base/common/types.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { TestWorkerService } from './testWorkerService.js';
import { IExtensionService, nullExtensionDescription, } from '../../../../services/extensions/common/extensions.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ChatWidgetService } from '../../../chat/browser/chatWidget.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatService } from '../../../chat/common/chatServiceImpl.js';
import { IChatSlashCommandService, ChatSlashCommandService, } from '../../../chat/common/chatSlashCommands.js';
import { IChatVariablesService } from '../../../chat/common/chatVariables.js';
import { IChatWidgetHistoryService, ChatWidgetHistoryService, } from '../../../chat/common/chatWidgetHistoryService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { TestExtensionService, TestContextService, } from '../../../../test/common/workbenchTestServices.js';
import { IChatAgentService, ChatAgentService } from '../../../chat/common/chatAgents.js';
import { ChatVariablesService } from '../../../chat/browser/chatVariables.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { TestCommandService } from '../../../../../editor/test/browser/editorTestServices.js';
import { IAccessibleViewService } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { ILanguageModelToolsService } from '../../../chat/common/languageModelToolsService.js';
import { MockLanguageModelToolsService } from '../../../chat/test/common/mockLanguageModelToolsService.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { constObservable } from '../../../../../base/common/observable.js';
import { IChatEditingService, } from '../../../chat/common/chatEditingService.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
suite('InlineChatSession', function () {
    const store = new DisposableStore();
    let editor;
    let model;
    let instaService;
    let inlineChatSessionService;
    setup(function () {
        const contextKeyService = new MockContextKeyService();
        const serviceCollection = new ServiceCollection([IConfigurationService, new TestConfigurationService()], [IChatVariablesService, new SyncDescriptor(ChatVariablesService)], [ILogService, new NullLogService()], [ITelemetryService, NullTelemetryService], [IExtensionService, new TestExtensionService()], [IContextKeyService, new MockContextKeyService()], [IViewsService, new TestExtensionService()], [IWorkspaceContextService, new TestContextService()], [IChatWidgetHistoryService, new SyncDescriptor(ChatWidgetHistoryService)], [IChatWidgetService, new SyncDescriptor(ChatWidgetService)], [IChatSlashCommandService, new SyncDescriptor(ChatSlashCommandService)], [IChatService, new SyncDescriptor(ChatService)], [IEditorWorkerService, new SyncDescriptor(TestWorkerService)], [IChatAgentService, new SyncDescriptor(ChatAgentService)], [IContextKeyService, contextKeyService], [IDiffProviderFactoryService, new SyncDescriptor(TestDiffProviderFactoryService)], [IInlineChatSessionService, new SyncDescriptor(InlineChatSessionServiceImpl)], [ICommandService, new SyncDescriptor(TestCommandService)], [ILanguageModelToolsService, new MockLanguageModelToolsService()], [
            IEditorProgressService,
            new (class extends mock() {
                show(total, delay) {
                    return {
                        total() { },
                        worked(value) { },
                        done() { },
                    };
                }
            })(),
        ], [
            IChatEditingService,
            new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.editingSessionsObs = constObservable([]);
                }
            })(),
        ], [
            IChatAccessibilityService,
            new (class extends mock() {
                acceptResponse(response, requestId) { }
                acceptRequest() {
                    return -1;
                }
            })(),
        ], [
            IAccessibleViewService,
            new (class extends mock() {
                getOpenAriaHint(verbositySettingKey) {
                    return null;
                }
            })(),
        ], [IConfigurationService, new TestConfigurationService()], [
            IViewDescriptorService,
            new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeLocation = Event.None;
                }
            })(),
        ], [IWorkbenchAssignmentService, new NullWorkbenchAssignmentService()]);
        instaService = store.add(workbenchInstantiationService(undefined, store).createChild(serviceCollection));
        inlineChatSessionService = store.add(instaService.get(IInlineChatSessionService));
        instaService.get(IChatAgentService).registerDynamicAgent({
            extensionId: nullExtensionDescription.identifier,
            publisherDisplayName: '',
            extensionDisplayName: '',
            extensionPublisherId: '',
            id: 'testAgent',
            name: 'testAgent',
            isDefault: true,
            locations: [ChatAgentLocation.Editor],
            metadata: {},
            slashCommands: [],
            disambiguation: [],
        }, {
            async invoke() {
                return {};
            },
        });
        model = store.add(instaService
            .get(IModelService)
            .createModel('one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten\neleven', null));
        editor = store.add(instantiateTestCodeEditor(instaService, model));
    });
    teardown(function () {
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    async function makeEditAsAi(edit) {
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assertType(session);
        session.hunkData.ignoreTextModelNChanges = true;
        try {
            editor.executeEdits('test', Array.isArray(edit) ? edit : [edit]);
        }
        finally {
            session.hunkData.ignoreTextModelNChanges = false;
        }
        await session.hunkData.recompute({ applied: 0, sha1: 'fakeSha1' });
    }
    function makeEdit(edit) {
        editor.executeEdits('test', Array.isArray(edit) ? edit : [edit]);
    }
    test('Create, release', async function () {
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        inlineChatSessionService.releaseSession(session);
    });
    test('HunkData, info', async function () {
        const decorationCountThen = model.getAllDecorations().length;
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        assert.ok(session.textModelN === model);
        await makeEditAsAi(EditOperation.insert(new Position(1, 1), 'AI_EDIT\n'));
        assert.strictEqual(session.hunkData.size, 1);
        let [hunk] = session.hunkData.getInfo();
        assertType(hunk);
        assert.ok(!session.textModel0.equalsTextBuffer(session.textModelN.getTextBuffer()));
        assert.strictEqual(hunk.getState(), 0 /* HunkState.Pending */);
        assert.ok(hunk
            .getRangesN()[0]
            .equalsRange({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 8 }));
        await makeEditAsAi(EditOperation.insert(new Position(1, 3), 'foobar'));
        [hunk] = session.hunkData.getInfo();
        assert.ok(hunk
            .getRangesN()[0]
            .equalsRange({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 14 }));
        inlineChatSessionService.releaseSession(session);
        assert.strictEqual(model.getAllDecorations().length, decorationCountThen); // no leaked decorations!
    });
    test('HunkData, accept', async function () {
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([
            EditOperation.insert(new Position(1, 1), 'AI_EDIT\n'),
            EditOperation.insert(new Position(10, 1), 'AI_EDIT\n'),
        ]);
        assert.strictEqual(session.hunkData.size, 2);
        assert.ok(!session.textModel0.equalsTextBuffer(session.textModelN.getTextBuffer()));
        for (const hunk of session.hunkData.getInfo()) {
            assertType(hunk);
            assert.strictEqual(hunk.getState(), 0 /* HunkState.Pending */);
            hunk.acceptChanges();
            assert.strictEqual(hunk.getState(), 1 /* HunkState.Accepted */);
        }
        assert.strictEqual(session.textModel0.getValue(), session.textModelN.getValue());
        inlineChatSessionService.releaseSession(session);
    });
    test('HunkData, reject', async function () {
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([
            EditOperation.insert(new Position(1, 1), 'AI_EDIT\n'),
            EditOperation.insert(new Position(10, 1), 'AI_EDIT\n'),
        ]);
        assert.strictEqual(session.hunkData.size, 2);
        assert.ok(!session.textModel0.equalsTextBuffer(session.textModelN.getTextBuffer()));
        for (const hunk of session.hunkData.getInfo()) {
            assertType(hunk);
            assert.strictEqual(hunk.getState(), 0 /* HunkState.Pending */);
            hunk.discardChanges();
            assert.strictEqual(hunk.getState(), 2 /* HunkState.Rejected */);
        }
        assert.strictEqual(session.textModel0.getValue(), session.textModelN.getValue());
        inlineChatSessionService.releaseSession(session);
    });
    test('HunkData, N rounds', async function () {
        model.setValue('one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten\neleven\ntwelwe\nthirteen\nfourteen\nfifteen\nsixteen\nseventeen\neighteen\nnineteen\n');
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        assert.ok(session.textModel0.equalsTextBuffer(session.textModelN.getTextBuffer()));
        assert.strictEqual(session.hunkData.size, 0);
        // ROUND #1
        await makeEditAsAi([
            EditOperation.insert(new Position(1, 1), 'AI1'),
            EditOperation.insert(new Position(4, 1), 'AI2'),
            EditOperation.insert(new Position(19, 1), 'AI3'),
        ]);
        assert.strictEqual(session.hunkData.size, 2); // AI1, AI2 are merged into one hunk, AI3 is a separate hunk
        let [first, second] = session.hunkData.getInfo();
        assert.ok(model.getValueInRange(first.getRangesN()[0]).includes('AI1'));
        assert.ok(model.getValueInRange(first.getRangesN()[0]).includes('AI2'));
        assert.ok(model.getValueInRange(second.getRangesN()[0]).includes('AI3'));
        assert.ok(!session.textModel0.getValueInRange(first.getRangesN()[0]).includes('AI1'));
        assert.ok(!session.textModel0.getValueInRange(first.getRangesN()[0]).includes('AI2'));
        assert.ok(!session.textModel0.getValueInRange(second.getRangesN()[0]).includes('AI3'));
        first.acceptChanges();
        assert.ok(session.textModel0.getValueInRange(first.getRangesN()[0]).includes('AI1'));
        assert.ok(session.textModel0.getValueInRange(first.getRangesN()[0]).includes('AI2'));
        assert.ok(!session.textModel0.getValueInRange(second.getRangesN()[0]).includes('AI3'));
        // ROUND #2
        await makeEditAsAi([EditOperation.insert(new Position(7, 1), 'AI4')]);
        assert.strictEqual(session.hunkData.size, 2);
        [first, second] = session.hunkData.getInfo();
        assert.ok(model.getValueInRange(first.getRangesN()[0]).includes('AI4')); // the new hunk (in line-order)
        assert.ok(model.getValueInRange(second.getRangesN()[0]).includes('AI3')); // the previous hunk remains
        inlineChatSessionService.releaseSession(session);
    });
    test('HunkData, (mirror) edit before', async function () {
        const lines = ['one', 'two', 'three'];
        model.setValue(lines.join('\n'));
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([EditOperation.insert(new Position(3, 1), 'AI WAS HERE\n')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two', 'AI WAS HERE', 'three'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), lines.join('\n'));
        makeEdit([EditOperation.replace(new Range(1, 1, 1, 4), 'ONE')]);
        assert.strictEqual(session.textModelN.getValue(), ['ONE', 'two', 'AI WAS HERE', 'three'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['ONE', 'two', 'three'].join('\n'));
    });
    test('HunkData, (mirror) edit after', async function () {
        const lines = ['one', 'two', 'three', 'four', 'five'];
        model.setValue(lines.join('\n'));
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([EditOperation.insert(new Position(3, 1), 'AI_EDIT\n')]);
        assert.strictEqual(session.hunkData.size, 1);
        const [hunk] = session.hunkData.getInfo();
        makeEdit([EditOperation.insert(new Position(1, 1), 'USER1')]);
        assert.strictEqual(session.textModelN.getValue(), ['USER1one', 'two', 'AI_EDIT', 'three', 'four', 'five'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['USER1one', 'two', 'three', 'four', 'five'].join('\n'));
        makeEdit([EditOperation.insert(new Position(5, 1), 'USER2')]);
        assert.strictEqual(session.textModelN.getValue(), ['USER1one', 'two', 'AI_EDIT', 'three', 'USER2four', 'five'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['USER1one', 'two', 'three', 'USER2four', 'five'].join('\n'));
        hunk.acceptChanges();
        assert.strictEqual(session.textModelN.getValue(), ['USER1one', 'two', 'AI_EDIT', 'three', 'USER2four', 'five'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['USER1one', 'two', 'AI_EDIT', 'three', 'USER2four', 'five'].join('\n'));
    });
    test('HunkData, (mirror) edit inside ', async function () {
        const lines = ['one', 'two', 'three'];
        model.setValue(lines.join('\n'));
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([EditOperation.insert(new Position(3, 1), 'AI WAS HERE\n')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two', 'AI WAS HERE', 'three'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), lines.join('\n'));
        makeEdit([EditOperation.replace(new Range(3, 4, 3, 7), 'wwaaassss')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two', 'AI wwaaassss HERE', 'three'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['one', 'two', 'three'].join('\n'));
    });
    test('HunkData, (mirror) edit after dicard ', async function () {
        const lines = ['one', 'two', 'three'];
        model.setValue(lines.join('\n'));
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([EditOperation.insert(new Position(3, 1), 'AI WAS HERE\n')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two', 'AI WAS HERE', 'three'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), lines.join('\n'));
        assert.strictEqual(session.hunkData.size, 1);
        const [hunk] = session.hunkData.getInfo();
        hunk.discardChanges();
        assert.strictEqual(session.textModelN.getValue(), lines.join('\n'));
        assert.strictEqual(session.textModel0.getValue(), lines.join('\n'));
        makeEdit([EditOperation.replace(new Range(3, 4, 3, 6), '3333')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two', 'thr3333'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['one', 'two', 'thr3333'].join('\n'));
    });
    test('HunkData, (mirror) edit after, multi turn', async function () {
        const lines = ['one', 'two', 'three', 'four', 'five'];
        model.setValue(lines.join('\n'));
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([EditOperation.insert(new Position(3, 1), 'AI_EDIT\n')]);
        assert.strictEqual(session.hunkData.size, 1);
        makeEdit([EditOperation.insert(new Position(5, 1), 'FOO')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two', 'AI_EDIT', 'three', 'FOOfour', 'five'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['one', 'two', 'three', 'FOOfour', 'five'].join('\n'));
        await makeEditAsAi([EditOperation.insert(new Position(2, 4), ' zwei')]);
        assert.strictEqual(session.hunkData.size, 1);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two zwei', 'AI_EDIT', 'three', 'FOOfour', 'five'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['one', 'two', 'three', 'FOOfour', 'five'].join('\n'));
        makeEdit([EditOperation.replace(new Range(6, 3, 6, 5), 'vefivefi')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two zwei', 'AI_EDIT', 'three', 'FOOfour', 'fivefivefi'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['one', 'two', 'three', 'FOOfour', 'fivefivefi'].join('\n'));
    });
    test('HunkData, (mirror) edit after, multi turn 2', async function () {
        const lines = ['one', 'two', 'three', 'four', 'five'];
        model.setValue(lines.join('\n'));
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([EditOperation.insert(new Position(3, 1), 'AI_EDIT\n')]);
        assert.strictEqual(session.hunkData.size, 1);
        makeEdit([EditOperation.insert(new Position(5, 1), 'FOO')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'two', 'AI_EDIT', 'three', 'FOOfour', 'five'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['one', 'two', 'three', 'FOOfour', 'five'].join('\n'));
        await makeEditAsAi([EditOperation.insert(new Position(2, 4), 'zwei')]);
        assert.strictEqual(session.hunkData.size, 1);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'twozwei', 'AI_EDIT', 'three', 'FOOfour', 'five'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['one', 'two', 'three', 'FOOfour', 'five'].join('\n'));
        makeEdit([EditOperation.replace(new Range(6, 3, 6, 5), 'vefivefi')]);
        assert.strictEqual(session.textModelN.getValue(), ['one', 'twozwei', 'AI_EDIT', 'three', 'FOOfour', 'fivefivefi'].join('\n'));
        assert.strictEqual(session.textModel0.getValue(), ['one', 'two', 'three', 'FOOfour', 'fivefivefi'].join('\n'));
        session.hunkData.getInfo()[0].acceptChanges();
        assert.strictEqual(session.textModelN.getValue(), session.textModel0.getValue());
        makeEdit([EditOperation.replace(new Range(1, 1, 1, 1), 'done')]);
        assert.strictEqual(session.textModelN.getValue(), session.textModel0.getValue());
    });
    test('HunkData, accept, discardAll', async function () {
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([
            EditOperation.insert(new Position(1, 1), 'AI_EDIT\n'),
            EditOperation.insert(new Position(10, 1), 'AI_EDIT\n'),
        ]);
        assert.strictEqual(session.hunkData.size, 2);
        assert.ok(!session.textModel0.equalsTextBuffer(session.textModelN.getTextBuffer()));
        const textModeNNow = session.textModelN.getValue();
        session.hunkData.getInfo()[0].acceptChanges();
        assert.strictEqual(textModeNNow, session.textModelN.getValue());
        session.hunkData.discardAll(); // all remaining
        assert.strictEqual(session.textModelN.getValue(), 'AI_EDIT\none\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten\neleven');
        assert.strictEqual(session.textModelN.getValue(), session.textModel0.getValue());
        inlineChatSessionService.releaseSession(session);
    });
    test('HunkData, discardAll return undo edits', async function () {
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([
            EditOperation.insert(new Position(1, 1), 'AI_EDIT\n'),
            EditOperation.insert(new Position(10, 1), 'AI_EDIT\n'),
        ]);
        assert.strictEqual(session.hunkData.size, 2);
        assert.ok(!session.textModel0.equalsTextBuffer(session.textModelN.getTextBuffer()));
        const textModeNNow = session.textModelN.getValue();
        session.hunkData.getInfo()[0].acceptChanges();
        assert.strictEqual(textModeNNow, session.textModelN.getValue());
        const undoEdits = session.hunkData.discardAll(); // all remaining
        assert.strictEqual(session.textModelN.getValue(), 'AI_EDIT\none\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten\neleven');
        assert.strictEqual(session.textModelN.getValue(), session.textModel0.getValue());
        // undo the discards
        session.textModelN.pushEditOperations(null, undoEdits, () => null);
        assert.strictEqual(textModeNNow, session.textModelN.getValue());
        inlineChatSessionService.releaseSession(session);
    });
    test('Pressing Escape after inline chat errored with "response filtered" leaves document dirty #7764', async function () {
        const origValue = `class Foo {
	private onError(error: string): void {
		if (/The request timed out|The network connection was lost/i.test(error)) {
			return;
		}

		error = error.replace(/See https:\/\/github\.com\/Squirrel\/Squirrel\.Mac\/issues\/182 for more information/, 'This might mean the application was put on quarantine by macOS. See [this link](https://github.com/microsoft/vscode/issues/7426#issuecomment-425093469) for more information');

		this.notificationService.notify({
			severity: Severity.Error,
			message: error,
			source: nls.localize('update service', "Update Service"),
		});
	}
}`;
        model.setValue(origValue);
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        const fakeRequest = new (class extends mock() {
            get id() {
                return 'one';
            }
        })();
        session.markModelVersion(fakeRequest);
        assert.strictEqual(editor.getModel().getLineCount(), 15);
        await makeEditAsAi([
            EditOperation.replace(new Range(7, 1, 7, Number.MAX_SAFE_INTEGER), `error = error.replace(
			/See https:\/\/github\.com\/Squirrel\/Squirrel\.Mac\/issues\/182 for more information/,
			'This might mean the application was put on quarantine by macOS. See [this link](https://github.com/microsoft/vscode/issues/7426#issuecomment-425093469) for more information'
		);`),
        ]);
        assert.strictEqual(editor.getModel().getLineCount(), 18);
        // called when a response errors out
        await session.undoChangesUntil(fakeRequest.id);
        await session.hunkData.recompute({ applied: 0, sha1: 'fakeSha1' }, undefined);
        assert.strictEqual(editor.getModel().getValue(), origValue);
        session.hunkData.discardAll(); // called when dimissing the session
        assert.strictEqual(editor.getModel().getValue(), origValue);
    });
    test("Apply Code's preview should be easier to undo/esc #7537", async function () {
        model.setValue(`export function fib(n) {
	if (n <= 0) return 0;
	if (n === 1) return 0;
	if (n === 2) return 1;
	return fib(n - 1) + fib(n - 2);
}`);
        const session = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(session);
        await makeEditAsAi([
            EditOperation.replace(new Range(5, 1, 6, Number.MAX_SAFE_INTEGER), `
	let a = 0, b = 1, c;
	for (let i = 3; i <= n; i++) {
		c = a + b;
		a = b;
		b = c;
	}
	return b;
}`),
        ]);
        assert.strictEqual(session.hunkData.size, 1);
        assert.strictEqual(session.hunkData.pending, 1);
        assert.ok(session.hunkData.getInfo().every((d) => d.getState() === 0 /* HunkState.Pending */));
        await assertSnapshot(editor.getModel().getValue(), { name: '1' });
        await model.undo();
        await assertSnapshot(editor.getModel().getValue(), { name: '2' });
        // overlapping edits (even UNDO) mark edits as accepted
        assert.strictEqual(session.hunkData.size, 1);
        assert.strictEqual(session.hunkData.pending, 0);
        assert.ok(session.hunkData.getInfo().every((d) => d.getState() === 1 /* HunkState.Accepted */));
        // no further change when discarding
        session.hunkData.discardAll(); // CANCEL
        await assertSnapshot(editor.getModel().getValue(), { name: '2' });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvdGVzdC9icm93c2VyL2lubGluZUNoYXRTZXNzaW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBRTFILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQzNILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBRXJHLE9BQU8sRUFBRSxxQkFB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SyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN2RSxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFeEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFdEYsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDcEYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxD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