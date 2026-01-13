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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFNlc3Npb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC90ZXN0L2Jyb3dzZXIvc25pcHBldFNlc3Npb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRTdHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDcEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRyxLQUFLLENB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VUFBVSxFQUFFLFNBQVMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO1FBQy9GLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNoQixnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5RSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUUvQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUUvQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUUvQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxFQUFFLEVBQ2hCLDREQUE0RCxDQUM1RCxDQUFBO1FBQ0QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEYsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0UsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0UsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUMsNkNBQTZDLEVBQUU7UUFDbkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtRQUMvRixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDaEIsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFL0MsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFD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RUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRTdELE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUU5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRXJFLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUU5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBRTdFLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FB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