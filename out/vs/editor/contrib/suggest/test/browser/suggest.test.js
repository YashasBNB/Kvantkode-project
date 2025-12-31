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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvc3VnZ2VzdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUd4RCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHNCQUFzQixHQUV0QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsU0FBUyxFQUFFO0lBQ2hCLElBQUksS0FBZ0IsQ0FBQTtJQUNwQixJQUFJLFlBQXlCLENBQUE7SUFDN0IsSUFBSSxRQUF5RCxDQUFBO0lBRTdELEtBQUssQ0FBQztRQUNMLFFBQVEsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDeEMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUM3RixZQUFZLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FDL0IsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFDdEM7WUFDQyxpQkFBaUIs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