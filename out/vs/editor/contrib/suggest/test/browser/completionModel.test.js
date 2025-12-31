/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditorOptions } from '../../../../common/config/editorOptions.js';
import { CompletionModel } from '../../browser/completionModel.js';
import { CompletionItem, getSuggestionComparator } from '../../browser/suggest.js';
import { WordDistance } from '../../browser/wordDistance.js';
export function createSuggestItem(label, overwriteBefore, kind = 9 /* languages.CompletionItemKind.Property */, incomplete = false, position = { lineNumber: 1, column: 1 }, sortText, filterText) {
    const suggestion = {
        label,
        sortText,
        filterText,
        range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column - overwriteBefore,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        },
        insertText: typeof label === 'string' ? label : label.label,
        kind,
    };
    const container = {
        incomplete,
        suggestions: [suggestion],
    };
    const provider = {
        _debugDisplayName: 'test',
        provideCompletionItems() {
            return;
        },
    };
    return new CompletionItem(position, suggestion, container, provider);
}
suite('CompletionModel', function () {
    const defaultOptions = {
        insertMode: 'insert',
        snippetsPreventQuickSuggestions: true,
        filterGraceful: true,
        localityBonus: false,
        shareSuggestSelections: false,
        showIcons: true,
        showMethods: true,
        showFunctions: true,
        showConstructors: true,
        showDeprecated: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showKeywords: true,
        showWords: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showSnippets: true,
    };
    let model;
    setup(function () {
        model = new CompletionModel([createSuggestItem('foo', 3), createSuggestItem('Foo', 3), createSuggestItem('foo', 2)], 1, {
            leadingLineContent: 'foo',
            characterCountDelta: 0,
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('filtering - cached', function () {
        const itemsNow = model.items;
        let itemsThen = model.items;
        assert.ok(itemsNow === itemsThen);
        // still the same context
        model.lineContext = { leadingLineContent: 'foo', characterCountDelta: 0 };
        itemsThen = model.items;
        assert.ok(itemsNow === itemsThen);
        // different context, refilter
        model.lineContext = { leadingLineContent: 'foo1', characterCountDelta: 1 };
        itemsThen = model.items;
        assert.ok(itemsNow !== itemsThen);
    });
    test('complete/incomplete', () => {
        assert.strictEqual(model.getIncompleteProvider().size, 0);
        const incompleteModel = new CompletionModel([createSuggestItem('foo', 3, undefined, true), createSuggestItem('foo', 2)], 1, {
            leadingLineContent: 'foo',
            characterCountDelta: 0,
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(incompleteModel.getIncompleteProvider().size, 1);
    });
    test('Fuzzy matching of snippets stopped working with inline snippet suggestions #49895', function () {
        const completeItem1 = createSuggestItem('foobar1', 1, undefined, false, {
            lineNumber: 1,
            column: 2,
        });
        const completeItem2 = createSuggestItem('foobar2', 1, undefined, false, {
            lineNumber: 1,
            column: 2,
        });
        const completeItem3 = createSuggestItem('foobar3', 1, undefined, false, {
            lineNumber: 1,
            column: 2,
        });
        const completeItem4 = createSuggestItem('foobar4', 1, undefined, false, {
            lineNumber: 1,
            column: 2,
        });
        const completeItem5 = createSuggestItem('foobar5', 1, undefined, false, {
            lineNumber: 1,
            column: 2,
        });
        const incompleteItem1 = createSuggestItem('foofoo1', 1, undefined, true, {
            lineNumber: 1,
            column: 2,
        });
        const model = new CompletionModel([completeItem1, completeItem2, completeItem3, completeItem4, completeItem5, incompleteItem1], 2, { leadingLineContent: 'f', characterCountDelta: 0 }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.getIncompleteProvider().size, 1);
        assert.strictEqual(model.items.length, 6);
    });
    test('proper current word when length=0, #16380', function () {
        model = new CompletionModel([
            createSuggestItem('    </div', 4),
            createSuggestItem('a', 0),
            createSuggestItem('p', 0),
            createSuggestItem('    </tag', 4),
            createSuggestItem('    XYZ', 4),
        ], 1, {
            leadingLineContent: '   <',
            characterCountDelta: 0,
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.items.length, 4);
        const [a, b, c, d] = model.items;
        assert.strictEqual(a.completion.label, '    </div');
        assert.strictEqual(b.completion.label, '    </tag');
        assert.strictEqual(c.completion.label, 'a');
        assert.strictEqual(d.completion.label, 'p');
    });
    test('keep snippet sorting with prefix: top, #25495', function () {
        model = new CompletionModel([
            createSuggestItem('Snippet1', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('tnippet2', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('semver', 1, 9 /* languages.CompletionItemKind.Property */),
        ], 1, {
            leadingLineContent: 's',
            characterCountDelta: 0,
        }, WordDistance.None, defaultOptions, 'top', undefined);
        assert.strictEqual(model.items.length, 2);
        const [a, b] = model.items;
        assert.strictEqual(a.completion.label, 'Snippet1');
        assert.strictEqual(b.completion.label, 'semver');
        assert.ok(a.score < b.score); // snippet really promoted
    });
    test('keep snippet sorting with prefix: bottom, #25495', function () {
        model = new CompletionModel([
            createSuggestItem('snippet1', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('tnippet2', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('Semver', 1, 9 /* languages.CompletionItemKind.Property */),
        ], 1, {
            leadingLineContent: 's',
            characterCountDelta: 0,
        }, WordDistance.None, defaultOptions, 'bottom', undefined);
        assert.strictEqual(model.items.length, 2);
        const [a, b] = model.items;
        assert.strictEqual(a.completion.label, 'Semver');
        assert.strictEqual(b.completion.label, 'snippet1');
        assert.ok(a.score < b.score); // snippet really demoted
    });
    test('keep snippet sorting with prefix: inline, #25495', function () {
        model = new CompletionModel([
            createSuggestItem('snippet1', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('tnippet2', 1, 27 /* languages.CompletionItemKind.Snippet */),
            createSuggestItem('Semver', 1),
        ], 1, {
            leadingLineContent: 's',
            characterCountDelta: 0,
        }, WordDistance.None, defaultOptions, 'inline', undefined);
        assert.strictEqual(model.items.length, 2);
        const [a, b] = model.items;
        assert.strictEqual(a.completion.label, 'snippet1');
        assert.strictEqual(b.completion.label, 'Semver');
        assert.ok(a.score > b.score); // snippet really demoted
    });
    test('filterText seems ignored in autocompletion, #26874', function () {
        const item1 = createSuggestItem('Map - java.util', 1, undefined, undefined, undefined, undefined, 'Map');
        const item2 = createSuggestItem('Map - java.util', 1);
        model = new CompletionModel([item1, item2], 1, {
            leadingLineContent: 'M',
            characterCountDelta: 0,
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.items.length, 2);
        model.lineContext = {
            leadingLineContent: 'Map ',
            characterCountDelta: 3,
        };
        assert.strictEqual(model.items.length, 1);
    });
    test("Vscode 1.12 no longer obeys 'sortText' in completion items (from language server), #26096", function () {
        const item1 = createSuggestItem('<- groups', 2, 9 /* languages.CompletionItemKind.Property */, false, { lineNumber: 1, column: 3 }, '00002', '  groups');
        const item2 = createSuggestItem('source', 0, 9 /* languages.CompletionItemKind.Property */, false, { lineNumber: 1, column: 3 }, '00001', 'source');
        const items = [item1, item2].sort(getSuggestionComparator(1 /* SnippetSortOrder.Inline */));
        model = new CompletionModel(items, 3, {
            leadingLineContent: '  ',
            characterCountDelta: 0,
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.items.length, 2);
        const [first, second] = model.items;
        assert.strictEqual(first.completion.label, 'source');
        assert.strictEqual(second.completion.label, '<- groups');
    });
    test('Completion item sorting broken when using label details #153026', function () {
        const itemZZZ = createSuggestItem({ label: 'ZZZ' }, 0, 11 /* languages.CompletionItemKind.Operator */, false);
        const itemAAA = createSuggestItem({ label: 'AAA' }, 0, 11 /* languages.CompletionItemKind.Operator */, false);
        const itemIII = createSuggestItem('III', 0, 11 /* languages.CompletionItemKind.Operator */, false);
        const cmp = getSuggestionComparator(1 /* SnippetSortOrder.Inline */);
        const actual = [itemZZZ, itemAAA, itemIII].sort(cmp);
        assert.deepStrictEqual(actual, [itemAAA, itemIII, itemZZZ]);
    });
    test('Score only filtered items when typing more, score all when typing less', function () {
        model = new CompletionModel([
            createSuggestItem('console', 0),
            createSuggestItem('co_new', 0),
            createSuggestItem('bar', 0),
            createSuggestItem('car', 0),
            createSuggestItem('foo', 0),
        ], 1, {
            leadingLineContent: '',
            characterCountDelta: 0,
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        assert.strictEqual(model.items.length, 5);
        // narrow down once
        model.lineContext = { leadingLineContent: 'c', characterCountDelta: 1 };
        assert.strictEqual(model.items.length, 3);
        // query gets longer, narrow down the narrow-down'ed-set from before
        model.lineContext = { leadingLineContent: 'cn', characterCountDelta: 2 };
        assert.strictEqual(model.items.length, 2);
        // query gets shorter, refilter everything
        model.lineContext = { leadingLineContent: '', characterCountDelta: 0 };
        assert.strictEqual(model.items.length, 5);
    });
    test('Have more relaxed suggest matching algorithm #15419', function () {
        model = new CompletionModel([
            createSuggestItem('result', 0),
            createSuggestItem('replyToUser', 0),
            createSuggestItem('randomLolut', 0),
            createSuggestItem('car', 0),
            createSuggestItem('foo', 0),
        ], 1, {
            leadingLineContent: '',
            characterCountDelta: 0,
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        // query gets longer, narrow down the narrow-down'ed-set from before
        model.lineContext = { leadingLineContent: 'rlut', characterCountDelta: 4 };
        assert.strictEqual(model.items.length, 3);
        const [first, second, third] = model.items;
        assert.strictEqual(first.completion.label, 'result'); // best with `rult`
        assert.strictEqual(second.completion.label, 'replyToUser'); // best with `rltu`
        assert.strictEqual(third.completion.label, 'randomLolut'); // best with `rlut`
    });
    test('Emmet suggestion not appearing at the top of the list in jsx files, #39518', function () {
        model = new CompletionModel([
            createSuggestItem('from', 0),
            createSuggestItem('form', 0),
            createSuggestItem('form:get', 0),
            createSuggestItem('testForeignMeasure', 0),
            createSuggestItem('fooRoom', 0),
        ], 1, {
            leadingLineContent: '',
            characterCountDelta: 0,
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        model.lineContext = { leadingLineContent: 'form', characterCountDelta: 4 };
        assert.strictEqual(model.items.length, 5);
        const [first, second, third] = model.items;
        assert.strictEqual(first.completion.label, 'form'); // best with `form`
        assert.strictEqual(second.completion.label, 'form:get'); // best with `form`
        assert.strictEqual(third.completion.label, 'from'); // best with `from`
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci9jb21wbGV0aW9uTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBMEIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUdsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBb0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFNUQsTUFBTSxVQUFVLGlCQUFpQixDQUNoQyxLQUE2QyxFQUM3QyxlQUF1QixFQUN2QixJQUFJLGdEQUF3QyxFQUM1QyxhQUFzQixLQUFLLEVBQzNCLFdBQXNCLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ2xELFFBQWlCLEVBQ2pCLFVBQW1CO0lBRW5CLE1BQU0sVUFBVSxHQUE2QjtRQUM1QyxLQUFLO1FBQ0wsUUFBUTtRQUNSLFVBQVU7UUFDVixLQUFLLEVBQUU7WUFDTixlQUFlLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDcEMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsZUFBZTtZQUM5QyxhQUFhLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDbEMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNO1NBQzFCO1FBQ0QsVUFBVSxFQUFFLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENB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