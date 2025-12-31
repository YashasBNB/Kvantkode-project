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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3N1Z2dlc3RDb250cm9sbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sNENBQTRDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFB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