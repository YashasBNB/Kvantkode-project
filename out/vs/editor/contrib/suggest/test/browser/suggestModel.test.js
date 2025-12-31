var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { EditOperation } from '../../../../common/core/editOperation.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../../common/languages/nullTokenize.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { SuggestController } from '../../browser/suggestController.js';
import { ISuggestMemoryService } from '../../browser/suggestMemory.js';
import { LineContext, SuggestModel } from '../../browser/suggestModel.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createModelServices, createTextModel, instantiateTextModel, } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MockKeybindingService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { InMemoryStorageService, IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { getSnippetSuggestSupport, setSnippetSuggestSupport } from '../../browser/suggest.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
function createMockEditor(model, languageFeaturesService) {
    const storeService = new InMemoryStorageService();
    const editor = createTestCodeEditor(model, {
        serviceCollection: new ServiceCollection([ILanguageFeaturesService, languageFeaturesService], [ITelemetryService, NullTelemetryService], [IStorageService, storeService], [IKeybindingService, new MockKeybindingService()], [
            ISuggestMemoryService,
            new (class {
                memorize() { }
                select() {
                    return -1;
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
        ]),
    });
    const ctrl = editor.registerAndInstantiateContribution(SnippetController2.ID, SnippetController2);
    editor.hasWidgetFocus = () => true;
    editor.registerDisposable(ctrl);
    editor.registerDisposable(storeService);
    return editor;
}
suite('SuggestModel - Context', function () {
    const OUTER_LANGUAGE_ID = 'outerMode';
    const INNER_LANGUAGE_ID = 'innerMode';
    let OuterMode = class OuterMode extends Disposable {
        constructor(languageService, languageConfigurationService) {
            super();
            this.languageId = OUTER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {}));
            this._register(TokenizationRegistry.register(this.languageId, {
                getInitialState: () => NullState,
                tokenize: undefined,
                tokenizeEncoded: (line, hasEOL, state) => {
                    const tokensArr = [];
                    let prevLanguageId = undefined;
                    for (let i = 0; i < line.length; i++) {
                        const languageId = line.charAt(i) === 'x' ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID;
                        const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
                        if (prevLanguageId !== languageId) {
                            tokensArr.push(i);
                            tokensArr.push(encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */);
                        }
                        prevLanguageId = languageId;
                    }
                    const tokens = new Uint32Array(tokensArr.length);
                    for (let i = 0; i < tokens.length; i++) {
                        tokens[i] = tokensArr[i];
                    }
                    return new EncodedTokenizationResult(tokens, state);
                },
            }));
        }
    };
    OuterMode = __decorate([
        __param(0, ILanguageService),
        __param(1, ILanguageConfigurationService)
    ], OuterMode);
    let InnerMode = class InnerMode extends Disposable {
        constructor(languageService, languageConfigurationService) {
            super();
            this.languageId = INNER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {}));
        }
    };
    InnerMode = __decorate([
        __param(0, ILanguageService),
        __param(1, ILanguageConfigurationService)
    ], InnerMode);
    const assertAutoTrigger = (model, offset, expected, message) => {
        const pos = model.getPositionAt(offset);
        const editor = createMockEditor(model, new LanguageFeaturesService());
        editor.setPosition(pos);
        assert.strictEqual(LineContext.shouldAutoTrigger(editor), expected, message);
        editor.dispose();
    };
    let disposables;
    setup(() => {
        disposables = new DisposableStore();
    });
    teardown(function () {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Context - shouldAutoTrigger', function () {
        const model = createTextModel("Das Pferd frisst keinen Gurkensalat - Philipp Reis 1861.\nWer hat's erfunden?");
        disposables.add(model);
        assertAutoTrigger(model, 3, true, 'end of word, Das|');
        assertAutoTrigger(model, 4, false, 'no word Das |');
        assertAutoTrigger(model, 1, true, 'typing a single character before a word: D|as');
        assertAutoTrigger(model, 55, false, 'number, 1861|');
        model.dispose();
    });
    test('shouldAutoTrigger at embedded language boundaries', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const outerMode = disposables.add(instantiationService.createInstance(OuterMode));
        disposables.add(instantiationService.createInstance(InnerMode));
        const model = disposables.add(instantiateTextModel(instantiationService, 'a<xx>a<x>', outerMode.languageId));
        assertAutoTrigger(model, 1, true, 'a|<x — should trigger at end of word');
        assertAutoTrigger(model, 2, false, 'a<|x — should NOT trigger at start of word');
        assertAutoTrigger(model, 3, true, 'a<x|x —  should trigger after typing a single character before a word');
        assertAutoTrigger(model, 4, true, 'a<xx|> — should trigger at boundary between languages');
        assertAutoTrigger(model, 5, false, 'a<xx>|a — should NOT trigger at start of word');
        assertAutoTrigger(model, 6, true, 'a<xx>a|< — should trigger at end of word');
        assertAutoTrigger(model, 8, true, 'a<xx>a<x|> — should trigger at end of word at boundary');
        disposables.dispose();
    });
});
suite('SuggestModel - TriggerAndCancelOracle', function () {
    function getDefaultSuggestRange(model, position) {
        const wordUntil = model.getWordUntilPosition(position);
        return new Range(position.lineNumber, wordUntil.startColumn, position.lineNumber, wordUntil.endColumn);
    }
    const alwaysEmptySupport = {
        _debugDisplayName: 'test',
        provideCompletionItems(doc, pos) {
            return {
                incomplete: false,
                suggestions: [],
            };
        },
    };
    const alwaysSomethingSupport = {
        _debugDisplayName: 'test',
        provideCompletionItems(doc, pos) {
            return {
                incomplete: false,
                suggestions: [
                    {
                        label: doc.getWordUntilPosition(pos).word,
                        kind: 9 /* CompletionItemKind.Property */,
                        insertText: 'foofoo',
                        range: getDefaultSuggestRange(doc, pos),
                    },
                ],
            };
        },
    };
    let disposables;
    let model;
    const languageFeaturesService = new LanguageFeaturesService();
    const registry = languageFeaturesService.completionProvider;
    setup(function () {
        disposables = new DisposableStore();
        model = createTextModel('abc def', undefined, undefined, URI.parse('test:somefile.ttt'));
        disposables.add(model);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function withOracle(callback) {
        return new Promise((resolve, reject) => {
            const editor = createMockEditor(model, languageFeaturesService);
            const oracle = editor.invokeWithinContext((accessor) => accessor.get(IInstantiationService).createInstance(SuggestModel, editor));
            disposables.add(oracle);
            disposables.add(editor);
            try {
                resolve(callback(oracle, editor));
            }
            catch (err) {
                reject(err);
            }
        });
    }
    function assertEvent(event, action, assert) {
        return new Promise((resolve, reject) => {
            const sub = event((e) => {
                sub.dispose();
                try {
                    resolve(assert(e));
                }
                catch (err) {
                    reject(err);
                }
            });
            try {
                action();
            }
            catch (err) {
                sub.dispose();
                reject(err);
            }
        });
    }
    test('events - cancel/trigger', function () {
        return withOracle((model) => {
            return Promise.all([
                assertEvent(model.onDidTrigger, function () {
                    model.trigger({ auto: true });
                }, function (event) {
                    assert.strictEqual(event.auto, true);
                    return assertEvent(model.onDidCancel, function () {
                        model.cancel();
                    }, function (event) {
                        assert.strictEqual(event.retrigger, false);
                    });
                }),
                assertEvent(model.onDidTrigger, function () {
                    model.trigger({ auto: true });
                }, function (event) {
                    assert.strictEqual(event.auto, true);
                }),
                assertEvent(model.onDidTrigger, function () {
                    model.trigger({ auto: false });
                }, function (event) {
                    assert.strictEqual(event.auto, false);
                }),
            ]);
        });
    });
    test('events - suggest/empty', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysEmptySupport));
        return withOracle((model) => {
            return Promise.all([
                assertEvent(model.onDidCancel, function () {
                    model.trigger({ auto: true });
                }, function (event) {
                    assert.strictEqual(event.retrigger, false);
                }),
                assertEvent(model.onDidSuggest, function () {
                    model.trigger({ auto: false });
                }, function (event) {
                    assert.strictEqual(event.triggerOptions.auto, false);
                    assert.strictEqual(event.isFrozen, false);
                    assert.strictEqual(event.completionModel.items.length, 0);
                }),
            ]);
        });
    });
    test('trigger - on type', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 4 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'd' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.provider, alwaysSomethingSupport);
            });
        });
    });
    test('#17400: Keep filtering suggestModel.ts after space', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [
                        {
                            label: 'My Table',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'My Table',
                            range: getDefaultSuggestRange(doc, pos),
                        },
                    ],
                };
            },
        }));
        model.setValue('');
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                // make sure completionModel starts here!
                model.trigger({ auto: true });
            }, (event) => {
                return assertEvent(model.onDidSuggest, () => {
                    editor.setPosition({ lineNumber: 1, column: 1 });
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'My' });
                }, (event) => {
                    assert.strictEqual(event.triggerOptions.auto, true);
                    assert.strictEqual(event.completionModel.items.length, 1);
                    const [first] = event.completionModel.items;
                    assert.strictEqual(first.completion.label, 'My Table');
                    return assertEvent(model.onDidSuggest, () => {
                        editor.setPosition({ lineNumber: 1, column: 3 });
                        editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
                    }, (event) => {
                        assert.strictEqual(event.triggerOptions.auto, true);
                        assert.strictEqual(event.completionModel.items.length, 1);
                        const [first] = event.completionModel.items;
                        assert.strictEqual(first.completion.label, 'My Table');
                    });
                });
            });
        });
    });
    test('#21484: Trigger character always force a new completion session', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [
                        {
                            label: 'foo.bar',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foo.bar',
                            range: Range.fromPositions(pos.with(undefined, 1), pos),
                        },
                    ],
                };
            },
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['.'],
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [
                        {
                            label: 'boom',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'boom',
                            range: Range.fromPositions(pos.delta(0, doc.getLineContent(pos.lineNumber)[pos.column - 2] === '.' ? 0 : -1), pos),
                        },
                    ],
                };
            },
        }));
        model.setValue('');
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 1 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'foo' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.completion.label, 'foo.bar');
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: '.' });
            }, (event) => {
                // SYNC
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.completion.label, 'foo.bar');
            });
            await assertEvent(model.onDidSuggest, () => {
                // nothing -> triggered by the trigger character typing (see above)
            }, (event) => {
                // ASYNC
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                const [first, second] = event.completionModel.items;
                assert.strictEqual(first.completion.label, 'foo.bar');
                assert.strictEqual(second.completion.label, 'boom');
            });
        });
    });
    test("Intellisense Completion doesn't respect space after equal sign (.html file), #29353 [1/2]", function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle((model, editor) => {
            editor.getModel().setValue('fo');
            editor.setPosition({ lineNumber: 1, column: 3 });
            return assertEvent(model.onDidSuggest, () => {
                model.trigger({ auto: false });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.isFrozen, false);
                assert.strictEqual(event.completionModel.items.length, 1);
                return assertEvent(model.onDidCancel, () => {
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: '+' });
                }, (event) => {
                    assert.strictEqual(event.retrigger, false);
                });
            });
        });
    });
    test("Intellisense Completion doesn't respect space after equal sign (.html file), #29353 [2/2]", function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle((model, editor) => {
            editor.getModel().setValue('fo');
            editor.setPosition({ lineNumber: 1, column: 3 });
            return assertEvent(model.onDidSuggest, () => {
                model.trigger({ auto: false });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.isFrozen, false);
                assert.strictEqual(event.completionModel.items.length, 1);
                return assertEvent(model.onDidCancel, () => {
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
                }, (event) => {
                    assert.strictEqual(event.retrigger, false);
                });
            });
        });
    });
    test('Incomplete suggestion results cause re-triggering when typing w/o further context, #28400 (1/2)', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [
                        {
                            label: 'foo',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foo',
                            range: Range.fromPositions(pos.with(undefined, 1), pos),
                        },
                    ],
                };
            },
        }));
        return withOracle((model, editor) => {
            editor.getModel().setValue('foo');
            editor.setPosition({ lineNumber: 1, column: 4 });
            return assertEvent(model.onDidSuggest, () => {
                model.trigger({ auto: false });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.completionModel.getIncompleteProvider().size, 1);
                assert.strictEqual(event.completionModel.items.length, 1);
                return assertEvent(model.onDidCancel, () => {
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: ';' });
                }, (event) => {
                    assert.strictEqual(event.retrigger, false);
                });
            });
        });
    });
    test('Incomplete suggestion results cause re-triggering when typing w/o further context, #28400 (2/2)', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [
                        {
                            label: 'foo;',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foo',
                            range: Range.fromPositions(pos.with(undefined, 1), pos),
                        },
                    ],
                };
            },
        }));
        return withOracle((model, editor) => {
            editor.getModel().setValue('foo');
            editor.setPosition({ lineNumber: 1, column: 4 });
            return assertEvent(model.onDidSuggest, () => {
                model.trigger({ auto: false });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.completionModel.getIncompleteProvider().size, 1);
                assert.strictEqual(event.completionModel.items.length, 1);
                return assertEvent(model.onDidSuggest, () => {
                    // while we cancel incrementally enriching the set of
                    // completions we still filter against those that we have
                    // until now
                    editor.trigger('keyboard', "type" /* Handler.Type */, { text: ';' });
                }, (event) => {
                    assert.strictEqual(event.triggerOptions.auto, false);
                    assert.strictEqual(event.completionModel.getIncompleteProvider().size, 1);
                    assert.strictEqual(event.completionModel.items.length, 1);
                });
            });
        });
    });
    test('Trigger character is provided in suggest context', function () {
        let triggerCharacter = '';
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['.'],
            provideCompletionItems(doc, pos, context) {
                assert.strictEqual(context.triggerKind, 1 /* CompletionTriggerKind.TriggerCharacter */);
                triggerCharacter = context.triggerCharacter;
                return {
                    incomplete: false,
                    suggestions: [
                        {
                            label: 'foo.bar',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foo.bar',
                            range: Range.fromPositions(pos.with(undefined, 1), pos),
                        },
                    ],
                };
            },
        }));
        model.setValue('');
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 1 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'foo.' });
            }, (event) => {
                assert.strictEqual(triggerCharacter, '.');
            });
        });
    });
    test('Mac press and hold accent character insertion does not update suggestions, #35269', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [
                        {
                            label: 'abc',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'abc',
                            range: Range.fromPositions(pos.with(undefined, 1), pos),
                        },
                        {
                            label: 'äbc',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'äbc',
                            range: Range.fromPositions(pos.with(undefined, 1), pos),
                        },
                    ],
                };
            },
        }));
        model.setValue('');
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 1 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'a' });
            }, (event) => {
                assert.strictEqual(event.completionModel.items.length, 1);
                assert.strictEqual(event.completionModel.items[0].completion.label, 'abc');
                return assertEvent(model.onDidSuggest, () => {
                    editor.executeEdits('test', [EditOperation.replace(new Range(1, 1, 1, 2), 'ä')]);
                }, (event) => {
                    // suggest model changed to äbc
                    assert.strictEqual(event.completionModel.items.length, 1);
                    assert.strictEqual(event.completionModel.items[0].completion.label, 'äbc');
                });
            });
        });
    });
    test('Backspace should not always cancel code completion, #36491', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 4 });
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'd' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.provider, alwaysSomethingSupport);
            });
            await assertEvent(model.onDidSuggest, () => {
                CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.provider, alwaysSomethingSupport);
            });
        });
    });
    test('Text changes for completion CodeAction are affected by the completion #39893', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [
                        {
                            label: 'bar',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'bar',
                            range: Range.fromPositions(pos.delta(0, -2), pos),
                            additionalTextEdits: [
                                {
                                    text: ', bar',
                                    range: {
                                        startLineNumber: 1,
                                        endLineNumber: 1,
                                        startColumn: 17,
                                        endColumn: 17,
                                    },
                                },
                            ],
                        },
                    ],
                };
            },
        }));
        model.setValue('ba; import { foo } from "./b"');
        return withOracle(async (sugget, editor) => {
            class TestCtrl extends SuggestController {
                _insertSuggestion_publicForTest(item, flags = 0) {
                    super._insertSuggestion(item, flags);
                }
            }
            const ctrl = editor.registerAndInstantiateContribution(TestCtrl.ID, TestCtrl);
            editor.registerAndInstantiateContribution(SnippetController2.ID, SnippetController2);
            await assertEvent(sugget.onDidSuggest, () => {
                editor.setPosition({ lineNumber: 1, column: 3 });
                sugget.trigger({ auto: false });
            }, (event) => {
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.completion.label, 'bar');
                ctrl._insertSuggestion_publicForTest({
                    item: first,
                    index: 0,
                    model: event.completionModel,
                });
            });
            assert.strictEqual(model.getValue(), 'bar; import { foo, bar } from "./b"');
        });
    });
    test('Completion unexpectedly triggers on second keypress of an edit group in a snippet #43523', function () {
        disposables.add(registry.register({ scheme: 'test' }, alwaysSomethingSupport));
        return withOracle((model, editor) => {
            return assertEvent(model.onDidSuggest, () => {
                editor.setValue('d');
                editor.setSelection(new Selection(1, 1, 1, 2));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'e' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                const [first] = event.completionModel.items;
                assert.strictEqual(first.provider, alwaysSomethingSupport);
            });
        });
    });
    test('Fails to render completion details #47988', function () {
        let disposeA = 0;
        let disposeB = 0;
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: true,
                    suggestions: [
                        {
                            kind: 23 /* CompletionItemKind.Folder */,
                            label: 'CompleteNot',
                            insertText: 'Incomplete',
                            sortText: 'a',
                            range: getDefaultSuggestRange(doc, pos),
                        },
                    ],
                    dispose() {
                        disposeA += 1;
                    },
                };
            },
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [
                        {
                            kind: 23 /* CompletionItemKind.Folder */,
                            label: 'Complete',
                            insertText: 'Complete',
                            sortText: 'z',
                            range: getDefaultSuggestRange(doc, pos),
                        },
                    ],
                    dispose() {
                        disposeB += 1;
                    },
                };
            },
            resolveCompletionItem(item) {
                return item;
            },
        }));
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'c' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(disposeA, 0);
                assert.strictEqual(disposeB, 0);
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'o' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                // clean up
                model.clear();
                assert.strictEqual(disposeA, 2); // provide got called two times!
                assert.strictEqual(disposeB, 1);
            });
        });
    });
    test('Trigger (full) completions when (incomplete) completions are already active #99504', function () {
        let countA = 0;
        let countB = 0;
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                countA += 1;
                return {
                    incomplete: false, // doesn't matter if incomplete or not
                    suggestions: [
                        {
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'Z aaa',
                            insertText: 'Z aaa',
                            range: new Range(1, 1, pos.lineNumber, pos.column),
                        },
                    ],
                };
            },
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                countB += 1;
                if (!doc.getWordUntilPosition(pos).word.startsWith('a')) {
                    return;
                }
                return {
                    incomplete: false,
                    suggestions: [
                        {
                            kind: 23 /* CompletionItemKind.Folder */,
                            label: 'aaa',
                            insertText: 'aaa',
                            range: getDefaultSuggestRange(doc, pos),
                        },
                    ],
                };
            },
        }));
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'Z' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'Z aaa');
            });
            await assertEvent(model.onDidSuggest, () => {
                // started another word: Z a|
                // item should be: Z aaa, aaa
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' a' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'Z aaa');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'aaa');
                assert.strictEqual(countA, 1); // should we keep the suggestions from the "active" provider?, Yes! See: #106573
                assert.strictEqual(countB, 2);
            });
        });
    });
    test('registerCompletionItemProvider with letters as trigger characters block other completion items to show up #127815', async function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'AAAA',
                            insertText: 'WordTriggerA',
                            range: new Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
                        },
                    ],
                };
            },
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['a', '.'],
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'AAAA',
                            insertText: 'AutoTriggerA',
                            range: new Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
                        },
                    ],
                };
            },
        }));
        return withOracle(async (model, editor) => {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: '.' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
            });
            editor.getModel().setValue('');
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'a' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
            });
        });
    });
    test('Unexpected suggest scoring #167242', async function () {
        disposables.add(registry.register('*', {
            // word-based
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                const word = doc.getWordUntilPosition(pos);
                return {
                    suggestions: [
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'pull',
                            insertText: 'pull',
                            range: new Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn),
                        },
                    ],
                };
            },
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            // JSON-based
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                return {
                    suggestions: [
                        {
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'git.pull',
                            insertText: 'git.pull',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column),
                        },
                    ],
                };
            },
        }));
        return withOracle(async function (model, editor) {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('gi');
                editor.setSelection(new Selection(1, 3, 1, 3));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 't' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'git.pull');
            });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: '.' });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'p' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 1);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'git.pull');
            });
        });
    });
    test('Completion list closes unexpectedly when typing a digit after a word separator #169390', function () {
        const requestCounts = [0, 0];
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos) {
                requestCounts[0] += 1;
                return {
                    suggestions: [
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'foo-20',
                            insertText: 'foo-20',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column),
                        },
                        {
                            kind: 18 /* CompletionItemKind.Text */,
                            label: 'foo-hello',
                            insertText: 'foo-hello',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column),
                        },
                    ],
                };
            },
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['2'],
            provideCompletionItems(doc, pos, ctx) {
                requestCounts[1] += 1;
                if (ctx.triggerKind !== 1 /* CompletionTriggerKind.TriggerCharacter */) {
                    return;
                }
                return {
                    suggestions: [
                        {
                            kind: 5 /* CompletionItemKind.Class */,
                            label: 'foo-210',
                            insertText: 'foo-210',
                            range: new Range(pos.lineNumber, 1, pos.lineNumber, pos.column),
                        },
                    ],
                };
            },
        }));
        return withOracle(async function (model, editor) {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('foo');
                editor.setSelection(new Selection(1, 4, 1, 4));
                model.trigger({ auto: false });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, false);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'foo-20');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'foo-hello');
            });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: '-' });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: '2' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'foo-20');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'foo-210');
                assert.deepStrictEqual(requestCounts, [1, 2]);
            });
        });
    });
    test('Set refilter-flag, keep triggerKind', function () {
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['.'],
            provideCompletionItems(doc, pos, ctx) {
                return {
                    suggestions: [
                        {
                            label: doc.getWordUntilPosition(pos).word || 'hello',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'foofoo',
                            range: getDefaultSuggestRange(doc, pos),
                        },
                    ],
                };
            },
        }));
        return withOracle(async function (model, editor) {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('foo');
                editor.setSelection(new Selection(1, 4, 1, 4));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'o' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.triggerOptions.triggerCharacter, undefined);
                assert.strictEqual(event.triggerOptions.triggerKind, undefined);
                assert.strictEqual(event.completionModel.items.length, 1);
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: '.' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.triggerOptions.refilter, undefined);
                assert.strictEqual(event.triggerOptions.triggerCharacter, '.');
                assert.strictEqual(event.triggerOptions.triggerKind, 1 /* CompletionTriggerKind.TriggerCharacter */);
                assert.strictEqual(event.completionModel.items.length, 1);
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'h' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.triggerOptions.refilter, true);
                assert.strictEqual(event.triggerOptions.triggerCharacter, '.');
                assert.strictEqual(event.triggerOptions.triggerKind, 1 /* CompletionTriggerKind.TriggerCharacter */);
                assert.strictEqual(event.completionModel.items.length, 1);
            });
        });
    });
    test('Snippets gone from IntelliSense #173244', function () {
        const snippetProvider = {
            _debugDisplayName: 'test',
            provideCompletionItems(doc, pos, ctx) {
                return {
                    suggestions: [
                        {
                            label: 'log',
                            kind: 27 /* CompletionItemKind.Snippet */,
                            insertText: 'log',
                            range: getDefaultSuggestRange(doc, pos),
                        },
                    ],
                };
            },
        };
        const old = setSnippetSuggestSupport(snippetProvider);
        disposables.add(toDisposable(() => {
            if (getSnippetSuggestSupport() === snippetProvider) {
                setSnippetSuggestSupport(old);
            }
        }));
        disposables.add(registry.register({ scheme: 'test' }, {
            _debugDisplayName: 'test',
            triggerCharacters: ['.'],
            provideCompletionItems(doc, pos, ctx) {
                return {
                    suggestions: [
                        {
                            label: 'locals',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'locals',
                            range: getDefaultSuggestRange(doc, pos),
                        },
                    ],
                    incomplete: true,
                };
            },
        }));
        return withOracle(async function (model, editor) {
            await assertEvent(model.onDidSuggest, () => {
                editor.setValue('');
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'l' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.triggerOptions.triggerCharacter, undefined);
                assert.strictEqual(event.triggerOptions.triggerKind, undefined);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'locals');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'log');
            });
            await assertEvent(model.onDidSuggest, () => {
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'o' });
            }, (event) => {
                assert.strictEqual(event.triggerOptions.triggerKind, 2 /* CompletionTriggerKind.TriggerForIncompleteCompletions */);
                assert.strictEqual(event.triggerOptions.auto, true);
                assert.strictEqual(event.completionModel.items.length, 2);
                assert.strictEqual(event.completionModel.items[0].textLabel, 'locals');
                assert.strictEqual(event.completionModel.items[1].textLabel, 'log');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci9zdWdnZXN0TW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUloRSxPQUFPLEVBS04seUJBQXlCLEVBRXpCLG9CQUFvQixHQUNwQixNQUFNLGlDQUFpQyxDQUFBO0FBRXhDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0Ms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LEVBQUU7Z0JBQ0osTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDbkIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUM5QyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDeEQsQ0FBQyxFQUNELENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUQsQ0FBQyxDQUNELENBQUE7WUFFRCxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRTlCLE1BQU0sV0FBVyxDQUNoQixLQUFLLENBQUMsWUFBWSxFQUNsQixHQUFHLEVBQUU7Z0JBQ0osTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDbkIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUM5QyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsNkJBQWdCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDeEQsQ0FBQyxFQUNELENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FB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