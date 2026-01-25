/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { SnippetCompletionProvider, } from '../../browser/snippetCompletionProvider.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { createModelServices, instantiateTextModel, } from '../../../../../editor/test/common/testTextModel.js';
import { Snippet } from '../../browser/snippetsFile.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { TestLanguageConfigurationService } from '../../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CompletionModel } from '../../../../../editor/contrib/suggest/browser/completionModel.js';
import { CompletionItem } from '../../../../../editor/contrib/suggest/browser/suggest.js';
import { WordDistance } from '../../../../../editor/contrib/suggest/browser/wordDistance.js';
import { EditorOptions } from '../../../../../editor/common/config/editorOptions.js';
class SimpleSnippetService {
    constructor(snippets) {
        this.snippets = snippets;
    }
    getSnippets() {
        return Promise.resolve(this.getSnippetsSync());
    }
    getSnippetsSync() {
        return this.snippets;
    }
    getSnippetFiles() {
        throw new Error();
    }
    isEnabled() {
        throw new Error();
    }
    updateEnablement() {
        throw new Error();
    }
    updateUsageTimestamp(snippet) {
        throw new Error();
    }
}
suite('SnippetsService', function () {
    const defaultCompletionContext = { triggerKind: 0 /* CompletionTriggerKind.Invoke */ };
    let disposables;
    let instantiationService;
    let languageService;
    let snippetService;
    setup(function () {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
        languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({
            id: 'fooLang',
            extensions: ['.fooLang'],
        }));
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'barTest', 'bar', '', 'barCodeSnippet', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'bazzTest', 'bazz', '', 'bazzCodeSnippet', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    async function asCompletionModel(model, position, provider, context = defaultCompletionContext) {
        const list = await provider.provideCompletionItems(model, Position.lift(position), context);
        const result = new CompletionModel(list.suggestions.map((s) => {
            return new CompletionItem(position, s, list, provider);
        }), position.column, {
            characterCountDelta: 0,
            leadingLineContent: model
                .getLineContent(position.lineNumber)
                .substring(0, position.column - 1),
        }, WordDistance.None, EditorOptions.suggest.defaultValue, EditorOptions.snippetSuggestions.defaultValue, undefined);
        return result;
    }
    test('snippet completions - simple', async function () {
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, '', 'fooLang'));
        await provider
            .provideCompletionItems(model, new Position(1, 1), defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.incomplete, undefined);
            assert.strictEqual(result.suggestions.length, 2);
        });
        const completions = await asCompletionModel(model, new Position(1, 1), provider);
        assert.strictEqual(completions.items.length, 2);
    });
    test('snippet completions - simple 2', async function () {
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, 'hello ', 'fooLang'));
        await provider
            .provideCompletionItems(model, new Position(1, 6) /* hello| */, defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.incomplete, undefined);
            assert.strictEqual(result.suggestions.length, 0);
        });
        await provider
            .provideCompletionItems(model, new Position(1, 7) /* hello |*/, defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.incomplete, undefined);
            assert.strictEqual(result.suggestions.length, 2);
        });
        const completions1 = await asCompletionModel(model, new Position(1, 6) /* hello| */, provider);
        assert.strictEqual(completions1.items.length, 0);
        const completions2 = await asCompletionModel(model, new Position(1, 7) /* hello |*/, provider);
        assert.strictEqual(completions2.items.length, 2);
    });
    test('snippet completions - with prefix', async function () {
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, 'bar', 'fooLang'));
        await provider
            .provideCompletionItems(model, new Position(1, 4), defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.incomplete, undefined);
            assert.strictEqual(result.suggestions.length, 1);
            assert.deepStrictEqual(result.suggestions[0].label, {
                label: 'bar',
                description: 'barTest',
            });
            assert.strictEqual(result.suggestions[0].range.insert.startColumn, 1);
            assert.strictEqual(result.suggestions[0].insertText, 'barCodeSnippet');
        });
        const completions = await asCompletionModel(model, new Position(1, 4), provider);
        assert.strictEqual(completions.items.length, 1);
        assert.deepStrictEqual(completions.items[0].completion.label, {
            label: 'bar',
            description: 'barTest',
        });
        assert.strictEqual(completions.items[0].completion.range.insert.startColumn, 1);
        assert.strictEqual(completions.items[0].completion.insertText, 'barCodeSnippet');
    });
    test('snippet completions - with different prefixes', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'barTest', 'bar', '', 's1', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'name', 'bar-bar', '', 's2', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, 'bar-bar', 'fooLang'));
        {
            await provider
                .provideCompletionItems(model, new Position(1, 3), defaultCompletionContext)
                .then((result) => {
                assert.strictEqual(result.incomplete, undefined);
                assert.strictEqual(result.suggestions.length, 2);
                assert.deepStrictEqual(result.suggestions[0].label, {
                    label: 'bar',
                    description: 'barTest',
                });
                assert.strictEqual(result.suggestions[0].insertText, 's1');
                assert.strictEqual(result.suggestions[0].range.insert.startColumn, 1);
                assert.deepStrictEqual(result.suggestions[1].label, {
                    label: 'bar-bar',
                    description: 'name',
                });
                assert.strictEqual(result.suggestions[1].insertText, 's2');
                assert.strictEqual(result.suggestions[1].range.insert.startColumn, 1);
            });
            const completions = await asCompletionModel(model, new Position(1, 3), provider);
            assert.strictEqual(completions.items.length, 2);
            assert.deepStrictEqual(completions.items[0].completion.label, {
                label: 'bar',
                description: 'barTest',
            });
            assert.strictEqual(completions.items[0].completion.insertText, 's1');
            assert.strictEqual(completions.items[0].completion.range.insert.startColumn, 1);
            assert.deepStrictEqual(completions.items[1].completion.label, {
                label: 'bar-bar',
                description: 'name',
            });
            assert.strictEqual(completions.items[1].completion.insertText, 's2');
            assert.strictEqual(completions.items[1].completion.range.insert.startColumn, 1);
        }
        {
            await provider
                .provideCompletionItems(model, new Position(1, 5), defaultCompletionContext)
                .then((result) => {
                assert.strictEqual(result.incomplete, undefined);
                assert.strictEqual(result.suggestions.length, 2);
                const [first, second] = result.suggestions;
                assert.deepStrictEqual(first.label, {
                    label: 'bar',
                    description: 'barTest',
                });
                assert.strictEqual(first.insertText, 's1');
                assert.strictEqual(first.range.insert.startColumn, 5);
                assert.deepStrictEqual(second.label, {
                    label: 'bar-bar',
                    description: 'name',
                });
                assert.strictEqual(second.insertText, 's2');
                assert.strictEqual(second.range.insert.startColumn, 1);
            });
            const completions = await asCompletionModel(model, new Position(1, 5), provider);
            assert.strictEqual(completions.items.length, 2);
            const [first, second] = completions.items.map((i) => i.completion);
            assert.deepStrictEqual(first.label, {
                label: 'bar-bar',
                description: 'name',
            });
            assert.strictEqual(first.insertText, 's2');
            assert.strictEqual(first.range.insert.startColumn, 1);
            assert.deepStrictEqual(second.label, {
                label: 'bar',
                description: 'barTest',
            });
            assert.strictEqual(second.insertText, 's1');
            assert.strictEqual(second.range.insert.startColumn, 5);
        }
        {
            await provider
                .provideCompletionItems(model, new Position(1, 6), defaultCompletionContext)
                .then((result) => {
                assert.strictEqual(result.incomplete, undefined);
                assert.strictEqual(result.suggestions.length, 2);
                assert.deepStrictEqual(result.suggestions[0].label, {
                    label: 'bar',
                    description: 'barTest',
                });
                assert.strictEqual(result.suggestions[0].insertText, 's1');
                assert.strictEqual(result.suggestions[0].range.insert.startColumn, 5);
                assert.deepStrictEqual(result.suggestions[1].label, {
                    label: 'bar-bar',
                    description: 'name',
                });
                assert.strictEqual(result.suggestions[1].insertText, 's2');
                assert.strictEqual(result.suggestions[1].range.insert.startColumn, 1);
            });
            const completions = await asCompletionModel(model, new Position(1, 6), provider);
            assert.strictEqual(completions.items.length, 2);
            assert.deepStrictEqual(completions.items[0].completion.label, {
                label: 'bar-bar',
                description: 'name',
            });
            assert.strictEqual(completions.items[0].completion.insertText, 's2');
            assert.strictEqual(completions.items[0].completion.range.insert.startColumn, 1);
            assert.deepStrictEqual(completions.items[1].completion.label, {
                label: 'bar',
                description: 'barTest',
            });
            assert.strictEqual(completions.items[1].completion.insertText, 's1');
            assert.strictEqual(completions.items[1].completion.range.insert.startColumn, 5);
        }
    });
    test('Cannot use "<?php" as user snippet prefix anymore, #26275', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], '', '<?php', '', 'insert me', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        let model = instantiateTextModel(instantiationService, '\t<?php', 'fooLang');
        await provider
            .provideCompletionItems(model, new Position(1, 7), defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.suggestions.length, 1);
        });
        const completions1 = await asCompletionModel(model, new Position(1, 7), provider);
        assert.strictEqual(completions1.items.length, 1);
        model.dispose();
        model = instantiateTextModel(instantiationService, '\t<?', 'fooLang');
        await provider
            .provideCompletionItems(model, new Position(1, 4), defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.suggestions.length, 1);
            assert.strictEqual(result.suggestions[0].range.insert.startColumn, 2);
        });
        const completions2 = await asCompletionModel(model, new Position(1, 4), provider);
        assert.strictEqual(completions2.items.length, 1);
        assert.strictEqual(completions2.items[0].completion.range.insert.startColumn, 2);
        model.dispose();
        model = instantiateTextModel(instantiationService, 'a<?', 'fooLang');
        await provider
            .provideCompletionItems(model, new Position(1, 4), defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.suggestions.length, 1);
            assert.strictEqual(result.suggestions[0].range.insert.startColumn, 2);
        });
        const completions3 = await asCompletionModel(model, new Position(1, 4), provider);
        assert.strictEqual(completions3.items.length, 1);
        assert.strictEqual(completions3.items[0].completion.range.insert.startColumn, 2);
        model.dispose();
    });
    test('No user snippets in suggestions, when inside the code, #30508', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], '', 'foo', '', '<foo>$0</foo>', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, '<head>\n\t\n>/head>', 'fooLang'));
        await provider
            .provideCompletionItems(model, new Position(1, 1), defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.suggestions.length, 1);
        });
        const completions = await asCompletionModel(model, new Position(1, 1), provider);
        assert.strictEqual(completions.items.length, 1);
        await provider
            .provideCompletionItems(model, new Position(2, 2), defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.suggestions.length, 1);
        });
        const completions2 = await asCompletionModel(model, new Position(2, 2), provider);
        assert.strictEqual(completions2.items.length, 1);
    });
    test('SnippetSuggest - ensure extension snippets come last ', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'second', 'second', '', 'second', '', 3 /* SnippetSource.Extension */, generateUuid()),
            new Snippet(false, ['fooLang'], 'first', 'first', '', 'first', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, '', 'fooLang'));
        await provider
            .provideCompletionItems(model, new Position(1, 1), defaultCompletionContext)
            .then((result) => {
            assert.strictEqual(result.suggestions.length, 2);
            const [first, second] = result.suggestions;
            assert.deepStrictEqual(first.label, {
                label: 'first',
                description: 'first',
            });
            assert.deepStrictEqual(second.label, {
                label: 'second',
                description: 'second',
            });
        });
        const completions = await asCompletionModel(model, new Position(1, 1), provider);
        assert.strictEqual(completions.items.length, 2);
        const [first, second] = completions.items;
        assert.deepStrictEqual(first.completion.label, {
            label: 'first',
            description: 'first',
        });
        assert.deepStrictEqual(second.completion.label, {
            label: 'second',
            description: 'second',
        });
    });
    test('Dash in snippets prefix broken #53945', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'p-a', 'p-a', '', 'second', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, 'p-', 'fooLang'));
        let result = await provider.provideCompletionItems(model, new Position(1, 2), defaultCompletionContext);
        let completions = await asCompletionModel(model, new Position(1, 2), provider);
        assert.strictEqual(result.suggestions.length, 1);
        assert.strictEqual(completions.items.length, 1);
        result = await provider.provideCompletionItems(model, new Position(1, 3), defaultCompletionContext);
        completions = await asCompletionModel(model, new Position(1, 3), provider);
        assert.strictEqual(result.suggestions.length, 1);
        assert.strictEqual(completions.items.length, 1);
        result = await provider.provideCompletionItems(model, new Position(1, 3), defaultCompletionContext);
        completions = await asCompletionModel(model, new Position(1, 3), provider);
        assert.strictEqual(result.suggestions.length, 1);
        assert.strictEqual(completions.items.length, 1);
    });
    test('No snippets suggestion on long lines beyond character 100 #58807', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'bug', 'bug', '', 'second', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, 'Thisisaverylonglinegoingwithmore100bcharactersandthismakesintellisensebecomea Thisisaverylonglinegoingwithmore100bcharactersandthismakesintellisensebecomea b', 'fooLang'));
        const result = await provider.provideCompletionItems(model, new Position(1, 158), defaultCompletionContext);
        const completions = await asCompletionModel(model, new Position(1, 158), provider);
        assert.strictEqual(result.suggestions.length, 1);
        assert.strictEqual(completions.items.length, 1);
    });
    test('Type colon will trigger snippet #60746', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'bug', 'bug', '', 'second', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, ':', 'fooLang'));
        const result = await provider.provideCompletionItems(model, new Position(1, 2), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 0);
        const completions = await asCompletionModel(model, new Position(1, 2), provider);
        assert.strictEqual(completions.items.length, 0);
    });
    test("substring of prefix can't trigger snippet #60737", async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'mytemplate', 'mytemplate', '', 'second', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, 'template', 'fooLang'));
        const result = await provider.provideCompletionItems(model, new Position(1, 9), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 1);
        assert.deepStrictEqual(result.suggestions[0].label, {
            label: 'mytemplate',
            description: 'mytemplate',
        });
        const completions = await asCompletionModel(model, new Position(1, 9), provider);
        assert.strictEqual(completions.items.length, 0);
    });
    test('No snippets suggestion beyond character 100 if not at end of line #60247', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'bug', 'bug', '', 'second', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, 'Thisisaverylonglinegoingwithmore100bcharactersandthismakesintellisensebecomea Thisisaverylonglinegoingwithmore100bcharactersandthismakesintellisensebecomea b text_after_b', 'fooLang'));
        const result = await provider.provideCompletionItems(model, new Position(1, 158), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 1);
        const completions = await asCompletionModel(model, new Position(1, 158), provider);
        assert.strictEqual(completions.items.length, 1);
    });
    test('issue #61296: VS code freezes when editing CSS fi`le with emoji', async function () {
        const languageConfigurationService = disposables.add(new TestLanguageConfigurationService());
        disposables.add(languageConfigurationService.register('fooLang', {
            wordPattern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@#.!])?[\w\-?]+%?|[@#!.])/g,
        }));
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'bug', '-a-bug', '', 'second', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, languageConfigurationService);
        const model = disposables.add(instantiateTextModel(instantiationService, '.🐷-a-b', 'fooLang'));
        const result = await provider.provideCompletionItems(model, new Position(1, 8), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 1);
        const completions = await asCompletionModel(model, new Position(1, 8), provider);
        assert.strictEqual(completions.items.length, 1);
    });
    test('No snippets shown when triggering completions at whitespace on line that already has text #62335', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'bug', 'bug', '', 'second', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, 'a ', 'fooLang'));
        const result = await provider.provideCompletionItems(model, new Position(1, 3), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 1);
        const completions = await asCompletionModel(model, new Position(1, 3), provider);
        assert.strictEqual(completions.items.length, 1);
    });
    test('Snippet prefix with special chars and numbers does not work #62906', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'noblockwdelay', '<<', '', '<= #dly"', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'noblockwdelay', '11', '', 'eleven', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        let model = instantiateTextModel(instantiationService, ' <', 'fooLang');
        let result = await provider.provideCompletionItems(model, new Position(1, 3), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 1);
        let [first] = result.suggestions;
        assert.strictEqual(first.range.insert.startColumn, 2);
        let completions = await asCompletionModel(model, new Position(1, 3), provider);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].editStart.column, 2);
        model.dispose();
        model = instantiateTextModel(instantiationService, '1', 'fooLang');
        result = await provider.provideCompletionItems(model, new Position(1, 2), defaultCompletionContext);
        completions = await asCompletionModel(model, new Position(1, 2), provider);
        assert.strictEqual(result.suggestions.length, 1);
        [first] = result.suggestions;
        assert.strictEqual(first.range.insert.startColumn, 1);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].editStart.column, 1);
        model.dispose();
    });
    test('Snippet replace range', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'notWordTest', 'not word', '', 'not word snippet', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        let model = instantiateTextModel(instantiationService, 'not wordFoo bar', 'fooLang');
        let result = await provider.provideCompletionItems(model, new Position(1, 3), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 1);
        let [first] = result.suggestions;
        assert.strictEqual(first.range.insert.endColumn, 3);
        assert.strictEqual(first.range.replace.endColumn, 9);
        let completions = await asCompletionModel(model, new Position(1, 3), provider);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].editInsertEnd.column, 3);
        assert.strictEqual(completions.items[0].editReplaceEnd.column, 9);
        model.dispose();
        model = instantiateTextModel(instantiationService, 'not woFoo bar', 'fooLang');
        result = await provider.provideCompletionItems(model, new Position(1, 3), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 1);
        [first] = result.suggestions;
        assert.strictEqual(first.range.insert.endColumn, 3);
        assert.strictEqual(first.range.replace.endColumn, 3);
        completions = await asCompletionModel(model, new Position(1, 3), provider);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].editInsertEnd.column, 3);
        assert.strictEqual(completions.items[0].editReplaceEnd.column, 3);
        model.dispose();
        model = instantiateTextModel(instantiationService, 'not word', 'fooLang');
        result = await provider.provideCompletionItems(model, new Position(1, 1), defaultCompletionContext);
        assert.strictEqual(result.suggestions.length, 1);
        [first] = result.suggestions;
        assert.strictEqual(first.range.insert.endColumn, 1);
        assert.strictEqual(first.range.replace.endColumn, 9);
        completions = await asCompletionModel(model, new Position(1, 1), provider);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].editInsertEnd.column, 1);
        assert.strictEqual(completions.items[0].editReplaceEnd.column, 9);
        model.dispose();
    });
    test('Snippet replace-range incorrect #108894', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'eng', 'eng', '', '<span></span>', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, 'filler e KEEP ng filler', 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 9), defaultCompletionContext);
        const completions = await asCompletionModel(model, new Position(1, 9), provider);
        assert.strictEqual(result.suggestions.length, 1);
        const [first] = result.suggestions;
        assert.strictEqual(first.range.insert.endColumn, 9);
        assert.strictEqual(first.range.replace.endColumn, 9);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].editInsertEnd.column, 9);
        assert.strictEqual(completions.items[0].editReplaceEnd.column, 9);
        model.dispose();
    });
    test('Snippet will replace auto-closing pair if specified in prefix', async function () {
        const languageConfigurationService = disposables.add(new TestLanguageConfigurationService());
        disposables.add(languageConfigurationService.register('fooLang', {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'PSCustomObject', '[PSCustomObject]', '', '[PSCustomObject] @{ Key = Value }', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, languageConfigurationService);
        const model = instantiateTextModel(instantiationService, '[psc]', 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 5), defaultCompletionContext);
        const completions = await asCompletionModel(model, new Position(1, 5), provider);
        assert.strictEqual(result.suggestions.length, 1);
        const [first] = result.suggestions;
        assert.strictEqual(first.range.insert.endColumn, 5);
        // This is 6 because it should eat the `]` at the end of the text even if cursor is before it
        assert.strictEqual(first.range.replace.endColumn, 6);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].editInsertEnd.column, 5);
        assert.strictEqual(completions.items[0].editReplaceEnd.column, 6);
        model.dispose();
    });
    test('Leading whitespace in snippet prefix #123860', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'cite-name', ' cite', '', '~\\cite{$CLIPBOARD}', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, ' ci', 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 4), defaultCompletionContext);
        const completions = await asCompletionModel(model, new Position(1, 4), provider);
        assert.strictEqual(result.suggestions.length, 1);
        const [first] = result.suggestions;
        assert.strictEqual(first.label.label, ' cite');
        assert.strictEqual(first.range.insert.startColumn, 1);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].textLabel, ' cite');
        assert.strictEqual(completions.items[0].editStart.column, 1);
        model.dispose();
    });
    test('still show suggestions in string when disable string suggestion #136611', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'aaa', 'aaa', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'bbb', 'bbb', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            // new Snippet(['fooLang'], '\'ccc', '\'ccc', '', 'value', '', SnippetSource.User, generateUuid())
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, "''", 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 2), {
            triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
            triggerCharacter: "'",
        });
        assert.strictEqual(result.suggestions.length, 0);
        model.dispose();
    });
    test('still show suggestions in string when disable string suggestion #136611 (part 2)', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'aaa', 'aaa', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'bbb', 'bbb', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], "'ccc", "'ccc", '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, "''", 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 2), {
            triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
            triggerCharacter: "'",
        });
        assert.strictEqual(result.suggestions.length, 1);
        const completions = await asCompletionModel(model, new Position(1, 2), provider, {
            triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
            triggerCharacter: "'",
        });
        assert.strictEqual(completions.items.length, 1);
        model.dispose();
    });
    test('Snippet suggestions are too eager #138707 (word)', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'tys', 'tys', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'hell_or_tell', 'hell_or_tell', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], '^y', '^y', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, "'hellot'", 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 8), {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(result.suggestions.length, 1);
        assert.strictEqual(result.suggestions[0].label.label, 'hell_or_tell');
        const completions = await asCompletionModel(model, new Position(1, 8), provider, {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].textLabel, 'hell_or_tell');
        model.dispose();
    });
    test('Snippet suggestions are too eager #138707 (no word)', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'tys', 'tys', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 't', 't', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], '^y', '^y', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, ')*&^', 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 5), {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(result.suggestions.length, 1);
        assert.strictEqual(result.suggestions[0].label.label, '^y');
        const completions = await asCompletionModel(model, new Position(1, 5), provider, {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].textLabel, '^y');
        model.dispose();
    });
    test('Snippet suggestions are too eager #138707 (word/word)', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'async arrow function', 'async arrow function', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'foobarrrrrr', 'foobarrrrrr', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, 'foobar', 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 7), {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(result.suggestions.length, 1);
        assert.strictEqual(result.suggestions[0].label.label, 'foobarrrrrr');
        const completions = await asCompletionModel(model, new Position(1, 7), provider, {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].textLabel, 'foobarrrrrr');
        model.dispose();
    });
    test('Strange and useless autosuggestion #region/#endregion PHP #140039', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'reg', '#region', '', 'value', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, 'function abc(w)', 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 15), {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(result.suggestions.length, 0);
        model.dispose();
    });
    test.skip('Snippets disappear with . key #145960', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'div', 'div', '', 'div', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'div.', 'div.', '', 'div.', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], 'div#', 'div#', '', 'div#', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = instantiateTextModel(instantiationService, 'di', 'fooLang');
        const result = await provider.provideCompletionItems(model, new Position(1, 3), {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(result.suggestions.length, 3);
        model.applyEdits([EditOperation.insert(new Position(1, 3), '.')]);
        assert.strictEqual(model.getValue(), 'di.');
        const result2 = await provider.provideCompletionItems(model, new Position(1, 4), {
            triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
            triggerCharacter: '.',
        });
        assert.strictEqual(result2.suggestions.length, 1);
        assert.strictEqual(result2.suggestions[0].insertText, 'div.');
        model.dispose();
    });
    test('Hyphen in snippet prefix de-indents snippet #139016', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], 'foo', 'Foo- Bar', '', 'Foo', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const model = disposables.add(instantiateTextModel(instantiationService, '    bar', 'fooLang'));
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const result = await provider.provideCompletionItems(model, new Position(1, 8), {
            triggerKind: 0 /* CompletionTriggerKind.Invoke */,
        });
        assert.strictEqual(result.suggestions.length, 1);
        const first = result.suggestions[0];
        assert.strictEqual(first.range.insert.startColumn, 5);
        const completions = await asCompletionModel(model, new Position(1, 8), provider);
        assert.strictEqual(completions.items.length, 1);
        assert.strictEqual(completions.items[0].editStart.column, 5);
    });
    test('Autocomplete suggests based on the last letter of a word and it depends on the typing speed #191070', async function () {
        snippetService = new SimpleSnippetService([
            new Snippet(false, ['fooLang'], '/whiletrue', '/whiletrue', '', 'one', '', 1 /* SnippetSource.User */, generateUuid()),
            new Snippet(false, ['fooLang'], '/sc not expanding', '/sc not expanding', '', 'two', '', 1 /* SnippetSource.User */, generateUuid()),
        ]);
        const provider = new SnippetCompletionProvider(languageService, snippetService, disposables.add(new TestLanguageConfigurationService()));
        const model = disposables.add(instantiateTextModel(instantiationService, '', 'fooLang'));
        {
            // PREFIX: w
            model.setValue('w');
            const result1 = await provider.provideCompletionItems(model, new Position(1, 2), {
                triggerKind: 0 /* CompletionTriggerKind.Invoke */,
            });
            assert.strictEqual(result1.suggestions[0].insertText, 'one');
            assert.strictEqual(result1.suggestions.length, 1);
        }
        {
            // PREFIX: where
            model.setValue('where');
            const result2 = await provider.provideCompletionItems(model, new Position(1, 6), {
                triggerKind: 0 /* CompletionTriggerKind.Invoke */,
            });
            assert.strictEqual(result2.suggestions[0].insertText, 'one'); // /whiletrue matches where (WHilEtRuE)
            assert.strictEqual(result2.suggestions.length, 1);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL3Rlc3QvYnJvd3Nlci9zbmlwcGV0c1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUVOLHlCQUF5QixHQUN6QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNuRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG9CQUFvQixHQUNwQixNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQWlCLE1BQU0sK0JBQStCLENBQUE7QUFPdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQzlILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBGLE1BQU0s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