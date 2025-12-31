/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { SnippetParser } from '../../browser/snippetParser.js';
import { SnippetSession } from '../../browser/snippetSession.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
suite('SnippetSession', function () {
    let languageConfigurationService;
    let editor;
    let model;
    function assertSelections(editor, ...s) {
        for (const selection of editor.getSelections()) {
            const actual = s.shift();
            assert.ok(selection.equalsSelection(actual), `actual=${selection.toString()} <> expected=${actual.toString()}`);
        }
        assert.strictEqual(s.length, 0);
    }
    setup(function () {
        model = createTextModel('function foo() {\n    console.log(a);\n}');
        languageConfigurationService = new TestLanguageConfigurationService();
        const serviceCollection = new ServiceCollection([ILabelService, new (class extends mock() {
            })()], [ILanguageConfigurationService, languageConfigurationService], [
            IWorkspaceContextService,
            new (class extends mock() {
                getWorkspace() {
                    return {
                        id: 'workspace-id',
                        folders: [],
                    };
                }
            })(),
        ]);
        editor = createTestCodeEditor(model, { serviceCollection });
        editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5)]);
        assert.strictEqual(model.getEOL(), '\n');
    });
    teardown(function () {
        model.dispose();
        editor.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('normalize whitespace', function () {
        function assertNormalized(position, input, expected) {
            const snippet = new SnippetParser().parse(input);
            SnippetSession.adjustWhitespace(model, position, true, snippet);
            assert.strictEqual(snippet.toTextmateString(), expected);
        }
        assertNormalized(new Position(1, 1), 'foo', 'foo');
        assertNormalized(new Position(1, 1), 'foo\rbar', 'foo\nbar');
        assertNormalized(new Position(1, 1), 'foo\rbar', 'foo\nbar');
        assertNormalized(new Position(2, 5), 'foo\r\tbar', 'foo\n        bar');
        assertNormalized(new Position(2, 3), 'foo\r\tbar', 'foo\n    bar');
        assertNormalized(new Position(2, 5), 'foo\r\tbar\nfoo', 'foo\n        bar\n    foo');
        //Indentation issue with choice elements that span multiple lines #46266
        assertNormalized(new Position(2, 5), 'a\nb${1|foo,\nbar|}', 'a\n    b${1|foo,\nbar|}');
    });
    test('adjust selection (overwrite[Before|After])', function () {
        let range = SnippetSession.adjustSelection(model, new Selection(1, 2, 1, 2), 1, 0);
        assert.ok(range.equalsRange(new Range(1, 1, 1, 2)));
        range = SnippetSession.adjustSelection(model, new Selection(1, 2, 1, 2), 1111, 0);
        assert.ok(range.equalsRange(new Range(1, 1, 1, 2)));
        range = SnippetSession.adjustSelection(model, new Selection(1, 2, 1, 2), 0, 10);
        assert.ok(range.equalsRange(new Range(1, 2, 1, 12)));
        range = SnippetSession.adjustSelection(model, new Selection(1, 2, 1, 2), 0, 10111);
        assert.ok(range.equalsRange(new Range(1, 2, 1, 17)));
    });
    test('text edits & selection', function () {
        const session = new SnippetSession(editor, 'foo${1:bar}foo$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(editor.getModel().getValue(), 'foobarfoofunction foo() {\n    foobarfooconsole.log(a);\n}');
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        session.next();
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
    });
    test('text edit with reversed selection', function () {
        const session = new SnippetSession(editor, '${1:bar}$0', undefined, languageConfigurationService);
        editor.setSelections([new Selection(2, 5, 2, 5), new Selection(1, 1, 1, 1)]);
        session.insert();
        assert.strictEqual(model.getValue(), 'barfunction foo() {\n    barconsole.log(a);\n}');
        assertSelections(editor, new Selection(2, 5, 2, 8), new Selection(1, 1, 1, 4));
    });
    test('snippets, repeated tabstops', function () {
        const session = new SnippetSession(editor, '${1:abc}foo${1:abc}$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 4), new Selection(1, 7, 1, 10), new Selection(2, 5, 2, 8), new Selection(2, 11, 2, 14));
        session.next();
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
    });
    test('snippets, just text', function () {
        const session = new SnippetSession(editor, 'foobar', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(model.getValue(), 'foobarfunction foo() {\n    foobarconsole.log(a);\n}');
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
    });
    test('snippets, selections and new text with newlines', () => {
        const session = new SnippetSession(editor, 'foo\n\t${1:bar}\n$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(editor.getModel().getValue(), 'foo\n    bar\nfunction foo() {\n    foo\n        bar\n    console.log(a);\n}');
        assertSelections(editor, new Selection(2, 5, 2, 8), new Selection(5, 9, 5, 12));
        session.next();
        assertSelections(editor, new Selection(3, 1, 3, 1), new Selection(6, 5, 6, 5));
    });
    test('snippets, newline NO whitespace adjust', () => {
        editor.setSelection(new Selection(2, 5, 2, 5));
        const session = new SnippetSession(editor, 'abc\n    foo\n        bar\n$0', {
            overwriteBefore: 0,
            overwriteAfter: 0,
            adjustWhitespace: false,
            clipboardText: undefined,
            overtypingCapturer: undefined,
        }, languageConfigurationService);
        session.insert();
        assert.strictEqual(editor.getModel().getValue(), 'function foo() {\n    abc\n    foo\n        bar\nconsole.log(a);\n}');
    });
    test('snippets, selections -> next/prev', () => {
        const session = new SnippetSession(editor, 'f$1oo${2:bar}foo$0', undefined, languageConfigurationService);
        session.insert();
        // @ $2
        assertSelections(editor, new Selection(1, 2, 1, 2), new Selection(2, 6, 2, 6));
        // @ $1
        session.next();
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // @ $2
        session.prev();
        assertSelections(editor, new Selection(1, 2, 1, 2), new Selection(2, 6, 2, 6));
        // @ $1
        session.next();
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // @ $0
        session.next();
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
    });
    test('snippets, selections & typing', function () {
        const session = new SnippetSession(editor, 'f${1:oo}_$2_$0', undefined, languageConfigurationService);
        session.insert();
        editor.trigger('test', 'type', { text: 'X' });
        session.next();
        editor.trigger('test', 'type', { text: 'bar' });
        // go back to ${2:oo} which is now just 'X'
        session.prev();
        assertSelections(editor, new Selection(1, 2, 1, 3), new Selection(2, 6, 2, 7));
        // go forward to $1 which is now 'bar'
        session.next();
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        // go to final tabstop
        session.next();
        assert.strictEqual(model.getValue(), 'fX_bar_function foo() {\n    fX_bar_console.log(a);\n}');
        assertSelections(editor, new Selection(1, 8, 1, 8), new Selection(2, 12, 2, 12));
    });
    test('snippets, insert shorter snippet into non-empty selection', function () {
        model.setValue('foo_bar_foo');
        editor.setSelections([new Selection(1, 1, 1, 4), new Selection(1, 9, 1, 12)]);
        new SnippetSession(editor, 'x$0', undefined, languageConfigurationService).insert();
        assert.strictEqual(model.getValue(), 'x_bar_x');
        assertSelections(editor, new Selection(1, 2, 1, 2), new Selection(1, 8, 1, 8));
    });
    test('snippets, insert longer snippet into non-empty selection', function () {
        model.setValue('foo_bar_foo');
        editor.setSelections([new Selection(1, 1, 1, 4), new Selection(1, 9, 1, 12)]);
        new SnippetSession(editor, 'LONGER$0', undefined, languageConfigurationService).insert();
        assert.strictEqual(model.getValue(), 'LONGER_bar_LONGER');
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(1, 18, 1, 18));
    });
    test("snippets, don't grow final tabstop", function () {
        model.setValue('foo_zzz_foo');
        editor.setSelection(new Selection(1, 5, 1, 8));
        const session = new SnippetSession(editor, '$1bar$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 5, 1, 5));
        editor.trigger('test', 'type', { text: 'foo-' });
        session.next();
        assert.strictEqual(model.getValue(), 'foo_foo-bar_foo');
        assertSelections(editor, new Selection(1, 12, 1, 12));
        editor.trigger('test', 'type', { text: 'XXX' });
        assert.strictEqual(model.getValue(), 'foo_foo-barXXX_foo');
        session.prev();
        assertSelections(editor, new Selection(1, 5, 1, 9));
        session.next();
        assertSelections(editor, new Selection(1, 15, 1, 15));
    });
    test("snippets, don't merge touching tabstops 1/2", function () {
        const session = new SnippetSession(editor, '$1$2$3$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.next();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.next();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.next();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.prev();
        session.prev();
        session.prev();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        editor.trigger('test', 'type', { text: '111' });
        session.next();
        editor.trigger('test', 'type', { text: '222' });
        session.next();
        editor.trigger('test', 'type', { text: '333' });
        session.next();
        assert.strictEqual(model.getValue(), '111222333function foo() {\n    111222333console.log(a);\n}');
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
        session.prev();
        assertSelections(editor, new Selection(1, 7, 1, 10), new Selection(2, 11, 2, 14));
        session.prev();
        assertSelections(editor, new Selection(1, 4, 1, 7), new Selection(2, 8, 2, 11));
        session.prev();
        assertSelections(editor, new Selection(1, 1, 1, 4), new Selection(2, 5, 2, 8));
    });
    test("snippets, don't merge touching tabstops 2/2", function () {
        const session = new SnippetSession(editor, '$1$2$3$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        editor.trigger('test', 'type', { text: '111' });
        session.next();
        assertSelections(editor, new Selection(1, 4, 1, 4), new Selection(2, 8, 2, 8));
        editor.trigger('test', 'type', { text: '222' });
        session.next();
        assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        editor.trigger('test', 'type', { text: '333' });
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
    });
    test('snippets, gracefully move over final tabstop', function () {
        const session = new SnippetSession(editor, '${1}bar$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(session.isAtLastPlaceholder, false);
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(2, 5, 2, 5));
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 4, 1, 4), new Selection(2, 8, 2, 8));
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 4, 1, 4), new Selection(2, 8, 2, 8));
    });
    test('snippets, overwriting nested placeholder', function () {
        const session = new SnippetSession(editor, 'log(${1:"$2"});$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 5, 1, 7), new Selection(2, 9, 2, 11));
        editor.trigger('test', 'type', { text: 'XXX' });
        assert.strictEqual(model.getValue(), 'log(XXX);function foo() {\n    log(XXX);console.log(a);\n}');
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, false);
        // assertSelections(editor, new Selection(1, 7, 1, 7), new Selection(2, 11, 2, 11));
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 10, 1, 10), new Selection(2, 14, 2, 14));
    });
    test('snippets, selections and snippet ranges', function () {
        const session = new SnippetSession(editor, '${1:foo}farboo${2:bar}$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(model.getValue(), 'foofarboobarfunction foo() {\n    foofarboobarconsole.log(a);\n}');
        assertSelections(editor, new Selection(1, 1, 1, 4), new Selection(2, 5, 2, 8));
        assert.strictEqual(session.isSelectionWithinPlaceholders(), true);
        editor.setSelections([new Selection(1, 1, 1, 1)]);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        editor.setSelections([new Selection(1, 6, 1, 6), new Selection(2, 10, 2, 10)]);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false); // in snippet, outside placeholder
        editor.setSelections([
            new Selection(1, 6, 1, 6),
            new Selection(2, 10, 2, 10),
            new Selection(1, 1, 1, 1),
        ]);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false); // in snippet, outside placeholder
        editor.setSelections([
            new Selection(1, 6, 1, 6),
            new Selection(2, 10, 2, 10),
            new Selection(2, 20, 2, 21),
        ]);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        // reset selection to placeholder
        session.next();
        assert.strictEqual(session.isSelectionWithinPlaceholders(), true);
        assertSelections(editor, new Selection(1, 10, 1, 13), new Selection(2, 14, 2, 17));
        // reset selection to placeholder
        session.next();
        assert.strictEqual(session.isSelectionWithinPlaceholders(), true);
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 13, 1, 13), new Selection(2, 17, 2, 17));
    });
    test('snippets, nested sessions', function () {
        model.setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const first = new SnippetSession(editor, 'foo${2:bar}foo$0', undefined, languageConfigurationService);
        first.insert();
        assert.strictEqual(model.getValue(), 'foobarfoo');
        assertSelections(editor, new Selection(1, 4, 1, 7));
        const second = new SnippetSession(editor, 'ba${1:zzzz}$0', undefined, languageConfigurationService);
        second.insert();
        assert.strictEqual(model.getValue(), 'foobazzzzfoo');
        assertSelections(editor, new Selection(1, 6, 1, 10));
        second.next();
        assert.strictEqual(second.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 10, 1, 10));
        first.next();
        assert.strictEqual(first.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 13, 1, 13));
    });
    test('snippets, typing at final tabstop', function () {
        const session = new SnippetSession(editor, 'farboo$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        editor.trigger('test', 'type', { text: 'XXX' });
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
    });
    test('snippets, typing at beginning', function () {
        editor.setSelection(new Selection(1, 2, 1, 2));
        const session = new SnippetSession(editor, 'farboo$0', undefined, languageConfigurationService);
        session.insert();
        editor.setSelection(new Selection(1, 2, 1, 2));
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        assert.strictEqual(session.isAtLastPlaceholder, true);
        editor.trigger('test', 'type', { text: 'XXX' });
        assert.strictEqual(model.getLineContent(1), 'fXXXfarboounction foo() {');
        assert.strictEqual(session.isSelectionWithinPlaceholders(), false);
        session.next();
        assertSelections(editor, new Selection(1, 11, 1, 11));
    });
    test('snippets, typing with nested placeholder', function () {
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, 'This ${1:is ${2:nested}}.$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 6, 1, 15));
        session.next();
        assertSelections(editor, new Selection(1, 9, 1, 15));
        editor.trigger('test', 'cut', {});
        assertSelections(editor, new Selection(1, 9, 1, 9));
        editor.trigger('test', 'type', { text: 'XXX' });
        session.prev();
        assertSelections(editor, new Selection(1, 6, 1, 12));
    });
    test('snippets, snippet with variables', function () {
        const session = new SnippetSession(editor, '@line=$TM_LINE_NUMBER$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(model.getValue(), '@line=1function foo() {\n    @line=2console.log(a);\n}');
        assertSelections(editor, new Selection(1, 8, 1, 8), new Selection(2, 12, 2, 12));
    });
    test('snippets, merge', function () {
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, 'This ${1:is ${2:nested}}.$0', undefined, languageConfigurationService);
        session.insert();
        session.next();
        assertSelections(editor, new Selection(1, 9, 1, 15));
        session.merge('really ${1:nested}$0');
        assertSelections(editor, new Selection(1, 16, 1, 22));
        session.next();
        assertSelections(editor, new Selection(1, 22, 1, 22));
        assert.strictEqual(session.isAtLastPlaceholder, false);
        session.next();
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 23, 1, 23));
        session.prev();
        editor.trigger('test', 'type', { text: 'AAA' });
        // back to `really ${1:nested}`
        session.prev();
        assertSelections(editor, new Selection(1, 16, 1, 22));
        // back to `${1:is ...}` which now grew
        session.prev();
        assertSelections(editor, new Selection(1, 6, 1, 25));
    });
    test('snippets, transform', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '${1/foo/bar/}$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 1));
        editor.trigger('test', 'type', { text: 'foo' });
        session.next();
        assert.strictEqual(model.getValue(), 'bar');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 4, 1, 4));
    });
    test('snippets, multi placeholder same index one transform', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '$1 baz ${1/foo/bar/}$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 1), new Selection(1, 6, 1, 6));
        editor.trigger('test', 'type', { text: 'foo' });
        session.next();
        assert.strictEqual(model.getValue(), 'foo baz bar');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 12, 1, 12));
    });
    test('snippets, transform example', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '${1:name} : ${2:type}${3/\\s:=(.*)/${1:+ :=}${1}/};\n$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 5));
        editor.trigger('test', 'type', { text: 'clk' });
        session.next();
        assertSelections(editor, new Selection(1, 7, 1, 11));
        editor.trigger('test', 'type', { text: 'std_logic' });
        session.next();
        assertSelections(editor, new Selection(1, 16, 1, 16));
        session.next();
        assert.strictEqual(model.getValue(), 'clk : std_logic;\n');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(2, 1, 2, 1));
    });
    test('snippets, transform with indent', function () {
        const snippet = [
            'private readonly ${1} = new Emitter<$2>();',
            'readonly ${1/^_(.*)/$1/}: Event<$2> = this.$1.event;',
            '$0',
        ].join('\n');
        const expected = [
            '{',
            '\tprivate readonly _prop = new Emitter<string>();',
            '\treadonly prop: Event<string> = this._prop.event;',
            '\t',
            '}',
        ].join('\n');
        const base = ['{', '\t', '}'].join('\n');
        editor.getModel().setValue(base);
        editor.getModel().updateOptions({ insertSpaces: false });
        editor.setSelection(new Selection(2, 2, 2, 2));
        const session = new SnippetSession(editor, snippet, undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(2, 19, 2, 19), new Selection(3, 11, 3, 11), new Selection(3, 28, 3, 28));
        editor.trigger('test', 'type', { text: '_prop' });
        session.next();
        assertSelections(editor, new Selection(2, 39, 2, 39), new Selection(3, 23, 3, 23));
        editor.trigger('test', 'type', { text: 'string' });
        session.next();
        assert.strictEqual(model.getValue(), expected);
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(4, 2, 4, 2));
    });
    test('snippets, transform example hit if', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '${1:name} : ${2:type}${3/\\s:=(.*)/${1:+ :=}${1}/};\n$0', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 5));
        editor.trigger('test', 'type', { text: 'clk' });
        session.next();
        assertSelections(editor, new Selection(1, 7, 1, 11));
        editor.trigger('test', 'type', { text: 'std_logic' });
        session.next();
        assertSelections(editor, new Selection(1, 16, 1, 16));
        editor.trigger('test', 'type', { text: " := '1'" });
        session.next();
        assert.strictEqual(model.getValue(), "clk : std_logic := '1';\n");
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(2, 1, 2, 1));
    });
    test('Snippet tab stop selection issue #96545, snippets, transform adjacent to previous placeholder', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, '${1:{}${2:fff}${1/{/}/}', undefined, languageConfigurationService);
        session.insert();
        assertSelections(editor, new Selection(1, 1, 1, 2), new Selection(1, 5, 1, 6));
        session.next();
        assert.strictEqual(model.getValue(), '{fff}');
        assertSelections(editor, new Selection(1, 2, 1, 5));
        editor.trigger('test', 'type', { text: 'ggg' });
        session.next();
        assert.strictEqual(model.getValue(), '{ggg}');
        assert.strictEqual(session.isAtLastPlaceholder, true);
        assertSelections(editor, new Selection(1, 6, 1, 6));
    });
    test('Snippet tab stop selection issue #96545', function () {
        editor.getModel().setValue('');
        const session = new SnippetSession(editor, '${1:{}${2:fff}${1/[\\{]/}/}$0', undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(editor.getModel().getValue(), '{fff{');
        assertSelections(editor, new Selection(1, 1, 1, 2), new Selection(1, 5, 1, 6));
        session.next();
        assertSelections(editor, new Selection(1, 2, 1, 5));
    });
    test('Snippet placeholder index incorrect after using 2+ snippets in a row that each end with a placeholder, #30769', function () {
        editor.getModel().setValue('');
        editor.setSelection(new Selection(1, 1, 1, 1));
        const session = new SnippetSession(editor, 'test ${1:replaceme}', undefined, languageConfigurationService);
        session.insert();
        editor.trigger('test', 'type', { text: '1' });
        editor.trigger('test', 'type', { text: '\n' });
        assert.strictEqual(editor.getModel().getValue(), 'test 1\n');
        session.merge('test ${1:replaceme}');
        editor.trigger('test', 'type', { text: '2' });
        editor.trigger('test', 'type', { text: '\n' });
        assert.strictEqual(editor.getModel().getValue(), 'test 1\ntest 2\n');
        session.merge('test ${1:replaceme}');
        editor.trigger('test', 'type', { text: '3' });
        editor.trigger('test', 'type', { text: '\n' });
        assert.strictEqual(editor.getModel().getValue(), 'test 1\ntest 2\ntest 3\n');
        session.merge('test ${1:replaceme}');
        editor.trigger('test', 'type', { text: '4' });
        editor.trigger('test', 'type', { text: '\n' });
        assert.strictEqual(editor.getModel().getValue(), 'test 1\ntest 2\ntest 3\ntest 4\n');
    });
    test("Snippet variable text isn't whitespace normalised, #31124", function () {
        editor.getModel().setValue(['start', '\t\t-one', '\t\t-two', 'end'].join('\n'));
        editor.getModel().updateOptions({ insertSpaces: false });
        editor.setSelection(new Selection(2, 2, 3, 7));
        new SnippetSession(editor, '<div>\n\t$TM_SELECTED_TEXT\n</div>$0', undefined, languageConfigurationService).insert();
        let expected = ['start', '\t<div>', '\t\t\t-one', '\t\t\t-two', '\t</div>', 'end'].join('\n');
        assert.strictEqual(editor.getModel().getValue(), expected);
        editor.getModel().setValue(['start', '\t\t-one', '\t-two', 'end'].join('\n'));
        editor.getModel().updateOptions({ insertSpaces: false });
        editor.setSelection(new Selection(2, 2, 3, 7));
        new SnippetSession(editor, '<div>\n\t$TM_SELECTED_TEXT\n</div>$0', undefined, languageConfigurationService).insert();
        expected = ['start', '\t<div>', '\t\t\t-one', '\t\t-two', '\t</div>', 'end'].join('\n');
        assert.strictEqual(editor.getModel().getValue(), expected);
    });
    test('Selecting text from left to right, and choosing item messes up code, #31199', function () {
        const model = editor.getModel();
        model.setValue('console.log');
        let actual = SnippetSession.adjustSelection(model, new Selection(1, 12, 1, 9), 3, 0);
        assert.ok(actual.equalsSelection(new Selection(1, 9, 1, 6)));
        actual = SnippetSession.adjustSelection(model, new Selection(1, 9, 1, 12), 3, 0);
        assert.ok(actual.equalsSelection(new Selection(1, 9, 1, 12)));
        editor.setSelections([new Selection(1, 9, 1, 12)]);
        new SnippetSession(editor, 'far', {
            overwriteBefore: 3,
            overwriteAfter: 0,
            adjustWhitespace: true,
            clipboardText: undefined,
            overtypingCapturer: undefined,
        }, languageConfigurationService).insert();
        assert.strictEqual(model.getValue(), 'console.far');
    });
    test("Tabs don't get replaced with spaces in snippet transformations #103818", function () {
        const model = editor.getModel();
        model.setValue('\n{\n  \n}');
        model.updateOptions({ insertSpaces: true, indentSize: 2 });
        editor.setSelections([new Selection(1, 1, 1, 1), new Selection(3, 6, 3, 6)]);
        const session = new SnippetSession(editor, [
            'function animate () {',
            '\tvar ${1:a} = 12;',
            '\tconsole.log(${1/(.*)/\n\t\t$1\n\t/})',
            '}',
        ].join('\n'), undefined, languageConfigurationService);
        session.insert();
        assert.strictEqual(model.getValue(), [
            'function animate () {',
            '  var a = 12;',
            '  console.log(a)',
            '}',
            '{',
            '  function animate () {',
            '    var a = 12;',
            '    console.log(a)',
            '  }',
            '}',
        ].join('\n'));
        editor.trigger('test', 'type', { text: 'bbb' });
        session.next();
        assert.strictEqual(model.getValue(), [
            'function animate () {',
            '  var bbb = 12;',
            '  console.log(',
            '    bbb',
            '  )',
            '}',
            '{',
            '  function animate () {',
            '    var bbb = 12;',
            '    console.log(',
            '      bbb',
            '    )',
            '  }',
            '}',
        ].join('\n'));
    });
    suite('createEditsAndSnippetsFromEdits', function () {
        test('empty', function () {
            const result = SnippetSession.createEditsAndSnippetsFromEdits(editor, [], true, true, undefined, undefined, languageConfigurationService);
            assert.deepStrictEqual(result.edits, []);
            assert.deepStrictEqual(result.snippets, []);
        });
        test('basic', function () {
            editor.getModel().setValue('foo("bar")');
            const result = SnippetSession.createEditsAndSnippetsFromEdits(editor, [
                { range: new Range(1, 5, 1, 9), template: '$1' },
                { range: new Range(1, 1, 1, 1), template: 'const ${1:new_const} = "bar"' },
            ], true, true, undefined, undefined, languageConfigurationService);
            assert.strictEqual(result.edits.length, 2);
            assert.deepStrictEqual(result.edits[0].range, new Range(1, 1, 1, 1));
            assert.deepStrictEqual(result.edits[0].text, 'const new_const = "bar"');
            assert.deepStrictEqual(result.edits[1].range, new Range(1, 5, 1, 9));
            assert.deepStrictEqual(result.edits[1].text, 'new_const');
            assert.strictEqual(result.snippets.length, 1);
            assert.strictEqual(result.snippets[0].isTrivialSnippet, false);
        });
        test('with $SELECTION variable', function () {
            editor.getModel().setValue('Some text and a selection');
            editor.setSelections([new Selection(1, 17, 1, 26)]);
            const result = SnippetSession.createEditsAndSnippetsFromEdits(editor, [{ range: new Range(1, 17, 1, 26), template: 'wrapped <$SELECTION>' }], true, true, undefined, undefined, languageConfigurationService);
            assert.strictEqual(result.edits.length, 1);
            assert.deepStrictEqual(result.edits[0].range, new Range(1, 17, 1, 26));
            assert.deepStrictEqual(result.edits[0].text, 'wrapped <selection>');
            assert.strictEqual(result.snippets.length, 1);
            assert.strictEqual(result.snippets[0].isTrivialSnippet, true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFNlc3Npb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NuaXBwZXQvdGVzdC9icm93c2VyL3NuaXBwZXRTZXNzaW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUU3RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3BILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFaEcsS0FBSyxDQUFDLGdCQUFnQixFQUFFO0lBQ3ZCLElB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QTRCLENBQUMsQ0FBQTtRQUMvRixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDaEIsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFL0MsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFL0MsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFL0MsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUNoQiw0REFBNEQsQ0FDNUQsQ0FBQTtRQUNELGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxGLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNkLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNkLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9FLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNkLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQy9FLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLDZDQUE2QyxFQUFFO1FBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQUE7UUFDL0YsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2hCLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRS9DLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNkLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxPQUFPLENBQUMs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RyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUU3RCxPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUVyRSxPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUU3RSxPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLE9BQU8s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