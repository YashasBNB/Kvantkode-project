/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../../common/languages/nullTokenize.js';
import { LineCommentCommand, } from '../../browser/lineCommentCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
function createTestCommandHelper(commentsConfig, commandFactory) {
    return (lines, selection, expectedLines, expectedSelection) => {
        const languageId = 'commentMode';
        const prepare = (accessor, disposables) => {
            const languageConfigurationService = accessor.get(ILanguageConfigurationService);
            const languageService = accessor.get(ILanguageService);
            disposables.add(languageService.registerLanguage({ id: languageId }));
            disposables.add(languageConfigurationService.register(languageId, {
                comments: commentsConfig,
            }));
        };
        testCommand(lines, languageId, selection, commandFactory, expectedLines, expectedSelection, false, prepare);
    };
}
suite('Editor Contrib - Line Comment Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    const testAddLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 1 /* Type.ForceAdd */, true, true));
    test('comment single line', function () {
        testLineCommentCommand(['some text', '\tsome more text'], new Selection(1, 1, 1, 1), ['!@# some text', '\tsome more text'], new Selection(1, 5, 1, 5));
    });
    test('case insensitive', function () {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: 'rem' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
        testLineCommentCommand(['REM some text'], new Selection(1, 1, 1, 1), ['some text'], new Selection(1, 1, 1, 1));
    });
    function createSimpleModel(lines) {
        return {
            getLineContent: (lineNumber) => {
                return lines[lineNumber - 1];
            },
        };
    }
    function createBasicLinePreflightData(commentTokens) {
        return commentTokens.map((commentString) => {
            const r = {
                ignore: false,
                commentStr: commentString,
                commentStrOffset: 0,
                commentStrLength: commentString.length,
            };
            return r;
        });
    }
    test('_analyzeLines', () => {
        const disposable = new DisposableStore();
        let r;
        r = LineCommentCommand._analyzeLines(0 /* Type.Toggle */, true, createSimpleModel(['\t\t', '    ', '    c', '\t\td']), createBasicLinePreflightData(['//', 'rem', '!@#', '!@#']), 1, true, false, disposable.add(new TestLanguageConfigurationService()));
        if (!r.supported) {
            throw new Error(`unexpected`);
        }
        assert.strictEqual(r.shouldRemoveComments, false);
        // Does not change `commentStr`
        assert.strictEqual(r.lines[0].commentStr, '//');
        assert.strictEqual(r.lines[1].commentStr, 'rem');
        assert.strictEqual(r.lines[2].commentStr, '!@#');
        assert.strictEqual(r.lines[3].commentStr, '!@#');
        // Fills in `isWhitespace`
        assert.strictEqual(r.lines[0].ignore, true);
        assert.strictEqual(r.lines[1].ignore, true);
        assert.strictEqual(r.lines[2].ignore, false);
        assert.strictEqual(r.lines[3].ignore, false);
        // Fills in `commentStrOffset`
        assert.strictEqual(r.lines[0].commentStrOffset, 2);
        assert.strictEqual(r.lines[1].commentStrOffset, 4);
        assert.strictEqual(r.lines[2].commentStrOffset, 4);
        assert.strictEqual(r.lines[3].commentStrOffset, 2);
        r = LineCommentCommand._analyzeLines(0 /* Type.Toggle */, true, createSimpleModel(['\t\t', '    rem ', '    !@# c', '\t\t!@#d']), createBasicLinePreflightData(['//', 'rem', '!@#', '!@#']), 1, true, false, disposable.add(new TestLanguageConfigurationService()));
        if (!r.supported) {
            throw new Error(`unexpected`);
        }
        assert.strictEqual(r.shouldRemoveComments, true);
        // Does not change `commentStr`
        assert.strictEqual(r.lines[0].commentStr, '//');
        assert.strictEqual(r.lines[1].commentStr, 'rem');
        assert.strictEqual(r.lines[2].commentStr, '!@#');
        assert.strictEqual(r.lines[3].commentStr, '!@#');
        // Fills in `isWhitespace`
        assert.strictEqual(r.lines[0].ignore, true);
        assert.strictEqual(r.lines[1].ignore, false);
        assert.strictEqual(r.lines[2].ignore, false);
        assert.strictEqual(r.lines[3].ignore, false);
        // Fills in `commentStrOffset`
        assert.strictEqual(r.lines[0].commentStrOffset, 2);
        assert.strictEqual(r.lines[1].commentStrOffset, 4);
        assert.strictEqual(r.lines[2].commentStrOffset, 4);
        assert.strictEqual(r.lines[3].commentStrOffset, 2);
        // Fills in `commentStrLength`
        assert.strictEqual(r.lines[0].commentStrLength, 2);
        assert.strictEqual(r.lines[1].commentStrLength, 4);
        assert.strictEqual(r.lines[2].commentStrLength, 4);
        assert.strictEqual(r.lines[3].commentStrLength, 3);
        disposable.dispose();
    });
    test('_normalizeInsertionPoint', () => {
        const runTest = (mixedArr, tabSize, expected, testName) => {
            const model = createSimpleModel(mixedArr.filter((item, idx) => idx % 2 === 0));
            const offsets = mixedArr
                .filter((item, idx) => idx % 2 === 1)
                .map((offset) => {
                return {
                    commentStrOffset: offset,
                    ignore: false,
                };
            });
            LineCommentCommand._normalizeInsertionPoint(model, offsets, 1, tabSize);
            const actual = offsets.map((item) => item.commentStrOffset);
            assert.deepStrictEqual(actual, expected, testName);
        };
        // Bug 16696:[comment] comments not aligned in this case
        runTest(['  XX', 2, '    YY', 4], 4, [0, 0], 'Bug 16696');
        runTest(['\t\t\tXX', 3, '    \tYY', 5, '        ZZ', 8, '\t\tTT', 2], 4, [2, 5, 8, 2], 'Test1');
        runTest(['\t\t\t   XX', 6, '    \t\t\t\tYY', 8, '        ZZ', 8, '\t\t    TT', 6], 4, [2, 5, 8, 2], 'Test2');
        runTest(['\t\t', 2, '\t\t\t', 3, '\t\t\t\t', 4, '\t\t\t', 3], 4, [2, 2, 2, 2], 'Test3');
        runTest(['\t\t', 2, '\t\t\t', 3, '\t\t\t\t', 4, '\t\t\t', 3, '    ', 4], 2, [2, 2, 2, 2, 4], 'Test4');
        runTest(['\t\t', 2, '\t\t\t', 3, '\t\t\t\t', 4, '\t\t\t', 3, '    ', 4], 4, [1, 1, 1, 1, 4], 'Test5');
        runTest([' \t', 2, '  \t', 3, '   \t', 4, '    ', 4, '\t', 1], 4, [2, 3, 4, 4, 1], 'Test6');
        runTest([' \t\t', 3, '  \t\t', 4, '   \t\t', 5, '    \t', 5, '\t', 1], 4, [2, 3, 4, 4, 1], 'Test7');
        runTest(['\t', 1, '    ', 4], 4, [1, 4], 'Test8:4');
        runTest(['\t', 1, '   ', 3], 4, [0, 0], 'Test8:3');
        runTest(['\t', 1, '  ', 2], 4, [0, 0], 'Test8:2');
        runTest(['\t', 1, ' ', 1], 4, [0, 0], 'Test8:1');
        runTest(['\t', 1, '', 0], 4, [0, 0], 'Test8:0');
    });
    test('detects indentation', function () {
        testLineCommentCommand(['\tsome text', '\tsome more text'], new Selection(2, 2, 1, 1), ['\t!@# some text', '\t!@# some more text'], new Selection(2, 2, 1, 1));
    });
    test('detects mixed indentation', function () {
        testLineCommentCommand(['\tsome text', '    some more text'], new Selection(2, 2, 1, 1), ['\t!@# some text', '    !@# some more text'], new Selection(2, 2, 1, 1));
    });
    test('ignores whitespace lines', function () {
        testLineCommentCommand(['\tsome text', '\t   ', '', '\tsome more text'], new Selection(4, 2, 1, 1), ['\t!@# some text', '\t   ', '', '\t!@# some more text'], new Selection(4, 2, 1, 1));
    });
    test('removes its own', function () {
        testLineCommentCommand(['\t!@# some text', '\t   ', '\t\t!@# some more text'], new Selection(3, 2, 1, 1), ['\tsome text', '\t   ', '\t\tsome more text'], new Selection(3, 2, 1, 1));
    });
    test('works in only whitespace', function () {
        testLineCommentCommand(['\t    ', '\t', '\t\tsome more text'], new Selection(3, 1, 1, 1), ['\t!@#     ', '\t!@# ', '\t\tsome more text'], new Selection(3, 1, 1, 1));
    });
    test('bug 9697 - whitespace before comment token', function () {
        testLineCommentCommand(['\t !@#first', '\tsecond line'], new Selection(1, 1, 1, 1), ['\t first', '\tsecond line'], new Selection(1, 1, 1, 1));
    });
    test('bug 10162 - line comment before caret', function () {
        testLineCommentCommand(['first!@#', '\tsecond line'], new Selection(1, 1, 1, 1), ['!@# first!@#', '\tsecond line'], new Selection(1, 5, 1, 5));
    });
    test('comment single line - leading whitespace', function () {
        testLineCommentCommand(['first!@#', '\tsecond line'], new Selection(2, 3, 2, 1), ['first!@#', '\t!@# second line'], new Selection(2, 7, 2, 1));
    });
    test('ignores invisible selection', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 1, 1), ['!@# first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 1, 5));
    });
    test('multiple lines', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 4, 1, 1), ['!@# first', '!@# \tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 8, 1, 5));
    });
    test('multiple modes on multiple lines', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(4, 4, 3, 1), ['first', '\tsecond line', '!@# third line', '!@# fourth line', 'fifth'], new Selection(4, 8, 3, 5));
    });
    test('toggle single line', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['!@# first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5));
        testLineCommentCommand(['!@# first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 4, 1, 4), ['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1));
    });
    test('toggle multiple lines', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 4, 1, 1), ['!@# first', '!@# \tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 8, 1, 5));
        testLineCommentCommand(['!@# first', '!@# \tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 7, 1, 4), ['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 3, 1, 1));
    });
    test('issue #5964: Ctrl+/ to create comment when cursor is at the beginning of the line puts the cursor in a strange position', () => {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['!@# first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5));
    });
    test('issue #35673: Comment hotkeys throws the cursor before the comment', () => {
        testLineCommentCommand(['first', '', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 2, 1), ['first', '!@# ', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 5, 2, 5));
        testLineCommentCommand(['first', '\t', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 2, 2, 2), ['first', '\t!@# ', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 6, 2, 6));
    });
    test('issue #2837 "Add Line Comment" fault when blank lines involved', function () {
        testAddLineCommentCommand([
            '    if displayName == "":',
            '        displayName = groupName',
            '    description = getAttr(attributes, "description")',
            '    mailAddress = getAttr(attributes, "mail")',
            '',
            '    print "||Group name|%s|" % displayName',
            '    print "||Description|%s|" % description',
            '    print "||Email address|[mailto:%s]|" % mailAddress`',
        ], new Selection(1, 1, 8, 56), [
            '    !@# if displayName == "":',
            '    !@#     displayName = groupName',
            '    !@# description = getAttr(attributes, "description")',
            '    !@# mailAddress = getAttr(attributes, "mail")',
            '',
            '    !@# print "||Group name|%s|" % displayName',
            '    !@# print "||Description|%s|" % description',
            '    !@# print "||Email address|[mailto:%s]|" % mailAddress`',
        ], new Selection(1, 1, 8, 60));
    });
    test("issue #47004: Toggle comments shouldn't move cursor", () => {
        testAddLineCommentCommand(['    A line', '    Another line'], new Selection(2, 7, 1, 1), ['    !@# A line', '    !@# Another line'], new Selection(2, 11, 1, 1));
    });
    test('insertSpace false', () => {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, false, true));
        testLineCommentCommand(['some text'], new Selection(1, 1, 1, 1), ['!@#some text'], new Selection(1, 4, 1, 4));
    });
    test('insertSpace false does not remove space', () => {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, false, true));
        testLineCommentCommand(['!@#    some text'], new Selection(1, 1, 1, 1), ['    some text'], new Selection(1, 1, 1, 1));
    });
});
suite('ignoreEmptyLines false', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, false));
    test('does not ignore whitespace lines', () => {
        testLineCommentCommand(['\tsome text', '\t   ', '', '\tsome more text'], new Selection(4, 2, 1, 1), ['!@# \tsome text', '!@# \t   ', '!@# ', '!@# \tsome more text'], new Selection(4, 6, 1, 5));
    });
    test('removes its own', function () {
        testLineCommentCommand(['\t!@# some text', '\t   ', '\t\t!@# some more text'], new Selection(3, 2, 1, 1), ['\tsome text', '\t   ', '\t\tsome more text'], new Selection(3, 2, 1, 1));
    });
    test('works in only whitespace', function () {
        testLineCommentCommand(['\t    ', '\t', '\t\tsome more text'], new Selection(3, 1, 1, 1), ['\t!@#     ', '\t!@# ', '\t\tsome more text'], new Selection(3, 1, 1, 1));
    });
    test('comments single line', function () {
        testLineCommentCommand(['some text', '\tsome more text'], new Selection(1, 1, 1, 1), ['!@# some text', '\tsome more text'], new Selection(1, 5, 1, 5));
    });
    test('detects indentation', function () {
        testLineCommentCommand(['\tsome text', '\tsome more text'], new Selection(2, 2, 1, 1), ['\t!@# some text', '\t!@# some more text'], new Selection(2, 2, 1, 1));
    });
});
suite('Editor Contrib - Line Comment As Block Comment', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '', blockComment: ['(', ')'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    test('fall back to block comment command', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['( first )', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 3, 1, 3));
    });
    test('fall back to block comment command - toggle', function () {
        testLineCommentCommand(['(first)', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 7, 1, 2), ['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 6, 1, 1));
    });
    test('bug 9513 - expand single line to uncomment auto block', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['( first )', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 3, 1, 3));
    });
    test('bug 9691 - always expand selection to line boundaries', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(3, 2, 1, 3), ['( first', '\tsecond line', 'third line )', 'fourth line', 'fifth'], new Selection(3, 2, 1, 5));
        testLineCommentCommand(['(first', '\tsecond line', 'third line)', 'fourth line', 'fifth'], new Selection(3, 11, 1, 2), ['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(3, 11, 1, 1));
    });
});
suite('Editor Contrib - Line Comment As Block Comment 2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: null, blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    test('no selection => uses indentation', function () {
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(1, 1, 1, 1), [
            '\t\t<!@# first\t     #@!>',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(1, 1, 1, 1));
        testLineCommentCommand([
            '\t\t<!@#first\t    #@!>',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(1, 1, 1, 1), ['\t\tfirst\t   ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\t<!@#fifth#@!>\t\t'], new Selection(1, 1, 1, 1));
    });
    test('can remove', function () {
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 1, 5, 1), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 1, 5, 1));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 3, 5, 3), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 3, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 4, 5, 4), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 3, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 16, 5, 3), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 8, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 12, 5, 7), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 8, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 18, 5, 18), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 10, 5, 10));
    });
    test('issue #993: Remove comment does not work consistently in HTML', () => {
        testLineCommentCommand(['     asd qwe', '     asd qwe', ''], new Selection(1, 1, 3, 1), ['     <!@# asd qwe', '     asd qwe #@!>', ''], new Selection(1, 1, 3, 1));
        testLineCommentCommand(['     <!@#asd qwe', '     asd qwe#@!>', ''], new Selection(1, 1, 3, 1), ['     asd qwe', '     asd qwe', ''], new Selection(1, 1, 3, 1));
    });
});
suite('Editor Contrib - Line Comment in mixed modes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const OUTER_LANGUAGE_ID = 'outerMode';
    const INNER_LANGUAGE_ID = 'innerMode';
    let OuterMode = class OuterMode extends Disposable {
        constructor(commentsConfig, languageService, languageConfigurationService) {
            super();
            this.languageId = OUTER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {
                comments: commentsConfig,
            }));
            this._register(TokenizationRegistry.register(this.languageId, {
                getInitialState: () => NullState,
                tokenize: () => {
                    throw new Error('not implemented');
                },
                tokenizeEncoded: (line, hasEOL, state) => {
                    const languageId = /^  /.test(line) ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID;
                    const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
                    const tokens = new Uint32Array(1 << 1);
                    tokens[0 << 1] = 0;
                    tokens[(0 << 1) + 1] =
                        (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                            (encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */);
                    return new EncodedTokenizationResult(tokens, state);
                },
            }));
        }
    };
    OuterMode = __decorate([
        __param(1, ILanguageService),
        __param(2, ILanguageConfigurationService)
    ], OuterMode);
    let InnerMode = class InnerMode extends Disposable {
        constructor(commentsConfig, languageService, languageConfigurationService) {
            super();
            this.languageId = INNER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {
                comments: commentsConfig,
            }));
        }
    };
    InnerMode = __decorate([
        __param(1, ILanguageService),
        __param(2, ILanguageConfigurationService)
    ], InnerMode);
    function testLineCommentCommand(lines, selection, expectedLines, expectedSelection) {
        const setup = (accessor, disposables) => {
            const instantiationService = accessor.get(IInstantiationService);
            disposables.add(instantiationService.createInstance(OuterMode, {
                lineComment: '//',
                blockComment: ['/*', '*/'],
            }));
            disposables.add(instantiationService.createInstance(InnerMode, {
                lineComment: null,
                blockComment: ['{/*', '*/}'],
            }));
        };
        testCommand(lines, OUTER_LANGUAGE_ID, selection, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true), expectedLines, expectedSelection, true, setup);
    }
    test('issue #24047 (part 1): Commenting code in JSX files', () => {
        testLineCommentCommand([
            "import React from 'react';",
            'const Loader = () => (',
            '  <div>',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;',
        ], new Selection(1, 1, 7, 22), [
            "// import React from 'react';",
            '// const Loader = () => (',
            '//   <div>',
            '//     Loading...',
            '//   </div>',
            '// );',
            '// export default Loader;',
        ], new Selection(1, 4, 7, 25));
    });
    test('issue #24047 (part 2): Commenting code in JSX files', () => {
        testLineCommentCommand([
            "import React from 'react';",
            'const Loader = () => (',
            '  <div>',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;',
        ], new Selection(3, 4, 3, 4), [
            "import React from 'react';",
            'const Loader = () => (',
            '  {/* <div> */}',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;',
        ], new Selection(3, 8, 3, 8));
    });
    test('issue #36173: Commenting code in JSX tag body', () => {
        testLineCommentCommand(['<div>', '  {123}', '</div>'], new Selection(2, 4, 2, 4), ['<div>', '  {/* {123} */}', '</div>'], new Selection(2, 8, 2, 8));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUNvbW1lbnRDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbW1lbnQvdGVzdC9icm93c2VyL2xpbmVDb21tZW50Q29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdoRSxPQUFPLEVBQ04seUJBQXlCLEVBRXpCLG9CQUFvQixHQUNwQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTNFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RSxPQUFPLEVBSU4sa0JBQWtCLEdBRWxCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3BILE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUV0RSxTQUFTLHVCQUF1QixDQUMvQixjQUEyQixFQUMzQixjQUE4RTtJQU85RSxPQUFPLENBQ04sS0FBZSxFQUNmLFNBQW9CLEVBQ3BCLGFBQXVCLEVBQ3ZCLGlCQUE0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QUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFDL0QsQ0FBQyxFQUNELENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNmLE9BQU8sQ0FDUCxDQUFBO1FBRUQsT0FBTyxDQUNOLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQy9ELENBQUMsRUFDRCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDZixPQUFPLENBQ1AsQ0FBQTtRQUVELE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUUzRixPQUFPLENBQ04sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFDN0QsQ0FBQyxFQUNELENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNmLE9BQU8sQ0FDUCxDQUFBO1FBRUQsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FB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RUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQyxFQUN0RixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtRQUVELHNCQUFzQixDQUNyQjtZQUNDLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYix1QkFBdUI7U0FDdkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDMUIsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQyxFQUN0RixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtRQUVELHNCQUFzQixDQUNyQjtZQUNDLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYix1QkFBdUI7U0FDdkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDMUIsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQyxFQUN0RixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtRQUVELHNCQUFzQixDQUNyQjtZQUNDLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYix1QkFBdUI7U0FDdkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDM0IsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQyxFQUN0RixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVB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