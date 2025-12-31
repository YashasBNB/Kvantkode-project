/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock } from '../../../../../base/test/common/mock.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { Selection } from '../../../../common/core/selection.js';
import { Range } from '../../../../common/core/range.js';
import { SnippetController2 } from '../../browser/snippetController2.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { InstantiationService } from '../../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('SnippetController2', function () {
    /** @deprecated */
    function assertSelections(editor, ...s) {
        for (const selection of editor.getSelections()) {
            const actual = s.shift();
            assert.ok(selection.equalsSelection(actual), `actual=${selection.toString()} <> expected=${actual.toString()}`);
        }
        assert.strictEqual(s.length, 0);
    }
    function assertContextKeys(service, inSnippet, hasPrev, hasNext) {
        const state = getContextState(service);
        assert.strictEqual(state.inSnippet, inSnippet, `inSnippetMode`);
        assert.strictEqual(state.hasPrev, hasPrev, `HasPrevTabstop`);
        assert.strictEqual(state.hasNext, hasNext, `HasNextTabstop`);
    }
    function getContextState(service = contextKeys) {
        return {
            inSnippet: SnippetController2.InSnippetMode.getValue(service),
            hasPrev: SnippetController2.HasPrevTabstop.getValue(service),
            hasNext: SnippetController2.HasNextTabstop.getValue(service),
        };
    }
    let ctrl;
    let editor;
    let model;
    let contextKeys;
    let instaService;
    setup(function () {
        contextKeys = new MockContextKeyService();
        model = createTextModel('if\n    $state\nfi');
        const serviceCollection = new ServiceCollection([ILabelService, new (class extends mock() {
            })()], [
            IWorkspaceContextService,
            new (class extends mock() {
                getWorkspace() {
                    return { id: 'foo', folders: [] };
                }
            })(),
        ], [ILogService, new NullLogService()], [IContextKeyService, contextKeys]);
        instaService = new InstantiationService(serviceCollection);
        editor = createTestCodeEditor(model, { serviceCollection });
        editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5)]);
        assert.strictEqual(model.getEOL(), '\n');
    });
    teardown(function () {
        model.dispose();
        ctrl.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('creation', () => {
        ctrl = instaService.createInstance(SnippetController2, editor);
        assertContextKeys(contextKeys, false, false, false);
    });
    test('insert, insert -> abort', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('foo${1:bar}foo$0');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        ctrl.cancel();
        assertContextKeys(contextKeys, false, false, false);
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
    });
    test('insert, insert -> tab, tab, done', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('${1:one}${2:two}$0');
        assertContextKeys(contextKeys, true, false, true);
        ctrl.next();
        assertContextKeys(contextKeys, true, true, true);
        ctrl.next();
        assertContextKeys(contextKeys, false, false, false);
        editor.trigger('test', 'type', { text: '\t' });
        assert.strictEqual(SnippetController2.InSnippetMode.getValue(contextKeys), false);
        assert.strictEqual(SnippetController2.HasNextTabstop.getValue(contextKeys), false);
        assert.strictEqual(SnippetController2.HasPrevTabstop.getValue(contextKeys), false);
    });
    test('insert, insert -> cursor moves out (left/right)', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('foo${1:bar}foo$0');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // bad selection change
        editor.setSelections([new Selection(1, 12, 1, 12), new Selection(2, 16, 2, 16)]);
        assertContextKeys(contextKeys, false, false, false);
    });
    test('insert, insert -> cursor moves out (up/down)', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('foo${1:bar}foo$0');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // bad selection change
        editor.setSelections([new Selection(2, 4, 2, 7), new Selection(3, 8, 3, 11)]);
        assertContextKeys(contextKeys, false, false, false);
    });
    test('insert, insert -> cursors collapse', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('foo${1:bar}foo$0');
        assert.strictEqual(SnippetController2.InSnippetMode.getValue(contextKeys), true);
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // bad selection change
        editor.setSelections([new Selection(1, 4, 1, 7)]);
        assertContextKeys(contextKeys, false, false, false);
    });
    test('insert, insert plain text -> no snippet mode', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('foobar');
        assertContextKeys(contextKeys, false, false, false);
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
    });
    test('insert, delete snippet text', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('${1:foobar}$0');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 1, 1, 7), new Selection(2, 5, 2, 11));
        editor.trigger('test', 'cut', {});
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        editor.trigger('test', 'type', { text: 'abc' });
        assertContextKeys(contextKeys, true, false, true);
        ctrl.next();
        assertContextKeys(contextKeys, false, false, false);
        editor.trigger('test', 'tab', {});
        assertContextKeys(contextKeys, false, false, false);
        // editor.trigger('test', 'type', { text: 'abc' });
        // assertContextKeys(contextKeys, false, false, false);
    });
    test('insert, nested trivial snippet', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('${1:foo}bar$0');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 1, 1, 4), new Selection(2, 5, 2, 8));
        ctrl.insert('FOO$0');
        assertSelections(editor, new Selection(1, 4, 1, 4), new Selection(2, 8, 2, 8));
        assertContextKeys(contextKeys, true, false, true);
        ctrl.next();
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        assertContextKeys(contextKeys, false, false, false);
    });
    test('insert, nested snippet', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('${1:foobar}$0');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 1, 1, 7), new Selection(2, 5, 2, 11));
        ctrl.insert('far$1boo$0');
        assertSelections(editor, new Selection(1, 4, 1, 4), new Selection(2, 8, 2, 8));
        assertContextKeys(contextKeys, true, false, true);
        ctrl.next();
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        assertContextKeys(contextKeys, true, true, true);
        ctrl.next();
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        assertContextKeys(contextKeys, false, false, false);
    });
    test('insert, nested plain text', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('${1:foobar}$0');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 1, 1, 7), new Selection(2, 5, 2, 11));
        ctrl.insert('farboo');
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        assertContextKeys(contextKeys, true, false, true);
        ctrl.next();
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        assertContextKeys(contextKeys, false, false, false);
    });
    test('Nested snippets without final placeholder jumps to next outer placeholder, #27898', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert('for(const ${1:element} of ${2:array}) {$0}');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 11, 1, 18), new Selection(2, 15, 2, 22));
        ctrl.next();
        assertContextKeys(contextKeys, true, true, true);
        assertSelections(editor, new Selection(1, 22, 1, 27), new Selection(2, 26, 2, 31));
        ctrl.insert('document');
        assertContextKeys(contextKeys, true, true, true);
        assertSelections(editor, new Selection(1, 30, 1, 30), new Selection(2, 34, 2, 34));
        ctrl.next();
        assertContextKeys(contextKeys, false, false, false);
    });
    test('Inconsistent tab stop behaviour with recursive snippets and tab / shift tab, #27543', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.insert("1_calize(${1:nl}, '${2:value}')$0");
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 10, 1, 12), new Selection(2, 14, 2, 16));
        ctrl.insert("2_calize(${1:nl}, '${2:value}')$0");
        assertSelections(editor, new Selection(1, 19, 1, 21), new Selection(2, 23, 2, 25));
        ctrl.next(); // inner `value`
        assertSelections(editor, new Selection(1, 24, 1, 29), new Selection(2, 28, 2, 33));
        ctrl.next(); // inner `$0`
        assertSelections(editor, new Selection(1, 31, 1, 31), new Selection(2, 35, 2, 35));
        ctrl.next(); // outer `value`
        assertSelections(editor, new Selection(1, 34, 1, 39), new Selection(2, 38, 2, 43));
        ctrl.prev(); // inner `$0`
        assertSelections(editor, new Selection(1, 31, 1, 31), new Selection(2, 35, 2, 35));
    });
    test('Snippet tabstop selecting content of previously entered variable only works when separated by space, #23728', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert("import ${2:${1:module}} from '${1:module}'$0");
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 8, 1, 14), new Selection(1, 21, 1, 27));
        ctrl.insert('foo');
        assertSelections(editor, new Selection(1, 11, 1, 11), new Selection(1, 21, 1, 21));
        ctrl.next(); // ${2:...}
        assertSelections(editor, new Selection(1, 8, 1, 11));
    });
    test('HTML Snippets Combine, #32211', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        model.updateOptions({ insertSpaces: false, tabSize: 4, trimAutoWhitespace: false });
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert(`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=\${2:device-width}, initial-scale=\${3:1.0}">
				<meta http-equiv="X-UA-Compatible" content="\${5:ie=edge}">
				<title>\${7:Document}</title>
			</head>
			<body>
				\${8}
			</body>
			</html>
		`);
        ctrl.next();
        ctrl.next();
        ctrl.next();
        ctrl.next();
        assertSelections(editor, new Selection(11, 5, 11, 5));
        ctrl.insert('<input type="${2:text}">');
        assertSelections(editor, new Selection(11, 18, 11, 22));
    });
    test('Problems with nested snippet insertion #39594', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert('$1 = ConvertTo-Json $1');
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(1, 19, 1, 19));
        editor.setSelection(new Selection(1, 19, 1, 19));
        // snippet mode should stop because $1 has two occurrences
        // and we only have one selection left
        assertContextKeys(contextKeys, false, false, false);
    });
    test('Problems with nested snippet insertion #39594 (part2)', function () {
        // ensure selection-change-to-cancel logic isn't too aggressive
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('a-\naaa-');
        editor.setSelections([new Selection(2, 5, 2, 5), new Selection(1, 3, 1, 3)]);
        ctrl.insert('log($1);$0');
        assertSelections(editor, new Selection(2, 9, 2, 9), new Selection(1, 7, 1, 7));
        assertContextKeys(contextKeys, true, false, true);
    });
    test('“Nested” snippets terminating abruptly in VSCode 1.19.2. #42012', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert('var ${2:${1:name}} = ${1:name} + 1;${0}');
        assertSelections(editor, new Selection(1, 5, 1, 9), new Selection(1, 12, 1, 16));
        assertContextKeys(contextKeys, true, false, true);
        ctrl.next();
        assertContextKeys(contextKeys, true, true, true);
    });
    test('Placeholders order #58267', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert('\\pth{$1}$0');
        assertSelections(editor, new Selection(1, 6, 1, 6));
        assertContextKeys(contextKeys, true, false, true);
        ctrl.insert('\\itv{${1:left}}{${2:right}}{${3:left_value}}{${4:right_value}}$0');
        assertSelections(editor, new Selection(1, 11, 1, 15));
        ctrl.next();
        assertSelections(editor, new Selection(1, 17, 1, 22));
        ctrl.next();
        assertSelections(editor, new Selection(1, 24, 1, 34));
        ctrl.next();
        assertSelections(editor, new Selection(1, 36, 1, 47));
        ctrl.next();
        assertSelections(editor, new Selection(1, 48, 1, 48));
        ctrl.next();
        assertSelections(editor, new Selection(1, 49, 1, 49));
        assertContextKeys(contextKeys, false, false, false);
    });
    test('Must tab through deleted tab stops in snippets #31619', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert('foo${1:a${2:bar}baz}end$0');
        assertSelections(editor, new Selection(1, 4, 1, 11));
        editor.trigger('test', "cut" /* Handler.Cut */, null);
        assertSelections(editor, new Selection(1, 4, 1, 4));
        ctrl.next();
        assertSelections(editor, new Selection(1, 7, 1, 7));
        assertContextKeys(contextKeys, false, false, false);
    });
    test('Cancelling snippet mode should discard added cursors #68512 (soft cancel)', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert('.REGION ${2:FUNCTION_NAME}\nCREATE.FUNCTION ${1:VOID} ${2:FUNCTION_NAME}(${3:})\n\t${4:}\nEND\n.ENDREGION$0');
        assertSelections(editor, new Selection(2, 17, 2, 21));
        ctrl.next();
        assertSelections(editor, new Selection(1, 9, 1, 22), new Selection(2, 22, 2, 35));
        assertContextKeys(contextKeys, true, true, true);
        editor.setSelections([new Selection(1, 22, 1, 22), new Selection(2, 35, 2, 35)]);
        assertContextKeys(contextKeys, true, true, true);
        editor.setSelections([new Selection(2, 1, 2, 1), new Selection(2, 36, 2, 36)]);
        assertContextKeys(contextKeys, false, false, false);
        assertSelections(editor, new Selection(2, 1, 2, 1), new Selection(2, 36, 2, 36));
    });
    test('Cancelling snippet mode should discard added cursors #68512 (hard cancel)', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert('.REGION ${2:FUNCTION_NAME}\nCREATE.FUNCTION ${1:VOID} ${2:FUNCTION_NAME}(${3:})\n\t${4:}\nEND\n.ENDREGION$0');
        assertSelections(editor, new Selection(2, 17, 2, 21));
        ctrl.next();
        assertSelections(editor, new Selection(1, 9, 1, 22), new Selection(2, 22, 2, 35));
        assertContextKeys(contextKeys, true, true, true);
        editor.setSelections([new Selection(1, 22, 1, 22), new Selection(2, 35, 2, 35)]);
        assertContextKeys(contextKeys, true, true, true);
        ctrl.cancel(true);
        assertContextKeys(contextKeys, false, false, false);
        assertSelections(editor, new Selection(1, 22, 1, 22));
    });
    test('User defined snippet tab stops ignored #72862', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert('export default $1');
        assertContextKeys(contextKeys, true, false, true);
    });
    test('Optional tabstop in snippets #72358', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        ctrl.insert('${1:prop: {$2\\},}\nmore$0');
        assertContextKeys(contextKeys, true, false, true);
        assertSelections(editor, new Selection(1, 1, 1, 10));
        editor.trigger('test', "cut" /* Handler.Cut */, {});
        assertSelections(editor, new Selection(1, 1, 1, 1));
        ctrl.next();
        assertSelections(editor, new Selection(2, 5, 2, 5));
        assertContextKeys(contextKeys, false, false, false);
    });
    test('issue #90135: confusing trim whitespace edits', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
        ctrl.insert('\nfoo');
        assertSelections(editor, new Selection(2, 8, 2, 8));
    });
    test('issue #145727: insertSnippet can put snippet selections in wrong positions (1 of 2)', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
        ctrl.insert('\naProperty: aClass<${2:boolean}> = new aClass<${2:boolean}>();\n', {
            adjustWhitespace: false,
        });
        assertSelections(editor, new Selection(2, 19, 2, 26), new Selection(2, 41, 2, 48));
    });
    test('issue #145727: insertSnippet can put snippet selections in wrong positions (2 of 2)', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
        ctrl.insert('\naProperty: aClass<${2:boolean}> = new aClass<${2:boolean}>();\n');
        // This will insert \n    aProperty....
        assertSelections(editor, new Selection(2, 23, 2, 30), new Selection(2, 45, 2, 52));
    });
    test("leading TAB by snippets won't replace by spaces #101870", function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        model.updateOptions({ insertSpaces: true, tabSize: 4 });
        ctrl.insert('\tHello World\n\tNew Line');
        assert.strictEqual(model.getValue(), '    Hello World\n    New Line');
    });
    test("leading TAB by snippets won't replace by spaces #101870 (part 2)", function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        model.updateOptions({ insertSpaces: true, tabSize: 4 });
        ctrl.insert('\tHello World\n\tNew Line\n${1:\tmore}');
        assert.strictEqual(model.getValue(), '    Hello World\n    New Line\n    more');
    });
    test.skip('Snippet transformation does not work after inserting variable using intellisense, #112362', function () {
        {
            // HAPPY - no nested snippet
            ctrl = instaService.createInstance(SnippetController2, editor);
            model.setValue('');
            model.updateOptions({ insertSpaces: true, tabSize: 4 });
            ctrl.insert("$1\n\n${1/([A-Za-z0-9]+): ([A-Za-z]+).*/$1: '$2',/gm}");
            assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(3, 1, 3, 1));
            editor.trigger('test', 'type', { text: 'foo: number;' });
            ctrl.next();
            assert.strictEqual(model.getValue(), `foo: number;\n\nfoo: 'number',`);
        }
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        model.updateOptions({ insertSpaces: true, tabSize: 4 });
        ctrl.insert("$1\n\n${1/([A-Za-z0-9]+): ([A-Za-z]+).*/$1: '$2',/gm}");
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(3, 1, 3, 1));
        editor.trigger('test', 'type', { text: 'foo: ' });
        ctrl.insert('number;');
        ctrl.next();
        assert.strictEqual(model.getValue(), `foo: number;\n\nfoo: 'number',`);
        // editor.trigger('test', 'type', { text: ';' });
    });
    suite('createEditsAndSnippetsFromEdits', function () {
        test('apply, tab, done', function () {
            ctrl = instaService.createInstance(SnippetController2, editor);
            model.setValue('foo("bar")');
            ctrl.apply([
                { range: new Range(1, 5, 1, 10), template: '$1' },
                { range: new Range(1, 1, 1, 1), template: 'const ${1:new_const} = "bar";\n' },
            ]);
            assert.strictEqual(model.getValue(), 'const new_const = "bar";\nfoo(new_const)');
            assertContextKeys(contextKeys, true, false, true);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 7, 1, 16),
                new Selection(2, 5, 2, 14),
            ]);
            ctrl.next();
            assertContextKeys(contextKeys, false, false, false);
            assert.deepStrictEqual(editor.getSelections(), [new Selection(2, 14, 2, 14)]);
        });
        test('apply, tab, done with special final tabstop', function () {
            model.setValue('foo("bar")');
            ctrl = instaService.createInstance(SnippetController2, editor);
            ctrl.apply([
                { range: new Range(1, 5, 1, 10), template: '$1' },
                { range: new Range(1, 1, 1, 1), template: 'const ${1:new_const}$0 = "bar";\n' },
            ]);
            assert.strictEqual(model.getValue(), 'const new_const = "bar";\nfoo(new_const)');
            assertContextKeys(contextKeys, true, false, true);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 7, 1, 16),
                new Selection(2, 5, 2, 14),
            ]);
            ctrl.next();
            assertContextKeys(contextKeys, false, false, false);
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 16, 1, 16)]);
        });
        test('apply, tab, tab, done', function () {
            model.setValue('foo\nbar');
            ctrl = instaService.createInstance(SnippetController2, editor);
            ctrl.apply([
                { range: new Range(1, 4, 1, 4), template: '${3}' },
                { range: new Range(2, 4, 2, 4), template: '$3' },
                { range: new Range(1, 1, 1, 1), template: '### ${2:Header}\n' },
            ]);
            assert.strictEqual(model.getValue(), '### Header\nfoo\nbar');
            assert.deepStrictEqual(getContextState(), { inSnippet: true, hasPrev: false, hasNext: true });
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 5, 1, 11)]);
            ctrl.next();
            assert.deepStrictEqual(getContextState(), { inSnippet: true, hasPrev: true, hasNext: true });
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(2, 4, 2, 4),
                new Selection(3, 4, 3, 4),
            ]);
            ctrl.next();
            assert.deepStrictEqual(getContextState(), {
                inSnippet: false,
                hasPrev: false,
                hasNext: false,
            });
            assert.deepStrictEqual(editor.getSelections(), [new Selection(3, 4, 3, 4)]);
        });
        test('nested into apply works', function () {
            ctrl = instaService.createInstance(SnippetController2, editor);
            model.setValue('onetwo');
            editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
            ctrl.apply([
                {
                    range: new Range(1, 7, 1, 7),
                    template: '$0${1:three}',
                },
            ]);
            assert.strictEqual(model.getValue(), 'onetwothree');
            assert.deepStrictEqual(getContextState(), { inSnippet: true, hasPrev: false, hasNext: true });
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 7, 1, 12)]);
            ctrl.insert('foo$1bar$1');
            assert.strictEqual(model.getValue(), 'onetwofoobar');
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 10, 1, 10),
                new Selection(1, 13, 1, 13),
            ]);
            assert.deepStrictEqual(getContextState(), { inSnippet: true, hasPrev: false, hasNext: true });
            ctrl.next();
            assert.deepStrictEqual(getContextState(), { inSnippet: true, hasPrev: true, hasNext: true });
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 13, 1, 13)]);
            ctrl.next();
            assert.deepStrictEqual(getContextState(), {
                inSnippet: false,
                hasPrev: false,
                hasNext: false,
            });
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 7, 1, 7)]);
        });
        test('nested into insert abort "outer" snippet', function () {
            ctrl = instaService.createInstance(SnippetController2, editor);
            model.setValue('one\ntwo');
            editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
            ctrl.insert('foo${1:bar}bazz${1:bang}');
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 4, 1, 7),
                new Selection(1, 11, 1, 14),
                new Selection(2, 4, 2, 7),
                new Selection(2, 11, 2, 14),
            ]);
            assert.deepStrictEqual(getContextState(), { inSnippet: true, hasPrev: false, hasNext: true });
            ctrl.apply([
                {
                    range: new Range(1, 4, 1, 7),
                    template: '$0A',
                },
            ]);
            assert.strictEqual(model.getValue(), 'fooAbazzbarone\nfoobarbazzbartwo');
            assert.deepStrictEqual(getContextState(), {
                inSnippet: false,
                hasPrev: false,
                hasNext: false,
            });
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 4, 1, 4)]);
        });
        test('nested into "insert" abort "outer" snippet (2)', function () {
            ctrl = instaService.createInstance(SnippetController2, editor);
            model.setValue('one\ntwo');
            editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
            ctrl.insert('foo${1:bar}bazz${1:bang}');
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 4, 1, 7),
                new Selection(1, 11, 1, 14),
                new Selection(2, 4, 2, 7),
                new Selection(2, 11, 2, 14),
            ]);
            assert.deepStrictEqual(getContextState(), { inSnippet: true, hasPrev: false, hasNext: true });
            const edits = [
                {
                    range: new Range(1, 4, 1, 7),
                    template: 'A',
                },
                {
                    range: new Range(1, 11, 1, 14),
                    template: 'B',
                },
                {
                    range: new Range(2, 4, 2, 7),
                    template: 'C',
                },
                {
                    range: new Range(2, 11, 2, 14),
                    template: 'D',
                },
            ];
            ctrl.apply(edits);
            assert.strictEqual(model.getValue(), 'fooAbazzBone\nfooCbazzDtwo');
            assert.deepStrictEqual(getContextState(), {
                inSnippet: false,
                hasPrev: false,
                hasNext: false,
            });
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 5, 1, 5),
                new Selection(1, 10, 1, 10),
                new Selection(2, 5, 2, 5),
                new Selection(2, 10, 2, 10),
            ]);
        });
    });
    test('Bug: cursor position $0 with user snippets #163808', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        ctrl.insert('<Element1 Attr1="foo" $1>\n  <Element2 Attr1="$2"/>\n$0"\n</Element1>');
        assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 23, 1, 23)]);
        ctrl.insert('Qualifier="$0"');
        assert.strictEqual(model.getValue(), '<Element1 Attr1="foo" Qualifier="">\n  <Element2 Attr1=""/>\n"\n</Element1>');
        assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 34, 1, 34)]);
    });
    test('EOL-Sequence (CRLF) shifts tab stop in isFileTemplate snippets #167386', function () {
        ctrl = instaService.createInstance(SnippetController2, editor);
        model.setValue('');
        model.setEOL(1 /* EndOfLineSequence.CRLF */);
        ctrl.apply([
            {
                range: model.getFullModelRange(),
                template: 'line 54321${1:FOO}\nline 54321${1:FOO}\n(no tab stop)\nline 54321${1:FOO}\nline 54321',
            },
        ]);
        assert.deepStrictEqual(editor.getSelections(), [
            new Selection(1, 11, 1, 14),
            new Selection(2, 11, 2, 14),
            new Selection(4, 11, 4, 14),
        ]);
    });
    test('"Surround With" code action snippets use incorrect indentation levels and styles #169319', function () {
        model.setValue('function foo(f, x, condition) {\n    f();\n    return x;\n}');
        const sel = new Range(2, 5, 3, 14);
        editor.setSelection(sel);
        ctrl = instaService.createInstance(SnippetController2, editor);
        ctrl.apply([
            {
                range: sel,
                template: 'if (${1:condition}) {\n\t$TM_SELECTED_TEXT$0\n}',
            },
        ]);
        assert.strictEqual(model.getValue(), `function foo(f, x, condition) {\n    if (condition) {\n        f();\n        return x;\n    }\n}`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbnRyb2xsZXIyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbmlwcGV0L3Rlc3QvYnJvd3Nlci9zbmlwcGV0Q29udHJvbGxlcjIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzNHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRWhHLE9BQU8sRUFB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Z0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO1FBRWhELGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFDLGdCQUFnQjtRQUM1QixnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVsRixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBQyxhQUFhO1FBQ3pCLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFDLGdCQUFnQjtRQUM1QixnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxD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