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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL2NvbXBsZXRpb25Nb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUEwQixNQUFNLDRDQUE0QyxDQUFBO0FBR2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLHVCQUF1QixFQUFvQixNQUFNLDBCQUEwQixDQUFBO0FBQ3BHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUU1RCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLEtBQTZDLEVBQzdDLGVBQXVCLEVBQ3ZCLElBQUksZ0RBQXdDLEVBQzVDLGFBQXNCLEtBQUssRUFDM0IsV0FBc0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDbEQsUUFBaUIsRUFDakIsVUFBbUI7SUFFbkIsTUFBTSxVQUFVLEdBQTZCO1FBQzVDLEtBQUs7UUFDTCxRQUFRO1FBQ1IsVUFBVTtRQUNWLEtBQUssRUFBRTtZQUNOLGVBQWUsRUFBRSxRQUFRLENBQUMsVUFBVTtZQUNwQyxXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxlQUFlO1lBQzlDLGFBQWEsRUFBRSxRQUFRLENBQUMsVUFBVTtZQUNsQyxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU07U0FDMUI7UUFDRCxVQUFVLEVBQUUsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENB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