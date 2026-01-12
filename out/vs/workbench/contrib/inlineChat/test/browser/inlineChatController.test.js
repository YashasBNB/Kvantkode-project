/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { equals } from '../../../../../base/common/arrays.js';
import { DeferredPromise, raceCancellation, timeout } from '../../../../../base/common/async.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { IDiffProviderFactoryService } from '../../../../../editor/browser/widget/diffEditor/diffProviderFactoryService.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { TestDiffProviderFactoryService } from '../../../../../editor/test/browser/diff/testDiffProviderFactoryService.js';
import { instantiateTestCodeEditor } from '../../../../../editor/test/browser/testCodeEditor.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IEditorProgressService, } from '../../../../../platform/progress/common/progress.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IAccessibleViewService } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { IChatAccessibilityService, IChatWidgetService, } from '../../../chat/browser/chat.js';
import { ChatAgentService, IChatAgentNameService, IChatAgentService, } from '../../../chat/common/chatAgents.js';
import { InlineChatController1 } from '../../browser/inlineChatController.js';
import { CTX_INLINE_CHAT_RESPONSE_TYPE, } from '../../common/inlineChat.js';
import { TestViewsService, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
import { IExtensionService, nullExtensionDescription, } from '../../../../services/extensions/common/extensions.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatService } from '../../../chat/common/chatServiceImpl.js';
import { IChatVariablesService } from '../../../chat/common/chatVariables.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { TestContextService, TestExtensionService, } from '../../../../test/common/workbenchTestServices.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatSlashCommandService, IChatSlashCommandService, } from '../../../chat/common/chatSlashCommands.js';
import { ChatWidgetService } from '../../../chat/browser/chatWidget.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService, } from '../../../chat/common/chatWidgetHistoryService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { ChatVariablesService } from '../../../chat/browser/chatVariables.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { TestCommandService } from '../../../../../editor/test/browser/editorTestServices.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { RerunAction } from '../../browser/inlineChatActions.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { assertType } from '../../../../../base/common/types.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { IInlineChatSessionService } from '../../browser/inlineChatSessionService.js';
import { InlineChatSessionServiceImpl } from '../../browser/inlineChatSessionServiceImpl.js';
import { TestWorkerService } from './testWorkerService.js';
import { ILanguageModelsService, LanguageModelsService, } from '../../../chat/common/languageModels.js';
import { IChatEditingService, } from '../../../chat/common/chatEditingService.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TextModelResolverService } from '../../../../services/textmodelResolver/common/textModelResolverService.js';
import { ChatInputBoxContentProvider } from '../../../chat/browser/chatEdinputInputContentProvider.js';
import { constObservable } from '../../../../../base/common/observable.js';
import { ILanguageModelToolsService } from '../../../chat/common/languageModelToolsService.js';
import { MockLanguageModelToolsService } from '../../../chat/test/common/mockLanguageModelToolsService.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
suite('InlineChatController', function () {
    const agentData = {
        extensionId: nullExtensionDescription.identifier,
        publisherDisplayName: '',
        extensionDisplayName: '',
        extensionPublisherId: '',
        // id: 'testEditorAgent',
        name: 'testEditorAgent',
        isDefault: true,
        locations: [ChatAgentLocation.Editor],
        metadata: {},
        slashCommands: [],
        disambiguation: [],
    };
    class TestController extends InlineChatController1 {
        constructor() {
            super(...arguments);
            this.onDidChangeState = this._onDidEnterState.event;
            this.states = [];
        }
        static { this.INIT_SEQUENCE = [
            "CREATE_SESSION" /* State.CREATE_SESSION */,
            "INIT_UI" /* State.INIT_UI */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]; }
        static { this.INIT_SEQUENCE_AUTO_SEND = [
            ...this.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]; }
        awaitStates(states) {
            const actual = [];
            return new Promise((resolve, reject) => {
                const d = this.onDidChangeState((state) => {
                    actual.push(state);
                    if (equals(states, actual)) {
                        d.dispose();
                        resolve(undefined);
                    }
                });
                setTimeout(() => {
                    d.dispose();
                    resolve(`[${states.join(',')}] <> [${actual.join(',')}]`);
                }, 1000);
            });
        }
    }
    const store = new DisposableStore();
    let configurationService;
    let editor;
    let model;
    let ctrl;
    let contextKeyService;
    let chatService;
    let chatAgentService;
    let inlineChatSessionService;
    let instaService;
    let chatWidget;
    setup(function () {
        const serviceCollection = new ServiceCollection([IConfigurationService, new TestConfigurationService()], [IChatVariablesService, new SyncDescriptor(ChatVariablesService)], [ILogService, new NullLogService()], [ITelemetryService, NullTelemetryService], [IHoverService, NullHoverService], [IExtensionService, new TestExtensionService()], [IContextKeyService, new MockContextKeyService()], [
            IViewsService,
            new (class extends TestViewsService {
                async openView(id, focus) {
                    return { widget: chatWidget ?? null };
                }
            })(),
        ], [IWorkspaceContextService, new TestContextService()], [IChatWidgetHistoryService, new SyncDescriptor(ChatWidgetHistoryService)], [IChatWidgetService, new SyncDescriptor(ChatWidgetService)], [IChatSlashCommandService, new SyncDescriptor(ChatSlashCommandService)], [IChatService, new SyncDescriptor(ChatService)], [
            IChatAgentNameService,
            new (class extends mock() {
                getAgentNameRestriction(chatAgentData) {
                    return false;
                }
            })(),
        ], [IEditorWorkerService, new SyncDescriptor(TestWorkerService)], [IContextKeyService, contextKeyService], [IChatAgentService, new SyncDescriptor(ChatAgentService)], [IDiffProviderFactoryService, new SyncDescriptor(TestDiffProviderFactoryService)], [IInlineChatSessionService, new SyncDescriptor(InlineChatSessionServiceImpl)], [ICommandService, new SyncDescriptor(TestCommandService)], [
            IChatEditingService,
            new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.editingSessionsObs = constObservable([]);
                }
            })(),
        ], [
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
        ], [IConfigurationService, configurationService], [
            IViewDescriptorService,
            new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeLocation = Event.None;
                }
            })(),
        ], [
            INotebookEditorService,
            new (class extends mock() {
                listNotebookEditors() {
                    return [];
                }
            })(),
        ], [IWorkbenchAssignmentService, new NullWorkbenchAssignmentService()], [ILanguageModelsService, new SyncDescriptor(LanguageModelsService)], [ITextModelService, new SyncDescriptor(TextModelResolverService)], [ILanguageModelToolsService, new SyncDescriptor(MockLanguageModelToolsService)]);
        instaService = store.add(store.add(workbenchInstantiationService(undefined, store)).createChild(serviceCollection));
        configurationService = instaService.get(IConfigurationService);
        configurationService.setUserConfiguration('chat', {
            editor: { fontSize: 14, fontFamily: 'default' },
        });
        configurationService.setUserConfiguration('editor', {});
        contextKeyService = instaService.get(IContextKeyService);
        chatService = instaService.get(IChatService);
        chatAgentService = instaService.get(IChatAgentService);
        inlineChatSessionService = store.add(instaService.get(IInlineChatSessionService));
        store.add(instaService.get(ILanguageModelsService));
        store.add(instaService.createInstance(ChatInputBoxContentProvider));
        model = store.add(instaService.get(IModelService).createModel('Hello\nWorld\nHello Again\nHello World\n', null));
        model.setEOL(0 /* EndOfLineSequence.LF */);
        editor = store.add(instantiateTestCodeEditor(instaService, model));
        store.add(chatAgentService.registerDynamicAgent({ id: 'testEditorAgent', ...agentData }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [
                        {
                            range: new Range(1, 1, 1, 1),
                            text: request.message,
                        },
                    ],
                });
                return {};
            },
        }));
    });
    teardown(function () {
        store.clear();
        ctrl?.dispose();
    });
    // TODO@jrieken re-enable, looks like List/ChatWidget is leaking
    // ensureNoDisposablesAreLeakedInTestSuite();
    test('creation, not showing anything', function () {
        ctrl = instaService.createInstance(TestController, editor);
        assert.ok(ctrl);
        assert.strictEqual(ctrl.getWidgetPosition(), undefined);
    });
    test('run (show/hide)', async function () {
        ctrl = instaService.createInstance(TestController, editor);
        const actualStates = ctrl.awaitStates(TestController.INIT_SEQUENCE_AUTO_SEND);
        const run = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await actualStates, undefined);
        assert.ok(ctrl.getWidgetPosition() !== undefined);
        await ctrl.cancelSession();
        await run;
        assert.ok(ctrl.getWidgetPosition() === undefined);
    });
    test('wholeRange does not expand to whole lines, editor selection default', async function () {
        editor.setSelection(new Range(1, 1, 1, 3));
        ctrl = instaService.createInstance(TestController, editor);
        ctrl.run({});
        await Event.toPromise(Event.filter(ctrl.onDidChangeState, (e) => e === "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */));
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 1, 3));
        await ctrl.cancelSession();
    });
    test('typing outside of wholeRange finishes session', async function () {
        configurationService.setUserConfiguration("inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */, true);
        ctrl = instaService.createInstance(TestController, editor);
        const actualStates = ctrl.awaitStates(TestController.INIT_SEQUENCE_AUTO_SEND);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await actualStates, undefined);
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 1, 11 /* line length */));
        editor.setSelection(new Range(2, 1, 2, 1));
        editor.trigger('test', 'type', { text: 'a' });
        assert.strictEqual(await ctrl.awaitStates(["DONE" /* State.ACCEPT */]), undefined);
        await r;
    });
    test("'whole range' isn't updated for edits outside whole range #4346", async function () {
        editor.setSelection(new Range(3, 1, 3, 3));
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: editor.getModel().uri,
                    edits: [
                        {
                            range: new Range(1, 1, 1, 1), // EDIT happens outside of whole range
                            text: `${request.message}\n${request.message}`,
                        },
                    ],
                });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates(TestController.INIT_SEQUENCE);
        const r = ctrl.run({ message: 'GENGEN', autoSend: false });
        assert.strictEqual(await p, undefined);
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(3, 1, 3, 3)); // initial
        ctrl.chatWidget.setInput('GENGEN');
        ctrl.chatWidget.acceptInput();
        assert.strictEqual(await ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]), undefined);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 4, 3));
        await ctrl.cancelSession();
        await r;
    });
    test('Stuck inline chat widget #211', async function () {
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                return new Promise(() => { });
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        ctrl.acceptSession();
        await r;
        assert.strictEqual(ctrl.getWidgetPosition(), undefined);
    });
    test("[Bug] Inline Chat's streaming pushed broken iterations to the undo stack #2403", async function () {
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: 'hEllo1\n' }],
                });
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(2, 1, 2, 1), text: 'hEllo2\n' }],
                });
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1000, 1), text: 'Hello1\nHello2\n' }],
                });
                return {};
            },
        }));
        const valueThen = editor.getModel().getValue();
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([
            ...TestController.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        ctrl.acceptSession();
        await r;
        assert.strictEqual(editor.getModel().getValue(), 'Hello1\nHello2\n');
        editor.getModel().undo();
        assert.strictEqual(editor.getModel().getValue(), valueThen);
    });
    test.skip('UI is streaming edits minutes after the response is finished #3345', async function () {
        return runWithFakedTimers({ maxTaskCount: Number.MAX_SAFE_INTEGER }, async () => {
            store.add(chatAgentService.registerDynamicAgent({
                id: 'testEditorAgent2',
                ...agentData,
            }, {
                async invoke(request, progress, history, token) {
                    const text = '${CSI}#a\n${CSI}#b\n${CSI}#c\n';
                    await timeout(10);
                    progress({
                        kind: 'textEdit',
                        uri: model.uri,
                        edits: [{ range: new Range(1, 1, 1, 1), text: text }],
                    });
                    await timeout(10);
                    progress({
                        kind: 'textEdit',
                        uri: model.uri,
                        edits: [{ range: new Range(1, 1, 1, 1), text: text.repeat(1000) + 'DONE' }],
                    });
                    throw new Error('Too long');
                },
            }));
            // let modelChangeCounter = 0;
            // store.add(editor.getModel().onDidChangeContent(() => { modelChangeCounter++; }));
            ctrl = instaService.createInstance(TestController, editor);
            const p = ctrl.awaitStates([
                ...TestController.INIT_SEQUENCE,
                "SHOW_REQUEST" /* State.SHOW_REQUEST */,
                "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
            ]);
            const r = ctrl.run({ message: 'Hello', autoSend: true });
            assert.strictEqual(await p, undefined);
            // assert.ok(modelChangeCounter > 0, modelChangeCounter.toString()); // some changes have been made
            // const modelChangeCounterNow = modelChangeCounter;
            assert.ok(!editor.getModel().getValue().includes('DONE'));
            await timeout(10);
            // assert.strictEqual(modelChangeCounterNow, modelChangeCounter);
            assert.ok(!editor.getModel().getValue().includes('DONE'));
            await ctrl.cancelSession();
            await r;
        });
    });
    test("escape doesn't remove code added from inline editor chat #3523 1/2", async function () {
        // NO manual edits -> cancel
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([
            ...TestController.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]);
        const r = ctrl.run({ message: 'GENERATED', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.ok(model.getValue().includes('GENERATED'));
        ctrl.cancelSession();
        await r;
        assert.ok(!model.getValue().includes('GENERATED'));
    });
    test("escape doesn't remove code added from inline editor chat #3523, 2/2", async function () {
        // manual edits -> finish
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([
            ...TestController.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]);
        const r = ctrl.run({ message: 'GENERATED', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.ok(model.getValue().includes('GENERATED'));
        editor.executeEdits('test', [
            EditOperation.insert(model.getFullModelRange().getEndPosition(), 'MANUAL'),
        ]);
        ctrl.acceptSession();
        await r;
        assert.ok(model.getValue().includes('GENERATED'));
        assert.ok(model.getValue().includes('MANUAL'));
    });
    test('re-run should discard pending edits', async function () {
        let count = 1;
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: request.message + count++ }],
                });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const rerun = new RerunAction();
        model.setValue('');
        const p = ctrl.awaitStates([
            ...TestController.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]);
        const r = ctrl.run({ message: 'PROMPT_', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'PROMPT_1');
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'PROMPT_2');
        ctrl.acceptSession();
        await r;
    });
    test('Retry undoes all changes, not just those from the request#5736', async function () {
        const text = ['eins-', 'zwei-', 'drei-'];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }],
                });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const rerun = new RerunAction();
        model.setValue('');
        // REQUEST 1
        const p = ctrl.awaitStates([
            ...TestController.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]);
        const r = ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins-');
        // REQUEST 2
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.chatWidget.setInput('1');
        await ctrl.chatWidget.acceptInput();
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'zwei-eins-');
        // REQUEST 2 - RERUN
        const p3 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p3, undefined);
        assert.strictEqual(model.getValue(), 'drei-eins-');
        ctrl.acceptSession();
        await r;
    });
    test('moving inline chat to another model undoes changes', async function () {
        const text = ['eins\n', 'zwei\n'];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }],
                });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([
            ...TestController.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]);
        ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins\nHello\nWorld\nHello Again\nHello World\n');
        const targetModel = chatService.startSession(ChatAgentLocation.Editor, CancellationToken.None);
        store.add(targetModel);
        chatWidget = new (class extends mock() {
            get viewModel() {
                return { model: targetModel };
            }
            focusLastMessage() { }
        })();
        const r = ctrl.joinCurrentRun();
        await ctrl.viewInChat();
        assert.strictEqual(model.getValue(), 'Hello\nWorld\nHello Again\nHello World\n');
        await r;
    });
    test('moving inline chat to another model undoes changes (2 requests)', async function () {
        const text = ['eins\n', 'zwei\n'];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }],
                });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([
            ...TestController.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]);
        ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins\nHello\nWorld\nHello Again\nHello World\n');
        // REQUEST 2
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.chatWidget.setInput('1');
        await ctrl.chatWidget.acceptInput();
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'zwei\neins\nHello\nWorld\nHello Again\nHello World\n');
        const targetModel = chatService.startSession(ChatAgentLocation.Editor, CancellationToken.None);
        store.add(targetModel);
        chatWidget = new (class extends mock() {
            get viewModel() {
                return { model: targetModel };
            }
            focusLastMessage() { }
        })();
        const r = ctrl.joinCurrentRun();
        await ctrl.viewInChat();
        assert.strictEqual(model.getValue(), 'Hello\nWorld\nHello Again\nHello World\n');
        await r;
    });
    test('Clicking "re-run without /doc" while a request is in progress closes the widget #5997', async function () {
        model.setValue('');
        let count = 0;
        const commandDetection = [];
        const onDidInvoke = new Emitter();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                queueMicrotask(() => onDidInvoke.fire());
                commandDetection.push(request.enableCommandDetection);
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: request.message + count++ }],
                });
                if (count === 1) {
                    // FIRST call waits for cancellation
                    await raceCancellation(new Promise(() => { }), token);
                }
                else {
                    await timeout(10);
                }
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        // const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, State.SHOW_REQUEST]);
        const p = Event.toPromise(onDidInvoke.event);
        ctrl.run({ message: 'Hello-', autoSend: true });
        await p;
        // assert.strictEqual(await p, undefined);
        // resend pending request without command detection
        const request = ctrl.chatWidget.viewModel?.model.getRequests().at(-1);
        assertType(request);
        const p2 = Event.toPromise(onDidInvoke.event);
        const p3 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.resendRequest(request, {
            noCommandDetection: true,
            attempt: request.attempt + 1,
            location: ChatAgentLocation.Editor,
        });
        await p2;
        assert.strictEqual(await p3, undefined);
        assert.deepStrictEqual(commandDetection, [true, false]);
        assert.strictEqual(model.getValue(), 'Hello-1');
    });
    test('Re-run without after request is done', async function () {
        model.setValue('');
        let count = 0;
        const commandDetection = [];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                commandDetection.push(request.enableCommandDetection);
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: request.message + count++ }],
                });
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([
            ...TestController.INIT_SEQUENCE,
            "SHOW_REQUEST" /* State.SHOW_REQUEST */,
            "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
        ]);
        ctrl.run({ message: 'Hello-', autoSend: true });
        assert.strictEqual(await p, undefined);
        // resend pending request without command detection
        const request = ctrl.chatWidget.viewModel?.model.getRequests().at(-1);
        assertType(request);
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.resendRequest(request, {
            noCommandDetection: true,
            attempt: request.attempt + 1,
            location: ChatAgentLocation.Editor,
        });
        assert.strictEqual(await p2, undefined);
        assert.deepStrictEqual(commandDetection, [true, false]);
        assert.strictEqual(model.getValue(), 'Hello-1');
    });
    test('Inline: Pressing Rerun request while the response streams breaks the response #5442', async function () {
        model.setValue('two\none\n');
        const attempts = [];
        const deferred = new DeferredPromise();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                attempts.push(request.attempt);
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: `TRY:${request.attempt}\n` }],
                });
                await raceCancellation(deferred.p, token);
                deferred.complete();
                await timeout(10);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello-', autoSend: true });
        assert.strictEqual(await p, undefined);
        await timeout(10);
        assert.deepStrictEqual(attempts, [0]);
        // RERUN (cancel, undo, redo)
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const rerun = new RerunAction();
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p2, undefined);
        assert.deepStrictEqual(attempts, [0, 1]);
        assert.strictEqual(model.getValue(), 'TRY:1\ntwo\none\n');
    });
    test('Stopping/cancelling a request should NOT undo its changes', async function () {
        model.setValue('World');
        const deferred = new DeferredPromise();
        let progress;
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, _progress, history, token) {
                progress = _progress;
                await deferred.p;
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello', autoSend: true });
        await timeout(10);
        assert.strictEqual(await p, undefined);
        assertType(progress);
        const modelChange = new Promise((resolve) => model.onDidChangeContent(() => resolve()));
        progress({
            kind: 'textEdit',
            uri: model.uri,
            edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello-Hello' }],
        });
        await modelChange;
        assert.strictEqual(model.getValue(), 'HelloWorld'); // first word has been streamed
        const p2 = ctrl.awaitStates(["WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.cancelCurrentRequestForSession(ctrl.chatWidget.viewModel.model.sessionId);
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'HelloWorld'); // CANCEL just stops the request and progressive typing but doesn't undo
    });
    test('Apply Edits from existing session w/ edits', async function () {
        model.setValue('');
        const newSession = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(newSession);
        await (await chatService.sendRequest(newSession.chatModel.sessionId, 'Existing', {
            location: ChatAgentLocation.Editor,
        }))?.responseCreatedPromise;
        assert.strictEqual(newSession.chatModel.requestInProgress, true);
        const response = newSession.chatModel.lastRequest?.response;
        assertType(response);
        await new Promise((resolve) => {
            if (response.isComplete) {
                resolve(undefined);
            }
            const d = response.onDidChange(() => {
                if (response.isComplete) {
                    d.dispose();
                    resolve(undefined);
                }
            });
        });
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE]);
        ctrl.run({ existingSession: newSession });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'Existing');
    });
    test('Undo on error (2 rounds)', async function () {
        return runWithFakedTimers({}, async () => {
            store.add(chatAgentService.registerDynamicAgent({ id: 'testEditorAgent', ...agentData }, {
                async invoke(request, progress, history, token) {
                    progress({
                        kind: 'textEdit',
                        uri: model.uri,
                        edits: [
                            {
                                range: new Range(1, 1, 1, 1),
                                text: request.message,
                            },
                        ],
                    });
                    if (request.message === 'two') {
                        await timeout(100); // give edit a chance
                        return {
                            errorDetails: { message: 'FAILED' },
                        };
                    }
                    return {};
                },
            }));
            model.setValue('');
            // ROUND 1
            ctrl = instaService.createInstance(TestController, editor);
            const p = ctrl.awaitStates([
                ...TestController.INIT_SEQUENCE,
                "SHOW_REQUEST" /* State.SHOW_REQUEST */,
                "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
            ]);
            ctrl.run({ autoSend: true, message: 'one' });
            assert.strictEqual(await p, undefined);
            assert.strictEqual(model.getValue(), 'one');
            // ROUND 2
            const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            const values = new Set();
            store.add(model.onDidChangeContent(() => values.add(model.getValue())));
            ctrl.chatWidget.acceptInput('two'); // WILL Trigger a failure
            assert.strictEqual(await p2, undefined);
            assert.strictEqual(model.getValue(), 'one'); // undone
            assert.ok(values.has('twoone')); // we had but the change got undone
        });
    });
    test('Inline chat "discard" button does not always appear if response is stopped #228030', async function () {
        model.setValue('World');
        const deferred = new DeferredPromise();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData,
        }, {
            async invoke(request, progress, history, token) {
                progress({
                    kind: 'textEdit',
                    uri: model.uri,
                    edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello-Hello' }],
                });
                await deferred.p;
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        const p2 = ctrl.awaitStates(["WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.cancelCurrentRequestForSession(ctrl.chatWidget.viewModel.model.sessionId);
        assert.strictEqual(await p2, undefined);
        const value = contextKeyService.getContextKeyValue(CTX_INLINE_CHAT_RESPONSE_TYPE.key);
        assert.notStrictEqual(value, "none" /* InlineChatResponseType.None */);
    });
    test("Restore doesn't edit on errored result", async function () {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model2 = store.add(instaService.get(IModelService).createModel('ABC', null));
            model.setValue('World');
            store.add(chatAgentService.registerDynamicAgent({
                id: 'testEditorAgent2',
                ...agentData,
            }, {
                async invoke(request, progress, history, token) {
                    progress({
                        kind: 'textEdit',
                        uri: model.uri,
                        edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello1' }],
                    });
                    await timeout(100);
                    progress({
                        kind: 'textEdit',
                        uri: model.uri,
                        edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello2' }],
                    });
                    await timeout(100);
                    progress({
                        kind: 'textEdit',
                        uri: model.uri,
                        edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello3' }],
                    });
                    await timeout(100);
                    return {
                        errorDetails: { message: 'FAILED' },
                    };
                },
            }));
            ctrl = instaService.createInstance(TestController, editor);
            // REQUEST 1
            const p = ctrl.awaitStates([
                ...TestController.INIT_SEQUENCE,
                "SHOW_REQUEST" /* State.SHOW_REQUEST */,
                "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */,
            ]);
            ctrl.run({ message: 'Hello', autoSend: true });
            assert.strictEqual(await p, undefined);
            const p2 = ctrl.awaitStates(["PAUSE" /* State.PAUSE */]);
            editor.setModel(model2);
            assert.strictEqual(await p2, undefined);
            const p3 = ctrl.awaitStates([...TestController.INIT_SEQUENCE]);
            editor.setModel(model);
            assert.strictEqual(await p3, undefined);
            assert.strictEqual(model.getValue(), 'World');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC90ZXN0L2Jyb3dzZXIvaW5saW5lQ2hhdENvbnRyb2xsZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRTNGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQzNILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBQzFILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFB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