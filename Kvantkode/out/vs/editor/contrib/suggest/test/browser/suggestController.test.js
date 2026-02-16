/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { IEditorWorkerService } from '../../../../common/services/editorWorker.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { SuggestController } from '../../browser/suggestController.js';
import { ISuggestMemoryService } from '../../browser/suggestMemory.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MockKeybindingService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { InMemoryStorageService, IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { DeleteLinesAction } from '../../../linesOperations/browser/linesOperations.js';
suite('SuggestController', function () {
    const disposables = new DisposableStore();
    let controller;
    let editor;
    let model;
    const languageFeaturesService = new LanguageFeaturesService();
    teardown(function () {
        disposables.clear();
    });
    // ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        const serviceCollection = new ServiceCollection([ILanguageFeaturesService, languageFeaturesService], [ITelemetryService, NullTelemetryService], [ILogService, new NullLogService()], [IStorageService, disposables.add(new InMemoryStorageService())], [IKeybindingService, new MockKeybindingService()], [
            IEditorWorkerService,
            new (class extends mock() {
                computeWordRanges() {
                    return Promise.resolve({});
                }
            })(),
        ], [
            ISuggestMemoryService,
            new (class extends mock() {
                memorize() { }
                select() {
                    return 0;
                }
            })(),
        ], [
            IMenuService,
            new (class extends mock() {
                createMenu() {
                    return new (class extends mock() {
                        constructor() {
                            super(...arguments);
                            this.onDidChange = Event.None;
                        }
                        dispose() { }
                    })();
                }
            })(),
        ], [ILabelService, new (class extends mock() {
            })()], [IWorkspaceContextService, new (class extends mock() {
            })()], [
            IEnvironmentService,
            new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.isBuilt = true;
                    this.isExtensionDevelopment = false;
                }
            })(),
        ]);
        model = disposables.add(createTextModel('', undefined, undefined, URI.from({ scheme: 'test-ctrl', path: '/path.tst' })));
        editor = disposables.add(createTestCodeEditor(model, { serviceCollection }));
        editor.registerAndInstantiateContribution(SnippetController2.ID, SnippetController2);
        controller = editor.registerAndInstantiateContribution(SuggestController.ID, SuggestController);
    });
    test('postfix completion reports incorrect position #86984', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'let ${1:name} = foo$0',
                            insertTextRules: 4 /* CompletionItemInsertTextRule.InsertAsSnippet */,
                            range: { startLineNumber: 1, startColumn: 9, endLineNumber: 1, endColumn: 11 },
                            additionalTextEdits: [
                                {
                                    text: '',
                                    range: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 9 },
                                },
                            ],
                        },
                    ],
                };
            },
        }));
        editor.setValue('    foo.le');
        editor.setSelection(new Selection(1, 11, 1, 11));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        assert.strictEqual(editor.getValue(), '    let name = foo');
    });
    test('use additionalTextEdits sync when possible', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos),
                            additionalTextEdits: [
                                {
                                    text: 'I came sync',
                                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                                },
                            ],
                        },
                    ],
                };
            },
            async resolveCompletionItem(item) {
                return item;
            },
        }));
        editor.setValue('hello\nhallo');
        editor.setSelection(new Selection(2, 6, 2, 6));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'I came synchello\nhallohello');
    });
    test('resolve additionalTextEdits async when needed', async function () {
        let resolveCallCount = 0;
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos),
                        },
                    ],
                };
            },
            async resolveCompletionItem(item) {
                resolveCallCount += 1;
                await timeout(10);
                item.additionalTextEdits = [
                    {
                        text: 'I came late',
                        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    },
                ];
                return item;
            },
        }));
        editor.setValue('hello\nhallo');
        editor.setSelection(new Selection(2, 6, 2, 6));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'hello\nhallohello');
        assert.strictEqual(resolveCallCount, 1);
        // additional edits happened after a litte wait
        await timeout(20);
        assert.strictEqual(editor.getValue(), 'I came latehello\nhallohello');
        // single undo stop
        editor.getModel()?.undo();
        assert.strictEqual(editor.getValue(), 'hello\nhallo');
    });
    test('resolve additionalTextEdits async when needed (typing)', async function () {
        let resolveCallCount = 0;
        let resolve = () => { };
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos),
                        },
                    ],
                };
            },
            async resolveCompletionItem(item) {
                resolveCallCount += 1;
                await new Promise((_resolve) => (resolve = _resolve));
                item.additionalTextEdits = [
                    {
                        text: 'I came late',
                        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    },
                ];
                return item;
            },
        }));
        editor.setValue('hello\nhallo');
        editor.setSelection(new Selection(2, 6, 2, 6));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'hello\nhallohello');
        assert.strictEqual(resolveCallCount, 1);
        // additional edits happened after a litte wait
        assert.ok(editor.getSelection()?.equalsSelection(new Selection(2, 11, 2, 11)));
        editor.trigger('test', 'type', { text: 'TYPING' });
        assert.strictEqual(editor.getValue(), 'hello\nhallohelloTYPING');
        resolve();
        await timeout(10);
        assert.strictEqual(editor.getValue(), 'I came latehello\nhallohelloTYPING');
        assert.ok(editor.getSelection()?.equalsSelection(new Selection(2, 17, 2, 17)));
    });
    // additional edit come late and are AFTER the selection -> cancel
    test('resolve additionalTextEdits async when needed (simple conflict)', async function () {
        let resolveCallCount = 0;
        let resolve = () => { };
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos),
                        },
                    ],
                };
            },
            async resolveCompletionItem(item) {
                resolveCallCount += 1;
                await new Promise((_resolve) => (resolve = _resolve));
                item.additionalTextEdits = [
                    {
                        text: 'I came late',
                        range: { startLineNumber: 1, startColumn: 6, endLineNumber: 1, endColumn: 6 },
                    },
                ];
                return item;
            },
        }));
        editor.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'hello');
        assert.strictEqual(resolveCallCount, 1);
        resolve();
        await timeout(10);
        assert.strictEqual(editor.getValue(), 'hello');
    });
    // additional edit come late and are AFTER the position at which the user typed -> cancelled
    test('resolve additionalTextEdits async when needed (conflict)', async function () {
        let resolveCallCount = 0;
        let resolve = () => { };
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos),
                        },
                    ],
                };
            },
            async resolveCompletionItem(item) {
                resolveCallCount += 1;
                await new Promise((_resolve) => (resolve = _resolve));
                item.additionalTextEdits = [
                    {
                        text: 'I came late',
                        range: { startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 2 },
                    },
                ];
                return item;
            },
        }));
        editor.setValue('hello\nhallo');
        editor.setSelection(new Selection(2, 6, 2, 6));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(false, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'hello\nhallohello');
        assert.strictEqual(resolveCallCount, 1);
        // additional edits happened after a litte wait
        editor.setSelection(new Selection(1, 1, 1, 1));
        editor.trigger('test', 'type', { text: 'TYPING' });
        assert.strictEqual(editor.getValue(), 'TYPINGhello\nhallohello');
        resolve();
        await timeout(10);
        assert.strictEqual(editor.getValue(), 'TYPINGhello\nhallohello');
        assert.ok(editor.getSelection()?.equalsSelection(new Selection(1, 7, 1, 7)));
    });
    test('resolve additionalTextEdits async when needed (cancel)', async function () {
        const resolve = [];
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hello',
                            range: Range.fromPositions(pos),
                        },
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'let',
                            insertText: 'hallo',
                            range: Range.fromPositions(pos),
                        },
                    ],
                };
            },
            async resolveCompletionItem(item) {
                await new Promise((_resolve) => resolve.push(_resolve));
                item.additionalTextEdits = [
                    {
                        text: 'additionalTextEdits',
                        range: { startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 2 },
                    },
                ];
                return item;
            },
        }));
        editor.setValue('abc');
        editor.setSelection(new Selection(1, 1, 1, 1));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(true, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'helloabc');
        // next
        controller.acceptNextSuggestion();
        // resolve additional edits (MUST be cancelled)
        resolve.forEach((fn) => fn);
        resolve.length = 0;
        await timeout(10);
        // next suggestion used
        assert.strictEqual(editor.getValue(), 'halloabc');
    });
    test('Completion edits are applied inconsistently when additionalTextEdits and textEdit start at the same offset #143888', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'MyClassName',
                            insertText: 'MyClassName',
                            range: Range.fromPositions(pos),
                            additionalTextEdits: [
                                {
                                    range: Range.fromPositions(pos),
                                    text: 'import "my_class.txt";\n',
                                },
                            ],
                        },
                    ],
                };
            },
        }));
        editor.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        // trigger
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        //
        const p2 = Event.toPromise(controller.model.onDidCancel);
        controller.acceptSelectedSuggestion(true, false);
        await p2;
        // insertText happens sync!
        assert.strictEqual(editor.getValue(), 'import "my_class.txt";\nMyClassName');
    });
    test('Pressing enter on autocomplete should always apply the selected dropdown completion, not a different, hidden one #161883', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                const word = doc.getWordUntilPosition(pos);
                const range = new Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn);
                return {
                    suggestions: [
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'filterBankSize',
                            insertText: 'filterBankSize',
                            sortText: 'a',
                            range,
                        },
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'filter',
                            insertText: 'filter',
                            sortText: 'b',
                            range,
                        },
                    ],
                };
            },
        }));
        editor.setValue('filte');
        editor.setSelection(new Selection(1, 6, 1, 6));
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        const { completionModel } = await p1;
        assert.strictEqual(completionModel.items.length, 2);
        const [first, second] = completionModel.items;
        assert.strictEqual(first.textLabel, 'filterBankSize');
        assert.strictEqual(second.textLabel, 'filter');
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 6, 1, 6));
        editor.trigger('keyboard', 'type', { text: 'r' }); // now filter "overtakes" filterBankSize because it is fully matched
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 7, 1, 7));
        controller.acceptSelectedSuggestion(false, false);
        assert.strictEqual(editor.getValue(), 'filter');
    });
    test('Fast autocomple typing selects the previous autocomplete suggestion, #71795', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                const word = doc.getWordUntilPosition(pos);
                const range = new Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn);
                return {
                    suggestions: [
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'false',
                            insertText: 'false',
                            range,
                        },
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'float',
                            insertText: 'float',
                            range,
                        },
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'for',
                            insertText: 'for',
                            range,
                        },
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'foreach',
                            insertText: 'foreach',
                            range,
                        },
                    ],
                };
            },
        }));
        editor.setValue('f');
        editor.setSelection(new Selection(1, 2, 1, 2));
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        const { completionModel } = await p1;
        assert.strictEqual(completionModel.items.length, 4);
        const [first, second, third, fourth] = completionModel.items;
        assert.strictEqual(first.textLabel, 'false');
        assert.strictEqual(second.textLabel, 'float');
        assert.strictEqual(third.textLabel, 'for');
        assert.strictEqual(fourth.textLabel, 'foreach');
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 2, 1, 2));
        editor.trigger('keyboard', 'type', { text: 'o' }); // filters`false` and `float`
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 3, 1, 3));
        controller.acceptSelectedSuggestion(false, false);
        assert.strictEqual(editor.getValue(), 'for');
    });
    test.skip('Suggest widget gets orphaned in editor #187779', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                const word = doc.getLineContent(pos.lineNumber);
                const range = new Range(pos.lineNumber, 1, pos.lineNumber, pos.column);
                return {
                    suggestions: [
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: word,
                            insertText: word,
                            range,
                        },
                    ],
                };
            },
        }));
        editor.setValue(`console.log(example.)\nconsole.log(EXAMPLE.not)`);
        editor.setSelection(new Selection(1, 21, 1, 21));
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        await p1;
        const p2 = Event.toPromise(controller.model.onDidCancel);
        new DeleteLinesAction().run(null, editor);
        await p2;
    });
    test('Ranges where additionalTextEdits are applied are not appropriate when characters are typed #177591', async function () {
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 27 /* CompletionItemKind.Snippet */,
                            label: 'aaa',
                            insertText: 'aaa',
                            range: Range.fromPositions(pos),
                            additionalTextEdits: [
                                {
                                    range: Range.fromPositions(pos.delta(0, 10)),
                                    text: 'aaa',
                                },
                            ],
                        },
                    ],
                };
            },
        }));
        {
            // PART1 - no typing
            editor.setValue(`123456789123456789`);
            editor.setSelection(new Selection(1, 1, 1, 1));
            const p1 = Event.toPromise(controller.model.onDidSuggest);
            controller.triggerSuggest();
            const e = await p1;
            assert.strictEqual(e.completionModel.items.length, 1);
            assert.strictEqual(e.completionModel.items[0].textLabel, 'aaa');
            controller.acceptSelectedSuggestion(false, false);
            assert.strictEqual(editor.getValue(), 'aaa1234567891aaa23456789');
        }
        {
            // PART2 - typing
            editor.setValue(`123456789123456789`);
            editor.setSelection(new Selection(1, 1, 1, 1));
            const p1 = Event.toPromise(controller.model.onDidSuggest);
            controller.triggerSuggest();
            const e = await p1;
            assert.strictEqual(e.completionModel.items.length, 1);
            assert.strictEqual(e.completionModel.items[0].textLabel, 'aaa');
            editor.trigger('keyboard', 'type', { text: 'aa' });
            controller.acceptSelectedSuggestion(false, false);
            assert.strictEqual(editor.getValue(), 'aaa1234567891aaa23456789');
        }
    });
    test.skip('[Bug] "No suggestions" persists while typing if the completion helper is set to return an empty list for empty content#3557', async function () {
        let requestCount = 0;
        disposables.add(languageFeaturesService.completionProvider.register({ scheme: 'test-ctrl' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                requestCount += 1;
                if (requestCount === 1) {
                    return undefined;
                }
                return {
                    suggestions: [
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'foo',
                            insertText: 'foo',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column),
                        },
                    ],
                };
            },
        }));
        const p1 = Event.toPromise(controller.model.onDidSuggest);
        controller.triggerSuggest();
        const e1 = await p1;
        assert.strictEqual(e1.completionModel.items.length, 0);
        assert.strictEqual(requestCount, 1);
        const p2 = Event.toPromise(controller.model.onDidSuggest);
        editor.trigger('keyboard', 'type', { text: 'f' });
        const e2 = await p2;
        assert.strictEqual(e2.completionModel.items.length, 1);
        assert.strictEqual(requestCount, 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvc3VnZ2VzdENvbnRyb2xsZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9B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