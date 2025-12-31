/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert, { notStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TerminalCompletionModel } from '../../browser/terminalCompletionModel.js';
import { LineContext } from '../../../../../services/suggest/browser/simpleCompletionModel.js';
import { TerminalCompletionItem, TerminalCompletionItemKind, } from '../../browser/terminalCompletionItem.js';
function createItem(options) {
    return new TerminalCompletionItem({
        ...options,
        kind: options.kind ?? TerminalCompletionItemKind.Method,
        label: options.label || 'defaultLabel',
        provider: options.provider || 'defaultProvider',
        replacementIndex: options.replacementIndex || 0,
        replacementLength: options.replacementLength || 1,
    });
}
function createFileItems(...labels) {
    return labels.map((label) => createItem({ label, kind: TerminalCompletionItemKind.File }));
}
function createFileItemsModel(...labels) {
    return new TerminalCompletionModel(createFileItems(...labels), new LineContext('', 0));
}
function createFolderItems(...labels) {
    return labels.map((label) => createItem({ label, kind: TerminalCompletionItemKind.Folder }));
}
function createFolderItemsModel(...labels) {
    return new TerminalCompletionModel(createFolderItems(...labels), new LineContext('', 0));
}
function assertItems(model, labels) {
    assert.deepStrictEqual(model.items.map((i) => i.completion.label), labels);
    assert.strictEqual(model.items.length, labels.length); // sanity check
}
suite('TerminalCompletionModel', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    let model;
    test('should handle an empty list', function () {
        model = new TerminalCompletionModel([], new LineContext('', 0));
        assert.strictEqual(model.items.length, 0);
    });
    test('should handle a list with one item', function () {
        model = new TerminalCompletionModel([createItem({ label: 'a' })], new LineContext('', 0));
        assert.strictEqual(model.items.length, 1);
        assert.strictEqual(model.items[0].completion.label, 'a');
    });
    test('should sort alphabetically', function () {
        model = new TerminalCompletionModel([createItem({ label: 'b' }), createItem({ label: 'z' }), createItem({ label: 'a' })], new LineContext('', 0));
        assert.strictEqual(model.items.length, 3);
        assert.strictEqual(model.items[0].completion.label, 'a');
        assert.strictEqual(model.items[1].completion.label, 'b');
        assert.strictEqual(model.items[2].completion.label, 'z');
    });
    test('fuzzy matching', () => {
        const initial = ['.\\.eslintrc', '.\\resources\\', '.\\scripts\\', '.\\src\\'];
        const expected = ['.\\scripts\\', '.\\src\\', '.\\.eslintrc', '.\\resources\\'];
        model = new TerminalCompletionModel(initial.map((e) => createItem({ label: e })), new LineContext('s', 0));
        assertItems(model, expected);
    });
    suite('files and folders', () => {
        test('should deprioritize files that start with underscore', function () {
            const initial = ['_a', 'a', 'z'];
            const expected = ['a', 'z', '_a'];
            assertItems(createFileItemsModel(...initial), expected);
            assertItems(createFolderItemsModel(...initial), expected);
        });
        test('should ignore the dot in dotfiles when sorting', function () {
            const initial = ['b', '.a', 'a', '.b'];
            const expected = ['.a', 'a', 'b', '.b'];
            assertItems(createFileItemsModel(...initial), expected);
            assertItems(createFolderItemsModel(...initial), expected);
        });
        test('should handle many files and folders correctly', function () {
            // This is VS Code's root directory with some python items added that have special
            // sorting
            const items = [
                ...createFolderItems('__pycache', '.build', '.configurations', '.devcontainer', '.eslint-plugin-local', '.github', '.profile-oss', '.vscode', '.vscode-test', 'build', 'cli', 'extensions', 'node_modules', 'out', 'remote', 'resources', 'scripts', 'src', 'test'),
                ...createFileItems('__init__.py', '.editorconfig', '.eslint-ignore', '.git-blame-ignore-revs', '.gitattributes', '.gitignore', '.lsifrc.json', '.mailmap', '.mention-bot', '.npmrc', '.nvmrc', '.vscode-test.js', 'cglicenses.json', 'cgmanifest.json', 'CodeQL.yml', 'CONTRIBUTING.md', 'eslint.config.js', 'gulpfile.js', 'LICENSE.txt', 'package-lock.json', 'package.json', 'product.json', 'README.md', 'SECURITY.md', 'ThirdPartyNotices.txt', 'tsfmt.json'),
            ];
            const model = new TerminalCompletionModel(items, new LineContext('', 0));
            assertItems(model, [
                '.build',
                'build',
                'cglicenses.json',
                'cgmanifest.json',
                'cli',
                'CodeQL.yml',
                '.configurations',
                'CONTRIBUTING.md',
                '.devcontainer',
                '.editorconfig',
                'eslint.config.js',
                '.eslint-ignore',
                '.eslint-plugin-local',
                'extensions',
                '.gitattributes',
                '.git-blame-ignore-revs',
                '.github',
                '.gitignore',
                'gulpfile.js',
                'LICENSE.txt',
                '.lsifrc.json',
                '.mailmap',
                '.mention-bot',
                'node_modules',
                '.npmrc',
                '.nvmrc',
                'out',
                'package.json',
                'package-lock.json',
                'product.json',
                '.profile-oss',
                'README.md',
                'remote',
                'resources',
                'scripts',
                'SECURITY.md',
                'src',
                'test',
                'ThirdPartyNotices.txt',
                'tsfmt.json',
                '.vscode',
                '.vscode-test',
                '.vscode-test.js',
                '__init__.py',
                '__pycache',
            ]);
        });
    });
    suite('inline completions', () => {
        function createItems(kind) {
            return [
                ...createFolderItems('a', 'c'),
                ...createFileItems('b', 'd'),
                new TerminalCompletionItem({
                    label: 'ab',
                    provider: 'core',
                    replacementIndex: 0,
                    replacementLength: 0,
                    kind,
                }),
            ];
        }
        suite('InlineSuggestion', () => {
            test('should put on top generally', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestion), new LineContext('', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
            test("should NOT put on top when there's an exact match of another item", function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestion), new LineContext('a', 0));
                notStrictEqual(model.items[0].completion.label, 'ab');
                strictEqual(model.items[1].completion.label, 'ab');
            });
        });
        suite('InlineSuggestionAlwaysOnTop', () => {
            test('should put on top generally', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop), new LineContext('', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
            test("should put on top even if there's an exact match of another item", function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop), new LineContext('a', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci90ZXJtaW5hbENvbXBsZXRpb25Nb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxFQUFFLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDOUYsT0FBTyxFQUNOLHNCQUFzQixFQUN0QiwwQkFBMEIsR0FFMUIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVoRCxTQUFTLFVBQVUsQ0FBQyxPQUFxQztJQUN4RCxPQUFPLElBQUksc0JBQXNCLENBQUM7UUFDakMsR0FBRyxPQUFPO1FBQ1YsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksMEJBQTBCLENBQUMsTUFBTTtRQUN2RCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUssSUFBSSxjQUFjO1FBQ3RDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxJQUFJLGlCQUFpQjtRQUMvQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLElBQUksQ0FBQztRQUMvQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsaUJBQWlCLElBQUksQ0FBQztLQUNqRCxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBRyxNQUFnQjtJQUMzQyxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxL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