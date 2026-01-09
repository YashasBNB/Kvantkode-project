/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { CompletionOptions, provideSuggestionItems, } from '../../browser/suggest.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Suggest', function () {
    let model;
    let registration;
    let registry;
    setup(function () {
        registry = new LanguageFeatureRegistry();
        model = createTextModel('FOO\nbar\BAR\nfoo', undefined, undefined, URI.parse('foo:bar/path'));
        registration = registry.register({ pattern: 'bar/path', scheme: 'foo' }, {
            _debugDisplayName: 'test',
            provideCompletionItems(_doc, pos) {
                return {
                    incomplete: false,
                    suggestions: [
                        {
                            label: 'aaa',
                            kind: 27 /* CompletionItemKind.Snippet */,
                            insertText: 'aaa',
                            range: Range.fromPositions(pos),
                        },
                        {
                            label: 'zzz',
                            kind: 27 /* CompletionItemKind.Snippet */,
                            insertText: 'zzz',
                            range: Range.fromPositions(pos),
                        },
                        {
                            label: 'fff',
                            kind: 9 /* CompletionItemKind.Property */,
                            insertText: 'fff',
                            range: Range.fromPositions(pos),
                        },
                    ],
                };
            },
        });
    });
    teardown(() => {
        registration.dispose();
        model.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('sort - snippet inline', async function () {
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(1 /* SnippetSortOrder.Inline */));
        assert.strictEqual(items.length, 3);
        assert.strictEqual(items[0].completion.label, 'aaa');
        assert.strictEqual(items[1].completion.label, 'fff');
        assert.strictEqual(items[2].completion.label, 'zzz');
        disposable.dispose();
    });
    test('sort - snippet top', async function () {
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(0 /* SnippetSortOrder.Top */));
        assert.strictEqual(items.length, 3);
        assert.strictEqual(items[0].completion.label, 'aaa');
        assert.strictEqual(items[1].completion.label, 'zzz');
        assert.strictEqual(items[2].completion.label, 'fff');
        disposable.dispose();
    });
    test('sort - snippet bottom', async function () {
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(2 /* SnippetSortOrder.Bottom */));
        assert.strictEqual(items.length, 3);
        assert.strictEqual(items[0].completion.label, 'fff');
        assert.strictEqual(items[1].completion.label, 'aaa');
        assert.strictEqual(items[2].completion.label, 'zzz');
        disposable.dispose();
    });
    test('sort - snippet none', async function () {
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(undefined, new Set().add(27 /* CompletionItemKind.Snippet */)));
        assert.strictEqual(items.length, 1);
        assert.strictEqual(items[0].completion.label, 'fff');
        disposable.dispose();
    });
    test('only from', function (callback) {
        const foo = {
            triggerCharacters: [],
            provideCompletionItems() {
                return {
                    currentWord: '',
                    incomplete: false,
                    suggestions: [
                        {
                            label: 'jjj',
                            type: 'property',
                            insertText: 'jjj',
                        },
                    ],
                };
            },
        };
        const registration = registry.register({ pattern: 'bar/path', scheme: 'foo' }, foo);
        provideSuggestionItems(registry, model, new Position(1, 1), new CompletionOptions(undefined, undefined, new Set().add(foo))).then(({ items, disposable }) => {
            registration.dispose();
            assert.strictEqual(items.length, 1);
            assert.ok(items[0].provider === foo);
            disposable.dispose();
            callback();
        });
    });
    test('Ctrl+space completions stopped working with the latest Insiders, #97650', async function () {
        const foo = new (class {
            constructor() {
                this._debugDisplayName = 'test';
                this.triggerCharacters = [];
            }
            provideCompletionItems() {
                return {
                    suggestions: [
                        {
                            label: 'one',
                            kind: 5 /* CompletionItemKind.Class */,
                            insertText: 'one',
                            range: {
                                insert: new Range(0, 0, 0, 0),
                                replace: new Range(0, 0, 0, 10),
                            },
                        },
                        {
                            label: 'two',
                            kind: 5 /* CompletionItemKind.Class */,
                            insertText: 'two',
                            range: {
                                insert: new Range(0, 0, 0, 0),
                                replace: new Range(0, 1, 0, 10),
                            },
                        },
                    ],
                };
            }
        })();
        const registration = registry.register({ pattern: 'bar/path', scheme: 'foo' }, foo);
        const { items, disposable } = await provideSuggestionItems(registry, model, new Position(0, 0), new CompletionOptions(undefined, undefined, new Set().add(foo)));
        registration.dispose();
        assert.strictEqual(items.length, 2);
        const [a, b] = items;
        assert.strictEqual(a.completion.label, 'one');
        assert.strictEqual(a.isInvalid, false);
        assert.strictEqual(b.completion.label, 'two');
        assert.strictEqual(b.isInvalid, true);
        disposable.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci9zdWdnZXN0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBR3hELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsc0JBQXNCLEdBRXRCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyxTQUFTLEVBQUU7SUFDaEIsSUFBSSxLQUFnQixDQUFBO0lBQ3BCLElBQUksWUFBeUIsQ0FBQTtJQUM3QixJQUFJLFFBQXlELENBQUE7SUFFN0QsS0FBSyxDQUFDO1FBQ0wsUUFBUSxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUN4QyxLQUFLLEdBQUcsZUFBZSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQzdGLFlBQVksR0FBRyxRQUFRLENBQUMsUUFBUSxDQUMvQixFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUss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