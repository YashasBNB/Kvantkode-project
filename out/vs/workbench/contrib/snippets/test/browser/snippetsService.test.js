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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy90ZXN0L2Jyb3dzZXIvc25pcHBldHNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDbkYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixvQkFBb0IsR0FDcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFpQixNQUFNLCtCQUErQixDQUFBO0FBT3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUM5SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVwRixNQUFNLG9CQUFvQjtJQUV6QixZQUFxQixRQUFtQjtRQUFuQixhQUFRLEdBQVIsUUFBUSxDQUFXO0lBQUcsQ0FBQztJQUM1QyxXQUFXO1FBQ1YsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFDRCxlQUFlO1FBQ2QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFDRCxlQUFlO1FBQ2QsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxTQUFTO1FBQ1IsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFBO0lBQ2xCLENBQUM7SUFDRCxnQkFBZ0I7UUFDZixNQUFNLElBQUksS0FBSyxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUNELG9CQUFvQixDQUFDLE9BQWdCO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQTtJQUNsQixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsaUJBQWlCLEVBQUU7SUFDeEIsTUFBTSx3QkFBd0IsR0FBc0IsRUFBRSxXQUFXLHNDQUE4QixFQUFFLENBQUE7SUFFakcsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSxlQUFpQyxDQUFBO0lBQ3JDLElBQUksY0FBZ0MsQ0FBQTtJQUVwQyxLQUFLLENBQUM7UUFDTCxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN2RCxlQUFlLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDNUQsV0FBVyxDQUFDLEdBQUcsQ0FDZCxlQUFlLENBQUMsZ0JBQWdCLENBQUM7WUFDaEMsRUFBRSxFQUFFLFNBQVM7WUFDYixVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUM7U0FDeEIsQ0FBQyxDQUNGLENBQUE7UUFDRCxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxTQUFTLEVBQ1QsS0FBSyxFQUNMLEVBQUUsRUFDRixnQkFBZ0IsRUFDaEIsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtZQUNELElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLFVBQVUsRUFDVixNQUFNLEVBQ04sRUFBRSxFQUNGLGlCQUFpQixFQUNqQixFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLFVBQVUsaUJBQWlCLENBQy9CLEtBQWlCLEVBQ2pCLFFBQW1CLEVBQ25CLFFBQW1DLEVBQ25DLFVBQTZCLHdCQUF3QjtRQUVyRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUUzRixNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FDakMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxQixPQUFPLElBQUksY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELENBQUMsQ0FBQyxFQUNGLFFBQVEsQ0FBQyxNQUFNLEVBQ2Y7WUFDQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ3RCLGtCQUFrQixFQUFFLEtBQUs7aUJBQ3ZCLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO2lCQUNuQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1NBQ25DLEVBQ0QsWUFBWSxDQUFDLElBQUksRUFDakIsYUFBYSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQ2xDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQzdDLFNBQVMsQ0FDVCxDQUFBO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUs7UUFDekMsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1FBQ0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUV4RixNQUFNLFFBQVE7YUFDWixzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFFO2FBQzVFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELENBQUMsQ0FBQyxDQUFBO1FBRUgsTUFBTSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0NBQWdDLEVBQUUsS0FBSztRQUMzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRTlGLE1BQU0sUUFBUTthQUNaLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLHdCQUF3QixDQUFFO2FBQ3pGLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELENBQUMsQ0FBQyxDQUFBO1FBRUgsTUFBTSxRQUFRO2FBQ1osc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsd0JBQXdCLENBQUU7YUFDekYsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsQ0FBQyxDQUFDLENBQUE7UUFFSCxNQUFNLFlBQVksR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEQsTUFBTSxZQUFZLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5RixNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2pELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUs7UUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1FBQ0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUUzRixNQUFNLFFBQVE7YUFDWixzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFFO2FBQzVFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUU7Z0JBQ25ELEtBQUssRUFBRSxLQUFLO2dCQUNaLFdBQVcsRUFBRSxTQUFTO2FBQ3RCLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFhLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDdkUsQ0FBQyxDQUFDLENBQUE7UUFFSCxNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtZQUM3RCxLQUFLLEVBQUUsS0FBSztZQUNaLFdBQVcsRUFBRSxTQUFTO1NBQ3RCLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBYSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUNqRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxLQUFLO1FBQzFELGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLFNBQVMsRUFDVCxLQUFLLEVBQ0wsRUFBRSxFQUNGLElBQUksRUFDSixFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1lBQ0QsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsTUFBTSxFQUNOLFNBQVMsRUFDVCxFQUFFLEVBQ0YsSUFBSSxFQUNKLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRS9GLENBQUM7WUFDQSxNQUFNLFFBQVE7aUJBQ1osc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSx3QkFBd0IsQ0FBRTtpQkFDNUUsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRTtvQkFDbkQsS0FBSyxFQUFFLEtBQUs7b0JBQ1osV0FBVyxFQUFFLFNBQVM7aUJBQ3RCLENBQUMsQ0FBQTtnQkFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUMxRCxNQUFNLENBQUMsV0FBVyxDQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQThCLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFDeEUsQ0FBQyxDQUNELENBQUE7Z0JBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRTtvQkFDbkQsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLFdBQVcsRUFBRSxNQUFNO2lCQUNuQixDQUFDLENBQUE7Z0JBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUE4QixDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQ3hFLENBQUMsQ0FDRCxDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFFSCxNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtnQkFDN0QsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osV0FBVyxFQUFFLFNBQVM7YUFDdEIsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBOEIsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUNsRixDQUFDLENBQ0QsQ0FBQTtZQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFO2dCQUM3RCxLQUFLLEVBQUUsU0FBUztnQkFDaEIsV0FBVyxFQUFFLE1BQU07YUFDbkIsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBOEIsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUNsRixDQUFDLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxDQUFDO1lBQ0EsTUFBTSxRQUFRO2lCQUNaLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCLENBQUU7aUJBQzVFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRWhELE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtnQkFFMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFO29CQUNuQyxLQUFLLEVBQUUsS0FBSztvQkFDWixXQUFXLEVBQUUsU0FBUztpQkFDdEIsQ0FBQyxDQUFBO2dCQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBRSxLQUFLLENBQUMsS0FBOEIsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUUvRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7b0JBQ3BDLEtBQUssRUFBRSxTQUFTO29CQUNoQixXQUFXLEVBQUUsTUFBTTtpQkFDbkIsQ0FBQyxDQUFBO2dCQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBRSxNQUFNLENBQUMsS0FBOEIsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pGLENBQUMsQ0FBQyxDQUFBO1lBRUgsTUFBTSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFL0MsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBRWxFLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRTtnQkFDbkMsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLFdBQVcsRUFBRSxNQUFNO2FBQ25CLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFFLEtBQUssQ0FBQyxLQUE4QixDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFL0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO2dCQUNwQyxLQUFLLEVBQUUsS0FBSztnQkFDWixXQUFXLEVBQUUsU0FBUzthQUN0QixDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBRSxNQUFNLENBQUMsS0FBOEIsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFFRCxDQUFDO1lBQ0EsTUFBTSxRQUFRO2lCQUNaLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCLENBQUU7aUJBQzVFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUU7b0JBQ25ELEtBQUssRUFBRSxLQUFLO29CQUNaLFdBQVcsRUFBRSxTQUFTO2lCQUN0QixDQUFDLENBQUE7Z0JBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQWEsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUM5RSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFO29CQUNuRCxLQUFLLEVBQUUsU0FBUztvQkFDaEIsV0FBVyxFQUFFLE1BQU07aUJBQ25CLENBQUMsQ0FBQTtnQkFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBYSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0UsQ0FBQyxDQUFDLENBQUE7WUFFSCxNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtnQkFDN0QsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLFdBQVcsRUFBRSxNQUFNO2FBQ25CLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBYSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDeEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUU7Z0JBQzdELEtBQUssRUFBRSxLQUFLO2dCQUNaLFdBQVcsRUFBRSxTQUFTO2FBQ3RCLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBYSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekYsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEtBQUs7UUFDdEUsY0FBYyxHQUFHLElBQUksb0JBQW9CLENBQUM7WUFDekMsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsRUFBRSxFQUNGLE9BQU8sRUFDUCxFQUFFLEVBQ0YsV0FBVyxFQUNYLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFFRCxJQUFJLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDNUUsTUFBTSxRQUFRO2FBQ1osc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSx3QkFBd0IsQ0FBRTthQUM1RSxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELENBQUMsQ0FBQyxDQUFBO1FBQ0gsTUFBTSxZQUFZLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEQsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsS0FBSyxHQUFHLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRSxNQUFNLFFBQVE7YUFDWixzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFDO2FBQzNFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQWEsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9FLENBQUMsQ0FBQyxDQUFBO1FBQ0gsTUFBTSxZQUFZLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBRSxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFhLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV6RixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixLQUFLLEdBQUcsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sUUFBUTthQUNaLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCLENBQUU7YUFDNUUsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBYSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0UsQ0FBQyxDQUFDLENBQUE7UUFDSCxNQUFNLFlBQVksR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFFLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQWEsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrREFBK0QsRUFBRSxLQUFLO1FBQzFFLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLEVBQUUsRUFDRixLQUFLLEVBQ0wsRUFBRSxFQUNGLGVBQWUsRUFDZixFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQzVFLENBQUE7UUFDRCxNQUFNLFFBQVE7YUFDWixzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFFO2FBQzVFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsQ0FBQyxDQUFDLENBQUE7UUFDSCxNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQyxNQUFNLFFBQVE7YUFDWixzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFDO2FBQzNFLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakQsQ0FBQyxDQUFDLENBQUE7UUFDSCxNQUFNLFlBQVksR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNqRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1REFBdUQsRUFBRSxLQUFLO1FBQ2xFLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLFFBQVEsRUFDUixRQUFRLEVBQ1IsRUFBRSxFQUNGLFFBQVEsRUFDUixFQUFFLG1DQUVGLFlBQVksRUFBRSxDQUNkO1lBQ0QsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsT0FBTyxFQUNQLE9BQU8sRUFDUCxFQUFFLEVBQ0YsT0FBTyxFQUNQLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLE1BQU0sUUFBUTthQUNaLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCLENBQUU7YUFDNUUsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNoRCxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUE7WUFDMUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFO2dCQUNuQyxLQUFLLEVBQUUsT0FBTztnQkFDZCxXQUFXLEVBQUUsT0FBTzthQUNwQixDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7Z0JBQ3BDLEtBQUssRUFBRSxRQUFRO2dCQUNmLFdBQVcsRUFBRSxRQUFRO2FBQ3JCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUgsTUFBTSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUU7WUFDOUMsS0FBSyxFQUFFLE9BQU87WUFDZCxXQUFXLEVBQUUsT0FBTztTQUNwQixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFO1lBQy9DLEtBQUssRUFBRSxRQUFRO1lBQ2YsV0FBVyxFQUFFLFFBQVE7U0FDckIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUNBQXVDLEVBQUUsS0FBSztRQUNsRCxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxLQUFLLEVBQ0wsS0FBSyxFQUNMLEVBQUUsRUFDRixRQUFRLEVBQ1IsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtTQUNELENBQUMsQ0FBQTtRQUNGLE1BQU0sUUFBUSxHQUFHLElBQUkseUJBQXlCLENBQzdDLGVBQWUsRUFDZixjQUFjLEVBQ2QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FDdkQsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFFMUYsSUFBSSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQ2pELEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLHdCQUF3QixDQUN2QixDQUFBO1FBQ0YsSUFBSSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQyxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQzdDLEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLHdCQUF3QixDQUN2QixDQUFBO1FBQ0YsV0FBVyxHQUFHLE1BQU0saUJBQWlCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFL0MsTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUM3QyxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQix3QkFBd0IsQ0FDdkIsQ0FBQTtRQUNGLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2hELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLEtBQUs7UUFDN0UsY0FBYyxHQUFHLElBQUksb0JBQW9CLENBQUM7WUFDekMsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsS0FBSyxFQUNMLEtBQUssRUFDTCxFQUFFLEVBQ0YsUUFBUSxFQUNSLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixvQkFBb0IsQ0FDbkIsb0JBQW9CLEVBQ3BCLCtKQUErSixFQUMvSixTQUFTLENBQ1QsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQ25ELEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQ3BCLHdCQUF3QixDQUN2QixDQUFBO1FBQ0YsTUFBTSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRWxGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLO1FBQ25ELGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLEtBQUssRUFDTCxLQUFLLEVBQ0wsRUFBRSxFQUNGLFFBQVEsRUFDUixFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUN6RixNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FDbkQsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsd0JBQXdCLENBQ3ZCLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhELE1BQU0sV0FBVyxHQUFHLE1BQU0saUJBQWlCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2hELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEtBQUs7UUFDN0QsY0FBYyxHQUFHLElBQUksb0JBQW9CLENBQUM7WUFDekMsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsWUFBWSxFQUNaLFlBQVksRUFDWixFQUFFLEVBQ0YsUUFBUSxFQUNSLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUNuRCxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQix3QkFBd0IsQ0FDeEIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRTtZQUNuRCxLQUFLLEVBQUUsWUFBWTtZQUNuQixXQUFXLEVBQUUsWUFBWTtTQUN6QixDQUFDLENBQUE7UUFFRixNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwRUFBMEUsRUFBRSxLQUFLO1FBQ3JGLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLEtBQUssRUFDTCxLQUFLLEVBQ0wsRUFBRSxFQUNGLFFBQVEsRUFDUixFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsb0JBQW9CLENBQ25CLG9CQUFvQixFQUNwQiw0S0FBNEssRUFDNUssU0FBUyxDQUNULENBQ0QsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUNuRCxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUNwQix3QkFBd0IsQ0FDdkIsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEQsTUFBTSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUVBQWlFLEVBQUUsS0FBSztRQUM1RSxNQUFNLDRCQUE0QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQUE7UUFDNUYsV0FBVyxDQUFDLEdBQUcsQ0FDZCw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFO1lBQ2hELFdBQVcsRUFBRSw2RUFBNkU7U0FDMUYsQ0FBQyxDQUNGLENBQUE7UUFFRCxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxLQUFLLEVBQ0wsUUFBUSxFQUNSLEVBQUUsRUFDRixRQUFRLEVBQ1IsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUkseUJBQXlCLENBQzdDLGVBQWUsRUFDZixjQUFjLEVBQ2QsNEJBQTRCLENBQzVCLENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRS9GLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUNuRCxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQix3QkFBd0IsQ0FDdkIsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEQsTUFBTSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0dBQWtHLEVBQUUsS0FBSztRQUM3RyxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxLQUFLLEVBQ0wsS0FBSyxFQUNMLEVBQUUsRUFDRixRQUFRLEVBQ1IsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUkseUJBQXlCLENBQzdDLGVBQWUsRUFDZixjQUFjLEVBQ2QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FDdkQsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFFMUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQ25ELEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLHdCQUF3QixDQUN2QixDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVoRCxNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvRUFBb0UsRUFBRSxLQUFLO1FBQy9FLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLGVBQWUsRUFDZixJQUFJLEVBQ0osRUFBRSxFQUNGLFVBQVUsRUFDVixFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1lBQ0QsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsZUFBZSxFQUNmLElBQUksRUFDSixFQUFFLEVBQ0YsUUFBUSxFQUNSLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFFRCxJQUFJLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFdkUsSUFBSSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQ2pELEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLHdCQUF3QixDQUN2QixDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFFLEtBQUssQ0FBQyxLQUFhLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU5RCxJQUFJLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixLQUFLLEdBQUcsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FDN0MsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsd0JBQXdCLENBQ3ZCLENBQUE7UUFDRixXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQy9DO1FBQUEsQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUUsS0FBSyxDQUFDLEtBQWEsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUQsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUs7UUFDbEMsY0FBYyxHQUFHLElBQUksb0JBQW9CLENBQUM7WUFDekMsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsYUFBYSxFQUNiLFVBQVUsRUFDVixFQUFFLEVBQ0Ysa0JBQWtCLEVBQ2xCLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFFRCxJQUFJLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVwRixJQUFJLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FDakQsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsd0JBQXdCLENBQ3ZCLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUUsS0FBSyxDQUFDLEtBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUUsS0FBSyxDQUFDLEtBQWEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdELElBQUksV0FBVyxHQUFHLE1BQU0saUJBQWlCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDOUUsTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUM3QyxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQix3QkFBd0IsQ0FDdkIsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQy9DO1FBQUEsQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUUsS0FBSyxDQUFDLEtBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUUsS0FBSyxDQUFDLEtBQWEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdELFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixLQUFLLEdBQUcsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FDN0MsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsd0JBQXdCLENBQ3ZCLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUMvQztRQUFBLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFFLEtBQUssQ0FBQyxLQUFhLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFFLEtBQUssQ0FBQyxLQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU3RCxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEtBQUs7UUFDcEQsY0FBYyxHQUFHLElBQUksb0JBQW9CLENBQUM7WUFDekMsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsS0FBSyxFQUNMLEtBQUssRUFDTCxFQUFFLEVBQ0YsZUFBZSxFQUNmLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSx5QkFBeUIsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM5RixNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FDbkQsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsd0JBQXdCLENBQ3ZCLENBQUE7UUFDRixNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFFLEtBQUssQ0FBQyxLQUFhLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFFLEtBQUssQ0FBQyxLQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWpFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrREFBK0QsRUFBRSxLQUFLO1FBQzFFLE1BQU0sNEJBQTRCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FBQTtRQUM1RixXQUFXLENBQUMsR0FBRyxDQUNkLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUU7WUFDaEQsUUFBUSxFQUFFO2dCQUNULENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2FBQ1Y7U0FDRCxDQUFDLENBQ0YsQ0FBQTtRQUVELGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLGdCQUFnQixFQUNoQixrQkFBa0IsRUFDbEIsRUFBRSxFQUNGLG1DQUFtQyxFQUNuQyxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCw0QkFBNEIsQ0FDNUIsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM1RSxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FDbkQsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsd0JBQXdCLENBQ3ZCLENBQUE7UUFDRixNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFFLEtBQUssQ0FBQyxLQUFhLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCw2RkFBNkY7UUFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FBRSxLQUFLLENBQUMsS0FBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSztRQUN6RCxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxXQUFXLEVBQ1gsT0FBTyxFQUNQLEVBQUUsRUFDRixxQkFBcUIsRUFDckIsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUkseUJBQXlCLENBQzdDLGVBQWUsRUFDZixjQUFjLEVBQ2QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FDdkQsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRSxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FDbkQsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsd0JBQXdCLENBQ3ZCLENBQUE7UUFDRixNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUF1QixLQUFLLENBQUMsS0FBTSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUF3QixLQUFLLENBQUMsS0FBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5RUFBeUUsRUFBRSxLQUFLO1FBQ3BGLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLEtBQUssRUFDTCxLQUFLLEVBQ0wsRUFBRSxFQUNGLE9BQU8sRUFDUCxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1lBQ0QsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsS0FBSyxFQUNMLEtBQUssRUFDTCxFQUFFLEVBQ0YsT0FBTyxFQUNQLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7WUFDRCxrR0FBa0c7U0FDbEcsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDL0UsV0FBVyxnREFBd0M7WUFDbkQsZ0JBQWdCLEVBQUUsR0FBRztTQUNyQixDQUFFLENBQUE7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrRkFBa0YsRUFBRSxLQUFLO1FBQzdGLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLEtBQUssRUFDTCxLQUFLLEVBQ0wsRUFBRSxFQUNGLE9BQU8sRUFDUCxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1lBQ0QsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsS0FBSyxFQUNMLEtBQUssRUFDTCxFQUFFLEVBQ0YsT0FBTyxFQUNQLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7WUFDRCxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxNQUFNLEVBQ04sTUFBTSxFQUNOLEVBQUUsRUFDRixPQUFPLEVBQ1AsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUkseUJBQXlCLENBQzdDLGVBQWUsRUFDZixjQUFjLEVBQ2QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FDdkQsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV6RSxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQy9FLFdBQVcsZ0RBQXdDO1lBQ25ELGdCQUFnQixFQUFFLEdBQUc7U0FDckIsQ0FBRSxDQUFBO1FBRUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVoRCxNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFO1lBQ2hGLFdBQVcsZ0RBQXdDO1lBQ25ELGdCQUFnQixFQUFFLEdBQUc7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsS0FBSztRQUM3RCxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxLQUFLLEVBQ0wsS0FBSyxFQUNMLEVBQUUsRUFDRixPQUFPLEVBQ1AsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtZQUNELElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLGNBQWMsRUFDZCxjQUFjLEVBQ2QsRUFBRSxFQUNGLE9BQU8sRUFDUCxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1lBQ0QsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsSUFBSSxFQUNKLElBQUksRUFDSixFQUFFLEVBQ0YsT0FBTyxFQUNQLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFL0UsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUMvRSxXQUFXLHNDQUE4QjtTQUN6QyxDQUFFLENBQUE7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQXFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUUxRixNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFO1lBQ2hGLFdBQVcsc0NBQThCO1NBQ3pDLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUVsRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscURBQXFELEVBQUUsS0FBSztRQUNoRSxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxLQUFLLEVBQ0wsS0FBSyxFQUNMLEVBQUUsRUFDRixPQUFPLEVBQ1AsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtZQUNELElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLEdBQUcsRUFDSCxHQUFHLEVBQ0gsRUFBRSxFQUNGLE9BQU8sRUFDUCxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1lBQ0QsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsSUFBSSxFQUNKLElBQUksRUFDSixFQUFFLEVBQ0YsT0FBTyxFQUNQLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFM0UsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUMvRSxXQUFXLHNDQUE4QjtTQUN6QyxDQUFFLENBQUE7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQXFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVoRixNQUFNLFdBQVcsR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFO1lBQ2hGLFdBQVcsc0NBQThCO1NBQ3pDLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV4RCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdURBQXVELEVBQUUsS0FBSztRQUNsRSxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxzQkFBc0IsRUFDdEIsc0JBQXNCLEVBQ3RCLEVBQUUsRUFDRixPQUFPLEVBQ1AsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtZQUNELElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLGFBQWEsRUFDYixhQUFhLEVBQ2IsRUFBRSxFQUNGLE9BQU8sRUFDUCxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1FBQ0QsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRTdFLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDL0UsV0FBVyxzQ0FBOEI7U0FDekMsQ0FBRSxDQUFBO1FBRUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFxQixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFFekYsTUFBTSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRTtZQUNoRixXQUFXLHNDQUE4QjtTQUN6QyxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDakUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1FQUFtRSxFQUFFLEtBQUs7UUFDOUUsY0FBYyxHQUFHLElBQUksb0JBQW9CLENBQUM7WUFDekMsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsS0FBSyxFQUNMLFNBQVMsRUFDVCxFQUFFLEVBQ0YsT0FBTyxFQUNQLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN0RixNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ2hGLFdBQVcsc0NBQThCO1NBQ3pDLENBQUUsQ0FBQTtRQUVILE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLO1FBQ3ZELGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLEtBQUssRUFDTCxLQUFLLEVBQ0wsRUFBRSxFQUNGLEtBQUssRUFDTCxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1lBQ0QsSUFBSSxPQUFPLENBQ1YsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsTUFBTSxFQUNOLE1BQU0sRUFDTixFQUFFLEVBQ0YsTUFBTSxFQUNOLEVBQUUsOEJBRUYsWUFBWSxFQUFFLENBQ2Q7WUFDRCxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxNQUFNLEVBQ04sTUFBTSxFQUNOLEVBQUUsRUFDRixNQUFNLEVBQ04sRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUkseUJBQXlCLENBQzdDLGVBQWUsRUFDZixjQUFjLEVBQ2QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FDdkQsQ0FBQTtRQUNELE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN6RSxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQy9FLFdBQVcsc0NBQThCO1NBQ3pDLENBQUUsQ0FBQTtRQUVILE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQyxNQUFNLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ2hGLFdBQVcsZ0RBQXdDO1lBQ25ELGdCQUFnQixFQUFFLEdBQUc7U0FDckIsQ0FBRSxDQUFBO1FBRUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRTdELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxREFBcUQsRUFBRSxLQUFLO1FBQ2hFLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLEtBQUssRUFDTCxVQUFVLEVBQ1YsRUFBRSxFQUNGLEtBQUssRUFDTCxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUMvRixNQUFNLFFBQVEsR0FBRyxJQUFJLHlCQUF5QixDQUM3QyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDLENBQ3ZELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQy9FLFdBQVcsc0NBQThCO1NBQ3pDLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUF3QixLQUFLLENBQUMsS0FBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFN0UsTUFBTSxXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUdBQXFHLEVBQUUsS0FBSztRQUNoSCxjQUFjLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQztZQUN6QyxJQUFJLE9BQU8sQ0FDVixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxZQUFZLEVBQ1osWUFBWSxFQUNaLEVBQUUsRUFDRixLQUFLLEVBQ0wsRUFBRSw4QkFFRixZQUFZLEVBQUUsQ0FDZDtZQUNELElBQUksT0FBTyxDQUNWLEtBQUssRUFDTCxDQUFDLFNBQVMsQ0FBQyxFQUNYLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsRUFBRSxFQUNGLEtBQUssRUFDTCxFQUFFLDhCQUVGLFlBQVksRUFBRSxDQUNkO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsSUFBSSx5QkFBeUIsQ0FDN0MsZUFBZSxFQUNmLGNBQWMsRUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1FBQ0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUV4RixDQUFDO1lBQ0EsWUFBWTtZQUNaLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbkIsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDaEYsV0FBVyxzQ0FBOEI7YUFDekMsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxDQUFDO1lBQ0EsZ0JBQWdCO1lBQ2hCLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdkIsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDaEYsV0FBVyxzQ0FBOEI7YUFDekMsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQSxDQUFDLHVDQUF1QztZQUNwRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=