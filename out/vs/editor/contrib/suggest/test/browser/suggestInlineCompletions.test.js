/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { InlineCompletionTriggerKind, } from '../../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { SuggestInlineCompletions } from '../../browser/suggestInlineCompletions.js';
import { ISuggestMemoryService } from '../../browser/suggestMemory.js';
import { createCodeEditorServices, instantiateTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
suite('Suggest Inline Completions', function () {
    const disposables = new DisposableStore();
    const services = new ServiceCollection([
        ISuggestMemoryService,
        new (class extends mock() {
            select() {
                return 0;
            }
        })(),
    ]);
    let insta;
    let model;
    let editor;
    setup(function () {
        insta = createCodeEditorServices(disposables, services);
        model = createTextModel('he', undefined, undefined, URI.from({ scheme: 'foo', path: 'foo.bar' }));
        editor = instantiateTestCodeEditor(insta, model);
        editor.updateOptions({
            quickSuggestions: { comments: 'inline', strings: 'inline', other: 'inline' },
        });
        insta.invokeFunction((accessor) => {
            disposables.add(accessor.get(ILanguageFeaturesService).completionProvider.register({ pattern: '*.bar', scheme: 'foo' }, new (class {
                constructor() {
                    this._debugDisplayName = 'test';
                }
                provideCompletionItems(model, position, context, token) {
                    const word = model.getWordUntilPosition(position);
                    const range = new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                    const suggestions = [];
                    suggestions.push({
                        insertText: 'hello',
                        label: 'hello',
                        range,
                        kind: 5 /* CompletionItemKind.Class */,
                    });
                    suggestions.push({
                        insertText: 'hell',
                        label: 'hell',
                        range,
                        kind: 5 /* CompletionItemKind.Class */,
                    });
                    suggestions.push({
                        insertText: 'hey',
                        label: 'hey',
                        range,
                        kind: 27 /* CompletionItemKind.Snippet */,
                    });
                    return { suggestions };
                }
            })()));
        });
    });
    teardown(function () {
        disposables.clear();
        model.dispose();
        editor.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    const context = {
        triggerKind: InlineCompletionTriggerKind.Explicit,
        selectedSuggestionInfo: undefined,
        includeInlineCompletions: true,
        includeInlineEdits: false,
    };
    test('Aggressive inline completions when typing within line #146948', async function () {
        const completions = disposables.add(insta.createInstance(SuggestInlineCompletions));
        {
            // (1,3), end of word -> suggestions
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 3);
            completions.freeInlineCompletions(result);
        }
        {
            // (1,2), middle of word -> NO suggestions
            const result = await completions.provideInlineCompletions(model, new Position(1, 2), context, CancellationToken.None);
            assert.ok(result === undefined);
        }
    });
    test('Snippets show in inline suggestions even though they are turned off #175190', async function () {
        const completions = disposables.add(insta.createInstance(SuggestInlineCompletions));
        {
            // unfiltered
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 3);
            completions.freeInlineCompletions(result);
        }
        {
            // filtered
            editor.updateOptions({ suggest: { showSnippets: false } });
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 2);
            completions.freeInlineCompletions(result);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdElubGluZUNvbXBsZXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3N1Z2dlc3RJbmxpbmVDb21wbGV0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFPTiwyQkFBMkIsR0FFM0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd4QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHlCQUF5QixHQUV6QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJB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