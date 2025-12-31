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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdElubGluZUNvbXBsZXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci9zdWdnZXN0SW5saW5lQ29tcGxldGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBT04sMkJBQTJCLEdBRTNCLE1BQU0saUNBQWlDLENBQUE7QUFHeEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdEUsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix5QkFBeUIsR0FFekIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENB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