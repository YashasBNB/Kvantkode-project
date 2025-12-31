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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvdGVzdC9icm93c2VyL2lubGluZUNoYXRDb250cm9sbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUUzRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUMxSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFB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